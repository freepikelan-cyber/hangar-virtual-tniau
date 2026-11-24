import * as THREE from 'three';
import { buildLoftGeometry, lerp, mkMesh, smoothstep } from './aeroGeo';
import { flagTexture, roundelTexture, solidNoiseTexture, textTexture } from './textures';
import type { BuildResult } from './proceduralBuilder';

/**
 * Model 3D Museum-Grade sesuai referensi:
 * MODERN FLIGHT HELMET (HGU-55/P) + VISOR & QUAD-TUBE NVG + OXYGEN MASK (MBU-20/P)
 * - Cangkang abu-abu perak taktis (#98a3ae) dengan rel visor tengah hitam
 * - Quad-Tube Night Vision Goggles (NVG) 4 lensa hijau zamrud di dahi
 * - Visor gelap anti-silau + visor bening pelindung ejeksi
 * - Masker Oksigen MBU-20/P berkontur + pengunci bayonet + selang OBOGS berulir 26 ruas
 */
export function buildDetailedPilotHelmet(): BuildResult {
  const g = new THREE.Group();
  const glowMats: THREE.MeshStandardMaterial[] = [];

  // ---------------------- Material PBR ----------------------
  const shellTex = solidNoiseTexture('#9aa4ae', 801, 0.028);
  const shellMat = new THREE.MeshPhysicalMaterial({
    map: shellTex,
    color: '#aeb8c2',
    roughness: 0.24,
    metalness: 0.32,
    clearcoat: 0.65,
    clearcoatRoughness: 0.16,
  });
  const matteBlackMat = new THREE.MeshStandardMaterial({
    color: '#1b2028',
    roughness: 0.48,
    metalness: 0.35,
  });
  const rubberTrimMat = new THREE.MeshStandardMaterial({
    color: '#14181f',
    roughness: 0.85,
    metalness: 0.05,
  });
  const linerMat = new THREE.MeshStandardMaterial({
    color: '#232931',
    roughness: 0.92,
    metalness: 0.02,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: '#c2cdd9',
    roughness: 0.22,
    metalness: 0.9,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: '#2b3440',
    roughness: 0.34,
    metalness: 0.8,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: '#ffb703',
    roughness: 0.3,
    metalness: 0.72,
  });
  const maskRubberMat = new THREE.MeshStandardMaterial({
    color: '#262d36',
    roughness: 0.68,
    metalness: 0.14,
  });
  const hoseMat = new THREE.MeshStandardMaterial({
    color: '#1d232b',
    roughness: 0.56,
    metalness: 0.18,
  });
  const darkVisorMat = new THREE.MeshPhysicalMaterial({
    color: '#07111f',
    roughness: 0.05,
    metalness: 0.35,
    transparent: true,
    opacity: 0.94,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    emissive: new THREE.Color('#00ffaa'),
    emissiveIntensity: 0.05,
  });
  const clearVisorMat = new THREE.MeshPhysicalMaterial({
    color: '#a8dcff',
    roughness: 0.05,
    metalness: 0.1,
    transparent: true,
    opacity: 0.26,
    clearcoat: 1.0,
    depthWrite: false,
  });
  const nvgLensMat = new THREE.MeshPhysicalMaterial({
    color: '#0a3a1e',
    emissive: new THREE.Color('#14ff66'),
    emissiveIntensity: 0.65,
    roughness: 0.08,
    metalness: 0.25,
    clearcoat: 1.0,
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
  glowMats.push(standGlowMat, nvgLensMat);

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

  const neckPost = mkMesh(new THREE.CylinderGeometry(0.18, 0.28, 2.05, 24), metalMat);
  neckPost.position.set(0, 1.35, -0.18);
  neckPost.rotation.x = 0.08;
  g.add(neckPost);

  const cradle = mkMesh(new THREE.SphereGeometry(1.05, 24, 16, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), linerMat);
  cradle.scale.set(0.95, 0.72, 1.05);
  cradle.position.set(0, 2.75, -0.1);
  g.add(cradle);

  const hGroup = new THREE.Group();
  hGroup.position.set(0, 4.35, 0);
  g.add(hGroup);

  // =========================================================================
  // 2. CANGKANG KOMPOSIT HELM HGU-55/P (SILVER-GREY TAKTIS + REL TENGAH HITAM)
  // =========================================================================
  const shellGeo = new THREE.SphereGeometry(2.12, 48, 36, 0, Math.PI * 2, 0, Math.PI * 0.72);
  const posAttr = shellGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    let x = posAttr.getX(i);
    let y = posAttr.getY(i);
    let z = posAttr.getZ(i);
    z *= z < 0 ? 1.14 : 1.04;
    x *= 0.94 + 0.06 * smoothstep(1.2, -0.8, y);
    if (z > 0.75 && y < 0.85) {
      const faceFactor = smoothstep(0.75, 1.55, z) * smoothstep(0.85, -0.15, y);
      z -= faceFactor * 0.52;
      y += faceFactor * 0.28;
    }
    if (z < -0.5 && y < -0.2) {
      y -= smoothstep(-0.5, -1.6, z) * 0.25;
    }
    posAttr.setXYZ(i, x, y, z);
  }
  shellGeo.computeVertexNormals();
  hGroup.add(mkMesh(shellGeo, shellMat));

  // Rel tengah hitam khas HGU-55/P dari dahi ke puncak kepala
  const centerRail = mkMesh(
    new THREE.TorusGeometry(2.14, 0.14, 12, 32, Math.PI * 0.52),
    matteBlackMat,
  );
  centerRail.rotation.y = Math.PI / 2;
  centerRail.rotation.z = Math.PI * 0.24;
  centerRail.scale.set(1.06, 1.01, 0.8);
  hGroup.add(centerRail);

  // Baut & pengikat samping helm
  for (const s of [1, -1] as const) {
    const rivet = mkMesh(new THREE.CylinderGeometry(0.08, 0.08, 0.12, 14), matteBlackMat);
    rivet.rotation.z = Math.PI / 2;
    rivet.position.set(s * 1.94, 0.75, 0.65);
    hGroup.add(rivet);
  }

  // Lapisan busa pelindung dalam (Impact Liner EPS)
  const innerLinerMat = linerMat.clone();
  innerLinerMat.side = THREE.BackSide;
  const innerLiner = mkMesh(new THREE.SphereGeometry(1.94, 36, 24, 0, Math.PI * 2, 0, Math.PI * 0.66), innerLinerMat);
  innerLiner.scale.set(0.92, 0.96, 1.02);
  hGroup.add(innerLiner);

  // Karet list tepi bukaan wajah
  const faceBead = mkMesh(new THREE.TorusGeometry(1.74, 0.075, 12, 48, Math.PI * 1.15), rubberTrimMat);
  faceBead.rotation.set(0.28, 0, -Math.PI * 0.075);
  faceBead.position.set(0, -0.15, 0.92);
  hGroup.add(faceBead);

  // Patch Bendera Merah Putih (kanan), Roundel TNI AU (kiri), & "TNI AU" (belakang)
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
  // 3. QUAD-TUBE NVG (NIGHT VISION GOGGLES 4 LENSA HIJAU) + DUDUKAN DAHI
  // =========================================================================
  const nvgMount = mkMesh(new THREE.BoxGeometry(0.66, 0.52, 0.48), matteBlackMat);
  nvgMount.position.set(0, 1.48, 1.98);
  nvgMount.rotation.x = -0.28;
  hGroup.add(nvgMount);

  const nvgPivot = new THREE.Group();
  nvgPivot.name = 'helmet-nvg-pivot';
  nvgPivot.position.set(0, 1.56, 2.26);
  nvgPivot.rotation.x = -0.58; // Sedikit terangkat ke atas (siap diturunkan saat Simulasi HMDS)
  hGroup.add(nvgPivot);

  // Jembatan utama NVG
  const nvgBridge = mkMesh(new THREE.BoxGeometry(1.68, 0.24, 0.34), matteBlackMat);
  nvgBridge.position.set(0, 0, 0.16);
  nvgPivot.add(nvgBridge);

  // 4 Tabung Optik Panoramik GPNVG-18 dengan lensa hijau zamrud menyala
  const tubeOffsets = [-0.66, -0.24, 0.24, 0.66];
  for (let i = 0; i < tubeOffsets.length; i++) {
    const tx = tubeOffsets[i];
    const outerTilt = i === 0 ? 0.16 : i === 3 ? -0.16 : 0;
    const tubeG = new THREE.Group();
    tubeG.position.set(tx, -0.06, 0.36);
    tubeG.rotation.y = outerTilt;

    const barrel = mkMesh(new THREE.CylinderGeometry(0.17, 0.19, 0.72, 20), matteBlackMat);
    barrel.rotation.x = Math.PI / 2;
    tubeG.add(barrel);

    const ring = mkMesh(new THREE.TorusGeometry(0.175, 0.024, 10, 20), darkMetalMat);
    ring.position.z = 0.34;
    tubeG.add(ring);

    const lens = mkMesh(new THREE.SphereGeometry(0.155, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), nvgLensMat);
    lens.rotation.x = Math.PI / 2;
    lens.position.z = 0.32;
    tubeG.add(lens);

    nvgPivot.add(tubeG);
  }

  // =========================================================================
  // 4. VISOR GANDA (DARK TINTED VISOR + CLEAR VISOR)
  // =========================================================================
  const visorPivot = new THREE.Group();
  visorPivot.name = 'helmet-visor-pivot';
  visorPivot.position.set(0, 0.28, 0.22);
  hGroup.add(visorPivot);

  const darkVisorGeo = new THREE.SphereGeometry(2.08, 40, 24, -Math.PI * 0.38, Math.PI * 0.76, Math.PI * 0.28, Math.PI * 0.27);
  const darkVisor = mkMesh(darkVisorGeo, darkVisorMat);
  darkVisor.rotation.y = Math.PI / 2;
  darkVisor.name = 'gsuit-visor';
  visorPivot.add(darkVisor);

  const clearVisorGeo = new THREE.SphereGeometry(2.0, 36, 20, -Math.PI * 0.36, Math.PI * 0.72, Math.PI * 0.32, Math.PI * 0.24);
  const clearVisor = mkMesh(clearVisorGeo, clearVisorMat);
  clearVisor.rotation.y = Math.PI / 2;
  clearVisor.position.set(0, 0.12, 0.14);
  hGroup.add(clearVisor);

  // =========================================================================
  // 5. EARCUPS KOMUNIKASI ANR, BAYONET RECEIVERS, & KABEL INTERKOM
  // =========================================================================
  for (const s of [1, -1] as const) {
    const earOuter = mkMesh(new THREE.CylinderGeometry(0.62, 0.68, 0.38, 26), matteBlackMat);
    earOuter.rotation.z = Math.PI / 2;
    earOuter.position.set(s * 1.98, -0.32, -0.06);
    hGroup.add(earOuter);

    const earPad = mkMesh(new THREE.TorusGeometry(0.55, 0.14, 12, 26), rubberTrimMat);
    earPad.rotation.y = Math.PI / 2;
    earPad.position.set(s * 1.82, -0.32, -0.06);
    hGroup.add(earPad);

    const bayoPlate = mkMesh(new THREE.BoxGeometry(0.24, 0.58, 0.66), metalMat);
    bayoPlate.position.set(s * 1.62, -0.66, 1.18);
    bayoPlate.rotation.y = s * -0.45;
    hGroup.add(bayoPlate);

    const bayoLock = mkMesh(new THREE.CylinderGeometry(0.11, 0.11, 0.26, 14), goldMat);
    bayoLock.rotation.z = Math.PI / 2;
    bayoLock.position.set(s * 1.72, -0.66, 1.24);
    hGroup.add(bayoLock);

    const strap = mkMesh(new THREE.BoxGeometry(0.14, 0.85, 0.26), rubberTrimMat);
    strap.position.set(s * 1.38, -1.32, 0.45);
    strap.rotation.z = s * 0.28;
    hGroup.add(strap);
  }

  const commCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.45, -1.15, -1.12),
    new THREE.Vector3(-1.72, -1.95, -1.05),
    new THREE.Vector3(-1.58, -2.85, -0.65),
    new THREE.Vector3(-1.15, -3.55, -0.35),
  ]);
  hGroup.add(mkMesh(new THREE.TubeGeometry(commCurve, 32, 0.055, 10, false), rubberTrimMat));
  const commPlug = mkMesh(new THREE.CylinderGeometry(0.08, 0.08, 0.36, 14), metalMat);
  commPlug.position.set(-1.12, -3.62, -0.32);
  commPlug.rotation.z = 0.45;
  hGroup.add(commPlug);

  // =========================================================================
  // 6. MASKER OKSIGEN MBU-20/P & SELANG OBOGS BERULIR 26 RUAS
  // =========================================================================
  const maskGeo = buildLoftGeometry(
    Array.from({ length: 14 }, (_, i) => {
      const u = i / 13;
      const z = lerp(1.18, 2.58, u);
      const rx = lerp(0.95, 0.38, Math.pow(u, 0.85));
      const ry = lerp(0.86, 0.38, Math.pow(u, 0.85));
      const cy = lerp(-0.62, -1.06, u);
      return { z, point: (th) => [Math.sin(th) * rx, cy + Math.cos(th) * ry] };
    }),
    28,
    true,
    false,
  );
  hGroup.add(mkMesh(maskGeo, maskRubberMat));

  const hardShell = mkMesh(new THREE.CylinderGeometry(0.46, 0.72, 0.92, 24), matteBlackMat);
  hardShell.rotation.x = Math.PI / 2.25;
  hardShell.position.set(0, -0.94, 2.08);
  hGroup.add(hardShell);

  const valveRing = mkMesh(new THREE.CylinderGeometry(0.36, 0.4, 0.28, 22), darkMetalMat);
  valveRing.rotation.x = Math.PI / 2.2;
  valveRing.position.set(0, -1.14, 2.52);
  hGroup.add(valveRing);

  const valveCap = mkMesh(new THREE.CylinderGeometry(0.24, 0.28, 0.14, 18), metalMat);
  valveCap.rotation.x = Math.PI / 2.2;
  valveCap.position.set(0, -1.2, 2.66);
  hGroup.add(valveCap);

  for (const s of [1, -1] as const) {
    const clipCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * 0.56, -0.92, 2.15),
      new THREE.Vector3(s * 1.18, -0.78, 1.82),
      new THREE.Vector3(s * 1.62, -0.66, 1.24),
    ]);
    hGroup.add(mkMesh(new THREE.TubeGeometry(clipCurve, 16, 0.08, 10, false), rubberTrimMat));
  }

  const o2Curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -1.22, 2.58),
    new THREE.Vector3(0.24, -1.95, 2.52),
    new THREE.Vector3(0.75, -2.75, 2.05),
    new THREE.Vector3(1.18, -3.45, 1.28),
    new THREE.Vector3(1.28, -3.92, 0.65),
  ]);
  hGroup.add(mkMesh(new THREE.TubeGeometry(o2Curve, 48, 0.21, 16, false), hoseMat));

  for (let i = 1; i < 26; i++) {
    const pt = o2Curve.getPoint(i / 26);
    const tan = o2Curve.getTangent(i / 26);
    const rib = mkMesh(new THREE.TorusGeometry(0.228, 0.044, 8, 20), darkMetalMat);
    rib.position.copy(pt);
    rib.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan);
    hGroup.add(rib);
  }

  const obogsEnd = mkMesh(new THREE.CylinderGeometry(0.26, 0.28, 0.52, 20), metalMat);
  obogsEnd.position.set(1.28, -3.98, 0.56);
  obogsEnd.rotation.x = 0.65;
  hGroup.add(obogsEnd);

  const obogsCollar = mkMesh(new THREE.TorusGeometry(0.28, 0.04, 10, 20), goldMat);
  obogsCollar.position.set(1.28, -3.92, 0.64);
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
