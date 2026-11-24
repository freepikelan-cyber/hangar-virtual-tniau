import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useHangarStore, useSelectedUnit } from '../../store/useHangarStore';
import { getProceduralAircraft } from '../../utils/proceduralBuilder';
import { EffectsLayer } from './EffectsLayer';
import { HotspotMarkers } from './HotspotMarkers';

interface SavedMatProps {
  transparent: boolean;
  opacity: number;
  depthWrite: boolean;
  wireframe: boolean;
  emissiveIntensity: number;
}

const savedMaterials = new WeakMap<THREE.Material, SavedMatProps>();

function applyVisualModes(root: THREE.Object3D, xray: boolean, wireframe: boolean) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const role = (mesh.userData.role as string | undefined) ?? 'skin';
    if (role === 'blur') return;

    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      if (!mat) continue;
      if (!savedMaterials.has(mat)) {
        const std = mat as THREE.MeshStandardMaterial;
        savedMaterials.set(mat, {
          transparent: mat.transparent,
          opacity: mat.opacity,
          depthWrite: mat.depthWrite,
          wireframe: 'wireframe' in std ? Boolean(std.wireframe) : false,
          emissiveIntensity: 'emissiveIntensity' in std ? std.emissiveIntensity : 0,
        });
      }
      const orig = savedMaterials.get(mat)!;
      const std = mat as THREE.MeshStandardMaterial;

      if (role === 'internal') {
        mesh.visible = xray;
        mat.transparent = false;
        mat.opacity = 1;
        mat.depthWrite = true;
        if ('wireframe' in std) std.wireframe = wireframe;
        if ('emissive' in std) {
          std.emissive = new THREE.Color(xray ? '#00a8cc' : '#000000');
          std.emissiveIntensity = xray ? 0.45 : orig.emissiveIntensity;
        }
      } else if (role === 'cockpit') {
        // Detail kokpit (HUD, kursi lontar, panel instrumen) selalu terlihat melalui kaca kanopi
        mesh.visible = true;
        mat.transparent = false;
        mat.opacity = 1;
        mat.depthWrite = true;
        if ('wireframe' in std) std.wireframe = wireframe;
      } else if (role === 'decal') {
        mesh.visible = !xray;
        if ('wireframe' in std) std.wireframe = wireframe;
      } else if (role === 'glass') {
        mat.transparent = true;
        mat.opacity = xray ? 0.16 : orig.opacity;
        mat.depthWrite = false;
        if ('wireframe' in std) std.wireframe = wireframe;
      } else {
        if (xray) {
          mat.transparent = true;
          mat.opacity = 0.24;
          mat.depthWrite = false;
        } else {
          mat.transparent = orig.transparent;
          mat.opacity = orig.opacity;
          mat.depthWrite = orig.depthWrite;
        }
        if ('wireframe' in std) std.wireframe = wireframe;
      }
      mat.needsUpdate = true;
    }
  });
}

export function AircraftModel() {
  const unit = useSelectedUnit();
  const xray = useHangarStore((s) => s.xray);
  const wireframe = useHangarStore((s) => s.wireframe);
  const autoRotate = useHangarStore((s) => s.autoRotate);
  const engineSim = useHangarStore((s) => s.engineSim);

  const rootRef = useRef<THREE.Group>(null);
  const hoverY = useRef(0);

  const procedural = useMemo(() => getProceduralAircraft(unit.id), [unit.id]);

  // Reset rotasi & posisi saat berganti pesawat
  useEffect(() => {
    if (rootRef.current) {
      rootRef.current.rotation.set(0, 0, 0);
      rootRef.current.position.set(0, 0, 0);
    }
    hoverY.current = 0;
  }, [unit.id]);

  // Terapkan mode X-Ray & Wireframe ke model 3D
  useEffect(() => {
    applyVisualModes(procedural.group, xray, wireframe);
  }, [procedural.group, xray, wireframe]);

  useFrame((state, delta) => {
    if (!rootRef.current) return;
    const t = state.clock.elapsedTime;

    if (autoRotate) {
      rootRef.current.rotation.y += delta * 0.42;
    }

    const targetHover = engineSim ? procedural.hoverHeight : 0;
    hoverY.current = THREE.MathUtils.lerp(hoverY.current, targetHover, Math.min(1, delta * 2.4));

    const bob = engineSim ? Math.sin(t * 2.1) * 0.14 : 0;
    const targetPitch = engineSim ? (unit.category === 'Helikopter' ? 0.04 : -0.05) + Math.sin(t * 1.4) * 0.015 : 0;
    const targetRoll = engineSim ? Math.cos(t * 1.7) * 0.025 : 0;

    rootRef.current.position.y = hoverY.current + bob;
    rootRef.current.rotation.x = THREE.MathUtils.lerp(rootRef.current.rotation.x, targetPitch, Math.min(1, delta * 3));
    rootRef.current.rotation.z = THREE.MathUtils.lerp(rootRef.current.rotation.z, targetRoll, Math.min(1, delta * 3));
  });

  return (
    <group ref={rootRef} name="aircraft-root">
      <primitive object={procedural.group} />
      <EffectsLayer
        nozzles={procedural.nozzles}
        spinners={procedural.spinners}
        navLights={procedural.navLights}
        glowMats={procedural.glowMats}
        engineSim={engineSim}
        rotorWash={procedural.rotorWash}
      />
      <HotspotMarkers hotspots={unit.hotspots} />
    </group>
  );
}
