import * as THREE from 'three';
import { buildLoftGeometry, mkMesh } from './aeroGeo';
import { flagTexture, roundelTexture, solidNoiseTexture, textTexture } from './textures';
import type { BuildResult } from './proceduralBuilder';

/** Membuat tekstur peta taktis GPS menyala untuk layar Flight Computer & GPS di paha kiri. */
function makeFlightComputerTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 320;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#081826';
  ctx.fillRect(0, 0, 256, 320);

  // Grid koordinat peta taktis
  ctx.strokeStyle = 'rgba(0, 255, 170, 0.22)';
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

  // Lingkaran radar & rute penerbangan GPS
  ctx.strokeStyle = '#00ffaa';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(128, 162, 68, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(128, 162, 34, 0, Math.PI * 2);
  ctx.stroke();

  // Rute waypoint emas
  ctx.strokeStyle = '#ffb703';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(46, 245);
  ctx.lineTo(128, 162);
  ctx.lineTo(192, 92);
  ctx.stroke();

  // Header & telemetri bawah
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
 * Model 3D G-Suit & Flight Suit Tempur TNI AU sesuai referensi:
 * - Flight Suit (FRW-2 Nomex) hijau zaitun militer (#515b3b) dengan lipatan kain alami (cloth folds)
 * - Dual LPU Flotation Lobes abu-hijau di dada atas + Rompi Survival Multi-Pouch MOLLE di perut/dada
 * - Anti-G Suit (CSU-13B/P) dengan 5 kantung udara pneumatik + selang Anti-G di sisi kiri
 * - Harness Kursi Lontar hitam menyilang dengan gesper cepat logam
 * - Flight Computer & GPS Tablet menyala di paha kiri
 * - Pelindung Lutut Taktis (Tactical Knee Pads) di kedua lutut
 * - Survival Kit (kantong survival, sinyal darurat oranye, pisau taktis)
 * - Modern Combat Flight Boots hijau zaitun-tan bersol tebal
 *
 * (Dipisahkan dari Helm Pilot agar lebih detail & fokus pada baju tempur + perlengkapan tubuh)
 */
export function buildDetailedGSuit(): BuildResult {
  const g = new THREE.Group();
  const glowMats: THREE.MeshStandardMaterial[] = [];

  // ---------------------- Material PBR Realistis (Palet Olive Drab Referensi) ----------------------
  const flightSuitTex = solidNoiseTexture('#525d3c', 721, 0.065);
  const gsuitTex = solidNoiseTexture('#4d554a', 722, 0.06);
  const vestTex = solidNoiseTexture('#444e34', 723, 0.07);
  const lobeTex = solidNoiseTexture('#7e8c7f', 724, 0.05);

  const flightSuitMat = new THREE.MeshStandardMaterial({
    map: flightSuitTex,
    roughness: 0.86,
    metalness: 0.03,
  });
  const bladderMat = new THREE.MeshStandardMaterial({
    map: gsuitTex,
    roughness: 0.65,
    metalness: 0.12,
    emissive: new THREE.Color('#000000'),
    emissiveIntensity: 0,
  });
  const airTubeMat = new THREE.MeshStandardMaterial({
    color: '#1f252c',
    roughness: 0.54,
    metalness: 0.22,
    emissive: new THREE.Color('#000000'),
    emissiveIntensity: 0,
  });
  const vestMat = new THREE.MeshStandardMaterial({
    map: vestTex,
    roughness: 0.78,
    metalness: 0.08,
  });
  const lobeMat = new THREE.MeshStandardMaterial({
    map: lobeTex,
    roughness: 0.7,
    metalness: 0.1,
  });
  const strapMat = new THREE.MeshStandardMaterial({
    color: '#1c2125',
    roughness: 0.84,
    metalness: 0.06,
  });
  const kneePadMat = new THREE.MeshStandardMaterial({
    color: '#3f423d',
    roughness: 0.52,
    metalness: 0.18,
  });
  const bootMat = new THREE.MeshStandardMaterial({
    color: '#5c5942', // Modern olive-tan combat flight boots sesuai referensi
    roughness: 0.72,
    metalness: 0.08,
  });
  const soleMat = new THREE.MeshStandardMaterial({
    color: '#232724',
    roughness: 0.88,
    metalness: 0.05,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: '#bcc7d4',
    roughness: 0.26,
    metalness: 0.88,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: '#242b33',
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
    color: '#424a38',
    roughness: 0.78,
    metalness: 0.05,
  });
  const platformMat = new THREE.MeshStandardMaterial({
    color: '#12284c',
    roughness: 0.35,
    metalness: 0.68,
  });
  const platformGlow = new THREE.MeshStandardMaterial({
    color: '#4da6ff',
    emissive: new THREE.Color('#4da6ff'),
    emissiveIntensity: 0.75,
    roughness: 0.2,
  });
  glowMats.push(platformGlow);

  /**
   * Loft vertikal anatomis dengan efek lipatan kain halus (fabric folds)
   * agar tampilan baju terbang terasa realistis, tidak seperti silinder kaku.
   */
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
            foldAmp * Math.sin(th * 5 + idx * 1.4) +
            foldAmp * 0.6 * Math.cos(th * 3 - idx * 0.9);
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

  // =========================================================================
  // 1. PLATFORM DISPLAY TAKTIS (y = 0 .. 0.34)
  // =========================================================================
  const basePlate = mkMesh(new THREE.CylinderGeometry(2.65, 2.9, 0.24, 56), platformMat);
  basePlate.position.y = 0.12;
  g.add(basePlate);

  const innerPlate = mkMesh(new THREE.CylinderGeometry(2.25, 2.38, 0.1, 48), darkMetalMat);
  innerPlate.position.y = 0.29;
  g.add(innerPlate);

  const ringGlow = mkMesh(new THREE.TorusGeometry(2.5, 0.045, 12, 64), platformGlow);
  ringGlow.rotation.x = Math.PI / 2;
  ringGlow.position.y = 0.25;
  g.add(ringGlow);

  const goldRing = mkMesh(new THREE.TorusGeometry(2.04, 0.024, 10, 64), goldMat);
  goldRing.rotation.x = Math.PI / 2;
  goldRing.position.y = 0.345;
  g.add(goldRing);

  const bladdersGroup = new THREE.Group();
  bladdersGroup.name = 'gsuit-bladders';
  g.add(bladdersGroup);

  // =========================================================================
  // 2. MODERN COMBAT BOOTS + KAKI FLIGHT SUIT (FRW-2) + KNEE PADS + G-BLADDERS
  // =========================================================================
  for (const s of [1, -1] as const) {
    // Sepatu Bot Taktis Modern (olive-tan bersol tebal)
    const bootG = new THREE.Group();
    bootG.position.set(s * 0.88, 0.34, 0);
    bootG.rotation.y = s * 0.14;

    const sole = mkMesh(new THREE.BoxGeometry(0.72, 0.20, 1.52), soleMat);
    sole.position.set(0, 0.10, 0.24);
    bootG.add(sole);

    const upper = mkMesh(
      buildClothLoft(
        [
          { y: 0.18, cz: 0.22, rx: 0.36, rz: 0.70, sq: 0.84, fold: 0.01 },
          { y: 0.46, cz: 0.14, rx: 0.34, rz: 0.56, sq: 0.88, fold: 0.01 },
          { y: 0.78, cz: -0.02, rx: 0.35, rz: 0.38, sq: 0.94, fold: 0.01 },
          { y: 1.28, cz: -0.04, rx: 0.39, rz: 0.41, sq: 0.94, fold: 0.01 },
        ],
        24,
        true,
        true,
      ),
      bootMat,
    );
    bootG.add(upper);

    // Tali sepatu bot
    for (let i = 0; i < 4; i++) {
      const lace = mkMesh(new THREE.BoxGeometry(0.24, 0.045, 0.09), soleMat);
      lace.position.set(0, 0.56 + i * 0.17, 0.32);
      bootG.add(lace);
    }
    g.add(bootG);

    // Celana Flight Suit (FRW-2) dengan lipatan kain alami di pergelangan & paha
    const legGeo = buildClothLoft(
      [
        { y: 1.22, cx: s * 0.88, cz: -0.02, rx: 0.45, rz: 0.48, fold: 0.045 },
        { y: 1.95, cx: s * 0.87, cz: -0.01, rx: 0.50, rz: 0.52, fold: 0.04 },
        { y: 2.95, cx: s * 0.84, cz: 0.02, rx: 0.51, rz: 0.54, fold: 0.035 },
        { y: 3.95, cx: s * 0.80, cz: 0.06, rx: 0.47, rz: 0.49, fold: 0.03 },
        { y: 4.95, cx: s * 0.74, cz: 0.04, rx: 0.59, rz: 0.62, fold: 0.035 },
        { y: 5.95, cx: s * 0.66, cz: 0.01, rx: 0.64, rz: 0.65, fold: 0.03 },
        { y: 6.45, cx: s * 0.56, cz: 0.0, rx: 0.62, rz: 0.63, fold: 0.02 },
      ],
      32,
      true,
      true,
    );
    g.add(mkMesh(legGeo, flightSuitMat));

    // ---- KANTUNG UDARA BETIS (CALF G-BLADDER) ----
    const calfBladderGeo = buildClothLoft(
      [
        { y: 1.72, cx: s * 0.87, cz: -0.02, rx: 0.48, rz: 0.51, fold: 0.02 },
        { y: 2.45, cx: s * 0.85, cz: 0.0, rx: 0.56, rz: 0.58, fold: 0.02 },
        { y: 3.25, cx: s * 0.82, cz: 0.03, rx: 0.55, rz: 0.57, fold: 0.02 },
        { y: 3.65, cx: s * 0.80, cz: 0.04, rx: 0.50, rz: 0.52, fold: 0.02 },
      ],
      28,
      true,
      true,
    );
    const calfBladder = mkMesh(calfBladderGeo, bladderMat);
    calfBladder.name = `gsuit-bladder-calf-${s > 0 ? 'r' : 'l'}`;
    bladdersGroup.add(calfBladder);

    // Kantong kargo betis samping (khas celana pilot tempur)
    const calfPocket = mkMesh(new THREE.BoxGeometry(0.18, 0.88, 0.56), flightSuitMat);
    calfPocket.position.set(s * 1.38, 2.55, 0.08);
    g.add(calfPocket);

    // ---- PELINDUNG LUTUT TAKTIS (TACTICAL KNEE PADS) SESUAI REFERENSI ----
    const kneeCap = mkMesh(new THREE.SphereGeometry(0.46, 22, 18), kneePadMat);
    kneeCap.scale.set(0.95, 1.18, 0.42);
    kneeCap.position.set(s * 0.79, 4.02, 0.46);
    g.add(kneeCap);

    const kneeRim = mkMesh(new THREE.TorusGeometry(0.41, 0.04, 10, 24), strapMat);
    kneeRim.scale.set(0.95, 1.18, 0.5);
    kneeRim.position.set(s * 0.79, 4.02, 0.44);
    g.add(kneeRim);

    // ---- KANTUNG UDARA PAHA (THIGH G-BLADDER) ----
    const thighBladderGeo = buildClothLoft(
      [
        { y: 4.52, cx: s * 0.76, cz: 0.05, rx: 0.56, rz: 0.58, fold: 0.02 },
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

    // Sabuk harness paha menyilang (black leg harness)
    const legStrap = mkMesh(new THREE.TorusGeometry(0.68, 0.052, 8, 28), strapMat);
    legStrap.rotation.x = Math.PI / 2;
    legStrap.rotation.y = s * 0.14;
    legStrap.position.set(s * 0.69, 5.65, 0.03);
    g.add(legStrap);
  }

  // ---- FLIGHT COMPUTER & GPS TABLET (EFB KNEEBOARD) DI PAHA KIRI SESUAI REFERENSI ----
  const gpsGroup = new THREE.Group();
  gpsGroup.position.set(-0.78, 5.18, 0.74);
  gpsGroup.rotation.set(-0.06, -0.18, 0.04);
  const tabletBody = mkMesh(new THREE.BoxGeometry(0.76, 1.02, 0.10), darkMetalMat);
  gpsGroup.add(tabletBody);
  const tabletScreen = mkMesh(
    new THREE.PlaneGeometry(0.64, 0.86),
    new THREE.MeshStandardMaterial({
      map: makeFlightComputerTexture(),
      emissive: new THREE.Color('#00ffaa'),
      emissiveIntensity: 0.25,
      roughness: 0.2,
    }),
  );
  tabletScreen.position.z = 0.055;
  tabletScreen.name = 'gsuit-gps-screen';
  gpsGroup.add(tabletScreen);
  // Tali pengikat tablet ke paha
  const tabStrap = mkMesh(new THREE.TorusGeometry(0.66, 0.036, 8, 24), strapMat);
  tabStrap.rotation.x = Math.PI / 2;
  tabStrap.position.set(0.08, 0, -0.68);
  gpsGroup.add(tabStrap);
  g.add(gpsGroup);

  // ---- SURVIVAL KIT & HOLSTER DI PAHA KANAN / KIRI ----
  const survivalPack = mkMesh(new THREE.BoxGeometry(0.32, 0.68, 0.36), vestMat);
  survivalPack.position.set(1.36, 5.25, 0.12);
  g.add(survivalPack);
  const orangeBeacon = mkMesh(new THREE.BoxGeometry(0.18, 0.34, 0.14), orangeSurvivalMat);
  orangeBeacon.position.set(1.48, 5.38, 0.26);
  g.add(orangeBeacon);

  // =========================================================================
  // 3. TORSO FLIGHT SUIT (FRW-2) + LENGAN BERKONTUR & SARUNG TANGAN NOMEX
  // =========================================================================
  const torsoGeo = buildClothLoft(
    [
      { y: 6.12, rx: 1.24, rz: 0.72, sq: 0.88, fold: 0.03 },
      { y: 6.72, rx: 1.15, rz: 0.68, sq: 0.88, fold: 0.03 },
      { y: 7.35, rx: 1.14, rz: 0.70, sq: 0.86, fold: 0.025 },
      { y: 8.05, rx: 1.34, rz: 0.76, sq: 0.84, fold: 0.025 },
      { y: 8.75, rx: 1.58, rz: 0.74, sq: 0.82, fold: 0.02 },
      { y: 9.15, rx: 1.38, rz: 0.58, sq: 0.86, fold: 0.015 },
      { y: 9.38, rx: 0.56, rz: 0.48, sq: 0.94, fold: 0.01 },
    ],
    40,
    true,
    true,
  );
  g.add(mkMesh(torsoGeo, flightSuitMat));

  // Kerah jaket penerbangan & penutup leher display taktis (tanpa kepala karena Helm dipisah)
  const collar = mkMesh(new THREE.TorusGeometry(0.56, 0.16, 12, 28), flightSuitMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 9.38, 0.04);
  g.add(collar);
  const neckCap = mkMesh(new THREE.CylinderGeometry(0.46, 0.48, 0.16, 28), darkMetalMat);
  neckCap.position.set(0, 9.54, 0.02);
  g.add(neckCap);
  const neckGold = mkMesh(new THREE.TorusGeometry(0.47, 0.026, 10, 32), goldMat);
  neckGold.rotation.x = Math.PI / 2;
  neckGold.position.set(0, 9.60, 0.02);
  g.add(neckGold);

  // Lengan organik berlipatan kain + Sarung Tangan Nomex & Jam Tangan Penerbang
  for (const s of [1, -1] as const) {
    const armGeo = buildClothLoft(
      [
        { y: 5.95, cx: s * 1.72, cz: 0.24, rx: 0.25, rz: 0.27, fold: 0.03 },
        { y: 6.65, cx: s * 1.80, cz: 0.12, rx: 0.31, rz: 0.33, fold: 0.04 },
        { y: 7.35, cx: s * 1.84, cz: -0.02, rx: 0.36, rz: 0.38, fold: 0.045 },
        { y: 8.15, cx: s * 1.74, cz: -0.02, rx: 0.42, rz: 0.44, fold: 0.04 },
        { y: 8.80, cx: s * 1.48, cz: 0.02, rx: 0.46, rz: 0.48, fold: 0.02 },
      ],
      26,
      true,
      true,
    );
    g.add(mkMesh(armGeo, flightSuitMat));

    // Patch Merah Putih (kanan) & Roundel TNI AU (kiri)
    const patch = mkMesh(
      new THREE.PlaneGeometry(0.42, 0.32),
      new THREE.MeshStandardMaterial({ map: s > 0 ? flagTexture() : roundelTexture(), transparent: true, roughness: 0.5 }),
    );
    patch.position.set(s * 2.15, 8.32, 0.02);
    patch.rotation.y = s * (Math.PI / 2);
    g.add(patch);

    // Manset & Sarung Tangan Nomex
    const cuff = mkMesh(new THREE.CylinderGeometry(0.26, 0.24, 0.26, 18), strapMat);
    cuff.position.set(s * 1.72, 5.92, 0.25);
    g.add(cuff);

    const palm = mkMesh(new THREE.SphereGeometry(0.28, 16, 14), gloveMat);
    palm.scale.set(0.78, 1.32, 0.96);
    palm.position.set(s * 1.68, 5.56, 0.32);
    g.add(palm);
  }

  // Jam tangan taktis penerbang di pergelangan kiri (sesuai referensi)
  const watch = mkMesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 18), darkMetalMat);
  watch.rotation.z = Math.PI / 2;
  watch.position.set(-1.92, 6.02, 0.34);
  g.add(watch);

  // =========================================================================
  // 4. KANTUNG UDARA PERUT + SELANG ANTI-G SISI KIRI (TURUN HINGGA KAKI)
  // =========================================================================
  const abdBladderGeo = buildClothLoft(
    [
      { y: 6.32, rx: 1.28, rz: 0.76, sq: 0.86, fold: 0.02 },
      { y: 6.85, rx: 1.24, rz: 0.78, sq: 0.84, fold: 0.02 },
      { y: 7.36, rx: 1.22, rz: 0.76, sq: 0.86, fold: 0.02 },
    ],
    34,
    true,
    true,
  );
  const abdBladder = mkMesh(abdBladderGeo, bladderMat);
  abdBladder.name = 'gsuit-bladder-abdomen';
  bladdersGroup.add(abdBladder);

  // Sabuk pinggang taktis & gesper hitam
  const waistBelt = mkMesh(new THREE.CylinderGeometry(1.26, 1.29, 0.24, 36), strapMat);
  waistBelt.scale.set(1.0, 1.0, 0.65);
  waistBelt.position.set(0, 6.48, 0.02);
  g.add(waistBelt);
  const beltBuckle = mkMesh(new THREE.BoxGeometry(0.46, 0.30, 0.16), darkMetalMat);
  beltBuckle.position.set(0, 6.48, 0.85);
  g.add(beltBuckle);

  // Selang Pneumatik Anti-G panjang di sisi kiri (dari perut/pinggul menyusur kaki kiri sesuai referensi)
  const gHoseCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.14, 6.92, 0.42),
    new THREE.Vector3(-1.38, 6.22, 0.38),
    new THREE.Vector3(-1.42, 4.85, 0.24),
    new THREE.Vector3(-1.46, 3.25, 0.18),
    new THREE.Vector3(-1.42, 1.85, 0.14),
  ]);
  const gHose = mkMesh(new THREE.TubeGeometry(gHoseCurve, 44, 0.088, 12, false), airTubeMat);
  gHose.name = 'gsuit-tube-main';
  bladdersGroup.add(gHose);

  for (let i = 1; i < 20; i++) {
    const pt = gHoseCurve.getPoint(i / 20);
    const tan = gHoseCurve.getTangent(i / 20);
    const rib = mkMesh(new THREE.TorusGeometry(0.098, 0.016, 8, 14), darkMetalMat);
    rib.position.copy(pt);
    rib.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan);
    g.add(rib);
  }

  const gValveConn = mkMesh(new THREE.CylinderGeometry(0.12, 0.12, 0.34, 16), metalMat);
  gValveConn.position.set(-1.42, 1.78, 0.14);
  g.add(gValveConn);

  // =========================================================================
  // 5. SURVIVAL VEST (DUAL LPU LOBES + DERETAN 5 POUCH MOLLE + HARNESS)
  // =========================================================================
  const vestGeo = buildClothLoft(
    [
      { y: 7.22, rx: 1.24, rz: 0.78, sq: 0.84, fold: 0.02 },
      { y: 8.05, rx: 1.40, rz: 0.82, sq: 0.82, fold: 0.02 },
      { y: 8.85, rx: 1.46, rz: 0.76, sq: 0.84, fold: 0.015 },
    ],
    34,
    true,
    true,
  );
  g.add(mkMesh(vestGeo, vestMat));

  // Dual LPU Flotation Lobes abu-hijau menonjol di dada kiri & kanan atas (ikonik di referensi!)
  for (const s of [1, -1] as const) {
    const lobe = mkMesh(new THREE.CapsuleGeometry(0.32, 0.68, 12, 20), lobeMat);
    lobe.scale.set(1.0, 1.0, 0.65);
    lobe.position.set(s * 0.62, 8.58, 0.68);
    lobe.rotation.z = s * 0.08;
    g.add(lobe);

    // Harness bahu hitam & pengait cepat Koch
    const shStrap = mkMesh(new THREE.BoxGeometry(0.22, 1.85, 0.14), strapMat);
    shStrap.position.set(s * 0.88, 8.22, 0.72);
    g.add(shStrap);

    const koch = mkMesh(new THREE.BoxGeometry(0.24, 0.28, 0.16), metalMat);
    koch.position.set(s * 0.88, 8.85, 0.74);
    g.add(koch);
  }

  // Deretan 5 kantong MOLLE Survival Vest melingkar di dada bawah / perut atas (sesuai referensi!)
  const pouchSpecs = [
    { x: -1.06, z: 0.66, ry: -0.52, w: 0.42, h: 0.72 },
    { x: -0.56, z: 0.84, ry: -0.22, w: 0.44, h: 0.76 },
    { x: 0.0, z: 0.90, ry: 0, w: 0.40, h: 0.70 },
    { x: 0.56, z: 0.84, ry: 0.22, w: 0.44, h: 0.76 },
    { x: 1.06, z: 0.66, ry: 0.52, w: 0.42, h: 0.72 },
  ];
  for (const p of pouchSpecs) {
    const pGroup = new THREE.Group();
    pGroup.position.set(p.x, 7.28, p.z);
    pGroup.rotation.y = p.ry;
    pGroup.add(mkMesh(new THREE.BoxGeometry(p.w, p.h, 0.26), vestMat));
    const flap = mkMesh(new THREE.BoxGeometry(p.w + 0.02, 0.22, 0.29), bladderMat);
    flap.position.y = p.h * 0.34;
    pGroup.add(flap);
    const clip = mkMesh(new THREE.BoxGeometry(0.10, 0.12, 0.31), strapMat);
    clip.position.y = p.h * 0.16;
    pGroup.add(clip);
    g.add(pGroup);
  }

  // Sabuk dada horizontal & gesper pengunci utama
  const chestStrap = mkMesh(new THREE.BoxGeometry(1.72, 0.18, 0.12), strapMat);
  chestStrap.position.set(0, 8.02, 0.86);
  g.add(chestStrap);
  const chestBuckle = mkMesh(new THREE.BoxGeometry(0.32, 0.24, 0.16), darkMetalMat);
  chestBuckle.position.set(0, 8.02, 0.89);
  g.add(chestBuckle);

  // Antena Radio Darurat PRC-112 di bahu kiri belakang
  const radioAnt = mkMesh(new THREE.CylinderGeometry(0.02, 0.028, 0.95, 10), darkMetalMat);
  radioAnt.position.set(-1.12, 9.15, 0.35);
  g.add(radioAnt);

  // Badge TNI AU di dada
  const chestBadge = mkMesh(
    new THREE.PlaneGeometry(0.46, 0.18),
    new THREE.MeshStandardMaterial({
      map: textTexture('TNI AU', { color: '#ffb703', aspect: 2.5 }),
      transparent: true,
      roughness: 0.55,
    }),
  );
  chestBadge.position.set(0, 8.46, 0.86);
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
