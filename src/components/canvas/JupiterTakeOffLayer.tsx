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

// Formasi Arrowhead 5 wingmen (J2–J6) relatif terhadap Jupiter 1 (Lead)
const ARROWHEAD_SLOTS: [number, number, number][] = [
  [7.0, 2.8, -6.5],    // Jupiter 2 (Kanan)
  [-7.0, 2.8, -6.5],   // Jupiter 3 (Kiri)
  [0.0, 2.5, -13.0],   // Jupiter 4 (Slot Tengah)
  [14.0, 2.6, -13.0],  // Jupiter 5 (Synchro Kanan)
  [-14.0, 2.6, -13.0], // Jupiter 6 (Synchro Kiri)
];

// Posisi antre di taxiway / holding point sebelum giliran masuk runway
const QUEUE_SPOTS: { x: number; z: number; yaw: number }[] = [
  { x: -5.2, z: -10.8, yaw: Math.PI * 0.35 }, // J2 siap di holding point
  { x: -11.0, z: -10.5, yaw: Math.PI / 2 },   // J3
  { x: -17.0, z: -10.5, yaw: Math.PI / 2 },   // J4
  { x: -23.0, z: -10.5, yaw: Math.PI / 2 },   // J5
  { x: -29.0, z: -10.5, yaw: Math.PI / 2 },   // J6
];

/**
 * Menampilkan 5 pesawat pendamping Jupiter Aerobatic Team (Jupiter 2 s/d Jupiter 6)
 * saat simulasi Take Off KT-1B Wong Bee:
 * 1. Keluar dari hanggar satu per satu menuju Holding Point Runway 09 (J1 -> J2 -> J3 -> J4 -> J5 -> J6)
 * 2. Take Off secara bergantian SATU PER SATU (bukan bersamaan!) setelah J1 lepas landas
 * 3. Bergabung dalam formasi Arrowhead saat mengudara
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

      // Putar baling-baling KT-1B tiap pesawat
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
        const taxiStart = 2.2 + i * 2.1; // J2 mulai 2.2s, J3 4.3s, J4 6.4s, J5 8.5s, J6 10.6s
        const taxiEnd = taxiStart + 4.5;
        const queue = QUEUE_SPOTS[i];
        const spawnX = -35.0 - i * 3.8;
        const spawnZ = -10.5;

        // Jadwal take off berurutan SATU PER SATU setelah Jupiter 1 (J1 roll 18.5..22.0):
        const lineUpStart = 20.5 + i * 3.0; // J2: 20.5s, J3: 23.5s, J4: 26.5s, J5: 29.5s, J6: 32.5s
        const rollStart = lineUpStart + 1.4;
        const rotStart = rollStart + 1.8;
        const climbEnd = rotStart + 2.2;

        const formSlot = ARROWHEAD_SLOTS[i];

        if (pt < taxiStart) {
          // Masih menunggu giliran di dalam/depan hanggar
          tx = spawnX;
          ty = 0;
          tz = spawnZ;
          tyaw = Math.PI / 2;
          targetGear = 0;
        } else if (pt < taxiEnd) {
          // Taxi keluar satu per satu dari hanggar menyusuri taxiway menuju holding point
          const p = easeInOut((pt - taxiStart) / (taxiEnd - taxiStart));
          tx = THREE.MathUtils.lerp(spawnX, queue.x, p);
          tz = THREE.MathUtils.lerp(spawnZ, queue.z, p);
          ty = 0;
          tyaw = THREE.MathUtils.lerp(Math.PI / 2, queue.yaw, p);
          targetGear = 0;
        } else if (pt < lineUpStart) {
          // Menunggu giliran take off di holding point / antrean runway
          tx = queue.x;
          tz = queue.z;
          ty = 0;
          tyaw = queue.yaw;
          targetGear = 0;
        } else if (pt < rollStart) {
          // Masuk ke garis tengah Runway 09 (Line-Up)
          const p = easeInOut((pt - lineUpStart) / (rollStart - lineUpStart));
          tx = THREE.MathUtils.lerp(queue.x, 0, p);
          tz = THREE.MathUtils.lerp(queue.z, -8.5, p);
          ty = 0;
          tyaw = THREE.MathUtils.lerp(queue.yaw, 0, p);
          targetGear = 0;
        } else if (pt < rotStart) {
          // Akselerasi penuh di sepanjang aspal Runway
          const p = (pt - rollStart) / (rotStart - rollStart);
          tx = 0;
          tz = THREE.MathUtils.lerp(-8.5, 4.0, p * p);
          ty = 0;
          tp = -0.02 * p;
          tyaw = 0;
          targetGear = 0;
        } else if (pt < climbEnd) {
          // Rotate & Liftoff menanjak ke langit sambil menarik roda!
          const p = easeInOut((pt - rotStart) / (climbEnd - rotStart));
          tx = THREE.MathUtils.lerp(0, formSlot[0], p * p);
          tz = THREE.MathUtils.lerp(4.0, formSlot[2], p);
          ty = THREE.MathUtils.lerp(0, formSlot[1], p);
          tp = -0.25 * Math.sin(p * Math.PI);
          tr = (formSlot[0] > 0 ? -0.14 : formSlot[0] < 0 ? 0.14 : 0) * Math.sin(p * Math.PI);
          targetGear = p > 0.35 ? 1 : 0;
        } else {
          // Sudah di udara menunggu sisa formasi bergabung!
          tx = formSlot[0] + Math.sin(t * 0.9 + i) * 0.16;
          ty = formSlot[1] + Math.cos(t * 1.3 + i) * 0.12;
          tz = formSlot[2] + Math.sin(t * 0.7 + i) * 0.14;
          tp = -0.025;
          tr = Math.cos(t * 1.1 + i * 0.5) * 0.035;
          targetGear = 1;
        }
      } else {
        // Mode Airborne: terbang stabil dalam formasi 6-ship Arrowhead bersama Jupiter 1
        const formSlot = ARROWHEAD_SLOTS[i];
        tx = formSlot[0] + Math.sin(t * 0.9 + i) * 0.16;
        ty = formSlot[1] + Math.cos(t * 1.3 + i) * 0.12;
        tz = formSlot[2] + Math.sin(t * 0.7 + i) * 0.14;
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
