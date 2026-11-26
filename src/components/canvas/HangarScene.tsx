import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { flightSync, getDefaultCamera, useHangarStore } from '../../store/useHangarStore';
import { getUnit } from '../../data/fleetData';
import { radarFloorTexture, sweepTexture } from '../../utils/textures';
import { AircraftModel } from './AircraftModel';
import { AirRefuelingLayer } from './AirRefuelingLayer';
import { DogfightCombatLayer } from './DogfightCombatLayer';
import { SkyCloudsEnvironment } from './SkyCloudsEnvironment';

function RadarPlatform() {
  const groupRef = useRef<THREE.Group>(null);
  const sweepRef = useRef<THREE.Mesh>(null);
  const flightMode = useHangarStore((s) => s.flightMode);
  const safetyMode = useHangarStore((s) => s.safetyMode);
  const selectedId = useHangarStore((s) => s.selectedId);
  const floorTex = useMemo(() => radarFloorTexture(), []);
  const sweepTex = useMemo(() => sweepTexture(), []);

  const isOutdoorSim = (flightMode !== 'parked' || safetyMode) && selectedId !== 'gsuit' && selectedId !== 'pilot-helmet';

  useEffect(() => {
    return () => {
      floorTex.dispose();
      sweepTex.dispose();
    };
  }, [floorTex, sweepTex]);

  useFrame((_, delta) => {
    if (sweepRef.current) {
      sweepRef.current.rotation.z -= delta * 0.45;
    }
    if (groupRef.current) {
      // Saat simulasi terbang aktif (Take Off / Airborne / Manuver / Landing), sembunyikan platform hanggar
      // agar aspal Runway 3D + pemandangan kota & laut tampil bersih tanpa tumpang tindih!
      groupRef.current.visible = !isOutdoorSim;
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.02, 0]} name="radar-platform">
      {/* Piringan landasan radar utama */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[11.2, 96]} />
        <meshStandardMaterial
          map={floorTex}
          metalness={0.35}
          roughness={0.55}
          emissive="#12458a"
          emissiveMap={floorTex}
          emissiveIntensity={0.48}
        />
      </mesh>

      {/* Cincin tepi bercahaya Biru TNI AU */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <ringGeometry args={[11.12, 11.35, 96]} />
        <meshBasicMaterial color="#4da6ff" transparent opacity={0.9} />
      </mesh>

      {/* Sapuan radar berputar */}
      <mesh ref={sweepRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[11.0, 64]} />
        <meshBasicMaterial
          map={sweepTex}
          transparent
          opacity={0.45}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Lantai luar hangar Biru TNI AU */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <ringGeometry args={[11.35, 42, 64]} />
        <meshStandardMaterial color="#0a1e3c" metalness={0.22} roughness={0.82} />
      </mesh>
    </group>
  );
}

function StudioLighting() {
  const timeOfDay = useHangarStore((s) => s.timeOfDay);
  const flightMode = useHangarStore((s) => s.flightMode);
  const safetyMode = useHangarStore((s) => s.safetyMode);
  const selectedId = useHangarStore((s) => s.selectedId);
  const isEquipment = selectedId === 'gsuit' || selectedId === 'pilot-helmet';
  const isOutdoorSim = !isEquipment && (flightMode !== 'parked' || safetyMode);
  const useOutdoorHdri = isOutdoorSim && (timeOfDay === 'day' || timeOfDay === 'sunset');
  const ambientColor = timeOfDay === 'sunset' ? '#ffd1a3' : timeOfDay === 'night' ? '#4a6ea8' : '#b8d4f0';
  const ambientInt = timeOfDay === 'sunset' ? 0.36 : timeOfDay === 'night' ? 0.22 : 0.42;
  const sunColor = timeOfDay === 'sunset' ? '#ffad66' : timeOfDay === 'night' ? '#7ea8e8' : '#ffffff';
  const sunInt = timeOfDay === 'sunset' ? 1.55 : timeOfDay === 'night' ? 0.72 : 1.7;
  const rimColor = timeOfDay === 'sunset' ? '#ff8552' : timeOfDay === 'night' ? '#38bdf8' : '#7fd8ff';

  return (
    <>
      <ambientLight intensity={ambientInt} color={ambientColor} />
      <directionalLight
        position={timeOfDay === 'sunset' ? [22, 12, 18] : [12, 24, 14]}
        intensity={sunInt}
        color={sunColor}
        castShadow={!isOutdoorSim}
        shadow-mapSize={[512, 512]}
        shadow-camera-left={-36}
        shadow-camera-right={36}
        shadow-camera-top={36}
        shadow-camera-bottom={-36}
        shadow-camera-far={120}
      />
      <directionalLight position={[-14, 10, -10]} intensity={timeOfDay === 'night' ? 0.55 : 0.85} color={rimColor} />
      <spotLight position={[0, 18, 0]} angle={0.65} penumbra={0.7} intensity={timeOfDay === 'night' ? 0.8 : 1.2} color="#e6f5ff" />

      {/* Pencahayaan IBL 360° HDRI (Siang memakai skybox_skydays_3.glb sebagai latar + HDRI untuk pantulan logam; Senja memakai HDRI penuh!) */}
      {useOutdoorHdri ? (
        <Suspense fallback={null}>
          <Environment
            files={timeOfDay === 'sunset' ? '/textures/hdri/sky-sunset.hdr' : '/textures/hdri/sky-day.hdr'}
            background={timeOfDay === 'sunset'}
            environmentIntensity={timeOfDay === 'sunset' ? 0.92 : 1.05}
          />
        </Suspense>
      ) : (
        <Environment resolution={128} frames={1}>
          <group rotation={[-Math.PI / 3, 0, 1]}>
            <Lightformer form="rect" intensity={3.2} position={[0, 10, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[20, 6, 1]} color="#eef8ff" />
            <Lightformer form="rect" intensity={2.2} position={[0, 10, 8]} rotation={[Math.PI / 2, 0, 0]} scale={[18, 3, 1]} color="#cceeff" />
            <Lightformer form="rect" intensity={2.2} position={[0, 10, -8]} rotation={[Math.PI / 2, 0, 0]} scale={[18, 3, 1]} color="#cceeff" />
            <Lightformer form="rect" intensity={1.6} position={[14, 4, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[16, 4, 1]} color="#7cd8ff" />
            <Lightformer form="rect" intensity={1.4} position={[-14, 4, 0]} rotation={[0, Math.PI / 2, 0]} scale={[16, 4, 1]} color="#ffe5b8" />
            <Lightformer form="ring" intensity={1.1} position={[0, -6, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[22, 22, 1]} color="#0a2844" />
          </group>
        </Environment>
      )}
    </>
  );
}

function CameraRig() {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera, size } = useThree();
  const camRequest = useHangarStore((s) => s.camRequest);
  const flightMode = useHangarStore((s) => s.flightMode);
  const flightNonce = useHangarStore((s) => s.flightNonce);
  const selectedId = useHangarStore((s) => s.selectedId);

  const initial = useMemo(() => getDefaultCamera(), []);
  const desiredPos = useRef(new THREE.Vector3(...initial.pos));
  const desiredTarget = useRef(new THREE.Vector3(...initial.target));
  const animating = useRef(false);
  const lastTrackedX = useRef<number | null>(null);

  // Sesuaikan FOV otomatis saat layar portrait (smartphone) agar sayap pesawat tidak terpotong
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    if (!cam.isPerspectiveCamera) return;
    const nextFov = size.width < size.height ? 52 : 42;
    if (cam.fov !== nextFov) {
      cam.fov = nextFov;
      cam.updateProjectionMatrix();
    }
  }, [camera, size.width, size.height]);

  // Saat Take Off dimulai dari Hanggar jauh (-82 / -44), posisikan kamera mengikuti pesawat di depan Hanggar!
  // Saat kembali ke Parked, kembalikan target kamera ke tengah (0, 1.5, 0).
  useEffect(() => {
    const isHeli = getUnit(selectedId).category === 'Helikopter';
    if (flightMode === 'takeoff') {
      const startX = isHeli ? -44.0 : -82.0;
      const startZ = isHeli ? 0.0 : -10.5;
      lastTrackedX.current = startX;
      if (selectedId !== 'kt1b') {
        const def = getDefaultCamera(selectedId);
        desiredPos.current.set(startX + def.pos[0] + 6.0, def.pos[1] + 2.5, startZ + def.pos[2] + 4.0);
        desiredTarget.current.set(startX, 1.6, startZ);
        animating.current = true;
      }
    } else if (flightMode === 'landing') {
      lastTrackedX.current = 0;
    } else if (flightMode === 'parked') {
      lastTrackedX.current = null;
      const def = getDefaultCamera(selectedId);
      desiredPos.current.set(...def.pos);
      desiredTarget.current.set(...def.target);
      animating.current = true;
    } else {
      lastTrackedX.current = null;
    }
  }, [flightMode, flightNonce, selectedId]);

  useEffect(() => {
    if (!camRequest) return;
    desiredPos.current.set(...camRequest.pos);
    desiredTarget.current.set(...camRequest.target);
    animating.current = true;
  }, [camRequest]);

  useFrame((_, delta) => {
    if (!controlsRef.current) return;

    // Ikuti pergeseran X pesawat secara halus saat Taxi Out (Take Off) & Taxi In (Landing)
    // membaca langsung dari flightSync.aircraftX (0% scene traversal -> 60 FPS mulus!)
    if ((flightMode === 'takeoff' || flightMode === 'landing') && selectedId !== 'kt1b') {
      const ax = flightSync.aircraftX;
      if (lastTrackedX.current !== null) {
        const dx = ax - lastTrackedX.current;
        if (Math.abs(dx) > 0.0001 && Math.abs(dx) < 25) {
          camera.position.x += dx;
          controlsRef.current.target.x += dx;
          desiredPos.current.x += dx;
          desiredTarget.current.x += dx;
        }
      }
      lastTrackedX.current = ax;
    }

    if (!animating.current) return;
    const alpha = Math.min(1, delta * 5.2);
    camera.position.lerp(desiredPos.current, alpha);
    controlsRef.current.target.lerp(desiredTarget.current, alpha);
    controlsRef.current.update();

    if (
      camera.position.distanceTo(desiredPos.current) < 0.04 &&
      controlsRef.current.target.distanceTo(desiredTarget.current) < 0.04
    ) {
      animating.current = false;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.07}
      enablePan
      minDistance={3.2}
      maxDistance={150}
      maxPolarAngle={Math.PI / 2 - 0.03}
      target={initial.target}
      onStart={() => {
        animating.current = false;
      }}
    />
  );
}

export function HangarScene() {
  const clearHotspot = useHangarStore((s) => s.clearHotspot);
  const flightMode = useHangarStore((s) => s.flightMode);
  const safetyMode = useHangarStore((s) => s.safetyMode);
  const showcaseMode = useHangarStore((s) => s.showcaseMode);
  const selectedId = useHangarStore((s) => s.selectedId);
  const initialCam = useMemo(() => getDefaultCamera(), []);
  const isEquipment = selectedId === 'gsuit' || selectedId === 'pilot-helmet';
  const isOutdoorSim = !isEquipment && (flightMode !== 'parked' || safetyMode);
  const everOutdoorRef = useRef(false);
  if (isOutdoorSim) everOutdoorRef.current = true;
  const showGroundShadow = (isEquipment || flightMode === 'parked') && !showcaseMode;

  return (
    <div className="absolute inset-0 bg-[#07152c] touch-none">
      <Canvas
        shadows
        dpr={isOutdoorSim || showcaseMode ? 1 : [1, 1.25]}
        camera={{ position: initialCam.pos, fov: 42, near: 0.1, far: 440 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.06,
        }}
        onPointerMissed={() => clearHotspot()}
      >
        <color attach="background" args={['#07152c']} />
        <fog attach="fog" args={['#07152c', 26, 62]} />

        <StudioLighting />
        {(isOutdoorSim || everOutdoorRef.current) && <SkyCloudsEnvironment />}
        <RadarPlatform />
        {showGroundShadow && (
          <ContactShadows
            position={[0, 0.02, 0]}
            opacity={0.52}
            scale={22}
            blur={1.8}
            far={8}
            frames={1}
            resolution={256}
            color="#041024"
          />
        )}
        <AircraftModel />
        {flightMode === 'aar' && <AirRefuelingLayer />}
        {flightMode === 'mission' && <DogfightCombatLayer />}
        <CameraRig />
      </Canvas>
    </div>
  );
}
