import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useHangarStore } from '../../store/useHangarStore';
import { buildDetailedF16 } from '../../utils/f16Builder';
import { aircraftAudio } from '../../utils/aircraftAudio';

/** Tekstur kepulan asap putih aerobatik lembut untuk jejak manuver Pengawal 1. */
function makeWhiteSmokeTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 6, 64, 64, 58);
  g.addColorStop(0.0, 'rgba(255,255,255,0.88)');
  g.addColorStop(0.45, 'rgba(235,245,255,0.52)');
  g.addColorStop(1.0, 'rgba(220,238,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function easeInOutCubic(x: number): number {
  const t = Math.max(0, Math.min(1, x));
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

interface SmokePuffState {
  pos: THREE.Vector3;
  age: number;
  maxAge: number;
  active: boolean;
}

/**
 * Pengawalan Udara Pesawat Kepresidenan VVIP (Boeing 737 VIP & Falcon 8X — Skadron Udara 17):
 * 1. Jeda awal (0..6 dtk): Pesawat VVIP terbang jelajah sendiri dulu.
 * 2. Intersep & Formasi Lega (6..10,5 dtk): 2 F-16 TNI AU masuk di posisi aman (Pengawal 1: +21.5, Pengawal 2: -29.0).
 * 3. Ucapan Radio Kokpit (10,5..27,6 dtk): Rekaman asli Letkol Pnb Muhammad Jaki Dirgantara.
 * 4. Manuver Salute & Bomb Burst Halus (27,6 dtk+):
 *    - Wing-Rock hormat + Full Afterburner melesat maju -> Busur melengkung 3D ke kanan-atas sambil 360° Victory Roll
 *      dengan jejak pita asap putih volumetrik melengkung di langit -> lalu menetap terlihat di posisi Overwatch atas-kanan!
 */
export function VvipEscortLayer() {
  const selectedId = useHangarStore((s) => s.selectedId);
  const flightMode = useHangarStore((s) => s.flightMode);
  const soundEnabled = useHangarStore((s) => s.soundEnabled);
  const setFlightLabel = useHangarStore((s) => s.setFlightLabel);

  const rightRef = useRef<THREE.Group>(null);
  const leftRef = useRef<THREE.Group>(null);
  const rightFlameRef = useRef<THREE.Mesh>(null);
  const smokeSpriteRefs = useRef<(THREE.Sprite | null)[]>([]);
  const timer = useRef(0);
  const welcomePlayed = useRef(false);
  const greetingPlayed = useRef(false);
  const replyPlayed = useRef(false);
  const smokeEmitAccum = useRef(0);
  const smokeIdx = useRef(0);

  const isVvip = selectedId === 'b737vip' || selectedId === 'falcon8x';
  const isActive = isVvip && (flightMode === 'airborne' || flightMode === 'maneuver');

  const smokeTex = useMemo(() => makeWhiteSmokeTexture(), []);
  useEffect(() => () => smokeTex.dispose(), [smokeTex]);

  const smokePool = useMemo<SmokePuffState[]>(
    () =>
      Array.from({ length: 28 }, () => ({
        pos: new THREE.Vector3(),
        age: 0,
        maxAge: 3.4,
        active: false,
      })),
    [],
  );

  // Lintasan lengkung aerodinamis 3D yang mulus (maju -> menanjak kanan-atas -> merata di posisi Overwatch!)
  const burstCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(21.5, 1.0, -3.5),
        new THREE.Vector3(25.0, 3.8, 3.2),
        new THREE.Vector3(31.5, 9.6, 2.8),
        new THREE.Vector3(35.8, 13.6, -5.2),
        new THREE.Vector3(34.5, 12.2, -14.5),
      ]),
    [],
  );

  const escorts = useMemo(() => {
    if (!isVvip) return null;
    const f16Base = buildDetailedF16();
    const gear = f16Base.group.getObjectByName('landing-gear');
    if (gear) gear.visible = false;
    f16Base.group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    const right = f16Base.group;
    const left = f16Base.group.clone(true);
    return { right, left };
  }, [isVvip]);

  useEffect(() => {
    if (!isActive) {
      timer.current = 0;
      welcomePlayed.current = false;
      greetingPlayed.current = false;
      replyPlayed.current = false;
      smokeEmitAccum.current = 0;
      smokePool.forEach((p) => {
        p.active = false;
      });
    }
  }, [isActive, selectedId, smokePool]);

  useFrame((state, delta) => {
    if (!isActive) return;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    timer.current += dt;
    const st = timer.current;

    // Timeline lengkap audio & visual Indonesia One (tanpa tumpang tindih!):
    // 0.6..20.4s : Pengumuman Kapten Pnb Herlani di atas pesawat Kepresidenan RI menuju Sentani Jayapura
    // 21.0..25.0s: 2 Pesawat Tempur Pengawal masuk formasi lega di kanan (+21.5) & kiri (-29.0)
    // 25.2..42.2s: Ucapan radio kokpit Letkol Pnb Muhammad Jaki Dirgantara
    // 42.6..49.5s: Balasan Indonesia One kepada Flight Pengawal ("Terima kasih atas pengawalannya...")
    // 50.0s+     : Salute Wing-Rock + Manuver Bomb Burst Halus Pengawal 1 -> Overwatch!
    const WELCOME_START = 0.6;
    const ESCORT_APPEAR = 21.0;
    const GREET_START = 25.2;
    const REPLY_START = 42.6;
    const SALUTE_START = 50.0;
    const BURST_START = 51.8;
    const BURST_DUR = 6.2;

    if (st >= WELCOME_START && !welcomePlayed.current) {
      welcomePlayed.current = true;
      aircraftAudio.playVvipVoice('vvip-welcome', soundEnabled);
    }

    if (st < ESCORT_APPEAR) {
      if (rightRef.current) rightRef.current.visible = false;
      if (leftRef.current) leftRef.current.visible = false;
      smokeSpriteRefs.current.forEach((sp) => {
        if (sp) sp.visible = false;
      });
      if (flightMode === 'airborne') {
        setFlightLabel(
          st > 19.2
            ? '📡 RADAR: 2 PESAWAT TEMPUR PENGAWAL TNI AU MENDEKAT...'
            : '🎙️ KAPTEN PNB HERLANI (INDONESIA ONE) • PENGUMUMAN KABIN MENUJU BANDARA SENTANI JAYAPURA',
        );
      }
      return;
    }

    if (rightRef.current) rightRef.current.visible = true;
    if (leftRef.current) leftRef.current.visible = true;

    const entry = Math.min(1, (st - ESCORT_APPEAR) / 4.0);
    const ease = easeInOutCubic(entry);

    const p1X = THREE.MathUtils.lerp(52.0, 21.5, ease);
    const p1Z = THREE.MathUtils.lerp(-44.0, -7.5, ease);
    const p1Y = 1.0;

    const p2X = THREE.MathUtils.lerp(-60.0, -29.0, ease);
    const p2Z = THREE.MathUtils.lerp(-54.0, -15.5, ease);
    const p2Y = 2.2;

    // Pengawal 2 (Kiri — overwatch stabil agak jauh)
    if (leftRef.current) {
      leftRef.current.position.set(
        p2X + Math.cos(t * 0.85) * 0.28,
        p2Y + Math.cos(t * 1.35) * 0.16,
        p2Z + Math.sin(t * 0.75) * 0.22,
      );
      leftRef.current.rotation.z = -(1 - ease) * 0.34 + Math.cos(t * 1.05) * 0.025;
      leftRef.current.rotation.x = -0.02 + Math.cos(t * 1.15) * 0.015;
      leftRef.current.rotation.y = 0;
    }

    // Pengawal 1 (Kanan): Formasi -> Hormat Wing-Rock & Akselerasi -> Bomb Burst Busur Halus + 360° Roll -> Overwatch!
    let emitSmoke = false;
    if (rightRef.current) {
      if (st < SALUTE_START) {
        rightRef.current.position.set(
          p1X + Math.sin(t * 0.9) * 0.24,
          p1Y + Math.sin(t * 1.4) * 0.15,
          p1Z + Math.cos(t * 0.8) * 0.2,
        );
        rightRef.current.rotation.z = (1 - ease) * 0.34 + Math.sin(t * 1.1) * 0.025;
        rightRef.current.rotation.x = -0.02 + Math.sin(t * 1.2) * 0.015;
        rightRef.current.rotation.y = 0;
        if (rightFlameRef.current) rightFlameRef.current.scale.set(1, 1, 1);
      } else if (st < BURST_START) {
        // Tahap 4A: Salute Wing-Rock (goyang sayap hormat) sambil akselerasi maju bersiap Bomb Burst!
        const sp = easeInOutCubic((st - SALUTE_START) / (BURST_START - SALUTE_START));
        rightRef.current.position.set(21.5, 1.0, THREE.MathUtils.lerp(-7.5, -3.5, sp));
        rightRef.current.rotation.x = THREE.MathUtils.lerp(-0.02, -0.1, sp);
        rightRef.current.rotation.y = 0;
        rightRef.current.rotation.z = Math.sin(sp * Math.PI * 2) * 0.38;
        if (rightFlameRef.current) {
          rightFlameRef.current.scale.set(1.25, 1.7 + Math.sin(t * 36) * 0.25, 1.25);
        }
        emitSmoke = sp > 0.35;
      } else if (st < BURST_START + BURST_DUR) {
        // Tahap 4B: BOMB BURST BUSUR HALUS — mengikuti kurva 3D sejati dengan hidung searah lintasan + 360° Victory Roll!
        const rawP = (st - BURST_START) / BURST_DUR;
        const u = easeInOutCubic(rawP);
        const pos = burstCurve.getPoint(u);
        const tan = burstCurve.getTangent(u).normalize();

        rightRef.current.position.copy(pos);

        // Hitung pitch & yaw natural agar hidung selalu mengarah halus mengikuti busur terbang (bukan mundur/kaku!)
        const climbPitch = -Math.asin(THREE.MathUtils.clamp(tan.y, -0.85, 0.85)) * 0.72;
        const turnYaw = Math.atan2(tan.x, Math.max(0.25, tan.z + 0.65)) * 0.38;
        const victoryRoll = -easeInOutCubic(rawP) * Math.PI * 2;

        rightRef.current.rotation.x = THREE.MathUtils.lerp(rightRef.current.rotation.x, climbPitch, Math.min(1, dt * 6));
        rightRef.current.rotation.y = THREE.MathUtils.lerp(rightRef.current.rotation.y, turnYaw, Math.min(1, dt * 6));
        rightRef.current.rotation.z = victoryRoll;

        if (rightFlameRef.current) {
          rightFlameRef.current.scale.set(1.4, 2.3 + Math.sin(t * 42) * 0.35, 1.4);
        }
        emitSmoke = rawP < 0.88;
      } else {
        // Tahap 4C: Meratakan sayap mulus & tetap terlihat jelas mengawal dari posisi tinggi-kanan!
        const targetPos = new THREE.Vector3(
          34.5 + Math.sin(t * 0.75) * 0.35,
          12.2 + Math.sin(t * 1.1) * 0.24,
          -14.5 + Math.cos(t * 0.7) * 0.3,
        );
        rightRef.current.position.lerp(targetPos, Math.min(1, dt * 3));
        rightRef.current.rotation.x = THREE.MathUtils.lerp(rightRef.current.rotation.x, -0.02, Math.min(1, dt * 3.5));
        rightRef.current.rotation.y = THREE.MathUtils.lerp(rightRef.current.rotation.y, 0, Math.min(1, dt * 3.5));
        if (rightRef.current.rotation.z < -Math.PI) rightRef.current.rotation.z += Math.PI * 2;
        rightRef.current.rotation.z = THREE.MathUtils.lerp(
          rightRef.current.rotation.z,
          Math.sin(t * 0.9) * 0.035,
          Math.min(1, dt * 3.5),
        );
        if (rightFlameRef.current) {
          rightFlameRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), Math.min(1, dt * 4));
        }
      }
    }

    // Update pita asap putih volumetrik melengkung di belakang ekor Pengawal 1!
    if (emitSmoke && rightRef.current) {
      smokeEmitAccum.current += dt;
      if (smokeEmitAccum.current >= 0.11) {
        smokeEmitAccum.current = 0;
        const puff = smokePool[smokeIdx.current % smokePool.length];
        smokeIdx.current++;
        puff.active = true;
        puff.age = 0;
        puff.pos.set(
          rightRef.current.position.x,
          rightRef.current.position.y + 1.25,
          rightRef.current.position.z - 5.2,
        );
      }
    }

    smokePool.forEach((puff, i) => {
      const sp = smokeSpriteRefs.current[i];
      if (!sp) return;
      if (!puff.active) {
        sp.visible = false;
        return;
      }
      puff.age += dt;
      if (puff.age >= puff.maxAge) {
        puff.active = false;
        sp.visible = false;
        return;
      }
      // Asap ikut terbawa aliran udara ke belakang (-Z) sambil mengembang lembut & memudar
      puff.pos.z -= dt * 11.5;
      const life = puff.age / puff.maxAge;
      sp.visible = true;
      sp.position.copy(puff.pos);
      const sc = 1.25 + life * 4.2;
      sp.scale.set(sc, sc, 1);
      const mat = sp.material as THREE.SpriteMaterial;
      mat.opacity = Math.sin(Math.min(1, life * 4) * (Math.PI / 2)) * (1 - life) * 0.65;
    });

    // Fase 3: Putar rekaman suara asli Letkol Pnb Muhammad Jaki Dirgantara
    if (st >= GREET_START && !greetingPlayed.current) {
      greetingPlayed.current = true;
      aircraftAudio.playVvipEscortRadio(soundEnabled);
    }

    // Fase 3B: Balasan dari Indonesia One kepada Flight Pengawal
    if (st >= REPLY_START && !replyPlayed.current) {
      replyPlayed.current = true;
      aircraftAudio.playVvipVoice('vvip-reply', soundEnabled);
    }

    if (st >= GREET_START && st < REPLY_START) {
      setFlightLabel(
        '📡 LETKOL PNB MUHAMMAD JAKI DIRGANTARA: "SELAMAT PAGI, YANG KAMI HORMATI BAPAK PRESIDEN REPUBLIK INDONESIA... SALAM SWA BHUWANA PAKSA!"',
      );
    } else if (st >= REPLY_START && st < SALUTE_START) {
      setFlightLabel(
        '🎙️ INDONESIA ONE: "TERIMA KASIH ATAS PENGAWALANNYA DI WILAYAH UDARA RI. SELAMAT BERTUGAS KEMBALI. SALAM SWA BHUWANA PAKSA!"',
      );
    } else if (st >= SALUTE_START && st < BURST_START + BURST_DUR) {
      setFlightLabel('🔥 PENGAWAL 1 • SALUTE WING-ROCK & MANUVER BOMB BURST HORMAT KEPRESIDENAN!');
    } else if (st >= BURST_START + BURST_DUR && flightMode === 'airborne') {
      setFlightLabel('PENGAWALAN VVIP AKTIF • PENGAWAL 1 & 2 MENGAWAL PESAWAT KEPRESIDENAN RI');
    }
  });

  if (!isActive || !escorts) return null;

  return (
    <group name="vvip-fighter-escort-3d">
      {/* Pita Asap Putih Volumetrik Melengkung dari Manuver Bomb Burst Pengawal 1 */}
      {smokePool.map((_, i) => (
        <sprite
          key={`vvip-smoke-${i}`}
          ref={(el) => {
            smokeSpriteRefs.current[i] = el;
          }}
          visible={false}
        >
          <spriteMaterial map={smokeTex} transparent opacity={0.6} depthWrite={false} />
        </sprite>
      ))}

      {/* Pengawal 1: F-16 Fighting Falcon di sisi kanan (Salute Wing-Rock + Bomb Burst + Overwatch!) */}
      <group ref={rightRef} position={[52, 1.0, -44]} scale={[0.92, 0.92, 0.92]} visible={false}>
        <primitive object={escorts.right} />
        <mesh ref={rightFlameRef} position={[0, 1.45, -7.2]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.32, 2.2, 12]} />
          <meshBasicMaterial color="#fb923c" transparent opacity={0.85} />
        </mesh>
        <Html position={[0, 3.6, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <span className="whitespace-nowrap rounded border border-[#ffb703]/80 bg-[#081933]/88 px-2 py-0.5 font-display text-[9px] font-bold tracking-wider text-[#ffb703] uppercase shadow">
            PENGAWAL 1 • F-16 TNI AU
          </span>
        </Html>
      </group>

      {/* Pengawal 2: F-16 Fighting Falcon di sisi kiri belakang (Overwatch) */}
      <group ref={leftRef} position={[-60, 2.2, -54]} scale={[0.92, 0.92, 0.92]} visible={false}>
        <primitive object={escorts.left} />
        <mesh position={[0, 1.45, -7.2]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.32, 2.2, 12]} />
          <meshBasicMaterial color="#fb923c" transparent opacity={0.78} />
        </mesh>
        <Html position={[0, 3.6, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <span className="whitespace-nowrap rounded border border-[#ffb703]/80 bg-[#081933]/88 px-2 py-0.5 font-display text-[9px] font-bold tracking-wider text-[#ffb703] uppercase shadow">
            PENGAWAL 2 • F-16 TNI AU
          </span>
        </Html>
      </group>
    </group>
  );
}
