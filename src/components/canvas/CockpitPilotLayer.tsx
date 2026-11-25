import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useHangarStore, useSelectedUnit } from '../../store/useHangarStore';

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
      return [{ pos: [0, 1.74, 3.3], scale: 0.68, isFighter: true }];
    case 'su30mk2':
      return [
        { pos: [0, 1.84, 3.82], scale: 0.68, isFighter: true },
        { pos: [0, 1.98, 2.68], scale: 0.66, isFighter: true },
      ];
    case 'su27skm':
      return [{ pos: [0, 1.86, 3.6], scale: 0.68, isFighter: true }];
    case 'rafale':
      return [
        { pos: [0, 1.75, 3.62], scale: 0.66, isFighter: true },
        { pos: [0, 1.88, 2.55], scale: 0.64, isFighter: true },
      ];
    case 'hawk209':
      return [{ pos: [0, 1.72, 2.82], scale: 0.64, isFighter: true }];
    case 't50i':
      return [
        { pos: [0, 1.7, 3.34], scale: 0.64, isFighter: true },
        { pos: [0, 1.82, 2.38], scale: 0.62, isFighter: true },
      ];
    case 'supertucano':
      return [
        { pos: [0, 1.78, 2.64], scale: 0.64, isFighter: true },
        { pos: [0, 1.9, 1.58], scale: 0.62, isFighter: true },
      ];
    case 'kt1b':
      return [
        { pos: [0, 1.68, 2.6], scale: 0.62, isFighter: true },
        { pos: [0, 1.8, 1.58], scale: 0.6, isFighter: true },
      ];
    case 'a4skyhawk':
      return [{ pos: [0, 1.52, 2.42], scale: 0.62, isFighter: true }];
    case 'g120tp':
      return [
        { pos: [-0.24, 1.38, 1.15], scale: 0.58, isFighter: false },
        { pos: [0.24, 1.38, 1.15], scale: 0.58, isFighter: false },
      ];
    case 'c182':
    case 't41':
      return [
        { pos: [-0.22, 1.32, 1.05], scale: 0.56, isFighter: false },
        { pos: [0.22, 1.32, 1.05], scale: 0.56, isFighter: false },
      ];
    case 'sgs233':
    case 'dg1000':
      return [
        { pos: [0, 1.14, 2.02], scale: 0.56, isFighter: false },
        { pos: [0, 1.22, 1.15], scale: 0.55, isFighter: false },
      ];
    case 'caracal':
    case 'superpuma':
      return [
        { pos: [-0.36, 1.32, 2.55], scale: 0.64, isFighter: false },
        { pos: [0.36, 1.32, 2.55], scale: 0.64, isFighter: false },
      ];
    case 'aw101':
      return [
        { pos: [-0.38, 1.36, 2.75], scale: 0.66, isFighter: false },
        { pos: [0.38, 1.36, 2.75], scale: 0.66, isFighter: false },
      ];
    case 'colibri':
    case 'h145':
    case 'as365':
      return [
        { pos: [-0.28, 1.16, 1.95], scale: 0.6, isFighter: false },
        { pos: [0.28, 1.16, 1.95], scale: 0.6, isFighter: false },
      ];
    default:
      if (category === 'Tempur' || category === 'Latih') {
        return [{ pos: [0, 1.74, 2.88], scale: 0.65, isFighter: true }];
      }
      // Pesawat Angkut & VIP: kokpit kaca gelap / tertutup sehingga figur pilot tidak ditampilkan
      return [];
  }
}

/**
 * Figur Pilot TNI AU 3D realistis & proporsional di dalam kokpit:
 * - Duduk rebah alami di sandaran kursi lontar (ejection seat headrest)
 * - Flight suit hijau zaitun TNI AU + rompi taktis + harness bahu tipis rapi
 * - Helm penerbang tempur HGU-55/P / JHMCS aerodinamis (visor kaca gelap menghadap tepat ke depan +Z,
 *   ear-cup kiri-kanan, masker oksigen MBU-20/P & selang melengkung rapi).
 */
export function CockpitPilotLayer() {
  const unit = useSelectedUnit();
  const flightMode = useHangarStore((s) => s.flightMode);
  const safetyMode = useHangarStore((s) => s.safetyMode);
  const safetyStep = useHangarStore((s) => s.safetyStep);
  const aeroMode = useHangarStore((s) => s.aeroMode);
  const aeroManeuver = useHangarStore((s) => s.aeroManeuver);

  const headRefs = useRef<(THREE.Group | null)[]>([]);

  const isEquipment = unit.id === 'gsuit' || unit.id === 'pilot-helmet';
  const isEjectionCategory = unit.category === 'Tempur' || unit.category === 'Latih';
  const ejectedOut = safetyMode && isEjectionCategory && safetyStep >= 2;
  const seats = getPilotSeats(unit.id, unit.category);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const isSim = flightMode !== 'parked' || safetyMode || aeroMode;
    headRefs.current.forEach((head, idx) => {
      if (!head) return;
      if (!isSim) {
        head.rotation.y = Math.sin(t * 0.4 + idx) * 0.06;
        head.rotation.x = 0.04;
        return;
      }
      if (flightMode === 'maneuver' || (safetyMode && isEjectionCategory && safetyStep < 2)) {
        head.rotation.y = Math.sin(t * 1.25 + idx * 0.6) * 0.28;
        head.rotation.x = -0.04 + Math.cos(t * 1.0) * 0.05;
      } else if (aeroMode && aeroManeuver === 'turnLeft') {
        head.rotation.y = 0.26;
        head.rotation.x = -0.03;
      } else if (aeroMode && aeroManeuver === 'turnRight') {
        head.rotation.y = -0.26;
        head.rotation.x = -0.03;
      } else {
        head.rotation.y = Math.sin(t * 0.7 + idx) * 0.1;
        head.rotation.x = Math.sin(t * 0.5) * 0.03;
      }
    });
  });

  if (isEquipment || ejectedOut) return null;

  return (
    <group name="cockpit-pilots-3d">
      {seats.map((seat, idx) => {
        const s = seat.scale ?? 0.65;
        return (
          <group key={`${unit.id}-pilot-${idx}`} position={seat.pos} scale={[s, s, s]}>
            {/* Sandaran Kepala Kursi Lontar (Ejection Seat Headrest) di belakang pilot */}
            {seat.isFighter && (
              <group position={[0, 0.36, -0.22]} rotation={[-0.22, 0, 0]}>
                <mesh>
                  <boxGeometry args={[0.26, 0.42, 0.1]} />
                  <meshStandardMaterial color="#1f2937" roughness={0.78} metalness={0.22} />
                </mesh>
                {/* Bantalan headrest atas */}
                <mesh position={[0, 0.23, 0.02]}>
                  <boxGeometry args={[0.22, 0.14, 0.09]} />
                  <meshStandardMaterial color="#111827" roughness={0.85} />
                </mesh>
              </group>
            )}

            {/* Tubuh Pilot Duduk Rebah Alami (-12°) */}
            <group rotation={[-0.2, 0, 0]}>
              {/* Dada & Bahu (Flight Suit Hijau Zaitun TNI AU) */}
              <mesh position={[0, 0.18, 0]} scale={[1.15, 1.0, 0.78]}>
                <capsuleGeometry args={[0.145, 0.22, 10, 16]} />
                <meshStandardMaterial color="#44543c" roughness={0.82} metalness={0.05} />
              </mesh>

              {/* Rompi Taktis / Survival Vest gelap */}
              <mesh position={[0, 0.19, 0.015]} scale={[1.08, 0.9, 0.8]}>
                <capsuleGeometry args={[0.14, 0.16, 8, 14]} />
                <meshStandardMaterial color="#2f3a2c" roughness={0.85} metalness={0.08} />
              </mesh>

              {/* Sabuk Harness 4-Titik tipis & realistis */}
              {[-0.072, 0.072].map((hx, hi) => (
                <mesh key={hi} position={[hx, 0.22, 0.105]} rotation={[0.08, 0, hi === 0 ? 0.08 : -0.08]}>
                  <boxGeometry args={[0.032, 0.26, 0.018]} />
                  <meshStandardMaterial color="#64748b" roughness={0.6} metalness={0.2} />
                </mesh>
              ))}

              {/* Leher ramping */}
              <mesh position={[0, 0.37, 0.01]}>
                <cylinderGeometry args={[0.052, 0.062, 0.08, 12]} />
                <meshStandardMaterial color="#374333" roughness={0.85} />
              </mesh>

              {/* Bahu & Lengan Kiri-Kanan memegang Stick / Throttle */}
              {[-1, 1].map((side) => (
                <group key={side}>
                  {/* Sendi bahu halus */}
                  <mesh position={[side * 0.175, 0.26, 0.0]}>
                    <sphereGeometry args={[0.062, 10, 10]} />
                    <meshStandardMaterial color="#44543c" roughness={0.82} />
                  </mesh>
                  {/* Lengan atas & bawah */}
                  <mesh position={[side * 0.18, 0.14, 0.09]} rotation={[0.88, 0, side * -0.14]}>
                    <capsuleGeometry args={[0.048, 0.19, 8, 12]} />
                    <meshStandardMaterial color="#415039" roughness={0.82} />
                  </mesh>
                </group>
              ))}

              {/* Kepala + Helm Penerbang Tempur HGU-55/P / JHMCS Realistis */}
              <group
                ref={(el) => {
                  headRefs.current[idx] = el;
                }}
                position={[0, 0.49, 0.025]}
                rotation={[0.16, 0, 0]}
              >
                {/* Batok Helm Aerodinamis (sedikit lonjong depan-belakang, mulus tanpa tonjolan aneh) */}
                <mesh scale={[0.94, 1.0, 1.08]}>
                  <sphereGeometry args={[0.135, 22, 18]} />
                  <meshStandardMaterial
                    color={seat.isFighter ? '#2c3645' : '#cbd5e1'}
                    roughness={0.32}
                    metalness={0.38}
                  />
                </mesh>

                {/* Ear-cup komunikasi kiri & kanan yang menyatu rapi di sisi helm */}
                {[-1, 1].map((side) => (
                  <mesh
                    key={side}
                    position={[side * 0.118, -0.015, -0.01]}
                    rotation={[0, 0, Math.PI / 2]}
                    scale={[1.0, 0.55, 1.12]}
                  >
                    <cylinderGeometry args={[0.052, 0.056, 0.04, 14]} />
                    <meshStandardMaterial color={seat.isFighter ? '#1e293b' : '#94a3b8'} roughness={0.4} metalness={0.3} />
                  </mesh>
                ))}

                {/* Pelindung Atas Visor (Visor Brow Cover tipis & melengkung rapi di dahi) */}
                <mesh position={[0, 0.058, 0.032]} rotation={[-0.22, 0, 0]} scale={[0.98, 0.52, 1.06]}>
                  <sphereGeometry args={[0.132, 18, 10, Math.PI * 0.14, Math.PI * 0.72, 0.18, 0.48]} />
                  <meshStandardMaterial color="#18202c" roughness={0.38} metalness={0.45} />
                </mesh>

                {/* Visor Kaca Gelap Reflektif — MENGHADAP TEPAT KE DEPAN (+Z, phi terpusat di PI/2!) */}
                <mesh position={[0, 0.012, 0.016]} scale={[0.96, 1.0, 1.08]}>
                  <sphereGeometry args={[0.136, 20, 14, Math.PI * 0.18, Math.PI * 0.64, Math.PI * 0.34, Math.PI * 0.28]} />
                  <meshStandardMaterial
                    color="#090f1a"
                    roughness={0.08}
                    metalness={0.92}
                    emissive={seat.isFighter ? '#0c2340' : '#0b192c'}
                    emissiveIntensity={0.22}
                  />
                </mesh>

                {/* Masker Oksigen MBU-20/P (kecil, pas di dagu/hidung depan +Z) + Selang Oksigen ke Dada */}
                {seat.isFighter && (
                  <group position={[0, -0.055, 0.118]}>
                    {/* Cup masker silikon gelap */}
                    <mesh rotation={[0.35, 0, 0]} scale={[1.0, 0.85, 0.9]}>
                      <cylinderGeometry args={[0.044, 0.032, 0.068, 12]} />
                      <meshStandardMaterial color="#27313d" roughness={0.68} metalness={0.15} />
                    </mesh>
                    {/* Selang oksigen bergelombang turun rapi ke dada */}
                    <mesh position={[0, -0.085, 0.012]} rotation={[0.18, 0, 0]}>
                      <cylinderGeometry args={[0.016, 0.018, 0.14, 10]} />
                      <meshStandardMaterial color="#1f2937" roughness={0.78} />
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
