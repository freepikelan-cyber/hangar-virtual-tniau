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
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  for (let i = 4; i < 256; i += 16) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 256);
    ctx.stroke();
  }

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

/** Tekstur bilik udara pneumatik (multi-chamber ribs + garis tekanan) untuk 5 kantung G-Suit. */
function makeBladderPadTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 384;
  const ctx = c.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 256, 384);
  grad.addColorStop(0, '#38bdf8');
  grad.addColorStop(0.5, '#0369a1');
  grad.addColorStop(1, '#0ea5e9');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 384);

  // Bingkai jahitan luar kantung
  ctx.strokeStyle = 'rgba(224, 242, 254, 0.85)';
  ctx.lineWidth = 7;
  ctx.strokeRect(14, 14, 228, 356);

  // Sekat bilik udara (air chambers)
  ctx.strokeStyle = 'rgba(12, 74, 110, 0.65)';
  ctx.lineWidth = 6;
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
 * Model 3D Realistis & Dinamis G-SUIT (ANTI-G SUIT) PILOT PESAWAT TEMPUR TNI AU
 * - Postur heroik alami (bukan kaku/robotik): bahu tegas, siku sedikit menekuk natural, kaki atletis mantap
 * - Dilengkapi 5 Kantung Udara Pneumatik Beralur (Perut, Paha Kiri/Kanan, Betis Kiri/Kanan) + Selang Anti-G
 * - Helm HGU-55/P + Masker MBU-20/P + Harness Kursi Lontar + Patch Bendera Merah Putih & TNI AU
 */
export function buildDetailedGSuit(): BuildResult {
  const g = new THREE.Group();
  const glowMats: THREE.MeshStandardMaterial[] = [];

  const suitTex = makeFabricTextures('#4c5737', 731);
  const gSuitOverlayTex = makeFabricTextures('#3b442d', 732);
  const bladderPadTex = makeBladderPadTexture();

  const flightSuitMat = new THREE.MeshStandardMaterial({
    map: suitTex.map,
    bumpMap: suitTex.bump,
    bumpScale: 0.032,
    roughness: 0.85,
    metalness: 0.04,
  });
  const gSuitOuterMat = new THREE.MeshStandardMaterial({
    map: gSuitOverlayTex.map,
    bumpMap: gSuitOverlayTex.bump,
    bumpScale: 0.036,
    roughness: 0.78,
    metalness: 0.06,
  });
  const makeBladderMat = () =>
    new THREE.MeshStandardMaterial({
      map: bladderPadTex,
      roughness: 0.32,
      metalness: 0.16,
      emissive: new THREE.Color('#0284c7'),
      emissiveIntensity: 0.35,
    });
  const airTubeMat = new THREE.MeshStandardMaterial({
    color: '#1b212a',
    roughness: 0.45,
    metalness: 0.3,
    emissive: new THREE.Color('#000000'),
    emissiveIntensity: 0,
  });
  const strapMat = new THREE.MeshStandardMaterial({
    color: '#171b21',
    roughness: 0.82,
    metalness: 0.08,
  });
  const bootMat = new THREE.MeshStandardMaterial({
    color: '#15191f',
    bumpMap: suitTex.bump,
    bumpScale: 0.02,
    roughness: 0.52,
    metalness: 0.16,
  });
  const soleMat = new THREE.MeshStandardMaterial({
    color: '#0c0f14',
    roughness: 0.92,
    metalness: 0.04,
  });
  const gloveMat = new THREE.MeshStandardMaterial({
    color: '#1a1f26',
    roughness: 0.65,
    metalness: 0.12,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: '#cbd5e1',
    roughness: 0.22,
    metalness: 0.9,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: '#28313c',
    roughness: 0.36,
    metalness: 0.78,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: '#ffb703',
    roughness: 0.28,
    metalness: 0.72,
  });
  const helmetShellMat = new THREE.MeshPhysicalMaterial({
    color: '#c2cad2',
    roughness: 0.3,
    metalness: 0.24,
    clearcoat: 0.5,
  });
  const helmetVisorMat = new THREE.MeshPhysicalMaterial({
    color: '#081424',
    roughness: 0.04,
    metalness: 0.45,
    clearcoat: 1.0,
    iridescence: 0.72,
    emissive: new THREE.Color('#00ff88'),
    emissiveIntensity: 0.08,
  });
  const platformMat = new THREE.MeshStandardMaterial({
    color: '#102648',
    roughness: 0.34,
    metalness: 0.72,
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

  const addWebbingStrap = (
    parent: THREE.Object3D,
    p1: [number, number, number],
    p2: [number, number, number],
    width = 0.16,
    thick = 0.055,
  ) => {
    const a = new THREE.Vector3(...p1);
    const b = new THREE.Vector3(...p2);
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const m = mkMesh(new THREE.BoxGeometry(width, len, thick), strapMat);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    parent.add(m);
    return m;
  };

  // =========================================================================
  // 1. PLATFORM DISPLAY TAKTIS (y = 0 .. 0.34)
  // =========================================================================
  const basePlate = mkMesh(new THREE.CylinderGeometry(2.7, 2.95, 0.24, 56), platformMat);
  basePlate.position.y = 0.12;
  g.add(basePlate);

  const innerPlate = mkMesh(new THREE.CylinderGeometry(2.28, 2.42, 0.1, 48), darkMetalMat);
  innerPlate.position.y = 0.29;
  g.add(innerPlate);

  const ringGlow = mkMesh(new THREE.TorusGeometry(2.55, 0.042, 12, 64), platformGlow);
  ringGlow.rotation.x = Math.PI / 2;
  ringGlow.position.y = 0.25;
  g.add(ringGlow);

  const goldRing = mkMesh(new THREE.TorusGeometry(2.08, 0.022, 10, 64), goldMat);
  goldRing.rotation.x = Math.PI / 2;
  goldRing.position.y = 0.345;
  g.add(goldRing);

  // Grup tubuh pilot (sedikit miring heroik 7° agar pose tidak kaku simetris!)
  const bodyRoot = new THREE.Group();
  bodyRoot.name = 'gsuit-body-root';
  bodyRoot.rotation.y = -0.1;
  g.add(bodyRoot);

  const bladdersGroup = new THREE.Group();
  bladdersGroup.name = 'gsuit-bladders';
  bodyRoot.add(bladdersGroup);

  // =========================================================================
  // 2. KAKI ATLETIS HEROIK + BOT HITAM + KANTUNG PAHA & BETIS BIRU PNEUMATIK
  // =========================================================================
  for (const s of [1, -1] as const) {
    // Kaki kiri sedikit maju ke depan (+Z) untuk postur berdiri gagah & natural!
    const stanceZ = s < 0 ? 0.18 : -0.14;
    const footX = s * 0.94;

    const bootG = new THREE.Group();
    bootG.position.set(footX, 0.34, stanceZ);
    bootG.rotation.y = s * 0.22;

    const sole = mkMesh(new THREE.BoxGeometry(0.68, 0.18, 1.5), soleMat);
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
    bodyRoot.add(bootG);

    // Celana Flight Suit Hijau Zaitun mengikuti postur kaki atletis
    const legGeo = buildClothLoft(
      [
        { y: 1.18, cx: footX, cz: stanceZ - 0.02, rx: 0.42, rz: 0.44, fold: 0.045 },
        { y: 2.05, cx: s * 0.9, cz: stanceZ * 0.85, rx: 0.49, rz: 0.51, fold: 0.04 },
        { y: 3.15, cx: s * 0.84, cz: stanceZ * 0.65 + 0.04, rx: 0.47, rz: 0.49, fold: 0.035 },
        { y: 4.08, cx: s * 0.76, cz: stanceZ * 0.55 + 0.07, rx: 0.44, rz: 0.46, fold: 0.03 },
        { y: 5.05, cx: s * 0.68, cz: stanceZ * 0.3 + 0.03, rx: 0.55, rz: 0.58, fold: 0.03 },
        { y: 5.9, cx: s * 0.58, cz: 0.0, rx: 0.58, rz: 0.6, fold: 0.025 },
      ],
      32,
      true,
      true,
    );
    bodyRoot.add(mkMesh(legGeo, flightSuitMat));

    // Lapisan Luar G-Suit (chaps pengikat paha & betis)
    const chapGeo = buildClothLoft(
      [
        { y: 1.45, cx: s * 0.92, cz: stanceZ * 0.9, rx: 0.45, rz: 0.47, fold: 0.015 },
        { y: 3.35, cx: s * 0.82, cz: stanceZ * 0.6 + 0.04, rx: 0.5, rz: 0.52, fold: 0.015 },
        { y: 5.75, cx: s * 0.6, cz: 0.01, rx: 0.6, rz: 0.62, fold: 0.015 },
      ],
      28,
      true,
      true,
    );
    bodyRoot.add(mkMesh(chapGeo, gSuitOuterMat));

    // ---- KANTUNG BETIS (CALF BLADDER — BIRU PNEUMATIK BERALUR) ----
    const calfPad = mkMesh(new THREE.CapsuleGeometry(0.32, 1.06, 10, 20), makeBladderMat());
    calfPad.scale.set(0.95, 1.0, 0.48);
    calfPad.position.set(s * 0.88, 2.38, stanceZ * 0.78 + 0.44);
    calfPad.rotation.y = s * 0.18;
    calfPad.name = `gsuit-bladder-calf-${s > 0 ? 'r' : 'l'}`;
    bladdersGroup.add(calfPad);

    // Tali pengikat betis & lutut (hitam)
    for (const [sy, tz] of [
      [1.55, stanceZ * 0.9],
      [3.22, stanceZ * 0.65 + 0.04],
      [4.02, stanceZ * 0.55 + 0.07],
    ]) {
      const band = mkMesh(new THREE.TorusGeometry(0.49, 0.032, 8, 24), strapMat);
      band.rotation.x = Math.PI / 2;
      band.position.set(s * (sy < 2 ? 0.91 : sy < 3.5 ? 0.83 : 0.76), sy, tz);
      bodyRoot.add(band);
    }

    // ---- KANTUNG PAHA (THIGH BLADDER — BIRU PNEUMATIK BESAR) ----
    const thighPad = mkMesh(new THREE.CapsuleGeometry(0.39, 1.15, 12, 22), makeBladderMat());
    thighPad.scale.set(1.04, 1.0, 0.5);
    thighPad.position.set(s * 0.69, 4.92, stanceZ * 0.32 + 0.5);
    thighPad.rotation.y = s * 0.2;
    thighPad.name = `gsuit-bladder-thigh-${s > 0 ? 'r' : 'l'}`;
    bladdersGroup.add(thighPad);

    // Strap pengikat paha harness
    addWebbingStrap(bodyRoot, [s * 0.65, 6.08, 0.66], [s * 0.18, 5.28, 0.62], 0.14, 0.05);
    addWebbingStrap(bodyRoot, [s * 0.18, 5.28, 0.62], [s * 0.96, 5.42, 0.5], 0.14, 0.05);
  }

  // =========================================================================
  // 3. TORSO BEROTOT ALAMI + KANTUNG PERUT + HARNESS + LENGAN BERSIKU NATURAL
  // =========================================================================
  const upperBody = new THREE.Group();
  upperBody.name = 'gsuit-upper-body';
  bodyRoot.add(upperBody);

  const torsoGeo = buildClothLoft(
    [
      { y: 5.75, rx: 1.18, rz: 0.68, sq: 0.88, fold: 0.025 },
      { y: 6.45, rx: 1.1, rz: 0.66, sq: 0.88, fold: 0.025 },
      { y: 7.2, rx: 1.2, rz: 0.72, sq: 0.86, fold: 0.025 },
      { y: 7.95, rx: 1.42, rz: 0.76, sq: 0.84, fold: 0.02 },
      { y: 8.58, rx: 1.52, rz: 0.68, sq: 0.84, fold: 0.015 },
      { y: 8.88, rx: 0.52, rz: 0.46, sq: 0.94, fold: 0.01 },
    ],
    40,
    true,
    true,
  );
  upperBody.add(mkMesh(torsoGeo, flightSuitMat));

  // ---- KANTUNG PERUT (ABDOMINAL BLADDER — MELENGKUNG MENGIKUTI PERUT) ----
  const abdPad = mkMesh(new THREE.CylinderGeometry(1.16, 1.2, 0.72, 28, 1, false, -Math.PI * 0.34, Math.PI * 0.68), makeBladderMat());
  abdPad.scale.set(1.0, 1.0, 0.64);
  abdPad.position.set(0, 6.18, 0.04);
  abdPad.name = 'gsuit-bladder-abdomen';
  bladdersGroup.add(abdPad);

  // Sabuk Pengikat Pinggang (Waist Belt) & Gesper Logam
  const waistBelt = mkMesh(new THREE.CylinderGeometry(1.19, 1.22, 0.24, 36), strapMat);
  waistBelt.scale.set(1.0, 1.0, 0.64);
  waistBelt.position.set(0, 6.66, 0.02);
  upperBody.add(waistBelt);
  const beltBuckle = mkMesh(new THREE.BoxGeometry(0.42, 0.28, 0.16), metalMat);
  beltBuckle.position.set(0, 6.66, 0.8);
  upperBody.add(beltBuckle);

  // Harness Dada & Bahu Hitam Kursi Lontar + Gesper Logam
  for (const s of [1, -1] as const) {
    addWebbingStrap(upperBody, [s * 0.78, 8.64, 0.56], [s * 0.72, 6.68, 0.74], 0.2, 0.08);
    addWebbingStrap(upperBody, [s * 0.78, 8.64, -0.56], [s * 0.72, 6.68, -0.68], 0.2, 0.08);
    const koch = mkMesh(new THREE.BoxGeometry(0.24, 0.28, 0.16), metalMat);
    koch.position.set(s * 0.78, 8.3, 0.68);
    upperBody.add(koch);
  }
  const chestStrap = mkMesh(new THREE.BoxGeometry(1.68, 0.18, 0.1), strapMat);
  chestStrap.position.set(0, 7.64, 0.78);
  upperBody.add(chestStrap);
  const chestBuckle = mkMesh(new THREE.BoxGeometry(0.32, 0.24, 0.16), metalMat);
  chestBuckle.position.set(0, 7.64, 0.82);
  upperBody.add(chestBuckle);

  // Badge TNI AU di dada
  const chestBadge = mkMesh(
    new THREE.PlaneGeometry(0.48, 0.19),
    new THREE.MeshStandardMaterial({
      map: textTexture('TNI AU', { color: '#ffb703', aspect: 2.5 }),
      transparent: true,
      roughness: 0.5,
    }),
  );
  chestBadge.position.set(0, 8.08, 0.78);
  upperBody.add(chestBadge);

  // Lengan Natural Bersiku Sedikit Menekuk (Bukan Lurus Kaku!) + Patch Bendera & Roundel + Sarung Tangan
  for (const s of [1, -1] as const) {
    const elbowOut = s * 1.94;
    const wristX = s * 1.68;
    const wristZ = s > 0 ? 0.42 : 0.34;
    const armGeo = buildClothLoft(
      [
        { y: 5.58, cx: wristX, cz: wristZ, rx: 0.23, rz: 0.25, fold: 0.03 },
        { y: 6.32, cx: s * 1.84, cz: wristZ * 0.5, rx: 0.3, rz: 0.32, fold: 0.045 },
        { y: 7.05, cx: elbowOut, cz: -0.14, rx: 0.35, rz: 0.37, fold: 0.05 }, // Siku menekuk natural ke belakang!
        { y: 7.88, cx: s * 1.72, cz: -0.06, rx: 0.41, rz: 0.43, fold: 0.035 },
        { y: 8.5, cx: s * 1.4, cz: 0.02, rx: 0.45, rz: 0.47, fold: 0.02 },
      ],
      26,
      true,
      true,
    );
    upperBody.add(mkMesh(armGeo, flightSuitMat));

    const patch = mkMesh(
      new THREE.PlaneGeometry(0.46, 0.34),
      new THREE.MeshStandardMaterial({ map: s < 0 ? flagTexture() : roundelTexture(), transparent: true, roughness: 0.45 }),
    );
    patch.position.set(s * 2.13, 8.0, -0.04);
    patch.rotation.y = s * (Math.PI / 2);
    upperBody.add(patch);

    // Manset, Jam Tangan (kiri), & Sarung Tangan Hitam Penerbang
    const cuff = mkMesh(new THREE.CylinderGeometry(0.24, 0.22, 0.24, 16), strapMat);
    cuff.position.set(wristX, 5.56, wristZ);
    cuff.rotation.x = 0.24;
    upperBody.add(cuff);

    const palm = mkMesh(new THREE.SphereGeometry(0.23, 16, 14), gloveMat);
    palm.scale.set(0.76, 1.22, 0.94);
    palm.position.set(wristX - s * 0.05, 5.24, wristZ + 0.09);
    upperBody.add(palm);

    for (let f = -1; f <= 1; f++) {
      const finger = mkMesh(new THREE.CapsuleGeometry(0.046, 0.16, 6, 10), gloveMat);
      finger.position.set(wristX - s * 0.05 + f * 0.072, 4.96, wristZ + 0.16);
      finger.rotation.x = 0.42;
      upperBody.add(finger);
    }
  }

  // =========================================================================
  // 4. SELANG PNEUMATIK ANTI-G & KONEKTOR KOKPIT (SISI KIRI)
  // =========================================================================
  const gHoseCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.12, 6.45, 0.36),
    new THREE.Vector3(-1.42, 5.65, 0.3),
    new THREE.Vector3(-1.52, 4.25, 0.22),
    new THREE.Vector3(-1.54, 2.75, 0.18),
    new THREE.Vector3(-1.46, 1.58, 0.16),
  ]);
  const gHose = mkMesh(new THREE.TubeGeometry(gHoseCurve, 44, 0.09, 12, false), airTubeMat);
  gHose.name = 'gsuit-tube-main';
  bladdersGroup.add(gHose);

  for (let i = 1; i < 22; i++) {
    const pt = gHoseCurve.getPoint(i / 22);
    const tan = gHoseCurve.getTangent(i / 22);
    const rib = mkMesh(new THREE.TorusGeometry(0.102, 0.017, 8, 14), darkMetalMat);
    rib.position.copy(pt);
    rib.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan);
    bodyRoot.add(rib);
  }

  // Konektor cepat Anti-G kokpit (emas-logam)
  const gValveConn = mkMesh(new THREE.CylinderGeometry(0.14, 0.14, 0.36, 16), goldMat);
  gValveConn.position.set(-1.46, 1.48, 0.16);
  bodyRoot.add(gValveConn);

  // =========================================================================
  // 5. KEPALA PILOT DENGAN HELM HGU-55/P + VISOR GELAP + MASKER MBU-20/P (BERGERAK HALUS!)
  // =========================================================================
  const neck = mkMesh(new THREE.CylinderGeometry(0.42, 0.48, 0.55, 20), strapMat);
  neck.position.set(0, 9.04, 0.02);
  upperBody.add(neck);

  const headG = new THREE.Group();
  headG.name = 'gsuit-head';
  headG.position.set(0, 9.76, 0.04);
  upperBody.add(headG);

  // Siluet wajah/balaclava gelap di dalam helm
  const innerHead = mkMesh(new THREE.SphereGeometry(0.74, 24, 18), strapMat);
  innerHead.scale.set(0.88, 1.0, 0.94);
  headG.add(innerHead);

  // Cangkang helm komposit abu-abu terang dengan bukaan wajah di depan (+Z) agar tidak memotong visor!
  const helmShellGeo = new THREE.SphereGeometry(0.84, 36, 26, 0, Math.PI * 2, 0, Math.PI * 0.78);
  const hsPos = helmShellGeo.attributes.position;
  for (let i = 0; i < hsPos.count; i++) {
    let x = hsPos.getX(i);
    let y = hsPos.getY(i);
    let z = hsPos.getZ(i);
    z *= z < 0 ? 1.08 : 1.0;
    x *= 0.95;
    // Bukaan wajah di depan (+Z)
    if (z > 0.25 && y < 0.32) {
      const f = Math.min(1, Math.max(0, (z - 0.25) / 0.45)) * Math.min(1, Math.max(0, (0.32 - y) / 0.45));
      z -= f * 0.28;
      y += f * 0.14;
    }
    hsPos.setXYZ(i, x, y, z);
  }
  helmShellGeo.computeVertexNormals();
  headG.add(mkMesh(helmShellGeo, helmetShellMat));

  // Visor gelap reflektif utuh dengan lekukan hidung presisi (radius 0.88 > cangkang depan, 100% bebas terpotong!)
  const helmVisorGeo = new THREE.SphereGeometry(0.88, 32, 20, -Math.PI * 0.39, Math.PI * 0.78, Math.PI * 0.27, Math.PI * 0.3);
  const hvPos = helmVisorGeo.attributes.position;
  for (let i = 0; i < hvPos.count; i++) {
    const x = hvPos.getX(i);
    let y = hvPos.getY(i);
    const z = hvPos.getZ(i);
    if (y < 0.02 && Math.abs(z) < 0.26) {
      const notch = Math.cos((z / 0.26) * (Math.PI / 2));
      y += notch * 0.14 * Math.min(1, Math.max(0, (0.02 - y) / 0.24));
    }
    hvPos.setXYZ(i, x, y, z);
  }
  helmVisorGeo.computeVertexNormals();
  const helmVisor = mkMesh(helmVisorGeo, helmetVisorMat);
  helmVisor.rotation.y = Math.PI / 2;
  helmVisor.scale.set(0.97, 1.0, 1.03);
  headG.add(helmVisor);

  // List karet hitam di atas visor (brow seal)
  const browSeal = mkMesh(new THREE.TorusGeometry(0.87, 0.028, 8, 28, Math.PI * 0.76), strapMat);
  browSeal.rotation.x = Math.PI / 2 - 0.12;
  browSeal.rotation.z = -Math.PI * 0.38;
  browSeal.position.set(0, 0.34, 0.06);
  headG.add(browSeal);

  // Soket samping visor hitam
  for (const s of [1, -1] as const) {
    const knob = mkMesh(new THREE.CylinderGeometry(0.11, 0.12, 0.1, 14), strapMat);
    knob.rotation.z = Math.PI / 2;
    knob.position.set(s * 0.8, 0.18, 0.25);
    headG.add(knob);
  }

  // Masker oksigen MBU-20/P & strap ke pipi helm + selang oksigen melengkung ke dada
  const maskCone = mkMesh(new THREE.ConeGeometry(0.32, 0.64, 16), darkMetalMat);
  maskCone.rotation.x = Math.PI / 2.2;
  maskCone.position.set(0, -0.34, 0.78);
  headG.add(maskCone);

  for (const s of [1, -1] as const) {
    const mStrap = new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * 0.24, -0.34, 0.84),
      new THREE.Vector3(s * 0.56, -0.32, 0.66),
      new THREE.Vector3(s * 0.74, -0.3, 0.34),
    ]);
    headG.add(mkMesh(new THREE.TubeGeometry(mStrap, 12, 0.036, 8, false), strapMat));
  }

  const o2HoseCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.45, 0.98),
    new THREE.Vector3(0.24, -0.88, 1.04),
    new THREE.Vector3(0.45, -1.42, 0.9),
    new THREE.Vector3(0.54, -1.95, 0.8),
  ]);
  headG.add(mkMesh(new THREE.TubeGeometry(o2HoseCurve, 24, 0.085, 10, false), airTubeMat));

  return {
    group: g,
    nozzles: [],
    spinners: [],
    navLights: [
      { pos: [2.55, 0.28, 0], color: '#4da6ff' },
      { pos: [-2.55, 0.28, 0], color: '#4da6ff' },
      { pos: [0, 0.28, 2.55], color: '#ffb703', blink: 'beacon' },
    ],
    glowMats,
    hoverHeight: 0,
  };
}
