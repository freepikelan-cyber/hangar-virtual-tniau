import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useHangarStore } from '../../store/useHangarStore';
import { buildDetailedF16 } from '../../utils/f16Builder';
import { aircraftAudio } from '../../utils/aircraftAudio';

/**
 * Pengawalan Udara Pesawat Kepresidenan VVIP (Boeing 737 VIP & Falcon 8X — Skadron Udara 17):
 * 1. Jeda awal (0..6 dtk): Pesawat VVIP terbang jelajah sendiri dulu sebelum pengawal muncul.
 * 2. Intersep & Formasi (6..10,5 dtk): 2 Pesawat Tempur F-16 TNI AU meluncur masuk di sayap kiri & kanan (jarak lega ±14,8).
 * 3. Ucapan Radio Kokpit (10,5..27,5 dtk): Rekaman asli Letkol Pnb Muhammad Jaki Dirgantara ("Salam Swa Bhuwana Paksa").
 * 4. Aksi Manuver Bomb Burst (27,5 dtk+): Setelah ucapan selesai, Pengawal 1 melakukan manuver Bomb Burst
 *    (full afterburner menanjak tajam + gulingan + asap putih melesat tinggi ke kanan atas) sementara Pengawal 2 tetap mengawal!
 */
export function VvipEscortLayer() {
  const selectedId = useHangarStore((s) => s.selectedId);
  const flightMode = useHangarStore((s) => s.flightMode);
  const soundEnabled = useHangarStore((s) => s.soundEnabled);
  const setFlightLabel = useHangarStore((s) => s.setFlightLabel);

  const rightRef = useRef<THREE.Group>(null);
  const leftRef = useRef<THREE.Group>(null);
  const rightSmokeRef = useRef<THREE.Mesh>(null);
  const rightFlameRef = useRef<THREE.Mesh>(null);
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

    const ESCORT_APPEAR = 6.0; // Jeda dulu saat pesawat VVIP baru mengudara!
    const GREET_START = 10.5;  // Ucapan kokpit dimulai setelah kedua F-16 sejajar rapi
    const BOMB_BURST_START = 27.6; // Aksi manuver Bomb Burst tepat setelah ucapan selesai!

    // Fase 1: Jeda — Pesawat VVIP terbang sendiri dulu sebelum 2 pengawal muncul
    if (st < ESCORT_APPEAR) {
      if (rightRef.current) rightRef.current.visible = false;
      if (leftRef.current) leftRef.current.visible = false;
      if (flightMode === 'airborne') {
        setFlightLabel(
          st > 4.2
            ? '📡 RADAR: 2 PESAWAT TEMPUR PENGAWAL F-16 TNI AU MENDEKAT...'
            : 'TERBANG JELAJAH VVIP • PESAWAT KEPRESIDENAN RI',
        );
      }
      return;
    }

    if (rightRef.current) rightRef.current.visible = true;
    if (leftRef.current) leftRef.current.visible = true;

    // Fase 2: Kedua F-16 meluncur masuk dari belakang-samping ke posisi pengawalan lega (x = ±14.8)
    const entry = Math.min(1, (st - ESCORT_APPEAR) / 4.0);
    const ease = entry * entry * (3 - 2 * entry);

    const baseX = THREE.MathUtils.lerp(42.0, 14.8, ease);
    const baseZ = THREE.MathUtils.lerp(-36.0, -4.2, ease);
    const baseY = 0.65;

    // Pengawal 2 (Kiri) tetap mengawal stabil di sayap kiri Pesawat Kepresidenan
    if (leftRef.current) {
      leftRef.current.position.set(
        -baseX + Math.cos(t * 0.85) * 0.22,
        baseY + Math.cos(t * 1.35) * 0.14,
        baseZ + Math.sin(t * 0.75) * 0.18,
      );
      leftRef.current.rotation.z = -(1 - ease) * 0.34 + Math.cos(t * 1.05) * 0.025;
      leftRef.current.rotation.x = -0.02 + Math.cos(t * 1.15) * 0.015;
      leftRef.current.rotation.y = 0;
    }

    // Pengawal 1 (Kanan): Mengawal rapi -> lalu saat st >= BOMB_BURST_START melakukan aksi BOMB BURST!
    if (rightRef.current) {
      if (st < BOMB_BURST_START) {
        rightRef.current.position.set(
          baseX + Math.sin(t * 0.9) * 0.22,
          baseY + Math.sin(t * 1.4) * 0.14,
          baseZ + Math.cos(t * 0.8) * 0.18,
        );
        rightRef.current.rotation.z = (1 - ease) * 0.34 + Math.sin(t * 1.1) * 0.025;
        rightRef.current.rotation.x = -0.02 + Math.sin(t * 1.2) * 0.015;
        rightRef.current.rotation.y = 0;
        if (rightSmokeRef.current) rightSmokeRef.current.visible = false;
        if (rightFlameRef.current) rightFlameRef.current.scale.set(1, 1, 1);
      } else {
        // AKSI MANUVER BOMB BURST: Full afterburner menanjak tajam + gulingan 360° + asap putih melesat tinggi!
        const bp = Math.min(1, (st - BOMB_BURST_START) / 5.5);
        const bEase = bp * bp * (3 - 2 * bp);
        rightRef.current.position.set(
          THREE.MathUtils.lerp(14.8, 46.0, bEase),
          THREE.MathUtils.lerp(0.65, 25.5, bEase * bEase),
          THREE.MathUtils.lerp(-4.2, 16.0, bEase),
        );
        rightRef.current.rotation.x = -0.68 * Math.sin(Math.min(1, bp * 1.3) * (Math.PI / 2));
        rightRef.current.rotation.z = -bp * Math.PI * 2.25;
        rightRef.current.rotation.y = -0.38 * bEase;
        rightRef.current.visible = bp < 0.96;

        if (rightSmokeRef.current) rightSmokeRef.current.visible = true;
        if (rightFlameRef.current) {
          rightFlameRef.current.scale.set(1.45, 2.2 + Math.sin(t * 40) * 0.35, 1.45);
        }
      }
    }

    // Fase 3: Putar rekaman suara asli Letkol Pnb Muhammad Jaki Dirgantara
    if (st >= GREET_START && !greetingPlayed.current) {
      greetingPlayed.current = true;
      aircraftAudio.playVvipEscortRadio(soundEnabled);
    }

    if (st >= GREET_START && st < BOMB_BURST_START) {
      setFlightLabel(
        '📡 LETKOL PNB MUHAMMAD JAKI DIRGANTARA: "SELAMAT PAGI, YANG KAMI HORMATI BAPAK PRESIDEN REPUBLIK INDONESIA... SALAM SWA BHUWANA PAKSA!"',
      );
    } else if (st >= BOMB_BURST_START && st < BOMB_BURST_START + 6.0) {
      setFlightLabel('🔥 PENGAWAL 1 (F-16) MELAKUKAN AKSI MANUVER BOMB BURST HORMAT KEPRESIDENAN!');
    } else if (st >= BOMB_BURST_START + 6.0 && flightMode === 'airborne') {
      setFlightLabel('PENGAWALAN VVIP AKTIF • PESAWAT KEPRESIDENAN RI');
    }
  });

  if (!isActive || !escorts) return null;

  return (
    <group name="vvip-fighter-escort-3d">
      {/* Pengawal 1: F-16 Fighting Falcon di sisi kanan (melakukan Bomb Burst setelah ucapan!) */}
      <group ref={rightRef} position={[42, 0.65, -36]} scale={[0.92, 0.92, 0.92]} visible={false}>
        <primitive object={escorts.right} />
        <mesh ref={rightFlameRef} position={[0, 1.45, -7.2]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.32, 2.2, 12]} />
          <meshBasicMaterial color="#fb923c" transparent opacity={0.82} />
        </mesh>
        {/* Jejak asap putih tebal saat aksi manuver Bomb Burst */}
        <mesh ref={rightSmokeRef} position={[0, 1.45, -14.5]} rotation={[Math.PI / 2, 0, 0]} visible={false}>
          <coneGeometry args={[0.72, 16.5, 12, 1, true]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.48} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        <Html position={[0, 3.6, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <span className="whitespace-nowrap rounded border border-[#ffb703]/80 bg-[#081933]/88 px-2 py-0.5 font-display text-[9px] font-bold tracking-wider text-[#ffb703] uppercase shadow">
            PENGAWAL 1 • F-16 TNI AU
          </span>
        </Html>
      </group>

      {/* Pengawal 2: F-16 Fighting Falcon di sisi kiri */}
      <group ref={leftRef} position={[-42, 0.65, -36]} scale={[0.92, 0.92, 0.92]} visible={false}>
        <primitive object={escorts.left} />
        <mesh position={[0, 1.45, -7.2]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.32, 2.2, 12]} />
          <meshBasicMaterial color="#fb923c" transparent opacity={0.78} />
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
