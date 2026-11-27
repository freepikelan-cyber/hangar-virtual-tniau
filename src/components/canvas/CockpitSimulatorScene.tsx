import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useHangarStore, useSelectedUnit } from '../../store/useHangarStore';
import {
  cockpitInput,
  cockpitTelemetry,
  getFlightProfileSpec,
  resetCockpitSimState,
  SIM_MISSIONS,
  type SimCameraMode,
} from '../../utils/cockpitSimState';
import { getProceduralAircraft } from '../../utils/proceduralBuilder';
import { cockpitSimAudio } from '../../utils/cockpitSimAudio';
import {
  buildMountainRangeGeometry,
  makeAirbaseGrassTexture,
  makeExplosionSmokeTexture,
  makeHangarMetalTexture,
  makeMountainDetailTextures,
  makeOceanTextures,
  makePhotorealCloudTexture,
  makeRealisticFireTexture,
  makeRunwayAsphaltTexture,
  makeShockwaveRingTexture,
  sampleMountainRangeHeight,
} from '../../utils/terrainTextures';
import {
  makeFighterHudControlTexture,
  makeFighterMainDashTexture,
  makeFighterRadarMfdTexture,
  makeFighterSideConsoleTexture,
  makeTransportEcamTexture,
  makeTransportMcpTexture,
  makeTransportNdTexture,
  makeTransportOverheadTexture,
  makeTransportPedestalTexture,
  makeTransportPfdTexture,
  makeTransportSideGaugeTexture,
} from '../../utils/cockpitPanelTextures';

/** 5 gugusan pegunungan 3D yang tersebar luas di sekeliling Lanud & kepulauan (semua memiliki deteksi tabrakan eksak!). */
const SIM_MOUNTAIN_POSITIONS: [number, number][] = [
  [-140, 680],
  [-480, 180],
  [580, 1520],
  [-920, 1340],
  [-280, -1080],
];

/** 10 Cincin Target Manuver Udara (dimulai lurus di depan ujung Runway 09 lalu membelok melintasi gunung & laut). */
const TARGET_RINGS: { pos: [number, number, number]; rotY: number }[] = [
  { pos: [0, 32, 230], rotY: 0 },
  { pos: [28, 56, 460], rotY: 0.18 },
  { pos: [115, 78, 670], rotY: 0.52 },
  { pos: [260, 92, 810], rotY: 1.05 },
  { pos: [410, 82, 760], rotY: 1.78 },
  { pos: [470, 68, 540], rotY: 2.55 },
  { pos: [410, 62, 280], rotY: 2.95 },
  { pos: [270, 74, 80], rotY: -2.45 },
  { pos: [110, 64, -90], rotY: -1.85 },
  { pos: [0, 44, -260], rotY: 0 },
];

/** Membuat tekstur 3 layar MFD kokpit militer menyala (Radar, Attitude/HSI, Engine/Systems). */
function makeMfdTexture(kind: 'radar' | 'hsi' | 'engine', unitCode: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#03130c';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 3;
  ctx.strokeRect(6, 6, 244, 244);

  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 15px monospace';

  if (kind === 'radar') {
    ctx.fillText('RDR // A-A SCAN', 18, 28);
    ctx.strokeStyle = 'rgba(16,185,129,0.45)';
    ctx.lineWidth = 1.5;
    [36, 68, 96].forEach((r) => {
      ctx.beginPath();
      ctx.arc(128, 138, r, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.moveTo(128, 42);
    ctx.lineTo(128, 234);
    ctx.moveTo(32, 138);
    ctx.lineTo(224, 138);
    ctx.stroke();
    // Sweep wedge
    ctx.fillStyle = 'rgba(52,211,153,0.22)';
    ctx.beginPath();
    ctx.moveTo(128, 138);
    ctx.arc(128, 138, 96, -1.1, -0.55);
    ctx.closePath();
    ctx.fill();
    // Target blips
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(156, 92, 8, 8);
    ctx.fillRect(92, 108, 8, 8);
    ctx.fillStyle = '#34d399';
    ctx.font = '12px monospace';
    ctx.fillText('RNG 40NM', 18, 240);
    ctx.fillText('TWS ACT', 176, 240);
  } else if (kind === 'hsi') {
    ctx.fillText('HSI // NAV MAP', 18, 28);
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(128, 136, 76, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#a7f3d0';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('N', 123, 54);
    ctx.fillText('S', 123, 228);
    ctx.fillText('E', 212, 141);
    ctx.fillText('W', 34, 141);
    // Aircraft symbol
    ctx.strokeStyle = '#ffb703';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(128, 112);
    ctx.lineTo(128, 158);
    ctx.moveTo(106, 136);
    ctx.lineTo(150, 136);
    ctx.stroke();
    ctx.fillStyle = '#34d399';
    ctx.font = '12px monospace';
    ctx.fillText('RWY 09', 18, 240);
    ctx.fillText('WPT 01', 186, 240);
  } else {
    ctx.fillText(`ENG // ${unitCode.slice(0, 10)}`, 18, 28);
    const bars = [
      { label: 'RPM 1', val: 0.84, col: '#34d399' },
      { label: 'RPM 2', val: 0.82, col: '#34d399' },
      { label: 'EGT °C', val: 0.68, col: '#fbbf24' },
      { label: 'FUEL', val: 0.92, col: '#38bdf8' },
      { label: 'HYD P', val: 0.88, col: '#34d399' },
    ];
    bars.forEach((b, i) => {
      const y = 58 + i * 34;
      ctx.fillStyle = '#a7f3d0';
      ctx.font = '12px monospace';
      ctx.fillText(b.label, 18, y + 12);
      ctx.fillStyle = '#0b291d';
      ctx.fillRect(88, y, 144, 16);
      ctx.fillStyle = b.col;
      ctx.fillRect(88, y, Math.round(144 * b.val), 16);
    });
    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('SYS OK • FLCS NORM', 18, 240);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeSimSkyTexture(mode: 'day' | 'sunset' | 'night'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  if (mode === 'sunset') {
    grad.addColorStop(0.0, '#161b48');
    grad.addColorStop(0.32, '#5a3166');
    grad.addColorStop(0.5, '#e87a48');
    grad.addColorStop(0.58, '#ffd27d');
    grad.addColorStop(1.0, '#1d1c38');
  } else if (mode === 'night') {
    grad.addColorStop(0.0, '#020612');
    grad.addColorStop(0.45, '#0b1e3d');
    grad.addColorStop(1.0, '#020612');
  } else {
    grad.addColorStop(0.0, '#0d47a1');
    grad.addColorStop(0.35, '#2b82eb');
    grad.addColorStop(0.5, '#8fd0ff');
    grad.addColorStop(0.56, '#dcf2ff');
    grad.addColorStop(1.0, '#1c4d84');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function CockpitWorldAndPhysics() {
  const { camera } = useThree();
  const unit = useSelectedUnit();
  const soundEnabled = useHangarStore((s) => s.soundEnabled);
  const timeOfDay = useHangarStore((s) => s.timeOfDay);
  const liveryId = useHangarStore((s) => s.selectedLivery[unit.id] ?? unit.liveries?.[0]?.id);

  const profile = useMemo(() => getFlightProfileSpec(unit.category), [unit.category]);
  const extAircraftGroup = useMemo(() => {
    const clone = getProceduralAircraft(unit.id, liveryId).group.clone(true);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });
    return clone;
  }, [unit.id, liveryId]);

  const cockpitRigRef = useRef<THREE.Group>(null);
  const extAircraftRef = useRef<THREE.Group>(null);
  const skyDomeRef = useRef<THREE.Mesh>(null);
  const oceanRef = useRef<THREE.Mesh>(null);
  const cloudRefs = useRef<(THREE.Sprite | null)[]>([]);
  const crashFireRef = useRef<THREE.Group>(null);
  const crashFlameRefs = useRef<(THREE.Sprite | null)[]>([]);
  const crashSmokeRefs = useRef<(THREE.Sprite | null)[]>([]);
  const crashEmberRefs = useRef<(THREE.Mesh | null)[]>([]);
  const crashShockwaveRef = useRef<THREE.Mesh>(null);
  const crashFlashLightRef = useRef<THREE.PointLight>(null);
  const stickPivotRef = useRef<THREE.Group>(null);
  const throttleLeverRef = useRef<THREE.Group>(null);
  const ringRefs = useRef<(THREE.Mesh | null)[]>([]);
  const passedSetRef = useRef<Set<number>>(new Set());
  const extGearLerp = useRef(0);

  const euler = useMemo(() => new THREE.Euler(0, 0, 0, 'YXZ'), []);
  const quat = useMemo(() => new THREE.Quaternion(), []);
  const headEuler = useMemo(() => new THREE.Euler(0, 0, 0, 'YXZ'), []);
  const headQuat = useMemo(() => new THREE.Quaternion(), []);
  const extEuler = useMemo(() => new THREE.Euler(0, 0, 0, 'YXZ'), []);
  const extQuat = useMemo(() => new THREE.Quaternion(), []);
  const forwardVec = useMemo(() => new THREE.Vector3(), []);
  const camOffset = useMemo(() => new THREE.Vector3(), []);
  const lookTarget = useMemo(() => new THREE.Vector3(), []);
  const camUpVec = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  // Tekstur & geometri dunia terbang 3D
  const skyTex = useMemo(() => makeSimSkyTexture(timeOfDay), [timeOfDay]);
  const runwayTex = useMemo(() => makeRunwayAsphaltTexture(), []);
  const grassTex = useMemo(() => makeAirbaseGrassTexture(), []);
  const hangarTex = useMemo(() => makeHangarMetalTexture(), []);
  const oceanTex = useMemo(() => {
    const t = makeOceanTextures();
    // Skala ulang repeat untuk lautan tak terbatas 11.000m x 11.000m agar ombak tetap tajam & alami
    t.map.repeat.set(140, 140);
    t.bumpMap.repeat.set(140, 140);
    return t;
  }, []);
  const mtnDetail = useMemo(() => makeMountainDetailTextures(), []);
  const cloudTex = useMemo(() => makePhotorealCloudTexture(), []);
  const fireTex = useMemo(() => makeRealisticFireTexture(), []);
  const expSmokeTex = useMemo(() => makeExplosionSmokeTexture(), []);
  const shockwaveTex = useMemo(() => makeShockwaveRingTexture(), []);
  const mtnGeo = useMemo(() => buildMountainRangeGeometry(520, 680), []);

  const isTransportCockpit = unit.category === 'Angkut & VIP';

  const mfdLeftTex = useMemo(() => makeMfdTexture('radar', unit.code), [unit.code]);
  const mfdCenterTex = useMemo(() => makeMfdTexture('hsi', unit.code), [unit.code]);
  const mfdRightTex = useMemo(() => makeMfdTexture('engine', unit.code), [unit.code]);

  // Tekstur detail kokpit khusus Pesawat Angkut/VIP (Glass Cockpit) & Pesawat Tempur (Sukhoi/Flanker-style)
  const transportPfdTex = useMemo(() => makeTransportPfdTexture(unit.code), [unit.code]);
  const transportNdTex = useMemo(() => makeTransportNdTexture(unit.code), [unit.code]);
  const transportEcamUpperTex = useMemo(() => makeTransportEcamTexture('upper', unit.code), [unit.code]);
  const transportEcamLowerTex = useMemo(() => makeTransportEcamTexture('lower', unit.code), [unit.code]);
  const transportMcpTex = useMemo(() => makeTransportMcpTexture(), []);
  const transportOverheadTex = useMemo(() => makeTransportOverheadTexture(), []);
  const transportPedestalTex = useMemo(() => makeTransportPedestalTexture(), []);
  const transportSideGaugeTex = useMemo(() => makeTransportSideGaugeTexture(), []);

  const fighterDashTex = useMemo(() => makeFighterMainDashTexture(unit.code), [unit.code]);
  const fighterRadarTex = useMemo(() => makeFighterRadarMfdTexture(unit.code), [unit.code]);
  const fighterHudCtrlTex = useMemo(() => makeFighterHudControlTexture(), []);
  const fighterSideConsoleTex = useMemo(() => makeFighterSideConsoleTexture(), []);

  const clouds = useMemo(() => {
    const arr: { x: number; y: number; z: number; s: number }[] = [];
    let seed = 7713;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 48; i++) {
      arr.push({
        x: (rand() - 0.5) * 4200,
        y: 110 + rand() * 340,
        z: (rand() - 0.5) * 4200,
        s: 52 + rand() * 76,
      });
    }
    return arr;
  }, []);

  useEffect(() => {
    resetCockpitSimState(profile.isVtol);
    passedSetRef.current.clear();
    cockpitTelemetry.totalRings = TARGET_RINGS.length;
    cockpitSimAudio.start();
    return () => {
      cockpitSimAudio.stop();
    };
  }, [unit.id, profile.isVtol]);

  useEffect(() => {
    return () => {
      skyTex.dispose();
      runwayTex.dispose();
      grassTex.dispose();
      hangarTex.dispose();
      oceanTex.map.dispose();
      oceanTex.bumpMap.dispose();
      mtnDetail.map.dispose();
      mtnDetail.bumpMap.dispose();
      cloudTex.dispose();
      fireTex.dispose();
      expSmokeTex.dispose();
      shockwaveTex.dispose();
      mtnGeo.dispose();
      mfdLeftTex.dispose();
      mfdCenterTex.dispose();
      mfdRightTex.dispose();
      transportPfdTex.dispose();
      transportNdTex.dispose();
      transportEcamUpperTex.dispose();
      transportEcamLowerTex.dispose();
      transportMcpTex.dispose();
      transportOverheadTex.dispose();
      transportPedestalTex.dispose();
      transportSideGaugeTex.dispose();
      fighterDashTex.dispose();
      fighterRadarTex.dispose();
      fighterHudCtrlTex.dispose();
      fighterSideConsoleTex.dispose();
    };
  }, [
    skyTex,
    runwayTex,
    grassTex,
    hangarTex,
    oceanTex,
    mtnDetail,
    cloudTex,
    mtnGeo,
    mfdLeftTex,
    mfdCenterTex,
    mfdRightTex,
    transportPfdTex,
    transportNdTex,
    transportEcamUpperTex,
    transportEcamLowerTex,
    transportMcpTex,
    transportOverheadTex,
    transportPedestalTex,
    transportSideGaugeTex,
    fighterDashTex,
    fighterRadarTex,
    fighterHudCtrlTex,
    fighterSideConsoleTex,
  ]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const tel = cockpitTelemetry;
    const inp = cockpitInput;

    // Dunia Terbang Tanpa Batas (Infinite Sky, Ocean & Clouds mengikuti pesawat secara mulus!)
    if (skyDomeRef.current) {
      skyDomeRef.current.position.set(tel.x, 0, tel.z);
    }
    if (oceanRef.current) {
      oceanRef.current.position.set(tel.x, -0.35, tel.z);
      const tileScale = 140 / 11000;
      const u = tel.x * tileScale;
      const v = -tel.z * tileScale - t * 0.055;
      oceanTex.map.offset.set(u, v);
      oceanTex.bumpMap.offset.set(u, v);
    }
    const cloudSpan = 4200;
    const cloudHalf = cloudSpan * 0.5;
    for (let i = 0; i < clouds.length; i++) {
      const sp = cloudRefs.current[i];
      if (!sp) continue;
      const cl = clouds[i];
      const wx = tel.x + ((((cl.x - tel.x + cloudHalf) % cloudSpan) + cloudSpan) % cloudSpan) - cloudHalf;
      const wz = tel.z + ((((cl.z - tel.z + cloudHalf) % cloudSpan) + cloudSpan) % cloudSpan) - cloudHalf;
      sp.position.set(wx, cl.y, wz);
    }

    // Ganti Misi Pelatihan jika dipilih
    if (inp.requestedMissionId !== null) {
      tel.missionId = inp.requestedMissionId;
      inp.requestedMissionId = null;
      resetCockpitSimState(profile.isVtol, true);
      passedSetRef.current.clear();
    }

    // Ganti Mode Kamera (Kokpit -> Ekor Chase -> Sayap -> Orbit)
    if (inp.cycleCameraRequested) {
      inp.cycleCameraRequested = false;
      const order: SimCameraMode[] = ['cockpit', 'chase', 'wing', 'orbit'];
      const nextIdx = (order.indexOf(tel.cameraMode) + 1) % order.length;
      tel.cameraMode = order[nextIdx];
      tel.lookYaw = 0;
      tel.lookPitch = 0;
    }

    // Reset posisi ke Runway 09
    if (inp.resetRequested) {
      resetCockpitSimState(profile.isVtol, true);
      passedSetRef.current.clear();
    }

    // Mode Pesawat Jatuh & Terbakar -> Efek ledakan fotorealistis lalu otomatis ulang setelah 4.2 detik!
    if (tel.crashed) {
      tel.crashTimer = Math.max(0, tel.crashTimer - dt);
      const elapsed = Math.max(0, 4.2 - tel.crashTimer);
      if (cockpitRigRef.current) cockpitRigRef.current.visible = false;
      if (extAircraftRef.current) {
        extAircraftRef.current.visible = true;
        extAircraftRef.current.position.set(tel.x, Math.max(0.6, tel.y - 1.2), tel.z);
        extEuler.set(-tel.pitch * 0.4, tel.yaw, tel.roll * 0.7, 'YXZ');
        extAircraftRef.current.quaternion.setFromEuler(extEuler);
      }
      if (crashFireRef.current) {
        crashFireRef.current.visible = true;
        crashFireRef.current.position.set(tel.x, Math.max(1.0, tel.y - 0.5), tel.z);

        // 1. Kilatan cahaya api dinamis menyinari bangkai pesawat & lereng gunung
        if (crashFlashLightRef.current) {
          const blastBoost = elapsed < 0.45 ? (1 - elapsed / 0.45) * 20 : 0;
          crashFlashLightRef.current.intensity = 7.5 + blastBoost + Math.sin(t * 34) * 2.4 + Math.cos(t * 21) * 1.5;
        }

        // 2. Cincin gelombang kejut ledakan (blast shockwave) mengembang cepat saat benturan
        if (crashShockwaveRef.current) {
          const swT = Math.min(1, elapsed / 0.85);
          crashShockwaveRef.current.visible = swT < 1;
          const swScale = 2.5 + swT * 28;
          crashShockwaveRef.current.scale.set(swScale, swScale, 1);
          const swMat = crashShockwaveRef.current.material as THREE.MeshBasicMaterial;
          swMat.opacity = (1 - swT) * (1 - swT) * 0.92;
        }

        // 3. 12 Lidah api volumetrik berkobar naik-turun bergolak realistis
        const blastExpand = elapsed < 0.5 ? 0.55 + (elapsed / 0.5) * 1.05 : Math.max(0.85, 1.6 - (elapsed - 0.5) * 0.14);
        crashFlameRefs.current.forEach((fl, idx) => {
          if (!fl) return;
          const phase = (t * (2.2 + (idx % 3) * 0.45) + idx * 0.53) % 1;
          const ang = idx * 2.399 + t * 0.35;
          const rad = (idx < 3 ? 0.6 : 1.4 + (idx % 4) * 0.85) * blastExpand;
          const riseY = phase * (idx < 3 ? 4.2 : 7.5) + (idx < 3 ? 0.8 : 1.4);
          fl.position.set(Math.cos(ang) * rad, riseY, Math.sin(ang) * rad);
          const sz = (idx < 3 ? 7.8 : 6.2 - phase * 2.2) * blastExpand * (0.9 + Math.sin(t * 26 + idx * 3) * 0.18);
          fl.scale.set(sz, sz * (1.18 + phase * 0.35), 1);
          const fMat = fl.material as THREE.SpriteMaterial;
          fMat.rotation = Math.sin(t * 3.5 + idx) * 0.45;
          fMat.opacity = Math.min(1, (1 - phase * 0.72) * (elapsed < 0.35 ? 1 : 0.88));
        });

        // 4. 14 Kepulan asap hitam pekat bahan bakar pesawat membumbung tinggi
        crashSmokeRefs.current.forEach((sm, idx) => {
          if (!sm) return;
          const rise = ((t * 0.55 + idx * 0.19) % 1);
          const swirlAng = idx * 1.9 + t * 0.5;
          const spread = 1.4 + rise * 7.5;
          sm.position.set(Math.cos(swirlAng) * spread, 2.2 + rise * 22, Math.sin(swirlAng) * spread);
          const sc = 4.8 + rise * 14.5;
          sm.scale.set(sc, sc * 1.08, 1);
          const sMat = sm.material as THREE.SpriteMaterial;
          sMat.rotation = t * (idx % 2 === 0 ? 0.35 : -0.35) + idx;
          sMat.opacity = Math.sin(rise * Math.PI) * 0.82;
        });

        // 5. 16 Percikan bara api & serpihan terbakar terpental balistik
        crashEmberRefs.current.forEach((em, idx) => {
          if (!em) return;
          const eT = (elapsed + idx * 0.04) % 2.4;
          const ang = idx * 2.39996;
          const horizSpd = 5.5 + (idx % 5) * 3.4;
          const upSpd = 9.0 + (idx % 4) * 3.8;
          const py = Math.max(0.2, 1.0 + upSpd * eT - 4.9 * eT * eT);
          em.position.set(Math.cos(ang) * horizSpd * eT, py, Math.sin(ang) * horizSpd * eT);
          const sc = Math.max(0.15, 1.0 - eT / 2.4);
          em.scale.set(sc, sc, sc);
        });
      }
      // Kamera mundur menyaksikan pesawat meledak & terbakar dengan getaran dampak
      const shake = tel.crashTimer > 3.2 ? (tel.crashTimer - 3.2) * 0.65 : 0.07;
      camera.position.set(
        tel.x - Math.sin(tel.yaw) * 19 + Math.sin(t * 45) * shake,
        Math.max(5.5, tel.y + 7.5) + Math.cos(t * 40) * shake,
        tel.z - Math.cos(tel.yaw) * 19,
      );
      lookTarget.set(tel.x, Math.max(1.8, tel.y + 1.5), tel.z);
      camera.lookAt(lookTarget);
      cockpitSimAudio.update(unit.category, 0, 0, false, false, false);

      if (tel.crashTimer <= 0) {
        resetCockpitSimState(profile.isVtol, true);
        passedSetRef.current.clear();
      }
      return;
    }

    if (crashFireRef.current) crashFireRef.current.visible = false;

    // Toggle roda pendarat (Gear)
    if (inp.toggleGearRequested) {
      inp.toggleGearRequested = false;
      if (!tel.onGround) {
        tel.gearDown = !tel.gearDown;
        cockpitSimAudio.playGearClick(soundEnabled);
      }
    }

    // 1. Baca input ganda (Keyboard + Touch Virtual Joystick & Slider)
    if (inp.keys.shift) {
      tel.throttle = Math.min(1, tel.throttle + dt * 0.55);
      inp.touchThrottle = tel.throttle;
    } else if (inp.keys.ctrl) {
      tel.throttle = Math.max(0, tel.throttle - dt * 0.55);
      inp.touchThrottle = tel.throttle;
    } else if (inp.touchThrottle !== null) {
      tel.throttle = THREE.MathUtils.clamp(inp.touchThrottle, 0, 1);
    }

    const keyPitch = (inp.keys.s ? 1 : 0) - (inp.keys.w ? 1 : 0); // S = tarik stick (naik), W = dorong (turun/maju)
    const keyRoll = (inp.keys.d ? 1 : 0) - (inp.keys.a ? 1 : 0); // D = kanan, A = kiri
    const rawPitchIn = THREE.MathUtils.clamp(keyPitch + inp.touchPitch, -1, 1);
    const rawRollIn = THREE.MathUtils.clamp(keyRoll + inp.touchRoll, -1, 1);

    tel.stickX = THREE.MathUtils.lerp(tel.stickX, rawRollIn, Math.min(1, dt * 10));
    tel.stickY = THREE.MathUtils.lerp(tel.stickY, rawPitchIn, Math.min(1, dt * 10));

    // 2. Fisika Terbang sesuai Kategori (VTOL Helikopter vs Sayap Tetap Tempur/Angkut/Latih)
    if (profile.isVtol) {
      // === HELIKOPTER VTOL ===
      // Throttle > 0.48 mengangkat helikopter lurus vertikal!
      const vertCmd = (tel.throttle - 0.48) * 34;
      if (tel.y <= 2.45 && vertCmd <= 0) {
        if (!tel.onGround && (vertCmd < -14 || Math.abs(tel.roll) > 0.48)) {
          tel.crashed = true;
          tel.crashTimer = 3.2;
          tel.crashReason = 'BENTURAN KERAS SAAT PENURUNAN HELIKOPTER';
          tel.speedKts = 0;
          tel.throttle = 0;
          cockpitSimAudio.playExplosionSfx(soundEnabled);
        } else {
          tel.y = 2.4;
          tel.onGround = true;
          tel.pitch = THREE.MathUtils.lerp(tel.pitch, 0, dt * 5);
          tel.roll = THREE.MathUtils.lerp(tel.roll, 0, dt * 5);
          tel.speedKts = THREE.MathUtils.lerp(tel.speedKts, 0, dt * 3);
        }
      } else {
        tel.onGround = false;
        tel.y = Math.max(2.4, tel.y + vertCmd * dt);
        const targetPitch = -rawPitchIn * 0.32; // dorong W = menunduk maju, tarik S = mengerem/hover
        const targetRoll = rawRollIn * 0.42;
        tel.pitch = THREE.MathUtils.lerp(tel.pitch, targetPitch, dt * 4.0);
        tel.roll = THREE.MathUtils.lerp(tel.roll, targetRoll, dt * 4.5);
        tel.yaw -= Math.sin(tel.roll) * profile.turnRate * dt;

        // Kecepatan maju didorong oleh kemiringan hidung ke depan (-pitch) + throttle
        const targetSpd = THREE.MathUtils.clamp(-tel.pitch * 420 + tel.throttle * 38, 0, profile.maxSpeedKts);
        tel.speedKts = THREE.MathUtils.lerp(tel.speedKts, targetSpd, dt * 1.4);
      }

      const speedMps = tel.speedKts * 0.24;
      tel.x += Math.sin(tel.yaw) * speedMps * dt;
      tel.z += Math.cos(tel.yaw) * speedMps * dt;
      tel.stallWarn = false;
      tel.pullUpWarn = !tel.onGround && tel.y < 14 && vertCmd < -8;
      tel.gForce = 1.0 + Math.abs(tel.roll) * 0.55;
    } else {
      // === PESAWAT SAYAP TETAP (TEMPUR / ANGKUT / LATIH) ===
      const gearDrag = tel.gearDown ? 0.08 : 0;
      const climbGravity = -Math.sin(tel.pitch) * 42;
      const targetAccel = tel.throttle * profile.accelRate - tel.speedKts * (profile.dragFactor + gearDrag) + climbGravity;
      tel.speedKts = THREE.MathUtils.clamp(tel.speedKts + targetAccel * dt, 0, profile.maxSpeedKts);

      if (tel.onGround) {
        tel.y = 2.4;
        tel.roll = THREE.MathUtils.lerp(tel.roll, 0, dt * 6);
        // Kemudi darat (nosewheel steering)
        tel.yaw -= rawRollIn * 0.45 * Math.min(1, tel.speedKts / 35) * dt;
        // Boleh angkat hidung (Rotate) saat kecepatan mencapai liftoffKts!
        if (tel.speedKts >= profile.liftoffKts && rawPitchIn > 0.1) {
          tel.pitch = Math.min(0.32, tel.pitch + rawPitchIn * profile.pitchRate * 0.7 * dt);
          if (tel.pitch > 0.06) {
            tel.onGround = false;
          }
        } else {
          tel.pitch = THREE.MathUtils.lerp(tel.pitch, 0, dt * 5);
        }
        const speedMps = tel.speedKts * 0.26;
        tel.x += Math.sin(tel.yaw) * speedMps * dt;
        tel.z += Math.cos(tel.yaw) * speedMps * dt;
        tel.stallWarn = false;
        tel.pullUpWarn = false;
        tel.gForce = 1.0;
      } else {
        // Mengudara: Pitch, Roll & Coordinated Bank Turn!
        tel.pitch = THREE.MathUtils.clamp(tel.pitch + rawPitchIn * profile.pitchRate * dt, -1.05, 1.05);
        tel.roll = THREE.MathUtils.clamp(tel.roll + rawRollIn * profile.rollRate * dt, -1.45, 1.45);
        if (Math.abs(rawRollIn) < 0.05) {
          // Stabilitas aerodinamis lembut saat stick dilepas
          tel.roll = THREE.MathUtils.lerp(tel.roll, 0, dt * 0.45);
        }
        // Belokan terkoordinasi dari sudut bank (roll > 0 = bank kanan -> yaw berkurang = belok kanan!)
        tel.yaw -= Math.sin(tel.roll) * profile.turnRate * (0.55 + Math.min(1, tel.speedKts / 240) * 0.45) * dt;

        // Stall check bila kecepatan di bawah batas stall saat terbang
        const isStall = tel.speedKts < profile.stallKts;
        tel.stallWarn = isStall;
        if (isStall) {
          tel.pitch = THREE.MathUtils.lerp(tel.pitch, -0.35, dt * 1.4);
        }

        const speedMps = tel.speedKts * 0.26;
        forwardVec.set(
          Math.sin(tel.yaw) * Math.cos(tel.pitch),
          Math.sin(tel.pitch),
          Math.cos(tel.yaw) * Math.cos(tel.pitch),
        );
        tel.x += forwardVec.x * speedMps * dt;
        tel.y += forwardVec.y * speedMps * dt;
        tel.z += forwardVec.z * speedMps * dt;

        // Pull-Up warning jika menukik rendah dekat permukaan
        tel.pullUpWarn = tel.y < 24 && tel.pitch < -0.14;

        // Sentuh permukaan: cek apakah mendarat mulus di Runway atau JATUH TERBAKAR (Crash)!
        if (tel.y <= 2.45) {
          const overOceanOrOffBase = Math.abs(tel.z) > 220 || Math.abs(tel.x) > 42;
          const badAttitude = tel.pitch < -0.2 || Math.abs(tel.roll) > 0.42;
          const gearForgot = !tel.gearDown;
          const tooFastImpact = tel.speedKts > profile.liftoffKts * 1.65;
          if (overOceanOrOffBase || badAttitude || gearForgot || tooFastImpact) {
            tel.y = 2.4;
            tel.crashed = true;
            tel.crashTimer = 4.2;
            tel.crashReason = overOceanOrOffBase
              ? 'PESAWAT MENABRAK LAUT / DARATAN DI LUAR RUNWAY'
              : gearForgot
                ? 'RODA PENDARAT BELUM DITURUNKAN (TEKAN G)'
                : badAttitude
                  ? 'SUDUT MENUKIK / MIRING TERLALU TAJAM SAAT SENTUH TANAH'
                  : 'KECEPATAN MENDARAT TERLALU TINGGI!';
            tel.speedKts = 0;
            tel.throttle = 0;
            cockpitSimAudio.playExplosionSfx(soundEnabled);
          } else {
            tel.y = 2.4;
            tel.onGround = true;
            tel.pitch = 0;
            tel.roll = 0;
          }
        }

        tel.gForce = THREE.MathUtils.clamp(
          1.0 / Math.max(0.28, Math.cos(Math.min(1.25, Math.abs(tel.roll)))) + rawPitchIn * 1.6,
          -1.5,
          9.0,
        );
      }
    }

    // === DETEKSI TABRAKAN GUNUNG 3D (5 GUGUSAN), HANGGAR, & MENARA ATC (Berlaku untuk Pesawat & Helikopter!) ===
    if (!tel.crashed) {
      let terrainH = -10;
      for (let i = 0; i < SIM_MOUNTAIN_POSITIONS.length; i++) {
        const [mx, mz] = SIM_MOUNTAIN_POSITIONS[i];
        const h = sampleMountainRangeHeight(tel.x - mx, tel.z - mz, 520, 680) - 0.2;
        if (h > terrainH) terrainH = h;
      }

      // Peringatan PULL UP otomatis bila terbang terlalu dekat di atas tebing gunung
      if (!tel.onGround && terrainH > 2.2 && tel.y < terrainH + 22) {
        tel.pullUpWarn = true;
      }

      const hitMountain = terrainH > 1.2 && tel.y <= terrainH + 2.1;
      const hitHangar = Math.abs(tel.x + 42) < 12.2 && Math.abs(tel.z + 90) < 15.2 && tel.y < 12.6;
      const hitAtc = Math.abs(tel.x + 36) < 4.8 && Math.abs(tel.z - 18) < 4.8 && tel.y < 21.8;

      if (hitMountain || hitHangar || hitAtc) {
        if (hitMountain) tel.y = Math.max(tel.y, terrainH + 0.6);
        tel.crashed = true;
        tel.crashTimer = 4.2;
        tel.crashReason = hitMountain
          ? 'PESAWAT MENABRAK TEBING GUNUNG!'
          : hitHangar
            ? 'PESAWAT MENABRAK BANGUNAN HANGGAR!'
            : 'PESAWAT MENABRAK MENARA ATC!';
        tel.speedKts = 0;
        tel.throttle = 0;
        cockpitSimAudio.playExplosionSfx(soundEnabled);
      }
    }

    // Dunia Terbang Tanpa Batas Horizontal (X/Z bebas tanpa tembok tak terlihat, plafon tinggi 45.000 ft!)
    tel.y = Math.min(2500, tel.y);

    // Hitung Altitude (Feet) & Compass Heading (090° = Runway 09 arah +Z)
    tel.altFt = Math.max(0, Math.round((tel.y - 2.4) * 18));
    tel.headingDeg = (((90 - THREE.MathUtils.radToDeg(tel.yaw)) % 360) + 360) % 360;

    // 3. Cek Cincin Target di Udara (10 Rings)
    let nextRingIdx = -1;
    let bestDist = Infinity;
    for (let i = 0; i < TARGET_RINGS.length; i++) {
      const rPos = TARGET_RINGS[i].pos;
      const dist = Math.hypot(tel.x - rPos[0], tel.y - rPos[1], tel.z - rPos[2]);
      if (!passedSetRef.current.has(i)) {
        if (dist < 22) {
          passedSetRef.current.add(i);
          tel.ringsPassed = passedSetRef.current.size;
          cockpitSimAudio.playRingPassChime(soundEnabled);
        } else if (nextRingIdx === -1) {
          nextRingIdx = i;
          bestDist = dist;
        }
      }
      const mesh = ringRefs.current[i];
      if (mesh) {
        const mat = mesh.material as THREE.MeshBasicMaterial;
        const passed = passedSetRef.current.has(i);
        const isNext = i === nextRingIdx;
        mat.color.set(passed ? '#10b981' : isNext ? '#fbbf24' : '#38bdf8');
        mat.opacity = passed ? 0.25 : isNext ? 0.85 + Math.sin(t * 6) * 0.15 : 0.5;
        mesh.rotation.z = t * (isNext ? 0.9 : 0.35);
      }
    }

    if (nextRingIdx >= 0) {
      const nr = TARGET_RINGS[nextRingIdx].pos;
      tel.nextRingDistM = Math.round(bestDist);
      const angleToRing = Math.atan2(nr[0] - tel.x, nr[2] - tel.z);
      let rel = THREE.MathUtils.radToDeg(angleToRing - tel.yaw);
      while (rel > 180) rel -= 360;
      while (rel < -180) rel += 360;
      tel.nextRingBearingDeg = rel;
    } else {
      tel.nextRingDistM = 0;
      tel.nextRingBearingDeg = 0;
    }

    // 4. Evaluasi 5 Misi Pelatihan Progresif & Pilot Coach Interaktif
    const activeMission = SIM_MISSIONS.find((m) => m.id === tel.missionId) ?? SIM_MISSIONS[0];
    let doneNow = false;
    if (activeMission.id === 1) {
      const altOk = tel.altFt >= (activeMission.requireTakeOffAltFt ?? 280);
      const gearOk = profile.isVtol || !tel.gearDown;
      doneNow = altOk && gearOk;
      tel.missionProgressText = `Alt: ${tel.altFt}/${activeMission.requireTakeOffAltFt ?? 280} ft • Gear: ${
        profile.isVtol ? 'VTOL' : tel.gearDown ? 'Turun' : 'Masuk'
      }`;
      if (tel.onGround) {
        tel.coachHint = profile.isVtol
          ? 'Naikkan Collective (Shift / Slider Kiri) di atas 55% untuk terbang vertikal!'
          : tel.throttle < 0.7
            ? 'Langkah 1: Dorong Throttle ke 90–100% (tahan SHIFT / geser Slider Kiri ke atas).'
            : tel.speedKts < profile.liftoffKts
              ? `Langkah 2: Akselerasi di Runway (${Math.round(tel.speedKts)}/${profile.liftoffKts} KTS)...`
              : 'Langkah 3: Kecepatan cukup! Tarik stik ke bawah (tekan S / Joystick Bawah) untuk mengudara!';
      } else if (!altOk) {
        tel.coachHint = `Tarik sedikit (S) untuk menanjak menuju ${activeMission.requireTakeOffAltFt ?? 280} FT!`;
      } else if (!gearOk) {
        tel.coachHint = 'Tekan tombol G (atau Gear) untuk melipat roda pendarat!';
      } else {
        tel.coachHint = 'Luar biasa! Misi 1 Selesai — Anda siap lanjut ke Misi 2!';
      }
    } else if (activeMission.id === 5) {
      const ringsDone = tel.ringsPassed >= activeMission.targetRings;
      const landedOk =
        ringsDone && tel.onGround && tel.gearDown && tel.speedKts < 45 && Math.abs(tel.x) < 35 && Math.abs(tel.z) < 180;
      doneNow = landedOk;
      tel.missionProgressText = `Ring: ${Math.min(tel.ringsPassed, activeMission.targetRings)}/${activeMission.targetRings} • ${
        ringsDone ? (tel.onGround ? `Rem ${Math.round(tel.speedKts)} KTS` : 'Siap Mendarat RWY 09') : 'Tembus Cincin'
      }`;
      if (tel.onGround && !ringsDone) {
        tel.coachHint = 'Lepas landas dari Runway 09 lalu tembus 4 Cincin Target terlebih dahulu!';
      } else if (!ringsDone) {
        tel.coachHint = `Arahkan ke Cincin berikutnya (${tel.nextRingDistM}m) • Ring ${tel.ringsPassed}/4.`;
      } else if (!tel.onGround) {
        tel.coachHint = !tel.gearDown
          ? 'Semua cincin tembus! Tekan G untuk turunkan roda, kurangi Throttle & arahkan ke Runway 09!'
          : 'Roda turun! Jaga kecepatan < 140 KTS & sudut turun lembut menuju aspal Runway 09!';
      } else if (tel.speedKts >= 45) {
        tel.coachHint = `Sentuh landasan mulus! Tekan CTRL / turunkan Throttle ke 0% untuk mengerem (${Math.round(tel.speedKts)} KTS).`;
      } else {
        tel.coachHint = 'SEMPURNA! Sortie Penuh & Pendaratan Mulus di Runway 09 Selesai!';
      }
    } else {
      const ringsDone = tel.ringsPassed >= activeMission.targetRings;
      doneNow = ringsDone;
      tel.missionProgressText = `Ring: ${Math.min(tel.ringsPassed, activeMission.targetRings)}/${activeMission.targetRings}`;
      if (tel.onGround) {
        tel.coachHint = profile.isVtol
          ? 'Naikkan Collective > 55% lalu miringkan sedikit ke depan (W) menuju Cincin 1!'
          : tel.speedKts < profile.liftoffKts
            ? `Naikkan Throttle ke 90–100% di Runway 09 (${Math.round(tel.speedKts)}/${profile.liftoffKts} KTS)...`
            : 'Tarik hidung (S / Joystick Bawah) untuk mengudara menuju Cincin Target!';
      } else if (tel.stallWarn) {
        tel.coachHint = 'PERINGATAN STALL! Dorong Throttle penuh (SHIFT) & turunkan sedikit hidung (W)!';
      } else if (tel.pullUpWarn) {
        tel.coachHint = 'AWAS RENDAH! Tarik stik (S) segera agar tidak menabrak & terbakar!';
      } else if (!ringsDone) {
        const dirHint =
          Math.abs(tel.nextRingBearingDeg) < 12
            ? 'Lurus ke depan'
            : tel.nextRingBearingDeg > 0
              ? 'Belok Kanan (D)'
              : 'Belok Kiri (A)';
        tel.coachHint = `${dirHint} menuju Ring berikut (${tel.nextRingDistM}m) • Cek panah oranye HUD.`;
      } else {
        tel.coachHint = `HEBAT! Misi ${activeMission.id} Selesai! Tekan lanjut untuk tantangan berikutnya!`;
      }
    }

    if (doneNow && !tel.missionCompleted) {
      tel.missionCompleted = true;
      cockpitSimAudio.playMissionCompleteChime(soundEnabled);
    }

    // 5. Sinkronkan Multi-Kamera (Kokpit 1st-Person, Ekor Chase, Sayap, Orbit) & Pesawat Eksternal
    extEuler.set(-tel.pitch, tel.yaw, tel.roll, 'YXZ');
    extQuat.setFromEuler(extEuler);

    const shakeMag = tel.onGround
      ? Math.min(0.015, (tel.speedKts / 220) * 0.014)
      : (tel.stallWarn || tel.pullUpWarn ? 0.032 : 0) + Math.max(0, (tel.gForce - 2.2) * 0.004) + tel.throttle * 0.005;
    const shakeX = Math.sin(t * 48) * shakeMag;
    const shakeY = Math.cos(t * 53) * shakeMag;

    if (tel.cameraMode === 'cockpit') {
      euler.set(tel.pitch, tel.yaw + Math.PI, -tel.roll, 'YXZ');
      quat.setFromEuler(euler);
      headEuler.set(tel.lookPitch, tel.lookYaw, 0, 'YXZ');
      headQuat.setFromEuler(headEuler);

      camera.position.set(tel.x + shakeX, tel.y + shakeY, tel.z);
      // Kamera ikut arah pandangan kepala pilot (360° kiri/kanan/atas/bawah/belakang),
      // sedangkan kokpit 3D tetap menempel pada badan pesawat!
      camera.quaternion.copy(quat).multiply(headQuat);

      if (cockpitRigRef.current) {
        cockpitRigRef.current.visible = true;
        cockpitRigRef.current.position.copy(camera.position);
        cockpitRigRef.current.quaternion.copy(quat);
      }
      if (extAircraftRef.current) {
        extAircraftRef.current.visible = false;
      }
    } else {
      if (cockpitRigRef.current) {
        cockpitRigRef.current.visible = false;
      }
      if (extAircraftRef.current) {
        extAircraftRef.current.visible = true;
        extAircraftRef.current.position.set(tel.x, tel.y - 1.5, tel.z);
        extAircraftRef.current.quaternion.copy(extQuat);

        // Putar baling-baling / rotor utama pada pesawat eksternal
        const propSpeed = dt * (8 + tel.throttle * 34);
        extAircraftGroup.traverse((child) => {
          const n = child.name.toLowerCase();
          if (n.includes('prop') || n.includes('blade') || n.includes('fan') || n.includes('spinner')) {
            child.rotation.z += propSpeed;
          } else if (n.includes('rotor')) {
            child.rotation.y += propSpeed;
          }
        });
        extGearLerp.current = THREE.MathUtils.lerp(extGearLerp.current, tel.gearDown ? 0 : 1, Math.min(1, dt * 4));
        const gearObj = extAircraftGroup.getObjectByName('landing-gear');
        if (gearObj) {
          const r = extGearLerp.current;
          gearObj.visible = r < 0.96;
          gearObj.position.y = r * 0.78;
          gearObj.scale.set(1 - r * 0.25, Math.max(0.01, 1 - r * 0.94), 1 - r * 0.25);
        }
      }

      if (tel.cameraMode === 'chase') {
        camOffset.set(0, 5.2 + tel.lookPitch * 6.5, -17.5).applyAxisAngle(camUpVec, tel.lookYaw).applyQuaternion(extQuat);
        camera.position.set(tel.x + camOffset.x + shakeX, tel.y + camOffset.y + shakeY, tel.z + camOffset.z);
        lookTarget.set(tel.x + Math.sin(tel.yaw) * 6, tel.y + Math.sin(tel.pitch) * 4, tel.z + Math.cos(tel.yaw) * 6);
        camera.lookAt(lookTarget);
      } else if (tel.cameraMode === 'wing') {
        camOffset.set(13.5, 3.2 + tel.lookPitch * 5.0, -8.5).applyAxisAngle(camUpVec, tel.lookYaw).applyQuaternion(extQuat);
        camera.position.set(tel.x + camOffset.x, tel.y + camOffset.y, tel.z + camOffset.z);
        lookTarget.set(tel.x, tel.y - 0.5, tel.z);
        camera.lookAt(lookTarget);
      } else {
        // Orbit sinematik 360° mengelilingi pesawat sambil terbang!
        const ang = t * 0.45 + tel.lookYaw;
        camera.position.set(tel.x + Math.cos(ang) * 22, tel.y + 6.8 + tel.lookPitch * 7, tel.z + Math.sin(ang) * 22);
        lookTarget.set(tel.x, tel.y - 0.4, tel.z);
        camera.lookAt(lookTarget);
      }
    }

    // Animasi Joystick & Throttle 3D di dalam kokpit
    if (stickPivotRef.current) {
      stickPivotRef.current.rotation.x = tel.stickY * 0.34;
      stickPivotRef.current.rotation.z = -tel.stickX * 0.34;
    }
    if (throttleLeverRef.current) {
      throttleLeverRef.current.position.z = (isTransportCockpit ? -0.53 : -0.54) - tel.throttle * 0.1;
      throttleLeverRef.current.rotation.x = -0.25 - tel.throttle * 0.52;
    }

    // 5. Update Audio Web Audio API Real-Time
    cockpitSimAudio.update(unit.category, tel.throttle, tel.speedKts, tel.stallWarn, tel.pullUpWarn, soundEnabled);
  });

  return (
    <>
      {/* Pencahayaan Dunia Terbang */}
      <ambientLight intensity={timeOfDay === 'night' ? 0.3 : 0.65} color={timeOfDay === 'sunset' ? '#ffd2a6' : '#d8ecff'} />
      <directionalLight
        position={[180, 260, 140]}
        intensity={timeOfDay === 'night' ? 0.65 : 1.75}
        color={timeOfDay === 'sunset' ? '#ff9d5c' : '#ffffff'}
      />

      {/* Kubah Langit 3D Tak Terbatas (Mengikuti posisi pesawat!) */}
      <mesh ref={skyDomeRef}>
        <sphereGeometry args={[5200, 32, 24]} />
        <meshBasicMaterial map={skyTex} side={THREE.BackSide} depthWrite={false} fog={false} />
      </mesh>

      {/* === DUNIA TERBANG 3D LUAS TANPA BATAS: RUNWAY 09, LANUD, 5 PEGUNUNGAN, LAUT & AWAN === */}
      {/* Daratan Rumput Lanud Luas */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-120, -0.05, 80]}>
        <planeGeometry args={[760, 1080]} />
        <meshStandardMaterial map={grassTex} roughness={0.94} />
      </mesh>

      {/* Runway 09 Utama (Panjang 340m, tempat pesawat mulai parkir/takeoff!) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[22, 340]} />
        <meshStandardMaterial map={runwayTex} roughness={0.85} />
      </mesh>

      {/* Lampu Tepi Runway 09 */}
      {Array.from({ length: 18 }, (_, i) => -155 + i * 18.5).map((lz, i) => (
        <group key={`rwy-l-${i}`} position={[0, 0.25, lz]}>
          <mesh position={[-11.8, 0, 0]}>
            <sphereGeometry args={[0.28, 6, 6]} />
            <meshBasicMaterial color={lz < -120 ? '#22c55e' : '#fde68a'} />
          </mesh>
          <mesh position={[11.8, 0, 0]}>
            <sphereGeometry args={[0.28, 6, 6]} />
            <meshBasicMaterial color={lz < -120 ? '#22c55e' : '#fde68a'} />
          </mesh>
        </group>
      ))}

      {/* Hanggar & Menara ATC di sisi kiri Runway */}
      <group position={[-42, 0, -90]}>
        <mesh position={[0, 5.5, 0]}>
          <boxGeometry args={[22, 11, 28]} />
          <meshStandardMaterial map={hangarTex} roughness={0.65} metalness={0.3} />
        </mesh>
        <mesh position={[0, 11.4, 0]}>
          <boxGeometry args={[23, 0.8, 29]} />
          <meshStandardMaterial color="#1d4ed8" roughness={0.55} />
        </mesh>
      </group>
      <group position={[-36, 0, 18]}>
        <mesh position={[0, 9, 0]}>
          <boxGeometry args={[4.2, 18, 4.2]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.7} />
        </mesh>
        <mesh position={[0, 19.5, 0]}>
          <cylinderGeometry args={[3.8, 2.6, 3.2, 8]} />
          <meshStandardMaterial color="#0f4c5c" roughness={0.18} metalness={0.75} />
        </mesh>
      </group>

      {/* 5 Gugusan Pegunungan Prosedural Tersebar Luas di Seluruh Cakrawala */}
      {SIM_MOUNTAIN_POSITIONS.map(([mx, mz], idx) => (
        <mesh key={`sim-mtn-${idx}`} geometry={mtnGeo} position={[mx, -0.2, mz]}>
          <meshStandardMaterial
            vertexColors
            map={mtnDetail.map}
            bumpMap={mtnDetail.bumpMap}
            bumpScale={0.7}
            roughness={0.92}
          />
        </mesh>
      ))}

      {/* Lautan Luas Tak Terbatas (Mengikuti pesawat secara seamless ke segala penjuru!) */}
      <mesh ref={oceanRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]}>
        <planeGeometry args={[11000, 11000]} />
        <meshStandardMaterial
          map={oceanTex.map}
          bumpMap={oceanTex.bumpMap}
          bumpScale={0.65}
          roughness={0.16}
          metalness={0.5}
        />
      </mesh>

      {/* Awan Cumulus Volumetrik Tak Terbatas (Wrapping mulus di sekeliling pesawat!) */}
      {clouds.map((cl, idx) => (
        <sprite
          key={`sim-cloud-${idx}`}
          ref={(el) => {
            cloudRefs.current[idx] = el;
          }}
          position={[cl.x, cl.y, cl.z]}
          scale={[cl.s * 1.6, cl.s, 1]}
        >
          <spriteMaterial map={cloudTex} transparent opacity={timeOfDay === 'night' ? 0.28 : 0.82} depthWrite={false} />
        </sprite>
      ))}

      {/* 10 Cincin Target Latihan Manuver Udara */}
      {TARGET_RINGS.map((ring, idx) => (
        <mesh
          key={`ring-${idx}`}
          ref={(el) => {
            ringRefs.current[idx] = el;
          }}
          position={ring.pos}
          rotation={[0, ring.rotY, 0]}
        >
          <torusGeometry args={[16, 0.72, 12, 36]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.65} />
        </mesh>
      ))}

      {/* Model 3D Pesawat Eksternal (Aktif saat Kamera Ekor/Sayap/Orbit atau saat Pesawat Jatuh Terbakar!) */}
      <group ref={extAircraftRef} name="sim-external-aircraft" visible={false}>
        <primitive object={extAircraftGroup} />
      </group>

      {/* Efek Kebakaran & Ledakan 3D Fotorealistis (Bola Api Volumetrik, Shockwave, Asap Pekat, & Percikan Bara!) */}
      <group ref={crashFireRef} name="sim-crash-fire" visible={false}>
        {/* Kilatan cahaya api dinamis menyinari pesawat & lereng gunung */}
        <pointLight ref={crashFlashLightRef} position={[0, 3.2, 0]} color="#ff7b24" intensity={12} distance={55} decay={1.6} />

        {/* Cincin Gelombang Kejut Ledakan (Blast Shockwave Ring) */}
        <mesh ref={crashShockwaveRef} position={[0, 0.8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={shockwaveTex}
            transparent
            opacity={0.9}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* 12 Lidah Api Volumetrik Berkobar (Additive Blending) */}
        {Array.from({ length: 12 }, (_, idx) => (
          <sprite
            key={`crash-fl-${idx}`}
            ref={(el) => {
              crashFlameRefs.current[idx] = el;
            }}
          >
            <spriteMaterial
              map={fireTex}
              transparent
              opacity={0.95}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </sprite>
        ))}

        {/* 14 Kepulan Asap Hitam Pekat Membumbung Tinggi */}
        {Array.from({ length: 14 }, (_, idx) => (
          <sprite
            key={`crash-sm-${idx}`}
            ref={(el) => {
              crashSmokeRefs.current[idx] = el;
            }}
          >
            <spriteMaterial map={expSmokeTex} transparent opacity={0.82} depthWrite={false} />
          </sprite>
        ))}

        {/* 16 Percikan Bara Api & Serpihan Terbakar Terpental Balistik */}
        {Array.from({ length: 16 }, (_, idx) => (
          <mesh
            key={`crash-em-${idx}`}
            ref={(el) => {
              crashEmberRefs.current[idx] = el;
            }}
          >
            <sphereGeometry args={[idx % 3 === 0 ? 0.34 : 0.2, 6, 6]} />
            <meshBasicMaterial color={idx % 2 === 0 ? '#fef08a' : '#f97316'} />
          </mesh>
        ))}
      </group>

      {/* === INTERIOR KOKPIT 3D FIRST-PERSON (Pesawat Angkut/VIP Glass Cockpit vs Pesawat Tempur Sukhoi-style) === */}
      <group ref={cockpitRigRef} name="first-person-cockpit-3d">
        {isTransportCockpit ? (
          /* ===================== KOKPIT PESAWAT ANGKUT & VVIP (DUAL-PILOT GLASS COCKPIT) ===================== */
          <>
            {/* Pencahayaan lembut kabin kokpit angkut */}
            <pointLight position={[0, 0.12, -0.45]} color="#bae6fd" intensity={0.75} distance={2.8} />
            <pointLight position={[-0.52, -0.18, -0.62]} color="#f59e0b" intensity={0.45} distance={1.1} />
            <pointLight position={[0.52, -0.18, -0.62]} color="#f59e0b" intensity={0.45} distance={1.1} />

            {/* Bingkai Kaca Depan (Windshield): Pilar Tengah Tebal, Pilar Kiri-Kanan Miring, & Lis Atas */}
            <mesh position={[0, 0.24, -0.82]}>
              <boxGeometry args={[0.056, 0.56, 0.065]} />
              <meshStandardMaterial color="#1b232e" roughness={0.5} metalness={0.45} />
            </mesh>
            {/* Pilar Kiri & Kanan Miring */}
            <mesh position={[-0.73, 0.2, -0.78]} rotation={[0, 0, -0.18]}>
              <boxGeometry args={[0.075, 0.66, 0.085]} />
              <meshStandardMaterial color="#222c38" roughness={0.5} metalness={0.45} />
            </mesh>
            <mesh position={[0.73, 0.2, -0.78]} rotation={[0, 0, 0.18]}>
              <boxGeometry args={[0.075, 0.66, 0.085]} />
              <meshStandardMaterial color="#222c38" roughness={0.5} metalness={0.45} />
            </mesh>
            {/* Lis Atas & Samping Kaca Depan */}
            <mesh position={[0, 0.49, -0.79]}>
              <boxGeometry args={[1.68, 0.09, 0.16]} />
              <meshStandardMaterial color="#1a222d" roughness={0.6} metalness={0.35} />
            </mesh>
            <mesh position={[-0.86, 0.06, -0.5]} rotation={[0, 0.35, 0]}>
              <boxGeometry args={[0.06, 0.72, 0.75]} />
              <meshStandardMaterial color="#1f2937" roughness={0.65} metalness={0.3} />
            </mesh>
            <mesh position={[0.86, 0.06, -0.5]} rotation={[0, -0.35, 0]}>
              <boxGeometry args={[0.06, 0.72, 0.75]} />
              <meshStandardMaterial color="#1f2937" roughness={0.65} metalness={0.3} />
            </mesh>

            {/* Sepasang Wiper Kaca Depan Hitam (Kiri & Kanan) */}
            <group position={[-0.44, 0.025, -0.805]} rotation={[0, 0, -0.04]}>
              <mesh>
                <boxGeometry args={[0.32, 0.011, 0.012]} />
                <meshStandardMaterial color="#0b0f14" roughness={0.4} metalness={0.6} />
              </mesh>
              <mesh position={[0.16, -0.018, 0.005]} rotation={[0, 0, 0.35]}>
                <boxGeometry args={[0.08, 0.01, 0.01]} />
                <meshStandardMaterial color="#0b0f14" roughness={0.4} metalness={0.6} />
              </mesh>
            </group>
            <group position={[0.44, 0.025, -0.805]} rotation={[0, 0, 0.04]}>
              <mesh>
                <boxGeometry args={[0.32, 0.011, 0.012]} />
                <meshStandardMaterial color="#0b0f14" roughness={0.4} metalness={0.6} />
              </mesh>
              <mesh position={[-0.16, -0.018, 0.005]} rotation={[0, 0, -0.35]}>
                <boxGeometry args={[0.08, 0.01, 0.01]} />
                <meshStandardMaterial color="#0b0f14" roughness={0.4} metalness={0.6} />
              </mesh>
            </group>

            {/* Overhead Switch Panel di Langit-Langit Kokpit */}
            <group position={[0, 0.51, -0.52]} rotation={[0.45, 0, 0]}>
              <mesh>
                <boxGeometry args={[0.96, 0.06, 0.38]} />
                <meshStandardMaterial color="#1e293b" roughness={0.65} metalness={0.3} />
              </mesh>
              <mesh position={[0, -0.032, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.9, 0.34]} />
                <meshBasicMaterial map={transportOverheadTex} />
              </mesh>
            </group>

            {/* Glareshield Lebar + Strip Autopilot MCP/FCU */}
            <mesh position={[0, -0.02, -0.78]}>
              <boxGeometry args={[1.48, 0.055, 0.24]} />
              <meshStandardMaterial color="#141a22" roughness={0.82} metalness={0.2} />
            </mesh>
            <mesh position={[0, -0.075, -0.745]} rotation={[-0.08, 0, 0]}>
              <boxGeometry args={[0.96, 0.095, 0.05]} />
              <meshStandardMaterial color="#273444" roughness={0.6} metalness={0.3} />
            </mesh>
            <mesh position={[0, -0.075, -0.718]} rotation={[-0.08, 0, 0]}>
              <planeGeometry args={[0.93, 0.085]} />
              <meshBasicMaterial map={transportMcpTex} />
            </mesh>

            {/* Panel Instrumen Utama Abu-Abu Biru Khas Airbus / Pesawat Angkut Modern */}
            <mesh position={[0, -0.275, -0.76]}>
              <boxGeometry args={[1.42, 0.34, 0.12]} />
              <meshStandardMaterial color="#3c4c5c" roughness={0.65} metalness={0.28} />
            </mesh>

            {/* 6 Layar Glass Cockpit MFD Menyala (PFD Kiri, ND Kiri, Upper/Lower ECAM + Standby, ND Kanan, PFD Kanan) */}
            {[
              { x: -0.37, y: -0.225, w: 0.145, h: 0.145, tex: transportPfdTex },
              { x: -0.2, y: -0.225, w: 0.145, h: 0.145, tex: transportNdTex },
              { x: -0.094, y: -0.215, w: 0.048, h: 0.048, tex: transportPfdTex },
              { x: 0.0, y: -0.205, w: 0.118, h: 0.118, tex: transportEcamUpperTex },
              { x: 0.0, y: -0.34, w: 0.118, h: 0.118, tex: transportEcamLowerTex },
              { x: 0.2, y: -0.225, w: 0.145, h: 0.145, tex: transportNdTex },
              { x: 0.37, y: -0.225, w: 0.145, h: 0.145, tex: transportPfdTex },
            ].map((scr, idx) => (
              <group key={`tp-mfd-${idx}`} position={[scr.x, scr.y, -0.695]}>
                <mesh>
                  <boxGeometry args={[scr.w + 0.016, scr.h + 0.016, 0.018]} />
                  <meshStandardMaterial color="#0f172a" roughness={0.55} metalness={0.4} />
                </mesh>
                <mesh position={[0, 0, 0.011]}>
                  <planeGeometry args={[scr.w, scr.h]} />
                  <meshBasicMaterial map={scr.tex} />
                </mesh>
              </group>
            ))}

            {/* Panel Instrumen Samping Kiri & Kanan Berlampu Amber Hangat */}
            <mesh position={[-0.53, -0.225, -0.694]} rotation={[0, 0.14, 0]}>
              <planeGeometry args={[0.125, 0.125]} />
              <meshBasicMaterial map={transportSideGaugeTex} />
            </mesh>
            <mesh position={[0.53, -0.225, -0.694]} rotation={[0, -0.14, 0]}>
              <planeGeometry args={[0.125, 0.125]} />
              <meshBasicMaterial map={transportSideGaugeTex} />
            </mesh>

            {/* Center Pedestal Miring (Dual MCDU + Radio Stack + Kuadran Throttle Tengah) */}
            <group position={[0, -0.49, -0.53]} rotation={[-1.02, 0, 0]}>
              <mesh>
                <boxGeometry args={[0.42, 0.46, 0.12]} />
                <meshStandardMaterial color="#273444" roughness={0.68} metalness={0.3} />
              </mesh>
              <mesh position={[0, 0, 0.062]}>
                <planeGeometry args={[0.39, 0.43]} />
                <meshBasicMaterial map={transportPedestalTex} />
              </mesh>
            </group>

            {/* Dual Throttle Levers 3D di Pedestal Tengah (Bergerak nyata mengikuti input Throttle!) */}
            <group ref={throttleLeverRef} position={[0, -0.41, -0.53]} rotation={[-0.25, 0, 0]}>
              {[-0.032, 0.032].map((tx, ti) => (
                <group key={`tp-thr-${ti}`} position={[tx, 0, 0]}>
                  <mesh position={[0, 0.055, 0]}>
                    <boxGeometry args={[0.016, 0.11, 0.018]} />
                    <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
                  </mesh>
                  <mesh position={[0, 0.11, 0]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.017, 0.017, 0.048, 10]} />
                    <meshStandardMaterial color="#0f172a" roughness={0.55} />
                  </mesh>
                </group>
              ))}
            </group>

            {/* Side-Stick Kiri Pilot (Bergerak mengikuti pitch/roll!) */}
            <group position={[-0.56, -0.45, -0.48]}>
              <mesh>
                <cylinderGeometry args={[0.035, 0.048, 0.04, 10]} />
                <meshStandardMaterial color="#0f172a" roughness={0.85} />
              </mesh>
              <group ref={stickPivotRef} position={[0, 0.02, 0]}>
                <mesh position={[0, 0.075, 0]}>
                  <cylinderGeometry args={[0.014, 0.017, 0.14, 10]} />
                  <meshStandardMaterial color="#1e293b" roughness={0.55} metalness={0.4} />
                </mesh>
                <mesh position={[0, 0.145, 0]}>
                  <boxGeometry args={[0.032, 0.045, 0.034]} />
                  <meshStandardMaterial color="#111827" roughness={0.6} />
                </mesh>
              </group>
            </group>

            {/* Sandaran Kursi Pilot & Co-Pilot di Tepi Kiri & Kanan Foreground (Seperti Referensi!) */}
            <group position={[-0.7, -0.24, -0.28]} rotation={[0, 0.22, 0]}>
              <mesh position={[0, 0.18, 0]}>
                <boxGeometry args={[0.16, 0.24, 0.14]} />
                <meshStandardMaterial color="#202934" roughness={0.78} />
              </mesh>
              <mesh position={[0.03, -0.14, 0.02]}>
                <boxGeometry args={[0.24, 0.42, 0.16]} />
                <meshStandardMaterial color="#171f29" roughness={0.82} />
              </mesh>
            </group>
            <group position={[0.7, -0.24, -0.28]} rotation={[0, -0.22, 0]}>
              <mesh position={[0, 0.18, 0]}>
                <boxGeometry args={[0.16, 0.24, 0.14]} />
                <meshStandardMaterial color="#202934" roughness={0.78} />
              </mesh>
              <mesh position={[-0.03, -0.14, 0.02]}>
                <boxGeometry args={[0.24, 0.42, 0.16]} />
                <meshStandardMaterial color="#171f29" roughness={0.82} />
              </mesh>
            </group>

            {/* Sekat Belakang Kabin Kokpit (Saat menengok ke belakang) */}
            <mesh position={[0, 0.02, 0.65]}>
              <boxGeometry args={[1.6, 1.1, 0.12]} />
              <meshStandardMaterial color="#263240" roughness={0.75} />
            </mesh>
          </>
        ) : (
          /* ===================== KOKPIT PESAWAT TEMPUR (SUKHOI / FLANKER-STYLE) ===================== */
          <>
            {/* Pencahayaan lembut instrumen kokpit tempur */}
            <pointLight position={[0, -0.08, -0.5]} color="#bae6fd" intensity={0.72} distance={2.5} />
            <pointLight position={[0.28, -0.14, -0.58]} color="#38bdf8" intensity={0.45} distance={1.1} />

            {/* Lengkungan Kanopi Tebal Olive-Charcoal (Canopy Arch Bow) melingkar penuh di atas & samping */}
            <mesh position={[0, -0.09, -0.76]} rotation={[0, 0, 0]}>
              <torusGeometry args={[0.63, 0.048, 14, 42, Math.PI]} />
              <meshStandardMaterial color="#2d3930" roughness={0.42} metalness={0.42} />
            </mesh>
            {/* Ring segel karet gelap bagian dalam kanopi */}
            <mesh position={[0, -0.09, -0.745]} rotation={[0, 0, 0]}>
              <torusGeometry args={[0.585, 0.015, 10, 40, Math.PI]} />
              <meshStandardMaterial color="#11161c" roughness={0.75} metalness={0.25} />
            </mesh>
            {/* Rel Samping Kanopi Kiri & Kanan */}
            <mesh position={[-0.63, -0.19, -0.45]} rotation={[0.14, 0.08, 0]}>
              <boxGeometry args={[0.06, 0.065, 1.15]} />
              <meshStandardMaterial color="#2b362e" roughness={0.48} metalness={0.45} />
            </mesh>
            <mesh position={[0.63, -0.19, -0.45]} rotation={[0.14, -0.08, 0]}>
              <boxGeometry args={[0.06, 0.065, 1.15]} />
              <meshStandardMaterial color="#2b362e" roughness={0.48} metalness={0.45} />
            </mesh>

            {/* 3 Cermin Spion Oval Perak pada Lengkungan Kanopi (Tengah Atas, Kiri Atas, Kanan Atas) */}
            {[
              { pos: [0, 0.515, -0.715] as [number, number, number], rotZ: 0, sx: 0.145, sy: 0.046 },
              { pos: [-0.46, 0.295, -0.715] as [number, number, number], rotZ: 0.78, sx: 0.135, sy: 0.042 },
              { pos: [0.46, 0.295, -0.715] as [number, number, number], rotZ: -0.78, sx: 0.135, sy: 0.042 },
            ].map((mir, mi) => (
              <group key={`canopy-mir-${mi}`} position={mir.pos} rotation={[0, 0, mir.rotZ]}>
                <mesh scale={[mir.sx, mir.sy, 0.012]}>
                  <sphereGeometry args={[1, 16, 12]} />
                  <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.5} />
                </mesh>
                <mesh position={[0, 0, 0.011]} scale={[mir.sx * 0.9, mir.sy * 0.85, 0.005]}>
                  <sphereGeometry args={[1, 16, 12]} />
                  <meshStandardMaterial color="#dbeafe" roughness={0.08} metalness={0.92} />
                </mesh>
              </group>
            ))}

            {/* Kompas Magnetik Standby Gantung di Lengkungan Kanan Atas (Persis Referensi!) */}
            <group position={[0.285, 0.325, -0.73]}>
              <mesh position={[0, 0.065, 0]}>
                <boxGeometry args={[0.022, 0.085, 0.022]} />
                <meshStandardMaterial color="#111827" roughness={0.6} metalness={0.4} />
              </mesh>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.042, 0.046, 0.055, 14]} />
                <meshStandardMaterial color="#0b0f14" roughness={0.5} metalness={0.35} />
              </mesh>
              <mesh position={[0, -0.004, 0.028]}>
                <planeGeometry args={[0.056, 0.022]} />
                <meshBasicMaterial color="#e2e8f0" />
              </mesh>
            </group>

            {/* Unit Kaca Combiner HUD Ganda & Bracket Pelindung Atas */}
            <group position={[0, 0.095, -0.72]}>
              {/* Kaca Combiner HUD Hijau Transparan */}
              <mesh rotation={[-0.22, 0, 0]}>
                <planeGeometry args={[0.24, 0.27]} />
                <meshBasicMaterial color="#22c55e" transparent opacity={0.08} side={THREE.DoubleSide} depthWrite={false} />
              </mesh>
              {/* Dua Tiang Bracket Kiri & Kanan Combiner */}
              <mesh position={[-0.125, -0.02, -0.01]} rotation={[0.08, 0, 0.09]}>
                <boxGeometry args={[0.016, 0.34, 0.024]} />
                <meshStandardMaterial color="#181f28" roughness={0.45} metalness={0.65} />
              </mesh>
              <mesh position={[0.125, -0.02, -0.01]} rotation={[0.08, 0, -0.09]}>
                <boxGeometry args={[0.016, 0.34, 0.024]} />
                <meshStandardMaterial color="#181f28" roughness={0.45} metalness={0.65} />
              </mesh>
              {/* Pelindung Lengkung Atas HUD */}
              <mesh position={[0, 0.14, 0.01]} rotation={[0.12, 0, 0]}>
                <torusGeometry args={[0.165, 0.016, 8, 24, Math.PI * 0.72]} />
                <meshStandardMaterial color="#1f2937" roughness={0.5} metalness={0.55} />
              </mesh>
            </group>

            {/* Kotak Kontrol HUD Tengah (BRIGHT / TEST / RETICLE) */}
            <group position={[0, -0.105, -0.71]}>
              <mesh>
                <boxGeometry args={[0.28, 0.105, 0.16]} />
                <meshStandardMaterial color="#161d26" roughness={0.65} metalness={0.35} />
              </mesh>
              <mesh position={[0, 0, 0.082]}>
                <planeGeometry args={[0.265, 0.092]} />
                <meshBasicMaterial map={fighterHudCtrlTex} />
              </mesh>
            </group>

            {/* Panel Instrumen Utama Biru-Abu Sukhoi Penuh Dial Analog & SPO-15 RWR */}
            <group position={[0, -0.335, -0.705]} rotation={[-0.14, 0, 0]}>
              <mesh>
                <boxGeometry args={[0.98, 0.44, 0.14]} />
                <meshStandardMaterial color="#3c5563" roughness={0.68} metalness={0.28} />
              </mesh>
              <mesh position={[0, 0, 0.072]}>
                <planeGeometry args={[0.94, 0.415]} />
                <meshBasicMaterial map={fighterDashTex} />
              </mesh>
            </group>

            {/* Layar MFD Radar Taktis Digital Biru di Kanan Atas (Menonjol keluar seperti Referensi!) */}
            <group position={[0.275, -0.155, -0.645]} rotation={[-0.1, -0.14, 0]}>
              <mesh>
                <boxGeometry args={[0.235, 0.2, 0.07]} />
                <meshStandardMaterial color="#141b24" roughness={0.55} metalness={0.45} />
              </mesh>
              <mesh position={[0, 0, 0.037]}>
                <planeGeometry args={[0.215, 0.182]} />
                <meshBasicMaterial map={fighterRadarTex} />
              </mesh>
            </group>

            {/* Konsol Samping Kiri & Kanan dengan Saklar & Tuas Garis Merah-Kuning */}
            <group position={[-0.55, -0.44, -0.45]}>
              <mesh>
                <boxGeometry args={[0.24, 0.24, 0.88]} />
                <meshStandardMaterial color="#24333d" roughness={0.72} metalness={0.25} />
              </mesh>
              <mesh position={[0, 0.122, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.22, 0.78]} />
                <meshBasicMaterial map={fighterSideConsoleTex} />
              </mesh>
            </group>
            <group position={[0.55, -0.44, -0.45]}>
              <mesh>
                <boxGeometry args={[0.24, 0.24, 0.88]} />
                <meshStandardMaterial color="#24333d" roughness={0.72} metalness={0.25} />
              </mesh>
              <mesh position={[0, 0.122, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.22, 0.78]} />
                <meshBasicMaterial map={fighterSideConsoleTex} />
              </mesh>
            </group>

            {/* Tuas Joystick HOTAS 3D Detail di Tengah (Tombol Merah, Perak, & Hat Switch) */}
            <group position={[0.0, -0.53, -0.49]}>
              <mesh>
                <cylinderGeometry args={[0.052, 0.072, 0.05, 12]} />
                <meshStandardMaterial color="#0f172a" roughness={0.85} />
              </mesh>
              <group ref={stickPivotRef} position={[0, 0.02, 0]}>
                <mesh position={[0, 0.095, 0]}>
                  <cylinderGeometry args={[0.019, 0.023, 0.19, 10]} />
                  <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.5} />
                </mesh>
                {/* Kepala Grip HOTAS */}
                <mesh position={[0, 0.195, 0.01]} rotation={[-0.22, 0, 0]}>
                  <boxGeometry args={[0.052, 0.072, 0.052]} />
                  <meshStandardMaterial color="#111827" roughness={0.58} metalness={0.35} />
                </mesh>
                {/* Tombol Senjata Merah (Kiri), Hat Switch Perak (Tengah), & Tombol Hijau (Kanan) */}
                <mesh position={[-0.016, 0.21, 0.032]}>
                  <cylinderGeometry args={[0.011, 0.011, 0.012, 10]} />
                  <meshBasicMaterial color="#ef4444" />
                </mesh>
                <mesh position={[0.005, 0.222, 0.032]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.012, 0.012, 0.012, 12]} />
                  <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.25} />
                </mesh>
                <mesh position={[0.022, 0.212, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.009, 0.009, 0.012, 10]} />
                  <meshBasicMaterial color="#22c55e" />
                </mesh>
              </group>
            </group>

            {/* Tuas Throttle 3D di Konsol Kiri */}
            <group ref={throttleLeverRef} position={[-0.45, -0.36, -0.54]} rotation={[-0.25, 0, 0]}>
              <mesh position={[0, 0.06, 0]}>
                <boxGeometry args={[0.026, 0.12, 0.024]} />
                <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.35} />
              </mesh>
              <mesh position={[0, 0.125, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.022, 0.022, 0.095, 10]} />
                <meshStandardMaterial color="#0f172a" roughness={0.65} />
              </mesh>
            </group>

            {/* Sandaran Kepala Kursi Ejeksi, Sayap Kiri-Kanan, & Sirip Ekor Belakang */}
            <group position={[0, 0.05, 0.42]}>
              <mesh>
                <boxGeometry args={[0.42, 0.56, 0.12]} />
                <meshStandardMaterial color="#1e293b" roughness={0.8} />
              </mesh>
              <mesh position={[0, 0.34, 0]}>
                <boxGeometry args={[0.32, 0.16, 0.12]} />
                <meshStandardMaterial color="#eab308" roughness={0.6} />
              </mesh>
            </group>
            <mesh position={[-2.4, -0.45, 0.85]} rotation={[0, 0.25, 0]}>
              <boxGeometry args={[3.4, 0.08, 1.35]} />
              <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.35} />
            </mesh>
            <mesh position={[2.4, -0.45, 0.85]} rotation={[0, -0.25, 0]}>
              <boxGeometry args={[3.4, 0.08, 1.35]} />
              <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.35} />
            </mesh>
            <mesh position={[0, -0.38, 2.3]}>
              <boxGeometry args={[0.72, 0.46, 3.2]} />
              <meshStandardMaterial color="#334155" roughness={0.55} metalness={0.35} />
            </mesh>
            <mesh position={[0, 0.72, 3.5]} rotation={[-0.22, 0, 0]}>
              <boxGeometry args={[0.1, 1.65, 1.15]} />
              <meshStandardMaterial color="#1e3a8a" roughness={0.45} metalness={0.4} />
            </mesh>
          </>
        )}
      </group>
    </>
  );
}

export function CockpitSimulatorScene() {
  const dragPtr = useRef<{ id: number; x: number; y: number } | null>(null);

  return (
    <div
      className="fixed inset-0 z-10 bg-[#07152c] touch-none cursor-grab active:cursor-grabbing"
      onPointerDown={(e) => {
        dragPtr.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!dragPtr.current || dragPtr.current.id !== e.pointerId) return;
        const dx = e.clientX - dragPtr.current.x;
        const dy = e.clientY - dragPtr.current.y;
        dragPtr.current.x = e.clientX;
        dragPtr.current.y = e.clientY;
        // Geser kanan -> tengok kanan; geser atas -> dongak ke atas; geser terus -> tengok ke belakang (±180°)!
        cockpitTelemetry.lookYaw = THREE.MathUtils.clamp(cockpitTelemetry.lookYaw - dx * 0.0055, -Math.PI, Math.PI);
        cockpitTelemetry.lookPitch = THREE.MathUtils.clamp(cockpitTelemetry.lookPitch - dy * 0.005, -0.75, 1.35);
      }}
      onPointerUp={(e) => {
        if (dragPtr.current?.id === e.pointerId) dragPtr.current = null;
      }}
      onPointerCancel={() => {
        dragPtr.current = null;
      }}
    >
      <Canvas
        dpr={[1, 1.5]}
        camera={{ fov: 62, near: 0.05, far: 12000 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.08,
        }}
      >
        <fog attach="fog" args={['#8cc5f0', 1100, 5200]} />
        <CockpitWorldAndPhysics />
      </Canvas>
    </div>
  );
}
