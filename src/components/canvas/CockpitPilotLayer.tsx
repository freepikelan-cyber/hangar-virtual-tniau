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
 * Posisi kursi pilot akurat per jenis pesawat agar figur Pilot 3D duduk tepat di dalam kanopi kokpit
 * dan terlihat jelas terutama saat simulasi penerbangan, manuver, aerodinamika, & safety.
 */
function getPilotSeats(unitId: string, category: string): SeatSpec[] {
  switch (unitId) {
    case 'f16id':
      return [{ pos: [0, 1.9, 3.32], scale: 0.96, isFighter: true }];
    case 'su30mk2':
      return [
        { pos: [0, 2.02, 3.85], scale: 0.98, isFighter: true },
        { pos: [0, 2.15, 2.68], scale: 0.96, isFighter: true },
      ];
    case 'su27skm':
      return [{ pos: [0, 2.04, 3.62], scale: 0.98, isFighter: true }];
    case 'rafale':
      return [
        { pos: [0, 1.92, 3.65], scale: 0.94, isFighter: true },
        { pos: [0, 2.04, 2.55], scale: 0.92, isFighter: true },
      ];
    case 'hawk209':
      return [{ pos: [0, 1.88, 2.84], scale: 0.92, isFighter: true }];
    case 't50i':
      return [
        { pos: [0, 1.86, 3.36], scale: 0.92, isFighter: true },
        { pos: [0, 1.98, 2.38], scale: 0.9, isFighter: true },
      ];
    case 'supertucano':
      return [
        { pos: [0, 1.96, 2.66], scale: 0.9, isFighter: true },
        { pos: [0, 2.08, 1.58], scale: 0.88, isFighter: true },
      ];
    case 'kt1b':
      return [
        { pos: [0, 1.84, 2.62], scale: 0.88, isFighter: true },
        { pos: [0, 1.96, 1.58], scale: 0.86, isFighter: true },
      ];
    case 'a4skyhawk':
      return [{ pos: [0, 1.66, 2.45], scale: 0.88, isFighter: true }];
    case 'g120tp':
      return [
        { pos: [-0.24, 1.48, 1.15], scale: 0.8, isFighter: false },
        { pos: [0.24, 1.48, 1.15], scale: 0.8, isFighter: false },
      ];
    case 'c182':
    case 't41':
      return [
        { pos: [-0.22, 1.42, 1.05], scale: 0.78, isFighter: false },
        { pos: [0.22, 1.42, 1.05], scale: 0.78, isFighter: false },
      ];
    case 'sgs233':
    case 'dg1000':
      return [
        { pos: [0, 1.24, 2.05], scale: 0.78, isFighter: false },
        { pos: [0, 1.32, 1.15], scale: 0.76, isFighter: false },
      ];
    case 'caracal':
    case 'superpuma':
      return [
        { pos: [-0.36, 1.42, 2.55], scale: 0.88, isFighter: false },
        { pos: [0.36, 1.42, 2.55], scale: 0.88, isFighter: false },
      ];
    case 'aw101':
      return [
        { pos: [-0.38, 1.46, 2.75], scale: 0.9, isFighter: false },
        { pos: [0.38, 1.46, 2.75], scale: 0.9, isFighter: false },
      ];
    case 'colibri':
    case 'h145':
    case 'as365':
      return [
        { pos: [-0.28, 1.24, 1.95], scale: 0.82, isFighter: false },
        { pos: [0.28, 1.24, 1.95], scale: 0.82, isFighter: false },
      ];
    default:
      if (category === 'Tempur' || category === 'Latih') {
        return [{ pos: [0, 1.9, 2.9], scale: 0.92, isFighter: true }];
      }
      // Pesawat Angkut & VIP (kokpit kaca depan)
      return [
        { pos: [-0.36, 1.56, 4.95], scale: 0.78, isFighter: false },
        { pos: [0.36, 1.56, 4.95], scale: 0.78, isFighter: false },
      ];
  }
}

/**
 * Figur Pilot TNI AU 3D di dalam kokpit (seragam terbang hijau zaitun, harness, helm penerbangan
 * dengan visor gelap mengkilap & masker oksigen). Terlihat jelas saat simulasi terbang & manuver,
 * dan otomatis hilang dari kokpit tepat saat kursi lontar ditembakkan di simulasi Safety!
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
  // Saat simulasi Safety pesawat tempur masuk tahap Ejection Seat (step >= 2), pilot sudah keluar dari kokpit!
  const ejectedOut = safetyMode && isEjectionCategory && safetyStep >= 2;
  const seats = getPilotSeats(unit.id, unit.category);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const isSim = flightMode !== 'parked' || safetyMode || aeroMode;
    headRefs.current.forEach((head, idx) => {
      if (!head) return;
      if (!isSim) {
        head.rotation.y = Math.sin(t * 0.45 + idx) * 0.08;
        head.rotation.x = 0.02;
        return;
      }
      if (flightMode === 'maneuver' || (safetyMode && isEjectionCategory && safetyStep < 2)) {
        // Pilot aktif menoleh mengikuti arah manuver tempur
        head.rotation.y = Math.sin(t * 1.4 + idx * 0.6) * 0.34;
        head.rotation.x = -0.06 + Math.cos(t * 1.1) * 0.06;
      } else if (aeroMode && aeroManeuver === 'turnLeft') {
        head.rotation.y = 0.32;
        head.rotation.x = -0.04;
      } else if (aeroMode && aeroManeuver === 'turnRight') {
        head.rotation.y = -0.32;
        head.rotation.x = -0.04;
      } else {
        head.rotation.y = Math.sin(t * 0.8 + idx) * 0.14;
        head.rotation.x = Math.sin(t * 0.6) * 0.04;
      }
    });
  });

  if (isEquipment || ejectedOut) return null;

  return (
    <group name="cockpit-pilots-3d">
      {seats.map((seat, idx) => {
        const s = seat.scale ?? 0.92;
        return (
          <group key={`${unit.id}-pilot-${idx}`} position={seat.pos} scale={[s, s, s]}>
            {/* Bahu & Badan Pilot (Flight Suit Hijau Zaitun TNI AU) */}
            <mesh position={[0, 0.22, -0.02]}>
              <capsuleGeometry args={[0.17, 0.24, 8, 14]} />
              <meshStandardMaterial color="#4a5d43" roughness={0.78} metalness={0.08} />
            </mesh>
            {/* Sabuk Harness Keselamatan (kuning-abu kontras agar terlihat jelas dari luar kanopi) */}
            {[-0.085, 0.085].map((hx, hi) => (
              <mesh key={hi} position={[hx, 0.24, 0.085]} rotation={[0.12, 0, hi === 0 ? 0.08 : -0.08]}>
                <boxGeometry args={[0.045, 0.3, 0.04]} />
                <meshStandardMaterial color="#eab308" roughness={0.55} />
              </mesh>
            ))}
            {/* Lengan kiri & kanan memegang throttle / stick kendali */}
            {[-1, 1].map((side) => (
              <mesh
                key={side}
                position={[side * 0.18, 0.16, 0.12]}
                rotation={[0.95, 0, side * -0.18]}
              >
                <capsuleGeometry args={[0.055, 0.2, 6, 10]} />
                <meshStandardMaterial color="#465740" roughness={0.8} />
              </mesh>
            ))}

            {/* Kepala + Helm Penerbang Tempur TNI AU + Visor Gelap + Masker Oksigen */}
            <group
              ref={(el) => {
                headRefs.current[idx] = el;
              }}
              position={[0, 0.52, 0.02]}
            >
              {/* Batok Helm Penerbang (Putih/Abu Taktis agar kontras & jelas di balik kanopi) */}
              <mesh>
                <sphereGeometry args={[0.155, 18, 16]} />
                <meshStandardMaterial
                  color={seat.isFighter ? '#e2e8f0' : '#cbd5e1'}
                  roughness={0.28}
                  metalness={0.35}
                />
              </mesh>
              {/* Strip aksen TNI AU di atas helm */}
              <mesh position={[0, 0.08, -0.01]}>
                <boxGeometry args={[0.05, 0.16, 0.24]} />
                <meshStandardMaterial color="#1d4ed8" roughness={0.35} metalness={0.3} />
              </mesh>
              {/* Visor Gelap Reflektif */}
              <mesh position={[0, 0.015, 0.055]} rotation={[0.08, 0, 0]}>
                <sphereGeometry args={[0.135, 16, 12, -Math.PI * 0.38, Math.PI * 0.76, Math.PI * 0.26, Math.PI * 0.36]} />
                <meshStandardMaterial color="#0f172a" roughness={0.1} metalness={0.92} />
              </mesh>
              {/* Masker Oksigen MBU-20/P & Selang */}
              <mesh position={[0, -0.065, 0.135]} rotation={[0.32, 0, 0]}>
                <coneGeometry args={[0.062, 0.11, 10]} />
                <meshStandardMaterial color="#334155" roughness={0.65} />
              </mesh>
            </group>
          </group>
        );
      })}
    </group>
  );
}
