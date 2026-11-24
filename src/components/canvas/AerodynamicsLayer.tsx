import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useHangarStore, useSelectedUnit } from '../../store/useHangarStore';

interface ForceArrowProps {
  dir: [number, number, number];
  origin: [number, number, number];
  color: string;
  label: string;
  sublabel: string;
  lengthRef: React.MutableRefObject<number>;
}

/** Panah vektor gaya aerodinamika 3D (Lift, Weight, Thrust, Drag) yang panjangnya berubah dinamis. */
function ForceArrow3D({ dir, origin, color, label, sublabel, lengthRef }: ForceArrowProps) {
  const groupRef = useRef<THREE.Group>(null);
  const shaftRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const labelRef = useRef<THREE.Group>(null);

  const quat = useMemo(() => {
    const v = new THREE.Vector3(...dir).normalize();
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v);
  }, [dir]);

  useFrame((_, delta) => {
    const targetLen = Math.max(1.2, lengthRef.current);
    if (shaftRef.current && headRef.current && labelRef.current) {
      const cur = shaftRef.current.scale.y;
      const next = THREE.MathUtils.lerp(cur, targetLen, Math.min(1, delta * 6));
      shaftRef.current.scale.y = next;
      shaftRef.current.position.y = next * 0.5;
      headRef.current.position.y = next + 0.32;
      labelRef.current.position.y = next + 0.95;
    }
  });

  return (
    <group ref={groupRef} position={origin} quaternion={quat}>
      <mesh ref={shaftRef} position={[0, 1, 0]}>
        <cylinderGeometry args={[0.075, 0.075, 1, 14]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.85} roughness={0.25} />
      </mesh>
      <mesh ref={headRef} position={[0, 2.32, 0]}>
        <coneGeometry args={[0.24, 0.64, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.95} roughness={0.2} />
      </mesh>
      <group ref={labelRef} position={[0, 2.95, 0]}>
        <Html center zIndexRange={[18, 0]} style={{ pointerEvents: 'none' }}>
          <div
            className="whitespace-nowrap rounded-md border px-2 py-0.5 font-display text-[10px] font-bold tracking-wider uppercase shadow-lg backdrop-blur-sm"
            style={{
              backgroundColor: 'rgba(10, 30, 60, 0.88)',
              borderColor: color,
              color,
            }}
          >
            {label} <span className="text-slate-200 font-normal">• {sublabel}</span>
          </div>
        </Html>
      </group>
    </group>
  );
}

/**
 * Lapisan Visualisasi 3D Aerodinamika:
 * - 4 Vektor Gaya Terbang (LIFT, WEIGHT, THRUST, DRAG) real-time
 * - Aliran Udara 3D (Bernoulli Streamlines) melewati atas & bawah sayap
 * - Visualisasi 3D Defleksi Flap (0° / 15° / 35°) & Trim Elevator (-5° / 0° / +8°)
 */
export function AerodynamicsLayer() {
  const unit = useSelectedUnit();
  const aeroMode = useHangarStore((s) => s.aeroMode);
  const flapAngle = useHangarStore((s) => s.flapAngle);
  const trimAngle = useHangarStore((s) => s.trimAngle);
  const flightMode = useHangarStore((s) => s.flightMode);

  const liftLen = useRef(2.4);
  const weightLen = useRef(2.2);
  const thrustLen = useRef(2.4);
  const dragLen = useRef(1.8);

  const leftFlapRef = useRef<THREE.Group>(null);
  const rightFlapRef = useRef<THREE.Group>(null);
  const trimRef = useRef<THREE.Group>(null);
  const flowRefs = useRef<(THREE.Mesh | null)[]>([]);

  const isEquipment = unit.id === 'gsuit' || unit.id === 'pilot-helmet';
  const isHeli = unit.category === 'Helikopter';
  const isHeavy = unit.category === 'Angkut & VIP';

  // Titik penempatan Flap & Trim yang pas secara visual untuk tiap tipe pesawat
  const wingY = isHeavy ? 2.45 : 1.72;
  const flapZ = isHeavy ? -0.95 : -1.55;
  const flapX = isHeavy ? 2.95 : 2.35;
  const tailY = isHeavy ? 2.15 : 1.75;
  const tailZ = isHeavy ? -6.35 : -5.65;

  useFrame((state, delta) => {
    if (!aeroMode || isEquipment) return;
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.05);

    // Hitung Flap & Trim efektif (otomatis saat Take Off / Landing, manual saat parkir/simulasi)
    let effFlap = flapAngle;
    let effTrim = trimAngle;
    let thrustBoost = 0;

    if (flightMode === 'takeoff') {
      effFlap = 15;
      effTrim = 8;
      thrustBoost = 1.6;
    } else if (flightMode === 'landing') {
      effFlap = 35;
      effTrim = 8;
      thrustBoost = 0.4;
    } else if (flightMode === 'engineSim') {
      thrustBoost = 1.2;
    }

    // Update panjang 4 vektor gaya secara real-time sesuai fisika aerodinamika
    const flapLiftBonus = effFlap === 35 ? 1.15 : effFlap === 15 ? 0.65 : 0;
    const flapDragBonus = effFlap === 35 ? 1.35 : effFlap === 15 ? 0.5 : 0;
    const trimLiftBonus = effTrim > 0 ? 0.35 : effTrim < 0 ? -0.25 : 0;

    liftLen.current = 2.0 + flapLiftBonus + trimLiftBonus + (flightMode !== 'parked' ? 0.8 : 0);
    weightLen.current = 2.2;
    thrustLen.current = 1.8 + thrustBoost;
    dragLen.current = 1.4 + flapDragBonus + (flightMode !== 'parked' ? 0.5 : 0);

    // Animasi halus sudut defleksi Flap (positif = turun ke bawah)
    const flapRad = THREE.MathUtils.degToRad(effFlap);
    if (leftFlapRef.current) {
      leftFlapRef.current.rotation.x = THREE.MathUtils.lerp(leftFlapRef.current.rotation.x, flapRad, Math.min(1, dt * 6));
    }
    if (rightFlapRef.current) {
      rightFlapRef.current.rotation.x = THREE.MathUtils.lerp(rightFlapRef.current.rotation.x, flapRad, Math.min(1, dt * 6));
    }

    // Animasi halus sudut Trim / Elevator (Nose Up = trailing edge naik -> rotasi X negatif)
    const trimRad = THREE.MathUtils.degToRad(-effTrim * 2.2);
    if (trimRef.current) {
      trimRef.current.rotation.x = THREE.MathUtils.lerp(trimRef.current.rotation.x, trimRad, Math.min(1, dt * 6));
    }

    // Animasi aliran udara Bernoulli (bergerak dari hidung +Z ke belakang -Z melewati sayap)
    const flowSpeed = flightMode === 'parked' ? 5.5 : 13.5;
    flowRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const offset = (t * flowSpeed + i * 2.1) % 10;
      const z = 4.8 - offset;
      // Aliran udara atas melengkung naik melewati airfoil sayap lalu turun mengikuti Flap (downwash!)
      const overWing = Math.exp(-Math.pow((z + 0.2) * 0.45, 2));
      const downwash = z < flapZ ? -(effFlap / 35) * 0.75 * Math.min(1, (flapZ - z) * 0.4) : 0;
      mesh.position.z = z;
      mesh.position.y = wingY + 0.38 + overWing * 0.55 + downwash;
    });
  });

  if (!aeroMode || isEquipment) return null;

  return (
    <group name="aerodynamics-3d-layer">
      {/* 4 Vektor Gaya Utama Terbang */}
      <ForceArrow3D
        dir={[0, 1, 0]}
        origin={[0, isHeli ? 3.55 : 2.55, 0.2]}
        color="#10b981"
        label="LIFT"
        sublabel="Gaya Angkat"
        lengthRef={liftLen}
      />
      <ForceArrow3D
        dir={[0, -1, 0]}
        origin={[0, 0.9, 0.2]}
        color="#f59e0b"
        label="WEIGHT"
        sublabel="Gaya Berat"
        lengthRef={weightLen}
      />
      <ForceArrow3D
        dir={[0, 0, 1]}
        origin={[0, 1.8, 5.8]}
        color="#38bdf8"
        label="THRUST"
        sublabel="Gaya Dorong"
        lengthRef={thrustLen}
      />
      <ForceArrow3D
        dir={[0, 0, -1]}
        origin={[0, 1.9, -6.8]}
        color="#fb7185"
        label="DRAG"
        sublabel="Gaya Hambat"
        lengthRef={dragLen}
      />

      {/* Partikel Aliran Udara 3D (Bernoulli Streamlines di kiri & kanan sayap) */}
      {[-3.4, -2.1, 2.1, 3.4].map((x, colIdx) =>
        [0, 1, 2].map((rowIdx) => {
          const idx = colIdx * 3 + rowIdx;
          return (
            <mesh
              key={idx}
              ref={(el) => {
                flowRefs.current[idx] = el;
              }}
              position={[x, wingY + 0.4, 3 - rowIdx * 3.2]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.025, 0.045, 1.55, 8]} />
              <meshBasicMaterial color="#38bdf8" transparent opacity={0.72} />
            </mesh>
          );
        }),
      )}

      {/* Visualisasi 3D Permukaan FLAP (Kiri & Kanan) & TRIM EKOR untuk pesawat sayap tetap */}
      {!isHeli && (
        <>
          {/* Flap Kiri */}
          <group ref={leftFlapRef} position={[-flapX, wingY, flapZ]}>
            <mesh position={[0, 0, -0.45]}>
              <boxGeometry args={[2.1, 0.08, 0.85]} />
              <meshStandardMaterial color="#ffb703" emissive="#ffb703" emissiveIntensity={0.65} transparent opacity={0.88} />
            </mesh>
            <Html position={[0, 0.35, -0.5]} center zIndexRange={[15, 0]} style={{ pointerEvents: 'none' }}>
              <span className="rounded bg-[#ffb703] px-1.5 py-0.5 font-display text-[9px] font-bold text-[#0a1e3c] uppercase shadow">
                FLAP {flapAngle}°
              </span>
            </Html>
          </group>

          {/* Flap Kanan */}
          <group ref={rightFlapRef} position={[flapX, wingY, flapZ]}>
            <mesh position={[0, 0, -0.45]}>
              <boxGeometry args={[2.1, 0.08, 0.85]} />
              <meshStandardMaterial color="#ffb703" emissive="#ffb703" emissiveIntensity={0.65} transparent opacity={0.88} />
            </mesh>
          </group>

          {/* Elevator / Trim Tab Ekor */}
          <group ref={trimRef} position={[0, tailY, tailZ]}>
            <mesh position={[-1.55, 0, -0.35]}>
              <boxGeometry args={[1.65, 0.07, 0.65]} />
              <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.7} transparent opacity={0.88} />
            </mesh>
            <mesh position={[1.55, 0, -0.35]}>
              <boxGeometry args={[1.65, 0.07, 0.65]} />
              <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.7} transparent opacity={0.88} />
            </mesh>
            <Html position={[0, 0.45, -0.45]} center zIndexRange={[15, 0]} style={{ pointerEvents: 'none' }}>
              <span className="rounded bg-cyan-400 px-1.5 py-0.5 font-display text-[9px] font-bold text-[#0a1e3c] uppercase shadow">
                TRIM {trimAngle > 0 ? `+${trimAngle}°` : `${trimAngle}°`}
              </span>
            </Html>
          </group>
        </>
      )}
    </group>
  );
}
