import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useHangarStore, useSelectedUnit } from '../../store/useHangarStore';
import { FIGHTER_AUTO_ORDER, getFighterManeuverSpec } from '../../data/fighterManeuvers';
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

/**
 * Lintasan kejar-kejaran udara 1-lawan-1 (Total 2 Pesawat: 1 TNI AU vs 1 BANDIT-01) yang INDAH,
 * HALUS, dan BERJARAK AMAN (radius 18–25m, tidak saling menumpuk / tidak brutal!).
 */
function sampleBanditPosition(t: number, maneuverId: string, out: THREE.Vector3) {
  if (maneuverId === 'scissors' || maneuverId === 'thachWeave') {
    const w = t * 0.62;
    out.set(Math.sin(w) * 20.0, 5.2 + Math.cos(w * 2) * 2.4, 8.0 + Math.cos(w) * 14.5);
  } else if (maneuverId === 'highYoYo' || maneuverId === 'lowYoYo') {
    const w = t * 0.56;
    out.set(Math.cos(w) * 22.0, 6.4 + Math.sin(w * 2) * 3.2, Math.sin(w) * 19.0 + 4.0);
  } else {
    // High-G Break Turn / Circle Fight / Displacement Roll — lintasan kejar-kejaran melingkar lebar & elegan
    const w = t * 0.6;
    out.set(Math.cos(w) * 21.5, 5.6 + Math.sin(w * 1.5) * 2.6, Math.sin(w) * 21.5 + 3.0);
  }
}

/**
 * Layer 3D Pertempuran Udara 1-vs-1 (Dogfight / ACM) khusus Pesawat Tempur TNI AU:
 * - Total 2 pesawat tempur di udara (1 Pesawat TNI AU + 1 Pesawat Musuh BANDIT-01) saling mengejar
 *   dengan jarak aman, sudut bank halus & manuver anggun (tidak brutal/bertabrakan).
 * - Dilengkapi salvo Flare Countermeasure + efek suara letupan & kilatan tracer jarak menengah.
 */
export function DogfightCombatLayer() {
  const unit = useSelectedUnit();
  const flightMode = useHangarStore((s) => s.flightMode);
  const flightNonce = useHangarStore((s) => s.flightNonce);
  const fighterManeuver = useHangarStore((s) => s.fighterManeuver);
  const soundEnabled = useHangarStore((s) => s.soundEnabled);

  const banditRef = useRef<THREE.Group>(null);
  const flameRef = useRef<THREE.Mesh>(null);
  const heroFlareRefs = useRef<(THREE.Group | null)[]>([]);
  const banditFlareRefs = useRef<(THREE.Group | null)[]>([]);
  const tracerRefs = useRef<(THREE.Mesh | null)[]>([]);

  const phaseTime = useRef(0);
  const heroFlareAccum = useRef(0);
  const heroBurstCount = useRef(0);
  const heroFlareIdx = useRef(0);
  const banditFlareAccum = useRef(0);
  const banditFlareIdx = useRef(0);
  const tracerAccum = useRef(0);
  const tracerIdx = useRef(0);

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

  const isFighter = unit.category === 'Tempur';
  const isManeuverMode = isFighter && flightMode === 'maneuver';

  // 1 Pesawat Tempur Musuh (Aggressor BANDIT-01) untuk duel udara 2 pesawat yang bersih & elegan
  const banditModel = useMemo(() => {
    if (!isManeuverMode) return null;
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
  }, [isManeuverMode]);

  const heroFlares = useMemo<FlareState[]>(
    () =>
      Array.from({ length: 16 }, () => ({
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        age: 0,
        maxAge: 2.5,
        active: false,
      })),
    [],
  );

  const banditFlares = useMemo<FlareState[]>(
    () =>
      Array.from({ length: 10 }, () => ({
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        age: 0,
        maxAge: 2.2,
        active: false,
      })),
    [],
  );

  const tracers = useMemo<TracerState[]>(
    () =>
      Array.from({ length: 6 }, () => ({
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        age: 0,
        maxAge: 0.48,
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
    heroFlares.forEach((f) => {
      f.active = false;
    });
    banditFlares.forEach((f) => {
      f.active = false;
    });
    tracers.forEach((tr) => {
      tr.active = false;
    });
  }, [isManeuverMode, flightNonce, fighterManeuver, unit.id, heroFlares, banditFlares, tracers]);

  useFrame((state, delta) => {
    if (!isManeuverMode || !banditModel) return;
    const dt = Math.min(delta, 0.05);
    phaseTime.current += dt;
    const pt = phaseTime.current;
    const t = state.clock.elapsedTime;

    const cycleLen = 8.0;
    const activeManId =
      fighterManeuver === 'auto'
        ? FIGHTER_AUTO_ORDER[Math.floor(pt / cycleLen) % FIGHTER_AUTO_ORDER.length]
        : fighterManeuver;
    const isDogfightNow = getFighterManeuverSpec(activeManId).group === 'acm';

    if (!isDogfightNow) {
      if (banditRef.current) banditRef.current.visible = false;
      heroFlareRefs.current.forEach((g) => {
        if (g) g.visible = false;
      });
      banditFlareRefs.current.forEach((g) => {
        if (g) g.visible = false;
      });
      tracerRefs.current.forEach((m) => {
        if (m) m.visible = false;
      });
      return;
    }

    // === 1. ANIMASI ELEGAN PESAWAT MUSUH (BANDIT-01) — JARAK AMAN & BANK HALUS ===
    const grp = banditRef.current;
    if (grp) {
      const eps = 0.08;
      sampleBanditPosition(pt, activeManId, pNow);
      sampleBanditPosition(pt + eps, activeManId, pNext);
      sampleBanditPosition(pt - eps, activeManId, pPrev);

      if (!grp.visible) {
        grp.visible = true;
        grp.position.copy(pNow);
      } else {
        grp.position.lerp(pNow, Math.min(1, dt * 6));
      }

      vel.subVectors(pNext, pNow).normalize();
      velPrev.subVectors(pNow, pPrev).normalize();

      const yaw = Math.atan2(vel.x, vel.z);
      const horiz = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
      const pitch = -Math.atan2(vel.y, Math.max(0.001, horiz));
      const turnCross = velPrev.x * vel.z - velPrev.z * vel.x;
      // Sudut bank anggun & terkendali (maks ±52°) agar terlihat indah dan tidak brutal
      const bank = THREE.MathUtils.clamp(turnCross * 16.0, -0.92, 0.92);

      tmpEuler.set(pitch, yaw, bank, 'YXZ');
      targetQuat.setFromEuler(tmpEuler);
      grp.quaternion.slerp(targetQuat, Math.min(1, dt * 6));

      if (flameRef.current) {
        flameRef.current.scale.set(1, 0.9 + Math.sin(t * 36) * 0.22, 1);
      }
    }

    // === 2. FLARE COUNTERMEASURE PESAWAT TNI AU (Salvo defensif berkilau & indah) ===
    heroFlareAccum.current += dt;
    const inSalvo = heroBurstCount.current > 0;
    const waitTime = inSalvo ? 0.22 : 2.1;
    if (heroFlareAccum.current >= waitTime) {
      heroFlareAccum.current = 0;
      if (!inSalvo) heroBurstCount.current = 4;
      heroBurstCount.current--;
      const side = heroFlareIdx.current % 2 === 0 ? 1 : -1;
      const f = heroFlares[heroFlareIdx.current % heroFlares.length];
      heroFlareIdx.current++;
      f.active = true;
      f.age = 0;
      f.pos.set(side * 0.85, 3.1, -2.6);
      f.vel.set(side * (3.4 + Math.random() * 1.8), -1.3 - Math.random() * 1.1, -9.8 - Math.random() * 2.2);
      if (heroFlareIdx.current % 2 === 1) {
        aircraftAudio.playFlarePopSfx(soundEnabled);
      }
    }

    heroFlares.forEach((f, i) => {
      const fGrp = heroFlareRefs.current[i];
      if (!fGrp) return;
      if (!f.active) {
        fGrp.visible = false;
        return;
      }
      f.age += dt;
      if (f.age >= f.maxAge) {
        f.active = false;
        fGrp.visible = false;
        return;
      }
      f.pos.addScaledVector(f.vel, dt);
      f.vel.y -= dt * 2.5;
      fGrp.visible = true;
      fGrp.position.copy(f.pos);
      const fade = 1 - f.age / f.maxAge;
      fGrp.scale.setScalar(0.65 + fade * 0.7);
    });

    // === 3. FLARE DEFENSIF BANDIT-01 ===
    banditFlareAccum.current += dt;
    if (banditFlareAccum.current >= 1.15 && grp) {
      banditFlareAccum.current = 0;
      const f = banditFlares[banditFlareIdx.current % banditFlares.length];
      banditFlareIdx.current++;
      f.active = true;
      f.age = 0;
      f.pos.copy(grp.position);
      const side = banditFlareIdx.current % 2 === 0 ? 1 : -1;
      f.vel.set(side * 2.8, -2.0 - Math.random() * 1.0, -3.0 + (Math.random() - 0.5) * 3.0);
    }

    banditFlares.forEach((f, i) => {
      const fGrp = banditFlareRefs.current[i];
      if (!fGrp) return;
      if (!f.active) {
        fGrp.visible = false;
        return;
      }
      f.age += dt;
      if (f.age >= f.maxAge) {
        f.active = false;
        fGrp.visible = false;
        return;
      }
      f.pos.addScaledVector(f.vel, dt);
      f.vel.y -= dt * 2.3;
      fGrp.visible = true;
      fGrp.position.copy(f.pos);
      const fade = 1 - f.age / f.maxAge;
      fGrp.scale.setScalar(0.55 + fade * 0.55);
    });

    // === 4. KILATAN TRACER JARAK MENENGAH (Halus & Sinematik) ===
    tracerAccum.current += dt;
    if (tracerAccum.current >= 0.55 && grp) {
      tracerAccum.current = 0;
      const tr = tracers[tracerIdx.current % tracers.length];
      const fromHero = tracerIdx.current % 2 === 0;
      tracerIdx.current++;
      tr.active = true;
      tr.age = 0;
      if (fromHero) {
        tr.pos.set((Math.random() - 0.5) * 0.6, 3.1, 1.5);
        tr.vel.subVectors(grp.position, tr.pos).normalize().multiplyScalar(54);
      } else {
        tr.pos.copy(grp.position);
        tr.vel
          .set((Math.random() - 0.5) * 2.0, 3.0 + (Math.random() - 0.5) * 1.2, 0)
          .sub(tr.pos)
          .normalize()
          .multiplyScalar(50);
      }
    }

    tracers.forEach((tr, i) => {
      const mesh = tracerRefs.current[i];
      if (!mesh) return;
      if (!tr.active) {
        mesh.visible = false;
        return;
      }
      tr.age += dt;
      if (tr.age >= tr.maxAge) {
        tr.active = false;
        mesh.visible = false;
        return;
      }
      tr.pos.addScaledVector(tr.vel, dt);
      mesh.visible = true;
      mesh.position.copy(tr.pos);
      pNext.copy(tr.pos).add(tr.vel);
      lookMat.lookAt(tr.pos, pNext, upVec);
      tmpQuat.setFromRotationMatrix(lookMat);
      mesh.quaternion.copy(tmpQuat);
    });
  });

  if (!isManeuverMode || !banditModel) return null;

  return (
    <group name="dogfight-combat-layer">
      {/* 1 Pesawat Tempur Musuh (BANDIT-01 — duel udara 2 pesawat yang lega & elegan) */}
      <group ref={banditRef} visible={false} scale={0.78}>
        <primitive object={banditModel} />
        <mesh ref={flameRef} position={[0, 0.08, -5.65]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.34, 2.4, 10]} />
          <meshBasicMaterial
            color="#ff5522"
            transparent
            opacity={0.85}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
        <Html position={[0, 1.9, 0]} center distanceFactor={32}>
          <div className="pointer-events-none select-none whitespace-nowrap rounded border border-rose-500/80 bg-[#1a0508]/85 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.45)]">
            ◆ BANDIT-01
          </div>
        </Html>
      </group>

      {/* 16 Flare Countermeasure Pesawat TNI AU */}
      {heroFlares.map((_, i) => (
        <group
          key={`df-hero-flare-${i}`}
          ref={(el) => {
            heroFlareRefs.current[i] = el;
          }}
          visible={false}
        >
          <mesh>
            <sphereGeometry args={[0.24, 8, 8]} />
            <meshBasicMaterial color="#fffbeb" />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.62, 10, 10]} />
            <meshBasicMaterial
              color="#ff9900"
              transparent
              opacity={0.75}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[0, 0.16, 0.38]}>
            <sphereGeometry args={[0.42, 8, 8]} />
            <meshBasicMaterial color="#f1f5f9" transparent opacity={0.42} depthWrite={false} />
          </mesh>
        </group>
      ))}

      {/* 10 Flare Defensif BANDIT-01 */}
      {banditFlares.map((_, i) => (
        <group
          key={`df-bandit-flare-${i}`}
          ref={(el) => {
            banditFlareRefs.current[i] = el;
          }}
          visible={false}
        >
          <mesh>
            <sphereGeometry args={[0.2, 8, 8]} />
            <meshBasicMaterial color="#fff7ed" />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.5, 8, 8]} />
            <meshBasicMaterial
              color="#fb7185"
              transparent
              opacity={0.7}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}

      {/* 6 Kilatan Tracer Kanon Udara */}
      {tracers.map((_, i) => (
        <mesh
          key={`df-tracer-${i}`}
          ref={(el) => {
            tracerRefs.current[i] = el;
          }}
          visible={false}
        >
          <boxGeometry args={[0.07, 0.07, 2.4]} />
          <meshBasicMaterial
            color={i % 2 === 0 ? '#fde047' : '#ff4d4d'}
            transparent
            opacity={0.9}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
