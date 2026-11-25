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
  const leftFlameRef = useRef<THREE.Mesh>(null);
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

  // Lintasan lengkung aerodinamis 3D Pengawal 1 (manuver cantik ke kanan -> masuk formasi belakang kanan VVIP!)
  const burstCurveRight = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(21.5, 1.0, -3.5),
        new THREE.Vector3(27.5, 4.6, 2.5),
        new THREE.Vector3(32.5, 9.4, -3.5),
        new THREE.Vector3(22.5, 6.2, -16.5),
        new THREE.Vector3(12.5, 3.6, -22.0),
      ]),
    [],
  );

  // Lintasan lengkung aerodinamis 3D Pengawal 2 (manuver cantik bergantian ke kiri -> masuk formasi belakang kiri VVIP!)
  const burstCurveLeft = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-24.0, 1.4, -5.0),
        new THREE.Vector3(-29.5, 5.0, 1.8),
        new THREE.Vector3(-34.0, 9.6, -4.0),
        new THREE.Vector3(-23.0, 6.2, -16.8),
        new THREE.Vector3(-12.5, 3.6, -22.0),
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

    // Timeline Pengawalan Udara VVIP setelah mengudara (tidak terburu-buru, jeda 50 detik sebelum pengawal masuk!):
    // 0.0..50.0s   : Pesawat VVIP terbang jelajah tenang menikmati udara Nusantara
    // 50.0..54.5s  : 2 Pesawat Tempur Pengawal masuk formasi lega di kanan (+21.5) & kiri (-24.0)
    // 55.0..72.0s  : Ucapan radio kokpit Letkol Pnb Muhammad Jaki Dirgantara (16.8s)
    // 72.0..75.0s  : Jeda alami 3 detik setelah pengawal selesai berbicara
    // 75.0..89.2s  : Balasan Indonesia One kepada Flight Pengawal (13.8s)
    // 90.0..98.0s  : Pengawal 1 dulu bermanuver cantik ke kanan (Salute + Victory Roll + Asap) -> masuk belakang kanan VVIP!
    // 98.5..106.5s : Dilanjutkan Pengawal 2 bermanuver cantik ke kiri (Salute + Victory Roll + Asap) -> masuk belakang kiri VVIP!
    // 106.5s+      : Kedua pesawat pengawal mengawal stabil di belakang pesawat VVIP!
    const ESCORT_APPEAR = 50.0;
    const GREET_START = 55.0;
    const GREET_END = 72.0;
    const REPLY_START = 75.0;
    const P1_SALUTE_START = 90.0;
    const P1_BURST_START = 91.8;
    const BURST_DUR = 6.2;
    const P1_END = P1_BURST_START + BURST_DUR; // 98.0
    const P2_SALUTE_START = 98.5;
    const P2_BURST_START = 100.3;
    const P2_END = P2_BURST_START + BURST_DUR; // 106.5

    if (st < ESCORT_APPEAR) {
      if (rightRef.current) rightRef.current.visible = false;
      if (leftRef.current) leftRef.current.visible = false;
      smokeSpriteRefs.current.forEach((sp) => {
        if (sp) sp.visible = false;
      });
      if (flightMode === 'airborne') {
        setFlightLabel(
          st > 45.5
            ? 'RADAR // 2 PESAWAT TEMPUR PENGAWAL TNI AU MENDEKAT'
            : 'VIP // TERBANG JELAJAH PESAWAT KEPRESIDENAN RI (INDONESIA ONE)',
        );
      }
      return;
    }

    if (rightRef.current) rightRef.current.visible = true;
    if (leftRef.current) leftRef.current.visible = true;

    const entry = Math.min(1, (st - ESCORT_APPEAR) / 4.5);
    const ease = easeInOutCubic(entry);

    const p1X = THREE.MathUtils.lerp(54.0, 21.5, ease);
    const p1Z = THREE.MathUtils.lerp(-46.0, -7.5, ease);
    const p1Y = 1.0;

    const p2X = THREE.MathUtils.lerp(-58.0, -24.0, ease);
    const p2Z = THREE.MathUtils.lerp(-50.0, -9.5, ease);
    const p2Y = 1.4;

    // Pengawal 1 (Kanan): Formasi -> Manuver cantik pertama ke kanan -> Formasi di BELAKANG kanan VVIP!
    let smokeSource: THREE.Group | null = null;
    if (rightRef.current) {
      if (st < P1_SALUTE_START) {
        rightRef.current.position.set(
          p1X + Math.sin(t * 0.9) * 0.24,
          p1Y + Math.sin(t * 1.4) * 0.15,
          p1Z + Math.cos(t * 0.8) * 0.2,
        );
        rightRef.current.rotation.z = (1 - ease) * 0.34 + Math.sin(t * 1.1) * 0.025;
        rightRef.current.rotation.x = -0.02 + Math.sin(t * 1.2) * 0.015;
        rightRef.current.rotation.y = 0;
        if (rightFlameRef.current) rightFlameRef.current.scale.set(1, 1, 1);
      } else if (st < P1_BURST_START) {
        const sp = easeInOutCubic((st - P1_SALUTE_START) / (P1_BURST_START - P1_SALUTE_START));
        rightRef.current.position.set(21.5, 1.0, THREE.MathUtils.lerp(-7.5, -3.5, sp));
        rightRef.current.rotation.x = THREE.MathUtils.lerp(-0.02, -0.1, sp);
        rightRef.current.rotation.y = 0;
        rightRef.current.rotation.z = Math.sin(sp * Math.PI * 2) * 0.38;
        if (rightFlameRef.current) {
          rightFlameRef.current.scale.set(1.25, 1.7 + Math.sin(t * 36) * 0.25, 1.25);
        }
        if (sp > 0.35) smokeSource = rightRef.current;
      } else if (st < P1_END) {
        const rawP = (st - P1_BURST_START) / BURST_DUR;
        const u = easeInOutCubic(rawP);
        const pos = burstCurveRight.getPoint(u);
        const tan = burstCurveRight.getTangent(u).normalize();

        rightRef.current.position.copy(pos);
        const climbPitch = -Math.asin(THREE.MathUtils.clamp(tan.y, -0.85, 0.85)) * 0.72;
        const turnYaw = Math.atan2(tan.x, Math.max(0.25, tan.z + 0.65)) * 0.38;
        const victoryRoll = -easeInOutCubic(rawP) * Math.PI * 2;

        rightRef.current.rotation.x = THREE.MathUtils.lerp(rightRef.current.rotation.x, climbPitch, Math.min(1, dt * 6));
        rightRef.current.rotation.y = THREE.MathUtils.lerp(rightRef.current.rotation.y, turnYaw, Math.min(1, dt * 6));
        rightRef.current.rotation.z = victoryRoll;

        if (rightFlameRef.current) {
          rightFlameRef.current.scale.set(1.4, 2.3 + Math.sin(t * 42) * 0.35, 1.4);
        }
        if (rawP < 0.88) smokeSource = rightRef.current;
      } else {
        // Pengawal 1 menetap di BELAKANG kanan pesawat VVIP!
        const targetPos = new THREE.Vector3(
          12.5 + Math.sin(t * 0.75) * 0.3,
          3.6 + Math.sin(t * 1.1) * 0.2,
          -22.0 + Math.cos(t * 0.7) * 0.25,
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

    // Pengawal 2 (Kiri): Formasi -> Giliran kedua bermanuver cantik ke kiri -> Formasi di BELAKANG kiri VVIP!
    if (leftRef.current) {
      if (st < P2_SALUTE_START) {
        leftRef.current.position.set(
          p2X + Math.cos(t * 0.85) * 0.28,
          p2Y + Math.cos(t * 1.35) * 0.16,
          p2Z + Math.sin(t * 0.75) * 0.22,
        );
        leftRef.current.rotation.z = -(1 - ease) * 0.34 + Math.cos(t * 1.05) * 0.025;
        leftRef.current.rotation.x = -0.02 + Math.cos(t * 1.15) * 0.015;
        leftRef.current.rotation.y = 0;
        if (leftFlameRef.current) leftFlameRef.current.scale.set(1, 1, 1);
      } else if (st < P2_BURST_START) {
        const sp = easeInOutCubic((st - P2_SALUTE_START) / (P2_BURST_START - P2_SALUTE_START));
        leftRef.current.position.set(-24.0, 1.4, THREE.MathUtils.lerp(-9.5, -5.0, sp));
        leftRef.current.rotation.x = THREE.MathUtils.lerp(-0.02, -0.1, sp);
        leftRef.current.rotation.y = 0;
        leftRef.current.rotation.z = -Math.sin(sp * Math.PI * 2) * 0.38;
        if (leftFlameRef.current) {
          leftFlameRef.current.scale.set(1.25, 1.7 + Math.sin(t * 36) * 0.25, 1.25);
        }
        if (sp > 0.35) smokeSource = leftRef.current;
      } else if (st < P2_END) {
        const rawP = (st - P2_BURST_START) / BURST_DUR;
        const u = easeInOutCubic(rawP);
        const pos = burstCurveLeft.getPoint(u);
        const tan = burstCurveLeft.getTangent(u).normalize();

        leftRef.current.position.copy(pos);
        const climbPitch = -Math.asin(THREE.MathUtils.clamp(tan.y, -0.85, 0.85)) * 0.72;
        const turnYaw = Math.atan2(tan.x, Math.max(0.25, tan.z + 0.65)) * 0.38;
        const victoryRoll = easeInOutCubic(rawP) * Math.PI * 2;

        leftRef.current.rotation.x = THREE.MathUtils.lerp(leftRef.current.rotation.x, climbPitch, Math.min(1, dt * 6));
        leftRef.current.rotation.y = THREE.MathUtils.lerp(leftRef.current.rotation.y, turnYaw, Math.min(1, dt * 6));
        leftRef.current.rotation.z = victoryRoll;

        if (leftFlameRef.current) {
          leftFlameRef.current.scale.set(1.4, 2.3 + Math.sin(t * 42) * 0.35, 1.4);
        }
        if (rawP < 0.88) smokeSource = leftRef.current;
      } else {
        // Pengawal 2 menetap di BELAKANG kiri pesawat VVIP!
        const targetPos = new THREE.Vector3(
          -12.5 + Math.cos(t * 0.75) * 0.3,
          3.6 + Math.cos(t * 1.1) * 0.2,
          -22.0 + Math.sin(t * 0.7) * 0.25,
        );
        leftRef.current.position.lerp(targetPos, Math.min(1, dt * 3));
        leftRef.current.rotation.x = THREE.MathUtils.lerp(leftRef.current.rotation.x, -0.02, Math.min(1, dt * 3.5));
        leftRef.current.rotation.y = THREE.MathUtils.lerp(leftRef.current.rotation.y, 0, Math.min(1, dt * 3.5));
        if (leftRef.current.rotation.z > Math.PI) leftRef.current.rotation.z -= Math.PI * 2;
        leftRef.current.rotation.z = THREE.MathUtils.lerp(
          leftRef.current.rotation.z,
          Math.cos(t * 0.9) * 0.035,
          Math.min(1, dt * 3.5),
        );
        if (leftFlameRef.current) {
          leftFlameRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), Math.min(1, dt * 4));
        }
      }
    }

    // Update pita asap putih volumetrik melengkung di belakang ekor pesawat pengawal yang sedang bermanuver!
    if (smokeSource) {
      smokeEmitAccum.current += dt;
      if (smokeEmitAccum.current >= 0.11) {
        smokeEmitAccum.current = 0;
        const puff = smokePool[smokeIdx.current % smokePool.length];
        smokeIdx.current++;
        puff.active = true;
        puff.age = 0;
        puff.pos.set(
          smokeSource.position.x,
          smokeSource.position.y + 1.25,
          smokeSource.position.z - 5.2,
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

    if (st >= GREET_START && st < GREET_END) {
      setFlightLabel(
        'RADIO // LETKOL PNB MUHAMMAD JAKI DIRGANTARA: "SELAMAT PAGI, YANG KAMI HORMATI BAPAK PRESIDEN RI... SALAM SWA BHUWANA PAKSA"',
      );
    } else if (st >= GREET_END && st < REPLY_START) {
      setFlightLabel('VIP ESCORT // FORMASI PENGAWALAN AKTIF — INDONESIA ONE BERSIAP MEMBALAS');
    } else if (st >= REPLY_START && st < P1_SALUTE_START) {
      setFlightLabel(
        'RADIO // INDONESIA ONE: "TERIMA KASIH ATAS PENGAWALANNYA DI WILAYAH UDARA RI. SELAMAT BERTUGAS KEMBALI"',
      );
    } else if (st >= P1_SALUTE_START && st < P1_END) {
      setFlightLabel('VIP ESCORT // PENGAWAL 1 — SALUTE & MANUVER KE KANAN MENUJU FORMASI BELAKANG');
    } else if (st >= P2_SALUTE_START && st < P2_END) {
      setFlightLabel('VIP ESCORT // PENGAWAL 2 — SALUTE & MANUVER KE KIRI MENUJU FORMASI BELAKANG');
    } else if (st >= P2_END && flightMode === 'airborne') {
      setFlightLabel('VIP ESCORT // PENGAWAL 1 & 2 MENGAWAL STABIL DI BELAKANG PESAWAT KEPRESIDENAN RI');
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

      {/* Pengawal 2: F-16 Fighting Falcon di sisi kiri (giliran kedua bermanuver cantik -> belakang kiri VVIP) */}
      <group ref={leftRef} position={[-58, 1.4, -50]} scale={[0.92, 0.92, 0.92]} visible={false}>
        <primitive object={escorts.left} />
        <mesh ref={leftFlameRef} position={[0, 1.45, -7.2]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.32, 2.2, 12]} />
          <meshBasicMaterial color="#fb923c" transparent opacity={0.82} />
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
