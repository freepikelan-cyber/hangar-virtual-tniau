import * as THREE from 'three';
import { buildLoftGeometry, lerp, mkMesh, smoothstep } from './aeroGeo';
import type { BuildResult } from './proceduralBuilder';

/** Peta micro-grain matte halus untuk permukaan komposit helm & silikon masker MBU-20/P. */
function makeMicroGrainBump(seed = 809): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(256, 256);
  let s = seed;
  for (let i = 0; i < img.data.length; i += 4) {
    s = (s * 16807) % 2147483647;
    const v = 118 + (s % 22);
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
 * Tekstur proyeksi HMCS / HUD hijau tajam sesuai gambar referensi:
 * Heading tape (350 000 010), kecepatan (420), ketinggian (12,500),
 * pitch ladder & reticle penargetan tengah!
 */
function makeHmcsHudTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 1024, 512);

  ctx.strokeStyle = '#39ff7a';
  ctx.fillStyle = '#39ff7a';
  ctx.shadowColor = '#00ff66';
  ctx.shadowBlur = 10;
  ctx.lineWidth = 3;
  ctx.font = 'bold 26px monospace';
  ctx.textAlign = 'center';

  // Heading tape atas: 350   000   010
  ctx.beginPath();
  ctx.moveTo(310, 96);
  ctx.lineTo(714, 96);
  ctx.stroke();
  for (let x = 330; x <= 694; x += 26) {
    ctx.beginPath();
    ctx.moveTo(x, 96);
    ctx.lineTo(x, x % 52 === 0 ? 112 : 104);
    ctx.stroke();
  }
  ctx.fillText('350', 392, 82);
  ctx.fillText('000', 512, 82);
  ctx.fillText('010', 632, 82);
  // Segitiga penunjuk heading tengah
  ctx.beginPath();
  ctx.moveTo(512, 114);
  ctx.lineTo(502, 128);
  ctx.lineTo(522, 128);
  ctx.closePath();
  ctx.stroke();

  // Kotak kecepatan kiri: 420
  ctx.strokeRect(212, 232, 92, 44);
  ctx.fillText('420', 258, 263);
  for (let y = 175; y <= 335; y += 20) {
    ctx.beginPath();
    ctx.moveTo(316, y);
    ctx.lineTo(y === 255 ? 336 : 326, y);
    ctx.stroke();
  }

  // Kotak ketinggian kanan: 12,500
  ctx.strokeRect(700, 232, 122, 44);
  ctx.fillText('12,500', 761, 263);
  for (let y = 175; y <= 335; y += 20) {
    ctx.beginPath();
    ctx.moveTo(688, y);
    ctx.lineTo(y === 255 ? 668 : 678, y);
    ctx.stroke();
  }

  // Pitch ladder & Flight Path Marker + Reticle Tengah
  ctx.beginPath();
  ctx.arc(512, 256, 42, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(512, 256, 7, 0, Math.PI * 2);
  ctx.fill();

  // Garis bidik salib tengah
  ctx.beginPath();
  ctx.moveTo(436, 256);
  ctx.lineTo(486, 256);
  ctx.moveTo(538, 256);
  ctx.lineTo(588, 256);
  ctx.moveTo(512, 184);
  ctx.lineTo(512, 226);
  ctx.moveTo(512, 286);
  ctx.lineTo(512, 328);
  ctx.stroke();

  // Garis pitch ladder atas & bawah
  for (const dy of [-86, -48, 48, 86]) {
    ctx.beginPath();
    ctx.moveTo(418, 256 + dy);
    ctx.lineTo(462, 256 + dy);
    ctx.moveTo(562, 256 + dy);
    ctx.lineTo(606, 256 + dy);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Patch bahu Garuda Emas TNI AU pada kerah jaket penerbang. */
function makeGarudaShoulderPatch(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 160;
  c.height = 160;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#11161d';
  ctx.fillRect(0, 0, 160, 160);
  ctx.strokeStyle = '#f5c542';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 144, 144);
  // Siluet sayap & elang emas sederhana
  ctx.fillStyle = '#f5c542';
  ctx.beginPath();
  ctx.moveTo(80, 32);
  ctx.lineTo(136, 72);
  ctx.lineTo(116, 118);
  ctx.lineTo(80, 96);
  ctx.lineTo(44, 118);
  ctx.lineTo(24, 72);
  ctx.closePath();
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Model 3D Realistis HELMET PILOT PESAWAT TEMPUR TNI AU (HGU-55/P HMCS)
 * Sesuai persis desain referensi:
 * - Cangkang komposit abu-abu taktis matte mulus + kontur earcup samping & baut/rel visor hitam
 * - Visor pelindung lebar gelap-iridescent dengan lekukan hidung & proyeksi HUD HMCS hijau (350 000 010 / 420 / 12,500)
 * - Masker Oksigen MBU-20/P berkontur realistis + katup regulator + strap bayonet + selang berulir
 * - Inner Liner EPS hitam + bantalan kenyamanan + kerah seragam terbang zaitun & harness TNI AU
 */
export function buildDetailedPilotHelmet(): BuildResult {
  const g = new THREE.Group();
  const glowMats: THREE.MeshStandardMaterial[] = [];

  const grainBump = makeMicroGrainBump(809);
  const hudTex = makeHmcsHudTexture();
  const patchTex = makeGarudaShoulderPatch();

  // ---------------------- Material PBR Realistis ----------------------
  const shellMat = new THREE.MeshPhysicalMaterial({
    color: '#bcc4cc', // Abu-abu komposit taktis matte-satin khas helm referensi
    bumpMap: grainBump,
    bumpScale: 0.008,
    roughness: 0.34,
    metalness: 0.24,
    clearcoat: 0.42,
    clearcoatRoughness: 0.28,
  });
  const matteBlackMat = new THREE.MeshStandardMaterial({
    color: '#191e25',
    bumpMap: grainBump,
    bumpScale: 0.015,
    roughness: 0.55,
    metalness: 0.22,
  });
  const rubberTrimMat = new THREE.MeshStandardMaterial({
    color: '#12161c',
    roughness: 0.86,
    metalness: 0.05,
  });
  const linerMat = new THREE.MeshStandardMaterial({
    color: '#1b2028',
    roughness: 0.92,
    metalness: 0.04,
  });
  const padYellowMat = new THREE.MeshStandardMaterial({
    color: '#c9a34a', // Aksen busa kuning-emas di sisi dalam (sesuai Tampak Dalam referensi)
    roughness: 0.88,
    metalness: 0.02,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: '#b8c3cf',
    roughness: 0.26,
    metalness: 0.88,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: '#2c3440',
    roughness: 0.36,
    metalness: 0.78,
  });
  const maskSiliconeMat = new THREE.MeshStandardMaterial({
    color: '#2a313b',
    bumpMap: grainBump,
    bumpScale: 0.018,
    roughness: 0.58,
    metalness: 0.16,
  });
  const hoseMat = new THREE.MeshStandardMaterial({
    color: '#20262e',
    roughness: 0.52,
    metalness: 0.22,
  });
  const flightSuitMat = new THREE.MeshStandardMaterial({
    color: '#3f4b38', // Hijau zaitun seragam penerbang TNI AU di referensi
    bumpMap: grainBump,
    bumpScale: 0.025,
    roughness: 0.88,
    metalness: 0.04,
  });
  const darkVisorMat = new THREE.MeshPhysicalMaterial({
    color: '#0c1829',
    roughness: 0.04,
    metalness: 0.42,
    transparent: true,
    opacity: 0.86,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    iridescence: 0.72,
    iridescenceIOR: 1.38,
    emissive: new THREE.Color('#00ff88'),
    emissiveIntensity: 0.06,
  });
  const hudProjMat = new THREE.MeshBasicMaterial({
    map: hudTex,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const standBaseMat = new THREE.MeshStandardMaterial({
    color: '#0f2546',
    roughness: 0.34,
    metalness: 0.72,
  });
  const standGlowMat = new THREE.MeshStandardMaterial({
    color: '#4da6ff',
    emissive: new THREE.Color('#4da6ff'),
    emissiveIntensity: 0.75,
    roughness: 0.2,
  });
  glowMats.push(standGlowMat);

  // =========================================================================
  // 1. DUDUKAN DISPLAY & BAHU SERAGAM PENERBANG TNI AU (REALISTIC BUST BASE)
  // =========================================================================
  const base1 = mkMesh(new THREE.CylinderGeometry(2.55, 2.78, 0.22, 56), standBaseMat);
  base1.position.y = 0.11;
  g.add(base1);

  const glowRing = mkMesh(new THREE.TorusGeometry(2.42, 0.04, 12, 64), standGlowMat);
  glowRing.rotation.x = Math.PI / 2;
  glowRing.position.y = 0.23;
  g.add(glowRing);

  // Bahu & Kerah Seragam Terbang Hijau Zaitun (seperti foto referensi kiri!)
  const torsoGeo = buildLoftGeometry(
    Array.from({ length: 14 }, (_, i) => {
      const u = i / 13;
      const y = lerp(0.24, 2.18, u);
      const rx = lerp(2.25, 0.92, Math.pow(u, 0.72));
      const rz = lerp(1.38, 0.86, Math.pow(u, 0.75));
      return {
        z: y,
        point: (th) => [Math.sin(th) * rx, Math.cos(th) * rz],
      };
    }),
    36,
    true,
    true,
  );
  torsoGeo.rotateX(-Math.PI / 2);
  torsoGeo.translate(0, 0, -0.15);
  g.add(mkMesh(torsoGeo, flightSuitMat));

  // Kerah leher hitam & tali harness bahu (kiri & kanan)
  const collar = mkMesh(new THREE.TorusGeometry(0.92, 0.16, 12, 32), matteBlackMat);
  collar.rotation.x = Math.PI / 2 + 0.12;
  collar.position.set(0, 2.18, -0.05);
  g.add(collar);

  for (const s of [1, -1] as const) {
    const strapCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * 0.95, 2.02, -0.58),
      new THREE.Vector3(s * 1.18, 1.85, 0.38),
      new THREE.Vector3(s * 1.12, 0.95, 1.12),
      new THREE.Vector3(s * 1.02, 0.35, 1.24),
    ]);
    g.add(mkMesh(new THREE.TubeGeometry(strapCurve, 22, 0.13, 8, false), matteBlackMat));

    // Patch Garuda Emas di bahu depan (sesuai foto hero referensi!)
    const patch = mkMesh(
      new THREE.PlaneGeometry(0.56, 0.56),
      new THREE.MeshStandardMaterial({ map: patchTex, roughness: 0.45 }),
    );
    patch.position.set(s * 1.16, 1.38, 0.96);
    patch.rotation.set(-0.34, s * 0.36, 0);
    g.add(patch);
  }

  // Siluet Kepala Manekin Gelap (Balaclava Taktis) di dalam helm agar helm tampak hidup & berisi!
  const hGroup = new THREE.Group();
  hGroup.position.set(0, 4.18, 0);
  g.add(hGroup);

  const headForm = mkMesh(new THREE.SphereGeometry(1.52, 32, 24), linerMat);
  headForm.scale.set(0.84, 1.06, 0.94);
  headForm.position.set(0, -0.22, 0.12);
  hGroup.add(headForm);

  const neckForm = mkMesh(new THREE.CylinderGeometry(0.68, 0.78, 1.25, 24), linerMat);
  neckForm.position.set(0, -1.68, -0.08);
  hGroup.add(neckForm);

  // =========================================================================
  // 2. CANGKANG KOMPOSIT HGU-55/P HMCS ABU-ABU MATTE (SESUAI 4 SUDUT REFERENSI)
  // =========================================================================
  const shellGeo = new THREE.SphereGeometry(2.14, 60, 44, 0, Math.PI * 2, 0, Math.PI * 0.76);
  const posAttr = shellGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    let x = posAttr.getX(i);
    let y = posAttr.getY(i);
    let z = posAttr.getZ(i);

    // Proporsi autentik HGU-55/P: kubah halus, belakang sedikit memanjang, sisi telinga membulat lebar
    z *= z < 0 ? 1.1 : 1.02;
    x *= 0.95 + 0.1 * smoothstep(0.85, -0.85, y);

    // Tonjolan organik earcup di sisi kiri & kanan bawah (khas Tampak Depan & Belakang referensi!)
    const earMask =
      smoothstep(1.1, 1.85, Math.abs(x)) *
      smoothstep(0.65, -0.25, y) *
      smoothstep(-1.45, -0.1, z) *
      smoothstep(1.15, 0.1, z);
    x += Math.sign(x) * earMask * 0.18;

    // Bukaan wajah melengkung rapi di depan (+Z)
    if (z > 0.62 && y < 0.78) {
      const faceCut = smoothstep(0.62, 1.58, z) * smoothstep(0.78, -0.25, y);
      z -= faceCut * 0.68;
      y += faceCut * 0.36;
    }

    // Lekukan pelindung tengkuk di belakang
    if (z < -0.65 && y < -0.3) {
      y -= smoothstep(-0.65, -1.65, z) * 0.22;
    }

    posAttr.setXYZ(i, x, y, z);
  }
  shellGeo.computeVertexNormals();
  hGroup.add(mkMesh(shellGeo, shellMat));

  // Visor Cover / Dahi Komposit Abu-Abu Rendah (Low-Profile Brow Housing sesuai referensi)
  const browGeo = new THREE.SphereGeometry(2.2, 44, 18, -Math.PI * 0.39, Math.PI * 0.78, Math.PI * 0.17, Math.PI * 0.19);
  const browCover = mkMesh(browGeo, shellMat);
  browCover.rotation.y = Math.PI / 2;
  browCover.position.set(0, 0.04, 0.04);
  hGroup.add(browCover);

  // List karet hitam di tepi dahi visor cover & sepanjang tepi bukaan wajah
  const browRim = mkMesh(new THREE.TorusGeometry(2.19, 0.055, 10, 42, Math.PI * 0.76), rubberTrimMat);
  browRim.rotation.x = Math.PI / 2 - 0.14;
  browRim.rotation.z = -Math.PI * 0.38;
  browRim.position.set(0, 0.92, 0.14);
  hGroup.add(browRim);

  const edgeBead = mkMesh(new THREE.TorusGeometry(1.86, 0.075, 12, 48, Math.PI * 1.24), rubberTrimMat);
  edgeBead.rotation.set(0.32, 0, -Math.PI * 0.12);
  edgeBead.position.set(0, -0.18, 0.78);
  hGroup.add(edgeBead);

  // =========================================================================
  // 3. INNER LINER, BANTALAN NYAMAN & AKSEN KUNING DALAM (TAMPAK DALAM)
  // =========================================================================
  const innerLinerMat = linerMat.clone();
  innerLinerMat.side = THREE.BackSide;
  const innerLiner = mkMesh(new THREE.SphereGeometry(1.96, 36, 24, 0, Math.PI * 2, 0, Math.PI * 0.72), innerLinerMat);
  innerLiner.scale.set(0.94, 0.96, 1.02);
  hGroup.add(innerLiner);

  for (const s of [1, -1] as const) {
    // Bantalan telinga & pipi bagian dalam
    const innerPad = mkMesh(new THREE.BoxGeometry(0.24, 0.72, 0.82), padYellowMat);
    innerPad.position.set(s * 1.72, -0.42, -0.12);
    hGroup.add(innerPad);

    // Soket rel visor bundar hitam di pelipis (khas foto referensi!)
    const templeKnob = mkMesh(new THREE.CylinderGeometry(0.28, 0.32, 0.22, 24), matteBlackMat);
    templeKnob.rotation.z = Math.PI / 2;
    templeKnob.position.set(s * 1.98, 0.56, 0.72);
    hGroup.add(templeKnob);

    const templeRing = mkMesh(new THREE.TorusGeometry(0.24, 0.04, 10, 24), darkMetalMat);
    templeRing.rotation.y = Math.PI / 2;
    templeRing.position.set(s * 2.09, 0.56, 0.72);
    hGroup.add(templeRing);

    // Sensor optik & baut pengunci samping-belakang (sesuai Tampak Samping & Belakang referensi!)
    for (const [bx, by, bz, r] of [
      [s * 2.06, -0.12, -0.22, 0.12],
      [s * 1.96, -0.58, -0.58, 0.11],
      [s * 1.65, 0.38, -1.28, 0.08],
      [s * 1.15, -0.78, -1.68, 0.09],
    ]) {
      const bolt = mkMesh(new THREE.CylinderGeometry(r, r * 1.1, 0.14, 16), matteBlackMat);
      bolt.rotation.z = Math.PI / 2;
      bolt.rotation.y = s * -0.45;
      bolt.position.set(bx, by, bz);
      hGroup.add(bolt);
    }

    // Bayonet Receiver hitam-logam di pipi helm untuk kaitan masker oksigen
    const bayoPlate = mkMesh(new THREE.BoxGeometry(0.24, 0.56, 0.64), matteBlackMat);
    bayoPlate.position.set(s * 1.72, -0.72, 1.06);
    bayoPlate.rotation.y = s * -0.48;
    hGroup.add(bayoPlate);

    const bayoClip = mkMesh(new THREE.BoxGeometry(0.14, 0.32, 0.36), metalMat);
    bayoClip.position.set(s * 1.82, -0.72, 1.12);
    bayoClip.rotation.y = s * -0.48;
    hGroup.add(bayoClip);
  }

  // Pelindung karet tengkuk belakang & kabel interkom HMCS
  const napePad = mkMesh(new THREE.BoxGeometry(1.55, 0.42, 0.24), rubberTrimMat);
  napePad.position.set(0, -1.28, -2.02);
  napePad.rotation.x = 0.22;
  hGroup.add(napePad);

  const commCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.32, -1.18, -1.25),
    new THREE.Vector3(-1.62, -1.95, -1.08),
    new THREE.Vector3(-1.58, -2.85, -0.68),
    new THREE.Vector3(-1.35, -3.65, -0.28),
  ]);
  hGroup.add(mkMesh(new THREE.TubeGeometry(commCurve, 28, 0.06, 10, false), rubberTrimMat));

  // =========================================================================
  // 4. VISOR HMCS LEBAR GELAP-IRIDESCENT + PROYEKSI HUD HIJAU NYATA
  // =========================================================================
  const visorPivot = new THREE.Group();
  visorPivot.name = 'helmet-visor-pivot';
  visorPivot.position.set(0, 0.16, 0.14);
  hGroup.add(visorPivot);

  const buildNotchedVisorGeo = (radius: number) => {
    const geo = new THREE.SphereGeometry(radius, 48, 28, -Math.PI * 0.4, Math.PI * 0.8, Math.PI * 0.27, Math.PI * 0.3);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      let y = p.getY(i);
      const z = p.getZ(i);
      // Lekukan hidung melengkung pas di atas jembatan hidung masker MBU-20/P
      if (y < 0.02 && Math.abs(z) < 0.62) {
        const notch = Math.cos((z / 0.62) * (Math.PI / 2));
        y += notch * 0.34 * smoothstep(0.02, -0.52, y);
      }
      p.setXYZ(i, x, y, z);
    }
    geo.computeVertexNormals();
    return geo;
  };

  const darkVisor = mkMesh(buildNotchedVisorGeo(2.14), darkVisorMat);
  darkVisor.rotation.y = Math.PI / 2;
  darkVisor.name = 'gsuit-visor';
  visorPivot.add(darkVisor);

  // Proyeksi HMCS HUD Hijau (350 000 010 • 420 • 12,500 • Reticle) tepat di permukaan visor!
  const hudGeo = new THREE.SphereGeometry(2.155, 36, 20, -Math.PI * 0.28, Math.PI * 0.56, Math.PI * 0.31, Math.PI * 0.21);
  const hudMesh = mkMesh(hudGeo, hudProjMat);
  hudMesh.rotation.y = Math.PI / 2;
  visorPivot.add(hudMesh);

  // Pivot dummy kecil agar animasi HMDS tetap mulus tanpa NVG menonjol
  const nvgPivot = new THREE.Group();
  nvgPivot.name = 'helmet-nvg-pivot';
  hGroup.add(nvgPivot);

  // =========================================================================
  // 5. MASKER OKSIGEN MBU-20/P REALISTIS + KATUP + STRAP + SELANG BERULIR
  // =========================================================================
  const maskGeo = buildLoftGeometry(
    Array.from({ length: 18 }, (_, i) => {
      const u = i / 17;
      const z = lerp(1.08, 2.48, u);
      const rx = lerp(1.02, 0.44, Math.pow(u, 0.78));
      const ry = lerp(0.96, 0.44, Math.pow(u, 0.78));
      const cy = lerp(-0.56, -1.04, u);
      return {
        z,
        point: (th) => {
          const s = Math.sin(th);
          const c = Math.cos(th);
          // Punggung hidung segitiga-teardrop autentik MBU-20/P
          const topPinch = c > 0 ? 1 - 0.38 * c * (1 - u * 0.45) : 1;
          return [s * rx * topPinch, cy + c * ry];
        },
      };
    }),
    36,
    true,
    false,
  );
  hGroup.add(mkMesh(maskGeo, maskSiliconeMat));

  // Cangkang keras & kubah katup regulator depan (sesuai detail Oxygen Mask di kanan referensi)
  const hardCover = mkMesh(new THREE.CylinderGeometry(0.48, 0.76, 0.86, 28), matteBlackMat);
  hardCover.rotation.x = Math.PI / 2.2;
  hardCover.position.set(0, -0.92, 1.98);
  hGroup.add(hardCover);

  // Dua pod regulator/mikrofon bundar di sisi pipi bawah masker (khas foto referensi!)
  for (const s of [1, -1] as const) {
    const pod = mkMesh(new THREE.SphereGeometry(0.28, 20, 16), maskSiliconeMat);
    pod.scale.set(1.0, 0.92, 0.85);
    pod.position.set(s * 0.56, -1.06, 2.12);
    hGroup.add(pod);

    const podCap = mkMesh(new THREE.CylinderGeometry(0.14, 0.16, 0.12, 16), darkMetalMat);
    podCap.rotation.x = Math.PI / 2;
    podCap.rotation.z = s * -0.4;
    podCap.position.set(s * 0.64, -1.06, 2.28);
    hGroup.add(podCap);
  }

  const valveHousing = mkMesh(new THREE.CylinderGeometry(0.36, 0.42, 0.34, 24), darkMetalMat);
  valveHousing.rotation.x = Math.PI / 2.12;
  valveHousing.position.set(0, -1.16, 2.44);
  hGroup.add(valveHousing);

  const valveDisc = mkMesh(new THREE.CylinderGeometry(0.24, 0.27, 0.14, 20), metalMat);
  valveDisc.rotation.x = Math.PI / 2.12;
  valveDisc.position.set(0, -1.22, 2.58);
  hGroup.add(valveDisc);

  // Strap pengikat ganda dari kedua sisi masker ke bayonet receiver helm (sesuai foto referensi!)
  for (const s of [1, -1] as const) {
    const upperStrap = new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * 0.58, -0.82, 2.08),
      new THREE.Vector3(s * 1.24, -0.74, 1.72),
      new THREE.Vector3(s * 1.72, -0.72, 1.12),
    ]);
    hGroup.add(mkMesh(new THREE.TubeGeometry(upperStrap, 18, 0.082, 10, false), rubberTrimMat));

    const lowerStrap = new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * 0.52, -1.16, 1.96),
      new THREE.Vector3(s * 1.18, -1.02, 1.62),
      new THREE.Vector3(s * 1.68, -0.82, 1.06),
    ]);
    hGroup.add(mkMesh(new THREE.TubeGeometry(lowerStrap, 16, 0.055, 8, false), matteBlackMat));
  }

  // Selang Oksigen OBOGS berulir 30 ruas melengkung rapi turun ke dada depan-kanan (seperti foto referensi!)
  const o2Curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -1.24, 2.48),
    new THREE.Vector3(0.18, -1.96, 2.44),
    new THREE.Vector3(0.48, -2.76, 2.08),
    new THREE.Vector3(0.76, -3.45, 1.56),
    new THREE.Vector3(0.88, -3.92, 1.12),
  ]);
  hGroup.add(mkMesh(new THREE.TubeGeometry(o2Curve, 56, 0.22, 16, false), hoseMat));

  for (let i = 1; i < 30; i++) {
    const pt = o2Curve.getPoint(i / 30);
    const tan = o2Curve.getTangent(i / 30);
    const rib = mkMesh(new THREE.TorusGeometry(0.245, 0.046, 8, 20), darkMetalMat);
    rib.position.copy(pt);
    rib.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan);
    hGroup.add(rib);
  }

  const obogsEnd = mkMesh(new THREE.CylinderGeometry(0.26, 0.28, 0.46, 20), metalMat);
  obogsEnd.position.set(0.9, -3.98, 1.06);
  obogsEnd.rotation.x = 0.58;
  hGroup.add(obogsEnd);

  return {
    group: g,
    nozzles: [],
    spinners: [],
    navLights: [
      { pos: [2.42, 0.26, 0], color: '#4da6ff' },
      { pos: [-2.42, 0.26, 0], color: '#4da6ff' },
    ],
    glowMats,
    hoverHeight: 0,
  };
}
