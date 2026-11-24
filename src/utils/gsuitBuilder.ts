import * as THREE from 'three';
import { buildLoftGeometry, mkMesh } from './aeroGeo';
import { flagTexture, roundelTexture, solidNoiseTexture, textTexture } from './textures';
import type { BuildResult } from './proceduralBuilder';

/**
 * Model 3D Museum-Grade (Tanpa Kepala/Helm & Tanpa Lengan Kaku):
 * BAJU TERBANG NOMEX + G-SUIT ANTI-9G (CSU-13B/P) + ROMPI SURVIVAL LPU-9/P + HARNESS KURSI LONTAR PCU-15/P
 * Dibangun menggunakan permukaan loft anatomis yang halus & organik (bukan silinder kaku),
 * lengkap dengan 5 kantung udara pneumatik berjahitan (perut, paha, betis),
 * saluran selang udara antar-kantung, katup Anti-G, dan Kneeboard checklist.
 *
 * Tinggi total ~9.6 unit, dipajang di atas dudukan display taktis y = 0, menghadap +Z.
 */
export function buildDetailedGSuit(): BuildResult {
  const g = new THREE.Group();
  const glowMats: THREE.MeshStandardMaterial[] = [];

  // ---------------------- Material PBR Realistis ----------------------
  const nomexTex = solidNoiseTexture('#4b5d47', 711, 0.055);
  const gsuitTex = solidNoiseTexture('#354534', 712, 0.065);
  const vestTex = solidNoiseTexture('#2b362d', 713, 0.06);

  const nomexMat = new THREE.MeshStandardMaterial({
    map: nomexTex,
    roughness: 0.82,
    metalness: 0.04,
  });
  const bladderMat = new THREE.MeshStandardMaterial({
    map: gsuitTex,
    roughness: 0.58,
    metalness: 0.16,
    emissive: new THREE.Color('#000000'),
    emissiveIntensity: 0,
  });
  const airTubeMat = new THREE.MeshStandardMaterial({
    color: '#222b32',
    roughness: 0.52,
    metalness: 0.24,
    emissive: new THREE.Color('#000000'),
    emissiveIntensity: 0,
  });
  const vestMat = new THREE.MeshStandardMaterial({
    map: vestTex,
    roughness: 0.74,
    metalness: 0.1,
  });
  const strapMat = new THREE.MeshStandardMaterial({
    color: '#1e2623',
    roughness: 0.82,
    metalness: 0.08,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: '#bcc8d6',
    roughness: 0.24,
    metalness: 0.9,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: '#28313c',
    roughness: 0.36,
    metalness: 0.78,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: '#ffb703',
    roughness: 0.3,
    metalness: 0.72,
  });
  const bootMat = new THREE.MeshStandardMaterial({
    color: '#181d24',
    roughness: 0.42,
    metalness: 0.15,
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

  // Helper loft vertikal (sumbu Y dari bawah ke atas)
  const buildVerticalLoft = (
    stations: { y: number; cx?: number; cz?: number; rx: number; rz: number; sq?: number }[],
    radialSegs = 36,
    capTop = true,
    capBottom = true,
  ) => {
    const geo = buildLoftGeometry(
      stations.map((st) => ({
        z: st.y,
        point: (th) => {
          const s = Math.sin(th);
          const c = Math.cos(th);
          const p = st.sq ?? 1;
          const px = Math.sign(s) * Math.pow(Math.abs(s), p) * st.rx + (st.cx ?? 0);
          const py = Math.sign(c) * Math.pow(Math.abs(c), p) * st.rz + (st.cz ?? 0);
          return [px, py];
        },
      })),
      radialSegs,
      capTop,
      capBottom,
    );
    // buildLoftGeometry membangun sepanjang +Z; putar -90° terhadap X sehingga +Z menjadi +Y
    geo.rotateX(-Math.PI / 2);
    return geo;
  };

  // =========================================================================
  // 1. PLATFORM DISPLAY MUSEUM TAKTIS (y = 0 .. 0.36)
  // =========================================================================
  const basePlate = mkMesh(new THREE.CylinderGeometry(2.55, 2.8, 0.24, 56), platformMat);
  basePlate.position.y = 0.12;
  g.add(basePlate);

  const innerPlate = mkMesh(new THREE.CylinderGeometry(2.15, 2.28, 0.1, 48), darkMetalMat);
  innerPlate.position.y = 0.29;
  g.add(innerPlate);

  const ringGlow = mkMesh(new THREE.TorusGeometry(2.4, 0.045, 12, 64), platformGlow);
  ringGlow.rotation.x = Math.PI / 2;
  ringGlow.position.y = 0.25;
  g.add(ringGlow);

  const goldRing = mkMesh(new THREE.TorusGeometry(1.94, 0.024, 10, 64), goldMat);
  goldRing.rotation.x = Math.PI / 2;
  goldRing.position.y = 0.345;
  g.add(goldRing);

  // Grup kantung udara pneumatik G-Suit (mengembang & berpendar saat Simulasi 9G)
  const bladdersGroup = new THREE.Group();
  bladdersGroup.name = 'gsuit-bladders';
  g.add(bladdersGroup);

  // =========================================================================
  // 2. SEPATU BOT PENERBANG (FLIGHT BOOTS) + KAKI BAJU TERBANG NOMEX ORGANIK
  // =========================================================================
  for (const s of [1, -1] as const) {
    // Sepatu bot kulit organik
    const bootG = new THREE.Group();
    bootG.position.set(s * 0.84, 0.34, 0);
    bootG.rotation.y = s * 0.12;

    const sole = mkMesh(new THREE.BoxGeometry(0.66, 0.16, 1.44), darkMetalMat);
    sole.position.set(0, 0.08, 0.22);
    bootG.add(sole);

    const upper = mkMesh(
      buildVerticalLoft(
        [
          { y: 0.14, cz: 0.18, rx: 0.34, rz: 0.66, sq: 0.85 },
          { y: 0.42, cz: 0.12, rx: 0.32, rz: 0.56, sq: 0.9 },
          { y: 0.72, cz: -0.02, rx: 0.33, rz: 0.38, sq: 0.95 },
          { y: 1.24, cz: -0.04, rx: 0.37, rz: 0.40, sq: 0.95 },
        ],
        24,
        true,
        true,
      ),
      bootMat,
    );
    bootG.add(upper);
    g.add(bootG);

    // Kaki Celana Baju Terbang Nomex (Loft anatomis halus dari pergelangan ke pangkal paha)
    const legGeo = buildVerticalLoft(
      [
        { y: 1.38, cx: s * 0.84, cz: -0.04, rx: 0.36, rz: 0.38 },
        { y: 2.35, cx: s * 0.84, cz: -0.02, rx: 0.44, rz: 0.47 },
        { y: 3.35, cx: s * 0.81, cz: 0.02, rx: 0.46, rz: 0.48 },
        { y: 4.10, cx: s * 0.77, cz: 0.06, rx: 0.44, rz: 0.46 },
        { y: 5.05, cx: s * 0.71, cz: 0.04, rx: 0.55, rz: 0.57 },
        { y: 5.95, cx: s * 0.64, cz: 0.0, rx: 0.60, rz: 0.62 },
        { y: 6.38, cx: s * 0.56, cz: 0.0, rx: 0.58, rz: 0.60 },
      ],
      30,
      true,
      true,
    );
    g.add(mkMesh(legGeo, nomexMat));

    // ---- KANTUNG UDARA BETIS (CALF G-BLADDER) BERKONTUR ----
    const calfBladderGeo = buildVerticalLoft(
      [
        { y: 1.78, cx: s * 0.84, cz: -0.03, rx: 0.42, rz: 0.45, sq: 0.92 },
        { y: 2.35, cx: s * 0.84, cz: -0.01, rx: 0.51, rz: 0.54, sq: 0.9 },
        { y: 3.15, cx: s * 0.81, cz: 0.02, rx: 0.52, rz: 0.55, sq: 0.9 },
        { y: 3.68, cx: s * 0.79, cz: 0.04, rx: 0.46, rz: 0.49, sq: 0.92 },
      ],
      28,
      true,
      true,
    );
    const calfBladder = mkMesh(calfBladderGeo, bladderMat);
    calfBladder.name = `gsuit-bladder-calf-${s > 0 ? 'r' : 'l'}`;
    bladdersGroup.add(calfBladder);

    // Tali pengencang & ritsleting luar betis
    for (const yBand of [2.05, 2.75, 3.42]) {
      const band = mkMesh(new THREE.TorusGeometry(0.51, 0.032, 8, 28), strapMat);
      band.rotation.x = Math.PI / 2;
      band.position.set(s * 0.82, yBand, 0.01);
      g.add(band);
    }
    const calfZip = mkMesh(new THREE.BoxGeometry(0.06, 1.8, 0.07), metalMat);
    calfZip.position.set(s * 1.33, 2.72, 0.02);
    g.add(calfZip);

    // ---- KANTUNG UDARA PAHA (THIGH G-BLADDER) BERKONTUR ----
    const thighBladderGeo = buildVerticalLoft(
      [
        { y: 4.38, cx: s * 0.75, cz: 0.05, rx: 0.50, rz: 0.53, sq: 0.92 },
        { y: 5.05, cx: s * 0.71, cz: 0.04, rx: 0.62, rz: 0.65, sq: 0.88 },
        { y: 5.75, cx: s * 0.66, cz: 0.01, rx: 0.65, rz: 0.68, sq: 0.88 },
        { y: 6.12, cx: s * 0.63, cz: 0.0, rx: 0.59, rz: 0.62, sq: 0.92 },
      ],
      30,
      true,
      true,
    );
    const thighBladder = mkMesh(thighBladderGeo, bladderMat);
    thighBladder.name = `gsuit-bladder-thigh-${s > 0 ? 'r' : 'l'}`;
    bladdersGroup.add(thighBladder);

    // Saluran selang udara internal penghubung paha -> betis (tampak di sisi luar lutut)
    const kneeTubeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * 1.18, 4.75, 0.22),
      new THREE.Vector3(s * 1.24, 4.12, 0.26),
      new THREE.Vector3(s * 1.24, 3.45, 0.18),
    ]);
    const kneeTube = mkMesh(new THREE.TubeGeometry(kneeTubeCurve, 18, 0.075, 10, false), airTubeMat);
    kneeTube.name = `gsuit-tube-knee-${s > 0 ? 'r' : 'l'}`;
    bladdersGroup.add(kneeTube);

    // Sabuk paha harness kursi lontar (leg straps)
    const legStrap = mkMesh(new THREE.TorusGeometry(0.65, 0.046, 8, 28), strapMat);
    legStrap.rotation.x = Math.PI / 2;
    legStrap.position.set(s * 0.67, 5.62, 0.02);
    g.add(legStrap);
  }

  // Kneeboard (Papan Checklist Penerbang) di paha kanan
  const kneeboard = new THREE.Group();
  kneeboard.position.set(0.84, 4.92, 0.68);
  kneeboard.rotation.set(-0.08, 0.22, -0.05);
  kneeboard.add(mkMesh(new THREE.BoxGeometry(0.56, 0.76, 0.06), darkMetalMat));
  const kbPaper = mkMesh(
    new THREE.PlaneGeometry(0.46, 0.62),
    new THREE.MeshStandardMaterial({
      map: textTexture('CHECKLIST 9G', { color: '#0a1e3c', aspect: 1.2 }),
      color: '#e8eef5',
      roughness: 0.65,
    }),
  );
  kbPaper.position.z = 0.035;
  kneeboard.add(kbPaper);
  const kbClip = mkMesh(new THREE.BoxGeometry(0.26, 0.08, 0.09), metalMat);
  kbClip.position.set(0, 0.32, 0.03);
  kneeboard.add(kbClip);
  g.add(kneeboard);

  // =========================================================================
  // 3. TORSO BAJU TERBANG NOMEX (DISPLAY MANEKIN TANPA KEPALA/LENGAN KAKU)
  // =========================================================================
  const torsoGeo = buildVerticalLoft(
    [
      { y: 6.08, rx: 1.18, rz: 0.68, sq: 0.88 },
      { y: 6.65, rx: 1.08, rz: 0.64, sq: 0.88 },
      { y: 7.25, rx: 1.06, rz: 0.66, sq: 0.88 },
      { y: 7.95, rx: 1.28, rz: 0.74, sq: 0.86 },
      { y: 8.65, rx: 1.56, rz: 0.72, sq: 0.82 },
      { y: 9.05, rx: 1.38, rz: 0.56, sq: 0.86 },
      { y: 9.28, rx: 0.58, rz: 0.48, sq: 0.95 },
    ],
    40,
    true,
    true,
  );
  g.add(mkMesh(torsoGeo, nomexMat));

  // Kerah Mandarin Baju Terbang Nomex + Penutup leher display logam rapi
  const collar = mkMesh(new THREE.CylinderGeometry(0.52, 0.58, 0.32, 28, 1, true), nomexMat);
  collar.position.set(0, 9.38, 0.02);
  g.add(collar);
  const neckCap = mkMesh(new THREE.CylinderGeometry(0.48, 0.48, 0.14, 28), darkMetalMat);
  neckCap.position.set(0, 9.52, 0.02);
  g.add(neckCap);
  const neckGold = mkMesh(new THREE.TorusGeometry(0.49, 0.028, 10, 32), goldMat);
  neckGold.rotation.x = Math.PI / 2;
  neckGold.position.set(0, 9.56, 0.02);
  g.add(neckGold);

  // Pangkal bahu/lengan pendek bergaya mannequin pameran (tailored sleeve caps + patch)
  for (const s of [1, -1] as const) {
    const sleeveGeo = buildVerticalLoft(
      [
        { y: 7.85, cx: s * 1.62, cz: 0.0, rx: 0.36, rz: 0.38 },
        { y: 8.42, cx: s * 1.56, cz: 0.0, rx: 0.44, rz: 0.46 },
        { y: 8.85, cx: s * 1.36, cz: 0.0, rx: 0.46, rz: 0.48 },
      ],
      24,
      true,
      true,
    );
    g.add(mkMesh(sleeveGeo, nomexMat));

    const cap = mkMesh(new THREE.CylinderGeometry(0.35, 0.35, 0.08, 24), darkMetalMat);
    cap.position.set(s * 1.62, 7.84, 0);
    g.add(cap);

    // Patch Bendera Merah Putih (kanan) & Roundel TNI AU (kiri)
    const patch = mkMesh(
      new THREE.PlaneGeometry(0.42, 0.32),
      new THREE.MeshStandardMaterial({ map: s > 0 ? flagTexture() : roundelTexture(), transparent: true, roughness: 0.5 }),
    );
    patch.position.set(s * 2.02, 8.35, 0.02);
    patch.rotation.y = s * (Math.PI / 2);
    g.add(patch);
  }

  // Ritsleting depan baju Nomex
  const frontZip = mkMesh(new THREE.BoxGeometry(0.06, 2.55, 0.05), metalMat);
  frontZip.position.set(0, 7.92, 0.75);
  g.add(frontZip);

  // =========================================================================
  // 4. KANTUNG UDARA PERUT (ABDOMINAL G-BLADDER) & SELANG KATUP ANTI-G
  // =========================================================================
  const abdBladderGeo = buildVerticalLoft(
    [
      { y: 6.32, rx: 1.24, rz: 0.74, sq: 0.86 },
      { y: 6.85, rx: 1.18, rz: 0.76, sq: 0.84 },
      { y: 7.38, rx: 1.16, rz: 0.74, sq: 0.86 },
    ],
    36,
    true,
    true,
  );
  const abdBladder = mkMesh(abdBladderGeo, bladderMat);
  abdBladder.name = 'gsuit-bladder-abdomen';
  bladdersGroup.add(abdBladder);

  // Sabuk pengunci pinggang & gesper logam
  const waistBelt = mkMesh(new THREE.CylinderGeometry(1.22, 1.25, 0.24, 36), strapMat);
  waistBelt.scale.set(1.0, 1.0, 0.64);
  waistBelt.position.set(0, 6.50, 0.02);
  g.add(waistBelt);

  const beltBuckle = mkMesh(new THREE.BoxGeometry(0.48, 0.30, 0.16), metalMat);
  beltBuckle.position.set(0, 6.50, 0.82);
  g.add(beltBuckle);

  // Saluran selang udara dari perut -> kedua paha
  for (const s of [1, -1] as const) {
    const hipTubeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * 0.92, 6.62, 0.45),
      new THREE.Vector3(s * 1.06, 6.22, 0.42),
      new THREE.Vector3(s * 0.98, 5.72, 0.36),
    ]);
    const hipTube = mkMesh(new THREE.TubeGeometry(hipTubeCurve, 16, 0.075, 10, false), airTubeMat);
    hipTube.name = `gsuit-tube-hip-${s > 0 ? 'r' : 'l'}`;
    bladdersGroup.add(hipTube);
  }

  // Selang Pneumatik Utama Katup Anti-G (keluar dari pinggul kiri dengan konektor katup kokpit)
  const gHoseCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.12, 6.82, 0.38),
    new THREE.Vector3(-1.58, 6.45, 0.56),
    new THREE.Vector3(-1.72, 5.78, 0.48),
    new THREE.Vector3(-1.42, 5.25, 0.25),
  ]);
  const gHose = mkMesh(new THREE.TubeGeometry(gHoseCurve, 32, 0.095, 14, false), airTubeMat);
  gHose.name = 'gsuit-tube-main';
  bladdersGroup.add(gHose);

  for (let i = 1; i < 14; i++) {
    const pt = gHoseCurve.getPoint(i / 14);
    const tan = gHoseCurve.getTangent(i / 14);
    const rib = mkMesh(new THREE.TorusGeometry(0.105, 0.018, 8, 16), darkMetalMat);
    rib.position.copy(pt);
    rib.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan);
    g.add(rib);
  }

  const gValveConn = mkMesh(new THREE.CylinderGeometry(0.13, 0.13, 0.34, 18), metalMat);
  gValveConn.position.set(-1.38, 5.18, 0.22);
  gValveConn.rotation.z = 0.52;
  g.add(gValveConn);

  const gValveRing = mkMesh(new THREE.TorusGeometry(0.14, 0.025, 8, 18), goldMat);
  gValveRing.position.set(-1.44, 5.26, 0.24);
  gValveRing.rotation.set(Math.PI / 2, 0, 0.52);
  g.add(gValveRing);

  // =========================================================================
  // 5. ROMPI SURVIVAL & PELAMPUNG LPU-9/P + HARNESS KURSI LONTAR PCU-15/P
  // =========================================================================
  const vestGeo = buildVerticalLoft(
    [
      { y: 7.42, rx: 1.16, rz: 0.72, sq: 0.86 },
      { y: 8.15, rx: 1.36, rz: 0.78, sq: 0.84 },
      { y: 8.85, rx: 1.44, rz: 0.74, sq: 0.84 },
    ],
    34,
    true,
    true,
  );
  g.add(mkMesh(vestGeo, vestMat));

  // Kerah pelampung darurat LPU-9/P melingkar di bahu & dada atas
  const lifeCollar = mkMesh(new THREE.TorusGeometry(0.80, 0.22, 14, 32, Math.PI * 1.45), vestMat);
  lifeCollar.rotation.set(Math.PI / 2.25, 0, Math.PI * 0.78);
  lifeCollar.position.set(0, 8.92, 0.18);
  g.add(lifeCollar);

  // Kantong Radio Darurat PRC-112 + antena & Kantong Pisau Survival
  const radioPouch = mkMesh(new THREE.BoxGeometry(0.44, 0.64, 0.24), strapMat);
  radioPouch.position.set(0.72, 8.02, 0.82);
  radioPouch.rotation.y = 0.22;
  g.add(radioPouch);
  const radioAnt = mkMesh(new THREE.CylinderGeometry(0.02, 0.026, 0.72, 10), darkMetalMat);
  radioAnt.position.set(0.84, 8.65, 0.78);
  g.add(radioAnt);

  const knifePouch = mkMesh(new THREE.BoxGeometry(0.38, 0.60, 0.22), strapMat);
  knifePouch.position.set(-0.72, 8.00, 0.82);
  knifePouch.rotation.y = -0.22;
  g.add(knifePouch);

  // Tuas tarik darurat warna kuning emas untuk mengembangkan pelampung CO2
  for (const s of [1, -1] as const) {
    const toggle = mkMesh(new THREE.SphereGeometry(0.095, 14, 12), goldMat);
    toggle.position.set(s * 0.40, 7.56, 0.86);
    g.add(toggle);
  }

  // Harness Kursi Lontar PCU-15/P (tali bahu + Koch Quick-Release Fittings)
  for (const s of [1, -1] as const) {
    const shStrap = mkMesh(new THREE.BoxGeometry(0.24, 1.56, 0.14), strapMat);
    shStrap.position.set(s * 0.60, 8.22, 0.78);
    shStrap.rotation.z = s * -0.08;
    g.add(shStrap);

    const koch = mkMesh(new THREE.BoxGeometry(0.28, 0.32, 0.18), metalMat);
    koch.position.set(s * 0.62, 8.70, 0.82);
    g.add(koch);

    const kochCap = mkMesh(new THREE.BoxGeometry(0.15, 0.15, 0.20), goldMat);
    kochCap.position.set(s * 0.62, 8.72, 0.84);
    g.add(kochCap);
  }

  // Sabuk dada horizontal & gesper pengunci
  const chestStrap = mkMesh(new THREE.BoxGeometry(1.48, 0.18, 0.12), strapMat);
  chestStrap.position.set(0, 8.16, 0.84);
  g.add(chestStrap);
  const chestBuckle = mkMesh(new THREE.BoxGeometry(0.32, 0.26, 0.18), metalMat);
  chestBuckle.position.set(0, 8.16, 0.88);
  g.add(chestBuckle);

  // Badge "TNI AU" di dada kiri
  const chestBadge = mkMesh(
    new THREE.PlaneGeometry(0.50, 0.20),
    new THREE.MeshStandardMaterial({
      map: textTexture('TNI AU', { color: '#ffb703', aspect: 2.5 }),
      transparent: true,
      roughness: 0.55,
    }),
  );
  chestBadge.position.set(-0.28, 8.54, 0.87);
  g.add(chestBadge);

  return {
    group: g,
    nozzles: [],
    spinners: [],
    navLights: [
      { pos: [2.4, 0.28, 0], color: '#4da6ff' },
      { pos: [-2.4, 0.28, 0], color: '#4da6ff' },
      { pos: [0, 0.28, 2.4], color: '#ffb703', blink: 'beacon' },
    ],
    glowMats,
    hoverHeight: 0,
  };
}
