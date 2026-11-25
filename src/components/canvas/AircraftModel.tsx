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
import { AerodynamicsLayer } from './AerodynamicsLayer';
import { CockpitPilotLayer } from './CockpitPilotLayer';
import { SafetySystemLayer } from './SafetySystemLayer';
import { OxygenSystemLayer } from './OxygenSystemLayer';

interface SavedMatProps {
  transparent: boolean;
  opacity: number;
  depthWrite: boolean;
  emissiveIntensity: number;
}

const savedMaterials = new WeakMap<THREE.Material, SavedMatProps>();

function applyVisualModes(root: THREE.Object3D, cutaway: boolean, wireframe: boolean, clearCanopy = false) {
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
        mat.opacity = cutaway ? 0.16 : clearCanopy ? Math.min(orig.opacity, 0.28) : orig.opacity;
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
  const safetyMode = useHangarStore((s) => s.safetyMode);
  const safetyNonce = useHangarStore((s) => s.safetyNonce);
  const aeroMode = useHangarStore((s) => s.aeroMode);
  const aeroManeuver = useHangarStore((s) => s.aeroManeuver);
  const glbVer = useHangarStore((s) => s.glbVersion[unit.id] ?? 0);
  const liveryId = useHangarStore((s) => s.selectedLivery[unit.id] ?? unit.liveries?.[0]?.id);
  const setFlightState = useHangarStore((s) => s.setFlightState);
  const setFlightLabel = useHangarStore((s) => s.setFlightLabel);

  const [glbGroup, setGlbGroup] = useState<THREE.Group | null>(() => customGlbRegistry.get(unit.id) ?? null);

  const rootRef = useRef<THREE.Group>(null);
  const airframeRef = useRef<THREE.Group>(null);
  const phaseTime = useRef(0);
  const safetyTime = useRef(0);
  const gearRetract = useRef(0); // 0 = roda turun/keluar, 1 = roda masuk penuh di dalam badan
  const currentX = useRef(0);
  const currentY = useRef(0);
  const currentZ = useRef(0);

  const procedural = useMemo(() => getProceduralAircraft(unit.id, liveryId), [unit.id, liveryId]);

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
      // Mulai dari dalam Hanggar TNI AU yang agak jauh di sisi kiri landasan, menghadap keluar menuju taxiway & runway!
      const startX = -31.5;
      const startZ = -10.5;
      currentX.current = startX;
      currentY.current = 0;
      currentZ.current = startZ;
      gearRetract.current = 0;
      if (rootRef.current) {
        rootRef.current.position.set(startX, 0, startZ);
        rootRef.current.rotation.set(0, Math.PI / 2, 0);
      }
    } else if (flightMode === 'landing') {
      // Mulai dari Long Final Approach jarak jauh di belakang-atas sejajar runway!
      const startZ = isHeli ? -10.5 : -18.5;
      const startY = isHeli ? 6.4 : 8.2;
      currentX.current = 0;
      currentY.current = startY;
      currentZ.current = startZ;
      gearRetract.current = 1;
      if (rootRef.current) {
        rootRef.current.position.set(0, startY, startZ);
        rootRef.current.rotation.set(isHeli ? 0.04 : 0.07, 0, 0);
      }
    }
  }, [flightMode, flightNonce, unit.category]);

  // Reset waktu cerita Safety saat tombol Safety atau Ulangi ditekan
  useEffect(() => {
    safetyTime.current = 0;
    if (airframeRef.current) {
      airframeRef.current.position.set(0, 0, 0);
      airframeRef.current.rotation.set(0, 0, 0);
      airframeRef.current.visible = true;
    }
  }, [safetyMode, safetyNonce, unit.id]);

  // Saat simulasi aktif, kaca kanopi dibuat lebih bening agar Pilot 3D di dalam kokpit terlihat jelas!
  const isAnySimActive = flightMode !== 'parked' || safetyMode || aeroMode;
  useEffect(() => {
    applyVisualModes(activeGroup, false, wireframe, isAnySimActive);
  }, [activeGroup, wireframe, isAnySimActive]);

  // Mesin & baling-baling/rotor TETAP berputar penuh selama terbang, landing, safety, & demo aerodinamika!
  const isEngineVisualActive =
    flightMode === 'engineSim' ||
    flightMode === 'takeoff' ||
    flightMode === 'airborne' ||
    flightMode === 'maneuver' ||
    flightMode === 'landing' ||
    safetyMode ||
    aeroMode;

  useFrame((state, delta) => {
    if (!rootRef.current) return;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    phaseTime.current += dt;
    const pt = phaseTime.current;
    const isHeli = unit.category === 'Helikopter';
    const isHeavy = unit.category === 'Angkut & VIP';
    const isFighter = unit.category === 'Tempur';
    const isTrainer = unit.category === 'Latih' || unit.id === 'supertucano';

    let targetX = 0;
    let targetY = 0;
    let targetZ = 0;
    let targetPitch = 0;
    let targetRoll = 0;
    let directRoll: number | null = null;
    let targetYawOffset = 0;
    let targetGear = 0; // 0 = keluar, 1 = masuk
    let gearSpeed = 2.8;

    if (flightMode === 'takeoff') {
      if (isHeli) {
        // TAKE OFF HELIKOPTER: Keluar hanggar yang jauh ke helipad runway -> Spool-up -> Hover vertikal -> Menanjak
        if (pt < 4.2) {
          const p = easeInOut(pt / 4.2);
          targetX = THREE.MathUtils.lerp(-31.5, 0, p);
          targetZ = THREE.MathUtils.lerp(-10.5, -2.0, p);
          targetY = 0;
          targetYawOffset = THREE.MathUtils.lerp(Math.PI / 2, 0, Math.max(0, (p - 0.65) / 0.35));
          targetGear = 0;
          setFlightLabel('TAXI OUT • HELIKOPTER KELUAR HANGGAR MENUJU LANDASAN');
        } else if (pt < 6.0) {
          targetX = 0;
          targetZ = -2.0;
          targetY = 0;
          targetYawOffset = 0;
          targetGear = 0;
          setFlightLabel('📡 ATC: CLEARED FOR TAKE OFF • ROTOR SPOOL-UP FULL POWER');
        } else if (pt < 8.0) {
          const p = easeInOut((pt - 6.0) / 2.0);
          targetZ = -2.0;
          targetY = THREE.MathUtils.lerp(0, 1.8, p);
          targetPitch = -0.03 * Math.sin(p * Math.PI);
          targetGear = 0;
          setFlightLabel('TAHAP 1 • TAKE OFF • ANGKAT VERTIKAL (HOVER)');
        } else if (pt < 10.2) {
          const p = easeInOut((pt - 8.0) / 2.2);
          targetY = THREE.MathUtils.lerp(1.8, 3.0, p);
          targetZ = THREE.MathUtils.lerp(-2.0, 0, p);
          targetPitch = 0.09 * Math.sin(p * Math.PI);
          targetGear = p > 0.2 ? 1 : 0;
          setFlightLabel('TAHAP 1 • TAKE OFF • MENANJAK & RODA MASUK');
        } else {
          targetY = 2.95;
          targetGear = 1;
          setFlightState('airborne', 'TERBANG JELAJAH • SIAP 2. MANUVER ATAU 3. LANDING');
        }
      } else {
        // TAKE OFF PESAWAT SAYAP TETAP: Keluar Hanggar (jauh) -> Belok masuk Runway 09 -> Spool-up -> Akselerasi -> Liftoff -> Climb
        if (pt < 4.2) {
          // Fase 0A: Taxi keluar perlahan dari Hanggar TNI AU menyusuri jalur taxiway kuning panjang
          const p = easeInOut(pt / 4.2);
          targetX = THREE.MathUtils.lerp(-31.5, -6.5, p);
          targetZ = -10.5;
          targetY = 0;
          targetYawOffset = Math.PI / 2;
          targetGear = 0;
          setFlightLabel('TAXI OUT • KELUAR DARI HANGGAR MENUJU RUNWAY 09');
        } else if (pt < 6.0) {
          // Fase 0B: Belok kiri mulus (Line-Up) masuk garis tengah Runway 09!
          const p = easeInOut((pt - 4.2) / 1.8);
          targetX = THREE.MathUtils.lerp(-6.5, 0, p);
          targetZ = THREE.MathUtils.lerp(-10.5, -8.5, p);
          targetY = 0;
          targetYawOffset = THREE.MathUtils.lerp(Math.PI / 2, 0, p);
          targetGear = 0;
          setFlightLabel('LINE UP • MASUK POSISI START RUNWAY 09');
        } else if (pt < 7.6) {
          // Fase 1: Posisi siap di Runway 09 + Izin ATC + Mesin Full Power
          targetX = 0;
          targetZ = -8.5;
          targetY = 0;
          targetYawOffset = 0;
          targetPitch = Math.sin(t * 36) * 0.004;
          targetGear = 0;
          setFlightLabel('📡 ATC: CLEARED FOR TAKE OFF RUNWAY 09 • FULL POWER');
        } else if (pt < 10.8) {
          // Fase 2: Akselerasi panjang di sepanjang aspal runway
          const p = (pt - 7.6) / 3.2;
          targetZ = THREE.MathUtils.lerp(-8.5, 2.8, p * p);
          targetY = 0;
          targetPitch = -0.02 * p;
          targetGear = 0;
          setFlightLabel('TAHAP 1 • TAKE OFF • AKSELERASI PANJANG DI ASPAL RUNWAY');
        } else if (pt < 12.5) {
          // Fase 3: Rotation & Liftoff
          const p = (pt - 10.8) / 1.7;
          const ease = easeInOut(p);
          targetZ = THREE.MathUtils.lerp(2.8, 5.2, ease);
          targetY = THREE.MathUtils.lerp(0, 1.75, p * p);
          targetPitch = (isHeavy ? -0.18 : -0.27) * Math.sin(Math.min(1, p * 1.2) * (Math.PI / 2));
          targetGear = 0;
          setFlightLabel('TAHAP 1 • TAKE OFF • ROTATION & LIFTOFF');
        } else if (pt < 14.8) {
          // Fase 4: Initial Climb & Roda masuk otomatis
          const p = easeInOut((pt - 12.5) / 2.3);
          targetZ = THREE.MathUtils.lerp(5.2, 0, p);
          targetY = THREE.MathUtils.lerp(1.75, 3.05, p);
          targetPitch = THREE.MathUtils.lerp(isHeavy ? -0.18 : -0.26, -0.04, p);
          targetRoll = Math.sin(p * Math.PI) * -0.08;
          targetGear = 1;
          gearSpeed = 2.0;
          setFlightLabel('TAHAP 1 • TAKE OFF • MENANJAK & RODA MASUK');
        } else {
          targetZ = 0;
          targetY = 2.95;
          targetGear = 1;
          setFlightState('airborne', 'TERBANG JELAJAH • SIAP 2. MANUVER ATAU 3. LANDING');
        }
      }
    } else if (flightMode === 'airborne') {
      // TERBANG JELAJAH STABIL DI ATAS PERKOTAAN, LAUT & RUNWAY
      targetX = Math.sin(t * 0.55) * 0.35;
      targetY = 2.95 + Math.sin(t * 1.8) * 0.14;
      targetZ = 0;
      targetPitch = (isHeli ? 0.04 : -0.025) + Math.sin(t * 1.2) * 0.015;
      targetRoll = Math.cos(t * 1.1) * 0.04;
      targetGear = 1;
      setFlightLabel('TERBANG JELAJAH • SIAP 2. MANUVER ATAU 3. LANDING');
    } else if (flightMode === 'maneuver') {
      const baseH = Math.max(2.6, procedural.hoverHeight + 1.15);
      targetGear = 1;

      if (isFighter) {
        // MANUVER KHUSUS PESAWAT TEMPUR (Siklus 20 detik: Barrel Roll 360° -> High-G Break -> Cobra Climb -> Dive & Pull-Up)
        const cycle = pt % 20;
        if (cycle < 5) {
          // 1. 360° BARREL ROLL
          const p = easeInOut(cycle / 5);
          directRoll = -p * Math.PI * 2;
          targetX = Math.sin(p * Math.PI * 2) * 1.15;
          targetY = baseH + (1 - Math.cos(p * Math.PI * 2)) * 0.75;
          targetZ = Math.sin(p * Math.PI) * 0.5;
          targetPitch = -0.08 * Math.sin(p * Math.PI);
          setFlightLabel('TAHAP 2 • MANUVER TEMPUR • 360° BARREL ROLL');
        } else if (cycle < 10) {
          // 2. HIGH-G COMBAT BREAK (Kanan 68° lalu Kiri 68°)
          const local = cycle - 5;
          if (local < 2.5) {
            const s = Math.sin((local / 2.5) * Math.PI);
            targetX = 2.6 * s;
            targetY = baseH + 0.45 * s;
            targetRoll = -1.18 * s;
            targetPitch = -0.14 * s;
            targetYawOffset = -0.28 * s;
            setFlightLabel('TAHAP 2 • MANUVER TEMPUR • HIGH-G COMBAT BREAK KANAN');
          } else {
            const s = Math.sin(((local - 2.5) / 2.5) * Math.PI);
            targetX = -2.6 * s;
            targetY = baseH + 0.45 * s;
            targetRoll = 1.18 * s;
            targetPitch = -0.14 * s;
            targetYawOffset = 0.28 * s;
            setFlightLabel('TAHAP 2 • MANUVER TEMPUR • HIGH-G COMBAT BREAK KIRI');
          }
        } else if (cycle < 15) {
          // 3. PUGACHEV'S COBRA / HIGH-AoA CLIMB (Hidung mendongak ekstrem ~62° lalu recovery)
          const p = (cycle - 10) / 5;
          const cobra = Math.sin(p * Math.PI);
          const sharp = Math.pow(cobra, 0.72);
          targetX = 0;
          targetY = baseH + 1.85 * cobra;
          targetZ = -1.1 * Math.sin(p * Math.PI) + 0.8 * Math.max(0, p - 0.55);
          targetPitch = -1.08 * sharp;
          targetRoll = Math.sin(t * 2.5) * 0.04;
          setFlightLabel('TAHAP 2 • MANUVER TEMPUR • HIGH-AoA COBRA CLIMB');
        } else {
          // 4. TACTICAL DIVE & AFTERBURNER PULL-UP
          const p = (cycle - 15) / 5;
          if (p < 0.48) {
            const s = easeInOut(p / 0.48);
            targetY = THREE.MathUtils.lerp(baseH, baseH - 1.35, s);
            targetZ = THREE.MathUtils.lerp(0, 1.4, s);
            targetPitch = 0.46 * Math.sin(s * Math.PI);
            targetRoll = 0.16 * Math.sin(s * Math.PI);
          } else {
            const s = easeInOut((p - 0.48) / 0.52);
            targetY = THREE.MathUtils.lerp(baseH - 1.35, baseH + 1.1, Math.sin(s * Math.PI * 0.85));
            targetZ = THREE.MathUtils.lerp(1.4, 0, s);
            targetPitch = -0.48 * Math.sin(s * Math.PI);
            targetRoll = -0.12 * Math.sin(s * Math.PI);
          }
          setFlightLabel('TAHAP 2 • MANUVER TEMPUR • TACTICAL DIVE & AFTERBURNER PULL-UP');
        }
      } else if (isTrainer) {
        // MANUVER AEROBATIK PESAWAT LATIH / COIN (KT-1B & Super Tucano)
        const cycle = pt % 16;
        if (cycle < 4.5) {
          const p = easeInOut(cycle / 4.5);
          directRoll = -p * Math.PI * 2;
          targetX = Math.sin(p * Math.PI * 2) * 0.75;
          targetY = baseH + 0.45 * Math.sin(p * Math.PI);
          targetPitch = -0.06 * Math.sin(p * Math.PI);
          setFlightLabel('TAHAP 2 • MANUVER AEROBATIK • 360° AILERON ROLL');
        } else if (cycle < 8.5) {
          const s = Math.sin(((cycle - 4.5) / 4) * Math.PI);
          targetX = 2.1 * s;
          targetY = baseH + 0.9 * s;
          targetRoll = -0.78 * s;
          targetPitch = -0.22 * s;
          targetYawOffset = -0.22 * s;
          setFlightLabel('TAHAP 2 • MANUVER AEROBATIK • CHANDELLE CLIMB');
        } else if (cycle < 12.5) {
          const s = Math.sin(((cycle - 8.5) / 4) * Math.PI);
          targetX = -2.1 * s;
          targetY = baseH + 0.35 * s;
          targetRoll = 0.78 * s;
          targetPitch = -0.08 * s;
          targetYawOffset = 0.22 * s;
          setFlightLabel('TAHAP 2 • MANUVER TAKTIS • BREAK TURN KIRI');
        } else {
          const s = Math.sin(((cycle - 12.5) / 3.5) * Math.PI);
          targetY = baseH - 0.85 * s;
          targetPitch = 0.28 * s;
          setFlightLabel('TAHAP 2 • MANUVER TAKTIS • DIVE & RECOVERY');
        }
      } else if (isHeli) {
        // MANUVER TAKTIS HELIKOPTER (Caracal & Colibri)
        const cycle = pt % 16;
        if (cycle < 4) {
          const s = Math.sin((cycle / 4) * Math.PI);
          targetX = 1.9 * s;
          targetY = baseH + 0.25 * s;
          targetRoll = -0.34 * s;
          targetPitch = 0.1 * s;
          targetYawOffset = -0.2 * s;
          setFlightLabel('TAHAP 2 • MANUVER HELIKOPTER • BANKING KANAN');
        } else if (cycle < 8) {
          const s = Math.sin(((cycle - 4) / 4) * Math.PI);
          targetX = -1.9 * s;
          targetY = baseH + 0.25 * s;
          targetRoll = 0.34 * s;
          targetPitch = 0.1 * s;
          targetYawOffset = 0.2 * s;
          setFlightLabel('TAHAP 2 • MANUVER HELIKOPTER • BANKING KIRI');
        } else if (cycle < 12) {
          const s = Math.sin(((cycle - 8) / 4) * Math.PI);
          targetY = baseH - 0.45 * s;
          targetZ = 1.15 * s;
          targetPitch = 0.24 * s; // hidung menunduk tajam melaju cepat
          setFlightLabel('TAHAP 2 • MANUVER HELIKOPTER • HIGH-SPEED FORWARD DASH');
        } else {
          const s = Math.sin(((cycle - 12) / 4) * Math.PI);
          targetY = baseH + 0.95 * s;
          targetZ = -0.75 * s;
          targetPitch = -0.24 * s; // rapid combat flare
          setFlightLabel('TAHAP 2 • MANUVER HELIKOPTER • RAPID COMBAT FLARE');
        }
      } else {
        // MANUVER TAKTIS PESAWAT ANGKUT & VIP (C-130J & B737)
        const cycle = pt % 16;
        if (cycle < 4) {
          const s = Math.sin((cycle / 4) * Math.PI);
          targetX = 1.8 * s;
          targetY = baseH + 0.25 * s;
          targetRoll = -0.3 * s;
          targetPitch = -0.05 * s;
          targetYawOffset = -0.16 * s;
          setFlightLabel('TAHAP 2 • MANUVER TAKTIS • BANKING KANAN');
        } else if (cycle < 8) {
          const s = Math.sin(((cycle - 4) / 4) * Math.PI);
          targetX = -1.8 * s;
          targetY = baseH + 0.25 * s;
          targetRoll = 0.3 * s;
          targetPitch = -0.05 * s;
          targetYawOffset = 0.16 * s;
          setFlightLabel('TAHAP 2 • MANUVER TAKTIS • BANKING KIRI');
        } else if (cycle < 12) {
          const s = Math.sin(((cycle - 8) / 4) * Math.PI);
          targetY = baseH + 1.25 * s;
          targetZ = 0.6 * s;
          targetPitch = -0.2 * s;
          setFlightLabel('TAHAP 2 • MANUVER TAKTIS • TACTICAL CLIMB');
        } else {
          const s = Math.sin(((cycle - 12) / 4) * Math.PI);
          targetY = Math.max(1.5, baseH - 0.85 * s);
          targetZ = -0.5 * s;
          targetPitch = 0.14 * s;
          setFlightLabel('TAHAP 2 • MANUVER TAKTIS • TACTICAL DESCENT');
        }
      }
    } else if (flightMode === 'landing') {
      if (isHeli) {
        // LANDING HELIKOPTER: Long Approach dari jauh -> Roda keluar -> Hover rendah -> Touchdown vertikal -> Taxi ke Hanggar jauh
        if (pt < 3.4) {
          const p = easeInOut(pt / 3.4);
          targetZ = THREE.MathUtils.lerp(-10.5, 0, p);
          targetY = THREE.MathUtils.lerp(6.4, 1.8, p);
          targetPitch = 0.06 * (1 - p);
          targetGear = 0;
          gearSpeed = 2.0;
          setFlightLabel('TAHAP 3 • LANDING • LONG FINAL APPROACH & RODA KELUAR');
        } else if (pt < 6.0) {
          const p = easeInOut((pt - 3.4) / 2.6);
          targetZ = 0;
          targetY = THREE.MathUtils.lerp(1.8, 0, p);
          targetPitch = -0.08 * Math.sin(p * Math.PI);
          targetGear = 0;
          setFlightLabel('TAHAP 3 • LANDING • HOVER & TOUCHDOWN VERTIKAL');
        } else if (pt < 11.2) {
          // Helikopter taxi pelan menyusuri jalur panjang menuju Hanggar TNI AU yang jauh
          const p = easeInOut((pt - 6.0) / 5.2);
          targetX = THREE.MathUtils.lerp(0, -31.5, p);
          targetZ = THREE.MathUtils.lerp(0, 3.5, Math.min(1, p * 2.2));
          targetY = 0;
          targetYawOffset = THREE.MathUtils.lerp(0, -Math.PI / 2, Math.min(1, p * 2.4));
          targetGear = 0;
          setFlightLabel('📡 ATC: WELCOME BACK • TAXI PERLAHAN MENUJU HANGGAR');
        } else if (pt < 12.6) {
          targetX = -31.5;
          targetZ = 3.5;
          targetY = 0;
          targetYawOffset = -Math.PI / 2;
          targetGear = 0;
          setFlightLabel('PARKIR DI HANGGAR • ROTOR IDLE');
        } else {
          setFlightState('parked', null);
        }
      } else {
        // LANDING PESAWAT SAYAP TETAP:
        // Long Final -> Flare -> Touchdown & Melaju Kencang Panjang di Runway (4,4s) -> Pengereman Panjang (5,8s) -> Berhenti -> Belok Pelan -> Taxi Panjang ke Hanggar Jauh!
        if (pt < 4.0) {
          // Fase 1: Long Final Approach dari kejauhan (-18.5) turun halus mengikuti glide slope + Roda keluar
          const p = pt / 4.0;
          targetZ = THREE.MathUtils.lerp(-18.5, -4.0, p);
          targetY = THREE.MathUtils.lerp(8.2, 1.75, p);
          targetPitch = 0.06;
          targetGear = 0;
          gearSpeed = 1.6;
          setFlightLabel('📡 ATC: CLEARED TO LAND RUNWAY 09 • LONG FINAL APPROACH');
        } else if (pt < 5.8) {
          // Fase 2: Landing Flare mulus (hidung mendongak halus sebelum ban menyentuh aspal)
          const p = (pt - 4.0) / 1.8;
          const ease = easeInOut(p);
          targetZ = THREE.MathUtils.lerp(-4.0, -1.5, p);
          targetY = THREE.MathUtils.lerp(1.75, 0.05, ease);
          targetPitch = THREE.MathUtils.lerp(0.06, isHeavy ? -0.14 : -0.2, ease);
          targetGear = 0;
          setFlightLabel('TAHAP 3 • LANDING • FLARE (HIDUNG MENDONGAK)');
        } else if (pt < 10.2) {
          // Fase 3: Main Gear Touchdown & HIGH-SPEED RUNWAY ROLLOUT (4,4 detik melaju kencang lurus di runway!)
          const p = (pt - 5.8) / 4.4;
          targetX = 0;
          targetZ = THREE.MathUtils.lerp(-1.5, 1.4, easeInOut(p));
          targetY = p < 0.14 ? Math.sin((p / 0.14) * Math.PI) * 0.04 : 0;
          // Aerobraking singkat lalu roda depan turun mulus menyentuh aspal
          targetPitch = THREE.MathUtils.lerp(isHeavy ? -0.14 : -0.2, 0, Math.min(1, p * 1.65));
          targetYawOffset = 0;
          targetGear = 0;
          setFlightLabel('TAHAP 3 • LANDING • TOUCHDOWN & MELAJU KENCANG DI RUNWAY');
        } else if (pt < 16.0) {
          // Fase 4: Pengereman Panjang & Halus (5,8 detik lurus di runway sampai benar-benar berhenti!)
          const p = (pt - 10.2) / 5.8;
          targetX = 0;
          targetZ = THREE.MathUtils.lerp(1.4, 2.2, easeInOut(p));
          targetY = 0;
          // Efek suspensi depan sedikit menunduk saat pengereman kuat (braking squat) lalu kembali datar
          targetPitch = Math.sin(p * Math.PI) * 0.018;
          targetYawOffset = 0;
          targetGear = 0;
          setFlightLabel('TAHAP 3 • LANDING • PENGEREMAN PANJANG DI RUNWAY');
        } else if (pt < 17.5) {
          // Fase 5: Berhenti mantap di runway sebelum mulai belok keluar menuju hanggar
          targetX = 0;
          targetZ = 2.2;
          targetY = 0;
          targetPitch = 0;
          targetYawOffset = 0;
          targetGear = 0;
          setFlightLabel('📡 ATC: BERHENTI DI RUNWAY • BERSIAP TAXI KE HANGGAR');
        } else if (pt < 20.5) {
          // Fase 6A: Mulai bergerak pelan sambil belok kiri mulus keluar runway menuju jalur taxiway hanggar
          const p = easeInOut((pt - 17.5) / 3.0);
          targetX = THREE.MathUtils.lerp(0, -8.0, p);
          targetZ = THREE.MathUtils.lerp(2.2, 3.5, p);
          targetY = 0;
          targetYawOffset = THREE.MathUtils.lerp(0, -Math.PI / 2, p);
          targetGear = 0;
          setFlightLabel('TAXI IN • BELOK PERLAHAN KELUAR RUNWAY MENUJU HANGGAR');
        } else if (pt < 26.5) {
          // Fase 6B: Meluncur perlahan menyusuri jalur taxiway panjang masuk ke Hanggar TNI AU yang jauh
          const p = easeInOut((pt - 20.5) / 6.0);
          targetX = THREE.MathUtils.lerp(-8.0, -31.5, p);
          targetZ = 3.5;
          targetY = 0;
          targetYawOffset = -Math.PI / 2;
          targetGear = 0;
          setFlightLabel('TAXI IN • MELUNCUR PERLAHAN MASUK KE DALAM HANGGAR');
        } else if (pt < 27.8) {
          // Fase 7: Parkir rapi di dalam hanggar, mesin dimatikan
          targetX = -31.5;
          targetZ = 3.5;
          targetY = 0;
          targetYawOffset = -Math.PI / 2;
          targetGear = 0;
          setFlightLabel('PARKIR SELESAI • MESIN DIMATIKAN');
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
    } else if (safetyMode && unit.id !== 'gsuit' && unit.id !== 'pilot-helmet') {
      // Animasi 3D badan pesawat sesuai cerita Safety (Tempur: Manuver -> Tertembak -> Menukik; Laut: Turun -> Mengapung)
      safetyTime.current += dt;
      const st = safetyTime.current;
      const isEjection = unit.category === 'Tempur' || unit.category === 'Latih';

      if (isEjection) {
        targetGear = 1;
        if (st < 3.5) {
          // Babak 1: Patroli & manuver tempur di langit
          const s = Math.sin((st / 3.5) * Math.PI * 2);
          targetX = s * 1.4;
          targetY = 2.65 + Math.sin(t * 2.0) * 0.16;
          targetZ = 0;
          targetRoll = -s * 0.52;
          targetPitch = -0.06;
          if (airframeRef.current) {
            airframeRef.current.position.set(0, 0, 0);
            airframeRef.current.rotation.set(0, 0, 0);
            airframeRef.current.visible = true;
          }
        } else if (st < 5.8) {
          // Babak 2: Rudal menghantam -> pesawat berguncang & miring tak terkendali!
          const hit = st >= 4.45;
          targetX = hit ? Math.sin(t * 22) * 0.18 : 0;
          targetY = hit ? 2.5 - (st - 4.45) * 0.35 : 2.65;
          targetZ = 0;
          targetRoll = hit ? 0.58 + Math.sin(t * 16) * 0.24 : -0.15;
          targetPitch = hit ? 0.18 + Math.cos(t * 18) * 0.1 : -0.04;
          if (airframeRef.current) {
            airframeRef.current.position.set(0, 0, 0);
            airframeRef.current.rotation.set(0, 0, 0);
            airframeRef.current.visible = true;
          }
        } else {
          // Babak 3 & 4: Setelah pilot melontar, root tetap stabil di fokus kamera untuk parasut,
          // sementara badan pesawat yang terbakar menukik berputar menjauh ke bawah!
          targetX = 0;
          targetY = 1.6;
          targetZ = 0;
          targetRoll = 0;
          targetPitch = 0;
          if (airframeRef.current) {
            const p = Math.min(1, (st - 5.8) / 3.2);
            airframeRef.current.visible = p < 0.96;
            airframeRef.current.position.set(p * 3.8, -p * 11.5, p * 6.5);
            airframeRef.current.rotation.set(0.45 + p * 0.65, p * 0.4, 0.7 + p * 2.8);
          }
        }
      } else if (isHeli) {
        // Helikopter di laut: Autorotasi turun -> Pelampung mengembang -> Mengapung stabil di ombak
        targetGear = 0;
        if (st < 3.5) {
          const p = easeInOut(st / 3.5);
          targetY = THREE.MathUtils.lerp(4.4, 1.5, p);
          targetPitch = 0.08 * (1 - p);
          targetRoll = Math.sin(t * 3.2) * 0.05;
        } else if (st < 6.2) {
          const p = easeInOut((st - 3.5) / 2.7);
          targetY = THREE.MathUtils.lerp(1.5, 0.14, p);
          targetPitch = -0.05 * Math.sin(p * Math.PI);
          targetRoll = Math.sin(t * 2.2) * 0.03;
        } else {
          targetY = 0.14 + Math.sin(t * 1.9) * 0.06;
          targetPitch = Math.sin(t * 1.4) * 0.025;
          targetRoll = Math.cos(t * 1.6) * 0.035;
        }
      } else {
        // Pesawat Angkut & VIP: Gangguan mesin di atas laut -> Water Ditching -> Mengapung di ombak
        targetGear = 1; // Roda tetap masuk saat Water Ditching agar badan pesawat tidak terbalik!
        if (st < 3.5) {
          targetY = 3.2 + Math.sin(t * 1.6) * 0.12;
          targetPitch = 0.04;
          targetRoll = -0.08 + Math.sin(t * 2.4) * 0.03;
        } else if (st < 6.8) {
          const p = easeInOut((st - 3.5) / 3.3);
          targetY = THREE.MathUtils.lerp(3.2, 0.1, p);
          targetPitch = THREE.MathUtils.lerp(0.05, -0.1, Math.sin(p * Math.PI));
          targetRoll = THREE.MathUtils.lerp(-0.08, 0, p);
        } else {
          targetY = 0.1 + Math.sin(t * 1.6) * 0.05;
          targetPitch = Math.sin(t * 1.2) * 0.018;
          targetRoll = Math.cos(t * 1.4) * 0.024;
        }
      }
    } else if (aeroMode && unit.id !== 'gsuit' && unit.id !== 'pilot-helmet') {
      // Animasi 3D Aerodinamika: Proses Lift Terbang, Menanjak, Menurun, Belok Kiri, & Belok Kanan!
      if (aeroManeuver === 'liftDemo') {
        const cyc = t % 12;
        if (cyc < 3.5) {
          targetY = 0;
          targetPitch = 0;
          targetGear = 0;
        } else if (cyc < 7.5) {
          const p = easeInOut((cyc - 3.5) / 4.0);
          targetY = THREE.MathUtils.lerp(0, 2.1, p);
          targetPitch = -0.14 * Math.sin(p * Math.PI * 0.7);
          targetGear = p > 0.55 ? 1 : 0;
        } else {
          targetY = 2.15 + Math.sin(t * 2.2) * 0.12;
          targetPitch = -0.08 + Math.sin(t * 1.5) * 0.02;
          targetGear = 1;
        }
      } else if (aeroManeuver === 'climb') {
        targetY = 2.4 + Math.sin(t * 1.6) * 0.35;
        targetPitch = -0.26;
        targetGear = 1;
      } else if (aeroManeuver === 'descend') {
        targetY = 1.45 + Math.sin(t * 1.6) * 0.25;
        targetPitch = 0.22;
        targetGear = 1;
      } else if (aeroManeuver === 'turnLeft') {
        targetX = -1.15 + Math.sin(t * 1.2) * 0.35;
        targetY = 2.0 + Math.cos(t * 1.4) * 0.12;
        targetRoll = 0.44;
        targetYawOffset = 0.22;
        targetPitch = -0.05;
        targetGear = 1;
      } else if (aeroManeuver === 'turnRight') {
        targetX = 1.15 + Math.sin(t * 1.2) * 0.35;
        targetY = 2.0 + Math.cos(t * 1.4) * 0.12;
        targetRoll = -0.44;
        targetYawOffset = -0.22;
        targetPitch = -0.05;
        targetGear = 1;
      } else {
        targetY = 1.9 + Math.sin(t * 1.8) * 0.08;
        targetGear = 1;
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
    if (directRoll !== null) {
      rootRef.current.rotation.z = directRoll;
    } else {
      // Normalisasi sudut roll ke [-PI, PI] agar selesai Barrel Roll 360° tidak memutar balik
      if (rootRef.current.rotation.z < -Math.PI) rootRef.current.rotation.z += Math.PI * 2;
      if (rootRef.current.rotation.z > Math.PI) rootRef.current.rotation.z -= Math.PI * 2;
      rootRef.current.rotation.z = THREE.MathUtils.lerp(rootRef.current.rotation.z, targetRoll, Math.min(1, dt * 4.5));
    }

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
        const targetRotX = simActive ? 0.04 : 0.0;
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
      <group ref={airframeRef} name="aircraft-airframe">
        <primitive object={activeGroup} />
        <CockpitPilotLayer />
        <EffectsLayer
          nozzles={procedural.nozzles}
          spinners={procedural.spinners}
          navLights={procedural.navLights}
          glowMats={procedural.glowMats}
          engineSim={isEngineVisualActive}
          rotorWash={procedural.rotorWash}
        />
        <AerodynamicsLayer />
        <OxygenSystemLayer />
        <HotspotMarkers hotspots={unit.hotspots} />
      </group>
      <SafetySystemLayer />
    </group>
  );
}
