import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useHangarStore, useSelectedUnit } from '../../store/useHangarStore';
import { buildDetailedF16 } from '../../utils/f16Builder';
import { aircraftAudio } from '../../utils/aircraftAudio';

interface FlareState {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  age: number;
  maxAge: number;
  active: boolean;
}

interface TracerState {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  age: number;
  maxAge: number;
  active: boolean;
}

interface SmokePuff {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  age: number;
  maxAge: number;
  active: boolean;
  scale0: number;
}

interface DebrisSpark {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  age: number;
  maxAge: number;
  active: boolean;
}

export interface DogfightHeroPose {
  x: number;
  y: number;
  z: number;
  roll: number;
  yawOffset: number;
  pitch: number;
}

const COMBAT_LOOP_SEC = 21.0; // Siklus Dogfight 21 detik selaras penuh dengan suara kokpit pilot: Intercept -> 3 Burst Kanon -> FOX-2 Rudal -> Ledakan & Jatuh Terbakar!

/** Jadwal 3 burst tembakan kanon 30mm/20mm yang disiplin saat hidung terkunci lurus di ekor BANDIT-01. */
const GUN_BURSTS: ReadonlyArray<readonly [number, number]> = [
  [5.0, 5.75],
  [6.6, 7.35],
  [8.2, 8.95],
];

/** Posisi lintasan pesawat musuh BANDIT-01 yang selalu berada di sektor depan-atas agar kejar-kejaran & bidikan kanon 100% realistis. */
export function sampleBanditCombatPos(pt: number, out: THREE.Vector3) {
  const ct = pt % COMBAT_LOOP_SEC;
  if (ct < 4.2) {
    // Fase 1 (0..4.2s): Bandit bermanuver menghindar di depan kiri -> kanan
    const p = ct / 4.2;
    const sweep = Math.sin(p * Math.PI * 1.15 - 0.55);
    out.set(sweep * 11.5, 4.9 + Math.sin(p * Math.PI) * 1.6, 33.0 - p * 5.0);
  } else {
    // Fase 2 & 3 (4.2..10.6s): Pengejaran ketat ekor-ke-ekor (6 o'clock) — Bandit berkelit S-weave di depan hidung hero!
    const t2 = ct - 4.2;
    const x = Math.sin(t2 * 0.92 + 0.5) * 6.4;
    const y = 4.5 + Math.cos(t2 * 0.85) * 1.1;
    const z = 28.0 + Math.sin(t2 * 0.55) * 2.8;
    out.set(x, y, z);
  }
}

/**
 * Pose sinkron pesawat tempur TNI AU (Hero) saat mode Dogfight.
 * Dipakai bersama oleh AircraftModel.tsx & DogfightCombatLayer.tsx agar hidung pesawat TNI AU
 * benar-benar mengarah tepat ke ekor BANDIT-01 saat menembak kanon & meluncurkan rudal!
 */
export function sampleDogfightHeroPose(pt: number): DogfightHeroPose {
  const ct = pt % COMBAT_LOOP_SEC;
  const bandit = new THREE.Vector3();
  sampleBanditCombatPos(pt, bandit);

  if (ct < 4.2) {
    // Fase 1: Belok mengejar masuk ke posisi 6 o'clock di belakang Bandit
    const p = ct / 4.2;
    const heroX = bandit.x * (0.28 + 0.34 * p);
    const heroY = 3.25 + Math.sin(p * Math.PI) * 0.55;
    const heroZ = -0.6 + p * 1.2;
    const dx = bandit.x - heroX;
    const dz = Math.max(8, bandit.z - heroZ);
    const aimYaw = THREE.MathUtils.clamp(Math.atan2(dx, dz), -0.42, 0.42);
    const roll = THREE.MathUtils.clamp(-dx * 0.065, -0.78, 0.78);
    const pitch = THREE.MathUtils.clamp(-(bandit.y - heroY) / dz, -0.16, 0.12);
    return { x: heroX, y: heroY, z: heroZ, roll, yawOffset: aimYaw, pitch };
  }

  if (ct < 10.6) {
    // Fase 2 & 3: Kunci ekor (Guns & FOX-2 Tracking) — hidung pesawat membidik mantap ke BANDIT-01!
    const heroX = bandit.x * 0.66;
    const heroY = 3.2 + (bandit.y - 4.5) * 0.42;
    const heroZ = 0.8 + Math.sin((ct - 4.2) * 0.65) * 0.7;
    const dx = bandit.x - heroX;
    const dy = bandit.y - heroY;
    const dz = Math.max(10, bandit.z - heroZ);
    const aimYaw = THREE.MathUtils.clamp(Math.atan2(dx, dz), -0.32, 0.32);
    const roll = THREE.MathUtils.clamp(-Math.cos((ct - 4.2) * 0.92 + 0.5) * 0.52, -0.62, 0.62);
    const pitch = THREE.MathUtils.clamp(-Math.atan2(dy, dz), -0.14, 0.1);
    return { x: heroX, y: heroY, z: heroZ, roll, yawOffset: aimYaw, pitch };
  }

  // Fase 4 (10.6..18.0s): Break-away menang elegan setelah SPLASH ONE!
  const bT = Math.min(1, (ct - 10.6) / 6.8);
  const arch = Math.sin(bT * Math.PI);
  return {
    x: -3.2 * arch,
    y: 3.4 + 1.15 * arch,
    z: 0.4 - 0.8 * arch,
    roll: 0.55 * arch,
    yawOffset: -0.22 * arch,
    pitch: -0.09 * arch,
  };
}

/**
 * Layer 3D Simulasi Dogfight Pertempuran Udara 1-vs-1 Realistis (khusus Pesawat Tempur, tombol "Dogfight"):
 * - Fase 1 (0–4.2s): Pengejaran & penempatan posisi 6 o'clock + Flare countermeasure
 * - Fase 2 (4.2–8.5s): 3 rentetan tembakan kanon 30mm/20mm yang terarah & disiplin langsung dari moncong pesawat
 *   (dengan muzzle flash, bunyi rentetan kanon nyata, & percikan peluru mengenai badan BANDIT-01!)
 * - Fase 3 (8.5–10.6s): Peluncuran Rudal Udara-ke-Udara (FOX-2!) dari pilon sayap + asap roket & suara whoosh
 * - Fase 4 (10.6–17.4s): DIRECT HIT! Bola api ledakan berlapis + cincin shockwave + serpihan terbakar +
 *   suara dentuman ledakan & gemuruh kobaran api saat BANDIT-01 jatuh berputar berasap hitam!
 */
export function DogfightCombatLayer() {
  const unit = useSelectedUnit();
  const flightMode = useHangarStore((s) => s.flightMode);
  const flightNonce = useHangarStore((s) => s.flightNonce);
  const soundEnabled = useHangarStore((s) => s.soundEnabled);
  const setFlightLabel = useHangarStore((s) => s.setFlightLabel);

  const banditRef = useRef<THREE.Group>(null);
  const banditLabelRef = useRef<HTMLDivElement>(null);
  const flameRef = useRef<THREE.Mesh>(null);
  const muzzleFlashRef = useRef<THREE.Group>(null);
  const hitFlashRef = useRef<THREE.Group>(null);
  const missileRef = useRef<THREE.Group>(null);
  const explosionRef = useRef<THREE.Group>(null);
  const shockwaveRef = useRef<THREE.Mesh>(null);
  const burningFireRef = useRef<THREE.Group>(null);
  const heroFlareRefs = useRef<(THREE.Group | null)[]>([]);
  const banditFlareRefs = useRef<(THREE.Group | null)[]>([]);
  const tracerRefs = useRef<(THREE.Mesh | null)[]>([]);
  const crashSmokeRefs = useRef<(THREE.Mesh | null)[]>([]);
  const missileSmokeRefs = useRef<(THREE.Mesh | null)[]>([]);
  const debrisRefs = useRef<(THREE.Mesh | null)[]>([]);

  const phaseTime = useRef(0);
  const heroFlareAccum = useRef(0);
  const heroBurstCount = useRef(0);
  const heroFlareIdx = useRef(0);
  const banditFlareAccum = useRef(0);
  const banditFlareIdx = useRef(0);
  const tracerAccum = useRef(0);
  const tracerIdx = useRef(0);
  const smokeAccum = useRef(0);
  const smokeIdx = useRef(0);
  const missileSmokeAccum = useRef(0);
  const missileSmokeIdx = useRef(0);
  const lastBurstKey = useRef('');
  const lastMissileCycle = useRef(-1);
  const lastExplosionCycle = useRef(-1);
  const lastVoiceCycle = useRef(-1);
  const crashStartPos = useRef(new THREE.Vector3(0, 5, 28));

  const pNow = useMemo(() => new THREE.Vector3(), []);
  const pNext = useMemo(() => new THREE.Vector3(), []);
  const pPrev = useMemo(() => new THREE.Vector3(), []);
  const vel = useMemo(() => new THREE.Vector3(), []);
  const velPrev = useMemo(() => new THREE.Vector3(), []);
  const lookMat = useMemo(() => new THREE.Matrix4(), []);
  const tmpQuat = useMemo(() => new THREE.Quaternion(), []);
  const targetQuat = useMemo(() => new THREE.Quaternion(), []);
  const tmpEuler = useMemo(() => new THREE.Euler(0, 0, 0, 'YXZ'), []);
  const upVec = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const heroOrigin = useMemo(() => new THREE.Vector3(), []);
  const gunOrigin = useMemo(() => new THREE.Vector3(), []);
  const aimPoint = useMemo(() => new THREE.Vector3(), []);

  const isFighter = unit.category === 'Tempur';
  const isDogfightActive = isFighter && flightMode === 'mission';

  const banditModel = useMemo(() => {
    if (!isDogfightActive) return null;
    const base = buildDetailedF16();
    const gear = base.group.getObjectByName('landing-gear');
    if (gear) gear.visible = false;

    const darkCamoMat = new THREE.MeshStandardMaterial({
      color: '#1e242e',
      metalness: 0.42,
      roughness: 0.48,
    });
    const crimsonAccentMat = new THREE.MeshStandardMaterial({
      color: '#991b1b',
      metalness: 0.35,
      roughness: 0.42,
      emissive: '#450a0a',
      emissiveIntensity: 0.28,
    });

    base.group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        const m = mesh.material as THREE.MeshStandardMaterial | undefined;
        if (m && !m.transparent) {
          const isTailOrAccent =
            mesh.position.y > 0.65 || Math.abs(mesh.position.x) > 2.2 || mesh.name.toLowerCase().includes('fin');
          mesh.material = isTailOrAccent ? crimsonAccentMat : darkCamoMat;
        }
      }
    });

    return base.group;
  }, [isDogfightActive]);

  const heroFlares = useMemo<FlareState[]>(
    () =>
      Array.from({ length: 12 }, () => ({
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        age: 0,
        maxAge: 2.2,
        active: false,
      })),
    [],
  );

  const banditFlares = useMemo<FlareState[]>(
    () =>
      Array.from({ length: 14 }, () => ({
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        age: 0,
        maxAge: 2.0,
        active: false,
      })),
    [],
  );

  const tracers = useMemo<TracerState[]>(
    () =>
      Array.from({ length: 14 }, () => ({
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        age: 0,
        maxAge: 0.38,
        active: false,
      })),
    [],
  );

  const crashSmokes = useMemo<SmokePuff[]>(
    () =>
      Array.from({ length: 22 }, () => ({
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        age: 0,
        maxAge: 2.1,
        active: false,
        scale0: 0.9,
      })),
    [],
  );

  const missileSmokes = useMemo<SmokePuff[]>(
    () =>
      Array.from({ length: 16 }, () => ({
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        age: 0,
        maxAge: 0.95,
        active: false,
        scale0: 0.35,
      })),
    [],
  );

  const debrisSparks = useMemo<DebrisSpark[]>(
    () =>
      Array.from({ length: 18 }, () => ({
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        age: 0,
        maxAge: 1.8,
        active: false,
      })),
    [],
  );

  useEffect(() => {
    phaseTime.current = 0;
    heroFlareAccum.current = 0;
    heroBurstCount.current = 0;
    banditFlareAccum.current = 0;
    tracerAccum.current = 0;
    smokeAccum.current = 0;
    missileSmokeAccum.current = 0;
    lastBurstKey.current = '';
    lastMissileCycle.current = -1;
    lastExplosionCycle.current = -1;
    lastVoiceCycle.current = -1;
    heroFlares.forEach((f) => { f.active = false; });
    banditFlares.forEach((f) => { f.active = false; });
    tracers.forEach((tr) => { tr.active = false; });
    crashSmokes.forEach((sm) => { sm.active = false; });
    missileSmokes.forEach((sm) => { sm.active = false; });
    debrisSparks.forEach((d) => { d.active = false; });
  }, [isDogfightActive, flightNonce, unit.id, heroFlares, banditFlares, tracers, crashSmokes, missileSmokes, debrisSparks]);

  useFrame((state, delta) => {
    if (!isDogfightActive || !banditModel) return;
    const dt = Math.min(delta, 0.05);
    phaseTime.current += dt;
    const pt = phaseTime.current;
    const t = state.clock.elapsedTime;

    const cycleIdx = Math.floor(pt / COMBAT_LOOP_SEC);
    const ct = pt % COMBAT_LOOP_SEC; // 0..21s
    const heroPose = sampleDogfightHeroPose(pt);

    // Putar suara kokpit pilot Dogfight TEPAT saat siklus pengejaran dimulai (ct >= 0.4s -> tidak mendahului & sinkron tiap siklus!)
    if (ct >= 0.4 && lastVoiceCycle.current !== cycleIdx) {
      lastVoiceCycle.current = cycleIdx;
      aircraftAudio.playFighterCombatVoice(soundEnabled);
    }

    const isMissileFlying = ct >= 9.6 && ct < 12.0;
    const isHitPhase = ct >= 12.0 && ct < 19.6;
    const isExploding = ct >= 12.0 && ct < 14.5;

    // Cek apakah sedang di dalam salah satu dari 3 burst kanon yang disiplin
    let activeBurstIdx = -1;
    for (let i = 0; i < GUN_BURSTS.length; i++) {
      if (ct >= GUN_BURSTS[i][0] && ct <= GUN_BURSTS[i][1]) {
        activeBurstIdx = i;
        break;
      }
    }
    const isFiringCannon = activeBurstIdx !== -1;

    // Update Label Drama Pertempuran
    if (ct < 4.8) {
      setFlightLabel('⚔️ DOGFIGHT // PENGEJARAN POSISI 6 O’CLOCK & FLARE COUNTERMEASURE');
    } else if (ct < 9.6) {
      setFlightLabel(
        isFiringCannon
          ? '🔥 DOGFIGHT // GUNS! GUNS! GUNS! TEMBAKAN KANON TERARAH KE BANDIT-01!'
          : '🎯 DOGFIGHT // KUNCI RADAR & BIDIK EKOR BANDIT-01!',
      );
    } else if (ct < 12.0) {
      setFlightLabel('🚀 FOX-2! RUDAL UDARA-KE-UDARA MELUNCUR MENGUNCI BANDIT-01!');
    } else if (ct < 19.6) {
      setFlightLabel('💥 SPLASH ONE! BANDIT-01 MELEDAK, TERBAKAR & JATUH!');
    } else {
      setFlightLabel('📡 DOGFIGHT // PENCARIAN TARGET BERIKUTNYA...');
    }

    // 1. Posisi & Gerak Pesawat Musuh BANDIT-01
    const grp = banditRef.current;
    if (grp) {
      if (ct < 12.0) {
        const eps = 0.08;
        sampleBanditCombatPos(pt, pNow);
        sampleBanditCombatPos(pt + eps, pNext);
        sampleBanditCombatPos(pt - eps, pPrev);

        if (!grp.visible || ct < 0.15) {
          grp.visible = true;
          grp.position.copy(pNow);
        } else {
          grp.position.lerp(pNow, Math.min(1, dt * 8));
        }

        // BANDIT-01 selalu terbang maju ke depan (+Z) sambil bermanuver menghindar (S-weave)
        vel.set(pNext.x - pNow.x, pNext.y - pNow.y, Math.max(1.2, 2.2 + (pNext.z - pNow.z))).normalize();
        velPrev.set(pNow.x - pPrev.x, pNow.y - pPrev.y, Math.max(1.2, 2.2 + (pNow.z - pPrev.z))).normalize();

        const yaw = Math.atan2(vel.x, vel.z);
        const horiz = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
        const pitch = -Math.atan2(vel.y, Math.max(0.001, horiz));
        const lateralAccel = vel.x - velPrev.x;
        const bank = THREE.MathUtils.clamp(-lateralAccel * 10.5 - vel.x * 1.15, -0.95, 0.95);

        tmpEuler.set(pitch, yaw, bank, 'YXZ');
        targetQuat.setFromEuler(tmpEuler);
        grp.quaternion.slerp(targetQuat, Math.min(1, dt * 7));
        crashStartPos.current.copy(grp.position);

        if (banditLabelRef.current) {
          banditLabelRef.current.style.display = 'block';
          banditLabelRef.current.textContent = isMissileFlying
            ? '🎯 BANDIT-01 • FOX-2 LOCK!'
            : isFiringCannon
              ? '🔥 BANDIT-01 • TAKING FIRE!'
              : 'BANDIT-01 • HOSTILE';
        }
      } else if (ct < 19.6) {
        if (lastExplosionCycle.current !== cycleIdx) {
          lastExplosionCycle.current = cycleIdx;
          aircraftAudio.playExplosionSfx(soundEnabled);

          // Semburkan 18 serpihan api/debris ledakan keluar dari badan BANDIT-01!
          debrisSparks.forEach((d) => {
            d.active = true;
            d.age = 0;
            d.maxAge = 1.2 + Math.random() * 0.9;
            d.pos.copy(crashStartPos.current);
            const theta = Math.random() * Math.PI * 2;
            const phi = (Math.random() - 0.35) * Math.PI;
            const spd = 8 + Math.random() * 14;
            d.vel.set(
              Math.cos(theta) * Math.cos(phi) * spd,
              Math.sin(phi) * spd + 4.0,
              Math.sin(theta) * Math.cos(phi) * spd,
            );
          });
        }
        const fallT = ct - 12.0;
        grp.visible = true;
        grp.position.set(
          crashStartPos.current.x + Math.sin(fallT * 2.1) * (fallT * 1.35),
          crashStartPos.current.y - fallT * fallT * 0.92,
          crashStartPos.current.z + fallT * 2.4,
        );
        grp.rotation.x = Math.min(1.3, 0.35 + fallT * 0.28);
        grp.rotation.y += dt * 1.45;
        grp.rotation.z += dt * 5.2;

        if (banditLabelRef.current) {
          banditLabelRef.current.style.display = 'block';
          banditLabelRef.current.textContent = '💥 SPLASH ONE! MUSUH MELEDAK & JATUH!';
        }
      } else {
        grp.visible = false;
        if (banditLabelRef.current) banditLabelRef.current.style.display = 'none';
      }

      if (flameRef.current) {
        flameRef.current.visible = !isHitPhase;
        flameRef.current.scale.set(1, 0.9 + Math.sin(t * 36) * 0.22, 1);
      }
    }

    // 2. Suara & Visual 3 Burst Tembakan Kanon 30mm/20mm yang Terarah & Realistis
    if (isFiringCannon && grp) {
      const burstKey = `${cycleIdx}-${activeBurstIdx}`;
      if (lastBurstKey.current !== burstKey) {
        lastBurstKey.current = burstKey;
        const burstDur = GUN_BURSTS[activeBurstIdx][1] - GUN_BURSTS[activeBurstIdx][0];
        aircraftAudio.playCannonBurstSfx(soundEnabled, burstDur);
      }

      // Posisi moncong kanon tepat di sisi kanan-depan hidung pesawat TNI AU
      gunOrigin.set(
        heroPose.x + Math.sin(heroPose.yawOffset) * 3.4 + 0.72,
        heroPose.y + 0.12,
        heroPose.z + Math.cos(heroPose.yawOffset) * 3.4,
      );

      tracerAccum.current += dt;
      if (tracerAccum.current >= 0.085) {
        tracerAccum.current = 0;
        const tr = tracers[tracerIdx.current % tracers.length];
        tracerIdx.current++;
        tr.active = true;
        tr.age = 0;
        tr.pos.copy(gunOrigin);
        // Bidikan lurus & ketat dengan dispersi balistik kecil yang realistis (0.45m)
        aimPoint.set(
          grp.position.x + (Math.random() - 0.5) * 0.9,
          grp.position.y + (Math.random() - 0.5) * 0.6,
          grp.position.z,
        );
        tr.vel.subVectors(aimPoint, gunOrigin).normalize().multiplyScalar(118);
      }

      if (muzzleFlashRef.current) {
        muzzleFlashRef.current.visible = true;
        muzzleFlashRef.current.position.copy(gunOrigin);
        const mfScale = 0.75 + Math.abs(Math.sin(t * 75)) * 0.75;
        muzzleFlashRef.current.scale.set(mfScale, mfScale, mfScale * 1.4);
      }

      // Percikan api peluru mengenai badan BANDIT-01 pada burst ke-2 & ke-3!
      if (hitFlashRef.current) {
        const showHit = activeBurstIdx >= 1 && Math.sin(t * 58) > 0.1;
        hitFlashRef.current.visible = showHit;
        if (showHit) {
          hitFlashRef.current.position.set(
            grp.position.x + (Math.random() - 0.5) * 1.1,
            grp.position.y + (Math.random() - 0.5) * 0.7,
            grp.position.z - 0.6,
          );
          const hs = 0.8 + Math.random() * 0.7;
          hitFlashRef.current.scale.set(hs, hs, hs);
        }
      }
    } else {
      if (muzzleFlashRef.current) muzzleFlashRef.current.visible = false;
      if (hitFlashRef.current) hitFlashRef.current.visible = false;
    }

    tracers.forEach((tr, idx) => {
      const m = tracerRefs.current[idx];
      if (!m) return;
      if (!tr.active) { m.visible = false; return; }
      tr.age += dt;
      if (tr.age >= tr.maxAge) { tr.active = false; m.visible = false; return; }
      tr.pos.addScaledVector(tr.vel, dt);
      m.visible = true;
      m.position.copy(tr.pos);
      lookMat.lookAt(pNext.copy(tr.pos).add(tr.vel), tr.pos, upVec);
      tmpQuat.setFromRotationMatrix(lookMat);
      m.quaternion.copy(tmpQuat);
    });

    // 3. Peluncuran Rudal Udara-ke-Udara (FOX-2) dari pilon sayap + Asap Roket & Suara Whoosh!
    if (missileRef.current && grp) {
      missileRef.current.visible = isMissileFlying;
      if (isMissileFlying) {
        if (lastMissileCycle.current !== cycleIdx) {
          lastMissileCycle.current = cycleIdx;
          aircraftAudio.playMissileLaunchSfx(soundEnabled);
        }
        const mp = (ct - 9.6) / 2.4;
        // Mulai tepat dari pilon sayap kanan pesawat TNI AU
        heroOrigin.set(heroPose.x - 2.3, heroPose.y - 0.25, heroPose.z + 1.2);
        const curveFactor = mp * mp * 0.45 + mp * 0.55;
        missileRef.current.position.lerpVectors(heroOrigin, grp.position, curveFactor);
        // Sedikit lengkungan drop awal saat lepas dari rel pilon
        missileRef.current.position.y -= Math.sin(mp * Math.PI) * 0.65;
        lookMat.lookAt(grp.position, missileRef.current.position, upVec);
        missileRef.current.quaternion.setFromRotationMatrix(lookMat);

        // Jejak asap putih roket FOX-2
        missileSmokeAccum.current += dt;
        if (missileSmokeAccum.current >= 0.045) {
          missileSmokeAccum.current = 0;
          const ms = missileSmokes[missileSmokeIdx.current % missileSmokes.length];
          missileSmokeIdx.current++;
          ms.active = true;
          ms.age = 0;
          ms.pos.copy(missileRef.current.position);
          ms.vel.set((Math.random() - 0.5) * 0.8, 0.35, -3.5);
        }
      }
    }
    missileSmokes.forEach((sm, idx) => {
      const mesh = missileSmokeRefs.current[idx];
      if (!mesh) return;
      if (!sm.active) { mesh.visible = false; return; }
      sm.age += dt;
      if (sm.age >= sm.maxAge) { sm.active = false; mesh.visible = false; return; }
      sm.pos.addScaledVector(sm.vel, dt);
      const frac = sm.age / sm.maxAge;
      mesh.visible = true;
      mesh.position.copy(sm.pos);
      const sc = sm.scale0 + frac * 1.45;
      mesh.scale.set(sc, sc, sc);
      (mesh.material as THREE.MeshBasicMaterial).opacity = (1 - frac) * 0.62;
    });

    // 4. Bola Api Ledakan Berlapis & Cincin Shockwave (Direct Hit 12.0..14.5s)
    if (explosionRef.current && grp) {
      explosionRef.current.visible = isExploding;
      if (isExploding) {
        const ep = (ct - 12.0) / 2.5;
        explosionRef.current.position.copy(grp.position);
        const s = 0.8 + Math.sin(ep * Math.PI) * 6.4;
        explosionRef.current.scale.set(s, s, s);
      }
    }
    if (shockwaveRef.current && grp) {
      const showRing = ct >= 12.0 && ct < 13.0;
      shockwaveRef.current.visible = showRing;
      if (showRing) {
        const rp = (ct - 12.0) / 1.0;
        shockwaveRef.current.position.copy(crashStartPos.current);
        const rs = 1.2 + rp * 13.5;
        shockwaveRef.current.scale.set(rs, rs, rs);
        (shockwaveRef.current.material as THREE.MeshBasicMaterial).opacity = (1 - rp) * 0.72;
      }
    }

    // Serpihan Api Ledakan
    debrisSparks.forEach((d, idx) => {
      const mesh = debrisRefs.current[idx];
      if (!mesh) return;
      if (!d.active) { mesh.visible = false; return; }
      d.age += dt;
      if (d.age >= d.maxAge) { d.active = false; mesh.visible = false; return; }
      d.vel.y -= 9.5 * dt;
      d.pos.addScaledVector(d.vel, dt);
      const frac = d.age / d.maxAge;
      mesh.visible = true;
      mesh.position.copy(d.pos);
      const sc = Math.max(0.15, 1.0 - frac * 0.85);
      mesh.scale.set(sc, sc, sc);
    });

    // 5. Api Berkobar Hebat di Badan BANDIT-01 saat Jatuh Terbakar
    if (burningFireRef.current && grp) {
      burningFireRef.current.visible = isHitPhase;
      if (isHitPhase) {
        burningFireRef.current.position.copy(grp.position);
        const flicker = 1.45 + Math.sin(t * 34) * 0.38;
        burningFireRef.current.scale.set(flicker, flicker * 1.35, flicker);
      }
    }

    // 6. Asap Hitam Pekat (mulai asap tipis saat kena kanon burst 3, lalu asap tebal saat meledak & jatuh!)
    if ((isHitPhase || (ct >= 7.5 && ct < 10.6)) && grp) {
      smokeAccum.current += dt;
      const interval = isHitPhase ? 0.065 : 0.16;
      if (smokeAccum.current >= interval) {
        smokeAccum.current = 0;
        const sm = crashSmokes[smokeIdx.current % crashSmokes.length];
        smokeIdx.current++;
        sm.active = true;
        sm.age = 0;
        sm.scale0 = isHitPhase ? 1.05 : 0.45;
        sm.pos.copy(grp.position);
        sm.vel.set(
          (Math.random() - 0.5) * 2.4,
          (isHitPhase ? 2.8 : 1.1) + Math.random() * 1.8,
          isHitPhase ? (Math.random() - 0.5) * 2.4 : -5.0,
        );
      }
    }
    crashSmokes.forEach((sm, idx) => {
      const mesh = crashSmokeRefs.current[idx];
      if (!mesh) return;
      if (!sm.active) { mesh.visible = false; return; }
      sm.age += dt;
      if (sm.age >= sm.maxAge) { sm.active = false; mesh.visible = false; return; }
      sm.pos.addScaledVector(sm.vel, dt);
      const frac = sm.age / sm.maxAge;
      mesh.visible = true;
      mesh.position.copy(sm.pos);
      const sc = sm.scale0 + frac * 4.2;
      mesh.scale.set(sc, sc, sc);
      (mesh.material as THREE.MeshBasicMaterial).opacity = (1 - frac) * 0.76;
    });

    // 7. Flare Countermeasure Hero TNI AU (keluar tepat dari dispenser ekor pesawat Hero)
    heroFlareAccum.current += dt;
    const inSalvo = heroBurstCount.current > 0;
    const waitTime = inSalvo ? 0.22 : 2.6;
    if (heroFlareAccum.current >= waitTime) {
      heroFlareAccum.current = 0;
      if (!inSalvo) heroBurstCount.current = 3;
      heroBurstCount.current--;
      const side = heroFlareIdx.current % 2 === 0 ? 1 : -1;
      const f = heroFlares[heroFlareIdx.current % heroFlares.length];
      heroFlareIdx.current++;
      f.active = true;
      f.age = 0;
      f.pos.set(heroPose.x + side * 1.15, heroPose.y - 0.35, heroPose.z - 3.0);
      f.vel.set(side * (4.2 + Math.random() * 1.8), -1.8 - Math.random() * 1.3, -12.5 - Math.random() * 2.5);
      aircraftAudio.playFlarePopSfx(soundEnabled);
    }

    // 8. Flare Defensif BANDIT-01 (lebih rapat saat panik menghindari rudal FOX-2!)
    if (!isHitPhase && grp) {
      banditFlareAccum.current += dt;
      const banditFlareGap = isMissileFlying ? 0.22 : 0.85;
      if (banditFlareAccum.current >= banditFlareGap) {
        banditFlareAccum.current = 0;
        const f = banditFlares[banditFlareIdx.current % banditFlares.length];
        banditFlareIdx.current++;
        f.active = true;
        f.age = 0;
        f.pos.set(grp.position.x, grp.position.y - 0.3, grp.position.z - 2.6);
        f.vel.set((Math.random() - 0.5) * 6.5, -3.0 - Math.random() * 1.8, -6.0 - Math.random() * 3.0);
      }
    }

    const updateFlareArray = (arr: FlareState[], refs: (THREE.Group | null)[]) => {
      arr.forEach((f, idx) => {
        const g = refs[idx];
        if (!g) return;
        if (!f.active) { g.visible = false; return; }
        f.age += dt;
        if (f.age >= f.maxAge) { f.active = false; g.visible = false; return; }
        f.vel.y -= 3.8 * dt;
        f.pos.addScaledVector(f.vel, dt);
        const frac = f.age / f.maxAge;
        g.visible = true;
        g.position.copy(f.pos);
        const sc = (1 - frac * 0.7) * (0.9 + Math.sin(t * 45 + idx) * 0.15);
        g.scale.set(sc, sc, sc);
      });
    };
    updateFlareArray(heroFlares, heroFlareRefs.current);
    updateFlareArray(banditFlares, banditFlareRefs.current);
  });

  if (!isDogfightActive || !banditModel) return null;

  return (
    <group name="dogfight-combat-layer">
      {/* Pesawat Musuh Aggressor BANDIT-01 */}
      <group ref={banditRef} visible={false}>
        <primitive object={banditModel} />
        <mesh ref={flameRef} position={[0, 0.05, -6.2]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.38, 2.6, 10]} />
          <meshBasicMaterial color="#ff6b00" transparent opacity={0.85} />
        </mesh>
        <Html position={[0, 2.4, 0]} center distanceFactor={36}>
          <div
            ref={banditLabelRef}
            style={{ display: 'none' }}
            className="pointer-events-none select-none whitespace-nowrap rounded border border-rose-500/80 bg-rose-950/85 px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-rose-200 shadow"
          >
            BANDIT-01 • HOSTILE
          </div>
        </Html>
      </group>

      {/* Kilatan Moncong Kanon (Muzzle Flash) Pesawat TNI AU */}
      <group ref={muzzleFlashRef} visible={false}>
        <mesh>
          <sphereGeometry args={[0.38, 10, 10]} />
          <meshBasicMaterial color="#fffbeb" transparent opacity={0.95} />
        </mesh>
        <mesh position={[0, 0, 0.45]}>
          <coneGeometry args={[0.28, 1.35, 8]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.82} />
        </mesh>
      </group>

      {/* Percikan Peluru Kanon Mengenai Badan BANDIT-01 */}
      <group ref={hitFlashRef} visible={false}>
        <mesh>
          <sphereGeometry args={[0.65, 10, 10]} />
          <meshBasicMaterial color="#fef08a" transparent opacity={0.92} />
        </mesh>
        <mesh>
          <sphereGeometry args={[1.15, 10, 10]} />
          <meshBasicMaterial color="#f97316" transparent opacity={0.55} />
        </mesh>
      </group>

      {/* Rudal Udara-ke-Udara (FOX-2) */}
      <group ref={missileRef} visible={false}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.11, 0.11, 2.6, 8]} />
          <meshStandardMaterial color="#f8fafc" metalness={0.5} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0, -1.7]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.26, 1.6, 8]} />
          <meshBasicMaterial color="#ffb703" transparent opacity={0.95} />
        </mesh>
      </group>

      {/* Jejak Asap Putih Rudal FOX-2 */}
      {missileSmokes.map((_, idx) => (
        <mesh key={`ms-${idx}`} ref={(el) => { missileSmokeRefs.current[idx] = el; }} visible={false}>
          <sphereGeometry args={[0.55, 8, 8]} />
          <meshBasicMaterial color="#e2e8f0" transparent opacity={0.55} depthWrite={false} />
        </mesh>
      ))}

      {/* Cincin Shockwave Ledakan Udara */}
      <mesh ref={shockwaveRef} visible={false}>
        <torusGeometry args={[1.0, 0.08, 10, 32]} />
        <meshBasicMaterial color="#fde68a" transparent opacity={0.7} depthWrite={false} />
      </mesh>

      {/* Bola Api Ledakan Dahsyat */}
      <group ref={explosionRef} visible={false}>
        <mesh>
          <sphereGeometry args={[1.25, 16, 16]} />
          <meshBasicMaterial color="#fffbeb" transparent opacity={0.96} />
        </mesh>
        <mesh>
          <sphereGeometry args={[2.0, 16, 16]} />
          <meshBasicMaterial color="#ff7a00" transparent opacity={0.82} />
        </mesh>
        <mesh>
          <sphereGeometry args={[2.7, 14, 14]} />
          <meshBasicMaterial color="#dc2626" transparent opacity={0.52} />
        </mesh>
      </group>

      {/* Serpihan Api Ledakan */}
      {debrisSparks.map((_, idx) => (
        <mesh key={`deb-${idx}`} ref={(el) => { debrisRefs.current[idx] = el; }} visible={false}>
          <dodecahedronGeometry args={[0.32, 0]} />
          <meshBasicMaterial color={idx % 2 === 0 ? '#fb923c' : '#fde047'} />
        </mesh>
      ))}

      {/* Api Berkobar di Badan BANDIT-01 saat Jatuh Terbakar */}
      <group ref={burningFireRef} visible={false}>
        <mesh>
          <sphereGeometry args={[1.5, 12, 12]} />
          <meshBasicMaterial color="#ff5500" transparent opacity={0.88} />
        </mesh>
        <mesh position={[0, 0.7, 0]}>
          <sphereGeometry args={[1.05, 10, 10]} />
          <meshBasicMaterial color="#fde047" transparent opacity={0.92} />
        </mesh>
        <mesh position={[0, -0.35, -0.8]}>
          <sphereGeometry args={[1.2, 10, 10]} />
          <meshBasicMaterial color="#dc2626" transparent opacity={0.72} />
        </mesh>
      </group>

      {/* Kepulan Asap Hitam Pekat */}
      {crashSmokes.map((_, idx) => (
        <mesh key={`sm-${idx}`} ref={(el) => { crashSmokeRefs.current[idx] = el; }} visible={false}>
          <sphereGeometry args={[0.9, 8, 8]} />
          <meshBasicMaterial color="#18181b" transparent opacity={0.72} depthWrite={false} />
        </mesh>
      ))}

      {/* Flares Hero & Bandit */}
      {heroFlares.map((_, idx) => (
        <group key={`hf-${idx}`} ref={(el) => { heroFlareRefs.current[idx] = el; }} visible={false}>
          <mesh>
            <sphereGeometry args={[0.32, 8, 8]} />
            <meshBasicMaterial color="#fef08a" />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.68, 8, 8]} />
            <meshBasicMaterial color="#f97316" transparent opacity={0.45} depthWrite={false} />
          </mesh>
        </group>
      ))}

      {banditFlares.map((_, idx) => (
        <group key={`bf-${idx}`} ref={(el) => { banditFlareRefs.current[idx] = el; }} visible={false}>
          <mesh>
            <sphereGeometry args={[0.28, 8, 8]} />
            <meshBasicMaterial color="#fde047" />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.58, 8, 8]} />
            <meshBasicMaterial color="#ef4444" transparent opacity={0.4} depthWrite={false} />
          </mesh>
        </group>
      ))}

      {/* Tembakan Kanon Tracer Terarah TNI AU (Emas Menyala) */}
      {tracers.map((_, idx) => (
        <mesh key={`tr-${idx}`} ref={(el) => { tracerRefs.current[idx] = el; }} visible={false}>
          <boxGeometry args={[0.13, 0.13, 4.8]} />
          <meshBasicMaterial color="#fef08a" />
        </mesh>
      ))}
    </group>
  );
}
