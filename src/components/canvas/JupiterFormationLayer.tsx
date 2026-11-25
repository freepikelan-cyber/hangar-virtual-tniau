import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useHangarStore } from '../../store/useHangarStore';
import { getJupiterSpec, JUPITER_AUTO_ORDER, type JupiterManeuverId } from '../../data/jupiterManeuvers';

interface Props {
  sourceGroup: THREE.Group;
}

interface Pose {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
}

const INTRO_DURATION = 11.5; // Durasi masuk satu per satu J1 -> J2 -> J3 -> J4 -> J5 -> J6 + hold formasi rapi
const CYCLE_LEN = 10.0; // Durasi tiap manuver lebih tenang, anggun, dan mulus

// Formasi dasar Arrow Head yang LEGA, SIMETRIS, dan RAPI (rentang sayap KT-1B ≈ 10 unit -> jarak bersih ≥ 13.5 unit!)
const BASE_ARROW: [number, number, number][] = [
  [13.5, -0.5, -13.0],  // J2 Kanan
  [-13.5, -0.5, -13.0], // J3 Kiri
  [0.0, -1.2, -26.0],   // J4 Slot Tengah Belakang
  [27.0, -1.0, -26.0],  // J5 Kanan Luar (Synchro)
  [-27.0, -1.0, -26.0], // J6 Kiri Luar (Synchro)
];

// Titik awal & jadwal masuk satu per satu secara sinematik (J2 -> J3 -> J4 -> J5 -> J6)
const ENTRY_SPECS: { start: number; dur: number; spawn: [number, number, number]; bankSign: number }[] = [
  { start: 1.4, dur: 2.2, spawn: [54, 10, -52], bankSign: 1 },   // J2
  { start: 3.0, dur: 2.2, spawn: [-54, 10, -52], bankSign: -1 }, // J3
  { start: 4.6, dur: 2.2, spawn: [0, -14, -76], bankSign: 0 },   // J4
  { start: 6.2, dur: 2.2, spawn: [68, 14, -68], bankSign: 1 },   // J5
  { start: 7.8, dur: 2.2, spawn: [-68, 14, -68], bankSign: -1 }, // J6
];

function easeInOut(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

function easeOutCubic(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - c, 3);
}

function lerpAngle(current: number, target: number, alpha: number): number {
  let diff = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * alpha;
}

/**
 * Menghitung posisi & sikap 3D relatif yang LEGA, SIMETRIS, dan MULUS untuk 5 pesawat pendamping JAT:
 * - Index 0, 1, 2 -> Jupiter 2, 3, 4 (Main Body bersama Jupiter 1 Leader di [0,0,0])
 * - Index 3, 4    -> Jupiter 5, 6 (Elemen Synchro Pair)
 */
function computeWingmanPose(
  maneuver: Exclude<JupiterManeuverId, 'auto'>,
  idx: number, // 0=J2, 1=J3, 2=J4, 3=J5(Synchro1), 4=J6(Synchro2)
  p: number, // 0..1 progress dalam siklus 10 detik
  showT: number,
): Pose {
  const e = easeInOut(p);
  const sWave = Math.sin(p * Math.PI);
  const fullWave = Math.sin(p * Math.PI * 2);

  let [x, y, z] = BASE_ARROW[idx];
  let rx = 0;
  let ry = 0;
  let rz = 0;

  switch (maneuver) {
    case 'jupiterRoll': {
      rz = -e * Math.PI * 2;
      break;
    }
    case 'jupiterRollBack': {
      rz = p < 0.5 ? -easeInOut(p * 2) * Math.PI * 2 : easeInOut((p - 0.5) * 2) * Math.PI * 2;
      break;
    }
    case 'arrowHead': {
      y += sWave * 2.2;
      rx = -fullWave * 0.34;
      break;
    }
    case 'eagleToArrow': {
      // Formasi Elang lebar membentang -> merapat mulus menjadi Arrow Head!
      const eagle: [number, number, number][] = [
        [15.5, 1.0, -7.5],
        [-15.5, 1.0, -7.5],
        [0.0, -1.6, -18.5],
        [30.5, 2.4, -14.5],
        [-30.5, 2.4, -14.5],
      ];
      const blend = 0.5 - 0.5 * Math.cos(p * Math.PI * 2);
      x = THREE.MathUtils.lerp(eagle[idx][0], BASE_ARROW[idx][0], blend);
      y = THREE.MathUtils.lerp(eagle[idx][1], BASE_ARROW[idx][1], blend) + sWave * 1.6;
      z = THREE.MathUtils.lerp(eagle[idx][2], BASE_ARROW[idx][2], blend);
      rx = -sWave * 0.3;
      break;
    }
    case 'heart': {
      // Synchro J5 (idx=3) & J6 (idx=4) melukis bentuk Hati (♥) RAKSASA di langit!
      if (idx === 3 || idx === 4) {
        const side = idx === 3 ? 1 : -1;
        const a = e * Math.PI;
        x = side * (16 * Math.pow(Math.sin(a), 3)) * 1.12;
        y = (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * 0.7 + 5.2;
        z = -6.0;
        rz = -side * Math.cos(a) * 0.65;
        rx = -Math.sin(a) * 0.28;
      }
      break;
    }
    case 'diamond': {
      // 4 pesawat Main Body (J1–J4) membentuk Wajik (Diamond) lega & simetris
      const diam: [number, number, number][] = [
        [13.5, -0.5, -13.5],
        [-13.5, -0.5, -13.5],
        [0.0, -1.0, -27.0],
        [27.0, -0.8, -27.0],
        [-27.0, -0.8, -27.0],
      ];
      [x, y, z] = diam[idx];
      y += sWave * 2.0;
      rx = -fullWave * 0.34;
      break;
    }
    case 'delta': {
      // Segitiga Delta klasik (1 - 2 - 3) dengan jarak bersih & simetris
      const del: [number, number, number][] = [
        [13.5, -0.5, -13.5],
        [-13.5, -0.5, -13.5],
        [0.0, -1.0, -27.0],
        [27.0, -1.0, -27.0],
        [-27.0, -1.0, -27.0],
      ];
      [x, y, z] = del[idx];
      y += sWave * 2.2;
      rx = -fullWave * 0.36;
      break;
    }
    case 'cloverLeaf': {
      const a = p * Math.PI * 2;
      x = BASE_ARROW[idx][0] + Math.sin(a) * 2.8;
      y = BASE_ARROW[idx][1] + Math.cos(a) * 2.2;
      z = BASE_ARROW[idx][2];
      rz = -Math.sin(a) * 0.65;
      rx = -Math.cos(a) * 0.28;
      break;
    }
    case 'bombBurst': {
      // Puncak pertunjukan! 6 pesawat memencar radial LEBAR & MELENGKUNG MULUS ke 6 penjuru!
      const burst = easeInOut(Math.max(0, (p - 0.2) / 0.8));
      const dirs: [number, number, number][] = [
        [34.0, 8.0, -8.0],
        [-34.0, 8.0, -8.0],
        [0.0, -12.0, -34.0],
        [42.0, -8.5, -22.0],
        [-42.0, -8.5, -22.0],
      ];
      x = THREE.MathUtils.lerp(BASE_ARROW[idx][0], dirs[idx][0], burst);
      y = THREE.MathUtils.lerp(BASE_ARROW[idx][1] + 1.8, dirs[idx][1], burst);
      z = THREE.MathUtils.lerp(BASE_ARROW[idx][2], dirs[idx][2], burst);
      rz = (idx % 2 === 0 ? -1 : 1) * burst * 1.15;
      rx = burst * (dirs[idx][1] < 0 ? 0.38 : -0.32);
      ry = Math.atan2(dirs[idx][0], 24) * burst;
      break;
    }
    case 'screwRoll': {
      // 2 pesawat Synchro: Jupiter 5 lurus stabil di tengah, Jupiter 6 melingkar spiral lebar mengelilingi J5!
      if (idx === 3) {
        x = 0;
        y = 1.4;
        z = -4.0;
        rz = 0;
      } else if (idx === 4) {
        const ang = p * Math.PI * 4;
        x = Math.cos(ang) * 12.0;
        y = 1.4 + Math.sin(ang) * 7.2;
        z = -4.0;
        rz = -ang * 1.1;
      }
      break;
    }
    case 'garuda': {
      // Formasi Sayap Sang Garuda membentang lebar & melengkung megah!
      const garudaPos: [number, number, number][] = [
        [14.0, 1.5, -10.5],
        [-14.0, 1.5, -10.5],
        [0.0, -2.0, -23.0],
        [28.5, 4.2, -19.5],
        [-28.5, 4.2, -19.5],
      ];
      [x, y, z] = garudaPos[idx];
      y += sWave * 2.0;
      rx = -fullWave * 0.34;
      rz = (idx === 0 || idx === 3 ? -0.14 : idx === 1 || idx === 4 ? 0.14 : 0) * sWave;
      break;
    }
    case 'snakeLoop': {
      // Formasi ekor-beriringan rapi (jarak bersih 14 unit per pesawat) meliuk gelombang S halus!
      const trailZ = -(idx + 1) * 14.0;
      const wavePhase = showT * 1.6 - (idx + 1) * 0.65;
      x = Math.sin(wavePhase) * 9.0;
      y = Math.cos(wavePhase * 0.8) * 2.4;
      z = trailZ;
      rz = -Math.cos(wavePhase) * 0.52;
      rx = -Math.sin(wavePhase * 0.8) * 0.2;
      break;
    }
    case 'mirror': {
      // 2 pesawat Synchro: Jupiter 5 terbang normal berdampingan lega dengan Jupiter 6 terbalik 180°!
      if (idx === 3) {
        x = 8.5;
        y = 1.8;
        z = -4.0;
        rz = 0;
      } else if (idx === 4) {
        x = -8.5;
        y = 2.2;
        z = -4.0;
        rz = Math.PI;
      }
      break;
    }
    case 'twinHalfCuban': {
      if (idx === 3 || idx === 4) {
        const side = idx === 3 ? 1 : -1;
        x = side * (9.0 + Math.cos(p * Math.PI * 2) * 11.5);
        y = 1.8 + Math.sin(p * Math.PI * 2) * 6.5;
        z = -5.0;
        rx = -Math.cos(p * Math.PI * 2) * 0.58;
        rz = side * e * Math.PI * 2;
      }
      break;
    }
    case 'barrelRoll': {
      const a = e * Math.PI * 2;
      x = BASE_ARROW[idx][0] + Math.sin(a) * 2.6;
      y = BASE_ARROW[idx][1] + (1 - Math.cos(a)) * 1.6;
      z = BASE_ARROW[idx][2];
      rz = -a;
      break;
    }
    case 'rollSlide': {
      const shift = Math.sin(p * Math.PI * 2);
      x = BASE_ARROW[idx][0] + shift * (idx % 2 === 0 ? -4.2 : 4.2);
      y = BASE_ARROW[idx][1] + Math.abs(shift) * (idx % 2 === 0 ? 2.0 : -2.0);
      z = BASE_ARROW[idx][2];
      rz = -shift * 0.85;
      break;
    }
    case 'soloSpin': {
      if (idx === 3) {
        x = 0.0;
        y = 6.0 - e * 9.5;
        z = -4.0;
        rx = 0.82;
        ry = p * Math.PI * 6;
        rz = 0.42;
      }
      break;
    }
    case 'fiveCards': {
      const cards: [number, number, number][] = [
        [13.5, 0.8, -8.5],
        [-13.5, 0.8, -8.5],
        [27.0, 2.0, -17.0],
        [-27.0, 2.0, -17.0],
        [0.0, -3.4, -24.0],
      ];
      [x, y, z] = cards[idx];
      y += sWave * 2.0;
      rx = -fullWave * 0.34;
      break;
    }
    case 'leaderBenefit': {
      const frame: [number, number, number][] = [
        [14.5, 1.4, -15.5],
        [-14.5, 1.4, -15.5],
        [0.0, -2.5, -28.0],
        [28.5, 3.2, -28.0],
        [-28.5, 3.2, -28.0],
      ];
      [x, y, z] = frame[idx];
      rz = (idx === 0 || idx === 3 ? -0.22 : idx === 1 || idx === 4 ? 0.22 : 0) * sWave;
      break;
    }
    case 'crossOverBreak': {
      // Pecah silang rapi dengan separasi vertikal 6.5 unit agar tidak pernah bertabrakan!
      const cross = Math.sin(p * Math.PI);
      const isRight = idx === 0 || idx === 3;
      const isLeft = idx === 1 || idx === 4;
      if (isRight) {
        x = THREE.MathUtils.lerp(BASE_ARROW[idx][0], -BASE_ARROW[idx][0] * 1.1, cross);
        y = BASE_ARROW[idx][1] + cross * 3.8;
        rz = 0.95 * cross;
        ry = -0.26 * cross;
      } else if (isLeft) {
        x = THREE.MathUtils.lerp(BASE_ARROW[idx][0], -BASE_ARROW[idx][0] * 1.1, cross);
        y = BASE_ARROW[idx][1] - cross * 2.8;
        rz = -0.95 * cross;
        ry = 0.26 * cross;
      } else {
        y = BASE_ARROW[idx][1] + cross * 5.2;
      }
      break;
    }
    case 'bombers': {
      // Formasi Bombers berjajar lebar super rapi (jarak bersih 14 unit per pesawat!)
      const bombPos: [number, number, number][] = [
        [14.0, 0.0, -6.5],
        [-14.0, 0.0, -6.5],
        [28.0, 0.5, -13.0],
        [-28.0, 0.5, -13.0],
        [0.0, -1.2, -21.0],
      ];
      [x, y, z] = bombPos[idx];
      break;
    }
  }

  return { x, y, z, rx, ry, rz };
}

/**
 * Formasi 6 Pesawat JUPITER AEROBATIC TEAM TNI AU (KT-1B Wong Bee):
 * - Pembukaan sinematik: masuk satu per satu secara mulus (J1 -> J2 -> J3 -> J4 -> J5 -> J6)
 * - Jarak formasi lega & simetris (≥ 13.5 unit antar pesawat) + transisi sudut shortest-arc mulus
 */
export function JupiterFormationLayer({ sourceGroup }: Props) {
  const selectedId = useHangarStore((s) => s.selectedId);
  const flightMode = useHangarStore((s) => s.flightMode);
  const flightNonce = useHangarStore((s) => s.flightNonce);
  const jupiterManeuver = useHangarStore((s) => s.jupiterManeuver);
  const setFlightLabel = useHangarStore((s) => s.setFlightLabel);

  const wingRefs = useRef<(THREE.Group | null)[]>([]);
  const leaderFxRef = useRef<THREE.Group>(null);
  const heartSmokeRef = useRef<THREE.Group>(null);
  const timer = useRef(0);
  const spawnedRef = useRef<boolean[]>([false, false, false, false, false]);

  const isActive = selectedId === 'kt1b' && flightMode === 'maneuver';
  const currentSpec = useMemo(() => {
    if (jupiterManeuver === 'auto') return null;
    return getJupiterSpec(jupiterManeuver);
  }, [jupiterManeuver]);

  // Reset urutan masuk satu per satu setiap kali Jupiter Aerobatic Show dimulai ulang
  useEffect(() => {
    timer.current = 0;
    spawnedRef.current = [false, false, false, false, false];
    wingRefs.current.forEach((grp, idx) => {
      if (!grp) return;
      const [sx, sy, sz] = ENTRY_SPECS[idx].spawn;
      grp.position.set(sx, sy, sz);
      grp.rotation.set(0, 0, 0);
      grp.visible = false;
    });
  }, [isActive, flightNonce]);

  const wingmen = useMemo(() => {
    if (selectedId !== 'kt1b') return [];
    return [2, 3, 4, 5, 6].map((num) => {
      const clone = sourceGroup.clone(true);
      const gear = clone.getObjectByName('landing-gear');
      if (gear) gear.visible = false;
      return { num, obj: clone, role: num <= 4 ? 'MAIN BODY' : 'SYNCHRO' };
    });
  }, [sourceGroup, selectedId]);

  // Hati Asap Putih Raksasa 3D (skala lega agar selaras dengan lintasan Synchro J5 & J6!)
  const heartPoints = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const hx = 16 * Math.pow(Math.sin(a), 3) * 1.12;
      const hy = (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * 0.7 + 5.2;
      pts.push([hx, hy, -7.0]);
    }
    return pts;
  }, []);

  useFrame((state, delta) => {
    if (!isActive) {
      timer.current = 0;
      return;
    }
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    timer.current += dt;
    const elapsed = timer.current;

    // === FASE 1: PEMBUKAAN MASUK SATU PER SATU (0 .. 11.5 DETIK) ===
    if (elapsed < INTRO_DURATION) {
      if (leaderFxRef.current) leaderFxRef.current.visible = true;
      if (heartSmokeRef.current) heartSmokeRef.current.visible = false;

      if (elapsed < 1.4) {
        setFlightLabel('JUPITER AEROBATIC SHOW • JUPITER 1 (LEADER) MEMIMPIN FORMASI');
      } else if (elapsed < 3.0) {
        setFlightLabel('JUPITER AEROBATIC SHOW • JUPITER 2 MASUK FORMASI KANAN');
      } else if (elapsed < 4.6) {
        setFlightLabel('JUPITER AEROBATIC SHOW • JUPITER 3 MASUK FORMASI KIRI');
      } else if (elapsed < 6.2) {
        setFlightLabel('JUPITER AEROBATIC SHOW • JUPITER 4 MASUK SLOT BELAKANG');
      } else if (elapsed < 7.8) {
        setFlightLabel('JUPITER AEROBATIC SHOW • JUPITER 5 (SYNCHRO) BERGABUNG');
      } else if (elapsed < 9.8) {
        setFlightLabel('JUPITER AEROBATIC SHOW • JUPITER 6 (SYNCHRO) BERGABUNG');
      } else {
        setFlightLabel('JUPITER AEROBATIC SHOW • FORMASI 6 PESAWAT LENGKAP — SIAP MANUVER!');
      }

      wingRefs.current.forEach((grp, idx) => {
        if (!grp) return;
        const entry = ENTRY_SPECS[idx];
        if (elapsed < entry.start) {
          grp.visible = false;
          return;
        }
        if (!spawnedRef.current[idx]) {
          spawnedRef.current[idx] = true;
          grp.position.set(...entry.spawn);
          grp.rotation.set(0, 0, 0);
        }
        grp.visible = true;
        const p = Math.min(1, (elapsed - entry.start) / entry.dur);
        const e = easeOutCubic(p);
        const target = BASE_ARROW[idx];
        const curveArc = Math.sin(p * Math.PI);

        const gx = THREE.MathUtils.lerp(entry.spawn[0], target[0], e);
        const gy = THREE.MathUtils.lerp(entry.spawn[1], target[1], e) + curveArc * 1.4;
        const gz = THREE.MathUtils.lerp(entry.spawn[2], target[2], e);
        const bank = entry.bankSign * curveArc * 0.48;
        const yaw = -entry.bankSign * curveArc * 0.2;
        const pitch = (entry.spawn[1] > target[1] ? 0.1 : -0.14) * curveArc;

        grp.position.set(gx, gy, gz);
        grp.rotation.set(pitch, yaw, bank);
      });
      return;
    }

    // === FASE 2: PERTUNJUKAN MANUVER FORMASI MULUS ===
    const showT = elapsed - INTRO_DURATION;
    const activeId: Exclude<JupiterManeuverId, 'auto'> =
      jupiterManeuver === 'auto'
        ? JUPITER_AUTO_ORDER[Math.floor(showT / CYCLE_LEN) % JUPITER_AUTO_ORDER.length]
        : jupiterManeuver;
    const p = (showT % CYCLE_LEN) / CYCLE_LEN;

    const spec = getJupiterSpec(activeId);
    setFlightLabel(`JUPITER AEROBATIC SHOW (${spec.activeShips.length} PESAWAT) • ${spec.name.toUpperCase()}`);

    const leaderInScene = spec.activeShips.includes(1);
    if (leaderFxRef.current) {
      leaderFxRef.current.visible = leaderInScene;
    }

    const posAlpha = Math.min(1, dt * 3.1);
    const rotAlpha = Math.min(1, dt * 3.4);

    wingRefs.current.forEach((grp, idx) => {
      if (!grp) return;
      const shipNum = idx + 2; // 2..6
      const shipActive = spec.activeShips.includes(shipNum);
      if (!shipActive) {
        const exitX = shipNum % 2 === 0 ? 120 : -120;
        grp.position.x = THREE.MathUtils.lerp(grp.position.x, exitX, Math.min(1, dt * 2.2));
        grp.position.y = THREE.MathUtils.lerp(grp.position.y, 28, Math.min(1, dt * 2.2));
        grp.position.z = THREE.MathUtils.lerp(grp.position.z, -90, Math.min(1, dt * 2.2));
        grp.rotation.z = lerpAngle(grp.rotation.z, shipNum % 2 === 0 ? -0.75 : 0.75, rotAlpha);
        grp.visible = Math.abs(grp.position.x) < 82;
        return;
      }

      grp.visible = true;
      const pose = computeWingmanPose(activeId, idx, p, showT);
      grp.position.x = THREE.MathUtils.lerp(grp.position.x, pose.x, posAlpha);
      grp.position.y = THREE.MathUtils.lerp(grp.position.y, pose.y, posAlpha);
      grp.position.z = THREE.MathUtils.lerp(grp.position.z, pose.z, posAlpha);
      grp.rotation.x = lerpAngle(grp.rotation.x, pose.rx, rotAlpha);
      grp.rotation.y = lerpAngle(grp.rotation.y, pose.ry, rotAlpha);
      // Untuk manuver roll penuh 360°, ikuti sudut langsung agar tidak terpotong shortest-arc
      if (
        activeId === 'jupiterRoll' ||
        activeId === 'jupiterRollBack' ||
        activeId === 'barrelRoll' ||
        activeId === 'screwRoll' ||
        activeId === 'twinHalfCuban'
      ) {
        grp.rotation.z = THREE.MathUtils.lerp(grp.rotation.z, pose.rz, Math.min(1, dt * 5.0));
      } else {
        grp.rotation.z = lerpAngle(grp.rotation.z, pose.rz, rotAlpha);
      }
    });

    if (heartSmokeRef.current) {
      heartSmokeRef.current.visible = activeId === 'heart';
      if (activeId === 'heart') {
        const s = 0.94 + Math.sin(t * 1.5) * 0.025;
        heartSmokeRef.current.scale.setScalar(s);
      }
    }
  });

  if (!isActive) return null;

  const showLeaderBadge = !currentSpec || currentSpec.activeShips.includes(1);

  return (
    <group name="jupiter-6ship-formation">
      {/* Jejak Asap Putih Aerobatik ramping untuk Jupiter 1 (Leader) */}
      <group ref={leaderFxRef}>
        <mesh position={[0, 1.35, -13.5]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.52, 16.5, 12, 1, true]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.34} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        {showLeaderBadge && (
          <Html position={[0, 3.6, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
            <span className="whitespace-nowrap rounded border border-[#ffb703]/80 bg-[#0a1e3c]/85 px-1.5 py-0.5 font-display text-[8px] font-bold tracking-wider text-[#ffb703] uppercase shadow">
              J1 • LEADER
            </span>
          </Html>
        )}
      </group>

      {/* 5 Pesawat Wingman: Jupiter 2–4 (Main Body) & Jupiter 5–6 (Synchro) */}
      {wingmen.map((w, idx) => {
        const showBadge = !currentSpec || currentSpec.activeShips.includes(w.num);
        return (
          <group
            key={`jupiter-${w.num}`}
            ref={(el) => {
              wingRefs.current[idx] = el;
            }}
            visible={false}
          >
            <primitive object={w.obj} />
            <mesh position={[0, 1.35, -13.5]} rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.48, 16.0, 12, 1, true]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.32} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
            {showBadge && (
              <Html position={[0, 3.6, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
                <span
                  className={`whitespace-nowrap rounded px-1.5 py-0.5 font-display text-[8px] font-bold tracking-wider uppercase shadow ${
                    w.num <= 4
                      ? 'border border-[#ffb703]/70 bg-[#0a1e3c]/80 text-[#ffb703]'
                      : 'border border-rose-400/80 bg-rose-950/85 text-rose-200'
                  }`}
                >
                  J{w.num} • {w.role}
                </span>
              </Html>
            )}
          </group>
        );
      })}

      {/* Formasi Hati Asap Putih 3D Raksasa (Heart Loop / Hearts) */}
      <group ref={heartSmokeRef} visible={false}>
        {heartPoints.map((pt, i) => (
          <mesh key={i} position={pt}>
            <icosahedronGeometry args={[0.92, 1]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.52} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
