import * as THREE from 'three';
import { buildLoftGeometry, mkMesh } from './aeroGeo';
import { flagTexture, roundelTexture, textTexture } from './textures';
import type { BuildResult } from './proceduralBuilder';

/** Tekstur tenunan kain Nomex/ripstop militer + bump map agar seragam & G-Suit tampak seperti kain nyata. */
function makeFabricTextures(baseHex: string, seed = 700): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);

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
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  for (let i = 4; i < 256; i += 16) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 256);
    ctx.stroke();
  }

  let s = seed;
  for (let i = 0; i < 850; i++) {
    s = (s * 16807) % 2147483647;
    const x = s % 256;
    s = (s * 16807) % 2147483647;
    const y = s % 256;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.04)';
    ctx.fillRect(x, y, 2, 2);
  }

  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(3, 3);
  map.needsUpdate = true;

  const bc = document.createElement('canvas');
  bc.width = 256;
  bc.height = 256;
  const bctx = bc.getContext('2d')!;
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, 256, 256);
  bctx.strokeStyle = '#626262';
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

/** Tekstur panel kantung udara pneumatik G-Suit dengan jahitan beralur & pendaran biru tekanan udara (sesuai referensi). */
function makeBladderPadTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 384;
  const ctx = c.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 256, 384);
  grad.addColorStop(0, '#38bdf8');
  grad.addColorStop(0.5, '#0284c7');
  grad.addColorStop(1, '#0ea5e9');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 384);

  // Alur bilik udara horizontal & vertikal (air chambers)
  ctx.strokeStyle = 'rgba(224, 242, 254, 0.72)';
  ctx.lineWidth = 6;
  ctx.strokeRect(14, 14, 228, 356);

  ctx.strokeStyle = 'rgba(12, 74, 110, 0.55)';
  ctx.lineWidth = 5;
  for (let y = 76; y < 350; y += 64) {
    ctx.beginPath();
    ctx.moveTo(22, y);
    ctx.lineTo(234, y);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(128, 22);
  ctx.lineTo(128, 362);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Model 3D Realistis G-SUIT (ANTI-G SUIT) PILOT PESAWAT TEMPUR TNI AU
 * Sesuai persis gambar referensi:
 * - Pilot tempur penuh berdiri gagah mengenakan Flight Suit Hijau Zaitun, Helm HGU-55/P + Masker MBU-20/P,
 *   Harness Dada Hitam dengan gesper logam, Patch Bendera Merah Putih di bahu kanan, Sarung Tangan Hitam & Bot Taktis Hitam.
 * - 5 Kantung Udara Pneumatik G-Suit (Perut, Paha Kiri/Kanan, Betis Kiri/Kanan) dengan tampilan bilik udara biru menyala
 *   + Sabuk Pengikat Pinggang + Selang Pneumatik berulir & konektor kokpit di sisi kiri!
 */
export function buildDetailedGSuit(): BuildResult {
  const g = new THREE.Group();
  const glowMats: THREE.MeshStandardMaterial[] = [];

  const suitTex = makeFabricTextures('#4d5738', 731);
  const gSuitOverlayTex = makeFabricTextures('#3e4730', 732);
  const bladderPadTex = makeBladderPadTexture();

  const flightSuitMat = new THREE.MeshStandardMaterial({
    map: suitTex.map,
    bumpMap: suitTex.bump,
    bumpScale: 0.032,
    roughness: 0.86,
    metalness: 0.03,
  });
  const gSuitOuterMat = new THREE.MeshStandardMaterial({
    map: gSuitOverlayTex.map,
    bumpMap: gSuitOverlayTex.bump,
    bumpScale: 0.035,
    roughness: 0.8,
    metalness: 0.06,
  });
  // Material kantung udara (Abdominal, Thigh, Calf) dengan warna biru pneumatik khas gambar referensi
  const makeBladderMat = () =>
    new THREE.MeshStandardMaterial({
      map: bladderPadTex,
      roughness: 0.36,
      metalness: 0.14,
      emissive: new THREE.Color('#0284c7'),
      emissiveIntensity: 0.32,
    });

  const airTubeMat = new THREE.MeshStandardMaterial({
    color: '#1e242c',
    roughness: 0.48,
    metalness: 0.28,
    emissive: new THREE.Color('#000000'),
    emissiveIntensity: 0,
  });
  const strapMat = new THREE.MeshStandardMaterial({
    color: '#181c22',
    roughness: 0.82,
    metalness: 0.08,
  });
  const bootMat = new THREE.MeshStandardMaterial({
    color: '#171b21', // Bot tempur hitam taktis sesuai gambar referensi
    bumpMap: suitTex.bump,
    bumpScale: 0.02,
    roughness: 0.56,
    metalness: 0.14,
  });
  const soleMat = new THREE.MeshStandardMaterial({
    color: '#0e1116',
    roughness: 0.92,
    metalness: 0.04,
  });
  const gloveMat = new THREE.MeshStandardMaterial({
    color: '#1b2026', // Sarung tangan hitam penerbang sesuai referensi
    roughness: 0.68,
    metalness: 0.1,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: '#c8d2dc',
    roughness: 0.24,
    metalness: 0.9,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: '#28303a',
    roughness: 0.36,
    metalness: 0.78,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: '#ffb703',
    roughness: 0.3,
    metalness: 0.7,
  });
  const helmetShellMat = new THREE.MeshPhysicalMaterial({
    color: '#bfc7cf',
    roughness: 0.32,
    metalness: 0.26,
    clearcoat: 0.48,
  });
  const helmetVisorMat = new THREE.MeshPhysicalMaterial({
    color: '#0a1626',
    roughness: 0.04,
    metalness: 0.45,
    clearcoat: 1.0,
    iridescence: 0.65,
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

  /** Loft vertikal anatomis dengan lipatan kain alami. */
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
          const foldAmp = st.fold ?? 0.025;
          const wrinkle =
            1 +
            foldAmp * Math.sin(th * 5 + idx * 1.5) +
            foldAmp * 0.5 * Math.cos(th * 3 - idx * 1.1);
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
  // 2. BOT HITAM TAKTIS + CELANA FLIGHT SUIT + KANTUNG PAHA & BETIS BIRU PNEUMATIK
  // =========================================================================
  for (const s of [1, -1] as const) {
    // Sepatu Bot Taktis Hitam
    const bootG = new THREE.Group();
    bootG.position.set(s * 0.86, 0.34, 0);
    bootG.rotation.y = s * 0.14;

    const sole = mkMesh(new THREE.BoxGeometry(0.68, 0.18, 1.48), soleMat);
    sole.position.set(0, 0.09, 0.24);
    bootG.add(sole);

    const upper = mkMesh(
      buildClothLoft(
        [
          { y: 0.16, cz: 0.22, rx: 0.34, rz: 0.68, sq: 0.84, fold: 0.01 },
          { y: 0.44, cz: 0.14, rx: 0.32, rz: 0.52, sq: 0.88, fold: 0.01 },
          { y: 0.82, cz: -0.02, rx: 0.33, rz: 0.36, sq: 0.94, fold: 0.01 },
          { y: 1.24, cz: -0.03, rx: 0.37, rz: 0.39, sq: 0.94, fold: 0.01 },
        ],
        24,
        true,
        true,
      ),
      bootMat,
    );
    bootG.add(upper);

    for (let i = 0; i < 5; i++) {
      const lace = mkMesh(new THREE.BoxGeometry(0.22, 0.036, 0.08), darkMetalMat);
      lace.position.set(0, 0.5 + i * 0.14, 0.32);
      bootG.add(lace);
    }
    g.add(bootG);

    // Celana Flight Suit Hijau Zaitun
    const legGeo = buildClothLoft(
      [
        { y: 1.18, cx: s * 0.86, cz: -0.02, rx: 0.42, rz: 0.44, fold: 0.045 },
        { y: 2.05, cx: s * 0.84, cz: -0.01, rx: 0.48, rz: 0.5, fold: 0.04 },
        { y: 3.15, cx: s * 0.8, cz: 0.02, rx: 0.47, rz: 0.49, fold: 0.035 },
        { y: 4.1, cx: s * 0.74, cz: 0.04, rx: 0.44, rz: 0.46, fold: 0.03 },
        { y: 5.05, cx: s * 0.68, cz: 0.02, rx: 0.54, rz: 0.56, fold: 0.03 },
        { y: 5.9, cx: s * 0.6, cz: 0.0, rx: 0.58, rz: 0.59, fold: 0.025 },
      ],
      32,
      true,
      true,
    );
    g.add(mkMesh(legGeo, flightSuitMat));

    // Lapisan Luar G-Suit (Cutaway chaps hijau tua pengikat paha & betis)
    const chapGeo = buildClothLoft(
      [
        { y: 1.45, cx: s * 0.85, cz: -0.01, rx: 0.45, rz: 0.47, fold: 0.015 },
        { y: 3.35, cx: s * 0.79, cz: 0.02, rx: 0.5, rz: 0.52, fold: 0.015 },
        { y: 5.75, cx: s * 0.62, cz: 0.01, rx: 0.6, rz: 0.61, fold: 0.015 },
      ],
      28,
      true,
      true,
    );
    g.add(mkMesh(chapGeo, gSuitOuterMat));

    // ---- KANTUNG BETIS (CALF BLADDER — BIRU PNEUMATIK BERALUR SESUAI REFERENSI!) ----
    const calfPad = mkMesh(new THREE.CapsuleGeometry(0.32, 1.02, 10, 20), makeBladderMat());
    calfPad.scale.set(0.95, 1.0, 0.46);
    calfPad.position.set(s * 0.83, 2.38, 0.42);
    calfPad.rotation.y = s * 0.14;
    calfPad.name = `gsuit-bladder-calf-${s > 0 ? 'r' : 'l'}`;
    bladdersGroup.add(calfPad);

    // Tali pengikat betis & lutut (hitam)
    for (const sy of [1.55, 3.22, 4.02]) {
      const band = mkMesh(new THREE.TorusGeometry(0.49, 0.032, 8, 24), strapMat);
      band.rotation.x = Math.PI / 2;
      band.position.set(s * 0.78, sy, 0.02);
      g.add(band);
    }

    // ---- KANTUNG PAHA (THIGH BLADDER — BIRU PNEUMATIK BESAR SESUAI REFERENSI!) ----
    const thighPad = mkMesh(new THREE.CapsuleGeometry(0.38, 1.12, 12, 22), makeBladderMat());
    thighPad.scale.set(1.02, 1.0, 0.48);
    thighPad.position.set(s * 0.69, 4.92, 0.48);
    thighPad.rotation.y = s * 0.18;
    thighPad.name = `gsuit-bladder-thigh-${s > 0 ? 'r' : 'l'}`;
    bladdersGroup.add(thighPad);

    // Strap pengikat paha harness
    addWebbingStrap([s * 0.65, 6.08, 0.66], [s * 0.18, 5.28, 0.62], 0.14, 0.05);
    addWebbingStrap([s * 0.18, 5.28, 0.62], [s * 0.96, 5.42, 0.5], 0.14, 0.05);
  }

  // =========================================================================
  // 3. TORSO FLIGHT SUIT + KANTUNG PERUT (ABDOMINAL BLADDER) + HARNESS + LENGAN
  // =========================================================================
  const torsoGeo = buildClothLoft(
    [
      { y: 5.75, rx: 1.18, rz: 0.68, sq: 0.88, fold: 0.025 },
      { y: 6.45, rx: 1.12, rz: 0.66, sq: 0.88, fold: 0.025 },
      { y: 7.15, rx: 1.18, rz: 0.7, sq: 0.86, fold: 0.025 },
      { y: 7.9, rx: 1.38, rz: 0.74, sq: 0.84, fold: 0.02 },
      { y: 8.55, rx: 1.48, rz: 0.68, sq: 0.84, fold: 0.015 },
      { y: 8.85, rx: 0.52, rz: 0.46, sq: 0.94, fold: 0.01 },
    ],
    40,
    true,
    true,
  );
  g.add(mkMesh(torsoGeo, flightSuitMat));

  // ---- KANTUNG PERUT (ABDOMINAL BLADDER — BIRU PNEUMATIK DI BAWAH SABUK PINGGANG!) ----
  const abdPad = mkMesh(new THREE.BoxGeometry(1.42, 0.68, 0.24), makeBladderMat());
  abdPad.position.set(0, 6.18, 0.62);
  abdPad.name = 'gsuit-bladder-abdomen';
  bladdersGroup.add(abdPad);

  // Sabuk Pengikat Pinggang (Waist Belt) & Gesper Logam
  const waistBelt = mkMesh(new THREE.CylinderGeometry(1.19, 1.22, 0.24, 36), strapMat);
  waistBelt.scale.set(1.0, 1.0, 0.64);
  waistBelt.position.set(0, 6.64, 0.02);
  g.add(waistBelt);
  const beltBuckle = mkMesh(new THREE.BoxGeometry(0.42, 0.28, 0.16), metalMat);
  beltBuckle.position.set(0, 6.64, 0.8);
  g.add(beltBuckle);

  // Harness Dada & Bahu Hitam Kursi Lontar + Gesper Logam (sesuai foto hero kiri!)
  for (const s of [1, -1] as const) {
    addWebbingStrap([s * 0.76, 8.62, 0.56], [s * 0.72, 6.68, 0.74], 0.2, 0.08);
    addWebbingStrap([s * 0.76, 8.62, -0.56], [s * 0.72, 6.68, -0.68], 0.2, 0.08);
    const koch = mkMesh(new THREE.BoxGeometry(0.24, 0.28, 0.16), metalMat);
    koch.position.set(s * 0.76, 8.28, 0.68);
    g.add(koch);
  }
  const chestStrap = mkMesh(new THREE.BoxGeometry(1.66, 0.18, 0.1), strapMat);
  chestStrap.position.set(0, 7.62, 0.78);
  g.add(chestStrap);
  const chestBuckle = mkMesh(new THREE.BoxGeometry(0.32, 0.24, 0.16), metalMat);
  chestBuckle.position.set(0, 7.62, 0.82);
  g.add(chestBuckle);

  // Badge TNI AU di dada
  const chestBadge = mkMesh(
    new THREE.PlaneGeometry(0.46, 0.18),
    new THREE.MeshStandardMaterial({
      map: textTexture('TNI AU', { color: '#ffb703', aspect: 2.5 }),
      transparent: true,
      roughness: 0.5,
    }),
  );
  chestBadge.position.set(0, 8.05, 0.76);
  g.add(chestBadge);

  // Lengan Flight Suit + Patch Bendera Merah Putih (kanan) & Roundel TNI AU (kiri) + Sarung Tangan Hitam
  for (const s of [1, -1] as const) {
    const armGeo = buildClothLoft(
      [
        { y: 5.55, cx: s * 1.66, cz: 0.16, rx: 0.24, rz: 0.26, fold: 0.035 },
        { y: 6.35, cx: s * 1.74, cz: 0.08, rx: 0.31, rz: 0.33, fold: 0.045 },
        { y: 7.15, cx: s * 1.76, cz: -0.02, rx: 0.35, rz: 0.37, fold: 0.045 },
        { y: 7.95, cx: s * 1.64, cz: -0.02, rx: 0.41, rz: 0.43, fold: 0.035 },
        { y: 8.5, cx: s * 1.38, cz: 0.02, rx: 0.44, rz: 0.46, fold: 0.02 },
      ],
      26,
      true,
      true,
    );
    g.add(mkMesh(armGeo, flightSuitMat));

    const patch = mkMesh(
      new THREE.PlaneGeometry(0.44, 0.32),
      new THREE.MeshStandardMaterial({ map: s < 0 ? flagTexture() : roundelTexture(), transparent: true, roughness: 0.45 }),
    );
    patch.position.set(s * 2.06, 8.02, 0.02);
    patch.rotation.y = s * (Math.PI / 2);
    g.add(patch);

    // Sarung tangan hitam penerbang
    const cuff = mkMesh(new THREE.CylinderGeometry(0.24, 0.22, 0.26, 16), strapMat);
    cuff.position.set(s * 1.66, 5.52, 0.18);
    g.add(cuff);

    const palm = mkMesh(new THREE.SphereGeometry(0.24, 16, 14), gloveMat);
    palm.scale.set(0.78, 1.24, 0.94);
    palm.position.set(s * 1.64, 5.2, 0.24);
    g.add(palm);

    for (let f = -1; f <= 1; f++) {
      const finger = mkMesh(new THREE.CapsuleGeometry(0.048, 0.16, 6, 10), gloveMat);
      finger.position.set(s * 1.64 + f * 0.075, 4.9, 0.28);
      finger.rotation.x = 0.28;
      g.add(finger);
    }
  }

  // =========================================================================
  // 4. SELANG PNEUMATIK ANTI-G & KONEKTOR KOKPIT (SESUAI KOMPONEN G-SUIT)
  // =========================================================================
  const gHoseCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.12, 6.45, 0.36),
    new THREE.Vector3(-1.38, 5.65, 0.28),
    new THREE.Vector3(-1.42, 4.25, 0.16),
    new THREE.Vector3(-1.44, 2.75, 0.12),
    new THREE.Vector3(-1.38, 1.58, 0.12),
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

  const gValveConn = mkMesh(new THREE.CylinderGeometry(0.13, 0.13, 0.34, 16), goldMat);
  gValveConn.position.set(-1.38, 1.5, 0.12);
  g.add(gValveConn);

  // =========================================================================
  // 5. KEPALA PILOT DENGAN HELM HGU-55/P + VISOR GELAP + MASKER MBU-20/P (HERO REFERENSI)
  // =========================================================================
  const neck = mkMesh(new THREE.CylinderGeometry(0.42, 0.48, 0.55, 20), strapMat);
  neck.position.set(0, 9.02, 0.02);
  g.add(neck);

  const headG = new THREE.Group();
  headG.position.set(0, 9.75, 0.04);
  g.add(headG);

  // Cangkang helm komposit abu-abu terang
  const helmShell = mkMesh(new THREE.SphereGeometry(0.82, 32, 24), helmetShellMat);
  helmShell.scale.set(0.95, 1.0, 1.08);
  headG.add(helmShell);

  // Visor gelap reflektif
  const helmVisor = mkMesh(
    new THREE.SphereGeometry(0.84, 28, 18, -Math.PI * 0.38, Math.PI * 0.76, Math.PI * 0.28, Math.PI * 0.28),
    helmetVisorMat,
  );
  helmVisor.rotation.y = Math.PI / 2;
  headG.add(helmVisor);

  // Masker oksigen MBU-20/P & selang oksigen melengkung ke dada
  const maskCone = mkMesh(new THREE.ConeGeometry(0.32, 0.62, 16), darkMetalMat);
  maskCone.rotation.x = Math.PI / 2.2;
  maskCone.position.set(0, -0.34, 0.76);
  headG.add(maskCone);

  const o2HoseCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.45, 0.96),
    new THREE.Vector3(0.24, -0.88, 1.02),
    new THREE.Vector3(0.45, -1.42, 0.88),
    new THREE.Vector3(0.54, -1.95, 0.78),
  ]);
  headG.add(mkMesh(new THREE.TubeGeometry(o2HoseCurve, 24, 0.085, 10, false), airTubeMat));

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
