import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { flightSync, useHangarStore, useSelectedUnit, type Vec3 } from '../../store/useHangarStore';
import { getPilotSeats } from './CockpitPilotLayer';

export const SALUTE_CYCLE_SEC = 22.0;

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / Math.max(0.0001, edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Ilustrasi 3D Interaktif Tradisi Hormat Teknisi (Crew Chief Salute) TNI AU:
 * - Babak 1 (0.0..5.5s): Teknisi melepas ganjal roda (wheel chocks) & mengangkat pita merah "REMOVE BEFORE FLIGHT".
 * - Babak 2 (5.5..11.0s): Teknisi mundur ke area steril di depan-kiri pesawat, sikap sempurna & memberi Hormat Militer.
 * - Babak 3 (11.0..16.0s): Pilot di dalam kokpit membalas hormat sebagai simbol kepercayaan.
 * - Babak 4 (16.0..22.0s): Teknisi memberi isyarat tongkat marshaller "Clear to Taxi", mesin spool-up & pesawat maju keluar apron.
 */
export function CrewSaluteLayer() {
  const unit = useSelectedUnit();
  const flightMode = useHangarStore((s) => s.flightMode);
  const setSaluteStep = useHangarStore((s) => s.setSaluteStep);
  const requestCamera = useHangarStore((s) => s.requestCamera);

  const crewRootRef = useRef<THREE.Group>(null);
  const hipsRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const rightShoulderRef = useRef<THREE.Group>(null);
  const rightElbowRef = useRef<THREE.Group>(null);
  const leftShoulderRef = useRef<THREE.Group>(null);
  const leftElbowRef = useRef<THREE.Group>(null);

  const groundChocksRef = useRef<THREE.Group>(null);
  const handChocksRef = useRef<THREE.Group>(null);
  const asideChocksRef = useRef<THREE.Group>(null);
  const rbfRibbonRef = useRef<THREE.Group>(null);
  const rbfTailRef = useRef<THREE.Mesh>(null);
  const rightWandRef = useRef<THREE.Group>(null);
  const leftWandRef = useRef<THREE.Group>(null);

  const lastStepRef = useRef<number>(-1);
  const noseGearZ = unit.id === 'kt1b' ? 3.2 : 4.55;

  useEffect(() => {
    lastStepRef.current = -1;
  }, [flightMode, unit.id]);

  useFrame((_, delta) => {
    if (flightMode !== 'salute') return;
    const dt = Math.min(delta, 0.05);
    const cyc = flightSync.phaseTime % SALUTE_CYCLE_SEC;

    // Tentukan babak aktif (0..3) & arahkan kamera sinematik halus saat pergantian babak
    const step = cyc < 5.5 ? 0 : cyc < 11.0 ? 1 : cyc < 16.0 ? 2 : 3;
    if (step !== lastStepRef.current) {
      lastStepRef.current = step;
      setSaluteStep(step);
      const frontSeat = getPilotSeats(unit.id, unit.category)[0];
      const cockpitY = frontSeat ? frontSeat.pos[1] + 0.56 : 2.35;
      const cockpitZ = frontSeat ? frontSeat.pos[2] : 3.5;
      const camPresets: { pos: Vec3; target: Vec3 }[] = [
        // Babak 1: Fokus dekat roda depan & Crew Chief melepas ganjal roda + pita RBF
        { pos: [7.6, 2.7, noseGearZ + 6.4], target: [1.1, 1.45, noseGearZ + 0.4] },
        // Babak 2: Over-the-shoulder / 3/4 menampilkan Crew Chief sikap sempurna hormat ke kokpit
        { pos: [6.4, 2.35, noseGearZ + 6.9], target: [0.8, 1.85, noseGearZ - 0.6] },
        // Babak 3: Close-up presisi sejajar kanopi menyorot Pilot mengangkat tangan kanan membalas hormat!
        { pos: [2.15, cockpitY + 0.52, cockpitZ + 1.85], target: [0.0, cockpitY, cockpitZ] },
        // Babak 4: Wide cinematic menampilkan Crew Chief marshalling & pesawat mulai bergerak taxi keluar apron
        { pos: [11.2, 3.8, noseGearZ + 9.2], target: [0.6, 1.65, noseGearZ + 1.8] },
      ];
      const preset = camPresets[step];
      if (preset) requestCamera(preset.pos, preset.target);
    }

    // --- 1. Posisi & Arah Badan Crew Chief ---
    // Titik A (dekat roda depan): (1.35, 0, noseGearZ + 0.55)
    // Titik B (area steril depan-kiri): (3.25, 0, noseGearZ + 3.15)
    const walkP = smoothstep(4.0, 5.4, cyc);
    const crewX = THREE.MathUtils.lerp(1.35, 3.25, walkP);
    const crewZ = THREE.MathUtils.lerp(noseGearZ + 0.55, noseGearZ + 3.15, walkP);
    // Hadap ke roda saat lepas chocks -> hadap kokpit pesawat (-X, -Z) saat hormat & marshalling
    const rotToNose = -Math.PI * 0.72;
    const rotToCockpit = -Math.PI * 0.78;
    const crewRotY = THREE.MathUtils.lerp(rotToNose, rotToCockpit, walkP);

    if (crewRootRef.current) {
      crewRootRef.current.position.set(crewX, 0, crewZ);
      crewRootRef.current.rotation.y = crewRotY;
    }

    // --- 2. Gerak Jongkok, Berjalan, & Sikap Sempurna ---
    const crouchIn = smoothstep(0.15, 0.85, cyc);
    const crouchOut = 1 - smoothstep(1.85, 2.55, cyc);
    const crouch = crouchIn * crouchOut; // 1 saat jongkok lepas wheel chocks (0.85..1.85s)

    const isWalking = cyc > 4.0 && cyc < 5.4;
    const walkPhase = isWalking ? Math.sin((cyc - 4.0) * 9.5) : 0;
    const walkBob = isWalking ? Math.abs(Math.sin((cyc - 4.0) * 9.5)) * 0.045 : 0;

    if (hipsRef.current) {
      hipsRef.current.position.y = 0.88 - crouch * 0.34 + walkBob;
    }
    if (torsoRef.current) {
      torsoRef.current.rotation.x = crouch * 0.42;
    }
    if (headRef.current) {
      // Menengadah sedikit menatap pilot di kokpit saat mengangkat pita RBF, hormat, & marshalling
      const lookUp = cyc >= 2.2 ? -0.18 : 0.12;
      headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, lookUp, Math.min(1, dt * 6));
      headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, 0.04, Math.min(1, dt * 6));
    }
    if (leftLegRef.current && rightLegRef.current) {
      const lTarget = isWalking ? walkPhase * 0.45 : -crouch * 0.55;
      const rTarget = isWalking ? -walkPhase * 0.45 : -crouch * 0.55;
      leftLegRef.current.rotation.x = THREE.MathUtils.lerp(leftLegRef.current.rotation.x, lTarget, Math.min(1, dt * 10));
      rightLegRef.current.rotation.x = THREE.MathUtils.lerp(rightLegRef.current.rotation.x, rTarget, Math.min(1, dt * 10));
    }

    // --- 3. Artikulasi Lengan Kanan & Kiri (Pita RBF -> Hormat Militer -> Isyarat Marshalling) ---
    let rShX = 0;
    let rShZ = -0.08;
    let rElX = -0.12;
    let rElZ = 0;

    let lShX = 0;
    let lShZ = 0.08;
    let lElX = -0.12;
    let lElZ = 0;

    if (cyc < 2.2) {
      // Meraih & melepas ganjal roda di bawah
      rShX = -0.55 * crouch;
      lShX = -0.68 * crouch;
      rElX = -0.35 * crouch;
      lElX = -0.4 * crouch;
    } else if (cyc < 4.1) {
      // Mengangkat pita merah "REMOVE BEFORE FLIGHT" tinggi di tangan kanan agar dilihat pilot!
      const showP = smoothstep(2.2, 2.7, cyc) * (1 - smoothstep(3.65, 4.1, cyc));
      rShX = -2.35 * showP;
      rShZ = -0.25 * showP;
      rElX = -0.22 * showP;
      // Tangan kiri membawa wheel chocks di samping pinggang
      lShX = -0.22;
      lElX = -0.35;
    } else if (cyc < 5.5) {
      // Berjalan mundur ke posisi steril (ayunan lengan natural)
      rShX = -walkPhase * 0.35;
      lShX = walkPhase * 0.28 - 0.15;
    } else if (cyc < 16.2) {
      // HORMAT MILITER TEGAS dengan TANGAN KANAN ASLI (-X) (Babak 2 & 3: 5.5..16.2s)!
      const salP = smoothstep(5.6, 6.25, cyc) * (1 - smoothstep(15.6, 16.2, cyc));
      // Lengan atas kanan terangkat menyamping-depan, siku menekuk rapi membawa ujung tangan ke pelipis helm
      rShX = -1.18 * salP;
      rShZ = -0.88 * salP;
      rElX = -1.32 * salP;
      rElZ = 0.72 * salP;
      // Tangan kiri lurus rapat di samping paha (sikap sempurna)
      lShX = 0;
      lShZ = -0.04;
      lElX = -0.06;
    } else {
      // Babak 4 (16.2..22.0s): Isyarat Marshalling "CLEAR TO TAXI / MAJU" dengan dua tongkat menyala!
      const waveIn = smoothstep(16.4, 17.0, cyc) * (1 - smoothstep(20.8, 21.6, cyc));
      const beckon = Math.sin((cyc - 16.8) * 4.8);
      // Kedua lengan terangkat ke atas-depan lalu melambai teratur mengarahkan pesawat maju
      rShX = (-1.65 + beckon * 0.42) * waveIn;
      rShZ = -0.35 * waveIn;
      rElX = (-0.95 - beckon * 0.38) * waveIn;

      lShX = (-1.65 + beckon * 0.42) * waveIn;
      lShZ = 0.35 * waveIn;
      lElX = (-0.95 - beckon * 0.38) * waveIn;
    }

    const armLerp = Math.min(1, dt * 9);
    if (rightShoulderRef.current) {
      rightShoulderRef.current.rotation.x = THREE.MathUtils.lerp(rightShoulderRef.current.rotation.x, rShX, armLerp);
      rightShoulderRef.current.rotation.z = THREE.MathUtils.lerp(rightShoulderRef.current.rotation.z, rShZ, armLerp);
    }
    if (rightElbowRef.current) {
      rightElbowRef.current.rotation.x = THREE.MathUtils.lerp(rightElbowRef.current.rotation.x, rElX, armLerp);
      rightElbowRef.current.rotation.z = THREE.MathUtils.lerp(rightElbowRef.current.rotation.z, rElZ, armLerp);
    }
    if (leftShoulderRef.current) {
      leftShoulderRef.current.rotation.x = THREE.MathUtils.lerp(leftShoulderRef.current.rotation.x, lShX, armLerp);
      leftShoulderRef.current.rotation.z = THREE.MathUtils.lerp(leftShoulderRef.current.rotation.z, lShZ, armLerp);
    }
    if (leftElbowRef.current) {
      leftElbowRef.current.rotation.x = THREE.MathUtils.lerp(leftElbowRef.current.rotation.x, lElX, armLerp);
      leftElbowRef.current.rotation.z = THREE.MathUtils.lerp(leftElbowRef.current.rotation.z, lElZ, armLerp);
    }

    // --- 4. Visibilitas Properti (Wheel Chocks, Pita RBF, Tongkat Marshaller) ---
    if (groundChocksRef.current) groundChocksRef.current.visible = cyc < 1.55;
    if (handChocksRef.current) handChocksRef.current.visible = cyc >= 1.55 && cyc < 5.35;
    if (asideChocksRef.current) asideChocksRef.current.visible = cyc >= 5.35;

    if (rbfRibbonRef.current) {
      rbfRibbonRef.current.visible = cyc >= 2.0 && cyc < 4.25;
    }
    if (rbfTailRef.current) {
      // Pita merah berkibar tertiup semburan udara mesin idle
      rbfTailRef.current.rotation.z = Math.sin(cyc * 14) * 0.16;
      rbfTailRef.current.rotation.x = 0.2 + Math.cos(cyc * 11) * 0.1;
    }

    const showWands = cyc >= 16.35 && cyc < 21.8;
    if (rightWandRef.current) rightWandRef.current.visible = showWands;
    if (leftWandRef.current) leftWandRef.current.visible = showWands;
  });

  if (flightMode !== 'salute') return null;

  return (
    <group name="crew-chief-salute-layer">
      {/* 1. Ganjal Roda (Wheel Chocks) di dekat roda depan pesawat (hilang saat diambil teknisi) */}
      <group ref={groundChocksRef} position={[0, 0.08, noseGearZ]}>
        {[-0.36, 0.36].map((dz, i) => (
          <mesh key={i} position={[0, 0, dz]} rotation={[0, Math.PI / 2, 0]}>
            <cylinderGeometry args={[0.09, 0.14, 0.34, 3]} />
            <meshStandardMaterial color="#facc15" roughness={0.6} metalness={0.1} />
          </mesh>
        ))}
        {/* Tali penghubung kuning */}
        <mesh position={[0.16, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.72, 6]} />
          <meshStandardMaterial color="#eab308" roughness={0.8} />
        </mesh>
      </group>

      {/* 2. Ganjal Roda yang sudah diletakkan aman di sisi luar area steril */}
      <group ref={asideChocksRef} position={[4.15, 0.08, noseGearZ + 3.45]} visible={false}>
        {[-0.22, 0.22].map((dz, i) => (
          <mesh key={i} position={[0, 0, dz]} rotation={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.08, 0.13, 0.32, 3]} />
            <meshStandardMaterial color="#facc15" roughness={0.6} />
          </mesh>
        ))}
      </group>

      {/* 3. Garis Marka Apron Kuning Halus untuk Orientasi Area Steril */}
      <mesh position={[3.25, 0.012, noseGearZ + 3.15]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.62, 0.72, 32]} />
        <meshBasicMaterial color="#facc15" transparent opacity={0.42} />
      </mesh>

      {/* 4. Figur 3D Crew Chief / Teknisi Pesawat TNI AU Berengsel Penuh */}
      <group ref={crewRootRef} position={[1.35, 0, noseGearZ + 0.55]}>
        <group ref={hipsRef} position={[0, 0.88, 0]}>
          {/* Pinggul */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.32, 0.14, 0.2]} />
            <meshStandardMaterial color="#2f3f2d" roughness={0.85} />
          </mesh>

          {/* Kaki Kiri */}
          <group ref={leftLegRef} position={[-0.1, -0.05, 0]}>
            <mesh position={[0, -0.22, 0]}>
              <capsuleGeometry args={[0.068, 0.3, 6, 10]} />
              <meshStandardMaterial color="#2f3f2d" roughness={0.85} />
            </mesh>
            <mesh position={[0, -0.58, 0]}>
              <capsuleGeometry args={[0.056, 0.3, 6, 10]} />
              <meshStandardMaterial color="#2a3828" roughness={0.85} />
            </mesh>
            {/* Sepatu Boot PDL Hitam */}
            <mesh position={[0, -0.78, 0.04]}>
              <boxGeometry args={[0.11, 0.11, 0.22]} />
              <meshStandardMaterial color="#111827" roughness={0.75} />
            </mesh>
          </group>

          {/* Kaki Kanan */}
          <group ref={rightLegRef} position={[0.1, -0.05, 0]}>
            <mesh position={[0, -0.22, 0]}>
              <capsuleGeometry args={[0.068, 0.3, 6, 10]} />
              <meshStandardMaterial color="#2f3f2d" roughness={0.85} />
            </mesh>
            <mesh position={[0, -0.58, 0]}>
              <capsuleGeometry args={[0.056, 0.3, 6, 10]} />
              <meshStandardMaterial color="#2a3828" roughness={0.85} />
            </mesh>
            <mesh position={[0, -0.78, 0.04]}>
              <boxGeometry args={[0.11, 0.11, 0.22]} />
              <meshStandardMaterial color="#111827" roughness={0.75} />
            </mesh>
          </group>

          {/* Torso + Rompi Safety High-Vis Ground Crew TNI AU */}
          <group ref={torsoRef} position={[0, 0.08, 0]}>
            {/* Badan Wearpack Hijau Zaitun */}
            <mesh position={[0, 0.25, 0]} scale={[1.12, 1.0, 0.72]}>
              <capsuleGeometry args={[0.16, 0.28, 8, 14]} />
              <meshStandardMaterial color="#364834" roughness={0.84} />
            </mesh>
            {/* Rompi Keselamatan Kuning-Hijau Neon (High-Vis Ground Crew) */}
            <mesh position={[0, 0.25, 0]} scale={[1.16, 0.92, 0.78]}>
              <capsuleGeometry args={[0.16, 0.24, 8, 14]} />
              <meshStandardMaterial color="#d4e615" roughness={0.62} emissive="#4d5c05" emissiveIntensity={0.22} />
            </mesh>
            {/* Garis Reflektif Perak Melintang */}
            <mesh position={[0, 0.19, 0]}>
              <boxGeometry args={[0.38, 0.045, 0.26]} />
              <meshStandardMaterial color="#e2e8f0" roughness={0.22} metalness={0.7} />
            </mesh>
            <mesh position={[0, 0.33, 0]}>
              <boxGeometry args={[0.37, 0.04, 0.25]} />
              <meshStandardMaterial color="#e2e8f0" roughness={0.22} metalness={0.7} />
            </mesh>

            {/* Leher */}
            <mesh position={[0, 0.51, 0]}>
              <cylinderGeometry args={[0.055, 0.062, 0.08, 10]} />
              <meshStandardMaterial color="#c9956b" roughness={0.8} />
            </mesh>

            {/* Kepala + Helm Cranial Ground Crew + Ear Defender */}
            <group ref={headRef} position={[0, 0.64, 0.01]}>
              {/* Wajah */}
              <mesh scale={[0.92, 1.04, 0.96]}>
                <sphereGeometry args={[0.118, 16, 14]} />
                <meshStandardMaterial color="#c9956b" roughness={0.76} />
              </mesh>
              {/* Helm Cranial Putih-Kuning Ground Crew */}
              <mesh position={[0, 0.025, -0.01]} scale={[1.02, 0.96, 1.06]}>
                <sphereGeometry args={[0.128, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
                <meshStandardMaterial color="#f8fafc" roughness={0.32} metalness={0.18} />
              </mesh>
              {/* Strip Biru TNI AU di tengah helm */}
              <mesh position={[0, 0.135, -0.01]}>
                <boxGeometry args={[0.036, 0.025, 0.22]} />
                <meshStandardMaterial color="#1d4ed8" roughness={0.4} />
              </mesh>
              {/* Kacamata Goggle Pelindung Gelap di dahi/mata */}
              <mesh position={[0, 0.02, 0.108]}>
                <boxGeometry args={[0.15, 0.048, 0.03]} />
                <meshStandardMaterial color="#0f172a" roughness={0.15} metalness={0.85} />
              </mesh>
              {/* Ear Defender (Pelindung Telinga Anti-Bising Mesin Jet) kiri & kanan */}
              {[-1, 1].map((side) => (
                <mesh key={side} position={[side * 0.125, -0.005, -0.01]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.052, 0.052, 0.044, 14]} />
                  <meshStandardMaterial color="#facc15" roughness={0.45} />
                </mesh>
              ))}
            </group>

            {/* Lengan Kanan Asli (-X saat menghadap +Z: Pita RBF, Hormat Militer, Tongkat Marshaller) */}
            <group ref={rightShoulderRef} position={[-0.23, 0.44, 0]}>
              <mesh>
                <sphereGeometry args={[0.062, 10, 10]} />
                <meshStandardMaterial color="#364834" roughness={0.84} />
              </mesh>
              {/* Lengan Atas Kanan */}
              <mesh position={[0, -0.14, 0]}>
                <capsuleGeometry args={[0.05, 0.2, 6, 10]} />
                <meshStandardMaterial color="#364834" roughness={0.84} />
              </mesh>
              {/* Siku & Lengan Bawah Kanan */}
              <group ref={rightElbowRef} position={[0, -0.27, 0]}>
                <mesh position={[0, -0.13, 0]}>
                  <capsuleGeometry args={[0.044, 0.2, 6, 10]} />
                  <meshStandardMaterial color="#364834" roughness={0.84} />
                </mesh>
                {/* Sarung Tangan Taktis */}
                <mesh position={[0, -0.27, 0.01]}>
                  <boxGeometry args={[0.055, 0.1, 0.032]} />
                  <meshStandardMaterial color="#1e293b" roughness={0.75} />
                </mesh>

                {/* Properti 1: Pita Merah "REMOVE BEFORE FLIGHT" di tangan kanan */}
                <group ref={rbfRibbonRef} position={[0, -0.32, 0.02]} visible={false}>
                  {/* Ring Pin Logam */}
                  <mesh rotation={[0, Math.PI / 2, 0]}>
                    <torusGeometry args={[0.032, 0.007, 8, 16]} />
                    <meshStandardMaterial color="#e2e8f0" metalness={0.85} roughness={0.25} />
                  </mesh>
                  {/* Pita Merah Panjang Berkibar */}
                  <mesh ref={rbfTailRef} position={[0, -0.24, 0]}>
                    <boxGeometry args={[0.065, 0.42, 0.008]} />
                    <meshStandardMaterial color="#ef4444" emissive="#991b1b" emissiveIntensity={0.35} roughness={0.55} />
                  </mesh>
                </group>

                {/* Properti 2: Tongkat Marshaller Menyala Kanan */}
                <group ref={rightWandRef} position={[0, -0.38, 0.04]} rotation={[0.25, 0, 0]} visible={false}>
                  <mesh position={[0, 0.06, 0]}>
                    <cylinderGeometry args={[0.016, 0.016, 0.12, 8]} />
                    <meshStandardMaterial color="#111827" roughness={0.6} />
                  </mesh>
                  <mesh position={[0, -0.14, 0]}>
                    <cylinderGeometry args={[0.02, 0.022, 0.3, 10]} />
                    <meshStandardMaterial color="#ff6b00" emissive="#ff5500" emissiveIntensity={1.6} roughness={0.3} />
                  </mesh>
                </group>
              </group>
            </group>

            {/* Lengan Kiri Asli (+X saat menghadap +Z: Membawa Wheel Chocks & Tongkat Marshaller Kiri) */}
            <group ref={leftShoulderRef} position={[0.23, 0.44, 0]}>
              <mesh>
                <sphereGeometry args={[0.062, 10, 10]} />
                <meshStandardMaterial color="#364834" roughness={0.84} />
              </mesh>
              <mesh position={[0, -0.14, 0]}>
                <capsuleGeometry args={[0.05, 0.2, 6, 10]} />
                <meshStandardMaterial color="#364834" roughness={0.84} />
              </mesh>
              <group ref={leftElbowRef} position={[0, -0.27, 0]}>
                <mesh position={[0, -0.13, 0]}>
                  <capsuleGeometry args={[0.044, 0.2, 6, 10]} />
                  <meshStandardMaterial color="#364834" roughness={0.84} />
                </mesh>
                <mesh position={[0, -0.27, 0.01]}>
                  <boxGeometry args={[0.055, 0.1, 0.032]} />
                  <meshStandardMaterial color="#1e293b" roughness={0.75} />
                </mesh>

                {/* Wheel Chocks dipegang di tangan kiri saat mundur */}
                <group ref={handChocksRef} position={[0, -0.36, 0.04]} visible={false}>
                  <mesh position={[-0.08, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.065, 0.1, 0.22, 3]} />
                    <meshStandardMaterial color="#facc15" roughness={0.6} />
                  </mesh>
                  <mesh position={[0.08, -0.04, 0.04]} rotation={[0.4, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.065, 0.1, 0.22, 3]} />
                    <meshStandardMaterial color="#facc15" roughness={0.6} />
                  </mesh>
                </group>

                {/* Tongkat Marshaller Menyala Kiri */}
                <group ref={leftWandRef} position={[0, -0.38, 0.04]} rotation={[0.25, 0, 0]} visible={false}>
                  <mesh position={[0, 0.06, 0]}>
                    <cylinderGeometry args={[0.016, 0.016, 0.12, 8]} />
                    <meshStandardMaterial color="#111827" roughness={0.6} />
                  </mesh>
                  <mesh position={[0, -0.14, 0]}>
                    <cylinderGeometry args={[0.02, 0.022, 0.3, 10]} />
                    <meshStandardMaterial color="#ff6b00" emissive="#ff5500" emissiveIntensity={1.6} roughness={0.3} />
                  </mesh>
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}
