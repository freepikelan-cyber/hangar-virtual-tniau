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
import { camoTexture, flagTexture, panelBumpTexture, roundelTexture, solidNoiseTexture, textTexture } from './textures';
import type { BuildResult, SpinnerFx, V3 } from './proceduralBuilder';

/* =========================================================================
 * Paket Builder 3D Detail Tinggi Pesawat Tempur & Serang TNI AU:
 * 1. KAI T-50i Golden Eagle (TT-5010) — Livery Biru-Kuning Elang Biru
 * 2. BAE Hawk 209 (TT-0207) — Kamuflase Hijau-Coklat Skadron Udara 1 & 12
 * 3. Sukhoi Su-27SKM (TS-2703) — Flanker Kursi Tunggal Skadron Udara 11
 * 4. EMB-314 Super Tucano (TT-3108) — Shark-Mouth Skadron Udara 21
 * ========================================================================= */

function cloneRep(tex: THREE.Texture, rx: number, ry: number) {
  const t = tex.clone();
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.needsUpdate = true;
  return t;
}

function commonMats(seed: number) {
  const bump = panelBumpTexture(seed);
  return {
    bump,
    darkMetal: new THREE.MeshStandardMaterial({ color: '#2b3038', metalness: 0.85, roughness: 0.3 }),
    titanium: new THREE.MeshStandardMaterial({ color: '#5c5854', metalness: 0.88, roughness: 0.26 }),
    intakeInner: new THREE.MeshStandardMaterial({ color: '#090d12', metalness: 0.2, roughness: 0.9, side: THREE.DoubleSide }),
    frame: new THREE.MeshStandardMaterial({ color: '#1b2026', metalness: 0.5, roughness: 0.45 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: '#98c0dc',
      metalness: 0.14,
      roughness: 0.04,
      transparent: true,
      opacity: 0.48,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      iridescence: 0.32,
      envMapIntensity: 2.0,
      side: THREE.DoubleSide,
    }),
    strut: new THREE.MeshStandardMaterial({ color: '#cfd5dc', metalness: 0.72, roughness: 0.3 }),
    tire: new THREE.MeshStandardMaterial({ color: '#141619', metalness: 0.06, roughness: 0.92 }),
    missileWhite: new THREE.MeshStandardMaterial({ color: '#eaedf0', metalness: 0.3, roughness: 0.42 }),
    missileYellow: new THREE.MeshStandardMaterial({ color: '#eab308', metalness: 0.2, roughness: 0.5 }),
    missileRed: new THREE.MeshStandardMaterial({ color: '#dc2626', metalness: 0.25, roughness: 0.45 }),
    hud: new THREE.MeshBasicMaterial({ color: '#34f5c5', transparent: true, opacity: 0.48, side: THREE.DoubleSide }),
    mfd: new THREE.MeshBasicMaterial({ color: '#22c55e' }),
    taxiLight: new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff6d6', emissiveIntensity: 1.6 }),
    internal: new THREE.MeshStandardMaterial({ color: '#4fa3c7', metalness: 0.7, roughness: 0.35 }),
    core: new THREE.MeshStandardMaterial({ color: '#c47a3c', metalness: 0.85, roughness: 0.3 }),
    glow: new THREE.MeshStandardMaterial({
      color: '#261208',
      metalness: 0.6,
      roughness: 0.4,
      emissive: new THREE.Color('#ff6a1a'),
      emissiveIntensity: 0,
    }),
  };
}

function addSeat(g: THREE.Group, z: number, y: number, frame: THREE.Material, dark: THREE.Material, s = 1) {
  const pan = mkMesh(new THREE.BoxGeometry(0.36 * s, 0.08 * s, 0.38 * s), frame, 'cockpit');
  pan.position.set(0, y, z);
  const back = mkMesh(new THREE.BoxGeometry(0.34 * s, 0.5 * s, 0.09 * s), frame, 'cockpit');
  back.position.set(0, y + 0.23 * s, z - 0.18 * s);
  back.rotation.x = -0.34;
  const head = mkMesh(new THREE.BoxGeometry(0.22 * s, 0.16 * s, 0.11 * s), dark, 'cockpit');
  head.position.set(0, y + 0.46 * s, z - 0.25 * s);
  g.add(pan, back, head);
}

function addSimpleMissile(g: THREE.Group, pos: V3, len: number, r: number, white: THREE.Material, dark: THREE.Material, bandMat: THREE.Material) {
  const m = new THREE.Group();
  m.position.set(...pos);
  const body = mkMesh(new THREE.CylinderGeometry(r, r, len, 14), white);
  body.rotation.x = Math.PI / 2;
  const nose = mkMesh(new THREE.SphereGeometry(r, 12, 10), dark);
  nose.position.z = len / 2;
  const band = mkMesh(new THREE.CylinderGeometry(r * 1.02, r * 1.02, 0.08, 14), bandMat);
  band.rotation.x = Math.PI / 2;
  band.position.z = len * 0.22;
  m.add(body, nose, band);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const f = mkMesh(new THREE.BoxGeometry(0.012, r * 3.4, 0.3), dark);
    f.position.set(Math.cos(a) * r * 1.7, Math.sin(a) * r * 1.7, -len / 2 + 0.2);
    f.rotation.z = a - Math.PI / 2;
    m.add(f);
  }
  g.add(m);
}

function addPodTank(g: THREE.Group, pos: V3, len: number, rMax: number, mat: THREE.Material) {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 24; i++) {
    const u = i / 24;
    const z = (u - 0.5) * len;
    let r = rMax;
    if (u < 0.28) r = rMax * Math.pow(u / 0.28, 0.65);
    else if (u > 0.72) r = rMax * Math.pow((1 - u) / 0.28, 0.65);
    pts.push(new THREE.Vector2(Math.max(0.004, r), z));
  }
  const geo = new THREE.LatheGeometry(pts, 24);
  geo.rotateX(Math.PI / 2);
  const m = mkMesh(geo, mat);
  m.position.set(...pos);
  g.add(m);
}

function addTricycleGear(
  parent: THREE.Group,
  cfg: { nz: number; nr: number; mz: number; mx: number; mr: number; topY: number; noseTwin?: boolean },
  mats: { strut: THREE.Material; tire: THREE.Material; light: THREE.Material },
) {
  const g = new THREE.Group();
  g.name = 'landing-gear';
  parent.add(g);
  const nLen = Math.max(0.25, cfg.topY - cfg.nr);
  const nStrut = mkMesh(new THREE.CylinderGeometry(0.044, 0.038, nLen, 12), mats.strut);
  nStrut.position.set(0, cfg.nr + nLen / 2, cfg.nz);
  g.add(nStrut);
  const lamp = mkMesh(new THREE.CylinderGeometry(0.038, 0.038, 0.04, 12), mats.light);
  lamp.rotation.x = Math.PI / 2;
  lamp.position.set(0, cfg.nr + nLen * 0.45, cfg.nz + 0.05);
  g.add(lamp);

  const nOffs = cfg.noseTwin ? [-0.11, 0.11] : [0];
  for (const ox of nOffs) {
    const nt = mkMesh(new THREE.CylinderGeometry(cfg.nr, cfg.nr, 0.12, 22), mats.tire);
    nt.rotation.z = Math.PI / 2;
    nt.position.set(ox, cfg.nr, cfg.nz);
    const nh = mkMesh(new THREE.CylinderGeometry(cfg.nr * 0.52, cfg.nr * 0.52, 0.132, 14), mats.strut);
    nh.rotation.z = Math.PI / 2;
    nh.position.copy(nt.position);
    g.add(nt, nh);
  }

  const mLen = Math.max(0.25, cfg.topY - cfg.mr);
  for (const s of [1, -1]) {
    const ms = mkMesh(new THREE.CylinderGeometry(0.05, 0.044, mLen, 12), mats.strut);
    ms.position.set(s * cfg.mx, cfg.mr + mLen / 2, cfg.mz);
    const mt = mkMesh(new THREE.CylinderGeometry(cfg.mr, cfg.mr, 0.2, 24), mats.tire);
    mt.rotation.z = Math.PI / 2;
    mt.position.set(s * cfg.mx, cfg.mr, cfg.mz);
    const mh = mkMesh(new THREE.CylinderGeometry(cfg.mr * 0.54, cfg.mr * 0.54, 0.215, 16), mats.strut);
    mh.rotation.z = Math.PI / 2;
    mh.position.copy(mt.position);
    g.add(ms, mt, mh);
  }
}

/* =========================================================================
 * 1. KAI T-50i GOLDEN EAGLE TNI AU (TT-5005) — LIVERY BIRU-KUNING PERSIS FOTO
 * ========================================================================= */
function t50BlueYellowTexture() {
  const W = 1024;
  const H = 1024;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;

  // Base biru royal TNI AU Skadron Udara 15
  ctx.fillStyle = '#163b8c';
  ctx.fillRect(0, 0, W, H);

  // Perut & bagian bawah (u ~ 0.35..0.65) dicat biru gelap & kuning-putih rapi
  ctx.fillStyle = '#122f73';
  ctx.fillRect(W * 0.36, 0, W * 0.28, H);

  // Sapuan kuning emas khas Elang Emas di pipi hidung depan (v = 0.72..0.96) & sisi LERX
  for (const cx of [W * 0.23, W * 0.77]) {
    // Pipi hidung kuning di depan intake (tempat nomor 05)
    ctx.fillStyle = '#f5c400';
    ctx.beginPath();
    ctx.ellipse(cx, H * 0.84, W * 0.13, H * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pita kuning melengkung sepanjang badan & LERX menuju pangkal ekor
    ctx.fillStyle = '#f5c400';
    ctx.beginPath();
    ctx.moveTo(cx - W * 0.06, H * 0.72);
    ctx.quadraticCurveTo(cx + W * 0.04, H * 0.45, cx - W * 0.08, H * 0.1);
    ctx.lineTo(cx + W * 0.03, H * 0.1);
    ctx.quadraticCurveTo(cx + W * 0.11, H * 0.45, cx + W * 0.04, H * 0.72);
    ctx.closePath();
    ctx.fill();

    // Garis aksen putih tipis di tepi pita kuning
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 5;
    ctx.stroke();
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

/** Tekstur sirip ekor tegak T-50i TNI AU: kuning emas lebar di bagian tengah-depan, biru royal di belakang & tepi. */
function t50TailFinTexture() {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#163b8c';
  ctx.fillRect(0, 0, S, S);
  // Sapuan kuning emas besar naik dari pangkal ekor ke pucuk ekor (persis foto TT-5005)
  ctx.fillStyle = '#f5c400';
  ctx.beginPath();
  ctx.moveTo(S * 0.12, S);
  ctx.lineTo(S * 0.74, S);
  ctx.quadraticCurveTo(S * 0.66, S * 0.45, S * 0.56, 0);
  ctx.lineTo(S * 0.28, 0);
  ctx.quadraticCurveTo(S * 0.34, S * 0.45, S * 0.12, S);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.stroke();

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

export function buildDetailedT50i(liveryId = 'demo'): BuildResult {
  const g = new THREE.Group();
  const yC = 1.48;
  const m = commonMats(5005);
  const isCamo = liveryId === 'camo';
  const camoTealTex = isCamo
    ? camoTexture('#528f8d', [{ c: '#b8c4cc', n: 16, r: 62 }, { c: '#486d70', n: 10, r: 44 }], 5002, { noise: 0.03 })
    : null;

  const fuseMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    map: isCamo ? camoTealTex! : t50BlueYellowTexture(),
    bumpMap: cloneRep(m.bump, 2.2, 4.4),
    bumpScale: 0.014,
    metalness: isCamo ? 0.42 : 0.45,
    roughness: isCamo ? 0.44 : 0.32,
  });
  const blueWingMat = new THREE.MeshStandardMaterial({
    color: isCamo ? '#ffffff' : '#163b8c',
    map: isCamo ? cloneRep(camoTealTex!, 1.5, 1.5) : null,
    bumpMap: cloneRep(m.bump, 1.5, 1.5),
    bumpScale: 0.012,
    metalness: isCamo ? 0.42 : 0.48,
    roughness: isCamo ? 0.44 : 0.32,
  });
  const tailFinMat = new THREE.MeshStandardMaterial({
    color: isCamo ? '#528f8d' : '#ffffff',
    map: isCamo ? cloneRep(camoTealTex!, 1.2, 1.2) : t50TailFinTexture(),
    bumpMap: cloneRep(m.bump, 1.4, 1.4),
    bumpScale: 0.012,
    metalness: 0.44,
    roughness: isCamo ? 0.46 : 0.34,
  });
  const yellowAccentMat = new THREE.MeshStandardMaterial({
    color: isCamo ? '#9aa6b0' : '#f5c400',
    metalness: 0.35,
    roughness: 0.36,
  });
  // Radome abu-abu terang/putih khas T-50i TNI AU (sesuai foto Antara News!)
  const radomeMat = new THREE.MeshStandardMaterial({ color: '#cfd6de', metalness: 0.22, roughness: 0.45 });

  // Badan blended lofted kekar & proporsional (panjang 13,14 m -> 13.1 unit)
  const cross = (z: number, th: number): [number, number] => {
    const s = Math.sin(th);
    const c = Math.cos(th);
    let rx = 0.78;
    let ryT = 0.70;
    let ryB = 0.62;
    let ys = 0;
    if (z >= 4.55) {
      const t = Math.max(0, Math.min(1, (6.7 - z) / (6.7 - 4.55)));
      const r = Math.pow(t, 0.72) * 0.64;
      rx = r;
      ryT = r * 0.94;
      ryB = r * 0.9;
      ys = -0.18 * Math.pow(1 - t, 1.3);
    } else if (z < -3.6) {
      const t = Math.max(0, Math.min(1, (-3.6 - z) / (-3.6 - -6.4)));
      rx = lerp(0.78, 0.48, smoothstep(0, 1, t));
      ryT = lerp(0.68, 0.48, smoothstep(0, 1, t));
      ryB = lerp(0.62, 0.46, smoothstep(0, 1, t));
    }
    let lerx = 0;
    if (z < 3.9 && z > -3.5) {
      const env = smoothstep(3.9, 1.0, z) * smoothstep(-3.5, -1.8, z);
      lerx = 0.68 * env * Math.pow(Math.abs(s), 2.2) * Math.exp(-Math.pow((c + 0.08) * 4.0, 2));
    }
    let spine = 0;
    if (z < 1.5 && z > -5.5) {
      const env = smoothstep(1.5, 0.8, z) * smoothstep(-5.5, -4.4, z);
      spine = c > 0 ? 0.24 * env * Math.pow(c, 5.0) : 0;
    }
    return [s * (rx + lerx), yC + ys + c * (c >= 0 ? ryT : ryB) + spine];
  };

  const bodyZs = Array.from({ length: 56 }, (_, i) => lerp(-6.4, 5.15, i / 55));
  const fuseMesh = mkMesh(buildLoftGeometry(bodyZs.map((z) => ({ z, point: (th) => cross(z, th) })), 56), fuseMat);
  // Radome hidung abu-abu terang mulai z = 5.12 .. 6.70
  const noseZs = Array.from({ length: 20 }, (_, i) => lerp(5.12, 6.7, i / 19));
  const noseMesh = mkMesh(buildLoftGeometry(noseZs.map((z) => ({ z, point: (th) => cross(z, th) })), 40), radomeMat);
  const pitot = mkMesh(new THREE.CylinderGeometry(0.008, 0.016, 0.62, 8), m.darkMetal);
  pitot.rotation.x = Math.PI / 2;
  pitot.position.set(0, yC - 0.18, 6.98);
  g.add(fuseMesh, noseMesh, pitot);

  // Saluran udara samping kembar di bawah LERX + pintu roda kuning di bawah perut
  for (const s of [1, -1]) {
    const ix = s * 0.84;
    const iy = 1.24;
    const duct = mkMesh(
      buildLoftGeometry(
        Array.from({ length: 16 }, (_, i) => {
          const z = lerp(-1.8, 2.08, i / 15);
          const f = smoothstep(-1.8, 0.2, z);
          return { z, point: (th) => [ix + Math.sin(th) * (0.31 * f + 0.06), iy + Math.cos(th) * (0.36 * f + 0.06)] };
        }),
        28,
      ),
      fuseMat,
    );
    const lip = mkMesh(new THREE.TorusGeometry(0.32, 0.028, 8, 24), m.darkMetal);
    lip.scale.set(0.86, 1.08, 1);
    lip.position.set(ix, iy, 2.08);
    const cav = mkMesh(new THREE.CircleGeometry(0.31, 24), m.intakeInner);
    cav.scale.set(0.84, 1.06, 1);
    cav.position.set(ix, iy, 2.05);
    // Pintu roda utama berwarna kuning terbuka di sisi bawah (khas foto T-50i!)
    const gearDoor = mkMesh(new THREE.BoxGeometry(0.03, 0.44, 0.98), yellowAccentMat);
    gearDoor.position.set(s * 0.72, 0.66, -1.1);
    gearDoor.rotation.z = s * 0.28;
    g.add(duct, lip, cav, gearDoor);
  }

  // Kanopi tandem 2 kursi & kokpit (Zero-Zero Ejection Seats + OBOGS + HUD)
  const canopyZs = Array.from({ length: 28 }, (_, i) => lerp(1.25, 4.45, i / 27));
  const canopyGeo = buildLoftGeometry(
    canopyZs.map((z) => {
      const u = Math.max(0, Math.min(1, (z - 1.25) / 3.2));
      const arch = Math.max(0, Math.sin(Math.pow(u, 0.76) * Math.PI));
      return {
        z,
        point: (th) => {
          const a = (th / (Math.PI * 2)) * Math.PI - Math.PI / 2;
          return [Math.sin(a) * 0.54 * Math.pow(arch, 0.58), lerp(2.08, 1.94, u) + Math.cos(a) * 0.62 * arch];
        },
      };
    }),
    32,
  );
  g.add(mkMesh(canopyGeo, m.glass, 'glass'));
  const bow = mkMesh(new THREE.TorusGeometry(0.38, 0.024, 8, 20, Math.PI), m.frame);
  bow.position.set(0, 1.9, 2.95);
  g.add(bow);
  const hud = mkMesh(new THREE.PlaneGeometry(0.17, 0.2), m.hud, 'cockpit');
  hud.position.set(0, 2.1, 3.88);
  hud.rotation.x = -0.55;
  g.add(hud);
  addSeat(g, 3.38, 1.86, m.frame, m.darkMetal, 0.95);
  addSeat(g, 2.38, 1.98, m.frame, m.darkMetal, 0.95);

  // Sayap utama airfoil (rentang 9,45 m -> ±4.45), stabilator, ekor tegak kuning-biru
  const wingR = mkMesh(
    buildAirfoilSurface(
      [
        { spanPos: 0.65, leZ: 1.3, teZ: -2.8, offset: 1.4, thick: 0.19 },
        { spanPos: 2.4, leZ: 0.05, teZ: -2.45, offset: 1.38, thick: 0.12 },
        { spanPos: 4.35, leZ: -1.35, teZ: -2.25, offset: 1.35, thick: 0.06 },
      ],
      'horizontal',
      1,
      0.08,
    ),
    blueWingMat,
  );
  const wingL = mkMesh(
    buildAirfoilSurface(
      [
        { spanPos: 0.65, leZ: 1.3, teZ: -2.8, offset: 1.4, thick: 0.19 },
        { spanPos: 2.4, leZ: 0.05, teZ: -2.45, offset: 1.38, thick: 0.12 },
        { spanPos: 4.35, leZ: -1.35, teZ: -2.25, offset: 1.35, thick: 0.06 },
      ],
      'horizontal',
      -1,
      0.08,
    ),
    blueWingMat,
  );
  g.add(wingR, wingL);

  const stabSecs: AirfoilSection[] = [
    { spanPos: 0.48, leZ: -4.2, teZ: -6.1, offset: 1.38, thick: 0.09 },
    { spanPos: 2.38, leZ: -5.45, teZ: -6.32, offset: 1.28, thick: 0.045 },
  ];
  g.add(
    mkMesh(buildAirfoilSurface(stabSecs, 'horizontal', 1, 0), blueWingMat),
    mkMesh(buildAirfoilSurface(stabSecs, 'horizontal', -1, 0), blueWingMat),
  );

  // Ekor tegak biru-kuning dengan tekstur sapuan emas mulus (persis foto TT-5005!)
  const finMesh = mkMesh(
    buildAirfoilSurface(
      [
        { spanPos: 1.88, leZ: -2.85, teZ: -6.28, offset: 0, thick: 0.14 },
        { spanPos: 3.15, leZ: -4.3, teZ: -6.32, offset: 0, thick: 0.1 },
        { spanPos: 4.48, leZ: -5.48, teZ: -6.36, offset: 0, thick: 0.06 },
      ],
      'vertical',
      1,
      0,
    ),
    tailFinMat,
  );
  g.add(finMesh);

  // Nozzle GE F404-102 (14 kelopak logam)
  const nozInner = mkMesh(new THREE.CylinderGeometry(0.36, 0.31, 0.72, 28, 1, true), m.darkMetal);
  nozInner.rotation.x = Math.PI / 2;
  nozInner.position.set(0, yC, -6.72);
  g.add(nozInner);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const p = mkMesh(new THREE.BoxGeometry(0.13, 0.02, 0.7), i % 2 === 0 ? m.titanium : m.darkMetal);
    p.position.set(Math.cos(a) * 0.35, yC + Math.sin(a) * 0.35, -6.72);
    p.rotation.z = a + Math.PI / 2;
    p.rotateX(0.08);
    g.add(p);
  }
  const ff = mkMesh(new THREE.CircleGeometry(0.31, 24), m.glow);
  ff.rotation.y = Math.PI;
  ff.position.set(0, yC, -6.52);
  g.add(ff);

  // Sepasang tangki bahan bakar eksternal putih di bawah sayap (persis foto terbang!) + wingtip rails AIM-9
  for (const s of [1, -1]) {
    const rail = mkMesh(new THREE.BoxGeometry(0.065, 0.075, 1.9), m.darkMetal);
    rail.position.set(s * 4.4, 1.35, -1.78);
    g.add(rail);
    addSimpleMissile(g, [s * 4.47, 1.35, -1.55], 2.25, 0.056, m.missileWhite, m.darkMetal, m.missileYellow);

    const pylon = mkMesh(new THREE.BoxGeometry(0.075, 0.28, 1.35), m.missileWhite);
    pylon.position.set(s * 2.05, 1.2, -1.15);
    g.add(pylon);
    addPodTank(g, [s * 2.05, 0.9, -1.05], 3.25, 0.22, m.missileWhite);
  }

  addTricycleGear(g, { nz: 3.4, nr: 0.21, mz: -1.1, mx: 1.05, mr: 0.29, topY: 1.05 }, { strut: m.strut, tire: m.tire, light: m.taxiLight });

  // Internal X-Ray
  for (let z = -5.4; z <= 4.8; z += 0.9) {
    const rib = mkMesh(new THREE.TorusGeometry(0.4, 0.02, 6, 28), m.internal, 'internal');
    rib.position.set(0, yC, z);
    g.add(rib);
  }
  const core = mkMesh(new THREE.CylinderGeometry(0.28, 0.28, 4.4, 16), m.core, 'internal');
  core.rotation.x = Math.PI / 2;
  core.position.set(0, yC, -3.9);
  g.add(core);

  // Livery & tulisan TNI AU yang benar di kedua sisi (depth tipis agar tidak tembus)
  const roundelTex = roundelTexture();
  const flagTex = flagTexture();
  const tniAuTex = textTexture('TNI AU', { color: '#ffffff', aspect: 3.8 });
  const tailCodeTex = textTexture('TT-5005', { color: '#14264d', aspect: 4.2 });
  const noseNumTex = textTexture('05', { color: '#14264d', aspect: 1.5 });

  addDecal(g, wingR, [2.6, 1.44, -1.2], [-Math.PI / 2, 0, 0], [1.0, 1.0, 0.4], roundelTex);
  addDecal(g, wingL, [-2.6, 1.44, -1.2], [-Math.PI / 2, 0, 0], [1.0, 1.0, 0.4], roundelTex);
  for (const s of [1, -1]) {
    const rot: V3 = [0, (s * Math.PI) / 2, 0];
    addDecal(g, finMesh, [s * 0.05, 3.85, -5.68], rot, [0.76, 0.48, 0.08], flagTex);
    addDecal(g, finMesh, [s * 0.05, 3.1, -5.25], rot, [1.28, 0.3, 0.08], tailCodeTex);
    addDecal(g, fuseMesh, [s * 0.78, 1.62, -1.2], rot, [1.45, 0.36, 0.28], tniAuTex);
    addDecal(g, fuseMesh, [s * 0.62, 1.44, 4.35], rot, [0.56, 0.38, 0.26], noseNumTex);
  }

  return {
    group: g,
    nozzles: [{ pos: [0, yC, -7.12], r: 0.3, kind: 'ab' }],
    spinners: [],
    navLights: [
      { pos: [4.47, 1.35, -0.4], color: '#ff2a2a' },
      { pos: [-4.47, 1.35, -0.4], color: '#22ff66' },
      { pos: [0, 4.54, -6.28], color: '#ffffff', blink: 'strobe' },
    ],
    glowMats: [m.glow],
    hoverHeight: 0.9,
  };
}

/* =========================================================================
 * 2. BAE HAWK 209 TNI AU (TT-0207) — KAMUFLASE HIJAU-COKLAT SKADRON 1 & 12
 * ========================================================================= */
function hawkCamoTexture() {
  return camoTexture(
    '#5c6943',
    [
      { c: '#8b6a48', n: 16, r: 66 },
      { c: '#3d472c', n: 9, r: 44 },
      { c: '#75583a', n: 7, r: 36 },
    ],
    209,
    { noise: 0.035 },
  );
}

export function buildDetailedHawk209(): BuildResult {
  const g = new THREE.Group();
  const yC = 1.46;
  const m = commonMats(209);
  const camo = hawkCamoTexture();

  const fuseMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    map: cloneRep(camo, 1.8, 3.4),
    bumpMap: cloneRep(m.bump, 2.0, 4.0),
    bumpScale: 0.015,
    metalness: 0.38,
    roughness: 0.56,
  });
  const wingMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    map: cloneRep(camo, 1.3, 1.3),
    bumpMap: cloneRep(m.bump, 1.6, 1.6),
    bumpScale: 0.013,
    metalness: 0.4,
    roughness: 0.54,
  });
  const radomeMat = new THREE.MeshStandardMaterial({ color: '#3b403c', metalness: 0.25, roughness: 0.6 });
  const tankMat = new THREE.MeshStandardMaterial({ color: '#4c5442', metalness: 0.42, roughness: 0.52 });

  // Badan Hawk 209 kekar & berisi: hidung radar APG-66 tebal, kokpit kursi tunggal tinggi, saluran udara samping besar
  const cross = (z: number, th: number): [number, number] => {
    const s = Math.sin(th);
    const c = Math.cos(th);
    let rx = 0.80;
    let ryT = 0.76;
    let ryB = 0.66;
    let ys = 0;
    if (z >= 4.15) {
      const t = Math.max(0, Math.min(1, (6.35 - z) / (6.35 - 4.15)));
      const r = Math.pow(t, 0.7) * 0.68;
      rx = r * 0.98;
      ryT = r * 0.96;
      ryB = r * 0.92;
      ys = -0.22 * Math.pow(1 - t, 1.25);
    } else if (z < -3.2) {
      const t = Math.max(0, Math.min(1, (-3.2 - z) / (-3.2 - -6.2)));
      rx = lerp(0.78, 0.46, smoothstep(0, 1, t));
      ryT = lerp(0.74, 0.46, smoothstep(0, 1, t));
      ryB = lerp(0.64, 0.44, smoothstep(0, 1, t));
    }
    return [s * rx, yC + ys + c * (c >= 0 ? ryT : ryB)];
  };

  const bodyZs = Array.from({ length: 54 }, (_, i) => lerp(-6.2, 4.28, i / 53));
  const fuseMesh = mkMesh(buildLoftGeometry(bodyZs.map((z) => ({ z, point: (th) => cross(z, th) })), 52), fuseMat);
  const noseZs = Array.from({ length: 20 }, (_, i) => lerp(4.24, 6.35, i / 19));
  const noseMesh = mkMesh(buildLoftGeometry(noseZs.map((z) => ({ z, point: (th) => cross(z, th) })), 40), radomeMat);
  g.add(fuseMesh, noseMesh);

  // Twin side semicircular air intakes khas Hawk 209 di belakang kokpit
  for (const s of [1, -1]) {
    const ix = s * 0.84;
    const iy = 1.48;
    const duct = mkMesh(
      buildLoftGeometry(
        Array.from({ length: 16 }, (_, i) => {
          const z = lerp(-2.2, 1.85, i / 15);
          const f = smoothstep(-2.2, 0.2, z);
          return { z, point: (th) => [ix + Math.sin(th) * (0.31 * f + 0.06), iy + Math.cos(th) * (0.37 * f + 0.06)] };
        }),
        28,
      ),
      fuseMat,
    );
    const lip = mkMesh(new THREE.TorusGeometry(0.32, 0.028, 8, 24), m.darkMetal);
    lip.position.set(ix, iy, 1.85);
    const cav = mkMesh(new THREE.CircleGeometry(0.31, 24), m.intakeInner);
    cav.position.set(ix, iy, 1.82);
    g.add(duct, lip, cav);
  }

  // Kanopi kursi tunggal khas Hawk 209 + kokpit terlihat langsung
  const canopyZs = Array.from({ length: 26 }, (_, i) => lerp(1.5, 4.15, i / 25));
  const canopyGeo = buildLoftGeometry(
    canopyZs.map((z) => {
      const u = Math.max(0, Math.min(1, (z - 1.5) / 2.65));
      const arch = Math.max(0, Math.sin(Math.pow(u, 0.78) * Math.PI));
      return {
        z,
        point: (th) => {
          const a = (th / (Math.PI * 2)) * Math.PI - Math.PI / 2;
          return [Math.sin(a) * 0.56 * Math.pow(arch, 0.56), lerp(2.12, 2.00, u) + Math.cos(a) * 0.62 * arch];
        },
      };
    }),
    32,
  );
  g.add(mkMesh(canopyGeo, m.glass, 'glass'));
  const hud = mkMesh(new THREE.PlaneGeometry(0.16, 0.18), m.hud, 'cockpit');
  hud.position.set(0, 2.1, 3.55);
  hud.rotation.x = -0.55;
  g.add(hud);
  addSeat(g, 2.85, 1.88, m.frame, m.darkMetal, 0.95);

  // Sayap rendah sapu belakang berprofil airfoil + wing fences
  const wingSecs: AirfoilSection[] = [
    { spanPos: 0.55, leZ: 1.55, teZ: -1.65, offset: 1.16, thick: 0.2 },
    { spanPos: 2.55, leZ: 0.4, teZ: -1.75, offset: 1.24, thick: 0.13 },
    { spanPos: 4.55, leZ: -0.75, teZ: -1.85, offset: 1.32, thick: 0.065 },
  ];
  const wingR = mkMesh(buildAirfoilSurface(wingSecs, 'horizontal', 1, 0.08), wingMat);
  const wingL = mkMesh(buildAirfoilSurface(wingSecs, 'horizontal', -1, 0.08), wingMat);
  g.add(wingR, wingL);

  // Horizontal tailplane (sedikit anhedral khas Hawk!)
  const stabSecs: AirfoilSection[] = [
    { spanPos: 0.38, leZ: -4.4, teZ: -5.85, offset: 1.48, thick: 0.09 },
    { spanPos: 2.25, leZ: -5.45, teZ: -6.15, offset: 1.26, thick: 0.045 },
  ];
  g.add(
    mkMesh(buildAirfoilSurface(stabSecs, 'horizontal', 1, 0), wingMat),
    mkMesh(buildAirfoilSurface(stabSecs, 'horizontal', -1, 0), wingMat),
  );

  // Vertical stabilizer tegak khas Hawk
  const finMesh = mkMesh(
    buildAirfoilSurface(
      [
        { spanPos: 1.84, leZ: -3.2, teZ: -5.98, offset: 0, thick: 0.14 },
        { spanPos: 3.1, leZ: -4.45, teZ: -6.05, offset: 0, thick: 0.1 },
        { spanPos: 4.25, leZ: -5.35, teZ: -6.12, offset: 0, thick: 0.06 },
      ],
      'vertical',
      1,
      0,
    ),
    wingMat,
  );
  g.add(finMesh);

  // Nozzle tunggal Rolls-Royce Adour
  const noz = mkMesh(new THREE.CylinderGeometry(0.32, 0.27, 0.55, 24, 1, true), m.titanium);
  noz.rotation.x = Math.PI / 2;
  noz.position.set(0, yC, -6.42);
  const ff = mkMesh(new THREE.CircleGeometry(0.27, 22), m.glow);
  ff.rotation.y = Math.PI;
  ff.position.set(0, yC, -6.28);
  g.add(noz, ff);

  // Wingtip AIM-9 Sidewinder + sepasang drop tank bawah sayap + pod kanon ADEN 30mm di perut
  for (const s of [1, -1]) {
    const rail = mkMesh(new THREE.BoxGeometry(0.06, 0.07, 1.85), m.darkMetal);
    rail.position.set(s * 4.6, 1.32, -1.25);
    g.add(rail);
    addSimpleMissile(g, [s * 4.67, 1.32, -1.05], 2.2, 0.055, m.missileWhite, m.darkMetal, m.missileYellow);

    const pylon = mkMesh(new THREE.BoxGeometry(0.07, 0.26, 1.2), m.darkMetal);
    pylon.position.set(s * 2.15, 1.05, -0.55);
    g.add(pylon);
    addPodTank(g, [s * 2.15, 0.78, -0.45], 2.85, 0.2, tankMat);
  }
  addPodTank(g, [0, 0.88, -0.25], 2.4, 0.16, m.darkMetal); // Pod kanon ADEN 30mm

  addTricycleGear(g, { nz: 3.7, nr: 0.2, mz: -0.65, mx: 1.55, mr: 0.28, topY: 1.08 }, { strut: m.strut, tire: m.tire, light: m.taxiLight });

  // Internal X-Ray
  for (let z = -5.2; z <= 4.4; z += 0.9) {
    const rib = mkMesh(new THREE.TorusGeometry(0.4, 0.02, 6, 28), m.internal, 'internal');
    rib.position.set(0, yC, z);
    g.add(rib);
  }
  const core = mkMesh(new THREE.CylinderGeometry(0.26, 0.26, 4.0, 16), m.core, 'internal');
  core.rotation.x = Math.PI / 2;
  core.position.set(0, yC, -3.6);
  g.add(core);

  // Livery & tulisan TNI AU benar di kedua sisi (depth tipis!)
  const roundelTex = roundelTexture();
  const flagTex = flagTexture();
  const tniAuTex = textTexture('TNI AU', { color: '#141a21', aspect: 3.8 });
  const tailCodeTex = textTexture('TT-0207', { color: '#141a21', aspect: 4.2 });
  const noseNumTex = textTexture('07', { color: '#141a21', aspect: 1.5 });

  addDecal(g, wingR, [2.85, 1.34, -0.65], [-Math.PI / 2, 0, 0], [1.0, 1.0, 0.4], roundelTex);
  addDecal(g, wingL, [-2.85, 1.34, -0.65], [-Math.PI / 2, 0, 0], [1.0, 1.0, 0.4], roundelTex);
  for (const s of [1, -1]) {
    const rot: V3 = [0, (s * Math.PI) / 2, 0];
    addDecal(g, finMesh, [s * 0.05, 3.65, -5.5], rot, [0.78, 0.5, 0.08], flagTex);
    addDecal(g, finMesh, [s * 0.05, 2.75, -5.05], rot, [1.3, 0.3, 0.08], tailCodeTex);
    addDecal(g, fuseMesh, [s * 0.78, 1.58, -2.1], rot, [1.4, 0.36, 0.28], tniAuTex);
    addDecal(g, fuseMesh, [s * 0.68, 1.48, 3.55], rot, [0.56, 0.38, 0.26], noseNumTex);
  }

  return {
    group: g,
    nozzles: [{ pos: [0, yC, -6.72], r: 0.26, kind: 'fan' }],
    spinners: [],
    navLights: [
      { pos: [4.67, 1.32, 0.1], color: '#ff2a2a' },
      { pos: [-4.67, 1.32, 0.1], color: '#22ff66' },
      { pos: [0, 4.3, -6.08], color: '#ffffff', blink: 'strobe' },
    ],
    glowMats: [m.glow],
    hoverHeight: 0.85,
  };
}

/* =========================================================================
 * 3. SUKHOI Su-27SKM TNI AU (TS-2703) — FLANKER KURSI TUNGGAL (TANPA CANARD)
 * ========================================================================= */
function su27LiveryTexture() {
  const W = 1024;
  const H = 1024;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  const camo = camoTexture(
    '#8aa3b8',
    [
      { c: '#5b7690', n: 15, r: 66 },
      { c: '#c4d2de', n: 12, r: 48 },
      { c: '#475e75', n: 6, r: 34 },
    ],
    2703,
    { noise: 0.03 },
  );
  ctx.drawImage(camo.image as HTMLCanvasElement, 0, 0, W, H);
  camo.dispose();
  ctx.fillStyle = '#b4cad9';
  ctx.fillRect(W * 0.39, 0, W * 0.22, H);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

export function buildDetailedSu27(): BuildResult {
  const g = new THREE.Group();
  const yC = 1.68;
  const m = commonMats(2703);

  const camoWing = camoTexture(
    '#8aa3b8',
    [
      { c: '#5b7690', n: 15, r: 64 },
      { c: '#c4d2de', n: 11, r: 46 },
    ],
    2703,
    { noise: 0.03 },
  );

  const fuseMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    map: su27LiveryTexture(),
    bumpMap: cloneRep(m.bump, 2.4, 4.8),
    bumpScale: 0.015,
    metalness: 0.5,
    roughness: 0.44,
  });
  const wingMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    map: cloneRep(camoWing, 1.5, 1.5),
    bumpMap: cloneRep(m.bump, 1.8, 1.8),
    bumpScale: 0.014,
    metalness: 0.52,
    roughness: 0.42,
  });
  const radomeMat = new THREE.MeshStandardMaterial({ color: '#e2e7ec', metalness: 0.18, roughness: 0.48 });
  const bellyMat = new THREE.MeshStandardMaterial({ color: '#aec6d6', metalness: 0.46, roughness: 0.46 });
  const burntMat = new THREE.MeshStandardMaterial({ color: '#6b6772', metalness: 0.9, roughness: 0.24 });

  // Penampang Su-27 kursi tunggal: punggung lebih ramping dari Su-30 tandem, hidung ogive panjang
  const cross = (z: number, th: number): [number, number] => {
    const s = Math.sin(th);
    const c = Math.cos(th);
    let rx = 0.66;
    let ryT = 0.42;
    let ryB = 0.3;
    let ys = 0;
    if (z >= 5.0) {
      const t = Math.max(0, Math.min(1, (7.25 - z) / (7.25 - 5.0)));
      const r = Math.pow(t, 0.72) * 0.48;
      rx = r * 1.03;
      ryT = r * 0.94;
      ryB = r * 0.9;
      ys = -0.34 * Math.pow(1 - t, 1.3) - 0.12;
    } else if (z >= 2.4) {
      const t = (5.0 - z) / (5.0 - 2.4);
      rx = lerp(0.5, 0.74, smoothstep(0, 1, t));
      ryT = lerp(0.44, 0.46, smoothstep(0, 1, t));
      ryB = lerp(0.42, 0.33, smoothstep(0, 1, t));
      ys = lerp(-0.12, 0, smoothstep(0, 1, t));
    } else if (z >= -3.6) {
      const t = (2.4 - z) / (2.4 - -3.6);
      rx = lerp(0.74, 0.64, t);
      ryT = lerp(0.46, 0.32, t);
      ryB = lerp(0.33, 0.22, t);
      ys = lerp(0, -0.06, t);
    } else {
      const t = Math.max(0, Math.min(1, (-3.6 - z) / (-3.6 - -7.1)));
      rx = lerp(0.44, 0.1, smoothstep(0, 1, t));
      ryT = lerp(0.3, 0.12, smoothstep(0, 1, t));
      ryB = lerp(0.2, 0.1, smoothstep(0, 1, t));
      ys = lerp(-0.06, -0.14, t);
    }
    let lerx = 0;
    if (z < 4.7 && z > -4.2) {
      lerx = 0.94 * smoothstep(4.7, 0.7, z) * smoothstep(-4.2, -2.5, z) * Math.pow(Math.abs(s), 2.0) * Math.exp(-Math.pow((c + 0.08) * 4.5, 2));
    }
    let spine = 0;
    if (z < 2.6 && z > -4.4) {
      spine = c > 0 ? 0.18 * smoothstep(2.6, 1.9, z) * smoothstep(-4.4, 1.9, z) * Math.pow(c, 3.8) : 0;
    }
    return [s * (rx + lerx), yC + ys + c * (c >= 0 ? ryT : ryB) + spine];
  };

  const bodyZs = Array.from({ length: 60 }, (_, i) => lerp(-7.1, 5.04, i / 59));
  const fuseMesh = mkMesh(buildLoftGeometry(bodyZs.map((z) => ({ z, point: (th) => cross(z, th) })), 60, false, true), fuseMat);
  const noseZs = Array.from({ length: 24 }, (_, i) => lerp(5.0, 7.25, i / 23));
  g.add(fuseMesh, mkMesh(buildLoftGeometry(noseZs.map((z) => ({ z, point: (th) => cross(z, th) })), 48), radomeMat));

  // Pitot & sensor IRST tengah (khas Su-27 di tengah depan windscreen!)
  const pitot = mkMesh(new THREE.CylinderGeometry(0.008, 0.02, 0.82, 10), m.darkMetal);
  pitot.rotation.x = Math.PI / 2;
  pitot.position.set(0, yC - 0.46, 7.64);
  const irst = mkMesh(new THREE.SphereGeometry(0.075, 14, 12), m.glass, 'glass');
  irst.position.set(0, 2.04, 4.92);
  g.add(pitot, irst);

  // Nacelle kembar + intake raked 28° + tail booms + panel titanium ekspos + nozzle AL-31F
  for (const s of [1, -1]) {
    const nx = s * 0.88;
    const ny = 1.3;
    const duct = mkMesh(
      buildLoftGeometry(
        Array.from({ length: 16 }, (_, i) => {
          const u = i / 15;
          const z = lerp(0.4, 2.85, u);
          const hw = lerp(0.44, 0.36, u);
          const hh = lerp(0.37, 0.29, u);
          const yc = lerp(ny, ny - 0.14, u);
          return {
            z,
            point: (th) => [
              nx + Math.sign(Math.sin(th)) * Math.pow(Math.abs(Math.sin(th)), 0.5) * hw,
              yc + Math.sign(Math.cos(th)) * Math.pow(Math.abs(Math.cos(th)), 0.5) * hh,
            ],
          };
        }),
        32,
      ),
      bellyMat,
    );
    const hoodTop = mkMesh(new THREE.BoxGeometry(0.74, 0.05, 0.54), bellyMat);
    hoodTop.position.set(nx, ny + 0.13, 2.96);
    const mouth = mkMesh(new THREE.PlaneGeometry(0.66, 0.6), m.intakeInner);
    mouth.position.set(nx, ny - 0.14, 2.9);
    mouth.rotation.x = -0.45;
    const nac = mkMesh(
      buildLoftGeometry(
        Array.from({ length: 18 }, (_, i) => {
          const z = lerp(-5.1, 0.45, i / 17);
          const r = z < -3.6 ? lerp(0.45, 0.41, (-3.6 - z) / 1.5) : 0.45;
          return { z, point: (th) => [nx + Math.sin(th) * r, ny + Math.cos(th) * r * 0.96] };
        }),
        32,
      ),
      bellyMat,
    );
    const boomX = s * 1.3;
    const boom = mkMesh(
      buildLoftGeometry(
        Array.from({ length: 16 }, (_, i) => {
          const u = i / 15;
          const z = lerp(-6.5, -2.8, u);
          return { z, point: (th) => [boomX + Math.sin(th) * lerp(0.11, 0.3, Math.pow(u, 0.65)), lerp(1.34, 1.48, u) + Math.cos(th) * lerp(0.13, 0.26, Math.pow(u, 0.65))] };
        }),
        24,
        false,
        true,
      ),
      wingMat,
    );
    const shroud = mkMesh(new THREE.CylinderGeometry(0.41, 0.39, 1.2, 28), burntMat);
    shroud.rotation.x = Math.PI / 2;
    shroud.position.set(nx, ny, -5.68);
    const noz = mkMesh(new THREE.CylinderGeometry(0.37, 0.32, 0.7, 26, 1, true), m.darkMetal);
    noz.rotation.x = Math.PI / 2;
    noz.position.set(nx, ny, -6.62);
    const ff = mkMesh(new THREE.CircleGeometry(0.32, 24), m.glow);
    ff.rotation.y = Math.PI;
    ff.position.set(nx, ny, -6.42);
    g.add(duct, hoodTop, mouth, nac, boom, shroud, noz, ff);

    const core = mkMesh(new THREE.CylinderGeometry(0.3, 0.3, 5.2, 14), m.core, 'internal');
    core.rotation.x = Math.PI / 2;
    core.position.set(nx, ny, -3.1);
    g.add(core);
  }

  // Kanopi KURSI TUNGGAL lebih ringkas khas Su-27
  const canopyZs = Array.from({ length: 28 }, (_, i) => lerp(2.2, 4.92, i / 27));
  g.add(
    mkMesh(
      buildLoftGeometry(
        canopyZs.map((z) => {
          const u = Math.max(0, Math.min(1, (z - 2.2) / 2.72));
          const arch = Math.max(0, Math.sin(Math.pow(u, 0.76) * Math.PI));
          return {
            z,
            point: (th) => {
              const a = (th / (Math.PI * 2)) * Math.PI - Math.PI / 2;
              return [Math.sin(a) * 0.44 * Math.pow(arch, 0.56), lerp(2.12, 1.98, u) + Math.cos(a) * 0.58 * arch];
            },
          };
        }),
        32,
      ),
      m.glass,
      'glass',
    ),
  );
  const hud = mkMesh(new THREE.PlaneGeometry(0.18, 0.2), m.hud, 'cockpit');
  hud.position.set(0, 2.26, 4.25);
  hud.rotation.x = -0.55;
  g.add(hud);
  addSeat(g, 3.65, 2.04, m.frame, m.darkMetal, 1.0);

  // Sayap utama + stabilator + ekor tegak kembar (TANPA canard!)
  const wingSecs: AirfoilSection[] = [
    { spanPos: 0.98, leZ: 1.4, teZ: -3.55, offset: 1.56, thick: 0.23 },
    { spanPos: 2.35, leZ: 0.25, teZ: -3.45, offset: 1.52, thick: 0.16 },
    { spanPos: 4.92, leZ: -2.18, teZ: -3.28, offset: 1.46, thick: 0.07 },
  ];
  const wingR = mkMesh(buildAirfoilSurface(wingSecs, 'horizontal', 1, 0.08), wingMat);
  const wingL = mkMesh(buildAirfoilSurface(wingSecs, 'horizontal', -1, 0.08), wingMat);
  g.add(wingR, wingL);

  const stabSecs: AirfoilSection[] = [
    { spanPos: 1.28, leZ: -4.45, teZ: -6.45, offset: 1.36, thick: 0.1 },
    { spanPos: 3.4, leZ: -5.9, teZ: -6.72, offset: 1.26, thick: 0.048 },
  ];
  g.add(
    mkMesh(buildAirfoilSurface(stabSecs, 'horizontal', 1, 0), wingMat),
    mkMesh(buildAirfoilSurface(stabSecs, 'horizontal', -1, 0), wingMat),
  );

  const finSecs: AirfoilSection[] = [
    { spanPos: 1.44, leZ: -3.35, teZ: -6.38, offset: 0, thick: 0.15 },
    { spanPos: 3.05, leZ: -4.85, teZ: -6.44, offset: 0, thick: 0.1 },
    { spanPos: 4.28, leZ: -5.65, teZ: -6.46, offset: 0, thick: 0.06 },
  ];
  const finR = mkMesh(buildAirfoilSurface(finSecs, 'vertical', 1, 0), wingMat);
  finR.position.x = 1.3;
  const finL = mkMesh(buildAirfoilSurface(finSecs, 'vertical', 1, 0), wingMat);
  finL.position.x = -1.3;
  g.add(finR, finL);

  for (const s of [1, -1]) {
    const cap = mkMesh(new THREE.BoxGeometry(0.07, 0.1, 0.8), radomeMat);
    cap.position.set(s * 1.3, 4.3, -6.05);
    const vf = mkMesh(
      buildAirfoilSurface(
        [
          { spanPos: 0, leZ: -4.2, teZ: -6.1, offset: 0, thick: 0.048 },
          { spanPos: -0.42, leZ: -4.75, teZ: -5.95, offset: 0, thick: 0.024 },
        ],
        'vertical',
        1,
        0,
      ),
      bellyMat,
    );
    vf.position.set(s * 1.3, 1.22, 0);
    vf.rotation.z = s * 0.24;
    g.add(cap, vf);

    const rail = mkMesh(new THREE.BoxGeometry(0.08, 0.085, 1.9), m.darkMetal);
    rail.position.set(s * 4.96, 1.46, -2.72);
    g.add(rail);
    addSimpleMissile(g, [s * 5.04, 1.46, -2.5], 2.25, 0.062, m.missileWhite, m.darkMetal, m.missileRed);
    addSimpleMissile(g, [s * 2.95, 1.24, -1.75], 2.8, 0.076, m.missileWhite, m.darkMetal, m.missileRed);
  }

  addTricycleGear(g, { nz: 4.05, nr: 0.24, mz: -1.25, mx: 1.66, mr: 0.37, topY: 1.28, noseTwin: false }, { strut: m.strut, tire: m.tire, light: m.taxiLight });

  // Marka TNI AU & TS-2703 (depth tipis!)
  const roundelTex = roundelTexture();
  const flagTex = flagTexture();
  const tniAuTex = textTexture('TNI AU', { color: '#141a21', aspect: 3.8 });
  const tailCodeTex = textTexture('TS-2703', { color: '#141a21', aspect: 4.2 });
  const noseNumTex = textTexture('03', { color: '#c81e24', aspect: 1.5 });

  addDecal(g, wingR, [3.1, 1.6, -2.0], [-Math.PI / 2, 0, 0], [1.2, 1.2, 0.5], roundelTex);
  addDecal(g, wingL, [-3.1, 1.6, -2.0], [-Math.PI / 2, 0, 0], [1.2, 1.2, 0.5], roundelTex);
  for (const [finMesh, fx] of [
    [finR, 1.3],
    [finL, -1.3],
  ] as const) {
    for (const side of [1, -1]) {
      const rot: V3 = [0, (side * Math.PI) / 2, 0];
      addDecal(g, finMesh, [fx + side * 0.05, 3.55, -5.7], rot, [0.9, 0.58, 0.08], flagTex);
      addDecal(g, finMesh, [fx + side * 0.05, 2.65, -5.15], rot, [1.4, 0.34, 0.08], tailCodeTex);
    }
  }
  for (const s of [1, -1]) {
    const rot: V3 = [0, (s * Math.PI) / 2, 0];
    addDecal(g, fuseMesh, [s * 0.76, 1.76, 1.0], rot, [1.4, 0.34, 0.26], tniAuTex);
    addDecal(g, fuseMesh, [s * 0.55, 1.58, 4.75], rot, [0.58, 0.38, 0.24], noseNumTex);
  }

  return {
    group: g,
    nozzles: [
      { pos: [0.88, 1.3, -6.98], r: 0.34, kind: 'ab' },
      { pos: [-0.88, 1.3, -6.98], r: 0.34, kind: 'ab' },
    ],
    spinners: [],
    navLights: [
      { pos: [5.04, 1.46, -1.3], color: '#ff2a2a' },
      { pos: [-5.04, 1.46, -1.3], color: '#22ff66' },
      { pos: [1.3, 4.35, -6.34], color: '#ffffff', blink: 'strobe' },
      { pos: [-1.3, 4.35, -6.34], color: '#ffffff', blink: 'strobe' },
    ],
    glowMats: [m.glow],
    hoverHeight: 0.95,
  };
}

/* =========================================================================
 * 4. EMB-314 SUPER TUCANO TNI AU (TT-3108) — SHARK-MOUTH SKADRON UDARA 21
 * ========================================================================= */
function sharkMouthTexture() {
  const W = 512;
  const H = 220;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  // Mulut hiu merah khas Super Tucano TNI AU Skadron Udara 21
  ctx.fillStyle = '#c8102e';
  ctx.beginPath();
  ctx.moveTo(40, 110);
  ctx.quadraticCurveTo(240, 28, 470, 90);
  ctx.quadraticCurveTo(320, 200, 40, 145);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#11161c';
  ctx.stroke();

  // Gigi hiu putih tajam
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 8; i++) {
    const x = 95 + i * 44;
    ctx.beginPath();
    ctx.moveTo(x, 78 + i * 2);
    ctx.lineTo(x + 18, 122);
    ctx.lineTo(x + 34, 78 + i * 2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 8, 158 - i * 3);
    ctx.lineTo(x + 22, 126);
    ctx.lineTo(x + 36, 154 - i * 3);
    ctx.closePath();
    ctx.fill();
  }
  // Mata hiu garang di atas mulut
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(165, 42, 34, 14, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#11161c';
  ctx.beginPath();
  ctx.arc(158, 44, 9, 0, Math.PI * 2);
  ctx.fill();

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

export function buildDetailedSuperTucano(): BuildResult {
  const g = new THREE.Group();
  const yC = 1.48;
  const m = commonMats(3108);

  const darkGreyTex = solidNoiseTexture('#565c58', 3108, 0.032);
  const fuseMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    map: cloneRep(darkGreyTex, 2, 4),
    bumpMap: cloneRep(m.bump, 2.2, 4.4),
    bumpScale: 0.015,
    metalness: 0.42,
    roughness: 0.54,
  });
  const wingMat = new THREE.MeshStandardMaterial({
    color: '#5a605c',
    bumpMap: cloneRep(m.bump, 1.6, 1.6),
    bumpScale: 0.013,
    metalness: 0.44,
    roughness: 0.52,
  });
  const redSpinnerMat = new THREE.MeshStandardMaterial({ color: '#c8102e', metalness: 0.35, roughness: 0.32 });
  const bladeMat = new THREE.MeshStandardMaterial({ color: '#1b1e22', metalness: 0.45, roughness: 0.45 });

  // Badan Super Tucano kekar, dalam & berdinding tegak (pesawat serang turboprop berlapis baja)
  const cross = (z: number, th: number): [number, number] => {
    const s = Math.sin(th);
    const c = Math.cos(th);
    let rx = 0.90;
    let ryT = 0.94;
    let ryB = 0.84;
    let ys = 0;
    if (z >= 3.8) {
      const t = Math.max(0, Math.min(1, (6.25 - z) / (6.25 - 3.8)));
      rx = lerp(0.46, 0.88, Math.pow(t, 0.66));
      ryT = lerp(0.46, 0.92, Math.pow(t, 0.66));
      ryB = lerp(0.44, 0.82, Math.pow(t, 0.66));
      ys = lerp(0.06, 0, t);
    } else if (z < -1.0) {
      const t = Math.max(0, Math.min(1, (-1.0 - z) / (-1.0 - -6.4)));
      rx = lerp(0.90, 0.22, smoothstep(0, 1, t));
      ryT = lerp(0.94, 0.36, smoothstep(0, 1, t));
      ryB = lerp(0.84, 0.26, smoothstep(0, 1, t));
      ys = lerp(0, 0.18, t);
    }
    const px = Math.sign(s) * Math.pow(Math.abs(s), 0.86) * rx;
    const py = Math.sign(c) * Math.pow(Math.abs(c), 0.86) * (c >= 0 ? ryT : ryB);
    return [px, yC + ys + py];
  };

  const bodyZs = Array.from({ length: 56 }, (_, i) => lerp(-6.4, 6.25, i / 55));
  const fuseMesh = mkMesh(buildLoftGeometry(bodyZs.map((z) => ({ z, point: (th) => cross(z, th) })), 48, true, true), fuseMat);
  g.add(fuseMesh);

  // Spinner MERAH menyala + Baling-baling 5 bilah berputar (Hartzell 5-blade khas Super Tucano!)
  const spinnerPts = [
    new THREE.Vector2(0.47, 6.22),
    new THREE.Vector2(0.38, 6.54),
    new THREE.Vector2(0.20, 6.86),
    new THREE.Vector2(0.015, 7.08),
  ];
  const spinnerGeo = new THREE.LatheGeometry(spinnerPts, 28);
  spinnerGeo.rotateX(Math.PI / 2);
  const spinnerMesh = mkMesh(spinnerGeo, redSpinnerMat);
  spinnerMesh.position.y = yC + 0.06;
  g.add(spinnerMesh);

  // 5 bilah baling-baling + blur disc
  const propPivot = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const arm = new THREE.Group();
    const b = mkMesh(new THREE.BoxGeometry(0.18, 1.56, 0.036), bladeMat);
    b.position.y = 0.92;
    b.rotation.y = 0.34;
    arm.add(b);
    arm.rotation.z = (i * Math.PI * 2) / 5;
    propPivot.add(arm);
  }
  const blurMat = new THREE.MeshBasicMaterial({ color: '#d7e4ee', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const blur = new THREE.Mesh(new THREE.RingGeometry(0.24, 1.68, 64), blurMat);
  blur.userData.role = 'blur';
  blur.visible = false;
  const propWrap = new THREE.Group();
  propWrap.position.set(0, yC + 0.06, 6.48);
  propWrap.add(propPivot, blur);
  g.add(propWrap);
  const spinners: SpinnerFx[] = [{ obj: propPivot, axis: 'z', speed: 40, blur }];

  // Pipa knalpot PT6A-68C di kedua sisi hidung
  for (const s of [1, -1]) {
    const ex = mkMesh(new THREE.CylinderGeometry(0.095, 0.115, 0.38, 10), m.darkMetal);
    ex.rotation.z = (Math.PI / 2) * s;
    ex.position.set(s * 0.78, yC + 0.10, 4.95);
    g.add(ex);
  }

  // Kanopi tandem 2 kursi panjang khas Super Tucano
  const canopyZs = Array.from({ length: 28 }, (_, i) => lerp(0.45, 3.75, i / 27));
  g.add(
    mkMesh(
      buildLoftGeometry(
        canopyZs.map((z) => {
          const u = Math.max(0, Math.min(1, (z - 0.45) / 3.3));
          const arch = Math.max(0, Math.sin(Math.pow(u, 0.74) * Math.PI));
          return {
            z,
            point: (th) => {
              const a = (th / (Math.PI * 2)) * Math.PI - Math.PI / 2;
              return [Math.sin(a) * 0.64 * Math.pow(arch, 0.55), 2.30 + Math.cos(a) * 0.70 * arch];
            },
          };
        }),
        32,
      ),
      m.glass,
      'glass',
    ),
  );
  const midArch = mkMesh(new THREE.TorusGeometry(0.41, 0.024, 8, 20, Math.PI), m.frame);
  midArch.position.set(0, 2.0, 2.15);
  g.add(midArch);
  const hud = mkMesh(new THREE.PlaneGeometry(0.16, 0.18), m.hud, 'cockpit');
  hud.position.set(0, 2.24, 3.15);
  hud.rotation.x = -0.55;
  g.add(hud);
  addSeat(g, 2.68, 1.96, m.frame, m.darkMetal, 0.92);
  addSeat(g, 1.58, 2.08, m.frame, m.darkMetal, 0.92);

  // Sayap lurus rendah (low straight wing) dengan dihedral + senapan mesin .50 cal internal
  const wingSecs: AirfoilSection[] = [
    { spanPos: 0.45, leZ: 2.0, teZ: 0.05, offset: 1.06, thick: 0.22 },
    { spanPos: 3.1, leZ: 1.65, teZ: 0.25, offset: 1.24, thick: 0.16 },
    { spanPos: 5.95, leZ: 1.22, teZ: 0.45, offset: 1.44, thick: 0.09 },
  ];
  const wingR = mkMesh(buildAirfoilSurface(wingSecs, 'horizontal', 1, 0.12), wingMat);
  const wingL = mkMesh(buildAirfoilSurface(wingSecs, 'horizontal', -1, 0.12), wingMat);
  g.add(wingR, wingL);

  // Stabilator lurus belakang
  const stabSecs: AirfoilSection[] = [
    { spanPos: 0.18, leZ: -4.75, teZ: -5.95, offset: 1.72, thick: 0.09 },
    { spanPos: 2.35, leZ: -5.15, teZ: -5.92, offset: 1.72, thick: 0.045 },
  ];
  g.add(
    mkMesh(buildAirfoilSurface(stabSecs, 'horizontal', 1, 0), wingMat),
    mkMesh(buildAirfoilSurface(stabSecs, 'horizontal', -1, 0), wingMat),
  );

  // Sirip ekor tegak dengan dorsal fillet panjang khas Super Tucano
  const finMesh = mkMesh(
    buildAirfoilSurface(
      [
        { spanPos: 1.82, leZ: -2.85, teZ: -6.28, offset: 0, thick: 0.14 },
        { spanPos: 2.35, leZ: -4.45, teZ: -6.28, offset: 0, thick: 0.12 },
        { spanPos: 4.02, leZ: -5.32, teZ: -6.22, offset: 0, thick: 0.065 },
      ],
      'vertical',
      1,
      0,
    ),
    wingMat,
  );
  g.add(finMesh);

  // Turret kamera FLIR di bawah perut + tangki bahan bakar centerline + pod roket bawah sayap
  const flir = mkMesh(new THREE.SphereGeometry(0.18, 16, 12), m.darkMetal);
  flir.position.set(0, 0.9, -0.45);
  g.add(flir);
  addPodTank(g, [0, 0.72, 1.35], 2.55, 0.2, wingMat);
  for (const s of [1, -1]) {
    const p = mkMesh(new THREE.BoxGeometry(0.065, 0.22, 0.95), m.darkMetal);
    p.position.set(s * 2.35, 1.0, 1.0);
    g.add(p);
    addPodTank(g, [s * 2.35, 0.8, 1.05], 1.85, 0.14, m.darkMetal);
  }

  addTricycleGear(g, { nz: 4.75, nr: 0.21, mz: 0.85, mx: 1.65, mr: 0.28, topY: 1.06 }, { strut: m.strut, tire: m.tire, light: m.taxiLight });

  // Internal X-Ray
  for (let z = -5.2; z <= 5.2; z += 0.9) {
    const rib = mkMesh(new THREE.TorusGeometry(0.38, 0.02, 6, 26), m.internal, 'internal');
    rib.position.set(0, yC, z);
    g.add(rib);
  }
  const engine = mkMesh(new THREE.CylinderGeometry(0.28, 0.28, 2.1, 16), m.core, 'internal');
  engine.rotation.x = Math.PI / 2;
  engine.position.set(0, yC + 0.04, 4.9);
  g.add(engine);

  // Decal Shark-Mouth + Roundel + TNI AU + TT-3108 (depth tipis agar tidak tembus!)
  const sharkTex = sharkMouthTexture();
  const roundelTex = roundelTexture();
  const flagTex = flagTexture();
  const tniAuTex = textTexture('TNI AU', { color: '#e6ece8', aspect: 3.8 });
  const tailCodeTex = textTexture('TT-3108', { color: '#e6ece8', aspect: 4.2 });

  addDecal(g, wingR, [4.2, 1.46, 0.9], [-Math.PI / 2, 0, 0], [1.0, 1.0, 0.4], roundelTex);
  addDecal(g, wingL, [-4.2, 1.46, 0.9], [-Math.PI / 2, 0, 0], [1.0, 1.0, 0.4], roundelTex);
  for (const s of [1, -1]) {
    const rot: V3 = [0, (s * Math.PI) / 2, 0];
    // Shark-mouth di kedua sisi hidung
    addDecal(g, fuseMesh, [s * 0.72, 1.48, 4.95], rot, [2.15, 0.96, 0.34], sharkTex);
    addDecal(g, finMesh, [s * 0.05, 3.5, -5.78], rot, [0.72, 0.46, 0.08], flagTex);
    addDecal(g, fuseMesh, [s * 0.60, 1.70, -3.55], rot, [1.45, 0.40, 0.30], tailCodeTex);
    addDecal(g, fuseMesh, [s * 0.82, 1.66, -1.45], rot, [1.45, 0.40, 0.32], tniAuTex);
  }

  return {
    group: g,
    nozzles: [],
    spinners,
    navLights: [
      { pos: [5.98, 1.44, 0.9], color: '#ff2a2a' },
      { pos: [-5.98, 1.44, 0.9], color: '#22ff66' },
      { pos: [0, 4.08, -6.18], color: '#ffffff', blink: 'strobe' },
      { pos: [0, 2.08, -2.2], color: '#ff3030', blink: 'beacon' },
    ],
    glowMats: [m.glow],
    hoverHeight: 0.85,
  };
}
