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

/** Kurva Hati Parametrik Halus untuk Jupiter 5 (s=+1) & Jupiter 6 (s=-1) di bidang X-Y. */
function heartPoint(u: number, s: 1 | -1): THREE.Vector3 {
  const sinU = Math.sin(u);
  const hx = s * 16.0 * sinU * sinU * sinU * 1.05;
  const hy = (13.0 * Math.cos(u) - 5.0 * Math.cos(2 * u) - 2.0 * Math.cos(3 * u) - Math.cos(4 * u)) * 0.55;
  return new THREE.Vector3(hx, 10.5 + hy, -3.5);
}

// Formasi Arrowhead 5 wingmen (J2–J6) berjarak LEGA (≥ 13.5 unit antar pesawat agar sayap bebas bersentuhan!)
const ARROWHEAD_SLOTS: [number, number, number][] = [
  [13.5, 2.8, -12.0],   // Jupiter 2 (Kanan)
  [-13.5, 2.8, -12.0],  // Jupiter 3 (Kiri)
  [0.0, 2.4, -24.0],    // Jupiter 4 (Slot Tengah)
  [27.0, 2.6, -24.0],   // Jupiter 5 (Synchro Kanan)
  [-27.0, 2.6, -24.0],  // Jupiter 6 (Synchro Kiri)
];

// Formasi Arrowhead RAPAT (lebih rapat dari Arrowhead awal, namun tetap menjaga jarak aman antar sayap!)
const TIGHT_ARROW_SLOTS: [number, number, number][] = [
  [11.5, 2.85, -10.5],
  [-11.5, 2.85, -10.5],
  [0.0, 2.55, -21.0],
  [23.0, 2.7, -21.0],
  [-23.0, 2.7, -21.0],
];

// Formasi Left Echelon (J2–J6 berjajar rapi di sayap kiri Jupiter 1 dengan jarak aman ≥ 11.5 unit!)
const LEFT_ECHELON_SLOTS: [number, number, number][] = [
  [-11.5, 2.9, -10.5],
  [-23.0, 2.8, -21.0],
  [-34.5, 2.7, -31.5],
  [-46.0, 2.6, -42.0],
  [-57.5, 2.5, -52.5],
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

  const smokeMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#f8fafc',
        transparent: true,
        opacity: 0.42,
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
    const arrowPos = new Float32Array(36 * 3);
    for (let k = 0; k < 36; k++) {
      const f = k / 35;
      arrowPos[k * 3] = THREE.MathUtils.lerp(-18.0, 18.0, f);
      arrowPos[k * 3 + 1] = THREE.MathUtils.lerp(1.5, 19.5, f);
      arrowPos[k * 3 + 2] = -3.0;
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
      smokeMat.dispose();
      smokeGeo.dispose();
      heartGeos.right.dispose();
      heartGeos.left.dispose();
      heartGeos.arrow.dispose();
      heartSmokeMat.dispose();
    };
  }, [smokeMat, smokeGeo, heartGeos, heartSmokeMat]);

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

    // Update lukisan asap HATI di langit saat Heart Maneuver (54.0..70.5s di airborne)
    const showHeartTrail = flightMode === 'airborne' && pt >= 54.0 && pt < 71.0;
    if (heartRightRef.current && heartLeftRef.current) {
      heartRightRef.current.visible = showHeartTrail;
      heartLeftRef.current.visible = showHeartTrail;
      if (showHeartTrail) {
        const drawP = Math.min(1, (pt - 54.0) / 10.0);
        const count = Math.floor(drawP * (HEART_SEGMENTS + 1));
        heartGeos.right.setDrawRange(0, count);
        heartGeos.left.setDrawRange(0, count);
        const fade = pt > 68.5 ? Math.max(0, 1 - (pt - 68.5) / 2.5) : 1;
        heartSmokeMat.opacity = 0.82 * fade;
      }
    }
    if (arrowTrailRef.current) {
      const showArrow = flightMode === 'airborne' && pt >= 64.0 && pt < 71.0;
      arrowTrailRef.current.visible = showArrow;
      if (showArrow) {
        const drawP = Math.min(1, (pt - 64.0) / 2.8);
        heartGeos.arrow.setDrawRange(0, Math.floor(drawP * 36));
      }
    }

    // Asap putih tebal untuk Jupiter 1 (Lead)
    if (leaderSmokeRef.current) {
      const inForegroundAir = flightMode === 'airborne' && !(pt >= 29.2 && pt < 46.5) && !(pt >= 54.0 && pt < 68.5);
      const leaderSmokeOn = (inForegroundAir && pt < 86.5) || (flightMode === 'takeoff' && pt >= 42.3);
      leaderSmokeRef.current.visible = leaderSmokeOn;
      if (leaderSmokeOn) {
        leaderSmokeRef.current.position.set(
          Math.sin(t * 0.45) * 0.22,
          flightMode === 'airborne' ? 2.95 + Math.sin(t * 1.4) * 0.1 : 2.95,
          0,
        );
        const pulse = 1 + Math.sin(t * 14) * 0.06;
        leaderSmokeRef.current.scale.set(pulse, pulse, 1);
      }
    }

    for (let i = 0; i < 5; i++) {
      const grp = wingRefs.current[i];
      if (!grp) continue;

      const clone = wingClones[i];
      clone.traverse((child) => {
        if (child.name.includes('prop') || child.name.includes('blade') || child.name.includes('spinner')) {
          child.rotation.z += dt * 36;
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
        // KELUAR HANGGAR SATU PER SATU DENGAN JEDA TEPAT 5 DETIK (0% NUMPUK / TABRAKAN!):
        // J1: 0s -> J2: 5s -> J3: 10s -> J4: 15s -> J5: 20s -> J6: 25s (semua sudah parkir rapi sebelum 29s!)
        const taxiStart = 5.0 + i * 5.0;
        const eastDur = 2.4;
        const turnDur = 1.0;
        const northDur = 1.4;
        const eastEnd = taxiStart + eastDur;
        const turnEnd = eastEnd + turnDur;
        const parkEnd = turnEnd + northDur;

        const formSpot = RUNWAY_FORM_SPOTS[i];
        const hangarX = -34.0;
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
        // MODE LANDING: Seluruh 6 pesawat turun bersama berjarak lega, roda keluar saat "gears down" (3.2s), flare & touchdown di 8.6s!
        smokeOn = false;
        const ech = LEFT_ECHELON_SLOTS[i];
        const landX = RUNWAY_FORM_SPOTS[i][0];
        const landZOff = RUNWAY_FORM_SPOTS[i][1] - 16.0;

        if (pt < 6.8) {
          const p = pt / 6.8;
          tx = THREE.MathUtils.lerp(ech[0] * 0.65, landX, p);
          ty = THREE.MathUtils.lerp(8.2, 1.75, p);
          tz = THREE.MathUtils.lerp(-18.5, -4.0, p) + landZOff * 0.45;
          tp = 0.06;
          targetGear = pt < 3.2 ? 1 : 0;
        } else if (pt < 8.6) {
          const p = easeInOut((pt - 6.8) / 1.8);
          tx = landX;
          ty = THREE.MathUtils.lerp(1.75, 0.05, p);
          tz = THREE.MathUtils.lerp(-4.0, -1.5, p) + landZOff * 0.45;
          tp = THREE.MathUtils.lerp(0.06, -0.16, p);
          targetGear = 0;
        } else if (pt < 13.0) {
          const p = (pt - 8.6) / 4.4;
          tx = landX;
          ty = p < 0.14 ? Math.sin((p / 0.14) * Math.PI) * 0.04 : 0;
          tz = THREE.MathUtils.lerp(-1.5, 1.4, easeInOut(p)) + landZOff * 0.45;
          tp = THREE.MathUtils.lerp(-0.16, 0, Math.min(1, p * 1.65));
          targetGear = 0;
        } else if (pt < 20.3) {
          const p = Math.min(1, (pt - 13.0) / 5.8);
          tx = landX;
          ty = 0;
          tz = THREE.MathUtils.lerp(1.4, 2.2, easeInOut(p)) + landZOff * 0.45;
          targetGear = 0;
        } else if (pt < 23.3) {
          const p = easeInOut((pt - 20.3) / 3.0);
          tx = THREE.MathUtils.lerp(landX, -8.0 - i * 3.5, p);
          tz = THREE.MathUtils.lerp(2.2 + landZOff * 0.45, 3.5, p);
          ty = 0;
          tyaw = THREE.MathUtils.lerp(0, -Math.PI / 2, p);
          targetGear = 0;
        } else {
          const p = easeInOut(Math.min(1, (pt - 23.3) / 6.0));
          tx = THREE.MathUtils.lerp(-8.0 - i * 3.5, -31.5 - i * 3.8, p);
          tz = 3.5;
          ty = 0;
          tyaw = -Math.PI / 2;
          targetGear = 0;
        }
      } else {
        // MODE AIRBORNE — 100% TERSINKRONISASI DENGAN ABA-ABA PILOT:
        targetGear = 1;
        smokeOn = true;

        const baseSlot = ARROWHEAD_SLOTS[i];
        const tightSlot = TIGHT_ARROW_SLOTS[i];

        if (pt < 10.0) {
          // 0..10s: Jeda 10 detik jelajah formasi Arrowhead + asap putih tebal
          tx = baseSlot[0] + Math.sin(t * 0.9 + i) * 0.16;
          ty = baseSlot[1] + Math.cos(t * 1.3 + i) * 0.12;
          tz = baseSlot[2] + Math.sin(t * 0.7 + i) * 0.14;
          tp = -0.025;
          tr = Math.cos(t * 1.1 + i * 0.5) * 0.035;
        } else if (pt < 21.0) {
          // 10..21s: "Jupiters, tighten up into Arrowhead formation... Two, Three, Four!"
          const p = easeInOut(Math.min(1, (pt - 10.0) / 5.0));
          tx = THREE.MathUtils.lerp(baseSlot[0], tightSlot[0], p);
          ty = THREE.MathUtils.lerp(baseSlot[1], tightSlot[1], p);
          tz = THREE.MathUtils.lerp(baseSlot[2], tightSlot[2], p);
          tp = -0.03;
          tr = 0;
        } else if (pt < 24.5) {
          // 21..24.5s: "Standby for Jupiter Roll... Pulling up, 20 degrees... Ready..."
          const p = easeInOut((pt - 21.0) / 3.5);
          tx = tightSlot[0];
          ty = tightSlot[1] + 1.2 * p;
          tz = tightSlot[2];
          tp = -0.03 - 0.3 * p;
          tr = 0;
        } else if (pt < 29.5) {
          // 24.5..29.5s: "...NOW!" -> JUPITER ROLL 360° SANTAI & ANGGUN (5 detik penuh, jarak tetap terjaga!)
          const p = easeInOut((pt - 24.5) / 5.0);
          const angle = p * Math.PI * 2;
          const rx = tightSlot[0];
          const ry = tightSlot[1] - 2.95;
          const cosA = Math.cos(angle);
          const sinA = Math.sin(angle);
          tx = rx * cosA + ry * sinA;
          ty = 4.15 - 1.2 * p + (-rx * sinA + ry * cosA);
          tz = tightSlot[2];
          tp = -0.18 * Math.sin(p * Math.PI);
          tr = -angle;
        } else if (pt < 46.5 && (i === 3 || i === 4)) {
          // 29.5..46.5s: HANYA J5 & J6 melakukan Opposing Pass Crossing!
          // J5 & J6 menjauh keluar layar ke JAUH KANAN (+72) & JAUH KIRI (-72) dulu, lalu baru melesat CROSSING tepat di tengah!
          const isJ5 = i === 3;
          const dir = isJ5 ? 1 : -1;
          if (pt < 35.5) {
            // Break off keluar jauh ke kanan (+72) & kiri (-72) agar tidak terlihat di tengah layar!
            const p = easeInOut((pt - 29.5) / 6.0);
            tx = THREE.MathUtils.lerp(tightSlot[0], dir * 72.0, p);
            ty = THREE.MathUtils.lerp(tightSlot[1], 3.0, p);
            tz = THREE.MathUtils.lerp(tightSlot[2], -3.0 + (isJ5 ? 2.2 : -2.2), p);
            tyaw = dir * -Math.PI * 0.5 * easeInOut(Math.min(1, p * 1.4));
            tr = dir * 0.38 * Math.sin(p * Math.PI);
          } else if (pt < 41.0) {
            // Tahan posisi JAUH di kanan (+72) & kiri (-72) saat "Heading reciprocal... Visual contact? Six, visual!"
            tx = dir * 72.0;
            ty = 3.0 + (isJ5 ? 0.5 : -0.5);
            tz = -3.0 + (isJ5 ? 2.2 : -2.2);
            tyaw = dir * -Math.PI * 0.5;
            tr = 0;
          } else if (pt < 45.4) {
            // "Closing speed 400 knots... Three, two, one... CROSSING!" -> Baru melesat masuk & berpapasan tepat di X=0 (pt = 43.2s)!
            const p = (pt - 41.0) / 4.4;
            tx = THREE.MathUtils.lerp(dir * 72.0, -dir * 72.0, p);
            ty = 3.0 + (isJ5 ? 0.5 : -0.5);
            tz = -3.0 + (isJ5 ? 2.2 : -2.2);
            tyaw = dir * -Math.PI * 0.5;
            tr = dir * 0.08 * Math.sin(p * Math.PI);
          } else {
            const p = easeInOut((pt - 45.4) / 1.1);
            tx = THREE.MathUtils.lerp(-dir * 72.0, baseSlot[0], p);
            ty = THREE.MathUtils.lerp(3.0, baseSlot[1], p);
            tz = THREE.MathUtils.lerp(-3.0, baseSlot[2], p);
            tyaw = THREE.MathUtils.lerp(dir * -Math.PI * 0.5, 0, p);
          }
        } else if (pt < 46.5) {
          // J2, J3, J4 mundur jauh & tidak mengganggu panggung Opposing Pass!
          visible = pt < 30.8 || pt > 45.0;
          tx = tightSlot[0];
          ty = tightSlot[1] + 16.0;
          tz = -110.0;
          smokeOn = false;
        } else if (pt < 54.0) {
          // 47.0..54.0s: "Jupiters, climbing vertical for the Heart Maneuver! Pull... pull... ease off at the top."
          const p = easeInOut(Math.max(0, (pt - 47.0) / 7.0));
          if (i === 3 || i === 4) {
            const s = i === 3 ? 1 : -1;
            tx = THREE.MathUtils.lerp(baseSlot[0], s * 1.4, p);
            ty = THREE.MathUtils.lerp(baseSlot[1], 13.2, p);
            tz = THREE.MathUtils.lerp(baseSlot[2], -3.5, p);
            tp = -0.62 * Math.sin(p * Math.PI * 0.85);
          } else {
            tx = baseSlot[0];
            ty = baseSlot[1] + 6.0 * p;
            tz = baseSlot[2] - 20.0 * p;
            tp = -0.52 * Math.sin(p * Math.PI * 0.85);
          }
        } else if (pt < 68.5) {
          // 54.0..68.5s: HEART MANEUVER! HANYA 2 PESAWAT (J5 & J6) melukis kurva Hati parametrik mulus, lalu J4 menembus!
          if (i === 3 || i === 4) {
            const s: 1 | -1 = i === 3 ? 1 : -1;
            const p = easeInOut(Math.min(1, (pt - 54.0) / 10.0));
            const u = p * Math.PI;
            const uNext = Math.min(Math.PI, u + 0.03);
            tmpPos.copy(heartPoint(u, s));
            tmpNext.copy(heartPoint(uNext, s));
            tx = tmpPos.x;
            ty = tmpPos.y;
            tz = tmpPos.z;
            // Arahkan hidung pesawat mengikuti garis singgung kurva Hati secara halus (tidak kaku!)
            if (tmpNext.distanceToSquared(tmpPos) > 1e-6) {
              tmpMat.lookAt(tmpNext, tmpPos, tmpUp);
              tmpQuat.setFromRotationMatrix(tmpMat);
              useTangentQuat = true;
            }
            smokeOn = pt < 64.5;
          } else if (i === 2) {
            // J4 (Arrow / Slot): menembus lurus diagonal tengah Hati tepat di "Four, piercing the heart! Smoke off!" (64.0..68.0s)
            if (pt < 63.8) {
              visible = false;
              tx = -20.0;
              ty = 0.5;
              tz = -3.0;
              smokeOn = false;
            } else {
              const p = easeInOut(Math.min(1, (pt - 63.8) / 3.8));
              tmpPos.set(THREE.MathUtils.lerp(-18.0, 18.0, p), THREE.MathUtils.lerp(1.5, 19.5, p), -3.0);
              tmpNext.set(tmpPos.x + 1.0, tmpPos.y + 0.5, -3.0);
              tx = tmpPos.x;
              ty = tmpPos.y;
              tz = tmpPos.z;
              tmpMat.lookAt(tmpNext, tmpPos, tmpUp);
              tmpQuat.setFromRotationMatrix(tmpMat);
              useTangentQuat = true;
              smokeOn = pt < 66.8; // "Smoke off!"
            }
          } else {
            // J2 & J3 mundur jauh & disembunyikan agar panggung Heart Maneuver murni 2 pesawat!
            visible = false;
            tx = baseSlot[0];
            ty = 18.0;
            tz = -115.0;
            smokeOn = false;
          }
        } else if (pt < 74.2) {
          // 68.5..74.2s: "All Jupiters, final maneuver, Bomb Burst! Pitch up vertical... Ready..."
          const p = easeInOut((pt - 68.5) / 5.7);
          tx = THREE.MathUtils.lerp(tightSlot[0], tightSlot[0] * 0.75, p);
          ty = 3.0 + 5.8 * p;
          tz = tightSlot[2] * 0.85;
          tp = -0.82 * p;
        } else if (pt < 82.8) {
          // 74.2..82.8s: "BREAK, BREAK, BREAK! Two breaking left! Three breaking right! Four pulling high!"
          const p = easeInOut((pt - 74.2) / 8.6);
          const dirs: [number, number, number, number][] = [
            [-30, 3.0, -4, 0.85],   // J2 breaking left!
            [30, 3.0, -4, -0.85],   // J3 breaking right!
            [0, 16.0, -6, 0.0],     // J4 pulling high!
            [24, -4.5, -10, -0.65], // J5 breaking down-right!
            [-24, -4.5, -10, 0.65], // J6 breaking down-left!
          ];
          const d = dirs[i];
          const burst = Math.sin(p * Math.PI);
          tx = tightSlot[0] * 0.75 + d[0] * burst;
          ty = 8.8 + d[1] * burst;
          tz = tightSlot[2] * 0.85 + d[2] * burst;
          tp = d[1] > 8 ? -0.65 * burst : 0.22 * burst;
          tr = d[3] * burst;
          tyaw = (d[0] < 0 ? 0.55 : d[0] > 0 ? -0.55 : 0) * burst;
          smokeOn = true;
        } else if (pt < 85.2) {
          const p = easeInOut((pt - 82.8) / 2.4);
          const echSlot = LEFT_ECHELON_SLOTS[i];
          tx = THREE.MathUtils.lerp(baseSlot[0], echSlot[0], p);
          ty = THREE.MathUtils.lerp(6.0, echSlot[1], p);
          tz = THREE.MathUtils.lerp(baseSlot[2], echSlot[2], p);
          tp = -0.025;
          smokeOn = true;
        } else {
          // 85.2s+: Rejoin Left Echelon Formation & Smoke Off ("prepare for landing" -> Tower cleared to land)
          const echSlot = LEFT_ECHELON_SLOTS[i];
          tx = echSlot[0] + Math.sin(t * 0.8 + i) * 0.14;
          ty = echSlot[1] + Math.cos(t * 1.1 + i) * 0.1;
          tz = echSlot[2] + Math.sin(t * 0.6 + i) * 0.12;
          tp = -0.025;
          tr = Math.cos(t * 0.9 + i * 0.4) * 0.025;
          smokeOn = pt < 86.5;
        }
      }

      grp.visible = visible;
      const lbl = labelRefs.current[i];
      if (lbl) {
        lbl.style.display = visible ? 'block' : 'none';
      }
      if (!visible) {
        grp.position.set(tx, ty, tz);
        grp.rotation.set(0, tyaw, 0);
        continue;
      }

      const lerpRate = useTangentQuat ? 10 : 7;
      grp.position.x = THREE.MathUtils.lerp(grp.position.x, tx, Math.min(1, dt * lerpRate));
      grp.position.y = THREE.MathUtils.lerp(grp.position.y, ty, Math.min(1, dt * lerpRate));
      grp.position.z = THREE.MathUtils.lerp(grp.position.z, tz, Math.min(1, dt * lerpRate));

      if (useTangentQuat) {
        grp.quaternion.slerp(tmpQuat, Math.min(1, dt * 8));
      } else {
        grp.rotation.x = THREE.MathUtils.lerp(grp.rotation.x, tp, Math.min(1, dt * 6));
        grp.rotation.y = THREE.MathUtils.lerp(grp.rotation.y, tyaw, Math.min(1, dt * 6));
        if (flightMode === 'airborne' && pt >= 24.5 && pt < 29.5) {
          grp.rotation.z = tr;
        } else {
          if (grp.rotation.z < -Math.PI) grp.rotation.z += Math.PI * 2;
          if (grp.rotation.z > Math.PI) grp.rotation.z -= Math.PI * 2;
          grp.rotation.z = THREE.MathUtils.lerp(grp.rotation.z, tr, Math.min(1, dt * 6));
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
      {/* Asap putih tebal untuk Jupiter 1 (Lead) */}
      <mesh ref={leaderSmokeRef} geometry={smokeGeo} material={smokeMat} visible={false} />

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
            material={smokeMat}
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
