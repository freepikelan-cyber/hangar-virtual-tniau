import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useHangarStore } from '../../store/useHangarStore';

/**
 * Lapisan Visualisasi Edukatif 3D khusus G-SUIT (Anti-G Suit):
 * 1. Aliran partikel udara bertekanan (3-7 bar) bergerak dari Konektor Anti-G menyusuri Selang Pneumatik ke 5 Kantung
 * 2. Panah 3D Tekanan Kompresi (→ ←) menekan Perut, Paha, & Betis saat G-Force meningkat (4G / 9G)
 * 3. Panah 3D Aliran Darah Merah Mengalir ke Atas menuju Otak (mencegah G-LOC!)
 * 4. Label Komponen 3D ringkas & informatif sesuai referensi TNI AU
 */
export function GSuitEduLayer() {
  const selectedId = useHangarStore((s) => s.selectedId);
  const gForceLevel = useHangarStore((s) => s.gForceLevel);
  const flightMode = useHangarStore((s) => s.flightMode);

  const airDotRefs = useRef<(THREE.Mesh | null)[]>([]);
  const bloodArrowRefs = useRef<(THREE.Group | null)[]>([]);
  const compRingRefs = useRef<(THREE.Group | null)[]>([]);

  const hosePath = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-1.46, 1.55, 0.16),
        new THREE.Vector3(-1.54, 2.75, 0.18),
        new THREE.Vector3(-1.52, 4.25, 0.22),
        new THREE.Vector3(-1.42, 5.65, 0.3),
        new THREE.Vector3(-1.12, 6.45, 0.36),
        new THREE.Vector3(0.0, 6.2, 0.72),
      ]),
    [],
  );

  useFrame((state) => {
    if (selectedId !== 'gsuit') return;
    const t = state.clock.elapsedTime;
    const isSim9G = flightMode === 'engineSim';
    const effectiveG = isSim9G ? (t % 6 < 2 ? 4 : 9) : gForceLevel;
    const pressure = effectiveG === 1 ? 0.15 : effectiveG === 4 ? 0.62 : 1.0;

    // 1. Partikel aliran udara bertekanan menyusuri selang pneumatik menuju kantung perut
    airDotRefs.current.forEach((dot, i) => {
      if (!dot) return;
      const speed = effectiveG === 1 ? 0.22 : effectiveG === 4 ? 0.65 : 1.15;
      const u = (t * speed + i / 8) % 1;
      const pt = hosePath.getPoint(u);
      dot.position.copy(pt);
      dot.visible = effectiveG > 1 || isSim9G;
      const s = 0.7 + pressure * 0.6;
      dot.scale.setScalar(s);
    });

    // 2. Panah aliran darah merah mengalir ke ATAS menuju otak (Anti G-LOC!)
    bloodArrowRefs.current.forEach((grp, i) => {
      if (!grp) return;
      const speed = effectiveG === 1 ? 0.25 : effectiveG === 4 ? 0.55 : 0.9;
      const u = (t * speed + i / 6) % 1;
      const y = THREE.MathUtils.lerp(2.2, 9.4, u);
      const xOff = i % 2 === 0 ? -0.35 : 0.35;
      grp.position.set(xOff * (1 - u * 0.65), y, 0.95);
      grp.visible = effectiveG >= 4 || isSim9G;
      const pulse = 0.85 + Math.sin(t * 6 + i) * 0.15;
      grp.scale.setScalar(pulse * (effectiveG === 9 ? 1.12 : 0.88));
    });

    // 3. Cincin & panah kompresi menekan masuk (→ ←) pada Perut, Paha, & Betis
    compRingRefs.current.forEach((grp, i) => {
      if (!grp) return;
      grp.visible = effectiveG >= 4 || isSim9G;
      const squeeze = 1.06 - Math.sin(t * (effectiveG === 9 ? 7 : 4) + i) * 0.08;
      grp.scale.set(squeeze, 1, squeeze);
    });
  });

  if (selectedId !== 'gsuit') return null;

  const isSim9G = flightMode === 'engineSim';
  const showPressure = gForceLevel >= 4 || isSim9G;

  return (
    <group name="gsuit-edu-layer">
      {/* 1. Partikel Aliran Udara Pneumatik (3-7 Bar) sepanjang Selang Anti-G */}
      {Array.from({ length: 8 }, (_, i) => (
        <mesh
          key={`air-${i}`}
          ref={(el) => {
            airDotRefs.current[i] = el;
          }}
          visible={false}
        >
          <sphereGeometry args={[0.11, 12, 12]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>
      ))}

      {/* 2. Panah Kompresi 3D (→ ←) Menekan Perut, Paha & Betis saat G-Force Tinggi */}
      {[
        { y: 6.18, r: 1.55, label: 'perut' },
        { y: 4.92, r: 1.52, label: 'paha' },
        { y: 2.38, r: 1.48, label: 'betis' },
      ].map((zone, idx) => (
        <group
          key={zone.label}
          ref={(el) => {
            compRingRefs.current[idx] = el;
          }}
          position={[0, zone.y, 0.15]}
          visible={false}
        >
          {[-1, 1].map((side) => (
            <group key={side} position={[side * zone.r, 0, 0.25]} rotation={[0, 0, side > 0 ? Math.PI / 2 : -Math.PI / 2]}>
              <mesh position={[0, 0.28, 0]}>
                <cylinderGeometry args={[0.045, 0.045, 0.42, 8]} />
                <meshBasicMaterial color="#00e5ff" />
              </mesh>
              <mesh position={[0, 0.02, 0]} rotation={[Math.PI, 0, 0]}>
                <coneGeometry args={[0.12, 0.26, 10]} />
                <meshBasicMaterial color="#00e5ff" />
              </mesh>
            </group>
          ))}
        </group>
      ))}

      {/* 3. Panah Aliran Darah Merah Mengalir Naik ke Otak (Anti G-LOC!) */}
      {Array.from({ length: 6 }, (_, i) => (
        <group
          key={`blood-${i}`}
          ref={(el) => {
            bloodArrowRefs.current[i] = el;
          }}
          visible={false}
        >
          <mesh position={[0, -0.14, 0]}>
            <cylinderGeometry args={[0.036, 0.036, 0.28, 8]} />
            <meshBasicMaterial color="#fb7185" />
          </mesh>
          <mesh position={[0, 0.08, 0]}>
            <coneGeometry args={[0.095, 0.22, 10]} />
            <meshBasicMaterial color="#f43f5e" />
          </mesh>
        </group>
      ))}

      {/* 4. Label Komponen 3D Informatif (Diposisikan jauh di sisi luar agar 100% bebas dari figur & animasi!) */}
      <Html position={[2.85, 6.45, 0.2]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
        <span className="whitespace-nowrap rounded-md border border-cyan-400/70 bg-[#081933]/88 px-2 py-0.5 font-display text-[9px] font-bold tracking-wider text-cyan-300 uppercase shadow">
          Kantung Perut
        </span>
      </Html>
      <Html position={[2.85, 4.92, 0.2]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
        <span className="whitespace-nowrap rounded-md border border-cyan-400/70 bg-[#081933]/88 px-2 py-0.5 font-display text-[9px] font-bold tracking-wider text-cyan-300 uppercase shadow">
          Kantung Paha
        </span>
      </Html>
      <Html position={[2.85, 2.38, 0.2]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
        <span className="whitespace-nowrap rounded-md border border-cyan-400/70 bg-[#081933]/88 px-2 py-0.5 font-display text-[9px] font-bold tracking-wider text-cyan-300 uppercase shadow">
          Kantung Betis
        </span>
      </Html>
      <Html position={[-2.95, 3.65, 0.2]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
        <span className="whitespace-nowrap rounded-md border border-[#ffb703]/70 bg-[#081933]/88 px-2 py-0.5 font-display text-[9px] font-bold tracking-wider text-[#ffb703] uppercase shadow">
          Selang Pneumatik
        </span>
      </Html>
      {showPressure && (
        <Html position={[0, 11.15, 0.2]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <span className="whitespace-nowrap rounded-full border border-rose-400 bg-rose-950/90 px-2.5 py-0.5 font-display text-[9px] font-bold tracking-wider text-rose-200 uppercase shadow">
            ↑ ALIRAN DARAH KE OTAK TERJAGA (ANTI G-LOC)
          </span>
        </Html>
      )}
    </group>
  );
}
