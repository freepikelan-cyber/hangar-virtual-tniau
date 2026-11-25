import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useHangarStore } from '../../store/useHangarStore';
import { getJupiterSpec, JUPITER_AUTO_ORDER, type JupiterManeuverId } from '../../data/jupiterManeuvers';

interface Props {
  sourceGroup: THREE.Group;
}

interface Pose {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
}

/**
 * Menghitung posisi & sikap 3D relatif yang LEGA & BEBAS BERTUMPUK untuk 5 pesawat pendamping JAT:
 * (Rentang sayap KT-1B ≈ 10 unit, panjang ≈ 11 unit -> jarak antar-pesawat ≥ 9–10 unit agar rapi & enak dilihat!)
 * - Index 0, 1, 2 -> Jupiter 2, 3, 4 (Main Body bersama Jupiter 1 Leader di [0,0,0])
 * - Index 3, 4    -> Jupiter 5, 6 (Elemen Synchro Pair)
 */
function computeWingmanPose(
  maneuver: Exclude<JupiterManeuverId, 'auto'>,
  idx: number, // 0=J2, 1=J3, 2=J4, 3=J5(Synchro1), 4=J6(Synchro2)
  p: number, // 0..1 progress dalam siklus 7.5 detik
  t: number,
): Pose {
  const sWave = Math.sin(p * Math.PI);
  const fullWave = Math.sin(p * Math.PI * 2);

  // Default Arrow Head (Anak Panah) dengan jarak sayap lega & rapi:
  const arrow: [number, number, number][] = [
    [9.2, -0.4, -9.0],    // J2 Kanan
    [-9.2, -0.4, -9.0],   // J3 Kiri
    [0.0, -1.0, -18.0],   // J4 Slot Belakang
    [18.0, -0.8, -18.0],  // J5 Kanan Luar (Synchro)
    [-18.0, -0.8, -18.0], // J6 Kiri Luar (Synchro)
  ];

  let [x, y, z] = arrow[idx];
  let rx = 0;
  let ry = 0;
  let rz = 0;

  switch (maneuver) {
    case 'jupiterRoll': {
      rz = -p * Math.PI * 2;
      break;
    }
    case 'jupiterRollBack': {
      rz = p < 0.5 ? -(p * 2) * Math.PI * 2 : ((p - 0.5) * 2) * Math.PI * 2;
      break;
    }
    case 'arrowHead': {
      y += sWave * 2.2;
      rx = -fullWave * 0.4;
      break;
    }
    case 'eagleToArrow': {
      // Eagle lebar membentang -> merapat mulus menjadi Arrow Head!
      const eagle: [number, number, number][] = [
        [12.5, 0.8, -4.5],
        [-12.5, 0.8, -4.5],
        [0.0, -1.5, -13.5],
        [24.0, 2.0, -9.5],
        [-24.0, 2.0, -9.5],
      ];
      const blend = 0.5 - 0.5 * Math.cos(p * Math.PI * 2);
      x = THREE.MathUtils.lerp(eagle[idx][0], arrow[idx][0], blend);
      y = THREE.MathUtils.lerp(eagle[idx][1], arrow[idx][1], blend) + sWave * 1.8;
      z = THREE.MathUtils.lerp(eagle[idx][2], arrow[idx][2], blend);
      rx = -sWave * 0.34;
      break;
    }
    case 'heart': {
      // Synchro J5 (idx=3) & J6 (idx=4) melukis bentuk Hati (♥) RAKSASA di langit!
      if (idx === 3 || idx === 4) {
        const side = idx === 3 ? 1 : -1;
        const a = p * Math.PI;
        const hx = side * (16 * Math.pow(Math.sin(a), 3)) * 1.05;
        const hy = (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * 0.65 + 5.0;
        x = hx;
        y = hy;
        z = -4.0;
        rz = -side * Math.cos(a) * 0.72;
        rx = -Math.sin(a) * 0.3;
      } else {
        // Main Body J2-J4 mengawal rapi di belakang-bawah
        const escort: [number, number, number][] = [
          [9.5, -1.2, -12.0],
          [-9.5, -1.2, -12.0],
          [0.0, -2.0, -22.0],
        ];
        [x, y, z] = escort[idx];
      }
      break;
    }
    case 'diamond': {
      // Main Body (J1–J4) membentuk Wajik (Diamond) lega, Synchro bergabung dari posisi Tango
      const diam: [number, number, number][] = [
        [9.0, -0.4, -9.5],
        [-9.0, -0.4, -9.5],
        [0.0, -0.8, -19.0],
        [THREE.MathUtils.lerp(21.0, 15.5, sWave), -0.6, THREE.MathUtils.lerp(-6.0, -24.0, sWave)],
        [THREE.MathUtils.lerp(-21.0, -15.5, sWave), -0.6, THREE.MathUtils.lerp(-6.0, -24.0, sWave)],
      ];
      [x, y, z] = diam[idx];
      y += sWave * 2.0;
      rx = -fullWave * 0.36;
      break;
    }
    case 'delta': {
      // Segitiga Delta klasik (1 - 2 - 3) dengan jarak sayap lega
      const del: [number, number, number][] = [
        [9.2, -0.4, -9.5],
        [-9.2, -0.4, -9.5],
        [0.0, -0.8, -19.0],
        [18.4, -0.8, -19.0],
        [-18.4, -0.8, -19.0],
      ];
      [x, y, z] = del[idx];
      y += sWave * 2.4;
      rx = -fullWave * 0.42;
      break;
    }
    case 'cloverLeaf': {
      const phase = (p + idx * 0.08) % 1;
      const a = phase * Math.PI * 2;
      x += Math.sin(a) * 3.2;
      y += Math.cos(a) * 2.6;
      rz = -Math.sin(a) * 0.82;
      rx = -Math.cos(a) * 0.34;
      break;
    }
    case 'bombBurst': {
      // Puncak pertunjukan! 6 pesawat memencar radial LEBAR ke 6 penjuru!
      const burst = Math.max(0, (p - 0.22) / 0.78);
      const bEase = burst * burst * (3 - 2 * burst);
      const dirs: [number, number, number][] = [
        [26.0, 6.5, -5.0],
        [-26.0, 6.5, -5.0],
        [0.0, -10.5, -26.0],
        [32.0, -7.5, -16.0],
        [-32.0, -7.5, -16.0],
      ];
      x = THREE.MathUtils.lerp(arrow[idx][0], dirs[idx][0], bEase);
      y = THREE.MathUtils.lerp(arrow[idx][1] + 2.0, dirs[idx][1], bEase);
      z = THREE.MathUtils.lerp(arrow[idx][2], dirs[idx][2], bEase);
      rz = (idx % 2 === 0 ? -1 : 1) * bEase * 1.3;
      rx = bEase * (dirs[idx][1] < 0 ? 0.42 : -0.34);
      ry = Math.atan2(dirs[idx][0], 18) * bEase;
      break;
    }
    case 'screwRoll': {
      // Hanya 2 pesawat Synchro: Jupiter 5 lurus di tengah, Jupiter 6 berputar spiral mengelilingi J5!
      if (idx === 3) {
        x = 0;
        y = 1.2;
        z = -2.0;
        rz = 0;
      } else if (idx === 4) {
        const ang = p * Math.PI * 4;
        x = Math.cos(ang) * 9.5;
        y = 1.2 + Math.sin(ang) * 6.0;
        z = -2.0;
        rz = -ang * 1.4;
      }
      break;
    }
    case 'garuda': {
      // Formasi Sayap Sang Garuda membentang lebar & melengkung megah!
      const garudaPos: [number, number, number][] = [
        [10.2, 1.4, -7.0],
        [-10.2, 1.4, -7.0],
        [0.0, -1.6, -16.5],
        [21.0, 3.6, -13.0],
        [-21.0, 3.6, -13.0],
      ];
      [x, y, z] = garudaPos[idx];
      y += sWave * 2.2;
      rx = -fullWave * 0.36;
      rz = (idx === 0 || idx === 3 ? -0.14 : idx === 1 || idx === 4 ? 0.14 : 0) * sWave;
      break;
    }
    case 'snakeLoop': {
      // Formasi ekor-beriringan memanjang (jarak 12 unit per pesawat) meliuk gelombang S!
      const trailZ = -(idx + 1) * 11.5;
      const wavePhase = t * 2.4 - idx * 0.78;
      x = Math.sin(wavePhase) * 8.5;
      y = Math.cos(wavePhase * 0.8) * 2.6;
      z = trailZ;
      rz = -Math.cos(wavePhase) * 0.62;
      rx = -Math.sin(wavePhase * 0.8) * 0.24;
      break;
    }
    case 'mirror': {
      // HANYA 2 PESAWAT SYNCHRO: Jupiter 5 terbang normal, Jupiter 6 TERBALIK 180° tepat berdampingan di tengah!
      if (idx === 3) {
        x = 6.2;
        y = 1.6;
        z = -2.0;
        rz = 0;
      } else if (idx === 4) {
        x = -6.2;
        y = 2.0;
        z = -2.0;
        rz = Math.PI; // 180° terbalik!
      }
      break;
    }
    case 'twinHalfCuban': {
      // HANYA 2 PESAWAT SYNCHRO di tengah layar
      if (idx === 3 || idx === 4) {
        const side = idx === 3 ? 1 : -1;
        x = side * (6.5 + Math.cos(p * Math.PI * 2) * 10.5);
        y = 1.5 + Math.sin(p * Math.PI * 2) * 6.5;
        z = -3.0;
        rx = -Math.cos(p * Math.PI * 2) * 0.7;
        rz = side * p * Math.PI * 2;
      }
      break;
    }
    case 'barrelRoll': {
      const a = p * Math.PI * 2;
      x += Math.sin(a) * 2.4;
      y += (1 - Math.cos(a)) * 1.6;
      rz = -a;
      break;
    }
    case 'rollSlide': {
      const shift = Math.sin(p * Math.PI * 2);
      x = arrow[idx][0] + shift * (idx % 2 === 0 ? -6.5 : 6.5);
      y += Math.abs(shift) * (idx % 2 === 0 ? 1.8 : -1.8);
      rz = -shift * 1.15;
      break;
    }
    case 'soloSpin': {
      // HANYA 1 PESAWAT SOLO (Jupiter 5) di tengah panggung, 5 pesawat lain menyingkir keluar pandangan!
      if (idx === 3) {
        x = 0.0;
        y = 5.5 - p * 9.0;
        z = -2.0;
        rx = 0.92;
        ry = p * Math.PI * 8;
        rz = 0.5;
      }
      break;
    }
    case 'fiveCards': {
      // 5 Pesawat kipas kartu lebar + 1 solo di bawah belakang
      const cards: [number, number, number][] = [
        [9.5, 0.6, -5.0],
        [-9.5, 0.6, -5.0],
        [19.0, 1.6, -10.5],
        [-19.0, 1.6, -10.5],
        [0.0, -3.2, -16.5],
      ];
      [x, y, z] = cards[idx];
      y += sWave * 2.2;
      rx = -fullWave * 0.36;
      break;
    }
    case 'leaderBenefit': {
      const frame: [number, number, number][] = [
        [11.0, 1.2, -12.0],
        [-11.0, 1.2, -12.0],
        [0.0, -2.2, -21.0],
        [21.5, 2.8, -21.0],
        [-21.5, 2.8, -21.0],
      ];
      [x, y, z] = frame[idx];
      rz = (idx === 0 || idx === 3 ? -0.24 : idx === 1 || idx === 4 ? 0.24 : 0) * sWave;
      break;
    }
    case 'crossOverBreak': {
      // Pecah silang dramatis kiri <-> kanan dengan separasi vertikal agar tidak bertabrakan!
      const cross = Math.sin(p * Math.PI);
      const isRight = idx === 0 || idx === 3;
      const isLeft = idx === 1 || idx === 4;
      if (isRight) {
        x = THREE.MathUtils.lerp(arrow[idx][0], -arrow[idx][0] * 1.15, cross);
        y += cross * 3.2;
        rz = 1.1 * cross;
        ry = -0.32 * cross;
      } else if (isLeft) {
        x = THREE.MathUtils.lerp(arrow[idx][0], -arrow[idx][0] * 1.15, cross);
        y -= cross * 2.4;
        rz = -1.1 * cross;
        ry = 0.32 * cross;
      } else {
        y += cross * 4.5;
      }
      break;
    }
    case 'bombers': {
      // Formasi Bombers berjajar lebar gagah (jarak sayap bersih 11 unit!)
      const bombPos: [number, number, number][] = [
        [11.0, 0.0, -4.5],
        [-11.0, 0.0, -4.5],
        [22.0, 0.4, -9.0],
        [-22.0, 0.4, -9.0],
        [0.0, -1.0, -14.5],
      ];
      [x, y, z] = bombPos[idx];
      break;
    }
  }

  return { x, y, z, rx, ry, rz };
}

/**
 * Formasi 6 Pesawat JUPITER AEROBATIC TEAM TNI AU (KT-1B Wong Bee):
 * - Jupiter 1 (Leader) = pesawat utama di AircraftModel
 * - Jupiter 2, 3, 4    = Main Body (3 wingman)
 * - Jupiter 5, 6       = Synchro Pair (2 pesawat atraksi spesial)
 */
export function JupiterFormationLayer({ sourceGroup }: Props) {
  const selectedId = useHangarStore((s) => s.selectedId);
  const flightMode = useHangarStore((s) => s.flightMode);
  const jupiterManeuver = useHangarStore((s) => s.jupiterManeuver);
  const setFlightLabel = useHangarStore((s) => s.setFlightLabel);

  const wingRefs = useRef<(THREE.Group | null)[]>([]);
  const leaderFxRef = useRef<THREE.Group>(null);
  const heartSmokeRef = useRef<THREE.Group>(null);
  const timer = useRef(0);

  const isActive = selectedId === 'kt1b' && flightMode === 'maneuver';
  const currentSpec = useMemo(() => {
    if (jupiterManeuver === 'auto') return null;
    return getJupiterSpec(jupiterManeuver);
  }, [jupiterManeuver]);

  const wingmen = useMemo(() => {
    if (selectedId !== 'kt1b') return [];
    return [2, 3, 4, 5, 6].map((num) => {
      const clone = sourceGroup.clone(true);
      const gear = clone.getObjectByName('landing-gear');
      if (gear) gear.visible = false;
      return { num, obj: clone, role: num <= 4 ? 'MAIN BODY' : 'SYNCHRO' };
    });
  }, [sourceGroup, selectedId]);

  // Hati Asap Putih Raksasa 3D (skala lega agar selaras dengan lintasan Synchro J5 & J6!)
  const heartPoints = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const hx = (16 * Math.pow(Math.sin(a), 3)) * 1.05;
      const hy = (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * 0.65 + 5.0;
      pts.push([hx, hy, -5.0]);
    }
    return pts;
  }, []);

  useFrame((state, delta) => {
    if (!isActive) {
      timer.current = 0;
      return;
    }
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    timer.current += dt;

    const cycleLen = 7.5;
    const activeId: Exclude<JupiterManeuverId, 'auto'> =
      jupiterManeuver === 'auto'
        ? JUPITER_AUTO_ORDER[Math.floor(timer.current / cycleLen) % JUPITER_AUTO_ORDER.length]
        : jupiterManeuver;
    const p = (timer.current % cycleLen) / cycleLen;

    const spec = getJupiterSpec(activeId);
    setFlightLabel(`JUPITER AEROBATIC TEAM (${spec.activeShips.length} PESAWAT) • ${spec.name.toUpperCase()}`);

    const leaderInScene = spec.activeShips.includes(1);
    if (leaderFxRef.current) {
      leaderFxRef.current.visible = leaderInScene;
    }

    wingRefs.current.forEach((grp, idx) => {
      if (!grp) return;
      const shipNum = idx + 2; // 2..6
      const shipActive = spec.activeShips.includes(shipNum);
      if (!shipActive) {
        // Pesawat yang tidak ikut manuver menyingkir jauh keluar lapangan pandang!
        const exitX = shipNum % 2 === 0 ? 110 : -110;
        grp.position.x = THREE.MathUtils.lerp(grp.position.x, exitX, Math.min(1, dt * 3.2));
        grp.position.y = THREE.MathUtils.lerp(grp.position.y, 28, Math.min(1, dt * 3.2));
        grp.position.z = THREE.MathUtils.lerp(grp.position.z, -85, Math.min(1, dt * 3.2));
        grp.rotation.z = THREE.MathUtils.lerp(grp.rotation.z, shipNum % 2 === 0 ? -0.9 : 0.9, Math.min(1, dt * 4));
        grp.visible = Math.abs(grp.position.x) < 72;
        return;
      }

      grp.visible = true;
      const pose = computeWingmanPose(activeId, idx, p, t);
      grp.position.x = THREE.MathUtils.lerp(grp.position.x, pose.x, Math.min(1, dt * 5.2));
      grp.position.y = THREE.MathUtils.lerp(grp.position.y, pose.y, Math.min(1, dt * 5.2));
      grp.position.z = THREE.MathUtils.lerp(grp.position.z, pose.z, Math.min(1, dt * 5.2));
      grp.rotation.x = THREE.MathUtils.lerp(grp.rotation.x, pose.rx, Math.min(1, dt * 5.2));
      grp.rotation.y = THREE.MathUtils.lerp(grp.rotation.y, pose.ry, Math.min(1, dt * 5.2));
      grp.rotation.z = THREE.MathUtils.lerp(grp.rotation.z, pose.rz, Math.min(1, dt * 5.2));
    });

    if (heartSmokeRef.current) {
      heartSmokeRef.current.visible = activeId === 'heart';
      if (activeId === 'heart') {
        const s = 0.92 + Math.sin(t * 1.8) * 0.03;
        heartSmokeRef.current.scale.setScalar(s);
      }
    }
  });

  if (!isActive) return null;

  const showLeaderBadge = !currentSpec || currentSpec.activeShips.includes(1);

  return (
    <group name="jupiter-6ship-formation">
      {/* Jejak Asap Putih Aerobatik ramping untuk Jupiter 1 (Leader) — sembunyi jika J1 menyingkir! */}
      <group ref={leaderFxRef}>
        <mesh position={[0, 1.35, -13.5]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.52, 16.5, 12, 1, true]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.34} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        {showLeaderBadge && (
          <Html position={[0, 3.6, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
            <span className="whitespace-nowrap rounded border border-[#ffb703]/80 bg-[#0a1e3c]/85 px-1.5 py-0.5 font-display text-[8px] font-bold tracking-wider text-[#ffb703] uppercase shadow">
              J1 • LEADER
            </span>
          </Html>
        )}
      </group>

      {/* 5 Pesawat Wingman: Jupiter 2–4 (Main Body) & Jupiter 5–6 (Synchro) */}
      {wingmen.map((w, idx) => {
        const showBadge = !currentSpec || currentSpec.activeShips.includes(w.num);
        return (
          <group
            key={`jupiter-${w.num}`}
            ref={(el) => {
              wingRefs.current[idx] = el;
            }}
          >
            <primitive object={w.obj} />
            <mesh position={[0, 1.35, -13.5]} rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.48, 16.0, 12, 1, true]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.32} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
            {showBadge && (
              <Html position={[0, 3.6, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
                <span
                  className={`whitespace-nowrap rounded px-1.5 py-0.5 font-display text-[8px] font-bold tracking-wider uppercase shadow ${
                    w.num <= 4
                      ? 'border border-[#ffb703]/70 bg-[#0a1e3c]/80 text-[#ffb703]'
                      : 'border border-rose-400/80 bg-rose-950/85 text-rose-200'
                  }`}
                >
                  J{w.num} • {w.role}
                </span>
              </Html>
            )}
          </group>
        );
      })}

      {/* Formasi Hati Asap Putih 3D Raksasa (Heart Loop / Hearts) */}
      <group ref={heartSmokeRef} visible={false}>
        {heartPoints.map((pt, i) => (
          <mesh key={i} position={pt}>
            <icosahedronGeometry args={[0.92, 1]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.52} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
