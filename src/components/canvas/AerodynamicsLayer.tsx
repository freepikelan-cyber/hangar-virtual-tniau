import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useHangarStore, useSelectedUnit } from '../../store/useHangarStore';

interface ForceArrowProps {
  dir: [number, number, number];
  origin: [number, number, number];
  color: string;
  label?: string;
  sublabel?: string;
  lengthRef: React.MutableRefObject<number>;
  radius?: number;
}

/** Panah vektor gaya aerodinamika 3D yang panjangnya berubah dinamis real-time. */
function ForceArrow3D({ dir, origin, color, label, sublabel, lengthRef, radius = 0.075 }: ForceArrowProps) {
  const shaftRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const labelRef = useRef<THREE.Group>(null);

  const quat = useMemo(() => {
    const v = new THREE.Vector3(...dir).normalize();
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v);
  }, [dir]);

  useFrame((_, delta) => {
    const targetLen = Math.max(0.45, lengthRef.current);
    if (shaftRef.current && headRef.current) {
      const cur = shaftRef.current.scale.y;
      const next = THREE.MathUtils.lerp(cur, targetLen, Math.min(1, delta * 6.5));
      shaftRef.current.scale.y = next;
      shaftRef.current.position.y = next * 0.5;
      headRef.current.position.y = next + radius * 3.4;
      if (labelRef.current) {
        labelRef.current.position.y = next + radius * 10.5;
      }
    }
  });

  return (
    <group position={origin} quaternion={quat}>
      <mesh ref={shaftRef} position={[0, 1, 0]}>
        <cylinderGeometry args={[radius, radius, 1, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.85} roughness={0.25} />
      </mesh>
      <mesh ref={headRef} position={[0, 2.3, 0]}>
        <coneGeometry args={[radius * 2.9, radius * 7.2, 14]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.95} roughness={0.2} />
      </mesh>
      {label && (
        <group ref={labelRef} position={[0, 2.9, 0]}>
          <Html center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
            <div
              className="whitespace-nowrap rounded border px-1.5 py-0.5 font-display text-[10px] font-bold tracking-wider uppercase shadow-md backdrop-blur-sm"
              style={{
                backgroundColor: 'rgba(10, 30, 60, 0.92)',
                borderColor: color,
                color,
              }}
            >
              {label} {sublabel ?? ''}
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}

/**
 * Lapisan Visualisasi 3D Lab Aerodinamika Lengkap:
 * 1. Animasi Aliran Angin dari Depan (+Z -> -Z) -> Trim & Flap berubah -> Angin dibelokkan ke BAWAH (Downwash!) -> Muncul Gaya Lift!
 * 2. Visualisasi 3D Distribusi Gaya Angkat (LIFT ↑) di sepanjang kedua sayap + Zona Tekanan Rendah (Atas) & Tekanan Tinggi (Bawah)
 * 3. Aileron Kiri/Kanan, Flap Kiri/Kanan, & Trim Elevator yang bergerak sinkron saat Menanjak, Menurun, Belok Kiri & Belok Kanan!
 */
export function AerodynamicsLayer() {
  const unit = useSelectedUnit();
  const aeroMode = useHangarStore((s) => s.aeroMode);
  const flapAngle = useHangarStore((s) => s.flapAngle);
  const trimAngle = useHangarStore((s) => s.trimAngle);
  const aeroManeuver = useHangarStore((s) => s.aeroManeuver);
  const flightMode = useHangarStore((s) => s.flightMode);

  const liftLen = useRef(2.2);
  const weightLen = useRef(2.2);
  const thrustLen = useRef(2.4);
  const dragLen = useRef(1.6);

  // Distribusi Lift 3D di sayap kiri & kanan (3 panah per sayap!)
  const wingLiftL0 = useRef(1.7);
  const wingLiftL1 = useRef(1.35);
  const wingLiftL2 = useRef(0.95);
  const wingLiftR0 = useRef(1.7);
  const wingLiftR1 = useRef(1.35);
  const wingLiftR2 = useRef(0.95);

  const leftFlapRef = useRef<THREE.Group>(null);
  const rightFlapRef = useRef<THREE.Group>(null);
  const leftAilRef = useRef<THREE.Group>(null);
  const rightAilRef = useRef<THREE.Group>(null);
  const trimRef = useRef<THREE.Group>(null);
  const flowRefs = useRef<(THREE.Group | null)[]>([]);

  const isEquipment = unit.id === 'gsuit' || unit.id === 'pilot-helmet';
  const isHeli = unit.category === 'Helikopter';
  const isHeavy = unit.category === 'Angkut & VIP';

  const wingY = isHeavy ? 2.35 : 1.58;
  const flapZ = isHeavy ? -0.95 : -1.45;
  const flapX = isHeavy ? 2.55 : 1.95;
  const ailX = isHeavy ? 4.85 : 3.75;
  const tailY = isHeavy ? 2.15 : 1.72;
  const tailZ = isHeavy ? -6.15 : -5.55;

  // 20 pita panah aliran angin dari depan (+Z) melewati sayap (kiri, tengah, kanan)
  const windCols = useMemo(() => [-4.2, -3.0, -1.8, 1.8, 3.0, 4.2], []);

  useFrame((state, delta) => {
    if (!aeroMode || isEquipment) return;
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.05);

    // Hitung Flap, Trim, & Aileron efektif sesuai mode manuver aerodinamika!
    let effFlap: number = flapAngle;
    let effTrim: number = trimAngle;
    let effAileron = 0; // positif = belok kanan (kiri turun, kanan naik)
    let liftPhaseMult = 1.0;

    if (aeroManeuver === 'liftDemo') {
      // Siklus demo 12 detik:
      // 0..3.5s: Angin depan netral (Trim 0°, Flap 0°) -> Lift kecil
      // 3.5..7.5s: Trim naik +8° & Flap turun 25° -> Angin dibelokkan ke bawah (Downwash kuat!)
      // 7.5..12s: Gaya Lift melonjak tinggi -> Pesawat terangkat terbang!
      const cyc = t % 12;
      if (cyc < 3.5) {
        effFlap = 0;
        effTrim = 0;
        liftPhaseMult = 0.55;
      } else if (cyc < 7.5) {
        const p = (cyc - 3.5) / 4.0;
        effFlap = THREE.MathUtils.lerp(0, 30, p);
        effTrim = THREE.MathUtils.lerp(0, 8, p);
        liftPhaseMult = THREE.MathUtils.lerp(0.55, 1.35, p);
      } else {
        effFlap = 30;
        effTrim = 8;
        liftPhaseMult = 1.45;
      }
    } else if (aeroManeuver === 'climb') {
      effTrim = 8;
      effFlap = Math.max(15, flapAngle);
      liftPhaseMult = 1.38;
    } else if (aeroManeuver === 'descend') {
      effTrim = -5;
      effFlap = 0;
      liftPhaseMult = 0.65;
    } else if (aeroManeuver === 'turnLeft') {
      effAileron = -24; // Aileron kiri NAIK, kanan TURUN -> sayap kanan lebih tinggi -> miring kiri!
      effTrim = 2;
      liftPhaseMult = 1.15;
    } else if (aeroManeuver === 'turnRight') {
      effAileron = 24; // Aileron kanan NAIK, kiri TURUN -> sayap kiri lebih tinggi -> miring kanan!
      effTrim = 2;
      liftPhaseMult = 1.15;
    }

    const flapLiftBonus = (effFlap / 35) * 1.1;
    const flapDragBonus = (effFlap / 35) * 1.25;
    const trimLiftBonus = effTrim > 0 ? 0.45 : effTrim < 0 ? -0.35 : 0;

    liftLen.current = (1.85 + flapLiftBonus + trimLiftBonus) * liftPhaseMult;
    weightLen.current = 2.15;
    thrustLen.current = aeroManeuver === 'climb' ? 3.2 : aeroManeuver === 'descend' ? 1.5 : 2.5;
    dragLen.current = 1.4 + flapDragBonus;

    // Distribusi gaya Lift di kedua sayap (berbeda kiri & kanan saat belok!)
    const leftBias = effAileron > 0 ? 1.38 : effAileron < 0 ? 0.65 : 1.0;
    const rightBias = effAileron < 0 ? 1.38 : effAileron > 0 ? 0.65 : 1.0;
    const baseWingLift = Math.max(0.55, (1.1 + flapLiftBonus * 0.7) * liftPhaseMult);

    wingLiftL0.current = baseWingLift * 1.25 * leftBias;
    wingLiftL1.current = baseWingLift * 1.0 * leftBias;
    wingLiftL2.current = baseWingLift * 0.72 * leftBias;
    wingLiftR0.current = baseWingLift * 1.25 * rightBias;
    wingLiftR1.current = baseWingLift * 1.0 * rightBias;
    wingLiftR2.current = baseWingLift * 0.72 * rightBias;

    // Animasi Flap, Aileron, & Trim Elevator
    const flapRad = THREE.MathUtils.degToRad(effFlap);
    if (leftFlapRef.current) leftFlapRef.current.rotation.x = THREE.MathUtils.lerp(leftFlapRef.current.rotation.x, flapRad, Math.min(1, dt * 6));
    if (rightFlapRef.current) rightFlapRef.current.rotation.x = THREE.MathUtils.lerp(rightFlapRef.current.rotation.x, flapRad, Math.min(1, dt * 6));

    const ailRad = THREE.MathUtils.degToRad(effAileron);
    if (leftAilRef.current) leftAilRef.current.rotation.x = THREE.MathUtils.lerp(leftAilRef.current.rotation.x, ailRad, Math.min(1, dt * 6));
    if (rightAilRef.current) rightAilRef.current.rotation.x = THREE.MathUtils.lerp(rightAilRef.current.rotation.x, -ailRad, Math.min(1, dt * 6));

    const trimRad = THREE.MathUtils.degToRad(-effTrim * 2.4);
    if (trimRef.current) trimRef.current.rotation.x = THREE.MathUtils.lerp(trimRef.current.rotation.x, trimRad, Math.min(1, dt * 6));

    // Animasi Aliran Angin dari DEPAN (+Z) -> melengkung di atas sayap -> DIBELOKKAN KE BAWAH (Downwash) oleh Flap & Trim!
    const flowSpeed = flightMode === 'parked' ? 7.8 : 13.5;
    const downwashStrength = 0.25 + (effFlap / 35) * 1.35 + (effTrim > 0 ? 0.55 : 0);

    flowRefs.current.forEach((grp, idx) => {
      if (!grp) return;
      const col = Math.floor(idx / 3);
      const row = idx % 3;
      const offset = (t * flowSpeed + row * 3.8 + col * 0.55) % 11.4;
      const z = 5.8 - offset; // datang dari depan (+5.8) menuju belakang (-5.6)

      // Lengkungan naik melewati airfoil sayap (Bernoulli)
      const overWing = Math.exp(-Math.pow((z - 0.1) * 0.52, 2)) * 0.52;
      // Pembelokan angin ke BAWAH (Downwash) di belakang sayap saat Flap/Trim aktif!
      const behindWing = Math.max(0, flapZ - z);
      const downwashY = -downwashStrength * Math.min(2.4, behindWing * 0.42);
      const slopeAngle = behindWing > 0 ? Math.atan2(downwashStrength * 0.42, 1) : -overWing * 0.35;

      grp.position.z = z;
      grp.position.y = wingY + 0.34 + overWing + downwashY;
      // Miringkan panah angin mengikuti arah pembelokan ke bawah secara visual!
      grp.rotation.x = THREE.MathUtils.lerp(grp.rotation.x, slopeAngle, Math.min(1, dt * 10));
    });
  });

  if (!aeroMode || isEquipment) return null;

  return (
    <group name="aerodynamics-3d-layer">
      {/* 1. Empat Vektor Gaya Utama */}
      <ForceArrow3D dir={[0, 1, 0]} origin={[0, isHeli ? 3.9 : 3.05, 0.2]} color="#10b981" label="LIFT" sublabel="↑" lengthRef={liftLen} />
      <ForceArrow3D dir={[0, -1, 0]} origin={[0, 0.65, 0.2]} color="#f59e0b" label="WEIGHT" sublabel="↓" lengthRef={weightLen} />
      <ForceArrow3D dir={[0, 0, 1]} origin={[0, 1.85, 6.6]} color="#38bdf8" label="THRUST" sublabel="→" lengthRef={thrustLen} />
      <ForceArrow3D dir={[0, 0, -1]} origin={[0, 1.95, -7.6]} color="#fb7185" label="DRAG" sublabel="←" lengthRef={dragLen} />

      {/* 2. VISUALISASI 3D GAYA ANGKAT (LIFT) PADA KEDUA SAYAP + ZONA TEKANAN RENDAH / TINGGI */}
      {!isHeli && (
        <group name="wing-lift-distribution">
          {/* Panah Lift di Sayap Kiri */}
          <ForceArrow3D dir={[0, 1, 0]} origin={[-1.9, wingY + 0.12, 0.1]} color="#34d399" lengthRef={wingLiftL0} radius={0.048} />
          <ForceArrow3D dir={[0, 1, 0]} origin={[-3.1, wingY + 0.12, -0.15]} color="#34d399" lengthRef={wingLiftL1} radius={0.044} />
          <ForceArrow3D dir={[0, 1, 0]} origin={[-4.2, wingY + 0.12, -0.4]} color="#34d399" lengthRef={wingLiftL2} radius={0.038} />
          {/* Panah Lift di Sayap Kanan */}
          <ForceArrow3D dir={[0, 1, 0]} origin={[1.9, wingY + 0.12, 0.1]} color="#34d399" lengthRef={wingLiftR0} radius={0.048} />
          <ForceArrow3D dir={[0, 1, 0]} origin={[3.1, wingY + 0.12, -0.15]} color="#34d399" lengthRef={wingLiftR1} radius={0.044} />
          <ForceArrow3D dir={[0, 1, 0]} origin={[4.2, wingY + 0.12, -0.4]} color="#34d399" lengthRef={wingLiftR2} radius={0.038} />

          {/* Zona Tekanan Rendah (Biru-Hijau di Atas Sayap) & Tekanan Tinggi (Oranye di Bawah Sayap) */}
          {[-1, 1].map((s) => (
            <group key={s}>
              <mesh position={[s * 3.0, wingY + 0.22, -0.15]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[2.9, 1.55]} />
                <meshBasicMaterial color="#10b981" transparent opacity={0.22} side={THREE.DoubleSide} depthWrite={false} />
              </mesh>
              <mesh position={[s * 3.0, wingY - 0.24, -0.15]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[2.9, 1.55]} />
                <meshBasicMaterial color="#f59e0b" transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} />
              </mesh>
            </group>
          ))}
          <Html position={[3.2, wingY + 0.45, 0.85]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
            <span className="whitespace-nowrap rounded border border-emerald-400/70 bg-[#0a1e3c]/90 px-1.5 py-0.5 font-display text-[9px] font-bold text-emerald-300 uppercase">
              TEKANAN RENDAH (ATAS) → LIFT ↑
            </span>
          </Html>
          <Html position={[-3.2, wingY - 0.55, -1.8]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
            <span className="whitespace-nowrap rounded border border-cyan-400/70 bg-[#0a1e3c]/90 px-1.5 py-0.5 font-display text-[9px] font-bold text-cyan-300 uppercase">
              ANGIN DIBELOKKAN KE BAWAH (DOWNWASH ↘)
            </span>
          </Html>
        </group>
      )}

      {/* 3. PITA PANAH ALIRAN ANGIN 3D DARI DEPAN (+Z -> -Z) YANG BERBELOK KE BAWAH DI BELAKANG SAYAP */}
      {windCols.map((x, colIdx) =>
        [0, 1, 2].map((rowIdx) => {
          const idx = colIdx * 3 + rowIdx;
          return (
            <group
              key={idx}
              ref={(el) => {
                flowRefs.current[idx] = el;
              }}
              position={[x, wingY + 0.35, 4 - rowIdx * 3.5]}
            >
              {/* Batang aliran angin */}
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.028, 0.042, 1.55, 8]} />
                <meshBasicMaterial color="#38bdf8" transparent opacity={0.82} />
              </mesh>
              {/* Kepala panah menunjuk arah angin ke belakang (-Z) */}
              <mesh position={[0, 0, -0.92]} rotation={[-Math.PI / 2, 0, 0]}>
                <coneGeometry args={[0.095, 0.34, 8]} />
                <meshBasicMaterial color="#7dd3fc" transparent opacity={0.92} />
              </mesh>
            </group>
          );
        }),
      )}

      {/* 4. PERMUKAAN KENDALI 3D: FLAP, AILERON (BELOK), & TRIM ELEVATOR (NAIK/TURUN) */}
      {!isHeli && (
        <>
          {/* Flap Kiri & Kanan */}
          <group ref={leftFlapRef} position={[-flapX, wingY, flapZ]}>
            <mesh position={[0, 0, -0.4]}>
              <boxGeometry args={[1.85, 0.08, 0.78]} />
              <meshStandardMaterial color="#ffb703" emissive="#ffb703" emissiveIntensity={0.65} transparent opacity={0.9} />
            </mesh>
          </group>
          <group ref={rightFlapRef} position={[flapX, wingY, flapZ]}>
            <mesh position={[0, 0, -0.4]}>
              <boxGeometry args={[1.85, 0.08, 0.78]} />
              <meshStandardMaterial color="#ffb703" emissive="#ffb703" emissiveIntensity={0.65} transparent opacity={0.9} />
            </mesh>
          </group>

          {/* Aileron Kiri & Kanan (Ungu terang — bergerak berlawanan saat Belok Kiri / Kanan!) */}
          <group ref={leftAilRef} position={[-ailX, wingY, flapZ - 0.15]}>
            <mesh position={[0, 0, -0.35]}>
              <boxGeometry args={[1.55, 0.075, 0.62]} />
              <meshStandardMaterial color="#c084fc" emissive="#a855f7" emissiveIntensity={0.75} transparent opacity={0.92} />
            </mesh>
          </group>
          <group ref={rightAilRef} position={[ailX, wingY, flapZ - 0.15]}>
            <mesh position={[0, 0, -0.35]}>
              <boxGeometry args={[1.55, 0.075, 0.62]} />
              <meshStandardMaterial color="#c084fc" emissive="#a855f7" emissiveIntensity={0.75} transparent opacity={0.92} />
            </mesh>
          </group>

          {/* Trim / Elevator Ekor */}
          <group ref={trimRef} position={[0, tailY, tailZ]}>
            <mesh position={[-1.45, 0, -0.35]}>
              <boxGeometry args={[1.55, 0.07, 0.62]} />
              <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.75} transparent opacity={0.9} />
            </mesh>
            <mesh position={[1.45, 0, -0.35]}>
              <boxGeometry args={[1.55, 0.07, 0.62]} />
              <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.75} transparent opacity={0.9} />
            </mesh>
            <Html position={[1.85, 0.55, -0.45]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
              <span className="whitespace-nowrap rounded bg-cyan-400 px-1.5 py-0.5 font-display text-[9px] font-bold text-[#0a1e3c] uppercase shadow">
                TRIM / ELEVATOR
              </span>
            </Html>
          </group>
        </>
      )}
    </group>
  );
}
