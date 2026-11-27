import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { flightSync, useHangarStore, useSelectedUnit } from '../../store/useHangarStore';

interface SeatSpec {
  pos: [number, number, number];
  scale?: number;
  isFighter?: boolean;
}

/**
 * Posisi & skala kursi pilot proporsional per jenis pesawat agar figur Pilot 3D duduk alami
 * (sedikit rebah di kursi lontar) dan seluruh helm berada rapi di dalam kaca kanopi kokpit.
 */
function getPilotSeats(unitId: string, category: string): SeatSpec[] {
  switch (unitId) {
    case 'f16id':
      return [{ pos: [0, 1.74, 3.3], scale: 0.66, isFighter: true }];
    case 'su30mk2':
      return [
        { pos: [0, 1.84, 3.82], scale: 0.66, isFighter: true },
        { pos: [0, 1.98, 2.68], scale: 0.64, isFighter: true },
      ];
    case 'su27skm':
      return [{ pos: [0, 1.86, 3.6], scale: 0.66, isFighter: true }];
    case 'rafale':
      return [
        { pos: [0, 1.75, 3.62], scale: 0.64, isFighter: true },
        { pos: [0, 1.88, 2.55], scale: 0.62, isFighter: true },
      ];
    case 'hawk209':
      return [{ pos: [0, 1.72, 2.82], scale: 0.62, isFighter: true }];
    case 't50i':
      return [
        { pos: [0, 1.7, 3.34], scale: 0.62, isFighter: true },
        { pos: [0, 1.82, 2.38], scale: 0.6, isFighter: true },
      ];
    case 'supertucano':
      return [
        { pos: [0, 1.78, 2.64], scale: 0.62, isFighter: true },
        { pos: [0, 1.9, 1.58], scale: 0.6, isFighter: true },
      ];
    case 'kt1b':
      return [
        { pos: [0, 1.68, 2.6], scale: 0.6, isFighter: true },
        { pos: [0, 1.8, 1.58], scale: 0.58, isFighter: true },
      ];
    case 'a4skyhawk':
      return [{ pos: [0, 1.52, 2.42], scale: 0.6, isFighter: true }];
    case 'g120tp':
      return [
        { pos: [-0.24, 1.38, 1.15], scale: 0.56, isFighter: false },
        { pos: [0.24, 1.38, 1.15], scale: 0.56, isFighter: false },
      ];
    case 'c182':
    case 't41':
      return [
        { pos: [-0.22, 1.32, 1.05], scale: 0.54, isFighter: false },
        { pos: [0.22, 1.32, 1.05], scale: 0.54, isFighter: false },
      ];
    case 'sgs233':
    case 'dg1000':
      return [
        { pos: [0, 1.14, 2.02], scale: 0.54, isFighter: false },
        { pos: [0, 1.22, 1.15], scale: 0.52, isFighter: false },
      ];
    case 'caracal':
    case 'superpuma':
      return [
        { pos: [-0.36, 1.32, 2.55], scale: 0.62, isFighter: false },
        { pos: [0.36, 1.32, 2.55], scale: 0.62, isFighter: false },
      ];
    case 'aw101':
      return [
        { pos: [-0.38, 1.36, 2.75], scale: 0.64, isFighter: false },
        { pos: [0.38, 1.36, 2.75], scale: 0.64, isFighter: false },
      ];
    case 'colibri':
    case 'h145':
    case 'as365':
      return [
        { pos: [-0.28, 1.16, 1.95], scale: 0.58, isFighter: false },
        { pos: [0.28, 1.16, 1.95], scale: 0.58, isFighter: false },
      ];
    default:
      if (category === 'Tempur' || category === 'Latih') {
        return [{ pos: [0, 1.74, 2.88], scale: 0.64, isFighter: true }];
      }
      return [];
  }
}

/**
 * Figur Pilot TNI AU 3D realistis & hidup dengan animasi penuh di dalam kokpit:
 * - Kepala menoleh halus mengikuti manuver & memantau radar/target
 * - Tangan kanan menggerakkan Stick Kendali HOTAS secara nyata, tangan kiri mendorong Throttle
 * - Napas & ayunan bahu halus mengikuti G-force
 * - Helm JHMCS / HGU-55/P mulus dengan visor gelap iridium menghadap tepat ke depan (+Z) & masker oksigen.
 */
export function CockpitPilotLayer() {
  const unit = useSelectedUnit();
  const flightMode = useHangarStore((s) => s.flightMode);
  const safetyMode = useHangarStore((s) => s.safetyMode);
  const safetyStep = useHangarStore((s) => s.safetyStep);
  const aeroMode = useHangarStore((s) => s.aeroMode);
  const aeroManeuver = useHangarStore((s) => s.aeroManeuver);

  const torsoRefs = useRef<(THREE.Group | null)[]>([]);
  const headRefs = useRef<(THREE.Group | null)[]>([]);
  const rightArmRefs = useRef<(THREE.Group | null)[]>([]);
  const leftArmRefs = useRef<(THREE.Group | null)[]>([]);
  const stickRefs = useRef<(THREE.Group | null)[]>([]);

  const isEquipment = unit.id === 'gsuit' || unit.id === 'pilot-helmet';
  const isEjectionCategory = unit.category === 'Tempur' || unit.category === 'Latih';
  const ejectedOut = safetyMode && isEjectionCategory && safetyStep >= 2;
  const seats = getPilotSeats(unit.id, unit.category);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const isSim = flightMode !== 'parked' || safetyMode || aeroMode;
    const smooth = Math.min(1, dt * 4.5);

    seats.forEach((_, idx) => {
      const torso = torsoRefs.current[idx];
      const head = headRefs.current[idx];
      const rArm = rightArmRefs.current[idx];
      const lArm = leftArmRefs.current[idx];
      const stick = stickRefs.current[idx];

      // Target gerakan kepala, bahu, tangan kanan (stick), & tangan kiri (throttle)
      let headY = Math.sin(t * 0.45 + idx) * 0.07;
      let headX = 0.03 + Math.sin(t * 0.8) * 0.02;
      let headZ = 0;
      let stickPitch = 0;
      let stickRoll = 0;
      let throttlePush = 0;
      let torsoLeanZ = 0;
      let pilotSalute = 0;

      if (isSim) {
        if (flightMode === 'salute') {
          const cyc = flightSync.phaseTime % 22.0;
          // Pilot menoleh ke kanan-depan melihat Crew Chief di apron, membalas hormat di babak 3 (11..16s), lalu mendorong throttle!
          if (cyc < 10.6) {
            headY = 0.28;
            headX = 0.06;
          } else if (cyc < 16.0) {
            headY = 0.34;
            // Anggukan mantap setelah membalas hormat (14.4..15.6s)
            headX = cyc > 14.4 && cyc < 15.6 ? 0.16 : 0.05;
            const up = Math.max(0, Math.min(1, (cyc - 11.0) / 0.55));
            const down = 1 - Math.max(0, Math.min(1, (cyc - 15.2) / 0.55));
            pilotSalute = up * down;
          } else {
            headY = 0.05;
            headX = -0.02;
            throttlePush = Math.min(1, (cyc - 16.2) / 1.5) * 0.24;
          }
        } else if (flightMode === 'takeoff') {
          headY = Math.sin(t * 0.65) * 0.08;
          headX = -0.05;
          stickPitch = -0.14;
          throttlePush = 0.22; // Tangan kiri mendorong throttle full power!
        } else if (flightMode === 'maneuver' || (safetyMode && isEjectionCategory && safetyStep < 2)) {
          headY = Math.sin(t * 0.95 + idx * 0.5) * 0.34;
          headX = -0.06 + Math.cos(t * 0.8) * 0.06;
          headZ = Math.sin(t * 0.95) * 0.07;
          stickRoll = Math.sin(t * 1.1) * 0.22;
          stickPitch = Math.cos(t * 0.85) * 0.16;
          throttlePush = 0.18 + Math.sin(t * 1.4) * 0.06;
          torsoLeanZ = Math.sin(t * 0.95) * 0.045;
        } else if (aeroMode) {
          if (aeroManeuver === 'turnLeft') {
            headY = 0.32;
            stickRoll = 0.24;
            torsoLeanZ = 0.05;
          } else if (aeroManeuver === 'turnRight') {
            headY = -0.32;
            stickRoll = -0.24;
            torsoLeanZ = -0.05;
          } else if (aeroManeuver === 'climb') {
            headX = -0.1;
            stickPitch = -0.22;
          } else if (aeroManeuver === 'descend') {
            headX = 0.1;
            stickPitch = 0.18;
          } else {
            headY = Math.sin(t * 0.7) * 0.12;
            stickPitch = Math.sin(t * 0.9) * 0.1;
          }
          throttlePush = 0.14;
        } else {
          // Airborne / Landing / AAR / Mission
          headY = Math.sin(t * 0.6 + idx) * 0.12;
          headX = Math.sin(t * 0.45) * 0.04;
          stickRoll = Math.sin(t * 0.75) * 0.08;
          stickPitch = Math.cos(t * 0.65) * 0.06;
          throttlePush = flightMode === 'landing' ? -0.08 : 0.12;
        }
      }

      if (torso) {
        torso.rotation.z = THREE.MathUtils.lerp(torso.rotation.z, torsoLeanZ, smooth);
        torso.position.y = Math.sin(t * 1.8 + idx) * 0.005; // Gerak napas halus
      }
      if (head) {
        head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, headY, smooth);
        head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, 0.15 + headX, smooth);
        head.rotation.z = THREE.MathUtils.lerp(head.rotation.z, headZ, smooth);
      }
      if (rArm) {
        const targetRArmX = pilotSalute > 0.01 ? THREE.MathUtils.lerp(0.85, -1.78, pilotSalute) : 0.85 + stickPitch * 0.55;
        const targetRArmZ = pilotSalute > 0.01 ? THREE.MathUtils.lerp(-0.14, -0.34, pilotSalute) : -0.14 + stickRoll * 0.4;
        rArm.rotation.x = THREE.MathUtils.lerp(rArm.rotation.x, targetRArmX, smooth);
        rArm.rotation.z = THREE.MathUtils.lerp(rArm.rotation.z, targetRArmZ, smooth);
      }
      if (lArm) {
        lArm.rotation.x = THREE.MathUtils.lerp(lArm.rotation.x, 0.82 + throttlePush, smooth);
      }
      if (stick) {
        stick.rotation.x = THREE.MathUtils.lerp(stick.rotation.x, stickPitch, smooth);
        stick.rotation.z = THREE.MathUtils.lerp(stick.rotation.z, stickRoll, smooth);
      }
    });
  });

  if (isEquipment || ejectedOut) return null;

  return (
    <group name="cockpit-pilots-3d">
      {seats.map((seat, idx) => {
        const s = seat.scale ?? 0.64;
        return (
          <group key={`${unit.id}-pilot-${idx}`} position={seat.pos} scale={[s, s, s]}>
            {/* Sandaran Kursi Lontar (Ejection Seat Headrest) */}
            {seat.isFighter && (
              <group position={[0, 0.35, -0.22]} rotation={[-0.22, 0, 0]}>
                <mesh>
                  <boxGeometry args={[0.24, 0.42, 0.09]} />
                  <meshStandardMaterial color="#1f2937" roughness={0.8} metalness={0.2} />
                </mesh>
                <mesh position={[0, 0.22, 0.02]}>
                  <boxGeometry args={[0.2, 0.13, 0.08]} />
                  <meshStandardMaterial color="#111827" roughness={0.88} />
                </mesh>
              </group>
            )}

            {/* Tuas Kendali HOTAS di depan tangan kanan pilot */}
            {seat.isFighter && (
              <group
                ref={(el) => {
                  stickRefs.current[idx] = el;
                }}
                position={[0.14, 0.02, 0.22]}
              >
                <mesh position={[0, 0.08, 0]}>
                  <cylinderGeometry args={[0.014, 0.018, 0.16, 8]} />
                  <meshStandardMaterial color="#111827" roughness={0.5} metalness={0.5} />
                </mesh>
              </group>
            )}

            {/* Tubuh Pilot Duduk Rebah Alami (-12°) dengan animasi napas & G-force */}
            <group
              ref={(el) => {
                torsoRefs.current[idx] = el;
              }}
              rotation={[-0.2, 0, 0]}
            >
              {/* Dada & Bahu (Flight Suit Hijau Zaitun TNI AU) */}
              <mesh position={[0, 0.18, 0]} scale={[1.14, 1.0, 0.76]}>
                <capsuleGeometry args={[0.14, 0.22, 12, 18]} />
                <meshStandardMaterial color="#43533b" roughness={0.82} metalness={0.05} />
              </mesh>

              {/* Rompi Taktis / Survival Vest gelap */}
              <mesh position={[0, 0.19, 0.014]} scale={[1.07, 0.88, 0.78]}>
                <capsuleGeometry args={[0.136, 0.15, 10, 16]} />
                <meshStandardMaterial color="#2c3729" roughness={0.86} metalness={0.08} />
              </mesh>

              {/* Sabuk Harness Bahu ramping */}
              {[-0.07, 0.07].map((hx, hi) => (
                <mesh key={hi} position={[hx, 0.21, 0.102]} rotation={[0.08, 0, hi === 0 ? 0.07 : -0.07]}>
                  <boxGeometry args={[0.028, 0.25, 0.015]} />
                  <meshStandardMaterial color="#475569" roughness={0.65} metalness={0.2} />
                </mesh>
              ))}

              {/* Leher & Kerah Flight Suit */}
              <mesh position={[0, 0.365, 0.01]}>
                <cylinderGeometry args={[0.05, 0.06, 0.08, 14]} />
                <meshStandardMaterial color="#364232" roughness={0.85} />
              </mesh>

              {/* Lengan Kiri (Throttle — beranimasi mendorong tuas gas) */}
              <group position={[-0.17, 0.25, 0.0]}>
                <mesh>
                  <sphereGeometry args={[0.058, 12, 12]} />
                  <meshStandardMaterial color="#43533b" roughness={0.82} />
                </mesh>
                <group
                  ref={(el) => {
                    leftArmRefs.current[idx] = el;
                  }}
                  rotation={[0.82, 0, 0.12]}
                >
                  <mesh position={[0, -0.11, 0]}>
                    <capsuleGeometry args={[0.045, 0.17, 8, 12]} />
                    <meshStandardMaterial color="#3f4e38" roughness={0.82} />
                  </mesh>
                  {/* Sarung tangan penerbang Nomex */}
                  <mesh position={[0, -0.22, 0]}>
                    <sphereGeometry args={[0.036, 10, 10]} />
                    <meshStandardMaterial color="#1f2937" roughness={0.8} />
                  </mesh>
                </group>
              </group>

              {/* Lengan Kanan (HOTAS Stick — beranimasi mengendalikan manuver) */}
              <group position={[0.17, 0.25, 0.0]}>
                <mesh>
                  <sphereGeometry args={[0.058, 12, 12]} />
                  <meshStandardMaterial color="#43533b" roughness={0.82} />
                </mesh>
                <group
                  ref={(el) => {
                    rightArmRefs.current[idx] = el;
                  }}
                  rotation={[0.85, 0, -0.14]}
                >
                  <mesh position={[0, -0.11, 0]}>
                    <capsuleGeometry args={[0.045, 0.17, 8, 12]} />
                    <meshStandardMaterial color="#3f4e38" roughness={0.82} />
                  </mesh>
                  {/* Sarung tangan penerbang Nomex */}
                  <mesh position={[0, -0.22, 0]}>
                    <sphereGeometry args={[0.036, 10, 10]} />
                    <meshStandardMaterial color="#1f2937" roughness={0.8} />
                  </mesh>
                </group>
              </group>

              {/* Kepala + Helm Penerbang Tempur JHMCS / HGU-55/P Rapi & Aerodinamis */}
              <group
                ref={(el) => {
                  headRefs.current[idx] = el;
                }}
                position={[0, 0.485, 0.024]}
                rotation={[0.15, 0, 0]}
              >
                {/* Batok Helm Halus & Proporsional */}
                <mesh scale={[0.93, 0.98, 1.06]}>
                  <sphereGeometry args={[0.13, 24, 20]} />
                  <meshStandardMaterial
                    color={seat.isFighter ? '#25303f' : '#cbd5e1'}
                    roughness={0.28}
                    metalness={0.42}
                  />
                </mesh>

                {/* Ear-cup komunikasi kiri & kanan mulus */}
                {[-1, 1].map((side) => (
                  <mesh
                    key={side}
                    position={[side * 0.114, -0.014, -0.008]}
                    rotation={[0, 0, Math.PI / 2]}
                    scale={[1.0, 0.48, 1.08]}
                  >
                    <cylinderGeometry args={[0.048, 0.052, 0.036, 16]} />
                    <meshStandardMaterial color={seat.isFighter ? '#1b2432' : '#94a3b8'} roughness={0.36} metalness={0.35} />
                  </mesh>
                ))}

                {/* Visor Kaca Gelap Iridium Reflektif — TEPAT di depan (+Z) */}
                <mesh position={[0, 0.01, 0.014]} scale={[0.95, 0.99, 1.07]}>
                  <sphereGeometry args={[0.131, 22, 16, Math.PI * 0.2, Math.PI * 0.6, Math.PI * 0.34, Math.PI * 0.27]} />
                  <meshStandardMaterial
                    color="#09101c"
                    roughness={0.06}
                    metalness={0.95}
                    emissive={seat.isFighter ? '#1e3a5f' : '#0f172a'}
                    emissiveIntensity={0.28}
                  />
                </mesh>

                {/* Masker Oksigen MBU-20/P kompak & rapi di dagu depan (+Z) + Selang */}
                {seat.isFighter && (
                  <group position={[0, -0.052, 0.112]}>
                    <mesh rotation={[0.32, 0, 0]} scale={[1.0, 0.82, 0.88]}>
                      <cylinderGeometry args={[0.04, 0.028, 0.062, 14]} />
                      <meshStandardMaterial color="#1f2937" roughness={0.65} metalness={0.18} />
                    </mesh>
                    <mesh position={[0, -0.08, 0.01]} rotation={[0.18, 0, 0]}>
                      <cylinderGeometry args={[0.014, 0.016, 0.13, 10]} />
                      <meshStandardMaterial color="#18202c" roughness={0.78} />
                    </mesh>
                  </group>
                )}
              </group>
            </group>
          </group>
        );
      })}
    </group>
  );
}
