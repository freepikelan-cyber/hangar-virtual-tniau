import * as THREE from 'three';
import { buildLoftGeometry, lerp, mkMesh } from './aeroGeo';
import { flagTexture, roundelTexture, solidNoiseTexture, textTexture } from './textures';
import type { BuildResult } from './proceduralBuilder';

/**
 * Membangun model 3D Pilot Tempur TNI AU lengkap mengenakan:
 * - Helm Tempur HGU-55/P + HMDS (Helmet-Mounted Display System) & Dual Visor
 * - Masker Oksigen MBU-20/P + Selang Oksigen OBOGS berulir
 * - Baju Terbang Nomex Anti-Api (Sage Green) dengan patch Merah Putih & TNI AU
 * - Rompi Survival & Pelampung LPU-9/P + Harness Kursi Lontar PCU-15/P (Koch Fittings)
 * - Anti-G Suit CSU-13B/P (Kantung Udara Perut, Paha, & Betis) + Selang Pneumatik Anti-G
 * - Kneeboard paha kanan, Sarung Tangan Nomex, & Sepatu Bot Penerbang
 *
 * Tinggi total ~10.6 unit, berdiri tegak di atas platform taktis y = 0, menghadap +Z.
 */
export function buildDetailedGSuit(): BuildResult {
  const g = new THREE.Group();
  const glowMats: THREE.MeshStandardMaterial[] = [];

  // ---------------------- Material ----------------------
  const nomexTex = solidNoiseTexture('#4f604b', 701, 0.055);
  const gsuitTex = solidNoiseTexture('#3b4a39', 702, 0.065);
  const vestTex = solidNoiseTexture('#2f3b31', 703, 0.06);

  const nomexMat = new THREE.MeshStandardMaterial({
    map: nomexTex,
    roughness: 0.78,
    metalness: 0.06,
  });
  const gsuitBladderMat = new THREE.MeshStandardMaterial({
    map: gsuitTex,
    roughness: 0.62,
    metalness: 0.14,
    emissive: new THREE.Color('#000000'),
    emissiveIntensity: 0,
  });
  const vestMat = new THREE.MeshStandardMaterial({
    map: vestTex,
    roughness: 0.72,
    metalness: 0.1,
  });
  const strapMat = new THREE.MeshStandardMaterial({
    color: '#232b27',
    roughness: 0.8,
    metalness: 0.08,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: '#aeb9c7',
    roughness: 0.28,
    metalness: 0.88,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: '#2b333d',
    roughness: 0.36,
    metalness: 0.75,
  });
  const leatherMat = new THREE.MeshStandardMaterial({
    color: '#1b2028',
    roughness: 0.45,
    metalness: 0.12,
  });
  const gloveMat = new THREE.MeshStandardMaterial({
    color: '#3c483a',
    roughness: 0.75,
    metalness: 0.05,
  });
  const helmetShellMat = new THREE.MeshStandardMaterial({
    color: '#46525f',
    roughness: 0.28,
    metalness: 0.42,
  });
  const visorMat = new THREE.MeshPhysicalMaterial({
    color: '#0c1828',
    roughness: 0.08,
    metalness: 0.35,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    emissive: new THREE.Color('#00e5ff'),
    emissiveIntensity: 0.05,
  });
  const maskMat = new THREE.MeshStandardMaterial({
    color: '#252c35',
    roughness: 0.68,
    metalness: 0.15,
  });
  const hoseMat = new THREE.MeshStandardMaterial({
    color: '#1f262e',
    roughness: 0.55,
    metalness: 0.2,
  });
  const accentGoldMat = new THREE.MeshStandardMaterial({
    color: '#ffb703',
    roughness: 0.32,
    metalness: 0.65,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: '#2a3038', // Balaclava / pelindung wajah tahan api
    roughness: 0.85,
    metalness: 0.02,
  });
  const platformMat = new THREE.MeshStandardMaterial({
    color: '#132a4f',
    roughness: 0.38,
    metalness: 0.62,
  });
  const platformGlow = new THREE.MeshStandardMaterial({
    color: '#4da6ff',
    emissive: new THREE.Color('#4da6ff'),
    emissiveIntensity: 0.7,
    roughness: 0.2,
  });
  glowMats.push(platformGlow);

  // Helper silinder / kapsul antar dua titik
  const addLimb = (
    p1: [number, number, number],
    p2: [number, number, number],
    r1: number,
    r2: number,
    mat: THREE.Material,
    parent: THREE.Object3D = g,
    segs = 20,
  ) => {
    const a = new THREE.Vector3(...p1);
    const b = new THREE.Vector3(...p2);
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const geo = new THREE.CylinderGeometry(r2, r1, len, segs);
    const mesh = mkMesh(geo, mat);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    parent.add(mesh);
    return mesh;
  };

  // =========================================================================
  // 1. PLATFORM TAKTIS BERDIRI (y = 0 .. 0.32)
  // =========================================================================
  const basePlate = mkMesh(new THREE.CylinderGeometry(2.5, 2.75, 0.24, 48), platformMat);
  basePlate.position.y = 0.12;
  g.add(basePlate);

  const innerPlate = mkMesh(new THREE.CylinderGeometry(2.15, 2.25, 0.08, 48), darkMetalMat);
  innerPlate.position.y = 0.28;
  g.add(innerPlate);

  const ringGlow = mkMesh(new THREE.TorusGeometry(2.36, 0.045, 12, 64), platformGlow);
  ringGlow.rotation.x = Math.PI / 2;
  ringGlow.position.y = 0.25;
  g.add(ringGlow);

  const goldRing = mkMesh(new THREE.TorusGeometry(1.92, 0.022, 10, 64), accentGoldMat);
  goldRing.rotation.x = Math.PI / 2;
  goldRing.position.y = 0.325;
  g.add(goldRing);

  // Grup khusus untuk kantung udara G-Suit (bisa mengembang saat Simulasi 9G)
  const bladdersGroup = new THREE.Group();
  bladdersGroup.name = 'gsuit-bladders';
  g.add(bladdersGroup);

  // =========================================================================
  // 2. SEPATU BOT PENERBANG (FLIGHT BOOTS) y = 0.32 .. 1.65
  // =========================================================================
  for (const s of [1, -1] as const) {
    const bx = s * 0.82;
    const bootG = new THREE.Group();
    bootG.position.set(bx, 0.32, 0);
    bootG.rotation.y = s * 0.14;

    // Sol karet anti-slip
    const sole = mkMesh(new THREE.BoxGeometry(0.68, 0.16, 1.48), darkMetalMat);
    sole.position.set(0, 0.08, 0.24);
    bootG.add(sole);

    // Bagian punggung & ujung sepatu (toe box)
    const vamp = mkMesh(new THREE.CylinderGeometry(0.32, 0.34, 0.85, 18), leatherMat);
    vamp.rotation.x = Math.PI / 2;
    vamp.scale.set(1.0, 1.0, 0.68);
    vamp.position.set(0, 0.34, 0.34);
    bootG.add(vamp);

    const toe = mkMesh(new THREE.SphereGeometry(0.32, 18, 14), leatherMat);
    toe.scale.set(1.0, 0.7, 1.12);
    toe.position.set(0, 0.33, 0.72);
    bootG.add(toe);

    // Pergelangan & betis bawah sepatu bot
    const shaft = mkMesh(new THREE.CylinderGeometry(0.35, 0.33, 1.05, 18), leatherMat);
    shaft.position.set(0, 0.76, -0.05);
    bootG.add(shaft);

    // Strip tali sepatu depan
    for (let i = 0; i < 4; i++) {
      const lace = mkMesh(new THREE.BoxGeometry(0.24, 0.04, 0.08), darkMetalMat);
      lace.position.set(0, 0.56 + i * 0.16, 0.28);
      bootG.add(lace);
    }
    g.add(bootG);
  }

  // =========================================================================
  // 3. KAKI BAWAH (BETIS) + KANTUNG UDARA BETIS (CALF G-BLADDERS) y = 1.45 .. 4.15
  // =========================================================================
  for (const s of [1, -1] as const) {
    const xBot = s * 0.82;
    const xKnee = s * 0.76;

    // Celana Nomex betis
    addLimb([xBot, 1.35, -0.04], [xKnee, 4.1, 0.06], 0.35, 0.44, nomexMat);

    // Sendi lutut
    const knee = mkMesh(new THREE.SphereGeometry(0.45, 18, 14), nomexMat);
    knee.position.set(xKnee, 4.12, 0.08);
    g.add(knee);

    // Kantung Udara Betis (Calf G-Bladder) membungkus betis
    const calfBladder = mkMesh(new THREE.CylinderGeometry(0.47, 0.39, 1.85, 22), gsuitBladderMat);
    calfBladder.position.set(lerp(xBot, xKnee, 0.52), 2.78, 0.02);
    calfBladder.scale.set(1.02, 1, 1.08);
    calfBladder.name = `gsuit-bladder-calf-${s > 0 ? 'r' : 'l'}`;
    bladdersGroup.add(calfBladder);

    // Sabuk pengikat betis & ritsleting samping
    for (const dy of [-0.55, 0, 0.55]) {
      const band = mkMesh(new THREE.TorusGeometry(0.45 + dy * 0.03, 0.032, 8, 24), strapMat);
      band.rotation.x = Math.PI / 2;
      band.position.set(lerp(xBot, xKnee, 0.52), 2.78 + dy, 0.02);
      g.add(band);
    }
    const zip = mkMesh(new THREE.BoxGeometry(0.05, 1.75, 0.06), metalMat);
    zip.position.set(lerp(xBot, xKnee, 0.52) + s * 0.46, 2.78, 0.04);
    g.add(zip);
  }

  // =========================================================================
  // 4. PAHA + KANTUNG UDARA PAHA (THIGH G-BLADDERS) + KNEEBOARD y = 4.15 .. 6.35
  // =========================================================================
  for (const s of [1, -1] as const) {
    const xKnee = s * 0.76;
    const xHip = s * 0.62;

    // Celana Nomex paha
    addLimb([xKnee, 4.12, 0.06], [xHip, 6.35, 0.0], 0.45, 0.57, nomexMat);

    // Kantung Udara Paha (Thigh G-Bladder)
    const thighBladder = mkMesh(new THREE.CylinderGeometry(0.61, 0.50, 1.65, 24), gsuitBladderMat);
    thighBladder.position.set(lerp(xKnee, xHip, 0.52), 5.28, 0.03);
    thighBladder.rotation.z = s * -0.06;
    thighBladder.scale.set(1.03, 1, 1.08);
    thighBladder.name = `gsuit-bladder-thigh-${s > 0 ? 'r' : 'l'}`;
    bladdersGroup.add(thighBladder);

    // Sabuk paha harness kursi lontar (leg straps)
    const legStrap = mkMesh(new THREE.TorusGeometry(0.59, 0.045, 8, 24), strapMat);
    legStrap.rotation.x = Math.PI / 2;
    legStrap.position.set(lerp(xKnee, xHip, 0.62), 5.55, 0.03);
    g.add(legStrap);

    // Kantong peta / dokumen paha
    const pocket = mkMesh(new THREE.BoxGeometry(0.56, 0.68, 0.16), gsuitBladderMat);
    pocket.position.set(lerp(xKnee, xHip, 0.45) + s * 0.14, 5.1, 0.58);
    pocket.rotation.y = s * 0.25;
    g.add(pocket);
  }

  // Kneeboard (Papan Checklist Penerbang) di paha kanan
  const kneeboard = new THREE.Group();
  kneeboard.position.set(0.74, 4.78, 0.58);
  kneeboard.rotation.set(-0.08, 0.18, -0.05);
  const kbPlate = mkMesh(new THREE.BoxGeometry(0.52, 0.72, 0.06), darkMetalMat);
  kneeboard.add(kbPlate);
  const kbPaper = mkMesh(
    new THREE.PlaneGeometry(0.42, 0.58),
    new THREE.MeshStandardMaterial({
      map: textTexture('CHECKLIST 9G', { color: '#0a1e3c', aspect: 1.2 }),
      color: '#e8eef5',
      roughness: 0.7,
    }),
  );
  kbPaper.position.z = 0.035;
  kneeboard.add(kbPaper);
  const kbClip = mkMesh(new THREE.BoxGeometry(0.24, 0.07, 0.08), metalMat);
  kbClip.position.set(0, 0.31, 0.03);
  kneeboard.add(kbClip);
  g.add(kneeboard);

  // =========================================================================
  // 5. PINGGUL, PERUT, & TORSO (NOMEX + ABDOMINAL G-BLADDER + ROMPI SURVIVAL)
  // =========================================================================
  // Torso anatomis (loft dari pinggul y=6.1 ke bahu y=9.05)
  const torsoStations = [
    { y: 6.1, rx: 1.15, rz: 0.66 },
    { y: 6.65, rx: 1.06, rz: 0.63 },
    { y: 7.2, rx: 1.04, rz: 0.64 },
    { y: 7.85, rx: 1.24, rz: 0.72 },
    { y: 8.55, rx: 1.44, rz: 0.70 },
    { y: 8.95, rx: 1.32, rz: 0.58 },
    { y: 9.15, rx: 0.56, rz: 0.45 },
  ];
  const torsoGeo = buildLoftGeometry(
    torsoStations.map((st) => ({
      z: st.y, // kita tukar sumbu Y <-> Z setelah build
      point: (th) => [Math.sin(th) * st.rx, Math.cos(th) * st.rz],
    })),
    36,
    true,
    true,
  );
  // Putar agar sumbu loft menjadi Y (ke atas)
  torsoGeo.rotateX(-Math.PI / 2);
  const torsoMesh = mkMesh(torsoGeo, nomexMat);
  g.add(torsoMesh);

  // Kantung Udara Perut (Abdominal G-Bladder / Cummerbund) y = 6.35 .. 7.42
  const abdBladder = mkMesh(new THREE.CylinderGeometry(1.13, 1.18, 1.06, 32), gsuitBladderMat);
  abdBladder.scale.set(1.0, 1.0, 0.66);
  abdBladder.position.set(0, 6.88, 0.02);
  abdBladder.name = 'gsuit-bladder-abdomen';
  bladdersGroup.add(abdBladder);

  // Sabuk pengunci perut & gesper logam depan
  const waistBelt = mkMesh(new THREE.CylinderGeometry(1.16, 1.19, 0.22, 32), strapMat);
  waistBelt.scale.set(1.0, 1.0, 0.68);
  waistBelt.position.set(0, 6.52, 0.02);
  g.add(waistBelt);

  const beltBuckle = mkMesh(new THREE.BoxGeometry(0.46, 0.28, 0.14), metalMat);
  beltBuckle.position.set(0, 6.52, 0.80);
  g.add(beltBuckle);

  // Selang Pneumatik Katup Anti-G (keluar dari pinggul kiri)
  const gHoseCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.98, 6.72, 0.34),
    new THREE.Vector3(-1.32, 6.35, 0.52),
    new THREE.Vector3(-1.42, 5.75, 0.44),
    new THREE.Vector3(-1.18, 5.38, 0.22),
  ]);
  const gHose = mkMesh(new THREE.TubeGeometry(gHoseCurve, 28, 0.085, 12, false), hoseMat);
  g.add(gHose);
  const gValveConn = mkMesh(new THREE.CylinderGeometry(0.11, 0.11, 0.28, 16), metalMat);
  gValveConn.position.set(-1.18, 5.35, 0.22);
  gValveConn.rotation.z = 0.5;
  g.add(gValveConn);

  // Rompi Survival & Pelampung LPU-9/P (dada & kerah pelampung)
  const vestBody = mkMesh(new THREE.CylinderGeometry(1.36, 1.14, 1.48, 30), vestMat);
  vestBody.scale.set(1.0, 1.0, 0.62);
  vestBody.position.set(0, 8.12, 0.03);
  g.add(vestBody);

  // Kerah pelampung darurat LPU-9/P melingkar di bahu & dada atas
  const lifeCollar = mkMesh(new THREE.TorusGeometry(0.76, 0.20, 12, 28, Math.PI * 1.4), vestMat);
  lifeCollar.rotation.set(Math.PI / 2.25, 0, Math.PI * 0.8);
  lifeCollar.position.set(0, 8.78, 0.15);
  g.add(lifeCollar);

  // Kantong Radio Darurat PRC-112 & Survival Kit di dada
  const radioPouch = mkMesh(new THREE.BoxGeometry(0.42, 0.62, 0.24), strapMat);
  radioPouch.position.set(0.68, 7.98, 0.76);
  radioPouch.rotation.y = 0.22;
  g.add(radioPouch);
  const radioAnt = mkMesh(new THREE.CylinderGeometry(0.018, 0.025, 0.65, 8), darkMetalMat);
  radioAnt.position.set(0.78, 8.55, 0.72);
  g.add(radioAnt);

  const knifePouch = mkMesh(new THREE.BoxGeometry(0.36, 0.58, 0.22), strapMat);
  knifePouch.position.set(-0.68, 7.95, 0.76);
  knifePouch.rotation.y = -0.22;
  g.add(knifePouch);

  // Tuas tarik darurat warna kuning emas di rompi pelampung
  for (const s of [1, -1] as const) {
    const toggle = mkMesh(new THREE.SphereGeometry(0.085, 12, 10), accentGoldMat);
    toggle.position.set(s * 0.38, 7.52, 0.80);
    g.add(toggle);
  }

  // Harness Kursi Lontar PCU-15/P (tali bahu + Koch quick-release fittings)
  for (const s of [1, -1] as const) {
    const shStrap = mkMesh(new THREE.BoxGeometry(0.22, 1.55, 0.14), strapMat);
    shStrap.position.set(s * 0.58, 8.15, 0.72);
    shStrap.rotation.z = s * -0.08;
    g.add(shStrap);

    // Koch Quick-Release Fitting (pengait parasut kursi lontar)
    const koch = mkMesh(new THREE.BoxGeometry(0.26, 0.30, 0.16), metalMat);
    koch.position.set(s * 0.60, 8.62, 0.76);
    g.add(koch);

    const kochCap = mkMesh(new THREE.BoxGeometry(0.14, 0.14, 0.18), accentGoldMat);
    kochCap.position.set(s * 0.60, 8.64, 0.78);
    g.add(kochCap);
  }

  // Sabuk dada horizontal
  const chestStrap = mkMesh(new THREE.BoxGeometry(1.42, 0.18, 0.12), strapMat);
  chestStrap.position.set(0, 8.12, 0.79);
  g.add(chestStrap);
  const chestBuckle = mkMesh(new THREE.BoxGeometry(0.30, 0.24, 0.16), metalMat);
  chestBuckle.position.set(0, 8.12, 0.82);
  g.add(chestBuckle);

  // Patch Wing Penerbang & TNI AU di dada kiri
  const chestBadge = mkMesh(
    new THREE.PlaneGeometry(0.46, 0.18),
    new THREE.MeshStandardMaterial({
      map: textTexture('TNI AU', { color: '#ffb703', aspect: 2.5 }),
      transparent: true,
      roughness: 0.6,
    }),
  );
  chestBadge.position.set(-0.28, 8.46, 0.81);
  g.add(chestBadge);

  // =========================================================================
  // 6. LENGAN & SARUNG TANGAN NOMEX (HEROIC READY STANCE)
  // =========================================================================
  for (const s of [1, -1] as const) {
    // Bahu
    const shoulder = mkMesh(new THREE.SphereGeometry(0.46, 18, 14), nomexMat);
    shoulder.position.set(s * 1.48, 8.66, 0.02);
    g.add(shoulder);

    // Patch Bendera Merah Putih (bahu kanan) & Roundel TNI AU (bahu kiri)
    const patchTex = s > 0 ? flagTexture() : roundelTexture();
    const patch = mkMesh(
      new THREE.PlaneGeometry(0.36, 0.28),
      new THREE.MeshStandardMaterial({ map: patchTex, transparent: true, roughness: 0.55 }),
    );
    patch.position.set(s * 1.88, 8.32, 0.04);
    patch.rotation.y = s * (Math.PI / 2);
    g.add(patch);

    // Lengan atas
    addLimb([s * 1.54, 8.58, 0.02], [s * 1.78, 7.12, -0.08], 0.39, 0.32, nomexMat);

    // Siku
    const elbow = mkMesh(new THREE.SphereGeometry(0.32, 16, 12), nomexMat);
    elbow.position.set(s * 1.78, 7.10, -0.08);
    g.add(elbow);

    // Lengan bawah (agak menekuk ke depan)
    addLimb([s * 1.78, 7.08, -0.08], [s * 1.66, 5.76, 0.30], 0.31, 0.24, nomexMat);

    // Sarung tangan Nomex & kulit (Flight Gloves)
    const cuff = mkMesh(new THREE.CylinderGeometry(0.25, 0.23, 0.30, 16), gloveMat);
    cuff.position.set(s * 1.66, 5.76, 0.30);
    g.add(cuff);

    const palm = mkMesh(new THREE.BoxGeometry(0.26, 0.38, 0.36), gloveMat);
    palm.position.set(s * 1.64, 5.44, 0.36);
    palm.rotation.x = 0.22;
    g.add(palm);

    const thumb = mkMesh(new THREE.CylinderGeometry(0.06, 0.055, 0.24, 10), gloveMat);
    thumb.position.set(s * 1.50, 5.42, 0.48);
    thumb.rotation.set(0.5, 0, s * 0.45);
    g.add(thumb);
  }

  // Kantong pena lengan kiri atas (khas flight suit)
  const penPocket = mkMesh(new THREE.BoxGeometry(0.14, 0.46, 0.26), gsuitBladderMat);
  penPocket.position.set(-1.90, 7.68, 0.04);
  g.add(penPocket);

  // =========================================================================
  // 7. LEHER, KEPALA, HELM TEMPUR HGU-55/P + HMDS, VISOR, & MASKER OKSIGEN
  // =========================================================================
  const neck = mkMesh(new THREE.CylinderGeometry(0.32, 0.38, 0.62, 18), skinMat);
  neck.position.set(0, 9.25, 0.05);
  g.add(neck);

  // Kepala dalam balaclava
  const head = mkMesh(new THREE.SphereGeometry(0.56, 22, 18), skinMat);
  head.scale.set(0.92, 1.12, 1.0);
  head.position.set(0, 9.88, 0.08);
  g.add(head);

  // Cangkang Helm Tempur HGU-55/P + HMDS
  const helmetShell = mkMesh(new THREE.SphereGeometry(0.72, 32, 24), helmetShellMat);
  helmetShell.scale.set(0.98, 1.05, 1.08);
  helmetShell.position.set(0, 10.02, 0.04);
  g.add(helmetShell);

  // Tonjolan earcup komunikasi kiri & kanan
  for (const s of [1, -1] as const) {
    const ear = mkMesh(new THREE.CylinderGeometry(0.24, 0.26, 0.16, 18), darkMetalMat);
    ear.rotation.z = Math.PI / 2;
    ear.position.set(s * 0.70, 9.88, 0.02);
    g.add(ear);

    // Bayonet receiver (pengunci masker oksigen di pipi helm)
    const bayo = mkMesh(new THREE.BoxGeometry(0.10, 0.20, 0.22), metalMat);
    bayo.position.set(s * 0.56, 9.60, 0.48);
    bayo.rotation.y = s * -0.4;
    g.add(bayo);
  }

  // Rumah Visor (Visor Housing) & Dudukan NVG / HMDS di dahi helm
  const visorHousing = mkMesh(
    new THREE.SphereGeometry(0.75, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.44),
    darkMetalMat,
  );
  visorHousing.scale.set(0.98, 0.96, 1.06);
  visorHousing.position.set(0, 10.08, 0.07);
  visorHousing.rotation.x = 0.26;
  g.add(visorHousing);

  // Bracket HMDS / NVG di dahi
  const nvgMount = mkMesh(new THREE.BoxGeometry(0.26, 0.22, 0.22), metalMat);
  nvgMount.position.set(0, 10.42, 0.68);
  nvgMount.rotation.x = -0.25;
  g.add(nvgMount);

  const hmdsSensor = mkMesh(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 14), platformGlow);
  hmdsSensor.rotation.x = Math.PI / 2;
  hmdsSensor.position.set(0, 10.42, 0.79);
  g.add(hmdsSensor);

  // Visor Ganda Gelap (Dual Visor + HUD Projection)
  const visor = mkMesh(
    new THREE.SphereGeometry(0.68, 28, 18, -Math.PI * 0.36, Math.PI * 0.72, Math.PI * 0.34, Math.PI * 0.24),
    visorMat,
  );
  visor.position.set(0, 10.02, 0.14);
  visor.rotation.y = Math.PI / 2;
  visor.name = 'gsuit-visor';
  g.add(visor);

  // Masker Oksigen MBU-20/P (menutup hidung & mulut)
  const maskCone = mkMesh(new THREE.CylinderGeometry(0.18, 0.34, 0.50, 18), maskMat);
  maskCone.rotation.x = Math.PI / 2.25;
  maskCone.scale.set(1.12, 1.0, 0.92);
  maskCone.position.set(0, 9.54, 0.68);
  g.add(maskCone);

  // Katup ekshalasi & mikrofon interkom di ujung masker
  const maskValve = mkMesh(new THREE.CylinderGeometry(0.15, 0.16, 0.16, 16), darkMetalMat);
  maskValve.rotation.x = Math.PI / 2.2;
  maskValve.position.set(0, 9.46, 0.90);
  g.add(maskValve);

  // Tali pengait masker ke bayonet helm kiri & kanan
  for (const s of [1, -1] as const) {
    addLimb([s * 0.24, 9.54, 0.78], [s * 0.56, 9.60, 0.48], 0.045, 0.045, strapMat);
  }

  // Selang Oksigen Berulir (Corrugated OBOGS Hose) dari masker ke dada
  const o2Curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 9.42, 0.90),
    new THREE.Vector3(0.08, 9.05, 0.96),
    new THREE.Vector3(0.32, 8.66, 0.92),
    new THREE.Vector3(0.36, 8.22, 0.86),
    new THREE.Vector3(0.24, 7.82, 0.80),
  ]);
  const o2Hose = mkMesh(new THREE.TubeGeometry(o2Curve, 32, 0.082, 12, false), hoseMat);
  g.add(o2Hose);

  // Cincin-cincin ulir selang oksigen agar tampak realistis
  for (let i = 1; i < 12; i++) {
    const pt = o2Curve.getPoint(i / 12);
    const tan = o2Curve.getTangent(i / 12);
    const ring = mkMesh(new THREE.TorusGeometry(0.086, 0.016, 8, 16), darkMetalMat);
    ring.position.copy(pt);
    ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan);
    g.add(ring);
  }

  // Konektor & Regulator OBOGS di dada
  const obogsReg = mkMesh(new THREE.CylinderGeometry(0.13, 0.14, 0.24, 16), metalMat);
  obogsReg.position.set(0.24, 7.75, 0.80);
  g.add(obogsReg);

  // Lampu navigasi halus pada tepi platform
  return {
    group: g,
    nozzles: [],
    spinners: [],
    navLights: [
      { pos: [2.36, 0.28, 0], color: '#4da6ff' },
      { pos: [-2.36, 0.28, 0], color: '#4da6ff' },
      { pos: [0, 0.28, 2.36], color: '#ffb703', blink: 'beacon' },
    ],
    glowMats,
    hoverHeight: 0,
  };
}
