import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useHangarStore } from '../../store/useHangarStore';

interface CloudData {
  x: number;
  y: number;
  z: number;
  scale: number;
  speed: number;
  puffs: { ox: number; oy: number; oz: number; r: number }[];
}

/** Membuat tekstur gradasi langit biru cerah + horizon putih lembut untuk Sky Dome. */
function makeBlueSkyTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#134e9e'); // Langit puncak biru tua cerah
  grad.addColorStop(0.32, '#2b7de9'); // Biru langit siang hari
  grad.addColorStop(0.52, '#7cc6ff'); // Biru muda dekat horizon
  grad.addColorStop(0.62, '#d8f0ff'); // Kabut horizon putih kebiruan
  grad.addColorStop(0.75, '#7cb2e6'); // Pantulan langit bawah
  grad.addColorStop(1.0, '#2a5f9e'); // Bawah jauh
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 512);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Lingkungan Langit Biru & Awan 3D Bergerak saat Simulasi Terbang (Take Off, Landing, & Manuver Mesin).
 * Secara otomatis bertransisi halus dari Hanggar Biru TNI AU -> Langit Biru & Awan saat pesawat mengudara!
 */
export function SkyCloudsEnvironment() {
  const { scene } = useThree();
  const flightMode = useHangarStore((s) => s.flightMode);
  const selectedId = useHangarStore((s) => s.selectedId);

  const isEquipment = selectedId === 'gsuit' || selectedId === 'pilot-helmet';
  const isFlying = !isEquipment && flightMode !== 'parked';

  const skyOpacity = useRef(0);
  const skyMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const cloudGroupRefs = useRef<(THREE.Group | null)[]>([]);
  const sunRef = useRef<THREE.Mesh>(null);

  const cloudMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        emissive: '#d8eeff',
        emissiveIntensity: 0.45,
        roughness: 0.95,
        metalness: 0,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    [],
  );

  const hangarBg = useMemo(() => new THREE.Color('#0a1e3c'), []);
  const skyBg = useMemo(() => new THREE.Color('#4aa3f0'), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  const skyTex = useMemo(() => makeBlueSkyTexture(), []);

  // 22 gugusan awan 3D lembut tersebar mengelilingi pesawat (di atas, samping, & bawah)
  const clouds = useMemo<CloudData[]>(() => {
    const list: CloudData[] = [];
    let seed = 4201;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let i = 0; i < 22; i++) {
      // Hindari tepat di tengah pesawat agar awan tidak menabrak badan pesawat secara aneh
      let x = (rand() - 0.5) * 68;
      if (Math.abs(x) < 9.5) x = x >= 0 ? 10 + rand() * 16 : -(10 + rand() * 16);
      const y = -4.5 + rand() * 22;
      const z = -55 + rand() * 110;
      const scale = 1.2 + rand() * 2.2;
      const speed = 12 + rand() * 10;

      const puffCount = 4 + Math.floor(rand() * 3);
      const puffs = Array.from({ length: puffCount }, (_, p) => ({
        ox: (p - puffCount / 2) * 1.15 + (rand() - 0.5) * 0.6,
        oy: (rand() - 0.3) * 0.75,
        oz: (rand() - 0.5) * 1.1,
        r: 1.05 + rand() * 0.85,
      }));
      list.push({ x, y, z, scale, speed, puffs });
    }
    return list;
  }, []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const target = isFlying ? 1 : 0;
    skyOpacity.current = THREE.MathUtils.lerp(skyOpacity.current, target, Math.min(1, dt * 2.4));
    const mix = skyOpacity.current;

    // Transisi halus warna latar belakang & kabut (Hanggar Biru Tua <-> Langit Biru Cerah)
    tmpColor.copy(hangarBg).lerp(skyBg, mix);
    if (scene.background instanceof THREE.Color) {
      scene.background.copy(tmpColor);
    }
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.copy(tmpColor);
      scene.fog.near = THREE.MathUtils.lerp(26, 38, mix);
      scene.fog.far = THREE.MathUtils.lerp(62, 125, mix);
    }

    if (skyMatRef.current) {
      skyMatRef.current.opacity = mix;
      skyMatRef.current.visible = mix > 0.01;
    }
    if (sunRef.current) {
      sunRef.current.visible = mix > 0.05;
    }
    cloudMat.opacity = mix * 0.88;
    cloudMat.visible = mix > 0.01;

    // Gerakkan awan dari depan (+Z) ke belakang (-Z) memberi sensasi melesat di angkasa!
    if (mix > 0.01) {
      const speedMult = flightMode === 'landing' ? 0.65 : flightMode === 'takeoff' ? 1.15 : 1.0;
      clouds.forEach((c, idx) => {
        const grp = cloudGroupRefs.current[idx];
        if (!grp) return;
        grp.visible = true;
        grp.position.z -= c.speed * speedMult * dt;
        if (grp.position.z < -62) {
          grp.position.z = 58;
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
      {/* Kubah Langit Biru Cerah */}
      <mesh>
        <sphereGeometry args={[95, 32, 24]} />
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

      {/* Matahari Hangat di Langit */}
      <mesh ref={sunRef} position={[38, 36, 48]} visible={false}>
        <sphereGeometry args={[4.2, 20, 20]} />
        <meshBasicMaterial color="#fff7d6" fog={false} />
      </mesh>

      {/* Material Awan Putih Lembut Bersama */}
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
            <mesh key={pIdx} position={[p.ox, p.oy, p.oz]} material={cloudMat}>
              <sphereGeometry args={[p.r, 14, 12]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
