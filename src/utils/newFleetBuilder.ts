import * as THREE from 'three';
import { addDecal, buildAirfoilSurface, buildLoftGeometry, lerp, mkMesh, smoothstep, type AirfoilSection } from './aeroGeo';
import { camoTexture, cockpitWindowTexture, flagTexture, roundelTexture, solidNoiseTexture, textTexture } from './textures';
import type { BuildResult, NavLightFx, NozzleFx, SpinnerFx } from './proceduralBuilder';

/* =========================================================================
 * Builder 3D Prosedural 16 Armada Baru TNI AU (sesuai referensi multi-sudut):
 * - Angkut & Tanker: A400M Atlas, CN-295, CN-235, C-212 Aviocar, Falcon 8X, A330 MRTT
 * - Tempur: A-4E/TA-4H Skyhawk
 * - Latih & Glider: Grob G-120TP, Cessna 182 Skylane, Beechcraft T-41, SGS 2-33, DG-1000
 * - Helikopter: AS332 Super Puma, AW101, Airbus H145, AS365 Dauphin
 * ========================================================================= */

function loftZ(zMin: number, zMax: number, rings: number, radialSegs: number, pointFn: (z: number, th: number) => [number, number]) {
  const stations = Array.from({ length: rings + 1 }, (_, i) => {
    const z = lerp(zMin, zMax, i / rings);
    return { z, point: (th: number) => pointFn(z, th) };
  });
  return buildLoftGeometry(stations, radialSegs, true, true);
}

function addWingPair(
  g: THREE.Group,
  secs: { spanPos: number; chord: number; leZ: number; thick: number; offset: number }[],
  mat: THREE.Material,
) {
  const mapped: AirfoilSection[] = secs.map((s) => ({
    spanPos: s.spanPos,
    leZ: s.leZ,
    teZ: s.leZ - s.chord,
    offset: s.offset,
    thick: s.thick,
  }));
  const r = mkMesh(buildAirfoilSurface(mapped, 'horizontal', 1), mat);
  const l = mkMesh(buildAirfoilSurface(mapped, 'horizontal', -1), mat);
  g.add(r, l);
  return r;
}

function addVertFin(
  g: THREE.Group,
  secs: { spanPos: number; chord: number; leZ: number; thick: number; offset: number }[],
  mat: THREE.Material,
) {
  const mapped: AirfoilSection[] = secs.map((s) => ({
    spanPos: s.spanPos,
    leZ: s.leZ,
    teZ: s.leZ - s.chord,
    offset: s.offset,
    thick: s.thick,
  }));
  const f = mkMesh(buildAirfoilSurface(mapped, 'vertical', 1), mat);
  g.add(f);
  return f;
}

const matStd = (color: THREE.ColorRepresentation, metalness = 0.35, roughness = 0.45, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });

const matGlass = (color = '#142c47', opacity = 0.56) =>
  new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.15,
    roughness: 0.05,
    transparent: true,
    opacity,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    side: THREE.DoubleSide,
  });

function addGear(parent: THREE.Group, x: number, z: number, topY: number, wheelR: number, twin = false) {
  let grp = parent.getObjectByName('landing-gear') as THREE.Group | undefined;
  if (!grp) {
    grp = new THREE.Group();
    grp.name = 'landing-gear';
    parent.add(grp);
  }
  const strutMat = matStd('#cfd6de', 0.72, 0.3);
  const tireMat = matStd('#16191e', 0.06, 0.9);
  const len = Math.max(0.1, topY - wheelR);
  const strut = mkMesh(new THREE.CylinderGeometry(0.05, 0.06, len, 10), strutMat);
  strut.position.set(x, wheelR + len / 2, z);
  grp.add(strut);

  const offs = twin ? [-wheelR * 0.55, wheelR * 0.55] : [0];
  for (const o of offs) {
    const tire = mkMesh(new THREE.CylinderGeometry(wheelR, wheelR, wheelR * 0.58, 20), tireMat);
    tire.rotation.z = Math.PI / 2;
    tire.position.set(x + o, wheelR, z);
    const hub = mkMesh(new THREE.CylinderGeometry(wheelR * 0.52, wheelR * 0.52, wheelR * 0.62, 14), strutMat);
    hub.rotation.z = Math.PI / 2;
    hub.position.copy(tire.position);
    grp.add(tire, hub);
  }
}

function makeProp(blades: number, radius: number, chord: number, tipColor = '#f5be18', hubColor = '#222830') {
  const pivot = new THREE.Group();
  const bladeMat = matStd('#1c2026', 0.45, 0.42);
  const tipMat = matStd(tipColor, 0.25, 0.35);
  const hubMat = matStd(hubColor, 0.4, 0.35);
  for (let i = 0; i < blades; i++) {
    const arm = new THREE.Group();
    const b = mkMesh(new THREE.BoxGeometry(chord, radius - 0.14, 0.028), bladeMat);
    b.position.y = 0.14 + (radius - 0.14) / 2;
    b.rotation.y = 0.3;
    const tip = mkMesh(new THREE.BoxGeometry(chord * 0.9, 0.12, 0.032), tipMat);
    tip.position.y = radius - 0.06;
    tip.rotation.y = 0.3;
    arm.add(b, tip);
    arm.rotation.z = (i * Math.PI * 2) / blades;
    pivot.add(arm);
  }
  const hub = mkMesh(new THREE.ConeGeometry(0.18, 0.45, 16), hubMat);
  hub.rotation.x = Math.PI / 2;
  hub.position.z = 0.14;
  pivot.add(hub);

  const blur = new THREE.Mesh(
    new THREE.RingGeometry(0.16, radius, 48),
    new THREE.MeshBasicMaterial({ color: '#dbe4ec', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
  );
  blur.userData.role = 'blur';
  blur.visible = false;
  const wrap = new THREE.Group();
  wrap.add(pivot, blur);
  return { wrap, pivot, blur };
}

function addTniAuMarkings(
  g: THREE.Group,
  fuse: THREE.Mesh,
  fin: THREE.Mesh,
  opts: {
    code: string;
    sideText: string;
    sideX: number;
    sideY: number;
    sideZ: number;
    roundelZ: number;
    finY: number;
    finZ: number;
    finThick: number;
    textColor?: string;
    showRoundel?: boolean;
  },
) {
  const flag = flagTexture();
  const rnd = roundelTexture();
  const txt = textTexture(opts.sideText, { color: opts.textColor ?? '#111827', aspect: 9 });
  const codeTex = textTexture(opts.code, { color: opts.textColor ?? '#111827', aspect: 3.6 });

  for (const s of [1, -1]) {
    const rot: [number, number, number] = [0, s > 0 ? Math.PI / 2 : -Math.PI / 2, 0];
    addDecal(g, fuse, [s * opts.sideX, opts.sideY, opts.sideZ], rot, [2.7, 0.32, 0.45], txt);
    if (opts.showRoundel !== false) {
      addDecal(g, fuse, [s * opts.sideX, opts.sideY - 0.1, opts.roundelZ], rot, [0.58, 0.58, 0.45], rnd);
    }
    addDecal(g, fin, [s * (opts.finThick / 2 + 0.01), opts.finY + 0.55, opts.finZ], rot, [0.72, 0.46, 0.12], flag);
    addDecal(g, fin, [s * (opts.finThick / 2 + 0.01), opts.finY - 0.12, opts.finZ + 0.05], rot, [0.95, 0.28, 0.12], codeTex);
  }
}

/* =========================================================================
 * 1. ANGKUT TURBOPROP HIGH-WING: A400M, CN-295, CN-235, C-212
 * ========================================================================= */
function buildTurbopropTransport(cfg: {
  id: string;
  bodyColor: string;
  tailColor: string;
  stripeColor?: string;
  code: string;
  engines: 2 | 4;
  blades: number;
  tTail?: boolean;
  boxy?: boolean;
  wingSpan: number;
  fuseLen: number;
  rx: number;
  ry: number;
  textColor?: string;
}): BuildResult {
  const g = new THREE.Group();
  const yC = 1.65;
  const halfL = cfg.fuseLen / 2;
  const bodyMat = matStd('#ffffff', 0.36, 0.46, { map: solidNoiseTexture(cfg.bodyColor, 400 + cfg.blades, 0.03) });
  const tailMat = matStd(cfg.tailColor, 0.35, 0.42);
  const darkMat = matStd('#1c222a', 0.3, 0.55);
  const glowMat = matStd('#241208', 0.5, 0.4);

  const fuseGeo = loftZ(
    -halfL,
    halfL,
    56,
    28,
    (z, th) => {
      const s = Math.sin(th);
      const c = Math.cos(th);
      let rx = cfg.rx;
      let ryT = cfg.ry;
      let ryB = cfg.ry * 0.85;
      let yc = 0;

      if (z > halfL - 2.3) {
        const u = (z - (halfL - 2.3)) / 2.3;
        const t = Math.pow(Math.max(0, 1 - u * u), 0.55);
        rx = cfg.rx * t + 0.06;
        ryT = cfg.ry * t + 0.06;
        ryB = cfg.ry * 0.85 * t + 0.06;
        yc = -0.24 * u;
      } else if (z < -halfL + 3.4) {
        const u = (-halfL + 3.4 - z) / 3.4;
        rx = lerp(cfg.rx, 0.16, Math.pow(u, 1.3));
        ryT = lerp(cfg.ry, 0.24, Math.pow(u, 1.2));
        ryB = lerp(cfg.ry * 0.85, 0.12, Math.pow(u, 1.1));
        yc = 0.82 * Math.pow(u, 1.25);
      }

      const exp = cfg.boxy ? 0.72 : 0.84;
      const sx = Math.sign(s) * Math.pow(Math.abs(s), exp);
      const cy = Math.sign(c) * Math.pow(Math.abs(c), exp);
      return [sx * rx, yc + (cy >= 0 ? cy * ryT : cy * ryB)];
    },
  );
  const fuse = mkMesh(fuseGeo, bodyMat);
  fuse.position.y = yC;
  g.add(fuse);

  // Radome hidung hitam
  const radome = mkMesh(new THREE.SphereGeometry(cfg.rx * 0.48, 20, 14), darkMat);
  radome.scale.set(0.92, 0.85, 1.25);
  radome.position.set(0, yC - 0.24, halfL - 0.15);
  g.add(radome);

  // Jendela kokpit
  addDecal(g, fuse, [0, yC + cfg.ry * 0.38, halfL - 1.45], [-0.45, 0, 0], [cfg.rx * 1.45, 0.62, 1.35], cockpitWindowTexture('transport'));

  // Strip warna samping (CN-235 biru, dll)
  if (cfg.stripeColor) {
    const stripeMat = matStd(cfg.stripeColor, 0.3, 0.4);
    for (const s of [1, -1]) {
      const st = mkMesh(new THREE.BoxGeometry(0.06, 0.12, cfg.fuseLen * 0.72), stripeMat);
      st.position.set(s * (cfg.rx - 0.01), yC - 0.05, 0.3);
      g.add(st);
    }
  }

  // Sponson roda utama samping
  for (const s of [1, -1]) {
    const sp = mkMesh(new THREE.CapsuleGeometry(0.32, 2.2, 8, 16), bodyMat);
    sp.rotation.x = Math.PI / 2;
    sp.scale.set(0.85, 1, 0.95);
    sp.position.set(s * (cfg.rx * 0.92), yC - cfg.ry * 0.52, -0.35);
    g.add(sp);
  }

  // Sayap tinggi menyatu penuh dari pusat badan (spanPos: 0.0)
  const wingY = yC + cfg.ry * 0.78;
  addWingPair(
    g,
    [
      { spanPos: 0.0, chord: 2.05, leZ: 1.5, thick: 0.14, offset: wingY },
      { spanPos: cfg.wingSpan * 0.48, chord: 1.75, leZ: 1.35, thick: 0.13, offset: wingY - 0.05 },
      { spanPos: cfg.wingSpan, chord: 0.95, leZ: 0.75, thick: 0.1, offset: wingY - 0.18 },
    ],
    bodyMat,
  );

  // Sirip ekor tegak
  const finH = cfg.tTail ? 3.1 : 2.6;
  const finMesh = addVertFin(
    g,
    [
      { spanPos: yC + 0.4, chord: 2.5, leZ: -halfL + 2.8, thick: 0.1, offset: 0 },
      { spanPos: yC + 0.4 + finH, chord: 1.35, leZ: -halfL + 1.1, thick: 0.08, offset: 0 },
    ],
    tailMat,
  );

  // Stabilizer horizontal (T-tail tinggi untuk A400M, normal untuk CN-295/CN-235/C-212)
  const stabY = cfg.tTail ? yC + 0.35 + finH : yC + 0.95;
  const stabZ = cfg.tTail ? -halfL + 0.95 : -halfL + 1.55;
  addWingPair(
    g,
    [
      { spanPos: 0.0, chord: 1.25, leZ: stabZ, thick: 0.1, offset: stabY },
      { spanPos: 2.5, chord: 0.72, leZ: stabZ - 0.42, thick: 0.08, offset: stabY + 0.08 },
    ],
    cfg.tTail ? tailMat : bodyMat,
  );

  // Mesin turboprop & baling-baling
  const spinners: SpinnerFx[] = [];
  const engXs = cfg.engines === 4 ? [-4.05, -2.05, 2.05, 4.05] : [-2.15, 2.15];
  for (const ex of engXs) {
    const nac = mkMesh(new THREE.CapsuleGeometry(0.32, 1.65, 8, 16), bodyMat);
    nac.rotation.x = Math.PI / 2;
    nac.position.set(ex, wingY - 0.22, 1.35);
    g.add(nac);
    const prop = makeProp(cfg.blades, cfg.engines === 4 ? 1.15 : 1.05, 0.11, '#f5be18', '#1d232b');
    prop.wrap.position.set(ex, wingY - 0.22, 2.48);
    g.add(prop.wrap);
    spinners.push({ obj: prop.pivot, axis: 'z', speed: 24, blur: prop.blur });
  }

  // Roda pendarat
  addGear(g, 0, halfL - 1.55, yC - cfg.ry * 0.65, 0.24, true);
  addGear(g, cfg.rx * 0.95, -0.35, yC - cfg.ry * 0.6, 0.32, true);
  addGear(g, -cfg.rx * 0.95, -0.35, yC - cfg.ry * 0.6, 0.32, true);

  addTniAuMarkings(g, fuse, finMesh, {
    code: cfg.code,
    sideText: 'TNI ANGKATAN UDARA',
    sideX: cfg.rx * 0.98,
    sideY: yC + 0.28,
    sideZ: 1.9,
    roundelZ: -2.3,
    finY: yC + 0.4 + finH * 0.58,
    finZ: -halfL + 1.15,
    finThick: 0.24,
    textColor: cfg.textColor ?? '#111827',
  });

  const navLights: NavLightFx[] = [
    { pos: [cfg.wingSpan, wingY - 0.18, 0.5], color: '#ff2a2a' },
    { pos: [-cfg.wingSpan, wingY - 0.18, 0.5], color: '#22ff66' },
    { pos: [0, yC + 0.4 + finH, -halfL + 0.3], color: '#ffffff', blink: 'strobe' },
  ];
  return { group: g, nozzles: [], spinners, navLights, glowMats: [glowMat], hoverHeight: 0.8 };
}

export const buildA400M = () =>
  buildTurbopropTransport({
    id: 'a400m',
    bodyColor: '#6f7984',
    tailColor: '#6f7984',
    code: 'A-4001',
    engines: 4,
    blades: 8,
    tTail: true,
    wingSpan: 6.9,
    fuseLen: 13.6,
    rx: 1.08,
    ry: 1.15,
    textColor: '#0f172a',
  });

export const buildCN295 = () =>
  buildTurbopropTransport({
    id: 'cn295',
    bodyColor: '#aeb6bf',
    tailColor: '#aeb6bf',
    code: 'A-2901',
    engines: 2,
    blades: 6,
    wingSpan: 6.4,
    fuseLen: 12.6,
    rx: 0.94,
    ry: 1.02,
    textColor: '#0f172a',
  });

export const buildCN235 = () =>
  buildTurbopropTransport({
    id: 'cn235',
    bodyColor: '#eef2f6',
    tailColor: '#f5be18',
    stripeColor: '#1d4ed8',
    code: 'A-2317',
    engines: 2,
    blades: 4,
    wingSpan: 6.2,
    fuseLen: 11.8,
    rx: 0.92,
    ry: 0.98,
    textColor: '#0f172a',
  });

export const buildC212 = () =>
  buildTurbopropTransport({
    id: 'c212',
    bodyColor: '#b8c0c8',
    tailColor: '#b8c0c8',
    code: 'A-2105',
    engines: 2,
    blades: 4,
    boxy: true,
    wingSpan: 5.8,
    fuseLen: 10.6,
    rx: 0.86,
    ry: 0.96,
    textColor: '#0f172a',
  });

/* =========================================================================
 * 2. JET VIP & TANKER: FALCON 8X (TRI-JET) & AIRBUS A330 MRTT
 * ========================================================================= */
export function buildFalcon8X(): BuildResult {
  const g = new THREE.Group();
  const yC = 1.48;
  const bodyMat = matStd('#e5e9ee', 0.45, 0.28);
  const redMat = matStd('#dc2626', 0.35, 0.32);
  const metalMat = matStd('#9aa4b0', 0.8, 0.26);
  const glowMat = matStd('#241208', 0.5, 0.4, { emissive: new THREE.Color('#ff7b24'), emissiveIntensity: 0 });

  const fuseGeo = loftZ(-6.4, 6.4, 56, 28, (z, th) => {
    const s = Math.sin(th);
    const c = Math.cos(th);
    let r = 0.68;
    if (z > 4.2) r = 0.68 * Math.pow(Math.max(0, 1 - Math.pow((z - 4.2) / 2.2, 2)), 0.55) + 0.04;
    else if (z < -3.6) r = lerp(0.68, 0.22, Math.pow((-3.6 - z) / 2.8, 1.2));
    return [s * r, c * r];
  });
  const fuse = mkMesh(fuseGeo, bodyMat);
  fuse.position.y = yC;
  g.add(fuse);

  // Strip merah panjang khas Falcon 8X TNI AU
  for (const s of [1, -1]) {
    const stripe = mkMesh(new THREE.BoxGeometry(0.05, 0.1, 10.2), redMat);
    stripe.position.set(s * 0.67, yC - 0.05, 0.4);
    g.add(stripe);
  }
  addDecal(g, fuse, [0, yC + 0.28, 5.1], [-0.45, 0, 0], [1.0, 0.44, 1.1], cockpitWindowTexture('airliner'));

  // Sayap sapu belakang + winglet melengkung
  addWingPair(
    g,
    [
      { spanPos: 0.0, chord: 2.2, leZ: 1.2, thick: 0.1, offset: yC - 0.42 },
      { spanPos: 5.6, chord: 0.72, leZ: -1.85, thick: 0.07, offset: yC - 0.15 },
    ],
    bodyMat,
  );
  for (const s of [1, -1]) {
    const wl = mkMesh(new THREE.BoxGeometry(0.08, 0.72, 0.52), bodyMat);
    wl.position.set(s * 5.6, yC + 0.18, -2.15);
    wl.rotation.z = -s * 0.24;
    g.add(wl);
  }

  // Ekor tegak & horizontal
  const finMesh = addVertFin(
    g,
    [
      { spanPos: yC + 0.35, chord: 2.3, leZ: -3.9, thick: 0.09, offset: 0 },
      { spanPos: yC + 2.65, chord: 1.0, leZ: -5.5, thick: 0.07, offset: 0 },
    ],
    bodyMat,
  );

  addWingPair(
    g,
    [
      { spanPos: 0.0, chord: 1.05, leZ: -4.9, thick: 0.08, offset: yC + 0.9 },
      { spanPos: 2.2, chord: 0.55, leZ: -5.8, thick: 0.07, offset: yC + 1.05 },
    ],
    bodyMat,
  );

  // 3 Mesin Tri-Jet di belakang (kiri, kanan, & tengah atas S-duct!)
  const nozzles: NozzleFx[] = [];
  for (const [ex, ey, ez] of [
    [-1.02, yC + 0.16, -4.15],
    [1.02, yC + 0.16, -4.15],
    [0, yC + 0.92, -4.3],
  ] as [number, number, number][]) {
    const pod = mkMesh(new THREE.CapsuleGeometry(0.28, 1.5, 8, 16), bodyMat);
    pod.rotation.x = Math.PI / 2;
    pod.position.set(ex, ey, ez);
    const lip = mkMesh(new THREE.TorusGeometry(0.27, 0.03, 8, 20), metalMat);
    lip.position.set(ex, ey, ez + 0.92);
    g.add(pod, lip);
    nozzles.push({ pos: [ex, ey, ez - 1.0], r: 0.2, kind: 'fan' });
  }

  addGear(g, 0, 4.9, yC - 0.5, 0.18, true);
  addGear(g, 1.05, -0.5, yC - 0.45, 0.24, true);
  addGear(g, -1.05, -0.5, yC - 0.45, 0.24, true);

  addTniAuMarkings(g, fuse, finMesh, {
    code: 'A-0805',
    sideText: 'TNI ANGKATAN UDARA',
    sideX: 0.67,
    sideY: yC + 0.34,
    sideZ: 1.4,
    roundelZ: -2.2,
    finY: yC + 1.8,
    finZ: -5.45,
    finThick: 0.18,
    showRoundel: false,
  });

  return {
    group: g,
    nozzles,
    spinners: [],
    navLights: [
      { pos: [5.6, yC + 0.2, -2.1], color: '#ff2a2a' },
      { pos: [-5.6, yC + 0.2, -2.1], color: '#22ff66' },
      { pos: [0, yC + 2.65, -6.1], color: '#ffffff', blink: 'strobe' },
    ],
    glowMats: [glowMat],
    hoverHeight: 0.75,
  };
}

export function buildA330MRTT(): BuildResult {
  const g = new THREE.Group();
  const yC = 1.72;
  const bodyMat = matStd('#ffffff', 0.4, 0.38, { map: solidNoiseTexture('#858f9a', 3301, 0.025) });
  const metalMat = matStd('#b0b8c2', 0.8, 0.28);
  const glowMat = matStd('#241208', 0.5, 0.4, { emissive: new THREE.Color('#ff7b24'), emissiveIntensity: 0 });

  const fuseGeo = loftZ(-7.1, 7.1, 60, 28, (z, th) => {
    const s = Math.sin(th);
    const c = Math.cos(th);
    let r = 0.84;
    if (z > 4.9) r = 0.84 * Math.pow(Math.max(0, 1 - Math.pow((z - 4.9) / 2.2, 2)), 0.55) + 0.05;
    else if (z < -4.2) r = lerp(0.84, 0.2, Math.pow((-4.2 - z) / 2.9, 1.2));
    return [s * r, c * r];
  });
  const fuse = mkMesh(fuseGeo, bodyMat);
  fuse.position.y = yC;
  g.add(fuse);

  addDecal(g, fuse, [0, yC + 0.28, 5.95], [-0.45, 0, 0], [1.22, 0.48, 1.2], cockpitWindowTexture('airliner'));

  // Sayap sapu lebar + winglet + pod drogue refueling
  addWingPair(
    g,
    [
      { spanPos: 0.0, chord: 2.5, leZ: 1.5, thick: 0.11, offset: yC - 0.52 },
      { spanPos: 6.6, chord: 0.82, leZ: -2.1, thick: 0.07, offset: yC + 0.1 },
    ],
    bodyMat,
  );
  for (const s of [1, -1]) {
    const wl = mkMesh(new THREE.BoxGeometry(0.08, 0.78, 0.55), bodyMat);
    wl.position.set(s * 6.6, yC + 0.44, -2.4);
    wl.rotation.z = -s * 0.22;
    const pod = mkMesh(new THREE.CapsuleGeometry(0.14, 1.15, 6, 12), metalMat);
    pod.rotation.x = Math.PI / 2;
    pod.position.set(s * 4.5, yC - 0.35, -1.25);
    g.add(wl, pod);
  }

  // Boom pengisian BBM ekor (ARBS)
  const boom = mkMesh(new THREE.CylinderGeometry(0.06, 0.09, 2.2, 10), metalMat);
  boom.rotation.x = Math.PI / 2 + 0.22;
  boom.position.set(0, yC - 0.42, -6.5);
  g.add(boom);

  // Ekor tegak & horizontal
  const finMesh = addVertFin(
    g,
    [
      { spanPos: yC + 0.45, chord: 2.6, leZ: -4.2, thick: 0.09, offset: 0 },
      { spanPos: yC + 2.95, chord: 1.1, leZ: -6.0, thick: 0.07, offset: 0 },
    ],
    bodyMat,
  );

  addWingPair(
    g,
    [
      { spanPos: 0.0, chord: 1.2, leZ: -5.3, thick: 0.08, offset: yC + 0.2 },
      { spanPos: 2.5, chord: 0.62, leZ: -6.4, thick: 0.07, offset: yC + 0.45 },
    ],
    bodyMat,
  );

  // 2 Mesin Turbofan Besar Rolls-Royce Trent 700
  const nozzles: NozzleFx[] = [];
  for (const s of [1, -1]) {
    const eng = mkMesh(new THREE.CapsuleGeometry(0.46, 1.45, 8, 20), bodyMat);
    eng.rotation.x = Math.PI / 2;
    eng.position.set(s * 2.25, yC - 0.85, 0.85);
    const lip = mkMesh(new THREE.TorusGeometry(0.44, 0.04, 8, 24), metalMat);
    lip.position.set(s * 2.25, yC - 0.85, 1.85);
    g.add(eng, lip);
    nozzles.push({ pos: [s * 2.25, yC - 0.85, -0.3], r: 0.3, kind: 'fan' });
  }

  addGear(g, 0, 5.7, yC - 0.65, 0.22, true);
  addGear(g, 1.25, -0.5, yC - 0.62, 0.28, true);
  addGear(g, -1.25, -0.5, yC - 0.62, 0.28, true);

  addTniAuMarkings(g, fuse, finMesh, {
    code: 'A-3301',
    sideText: 'TNI ANGKATAN UDARA',
    sideX: 0.83,
    sideY: yC + 0.36,
    sideZ: 2.1,
    roundelZ: -3.2,
    finY: yC + 2.0,
    finZ: -6.0,
    finThick: 0.2,
    showRoundel: false,
  });

  return {
    group: g,
    nozzles,
    spinners: [],
    navLights: [
      { pos: [6.6, yC + 0.45, -2.4], color: '#ff2a2a' },
      { pos: [-6.6, yC + 0.45, -2.4], color: '#22ff66' },
      { pos: [0, yC + 2.95, -6.7], color: '#ffffff', blink: 'strobe' },
    ],
    glowMats: [glowMat],
    hoverHeight: 0.8,
  };
}

/* =========================================================================
 * 3. A-4E / TA-4H SKYHAWK (TEMPUR DELTA IKONIK TNI AU)
 * ========================================================================= */
export function buildA4Skyhawk(): BuildResult {
  const g = new THREE.Group();
  const yC = 1.55;
  const camoTex = camoTexture('#6f8aa0', [{ c: '#364d62', n: 14, r: 58 }, { c: '#25313e', n: 10, r: 46 }], 440);
  const skinMat = matStd('#ffffff', 0.45, 0.44, { map: camoTex });
  const redLipMat = matStd('#dc2626', 0.35, 0.35);
  const darkMat = matStd('#1c222a', 0.4, 0.5);
  const glowMat = matStd('#241208', 0.6, 0.4, { emissive: new THREE.Color('#ff6a1a'), emissiveIntensity: 0 });

  const fuseGeo = loftZ(-5.8, 6.2, 54, 28, (z, th) => {
    const s = Math.sin(th);
    const c = Math.cos(th);
    let rx = 0.72;
    let ryT = 0.76;
    let ryB = 0.64;
    if (z > 2.6) {
      const u = (z - 2.6) / 3.6;
      const t = Math.pow(Math.max(0, 1 - Math.pow(u, 1.55)), 0.62);
      rx = 0.72 * t + 0.04;
      ryT = 0.76 * t + 0.04;
      ryB = 0.64 * t + 0.04;
    } else if (z < -3.0) {
      const u = (-3.0 - z) / 2.8;
      rx = lerp(0.72, 0.42, u);
      ryT = lerp(0.76, 0.44, u);
      ryB = lerp(0.64, 0.42, u);
    }
    return [s * rx, c >= 0 ? c * ryT : c * ryB];
  });
  const fuse = mkMesh(fuseGeo, skinMat);
  fuse.position.y = yC;
  g.add(fuse);

  // Kanopi gelembung + probe pengisian BBM di kanan hidung
  const canopy = mkMesh(new THREE.CapsuleGeometry(0.42, 1.75, 8, 18), matGlass('#132c48', 0.56));
  canopy.rotation.x = Math.PI / 2;
  canopy.scale.set(1.0, 1.0, 0.86);
  canopy.position.set(0, yC + 0.74, 2.6);
  const probe = mkMesh(new THREE.CylinderGeometry(0.035, 0.045, 2.3, 8), darkMat);
  probe.rotation.x = Math.PI / 2;
  probe.position.set(0.58, yC + 0.05, 4.3);
  g.add(canopy, probe);

  // Intake samping khas Skyhawk dengan bibir merah menyala
  for (const s of [1, -1]) {
    const duct = mkMesh(new THREE.CylinderGeometry(0.32, 0.36, 2.2, 16), skinMat);
    duct.rotation.x = Math.PI / 2;
    duct.position.set(s * 0.74, yC + 0.12, 1.2);
    const lip = mkMesh(new THREE.TorusGeometry(0.32, 0.055, 8, 20), redLipMat);
    lip.position.set(s * 0.74, yC + 0.12, 2.3);
    g.add(duct, lip);
  }

  // Sayap Delta rendah khas A-4 Skyhawk + tangki bahan bakar besar di bawah sayap
  addWingPair(
    g,
    [
      { spanPos: 0.0, chord: 4.5, leZ: 2.0, thick: 0.11, offset: yC - 0.38 },
      { spanPos: 4.35, chord: 0.95, leZ: -1.65, thick: 0.07, offset: yC - 0.32 },
    ],
    skinMat,
  );

  const tankMat = matStd('#d5dde5', 0.35, 0.4);
  for (const x of [-1.55, 0, 1.55]) {
    const tank = mkMesh(new THREE.CapsuleGeometry(0.24, 2.5, 8, 16), tankMat);
    tank.rotation.x = Math.PI / 2;
    tank.position.set(x, yC - 0.85, -0.35);
    g.add(tank);
  }

  // Ekor tegak tinggi & stabilizer horizontal
  const finMesh = addVertFin(
    g,
    [
      { spanPos: yC + 0.35, chord: 2.7, leZ: -2.8, thick: 0.09, offset: 0 },
      { spanPos: yC + 2.75, chord: 0.85, leZ: -4.9, thick: 0.07, offset: 0 },
    ],
    skinMat,
  );

  addWingPair(
    g,
    [
      { spanPos: 0.0, chord: 1.35, leZ: -4.2, thick: 0.08, offset: yC + 0.55 },
      { spanPos: 1.95, chord: 0.62, leZ: -5.1, thick: 0.07, offset: yC + 0.55 },
    ],
    skinMat,
  );

  addGear(g, 0, 4.1, yC - 0.45, 0.2);
  addGear(g, 1.45, -0.8, yC - 0.42, 0.26);
  addGear(g, -1.45, -0.8, yC - 0.42, 0.26);

  addTniAuMarkings(g, fuse, finMesh, {
    code: 'TT-0440',
    sideText: 'TNI AU',
    sideX: 0.72,
    sideY: yC + 0.05,
    sideZ: 3.4,
    roundelZ: -1.4,
    finY: yC + 1.75,
    finZ: -4.8,
    finThick: 0.18,
    textColor: '#0f172a',
  });

  return {
    group: g,
    nozzles: [{ pos: [0, yC, -6.0], r: 0.38, kind: 'ab' }],
    spinners: [],
    navLights: [
      { pos: [4.35, yC - 0.32, -1.9], color: '#ff2a2a' },
      { pos: [-4.35, yC - 0.32, -1.9], color: '#22ff66' },
    ],
    glowMats: [glowMat],
    hoverHeight: 0.9,
  };
}

/* =========================================================================
 * 4. LATIH & GLIDER: GROB G-120TP, CESSNA 182, T-41, SGS 2-33, DG-1000
 * ========================================================================= */
function buildLightTrainer(cfg: {
  bodyColor: string;
  accentColor: string;
  noseColor?: string;
  code: string;
  highWing?: boolean;
  glider?: boolean;
  tTail?: boolean;
  wingSpan: number;
  winglets?: boolean;
  blades?: number;
}): BuildResult {
  const g = new THREE.Group();
  const yC = cfg.glider ? 1.05 : 1.38;
  const bodyMat = matStd(cfg.bodyColor, 0.32, 0.34);
  const accMat = matStd(cfg.accentColor, 0.3, 0.35);
  const noseMat = matStd(cfg.noseColor ?? cfg.accentColor, 0.3, 0.35);
  const glowMat = matStd('#241208', 0.4, 0.4);

  const halfL = cfg.glider ? 5.2 : 4.7;
  const rxBase = cfg.glider ? 0.42 : 0.62;
  const ryBase = cfg.glider ? 0.46 : 0.66;

  const fuseGeo = loftZ(-halfL, halfL, 48, 24, (z, th) => {
    const s = Math.sin(th);
    const c = Math.cos(th);
    let rx = rxBase;
    let ry = ryBase;
    if (z > halfL - 2.3) {
      const u = (z - (halfL - 2.3)) / 2.3;
      const t = Math.pow(Math.max(0, 1 - u * u), 0.58);
      rx = rxBase * t + 0.05;
      ry = ryBase * t + 0.05;
    } else if (z < -0.5) {
      const u = (-0.5 - z) / (halfL - 0.5);
      rx = lerp(rxBase, 0.14, Math.pow(u, 1.15));
      ry = lerp(ryBase, 0.2, Math.pow(u, 1.15));
    }
    return [s * rx, c * ry];
  });
  const fuse = mkMesh(fuseGeo, bodyMat);
  fuse.position.y = yC;
  g.add(fuse);

  // Hidung / cowling aksen warna (kuning Grob, oranye T-41/SGS, merah DG-1000)
  const noseTip = mkMesh(new THREE.SphereGeometry(rxBase * 0.58, 16, 12), noseMat);
  noseTip.scale.set(0.9, 0.9, 1.35);
  noseTip.position.set(0, yC, halfL - 0.55);
  g.add(noseTip);

  // Kanopi kokpit panoramik
  const canopy = mkMesh(new THREE.CapsuleGeometry(rxBase * 0.78, 1.65, 8, 16), matGlass('#17314e', 0.52));
  canopy.rotation.x = Math.PI / 2;
  canopy.position.set(0, yC + ryBase * 0.68, 1.45);
  g.add(canopy);

  // Strip warna samping
  for (const s of [1, -1]) {
    const st = mkMesh(new THREE.BoxGeometry(0.04, 0.1, cfg.glider ? 7.2 : 6.2), accMat);
    st.position.set(s * (rxBase * 0.76), yC - 0.06, -0.4);
    g.add(st);
  }

  // Sayap utama (High-wing untuk Cessna 182 & SGS 2-33; Low-wing untuk Grob, T-41, DG-1000)
  const wingY = cfg.highWing ? yC + ryBase * 0.85 : yC - ryBase * 0.25;
  addWingPair(
    g,
    [
      { spanPos: 0.0, chord: cfg.glider ? 1.15 : 1.55, leZ: 1.25, thick: 0.11, offset: wingY },
      { spanPos: cfg.wingSpan, chord: cfg.glider ? 0.52 : 0.92, leZ: 0.95, thick: 0.08, offset: wingY + (cfg.glider ? 0.35 : 0.22) },
    ],
    bodyMat,
  );

  // Ujung sayap aksen / winglet melengkung (Grob kuning, DG-1000 merah, T-41/SGS oranye)
  for (const s of [1, -1]) {
    if (cfg.winglets) {
      const wl = mkMesh(new THREE.BoxGeometry(0.08, 0.68, 0.45), accMat);
      wl.position.set(s * cfg.wingSpan, wingY + 0.55, 0.65);
      wl.rotation.z = -s * 0.26;
      g.add(wl);
    } else {
      const tip = mkMesh(new THREE.BoxGeometry(0.52, 0.1, cfg.glider ? 0.52 : 0.9), accMat);
      tip.position.set(s * (cfg.wingSpan - 0.24), wingY + (cfg.glider ? 0.34 : 0.21), 0.52);
      g.add(tip);
    }
    if (cfg.highWing) {
      const strut = mkMesh(new THREE.CylinderGeometry(0.03, 0.03, 2.6, 8), bodyMat);
      strut.rotation.z = s * 1.12;
      strut.position.set(s * 1.65, yC + 0.15, 0.65);
      g.add(strut);
    }
  }

  // Ekor tegak & horizontal
  const finH = cfg.glider ? 1.45 : 1.75;
  const finMesh = addVertFin(
    g,
    [
      { spanPos: yC + 0.15, chord: 1.55, leZ: -halfL + 1.6, thick: 0.08, offset: 0 },
      { spanPos: yC + 0.15 + finH, chord: 0.78, leZ: -halfL + 0.65, thick: 0.07, offset: 0 },
    ],
    bodyMat,
  );

  // Strip ujung ekor warna aksen
  const finTip = mkMesh(new THREE.BoxGeometry(0.14, 0.22, 0.76), accMat);
  finTip.position.set(0, yC + 0.1 + finH, -halfL + 0.28);
  g.add(finTip);

  const stabY = cfg.tTail ? yC + 0.15 + finH : yC + 0.22;
  addWingPair(
    g,
    [
      { spanPos: 0.0, chord: 0.85, leZ: -halfL + 0.85, thick: 0.08, offset: stabY },
      { spanPos: 1.75, chord: 0.52, leZ: -halfL + 0.65, thick: 0.07, offset: stabY },
    ],
    bodyMat,
  );

  // Baling-baling (kecuali glider tanpa mesin!)
  const spinners: SpinnerFx[] = [];
  if (!cfg.glider) {
    const prop = makeProp(cfg.blades ?? 3, 1.12, 0.1, '#f5be18', cfg.accentColor);
    prop.wrap.position.set(0, yC, halfL + 0.05);
    g.add(prop.wrap);
    spinners.push({ obj: prop.pivot, axis: 'z', speed: 28, blur: prop.blur });
  }

  // Roda pendarat (monowheel untuk glider, tricycle untuk trainer)
  if (cfg.glider) {
    addGear(g, 0, 0.8, yC - 0.35, 0.22);
  } else {
    addGear(g, 0, halfL - 1.25, yC - 0.45, 0.18);
    addGear(g, 1.35, 0.35, yC - 0.45, 0.22);
    addGear(g, -1.35, 0.35, yC - 0.45, 0.22);
  }

  addTniAuMarkings(g, fuse, finMesh, {
    code: cfg.code,
    sideText: cfg.glider ? 'TNI ANGKATAN UDARA' : 'TNI AU',
    sideX: rxBase * 0.94,
    sideY: yC + 0.02,
    sideZ: -1.1,
    roundelZ: -2.0,
    finY: yC + 0.15 + finH * 0.55,
    finZ: -halfL + 0.62,
    finThick: 0.14,
  });

  return {
    group: g,
    nozzles: [],
    spinners,
    navLights: [
      { pos: [cfg.wingSpan, wingY + 0.22, 0.5], color: '#ff2a2a' },
      { pos: [-cfg.wingSpan, wingY + 0.22, 0.5], color: '#22ff66' },
    ],
    glowMats: [glowMat],
    hoverHeight: 0.75,
  };
}

export const buildG120TP = () =>
  buildLightTrainer({
    bodyColor: '#f4f7fa',
    accentColor: '#f5be18',
    noseColor: '#f5be18',
    code: 'LD-1201',
    wingSpan: 5.0,
    winglets: true,
    blades: 5,
  });

export const buildC182 = () =>
  buildLightTrainer({
    bodyColor: '#f4f7fa',
    accentColor: '#1e3a8a',
    noseColor: '#1e3a8a',
    code: 'A-1821',
    highWing: true,
    wingSpan: 5.2,
    blades: 3,
  });

export const buildT41 = () =>
  buildLightTrainer({
    bodyColor: '#f4f7fa',
    accentColor: '#f05a1f',
    noseColor: '#f05a1f',
    code: 'A-411',
    wingSpan: 4.9,
    blades: 2,
  });

export const buildSGS233 = () =>
  buildLightTrainer({
    bodyColor: '#f4f7fa',
    accentColor: '#f05a1f',
    noseColor: '#f05a1f',
    code: 'G-233',
    highWing: true,
    glider: true,
    wingSpan: 6.8,
  });

export const buildDG1000 = () =>
  buildLightTrainer({
    bodyColor: '#f8fafc',
    accentColor: '#dc2626',
    noseColor: '#dc2626',
    code: 'G-1000',
    glider: true,
    tTail: true,
    winglets: true,
    wingSpan: 7.2,
  });

/* =========================================================================
 * 5. HELIKOPTER BARU: AS332 SUPER PUMA, AW101, AIRBUS H145, AS365 DAUPHIN
 * ========================================================================= */
function buildNewHelicopter(cfg: {
  bodyColor: string;
  camo?: boolean;
  tailTipColor?: string;
  code: string;
  mainBlades: number;
  fenestron?: boolean;
  skids?: boolean;
  scale?: number;
  heavy?: boolean;
}): BuildResult {
  const g = new THREE.Group();
  const s = cfg.scale ?? 1.0;
  const yC = 1.55;
  const skinMat = cfg.camo
    ? matStd('#ffffff', 0.28, 0.56, {
        map: camoTexture('#4b5d36', [{ c: '#6e4c32', n: 15, r: 58 }, { c: '#293422', n: 10, r: 42 }], 5101),
      })
    : matStd('#ffffff', 0.34, 0.4, { map: solidNoiseTexture(cfg.bodyColor, 3651, 0.025) });
  const darkMat = matStd('#1c222a', 0.5, 0.45);
  const bladeMat = matStd('#1d2229', 0.42, 0.42);
  const tipMat = matStd('#f5be18', 0.25, 0.38);
  const glowMat = matStd('#241208', 0.4, 0.4);

  const rx0 = (cfg.heavy ? 1.15 : 0.88) * s;
  const ry0 = (cfg.heavy ? 1.02 : 0.82) * s;

  // Badan kabin aerodinamis lofted
  const cabinGeo = loftZ(-2.2 * s, 3.8 * s, 40, 26, (z, th) => {
    const sn = Math.sin(th);
    const cn = Math.cos(th);
    let rx = rx0;
    let ryT = ry0;
    let ryB = ry0 * 0.78;
    if (z > 1.6 * s) {
      const u = (z - 1.6 * s) / (2.2 * s);
      const t = Math.pow(Math.max(0, 1 - u * u), 0.58);
      rx = rx0 * t + 0.08;
      ryT = ry0 * t + 0.08;
      ryB = ry0 * 0.78 * t + 0.08;
    } else if (z < -0.6 * s) {
      const u = (-0.6 * s - z) / (1.6 * s);
      rx = lerp(rx0, 0.34 * s, smoothstep(0, 1, u));
      ryT = lerp(ry0, 0.36 * s, smoothstep(0, 1, u));
      ryB = lerp(ry0 * 0.78, 0.24 * s, smoothstep(0, 1, u));
    }
    return [sn * rx, cn >= 0 ? cn * ryT : cn * ryB];
  });
  const cabin = mkMesh(cabinGeo, skinMat);
  cabin.position.y = yC;
  g.add(cabin);

  // Kaca kokpit depan panoramik
  const wind = mkMesh(new THREE.SphereGeometry(rx0 * 0.88, 20, 14), matGlass('#0f233b', 0.62));
  wind.scale.set(0.95, 0.78, 1.25);
  wind.position.set(0, yC + 0.18 * s, 2.35 * s);
  g.add(wind);

  // Rumah mesin turbin di atas kabin
  const doghouse = mkMesh(new THREE.CapsuleGeometry(0.46 * s, 2.1 * s, 8, 16), skinMat);
  doghouse.rotation.x = Math.PI / 2;
  doghouse.position.set(0, yC + ry0 * 0.95, 0.1 * s);
  g.add(doghouse);

  // Tail boom memanjang ke belakang
  const boomLen = 4.6 * s;
  const boom = mkMesh(new THREE.CylinderGeometry(0.18 * s, 0.36 * s, boomLen, 16), skinMat);
  boom.rotation.x = Math.PI / 2;
  boom.position.set(0, yC + 0.2 * s, -2.0 * s - boomLen / 2);
  g.add(boom);

  // Sirip ekor tegak
  const tailZ = -2.0 * s - boomLen;
  const finMesh = addVertFin(
    g,
    [
      { spanPos: yC - 0.15, chord: 1.25 * s, leZ: tailZ + 0.9, thick: 0.12, offset: 0 },
      { spanPos: yC + 1.65 * s, chord: 0.65 * s, leZ: tailZ + 0.25, thick: 0.08, offset: 0 },
    ],
    skinMat,
  );

  if (cfg.tailTipColor) {
    const tip = mkMesh(new THREE.BoxGeometry(0.18, 0.34, 0.7 * s), matStd(cfg.tailTipColor, 0.3, 0.35));
    tip.position.set(0, yC + 1.55 * s, tailZ - 0.05);
    g.add(tip);
  }

  // Stabilizer horizontal ekor
  const stab = mkMesh(new THREE.BoxGeometry(2.1 * s, 0.08, 0.45 * s), skinMat);
  stab.position.set(0, yC + 0.25 * s, tailZ + 1.25 * s);
  g.add(stab);

  // Rotor Utama (berputar di sumbu Y!)
  const spinners: SpinnerFx[] = [];
  const mainPivot = new THREE.Group();
  const rotorR = (cfg.heavy ? 5.9 : 4.9) * s;
  for (let i = 0; i < cfg.mainBlades; i++) {
    const arm = new THREE.Group();
    const b = mkMesh(new THREE.BoxGeometry(0.24 * s, 0.04, rotorR), bladeMat);
    b.position.z = rotorR / 2;
    const tp = mkMesh(new THREE.BoxGeometry(0.24 * s, 0.045, 0.38), tipMat);
    tp.position.z = rotorR - 0.19;
    arm.add(b, tp);
    arm.rotation.y = (i * Math.PI * 2) / cfg.mainBlades;
    mainPivot.add(arm);
  }
  const mast = mkMesh(new THREE.CylinderGeometry(0.12 * s, 0.14 * s, 0.65 * s, 12), darkMat);
  mast.position.set(0, yC + ry0 * 1.35, 0.45 * s);
  mainPivot.position.set(0, yC + ry0 * 1.68, 0.45 * s);
  g.add(mast, mainPivot);
  spinners.push({ obj: mainPivot, axis: 'y', speed: 16 });

  // Rotor Ekor (Fenestron tertutup untuk H145/AS365, rotor terbuka untuk Super Puma/AW101 — berputar di sumbu X!)
  const tailPivot = new THREE.Group();
  if (cfg.fenestron) {
    const shroud = mkMesh(new THREE.TorusGeometry(0.56 * s, 0.13 * s, 12, 24), skinMat);
    shroud.rotation.y = Math.PI / 2;
    shroud.position.set(0, yC + 0.38 * s, tailZ + 0.25);
    g.add(shroud);
    for (let i = 0; i < 8; i++) {
      const b = mkMesh(new THREE.BoxGeometry(0.03, 0.45 * s, 0.07), bladeMat);
      const a = (i * Math.PI * 2) / 8;
      b.position.set(0, Math.cos(a) * 0.22 * s, Math.sin(a) * 0.22 * s);
      b.rotation.x = a;
      tailPivot.add(b);
    }
    tailPivot.position.set(0, yC + 0.38 * s, tailZ + 0.25);
  } else {
    for (let i = 0; i < 4; i++) {
      const b = mkMesh(new THREE.BoxGeometry(0.03, 0.95 * s, 0.1), bladeMat);
      const a = (i * Math.PI * 2) / 4;
      b.position.set(0, Math.cos(a) * 0.48 * s, Math.sin(a) * 0.48 * s);
      b.rotation.x = a;
      tailPivot.add(b);
    }
    tailPivot.position.set(0.28 * s, yC + 1.35 * s, tailZ - 0.15);
  }
  g.add(tailPivot);
  spinners.push({ obj: tailPivot, axis: 'x', speed: 28 });

  // Roda pendarat atau Skid tubular hitam
  if (cfg.skids) {
    for (const side of [1, -1]) {
      const tube = mkMesh(new THREE.CylinderGeometry(0.06, 0.06, 3.8 * s, 10), darkMat);
      tube.rotation.x = Math.PI / 2;
      tube.position.set(side * 1.05 * s, 0.16, 0.8 * s);
      const legF = mkMesh(new THREE.CylinderGeometry(0.045, 0.045, 1.05 * s, 8), darkMat);
      legF.position.set(side * 0.85 * s, 0.62, 1.75 * s);
      legF.rotation.z = side * 0.32;
      const legB = mkMesh(new THREE.CylinderGeometry(0.045, 0.045, 1.05 * s, 8), darkMat);
      legB.position.set(side * 0.85 * s, 0.62, -0.25 * s);
      legB.rotation.z = side * 0.32;
      g.add(tube, legF, legB);
    }
  } else {
    addGear(g, 0, 2.55 * s, yC - ry0 * 0.65, 0.22 * s, true);
    addGear(g, 1.15 * s, -0.2 * s, yC - ry0 * 0.6, 0.26 * s, true);
    addGear(g, -1.15 * s, -0.2 * s, yC - ry0 * 0.6, 0.26 * s, true);
  }

  addTniAuMarkings(g, cabin, finMesh, {
    code: cfg.code,
    sideText: 'TNI ANGKATAN UDARA',
    sideX: rx0 * 0.96,
    sideY: yC - 0.05,
    sideZ: 0.4 * s,
    roundelZ: -1.2 * s,
    finY: yC + 0.95 * s,
    finZ: tailZ + 0.15,
    finThick: 0.18,
    textColor: cfg.camo ? '#f8fafc' : '#0f172a',
  });

  return {
    group: g,
    nozzles: [],
    spinners,
    navLights: [
      { pos: [1.1 * s, yC + 0.2, 1.5 * s], color: '#ff2a2a' },
      { pos: [-1.1 * s, yC + 0.2, 1.5 * s], color: '#22ff66' },
      { pos: [0, yC + 1.65 * s, tailZ - 0.1], color: '#ffffff', blink: 'strobe' },
    ],
    glowMats: [glowMat],
    hoverHeight: 0.85,
    rotorWash: true,
  };
}

export const buildSuperPuma = () =>
  buildNewHelicopter({
    bodyColor: '#e4e8ed',
    tailTipColor: '#f5be18',
    code: 'HX-3202',
    mainBlades: 4,
    scale: 1.02,
  });

export const buildAW101 = () =>
  buildNewHelicopter({
    bodyColor: '#4b5d36',
    camo: true,
    code: 'H-5101',
    mainBlades: 5,
    scale: 1.12,
    heavy: true,
  });

export const buildH145 = () =>
  buildNewHelicopter({
    bodyColor: '#bfc7d0',
    code: 'H-1451',
    mainBlades: 5,
    fenestron: true,
    skids: true,
    scale: 0.94,
  });

export const buildAS365 = () =>
  buildNewHelicopter({
    bodyColor: '#d0d7de',
    code: 'H-3651',
    mainBlades: 4,
    fenestron: true,
    scale: 0.96,
  });
