import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useHangarStore } from '../../store/useHangarStore';

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
}

interface HouseData {
  x: number;
  z: number;
  w: number;
  h: number;
  d: number;
  wall: string;
  roof: string;
}

interface MountainData {
  x: number;
  z: number;
  r: number;
  h: number;
  snow: boolean;
  color: string;
}

interface IslandData {
  x: number;
  z: number;
  r: number;
  h: number;
}

const CHUNK_LEN = 220;
const LOOP_LEN = CHUNK_LEN * 3; // 3 zona dinamis: Runway/Kota -> Pegunungan -> Laut & Pulau!

/** Tekstur gradasi langit biru tropis cerah + horizon atmosferik untuk 3D Sky Dome. */
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

/** Tekstur fasad jendela kaca gedung bertingkat agar tampak seperti gedung perkotaan nyata. */
function makeTowerWindowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(0, 0, 128, 256);

  let seed = 3119;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // Grid lantai & jendela kaca biru-gelap + pantulan langit
  for (let row = 0; row < 16; row++) {
    const y = 6 + row * 15;
    // Garis beton antar lantai
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(0, y + 11, 128, 3);
    for (let col = 0; col < 6; col++) {
      const x = 6 + col * 20;
      const lit = rand() > 0.72;
      ctx.fillStyle = lit ? '#bae6fd' : rand() > 0.45 ? '#334e68' : '#1e3a5f';
      ctx.fillRect(x, y, 14, 9);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

/** Tekstur Aspal Runway 3D TNI AU lengkap: Threshold Piano Keys, Garis Start, Nomor "09", Aiming Point & Centerline. */
function makeRunwayAsphaltTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 2048;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#252930';
  ctx.fillRect(0, 0, 512, 2048);

  let seed = 9187;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < 9000; i++) {
    const x = rand() * 512;
    const y = rand() * 2048;
    const v = 30 + Math.floor(rand() * 26);
    ctx.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
    ctx.fillRect(x, y, 2 + rand() * 3, 2 + rand() * 4);
  }

  // Bekas karet ban di zona touchdown
  const skidGrad = ctx.createLinearGradient(0, 260, 0, 760);
  skidGrad.addColorStop(0, 'rgba(12,14,18,0)');
  skidGrad.addColorStop(0.4, 'rgba(10,12,16,0.55)');
  skidGrad.addColorStop(0.75, 'rgba(10,12,16,0.45)');
  skidGrad.addColorStop(1, 'rgba(12,14,18,0)');
  ctx.fillStyle = skidGrad;
  ctx.fillRect(150, 260, 82, 500);
  ctx.fillRect(280, 260, 82, 500);

  // Garis tepi putih tebal
  ctx.fillStyle = '#e8eef5';
  ctx.fillRect(24, 0, 12, 2048);
  ctx.fillRect(476, 0, 12, 2048);

  // Piano Keys (Threshold Stripes) di pangkal Take Off
  const keyPositions = [64, 108, 152, 196, 286, 330, 374, 418];
  for (const kx of keyPositions) {
    ctx.fillRect(kx, 22, 26, 86);
    ctx.fillRect(kx, 1940, 26, 86);
  }

  // Garis Titik Start Take Off kuning
  ctx.fillStyle = '#ffb703';
  ctx.fillRect(42, 118, 428, 12);

  // Nomor Landasan "09"
  ctx.save();
  ctx.fillStyle = '#f1f5f9';
  ctx.font = 'bold 110px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('09', 256, 200);
  ctx.restore();

  // Nomor "27" di ujung jauh
  ctx.save();
  ctx.translate(256, 1850);
  ctx.rotate(Math.PI);
  ctx.fillStyle = '#f1f5f9';
  ctx.font = 'bold 110px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('27', 0, 0);
  ctx.restore();

  // Aiming Point Blocks
  ctx.fillStyle = '#e8eef5';
  ctx.fillRect(92, 310, 62, 140);
  ctx.fillRect(358, 310, 62, 140);
  ctx.fillRect(92, 1580, 62, 140);
  ctx.fillRect(358, 1580, 62, 140);

  // Centerline putus-putus putih
  for (let y = 310; y <= 1710; y += 110) {
    ctx.fillRect(247, y, 18, 62);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

/** Tekstur lembut matahari bersinar untuk Sun Halo Sprite. */
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
 * Lingkungan 3D Dinamis saat Simulasi Penerbangan:
 * - Langit Biru 3D, Matahari, & Awan Cumulus 3D Bertingkat
 * - 3 Zona Bawah Bergantian Dinamis:
 *   1. Pangkalan Udara Runway 09 + Perumahan Beratap Genteng & Gedung Berjendela
 *   2. Pegunungan Hijau 3D & Lembah Sungai
 *   3. Laut Lepas Biru, Kepulauan Tropis, & Kapal Patroli
 */
export function SkyCloudsEnvironment() {
  const { scene } = useThree();
  const flightMode = useHangarStore((s) => s.flightMode);
  const flightNonce = useHangarStore((s) => s.flightNonce);
  const selectedId = useHangarStore((s) => s.selectedId);

  const isEquipment = selectedId === 'gsuit' || selectedId === 'pilot-helmet';
  const isOutdoorSim = !isEquipment && flightMode !== 'parked';

  const skyOpacity = useRef(0);
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
      scrollZ.current = 0; // Mulai tepat di Runway 09!
    } else if (flightMode === 'landing') {
      worldY.current = -12.5;
      scrollZ.current = 0; // Arahkan tepat kembali ke Runway 09 untuk pendekatan akhir!
    }
  }, [flightMode, flightNonce]);

  const skyTex = useMemo(() => makeBlueSkyTexture(), []);
  const runwayTex = useMemo(() => makeRunwayAsphaltTexture(), []);
  const towerTex = useMemo(() => makeTowerWindowTexture(), []);
  const sunHaloTex = useMemo(() => makeSunHaloTexture(), []);

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
      towerTex.dispose();
      sunHaloTex.dispose();
      cloudTopMat.dispose();
      cloudBottomMat.dispose();
    };
  }, [skyTex, runwayTex, towerTex, sunHaloTex, cloudTopMat, cloudBottomMat]);

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

  // Gedung perkantoran berjendela kaca (sisi kiri jauh)
  const towers = useMemo<TowerData[]>(() => {
    const list: TowerData[] = [];
    let seed = 5109;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const tints = ['#dbeafe', '#e2e8f0', '#cbd5e1', '#e0f2fe', '#f1f5f9'];
    for (let i = 0; i < 20; i++) {
      list.push({
        x: -66 - rand() * 44,
        z: -95 + rand() * 190,
        w: 4.5 + rand() * 3.8,
        d: 4.5 + rand() * 3.8,
        h: 9.0 + rand() * 12.0,
        tint: tints[Math.floor(rand() * tints.length)],
      });
    }
    return list;
  }, []);

  // Rumah-rumah penduduk beratap genteng miring (terakota/merah/biru) di sekitar pangkalan
  const houses = useMemo<HouseData[]>(() => {
    const list: HouseData[] = [];
    let seed = 8821;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const walls = ['#f8fafc', '#fef3c7', '#f1f5f9', '#ffedd5', '#e2e8f0'];
    const roofs = ['#b91c1c', '#c2410c', '#9a3412', '#1d4ed8', '#b45309'];
    for (let i = 0; i < 36; i++) {
      list.push({
        x: -24 - rand() * 36,
        z: -96 + rand() * 192,
        w: 3.0 + rand() * 2.2,
        d: 3.0 + rand() * 2.2,
        h: 2.0 + rand() * 1.4,
        wall: walls[Math.floor(rand() * walls.length)],
        roof: roofs[Math.floor(rand() * roofs.length)],
      });
    }
    return list;
  }, []);

  // Deretan Gunung 3D untuk Zona Pegunungan & Lembah Hijau
  const mountains = useMemo<MountainData[]>(() => {
    const list: MountainData[] = [];
    let seed = 6427;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const colors = ['#2d5a3c', '#366945', '#285236', '#3d7049', '#2f5f42'];
    for (let i = 0; i < 28; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * (22 + rand() * 92);
      const z = -98 + rand() * 196;
      const r = 12 + rand() * 18;
      const h = 11 + rand() * 20;
      list.push({
        x,
        z,
        r,
        h,
        snow: h > 23,
        color: colors[Math.floor(rand() * colors.length)],
      });
    }
    return list;
  }, []);

  // Kepulauan Tropis 3D untuk Zona Laut Lepas
  const islands = useMemo<IslandData[]>(() => {
    return [
      { x: -46, z: -48, r: 16, h: 6.5 },
      { x: 52, z: -18, r: 20, h: 8.5 },
      { x: -34, z: 54, r: 14, h: 5.5 },
      { x: 38, z: 68, r: 13, h: 4.8 },
    ];
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
      scene.fog.near = THREE.MathUtils.lerp(26, 80, mix);
      scene.fog.far = THREE.MathUtils.lerp(62, 280, mix);
    }

    if (skyMatRef.current) {
      skyMatRef.current.opacity = mix;
      skyMatRef.current.visible = mix > 0.01;
    }
    if (sunGroupRef.current) {
      sunGroupRef.current.visible = mix > 0.05;
    }

    cloudTopMat.opacity = mix * 0.92;
    cloudTopMat.visible = mix > 0.01;
    cloudBottomMat.opacity = mix * 0.86;
    cloudBottomMat.visible = mix > 0.01;

    // Ketinggian & kecepatan gulir dunia bawah tersinkronisasi penuh dengan Take Off & Long Landing!
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
        // Long Final Approach & Flare -> Runway naik halus mendekati roda pesawat!
        const p = Math.min(1, pt / 5.4);
        targetWorldY = THREE.MathUtils.lerp(-12.5, -0.02, p);
        groundSpeed = THREE.MathUtils.lerp(36, 24, p);
      } else if (pt < 9.2) {
        // Touchdown & pengereman panjang di aspal runway
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

      // Bungkus posisi 3 zona dinamis dalam jangkauan [-CHUNK_LEN, +2*CHUNK_LEN] agar selalu mulus tanpa celah!
      const wrapZ = (offset: number) => {
        let z = ((offset - scrollZ.current) % LOOP_LEN + LOOP_LEN) % LOOP_LEN;
        if (z > LOOP_LEN - CHUNK_LEN) z -= LOOP_LEN;
        return z;
      };

      // Zona 0 (Runway 09 + Perumahan/Kota): start di z = +92 (Threshold 09 tepat di bawah roda Take Off!)
      // Zona 1 (Pegunungan & Lembah Hijau): tepat di depan Zona 0
      // Zona 2 (Laut Lepas & Kepulauan Tropis): tepat di depan Zona 1
      if (runwayChunkRef.current) runwayChunkRef.current.position.z = wrapZ(92);
      if (mountainChunkRef.current) mountainChunkRef.current.position.z = wrapZ(92 + CHUNK_LEN);
      if (oceanChunkRef.current) oceanChunkRef.current.position.z = wrapZ(92 + CHUNK_LEN * 2);
    }

    // Gerakkan awan 3D
    if (mix > 0.01) {
      const cloudSpeedMult =
        flightMode === 'maneuver' ? 1.45 : flightMode === 'takeoff' ? 1.15 : flightMode === 'landing' ? 0.65 : 1.0;
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

      {/* 4. Dunia Bawah 3D Dinamis (3 Zona Bergantian: Runway/Perumahan -> Pegunungan -> Laut & Kepulauan) */}
      <group ref={worldGroupRef} visible={false} position={[0, -0.02, 0]} name="outdoor-world-3d">
        {/* === ZONA 1: PANGKALAN UDARA RUNWAY 09 + PERUMAHAN BERATAP GENTENG + GEDUNG BERJENDELA + PESISIR === */}
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

          {/* Daratan hijau pemukiman & kota di sisi kiri */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-76, -0.1, 0]}>
            <planeGeometry args={[112, CHUNK_LEN]} />
            <meshStandardMaterial color="#4b7550" roughness={0.95} />
          </mesh>
          {/* Jalan raya perumahan & kota */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-42, -0.05, 0]}>
            <planeGeometry args={[2.6, CHUNK_LEN]} />
            <meshStandardMaterial color="#2f3640" roughness={0.9} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-76, -0.05, 0]}>
            <planeGeometry args={[3.0, CHUNK_LEN]} />
            <meshStandardMaterial color="#2f3640" roughness={0.9} />
          </mesh>

          {/* Rumah-rumah penduduk 3D (Dinding + Atap Limas Genteng Merah/Terakota/Biru) */}
          {houses.map((h, idx) => (
            <group key={idx} position={[h.x, -0.1, h.z]}>
              <mesh position={[0, h.h / 2, 0]}>
                <boxGeometry args={[h.w, h.h, h.d]} />
                <meshStandardMaterial color={h.wall} roughness={0.85} />
              </mesh>
              <mesh position={[0, h.h + 0.85, 0]} rotation={[0, Math.PI / 4, 0]}>
                <coneGeometry args={[Math.max(h.w, h.d) * 0.78, 1.7, 4]} />
                <meshStandardMaterial color={h.roof} roughness={0.78} />
              </mesh>
            </group>
          ))}

          {/* Gedung-gedung bertingkat 3D bertekstur jendela kaca + rooftop */}
          {towers.map((tw, idx) => (
            <group key={idx} position={[tw.x, -0.1, tw.z]}>
              <mesh position={[0, tw.h / 2, 0]}>
                <boxGeometry args={[tw.w, tw.h, tw.d]} />
                <meshStandardMaterial map={towerTex} color={tw.tint} roughness={0.42} metalness={0.28} />
              </mesh>
              {/* Rooftop gelap & unit AC */}
              <mesh position={[0, tw.h + 0.12, 0]}>
                <boxGeometry args={[tw.w * 0.94, 0.24, tw.d * 0.94]} />
                <meshStandardMaterial color="#334155" roughness={0.8} />
              </mesh>
              <mesh position={[0, tw.h + 0.6, 0]}>
                <boxGeometry args={[tw.w * 0.35, 0.75, tw.d * 0.35]} />
                <meshStandardMaterial color="#64748b" roughness={0.7} />
              </mesh>
            </group>
          ))}

          {/* Pesisir pantai & laut biru di sisi kanan pangkalan */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[18.5, -0.09, 0]}>
            <planeGeometry args={[6.5, CHUNK_LEN]} />
            <meshStandardMaterial color="#d9c69e" roughness={0.95} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[22.2, -0.07, 0]}>
            <planeGeometry args={[1.6, CHUNK_LEN]} />
            <meshBasicMaterial color="#e0f4ff" transparent opacity={0.78} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[84, -0.11, 0]}>
            <planeGeometry args={[124, CHUNK_LEN]} />
            <meshStandardMaterial color="#1167a3" roughness={0.28} metalness={0.3} />
          </mesh>
        </group>

        {/* === ZONA 2: PEGUNUNGAN HIJAU 3D & LEMBAH SUNGAI === */}
        <group ref={mountainChunkRef} name="biome-mountains">
          {/* Lembah hijau pegunungan luas */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
            <planeGeometry args={[280, CHUNK_LEN]} />
            <meshStandardMaterial color="#386641" roughness={0.95} />
          </mesh>
          {/* Sungai biru jernih mengalir membelah lembah */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2, -0.04, 0]}>
            <planeGeometry args={[11, CHUNK_LEN]} />
            <meshStandardMaterial color="#1e88c9" roughness={0.25} metalness={0.35} />
          </mesh>
          {/* Deretan gunung 3D bertingkat dengan puncak salju/kabut lembut */}
          {mountains.map((m, idx) => (
            <group key={idx} position={[m.x, -0.1, m.z]}>
              <mesh position={[0, m.h / 2, 0]}>
                <coneGeometry args={[m.r, m.h, 7]} />
                <meshStandardMaterial color={m.color} roughness={0.92} flatShading />
              </mesh>
              {m.snow && (
                <mesh position={[0, m.h * 0.84, 0]}>
                  <coneGeometry args={[m.r * 0.34, m.h * 0.34, 7]} />
                  <meshStandardMaterial color="#eef6ff" roughness={0.85} flatShading />
                </mesh>
              )}
            </group>
          ))}
        </group>

        {/* === ZONA 3: LAUT LEPAS BIRU, KEPULAUAN TROPIS & KAPAL PATROLI === */}
        <group ref={oceanChunkRef} name="biome-ocean">
          {/* Hamparan samudra biru luas dari kiri ke kanan */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]}>
            <planeGeometry args={[280, CHUNK_LEN]} />
            <meshStandardMaterial color="#0d5c99" roughness={0.24} metalness={0.36} />
          </mesh>
          {/* Kepulauan tropis 3D (pasir pantai + bukit hijau) */}
          {islands.map((isl, idx) => (
            <group key={idx} position={[isl.x, -0.1, isl.z]}>
              {/* Buih ombak & pantai pasir */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
                <circleGeometry args={[isl.r * 1.15, 20]} />
                <meshBasicMaterial color="#7dd3fc" transparent opacity={0.45} />
              </mesh>
              <mesh position={[0, 0.3, 0]}>
                <cylinderGeometry args={[isl.r * 0.92, isl.r * 1.05, 0.6, 16]} />
                <meshStandardMaterial color="#e3d2a6" roughness={0.95} />
              </mesh>
              {/* Bukit hijau pulau */}
              <mesh position={[0, isl.h / 2 + 0.3, 0]}>
                <coneGeometry args={[isl.r * 0.72, isl.h, 9]} />
                <meshStandardMaterial color="#2f7a44" roughness={0.92} flatShading />
              </mesh>
            </group>
          ))}
          {/* Kapal patroli TNI AL / kargo 3D + jejak buih air */}
          {[
            { x: -12, z: -28 },
            { x: 24, z: 32 },
            { x: -58, z: 18 },
          ].map((ship, sIdx) => (
            <group key={sIdx} position={[ship.x, 0.35, ship.z]}>
              <mesh>
                <boxGeometry args={[2.0, 0.9, 6.8]} />
                <meshStandardMaterial color="#475569" roughness={0.55} />
              </mesh>
              <mesh position={[0, 0.85, -1.0]}>
                <boxGeometry args={[1.4, 0.95, 1.8]} />
                <meshStandardMaterial color="#f8fafc" roughness={0.45} />
              </mesh>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, -8.5]}>
                <planeGeometry args={[1.8, 11.5]} />
                <meshBasicMaterial color="#d8f2ff" transparent opacity={0.48} />
              </mesh>
            </group>
          ))}
        </group>
      </group>
    </group>
  );
}
