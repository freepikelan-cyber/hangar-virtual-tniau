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
  makeHangarMetalTexture,
  makeMountainDetailTextures,
  makeOceanTextures,
  makePhotorealCloudTexture,
  makeRunwayAsphaltTexture,
} from '../../utils/terrainTextures';

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
  const crashFireRef = useRef<THREE.Group>(null);
  const crashSmokeRefs = useRef<(THREE.Mesh | null)[]>([]);
  const stickPivotRef = useRef<THREE.Group>(null);
  const throttleLeverRef = useRef<THREE.Group>(null);
  const ringRefs = useRef<(THREE.Mesh | null)[]>([]);
  const passedSetRef = useRef<Set<number>>(new Set());
  const extGearLerp = useRef(0);

  const euler = useMemo(() => new THREE.Euler(0, 0, 0, 'YXZ'), []);
  const quat = useMemo(() => new THREE.Quaternion(), []);
  const extEuler = useMemo(() => new THREE.Euler(0, 0, 0, 'YXZ'), []);
  const extQuat = useMemo(() => new THREE.Quaternion(), []);
  const forwardVec = useMemo(() => new THREE.Vector3(), []);
  const camOffset = useMemo(() => new THREE.Vector3(), []);
  const lookTarget = useMemo(() => new THREE.Vector3(), []);

  // Tekstur & geometri dunia terbang 3D
  const skyTex = useMemo(() => makeSimSkyTexture(timeOfDay), [timeOfDay]);
  const runwayTex = useMemo(() => makeRunwayAsphaltTexture(), []);
  const grassTex = useMemo(() => makeAirbaseGrassTexture(), []);
  const hangarTex = useMemo(() => makeHangarMetalTexture(), []);
  const oceanTex = useMemo(() => makeOceanTextures(), []);
  const mtnDetail = useMemo(() => makeMountainDetailTextures(), []);
  const cloudTex = useMemo(() => makePhotorealCloudTexture(), []);
  const mtnGeo = useMemo(() => buildMountainRangeGeometry(520, 680), []);

  const mfdLeftTex = useMemo(() => makeMfdTexture('radar', unit.code), [unit.code]);
  const mfdCenterTex = useMemo(() => makeMfdTexture('hsi', unit.code), [unit.code]);
  const mfdRightTex = useMemo(() => makeMfdTexture('engine', unit.code), [unit.code]);

  const clouds = useMemo(() => {
    const arr: { x: number; y: number; z: number; s: number }[] = [];
    let seed = 7713;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 34; i++) {
      arr.push({
        x: (rand() - 0.5) * 1400,
        y: 95 + rand() * 140,
        z: -350 + rand() * 1450,
        s: 36 + rand() * 44,
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
      mtnGeo.dispose();
      mfdLeftTex.dispose();
      mfdCenterTex.dispose();
      mfdRightTex.dispose();
    };
  }, [skyTex, runwayTex, grassTex, hangarTex, oceanTex, mtnDetail, cloudTex, mtnGeo, mfdLeftTex, mfdCenterTex, mfdRightTex]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const tel = cockpitTelemetry;
    const inp = cockpitInput;

    // Animasi riak ombak laut
    oceanTex.map.offset.y -= dt * 0.06;
    oceanTex.bumpMap.offset.y -= dt * 0.06;

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
    }

    // Reset posisi ke Runway 09
    if (inp.resetRequested) {
      resetCockpitSimState(profile.isVtol, true);
      passedSetRef.current.clear();
    }

    // Mode Pesawat Jatuh & Terbakar -> Otomatis ulang dari awal setelah 3.2 detik!
    if (tel.crashed) {
      tel.crashTimer = Math.max(0, tel.crashTimer - dt);
      if (cockpitRigRef.current) cockpitRigRef.current.visible = false;
      if (extAircraftRef.current) {
        extAircraftRef.current.visible = true;
        extAircraftRef.current.position.set(tel.x, Math.max(0.6, tel.y - 1.5), tel.z);
        extEuler.set(-tel.pitch * 0.4, tel.yaw, tel.roll * 0.7, 'YXZ');
        extAircraftRef.current.quaternion.setFromEuler(extEuler);
      }
      if (crashFireRef.current) {
        crashFireRef.current.visible = true;
        crashFireRef.current.position.set(tel.x, Math.max(1.2, tel.y - 0.6), tel.z);
        const flicker = 1.0 + Math.sin(t * 28) * 0.28 + Math.cos(t * 17) * 0.16;
        crashFireRef.current.scale.set(flicker, flicker * 1.25, flicker);
        crashSmokeRefs.current.forEach((sm, idx) => {
          if (!sm) return;
          const rise = ((t * 1.9 + idx * 0.35) % 2.4);
          sm.position.set(Math.sin(t * 2 + idx) * (0.8 + rise), rise * 4.8, Math.cos(t * 1.7 + idx) * (0.8 + rise));
          const sc = 0.7 + rise * 1.3;
          sm.scale.set(sc, sc, sc);
        });
      }
      // Kamera mundur menyaksikan pesawat terbakar dengan getaran dampak
      const shake = tel.crashTimer > 2.4 ? (tel.crashTimer - 2.4) * 0.6 : 0.08;
      camera.position.set(
        tel.x - Math.sin(tel.yaw) * 16 + Math.sin(t * 45) * shake,
        Math.max(4.5, tel.y + 6.5) + Math.cos(t * 40) * shake,
        tel.z - Math.cos(tel.yaw) * 16,
      );
      lookTarget.set(tel.x, Math.max(1.5, tel.y), tel.z);
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
            tel.crashTimer = 3.2;
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

    // Batasi area dunia terbang agar tidak terlalu jauh dari peta
    tel.x = THREE.MathUtils.clamp(tel.x, -950, 950);
    tel.z = THREE.MathUtils.clamp(tel.z, -650, 1250);
    tel.y = Math.min(360, tel.y);

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
      camera.position.set(tel.x + shakeX, tel.y + shakeY, tel.z);
      camera.quaternion.copy(quat);

      if (cockpitRigRef.current) {
        cockpitRigRef.current.visible = true;
        cockpitRigRef.current.position.copy(camera.position);
        cockpitRigRef.current.quaternion.copy(camera.quaternion);
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
        camOffset.set(0, 5.2, -17.5).applyQuaternion(extQuat);
        camera.position.set(tel.x + camOffset.x + shakeX, tel.y + camOffset.y + shakeY, tel.z + camOffset.z);
        lookTarget.set(tel.x + Math.sin(tel.yaw) * 14, tel.y + Math.sin(tel.pitch) * 6, tel.z + Math.cos(tel.yaw) * 14);
        camera.lookAt(lookTarget);
      } else if (tel.cameraMode === 'wing') {
        camOffset.set(13.5, 3.2, -8.5).applyQuaternion(extQuat);
        camera.position.set(tel.x + camOffset.x, tel.y + camOffset.y, tel.z + camOffset.z);
        lookTarget.set(tel.x, tel.y - 0.5, tel.z);
        camera.lookAt(lookTarget);
      } else {
        // Orbit sinematik 360° mengelilingi pesawat sambil terbang!
        const ang = t * 0.45;
        camera.position.set(tel.x + Math.cos(ang) * 22, tel.y + 6.8, tel.z + Math.sin(ang) * 22);
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
      throttleLeverRef.current.position.z = -0.58 - tel.throttle * 0.14;
      throttleLeverRef.current.rotation.x = -0.35 - tel.throttle * 0.45;
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

      {/* Kubah Langit 3D */}
      <mesh>
        <sphereGeometry args={[1800, 32, 24]} />
        <meshBasicMaterial map={skyTex} side={THREE.BackSide} depthWrite={false} fog={false} />
      </mesh>

      {/* === DUNIA TERBANG 3D: RUNWAY 09, LANUD, PEGUNUNGAN, LAUT & AWAN === */}
      {/* Daratan Rumput Lanud */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-120, -0.05, 80]}>
        <planeGeometry args={[520, 720]} />
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

      {/* Pegunungan Prosedural di Utara & Barat */}
      <mesh geometry={mtnGeo} position={[-140, -0.2, 680]}>
        <meshStandardMaterial
          vertexColors
          map={mtnDetail.map}
          bumpMap={mtnDetail.bumpMap}
          bumpScale={0.7}
          roughness={0.92}
        />
      </mesh>
      <mesh geometry={mtnGeo} position={[-420, -0.2, 180]}>
        <meshStandardMaterial
          vertexColors
          map={mtnDetail.map}
          bumpMap={mtnDetail.bumpMap}
          bumpScale={0.7}
          roughness={0.92}
        />
      </mesh>

      {/* Lautan Luas Berombak di Timur & Sekeliling */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[420, -0.3, 280]}>
        <planeGeometry args={[1400, 2200]} />
        <meshStandardMaterial
          map={oceanTex.map}
          bumpMap={oceanTex.bumpMap}
          bumpScale={0.65}
          roughness={0.16}
          metalness={0.5}
        />
      </mesh>

      {/* Awan Cumulus Volumetrik */}
      {clouds.map((cl, idx) => (
        <sprite key={`sim-cloud-${idx}`} position={[cl.x, cl.y, cl.z]} scale={[cl.s * 1.6, cl.s, 1]}>
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

      {/* Efek Kebakaran & Ledakan 3D saat Pesawat Jatuh (Crash!) */}
      <group ref={crashFireRef} name="sim-crash-fire" visible={false}>
        <mesh>
          <sphereGeometry args={[2.6, 14, 14]} />
          <meshBasicMaterial color="#fff7ed" transparent opacity={0.92} />
        </mesh>
        <mesh position={[0, 1.2, 0]}>
          <sphereGeometry args={[3.8, 14, 14]} />
          <meshBasicMaterial color="#f97316" transparent opacity={0.74} />
        </mesh>
        <mesh position={[0, 2.2, 0]}>
          <sphereGeometry args={[4.8, 12, 12]} />
          <meshBasicMaterial color="#dc2626" transparent opacity={0.45} />
        </mesh>
        {[0, 1, 2, 3, 4, 5].map((idx) => (
          <mesh
            key={`crash-sm-${idx}`}
            ref={(el) => {
              crashSmokeRefs.current[idx] = el;
            }}
          >
            <sphereGeometry args={[2.2, 10, 10]} />
            <meshBasicMaterial color="#1f2937" transparent opacity={0.72} depthWrite={false} />
          </mesh>
        ))}
      </group>

      {/* === INTERIOR KOKPIT 3D FIRST-PERSON (Menempel presisi pada kursi pilot / kamera) === */}
      <group ref={cockpitRigRef} name="first-person-cockpit-3d">
        {/* Lampu lembut instrumen kokpit */}
        <pointLight position={[0, -0.15, -0.55]} color="#34d399" intensity={0.9} distance={2.5} />

        {/* Bingkai Kanopi Kiri, Kanan & Lengkungan Atas (Canopy Arch Bow) */}
        <mesh position={[0, 0.36, -0.78]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.62, 0.022, 10, 32, Math.PI]} />
          <meshStandardMaterial color="#1a2230" roughness={0.45} metalness={0.55} />
        </mesh>
        <mesh position={[-0.64, -0.18, -0.58]} rotation={[0.15, 0.12, 0]}>
          <boxGeometry args={[0.045, 0.045, 1.15]} />
          <meshStandardMaterial color="#1f2937" roughness={0.5} metalness={0.5} />
        </mesh>
        <mesh position={[0.64, -0.18, -0.58]} rotation={[0.15, -0.12, 0]}>
          <boxGeometry args={[0.045, 0.045, 1.15]} />
          <meshStandardMaterial color="#1f2937" roughness={0.5} metalness={0.5} />
        </mesh>

        {/* Dashboard Glare Shield Utama */}
        <mesh position={[0, -0.38, -0.82]} rotation={[0.18, 0, 0]}>
          <boxGeometry args={[1.32, 0.34, 0.44]} />
          <meshStandardMaterial color="#141b26" roughness={0.78} metalness={0.28} />
        </mesh>
        {/* Konsol samping kiri & kanan */}
        <mesh position={[-0.56, -0.46, -0.45]}>
          <boxGeometry args={[0.24, 0.24, 0.92]} />
          <meshStandardMaterial color="#17202e" roughness={0.75} metalness={0.25} />
        </mesh>
        <mesh position={[0.56, -0.46, -0.45]}>
          <boxGeometry args={[0.24, 0.24, 0.92]} />
          <meshStandardMaterial color="#17202e" roughness={0.75} metalness={0.25} />
        </mesh>

        {/* Kaca Combiner HUD Militer di atas Glare Shield */}
        <group position={[0, -0.08, -0.74]} rotation={[-0.32, 0, 0]}>
          <mesh>
            <planeGeometry args={[0.36, 0.26]} />
            <meshBasicMaterial color="#10b981" transparent opacity={0.08} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          {/* Bingkai tipis kiri-kanan kaca HUD */}
          <mesh position={[-0.185, 0, 0]}>
            <boxGeometry args={[0.012, 0.27, 0.012]} />
            <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0.185, 0, 0]}>
            <boxGeometry args={[0.012, 0.27, 0.012]} />
            <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>

        {/* 3 Layar MFD Menyala (Kiri: Radar, Tengah: HSI Nav, Kanan: Engine Telemetry) */}
        {[
          { x: -0.34, y: -0.33, rotY: 0.16, tex: mfdLeftTex },
          { x: 0.0, y: -0.35, rotY: 0.0, tex: mfdCenterTex },
          { x: 0.34, y: -0.33, rotY: -0.16, tex: mfdRightTex },
        ].map((mfd, i) => (
          <group key={`mfd-${i}`} position={[mfd.x, mfd.y, -0.59]} rotation={[-0.22, mfd.rotY, 0]}>
            {/* Bezel MFD */}
            <mesh>
              <boxGeometry args={[0.24, 0.21, 0.024]} />
              <meshStandardMaterial color="#0f172a" roughness={0.6} metalness={0.4} />
            </mesh>
            {/* Layar MFD Bercahaya */}
            <mesh position={[0, 0, 0.014]}>
              <planeGeometry args={[0.21, 0.18]} />
              <meshBasicMaterial map={mfd.tex} />
            </mesh>
          </group>
        ))}

        {/* Tuas Joystick HOTAS 3D (Bergerak nyata mengikuti input Keyboard / Virtual Joystick!) */}
        <group position={[0.0, -0.54, -0.52]}>
          {/* Boot karet dasar joystick */}
          <mesh>
            <cylinderGeometry args={[0.05, 0.07, 0.05, 12]} />
            <meshStandardMaterial color="#0f172a" roughness={0.85} />
          </mesh>
          <group ref={stickPivotRef} position={[0, 0.02, 0]}>
            <mesh position={[0, 0.09, 0]}>
              <cylinderGeometry args={[0.018, 0.022, 0.18, 10]} />
              <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.5} />
            </mesh>
            {/* Grip kepala HOTAS + tombol senjata merah */}
            <mesh position={[0, 0.19, 0.01]} rotation={[-0.2, 0, 0]}>
              <boxGeometry args={[0.044, 0.065, 0.048]} />
              <meshStandardMaterial color="#111827" roughness={0.6} metalness={0.35} />
            </mesh>
            <mesh position={[0.012, 0.21, 0.026]}>
              <sphereGeometry args={[0.009, 8, 8]} />
              <meshBasicMaterial color="#ef4444" />
            </mesh>
          </group>
        </group>

        {/* Tuas Throttle 3D di Konsol Kiri (Maju/mundur mengikuti input Throttle!) */}
        <group ref={throttleLeverRef} position={[-0.46, -0.36, -0.58]} rotation={[-0.35, 0, 0]}>
          <mesh position={[0, 0.06, 0]}>
            <boxGeometry args={[0.026, 0.12, 0.024]} />
            <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.125, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.022, 0.022, 0.095, 10]} />
            <meshStandardMaterial color="#0f172a" roughness={0.65} />
          </mesh>
        </group>
      </group>
    </>
  );
}

export function CockpitSimulatorScene() {
  return (
    <div className="fixed inset-0 z-10 bg-[#07152c] touch-none">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ fov: 62, near: 0.05, far: 2400 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.08,
        }}
      >
        <fog attach="fog" args={['#8cc5f0', 260, 1550]} />
        <CockpitWorldAndPhysics />
      </Canvas>
    </div>
  );
}
