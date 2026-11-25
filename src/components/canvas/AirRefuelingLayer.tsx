import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useHangarStore, useSelectedUnit } from '../../store/useHangarStore';
import { buildDetailedC130J } from '../../utils/herculesKt1Builder';

/**
 * Simulasi 3D Air-to-Air Refueling (AAR / Pengisian Bahan Bakar di Udara) TNI AU:
 * - Pesawat Tanker KC-130B Hercules (Skadron Udara 32) dilengkapi 2 Pod Refueling Mk.32B di bawah sayap luar kiri & kanan
 * - Selang fleksibel keluar dari ujung belakang Pod Sayap Kanan (x=0, y=6.61, z=17.82) menuju puncak corong Drogue Basket (z=6.12)
 * - Mulut terbuka corong Drogue Basket menghadap ke belakang (-Z) menyambut hidung/probe pesawat penerima hingga CONTACT LOCKED!
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

  // Kurva selang fleksibel keluar TEPAT dari nozzle belakang Pod Sayap Kanan KC-130B (0, 6.61, 17.82)
  // menuju puncak kerucut Drogue Basket (0, 2.78, 6.12)!
  const hoseCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.0, 6.61, 17.82),
        new THREE.Vector3(0.0, 5.15, 13.8),
        new THREE.Vector3(0.0, 3.45, 9.5),
        new THREE.Vector3(0.0, 2.78, 6.12),
      ]),
    [],
  );

  const hoseGeo = useMemo(() => new THREE.TubeGeometry(hoseCurve, 40, 0.075, 10, false), [hoseCurve]);

  useEffect(() => {
    return () => {
      hoseGeo.dispose();
    };
  }, [hoseGeo]);

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

    // Gerakan halus KC-130B Tanker di udara (stabil terbang jelajah, posisi x=-5.75 agar Pod Sayap Kanan tepat di x=0!)
    if (tankerRef.current) {
      tankerRef.current.position.y = 4.45 + Math.sin(t * 1.1) * 0.08;
      tankerRef.current.rotation.z = Math.sin(t * 0.7) * 0.012;
    }

    // Animasi Drogue Basket sedikit bergoyang di aliran udara sebelum terkunci oleh Probe
    if (basketRef.current) {
      const locked = st >= 5.2 && st < 14.5;
      basketRef.current.position.x = locked ? 0 : Math.sin(t * 3.0) * 0.12;
      basketRef.current.position.y = 2.78 + (locked ? 0 : Math.cos(t * 2.4) * 0.07);
    }

    // 4 Tahap Air-to-Air Refueling
    if (st < 4.0) {
      setAarProgress(35, 0);
      setFlightLabel('AAR // TAHAP 1: PENDEKATAN KE POD SAYAP TANKER KC-130B (SKADRON 32)');
    } else if (st < 5.8) {
      setAarProgress(35, 1);
      setFlightLabel('AAR // TAHAP 2: PROBE MASUK KE DROGUE BASKET — CONTACT LOCKED');
    } else if (st < 14.5) {
      const p = Math.min(1, (st - 5.8) / 8.7);
      const pct = Math.round(35 + p * 65);
      setAarProgress(pct, 2);
      setFlightLabel(`AAR // TAHAP 3: TRANSFER BAHAN BAKAR AVTUR AKTIF (${pct}%)`);
    } else {
      setAarProgress(100, 3);
      setFlightLabel('AAR // TAHAP 4: PENGISIAN 100% SELESAI — DISCONNECT & BREAK AWAY');
    }

    // Animasi partikel aliran bahan bakar hijau-biru menyala sepanjang selang saat Transfer aktif
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
      {/* 1. Pesawat Tanker KC-130B Hercules (Skadron Udara 32) — bergeser ke x=-5.75 agar Pod Sayap Kanan sejajar x=0! */}
      <group ref={tankerRef} position={[-5.75, 4.45, 18.8]} scale={[1.15, 1.15, 1.15]}>
        <primitive object={tankerData.group} />

        {/* 2 Pod Refueling Mk.32B Hose-Drum Unit autentik di bawah sayap luar Kiri & Kanan */}
        {[-5.0, 5.0].map((px, idx) => (
          <group key={idx} position={[px, 1.88, 0.25]}>
            {/* Pylon penyangga pod yang menyambung kokoh ke bagian bawah sayap */}
            <mesh position={[0, 0.28, 0.05]}>
              <boxGeometry args={[0.12, 0.42, 1.15]} />
              <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.45} />
            </mesh>
            {/* Badan silinder Pod Mk.32B */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.24, 0.26, 2.0, 16]} />
              <meshStandardMaterial color="#334155" roughness={0.45} metalness={0.55} />
            </mesh>
            {/* Kerucut hidung depan pod */}
            <mesh position={[0, 0, 1.18]} rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.24, 0.42, 14]} />
              <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.6} />
            </mesh>
            {/* Corong keluar selang belakang pod */}
            <mesh position={[0, 0, -1.08]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.14, 0.22, 0.28, 14]} />
              <meshStandardMaterial color="#64748b" roughness={0.4} metalness={0.7} />
            </mesh>
          </group>
        ))}

        <Html position={[0, 4.2, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <span className="whitespace-nowrap rounded-md border border-[#ffb703] bg-[#081933]/90 px-2 py-0.5 font-display text-[10px] font-bold tracking-wider text-[#ffb703] uppercase shadow">
            TANKER KC-130B HERCULES • SKADRON UDARA 32
          </span>
        </Html>
      </group>

      {/* 2. Selang Fleksibel Refueling tersambung dari Pod Sayap Kanan ke puncak Drogue Basket */}
      <mesh geometry={hoseGeo}>
        <meshStandardMaterial color="#1e293b" roughness={0.55} metalness={0.25} />
      </mesh>

      {/* 3. Corong Drogue Basket: puncak sempit (+Z = +0.52) tersambung ke selang, mulut lebar (-Z = -0.52) menghadap pesawat penerima! */}
      <group ref={basketRef} position={[0, 2.78, 5.6]}>
        {/* Kopling baja penghubung selang ke puncak basket */}
        <mesh position={[0, 0, 0.52]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.13, 0.16, 0.28, 14]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.85} />
        </mesh>
        {/* Corong parasut Drogue Basket (puncak di +Z, mulut terbuka lebar menghadap -Z ke arah probe!) */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.62, 1.05, 18, 1, true]} />
          <meshStandardMaterial color="#f97316" roughness={0.45} side={THREE.DoubleSide} />
        </mesh>
        {/* Cincin penstabil putih melingkari mulut terbuka corong di sisi belakang (-Z = -0.52) */}
        <mesh position={[0, 0, -0.52]}>
          <torusGeometry args={[0.62, 0.048, 10, 24]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.4} />
        </mesh>
        {/* Cincin indikator hijau menyala saat Probe terkunci di dalam corong (CONTACT!) */}
        <mesh ref={contactRingRef} position={[0, 0, -0.54]} visible={false}>
          <torusGeometry args={[0.76, 0.05, 10, 24]} />
          <meshBasicMaterial color="#10b981" transparent opacity={0.85} />
        </mesh>
        <Html position={[1.4, 0.55, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <span className="whitespace-nowrap rounded border border-emerald-400/80 bg-[#081933]/90 px-1.5 py-0.5 font-display text-[9px] font-bold tracking-wider text-emerald-300 uppercase shadow">
            DROGUE BASKET
          </span>
        </Html>
      </group>

      {/* 4. Partikel Aliran Bahan Bakar Avtur / JP-8 Menyala sepanjang selang */}
      {Array.from({ length: 8 }, (_, i) => (
        <mesh
          key={`fuel-${i}`}
          ref={(el) => {
            fuelDotsRef.current[i] = el;
          }}
          visible={false}
        >
          <sphereGeometry args={[0.13, 12, 12]} />
          <meshBasicMaterial color="#34d399" />
        </mesh>
      ))}
    </group>
  );
}
