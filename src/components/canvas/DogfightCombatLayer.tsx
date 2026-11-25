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

const BANDIT_LABELS = ['BANDIT-01', 'BANDIT-02', 'BANDIT-03'] as const;

/**
 * Menghitung posisi 3D mulus tiap pesawat musuh (Aggressor Bandit) berdasarkan pola Dogfight/ACM.
 * Koordinat dunia: +Z = depan, +Y = atas, +X = kiri, -X = kanan.
 */
function sampleBanditPosition(banditIdx: number, t: number, maneuverId: string, out: THREE.Vector3) {
  if (banditIdx === 0) {
    // BANDIT-01 (Lead Aggressor): jarak dekat & agresif menyilang di depan/samping pesawat TNI AU
    if (maneuverId === 'scissors' || maneuverId === 'thachWeave') {
      const w = t * 1.15;
      out.set(Math.sin(w) * 12.5, 4.4 + Math.cos(w * 2) * 2.2, 5.5 + Math.cos(w) * 9.5);
    } else if (maneuverId === 'highYoYo' || maneuverId === 'lowYoYo') {
      const w = t * 0.92;
      out.set(Math.cos(w) * 14.0, 5.2 + Math.sin(w * 2) * 3.4, Math.sin(w) * 12.5 + 3.0);
    } else {
      // High-G Break Turn / Circle Fight / Displacement Roll
      const w = t * 1.05;
      out.set(Math.cos(w) * 13.5, 4.6 + Math.sin(w * 1.5) * 2.4, Math.sin(w) * 13.5 + 2.5);
    }
  } else if (banditIdx === 1) {
    // BANDIT-02 (High Cover Flanker): mengapit dari atas dengan busur angka-8 lebar
    const w = t * 0.82 + 2.1;
    out.set(Math.sin(w) * 19.5, 8.2 + Math.sin(w * 2) * 2.6, Math.cos(w * 0.85) * 15.0 - 2.0);
  } else {
    // BANDIT-03 (Low Wingman Aggressor): menyapu dari arah berlawanan di ketinggian rendah-menengah
    const w = -t * 0.95 + 4.0;
    out.set(Math.cos(w) * 17.5, 2.8 + Math.cos(w * 2) * 1.8, Math.sin(w) * 16.0 - 3.5);
  }
}

/**
 * Layer 3D Pertempuran Udara (Dogfight / ACM) khusus Pesawat Tempur TNI AU:
 * - Memunculkan 3 pesawat tempur musuh (Aggressor BANDIT-01, BANDIT-02, BANDIT-03) yang bermanuver
 *   aktif mengejar & menyilang dengan orientasi aerodinamis (hidung +Z mengikuti vektor kecepatan & bank masuk tikungan).
 * - Memainkan Flare Countermeasure (suar anti-rudal berkilau + efek suara letupan pop) baik dari
 *   pesawat TNI AU maupun dari pesawat musuh saat menghindari tembakan.
 * - Menambahkan kilatan peluru tracer kanon udara yang ringan (60 FPS) agar ilustrasi dogfight terasa hidup & dramatis.
 */
export function DogfightCombatLayer() {
  const unit = useSelectedUnit();
  const flightMode = useHangarStore((s) => s.flightMode);
  const flightNonce = useHangarStore((s) => s.flightNonce);
  const fighterManeuver = useHangarStore((s) => s.fighterManeuver);
  const soundEnabled = useHangarStore((s) => s.soundEnabled);

  const banditRefs = useRef<(THREE.Group | null)[]>([]);
  const flameRefs = useRef<(THREE.Mesh | null)[]>([]);
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
  const tmpEuler = useMemo(() => new THREE.Euler(0, 0, 0, 'YXZ'), []);
  const upVec = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  const isFighter = unit.category === 'Tempur';
  const isManeuverMode = isFighter && flightMode === 'maneuver';

  // Bangun 3 model pesawat tempur musuh (Aggressor hitam-merah taktis) ringan 1x saja!
  const banditModels = useMemo(() => {
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
        // Pertahankan kaca kanopi transparan, warnai badan & sayap jadi kamuflase Aggressor gelap + aksen merah!
        if (m && !m.transparent) {
          const isTailOrAccent =
            mesh.position.y > 0.65 || Math.abs(mesh.position.x) > 2.2 || mesh.name.toLowerCase().includes('fin');
          mesh.material = isTailOrAccent ? crimsonAccentMat : darkCamoMat;
        }
      }
    });

    const m0 = base.group;
    const m1 = base.group.clone(true);
    const m2 = base.group.clone(true);
    return [m0, m1, m2];
  }, [isManeuverMode]);

  const heroFlares = useMemo<FlareState[]>(
    () =>
      Array.from({ length: 18 }, () => ({
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        age: 0,
        maxAge: 2.4,
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
      Array.from({ length: 8 }, () => ({
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        age: 0,
        maxAge: 0.42,
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
    if (!isManeuverMode || !banditModels) return;
    const dt = Math.min(delta, 0.05);
    phaseTime.current += dt;
    const pt = phaseTime.current;
    const t = state.clock.elapsedTime;

    // Cek apakah manuver yang sedang aktif termasuk kelompok Dogfight / ACM
    const cycleLen = 8.0;
    const activeManId =
      fighterManeuver === 'auto'
        ? FIGHTER_AUTO_ORDER[Math.floor(pt / cycleLen) % FIGHTER_AUTO_ORDER.length]
        : fighterManeuver;
    const isDogfightNow = getFighterManeuverSpec(activeManId).group === 'acm';

    if (!isDogfightNow) {
      banditRefs.current.forEach((g) => {
        if (g) g.visible = false;
      });
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

    // === 1. ANIMASI 3 PESAWAT TEMPUR MUSUH (BANDIT-01, BANDIT-02, BANDIT-03) ===
    const eps = 0.06;
    for (let i = 0; i < 3; i++) {
      const grp = banditRefs.current[i];
      if (!grp) continue;
      grp.visible = true;

      sampleBanditPosition(i, pt, activeManId, pNow);
      sampleBanditPosition(i, pt + eps, activeManId, pNext);
      sampleBanditPosition(i, pt - eps, activeManId, pPrev);

      grp.position.copy(pNow);

      // Arahkan hidung (+Z) mengikuti vektor kecepatan 3D yang mulus
      vel.subVectors(pNext, pNow).normalize();
      velPrev.subVectors(pNow, pPrev).normalize();

      // Hitung yaw & pitch dari arah terbang
      const yaw = Math.atan2(vel.x, vel.z);
      const horiz = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
      const pitch = -Math.atan2(vel.y, Math.max(0.001, horiz));

      // Hitung belokan lateral (cross product) untuk sudut bank aerodinamis yang alami
      const turnCross = velPrev.x * vel.z - velPrev.z * vel.x;
      const bank = THREE.MathUtils.clamp(turnCross * 24.0, -1.18, 1.18);

      tmpEuler.set(pitch, yaw, bank, 'YXZ');
      grp.rotation.copy(tmpEuler);

      // Flicker api afterburner pesawat musuh
      const flame = flameRefs.current[i];
      if (flame) {
        flame.scale.set(1, 0.85 + Math.sin(t * 42 + i * 2) * 0.28, 1);
      }
    }

    // === 2. FLARE COUNTERMEASURE PESAWAT TNI AU (Salvo defensif otomatis saat Dogfight!) ===
    heroFlareAccum.current += dt;
    // Lepas salvo 4 suar setiap ~2.2 detik (jeda 0.18s per suar di dalam salvo)
    const inSalvo = heroBurstCount.current > 0;
    const waitTime = inSalvo ? 0.18 : 1.75;
    if (heroFlareAccum.current >= waitTime) {
      heroFlareAccum.current = 0;
      if (!inSalvo) {
        heroBurstCount.current = 4;
      }
      heroBurstCount.current--;
      const side = heroFlareIdx.current % 2 === 0 ? 1 : -1;
      const f = heroFlares[heroFlareIdx.current % heroFlares.length];
      heroFlareIdx.current++;
      f.active = true;
      f.age = 0;
      f.pos.set(side * 0.85, 3.1, -2.6);
      f.vel.set(side * (3.6 + Math.random() * 2.4), -1.4 - Math.random() * 1.4, -10.2 - Math.random() * 2.8);
      if (heroFlareIdx.current % 2 === 1) {
        aircraftAudio.playFlarePopSfx(soundEnabled);
      }
    }

    heroFlares.forEach((f, i) => {
      const grp = heroFlareRefs.current[i];
      if (!grp) return;
      if (!f.active) {
        grp.visible = false;
        return;
      }
      f.age += dt;
      if (f.age >= f.maxAge) {
        f.active = false;
        grp.visible = false;
        return;
      }
      f.pos.addScaledVector(f.vel, dt);
      f.vel.y -= dt * 2.8;
      grp.visible = true;
      grp.position.copy(f.pos);
      const fade = 1 - f.age / f.maxAge;
      grp.scale.setScalar(0.65 + fade * 0.72);
    });

    // === 3. FLARE DEFENSIF PESAWAT MUSUH (BANDIT) ===
    banditFlareAccum.current += dt;
    if (banditFlareAccum.current >= 0.65) {
      banditFlareAccum.current = 0;
      const srcIdx = banditFlareIdx.current % 3;
      const srcGrp = banditRefs.current[srcIdx];
      if (srcGrp) {
        const f = banditFlares[banditFlareIdx.current % banditFlares.length];
        banditFlareIdx.current++;
        f.active = true;
        f.age = 0;
        f.pos.copy(srcGrp.position);
        const side = banditFlareIdx.current % 2 === 0 ? 1 : -1;
        f.vel.set(side * (2.5 + Math.random() * 2.0), -2.2 - Math.random() * 1.2, -3.5 + (Math.random() - 0.5) * 4.0);
      }
    }

    banditFlares.forEach((f, i) => {
      const grp = banditFlareRefs.current[i];
      if (!grp) return;
      if (!f.active) {
        grp.visible = false;
        return;
      }
      f.age += dt;
      if (f.age >= f.maxAge) {
        f.active = false;
        grp.visible = false;
        return;
      }
      f.pos.addScaledVector(f.vel, dt);
      f.vel.y -= dt * 2.5;
      grp.visible = true;
      grp.position.copy(f.pos);
      const fade = 1 - f.age / f.maxAge;
      grp.scale.setScalar(0.55 + fade * 0.55);
    });

    // === 4. KILATAN TRACER KANON UDARA (Ilustrasi Pertempuran Jarak Dekat) ===
    tracerAccum.current += dt;
    if (tracerAccum.current >= 0.32) {
      tracerAccum.current = 0;
      const b0 = banditRefs.current[tracerIdx.current % 3];
      const tr = tracers[tracerIdx.current % tracers.length];
      const fromHero = tracerIdx.current % 2 === 0;
      tracerIdx.current++;
      if (b0) {
        tr.active = true;
        tr.age = 0;
        if (fromHero) {
          tr.pos.set((Math.random() - 0.5) * 0.8, 3.2, 1.5);
          tr.vel.subVectors(b0.position, tr.pos).normalize().multiplyScalar(58);
        } else {
          tr.pos.copy(b0.position);
          tr.vel
            .set((Math.random() - 0.5) * 2.2, 3.0 + (Math.random() - 0.5) * 1.5, 0)
            .sub(tr.pos)
            .normalize()
            .multiplyScalar(52);
        }
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

  if (!isManeuverMode || !banditModels) return null;

  return (
    <group name="dogfight-combat-layer">
      {/* 3 Pesawat Tempur Musuh (Aggressor BANDIT-01, BANDIT-02, BANDIT-03) */}
      {banditModels.map((model, i) => (
        <group
          key={BANDIT_LABELS[i]}
          ref={(el) => {
            banditRefs.current[i] = el;
          }}
          visible={false}
          scale={0.76}
        >
          <primitive object={model} />
          {/* Api Afterburner Oranye-Merah Musuh */}
          <mesh
            ref={(el) => {
              flameRefs.current[i] = el;
            }}
            position={[0, 0.08, -5.65]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <coneGeometry args={[0.34, 2.5, 10]} />
            <meshBasicMaterial
              color="#ff5522"
              transparent
              opacity={0.85}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          {/* Penanda Radar Target Musuh */}
          <Html position={[0, 1.9, 0]} center distanceFactor={28}>
            <div className="pointer-events-none select-none whitespace-nowrap rounded border border-rose-500/80 bg-[#1a0508]/85 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.45)]">
              ◆ {BANDIT_LABELS[i]}
            </div>
          </Html>
        </group>
      ))}

      {/* 18 Flare Countermeasure Pesawat TNI AU */}
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

      {/* 12 Flare Defensif Pesawat Musuh */}
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

      {/* 8 Kilatan Tracer Kanon Udara */}
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
            opacity={0.92}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
