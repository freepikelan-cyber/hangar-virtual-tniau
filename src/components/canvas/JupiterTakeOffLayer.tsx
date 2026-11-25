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

// Formasi Arrowhead 5 wingmen (J2–J6) relatif terhadap Jupiter 1 (Lead) di udara
const ARROWHEAD_SLOTS: [number, number, number][] = [
  [7.0, 2.8, -6.5],    // Jupiter 2 (Kanan)
  [-7.0, 2.8, -6.5],   // Jupiter 3 (Kiri)
  [0.0, 2.5, -13.0],   // Jupiter 4 (Slot Tengah)
  [14.0, 2.6, -13.0],  // Jupiter 5 (Synchro Kanan)
  [-14.0, 2.6, -13.0], // Jupiter 6 (Synchro Kiri)
];

// Formasi Arrowhead RAPAT saat "Tighten up into Arrowhead formation!"
const TIGHT_ARROW_SLOTS: [number, number, number][] = [
  [5.4, 2.85, -5.0],
  [-5.4, 2.85, -5.0],
  [0.0, 2.65, -10.0],
  [10.8, 2.75, -10.0],
  [-10.8, 2.75, -10.0],
];

// Formasi Left Echelon (J2–J6 berjajar rapi di sayap kiri Jupiter 1) saat Rejoin & persiapan Landing
const LEFT_ECHELON_SLOTS: [number, number, number][] = [
  [-5.2, 2.9, -4.6],
  [-10.4, 2.85, -9.2],
  [-15.6, 2.8, -13.8],
  [-20.8, 2.75, -18.4],
  [-26.0, 2.7, -23.0],
];

// Formasi 6-Ship SIAP TAKE OFF di Runway 09 saat "Jupiters, check in! Two! Three! Four! Five! Six!"
const RUNWAY_FORM_SPOTS: [number, number][] = [
  [4.8, -11.5],  // Jupiter 2 (Kanan belakang J1)
  [-4.8, -11.5], // Jupiter 3 (Kiri belakang J1)
  [0.0, -14.5],  // Jupiter 4 (Tengah belakang)
  [9.6, -14.5],  // Jupiter 5 (Kanan luar)
  [-9.6, -14.5], // Jupiter 6 (Kiri luar)
];

/**
 * Menampilkan 5 pesawat pendamping Jupiter Aerobatic Team (Jupiter 2 s/d Jupiter 6) + asap putih tebal:
 * 1. Take Off: keluar hanggar satu per satu -> formasi Take Off ("check in!") -> Take Off bergantian satu per satu
 * 2. Airborne: jeda 10 dtk -> Tighten Arrowhead & Jupiter Roll -> Jupiter 5 & 6 Opposing Pass Crossing!
 */
export function JupiterTakeOffLayer({ sourceGroup }: Props) {
  const selectedId = useHangarStore((s) => s.selectedId);
  const flightMode = useHangarStore((s) => s.flightMode);
  const flightNonce = useHangarStore((s) => s.flightNonce);

  const isActive = selectedId === 'kt1b' && (flightMode === 'takeoff' || flightMode === 'airborne');

  const phaseTime = useRef(0);
  const wingRefs = useRef<(THREE.Group | null)[]>([]);
  const smokeRefs = useRef<(THREE.Mesh | null)[]>([]);
  const leaderSmokeRef = useRef<THREE.Mesh>(null);
  const gearStates = useRef<number[]>([0, 0, 0, 0, 0]);

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

  useEffect(() => {
    return () => {
      smokeMat.dispose();
      smokeGeo.dispose();
    };
  }, [smokeMat, smokeGeo]);

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

    // Asap putih tebal menyala saat airborne (hingga aba-aba "Smoke off!" di pt = 86.5s) atau setelah "Smoke on!" di takeoff (pt >= 31s)
    if (leaderSmokeRef.current) {
      const leaderSmokeOn =
        (flightMode === 'airborne' && pt < 86.5) || (flightMode === 'takeoff' && pt >= 31.0);
      leaderSmokeRef.current.visible = leaderSmokeOn;
      if (leaderSmokeOn) {
        leaderSmokeRef.current.position.set(
          Math.sin(t * 0.45) * 0.22,
          flightMode === 'airborne' ? 2.95 + Math.sin(t * 1.4) * 0.1 : 3.0,
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

      if (flightMode === 'takeoff') {
        const taxiStart = 2.0 + i * 2.2;
        const taxiEnd = taxiStart + 4.4;
        const turnEnd = taxiEnd + 1.8;
        const spawnX = -35.0 - i * 3.8;
        const spawnZ = -10.5;
        const formSpot = RUNWAY_FORM_SPOTS[i];

        const rollStart = 29.0 + i * 2.5;
        const rotStart = rollStart + 1.9;
        const climbEnd = rotStart + 2.4;

        const airSlot = ARROWHEAD_SLOTS[i];

        if (pt < taxiStart) {
          tx = spawnX;
          ty = 0;
          tz = spawnZ;
          tyaw = Math.PI / 2;
          targetGear = 0;
        } else if (pt < taxiEnd) {
          const p = easeInOut((pt - taxiStart) / (taxiEnd - taxiStart));
          tx = THREE.MathUtils.lerp(spawnX, formSpot[0] - 4.0, p);
          tz = THREE.MathUtils.lerp(spawnZ, formSpot[1], p);
          ty = 0;
          tyaw = Math.PI / 2;
          targetGear = 0;
        } else if (pt < turnEnd) {
          const p = easeInOut((pt - taxiEnd) / (turnEnd - taxiEnd));
          tx = THREE.MathUtils.lerp(formSpot[0] - 4.0, formSpot[0], p);
          tz = formSpot[1];
          ty = 0;
          tyaw = THREE.MathUtils.lerp(Math.PI / 2, 0, p);
          targetGear = 0;
        } else if (pt < rollStart) {
          tx = formSpot[0];
          tz = formSpot[1];
          ty = 0;
          tyaw = 0;
          targetGear = 0;
        } else if (pt < rotStart) {
          const p = (pt - rollStart) / (rotStart - rollStart);
          tx = formSpot[0];
          tz = THREE.MathUtils.lerp(formSpot[1], 4.0, p * p);
          ty = 0;
          tp = -0.02 * p;
          tyaw = 0;
          targetGear = 0;
        } else if (pt < climbEnd) {
          const p = easeInOut((pt - rotStart) / (climbEnd - rotStart));
          tx = THREE.MathUtils.lerp(formSpot[0], airSlot[0], p);
          tz = THREE.MathUtils.lerp(4.0, airSlot[2], p);
          ty = THREE.MathUtils.lerp(0, airSlot[1], p);
          tp = -0.25 * Math.sin(p * Math.PI);
          tr = (airSlot[0] > 0 ? -0.14 : airSlot[0] < 0 ? 0.14 : 0) * Math.sin(p * Math.PI);
          targetGear = p > 0.35 ? 1 : 0;
          smokeOn = p > 0.45;
        } else {
          tx = airSlot[0] + Math.sin(t * 0.9 + i) * 0.16;
          ty = airSlot[1] + Math.cos(t * 1.3 + i) * 0.12;
          tz = airSlot[2] + Math.sin(t * 0.7 + i) * 0.14;
          tp = -0.025;
          tr = Math.cos(t * 1.1 + i * 0.5) * 0.035;
          targetGear = 1;
          smokeOn = true;
        }
      } else {
        // MODE AIRBORNE:
        // 0..10s: Jeda 10 detik jelajah formasi Arrowhead + asap putih tebal
        // 10..21s: Tighten up into Arrowhead formation
        // 21..25.5s: Pull up 20 degrees
        // 25.5..28.8s: JUPITER ROLL 360° serempak!
        // 29.5..46.5s: J5 & J6 Opposing Pass Crossing!
        targetGear = 1;
        smokeOn = true;

        const baseSlot = ARROWHEAD_SLOTS[i];
        const tightSlot = TIGHT_ARROW_SLOTS[i];

        if (pt < 10.0) {
          tx = baseSlot[0] + Math.sin(t * 0.9 + i) * 0.16;
          ty = baseSlot[1] + Math.cos(t * 1.3 + i) * 0.12;
          tz = baseSlot[2] + Math.sin(t * 0.7 + i) * 0.14;
          tp = -0.025;
          tr = Math.cos(t * 1.1 + i * 0.5) * 0.035;
        } else if (pt < 21.0) {
          const p = easeInOut(Math.min(1, (pt - 10.0) / 5.0));
          tx = THREE.MathUtils.lerp(baseSlot[0], tightSlot[0], p);
          ty = THREE.MathUtils.lerp(baseSlot[1], tightSlot[1], p);
          tz = THREE.MathUtils.lerp(baseSlot[2], tightSlot[2], p);
          tp = -0.03;
          tr = 0;
        } else if (pt < 25.5) {
          const p = easeInOut((pt - 21.0) / 4.5);
          tx = tightSlot[0];
          ty = tightSlot[1] + 1.2 * p;
          tz = tightSlot[2];
          tp = -0.03 - 0.32 * p;
          tr = 0;
        } else if (pt < 28.8) {
          // JUPITER ROLL 360° mengelilingi poros formasi!
          const p = easeInOut((pt - 25.5) / 3.3);
          const angle = p * Math.PI * 2;
          const rx = tightSlot[0];
          const ry = tightSlot[1] - 2.95;
          const cosA = Math.cos(angle);
          const sinA = Math.sin(angle);
          tx = rx * cosA + ry * sinA;
          ty = 4.15 - 1.2 * p + (-rx * sinA + ry * cosA);
          tz = tightSlot[2];
          tp = -0.25 * Math.sin(p * Math.PI);
          tr = -angle;
        } else if (pt < 46.5 && (i === 3 || i === 4)) {
          // J5 (i=3) & J6 (i=4): OPPOSING PASS CROSSING!
          const isJ5 = i === 3;
          const dir = isJ5 ? 1 : -1;
          if (pt < 38.0) {
            // Breaking off ke kiri & kanan lalu berbalik arah saling berhadapan!
            const p = easeInOut((pt - 29.5) / 8.5);
            tx = THREE.MathUtils.lerp(tightSlot[0], dir * 32.0, p);
            ty = THREE.MathUtils.lerp(tightSlot[1], 1.6, p);
            tz = THREE.MathUtils.lerp(tightSlot[2], -4.5, p);
            tyaw = dir * -Math.PI * 0.5 * easeInOut(Math.min(1, p * 1.4));
            tr = dir * 0.45 * Math.sin(p * Math.PI);
          } else if (pt < 45.2) {
            // Melaju 400 knots saling berhadapan & CROSSING di titik tengah (pt ~ 44.0s)!
            const p = easeInOut((pt - 38.0) / 7.2);
            tx = THREE.MathUtils.lerp(dir * 32.0, -dir * 26.0, p);
            ty = 1.6 + (isJ5 ? 0.35 : -0.35) * Math.sin(p * Math.PI);
            tz = -4.5 + (isJ5 ? 0.6 : -0.6);
            tyaw = dir * -Math.PI * 0.5;
            tr = dir * 0.12 * Math.sin(p * Math.PI);
          } else {
            // Rejoin kembali ke posisi Arrowhead
            const p = easeInOut((pt - 45.2) / 1.3);
            tx = THREE.MathUtils.lerp(-dir * 26.0, baseSlot[0], p);
            ty = THREE.MathUtils.lerp(1.6, baseSlot[1], p);
            tz = THREE.MathUtils.lerp(-4.5, baseSlot[2], p);
            tyaw = THREE.MathUtils.lerp(dir * -Math.PI * 0.5, 0, p);
          }
        } else if (pt < 46.5) {
          tx = tightSlot[0];
          ty = tightSlot[1];
          tz = tightSlot[2];
          tp = -0.025;
        } else if (pt < 54.0) {
          // 47.0..54.0: Menanjak vertikal untuk Heart Maneuver!
          const p = easeInOut(Math.max(0, (pt - 47.0) / 7.0));
          tx = baseSlot[0];
          ty = baseSlot[1] + 5.2 * p;
          tz = baseSlot[2];
          tp = -0.58 * Math.sin(p * Math.PI * 0.85);
        } else if (pt < 68.5) {
          // 54.0..68.5: J5 & J6 melukis lengkungan Hati; J4 menembus Hati lalu Smoke Off!
          if (i === 3 || i === 4) {
            // J5 (kanan) & J6 (kiri) melukis kurva hati raksasa!
            const s = i === 3 ? 1 : -1;
            const p = easeInOut(Math.min(1, (pt - 54.0) / 11.0));
            const angle = p * Math.PI;
            tx = s * Math.sin(angle) * 20.0;
            ty = 9.0 + Math.sin(angle * 1.35) * 4.5 - p * 8.5;
            tz = -3.0;
            tp = 0.35 * Math.cos(angle);
            tr = s * -0.55 * Math.sin(angle);
            smokeOn = true;
          } else if (i === 2) {
            // J4 (Arrow / Slot): menembus tengah Hati dari bawah-belakang lalu Smoke Off!
            if (pt < 63.0) {
              tx = 0;
              ty = 4.2;
              tz = -14.0;
              tp = -0.04;
            } else {
              const p = easeInOut(Math.min(1, (pt - 63.0) / 4.2));
              tx = 0;
              ty = THREE.MathUtils.lerp(2.0, 12.5, p);
              tz = THREE.MathUtils.lerp(-18.0, 10.0, p);
              tp = -0.45;
              smokeOn = pt < 66.5; // "Four, piercing the heart! Smoke off!"
            }
          } else {
            tx = baseSlot[0];
            ty = 4.8;
            tz = baseSlot[2];
            tp = -0.04;
          }
        } else if (pt < 74.5) {
          // 68.5..74.5: Semua berkumpul & Pitch Up Vertical untuk Bomb Burst!
          const p = easeInOut((pt - 68.5) / 6.0);
          tx = THREE.MathUtils.lerp(tightSlot[0], tightSlot[0] * 0.8, p);
          ty = 3.0 + 5.6 * p;
          tz = tightSlot[2] * 0.85;
          tp = -0.78 * p;
        } else if (pt < 82.6) {
          // 74.5..82.6: BOMB BURST! BREAK, BREAK, BREAK! Berpencar ke 6 arah!
          const p = easeInOut((pt - 74.5) / 8.1);
          const dirs: [number, number, number, number][] = [
            [-28, 3.0, -4, 0.85],   // J2 breaking left!
            [28, 3.0, -4, -0.85],   // J3 breaking right!
            [0, 15.0, -6, 0.0],     // J4 pulling high!
            [22, -4.5, -10, -0.65], // J5 breaking down-right!
            [-22, -4.5, -10, 0.65], // J6 breaking down-left!
          ];
          const d = dirs[i];
          const burst = Math.sin(p * Math.PI);
          tx = tightSlot[0] * 0.8 + d[0] * burst;
          ty = 8.6 + d[1] * burst;
          tz = tightSlot[2] * 0.85 + d[2] * burst;
          tp = d[1] > 8 ? -0.65 * burst : 0.22 * burst;
          tr = d[3] * burst;
          tyaw = (d[0] < 0 ? 0.55 : d[0] > 0 ? -0.55 : 0) * burst;
          smokeOn = true;
        } else if (pt < 85.0) {
          const p = easeInOut((pt - 82.6) / 2.4);
          const echSlot = LEFT_ECHELON_SLOTS[i];
          tx = THREE.MathUtils.lerp(baseSlot[0], echSlot[0], p);
          ty = THREE.MathUtils.lerp(6.0, echSlot[1], p);
          tz = THREE.MathUtils.lerp(baseSlot[2], echSlot[2], p);
          tp = -0.025;
          smokeOn = true;
        } else {
          // 85.0s+: Rejoin Left Echelon Formation & Smoke Off ("prepare for landing" -> Tower cleared to land)
          const echSlot = LEFT_ECHELON_SLOTS[i];
          tx = echSlot[0] + Math.sin(t * 0.8 + i) * 0.14;
          ty = echSlot[1] + Math.cos(t * 1.1 + i) * 0.1;
          tz = echSlot[2] + Math.sin(t * 0.6 + i) * 0.12;
          tp = -0.025;
          tr = Math.cos(t * 0.9 + i * 0.4) * 0.025;
          smokeOn = pt < 86.5;
        }
      }

      grp.position.x = THREE.MathUtils.lerp(grp.position.x, tx, Math.min(1, dt * 7));
      grp.position.y = THREE.MathUtils.lerp(grp.position.y, ty, Math.min(1, dt * 7));
      grp.position.z = THREE.MathUtils.lerp(grp.position.z, tz, Math.min(1, dt * 7));
      grp.rotation.x = THREE.MathUtils.lerp(grp.rotation.x, tp, Math.min(1, dt * 6));
      grp.rotation.y = THREE.MathUtils.lerp(grp.rotation.y, tyaw, Math.min(1, dt * 6));
      if (flightMode === 'airborne' && pt >= 25.5 && pt < 28.8) {
        grp.rotation.z = tr;
      } else {
        if (grp.rotation.z < -Math.PI) grp.rotation.z += Math.PI * 2;
        if (grp.rotation.z > Math.PI) grp.rotation.z -= Math.PI * 2;
        grp.rotation.z = THREE.MathUtils.lerp(grp.rotation.z, tr, Math.min(1, dt * 6));
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

      {wingClones.map((clone, i) => (
        <group
          key={i}
          ref={(el) => {
            wingRefs.current[i] = el;
          }}
          position={[-35.0 - i * 3.8, 0, -10.5]}
          rotation={[0, Math.PI / 2, 0]}
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
            <div className="pointer-events-none select-none whitespace-nowrap rounded border border-rose-400/70 bg-slate-950/80 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider text-rose-200 shadow">
              JUPITER {i + 2}
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
}
