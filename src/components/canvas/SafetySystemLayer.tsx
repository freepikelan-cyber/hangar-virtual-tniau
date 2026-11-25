import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useHangarStore, useSelectedUnit } from '../../store/useHangarStore';
import { aircraftAudio } from '../../utils/aircraftAudio';

/** Tekstur sprite api lembut realistis (inti putih-kuning -> oranye terang -> tepi merah menyala). */
function makeFireSpriteTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
  g.addColorStop(0.0, 'rgba(255,255,235,1)');
  g.addColorStop(0.22, 'rgba(255,215,64,0.95)');
  g.addColorStop(0.52, 'rgba(255,95,12,0.75)');
  g.addColorStop(0.8, 'rgba(180,25,5,0.28)');
  g.addColorStop(1.0, 'rgba(60,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Tekstur sprite asap hitam pekat bergulung realistis (cloud puff lembut). */
function makeSmokeSpriteTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  for (const [cx, cy, r, a] of [
    [64, 64, 54, 0.72],
    [48, 56, 38, 0.55],
    [80, 60, 36, 0.52],
    [62, 78, 36, 0.48],
  ]) {
    const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, r);
    g.addColorStop(0.0, `rgba(22,26,32,${a})`);
    g.addColorStop(0.55, `rgba(42,48,58,${a * 0.65})`);
    g.addColorStop(1.0, 'rgba(30,36,44,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Simulasi 3D Sistem Keselamatan (Safety Systems) berbasis cerita dramatis & realistis:
 * 1. Tempur & Latih -> Patroli -> Tertembak Rudal (Api Volumetrik + Asap Pekat + Percikan) -> Canopy Jettison & Ejection Seat -> Pilot 3D Utuh Bermanuver dengan Parasut!
 * 2. Angkut & VIP -> Gangguan Mesin di Laut -> Water Ditching -> Perosotan & Life Raft -> Kru & Suar SAR
 * 3. Helikopter -> Autorotasi -> 4 Pelampung Darurat CO2 -> Mengapung di Ombak -> Life Raft & Suar SAR
 */
export function SafetySystemLayer() {
  const unit = useSelectedUnit();
  const safetyMode = useHangarStore((s) => s.safetyMode);
  const safetyNonce = useHangarStore((s) => s.safetyNonce);
  const soundEnabled = useHangarStore((s) => s.soundEnabled);
  const setFlightLabel = useHangarStore((s) => s.setFlightLabel);
  const setSafetyStep = useHangarStore((s) => s.setSafetyStep);

  const timer = useRef(0);
  const sfxPlayed = useRef({ hit: false, eject: false, splash: false });

  // Refs Pesawat Tempur / Latih
  const missileRef = useRef<THREE.Group>(null);
  const explosionRef = useRef<THREE.Group>(null);
  const fireSpritesRef = useRef<(THREE.Sprite | null)[]>([]);
  const smokeSpritesRef = useRef<(THREE.Sprite | null)[]>([]);
  const sparkRefs = useRef<(THREE.Mesh | null)[]>([]);
  const fireLightRef = useRef<THREE.PointLight>(null);

  const canopyFlyRef = useRef<THREE.Group>(null);
  const seatGroupRef = useRef<THREE.Group>(null);
  const seatFrameRef = useRef<THREE.Group>(null);
  const flameRef = useRef<THREE.Mesh>(null);
  const chuteRef = useRef<THREE.Group>(null);
  const sarBeaconRef = useRef<THREE.Mesh>(null);
  const pilotLeftArmRef = useRef<THREE.Group>(null);
  const pilotRightArmRef = useRef<THREE.Group>(null);
  const pilotLegsRef = useRef<THREE.Group>(null);

  // Refs Angkut & VIP
  const transportSmokeRef = useRef<THREE.Group>(null);
  const splashRef = useRef<THREE.Group>(null);
  const raftRef = useRef<THREE.Group>(null);
  const crewRef = useRef<THREE.Group>(null);
  const flareRef = useRef<THREE.Group>(null);

  // Refs Helikopter
  const heliSmokeRef = useRef<THREE.Group>(null);
  const floatsRef = useRef<THREE.Group>(null);
  const heliSplashRef = useRef<THREE.Group>(null);
  const heliRaftRef = useRef<THREE.Group>(null);
  const heliFlareRef = useRef<THREE.Group>(null);

  const fireTex = useMemo(() => makeFireSpriteTexture(), []);
  const smokeTex = useMemo(() => makeSmokeSpriteTexture(), []);

  useEffect(() => {
    return () => {
      fireTex.dispose();
      smokeTex.dispose();
    };
  }, [fireTex, smokeTex]);

  const isEquipment = unit.id === 'gsuit' || unit.id === 'pilot-helmet';
  const isEjection = unit.category === 'Tempur' || unit.category === 'Latih';
  const isHeli = unit.category === 'Helikopter';
  const isTransport = unit.category === 'Angkut & VIP';

  useEffect(() => {
    timer.current = 0;
    sfxPlayed.current = { hit: false, eject: false, splash: false };
    if (!safetyMode) {
      setFlightLabel(null);
      setSafetyStep(0);
    } else {
      setSafetyStep(0);
    }
  }, [safetyMode, safetyNonce, unit.id, setFlightLabel, setSafetyStep]);

  useFrame((state, delta) => {
    if (!safetyMode || isEquipment) return;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    timer.current += dt;
    const st = timer.current;

    if (isEjection) {
      // Animasi partikel api & asap hitam volumetrik yang selalu mengalir dinamis saat explosionRef aktif
      const animateFireAndSmoke = (intensity: number) => {
        fireSpritesRef.current.forEach((sp, i) => {
          if (!sp) return;
          const phase = (t * 2.6 + i * 0.17) % 1;
          const spread = 0.65 + phase * 1.45;
          const ang = i * 2.399;
          sp.position.set(
            Math.cos(ang) * spread * 0.65,
            Math.sin(ang) * spread * 0.5 + phase * 1.1,
            -phase * 4.2,
          );
          const sc = (1.9 + Math.sin(t * 18 + i) * 0.35) * (1 - phase * 0.55) * intensity;
          sp.scale.set(sc, sc, 1);
          const mat = sp.material as THREE.SpriteMaterial;
          mat.opacity = Math.max(0, (1 - phase) * 0.92 * intensity);
        });

        smokeSpritesRef.current.forEach((sp, i) => {
          if (!sp) return;
          const phase = (t * 1.05 + i / 20) % 1;
          const ang = i * 1.92;
          sp.position.set(
            Math.cos(ang) * (0.5 + phase * 2.1),
            0.35 + phase * 3.4 + Math.sin(ang) * 0.5,
            -0.8 - phase * 11.5,
          );
          const sc = (1.6 + phase * 4.6) * intensity;
          sp.scale.set(sc, sc, 1);
          const mat = sp.material as THREE.SpriteMaterial;
          mat.opacity = Math.sin(phase * Math.PI) * 0.78 * intensity;
        });

        sparkRefs.current.forEach((m, i) => {
          if (!m) return;
          const phase = (t * 2.2 + i * 0.13) % 1;
          const ang = i * 1.618 * Math.PI;
          m.position.set(
            Math.cos(ang) * phase * 3.8,
            Math.sin(ang * 1.3) * phase * 3.2 - phase * phase * 1.4,
            -phase * 6.5,
          );
          const sc = Math.max(0.01, (1 - phase) * 1.1 * intensity);
          m.scale.setScalar(sc);
        });

        if (fireLightRef.current) {
          fireLightRef.current.intensity = (10 + Math.sin(t * 32) * 4) * intensity;
        }
      };

      if (st < 3.5) {
        setSafetyStep(0);
        setFlightLabel('BABAK 1 • PATROLI & MANUVER TEMPUR UDARA');
        if (missileRef.current) missileRef.current.visible = false;
        if (explosionRef.current) explosionRef.current.visible = false;
        if (canopyFlyRef.current) canopyFlyRef.current.visible = false;
        if (seatGroupRef.current) seatGroupRef.current.visible = false;
      } else if (st < 5.8) {
        setSafetyStep(1);
        const hitTime = 4.45;
        if (st < hitTime) {
          const p = (st - 3.5) / (hitTime - 3.5);
          if (missileRef.current) {
            missileRef.current.visible = true;
            missileRef.current.position.set(
              THREE.MathUtils.lerp(12.0, 0.2, p),
              THREE.MathUtils.lerp(0.5, 1.5, p),
              THREE.MathUtils.lerp(-16.0, -2.5, p),
            );
            missileRef.current.lookAt(0.2, 1.5, -2.5);
          }
          if (explosionRef.current) explosionRef.current.visible = false;
          setFlightLabel('⚠ PERINGATAN RADAR • RUDAL MUSUH MENDEKAT!');
        } else {
          if (!sfxPlayed.current.hit) {
            sfxPlayed.current.hit = true;
            aircraftAudio.playMissileExplosionSfx(soundEnabled);
          }
          const p = (st - hitTime) / (5.8 - hitTime);
          if (missileRef.current) missileRef.current.visible = false;
          if (explosionRef.current) {
            explosionRef.current.visible = true;
            explosionRef.current.position.set(0, 1.55, -2.4);
            animateFireAndSmoke(0.85 + Math.min(1, p * 2.5) * 0.55);
          }
          setFlightLabel('🔥 MAYDAY! MESIN TERTEMBAK — API & ASAP PEKAT MEMBUBUNG!');
        }
        if (canopyFlyRef.current) canopyFlyRef.current.visible = false;
        if (seatGroupRef.current) seatGroupRef.current.visible = false;
      } else if (st < 8.2) {
        if (!sfxPlayed.current.eject) {
          sfxPlayed.current.eject = true;
          aircraftAudio.playEjectionRocketSfx(soundEnabled);
        }
        setSafetyStep(2);
        const p = (st - 5.8) / 2.4;
        const ease = 1 - Math.pow(1 - p, 2);

        if (missileRef.current) missileRef.current.visible = false;
        if (explosionRef.current) {
          explosionRef.current.visible = true;
          explosionRef.current.position.set(p * 2.8, 1.55 - p * 8.2, -2.4 + p * 4.8);
          animateFireAndSmoke(Math.max(0.2, 1.2 - p * 0.7));
        }

        if (canopyFlyRef.current) {
          canopyFlyRef.current.visible = p < 0.85;
          canopyFlyRef.current.position.set(p * 2.4, 2.55 + p * 4.5, 2.9 - p * 6.0);
          canopyFlyRef.current.rotation.set(-p * 5.5, p * 2.1, p * 3.2);
        }

        if (seatGroupRef.current && chuteRef.current) {
          seatGroupRef.current.visible = true;
          seatGroupRef.current.position.set(0, 2.1 + ease * 4.6, 2.9 - ease * 0.9);
          seatGroupRef.current.rotation.set(-0.2 * (1 - p), 0, 0);
          if (seatFrameRef.current) {
            seatFrameRef.current.visible = true;
            seatFrameRef.current.position.set(0, 0, 0);
            seatFrameRef.current.rotation.set(0, 0, 0);
          }
          if (flameRef.current) {
            flameRef.current.visible = p < 0.72;
            flameRef.current.scale.set(1, 0.85 + Math.sin(t * 55) * 0.3, 1);
          }
          chuteRef.current.visible = false;
        }
        setFlightLabel('🚀 EJECTION SEAT AKTIF! KURSI LONTAR MELONTARKAN PILOT!');
      } else {
        // BABAK 4: PARASUT MENGEMBANG PENUH + PILOT 3D MELAKUKAN MANUVER STEERING SPIRAL & S-TURN DI UDARA!
        setSafetyStep(3);
        const elapsed = st - 8.2;
        const inflate = Math.min(1, elapsed / 1.4);
        if (explosionRef.current) explosionRef.current.visible = false;
        if (canopyFlyRef.current) canopyFlyRef.current.visible = false;

        if (seatGroupRef.current && chuteRef.current) {
          seatGroupRef.current.visible = true;

          // Manuver Parasut Aktif: Spiral & S-Turn mengendalikan arah melayang ke titik pendaratan aman!
          const turnPhase = elapsed * 0.75;
          const steerX = Math.sin(turnPhase) * 3.6;
          const steerZ = 1.8 + Math.cos(turnPhase * 0.8) * 1.4;
          const glideY = 4.6 + Math.sin(turnPhase * 1.5) * 0.45;
          const bankZ = -Math.cos(turnPhase) * 0.28; // Parasut & pilot miring saat belok!
          const yawY = Math.cos(turnPhase) * 0.42;   // Pilot memutar badan mengikuti arah belok parasut!
          const pitchX = 0.08 + Math.sin(turnPhase * 1.5) * 0.06;

          seatGroupRef.current.position.set(steerX, glideY, steerZ);
          seatGroupRef.current.rotation.set(pitchX, yawY, bankZ);

          // Tangan pilot menarik tali kendali (steering toggles) kiri/kanan sesuai arah belok!
          const pullRight = Math.max(0, Math.cos(turnPhase));
          const pullLeft = Math.max(0, -Math.cos(turnPhase));
          if (pilotRightArmRef.current) {
            pilotRightArmRef.current.rotation.x = -2.45 + pullRight * 0.55;
          }
          if (pilotLeftArmRef.current) {
            pilotLeftArmRef.current.rotation.x = -2.45 + pullLeft * 0.55;
          }
          // Kaki pilot mengayun natural mengikuti inersia belokan parasut
          if (pilotLegsRef.current) {
            pilotLegsRef.current.rotation.z = -bankZ * 0.55;
            pilotLegsRef.current.rotation.x = 0.14 + Math.sin(t * 2.2) * 0.08;
          }

          // Kursi lontar terlepas jatuh menjauh dari pilot
          if (seatFrameRef.current) {
            seatFrameRef.current.visible = inflate < 0.92;
            seatFrameRef.current.position.set(inflate * 1.6, -inflate * 8.5, -inflate * 2.0);
            seatFrameRef.current.rotation.set(inflate * 3.2, 0, inflate * 2.4);
          }
          if (flameRef.current) flameRef.current.visible = false;

          chuteRef.current.visible = true;
          const s = THREE.MathUtils.lerp(0.1, 1.0, inflate);
          chuteRef.current.scale.set(s, s, s);
        }

        if (sarBeaconRef.current) {
          const mat = sarBeaconRef.current.material as THREE.MeshBasicMaterial;
          mat.opacity = Math.sin(t * 8) > 0 ? 1 : 0.2;
        }

        const turningDir = Math.cos((st - 8.2) * 0.75) >= 0 ? 'BELOK KANAN (SPIRAL GLIDE)' : 'BELOK KIRI (S-TURN)';
        setFlightLabel(`🪂 PILOT 3D MENGENDALIKAN PARASUT • MANUVER ${turningDir} — BEACON SAR AKTIF`);
      }
    } else if (isTransport) {
      // === CERITA PESAWAT ANGKUT & VIP: GANGGUAN MESIN -> WATER DITCHING -> LIFE RAFT -> SAR ===
      if (st < 3.5) {
        setSafetyStep(0);
        if (transportSmokeRef.current) {
          transportSmokeRef.current.visible = true;
          transportSmokeRef.current.scale.setScalar(0.9 + Math.sin(t * 14) * 0.15);
        }
        if (splashRef.current) splashRef.current.visible = false;
        if (raftRef.current) raftRef.current.visible = false;
        if (crewRef.current) crewRef.current.visible = false;
        if (flareRef.current) flareRef.current.visible = false;
        setFlightLabel('⚠ MAYDAY! GANGGUAN MESIN DI ATAS LAUT — BERSIAP WATER DITCHING');
      } else if (st < 7.0) {
        setSafetyStep(1);
        const p = (st - 3.5) / 3.5;
        if (transportSmokeRef.current) transportSmokeRef.current.visible = p < 0.7;
        if (splashRef.current) {
          const touching = p > 0.45;
          if (touching && !sfxPlayed.current.splash) {
            sfxPlayed.current.splash = true;
            aircraftAudio.playWaterSplashSfx(soundEnabled);
          }
          splashRef.current.visible = touching;
          if (touching) {
            const sp = (p - 0.45) / 0.55;
            const s = Math.sin(sp * Math.PI) * 1.35 + 0.25;
            splashRef.current.scale.set(s, s * 0.85, s);
          }
        }
        if (raftRef.current) raftRef.current.visible = false;
        if (crewRef.current) crewRef.current.visible = false;
        if (flareRef.current) flareRef.current.visible = false;
        setFlightLabel('🌊 WATER DITCHING • PENDARATAN DARURAT DI PERMUKAAN LAUT');
      } else if (st < 10.5) {
        setSafetyStep(2);
        const p = Math.min(1, (st - 7.0) / 2.2);
        const ease = 1 - Math.pow(1 - p, 3);
        if (transportSmokeRef.current) transportSmokeRef.current.visible = false;
        if (splashRef.current) splashRef.current.visible = false;
        if (raftRef.current) {
          raftRef.current.visible = true;
          raftRef.current.scale.set(0.12 + 0.88 * ease, 0.12 + 0.88 * ease, 0.12 + 0.88 * ease);
        }
        if (crewRef.current) crewRef.current.visible = false;
        if (flareRef.current) flareRef.current.visible = false;
        setFlightLabel('🛟 PEROSOTAN EVAKUASI & PERAHU KARET (LIFE RAFT) MENGEMBANG');
      } else {
        setSafetyStep(3);
        if (transportSmokeRef.current) transportSmokeRef.current.visible = false;
        if (splashRef.current) splashRef.current.visible = false;
        if (raftRef.current) {
          raftRef.current.visible = true;
          raftRef.current.scale.set(1, 1, 1);
        }
        if (crewRef.current) crewRef.current.visible = true;
        if (flareRef.current) {
          flareRef.current.visible = true;
          flareRef.current.position.y = 0.8 + Math.sin(t * 2.5) * 0.12;
        }
        setFlightLabel('📡 KRU AMAN DI PERAHU KARET • SUAR ASAP ORANYE & SINYAL SAR AKTIF');
      }
    } else if (isHeli) {
      // === CERITA HELIKOPTER: AUTOROTASI -> PELAMPUNG DARURAT CO2 -> MENGAPUNG -> PERAHU KARET & SAR ===
      if (st < 3.5) {
        setSafetyStep(0);
        if (heliSmokeRef.current) {
          heliSmokeRef.current.visible = true;
          heliSmokeRef.current.scale.setScalar(0.85 + Math.sin(t * 15) * 0.14);
        }
        if (floatsRef.current) floatsRef.current.visible = false;
        if (heliSplashRef.current) heliSplashRef.current.visible = false;
        if (heliRaftRef.current) heliRaftRef.current.visible = false;
        if (heliFlareRef.current) heliFlareRef.current.visible = false;
        setFlightLabel('⚠ GANGGUAN TURBIN DI LAUT • PILOT MELAKUKAN AUTOROTASI TURUN');
      } else if (st < 6.2) {
        setSafetyStep(1);
        const p = Math.min(1, (st - 3.5) / 1.6);
        const ease = 1 - Math.pow(1 - p, 3);
        if (heliSmokeRef.current) heliSmokeRef.current.visible = p < 0.6;
        if (floatsRef.current) {
          floatsRef.current.visible = true;
          floatsRef.current.scale.set(0.18 + 0.82 * ease, 0.15 + 0.85 * ease, 0.22 + 0.78 * ease);
        }
        if (heliSplashRef.current) heliSplashRef.current.visible = false;
        if (heliRaftRef.current) heliRaftRef.current.visible = false;
        if (heliFlareRef.current) heliFlareRef.current.visible = false;
        setFlightLabel('🛟 TABUNG CO2 MEMOMPA 4 PELAMPUNG DARURAT LAUT (EMERGENCY FLOATS)');
      } else if (st < 9.2) {
        setSafetyStep(2);
        const p = (st - 6.2) / 3.0;
        if (heliSmokeRef.current) heliSmokeRef.current.visible = false;
        if (floatsRef.current) {
          floatsRef.current.visible = true;
          floatsRef.current.scale.set(1, 1, 1);
        }
        if (heliSplashRef.current) {
          if (!sfxPlayed.current.splash) {
            sfxPlayed.current.splash = true;
            aircraftAudio.playWaterSplashSfx(soundEnabled);
          }
          heliSplashRef.current.visible = p < 0.55;
          const s = Math.sin(Math.min(1, p / 0.55) * Math.PI) * 1.15 + 0.2;
          heliSplashRef.current.scale.set(s, s * 0.7, s);
        }
        if (heliRaftRef.current) heliRaftRef.current.visible = false;
        if (heliFlareRef.current) heliFlareRef.current.visible = false;
        setFlightLabel('🌊 HELIKOPTER MENDARAT & MENGAPUNG AMAN DI ATAS OMBAK LAUT');
      } else {
        setSafetyStep(3);
        const p = Math.min(1, (st - 9.2) / 1.5);
        const ease = 1 - Math.pow(1 - p, 3);
        if (heliSmokeRef.current) heliSmokeRef.current.visible = false;
        if (floatsRef.current) {
          floatsRef.current.visible = true;
          floatsRef.current.scale.set(1, 1, 1);
        }
        if (heliSplashRef.current) heliSplashRef.current.visible = false;
        if (heliRaftRef.current) {
          heliRaftRef.current.visible = true;
          heliRaftRef.current.scale.set(0.15 + 0.85 * ease, 0.15 + 0.85 * ease, 0.15 + 0.85 * ease);
        }
        if (heliFlareRef.current) {
          heliFlareRef.current.visible = true;
          heliFlareRef.current.position.y = 0.75 + Math.sin(t * 2.5) * 0.12;
        }
        setFlightLabel('📡 LIFE RAFT & SUAR ASAP ORANYE AKTIF — MENUNGGU EVAKUASI SAR');
      }
    }
  });

  if (!safetyMode || isEquipment) return null;

  return (
    <group name="safety-system-3d">
      {/* =====================================================================
          1. CERITA PESAWAT TEMPUR & LATIH: RUDAL -> API & ASAP REALISTIS -> EJECTION -> PILOT 3D MANUVER PARASUT
         ===================================================================== */}
      {isEjection && (
        <>
          {/* Rudal Musuh 3D */}
          <group ref={missileRef} visible={false}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.09, 0.11, 2.2, 12]} />
              <meshStandardMaterial color="#e2e8f0" roughness={0.35} metalness={0.5} />
            </mesh>
            <mesh position={[0, 0, 1.25]} rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.09, 0.4, 12]} />
              <meshStandardMaterial color="#ef4444" roughness={0.4} />
            </mesh>
            <mesh position={[0, 0, -1.65]} rotation={[-Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.2, 1.4, 10]} />
              <meshBasicMaterial color="#fb923c" transparent opacity={0.9} />
            </mesh>
            <mesh position={[0, 0, -3.6]} rotation={[-Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.42, 3.6, 10]} />
              <meshBasicMaterial color="#f1f5f9" transparent opacity={0.48} depthWrite={false} />
            </mesh>
          </group>

          {/* Ledakan Api Volumetrik Realistis + 20 Gumpalan Asap Hitam Pekat + 14 Percikan Api + Cahaya Api */}
          <group ref={explosionRef} visible={false} position={[0, 1.55, -2.4]}>
            <pointLight ref={fireLightRef} color="#ff6a00" intensity={12} distance={18} />
            {/* 16 Sprite Api Menyala (Additive Blending) */}
            {Array.from({ length: 16 }, (_, i) => (
              <sprite
                key={`fire-${i}`}
                ref={(el) => {
                  fireSpritesRef.current[i] = el;
                }}
              >
                <spriteMaterial
                  map={fireTex}
                  transparent
                  opacity={0.9}
                  blending={THREE.AdditiveBlending}
                  depthWrite={false}
                />
              </sprite>
            ))}
            {/* 20 Sprite Asap Hitam Pekat Bergulung */}
            {Array.from({ length: 20 }, (_, i) => (
              <sprite
                key={`smoke-${i}`}
                ref={(el) => {
                  smokeSpritesRef.current[i] = el;
                }}
              >
                <spriteMaterial map={smokeTex} transparent opacity={0.75} depthWrite={false} />
              </sprite>
            ))}
            {/* 14 Percikan Api & Serpihan Menyala */}
            {Array.from({ length: 14 }, (_, i) => (
              <mesh
                key={`spark-${i}`}
                ref={(el) => {
                  sparkRefs.current[i] = el;
                }}
              >
                <sphereGeometry args={[0.075, 6, 6]} />
                <meshBasicMaterial color={i % 2 === 0 ? '#fde047' : '#ff5500'} />
              </mesh>
            ))}
          </group>

          {/* Kanopi Kaca Terlepas (Canopy Jettison) */}
          <group ref={canopyFlyRef} visible={false} position={[0, 2.55, 2.9]}>
            <mesh scale={[0.55, 0.38, 1.35]}>
              <sphereGeometry args={[0.9, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
              <meshPhysicalMaterial color="#38bdf8" transparent opacity={0.45} roughness={0.1} metalness={0.2} />
            </mesh>
          </group>

          {/* Kursi Lontar + FIGUR MANUSIA PILOT 3D LENGKAP (Kepala, Badan, Lengan Tarik Tali, Kaki & Bot) + Parasut */}
          <group ref={seatGroupRef} visible={false} position={[0, 2.1, 2.9]}>
            {/* Struktur Kursi Lontar (terlepas jatuh saat parasut mengembang) */}
            <group ref={seatFrameRef}>
              <mesh position={[0, 0.45, -0.22]}>
                <boxGeometry args={[0.62, 1.2, 0.22]} />
                <meshStandardMaterial color="#27303c" roughness={0.6} metalness={0.45} />
              </mesh>
              <mesh position={[0, -0.1, 0.08]}>
                <boxGeometry args={[0.62, 0.16, 0.56]} />
                <meshStandardMaterial color="#1e2630" roughness={0.7} metalness={0.3} />
              </mesh>
              <mesh position={[0, 1.15, -0.18]}>
                <boxGeometry args={[0.46, 0.34, 0.28]} />
                <meshStandardMaterial color="#3b4554" roughness={0.5} metalness={0.4} />
              </mesh>
              <mesh ref={flameRef} position={[0, -1.05, -0.15]} rotation={[Math.PI, 0, 0]} visible={false}>
                <coneGeometry args={[0.46, 2.3, 16]} />
                <meshBasicMaterial color="#ff7b00" transparent opacity={0.92} />
              </mesh>
            </group>

            {/* === FIGUR ORANG PILOT 3D PENUH & ARTIKULATIF (Skala 1.35x agar sangat jelas terlihat!) === */}
            <group position={[0, 0.1, 0.06]} scale={[1.32, 1.32, 1.32]}>
              {/* Dada & Torso Flight Suit Hijau Zaitun */}
              <mesh position={[0, 0.52, 0]}>
                <capsuleGeometry args={[0.2, 0.4, 10, 16]} />
                <meshStandardMaterial color="#4a5d43" roughness={0.8} />
              </mesh>
              {/* Rompi Pelampung & Sabuk Harness Kuning-Oranye */}
              <mesh position={[0, 0.56, 0.05]}>
                <boxGeometry args={[0.42, 0.42, 0.26]} />
                <meshStandardMaterial color="#364532" roughness={0.82} />
              </mesh>
              {[-0.11, 0.11].map((hx, i) => (
                <mesh key={i} position={[hx, 0.58, 0.19]}>
                  <boxGeometry args={[0.055, 0.48, 0.04]} />
                  <meshStandardMaterial color="#eab308" roughness={0.5} />
                </mesh>
              ))}
              {/* Sabuk pinggang hitam */}
              <mesh position={[0, 0.28, 0.02]}>
                <cylinderGeometry args={[0.22, 0.22, 0.09, 16]} />
                <meshStandardMaterial color="#181c22" roughness={0.8} />
              </mesh>

              {/* Lengan Kiri — terangkat memegang tali kendali parasut kiri! */}
              <group ref={pilotLeftArmRef} position={[-0.25, 0.72, 0.02]} rotation={[-2.45, 0, 0.18]}>
                <mesh position={[0, -0.22, 0]}>
                  <capsuleGeometry args={[0.068, 0.34, 8, 12]} />
                  <meshStandardMaterial color="#4a5d43" roughness={0.8} />
                </mesh>
                {/* Sarung tangan hitam menggenggam steering toggle */}
                <mesh position={[0, -0.44, 0]}>
                  <sphereGeometry args={[0.068, 10, 10]} />
                  <meshStandardMaterial color="#181c22" roughness={0.7} />
                </mesh>
              </group>

              {/* Lengan Kanan — terangkat memegang tali kendali parasut kanan! */}
              <group ref={pilotRightArmRef} position={[0.25, 0.72, 0.02]} rotation={[-2.45, 0, -0.18]}>
                <mesh position={[0, -0.22, 0]}>
                  <capsuleGeometry args={[0.068, 0.34, 8, 12]} />
                  <meshStandardMaterial color="#4a5d43" roughness={0.8} />
                </mesh>
                <mesh position={[0, -0.44, 0]}>
                  <sphereGeometry args={[0.068, 10, 10]} />
                  <meshStandardMaterial color="#181c22" roughness={0.7} />
                </mesh>
              </group>

              {/* Sepasang Kaki Lengkap (Paha, Betis, & Sepatu Bot Hitam) mengayun di udara! */}
              <group ref={pilotLegsRef} position={[0, 0.24, 0]}>
                {[-0.12, 0.12].map((lx, i) => (
                  <group key={i} position={[lx, 0, 0]}>
                    {/* Paha */}
                    <mesh position={[0, -0.22, 0.05]} rotation={[0.18, 0, 0]}>
                      <capsuleGeometry args={[0.088, 0.32, 8, 12]} />
                      <meshStandardMaterial color="#3f503a" roughness={0.82} />
                    </mesh>
                    {/* Betis */}
                    <mesh position={[0, -0.58, 0.04]} rotation={[-0.15, 0, 0]}>
                      <capsuleGeometry args={[0.072, 0.32, 8, 12]} />
                      <meshStandardMaterial color="#3f503a" roughness={0.82} />
                    </mesh>
                    {/* Sepatu Bot Taktis Hitam */}
                    <mesh position={[0, -0.82, 0.08]}>
                      <boxGeometry args={[0.13, 0.14, 0.26]} />
                      <meshStandardMaterial color="#14181f" roughness={0.6} />
                    </mesh>
                  </group>
                ))}
              </group>

              {/* Kepala + Helm Penerbang HGU-55/P + Visor Gelap + Masker Oksigen */}
              <group position={[0, 0.98, 0.02]}>
                <mesh>
                  <sphereGeometry args={[0.19, 18, 16]} />
                  <meshStandardMaterial color="#e2e8f0" roughness={0.28} metalness={0.35} />
                </mesh>
                <mesh position={[0, 0.02, 0.08]}>
                  <sphereGeometry args={[0.165, 16, 12, -Math.PI * 0.38, Math.PI * 0.76, Math.PI * 0.25, Math.PI * 0.36]} />
                  <meshStandardMaterial color="#0f172a" roughness={0.1} metalness={0.92} />
                </mesh>
                <mesh position={[0, -0.08, 0.16]} rotation={[0.35, 0, 0]}>
                  <coneGeometry args={[0.07, 0.13, 10]} />
                  <meshStandardMaterial color="#334155" roughness={0.65} />
                </mesh>
              </group>

              {/* Lampu Beacon Darurat SAR pada bahu pilot */}
              <mesh ref={sarBeaconRef} position={[0.15, 0.76, 0.18]}>
                <sphereGeometry args={[0.055, 10, 10]} />
                <meshBasicMaterial color="#ef4444" transparent opacity={1} />
              </mesh>
            </group>

            {/* Parasut Utama 3D Oranye-Putih */}
            <group ref={chuteRef} position={[0, 1.55, 0]} visible={false}>
              <mesh position={[0, 3.1, 0]}>
                <sphereGeometry args={[2.85, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
                <meshStandardMaterial color="#f97316" roughness={0.62} side={THREE.DoubleSide} />
              </mesh>
              <mesh position={[0, 3.12, 0]}>
                <sphereGeometry args={[2.87, 32, 12, 0, Math.PI * 2, Math.PI * 0.22, Math.PI * 0.14]} />
                <meshStandardMaterial color="#f8fafc" roughness={0.62} side={THREE.DoubleSide} />
              </mesh>
              {Array.from({ length: 10 }, (_, i) => {
                const a = (i / 10) * Math.PI * 2;
                const topX = Math.cos(a) * 2.65;
                const topZ = Math.sin(a) * 2.65;
                const len = Math.hypot(topX, 3.1, topZ);
                const dir = new THREE.Vector3(topX, 3.1, topZ).normalize();
                const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
                return (
                  <mesh key={i} position={[topX / 2, 3.1 / 2, topZ / 2]} quaternion={quat}>
                    <cylinderGeometry args={[0.016, 0.016, len, 6]} />
                    <meshBasicMaterial color="#e2e8f0" />
                  </mesh>
                );
              })}
              <Html position={[0, 6.2, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
                <span className="whitespace-nowrap rounded-md border border-[#ffb703] bg-[#0a1e3c]/92 px-2.5 py-0.5 font-display text-[10px] font-bold tracking-wider text-[#ffb703] uppercase shadow">
                  PILOT SELAMAT • MANUVER PARASUT &amp; BEACON SAR
                </span>
              </Html>
            </group>
          </group>
        </>
      )}

      {/* =====================================================================
          2. CERITA HELIKOPTER DI LAUT: AUTOROTASI -> PELAMPUNG CO2 -> LIFE RAFT & SAR
         ===================================================================== */}
      {isHeli && (
        <>
          <group ref={heliSmokeRef} visible={false} position={[0, 2.4, -0.6]}>
            {[0, 1, 2, 3].map((i) => (
              <sprite key={i} position={[0, i * 0.45, -0.8 - i * 1.1]} scale={[1.2 + i * 0.5, 1.2 + i * 0.5, 1]}>
                <spriteMaterial map={smokeTex} transparent opacity={0.75 - i * 0.14} depthWrite={false} />
              </sprite>
            ))}
          </group>

          <group ref={floatsRef} visible={false}>
            {(unit.id === 'colibri' || unit.id === 'h145' || unit.id === 'as365'
              ? [
                  { pos: [1.28, 0.3, 1.85] as [number, number, number], len: 1.55, r: 0.34 },
                  { pos: [-1.28, 0.3, 1.85] as [number, number, number], len: 1.55, r: 0.34 },
                  { pos: [1.28, 0.3, -0.05] as [number, number, number], len: 1.45, r: 0.34 },
                  { pos: [-1.28, 0.3, -0.05] as [number, number, number], len: 1.45, r: 0.34 },
                ]
              : [
                  { pos: [1.45, 0.62, 2.45] as [number, number, number], len: 1.85, r: 0.44 },
                  { pos: [-1.45, 0.62, 2.45] as [number, number, number], len: 1.85, r: 0.44 },
                  { pos: [1.68, 0.62, -0.45] as [number, number, number], len: 2.35, r: 0.48 },
                  { pos: [-1.68, 0.62, -0.45] as [number, number, number], len: 2.35, r: 0.48 },
                ]
            ).map((f, idx) => (
              <group key={idx} position={f.pos}>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <capsuleGeometry args={[f.r, f.len, 12, 24]} />
                  <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={0.22} roughness={0.38} />
                </mesh>
                {[-f.len * 0.28, f.len * 0.28].map((dz, j) => (
                  <mesh key={j} position={[0, 0, dz]}>
                    <torusGeometry args={[f.r + 0.015, 0.032, 8, 24]} />
                    <meshStandardMaterial color="#1e293b" roughness={0.7} />
                  </mesh>
                ))}
              </group>
            ))}
            <Html position={[2.1, 1.55, 1.1]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
              <span className="whitespace-nowrap rounded-md border border-amber-400 bg-[#0a1e3c]/92 px-2 py-0.5 font-display text-[10px] font-bold tracking-wider text-amber-300 uppercase shadow">
                EMERGENCY FLOATS CO2 AKTIF
              </span>
            </Html>
          </group>

          <group ref={heliSplashRef} visible={false} position={[0, 0.15, 0.8]}>
            {[-2.2, 2.2, -1.5, 1.5].map((sx, i) => (
              <mesh key={i} position={[sx, 0.35, i < 2 ? 0.8 : -0.6]}>
                <icosahedronGeometry args={[0.68, 1]} />
                <meshBasicMaterial color="#e0f2fe" transparent opacity={0.72} depthWrite={false} />
              </mesh>
            ))}
          </group>

          <group ref={heliRaftRef} visible={false} position={[3.35, 0.12, 1.1]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[1.05, 0.26, 14, 28]} />
              <meshStandardMaterial color="#f97316" roughness={0.42} />
            </mesh>
            <mesh position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.98, 24]} />
              <meshStandardMaterial color="#fbbf24" roughness={0.65} />
            </mesh>
            {[-0.36, 0.36].map((cx, i) => (
              <group key={i} position={[cx, 0.22, 0]}>
                <mesh position={[0, 0.15, 0]}>
                  <capsuleGeometry args={[0.16, 0.24, 6, 12]} />
                  <meshStandardMaterial color="#fb923c" roughness={0.6} />
                </mesh>
                <mesh position={[0, 0.45, 0]}>
                  <sphereGeometry args={[0.13, 12, 12]} />
                  <meshStandardMaterial color="#e2e8f0" roughness={0.4} />
                </mesh>
              </group>
            ))}
            <group ref={heliFlareRef} visible={false} position={[0, 0.75, 0]}>
              {[0, 1, 2, 3].map((i) => (
                <mesh key={i} position={[i * 0.12, i * 0.85, -i * 0.15]}>
                  <icosahedronGeometry args={[0.32 + i * 0.16, 1]} />
                  <meshBasicMaterial color="#fb923c" transparent opacity={0.78 - i * 0.16} depthWrite={false} />
                </mesh>
              ))}
            </group>
          </group>
        </>
      )}

      {/* =====================================================================
          3. CERITA PESAWAT ANGKUT & VIP: WATER DITCHING -> SLIDE & LIFE RAFT -> SAR
         ===================================================================== */}
      {isTransport && (
        <>
          <group ref={transportSmokeRef} visible={false} position={[2.6, 1.85, 0.6]}>
            <sprite scale={[1.6, 1.6, 1]}>
              <spriteMaterial map={fireTex} transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
            </sprite>
            {[0, 1, 2, 3, 4].map((i) => (
              <sprite key={i} position={[0, 0.25 + i * 0.35, -0.9 - i * 1.3]} scale={[1.4 + i * 0.6, 1.4 + i * 0.6, 1]}>
                <spriteMaterial map={smokeTex} transparent opacity={0.78 - i * 0.12} depthWrite={false} />
              </sprite>
            ))}
          </group>

          <group ref={splashRef} visible={false} position={[0, 0.25, 0]}>
            {[-3.2, 3.2, -2.4, 2.4, -3.6, 3.6].map((sx, i) => (
              <mesh key={i} position={[sx, 0.45 + (i % 2) * 0.35, 2.2 - i * 0.9]}>
                <icosahedronGeometry args={[0.82, 1]} />
                <meshBasicMaterial color="#e0f2fe" transparent opacity={0.76} depthWrite={false} />
              </mesh>
            ))}
          </group>

          <group ref={raftRef} visible={false}>
            {[1, -1].map((s) => (
              <group key={s} position={[s * 2.45, 0.65, 3.35]} rotation={[0, 0, s * -0.42]}>
                <mesh>
                  <boxGeometry args={[2.8, 0.24, 1.15]} />
                  <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={0.22} roughness={0.45} />
                </mesh>
                <group position={[s * 1.85, -0.58, 0]} rotation={[0, 0, s * 0.42]}>
                  <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[1.15, 0.26, 14, 28]} />
                    <meshStandardMaterial color="#f97316" roughness={0.42} />
                  </mesh>
                  <mesh position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <circleGeometry args={[1.08, 24]} />
                    <meshStandardMaterial color="#fbbf24" roughness={0.65} />
                  </mesh>
                </group>
              </group>
            ))}
            <Html position={[4.2, 1.85, 3.35]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
              <span className="whitespace-nowrap rounded-md border border-amber-400 bg-[#0a1e3c]/92 px-2.5 py-0.5 font-display text-[10px] font-bold tracking-wider text-amber-300 uppercase shadow">
                WATER DITCHING • LIFE RAFT &amp; SUAR SAR
              </span>
            </Html>
          </group>

          <group ref={crewRef} visible={false}>
            {[1, -1].map((s) => (
              <group key={s} position={[s * 4.15, 0.16, 3.35]}>
                {[-0.38, 0.38].map((cx, i) => (
                  <group key={i} position={[cx, 0.22, 0]}>
                    <mesh position={[0, 0.15, 0]}>
                      <capsuleGeometry args={[0.16, 0.24, 6, 12]} />
                      <meshStandardMaterial color="#fb923c" roughness={0.6} />
                    </mesh>
                    <mesh position={[0, 0.45, 0]}>
                      <sphereGeometry args={[0.13, 12, 12]} />
                      <meshStandardMaterial color="#e2e8f0" roughness={0.4} />
                    </mesh>
                  </group>
                ))}
              </group>
            ))}
            <group ref={flareRef} visible={false} position={[4.15, 0.8, 3.35]}>
              {[0, 1, 2, 3].map((i) => (
                <mesh key={i} position={[i * 0.14, i * 0.9, -i * 0.16]}>
                  <icosahedronGeometry args={[0.36 + i * 0.18, 1]} />
                  <meshBasicMaterial color="#fb923c" transparent opacity={0.8 - i * 0.16} depthWrite={false} />
                </mesh>
              ))}
            </group>
          </group>
        </>
      )}
    </group>
  );
}
