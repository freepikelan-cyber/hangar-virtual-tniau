import * as THREE from 'three';
import { buildLoftGeometry, mkMesh } from './aeroGeo';
import { flagTexture, roundelTexture, textTexture } from './textures';
import type { BuildResult } from './proceduralBuilder';

/** Membuat tekstur tenunan kain ripstop/Nomex militer + bump map agar baju tampak seperti kain nyata. */
function makeFabricTextures(baseHex: string, seed = 700): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);

  // Pola anyaman ripstop halus + variasi serat kain
  ctx.strokeStyle = 'rgba(0,0,0,0.14)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 256; i += 8) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 256);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(256, i);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  for (let i = 4; i < 256; i += 16) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 256);
    ctx.stroke();
  }

  // Noise halus pada kain
  let s = seed;
  for (let i = 0; i < 900; i++) {
    s = (s * 16807) % 2147483647;
    const x = s % 256;
    s = (s * 16807) % 2147483647;
    const y = s % 256;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.05)';
    ctx.fillRect(x, y, 2, 2);
  }

  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(3, 3);
  map.needsUpdate = true;

  // Bump map dari pola ripstop + lipatan kain
  const bc = document.createElement('canvas');
  bc.width = 256;
  bc.height = 256;
  const bctx = bc.getContext('2d')!;
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, 256, 256);
  bctx.strokeStyle = '#606060';
  for (let i = 0; i < 256; i += 8) {
    bctx.beginPath();
    bctx.moveTo(i, 0);
    bctx.lineTo(i, 256);
    bctx.stroke();
    bctx.beginPath();
    bctx.moveTo(0, i);
    bctx.lineTo(256, i);
    bctx.stroke();
  }
  const bump = new THREE.CanvasTexture(bc);
  bump.wrapS = THREE.RepeatWrapping;
  bump.wrapT = THREE.RepeatWrapping;
  bump.repeat.set(3, 3);
  bump.needsUpdate = true;

  return { map, bump };
}

/** Membuat tekstur peta taktis GPS menyala untuk layar Flight Computer & GPS di paha kiri. */
function makeFlightComputerTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 320;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#091b2a';
  ctx.fillRect(0, 0, 256, 320);

  ctx.strokeStyle = 'rgba(0, 255, 170, 0.25)';
  ctx.lineWidth = 1;
  for (let x = 24; x < 256; x += 28) {
    ctx.beginPath();
    ctx.moveTo(x, 36);
    ctx.lineTo(x, 286);
    ctx.stroke();
  }
  for (let y = 44; y < 286; y += 28) {
    ctx.beginPath();
    ctx.moveTo(12, y);
    ctx.lineTo(244, y);
    ctx.stroke();
  }

  ctx.strokeStyle = '#00ffaa';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(128, 162, 68, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(128, 162, 34, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#ffb703';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(46, 245);
  ctx.lineTo(128, 162);
  ctx.lineTo(192, 92);
  ctx.stroke();

  ctx.fillStyle = '#0e2d4a';
  ctx.fillRect(0, 0, 256, 34);
  ctx.fillRect(0, 286, 256, 34);
  ctx.fillStyle = '#00ffaa';
  ctx.font = 'bold 14px monospace';
  ctx.fillText('TNI AU • GPS EFB', 16, 22);
  ctx.fillStyle = '#ffb703';
  ctx.fillText('HDG 045  ALT 28K  9G', 14, 308);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Model 3D Realistis Museum-Grade sesuai referensi:
 * G-SUIT (CSU-13B/P) + FLIGHT SUIT (FRW-2) + SURVIVAL VEST MOLLE + DUAL LPU LOBES
 * + HARNESS X-STRAP KURSI LONTAR + FLIGHT COMPUTER GPS + KNEE PADS + MODERN BOOTS
 */
export function buildDetailedGSuit(): BuildResult {
  const g = new THREE.Group();
  const glowMats: THREE.MeshStandardMaterial[] = [];

  const suitTex = makeFabricTextures('#525d3a', 731);
  const bladderTex = makeFabricTextures('#4f574c', 732);
  const vestTex = makeFabricTextures('#424c32', 733);
  const lobeTex = makeFabricTextures('#7d8b7d', 734);

  const flightSuitMat = new THREE.MeshStandardMaterial({
    map: suitTex.map,
    bumpMap: suitTex.bump,
    bumpScale: 0.035,
    roughness: 0.88,
    metalness: 0.02,
  });
  const bladderMat = new THREE.MeshStandardMaterial({
    map: bladderTex.map,
    bumpMap: bladderTex.bump,
    bumpScale: 0.03,
    roughness: 0.68,
    metalness: 0.1,
    emissive: new THREE.Color('#000000'),
    emissiveIntensity: 0,
  });
  const airTubeMat = new THREE.MeshStandardMaterial({
    color: '#1e242b',
    roughness: 0.52,
    metalness: 0.22,
    emissive: new THREE.Color('#000000'),
    emissiveIntensity: 0,
  });
  const vestMat = new THREE.MeshStandardMaterial({
    map: vestTex.map,
    bumpMap: vestTex.bump,
    bumpScale: 0.04,
    roughness: 0.82,
    metalness: 0.06,
  });
  const lobeMat = new THREE.MeshStandardMaterial({
    map: lobeTex.map,
    bumpMap: lobeTex.bump,
    bumpScale: 0.025,
    roughness: 0.72,
    metalness: 0.08,
  });
  const strapMat = new THREE.MeshStandardMaterial({
    color: '#1b2024',
    roughness: 0.85,
    metalness: 0.06,
  });
  const kneePadMat = new THREE.MeshStandardMaterial({
    color: '#3f423d',
    roughness: 0.5,
    metalness: 0.18,
  });
  const bootMat = new THREE.MeshStandardMaterial({
    color: '#6b654a', // Olive-tan modern combat boots sesuai referensi
    bumpMap: suitTex.bump,
    bumpScale: 0.03,
    roughness: 0.78,
    metalness: 0.05,
  });
  const soleMat = new THREE.MeshStandardMaterial({
    color: '#232724',
    roughness: 0.9,
    metalness: 0.04,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: '#c0cbd6',
    roughness: 0.24,
    metalness: 0.9,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: '#252c35',
    roughness: 0.36,
    metalness: 0.76,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: '#ffb703',
    roughness: 0.3,
    metalness: 0.7,
  });
  const orangeSurvivalMat = new THREE.MeshStandardMaterial({
    color: '#f97316',
    roughness: 0.42,
    metalness: 0.12,
  });
  const gloveMat = new THREE.MeshStandardMaterial({
    color: '#414a37',
    bumpMap: suitTex.bump,
    bumpScale: 0.02,
    roughness: 0.8,
    metalness: 0.04,
  });
  const platformMat = new THREE.MeshStandardMaterial({
    color: '#11274a',
    roughness: 0.34,
    metalness: 0.7,
  });
  const platformGlow = new THREE.MeshStandardMaterial({
    color: '#4da6ff',
    emissive: new THREE.Color('#4da6ff'),
    emissiveIntensity: 0.75,
    roughness: 0.2,
  });
  glowMats.push(platformGlow);

  /** Loft vertikal anatomis dengan lipatan kain alami (ripstop cloth folds). */
  const buildClothLoft = (
    stations: { y: number; cx?: number; cz?: number; rx: number; rz: number; sq?: number; fold?: number }[],
    radialSegs = 36,
    capTop = true,
    capBottom = true,
  ) => {
    const geo = buildLoftGeometry(
      stations.map((st, idx) => ({
        z: st.y,
        point: (th) => {
          const s = Math.sin(th);
          const c = Math.cos(th);
          const p = st.sq ?? 0.92;
          const foldAmp = st.fold ?? 0.03;
          const wrinkle =
            1 +
            foldAmp * Math.sin(th * 5 + idx * 1.6) +
            foldAmp * 0.55 * Math.cos(th * 3 - idx * 1.1);
          const px = Math.sign(s) * Math.pow(Math.abs(s), p) * st.rx * wrinkle + (st.cx ?? 0);
          const py = Math.sign(c) * Math.pow(Math.abs(c), p) * st.rz * wrinkle + (st.cz ?? 0);
          return [px, py];
        },
      })),
      radialSegs,
      capTop,
      capBottom,
    );
    geo.rotateX(-Math.PI / 2);
    return geo;
  };

  /** Helper strap pipih antara 2 titik 3D (untuk harness X-strap realistis di dada & paha). */
  const addWebbingStrap = (p1: [number, number, number], p2: [number, number, number], width = 0.16, thick = 0.055) => {
    const a = new THREE.Vector3(...p1);
    const b = new THREE.Vector3(...p2);
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const m = mkMesh(new THREE.BoxGeometry(width, len, thick), strapMat);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    g.add(m);
    return m;
  };

  // =========================================================================
  // 1. PLATFORM DISPLAY TAKTIS (y = 0 .. 0.34)
  // =========================================================================
  const basePlate = mkMesh(new THREE.CylinderGeometry(2.65, 2.9, 0.24, 56), platformMat);
  basePlate.position.y = 0.12;
  g.add(basePlate);

  const innerPlate = mkMesh(new THREE.CylinderGeometry(2.25, 2.38, 0.1, 48), darkMetalMat);
  innerPlate.position.y = 0.29;
  g.add(innerPlate);

  const ringGlow = mkMesh(new THREE.TorusGeometry(2.5, 0.042, 12, 64), platformGlow);
  ringGlow.rotation.x = Math.PI / 2;
  ringGlow.position.y = 0.25;
  g.add(ringGlow);

  const goldRing = mkMesh(new THREE.TorusGeometry(2.04, 0.022, 10, 64), goldMat);
  goldRing.rotation.x = Math.PI / 2;
  goldRing.position.y = 0.345;
  g.add(goldRing);

  const bladdersGroup = new THREE.Group();
  bladdersGroup.name = 'gsuit-bladders';
  g.add(bladdersGroup);

  // =========================================================================
  // 2. MODERN BOOTS + KAKI FLIGHT SUIT (FRW-2) + KNEE PADS + G-BLADDERS
  // =========================================================================
  for (const s of [1, -1] as const) {
    // Sepatu Bot Taktis Modern (olive-tan bersol lug tebal)
    const bootG = new THREE.Group();
    bootG.position.set(s * 0.90, 0.34, 0);
    bootG.rotation.y = s * 0.16;

    const sole = mkMesh(new THREE.BoxGeometry(0.74, 0.20, 1.56), soleMat);
    sole.position.set(0, 0.10, 0.26);
    bootG.add(sole);

    // Gerigi sol lug bawah
    for (let k = -3; k <= 3; k++) {
      const lug = mkMesh(new THREE.BoxGeometry(0.76, 0.06, 0.12), soleMat);
      lug.position.set(0, 0.02, 0.26 + k * 0.22);
      bootG.add(lug);
    }

    const upper = mkMesh(
      buildClothLoft(
        [
          { y: 0.18, cz: 0.24, rx: 0.37, rz: 0.72, sq: 0.84, fold: 0.01 },
          { y: 0.46, cz: 0.16, rx: 0.34, rz: 0.56, sq: 0.88, fold: 0.01 },
          { y: 0.82, cz: -0.02, rx: 0.35, rz: 0.39, sq: 0.94, fold: 0.01 },
          { y: 1.32, cz: -0.04, rx: 0.40, rz: 0.42, sq: 0.94, fold: 0.01 },
        ],
        24,
        true,
        true,
      ),
      bootMat,
    );
    bootG.add(upper);

    for (let i = 0; i < 5; i++) {
      const lace = mkMesh(new THREE.BoxGeometry(0.24, 0.04, 0.09), soleMat);
      lace.position.set(0, 0.52 + i * 0.15, 0.34);
      bootG.add(lace);
    }
    g.add(bootG);

    // Celana Flight Suit (FRW-2) dengan lipatan kain longgar di betis & paha (sesuai referensi)
    const legGeo = buildClothLoft(
      [
        { y: 1.24, cx: s * 0.90, cz: -0.02, rx: 0.46, rz: 0.48, fold: 0.055 },
        { y: 1.98, cx: s * 0.89, cz: -0.01, rx: 0.52, rz: 0.54, fold: 0.05 },
        { y: 2.95, cx: s * 0.85, cz: 0.02, rx: 0.53, rz: 0.55, fold: 0.045 },
        { y: 3.98, cx: s * 0.81, cz: 0.06, rx: 0.47, rz: 0.49, fold: 0.035 },
        { y: 4.98, cx: s * 0.74, cz: 0.04, rx: 0.59, rz: 0.62, fold: 0.04 },
        { y: 5.95, cx: s * 0.66, cz: 0.01, rx: 0.64, rz: 0.65, fold: 0.035 },
        { y: 6.48, cx: s * 0.56, cz: 0.0, rx: 0.62, rz: 0.63, fold: 0.02 },
      ],
      32,
      true,
      true,
    );
    g.add(mkMesh(legGeo, flightSuitMat));

    // ---- KANTUNG UDARA BETIS (CALF G-BLADDER) ----
    const calfBladderGeo = buildClothLoft(
      [
        { y: 1.72, cx: s * 0.89, cz: -0.02, rx: 0.49, rz: 0.52, fold: 0.025 },
        { y: 2.48, cx: s * 0.86, cz: 0.0, rx: 0.56, rz: 0.58, fold: 0.025 },
        { y: 3.25, cx: s * 0.83, cz: 0.03, rx: 0.55, rz: 0.57, fold: 0.02 },
        { y: 3.64, cx: s * 0.81, cz: 0.04, rx: 0.50, rz: 0.52, fold: 0.02 },
      ],
      28,
      true,
      true,
    );
    const calfBladder = mkMesh(calfBladderGeo, bladderMat);
    calfBladder.name = `gsuit-bladder-calf-${s > 0 ? 'r' : 'l'}`;
    bladdersGroup.add(calfBladder);

    // Kantong kargo betis samping dengan penutup flap
    const calfPocket = mkMesh(new THREE.BoxGeometry(0.18, 0.92, 0.56), flightSuitMat);
    calfPocket.position.set(s * 1.40, 2.52, 0.08);
    g.add(calfPocket);

    // ---- PELINDUNG LUTUT TAKTIS (TACTICAL KNEE PADS BERALUR) ----
    const kneeCap = mkMesh(new THREE.SphereGeometry(0.46, 24, 18), kneePadMat);
    kneeCap.scale.set(0.95, 1.18, 0.42);
    kneeCap.position.set(s * 0.80, 4.02, 0.48);
    g.add(kneeCap);

    const kneeRim = mkMesh(new THREE.TorusGeometry(0.42, 0.045, 10, 24), strapMat);
    kneeRim.scale.set(0.95, 1.18, 0.5);
    kneeRim.position.set(s * 0.80, 4.02, 0.45);
    g.add(kneeRim);

    // Tali pengikat pelindung lutut belakang
    for (const dy of [-0.24, 0.24]) {
      const kStrap = mkMesh(new THREE.TorusGeometry(0.50, 0.032, 8, 24), strapMat);
      kStrap.rotation.x = Math.PI / 2;
      kStrap.position.set(s * 0.80, 4.02 + dy, 0.06);
      g.add(kStrap);
    }

    // ---- KANTUNG UDARA PAHA (THIGH G-BLADDER) ----
    const thighBladderGeo = buildClothLoft(
      [
        { y: 4.52, cx: s * 0.76, cz: 0.05, rx: 0.57, rz: 0.59, fold: 0.02 },
        { y: 5.20, cx: s * 0.71, cz: 0.04, rx: 0.65, rz: 0.67, fold: 0.02 },
        { y: 5.88, cx: s * 0.66, cz: 0.01, rx: 0.67, rz: 0.69, fold: 0.02 },
        { y: 6.18, cx: s * 0.62, cz: 0.0, rx: 0.62, rz: 0.64, fold: 0.02 },
      ],
      30,
      true,
      true,
    );
    const thighBladder = mkMesh(thighBladderGeo, bladderMat);
    thighBladder.name = `gsuit-bladder-thigh-${s > 0 ? 'r' : 'l'}`;
    bladdersGroup.add(thighBladder);

    // ---- HARNESS X-STRAP KURSI LONTAR MENYILANG DARI PINGGANG KE PAHA (IKONIK DI REFERENSI!) ----
    addWebbingStrap([s * 0.72, 6.45, 0.72], [s * 0.12, 5.42, 0.66], 0.16, 0.06);
    addWebbingStrap([s * 0.12, 5.42, 0.66], [s * 1.05, 5.58, 0.56], 0.15, 0.055);
    const thighBuckle = mkMesh(new THREE.BoxGeometry(0.24, 0.22, 0.10), metalMat);
    thighBuckle.position.set(s * 0.42, 5.92, 0.72);
    g.add(thighBuckle);
  }

  // ---- FLIGHT COMPUTER & GPS TABLET (EFB) DI PAHA KIRI SESUAI REFERENSI ----
  const gpsGroup = new THREE.Group();
  gpsGroup.position.set(-0.78, 5.12, 0.78);
  gpsGroup.rotation.set(-0.06, -0.16, 0.04);
  gpsGroup.add(mkMesh(new THREE.BoxGeometry(0.84, 1.12, 0.11), darkMetalMat));
  // Bumper sudut karet tahan banting
  for (const cx of [-0.38, 0.38]) {
    for (const cy of [-0.52, 0.52]) {
      const bump = mkMesh(new THREE.BoxGeometry(0.14, 0.14, 0.13), strapMat);
      bump.position.set(cx, cy, 0);
      gpsGroup.add(bump);
    }
  }
  const tabletScreen = mkMesh(
    new THREE.PlaneGeometry(0.70, 0.94),
    new THREE.MeshStandardMaterial({
      map: makeFlightComputerTexture(),
      emissive: new THREE.Color('#00ffaa'),
      emissiveIntensity: 0.28,
      roughness: 0.18,
    }),
  );
  tabletScreen.position.z = 0.06;
  tabletScreen.name = 'gsuit-gps-screen';
  gpsGroup.add(tabletScreen);
  g.add(gpsGroup);

  // ---- SURVIVAL KIT & PEMANCAR DARURAT ORANYE DI PINGGUL/PAHA KANAN ----
  const survivalPack = mkMesh(new THREE.BoxGeometry(0.34, 0.72, 0.38), vestMat);
  survivalPack.position.set(1.38, 5.25, 0.14);
  g.add(survivalPack);
  const orangeBeacon = mkMesh(new THREE.BoxGeometry(0.20, 0.36, 0.15), orangeSurvivalMat);
  orangeBeacon.position.set(1.50, 5.38, 0.28);
  g.add(orangeBeacon);

  // =========================================================================
  // 3. TORSO FLIGHT SUIT (FRW-2) + LENGAN BERLIPATAN KAIN + SARUNG TANGAN
  // =========================================================================
  const torsoGeo = buildClothLoft(
    [
      { y: 6.12, rx: 1.26, rz: 0.74, sq: 0.88, fold: 0.035 },
      { y: 6.72, rx: 1.18, rz: 0.70, sq: 0.88, fold: 0.035 },
      { y: 7.35, rx: 1.18, rz: 0.72, sq: 0.86, fold: 0.03 },
      { y: 8.05, rx: 1.38, rz: 0.78, sq: 0.84, fold: 0.03 },
      { y: 8.75, rx: 1.62, rz: 0.76, sq: 0.82, fold: 0.025 },
      { y: 9.15, rx: 1.40, rz: 0.60, sq: 0.86, fold: 0.02 },
      { y: 9.40, rx: 0.56, rz: 0.48, sq: 0.94, fold: 0.01 },
    ],
    40,
    true,
    true,
  );
  g.add(mkMesh(torsoGeo, flightSuitMat));

  // Kerah jaket penerbangan berlipat & penutup leher display rapi
  const collar = mkMesh(new THREE.TorusGeometry(0.58, 0.17, 12, 28), flightSuitMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 9.40, 0.04);
  g.add(collar);
  const neckCap = mkMesh(new THREE.CylinderGeometry(0.46, 0.48, 0.16, 28), darkMetalMat);
  neckCap.position.set(0, 9.56, 0.02);
  g.add(neckCap);
  const neckGold = mkMesh(new THREE.TorusGeometry(0.47, 0.026, 10, 32), goldMat);
  neckGold.rotation.x = Math.PI / 2;
  neckGold.position.set(0, 9.62, 0.02);
  g.add(neckGold);

  // Lengan organik berlipatan kain + Sarung Tangan Nomex & Jam Tangan Penerbang
  for (const s of [1, -1] as const) {
    const armGeo = buildClothLoft(
      [
        { y: 5.95, cx: s * 1.76, cz: 0.24, rx: 0.26, rz: 0.28, fold: 0.04 },
        { y: 6.65, cx: s * 1.84, cz: 0.12, rx: 0.33, rz: 0.35, fold: 0.055 },
        { y: 7.35, cx: s * 1.88, cz: -0.02, rx: 0.38, rz: 0.40, fold: 0.055 },
        { y: 8.15, cx: s * 1.78, cz: -0.02, rx: 0.44, rz: 0.46, fold: 0.045 },
        { y: 8.80, cx: s * 1.52, cz: 0.02, rx: 0.48, rz: 0.50, fold: 0.025 },
      ],
      28,
      true,
      true,
    );
    g.add(mkMesh(armGeo, flightSuitMat));

    const patch = mkMesh(
      new THREE.PlaneGeometry(0.42, 0.32),
      new THREE.MeshStandardMaterial({ map: s > 0 ? flagTexture() : roundelTexture(), transparent: true, roughness: 0.5 }),
    );
    patch.position.set(s * 2.20, 8.32, 0.02);
    patch.rotation.y = s * (Math.PI / 2);
    g.add(patch);

    // Manset & Sarung Tangan Taktis Nomex dengan jari-jari
    const cuff = mkMesh(new THREE.CylinderGeometry(0.27, 0.25, 0.28, 18), strapMat);
    cuff.position.set(s * 1.76, 5.92, 0.25);
    g.add(cuff);

    const palm = mkMesh(new THREE.SphereGeometry(0.27, 16, 14), gloveMat);
    palm.scale.set(0.8, 1.28, 0.96);
    palm.position.set(s * 1.72, 5.56, 0.32);
    g.add(palm);

    for (let f = -1; f <= 1; f++) {
      const finger = mkMesh(new THREE.CapsuleGeometry(0.052, 0.18, 6, 10), gloveMat);
      finger.position.set(s * 1.72 + f * 0.08, 5.24, 0.36);
      finger.rotation.x = 0.28;
      g.add(finger);
    }
  }

  // Jam tangan taktis penerbang di pergelangan kiri
  const watch = mkMesh(new THREE.CylinderGeometry(0.15, 0.15, 0.09, 18), darkMetalMat);
  watch.rotation.z = Math.PI / 2;
  watch.position.set(-1.98, 6.02, 0.34);
  g.add(watch);

  // =========================================================================
  // 4. KANTUNG UDARA PERUT + SELANG ANTI-G SISI KIRI
  // =========================================================================
  const abdBladderGeo = buildClothLoft(
    [
      { y: 6.32, rx: 1.30, rz: 0.78, sq: 0.86, fold: 0.025 },
      { y: 6.85, rx: 1.26, rz: 0.80, sq: 0.84, fold: 0.025 },
      { y: 7.36, rx: 1.24, rz: 0.78, sq: 0.86, fold: 0.02 },
    ],
    34,
    true,
    true,
  );
  const abdBladder = mkMesh(abdBladderGeo, bladderMat);
  abdBladder.name = 'gsuit-bladder-abdomen';
  bladdersGroup.add(abdBladder);

  const waistBelt = mkMesh(new THREE.CylinderGeometry(1.28, 1.31, 0.26, 36), strapMat);
  waistBelt.scale.set(1.0, 1.0, 0.66);
  waistBelt.position.set(0, 6.48, 0.02);
  g.add(waistBelt);
  const beltBuckle = mkMesh(new THREE.BoxGeometry(0.48, 0.32, 0.16), darkMetalMat);
  beltBuckle.position.set(0, 6.48, 0.88);
  g.add(beltBuckle);

  // Selang Pneumatik Anti-G panjang di sisi kiri menyusur kaki kiri
  const gHoseCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.16, 6.92, 0.42),
    new THREE.Vector3(-1.42, 6.22, 0.38),
    new THREE.Vector3(-1.46, 4.85, 0.24),
    new THREE.Vector3(-1.50, 3.25, 0.18),
    new THREE.Vector3(-1.46, 1.85, 0.14),
  ]);
  const gHose = mkMesh(new THREE.TubeGeometry(gHoseCurve, 44, 0.088, 12, false), airTubeMat);
  gHose.name = 'gsuit-tube-main';
  bladdersGroup.add(gHose);

  for (let i = 1; i < 22; i++) {
    const pt = gHoseCurve.getPoint(i / 22);
    const tan = gHoseCurve.getTangent(i / 22);
    const rib = mkMesh(new THREE.TorusGeometry(0.098, 0.016, 8, 14), darkMetalMat);
    rib.position.copy(pt);
    rib.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan);
    g.add(rib);
  }

  const gValveConn = mkMesh(new THREE.CylinderGeometry(0.12, 0.12, 0.34, 16), metalMat);
  gValveConn.position.set(-1.46, 1.78, 0.14);
  g.add(gValveConn);

  // =========================================================================
  // 5. SURVIVAL VEST (DUAL LPU LOBES + DERETAN 5 POUCH MOLLE + HARNESS)
  // =========================================================================
  const vestGeo = buildClothLoft(
    [
      { y: 7.20, rx: 1.28, rz: 0.80, sq: 0.84, fold: 0.025 },
      { y: 8.05, rx: 1.44, rz: 0.84, sq: 0.82, fold: 0.025 },
      { y: 8.85, rx: 1.48, rz: 0.78, sq: 0.84, fold: 0.02 },
    ],
    34,
    true,
    true,
  );
  g.add(mkMesh(vestGeo, vestMat));

  // Dual LPU Flotation Lobes abu-hijau menonjol di dada atas (khas referensi)
  for (const s of [1, -1] as const) {
    const lobe = mkMesh(new THREE.CapsuleGeometry(0.34, 0.72, 12, 22), lobeMat);
    lobe.scale.set(1.0, 1.0, 0.64);
    lobe.position.set(s * 0.64, 8.60, 0.72);
    lobe.rotation.z = s * 0.08;
    g.add(lobe);

    // Tali harness bahu hitam & pengait cepat Koch
    addWebbingStrap([s * 0.90, 9.05, 0.64], [s * 0.88, 7.28, 0.82], 0.22, 0.10);
    const koch = mkMesh(new THREE.BoxGeometry(0.26, 0.30, 0.18), metalMat);
    koch.position.set(s * 0.90, 8.86, 0.74);
    g.add(koch);
  }

  // Deretan 5 kantong MOLLE Survival Vest lengkap dengan pita webbing horizontal
  const pouchSpecs = [
    { x: -1.10, z: 0.68, ry: -0.52, w: 0.44, h: 0.76 },
    { x: -0.58, z: 0.86, ry: -0.22, w: 0.46, h: 0.80 },
    { x: 0.0, z: 0.92, ry: 0, w: 0.42, h: 0.74 },
    { x: 0.58, z: 0.86, ry: 0.22, w: 0.46, h: 0.80 },
    { x: 1.10, z: 0.68, ry: 0.52, w: 0.44, h: 0.76 },
  ];
  for (const p of pouchSpecs) {
    const pGroup = new THREE.Group();
    pGroup.position.set(p.x, 7.26, p.z);
    pGroup.rotation.y = p.ry;
    pGroup.add(mkMesh(new THREE.BoxGeometry(p.w, p.h, 0.28), vestMat));
    const flap = mkMesh(new THREE.BoxGeometry(p.w + 0.02, 0.24, 0.31), bladderMat);
    flap.position.y = p.h * 0.34;
    pGroup.add(flap);
    // Pita MOLLE horizontal pada tiap kantong
    for (const wy of [-0.18, 0.02]) {
      const molle = mkMesh(new THREE.BoxGeometry(p.w + 0.03, 0.07, 0.30), strapMat);
      molle.position.y = wy;
      pGroup.add(molle);
    }
    const clip = mkMesh(new THREE.BoxGeometry(0.11, 0.14, 0.33), darkMetalMat);
    clip.position.y = p.h * 0.16;
    pGroup.add(clip);
    g.add(pGroup);
  }

  // Sabuk dada horizontal & gesper pengunci utama
  const chestStrap = mkMesh(new THREE.BoxGeometry(1.78, 0.19, 0.12), strapMat);
  chestStrap.position.set(0, 8.02, 0.88);
  g.add(chestStrap);
  const chestBuckle = mkMesh(new THREE.BoxGeometry(0.34, 0.26, 0.18), darkMetalMat);
  chestBuckle.position.set(0, 8.02, 0.92);
  g.add(chestBuckle);

  // Antena Radio Darurat PRC-112 di bahu kiri belakang
  const radioAnt = mkMesh(new THREE.CylinderGeometry(0.02, 0.028, 0.96, 10), darkMetalMat);
  radioAnt.position.set(-1.14, 9.15, 0.35);
  g.add(radioAnt);

  // Badge TNI AU di dada tengah
  const chestBadge = mkMesh(
    new THREE.PlaneGeometry(0.48, 0.19),
    new THREE.MeshStandardMaterial({
      map: textTexture('TNI AU', { color: '#ffb703', aspect: 2.5 }),
      transparent: true,
      roughness: 0.55,
    }),
  );
  chestBadge.position.set(0, 8.46, 0.88);
  g.add(chestBadge);

  return {
    group: g,
    nozzles: [],
    spinners: [],
    navLights: [
      { pos: [2.5, 0.28, 0], color: '#4da6ff' },
      { pos: [-2.5, 0.28, 0], color: '#4da6ff' },
      { pos: [0, 0.28, 2.5], color: '#ffb703', blink: 'beacon' },
    ],
    glowMats,
    hoverHeight: 0,
  };
}
