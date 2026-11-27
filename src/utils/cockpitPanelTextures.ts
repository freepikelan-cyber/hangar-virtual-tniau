import * as THREE from 'three';

function finalizeCanvasTex(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/* ============================================================================
 * 1. TRANSPORT / VVIP GLASS COCKPIT TEXTURES (Airbus / C-130J / B737 VVIP)
 * ============================================================================ */

export function makeTransportPfdTexture(unitCode: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  // Dark cockpit display frame
  ctx.fillStyle = '#060a10';
  ctx.fillRect(0, 0, 512, 512);

  // Top FMA flight mode annunciator bar
  ctx.fillStyle = '#0b1220';
  ctx.fillRect(10, 10, 492, 46);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, 492, 46);
  ctx.font = 'bold 18px monospace';
  ctx.fillStyle = '#22c55e';
  ctx.fillText('SPEED', 24, 38);
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('ALT*', 140, 38);
  ctx.fillStyle = '#22c55e';
  ctx.fillText('NAV', 252, 38);
  ctx.fillStyle = '#f8fafc';
  ctx.fillText('AP1  FD', 376, 38);

  // Central Artificial Horizon (Rounded square clip)
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(114, 72, 284, 284, 24);
  ctx.clip();

  // Sky (bright cyan-blue) & Ground (warm aircraft brown)
  const skyGrad = ctx.createLinearGradient(0, 72, 0, 214);
  skyGrad.addColorStop(0, '#0284c7');
  skyGrad.addColorStop(1, '#38bdf8');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(114, 72, 284, 142);

  const gndGrad = ctx.createLinearGradient(0, 214, 0, 356);
  gndGrad.addColorStop(0, '#9a5b1e');
  gndGrad.addColorStop(1, '#6b3a10');
  ctx.fillStyle = gndGrad;
  ctx.fillRect(114, 214, 284, 142);

  // Horizon line
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(114, 214);
  ctx.lineTo(398, 214);
  ctx.stroke();

  // Pitch ladder lines
  ctx.lineWidth = 2;
  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = '#ffffff';
  for (let p = -20; p <= 20; p += 10) {
    if (p === 0) continue;
    const py = 214 - p * 4.5;
    ctx.beginPath();
    ctx.moveTo(214, py);
    ctx.lineTo(298, py);
    ctx.stroke();
    ctx.fillText(`${Math.abs(p)}`, 192, py + 4);
    ctx.fillText(`${Math.abs(p)}`, 304, py + 4);
  }

  // Roll scale arc at top
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(256, 214, 122, -Math.PI * 0.78, -Math.PI * 0.22);
  ctx.stroke();

  // Green flight director crosshairs
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(256, 152);
  ctx.lineTo(256, 276);
  ctx.moveTo(188, 214);
  ctx.lineTo(324, 214);
  ctx.stroke();

  // Yellow aircraft reference symbol
  ctx.fillStyle = '#090d14';
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 4;
  ctx.fillRect(248, 208, 16, 12);
  ctx.strokeRect(248, 208, 16, 12);
  ctx.beginPath();
  ctx.moveTo(180, 214);
  ctx.lineTo(226, 214);
  ctx.lineTo(226, 224);
  ctx.moveTo(332, 214);
  ctx.lineTo(286, 214);
  ctx.lineTo(286, 224);
  ctx.stroke();
  ctx.restore();

  // Horizon border
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(114, 72, 284, 284, 24);
  ctx.stroke();

  // Left Airspeed Tape
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(14, 72, 82, 284);
  ctx.strokeStyle = '#64748b';
  ctx.strokeRect(14, 72, 82, 284);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 16px monospace';
  for (let i = 0; i < 7; i++) {
    const y = 96 + i * 40;
    ctx.fillText(`${280 - i * 20}`, 24, y);
    ctx.fillRect(82, y - 6, 12, 2);
  }
  ctx.fillStyle = '#020617';
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 2.5;
  ctx.fillRect(12, 198, 86, 32);
  ctx.strokeRect(12, 198, 86, 32);
  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('240', 28, 221);

  // Right Altitude Tape
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(416, 72, 82, 284);
  ctx.strokeStyle = '#64748b';
  ctx.strokeRect(416, 72, 82, 284);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 15px monospace';
  for (let i = 0; i < 7; i++) {
    const y = 96 + i * 40;
    ctx.fillText(`${120 - i * 5}00`, 428, y);
    ctx.fillRect(416, y - 6, 10, 2);
  }
  ctx.fillStyle = '#020617';
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 2.5;
  ctx.fillRect(414, 198, 86, 32);
  ctx.strokeRect(414, 198, 86, 32);
  ctx.fillStyle = '#22c55e';
  ctx.font = 'bold 18px monospace';
  ctx.fillText('10500', 422, 220);

  // Bottom Heading Tape
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(114, 378, 284, 62);
  ctx.strokeStyle = '#64748b';
  ctx.strokeRect(114, 378, 284, 62);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 16px monospace';
  ['07', '08', '09', '10', '11'].forEach((h, idx) => {
    const hx = 136 + idx * 56;
    ctx.fillText(h, hx, 418);
    ctx.fillRect(hx + 8, 378, 2, 14);
  });
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(256, 374);
  ctx.lineTo(256, 396);
  ctx.stroke();

  // Footer QNH / Unit ID
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 16px monospace';
  ctx.fillText('QNH 1013', 396, 480);
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(unitCode, 20, 480);

  return finalizeCanvasTex(c);
}

export function makeTransportNdTexture(unitCode: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#05080f';
  ctx.fillRect(0, 0, 512, 512);

  // Top telemetry row
  ctx.font = 'bold 18px monospace';
  ctx.fillStyle = '#f8fafc';
  ctx.fillText('GS', 18, 34);
  ctx.fillStyle = '#22c55e';
  ctx.fillText('248', 50, 34);
  ctx.fillStyle = '#f8fafc';
  ctx.fillText('TAS', 102, 34);
  ctx.fillStyle = '#22c55e';
  ctx.fillText('252', 146, 34);

  ctx.fillStyle = '#f8fafc';
  ctx.fillText('HALIM  090°', 356, 34);
  ctx.fillStyle = '#22c55e';
  ctx.fillText('18.4 NM', 386, 58);

  // Subtle green weather radar return
  const wx = ctx.createRadialGradient(310, 210, 12, 310, 210, 88);
  wx.addColorStop(0, 'rgba(34,197,94,0.38)');
  wx.addColorStop(0.6, 'rgba(16,185,129,0.18)');
  wx.addColorStop(1, 'rgba(16,185,129,0)');
  ctx.fillStyle = wx;
  ctx.beginPath();
  ctx.arc(310, 210, 88, 0, Math.PI * 2);
  ctx.fill();

  // Compass Rose Arc (centered low at 256, 420)
  const cx = 256;
  const cy = 420;
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 315, -Math.PI * 0.85, -Math.PI * 0.15);
  ctx.stroke();

  // Dashed range rings
  ctx.save();
  ctx.setLineDash([6, 8]);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.6;
  [105, 210].forEach((r) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI * 0.88, -Math.PI * 0.12);
    ctx.stroke();
  });
  ctx.restore();

  // Compass ticks
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  for (let a = -70; a <= 70; a += 10) {
    const rad = ((a - 90) * Math.PI) / 180;
    const x1 = cx + Math.cos(rad) * 315;
    const y1 = cy + Math.sin(rad) * 315;
    const x2 = cx + Math.cos(rad) * 298;
    const y2 = cy + Math.sin(rad) * 298;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // Green Flight Plan Path + Cyan Waypoints
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(256, 260);
  ctx.lineTo(288, 145);
  ctx.stroke();

  // Waypoint diamonds
  [
    { x: 256, y: 260, label: 'HLM01' },
    { x: 288, y: 145, label: 'TNIAU' },
  ].forEach((wp) => {
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(wp.x, wp.y - 9);
    ctx.lineTo(wp.x + 9, wp.y);
    ctx.lineTo(wp.x, wp.y + 9);
    ctx.lineTo(wp.x - 9, wp.y);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(wp.label, wp.x + 14, wp.y + 5);
  });

  // Yellow Aircraft Symbol at bottom center
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 20);
  ctx.lineTo(cx, cy + 16);
  ctx.moveTo(cx - 22, cy - 2);
  ctx.lineTo(cx + 22, cy - 2);
  ctx.moveTo(cx - 10, cy + 12);
  ctx.lineTo(cx + 10, cy + 12);
  ctx.stroke();

  // Range labels
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 15px monospace';
  ctx.fillText('20', 98, 286);
  ctx.fillText('40', 48, 182);
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`${unitCode} ND`, 18, 490);

  return finalizeCanvasTex(c);
}

export function makeTransportEcamTexture(mode: 'upper' | 'lower', unitCode: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#060a10';
  ctx.fillRect(0, 0, 512, 512);

  if (mode === 'upper') {
    // 2x2 Engine circular dials (N1 & EGT)
    const drawArcGauge = (x: number, y: number, r: number, val: string, pct: number, label: string) => {
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, y, r, Math.PI * 0.78, Math.PI * 2.15);
      ctx.stroke();

      // Redline tip
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(x, y, r, Math.PI * 1.98, Math.PI * 2.15);
      ctx.stroke();

      // Green needle
      const ang = Math.PI * 0.78 + pct * (Math.PI * 1.37);
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(ang) * (r - 6), y + Math.sin(ang) * (r - 6));
      ctx.stroke();

      ctx.fillStyle = '#020617';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.fillRect(x - 10, y + 6, 56, 26);
      ctx.strokeRect(x - 10, y + 6, 56, 26);
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(val, x - 4, y + 25);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(label, x - 20, y + 54);
    };

    drawArcGauge(130, 108, 58, '88.4', 0.78, 'N1 ENG1');
    drawArcGauge(382, 108, 58, '88.2', 0.78, 'N1 ENG2');
    drawArcGauge(130, 238, 52, '540', 0.62, 'EGT °C');
    drawArcGauge(382, 238, 52, '538', 0.62, 'EGT °C');

    // Center divider & FOB / Flaps
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(16, 318);
    ctx.lineTo(496, 318);
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('FOB :  14800 KG', 24, 356);
    ctx.fillStyle = '#22c55e';
    ctx.fillText('FLAPS  UP', 340, 356);

    // Memo status lines
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#22c55e';
    ctx.fillText('SEAT BELTS       ON', 24, 404);
    ctx.fillText('ENG ANTI ICE     OFF', 24, 436);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`TNI AU ${unitCode}  NORMAL`, 24, 474);
  } else {
    // Lower ECAM: Systems / Hydraulics / Pressurization
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('HYD / BLEED / ELEC', 132, 42);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(24, 62, 464, 240);

    ['GREEN  3000 PSI', 'BLUE   3000 PSI', 'YELLOW 3000 PSI'].forEach((txt, idx) => {
      const y = 112 + idx * 54;
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(txt, 46, y);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(300, y - 16, 154, 18);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(302, y - 14, 134, 14);
    });

    ctx.strokeStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(24, 326);
    ctx.lineTo(488, 326);
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 19px monospace';
    ctx.fillText('TAT +18°C    SAT +11°C', 32, 372);
    ctx.fillText('GW  64200 KG  CG 26.4%', 32, 412);
    ctx.fillStyle = '#22c55e';
    ctx.fillText('ALL SYSTEMS NOMINAL', 32, 462);
  }

  return finalizeCanvasTex(c);
}

export function makeTransportMcpTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 160;
  const ctx = c.getContext('2d')!;

  // Cool Airbus blue-grey glareshield panel
  ctx.fillStyle = '#3a4959';
  ctx.fillRect(0, 0, 1024, 160);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 1016, 152);

  // Left & Right EFIS sections
  [36, 826].forEach((sx) => {
    ctx.fillStyle = '#273444';
    ctx.fillRect(sx, 18, 162, 124);
    ctx.fillStyle = '#090d14';
    ctx.fillRect(sx + 14, 30, 62, 28);
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 17px monospace';
    ctx.fillText('1013', sx + 22, 50);

    // Rotary knobs
    [sx + 44, sx + 118].forEach((kx) => {
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.arc(kx, 104, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 3;
      ctx.stroke();
    });
  });

  // Center FCU Autopilot digital windows (Amber LED)
  const windows = [
    { x: 230, label: 'SPD/MACH', val: '250' },
    { x: 370, label: 'HDG/TRK', val: '090' },
    { x: 548, label: 'ALTITUDE', val: '12000' },
    { x: 702, label: 'V/S FPA', val: '+000' },
  ];
  windows.forEach((w) => {
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(w.label, w.x + 6, 28);
    ctx.fillStyle = '#070a0f';
    ctx.fillRect(w.x, 34, 108, 34);
    ctx.strokeStyle = '#1e293b';
    ctx.strokeRect(w.x, 34, 108, 34);
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(w.val, w.x + 12, 59);

    // Knob beneath
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(w.x + 54, 112, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  });

  // Green AP1 / AP2 / ATHR illuminated buttons
  [
    { x: 492, y: 74, txt: 'AP1' },
    { x: 492, y: 112, txt: 'A/TR' },
  ].forEach((b) => {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(b.x, b.y, 44, 28);
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x, b.y, 44, 28);
    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(b.txt, b.x + 7, b.y + 19);
  });

  return finalizeCanvasTex(c);
}

export function makeTransportOverheadTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 384;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#2c3846';
  ctx.fillRect(0, 0, 1024, 384);

  // Panel dividers
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 5;
  ctx.strokeRect(8, 8, 1008, 368);
  ctx.beginPath();
  ctx.moveTo(338, 8);
  ctx.lineTo(338, 376);
  ctx.moveTo(686, 8);
  ctx.lineTo(686, 376);
  ctx.stroke();

  // Grid of backlit pushbutton annunciators
  const colors = ['#38bdf8', '#f59e0b', '#e2e8f0', '#22c55e', '#1e293b'];
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 14; col++) {
      const bx = 34 + col * 69;
      const by = 32 + row * 56;
      const active = (row * 7 + col * 5) % 4 === 0;
      const accent = colors[(row + col) % colors.length];
      ctx.fillStyle = '#111827';
      ctx.fillRect(bx, by, 44, 30);
      ctx.strokeStyle = active ? accent : '#475569';
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, by, 44, 30);
      if (active) {
        ctx.fillStyle = accent;
        ctx.fillRect(bx + 7, by + 9, 30, 5);
        ctx.fillRect(bx + 10, by + 18, 24, 4);
      }
    }
  }

  return finalizeCanvasTex(c);
}

export function makeTransportPedestalTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 0, 512, 512);

  // Dual MCDU screens (left & right of center throttle slot)
  [22, 330].forEach((mx) => {
    ctx.fillStyle = '#111827';
    ctx.fillRect(mx, 22, 160, 210);
    ctx.fillStyle = '#050a0e';
    ctx.fillRect(mx + 14, 34, 132, 102);
    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('F-PLN  TNIAU', mx + 22, 56);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('HLM  090/18', mx + 22, 78);
    ctx.fillText('FL120  250KT', mx + 22, 100);
    ctx.fillStyle = '#facc15';
    ctx.fillText('DEST  WIHH', mx + 22, 122);

    // Keypad dots
    ctx.fillStyle = '#475569';
    for (let r = 0; r < 5; r++) {
      for (let k = 0; k < 6; k++) {
        ctx.fillRect(mx + 16 + k * 22, 150 + r * 14, 14, 9);
      }
    }
  });

  // Center throttle quadrant slot markings
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(200, 20, 112, 230);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 13px monospace';
  ['TOGA', 'FLX', 'CL', 'IDLE', 'REV'].forEach((t, i) => {
    ctx.fillText(t, 206, 52 + i * 44);
    ctx.fillText(t, 276, 52 + i * 44);
  });

  // Lower radio & transponder stacks
  [22, 270].forEach((rx) => {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(rx, 276, 220, 210);
    ctx.fillStyle = '#05080f';
    ctx.fillRect(rx + 14, 294, 88, 28);
    ctx.fillRect(rx + 118, 294, 88, 28);
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 17px monospace';
    ctx.fillText('118.10', rx + 22, 314);
    ctx.fillText('121.90', rx + 126, 314);
  });

  return finalizeCanvasTex(c);
}

export function makeTransportSideGaugeTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;

  // Warm amber flood-lit cockpit side gauges (matches Image 1 far left & right)
  const g = ctx.createRadialGradient(128, 128, 18, 128, 128, 136);
  g.addColorStop(0, '#5a3f28');
  g.addColorStop(1, '#222b36');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);

  [
    { x: 76, y: 84, r: 42 },
    { x: 180, y: 84, r: 42 },
    { x: 128, y: 184, r: 46 },
  ].forEach((d) => {
    ctx.fillStyle = '#0b0f17';
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x + d.r * 0.55, d.y - d.r * 0.45);
    ctx.stroke();
  });

  return finalizeCanvasTex(c);
}

/* ============================================================================
 * 2. FIGHTER SUKHOI / FLANKER-STYLE COCKPIT TEXTURES (Matching Image 2!)
 * ============================================================================ */

function drawAnalogDial(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  kind: 'adi' | 'airspeed' | 'alt' | 'hsi' | 'vsi' | 'aoa' | 'rpm' | 'clock' | 'turn',
) {
  // Metallic outer bezel
  ctx.fillStyle = '#111820';
  ctx.beginPath();
  ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Dial face
  ctx.fillStyle = '#070b10';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  if (kind === 'adi') {
    // Classic Russian white/black spherical ADI attitude ball
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r - 3, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(cx - r, cy - r, r * 2, r);
    ctx.fillStyle = '#111827';
    ctx.fillRect(cx - r, cy, r * 2, r);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.45, cy + i * 11);
      ctx.lineTo(cx + r * 0.45, cy + i * 11);
      ctx.stroke();
    }
    // Yellow wing silhouette
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.72, cy);
    ctx.lineTo(cx - r * 0.2, cy);
    ctx.lineTo(cx, cy + 8);
    ctx.lineTo(cx + r * 0.2, cy);
    ctx.lineTo(cx + r * 0.72, cy);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (kind === 'hsi') {
    // Compass rose with yellow course pointer
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    for (let i = 0; i < 36; i++) {
      const a = (i * 10 * Math.PI) / 180;
      const len = i % 3 === 0 ? 11 : 6;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (r - 2), cy + Math.sin(a) * (r - 2));
      ctx.lineTo(cx + Math.cos(a) * (r - 2 - len), cy + Math.sin(a) * (r - 2 - len));
      ctx.stroke();
    }
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.72);
    ctx.lineTo(cx, cy + r * 0.72);
    ctx.moveTo(cx - r * 0.42, cy);
    ctx.lineTo(cx + r * 0.42, cy);
    ctx.stroke();
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.76);
    ctx.lineTo(cx - 8, cy - r * 0.5);
    ctx.lineTo(cx + 8, cy - r * 0.5);
    ctx.closePath();
    ctx.fill();
    return;
  }

  // Standard radial ticks
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.8;
  for (let i = 0; i < 16; i++) {
    const a = (i * 22.5 * Math.PI) / 180;
    const len = i % 2 === 0 ? 9 : 5;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (r - 2), cy + Math.sin(a) * (r - 2));
    ctx.lineTo(cx + Math.cos(a) * (r - 2 - len), cy + Math.sin(a) * (r - 2 - len));
    ctx.stroke();
  }

  if (kind === 'turn') {
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.65, cy);
    ctx.lineTo(cx + r * 0.65, cy);
    ctx.moveTo(cx, cy - r * 0.65);
    ctx.lineTo(cx, cy + r * 0.65);
    ctx.stroke();
    return;
  }

  // Needles & mini digital windows
  const angle =
    kind === 'airspeed'
      ? -0.9
      : kind === 'alt'
        ? -2.1
        : kind === 'vsi'
          ? -0.2
          : kind === 'aoa'
            ? -2.5
            : kind === 'rpm'
              ? -0.55
              : -1.2;
  ctx.strokeStyle = kind === 'aoa' ? '#facc15' : '#f8fafc';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(angle) * (r * 0.78), cy + Math.sin(angle) * (r * 0.78));
  ctx.stroke();

  if (kind === 'alt' || kind === 'airspeed') {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx - 18, cy + 8, 36, 14);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(kind === 'airspeed' ? '450' : '105', cx - 12, cy + 19);
  }
}

export function makeFighterMainDashTexture(unitCode: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  // Iconic Russian Sukhoi blue-grey instrument panel (#425c6a)
  const bg = ctx.createLinearGradient(0, 0, 0, 512);
  bg.addColorStop(0, '#4c6877');
  bg.addColorStop(0.5, '#3e5765');
  bg.addColorStop(1, '#2c414d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1024, 512);

  // Panel rivets & seam lines
  ctx.strokeStyle = '#1e2e38';
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, 1008, 496);
  ctx.beginPath();
  ctx.moveTo(270, 8);
  ctx.lineTo(270, 504);
  ctx.moveTo(748, 8);
  ctx.lineTo(748, 504);
  ctx.stroke();

  // --- LEFT CLUSTER (Clock, AoA/G, VSI, Illuminated Warning Tiles) ---
  drawAnalogDial(ctx, 210, 88, 34, 'clock');
  drawAnalogDial(ctx, 186, 214, 48, 'aoa');
  drawAnalogDial(ctx, 184, 344, 44, 'vsi');

  // Lower-left illuminated green/amber warning matrix (OF / BT / ST)
  ctx.fillStyle = '#131d24';
  ctx.fillRect(42, 378, 104, 104);
  const leftLamps = [
    ['OF', '#22c55e'],
    ['M', '#facc15'],
    ['ST', '#22c55e'],
    ['OF', '#22c55e'],
    ['BT', '#22c55e'],
    ['ST', '#facc15'],
  ];
  leftLamps.forEach(([txt, col], i) => {
    const lx = 48 + (i % 3) * 32;
    const ly = 392 + Math.floor(i / 3) * 34;
    ctx.fillStyle = '#090f14';
    ctx.fillRect(lx, ly, 26, 24);
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.6;
    ctx.strokeRect(lx, ly, 26, 24);
    ctx.fillStyle = col;
    ctx.font = 'bold 12px monospace';
    ctx.fillText(txt, lx + 4, ly + 17);
  });

  // --- CENTER CLUSTER (ADI, Airspeed, Altimeter, HSI, Standby, Twin RPM, Red LEDs) ---
  drawAnalogDial(ctx, 344, 184, 62, 'adi');
  drawAnalogDial(ctx, 474, 178, 52, 'airspeed');
  drawAnalogDial(ctx, 344, 346, 62, 'hsi');
  drawAnalogDial(ctx, 474, 324, 52, 'alt');
  drawAnalogDial(ctx, 594, 216, 46, 'turn');
  drawAnalogDial(ctx, 690, 216, 42, 'hsi');
  drawAnalogDial(ctx, 608, 338, 34, 'rpm');
  drawAnalogDial(ctx, 686, 338, 34, 'rpm');

  // Red LED digital radio / weapon frequency readouts (bottom center)
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(540, 412, 188, 72);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.strokeRect(540, 412, 188, 72);
  ctx.fillStyle = '#ef4444';
  ctx.font = 'bold 19px monospace';
  ctx.fillText('3.000   NAV1', 554, 442);
  ctx.fillText('121.5   NAV2', 554, 470);

  // --- RIGHT CLUSTER (Green/Amber Annunciator Column + SPO-15 Beryoza RWR!) ---
  const rightFlags = [
    { txt: 'F1', col: '#22c55e' },
    { txt: 'F2', col: '#22c55e' },
    { txt: 'F3', col: '#facc15' },
    { txt: 'ATC', col: '#38bdf8' },
    { txt: 'RDR', col: '#22c55e' },
    { txt: 'ARM', col: '#f59e0b' },
  ];
  rightFlags.forEach((f, idx) => {
    const ry = 194 + idx * 34;
    ctx.fillStyle = '#0e171f';
    ctx.fillRect(770, ry, 58, 26);
    ctx.strokeStyle = f.col;
    ctx.lineWidth = 1.8;
    ctx.strokeRect(770, ry, 58, 26);
    ctx.fillStyle = f.col;
    ctx.font = 'bold 15px monospace';
    ctx.fillText(f.txt, 782, ry + 18);

    // Secondary lamp column
    ctx.fillStyle = '#18242e';
    ctx.fillRect(838, ry, 54, 26);
    ctx.fillStyle = idx % 2 === 0 ? '#86efac' : '#fde047';
    ctx.fillRect(844, ry + 8, 42, 10);
  });

  // SPO-15 Beryoza RWR Threat Indicator (Lower-right black box with glowing red/yellow aircraft!)
  const rx = 860;
  const ry = 426;
  ctx.fillStyle = '#080b10';
  ctx.fillRect(782, 366, 160, 128);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 3;
  ctx.strokeRect(782, 366, 160, 128);

  // Concentric glowing threat arcs
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(rx, ry, 46, -Math.PI * 0.9, -Math.PI * 0.1);
  ctx.stroke();
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(rx, ry, 32, -Math.PI * 0.85, -Math.PI * 0.15);
  ctx.stroke();

  // Glowing yellow/red aircraft silhouette inside RWR
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.moveTo(rx, ry - 26);
  ctx.lineTo(rx + 6, ry - 6);
  ctx.lineTo(rx + 26, ry + 8);
  ctx.lineTo(rx + 24, ry + 14);
  ctx.lineTo(rx + 5, ry + 8);
  ctx.lineTo(rx + 10, ry + 24);
  ctx.lineTo(rx, ry + 19);
  ctx.lineTo(rx - 10, ry + 24);
  ctx.lineTo(rx - 5, ry + 8);
  ctx.lineTo(rx - 24, ry + 14);
  ctx.lineTo(rx - 26, ry + 8);
  ctx.lineTo(rx - 6, ry - 6);
  ctx.closePath();
  ctx.fill();

  // Threat directional LEDs
  for (let i = 0; i < 9; i++) {
    const a = ((-160 + i * 20) * Math.PI) / 180;
    ctx.fillStyle = i === 3 || i === 5 ? '#ef4444' : '#f59e0b';
    ctx.beginPath();
    ctx.arc(rx + Math.cos(a) * 52, ry + Math.sin(a) * 52, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Subtle unit stencil
  ctx.fillStyle = '#cbd5e1';
  ctx.font = 'bold 14px monospace';
  ctx.fillText(unitCode, 28, 34);

  return finalizeCanvasTex(c);
}

export function makeFighterRadarMfdTexture(unitCode: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  // Physical dark bezel with softkey buttons
  ctx.fillStyle = '#181f28';
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 504, 504);

  // Inner bright navy/blue tactical screen (matches upper-right MFD of Image 2!)
  ctx.fillStyle = '#030a1c';
  ctx.fillRect(36, 36, 440, 440);
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 3;
  ctx.strokeRect(36, 36, 440, 440);

  // Left blue softkey menu column
  const keys = ['RDR', 'NAV', 'WPN', 'HSI', 'ENG', 'SYS', 'BIT'];
  keys.forEach((k, i) => {
    const ky = 54 + i * 54;
    ctx.fillStyle = i === 0 ? '#1d4ed8' : '#0b1e44';
    ctx.fillRect(44, ky, 68, 40);
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 2;
    ctx.strokeRect(44, ky, 68, 40);
    ctx.fillStyle = '#e0f2fe';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(k, 58, ky + 26);
  });

  // Tactical blue/cyan compass arc & range rings
  const cx = 294;
  const cy = 342;
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2.5;
  [90, 170, 240].forEach((r) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI * 0.92, -Math.PI * 0.08);
    ctx.stroke();
  });

  // Cyan horizon / tactical corridor line
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(126, 260);
  ctx.lineTo(462, 294);
  ctx.stroke();

  // White ownship icon & radar blips
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 18);
  ctx.lineTo(cx + 14, cy + 12);
  ctx.lineTo(cx, cy + 5);
  ctx.lineTo(cx - 14, cy + 12);
  ctx.closePath();
  ctx.fill();

  // Yellow/green bogey blips
  [
    { x: 248, y: 174, col: '#facc15' },
    { x: 356, y: 146, col: '#22c55e' },
  ].forEach((b) => {
    ctx.fillStyle = b.col;
    ctx.fillRect(b.x - 6, b.y - 6, 12, 12);
  });

  // Bottom blue status strip
  ctx.fillStyle = '#1d4ed8';
  ctx.fillRect(44, 434, 424, 34);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px monospace';
  ctx.fillText(`${unitCode}  BVR-SCAN  40KM  LOCK`, 60, 456);

  // Physical right-side bezel buttons
  ctx.fillStyle = '#334155';
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(482, 74 + i * 62, 20, 32);
  }

  return finalizeCanvasTex(c);
}

export function makeFighterHudControlTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 192;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#1b222a';
  ctx.fillRect(0, 0, 512, 192);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 504, 184);

  // Left illuminated mode switches (blue / red / white)
  [
    { y: 26, col: '#38bdf8' },
    { y: 78, col: '#ef4444' },
    { y: 130, col: '#e2e8f0' },
  ].forEach((s) => {
    ctx.fillStyle = '#090d14';
    ctx.fillRect(24, s.y, 44, 36);
    ctx.strokeStyle = s.col;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(24, s.y, 44, 36);
    ctx.fillStyle = s.col;
    ctx.fillRect(34, s.y + 12, 24, 12);
  });

  // Labels & brightness knob
  ctx.fillStyle = '#cbd5e1';
  ctx.font = 'bold 18px monospace';
  ctx.fillText('BRIGHT', 112, 46);
  ctx.fillText('TEST', 256, 46);
  ctx.fillText('RETICLE', 376, 46);

  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(144, 118, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Right selector rocker
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(360, 86, 108, 48);
  ctx.strokeStyle = '#64748b';
  ctx.strokeRect(360, 86, 108, 48);

  return finalizeCanvasTex(c);
}

export function makeFighterSideConsoleTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#25333d';
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, 500, 244);

  // Toggle switches grid
  for (let r = 0; r < 3; r++) {
    for (let col = 0; col < 8; col++) {
      const sx = 34 + col * 58;
      const sy = 40 + r * 54;
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(sx, sy, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(sx - 3, sy - 14, 6, 16);
    }
  }

  // Red/yellow striped emergency handle (bottom right, like Image 2!)
  ctx.save();
  ctx.beginPath();
  ctx.rect(280, 192, 200, 36);
  ctx.clip();
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(280, 192, 200, 36);
  ctx.fillStyle = '#facc15';
  for (let i = -2; i < 10; i++) {
    ctx.beginPath();
    ctx.moveTo(280 + i * 32, 192);
    ctx.lineTo(296 + i * 32, 192);
    ctx.lineTo(276 + i * 32, 228);
    ctx.lineTo(260 + i * 32, 228);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  return finalizeCanvasTex(c);
}
