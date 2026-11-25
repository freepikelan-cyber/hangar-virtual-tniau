import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useHangarStore } from '../../store/useHangarStore';
import { getJupiterSpec, type JupiterManeuverId } from '../../data/jupiterManeuvers';
import {
  JUPITER_PARTS,
  JUPITER_SCRIPT,
  JUPITER_SHOW_TOTAL_SEC,
  jupiterShowLive,
} from '../../data/jupiterShowScript';
import { jupiterRadioPlayer } from '../../utils/jupiterRadioPlayer';

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

const CYCLE_LEN = 10.0; // Durasi tiap manuver lebih tenang, anggun, dan mulus

// Formasi dasar Arrow Head yang LEGA, SIMETRIS, dan RAPI (rentang sayap KT-1B ≈ 10 unit -> jarak bersih ≥ 13.5 unit!)
const BASE_ARROW: [number, number, number][] = [
  [13.5, -0.5, -13.0],  // J2 Kanan
  [-13.5, -0.5, -13.0], // J3 Kiri
  [0.0, -1.2, -26.0],   // J4 Slot Tengah Belakang
  [27.0, -1.0, -26.0],  // J5 Kanan Luar (Synchro)
  [-27.0, -1.0, -26.0], // J6 Kiri Luar (Synchro)
];

function easeInOut(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
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
  const soundEnabled = useHangarStore((s) => s.soundEnabled);
  const jupiterManeuver = useHangarStore((s) => s.jupiterManeuver);
  const setFlightLabel = useHangarStore((s) => s.setFlightLabel);

  const wingRefs = useRef<(THREE.Group | null)[]>([]);
  const wingSmokeRefs = useRef<(THREE.Mesh | null)[]>([]);
  const leaderFxRef = useRef<THREE.Group>(null);
  const leaderSmokeRef = useRef<THREE.Mesh>(null);
  const heartSmokeRef = useRef<THREE.Group>(null);
  const timer = useRef(0);
  const lastSpokenId = useRef(-1);
  const spawnedRef = useRef<boolean[]>([false, false, false, false, false]);

  const isActive = selectedId === 'kt1b' && flightMode === 'maneuver';
  const currentSpec = useMemo(() => {
    if (jupiterManeuver === 'auto') return null;
    return getJupiterSpec(jupiterManeuver);
  }, [jupiterManeuver]);

  // Reset skenario 5-Part & hentikan radio saat pertunjukan dimulai ulang atau keluar
  useEffect(() => {
    timer.current = 0;
    lastSpokenId.current = -1;
    jupiterShowLive.time = 0;
    jupiterShowLive.part = 1;
    jupiterShowLive.activeLine = JUPITER_SCRIPT[0];
    jupiterShowLive.seekTarget = null;
    spawnedRef.current = [false, false, false, false, false];
    if (!isActive) {
      jupiterRadioPlayer.stop();
    }
    return () => {
      jupiterRadioPlayer.stop();
    };
  }, [isActive, flightNonce, jupiterManeuver]);

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

    // === MODE UTAMA: SKENARIO LENGKAP 5-PART BERURUTAN (Part 1 -> Part 5) ===
    if (jupiterManeuver === 'auto') {
      if (jupiterShowLive.seekTarget !== null) {
        timer.current = jupiterShowLive.seekTarget;
        jupiterShowLive.seekTarget = null;
        lastSpokenId.current = -1;
        jupiterRadioPlayer.stop();
      } else {
        timer.current += dt;
        if (timer.current >= JUPITER_SHOW_TOTAL_SEC) {
          timer.current = 0;
          lastSpokenId.current = -1;
        }
      }

      const st = timer.current;
      jupiterShowLive.time = st;

      // Cari baris dialog & Part aktif saat ini
      let curLine = JUPITER_SCRIPT[0];
      for (let i = JUPITER_SCRIPT.length - 1; i >= 0; i--) {
        if (st >= JUPITER_SCRIPT[i].tStart) {
          curLine = JUPITER_SCRIPT[i];
          break;
        }
      }
      jupiterShowLive.part = curLine.part;
      jupiterShowLive.activeLine = curLine;

      if (curLine.id !== lastSpokenId.current && st >= curLine.tStart) {
        lastSpokenId.current = curLine.id;
        jupiterRadioPlayer.speak(curLine.text, curLine.role, soundEnabled);
      }

      const partMeta = JUPITER_PARTS[curLine.part - 1];
      setFlightLabel(`${partMeta.title.toUpperCase()}`);

      // Smoke ON mulai "Gears up, smoke on!" (35s) sampai "Smoke off, prepare for landing" (122s)
      const smokeOn = st >= 35.0 && st < 122.0;
      if (leaderFxRef.current) leaderFxRef.current.visible = true;
      if (leaderSmokeRef.current) leaderSmokeRef.current.visible = smokeOn;

      const posAlpha = Math.min(1, dt * 3.4);
      const rotAlpha = Math.min(1, dt * 3.8);

      // Formasi Holding Short / Departure di Runway (Part 1 & awal Part 2)
      const HOLDING_POS: [number, number, number][] = [
        [10.5, 0, -6.5],
        [-10.5, 0, -6.5],
        [0, 0, -14.5],
        [18.5, 0, -14.5],
        [-18.5, 0, -14.5],
      ];
      // Formasi Left Echelon (Part 5 Rejoin & Landing di sayap kiri Leader)
      const LEFT_ECHELON: [number, number, number][] = [
        [9.5, 0.3, -8.5],
        [19.0, 0.6, -17.0],
        [28.5, 0.9, -25.5],
        [38.0, 1.2, -34.0],
        [47.5, 1.5, -42.5],
      ];

      wingRefs.current.forEach((grp, idx) => {
        if (!grp) return;
        grp.visible = true;
        const wSmoke = wingSmokeRefs.current[idx];
        let x = BASE_ARROW[idx][0];
        let y = BASE_ARROW[idx][1];
        let z = BASE_ARROW[idx][2];
        let rx = 0;
        let ry = 0;
        let rz = 0;
        let shipSmoke = smokeOn;

        if (st < 28.2) {
          // Part 1 & Part 2 Check-In: Holding Short Runway 09
          [x, y, z] = HOLDING_POS[idx];
          shipSmoke = false;
        } else if (st < 48.0) {
          // Part 2: Brakes Release -> Rolling -> Rotate -> Climb ke Aerobatic Box!
          const p = easeInOut((st - 28.2) / 14.0);
          x = THREE.MathUtils.lerp(HOLDING_POS[idx][0], BASE_ARROW[idx][0], p);
          y = THREE.MathUtils.lerp(0, BASE_ARROW[idx][1], p) + Math.sin(p * Math.PI) * 1.4;
          z = THREE.MathUtils.lerp(HOLDING_POS[idx][2], BASE_ARROW[idx][2], p);
          rx = st > 31.5 && st < 42.0 ? -0.22 * Math.sin(Math.min(1, (st - 31.5) / 10.5) * Math.PI) : 0;
        } else if (st < 59.0) {
          // Part 3A: Tighten into Arrowhead Formation
          const sway = Math.sin(t * 1.2 + idx * 0.4) * 0.25;
          x = BASE_ARROW[idx][0] * 0.92;
          y = BASE_ARROW[idx][1] + sway;
          z = BASE_ARROW[idx][2] * 0.92;
        } else if (st < 68.5) {
          // Part 3B: Jupiter Roll ("Pulling up 20 degrees... Ready, roll... NOW!")
          const p = Math.max(0, Math.min(1, (st - 59.0) / 9.5));
          const pose = computeWingmanPose('jupiterRoll', idx, p, st);
          x = pose.x;
          y = pose.y + Math.sin(p * Math.PI) * 2.2;
          z = pose.z;
          rx = -0.34 * Math.sin(p * Math.PI);
          rz = pose.rz;
        } else if (st < 84.0) {
          // Part 3C: Opposing Solo Pass — Jupiter 5 & 6 breaking off & CROSSING!
          if (idx === 3 || idx === 4) {
            const side = idx === 3 ? 1 : -1;
            const p = (st - 68.5) / 15.5;
            if (p < 0.45) {
              // Break off melebar ke posisi berhadapan
              const b = easeInOut(p / 0.45);
              x = THREE.MathUtils.lerp(BASE_ARROW[idx][0], side * 42, b);
              y = THREE.MathUtils.lerp(BASE_ARROW[idx][1], 1.5, b);
              z = THREE.MathUtils.lerp(BASE_ARROW[idx][2], side * 32, b);
              rz = side * 0.65 * Math.sin(b * Math.PI);
            } else {
              // Closing speed 400 knots -> CROSSING!
              const c = easeInOut((p - 0.45) / 0.55);
              x = THREE.MathUtils.lerp(side * 42, -side * 42, c);
              y = 1.5 + Math.sin(c * Math.PI) * 1.2;
              z = side * 2.2;
              ry = -side * (Math.PI / 2);
              rz = side * 0.28 * Math.sin(c * Math.PI);
            }
          }
        } else if (st < 106.5) {
          // Part 4A: Heart Maneuver (J5 & J6 lukis hati + J4 menusuk tengah hati!)
          const p = Math.max(0, Math.min(1, (st - 84.0) / 22.5));
          if (idx === 3 || idx === 4) {
            const side = idx === 3 ? 1 : -1;
            const carveP = easeInOut(Math.max(0, Math.min(1, (p - 0.22) / 0.68)));
            const a = carveP * Math.PI;
            x = side * (16 * Math.pow(Math.sin(a), 3)) * 1.12;
            y = (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * 0.7 + 5.2;
            z = -6.0;
            rz = -side * Math.cos(a) * 0.65;
            rx = -Math.sin(a) * 0.28;
          } else if (idx === 2 && st >= 101.0) {
            // Jupiter 4 (Arrow) melesat menusuk tengah Hati ("Four, piercing the heart! Smoke off!")
            const ap = easeInOut(Math.min(1, (st - 101.0) / 5.2));
            x = 0;
            y = THREE.MathUtils.lerp(-6.0, 14.5, ap);
            z = THREE.MathUtils.lerp(-32.0, 12.0, ap);
            rx = -0.58;
            shipSmoke = st < 104.2;
          }
        } else if (st < 122.0) {
          // Part 4B: Bomb Burst Finale ("Pitch up vertical... BREAK, BREAK, BREAK!")
          const p = Math.max(0, Math.min(1, (st - 106.5) / 15.5));
          const pose = computeWingmanPose('bombBurst', idx, p, st);
          x = pose.x;
          y = pose.y;
          z = pose.z;
          rx = pose.rx;
          ry = pose.ry;
          rz = pose.rz;
        } else if (st < 141.0) {
          // Part 5A: Left Echelon Rejoin (Smoke OFF, berkumpul rapi di sayap kiri Leader)
          const p = easeInOut(Math.min(1, (st - 122.0) / 6.0));
          x = THREE.MathUtils.lerp(BASE_ARROW[idx][0], LEFT_ECHELON[idx][0], p);
          y = THREE.MathUtils.lerp(BASE_ARROW[idx][1], LEFT_ECHELON[idx][1], p);
          z = THREE.MathUtils.lerp(BASE_ARROW[idx][2], LEFT_ECHELON[idx][2], p);
          shipSmoke = false;
        } else {
          // Part 5B: Final Approach -> Touchdown -> Full Stop!
          const p = easeInOut(Math.min(1, (st - 141.0) / 8.0));
          x = THREE.MathUtils.lerp(LEFT_ECHELON[idx][0], HOLDING_POS[idx][0], p);
          y = THREE.MathUtils.lerp(LEFT_ECHELON[idx][1], 0, p);
          z = THREE.MathUtils.lerp(LEFT_ECHELON[idx][2], HOLDING_POS[idx][2], p);
          rx = st < 147.0 ? 0.06 * (1 - p) : 0;
          shipSmoke = false;
        }

        if (wSmoke) wSmoke.visible = shipSmoke;
        grp.position.x = THREE.MathUtils.lerp(grp.position.x, x, posAlpha);
        grp.position.y = THREE.MathUtils.lerp(grp.position.y, y, posAlpha);
        grp.position.z = THREE.MathUtils.lerp(grp.position.z, z, posAlpha);
        grp.rotation.x = lerpAngle(grp.rotation.x, rx, rotAlpha);
        grp.rotation.y = lerpAngle(grp.rotation.y, ry, rotAlpha);
        if (st >= 59.0 && st < 68.5) {
          grp.rotation.z = THREE.MathUtils.lerp(grp.rotation.z, rz, Math.min(1, dt * 5.0));
        } else {
          grp.rotation.z = lerpAngle(grp.rotation.z, rz, rotAlpha);
        }
      });

      if (heartSmokeRef.current) {
        heartSmokeRef.current.visible = st >= 91.5 && st < 107.0;
        if (heartSmokeRef.current.visible) {
          heartSmokeRef.current.scale.setScalar(0.95 + Math.sin(t * 1.6) * 0.025);
        }
      }
      return;
    }

    // === MODE PILIHAN MANUVER INDIVIDUAL (jika pengguna memilih manuver spesifik di panel kanan) ===
    timer.current += dt;
    const elapsed = timer.current;
    const activeId = jupiterManeuver;
    const p = (elapsed % CYCLE_LEN) / CYCLE_LEN;

    const spec = getJupiterSpec(activeId);
    setFlightLabel(`JUPITER AEROBATIC SHOW (${spec.activeShips.length} PESAWAT) • ${spec.name.toUpperCase()}`);

    const leaderInScene = spec.activeShips.includes(1);
    if (leaderFxRef.current) leaderFxRef.current.visible = leaderInScene;
    if (leaderSmokeRef.current) leaderSmokeRef.current.visible = leaderInScene;

    const posAlpha = Math.min(1, dt * 3.1);
    const rotAlpha = Math.min(1, dt * 3.4);

    wingRefs.current.forEach((grp, idx) => {
      if (!grp) return;
      const shipNum = idx + 2;
      const shipActive = spec.activeShips.includes(shipNum);
      const wSmoke = wingSmokeRefs.current[idx];
      if (wSmoke) wSmoke.visible = shipActive;
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
      const pose = computeWingmanPose(activeId, idx, p, elapsed);
      grp.position.x = THREE.MathUtils.lerp(grp.position.x, pose.x, posAlpha);
      grp.position.y = THREE.MathUtils.lerp(grp.position.y, pose.y, posAlpha);
      grp.position.z = THREE.MathUtils.lerp(grp.position.z, pose.z, posAlpha);
      grp.rotation.x = lerpAngle(grp.rotation.x, pose.rx, rotAlpha);
      grp.rotation.y = lerpAngle(grp.rotation.y, pose.ry, rotAlpha);
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
        heartSmokeRef.current.scale.setScalar(0.94 + Math.sin(t * 1.5) * 0.025);
      }
    }
  });

  if (!isActive) return null;

  const showLeaderBadge = !currentSpec || currentSpec.activeShips.includes(1);

  return (
    <group name="jupiter-6ship-formation">
      {/* Jejak Asap Putih Aerobatik ramping untuk Jupiter 1 (Leader) */}
      <group ref={leaderFxRef}>
        <mesh ref={leaderSmokeRef} position={[0, 1.35, -13.5]} rotation={[Math.PI / 2, 0, 0]}>
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
            <mesh
              ref={(el) => {
                wingSmokeRefs.current[idx] = el;
              }}
              position={[0, 1.35, -13.5]}
              rotation={[Math.PI / 2, 0, 0]}
            >
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
