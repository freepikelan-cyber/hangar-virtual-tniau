import { useEffect, useMemo, useRef } from 'react';
import { useAnimations, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Menyesuaikan skala model kota/area luas berdasarkan lebar bidang (targetSpan) sekaligus membatasi tinggi maks,
 * agar 1 file GLB mengisi 1 area pandang utuh secara rapi tanpa tumpang tindih!
 */
function normalizeGlbToFootprint(source: THREE.Object3D, targetSpan: number, maxHeight: number): THREE.Group {
  const clone = source.clone(true);
  const wrapper = new THREE.Group();
  wrapper.add(clone);

  clone.traverse((obj) => {
    const n = obj.name.toLowerCase();
    if (n.includes('collider')) {
      obj.visible = false;
      return;
    }
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      // Matikan shadow pass untuk gedung/lingkungan jauh agar GPU 60 FPS tanpa lag di HP & laptop!
      mesh.castShadow = false;
      mesh.receiveShadow = false;
    }
  });

  clone.position.set(0, 0, 0);
  clone.updateMatrixWorld(true);
  const box = new THREE.Box3();
  clone.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh && obj.visible) box.expandByObject(obj);
  });

  if (!box.isEmpty()) {
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const horiz = Math.max(size.x, size.z, 0.001);
    let scale = targetSpan / horiz;
    if (size.y * scale > maxHeight) {
      scale = maxHeight / Math.max(size.y, 0.001);
    }
    clone.scale.multiplyScalar(scale);
    clone.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
  }
  clone.updateMatrixWorld(true);
  clone.traverse((obj) => {
    obj.matrixAutoUpdate = false;
    obj.updateMatrix();
  });
  return wrapper;
}

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
      mesh.castShadow = false;
      mesh.receiveShadow = false;
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
  clone.updateMatrixWorld(true);
  clone.traverse((obj) => {
    obj.matrixAutoUpdate = false;
    obj.updateMatrix();
  });

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
    const atcTower = normalizeGlbPart(atcGltf.scene, 29.0);
    const hangar1 = normalizeGlbPart(hangarGltf.scene, 11.5);
    const hangar2 = normalizeGlbPart(hangarGltf.scene, 11.5);
    const hangar3 = normalizeGlbPart(hangarGltf.scene, 11.5);
    const hangar4 = normalizeGlbPart(hangarGltf.scene, 11.5);

    const pick = (name: string, height: number) => {
      const found = packGltf.scene.getObjectByName(name);
      return found ? normalizeGlbPart(found, height) : null;
    };

    const term1 = pick('07.Modulo1', 15.0);
    const term2 = pick('07.Modulo2', 14.5);
    const term3 = term1 ? term1.clone(true) : null;
    const jetbridge1 = pick('06.Tunnel', 5.8);
    const jetbridge2 = jetbridge1 ? jetbridge1.clone(true) : null;
    const jetbridge3 = jetbridge1 ? jetbridge1.clone(true) : null;
    const jetbridge4 = jetbridge1 ? jetbridge1.clone(true) : null;

    const plane1 = pick('18.1.Airplane', 7.5);
    const plane2 = pick('18.2.Airplane', 7.5);
    const plane3 = pick('18.3.Airplane', 7.2);
    const plane4 = pick('18.4.Airplane', 7.2);

    const firetruck = pick('19.Firetruck', 3.6);
    const bus = pick('20.PassengerBus', 3.4);
    const bagTruck1 = pick('21.1.BaggageTruck', 2.5);
    const bagTruck2 = pick('21.2.BaggageTruck', 2.5);
    const stairs = pick('03.AirplaneStairs', 4.0);

    return {
      atcTower,
      hangar1,
      hangar2,
      hangar3,
      hangar4,
      term1,
      term2,
      term3,
      jetbridge1,
      jetbridge2,
      jetbridge3,
      jetbridge4,
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
      {/* 1. Menara ATC 3D Realistis (atc-tower.glb) di belakang Parallel Taxiway */}
      <primitive object={assets.atcTower} position={[-71.0, 0, 28.0]} rotation={[0, Math.PI * 0.5, 0]} />

      {/* 2. Deretan 4 Hanggar 3D Lengkap di Apron Utara & Selatan (hangar.glb) */}
      <primitive object={assets.hangar1} position={[-82.0, 0, -116.0]} rotation={[0, Math.PI * 0.5, 0]} />
      <primitive object={assets.hangar2} position={[-82.0, 0, -88.0]} rotation={[0, Math.PI * 0.5, 0]} />
      <primitive object={assets.hangar3} position={[-82.0, 0, 62.0]} rotation={[0, Math.PI * 0.5, 0]} />
      <primitive object={assets.hangar4} position={[-82.0, 0, 92.0]} rotation={[0, Math.PI * 0.5, 0]} />

      {/* 3. Kompleks Terminal Bandara Modern 3D Panjang (3 Modul + 4 Garbarata) */}
      {assets.term1 && <primitive object={assets.term1} position={[-88.0, 0, -56.0]} rotation={[0, Math.PI * 0.5, 0]} />}
      {assets.term2 && <primitive object={assets.term2} position={[-88.0, 0, -24.0]} rotation={[0, Math.PI * 0.5, 0]} />}
      {assets.term3 && <primitive object={assets.term3} position={[-88.0, 0, 8.0]} rotation={[0, Math.PI * 0.5, 0]} />}
      {assets.jetbridge1 && <primitive object={assets.jetbridge1} position={[-77.5, 0, -60.0]} rotation={[0, Math.PI * 0.5, 0]} />}
      {assets.jetbridge2 && <primitive object={assets.jetbridge2} position={[-77.5, 0, -38.0]} rotation={[0, Math.PI * 0.5, 0]} />}
      {assets.jetbridge3 && <primitive object={assets.jetbridge3} position={[-77.5, 0, -16.0]} rotation={[0, Math.PI * 0.5, 0]} />}
      {assets.jetbridge4 && <primitive object={assets.jetbridge4} position={[-77.5, 0, 6.0]} rotation={[0, Math.PI * 0.5, 0]} />}

      {/* 4. 4 Pesawat Komersial Parkir Rapi di Apron Terminal */}
      {assets.plane1 && <primitive object={assets.plane1} position={[-69.5, 0, -58.0]} rotation={[0, -Math.PI * 0.42, 0]} />}
      {assets.plane2 && <primitive object={assets.plane2} position={[-69.5, 0, -34.0]} rotation={[0, -Math.PI * 0.45, 0]} />}
      {assets.plane3 && <primitive object={assets.plane3} position={[-69.5, 0, -10.0]} rotation={[0, -Math.PI * 0.42, 0]} />}
      {assets.plane4 && <primitive object={assets.plane4} position={[-70.0, 0, 44.0]} rotation={[0, Math.PI * 0.35, 0]} />}

      {/* 5. Armada Pendukung Darat Bandara (Truk Pemadam PKP-PK, Bus, Truk Bagasi, Tangga Pesawat) */}
      {assets.firetruck && <primitive object={assets.firetruck} position={[-64.5, 0, 18.0]} rotation={[0, Math.PI * 0.15, 0]} />}
      {assets.bus && <primitive object={assets.bus} position={[-66.5, 0, -22.0]} rotation={[0, Math.PI * 0.05, 0]} />}
      {assets.bagTruck1 && <primitive object={assets.bagTruck1} position={[-65.5, 0, -46.0]} rotation={[0, -Math.PI * 0.25, 0]} />}
      {assets.bagTruck2 && <primitive object={assets.bagTruck2} position={[-66.0, 0, -68.0]} rotation={[0, Math.PI * 0.4, 0]} />}
      {assets.stairs && <primitive object={assets.stairs} position={[-64.5, 0, -28.0]} rotation={[0, -Math.PI * 0.5, 0]} />}
    </group>
  );
}

/**
 * Zona 4: Kota Metropolitan 3D (.GLB) — 1 GLB mengisi 1 area pandang utuh & rapi (TIDAK bertumpuk!):
 * - Area Selatan (Z = -85): 1 hamparan penuh `beautiful_city.glb` (lebar 165m)
 * - Area Utara (Z = +85): 1 hamparan penuh `city_pack_3.glb` (lebar 165m)
 */
export function CityGlbModels() {
  const mainCityGltf = useGLTF('/models/env/city-main.glb');
  const districtGltf = useGLTF('/models/env/city-district.glb');

  const cities = useMemo(() => {
    const areaSouth = normalizeGlbToFootprint(mainCityGltf.scene, 165.0, 22.0);
    const areaNorth = normalizeGlbToFootprint(districtGltf.scene, 165.0, 22.0);
    return { areaSouth, areaNorth };
  }, [mainCityGltf.scene, districtGltf.scene]);

  return (
    <group name="city-glb-models">
      <primitive object={cities.areaSouth} position={[0, 0, -85.0]} rotation={[0, 0, 0]} />
      <primitive object={cities.areaNorth} position={[0, 0, 85.0]} rotation={[0, Math.PI * 0.5, 0]} />
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
      { obj: normalizeGlbPart(sumbingGltf.scene, 38.0), pos: [-112, -1.2, -55] as [number, number, number], rot: 0.2 },
      { obj: normalizeGlbPart(sumbingGltf.scene, 42.0), pos: [116, -1.2, 24] as [number, number, number], rot: 1.8 },
      { obj: normalizeGlbPart(sumbingGltf.scene, 35.0), pos: [-108, -1.2, 95] as [number, number, number], rot: 3.4 },
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
 * Formasi Batu Karang Laut 3D Bulat & Organik (tertanam dalam di dasar laut — 0% kotak, 0% lempengan mengambang!)
 * Menggunakan gugusan batu karang bulat halus terkikis ombak + cincin buih ombak di permukaan air.
 */
export function OceanRocksGlbModels() {
  const rockGeo = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 18, 14);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      // Variasi organik halus agar seperti batu karang bulat alami terkikis ombak (tanpa sudut tajam/kotak)
      const wobble = 1 + 0.14 * Math.sin(x * 3.1 + z * 2.7) * Math.cos(y * 2.5);
      pos.setXYZ(i, x * wobble, y * wobble, z * wobble);
    }
    g.computeVertexNormals();
    return g;
  }, []);

  const rockMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#4b5563',
        roughness: 0.88,
        metalness: 0.06,
      }),
    [],
  );

  const wetRockMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#374151',
        roughness: 0.72,
        metalness: 0.12,
      }),
    [],
  );

  const foamMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#e0f6ff',
        transparent: true,
        opacity: 0.36,
        depthWrite: false,
      }),
    [],
  );

  useEffect(() => {
    return () => {
      rockGeo.dispose();
      rockMat.dispose();
      wetRockMat.dispose();
      foamMat.dispose();
    };
  }, [rockGeo, rockMat, wetRockMat, foamMat]);

  const clusters = useMemo(
    () => [
      { pos: [-62, -1.4, -78] as [number, number, number], scale: 1.0, rot: 0.4 },
      { pos: [66, -1.4, -26] as [number, number, number], scale: 1.2, rot: 1.9 },
      { pos: [-48, -1.4, 86] as [number, number, number], scale: 0.9, rot: 3.1 },
      { pos: [58, -1.4, 74] as [number, number, number], scale: 1.05, rot: 4.6 },
    ],
    [],
  );

  return (
    <group name="ocean-rocks-rounded-models">
      {clusters.map((cl, idx) => (
        <group key={idx} position={cl.pos} rotation={[0, cl.rot, 0]} scale={cl.scale}>
          {/* Batu karang utama bulat tertanam dalam ke dasar laut */}
          <mesh geometry={rockGeo} material={rockMat} position={[0, 1.6, 0]} scale={[7.2, 4.6, 6.4]} />
          {/* Batu pendamping bulat halus di sisi kanan & kiri */}
          <mesh geometry={rockGeo} material={wetRockMat} position={[5.6, 0.7, 2.2]} scale={[4.4, 2.8, 4.0]} />
          <mesh geometry={rockGeo} material={wetRockMat} position={[-5.0, 0.9, -2.5]} scale={[4.8, 3.1, 4.2]} />
          <mesh geometry={rockGeo} material={rockMat} position={[1.5, 0.4, -5.2]} scale={[3.6, 2.2, 3.4]} />
          {/* Cincin buih ombak lembut melingkari karang di permukaan air */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 1.32, 0]} material={foamMat}>
            <ringGeometry args={[6.8, 9.4, 24]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * Kubah Langit 360° Siang Hari (.GLB: skybox_skydays_3.glb)
 * Dikonversi ke material unlit cerah & bebas fog agar langit biru + awan tampil super tajam 360°!
 */
export function SkyboxDayGlb() {
  const skyGltf = useGLTF('/models/env/skybox-day.glb');

  const dome = useMemo(() => {
    const clone = skyGltf.scene.clone(true);
    clone.position.set(0, 0, 0);
    clone.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const maxDim = Math.max(size.x, size.y, size.z, 0.001);
    const scale = 470 / maxDim; // Diameter ~470 (radius ~235, melingkupi seluruh dunia 3D!)
    clone.scale.multiplyScalar(scale);
    clone.position.set(-center.x * scale, -center.y * scale, -center.z * scale);

    clone.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        const orig = mesh.material as THREE.MeshStandardMaterial | undefined;
        const map = orig?.map ?? orig?.emissiveMap ?? null;
        if (map) {
          map.colorSpace = THREE.SRGBColorSpace;
        }
        mesh.material = new THREE.MeshBasicMaterial({
          map,
          color: '#ffffff',
          side: THREE.DoubleSide,
          fog: false,
          depthWrite: false,
        });
        mesh.frustumCulled = false;
      }
    });
    return clone;
  }, [skyGltf.scene]);

  return <primitive object={dome} name="skybox-skydays-3-glb" />;
}

/**
 * Lautan Berombak Animasi 3D Realistis (.GLB: ocean__water_perfect_loop.glb terkompresi 16MB!)
 * Memutar animasi gelombang ombak 3D secara loop mulus di Zona 3 (Samudra).
 */
export function OceanLoopGlb() {
  const groupRef = useRef<THREE.Group>(null);
  const oceanGltf = useGLTF('/models/env/ocean-loop.glb');
  const { actions } = useAnimations(oceanGltf.animations, groupRef);

  const normalizedScale = useMemo(() => {
    oceanGltf.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(oceanGltf.scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const sx = size.x > 0.001 ? 280 / size.x : 1;
    const sz = size.z > 0.001 ? 340 / size.z : 1;
    const sy = Math.min(sx, sz) * 0.85;
    oceanGltf.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.material = new THREE.MeshStandardMaterial({
          color: '#0e5a8a',
          roughness: 0.14,
          metalness: 0.62,
          envMapIntensity: 1.35,
        });
      }
    });
    return [sx, sy, sz] as [number, number, number];
  }, [oceanGltf.scene]);

  useEffect(() => {
    Object.values(actions).forEach((action) => {
      if (action) {
        action.reset().setLoop(THREE.LoopRepeat, Infinity).play();
      }
    });
  }, [actions]);

  return (
    <group ref={groupRef} position={[0, -0.45, 0]} scale={normalizedScale} name="ocean-perfect-loop-glb">
      <primitive object={oceanGltf.scene} />
    </group>
  );
}
