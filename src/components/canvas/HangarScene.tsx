import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { getDefaultCamera, useHangarStore } from '../../store/useHangarStore';
import { radarFloorTexture, sweepTexture } from '../../utils/textures';
import { AircraftModel } from './AircraftModel';
import { SkyCloudsEnvironment } from './SkyCloudsEnvironment';

function RadarPlatform() {
  const groupRef = useRef<THREE.Group>(null);
  const sweepRef = useRef<THREE.Mesh>(null);
  const flightMode = useHangarStore((s) => s.flightMode);
  const selectedId = useHangarStore((s) => s.selectedId);
  const floorTex = useMemo(() => radarFloorTexture(), []);
  const sweepTex = useMemo(() => sweepTexture(), []);

  const isAirborneSim = flightMode === 'engineSim' && selectedId !== 'gsuit' && selectedId !== 'pilot-helmet';

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
      const targetY = isAirborneSim ? -18 : -0.02;
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY, Math.min(1, delta * 2.5));
      groupRef.current.visible = groupRef.current.position.y > -16;
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
  return (
    <>
      <ambientLight intensity={0.42} color="#b8d4f0" />
      <directionalLight position={[12, 18, 12]} intensity={1.7} color="#ffffff" castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-14, 10, -10]} intensity={0.85} color="#7fd8ff" />
      <spotLight position={[0, 18, 0]} angle={0.65} penumbra={0.7} intensity={1.2} color="#e6f5ff" />

      {/* Studio Hangar IBL dengan panel softbox Lightformer */}
      <Environment resolution={256} frames={1}>
        <group rotation={[-Math.PI / 3, 0, 1]}>
          <Lightformer form="rect" intensity={3.2} position={[0, 10, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[20, 6, 1]} color="#eef8ff" />
          <Lightformer form="rect" intensity={2.2} position={[0, 10, 8]} rotation={[Math.PI / 2, 0, 0]} scale={[18, 3, 1]} color="#cceeff" />
          <Lightformer form="rect" intensity={2.2} position={[0, 10, -8]} rotation={[Math.PI / 2, 0, 0]} scale={[18, 3, 1]} color="#cceeff" />
          <Lightformer form="rect" intensity={1.6} position={[14, 4, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[16, 4, 1]} color="#7cd8ff" />
          <Lightformer form="rect" intensity={1.4} position={[-14, 4, 0]} rotation={[0, Math.PI / 2, 0]} scale={[16, 4, 1]} color="#ffe5b8" />
          <Lightformer form="ring" intensity={1.1} position={[0, -6, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[22, 22, 1]} color="#0a2844" />
        </group>
      </Environment>
    </>
  );
}

function CameraRig() {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera, size } = useThree();
  const camRequest = useHangarStore((s) => s.camRequest);

  const initial = useMemo(() => getDefaultCamera(), []);
  const desiredPos = useRef(new THREE.Vector3(...initial.pos));
  const desiredTarget = useRef(new THREE.Vector3(...initial.target));
  const animating = useRef(false);

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

  useEffect(() => {
    if (!camRequest) return;
    desiredPos.current.set(...camRequest.pos);
    desiredTarget.current.set(...camRequest.target);
    animating.current = true;
  }, [camRequest]);

  useFrame((_, delta) => {
    if (!animating.current || !controlsRef.current) return;
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
      maxDistance={40}
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
  const initialCam = useMemo(() => getDefaultCamera(), []);

  return (
    <div className="absolute inset-0 bg-[#0a1e3c] touch-none">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: initialCam.pos, fov: 42, near: 0.1, far: 160 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.08 }}
        onPointerMissed={() => clearHotspot()}
      >
        <color attach="background" args={['#0a1e3c']} />
        <fog attach="fog" args={['#0a1e3c', 26, 62]} />

        <StudioLighting />
        <SkyCloudsEnvironment />
        <RadarPlatform />
        <ContactShadows
          position={[0, 0.01, 0]}
          opacity={0.62}
          scale={22}
          blur={1.8}
          far={8}
          resolution={512}
          color="#041024"
        />
        <AircraftModel />
        <CameraRig />
      </Canvas>
    </div>
  );
}
