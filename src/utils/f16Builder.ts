import * as THREE from 'three';
import { DecalGeometry } from 'three/examples/jsm/geometries/DecalGeometry.js';
import { camoTexture, flagTexture, panelBumpTexture, roundelTexture, textTexture } from './textures';
import type { BuildResult, V3 } from './proceduralBuilder';

/* =========================================================================
 * Builder 3D Detail Tinggi: General Dynamics F-16AM / Block 52ID TNI AU
 * Referensi: F-16 Fighting Falcon TNI AU (TS-1601)
 * Konvensi: Hidung +Z, Atas +Y, Roda menapak y = 0, Panjang 14.4 unit.
 * ========================================================================= */

type Role = 'skin' | 'glass' | 'decal' | 'internal' | 'cockpit';

function mk(geo: THREE.BufferGeometry, mat: THREE.Material, role: Role = 'skin') {
  const m = new THREE.Mesh(geo, mat);
  m.userData.role = role;
  m.castShadow = role === 'skin';
  m.receiveShadow = false;
  return m;
}

interface LoftStation {
  z: number;
  point: (theta: number) => [number, number];
}

/**
 * Lofting cross-section 3D parametrik sepanjang sumbu Z (dari z kecil/ekor ke z besar/hidung).
 * theta = 0 di atas (0, +y), PI/2 di kanan (+x, 0), PI di bawah (0, -y), 3PI/2 di kiri (-x, 0).
 * Winding (a, d, b) & (a, c, d) memastikan normal menghadap KELUAR permukaan.
 */
function buildLoftGeometry(stations: LoftStation[], radialSegs = 64, capFront = false, capBack = false): THREE.BufferGeometry {
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
      // Normal menghadap keluar (+Y di atas, +X di kanan, -Y di bawah, -X di kiri)
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
    for (let j = 0; j < radialSegs; j++) {
      indices.push(centerIdx, j, j + 1);
    }
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
    for (let j = 0; j < radialSegs; j++) {
      indices.push(centerIdx, start + j + 1, start + j);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Profil airfoil NACA tipis (khas jet supersonik F-16 NACA 64A204). */
function airfoilY(t: number, thickness: number, camber = 0.06): [number, number] {
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

interface AirfoilSection {
  spanPos: number; // x untuk sayap horizontal, y untuk sirip tegak
  leZ: number;
  teZ: number;
  offset: number; // y untuk sayap horizontal, x untuk sirip tegak
  thick: number;
}

/** Membangun permukaan sayap / stabilator / sirip tegak 3D dengan normal keluar yang benar. */
function buildAirfoilSurface(
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
        // Planar UV agar kamuflase sayap sejajar dan tidak melar
        uvs.push(x * 0.22 + 0.5, z * 0.22 + 0.5);
      } else {
        const x = sec.offset + thickVal;
        const y = sec.spanPos;
        positions.push(x, y, z);
        uvs.push(z * 0.24 + 0.5, v);
      }
    }
  }

  // Untuk horizontal side=+1: (a,b,d) & (a,d,c) mengarah keluar.
  // Untuk horizontal side=-1 dan vertical (span naik +Y): (a,d,b) & (a,c,d) mengarah keluar!
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

  // Tutup ujung (tip cap)
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
    if (flipWinding) {
      indices.push(tipCenterIdx, a, b);
    } else {
      indices.push(tipCenterIdx, b, a);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Penampang badan F-16 Blended Wing-Body yang akurat:
 * - Radome ogive menukik elegan (z = 5.2 .. 7.2)
 * - Chine / LERX tajam melebar di sisi kokpit hingga pangkal sayap (z = -3.8 .. 4.6)
 * - Dorsal spine (punggung avionik) di belakang kanopi hingga ekor
 * - Ekor belakang membulat rapi ke rumah nozzle F100 (z = -6.75)
 */
function f16CrossSection(z: number, theta: number, yCenter: number): [number, number] {
  const sinT = Math.sin(theta);
  const cosT = Math.cos(theta);

  let rx = 0.62;
  let ryTop = 0.52;
  let ryBot = 0.42;
  let yShift = 0;

  if (z >= 5.2) {
    // Radome ogive tajam sedikit menukik seperti F-16 asli
    const t = Math.max(0, Math.min(1, (7.25 - z) / (7.25 - 5.2)));
    const r = Math.pow(t, 0.72) * 0.44;
    rx = r * 1.04;
    ryTop = r * 0.94;
    ryBot = r * 0.88;
    yShift = -0.22 * Math.pow(1 - t, 1.35);
  } else if (z >= 2.8) {
    // Bagian kokpit depan ke tengah
    const t = (5.2 - z) / (5.2 - 2.8);
    rx = lerp(0.45, 0.62, smoothstep(0, 1, t));
    ryTop = lerp(0.41, 0.52, smoothstep(0, 1, t));
    ryBot = lerp(0.39, 0.46, smoothstep(0, 1, t));
  } else if (z >= -3.6) {
    // Badan tengah lebar & ramping
    const t = (2.8 - z) / (2.8 - -3.6);
    rx = lerp(0.62, 0.66, Math.sin(t * Math.PI * 0.85));
    ryTop = lerp(0.52, 0.56, Math.sin(t * Math.PI * 0.8));
    ryBot = lerp(0.46, 0.46, Math.sin(t * Math.PI * 0.8));
  } else {
    // Mengerucut ke rumah nozzle
    const t = Math.max(0, Math.min(1, (-3.6 - z) / (-3.6 - -6.75)));
    rx = lerp(0.64, 0.41, smoothstep(0, 1, t));
    ryTop = lerp(0.54, 0.41, smoothstep(0, 1, t));
    ryBot = lerp(0.45, 0.41, smoothstep(0, 1, t));
  }

  // Chine / LERX tajam khas F-16 (horizontal shelf di sekitar y = yCenter - 0.05)
  let lerx = 0;
  if (z < 4.75 && z > -4.6) {
    const fwd = smoothstep(4.75, 1.2, z);
    const aft = smoothstep(-4.6, -2.6, z);
    // Puncak strake paling lebar di area pangkal sayap (z ~ -0.5 .. 1.6)
    const strakeWidth = 0.72 * fwd * aft;
    // Masking tajam di sisi samping (cosT ~ -0.06) agar berbentuk chine pipih, bukan bulat
    const sideMask = Math.pow(Math.abs(sinT), 2.0) * Math.exp(-Math.pow((cosT + 0.06) * 4.2, 2));
    lerx = strakeWidth * sideMask;
  }

  // Dorsal spine di belakang kanopi (z = -5.8 .. 2.0)
  let spine = 0;
  if (z < 2.05 && z > -5.9) {
    const env = smoothstep(2.05, 1.2, z) * smoothstep(-5.9, -4.6, z);
    const topMask = cosT > 0 ? Math.pow(cosT, 7.0) : 0;
    spine = env * 0.24 * topMask;
  }

  const x = sinT * (rx + lerx);
  const ry = cosT >= 0 ? ryTop : ryBot;
  const y = yCenter + yShift + cosT * ry + spine;
  return [x, y];
}

/** Tekstur kamuflase atas-bawah khusus F-16 TNI AU (atas: biru-abu dua nada, perut: abu muda). */
function f16LiveryTexture() {
  const W = 1024;
  const H = 1024;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;

  // Base kamuflase dua nada biru-abu TNI AU
  const camo = camoTexture(
    '#7c8fa3',
    [
      { c: '#54687d', n: 16, r: 66 },
      { c: '#44576b', n: 8, r: 44 },
      { c: '#96a6b6', n: 7, r: 36 },
    ],
    1601,
    { noise: 0.03 },
  );
  const camoImg = camo.image as HTMLCanvasElement;
  ctx.drawImage(camoImg, 0, 0, W, H);
  camo.dispose();

  // Perut pesawat (u ~ 0.36 .. 0.64 -> sekitar theta = PI) dicat Light Ghost Grey
  const gradL = ctx.createLinearGradient(W * 0.3, 0, W * 0.4, 0);
  gradL.addColorStop(0, 'rgba(182, 192, 202, 0)');
  gradL.addColorStop(1, 'rgba(182, 192, 202, 0.96)');
  ctx.fillStyle = gradL;
  ctx.fillRect(W * 0.3, 0, W * 0.1, H);

  ctx.fillStyle = '#b6c0ca';
  ctx.fillRect(W * 0.4, 0, W * 0.2, H);

  const gradR = ctx.createLinearGradient(W * 0.6, 0, W * 0.7, 0);
  gradR.addColorStop(0, 'rgba(182, 192, 202, 0.96)');
  gradR.addColorStop(1, 'rgba(182, 192, 202, 0)');
  ctx.fillStyle = gradR;
  ctx.fillRect(W * 0.6, 0, W * 0.1, H);

  // Garis panel memanjang & melintang halus
  ctx.strokeStyle = 'rgba(20, 28, 36, 0.16)';
  ctx.lineWidth = 1.4;
  for (let y = 0; y < H; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

function addDecal(
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
  const m = mk(geo, mat, 'decal');
  m.renderOrder = 2;
  group.add(m);
}

/** Rudal udara-ke-udara (AIM-9 Sidewinder / AIM-120 AMRAAM). */
function buildMissile(
  group: THREE.Group,
  kind: 'aim9' | 'aim120',
  pos: V3,
  mats: { white: THREE.Material; dark: THREE.Material; yellow: THREE.Material; brown: THREE.Material; metal: THREE.Material },
) {
  const mGroup = new THREE.Group();
  mGroup.position.set(...pos);

  const isAim9 = kind === 'aim9';
  const len = isAim9 ? 2.55 : 3.2;
  const r = isAim9 ? 0.062 : 0.082;

  const body = mk(new THREE.CylinderGeometry(r, r, len, 16), mats.white);
  body.rotation.x = Math.PI / 2;
  mGroup.add(body);

  const nose = mk(
    isAim9 ? new THREE.SphereGeometry(r, 16, 12) : new THREE.ConeGeometry(r, r * 4.2, 16),
    isAim9 ? mats.dark : mats.white,
  );
  if (!isAim9) nose.rotation.x = Math.PI / 2;
  nose.position.z = len / 2 + (isAim9 ? 0 : r * 2.1);
  mGroup.add(nose);

  const bandY = mk(new THREE.CylinderGeometry(r * 1.015, r * 1.015, 0.09, 16), mats.yellow);
  bandY.rotation.x = Math.PI / 2;
  bandY.position.z = len * 0.24;
  const bandB = mk(new THREE.CylinderGeometry(r * 1.015, r * 1.015, 0.09, 16), mats.brown);
  bandB.rotation.x = Math.PI / 2;
  bandB.position.z = -len * 0.08;
  mGroup.add(bandY, bandB);

  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const fRear = mk(new THREE.BoxGeometry(0.012, r * 3.8, isAim9 ? 0.34 : 0.38), mats.dark);
    fRear.position.set(Math.cos(a) * r * 1.9, Math.sin(a) * r * 1.9, -len / 2 + 0.22);
    fRear.rotation.z = a - Math.PI / 2;
    mGroup.add(fRear);

    const fFront = mk(new THREE.BoxGeometry(0.01, r * (isAim9 ? 2.5 : 3.0), isAim9 ? 0.22 : 0.34), mats.dark);
    fFront.position.set(Math.cos(a) * r * 1.45, Math.sin(a) * r * 1.45, isAim9 ? len * 0.36 : 0.05);
    fFront.rotation.z = a - Math.PI / 2;
    mGroup.add(fFront);
  }

  const noz = mk(new THREE.CylinderGeometry(r * 0.72, r * 0.55, 0.12, 12), mats.metal);
  noz.rotation.x = Math.PI / 2;
  noz.position.z = -len / 2 - 0.05;
  mGroup.add(noz);

  group.add(mGroup);
}

/** Tangki bahan bakar eksternal 370 galon bersirip belakang. */
function buildDropTank(group: THREE.Group, pos: V3, scale: number, bodyMat: THREE.Material, finMat: THREE.Material) {
  const pts: THREE.Vector2[] = [];
  const len = 3.7 * scale;
  const rMax = 0.25 * scale;
  const steps = 28;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const z = (u - 0.5) * len;
    let r = rMax;
    if (u < 0.28) r = rMax * Math.pow(u / 0.28, 0.65);
    else if (u > 0.72) r = rMax * Math.pow((1 - u) / 0.28, 0.65);
    pts.push(new THREE.Vector2(Math.max(0.004, r), z));
  }
  const geo = new THREE.LatheGeometry(pts, 28);
  geo.rotateX(Math.PI / 2);
  const tank = mk(geo, bodyMat);
  tank.position.set(...pos);
  group.add(tank);

  for (const s of [1, -1]) {
    const f = mk(new THREE.BoxGeometry(0.32 * scale, 0.018, 0.42 * scale), finMat);
    f.position.set(pos[0] + s * rMax * 0.72, pos[1], pos[2] - len * 0.4);
    f.rotation.z = s * -0.18;
    group.add(f);
  }
}

/** Roda pendarat F-16 detail (nose gear + main gear + pintu kompartemen). */
function buildF16Gear(
  parent: THREE.Group,
  mats: { strut: THREE.Material; tire: THREE.Material; dark: THREE.Material; skin: THREE.Material; light: THREE.Material },
) {
  const group = new THREE.Group();
  group.name = 'landing-gear';
  parent.add(group);
  const noseZ = 2.55;
  const noseR = 0.22;
  const noseStrut = mk(new THREE.CylinderGeometry(0.048, 0.042, 0.72, 14), mats.strut);
  noseStrut.position.set(0, noseR + 0.34, noseZ);
  noseStrut.rotation.x = 0.14;
  group.add(noseStrut);

  const noseDrag = mk(new THREE.CylinderGeometry(0.024, 0.024, 0.56, 10), mats.strut);
  noseDrag.position.set(0, 0.56, noseZ - 0.24);
  noseDrag.rotation.x = -0.68;
  group.add(noseDrag);

  const taxiLight = mk(new THREE.CylinderGeometry(0.044, 0.044, 0.04, 14), mats.light);
  taxiLight.rotation.x = Math.PI / 2;
  taxiLight.position.set(0.06, 0.52, noseZ + 0.07);
  group.add(taxiLight);

  const noseDoor = mk(new THREE.BoxGeometry(0.025, 0.34, 0.85), mats.skin);
  noseDoor.position.set(0.24, 0.56, noseZ - 0.25);
  noseDoor.rotation.z = 0.15;
  group.add(noseDoor);

  const noseTire = mk(new THREE.CylinderGeometry(noseR, noseR, 0.14, 28), mats.tire);
  noseTire.rotation.z = Math.PI / 2;
  noseTire.position.set(0, noseR, noseZ + 0.05);
  const noseHub = mk(new THREE.CylinderGeometry(noseR * 0.52, noseR * 0.52, 0.155, 18), mats.strut);
  noseHub.rotation.z = Math.PI / 2;
  noseHub.position.copy(noseTire.position);
  group.add(noseTire, noseHub);

  const mainR = 0.31;
  const mainZ = -1.25;
  for (const s of [1, -1]) {
    const wheelX = s * 1.12;
    const strut = mk(new THREE.CylinderGeometry(0.055, 0.048, 1.05, 14), mats.strut);
    strut.position.set(s * 0.78, 0.68, mainZ);
    strut.rotation.z = s * 0.52;
    group.add(strut);

    const oleo = mk(new THREE.CylinderGeometry(0.036, 0.036, 0.45, 12), mats.strut);
    oleo.position.set(s * 0.98, 0.42, mainZ);
    oleo.rotation.z = s * 0.22;
    group.add(oleo);

    const brace = mk(new THREE.CylinderGeometry(0.028, 0.028, 0.92, 10), mats.strut);
    brace.position.set(s * 0.62, 0.68, mainZ + 0.34);
    brace.rotation.x = 0.65;
    brace.rotation.z = s * 0.32;
    group.add(brace);

    const door = mk(new THREE.BoxGeometry(0.03, 0.48, 1.15), mats.skin);
    door.position.set(s * 0.58, 0.62, mainZ - 0.05);
    door.rotation.z = s * 0.25;
    group.add(door);

    const tire = mk(new THREE.CylinderGeometry(mainR, mainR, 0.22, 28), mats.tire);
    tire.rotation.z = Math.PI / 2;
    tire.position.set(wheelX, mainR, mainZ);
    const hub = mk(new THREE.CylinderGeometry(mainR * 0.55, mainR * 0.55, 0.235, 18), mats.strut);
    hub.rotation.z = Math.PI / 2;
    hub.position.copy(tire.position);
    const axle = mk(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 10), mats.dark);
    axle.rotation.z = Math.PI / 2;
    axle.position.set(wheelX - s * 0.14, mainR, mainZ);
    group.add(tire, hub, axle);
  }
}

export function buildDetailedF16(): BuildResult {
  const g = new THREE.Group();
  const yC = 1.5;

  // --- Material PBR ---
  const camoWing = camoTexture(
    '#7c8fa3',
    [
      { c: '#54687d', n: 15, r: 62 },
      { c: '#44576b', n: 7, r: 42 },
      { c: '#9aaab9', n: 7, r: 36 },
    ],
    1601,
    { noise: 0.03 },
  );
  const bump = panelBumpTexture(1601);

  const cloneRep = (tex: THREE.Texture, rx: number, ry: number) => {
    const t = tex.clone();
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    t.needsUpdate = true;
    return t;
  };

  const fuseMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    map: f16LiveryTexture(),
    bumpMap: cloneRep(bump, 2.4, 4.8),
    bumpScale: 0.016,
    metalness: 0.5,
    roughness: 0.44,
  });

  const wingMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    map: cloneRep(camoWing, 1.4, 1.4),
    bumpMap: cloneRep(bump, 1.6, 1.6),
    bumpScale: 0.014,
    metalness: 0.52,
    roughness: 0.42,
  });

  const radomeMat = new THREE.MeshStandardMaterial({
    color: '#46505b',
    metalness: 0.22,
    roughness: 0.55,
  });

  const bellyMat = new THREE.MeshStandardMaterial({
    color: '#adb8c2',
    bumpMap: cloneRep(bump, 1.5, 2.0),
    bumpScale: 0.012,
    metalness: 0.48,
    roughness: 0.46,
  });

  const darkMetal = new THREE.MeshStandardMaterial({
    color: '#2e3339',
    metalness: 0.85,
    roughness: 0.32,
  });

  const titaniumMat = new THREE.MeshStandardMaterial({
    color: '#58534c',
    metalness: 0.88,
    roughness: 0.26,
  });

  const intakeInnerMat = new THREE.MeshStandardMaterial({
    color: '#090d12',
    metalness: 0.2,
    roughness: 0.88,
    side: THREE.DoubleSide,
  });

  const canopyGlassMat = new THREE.MeshPhysicalMaterial({
    color: '#d8b058',
    metalness: 0.16,
    roughness: 0.04,
    transparent: true,
    opacity: 0.52,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    iridescence: 0.4,
    envMapIntensity: 2.1,
    side: THREE.DoubleSide,
  });

  const frameMat = new THREE.MeshStandardMaterial({ color: '#1b2026', metalness: 0.5, roughness: 0.45 });
  const gearStrutMat = new THREE.MeshStandardMaterial({ color: '#cfd5dc', metalness: 0.72, roughness: 0.3 });
  const tireMat = new THREE.MeshStandardMaterial({ color: '#141619', metalness: 0.06, roughness: 0.92 });
  const pylonMat = new THREE.MeshStandardMaterial({ color: '#7a8896', metalness: 0.5, roughness: 0.45 });
  const tankMat = new THREE.MeshStandardMaterial({
    color: '#9aa6b2',
    bumpMap: cloneRep(bump, 1, 2),
    bumpScale: 0.01,
    metalness: 0.48,
    roughness: 0.45,
  });
  const missileWhite = new THREE.MeshStandardMaterial({ color: '#e6e9ec', metalness: 0.32, roughness: 0.42 });
  const missileYellow = new THREE.MeshStandardMaterial({ color: '#eab308', metalness: 0.2, roughness: 0.5 });
  const missileBrown = new THREE.MeshStandardMaterial({ color: '#7c4a22', metalness: 0.2, roughness: 0.5 });
  const hudGlassMat = new THREE.MeshBasicMaterial({ color: '#34f5c5', transparent: true, opacity: 0.48, side: THREE.DoubleSide });
  const mfdGlowMat = new THREE.MeshBasicMaterial({ color: '#22c55e' });
  const taxiLightMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff6d6', emissiveIntensity: 1.6 });
  const internalMat = new THREE.MeshStandardMaterial({ color: '#4fa3c7', metalness: 0.7, roughness: 0.35 });
  const coreMat = new THREE.MeshStandardMaterial({ color: '#c47a3c', metalness: 0.85, roughness: 0.3 });
  const glowMat = new THREE.MeshStandardMaterial({
    color: '#261208',
    metalness: 0.6,
    roughness: 0.4,
    emissive: new THREE.Color('#ff6a1a'),
    emissiveIntensity: 0,
  });

  // =========================================================================
  // 1. BADAN UTAMA BLENDED WING-BODY (NORMAL KELUAR YANG BENAR)
  // =========================================================================
  const bodyZs: number[] = [];
  for (let i = 0; i <= 60; i++) bodyZs.push(-6.75 + (11.98 * i) / 60); // -6.75 .. +5.23
  const fuseMesh = mk(
    buildLoftGeometry(
      bodyZs.map((z) => ({ z, point: (th) => f16CrossSection(z, th, yC) })),
      64,
      false,
      false,
    ),
    fuseMat,
  );
  g.add(fuseMesh);

  // Radome hidung ogive gelap (z = 5.20 .. 7.25)
  const radomeZs: number[] = [];
  for (let i = 0; i <= 24; i++) radomeZs.push(5.2 + (2.05 * i) / 24);
  const radomeMesh = mk(
    buildLoftGeometry(
      radomeZs.map((z) => ({ z, point: (th) => f16CrossSection(z, th, yC) })),
      48,
      false,
      false,
    ),
    radomeMat,
  );
  g.add(radomeMesh);

  // Pitot tube + AoA probes + 4 bilah antena IFF "bird-slicer"
  const pitot = mk(new THREE.CylinderGeometry(0.008, 0.018, 0.72, 10), darkMetal);
  pitot.rotation.x = Math.PI / 2;
  pitot.position.set(0, yC - 0.22, 7.58);
  g.add(pitot);

  for (const s of [1, -1]) {
    const aoa = mk(new THREE.CylinderGeometry(0.006, 0.009, 0.18, 8), darkMetal);
    aoa.rotation.z = s * Math.PI * 0.46;
    aoa.position.set(s * 0.45, yC - 0.08, 5.08);
    g.add(aoa);
  }
  for (let i = 0; i < 4; i++) {
    const blade = mk(new THREE.BoxGeometry(0.012, 0.09, 0.14), darkMetal);
    blade.position.set(-0.15 + i * 0.1, yC + 0.43, 4.98);
    blade.rotation.x = -0.35;
    g.add(blade);
  }

  // Port kanon M61A1 Vulcan 20mm di LERX kiri
  const gunFairing = mk(new THREE.CylinderGeometry(0.042, 0.062, 0.58, 12), darkMetal);
  gunFairing.rotation.x = Math.PI / 2;
  gunFairing.position.set(-0.78, yC + 0.06, 2.35);
  g.add(gunFairing);

  // =========================================================================
  // 2. VENTRAL AIR INTAKE (SMILING SCOOP + SPLITTER PLATE + RONGGA)
  // =========================================================================
  const intakeZs: number[] = [];
  for (let i = 0; i <= 24; i++) intakeZs.push(-2.0 + (5.15 * i) / 24); // -2.0 .. +3.15
  const intakeMesh = mk(
    buildLoftGeometry(
      intakeZs.map((z) => {
        const frontFade = smoothstep(-2.0, 0.7, z);
        const lipTaper = z > 2.6 ? 1 - 0.06 * ((z - 2.6) / 0.55) : 1;
        const w = (0.5 * frontFade + 0.08) * lipTaper;
        const h = (0.31 * frontFade + 0.06) * lipTaper;
        const y0 = 0.87 + 0.25 * (1 - frontFade);
        return {
          z,
          point: (th) => {
            const s = Math.sin(th);
            const c = Math.cos(th);
            const yOff = c > 0 ? c * h * 0.68 : c * h * 1.15;
            return [s * w, y0 + yOff];
          },
        };
      }),
      44,
    ),
    bellyMat,
  );
  g.add(intakeMesh);

  // Bibir mulut intake logam + rongga gelap
  const intakeLip = mk(new THREE.TorusGeometry(0.44, 0.032, 10, 40), darkMetal);
  intakeLip.scale.set(1.08, 0.68, 1);
  intakeLip.position.set(0, 0.86, 3.14);
  g.add(intakeLip);

  const intakeCavity = mk(new THREE.CircleGeometry(0.43, 36), intakeInnerMat);
  intakeCavity.scale.set(1.06, 0.66, 1);
  intakeCavity.position.set(0, 0.86, 3.11);
  g.add(intakeCavity);

  // Splitter plate di atas mulut intake
  const splitter = mk(new THREE.BoxGeometry(0.8, 0.025, 0.68), darkMetal);
  splitter.position.set(0, 1.11, 3.05);
  splitter.rotation.x = 0.08;
  g.add(splitter);

  // =========================================================================
  // 3. KANOPI TEARDROP BUBBLE & KOKPIT DETAIL (NORMAL KELUAR YANG BENAR)
  // =========================================================================
  const canopyZs: number[] = [];
  for (let i = 0; i <= 28; i++) canopyZs.push(1.65 + (3.25 * i) / 28); // 1.65 .. 4.90
  const canopyGeo = buildLoftGeometry(
    canopyZs.map((z) => {
      const u = (z - 1.65) / 3.25; // 0 belakang -> 1 depan
      const arch = Math.sin(Math.pow(u, 0.78) * Math.PI);
      const w = 0.43 * Math.pow(arch, 0.6);
      const h = 0.62 * arch;
      const baseY = 1.88 + 0.06 * (1 - u);
      return {
        z,
        point: (th) => {
          // Busur setengah elips atas: th=0 -> kiri (-w), th=PI -> puncak (+h), th=2PI -> kanan (+w)
          const a = (th / (Math.PI * 2)) * Math.PI - Math.PI / 2;
          return [Math.sin(a) * w, baseY + Math.cos(a) * h];
        },
      };
    }),
    36,
  );
  const canopyMesh = mk(canopyGeo, canopyGlassMat, 'glass');
  g.add(canopyMesh);

  // Bingkai sill kanopi & lengkung belakang
  const sillL = mk(new THREE.BoxGeometry(0.038, 0.038, 3.05), frameMat);
  sillL.position.set(-0.4, 1.91, 3.3);
  const sillR = sillL.clone();
  sillR.position.x = 0.4;
  const rearArch = mk(new THREE.TorusGeometry(0.39, 0.026, 8, 24, Math.PI), frameMat);
  rearArch.position.set(0, 1.92, 2.48);
  rearArch.rotation.x = -0.35;
  g.add(sillL, sillR, rearArch);

  // Kokpit interior selalu terlihat melalui kaca kanopi
  const tub = mk(new THREE.BoxGeometry(0.66, 0.26, 2.1), frameMat, 'cockpit');
  tub.position.set(0, 1.84, 3.45);
  const glareShield = mk(new THREE.BoxGeometry(0.56, 0.14, 0.42), frameMat, 'cockpit');
  glareShield.position.set(0, 2.02, 4.18);
  glareShield.rotation.x = 0.2;
  const mfdL = mk(new THREE.PlaneGeometry(0.11, 0.11), mfdGlowMat, 'cockpit');
  mfdL.position.set(-0.12, 1.98, 3.96);
  mfdL.rotation.y = Math.PI;
  const mfdR = mfdL.clone();
  mfdR.position.x = 0.12;
  const hud = mk(new THREE.PlaneGeometry(0.18, 0.22), hudGlassMat, 'cockpit');
  hud.position.set(0, 2.18, 4.14);
  hud.rotation.x = -0.58;
  const seatPan = mk(new THREE.BoxGeometry(0.38, 0.09, 0.42), frameMat, 'cockpit');
  seatPan.position.set(0, 1.88, 3.35);
  const seatBack = mk(new THREE.BoxGeometry(0.36, 0.58, 0.1), frameMat, 'cockpit');
  seatBack.position.set(0, 2.14, 3.12);
  seatBack.rotation.x = -0.45;
  const headrest = mk(new THREE.BoxGeometry(0.24, 0.18, 0.12), darkMetal, 'cockpit');
  headrest.position.set(0, 2.4, 2.98);
  headrest.rotation.x = -0.35;
  g.add(tub, glareShield, mfdL, mfdR, hud, seatPan, seatBack, headrest);

  // =========================================================================
  // 4. SAYAP UTAMA BERPROFIL AIRFOIL, STABILATOR, EKOR TEGAK & VENTRAL FINS
  // =========================================================================
  const wingSections: AirfoilSection[] = [
    { spanPos: 0.72, leZ: 1.55, teZ: -3.25, offset: 1.45, thick: 0.21 },
    { spanPos: 1.75, leZ: 0.8, teZ: -2.95, offset: 1.44, thick: 0.16 },
    { spanPos: 3.25, leZ: -0.38, teZ: -2.68, offset: 1.42, thick: 0.11 },
    { spanPos: 4.6, leZ: -1.52, teZ: -2.55, offset: 1.4, thick: 0.065 },
  ];
  const wingR = mk(buildAirfoilSurface(wingSections, 'horizontal', 1, 0.08), wingMat);
  const wingL = mk(buildAirfoilSurface(wingSections, 'horizontal', -1, 0.08), wingMat);
  g.add(wingR, wingL);

  // Horizontal Stabilators (all-moving, sedikit anhedral)
  const stabSections: AirfoilSection[] = [
    { spanPos: 0.56, leZ: -4.4, teZ: -6.55, offset: 1.38, thick: 0.11 },
    { spanPos: 2.7, leZ: -5.85, teZ: -6.78, offset: 1.24, thick: 0.05 },
  ];
  g.add(
    mk(buildAirfoilSurface(stabSections, 'horizontal', 1, 0), wingMat),
    mk(buildAirfoilSurface(stabSections, 'horizontal', -1, 0), wingMat),
  );

  // Vertical Stabilizer (normal keluar yang benar) + Dorsal Fin Fillet + Parabrake Housing
  const finSections: AirfoilSection[] = [
    { spanPos: 1.94, leZ: -2.65, teZ: -6.62, offset: 0, thick: 0.17 },
    { spanPos: 2.35, leZ: -3.55, teZ: -6.66, offset: 0, thick: 0.15 },
    { spanPos: 3.35, leZ: -4.65, teZ: -6.72, offset: 0, thick: 0.11 },
    { spanPos: 4.7, leZ: -5.82, teZ: -6.75, offset: 0, thick: 0.065 },
  ];
  const finMesh = mk(buildAirfoilSurface(finSections, 'vertical', 1, 0), wingMat);
  g.add(finMesh);

  // Extended Parabrake Housing (ciri khas F-16AM / Block 52ID TNI AU)
  const parabrake = mk(new THREE.CylinderGeometry(0.11, 0.14, 1.95, 16), fuseMat);
  parabrake.rotation.x = Math.PI / 2;
  parabrake.position.set(0, 2.04, -6.12);
  const parabrakeCap = mk(new THREE.ConeGeometry(0.11, 0.25, 16), darkMetal);
  parabrakeCap.rotation.x = -Math.PI / 2;
  parabrakeCap.position.set(0, 2.04, -7.2);
  g.add(parabrake, parabrakeCap);

  // Antena RWR di pucuk ekor
  const tailPod = mk(new THREE.CapsuleGeometry(0.045, 0.65, 6, 12), darkMetal);
  tailPod.rotation.x = Math.PI / 2;
  tailPod.position.set(0, 4.7, -6.28);
  g.add(tailPod);

  // Twin Ventral Fins miring keluar ±22°
  for (const s of [1, -1]) {
    const vf = mk(
      buildAirfoilSurface(
        [
          { spanPos: 0, leZ: -4.25, teZ: -6.15, offset: 0, thick: 0.05 },
          { spanPos: -0.52, leZ: -4.75, teZ: -6.0, offset: 0, thick: 0.025 },
        ],
        'vertical',
        1,
        0,
      ),
      wingMat,
    );
    vf.position.set(s * 0.42, 1.12, 0);
    vf.rotation.z = s * 0.36;
    g.add(vf);
  }

  // =========================================================================
  // 5. PERSENJATAAN & TANGKI EKSTERNAL (AIM-9, AIM-120, 370-GAL TANKS)
  // =========================================================================
  const ordMats = { white: missileWhite, dark: darkMetal, yellow: missileYellow, brown: missileBrown, metal: titaniumMat };

  for (const s of [1, -1]) {
    const tipRail = mk(new THREE.BoxGeometry(0.075, 0.085, 2.15), darkMetal);
    tipRail.position.set(s * 4.64, 1.4, -2.02);
    g.add(tipRail);
    buildMissile(g, 'aim9', [s * 4.71, 1.4, -1.75], ordMats);

    const pylonOut = mk(new THREE.BoxGeometry(0.065, 0.28, 1.25), pylonMat);
    pylonOut.position.set(s * 3.18, 1.26, -1.65);
    g.add(pylonOut);
    buildMissile(g, 'aim120', [s * 3.18, 1.06, -1.45], ordMats);

    const pylonMid = mk(new THREE.BoxGeometry(0.085, 0.32, 1.65), pylonMat);
    pylonMid.position.set(s * 2.05, 1.25, -1.25);
    g.add(pylonMid);
    buildDropTank(g, [s * 2.05, 0.93, -1.1], 1.0, tankMat, pylonMat);
  }

  // =========================================================================
  // 6. NOZZLE MESIN PRATT & WHITNEY F100-PW-220E (15 TURKEY FEATHERS)
  // =========================================================================
  const nozZ = -6.72;
  const nozInner = mk(new THREE.CylinderGeometry(0.39, 0.33, 0.82, 32, 1, true), darkMetal);
  nozInner.rotation.x = Math.PI / 2;
  nozInner.position.set(0, yC, nozZ - 0.38);
  g.add(nozInner);

  const petalCount = 15;
  for (let i = 0; i < petalCount; i++) {
    const a = (i / petalCount) * Math.PI * 2;
    const petal = mk(new THREE.BoxGeometry(0.145, 0.022, 0.78), i % 2 === 0 ? titaniumMat : darkMetal);
    const rMid = 0.375;
    petal.position.set(Math.cos(a) * rMid, yC + Math.sin(a) * rMid, nozZ - 0.38);
    petal.rotation.z = a + Math.PI / 2;
    petal.rotateX(0.09);
    g.add(petal);
  }

  const flameFace = mk(new THREE.CircleGeometry(0.34, 32), glowMat);
  flameFace.rotation.y = Math.PI;
  flameFace.position.set(0, yC, nozZ - 0.18);
  g.add(flameFace);

  // =========================================================================
  // 7. RODA PENDARAT DETAIL
  // =========================================================================
  buildF16Gear(g, {
    strut: gearStrutMat,
    tire: tireMat,
    dark: darkMetal,
    skin: bellyMat,
    light: taxiLightMat,
  });

  // =========================================================================
  // 8. STRUKTUR INTERNAL (X-RAY)
  // =========================================================================
  for (let z = -5.8; z <= 5.4; z += 0.85) {
    const r = z > 3.5 ? 0.36 : z < -4.2 ? 0.38 : 0.48;
    const rib = mk(new THREE.TorusGeometry(r, 0.02, 6, 32), internalMat, 'internal');
    rib.position.set(0, yC, z);
    g.add(rib);
  }
  const shaft = mk(new THREE.CylinderGeometry(0.12, 0.12, 5.1, 12), coreMat, 'internal');
  shaft.rotation.x = Math.PI / 2;
  shaft.position.set(0, yC, -4.0);
  g.add(shaft);
  for (let i = 0; i < 7; i++) {
    const stage = mk(new THREE.CylinderGeometry(0.32, 0.32, 0.2, 20), i >= 4 ? coreMat : internalMat, 'internal');
    stage.rotation.x = Math.PI / 2;
    stage.position.set(0, yC, -1.8 - i * 0.72);
    g.add(stage);
  }
  const dish = mk(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 28), internalMat, 'internal');
  dish.rotation.x = Math.PI / 2;
  dish.position.set(0, yC - 0.06, 6.05);
  g.add(dish);
  const intFuel = mk(
    new THREE.CapsuleGeometry(0.24, 2.2, 6, 16),
    new THREE.MeshStandardMaterial({ color: '#2a6f97', metalness: 0.4, roughness: 0.4 }),
    'internal',
  );
  intFuel.rotation.x = Math.PI / 2;
  intFuel.position.set(0, yC + 0.14, 0.15);
  g.add(intFuel);

  // =========================================================================
  // 9. LIVERY & MARKA TNI AU (TS-1601, ROUNDEL SEGILIMA, BENDERA MERAH-PUTIH)
  // =========================================================================
  const roundelTex = roundelTexture();
  const flagTex = flagTexture();
  const tniAuTex = textTexture('TNI AU', { color: '#141a21', aspect: 4 });
  const tailCodeTex = textTexture('TS-1601', { color: '#141a21', aspect: 4.2 });
  const noseNumTex = textTexture('01', { color: '#141a21', aspect: 1.5 });

  // Roundel sayap atas
  addDecal(g, wingR, [2.75, 1.54, -1.42], [-Math.PI / 2, 0, 0], [1.15, 1.15, 0.5], roundelTex);
  addDecal(g, wingL, [-2.75, 1.54, -1.42], [-Math.PI / 2, 0, 0], [1.15, 1.15, 0.5], roundelTex);

  // Marka ekor & badan kedua sisi (depth tipis agar tidak tembus/terbalik ke sisi sebaliknya)
  for (const s of [1, -1]) {
    const rot: V3 = [0, (s * Math.PI) / 2, 0];
    addDecal(g, finMesh, [s * 0.05, 3.85, -5.85], rot, [0.95, 0.62, 0.09], flagTex);
    addDecal(g, finMesh, [s * 0.05, 2.9, -5.25], rot, [1.55, 0.36, 0.09], tailCodeTex);
    addDecal(g, fuseMesh, [s * 0.65, 1.56, 0.85], rot, [1.45, 0.36, 0.28], tniAuTex);
    addDecal(g, fuseMesh, [s * 0.48, 1.46, 4.9], rot, [0.58, 0.38, 0.22], noseNumTex);
    addDecal(g, fuseMesh, [s * 0.66, 1.48, -2.55], rot, [0.72, 0.72, 0.28], roundelTex);
  }

  return {
    group: g,
    nozzles: [{ pos: [0, yC, -7.52], r: 0.33, kind: 'ab' }],
    spinners: [],
    navLights: [
      { pos: [4.71, 1.4, -0.5], color: '#ff2a2a' },
      { pos: [-4.71, 1.4, -0.5], color: '#22ff66' },
      { pos: [0, 4.76, -6.6], color: '#ffffff', blink: 'strobe' },
      { pos: [0, 2.15, -3.1], color: '#ff3030', blink: 'beacon' },
    ],
    glowMats: [glowMat],
    hoverHeight: 0.9,
  };
}
