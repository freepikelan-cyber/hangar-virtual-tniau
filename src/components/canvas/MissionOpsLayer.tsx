import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useHangarStore, useSelectedUnit } from '../../store/useHangarStore';
import { aircraftAudio } from '../../utils/aircraftAudio';

interface FlareItem {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  age: number;
  maxAge: number;
  active: boolean;
}

/**
 * Simulasi 3D MISI OPERASI TNI AU (Fase 2) spesifik per kategori armada:
 * 1. Pesawat Tempur & Latih -> FLARE COUNTERMEASURE (18 suar anti-rudal berkilau + asap putih!)
 * 2. Pesawat Angkut & VIP   -> AIRDROP KOPASGAT / LOGISTIK (6 penerjun & palet parasut terjun dari pintu rampa!)
 * 3. Helikopter             -> MISI SAR HOIST LAUT (tali baja & keranjang penyelamat mengangkat korban dari rakit di laut!)
 */
export function MissionOpsLayer() {
  const unit = useSelectedUnit();
  const flightMode = useHangarStore((s) => s.flightMode);
  const flightNonce = useHangarStore((s) => s.flightNonce);
  const soundEnabled = useHangarStore((s) => s.soundEnabled);
  const setFlightLabel = useHangarStore((s) => s.setFlightLabel);

  const flareRefs = useRef<(THREE.Group | null)[]>([]);
  const dropRefs = useRef<(THREE.Group | null)[]>([]);
  const rampRef = useRef<THREE.Group>(null);
  const jumpLightMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const hoistCableRef = useRef<THREE.Mesh>(null);
  const hoistBasketRef = useRef<THREE.Group>(null);
  const survivorInBasketRef = useRef<THREE.Group>(null);
  const survivorOnRaftRef = useRef<THREE.Group>(null);

  const timer = useRef(0);
  const emitAccum = useRef(0);
  const flareIdx = useRef(0);

  const isEquipment = unit.id === 'gsuit' || unit.id === 'pilot-helmet';
  const isVvip = unit.id === 'b737vip' || unit.id === 'falcon8x';
  const isActive = flightMode === 'mission' && !isEquipment && !isVvip;
  const isHeli = unit.category === 'Helikopter';
  const isTransport = unit.category === 'Angkut & VIP' && !isVvip;
  const isFighter = !isHeli && !isTransport;

  const flarePool = useMemo<FlareItem[]>(
    () =>
      Array.from({ length: 18 }, () => ({
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        age: 0,
        maxAge: 2.8,
        active: false,
      })),
    [],
  );

  useEffect(() => {
    timer.current = 0;
    emitAccum.current = 0;
    flarePool.forEach((f) => {
      f.active = false;
    });
  }, [isActive, flightNonce, unit.id, flarePool]);

  useFrame((state, delta) => {
    if (!isActive) return;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    timer.current += dt;
    const mt = timer.current;

    if (isFighter) {
      // === 1. FLARE COUNTERMEASURE ANTI-RUDAL ===
      emitAccum.current += dt;
      if (emitAccum.current >= 0.24) {
        emitAccum.current = 0;
        const side = flareIdx.current % 2 === 0 ? 1 : -1;
        const f = flarePool[flareIdx.current % flarePool.length];
        flareIdx.current++;
        f.active = true;
        f.age = 0;
        f.pos.set(side * 0.75, 1.0, -3.2);
        f.vel.set(side * (3.2 + Math.random() * 2.2), -1.8 - Math.random() * 1.4, -9.5 - Math.random() * 2.5);
        if (flareIdx.current % 2 === 1) {
          aircraftAudio.playFlarePopSfx(soundEnabled);
        }
      }

      flarePool.forEach((f, i) => {
        const grp = flareRefs.current[i];
        if (!grp) return;
        if (!f.active) {
          grp.visible = false;
          return;
        }
        f.age += dt;
        if (f.age >= f.maxAge) {
          f.active = false;
          grp.visible = false;
          return;
        }
        f.pos.addScaledVector(f.vel, dt);
        f.vel.y -= dt * 2.6;
        grp.visible = true;
        grp.position.copy(f.pos);
        const fade = 1 - f.age / f.maxAge;
        grp.scale.setScalar(0.75 + fade * 0.65);
      });

      setFlightLabel('OPS TEMPUR // FLARE COUNTERMEASURE AKTIF — MENGECOL RUDAL PENCARI PANAS');
    } else if (isTransport) {
      // === 2. DROP BARANG LOGISTIK & TERJUN PAYUNG KOPASGAT (Sinkron tepat dengan transport-voice-airdrop.wav 14.52s!) ===
      // 0..8.0s: Persiapan 130 knot -> 8.0..10.8s: "Buka pintu rampa belakang" -> 11.0s: "Lampu hijau menyala!" -> 12.0s+: "Drop! Drop! Drop!"
      const rampOpen = THREE.MathUtils.clamp((mt - 8.0) / 2.8, 0, 1);
      if (rampRef.current) {
        // Tersambung rapat pada lantai perut belakang (rotation +0.26 tertutup rapat sejajar upsweep ekor -> -0.22 terbuka turun)
        rampRef.current.rotation.x = THREE.MathUtils.lerp(0.26, -0.22, rampOpen);
      }
      const isGreenLight = mt >= 11.0;
      if (jumpLightMatRef.current) {
        jumpLightMatRef.current.color.set(isGreenLight ? '#22c55e' : '#ef4444');
      }

      if (mt < 8.0) {
        setFlightLabel('RAJAWALI 1 // 5 MENIT MENUJU DROP ZONE — KECEPATAN 130 KNOT');
        dropRefs.current.forEach((grp) => {
          if (grp) grp.visible = false;
        });
      } else if (mt < 11.0) {
        setFlightLabel('RAJAWALI 1 // MEMBUKA PINTU RAMPA BELAKANG — LAMPU MERAH SIAGA');
        dropRefs.current.forEach((grp) => {
          if (grp) grp.visible = false;
        });
      } else if (mt < 12.0) {
        setFlightLabel('DROP ZONE // LAMPU HIJAU MENYALA — SIAP TERJUN');
        dropRefs.current.forEach((grp) => {
          if (grp) grp.visible = false;
        });
      } else {
        setFlightLabel('DROP ZONE // DROP! DROP! DROP! — LOGISTIK & TERJUN PAYUNG KOPASGAT');
        const dropT = mt - 12.0;
        dropRefs.current.forEach((grp, i) => {
          if (!grp) return;
          const delay = i * 1.1;
          if (dropT < delay) {
            grp.visible = false;
            return;
          }
          grp.visible = true;
          const cycle = (dropT - delay) % 8.4;
          const p = cycle / 8.4;
          const isCargo = i % 2 === 1;
          const z = THREE.MathUtils.lerp(-4.2, -26.0, p);
          const y = THREE.MathUtils.lerp(0.62, isCargo ? -9.5 : -8.2, Math.pow(p, 1.12));
          const x = (i % 2 === 0 ? 1 : -1) * (0.45 + p * 4.4) + Math.sin(t * 1.6 + i) * 0.45;
          grp.position.set(x, y, z);
          grp.rotation.z = Math.sin(t * 1.5 + i) * 0.14;
          const chuteOpen = Math.min(1, Math.max(0.12, (p - 0.06) * 3.4));
          grp.scale.set(chuteOpen, chuteOpen, chuteOpen);
        });
      }
    } else if (isHeli) {
      // === 3. MISI SAR HOIST LAUT (Menurunkan keranjang penyelamat -> Mengangkat korban dari rakit!) ===
      const cycle = mt % 11.0;
      let hoistLen = 0.6;
      let rescued = false;
      if (cycle < 4.0) {
        const p = cycle / 4.0;
        hoistLen = THREE.MathUtils.lerp(0.6, 5.1, p * p * (3 - 2 * p));
        rescued = false;
        setFlightLabel('SAR LAUT // MENURUNKAN TALI RESCUE HOIST KE RAKIT KORBAN');
      } else if (cycle < 5.5) {
        hoistLen = 5.1;
        rescued = cycle > 4.6;
        setFlightLabel('SAR LAUT // KORBAN MASUK KERANJANG PENYELAMAT — SIAP ANGKAT');
      } else if (cycle < 9.5) {
        const p = (cycle - 5.5) / 4.0;
        hoistLen = THREE.MathUtils.lerp(5.1, 0.7, p * p * (3 - 2 * p));
        rescued = true;
        setFlightLabel('SAR LAUT // WINCH MENGANGKAT KORBAN KE KABIN HELIKOPTER');
      } else {
        hoistLen = 0.7;
        rescued = true;
        setFlightLabel('SAR LAUT // EVAKUASI SELESAI — KORBAN AMAN DI KABIN');
      }

      if (hoistCableRef.current) {
        hoistCableRef.current.scale.set(1, hoistLen, 1);
        hoistCableRef.current.position.set(1.55, 1.35 - hoistLen / 2, 0.8);
      }
      if (hoistBasketRef.current) {
        hoistBasketRef.current.position.set(1.55, 1.35 - hoistLen - 0.35, 0.8);
        hoistBasketRef.current.rotation.z = Math.sin(t * 2.2) * 0.08;
      }
      if (survivorInBasketRef.current) survivorInBasketRef.current.visible = rescued;
      if (survivorOnRaftRef.current) survivorOnRaftRef.current.visible = !rescued;
    }
  });

  if (!isActive) return null;

  return (
    <group name="mission-ops-3d">
      {/* 1. FLARE COUNTERMEASURE (PESAWAT TEMPUR & LATIH) */}
      {isFighter &&
        flarePool.map((_, i) => (
          <group
            key={`flare-${i}`}
            ref={(el) => {
              flareRefs.current[i] = el;
            }}
            visible={false}
          >
            <mesh>
              <sphereGeometry args={[0.24, 10, 10]} />
              <meshBasicMaterial color="#fffbeb" />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.52, 10, 10]} />
              <meshBasicMaterial color="#ffb703" transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
            <mesh position={[0, 0.2, 0.9]} rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.26, 2.2, 8]} />
              <meshBasicMaterial color="#f1f5f9" transparent opacity={0.42} depthWrite={false} />
            </mesh>
          </group>
        ))}

      {/* 2. DROP BARANG LOGISTIK & TERJUN PAYUNG KOPASGAT (KHUSUS PESAWAT ANGKUT — BUKAN VVIP) */}
      {isTransport && (
        <group>
          {/* Ruang Kargo Gelap & Pintu Rampa Belakang (tersambung rapat langsung pada engsel perut ekor pesawat!) */}
          <group position={[0, 0.72, -2.55]}>
            {/* Rongga interior kargo belakang yang menyatu ke badan pesawat */}
            <mesh position={[0, 0.36, -0.35]}>
              <boxGeometry args={[1.18, 0.68, 1.15]} />
              <meshStandardMaterial color="#0f172a" roughness={0.95} />
            </mesh>
            {/* Engsel rampa bawah tersambung kokoh ke lantai kargo */}
            <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.07, 0.07, 1.18, 10]} />
              <meshStandardMaterial color="#334155" metalness={0.75} roughness={0.35} />
            </mesh>
            {/* Lampu indikator Jump Light Merah / Hijau di bingkai pintu kargo */}
            <mesh position={[0.52, 0.56, -0.82]}>
              <sphereGeometry args={[0.11, 10, 10]} />
              <meshBasicMaterial ref={jumpLightMatRef} color="#ef4444" />
            </mesh>
            {/* Daun Pintu Rampa Belakang (berputar pada engsel z = -2.55 agar selalu menempel utuh!) */}
            <group ref={rampRef} rotation={[0.26, 0, 0]}>
              <mesh position={[0, -0.04, -0.92]}>
                <boxGeometry args={[1.14, 0.1, 1.84]} />
                <meshStandardMaterial color="#475569" roughness={0.58} metalness={0.42} />
              </mesh>
              {/* Rel pemandu sisi kiri & kanan rampa + tali baja hidrolik */}
              {[-0.54, 0.54].map((rx, idx) => (
                <group key={idx}>
                  <mesh position={[rx, 0.05, -0.92]}>
                    <boxGeometry args={[0.06, 0.14, 1.82]} />
                    <meshStandardMaterial color="#334155" roughness={0.5} metalness={0.5} />
                  </mesh>
                  <mesh position={[rx, 0.36, -0.68]} rotation={[0.55, 0, 0]}>
                    <cylinderGeometry args={[0.016, 0.016, 0.85, 6]} />
                    <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.25} />
                  </mesh>
                </group>
              ))}
            </group>
          </group>

          {Array.from({ length: 8 }, (_, i) => {
            const isCargo = i % 2 === 1;
            return (
              <group
                key={`drop-${i}`}
                ref={(el) => {
                  dropRefs.current[i] = el;
                }}
                visible={false}
              >
                {/* Kubah parasut militer (Hijau Kopasgat untuk Prajurit / Oranye-Putih Besar untuk Cargo Pallet) */}
                <mesh position={[0, 2.25, 0]}>
                  <sphereGeometry args={[isCargo ? 1.75 : 1.4, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
                  <meshStandardMaterial color={isCargo ? '#f97316' : '#3f6212'} roughness={0.68} side={THREE.DoubleSide} />
                </mesh>
                {/* Tali parasut 4 sisi */}
                {[-0.72, 0.72].map((tx, j) => (
                  <mesh key={j} position={[tx * 0.5, 1.15, 0]} rotation={[0, 0, tx > 0 ? 0.34 : -0.34]}>
                    <cylinderGeometry args={[0.016, 0.016, 2.2, 6]} />
                    <meshBasicMaterial color="#e2e8f0" />
                  </mesh>
                ))}
                {!isCargo ? (
                  /* Prajurit Terjun Payung Kopasgat 3D (Helm, Badan Loreng, Ransel, Kaki & Tangan) */
                  <group position={[0, -0.05, 0]}>
                    <mesh position={[0, 0.42, 0]}>
                      <sphereGeometry args={[0.14, 10, 10]} />
                      <meshStandardMaterial color="#365314" roughness={0.55} />
                    </mesh>
                    <mesh position={[0, 0.08, 0]}>
                      <capsuleGeometry args={[0.16, 0.36, 6, 10]} />
                      <meshStandardMaterial color="#3f6212" roughness={0.82} />
                    </mesh>
                    <mesh position={[0, 0.08, -0.18]}>
                      <boxGeometry args={[0.26, 0.34, 0.16]} />
                      <meshStandardMaterial color="#78350f" roughness={0.85} />
                    </mesh>
                    <mesh position={[-0.08, -0.32, 0]}>
                      <capsuleGeometry args={[0.065, 0.32, 4, 8]} />
                      <meshStandardMaterial color="#1e293b" roughness={0.85} />
                    </mesh>
                    <mesh position={[0.08, -0.32, 0]}>
                      <capsuleGeometry args={[0.065, 0.32, 4, 8]} />
                      <meshStandardMaterial color="#1e293b" roughness={0.85} />
                    </mesh>
                  </group>
                ) : (
                  /* Peti Drop Barang Logistik TNI AU dengan Sabuk Pengikat Kuning */
                  <group position={[0, -0.12, 0]}>
                    <mesh>
                      <boxGeometry args={[0.92, 0.68, 0.92]} />
                      <meshStandardMaterial color="#92400e" roughness={0.78} />
                    </mesh>
                    <mesh position={[0, 0, 0]}>
                      <boxGeometry args={[0.95, 0.12, 0.95]} />
                      <meshStandardMaterial color="#fbbf24" roughness={0.55} />
                    </mesh>
                  </group>
                )}
              </group>
            );
          })}
        </group>
      )}

      {/* 3. MISI SAR HOIST LAUT (HELIKOPTER) */}
      {isHeli && (
        <group>
          {/* Lengan Derek Winch di sisi kanan kabin */}
          <mesh position={[1.15, 1.48, 0.8]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.07, 0.07, 0.9, 10]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.75} roughness={0.3} />
          </mesh>
          {/* Tali baja Rescue Hoist */}
          <mesh ref={hoistCableRef} position={[1.55, 0.5, 0.8]}>
            <cylinderGeometry args={[0.022, 0.022, 1.0, 8]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.85} roughness={0.25} />
          </mesh>
          {/* Keranjang Penyelamat SAR */}
          <group ref={hoistBasketRef} position={[1.55, -2.5, 0.8]}>
            <mesh>
              <cylinderGeometry args={[0.42, 0.36, 0.55, 16, 1, true]} />
              <meshStandardMaterial color="#f97316" roughness={0.45} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, -0.26, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.36, 16]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
            {/* Korban di dalam keranjang saat diangkat */}
            <group ref={survivorInBasketRef} visible={false} position={[0, 0.1, 0]}>
              <mesh>
                <capsuleGeometry args={[0.16, 0.28, 6, 10]} />
                <meshStandardMaterial color="#fb923c" roughness={0.6} />
              </mesh>
              <mesh position={[0, 0.32, 0]}>
                <sphereGeometry args={[0.13, 10, 10]} />
                <meshStandardMaterial color="#fde68a" roughness={0.5} />
              </mesh>
            </group>
          </group>

          {/* Rakit Korban Mengapung di Permukaan Laut di bawah Helikopter */}
          <group position={[1.55, -4.35, 0.8]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[1.0, 0.24, 12, 24]} />
              <meshStandardMaterial color="#f97316" roughness={0.42} />
            </mesh>
            <mesh position={[0, -0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.92, 20]} />
              <meshStandardMaterial color="#fbbf24" roughness={0.65} />
            </mesh>
            <group ref={survivorOnRaftRef} position={[0, 0.25, 0]}>
              <mesh>
                <capsuleGeometry args={[0.16, 0.28, 6, 10]} />
                <meshStandardMaterial color="#fb923c" roughness={0.6} />
              </mesh>
              <mesh position={[0, 0.32, 0]}>
                <sphereGeometry args={[0.13, 10, 10]} />
                <meshStandardMaterial color="#fde68a" roughness={0.5} />
              </mesh>
            </group>
            <Html position={[1.5, 0.65, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
              <span className="whitespace-nowrap rounded border border-amber-400 bg-[#081933]/90 px-1.5 py-0.5 font-display text-[9px] font-bold tracking-wider text-amber-300 uppercase shadow">
                TARGET EVAKUASI SAR
              </span>
            </Html>
          </group>
        </group>
      )}
    </group>
  );
}
