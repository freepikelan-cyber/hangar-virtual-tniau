import * as THREE from 'three';
import {
  addDecal,
  buildAirfoilSurface,
  buildLoftGeometry,
  lerp,
  mkMesh,
  smoothstep,
  type AirfoilSection,
} from './aeroGeo';
import { camoTexture, flagTexture, panelBumpTexture, roundelTexture, textTexture } from './textures';
import type { BuildResult, V3 } from './proceduralBuilder';

/* =========================================================================
 * Builder 3D Detail Tinggi: Sukhoi Su-30MK2 Flanker-C TNI AU (TS-3005)
 * Skadron Udara 11 "Thunder" — Lanud Sultan Hasanuddin, Makassar
 * Konvensi: Hidung +Z, Atas +Y, Roda menapak y = 0, Panjang ~14.4 unit.
 * ========================================================================= */

/**
 * Penampang badan utama Su-30MK2 yang presisi:
 * - Radome ogive panjang menukik elegan (z = 5.0 .. 7.25)
 * - Forebody & kokpit tandem mulus (z = 2.0 .. 5.0)
 * - Dorsal spine mengalir RATA dari belakang kanopi lalu melandai halus ke belakang (tanpa undakan)
 * - Blended LERX / strake lebar pipih yang menyatu sempurna ke pangkal sayap
 * - Central tail stinger ramping di antara kedua mesin (z = -3.8 .. -7.15)
 */
function su30CrossSection(z: number, theta: number, yCenter: number): [number, number] {
  const sinT = Math.sin(theta);
  const cosT = Math.cos(theta);

  let rx = 0.68;
  let ryTop = 0.44;
  let ryBot = 0.3;
  let yShift = 0;

  if (z >= 5.05) {
    // Radome ogive panjang khas Flanker, menukik halus ke depan
    const t = Math.max(0, Math.min(1, (7.25 - z) / (7.25 - 5.05)));
    const r = Math.pow(t, 0.72) * 0.49;
    rx = r * 1.04;
    ryTop = r * 0.94;
    ryBot = r * 0.9;
    yShift = -0.36 * Math.pow(1 - t, 1.3) - 0.14;
  } else if (z >= 2.2) {
    // Forebody kokpit tandem
    const t = (5.05 - z) / (5.05 - 2.2);
    rx = lerp(0.51, 0.78, smoothstep(0, 1, t));
    ryTop = lerp(0.46, 0.5, smoothstep(0, 1, t));
    ryBot = lerp(0.44, 0.34, smoothstep(0, 1, t));
    yShift = lerp(-0.14, 0.02, smoothstep(0, 1, t));
  } else if (z >= -3.6) {
    // Badan tengah pipih lebar (lifting body), melandai halus ke belakang
    const t = (2.2 - z) / (2.2 - -3.6);
    rx = lerp(0.78, 0.66, t);
    ryTop = lerp(0.5, 0.34, t);
    ryBot = lerp(0.34, 0.22, t);
    yShift = lerp(0.02, -0.06, t);
  } else {
    // Central tail stinger khas Flanker di antara dua mesin belakang
    const t = Math.max(0, Math.min(1, (-3.6 - z) / (-3.6 - -7.15)));
    rx = lerp(0.46, 0.1, smoothstep(0, 1, t));
    ryTop = lerp(0.32, 0.12, smoothstep(0, 1, t));
    ryBot = lerp(0.2, 0.1, smoothstep(0, 1, t));
    yShift = lerp(-0.06, -0.14, t);
  }

  // Wide blended LERX (leading edge root extension) pipih & lebar menyatu ke sayap
  let lerx = 0;
  if (z < 4.7 && z > -4.2) {
    const fwd = smoothstep(4.7, 0.7, z);
    const aft = smoothstep(-4.2, -2.5, z);
    const sideMask = Math.pow(Math.abs(sinT), 2.0) * Math.exp(-Math.pow((cosT + 0.08) * 4.5, 2));
    lerx = 0.96 * fwd * aft * sideMask;
  }

  // Dorsal spine: puncak mulus di belakang kanopi (z ~ 1.8, y ~ 2.42) lalu melandai halus ke belakang
  let spine = 0;
  if (z < 2.25 && z > -4.6) {
    const rise = smoothstep(2.25, 1.55, z);
    const taper = smoothstep(-4.6, 1.55, z);
    const topMask = cosT > 0 ? Math.pow(cosT, 3.6) : 0;
    spine = 0.24 * rise * Math.pow(taper, 0.85) * topMask;
  }

  const x = sinT * (rx + lerx);
  const ry = cosT >= 0 ? ryTop : ryBot;
  const y = yCenter + yShift + cosT * ry + spine;
  return [x, y];
}

/** Tekstur kamuflase 3 nada Flanker TNI AU (atas: biru-abu 3 warna, bawah: biru langit pucat). */
function su30LiveryTexture() {
  const W = 1024;
  const H = 1024;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;

  const camo = camoTexture(
    '#7c97b0',
    [
      { c: '#4b6682', n: 15, r: 66 },
      { c: '#b8c8d6', n: 12, r: 48 },
      { c: '#384e66', n: 6, r: 36 },
    ],
    3005,
    { noise: 0.03 },
  );
  ctx.drawImage(camo.image as HTMLCanvasElement, 0, 0, W, H);
  camo.dispose();

  // Perut pesawat: biru-abu pucat khas Sukhoi
  const gradL = ctx.createLinearGradient(W * 0.28, 0, W * 0.39, 0);
  gradL.addColorStop(0, 'rgba(170, 194, 212, 0)');
  gradL.addColorStop(1, 'rgba(170, 194, 212, 0.96)');
  ctx.fillStyle = gradL;
  ctx.fillRect(W * 0.28, 0, W * 0.11, H);

  ctx.fillStyle = '#aac2d4';
  ctx.fillRect(W * 0.39, 0, W * 0.22, H);

  const gradR = ctx.createLinearGradient(W * 0.61, 0, W * 0.72, 0);
  gradR.addColorStop(0, 'rgba(170, 194, 212, 0.96)');
  gradR.addColorStop(1, 'rgba(170, 194, 212, 0)');
  ctx.fillStyle = gradR;
  ctx.fillRect(W * 0.61, 0, W * 0.11, H);

  ctx.strokeStyle = 'rgba(18, 26, 36, 0.14)';
  ctx.lineWidth = 1.4;
  for (let y = 0; y < H; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

/** Rudal Rusia: R-73 (Archer), R-77 (Adder), R-27 (Alamo), atau rudal anti-kapal Kh-31A. */
function buildRussianMissile(
  group: THREE.Group,
  kind: 'r73' | 'r77' | 'r27' | 'kh31',
  pos: V3,
  mats: { white: THREE.Material; dark: THREE.Material; red: THREE.Material; metal: THREE.Material },
) {
  const m = new THREE.Group();
  m.position.set(...pos);

  const spec = {
    r73: { len: 2.3, r: 0.064 },
    r77: { len: 2.8, r: 0.078 },
    r27: { len: 3.25, r: 0.09 },
    kh31: { len: 3.55, r: 0.125 },
  }[kind];

  const body = mkMesh(new THREE.CylinderGeometry(spec.r, spec.r, spec.len, 16), mats.white);
  body.rotation.x = Math.PI / 2;
  m.add(body);

  const nose = mkMesh(
    kind === 'r73' ? new THREE.SphereGeometry(spec.r, 14, 10) : new THREE.ConeGeometry(spec.r, spec.r * 3.8, 16),
    kind === 'r73' ? mats.dark : mats.white,
  );
  if (kind !== 'r73') nose.rotation.x = Math.PI / 2;
  nose.position.z = spec.len / 2 + (kind === 'r73' ? 0 : spec.r * 1.9);
  m.add(nose);

  const band = mkMesh(new THREE.CylinderGeometry(spec.r * 1.02, spec.r * 1.02, 0.1, 16), mats.red);
  band.rotation.x = Math.PI / 2;
  band.position.z = spec.len * 0.25;
  m.add(band);

  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const fRear = mkMesh(new THREE.BoxGeometry(0.014, spec.r * 3.4, 0.34), mats.dark);
    fRear.position.set(Math.cos(a) * spec.r * 1.75, Math.sin(a) * spec.r * 1.75, -spec.len / 2 + 0.24);
    fRear.rotation.z = a - Math.PI / 2;
    m.add(fRear);

    if (kind === 'r27') {
      const fMid = mkMesh(new THREE.BoxGeometry(0.015, spec.r * 4.0, 0.48), mats.white);
      fMid.position.set(Math.cos(a) * spec.r * 1.95, Math.sin(a) * spec.r * 1.95, 0.25);
      fMid.rotation.z = a - Math.PI / 2;
      m.add(fMid);
    } else if (kind === 'kh31') {
      const intake = mkMesh(new THREE.CylinderGeometry(0.042, 0.042, 1.3, 10), mats.metal);
      intake.rotation.x = Math.PI / 2;
      intake.position.set(Math.cos(a) * spec.r * 1.12, Math.sin(a) * spec.r * 1.12, -0.35);
      m.add(intake);
    } else {
      const fFront = mkMesh(new THREE.BoxGeometry(0.012, spec.r * 2.2, 0.2), mats.dark);
      fFront.position.set(Math.cos(a) * spec.r * 1.35, Math.sin(a) * spec.r * 1.35, spec.len * 0.32);
      fFront.rotation.z = a - Math.PI / 2;
      m.add(fFront);
    }
  }

  group.add(m);
}

/** Roda pendarat Su-30MK2 detail (roda depan ganda + mudguard, roda utama besar). */
function buildSu30Gear(
  group: THREE.Group,
  mats: { strut: THREE.Material; tire: THREE.Material; dark: THREE.Material; belly: THREE.Material; light: THREE.Material },
) {
  const nz = 4.05;
  const nr = 0.24;
  const nStrut = mkMesh(new THREE.CylinderGeometry(0.055, 0.048, 1.1, 14), mats.strut);
  nStrut.position.set(0, nr + 0.54, nz);
  nStrut.rotation.x = -0.06;
  group.add(nStrut);

  const nBrace = mkMesh(new THREE.CylinderGeometry(0.028, 0.028, 0.85, 10), mats.strut);
  nBrace.position.set(0, 0.84, nz - 0.35);
  nBrace.rotation.x = -0.65;
  group.add(nBrace);

  const mudguard = mkMesh(new THREE.BoxGeometry(0.46, 0.03, 0.42), mats.dark);
  mudguard.position.set(0, nr * 2 + 0.06, nz - 0.14);
  mudguard.rotation.x = 0.25;
  group.add(mudguard);

  for (const s of [1, -1]) {
    const lamp = mkMesh(new THREE.CylinderGeometry(0.04, 0.04, 0.04, 12), mats.light);
    lamp.rotation.x = Math.PI / 2;
    lamp.position.set(s * 0.08, 0.64, nz + 0.06);
    group.add(lamp);

    const tire = mkMesh(new THREE.CylinderGeometry(nr, nr, 0.13, 24), mats.tire);
    tire.rotation.z = Math.PI / 2;
    tire.position.set(s * 0.14, nr, nz);
    const hub = mkMesh(new THREE.CylinderGeometry(nr * 0.54, nr * 0.54, 0.145, 16), mats.strut);
    hub.rotation.z = Math.PI / 2;
    hub.position.copy(tire.position);
    group.add(tire, hub);

    const door = mkMesh(new THREE.BoxGeometry(0.03, 0.42, 1.1), mats.belly);
    door.position.set(s * 0.32, 0.9, nz - 0.25);
    door.rotation.z = s * 0.12;
    group.add(door);
  }

  const mr = 0.38;
  const mz = -1.25;
  for (const s of [1, -1]) {
    const wx = s * 1.68;
    const strut = mkMesh(new THREE.CylinderGeometry(0.065, 0.056, 1.05, 14), mats.strut);
    strut.position.set(wx - s * 0.06, mr + 0.52, mz);
    strut.rotation.z = s * 0.08;
    group.add(strut);

    const brace = mkMesh(new THREE.CylinderGeometry(0.032, 0.032, 0.95, 10), mats.strut);
    brace.position.set(wx - s * 0.34, 0.88, mz + 0.22);
    brace.rotation.z = s * -0.58;
    group.add(brace);

    const door = mkMesh(new THREE.BoxGeometry(0.03, 0.52, 1.2), mats.belly);
    door.position.set(wx + s * 0.24, 0.96, mz);
    door.rotation.z = s * -0.1;
    group.add(door);

    const tire = mkMesh(new THREE.CylinderGeometry(mr, mr, 0.28, 28), mats.tire);
    tire.rotation.z = Math.PI / 2;
    tire.position.set(wx, mr, mz);
    const hub = mkMesh(new THREE.CylinderGeometry(mr * 0.52, mr * 0.52, 0.295, 18), mats.strut);
    hub.rotation.z = Math.PI / 2;
    hub.position.copy(tire.position);
    group.add(tire, hub);
  }
}

export function buildDetailedSu30(): BuildResult {
  const g = new THREE.Group();
  const yC = 1.72;

  const camoWing = camoTexture(
    '#7c97b0',
    [
      { c: '#4b6682', n: 15, r: 64 },
      { c: '#b8c8d6', n: 11, r: 46 },
      { c: '#384e66', n: 6, r: 34 },
    ],
    3005,
    { noise: 0.03 },
  );
  const bump = panelBumpTexture(3005);

  const cloneRep = (tex: THREE.Texture, rx: number, ry: number) => {
    const t = tex.clone();
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    t.needsUpdate = true;
    return t;
  };

  const fuseMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    map: su30LiveryTexture(),
    bumpMap: cloneRep(bump, 2.4, 4.8),
    bumpScale: 0.016,
    metalness: 0.5,
    roughness: 0.44,
  });

  const wingMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    map: cloneRep(camoWing, 1.5, 1.5),
    bumpMap: cloneRep(bump, 1.8, 1.8),
    bumpScale: 0.014,
    metalness: 0.52,
    roughness: 0.42,
  });

  const radomeMat = new THREE.MeshStandardMaterial({
    color: '#dce2e8',
    metalness: 0.18,
    roughness: 0.48,
  });

  const bellyMat = new THREE.MeshStandardMaterial({
    color: '#a8c0d2',
    bumpMap: cloneRep(bump, 1.4, 2.0),
    bumpScale: 0.012,
    metalness: 0.46,
    roughness: 0.46,
  });

  const burntTitaniumMat = new THREE.MeshStandardMaterial({
    color: '#6b6772',
    bumpMap: cloneRep(bump, 1.2, 1.2),
    bumpScale: 0.015,
    metalness: 0.9,
    roughness: 0.24,
  });

  const darkMetal = new THREE.MeshStandardMaterial({ color: '#2b3038', metalness: 0.85, roughness: 0.32 });
  const intakeInnerMat = new THREE.MeshStandardMaterial({ color: '#080c11', metalness: 0.2, roughness: 0.9, side: THREE.DoubleSide });
  const frameMat = new THREE.MeshStandardMaterial({ color: '#1b2026', metalness: 0.5, roughness: 0.45 });
  const canopyGlassMat = new THREE.MeshPhysicalMaterial({
    color: '#8bb8d6',
    metalness: 0.14,
    roughness: 0.04,
    transparent: true,
    opacity: 0.48,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    iridescence: 0.3,
    envMapIntensity: 2.0,
    side: THREE.DoubleSide,
  });
  const gearStrutMat = new THREE.MeshStandardMaterial({ color: '#c4cdd6', metalness: 0.72, roughness: 0.3 });
  const tireMat = new THREE.MeshStandardMaterial({ color: '#141619', metalness: 0.06, roughness: 0.92 });
  const pylonMat = new THREE.MeshStandardMaterial({ color: '#7e90a2', metalness: 0.5, roughness: 0.45 });
  const missileWhite = new THREE.MeshStandardMaterial({ color: '#eaedf0', metalness: 0.3, roughness: 0.42 });
  const missileRed = new THREE.MeshStandardMaterial({ color: '#dc2626', metalness: 0.25, roughness: 0.45 });
  const hudGlassMat = new THREE.MeshBasicMaterial({ color: '#34f5c5', transparent: true, opacity: 0.48, side: THREE.DoubleSide });
  const mfdGlowMat = new THREE.MeshBasicMaterial({ color: '#22c55e' });
  const taxiLightMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff6d6', emissiveIntensity: 1.6 });
  const internalMat = new THREE.MeshStandardMaterial({ color: '#4fa3c7', metalness: 0.7, roughness: 0.35 });
  const coreMat = new THREE.MeshStandardMaterial({ color: '#c47a3c', metalness: 0.85, roughness: 0.3 });
  const glowMat = new THREE.MeshStandardMaterial({
    color: '#261208',
    metalness: 0.6,
    roughness: 0.4,
    emissive: new THREE.Color('#ff6a1a'),
    emissiveIntensity: 0,
  });

  // =========================================================================
  // 1. BADAN UTAMA BLENDED WING-BODY + RADOME PUTIH-ABU + SENSOR IRST
  // =========================================================================
  const bodyZs: number[] = [];
  for (let i = 0; i <= 62; i++) bodyZs.push(-7.15 + (12.23 * i) / 62); // -7.15 .. +5.08
  const fuseMesh = mkMesh(
    buildLoftGeometry(
      bodyZs.map((z) => ({ z, point: (th) => su30CrossSection(z, th, yC) })),
      64,
      false,
      true,
    ),
    fuseMat,
  );
  g.add(fuseMesh);

  // Radome hidung putih-abu (z = 5.05 .. 7.25)
  const radomeZs: number[] = [];
  for (let i = 0; i <= 24; i++) radomeZs.push(5.05 + (2.2 * i) / 24);
  g.add(
    mkMesh(
      buildLoftGeometry(
        radomeZs.map((z) => ({ z, point: (th) => su30CrossSection(z, th, yC) })),
        48,
      ),
      radomeMat,
    ),
  );

  // Pitot boom panjang di ujung radome
  const pitot = mkMesh(new THREE.CylinderGeometry(0.008, 0.02, 0.85, 10), darkMetal);
  pitot.rotation.x = Math.PI / 2;
  pitot.position.set(0, yC - 0.5, 7.66);
  g.add(pitot);

  // Sensor elektro-optik IRST / OLS-30 (sedikit ke kanan di depan kaca kokpit)
  const irstBase = mkMesh(new THREE.CylinderGeometry(0.075, 0.095, 0.14, 16), darkMetal);
  irstBase.position.set(0.14, 2.02, 4.96);
  const irstBall = mkMesh(new THREE.SphereGeometry(0.08, 16, 14), canopyGlassMat, 'glass');
  irstBall.position.set(0.14, 2.1, 5.0);
  g.add(irstBase, irstBall);

  // =========================================================================
  // 2. NACELLE MESIN KEMBAR, INTAKE MIRING 28°, & TAIL BOOM PENYAMBUNG EKOR
  // =========================================================================
  for (const s of [1, -1]) {
    const nx = s * 0.88;
    const ny = 1.32;

    // Saluran intake kotak di bawah LERX dengan mulut miring (raked 28° seperti Flanker asli)
    const intakeDuct = mkMesh(
      buildLoftGeometry(
        Array.from({ length: 16 }, (_, i) => {
          const u = i / 15; // 0 belakang (z=0.4) -> 1 depan (z=2.85)
          const z = lerp(0.4, 2.85, u);
          const hw = lerp(0.45, 0.37, u);
          const hh = lerp(0.38, 0.3, u);
          const yc = lerp(ny, ny - 0.14, u);
          return {
            z,
            point: (th) => {
              const cs = Math.cos(th);
              const sn = Math.sin(th);
              const px = Math.sign(sn) * Math.pow(Math.abs(sn), 0.5) * hw;
              const py = Math.sign(cs) * Math.pow(Math.abs(cs), 0.5) * hh;
              return [nx + px, yc + py];
            },
          };
        }),
        36,
      ),
      bellyMat,
    );
    g.add(intakeDuct);

    // Bibir intake atas menonjol lebih maju (profil raked 28° khas Su-30) + rongga gelap miring
    const hoodTop = mkMesh(new THREE.BoxGeometry(0.76, 0.055, 0.56), bellyMat);
    hoodTop.position.set(nx, ny + 0.14, 2.98);
    const sideWallOut = mkMesh(new THREE.BoxGeometry(0.05, 0.56, 0.44), bellyMat);
    sideWallOut.position.set(nx + s * 0.36, ny - 0.14, 2.86);
    sideWallOut.rotation.x = 0.42;
    const sideWallIn = mkMesh(new THREE.BoxGeometry(0.05, 0.56, 0.44), bellyMat);
    sideWallIn.position.set(nx - s * 0.36, ny - 0.14, 2.86);
    sideWallIn.rotation.x = 0.42;
    const mouth = mkMesh(new THREE.PlaneGeometry(0.68, 0.62), intakeInnerMat);
    mouth.position.set(nx, ny - 0.14, 2.92);
    mouth.rotation.x = -0.45;
    g.add(hoodTop, sideWallOut, sideWallIn, mouth);

    // Nacelle mesin belakang (z = -5.1 .. +0.45)
    const nacMesh = mkMesh(
      buildLoftGeometry(
        Array.from({ length: 20 }, (_, i) => {
          const z = lerp(-5.1, 0.45, i / 19);
          const r = z < -3.6 ? lerp(0.46, 0.42, (-3.6 - z) / 1.5) : 0.46;
          return {
            z,
            point: (th) => [nx + Math.sin(th) * r, ny + Math.cos(th) * r * 0.96],
          };
        }),
        36,
      ),
      bellyMat,
    );
    g.add(nacMesh);

    // TAIL BOOM PENYAMBUNG EKOR (menyatu di sisi luar nacelle, menopang ekor tegak & stabilator!)
    const boomX = s * 1.32;
    const boomMesh = mkMesh(
      buildLoftGeometry(
        Array.from({ length: 18 }, (_, i) => {
          const u = i / 17; // 0 belakang (z=-6.55) -> 1 depan (z=-2.8)
          const z = lerp(-6.55, -2.8, u);
          const hw = lerp(0.11, 0.32, Math.pow(u, 0.65));
          const hh = lerp(0.14, 0.28, Math.pow(u, 0.65));
          const yc = lerp(1.36, 1.52, u);
          return {
            z,
            point: (th) => [boomX + Math.sin(th) * hw, yc + Math.cos(th) * hh],
          };
        }),
        28,
        false,
        true,
      ),
      wingMat,
    );
    g.add(boomMesh);

    // Shroud panel titanium/baja bakar ekspos (z = -6.28 .. -5.08)
    const shroud = mkMesh(new THREE.CylinderGeometry(0.42, 0.4, 1.22, 32), burntTitaniumMat);
    shroud.rotation.x = Math.PI / 2;
    shroud.position.set(nx, ny, -5.68);
    g.add(shroud);

    // Nozzle AL-31F 16 kelopak
    const nozZ = -6.28;
    const nozInner = mkMesh(new THREE.CylinderGeometry(0.38, 0.33, 0.72, 28, 1, true), darkMetal);
    nozInner.rotation.x = Math.PI / 2;
    nozInner.position.set(nx, ny, nozZ - 0.34);
    g.add(nozInner);

    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const petal = mkMesh(new THREE.BoxGeometry(0.135, 0.022, 0.7), i % 2 === 0 ? burntTitaniumMat : darkMetal);
      petal.position.set(nx + Math.cos(a) * 0.37, ny + Math.sin(a) * 0.37, nozZ - 0.34);
      petal.rotation.z = a + Math.PI / 2;
      petal.rotateX(0.08);
      g.add(petal);
    }

    const flameFace = mkMesh(new THREE.CircleGeometry(0.33, 28), glowMat);
    flameFace.rotation.y = Math.PI;
    flameFace.position.set(nx, ny, nozZ - 0.15);
    g.add(flameFace);

    // Inti mesin internal (X-Ray)
    const shaft = mkMesh(new THREE.CylinderGeometry(0.11, 0.11, 5.8, 10), coreMat, 'internal');
    shaft.rotation.x = Math.PI / 2;
    shaft.position.set(nx, ny, -3.1);
    g.add(shaft);
    for (let i = 0; i < 6; i++) {
      const stage = mkMesh(new THREE.CylinderGeometry(0.33, 0.33, 0.22, 18), i >= 3 ? coreMat : internalMat, 'internal');
      stage.rotation.x = Math.PI / 2;
      stage.position.set(nx, ny, -0.6 - i * 0.95);
      g.add(stage);
    }
  }

  // =========================================================================
  // 3. KANOPI TANDEM 2 KURSI MULUS MENYATU KE DORSAL SPINE + KOKPIT GANDA
  // =========================================================================
  const canopyZs: number[] = [];
  for (let i = 0; i <= 32; i++) canopyZs.push(1.55 + (3.45 * i) / 32); // 1.55 .. 5.00
  const canopyGeo = buildLoftGeometry(
    canopyZs.map((z) => {
      const u = (z - 1.55) / 3.45; // 0 belakang (menyatu ke spine) -> 1 depan
      const arch = Math.sin(Math.pow(u, 0.72) * Math.PI);
      const w = 0.47 * Math.pow(arch, 0.55);
      const h = 0.62 * arch;
      // Ujung belakang duduk pas di spine (y ~ 2.22), depan turun mulus ke hidung (y ~ 2.02)
      const baseY = lerp(2.22, 2.0, u);
      return {
        z,
        point: (th) => {
          const a = (th / (Math.PI * 2)) * Math.PI - Math.PI / 2;
          return [Math.sin(a) * w, baseY + Math.cos(a) * h];
        },
      };
    }),
    36,
  );
  g.add(mkMesh(canopyGeo, canopyGlassMat, 'glass'));

  for (const s of [1, -1]) {
    const sill = mkMesh(new THREE.BoxGeometry(0.038, 0.038, 3.2), frameMat);
    sill.position.set(s * 0.44, 2.1, 3.35);
    g.add(sill);
  }
  const frontBow = mkMesh(new THREE.TorusGeometry(0.41, 0.026, 8, 24, Math.PI), frameMat);
  frontBow.position.set(0, 2.08, 4.3);
  frontBow.rotation.x = 0.36;
  const midBow = mkMesh(new THREE.TorusGeometry(0.44, 0.022, 8, 24, Math.PI), frameMat);
  midBow.position.set(0, 2.14, 3.25);
  g.add(frontBow, midBow);

  // Kokpit tandem (Pilot depan + WSO belakang lebih tinggi)
  const tub = mkMesh(new THREE.BoxGeometry(0.72, 0.24, 2.55), frameMat, 'cockpit');
  tub.position.set(0, 2.02, 3.45);
  const hud = mkMesh(new THREE.PlaneGeometry(0.2, 0.22), hudGlassMat, 'cockpit');
  hud.position.set(0, 2.32, 4.35);
  hud.rotation.x = -0.55;
  const mfd1 = mkMesh(new THREE.PlaneGeometry(0.26, 0.12), mfdGlowMat, 'cockpit');
  mfd1.position.set(0, 2.16, 4.24);
  mfd1.rotation.y = Math.PI;
  g.add(tub, hud, mfd1);

  for (const [sz, sy] of [
    [3.82, 2.06],
    [2.76, 2.18],
  ]) {
    const pan = mkMesh(new THREE.BoxGeometry(0.38, 0.09, 0.4), frameMat, 'cockpit');
    pan.position.set(0, sy, sz);
    const back = mkMesh(new THREE.BoxGeometry(0.36, 0.54, 0.1), frameMat, 'cockpit');
    back.position.set(0, sy + 0.25, sz - 0.2);
    back.rotation.x = -0.32;
    const head = mkMesh(new THREE.BoxGeometry(0.24, 0.17, 0.12), darkMetal, 'cockpit');
    head.position.set(0, sy + 0.5, sz - 0.27);
    g.add(pan, back, head);
  }

  // =========================================================================
  // 4. SAYAP UTAMA, CANARD, STABILATOR, EKOR TEGAK KEMBAR (MENYATU DI TAIL BOOM)
  // =========================================================================
  const wingSections: AirfoilSection[] = [
    { spanPos: 1.0, leZ: 1.4, teZ: -3.55, offset: 1.6, thick: 0.24 },
    { spanPos: 2.35, leZ: 0.25, teZ: -3.45, offset: 1.56, thick: 0.17 },
    { spanPos: 3.75, leZ: -1.05, teZ: -3.35, offset: 1.52, thick: 0.12 },
    { spanPos: 4.95, leZ: -2.18, teZ: -3.28, offset: 1.48, thick: 0.072 },
  ];
  const wingR = mkMesh(buildAirfoilSurface(wingSections, 'horizontal', 1, 0.08), wingMat);
  const wingL = mkMesh(buildAirfoilSurface(wingSections, 'horizontal', -1, 0.08), wingMat);
  g.add(wingR, wingL);

  // Sirip Canard ramping menempel mulus di sisi LERX
  const canardSections: AirfoilSection[] = [
    { spanPos: 0.72, leZ: 3.15, teZ: 2.15, offset: 1.76, thick: 0.075 },
    { spanPos: 1.82, leZ: 2.42, teZ: 2.0, offset: 1.82, thick: 0.038 },
  ];
  g.add(
    mkMesh(buildAirfoilSurface(canardSections, 'horizontal', 1, 0), wingMat),
    mkMesh(buildAirfoilSurface(canardSections, 'horizontal', -1, 0), wingMat),
  );

  // All-moving Horizontal Stabilators keluar dari sisi luar tail boom (x = 1.32)
  const stabSections: AirfoilSection[] = [
    { spanPos: 1.3, leZ: -4.45, teZ: -6.45, offset: 1.38, thick: 0.11 },
    { spanPos: 3.45, leZ: -5.9, teZ: -6.72, offset: 1.28, thick: 0.048 },
  ];
  g.add(
    mkMesh(buildAirfoilSurface(stabSections, 'horizontal', 1, 0), wingMat),
    mkMesh(buildAirfoilSurface(stabSections, 'horizontal', -1, 0), wingMat),
  );

  // Twin Vertical Stabilizers duduk KOKOH di atas tail boom (x = ±1.32, mulai y = 1.46)
  const finSections: AirfoilSection[] = [
    { spanPos: 1.46, leZ: -3.35, teZ: -6.38, offset: 0, thick: 0.16 },
    { spanPos: 1.95, leZ: -3.95, teZ: -6.4, offset: 0, thick: 0.14 },
    { spanPos: 3.1, leZ: -4.85, teZ: -6.44, offset: 0, thick: 0.1 },
    { spanPos: 4.32, leZ: -5.65, teZ: -6.46, offset: 0, thick: 0.06 },
  ];
  const finR = mkMesh(buildAirfoilSurface(finSections, 'vertical', 1, 0), wingMat);
  finR.position.x = 1.32;
  const finL = mkMesh(buildAirfoilSurface(finSections, 'vertical', 1, 0), wingMat);
  finL.position.x = -1.32;
  g.add(finR, finL);

  for (const s of [1, -1]) {
    const cap = mkMesh(new THREE.BoxGeometry(0.072, 0.11, 0.82), radomeMat);
    cap.position.set(s * 1.32, 4.34, -6.05);
    g.add(cap);

    // Sirip ventral bawah menempel langsung di bawah tail boom (x = ±1.32)
    const vf = mkMesh(
      buildAirfoilSurface(
        [
          { spanPos: 0, leZ: -4.2, teZ: -6.15, offset: 0, thick: 0.05 },
          { spanPos: -0.44, leZ: -4.75, teZ: -6.0, offset: 0, thick: 0.024 },
        ],
        'vertical',
        1,
        0,
      ),
      bellyMat,
    );
    vf.position.set(s * 1.32, 1.24, 0);
    vf.rotation.z = s * 0.24;
    g.add(vf);
  }

  // =========================================================================
  // 5. PERSENJATAAN KHAS TNI AU (R-73, R-77, Kh-31A, R-27 DI TEROWONGAN TENGAH)
  // =========================================================================
  const ordMats = { white: missileWhite, dark: darkMetal, red: missileRed, metal: burntTitaniumMat };

  for (const s of [1, -1]) {
    // Wingtip launcher + R-73 Archer
    const tipRail = mkMesh(new THREE.BoxGeometry(0.08, 0.085, 1.95), darkMetal);
    tipRail.position.set(s * 5.0, 1.48, -2.72);
    g.add(tipRail);
    buildRussianMissile(g, 'r73', [s * 5.08, 1.48, -2.5], ordMats);

    // Outer pylon + R-77 Adder
    const pOut = mkMesh(new THREE.BoxGeometry(0.068, 0.25, 1.25), pylonMat);
    pOut.position.set(s * 3.72, 1.36, -2.18);
    g.add(pOut);
    buildRussianMissile(g, 'r77', [s * 3.72, 1.18, -1.98], ordMats);

    // Inner wing heavy pylon + Kh-31A Anti-Ship Missile
    const pIn = mkMesh(new THREE.BoxGeometry(0.088, 0.3, 1.65), pylonMat);
    pIn.position.set(s * 2.48, 1.36, -1.5);
    g.add(pIn);
    buildRussianMissile(g, 'kh31', [s * 2.48, 1.08, -1.32], ordMats);
  }

  // Sepasang R-27 Alamo di terowongan tengah (centerline tandem) di antara dua mesin — bersih dari lantai!
  const pCenF = mkMesh(new THREE.BoxGeometry(0.07, 0.22, 1.3), pylonMat);
  pCenF.position.set(0, 1.3, 0.85);
  const pCenR = mkMesh(new THREE.BoxGeometry(0.07, 0.22, 1.3), pylonMat);
  pCenR.position.set(0, 1.28, -2.45);
  g.add(pCenF, pCenR);
  buildRussianMissile(g, 'r27', [0, 1.12, 0.95], ordMats);
  buildRussianMissile(g, 'r27', [0, 1.1, -2.35], ordMats);

  // =========================================================================
  // 6. RODA PENDARAT DETAIL
  // =========================================================================
  buildSu30Gear(g, {
    strut: gearStrutMat,
    tire: tireMat,
    dark: darkMetal,
    belly: bellyMat,
    light: taxiLightMat,
  });

  // =========================================================================
  // 7. STRUKTUR INTERNAL (X-RAY)
  // =========================================================================
  for (let z = -4.5; z <= 5.1; z += 0.9) {
    const r = z > 3.6 ? 0.38 : 0.5;
    const rib = mkMesh(new THREE.TorusGeometry(r, 0.022, 6, 32), internalMat, 'internal');
    rib.scale.set(1.25, 0.75, 1);
    rib.position.set(0, yC - 0.02, z);
    g.add(rib);
  }
  const radarDish = mkMesh(new THREE.CylinderGeometry(0.36, 0.36, 0.045, 28), internalMat, 'internal');
  radarDish.rotation.x = Math.PI / 2;
  radarDish.position.set(0, yC - 0.22, 5.95);
  g.add(radarDish);

  const intFuel = mkMesh(
    new THREE.CapsuleGeometry(0.28, 2.8, 6, 16),
    new THREE.MeshStandardMaterial({ color: '#2a6f97', metalness: 0.4, roughness: 0.4 }),
    'internal',
  );
  intFuel.rotation.x = Math.PI / 2;
  intFuel.position.set(0, yC + 0.14, -0.8);
  g.add(intFuel);

  // =========================================================================
  // 8. LIVERY & MARKA TNI AU (SKADRON UDARA 11 — TS-3005)
  // =========================================================================
  const roundelTex = roundelTexture();
  const flagTex = flagTexture();
  const tniAuTex = textTexture('TNI AU', { color: '#141a21', aspect: 4 });
  const tailCodeTex = textTexture('TS-3005', { color: '#141a21', aspect: 4.2 });
  const noseNumTex = textTexture('05', { color: '#141a21', aspect: 1.5 });

  // Roundel sayap atas
  addDecal(g, wingR, [3.15, 1.64, -2.0], [-Math.PI / 2, 0, 0], [1.22, 1.22, 0.55], roundelTex);
  addDecal(g, wingL, [-3.15, 1.64, -2.0], [-Math.PI / 2, 0, 0], [1.22, 1.22, 0.55], roundelTex);

  // Marka kedua sirip ekor tegak (depth tipis agar tidak tembus/terbalik ke sisi sebaliknya)
  for (const [finMesh, fx] of [
    [finR, 1.32],
    [finL, -1.32],
  ] as const) {
    for (const side of [1, -1]) {
      const rot: V3 = [0, (side * Math.PI) / 2, 0];
      addDecal(g, finMesh, [fx + side * 0.05, 3.6, -5.7], rot, [0.92, 0.6, 0.09], flagTex);
      addDecal(g, finMesh, [fx + side * 0.05, 2.7, -5.15], rot, [1.45, 0.34, 0.09], tailCodeTex);
    }
  }

  // Marka samping badan pesawat
  for (const s of [1, -1]) {
    const rot: V3 = [0, (s * Math.PI) / 2, 0];
    addDecal(g, fuseMesh, [s * 0.78, 1.82, 1.15], rot, [1.45, 0.36, 0.28], tniAuTex);
    addDecal(g, fuseMesh, [s * 0.56, 1.6, 4.75], rot, [0.62, 0.42, 0.24], noseNumTex);
  }

  return {
    group: g,
    nozzles: [
      { pos: [0.88, 1.32, -7.0], r: 0.34, kind: 'ab' },
      { pos: [-0.88, 1.32, -7.0], r: 0.34, kind: 'ab' },
    ],
    spinners: [],
    navLights: [
      { pos: [5.08, 1.48, -1.25], color: '#ff2a2a' },
      { pos: [-5.08, 1.48, -1.25], color: '#22ff66' },
      { pos: [1.32, 4.4, -6.34], color: '#ffffff', blink: 'strobe' },
      { pos: [-1.32, 4.4, -6.34], color: '#ffffff', blink: 'strobe' },
    ],
    glowMats: [glowMat],
    hoverHeight: 0.95,
  };
}
