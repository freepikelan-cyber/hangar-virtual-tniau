import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useHangarStore } from '../../store/useHangarStore';
import {
  buildMountainRangeGeometry,
  buildOrganicIslandGeometry,
  makeHouseWallTexture,
  makeOceanTextures,
  makeRoofTileTexture,
  makeRunwayAsphaltTexture,
  makeSkyscraperGlassTexture,
} from '../../utils/terrainTextures';

interface CloudPuff {
  ox: number;
  oy: number;
  oz: number;
  sx: number;
  sy: number;
  sz: number;
  isTop: boolean;
}

interface CloudData {
  x: number;
  y: number;
  z: number;
  scale: number;
  speed: number;
  puffs: CloudPuff[];
}

interface TowerData {
  x: number;
  z: number;
  w: number;
  h: number;
  d: number;
  tint: string;
  tiered: boolean;
}

interface HouseData {
  x: number;
  z: number;
  w: number;
  h: number;
  d: number;
  wallTint: string;
  roofTint: string;
  rotY: number;
}

const CHUNK_LEN = 220;
const LOOP_LEN = CHUNK_LEN * 3; // 3 zona dinamis: Runway/Kota -> Pegunungan -> Laut & Kepulauan

function makeBlueSkyTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#0f4c9c');
  grad.addColorStop(0.28, '#267ae8');
  grad.addColorStop(0.47, '#75c4ff');
  grad.addColorStop(0.55, '#d6efff');
  grad.addColorStop(0.62, '#8bc5f0');
  grad.addColorStop(1.0, '#1e538e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 512);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function makeSunHaloTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,252,230,1)');
  grad.addColorStop(0.25, 'rgba(255,244,200,0.65)');
  grad.addColorStop(0.6, 'rgba(255,232,170,0.18)');
  grad.addColorStop(1, 'rgba(255,232,170,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Lingkungan 3D Realistis & Dinamis saat Simulasi Penerbangan:
 * - Langit Biru 3D, Matahari, & Awan Cumulus 3D Bertingkat
 * - 3 Zona Bawah Bergantian Dinamis:
 *   1. Pangkalan Udara Runway 09 + Perumahan Berjendela/Genteng & Gedung Kaca Bertingkat
 *   2. Pegunungan Heightmap 3D Realistis + Lembah Sungai & Hutan
 *   3. Laut Berombak Realistis (Animated Bump Waves) + Pulau Tropis Organik + Kapal Patroli KRI
 */
export function SkyCloudsEnvironment() {
  const { scene } = useThree();
  const flightMode = useHangarStore((s) => s.flightMode);
  const flightNonce = useHangarStore((s) => s.flightNonce);
  const selectedId = useHangarStore((s) => s.selectedId);

  const isEquipment = selectedId === 'gsuit' || selectedId === 'pilot-helmet';
  const isOutdoorSim = !isEquipment && flightMode !== 'parked';

  const skyOpacity = useRef(0);
  const cloudOpacity = useRef(0);
  const phaseTime = useRef(0);
  const worldY = useRef(-0.02);
  const scrollZ = useRef(0);

  const skyMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const sunGroupRef = useRef<THREE.Group>(null);
  const worldGroupRef = useRef<THREE.Group>(null);
  const runwayChunkRef = useRef<THREE.Group>(null);
  const mountainChunkRef = useRef<THREE.Group>(null);
  const oceanChunkRef = useRef<THREE.Group>(null);
  const cloudGroupRefs = useRef<(THREE.Group | null)[]>([]);

  useEffect(() => {
    phaseTime.current = 0;
    if (flightMode === 'takeoff') {
      worldY.current = -0.02;
      scrollZ.current = 0;
    } else if (flightMode === 'landing') {
      worldY.current = -12.5;
      scrollZ.current = 0;
    }
  }, [flightMode, flightNonce]);

  const skyTex = useMemo(() => makeBlueSkyTexture(), []);
  const runwayTex = useMemo(() => makeRunwayAsphaltTexture(), []);
  const skyscraperTex = useMemo(() => makeSkyscraperGlassTexture(), []);
  const houseWallTex = useMemo(() => makeHouseWallTexture(), []);
  const roofTileTex = useMemo(() => makeRoofTileTexture(), []);
  const oceanTextures = useMemo(() => makeOceanTextures(), []);
  const sunHaloTex = useMemo(() => makeSunHaloTexture(), []);

  // Geometri Pegunungan 3D Heightmap + 4 Pulau Tropis Organik
  const mountainGeo = useMemo(() => buildMountainRangeGeometry(280, CHUNK_LEN), []);
  const islandGeos = useMemo(
    () => [
      { geo: buildOrganicIslandGeometry(20, 7.5, 1.3), x: -52, z: -48 },
      { geo: buildOrganicIslandGeometry(24, 9.2, 4.7), x: 56, z: -12 },
      { geo: buildOrganicIslandGeometry(17, 6.2, 8.1), x: -38, z: 58 },
      { geo: buildOrganicIslandGeometry(16, 5.4, 12.4), x: 42, z: 72 },
    ],
    [],
  );

  const cloudTopMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        emissive: '#fff6e8',
        emissiveIntensity: 0.34,
        roughness: 0.96,
        metalness: 0,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    [],
  );

  const cloudBottomMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#c7ddf4',
        emissive: '#8fb8e4',
        emissiveIntensity: 0.22,
        roughness: 0.98,
        metalness: 0,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    [],
  );

  useEffect(() => {
    return () => {
      skyTex.dispose();
      runwayTex.dispose();
      skyscraperTex.dispose();
      houseWallTex.dispose();
      roofTileTex.dispose();
      oceanTextures.map.dispose();
      oceanTextures.bumpMap.dispose();
      sunHaloTex.dispose();
      mountainGeo.dispose();
      islandGeos.forEach((ig) => ig.geo.dispose());
      cloudTopMat.dispose();
      cloudBottomMat.dispose();
    };
  }, [
    skyTex,
    runwayTex,
    skyscraperTex,
    houseWallTex,
    roofTileTex,
    oceanTextures,
    sunHaloTex,
    mountainGeo,
    islandGeos,
    cloudTopMat,
    cloudBottomMat,
  ]);

  const hangarBg = useMemo(() => new THREE.Color('#0a1e3c'), []);
  const skyBg = useMemo(() => new THREE.Color('#53aef5'), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  // 26 gugusan Awan 3D Cumulus bertingkat
  const clouds = useMemo<CloudData[]>(() => {
    const list: CloudData[] = [];
    let seed = 4201;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 26; i++) {
      const layer = i % 3;
      let x = (rand() - 0.5) * 140;
      if (Math.abs(x) < 14) x = x >= 0 ? 15 + rand() * 28 : -(15 + rand() * 28);
      const y = layer === 0 ? 10 + rand() * 14 : layer === 1 ? -1 + rand() * 10 : -10 + rand() * 6;
      const z = -110 + rand() * 220;
      const scale = layer === 2 ? 1.8 + rand() * 2.2 : 1.4 + rand() * 2.0;
      const speed = 13 + rand() * 11;
      const puffs: CloudPuff[] = [
        { ox: -1.7, oy: -0.35, oz: 0.1, sx: 2.0, sy: 0.72, sz: 1.55, isTop: false },
        { ox: 0.0, oy: -0.4, oz: 0.0, sx: 2.5, sy: 0.78, sz: 1.75, isTop: false },
        { ox: 1.75, oy: -0.35, oz: -0.1, sx: 1.9, sy: 0.7, sz: 1.5, isTop: false },
        { ox: -1.15, oy: 0.35, oz: 0.25, sx: 1.45, sy: 1.15, sz: 1.3, isTop: true },
        { ox: -0.1, oy: 0.82, oz: 0.05, sx: 1.75, sy: 1.45, sz: 1.45, isTop: true },
        { ox: 1.05, oy: 0.42, oz: -0.2, sx: 1.4, sy: 1.18, sz: 1.25, isTop: true },
        { ox: 0.35, oy: 0.25, oz: 0.85, sx: 1.35, sy: 0.95, sz: 1.15, isTop: true },
        { ox: -0.55, oy: 0.2, oz: -0.75, sx: 1.3, sy: 0.95, sz: 1.15, isTop: true },
      ];
      list.push({ x, y, z, scale, speed, puffs });
    }
    return list;
  }, []);

  // Gedung pencakar langit kaca bertingkat (tier podium + menara utama + mahkota atap)
  const towers = useMemo<TowerData[]>(() => {
    const list: TowerData[] = [];
    let seed = 5109;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const tints = ['#ffffff', '#e0f2fe', '#e2e8f0', '#dbeafe', '#f1f5f9'];
    for (let i = 0; i < 18; i++) {
      list.push({
        x: -68 - rand() * 44,
        z: -92 + rand() * 184,
        w: 4.8 + rand() * 3.8,
        d: 4.8 + rand() * 3.8,
        h: 10.5 + rand() * 13.5,
        tint: tints[Math.floor(rand() * tints.length)],
        tiered: rand() > 0.35,
      });
    }
    return list;
  }, []);

  // Perumahan penduduk nyata (dinding berjendela & berpintu + atap genteng menjorok keluar)
  const houses = useMemo<HouseData[]>(() => {
    const list: HouseData[] = [];
    let seed = 8821;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const walls = ['#ffffff', '#fef9e7', '#f4f4f5', '#fff7ed'];
    const roofs = ['#ffffff', '#d97757', '#b84a32', '#64748b'];
    for (let i = 0; i < 34; i++) {
      list.push({
        x: -24 - rand() * 36,
        z: -94 + rand() * 188,
        w: 3.4 + rand() * 1.8,
        d: 3.2 + rand() * 1.6,
        h: 2.2 + rand() * 1.0,
        wallTint: walls[Math.floor(rand() * walls.length)],
        roofTint: roofs[Math.floor(rand() * roofs.length)],
        rotY: Math.floor(rand() * 4) * (Math.PI / 2),
      });
    }
    return list;
  }, []);

  // Pepohonan rindang di pemukiman & lembah
  const trees = useMemo(() => {
    const list: { x: number; z: number; s: number }[] = [];
    let seed = 2049;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 42; i++) {
      list.push({
        x: -21 - rand() * 42,
        z: -98 + rand() * 196,
        s: 0.75 + rand() * 0.65,
      });
    }
    return list;
  }, []);

  const runwayLightZ = useMemo(() => {
    const arr: number[] = [];
    for (let z = -98; z <= 98; z += 14) arr.push(z);
    return arr;
  }, []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    phaseTime.current += dt;
    const pt = phaseTime.current;

    const targetMix = isOutdoorSim ? 1 : 0;
    skyOpacity.current = THREE.MathUtils.lerp(skyOpacity.current, targetMix, Math.min(1, dt * 3.2));
    const mix = skyOpacity.current;

    tmpColor.copy(hangarBg).lerp(skyBg, mix);
    if (scene.background instanceof THREE.Color) {
      scene.background.copy(tmpColor);
    }
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.copy(tmpColor);
      scene.fog.near = THREE.MathUtils.lerp(26, 82, mix);
      scene.fog.far = THREE.MathUtils.lerp(62, 290, mix);
    }

    if (skyMatRef.current) {
      skyMatRef.current.opacity = mix;
      skyMatRef.current.visible = mix > 0.01;
    }
    if (sunGroupRef.current) {
      sunGroupRef.current.visible = mix > 0.05;
    }

    // Awan 3D HANYA muncul saat pesawat sudah terbang tinggi (airborne / maneuver), TIDAK saat Take Off & Landing di runway!
    const showClouds = isOutdoorSim && (flightMode === 'airborne' || flightMode === 'maneuver');
    cloudOpacity.current = THREE.MathUtils.lerp(cloudOpacity.current, showClouds ? 1 : 0, Math.min(1, dt * 2.2));
    const cMix = cloudOpacity.current;

    cloudTopMat.opacity = cMix * 0.92;
    cloudTopMat.visible = cMix > 0.01;
    cloudBottomMat.opacity = cMix * 0.86;
    cloudBottomMat.visible = cMix > 0.01;

    // Animasi riak ombak laut berkilau!
    if (isOutdoorSim) {
      oceanTextures.map.offset.y -= dt * 0.14;
      oceanTextures.map.offset.x += dt * 0.04;
      oceanTextures.bumpMap.offset.y -= dt * 0.14;
      oceanTextures.bumpMap.offset.x += dt * 0.04;
    }

    let targetWorldY = -0.02;
    let groundSpeed = 0;

    if (flightMode === 'takeoff') {
      if (pt < 1.8) {
        targetWorldY = -0.02;
        groundSpeed = 0;
      } else if (pt < 4.8) {
        const p = (pt - 1.8) / 3.0;
        targetWorldY = -0.02;
        groundSpeed = 44 * p * p;
      } else if (pt < 8.8) {
        const p = Math.min(1, (pt - 4.8) / 4.0);
        targetWorldY = THREE.MathUtils.lerp(-0.02, -19.5, p * p);
        groundSpeed = 48;
      } else {
        targetWorldY = -19.5;
        groundSpeed = 44;
      }
    } else if (flightMode === 'airborne') {
      targetWorldY = -19.5;
      groundSpeed = 46;
    } else if (flightMode === 'maneuver') {
      targetWorldY = -19.5;
      groundSpeed = 58;
    } else if (flightMode === 'landing') {
      if (pt < 5.4) {
        const p = Math.min(1, pt / 5.4);
        targetWorldY = THREE.MathUtils.lerp(-12.5, -0.02, p);
        groundSpeed = THREE.MathUtils.lerp(36, 24, p);
      } else if (pt < 9.2) {
        const p = Math.min(1, (pt - 5.4) / 3.8);
        targetWorldY = -0.02;
        groundSpeed = 24 * (1 - p);
      } else {
        targetWorldY = -0.02;
        groundSpeed = 0;
      }
    }

    worldY.current = THREE.MathUtils.lerp(worldY.current, targetWorldY, Math.min(1, dt * 3.6));

    if (worldGroupRef.current) {
      worldGroupRef.current.visible = isOutdoorSim;
      worldGroupRef.current.position.y = worldY.current;
    }

    if (isOutdoorSim) {
      scrollZ.current = (scrollZ.current + groundSpeed * dt) % LOOP_LEN;
      const wrapZ = (offset: number) => {
        let z = ((offset - scrollZ.current) % LOOP_LEN + LOOP_LEN) % LOOP_LEN;
        if (z > LOOP_LEN - CHUNK_LEN) z -= LOOP_LEN;
        return z;
      };
      if (runwayChunkRef.current) runwayChunkRef.current.position.z = wrapZ(92);
      if (mountainChunkRef.current) mountainChunkRef.current.position.z = wrapZ(92 + CHUNK_LEN);
      if (oceanChunkRef.current) oceanChunkRef.current.position.z = wrapZ(92 + CHUNK_LEN * 2);
    }

    if (cMix > 0.01) {
      const cloudSpeedMult = flightMode === 'maneuver' ? 1.45 : 1.0;
      clouds.forEach((c, idx) => {
        const grp = cloudGroupRefs.current[idx];
        if (!grp) return;
        grp.visible = true;
        grp.position.z -= c.speed * cloudSpeedMult * dt;
        if (grp.position.z < -120) {
          grp.position.z = 120;
        }
      });
    } else {
      cloudGroupRefs.current.forEach((grp) => {
        if (grp) grp.visible = false;
      });
    }
  });

  return (
    <group name="sky-clouds-env">
      {/* 1. Kubah Langit Biru 3D Cerah */}
      <mesh>
        <sphereGeometry args={[260, 32, 24]} />
        <meshBasicMaterial
          ref={skyMatRef}
          map={skyTex}
          side={THREE.BackSide}
          transparent
          opacity={0}
          depthWrite={false}
          fog={false}
        />
      </mesh>

      {/* 2. Matahari Hangat + Halo Atmosfer */}
      <group ref={sunGroupRef} position={[92, 80, 115]} visible={false}>
        <mesh>
          <sphereGeometry args={[7.5, 20, 20]} />
          <meshBasicMaterial color="#fff9df" fog={false} />
        </mesh>
        <sprite scale={[40, 40, 1]}>
          <spriteMaterial
            map={sunHaloTex}
            transparent
            opacity={0.75}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            fog={false}
          />
        </sprite>
      </group>

      {/* 3. Awan 3D Cumulus Bertingkat */}
      {clouds.map((c, idx) => (
        <group
          key={idx}
          ref={(el) => {
            cloudGroupRefs.current[idx] = el;
          }}
          position={[c.x, c.y, c.z]}
          scale={c.scale}
          visible={false}
        >
          {c.puffs.map((p, pIdx) => (
            <mesh
              key={pIdx}
              position={[p.ox, p.oy, p.oz]}
              scale={[p.sx, p.sy, p.sz]}
              material={p.isTop ? cloudTopMat : cloudBottomMat}
            >
              <icosahedronGeometry args={[1, 2]} />
            </mesh>
          ))}
        </group>
      ))}

      {/* 4. Dunia Bawah 3D Realistis & Dinamis (3 Zona Bergantian) */}
      <group ref={worldGroupRef} visible={false} position={[0, -0.02, 0]} name="outdoor-world-3d">
        {/* === ZONA 1: PANGKALAN UDARA RUNWAY 09 + PERUMAHAN REALISTIS + GEDUNG KACA BERTINGKAT + LAUT PESISIR === */}
        <group ref={runwayChunkRef} name="biome-runway-city">
          {/* Rumput pangkalan udara */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-4, -0.08, 0]} receiveShadow>
            <planeGeometry args={[42, CHUNK_LEN]} />
            <meshStandardMaterial color="#3c6e47" roughness={0.95} metalness={0} />
          </mesh>

          {/* Aspal Runway 3D lengkap */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
            <planeGeometry args={[11.2, CHUNK_LEN]} />
            <meshStandardMaterial map={runwayTex} roughness={0.86} metalness={0.05} />
          </mesh>

          {/* Bahu aspal & taxiway */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-6.4, -0.02, 0]}>
            <planeGeometry args={[1.6, CHUNK_LEN]} />
            <meshStandardMaterial color="#3a404a" roughness={0.92} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[6.4, -0.02, 0]}>
            <planeGeometry args={[1.6, CHUNK_LEN]} />
            <meshStandardMaterial color="#3a404a" roughness={0.92} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-13.5, -0.01, 0]}>
            <planeGeometry args={[3.4, CHUNK_LEN]} />
            <meshStandardMaterial color="#333942" roughness={0.9} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-13.5, 0.01, 0]}>
            <planeGeometry args={[0.22, CHUNK_LEN]} />
            <meshBasicMaterial color="#fbbf24" />
          </mesh>

          {/* Lampu tepi runway */}
          {runwayLightZ.map((lz, i) => (
            <group key={i} position={[0, 0.14, lz]}>
              <mesh position={[-5.9, 0, 0]}>
                <sphereGeometry args={[0.16, 8, 8]} />
                <meshBasicMaterial color={lz < -80 ? '#22c55e' : '#fde68a'} />
              </mesh>
              <mesh position={[5.9, 0, 0]}>
                <sphereGeometry args={[0.16, 8, 8]} />
                <meshBasicMaterial color={lz < -80 ? '#22c55e' : '#fde68a'} />
              </mesh>
            </group>
          ))}

          {/* Hanggar pangkalan & Menara ATC */}
          <group position={[-18.5, 0, -28]}>
            <mesh position={[0, 2.2, 0]}>
              <boxGeometry args={[7.5, 4.4, 14]} />
              <meshStandardMaterial color="#cbd5e1" roughness={0.75} metalness={0.2} />
            </mesh>
            <mesh position={[0, 4.45, 0]}>
              <boxGeometry args={[7.8, 0.35, 14.3]} />
              <meshStandardMaterial color="#1d4ed8" roughness={0.6} />
            </mesh>
          </group>
          <group position={[-17.8, 0, 12]}>
            <mesh position={[0, 4.5, 0]}>
              <boxGeometry args={[2.2, 9.0, 2.2]} />
              <meshStandardMaterial color="#e2e8f0" roughness={0.7} />
            </mesh>
            <mesh position={[0, 9.8, 0]}>
              <cylinderGeometry args={[2.1, 1.5, 1.8, 8]} />
              <meshStandardMaterial color="#1e3a5f" roughness={0.25} metalness={0.6} />
            </mesh>
            <mesh position={[0, 11.1, 0]}>
              <sphereGeometry args={[0.3, 8, 8]} />
              <meshBasicMaterial color="#ef4444" />
            </mesh>
          </group>

          {/* Daratan hijau pemukiman & jaringan jalan raya kota */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-78, -0.1, 0]}>
            <planeGeometry args={[116, CHUNK_LEN]} />
            <meshStandardMaterial color="#466e4a" roughness={0.95} />
          </mesh>
          {/* Jalan raya aspal bermarka */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-42, -0.05, 0]}>
            <planeGeometry args={[3.2, CHUNK_LEN]} />
            <meshStandardMaterial color="#2b313a" roughness={0.9} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-76, -0.05, 0]}>
            <planeGeometry args={[3.8, CHUNK_LEN]} />
            <meshStandardMaterial color="#2b313a" roughness={0.9} />
          </mesh>

          {/* Rumah-rumah penduduk realistis (Dinding berjendela/pintu + Atap Genteng Terakota menjorok keluar) */}
          {houses.map((h, idx) => (
            <group key={idx} position={[h.x, -0.1, h.z]} rotation={[0, h.rotY, 0]}>
              <mesh position={[0, h.h / 2, 0]}>
                <boxGeometry args={[h.w, h.h, h.d]} />
                <meshStandardMaterial map={houseWallTex} color={h.wallTint} roughness={0.85} />
              </mesh>
              {/* Lis atap / talang (overhang) + atap genteng bergelombang */}
              <mesh position={[0, h.h + 0.08, 0]}>
                <boxGeometry args={[h.w + 0.45, 0.16, h.d + 0.45]} />
                <meshStandardMaterial color="#e2e8f0" roughness={0.8} />
              </mesh>
              <mesh position={[0, h.h + 0.95, 0]} rotation={[0, Math.PI / 4, 0]}>
                <coneGeometry args={[Math.max(h.w, h.d) * 0.84, 1.65, 4]} />
                <meshStandardMaterial map={roofTileTex} color={h.roofTint} roughness={0.78} />
              </mesh>
            </group>
          ))}

          {/* Pepohonan rindang di pemukiman */}
          {trees.map((tr, idx) => (
            <group key={idx} position={[tr.x, -0.1, tr.z]} scale={tr.s}>
              <mesh position={[0, 0.65, 0]}>
                <cylinderGeometry args={[0.14, 0.2, 1.3, 6]} />
                <meshStandardMaterial color="#5c4033" roughness={0.95} />
              </mesh>
              <mesh position={[0, 1.65, 0]}>
                <icosahedronGeometry args={[0.95, 1]} />
                <meshStandardMaterial color="#2a6236" roughness={0.9} />
              </mesh>
            </group>
          ))}

          {/* Gedung Pencakar Langit Kaca Bertingkat (Podium + Menara Kaca + Mahkota Atap + Antena) */}
          {towers.map((tw, idx) => (
            <group key={idx} position={[tw.x, -0.1, tw.z]}>
              {/* Podium lantai dasar */}
              <mesh position={[0, 1.3, 0]}>
                <boxGeometry args={[tw.w * 1.15, 2.6, tw.d * 1.15]} />
                <meshStandardMaterial map={skyscraperTex} color="#cbd5e1" roughness={0.4} metalness={0.3} />
              </mesh>
              {/* Menara utama berkaca reflektif */}
              <mesh position={[0, tw.h / 2, 0]}>
                <boxGeometry args={[tw.w, tw.h, tw.d]} />
                <meshStandardMaterial map={skyscraperTex} color={tw.tint} roughness={0.28} metalness={0.48} />
              </mesh>
              {/* Bagian puncak bertingkat (stepped crown) */}
              {tw.tiered && (
                <mesh position={[0, tw.h + 1.4, 0]}>
                  <boxGeometry args={[tw.w * 0.72, 2.8, tw.d * 0.72]} />
                  <meshStandardMaterial map={skyscraperTex} color={tw.tint} roughness={0.25} metalness={0.5} />
                </mesh>
              )}
              {/* Rooftop & Antena */}
              <mesh position={[0, tw.tiered ? tw.h + 2.9 : tw.h + 0.14, 0]}>
                <boxGeometry args={[tw.w * 0.66, 0.28, tw.d * 0.66]} />
                <meshStandardMaterial color="#334155" roughness={0.8} />
              </mesh>
              <mesh position={[0, (tw.tiered ? tw.h + 3.0 : tw.h + 0.2) + 1.4, 0]}>
                <cylinderGeometry args={[0.06, 0.12, 2.8, 6]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.3} />
              </mesh>
            </group>
          ))}

          {/* Pesisir pantai & laut berombak di sisi kanan pangkalan */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[18.5, -0.09, 0]}>
            <planeGeometry args={[6.5, CHUNK_LEN]} />
            <meshStandardMaterial color="#dfd0a8" roughness={0.95} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[22.2, -0.07, 0]}>
            <planeGeometry args={[1.8, CHUNK_LEN]} />
            <meshBasicMaterial color="#e0f4ff" transparent opacity={0.78} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[84, -0.11, 0]}>
            <planeGeometry args={[124, CHUNK_LEN]} />
            <meshStandardMaterial
              map={oceanTextures.map}
              bumpMap={oceanTextures.bumpMap}
              bumpScale={0.42}
              roughness={0.18}
              metalness={0.44}
            />
          </mesh>
        </group>

        {/* === ZONA 2: PEGUNUNGAN HEIGHTMAP 3D REALISTIS & LEMBAH SUNGAI === */}
        <group ref={mountainChunkRef} name="biome-mountains">
          {/* Mesh Pegunungan Heightmap 3D dengan punggungan tajam, lereng hutan, tebing batu & puncak salju */}
          <mesh geometry={mountainGeo} receiveShadow>
            <meshStandardMaterial vertexColors roughness={0.92} metalness={0.04} />
          </mesh>
          {/* Permukaan sungai biru berkilau mengalir di dasar lembah */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
            <planeGeometry args={[48, CHUNK_LEN]} />
            <meshStandardMaterial
              map={oceanTextures.map}
              bumpMap={oceanTextures.bumpMap}
              bumpScale={0.25}
              color="#38bdf8"
              roughness={0.15}
              metalness={0.5}
            />
          </mesh>
        </group>

        {/* === ZONA 3: LAUT LEPAS BEROMBAK REALISTIS, PULAU TROPIS ORGANIK & KAPAL PATROLI KRI === */}
        <group ref={oceanChunkRef} name="biome-ocean">
          {/* Samudra luas dengan tekstur riak ombak animasi & pantulan matahari */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]}>
            <planeGeometry args={[280, CHUNK_LEN]} />
            <meshStandardMaterial
              map={oceanTextures.map}
              bumpMap={oceanTextures.bumpMap}
              bumpScale={0.48}
              roughness={0.16}
              metalness={0.46}
            />
          </mesh>

          {/* 4 Pulau Tropis Organik (heightmap pantai pasir + perbukitan hijau) */}
          {islandGeos.map((isl, idx) => (
            <mesh key={idx} geometry={isl.geo} position={[isl.x, -0.05, isl.z]}>
              <meshStandardMaterial vertexColors roughness={0.92} metalness={0.04} />
            </mesh>
          ))}

          {/* Kapal Patroli KRI / Fregat 3D lengkap dengan haluan lancip, anjungan, radar & jejak buih V-wake */}
          {[
            { x: -14, z: -26 },
            { x: 24, z: 34 },
            { x: -56, z: 16 },
          ].map((ship, sIdx) => (
            <group key={sIdx} position={[ship.x, 0.3, ship.z]}>
              {/* Lambung kapal abu-abu TNI AL */}
              <mesh>
                <boxGeometry args={[2.1, 0.9, 7.6]} />
                <meshStandardMaterial color="#64748b" roughness={0.5} metalness={0.3} />
              </mesh>
              {/* Haluan lancip */}
              <mesh position={[0, 0.05, 4.9]} rotation={[Math.PI / 2, 0, 0]}>
                <coneGeometry args={[1.1, 2.4, 4]} />
                <meshStandardMaterial color="#64748b" roughness={0.5} metalness={0.3} />
              </mesh>
              {/* Anjungan & tiang radar */}
              <mesh position={[0, 0.95, 0.6]}>
                <boxGeometry args={[1.5, 1.1, 2.4]} />
                <meshStandardMaterial color="#cbd5e1" roughness={0.45} />
              </mesh>
              <mesh position={[0, 2.1, 0.4]}>
                <cylinderGeometry args={[0.08, 0.14, 1.4, 6]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.5} />
              </mesh>
              {/* Jejak buih air V-wake di belakang kapal */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.32, -10.5]}>
                <planeGeometry args={[2.8, 14]} />
                <meshBasicMaterial color="#e0f6ff" transparent opacity={0.42} />
              </mesh>
            </group>
          ))}
        </group>
      </group>
    </group>
  );
}
