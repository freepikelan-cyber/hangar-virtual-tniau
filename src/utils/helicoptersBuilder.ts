import * as THREE from 'three';
import { addDecal, buildAirfoilSurface, buildLoftGeometry, lerp, mkMesh, smoothstep } from './aeroGeo';
import { addConformalCanopy } from './helicoptersPackBuilder';
import { camoTexture, flagTexture, roundelTexture, solidNoiseTexture, textTexture } from './textures';
import type { BuildResult, NavLightFx, SpinnerFx } from './proceduralBuilder';

/**
 * Membangun helikopter TNI AU realistis (lofting aerodinamis):
 * 1. Airbus H225M Caracal (Skadron Udara 8 Lanud Atang Sendjaja — 5 bilah rotor, probe BBM udara, FLIR, winch SAR, roda retractable)
 * 2. Airbus / Eurocopter EC120B Colibri (Skadron Udara 7 Lanud Suryadarma & Dynamic Pegasus — 3 bilah rotor, Fenestron tertutup, kokpit panoramik, skid)
 */

function makeHeliMaterials(livery: 'caracal' | 'colibri') {
  const camoTex =
    livery === 'caracal'
      ? camoTexture('#4a6132', [{ c: '#6e4b30', n: 18, r: 64 }, { c: '#232c20', n: 12, r: 44 }], 7220, { noise: 0.035 })
      : solidNoiseTexture('#c4ccd4', 1201, 0.025);

  const skin = new THREE.MeshStandardMaterial({
    map: camoTex,
    roughness: livery === 'caracal' ? 0.54 : 0.32,
    metalness: 0.26,
  });
  const darkMetal = new THREE.MeshStandardMaterial({
    color: '#232a32',
    roughness: 0.38,
    metalness: 0.78,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: '#9aa6b4',
    roughness: 0.28,
    metalness: 0.88,
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: '#091726',
    roughness: 0.04,
    metalness: 0.36,
    transparent: true,
    opacity: 0.86,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    envMapIntensity: 1.9,
  });
  const blade = new THREE.MeshStandardMaterial({
    color: '#1e242b',
    roughness: 0.42,
    metalness: 0.35,
  });
  const yellowTip = new THREE.MeshStandardMaterial({
    color: '#ffb703',
    roughness: 0.35,
    metalness: 0.2,
  });
  const tire = new THREE.MeshStandardMaterial({
    color: '#161a1f',
    roughness: 0.88,
    metalness: 0.06,
  });
  const exhaust = new THREE.MeshStandardMaterial({
    color: '#343a40',
    roughness: 0.32,
    metalness: 0.85,
  });
  const accent = new THREE.MeshStandardMaterial({
    color: '#e63946',
    roughness: 0.36,
    metalness: 0.22,
  });
  const whiteAccent = new THREE.MeshStandardMaterial({
    color: '#eef2f6',
    roughness: 0.38,
    metalness: 0.15,
  });
  const seat = new THREE.MeshStandardMaterial({
    color: '#2a313a',
    roughness: 0.75,
    metalness: 0.1,
  });
  const glow = new THREE.MeshStandardMaterial({
    color: '#ff9e00',
    emissive: new THREE.Color('#ff7b00'),
    emissiveIntensity: 0.2,
    roughness: 0.2,
  });

  return { skin, darkMetal, metal, glass, blade, yellowTip, tire, exhaust, accent, whiteAccent, seat, glow };
}

/** Membuat rotor utama Spheriflex realistis (hub + swashplate + N bilah airfoil berujung kuning + blur disc). */
function buildMainRotor(
  bladeCount: number,
  radius: number,
  chord: number,
  mats: ReturnType<typeof makeHeliMaterials>,
) {
  const pivot = new THREE.Group();

  // Hub Spheriflex & tutup aerodinamis atas (beanie)
  const hubCap = mkMesh(new THREE.CylinderGeometry(0.28, 0.36, 0.18, 24), mats.darkMetal);
  hubCap.position.y = 0.08;
  pivot.add(hubCap);

  const hubTop = mkMesh(new THREE.SphereGeometry(0.32, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), mats.skin);
  hubTop.scale.set(1, 0.45, 1);
  hubTop.position.y = 0.16;
  pivot.add(hubTop);

  for (let i = 0; i < bladeCount; i++) {
    const a = (i / bladeCount) * Math.PI * 2;
    const arm = new THREE.Group();
    arm.rotation.y = a;

    // Pitch-horn & pangkal bilah
    const grip = mkMesh(new THREE.CylinderGeometry(0.055, 0.065, 0.55, 10), mats.metal);
    grip.rotation.z = Math.PI / 2;
    grip.position.set(0.38, 0.04, 0);
    arm.add(grip);

    // Bilah komposit utama tipis aerodinamis
    const bladeLen = radius - 0.55;
    const bMesh = mkMesh(new THREE.BoxGeometry(bladeLen, 0.032, chord), mats.blade);
    bMesh.position.set(0.55 + bladeLen / 2, 0.04, 0);
    bMesh.rotation.x = 0.07; // sudut pitch bilah
    arm.add(bMesh);

    // Ujung bilah kuning keselamatan
    const tip = mkMesh(new THREE.BoxGeometry(0.42, 0.034, chord * 0.96), mats.yellowTip);
    tip.position.set(radius - 0.21, 0.04, 0);
    tip.rotation.x = 0.07;
    arm.add(tip);

    pivot.add(arm);
  }

  // Disc blur transparan saat rotor berputar kencang
  const blur = mkMesh(
    new THREE.CylinderGeometry(radius, radius, 0.02, 48),
    new THREE.MeshStandardMaterial({
      color: '#cfd8e3',
      transparent: true,
      opacity: 0.22,
      roughness: 0.4,
      depthWrite: false,
    }),
  );
  blur.userData.role = 'blur';
  blur.visible = false;
  blur.position.y = 0.04;
  pivot.add(blur);

  return { pivot, blur };
}

/* ============================================================================
 * 1. AIRBUS H225M CARACAL TNI AU (SKADRON UDARA 8 LANUD ATANG SENDJAJA)
 * ============================================================================ */
export function buildDetailedCaracal(liveryId = 'camo'): BuildResult {
  const g = new THREE.Group();
  const m = makeHeliMaterials('caracal');
  if (liveryId === 'vip') {
    m.skin.map = solidNoiseTexture('#8b95a0', 7208, 0.025);
    m.skin.roughness = 0.38;
    m.skin.needsUpdate = true;
  }
  const glowMats: THREE.MeshStandardMaterial[] = [m.glow];

  // ---- 1. FUSELAGE UTAMA H225M CARACAL (LOFT ORGANIK HALUS z = -1.7 .. +5.35) ----
  const caracalCross = (z: number, th: number): [number, number] => {
    let rx = 1.08;
    let ryTop = 1.02;
    let ryBot = 0.78;
    let cy = 1.48;
    if (z > 2.4) {
      const t = smoothstep(2.4, 5.35, z);
      rx = lerp(1.08, 0.14, Math.pow(t, 1.45));
      ryTop = lerp(1.02, 0.12, Math.pow(t, 1.3));
      ryBot = lerp(0.78, 0.12, Math.pow(t, 1.55));
      cy = lerp(1.48, 1.06, Math.pow(t, 1.2));
    } else if (z < -0.7) {
      const t = smoothstep(-0.7, -1.85, z);
      rx = lerp(1.08, 0.56, t);
      ryTop = lerp(1.02, 0.62, t);
      ryBot = lerp(0.78, 0.34, t);
      cy = lerp(1.48, 1.82, t);
    }
    const s = Math.sin(th);
    const c = Math.cos(th);
    const sq = 0.76;
    const px = Math.sign(s) * Math.pow(Math.abs(s), sq) * rx;
    const ry = c >= 0 ? ryTop : ryBot;
    const py = cy + Math.sign(c) * Math.pow(Math.abs(c), sq) * ry;
    return [px, py];
  };
  const fuseZs: number[] = [];
  for (let i = 0; i <= 32; i++) fuseZs.push(lerp(-1.85, 5.35, i / 32));
  const fuseGeo = buildLoftGeometry(
    fuseZs.map((z) => ({ z, point: (th) => caracalCross(z, th) })),
    44,
    true,
    true,
  );
  const fuseMesh = mkMesh(fuseGeo, m.skin);
  g.add(fuseMesh);

  // ---- 2. KOKPIT KACA PANORAMIK CONFORMAL MENYATU MULUS + JENDELA DAGU ----
  addConformalCanopy(g, caracalCross, {
    zBack: 2.55,
    zFront: 4.35,
    thHalf: Math.PI * 0.37,
    centerY: 1.35,
    pillars: [0, -Math.PI * 0.24, Math.PI * 0.24],
    glassMat: m.glass,
    frameMat: m.darkMetal,
    chinWindows: true,
  });

  // Jendela kabin samping (4 jendela besar per sisi + pintu geser)
  for (const s of [1, -1] as const) {
    for (const wz of [2.15, 1.25, 0.35, -0.45]) {
      const win = mkMesh(new THREE.BoxGeometry(0.06, 0.44, 0.56), m.glass, 'glass');
      win.position.set(s * 1.07, 1.66, wz);
      g.add(win);
    }
    // Rel pintu geser samping
    const rail = mkMesh(new THREE.BoxGeometry(0.06, 0.06, 2.3), m.darkMetal);
    rail.position.set(s * 1.10, 1.18, 0.15);
    g.add(rail);
  }

  // ---- 3. RUMAH MESIN GANDA SAFRAN MAKILA 2A1 DI ATAP KABIN ----
  const cowlZs = Array.from({ length: 20 }, (_, i) => lerp(-1.55, 2.55, i / 19));
  const cowlGeo = buildLoftGeometry(
    cowlZs.map((z) => {
      const frontT = smoothstep(1.3, 2.55, z);
      const backT = smoothstep(-0.75, -1.55, z);
      const rx = lerp(0.76, 0.36, Math.max(frontT, backT));
      const ry = lerp(0.54, 0.22, Math.max(frontT, backT));
      return {
        z,
        point: (th) => [Math.sin(th) * rx, 2.46 + Math.cos(th) * ry],
      };
    }),
    32,
    true,
    true,
  );
  g.add(mkMesh(cowlGeo, m.skin));

  // Dual Intake Oval Depan + Dual Knalpot Miring Samping
  for (const s of [1, -1] as const) {
    const intakeLip = mkMesh(new THREE.TorusGeometry(0.24, 0.045, 10, 22), m.darkMetal);
    intakeLip.scale.set(0.92, 0.78, 1);
    intakeLip.position.set(s * 0.34, 2.54, 2.15);
    g.add(intakeLip);

    const intakeDark = mkMesh(new THREE.CylinderGeometry(0.22, 0.22, 0.14, 20), m.tire);
    intakeDark.rotation.x = Math.PI / 2;
    intakeDark.position.set(s * 0.34, 2.54, 2.08);
    g.add(intakeDark);

    // Pipa knalpot mesin Makila 2A1 miring ke belakang-samping
    const exh = mkMesh(new THREE.CylinderGeometry(0.18, 0.20, 0.85, 18), m.exhaust);
    exh.rotation.set(Math.PI / 2, 0, s * -0.45);
    exh.position.set(s * 0.82, 2.52, -0.85);
    g.add(exh);
  }

  // ---- 4. ROTOR UTAMA 5 BILAH SPHERIFLEX (TINGGI y = 3.28) ----
  const mast = mkMesh(new THREE.CylinderGeometry(0.14, 0.18, 0.58, 18), m.metal);
  mast.position.set(0, 3.04, 0.55);
  g.add(mast);

  const mainRotor = buildMainRotor(5, 6.45, 0.32, m);
  mainRotor.pivot.position.set(0, 3.30, 0.55);
  g.add(mainRotor.pivot);

  // ---- 5. SPONSON SAMPING BESAR + RODA PENDARAT RETRACTABLE ('landing-gear') ----
  for (const s of [1, -1] as const) {
    const sponsonGeo = buildLoftGeometry(
      Array.from({ length: 14 }, (_, i) => {
        const z = lerp(-1.55, 1.15, i / 13);
        const u = (z + 1.55) / 2.7;
        const env = Math.sin(Math.pow(Math.max(0, Math.min(1, u)), 0.85) * Math.PI);
        return {
          z,
          point: (th) => [s * (1.06 + Math.max(0, Math.sin(th) * s) * 0.42 * env + Math.sin(th) * 0.22 * env), 0.96 + Math.cos(th) * 0.38 * Math.max(0.25, env)],
        };
      }),
      22,
      true,
      true,
    );
    g.add(mkMesh(sponsonGeo, m.skin));
  }

  const gearGroup = new THREE.Group();
  gearGroup.name = 'landing-gear';
  g.add(gearGroup);

  // Roda utama kiri & kanan (masuk ke sponson saat terbang)
  for (const s of [1, -1] as const) {
    const strut = mkMesh(new THREE.CylinderGeometry(0.07, 0.08, 0.72, 12), m.metal);
    strut.position.set(s * 1.24, 0.58, -0.35);
    gearGroup.add(strut);

    for (const dx of [-0.11, 0.11]) {
      const wheel = mkMesh(new THREE.CylinderGeometry(0.28, 0.28, 0.14, 22), m.tire);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(s * 1.24 + dx, 0.28, -0.35);
      gearGroup.add(wheel);

      const hub = mkMesh(new THREE.CylinderGeometry(0.12, 0.12, 0.16, 14), m.metal);
      hub.rotation.z = Math.PI / 2;
      hub.position.set(s * 1.24 + dx, 0.28, -0.35);
      gearGroup.add(hub);
    }
  }
  // Roda hidung ganda
  const noseStrut = mkMesh(new THREE.CylinderGeometry(0.06, 0.07, 0.68, 12), m.metal);
  noseStrut.position.set(0, 0.52, 3.65);
  gearGroup.add(noseStrut);
  for (const dx of [-0.12, 0.12]) {
    const nWheel = mkMesh(new THREE.CylinderGeometry(0.20, 0.20, 0.12, 20), m.tire);
    nWheel.rotation.z = Math.PI / 2;
    nWheel.position.set(dx, 0.20, 3.65);
    gearGroup.add(nWheel);
  }

  // ---- 6. PERALATAN KHAS H225M CARACAL: PROBE BBM UDARA, FLIR TURRET, & WINCH SAR ----
  // Probe pengisian bahan bakar di udara (In-Flight Refueling Probe di kanan hidung)
  const probeTube = mkMesh(new THREE.CylinderGeometry(0.045, 0.075, 2.55, 14), m.darkMetal);
  probeTube.rotation.x = Math.PI / 2;
  probeTube.position.set(0.68, 0.92, 4.45);
  g.add(probeTube);
  const probeTip = mkMesh(new THREE.CylinderGeometry(0.06, 0.045, 0.24, 14), m.metal);
  probeTip.rotation.x = Math.PI / 2;
  probeTip.position.set(0.68, 0.92, 5.75);
  g.add(probeTip);

  // Kamera FLIR / EO Star SAFIRE di bawah hidung
  const flirMount = mkMesh(new THREE.CylinderGeometry(0.12, 0.16, 0.22, 14), m.darkMetal);
  flirMount.position.set(0, 0.80, 4.78);
  g.add(flirMount);
  const flirBall = mkMesh(new THREE.SphereGeometry(0.24, 20, 16), m.darkMetal);
  flirBall.position.set(0, 0.62, 4.82);
  g.add(flirBall);
  const flirLens = mkMesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 16), m.glass, 'glass');
  flirLens.rotation.x = Math.PI / 2;
  flirLens.position.set(0, 0.60, 5.04);
  g.add(flirLens);

  // Rescue Hoist Winch SAR di atas pintu kanan
  const hoist = mkMesh(new THREE.CylinderGeometry(0.12, 0.12, 0.52, 16), m.darkMetal);
  hoist.rotation.x = Math.PI / 2;
  hoist.position.set(1.24, 2.22, 0.65);
  g.add(hoist);

  // ---- 7. TAIL BOOM RAMPING + SIRIP TEGAK + STABILIZER ASIMETRIS + ROTOR EKOR 4 BILAH ----
  const boomGeo = buildLoftGeometry(
    Array.from({ length: 16 }, (_, i) => {
      const z = lerp(-7.15, -1.75, i / 15);
      const t = (z + 7.15) / 5.4;
      const rx = lerp(0.24, 0.56, t);
      const ry = lerp(0.28, 0.58, t);
      const cy = lerp(1.94, 1.82, t);
      return { z, point: (th) => [Math.sin(th) * rx, cy + Math.cos(th) * ry] };
    }),
    26,
    true,
    true,
  );
  const boomMesh = mkMesh(boomGeo, m.skin);
  g.add(boomMesh);

  // Sirip tegak miring ke belakang (Swept Vertical Fin)
  const vFinGeo = buildAirfoilSurface(
    [
      { spanPos: 1.75, leZ: -5.85, teZ: -7.25, offset: 0, thick: 0.28 },
      { spanPos: 2.75, leZ: -6.45, teZ: -7.55, offset: 0, thick: 0.22 },
      { spanPos: 3.55, leZ: -6.95, teZ: -7.75, offset: 0, thick: 0.16 },
    ],
    'vertical',
    1,
    0,
  );
  const vFinMesh = mkMesh(vFinGeo, m.skin);
  g.add(vFinMesh);

  // Stabilizer horizontal khas Caracal (di sisi kiri tail boom)
  const hStabGeo = buildAirfoilSurface(
    [
      { spanPos: 0.18, leZ: -6.15, teZ: -6.95, offset: 2.02, thick: 0.12 },
      { spanPos: 1.55, leZ: -6.32, teZ: -6.92, offset: 2.06, thick: 0.08 },
    ],
    'horizontal',
    -1,
    0.04,
  );
  g.add(mkMesh(hStabGeo, m.skin));

  // Rotor ekor 4 bilah (sisi kanan puncak sirip tegak)
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0.32, 3.05, -7.25);
  const trHub = mkMesh(new THREE.CylinderGeometry(0.12, 0.14, 0.24, 16), m.darkMetal);
  trHub.rotation.z = Math.PI / 2;
  tailPivot.add(trHub);
  for (let i = 0; i < 4; i++) {
    const tb = mkMesh(new THREE.BoxGeometry(0.03, 1.25, 0.15), m.blade);
    tb.rotation.x = (i / 4) * Math.PI * 2;
    tb.position.set(0.10, Math.cos((i / 4) * Math.PI * 2) * 0.62, Math.sin((i / 4) * Math.PI * 2) * 0.62);
    tailPivot.add(tb);
  }
  const trBlur = mkMesh(
    new THREE.CylinderGeometry(1.25, 1.25, 0.02, 32),
    new THREE.MeshStandardMaterial({ color: '#cfd8e3', transparent: true, opacity: 0.22, depthWrite: false }),
  );
  trBlur.rotation.z = Math.PI / 2;
  trBlur.userData.role = 'blur';
  trBlur.visible = false;
  tailPivot.add(trBlur);
  g.add(tailPivot);

  // ---- 8. MARKING RESMI TNI AU ----
  addDecal(g, vFinMesh, [0.14, 3.15, -7.15], [0, Math.PI / 2, 0], [0.65, 0.42, 0.18], flagTexture());
  addDecal(g, vFinMesh, [-0.14, 3.15, -7.15], [0, -Math.PI / 2, 0], [0.65, 0.42, 0.18], flagTexture());
  addDecal(g, boomMesh, [0.38, 1.94, -4.35], [0, Math.PI / 2, 0], [1.75, 0.34, 0.28], textTexture('TNI AU', { color: '#eef2f6', aspect: 4.5 }));
  addDecal(g, boomMesh, [-0.38, 1.94, -4.35], [0, -Math.PI / 2, 0], [1.75, 0.34, 0.28], textTexture('TNI AU', { color: '#eef2f6', aspect: 4.5 }));
  addDecal(g, fuseMesh, [1.08, 1.32, -0.85], [0, Math.PI / 2, 0], [0.64, 0.64, 0.28], roundelTexture());
  addDecal(g, fuseMesh, [-1.08, 1.32, -0.85], [0, -Math.PI / 2, 0], [0.64, 0.64, 0.28], roundelTexture());

  const spinners: SpinnerFx[] = [
    { obj: mainRotor.pivot, axis: 'y', speed: 15, blur: mainRotor.blur },
    { obj: tailPivot, axis: 'x', speed: 52, blur: trBlur },
  ];
  const navLights: NavLightFx[] = [
    { pos: [1.48, 0.98, -0.35], color: '#ff2a2a' },
    { pos: [-1.48, 0.98, -0.35], color: '#22ff66' },
    { pos: [0, 3.62, -7.45], color: '#ffffff', blink: 'strobe' },
    { pos: [0, 2.98, -1.35], color: '#ff3030', blink: 'beacon' },
  ];

  return { group: g, nozzles: [], spinners, navLights, glowMats, hoverHeight: 2.4, rotorWash: true };
}

/* ============================================================================
 * 2. EUROCOPTER / AIRBUS EC120B COLIBRI TNI AU (HL-1211)
 *    Sesuai foto asli: Livery Putih-Abu Elegan, Ujung Sirip Ekor & Ventral Oranye-Kuning,
 *    Marking "TNI-AU" hitam di tail boom, "HL-1211" + Merah Putih di sirip atas,
 *    Roundel Segilima di samping kabin, Fairing Skid belakang, & Fenestron terbuka.
 * ============================================================================ */
function makeColibriFuseTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  // Dasar putih bersih glossy
  ctx.fillStyle = '#eef2f6';
  ctx.fillRect(0, 0, 512, 512);
  // Zona abu-abu elegan di bagian samping-tengah badan (sesuai foto HL-1211)
  ctx.fillStyle = '#9aa4ae';
  ctx.fillRect(0, 145, 512, 220);
  // Garis pemisah putih & abu-abu tipis diagonal/aerodinamis
  ctx.fillStyle = '#eef2f6';
  ctx.fillRect(0, 134, 512, 12);
  ctx.fillStyle = '#6f7a85';
  ctx.fillRect(0, 362, 512, 6);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function buildDetailedColibri(liveryId = 'grey'): BuildResult {
  const g = new THREE.Group();
  const m = makeHeliMaterials('colibri');
  const glowMats: THREE.MeshStandardMaterial[] = [m.glow];
  const isGreyOps = liveryId === 'grey';

  // Material khusus livery Colibri TNI AU: Operasional Abu-Abu (H-1201) atau Latih Putih-Oranye (HL-1211)
  const colWhite = new THREE.MeshPhysicalMaterial({
    color: isGreyOps ? '#c4ccd4' : '#eef2f6',
    roughness: 0.24,
    metalness: 0.14,
    clearcoat: 0.65,
    clearcoatRoughness: 0.18,
  });
  const colGrey = new THREE.MeshPhysicalMaterial({
    color: isGreyOps ? '#b5bec8' : '#9aa4ae',
    roughness: 0.30,
    metalness: 0.20,
    clearcoat: 0.45,
  });
  const colFuseMat = new THREE.MeshPhysicalMaterial({
    map: isGreyOps ? solidNoiseTexture('#c4ccd4', 1201, 0.02) : makeColibriFuseTexture(),
    roughness: 0.26,
    metalness: 0.16,
    clearcoat: 0.6,
    clearcoatRoughness: 0.18,
  });
  const colOrange = new THREE.MeshPhysicalMaterial({
    color: isGreyOps ? '#c4ccd4' : '#e89310',
    roughness: 0.28,
    metalness: 0.15,
    clearcoat: 0.55,
  });
  const colBlack = new THREE.MeshStandardMaterial({
    color: '#1b2026',
    roughness: 0.45,
    metalness: 0.45,
  });
  const colSkidFairing = new THREE.MeshStandardMaterial({
    color: '#5b636b',
    roughness: 0.42,
    metalness: 0.32,
  });
  const colBlade = new THREE.MeshStandardMaterial({
    color: '#2c333b',
    roughness: 0.38,
    metalness: 0.42,
  });
  const colExhaust = new THREE.MeshStandardMaterial({
    color: '#5c5247', // Perunggu-abu knalpot panas Arrius 2F
    roughness: 0.35,
    metalness: 0.78,
  });

  // ---- 1. FUSELAGE TEARDROP RAMPING KHAS EC120B COLIBRI (z = -1.35 .. +4.15) ----
  const colibriCross = (z: number, th: number): [number, number] => {
    let rx = 0.94;
    let ryTop = 0.96;
    let ryBot = 0.68;
    let cy = 1.62;
    if (z > 1.35) {
      const t = smoothstep(1.35, 4.18, z);
      rx = lerp(0.94, 0.12, Math.pow(t, 1.35));
      ryTop = lerp(0.96, 0.10, Math.pow(t, 1.22));
      ryBot = lerp(0.68, 0.10, Math.pow(t, 1.48));
      cy = lerp(1.62, 1.34, Math.pow(t, 1.15));
    } else if (z < -0.15) {
      const t = smoothstep(-0.15, -1.35, z);
      rx = lerp(0.94, 0.32, t);
      ryTop = lerp(0.96, 0.40, t);
      ryBot = lerp(0.68, 0.24, t);
      cy = lerp(1.62, 1.94, t);
    }
    const s = Math.sin(th);
    const c = Math.cos(th);
    const px = Math.sign(s) * Math.pow(Math.abs(s), 0.84) * rx;
    const ry = c >= 0 ? ryTop : ryBot;
    const py = cy + Math.sign(c) * Math.pow(Math.abs(c), 0.84) * ry;
    return [px, py];
  };
  const fuseZs = Array.from({ length: 32 }, (_, i) => lerp(-1.35, 4.18, i / 31));
  const fuseGeo = buildLoftGeometry(
    fuseZs.map((z) => ({ z, point: (th) => colibriCross(z, th) })),
    44,
    true,
    true,
  );
  const fuseMesh = mkMesh(fuseGeo, colFuseMat);
  g.add(fuseMesh);

  // Garis pemisah diagonal putih-abu elegan di sisi badan (sesuai foto HL-1211)
  if (!isGreyOps) {
    for (const s of [1, -1] as const) {
      const diagStripe = mkMesh(new THREE.BoxGeometry(0.03, 0.09, 2.75), colWhite);
      diagStripe.position.set(s * 0.93, 1.68, 1.15);
      diagStripe.rotation.x = 0.42;
      g.add(diagStripe);
    }
  }

  // ---- 2. KOKPIT GELEMBUNG PANORAMIK CONFORMAL MENYATU 100% MULUS KHAS COLIBRI ----
  addConformalCanopy(g, colibriCross, {
    zBack: 1.55,
    zFront: 3.72,
    thHalf: Math.PI * 0.45,
    centerY: 1.52,
    pillars: [0, -Math.PI * 0.3, Math.PI * 0.3],
    glassMat: m.glass,
    frameMat: colBlack,
    chinWindows: true,
  });

  // Bingkai kaca depan & jendela pintu samping gelap khas Colibri
  for (const s of [1, -1] as const) {
    const frontWin = mkMesh(new THREE.BoxGeometry(0.05, 0.64, 1.18), m.glass, 'glass');
    frontWin.position.set(s * 0.92, 1.82, 2.05);
    g.add(frontWin);

    const rearWin = mkMesh(new THREE.BoxGeometry(0.05, 0.56, 0.62), m.glass, 'glass');
    rearWin.position.set(s * 0.93, 1.86, 1.02);
    g.add(rearWin);

    // Pilar pemisah jendela hitam
    const pillar = mkMesh(new THREE.BoxGeometry(0.06, 0.68, 0.08), colBlack);
    pillar.position.set(s * 0.94, 1.84, 1.42);
    g.add(pillar);

    // Ventilasi udara persegi hitam di belakang atas jendela (sesuai foto!)
    const vent = mkMesh(new THREE.BoxGeometry(0.08, 0.22, 0.28), colBlack);
    vent.position.set(s * 0.72, 2.48, 0.35);
    g.add(vent);
  }

  // Kursi pilot & kopilot di dalam kokpit
  for (const sx of [-0.35, 0.35]) {
    const seatBack = mkMesh(new THREE.BoxGeometry(0.36, 0.62, 0.12), m.seat, 'cockpit');
    seatBack.position.set(sx, 1.66, 1.92);
    g.add(seatBack);
  }

  // ---- 3. COWLING MESIN ARRIUS 2F KOTAK-MEMBULAT DI PUNGGUNG + KNALPOT BELAKANG ----
  const cowlGeo = buildLoftGeometry(
    Array.from({ length: 16 }, (_, i) => {
      const z = lerp(-1.28, 1.35, i / 15);
      const frontT = smoothstep(0.65, 1.35, z);
      const backT = smoothstep(-0.65, -1.28, z);
      const rx = lerp(0.68, 0.34, Math.max(frontT, backT));
      const ry = lerp(0.56, 0.26, Math.max(frontT, backT));
      return {
        z,
        point: (th) => {
          const s = Math.sin(th);
          const c = Math.cos(th);
          return [Math.sign(s) * Math.pow(Math.abs(s), 0.72) * rx, 2.46 + Math.sign(c) * Math.pow(Math.abs(c), 0.72) * ry];
        },
      };
    }),
    28,
    true,
    true,
  );
  g.add(mkMesh(cowlGeo, colWhite));

  // Pipa knalpot perunggu-abu keluar di belakang punggung cowling (persis seperti di foto!)
  const exhaustPipe = mkMesh(new THREE.CylinderGeometry(0.14, 0.18, 0.56, 20), colExhaust);
  exhaustPipe.rotation.x = Math.PI / 2 - 0.28;
  exhaustPipe.position.set(0, 2.54, -1.32);
  g.add(exhaustPipe);

  // Antena VHF miring di atas kokpit & di bawah tail boom
  const topAnt = mkMesh(new THREE.CylinderGeometry(0.012, 0.018, 0.75, 8), colBlack);
  topAnt.position.set(0, 2.62, 2.15);
  topAnt.rotation.x = -0.55;
  g.add(topAnt);

  // ---- 4. ROTOR UTAMA 3 BILAH SPHERIFLEX RAMPING (TANPA TIP KUNING, SESUAI FOTO) ----
  const mast = mkMesh(new THREE.CylinderGeometry(0.11, 0.14, 0.42, 16), m.metal);
  mast.position.set(0, 3.04, 0.62);
  g.add(mast);

  const mainPivot = new THREE.Group();
  mainPivot.position.set(0, 3.24, 0.62);
  const hubCap = mkMesh(new THREE.CylinderGeometry(0.24, 0.32, 0.16, 24), colBlack);
  mainPivot.add(hubCap);
  const hubDome = mkMesh(new THREE.SphereGeometry(0.26, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), colGrey);
  hubDome.scale.set(1, 0.42, 1);
  hubDome.position.y = 0.08;
  mainPivot.add(hubDome);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const arm = new THREE.Group();
    arm.rotation.y = a;
    const grip = mkMesh(new THREE.CylinderGeometry(0.05, 0.06, 0.50, 10), m.metal);
    grip.rotation.z = Math.PI / 2;
    grip.position.set(0.35, 0.02, 0);
    arm.add(grip);
    const bMesh = mkMesh(new THREE.BoxGeometry(5.15, 0.028, 0.25), colBlade);
    bMesh.position.set(0.50 + 5.15 / 2, 0.02, 0);
    bMesh.rotation.x = 0.06;
    arm.add(bMesh);
    mainPivot.add(arm);
  }
  const mainBlur = mkMesh(
    new THREE.CylinderGeometry(5.65, 5.65, 0.02, 48),
    new THREE.MeshStandardMaterial({ color: '#cfd8e3', transparent: true, opacity: 0.2, depthWrite: false }),
  );
  mainBlur.userData.role = 'blur';
  mainBlur.visible = false;
  mainPivot.add(mainBlur);
  g.add(mainPivot);

  // ---- 5. SKID PENDARAT HITAM + FAIRING KAKI BELAKANG ABU-ABU (PERSIS FOTO!) ----
  for (const s of [1, -1] as const) {
    // Rel skid hitam panjang di tanah
    const skidCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * 1.12, 0.08, -0.58),
      new THREE.Vector3(s * 1.12, 0.08, 2.38),
      new THREE.Vector3(s * 1.12, 0.36, 2.98),
    ]);
    g.add(mkMesh(new THREE.TubeGeometry(skidCurve, 24, 0.062, 12, false), colBlack));

    // Batang pijakan sejajar di atas skid (khas Colibri pada foto)
    const stepBar = mkMesh(new THREE.CylinderGeometry(0.036, 0.036, 2.35, 12), colBlack);
    stepBar.rotation.x = Math.PI / 2;
    stepBar.position.set(s * 1.12, 0.36, 1.05);
    g.add(stepBar);

    // Kaki penyangga depan miring ke depan
    const frontStrut = new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * 1.12, 0.12, 2.15),
      new THREE.Vector3(s * 0.92, 0.62, 2.42),
      new THREE.Vector3(s * 0.58, 1.06, 2.65),
    ]);
    g.add(mkMesh(new THREE.TubeGeometry(frontStrut, 14, 0.052, 10, false), colBlack));

    // Kaki penyangga belakang dengan FAIRING LEBAR ABU-ABU GELAP (sangat khas di foto HL-1211!)
    const rearFairing = mkMesh(new THREE.BoxGeometry(0.14, 0.96, 0.52), colSkidFairing);
    rearFairing.position.set(s * 0.92, 0.58, -0.22);
    rearFairing.rotation.z = s * 0.24;
    g.add(rearFairing);
  }

  // ---- 6. TAIL BOOM PUTIH-ABU + STABILIZER HORIZONTAL UJUNG ORANYE + FENESTRON ----
  const boomGeo = buildLoftGeometry(
    Array.from({ length: 16 }, (_, i) => {
      const z = lerp(-5.45, -1.25, i / 15);
      const t = (z + 5.45) / 4.2;
      const rx = lerp(0.18, 0.34, t);
      const ry = lerp(0.22, 0.40, t);
      const cy = lerp(1.98, 1.94, t);
      return { z, point: (th) => [Math.sin(th) * rx, cy + Math.cos(th) * ry] };
    }),
    26,
    true,
    true,
  );
  const boomMesh = mkMesh(boomGeo, colWhite);
  g.add(boomMesh);

  // Antena miring di bawah tail boom
  const tailAnt = mkMesh(new THREE.CylinderGeometry(0.012, 0.016, 0.72, 8), colBlack);
  tailAnt.position.set(0, 1.56, -4.15);
  tailAnt.rotation.x = 0.65;
  g.add(tailAnt);

  // Stabilizer horizontal ramping tepat di depan Fenestron + ujung oranye
  for (const s of [1, -1] as const) {
    const hStab = buildAirfoilSurface(
      [
        { spanPos: 0.16, leZ: -4.55, teZ: -5.12, offset: 2.02, thick: 0.09 },
        { spanPos: 1.05, leZ: -4.64, teZ: -5.10, offset: 2.02, thick: 0.07 },
      ],
      'horizontal',
      s,
      0.02,
    );
    g.add(mkMesh(hStab, colGrey));

    const stabTip = mkMesh(new THREE.BoxGeometry(0.18, 0.06, 0.44), colOrange);
    stabTip.position.set(s * 1.12, 2.02, -4.87);
    g.add(stabTip);
  }

  // ---- FENESTRON TERBUKA KHAS EC120B COLIBRI (PUTIH-ABU + UJUNG SIRIP & VENTRAL ORANYE-KUNING!) ----
  const fenCenterZ = -6.05;
  const fenCenterY = 2.08;

  // Cincin pelindung Fenestron putih-abu
  const fenShroud = mkMesh(new THREE.TorusGeometry(0.68, 0.14, 16, 40), colWhite);
  fenShroud.rotation.y = Math.PI / 2;
  fenShroud.position.set(0, fenCenterY, fenCenterZ);
  g.add(fenShroud);

  // Sirip tegak atas (bagian putih untuk bendera + HL-1211)
  const upperFinGeo = buildAirfoilSurface(
    [
      { spanPos: 2.60, leZ: -5.45, teZ: -6.58, offset: 0, thick: 0.19 },
      { spanPos: 3.42, leZ: -5.88, teZ: -6.78, offset: 0, thick: 0.14 },
    ],
    'vertical',
    1,
    0,
  );
  const upperFinMesh = mkMesh(upperFinGeo, colWhite);
  g.add(upperFinMesh);

  // Ujung atas sirip tegak warna ORANYE-KUNING menyala (persis foto HL-1211!)
  const finOrangeTip = buildAirfoilSurface(
    [
      { spanPos: 3.42, leZ: -5.88, teZ: -6.78, offset: 0, thick: 0.14 },
      { spanPos: 3.82, leZ: -6.05, teZ: -6.88, offset: 0, thick: 0.11 },
    ],
    'vertical',
    1,
    0,
  );
  g.add(mkMesh(finOrangeTip, colOrange));

  // Sirip bawah (Ventral Fin) warna ORANYE-KUNING + kawat tail bumper stinger
  const ventralFinGeo = buildAirfoilSurface(
    [
      { spanPos: 1.48, leZ: -5.58, teZ: -6.42, offset: 0, thick: 0.14 },
      { spanPos: 1.02, leZ: -5.92, teZ: -6.62, offset: 0, thick: 0.09 },
    ],
    'vertical',
    1,
    0,
  );
  g.add(mkMesh(ventralFinGeo, colOrange));

  const bumperWire = mkMesh(new THREE.CylinderGeometry(0.018, 0.018, 0.72, 8), colBlack);
  bumperWire.position.set(0, 0.92, -6.28);
  bumperWire.rotation.x = 0.78;
  g.add(bumperWire);

  // Kipas Fenestron 8 bilah + stator di dalam cincin
  const fenPivot = new THREE.Group();
  fenPivot.position.set(0, fenCenterY, fenCenterZ);
  const fenHub = mkMesh(new THREE.CylinderGeometry(0.15, 0.15, 0.22, 16), colBlack);
  fenHub.rotation.z = Math.PI / 2;
  fenPivot.add(fenHub);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const fb = mkMesh(new THREE.BoxGeometry(0.035, 0.48, 0.09), colBlade);
    fb.rotation.x = a;
    fb.position.set(0, Math.cos(a) * 0.30, Math.sin(a) * 0.30);
    fenPivot.add(fb);
  }
  const fenBlur = mkMesh(
    new THREE.CylinderGeometry(0.55, 0.55, 0.02, 28),
    new THREE.MeshStandardMaterial({ color: '#cfd8e3', transparent: true, opacity: 0.24, depthWrite: false }),
  );
  fenBlur.rotation.z = Math.PI / 2;
  fenBlur.userData.role = 'blur';
  fenBlur.visible = false;
  fenPivot.add(fenBlur);
  g.add(fenPivot);

  // ---- 7. MARKING PERSIS FOTO ASLI: Bendera + "HL-1211", "TNI AU" hitam, & Roundel ----
  addDecal(g, upperFinMesh, [0.10, 3.24, -6.28], [0, Math.PI / 2, 0], [0.42, 0.28, 0.18], flagTexture());
  addDecal(g, upperFinMesh, [-0.10, 3.24, -6.28], [0, -Math.PI / 2, 0], [0.42, 0.28, 0.18], flagTexture());
  addDecal(g, upperFinMesh, [0.10, 2.94, -6.18], [0, Math.PI / 2, 0], [0.85, 0.22, 0.18], textTexture('HL-1211', { color: '#111827', aspect: 3.8 }));
  addDecal(g, upperFinMesh, [-0.10, 2.94, -6.18], [0, -Math.PI / 2, 0], [0.85, 0.22, 0.18], textTexture('HL-1211', { color: '#111827', aspect: 3.8 }));
  addDecal(g, boomMesh, [0.28, 1.94, -3.55], [0, Math.PI / 2, 0], [1.45, 0.28, 0.25], textTexture('TNI AU', { color: '#111827', aspect: 4.5 }));
  addDecal(g, boomMesh, [-0.28, 1.94, -3.55], [0, -Math.PI / 2, 0], [1.45, 0.28, 0.25], textTexture('TNI AU', { color: '#111827', aspect: 4.5 }));
  addDecal(g, fuseMesh, [0.94, 1.44, 0.22], [0, Math.PI / 2, 0], [0.56, 0.56, 0.25], roundelTexture());
  addDecal(g, fuseMesh, [-0.94, 1.44, 0.22], [0, -Math.PI / 2, 0], [0.56, 0.56, 0.25], roundelTexture());

  const spinners: SpinnerFx[] = [
    { obj: mainPivot, axis: 'y', speed: 18, blur: mainBlur },
    { obj: fenPivot, axis: 'x', speed: 75, blur: fenBlur },
  ];
  const navLights: NavLightFx[] = [
    { pos: [1.18, 2.02, -4.87], color: '#ff2a2a' },
    { pos: [-1.18, 2.02, -4.87], color: '#22ff66' },
    { pos: [0, 3.88, -6.45], color: '#ff3030', blink: 'beacon' },
  ];

  return { group: g, nozzles: [], spinners, navLights, glowMats, hoverHeight: 2.3, rotorWash: true };
}
