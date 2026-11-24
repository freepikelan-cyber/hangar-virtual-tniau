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
import { camoTexture, flagTexture, panelBumpTexture, textTexture } from './textures';
import type { BuildResult, V3 } from './proceduralBuilder';

/* =========================================================================
 * Builder 3D Detail Tinggi: Dassault Rafale B F4 Standard TNI AU (T-0302)
 * Referensi: Foto Rafale B TNI AU (T-0302) — kamuflase abu dua nada + ekor gelap
 * Konvensi: Hidung +Z, Atas +Y, Roda menapak y = 0, Panjang ~14.4 unit.
 * ========================================================================= */

/** Penampang badan Rafale B: hidung runcing, kokpit tandem, punggung ramping, mesin kembar rapat. */
function rafaleCrossSection(z: number, theta: number, yCenter: number): [number, number] {
  const sinT = Math.sin(theta);
  const cosT = Math.cos(theta);

  let rx = 0.68;
  let ryTop = 0.5;
  let ryBot = 0.44;
  let yShift = 0;

  if (z >= 4.9) {
    // Radome ogive ramping dan tajam khas Rafale
    const t = Math.max(0, Math.min(1, (7.25 - z) / (7.25 - 4.9)));
    const r = Math.pow(t, 0.74) * 0.48;
    rx = r * 1.02;
    ryTop = r * 0.96;
    ryBot = r * 0.92;
    yShift = -0.18 * Math.pow(1 - t, 1.3);
  } else if (z >= 2.2) {
    // Forebody kokpit tandem
    const t = (4.9 - z) / (4.9 - 2.2);
    rx = lerp(0.49, 0.72, smoothstep(0, 1, t));
    ryTop = lerp(0.46, 0.54, smoothstep(0, 1, t));
    ryBot = lerp(0.44, 0.48, smoothstep(0, 1, t));
  } else if (z >= -4.8) {
    // Badan tengah menyatu mulus dengan rumah mesin kembar rapat
    const t = (2.2 - z) / (2.2 - -4.8);
    rx = lerp(0.72, 0.82, Math.sin(t * Math.PI * 0.75));
    ryTop = lerp(0.54, 0.48, t);
    ryBot = lerp(0.48, 0.42, t);
  } else {
    // Bagian belakang melebar sedikit horizontal (karena 2 mesin M88 berdampingan)
    const t = Math.max(0, Math.min(1, (-4.8 - z) / (-4.8 - -6.55)));
    rx = lerp(0.8, 0.78, t);
    ryTop = lerp(0.48, 0.42, t);
    ryBot = lerp(0.42, 0.38, t);
  }

  // Dorsal avionics spine ramping di belakang kanopi menyatu ke ekor
  let spine = 0;
  if (z < 1.85 && z > -6.3) {
    const rise = smoothstep(1.85, 1.25, z);
    const taper = smoothstep(-6.3, 0.5, z);
    const topMask = cosT > 0 ? Math.pow(cosT, 4.5) : 0;
    spine = 0.24 * rise * Math.pow(taper, 0.5) * topMask;
  }

  // Blended wing-body fillet di samping bawah
  let fillet = 0;
  if (z < 2.2 && z > -5.2) {
    const env = smoothstep(2.2, 0.6, z) * smoothstep(-5.2, -3.8, z);
    const sideMask = Math.pow(Math.abs(sinT), 2.5) * Math.exp(-Math.pow((cosT + 0.12) * 3.8, 2));
    fillet = 0.42 * env * sideMask;
  }

  const x = sinT * (rx + fillet);
  const ry = cosT >= 0 ? ryTop : ryBot;
  const y = yCenter + yShift + cosT * ry + spine;
  return [x, y];
}

/** Roundel segilima low-visibility (garis luar abu gelap) persis seperti foto Rafale TNI AU. */
function loVizRoundelTexture() {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const ctx = c.getContext('2d')!;
  ctx.strokeStyle = '#1e242b';
  ctx.lineWidth = 22;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
    const x = S / 2 + Math.cos(a) * 102;
    const y = S / 2 + 8 + Math.sin(a) * 102;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

/** Emblem kilat merah-kuning khas ekor Rafale TNI AU (seperti pada foto T-0302). */
function tailFlashTexture() {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const ctx = c.getContext('2d')!;
  // Sayap/kilat merah
  ctx.fillStyle = '#c81e24';
  ctx.beginPath();
  ctx.moveTo(45, 70);
  ctx.lineTo(135, 118);
  ctx.lineTo(118, 145);
  ctx.lineTo(220, 215);
  ctx.lineTo(148, 195);
  ctx.lineTo(160, 165);
  ctx.lineTo(78, 130);
  ctx.closePath();
  ctx.fill();
  // Aksen kuning/emas di atas kilat
  ctx.fillStyle = '#eab308';
  ctx.beginPath();
  ctx.moveTo(105, 58);
  ctx.lineTo(165, 108);
  ctx.lineTo(138, 136);
  ctx.lineTo(205, 175);
  ctx.lineTo(132, 152);
  ctx.lineTo(140, 122);
  ctx.closePath();
  ctx.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

/** Rudal BVR Meteor / MICA ramping. */
function buildRafaleMissile(
  group: THREE.Group,
  pos: V3,
  len: number,
  r: number,
  mats: { white: THREE.Material; dark: THREE.Material; yellow: THREE.Material },
) {
  const m = new THREE.Group();
  m.position.set(...pos);
  const body = mkMesh(new THREE.CylinderGeometry(r, r, len, 14), mats.white);
  body.rotation.x = Math.PI / 2;
  const nose = mkMesh(new THREE.ConeGeometry(r, r * 4, 14), mats.white);
  nose.rotation.x = Math.PI / 2;
  nose.position.z = len / 2 + r * 2;
  const band = mkMesh(new THREE.CylinderGeometry(r * 1.02, r * 1.02, 0.08, 14), mats.yellow);
  band.rotation.x = Math.PI / 2;
  band.position.z = len * 0.22;
  m.add(body, nose, band);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const fRear = mkMesh(new THREE.BoxGeometry(0.012, r * 3.4, 0.34), mats.dark);
    fRear.position.set(Math.cos(a) * r * 1.7, Math.sin(a) * r * 1.7, -len / 2 + 0.22);
    fRear.rotation.z = a - Math.PI / 2;
    m.add(fRear);
  }
  group.add(m);
}

/** Tangki bahan bakar supersonik centerline 1250L khas Rafale (seperti pada foto). */
function buildSupersonicTank(group: THREE.Group, pos: V3, mat: THREE.Material, finMat: THREE.Material) {
  const pts: THREE.Vector2[] = [];
  const len = 4.2;
  const rMax = 0.27;
  for (let i = 0; i <= 30; i++) {
    const u = i / 30;
    const z = (u - 0.5) * len;
    let r = rMax;
    if (u < 0.3) r = rMax * Math.pow(u / 0.3, 0.7);
    else if (u > 0.68) r = rMax * Math.pow((1 - u) / 0.32, 0.72);
    pts.push(new THREE.Vector2(Math.max(0.004, r), z));
  }
  const geo = new THREE.LatheGeometry(pts, 28);
  geo.rotateX(Math.PI / 2);
  const tank = mkMesh(geo, mat);
  tank.position.set(...pos);
  group.add(tank);

  for (const s of [1, -1]) {
    const f = mkMesh(new THREE.BoxGeometry(0.28, 0.018, 0.42), finMat);
    f.position.set(pos[0] + s * 0.2, pos[1], pos[2] - len * 0.38);
    f.rotation.z = s * -0.2;
    group.add(f);
  }
}

/** Roda pendarat Rafale (roda depan ganda tinggi + roda utama lebar). */
function buildRafaleGear(
  group: THREE.Group,
  mats: { strut: THREE.Material; tire: THREE.Material; dark: THREE.Material; belly: THREE.Material; light: THREE.Material },
) {
  const nz = 3.65;
  const nr = 0.22;
  const nStrut = mkMesh(new THREE.CylinderGeometry(0.048, 0.042, 0.96, 14), mats.strut);
  nStrut.position.set(0, nr + 0.48, nz);
  nStrut.rotation.x = 0.06;
  group.add(nStrut);

  const nBrace = mkMesh(new THREE.CylinderGeometry(0.025, 0.025, 0.72, 10), mats.strut);
  nBrace.position.set(0, 0.74, nz - 0.28);
  nBrace.rotation.x = -0.62;
  group.add(nBrace);

  const lamp = mkMesh(new THREE.CylinderGeometry(0.04, 0.04, 0.04, 12), mats.light);
  lamp.rotation.x = Math.PI / 2;
  lamp.position.set(0, 0.56, nz + 0.06);
  group.add(lamp);

  for (const s of [1, -1]) {
    const tire = mkMesh(new THREE.CylinderGeometry(nr, nr, 0.12, 24), mats.tire);
    tire.rotation.z = Math.PI / 2;
    tire.position.set(s * 0.12, nr, nz);
    const hub = mkMesh(new THREE.CylinderGeometry(nr * 0.54, nr * 0.54, 0.135, 16), mats.strut);
    hub.rotation.z = Math.PI / 2;
    hub.position.copy(tire.position);
    group.add(tire, hub);

    const door = mkMesh(new THREE.BoxGeometry(0.028, 0.36, 0.95), mats.belly);
    door.position.set(s * 0.26, 0.8, nz - 0.18);
    door.rotation.z = s * 0.12;
    group.add(door);
  }

  const mr = 0.31;
  const mz = -2.25;
  for (const s of [1, -1]) {
    const wx = s * 1.48;
    const strut = mkMesh(new THREE.CylinderGeometry(0.056, 0.048, 0.96, 14), mats.strut);
    strut.position.set(wx - s * 0.06, mr + 0.48, mz);
    strut.rotation.z = s * 0.14;
    group.add(strut);

    const brace = mkMesh(new THREE.CylinderGeometry(0.028, 0.028, 0.82, 10), mats.strut);
    brace.position.set(wx - s * 0.32, 0.82, mz + 0.18);
    brace.rotation.z = s * -0.52;
    group.add(brace);

    const door = mkMesh(new THREE.BoxGeometry(0.028, 0.46, 1.05), mats.belly);
    door.position.set(wx + s * 0.2, 0.86, mz);
    door.rotation.z = s * -0.1;
    group.add(door);

    const tire = mkMesh(new THREE.CylinderGeometry(mr, mr, 0.22, 28), mats.tire);
    tire.rotation.z = Math.PI / 2;
    tire.position.set(wx, mr, mz);
    const hub = mkMesh(new THREE.CylinderGeometry(mr * 0.54, mr * 0.54, 0.235, 18), mats.strut);
    hub.rotation.z = Math.PI / 2;
    hub.position.copy(tire.position);
    group.add(tire, hub);
  }
}

export function buildDetailedRafale(): BuildResult {
  const g = new THREE.Group();
  const yC = 1.54;

  // Kamuflase dua nada abu terang/sedang persis foto Rafale TNI AU (T-0302)
  const rafaleCamo = camoTexture(
    '#adb2b8',
    [
      { c: '#d8dce0', n: 15, r: 70 },
      { c: '#969ca4', n: 9, r: 48 },
    ],
    302,
    { noise: 0.024 },
  );
  const bump = panelBumpTexture(302);

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
    map: cloneRep(rafaleCamo, 1.6, 3.0),
    bumpMap: cloneRep(bump, 2.2, 4.4),
    bumpScale: 0.014,
    metalness: 0.42,
    roughness: 0.46,
  });

  const wingMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    map: cloneRep(rafaleCamo, 1.2, 1.2),
    bumpMap: cloneRep(bump, 1.6, 1.6),
    bumpScale: 0.013,
    metalness: 0.44,
    roughness: 0.45,
  });

  // Ekor tegak abu gelap sesuai foto Rafale TNI AU T-0302
  const darkTailMat = new THREE.MeshStandardMaterial({
    color: '#5a616b',
    bumpMap: cloneRep(bump, 1.4, 1.4),
    bumpScale: 0.013,
    metalness: 0.46,
    roughness: 0.48,
  });

  const radomeMat = new THREE.MeshStandardMaterial({
    color: '#9aa0a8',
    metalness: 0.25,
    roughness: 0.5,
  });

  const bellyMat = new THREE.MeshStandardMaterial({
    color: '#b8bdc4',
    bumpMap: cloneRep(bump, 1.4, 1.8),
    bumpScale: 0.01,
    metalness: 0.42,
    roughness: 0.48,
  });

  const darkMetal = new THREE.MeshStandardMaterial({ color: '#2b3038', metalness: 0.85, roughness: 0.3 });
  const titaniumMat = new THREE.MeshStandardMaterial({ color: '#55514c', metalness: 0.88, roughness: 0.26 });
  const intakeInnerMat = new THREE.MeshStandardMaterial({ color: '#090d12', metalness: 0.2, roughness: 0.9, side: THREE.DoubleSide });
  const frameMat = new THREE.MeshStandardMaterial({ color: '#1b2026', metalness: 0.5, roughness: 0.45 });
  const canopyGlassMat = new THREE.MeshPhysicalMaterial({
    color: '#b49868',
    metalness: 0.18,
    roughness: 0.04,
    transparent: true,
    opacity: 0.48,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    iridescence: 0.35,
    envMapIntensity: 2.1,
    side: THREE.DoubleSide,
  });
  const gearStrutMat = new THREE.MeshStandardMaterial({ color: '#cfd5dc', metalness: 0.72, roughness: 0.3 });
  const tireMat = new THREE.MeshStandardMaterial({ color: '#141619', metalness: 0.06, roughness: 0.92 });
  const pylonMat = new THREE.MeshStandardMaterial({ color: '#8f969e', metalness: 0.45, roughness: 0.46 });
  const missileWhite = new THREE.MeshStandardMaterial({ color: '#eaedf0', metalness: 0.3, roughness: 0.42 });
  const missileYellow = new THREE.MeshStandardMaterial({ color: '#eab308', metalness: 0.2, roughness: 0.5 });
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
  // 1. BADAN UTAMA RAFALE B + RADOME + PROBE PENGISIAN BAHAN BAKAR TETAP
  // =========================================================================
  const bodyZs: number[] = [];
  for (let i = 0; i <= 60; i++) bodyZs.push(-6.55 + (11.5 * i) / 60); // -6.55 .. +4.95
  const fuseMesh = mkMesh(
    buildLoftGeometry(
      bodyZs.map((z) => ({ z, point: (th) => rafaleCrossSection(z, th, yC) })),
      64,
    ),
    fuseMat,
  );
  g.add(fuseMesh);

  // Radome ogive tajam (z = 4.9 .. 7.25)
  const radomeZs: number[] = [];
  for (let i = 0; i <= 24; i++) radomeZs.push(4.9 + (2.35 * i) / 24);
  g.add(
    mkMesh(
      buildLoftGeometry(
        radomeZs.map((z) => ({ z, point: (th) => rafaleCrossSection(z, th, yC) })),
        48,
      ),
      radomeMat,
    ),
  );

  // Probe pengisian bahan bakar lengkung tetap di sisi kanan depan kanopi (ciri ikonik Rafale!)
  const probeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.32, 1.9, 4.45),
    new THREE.Vector3(0.36, 2.08, 4.95),
    new THREE.Vector3(0.38, 2.16, 5.55),
    new THREE.Vector3(0.38, 2.14, 5.82),
  ]);
  const probeTube = mkMesh(new THREE.TubeGeometry(probeCurve, 20, 0.032, 10, false), radomeMat);
  const probeTip = mkMesh(new THREE.CylinderGeometry(0.022, 0.032, 0.16, 10), darkMetal);
  probeTip.rotation.x = Math.PI / 2;
  probeTip.position.set(0.38, 2.14, 5.88);
  g.add(probeTube, probeTip);

  // Sensor elektro-optik OSF di depan kaca kokpit
  const osf = mkMesh(new THREE.SphereGeometry(0.075, 16, 12), canopyGlassMat, 'glass');
  osf.position.set(-0.08, 1.98, 4.88);
  g.add(osf);

  // =========================================================================
  // 2. SEMI-RECESSED KIDNEY SIDE AIR INTAKES + MESIN KEMBAR M88-2 RAPAT
  // =========================================================================
  for (const s of [1, -1]) {
    const ix = s * 0.68;
    const iy = 1.24;

    // Saluran intake samping melengkung (kidney duct) di bawah pangkal canard/sayap
    const ductMesh = mkMesh(
      buildLoftGeometry(
        Array.from({ length: 18 }, (_, i) => {
          const u = i / 17; // 0 belakang (z=-1.5) -> 1 depan (z=2.45)
          const z = lerp(-1.5, 2.45, u);
          const fade = smoothstep(-1.5, 0.4, z);
          const hw = 0.26 * fade + 0.06;
          const hh = 0.34 * fade + 0.06;
          return {
            z,
            point: (th) => {
              const sn = Math.sin(th);
              const cs = Math.cos(th);
              return [ix + sn * hw, iy + cs * hh];
            },
          };
        }),
        32,
      ),
      fuseMat,
    );
    g.add(ductMesh);

    const lip = mkMesh(new THREE.TorusGeometry(0.28, 0.028, 10, 28), darkMetal);
    lip.scale.set(0.88, 1.12, 1);
    lip.position.set(ix, iy, 2.45);
    const cav = mkMesh(new THREE.CircleGeometry(0.27, 28), intakeInnerMat);
    cav.scale.set(0.86, 1.1, 1);
    cav.position.set(ix, iy, 2.42);
    g.add(lip, cav);

    // Dua mesin Safran M88-2 rapat berdampingan (x = ±0.41)
    const ex = s * 0.41;
    const ey = 1.44;
    const nozZ = -6.52;

    const nozInner = mkMesh(new THREE.CylinderGeometry(0.34, 0.29, 0.68, 28, 1, true), darkMetal);
    nozInner.rotation.x = Math.PI / 2;
    nozInner.position.set(ex, ey, nozZ - 0.32);
    g.add(nozInner);

    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const petal = mkMesh(new THREE.BoxGeometry(0.13, 0.02, 0.66), i % 2 === 0 ? titaniumMat : darkMetal);
      petal.position.set(ex + Math.cos(a) * 0.33, ey + Math.sin(a) * 0.33, nozZ - 0.32);
      petal.rotation.z = a + Math.PI / 2;
      petal.rotateX(0.08);
      g.add(petal);
    }

    const flameFace = mkMesh(new THREE.CircleGeometry(0.29, 24), glowMat);
    flameFace.rotation.y = Math.PI;
    flameFace.position.set(ex, ey, nozZ - 0.14);
    g.add(flameFace);

    // Inti mesin internal (X-Ray)
    const shaft = mkMesh(new THREE.CylinderGeometry(0.09, 0.09, 4.8, 10), coreMat, 'internal');
    shaft.rotation.x = Math.PI / 2;
    shaft.position.set(ex, ey, -3.8);
    g.add(shaft);
    for (let i = 0; i < 6; i++) {
      const stage = mkMesh(new THREE.CylinderGeometry(0.28, 0.28, 0.18, 16), i >= 3 ? coreMat : internalMat, 'internal');
      stage.rotation.x = Math.PI / 2;
      stage.position.set(ex, ey, -1.7 - i * 0.82);
      g.add(stage);
    }
  }

  // =========================================================================
  // 3. KANOPI TANDEM 2 KURSI RAFALE B & KOKPIT GANDA (MARTIN-BAKER MK16)
  // =========================================================================
  const canopyZs: number[] = [];
  for (let i = 0; i <= 30; i++) canopyZs.push(1.55 + (3.25 * i) / 30); // 1.55 .. 4.80
  const canopyGeo = buildLoftGeometry(
    canopyZs.map((z) => {
      const u = (z - 1.55) / 3.25;
      const arch = Math.sin(Math.pow(u, 0.74) * Math.PI);
      const w = 0.44 * Math.pow(arch, 0.56);
      const h = 0.58 * arch;
      const baseY = lerp(2.06, 1.9, u);
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
    const sill = mkMesh(new THREE.BoxGeometry(0.036, 0.036, 3.0), frameMat);
    sill.position.set(s * 0.42, 1.98, 3.2);
    g.add(sill);
  }
  const midBow = mkMesh(new THREE.TorusGeometry(0.41, 0.024, 8, 24, Math.PI), frameMat);
  midBow.position.set(0, 2.0, 3.12);
  g.add(midBow);

  // Kokpit tandem terlihat langsung
  const tub = mkMesh(new THREE.BoxGeometry(0.68, 0.24, 2.45), frameMat, 'cockpit');
  tub.position.set(0, 1.92, 3.25);
  const hud = mkMesh(new THREE.PlaneGeometry(0.18, 0.22), hudGlassMat, 'cockpit');
  hud.position.set(0, 2.22, 4.18);
  hud.rotation.x = -0.56;
  const mfd = mkMesh(new THREE.PlaneGeometry(0.24, 0.11), mfdGlowMat, 'cockpit');
  mfd.position.set(0, 2.06, 4.08);
  mfd.rotation.y = Math.PI;
  g.add(tub, hud, mfd);

  for (const [sz, sy] of [
    [3.65, 1.94],
    [2.6, 2.05],
  ]) {
    const pan = mkMesh(new THREE.BoxGeometry(0.36, 0.08, 0.38), frameMat, 'cockpit');
    pan.position.set(0, sy, sz);
    const back = mkMesh(new THREE.BoxGeometry(0.34, 0.52, 0.09), frameMat, 'cockpit');
    back.position.set(0, sy + 0.24, sz - 0.18);
    back.rotation.x = -0.36;
    const head = mkMesh(new THREE.BoxGeometry(0.22, 0.16, 0.11), darkMetal, 'cockpit');
    head.position.set(0, sy + 0.48, sz - 0.26);
    g.add(pan, back, head);
  }

  // =========================================================================
  // 4. SAYAP DELTA MURNI, CLOSE-COUPLED CANARDS, & EKOR TEGAK GELAP + SPECTRA
  // =========================================================================
  const wingSections: AirfoilSection[] = [
    { spanPos: 0.72, leZ: 1.65, teZ: -5.15, offset: 1.44, thick: 0.22 },
    { spanPos: 2.0, leZ: 0.15, teZ: -5.05, offset: 1.42, thick: 0.16 },
    { spanPos: 3.55, leZ: -1.85, teZ: -4.92, offset: 1.4, thick: 0.11 },
    { spanPos: 5.05, leZ: -3.72, teZ: -4.78, offset: 1.38, thick: 0.06 },
  ];
  const wingR = mkMesh(buildAirfoilSurface(wingSections, 'horizontal', 1, 0.06), wingMat);
  const wingL = mkMesh(buildAirfoilSurface(wingSections, 'horizontal', -1, 0.06), wingMat);
  g.add(wingR, wingL);

  // Close-coupled Canards di belakang kokpit (sedikit lebih tinggi dari sayap delta)
  const canardSections: AirfoilSection[] = [
    { spanPos: 0.62, leZ: 3.1, teZ: 1.65, offset: 1.74, thick: 0.08 },
    { spanPos: 2.15, leZ: 1.98, teZ: 1.48, offset: 1.84, thick: 0.04 },
  ];
  g.add(
    mkMesh(buildAirfoilSurface(canardSections, 'horizontal', 1, 0), wingMat),
    mkMesh(buildAirfoilSurface(canardSections, 'horizontal', -1, 0), wingMat),
  );

  // Vertical Stabilizer abu gelap + fairing SPECTRA atas & pangkal (seperti foto T-0302!)
  const finSections: AirfoilSection[] = [
    { spanPos: 1.86, leZ: -2.4, teZ: -6.35, offset: 0, thick: 0.16 },
    { spanPos: 2.7, leZ: -3.65, teZ: -6.42, offset: 0, thick: 0.13 },
    { spanPos: 3.75, leZ: -4.85, teZ: -6.5, offset: 0, thick: 0.095 },
    { spanPos: 4.72, leZ: -5.82, teZ: -6.58, offset: 0, thick: 0.06 },
  ];
  const finMesh = mkMesh(buildAirfoilSurface(finSections, 'vertical', 1, 0), darkTailMat);
  g.add(finMesh);

  // Pod SPECTRA horizontal di puncak ekor tegak (ciri ikonik Rafale)
  const topSpectra = mkMesh(new THREE.CapsuleGeometry(0.068, 1.05, 8, 16), darkTailMat);
  topSpectra.rotation.x = Math.PI / 2;
  topSpectra.position.set(0, 4.72, -6.22);
  g.add(topSpectra);

  // Tabung fairing SPECTRA / parabrake di pangkal ekor di atas dua nozzle
  const baseFairing = mkMesh(new THREE.CylinderGeometry(0.11, 0.13, 2.35, 16), fuseMat);
  baseFairing.rotation.x = Math.PI / 2;
  baseFairing.position.set(0, 1.94, -5.8);
  const baseCap = mkMesh(new THREE.ConeGeometry(0.11, 0.25, 16), darkMetal);
  baseCap.rotation.x = -Math.PI / 2;
  baseCap.position.set(0, 1.94, -7.08);
  g.add(baseFairing, baseCap);

  // =========================================================================
  // 5. REL UJUNG SAYAP, TANGKI CENTERLINE SUPERSONIK (FOTO), & RUDAL METEOR
  // =========================================================================
  const ordMats = { white: missileWhite, dark: darkMetal, yellow: missileYellow };

  for (const s of [1, -1]) {
    // Wingtip MICA launch rail ramping (persis pada foto)
    const tipRail = mkMesh(new THREE.CapsuleGeometry(0.048, 1.65, 6, 12), fuseMat);
    tipRail.rotation.x = Math.PI / 2;
    tipRail.position.set(s * 5.08, 1.38, -4.15);
    g.add(tipRail);

    // Pylon sayap + Rudal BVR Meteor
    const pylon = mkMesh(new THREE.BoxGeometry(0.065, 0.24, 1.25), pylonMat);
    pylon.position.set(s * 2.55, 1.24, -3.1);
    g.add(pylon);
    buildRafaleMissile(g, [s * 2.55, 1.04, -2.9], 3.15, 0.075, ordMats);
  }

  // Tangki bahan bakar supersonik centerline (persis seperti di bawah perut pada foto)
  const cenPylon = mkMesh(new THREE.BoxGeometry(0.08, 0.24, 1.6), pylonMat);
  cenPylon.position.set(0, 1.0, -0.5);
  g.add(cenPylon);
  buildSupersonicTank(g, [0, 0.72, -0.35], fuseMat, pylonMat);

  // =========================================================================
  // 6. RODA PENDARAT DETAIL
  // =========================================================================
  buildRafaleGear(g, {
    strut: gearStrutMat,
    tire: tireMat,
    dark: darkMetal,
    belly: bellyMat,
    light: taxiLightMat,
  });

  // =========================================================================
  // 7. STRUKTUR INTERNAL (X-RAY)
  // =========================================================================
  for (let z = -5.6; z <= 5.2; z += 0.85) {
    const r = z > 3.6 ? 0.36 : 0.48;
    const rib = mkMesh(new THREE.TorusGeometry(r, 0.02, 6, 32), internalMat, 'internal');
    rib.position.set(0, yC, z);
    g.add(rib);
  }
  const radarDish = mkMesh(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 28), internalMat, 'internal');
  radarDish.rotation.x = Math.PI / 2;
  radarDish.position.set(0, yC - 0.06, 5.95);
  g.add(radarDish);

  const intFuel = mkMesh(
    new THREE.CapsuleGeometry(0.26, 2.4, 6, 16),
    new THREE.MeshStandardMaterial({ color: '#2a6f97', metalness: 0.4, roughness: 0.4 }),
    'internal',
  );
  intFuel.rotation.x = Math.PI / 2;
  intFuel.position.set(0, yC + 0.14, -0.4);
  g.add(intFuel);

  // =========================================================================
  // 8. LIVERY & MARKA TNI AU PERSIS FOTO (T-0302, LO-VIZ ROUNDEL, KILAT EKOR)
  // =========================================================================
  const loVizRoundel = loVizRoundelTexture();
  const flashTex = tailFlashTexture();
  const flagTex = flagTexture();
  const tniAuTex = textTexture('TNI AU', { color: '#1b2128', aspect: 3.6 });
  const tailCodeTex = textTexture('T-0302', { color: '#14191f', aspect: 4.0 });

  // Roundel segilima low-visibility di atas kedua sayap delta
  addDecal(g, wingR, [3.15, 1.48, -3.55], [-Math.PI / 2, 0, 0], [0.78, 0.78, 0.5], loVizRoundel);
  addDecal(g, wingL, [-3.15, 1.48, -3.55], [-Math.PI / 2, 0, 0], [0.78, 0.78, 0.5], loVizRoundel);

  // Marka ekor abu gelap: Bendera Merah-Putih, Emblem Kilat Merah-Kuning, dan T-0302
  for (const s of [1, -1]) {
    const rot: V3 = [0, (s * Math.PI) / 2, 0];
    addDecal(g, finMesh, [s * 0.06, 4.18, -6.05], rot, [0.58, 0.38, 0.3], flagTex);
    addDecal(g, finMesh, [s * 0.06, 3.45, -5.65], rot, [0.95, 0.95, 0.3], flashTex);
    addDecal(g, finMesh, [s * 0.06, 2.52, -5.15], rot, [1.28, 0.3, 0.3], tailCodeTex);

    // Roundel lo-viz + tulisan TNI AU di sisi samping badan
    addDecal(g, fuseMesh, [s * 0.76, 1.56, 0.45], rot, [0.46, 0.46, 0.6], loVizRoundel);
    addDecal(g, fuseMesh, [s * 0.78, 1.56, -0.45], rot, [1.05, 0.28, 0.6], tniAuTex);
  }

  return {
    group: g,
    nozzles: [
      { pos: [0.41, 1.44, -7.2], r: 0.29, kind: 'ab' },
      { pos: [-0.41, 1.44, -7.2], r: 0.29, kind: 'ab' },
    ],
    spinners: [],
    navLights: [
      { pos: [5.08, 1.38, -3.3], color: '#ff2a2a' },
      { pos: [-5.08, 1.38, -3.3], color: '#22ff66' },
      { pos: [0, 4.78, -6.65], color: '#ffffff', blink: 'strobe' },
    ],
    glowMats: [glowMat],
    hoverHeight: 0.9,
  };
}
