import * as THREE from 'three';
import { DecalGeometry } from 'three/examples/jsm/geometries/DecalGeometry.js';
import {
  camoTexture,
  cockpitWindowTexture,
  flagTexture,
  heliCabinTexture,
  jupiterFuselageTexture,
  jupiterWingTexture,
  roundelTexture,
  solidNoiseTexture,
  textTexture,
  vipFuselageTexture,
} from './textures';
import { buildDetailedF16 } from './f16Builder';
import { buildDetailedSu30 } from './su30Builder';
import { buildDetailedRafale } from './rafaleBuilder';
import {
  buildDetailedHawk209,
  buildDetailedSu27,
  buildDetailedSuperTucano,
  buildDetailedT50i,
} from './fightersPackBuilder';
import { buildDetailedC130J, buildDetailedKT1B } from './herculesKt1Builder';

/* =========================================================================
 * Rakitan geometri 3D prosedural armada TNI AU.
 * Konvensi koordinat: hidung menghadap +Z, atas +Y, roda menapak di y = 0,
 * panjang/rentang maksimum ±14 unit (sama dengan normalisasi model .glb).
 * Peran mesh (userData.role): skin | glass | decal | internal | blur
 * ========================================================================= */

export type V3 = [number, number, number];
type Pt = [number, number];

export interface NozzleFx {
  pos: V3;
  r: number;
  kind: 'ab' | 'fan' | 'smoke';
}
export interface SpinnerFx {
  obj: THREE.Object3D;
  axis: 'x' | 'y' | 'z';
  speed: number;
  blur?: THREE.Mesh;
}
export interface NavLightFx {
  pos: V3;
  color: string;
  blink?: 'strobe' | 'beacon';
}
export interface BuildResult {
  group: THREE.Group;
  nozzles: NozzleFx[];
  spinners: SpinnerFx[];
  navLights: NavLightFx[];
  glowMats: THREE.MeshStandardMaterial[];
  hoverHeight: number;
  rotorWash?: boolean;
}

/* ------------------------------ Material ------------------------------ */

const std = (color: THREE.ColorRepresentation, metalness = 0.6, roughness = 0.4, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });

interface Kit {
  fuse: THREE.MeshStandardMaterial;
  wing: THREE.MeshStandardMaterial;
  tail: THREE.MeshStandardMaterial;
  radome: THREE.MeshStandardMaterial;
  nozzle: THREE.MeshStandardMaterial;
  intake: THREE.MeshStandardMaterial;
  glass: THREE.MeshPhysicalMaterial;
  gear: THREE.MeshStandardMaterial;
  tire: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
  missile: THREE.MeshStandardMaterial;
  internal: THREE.MeshStandardMaterial;
  core: THREE.MeshStandardMaterial;
  seat: THREE.MeshStandardMaterial;
  cargo: THREE.MeshStandardMaterial;
  blade: THREE.MeshStandardMaterial;
  glow: THREE.MeshStandardMaterial;
}

type LiveryKey = 'camo-blue' | 'camo-flanker' | 'grey' | 'camo-grey' | 'jungle' | 'jupiter' | 'vip';

const TILE = 5;

function withRepeat(tex: THREE.Texture, rx: number, ry: number) {
  const t = tex.clone();
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.needsUpdate = true;
  return t;
}

/** Membuat set material sesuai livery. `fuseLen` & `circ` dipakai untuk menskalakan kamuflase pada fuselage. */
function makeKit(key: LiveryKey, fuseLen: number, circ: number, extra?: { zMin: number; zMax: number; winFrom: number; winTo: number }): Kit {
  let base: THREE.Texture;
  let fuse: THREE.MeshStandardMaterial;
  let wing: THREE.MeshStandardMaterial;
  let tail: THREE.MeshStandardMaterial;
  const metal = 0.55;
  const rough = 0.48;

  switch (key) {
    case 'camo-blue':
      base = camoTexture('#8e9cab', [{ c: '#66788c', n: 14, r: 60 }, { c: '#aab5c0', n: 6, r: 34 }], 1601);
      break;
    case 'camo-flanker':
      base = camoTexture('#8fa3b8', [{ c: '#56708c', n: 13, r: 58 }, { c: '#c2cdd7', n: 9, r: 40 }, { c: '#3f5168', n: 5, r: 30 }], 3005);
      break;
    case 'grey':
      base = solidNoiseTexture('#7b848d', 301, 0.035);
      break;
    case 'camo-grey':
      base = camoTexture('#7f8993', [{ c: '#5e6871', n: 13, r: 56 }, { c: '#99a2ab', n: 6, r: 30 }], 5007);
      break;
    case 'jungle':
      base = camoTexture('#4e5b37', [{ c: '#2f3a22', n: 12, r: 56 }, { c: '#6c5a3a', n: 10, r: 46 }, { c: '#1f2618', n: 6, r: 28 }], 1339, { noise: 0.06 });
      break;
    case 'jupiter':
      base = jupiterWingTexture();
      break;
    case 'vip':
    default:
      base = solidNoiseTexture('#f3f5f7', 7304, 0.02);
      break;
  }

  if (key === 'jupiter') {
    fuse = std('#ffffff', 0.45, 0.35, { map: jupiterFuselageTexture() });
    wing = std('#ffffff', 0.45, 0.35, { map: withRepeat(base, 1 / 6, 1 / 6) });
    tail = wing;
  } else if (key === 'vip') {
    const e = extra!;
    fuse = std('#ffffff', 0.45, 0.3, { map: vipFuselageTexture(e.zMin, e.zMax, e.winFrom, e.winTo) });
    wing = std('#b9c0c8', 0.8, 0.32, { map: withRepeat(solidNoiseTexture('#b9c0c8', 9, 0.02), 0.2, 0.2) });
    tail = std('#ffffff', 0.45, 0.3, { map: withRepeat(base, 0.2, 0.2) });
  } else {
    fuse = std('#ffffff', metal, rough, { map: withRepeat(base, circ / TILE, fuseLen / TILE) });
    wing = std('#ffffff', metal, rough, { map: withRepeat(base, 1 / TILE, 1 / TILE) });
    tail = wing;
  }

  return {
    fuse,
    wing,
    tail,
    radome: std(key === 'vip' ? '#3a3f46' : '#5b636c', 0.3, 0.55),
    nozzle: std('#4a4642', 0.8, 0.35),
    intake: std('#0b0e12', 0.2, 0.8),
    glass: new THREE.MeshPhysicalMaterial({
      color: key === 'camo-blue' ? '#d9b45a' : '#7fa7c4',
      metalness: 0.15,
      roughness: 0.04,
      transparent: true,
      opacity: 0.52,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      envMapIntensity: 1.6,
    }),
    gear: std('#c9ced3', 0.7, 0.35),
    tire: std('#151515', 0.05, 0.9),
    metal: std('#8d949b', 0.8, 0.3),
    missile: std('#e4e6e8', 0.35, 0.45),
    internal: std('#4fa3c7', 0.7, 0.35),
    core: std('#c47a3c', 0.85, 0.3),
    seat: std('#2b2f33', 0.2, 0.7),
    cargo: std('#b08a3c', 0.3, 0.6),
    blade: std('#1d1f22', 0.4, 0.5),
    glow: std('#251208', 0.6, 0.4, { emissive: new THREE.Color('#ff6a1a'), emissiveIntensity: 0 }),
  };
}

/* ------------------------------ Helper geometri ------------------------------ */

type Role = 'skin' | 'glass' | 'decal' | 'internal' | 'blur';

function mk(geo: THREE.BufferGeometry, mat: THREE.Material, role: Role = 'skin') {
  const m = new THREE.Mesh(geo, mat);
  m.userData.role = role;
  m.castShadow = role === 'skin';
  return m;
}

/** Profil radius r(z) halus (interpolasi Hermite / Catmull-Rom). Titik harus urut z menaik. */
function profileFn(pts: Pt[]) {
  const n = pts.length;
  const m = pts.map((_, i) => {
    if (i === 0) return (pts[1][1] - pts[0][1]) / (pts[1][0] - pts[0][0]);
    if (i === n - 1) return (pts[n - 1][1] - pts[n - 2][1]) / (pts[n - 1][0] - pts[n - 2][0]);
    return (pts[i + 1][1] - pts[i - 1][1]) / (pts[i + 1][0] - pts[i - 1][0]);
  });
  return (z: number) => {
    if (z <= pts[0][0]) return pts[0][1];
    if (z >= pts[n - 1][0]) return pts[n - 1][1];
    let i = 0;
    while (i < n - 2 && z > pts[i + 1][0]) i++;
    const [z0, r0] = pts[i];
    const [z1, r1] = pts[i + 1];
    const h = z1 - z0;
    const t = (z - z0) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    const r = (2 * t3 - 3 * t2 + 1) * r0 + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * r1 + (t3 - t2) * h * m[i + 1];
    return Math.max(0, Math.min(r, Math.max(r0, r1) * 1.08));
  };
}

/** Lathe sepanjang sumbu Z dengan sampling seragam (UV v linear terhadap z). */
function latheZ(pts: Pt[], segs = 48, rings = 72, range?: [number, number], grow = 1) {
  const f = profileFn(pts);
  const z0 = range ? range[0] : pts[0][0];
  const z1 = range ? range[1] : pts[pts.length - 1][0];
  const arr: THREE.Vector2[] = [];
  for (let i = 0; i <= rings; i++) {
    const z = z0 + ((z1 - z0) * i) / rings;
    arr.push(new THREE.Vector2(Math.max(0.0005, f(z) * grow), z));
  }
  const g = new THREE.LatheGeometry(arr, segs);
  g.rotateX(Math.PI / 2);
  return { geo: g, f };
}

/** Lengkungan ekor ke atas (upsweep) untuk pesawat angkut & boom helikopter. */
function upsweep(geo: THREE.BufferGeometry, fromZ: number, k: number, pow = 1.3) {
  const p = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const z = p.getZ(i);
    if (z < fromZ) p.setY(i, p.getY(i) + k * Math.pow(fromZ - z, pow));
  }
  p.needsUpdate = true;
  geo.computeVertexNormals();
}

/** Bidang datar (sayap/stabilizer) dari titik planform [x, z]. */
function planGeo(pts: Pt[], thick: number) {
  const s = new THREE.Shape();
  pts.forEach(([x, z], i) => (i ? s.lineTo(x, z) : s.moveTo(x, z)));
  s.closePath();
  const bev = Math.min(0.035, thick * 0.3);
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.01, thick - bev * 2), bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 4 });
  g.translate(0, 0, -(thick - bev * 2) / 2);
  g.rotateX(Math.PI / 2);
  return g;
}

function wingPair(group: THREE.Group, pts: Pt[], thick: number, y: number, mat: THREE.Material, dihedral = 0) {
  const r = mk(planGeo(pts, thick), mat);
  const l = mk(planGeo(pts.map(([x, z]) => [-x, z] as Pt), thick), mat);
  r.position.y = y;
  l.position.y = y;
  r.rotation.z = dihedral;
  l.rotation.z = -dihedral;
  group.add(r, l);
  return [r, l] as const;
}

/** Sirip tegak dari titik [z, y] (y relatif terhadap pangkal). */
function finGeo(pts: Pt[], thick: number) {
  const s = new THREE.Shape();
  pts.forEach(([z, y], i) => (i ? s.lineTo(z, y) : s.moveTo(z, y)));
  s.closePath();
  const bev = Math.min(0.03, thick * 0.3);
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.01, thick - bev * 2), bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 2 });
  g.translate(0, 0, -(thick - bev * 2) / 2);
  g.rotateY(-Math.PI / 2);
  return g;
}

function fin(group: THREE.Group, pts: Pt[], thick: number, x: number, y: number, mat: THREE.Material, cant = 0) {
  const m = mk(finGeo(pts, thick), mat);
  m.position.set(x, y, 0);
  m.rotation.z = cant;
  group.add(m);
  return m;
}

/** Tabung terbuka sepanjang Z (nozzle, saluran). rFront di +Z. */
function tubeZ(rFront: number, rBack: number, len: number, mat: THREE.Material, open = true) {
  const g = new THREE.CylinderGeometry(rFront, rBack, len, 32, 1, open);
  g.rotateX(Math.PI / 2);
  const m = mk(g, mat);
  if (open) (mat as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  return m;
}

function disc(r: number, mat: THREE.Material, facing: 'front' | 'back' = 'front', role: Role = 'skin') {
  const g = new THREE.CircleGeometry(r, 32);
  if (facing === 'back') g.rotateY(Math.PI);
  return mk(g, mat, role);
}

function gear(parent: THREE.Group, k: Kit, x: number, z: number, topY: number, wheelR: number, opts: { twin?: boolean; width?: number; tandem?: boolean } = {}) {
  let group = parent.getObjectByName('landing-gear') as THREE.Group | undefined;
  if (!group) {
    group = new THREE.Group();
    group.name = 'landing-gear';
    parent.add(group);
  }
  const w = opts.width ?? wheelR * 0.6;
  const strutLen = Math.max(0.05, topY - wheelR);
  const strut = mk(new THREE.CylinderGeometry(0.045, 0.055, strutLen, 10), k.gear);
  strut.position.set(x, wheelR + strutLen / 2, z);
  group.add(strut);
  const offs = opts.twin ? [-w * 0.62, w * 0.62] : [0];
  const zs = opts.tandem ? [z + wheelR * 1.15, z - wheelR * 1.15] : [z];
  for (const zz of zs) {
    for (const o of offs) {
      const tire = mk(new THREE.CylinderGeometry(wheelR, wheelR, w, 24), k.tire);
      tire.rotation.z = Math.PI / 2;
      tire.position.set(x + o, wheelR, zz);
      const hub = mk(new THREE.CylinderGeometry(wheelR * 0.55, wheelR * 0.55, w * 1.04, 16), k.gear);
      hub.rotation.z = Math.PI / 2;
      hub.position.copy(tire.position);
      group.add(tire, hub);
    }
  }
}

/** Baling-baling/rotor: kumpulan bilah berputar + cakram blur transparan. */
function rotor(k: Kit, blades: number, radius: number, chord: number, axis: 'x' | 'y' | 'z', hubR: number) {
  const pivot = new THREE.Group();
  for (let i = 0; i < blades; i++) {
    const arm = new THREE.Group();
    const b = mk(new THREE.BoxGeometry(chord, radius - hubR, 0.035), k.blade);
    b.position.y = hubR + (radius - hubR) / 2;
    b.rotation.y = 0.32;
    arm.add(b);
    arm.rotation.z = (i * Math.PI * 2) / blades;
    pivot.add(arm);
  }
  const hub = mk(new THREE.SphereGeometry(hubR, 20, 12), k.metal);
  hub.scale.z = 0.6;
  pivot.add(hub);
  const blurMat = new THREE.MeshBasicMaterial({ color: '#d7e4ee', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const blur = mk(new THREE.RingGeometry(hubR, radius, 64), blurMat, 'blur');
  blur.visible = false;
  const wrap = new THREE.Group();
  wrap.add(pivot, blur);
  // Orientasi default pivot: berputar di bidang XY (sumbu Z)
  if (axis === 'y') wrap.rotation.x = -Math.PI / 2;
  if (axis === 'x') wrap.rotation.y = Math.PI / 2;
  return { wrap, pivot, blur };
}

/* ------------------------------ Struktur internal (X-Ray) ------------------------------ */

function ribs(group: THREE.Group, f: (z: number) => number, z0: number, z1: number, step: number, y: number, sx: number, sy: number, mat: THREE.Material, yShift?: (z: number) => number) {
  for (let z = z0; z <= z1; z += step) {
    const r = f(z) * 0.86;
    if (r < 0.12) continue;
    const t = mk(new THREE.TorusGeometry(r, 0.022, 6, 36), mat, 'internal');
    t.scale.set(sx, sy, 1);
    t.position.set(0, y + (yShift ? yShift(z) : 0), z);
    group.add(t);
  }
  const spine = mk(new THREE.BoxGeometry(0.06, 0.06, z1 - z0), mat, 'internal');
  spine.position.set(0, y - f((z0 + z1) / 2) * 0.55 * sy, (z0 + z1) / 2);
  group.add(spine);
}

function engineCore(group: THREE.Group, k: Kit, x: number, y: number, zBack: number, zFront: number, r: number) {
  const len = zFront - zBack;
  const shaft = mk(new THREE.CylinderGeometry(r * 0.35, r * 0.35, len, 12), k.core, 'internal');
  shaft.rotation.x = Math.PI / 2;
  shaft.position.set(x, y, (zFront + zBack) / 2);
  group.add(shaft);
  const stages = 7;
  for (let i = 0; i < stages; i++) {
    const zz = zFront - (len * (i + 0.5)) / stages;
    const rr = r * (i < 3 ? 0.95 - i * 0.08 : 0.7 + (i - 3) * 0.05);
    const d = mk(new THREE.CylinderGeometry(rr, rr, len / stages / 2.4, 20), i >= 4 ? k.core : k.internal, 'internal');
    d.rotation.x = Math.PI / 2;
    d.position.set(x, y, zz);
    group.add(d);
  }
}

function seat(group: THREE.Group, k: Kit, z: number, y: number, x = 0, s = 1) {
  const base = mk(new THREE.BoxGeometry(0.42 * s, 0.12 * s, 0.42 * s), k.seat, 'internal');
  base.position.set(x, y, z);
  const back = mk(new THREE.BoxGeometry(0.42 * s, 0.6 * s, 0.1 * s), k.seat, 'internal');
  back.position.set(x, y + 0.3 * s, z - 0.22 * s);
  back.rotation.x = -0.25;
  group.add(base, back);
}

/* ------------------------------ Decal ------------------------------ */

const texCache = new Map<string, THREE.Texture>();
function cachedTex(key: string, make: () => THREE.Texture) {
  let t = texCache.get(key);
  if (!t) {
    t = make();
    texCache.set(key, t);
  }
  return t;
}
const ROUNDEL = () => cachedTex('roundel', roundelTexture);
const FLAG = () => cachedTex('flag', flagTexture);
const TEXT = (s: string, color = '#14191f', aspect = 4, stroke?: string) => cachedTex(`t:${s}:${color}:${aspect}:${stroke}`, () => textTexture(s, { color, aspect, stroke }));

const SIDE_R: V3 = [0, Math.PI / 2, 0];
const SIDE_L: V3 = [0, -Math.PI / 2, 0];

function decal(group: THREE.Group, target: THREE.Mesh, pos: V3, rot: V3, size: V3, tex: THREE.Texture, opts: { metal?: number; rough?: number } = {}) {
  group.updateMatrixWorld(true);
  const geo = new DecalGeometry(target, new THREE.Vector3(...pos), new THREE.Euler(...rot), new THREE.Vector3(...size));
  if (!geo.attributes.position || geo.attributes.position.count === 0) {
    geo.dispose();
    return null;
  }
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
    metalness: opts.metal ?? 0.25,
    roughness: opts.rough ?? 0.5,
    side: THREE.FrontSide,
  });
  const m = mk(geo, mat, 'decal');
  m.castShadow = false;
  m.renderOrder = 2;
  group.add(m);
  return m;
}

/** Decal kedua sisi (kiri & kanan) dengan posisi x dicerminkan. */
function decalSides(group: THREE.Group, target: THREE.Mesh, pos: V3, size: V3, tex: THREE.Texture) {
  decal(group, target, [Math.abs(pos[0]), pos[1], pos[2]], SIDE_R, size, tex);
  decal(group, target, [-Math.abs(pos[0]), pos[1], pos[2]], SIDE_L, size, tex);
}

function finMarkings(group: THREE.Group, finMesh: THREE.Mesh, x: number, thick: number, flagPos: [number, number], flagW: number, code: string, codePos: [number, number], codeW: number, codeColor = '#14191f') {
  const off = thick / 2;
  const depth = Math.min(0.08, thick * 0.6);
  for (const side of [1, -1]) {
    const rot = side > 0 ? SIDE_R : SIDE_L;
    decal(group, finMesh, [x + side * off, flagPos[0], flagPos[1]], rot, [flagW, flagW * 0.62, depth], FLAG());
    decal(group, finMesh, [x + side * off, codePos[0], codePos[1]], rot, [codeW, codeW * 0.25, depth], TEXT(code, codeColor));
  }
}

/* ------------------------------ Pesawat Tempur ------------------------------ */

function result(group: THREE.Group, k: Kit, partial: Omit<BuildResult, 'group' | 'glowMats'>): BuildResult {
  group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) m.receiveShadow = false;
  });
  return { group, glowMats: [k.glow], ...partial };
}

/* ------------------------------ Pesawat Angkut VIP ------------------------------ */

function buildB737(): BuildResult {
  const g = new THREE.Group();
  const yC = 1.55;
  const sx = 1.0;
  const sy = 1.04;
  const prof: Pt[] = [[-7.0, 0.06], [-6.6, 0.2], [-5.6, 0.42], [-4.4, 0.62], [-3.5, 0.72], [4.0, 0.72], [5.0, 0.68], [5.8, 0.58], [6.4, 0.42], [6.8, 0.24], [7.0, 0.02]];
  const k = makeKit('vip', 14, 2 * Math.PI * 0.72, { zMin: -7, zMax: 7, winFrom: -4.6, winTo: 4.4 });
  const { geo, f } = latheZ(prof, 56, 112);
  upsweep(geo, -3.5, 0.06, 1.3);
  const fuse = mk(geo, k.fuse);
  fuse.scale.set(sx, sy, 1);
  fuse.position.y = yC;
  g.add(fuse);
  const sweepY = (z: number) => (z < -3.5 ? 0.06 * Math.pow(-3.5 - z, 1.3) * sy : 0);

  const fair = mk(new THREE.SphereGeometry(1, 32, 16), k.wing);
  fair.scale.set(0.78, 0.3, 2.0);
  fair.position.set(0, 0.95, 0);
  g.add(fair);
  const wings = wingPair(g, [[0.6, 1.2], [5.55, -1.85], [5.55, -2.3], [2.2, -1.4], [0.6, -1.2]], 0.14, 1.0, k.wing, 0.1);
  wingPair(g, [[0.2, -4.9], [2.3, -6.3], [2.3, -6.75], [0.2, -6.55]], 0.08, 1.8, k.tail, 0.12);
  const finM = fin(g, [[-3.4, 0], [-4.6, 0.5], [-6.2, 2.15], [-6.95, 2.15], [-6.9, 0]], 0.14, 0, 2.15, k.tail);

  const spinners: SpinnerFx[] = [];
  const nacMat = std('#e6e9ec', 0.55, 0.3);
  const nacProf: Pt[] = [[-0.7, 0.18], [-0.2, 0.3], [0.8, 0.37], [1.7, 0.36], [2.1, 0.33]];
  for (const x of [1.95, -1.95]) {
    const n = mk(latheZ(nacProf, 32, 20).geo, nacMat);
    n.scale.set(1, 0.88, 1);
    n.position.set(x, 0.78, 0);
    const lip = mk(new THREE.TorusGeometry(0.33, 0.035, 8, 32), k.metal);
    lip.scale.set(1, 0.88, 1);
    lip.position.set(x, 0.78, 2.1);
    const inner = disc(0.31, k.intake);
    inner.position.set(x, 0.78, 1.85);
    const ex = mk(new THREE.ConeGeometry(0.16, 0.45, 20), k.nozzle);
    ex.rotation.x = -Math.PI / 2;
    ex.position.set(x, 0.78, -0.9);
    const pylon = mk(new THREE.BoxGeometry(0.1, 0.36, 1.6), nacMat);
    pylon.position.set(x, 1.12, 0.5);
    g.add(n, lip, inner, ex, pylon);
    const fan = rotor(k, 16, 0.3, 0.07, 'z', 0.09);
    fan.wrap.position.set(x, 0.78, 1.9);
    fan.blur.visible = false;
    g.add(fan.wrap);
    spinners.push({ obj: fan.pivot, axis: 'z', speed: 26 });
    engineCore(g, k, x, 0.78, -0.5, 1.7, 0.24);
  }
  decal(g, fuse, [0, 1.85, 6.35], [-0.5, 0, 0], [1.2, 0.55, 1.3], cachedTex('win-a', () => cockpitWindowTexture('airliner')), { metal: 0.9, rough: 0.08 });

  gear(g, k, 0, 5.7, 0.9, 0.17, { twin: true });
  for (const x of [1.0, -1.0]) gear(g, k, x, -0.55, 0.95, 0.22, { twin: true, width: 0.14 });

  ribs(g, f, -5.5, 6.2, 0.75, yC, sx, sy, k.internal, sweepY);
  const floor = mk(new THREE.BoxGeometry(1.2, 0.04, 10), k.internal, 'internal');
  floor.position.set(0, 1.18, 0);
  g.add(floor);
  for (let i = 0; i < 7; i++) {
    for (const x of [0.38, -0.38]) seat(g, k, -3.5 + i * 0.7, 1.22, x, 0.6);
  }
  const table = mk(new THREE.BoxGeometry(0.6, 0.05, 1.2), k.cargo, 'internal');
  table.position.set(0, 1.55, 2.6);
  g.add(table);
  seat(g, k, 5.6, 1.6, 0.25, 0.75);
  seat(g, k, 5.6, 1.6, -0.25, 0.75);

  decalSides(g, fuse, [0.58, 2.04, 0.3], [4.6, 0.32, 0.6], TEXT('REPUBLIK INDONESIA', '#1b2a4a', 11));
  finMarkings(g, finM, 0, 0.14, [3.55, -6.0], 1.3, 'A-7304', [2.75, -5.95], 1.2, '#1b2a4a');
  decalSides(g, fuse, [0.7, 1.62, -4.3], [0.55, 0.55, 0.6], ROUNDEL());
  void wings;

  const tipY = 1.0 + 5.55 * Math.sin(0.1);
  return result(g, k, {
    nozzles: [
      { pos: [1.95, 0.78, -1.1], r: 0.2, kind: 'fan' },
      { pos: [-1.95, 0.78, -1.1], r: 0.2, kind: 'fan' },
    ],
    spinners,
    navLights: [
      { pos: [5.57, tipY, -2.0], color: '#ff2a2a' },
      { pos: [-5.57, tipY, -2.0], color: '#22ff66' },
      { pos: [0, 1.85, -7.05], color: '#ffffff', blink: 'strobe' },
      { pos: [0, 2.32, 0.5], color: '#ff3030', blink: 'beacon' },
    ],
    hoverHeight: 0.7,
  });
}

/* ------------------------------ Helikopter ------------------------------ */

function buildCaracal(): BuildResult {
  const g = new THREE.Group();
  const yC = 1.55;
  const sx = 0.95;
  const sy = 1.1;
  const prof: Pt[] = [[-7.4, 0.16], [-5, 0.24], [-3.4, 0.32], [-2.6, 0.55], [-1.6, 0.88], [0, 0.98], [2.4, 0.98], [3.4, 0.92], [4.3, 0.75], [5.0, 0.5], [5.45, 0.25], [5.6, 0.02]];
  const k = makeKit('jungle', 13, 2 * Math.PI * 0.9);
  const { geo, f } = latheZ(prof, 48, 96);
  upsweep(geo, -2.6, 0.09, 1.0);
  const fuse = mk(geo, k.fuse);
  fuse.scale.set(sx, sy, 1);
  fuse.position.y = yC;
  g.add(fuse);
  const sweepY = (z: number) => (z < -2.6 ? 0.09 * (-2.6 - z) * sy : 0);

  // Dek mesin
  const deck = mk(new THREE.CapsuleGeometry(0.42, 2.4, 6, 16), k.fuse);
  deck.rotation.x = Math.PI / 2;
  deck.scale.set(1.35, 1, 1);
  deck.position.set(0, 2.55, -0.4);
  g.add(deck);
  for (const x of [0.42, -0.42]) {
    const ex = tubeZ(0.13, 0.15, 0.5, k.nozzle);
    ex.position.set(x, 2.68, -2.0);
    ex.rotation.y = x > 0 ? -0.35 : 0.35;
    g.add(ex);
    engineCore(g, k, x * 0.75, 2.6, -1.6, 0.6, 0.2);
  }
  const mast = mk(new THREE.CylinderGeometry(0.12, 0.15, 0.5, 14), k.metal);
  mast.position.set(0, 3.05, 0.4);
  g.add(mast);
  const main = rotor(k, 5, 6.5, 0.34, 'y', 0.32);
  main.wrap.position.set(0, 3.32, 0.4);
  g.add(main.wrap);

  // Ekor
  const tailBaseY = yC + 0.09 * (7.0 - 2.6) * sy;
  const finM = fin(g, [[-6.3, 0], [-7.0, 1.4], [-7.6, 1.5], [-7.75, 0]], 0.1, 0, tailBaseY - 0.05, k.tail);
  wingPair(g, [[0.12, -5.7], [1.1, -5.9], [1.1, -6.3], [0.12, -6.3]], 0.06, yC + 0.09 * 3.4 * sy, k.tail);
  const tr = rotor(k, 4, 0.95, 0.15, 'x', 0.08);
  tr.wrap.position.set(0.16, 2.85, -7.3);
  g.add(tr.wrap);

  // Sponson, roda, FLIR, probe
  for (const x of [1.05, -1.05]) {
    const sp = mk(new THREE.CapsuleGeometry(0.3, 1.6, 6, 16), k.fuse);
    sp.rotation.x = Math.PI / 2;
    sp.scale.set(1.1, 0.9, 1);
    sp.position.set(x, 0.78, -0.6);
    g.add(sp);
    gear(g, k, x * 1.1, -0.6, 0.62, 0.3, { width: 0.2 });
  }
  gear(g, k, 0, 3.7, 0.65, 0.2, { twin: true });
  const flir = mk(new THREE.SphereGeometry(0.2, 20, 14), k.glass, 'glass');
  flir.position.set(0, 0.62, 4.5);
  const probe = mk(new THREE.CylinderGeometry(0.035, 0.04, 2.6, 8), k.metal);
  probe.rotation.x = Math.PI / 2;
  probe.position.set(0.72, 1.05, 5.3);
  g.add(flir, probe);

  decal(g, fuse, [0, 1.95, 4.75], [-0.55, 0, 0], [1.9, 1.1, 1.6], cachedTex('win-h', () => cockpitWindowTexture('heli')), { metal: 0.9, rough: 0.08 });
  decalSides(g, fuse, [0.95, 1.6, 0.7], [3.4, 1.05, 0.7], cachedTex('heli-cabin', heliCabinTexture));

  ribs(g, f, -6.5, 4.8, 0.7, yC, sx, sy, k.internal, sweepY);
  const floor = mk(new THREE.BoxGeometry(1.4, 0.04, 4.2), k.internal, 'internal');
  floor.position.set(0, 0.85, 0.6);
  g.add(floor);
  for (const x of [0.6, -0.6]) {
    for (let i = 0; i < 4; i++) seat(g, k, -0.7 + i * 0.75, 0.95, x, 0.65);
  }
  const box = mk(new THREE.BoxGeometry(0.6, 0.4, 0.8), k.core, 'internal');
  box.position.set(0, 2.55, 0.4);
  g.add(box);
  seat(g, k, 3.7, 1.15, 0.35, 0.8);
  seat(g, k, 3.7, 1.15, -0.35, 0.8);

  finMarkings(g, finM, 0, 0.1, [tailBaseY + 0.95, -7.15], 0.6, 'H-7206', [tailBaseY + 0.35, -7.05], 1.0, '#e8e2c8');
  decalSides(g, fuse, [0.3, tailBaseY - 0.18, -4.6], [1.6, 0.3, 0.5], TEXT('TNI AU', '#e8e2c8'));
  decalSides(g, fuse, [0.6, 1.3, -1.9], [0.6, 0.6, 0.6], ROUNDEL());

  return result(g, k, {
    nozzles: [],
    spinners: [
      { obj: main.pivot, axis: 'y', speed: 16, blur: main.blur },
      { obj: tr.pivot, axis: 'x', speed: 55, blur: tr.blur },
    ],
    navLights: [
      { pos: [1.4, 0.82, -0.6], color: '#ff2a2a' },
      { pos: [-1.4, 0.82, -0.6], color: '#22ff66' },
      { pos: [0, tailBaseY + 1.5, -7.6], color: '#ffffff', blink: 'strobe' },
      { pos: [0, 2.98, -1.6], color: '#ff3030', blink: 'beacon' },
    ],
    hoverHeight: 2.4,
    rotorWash: true,
  });
}

/* ------------------------------ Registry ------------------------------ */

const builders: Record<string, () => BuildResult> = {
  su30mk2: buildDetailedSu30,
  f16id: buildDetailedF16,
  rafale: buildDetailedRafale,
  su27skm: buildDetailedSu27,
  hawk209: buildDetailedHawk209,
  supertucano: buildDetailedSuperTucano,
  c130j: buildDetailedC130J,
  b737vip: buildB737,
  t50i: buildDetailedT50i,
  kt1b: buildDetailedKT1B,
  caracal: buildCaracal,
};

const cache = new Map<string, BuildResult>();

/** Mengambil (atau merakit lalu menyimpan di cache) model prosedural untuk ID pesawat. */
export function getProceduralAircraft(id: string): BuildResult {
  let r = cache.get(id);
  if (!r) {
    r = (builders[id] ?? buildDetailedF16)();
    r.group.name = `procedural-${id}`;
    cache.set(id, r);
  }
  return r;
}
