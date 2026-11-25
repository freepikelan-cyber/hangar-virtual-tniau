import * as THREE from 'three';
import { getProceduralAircraft } from './proceduralBuilder';
import { customGlbRegistry } from './glbEquipmentLoader';

const snapshotCache = new Map<string, string>();
const thumbCache = new Map<string, string>();
let sharedRenderer: THREE.WebGLRenderer | null = null;
let lastW = 0;
let lastH = 0;

export function invalidateSnapshot(aircraftId: string) {
  snapshotCache.delete(aircraftId);
  thumbCache.delete(aircraftId);
}

function getSharedRenderer(width: number, height: number): THREE.WebGLRenderer {
  if (sharedRenderer && sharedRenderer.getContext().isContextLost()) {
    sharedRenderer.dispose();
    sharedRenderer = null;
  }
  if (!sharedRenderer) {
    sharedRenderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    sharedRenderer.setPixelRatio(1);
    sharedRenderer.setClearColor(0x000000, 0);
    sharedRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    sharedRenderer.toneMappingExposure = 1.2;
    lastW = 0;
    lastH = 0;
  }
  if (lastW !== width || lastH !== height) {
    sharedRenderer.setSize(width, height, false);
    lastW = width;
    lastH = height;
  }
  return sharedRenderer;
}

function renderAircraftSnapshot(aircraftId: string, width: number, height: number, zoomFactor = 1.12): string {
  const renderer = getSharedRenderer(width, height);
  const scene = new THREE.Scene();

  scene.add(new THREE.AmbientLight('#d4e8ff', 1.25));
  const key = new THREE.DirectionalLight('#ffffff', 2.35);
  key.position.set(12, 16, 14);
  scene.add(key);
  const rim = new THREE.DirectionalLight('#7cc4ff', 1.35);
  rim.position.set(-14, 8, -10);
  scene.add(rim);
  const fill = new THREE.HemisphereLight('#e6f4ff', '#1b3d6e', 1.0);
  scene.add(fill);

  const source = customGlbRegistry.get(aircraftId) ?? getProceduralAircraft(aircraftId).group;
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
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      if (!mat) continue;
      const std = mat as THREE.MeshStandardMaterial;
      if ('wireframe' in std && std.wireframe) {
        std.wireframe = false;
      }
    }
  });

  const gear = clone.getObjectByName('landing-gear');
  if (gear) {
    gear.visible = true;
    gear.position.y = 0;
    gear.scale.set(1, 1, 1);
  }

  scene.add(clone);

  const box = new THREE.Box3().setFromObject(clone);
  const center = new THREE.Vector3(0, 2.0, 0);
  const size = new THREE.Vector3(12, 4, 14);
  if (!box.isEmpty()) {
    const c = new THREE.Vector3();
    const s = new THREE.Vector3();
    box.getCenter(c);
    box.getSize(s);
    if (Number.isFinite(c.x) && Number.isFinite(c.y) && Number.isFinite(c.z)) center.copy(c);
    if (Number.isFinite(s.x) && Number.isFinite(s.y) && Number.isFinite(s.z)) size.copy(s);
  }

  const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 120);
  const isVerticalSubject = size.y > size.x * 1.15;
  if (isVerticalSubject) {
    const dist = Math.max(size.y * 1.75, 13);
    camera.position.set(center.x + dist * 0.28, center.y + dist * 0.04, center.z + dist * 0.96);
    camera.lookAt(center.x, center.y, center.z);
  } else {
    const maxDim = Math.max(size.x, size.y, size.z, 10);
    const dist = maxDim * zoomFactor;
    camera.position.set(center.x + dist * 0.78, center.y + dist * 0.28, center.z + dist * 0.62);
    camera.lookAt(center.x, center.y - 0.15, center.z);
  }

  renderer.clear();
  renderer.render(scene, camera);
  const dataUrl = renderer.domElement.toDataURL('image/png');
  scene.remove(clone);
  return dataUrl;
}

/**
 * Merender gambar PNG berlatar belakang 100% transparan dari model 3D pesawat aktif
 * untuk ditampilkan di poster Infografis Spesifikasi.
 */
export function getAircraftTransparentSnapshot(aircraftId: string): string {
  const cached = snapshotCache.get(aircraftId);
  if (cached) return cached;
  const dataUrl = renderAircraftSnapshot(aircraftId, 960, 460, 1.12);
  snapshotCache.set(aircraftId, dataUrl);
  return dataUrl;
}

export function getCachedAircraftThumbnail(aircraftId: string): string | null {
  return thumbCache.get(aircraftId) ?? null;
}

// Antrean non-blocking (1 thumbnail per frame) agar daftar Pilih Armada tetap 60 FPS tanpa lag!
const thumbQueue: string[] = [];
const thumbListeners = new Map<string, Set<(url: string) => void>>();
let queueScheduled = false;

function drainThumbQueue() {
  queueScheduled = false;
  const nextId = thumbQueue.shift();
  if (!nextId) return;
  try {
    let url = thumbCache.get(nextId);
    if (!url) {
      url = renderAircraftSnapshot(nextId, 192, 120, 1.0);
      thumbCache.set(nextId, url);
    }
    const cbs = thumbListeners.get(nextId);
    if (cbs) {
      cbs.forEach((cb) => cb(url!));
      thumbListeners.delete(nextId);
    }
  } catch {
    thumbListeners.delete(nextId);
  }
  if (thumbQueue.length > 0) {
    queueScheduled = true;
    window.requestAnimationFrame(drainThumbQueue);
  }
}

export function requestAircraftThumbnail(aircraftId: string, onReady: (url: string) => void): () => void {
  const cached = thumbCache.get(aircraftId);
  if (cached) {
    onReady(cached);
    return () => {};
  }
  let set = thumbListeners.get(aircraftId);
  if (!set) {
    set = new Set();
    thumbListeners.set(aircraftId, set);
    thumbQueue.push(aircraftId);
  }
  set.add(onReady);
  if (!queueScheduled && typeof window !== 'undefined') {
    queueScheduled = true;
    window.requestAnimationFrame(drainThumbQueue);
  }
  return () => {
    const s = thumbListeners.get(aircraftId);
    if (s) s.delete(onReady);
  };
}
