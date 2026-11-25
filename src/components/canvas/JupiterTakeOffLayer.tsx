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

// Formasi 6-Ship SIAP TAKE OFF di Runway 09 saat "Jupiters, check in! Two! Three! Four! Five! Six!"
const RUNWAY_FORM_SPOTS: [number, number][] = [
  [4.8, -11.5],  // Jupiter 2 (Kanan belakang J1)
  [-4.8, -11.5], // Jupiter 3 (Kiri belakang J1)
  [0.0, -14.5],  // Jupiter 4 (Tengah belakang)
  [9.6, -14.5],  // Jupiter 5 (Kanan luar)
  [-9.6, -14.5], // Jupiter 6 (Kiri luar)
];

/**
 * Menampilkan 5 pesawat pendamping Jupiter Aerobatic Team (Jupiter 2 s/d Jupiter 6)
 * saat simulasi Take Off KT-1B Wong Bee:
 * 1. Keluar dari hanggar satu per satu menuju titik Take Off (0..18.5s)
 * 2. Semua 6 pesawat berbaris rapi membentuk Formasi Take Off di Runway 09 saat Check-In ("Jupiters, check in! 2..6") (18.5..26.5s)
 * 3. Take Off bergantian SATU PER SATU (26.5..46.5s) hingga semua mengudara dalam formasi Arrowhead
 */
export function JupiterTakeOffLayer({ sourceGroup }: Props) {
  const selectedId = useHangarStore((s) => s.selectedId);
  const flightMode = useHangarStore((s) => s.flightMode);
  const flightNonce = useHangarStore((s) => s.flightNonce);

  const isActive = selectedId === 'kt1b' && (flightMode === 'takeoff' || flightMode === 'airborne');

  const phaseTime = useRef(0);
  const wingRefs = useRef<(THREE.Group | null)[]>([]);
  const gearStates = useRef<number[]>([0, 0, 0, 0, 0]);

  useEffect(() => {
    phaseTime.current = 0;
    if (flightMode === 'takeoff') {
      gearStates.current = [0, 0, 0, 0, 0];
    } else if (flightMode === 'airborne') {
      gearStates.current = [1, 1, 1, 1, 1];
    }
  }, [flightMode, flightNonce, isActive]);

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

      if (flightMode === 'takeoff') {
        // Tahap 1 (0..18.5s): Keluar dari hanggar satu per satu menuju posisi formasi Take Off di Runway 09
        const taxiStart = 2.0 + i * 2.2; // J2: 2.0s, J3: 4.2s, J4: 6.4s, J5: 8.6s, J6: 10.8s
        const taxiEnd = taxiStart + 4.4;
        const turnEnd = taxiEnd + 1.8;
        const spawnX = -35.0 - i * 3.8;
        const spawnZ = -10.5;
        const formSpot = RUNWAY_FORM_SPOTS[i];

        // Tahap 2 (18.5..26.5s): Semua 6 pesawat berada di formasi Take Off di Runway 09 ("Jupiters, check in!")
        // Tahap 3 (26.5..46.5s): Take Off bergantian SATU PER SATU setelah J1 (J1 roll 26.5..28.6s)
        const rollStart = 29.0 + i * 2.5; // J2: 29.0s, J3: 31.5s, J4: 34.0s, J5: 36.5s, J6: 39.0s
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
          // Belok rapi masuk posisi formasi Take Off di Runway 09
          const p = easeInOut((pt - taxiEnd) / (turnEnd - taxiEnd));
          tx = THREE.MathUtils.lerp(formSpot[0] - 4.0, formSpot[0], p);
          tz = formSpot[1];
          ty = 0;
          tyaw = THREE.MathUtils.lerp(Math.PI / 2, 0, p);
          targetGear = 0;
        } else if (pt < rollStart) {
          // Siap di posisi formasi Take Off sambil menunggu "Jupiters, check in!" & giliran lepas landas satu per satu
          tx = formSpot[0];
          tz = formSpot[1];
          ty = 0;
          tyaw = 0;
          targetGear = 0;
        } else if (pt < rotStart) {
          // Akselerasi penuh di runway!
          const p = (pt - rollStart) / (rotStart - rollStart);
          tx = formSpot[0];
          tz = THREE.MathUtils.lerp(formSpot[1], 4.0, p * p);
          ty = 0;
          tp = -0.02 * p;
          tyaw = 0;
          targetGear = 0;
        } else if (pt < climbEnd) {
          // Rotate, Liftoff & Gear Up menuju posisi formasi udara
          const p = easeInOut((pt - rotStart) / (climbEnd - rotStart));
          tx = THREE.MathUtils.lerp(formSpot[0], airSlot[0], p);
          tz = THREE.MathUtils.lerp(4.0, airSlot[2], p);
          ty = THREE.MathUtils.lerp(0, airSlot[1], p);
          tp = -0.25 * Math.sin(p * Math.PI);
          tr = (airSlot[0] > 0 ? -0.14 : airSlot[0] < 0 ? 0.14 : 0) * Math.sin(p * Math.PI);
          targetGear = p > 0.35 ? 1 : 0;
        } else {
          tx = airSlot[0] + Math.sin(t * 0.9 + i) * 0.16;
          ty = airSlot[1] + Math.cos(t * 1.3 + i) * 0.12;
          tz = airSlot[2] + Math.sin(t * 0.7 + i) * 0.14;
          tp = -0.025;
          tr = Math.cos(t * 1.1 + i * 0.5) * 0.035;
          targetGear = 1;
        }
      } else {
        const airSlot = ARROWHEAD_SLOTS[i];
        tx = airSlot[0] + Math.sin(t * 0.9 + i) * 0.16;
        ty = airSlot[1] + Math.cos(t * 1.3 + i) * 0.12;
        tz = airSlot[2] + Math.sin(t * 0.7 + i) * 0.14;
        tp = -0.025;
        tr = Math.cos(t * 1.1 + i * 0.5) * 0.035;
        targetGear = 1;
      }

      grp.position.x = THREE.MathUtils.lerp(grp.position.x, tx, Math.min(1, dt * 6));
      grp.position.y = THREE.MathUtils.lerp(grp.position.y, ty, Math.min(1, dt * 6));
      grp.position.z = THREE.MathUtils.lerp(grp.position.z, tz, Math.min(1, dt * 6));
      grp.rotation.x = THREE.MathUtils.lerp(grp.rotation.x, tp, Math.min(1, dt * 5));
      grp.rotation.y = THREE.MathUtils.lerp(grp.rotation.y, tyaw, Math.min(1, dt * 5));
      grp.rotation.z = THREE.MathUtils.lerp(grp.rotation.z, tr, Math.min(1, dt * 5));

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
