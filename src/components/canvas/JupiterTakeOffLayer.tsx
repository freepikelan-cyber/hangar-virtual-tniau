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

    // Update lukisan asap putih HATI di langit saat Atraksi 5: Heart (Love) & Roll (51.0..68.0s)
    const showHeartTrail = flightMode === 'airborne' && pt >= 51.0 && pt < 68.5;
    if (heartRightRef.current && heartLeftRef.current) {
      heartRightRef.current.visible = showHeartTrail;
      heartLeftRef.current.visible = showHeartTrail;
      if (showHeartTrail) {
        const drawP = Math.min(1, (pt - 51.0) / 9.5);
        const count = Math.floor(drawP * (HEART_SEGMENTS + 1));
        heartGeos.right.setDrawRange(0, count);
        heartGeos.left.setDrawRange(0, count);
        const fade = pt > 66.5 ? Math.max(0, 1 - (pt - 66.5) / 2.0) : 1;
        heartSmokeMat.opacity = 0.85 * fade;
      }
    }
    if (arrowTrailRef.current) {
      const showArrow = flightMode === 'airborne' && pt >= 60.5 && pt < 68.5;
      arrowTrailRef.current.visible = showArrow;
      if (showArrow) {
        const drawP = Math.min(1, (pt - 60.5) / 4.2);
        heartGeos.arrow.setDrawRange(0, Math.floor(drawP * 36));
      }
    }

    // Asap Merah-Putih untuk Jupiter 1 (Lead = Merah)
    if (leaderSmokeRef.current) {
      const inHeartHide = flightMode === 'airborne' && pt >= 51.0 && pt < 60.5;
      const leaderSmokeOn =
        (flightMode === 'airborne' && !inHeartHide && pt < 89.5) || (flightMode === 'takeoff' && pt >= 42.3);
      leaderSmokeRef.current.visible = leaderSmokeOn;
      if (leaderSmokeOn) {
        // Sinkronkan ekor asap J1 dengan gerak Loop / Solo Spin / Bomb Burst
        let ly = 2.95 + Math.sin(t * 1.4) * 0.1;
        let lz = 0;
        if (flightMode === 'airborne' && pt >= 19.0 && pt < 28.0) {
          const lp = easeInOut((pt - 19.0) / 9.0);
          const a = lp * Math.PI * 2;
          ly = 2.95 + (1 - Math.cos(a)) * 7.5;
          lz = Math.sin(a) * 7.5;
        } else if (flightMode === 'airborne' && pt >= 67.0 && pt < 77.0) {
          const sp = (pt - 67.0) / 10.0;
          ly = sp < 0.3 ? 2.95 + (sp / 0.3) * 12.0 : sp < 0.8 ? 14.95 - ((sp - 0.3) / 0.5) * 11.5 : 3.45;
        } else if (flightMode === 'airborne' && pt >= 77.0 && pt < 88.5) {
          const bp = Math.min(1, (pt - 77.0) / 11.5);
          ly = 2.95 + Math.sin(bp * Math.PI) * 8.5;
        }
        leaderSmokeRef.current.position.set(Math.sin(t * 0.45) * 0.22, ly, lz);
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
        // MODE AIRBORNE — 7 ATRAKSI IKONIK JUPITER AEROBATIC TEAM (JAT) + ASAP MERAH & PUTIH:
        targetGear = 1;
        smokeOn = true;

        const baseSlot = ARROWHEAD_SLOTS[i];
        const tightSlot = TIGHT_ARROW_SLOTS[i];

        if (pt < 6.0) {
          // 0..6s: Jelajah awal formasi Arrowhead
          tx = baseSlot[0] + Math.sin(t * 0.9 + i) * 0.16;
          ty = baseSlot[1] + Math.cos(t * 1.3 + i) * 0.12;
          tz = baseSlot[2] + Math.sin(t * 0.7 + i) * 0.14;
          tp = -0.025;
          tr = Math.cos(t * 1.1 + i * 0.5) * 0.035;
        } else if (pt < 16.0) {
          // 6..16s — ATRAKSI 1: CROSS OVER BREAK
          // 4 pesawat utama (J1–J4) melaju lurus stabil, sementara 2 pesawat terluar (J5 & J6) membelok tajam bersilangan kiri & kanan!
          const p = (pt - 6.0) / 10.0;
          if (i === 3 || i === 4) {
            const dir = i === 3 ? 1 : -1; // J5 mulai dari kanan (+27) menyeberang ke kiri (-34), J6 sebaliknya!
            const cross = Math.sin(p * Math.PI);
            tx = THREE.MathUtils.lerp(baseSlot[0], -dir * 34.0, easeInOut(Math.min(1, p * 1.25)));
            if (p > 0.78) {
              const r = easeInOut((p - 0.78) / 0.22);
              tx = THREE.MathUtils.lerp(-dir * 34.0, tightSlot[0], r);
            }
            ty = baseSlot[1] + (i === 3 ? 2.2 : -1.2) * cross;
            tz = baseSlot[2] + 10.0 * cross;
            tyaw = -dir * 0.65 * cross;
            tr = dir * 1.05 * cross;
          } else {
            tx = baseSlot[0];
            ty = baseSlot[1];
            tz = baseSlot[2];
            tp = -0.02;
            tr = 0;
          }
        } else if (pt < 28.0) {
          // 16..28s — ATRAKSI 2: ARROW HEAD FORMATION & LOOP
          // 6 pesawat rapat ujung anak panah (J1 terdepan) lalu menanjak membentuk lingkaran vertikal penuh 360° (Loop)!
          if (pt < 19.0) {
            const p = easeInOut((pt - 16.0) / 3.0);
            tx = THREE.MathUtils.lerp(baseSlot[0], tightSlot[0], p);
            ty = THREE.MathUtils.lerp(baseSlot[1], tightSlot[1], p);
            tz = THREE.MathUtils.lerp(baseSlot[2], tightSlot[2], p);
            tp = -0.03;
          } else {
            const p = easeInOut((pt - 19.0) / 9.0);
            const a = p * Math.PI * 2;
            const R = 7.5;
            tx = tightSlot[0];
            ty = tightSlot[1] + (1 - Math.cos(a)) * R;
            tz = tightSlot[2] + Math.sin(a) * R;
            tp = -a;
            tr = 0;
          }
        } else if (pt < 33.5) {
          // 28..33.5s — ATRAKSI 3A: JUPITER ROLL (6 pesawat bergulung serempak 360° pada sumbunya)
          const p = easeInOut((pt - 28.0) / 5.5);
          const angle = p * Math.PI * 2;
          const rx = tightSlot[0];
          const ry = tightSlot[1] - 2.95;
          const cosA = Math.cos(angle);
          const sinA = Math.sin(angle);
          tx = rx * cosA + ry * sinA;
          ty = 3.6 + (-rx * sinA + ry * cosA);
          tz = tightSlot[2];
          tp = -0.14 * Math.sin(p * Math.PI);
          tr = -angle;
        } else if (pt < 40.0) {
          // 33.5..40.0s — ATRAKSI 3B: SCREW ROLL
          // 5 pesawat utama (J1–J5) terbang lurus stabil, sementara J6 (i === 4) berputar heliks melingkari formasi utama!
          const p = (pt - 33.5) / 6.5;
          if (i === 4) {
            const a = p * Math.PI * 4; // 2 putaran penuh mengelilingi formasi utama!
            const rad = 16.5;
            tx = Math.cos(a) * rad;
            ty = 4.2 + Math.sin(a) * rad * 0.55;
            tz = -10.0 + Math.sin(p * Math.PI) * 6.0;
            tr = -a;
            tp = -0.08 * Math.cos(a);
          } else {
            tx = tightSlot[0];
            ty = tightSlot[1];
            tz = tightSlot[2];
            tp = -0.025;
            tr = 0;
          }
        } else if (pt < 51.0) {
          // 40..51s — ATRAKSI 4: MIRROR
          // 2 pesawat (J1 normal + J5 terbalik/inverted sangat dekat di atasnya) bagaikan bayangan cermin!
          if (i === 3) {
            const enter = pt < 42.2 ? easeInOut((pt - 40.0) / 2.2) : pt > 49.0 ? 1 - easeInOut((pt - 49.0) / 2.0) : 1;
            tx = THREE.MathUtils.lerp(tightSlot[0], 0.0, enter);
            ty = THREE.MathUtils.lerp(tightSlot[1], 6.45, enter); // Tepat dekat di atas J1 (y=2.95)
            tz = THREE.MathUtils.lerp(tightSlot[2], 0.2, enter);
            tp = 0.025;
            tr = Math.PI * enter; // Terbalik 180° (Inverted Mirror!)
          } else {
            visible = false;
            tx = tightSlot[0];
            ty = 18.0;
            tz = -115.0;
            smokeOn = false;
          }
        } else if (pt < 67.0) {
          // 51..67s — ATRAKSI 5: HEART (LOVE) & ROLL
          // J5 & J6 melukis hati raksasa asap putih (51..60.5s), lalu 4 pesawat lainnya (J1–J4) menusuk tepat di tengah hati sambil ROLL!
          if (i === 3 || i === 4) {
            const s: 1 | -1 = i === 3 ? 1 : -1;
            const p = easeInOut(Math.min(1, (pt - 51.0) / 9.5));
            const u = p * Math.PI;
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
            smokeOn = pt < 61.5;
          } else {
            // J2, J3, J4 bersama J1 (4 pesawat!) menusuk tengah hati sambil melakukan putaran ROLL!
            if (pt < 60.5) {
              visible = false;
              tx = -22.0;
              ty = 2.0;
              tz = -3.0;
              smokeOn = false;
            } else {
              const p = easeInOut(Math.min(1, (pt - 60.5) / 6.0));
              const offsets: [number, number, number][] = [
                [4.2, -1.2, -5.0],  // J2
                [-4.2, -1.2, -5.0], // J3
                [0.0, -2.4, -10.0], // J4
              ];
              const off = offsets[i];
              tx = THREE.MathUtils.lerp(-18.0, 18.0, p) + off[0];
              ty = THREE.MathUtils.lerp(2.0, 18.5, p) + off[1];
              tz = -3.0 + off[2];
              tp = -0.38;
              tyaw = Math.PI * 0.32;
              tr = -p * Math.PI * 4; // 2 putaran roll saat menusuk tengah hati!
              smokeOn = true;
            }
          }
        } else if (pt < 77.0) {
          // 67..77s — ATRAKSI 6: SOLO SPIN (J1 menanjak -> stall spin vertikal -> recovery; J2–J6 menepi rapi)
          visible = false;
          tx = tightSlot[0];
          ty = 18.0;
          tz = -115.0;
          smokeOn = false;
        } else if (pt < 81.5) {
          // 77..81.5s — ATRAKSI 7A: LOOP & BOMB BURST (6 pesawat menanjak bersama ke titik puncak!)
          const p = easeInOut((pt - 77.0) / 4.5);
          tx = THREE.MathUtils.lerp(tightSlot[0], tightSlot[0] * 0.68, p);
          ty = 3.0 + 7.2 * p;
          tz = tightSlot[2] * 0.8;
          tp = -0.85 * p;
        } else if (pt < 88.5) {
          // 81.5..88.5s — ATRAKSI 7B: BOMB BURST! Seluruh 6 pesawat berpencar ke segala arah bak kembang api!
          const p = easeInOut((pt - 81.5) / 7.0);
          const dirs: [number, number, number, number][] = [
            [-32, 4.0, -4, 0.9],   // J2 kiri
            [32, 4.0, -4, -0.9],   // J3 kanan
            [0, 17.0, -6, 0.0],    // J4 atas
            [26, -5.0, -10, -0.7], // J5 kanan bawah
            [-26, -5.0, -10, 0.7], // J6 kiri bawah
          ];
          const d = dirs[i];
          const burst = Math.sin(p * Math.PI);
          tx = tightSlot[0] * 0.68 + d[0] * burst;
          ty = 10.2 + d[1] * burst;
          tz = tightSlot[2] * 0.8 + d[2] * burst;
          tp = d[1] > 8 ? -0.68 * burst : 0.24 * burst;
          tr = d[3] * burst;
          tyaw = (d[0] < 0 ? 0.55 : d[0] > 0 ? -0.55 : 0) * burst;
          smokeOn = true;
        } else {
          // 88.5s+: Rejoin Left Echelon & Siap Landing
          const echSlot = LEFT_ECHELON_SLOTS[i];
          tx = echSlot[0] + Math.sin(t * 0.8 + i) * 0.14;
          ty = echSlot[1] + Math.cos(t * 1.1 + i) * 0.1;
          tz = echSlot[2] + Math.sin(t * 0.6 + i) * 0.12;
          tp = -0.025;
          tr = Math.cos(t * 0.9 + i * 0.4) * 0.025;
          smokeOn = pt < 89.5;
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
        const directLoopPitch = flightMode === 'airborne' && pt >= 19.0 && pt < 28.0;
        const directRollPhase =
          flightMode === 'airborne' &&
          ((pt >= 28.0 && pt < 40.0) || (pt >= 60.5 && pt < 67.0 && i <= 2));
        grp.rotation.x = directLoopPitch ? tp : THREE.MathUtils.lerp(grp.rotation.x, tp, Math.min(1, dt * 6));
        grp.rotation.y = THREE.MathUtils.lerp(grp.rotation.y, tyaw, Math.min(1, dt * 6));
        if (directRollPhase) {
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
