import * as THREE from 'three';
import { buildLoftGeometry, lerp, mkMesh, smoothstep } from './aeroGeo';
import { flagTexture, roundelTexture, solidNoiseTexture, textTexture } from './textures';
import type { BuildResult } from './proceduralBuilder';

/**
 * Model 3D standalone Museum-Grade:
 * HELM PILOT TEMPUR TNI AU (HGU-55/P + JHMCS/HMDS + Masker Oksigen MBU-20/P)
 * Dipajang di atas dudukan display taktis (y = 0 .. 7.2) dengan detail organik halus,
 * visor ganda yang dapat turun-naik saat Simulasi HMDS, earcup komunikasi,
 * pengunci bayonet logam, dan selang oksigen OBOGS berulir 24 ruas.
 */
export function buildDetailedPilotHelmet(): BuildResult {
  const g = new THREE.Group();
  const glowMats: THREE.MeshStandardMaterial[] = [];

  // ---------------------- Material PBR ----------------------
  const shellTex = solidNoiseTexture('#44505e', 801, 0.035);
  const shellMat = new THREE.MeshPhysicalMaterial({
    map: shellTex,
    color: '#526070',
    roughness: 0.24,
    metalness: 0.35,
    clearcoat: 0.65,
    clearcoatRoughness: 0.18,
  });
  const housingMat = new THREE.MeshStandardMaterial({
    color: '#202730',
    roughness: 0.42,
    metalness: 0.38,
  });
  const rubberTrimMat = new THREE.MeshStandardMaterial({
    color: '#161b22',
    roughness: 0.82,
    metalness: 0.05,
  });
  const linerMat = new THREE.MeshStandardMaterial({
    color: '#1e242c',
    roughness: 0.92,
    metalness: 0.02,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: '#b8c4d2',
    roughness: 0.25,
    metalness: 0.9,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: '#2c3540',
    roughness: 0.35,
    metalness: 0.78,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: '#ffb703',
    roughness: 0.3,
    metalness: 0.7,
  });
  const maskRubberMat = new THREE.MeshStandardMaterial({
    color: '#262f38',
    roughness: 0.72,
    metalness: 0.12,
  });
  const hoseMat = new THREE.MeshStandardMaterial({
    color: '#1d242c',
    roughness: 0.58,
    metalness: 0.18,
  });
  const darkVisorMat = new THREE.MeshPhysicalMaterial({
    color: '#081322',
    roughness: 0.06,
    metalness: 0.3,
    transmission: 0.18,
    transparent: true,
    opacity: 0.94,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    emissive: new THREE.Color('#00ffaa'),
    emissiveIntensity: 0.04,
  });
  const clearVisorMat = new THREE.MeshPhysicalMaterial({
    color: '#a8dcff',
    roughness: 0.05,
    metalness: 0.1,
    transparent: true,
    opacity: 0.28,
    clearcoat: 1.0,
    depthWrite: false,
  });
  const hudGlowMat = new THREE.MeshStandardMaterial({
    color: '#00ffaa',
    emissive: new THREE.Color('#00ffaa'),
    emissiveIntensity: 0.35,
    roughness: 0.2,
  });
  const standBaseMat = new THREE.MeshStandardMaterial({
    color: '#12284c',
    roughness: 0.35,
    metalness: 0.68,
  });
  const standGlowMat = new THREE.MeshStandardMaterial({
    color: '#4da6ff',
    emissive: new THREE.Color('#4da6ff'),
    emissiveIntensity: 0.75,
    roughness: 0.2,
  });
  glowMats.push(standGlowMat, hudGlowMat);

  // =========================================================================
  // 1. DUDUKAN DISPLAY MUSEUM TAKTIS (y = 0 .. 2.35)
  // =========================================================================
  const base1 = mkMesh(new THREE.CylinderGeometry(2.35, 2.6, 0.24, 56), standBaseMat);
  base1.position.y = 0.12;
  g.add(base1);

  const base2 = mkMesh(new THREE.CylinderGeometry(1.9, 2.05, 0.12, 48), darkMetalMat);
  base2.position.y = 0.3;
  g.add(base2);

  const glowRing = mkMesh(new THREE.TorusGeometry(2.22, 0.045, 12, 64), standGlowMat);
  glowRing.rotation.x = Math.PI / 2;
  glowRing.position.y = 0.25;
  g.add(glowRing);

  const goldRing = mkMesh(new THREE.TorusGeometry(1.72, 0.024, 10, 64), goldMat);
  goldRing.rotation.x = Math.PI / 2;
  goldRing.position.y = 0.365;
  g.add(goldRing);

  // Tiang penyangga krom miring ergonomis
  const neckPost = mkMesh(new THREE.CylinderGeometry(0.18, 0.28, 2.05, 24), metalMat);
  neckPost.position.set(0, 1.35, -0.18);
  neckPost.rotation.x = 0.08;
  g.add(neckPost);

  const cradle = mkMesh(new THREE.SphereGeometry(1.05, 24, 16, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), linerMat);
  cradle.scale.set(0.95, 0.72, 1.05);
  cradle.position.set(0, 2.75, -0.1);
  g.add(cradle);

  // Grup utama helm di pusat y = 4.35
  const helmetCenterY = 4.35;
  const hGroup = new THREE.Group();
  hGroup.position.set(0, helmetCenterY, 0);
  g.add(hGroup);

  // =========================================================================
  // 2. CANGKANG KOMPOSIT HELM HGU-55/P (LOFT ORGANIK HALUS + CUTOUT WAJAH)
  // =========================================================================
  // Bangun cangkang utama dari belakang ke atas-samping dengan proporsi helm jet asli
  const shellGeo = new THREE.SphereGeometry(2.12, 48, 36, 0, Math.PI * 2, 0, Math.PI * 0.72);
  // Bentuk organik sedikit lonjong depan-belakang & agak menyempit di pelipis
  const posAttr = shellGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    let x = posAttr.getX(i);
    let y = posAttr.getY(i);
    let z = posAttr.getZ(i);
    // Sedikit memanjang ke belakang (nape) dan menyempit di depan
    z *= z < 0 ? 1.14 : 1.04;
    x *= 0.94 + 0.06 * smoothstep(1.2, -0.8, y);
    // Cutout wajah di bagian depan (+Z, y < 0.85) agar wajah & visor terbuka rapi
    if (z > 0.75 && y < 0.85) {
      const faceFactor = smoothstep(0.75, 1.55, z) * smoothstep(0.85, -0.15, y);
      z -= faceFactor * 0.52;
      y += faceFactor * 0.28;
    }
    // Ekstensi pelindung tengkuk belakang bawah
    if (z < -0.5 && y < -0.2) {
      y -= smoothstep(-0.5, -1.6, z) * 0.25;
    }
    posAttr.setXYZ(i, x, y, z);
  }
  shellGeo.computeVertexNormals();
  const shellMesh = mkMesh(shellGeo, shellMat);
  hGroup.add(shellMesh);

  // Lapisan busa pelindung dalam (Impact Liner EPS)
  const innerLiner = mkMesh(new THREE.SphereGeometry(1.94, 36, 24, 0, Math.PI * 2, 0, Math.PI * 0.66), linerMat);
  innerLiner.scale.set(0.92, 0.96, 1.02);
  innerLiner.material = linerMat.clone();
  (innerLiner.material as THREE.MeshStandardMaterial).side = THREE.BackSide;
  hGroup.add(innerLiner);

  // Karet list tepi (edge beading) di sepanjang bukaan wajah & leher
  const faceBead = mkMesh(new THREE.TorusGeometry(1.74, 0.07, 12, 48, Math.PI * 1.15), rubberTrimMat);
  faceBead.rotation.set(0.28, 0, -Math.PI * 0.075);
  faceBead.position.set(0, -0.15, 0.92);
  hGroup.add(faceBead);

  // Patch Bendera Merah Putih (sisi kanan) & Roundel TNI AU (sisi kiri)
  const flagPatch = mkMesh(
    new THREE.PlaneGeometry(0.68, 0.44),
    new THREE.MeshStandardMaterial({ map: flagTexture(), transparent: true, roughness: 0.35 }),
  );
  flagPatch.position.set(1.98, 0.48, -0.35);
  flagPatch.rotation.y = Math.PI / 2 + 0.14;
  flagPatch.rotation.z = -0.05;
  hGroup.add(flagPatch);

  const roundelPatch = mkMesh(
    new THREE.PlaneGeometry(0.62, 0.62),
    new THREE.MeshStandardMaterial({ map: roundelTexture(), transparent: true, roughness: 0.35 }),
  );
  roundelPatch.position.set(-1.98, 0.48, -0.35);
  roundelPatch.rotation.y = -Math.PI / 2 - 0.14;
  hGroup.add(roundelPatch);

  // Strip nama "TNI AU • FIGHTER" di belakang helm
  const rearStrip = mkMesh(
    new THREE.PlaneGeometry(1.45, 0.32),
    new THREE.MeshStandardMaterial({
      map: textTexture('TNI AU', { color: '#ffb703', aspect: 4.5 }),
      transparent: true,
      roughness: 0.35,
    }),
  );
  rearStrip.position.set(0, 0.35, -2.36);
  rearStrip.rotation.y = Math.PI;
  hGroup.add(rearStrip);

  // =========================================================================
  // 3. RUMAH VISOR (VISOR HOUSING) & PROYEKTOR JHMCS / HMDS + NVG MOUNT
  // =========================================================================
  const housingGeo = new THREE.SphereGeometry(2.22, 40, 24, -Math.PI * 0.42, Math.PI * 0.84, Math.PI * 0.08, Math.PI * 0.32);
  const housing = mkMesh(housingGeo, housingMat);
  housing.rotation.y = Math.PI / 2;
  housing.rotation.x = 0.08;
  housing.position.set(0, 0.16, 0.15);
  hGroup.add(housing);

  // Rel penggeser visor & kenop pengunci atas
  const visorTrack = mkMesh(new THREE.BoxGeometry(0.24, 0.09, 1.45), darkMetalMat);
  visorTrack.position.set(0, 2.25, 0.45);
  visorTrack.rotation.x = 0.32;
  hGroup.add(visorTrack);

  const visorKnob = mkMesh(new THREE.CylinderGeometry(0.16, 0.18, 0.16, 20), metalMat);
  visorKnob.position.set(0, 2.18, 0.92);
  visorKnob.rotation.x = 0.45;
  hGroup.add(visorKnob);

  // Modul JHMCS / HMDS + Dudukan NVG (Night Vision Goggles) di dahi helm
  const hmdsBase = mkMesh(new THREE.BoxGeometry(0.76, 0.56, 0.58), darkMetalMat);
  hmdsBase.position.set(0, 1.46, 1.98);
  hmdsBase.rotation.x = -0.32;
  hGroup.add(hmdsBase);

  const nvgBracket = mkMesh(new THREE.BoxGeometry(0.46, 0.32, 0.34), metalMat);
  nvgBracket.position.set(0, 1.48, 2.28);
  nvgBracket.rotation.x = -0.32;
  hGroup.add(nvgBracket);

  // Lensa proyektor optik HMDS & sensor pelacak gerak kepala
  const hmdsLens = mkMesh(new THREE.CylinderGeometry(0.14, 0.16, 0.24, 20), hudGlowMat);
  hmdsLens.rotation.x = Math.PI / 2 - 0.2;
  hmdsLens.position.set(0.22, 1.38, 2.28);
  hGroup.add(hmdsLens);

  const trackerPod = mkMesh(new THREE.BoxGeometry(0.26, 0.28, 0.52), housingMat);
  trackerPod.position.set(-1.72, 1.15, 0.72);
  trackerPod.rotation.y = -0.35;
  hGroup.add(trackerPod);

  // =========================================================================
  // 4. VISOR GANDA (SUN VISOR GELAP + CLEAR VISOR + PROYEKSI HUD)
  // =========================================================================
  const visorPivot = new THREE.Group();
  visorPivot.name = 'helmet-visor-pivot';
  visorPivot.position.set(0, 0.35, 0.22);
  hGroup.add(visorPivot);

  // Visor gelap anti-silau & laser (terpasang di pivot agar bisa turun-naik saat Simulasi HMDS)
  const darkVisorGeo = new THREE.SphereGeometry(2.08, 40, 24, -Math.PI * 0.38, Math.PI * 0.76, Math.PI * 0.28, Math.PI * 0.27);
  const darkVisor = mkMesh(darkVisorGeo, darkVisorMat);
  darkVisor.rotation.y = Math.PI / 2;
  darkVisor.name = 'gsuit-visor';
  visorPivot.add(darkVisor);

  // Visor bening dalam (pelindung angin saat ejeksi supersonik)
  const clearVisorGeo = new THREE.SphereGeometry(2.00, 36, 20, -Math.PI * 0.36, Math.PI * 0.72, Math.PI * 0.32, Math.PI * 0.24);
  const clearVisor = mkMesh(clearVisorGeo, clearVisorMat);
  clearVisor.rotation.y = Math.PI / 2;
  clearVisor.position.set(0, 0.12, 0.14);
  hGroup.add(clearVisor);

  // =========================================================================
  // 5. EARCUPS KOMUNIKASI (ANR HEADSET), BAYONET RECEIVERS, & KABEL INTERKOM
  // =========================================================================
  for (const s of [1, -1] as const) {
    // Rumah earcup peredam bising aktif (Active Noise Reduction)
    const earOuter = mkMesh(new THREE.CylinderGeometry(0.62, 0.68, 0.36, 26), housingMat);
    earOuter.rotation.z = Math.PI / 2;
    earOuter.position.set(s * 1.98, -0.32, -0.06);
    hGroup.add(earOuter);

    const earPad = mkMesh(new THREE.TorusGeometry(0.55, 0.14, 12, 26), rubberTrimMat);
    earPad.rotation.y = Math.PI / 2;
    earPad.position.set(s * 1.82, -0.32, -0.06);
    hGroup.add(earPad);

    // Bayonet Receiver (dudukan pengunci cepat masker oksigen di pipi helm)
    const bayoPlate = mkMesh(new THREE.BoxGeometry(0.22, 0.56, 0.64), metalMat);
    bayoPlate.position.set(s * 1.62, -0.66, 1.18);
    bayoPlate.rotation.y = s * -0.45;
    hGroup.add(bayoPlate);

    const bayoLock = mkMesh(new THREE.CylinderGeometry(0.11, 0.11, 0.26, 14), goldMat);
    bayoLock.rotation.z = Math.PI / 2;
    bayoLock.position.set(s * 1.72, -0.66, 1.24);
    hGroup.add(bayoLock);

    // Tali dagu (chin strap)
    const strap = mkMesh(new THREE.BoxGeometry(0.14, 0.85, 0.26), rubberTrimMat);
    strap.position.set(s * 1.38, -1.32, 0.45);
    strap.rotation.z = s * 0.28;
    hGroup.add(strap);
  }

  // Kabel komunikasi spiral (intercom cord) dari belakang kiri helm ke bawah
  const commCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.45, -1.15, -1.12),
    new THREE.Vector3(-1.72, -1.95, -1.05),
    new THREE.Vector3(-1.58, -2.85, -0.65),
    new THREE.Vector3(-1.15, -3.55, -0.35),
  ]);
  const commCord = mkMesh(new THREE.TubeGeometry(commCurve, 32, 0.055, 10, false), rubberTrimMat);
  hGroup.add(commCord);
  const commPlug = mkMesh(new THREE.CylinderGeometry(0.08, 0.08, 0.36, 14), metalMat);
  commPlug.position.set(-1.12, -3.62, -0.32);
  commPlug.rotation.z = 0.45;
  hGroup.add(commPlug);

  // =========================================================================
  // 6. MASKER OKSIGEN MBU-20/P (KONTUR SILIKON, KATUP, MIKROFON, & SELANG OBOGS)
  // =========================================================================
  // Tubuh masker loft organik berkontur (dari jembatan hidung ke katup depan)
  const maskGeo = buildLoftGeometry(
    Array.from({ length: 14 }, (_, i) => {
      const u = i / 13;
      const z = lerp(1.18, 2.58, u);
      const rx = lerp(0.95, 0.38, Math.pow(u, 0.85));
      const ry = lerp(0.86, 0.38, Math.pow(u, 0.85));
      const cy = lerp(-0.62, -1.06, u);
      return {
        z,
        point: (th) => [Math.sin(th) * rx, cy + Math.cos(th) * ry],
      };
    }),
    28,
    true,
    false,
  );
  const maskMesh = mkMesh(maskGeo, maskRubberMat);
  hGroup.add(maskMesh);

  // Cangkang keras pelindung masker (hardshell front cover)
  const hardShell = mkMesh(new THREE.CylinderGeometry(0.46, 0.72, 0.92, 24), housingMat);
  hardShell.rotation.x = Math.PI / 2.25;
  hardShell.position.set(0, -0.94, 2.08);
  hGroup.add(hardShell);

  // Katup ekshalasi & mikrofon dinamis di moncong masker
  const valveRing = mkMesh(new THREE.CylinderGeometry(0.36, 0.40, 0.28, 22), darkMetalMat);
  valveRing.rotation.x = Math.PI / 2.2;
  valveRing.position.set(0, -1.14, 2.52);
  hGroup.add(valveRing);

  const valveCap = mkMesh(new THREE.CylinderGeometry(0.24, 0.28, 0.14, 18), metalMat);
  valveCap.rotation.x = Math.PI / 2.2;
  valveCap.position.set(0, -1.20, 2.66);
  hGroup.add(valveCap);

  // Pengait bayonet kiri & kanan dari masker ke pipi helm
  for (const s of [1, -1] as const) {
    const clipCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * 0.56, -0.92, 2.15),
      new THREE.Vector3(s * 1.18, -0.78, 1.82),
      new THREE.Vector3(s * 1.62, -0.66, 1.24),
    ]);
    hGroup.add(mkMesh(new THREE.TubeGeometry(clipCurve, 16, 0.08, 10, false), rubberTrimMat));
  }

  // Selang Oksigen OBOGS Berulir 24 Ruas melengkung turun ke dasar display
  const o2Curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -1.22, 2.58),
    new THREE.Vector3(0.18, -1.95, 2.52),
    new THREE.Vector3(0.68, -2.75, 2.05),
    new THREE.Vector3(1.15, -3.45, 1.28),
    new THREE.Vector3(1.25, -3.92, 0.65),
  ]);
  const o2Tube = mkMesh(new THREE.TubeGeometry(o2Curve, 44, 0.21, 16, false), hoseMat);
  hGroup.add(o2Tube);

  for (let i = 1; i < 24; i++) {
    const pt = o2Curve.getPoint(i / 24);
    const tan = o2Curve.getTangent(i / 24);
    const rib = mkMesh(new THREE.TorusGeometry(0.225, 0.042, 8, 20), darkMetalMat);
    rib.position.copy(pt);
    rib.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan);
    hGroup.add(rib);
  }

  // Konektor cepat aluminium OBOGS di ujung selang
  const obogsEnd = mkMesh(new THREE.CylinderGeometry(0.26, 0.28, 0.52, 20), metalMat);
  obogsEnd.position.set(1.25, -3.98, 0.56);
  obogsEnd.rotation.x = 0.65;
  hGroup.add(obogsEnd);

  const obogsCollar = mkMesh(new THREE.TorusGeometry(0.28, 0.04, 10, 20), goldMat);
  obogsCollar.position.set(1.25, -3.92, 0.64);
  obogsCollar.rotation.x = 0.65 + Math.PI / 2;
  hGroup.add(obogsCollar);

  return {
    group: g,
    nozzles: [],
    spinners: [],
    navLights: [
      { pos: [2.22, 0.28, 0], color: '#4da6ff' },
      { pos: [-2.22, 0.28, 0], color: '#4da6ff' },
      { pos: [0, 0.28, 2.22], color: '#ffb703', blink: 'beacon' },
    ],
    glowMats,
    hoverHeight: 0,
  };
}
