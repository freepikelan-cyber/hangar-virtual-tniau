import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useHangarStore, useSelectedUnit } from '../../store/useHangarStore';
import { aircraftAudio } from '../../utils/aircraftAudio';

type CockpitKind = 'fighter' | 'transport' | 'turboprop' | 'helicopter';

function getCockpitKind(unitId: string, category: string): CockpitKind {
  if (category === 'Helikopter') return 'helicopter';
  if (category === 'Angkut & VIP') return 'transport';
  if (unitId === 'supertucano' || unitId === 'kt1b') return 'turboprop';
  return 'fighter';
}

interface CockpitPin {
  id: string;
  label: string;
  pos: [number, number, number];
  desc: string;
}

/** Membuat tekstur layar MFD / HUD / Radar tajam untuk instrumen kokpit 3D. */
function makeScreenTexture(mode: 'hud' | 'radar' | 'pfd' | 'engine' | 'overhead', title: string, tail: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  if (mode === 'hud') {
    ctx.clearRect(0, 0, 512, 512);
    ctx.strokeStyle = '#00ff88';
    ctx.fillStyle = '#00ff88';
    ctx.lineWidth = 3;
    ctx.font = 'bold 24px monospace';

    // Pitch ladder & horizon buatan
    ctx.beginPath();
    ctx.moveTo(95, 256);
    ctx.lineTo(205, 256);
    ctx.moveTo(307, 256);
    ctx.lineTo(417, 256);
    ctx.stroke();

    for (const dy of [-95, -48, 48, 95]) {
      ctx.beginPath();
      ctx.moveTo(165, 256 + dy);
      ctx.lineTo(215, 256 + dy);
      ctx.moveTo(297, 256 + dy);
      ctx.lineTo(347, 256 + dy);
      ctx.stroke();
    }

    // Flight Path Marker / Gun Reticle di tengah
    ctx.beginPath();
    ctx.arc(256, 256, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(222, 256);
    ctx.lineTo(234, 256);
    ctx.moveTo(278, 256);
    ctx.lineTo(290, 256);
    ctx.moveTo(256, 234);
    ctx.lineTo(256, 218);
    ctx.stroke();

    // Speed & Altitude tapes
    ctx.strokeRect(24, 150, 72, 212);
    ctx.strokeRect(416, 150, 72, 212);
    ctx.fillText('SPD', 34, 138);
    ctx.fillText('420', 34, 264);
    ctx.fillText('ALT', 426, 138);
    ctx.fillText('18K', 426, 264);
    ctx.fillText('HDG 045 • TNI AU', 140, 58);
    ctx.fillText(`${tail} • MASTER ARM`, 132, 468);
  } else if (mode === 'radar') {
    ctx.fillStyle = '#051412';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    for (const r of [70, 140, 210]) {
      ctx.beginPath();
      ctx.arc(256, 370, r, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(256, 370);
    ctx.lineTo(80, 120);
    ctx.moveTo(256, 370);
    ctx.lineTo(432, 120);
    ctx.moveTo(256, 370);
    ctx.lineTo(256, 90);
    ctx.stroke();

    // Target blips
    ctx.fillStyle = '#ffb703';
    ctx.fillRect(198, 210, 14, 14);
    ctx.fillRect(318, 172, 14, 14);
    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('AESA RADAR • RWS 80NM', 26, 40);
    ctx.fillText('TWS LOCK: 2 BOGEY', 26, 480);
  } else if (mode === 'pfd') {
    // Artificial Horizon Primary Flight Display
    ctx.fillStyle = '#1864ab';
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = '#6c4824';
    ctx.fillRect(0, 256, 512, 256);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 256);
    ctx.lineTo(512, 256);
    ctx.stroke();

    ctx.strokeStyle = '#ffb703';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(190, 256);
    ctx.lineTo(240, 256);
    ctx.moveTo(272, 256);
    ctx.lineTo(322, 256);
    ctx.stroke();

    ctx.fillStyle = 'rgba(6, 18, 36, 0.85)';
    ctx.fillRect(0, 0, 88, 512);
    ctx.fillRect(424, 0, 88, 512);
    ctx.fillRect(0, 444, 512, 68);
    ctx.fillStyle = '#4da6ff';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('PFD • HORIZON', 155, 36);
    ctx.fillStyle = '#00ff88';
    ctx.fillText('IAS', 18, 120);
    ctx.fillText('340', 18, 260);
    ctx.fillText('ALT', 440, 120);
    ctx.fillText('15K', 440, 260);
    ctx.fillStyle = '#ffb703';
    ctx.fillText(`${title.slice(0, 18).toUpperCase()} • ${tail}`, 24, 486);
  } else if (mode === 'engine') {
    ctx.fillStyle = '#071324';
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = '#4da6ff';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('SYS / ENGINE / FUEL', 26, 40);

    const bars = [
      { label: 'RPM N1', val: 0.88, col: '#00ff88' },
      { label: 'EGT °C', val: 0.72, col: '#ffb703' },
      { label: 'FUEL', val: 0.82, col: '#4da6ff' },
      { label: 'HYD PSI', val: 0.94, col: '#00ff88' },
    ];
    bars.forEach((b, i) => {
      const y = 95 + i * 92;
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(b.label, 28, y + 28);
      ctx.fillStyle = '#142947';
      ctx.fillRect(160, y, 315, 38);
      ctx.fillStyle = b.col;
      ctx.fillRect(160, y, 315 * b.val, 38);
    });
    ctx.fillStyle = '#00ff88';
    ctx.fillText('STATUS: ALL SYSTEMS GO', 26, 480);
  } else {
    // Overhead switch panel texture
    ctx.fillStyle = '#182230';
    ctx.fillRect(0, 0, 512, 512);
    for (let r = 0; r < 6; r++) {
      for (let col = 0; col < 6; col++) {
        const x = 22 + col * 80;
        const y = 26 + r * 78;
        ctx.fillStyle = '#0c131d';
        ctx.fillRect(x, y, 60, 48);
        ctx.fillStyle = (r + col) % 3 === 0 ? '#4da6ff' : (r + col) % 5 === 0 ? '#ffb703' : '#00ff88';
        ctx.fillRect(x + 10, y + 12, 40, 14);
      }
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Ruang Kokpit 3D First-Person (Sudut Pandang Pilot 360°):
 * Otomatis menyesuaikan desain untuk Jet Tempur, Angkut/VIP, Turboprop, dan Helikopter,
 * lengkap dengan pemandangan landasan & langit yang bergerak saat Take Off / Landing / Simulasi Mesin!
 */
export function CockpitView() {
  const unit = useSelectedUnit();
  const flightMode = useHangarStore((s) => s.flightMode);
  const flightNonce = useHangarStore((s) => s.flightNonce);
  const soundEnabled = useHangarStore((s) => s.soundEnabled);
  const showPins = useHangarStore((s) => s.showPins);
  const setFlightState = useHangarStore((s) => s.setFlightState);
  const setFlightLabel = useHangarStore((s) => s.setFlightLabel);

  const kind = getCockpitKind(unit.id, unit.category);
  const [selectedPin, setSelectedPin] = useState<CockpitPin | null>(null);

  const worldRef = useRef<THREE.Group>(null);
  const stickRef = useRef<THREE.Group>(null);
  const throttleRef = useRef<THREE.Group>(null);
  const propRef = useRef<THREE.Group>(null);
  const runwayRef = useRef<THREE.Mesh>(null);
  const phaseTime = useRef(0);

  // Tekstur layar instrumen khusus unit aktif
  const textures = useMemo(() => {
    return {
      hud: makeScreenTexture('hud', unit.name, unit.tailNumber),
      radar: makeScreenTexture('radar', unit.name, unit.tailNumber),
      pfd: makeScreenTexture('pfd', unit.name, unit.tailNumber),
      engine: makeScreenTexture('engine', unit.name, unit.tailNumber),
      overhead: makeScreenTexture('overhead', unit.name, unit.tailNumber),
    };
  }, [unit.name, unit.tailNumber]);

  useEffect(() => {
    return () => {
      Object.values(textures).forEach((t) => t.dispose());
    };
  }, [textures]);

  useEffect(() => {
    phaseTime.current = 0;
  }, [flightMode, flightNonce, unit.id]);

  useEffect(() => {
    setSelectedPin(null);
  }, [unit.id]);

  // Daftar pin edukatif interaktif di dalam kokpit
  const cockpitPins: CockpitPin[] = useMemo(() => {
    if (kind === 'transport') {
      return [
        { id: 'pfd', label: 'Glass Cockpit PFD/ND', pos: [-0.28, 1.18, 1.38], desc: 'Layar avionik digital utama menampilkan horizon buatan, kecepatan udara (IAS), ketinggian, dan rute navigasi GPS.' },
        { id: 'yoke', label: 'Kemudi Yoke Pilot', pos: [-0.24, 0.92, 0.92], desc: 'Kemudi tipe Yoke untuk mengendalikan kemiringan sayap (roll) dan sudut angguk (pitch) pesawat angkut/VIP dengan presisi.' },
        { id: 'throttle', label: 'Konsol Throttle Tengah', pos: [0.32, 0.86, 1.05], desc: 'Tuas pengatur daya mesin di konsol tengah yang dapat dioperasikan oleh Kapten maupun Kopilot saat Take Off dan Landing.' },
        { id: 'overhead', label: 'Overhead Switch Panel', pos: [0.05, 1.92, 1.05], desc: 'Panel sakelar di atas kepala untuk kendali kelistrikan, bahan bakar, hidrolik, sistem anti-es, dan lampu navigasi.' },
        { id: 'eicas', label: 'Layar Status Mesin (EICAS)', pos: [0.24, 1.18, 1.38], desc: 'Memantau putaran turbin, suhu gas buang (EGT), tekanan oli, dan sisa bahan bakar seluruh mesin secara real-time.' },
      ];
    }
    if (kind === 'helicopter') {
      return [
        { id: 'vemd', label: 'Layar Digital VEMD / MFD', pos: [0.0, 1.06, 1.36], desc: 'Vehicle & Engine Multifunction Display yang menampilkan tenaga torsi rotor, suhu turbin, dan horizon buatan helikopter.' },
        { id: 'cyclic', label: 'Tuas Cyclic (Arah Terbang)', pos: [0.0, 0.72, 0.88], desc: 'Tuas di antara lutut pilot untuk memiringkan piringan rotor utama agar helikopter bergerak maju, mundur, ke kiri, atau kanan.' },
        { id: 'collective', label: 'Tuas Collective (Naik-Turun)', pos: [-0.52, 0.76, 0.72], desc: 'Tuas di sisi kiri pilot yang mengubah sudut seluruh bilah rotor serentak untuk mengatur ketinggian vertikal (hover & climb).' },
        { id: 'glass', label: 'Kaca Panoramik & Jendela Bawah', pos: [0.0, 1.56, 1.52], desc: 'Kaca kokpit super luas hingga ke bawah kaki pilot agar mudah melihat landasan sempit, dek kapal, atau lokasi evakuasi SAR.' },
        { id: 'overhead', label: 'Panel Rotor Brake & Mesin', pos: [0.0, 1.94, 0.92], desc: 'Panel atas kepala untuk menyalakan mesin turboshaft, mengaktifkan rem rotor, dan sakelar sistem kelistrikan.' },
      ];
    }
    if (kind === 'turboprop') {
      return [
        { id: 'hud', label: 'HUD & Bidikan Optik', pos: [0, 1.48, 1.38], desc: 'Kaca proyeksi transparan di depan mata pilot menampilkan kecepatan, ketinggian, dan bidikan presisi tanpa menunduk.' },
        { id: 'mfd', label: 'Layar Avionik Digital MFD', pos: [-0.30, 1.08, 1.36], desc: 'Layar multifungsi untuk navigasi peta taktis, indikator horizon digital, serta pelatihan instrumen siswa penerbang.' },
        { id: 'stick', label: 'Center Control Stick', pos: [0, 0.78, 0.85], desc: 'Tuas kendali tengah responsif untuk manuver aerobatik, roll cepat, dan latihan tempur dasar maupun serang darat.' },
        { id: 'power', label: 'Power Lever Turboprop', pos: [-0.56, 0.88, 0.96], desc: 'Tuas pengatur tenaga mesin turboprop dan sudut pitch baling-baling di konsol kiri pilot.' },
        { id: 'eject', label: 'Tuas Kursi Lontar Martin-Baker', pos: [0, 0.48, 0.62], desc: 'Tuas tarik kuning-hitam di antara kaki pilot untuk melontarkan diri secara aman dalam kondisi darurat (Zero-Zero Ejection).' },
      ];
    }
    // Fighter jet
    return [
      { id: 'hud', label: 'HUD (Head-Up Display)', pos: [0, 1.52, 1.38], desc: 'Kaca proyeksi holografis hijau di garis pandang pilot: menampilkan kecepatan, ketinggian, horizon buatan, dan kunci target rudal.' },
      { id: 'radar', label: 'MFD Kiri • Radar AESA', pos: [-0.36, 1.08, 1.36], desc: 'Layar multifungsi kiri menampilkan sapuan radar tempur jarak jauh untuk mendeteksi dan mengunci pesawat musuh.' },
      { id: 'engine', label: 'MFD Kanan • Mesin & Senjata', pos: [0.36, 1.08, 1.36], desc: 'Layar multifungsi kanan memantau status afterburner, bahan bakar internal, serta kesiapan rudal dan kanon 20/30 mm.' },
      { id: 'stick', label: 'HOTAS Flight Stick', pos: [0.46, 0.84, 0.88], desc: 'Tuas kendali Hands-On Throttle-and-Stick yang penuh tombol tembak & radar sehingga pilot tidak perlu melepas pegangan saat dogfight.' },
      { id: 'throttle', label: 'Throttle Afterburner', pos: [-0.54, 0.88, 0.94], desc: 'Tuas pendorong di sisi kiri untuk mengatur daya mesin turbofan hingga mode Afterburner penuh saat Take Off atau mengejar target.' },
      { id: 'eject', label: 'Tuas Kursi Lontar Zero-Zero', pos: [0, 0.48, 0.62], desc: 'Tuas tarik darurat kuning-hitam yang melontarkan kursi pilot keluar kanopi secara aman bahkan saat pesawat berhenti di darat.' },
    ];
  }, [kind]);

  // Animasi luar jendela (landasan + langit bergerak), tuas kendali, baling-baling/rotor, & audio!
  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    phaseTime.current += dt;
    const pt = phaseTime.current;

    let pitch = 0;
    let roll = 0;
    let alt = 0;
    let speed = 0;
    let throttlePos = 0;

    if (flightMode === 'takeoff') {
      if (pt < 1.5) {
        speed = (pt / 1.5) * 4;
        throttlePos = 0.85;
        setFlightLabel('KOKPIT • TAKE OFF: FULL POWER & ANCANG-ANCANG');
      } else if (pt < 3.6) {
        const p = (pt - 1.5) / 2.1;
        speed = 4 + p * 26;
        throttlePos = 1.0;
        setFlightLabel('KOKPIT • TAKE OFF: AKSELERASI LANDASAN');
      } else if (pt < 6.8) {
        const p = (pt - 3.6) / 3.2;
        speed = 30;
        pitch = kind === 'helicopter' ? -0.06 : 0.22 * Math.sin(p * Math.PI * 0.65);
        alt = p * 14;
        throttlePos = 1.0;
        setFlightLabel('KOKPIT • TAKE OFF: ROTATE & MENANJAK');
      } else {
        speed = 24;
        alt = 14 + Math.sin(t * 1.4) * 0.4;
        pitch = 0.04;
        roll = Math.sin(t * 0.9) * 0.05;
        throttlePos = 0.75;
        setFlightLabel('KOKPIT • TERBANG JELAJAH STABIL');
      }
    } else if (flightMode === 'landing') {
      if (pt < 4.5) {
        const p = pt / 4.5;
        speed = 20;
        alt = THREE.MathUtils.lerp(12, 0.2, p);
        pitch = -0.08 * (1 - p);
        throttlePos = 0.45;
        setFlightLabel('KOKPIT • LANDING: FINAL APPROACH KE LANDASAN');
      } else if (pt < 7.2) {
        const p = (pt - 4.5) / 2.7;
        speed = THREE.MathUtils.lerp(18, 0, p);
        alt = 0;
        pitch = 0.06 * (1 - p);
        throttlePos = 0.1;
        setFlightLabel('KOKPIT • LANDING: TOUCHDOWN & PENGEREMAN');
      } else {
        setFlightState('parked', null);
      }
    } else if (flightMode === 'engineSim') {
      const cycle = pt % 16;
      speed = 26;
      alt = 16;
      throttlePos = 0.88;
      if (cycle < 4) {
        const s = Math.sin((cycle / 4) * Math.PI);
        roll = -0.32 * s;
        setFlightLabel('KOKPIT • MANUVER BELOK KANAN');
      } else if (cycle < 8) {
        const s = Math.sin(((cycle - 4) / 4) * Math.PI);
        roll = 0.32 * s;
        setFlightLabel('KOKPIT • MANUVER BELOK KIRI');
      } else if (cycle < 12) {
        const s = Math.sin(((cycle - 8) / 4) * Math.PI);
        pitch = 0.24 * s;
        alt = 16 + s * 6;
        setFlightLabel('KOKPIT • MANUVER MENANJAK (ATAS)');
      } else {
        const s = Math.sin(((cycle - 12) / 4) * Math.PI);
        pitch = -0.20 * s;
        alt = 16 - s * 5;
        setFlightLabel('KOKPIT • MANUVER MENUKIK (BAWAH)');
      }
    }

    // Dunia luar (landasan & langit) bergerak relatif terhadap kokpit agar sensasi terbang terasa nyata!
    if (worldRef.current) {
      worldRef.current.rotation.x = THREE.MathUtils.lerp(worldRef.current.rotation.x, pitch, Math.min(1, dt * 4));
      worldRef.current.rotation.z = THREE.MathUtils.lerp(worldRef.current.rotation.z, -roll, Math.min(1, dt * 4));
      worldRef.current.position.y = THREE.MathUtils.lerp(worldRef.current.position.y, -alt, Math.min(1, dt * 3));
    }
    if (runwayRef.current && speed > 0.1) {
      runwayRef.current.position.z = ((runwayRef.current.position.z - speed * dt) % 12) + 6;
    }

    // Animasi tuas kendali (Stick / Yoke / Cyclic) & Throttle
    if (stickRef.current) {
      stickRef.current.rotation.x = THREE.MathUtils.lerp(stickRef.current.rotation.x, -pitch * 0.9, Math.min(1, dt * 6));
      stickRef.current.rotation.z = THREE.MathUtils.lerp(stickRef.current.rotation.z, roll * 0.9, Math.min(1, dt * 6));
    }
    if (throttleRef.current) {
      throttleRef.current.rotation.x = THREE.MathUtils.lerp(throttleRef.current.rotation.x, throttlePos * 0.55, Math.min(1, dt * 5));
    }
    if (propRef.current) {
      const spinSpeed = flightMode === 'parked' ? 0.6 : 22;
      if (kind === 'helicopter') propRef.current.rotation.y += dt * spinSpeed;
      else propRef.current.rotation.z += dt * spinSpeed;
    }

    aircraftAudio.update(unit.id, flightMode, pt, soundEnabled);
  });

  const darkPanelMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1b222c', roughness: 0.62, metalness: 0.35 }), []);
  const consoleMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#131922', roughness: 0.72, metalness: 0.25 }), []);
  const metalMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8a98a8', roughness: 0.3, metalness: 0.85 }), []);
  const frameMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0d131c', roughness: 0.45, metalness: 0.5 }), []);
  const amberMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffb703', emissive: '#ffb703', emissiveIntensity: 0.55 }), []);

  return (
    <group name="cockpit-3d-root">
      {/* Pencahayaan khusus ruang kokpit agar instrumen & konsol terbaca sangat jelas */}
      <pointLight position={[0, 1.75, 0.35]} intensity={1.8} distance={6} color="#bfe0ff" />
      <pointLight position={[0, 1.15, 1.15]} intensity={1.2} distance={4} color="#00ffaa" />

      {/* =====================================================================
          DUNIA LUAR KOKPIT (LANDASAN, GARIS TENGAH, HORIZON & LANGIT)
          Bergerak mengikuti Take Off / Landing / Manuver Simulasi Mesin!
         ===================================================================== */}
      <group ref={worldRef} name="cockpit-outside-world">
        {/* Lantai landasan udara & garis landasan */}
        <mesh position={[0, -0.8, 22]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[180, 180]} />
          <meshStandardMaterial color="#0b2244" roughness={0.85} />
        </mesh>
        <mesh ref={runwayRef} position={[0, -0.76, 20]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[12, 160]} />
          <meshStandardMaterial color="#1f2937" roughness={0.9} />
        </mesh>
        {/* Marka garis tengah landasan */}
        {Array.from({ length: 14 }, (_, i) => (
          <mesh key={i} position={[0, -0.73, 4 + i * 9]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.35, 4.2]} />
            <meshBasicMaterial color="#e2e8f0" />
          </mesh>
        ))}
        {/* Lampu tepi landasan biru/kuning */}
        {Array.from({ length: 12 }, (_, i) => (
          <group key={`l-${i}`}>
            <mesh position={[-6.2, -0.6, 6 + i * 10]}>
              <sphereGeometry args={[0.16, 8, 8]} />
              <meshBasicMaterial color="#4da6ff" />
            </mesh>
            <mesh position={[6.2, -0.6, 6 + i * 10]}>
              <sphereGeometry args={[0.16, 8, 8]} />
              <meshBasicMaterial color="#4da6ff" />
            </mesh>
          </group>
        ))}
      </group>

      {/* =====================================================================
          INTERIOR KOKPIT 3D (DIBANGUN SESUAI KATEGORI PESAWAT)
         ===================================================================== */}
      {/* Lantai kokpit & dinding samping bawah */}
      <mesh position={[0, 0.22, 0.65]} material={consoleMat}>
        <boxGeometry args={[kind === 'transport' ? 2.4 : 1.45, 0.08, 2.2]} />
      </mesh>

      {/* Kursi Pilot (di belakang posisi kamera, terlihat saat menoleh ke belakang!) */}
      <group position={[kind === 'transport' ? -0.35 : 0, 0.72, -0.38]}>
        <mesh material={darkPanelMat}>
          <boxGeometry args={[0.62, 1.18, 0.16]} />
        </mesh>
        <mesh position={[0, 0.72, 0.02]} material={consoleMat}>
          <boxGeometry args={[0.42, 0.28, 0.18]} />
        </mesh>
        {/* Sabuk bahu & tuas kursi lontar kuning-hitam untuk jet tempur & latih */}
        {(kind === 'fighter' || kind === 'turboprop') && (
          <mesh position={[0, -0.24, 0.98]} rotation={[0.4, 0, 0]} material={amberMat}>
            <torusGeometry args={[0.075, 0.022, 10, 20]} />
          </mesh>
        )}
      </group>

      {/* Konsol Samping Kiri & Kanan */}
      <mesh position={[kind === 'transport' ? -1.05 : -0.66, 0.72, 0.68]} material={consoleMat}>
        <boxGeometry args={[0.32, 0.56, 1.55]} />
      </mesh>
      <mesh position={[kind === 'transport' ? 1.05 : 0.66, 0.72, 0.68]} material={consoleMat}>
        <boxGeometry args={[0.32, 0.56, 1.55]} />
      </mesh>
      {/* Indikator tombol menyala di konsol kiri & kanan */}
      {[-0.3, 0.1, 0.5, 0.9].map((z, i) => (
        <group key={i}>
          <mesh position={[kind === 'transport' ? -1.02 : -0.64, 1.01, z]}>
            <boxGeometry args={[0.18, 0.02, 0.16]} />
            <meshBasicMaterial color={i % 2 === 0 ? '#00ff88' : '#4da6ff'} />
          </mesh>
          <mesh position={[kind === 'transport' ? 1.02 : 0.64, 1.01, z]}>
            <boxGeometry args={[0.18, 0.02, 0.16]} />
            <meshBasicMaterial color={i === 1 ? '#ffb703' : '#4da6ff'} />
          </mesh>
        </group>
      ))}

      {/* ---- DASHBOARD UTAMA & LAYAR AVIONIK ---- */}
      <mesh position={[0, 0.96, 1.44]} rotation={[-0.18, 0, 0]} material={darkPanelMat}>
        <boxGeometry args={[kind === 'transport' ? 2.25 : 1.38, 0.62, 0.36]} />
      </mesh>
      {/* Glareshield pelindung silau di atas dashboard */}
      <mesh position={[0, 1.28, 1.38]} material={frameMat}>
        <boxGeometry args={[kind === 'transport' ? 2.3 : 1.42, 0.08, 0.56]} />
      </mesh>

      {kind === 'transport' ? (
        <>
          {/* 4 Layar Glass Cockpit Lebar (PFD, ND, EICAS, System) */}
          {[-0.68, -0.24, 0.24, 0.68].map((x, idx) => (
            <mesh key={idx} position={[x, 1.04, 1.24]} rotation={[-0.18, Math.PI, 0]}>
              <planeGeometry args={[0.36, 0.36]} />
              <meshBasicMaterial map={idx % 2 === 0 ? textures.pfd : idx === 1 ? textures.radar : textures.engine} />
            </mesh>
          ))}
          {/* Overhead Panel penuh tombol di atas kepala */}
          <mesh position={[0, 2.02, 0.95]} rotation={[0.55, Math.PI, 0]}>
            <planeGeometry args={[1.45, 0.72]} />
            <meshBasicMaterial map={textures.overhead} />
          </mesh>
          {/* Konsol Throttle Tengah (4 tuas untuk C-130J, 2 tuas untuk B737) */}
          <group ref={throttleRef} position={[0.25, 0.72, 1.02]}>
            {(unit.id === 'c130j' ? [-0.15, -0.05, 0.05, 0.15] : [-0.07, 0.07]).map((tx, i) => (
              <group key={i} position={[tx, 0, 0]}>
                <mesh position={[0, 0.12, 0]} material={metalMat}>
                  <cylinderGeometry args={[0.015, 0.018, 0.26, 10]} />
                </mesh>
                <mesh position={[0, 0.26, 0]} material={frameMat}>
                  <boxGeometry args={[0.06, 0.05, 0.08]} />
                </mesh>
              </group>
            ))}
          </group>
          {/* Kemudi Yoke Pilot */}
          <group ref={stickRef} position={[-0.26, 0.55, 0.92]}>
            <mesh position={[0, 0.22, 0]} material={metalMat}>
              <cylinderGeometry args={[0.032, 0.038, 0.44, 14]} />
            </mesh>
            <mesh position={[0, 0.42, 0]} material={frameMat}>
              <boxGeometry args={[0.42, 0.08, 0.07]} />
            </mesh>
            {[-0.19, 0.19].map((hx, i) => (
              <mesh key={i} position={[hx, 0.50, 0]} material={frameMat}>
                <cylinderGeometry args={[0.03, 0.03, 0.22, 12]} />
              </mesh>
            ))}
          </group>
          {/* Bingkai Kaca Kokpit Multi-Pane */}
          {[-0.95, 0, 0.95].map((px, i) => (
            <mesh key={i} position={[px, 1.65, 1.48]} rotation={[-0.22, 0, 0]} material={frameMat}>
              <boxGeometry args={[0.08, 0.85, 0.08]} />
            </mesh>
          ))}
        </>
      ) : (
        <>
          {/* 3 Layar MFD Digital (Kiri: Radar, Tengah: PFD, Kanan: Engine/System) */}
          <mesh position={[-0.38, 1.04, 1.24]} rotation={[-0.18, Math.PI, 0]}>
            <planeGeometry args={[0.32, 0.32]} />
            <meshBasicMaterial map={textures.radar} />
          </mesh>
          <mesh position={[0, 1.02, 1.24]} rotation={[-0.18, Math.PI, 0]}>
            <planeGeometry args={[0.32, 0.32]} />
            <meshBasicMaterial map={textures.pfd} />
          </mesh>
          <mesh position={[0.38, 1.04, 1.24]} rotation={[-0.18, Math.PI, 0]}>
            <planeGeometry args={[0.32, 0.32]} />
            <meshBasicMaterial map={textures.engine} />
          </mesh>

          {/* Kaca HUD Holografis Hijau Menyala (untuk Jet Tempur & Turboprop) */}
          {(kind === 'fighter' || kind === 'turboprop') && (
            <group position={[0, 1.48, 1.32]}>
              <mesh rotation={[-0.32, Math.PI, 0]}>
                <planeGeometry args={[0.52, 0.44]} />
                <meshBasicMaterial
                  map={textures.hud}
                  transparent
                  opacity={0.92}
                  blending={THREE.AdditiveBlending}
                  depthWrite={false}
                />
              </mesh>
              {/* Kaca combiner HUD */}
              <mesh rotation={[-0.32, 0, 0]}>
                <boxGeometry args={[0.54, 0.46, 0.012]} />
                <meshPhysicalMaterial color="#00ffaa" transparent opacity={0.14} roughness={0.05} metalness={0.1} depthWrite={false} />
              </mesh>
              {[-0.27, 0.27].map((sx, i) => (
                <mesh key={i} position={[sx, -0.05, 0]} rotation={[-0.32, 0, 0]} material={frameMat}>
                  <boxGeometry args={[0.025, 0.46, 0.04]} />
                </mesh>
              ))}
            </group>
          )}

          {/* Tuas Kendali (HOTAS Sidestick / Center Stick / Cyclic) */}
          <group
            ref={stickRef}
            position={[kind === 'fighter' && (unit.id === 'f16id' || unit.id === 'rafale') ? 0.48 : 0, 0.56, 0.86]}
          >
            <mesh position={[0, 0.18, 0]} material={frameMat}>
              <cylinderGeometry args={[0.028, 0.042, 0.38, 14]} />
            </mesh>
            <mesh position={[0, 0.38, -0.02]} material={darkPanelMat}>
              <boxGeometry args={[0.065, 0.14, 0.08]} />
            </mesh>
            <mesh position={[0, 0.44, -0.05]}>
              <sphereGeometry args={[0.022, 10, 10]} />
              <meshBasicMaterial color="#ef4444" />
            </mesh>
          </group>

          {/* Tuas Throttle / Collective di sisi kiri */}
          <group ref={throttleRef} position={[-0.54, 0.84, 0.92]}>
            <mesh position={[0, 0.10, 0]} material={metalMat}>
              <cylinderGeometry args={[0.018, 0.022, 0.22, 10]} />
            </mesh>
            <mesh position={[0.04, 0.20, 0]} rotation={[0, 0, Math.PI / 2]} material={frameMat}>
              <cylinderGeometry args={[0.04, 0.04, 0.18, 14]} />
            </mesh>
          </group>

          {/* Lengkung Kanopi / Kaca Panoramik Helikopter */}
          <mesh position={[0, 1.38, 0.65]} rotation={[0, 0, 0]}>
            <torusGeometry args={[0.88, 0.032, 10, 36, Math.PI]} />
            <meshStandardMaterial color="#161f2c" roughness={0.4} metalness={0.6} />
          </mesh>
          {kind === 'helicopter' && (
            <>
              {/* Panel atas helikopter */}
              <mesh position={[0, 2.02, 0.95]} rotation={[0.55, Math.PI, 0]}>
                <planeGeometry args={[1.05, 0.52]} />
                <meshBasicMaterial map={textures.overhead} />
              </mesh>
              {/* Bayangan putaran rotor utama di atas kaca atap */}
              <group ref={propRef} position={[0, 2.45, 0.4]}>
                {[0, 1, 2, 3].map((i) => (
                  <mesh key={i} rotation={[0, (i * Math.PI) / 2, 0]}>
                    <boxGeometry args={[7.5, 0.025, 0.24]} />
                    <meshStandardMaterial color="#1e293b" transparent opacity={0.55} />
                  </mesh>
                ))}
              </group>
            </>
          )}

          {/* Baling-baling depan berputar untuk Turboprop (Super Tucano & KT-1B) */}
          {kind === 'turboprop' && (
            <group position={[0, 1.12, 3.2]}>
              <mesh rotation={[Math.PI / 2, 0, 0]} material={darkPanelMat}>
                <cylinderGeometry args={[0.38, 0.52, 1.8, 20]} />
              </mesh>
              <group ref={propRef} position={[0, 0, 0.95]}>
                {[0, 1, 2, 3].map((i) => (
                  <mesh key={i} rotation={[0, 0, (i * Math.PI) / 2]}>
                    <boxGeometry args={[0.16, 2.6, 0.03]} />
                    <meshStandardMaterial color="#1f2937" transparent opacity={0.42} />
                  </mesh>
                ))}
              </group>
            </group>
          )}
        </>
      )}

      {/* =====================================================================
          PIN EDUKATIF INTERAKTIF DI DALAM KOKPIT (TAMPIL SAAT PIN HOTSPOT AKTIF)
         ===================================================================== */}
      {showPins &&
        cockpitPins.map((pin, idx) => {
          const active = selectedPin?.id === pin.id;
          return (
            <group key={pin.id} position={pin.pos}>
              <Html center distanceFactor={3.5} zIndexRange={[20, 0]}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPin(active ? null : pin);
                  }}
                  title={pin.label}
                  className={`flex h-7 w-7 items-center justify-center rounded-full border-2 font-display text-xs font-bold transition-transform cursor-pointer ${
                    active
                      ? 'scale-125 border-[#ffb703] bg-[#ffb703] text-[#0a1e3c] shadow-[0_0_14px_rgba(255,183,3,0.9)]'
                      : 'border-[#4da6ff] bg-[#0a1e3c]/90 text-[#75bcff] hover:scale-110'
                  }`}
                >
                  {idx + 1}
                </button>
              </Html>
            </group>
          );
        })}

      {/* Kartu penjelasan pin kokpit (mengambang rapi di bawah-tengah jika pin kokpit diklik) */}
      {selectedPin && (
        <Html fullscreen style={{ pointerEvents: 'none' }}>
          <div className="pointer-events-auto fixed bottom-[134px] sm:bottom-[144px] left-1/2 z-40 w-[min(460px,calc(100vw-1.5rem))] -translate-x-1/2 rounded-xl border border-[#ffb703]/60 bg-[#0a1e3c]/95 p-3.5 shadow-[0_12px_36px_rgba(2,10,28,0.85)] backdrop-blur-md">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="font-display text-[10px] font-bold tracking-[0.18em] text-[#ffb703] uppercase">
                  INSTRUMEN KOKPIT 3D
                </span>
                <h4 className="font-display text-sm sm:text-base font-bold text-white">{selectedPin.label}</h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPin(null)}
                className="rounded-lg border border-slate-700 bg-[#0e2a54] px-2 py-1 font-display text-xs text-slate-200 hover:border-[#ffb703] cursor-pointer"
              >
                Tutup
              </button>
            </div>
            <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-slate-200">{selectedPin.desc}</p>
          </div>
        </Html>
      )}
    </group>
  );
}
