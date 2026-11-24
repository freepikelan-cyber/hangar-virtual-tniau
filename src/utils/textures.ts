import * as THREE from 'three';

/** Generator angka acak deterministik (mulberry32) agar kamuflase selalu sama tiap dimuat. */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  return { c, ctx };
}

function toTexture(c: HTMLCanvasElement, repeat = false) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
  }
  t.needsUpdate = true;
  return t;
}

/** Bercak organik yang di-wrap di tepi agar tekstur berulang mulus (seamless). */
function blob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rnd: () => number, size: number) {
  const pts = 9;
  const radii = Array.from({ length: pts }, () => r * (0.55 + rnd() * 0.75));
  const rot = rnd() * Math.PI;
  const stretch = 0.6 + rnd() * 1.2;
  for (const ox of [-size, 0, size]) {
    for (const oy of [-size, 0, size]) {
      ctx.beginPath();
      for (let i = 0; i <= pts; i++) {
        const k = i % pts;
        const a = (k / pts) * Math.PI * 2;
        const px = Math.cos(a) * radii[k] * stretch;
        const py = Math.sin(a) * radii[k];
        const rx = px * Math.cos(rot) - py * Math.sin(rot) + x + ox;
        const ry = px * Math.sin(rot) + py * Math.cos(rot) + y + oy;
        if (i === 0) ctx.moveTo(rx, ry);
        else {
          const pk = (k - 1 + pts) % pts;
          const pa = (pk / pts) * Math.PI * 2 + Math.PI / pts;
          const cr = (radii[k] + radii[pk]) * 0.62;
          const cx = Math.cos(pa) * cr * stretch;
          const cy = Math.sin(pa) * cr;
          ctx.quadraticCurveTo(
            cx * Math.cos(rot) - cy * Math.sin(rot) + x + ox,
            cx * Math.sin(rot) + cy * Math.cos(rot) + y + oy,
            rx,
            ry,
          );
        }
      }
      ctx.closePath();
      ctx.fill();
    }
  }
}

function noise(ctx: CanvasRenderingContext2D, size: number, rnd: () => number, amount = 0.05) {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rnd() - 0.5) * 255 * amount;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

/** Panel lines (garis sambungan pelat) tipis untuk menambah realisme. */
function panelLines(ctx: CanvasRenderingContext2D, size: number, rnd: () => number, alpha = 0.12) {
  ctx.strokeStyle = `rgba(10,15,20,${alpha})`;
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 9; i++) {
    const y = rnd() * size;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
    const x = rnd() * size;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
  ctx.fillStyle = `rgba(20,25,30,${alpha * 1.4})`;
  for (let i = 0; i < 140; i++) ctx.fillRect(rnd() * size, rnd() * size, 1.6, 1.6); // paku keling
}

export function camoTexture(base: string, colors: { c: string; n: number; r: number }[], seed: number, opts?: { noise?: number }) {
  const S = 512;
  const { c, ctx } = canvas(S, S);
  const rnd = seeded(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, S, S);
  for (const layer of colors) {
    ctx.fillStyle = layer.c;
    for (let i = 0; i < layer.n; i++) blob(ctx, rnd() * S, rnd() * S, layer.r * (0.7 + rnd() * 0.6), rnd, S);
  }
  panelLines(ctx, S, rnd);
  noise(ctx, S, rnd, opts?.noise ?? 0.045);
  return toTexture(c, true);
}

/** Livery Merah-Putih Jupiter Aerobatic Team, dipetakan langsung ke UV fuselage (u = keliling, v = panjang). */
export function jupiterFuselageTexture() {
  const W = 512;
  const H = 1024;
  const { c, ctx } = canvas(W, H);
  const cells = 256;
  for (let i = 0; i < cells; i++) {
    const u = (i + 0.5) / cells;
    const y = -Math.cos(u * Math.PI * 2); // -1 bawah, +1 atas
    for (let j = 0; j < cells; j++) {
      const v = 1 - (j + 0.5) / cells; // v=1 di hidung
      const b = -0.15 + 0.42 * Math.sin(v * Math.PI * 2.2 + 0.6);
      let col = y > b ? '#c8102e' : '#f4f4f2';
      if (Math.abs(y - b) < 0.05) col = '#1b2a4a';
      if (y < b && Math.abs(y - (b - 0.22)) < 0.035) col = '#c8102e';
      ctx.fillStyle = col;
      ctx.fillRect((i / cells) * W, (j / cells) * H, W / cells + 1, H / cells + 1);
    }
  }
  const rnd = seeded(77);
  panelLines(ctx, W, rnd, 0.08);
  return toTexture(c);
}

export function jupiterWingTexture() {
  const S = 512;
  const { c, ctx } = canvas(S, S);
  ctx.fillStyle = '#c8102e';
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = '#f4f4f2';
  for (let i = -2; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 128, 0);
    ctx.lineTo(i * 128 + 48, 0);
    ctx.lineTo(i * 128 + 48 + 256, S);
    ctx.lineTo(i * 128 + 256, S);
    ctx.closePath();
    ctx.fill();
  }
  noise(ctx, S, seeded(5), 0.03);
  return toTexture(c, true);
}

/** Livery putih-merah kenegaraan Boeing 737 VIP lengkap dengan jendela kabin. */
export function vipFuselageTexture(zMin: number, zMax: number, windowFrom: number, windowTo: number) {
  const W = 1024;
  const H = 2048;
  const { c, ctx } = canvas(W, H);
  for (let i = 0; i < W; i++) {
    const u = (i + 0.5) / W;
    const y = -Math.cos(u * Math.PI * 2);
    let col = '#f5f6f8';
    if (y < -0.1) col = '#d9dde2';
    if (y > 0.02 && y < 0.14) col = '#c8102e';
    if (y > -0.04 && y <= 0.02) col = '#8b0b1f';
    if (y > 0.14 && y < 0.17) col = '#d4a017';
    ctx.fillStyle = col;
    ctx.fillRect(i, 0, 1, H);
  }
  // Jendela kabin
  const L = zMax - zMin;
  const windowY = 0.36;
  const uw = Math.acos(-windowY) / (Math.PI * 2);
  ctx.fillStyle = '#1c2633';
  for (const uc of [uw, 1 - uw]) {
    for (let z = windowFrom; z <= windowTo; z += 0.3) {
      const v = (z - zMin) / L;
      const py = (1 - v) * H;
      const px = uc * W;
      ctx.beginPath();
      ctx.roundRect(px - 9, py - 5, 18, 10, 4);
      ctx.fill();
    }
    // Pintu depan & belakang
    ctx.strokeStyle = '#9aa3ad';
    ctx.lineWidth = 3;
    for (const z of [windowTo + 0.55, windowFrom - 0.45]) {
      const py = (1 - (z - zMin) / L) * H;
      ctx.strokeRect(uc * W - 22, py - 13, 52, 26);
    }
  }
  panelLines(ctx, W, seeded(11), 0.05);
  return toTexture(c);
}

export function solidNoiseTexture(base: string, seed: number, amount = 0.04) {
  const S = 256;
  const { c, ctx } = canvas(S, S);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, S, S);
  panelLines(ctx, S, seeded(seed), 0.1);
  noise(ctx, S, seeded(seed + 1), amount);
  return toTexture(c, true);
}

/** Bump/normal-like height map garis sambungan pelat logam, palka servis, dan paku keling pesawat. */
export function panelBumpTexture(seed = 1601) {
  const S = 512;
  const { c, ctx } = canvas(S, S);
  const rnd = seeded(seed);
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, S, S);

  // Variasi halus antar pelat (oil-canning ringan)
  for (let i = 0; i < 24; i++) {
    const x = Math.floor(rnd() * 8) * 64;
    const y = Math.floor(rnd() * 8) * 64;
    const w = (1 + Math.floor(rnd() * 3)) * 64;
    const h = (1 + Math.floor(rnd() * 2)) * 64;
    const shade = 122 + Math.floor(rnd() * 14);
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    ctx.fillRect(x, y, w, h);
  }

  // Garis sambungan pelat (tertanam gelap) + tepi terang tipis
  ctx.strokeStyle = '#383838';
  ctx.lineWidth = 1.6;
  for (let g = 0; g < S; g += 64) {
    ctx.beginPath();
    ctx.moveTo(0, g);
    ctx.lineTo(S, g);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(g, 0);
    ctx.lineTo(g, S);
    ctx.stroke();
  }

  // Palka inspeksi kecil
  for (let i = 0; i < 14; i++) {
    const x = 12 + rnd() * (S - 48);
    const y = 12 + rnd() * (S - 48);
    ctx.strokeRect(x, y, 22 + rnd() * 24, 14 + rnd() * 18);
  }

  // Deretan paku keling sepanjang panel
  ctx.fillStyle = '#555555';
  for (let g = 0; g < S; g += 64) {
    for (let k = 6; k < S; k += 12) {
      ctx.fillRect(k, g + 3, 1.8, 1.8);
      ctx.fillRect(g + 3, k, 1.8, 1.8);
    }
  }

  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

/** Roundel segilima Merah-Putih TNI AU. */
export function roundelTexture() {
  const S = 256;
  const { c, ctx } = canvas(S, S);
  const penta = (r: number) => {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
      const x = S / 2 + Math.cos(a) * r;
      const y = S / 2 + 8 + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  };
  ctx.fillStyle = '#c8102e';
  penta(118);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  penta(70);
  ctx.fill();
  return toTexture(c);
}

export function flagTexture() {
  const { c, ctx } = canvas(256, 170);
  ctx.fillStyle = '#d0021b';
  ctx.fillRect(0, 0, 256, 85);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 85, 256, 85);
  return toTexture(c);
}

export function textTexture(text: string, opts: { color?: string; stroke?: string; weight?: string; aspect?: number; font?: string } = {}) {
  const aspect = opts.aspect ?? 4;
  const H = 128;
  const W = Math.round(H * aspect);
  const { c, ctx } = canvas(W, H);
  let size = 104;
  ctx.font = `${opts.weight ?? '700'} ${size}px ${opts.font ?? 'Rajdhani, Arial Narrow, Arial, sans-serif'}`;
  while (ctx.measureText(text).width > W * 0.94 && size > 20) {
    size -= 4;
    ctx.font = `${opts.weight ?? '700'} ${size}px ${opts.font ?? 'Rajdhani, Arial Narrow, Arial, sans-serif'}`;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (opts.stroke) {
    ctx.lineWidth = 8;
    ctx.strokeStyle = opts.stroke;
    ctx.strokeText(text, W / 2, H / 2 + 4);
  }
  ctx.fillStyle = opts.color ?? '#1a1f26';
  ctx.fillText(text, W / 2, H / 2 + 4);
  return toTexture(c);
}

/** Tekstur kaca kokpit (jendela depan) untuk pesawat angkut & helikopter. */
export function cockpitWindowTexture(kind: 'transport' | 'airliner' | 'heli') {
  const W = 512;
  const H = 256;
  const { c, ctx } = canvas(W, H);
  ctx.fillStyle = '#0d1520';
  const poly = (pts: [number, number][]) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
  };
  if (kind === 'heli') {
    poly([[40, 40], [240, 20], [250, 230], [70, 200]]);
    poly([[472, 40], [272, 20], [262, 230], [442, 200]]);
  } else if (kind === 'airliner') {
    poly([[110, 120], [240, 100], [244, 170], [120, 175]]);
    poly([[402, 120], [272, 100], [268, 170], [392, 175]]);
    poly([[40, 140], [100, 122], [110, 175], [50, 178]]);
    poly([[472, 140], [412, 122], [402, 175], [462, 178]]);
  } else {
    for (let i = 0; i < 3; i++) {
      poly([[60 + i * 70, 100], [118 + i * 70, 92], [118 + i * 70, 170], [60 + i * 70, 175]]);
      poly([[452 - i * 70, 100], [394 - i * 70, 92], [394 - i * 70, 170], [452 - i * 70, 175]]);
    }
    poly([[220, 70], [292, 70], [292, 110], [220, 110]]);
  }
  return toTexture(c);
}

/** Jendela samping kabin helikopter + garis pintu geser. */
export function heliCabinTexture() {
  const { c, ctx } = canvas(512, 160);
  ctx.strokeStyle = '#1a2216';
  ctx.lineWidth = 5;
  ctx.strokeRect(150, 12, 200, 140);
  ctx.fillStyle = '#0e151c';
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.roundRect(20 + i * (i >= 2 ? 120 : 125) + (i >= 2 ? 110 : 0), 30, 70, 52, 10);
    ctx.fill();
  }
  return toTexture(c);
}

export function radialGlowTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const S = 128;
  const { c, ctx } = canvas(S, S);
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.35, inner.replace(/[\d.]+\)$/, '0.45)'));
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  return toTexture(c);
}

/** Gradien vertikal untuk api afterburner: terang di pangkal (v=0) memudar ke ujung (v=1). */
export function flameTexture(color: string) {
  const { c, ctx } = canvas(16, 256);
  const g = ctx.createLinearGradient(0, 256, 0, 0);
  g.addColorStop(0, color);
  g.addColorStop(0.45, color);
  g.addColorStop(1, '#000000');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 16, 256);
  return toTexture(c);
}

/** Landasan radar melingkar: cincin konsentris, garis radial, dan skala derajat. */
export function radarFloorTexture() {
  const S = 2048;
  const { c, ctx } = canvas(S, S);
  const cx = S / 2;
  const R = S / 2 - 8;
  const g = ctx.createRadialGradient(cx, cx, 0, cx, cx, R);
  g.addColorStop(0, '#0d2238');
  g.addColorStop(0.7, '#081627');
  g.addColorStop(1, '#050c16');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cx, R, 0, Math.PI * 2);
  ctx.fill();
  // grid halus
  ctx.strokeStyle = 'rgba(0,210,255,0.07)';
  ctx.lineWidth = 2;
  for (let x = 0; x < S; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, S);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, x);
    ctx.lineTo(S, x);
    ctx.stroke();
  }
  // cincin
  for (let i = 1; i <= 6; i++) {
    ctx.strokeStyle = i === 6 ? 'rgba(0,210,255,0.9)' : `rgba(0,210,255,${0.18 + i * 0.04})`;
    ctx.lineWidth = i === 6 ? 10 : 3;
    ctx.beginPath();
    ctx.arc(cx, cx, (R * i) / 6 - (i === 6 ? 6 : 0), 0, Math.PI * 2);
    ctx.stroke();
  }
  // garis radial
  for (let a = 0; a < 360; a += 15) {
    const rad = (a * Math.PI) / 180;
    ctx.strokeStyle = a % 90 === 0 ? 'rgba(0,210,255,0.45)' : 'rgba(0,210,255,0.14)';
    ctx.lineWidth = a % 90 === 0 ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(rad) * R * 0.08, cx + Math.sin(rad) * R * 0.08);
    ctx.lineTo(cx + Math.cos(rad) * R, cx + Math.sin(rad) * R);
    ctx.stroke();
  }
  // skala derajat
  for (let a = 0; a < 360; a += 5) {
    const rad = (a * Math.PI) / 180;
    const len = a % 30 === 0 ? 46 : 20;
    ctx.strokeStyle = 'rgba(0,210,255,0.8)';
    ctx.lineWidth = a % 30 === 0 ? 5 : 3;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(rad) * (R - 20), cx + Math.sin(rad) * (R - 20));
    ctx.lineTo(cx + Math.cos(rad) * (R - 20 - len), cx + Math.sin(rad) * (R - 20 - len));
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(0,210,255,0.85)';
  ctx.font = '700 44px Rajdhani, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let a = 0; a < 360; a += 30) {
    const rad = ((a - 90) * Math.PI) / 180;
    ctx.save();
    ctx.translate(cx + Math.cos(rad) * (R - 110), cx + Math.sin(rad) * (R - 110));
    ctx.rotate(rad + Math.PI / 2);
    ctx.fillText(String(a).padStart(3, '0'), 0, 0);
    ctx.restore();
  }
  // marka landasan tengah
  ctx.strokeStyle = 'rgba(255,183,3,0.55)';
  ctx.lineWidth = 6;
  ctx.setLineDash([40, 30]);
  ctx.beginPath();
  ctx.moveTo(cx, cx - R * 0.8);
  ctx.lineTo(cx, cx + R * 0.8);
  ctx.stroke();
  ctx.setLineDash([]);
  const t = toTexture(c);
  t.anisotropy = 16;
  return t;
}

export function sweepTexture() {
  const S = 512;
  const { c, ctx } = canvas(S, S);
  const cx = S / 2;
  for (let i = 0; i < 60; i++) {
    const a0 = (-i * Math.PI) / 180;
    ctx.fillStyle = `rgba(0,210,255,${0.5 * (1 - i / 60) ** 2})`;
    ctx.beginPath();
    ctx.moveTo(cx, cx);
    ctx.arc(cx, cx, cx, a0 - Math.PI / 180, a0 + 0.002);
    ctx.closePath();
    ctx.fill();
  }
  return toTexture(c);
}
