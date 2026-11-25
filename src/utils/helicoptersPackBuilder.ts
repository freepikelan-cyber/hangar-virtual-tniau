import * as THREE from 'three';
import { addDecal, buildAirfoilSurface, buildLoftGeometry, lerp, mkMesh, smoothstep } from './aeroGeo';
import { camoTexture, flagTexture, roundelTexture, solidNoiseTexture, textTexture } from './textures';
import type { BuildResult, SpinnerFx } from './proceduralBuilder';

/* =========================================================================
 * Builder 3D Detail Tinggi 4 Helikopter TNI AU (sesuai referensi 6 sudut):
 * 1. Eurocopter AS332 Super Puma (HX-3202 — Putih-Abu + Ujung Ekor Kuning)
 * 2. AgustaWestland AW101 (H-5101 — Heavy-Lift 3 Mesin Loreng Hutan)
 * 3. Airbus H145 (H-1451 — Abu Taktis + Fenestron + Skid)
 * 4. Eurocopter AS365 Dauphin (H-3651 — Hidung Lumba-Lumba + Fenestron + Roda)
 * ========================================================================= */

function loftStations(zMin: number, zMax: number, rings: number, radSegs: number, fn: (z: number, th: number) => [number, number]) {
  const stations = Array.from({ length: rings + 1 }, (_, i) => {
    const z = lerp(zMin, zMax, i / rings);
    return { z, point: (th: number) => fn(z, th) };
  });
  return buildLoftGeometry(stations, radSegs, true, true);
}

/** Membuat patch permukaan 3D yang 100% menyatu (conformal) mengikuti persamaan penampang fuselage helikopter. */
function buildConformalPatch(
  cross: (z: number, th: number) => [number, number],
  z0: number,
  z1: number,
  th0: number,
  th1: number,
  centerY: number,
  outOffset: number,
  nz = 16,
  nt = 24,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const cols = nt + 1;

  for (let iz = 0; iz <= nz; iz++) {
    const vz = iz / nz;
    const z = lerp(z0, z1, vz);
    for (let it = 0; it <= nt; it++) {
      const ut = it / nt;
      const th = lerp(th0, th1, ut);
      const [rx, ry] = cross(z, th);
      const dx = rx;
      const dy = ry - centerY;
      const len = Math.hypot(dx, dy) || 1;
      const x = rx + (dx / len) * outOffset;
      const y = ry + (dy / len) * outOffset;
      positions.push(Number.isFinite(x) ? x : 0, Number.isFinite(y) ? y : centerY, z);
      uvs.push(ut, vz);
    }
  }

  for (let iz = 0; iz < nz; iz++) {
    for (let it = 0; it < nt; it++) {
      const a = iz * cols + it;
      const b = a + 1;
      const c = (iz + 1) * cols + it;
      const d = c + 1;
      indices.push(a, d, b);
      indices.push(a, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Membangun kaca kanopi kokpit & bingkai pilar melengkung yang 100% MENYATU dengan kontur hidung helikopter
 * (tanpa kotak/bola menonjol keluar, persis bentuk kaca helikopter sungguhan).
 */
export function addConformalCanopy(
  g: THREE.Group,
  cross: (z: number, th: number) => [number, number],
  cfg: {
    zBack: number;
    zFront: number;
    thHalf: number;
    centerY: number;
    pillars: number[];
    glassMat: THREE.Material;
    frameMat: THREE.Material;
    chinWindows?: boolean;
  },
) {
  const { zBack, zFront, thHalf, centerY, pillars, glassMat, frameMat, chinWindows } = cfg;
  const borderZ = 0.09;
  const borderTh = 0.055;

  // 1. Bingkai luar gelap menyatu di sekeliling kaca kokpit
  g.add(
    mkMesh(
      buildConformalPatch(cross, zBack - borderZ, zFront + borderZ, -thHalf - borderTh, thHalf + borderTh, centerY, 0.02, 16, 28),
      frameMat,
    ),
  );

  // 2. Kaca kanopi gelap glossy melengkung persis mengikuti kontur hidung
  g.add(
    mkMesh(
      buildConformalPatch(cross, zBack, zFront, -thHalf, thHalf, centerY, 0.032, 18, 30),
      glassMat,
      'glass',
    ),
  );

  // 3. Pilar pembagi kaca melengkung (pilar tengah & pilar A kiri-kanan)
  for (const pTh of pillars) {
    g.add(
      mkMesh(
        buildConformalPatch(cross, zBack - borderZ, zFront + borderZ, pTh - 0.028, pTh + 0.028, centerY, 0.042, 12, 3),
        frameMat,
      ),
    );
  }

  // 4. Jendela observasi dagu bawah (chin windows) khas helikopter modern
  if (chinWindows) {
    const cz0 = lerp(zBack, zFront, 0.42);
    const cz1 = zFront + 0.14;
    for (const s of [1, -1]) {
      const a0 = s > 0 ? thHalf + 0.09 : -(thHalf + 0.28);
      const a1 = s > 0 ? thHalf + 0.28 : -(thHalf + 0.09);
      g.add(mkMesh(buildConformalPatch(cross, cz0 - 0.04, cz1 + 0.04, a0 - 0.02, a1 + 0.02, centerY, 0.02, 8, 8), frameMat));
      g.add(mkMesh(buildConformalPatch(cross, cz0, cz1, a0, a1, centerY, 0.032, 8, 8), glassMat, 'glass'));
    }
  }
}

function makeHeliGlass() {
  return new THREE.MeshPhysicalMaterial({
    color: '#0a1826',
    roughness: 0.05,
    metalness: 0.34,
    transparent: true,
    opacity: 0.86,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    envMapIntensity: 1.8,
  });
}

function makeCommonHeliMats() {
  return {
    glass: makeHeliGlass(),
    frame: new THREE.MeshStandardMaterial({ color: '#171c22', roughness: 0.42, metalness: 0.55 }),
    darkMetal: new THREE.MeshStandardMaterial({ color: '#222830', roughness: 0.38, metalness: 0.78 }),
    metal: new THREE.MeshStandardMaterial({ color: '#9ca7b4', roughness: 0.28, metalness: 0.86 }),
    blade: new THREE.MeshStandardMaterial({ color: '#1b2026', roughness: 0.4, metalness: 0.38 }),
    yellowTip: new THREE.MeshStandardMaterial({ color: '#f5be18', roughness: 0.32, metalness: 0.2 }),
    tire: new THREE.MeshStandardMaterial({ color: '#14171c', roughness: 0.9, metalness: 0.05 }),
    glow: new THREE.MeshStandardMaterial({ color: '#241208', roughness: 0.4, metalness: 0.5 }),
  };
}

/** Menambahkan jendela samping kabin berbingkai hitam realistis di kedua sisi helikopter. */
function addSideWindows(
  g: THREE.Group,
  xPos: number,
  yPos: number,
  zPositions: number[],
  winW: number,
  winH: number,
  glassMat: THREE.Material,
  frameMat: THREE.Material,
) {
  for (const s of [1, -1]) {
    for (const wz of zPositions) {
      const frame = mkMesh(new THREE.BoxGeometry(0.06, winH + 0.09, winW + 0.09), frameMat);
      frame.position.set(s * xPos, yPos, wz);
      const pane = mkMesh(new THREE.BoxGeometry(0.08, winH, winW), glassMat, 'glass');
      pane.position.set(s * (xPos + 0.01), yPos, wz);
      g.add(frame, pane);
    }
  }
}

/** Membuat rotor utama 4/5 bilah + hub kepala rotor + disc blur. */
function addMainRotor(
  g: THREE.Group,
  yHub: number,
  zHub: number,
  blades: number,
  radius: number,
  chord: number,
  mats: ReturnType<typeof makeCommonHeliMats>,
  domeColor = '#2a313a',
): SpinnerFx {
  const mast = mkMesh(new THREE.CylinderGeometry(0.11, 0.14, 0.62, 16), mats.darkMetal);
  mast.position.set(0, yHub - 0.32, zHub);
  g.add(mast);

  const pivot = new THREE.Group();
  pivot.position.set(0, yHub, zHub);

  const dome = mkMesh(new THREE.SphereGeometry(0.32, 18, 12), new THREE.MeshStandardMaterial({ color: domeColor, roughness: 0.45, metalness: 0.35 }));
  dome.scale.set(1, 0.48, 1);
  dome.position.y = 0.06;
  pivot.add(dome);

  for (let i = 0; i < blades; i++) {
    const arm = new THREE.Group();
    arm.rotation.y = (i * Math.PI * 2) / blades;
    const grip = mkMesh(new THREE.BoxGeometry(0.45, 0.08, 0.14), mats.darkMetal);
    grip.position.set(0.34, 0.02, 0);
    const bLen = radius - 0.52;
    const blade = mkMesh(new THREE.BoxGeometry(bLen, 0.03, chord), mats.blade);
    blade.position.set(0.52 + bLen / 2, 0.02, 0);
    blade.rotation.x = 0.08;
    const tip = mkMesh(new THREE.BoxGeometry(0.42, 0.034, chord * 0.96), mats.yellowTip);
    tip.position.set(radius - 0.21, 0.02, 0);
    tip.rotation.x = 0.08;
    arm.add(grip, blade, tip);
    pivot.add(arm);
  }

  const blur = new THREE.Mesh(
    new THREE.RingGeometry(0.45, radius, 64),
    new THREE.MeshBasicMaterial({ color: '#cfd8e3', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
  );
  blur.rotation.x = -Math.PI / 2;
  blur.position.y = 0.03;
  blur.userData.role = 'blur';
  blur.visible = false;
  pivot.add(blur);
  g.add(pivot);

  return { obj: pivot, axis: 'y', speed: 16, blur };
}

/** Roda tiga titik retractable helikopter medium/berat. */
function addHeliTricycleGear(
  g: THREE.Group,
  nz: number,
  mz: number,
  mx: number,
  topY: number,
  rNose: number,
  rMain: number,
  mats: ReturnType<typeof makeCommonHeliMats>,
) {
  const gearGrp = new THREE.Group();
  gearGrp.name = 'landing-gear';
  g.add(gearGrp);

  const nLen = Math.max(0.18, topY - rNose);
  const nStrut = mkMesh(new THREE.CylinderGeometry(0.055, 0.05, nLen, 10), mats.metal);
  nStrut.position.set(0, rNose + nLen / 2, nz);
  gearGrp.add(nStrut);
  for (const ox of [-rNose * 0.55, rNose * 0.55]) {
    const t = mkMesh(new THREE.CylinderGeometry(rNose, rNose, 0.11, 20), mats.tire);
    t.rotation.z = Math.PI / 2;
    t.position.set(ox, rNose, nz);
    const h = mkMesh(new THREE.CylinderGeometry(rNose * 0.52, rNose * 0.52, 0.12, 14), mats.metal);
    h.rotation.z = Math.PI / 2;
    h.position.copy(t.position);
    gearGrp.add(t, h);
  }

  const mLen = Math.max(0.18, topY - rMain);
  for (const s of [1, -1]) {
    const ms = mkMesh(new THREE.CylinderGeometry(0.06, 0.055, mLen, 10), mats.metal);
    ms.position.set(s * mx, rMain + mLen / 2, mz);
    gearGrp.add(ms);
    for (const ox of [-rMain * 0.55, rMain * 0.55]) {
      const t = mkMesh(new THREE.CylinderGeometry(rMain, rMain, 0.13, 20), mats.tire);
      t.rotation.z = Math.PI / 2;
      t.position.set(s * mx + ox, rMain, mz);
      const h = mkMesh(new THREE.CylinderGeometry(rMain * 0.52, rMain * 0.52, 0.14, 14), mats.metal);
      h.rotation.z = Math.PI / 2;
      h.position.copy(t.position);
      gearGrp.add(t, h);
    }
  }
}

/** Tekstur 2-warna Super Puma (Putih bersih atas + Abu-abu elegan bawah). */
function superPumaFuseTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#edf1f5';
  ctx.fillRect(0, 0, 512, 512);
  // Bagian bawah badan (u ~ 0.30..0.70) abu-abu medium-terang sesuai referensi HX-3202
  ctx.fillStyle = '#9aa4ae';
  ctx.fillRect(512 * 0.3, 0, 512 * 0.4, 512);
  // Garis pemisah tipis abu gelap
  ctx.fillStyle = '#475569';
  ctx.fillRect(512 * 0.295, 0, 6, 512);
  ctx.fillRect(512 * 0.7, 0, 6, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

/* =========================================================================
 * 1. EUROCOPTER AS332 SUPER PUMA (HX-3202 — Putih-Abu + Ujung Ekor Kuning)
 * ========================================================================= */
export function buildSuperPuma(): BuildResult {
  const g = new THREE.Group();
  const mats = makeCommonHeliMats();
  const yC = 1.56;

  const fuseMat = new THREE.MeshStandardMaterial({ map: superPumaFuseTexture(), roughness: 0.34, metalness: 0.22 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: '#edf1f5', roughness: 0.34, metalness: 0.2 });
  const greyMat = new THREE.MeshStandardMaterial({ color: '#9aa4ae', roughness: 0.42, metalness: 0.24 });
  const yellowMat = new THREE.MeshStandardMaterial({ color: '#f5be18', roughness: 0.34, metalness: 0.2 });

  // Fuselage lofted Super Puma (panjang 18,7 m -> 12.6 unit)
  const cross = (z: number, th: number): [number, number] => {
    const s = Math.sin(th);
    const c = Math.cos(th);
    let rx = 1.08;
    let ryT = 0.96;
    let ryB = 0.82;
    let ys = 0;
    if (z > 2.3) {
      const u = (z - 2.3) / 2.45;
      const t = Math.pow(Math.max(0, 1 - Math.pow(u, 1.55)), 0.56);
      rx = 1.08 * t + 0.08;
      ryT = 0.96 * t + 0.08;
      ryB = 0.82 * t + 0.08;
      ys = -0.32 * Math.pow(u, 1.2);
    } else if (z < -0.7) {
      const u = (-0.7 - z) / 1.6;
      rx = lerp(1.08, 0.42, smoothstep(0, 1, u));
      ryT = lerp(0.96, 0.48, smoothstep(0, 1, u));
      ryB = lerp(0.82, 0.28, smoothstep(0, 1, u));
      ys = lerp(0, 0.34, u);
    }
    const px = Math.sign(s) * Math.pow(Math.abs(s), 0.78) * rx;
    const py = Math.sign(c) * Math.pow(Math.abs(c), 0.82) * (c >= 0 ? ryT : ryB);
    return [px, yC + ys + py];
  };
  const fuseMesh = mkMesh(loftStations(-2.3, 4.75, 48, 36, cross), fuseMat);
  g.add(fuseMesh);

  // Hidung radome hitam khas Super Puma + Kanopi Conformal menyatu mulus dengan hidung!
  const nose = mkMesh(new THREE.SphereGeometry(0.46, 20, 14), mats.frame);
  nose.scale.set(1.02, 0.82, 1.25);
  nose.position.set(0, yC - 0.34, 4.62);
  g.add(nose);

  addConformalCanopy(g, cross, {
    zBack: 2.38,
    zFront: 3.92,
    thHalf: Math.PI * 0.36,
    centerY: yC - 0.1,
    pillars: [0, -Math.PI * 0.24, Math.PI * 0.24],
    glassMat: mats.glass,
    frameMat: mats.frame,
    chinWindows: true,
  });

  // 4 Jendela kabin samping berbingkai hitam di kiri & kanan
  addSideWindows(g, 1.06, yC + 0.12, [2.15, 1.15, 0.15, -0.82], 0.64, 0.52, mats.glass, mats.frame);

  // Sponson roda samping khas Super Puma (abu-abu)
  for (const s of [1, -1]) {
    const sp = mkMesh(new THREE.CapsuleGeometry(0.36, 2.3, 8, 16), greyMat);
    sp.rotation.x = Math.PI / 2;
    sp.scale.set(0.95, 1, 0.82);
    sp.position.set(s * 1.26, yC - 0.54, -0.35);
    g.add(sp);
  }

  // Rumah mesin kembar Makila 1A1 di atas kabin + 2 knalpot samping
  const doghouse = mkMesh(new THREE.CapsuleGeometry(0.56, 2.65, 10, 18), whiteMat);
  doghouse.rotation.x = Math.PI / 2;
  doghouse.scale.set(1.15, 0.88, 1);
  doghouse.position.set(0, yC + 1.08, 0.55);
  g.add(doghouse);
  for (const s of [1, -1]) {
    const ex = mkMesh(new THREE.CylinderGeometry(0.18, 0.22, 0.5, 14), mats.darkMetal);
    ex.rotation.z = s * Math.PI / 2;
    ex.position.set(s * 0.68, yC + 1.12, -0.2);
    g.add(ex);
  }

  // Tail boom putih panjang ke belakang
  const boomGeo = loftStations(-7.15, -2.1, 20, 20, (z, th) => {
    const u = (-2.1 - z) / 5.05;
    const rx = lerp(0.42, 0.18, u);
    const ry = lerp(0.46, 0.22, u);
    return [Math.sin(th) * rx, yC + 0.34 + Math.cos(th) * ry + u * 0.16];
  });
  const boomMesh = mkMesh(boomGeo, whiteMat);
  g.add(boomMesh);

  // Sirip ekor tegak dengan ujung KUNING cerah (persis HX-3202!)
  const finMesh = mkMesh(
    buildAirfoilSurface(
      [
        { spanPos: yC + 0.35, leZ: -6.05, teZ: -7.25, offset: 0, thick: 0.16 },
        { spanPos: yC + 1.95, leZ: -6.95, teZ: -7.75, offset: 0, thick: 0.11 },
      ],
      'vertical',
      1,
      0,
    ),
    whiteMat,
  );
  g.add(finMesh);
  const finTip = mkMesh(new THREE.BoxGeometry(0.18, 0.36, 0.86), yellowMat);
  finTip.position.set(0, yC + 1.95, -7.35);
  g.add(finTip);

  // Stabilizer horizontal asimetris di sisi kanan ekor
  const stab = mkMesh(new THREE.BoxGeometry(1.45, 0.08, 0.44), whiteMat);
  stab.position.set(0.72, yC + 0.58, -6.55);
  g.add(stab);

  // Rotor utama 4 bilah + rotor ekor 5 bilah
  const spinners: SpinnerFx[] = [addMainRotor(g, yC + 1.95, 0.72, 4, 5.75, 0.24, mats)];
  const tailPivot = new THREE.Group();
  tailPivot.position.set(-0.28, yC + 1.72, -7.35);
  for (let i = 0; i < 5; i++) {
    const b = mkMesh(new THREE.BoxGeometry(0.03, 0.92, 0.1), mats.blade);
    const a = (i * Math.PI * 2) / 5;
    b.position.set(0, Math.cos(a) * 0.46, Math.sin(a) * 0.46);
    b.rotation.x = a;
    tailPivot.add(b);
  }
  g.add(tailPivot);
  spinners.push({ obj: tailPivot, axis: 'x', speed: 44 });

  addHeliTricycleGear(g, 3.65, -0.35, 1.32, yC - 0.6, 0.2, 0.28, mats);

  // Marking resmi TNI AU: HX-3202, 02, Roundel, Bendera Merah Putih
  const flag = flagTexture();
  const rnd = roundelTexture();
  const codeTex = textTexture('HX-3202', { color: '#141a21', aspect: 4.0 });
  const numTex = textTexture('02', { color: '#141a21', aspect: 1.5 });
  for (const s of [1, -1]) {
    const rot: [number, number, number] = [0, (s * Math.PI) / 2, 0];
    addDecal(g, boomMesh, [s * 0.34, yC + 0.44, -4.45], rot, [1.65, 0.36, 0.26], codeTex);
    addDecal(g, fuseMesh, [s * 1.06, yC - 0.32, 0.75], rot, [0.58, 0.38, 0.26], numTex);
    addDecal(g, fuseMesh, [s * 0.85, yC + 0.15, -1.65], rot, [0.58, 0.58, 0.26], rnd);
    addDecal(g, doghouse, [s * 0.62, yC + 1.15, 0.95], rot, [0.68, 0.42, 0.24], flag);
  }

  return {
    group: g,
    nozzles: [],
    spinners,
    navLights: [
      { pos: [1.35, yC - 0.4, -0.35], color: '#ff2a2a' },
      { pos: [-1.35, yC - 0.4, -0.35], color: '#22ff66' },
      { pos: [0, yC + 2.15, -7.45], color: '#ffffff', blink: 'strobe' },
    ],
    glowMats: [mats.glow],
    hoverHeight: 1.0,
    rotorWash: true,
  };
}

/* =========================================================================
 * 2. AGUSTAWESTLAND AW101 (H-5101 — Heavy-Lift 3 Mesin Loreng Hutan)
 * ========================================================================= */
export function buildAW101(): BuildResult {
  const g = new THREE.Group();
  const mats = makeCommonHeliMats();
  const yC = 1.66;

  const camo = camoTexture('#486032', [{ c: '#6e4b30', n: 18, r: 64 }, { c: '#232c20', n: 12, r: 44 }], 5101, { noise: 0.035 });
  const skinMat = new THREE.MeshStandardMaterial({ map: camo, roughness: 0.56, metalness: 0.26 });

  // Badan besar boxy-aerodinamis AW101 (panjang 22,8 m -> 13.4 unit)
  const cross = (z: number, th: number): [number, number] => {
    const s = Math.sin(th);
    const c = Math.cos(th);
    let rx = 1.24;
    let ryT = 1.14;
    let ryB = 0.94;
    let ys = 0;
    if (z > 2.45) {
      const u = (z - 2.45) / 2.5;
      const t = Math.pow(Math.max(0, 1 - Math.pow(u, 1.55)), 0.55);
      rx = 1.24 * t + 0.1;
      ryT = 1.14 * t + 0.1;
      ryB = 0.94 * t + 0.1;
      ys = -0.36 * Math.pow(u, 1.25);
    } else if (z < -0.6) {
      const u = (-0.6 - z) / 1.9;
      rx = lerp(1.24, 0.48, smoothstep(0, 1, u));
      ryT = lerp(1.14, 0.56, smoothstep(0, 1, u));
      ryB = lerp(0.94, 0.3, smoothstep(0, 1, u));
      ys = lerp(0, 0.46, u);
    }
    const px = Math.sign(s) * Math.pow(Math.abs(s), 0.72) * rx;
    const py = Math.sign(c) * Math.pow(Math.abs(c), 0.76) * (c >= 0 ? ryT : ryB);
    return [px, yC + ys + py];
  };
  const fuseMesh = mkMesh(loftStations(-2.5, 4.95, 50, 36, cross), skinMat);
  g.add(fuseMesh);

  // Kanopi kokpit 4-panel besar Conformal menyatu mulus dengan hidung AW101!
  addConformalCanopy(g, cross, {
    zBack: 2.55,
    zFront: 4.18,
    thHalf: Math.PI * 0.38,
    centerY: yC - 0.12,
    pillars: [0, -Math.PI * 0.22, Math.PI * 0.22],
    glassMat: mats.glass,
    frameMat: mats.frame,
    chinWindows: true,
  });

  addSideWindows(g, 1.23, yC + 0.08, [1.85, 0.92, -0.02, -0.95], 0.62, 0.68, mats.glass, mats.frame);

  // Rumah 3 mesin Rolls-Royce RTM322 lebar di atas kabin + knalpot
  const doghouse = mkMesh(new THREE.CapsuleGeometry(0.68, 3.1, 10, 18), skinMat);
  doghouse.rotation.x = Math.PI / 2;
  doghouse.scale.set(1.22, 0.82, 1);
  doghouse.position.set(0, yC + 1.26, 0.45);
  g.add(doghouse);
  for (const s of [1, -1]) {
    const sp = mkMesh(new THREE.CapsuleGeometry(0.36, 1.9, 8, 14), skinMat);
    sp.rotation.x = Math.PI / 2;
    sp.position.set(s * 1.36, yC - 0.58, -0.2);
    const ex = mkMesh(new THREE.CylinderGeometry(0.2, 0.24, 0.55, 14), mats.darkMetal);
    ex.rotation.z = s * Math.PI / 2;
    ex.position.set(s * 0.82, yC + 1.25, -0.25);
    g.add(sp, ex);
  }

  // Tail boom kokoh + sirip ekor miring ke atas
  const boomGeo = loftStations(-7.45, -2.3, 20, 20, (z, th) => {
    const u = (-2.3 - z) / 5.15;
    const rx = lerp(0.48, 0.22, u);
    const ry = lerp(0.54, 0.26, u);
    return [Math.sin(th) * rx, yC + 0.46 + Math.cos(th) * ry + u * 0.25];
  });
  const boomMesh = mkMesh(boomGeo, skinMat);
  g.add(boomMesh);

  const finMesh = mkMesh(
    buildAirfoilSurface(
      [
        { spanPos: yC + 0.48, leZ: -6.15, teZ: -7.5, offset: 0, thick: 0.18 },
        { spanPos: yC + 2.25, leZ: -7.15, teZ: -8.05, offset: 0, thick: 0.12 },
      ],
      'vertical',
      1,
      0,
    ),
    skinMat,
  );
  g.add(finMesh);

  const stab = mkMesh(new THREE.BoxGeometry(1.55, 0.09, 0.5), skinMat);
  stab.position.set(0.8, yC + 0.82, -6.9);
  g.add(stab);

  // Rotor utama 5 bilah BERP + rotor ekor 4 bilah
  const spinners: SpinnerFx[] = [addMainRotor(g, yC + 2.15, 0.65, 5, 6.25, 0.26, mats)];
  const tailPivot = new THREE.Group();
  tailPivot.position.set(-0.32, yC + 1.98, -7.65);
  for (let i = 0; i < 4; i++) {
    const b = mkMesh(new THREE.BoxGeometry(0.03, 1.05, 0.11), mats.blade);
    const a = (i * Math.PI * 2) / 4;
    b.position.set(0, Math.cos(a) * 0.52, Math.sin(a) * 0.52);
    b.rotation.x = a;
    tailPivot.add(b);
  }
  g.add(tailPivot);
  spinners.push({ obj: tailPivot, axis: 'x', speed: 42 });

  addHeliTricycleGear(g, 3.85, -0.2, 1.4, yC - 0.68, 0.22, 0.3, mats);

  const flag = flagTexture();
  const rnd = roundelTexture();
  const codeTex = textTexture('H-5101', { color: '#f1f5f9', aspect: 4.0 });
  for (const s of [1, -1]) {
    const rot: [number, number, number] = [0, (s * Math.PI) / 2, 0];
    addDecal(g, boomMesh, [s * 0.38, yC + 0.58, -4.6], rot, [1.55, 0.36, 0.26], codeTex);
    addDecal(g, fuseMesh, [s * 0.92, yC + 0.28, -1.85], rot, [0.64, 0.64, 0.26], rnd);
    addDecal(g, finMesh, [s * 0.08, yC + 1.55, -7.45], rot, [0.68, 0.44, 0.12], flag);
  }

  return {
    group: g,
    nozzles: [],
    spinners,
    navLights: [
      { pos: [1.45, yC - 0.45, -0.2], color: '#ff2a2a' },
      { pos: [-1.45, yC - 0.45, -0.2], color: '#22ff66' },
      { pos: [0, yC + 2.35, -7.8], color: '#ffffff', blink: 'strobe' },
    ],
    glowMats: [mats.glow],
    hoverHeight: 1.0,
    rotorWash: true,
  };
}

/* =========================================================================
 * 3. AIRBUS H145 (H-1451 — Abu-Abu Taktis + Fenestron + Skid Hitam)
 * ========================================================================= */
export function buildH145(): BuildResult {
  const g = new THREE.Group();
  const mats = makeCommonHeliMats();
  const yC = 1.48;

  const skinMat = new THREE.MeshStandardMaterial({
    map: solidNoiseTexture('#b8c1ca', 1451, 0.02),
    roughness: 0.32,
    metalness: 0.24,
  });

  // Kabin ramping & modern H145 (clamshell rear door + high tail boom)
  const cross = (z: number, th: number): [number, number] => {
    const s = Math.sin(th);
    const c = Math.cos(th);
    let rx = 0.92;
    let ryT = 0.86;
    let ryB = 0.72;
    let ys = 0;
    if (z > 1.75) {
      const u = (z - 1.75) / 2.1;
      const t = Math.pow(Math.max(0, 1 - Math.pow(u, 1.65)), 0.56);
      rx = 0.92 * t + 0.06;
      ryT = 0.86 * t + 0.06;
      ryB = 0.72 * t + 0.06;
      ys = -0.24 * u;
    } else if (z < -0.5) {
      const u = (-0.5 - z) / 1.35;
      rx = lerp(0.92, 0.34, smoothstep(0, 1, u));
      ryT = lerp(0.86, 0.38, smoothstep(0, 1, u));
      ryB = lerp(0.72, 0.2, smoothstep(0, 1, u));
      ys = lerp(0, 0.42, u);
    }
    const px = Math.sign(s) * Math.pow(Math.abs(s), 0.78) * rx;
    const py = Math.sign(c) * Math.pow(Math.abs(c), 0.82) * (c >= 0 ? ryT : ryB);
    return [px, yC + ys + py];
  };
  const fuseMesh = mkMesh(loftStations(-1.85, 3.85, 44, 34, cross), skinMat);
  g.add(fuseMesh);

  // Kanopi panoramik luas H145 Conformal menyatu 100% mulus dengan hidung!
  addConformalCanopy(g, cross, {
    zBack: 1.82,
    zFront: 3.42,
    thHalf: Math.PI * 0.42,
    centerY: yC - 0.1,
    pillars: [0, -Math.PI * 0.28, Math.PI * 0.28],
    glassMat: mats.glass,
    frameMat: mats.frame,
    chinWindows: true,
  });

  addSideWindows(g, 0.91, yC + 0.14, [1.62, 0.72, -0.18], 0.62, 0.5, mats.glass, mats.frame);

  // Rumah mesin kembar Safran Arriel 2E ramping di atas kabin
  const cowling = mkMesh(new THREE.CapsuleGeometry(0.44, 1.95, 8, 16), skinMat);
  cowling.rotation.x = Math.PI / 2;
  cowling.scale.set(1.1, 0.82, 1);
  cowling.position.set(0, yC + 0.95, 0.22);
  g.add(cowling);

  // Tail boom tinggi ramping ke belakang + Fenestron tertutup khas H145!
  const boomGeo = loftStations(-5.75, -1.5, 18, 18, (z, th) => {
    const u = (-1.5 - z) / 4.25;
    const rx = lerp(0.28, 0.15, u);
    const ry = lerp(0.32, 0.18, u);
    return [Math.sin(th) * rx, yC + 0.48 + Math.cos(th) * ry];
  });
  const boomMesh = mkMesh(boomGeo, skinMat);
  g.add(boomMesh);

  // Fenestron shroud berlubang + sirip tegak atas-bawah + kipas 10 bilah
  const shroud = mkMesh(new THREE.TorusGeometry(0.58, 0.14, 14, 28), skinMat);
  shroud.rotation.y = Math.PI / 2;
  shroud.position.set(0, yC + 0.58, -6.12);
  g.add(shroud);

  const finTop = mkMesh(
    buildAirfoilSurface(
      [
        { spanPos: yC + 1.05, leZ: -5.65, teZ: -6.72, offset: 0, thick: 0.14 },
        { spanPos: yC + 2.25, leZ: -6.15, teZ: -6.95, offset: 0, thick: 0.09 },
      ],
      'vertical',
      1,
      0,
    ),
    skinMat,
  );
  const finBot = mkMesh(new THREE.BoxGeometry(0.12, 0.45, 0.72), skinMat);
  finBot.position.set(0, yC - 0.18, -6.12);
  g.add(finTop, finBot);

  // Stabilizer horizontal dengan endplate di tengah tail boom
  const stab = mkMesh(new THREE.BoxGeometry(2.05, 0.07, 0.42), skinMat);
  stab.position.set(0, yC + 0.48, -4.15);
  g.add(stab);
  for (const s of [1, -1]) {
    const ep = mkMesh(new THREE.BoxGeometry(0.06, 0.42, 0.48), skinMat);
    ep.position.set(s * 1.04, yC + 0.52, -4.18);
    g.add(ep);
  }

  // Rotor utama 5 bilah + kipas Fenestron 10 bilah
  const spinners: SpinnerFx[] = [addMainRotor(g, yC + 1.72, 0.55, 5, 4.95, 0.2, mats)];
  const fenPivot = new THREE.Group();
  fenPivot.position.set(0, yC + 0.58, -6.12);
  for (let i = 0; i < 10; i++) {
    const b = mkMesh(new THREE.BoxGeometry(0.04, 0.48, 0.065), mats.blade);
    const a = (i * Math.PI * 2) / 10;
    b.position.set(0, Math.cos(a) * 0.24, Math.sin(a) * 0.24);
    b.rotation.x = a;
    fenPivot.add(b);
  }
  g.add(fenPivot);
  spinners.push({ obj: fenPivot, axis: 'x', speed: 62 });

  // Kaki Skid tubular hitam khas H145
  for (const s of [1, -1]) {
    const tube = mkMesh(new THREE.CylinderGeometry(0.055, 0.055, 4.1, 10), mats.frame);
    tube.rotation.x = Math.PI / 2;
    tube.position.set(s * 1.05, 0.14, 0.95);
    const legF = mkMesh(new THREE.CylinderGeometry(0.045, 0.045, 1.05, 8), mats.frame);
    legF.position.set(s * 0.85, 0.56, 2.05);
    legF.rotation.z = s * 0.34;
    const legB = mkMesh(new THREE.CylinderGeometry(0.045, 0.045, 1.05, 8), mats.frame);
    legB.position.set(s * 0.85, 0.56, -0.15);
    legB.rotation.z = s * 0.34;
    g.add(tube, legF, legB);
  }

  // Marking resmi TNI AU: TNI ANGKATAN UDARA, H-1451, Bendera Merah Putih
  const flag = flagTexture();
  const txt = textTexture('TNI ANGKATAN UDARA', { color: '#111827', aspect: 9.5 });
  const codeTex = textTexture('H-1451', { color: '#111827', aspect: 4.0 });
  for (const s of [1, -1]) {
    const rot: [number, number, number] = [0, (s * Math.PI) / 2, 0];
    addDecal(g, fuseMesh, [s * 0.91, yC - 0.36, 0.95], rot, [2.15, 0.26, 0.26], txt);
    addDecal(g, boomMesh, [s * 0.24, yC + 0.5, -3.55], rot, [1.45, 0.34, 0.22], codeTex);
    addDecal(g, finTop, [s * 0.07, yC + 1.68, -6.38], rot, [0.64, 0.4, 0.1], flag);
  }

  return {
    group: g,
    nozzles: [],
    spinners,
    navLights: [
      { pos: [1.06, yC + 0.55, -4.18], color: '#ff2a2a' },
      { pos: [-1.06, yC + 0.55, -4.18], color: '#22ff66' },
      { pos: [0, yC + 2.3, -6.65], color: '#ffffff', blink: 'strobe' },
    ],
    glowMats: [mats.glow],
    hoverHeight: 0.9,
    rotorWash: true,
  };
}

/* =========================================================================
 * 4. EUROCOPTER AS365 DAUPHIN (H-3651 — Hidung Lumba-Lumba + Fenestron + Roda)
 * ========================================================================= */
export function buildAS365(): BuildResult {
  const g = new THREE.Group();
  const mats = makeCommonHeliMats();
  const yC = 1.42;

  const skinMat = new THREE.MeshStandardMaterial({
    map: solidNoiseTexture('#ccd4dc', 3651, 0.02),
    roughness: 0.28,
    metalness: 0.24,
  });

  // Bodi sangat ramping berhidung panjang lumba-lumba khas AS365 Dauphin!
  const cross = (z: number, th: number): [number, number] => {
    const s = Math.sin(th);
    const c = Math.cos(th);
    let rx = 0.92;
    let ryT = 0.84;
    let ryB = 0.68;
    let ys = 0;
    if (z > 1.7) {
      const u = (z - 1.7) / 2.95;
      const t = Math.pow(Math.max(0, 1 - Math.pow(u, 1.42)), 0.58);
      rx = 0.92 * t + 0.05;
      ryT = 0.84 * t + 0.05;
      ryB = 0.68 * t + 0.05;
      ys = -0.34 * Math.pow(u, 1.15);
    } else if (z < -0.6) {
      const u = (-0.6 - z) / 1.5;
      rx = lerp(0.92, 0.36, smoothstep(0, 1, u));
      ryT = lerp(0.84, 0.42, smoothstep(0, 1, u));
      ryB = lerp(0.68, 0.26, smoothstep(0, 1, u));
      ys = lerp(0, 0.14, u);
    }
    const px = Math.sign(s) * Math.pow(Math.abs(s), 0.8) * rx;
    const py = Math.sign(c) * Math.pow(Math.abs(c), 0.84) * (c >= 0 ? ryT : ryB);
    return [px, yC + ys + py];
  };
  const fuseMesh = mkMesh(loftStations(-2.1, 4.65, 48, 34, cross), skinMat);
  g.add(fuseMesh);

  // Kanopi ramping aerodinamis Dauphin Conformal menyatu mulus ke hidung lancip!
  addConformalCanopy(g, cross, {
    zBack: 1.85,
    zFront: 3.55,
    thHalf: Math.PI * 0.38,
    centerY: yC - 0.12,
    pillars: [0, -Math.PI * 0.25, Math.PI * 0.25],
    glassMat: mats.glass,
    frameMat: mats.frame,
    chinWindows: true,
  });

  addSideWindows(g, 0.91, yC + 0.12, [1.85, 1.02, 0.2, -0.58], 0.56, 0.48, mats.glass, mats.frame);

  // Rumah mesin kembar Arriel ramping aerodinamis
  const cowling = mkMesh(new THREE.CapsuleGeometry(0.46, 2.35, 8, 16), skinMat);
  cowling.rotation.x = Math.PI / 2;
  cowling.scale.set(1.06, 0.78, 1);
  cowling.position.set(0, yC + 0.92, 0.35);
  g.add(cowling);

  // Tail boom rendah-lebar menyatu mulus ke Fenestron khas Dauphin!
  const boomGeo = loftStations(-6.05, -1.9, 20, 20, (z, th) => {
    const u = (-1.9 - z) / 4.15;
    const rx = lerp(0.36, 0.18, u);
    const ry = lerp(0.42, 0.26, u);
    return [Math.sin(th) * rx, yC + 0.14 + Math.cos(th) * ry + u * 0.14];
  });
  const boomMesh = mkMesh(boomGeo, skinMat);
  g.add(boomMesh);

  const shroud = mkMesh(new THREE.TorusGeometry(0.6, 0.15, 14, 28), skinMat);
  shroud.rotation.y = Math.PI / 2;
  shroud.position.set(0, yC + 0.42, -6.38);
  g.add(shroud);

  const finTop = mkMesh(
    buildAirfoilSurface(
      [
        { spanPos: yC + 0.92, leZ: -5.85, teZ: -7.02, offset: 0, thick: 0.14 },
        { spanPos: yC + 2.22, leZ: -6.42, teZ: -7.25, offset: 0, thick: 0.09 },
      ],
      'vertical',
      1,
      0,
    ),
    skinMat,
  );
  g.add(finTop);

  const stab = mkMesh(new THREE.BoxGeometry(2.15, 0.07, 0.45), skinMat);
  stab.position.set(0, yC + 0.26, -4.35);
  g.add(stab);
  for (const s of [1, -1]) {
    const ep = mkMesh(new THREE.BoxGeometry(0.06, 0.44, 0.5), skinMat);
    ep.position.set(s * 1.08, yC + 0.28, -4.38);
    g.add(ep);
  }

  // Rotor utama 4 bilah Starflex + Fenestron 10 bilah
  const spinners: SpinnerFx[] = [addMainRotor(g, yC + 1.68, 0.65, 4, 5.2, 0.21, mats)];
  const fenPivot = new THREE.Group();
  fenPivot.position.set(0, yC + 0.42, -6.38);
  for (let i = 0; i < 10; i++) {
    const b = mkMesh(new THREE.BoxGeometry(0.04, 0.5, 0.065), mats.blade);
    const a = (i * Math.PI * 2) / 10;
    b.position.set(0, Math.cos(a) * 0.25, Math.sin(a) * 0.25);
    b.rotation.x = a;
    fenPivot.add(b);
  }
  g.add(fenPivot);
  spinners.push({ obj: fenPivot, axis: 'x', speed: 62 });

  // Roda tiga titik retractable khas Dauphin (BUKAN skid!)
  addHeliTricycleGear(g, 3.35, -0.35, 0.98, yC - 0.52, 0.16, 0.22, mats);

  const flag = flagTexture();
  const txt = textTexture('TNI ANGKATAN UDARA', { color: '#111827', aspect: 9.5 });
  const codeTex = textTexture('H-3651', { color: '#111827', aspect: 4.0 });
  for (const s of [1, -1]) {
    const rot: [number, number, number] = [0, (s * Math.PI) / 2, 0];
    addDecal(g, fuseMesh, [s * 0.91, yC - 0.34, 0.85], rot, [2.15, 0.26, 0.26], txt);
    addDecal(g, boomMesh, [s * 0.28, yC + 0.26, -3.95], rot, [1.5, 0.34, 0.24], codeTex);
    addDecal(g, finTop, [s * 0.07, yC + 1.62, -6.68], rot, [0.64, 0.4, 0.1], flag);
  }

  return {
    group: g,
    nozzles: [],
    spinners,
    navLights: [
      { pos: [1.1, yC + 0.3, -4.38], color: '#ff2a2a' },
      { pos: [-1.1, yC + 0.3, -4.38], color: '#22ff66' },
      { pos: [0, yC + 2.26, -6.95], color: '#ffffff', blink: 'strobe' },
    ],
    glowMats: [mats.glow],
    hoverHeight: 0.9,
    rotorWash: true,
  };
}
