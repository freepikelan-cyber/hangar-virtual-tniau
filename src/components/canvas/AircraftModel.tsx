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
  emissiveIntensity: number;
}

const savedMaterials = new WeakMap<THREE.Material, SavedMatProps>();

function applyVisualModes(root: THREE.Object3D, cutaway: boolean, wireframe: boolean) {
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
          emissiveIntensity: 'emissiveIntensity' in std ? std.emissiveIntensity : 0,
        });
      }
      const orig = savedMaterials.get(mat)!;
      const std = mat as THREE.MeshStandardMaterial;

      if (role === 'internal') {
        mesh.visible = cutaway;
        mat.transparent = false;
        mat.opacity = 1;
        mat.depthWrite = true;
        if ('wireframe' in std) std.wireframe = wireframe;
        if ('emissive' in std) {
          std.emissive = new THREE.Color(cutaway ? '#3898ff' : '#000000');
          std.emissiveIntensity = cutaway ? 0.5 : orig.emissiveIntensity;
        }
      } else if (role === 'cockpit') {
        mesh.visible = true;
        if ('wireframe' in std) std.wireframe = wireframe;
      } else if (role === 'decal') {
        mesh.visible = !cutaway;
        if ('wireframe' in std) std.wireframe = wireframe;
      } else if (role === 'glass') {
        mat.transparent = true;
        mat.opacity = cutaway ? 0.16 : orig.opacity;
        mat.depthWrite = false;
        if ('wireframe' in std) std.wireframe = wireframe;
      } else {
        if (cutaway) {
          mat.transparent = true;
          mat.opacity = 0.2;
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
  const wireframe = useHangarStore((s) => s.wireframe);
  const activeHotspot = useHangarStore((s) => s.activeHotspot);
  const autoRotate = useHangarStore((s) => s.autoRotate);
  const flightMode = useHangarStore((s) => s.flightMode);
  const flightNonce = useHangarStore((s) => s.flightNonce);
  const setFlightState = useHangarStore((s) => s.setFlightState);
  const setFlightLabel = useHangarStore((s) => s.setFlightLabel);

  const rootRef = useRef<THREE.Group>(null);
  const phaseTime = useRef(0);
  const gearRetract = useRef(0); // 0 = roda turun/keluar, 1 = roda masuk penuh di dalam badan
  const currentX = useRef(0);
  const currentY = useRef(0);
  const currentZ = useRef(0);

  const procedural = useMemo(() => getProceduralAircraft(unit.id), [unit.id]);

  // Reset saat berganti pesawat
  useEffect(() => {
    phaseTime.current = 0;
    gearRetract.current = 0;
    currentX.current = 0;
    currentY.current = 0;
    currentZ.current = 0;
    if (rootRef.current) {
      rootRef.current.rotation.set(0, 0, 0);
      rootRef.current.position.set(0, 0, 0);
    }
    const gearObj = procedural.group.getObjectByName('landing-gear');
    if (gearObj) {
      gearObj.visible = true;
      gearObj.position.y = 0;
      gearObj.scale.set(1, 1, 1);
    }
  }, [unit.id, procedural.group]);

  // Reset timer fase saat tombol Take Off / Landing / Simulasi Mesin ditekan
  useEffect(() => {
    phaseTime.current = 0;
    if (flightMode === 'landing' && currentY.current < 1.2) {
      currentX.current = 0;
      currentY.current = 3.1;
      currentZ.current = -2.2;
      gearRetract.current = 1;
      if (rootRef.current) {
        rootRef.current.position.set(0, 3.1, -2.2);
      }
    }
  }, [flightMode, flightNonce]);

  // Auto-cutaway pintar saat pengguna mengklik pin bertipe "Jeroan"
  const activeItem = activeHotspot !== null ? unit.hotspots.find((h) => h.id === activeHotspot) : null;
  const showCutaway = activeItem?.partType === 'Jeroan';

  useEffect(() => {
    applyVisualModes(procedural.group, showCutaway, wireframe);
  }, [procedural.group, showCutaway, wireframe]);

  const isEngineVisualActive =
    flightMode === 'engineSim' ||
    flightMode === 'takeoff' ||
    (flightMode === 'landing' && phaseTime.current < 3.4);

  useFrame((state, delta) => {
    if (!rootRef.current) return;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    phaseTime.current += dt;
    const pt = phaseTime.current;
    const isHeli = unit.category === 'Helikopter';
    const isHeavy = unit.category === 'Angkut & VIP';

    let targetX = 0;
    let targetY = 0;
    let targetZ = 0;
    let targetPitch = 0;
    let targetRoll = 0;
    let targetYawOffset = 0;
    let targetGear = 0; // 0 = keluar, 1 = masuk

    if (flightMode === 'takeoff') {
      if (pt < 1.3) {
        // Fase 1: Akselerasi di landasan (mesin full power, roda masih menapak)
        const p = pt / 1.3;
        targetY = isHeli ? p * 0.5 : 0;
        targetZ = isHeli ? 0 : THREE.MathUtils.lerp(-1.4, 0.4, p * p);
        targetPitch = isHeli ? 0.03 * p : -0.04 * p;
        targetGear = 0;
        setFlightLabel(isHeli ? 'TAKE OFF • ROTOR FULL POWER' : 'TAKE OFF • AKSELERASI LANDASAN');
      } else if (pt < 3.2) {
        // Fase 2: Rotation & Climb + Roda pendarat otomatis masuk ke dalam badan!
        const p = (pt - 1.3) / 1.9;
        const ease = p * p * (3 - 2 * p);
        targetY = isHeli ? THREE.MathUtils.lerp(0.5, 2.7, ease) : THREE.MathUtils.lerp(0, 2.55, ease);
        targetZ = isHeli ? 0 : THREE.MathUtils.lerp(0.4, 0, ease);
        targetPitch = isHeli ? 0.06 * Math.sin(p * Math.PI) : -0.22 * Math.sin(p * Math.PI * 0.85);
        targetGear = p > 0.25 ? 1 : 0;
        setFlightLabel('TAKE OFF • MENGUDARA & RODA MASUK');
      } else {
        // Fase 3: Terbang jelajah stabil, roda tertutup penuh di dalam badan
        targetY = (isHeli ? 2.7 : 2.55) + Math.sin(t * 2.0) * 0.14;
        targetZ = 0;
        targetPitch = (isHeli ? 0.03 : -0.04) + Math.sin(t * 1.3) * 0.015;
        targetRoll = Math.cos(t * 1.5) * 0.035;
        targetGear = 1;
        setFlightLabel('TERBANG • RODA PENDARAT TERTUTUP');
      }
    } else if (flightMode === 'landing') {
      if (pt < 1.6) {
        // Fase 1: Pendekatan dari udara + roda pendarat otomatis turun/keluar!
        const p = pt / 1.6;
        const ease = p * p * (3 - 2 * p);
        targetY = THREE.MathUtils.lerp(3.1, 1.15, ease);
        targetZ = isHeli ? 0 : THREE.MathUtils.lerp(-2.2, -0.5, ease);
        targetPitch = isHeli ? -0.06 : 0.05;
        targetGear = 0;
        setFlightLabel('LANDING • PENDEKATAN & RODA KELUAR');
      } else if (pt < 3.2) {
        // Fase 2: Flare (hidung sedikit mendongak) & Touchdown halus ke landasan
        const p = (pt - 1.6) / 1.6;
        const ease = p * p * (3 - 2 * p);
        targetY = THREE.MathUtils.lerp(1.15, 0, ease);
        targetZ = isHeli ? 0 : THREE.MathUtils.lerp(-0.5, 0.25, ease);
        targetPitch = isHeli ? THREE.MathUtils.lerp(-0.06, 0, ease) : -0.13 * Math.sin(p * Math.PI);
        targetGear = 0;
        setFlightLabel('LANDING • TOUCHDOWN LANDASAN');
      } else if (pt < 4.2) {
        // Fase 3: Suspensi & pengereman di landasan
        const p = (pt - 3.2) / 1.0;
        targetY = Math.sin(p * Math.PI) * 0.04;
        targetZ = THREE.MathUtils.lerp(0.25, 0, p);
        targetPitch = 0;
        targetGear = 0;
        setFlightLabel('LANDING SELESAI • PARKIR');
      } else {
        targetY = 0;
        targetZ = 0;
        targetGear = 0;
        setFlightState('parked', null);
      }
    } else if (flightMode === 'engineSim') {
      // Simulasi Mesin: manuver udara dinamis (belok kanan, belok kiri, menanjak atas, menukik bawah) + roda masuk!
      const cycle = pt % 16;
      const bankAmp = isHeavy ? 0.22 : isHeli ? 0.2 : 0.44;
      const pitchAmp = isHeavy ? 0.14 : isHeli ? 0.12 : 0.26;
      const baseH = Math.max(2.1, procedural.hoverHeight + 0.9);
      targetGear = 1;

      if (cycle < 4) {
        // Fase 1: Manuver Belok Kanan (Right Bank)
        const s = Math.sin((cycle / 4) * Math.PI);
        targetX = 1.9 * s;
        targetY = baseH + 0.25 * s;
        targetRoll = -bankAmp * s;
        targetPitch = -0.05 * s;
        targetYawOffset = -0.18 * s;
        setFlightLabel('SIMULASI MESIN • MANUVER BELOK KANAN');
      } else if (cycle < 8) {
        // Fase 2: Manuver Belok Kiri (Left Bank)
        const s = Math.sin(((cycle - 4) / 4) * Math.PI);
        targetX = -1.9 * s;
        targetY = baseH + 0.25 * s;
        targetRoll = bankAmp * s;
        targetPitch = -0.05 * s;
        targetYawOffset = 0.18 * s;
        setFlightLabel('SIMULASI MESIN • MANUVER BELOK KIRI');
      } else if (cycle < 12) {
        // Fase 3: Manuver Menanjak ke Atas (Climb)
        const s = Math.sin(((cycle - 8) / 4) * Math.PI);
        targetX = 0;
        targetY = baseH + 1.35 * s;
        targetZ = 0.7 * s;
        targetPitch = -pitchAmp * s;
        targetRoll = Math.sin(t * 2) * 0.04;
        setFlightLabel('SIMULASI MESIN • MANUVER MENANJAK (ATAS)');
      } else {
        // Fase 4: Manuver Menukik Halus ke Bawah (Descend)
        const s = Math.sin(((cycle - 12) / 4) * Math.PI);
        targetX = 0;
        targetY = Math.max(1.25, baseH - 0.85 * s);
        targetZ = -0.6 * s;
        targetPitch = pitchAmp * 0.72 * s;
        targetRoll = Math.cos(t * 2) * 0.04;
        setFlightLabel('SIMULASI MESIN • MANUVER MENUKIK (BAWAH)');
      }
    } else {
      // Parked di landasan
      targetX = 0;
      targetY = 0;
      targetZ = 0;
      targetPitch = 0;
      targetRoll = 0;
      targetYawOffset = 0;
      targetGear = 0;
    }

    // Interpolasi posisi & rotasi pesawat
    const posSpeed = flightMode === 'landing' && pt < 0.15 ? 12 : 3.4;
    currentX.current = THREE.MathUtils.lerp(currentX.current, targetX, Math.min(1, dt * posSpeed));
    currentY.current = THREE.MathUtils.lerp(currentY.current, targetY, Math.min(1, dt * posSpeed));
    currentZ.current = THREE.MathUtils.lerp(currentZ.current, targetZ, Math.min(1, dt * posSpeed));

    rootRef.current.position.x = currentX.current;
    rootRef.current.position.y = currentY.current;
    rootRef.current.position.z = currentZ.current;
    rootRef.current.rotation.x = THREE.MathUtils.lerp(rootRef.current.rotation.x, targetPitch, Math.min(1, dt * 3.8));
    rootRef.current.rotation.z = THREE.MathUtils.lerp(rootRef.current.rotation.z, targetRoll, Math.min(1, dt * 3.8));

    if (autoRotate) {
      rootRef.current.rotation.y += dt * 0.42;
    } else {
      rootRef.current.rotation.y = THREE.MathUtils.lerp(rootRef.current.rotation.y, targetYawOffset, Math.min(1, dt * 3.2));
    }

    // Animasi halus roda pendarat masuk/keluar ke dalam badan pesawat
    gearRetract.current = THREE.MathUtils.lerp(gearRetract.current, targetGear, Math.min(1, dt * 3.2));
    const gearObj = procedural.group.getObjectByName('landing-gear');
    if (gearObj) {
      const r = gearRetract.current;
      gearObj.visible = r < 0.96;
      gearObj.position.y = r * 0.78;
      gearObj.scale.set(1 - r * 0.25, Math.max(0.01, 1 - r * 0.94), 1 - r * 0.25);
    }
  });

  return (
    <group ref={rootRef} name="aircraft-root">
      <primitive object={procedural.group} />
      <EffectsLayer
        nozzles={procedural.nozzles}
        spinners={procedural.spinners}
        navLights={procedural.navLights}
        glowMats={procedural.glowMats}
        engineSim={isEngineVisualActive}
        rotorWash={procedural.rotorWash}
      />
      <HotspotMarkers hotspots={unit.hotspots} />
    </group>
  );
}
