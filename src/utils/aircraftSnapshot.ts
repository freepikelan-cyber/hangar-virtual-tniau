import * as THREE from 'three';
import { getProceduralAircraft } from './proceduralBuilder';

const snapshotCache = new Map<string, string>();
let sharedRenderer: THREE.WebGLRenderer | null = null;

function getSharedRenderer(width: number, height: number): THREE.WebGLRenderer {
  if (!sharedRenderer) {
    sharedRenderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    sharedRenderer.setSize(width, height);
    sharedRenderer.setPixelRatio(1);
    sharedRenderer.setClearColor(0x000000, 0);
    sharedRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    sharedRenderer.toneMappingExposure = 1.2;
  }
  return sharedRenderer;
}

/**
 * Merender gambar PNG berlatar belakang 100% transparan dari model 3D pesawat aktif
 * untuk ditampilkan di poster Infografis Spesifikasi.
 * Menggunakan 1 WebGLRenderer bersama (singleton) agar seluruh 11 pesawat selalu tampil tanpa batas konteks WebGL.
 */
export function getAircraftTransparentSnapshot(aircraftId: string): string {
  const cached = snapshotCache.get(aircraftId);
  if (cached) return cached;

  const width = 960;
  const height = 460;
  const renderer = getSharedRenderer(width, height);

  const scene = new THREE.Scene();

  scene.add(new THREE.AmbientLight('#d4e8ff', 1.15));
  const key = new THREE.DirectionalLight('#ffffff', 2.25);
  key.position.set(12, 16, 14);
  scene.add(key);
  const rim = new THREE.DirectionalLight('#7cc4ff', 1.25);
  rim.position.set(-14, 8, -10);
  scene.add(rim);
  const fill = new THREE.HemisphereLight('#e6f4ff', '#1b3d6e', 0.95);
  scene.add(fill);

  // Kloning model prosedural agar tidak mengganggu adegan 3D utama
  const source = getProceduralAircraft(aircraftId).group;
  const clone = source.clone(true);
  clone.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const role = mesh.userData.role as string | undefined;
    if (role === 'internal' || role === 'blur') {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;
    // Pastikan material non-glass tampil solid dan tidak wireframe pada snapshot
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      if (!mat) continue;
      const std = mat as THREE.MeshStandardMaterial;
      if ('wireframe' in std && std.wireframe) {
        std.wireframe = false;
      }
    }
  });

  // Pastikan roda pendarat tampil normal pada snapshot
  const gear = clone.getObjectByName('landing-gear');
  if (gear) {
    gear.visible = true;
    gear.position.y = 0;
    gear.scale.set(1, 1, 1);
  }

  scene.add(clone);

  const box = new THREE.Box3().setFromObject(clone);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);

  const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 120);
  const maxDim = Math.max(size.x, size.y, size.z, 10);
  const dist = maxDim * 1.12;
  camera.position.set(center.x + dist * 0.78, center.y + dist * 0.28, center.z + dist * 0.62);
  camera.lookAt(center.x, center.y - 0.15, center.z);

  renderer.clear();
  renderer.render(scene, camera);
  const dataUrl = renderer.domElement.toDataURL('image/png');

  scene.remove(clone);
  snapshotCache.set(aircraftId, dataUrl);
  return dataUrl;
}
