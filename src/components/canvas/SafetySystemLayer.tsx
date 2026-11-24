import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useHangarStore, useSelectedUnit } from '../../store/useHangarStore';

/**
 * Simulasi 3D Sistem Keselamatan (Safety Systems) spesifik per kategori pesawat:
 * 1. Tempur & Latih -> Animasi 3D Kursi Lontar Zero-Zero (Roket + Api + Parasut Oranye-Putih Mengembang)
 * 2. Helikopter (Caracal & Colibri) -> Animasi 3D 4 Kantung Pelampung Darurat Laut (Emergency Floats) + Permukaan Laut
 * 3. Angkut & VIP (C-130J & B737) -> Animasi 3D Perosotan Evakuasi & Rakit Pelampung Darurat
 */
export function SafetySystemLayer() {
  const unit = useSelectedUnit();
  const safetyMode = useHangarStore((s) => s.safetyMode);
  const setFlightLabel = useHangarStore((s) => s.setFlightLabel);

  const timer = useRef(0);
  const seatGroupRef = useRef<THREE.Group>(null);
  const flameRef = useRef<THREE.Mesh>(null);
  const chuteRef = useRef<THREE.Group>(null);
  const floatsRef = useRef<THREE.Group>(null);
  const seaRef = useRef<THREE.Mesh>(null);
  const raftRef = useRef<THREE.Group>(null);

  const isEquipment = unit.id === 'gsuit' || unit.id === 'pilot-helmet';
  const isEjection = unit.category === 'Tempur' || unit.category === 'Latih';
  const isHeli = unit.category === 'Helikopter';
  const isTransport = unit.category === 'Angkut & VIP';

  useEffect(() => {
    timer.current = 0;
    if (!safetyMode) {
      setFlightLabel(null);
    }
  }, [safetyMode, unit.id, setFlightLabel]);

  useFrame((state, delta) => {
    if (!safetyMode || isEquipment) return;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    timer.current += dt;
    const st = timer.current;

    if (isEjection && seatGroupRef.current && chuteRef.current) {
      // Siklus animasi Kursi Lontar Zero-Zero (0..8s lalu melayang stabil)
      if (st < 0.7) {
        seatGroupRef.current.position.set(0, 2.25, 2.9);
        seatGroupRef.current.rotation.set(0, 0, 0);
        chuteRef.current.scale.setScalar(0.01);
        chuteRef.current.visible = false;
        if (flameRef.current) flameRef.current.visible = false;
        setFlightLabel('SAFETY • 1. KANOPI TERLEPAS OTOMATIS (CANOPY JETTISON)');
      } else if (st < 2.2) {
        const p = (st - 0.7) / 1.5;
        const ease = 1 - Math.pow(1 - p, 2);
        seatGroupRef.current.position.set(0, 2.25 + ease * 5.8, 2.9 - ease * 1.1);
        seatGroupRef.current.rotation.x = -0.18 * (1 - p);
        if (flameRef.current) {
          flameRef.current.visible = true;
          flameRef.current.scale.set(1, 0.8 + Math.sin(t * 50) * 0.28, 1);
        }
        chuteRef.current.visible = false;
        setFlightLabel('SAFETY • 2. ROKET KURSI LONTAR ZERO-ZERO MELUNCUR!');
      } else {
        const p = Math.min(1, (st - 2.2) / 1.4);
        const sway = Math.sin(t * 1.6) * 0.14;
        const bob = Math.sin(t * 1.2) * 0.18;
        seatGroupRef.current.position.set(Math.sin(t * 1.1) * 0.35, 7.6 + bob, 1.8);
        seatGroupRef.current.rotation.set(0, 0, sway);
        if (flameRef.current) flameRef.current.visible = false;
        chuteRef.current.visible = true;
        const s = THREE.MathUtils.lerp(0.05, 1.0, p);
        chuteRef.current.scale.set(s, s, s);
        setFlightLabel('SAFETY • 3. PARASUT UTAMA MENGEMBANG — PILOT AMAN');
      }
    } else if (isHeli && floatsRef.current) {
      // Animasi mengembang 4 kantung pelampung laut CO2 + permukaan laut
      const inflate = Math.min(1, st / 1.35);
      const ease = 1 - Math.pow(1 - inflate, 3);
      floatsRef.current.scale.set(0.2 + 0.8 * ease, 0.15 + 0.85 * ease, 0.25 + 0.75 * ease);
      if (seaRef.current) {
        seaRef.current.position.y = 0.28 + Math.sin(t * 1.8) * 0.05;
      }
      if (st < 1.4) {
        setFlightLabel('SAFETY LAUT • TABUNG CO2 MEMOMPA 4 PELAMPUNG DARURAT');
      } else {
        setFlightLabel('SAFETY LAUT • PELAMPUNG AKTIF — HELIKOPTER MENGAPUNG AMAN DI LAUT');
      }
    } else if (isTransport && raftRef.current) {
      // Animasi perosotan & rakit pelampung darurat mengembang
      const inflate = Math.min(1, st / 1.4);
      const ease = 1 - Math.pow(1 - inflate, 3);
      raftRef.current.scale.set(0.15 + 0.85 * ease, 0.15 + 0.85 * ease, 0.15 + 0.85 * ease);
      if (st < 1.5) {
        setFlightLabel('SAFETY • MENGEMBANGKAN PEROSOTAN & RAKIT PELAMPUNG DARURAT');
      } else {
        setFlightLabel('SAFETY • EVAKUASI DARURAT & RAKIT PELAMPUNG SIAP DIGUNAKAN');
      }
    }
  });

  if (!safetyMode || isEquipment) return null;

  return (
    <group name="safety-system-3d">
      {/* =====================================================================
          1. KURSI LONTAR 3D + ROKET + PARASUT UTAMA (PESAWAT TEMPUR & LATIH)
         ===================================================================== */}
      {isEjection && (
        <group ref={seatGroupRef} position={[0, 2.25, 2.9]}>
          {/* Struktur Kursi Lontar (ACES II / K-36DM / Martin-Baker) */}
          <mesh position={[0, 0.45, 0]}>
            <boxGeometry args={[0.62, 1.15, 0.22]} />
            <meshStandardMaterial color="#27303c" roughness={0.6} metalness={0.45} />
          </mesh>
          <mesh position={[0, -0.05, 0.26]}>
            <boxGeometry args={[0.62, 0.18, 0.56]} />
            <meshStandardMaterial color="#1e2630" roughness={0.7} metalness={0.3} />
          </mesh>
          {/* Headrest & kotak parasut atas */}
          <mesh position={[0, 1.12, 0.04]}>
            <boxGeometry args={[0.46, 0.34, 0.28]} />
            <meshStandardMaterial color="#3b4554" roughness={0.5} metalness={0.4} />
          </mesh>
          {/* Tuas tarik kuning-hitam & figur pilot berkostum G-Suit */}
          <mesh position={[0, 0.65, 0.22]}>
            <capsuleGeometry args={[0.24, 0.42, 8, 14]} />
            <meshStandardMaterial color="#4b5d47" roughness={0.8} />
          </mesh>
          <mesh position={[0, 1.12, 0.24]}>
            <sphereGeometry args={[0.21, 16, 14]} />
            <meshStandardMaterial color="#aeb8c2" roughness={0.3} metalness={0.4} />
          </mesh>

          {/* Semburan Api Roket Kursi Lontar */}
          <mesh ref={flameRef} position={[0, -0.85, 0]} rotation={[Math.PI, 0, 0]} visible={false}>
            <coneGeometry args={[0.38, 1.85, 16]} />
            <meshBasicMaterial color="#ff7b00" transparent opacity={0.9} />
          </mesh>

          {/* Parasut Utama 3D Oranye-Putih */}
          <group ref={chuteRef} position={[0, 1.35, 0]} visible={false}>
            {/* Kubah parasut */}
            <mesh position={[0, 2.85, 0]}>
              <sphereGeometry args={[2.45, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
              <meshStandardMaterial color="#f97316" roughness={0.65} side={THREE.DoubleSide} />
            </mesh>
            {/* Strip putih kontras pada parasut */}
            <mesh position={[0, 2.86, 0]}>
              <sphereGeometry args={[2.47, 28, 12, 0, Math.PI * 2, Math.PI * 0.22, Math.PI * 0.14]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.65} side={THREE.DoubleSide} />
            </mesh>
            {/* 8 Tali suspensi parasut */}
            {Array.from({ length: 8 }, (_, i) => {
              const a = (i / 8) * Math.PI * 2;
              const topX = Math.cos(a) * 2.25;
              const topZ = Math.sin(a) * 2.25;
              const len = Math.hypot(topX, 2.85, topZ);
              const dir = new THREE.Vector3(topX, 2.85, topZ).normalize();
              const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
              return (
                <mesh key={i} position={[topX / 2, 2.85 / 2, topZ / 2]} quaternion={quat}>
                  <cylinderGeometry args={[0.015, 0.015, len, 6]} />
                  <meshBasicMaterial color="#e2e8f0" />
                </mesh>
              );
            })}
            <Html position={[0, 5.55, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
              <span className="whitespace-nowrap rounded-md border border-[#ffb703] bg-[#0a1e3c]/90 px-2 py-0.5 font-display text-[10px] font-bold tracking-wider text-[#ffb703] uppercase shadow">
                KURSI LONTAR ZERO-ZERO • PARASUT AKTIF
              </span>
            </Html>
          </group>
        </group>
      )}

      {/* =====================================================================
          2. PELAMPUNG DARURAT LAUT (EMERGENCY FLOATS) UNTUK HELIKOPTER
         ===================================================================== */}
      {isHeli && (
        <>
          <group ref={floatsRef}>
            {/* 4 Kantung Pelampung Kuning-Oranye Cerah (Kiri/Kanan Depan & Belakang) */}
            {(unit.id === 'colibri'
              ? [
                  { pos: [1.28, 0.28, 1.85] as [number, number, number], len: 1.55, r: 0.34 },
                  { pos: [-1.28, 0.28, 1.85] as [number, number, number], len: 1.55, r: 0.34 },
                  { pos: [1.28, 0.28, -0.05] as [number, number, number], len: 1.45, r: 0.34 },
                  { pos: [-1.28, 0.28, -0.05] as [number, number, number], len: 1.45, r: 0.34 },
                ]
              : [
                  { pos: [1.45, 0.65, 2.45] as [number, number, number], len: 1.85, r: 0.44 },
                  { pos: [-1.45, 0.65, 2.45] as [number, number, number], len: 1.85, r: 0.44 },
                  { pos: [1.68, 0.65, -0.45] as [number, number, number], len: 2.35, r: 0.48 },
                  { pos: [-1.68, 0.65, -0.45] as [number, number, number], len: 2.35, r: 0.48 },
                ]
            ).map((f, idx) => (
              <group key={idx} position={f.pos}>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <capsuleGeometry args={[f.r, f.len, 12, 24]} />
                  <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={0.22} roughness={0.38} />
                </mesh>
                {/* Sabuk pengikat hitam pelampung */}
                {[-f.len * 0.28, f.len * 0.28].map((dz, j) => (
                  <mesh key={j} position={[0, 0, dz]}>
                    <torusGeometry args={[f.r + 0.015, 0.032, 8, 24]} />
                    <meshStandardMaterial color="#1e293b" roughness={0.7} />
                  </mesh>
                ))}
              </group>
            ))}
            <Html position={[1.95, 1.45, 1.1]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
              <span className="whitespace-nowrap rounded-md border border-amber-400 bg-[#0a1e3c]/92 px-2 py-0.5 font-display text-[10px] font-bold tracking-wider text-amber-300 uppercase shadow">
                PELAMPUNG DARURAT LAUT (CO2 FLOATS)
              </span>
            </Html>
          </group>

          {/* Permukaan Air Laut Transparan Berkilau di bawah helikopter */}
          <mesh ref={seaRef} position={[0, 0.28, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[9.5, 64]} />
            <meshPhysicalMaterial
              color="#0284c7"
              emissive="#0369a1"
              emissiveIntensity={0.35}
              transparent
              opacity={0.52}
              roughness={0.14}
              metalness={0.2}
              depthWrite={false}
            />
          </mesh>
        </>
      )}

      {/* =====================================================================
          3. RAKIT PELAMPUNG & PEROSOTAN EVAKUASI DARURAT (ANGKUT & VIP)
         ===================================================================== */}
      {isTransport && (
        <group ref={raftRef}>
          {/* Perosotan & Rakit Pelampung Darurat di sisi kiri & kanan pintu kabin */}
          {[1, -1].map((s) => (
            <group key={s} position={[s * 2.45, 0.65, 3.35]} rotation={[0, 0, s * -0.45]}>
              <mesh>
                <boxGeometry args={[2.8, 0.24, 1.15]} />
                <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={0.22} roughness={0.45} />
              </mesh>
              <mesh position={[s * 1.45, -0.35, 0]} rotation={[0, 0, s * 0.45]}>
                <torusGeometry args={[0.95, 0.22, 12, 24]} />
                <meshStandardMaterial color="#f97316" roughness={0.42} />
              </mesh>
            </group>
          ))}
          <Html position={[3.2, 1.85, 3.35]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
            <span className="whitespace-nowrap rounded-md border border-amber-400 bg-[#0a1e3c]/92 px-2 py-0.5 font-display text-[10px] font-bold tracking-wider text-amber-300 uppercase shadow">
              EVACUATION SLIDE & LIFE RAFT
            </span>
          </Html>
        </group>
      )}
    </group>
  );
}
