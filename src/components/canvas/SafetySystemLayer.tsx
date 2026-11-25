import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useHangarStore, useSelectedUnit } from '../../store/useHangarStore';

/**
 * Simulasi 3D Sistem Keselamatan (Safety Systems) berbasis cerita dramatis & realistis per kategori:
 * 1. Tempur & Latih -> Patroli Manuver -> Tertembak Rudal (Ledakan & Api) -> Canopy Jettison & Ejection Seat -> Parasut Mengembang
 * 2. Angkut & VIP -> Gangguan Mesin di Laut -> Water Ditching (Cipratan Air) -> Perosotan & Perahu Karet -> Kru Jaket Pelampung & Suar SAR
 * 3. Helikopter -> Kegagalan Turbin & Autorotasi -> 4 Pelampung Darurat CO2 Mengembang -> Mengapung di Ombak -> Perahu Karet & Suar SAR
 */
export function SafetySystemLayer() {
  const unit = useSelectedUnit();
  const safetyMode = useHangarStore((s) => s.safetyMode);
  const safetyNonce = useHangarStore((s) => s.safetyNonce);
  const setFlightLabel = useHangarStore((s) => s.setFlightLabel);
  const setSafetyStep = useHangarStore((s) => s.setSafetyStep);

  const timer = useRef(0);

  // Refs khusus Pesawat Tempur / Latih (Ejection Seat Story)
  const missileRef = useRef<THREE.Group>(null);
  const explosionRef = useRef<THREE.Group>(null);
  const canopyFlyRef = useRef<THREE.Group>(null);
  const seatGroupRef = useRef<THREE.Group>(null);
  const seatFrameRef = useRef<THREE.Group>(null);
  const flameRef = useRef<THREE.Mesh>(null);
  const chuteRef = useRef<THREE.Group>(null);
  const sarBeaconRef = useRef<THREE.Mesh>(null);

  // Refs khusus Pesawat Angkut & VIP (Water Ditching Story)
  const transportSmokeRef = useRef<THREE.Group>(null);
  const splashRef = useRef<THREE.Group>(null);
  const raftRef = useRef<THREE.Group>(null);
  const crewRef = useRef<THREE.Group>(null);
  const flareRef = useRef<THREE.Group>(null);

  // Refs khusus Helikopter (Sea Emergency Floats Story)
  const heliSmokeRef = useRef<THREE.Group>(null);
  const floatsRef = useRef<THREE.Group>(null);
  const heliSplashRef = useRef<THREE.Group>(null);
  const heliRaftRef = useRef<THREE.Group>(null);
  const heliFlareRef = useRef<THREE.Group>(null);

  const isEquipment = unit.id === 'gsuit' || unit.id === 'pilot-helmet';
  const isEjection = unit.category === 'Tempur' || unit.category === 'Latih';
  const isHeli = unit.category === 'Helikopter';
  const isTransport = unit.category === 'Angkut & VIP';

  useEffect(() => {
    timer.current = 0;
    if (!safetyMode) {
      setFlightLabel(null);
      setSafetyStep(0);
    } else {
      setSafetyStep(0);
    }
  }, [safetyMode, safetyNonce, unit.id, setFlightLabel, setSafetyStep]);

  useFrame((state, delta) => {
    if (!safetyMode || isEquipment) return;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    timer.current += dt;
    const st = timer.current;

    if (isEjection) {
      // === CERITA PESAWAT TEMPUR: MANUVER -> TERTEMBAK RUDAL -> EJECTION SEAT -> PARASUT ===
      if (st < 3.5) {
        setSafetyStep(0);
        setFlightLabel('BABAK 1 • PATROLI & MANUVER TEMPUR UDARA');
        if (missileRef.current) missileRef.current.visible = false;
        if (explosionRef.current) explosionRef.current.visible = false;
        if (canopyFlyRef.current) canopyFlyRef.current.visible = false;
        if (seatGroupRef.current) seatGroupRef.current.visible = false;
      } else if (st < 5.8) {
        setSafetyStep(1);
        const hitTime = 4.45;
        if (st < hitTime) {
          // Rudal musuh melesat cepat dari belakang-kanan menuju mesin ekor!
          const p = (st - 3.5) / (hitTime - 3.5);
          if (missileRef.current) {
            missileRef.current.visible = true;
            missileRef.current.position.set(
              THREE.MathUtils.lerp(11.0, 0.2, p),
              THREE.MathUtils.lerp(0.6, 1.5, p),
              THREE.MathUtils.lerp(-14.5, -2.6, p),
            );
            missileRef.current.lookAt(0.2, 1.5, -2.6);
          }
          if (explosionRef.current) explosionRef.current.visible = false;
          setFlightLabel('⚠ PERINGATAN RADAR • RUDAL MUSUH MENDEKAT!');
        } else {
          // Hantaman ledakan api & asap hitam pekat di ekor/mesin!
          const p = (st - hitTime) / (5.8 - hitTime);
          if (missileRef.current) missileRef.current.visible = false;
          if (explosionRef.current) {
            explosionRef.current.visible = true;
            const pulse = 1.0 + Math.sin(t * 28) * 0.18;
            const s = (0.7 + Math.min(1, p * 2.2) * 0.85) * pulse;
            explosionRef.current.scale.set(s, s, s);
            explosionRef.current.position.set(0, 1.55, -2.8);
          }
          setFlightLabel('🔥 MAYDAY! MESIN TERTEMBAK • PESAWAT OLENG TAK TERKENDALI!');
        }
        if (canopyFlyRef.current) canopyFlyRef.current.visible = false;
        if (seatGroupRef.current) seatGroupRef.current.visible = false;
      } else if (st < 8.2) {
        setSafetyStep(2);
        const p = (st - 5.8) / 2.4;
        const ease = 1 - Math.pow(1 - p, 2);

        if (missileRef.current) missileRef.current.visible = false;
        if (explosionRef.current) {
          // Pesawat yang terbakar ikut menukik menjauh ke bawah
          explosionRef.current.visible = true;
          explosionRef.current.position.set(p * 1.4, 1.55 - p * 4.8, -2.8 + p * 3.6);
          explosionRef.current.scale.setScalar(1.3 + Math.sin(t * 24) * 0.2);
        }

        // Kanopi kokpit meledak lepas berputar ke atas-belakang (Canopy Jettison)
        if (canopyFlyRef.current) {
          canopyFlyRef.current.visible = p < 0.85;
          canopyFlyRef.current.position.set(p * 2.2, 2.55 + p * 4.2, 2.9 - p * 5.8);
          canopyFlyRef.current.rotation.set(-p * 5.5, p * 2.1, p * 3.2);
        }

        // Kursi Lontar Zero-Zero + Pilot 3D melesat vertikal ke langit dengan roket api!
        if (seatGroupRef.current && chuteRef.current) {
          seatGroupRef.current.visible = true;
          seatGroupRef.current.position.set(0, 2.1 + ease * 5.2, 2.9 - ease * 0.9);
          seatGroupRef.current.rotation.set(-0.22 * (1 - p), 0, 0);
          if (seatFrameRef.current) {
            seatFrameRef.current.visible = true;
            seatFrameRef.current.position.set(0, 0, 0);
            seatFrameRef.current.rotation.set(0, 0, 0);
          }
          if (flameRef.current) {
            flameRef.current.visible = p < 0.72;
            flameRef.current.scale.set(1, 0.85 + Math.sin(t * 55) * 0.3, 1);
          }
          chuteRef.current.visible = false;
        }
        setFlightLabel('🚀 EJECTION SEAT AKTIF! KURSI LONTAR MELONTARKAN PILOT!');
      } else {
        setSafetyStep(3);
        const p = Math.min(1, (st - 8.2) / 1.6);
        if (explosionRef.current) explosionRef.current.visible = false;
        if (canopyFlyRef.current) canopyFlyRef.current.visible = false;

        if (seatGroupRef.current && chuteRef.current) {
          seatGroupRef.current.visible = true;
          const sway = Math.sin(t * 1.55) * 0.14;
          const bob = Math.sin(t * 1.15) * 0.16;
          seatGroupRef.current.position.set(Math.sin(t * 0.95) * 0.4, 6.2 + bob, 2.0);
          seatGroupRef.current.rotation.set(0, 0, sway);

          // Kursi lontar terlepas & jatuh menjauh dari pilot saat parasut mengembang
          if (seatFrameRef.current) {
            seatFrameRef.current.visible = p < 0.92;
            seatFrameRef.current.position.set(p * 1.4, -p * 7.5, -p * 1.8);
            seatFrameRef.current.rotation.set(p * 3.2, 0, p * 2.4);
          }
          if (flameRef.current) flameRef.current.visible = false;

          chuteRef.current.visible = true;
          const s = THREE.MathUtils.lerp(0.08, 1.0, p);
          chuteRef.current.scale.set(s, s, s);
        }
        if (sarBeaconRef.current) {
          const mat = sarBeaconRef.current.material as THREE.MeshBasicMaterial;
          mat.opacity = Math.sin(t * 8) > 0 ? 1 : 0.2;
        }
        setFlightLabel('🪂 PARASUT UTAMA MENGEMBANG PENUH — PILOT SELAMAT & BEACON SAR AKTIF');
      }
    } else if (isTransport) {
      // === CERITA PESAWAT ANGKUT & VIP: GANGGUAN MESIN -> WATER DITCHING -> LIFE RAFT -> SAR ===
      if (st < 3.5) {
        setSafetyStep(0);
        if (transportSmokeRef.current) {
          transportSmokeRef.current.visible = true;
          transportSmokeRef.current.scale.setScalar(0.9 + Math.sin(t * 14) * 0.15);
        }
        if (splashRef.current) splashRef.current.visible = false;
        if (raftRef.current) raftRef.current.visible = false;
        if (crewRef.current) crewRef.current.visible = false;
        if (flareRef.current) flareRef.current.visible = false;
        setFlightLabel('⚠ MAYDAY! GANGGUAN MESIN DI ATAS LAUT — BERSIAP WATER DITCHING');
      } else if (st < 7.0) {
        setSafetyStep(1);
        const p = (st - 3.5) / 3.5;
        if (transportSmokeRef.current) {
          transportSmokeRef.current.visible = p < 0.7;
        }
        if (splashRef.current) {
          const touching = p > 0.45;
          splashRef.current.visible = touching;
          if (touching) {
            const sp = (p - 0.45) / 0.55;
            const s = Math.sin(sp * Math.PI) * 1.35 + 0.25;
            splashRef.current.scale.set(s, s * 0.85, s);
          }
        }
        if (raftRef.current) raftRef.current.visible = false;
        if (crewRef.current) crewRef.current.visible = false;
        if (flareRef.current) flareRef.current.visible = false;
        setFlightLabel('🌊 WATER DITCHING • PENDARATAN DARURAT DI PERMUKAAN LAUT');
      } else if (st < 10.5) {
        setSafetyStep(2);
        const p = Math.min(1, (st - 7.0) / 2.2);
        const ease = 1 - Math.pow(1 - p, 3);
        if (transportSmokeRef.current) transportSmokeRef.current.visible = false;
        if (splashRef.current) splashRef.current.visible = false;
        if (raftRef.current) {
          raftRef.current.visible = true;
          raftRef.current.scale.set(0.12 + 0.88 * ease, 0.12 + 0.88 * ease, 0.12 + 0.88 * ease);
        }
        if (crewRef.current) crewRef.current.visible = false;
        if (flareRef.current) flareRef.current.visible = false;
        setFlightLabel('🛟 PEROSOTAN EVAKUASI & PERAHU KARET (LIFE RAFT) MENGEMBANG');
      } else {
        setSafetyStep(3);
        if (transportSmokeRef.current) transportSmokeRef.current.visible = false;
        if (splashRef.current) splashRef.current.visible = false;
        if (raftRef.current) {
          raftRef.current.visible = true;
          raftRef.current.scale.set(1, 1, 1);
        }
        if (crewRef.current) crewRef.current.visible = true;
        if (flareRef.current) {
          flareRef.current.visible = true;
          flareRef.current.position.y = 0.8 + Math.sin(t * 2.5) * 0.12;
        }
        setFlightLabel('📡 KRU AMAN DI PERAHU KARET • SUAR ASAP ORANYE & SINYAL SAR AKTIF');
      }
    } else if (isHeli) {
      // === CERITA HELIKOPTER: AUTOROTASI -> PELAMPUNG DARURAT CO2 -> MENGAPUNG -> PERAHU KARET & SAR ===
      if (st < 3.5) {
        setSafetyStep(0);
        if (heliSmokeRef.current) {
          heliSmokeRef.current.visible = true;
          heliSmokeRef.current.scale.setScalar(0.85 + Math.sin(t * 15) * 0.14);
        }
        if (floatsRef.current) floatsRef.current.visible = false;
        if (heliSplashRef.current) heliSplashRef.current.visible = false;
        if (heliRaftRef.current) heliRaftRef.current.visible = false;
        if (heliFlareRef.current) heliFlareRef.current.visible = false;
        setFlightLabel('⚠ GANGGUAN TURBIN DI LAUT • PILOT MELAKUKAN AUTOROTASI TURUN');
      } else if (st < 6.2) {
        setSafetyStep(1);
        const p = Math.min(1, (st - 3.5) / 1.6);
        const ease = 1 - Math.pow(1 - p, 3);
        if (heliSmokeRef.current) heliSmokeRef.current.visible = p < 0.6;
        if (floatsRef.current) {
          floatsRef.current.visible = true;
          floatsRef.current.scale.set(0.18 + 0.82 * ease, 0.15 + 0.85 * ease, 0.22 + 0.78 * ease);
        }
        if (heliSplashRef.current) heliSplashRef.current.visible = false;
        if (heliRaftRef.current) heliRaftRef.current.visible = false;
        if (heliFlareRef.current) heliFlareRef.current.visible = false;
        setFlightLabel('🛟 TABUNG CO2 MEMOMPA 4 PELAMPUNG DARURAT LAUT (EMERGENCY FLOATS)');
      } else if (st < 9.2) {
        setSafetyStep(2);
        const p = (st - 6.2) / 3.0;
        if (heliSmokeRef.current) heliSmokeRef.current.visible = false;
        if (floatsRef.current) {
          floatsRef.current.visible = true;
          floatsRef.current.scale.set(1, 1, 1);
        }
        if (heliSplashRef.current) {
          heliSplashRef.current.visible = p < 0.55;
          const s = Math.sin(Math.min(1, p / 0.55) * Math.PI) * 1.15 + 0.2;
          heliSplashRef.current.scale.set(s, s * 0.7, s);
        }
        if (heliRaftRef.current) heliRaftRef.current.visible = false;
        if (heliFlareRef.current) heliFlareRef.current.visible = false;
        setFlightLabel('🌊 HELIKOPTER MENDARAT & MENGAPUNG AMAN DI ATAS OMBAK LAUT');
      } else {
        setSafetyStep(3);
        const p = Math.min(1, (st - 9.2) / 1.5);
        const ease = 1 - Math.pow(1 - p, 3);
        if (heliSmokeRef.current) heliSmokeRef.current.visible = false;
        if (floatsRef.current) {
          floatsRef.current.visible = true;
          floatsRef.current.scale.set(1, 1, 1);
        }
        if (heliSplashRef.current) heliSplashRef.current.visible = false;
        if (heliRaftRef.current) {
          heliRaftRef.current.visible = true;
          heliRaftRef.current.scale.set(0.15 + 0.85 * ease, 0.15 + 0.85 * ease, 0.15 + 0.85 * ease);
        }
        if (heliFlareRef.current) {
          heliFlareRef.current.visible = true;
          heliFlareRef.current.position.y = 0.75 + Math.sin(t * 2.5) * 0.12;
        }
        setFlightLabel('📡 LIFE RAFT & SUAR ASAP ORANYE AKTIF — MENUNGGU EVAKUASI SAR');
      }
    }
  });

  if (!safetyMode || isEquipment) return null;

  return (
    <group name="safety-system-3d">
      {/* =====================================================================
          1. CERITA PESAWAT TEMPUR & LATIH: RUDAL -> LEDAKAN -> EJECTION SEAT -> PARASUT
         ===================================================================== */}
      {isEjection && (
        <>
          {/* Rudal Musuh 3D yang melesat mendekat */}
          <group ref={missileRef} visible={false}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.09, 0.11, 2.2, 12]} />
              <meshStandardMaterial color="#e2e8f0" roughness={0.35} metalness={0.5} />
            </mesh>
            <mesh position={[0, 0, 1.25]} rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.09, 0.4, 12]} />
              <meshStandardMaterial color="#ef4444" roughness={0.4} />
            </mesh>
            {/* Api roket & jejak asap putih rudal */}
            <mesh position={[0, 0, -1.65]} rotation={[-Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.2, 1.4, 10]} />
              <meshBasicMaterial color="#fb923c" transparent opacity={0.9} />
            </mesh>
            <mesh position={[0, 0, -3.4]} rotation={[-Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.38, 3.2, 10]} />
              <meshBasicMaterial color="#f1f5f9" transparent opacity={0.45} depthWrite={false} />
            </mesh>
          </group>

          {/* Bola Api Ledakan & Asap Hitam saat Tertembak */}
          <group ref={explosionRef} visible={false} position={[0, 1.55, -2.8]}>
            <mesh>
              <icosahedronGeometry args={[1.05, 2]} />
              <meshBasicMaterial color="#ff5500" transparent opacity={0.88} />
            </mesh>
            <mesh position={[0, 0.25, -0.35]}>
              <icosahedronGeometry args={[0.72, 2]} />
              <meshBasicMaterial color="#fde047" transparent opacity={0.92} />
            </mesh>
            {[-1.1, -2.2, -3.3].map((dz, i) => (
              <mesh key={i} position={[i * 0.2, 0.4 + i * 0.35, dz]}>
                <icosahedronGeometry args={[0.75 + i * 0.28, 1]} />
                <meshStandardMaterial color="#1e293b" roughness={0.95} transparent opacity={0.78 - i * 0.15} />
              </mesh>
            ))}
          </group>

          {/* Kanopi Kaca Terlepas (Canopy Jettison) */}
          <group ref={canopyFlyRef} visible={false} position={[0, 2.55, 2.9]}>
            <mesh scale={[0.55, 0.38, 1.35]}>
              <sphereGeometry args={[0.9, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
              <meshPhysicalMaterial color="#38bdf8" transparent opacity={0.45} roughness={0.1} metalness={0.2} />
            </mesh>
          </group>

          {/* Kursi Lontar 3D + Pilot 3D + Roket + Parasut Utama */}
          <group ref={seatGroupRef} visible={false} position={[0, 2.1, 2.9]}>
            {/* Struktur Kursi Lontar (terlepas jatuh saat parasut mengembang) */}
            <group ref={seatFrameRef}>
              <mesh position={[0, 0.45, -0.14]}>
                <boxGeometry args={[0.56, 1.12, 0.2]} />
                <meshStandardMaterial color="#27303c" roughness={0.6} metalness={0.45} />
              </mesh>
              <mesh position={[0, -0.05, 0.12]}>
                <boxGeometry args={[0.56, 0.16, 0.52]} />
                <meshStandardMaterial color="#1e2630" roughness={0.7} metalness={0.3} />
              </mesh>
              <mesh position={[0, 1.08, -0.1]}>
                <boxGeometry args={[0.42, 0.32, 0.26]} />
                <meshStandardMaterial color="#3b4554" roughness={0.5} metalness={0.4} />
              </mesh>
              {/* Semburan Api Roket Kursi Lontar */}
              <mesh ref={flameRef} position={[0, -0.95, -0.1]} rotation={[Math.PI, 0, 0]} visible={false}>
                <coneGeometry args={[0.42, 2.1, 16]} />
                <meshBasicMaterial color="#ff7b00" transparent opacity={0.92} />
              </mesh>
            </group>

            {/* Figur Pilot TNI AU 3D Lengkap (Flight Suit, Harness Kuning, Helm Putih & Visor Gelap) */}
            <group position={[0, 0.12, 0.08]}>
              <mesh position={[0, 0.52, 0]}>
                <capsuleGeometry args={[0.21, 0.36, 8, 14]} />
                <meshStandardMaterial color="#4a5d43" roughness={0.8} />
              </mesh>
              {/* Kaki pilot */}
              {[-0.1, 0.1].map((lx, i) => (
                <mesh key={i} position={[lx, 0.08, 0.18]} rotation={[1.15, 0, 0]}>
                  <capsuleGeometry args={[0.08, 0.32, 6, 10]} />
                  <meshStandardMaterial color="#3f503a" roughness={0.8} />
                </mesh>
              ))}
              {/* Sabuk harness kuning */}
              {[-0.09, 0.09].map((hx, i) => (
                <mesh key={i} position={[hx, 0.55, 0.15]}>
                  <boxGeometry args={[0.05, 0.38, 0.04]} />
                  <meshStandardMaterial color="#eab308" roughness={0.5} />
                </mesh>
              ))}
              {/* Helm Penerbang + Visor Gelap + Masker Oksigen */}
              <mesh position={[0, 0.96, 0.02]}>
                <sphereGeometry args={[0.19, 16, 14]} />
                <meshStandardMaterial color="#e2e8f0" roughness={0.28} metalness={0.35} />
              </mesh>
              <mesh position={[0, 0.98, 0.09]}>
                <sphereGeometry args={[0.16, 16, 12, -Math.PI * 0.38, Math.PI * 0.76, Math.PI * 0.25, Math.PI * 0.36]} />
                <meshStandardMaterial color="#0f172a" roughness={0.1} metalness={0.92} />
              </mesh>
              {/* Lampu Beacon Darurat SAR pada rompi pilot */}
              <mesh ref={sarBeaconRef} position={[0.14, 0.72, 0.18]}>
                <sphereGeometry args={[0.055, 10, 10]} />
                <meshBasicMaterial color="#ef4444" transparent opacity={1} />
              </mesh>
            </group>

            {/* Parasut Utama 3D Oranye-Putih */}
            <group ref={chuteRef} position={[0, 1.35, 0]} visible={false}>
              <mesh position={[0, 2.85, 0]}>
                <sphereGeometry args={[2.55, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
                <meshStandardMaterial color="#f97316" roughness={0.65} side={THREE.DoubleSide} />
              </mesh>
              <mesh position={[0, 2.86, 0]}>
                <sphereGeometry args={[2.57, 28, 12, 0, Math.PI * 2, Math.PI * 0.22, Math.PI * 0.14]} />
                <meshStandardMaterial color="#f8fafc" roughness={0.65} side={THREE.DoubleSide} />
              </mesh>
              {Array.from({ length: 8 }, (_, i) => {
                const a = (i / 8) * Math.PI * 2;
                const topX = Math.cos(a) * 2.35;
                const topZ = Math.sin(a) * 2.35;
                const len = Math.hypot(topX, 2.85, topZ);
                const dir = new THREE.Vector3(topX, 2.85, topZ).normalize();
                const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
                return (
                  <mesh key={i} position={[topX / 2, 2.85 / 2, topZ / 2]} quaternion={quat}>
                    <cylinderGeometry args={[0.016, 0.016, len, 6]} />
                    <meshBasicMaterial color="#e2e8f0" />
                  </mesh>
                );
              })}
              <Html position={[0, 5.65, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
                <span className="whitespace-nowrap rounded-md border border-[#ffb703] bg-[#0a1e3c]/92 px-2.5 py-0.5 font-display text-[10px] font-bold tracking-wider text-[#ffb703] uppercase shadow">
                  PILOT SELAMAT • PARASUT & BEACON SAR AKTIF
                </span>
              </Html>
            </group>
          </group>
        </>
      )}

      {/* =====================================================================
          2. CERITA HELIKOPTER DI LAUT: AUTOROTASI -> PELAMPUNG CO2 -> LIFE RAFT & SAR
         ===================================================================== */}
      {isHeli && (
        <>
          {/* Asap gangguan mesin turbin saat autorotasi */}
          <group ref={heliSmokeRef} visible={false} position={[0, 2.4, -0.6]}>
            {[0, 1, 2].map((i) => (
              <mesh key={i} position={[0, i * 0.35, -0.8 - i * 0.9]}>
                <icosahedronGeometry args={[0.45 + i * 0.18, 1]} />
                <meshStandardMaterial color="#334155" roughness={0.95} transparent opacity={0.72 - i * 0.18} />
              </mesh>
            ))}
          </group>

          {/* 4 Kantung Pelampung Darurat Laut CO2 (Kuning-Oranye) */}
          <group ref={floatsRef} visible={false}>
            {(unit.id === 'colibri' || unit.id === 'h145' || unit.id === 'as365'
              ? [
                  { pos: [1.28, 0.3, 1.85] as [number, number, number], len: 1.55, r: 0.34 },
                  { pos: [-1.28, 0.3, 1.85] as [number, number, number], len: 1.55, r: 0.34 },
                  { pos: [1.28, 0.3, -0.05] as [number, number, number], len: 1.45, r: 0.34 },
                  { pos: [-1.28, 0.3, -0.05] as [number, number, number], len: 1.45, r: 0.34 },
                ]
              : [
                  { pos: [1.45, 0.62, 2.45] as [number, number, number], len: 1.85, r: 0.44 },
                  { pos: [-1.45, 0.62, 2.45] as [number, number, number], len: 1.85, r: 0.44 },
                  { pos: [1.68, 0.62, -0.45] as [number, number, number], len: 2.35, r: 0.48 },
                  { pos: [-1.68, 0.62, -0.45] as [number, number, number], len: 2.35, r: 0.48 },
                ]
            ).map((f, idx) => (
              <group key={idx} position={f.pos}>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <capsuleGeometry args={[f.r, f.len, 12, 24]} />
                  <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={0.22} roughness={0.38} />
                </mesh>
                {[-f.len * 0.28, f.len * 0.28].map((dz, j) => (
                  <mesh key={j} position={[0, 0, dz]}>
                    <torusGeometry args={[f.r + 0.015, 0.032, 8, 24]} />
                    <meshStandardMaterial color="#1e293b" roughness={0.7} />
                  </mesh>
                ))}
              </group>
            ))}
            <Html position={[2.1, 1.55, 1.1]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
              <span className="whitespace-nowrap rounded-md border border-amber-400 bg-[#0a1e3c]/92 px-2 py-0.5 font-display text-[10px] font-bold tracking-wider text-amber-300 uppercase shadow">
                EMERGENCY FLOATS CO2 AKTIF
              </span>
            </Html>
          </group>

          {/* Cipratan Buih Air Laut saat Touchdown */}
          <group ref={heliSplashRef} visible={false} position={[0, 0.15, 0.8]}>
            {[-2.2, 2.2, -1.5, 1.5].map((sx, i) => (
              <mesh key={i} position={[sx, 0.35, i < 2 ? 0.8 : -0.6]}>
                <icosahedronGeometry args={[0.68, 1]} />
                <meshBasicMaterial color="#e0f2fe" transparent opacity={0.72} depthWrite={false} />
              </mesh>
            ))}
          </group>

          {/* Perahu Karet (Life Raft) + Kru Berjaket Pelampung + Suar Asap Oranye */}
          <group ref={heliRaftRef} visible={false} position={[3.35, 0.12, 1.1]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[1.05, 0.26, 14, 28]} />
              <meshStandardMaterial color="#f97316" roughness={0.42} />
            </mesh>
            <mesh position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.98, 24]} />
              <meshStandardMaterial color="#fbbf24" roughness={0.65} />
            </mesh>
            {/* 2 Kru berjaket pelampung oranye aman di rakit */}
            {[-0.36, 0.36].map((cx, i) => (
              <group key={i} position={[cx, 0.22, 0]}>
                <mesh position={[0, 0.15, 0]}>
                  <capsuleGeometry args={[0.16, 0.24, 6, 12]} />
                  <meshStandardMaterial color="#fb923c" roughness={0.6} />
                </mesh>
                <mesh position={[0, 0.45, 0]}>
                  <sphereGeometry args={[0.13, 12, 12]} />
                  <meshStandardMaterial color="#e2e8f0" roughness={0.4} />
                </mesh>
              </group>
            ))}
            {/* Suar Asap Oranye SAR */}
            <group ref={heliFlareRef} visible={false} position={[0, 0.75, 0]}>
              {[0, 1, 2, 3].map((i) => (
                <mesh key={i} position={[i * 0.12, i * 0.85, -i * 0.15]}>
                  <icosahedronGeometry args={[0.32 + i * 0.16, 1]} />
                  <meshBasicMaterial color="#fb923c" transparent opacity={0.78 - i * 0.16} depthWrite={false} />
                </mesh>
              ))}
            </group>
          </group>
        </>
      )}

      {/* =====================================================================
          3. CERITA PESAWAT ANGKUT & VIP: WATER DITCHING -> SLIDE & LIFE RAFT -> SAR
         ===================================================================== */}
      {isTransport && (
        <>
          {/* Asap Hitam & Api Gangguan Mesin di Sayap Kanan */}
          <group ref={transportSmokeRef} visible={false} position={[2.6, 1.85, 0.6]}>
            <mesh>
              <icosahedronGeometry args={[0.45, 1]} />
              <meshBasicMaterial color="#ff6b00" transparent opacity={0.85} />
            </mesh>
            {[0, 1, 2, 3].map((i) => (
              <mesh key={i} position={[0, 0.25 + i * 0.25, -0.9 - i * 1.15]}>
                <icosahedronGeometry args={[0.52 + i * 0.22, 1]} />
                <meshStandardMaterial color="#1e293b" roughness={0.95} transparent opacity={0.75 - i * 0.14} />
              </mesh>
            ))}
          </group>

          {/* Cipratan Buih Air Laut 3D saat Water Ditching */}
          <group ref={splashRef} visible={false} position={[0, 0.25, 0]}>
            {[-3.2, 3.2, -2.4, 2.4, -3.6, 3.6].map((sx, i) => (
              <mesh key={i} position={[sx, 0.45 + (i % 2) * 0.35, 2.2 - i * 0.9]}>
                <icosahedronGeometry args={[0.82, 1]} />
                <meshBasicMaterial color="#e0f2fe" transparent opacity={0.76} depthWrite={false} />
              </mesh>
            ))}
          </group>

          {/* Perosotan Evakuasi & Perahu Karet (Life Raft) Kiri-Kanan Mengapung di Laut */}
          <group ref={raftRef} visible={false}>
            {[1, -1].map((s) => (
              <group key={s} position={[s * 2.45, 0.65, 3.35]} rotation={[0, 0, s * -0.42]}>
                <mesh>
                  <boxGeometry args={[2.8, 0.24, 1.15]} />
                  <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={0.22} roughness={0.45} />
                </mesh>
                <group position={[s * 1.85, -0.58, 0]} rotation={[0, 0, s * 0.42]}>
                  <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[1.15, 0.26, 14, 28]} />
                    <meshStandardMaterial color="#f97316" roughness={0.42} />
                  </mesh>
                  <mesh position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <circleGeometry args={[1.08, 24]} />
                    <meshStandardMaterial color="#fbbf24" roughness={0.65} />
                  </mesh>
                </group>
              </group>
            ))}
            <Html position={[4.2, 1.85, 3.35]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
              <span className="whitespace-nowrap rounded-md border border-amber-400 bg-[#0a1e3c]/92 px-2.5 py-0.5 font-display text-[10px] font-bold tracking-wider text-amber-300 uppercase shadow">
                WATER DITCHING • LIFE RAFT & SUAR SAR
              </span>
            </Html>
          </group>

          {/* Kru Berjaket Pelampung Oranye di Dalam Perahu Karet + Suar Asap SAR */}
          <group ref={crewRef} visible={false}>
            {[1, -1].map((s) => (
              <group key={s} position={[s * 4.15, 0.16, 3.35]}>
                {[-0.38, 0.38].map((cx, i) => (
                  <group key={i} position={[cx, 0.22, 0]}>
                    <mesh position={[0, 0.15, 0]}>
                      <capsuleGeometry args={[0.16, 0.24, 6, 12]} />
                      <meshStandardMaterial color="#fb923c" roughness={0.6} />
                    </mesh>
                    <mesh position={[0, 0.45, 0]}>
                      <sphereGeometry args={[0.13, 12, 12]} />
                      <meshStandardMaterial color="#e2e8f0" roughness={0.4} />
                    </mesh>
                  </group>
                ))}
              </group>
            ))}
            <group ref={flareRef} visible={false} position={[4.15, 0.8, 3.35]}>
              {[0, 1, 2, 3].map((i) => (
                <mesh key={i} position={[i * 0.14, i * 0.9, -i * 0.16]}>
                  <icosahedronGeometry args={[0.36 + i * 0.18, 1]} />
                  <meshBasicMaterial color="#fb923c" transparent opacity={0.8 - i * 0.16} depthWrite={false} />
                </mesh>
              ))}
            </group>
          </group>
        </>
      )}
    </group>
  );
}
