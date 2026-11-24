import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useHangarStore, useSelectedUnit } from '../../store/useHangarStore';

/**
 * Visualisasi 3D Interaktif Sistem Oksigen Pesawat (OBOGS — On-Board Oxygen Generating System):
 * 1. Bleed Air panas diambil dari kompresor mesin (partikel oranye mengalir ke depan)
 * 2. Unit Saringan Molekuler Zeolit OBOGS memisahkan Nitrogen (N₂ dibuang keluar)
 * 3. Oksigen murni ~93% (partikel biru-cyan berdenyut) dialirkan ke Regulator & Masker Pilot di Kokpit!
 */
export function OxygenSystemLayer() {
  const unit = useSelectedUnit();
  const oxygenMode = useHangarStore((s) => s.oxygenMode);
  const setFlightLabel = useHangarStore((s) => s.setFlightLabel);

  const timer = useRef(0);
  const bleedParticles = useRef<(THREE.Mesh | null)[]>([]);
  const o2Particles = useRef<(THREE.Mesh | null)[]>([]);
  const n2Particles = useRef<(THREE.Mesh | null)[]>([]);
  const cockpitHaloRef = useRef<THREE.Mesh>(null);

  const isEquipment = unit.id === 'gsuit' || unit.id === 'pilot-helmet';
  const isHeli = unit.category === 'Helikopter';
  const isHeavy = unit.category === 'Angkut & VIP';

  // Koordinat jalur pipa OBOGS yang otomatis menyesuaikan tipe pesawat
  const coords = useMemo(() => {
    if (isHeli) {
      return {
        engine: new THREE.Vector3(0, 2.75, -0.7),
        obogs: new THREE.Vector3(0, 2.72, 1.05),
        cockpit: new THREE.Vector3(0, 2.35, 3.05),
      };
    }
    if (isHeavy) {
      return {
        engine: new THREE.Vector3(2.2, 2.45, 0.2),
        obogs: new THREE.Vector3(0, 2.95, 2.45),
        cockpit: new THREE.Vector3(0, 2.75, 5.15),
      };
    }
    return {
      engine: new THREE.Vector3(0, 2.25, -3.25),
      obogs: new THREE.Vector3(0, 2.45, 0.55),
      cockpit: new THREE.Vector3(0, 2.55, 3.25),
    };
  }, [isHeli, isHeavy]);

  const { bleedCurve, o2Curve, bleedGeo, o2Geo } = useMemo(() => {
    const mid1 = new THREE.Vector3().lerpVectors(coords.engine, coords.obogs, 0.5);
    mid1.y += 0.45;
    const bCurve = new THREE.CatmullRomCurve3([coords.engine, mid1, coords.obogs]);

    const mid2 = new THREE.Vector3().lerpVectors(coords.obogs, coords.cockpit, 0.5);
    mid2.y += 0.35;
    const oCurve = new THREE.CatmullRomCurve3([coords.obogs, mid2, coords.cockpit]);

    return {
      bleedCurve: bCurve,
      o2Curve: oCurve,
      bleedGeo: new THREE.TubeGeometry(bCurve, 28, 0.065, 10, false),
      o2Geo: new THREE.TubeGeometry(oCurve, 28, 0.075, 10, false),
    };
  }, [coords]);

  useEffect(() => {
    return () => {
      bleedGeo.dispose();
      o2Geo.dispose();
    };
  }, [bleedGeo, o2Geo]);

  useEffect(() => {
    timer.current = 0;
    if (!oxygenMode) setFlightLabel(null);
  }, [oxygenMode, unit.id, setFlightLabel]);

  useFrame((state, delta) => {
    if (!oxygenMode || isEquipment) return;
    const t = state.clock.elapsedTime;
    timer.current += Math.min(delta, 0.05);
    const cycle = timer.current % 9;

    if (cycle < 3) {
      setFlightLabel('OBOGS • 1. UDARA BERTEKANAN (BLEED AIR) DIAMBIL DARI MESIN');
    } else if (cycle < 6) {
      setFlightLabel('OBOGS • 2. SARINGAN ZEOLIT MEMISAHKAN NITROGEN (N₂) → OKSIGEN 93%');
    } else {
      setFlightLabel('OBOGS • 3. OKSIGEN MURNI 93% DIALIRKAN KE MASKER PILOT DI KOKPIT');
    }

    // Animasi partikel Bleed Air (oranye) dari Mesin → OBOGS
    bleedParticles.current.forEach((m, i) => {
      if (!m) return;
      const u = (t * 0.55 + i / 5) % 1;
      m.position.copy(bleedCurve.getPointAt(u));
    });

    // Animasi partikel Oksigen Murni 93% (biru-cyan) dari OBOGS → Kokpit
    o2Particles.current.forEach((m, i) => {
      if (!m) return;
      const u = (t * 0.65 + i / 5) % 1;
      m.position.copy(o2Curve.getPointAt(u));
    });

    // Animasi gas Nitrogen (abu-ungu) dibuang ke samping dari unit OBOGS
    n2Particles.current.forEach((m, i) => {
      if (!m) return;
      const u = (t * 0.7 + i / 3) % 1;
      m.position.set(coords.obogs.x + 0.35 + u * 1.35, coords.obogs.y + 0.15 + u * 0.45, coords.obogs.z - u * 0.3);
      m.scale.setScalar(0.6 + u * 0.7);
    });

    // Denyut napas oksigen pada regulator kokpit
    if (cockpitHaloRef.current) {
      const s = 0.88 + Math.sin(t * 3.2) * 0.18;
      cockpitHaloRef.current.scale.setScalar(s);
    }
  });

  if (!oxygenMode || isEquipment) return null;

  return (
    <group name="oxygen-obogs-3d">
      {/* 1. Titik Kompresor Mesin (Sumber Bleed Air) */}
      <group position={coords.engine}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.38, 0.06, 12, 24]} />
          <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.85} />
        </mesh>
        <Html position={[0, 0.75, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <span className="whitespace-nowrap rounded border border-amber-400 bg-[#0a1e3c]/92 px-2 py-0.5 font-display text-[9px] font-bold tracking-wider text-amber-300 uppercase shadow">
            1. BLEED AIR MESIN
          </span>
        </Html>
      </group>

      {/* Pipa Bleed Air (Oranye) */}
      <mesh geometry={bleedGeo}>
        <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={0.45} transparent opacity={0.72} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh
          key={`b-${i}`}
          ref={(el) => {
            bleedParticles.current[i] = el;
          }}
        >
          <sphereGeometry args={[0.13, 12, 12]} />
          <meshBasicMaterial color="#fbbf24" />
        </mesh>
      ))}

      {/* 2. Unit Saringan Molekuler Zeolit OBOGS (2 Tabung Kembar) */}
      <group position={coords.obogs}>
        {[-0.22, 0.22].map((dx, i) => (
          <mesh key={i} position={[dx, 0.18, 0]}>
            <cylinderGeometry args={[0.18, 0.18, 0.72, 18]} />
            <meshStandardMaterial color="#06b6d4" emissive="#0891b2" emissiveIntensity={0.65} roughness={0.28} metalness={0.5} />
          </mesh>
        ))}
        <Html position={[-0.1, 0.95, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <span className="whitespace-nowrap rounded border border-cyan-400 bg-[#0a1e3c]/92 px-2 py-0.5 font-display text-[9px] font-bold tracking-wider text-cyan-300 uppercase shadow">
            2. UNIT OBOGS (ZEOLIT)
          </span>
        </Html>
      </group>

      {/* Buangan Gas Nitrogen (N₂) ke luar */}
      {[0, 1, 2].map((i) => (
        <mesh
          key={`n2-${i}`}
          ref={(el) => {
            n2Particles.current[i] = el;
          }}
        >
          <sphereGeometry args={[0.11, 10, 10]} />
          <meshBasicMaterial color="#94a3b8" transparent opacity={0.65} />
        </mesh>
      ))}

      {/* Pipa Oksigen Murni 93% (Biru-Cyan) */}
      <mesh geometry={o2Geo}>
        <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={0.65} transparent opacity={0.82} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh
          key={`o2-${i}`}
          ref={(el) => {
            o2Particles.current[i] = el;
          }}
        >
          <sphereGeometry args={[0.14, 12, 12]} />
          <meshBasicMaterial color="#7dd3fc" />
        </mesh>
      ))}

      {/* 3. Regulator & Masker Oksigen Pilot di Kokpit */}
      <group position={coords.cockpit}>
        <mesh ref={cockpitHaloRef}>
          <sphereGeometry args={[0.38, 20, 16]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.35} />
        </mesh>
        <Html position={[0, 0.85, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <span className="whitespace-nowrap rounded border border-sky-300 bg-[#0a1e3c]/92 px-2 py-0.5 font-display text-[9px] font-bold tracking-wider text-sky-200 uppercase shadow">
            3. OKSIGEN 93% → PILOT
          </span>
        </Html>
      </group>
    </group>
  );
}
