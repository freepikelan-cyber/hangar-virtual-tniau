import * as THREE from 'three';

/** Deterministic 2D hash & smooth value noise for procedural mountain/island terrain. */
function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

function valueNoise2D(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

/** Ridged multifractal noise menghasilkan punggungan gunung tajam & lembah alami. */
function ridgedFbm(x: number, y: number): number {
  let sum = 0;
  let amp = 0.55;
  let freq = 1;
  for (let i = 0; i < 4; i++) {
    const n = valueNoise2D(x * freq, y * freq);
    const ridge = 1 - Math.abs(n * 2 - 1);
    sum += ridge * ridge * amp;
    freq *= 2.05;
    amp *= 0.48;
  }
  return sum;
}

/**
 * Membuat geometri pegunungan 3D nyata (heightmap displaced mesh) dengan lembah sungai di tengah,
 * lereng hutan hijau tropis, tebing batu vulkanik, dan puncak kabut/salju alami.
 */
export function buildMountainRangeGeometry(width: number, length: number): THREE.BufferGeometry {
  const segX = 76;
  const segZ = 64;
  const geo = new THREE.PlaneGeometry(width, length, segX, segZ);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();

  const cValley = new THREE.Color('#2d6138');
  const cForest = new THREE.Color('#1f4d2e');
  const cHighForest = new THREE.Color('#355c3a');
  const cRock = new THREE.Color('#5a626b');
  const cPeak = new THREE.Color('#dce8f4');

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);

    // Seamless blend ke ketinggian 0 di tepi Z agar sambungan antar-zona mulus tanpa patahan!
    const zEdge = Math.min(1, Math.min(z + length / 2, length / 2 - z) / 26);
    const zFade = zEdge * zEdge * (3 - 2 * zEdge);

    // Lembah sungai berkelok di tengah (x ≈ sin(z*0.035)*14)
    const riverCenter = Math.sin(z * 0.032) * 14;
    const distFromRiver = Math.abs(x - riverCenter);
    const valleyMask = THREE.MathUtils.smoothstep(distFromRiver, 7, 34);

    // Punggungan gunung organik multi-oktaf
    const ridge = ridgedFbm(x * 0.022 + 4.3, z * 0.022 + 1.7);
    const detail = valueNoise2D(x * 0.085, z * 0.085) * 0.25;
    const rawH = Math.pow(ridge, 1.35) * 34 + detail * 4;
    const h = rawH * valleyMask * zFade;

    pos.setY(i, h - 0.15);

    // Pewarnaan realistis berdasarkan ketinggian & variasi noise
    const nTint = (valueNoise2D(x * 0.09, z * 0.09) - 0.5) * 0.08;
    if (h < 2.2) {
      c.copy(cValley).lerp(cForest, h / 2.2);
    } else if (h < 10.5) {
      c.copy(cForest).lerp(cHighForest, (h - 2.2) / 8.3);
    } else if (h < 19.5) {
      c.copy(cHighForest).lerp(cRock, (h - 10.5) / 9.0);
    } else {
      c.copy(cRock).lerp(cPeak, Math.min(1, (h - 19.5) / 7.5));
    }
    colors[i * 3] = Math.min(1, Math.max(0, c.r + nTint));
    colors[i * 3 + 1] = Math.min(1, Math.max(0, c.g + nTint));
    colors[i * 3 + 2] = Math.min(1, Math.max(0, c.b + nTint));
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

/**
 * Membuat pulau tropis 3D organik (bukan kerucut!) dengan pantai pasir keemasan & perbukitan hijau.
 */
export function buildOrganicIslandGeometry(radius: number, maxHeight: number, seedOffset: number): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(radius * 2.2, radius * 2.2, 32, 32);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const cReef = new THREE.Color('#2ca8b8');
  const cSand = new THREE.Color('#e3d2a4');
  const cJungle = new THREE.Color('#2b6b3b');
  const cHill = new THREE.Color('#476b48');

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const dist = Math.hypot(x, z) / radius;
    const coastNoise = (valueNoise2D(x * 0.12 + seedOffset, z * 0.12 + seedOffset) - 0.5) * 0.36;
    const effDist = dist + coastNoise;
    const falloff = Math.max(0, 1 - effDist);
    const hill = ridgedFbm(x * 0.08 + seedOffset, z * 0.08 + seedOffset);
    const h = falloff > 0 ? Math.pow(falloff, 1.35) * maxHeight * (0.55 + hill * 0.7) : -0.45;
    pos.setY(i, h);

    if (h <= 0.05) {
      c.copy(cReef);
    } else if (h < 0.75) {
      c.copy(cSand).lerp(cJungle, Math.max(0, (h - 0.35) / 0.4));
    } else if (h < maxHeight * 0.65) {
      c.copy(cJungle);
    } else {
      c.copy(cJungle).lerp(cHill, Math.min(1, (h - maxHeight * 0.65) / (maxHeight * 0.35)));
    }
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

/** Tekstur warna & bump riak ombak laut realistis (seamless repeat + kilau matahari). */
export function makeOceanTextures(): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
  const size = 512;
  const cCol = document.createElement('canvas');
  cCol.width = size;
  cCol.height = size;
  const ctxCol = cCol.getContext('2d')!;

  const cBump = document.createElement('canvas');
  cBump.width = size;
  cBump.height = size;
  const ctxBump = cBump.getContext('2d')!;

  const imgCol = ctxCol.createImageData(size, size);
  const imgBump = ctxBump.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Seamless periodic wave harmonics
      const u = (x / size) * Math.PI * 2;
      const v = (y / size) * Math.PI * 2;
      const w1 = Math.sin(u * 4 + v * 2) * 0.35;
      const w2 = Math.cos(u * 7 - v * 5) * 0.25;
      const w3 = Math.sin(u * 13 + v * 11) * 0.18;
      const w4 = Math.cos(u * 23 - v * 19) * 0.12;
      const h = 0.5 + (w1 + w2 + w3 + w4) * 0.48; // 0..1

      const idx = (y * size + x) * 4;
      // Warna laut biru samudra realistis dengan buih tipis di puncak ombak
      const foam = h > 0.84 ? (h - 0.84) * 4.5 : 0;
      imgCol.data[idx] = Math.min(255, Math.round(10 + h * 26 + foam * 180));
      imgCol.data[idx + 1] = Math.min(255, Math.round(68 + h * 58 + foam * 150));
      imgCol.data[idx + 2] = Math.min(255, Math.round(126 + h * 64 + foam * 110));
      imgCol.data[idx + 3] = 255;

      const bVal = Math.max(0, Math.min(255, Math.round(h * 255)));
      imgBump.data[idx] = bVal;
      imgBump.data[idx + 1] = bVal;
      imgBump.data[idx + 2] = bVal;
      imgBump.data[idx + 3] = 255;
    }
  }
  ctxCol.putImageData(imgCol, 0, 0);
  ctxBump.putImageData(imgBump, 0, 0);

  const map = new THREE.CanvasTexture(cCol);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(9, 7);

  const bumpMap = new THREE.CanvasTexture(cBump);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(9, 7);

  return { map, bumpMap };
}

/** Tekstur fasad gedung pencakar langit realistis (kaca curtain-wall reflektif + bingkai lantai + lobi). */
export function makeSkyscraperGlassTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  // Struktur beton/aluminium dasar
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 0, 256, 512);

  let seed = 4471;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let row = 0; row < 24; row++) {
    const y = 6 + row * 21;
    // Sabuk beton pemisah lantai
    ctx.fillStyle = '#64748b';
    ctx.fillRect(0, y + 16, 256, 4);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, y + 15, 256, 1);

    for (let col = 0; col < 8; col++) {
      const x = 6 + col * 31;
      const g = ctx.createLinearGradient(x, y, x, y + 15);
      const r = rand();
      if (r > 0.78) {
        // Kaca memantulkan langit terang / lampu kantor
        g.addColorStop(0, '#bae6fd');
        g.addColorStop(1, '#60a5fa');
      } else if (r > 0.42) {
        // Kaca biru arsitektural
        g.addColorStop(0, '#3b6ea5');
        g.addColorStop(1, '#1e3a5f');
      } else {
        // Kaca gelap teduh
        g.addColorStop(0, '#1e334a');
        g.addColorStop(1, '#0f1c2e');
      }
      ctx.fillStyle = g;
      ctx.fillRect(x, y, 25, 14);
      // Garis highlight reflektif tipis
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(x + 2, y + 1, 21, 2);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Tekstur dinding rumah penduduk nyata (plaster krem/putih + jendela berkaca + pintu kayu). */
export function makeHouseWallTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#f5f2eb';
  ctx.fillRect(0, 0, 128, 128);
  // Pondasi bawah abu-abu tipis
  ctx.fillStyle = '#9ca3af';
  ctx.fillRect(0, 114, 128, 14);

  // 2 jendela berbingkai putih + kaca gelap
  const drawWindow = (x: number, y: number) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 2, y - 2, 26, 28);
    ctx.fillStyle = '#1e3a5f';
    ctx.fillRect(x, y, 22, 24);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(x + 10, y, 2, 24);
    ctx.fillRect(x, y + 11, 22, 2);
  };
  drawWindow(16, 46);
  drawWindow(88, 46);

  // Pintu kayu di tengah
  ctx.fillStyle = '#78350f';
  ctx.fillRect(52, 54, 24, 60);
  ctx.fillStyle = '#b45309';
  ctx.fillRect(55, 58, 18, 22);
  ctx.fillRect(55, 84, 18, 24);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Tekstur genteng tanah liat/terakota bergelombang untuk atap rumah. */
export function makeRoofTileTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#b84326';
  ctx.fillRect(0, 0, 128, 128);

  for (let row = 0; row < 16; row++) {
    const y = row * 8;
    ctx.fillStyle = 'rgba(40,12,4,0.32)';
    ctx.fillRect(0, y + 6, 128, 2);
    for (let col = 0; col < 16; col++) {
      const x = col * 8 + (row % 2) * 4;
      ctx.fillStyle = 'rgba(255,210,180,0.16)';
      ctx.fillRect(x, y + 1, 5, 4);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

/** Tekstur Aspal Runway 3D TNI AU lengkap: Threshold Piano Keys, Garis Start, Nomor "09", Aiming Point & Centerline. */
export function makeRunwayAsphaltTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 2048;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#252930';
  ctx.fillRect(0, 0, 512, 2048);

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

  // Bekas karet ban di zona touchdown
  const skidGrad = ctx.createLinearGradient(0, 260, 0, 760);
  skidGrad.addColorStop(0, 'rgba(12,14,18,0)');
  skidGrad.addColorStop(0.4, 'rgba(10,12,16,0.55)');
  skidGrad.addColorStop(0.75, 'rgba(10,12,16,0.45)');
  skidGrad.addColorStop(1, 'rgba(12,14,18,0)');
  ctx.fillStyle = skidGrad;
  ctx.fillRect(150, 260, 82, 500);
  ctx.fillRect(280, 260, 82, 500);

  // Garis tepi putih tebal
  ctx.fillStyle = '#e8eef5';
  ctx.fillRect(24, 0, 12, 2048);
  ctx.fillRect(476, 0, 12, 2048);

  // Piano Keys (Threshold Stripes)
  const keyPositions = [64, 108, 152, 196, 286, 330, 374, 418];
  for (const kx of keyPositions) {
    ctx.fillRect(kx, 22, 26, 86);
    ctx.fillRect(kx, 1940, 26, 86);
  }

  // Garis Titik Start Take Off kuning
  ctx.fillStyle = '#ffb703';
  ctx.fillRect(42, 118, 428, 12);

  // Nomor Landasan "09"
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

  // Aiming Point Blocks
  ctx.fillStyle = '#e8eef5';
  ctx.fillRect(92, 310, 62, 140);
  ctx.fillRect(358, 310, 62, 140);
  ctx.fillRect(92, 1580, 62, 140);
  ctx.fillRect(358, 1580, 62, 140);

  // Centerline putus-putus putih
  for (let y = 310; y <= 1710; y += 110) {
    ctx.fillRect(247, y, 18, 62);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}
