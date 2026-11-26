import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  AirbaseGlbModels,
  CityGlbModels,
  MountSumbingGlbModels,
  OceanLoopGlb,
  OceanRocksGlbModels,
  SkyboxDayGlb,
} from './AirbaseGlbModels';
import { useHangarStore } from '../../store/useHangarStore';
import { getUnit } from '../../data/fleetData';
import { getLandingTiming, getTakeOffTiming } from '../../utils/aircraftAudio';
import {
  buildMountainRangeGeometry,
  buildOrganicIslandGeometry,
  makeAirbaseGrassTexture,
  makeCoastlineTexture,
  makeConcreteApronTexture,
  makeHangarMetalTexture,
  makeHouseWallTexture,
  makeMountainDetailTextures,
  makeOceanTextures,
  makePhotorealCloudTexture,
  makeRoofTileTexture,
  makeRunwayAsphaltTexture,
  makeSkyscraperGlassTexture,
  makeTaxiwaySignTexture,
  makeTniAuHangarSignTexture,
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

const CHUNK_LEN = 340;
const LOOP_LEN = CHUNK_LEN * 4; // 4 zona dinamis berputar penuh: Bandara -> Pegunungan -> Laut -> Kota Metropolitan!
const RUNWAY_OFFSET = 141.5;

function makeSkyTexture(mode: 'day' | 'sunset' | 'night'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  if (mode === 'sunset') {
    grad.addColorStop(0.0, '#161b48');
    grad.addColorStop(0.24, '#4c2b63');
    grad.addColorStop(0.42, '#c8553d');
    grad.addColorStop(0.52, '#ff9f43');
    grad.addColorStop(0.58, '#ffd27d');
    grad.addColorStop(0.7, '#7c3f4a');
    grad.addColorStop(1.0, '#1d1c38');
  } else if (mode === 'night') {
    grad.addColorStop(0.0, '#020612');
    grad.addColorStop(0.32, '#061129');
    grad.addColorStop(0.5, '#0e2245');
    grad.addColorStop(0.62, '#091730');
    grad.addColorStop(1.0, '#020612');
  } else {
    grad.addColorStop(0.0, '#0f4c9c');
    grad.addColorStop(0.28, '#267ae8');
    grad.addColorStop(0.47, '#75c4ff');
    grad.addColorStop(0.55, '#d6efff');
    grad.addColorStop(0.62, '#8bc5f0');
    grad.addColorStop(1.0, '#1e538e');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 512);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function makeHelipadTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  // Beton helipad gelap dengan tekstur halus
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 4;
  for (let i = 0; i <= 512; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }
  // Bingkai tepi kuning-hitam hazard
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 14;
  ctx.strokeRect(18, 18, 476, 476);
  // Lingkaran pendaratan kuning tebal
  ctx.beginPath();
  ctx.arc(256, 256, 178, 0, Math.PI * 2);
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 18;
  ctx.stroke();
  // Lingkaran dalam putih
  ctx.beginPath();
  ctx.arc(256, 256, 152, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = 4;
  ctx.stroke();
  // Huruf H raksasa di tengah
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(184, 156, 34, 200);
  ctx.fillRect(294, 156, 34, 200);
  ctx.fillRect(184, 238, 144, 34);
  // Stensil TNI AU
  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HELIPAD TNI AU', 256, 66);
  ctx.fillText('SKADRON UDARA 8', 256, 466);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
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
  const safetyMode = useHangarStore((s) => s.safetyMode);
  const safetyNonce = useHangarStore((s) => s.safetyNonce);
  const selectedId = useHangarStore((s) => s.selectedId);
  const timeOfDay = useHangarStore((s) => s.timeOfDay);

  const unit = getUnit(selectedId);
  const isEquipment = selectedId === 'gsuit' || selectedId === 'pilot-helmet';
  const isHeli = unit.category === 'Helikopter';
  const isEjectionSafety = unit.category === 'Tempur' || unit.category === 'Latih';
  const isOutdoorSim = !isEquipment && (flightMode !== 'parked' || safetyMode);

  const skyOpacity = useRef(0);
  const cloudOpacity = useRef(0);
  const phaseTime = useRef(0);
  const worldY = useRef(-0.02);
  const scrollZ = useRef(0);
  const currentSpeed = useRef(0);
  const chunkZ = useRef({
    runway: RUNWAY_OFFSET,
    mountain: RUNWAY_OFFSET + CHUNK_LEN,
    ocean: RUNWAY_OFFSET + CHUNK_LEN * 2,
    city: RUNWAY_OFFSET + CHUNK_LEN * 3,
  });
  const prevFlightMode = useRef<string>('parked');

  const skyMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const sunGroupRef = useRef<THREE.Group>(null);
  const worldGroupRef = useRef<THREE.Group>(null);
  const runwayChunkRef = useRef<THREE.Group>(null);
  const mountainChunkRef = useRef<THREE.Group>(null);
  const oceanChunkRef = useRef<THREE.Group>(null);
  const cityChunkRef = useRef<THREE.Group>(null);
  const cloudGroupRefs = useRef<(THREE.Group | null)[]>([]);

  useEffect(() => {
    phaseTime.current = 0;
    const prev = prevFlightMode.current;
    prevFlightMode.current = flightMode;

    if (safetyMode) {
      worldY.current = isEjectionSafety ? -19.5 : -6.5;
      scrollZ.current = isEjectionSafety ? 240 : RUNWAY_OFFSET + CHUNK_LEN * 2;
    } else if (flightMode === 'takeoff') {
      worldY.current = -0.02;
      scrollZ.current = 0;
      currentSpeed.current = 0;
      chunkZ.current = {
        runway: RUNWAY_OFFSET,
        mountain: RUNWAY_OFFSET + CHUNK_LEN,
        ocean: RUNWAY_OFFSET + CHUNK_LEN * 2,
        city: RUNWAY_OFFSET + CHUNK_LEN * 3,
      };
    } else if (flightMode === 'landing') {
      worldY.current = -12.5;
      scrollZ.current = 0;
    } else if (flightMode === 'mission') {
      worldY.current = isHeli ? -0.02 : -28.0;
      scrollZ.current = isHeli ? RUNWAY_OFFSET + CHUNK_LEN * 2 : 260;
      if (!isHeli && prev !== 'airborne' && prev !== 'takeoff') {
        chunkZ.current = { runway: -CHUNK_LEN * 2, mountain: 0, ocean: CHUNK_LEN, city: CHUNK_LEN * 2 };
      }
    } else if ((flightMode === 'airborne' || flightMode === 'maneuver' || flightMode === 'aar') && prev === 'parked') {
      // Langsung masuk udara dari parkir (misal AAR/Dogfight): melintasi Gunung -> Laut -> Kota (tanpa bandara)!
      chunkZ.current = { runway: -CHUNK_LEN * 2, mountain: 0, ocean: CHUNK_LEN, city: CHUNK_LEN * 2 };
    }
  }, [flightMode, flightNonce, safetyMode, safetyNonce, isEjectionSafety, isHeli]);

  const skyTextures = useMemo(
    () => ({
      day: makeSkyTexture('day'),
      sunset: makeSkyTexture('sunset'),
      night: makeSkyTexture('night'),
    }),
    [],
  );
  const starGeo = useMemo(() => {
    const count = 240;
    const positions = new Float32Array(count * 3);
    let seed = 9137;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < count; i++) {
      const theta = rand() * Math.PI * 2;
      const phi = rand() * (Math.PI * 0.48);
      const r = 235;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);
  const runwayTex = useMemo(() => makeRunwayAsphaltTexture(), []);
  const airbaseGrassTex = useMemo(() => makeAirbaseGrassTexture(), []);
  const concreteApronTex = useMemo(() => makeConcreteApronTexture(), []);
  const hangarMetalTex = useMemo(() => makeHangarMetalTexture(), []);
  const mountainDetailTex = useMemo(() => makeMountainDetailTextures(), []);
  const coastlineTex = useMemo(() => makeCoastlineTexture(), []);
  const photorealCloudTex = useMemo(() => makePhotorealCloudTexture(), []);
  const helipadTex = useMemo(() => makeHelipadTexture(), []);
  const skyscraperTex = useMemo(() => makeSkyscraperGlassTexture(), []);
  const tniAuSignTex = useMemo(() => makeTniAuHangarSignTexture(), []);
  const taxiSignTex = useMemo(() => makeTaxiwaySignTexture(), []);
  const houseWallTex = useMemo(() => makeHouseWallTexture(), []);
  const roofTileTex = useMemo(() => makeRoofTileTexture(), []);
  const oceanTextures = useMemo(() => makeOceanTextures(), []);
  const sunHaloTex = useMemo(() => makeSunHaloTexture(), []);
  const atcRadarRef = useRef<THREE.Group>(null);
  const fishRefs = useRef<(THREE.Group | null)[]>([]);
  const boatRefs = useRef<(THREE.Group | null)[]>([]);

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

  const cloudSpriteMat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: photorealCloudTex,
        color: '#ffffff',
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    [photorealCloudTex],
  );

  useEffect(() => {
    return () => {
      skyTextures.day.dispose();
      skyTextures.sunset.dispose();
      skyTextures.night.dispose();
      starGeo.dispose();
      runwayTex.dispose();
      airbaseGrassTex.dispose();
      concreteApronTex.dispose();
      hangarMetalTex.dispose();
      mountainDetailTex.map.dispose();
      mountainDetailTex.bumpMap.dispose();
      coastlineTex.dispose();
      photorealCloudTex.dispose();
      helipadTex.dispose();
      skyscraperTex.dispose();
      tniAuSignTex.dispose();
      taxiSignTex.dispose();
      houseWallTex.dispose();
      roofTileTex.dispose();
      oceanTextures.map.dispose();
      oceanTextures.bumpMap.dispose();
      sunHaloTex.dispose();
      mountainGeo.dispose();
      islandGeos.forEach((ig) => ig.geo.dispose());
      cloudTopMat.dispose();
      cloudBottomMat.dispose();
      cloudSpriteMat.dispose();
    };
  }, [
    skyTextures,
    starGeo,
    runwayTex,
    airbaseGrassTex,
    concreteApronTex,
    hangarMetalTex,
    mountainDetailTex,
    coastlineTex,
    photorealCloudTex,
    helipadTex,
    skyscraperTex,
    tniAuSignTex,
    taxiSignTex,
    houseWallTex,
    roofTileTex,
    oceanTextures,
    sunHaloTex,
    mountainGeo,
    islandGeos,
    cloudTopMat,
    cloudBottomMat,
    cloudSpriteMat,
  ]);

  const hangarBgDay = useMemo(() => new THREE.Color('#0a1e3c'), []);
  const hangarBgNight = useMemo(() => new THREE.Color('#050c1c'), []);
  const skyBgMap = useMemo(
    () => ({
      day: new THREE.Color('#53aef5'),
      sunset: new THREE.Color('#d97142'),
      night: new THREE.Color('#08152e'),
    }),
    [],
  );
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
        x: -88 - rand() * 44,
        z: -145 + rand() * 290,
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
    for (let i = 0; i < 42; i++) {
      list.push({
        x: -48 - rand() * 34,
        z: -148 + rand() * 296,
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
    for (let i = 0; i < 52; i++) {
      list.push({
        x: -46 - rand() * 38,
        z: -152 + rand() * 304,
        s: 0.75 + rand() * 0.65,
      });
    }
    return list;
  }, []);

  const runwayLightZ = useMemo(() => {
    const arr: number[] = [];
    for (let z = -160; z <= 160; z += 16) arr.push(z);
    return arr;
  }, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    phaseTime.current += dt;
    const pt = phaseTime.current;

    const targetMix = isOutdoorSim ? 1 : 0;
    skyOpacity.current = THREE.MathUtils.lerp(skyOpacity.current, targetMix, Math.min(1, dt * 3.2));
    const mix = skyOpacity.current;

    const hangarBg = timeOfDay === 'night' ? hangarBgNight : hangarBgDay;
    const skyBg = skyBgMap[timeOfDay];
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

    // Awan 3D muncul saat terbang tinggi (airborne / maneuver / aar / mission non-heli) atau Safety Tempur di udara!
    const showClouds =
      isOutdoorSim &&
      (flightMode === 'airborne' ||
        flightMode === 'maneuver' ||
        flightMode === 'aar' ||
        (flightMode === 'mission' && !isHeli) ||
        (safetyMode && isEjectionSafety));
    cloudOpacity.current = THREE.MathUtils.lerp(cloudOpacity.current, showClouds ? 1 : 0, Math.min(1, dt * 2.2));
    const cMix = cloudOpacity.current;

    cloudTopMat.color.set(timeOfDay === 'sunset' ? '#ffd4b0' : timeOfDay === 'night' ? '#2c4268' : '#ffffff');
    cloudTopMat.emissive.set(timeOfDay === 'sunset' ? '#ff9f66' : timeOfDay === 'night' ? '#13233f' : '#fff6e8');
    cloudBottomMat.color.set(timeOfDay === 'sunset' ? '#9e6274' : timeOfDay === 'night' ? '#16243d' : '#c7ddf4');
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

    if (safetyMode) {
      if (isEjectionSafety) {
        targetWorldY = -19.5;
        groundSpeed = pt < 5.8 ? 52 : 16;
      } else {
        // Safety Laut (Angkut/VIP Water Ditching & Helikopter Emergency Floats): terkunci di atas Laut 3D!
        scrollZ.current = RUNWAY_OFFSET + CHUNK_LEN * 2;
        groundSpeed = 0;
        const p = Math.min(1, pt / (isHeli ? 5.5 : 6.0));
        targetWorldY = THREE.MathUtils.lerp(-6.5, -0.02, p);
      }
    } else if (flightMode === 'takeoff') {
      const to = getTakeOffTiming(selectedId);
      const rollStart = to.rollStart;
      const rotStart = to.rotStart;
      const airborneStart = to.airborneStart;
      if (isHeli) {
        // Khusus Helikopter: Helipad DIAM DI TEMPAT selama naik vertikal & hover (pt < rotStart),
        // baru mulai bergerak maju perlahan saat fase transisi maju (rotStart .. airborneStart)!
        if (pt < rotStart) {
          targetWorldY = -0.02;
          groundSpeed = 0;
          scrollZ.current = 0;
        } else if (pt < airborneStart) {
          const p = Math.min(1, (pt - rotStart) / Math.max(0.5, airborneStart - rotStart));
          targetWorldY = THREE.MathUtils.lerp(-0.02, -26.5, p * p);
          groundSpeed = 46 * p * p;
        } else {
          targetWorldY = -26.5;
          groundSpeed = 46;
        }
      } else if (selectedId === 'kt1b') {
        // Khusus KT-1B (Jupiter Aerobatic Show): runway diam selama persiapan & check-in, lalu bergulir mulus saat semua 6 pesawat Take Off sama-sama!
        if (pt < rollStart) {
          targetWorldY = -0.02;
          groundSpeed = 0;
          scrollZ.current = 0;
        } else if (pt < rotStart) {
          const p = (pt - rollStart) / Math.max(0.5, rotStart - rollStart);
          targetWorldY = -0.02;
          groundSpeed = 52 * p * p;
        } else if (pt < airborneStart) {
          const p = Math.min(1, (pt - rotStart) / Math.max(0.5, airborneStart - rotStart));
          targetWorldY = THREE.MathUtils.lerp(-0.02, -18.0, p * p);
          groundSpeed = 52;
        } else {
          targetWorldY = -28.0;
          groundSpeed = 48;
        }
      } else if (pt < rollStart) {
        // Taxi keluar dari Hanggar -> Line-up di Runway -> Tunggu komunikasi radio Tower selesai!
        targetWorldY = -0.02;
        groundSpeed = 0;
        scrollZ.current = 0;
      } else if (pt < rotStart) {
        const p = (pt - rollStart) / Math.max(0.5, rotStart - rollStart);
        targetWorldY = -0.02;
        groundSpeed = 52 * p * p;
      } else if (pt < airborneStart) {
        const p = Math.min(1, (pt - rotStart) / Math.max(0.5, airborneStart - rotStart));
        // Menanjak bertahap mulus hingga -18m di akhir Take Off, lalu lanjut halus ke -28m saat Airborne (tanpa hentakan/berhenti!)
        targetWorldY = THREE.MathUtils.lerp(-0.02, -18.0, p * p);
        groundSpeed = 52;
      } else {
        targetWorldY = -28.0;
        groundSpeed = 48;
      }
    } else if (flightMode === 'airborne' || flightMode === 'aar') {
      targetWorldY = -28.0;
      groundSpeed = 48;
    } else if (flightMode === 'mission') {
      if (isHeli) {
        // SAR Hoist Helikopter: terkunci langsung di atas Zona Laut 3D!
        scrollZ.current = RUNWAY_OFFSET + CHUNK_LEN * 2;
        targetWorldY = -0.02;
        groundSpeed = 0;
      } else {
        targetWorldY = -28.0;
        groundSpeed = 48;
      }
    } else if (flightMode === 'maneuver') {
      targetWorldY = -29.5;
      groundSpeed = 58;
    } else if (flightMode === 'landing') {
      // Menyelaraskan Hanggar Landing (local z = +145) tepat di world z = +3.5 saat berhenti!
      const stopScroll = LOOP_LEN + 283.0;
      const ld = getLandingTiming(selectedId);
      if (isHeli) {
        // Selaraskan Helipad Selatan (local z = +145) tepat di world z = 0.0!
        const heliStopScroll = LOOP_LEN + 286.5;
        if (pt < 19.0) {
          // Hover menunggu seluruh suara persiapan landing Halim Tower selesai
          targetWorldY = -13.5;
          scrollZ.current = heliStopScroll - 160;
          groundSpeed = 0;
        } else if (pt < 25.0) {
          const p = Math.min(1, (pt - 19.0) / 6.0);
          targetWorldY = THREE.MathUtils.lerp(-13.5, -0.02, p);
          scrollZ.current = THREE.MathUtils.lerp(heliStopScroll - 160, heliStopScroll, 1 - (1 - p) * (1 - p));
          groundSpeed = 0;
        } else {
          targetWorldY = -0.02;
          scrollZ.current = heliStopScroll;
          groundSpeed = 0;
        }
      } else if (pt < ld.touchTime) {
        // Long Final Approach & Flare: mendekati awal Runway tepat hingga detik Touchdown!
        const p = Math.min(1, pt / Math.max(0.5, ld.touchTime));
        targetWorldY = THREE.MathUtils.lerp(-13.5, -0.02, p);
        scrollZ.current = stopScroll - 563.0 + 273.5 * p;
        groundSpeed = 0;
      } else if (pt < ld.rolloutEnd) {
        // Touchdown & High-Speed Runway Rollout
        const p = (pt - ld.touchTime) / Math.max(0.5, ld.rolloutEnd - ld.touchTime);
        targetWorldY = -0.02;
        scrollZ.current = stopScroll - 289.5 + 186.0 * (1.14 * p - 0.14 * p * p);
        groundSpeed = 0;
      } else if (pt < ld.brakeEnd) {
        // Pengereman panjang & halus di runway sampai berhenti total!
        const p = Math.min(1, (pt - ld.rolloutEnd) / Math.max(0.5, ld.brakeEnd - ld.rolloutEnd));
        const decel = 1 - (1 - p) * (1 - p);
        targetWorldY = -0.02;
        scrollZ.current = stopScroll - 103.5 + 103.5 * decel;
        groundSpeed = 0;
      } else {
        targetWorldY = -0.02;
        scrollZ.current = stopScroll;
        groundSpeed = 0;
      }
    }

    // Interpolasi ketinggian & kecepatan super mulus agar perpindahan Take Off -> Airborne tidak pernah terasa berhenti/patah!
    const yLerpRate = flightMode === 'airborne' ? 1.15 : 3.2;
    worldY.current = THREE.MathUtils.lerp(worldY.current, targetWorldY, Math.min(1, dt * yLerpRate));
    currentSpeed.current = THREE.MathUtils.lerp(currentSpeed.current, groundSpeed, Math.min(1, dt * 2.6));
    const smoothSpeed = flightMode === 'landing' ? groundSpeed : currentSpeed.current;

    if (worldGroupRef.current) {
      worldGroupRef.current.visible = isOutdoorSim;
      worldGroupRef.current.position.y = worldY.current;
    }

    if (isOutdoorSim) {
      if (flightMode === 'landing' || safetyMode || (flightMode === 'mission' && isHeli)) {
        scrollZ.current = (scrollZ.current + smoothSpeed * dt) % LOOP_LEN;
        const wrapZ = (offset: number) => {
          let z = ((offset - scrollZ.current) % LOOP_LEN + LOOP_LEN) % LOOP_LEN;
          if (z > LOOP_LEN - CHUNK_LEN) z -= LOOP_LEN;
          return z;
        };
        if (runwayChunkRef.current) {
          const rz = wrapZ(RUNWAY_OFFSET);
          runwayChunkRef.current.visible = flightMode === 'landing' && rz > -340 && rz < 420;
          runwayChunkRef.current.position.z = rz;
        }
        if (mountainChunkRef.current) {
          const mz = wrapZ(RUNWAY_OFFSET + CHUNK_LEN);
          mountainChunkRef.current.visible = mz > -340 && mz < 420;
          mountainChunkRef.current.position.z = mz;
        }
        if (oceanChunkRef.current) {
          const oz = wrapZ(RUNWAY_OFFSET + CHUNK_LEN * 2);
          oceanChunkRef.current.visible = oz > -340 && oz < 420;
          oceanChunkRef.current.position.z = oz;
        }
        if (cityChunkRef.current) {
          const ctz = wrapZ(RUNWAY_OFFSET + CHUNK_LEN * 3);
          cityChunkRef.current.visible = ctz > -340 && ctz < 420;
          cityChunkRef.current.position.z = ctz;
        }
      } else {
        // Bandara HANYA tampil saat Take Off & Landing! Setelah Take Off selesai, hanya 3 zona yang terus berputar:
        // Pegunungan (Gunung Sumbing) -> Laut (ocean-loop.glb & Karang) -> Perkotaan 3D -> Pegunungan!
        const cz = chunkZ.current;
        const step = smoothSpeed * dt;
        cz.runway -= step;
        cz.mountain -= step;
        cz.ocean -= step;
        cz.city -= step;

        const maxScenicZ = () => Math.max(cz.mountain, cz.ocean, cz.city);
        if (cz.mountain < -CHUNK_LEN * 0.95) cz.mountain = maxScenicZ() + CHUNK_LEN;
        if (cz.ocean < -CHUNK_LEN * 0.95) cz.ocean = maxScenicZ() + CHUNK_LEN;
        if (cz.city < -CHUNK_LEN * 0.95) cz.city = maxScenicZ() + CHUNK_LEN;

        // Smart Distance Culling: hanya render zona yang masuk jarak pandang (-340..+420) agar GPU super enteng 60 FPS!
        if (runwayChunkRef.current) {
          runwayChunkRef.current.visible = cz.runway > -CHUNK_LEN * 0.95 && cz.runway < 420;
          runwayChunkRef.current.position.z = cz.runway;
        }
        if (mountainChunkRef.current) {
          mountainChunkRef.current.visible = cz.mountain > -340 && cz.mountain < 420;
          mountainChunkRef.current.position.z = cz.mountain;
        }
        if (oceanChunkRef.current) {
          oceanChunkRef.current.visible = cz.ocean > -340 && cz.ocean < 420;
          oceanChunkRef.current.position.z = cz.ocean;
        }
        if (cityChunkRef.current) {
          cityChunkRef.current.visible = cz.city > -340 && cz.city < 420;
          cityChunkRef.current.position.z = cz.city;
        }
      }

      // Animasi perahu nelayan mengayun lembut & kawanan ikan/lumba-lumba melompat di atas laut!
      const et = state.clock.elapsedTime;
      boatRefs.current.forEach((b, i) => {
        if (!b) return;
        b.position.y = 0.08 + Math.sin(et * 1.8 + i * 1.4) * 0.14;
        b.rotation.z = Math.sin(et * 1.5 + i) * 0.08;
        b.rotation.x = Math.cos(et * 1.2 + i * 0.7) * 0.05;
      });
      fishRefs.current.forEach((f, i) => {
        if (!f) return;
        const cycle = (et * 0.85 + i * 0.37) % 2.4;
        if (cycle < 1.1) {
          const p = cycle / 1.1; // 0..1 busur lompatan di atas permukaan laut
          f.visible = true;
          f.position.y = -0.35 + Math.sin(p * Math.PI) * 2.15;
          f.position.z = (p - 0.5) * 5.2;
          f.rotation.x = -(0.5 - p) * 1.35;
        } else {
          f.visible = false;
        }
      });
    }

    if (atcRadarRef.current) {
      atcRadarRef.current.rotation.y += dt * 1.65;
    }

    if (cMix > 0.01) {
      cloudSpriteMat.opacity = Math.min(0.88, cMix * (timeOfDay === 'night' ? 0.35 : 0.88));
      cloudSpriteMat.color.set(timeOfDay === 'sunset' ? '#ffd9bc' : timeOfDay === 'night' ? '#3d5678' : '#ffffff');
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
      cloudSpriteMat.opacity = 0;
      cloudGroupRefs.current.forEach((grp) => {
        if (grp) grp.visible = false;
      });
    }
  });

  return (
    <group name="sky-clouds-env">
      {/* 1. Kubah Langit 360° (Siang: skybox_skydays_3.glb | Senja: Poly Haven HDRI | Malam: Kubah Bintang) */}
      {timeOfDay === 'day' && isOutdoorSim && (
        <Suspense fallback={null}>
          <SkyboxDayGlb />
        </Suspense>
      )}
      <mesh visible={timeOfDay === 'night'}>
        <sphereGeometry args={[260, 32, 24]} />
        <meshBasicMaterial
          ref={skyMatRef}
          map={skyTextures[timeOfDay]}
          side={THREE.BackSide}
          transparent
          opacity={0}
          depthWrite={false}
          fog={false}
        />
      </mesh>

      {/* Bintang-bintang malam untuk Mode Night Ops */}
      {timeOfDay === 'night' && isOutdoorSim && (
        <points geometry={starGeo}>
          <pointsMaterial color="#e0f2fe" size={1.45} sizeAttenuation={false} transparent opacity={0.85} fog={false} />
        </points>
      )}

      {/* 2. Matahari / Bulan + Halo Atmosfer */}
      <group
        ref={sunGroupRef}
        position={timeOfDay === 'sunset' ? [95, 28, 130] : [92, 80, 115]}
        visible={false}
      >
        <mesh>
          <sphereGeometry args={[timeOfDay === 'night' ? 5.6 : 7.5, 20, 20]} />
          <meshBasicMaterial
            color={timeOfDay === 'sunset' ? '#ff9d42' : timeOfDay === 'night' ? '#e2f1ff' : '#fff9df'}
            fog={false}
          />
        </mesh>
        <sprite scale={timeOfDay === 'night' ? [26, 26, 1] : [40, 40, 1]}>
          <spriteMaterial
            map={sunHaloTex}
            color={timeOfDay === 'sunset' ? '#ff8b3d' : timeOfDay === 'night' ? '#8cc8ff' : '#ffffff'}
            transparent
            opacity={timeOfDay === 'night' ? 0.45 : 0.75}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            fog={false}
          />
        </sprite>
      </group>

      {/* 3. Awan Cumulus Fotorealistis Berlapis */}
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
          <sprite position={[0, 0, 0]} scale={[7.2, 4.4, 1]} material={cloudSpriteMat} />
          <sprite position={[2.1, -0.35, 0.8]} scale={[5.4, 3.3, 1]} material={cloudSpriteMat} />
          <sprite position={[-2.0, -0.25, -0.7]} scale={[5.0, 3.1, 1]} material={cloudSpriteMat} />
        </group>
      ))}

      {/* 4. Dunia Bawah 3D Fotorealistis & Dinamis (3 Zona Bergantian) */}
      <group ref={worldGroupRef} visible={false} position={[0, -0.02, 0]} name="outdoor-world-3d">
        {/* === ZONA 1: PANGKALAN UDARA RUNWAY 09 + PERUMAHAN REALISTIS + GEDUNG KACA BERTINGKAT + LAUT PESISIR === */}
        <group ref={runwayChunkRef} name="biome-runway-city">
          {/* Rumput pangkalan udara luas bertekstur satelit nyata (mencakup Runway, Parallel Taxiway jauh, & Apron Hanggar) */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-48, -0.08, 0]} receiveShadow>
            <planeGeometry args={[132, CHUNK_LEN]} />
            <meshStandardMaterial map={airbaseGrassTex} roughness={0.94} metalness={0} />
          </mesh>

          {isHeli ? (
            /* === KHUSUS HELIKOPTER: HELIPAD SKADRON 8 (TAKE OFF z=-141.5) & HELIPAD SELATAN (LANDING z=+145.0) === */
            <>
              {[-141.5, 145.0].map((hz, hIdx) => (
                <group key={`helipad-${hIdx}`} position={[0, 0, hz]}>
                  {/* Beton alas Helipad persegi + marka huruf H raksasa */}
                  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
                    <planeGeometry args={[18, 18]} />
                    <meshStandardMaterial map={helipadTex} roughness={0.82} metalness={0.08} />
                  </mesh>
                  {/* 8 Lampu hijau tepi helipad (TLOF perimeter lights) */}
                  {[
                    [-8.6, -8.6],
                    [0, -8.6],
                    [8.6, -8.6],
                    [8.6, 0],
                    [8.6, 8.6],
                    [0, 8.6],
                    [-8.6, 8.6],
                    [-8.6, 0],
                  ].map(([lx, lz], lIdx) => (
                    <mesh key={lIdx} position={[lx, 0.16, lz]}>
                      <sphereGeometry args={[0.2, 8, 8]} />
                      <meshBasicMaterial color="#22c55e" />
                    </mesh>
                  ))}
                  {/* Tiang Windsock (Penunjuk Arah Angin Helipad) di sudut kanan depan */}
                  <group position={[11.2, 0, 8.5]}>
                    <mesh position={[0, 2.2, 0]}>
                      <cylinderGeometry args={[0.06, 0.08, 4.4, 8]} />
                      <meshStandardMaterial color="#e2e8f0" roughness={0.5} />
                    </mesh>
                    <mesh position={[0.75, 4.15, 0]} rotation={[0, 0, -Math.PI / 2 + 0.15]}>
                      <coneGeometry args={[0.32, 1.5, 10, 1, true]} />
                      <meshStandardMaterial color="#f97316" side={THREE.DoubleSide} roughness={0.7} />
                    </mesh>
                  </group>
                  {/* Taxiway penghubung panjang dari Hanggar Helikopter (x = -48) ke Helipad H (x = 0) */}
                  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-26.5, 0.01, 0]} receiveShadow>
                    <planeGeometry args={[37, 10]} />
                    <meshStandardMaterial map={concreteApronTex} roughness={0.86} />
                  </mesh>
                  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-26.5, 0.025, 0]}>
                    <planeGeometry args={[35, 0.32]} />
                    <meshBasicMaterial color="#fbbf24" />
                  </mesh>
                  {/* Hanggar Khusus Skadron Helikopter TNI AU di sisi kiri jauh dari Helipad (x = -48) */}
                  <group position={[-48.0, 0, 0]}>
                    <mesh position={[-4.5, 3.2, 0]}>
                      <boxGeometry args={[0.5, 6.4, 13.4]} />
                      <meshStandardMaterial map={hangarMetalTex} color="#33517a" roughness={0.62} metalness={0.35} />
                    </mesh>
                    <mesh position={[0, 3.2, -6.5]}>
                      <boxGeometry args={[9.4, 6.4, 0.45]} />
                      <meshStandardMaterial map={hangarMetalTex} roughness={0.68} metalness={0.28} />
                    </mesh>
                    <mesh position={[0, 3.2, 6.5]}>
                      <boxGeometry args={[9.4, 6.4, 0.45]} />
                      <meshStandardMaterial map={hangarMetalTex} roughness={0.68} metalness={0.28} />
                    </mesh>
                    <mesh position={[0, 6.65, 0]}>
                      <boxGeometry args={[10.0, 0.65, 14.0]} />
                      <meshStandardMaterial color="#0f3b7a" roughness={0.55} metalness={0.35} />
                    </mesh>
                    <mesh position={[4.95, 6.65, 0]}>
                      <boxGeometry args={[0.22, 0.45, 13.8]} />
                      <meshBasicMaterial color="#ffb703" />
                    </mesh>
                    <pointLight position={[0, 5.4, 0]} color="#ffe9b8" intensity={6} distance={20} />
                  </group>
                </group>
              ))}
            </>
          ) : (
            /* === PESAWAT SAYAP TETAP: ASPAL RUNWAY 09 + TAXIWAY + HANGGAR JAUH === */
            <>
              {/* Aspal Runway 3D lengkap (khusus KT-1B diperlebar 3 jalur 44 unit agar 6 pesawat berjarak lega & rapi!) */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
                <planeGeometry args={[selectedId === 'kt1b' ? 44.0 : 11.2, CHUNK_LEN]} />
                <meshStandardMaterial map={runwayTex} roughness={0.86} metalness={0.05} />
              </mesh>
              {selectedId === 'kt1b' && (
                <>
                  {/* Garis jalur formasi kiri & kanan khusus 6-Ship Jupiter Aerobatic Runway */}
                  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-14.0, 0.015, 0]}>
                    <planeGeometry args={[0.28, CHUNK_LEN]} />
                    <meshBasicMaterial color="#e2e8f0" transparent opacity={0.75} />
                  </mesh>
                  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[14.0, 0.015, 0]}>
                    <planeGeometry args={[0.28, CHUNK_LEN]} />
                    <meshBasicMaterial color="#e2e8f0" transparent opacity={0.75} />
                  </mesh>
                  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-22.4, 0.015, 0]}>
                    <planeGeometry args={[0.35, CHUNK_LEN]} />
                    <meshBasicMaterial color="#ef4444" transparent opacity={0.85} />
                  </mesh>
                  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[22.4, 0.015, 0]}>
                    <planeGeometry args={[0.35, CHUNK_LEN]} />
                    <meshBasicMaterial color="#ef4444" transparent opacity={0.85} />
                  </mesh>
                </>
              )}

              {/* Bahu aspal & parallel taxiway berjarak jauh (X = -46, berjarak 46m dari sumbu Runway!) */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-6.4, -0.02, 0]}>
                <planeGeometry args={[1.6, CHUNK_LEN]} />
                <meshStandardMaterial color="#3a404a" roughness={0.92} />
              </mesh>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[6.4, -0.02, 0]}>
                <planeGeometry args={[1.6, CHUNK_LEN]} />
                <meshStandardMaterial color="#3a404a" roughness={0.92} />
              </mesh>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-46.0, -0.008, 0]}>
                <planeGeometry args={[5.2, CHUNK_LEN]} />
                <meshStandardMaterial color="#333942" roughness={0.9} />
              </mesh>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-46.0, 0.014, 0]}>
                <planeGeometry args={[0.3, CHUNK_LEN]} />
                <meshBasicMaterial color="#fbbf24" />
              </mesh>
              {/* Jalur taxiway penghubung tambahan (Cross-Taxiway B & C) antara Parallel Taxiway (-46) & Runway (0) */}
              {[-55, 55].map((cz, cIdx) => (
                <group key={`cross-tx-${cIdx}`} position={[-24.0, 0, cz]}>
                  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.006, 0]}>
                    <planeGeometry args={[46, 5.8]} />
                    <meshStandardMaterial color="#333942" roughness={0.9} />
                  </mesh>
                  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
                    <planeGeometry args={[44, 0.28]} />
                    <meshBasicMaterial color="#fbbf24" />
                  </mesh>
                </group>
              ))}

              {/* Lampu tepi runway */}
              {runwayLightZ.map((lz, i) => (
                <group key={i} position={[0, 0.14, lz]}>
                  <mesh position={[-5.9, 0, 0]}>
                    <sphereGeometry args={[0.16, 8, 8]} />
                    <meshBasicMaterial color={lz < -135 ? '#22c55e' : '#fde68a'} />
                  </mesh>
                  <mesh position={[5.9, 0, 0]}>
                    <sphereGeometry args={[0.16, 8, 8]} />
                    <meshBasicMaterial color={lz < -135 ? '#22c55e' : '#fde68a'} />
                  </mesh>
                </group>
              ))}

              {/* Lampu PAPI (Precision Approach Path Indicator — 2 Putih 2 Merah) di sisi kiri Zona Touchdown */}
              <group position={[-8.6, 0.22, -112]}>
                {[-1.5, -0.5, 0.5, 1.5].map((px, pIdx) => (
                  <group key={pIdx} position={[px, 0, 0]}>
                    <mesh>
                      <boxGeometry args={[0.55, 0.34, 0.45]} />
                      <meshStandardMaterial color="#1e293b" roughness={0.7} />
                    </mesh>
                    <mesh position={[0, 0, 0.24]}>
                      <sphereGeometry args={[0.14, 8, 8]} />
                      <meshBasicMaterial color={pIdx < 2 ? '#ffffff' : '#ef4444'} />
                    </mesh>
                  </group>
                ))}
              </group>

              {/* Hanggar TNI AU Terbuka di sisi barat jauh (X = -88: 42m ke Parallel Taxiway + 46m ke Runway = 88m total!) */}
              {[-152.0, 145.0].map((hz, hIdx) => (
                <group key={hIdx} position={[-88.0, 0, hz]}>
                  {/* Apron beton luas di depan hanggar hingga Parallel Taxiway (local x = 0..42 -> world -88..-46) */}
                  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[21.0, 0.01, 0]} receiveShadow>
                    <planeGeometry args={[42, 20]} />
                    <meshStandardMaterial map={concreteApronTex} roughness={0.86} />
                  </mesh>
                  {/* Jalur Taxiway penghubung aspal panjang dari Parallel Taxiway (-46) ke Runway (0) */}
                  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[64.0, 0.008, 0]} receiveShadow>
                    <planeGeometry args={[48, 8.4]} />
                    <meshStandardMaterial color="#333942" roughness={0.9} />
                  </mesh>
                  {/* Garis kuning penuntun Taxiway menerus sepanjang 82m dari dalam Hanggar hingga Runway! */}
                  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[43.0, 0.03, 0]}>
                    <planeGeometry args={[82, 0.38]} />
                    <meshBasicMaterial color="#fbbf24" />
                  </mesh>
                  {/* Garis Holding Point (Runway Hold-Short double bar) tepat sebelum masuk Runway */}
                  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[77.5, 0.032, 0]}>
                    <planeGeometry args={[0.45, 7.6]} />
                    <meshBasicMaterial color="#facc15" />
                  </mesh>
                  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[78.3, 0.032, 0]}>
                    <planeGeometry args={[0.45, 7.6]} />
                    <meshBasicMaterial color="#facc15" />
                  </mesh>
                  {/* Dinding belakang & samping baja bergelombang abu-biru TNI AU */}
                  <mesh position={[-5.5, 3.8, 0]}>
                    <boxGeometry args={[0.6, 7.6, 17.4]} />
                    <meshStandardMaterial map={hangarMetalTex} color="#475972" roughness={0.62} metalness={0.35} />
                  </mesh>
                  <mesh position={[0, 3.8, -8.5]}>
                    <boxGeometry args={[11.6, 7.6, 0.5]} />
                    <meshStandardMaterial map={hangarMetalTex} color="#526580" roughness={0.65} metalness={0.3} />
                  </mesh>
                  <mesh position={[0, 3.8, 8.5]}>
                    <boxGeometry args={[11.6, 7.6, 0.5]} />
                    <meshStandardMaterial map={hangarMetalTex} color="#526580" roughness={0.65} metalness={0.3} />
                  </mesh>
                  {/* Atap pelana landai baja + fascia depan berlogo sayap emas & tulisan "TNI AU" */}
                  <mesh position={[0, 7.85, 0]}>
                    <boxGeometry args={[12.4, 0.85, 18.2]} />
                    <meshStandardMaterial map={hangarMetalTex} color="#3b4d66" roughness={0.52} metalness={0.4} />
                  </mesh>
                  <mesh position={[6.25, 7.55, 0]} rotation={[0, Math.PI / 2, 0]}>
                    <planeGeometry args={[11.5, 2.3]} />
                    <meshStandardMaterial map={tniAuSignTex} roughness={0.48} metalness={0.25} />
                  </mesh>
                  <pointLight position={[0, 6.4, 0]} color="#ffe9b8" intensity={6} distance={22} />
                </group>
              ))}

              {/* Rambu kuning-hitam penunjuk Taxiway (A <- B ->) di pulau rumput luas antara runway & taxiway */}
              {[-125, -45, 35, 115].map((sz, sIdx) => (
                <group key={`tx-sign-${sIdx}`} position={[-28.5, 0.55, sz]} rotation={[0, 0.35, 0]}>
                  <mesh>
                    <boxGeometry args={[1.9, 0.72, 0.14]} />
                    <meshStandardMaterial map={taxiSignTex} roughness={0.45} />
                  </mesh>
                  <mesh position={[-0.6, -0.45, 0]}>
                    <cylinderGeometry args={[0.05, 0.05, 0.4, 6]} />
                    <meshStandardMaterial color="#334155" />
                  </mesh>
                  <mesh position={[0.6, -0.45, 0]}>
                    <cylinderGeometry args={[0.05, 0.05, 0.4, 6]} />
                    <meshStandardMaterial color="#334155" />
                  </mesh>
                </group>
              ))}

              {/* Tiang lampu sorot Apron merah-putih tinggi di tepi apron belakang Parallel Taxiway */}
              {[-105, -62, -18, 28, 74].map((pz, pIdx) => (
                <group key={`flood-pole-${pIdx}`} position={[-52.5, 0, pz]}>
                  <mesh position={[0, 6.0, 0]}>
                    <cylinderGeometry args={[0.14, 0.24, 12.0, 8]} />
                    <meshStandardMaterial color="#f1f5f9" roughness={0.5} />
                  </mesh>
                  {[2.2, 5.4, 8.6].map((ry, rIdx) => (
                    <mesh key={rIdx} position={[0, ry, 0]}>
                      <cylinderGeometry args={[0.19, 0.21, 1.3, 8]} />
                      <meshStandardMaterial color="#dc2626" roughness={0.5} />
                    </mesh>
                  ))}
                  <mesh position={[0.35, 12.15, 0]}>
                    <boxGeometry args={[0.9, 0.45, 1.6]} />
                    <meshStandardMaterial color="#e2e8f0" emissive="#fef9c3" emissiveIntensity={0.65} />
                  </mesh>
                </group>
              ))}
            </>
          )}

          {/* Apron beton luas di belakang Parallel Taxiway + Model 3D Bandara Asli (.GLB: Menara ATC, Terminal, Hanggar, 4 Pesawat Parkir, & Kendaraan Darat!) */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-76.0, 0.008, -16]} receiveShadow>
            <planeGeometry args={[54, 175]} />
            <meshStandardMaterial map={concreteApronTex} roughness={0.86} />
          </mesh>
          <Suspense fallback={null}>
            <AirbaseGlbModels />
          </Suspense>

          {/* Daratan hijau pemukiman bertekstur satelit nyata & jaringan jalan raya kota di sisi barat pangkalan */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-174, -0.1, 0]}>
            <planeGeometry args={[124, CHUNK_LEN]} />
            <meshStandardMaterial map={airbaseGrassTex} color="#d8e6d5" roughness={0.95} />
          </mesh>
          {/* Jalan raya aspal bermarka */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-116, -0.05, 0]}>
            <planeGeometry args={[3.2, CHUNK_LEN]} />
            <meshStandardMaterial color="#2b313a" roughness={0.9} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-148, -0.05, 0]}>
            <planeGeometry args={[3.8, CHUNK_LEN]} />
            <meshStandardMaterial color="#2b313a" roughness={0.9} />
          </mesh>

          {/* Gedung & rumah prosedural lama disembunyikan agar Kota 3D .GLB (city-main & city-district) tampil bersih tanpa tumpang tindih */}
          <group visible={false}>
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
          </group>

          {/* Pesisir pantai realistis (pasir kering -> basah -> buih ombak pecah -> toska) & laut berombak */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[20.5, -0.08, 0]}>
            <planeGeometry args={[11.5, CHUNK_LEN]} />
            <meshStandardMaterial map={coastlineTex} roughness={0.72} metalness={0.12} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[86, -0.11, 0]}>
            <planeGeometry args={[124, CHUNK_LEN]} />
            <meshStandardMaterial
              map={oceanTextures.map}
              bumpMap={oceanTextures.bumpMap}
              bumpScale={0.55}
              roughness={0.14}
              metalness={0.52}
            />
          </mesh>
        </group>

        {/* === ZONA 2: PEGUNUNGAN HEIGHTMAP 3D + GUNUNG SUMBING JAWA TENGAH (.GLB) & LEMBAH SUNGAI === */}
        <group ref={mountainChunkRef} name="biome-mountains">
          <Suspense fallback={null}>
            <MountSumbingGlbModels mode="valley" />
          </Suspense>
          {/* Mesh Pegunungan Heightmap 3D dengan tekstur kanopi hutan tropis, strata tebing batu & bump map */}
          <mesh geometry={mountainGeo} receiveShadow>
            <meshStandardMaterial
              vertexColors
              map={mountainDetailTex.map}
              bumpMap={mountainDetailTex.bumpMap}
              bumpScale={0.62}
              roughness={0.92}
              metalness={0.04}
            />
          </mesh>
          {/* Permukaan sungai biru berkilau mengalir di dasar lembah */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
            <planeGeometry args={[48, CHUNK_LEN]} />
            <meshStandardMaterial
              map={oceanTextures.map}
              bumpMap={oceanTextures.bumpMap}
              bumpScale={0.32}
              color="#38bdf8"
              roughness={0.14}
              metalness={0.55}
            />
          </mesh>
        </group>

        {/* === ZONA 3: LAUT LEPAS BEROMBAK 3D ANIMASI (ocean-loop.glb), PULAU TROPIS, BATU KARANG & KRI === */}
        <group ref={oceanChunkRef} name="biome-ocean">
          {/* Permukaan Samudra Berombak 3D Animasi (ocean__water_perfect_loop.glb) + alas laut cadangan */}
          <Suspense fallback={null}>
            <OceanLoopGlb />
          </Suspense>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]}>
            <planeGeometry args={[280, CHUNK_LEN]} />
            <meshStandardMaterial
              map={oceanTextures.map}
              bumpMap={oceanTextures.bumpMap}
              bumpScale={0.55}
              roughness={0.14}
              metalness={0.55}
            />
          </mesh>

          {/* 4 Pulau Tropis Organik + Formasi Batu Karang Pantai 3D Realistis (sea-rock.glb) */}
          {islandGeos.map((isl, idx) => (
            <mesh key={idx} geometry={isl.geo} position={[isl.x, -0.05, isl.z]}>
              <meshStandardMaterial
                vertexColors
                map={mountainDetailTex.map}
                bumpMap={mountainDetailTex.bumpMap}
                bumpScale={0.45}
                roughness={0.9}
                metalness={0.04}
              />
            </mesh>
          ))}
          <Suspense fallback={null}>
            <OceanRocksGlbModels />
          </Suspense>

          {/* Kapal Perang KRI TNI AL (Fregat & Korvet lengkap dengan meriam haluan, helideck H, radar & V-wake) */}
          {[
            { x: -16, z: -34, scale: 1.25 },
            { x: 26, z: 36, scale: 1.15 },
            { x: -58, z: 22, scale: 1.05 },
          ].map((ship, sIdx) => (
            <group key={sIdx} position={[ship.x, 0.35, ship.z]} scale={ship.scale}>
              {/* Lambung kapal perang abu-abu TNI AL */}
              <mesh>
                <boxGeometry args={[2.3, 1.0, 9.2]} />
                <meshStandardMaterial color="#58677a" roughness={0.48} metalness={0.35} />
              </mesh>
              {/* Dek utama gelap & garis helipad belakang */}
              <mesh position={[0, 0.52, -2.8]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[1.9, 2.8]} />
                <meshStandardMaterial color="#334155" roughness={0.85} />
              </mesh>
              <mesh position={[0, 0.54, -2.8]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.55, 0.72, 16]} />
                <meshBasicMaterial color="#fbbf24" />
              </mesh>
              {/* Haluan lancip */}
              <mesh position={[0, 0.05, 5.8]} rotation={[Math.PI / 2, 0, 0]}>
                <coneGeometry args={[1.2, 2.7, 4]} />
                <meshStandardMaterial color="#58677a" roughness={0.48} metalness={0.35} />
              </mesh>
              {/* Turret Meriam Haluan */}
              <mesh position={[0, 0.75, 3.3]}>
                <boxGeometry args={[0.65, 0.45, 0.85]} />
                <meshStandardMaterial color="#94a3b8" roughness={0.45} metalness={0.4} />
              </mesh>
              <mesh position={[0, 0.82, 4.05]} rotation={[Math.PI / 2 - 0.12, 0, 0]}>
                <cylinderGeometry args={[0.06, 0.08, 1.1, 6]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.6} />
              </mesh>
              {/* Anjungan & tiang radar */}
              <mesh position={[0, 1.08, 0.7]}>
                <boxGeometry args={[1.65, 1.25, 2.8]} />
                <meshStandardMaterial color="#cbd5e1" roughness={0.45} />
              </mesh>
              <mesh position={[0, 1.45, 1.85]}>
                <boxGeometry args={[1.55, 0.34, 0.45]} />
                <meshStandardMaterial color="#0f172a" roughness={0.18} metalness={0.75} />
              </mesh>
              <mesh position={[0, 2.35, 0.4]}>
                <cylinderGeometry args={[0.08, 0.15, 1.6, 6]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.55} />
              </mesh>
              <mesh position={[0, 3.1, 0.4]}>
                <boxGeometry args={[1.1, 0.18, 0.16]} />
                <meshStandardMaterial color="#f8fafc" />
              </mesh>
              {/* Jejak buih air V-wake di belakang kapal */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.36, -12.5]}>
                <planeGeometry args={[3.2, 16]} />
                <meshBasicMaterial color="#e0f6ff" transparent opacity={0.46} />
              </mesh>
            </group>
          ))}

          {/* 6 Perahu Nelayan Tradisional Nusantara (Lambung kayu, cadik/katir & layar/atap warna-warni) */}
          {[
            { x: 8, z: -18, rot: 0.4, sail: '#f8fafc', hull: '#1d4ed8' },
            { x: -32, z: -6, rot: -0.6, sail: '#fef08a', hull: '#dc2626' },
            { x: 18, z: -68, rot: 1.1, sail: '#fed7aa', hull: '#0f766e' },
            { x: -12, z: 48, rot: -0.9, sail: '#ffffff', hull: '#2563eb' },
            { x: 44, z: 8, rot: 2.2, sail: '#bae6fd', hull: '#b91c1c' },
            { x: -46, z: -56, rot: 0.25, sail: '#fef9c3', hull: '#0369a1' },
          ].map((boat, bIdx) => (
            <group
              key={`boat-${bIdx}`}
              ref={(el) => {
                boatRefs.current[bIdx] = el;
              }}
              position={[boat.x, 0.08, boat.z]}
              rotation={[0, boat.rot, 0]}
            >
              {/* Lambung perahu nelayan */}
              <mesh>
                <boxGeometry args={[0.9, 0.45, 3.2]} />
                <meshStandardMaterial color={boat.hull} roughness={0.7} />
              </mesh>
              <mesh position={[0, 0.04, 1.9]} rotation={[Math.PI / 2, 0, 0]}>
                <coneGeometry args={[0.45, 0.9, 4]} />
                <meshStandardMaterial color={boat.hull} roughness={0.7} />
              </mesh>
              {/* Cadik / outrigger bambu kiri-kanan khas perahu Nusantara */}
              <mesh position={[0, 0.14, 0]}>
                <boxGeometry args={[3.2, 0.07, 0.1]} />
                <meshStandardMaterial color="#b45309" roughness={0.85} />
              </mesh>
              <mesh position={[-1.55, 0.02, 0]}>
                <boxGeometry args={[0.12, 0.12, 2.6]} />
                <meshStandardMaterial color="#d97706" roughness={0.85} />
              </mesh>
              <mesh position={[1.55, 0.02, 0]}>
                <boxGeometry args={[0.12, 0.12, 2.6]} />
                <meshStandardMaterial color="#d97706" roughness={0.85} />
              </mesh>
              {/* Tiang & Layar Segitiga Nelayan */}
              <mesh position={[0, 1.3, 0.2]}>
                <cylinderGeometry args={[0.04, 0.05, 2.2, 6]} />
                <meshStandardMaterial color="#78350f" />
              </mesh>
              <mesh position={[0.05, 1.35, -0.35]} rotation={[0, Math.PI / 2, 0]}>
                <coneGeometry args={[0.95, 1.85, 3]} />
                <meshStandardMaterial color={boat.sail} roughness={0.85} side={THREE.DoubleSide} />
              </mesh>
              {/* Riak putih kecil di sekitar perahu */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.14, -1.8]}>
                <planeGeometry args={[1.2, 3.6]} />
                <meshBasicMaterial color="#e0f6ff" transparent opacity={0.35} />
              </mesh>
            </group>
          ))}
        </group>

        {/* === ZONA 4: KOTA METROPOLITAN 3D (.GLB: beautiful_city, city_pack_3, & city-scan) TEPAT DI BAWAH JALUR TERBANG! === */}
        <group ref={cityChunkRef} name="biome-city">
          {/* Lahan daratan hijau & jaringan jalan raya utama membelah pusat kota */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
            <planeGeometry args={[280, CHUNK_LEN]} />
            <meshStandardMaterial map={airbaseGrassTex} color="#c5d9c2" roughness={0.94} />
          </mesh>
          {/* Jalan tol / boulevard utama membelah tengah kota */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
            <planeGeometry args={[10.5, CHUNK_LEN]} />
            <meshStandardMaterial color="#2b313a" roughness={0.88} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
            <planeGeometry args={[0.35, CHUNK_LEN]} />
            <meshBasicMaterial color="#fbbf24" />
          </mesh>
          <Suspense fallback={null}>
            <CityGlbModels />
          </Suspense>
        </group>
      </group>
    </group>
  );
}
