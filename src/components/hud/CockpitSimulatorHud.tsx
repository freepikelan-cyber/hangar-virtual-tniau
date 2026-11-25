import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Compass, LogOut, RotateCcw, Target, Volume2, VolumeX } from 'lucide-react';
import { useHangarStore, useSelectedUnit } from '../../store/useHangarStore';
import { cockpitInput, cockpitTelemetry, getFlightProfileSpec } from '../../utils/cockpitSimState';
import { cockpitSimAudio } from '../../utils/cockpitSimAudio';

interface HudSnapshot {
  speedKts: number;
  altFt: number;
  headingDeg: number;
  pitchDeg: number;
  rollDeg: number;
  throttlePct: number;
  gForce: number;
  gearDown: boolean;
  onGround: boolean;
  stallWarn: boolean;
  pullUpWarn: boolean;
  ringsPassed: number;
  totalRings: number;
  nextRingDistM: number;
  nextRingBearingDeg: number;
}

const COMPASS_LABELS: Record<number, string> = {
  0: 'N',
  45: 'NE',
  90: 'E',
  135: 'SE',
  180: 'S',
  225: 'SW',
  270: 'W',
  315: 'NW',
};

/**
 * HUD Militer Hijau Bercahaya (Head-Up Display) + Kontrol Ganda (Keyboard W/A/S/D/Shift/Ctrl/G +
 * Virtual Joystick & Slider Throttle Sentuh untuk Smartboard/Tablet/HP) khusus Mode Simulator Kokpit 3D.
 */
export function CockpitSimulatorHud() {
  const unit = useSelectedUnit();
  const exitCockpitSim = useHangarStore((s) => s.exitCockpitSim);
  const soundEnabled = useHangarStore((s) => s.soundEnabled);
  const toggle = useHangarStore((s) => s.toggle);

  const profile = getFlightProfileSpec(unit.category);
  const [hud, setHud] = useState<HudSnapshot>({
    speedKts: 0,
    altFt: 0,
    headingDeg: 90,
    pitchDeg: 0,
    rollDeg: 0,
    throttlePct: 0,
    gForce: 1.0,
    gearDown: true,
    onGround: true,
    stallWarn: false,
    pullUpWarn: false,
    ringsPassed: 0,
    totalRings: 10,
    nextRingDistM: 180,
    nextRingBearingDeg: 0,
  });

  // Virtual Joystick visual knob state
  const joyBaseRef = useRef<HTMLDivElement>(null);
  const joyPointerId = useRef<number | null>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [sliderPct, setSliderPct] = useState(0);

  // Keyboard listeners (W/A/S/D, Shift/Ctrl, G, R)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || e.key === 'ArrowUp') cockpitInput.keys.w = true;
      if (k === 's' || e.key === 'ArrowDown') cockpitInput.keys.s = true;
      if (k === 'a' || e.key === 'ArrowLeft') cockpitInput.keys.a = true;
      if (k === 'd' || e.key === 'ArrowRight') cockpitInput.keys.d = true;
      if (e.key === 'Shift') cockpitInput.keys.shift = true;
      if (e.key === 'Control') cockpitInput.keys.ctrl = true;
      if (k === 'g' && !e.repeat) cockpitInput.toggleGearRequested = true;
      if (k === 'r' && !e.repeat) {
        cockpitInput.resetRequested = true;
        setSliderPct(0);
      }
      if (e.key === 'Escape') {
        exitCockpitSim();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || e.key === 'ArrowUp') cockpitInput.keys.w = false;
      if (k === 's' || e.key === 'ArrowDown') cockpitInput.keys.s = false;
      if (k === 'a' || e.key === 'ArrowLeft') cockpitInput.keys.a = false;
      if (k === 'd' || e.key === 'ArrowRight') cockpitInput.keys.d = false;
      if (e.key === 'Shift') cockpitInput.keys.shift = false;
      if (e.key === 'Control') cockpitInput.keys.ctrl = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      cockpitInput.keys = { w: false, s: false, a: false, d: false, shift: false, ctrl: false };
    };
  }, [exitCockpitSim]);

  // Sinkronkan telemetri HUD ~24 FPS (super ringan, tidak membebani WebGL 60 FPS!)
  useEffect(() => {
    const timer = window.setInterval(() => {
      const t = cockpitTelemetry;
      const tPct = Math.round(t.throttle * 100);
      setSliderPct(tPct);
      setHud({
        speedKts: Math.round(t.speedKts),
        altFt: t.altFt,
        headingDeg: Math.round(t.headingDeg),
        pitchDeg: (t.pitch * 180) / Math.PI,
        rollDeg: (t.roll * 180) / Math.PI,
        throttlePct: tPct,
        gForce: t.gForce,
        gearDown: t.gearDown,
        onGround: t.onGround,
        stallWarn: t.stallWarn,
        pullUpWarn: t.pullUpWarn,
        ringsPassed: t.ringsPassed,
        totalRings: t.totalRings,
        nextRingDistM: t.nextRingDistM,
        nextRingBearingDeg: Math.round(t.nextRingBearingDeg),
      });
    }, 42);
    return () => window.clearInterval(timer);
  }, []);

  // Handler Virtual Joystick Sentuh (Pointer Capture — mulus di Smartboard, HP & Mouse)
  const updateJoystickFromClient = (clientX: number, clientY: number) => {
    const el = joyBaseRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.38;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    setKnobPos({ x: dx, y: dy });
    // Kanan (+dx) = Roll kanan (+1); Tarik ke bawah (+dy) = Pitch Up (+1)!
    cockpitInput.touchRoll = dx / maxR;
    cockpitInput.touchPitch = dy / maxR;
  };

  const resetJoystick = () => {
    joyPointerId.current = null;
    setKnobPos({ x: 0, y: 0 });
    cockpitInput.touchRoll = 0;
    cockpitInput.touchPitch = 0;
  };

  const hdgLabel = COMPASS_LABELS[Math.round(hud.headingDeg / 45) * 45 % 360] ?? '';

  return (
    <div className="pointer-events-none fixed inset-0 z-30 select-none overflow-hidden font-mono">
      {/* === BAR ATAS: IDENTITAS UNIT, SKOR CINCIN & TOMBOL KELUAR KOKPIT === */}
      <div className="flex items-start justify-between gap-2 px-3 sm:px-5 pt-2.5 sm:pt-3.5">
        <div className="pointer-events-auto flex items-center gap-2.5 rounded-xl border border-emerald-400/45 bg-[#04140e]/80 px-3 py-2 backdrop-blur-sm">
          <div>
            <p className="font-display text-[10px] font-bold tracking-[0.18em] text-emerald-400 uppercase">
              FIRST-PERSON SIMULATOR • {profile.label}
            </p>
            <h2 className="font-display text-sm sm:text-base font-bold tracking-wider text-white uppercase leading-tight">
              {unit.name} ({unit.tailNumber})
            </h2>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-amber-400/50 bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-300">
            <Target className="h-3.5 w-3.5" />
            <span>
              RING {hud.ringsPassed}/{hud.totalRings}
            </span>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              cockpitSimAudio.start();
              toggle('soundEnabled');
            }}
            title={soundEnabled ? 'Matikan Suara Mesin' : 'Nyalakan Suara Mesin'}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-400/45 bg-[#04140e]/85 text-emerald-300 hover:bg-emerald-500/20 cursor-pointer active:scale-95"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-slate-400" />}
          </button>

          <button
            type="button"
            onClick={() => {
              cockpitInput.resetRequested = true;
              setSliderPct(0);
            }}
            title="Ulang dari Runway 09 (Tombol R)"
            className="flex h-10 items-center gap-1.5 rounded-lg border border-sky-400/45 bg-[#06182c]/85 px-3 font-display text-xs font-bold tracking-wider text-sky-200 uppercase hover:bg-sky-500/20 cursor-pointer active:scale-95"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reset Runway</span>
          </button>

          <button
            type="button"
            onClick={exitCockpitSim}
            className="flex h-10 items-center gap-1.5 rounded-lg border border-rose-400/80 bg-rose-600/85 px-3.5 font-display text-xs font-bold tracking-wider text-white uppercase shadow-[0_0_16px_rgba(244,63,94,0.45)] hover:bg-rose-500 cursor-pointer active:scale-95"
          >
            <LogOut className="h-4 w-4" />
            <span>Keluar Kokpit</span>
          </button>
        </div>
      </div>

      {/* === HEAD-UP DISPLAY (HUD) MILITER HIJAU BERCAHAYA DI TENGAH LAYAR === */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
        <div
          className="relative h-[min(64vh,460px)] w-[min(86vw,540px)]"
          style={{ filter: 'drop-shadow(0 0 6px rgba(16, 255, 140, 0.55))' }}
        >
          {/* 1. Kompas Heading di Atas HUD */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <div className="flex items-center gap-1.5 rounded border border-emerald-400/75 bg-[#02120a]/65 px-2.5 py-0.5 text-xs sm:text-sm font-bold text-emerald-300">
              <Compass className="h-3.5 w-3.5" />
              <span>{String(hud.headingDeg).padStart(3, '0')}°</span>
              {hdgLabel && <span className="text-emerald-400/80">{hdgLabel}</span>}
            </div>
            <div className="mt-1 h-1.5 w-44 sm:w-56 border-b border-emerald-400/70 flex justify-between text-[9px] text-emerald-300/85">
              <span>{String((hud.headingDeg + 330) % 360).padStart(3, '0')}</span>
              <span>▲</span>
              <span>{String((hud.headingDeg + 30) % 360).padStart(3, '0')}</span>
            </div>
            {hud.nextRingDistM > 0 && (
              <div className="mt-1 text-[10px] font-bold tracking-wider text-amber-300">
                NEXT RING: {hud.nextRingDistM}M ({hud.nextRingBearingDeg >= 0 ? `+${hud.nextRingBearingDeg}°` : `${hud.nextRingBearingDeg}°`})
              </div>
            )}
          </div>

          {/* 2. Pitch Ladder & Artificial Horizon Dinamis (SVG) */}
          <svg viewBox="0 0 360 280" className="h-full w-full overflow-hidden">
            <defs>
              <clipPath id="hud-horizon-clip">
                <rect x="70" y="46" width="220" height="186" />
              </clipPath>
            </defs>

            <g clipPath="url(#hud-horizon-clip)">
              <g transform={`translate(180, 140) rotate(${-hud.rollDeg}) translate(0, ${hud.pitchDeg * 2.8})`}>
                {/* Garis Horizon Utama (0°) */}
                <line x1="-110" y1="0" x2="-26" y2="0" stroke="#34ff9a" strokeWidth="2.2" />
                <line x1="26" y1="0" x2="110" y2="0" stroke="#34ff9a" strokeWidth="2.2" />

                {/* Tangga Pitch (+30°, +20°, +10°, -10°, -20°, -30°) */}
                {[-30, -20, -10, 10, 20, 30].map((deg) => {
                  const y = -deg * 2.8;
                  const dashed = deg < 0 ? '5,4' : undefined;
                  return (
                    <g key={deg} transform={`translate(0, ${y})`}>
                      <line x1="-52" y1="0" x2="-18" y2="0" stroke="#34ff9a" strokeWidth="1.6" strokeDasharray={dashed} />
                      <line x1="18" y1="0" x2="52" y2="0" stroke="#34ff9a" strokeWidth="1.6" strokeDasharray={dashed} />
                      <line x1="-52" y1="0" x2="-52" y2={deg > 0 ? 6 : -6} stroke="#34ff9a" strokeWidth="1.6" />
                      <line x1="52" y1="0" x2="52" y2={deg > 0 ? 6 : -6} stroke="#34ff9a" strokeWidth="1.6" />
                      <text x="-70" y="4" fill="#34ff9a" fontSize="9" fontWeight="bold">
                        {Math.abs(deg)}
                      </text>
                      <text x="58" y="4" fill="#34ff9a" fontSize="9" fontWeight="bold">
                        {Math.abs(deg)}
                      </text>
                    </g>
                  );
                })}
              </g>
            </g>

            {/* Simbol Flight Path / Watermark Hidung Pesawat di Tengah */}
            <g transform="translate(180, 140)" stroke="#34ff9a" strokeWidth="2.2" fill="none">
              <circle cx="0" cy="0" r="6" />
              <line x1="-20" y1="0" x2="-6" y2="0" />
              <line x1="6" y1="0" x2="20" y2="0" />
              <line x1="0" y1="-12" x2="0" y2="-6" />
            </g>
          </svg>

          {/* 3. Indikator Airspeed (Knots) di Kiri HUD */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 flex flex-col items-end">
            <span className="text-[9px] font-bold tracking-widest text-emerald-400/80">IAS KTS</span>
            <div className="rounded border-2 border-emerald-400 bg-[#02120a]/75 px-2.5 py-1 text-base sm:text-lg font-bold text-emerald-300">
              {String(hud.speedKts).padStart(3, '0')}
            </div>
            <span className="mt-1 text-[10px] font-bold text-emerald-300/90">G {hud.gForce.toFixed(1)}</span>
            <span className="text-[10px] font-bold text-emerald-400/85">THR {hud.throttlePct}%</span>
          </div>

          {/* 4. Indikator Altitude (Feet) & Gear di Kanan HUD */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col items-start">
            <span className="text-[9px] font-bold tracking-widest text-emerald-400/80">ALT FT</span>
            <div className="rounded border-2 border-emerald-400 bg-[#02120a]/75 px-2.5 py-1 text-base sm:text-lg font-bold text-emerald-300">
              {String(hud.altFt).padStart(4, '0')}
            </div>
            <span
              className={`mt-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                hud.gearDown ? 'bg-emerald-500/25 text-emerald-200' : 'bg-slate-800/70 text-slate-400'
              }`}
            >
              {hud.gearDown ? 'GEAR DN' : 'GEAR UP'}
            </span>
            <span className="mt-0.5 text-[10px] font-bold text-amber-300">
              {hud.onGround ? (profile.isVtol ? 'PAD • VTOL' : 'RWY 09') : 'AIRBORNE'}
            </span>
          </div>

          {/* 5. Peringatan Bahaya STALL / PULL UP WARNING */}
          {(hud.pullUpWarn || hud.stallWarn) && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-lg border-2 border-rose-500 bg-rose-950/90 px-4 py-1.5 text-sm sm:text-base font-bold tracking-[0.2em] text-rose-300 uppercase animate-pulse">
              <AlertTriangle className="h-5 w-5 text-rose-400" />
              <span>{hud.pullUpWarn ? 'PULL UP! PULL UP!' : 'STALL WARNING!'}</span>
            </div>
          )}
        </div>
      </div>

      {/* === KONTROL SENTUH SMARTBOARD / TABLET / HP + PANDUAN KEYBOARD === */}
      {/* Kiri Bawah: Slider Throttle Vertikal + Tombol Gear */}
      <div className="pointer-events-auto fixed bottom-4 left-3 sm:left-6 flex items-end gap-3">
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-emerald-400/45 bg-[#04140e]/85 px-3 py-3 backdrop-blur-sm">
          <span className="font-display text-[10px] font-bold tracking-wider text-emerald-300 uppercase">
            {profile.isVtol ? 'COLLECTIVE' : 'THROTTLE'}
          </span>
          <span className="text-xs font-bold text-amber-300">{sliderPct}%</span>
          <div className="relative flex h-32 sm:h-40 w-10 items-center justify-center">
            <input
              type="range"
              min={0}
              max={100}
              value={sliderPct}
              aria-label="Throttle"
              onChange={(e) => {
                const v = Number(e.target.value);
                setSliderPct(v);
                cockpitInput.touchThrottle = v / 100;
                cockpitSimAudio.start();
              }}
              className="h-10 w-32 sm:w-40 -rotate-90 cursor-pointer accent-emerald-400"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              cockpitInput.toggleGearRequested = true;
            }}
            className={`w-full rounded-lg border px-2 py-1.5 font-display text-[10px] font-bold tracking-wider uppercase cursor-pointer active:scale-95 ${
              hud.gearDown
                ? 'border-emerald-400 bg-emerald-500/25 text-emerald-200'
                : 'border-slate-600 bg-slate-800/80 text-slate-300'
            }`}
          >
            Gear (G)
          </button>
        </div>
      </div>

      {/* Tengah Bawah: Petunjuk Singkat Keyboard (Desktop/Smartboard) */}
      <div className="pointer-events-none fixed bottom-4 left-1/2 hidden md:flex -translate-x-1/2 items-center gap-3 rounded-full border border-emerald-400/35 bg-[#04140e]/80 px-4 py-1.5 text-[11px] text-emerald-200/90">
        <span>
          <strong className="text-amber-300">SHIFT / CTRL</strong> Throttle
        </span>
        <span className="text-emerald-500/50">•</span>
        <span>
          <strong className="text-amber-300">S / W</strong> Naik / Turun
        </span>
        <span className="text-emerald-500/50">•</span>
        <span>
          <strong className="text-amber-300">A / D</strong> Belok Kiri / Kanan
        </span>
        <span className="text-emerald-500/50">•</span>
        <span>
          <strong className="text-amber-300">G</strong> Roda
        </span>
      </div>

      {/* Kanan Bawah: Virtual Joystick Sentuh (Smartboard / HP / Mouse) */}
      <div className="pointer-events-auto fixed bottom-4 right-3 sm:right-6 flex flex-col items-center gap-1.5">
        <span className="rounded bg-[#04140e]/80 px-2 py-0.5 font-display text-[10px] font-bold tracking-wider text-emerald-300 uppercase">
          JOYSTICK KENDALI
        </span>
        <div
          ref={joyBaseRef}
          onPointerDown={(e) => {
            cockpitSimAudio.start();
            joyPointerId.current = e.pointerId;
            e.currentTarget.setPointerCapture(e.pointerId);
            updateJoystickFromClient(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (joyPointerId.current !== e.pointerId) return;
            updateJoystickFromClient(e.clientX, e.clientY);
          }}
          onPointerUp={(e) => {
            if (joyPointerId.current === e.pointerId) resetJoystick();
          }}
          onPointerCancel={() => resetJoystick()}
          className="relative flex h-28 w-28 sm:h-36 sm:w-36 items-center justify-center rounded-full border-2 border-emerald-400/55 bg-[#04140e]/80 shadow-[0_0_24px_rgba(16,185,129,0.22)] touch-none cursor-grab active:cursor-grabbing"
        >
          {/* Crosshair panduan arah */}
          <div className="pointer-events-none absolute inset-3 rounded-full border border-dashed border-emerald-400/30" />
          <span className="pointer-events-none absolute top-1.5 text-[9px] font-bold text-emerald-400/75">TURUN</span>
          <span className="pointer-events-none absolute bottom-1.5 text-[9px] font-bold text-emerald-400/75">NAIK</span>
          <span className="pointer-events-none absolute left-2 text-[9px] font-bold text-emerald-400/75">L</span>
          <span className="pointer-events-none absolute right-2 text-[9px] font-bold text-emerald-400/75">R</span>

          {/* Tombol Knob Joystick */}
          <div
            style={{ transform: `translate(${knobPos.x}px, ${knobPos.y}px)` }}
            className="pointer-events-none h-11 w-11 sm:h-12 sm:w-12 rounded-full border-2 border-emerald-300 bg-gradient-to-br from-emerald-400/80 to-emerald-700/90 shadow-[0_0_16px_rgba(52,211,153,0.65)]"
          />
        </div>
      </div>
    </div>
  );
}
