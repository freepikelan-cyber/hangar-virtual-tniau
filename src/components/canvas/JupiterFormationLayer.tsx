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
 * Menghitung posisi & sikap 3D relatif untuk 5 pesawat pendamping Jupiter Aerobatic Team:
 * - Index 0, 1, 2 -> Jupiter 2, 3, 4 (Main Body bersama Jupiter 1 Leader di [0,0,0])
 * - Index 3, 4    -> Jupiter 5, 6 (Elemen Synchro Pair)
 */
function computeWingmanPose(
  maneuver: Exclude<JupiterManeuverId, 'auto'>,
  idx: number, // 0=J2, 1=J3, 2=J4, 3=J5(Synchro1), 4=J6(Synchro2)
  p: number, // 0..1 progress dalam siklus 7 detik
  t: number,
): Pose {
  const sWave = Math.sin(p * Math.PI);
  const fullWave = Math.sin(p * Math.PI * 2);

  // Default Arrow Head (Anak Panah): J2 kanan, J3 kiri, J4 slot belakang, J5 kanan luar, J6 kiri luar
  const arrow: [number, number, number][] = [
    [3.8, -0.25, -3.2],
    [-3.8, -0.25, -3.2],
    [0, -0.55, -6.2],
    [7.2, -0.45, -6.4],
    [-7.2, -0.45, -6.4],
  ];

  let [x, y, z] = arrow[idx];
  let rx = 0;
  let ry = 0;
  let rz = 0;

  switch (maneuver) {
    case 'jupiterRoll': {
      // Semua 6 pesawat berguling 360° serentak dalam formasi anak panah rapat
      rz = -p * Math.PI * 2;
      break;
    }
    case 'jupiterRollBack': {
      // Setengah pertama guling kanan 360°, setengah kedua counter-roll kiri 360°
      rz = p < 0.5 ? -(p * 2) * Math.PI * 2 : ((p - 0.5) * 2) * Math.PI * 2;
      break;
    }
    case 'arrowHead': {
      // Formasi anak panah rapat menanjak vertikal loop
      y += sWave * 1.4;
      rx = -fullWave * 0.42;
      break;
    }
    case 'eagleToArrow': {
      // Awal lebar (Eagle) lalu merapat mulus menjadi Arrow Head!
      const eagle: [number, number, number][] = [
        [5.2, 0.3, -1.6],
        [-5.2, 0.3, -1.6],
        [0, -0.8, -4.4],
        [9.8, 0.7, -3.2],
        [-9.8, 0.7, -3.2],
      ];
      const blend = 0.5 - 0.5 * Math.cos(p * Math.PI * 2);
      x = THREE.MathUtils.lerp(eagle[idx][0], arrow[idx][0], blend);
      y = THREE.MathUtils.lerp(eagle[idx][1], arrow[idx][1], blend) + sWave * 1.1;
      z = THREE.MathUtils.lerp(eagle[idx][2], arrow[idx][2], blend);
      rx = -sWave * 0.35;
      break;
    }
    case 'heart': {
      // Synchro J5 (idx=3) & J6 (idx=4) melukis bentuk Hati (♥) raksasa di langit!
      if (idx === 3 || idx === 4) {
        const side = idx === 3 ? 1 : -1;
        const a = p * Math.PI; // 0 (puncak tengah) -> PI (ujung bawah hati)
        const hx = side * (16 * Math.pow(Math.sin(a), 3)) * 0.42;
        const hy = (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * 0.28 + 2.2;
        x = hx;
        y = hy;
        z = -1.5;
        rz = -side * Math.cos(a) * 0.75;
        rx = -Math.sin(a) * 0.32;
      } else {
        // Main Body J2-J4 terbang tinggi mengawal di atas
        const escort: [number, number, number][] = [
          [3.6, -0.2, -3.4],
          [-3.6, -0.2, -3.4],
          [0, -0.45, -6.4],
        ];
        [x, y, z] = escort[idx];
      }
      break;
    }
    case 'diamond': {
      // Main Body membentuk Wajik (Diamond) rapat, Synchro masuk dari Tango (kanan-kiri sejajar)
      const diam: [number, number, number][] = [
        [3.4, -0.2, -3.1],
        [-3.4, -0.2, -3.1],
        [0, -0.4, -6.2],
        [THREE.MathUtils.lerp(8.2, 6.2, sWave), -0.3, THREE.MathUtils.lerp(-2.5, -9.0, sWave)],
        [THREE.MathUtils.lerp(-8.2, -6.2, sWave), -0.3, THREE.MathUtils.lerp(-2.5, -9.0, sWave)],
      ];
      [x, y, z] = diam[idx];
      y += sWave * 1.3;
      rx = -fullWave * 0.38;
      break;
    }
    case 'delta': {
      // Segitiga Delta klasik (baris 1: J1, baris 2: J2-J3, baris 3: J5-J4-J6)
      const del: [number, number, number][] = [
        [3.5, -0.2, -3.2],
        [-3.5, -0.2, -3.2],
        [0, -0.4, -6.4],
        [7.0, -0.4, -6.4],
        [-7.0, -0.4, -6.4],
      ];
      [x, y, z] = del[idx];
      y += sWave * 1.5;
      rx = -fullWave * 0.45;
      break;
    }
    case 'cloverLeaf': {
      // 4 kelopak berputar 90° bergantian dengan cascade vertikal
      const phase = (p + idx * 0.08) % 1;
      const a = phase * Math.PI * 2;
      x += Math.sin(a) * 1.8;
      y += Math.cos(a) * 1.6;
      rz = -Math.sin(a) * 0.85;
      rx = -Math.cos(a) * 0.35;
      break;
    }
    case 'bombBurst': {
      // Puncak pertunjukan! 0..0.32 rapat menanjak, 0.32..1.0 MEMENCAR RADIAL ke 6 penjuru!
      const burst = Math.max(0, (p - 0.25) / 0.75);
      const bEase = burst * burst * (3 - 2 * burst);
      const dirs: [number, number, number][] = [
        [11.5, 2.5, -2.0],
        [-11.5, 2.5, -2.0],
        [0, -5.2, -9.5],
        [13.5, -3.5, -6.5],
        [-13.5, -3.5, -6.5],
      ];
      x = THREE.MathUtils.lerp(arrow[idx][0], dirs[idx][0], bEase);
      y = THREE.MathUtils.lerp(arrow[idx][1] + 1.2, dirs[idx][1], bEase);
      z = THREE.MathUtils.lerp(arrow[idx][2], dirs[idx][2], bEase);
      rz = (idx % 2 === 0 ? -1 : 1) * bEase * 1.35;
      rx = bEase * (dirs[idx][1] < 0 ? 0.45 : -0.35);
      ry = Math.atan2(dirs[idx][0], 10) * bEase;
      break;
    }
    case 'screwRoll': {
      // Main Body lurus stabil, Synchro J5 & J6 berputar spiral (Super Screw Roll) mengelilingi sumbu!
      if (idx === 3 || idx === 4) {
        const ang = p * Math.PI * 4 + (idx === 3 ? 0 : Math.PI);
        x = Math.cos(ang) * 5.8;
        y = Math.sin(ang) * 3.4;
        z = -3.8;
        rz = -ang * 1.5;
      } else {
        const mb: [number, number, number][] = [
          [3.2, -0.2, -3.0],
          [-3.2, -0.2, -3.0],
          [0, -0.35, -6.0],
        ];
        [x, y, z] = mb[idx];
      }
      break;
    }
    case 'garuda': {
      // Formasi Sayap Sang Garuda (sayap melengkung megah membentang ke atas-luar!)
      const garudaPos: [number, number, number][] = [
        [4.2, 0.55, -2.4],
        [-4.2, 0.55, -2.4],
        [0, -0.65, -5.8],
        [8.6, 1.45, -4.6],
        [-8.6, 1.45, -4.6],
      ];
      [x, y, z] = garudaPos[idx];
      y += sWave * 1.4;
      rx = -fullWave * 0.36;
      rz = (idx === 0 || idx === 3 ? -0.14 : idx === 1 || idx === 4 ? 0.14 : 0) * sWave;
      break;
    }
    case 'snakeLoop': {
      // Formasi memanjang beriringan meliuk gelombang S (Snake Loop)
      const trailZ = -(idx + 1) * 3.1;
      const wavePhase = t * 2.6 - idx * 0.72;
      x = Math.sin(wavePhase) * 3.8;
      y = Math.cos(wavePhase * 0.8) * 1.35;
      z = trailZ;
      rz = -Math.cos(wavePhase) * 0.65;
      rx = -Math.sin(wavePhase * 0.8) * 0.25;
      break;
    }
    case 'mirror': {
      // IKONIK! Jupiter 5 terbang normal, Jupiter 6 TERBALIK 180° (canopy-to-canopy / side-by-side)!
      if (idx === 3) {
        // Jupiter 5: Normal Upright di sisi kanan depan
        x = 3.6;
        y = 0.2;
        z = 0.4;
        rz = 0;
      } else if (idx === 4) {
        // Jupiter 6: TERBALIK 180° (Inverted Mirror!) tepat berdampingan di sisi kiri depan!
        x = -3.6;
        y = 0.45;
        z = 0.4;
        rz = Math.PI; // 180 derajat terbalik!
      } else {
        // Main Body J2-J4 mengawal di belakang
        const back: [number, number, number][] = [
          [4.2, -0.5, -5.2],
          [-4.2, -0.5, -5.2],
          [0, -0.8, -8.2],
        ];
        [x, y, z] = back[idx];
      }
      break;
    }
    case 'twinHalfCuban': {
      // Synchro J5 & J6 melakukan Twin Half Cuban & Stall Turn berlawanan arah
      if (idx === 3 || idx === 4) {
        const side = idx === 3 ? 1 : -1;
        x = side * (2.5 + Math.cos(p * Math.PI * 2) * 5.2);
        y = Math.sin(p * Math.PI * 2) * 3.2;
        z = -2.2;
        rx = -Math.cos(p * Math.PI * 2) * 0.75;
        rz = side * p * Math.PI * 2;
      }
      break;
    }
    case 'barrelRoll': {
      // 6 pesawat melakukan Barrel Roll spiral bersama
      const a = p * Math.PI * 2;
      x += Math.sin(a) * 1.2;
      y += (1 - Math.cos(a)) * 0.85;
      rz = -a;
      break;
    }
    case 'rollSlide': {
      // Gulingan diikuti pergeseran lateral menyilang posisi kiri <-> kanan
      const shift = Math.sin(p * Math.PI * 2);
      x = arrow[idx][0] * (1 - 0.55 * Math.abs(shift)) + shift * (idx % 2 === 0 ? -3.2 : 3.2);
      rz = -shift * 1.2;
      break;
    }
    case 'soloSpin': {
      // Jupiter 5 melakukan Solo Spin menukik berputar spiral tajam sementara lainnya mengorbit!
      if (idx === 3) {
        x = 0.2;
        y = 2.6 - p * 4.4;
        z = 2.2;
        rx = 0.92; // hidung menukik tajam
        ry = p * Math.PI * 8; // berputar spin cepat!
        rz = 0.55;
      } else {
        const orbit: [number, number, number][] = [
          [4.8, 0.4, -3.5],
          [-4.8, 0.4, -3.5],
          [0, 0.2, -6.8],
          [0, 0, 0],
          [-8.2, 0.8, -5.8],
        ];
        [x, y, z] = orbit[idx];
        rz = -0.35;
      }
      break;
    }
    case 'fiveCards': {
      // 5 Pesawat membentuk kipas kartu lebar (Five Cards) + 1 solo di bawah
      const cards: [number, number, number][] = [
        [3.4, 0.2, -1.6],
        [-3.4, 0.2, -1.6],
        [6.8, 0.55, -3.4],
        [-6.8, 0.55, -3.4],
        [0, -1.35, -5.5],
      ];
      [x, y, z] = cards[idx];
      y += sWave * 1.3;
      rx = -fullWave * 0.38;
      break;
    }
    case 'leaderBenefit': {
      // Jupiter 1 Leader maju menonjol di depan, J2–J6 membingkai simetris di belakang-samping
      const frame: [number, number, number][] = [
        [4.5, 0.5, -4.5],
        [-4.5, 0.5, -4.5],
        [0, -1.0, -7.2],
        [8.4, 1.2, -7.5],
        [-8.4, 1.2, -7.5],
      ];
      [x, y, z] = frame[idx];
      rz = (idx === 0 || idx === 3 ? -0.25 : idx === 1 || idx === 4 ? 0.25 : 0) * sWave;
      break;
    }
    case 'crossOverBreak': {
      // Pecah silang dramatis kiri <-> kanan dengan banking tajam!
      const cross = Math.sin(p * Math.PI);
      const isRight = idx === 0 || idx === 3;
      const isLeft = idx === 1 || idx === 4;
      if (isRight) {
        x = THREE.MathUtils.lerp(arrow[idx][0], -arrow[idx][0] * 1.25, cross);
        y += cross * 0.9;
        rz = 1.15 * cross;
        ry = -0.35 * cross;
      } else if (isLeft) {
        x = THREE.MathUtils.lerp(arrow[idx][0], -arrow[idx][0] * 1.25, cross);
        y -= cross * 0.4;
        rz = -1.15 * cross;
        ry = 0.35 * cross;
      } else {
        y += cross * 1.4;
      }
      break;
    }
    case 'bombers': {
      // Formasi Bombers melebar berjajar gagah dengan 6 garis asap sejajar
      const bombPos: [number, number, number][] = [
        [4.6, 0.0, -1.4],
        [-4.6, 0.0, -1.4],
        [9.2, 0.1, -2.8],
        [-9.2, 0.1, -2.8],
        [0, -0.35, -4.2],
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
 * Dilengkapi asap aerobatik putih di tiap pesawat + Hati Asap 3D saat Heart Loop!
 */
export function JupiterFormationLayer({ sourceGroup }: Props) {
  const selectedId = useHangarStore((s) => s.selectedId);
  const flightMode = useHangarStore((s) => s.flightMode);
  const jupiterManeuver = useHangarStore((s) => s.jupiterManeuver);
  const setFlightLabel = useHangarStore((s) => s.setFlightLabel);

  const wingRefs = useRef<(THREE.Group | null)[]>([]);
  const heartSmokeRef = useRef<THREE.Group>(null);
  const timer = useRef(0);

  const isActive = selectedId === 'kt1b' && flightMode === 'maneuver';

  // Clone 5 pesawat wingman (berbagi geometri & material GPU -> super ringan 60 FPS!)
  const wingmen = useMemo(() => {
    if (selectedId !== 'kt1b') return [];
    return [2, 3, 4, 5, 6].map((num) => {
      const clone = sourceGroup.clone(true);
      // Sembunyikan roda pendarat di udara
      const gear = clone.getObjectByName('landing-gear');
      if (gear) gear.visible = false;
      return { num, obj: clone, role: num <= 4 ? 'MAIN BODY' : 'SYNCHRO' };
    });
  }, [sourceGroup, selectedId]);

  // Geometri titik-titik Hati Asap Putih 3D untuk manuver Heart Loop / Hearts
  const heartPoints = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      const hx = (16 * Math.pow(Math.sin(a), 3)) * 0.42;
      const hy = (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * 0.28 + 2.2;
      pts.push([hx, hy, -2.0]);
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

    const cycleLen = 7.0;
    const activeId: Exclude<JupiterManeuverId, 'auto'> =
      jupiterManeuver === 'auto'
        ? JUPITER_AUTO_ORDER[Math.floor(timer.current / cycleLen) % JUPITER_AUTO_ORDER.length]
        : jupiterManeuver;
    const p = (timer.current % cycleLen) / cycleLen;

    const spec = getJupiterSpec(activeId);
    setFlightLabel(`JUPITER AEROBATIC TEAM (6-SHIP) • ${spec.name.toUpperCase()}`);

    wingRefs.current.forEach((grp, idx) => {
      if (!grp) return;
      const pose = computeWingmanPose(activeId, idx, p, t);
      grp.position.x = THREE.MathUtils.lerp(grp.position.x, pose.x, Math.min(1, dt * 6));
      grp.position.y = THREE.MathUtils.lerp(grp.position.y, pose.y, Math.min(1, dt * 6));
      grp.position.z = THREE.MathUtils.lerp(grp.position.z, pose.z, Math.min(1, dt * 6));
      grp.rotation.x = THREE.MathUtils.lerp(grp.rotation.x, pose.rx, Math.min(1, dt * 6));
      grp.rotation.y = THREE.MathUtils.lerp(grp.rotation.y, pose.ry, Math.min(1, dt * 6));
      grp.rotation.z = THREE.MathUtils.lerp(grp.rotation.z, pose.rz, Math.min(1, dt * 6));
    });

    if (heartSmokeRef.current) {
      heartSmokeRef.current.visible = activeId === 'heart';
      if (activeId === 'heart') {
        const s = 0.85 + Math.sin(t * 2) * 0.04;
        heartSmokeRef.current.scale.setScalar(s);
      }
    }
  });

  if (!isActive) return null;

  return (
    <group name="jupiter-6ship-formation">
      {/* Jejak Asap Putih Aerobatik untuk Jupiter 1 (Leader) */}
      <mesh position={[0, 1.35, -7.8]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.72, 11.5, 12, 1, true]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.38} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      {/* 5 Pesawat Wingman: Jupiter 2–4 (Main Body) & Jupiter 5–6 (Synchro) */}
      {wingmen.map((w, idx) => (
        <group
          key={`jupiter-${w.num}`}
          ref={(el) => {
            wingRefs.current[idx] = el;
          }}
        >
          <primitive object={w.obj} />
          {/* Jejak asap putih panjang khas Jupiter Aerobatic Team */}
          <mesh position={[0, 1.35, -7.8]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.68, 11.2, 12, 1, true]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.36} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
          <Html position={[0, 2.7, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
            <span
              className={`whitespace-nowrap rounded px-1.5 py-0.5 font-display text-[9px] font-bold tracking-wider uppercase shadow ${
                w.num <= 4
                  ? 'border border-[#ffb703]/70 bg-[#0a1e3c]/85 text-[#ffb703]'
                  : 'border border-rose-400/80 bg-rose-950/85 text-rose-200'
              }`}
            >
              J{w.num} • {w.role}
            </span>
          </Html>
        </group>
      ))}

      {/* Formasi Hati Asap Putih 3D (Heart Loop / Hearts) */}
      <group ref={heartSmokeRef} visible={false}>
        {heartPoints.map((pt, i) => (
          <mesh key={i} position={pt}>
            <icosahedronGeometry args={[0.58, 1]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.55} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
