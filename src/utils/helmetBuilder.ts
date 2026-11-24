import * as THREE from 'three';
import { buildLoftGeometry, lerp, mkMesh, smoothstep } from './aeroGeo';
import { flagTexture, roundelTexture, textTexture } from './textures';
import type { BuildResult } from './proceduralBuilder';

/** Membuat peta bump/tekstur cat matte micro-grain untuk cangkang helm komposit. */
function makeMicroGrainBump(seed = 801): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(256, 256);
  let s = seed;
  for (let i = 0; i < img.data.length; i += 4) {
    s = (s * 16807) % 2147483647;
    const v = 115 + (s % 26);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Model 3D Realistis Museum-Grade sesuai gambar referensi:
 * MODERN FLIGHT HELMET (HGU-55/P) + VISOR BERNOTCH HIDUNG + QUAD-TUBE NVG + OXYGEN MASK (MBU-20/P)
 */
export function buildDetailedPilotHelmet(): BuildResult {
  const g = new THREE.Group();
  const glowMats: THREE.MeshStandardMaterial[] = [];

  const grainBump = makeMicroGrainBump(809);

  // ---------------------- Material PBR Realistis ----------------------
  const shellMat = new THREE.MeshPhysicalMaterial({
    color: '#b4bcc4', // Pearl silver-grey matte khas HGU-55/P di referensi
    bumpMap: grainBump,
    bumpScale: 0.012,
    roughness: 0.28,
    metalness: 0.38,
    clearcoat: 0.55,
    clearcoatRoughness: 0.22,
  });
  const matteBlackMat = new THREE.MeshStandardMaterial({
    color: '#1b2026',
    bumpMap: grainBump,
    bumpScale: 0.018,
    roughness: 0.52,
    metalness: 0.28,
  });
  const rubberTrimMat = new THREE.MeshStandardMaterial({
    color: '#14171c',
    roughness: 0.85,
    metalness: 0.05,
  });
  const linerMat = new THREE.MeshStandardMaterial({
    color: '#1f242b',
    roughness: 0.94,
    metalness: 0.02,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: '#c4ced9',
    roughness: 0.22,
    metalness: 0.9,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: '#2a323c',
    roughness: 0.34,
    metalness: 0.8,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: '#ffb703',
    roughness: 0.28,
    metalness: 0.72,
  });
  const maskSiliconeMat = new THREE.MeshStandardMaterial({
    color: '#282e36',
    bumpMap: grainBump,
    bumpScale: 0.02,
    roughness: 0.62,
    metalness: 0.14,
  });
  const hoseMat = new THREE.MeshStandardMaterial({
    color: '#1c2128',
    roughness: 0.54,
    metalness: 0.18,
  });
  const darkVisorMat = new THREE.MeshPhysicalMaterial({
    color: '#061224',
    roughness: 0.04,
    metalness: 0.38,
    transparent: true,
    opacity: 0.94,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    emissive: new THREE.Color('#00ffaa'),
    emissiveIntensity: 0.04,
  });
  const clearVisorMat = new THREE.MeshPhysicalMaterial({
    color: '#b0e0ff',
    roughness: 0.04,
    metalness: 0.1,
    transparent: true,
    opacity: 0.22,
    clearcoat: 1.0,
    depthWrite: false,
  });
  const nvgLensMat = new THREE.MeshPhysicalMaterial({
    color: '#083a1d',
    emissive: new THREE.Color('#18ff6e'),
    emissiveIntensity: 0.78,
    roughness: 0.06,
    metalness: 0.2,
    clearcoat: 1.0,
  });
  const standBaseMat = new THREE.MeshStandardMaterial({
    color: '#11274a',
    roughness: 0.34,
    metalness: 0.7,
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

  const glowRing = mkMesh(new THREE.TorusGeometry(2.22, 0.042, 12, 64), standGlowMat);
  glowRing.rotation.x = Math.PI / 2;
  glowRing.position.y = 0.25;
  g.add(glowRing);

  const goldRing = mkMesh(new THREE.TorusGeometry(1.72, 0.022, 10, 64), goldMat);
  goldRing.rotation.x = Math.PI / 2;
  goldRing.position.y = 0.365;
  g.add(goldRing);

  const neckPost = mkMesh(new THREE.CylinderGeometry(0.16, 0.26, 2.05, 24), metalMat);
  neckPost.position.set(0, 1.35, -0.18);
  neckPost.rotation.x = 0.08;
  g.add(neckPost);

  const cradle = mkMesh(new THREE.SphereGeometry(1.05, 24, 16, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), linerMat);
  cradle.scale.set(0.95, 0.7, 1.05);
  cradle.position.set(0, 2.75, -0.1);
  g.add(cradle);

  const hGroup = new THREE.Group();
  hGroup.position.set(0, 4.35, 0);
  g.add(hGroup);

  // =========================================================================
  // 2. CANGKANG HGU-55/P BULAT RAMPING (SILVER-GREY + REL TENGAH HITAM LEBAR)
  // =========================================================================
  const shellGeo = new THREE.SphereGeometry(2.14, 56, 40, 0, Math.PI * 2, 0, Math.PI * 0.74);
  const posAttr = shellGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    let x = posAttr.getX(i);
    let y = posAttr.getY(i);
    let z = posAttr.getZ(i);
    // Proporsi khas HGU-55/P: membulat penuh di atas, agak melebar di pipi/telinga, memanjang halus ke tengkuk
    z *= z < 0 ? 1.12 : 1.02;
    x *= 0.96 + 0.08 * smoothstep(0.9, -0.9, y);
    // Cutout wajah melengkung rapi di depan (+Z)
    if (z > 0.65 && y < 0.72) {
      const faceCut = smoothstep(0.65, 1.55, z) * smoothstep(0.72, -0.25, y);
      z -= faceCut * 0.62;
      y += faceCut * 0.34;
    }
    // Pelindung tengkuk belakang
    if (z < -0.55 && y < -0.25) {
      y -= smoothstep(-0.55, -1.65, z) * 0.24;
    }
    posAttr.setXYZ(i, x, y, z);
  }
  shellGeo.computeVertexNormals();
  hGroup.add(mkMesh(shellGeo, shellMat));

  // Rel tengah hitam lebar khas HGU-55/P (seperti garis hitam di tengah atas helm referensi)
  const centerTrack = mkMesh(new THREE.TorusGeometry(2.15, 0.16, 14, 36, Math.PI * 0.56), matteBlackMat);
  centerTrack.rotation.y = Math.PI / 2;
  centerTrack.rotation.z = Math.PI * 0.21;
  centerTrack.scale.set(1.04, 1.01, 0.72);
  hGroup.add(centerTrack);

  // Kancing pengunci visor & baut samping hitam sesuai referensi
  for (const s of [1, -1] as const) {
    for (const [bx, by, bz] of [
      [s * 1.48, 1.18, 1.24],
      [s * 1.98, 0.42, 0.68],
      [s * 1.96, -0.35, 0.85],
    ]) {
      const bolt = mkMesh(new THREE.CylinderGeometry(0.085, 0.095, 0.14, 16), matteBlackMat);
      bolt.rotation.z = Math.PI / 2;
      bolt.position.set(bx, by, bz);
      hGroup.add(bolt);
    }
  }

  // Lapisan busa pelindung dalam
  const innerLinerMat = linerMat.clone();
  innerLinerMat.side = THREE.BackSide;
  const innerLiner = mkMesh(new THREE.SphereGeometry(1.96, 36, 24, 0, Math.PI * 2, 0, Math.PI * 0.68), innerLinerMat);
  innerLiner.scale.set(0.94, 0.96, 1.02);
  hGroup.add(innerLiner);

  // List karet hitam sepanjang tepi bukaan wajah & tengkuk
  const edgeBead = mkMesh(new THREE.TorusGeometry(1.76, 0.08, 12, 48, Math.PI * 1.18), rubberTrimMat);
  edgeBead.rotation.set(0.32, 0, -Math.PI * 0.09);
  edgeBead.position.set(0, -0.12, 0.88);
  hGroup.add(edgeBead);

  // Patch Bendera Merah Putih (kanan), Roundel TNI AU (kiri), & "TNI AU" (belakang)
  const flagPatch = mkMesh(
    new THREE.PlaneGeometry(0.64, 0.42),
    new THREE.MeshStandardMaterial({ map: flagTexture(), transparent: true, roughness: 0.35 }),
  );
  flagPatch.position.set(2.04, 0.45, -0.38);
  flagPatch.rotation.y = Math.PI / 2 + 0.16;
  hGroup.add(flagPatch);

  const roundelPatch = mkMesh(
    new THREE.PlaneGeometry(0.6, 0.6),
    new THREE.MeshStandardMaterial({ map: roundelTexture(), transparent: true, roughness: 0.35 }),
  );
  roundelPatch.position.set(-2.04, 0.45, -0.38);
  roundelPatch.rotation.y = -Math.PI / 2 - 0.16;
  hGroup.add(roundelPatch);

  const rearStrip = mkMesh(
    new THREE.PlaneGeometry(1.4, 0.3),
    new THREE.MeshStandardMaterial({
      map: textTexture('TNI AU', { color: '#ffb703', aspect: 4.5 }),
      transparent: true,
      roughness: 0.35,
    }),
  );
  rearStrip.position.set(0, 0.35, -2.38);
  rearStrip.rotation.y = Math.PI;
  hGroup.add(rearStrip);

  // =========================================================================
  // 3. VISOR GANDA DENGAN LEKUKAN HIDUNG (CLASSIC FIGHTER VISOR CUTOUT)
  // =========================================================================
  const visorPivot = new THREE.Group();
  visorPivot.name = 'helmet-visor-pivot';
  visorPivot.position.set(0, 0.25, 0.16);
  hGroup.add(visorPivot);

  // Bangun visor gelap melengkung dengan lekukan hidung di tengah bawah agar pas dengan MBU-20
  const buildNotchedVisorGeo = (radius: number) => {
    const geo = new THREE.SphereGeometry(radius, 44, 24, -Math.PI * 0.38, Math.PI * 0.76, Math.PI * 0.29, Math.PI * 0.26);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      let y = p.getY(i);
      const z = p.getZ(i);
      // Lekukan hidung di tengah bawah (setelah rotasi Y=PI/2, pusat depan berada di z=0, x>0)
      if (y < 0.05 && Math.abs(z) < 0.58) {
        const notch = Math.cos((z / 0.58) * (Math.PI / 2));
        y += notch * 0.28 * smoothstep(0.05, -0.42, y);
      }
      p.setXYZ(i, x, y, z);
    }
    geo.computeVertexNormals();
    return geo;
  };

  const darkVisor = mkMesh(buildNotchedVisorGeo(2.12), darkVisorMat);
  darkVisor.rotation.y = Math.PI / 2;
  darkVisor.name = 'gsuit-visor';
  visorPivot.add(darkVisor);

  // Bingkai karet atas visor (brow seal)
  const visorBrow = mkMesh(new THREE.TorusGeometry(2.13, 0.065, 10, 36, Math.PI * 0.76), matteBlackMat);
  visorBrow.rotation.x = Math.PI / 2;
  visorBrow.rotation.z = -Math.PI * 0.38;
  visorBrow.position.set(0, 0.96, 0.02);
  visorPivot.add(visorBrow);

  const clearVisor = mkMesh(buildNotchedVisorGeo(2.02), clearVisorMat);
  clearVisor.rotation.y = Math.PI / 2;
  clearVisor.position.set(0, 0.14, 0.12);
  hGroup.add(clearVisor);

  // =========================================================================
  // 4. QUAD-TUBE NVG (GPNVG-18 4 TABUNG LENSA HIJAU ZAMRUD) DI DAHI
  // =========================================================================
  const shroud = mkMesh(new THREE.CylinderGeometry(0.28, 0.36, 0.24, 6), matteBlackMat);
  shroud.rotation.x = Math.PI / 2 - 0.3;
  shroud.position.set(0, 1.38, 1.94);
  hGroup.add(shroud);

  const nvgPivot = new THREE.Group();
  nvgPivot.name = 'helmet-nvg-pivot';
  nvgPivot.position.set(0, 1.54, 2.18);
  nvgPivot.rotation.x = -0.62; // Terlipat rapi ke atas saat standby, turun saat Simulasi HMDS
  hGroup.add(nvgPivot);

  const nvgArm = mkMesh(new THREE.BoxGeometry(0.24, 0.34, 0.38), metalMat);
  nvgArm.position.set(0, -0.02, 0.14);
  nvgPivot.add(nvgArm);

  const nvgBridge = mkMesh(new THREE.BoxGeometry(1.56, 0.22, 0.30), matteBlackMat);
  nvgBridge.position.set(0, -0.08, 0.34);
  nvgPivot.add(nvgBridge);

  const tubeXs = [-0.60, -0.22, 0.22, 0.60];
  for (let i = 0; i < tubeXs.length; i++) {
    const tG = new THREE.Group();
    tG.position.set(tubeXs[i], -0.14, 0.56);
    tG.rotation.y = i === 0 ? 0.18 : i === 3 ? -0.18 : 0;

    const barrel = mkMesh(new THREE.CylinderGeometry(0.16, 0.18, 0.66, 20), matteBlackMat);
    barrel.rotation.x = Math.PI / 2;
    tG.add(barrel);

    const bezel = mkMesh(new THREE.TorusGeometry(0.165, 0.024, 10, 20), darkMetalMat);
    bezel.position.z = 0.31;
    tG.add(bezel);

    const lens = mkMesh(new THREE.SphereGeometry(0.15, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), nvgLensMat);
    lens.rotation.x = Math.PI / 2;
    lens.position.z = 0.29;
    tG.add(lens);

    nvgPivot.add(tG);
  }

  // =========================================================================
  // 5. EARCUPS KOMUNIKASI ANR, BAYONET RECEIVERS, & KABEL INTERKOM
  // =========================================================================
  for (const s of [1, -1] as const) {
    const earCup = mkMesh(new THREE.CylinderGeometry(0.58, 0.66, 0.34, 28), matteBlackMat);
    earCup.rotation.z = Math.PI / 2;
    earCup.position.set(s * 2.02, -0.34, -0.08);
    hGroup.add(earCup);

    const earPad = mkMesh(new THREE.TorusGeometry(0.54, 0.14, 12, 28), rubberTrimMat);
    earPad.rotation.y = Math.PI / 2;
    earPad.position.set(s * 1.88, -0.34, -0.08);
    hGroup.add(earPad);

    // Bayonet Receiver logam di pipi helm
    const bayoPlate = mkMesh(new THREE.BoxGeometry(0.22, 0.52, 0.62), metalMat);
    bayoPlate.position.set(s * 1.66, -0.68, 1.14);
    bayoPlate.rotation.y = s * -0.45;
    hGroup.add(bayoPlate);

    const bayoPin = mkMesh(new THREE.CylinderGeometry(0.09, 0.09, 0.24, 14), goldMat);
    bayoPin.rotation.z = Math.PI / 2;
    bayoPin.position.set(s * 1.76, -0.68, 1.20);
    hGroup.add(bayoPin);
  }

  const commCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.48, -1.15, -1.10),
    new THREE.Vector3(-1.72, -1.95, -1.02),
    new THREE.Vector3(-1.58, -2.85, -0.62),
    new THREE.Vector3(-1.15, -3.55, -0.32),
  ]);
  hGroup.add(mkMesh(new THREE.TubeGeometry(commCurve, 32, 0.055, 10, false), rubberTrimMat));
  const commPlug = mkMesh(new THREE.CylinderGeometry(0.08, 0.08, 0.36, 14), metalMat);
  commPlug.position.set(-1.12, -3.62, -0.30);
  commPlug.rotation.z = 0.45;
  hGroup.add(commPlug);

  // =========================================================================
  // 6. MASKER OKSIGEN MBU-20/P (SILIKON SEGITIGA-TEARDROP + SELANG OBOGS 28 RUAS)
  // =========================================================================
  // Bentuk segitiga-teardrop khas MBU-20/P: sempit di batang hidung, melebar di pipi, mengerucut di katup
  const maskGeo = buildLoftGeometry(
    Array.from({ length: 16 }, (_, i) => {
      const u = i / 15;
      const z = lerp(1.15, 2.52, u);
      const rx = lerp(0.96, 0.42, Math.pow(u, 0.82));
      const ry = lerp(0.92, 0.42, Math.pow(u, 0.82));
      const cy = lerp(-0.56, -1.04, u);
      return {
        z,
        point: (th) => {
          const s = Math.sin(th);
          const c = Math.cos(th);
          // Bagian atas (hidung) menyempit membentuk jembatan hidung segitiga khas MBU-20
          const topPinch = c > 0 ? 1 - 0.34 * c * (1 - u * 0.5) : 1;
          return [s * rx * topPinch, cy + c * ry];
        },
      };
    }),
    32,
    true,
    false,
  );
  hGroup.add(mkMesh(maskGeo, maskSiliconeMat));

  // Cangkang keras hitam MBU-20 & katup bundar depan
  const hardCover = mkMesh(new THREE.CylinderGeometry(0.46, 0.72, 0.86, 26), matteBlackMat);
  hardCover.rotation.x = Math.PI / 2.22;
  hardCover.position.set(0, -0.92, 2.04);
  hGroup.add(hardCover);

  const valveHousing = mkMesh(new THREE.CylinderGeometry(0.38, 0.42, 0.30, 24), darkMetalMat);
  valveHousing.rotation.x = Math.PI / 2.15;
  valveHousing.position.set(0, -1.12, 2.48);
  hGroup.add(valveHousing);

  const valveDisc = mkMesh(new THREE.CylinderGeometry(0.25, 0.28, 0.14, 20), metalMat);
  valveDisc.rotation.x = Math.PI / 2.15;
  valveDisc.position.set(0, -1.18, 2.62);
  hGroup.add(valveDisc);

  // Lengan bayonet melengkung dari kedua sisi masker ke pipi helm
  for (const s of [1, -1] as const) {
    const armCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * 0.52, -0.88, 2.14),
      new THREE.Vector3(s * 1.16, -0.76, 1.80),
      new THREE.Vector3(s * 1.66, -0.68, 1.20),
    ]);
    hGroup.add(mkMesh(new THREE.TubeGeometry(armCurve, 18, 0.085, 10, false), rubberTrimMat));
  }

  // Selang Oksigen OBOGS berulir 28 ruas melengkung rapi ke kanan-bawah (sisi kiri pilot)
  const o2Curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -1.20, 2.54),
    new THREE.Vector3(0.22, -1.92, 2.50),
    new THREE.Vector3(0.76, -2.72, 2.02),
    new THREE.Vector3(1.18, -3.45, 1.24),
    new THREE.Vector3(1.26, -3.92, 0.62),
  ]);
  hGroup.add(mkMesh(new THREE.TubeGeometry(o2Curve, 52, 0.21, 16, false), hoseMat));

  for (let i = 1; i < 28; i++) {
    const pt = o2Curve.getPoint(i / 28);
    const tan = o2Curve.getTangent(i / 28);
    const rib = mkMesh(new THREE.TorusGeometry(0.23, 0.044, 8, 20), darkMetalMat);
    rib.position.copy(pt);
    rib.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan);
    hGroup.add(rib);
  }

  const obogsEnd = mkMesh(new THREE.CylinderGeometry(0.26, 0.28, 0.52, 20), metalMat);
  obogsEnd.position.set(1.26, -3.98, 0.54);
  obogsEnd.rotation.x = 0.65;
  hGroup.add(obogsEnd);

  const obogsCollar = mkMesh(new THREE.TorusGeometry(0.28, 0.042, 10, 20), goldMat);
  obogsCollar.position.set(1.26, -3.92, 0.62);
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
