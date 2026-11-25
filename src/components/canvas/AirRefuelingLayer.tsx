import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useHangarStore, useSelectedUnit } from '../../store/useHangarStore';
import { buildDetailedC130J } from '../../utils/herculesKt1Builder';

/**
 * Simulasi 3D Air-to-Air Refueling (AAR / Pengisian Bahan Bakar di Udara) TNI AU:
 * - Pesawat Tanker KC-130B Hercules (Skadron Udara 32) terbang di depan-atas dengan 4 baling-baling berputar
 * - Pod Refueling + Selang Fleksibel + Corong Drogue Basket menjulur ke belakang
 * - Pesawat penerima mendekat -> Probe masuk ke Drogue Basket (CONTACT!) -> Transfer Avtur/JP-8 menyala -> Break Away!
 */
export function AirRefuelingLayer() {
  const unit = useSelectedUnit();
  const flightMode = useHangarStore((s) => s.flightMode);
  const flightNonce = useHangarStore((s) => s.flightNonce);
  const setFlightLabel = useHangarStore((s) => s.setFlightLabel);
  const setAarProgress = useHangarStore((s) => s.setAarProgress);

  const tankerRef = useRef<THREE.Group>(null);
  const basketRef = useRef<THREE.Group>(null);
  const fuelDotsRef = useRef<(THREE.Mesh | null)[]>([]);
  const contactRingRef = useRef<THREE.Mesh>(null);
  const timer = useRef(0);

  const isActive = flightMode === 'aar' && unit.id !== 'gsuit' && unit.id !== 'pilot-helmet';

  // Bangun model 3D KC-130B Hercules (Skadron Udara 32) sekali saja saat mode AAR dibuka
  const tankerData = useMemo(() => {
    if (!isActive) return null;
    const built = buildDetailedC130J('camo');
    const gear = built.group.getObjectByName('landing-gear');
    if (gear) gear.visible = false;
    return built;
  }, [isActive]);

  // Kurva selang fleksibel dari pod belakang/sayap KC-130B (z = +13.0, y = +5.0) ke Drogue Basket (z = +5.6, y = +2.65)
  const hoseCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.0, 5.15, 13.8),
        new THREE.Vector3(0.0, 4.15, 11.2),
        new THREE.Vector3(0.0, 3.18, 8.4),
        new THREE.Vector3(0.0, 2.72, 5.65),
      ]),
    [],
  );

  const hoseGeo = useMemo(() => new THREE.TubeGeometry(hoseCurve, 40, 0.08, 10, false), [hoseCurve]);

  useEffect(() => {
    timer.current = 0;
    if (isActive) {
      setAarProgress(35, 0);
    }
  }, [isActive, flightNonce, unit.id, setAarProgress]);

  useFrame((state, delta) => {
    if (!isActive) return;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    timer.current += dt;
    const st = timer.current;

    // Putar 4 baling-baling KC-130B Hercules Tanker
    if (tankerData) {
      for (const sp of tankerData.spinners) {
        sp.obj.rotation[sp.axis] += sp.speed * dt * 1.1;
      }
    }

    // Gerakan halus KC-130B Tanker di udara (stabil terbang jelajah)
    if (tankerRef.current) {
      tankerRef.current.position.y = 4.65 + Math.sin(t * 1.1) * 0.12;
      tankerRef.current.rotation.z = Math.sin(t * 0.7) * 0.015;
    }

    // Animasi Drogue Basket sedikit bergoyang di aliran udara sebelum terkunci
    if (basketRef.current) {
      const locked = st >= 5.2 && st < 14.5;
      basketRef.current.position.x = locked ? 0 : Math.sin(t * 3.2) * 0.14;
      basketRef.current.position.y = 2.72 + (locked ? 0 : Math.cos(t * 2.6) * 0.08);
    }

    // 4 Tahap Air-to-Air Refueling
    if (st < 4.0) {
      setAarProgress(35, 0);
      setFlightLabel('AAR • TAHAP 1: PENDEKATAN KE TANKER KC-130B HERCULES (SKADRON 32)');
    } else if (st < 5.8) {
      setAarProgress(35, 1);
      setFlightLabel('AAR • TAHAP 2: PROBE MENYATU DENGAN DROGUE BASKET (CONTACT LOCKED!)');
    } else if (st < 14.5) {
      const p = Math.min(1, (st - 5.8) / 8.7);
      const pct = Math.round(35 + p * 65);
      setAarProgress(pct, 2);
      setFlightLabel(`AAR • TAHAP 3: TRANSFER BAHAN BAKAR AVTUR AKTIF (${pct}%)`);
    } else {
      setAarProgress(100, 3);
      setFlightLabel('AAR • TAHAP 4: PENGISIAN 100% SELESAI — DISCONNECT & BREAK AWAY!');
    }

    // Animasi partikel aliran bahan bakar hijau-biru menyala sepanjang selang saat Transfer aktif!
    const flowing = st >= 5.6 && st < 14.5;
    fuelDotsRef.current.forEach((dot, i) => {
      if (!dot) return;
      dot.visible = flowing;
      if (flowing) {
        const u = (t * 0.95 + i / 8) % 1;
        const pt = hoseCurve.getPoint(u);
        dot.position.copy(pt);
        dot.scale.setScalar(0.9 + Math.sin(t * 10 + i) * 0.25);
      }
    });

    if (contactRingRef.current) {
      contactRingRef.current.visible = st >= 5.2 && st < 14.5;
      const mat = contactRingRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.55 + Math.sin(t * 8) * 0.35;
    }
  });

  if (!isActive || !tankerData) return null;

  return (
    <group name="air-to-air-refueling-3d">
      {/* 1. Pesawat Tanker KC-130B Hercules (Skadron Udara 32) di depan-atas */}
      <group ref={tankerRef} position={[0, 4.65, 18.8]} scale={[1.15, 1.15, 1.15]}>
        <primitive object={tankerData.group} />
        {/* Pod Refueling Hose Drum Unit di belakang-bawah */}
        <mesh position={[0, 0.45, -4.4]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.26, 0.3, 1.6, 16]} />
          <meshStandardMaterial color="#334155" roughness={0.45} metalness={0.5} />
        </mesh>
        <Html position={[0, 4.2, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <span className="whitespace-nowrap rounded-md border border-[#ffb703] bg-[#081933]/90 px-2 py-0.5 font-display text-[10px] font-bold tracking-wider text-[#ffb703] uppercase shadow">
            TANKER KC-130B HERCULES • SKADRON UDARA 32
          </span>
        </Html>
      </group>

      {/* 2. Selang Fleksibel Refueling + Corong Drogue Basket */}
      <mesh geometry={hoseGeo}>
        <meshStandardMaterial color="#1e293b" roughness={0.55} metalness={0.25} />
      </mesh>

      <group ref={basketRef} position={[0, 2.72, 5.65]}>
        {/* Keranjang parasut Drogue Basket (putih-oranye) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.62, 1.05, 18, 1, true]} />
          <meshStandardMaterial color="#f97316" roughness={0.45} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0, -0.45]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.6, 0.045, 10, 24]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.4} />
        </mesh>
        {/* Cincin indikator hijau menyala saat Probe terkunci (CONTACT!) */}
        <mesh ref={contactRingRef} position={[0, 0, -0.5]} visible={false}>
          <torusGeometry args={[0.76, 0.05, 10, 24]} />
          <meshBasicMaterial color="#10b981" transparent opacity={0.85} />
        </mesh>
        <Html position={[1.4, 0.55, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <span className="whitespace-nowrap rounded border border-emerald-400/80 bg-[#081933]/90 px-1.5 py-0.5 font-display text-[9px] font-bold tracking-wider text-emerald-300 uppercase shadow">
            DROGUE BASKET
          </span>
        </Html>
      </group>

      {/* 3. Partikel Aliran Bahan Bakar Avtur / JP-8 Menyala sepanjang selang */}
      {Array.from({ length: 8 }, (_, i) => (
        <mesh
          key={`fuel-${i}`}
          ref={(el) => {
            fuelDotsRef.current[i] = el;
          }}
          visible={false}
        >
          <sphereGeometry args={[0.14, 12, 12]} />
          <meshBasicMaterial color="#34d399" />
        </mesh>
      ))}
    </group>
  );
}
