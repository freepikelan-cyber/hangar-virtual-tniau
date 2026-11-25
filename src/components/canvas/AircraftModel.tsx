import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useHangarStore, useSelectedUnit } from '../../store/useHangarStore';
import { FIGHTER_AUTO_ORDER, getFighterManeuverSpec, type FighterManeuverId } from '../../data/fighterManeuvers';
import { getProceduralAircraft } from '../../utils/proceduralBuilder';
import { customGlbRegistry, GLB_SLOTS, tryAutoLoadGlb } from '../../utils/glbEquipmentLoader';
import { invalidateSnapshot } from '../../utils/aircraftSnapshot';
import { aircraftAudio, getLandingTiming, getTakeOffTiming } from '../../utils/aircraftAudio';
import { EffectsLayer } from './EffectsLayer';
import { HotspotMarkers } from './HotspotMarkers';
import { AerodynamicsLayer } from './AerodynamicsLayer';
import { CockpitPilotLayer } from './CockpitPilotLayer';
import { GSuitEduLayer } from './GSuitEduLayer';
import { JupiterTakeOffLayer } from './JupiterTakeOffLayer';
import { SafetySystemLayer } from './SafetySystemLayer';
import { VvipEscortLayer } from './VvipEscortLayer';
import { MissionOpsLayer } from './MissionOpsLayer';
import { OxygenSystemLayer } from './OxygenSystemLayer';

interface SavedMatProps {
  transparent: boolean;
  opacity: number;
  depthWrite: boolean;
  emissiveIntensity: number;
  colorHex: number | null;
  roughness: number | null;
  metalness: number | null;
}

const savedMaterials = new WeakMap<THREE.Material, SavedMatProps>();

function applyVisualModes(
  root: THREE.Object3D,
  cutaway: boolean,
  wireframe: boolean,
  clearCanopy = false,
  darkFighterCanopy = false,
) {
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
          colorHex: 'color' in std && std.color ? std.color.getHex() : null,
          roughness: 'roughness' in std ? std.roughness : null,
          metalness: 'metalness' in std ? std.metalness : null,
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
        if (darkFighterCanopy && !cutaway) {
          // Kanopi kaca gelap (smoked stealth tint) khas pesawat tempur agar pilot terlihat samar-samar & sangat keren!
          mat.opacity = 0.78;
          if ('color' in std && std.color) std.color.set('#081322');
          if ('roughness' in std) std.roughness = 0.08;
          if ('metalness' in std) std.metalness = 0.78;
        } else {
          mat.opacity = cutaway ? 0.16 : clearCanopy ? Math.min(orig.opacity, 0.28) : orig.opacity;
          if ('color' in std && std.color && orig.colorHex !== null) std.color.setHex(orig.colorHex);
          if ('roughness' in std && orig.roughness !== null) std.roughness = orig.roughness;
          if ('metalness' in std && orig.metalness !== null) std.metalness = orig.metalness;
        }
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
  const fighterManeuver = useHangarStore((s) => s.fighterManeuver);
  const gForceLevel = useHangarStore((s) => s.gForceLevel);
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
      // Helikopter mulai dari Hanggar Helipad Skadron 8 (x = -19, z = 0); sayap tetap mulai dari Hanggar Runway (x = -31.5, z = -10.5)
      const startX = isHeli ? -19.0 : -31.5;
      const startZ = isHeli ? 0.0 : -10.5;
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

  // Reset waktu cerita Safety & posisi airframe saat berganti mode terbang/safety
  useEffect(() => {
    safetyTime.current = 0;
    if (airframeRef.current) {
      airframeRef.current.position.set(0, 0, 0);
      airframeRef.current.rotation.set(0, 0, 0);
      airframeRef.current.visible = true;
    }
  }, [safetyMode, safetyNonce, flightMode, unit.id]);

  // Kanopi pesawat tempur dibuat gelap (smoked stealth tint) sehingga pilot di dalam kokpit terlihat samar-samar & elegan!
  const isAnySimActive = flightMode !== 'parked' || safetyMode || aeroMode;
  const isFighterCanopy = unit.category === 'Tempur';
  useEffect(() => {
    applyVisualModes(activeGroup, false, wireframe, isAnySimActive, isFighterCanopy);
  }, [activeGroup, wireframe, isAnySimActive, isFighterCanopy]);

  // Mesin & baling-baling/rotor TETAP berputar penuh selama terbang, landing, AAR, safety, & demo aerodinamika!
  const isEngineVisualActive =
    flightMode === 'engineSim' ||
    flightMode === 'takeoff' ||
    flightMode === 'airborne' ||
    flightMode === 'maneuver' ||
    flightMode === 'landing' ||
    flightMode === 'aar' ||
    flightMode === 'mission' ||
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
    let directPitch: number | null = null;
    let targetRoll = 0;
    let directRoll: number | null = null;
    let targetYawOffset = 0;
    let targetGear = 0; // 0 = keluar, 1 = masuk
    let gearSpeed = 2.8;

    if (flightMode === 'takeoff') {
      if (isHeli) {
        // TAKE OFF HELIKOPTER:
        // 1. Keluar hanggar ke Helipad H -> 2. Tunggu suara Semplak Tower selesai penuh ->
        // 3. Naik vertikal perlahan & hover stabil DI TEMPAT di atas huruf H -> 4. Hidung menunduk halus & mulai maju perlahan!
        const to = getTakeOffTiming(unit.id);
        const hoverDone = to.rollStart + 3.4; // 20.8..24.2s: naik vertikal perlahan; 24.2..25.4s: hover mantap di atas H
        if (pt < 4.2) {
          const p = easeInOut(pt / 4.2);
          targetX = THREE.MathUtils.lerp(-19.0, 0, p);
          targetZ = 0;
          targetY = 0;
          targetYawOffset = THREE.MathUtils.lerp(Math.PI / 2, 0, Math.max(0, (p - 0.65) / 0.35));
          targetGear = 0;
          setFlightLabel('TAXI OUT // HELIKOPTER MENUJU HELIPAD SKADRON UDARA 8');
        } else if (pt < to.rollStart) {
          targetX = 0;
          targetZ = 0;
          targetY = 0;
          targetYawOffset = 0;
          targetGear = 0;
          setFlightLabel('SEMPLAK TOWER // CARACAL 01 DI HELIPAD H — ROTOR 100%');
        } else if (pt < hoverDone) {
          // Fase 3A: Naik vertikal PERLAHAN lurus ke atas di atas huruf H (belum maju!)
          const p = easeInOut((pt - to.rollStart) / Math.max(0.5, hoverDone - to.rollStart));
          targetX = 0;
          targetZ = 0;
          targetY = THREE.MathUtils.lerp(0, 2.55, p);
          targetPitch = -0.02 * Math.sin(p * Math.PI);
          targetRoll = Math.sin(t * 2.2) * 0.018;
          targetGear = 0;
          setFlightLabel('TAKE OFF // ANGKAT VERTIKAL PERLAHAN DI ATAS HELIPAD H');
        } else if (pt < to.rotStart) {
          // Fase 3B: Hover stabil sejenak di atas Helipad H sebelum dorong tuas siklik maju
          targetX = 0;
          targetZ = 0;
          targetY = 2.55 + Math.sin(t * 2.4) * 0.06;
          targetPitch = 0.01;
          targetRoll = Math.sin(t * 1.8) * 0.015;
          targetGear = 0;
          setFlightLabel('TAKE OFF // HOVER STABIL — PERSIAPAN MAJU MENUJU UTARA');
        } else if (pt < to.airborneStart) {
          // Fase 4: Hidung menunduk halus (forward cyclic) -> melaju maju perlahan & menanjak + roda masuk
          const p = easeInOut((pt - to.rotStart) / Math.max(0.5, to.airborneStart - to.rotStart));
          targetX = 0;
          targetZ = THREE.MathUtils.lerp(0, 0.8, Math.sin(p * Math.PI));
          targetY = THREE.MathUtils.lerp(2.55, 3.05, p);
          targetPitch = 0.13 * Math.sin(Math.min(1, p * 1.35) * Math.PI);
          targetGear = p > 0.35 ? 1 : 0;
          setFlightLabel('TAKE OFF // MAJU PERLAHAN & MENANJAK — RODA MASUK');
        } else {
          targetY = 2.95;
          targetGear = 1;
          setFlightState('airborne', 'TERBANG JELAJAH // SIAP 2. MANUVER ATAU 3. LANDING');
        }
      } else {
        // TAKE OFF PESAWAT SAYAP TETAP (Sinkron penuh dengan aba-aba suara kokpit Tempur, Angkut, & VVIP!):
        const to = getTakeOffTiming(unit.id);
        const isVvipUnit = unit.id === 'b737vip' || unit.id === 'falcon8x';
        const taxiStart = isVvipUnit ? 34.0 : 0.0;
        const taxiEnd = isVvipUnit ? 38.5 : 4.2;
        const lineUpEnd = isVvipUnit ? 40.5 : 6.0;

        if (unit.id === 'kt1b') {
          // KHUSUS KT-1B WONG BEE (JUPITER AEROBATIC SHOW):
          // 1. J1 keluar hanggar PALING DEPAN (0..4.4s) ke jalur tengah depan (X=0, Z=+16), jauh dari laut & memberi jalan J2–J6!
          // 2. Semua 6 pesawat membentuk formasi Take Off berjarak lega di Runway 09 saat "Jupiters, check in!" (18.5..26.5s)
          // 3. Semua 6 pesawat Take Off SAMA-SAMA dengan mulus & rapi! (26.5..36.5s)
          if (pt < 2.4) {
            // Tahap 1A: J1 keluar lurus dari Hanggar menuju jalur tengah Runway (X: -34 -> 0, Z = -10.5)
            const p = easeInOut(pt / 2.4);
            targetX = THREE.MathUtils.lerp(-34.0, 0, p);
            targetZ = -10.5;
            targetY = 0;
            targetYawOffset = Math.PI / 2;
            targetGear = 0;
            setFlightLabel('JUPITER 1 • KELUAR DARI HANGGAR MENUJU RUNWAY 09');
          } else if (pt < 3.4) {
            // Tahap 1B: Belok mulus ke Utara (+Z) masuk jalur tengah Runway 09
            const p = easeInOut((pt - 2.4) / 1.0);
            targetX = 0;
            targetZ = THREE.MathUtils.lerp(-10.5, -4.0, p);
            targetY = 0;
            targetYawOffset = THREE.MathUtils.lerp(Math.PI / 2, 0, p);
            targetGear = 0;
            setFlightLabel('JUPITER 1 • LINE UP JALUR TENGAH • JUPITER 2–6 MENYUSUL TIAP 5 DETIK');
          } else if (pt < 5.2) {
            // Tahap 1C: Maju ke posisi start paling depan (Z = +16) jauh dari tepi laut!
            const p = easeInOut((pt - 3.4) / 1.8);
            targetX = 0;
            targetZ = THREE.MathUtils.lerp(-4.0, 16.0, p);
            targetY = 0;
            targetYawOffset = 0;
            targetGear = 0;
            setFlightLabel('JUPITER 1–6 • TAXI SATU PER SATU (JEDA 5 DETIK) KE RUNWAY 09');
          } else if (pt < 29.0) {
            targetX = 0;
            targetZ = 16.0;
            targetY = 0;
            targetYawOffset = 0;
            targetGear = 0;
            setFlightLabel(
              pt < 10.5
                ? 'JUPITER 1–6 • KELUAR HANGGAR SATU PER SATU (JEDA 5 DETIK)'
                : '🎙️ ADISUTJIPTO TOWER • PERMOHONAN & IZIN TAKE-OFF RUNWAY 09',
            );
          } else if (pt < to.rollStart) {
            targetX = 0;
            targetZ = 16.0;
            targetY = 0;
            targetYawOffset = 0;
            const nearRoll = pt > to.rollStart - 1.2;
            targetPitch = nearRoll ? Math.sin(t * 36) * 0.004 : 0;
            targetGear = 0;
            setFlightLabel('🎙️ JUPITERS, CHECK IN! TWO, THREE, FOUR, FIVE, SIX • FORMASI SIAP TAKE OFF');
          } else if (pt < to.rotStart) {
            const p = (pt - to.rollStart) / Math.max(0.5, to.rotStart - to.rollStart);
            targetX = 0;
            targetZ = THREE.MathUtils.lerp(16.0, 24.5, p * p);
            targetY = 0;
            targetPitch = -0.02 * p;
            targetGear = 0;
            setFlightLabel('🔥 BRAKES RELEASE, POWER UP! • 6-SHIP ROLLING BERSAMA');
          } else if (pt < to.climbStart) {
            const p = (pt - to.rotStart) / Math.max(0.5, to.climbStart - to.rotStart);
            const ease = easeInOut(p);
            targetX = 0;
            targetZ = THREE.MathUtils.lerp(24.5, 26.2, ease);
            targetY = THREE.MathUtils.lerp(0, 1.85, p * p);
            targetPitch = -0.25 * Math.sin(Math.min(1, p * 1.2) * (Math.PI / 2));
            targetGear = 0;
            setFlightLabel('🔥 ROTATE! • 6-SHIP JUPITER LEPAS LANDAS BERSAMA');
          } else if (pt < to.airborneStart) {
            const p = easeInOut((pt - to.climbStart) / Math.max(0.5, to.airborneStart - to.climbStart));
            targetX = 0;
            targetZ = THREE.MathUtils.lerp(26.2, 0, p);
            targetY = THREE.MathUtils.lerp(1.85, 2.95, p);
            targetPitch = THREE.MathUtils.lerp(-0.24, -0.03, p);
            targetGear = 1;
            gearSpeed = 2.2;
            setFlightLabel('🔥 GEARS UP, SMOKE ON! • MENANJAK MENUJU 5.000 FT');
          } else {
            targetZ = 0;
            targetY = 2.95;
            targetGear = 1;
            setFlightState('airborne', 'JUPITER AEROBATIC SHOW • 6-SHIP FORMASI MENGUDARA');
          }
        } else if (isVvipUnit && pt < taxiStart) {
          // Fase Persiapan & Pengumuman Keberangkatan VVIP di Apron sebelum mulai Taxi & Take Off!
          targetX = -31.5;
          targetZ = -10.5;
          targetY = 0;
          targetYawOffset = Math.PI / 2;
          targetGear = 0;
          setFlightLabel('🎙️ KAPTEN PNB HERLANI (INDONESIA ONE) • PENGUMUMAN KEBERANGKATAN MENUJU SENTANI JAYAPURA');
        } else if (pt < taxiEnd) {
          // Fase 0A: Taxi keluar perlahan dari Hanggar TNI AU menyusuri jalur taxiway kuning panjang
          const p = easeInOut((pt - taxiStart) / Math.max(0.5, taxiEnd - taxiStart));
          targetX = THREE.MathUtils.lerp(-31.5, -6.5, p);
          targetZ = -10.5;
          targetY = 0;
          targetYawOffset = Math.PI / 2;
          targetGear = 0;
          setFlightLabel('TAXI OUT • KELUAR DARI HANGGAR MENUJU RUNWAY');
        } else if (pt < lineUpEnd) {
          // Fase 0B: Belok kiri mulus (Line-Up) masuk garis tengah Runway!
          const p = easeInOut((pt - taxiEnd) / Math.max(0.5, lineUpEnd - taxiEnd));
          targetX = THREE.MathUtils.lerp(-6.5, 0, p);
          targetZ = THREE.MathUtils.lerp(-10.5, -8.5, p);
          targetY = 0;
          targetYawOffset = THREE.MathUtils.lerp(Math.PI / 2, 0, p);
          targetGear = 0;
          setFlightLabel('LINE UP • MASUK POSISI START RUNWAY');
        } else if (pt < to.rollStart) {
          // Fase 1: BERHENTI MANTAP di garis start Runway sambil komunikasi radio Tower & checklist selesai!
          targetX = 0;
          targetZ = -8.5;
          targetY = 0;
          targetYawOffset = 0;
          const nearRoll = pt > to.rollStart - 1.4;
          targetPitch = nearRoll ? Math.sin(t * 36) * 0.004 : 0;
          targetGear = 0;
          setFlightLabel(
            nearRoll
              ? '📡 ATC: CLEARED FOR TAKE OFF • FULL POWER / AFTERBURNER ON!'
              : '🎙️ KOMUNIKASI KOKPIT & TOWER • PERSIAPAN LEPAS LANDAS DI RUNWAY',
          );
        } else if (pt < to.rotStart) {
          // Fase 2: Akselerasi panjang di sepanjang aspal runway (tepat saat aba-aba "Rolling / Power Set"!)
          const p = (pt - to.rollStart) / Math.max(0.5, to.rotStart - to.rollStart);
          targetZ = THREE.MathUtils.lerp(-8.5, 2.8, p * p);
          targetY = 0;
          targetPitch = -0.02 * p;
          targetGear = 0;
          setFlightLabel('TAHAP 1 • TAKE OFF • ROLLING & AKSELERASI DI RUNWAY');
        } else if (pt < to.climbStart) {
          // Fase 3: Rotation & Liftoff (tepat saat aba-aba "Rotate / Airborne"!)
          const p = (pt - to.rotStart) / Math.max(0.5, to.climbStart - to.rotStart);
          const ease = easeInOut(p);
          targetZ = THREE.MathUtils.lerp(2.8, 5.2, ease);
          targetY = THREE.MathUtils.lerp(0, 1.75, p * p);
          targetPitch = (isHeavy ? -0.18 : -0.27) * Math.sin(Math.min(1, p * 1.2) * (Math.PI / 2));
          targetGear = 0;
          setFlightLabel('TAHAP 1 • TAKE OFF • ROTATION & LIFTOFF (AIRBORNE!)');
        } else if (pt < to.airborneStart) {
          // Fase 4: Initial Climb & Roda masuk otomatis
          const p = easeInOut((pt - to.climbStart) / Math.max(0.5, to.airborneStart - to.climbStart));
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
      if (unit.id === 'kt1b') {
        // JUPITER AEROBATIC SHOW (Mengudara):
        // 0..10s: Terbang jelajah jeda 10 detik
        // 10..21s: Tighten up into Arrowhead formation
        // 21..25.5s: Pull up 20 degrees
        // 25.5..28.8s: JUPITER ROLL 360°!
        // 29.5..46.5s: J5 & J6 Opposing Pass Crossing!
        targetX = Math.sin(t * 0.45) * 0.22;
        targetY = 2.95 + Math.sin(t * 1.4) * 0.1;
        targetZ = 0;
        targetGear = 1;
        if (pt < 10.0) {
          targetPitch = -0.025;
          targetRoll = Math.cos(t * 0.9) * 0.03;
          setFlightLabel('JUPITER AEROBATIC TEAM • MENUJU AEROBATIC BOX (5.000 FT)');
        } else if (pt < 21.0) {
          targetPitch = -0.03;
          targetRoll = 0;
          setFlightLabel('🎙️ JUPITERS, TIGHTEN UP INTO ARROWHEAD FORMATION • STEADY ON MY WING');
        } else if (pt < 24.5) {
          const p = easeInOut((pt - 21.0) / 3.5);
          targetPitch = -0.03 - 0.3 * p;
          targetY = 2.95 + 1.2 * p;
          targetRoll = 0;
          setFlightLabel('🎙️ STANDBY FOR JUPITER ROLL • PULLING UP 20 DEGREES... READY...');
        } else if (pt < 29.5) {
          // Putaran Jupiter Roll santai & anggun (5 detik penuh untuk 1 putaran 360°)
          const p = easeInOut((pt - 24.5) / 5.0);
          targetPitch = -0.18 * Math.sin(p * Math.PI);
          targetY = 4.15 - 1.2 * p;
          directRoll = -p * Math.PI * 2;
          setFlightLabel('🔥 ROLL... NOW! • JUPITER ROLL 360° SANTAI & ANGGUN');
        } else if (pt < 46.5) {
          // 29.5..46.5: Opposing Pass HANYA 2 pesawat (J5 & J6) — J1 mundur & sembunyi jauh di belakang!
          const pullBack = pt < 31.2 ? easeInOut((pt - 29.2) / 2.0) : pt > 44.5 ? 1 - easeInOut((pt - 44.5) / 2.0) : 1;
          targetZ = -110.0 * pullBack;
          targetY = 2.95 + 16.0 * pullBack;
          targetPitch = -0.025;
          targetRoll = 0;
          setFlightLabel(
            pt < 37.5
              ? '🎙️ JUPITER 5 & 6 BREAKING OFF FOR OPPOSING PASS (500 FT)'
              : pt < 44.5
                ? '⚡ CLOSING SPEED 400 KNOTS... THREE, TWO, ONE... CROSSING!'
                : '🔥 OPPOSING PASS CROSSING SUKSES! • REJOIN FORMASI',
          );
        } else if (pt < 54.0) {
          // 47.0..54.0: Climbing vertical for the Heart Maneuver!
          const p = easeInOut(Math.max(0, (pt - 47.0) / 7.0));
          targetY = 2.95 + 5.2 * p;
          targetPitch = -0.58 * Math.sin(p * Math.PI * 0.85);
          targetRoll = 0;
          setFlightLabel('🎙️ JUPITERS, CLIMBING VERTICAL FOR THE HEART MANEUVER! PULL... PULL...');
        } else if (pt < 68.5) {
          // 54.0..68.5: Heart Maneuver HANYA 2 pesawat (J5 & J6) lalu J4 menembus Hati — J1 mundur jauh di belakang!
          const pullBack = pt < 55.8 ? easeInOut((pt - 54.0) / 1.8) : pt > 66.8 ? 1 - easeInOut((pt - 66.8) / 1.7) : 1;
          targetZ = -115.0 * pullBack;
          targetY = 3.2 + 16.0 * pullBack;
          targetPitch = -0.04;
          targetRoll = 0;
          setFlightLabel(
            pt < 64.0
              ? '❤️ HEART MANEUVER • JUPITER 5 & 6 MELUKIS HATI DI LANGIT!'
              : '💘 JUPITER 4 PIERCING THE HEART! • SMOKE OFF!',
          );
        } else if (pt < 74.5) {
          // 68.5..74.5: All Jupiters pitch up vertical for Bomb Burst!
          const p = easeInOut((pt - 68.5) / 6.0);
          targetY = 3.2 + 5.6 * p;
          targetPitch = -0.78 * p;
          targetRoll = 0;
          setFlightLabel('🔥 FINAL MANEUVER: BOMB BURST! • PITCH UP VERTICAL... READY...');
        } else if (pt < 82.6) {
          // 74.5..82.6: BREAK, BREAK, BREAK!
          const p = easeInOut((pt - 74.5) / 8.1);
          const arch = Math.sin(p * Math.PI);
          targetY = 8.8 + 3.2 * arch - 5.8 * p;
          targetZ = 4.0 * arch;
          targetPitch = THREE.MathUtils.lerp(-0.78, 0.12, p);
          targetRoll = 0.25 * Math.sin(p * Math.PI);
          setFlightLabel('💥 BREAK, BREAK, BREAK! • 6-SHIP BOMB BURST FINALE!');
        } else if (pt < 85.0) {
          const p = easeInOut((pt - 82.6) / 2.4);
          targetY = THREE.MathUtils.lerp(6.2, 2.95, p);
          targetPitch = -0.025;
          targetRoll = 0;
          setFlightLabel('🎙️ JUPITERS, REJOIN ON MY LEFT WING, ECHELON FORMATION • SMOKE OFF');
        } else if (pt < 102.0) {
          targetPitch = -0.025 + Math.sin(t * 1.1) * 0.012;
          targetRoll = Math.cos(t * 0.9) * 0.025;
          setFlightLabel(
            pt < 90.0
              ? '🎙️ JUPITERS, REJOIN ON MY LEFT WING, ECHELON FORMATION • SMOKE OFF'
              : pt < 96.5
                ? '🎙️ ADISUTJIPTO TOWER, SHOW COMPLETE • INITIAL RUNWAY 09 FULL STOP LANDING'
                : '📡 ADISUTJIPTO TOWER: WELCOME BACK • CLEARED TO LAND RUNWAY 09!',
          );
        } else {
          targetPitch = -0.025 + Math.sin(t * 1.2) * 0.015;
          targetRoll = Math.cos(t * 1.1) * 0.035;
          setFlightLabel('JUPITER AEROBATIC TEAM (6-SHIP) • FORMASI ECHELON • SIAP 3. LANDING');
        }
      } else {
        // TERBANG JELAJAH STABIL DI ATAS PERKOTAAN, LAUT & RUNWAY
        targetX = Math.sin(t * 0.55) * 0.35;
        targetY = 2.95 + Math.sin(t * 1.8) * 0.14;
        targetZ = 0;
        targetPitch = (isHeli ? 0.04 : -0.025) + Math.sin(t * 1.2) * 0.015;
        targetRoll = Math.cos(t * 1.1) * 0.04;
        targetGear = 1;
        setFlightLabel('TERBANG JELAJAH • SIAP 2. MANUVER ATAU 3. LANDING');
      }
    } else if (flightMode === 'aar') {
      // AIR-TO-AIR REFUELING (AAR) dengan Tanker KC-130B Hercules Skadron Udara 32
      targetGear = 1;
      if (pt < 4.0) {
        // Tahap 1: Pendekatan stabil dari belakang-bawah menuju Drogue Basket
        const p = easeInOut(pt / 4.0);
        targetX = 0;
        targetY = THREE.MathUtils.lerp(0.35, 1.38, p);
        targetZ = THREE.MathUtils.lerp(-6.8, -1.6, p);
        targetPitch = -0.04 * (1 - p);
        targetRoll = Math.sin(t * 1.4) * 0.02;
      } else if (pt < 5.8) {
        // Tahap 2: Docking presisi Probe masuk ke Drogue Basket (z = +5.65, y = +2.72)
        const p = easeInOut((pt - 4.0) / 1.8);
        targetX = 0;
        targetY = THREE.MathUtils.lerp(1.38, 1.46, p);
        targetZ = THREE.MathUtils.lerp(-1.6, -0.55, p);
        targetPitch = 0;
        targetRoll = 0;
      } else if (pt < 14.5) {
        // Tahap 3: Terkunci stabil menerima transfer bahan bakar Avtur (35% -> 100%)
        targetX = Math.sin(t * 1.1) * 0.04;
        targetY = 1.46 + Math.sin(t * 1.3) * 0.04;
        targetZ = -0.55;
        targetPitch = 0;
        targetRoll = Math.sin(t * 0.9) * 0.012;
      } else {
        // Tahap 4: Disconnect & Break Away elegan ke kanan-bawah
        const p = easeInOut(Math.min(1, (pt - 14.5) / 3.5));
        targetX = THREE.MathUtils.lerp(0, 8.2, p);
        targetY = THREE.MathUtils.lerp(1.46, 0.25, p);
        targetZ = THREE.MathUtils.lerp(-0.55, -5.2, p);
        targetRoll = -0.62 * Math.sin(p * Math.PI * 0.85);
        targetPitch = 0.08 * Math.sin(p * Math.PI);
        targetYawOffset = -0.22 * p;
      }
    } else if (flightMode === 'mission') {
      if (isHeli) {
        // SAR Hoist Laut: Hover stabil di atas permukaan ombak sambil mengulur tali winch & tandu penyelamatan
        targetX = Math.sin(t * 0.65) * 0.22;
        targetY = 4.45 + Math.sin(t * 1.4) * 0.1;
        targetZ = 0;
        targetPitch = 0.03 + Math.sin(t * 1.1) * 0.015;
        targetRoll = Math.cos(t * 1.0) * 0.028;
        targetGear = 0;
      } else if (isHeavy) {
        // Airdrop Kopasgat & Logistik: Terbang datar mantap di ketinggian penerjunan
        targetX = Math.sin(t * 0.55) * 0.25;
        targetY = 3.25 + Math.sin(t * 1.2) * 0.12;
        targetZ = 0;
        targetPitch = -0.04;
        targetRoll = Math.cos(t * 0.85) * 0.03;
        targetGear = 1;
      } else {
        // Flare Countermeasure Pesawat Tempur / Latih: Manuver menghindar rudal S-turn sambil melepaskan flare!
        targetX = Math.sin(t * 1.35) * 2.2;
        targetY = 3.0 + Math.cos(t * 1.15) * 0.45;
        targetZ = 0;
        targetRoll = -Math.cos(t * 1.35) * 0.62;
        targetPitch = -0.08 + Math.sin(t * 1.2) * 0.08;
        targetYawOffset = -Math.cos(t * 1.35) * 0.18;
        targetGear = 1;
      }
    } else if (flightMode === 'maneuver') {
      const baseH = Math.max(2.6, procedural.hoverHeight + 1.15);
      targetGear = 1;

      if (isFighter) {
        // 19 MANUVER PESAWAT TEMPUR AKURAT SECARA AERODINAMIKA (Dasar, Dogfight ACM, & Supermaneuverability)
        // Konvensi sumbu Three.js pesawat (+Z = Hidung, +Y = Atas, +X = Sayap Kiri, -X = Sayap Kanan):
        // - Pitch < 0 = Hidung naik (climb), Pitch > 0 = Hidung turun (dive)
        // - Roll < 0 = Miring kiri (bank left) -> Yaw > 0 (belok kiri ke +X)
        // - Roll > 0 = Miring kanan (bank right) -> Yaw < 0 (belok kanan ke -X)
        const cycleLen = 8.0;
        const activeF: Exclude<FighterManeuverId, 'auto'> =
          fighterManeuver === 'auto'
            ? FIGHTER_AUTO_ORDER[Math.floor(pt / cycleLen) % FIGHTER_AUTO_ORDER.length]
            : fighterManeuver;
        const fSpec = getFighterManeuverSpec(activeF);
        const p = (pt % cycleLen) / cycleLen;
        const e = easeInOut(p);
        setFlightLabel(`MANUVER TEMPUR // ${fSpec.name.toUpperCase()}`);

        switch (activeF) {
          case 'loop': {
            // 360° Vertical Loop sejati: menanjak vertikal -> terbalik di puncak -> menukik -> rata kembali
            const a = p * Math.PI * 2;
            directPitch = -a;
            targetY = baseH + (1 - Math.cos(a)) * 2.8;
            targetZ = Math.sin(a) * 2.8;
            break;
          }
          case 'barrelRoll': {
            // Helical Barrel Roll: gulingan 360° kiri sambil menyusuri lintasan melingkar spiral di udara
            const a = e * Math.PI * 2;
            directRoll = -a;
            targetX = Math.sin(a) * 1.85;
            targetY = baseH + (1 - Math.cos(a)) * 1.35;
            targetPitch = -0.18 * Math.sin(a);
            break;
          }
          case 'aileronRoll': {
            // Pure Aileron Roll 360° pada poros longitudinal tanpa melenceng dari jalur lurus
            directRoll = -e * Math.PI * 2;
            targetY = baseH + 0.2;
            targetPitch = -0.05;
            break;
          }
          case 'splitS': {
            // Split-S sejati: Guling 180° terbalik di ketinggian -> Tarik setengah loop menukik tajam -> Recovery rata di bawah!
            if (p < 0.26) {
              const q = easeInOut(p / 0.26);
              directRoll = q * Math.PI;
              targetY = baseH + 2.8;
              targetPitch = 0;
            } else if (p < 0.78) {
              const q = easeInOut((p - 0.26) / 0.52);
              const a = q * Math.PI;
              directRoll = Math.PI;
              directPitch = a; // Dari terbalik (0) -> menukik vertikal (+PI/2) -> kembali tegak (+PI)
              targetY = baseH + 2.8 - (1 - Math.cos(a)) * 1.9;
              targetZ = Math.sin(a) * 2.1;
            } else {
              const q = easeInOut((p - 0.78) / 0.22);
              directRoll = Math.PI * (1 - q);
              directPitch = Math.PI * (1 - q);
              targetY = THREE.MathUtils.lerp(baseH - 1.0, baseH + 2.8, q);
            }
            break;
          }
          case 'immelmann': {
            // Immelmann Turn sejati: Setengah loop menanjak -> Guling 180° tegak di puncak -> Terbang rata di ketinggian!
            if (p < 0.52) {
              const q = easeInOut(p / 0.52);
              const a = q * Math.PI;
              directPitch = -a;
              directRoll = 0;
              targetY = baseH - 0.5 + (1 - Math.cos(a)) * 1.8;
              targetZ = Math.sin(a) * 2.0;
            } else if (p < 0.8) {
              const q = easeInOut((p - 0.52) / 0.28);
              directPitch = -Math.PI;
              directRoll = q * Math.PI; // Guling 180° dari terbalik menjadi tegak lurus!
              targetY = baseH + 3.1;
            } else {
              const q = easeInOut((p - 0.8) / 0.2);
              targetY = THREE.MathUtils.lerp(baseH + 3.1, baseH - 0.5, q);
              targetPitch = 0;
              targetRoll = 0;
            }
            break;
          }
          case 'chandelle': {
            // Chandelle: Belokan menanjak 180° ke KIRI dengan bank, yaw, pitch, & X selaras 100%!
            const s = Math.sin(p * Math.PI);
            targetX = 3.2 * s;
            targetY = baseH - 0.3 + 2.6 * e;
            targetRoll = -0.82 * s; // Bank kiri
            targetPitch = -0.36 * s; // Hidung menanjak
            targetYawOffset = 0.62 * s; // Hidung mengarah masuk ke belokan kiri (+X)
            break;
          }
          case 'cubanEight': {
            // Cuban Eight: Lintasan angka 8 vertikal di bidang Y-Z dengan setengah guling saat melintas turun!
            const a = p * Math.PI * 2;
            const zPos = Math.sin(a) * 3.2;
            const yPos = Math.sin(a * 2) * 1.6;
            const dz = Math.cos(a) * 3.2;
            const dy = Math.cos(a * 2) * 3.2;
            targetZ = zPos;
            targetY = baseH + 1.2 + yPos;
            targetPitch = -Math.atan2(dy, Math.abs(dz) + 0.6) * 0.85;
            directRoll = Math.sin(a) * Math.PI;
            break;
          }
          case 'highGTurn': {
            // High-G Break Turn kiri -> kanan (bank, yaw, & lintasan lateral 100% searah!)
            const s = Math.sin(p * Math.PI * 2);
            targetX = 3.4 * s;
            targetY = baseH + 0.45 * Math.abs(s);
            targetRoll = -1.28 * s; // s>0 belok kiri (-roll, +yaw, +X); s<0 belok kanan (+roll, -yaw, -X)
            targetPitch = -0.18 * Math.abs(s);
            targetYawOffset = 0.42 * s;
            break;
          }
          case 'highYoYo': {
            // High Yo-Yo: Menanjak ke luar belokan untuk membuang kecepatan berlebih lalu menukik kembali ke ekor lawan
            const s = Math.sin(p * Math.PI);
            targetX = 2.6 * s;
            targetY = baseH + 2.4 * Math.pow(s, 0.85);
            targetZ = -1.2 * s;
            targetRoll = -0.82 * s;
            targetYawOffset = 0.34 * s;
            targetPitch = -0.48 * Math.cos(p * Math.PI);
            break;
          }
          case 'lowYoYo': {
            // Low Yo-Yo: Menukik ke dalam belokan untuk menambah kecepatan & memotong sudut lawan
            const s = Math.sin(p * Math.PI);
            targetX = 2.4 * s;
            targetY = baseH - 1.35 * s;
            targetZ = 1.5 * s;
            targetRoll = -0.78 * s;
            targetYawOffset = 0.32 * s;
            targetPitch = 0.42 * Math.cos(p * Math.PI);
            break;
          }
          case 'scissors': {
            // Rolling / Flat Scissors: Belok zig-zag tajam kiri <-> kanan saling memaksa overshoot
            const w = Math.sin(p * Math.PI * 4);
            targetX = 2.6 * w;
            targetY = baseH + 0.5 * Math.cos(p * Math.PI * 4);
            targetRoll = -1.18 * w;
            targetYawOffset = 0.36 * w;
            targetPitch = -0.12;
            break;
          }
          case 'displacementRoll': {
            // Lag / Displacement Roll: Barrel roll keluar bidang belokan agar tidak overshoot
            const a = e * Math.PI * 2;
            directRoll = -a;
            targetX = Math.sin(a) * 1.9;
            targetY = baseH + 1.05 * (1 - Math.cos(a));
            targetZ = -0.85 * Math.sin(p * Math.PI);
            targetPitch = -0.16 * Math.sin(a);
            break;
          }
          case 'circleFight': {
            // One-Circle Dogfight: Berputar melingkar rapat miring penuh (bank kanan +1.15 rad, hidung selalu tangensial!)
            const a = p * Math.PI * 2;
            targetX = -Math.cos(a) * 3.0;
            targetZ = Math.sin(a) * 2.4;
            targetY = baseH + 0.65;
            targetRoll = 1.15; // Bank kanan konstan
            targetYawOffset = -a; // Hidung selalu menghadap arah gerak melingkar!
            targetPitch = -0.14;
            break;
          }
          case 'thachWeave': {
            // Thach Weave: Lintasan menyilang lebar kiri <-> kanan saling melindungi ekor wingman
            const w = Math.sin(p * Math.PI * 2);
            targetX = 3.8 * w;
            targetY = baseH + 0.55 * Math.abs(w);
            targetRoll = -1.02 * w;
            targetYawOffset = 0.48 * w;
            targetPitch = -0.08 * Math.abs(w);
            break;
          }
          case 'cobra': {
            // Pugachev's Cobra sejati: Mendongak cepat melewati 90° hingga ~106° (-1.85 rad), jeda singkat, lalu kembali rata & akselerasi!
            let cobraPitch = 0;
            let zDrift = 0;
            let yLift = 0;
            if (p < 0.35) {
              const q = easeInOut(p / 0.35);
              cobraPitch = -1.85 * q;
              yLift = 0.75 * q;
              zDrift = -1.4 * q;
            } else if (p < 0.58) {
              cobraPitch = -1.85;
              yLift = 0.75;
              zDrift = -1.4 - ((p - 0.35) / 0.23) * 0.45;
            } else {
              const q = easeInOut((p - 0.58) / 0.42);
              cobraPitch = -1.85 * (1 - q);
              yLift = 0.75 * (1 - q);
              zDrift = THREE.MathUtils.lerp(-1.85, 0.5, q);
            }
            targetX = 0;
            targetY = baseH + yLift;
            targetZ = zDrift;
            directPitch = cobraPitch;
            targetRoll = Math.sin(t * 2.0) * 0.02;
            break;
          }
          case 'kulbit': {
            // Kulbit / Frolov's Chakra: Salto vertikal 360° super ketat di poros ekor (radius kecil!)
            const a = e * Math.PI * 2;
            directPitch = -a;
            targetY = baseH + (1 - Math.cos(a)) * 0.75;
            targetZ = Math.sin(a) * 0.75 - 0.6 * Math.sin(e * Math.PI);
            break;
          }
          case 'herbst': {
            // Herbst J-Turn: Mendongak tinggi melewati stall (~72°) -> Pivot yaw/roll cepat 180° -> Akselerasi rata!
            const s = Math.sin(p * Math.PI);
            targetPitch = -1.25 * Math.pow(s, 0.72);
            targetYawOffset = e * Math.PI;
            targetRoll = -0.88 * s;
            targetY = baseH + 1.25 * s;
            break;
          }
          case 'fallingLeaf': {
            // Falling Leaf: Pesawat stall melayang turun berayun seperti daun jatuh dari kiri ke kanan
            const sway = Math.sin(p * Math.PI * 4);
            targetX = sway * 2.5;
            targetY = baseH + 1.9 - p * 2.5;
            targetRoll = -sway * 0.82;
            targetPitch = 0.14 + Math.cos(p * Math.PI * 4) * 0.2;
            targetYawOffset = sway * 0.38;
            break;
          }
          case 'tailslide': {
            // Tailslide (Bell Maneuver) halus tanpa lompatan sudut:
            // Menanjak vertikal -90° -> Berhenti & meluncur mundur ekor dulu -> Hidung jatuh menukik mulus -> Pull-out rata!
            if (p < 0.38) {
              const q = easeInOut(p / 0.38);
              targetY = THREE.MathUtils.lerp(baseH - 0.4, baseH + 3.2, q);
              directPitch = -q * (Math.PI / 2);
            } else if (p < 0.58) {
              const q = (p - 0.38) / 0.2;
              targetY = THREE.MathUtils.lerp(baseH + 3.2, baseH + 1.9, q);
              directPitch = -(Math.PI / 2);
            } else if (p < 0.8) {
              const q = easeInOut((p - 0.58) / 0.22);
              targetY = THREE.MathUtils.lerp(baseH + 1.9, baseH + 0.3, q);
              directPitch = THREE.MathUtils.lerp(-(Math.PI / 2), 0.78, q);
            } else {
              const q = easeInOut((p - 0.8) / 0.2);
              targetY = THREE.MathUtils.lerp(baseH + 0.3, baseH - 0.4, q);
              directPitch = THREE.MathUtils.lerp(0.78, 0, q);
            }
            break;
          }
        }
      } else if (isTrainer) {
        // MANUVER AEROBATIK PESAWAT LATIH / COIN (Super Tucano, G120TP, dll. — arah bank/yaw/X 100% akurat!)
        const cycle = pt % 16;
        if (cycle < 4.5) {
          const p = easeInOut(cycle / 4.5);
          directRoll = -p * Math.PI * 2;
          targetX = Math.sin(p * Math.PI * 2) * 0.75;
          targetY = baseH + 0.45 * Math.sin(p * Math.PI);
          targetPitch = -0.06 * Math.sin(p * Math.PI);
          setFlightLabel('MANUVER AEROBATIK // 360° AILERON ROLL');
        } else if (cycle < 8.5) {
          const s = Math.sin(((cycle - 4.5) / 4) * Math.PI);
          targetX = 2.1 * s; // Belok kiri (+X)
          targetY = baseH + 0.9 * s;
          targetRoll = -0.76 * s; // Bank kiri
          targetPitch = -0.22 * s;
          targetYawOffset = 0.28 * s; // Hidung mengarah kiri (+X)
          setFlightLabel('MANUVER AEROBATIK // CHANDELLE CLIMB KIRI');
        } else if (cycle < 12.5) {
          const s = Math.sin(((cycle - 8.5) / 4) * Math.PI);
          targetX = -2.1 * s; // Belok kanan (-X)
          targetY = baseH + 0.35 * s;
          targetRoll = 0.76 * s; // Bank kanan
          targetPitch = -0.08 * s;
          targetYawOffset = -0.28 * s; // Hidung mengarah kanan (-X)
          setFlightLabel('MANUVER TAKTIS // BREAK TURN KANAN');
        } else {
          const s = Math.sin(((cycle - 12.5) / 3.5) * Math.PI);
          targetY = baseH - 0.85 * s;
          targetPitch = 0.28 * s;
          setFlightLabel('MANUVER TAKTIS // DIVE & RECOVERY');
        }
      } else if (isHeli) {
        // MANUVER TAKTIS HELIKOPTER (Caracal & Colibri — arah bank/yaw/X 100% akurat!)
        const cycle = pt % 16;
        if (cycle < 4) {
          const s = Math.sin((cycle / 4) * Math.PI);
          targetX = -1.9 * s; // Belok kanan (-X)
          targetY = baseH + 0.25 * s;
          targetRoll = 0.34 * s; // Bank kanan
          targetPitch = 0.1 * s;
          targetYawOffset = -0.24 * s; // Hidung menghadap kanan (-X)
          setFlightLabel('MANUVER HELIKOPTER // COORDINATED BANK KANAN');
        } else if (cycle < 8) {
          const s = Math.sin(((cycle - 4) / 4) * Math.PI);
          targetX = 1.9 * s; // Belok kiri (+X)
          targetY = baseH + 0.25 * s;
          targetRoll = -0.34 * s; // Bank kiri
          targetPitch = 0.1 * s;
          targetYawOffset = 0.24 * s; // Hidung menghadap kiri (+X)
          setFlightLabel('MANUVER HELIKOPTER // COORDINATED BANK KIRI');
        } else if (cycle < 12) {
          const s = Math.sin(((cycle - 8) / 4) * Math.PI);
          targetY = baseH - 0.45 * s;
          targetZ = 1.15 * s;
          targetPitch = 0.22 * s; // Hidung menunduk tajam (forward cyclic dash)
          setFlightLabel('MANUVER HELIKOPTER // HIGH-SPEED FORWARD DASH');
        } else {
          const s = Math.sin(((cycle - 12) / 4) * Math.PI);
          targetY = baseH + 0.95 * s;
          targetZ = -0.75 * s;
          targetPitch = -0.24 * s; // Rapid quick-stop combat flare
          setFlightLabel('MANUVER HELIKOPTER // RAPID COMBAT FLARE');
        }
      } else {
        // MANUVER TAKTIS PESAWAT ANGKUT & VIP (C-130J, A400M, B737 — arah bank/yaw/X 100% akurat!)
        const cycle = pt % 16;
        if (cycle < 4) {
          const s = Math.sin((cycle / 4) * Math.PI);
          targetX = -1.8 * s; // Belok kanan (-X)
          targetY = baseH + 0.25 * s;
          targetRoll = 0.3 * s; // Bank kanan
          targetPitch = -0.05 * s;
          targetYawOffset = -0.2 * s; // Hidung menghadap kanan (-X)
          setFlightLabel('MANUVER TAKTIS // COORDINATED BANK KANAN');
        } else if (cycle < 8) {
          const s = Math.sin(((cycle - 4) / 4) * Math.PI);
          targetX = 1.8 * s; // Belok kiri (+X)
          targetY = baseH + 0.25 * s;
          targetRoll = -0.3 * s; // Bank kiri
          targetPitch = -0.05 * s;
          targetYawOffset = 0.2 * s; // Hidung menghadap kiri (+X)
          setFlightLabel('MANUVER TAKTIS // COORDINATED BANK KIRI');
        } else if (cycle < 12) {
          const s = Math.sin(((cycle - 8) / 4) * Math.PI);
          targetY = baseH + 1.25 * s;
          targetZ = 0.6 * s;
          targetPitch = -0.2 * s;
          setFlightLabel('MANUVER TAKTIS // TACTICAL CLIMB');
        } else {
          const s = Math.sin(((cycle - 12) / 4) * Math.PI);
          targetY = Math.max(1.5, baseH - 0.85 * s);
          targetZ = -0.5 * s;
          targetPitch = 0.14 * s;
          setFlightLabel('MANUVER TAKTIS // TACTICAL DESCENT');
        }
      }
    } else if (flightMode === 'landing') {
      if (isHeli) {
        // LANDING HELIKOPTER: Tunggu suara Halim Tower (18.08s) selesai penuh di udara -> baru turun Approach -> Hover -> Touchdown -> Taxi Hanggar!
        if (pt < 19.0) {
          targetZ = -10.5;
          targetY = 6.4 + Math.sin(t * 1.4) * 0.1;
          targetPitch = 0.03;
          targetGear = 0;
          gearSpeed = 2.0;
          setFlightLabel('📡 HALIM TOWER • CARACAL 01 PERSIAPAN LANDING MENUJU HELIPAD SELATAN');
        } else if (pt < 22.4) {
          const p = easeInOut((pt - 19.0) / 3.4);
          targetZ = THREE.MathUtils.lerp(-10.5, 0, p);
          targetY = THREE.MathUtils.lerp(6.4, 1.8, p);
          targetPitch = 0.06 * (1 - p);
          targetGear = 0;
          gearSpeed = 2.0;
          setFlightLabel('TAHAP 3 • LANDING • TURUN PERLAHAN MENUJU HELIPAD SELATAN');
        } else if (pt < 25.0) {
          const p = easeInOut((pt - 22.4) / 2.6);
          targetZ = 0;
          targetY = THREE.MathUtils.lerp(1.8, 0, p);
          targetPitch = -0.08 * Math.sin(p * Math.PI);
          targetGear = 0;
          setFlightLabel('TAHAP 3 • LANDING • HOVER & TOUCHDOWN VERTIKAL');
        } else if (pt < 27.6) {
          // Tetap berhenti mantap tepat di tengah Helipad Selatan H sambil rotor melambat (idle) — tidak masuk hanggar!
          targetX = 0;
          targetZ = 0;
          targetY = 0;
          targetPitch = 0;
          targetYawOffset = 0;
          targetGear = 0;
          setFlightLabel('HELIPAD SELATAN H // TOUCHDOWN AMAN — ROTOR IDLE & MISI SELESAI');
        } else {
          setFlightState('parked', null);
        }
      } else {
        // LANDING PESAWAT SAYAP TETAP (Sinkron penuh dengan aba-aba "Touchdown!" & pengereman di suara kokpit!):
        const ld = getLandingTiming(unit.id);
        if (pt < ld.approachEnd) {
          // Fase 1: Long Final Approach turun halus mengikuti glide slope + Roda keluar
          const p = pt / Math.max(0.5, ld.approachEnd);
          targetZ = THREE.MathUtils.lerp(-18.5, -4.0, p);
          targetY = THREE.MathUtils.lerp(8.2, 1.75, p);
          targetPitch = 0.06;
          targetGear = unit.id === 'kt1b' && pt < 3.2 ? 1 : 0;
          gearSpeed = 1.8;
          setFlightLabel(
            unit.id === 'kt1b'
              ? pt < 3.2
                ? '🎙️ CLEARED TO LAND RUNWAY 09, JUPITER FLIGHT'
                : '🎙️ JUPITERS, GEARS DOWN, FLAPS FULL... • PENDEKATAN FINAL'
              : '📡 FINAL APPROACH • RODA PENDARAT TERKUNCI & FLAPS PENUH',
          );
        } else if (pt < ld.touchTime) {
          // Fase 2: Landing Flare mulus tepat sebelum Touchdown!
          const p = (pt - ld.approachEnd) / Math.max(0.5, ld.touchTime - ld.approachEnd);
          const ease = easeInOut(p);
          targetZ = THREE.MathUtils.lerp(-4.0, -1.5, p);
          targetY = THREE.MathUtils.lerp(1.75, 0.05, ease);
          targetPitch = THREE.MathUtils.lerp(0.06, isHeavy ? -0.14 : -0.2, ease);
          targetGear = 0;
          setFlightLabel('TAHAP 3 • LANDING • FLARE — BERSIAP TOUCHDOWN!');
        } else if (pt < ld.rolloutEnd) {
          // Fase 3: Main Gear Touchdown tepat di aba-aba "Touchdown!" & High-Speed Runway Rollout!
          const p = (pt - ld.touchTime) / Math.max(0.5, ld.rolloutEnd - ld.touchTime);
          targetX = 0;
          targetZ = THREE.MathUtils.lerp(-1.5, 1.4, easeInOut(p));
          targetY = p < 0.14 ? Math.sin((p / 0.14) * Math.PI) * 0.04 : 0;
          targetPitch = THREE.MathUtils.lerp(isHeavy ? -0.14 : -0.2, 0, Math.min(1, p * 1.65));
          targetYawOffset = 0;
          targetGear = 0;
          setFlightLabel('TAHAP 3 • TOUCHDOWN! • DRAG CHUTE / REVERSE THRUST AKTIF');
        } else if (pt < ld.brakeEnd) {
          // Fase 4: Pengereman Panjang & Halus lurus di runway sampai berhenti!
          const p = (pt - ld.rolloutEnd) / Math.max(0.5, ld.brakeEnd - ld.rolloutEnd);
          targetX = 0;
          targetZ = THREE.MathUtils.lerp(1.4, 2.2, easeInOut(p));
          targetY = 0;
          targetPitch = Math.sin(p * Math.PI) * 0.018;
          targetYawOffset = 0;
          targetGear = 0;
          setFlightLabel('TAHAP 3 • LANDING • PENGEREMAN AKTIF DI RUNWAY');
        } else if (pt < ld.holdEnd) {
          targetX = 0;
          targetZ = 2.2;
          targetY = 0;
          targetPitch = 0;
          targetYawOffset = 0;
          targetGear = 0;
          setFlightLabel('📡 ATC: BERHENTI DI RUNWAY • BERSIAP TAXI KE HANGGAR');
        } else if (pt < ld.turnEnd) {
          const p = easeInOut((pt - ld.holdEnd) / Math.max(0.5, ld.turnEnd - ld.holdEnd));
          targetX = THREE.MathUtils.lerp(0, -8.0, p);
          targetZ = THREE.MathUtils.lerp(2.2, 3.5, p);
          targetY = 0;
          targetYawOffset = THREE.MathUtils.lerp(0, -Math.PI / 2, p);
          targetGear = 0;
          setFlightLabel('TAXI IN • BELOK PERLAHAN KELUAR RUNWAY MENUJU HANGGAR');
        } else if (pt < ld.taxiEnd) {
          const p = easeInOut((pt - ld.turnEnd) / Math.max(0.5, ld.taxiEnd - ld.turnEnd));
          targetX = THREE.MathUtils.lerp(-8.0, -31.5, p);
          targetZ = 3.5;
          targetY = 0;
          targetYawOffset = -Math.PI / 2;
          targetGear = 0;
          setFlightLabel('TAXI IN • MELUNCUR PERLAHAN MASUK KE DALAM HANGGAR');
        } else if (pt < ld.parkEnd) {
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

    if (airframeRef.current) {
      const hideLeadForSolo =
        unit.id === 'kt1b' &&
        flightMode === 'airborne' &&
        ((pt >= 30.8 && pt < 45.0) || (pt >= 54.5 && pt < 68.0));
      airframeRef.current.visible = !hideLeadForSolo;
    }

    // Interpolasi halus posisi & rotasi pesawat
    const posSpeed = flightMode === 'takeoff' || flightMode === 'landing' ? 5.5 : 3.4;
    currentX.current = THREE.MathUtils.lerp(currentX.current, targetX, Math.min(1, dt * posSpeed));
    currentY.current = THREE.MathUtils.lerp(currentY.current, targetY, Math.min(1, dt * posSpeed));
    currentZ.current = THREE.MathUtils.lerp(currentZ.current, targetZ, Math.min(1, dt * posSpeed));

    rootRef.current.position.x = currentX.current;
    rootRef.current.position.y = currentY.current;
    rootRef.current.position.z = currentZ.current;
    if (directPitch !== null) {
      rootRef.current.rotation.x = directPitch;
    } else {
      if (rootRef.current.rotation.x < -Math.PI) rootRef.current.rotation.x += Math.PI * 2;
      if (rootRef.current.rotation.x > Math.PI) rootRef.current.rotation.x -= Math.PI * 2;
      rootRef.current.rotation.x = THREE.MathUtils.lerp(rootRef.current.rotation.x, targetPitch, Math.min(1, dt * 4.5));
    }
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

    // Animasi hidup & Simulasi G-Force pada G-Suit (nafas halus, kepala menoleh natural, & 5 kantung mengembang sesuai 1G/4G/9G!)
    if (unit.id === 'gsuit') {
      const bladders = procedural.group.getObjectByName('gsuit-bladders');
      const upperBody = procedural.group.getObjectByName('gsuit-upper-body');
      const headObj = procedural.group.getObjectByName('gsuit-head');
      const simActive = flightMode === 'engineSim';
      const activeG = simActive ? 9 : gForceLevel;
      const pulse = 0.5 + 0.5 * Math.sin(t * (activeG === 9 ? 4.2 : 2.6));

      // Efek bernafas halus & kepala menoleh natural agar figur 3D tidak kaku!
      if (upperBody) {
        const breath = Math.sin(t * 1.8) * 0.012;
        upperBody.scale.set(1 + breath * 0.6, 1 + breath * 0.3, 1 + breath);
      }
      if (headObj) {
        headObj.rotation.y = Math.sin(t * 0.65) * 0.18;
        headObj.rotation.x = Math.sin(t * 0.9) * 0.04;
      }

      if (bladders) {
        const inflateBase = activeG === 1 ? 0.96 : activeG === 4 ? 1.04 : 1.11;
        const targetInflate = inflateBase + (activeG > 1 ? pulse * (activeG === 9 ? 0.055 : 0.025) : 0);
        bladders.children.forEach((child) => {
          const mesh = child as THREE.Mesh;
          const isTube = mesh.name.includes('tube');
          if (!isTube) {
            mesh.scale.x = THREE.MathUtils.lerp(mesh.scale.x, targetInflate, Math.min(1, dt * 6));
            mesh.scale.z = THREE.MathUtils.lerp(mesh.scale.z, targetInflate, Math.min(1, dt * 6));
          }
          const mat = mesh.material as THREE.MeshStandardMaterial;
          if (mat && 'emissive' in mat) {
            const targetEmissive = isTube
              ? activeG > 1
                ? '#ffb703'
                : '#000000'
              : activeG === 9
                ? '#00e5ff'
                : activeG === 4
                  ? '#38bdf8'
                  : '#0369a1';
            const targetInt = isTube
              ? activeG === 9
                ? 0.5 + pulse * 0.45
                : activeG === 4
                  ? 0.25 + pulse * 0.25
                  : 0
              : activeG === 9
                ? 0.55 + pulse * 0.45
                : activeG === 4
                  ? 0.35 + pulse * 0.2
                  : 0.12;
            mat.emissive.set(targetEmissive);
            mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, targetInt, Math.min(1, dt * 6));
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
    <>
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
            rotorWash={
              procedural.rotorWash &&
              (flightMode === 'takeoff' || flightMode === 'landing' || flightMode === 'mission' || flightMode === 'engineSim')
            }
          />
          <AerodynamicsLayer />
          <GSuitEduLayer />
          <OxygenSystemLayer />
          <HotspotMarkers hotspots={unit.hotspots} />
        </group>
        <SafetySystemLayer />
        <VvipEscortLayer />
        <MissionOpsLayer />
      </group>
      {/* JupiterTakeOffLayer harus berada di WORLD SPACE agar posisi hanggar, runway 3-jalur, dan manuver solo J5/J6 tidak ikut bergeser dengan rootRef J1! */}
      <JupiterTakeOffLayer sourceGroup={procedural.group} />
    </>
  );
}
