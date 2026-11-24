import * as THREE from 'three';
import {
  addDecal,
  buildAirfoilSurface,
  buildLoftGeometry,
  lerp,
  mkMesh,
  smoothstep,
  type AirfoilSection,
} from './aeroGeo';
import {
  cockpitWindowTexture,
  flagTexture,
  panelBumpTexture,
  roundelTexture,
  solidNoiseTexture,
  textTexture,
} from './textures';
import type { BuildResult, SpinnerFx, V3 } from './proceduralBuilder';

/* =========================================================================
 * Builder 3D Detail Tinggi:
 * 1. C-130J-30 Super Hercules TNI AU (A-1342 / Skadron Udara 31) — Abu Taktis
 * 2. KAI KT-1B Wong Bee — Jupiter Aerobatic Team (LD-0110 / #10) — Merah-Putih
 * ========================================================================= */

function cloneRep(tex: THREE.Texture, rx: number, ry: number) {
  const t = tex.clone();
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.needsUpdate = true;
  return t;
}

function loVizRoundel() {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const ctx = c.getContext('2d')!;
  ctx.strokeStyle = '#1d242c';
  ctx.lineWidth = 22;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
    const x = S / 2 + Math.cos(a) * 102;
    const y = S / 2 + 8 + Math.sin(a) * 102;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

function makePropeller(blades: number, radius: number, chord: number, bladeMat: THREE.Material, tipMat: THREE.Material, hubR: number, hubMat: THREE.Material) {
  const pivot = new THREE.Group();
  for (let i = 0; i < blades; i++) {
    const arm = new THREE.Group();
    const b = mkMesh(new THREE.BoxGeometry(chord, radius - hubR, 0.03), bladeMat);
    b.position.y = hubR + (radius - hubR) / 2;
    b.rotation.y = 0.34;
    const tip = mkMesh(new THREE.BoxGeometry(chord * 0.9, 0.14, 0.034), tipMat);
    tip.position.y = radius - 0.07;
    tip.rotation.y = 0.34;
    arm.add(b, tip);
    arm.rotation.z = (i * Math.PI * 2) / blades;
    pivot.add(arm);
  }
  const hub = mkMesh(new THREE.SphereGeometry(hubR, 18, 12), hubMat);
  hub.scale.z = 0.7;
  pivot.add(hub);

  const blurMat = new THREE.MeshBasicMaterial({ color: '#dbe4ec', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const blur = new THREE.Mesh(new THREE.RingGeometry(hubR, radius, 64), blurMat);
  blur.userData.role = 'blur';
  blur.visible = false;

  const wrap = new THREE.Group();
  wrap.add(pivot, blur);
  return { wrap, pivot, blur };
}

/* =========================================================================
 * 1. C-130J-30 SUPER HERCULES TNI AU (A-1342) — LIVERY ABU-ABU TAKTIS MODERN
 * ========================================================================= */
export function buildDetailedC130J(): BuildResult {
  const g = new THREE.Group();
  const yC = 1.32;
  const bump = panelBumpTexture(1342);
  const greyTex = solidNoiseTexture('#8c949c', 1342, 0.028);

  const fuseMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    map: cloneRep(greyTex, 2.5, 5.0),
    bumpMap: cloneRep(bump, 2.6, 5.2),
    bumpScale: 0.015,
    metalness: 0.38,
    roughness: 0.54,
  });
  const wingMat = new THREE.MeshStandardMaterial({
    color: '#9199a1',
    bumpMap: cloneRep(bump, 2.0, 2.0),
    bumpScale: 0.014,
    metalness: 0.4,
    roughness: 0.52,
  });
  const radomeMat = new THREE.MeshStandardMaterial({ color: '#464d54', metalness: 0.25, roughness: 0.58 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: '#2b3038', metalness: 0.82, roughness: 0.34 });
  const bladeMat = new THREE.MeshStandardMaterial({ color: '#1b1f24', metalness: 0.42, roughness: 0.48 });
  const tipMat = new THREE.MeshStandardMaterial({ color: '#eab308', metalness: 0.2, roughness: 0.5 });
  const strutMat = new THREE.MeshStandardMaterial({ color: '#cfd5dc', metalness: 0.7, roughness: 0.32 });
  const tireMat = new THREE.MeshStandardMaterial({ color: '#15171a', metalness: 0.06, roughness: 0.92 });
  const internalMat = new THREE.MeshStandardMaterial({ color: '#4fa3c7', metalness: 0.7, roughness: 0.35 });
  const cargoMat = new THREE.MeshStandardMaterial({ color: '#c49a3c', metalness: 0.3, roughness: 0.6 });
  const glowMat = new THREE.MeshStandardMaterial({ color: '#261208', metalness: 0.6, roughness: 0.4 });

  // Badan panjang C-130J-30 (34,69 m -> 12.6 unit) dengan ekor upsweep ramp kargo & hidung tumpul khas Hercules
  const cross = (z: number, th: number): [number, number] => {
    const s = Math.sin(th);
    const c = Math.cos(th);
    let rx = 0.8;
    let ryT = 0.84;
    let ryB = 0.78;
    let ys = 0;

    if (z >= 4.4) {
      // Hidung & kaca kokpit bertingkat khas Hercules
      const t = Math.max(0, Math.min(1, (6.25 - z) / (6.25 - 4.4)));
      const r = Math.pow(t, 0.56);
      rx = 0.8 * r;
      ryT = 0.82 * r;
      ryB = 0.76 * r;
      ys = -0.24 * Math.pow(1 - t, 1.3);
    } else if (z < -2.3) {
      // Ekor melengkung naik untuk pintu ramp kargo belakang
      const t = Math.max(0, Math.min(1, (-2.3 - z) / (-2.3 - -6.35)));
      rx = lerp(0.8, 0.14, smoothstep(0, 1, t));
      ryT = lerp(0.84, 0.24, smoothstep(0, 1, t));
      ryB = lerp(0.76, 0.14, smoothstep(0, 1, t));
      ys = 0.92 * Math.pow(t, 1.35);
    }
    // Penampang agak kotak-bulat (superellipse) khas kabin kargo C-130
    const px = Math.sign(s) * Math.pow(Math.abs(s), 0.82) * rx;
    const py = Math.sign(c) * Math.pow(Math.abs(c), 0.82) * (c >= 0 ? ryT : ryB);
    return [px, yC + ys + py];
  };

  const bodyZs = Array.from({ length: 64 }, (_, i) => lerp(-6.35, 5.75, i / 63));
  const fuseMesh = mkMesh(buildLoftGeometry(bodyZs.map((z) => ({ z, point: (th) => cross(z, th) })), 52, false, true), fuseMat);
  const noseZs = Array.from({ length: 16 }, (_, i) => lerp(5.72, 6.25, i / 15));
  g.add(fuseMesh, mkMesh(buildLoftGeometry(noseZs.map((z) => ({ z, point: (th) => cross(z, th) })), 36), radomeMat));

  // Fairing pangkal sayap atas & sponson roda pendarat samping
  const wingFairing = mkMesh(new THREE.CapsuleGeometry(0.45, 2.6, 8, 18), fuseMat);
  wingFairing.rotation.x = Math.PI / 2;
  wingFairing.scale.set(1.45, 0.55, 1);
  wingFairing.position.set(0, 2.15, 0.65);
  g.add(wingFairing);

  for (const s of [1, -1]) {
    const sponson = mkMesh(new THREE.CapsuleGeometry(0.32, 2.45, 8, 18), fuseMat);
    sponson.rotation.x = Math.PI / 2;
    sponson.position.set(s * 0.78, 0.72, -0.35);
    g.add(sponson);
  }

  // Sayap tinggi lebar (lebar sayap 39,7 m -> ±7.15 unit!) berprofil airfoil
  const wingSecs: AirfoilSection[] = [
    { spanPos: 0.65, leZ: 1.7, teZ: -0.45, offset: 2.18, thick: 0.34 },
    { spanPos: 3.4, leZ: 1.48, teZ: -0.25, offset: 2.22, thick: 0.24 },
    { spanPos: 7.15, leZ: 0.92, teZ: 0.12, offset: 2.26, thick: 0.12 },
  ];
  const wingR = mkMesh(buildAirfoilSurface(wingSecs, 'horizontal', 1, 0.12), wingMat);
  const wingL = mkMesh(buildAirfoilSurface(wingSecs, 'horizontal', -1, 0.12), wingMat);
  g.add(wingR, wingL);

  // Stabilator belakang tinggi & sirip ekor tegak besar (tinggi 11,9 m -> y = 4.65)
  const stabSecs: AirfoilSection[] = [
    { spanPos: 0.24, leZ: -4.65, teZ: -6.15, offset: 2.18, thick: 0.14 },
    { spanPos: 2.85, leZ: -5.25, teZ: -6.02, offset: 2.22, thick: 0.07 },
  ];
  g.add(
    mkMesh(buildAirfoilSurface(stabSecs, 'horizontal', 1, 0), wingMat),
    mkMesh(buildAirfoilSurface(stabSecs, 'horizontal', -1, 0), wingMat),
  );

  const finMesh = mkMesh(
    buildAirfoilSurface(
      [
        { spanPos: 2.1, leZ: -2.95, teZ: -6.22, offset: 0, thick: 0.2 },
        { spanPos: 2.75, leZ: -4.45, teZ: -6.26, offset: 0, thick: 0.16 },
        { spanPos: 4.65, leZ: -5.42, teZ: -6.22, offset: 0, thick: 0.09 },
      ],
      'vertical',
      1,
      0,
    ),
    wingMat,
  );
  g.add(finMesh);

  // 4 Mesin Rolls-Royce AE2100D3 + Baling-baling 6 Bilah Scimitar + 2 Tangki Eksternal Bawah Sayap
  const spinners: SpinnerFx[] = [];
  for (const x of [2.05, 4.15, -2.05, -4.15]) {
    const nac = mkMesh(new THREE.CapsuleGeometry(0.28, 2.25, 8, 18), wingMat);
    nac.rotation.x = Math.PI / 2;
    nac.scale.set(1, 1.15, 1);
    nac.position.set(x, 1.96, 1.1);
    const cowl = mkMesh(new THREE.CylinderGeometry(0.18, 0.26, 0.42, 18), darkMetal);
    cowl.rotation.x = Math.PI / 2;
    cowl.position.set(x, 1.96, 2.38);
    const scoop = mkMesh(new THREE.BoxGeometry(0.24, 0.16, 0.55), darkMetal);
    scoop.position.set(x, 1.66, 2.05);
    g.add(nac, cowl, scoop);

    const p = makePropeller(6, 0.86, 0.12, bladeMat, tipMat, 0.12, darkMetal);
    p.wrap.position.set(x, 1.96, 2.55);
    g.add(p.wrap);
    spinners.push({ obj: p.pivot, axis: 'z', speed: 28, blur: p.blur });

    // Inti mesin (X-Ray)
    const core = mkMesh(new THREE.CylinderGeometry(0.18, 0.18, 2.0, 12), internalMat, 'internal');
    core.rotation.x = Math.PI / 2;
    core.position.set(x, 1.96, 1.1);
    g.add(core);
  }

  // 2 Tangki eksternal bawah sayap di antara mesin dalam & luar (khas C-130J)
  for (const s of [1, -1]) {
    const pylon = mkMesh(new THREE.BoxGeometry(0.08, 0.35, 1.1), wingMat);
    pylon.position.set(s * 3.1, 1.88, 0.65);
    const tank = mkMesh(new THREE.CapsuleGeometry(0.22, 1.9, 8, 18), wingMat);
    tank.rotation.x = Math.PI / 2;
    tank.position.set(s * 3.1, 1.62, 0.72);
    g.add(pylon, tank);
  }

  // Kaca kokpit wrap-around
  addDecal(g, fuseMesh, [0, 1.72, 5.45], [-0.52, 0, 0], [1.35, 0.65, 1.2], cockpitWindowTexture('transport'));

  // Roda pendarat: nose twin + tandem main wheels di bawah sponson
  const nStrut = mkMesh(new THREE.CylinderGeometry(0.055, 0.048, 0.45, 12), strutMat);
  nStrut.position.set(0, 0.4, 4.75);
  g.add(nStrut);
  for (const ox of [-0.11, 0.11]) {
    const t = mkMesh(new THREE.CylinderGeometry(0.19, 0.19, 0.11, 20), tireMat);
    t.rotation.z = Math.PI / 2;
    t.position.set(ox, 0.19, 4.75);
    g.add(t);
  }
  for (const s of [1, -1]) {
    for (const tz of [-0.08, -0.68]) {
      const t = mkMesh(new THREE.CylinderGeometry(0.25, 0.25, 0.18, 22), tireMat);
      t.rotation.z = Math.PI / 2;
      t.position.set(s * 0.82, 0.25, tz);
      const h = mkMesh(new THREE.CylinderGeometry(0.13, 0.13, 0.195, 14), strutMat);
      h.rotation.z = Math.PI / 2;
      h.position.copy(t.position);
      g.add(t, h);
    }
  }

  // Internal X-Ray (rangka kargo & 4 palet muatan)
  for (let z = -4.0; z <= 4.6; z += 0.85) {
    const rib = mkMesh(new THREE.TorusGeometry(0.68, 0.024, 6, 30), internalMat, 'internal');
    rib.position.set(0, yC, z);
    g.add(rib);
  }
  for (let i = 0; i < 4; i++) {
    const pal = mkMesh(new THREE.BoxGeometry(0.92, 0.52, 1.0), cargoMat, 'internal');
    pal.position.set(0, 1.0, 2.5 - i * 1.45);
    g.add(pal);
  }

  // Livery & Marka TNI AU Persis Foto Infografis (A-1342, lo-viz roundel, TNI ANGKATAN UDARA)
  const loViz = loVizRoundel();
  const flagTex = flagTexture();
  const tniAuLong = textTexture('TNI ANGKATAN UDARA', { color: '#1b222a', aspect: 9.5 });
  const tailCode = textTexture('A-1342', { color: '#1b222a', aspect: 3.8 });
  const noseNum = textTexture('42', { color: '#1b222a', aspect: 1.5 });

  addDecal(g, wingR, [5.5, 2.34, 0.58], [-Math.PI / 2, 0, 0], [1.05, 1.05, 0.45], loViz);
  addDecal(g, wingL, [-5.5, 2.34, 0.58], [-Math.PI / 2, 0, 0], [1.05, 1.05, 0.45], loViz);

  for (const s of [1, -1]) {
    const rot: V3 = [0, (s * Math.PI) / 2, 0];
    addDecal(g, finMesh, [s * 0.07, 3.85, -5.58], rot, [0.85, 0.55, 0.1], flagTex);
    addDecal(g, finMesh, [s * 0.07, 3.15, -5.25], rot, [1.25, 0.32, 0.1], tailCode);
    addDecal(g, fuseMesh, [s * 0.78, 1.62, 2.35], rot, [2.6, 0.24, 0.24], tniAuLong);
    addDecal(g, fuseMesh, [s * 0.68, 1.38, 4.45], rot, [0.46, 0.3, 0.22], noseNum);
    addDecal(g, fuseMesh, [s * 0.78, 1.45, -1.75], rot, [0.68, 0.68, 0.24], loViz);
  }

  return {
    group: g,
    nozzles: [],
    spinners,
    navLights: [
      { pos: [7.18, 2.26, 0.55], color: '#ff2a2a' },
      { pos: [-7.18, 2.26, 0.55], color: '#22ff66' },
      { pos: [0, 4.7, -6.18], color: '#ffffff', blink: 'strobe' },
      { pos: [0, 2.28, -1.2], color: '#ff3030', blink: 'beacon' },
    ],
    glowMats: [glowMat],
    hoverHeight: 0.72,
  };
}

/* =========================================================================
 * 2. KAI KT-1B WONG BEE — JUPITER AEROBATIC TEAM (LD-0110 / #10)
 * ========================================================================= */
function kt1JupiterBodyTexture() {
  const W = 1024;
  const H = 1024;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;

  // Merah menyala Jupiter Aerobatic Team (persis foto!)
  ctx.fillStyle = '#cf1020';
  ctx.fillRect(0, 0, W, H);

  // Bidang PUTIH bersih memanjang di kedua sisi badan dari hidung ke ekor (seperti foto #10!)
  for (const cx of [W * 0.25, W * 0.75]) {
    ctx.fillStyle = '#f5f7fa';
    ctx.beginPath();
    ctx.moveTo(cx - W * 0.08, H * 0.88);
    ctx.quadraticCurveTo(cx - W * 0.02, H * 0.45, cx - W * 0.14, H * 0.06);
    ctx.lineTo(cx + W * 0.09, H * 0.06);
    ctx.quadraticCurveTo(cx + W * 0.09, H * 0.48, cx + W * 0.03, H * 0.88);
    ctx.closePath();
    ctx.fill();
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

function kt1JupiterTailTexture() {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#cf1020';
  ctx.fillRect(0, 0, S, S);
  // Pangkal bawah ekor putih + garis vertikal putih di tepi belakang (persis foto!)
  ctx.fillStyle = '#f5f7fa';
  ctx.fillRect(0, S * 0.74, S, S * 0.26);
  ctx.fillRect(S * 0.76, 0, S * 0.14, S);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

export function buildDetailedKT1B(): BuildResult {
  const g = new THREE.Group();
  const yC = 1.48;
  const bump = panelBumpTexture(1010);

  const fuseMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    map: kt1JupiterBodyTexture(),
    bumpMap: cloneRep(bump, 2.0, 4.0),
    bumpScale: 0.012,
    metalness: 0.36,
    roughness: 0.3,
  });
  const redWingMat = new THREE.MeshStandardMaterial({
    color: '#cf1020',
    bumpMap: cloneRep(bump, 1.5, 1.5),
    bumpScale: 0.011,
    metalness: 0.36,
    roughness: 0.32,
  });
  const tailMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    map: kt1JupiterTailTexture(),
    bumpMap: cloneRep(bump, 1.2, 1.2),
    bumpScale: 0.01,
    metalness: 0.36,
    roughness: 0.32,
  });
  const whiteSpinnerMat = new THREE.MeshStandardMaterial({ color: '#f5f7fa', metalness: 0.3, roughness: 0.28 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: '#2b3038', metalness: 0.82, roughness: 0.32 });
  const bladeMat = new THREE.MeshStandardMaterial({ color: '#24282e', metalness: 0.45, roughness: 0.44 });
  const whiteTipMat = new THREE.MeshStandardMaterial({ color: '#f5f7fa', metalness: 0.2, roughness: 0.4 });
  const frameMat = new THREE.MeshStandardMaterial({ color: '#1b2026', metalness: 0.5, roughness: 0.45 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#a8cce6',
    metalness: 0.12,
    roughness: 0.04,
    transparent: true,
    opacity: 0.46,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    envMapIntensity: 2.0,
    side: THREE.DoubleSide,
  });
  const strutMat = new THREE.MeshStandardMaterial({ color: '#cfd5dc', metalness: 0.7, roughness: 0.3 });
  const tireMat = new THREE.MeshStandardMaterial({ color: '#15171a', metalness: 0.06, roughness: 0.92 });
  const internalMat = new THREE.MeshStandardMaterial({ color: '#4fa3c7', metalness: 0.7, roughness: 0.35 });
  const coreMat = new THREE.MeshStandardMaterial({ color: '#c47a3c', metalness: 0.85, roughness: 0.3 });
  const glowMat = new THREE.MeshStandardMaterial({ color: '#261208', metalness: 0.6, roughness: 0.4 });

  // Badan KT-1B Wong Bee ramping aerodinamis
  const cross = (z: number, th: number): [number, number] => {
    const s = Math.sin(th);
    const c = Math.cos(th);
    let rx = 0.54;
    let ryT = 0.58;
    let ryB = 0.54;
    let ys = 0;
    if (z >= 4.0) {
      const t = Math.max(0, Math.min(1, (6.2 - z) / (6.2 - 4.0)));
      rx = lerp(0.28, 0.5, Math.pow(t, 0.7));
      ryT = lerp(0.28, 0.54, Math.pow(t, 0.7));
      ryB = lerp(0.28, 0.5, Math.pow(t, 0.7));
    } else if (z < -1.0) {
      const t = Math.max(0, Math.min(1, (-1.0 - z) / (-1.0 - -6.3)));
      rx = lerp(0.54, 0.14, smoothstep(0, 1, t));
      ryT = lerp(0.56, 0.24, smoothstep(0, 1, t));
      ryB = lerp(0.52, 0.16, smoothstep(0, 1, t));
      ys = lerp(0, 0.12, t);
    }
    return [s * rx, yC + ys + c * (c >= 0 ? ryT : ryB)];
  };

  const bodyZs = Array.from({ length: 56 }, (_, i) => lerp(-6.3, 6.2, i / 55));
  const fuseMesh = mkMesh(buildLoftGeometry(bodyZs.map((z) => ({ z, point: (th) => cross(z, th) })), 48, true, true), fuseMat);
  g.add(fuseMesh);

  // Spinner PUTIH bersih (persis foto Jupiter!) + baling-baling 4 bilah Hartzell
  const spinnerPts = [
    new THREE.Vector2(0.29, 6.18),
    new THREE.Vector2(0.24, 6.48),
    new THREE.Vector2(0.12, 6.8),
    new THREE.Vector2(0.015, 6.96),
  ];
  const spinnerGeo = new THREE.LatheGeometry(spinnerPts, 28);
  spinnerGeo.rotateX(Math.PI / 2);
  const spinnerMesh = mkMesh(spinnerGeo, whiteSpinnerMat);
  spinnerMesh.position.y = yC;
  g.add(spinnerMesh);

  const prop = makePropeller(4, 1.32, 0.15, bladeMat, whiteTipMat, 0.14, whiteSpinnerMat);
  prop.wrap.position.set(0, yC, 6.45);
  g.add(prop.wrap);
  const spinners: SpinnerFx[] = [{ obj: prop.pivot, axis: 'z', speed: 38, blur: prop.blur }];

  // Pipa knalpot PT6A-62 di kedua sisi hidung
  for (const s of [1, -1]) {
    const ex = mkMesh(new THREE.CylinderGeometry(0.075, 0.095, 0.3, 10), darkMetal);
    ex.rotation.z = (Math.PI / 2) * s;
    ex.position.set(s * 0.46, yC + 0.06, 4.95);
    g.add(ex);
  }

  // Kanopi gelembung tandem lebar transparan + 2 kursi Martin-Baker terlihat langsung
  const canopyZs = Array.from({ length: 28 }, (_, i) => lerp(0.7, 3.85, i / 27));
  g.add(
    mkMesh(
      buildLoftGeometry(
        canopyZs.map((z) => {
          const u = (z - 0.7) / 3.15;
          const arch = Math.sin(Math.pow(u, 0.74) * Math.PI);
          return {
            z,
            point: (th) => {
              const a = (th / (Math.PI * 2)) * Math.PI - Math.PI / 2;
              return [Math.sin(a) * 0.44 * Math.pow(arch, 0.56), 1.98 + Math.cos(a) * 0.64 * arch];
            },
          };
        }),
        32,
      ),
      glassMat,
      'glass',
    ),
  );
  const midArch = mkMesh(new THREE.TorusGeometry(0.42, 0.024, 8, 22, Math.PI), frameMat);
  midArch.position.set(0, 2.0, 2.28);
  g.add(midArch);
  for (const [sz, sy] of [
    [2.82, 1.96],
    [1.72, 2.08],
  ]) {
    const pan = mkMesh(new THREE.BoxGeometry(0.36, 0.08, 0.38), frameMat, 'cockpit');
    pan.position.set(0, sy, sz);
    const back = mkMesh(new THREE.BoxGeometry(0.34, 0.48, 0.09), frameMat, 'cockpit');
    back.position.set(0, sy + 0.22, sz - 0.18);
    back.rotation.x = -0.3;
    const head = mkMesh(new THREE.BoxGeometry(0.22, 0.16, 0.1), darkMetal, 'cockpit');
    head.position.set(0, sy + 0.45, sz - 0.24);
    g.add(pan, back, head);
  }

  // Sayap lurus rendah merah + dihedral
  const wingSecs: AirfoilSection[] = [
    { spanPos: 0.45, leZ: 1.85, teZ: -0.2, offset: 1.04, thick: 0.21 },
    { spanPos: 3.3, leZ: 1.4, teZ: -0.1, offset: 1.24, thick: 0.15 },
    { spanPos: 6.35, leZ: 0.92, teZ: 0.02, offset: 1.46, thick: 0.08 },
  ];
  const wingR = mkMesh(buildAirfoilSurface(wingSecs, 'horizontal', 1, 0.12), redWingMat);
  const wingL = mkMesh(buildAirfoilSurface(wingSecs, 'horizontal', -1, 0.12), redWingMat);
  g.add(wingR, wingL);

  const stabSecs: AirfoilSection[] = [
    { spanPos: 0.18, leZ: -4.7, teZ: -5.9, offset: 1.66, thick: 0.09 },
    { spanPos: 2.35, leZ: -5.1, teZ: -5.86, offset: 1.66, thick: 0.045 },
  ];
  g.add(
    mkMesh(buildAirfoilSurface(stabSecs, 'horizontal', 1, 0), redWingMat),
    mkMesh(buildAirfoilSurface(stabSecs, 'horizontal', -1, 0), redWingMat),
  );

  // Sirip ekor tegak merah dengan strip putih belakang (persis foto Jupiter!)
  const finMesh = mkMesh(
    buildAirfoilSurface(
      [
        { spanPos: 1.76, leZ: -3.7, teZ: -6.22, offset: 0, thick: 0.13 },
        { spanPos: 3.78, leZ: -5.25, teZ: -6.18, offset: 0, thick: 0.065 },
      ],
      'vertical',
      1,
      0,
    ),
    tailMat,
  );
  g.add(finMesh);

  // Roda pendarat tiga titik
  const nStrut = mkMesh(new THREE.CylinderGeometry(0.042, 0.036, 0.72, 12), strutMat);
  nStrut.position.set(0, 0.56, 4.75);
  const nt = mkMesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 22), tireMat);
  nt.rotation.z = Math.PI / 2;
  nt.position.set(0, 0.2, 4.75);
  g.add(nStrut, nt);
  for (const s of [1, -1]) {
    const ms = mkMesh(new THREE.CylinderGeometry(0.046, 0.04, 0.78, 12), strutMat);
    ms.position.set(s * 1.55, 0.65, 0.65);
    const mt = mkMesh(new THREE.CylinderGeometry(0.26, 0.26, 0.18, 22), tireMat);
    mt.rotation.z = Math.PI / 2;
    mt.position.set(s * 1.55, 0.26, 0.65);
    g.add(ms, mt);
  }

  // Internal X-Ray
  for (let z = -5.0; z <= 5.0; z += 0.9) {
    const rib = mkMesh(new THREE.TorusGeometry(0.38, 0.02, 6, 26), internalMat, 'internal');
    rib.position.set(0, yC, z);
    g.add(rib);
  }
  const core = mkMesh(new THREE.CylinderGeometry(0.26, 0.26, 1.9, 16), coreMat, 'internal');
  core.rotation.x = Math.PI / 2;
  core.position.set(0, yC, 4.85);
  g.add(core);

  // Decal Persis Foto: "THE JUPITERS", nomor "10", Roundel TNI AU, "TNI AU", Bendera Merah-Putih
  const roundelTex = roundelTexture();
  const flagTex = flagTexture();
  const jupitersTex = textTexture('THE JUPITERS', { color: '#cf1020', stroke: '#ffffff', aspect: 5.2 });
  const num10Tex = textTexture('10', { color: '#ffffff', aspect: 1.5 });
  const tniAuTex = textTexture('TNI AU', { color: '#1b2a4a', aspect: 3.8 });
  const tailCodeTex = textTexture('LD-0110', { color: '#ffffff', aspect: 4.0 });

  addDecal(g, wingR, [4.35, 1.48, 0.55], [-Math.PI / 2, 0, 0], [1.0, 1.0, 0.45], roundelTex);
  addDecal(g, wingL, [-4.35, 1.48, 0.55], [-Math.PI / 2, 0, 0], [1.0, 1.0, 0.45], roundelTex);

  for (const s of [1, -1]) {
    const rot: V3 = [0, (s * Math.PI) / 2, 0];
    addDecal(g, finMesh, [s * 0.05, 3.05, -5.5], rot, [0.68, 0.44, 0.08], flagTex);
    addDecal(g, finMesh, [s * 0.05, 3.55, -5.62], rot, [0.95, 0.24, 0.08], tailCodeTex);
    addDecal(g, fuseMesh, [s * 0.48, 1.66, 3.75], rot, [0.5, 0.34, 0.22], num10Tex);
    addDecal(g, fuseMesh, [s * 0.52, 1.38, 3.1], rot, [1.9, 0.38, 0.24], jupitersTex);
    addDecal(g, fuseMesh, [s * 0.42, 1.52, -1.85], rot, [0.55, 0.55, 0.22], roundelTex);
    addDecal(g, fuseMesh, [s * 0.38, 1.52, -2.85], rot, [1.1, 0.28, 0.2], tniAuTex);
  }

  return {
    group: g,
    nozzles: [{ pos: [0, 1.45, -6.35], r: 0.12, kind: 'smoke' }],
    spinners,
    navLights: [
      { pos: [6.38, 1.46, 0.5], color: '#ff2a2a' },
      { pos: [-6.38, 1.46, 0.5], color: '#22ff66' },
      { pos: [0, 3.84, -6.14], color: '#ffffff', blink: 'strobe' },
      { pos: [0, 2.15, -1.6], color: '#ff3030', blink: 'beacon' },
    ],
    glowMats: [glowMat],
    hoverHeight: 0.8,
  };
}
