import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useHangarStore, useSelectedUnit } from '../../store/useHangarStore';
import { getProceduralAircraft } from '../../utils/proceduralBuilder';
import { customGlbRegistry, GLB_SLOTS, tryAutoLoadGlb } from '../../utils/glbEquipmentLoader';
import { invalidateSnapshot } from '../../utils/aircraftSnapshot';
import { aircraftAudio } from '../../utils/aircraftAudio';
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

function easeInOut(t: number) {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

export function AircraftModel() {
  const unit = useSelectedUnit();
  const wireframe = useHangarStore((s) => s.wireframe);
  const autoRotate = useHangarStore((s) => s.autoRotate);
  const soundEnabled = useHangarStore((s) => s.soundEnabled);
  const flightMode = useHangarStore((s) => s.flightMode);
  const flightNonce = useHangarStore((s) => s.flightNonce);
  const glbVer = useHangarStore((s) => s.glbVersion[unit.id] ?? 0);
  const setFlightState = useHangarStore((s) => s.setFlightState);
  const setFlightLabel = useHangarStore((s) => s.setFlightLabel);

  const [glbGroup, setGlbGroup] = useState<THREE.Group | null>(() => customGlbRegistry.get(unit.id) ?? null);

  const rootRef = useRef<THREE.Group>(null);
  const phaseTime = useRef(0);
  const gearRetract = useRef(0); // 0 = roda turun/keluar, 1 = roda masuk penuh di dalam badan
  const currentX = useRef(0);
  const currentY = useRef(0);
  const currentZ = useRef(0);

  const procedural = useMemo(() => getProceduralAircraft(unit.id), [unit.id]);

  // Muat otomatis model .GLB dari public/models/<id>.glb (khusus G-Suit & Helm) atau dari unggahan lokal
  useEffect(() => {
    let cancelled = false;
    const cached = customGlbRegistry.get(unit.id) ?? null;
    setGlbGroup(cached);

    if (!cached && GLB_SLOTS[unit.id]) {
      tryAutoLoadGlb(unit.id).then((loaded) => {
        if (!cancelled && loaded) {
          invalidateSnapshot(unit.id);
          setGlbGroup(loaded);
        }
      });
    }
    return () => {
      cancelled = true;
    };
  }, [unit.id, glbVer]);

  const activeGroup = glbGroup ?? procedural.group;

    // Reset saat berganti pesawat
  useEffect(() => {
    aircraftAudio.stop();
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

  // Inisialisasi posisi awal saat tombol Take Off atau Landing ditekan
  useEffect(() => {
    phaseTime.current = 0;
    const isHeli = unit.category === 'Helikopter';

    if (flightMode === 'takeoff') {
      // Posisi ancang-ancang di pangkal landasan (untuk pesawat sayap tetap)
      const startZ = isHeli ? 0 : -5.4;
      currentX.current = 0;
      currentY.current = 0;
      currentZ.current = startZ;
      gearRetract.current = 0;
      if (rootRef.current) {
        rootRef.current.position.set(0, 0, startZ);
        rootRef.current.rotation.set(0, 0, 0);
      }
    } else if (flightMode === 'landing') {
      // Mulai dari pendekatan akhir (Final Approach) di udara belakang-atas
      const startZ = isHeli ? -3.2 : -7.4;
      const startY = isHeli ? 4.2 : 4.6;
      currentX.current = 0;
      currentY.current = startY;
      currentZ.current = startZ;
      gearRetract.current = 1;
      if (rootRef.current) {
        rootRef.current.position.set(0, startY, startZ);
        rootRef.current.rotation.set(isHeli ? 0.04 : 0.06, 0, 0);
      }
    }
  }, [flightMode, flightNonce, unit.category]);

  // Pesawat selalu tampil utuh (tidak transparan/kerangka saat pin diklik)
  useEffect(() => {
    applyVisualModes(activeGroup, false, wireframe);
  }, [activeGroup, wireframe]);

  const isEngineVisualActive =
    flightMode === 'engineSim' ||
    flightMode === 'takeoff' ||
    (flightMode === 'landing' && phaseTime.current < 5.4);

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
    let gearSpeed = 2.8;

    if (flightMode === 'takeoff') {
      if (isHeli) {
        // TAKE OFF HELIKOPTER: Spool-up -> Hover vertikal -> Condong depan & climb -> Roda masuk
        if (pt < 1.8) {
          targetY = 0;
          targetPitch = 0;
          targetGear = 0;
          setFlightLabel('TAKE OFF • ROTOR SPOOL-UP FULL POWER');
        } else if (pt < 3.8) {
          const p = easeInOut((pt - 1.8) / 2.0);
          targetY = THREE.MathUtils.lerp(0, 1.8, p);
          targetPitch = -0.03 * Math.sin(p * Math.PI);
          targetGear = 0;
          setFlightLabel('TAKE OFF • ANGKAT VERTIKAL (HOVER)');
        } else if (pt < 6.0) {
          const p = easeInOut((pt - 3.8) / 2.2);
          targetY = THREE.MathUtils.lerp(1.8, 3.0, p);
          targetZ = THREE.MathUtils.lerp(0, 0.6, Math.sin(p * Math.PI));
          targetPitch = 0.09 * Math.sin(p * Math.PI);
          targetGear = p > 0.2 ? 1 : 0;
          setFlightLabel('TAKE OFF • MENANJAK & RODA MASUK');
        } else {
          targetY = 2.9 + Math.sin(t * 2.0) * 0.14;
          targetPitch = 0.04 + Math.sin(t * 1.3) * 0.015;
          targetRoll = Math.cos(t * 1.5) * 0.03;
          targetGear = 1;
          setFlightLabel('TERBANG JELAJAH • RODA TERTUTUP');
        }
      } else {
        // TAKE OFF PESAWAT SAYAP TETAP (5 FASE NYATA)
        if (pt < 1.5) {
          // Fase 1: Ancang-ancang di pangkal landasan (rem ditahan, mesin full power, getaran ringan)
          targetZ = -5.4;
          targetY = 0;
          targetPitch = Math.sin(t * 36) * 0.004;
          targetGear = 0;
          setFlightLabel('TAKE OFF • ANCANG-ANCANG & FULL POWER');
        } else if (pt < 3.8) {
          // Fase 2: Akselerasi melaju kencang sepanjang landasan (percepatan kuadratik!)
          const p = (pt - 1.5) / 2.3;
          targetZ = THREE.MathUtils.lerp(-5.4, 2.0, p * p);
          targetY = 0;
          targetPitch = -0.02 * p;
          targetGear = 0;
          setFlightLabel('TAKE OFF • AKSELERASI DI LANDASAN');
        } else if (pt < 5.2) {
          // Fase 3: Rotation (hidung mendongak Vr) & Liftoff dari landasan!
          const p = (pt - 3.8) / 1.4;
          const ease = easeInOut(p);
          targetZ = THREE.MathUtils.lerp(2.0, 4.4, ease);
          targetY = THREE.MathUtils.lerp(0, 1.55, p * p);
          targetPitch = (isHeavy ? -0.18 : -0.27) * Math.sin(Math.min(1, p * 1.2) * (Math.PI / 2));
          targetGear = 0;
          setFlightLabel('TAKE OFF • ROTATION & LIFTOFF');
        } else if (pt < 7.4) {
          // Fase 4: Initial Climb tinggi + Roda pendarat otomatis terlipat masuk ke dalam badan!
          const p = easeInOut((pt - 5.2) / 2.2);
          targetZ = THREE.MathUtils.lerp(4.4, 0, p);
          targetY = THREE.MathUtils.lerp(1.55, 3.05, p);
          targetPitch = THREE.MathUtils.lerp(isHeavy ? -0.18 : -0.26, -0.04, p);
          targetRoll = Math.sin(p * Math.PI) * -0.08;
          targetGear = 1;
          gearSpeed = 2.0;
          setFlightLabel('TAKE OFF • MENANJAK & RODA MASUK');
        } else {
          // Fase 5: Terbang jelajah stabil, roda tertutup penuh
          targetZ = 0;
          targetY = 2.95 + Math.sin(t * 2.0) * 0.14;
          targetPitch = -0.03 + Math.sin(t * 1.3) * 0.015;
          targetRoll = Math.cos(t * 1.5) * 0.035;
          targetGear = 1;
          setFlightLabel('TERBANG JELAJAH • RODA TERTUTUP');
        }
      }
    } else if (flightMode === 'landing') {
      if (isHeli) {
        // LANDING HELIKOPTER: Approach -> Roda keluar -> Flare hover rendah -> Touchdown vertikal
        if (pt < 2.2) {
          const p = easeInOut(pt / 2.2);
          targetZ = THREE.MathUtils.lerp(-3.2, 0, p);
          targetY = THREE.MathUtils.lerp(4.2, 1.5, p);
          targetPitch = 0.06 * (1 - p);
          targetGear = 0;
          gearSpeed = 2.2;
          setFlightLabel('LANDING • FINAL APPROACH & RODA KELUAR');
        } else if (pt < 4.5) {
          const p = easeInOut((pt - 2.2) / 2.3);
          targetZ = 0;
          targetY = THREE.MathUtils.lerp(1.5, 0, p);
          targetPitch = -0.08 * Math.sin(p * Math.PI);
          targetGear = 0;
          setFlightLabel('LANDING • HOVER & TOUCHDOWN VERTIKAL');
        } else if (pt < 5.6) {
          targetZ = 0;
          targetY = 0;
          targetPitch = 0;
          targetGear = 0;
          setFlightLabel('LANDING SELESAI • PARKIR');
        } else {
          setFlightState('parked', null);
        }
      } else {
        // LANDING PESAWAT SAYAP TETAP (5 FASE NYATA)
        if (pt < 2.4) {
          // Fase 1: Final Approach mengikuti glide slope 3° + Roda otomatis keluar!
          const p = pt / 2.4;
          targetZ = THREE.MathUtils.lerp(-7.4, -2.6, p);
          targetY = THREE.MathUtils.lerp(4.6, 1.45, p);
          targetPitch = 0.05; // hidung sedikit menukik mengikuti glide slope
          targetGear = 0;
          gearSpeed = 2.0;
          setFlightLabel('LANDING • FINAL APPROACH & RODA KELUAR');
        } else if (pt < 4.1) {
          // Fase 2: Landing Flare (hidung mendongak naik agar roda utama belakang menyentuh lebih dulu!)
          const p = (pt - 2.4) / 1.7;
          const ease = easeInOut(p);
          targetZ = THREE.MathUtils.lerp(-2.6, -0.4, p);
          targetY = THREE.MathUtils.lerp(1.45, 0.08, ease);
          targetPitch = THREE.MathUtils.lerp(0.05, isHeavy ? -0.13 : -0.2, ease);
          targetGear = 0;
          setFlightLabel('LANDING • FLARE (HIDUNG MENDONGAK)');
        } else if (pt < 5.1) {
          // Fase 3: Main Gear Touchdown + suspensi lembut + roda depan masih terangkat sesaat
          const p = (pt - 4.1) / 1.0;
          targetZ = THREE.MathUtils.lerp(-0.4, 1.7, p);
          targetY = Math.sin(p * Math.PI) * 0.045; // sedikit compression suspensi
          targetPitch = THREE.MathUtils.lerp(isHeavy ? -0.13 : -0.2, -0.09, p);
          targetGear = 0;
          setFlightLabel('LANDING • TOUCHDOWN RODA UTAMA');
        } else if (pt < 7.0) {
          // Fase 4: Nose Gear Down & Pengereman halus ke posisi parkir tengah
          const p = easeInOut((pt - 5.1) / 1.9);
          targetZ = THREE.MathUtils.lerp(1.7, 0, p);
          targetY = 0;
          targetPitch = THREE.MathUtils.lerp(-0.09, 0, Math.min(1, p * 1.8));
          targetGear = 0;
          setFlightLabel('LANDING • RODA DEPAN TURUN & PENGEREMAN');
        } else if (pt < 7.8) {
          targetZ = 0;
          targetY = 0;
          targetPitch = 0;
          targetGear = 0;
          setFlightLabel('LANDING SELESAI • PARKIR');
        } else {
          setFlightState('parked', null);
        }
      }
    } else if (flightMode === 'engineSim') {
      if (unit.id === 'gsuit') {
        // SIMULASI 9G khusus G-Suit: berdiri kokoh di platform, 5 kantung udara + selang mengembang & berpendar
        targetX = 0;
        targetY = 0;
        targetZ = 0;
        targetPitch = 0;
        targetRoll = 0;
        targetYawOffset = Math.sin(t * 0.6) * 0.28;
        targetGear = 0;
        const gCycle = pt % 8;
        if (gCycle < 2.5) {
          setFlightLabel('SIMULASI 9G • KATUP ANTI-G MEMOMPA UDARA (5G → 9G)');
        } else if (gCycle < 5.5) {
          setFlightLabel('SIMULASI 9G • KANTUNG PERUT, PAHA & BETIS MENEKAN PENUH');
        } else {
          setFlightLabel('SIMULASI 9G • ALIRAN DARAH KE OTAK STABIL (ANTI G-LOC)');
        }
      } else if (unit.id === 'pilot-helmet') {
        // SIMULASI HMDS khusus Helm Pilot: visor turun & proyeksi HUD hijau menyala
        targetX = 0;
        targetY = 0;
        targetZ = 0;
        targetPitch = 0;
        targetRoll = 0;
        targetYawOffset = Math.sin(t * 0.65) * 0.32;
        targetGear = 0;
        const hCycle = pt % 8;
        if (hCycle < 2.8) {
          setFlightLabel('SIMULASI HMDS • VISOR GELAP TURUN & PROYEKTOR HUD AKTIF');
        } else if (hCycle < 5.5) {
          setFlightLabel('SIMULASI HMDS • PELACAK GERAK KEPALA & KUNCI TARGET RUDAL');
        } else {
          setFlightLabel('SIMULASI HMDS • MASKER MBU-20/P SUPLAI OKSIGEN OBOGS AKTIF');
        }
      } else {
        // Simulasi Mesin: manuver udara dinamis (belok kanan, belok kiri, menanjak atas, menukik bawah) + roda masuk!
        const cycle = pt % 16;
        const bankAmp = isHeavy ? 0.22 : isHeli ? 0.2 : 0.44;
        const pitchAmp = isHeavy ? 0.14 : isHeli ? 0.12 : 0.26;
        const baseH = Math.max(2.1, procedural.hoverHeight + 0.9);
        targetGear = 1;

        if (cycle < 4) {
          const s = Math.sin((cycle / 4) * Math.PI);
          targetX = 1.9 * s;
          targetY = baseH + 0.25 * s;
          targetRoll = -bankAmp * s;
          targetPitch = -0.05 * s;
          targetYawOffset = -0.18 * s;
          setFlightLabel('SIMULASI MESIN • MANUVER BELOK KANAN');
        } else if (cycle < 8) {
          const s = Math.sin(((cycle - 4) / 4) * Math.PI);
          targetX = -1.9 * s;
          targetY = baseH + 0.25 * s;
          targetRoll = bankAmp * s;
          targetPitch = -0.05 * s;
          targetYawOffset = 0.18 * s;
          setFlightLabel('SIMULASI MESIN • MANUVER BELOK KIRI');
        } else if (cycle < 12) {
          const s = Math.sin(((cycle - 8) / 4) * Math.PI);
          targetX = 0;
          targetY = baseH + 1.35 * s;
          targetZ = 0.7 * s;
          targetPitch = -pitchAmp * s;
          targetRoll = Math.sin(t * 2) * 0.04;
          setFlightLabel('SIMULASI MESIN • MANUVER MENANJAK (ATAS)');
        } else {
          const s = Math.sin(((cycle - 12) / 4) * Math.PI);
          targetX = 0;
          targetY = Math.max(1.25, baseH - 0.85 * s);
          targetZ = -0.6 * s;
          targetPitch = pitchAmp * 0.72 * s;
          targetRoll = Math.cos(t * 2) * 0.04;
          setFlightLabel('SIMULASI MESIN • MANUVER MENUKIK (BAWAH)');
        }
      }
    } else {
      targetX = 0;
      targetY = 0;
      targetZ = 0;
      targetPitch = 0;
      targetRoll = 0;
      targetYawOffset = 0;
      targetGear = 0;
    }

    // Interpolasi halus posisi & rotasi pesawat
    const posSpeed = flightMode === 'takeoff' || flightMode === 'landing' ? 5.5 : 3.4;
    currentX.current = THREE.MathUtils.lerp(currentX.current, targetX, Math.min(1, dt * posSpeed));
    currentY.current = THREE.MathUtils.lerp(currentY.current, targetY, Math.min(1, dt * posSpeed));
    currentZ.current = THREE.MathUtils.lerp(currentZ.current, targetZ, Math.min(1, dt * posSpeed));

    rootRef.current.position.x = currentX.current;
    rootRef.current.position.y = currentY.current;
    rootRef.current.position.z = currentZ.current;
    rootRef.current.rotation.x = THREE.MathUtils.lerp(rootRef.current.rotation.x, targetPitch, Math.min(1, dt * 4.5));
    rootRef.current.rotation.z = THREE.MathUtils.lerp(rootRef.current.rotation.z, targetRoll, Math.min(1, dt * 4.2));

    if (autoRotate) {
      rootRef.current.rotation.y += dt * 0.42;
    } else {
      rootRef.current.rotation.y = THREE.MathUtils.lerp(rootRef.current.rotation.y, targetYawOffset, Math.min(1, dt * 3.2));
    }

    // Animasi halus roda pendarat masuk/keluar ke dalam badan pesawat
    gearRetract.current = THREE.MathUtils.lerp(gearRetract.current, targetGear, Math.min(1, dt * gearSpeed));
    const gearObj = procedural.group.getObjectByName('landing-gear');
    if (gearObj) {
      const r = gearRetract.current;
      gearObj.visible = r < 0.96;
      gearObj.position.y = r * 0.78;
      gearObj.scale.set(1 - r * 0.25, Math.max(0.01, 1 - r * 0.94), 1 - r * 0.25);
    }

    // Animasi khusus Simulasi 9G pada G-Suit (5 kantung udara & saluran selang mengembang + berpendar)
    if (unit.id === 'gsuit') {
      const bladders = procedural.group.getObjectByName('gsuit-bladders');
      const simActive = flightMode === 'engineSim';
      const pulse = simActive ? 0.5 + 0.5 * Math.sin(t * 3.4) : 0;
      if (bladders) {
        const targetInflate = simActive ? 1.045 + pulse * 0.035 : 1.0;
        bladders.children.forEach((child) => {
          const mesh = child as THREE.Mesh;
          const isTube = mesh.name.includes('tube');
          if (!isTube) {
            mesh.scale.x = THREE.MathUtils.lerp(mesh.scale.x, targetInflate, Math.min(1, dt * 6));
            mesh.scale.z = THREE.MathUtils.lerp(mesh.scale.z, targetInflate, Math.min(1, dt * 6));
          }
          const mat = mesh.material as THREE.MeshStandardMaterial;
          if (mat && 'emissive' in mat) {
            mat.emissive.set(simActive ? (isTube ? '#ffb703' : '#00d8ff') : '#000000');
            mat.emissiveIntensity = THREE.MathUtils.lerp(
              mat.emissiveIntensity,
              simActive ? (isTube ? 0.55 + pulse * 0.45 : 0.25 + pulse * 0.35) : 0,
              Math.min(1, dt * 6),
            );
          }
        });
      }
    }

    // Animasi khusus Simulasi HMDS pada Helm Pilot (visor geser turun, NVG turun, & proyeksi HUD hijau menyala)
    if (unit.id === 'pilot-helmet') {
      const simActive = flightMode === 'engineSim';
      const pulse = simActive ? 0.5 + 0.5 * Math.sin(t * 3.2) : 0;
      const visorPivot = procedural.group.getObjectByName('helmet-visor-pivot');
      if (visorPivot) {
        const targetRotX = simActive ? 0.16 : -0.18;
        visorPivot.rotation.x = THREE.MathUtils.lerp(visorPivot.rotation.x, targetRotX, Math.min(1, dt * 4.5));
      }
      const nvgPivot = procedural.group.getObjectByName('helmet-nvg-pivot');
      if (nvgPivot) {
        const targetNvgX = simActive ? 0.12 : -0.58;
        nvgPivot.rotation.x = THREE.MathUtils.lerp(nvgPivot.rotation.x, targetNvgX, Math.min(1, dt * 4.2));
      }
      const visorObj = procedural.group.getObjectByName('gsuit-visor') as THREE.Mesh | undefined;
      if (visorObj && visorObj.material) {
        const vMat = visorObj.material as THREE.MeshPhysicalMaterial;
        vMat.emissive.set('#00ffaa');
        vMat.emissiveIntensity = THREE.MathUtils.lerp(
          vMat.emissiveIntensity,
          simActive ? 0.42 + pulse * 0.28 : 0.05,
          Math.min(1, dt * 5),
        );
      }
    }

    // Sinkronkan audio mesin real-time sesuai karakter pesawat & fase penerbangan
    aircraftAudio.update(unit.id, flightMode, pt, soundEnabled);
  });

  return (
    <group ref={rootRef} name="aircraft-root">
      <primitive object={activeGroup} />
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
