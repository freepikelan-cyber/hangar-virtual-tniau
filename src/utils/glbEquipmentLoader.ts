import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/');

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

/** Registri model .GLB yang sudah dimuat (baik otomatis dari /models/*.glb maupun dari file lokal). */
export const customGlbRegistry = new Map<string, THREE.Group>();

/** Cache hasil cek file /models/*.glb agar tidak fetch berulang jika file belum tersedia. */
const autoLoadAttempted = new Set<string>();

export const GLB_SLOTS: Record<string, { url: string; targetHeight: number; baseY: number }> = {
  gsuit: { url: '/models/gsuit.glb', targetHeight: 9.6, baseY: 0 },
  'pilot-helmet': { url: '/models/pilot-helmet.glb', targetHeight: 6.2, baseY: 0.45 },
};

/**
 * Menormalkan ukuran, posisi tengah (X/Z = 0), dan pijakan bawah (Y = baseY)
 * agar model .GLB dari Meshy / Tripo / Blender langsung pas dengan kamera & 10 pin interaktif.
 */
function normalizeGlbScene(raw: THREE.Object3D, targetHeight: number, baseY: number): THREE.Group {
  const wrapper = new THREE.Group();
  wrapper.name = 'glb-equipment-root';

  const model = raw.clone(true);
  model.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const safeH = Number.isFinite(size.y) && size.y > 0.001 ? size.y : 1;
  const scale = targetHeight / safeH;

  model.scale.multiplyScalar(scale);
  model.updateMatrixWorld(true);

  const scaledBox = new THREE.Box3().setFromObject(model);
  const scaledCenter = new THREE.Vector3();
  scaledBox.getCenter(scaledCenter);

  model.position.x -= scaledCenter.x;
  model.position.z -= scaledCenter.z;
  model.position.y -= scaledBox.min.y - baseY;

  model.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.role = 'skin';
  });

  wrapper.add(model);
  return wrapper;
}

/**
 * Mencoba memuat file .GLB otomatis dari folder public/models/ (mis. /models/gsuit.glb).
 * Mengembalikan null secara aman jika file belum ditaruh di public/models/.
 */
export async function tryAutoLoadGlb(unitId: string): Promise<THREE.Group | null> {
  const existing = customGlbRegistry.get(unitId);
  if (existing) return existing;

  const slot = GLB_SLOTS[unitId];
  if (!slot || autoLoadAttempted.has(unitId)) return null;
  autoLoadAttempted.add(unitId);

  try {
    const res = await fetch(slot.url);
    if (!res.ok) return null;
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    // Hindari Vite SPA HTML fallback saat file .glb belum ada
    if (ct.includes('text/html')) return null;

    const buffer = await res.arrayBuffer();
    if (buffer.byteLength < 12) return null;

    // Cek magic header 'glTF' (0x46546c67) untuk file .glb biner
    const magic = new DataView(buffer).getUint32(0, true);
    if (magic !== 0x46546c67) return null;

    const gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) => {
      gltfLoader.parse(buffer, '', resolve, reject);
    });

    const normalized = normalizeGlbScene(gltf.scene, slot.targetHeight, slot.baseY);
    customGlbRegistry.set(unitId, normalized);
    return normalized;
  } catch {
    return null;
  }
}

/**
 * Memuat file .GLB / .GLTF yang dipilih langsung oleh pengguna dari komputer (preview instan).
 */
export async function loadLocalGlbFile(file: File, unitId: string): Promise<THREE.Group> {
  const slot = GLB_SLOTS[unitId] ?? { url: '', targetHeight: 8.5, baseY: 0 };
  const buffer = await file.arrayBuffer();

  const gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) => {
    gltfLoader.parse(buffer, '', resolve, reject);
  });

  const normalized = normalizeGlbScene(gltf.scene, slot.targetHeight, slot.baseY);
  customGlbRegistry.set(unitId, normalized);
  return normalized;
}
