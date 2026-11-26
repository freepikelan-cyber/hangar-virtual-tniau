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
}

const COMBAT_LOOP_SEC = 18.0; // Siklus drama pertempuran udara jarak jauh hingga musuh ditembak hancur & jatuh!

/** Lintasan kejar-kejaran pertempuran jarak jauh (34–46m) yang luas & sinematik. */
function sampleBanditPursuit(t: number, out: THREE.Vector3) {
  const w = t * 0.52;
  out.set(Math.sin(w) * 32.0, 5.8 + Math.cos(w * 1.5) * 3.0, 26.0 + Math.cos(w) * 16.0);
}

/**
 * Layer 3D Simulasi Dogfight Pertempuran Udara 1-vs-1 (khusus Pesawat Tempur, aktif pada tombol "Dogfight"):
 * - Pertempuran jarak jauh saling kejar dengan pesawat musuh BANDIT-01
 * - Saling tembak dua arah (Hero TNI AU menembakkan tracer emas <-> BANDIT-01 membalas tracer merah)
 * - Kedua pesawat melepas Flare Countermeasure anti-rudal
 * - Peluncuran Rudal Udara-ke-Udara (FOX-2!) -> DIRECT HIT -> BANDIT-01 meledak, terbakar berasap hitam & jatuh!
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
  const missileRef = useRef<THREE.Group>(null);
  const explosionRef = useRef<THREE.Group>(null);
  const burningFireRef = useRef<THREE.Group>(null);
  const heroFlareRefs = useRef<(THREE.Group | null)[]>([]);
  const banditFlareRefs = useRef<(THREE.Group | null)[]>([]);
  const tracerRefs = useRef<(THREE.Mesh | null)[]>([]);
  const enemyTracerRefs = useRef<(THREE.Mesh | null)[]>([]);
  const crashSmokeRefs = useRef<(THREE.Mesh | null)[]>([]);

  const phaseTime = useRef(0);
  const heroFlareAccum = useRef(0);
  const heroBurstCount = useRef(0);
  const heroFlareIdx = useRef(0);
  const banditFlareAccum = useRef(0);
  const banditFlareIdx = useRef(0);
  const tracerAccum = useRef(0);
  const tracerIdx = useRef(0);
  const enemyTracerAccum = useRef(0);
  const enemyTracerIdx = useRef(0);
  const smokeAccum = useRef(0);
  const smokeIdx = useRef(0);
  const lastExplosionCycle = useRef(-1);
  const crashStartPos = useRef(new THREE.Vector3(0, 6, 26));

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
  const heroTargetPt = useMemo(() => new THREE.Vector3(), []);

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
      Array.from({ length: 14 }, () => ({
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        age: 0,
        maxAge: 2.3,
        active: false,
      })),
    [],
  );

  const banditFlares = useMemo<FlareState[]>(
    () =>
      Array.from({ length: 12 }, () => ({
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        age: 0,
        maxAge: 2.1,
        active: false,
      })),
    [],
  );

  const tracers = useMemo<TracerState[]>(
    () =>
      Array.from({ length: 10 }, () => ({
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        age: 0,
        maxAge: 0.52,
        active: false,
      })),
    [],
  );

  const enemyTracers = useMemo<TracerState[]>(
    () =>
      Array.from({ length: 10 }, () => ({
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        age: 0,
        maxAge: 0.55,
        active: false,
      })),
    [],
  );

  const crashSmokes = useMemo<SmokePuff[]>(
    () =>
      Array.from({ length: 18 }, () => ({
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        age: 0,
        maxAge: 1.9,
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
    enemyTracerAccum.current = 0;
    smokeAccum.current = 0;
    lastExplosionCycle.current = -1;
    heroFlares.forEach((f) => { f.active = false; });
    banditFlares.forEach((f) => { f.active = false; });
    tracers.forEach((tr) => { tr.active = false; });
    enemyTracers.forEach((tr) => { tr.active = false; });
    crashSmokes.forEach((sm) => { sm.active = false; });
  }, [isDogfightActive, flightNonce, unit.id, heroFlares, banditFlares, tracers, enemyTracers, crashSmokes]);

  useFrame((state, delta) => {
    if (!isDogfightActive || !banditModel) return;
    const dt = Math.min(delta, 0.05);
    phaseTime.current += dt;
    const pt = phaseTime.current;
    const t = state.clock.elapsedTime;

    const cycleIdx = Math.floor(pt / COMBAT_LOOP_SEC);
    const ct = pt % COMBAT_LOOP_SEC; // 0..18s
    const isHitPhase = ct >= 10.5 && ct < 17.6;
    const isExploding = ct >= 10.5 && ct < 12.6;
    const isMissileFlying = ct >= 8.4 && ct < 10.5;
    const isShooting = ct >= 1.8 && ct < 10.5;
    const isEnemyShooting = ct >= 1.2 && ct < 9.6;

    // Update Label Drama Pertempuran
    if (ct < 5.5) {
      setFlightLabel('⚔️ DOGFIGHT // PENGEJARAN JARAK JAUH, SALING TEMBAK & FLARE COUNTERMEASURE');
    } else if (ct < 8.4) {
      setFlightLabel('🎯 DOGFIGHT // KUNCI RADAR & TEMBAKAN KANON KE BANDIT-01!');
    } else if (ct < 10.5) {
      setFlightLabel('🚀 FOX-2! RUDAL UDARA-KE-UDARA MELUNCUR MENGUNCI BANDIT-01!');
    } else if (ct < 17.5) {
      setFlightLabel('💥 SPLASH ONE! PESAWAT MUSUH TERTEMBAK HANCUR, TERBAKAR & JATUH!');
    } else {
      setFlightLabel('📡 DOGFIGHT // PENCARIAN TARGET BARU...');
    }

    // 1. Posisi & Drama Pesawat Musuh BANDIT-01
    const grp = banditRef.current;
    if (grp) {
      if (ct < 10.5) {
        const eps = 0.08;
        sampleBanditPursuit(pt, pNow);
        sampleBanditPursuit(pt + eps, pNext);
        sampleBanditPursuit(pt - eps, pPrev);

        if (!grp.visible || ct < 0.15) {
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
        const bank = THREE.MathUtils.clamp(turnCross * 16.0, -0.95, 0.95);

        tmpEuler.set(pitch, yaw, bank, 'YXZ');
        targetQuat.setFromEuler(tmpEuler);
        grp.quaternion.slerp(targetQuat, Math.min(1, dt * 6));
        crashStartPos.current.copy(grp.position);

        if (banditLabelRef.current) {
          banditLabelRef.current.style.display = 'block';
          banditLabelRef.current.textContent = isMissileFlying
            ? '🎯 BANDIT-01 • FOX-2 LOCK!'
            : isShooting
              ? '🔥 BANDIT-01 • ENGAGING!'
              : 'BANDIT-01 • HOSTILE';
        }
      } else if (ct < 17.5) {
        if (lastExplosionCycle.current !== cycleIdx) {
          lastExplosionCycle.current = cycleIdx;
          aircraftAudio.playExplosionSfx(soundEnabled);
        }
        const fallT = ct - 10.5;
        grp.visible = true;
        grp.position.set(
          crashStartPos.current.x + Math.sin(fallT * 2.2) * (fallT * 1.4),
          crashStartPos.current.y - fallT * fallT * 0.95,
          crashStartPos.current.z + fallT * 2.2,
        );
        grp.rotation.x = Math.min(1.25, 0.35 + fallT * 0.25);
        grp.rotation.y += dt * 1.6;
        grp.rotation.z += dt * 4.8;

        if (banditLabelRef.current) {
          banditLabelRef.current.style.display = 'block';
          banditLabelRef.current.textContent = '💥 SPLASH ONE! MUSUH JATUH TERBAKAR!';
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

    // 2. Rudal Udara-ke-Udara (FOX-2)
    if (missileRef.current && grp) {
      missileRef.current.visible = isMissileFlying;
      if (isMissileFlying) {
        const mp = (ct - 8.4) / 2.1;
        heroOrigin.set(0, 2.8, 2.5);
        missileRef.current.position.lerpVectors(heroOrigin, grp.position, mp * mp * 0.4 + mp * 0.6);
        lookMat.lookAt(grp.position, missileRef.current.position, upVec);
        missileRef.current.quaternion.setFromRotationMatrix(lookMat);
      }
    }

    // 3. Bola Api Ledakan Besar (Direct Hit 10.5..12.6s)
    if (explosionRef.current && grp) {
      explosionRef.current.visible = isExploding;
      if (isExploding) {
        const ep = (ct - 10.5) / 2.1;
        explosionRef.current.position.copy(grp.position);
        const s = 0.7 + Math.sin(ep * Math.PI) * 5.6;
        explosionRef.current.scale.set(s, s, s);
      }
    }

    // 4. Api Berkobar di Badan BANDIT-01 saat Jatuh Terbakar
    if (burningFireRef.current && grp) {
      burningFireRef.current.visible = isHitPhase;
      if (isHitPhase) {
        burningFireRef.current.position.copy(grp.position);
        const flicker = 1.3 + Math.sin(t * 32) * 0.35;
        burningFireRef.current.scale.set(flicker, flicker * 1.25, flicker);
      }
    }

    // 5. Asap Hitam Pekat
    if (isHitPhase && grp) {
      smokeAccum.current += dt;
      if (smokeAccum.current >= 0.08) {
        smokeAccum.current = 0;
        const sm = crashSmokes[smokeIdx.current % crashSmokes.length];
        smokeIdx.current++;
        sm.active = true;
        sm.age = 0;
        sm.pos.copy(grp.position);
        sm.vel.set((Math.random() - 0.5) * 2.5, 2.8 + Math.random() * 2.0, (Math.random() - 0.5) * 2.5);
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
      const sc = 0.8 + frac * 3.8;
      mesh.scale.set(sc, sc, sc);
      (mesh.material as THREE.MeshBasicMaterial).opacity = (1 - frac) * 0.72;
    });

    // 6. Flare Countermeasure Hero TNI AU
    heroFlareAccum.current += dt;
    const inSalvo = heroBurstCount.current > 0;
    const waitTime = inSalvo ? 0.2 : 1.9;
    if (heroFlareAccum.current >= waitTime) {
      heroFlareAccum.current = 0;
      if (!inSalvo) heroBurstCount.current = 4;
      heroBurstCount.current--;
      const side = heroFlareIdx.current % 2 === 0 ? 1 : -1;
      const f = heroFlares[heroFlareIdx.current % heroFlares.length];
      heroFlareIdx.current++;
      f.active = true;
      f.age = 0;
      f.pos.set(side * 1.2, 2.4, -2.2);
      f.vel.set(side * (4.5 + Math.random() * 2.0), -1.8 - Math.random() * 1.4, -12.0 - Math.random() * 3.0);
      aircraftAudio.playFlarePopSfx(soundEnabled);
    }

    // 7. Flare Defensif BANDIT-01
    if (!isHitPhase && grp) {
      banditFlareAccum.current += dt;
      if (banditFlareAccum.current >= 0.75) {
        banditFlareAccum.current = 0;
        const f = banditFlares[banditFlareIdx.current % banditFlares.length];
        banditFlareIdx.current++;
        f.active = true;
        f.age = 0;
        f.pos.copy(grp.position);
        f.vel.set((Math.random() - 0.5) * 6, -3.2 - Math.random() * 2.0, (Math.random() - 0.5) * 6);
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

    // 8. SALING TEMBAK DUA ARAH:
    // 8A. Tembakan Kanon Tracer Emas Pesawat TNI AU -> BANDIT-01
    if (isShooting && grp) {
      tracerAccum.current += dt;
      if (tracerAccum.current >= 0.14) {
        tracerAccum.current = 0;
        const tr = tracers[tracerIdx.current % tracers.length];
        tracerIdx.current++;
        tr.active = true;
        tr.age = 0;
        tr.pos.set((tracerIdx.current % 2 === 0 ? 1 : -1) * 0.9, 2.8, 2.5);
        tr.vel.subVectors(grp.position, tr.pos).normalize().multiplyScalar(92);
      }
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

    // 8B. Tembakan Balasan Tracer Merah BANDIT-01 -> Pesawat TNI AU (melintas menghindar!)
    if (isEnemyShooting && grp) {
      enemyTracerAccum.current += dt;
      if (enemyTracerAccum.current >= 0.22) {
        enemyTracerAccum.current = 0;
        const etr = enemyTracers[enemyTracerIdx.current % enemyTracers.length];
        enemyTracerIdx.current++;
        etr.active = true;
        etr.age = 0;
        etr.pos.copy(grp.position);
        heroTargetPt.set(
          Math.sin(pt * 0.72) * 3.6 + (Math.random() - 0.5) * 4.5,
          3.2 + (Math.random() - 0.5) * 2.5,
          Math.cos(pt * 0.55) * 1.6,
        );
        etr.vel.subVectors(heroTargetPt, etr.pos).normalize().multiplyScalar(86);
      }
    }
    enemyTracers.forEach((tr, idx) => {
      const m = enemyTracerRefs.current[idx];
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

      {/* Rudal Udara-ke-Udara (FOX-2) */}
      <group ref={missileRef} visible={false}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 2.4, 8]} />
          <meshStandardMaterial color="#f8fafc" metalness={0.5} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0, -1.6]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.22, 1.4, 8]} />
          <meshBasicMaterial color="#ffb703" transparent opacity={0.9} />
        </mesh>
      </group>

      {/* Bola Api Ledakan Dahsyat */}
      <group ref={explosionRef} visible={false}>
        <mesh>
          <sphereGeometry args={[1.2, 16, 16]} />
          <meshBasicMaterial color="#fffbeb" transparent opacity={0.95} />
        </mesh>
        <mesh>
          <sphereGeometry args={[1.9, 16, 16]} />
          <meshBasicMaterial color="#ff7a00" transparent opacity={0.78} />
        </mesh>
        <mesh>
          <sphereGeometry args={[2.5, 14, 14]} />
          <meshBasicMaterial color="#dc2626" transparent opacity={0.48} />
        </mesh>
      </group>

      {/* Api Berkobar saat BANDIT-01 Jatuh Terbakar */}
      <group ref={burningFireRef} visible={false}>
        <mesh>
          <sphereGeometry args={[1.4, 12, 12]} />
          <meshBasicMaterial color="#ff5500" transparent opacity={0.85} />
        </mesh>
        <mesh position={[0, 0.6, 0]}>
          <sphereGeometry args={[1.0, 10, 10]} />
          <meshBasicMaterial color="#fde047" transparent opacity={0.9} />
        </mesh>
      </group>

      {/* Kepulan Asap Hitam Pekat */}
      {crashSmokes.map((_, idx) => (
        <mesh key={`sm-${idx}`} ref={(el) => { crashSmokeRefs.current[idx] = el; }} visible={false}>
          <sphereGeometry args={[0.9, 8, 8]} />
          <meshBasicMaterial color="#1f2937" transparent opacity={0.68} depthWrite={false} />
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

      {/* Tembakan Kanon Tracer TNI AU (Emas) */}
      {tracers.map((_, idx) => (
        <mesh key={`tr-${idx}`} ref={(el) => { tracerRefs.current[idx] = el; }} visible={false}>
          <boxGeometry args={[0.14, 0.14, 4.6]} />
          <meshBasicMaterial color="#fde047" />
        </mesh>
      ))}

      {/* Tembakan Balasan Musuh BANDIT-01 (Merah) */}
      {enemyTracers.map((_, idx) => (
        <mesh key={`etr-${idx}`} ref={(el) => { enemyTracerRefs.current[idx] = el; }} visible={false}>
          <boxGeometry args={[0.14, 0.14, 4.6]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
      ))}
    </group>
  );
}
