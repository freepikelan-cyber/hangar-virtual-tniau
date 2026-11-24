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

interface BuildingData {
  x: number;
  z: number;
  w: number;
  h: number;
  d: number;
  color: string;
}

const CHUNK_LEN = 220;

/** Tekstur gradasi langit biru tropis cerah + horizon atmosferik untuk 3D Sky Dome. */
function makeBlueSkyTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#0f4c9c'); // Zenith biru tua jernih
  grad.addColorStop(0.28, '#267ae8'); // Biru langit siang cerah
  grad.addColorStop(0.47, '#75c4ff'); // Biru cerah menuju horizon
  grad.addColorStop(0.55, '#d6efff'); // Kabut atmosfer horizon
  grad.addColorStop(0.62, '#8bc5f0'); // Pantulan laut/bumi
  grad.addColorStop(1.0, '#1e538e'); // Bawah jauh
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 512);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Tekstur Aspal Runway 3D TNI AU lengkap: Threshold Piano Keys, Nomor "09", Aiming Point, Centerline & Skid Marks. */
function makeRunwayAsphaltTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 2048;
  const ctx = c.getContext('2d')!;

  // 1. Aspal gelap bertekstur realistis
  ctx.fillStyle = '#252930';
  ctx.fillRect(0, 0, 512, 2048);

  // Noise butiran aspal halus
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

  // 2. Bekas karet ban (touchdown skid marks) di zona pendaratan
  const skidGrad = ctx.createLinearGradient(0, 1280, 0, 1780);
  skidGrad.addColorStop(0, 'rgba(12,14,18,0)');
  skidGrad.addColorStop(0.4, 'rgba(10,12,16,0.55)');
  skidGrad.addColorStop(0.75, 'rgba(10,12,16,0.45)');
  skidGrad.addColorStop(1, 'rgba(12,14,18,0)');
  ctx.fillStyle = skidGrad;
  ctx.fillRect(150, 1280, 82, 500);
  ctx.fillRect(280, 1280, 82, 500);

  // 3. Garis tepi putih tebal di kiri & kanan runway
  ctx.fillStyle = '#e8eef5';
  ctx.fillRect(24, 0, 12, 2048);
  ctx.fillRect(476, 0, 12, 2048);

  // 4. Piano Keys (Threshold Stripes) di pangkal Take Off (ujung -Z chunk -> tepat di belakang roda pesawat!)
  const keyPositions = [64, 108, 152, 196, 286, 330, 374, 418];
  for (const kx of keyPositions) {
    ctx.fillRect(kx, 22, 26, 86);
    ctx.fillRect(kx, 1940, 26, 86);
  }

  // 5. Garis Titik Start Take Off (Holding Bar kuning tepat di bawah posisi start pesawat z = -5.4)
  ctx.fillStyle = '#ffb703';
  ctx.fillRect(42, 118, 428, 12);

  // 6. Nomor Landasan "09" tepat di depan hidung pesawat saat Take Off
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

  // 7. Aiming Point Blocks (2 balok putih besar di kiri-kanan)
  ctx.fillStyle = '#e8eef5';
  ctx.fillRect(92, 310, 62, 140);
  ctx.fillRect(358, 310, 62, 140);
  ctx.fillRect(92, 1580, 62, 140);
  ctx.fillRect(358, 1580, 62, 140);

  // 8. Centerline putus-putus putih sepanjang landasan
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
 * Lingkungan 3D Lengkap saat Simulasi Penerbangan:
 * 1. Langit Biru 3D & Matahari Hangat
 * 2. Awan 3D Cumulus Bertingkat (bagian atas putih cerah tersinari matahari, bagian bawah teduh kebiruan)
 * 3. Aspal Runway 3D + Titik Take Off 09 + Lampu Runway menyala
 * 4. Pemandangan Bawah 3D: Perkotaan (Gedung Bertingkat), Pangkalan Udara (Runway & Menara ATC), & Laut Biru dengan Kapal!
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
  const chunk0Ref = useRef<THREE.Group>(null);
  const chunk1Ref = useRef<THREE.Group>(null);
  const cloudGroupRefs = useRef<(THREE.Group | null)[]>([]);

  useEffect(() => {
    phaseTime.current = 0;
    if (flightMode === 'takeoff') {
      worldY.current = -0.02;
      scrollZ.current = 0;
    } else if (flightMode === 'landing') {
      worldY.current = -11.5;
      scrollZ.current = 0;
    }
  }, [flightMode, flightNonce]);

  const skyTex = useMemo(() => makeBlueSkyTexture(), []);
  const runwayTex = useMemo(() => makeRunwayAsphaltTexture(), []);
  const sunHaloTex = useMemo(() => makeSunHaloTexture(), []);

  // Dua material awan 3D: puncak putih cerah terkena matahari + dasar awan biru-abu lembut (efek volumetrik 3D nyata!)
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
      sunHaloTex.dispose();
      cloudTopMat.dispose();
      cloudBottomMat.dispose();
    };
  }, [skyTex, runwayTex, sunHaloTex, cloudTopMat, cloudBottomMat]);

  const hangarBg = useMemo(() => new THREE.Color('#0a1e3c'), []);
  const skyBg = useMemo(() => new THREE.Color('#53aef5'), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  // 26 gugusan Awan 3D Cumulus bertingkat (dasar agak rata + kubah atas menggumpal lembut)
  const clouds = useMemo<CloudData[]>(() => {
    const list: CloudData[] = [];
    let seed = 4201;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let i = 0; i < 26; i++) {
      // Sebar di kiri, kanan, atas, dan bawah (hindari tepat di badan pesawat)
      const layer = i % 3; // 0 = samping tinggi, 1 = samping sejajar, 2 = bawah di atas kota/laut
      let x = (rand() - 0.5) * 140;
      if (Math.abs(x) < 14) x = x >= 0 ? 15 + rand() * 28 : -(15 + rand() * 28);
      const y = layer === 0 ? 10 + rand() * 14 : layer === 1 ? -1 + rand() * 10 : -10 + rand() * 6;
      const z = -110 + rand() * 220;
      const scale = layer === 2 ? 1.8 + rand() * 2.2 : 1.4 + rand() * 2.0;
      const speed = 13 + rand() * 11;

      // Bentuk cumulus: 3 gumpalan dasar pipih-lebar + 5 gumpalan puncak membulat tinggi
      const puffs: CloudPuff[] = [
        // Dasar awan (datar & teduh kebiruan)
        { ox: -1.7, oy: -0.35, oz: 0.1, sx: 2.0, sy: 0.72, sz: 1.55, isTop: false },
        { ox: 0.0, oy: -0.4, oz: 0.0, sx: 2.5, sy: 0.78, sz: 1.75, isTop: false },
        { ox: 1.75, oy: -0.35, oz: -0.1, sx: 1.9, sy: 0.7, sz: 1.5, isTop: false },
        // Puncak cumulus menggumpal (putih cerah tersinari matahari)
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

  // Data gedung perkotaan 3D (di sisi kiri runway, menghadap laut di sisi kanan)
  const buildings = useMemo<BuildingData[]>(() => {
    const list: BuildingData[] = [];
    let seed = 7331;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const palette = ['#cbd5e1', '#94a3b8', '#b8cde0', '#dbeafe', '#e2e8f0', '#7ca1c4', '#cbd8e6'];

    for (let i = 0; i < 68; i++) {
      const x = -22 - rand() * 88;
      const z = -CHUNK_LEN / 2 + 8 + rand() * (CHUNK_LEN - 16);
      const isTower = rand() > 0.68;
      const w = isTower ? 3.2 + rand() * 3.8 : 2.8 + rand() * 5.2;
      const d = isTower ? 3.2 + rand() * 3.8 : 2.8 + rand() * 5.2;
      const h = isTower ? 6.5 + rand() * 11.5 : 1.8 + rand() * 4.2;
      const color = palette[Math.floor(rand() * palette.length)];
      list.push({ x, z, w, h, d, color });
    }
    return list;
  }, []);

  // Titik lampu tepi runway (amber/putih)
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

    // Transisi warna latar belakang & kabut (Hanggar Biru TNI AU <-> Langit Biru Cerah)
    tmpColor.copy(hangarBg).lerp(skyBg, mix);
    if (scene.background instanceof THREE.Color) {
      scene.background.copy(tmpColor);
    }
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.copy(tmpColor);
      scene.fog.near = THREE.MathUtils.lerp(26, 75, mix);
      scene.fog.far = THREE.MathUtils.lerp(62, 260, mix);
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

    // Hitung ketinggian dunia bawah (Runway + Kota + Laut) & kecepatan gulirnya!
    let targetWorldY = -0.02;
    let groundSpeed = 0;

    if (flightMode === 'takeoff') {
      if (pt < 1.5) {
        // Diam di titik Start Runway 09
        targetWorldY = -0.02;
        groundSpeed = 0;
      } else if (pt < 3.8) {
        // Akselerasi melesat di aspal runway!
        const p = (pt - 1.5) / 2.3;
        targetWorldY = -0.02;
        groundSpeed = 42 * p * p;
      } else if (pt < 7.4) {
        // Liftoff & menanjak -> Runway & Kota menjauh turun ke bawah!
        const p = Math.min(1, (pt - 3.8) / 3.6);
        targetWorldY = THREE.MathUtils.lerp(-0.02, -18.5, p * p);
        groundSpeed = 44;
      } else {
        targetWorldY = -18.5;
        groundSpeed = 40;
      }
    } else if (flightMode === 'airborne') {
      targetWorldY = -18.5;
      groundSpeed = 38;
    } else if (flightMode === 'maneuver') {
      targetWorldY = -18.5;
      groundSpeed = 50;
    } else if (flightMode === 'landing') {
      if (pt < 4.1) {
        // Final Approach & Flare -> Runway naik mendekati roda pesawat!
        const p = Math.min(1, pt / 4.1);
        targetWorldY = THREE.MathUtils.lerp(-12, -0.02, p);
        groundSpeed = THREE.MathUtils.lerp(34, 24, p);
      } else if (pt < 7.0) {
        // Touchdown & pengereman di aspal runway
        const p = Math.min(1, (pt - 4.1) / 2.9);
        targetWorldY = -0.02;
        groundSpeed = 24 * (1 - p);
      } else {
        targetWorldY = -0.02;
        groundSpeed = 0;
      }
    }

    worldY.current = THREE.MathUtils.lerp(worldY.current, targetWorldY, Math.min(1, dt * 3.8));

    if (worldGroupRef.current) {
      worldGroupRef.current.visible = isOutdoorSim;
      worldGroupRef.current.position.y = worldY.current;
    }

    if (isOutdoorSim) {
      scrollZ.current = (scrollZ.current + groundSpeed * dt) % CHUNK_LEN;
      const z0 = 92 - scrollZ.current; // Threshold 09 tepat di bawah titik Take Off pesawat (-5.4)
      const z1 = z0 > 0 ? z0 - CHUNK_LEN : z0 + CHUNK_LEN;
      if (chunk0Ref.current) {
        chunk0Ref.current.position.z = z0;
      }
      if (chunk1Ref.current) {
        chunk1Ref.current.position.z = z1;
      }
    }

    // Gerakkan awan 3D melesat dari depan (+Z) ke belakang (-Z)
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

  // Render satu segmen (chunk) lanskap 3D lengkap: Aspal Runway + Perkotaan + Laut Biru
  const renderTerrainChunk = (chunkKey: string) => (
    <group name={chunkKey}>
      {/* 1. PANGKALAN UDARA & ASPAL RUNWAY 09 (TENGAH) */}
      {/* Hamparan rumput pangkalan udara */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-4, -0.08, 0]} receiveShadow>
        <planeGeometry args={[42, CHUNK_LEN]} />
        <meshStandardMaterial color="#3c6e47" roughness={0.95} metalness={0} />
      </mesh>

      {/* Aspal Runway 3D lengkap dengan marka 09, piano keys & garis tengah */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[11.2, CHUNK_LEN]} />
        <meshStandardMaterial map={runwayTex} roughness={0.86} metalness={0.05} />
      </mesh>

      {/* Bahu aspal runway (shoulder) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-6.4, -0.02, 0]}>
        <planeGeometry args={[1.6, CHUNK_LEN]} />
        <meshStandardMaterial color="#3a404a" roughness={0.92} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[6.4, -0.02, 0]}>
        <planeGeometry args={[1.6, CHUNK_LEN]} />
        <meshStandardMaterial color="#3a404a" roughness={0.92} />
      </mesh>

      {/* Taxiway paralel di sisi kiri runway */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-13.5, -0.01, 0]}>
        <planeGeometry args={[3.4, CHUNK_LEN]} />
        <meshStandardMaterial color="#333942" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-13.5, 0.01, 0]}>
        <planeGeometry args={[0.22, CHUNK_LEN]} />
        <meshBasicMaterial color="#fbbf24" />
      </mesh>

      {/* Lampu Tepi Runway (Edge Lights) + Lampu Threshold Hijau */}
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

      {/* Hanggar Pangkalan & Menara Kontrol ATC di sisi kiri landasan */}
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
      {/* Menara ATC */}
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

      {/* 2. PERKOTAAN 3D (SISI KIRI: X = -20 .. -120) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-72, -0.1, 0]}>
        <planeGeometry args={[102, CHUNK_LEN]} />
        <meshStandardMaterial color="#55616e" roughness={0.94} />
      </mesh>
      {/* Jalan raya kota utama */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-42, -0.05, 0]}>
        <planeGeometry args={[2.4, CHUNK_LEN]} />
        <meshStandardMaterial color="#2b313a" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-74, -0.05, 0]}>
        <planeGeometry args={[2.4, CHUNK_LEN]} />
        <meshStandardMaterial color="#2b313a" roughness={0.9} />
      </mesh>
      {/* Taman kota hijau */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-56, -0.04, 24]}>
        <planeGeometry args={[16, 28]} />
        <meshStandardMaterial color="#3b7a4a" roughness={0.95} />
      </mesh>
      {/* Deretan gedung & pencakar langit 3D */}
      {buildings.map((b, idx) => (
        <mesh key={idx} position={[b.x, b.h / 2 - 0.1, b.z]}>
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial color={b.color} roughness={0.55} metalness={0.22} />
        </mesh>
      ))}

      {/* 3. PESISIR PANTAI & LAUT BIRU 3D (SISI KANAN: X = +16 .. +150) */}
      {/* Garis pantai berpasir */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[18.5, -0.09, 0]}>
        <planeGeometry args={[6.5, CHUNK_LEN]} />
        <meshStandardMaterial color="#d9c69e" roughness={0.95} />
      </mesh>
      {/* Buih ombak putih di bibir pantai */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[22.2, -0.07, 0]}>
        <planeGeometry args={[1.6, CHUNK_LEN]} />
        <meshBasicMaterial color="#e0f4ff" transparent opacity={0.78} />
      </mesh>
      {/* Perairan laut dangkal biru toska */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[32, -0.1, 0]}>
        <planeGeometry args={[20, CHUNK_LEN]} />
        <meshStandardMaterial color="#1d8db8" roughness={0.32} metalness={0.25} />
      </mesh>
      {/* Laut lepas biru samudra luas */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[96, -0.12, 0]}>
        <planeGeometry args={[112, CHUNK_LEN]} />
        <meshStandardMaterial color="#0e5a94" roughness={0.28} metalness={0.32} />
      </mesh>
      {/* Kapal patroli / kargo kecil di laut + jejak buih air (wake) */}
      {[
        { x: 42, z: -36 },
        { x: 68, z: 42 },
      ].map((ship, sIdx) => (
        <group key={sIdx} position={[ship.x, 0.25, ship.z]}>
          <mesh>
            <boxGeometry args={[1.6, 0.7, 5.2]} />
            <meshStandardMaterial color="#475569" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.65, -0.9]}>
            <boxGeometry args={[1.2, 0.75, 1.4]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.5} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.22, -6.2]}>
            <planeGeometry args={[1.3, 8.5]} />
            <meshBasicMaterial color="#d8f2ff" transparent opacity={0.45} />
          </mesh>
        </group>
      ))}
    </group>
  );

  return (
    <group name="sky-clouds-env">
      {/* 1. Kubah Langit Biru 3D Cerah */}
      <mesh>
        <sphereGeometry args={[240, 32, 24]} />
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
      <group ref={sunGroupRef} position={[88, 76, 110]} visible={false}>
        <mesh>
          <sphereGeometry args={[7.5, 20, 20]} />
          <meshBasicMaterial color="#fff9df" fog={false} />
        </mesh>
        <sprite scale={[38, 38, 1]}>
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

      {/* 3. Awan 3D Cumulus Bertingkat (Dasar Teduh Kebiruan + Puncak Putih Cerah) */}
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

      {/* 4. Dunia Bawah 3D: Aspal Runway + Perkotaan + Laut Biru (2 Chunk Seamless Scrolling) */}
      <group ref={worldGroupRef} visible={false} position={[0, -0.02, 0]} name="outdoor-world-3d">
        <group ref={chunk0Ref} position={[0, 0, 0]}>
          {renderTerrainChunk('terrain-chunk-0')}
        </group>
        <group ref={chunk1Ref} position={[0, 0, CHUNK_LEN]}>
          {renderTerrainChunk('terrain-chunk-1')}
        </group>
      </group>
    </group>
  );
}
