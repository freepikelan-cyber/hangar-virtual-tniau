import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useHangarStore } from '../../store/useHangarStore';

interface Props {
  sourceGroup: THREE.Group;
}

function easeInOut(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

/**
 * Kurva Hati Parametrik RAKSASA, Landai & Bebas Tabrakan untuk Jupiter 5 (s=+1) & Jupiter 6 (s=-1):
 * - Tinggi aman di atas langit (Y = 10..27m, tidak menukik tajam ke bawah!)
 * - Kedalaman Z dipisah 7 meter penuh (J5 di Z=-2, J6 di Z=-9) sehingga 100% bebas tabrakan baik di puncak maupun saat bersilangan di ujung bawah!
 */
function heartPoint(u: number, s: 1 | -1): THREE.Vector3 {
  const sinU = Math.sin(u);
  const hx = s * (4.2 + 23.0 * sinU * sinU * sinU);
  const hy = (13.0 * Math.cos(u) - 5.0 * Math.cos(2 * u) - 2.0 * Math.cos(3 * u) - Math.cos(4 * u)) * 0.62;
  const hz = s === 1 ? -2.0 : -9.0;
  return new THREE.Vector3(hx, 19.5 + hy, hz);
}

// Formasi Arrowhead 5 wingmen (J2–J6) berjarak LEGA (≥ 15 unit antar pesawat agar sayap 100% bebas bersentuhan!)
const ARROWHEAD_SLOTS: [number, number, number][] = [
  [15.0, 3.0, -14.0],   // Jupiter 2 (Kanan)
  [-15.0, 3.0, -14.0],  // Jupiter 3 (Kiri)
  [0.0, 2.8, -28.0],    // Jupiter 4 (Slot Tengah)
  [30.0, 3.0, -28.0],   // Jupiter 5 (Synchro Kanan)
  [-30.0, 3.0, -28.0],  // Jupiter 6 (Synchro Kiri)
];

// Formasi Arrowhead RAPAT (tetap ≥ 14 unit antar pesawat agar aman tanpa benturan!)
const TIGHT_ARROW_SLOTS: [number, number, number][] = [
  [14.0, 3.0, -13.0],
  [-14.0, 3.0, -13.0],
  [0.0, 2.8, -26.0],
  [28.0, 3.0, -26.0],
  [-28.0, 3.0, -26.0],
];

// Formasi Left Echelon (J2–J6 berjajar rapi di sayap kiri Jupiter 1 dengan jarak aman ≥ 13 unit!)
const LEFT_ECHELON_SLOTS: [number, number, number][] = [
  [-13.0, 3.0, -12.0],
  [-26.0, 2.9, -24.0],
  [-39.0, 2.8, -36.0],
  [-52.0, 2.7, -48.0],
  [-65.0, 2.6, -60.0],
];

// Posisi menjauh jauh keluar arena saat hanya 1 atau 2 pesawat yang tampil (bebas tabrakan & menghilang mulus!)
const STANDBY_FAR_SLOTS: [number, number, number][] = [
  [52.0, 22.0, -92.0],
  [-52.0, 22.0, -92.0],
  [0.0, 26.0, -102.0],
  [68.0, 20.0, -96.0],
  [-68.0, 20.0, -96.0],
];

// Formasi 6-Ship SIAP TAKE OFF berjarak LEGA & MAJU jauh dari tepi laut di Runway 09 3-jalur (WORLD SPACE)!
// (J1 paling depan di [0, +16]; J4 di [0, -4] berjarak 20m penuh di belakang J1; semua bebas numpuk!)
const RUNWAY_FORM_SPOTS: [number, number][] = [
  [14.0, 6.0],   // Jupiter 2 (Jalur kanan, 14m kanan & 10m belakang J1)
  [-14.0, 6.0],  // Jupiter 3 (Jalur kiri, 14m kiri & 10m belakang J1)
  [0.0, -4.0],   // Jupiter 4 (Jalur tengah, 20m penuh di belakang J1!)
  [14.0, -14.0], // Jupiter 5 (Jalur kanan, 20m belakang J2)
  [-14.0, -14.0],// Jupiter 6 (Jalur kiri, 20m belakang J3)
];

const HEART_SEGMENTS = 64;

/**
 * Menampilkan 5 pesawat pendamping Jupiter Aerobatic Team (Jupiter 2 s/d Jupiter 6) + asap putih tebal + jejak Hati 3D:
 * 1. Take Off: muncul satu per satu dari hanggar dengan jeda rapi (0% tabrakan!) -> berbaris maju & lega di Runway 09 -> Take Off SAMA-SAMA!
 * 2. Airborne: jeda 10 dtk -> Tighten Arrowhead & Jupiter Roll -> HANYA J5 & J6 Opposing Pass -> HANYA J5 & J6 melukis Hati parametrik halus + J4 menembus Hati -> Bomb Burst -> Left Echelon Rejoin!
 * 3. Landing: turun formasi berjarak lega -> gears down (3.2s) -> flare -> touchdown (8.6s) -> rollout & taxi hanggar!
 */
export function JupiterTakeOffLayer({ sourceGroup }: Props) {
  const selectedId = useHangarStore((s) => s.selectedId);
  const flightMode = useHangarStore((s) => s.flightMode);
  const flightNonce = useHangarStore((s) => s.flightNonce);

  const isActive =
    selectedId === 'kt1b' && (flightMode === 'takeoff' || flightMode === 'airborne' || flightMode === 'landing');

  const phaseTime = useRef(0);
  const wingRefs = useRef<(THREE.Group | null)[]>([]);
  const smokeRefs = useRef<(THREE.Mesh | null)[]>([]);
  const labelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const leaderSmokeRef = useRef<THREE.Mesh>(null);
  const gearStates = useRef<number[]>([0, 0, 0, 0, 0]);
  const heartRightRef = useRef<THREE.Points>(null);
  const heartLeftRef = useRef<THREE.Points>(null);
  const arrowTrailRef = useRef<THREE.Points>(null);

  const tmpPos = useMemo(() => new THREE.Vector3(), []);
  const tmpNext = useMemo(() => new THREE.Vector3(), []);
  const tmpQuat = useMemo(() => new THREE.Quaternion(), []);
  const tmpMat = useMemo(() => new THREE.Matrix4(), []);
  const tmpUp = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  useEffect(() => {
    phaseTime.current = 0;
    if (flightMode === 'takeoff') {
      gearStates.current = [0, 0, 0, 0, 0];
    } else if (flightMode === 'airborne') {
      gearStates.current = [1, 1, 1, 1, 1];
    }
  }, [flightMode, flightNonce, isActive]);

  const whiteSmokeMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#f8fafc',
        transparent: true,
        opacity: 0.48,
        depthWrite: false,
      }),
    [],
  );

  const redSmokeMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#ef4444',
        transparent: true,
        opacity: 0.46,
        depthWrite: false,
      }),
    [],
  );

  const smokeGeo = useMemo(() => {
    const geo = new THREE.CylinderGeometry(0.14, 0.95, 22, 10, 1, true);
    geo.rotateX(Math.PI / 2);
    geo.translate(0, 0, -13.5);
    return geo;
  }, []);

  // Jejak asap putih tebal berbentuk HATI raksasa di langit (dilukis real-time oleh J5 & J6!)
  const heartGeos = useMemo(() => {
    const makeHalf = (s: 1 | -1) => {
      const pos = new Float32Array((HEART_SEGMENTS + 1) * 3);
      for (let k = 0; k <= HEART_SEGMENTS; k++) {
        const pt = heartPoint((k / HEART_SEGMENTS) * Math.PI, s);
        pos[k * 3] = pt.x;
        pos[k * 3 + 1] = pt.y;
        pos[k * 3 + 2] = pt.z;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setDrawRange(0, 0);
      return g;
    };
    const arrowPos = new Float32Array(42 * 3);
    for (let k = 0; k < 42; k++) {
      const f = k / 41;
      arrowPos[k * 3] = THREE.MathUtils.lerp(-28.0, 28.0, f);
      arrowPos[k * 3 + 1] = THREE.MathUtils.lerp(4.0, 28.0, f);
      arrowPos[k * 3 + 2] = -4.0;
    }
    const arrowGeo = new THREE.BufferGeometry();
    arrowGeo.setAttribute('position', new THREE.BufferAttribute(arrowPos, 3));
    arrowGeo.setDrawRange(0, 0);
    return { right: makeHalf(1), left: makeHalf(-1), arrow: arrowGeo };
  }, []);

  const heartSmokeMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: '#ffffff',
        size: 1.85,
        transparent: true,
        opacity: 0.82,
        depthWrite: false,
      }),
    [],
  );

  useEffect(() => {
    return () => {
      whiteSmokeMat.dispose();
      redSmokeMat.dispose();
      smokeGeo.dispose();
      heartGeos.right.dispose();
      heartGeos.left.dispose();
      heartGeos.arrow.dispose();
      heartSmokeMat.dispose();
    };
  }, [whiteSmokeMat, redSmokeMat, smokeGeo, heartGeos, heartSmokeMat]);

  const wingClones = useMemo(() => {
    if (selectedId !== 'kt1b') return [];
    const list: THREE.Group[] = [];
    for (let i = 0; i < 5; i++) {
      const clone = sourceGroup.clone(true);
      clone.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      list.push(clone);
    }
    return list;
  }, [sourceGroup, selectedId]);

  useFrame((state, delta) => {
    if (!isActive || wingClones.length === 0) return;
    const dt = Math.min(delta, 0.05);
    phaseTime.current += dt;
    const pt = phaseTime.current;
    const t = state.clock.getElapsedTime();

    // Update lukisan asap putih HATI RAKSASA di langit saat Atraksi 5: Heart (Love) & Roll (78.5..98.5s)
    const showHeartTrail = flightMode === 'airborne' && pt >= 78.5 && pt < 99.0;
    if (heartRightRef.current && heartLeftRef.current) {
      heartRightRef.current.visible = showHeartTrail;
      heartLeftRef.current.visible = showHeartTrail;
      if (showHeartTrail) {
        const drawP = Math.min(1, (pt - 78.5) / 11.0);
        const count = Math.floor(drawP * (HEART_SEGMENTS + 1));
        heartGeos.right.setDrawRange(0, count);
        heartGeos.left.setDrawRange(0, count);
        const fade = pt > 96.5 ? Math.max(0, 1 - (pt - 96.5) / 2.5) : 1;
        heartSmokeMat.opacity = 0.86 * fade;
      }
    }
    if (arrowTrailRef.current) {
      const showArrow = flightMode === 'airborne' && pt >= 89.5 && pt < 99.0;
      arrowTrailRef.current.visible = showArrow;
      if (showArrow) {
        const drawP = Math.min(1, (pt - 89.5) / 6.5);
        heartGeos.arrow.setDrawRange(0, Math.floor(drawP * 42));
      }
    }

    // Asap Merah untuk Jupiter 1 (Lead)
    if (leaderSmokeRef.current) {
      const inHeartHide = flightMode === 'airborne' && pt >= 75.0 && pt < 89.5;
      const leaderSmokeOn =
        (flightMode === 'airborne' && !inHeartHide && pt < 141.0) || (flightMode === 'takeoff' && pt >= 42.3);
      leaderSmokeRef.current.visible = leaderSmokeOn;
      if (leaderSmokeOn) {
        let lx = Math.sin(t * 0.45) * 0.22;
        let ly = 3.0 + Math.sin(t * 1.4) * 0.1;
        let lz = 0;
        if (flightMode === 'airborne' && pt >= 20.5 && pt < 30.0) {
          const lp = easeInOut((pt - 20.5) / 9.5);
          const a = lp * Math.PI * 2;
          ly = 3.0 + (1 - Math.cos(a)) * 9.5;
          lz = Math.sin(a) * 9.5;
        } else if (flightMode === 'airborne' && pt >= 42.0 && pt < 50.0) {
          ly = 12.0;
        } else if (flightMode === 'airborne' && pt >= 60.0 && pt < 68.0) {
          lx = 0;
          ly = 3.0;
        } else if (flightMode === 'airborne' && pt >= 89.5 && pt < 97.5) {
          const p = easeInOut((pt - 89.5) / 8.0);
          lx = THREE.MathUtils.lerp(-28.0, 28.0, p);
          ly = THREE.MathUtils.lerp(4.0, 28.0, p);
          lz = -4.0;
        } else if (flightMode === 'airborne' && pt >= 108.0 && pt < 118.0) {
          const sp = (pt - 108.0) / 10.0;
          lx = 0;
          ly = sp < 0.32 ? 3.0 + (sp / 0.32) * 14.0 : sp < 0.78 ? 17.0 - ((sp - 0.32) / 0.46) * 13.0 : 4.0;
        } else if (flightMode === 'airborne' && pt >= 125.0 && pt < 137.0) {
          const bp = Math.min(1, (pt - 125.0) / 12.0);
          ly = 3.0 + Math.sin(bp * Math.PI) * 10.0;
        }
        leaderSmokeRef.current.position.set(lx, ly, lz);
        const pulse = 1 + Math.sin(t * 14) * 0.06;
        leaderSmokeRef.current.scale.set(pulse, pulse, 1);
      }
    }

    for (let i = 0; i < 5; i++) {
      const grp = wingRefs.current[i];
      if (!grp) continue;

      const clone = wingClones[i];
      // Putar baling-baling & tampilkan efek blur piringan baling-baling untuk SEMUA 5 pesawat pendamping (J2–J6)!
      const propSpeed = flightMode === 'landing' && pt >= 18.8 ? 8.0 : 38.0;
      const blurOpacity = flightMode === 'landing' && pt >= 18.8 ? 0.08 : 0.28;
      clone.traverse((child) => {
        if (
          child.name === 'kt1b-prop-pivot' ||
          child.name.includes('prop') ||
          child.name.includes('blade') ||
          child.name.includes('spinner')
        ) {
          if (child.name !== 'kt1b-prop-blur') {
            child.rotation.z += dt * propSpeed;
          }
        }
        if (child.name === 'kt1b-prop-blur' && (child as THREE.Mesh).isMesh) {
          const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial | undefined;
          if (mat && 'opacity' in mat) {
            mat.opacity = blurOpacity;
          }
        }
      });

      let tx = 0;
      let ty = 0;
      let tz = 0;
      let tp = 0;
      let tr = 0;
      let tyaw = 0;
      let targetGear = 0;
      let smokeOn = false;
      let visible = true;
      let useTangentQuat = false;

      if (flightMode === 'takeoff') {
        // KELUAR HANGGAR JAUH (X = -82) SATU PER SATU DENGAN JEDA TEPAT 5 DETIK (0% NUMPUK / TABRAKAN!):
        // J1: 0s -> J2: 5s -> J3: 10s -> J4: 15s -> J5: 20s -> J6: 25s (semua sudah parkir rapi sebelum 33s!)
        const taxiStart = 5.0 + i * 5.0;
        const eastDur = 5.2;
        const turnDur = 1.2;
        const northDur = 1.6;
        const eastEnd = taxiStart + eastDur;
        const turnEnd = eastEnd + turnDur;
        const parkEnd = turnEnd + northDur;

        const formSpot = RUNWAY_FORM_SPOTS[i];
        const hangarX = -82.0;
        const taxiZ = -10.5;

        // Semua 6 pesawat Take Off SAMA-SAMA secara mulus & rapi!
        const rollStart = 37.0;
        const rotStart = 40.7;
        const climbStart = 42.3;
        const airborneEnd = 47.0;

        const airSlot = ARROWHEAD_SLOTS[i];

        if (pt < taxiStart) {
          // Masih di dalam hanggar menunggu giliran (tersembunyi agar tidak pernah menumpuk/tabrakan!)
          visible = false;
          tx = hangarX;
          ty = 0;
          tz = taxiZ;
          tyaw = Math.PI / 2;
          targetGear = 0;
        } else if (pt < eastEnd) {
          // Segmen 1: Keluar lurus ke Timur (+X) dari hanggar menuju jalur masing-masing (X = formSpot[0])
          const p = easeInOut((pt - taxiStart) / eastDur);
          tx = THREE.MathUtils.lerp(hangarX, formSpot[0], p);
          tz = taxiZ;
          ty = 0;
          tyaw = Math.PI / 2;
          targetGear = 0;
        } else if (pt < turnEnd) {
          // Segmen 2: Belok mulus ke Utara (+Z) tepat di jalur masing-masing
          const p = easeInOut((pt - eastEnd) / turnDur);
          tx = formSpot[0];
          tz = THREE.MathUtils.lerp(taxiZ, Math.min(formSpot[1], taxiZ + 1.5), p);
          ty = 0;
          tyaw = THREE.MathUtils.lerp(Math.PI / 2, 0, p);
          targetGear = 0;
        } else if (pt < parkEnd) {
          // Segmen 3: Maju lurus ke posisi start Take Off masing-masing (jauh dari tepi laut!)
          const p = easeInOut((pt - turnEnd) / northDur);
          tx = formSpot[0];
          tz = THREE.MathUtils.lerp(Math.min(formSpot[1], taxiZ + 1.5), formSpot[1], p);
          ty = 0;
          tyaw = 0;
          targetGear = 0;
        } else if (pt < rollStart) {
          // Berhenti mantap di formasi Take Off sambil "Jupiters, check in!"
          tx = formSpot[0];
          tz = formSpot[1];
          ty = 0;
          tyaw = 0;
          targetGear = 0;
        } else if (pt < rotStart) {
          // Brakes release, power up! Rolling bersama rapi!
          const p = (pt - rollStart) / (rotStart - rollStart);
          tx = formSpot[0];
          tz = formSpot[1] + 8.5 * p * p;
          ty = 0;
          tp = -0.02 * p;
          tyaw = 0;
          targetGear = 0;
        } else if (pt < climbStart) {
          // Rotate bersama!
          const p = easeInOut((pt - rotStart) / (climbStart - rotStart));
          tx = formSpot[0];
          tz = formSpot[1] + 8.5 + 1.8 * p;
          ty = THREE.MathUtils.lerp(0, 1.85, p * p);
          tp = -0.25 * Math.sin(Math.min(1, p * 1.2) * (Math.PI / 2));
          targetGear = 0;
        } else {
          // Gears up, smoke on! Menanjak mulus bersama membentuk formasi Arrowhead!
          const p = easeInOut(Math.min(1, (pt - climbStart) / (airborneEnd - climbStart)));
          tx = THREE.MathUtils.lerp(formSpot[0], airSlot[0], p);
          tz = THREE.MathUtils.lerp(formSpot[1] + 10.3, airSlot[2], p);
          ty = THREE.MathUtils.lerp(1.85, airSlot[1], p);
          tp = THREE.MathUtils.lerp(-0.24, -0.03, p);
          targetGear = 1;
          smokeOn = true;
        }
      } else if (flightMode === 'landing') {
        // MODE LANDING JAT (3-Jalur Runway Lega):
        // Jarak antar pesawat sangat lega (±16m kiri-kanan & 22m depan-belakang -> 0% menempel!),
        // setelah pengereman langsung BERHENTI RAPI DI RUNWAY (tidak masuk hanggar)!
        smokeOn = false;
        const LAND_SLOTS: [number, number][] = [
          [16.0, -12.0],  // Jupiter 2 (Kanan depan, 16m kanan & 12m belakang J1)
          [-16.0, -12.0], // Jupiter 3 (Kiri depan, 16m kiri & 12m belakang J1)
          [0.0, -22.0],   // Jupiter 4 (Tengah belakang, 22m penuh di belakang J1!)
          [16.0, -34.0],  // Jupiter 5 (Kanan belakang, 22m penuh di belakang J2!)
          [-16.0, -34.0], // Jupiter 6 (Kiri belakang, 22m penuh di belakang J3!)
        ];
        const [landX, landZOff] = LAND_SLOTS[i];

        if (pt < 6.6) {
          // Fase 1: Final Approach turun halus berjarak lega (roda turun di 3.2s)
          const p = pt / 6.6;
          tx = landX;
          ty = THREE.MathUtils.lerp(8.2, 1.75, p);
          tz = THREE.MathUtils.lerp(-12.0, 4.0, p) + landZOff;
          tp = 0.06;
          targetGear = pt < 3.2 ? 1 : 0;
        } else if (pt < 8.6) {
          // Fase 2: Flare halus sebelum Touchdown (8.6s)
          const p = easeInOut((pt - 6.6) / 2.0);
          tx = landX;
          ty = THREE.MathUtils.lerp(1.75, 0.05, p);
          tz = THREE.MathUtils.lerp(4.0, 8.0, p) + landZOff;
          tp = THREE.MathUtils.lerp(0.06, -0.16, p);
          targetGear = 0;
        } else if (pt < 13.0) {
          // Fase 3: Touchdown & Rollout lurus rapi di jalur masing-masing
          const p = (pt - 8.6) / 4.4;
          tx = landX;
          ty = p < 0.14 ? Math.sin((p / 0.14) * Math.PI) * 0.04 : 0;
          tz = THREE.MathUtils.lerp(8.0, 14.0, easeInOut(p)) + landZOff;
          tp = THREE.MathUtils.lerp(-0.16, 0, Math.min(1, p * 1.65));
          targetGear = 0;
        } else if (pt < 18.8) {
          // Fase 4: Pengereman halus sampai berhenti penuh di Runway
          const p = Math.min(1, (pt - 13.0) / 5.8);
          tx = landX;
          ty = 0;
          tz = THREE.MathUtils.lerp(14.0, 16.0, easeInOut(p)) + landZOff;
          tp = 0;
          targetGear = 0;
        } else {
          // Berhenti mantap & lega di Runway 09 (tidak perlu taxi masuk hanggar!)
          tx = landX;
          ty = 0;
          tz = 16.0 + landZOff;
          tp = 0;
          tyaw = 0;
          targetGear = 0;
        }
      } else {
        // MODE AIRBORNE — 7 ATRAKSI JAT DENGAN JEDA 3 DETIK, REJOIN PERLAHAN, & 100% BEBAS TABRAKAN:
        targetGear = 1;
        smokeOn = true;

        const baseSlot = ARROWHEAD_SLOTS[i];
        const tightSlot = TIGHT_ARROW_SLOTS[i];
        const farSlot = STANDBY_FAR_SLOTS[i];

        if (pt < 5.0) {
          // 0..5s: Pembukaan formasi Arrowhead
          tx = baseSlot[0] + Math.sin(t * 0.8 + i) * 0.14;
          ty = baseSlot[1] + Math.cos(t * 1.1 + i) * 0.1;
          tz = baseSlot[2] + Math.sin(t * 0.6 + i) * 0.12;
          tp = -0.025;
          tr = Math.cos(t * 0.9 + i * 0.5) * 0.028;
        } else if (pt < 14.0) {
          // 5..14s — ATRAKSI 1: CROSS OVER BREAK
          // J1–J4 lurus di Y=3.0; J5 menyeberang di Y=9.5 (di atas formasi), J6 menyeberang di Y=14.5 (5m di atas J5 -> 0% tabrakan!)
          const p = (pt - 5.0) / 9.0;
          if (i === 3 || i === 4) {
            const dir = i === 3 ? 1 : -1;
            const cross = Math.sin(p * Math.PI);
            tx = THREE.MathUtils.lerp(baseSlot[0], -dir * 34.0, easeInOut(p));
            ty = THREE.MathUtils.lerp(baseSlot[1], i === 3 ? 9.5 : 14.5, cross);
            tz = baseSlot[2] + (i === 3 ? 6.0 : -6.0) * cross;
            tyaw = -dir * 0.55 * cross;
            tr = dir * 0.88 * cross;
          } else {
            tx = baseSlot[0];
            ty = baseSlot[1];
            tz = baseSlot[2];
            tp = -0.02;
          }
        } else if (pt < 17.5) {
          // 14..17.5s: Kembali ke formasi perlahan (3.5 detik)
          const p = easeInOut((pt - 14.0) / 3.5);
          if (i === 3 || i === 4) {
            const dir = i === 3 ? 1 : -1;
            tx = THREE.MathUtils.lerp(-dir * 34.0, tightSlot[0], p);
            ty = THREE.MathUtils.lerp(i === 3 ? 6.0 : 9.0, tightSlot[1], p);
            tz = THREE.MathUtils.lerp(baseSlot[2], tightSlot[2], p);
          } else {
            tx = THREE.MathUtils.lerp(baseSlot[0], tightSlot[0], p);
            ty = THREE.MathUtils.lerp(baseSlot[1], tightSlot[1], p);
            tz = THREE.MathUtils.lerp(baseSlot[2], tightSlot[2], p);
          }
          tp = -0.025;
        } else if (pt < 20.5) {
          // 17.5..20.5s: JEDA 3 DETIK stabil di formasi Arrowhead
          tx = tightSlot[0];
          ty = tightSlot[1];
          tz = tightSlot[2];
          tp = -0.025;
        } else if (pt < 30.0) {
          // 20.5..30.0s — ATRAKSI 2: ARROW HEAD FORMATION & LOOP (9.5s lingkaran vertikal 360° halus)
          const p = easeInOut((pt - 20.5) / 9.5);
          const a = p * Math.PI * 2;
          const R = 9.5;
          tx = tightSlot[0];
          ty = tightSlot[1] + (1 - Math.cos(a)) * R;
          tz = tightSlot[2] + Math.sin(a) * R;
          tp = -a;
        } else if (pt < 33.0) {
          // 30.0..33.0s: JEDA 3 DETIK stabil
          tx = tightSlot[0];
          ty = tightSlot[1];
          tz = tightSlot[2];
          tp = -0.025;
        } else if (pt < 39.0) {
          // 33.0..39.0s — ATRAKSI 3A: JUPITER ROLL (6 pesawat bergulung serempak 360° pada sumbu masing-masing -> 0% tabrakan!)
          const p = easeInOut((pt - 33.0) / 6.0);
          const arch = Math.sin(p * Math.PI);
          tx = tightSlot[0];
          ty = tightSlot[1] + 2.8 * arch;
          tz = tightSlot[2];
          tp = -0.14 * arch;
          tr = -p * Math.PI * 2;
        } else if (pt < 42.0) {
          // 39.0..42.0s: JEDA 3 DETIK & naik halus ke Y=12 agar ruang Screw Roll di bawah formasi sangat lega!
          const p = easeInOut((pt - 39.0) / 3.0);
          tx = THREE.MathUtils.lerp(tightSlot[0], i === 3 ? 0.0 : i === 4 ? 26.0 : tightSlot[0] * 0.85, p);
          ty = THREE.MathUtils.lerp(tightSlot[1], 12.0, p);
          tz = THREE.MathUtils.lerp(tightSlot[2], i === 3 ? -36.0 : i === 4 ? -14.0 : tightSlot[2], p);
          tp = -0.025;
        } else if (pt < 50.0) {
          // 42.0..50.0s — ATRAKSI 3B: SCREW ROLL
          // 5 pesawat inti (J1–J5) terbang lurus di Y=12 (|X|<=12); J6 melingkari elips LEBAR (Rx=26, Ry=9.5 -> jarak aman >=9.5m di semua sudut!)
          const p = (pt - 42.0) / 8.0;
          if (i === 4) {
            const a = p * Math.PI * 4;
            tx = Math.cos(a) * 26.0;
            ty = 12.0 + Math.sin(a) * 9.5; // Min Y = 2.5m (9.5m di bawah inti), Max Y = 21.5m (9.5m di atas inti), Samping ±26m (14m di luar sayap!)
            tz = -14.0;
            tr = -a;
            tp = -0.06 * Math.cos(a);
          } else {
            tx = i === 3 ? 0.0 : tightSlot[0] * 0.85;
            ty = 12.0;
            tz = i === 3 ? -36.0 : tightSlot[2];
            tp = -0.025;
          }
        } else if (pt < 53.5) {
          // 50.0..53.5s: Kembali turun perlahan ke formasi Arrowhead (3.5s)
          const p = easeInOut((pt - 50.0) / 3.5);
          tx = THREE.MathUtils.lerp(i === 4 ? 26.0 : i === 3 ? 0.0 : tightSlot[0] * 0.85, tightSlot[0], p);
          ty = THREE.MathUtils.lerp(12.0, tightSlot[1], p);
          tz = THREE.MathUtils.lerp(i === 4 ? -14.0 : i === 3 ? -36.0 : tightSlot[2], tightSlot[2], p);
          tp = -0.025;
        } else if (pt < 56.5) {
          // 53.5..56.5s: JEDA 3 DETIK sebelum Mirror
          tx = tightSlot[0];
          ty = tightSlot[1];
          tz = tightSlot[2];
          tp = -0.025;
        } else if (pt < 60.0) {
          // 56.5..60.0s: Persiapan perlahan MIRROR — 4 pesawat (J1–J4) tetap mengudara di bawah (Y=3.0),
          // sedangkan 2 pesawat Synchro (J5 tegak & J6 terbalik) naik perlahan ke posisi cermin di ATAS 4 pesawat tersebut!
          const p = easeInOut((pt - 56.5) / 3.5);
          if (i === 3) {
            // J5 (Tegak / Normal) naik ke Y=11.5, X=-2.2 di atas formasi 4 pesawat
            tx = THREE.MathUtils.lerp(tightSlot[0], -2.2, p);
            ty = THREE.MathUtils.lerp(tightSlot[1], 11.5, p);
            tz = THREE.MathUtils.lerp(tightSlot[2], -9.0, p);
            tr = 0;
          } else if (i === 4) {
            // J6 (Terbalik / Inverted) naik ke Y=17.5, X=+2.2 tepat di atas J5 (jarak 6m + offset lateral -> terlihat 2 pesawat super jelas!)
            tx = THREE.MathUtils.lerp(tightSlot[0], 2.2, p);
            ty = THREE.MathUtils.lerp(tightSlot[1], 17.5, p);
            tz = THREE.MathUtils.lerp(tightSlot[2], -9.0, p);
            tr = Math.PI * p;
          } else {
            // J2, J3, J4 bersama J1 (4 pesawat) terbang stabil dalam formasi Diamond di bawah (Y=3.0)!
            tx = tightSlot[0];
            ty = tightSlot[1];
            tz = tightSlot[2];
            tp = -0.02;
          }
        } else if (pt < 68.0) {
          // 60.0..68.0s — ATRAKSI 4: MIRROR DI ATAS 4 PESAWAT!
          // J1–J4 mengudara stabil di bawah (Y=3.0); J5 (normal, Y=11.5) & J6 (terbalik/inverted, Y=17.5) terbang cermin di atasnya!
          if (i === 3) {
            tx = -2.2;
            ty = 11.5 + Math.sin(t * 1.1) * 0.08;
            tz = -9.0;
            tp = -0.02;
            tr = 0;
          } else if (i === 4) {
            tx = 2.2;
            ty = 17.5 + Math.sin(t * 1.1) * 0.08;
            tz = -9.0;
            tp = 0.02;
            tr = Math.PI;
          } else {
            tx = tightSlot[0];
            ty = tightSlot[1];
            tz = tightSlot[2];
            tp = -0.02;
            tr = 0;
          }
        } else if (pt < 72.0) {
          // 68.0..72.0s: Kembali berkumpul ke formasi Arrowhead perlahan (4.0 detik)
          const p = easeInOut((pt - 68.0) / 4.0);
          if (i === 3) {
            tx = THREE.MathUtils.lerp(-2.2, tightSlot[0], p);
            ty = THREE.MathUtils.lerp(11.5, tightSlot[1], p);
            tz = THREE.MathUtils.lerp(-9.0, tightSlot[2], p);
            tr = 0;
          } else if (i === 4) {
            tx = THREE.MathUtils.lerp(2.2, tightSlot[0], p);
            ty = THREE.MathUtils.lerp(17.5, tightSlot[1], p);
            tz = THREE.MathUtils.lerp(-9.0, tightSlot[2], p);
            tr = Math.PI * (1 - p);
          } else {
            tx = tightSlot[0];
            ty = tightSlot[1];
            tz = tightSlot[2];
          }
        } else if (pt < 75.0) {
          // 72.0..75.0s: JEDA 3 DETIK sebelum Heart (Love) & Roll
          tx = tightSlot[0];
          ty = tightSlot[1];
          tz = tightSlot[2];
          tp = -0.025;
        } else if (pt < 78.5) {
          // 75.0..78.5s: Break-off perlahan — J5 & J6 menuju puncak Hati Raksasa, J2–J4 menjauh bersiap menusuk tengah hati
          const p = easeInOut((pt - 75.0) / 3.5);
          if (i === 3 || i === 4) {
            const startPt = heartPoint(0, i === 3 ? 1 : -1);
            tx = THREE.MathUtils.lerp(tightSlot[0], startPt.x, p);
            ty = THREE.MathUtils.lerp(tightSlot[1], startPt.y, p);
            tz = THREE.MathUtils.lerp(tightSlot[2], startPt.z, p);
            tp = -0.35 * Math.sin(p * Math.PI);
          } else {
            tx = THREE.MathUtils.lerp(tightSlot[0], farSlot[0], p);
            ty = THREE.MathUtils.lerp(tightSlot[1], farSlot[1], p);
            tz = THREE.MathUtils.lerp(tightSlot[2], farSlot[2], p);
            smokeOn = p < 0.5;
          }
        } else if (pt < 89.5) {
          // 78.5..89.5s — ATRAKSI 5A: HEART (LOVE) — J5 & J6 melukis Hati RAKSASA (tinggi & landai, Z terpisah 7m -> 0% tabrakan!)
          // Di ujung bawah (85%..100%), masing-masing pesawat TIDAK menukik tajam, melainkan mendatar & bersilangan (J5 ke kiri, J6 ke kanan)!
          if (i === 3 || i === 4) {
            const s: 1 | -1 = i === 3 ? 1 : -1;
            const rawP = (pt - 78.5) / 11.0;
            if (rawP < 0.84) {
              const p = easeInOut(rawP / 0.84);
              const u = p * Math.PI * 0.94;
              const uNext = Math.min(Math.PI, u + 0.03);
              tmpPos.copy(heartPoint(u, s));
              tmpNext.copy(heartPoint(uNext, s));
              tx = tmpPos.x;
              ty = tmpPos.y;
              tz = tmpPos.z;
              if (tmpNext.distanceToSquared(tmpPos) > 1e-6) {
                tmpMat.lookAt(tmpNext, tmpPos, tmpUp);
                tmpQuat.setFromRotationMatrix(tmpMat);
                useTangentQuat = true;
              }
            } else {
              // Ujung bawah Hati: tarik mendatar halus & saling CROSS (J5 meluncur ke KIRI -28m, J6 meluncur ke KANAN +28m pada Z berbeda!)
              const cp = easeInOut((rawP - 0.84) / 0.16);
              const tip = heartPoint(Math.PI * 0.94, s);
              tx = THREE.MathUtils.lerp(tip.x, -s * 28.0, cp);
              ty = THREE.MathUtils.lerp(tip.y, 11.5, cp);
              tz = tip.z;
              tyaw = -s * Math.PI * 0.5;
              tp = 0;
              tr = s * 0.25 * Math.sin(cp * Math.PI);
            }
            smokeOn = true;
          } else {
            visible = false;
            tx = farSlot[0];
            ty = farSlot[1];
            tz = farSlot[2];
            smokeOn = false;
          }
        } else if (pt < 97.5) {
          // 89.5..97.5s — ATRAKSI 5B: 4 PESAWAT (J1–J4) BERJARAK LEGA MENUSUK TENGAH HATI SAMBIL ROLL!
          if (i === 3 || i === 4) {
            // J5 (sudah di kiri -28) & J6 (sudah di kanan +28) meluncur menjauh perlahan keluar arena
            const s: 1 | -1 = i === 3 ? 1 : -1;
            const p = easeInOut((pt - 89.5) / 5.0);
            tx = THREE.MathUtils.lerp(-s * 28.0, farSlot[0], p);
            ty = THREE.MathUtils.lerp(11.5, farSlot[1], p);
            tz = THREE.MathUtils.lerp(s === 1 ? -2.0 : -9.0, farSlot[2], p);
            smokeOn = false;
          } else {
            const p = easeInOut((pt - 89.5) / 8.0);
            // Jarak antar 4 pesawat sangat lega (≥ 14 unit, tidak menempel!)
            const offsets: [number, number, number][] = [
              [12.0, -4.0, -14.0],  // J2
              [-12.0, -4.0, -14.0], // J3
              [0.0, -8.0, -28.0],   // J4
            ];
            const off = offsets[i];
            tx = THREE.MathUtils.lerp(-28.0, 28.0, p) + off[0];
            ty = THREE.MathUtils.lerp(8.0, 28.0, p) + off[1];
            tz = -5.5 + off[2];
            tp = -0.32;
            tyaw = Math.PI * 0.32;
            tr = -p * Math.PI * 4;
            smokeOn = true;
          }
        } else if (pt < 101.5) {
          // 97.5..101.5s: Kembali berkumpul ke formasi perlahan (4.0 detik) dari posisi AKHIR masing-masing (0% lompat/snapping!)
          const p = easeInOut((pt - 97.5) / 4.0);
          const heartEndOffsets: [number, number, number][] = [
            [40.0, 24.0, -19.5],  // posisi akhir J2
            [16.0, 24.0, -19.5],  // posisi akhir J3
            [28.0, 20.0, -33.5],  // posisi akhir J4
          ];
          const fromPos = i <= 2 ? heartEndOffsets[i] : farSlot;
          tx = THREE.MathUtils.lerp(fromPos[0], tightSlot[0], p);
          ty = THREE.MathUtils.lerp(fromPos[1], tightSlot[1], p);
          tz = THREE.MathUtils.lerp(fromPos[2], tightSlot[2], p);
          tp = -0.025;
          tyaw = THREE.MathUtils.lerp(i <= 2 ? Math.PI * 0.32 : 0, 0, p);
        } else if (pt < 104.5) {
          // 101.5..104.5s: JEDA 3 DETIK sebelum Solo Spin
          tx = tightSlot[0];
          ty = tightSlot[1];
          tz = tightSlot[2];
          tp = -0.025;
        } else if (pt < 108.0) {
          // 104.5..108.0s: Break-off perlahan — J2–J6 menjauh jauh keluar arena agar J1 tampil tunggal!
          const p = easeInOut((pt - 104.5) / 3.5);
          tx = THREE.MathUtils.lerp(tightSlot[0], farSlot[0], p);
          ty = THREE.MathUtils.lerp(tightSlot[1], farSlot[1], p);
          tz = THREE.MathUtils.lerp(tightSlot[2], farSlot[2], p);
          smokeOn = p < 0.5;
        } else if (pt < 118.0) {
          // 108.0..118.0s — ATRAKSI 6: SOLO SPIN (Hanya J1 tampil; J2–J6 jauh keluar arena!)
          visible = false;
          tx = farSlot[0];
          ty = farSlot[1];
          tz = farSlot[2];
          smokeOn = false;
        } else if (pt < 122.0) {
          // 118.0..122.0s: Kembali berkumpul ke formasi perlahan (4.0 detik)
          const p = easeInOut((pt - 118.0) / 4.0);
          tx = THREE.MathUtils.lerp(farSlot[0], tightSlot[0], p);
          ty = THREE.MathUtils.lerp(farSlot[1], tightSlot[1], p);
          tz = THREE.MathUtils.lerp(farSlot[2], tightSlot[2], p);
          smokeOn = p > 0.4;
        } else if (pt < 125.0) {
          // 122.0..125.0s: JEDA 3 DETIK sebelum Loop & Bomb Burst
          tx = tightSlot[0];
          ty = tightSlot[1];
          tz = tightSlot[2];
          tp = -0.025;
        } else if (pt < 129.5) {
          // 125.0..129.5s — ATRAKSI 7A: LOOP & BOMB BURST (6 pesawat menanjak bersama menjaga jarak aman!)
          const p = easeInOut((pt - 125.0) / 4.5);
          tx = tightSlot[0];
          ty = tightSlot[1] + 8.5 * p;
          tz = tightSlot[2];
          tp = -0.82 * p;
        } else if (pt < 137.0) {
          // 129.5..137.0s — ATRAKSI 7B: BOMB BURST! Berpencar ke segala arah bak kembang api tanpa bersilangan!
          const p = easeInOut((pt - 129.5) / 7.5);
          const dirs: [number, number, number, number][] = [
            [32, 5.0, -4, -0.85],   // J2 kanan (sesuai sisi aslinya +14 -> +46, 0% silang!)
            [-32, 5.0, -4, 0.85],   // J3 kiri (sesuai sisi aslinya -14 -> -46, 0% silang!)
            [0, 18.0, -8, 0.0],     // J4 atas tengah
            [28, -4.0, -12, -0.7],  // J5 kanan bawah (+28 -> +56)
            [-28, -4.0, -12, 0.7],  // J6 kiri bawah (-28 -> -56)
          ];
          const d = dirs[i];
          const burst = Math.sin(p * Math.PI);
          tx = tightSlot[0] + d[0] * burst;
          ty = 11.5 + d[1] * burst;
          tz = tightSlot[2] + d[2] * burst;
          tp = d[1] > 8 ? -0.68 * burst : 0.22 * burst;
          tr = d[3] * burst;
          tyaw = (d[0] < 0 ? 0.52 : d[0] > 0 ? -0.52 : 0) * burst;
          smokeOn = true;
        } else if (pt < 142.0) {
          // 137.0..142.0s: Rejoin Left Echelon perlahan (5.0 detik!)
          const p = easeInOut((pt - 137.0) / 5.0);
          const echSlot = LEFT_ECHELON_SLOTS[i];
          tx = THREE.MathUtils.lerp(tightSlot[0], echSlot[0], p);
          ty = THREE.MathUtils.lerp(8.0, echSlot[1], p);
          tz = THREE.MathUtils.lerp(tightSlot[2], echSlot[2], p);
          tp = -0.025;
          smokeOn = p < 0.7;
        } else {
          // 142.0s+: Formasi Left Echelon stabil siap 3. Landing
          const echSlot = LEFT_ECHELON_SLOTS[i];
          tx = echSlot[0] + Math.sin(t * 0.8 + i) * 0.14;
          ty = echSlot[1] + Math.cos(t * 1.1 + i) * 0.1;
          tz = echSlot[2] + Math.sin(t * 0.6 + i) * 0.12;
          tp = -0.025;
          tr = Math.cos(t * 0.9 + i * 0.4) * 0.025;
          smokeOn = false;
        }
      }

      grp.visible = visible;
      const lbl = labelRefs.current[i];
      if (lbl) {
        lbl.style.display = visible ? 'block' : 'none';
      }
      if (!visible || (flightMode === 'landing' && pt < 0.12)) {
        grp.position.set(tx, ty, tz);
        grp.rotation.set(tp, tyaw, tr);
        if (!visible) continue;
      }

      // Gerakan halus & perlahan (khusus Screw Roll J6 mengikuti lintasan elips presisi agar tidak memotong tengah formasi!)
      const isScrewOrbit = flightMode === 'airborne' && pt >= 42.0 && pt < 50.0 && i === 4;
      const lerpRate = useTangentQuat ? 7.5 : isScrewOrbit ? 9.5 : flightMode === 'airborne' ? 3.2 : 6.0;
      grp.position.x = THREE.MathUtils.lerp(grp.position.x, tx, Math.min(1, dt * lerpRate));
      grp.position.y = THREE.MathUtils.lerp(grp.position.y, ty, Math.min(1, dt * lerpRate));
      grp.position.z = THREE.MathUtils.lerp(grp.position.z, tz, Math.min(1, dt * lerpRate));

      if (useTangentQuat) {
        grp.quaternion.slerp(tmpQuat, Math.min(1, dt * 6));
      } else {
        const directLoopPitch = flightMode === 'airborne' && pt >= 20.5 && pt < 30.0;
        const directRollPhase =
          flightMode === 'airborne' &&
          ((pt >= 33.0 && pt < 39.0) || (pt >= 42.0 && pt < 50.0 && i === 4) || (pt >= 89.5 && pt < 97.5 && i <= 2));
        if (directLoopPitch) {
          grp.rotation.x = tp;
        } else {
          while (grp.rotation.x < -Math.PI) grp.rotation.x += Math.PI * 2;
          while (grp.rotation.x > Math.PI) grp.rotation.x -= Math.PI * 2;
          grp.rotation.x = THREE.MathUtils.lerp(grp.rotation.x, tp, Math.min(1, dt * 3.0));
        }
        while (grp.rotation.y < -Math.PI) grp.rotation.y += Math.PI * 2;
        while (grp.rotation.y > Math.PI) grp.rotation.y -= Math.PI * 2;
        grp.rotation.y = THREE.MathUtils.lerp(grp.rotation.y, tyaw, Math.min(1, dt * 3.0));
        if (directRollPhase) {
          grp.rotation.z = tr;
        } else {
          while (grp.rotation.z < -Math.PI) grp.rotation.z += Math.PI * 2;
          while (grp.rotation.z > Math.PI) grp.rotation.z -= Math.PI * 2;
          grp.rotation.z = THREE.MathUtils.lerp(grp.rotation.z, tr, Math.min(1, dt * 3.0));
        }
      }

      const smokeMesh = smokeRefs.current[i];
      if (smokeMesh) {
        smokeMesh.visible = smokeOn;
        if (smokeOn) {
          const pulse = 1 + Math.sin(t * 14 + i) * 0.07;
          smokeMesh.scale.set(pulse, pulse, 1);
        }
      }

      gearStates.current[i] = THREE.MathUtils.lerp(gearStates.current[i], targetGear, Math.min(1, dt * 3));
      const gearObj = clone.getObjectByName('landing-gear');
      if (gearObj) {
        const r = gearStates.current[i];
        gearObj.visible = r < 0.96;
        gearObj.position.y = r * 0.78;
        gearObj.scale.set(1 - r * 0.25, Math.max(0.01, 1 - r * 0.94), 1 - r * 0.25);
      }
    }
  });

  if (!isActive || wingClones.length === 0) return null;

  return (
    <group>
      {/* Asap Merah-Putih JAT untuk Jupiter 1 (Lead = Merah) */}
      <mesh ref={leaderSmokeRef} geometry={smokeGeo} material={redSmokeMat} visible={false} />

      {/* Lukisan Asap Putih Hati Raksasa & Panah di Langit (Heart Maneuver!) */}
      <points ref={heartRightRef} geometry={heartGeos.right} material={heartSmokeMat} visible={false} />
      <points ref={heartLeftRef} geometry={heartGeos.left} material={heartSmokeMat} visible={false} />
      <points ref={arrowTrailRef} geometry={heartGeos.arrow} material={heartSmokeMat} visible={false} />

      {wingClones.map((clone, i) => (
        <group
          key={i}
          ref={(el) => {
            wingRefs.current[i] = el;
          }}
          position={[-34.0, 0, -10.5]}
          rotation={[0, Math.PI / 2, 0]}
          visible={false}
        >
          <primitive object={clone} />
          <mesh
            ref={(el) => {
              smokeRefs.current[i] = el;
            }}
            geometry={smokeGeo}
            material={i % 2 === 1 ? redSmokeMat : whiteSmokeMat}
            visible={false}
          />
          <Html position={[0, 2.35, 0]} center distanceFactor={28}>
            <div
              ref={(el) => {
                labelRefs.current[i] = el;
              }}
              style={{ display: 'none' }}
              className="pointer-events-none select-none whitespace-nowrap rounded border border-rose-400/70 bg-slate-950/80 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider text-rose-200 shadow"
            >
              JUPITER {i + 2}
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
}
