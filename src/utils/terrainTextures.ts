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
 * lereng hutan hijau tropis, tebing batu vulkanik (berdasarkan kemiringan), dan puncak berkabut alami.
 */
export function buildMountainRangeGeometry(width: number, length: number): THREE.BufferGeometry {
  const segX = 96;
  const segZ = 80;
  const geo = new THREE.PlaneGeometry(width, length, segX, segZ);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position as THREE.BufferAttribute;
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();

  const cValley = new THREE.Color('#285432');
  const cForest = new THREE.Color('#1a3f26');
  const cHighForest = new THREE.Color('#2d4d32');
  const cRock = new THREE.Color('#4f565e');
  const cCliff = new THREE.Color('#3b4048');
  const cPeak = new THREE.Color('#cfdbe6');

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);

    // Ulangi UV rapat agar tekstur detail hutan & tebing batu tajam dari dekat
    uv.setXY(i, (x + width / 2) / 24, (z + length / 2) / 24);

    // Seamless blend ke ketinggian 0 di tepi Z agar sambungan antar-zona mulus tanpa patahan!
    const zEdge = Math.min(1, Math.min(z + length / 2, length / 2 - z) / 28);
    const zFade = zEdge * zEdge * (3 - 2 * zEdge);

    // Lembah sungai lebar di jalur terbang tengah (x ∈ [-18..18] tetap terbuka aman anti-tabrak!)
    const riverCenter = Math.sin(z * 0.028) * 10;
    const distFromRiver = Math.abs(x - riverCenter);
    const valleyMask = THREE.MathUtils.smoothstep(distFromRiver, 18, 48);

    // Punggungan gunung organik multi-oktaf + mikro-erosi (dibatasi aman agar pesawat tidak pernah menabrak gunung!)
    const ridge = ridgedFbm(x * 0.021 + 4.3, z * 0.021 + 1.7);
    const erosion = ridgedFbm(x * 0.055 + 9.1, z * 0.055 + 3.4) * 0.25;
    const detail = valueNoise2D(x * 0.11, z * 0.11) * 0.2;
    const rawH = Math.min(22.5, Math.pow(ridge, 1.32) * 20 + erosion * 4.5 + detail * 2.5);
    const h = rawH * valleyMask * zFade;

    pos.setY(i, h - 0.15);
  }

  // Hitung normal terlebih dahulu agar tebing curam otomatis jadi batu vulkanik!
  geo.computeVertexNormals();
  const norm = geo.attributes.normal as THREE.BufferAttribute;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = pos.getY(i) + 0.15;
    const ny = norm.getY(i); // 1.0 = datar, <0.78 = tebing curam
    const slopeFactor = THREE.MathUtils.clamp((0.86 - ny) / 0.28, 0, 1);

    const nTint = (valueNoise2D(x * 0.11, z * 0.11) - 0.5) * 0.09;
    if (h < 2.4) {
      c.copy(cValley).lerp(cForest, h / 2.4);
    } else if (h < 11.5) {
      c.copy(cForest).lerp(cHighForest, (h - 2.4) / 9.1);
    } else if (h < 21.0) {
      c.copy(cHighForest).lerp(cRock, (h - 11.5) / 9.5);
    } else {
      c.copy(cRock).lerp(cPeak, Math.min(1, (h - 21.0) / 8.5));
    }
    // Lereng curam otomatis menampilkan strata tebing batu vulkanik gelap
    if (slopeFactor > 0.05 && h > 2.0) {
      c.lerp(cCliff, slopeFactor * 0.72);
    }
    colors[i * 3] = Math.min(1, Math.max(0, c.r + nTint));
    colors[i * 3 + 1] = Math.min(1, Math.max(0, c.g + nTint));
    colors[i * 3 + 2] = Math.min(1, Math.max(0, c.b + nTint));
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
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
  c.width = 1024;
  c.height = 2048;
  const ctx = c.getContext('2d')!;

  // Aspal landasan fotorealistis bergaya bandara Indonesia (abu-abu arang bervariasi & jalur pengaspalan memanjang)
  ctx.fillStyle = '#333840';
  ctx.fillRect(0, 0, 1024, 2048);

  // Jalur paving memanjang tipis khas aspal bandara asli
  const laneShades = ['#373d46', '#2f343c', '#3b414a', '#31363f', '#383e47', '#30353d'];
  for (let i = 0; i < laneShades.length; i++) {
    ctx.fillStyle = laneShades[i];
    ctx.fillRect(48 + i * 154, 0, 152, 2048);
  }

  let seed = 9187;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  // Tekstur agregat aspal halus & cuaca
  for (let i = 0; i < 18000; i++) {
    const x = rand() * 1024;
    const y = rand() * 2048;
    const v = 38 + Math.floor(rand() * 38);
    ctx.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
    ctx.fillRect(x, y, 2 + rand() * 4, 2 + rand() * 5);
  }

  // Goresan karet ban (rubber skid marks) pekat & realistis di zona touchdown (seperti foto referensi!)
  for (let s = 0; s < 28; s++) {
    const sx = 280 + rand() * 464;
    const sy = 240 + rand() * 420;
    const sh = 180 + rand() * 420;
    const sw = 4 + rand() * 12;
    const sg = ctx.createLinearGradient(0, sy, 0, sy + sh);
    sg.addColorStop(0, 'rgba(10,12,15,0)');
    sg.addColorStop(0.25, `rgba(10,12,15,${0.25 + rand() * 0.35})`);
    sg.addColorStop(0.75, `rgba(10,12,15,${0.18 + rand() * 0.28})`);
    sg.addColorStop(1, 'rgba(10,12,15,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(sx, sy, sw, sh);
  }
  const skidGrad = ctx.createLinearGradient(0, 260, 0, 920);
  skidGrad.addColorStop(0, 'rgba(10,12,15,0)');
  skidGrad.addColorStop(0.35, 'rgba(10,12,15,0.52)');
  skidGrad.addColorStop(0.75, 'rgba(10,12,15,0.36)');
  skidGrad.addColorStop(1, 'rgba(10,12,15,0)');
  ctx.fillStyle = skidGrad;
  ctx.fillRect(310, 260, 155, 660);
  ctx.fillRect(560, 260, 155, 660);

  // Garis tepi putih tebal (Runway Edge Stripes)
  ctx.fillStyle = '#eef2f6';
  ctx.fillRect(46, 0, 22, 2048);
  ctx.fillRect(956, 0, 22, 2048);

  // Piano Keys (10 Threshold Stripes tebal seperti di foto bandara!)
  const keyPositions = [110, 184, 258, 332, 406, 566, 640, 714, 788, 862];
  for (const kx of keyPositions) {
    ctx.fillRect(kx, 22, 48, 118);
    ctx.fillRect(kx, 1908, 48, 118);
  }

  // Garis threshold putih melintang
  ctx.fillRect(46, 146, 932, 14);
  ctx.fillRect(46, 1888, 932, 14);

  // Nomor Landasan "09" (depan) & "23" (ujung jauh) bergaya stencil bandara asli
  ctx.save();
  ctx.fillStyle = '#f1f5f9';
  ctx.font = 'bold 165px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('09', 512, 252);
  ctx.restore();

  ctx.save();
  ctx.translate(512, 1796);
  ctx.rotate(Math.PI);
  ctx.fillStyle = '#f1f5f9';
  ctx.font = 'bold 165px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('23', 0, 0);
  ctx.restore();

  // Aiming Point Blocks putih besar (kiri & kanan zona touchdown)
  ctx.fillStyle = '#eef2f6';
  ctx.fillRect(176, 390, 118, 155);
  ctx.fillRect(730, 390, 118, 155);
  ctx.fillRect(176, 1500, 118, 155);
  ctx.fillRect(730, 1500, 118, 155);

  // Touchdown zone pair bars
  ctx.fillRect(216, 620, 42, 95);
  ctx.fillRect(274, 620, 42, 95);
  ctx.fillRect(708, 620, 42, 95);
  ctx.fillRect(766, 620, 42, 95);

  // Centerline putus-putus putih tegas
  for (let y = 370; y <= 1650; y += 116) {
    ctx.fillRect(496, y, 32, 66);
  }

  // Sambungan melintang beton/aspal realistis
  ctx.fillStyle = 'rgba(12,14,18,0.24)';
  for (let y = 0; y < 2048; y += 128) {
    ctx.fillRect(52, y, 920, 3);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  tex.needsUpdate = true;
  return tex;
}

/** Tekstur rumput hijau tropis cerah khas bandara Indonesia (strip pemotongan rumput + variasi tanah alami). */
export function makeAirbaseGrassTexture(): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n1 = valueNoise2D(x * 0.035, y * 0.035);
      const n2 = valueNoise2D(x * 0.14 + 12.1, y * 0.14 + 4.7);
      const n3 = hash2(x, y);
      const stripe = Math.sin((x / size) * Math.PI * 10) * 0.06;
      const v = n1 * 0.52 + n2 * 0.32 + n3 * 0.16 + stripe;
      const idx = (y * size + x) * 4;
      // Hijau rumput tropis tersinari matahari (sesuai foto referensi bandara!)
      img.data[idx] = Math.min(255, Math.max(0, Math.round(74 + v * 58)));
      img.data[idx + 1] = Math.min(255, Math.max(0, Math.round(122 + v * 66)));
      img.data[idx + 2] = Math.min(255, Math.max(0, Math.round(34 + v * 32)));
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 22);
  tex.anisotropy = 8;
  return tex;
}

/** Tekstur papan fascia Hanggar: tulisan tegas "SKADRON UDARA TNI AU" tanpa logo. */
export function makeTniAuHangarSignTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 160;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#3c4c63';
  ctx.fillRect(0, 0, 1024, 160);
  // Panel bergelombang halus
  for (let x = 0; x < 1024; x += 16) {
    ctx.fillStyle = x % 32 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.09)';
    ctx.fillRect(x, 0, 8, 160);
  }
  // Lis emas tipis atas & bawah papan nama
  ctx.fillStyle = '#eab308';
  ctx.fillRect(24, 14, 976, 5);
  ctx.fillRect(24, 141, 976, 5);

  // Tulisan "SKADRON UDARA TNI AU" tegas putih bersih
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 62px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SKADRON UDARA TNI AU', 512, 82);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Tekstur rambu kuning-hitam penunjuk jalur Taxiway (A <- B ->) di pulau rumput bandara. */
export function makeTaxiwaySignTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 96;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#facc15';
  ctx.fillRect(0, 0, 256, 96);
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 248, 88);
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('A ← B →', 128, 50);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Tekstur beton Apron Lanud nyata (sambungan pelat beton, noda karet ban & cuaca). */
export function makeConcreteApronTexture(): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#55606e';
  ctx.fillRect(0, 0, size, size);

  let seed = 7331;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < 6000; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const v = 72 + Math.floor(rand() * 34);
    ctx.fillStyle = `rgb(${v},${v + 4},${v + 9})`;
    ctx.fillRect(x, y, 2 + rand() * 3, 2 + rand() * 3);
  }
  ctx.strokeStyle = 'rgba(20,26,34,0.45)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= size; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  tex.anisotropy = 8;
  return tex;
}

/** Tekstur dinding baja bergelombang (corrugated steel) Hanggar TNI AU nyata. */
export function makeHangarMetalTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(0, 0, 256, 256);

  for (let x = 0; x < 256; x += 8) {
    const grad = ctx.createLinearGradient(x, 0, x + 8, 0);
    grad.addColorStop(0, '#94a3b8');
    grad.addColorStop(0.4, '#e2e8f0');
    grad.addColorStop(0.85, '#cbd5e1');
    grad.addColorStop(1, '#64748b');
    ctx.fillStyle = grad;
    ctx.fillRect(x, 0, 8, 256);
  }
  ctx.fillStyle = 'rgba(15,23,42,0.22)';
  ctx.fillRect(0, 84, 256, 2);
  ctx.fillRect(0, 170, 256, 2);
  const grime = ctx.createLinearGradient(0, 190, 0, 256);
  grime.addColorStop(0, 'rgba(30,41,59,0)');
  grime.addColorStop(1, 'rgba(30,41,59,0.28)');
  ctx.fillStyle = grime;
  ctx.fillRect(0, 190, 256, 66);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 1);
  tex.anisotropy = 4;
  return tex;
}

/** Tekstur detail mikro permukaan gunung (kanopi hutan tropis + urat batu tebing + bump map). */
export function makeMountainDetailTextures(): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
  const size = 256;
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
      const n1 = valueNoise2D(x * 0.09, y * 0.09);
      const n2 = valueNoise2D(x * 0.28 + 3.2, y * 0.28 + 7.4);
      const n3 = hash2(x, y);
      const v = n1 * 0.5 + n2 * 0.35 + n3 * 0.15;
      const shade = Math.round(182 + v * 73);
      const idx = (y * size + x) * 4;
      imgCol.data[idx] = shade;
      imgCol.data[idx + 1] = shade;
      imgCol.data[idx + 2] = shade;
      imgCol.data[idx + 3] = 255;

      const b = Math.round(v * 255);
      imgBump.data[idx] = b;
      imgBump.data[idx + 1] = b;
      imgBump.data[idx + 2] = b;
      imgBump.data[idx + 3] = 255;
    }
  }
  ctxCol.putImageData(imgCol, 0, 0);
  ctxBump.putImageData(imgBump, 0, 0);

  const map = new THREE.CanvasTexture(cCol);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 4;

  const bumpMap = new THREE.CanvasTexture(cBump);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;

  return { map, bumpMap };
}

/** Tekstur pesisir pantai realistis (pasir kering -> pasir basah -> buih ombak pecah -> laguna biru toska). */
export function makeCoastlineTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0.0, '#3c6b42');
  grad.addColorStop(0.18, '#d6c496');
  grad.addColorStop(0.48, '#b59d6e');
  grad.addColorStop(0.62, '#eefaff');
  grad.addColorStop(0.76, '#34a8ba');
  grad.addColorStop(1.0, '#0f5d8c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 512);

  ctx.strokeStyle = 'rgba(255,255,255,0.72)';
  ctx.lineWidth = 4;
  for (let wave = 0; wave < 2; wave++) {
    ctx.beginPath();
    for (let y = 0; y <= 512; y += 8) {
      const wx = 152 + wave * 20 + Math.sin(y * 0.045 + wave * 2.1) * 8 + Math.cos(y * 0.11) * 4;
      if (y === 0) ctx.moveTo(wx, y);
      else ctx.lineTo(wx, y);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 8);
  tex.anisotropy = 4;
  return tex;
}

/** Tekstur awan cumulus lembut fotorealistis (volumetric radial sprite, jauh lebih nyata dari bola 3D). */
export function makePhotorealCloudTexture(): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;

  ctx.clearRect(0, 0, size, size);
  const puffs: [number, number, number, string][] = [
    [128, 144, 78, 'rgba(198,216,236,0.52)'],
    [74, 148, 56, 'rgba(204,222,242,0.46)'],
    [182, 148, 54, 'rgba(204,222,242,0.46)'],
    [124, 114, 68, 'rgba(255,255,255,0.82)'],
    [88, 124, 52, 'rgba(252,253,255,0.72)'],
    [164, 124, 50, 'rgba(252,253,255,0.72)'],
    [118, 90, 48, 'rgba(255,255,255,0.9)'],
    [148, 102, 42, 'rgba(255,255,255,0.8)'],
  ];

  for (const [px, py, r, col] of puffs) {
    const g = ctx.createRadialGradient(px, py - r * 0.15, r * 0.1, px, py, r);
    g.addColorStop(0, col);
    g.addColorStop(0.58, col.replace(/[\d.]+\)$/, '0.3)'));
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
