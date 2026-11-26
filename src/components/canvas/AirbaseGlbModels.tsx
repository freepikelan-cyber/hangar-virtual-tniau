import { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Membersihkan mesh collider tersembunyi, menghitung bounding box asli,
 * menyetel tinggi persis ke `targetHeight`, dan menaruh alas (min.y) tepat di Y = 0!
 */
function normalizeGlbPart(source: THREE.Object3D, targetHeight: number): THREE.Group {
  const clone = source.clone(true);
  const wrapper = new THREE.Group();
  wrapper.add(clone);

  // Sembunyikan mesh collider/fisika bawaan Sketchfab agar tidak muncul sebagai kotak transparan/abu-abu
  clone.traverse((obj) => {
    const n = obj.name.toLowerCase();
    if (n.includes('collider')) {
      obj.visible = false;
      return;
    }
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      const matNames = Array.isArray(mat) ? mat.map((m) => m.name.toLowerCase()) : [mat?.name?.toLowerCase() ?? ''];
      if (matNames.some((mn) => mn.includes('collider'))) {
        mesh.visible = false;
        return;
      }
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });

  // Reset transformasi lokal root agar bounding box akurat
  clone.position.set(0, 0, 0);
  clone.updateMatrixWorld(true);

  const box = new THREE.Box3();
  clone.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh && obj.visible) {
      box.expandByObject(obj);
    }
  });

  if (!box.isEmpty()) {
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const scale = size.y > 0.0001 ? targetHeight / size.y : 1;
    clone.scale.multiplyScalar(scale);
    clone.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
  }

  return wrapper;
}

/**
 * Memuat & menempatkan model 3D bandara asli (.glb) dari folder public/models/airbase/:
 * - Menara ATC 3D detail tinggi (atc-tower.glb)
 * - Hanggar Pesawat 3D (hangar.glb)
 * - Terminal Bandara, 4 Pesawat Komersial Parkir, Truk Pemadam, Bus Penumpang, Truk Bagasi & Tangga Pesawat (airport-pack.glb)
 */
export function AirbaseGlbModels() {
  const atcGltf = useGLTF('/models/airbase/atc-tower.glb');
  const hangarGltf = useGLTF('/models/airbase/hangar.glb');
  const packGltf = useGLTF('/models/airbase/airport-pack.glb');

  const assets = useMemo(() => {
    const atcTower = normalizeGlbPart(atcGltf.scene, 27.5);
    const hangarNorth = normalizeGlbPart(hangarGltf.scene, 10.5);
    const hangarSouth = normalizeGlbPart(hangarGltf.scene, 10.5);

    const pick = (name: string, height: number) => {
      const found = packGltf.scene.getObjectByName(name);
      return found ? normalizeGlbPart(found, height) : null;
    };

    const term1 = pick('07.Modulo1', 12.0);
    const term2 = pick('07.Modulo2', 11.5);
    const jetbridge1 = pick('06.Tunnel', 5.2);
    const jetbridge2 = jetbridge1 ? jetbridge1.clone(true) : null;
    const jetbridge3 = jetbridge1 ? jetbridge1.clone(true) : null;

    const plane1 = pick('18.1.Airplane', 7.2);
    const plane2 = pick('18.2.Airplane', 7.2);
    const plane3 = pick('18.3.Airplane', 7.0);
    const plane4 = pick('18.4.Airplane', 7.0);

    const firetruck = pick('19.Firetruck', 3.4);
    const bus = pick('20.PassengerBus', 3.2);
    const bagTruck1 = pick('21.1.BaggageTruck', 2.4);
    const bagTruck2 = pick('21.2.BaggageTruck', 2.4);
    const stairs = pick('03.AirplaneStairs', 3.8);

    return {
      atcTower,
      hangarNorth,
      hangarSouth,
      term1,
      term2,
      jetbridge1,
      jetbridge2,
      jetbridge3,
      plane1,
      plane2,
      plane3,
      plane4,
      firetruck,
      bus,
      bagTruck1,
      bagTruck2,
      stairs,
    };
  }, [atcGltf.scene, hangarGltf.scene, packGltf.scene]);

  useEffect(() => {
    // Cleanup handled by R3F/useGLTF cache
  }, [assets]);

  return (
    <group name="airbase-glb-models">
      {/* 1. Menara ATC 3D Realistis (atc-tower.glb) */}
      <primitive object={assets.atcTower} position={[-35.0, 0, 26.0]} rotation={[0, Math.PI * 0.5, 0]} />

      {/* 2. Hanggar 3D Tambahan di Apron Utara & Selatan (hangar.glb) */}
      <primitive object={assets.hangarNorth} position={[-44.0, 0, -104.0]} rotation={[0, Math.PI * 0.5, 0]} />
      <primitive object={assets.hangarSouth} position={[-44.0, 0, 88.0]} rotation={[0, Math.PI * 0.5, 0]} />

      {/* 3. Terminal Bandara Modern 3D + Garbarata (airport-pack.glb) */}
      {assets.term1 && <primitive object={assets.term1} position={[-52.0, 0, -44.0]} rotation={[0, Math.PI * 0.5, 0]} />}
      {assets.term2 && <primitive object={assets.term2} position={[-52.0, 0, -8.0]} rotation={[0, Math.PI * 0.5, 0]} />}
      {assets.jetbridge1 && <primitive object={assets.jetbridge1} position={[-40.5, 0, -48.0]} rotation={[0, Math.PI * 0.5, 0]} />}
      {assets.jetbridge2 && <primitive object={assets.jetbridge2} position={[-40.5, 0, -26.0]} rotation={[0, Math.PI * 0.5, 0]} />}
      {assets.jetbridge3 && <primitive object={assets.jetbridge3} position={[-40.5, 0, -4.0]} rotation={[0, Math.PI * 0.5, 0]} />}

      {/* 4. Pesawat Komersial Parkir di Apron Terminal (seperti di foto bandara!) */}
      {assets.plane1 && <primitive object={assets.plane1} position={[-33.0, 0, -52.0]} rotation={[0, -Math.PI * 0.42, 0]} />}
      {assets.plane2 && <primitive object={assets.plane2} position={[-33.0, 0, -28.0]} rotation={[0, -Math.PI * 0.45, 0]} />}
      {assets.plane3 && <primitive object={assets.plane3} position={[-33.0, 0, -4.0]} rotation={[0, -Math.PI * 0.42, 0]} />}
      {assets.plane4 && <primitive object={assets.plane4} position={[-34.0, 0, 52.0]} rotation={[0, Math.PI * 0.35, 0]} />}

      {/* 5. Armada Pendukung Darat Bandara (Truk Pemadam PKP-PK, Bus, Truk Bagasi, Tangga Pesawat) */}
      {assets.firetruck && <primitive object={assets.firetruck} position={[-28.5, 0, 14.0]} rotation={[0, Math.PI * 0.15, 0]} />}
      {assets.bus && <primitive object={assets.bus} position={[-31.0, 0, -16.0]} rotation={[0, Math.PI * 0.05, 0]} />}
      {assets.bagTruck1 && <primitive object={assets.bagTruck1} position={[-30.0, 0, -40.0]} rotation={[0, -Math.PI * 0.25, 0]} />}
      {assets.bagTruck2 && <primitive object={assets.bagTruck2} position={[-30.5, 0, -60.0]} rotation={[0, Math.PI * 0.4, 0]} />}
      {assets.stairs && <primitive object={assets.stairs} position={[-28.5, 0, -24.0]} rotation={[0, -Math.PI * 0.5, 0]} />}
    </group>
  );
}

/**
 * Zona 4: Kota Metropolitan 3D Realistis (.GLB: beautiful_city.glb, city_pack_3.glb, & 3d_scan_of_a_russian_city_quarter.glb)
 * Membentang langsung di bawah jalur terbang pesawat (X = -95..+95, Z = -130..+130) dengan tinggi aman <= 22m
 * agar seluruh pesawat melintas megah tepat di atas gedung-gedung pencakar langit tanpa pernah menabrak!
 */
export function CityGlbModels() {
  const mainCityGltf = useGLTF('/models/env/city-main.glb');
  const districtGltf = useGLTF('/models/env/city-district.glb');
  const scanCityGltf = useGLTF('/models/env/city-scan.glb');

  const cities = useMemo(() => {
    const mainWest = normalizeGlbPart(mainCityGltf.scene, 21.0);
    const mainEast = normalizeGlbPart(mainCityGltf.scene, 22.0);
    const districtNW = normalizeGlbPart(districtGltf.scene, 16.0);
    const districtNE = normalizeGlbPart(districtGltf.scene, 17.0);
    const districtSW = normalizeGlbPart(districtGltf.scene, 16.0);
    const districtSE = normalizeGlbPart(districtGltf.scene, 17.0);
    const scanCenter1 = normalizeGlbPart(scanCityGltf.scene, 14.0);
    const scanCenter2 = normalizeGlbPart(scanCityGltf.scene, 14.0);
    return { mainWest, mainEast, districtNW, districtNE, districtSW, districtSE, scanCenter1, scanCenter2 };
  }, [mainCityGltf.scene, districtGltf.scene, scanCityGltf.scene]);

  return (
    <group name="city-glb-models">
      {/* Pusat Kota Pencakar Langit Kiri & Kanan tepat mengapit jalur terbang tengah */}
      <primitive object={cities.mainWest} position={[-42.0, 0, -10.0]} rotation={[0, Math.PI * 0.5, 0]} />
      <primitive object={cities.mainEast} position={[44.0, 0, 12.0]} rotation={[0, -Math.PI * 0.5, 0]} />

      {/* Distrik Kota Utara & Selatan (city_pack_3.glb) */}
      <primitive object={cities.districtNW} position={[-48.0, 0, -105.0]} rotation={[0, 0, 0]} />
      <primitive object={cities.districtNE} position={[48.0, 0, -102.0]} rotation={[0, Math.PI, 0]} />
      <primitive object={cities.districtSW} position={[-46.0, 0, 108.0]} rotation={[0, Math.PI * 0.5, 0]} />
      <primitive object={cities.districtSE} position={[46.0, 0, 104.0]} rotation={[0, -Math.PI * 0.5, 0]} />

      {/* Kawasan Kota 3D Scan Fotogrametri tepat di bawah jalur terbang tengah (ketinggian aman 14m di bawah pesawat 28m!) */}
      <primitive object={cities.scanCenter1} position={[0.0, 0, -68.0]} rotation={[0, 0, 0]} />
      <primitive object={cities.scanCenter2} position={[0.0, 0, 68.0]} rotation={[0, Math.PI, 0]} />
    </group>
  );
}

/**
 * Gunung Sumbing Jawa Tengah 3D Asli (.GLB: mount_sumbing_-_java_indonesia.glb)
 * Menjulang megah mengapit lembah terbang Zona 2 (Pegunungan) — jalur tengah X ∈ [-25..+25] tetap 100% aman bebas tabrakan!
 */
export function MountSumbingGlbModels({ mode = 'valley' }: { mode?: 'valley' | 'airbase' }) {
  const sumbingGltf = useGLTF('/models/env/mount-sumbing.glb');

  const peaks = useMemo(() => {
    if (mode === 'airbase') {
      return [
        { obj: normalizeGlbPart(sumbingGltf.scene, 42.0), pos: [-110, -1.0, 148] as [number, number, number], rot: 0.3 },
        { obj: normalizeGlbPart(sumbingGltf.scene, 34.0), pos: [85, -1.0, 152] as [number, number, number], rot: 2.1 },
      ];
    }
    return [
      { obj: normalizeGlbPart(sumbingGltf.scene, 46.0), pos: [-88, -1.2, -55] as [number, number, number], rot: 0.2 },
      { obj: normalizeGlbPart(sumbingGltf.scene, 52.0), pos: [94, -1.2, 24] as [number, number, number], rot: 1.8 },
      { obj: normalizeGlbPart(sumbingGltf.scene, 38.0), pos: [-82, -1.2, 95] as [number, number, number], rot: 3.4 },
    ];
  }, [sumbingGltf.scene, mode]);

  return (
    <group name={`mount-sumbing-${mode}`}>
      {peaks.map((pk, idx) => (
        <primitive key={idx} object={pk.obj} position={pk.pos} rotation={[0, pk.rot, 0]} />
      ))}
    </group>
  );
}

/**
 * Formasi Batu Karang Pantai 3D Fotorealistis (.GLB: rock_by_the_sea.glb)
 * menjulang di tengah samudra Zona 3 (Lautan) & pesisir pantai!
 */
export function OceanRocksGlbModels() {
  const rockGltf = useGLTF('/models/env/sea-rock.glb');

  const rocks = useMemo(() => {
    return [
      { obj: normalizeGlbPart(rockGltf.scene, 14.5), pos: [-62, -0.6, -78] as [number, number, number], rot: 0.4 },
      { obj: normalizeGlbPart(rockGltf.scene, 18.0), pos: [66, -0.7, -26] as [number, number, number], rot: 1.9 },
      { obj: normalizeGlbPart(rockGltf.scene, 12.5), pos: [-48, -0.5, 86] as [number, number, number], rot: 3.1 },
      { obj: normalizeGlbPart(rockGltf.scene, 15.5), pos: [58, -0.6, 74] as [number, number, number], rot: 4.6 },
    ];
  }, [rockGltf.scene]);

  return (
    <group name="ocean-rocks-glb-models">
      {rocks.map((r, idx) => (
        <primitive key={idx} object={r.obj} position={r.pos} rotation={[0, r.rot, 0]} />
      ))}
    </group>
  );
}
