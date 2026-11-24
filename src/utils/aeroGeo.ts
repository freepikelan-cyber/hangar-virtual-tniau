import * as THREE from 'three';
import { DecalGeometry } from 'three/examples/jsm/geometries/DecalGeometry.js';
import type { V3 } from './proceduralBuilder';

export type MeshRole = 'skin' | 'glass' | 'decal' | 'internal' | 'cockpit';

export function mkMesh(geo: THREE.BufferGeometry, mat: THREE.Material, role: MeshRole = 'skin') {
  const m = new THREE.Mesh(geo, mat);
  m.userData.role = role;
  m.castShadow = role === 'skin';
  m.receiveShadow = false;
  return m;
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export interface LoftStation {
  z: number;
  point: (theta: number) => [number, number];
}

/**
 * Lofting cross-section 3D parametrik sepanjang sumbu Z (z kecil/ekor -> z besar/hidung).
 * theta = 0 di atas (0, +y), PI/2 di kanan (+x, 0), PI di bawah (0, -y), 3PI/2 di kiri (-x, 0).
 * Normal selalu menghadap keluar permukaan.
 */
export function buildLoftGeometry(
  stations: LoftStation[],
  radialSegs = 64,
  capFront = false,
  capBack = false,
): THREE.BufferGeometry {
  const rings = stations.length;
  const cols = radialSegs + 1;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const zMin = stations[0].z;
  const zMax = stations[rings - 1].z;
  const zSpan = Math.max(0.001, zMax - zMin);

  for (let i = 0; i < rings; i++) {
    const st = stations[i];
    const v = (st.z - zMin) / zSpan;
    for (let j = 0; j <= radialSegs; j++) {
      const u = j / radialSegs;
      const theta = u * Math.PI * 2;
      const [x, y] = st.point(theta);
      positions.push(x, y, st.z);
      uvs.push(u, v);
    }
  }

  for (let i = 0; i < rings - 1; i++) {
    for (let j = 0; j < radialSegs; j++) {
      const a = i * cols + j;
      const b = a + 1;
      const c = (i + 1) * cols + j;
      const d = c + 1;
      indices.push(a, d, b);
      indices.push(a, c, d);
    }
  }

  if (capBack) {
    let cx = 0;
    let cy = 0;
    for (let j = 0; j < radialSegs; j++) {
      cx += positions[j * 3];
      cy += positions[j * 3 + 1];
    }
    const centerIdx = positions.length / 3;
    positions.push(cx / radialSegs, cy / radialSegs, stations[0].z);
    uvs.push(0.5, 0);
    for (let j = 0; j < radialSegs; j++) indices.push(centerIdx, j, j + 1);
  }

  if (capFront) {
    const start = (rings - 1) * cols;
    let cx = 0;
    let cy = 0;
    for (let j = 0; j < radialSegs; j++) {
      cx += positions[(start + j) * 3];
      cy += positions[(start + j) * 3 + 1];
    }
    const centerIdx = positions.length / 3;
    positions.push(cx / radialSegs, cy / radialSegs, stations[rings - 1].z);
    uvs.push(0.5, 1);
    for (let j = 0; j < radialSegs; j++) indices.push(centerIdx, start + j + 1, start + j);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Profil airfoil NACA tipis untuk sayap, canard, stabilator, dan sirip tegak. */
export function airfoilY(t: number, thickness: number, camber = 0.06): [number, number] {
  const yt =
    5 *
    thickness *
    (0.2969 * Math.sqrt(Math.max(0, t)) -
      0.126 * t -
      0.3516 * t * t +
      0.2843 * t * t * t -
      0.1015 * t * t * t * t);
  const yc = camber * thickness * Math.sin(Math.PI * t);
  return [yc + yt, yc - yt];
}

export interface AirfoilSection {
  spanPos: number; // x untuk horizontal, y untuk vertical
  leZ: number;
  teZ: number;
  offset: number; // y untuk horizontal, x untuk vertical
  thick: number;
}

/** Permukaan airfoil 3D dengan normal menghadap keluar dan UV planar anti-melar. */
export function buildAirfoilSurface(
  sections: AirfoilSection[],
  orientation: 'horizontal' | 'vertical',
  side: 1 | -1 = 1,
  camber = 0.06,
): THREE.BufferGeometry {
  const chordPts = 18;
  const loopT: { t: number; upper: boolean }[] = [];
  for (let i = chordPts; i >= 0; i--) loopT.push({ t: i / chordPts, upper: true });
  for (let i = 1; i <= chordPts; i++) loopT.push({ t: i / chordPts, upper: false });

  const perRing = loopT.length;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let s = 0; s < sections.length; s++) {
    const sec = sections[s];
    const chord = Math.max(0.05, sec.leZ - sec.teZ);
    const v = s / Math.max(1, sections.length - 1);

    for (let k = 0; k < perRing; k++) {
      const { t, upper } = loopT[k];
      const [yUp, yLo] = airfoilY(t, sec.thick, orientation === 'horizontal' ? camber : 0);
      const thickVal = upper ? yUp : yLo;
      const z = sec.leZ - t * chord;

      if (orientation === 'horizontal') {
        const x = sec.spanPos * side;
        const y = sec.offset + thickVal;
        positions.push(x, y, z);
        uvs.push(x * 0.2 + 0.5, z * 0.2 + 0.5);
      } else {
        const x = sec.offset + thickVal;
        const y = sec.spanPos;
        positions.push(x, y, z);
        uvs.push(z * 0.22 + 0.5, v);
      }
    }
  }

  const flipWinding = (orientation === 'horizontal' && side < 0) || orientation === 'vertical';

  for (let s = 0; s < sections.length - 1; s++) {
    for (let k = 0; k < perRing - 1; k++) {
      const a = s * perRing + k;
      const b = a + 1;
      const c = (s + 1) * perRing + k;
      const d = c + 1;
      if (flipWinding) {
        indices.push(a, d, b);
        indices.push(a, c, d);
      } else {
        indices.push(a, b, d);
        indices.push(a, d, c);
      }
    }
  }

  const lastStart = (sections.length - 1) * perRing;
  const tipSec = sections[sections.length - 1];
  const tipCenterIdx = positions.length / 3;
  if (orientation === 'horizontal') {
    positions.push(tipSec.spanPos * side, tipSec.offset, (tipSec.leZ + tipSec.teZ) / 2);
  } else {
    positions.push(tipSec.offset, tipSec.spanPos, (tipSec.leZ + tipSec.teZ) / 2);
  }
  uvs.push(0.5, 1);
  for (let k = 0; k < perRing - 1; k++) {
    const a = lastStart + k;
    const b = lastStart + k + 1;
    if (flipWinding) indices.push(tipCenterIdx, a, b);
    else indices.push(tipCenterIdx, b, a);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function addDecal(
  group: THREE.Group,
  target: THREE.Mesh,
  pos: V3,
  rot: V3,
  size: V3,
  tex: THREE.Texture,
) {
  group.updateMatrixWorld(true);
  const geo = new DecalGeometry(target, new THREE.Vector3(...pos), new THREE.Euler(...rot), new THREE.Vector3(...size));
  if (!geo.attributes.position || geo.attributes.position.count === 0) {
    geo.dispose();
    return;
  }
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
    metalness: 0.2,
    roughness: 0.5,
  });
  const m = mkMesh(geo, mat, 'decal');
  m.renderOrder = 2;
  group.add(m);
}
