import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useHangarStore } from '../../store/useHangarStore';
import { buildDetailedF16 } from '../../utils/f16Builder';
import { aircraftAudio } from '../../utils/aircraftAudio';

/**
 * Pengawalan Udara Pesawat Kepresidenan VVIP (Boeing 737 VIP & Falcon 8X — Skadron Udara 17):
 * - 2 Pesawat Tempur F-16 Fighting Falcon TNI AU meluncur masuk mengawal di sayap kiri & kanan
 *   dengan jarak aman yang lega (x = ±14.8, z = -4.2) agar tidak terlalu menempel.
 * - Memutar ucapan radio kokpit Bahasa Indonesia:
 *   "Selamat pagi Bapak Presiden, perjalanan Anda kami kawal. Salam Swa Bhuwana Paksa."
 */
export function VvipEscortLayer() {
  const selectedId = useHangarStore((s) => s.selectedId);
  const flightMode = useHangarStore((s) => s.flightMode);
  const soundEnabled = useHangarStore((s) => s.soundEnabled);
  const setFlightLabel = useHangarStore((s) => s.setFlightLabel);

  const rightRef = useRef<THREE.Group>(null);
  const leftRef = useRef<THREE.Group>(null);
  const timer = useRef(0);
  const greetingPlayed = useRef(false);

  const isVvip = selectedId === 'b737vip' || selectedId === 'falcon8x';
  const isActive = isVvip && (flightMode === 'airborne' || flightMode === 'maneuver');

  const escorts = useMemo(() => {
    if (!isVvip) return null;
    const f16Base = buildDetailedF16();
    const gear = f16Base.group.getObjectByName('landing-gear');
    if (gear) gear.visible = false;
    const right = f16Base.group;
    const left = f16Base.group.clone(true);
    return { right, left };
  }, [isVvip]);

  useEffect(() => {
    if (!isActive) {
      timer.current = 0;
      greetingPlayed.current = false;
    }
  }, [isActive, selectedId]);

  useFrame((state, delta) => {
    if (!isActive) return;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    timer.current += dt;
    const st = timer.current;

    // Transisi masuk mulus dari kejauhan menuju formasi pengawalan lega (x = ±14.8, tidak terlalu nempel!)
    const entry = Math.min(1, st / 3.2);
    const ease = entry * entry * (3 - 2 * entry);

    const targetX = THREE.MathUtils.lerp(34.0, 14.8, ease);
    const targetZ = THREE.MathUtils.lerp(-24.0, -4.2, ease);
    const targetY = 0.65;

    if (rightRef.current) {
      rightRef.current.position.set(
        targetX + Math.sin(t * 0.9) * 0.25,
        targetY + Math.sin(t * 1.4) * 0.16,
        targetZ + Math.cos(t * 0.8) * 0.2,
      );
      rightRef.current.rotation.z = (1 - ease) * 0.32 + Math.sin(t * 1.1) * 0.03;
      rightRef.current.rotation.x = -0.02 + Math.sin(t * 1.2) * 0.015;
    }

    if (leftRef.current) {
      leftRef.current.position.set(
        -targetX + Math.cos(t * 0.85) * 0.25,
        targetY + Math.cos(t * 1.35) * 0.16,
        targetZ + Math.sin(t * 0.75) * 0.2,
      );
      leftRef.current.rotation.z = -(1 - ease) * 0.32 + Math.cos(t * 1.05) * 0.03;
      leftRef.current.rotation.x = -0.02 + Math.cos(t * 1.15) * 0.015;
    }

    // Putar ucapan radio kokpit pengawal tempur Bahasa Indonesia saat formasi mulai sejajar
    if (st >= 1.4 && !greetingPlayed.current) {
      greetingPlayed.current = true;
      aircraftAudio.playVvipEscortRadio(soundEnabled);
    }

    if (st >= 1.2 && st < 9.8) {
      setFlightLabel(
        '📡 PENGAWAL TEMPUR: "SELAMAT PAGI BAPAK PRESIDEN, PERJALANAN ANDA KAMI KAWAL. SALAM SWA BHUWANA PAKSA!"',
      );
    } else if (st >= 9.8 && flightMode === 'airborne') {
      setFlightLabel('PENGAWALAN VVIP AKTIF • 2 F-16 TNI AU MENGAWAL PESAWAT KEPRESIDENAN');
    }
  });

  if (!isActive || !escorts) return null;

  return (
    <group name="vvip-fighter-escort-3d">
      {/* Pengawal 1: F-16 Fighting Falcon di sisi kanan */}
      <group ref={rightRef} position={[34, 0.65, -24]} scale={[0.92, 0.92, 0.92]}>
        <primitive object={escorts.right} />
        <mesh position={[0, 1.45, -7.2]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.32, 2.2, 12]} />
          <meshBasicMaterial color="#fb923c" transparent opacity={0.75} />
        </mesh>
        <Html position={[0, 3.6, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <span className="whitespace-nowrap rounded border border-[#ffb703]/80 bg-[#081933]/88 px-2 py-0.5 font-display text-[9px] font-bold tracking-wider text-[#ffb703] uppercase shadow">
            PENGAWAL 1 • F-16 TNI AU
          </span>
        </Html>
      </group>

      {/* Pengawal 2: F-16 Fighting Falcon di sisi kiri */}
      <group ref={leftRef} position={[-34, 0.65, -24]} scale={[0.92, 0.92, 0.92]}>
        <primitive object={escorts.left} />
        <mesh position={[0, 1.45, -7.2]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.32, 2.2, 12]} />
          <meshBasicMaterial color="#fb923c" transparent opacity={0.75} />
        </mesh>
        <Html position={[0, 3.6, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <span className="whitespace-nowrap rounded border border-[#ffb703]/80 bg-[#081933]/88 px-2 py-0.5 font-display text-[9px] font-bold tracking-wider text-[#ffb703] uppercase shadow">
            PENGAWAL 2 • F-16 TNI AU
          </span>
        </Html>
      </group>
    </group>
  );
}
