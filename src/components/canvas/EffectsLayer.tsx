import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { NavLightFx, NozzleFx, SpinnerFx } from '../../utils/proceduralBuilder';
import { flameTexture, radialGlowTexture } from '../../utils/textures';

interface EffectsLayerProps {
  nozzles: NozzleFx[];
  spinners: SpinnerFx[];
  navLights: NavLightFx[];
  glowMats: THREE.MeshStandardMaterial[];
  engineSim: boolean;
  rotorWash?: boolean;
}

function AfterburnerPlume({ nozzle, active }: { nozzle: NozzleFx; active: boolean }) {
  const outerRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const smokeRef = useRef<THREE.Points>(null);

  const outerTex = useMemo(() => flameTexture('#ff6b1a'), []);
  const innerTex = useMemo(() => flameTexture('#70e4ff'), []);
  const glowTex = useMemo(() => radialGlowTexture('rgba(255,255,255,0.9)', 'rgba(255,255,255,0)'), []);

  useEffect(() => {
    return () => {
      outerTex.dispose();
      innerTex.dispose();
      glowTex.dispose();
    };
  }, [outerTex, innerTex, glowTex]);

  const smokeCount = 32;
  const smokePositions = useMemo(() => {
    const arr = new Float32Array(smokeCount * 3);
    for (let i = 0; i < smokeCount; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 0.2;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 0.2;
      arr[i * 3 + 2] = -i * 0.22;
    }
    return arr;
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (nozzle.kind === 'smoke') {
      if (smokeRef.current && active) {
        const pos = smokeRef.current.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < smokeCount; i++) {
          let z = pos.getZ(i) - delta * 9.5;
          let x = pos.getX(i) + Math.sin(t * 5 + i) * delta * 0.25;
          let y = pos.getY(i) + Math.cos(t * 4 + i) * delta * 0.25;
          if (z < -7.5) {
            z = 0;
            x = (Math.random() - 0.5) * 0.14;
            y = (Math.random() - 0.5) * 0.14;
          }
          pos.setXYZ(i, x, y, z);
        }
        pos.needsUpdate = true;
      }
      return;
    }

    const flicker = 0.88 + Math.sin(t * 48) * 0.08 + Math.cos(t * 73) * 0.06;
    const lenScale = nozzle.kind === 'ab' ? 1 : 0.45;
    if (outerRef.current) {
      outerRef.current.scale.set(1, flicker * lenScale, 1);
    }
    if (innerRef.current) {
      innerRef.current.scale.set(0.95, (0.9 + Math.sin(t * 60) * 0.1) * lenScale, 0.95);
    }
    if (lightRef.current) {
      lightRef.current.intensity = active ? (nozzle.kind === 'ab' ? 8 * flicker : 2.5) : 0;
    }
  });

  if (!active) return null;

  if (nozzle.kind === 'smoke') {
    return (
      <group position={nozzle.pos}>
        <points ref={smokeRef}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" count={smokeCount} array={smokePositions} itemSize={3} />
          </bufferGeometry>
          <pointsMaterial
            map={glowTex}
            color="#f0f5ff"
            size={0.85}
            transparent
            opacity={0.55}
            depthWrite={false}
          />
        </points>
      </group>
    );
  }

  const length = nozzle.kind === 'ab' ? 3.4 : 1.6;
  return (
    <group position={nozzle.pos}>
      <mesh ref={outerRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -length / 2]}>
        <coneGeometry args={[nozzle.r * 1.15, length, 20, 1, true]} />
        <meshBasicMaterial
          map={outerTex}
          color={nozzle.kind === 'ab' ? '#ff7b24' : '#65c4ff'}
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={innerRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -length * 0.34]}>
        <coneGeometry args={[nozzle.r * 0.68, length * 0.68, 16, 1, true]} />
        <meshBasicMaterial
          map={innerTex}
          color="#a8f4ff"
          transparent
          opacity={0.95}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <pointLight ref={lightRef} position={[0, 0, -0.8]} color={nozzle.kind === 'ab' ? '#ff8833' : '#55ccff'} distance={7} decay={2} />
    </group>
  );
}

export function EffectsLayer({ nozzles, spinners, navLights, glowMats, engineSim, rotorWash }: EffectsLayerProps) {
  const navRefs = useRef<(THREE.Sprite | null)[]>([]);
  const washRef = useRef<THREE.Mesh>(null);
  const speedFactor = useRef(0);

  const glowTex = useMemo(() => radialGlowTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)'), []);
  useEffect(() => () => glowTex.dispose(), [glowTex]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const targetSpeed = engineSim ? 1 : 0;
    speedFactor.current = THREE.MathUtils.lerp(speedFactor.current, targetSpeed, Math.min(1, delta * 3.2));

    // Rotasi baling-baling / rotor + efek blur disc
    for (const sp of spinners) {
      const omega = sp.speed * speedFactor.current;
      if (omega > 0.05) {
        // Pivot berputar pada sumbu Z lokalnya (wrap sudah mengatur orientasi x/y/z)
        sp.obj.rotation.z += omega * delta;
      }
      if (sp.blur) {
        const showBlur = speedFactor.current > 0.25;
        sp.blur.visible = showBlur;
        const mat = sp.blur.material as THREE.MeshBasicMaterial;
        mat.opacity = showBlur ? Math.min(0.32, (speedFactor.current - 0.25) * 0.42) : 0;
      }
    }

    // Emissive dalam nozzle mesin
    for (const mat of glowMats) {
      mat.emissiveIntensity = speedFactor.current * (2.6 + Math.sin(t * 42) * 0.35);
    }

    // Lampu navigasi & strobe
    navLights.forEach((nl, i) => {
      const sprite = navRefs.current[i];
      if (!sprite) return;
      let scale = 0.28;
      if (nl.blink === 'strobe') {
        const pulse = Math.sin(t * 7.5);
        scale = pulse > 0.86 ? 0.65 : 0.08;
      } else if (nl.blink === 'beacon') {
        scale = 0.22 + 0.32 * (0.5 + 0.5 * Math.sin(t * 3.8));
      }
      sprite.scale.setScalar(scale);
    });

    // Efek angin rotor (downwash ring) untuk helikopter
    if (washRef.current) {
      washRef.current.visible = Boolean(rotorWash && speedFactor.current > 0.15);
      if (washRef.current.visible) {
        const phase = (t * 0.9) % 1;
        const s = 0.6 + phase * 1.4;
        washRef.current.scale.set(s, s, 1);
        const mat = washRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = (1 - phase) * 0.32 * speedFactor.current;
      }
    }
  });

  return (
    <group name="effects-layer">
      {nozzles.map((n, idx) => (
        <AfterburnerPlume key={idx} nozzle={n} active={engineSim} />
      ))}

      {navLights.map((nl, idx) => (
        <sprite
          key={idx}
          ref={(el) => {
            navRefs.current[idx] = el;
          }}
          position={nl.pos}
          scale={[0.3, 0.3, 1]}
        >
          <spriteMaterial
            map={glowTex}
            color={nl.color}
            transparent
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>
      ))}

      {rotorWash && (
        <mesh ref={washRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0.4]} visible={false}>
          <ringGeometry args={[3.4, 5.2, 48]} />
          <meshBasicMaterial
            color="#00d2ff"
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}
