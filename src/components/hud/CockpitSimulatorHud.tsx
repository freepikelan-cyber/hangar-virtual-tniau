import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Award,
  BookOpen,
  Camera,
  CheckCircle2,
  ChevronRight,
  Compass,
  Flame,
  LogOut,
  Navigation,
  RotateCcw,
  Target,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useHangarStore, useSelectedUnit } from '../../store/useHangarStore';
import {
  cockpitInput,
  cockpitTelemetry,
  getFlightProfileSpec,
  SIM_MISSIONS,
  type SimCameraMode,
} from '../../utils/cockpitSimState';
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
  cameraMode: SimCameraMode;
  lookYawDeg: number;
  lookPitchDeg: number;
  crashed: boolean;
  crashTimer: number;
  crashReason: string;
  missionId: number;
  missionCompleted: boolean;
  missionProgressText: string;
  coachHint: string;
  autopilot: boolean;
}

type ManualTab = 'takeoff' | 'controls' | 'landing' | 'missions';

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

const CAM_LABELS: Record<SimCameraMode, string> = {
  cockpit: 'Kokpit (1st)',
  chase: 'Ekor (Chase)',
  wing: 'Sayap (Wing)',
  orbit: 'Orbit 360°',
};

/**
 * HUD Simulator Terbang TNI AU:
 * - Multi-Kamera (Kokpit, Ekor Chase, Sayap, Orbit)
 * - Buku Manual Pilot Interaktif (Ikon Buku dengan 4 Bab Lengkap)
 * - 5 Misi Pelatihan Progresif (Mudah -> Sangat Sulit) + Pilot Coach Live
 * - Peringatan & Auto-Reset saat Pesawat Jatuh Terbakar (Crash)
 * - Kontrol Ganda Keyboard + Sentuh Smartboard
 */
export function CockpitSimulatorHud() {
  const unit = useSelectedUnit();
  const exitCockpitSim = useHangarStore((s) => s.exitCockpitSim);
  const soundEnabled = useHangarStore((s) => s.soundEnabled);
  const toggle = useHangarStore((s) => s.toggle);

  const profile = getFlightProfileSpec(unit.category);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualTab, setManualTab] = useState<ManualTab>('takeoff');
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
    cameraMode: 'cockpit',
    lookYawDeg: 0,
    lookPitchDeg: 0,
    crashed: false,
    crashTimer: 0,
    crashReason: '',
    missionId: 1,
    missionCompleted: false,
    missionProgressText: 'Siap di Runway 09',
    coachHint: 'Dorong Throttle (Shift / Slider Kiri) ke 90–100% untuk mulai melaju!',
    autopilot: false,
  });

  const joyBaseRef = useRef<HTMLDivElement>(null);
  const joyPointerId = useRef<number | null>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [sliderPct, setSliderPct] = useState(0);

  // Keyboard listeners (W/A/S/D, Shift/Ctrl, G, C Kamera, M Manual, R Reset, Esc)
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
      if (k === 'p' && !e.repeat) cockpitInput.toggleAutopilotRequested = true;
      if (k === 'c' && !e.repeat) cockpitInput.cycleCameraRequested = true;
      if (k === 'm' && !e.repeat) setManualOpen((v) => !v);
      if (k === 'q') cockpitTelemetry.lookYaw = Math.min(Math.PI, cockpitTelemetry.lookYaw + 0.16);
      if (k === 'e') cockpitTelemetry.lookYaw = Math.max(-Math.PI, cockpitTelemetry.lookYaw - 0.16);
      if (k === 'v' && !e.repeat) {
        cockpitTelemetry.lookYaw = 0;
        cockpitTelemetry.lookPitch = 0;
      }
      if (k === 'r' && !e.repeat) {
        cockpitInput.resetRequested = true;
        setSliderPct(0);
      }
      if (e.key === 'Escape') {
        setManualOpen((open) => {
          if (open) return false;
          exitCockpitSim();
          return false;
        });
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

  // Sinkronkan telemetri HUD ~24 FPS
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
        cameraMode: t.cameraMode,
        lookYawDeg: Math.round((t.lookYaw * 180) / Math.PI),
        lookPitchDeg: Math.round((t.lookPitch * 180) / Math.PI),
        crashed: t.crashed,
        crashTimer: t.crashTimer,
        crashReason: t.crashReason,
        missionId: t.missionId,
        missionCompleted: t.missionCompleted,
        missionProgressText: t.missionProgressText,
        coachHint: t.coachHint,
        autopilot: t.autopilot,
      });
    }, 42);
    return () => window.clearInterval(timer);
  }, []);

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
    cockpitInput.touchRoll = dx / maxR;
    cockpitInput.touchPitch = dy / maxR;
  };

  const resetJoystick = () => {
    joyPointerId.current = null;
    setKnobPos({ x: 0, y: 0 });
    cockpitInput.touchRoll = 0;
    cockpitInput.touchPitch = 0;
  };

  const hdgLabel = COMPASS_LABELS[(Math.round(hud.headingDeg / 45) * 45) % 360] ?? '';
  const activeMission = SIM_MISSIONS.find((m) => m.id === hud.missionId) ?? SIM_MISSIONS[0];

  return (
    <div className="app-cockpit-hud pointer-events-none fixed inset-0 z-30 select-none overflow-hidden font-mono">
      {/* === BAR ATAS: IDENTITAS UNIT, KAMERA, BUKU MANUAL PILOT, RESET & KELUAR KOKPIT === */}
      <div className="app-cockpit-topbar flex flex-wrap items-start justify-between gap-1.5 sm:gap-2 px-3 sm:px-5 pt-2.5 sm:pt-3.5">
        <div className="pointer-events-auto flex items-center gap-2.5 rounded-xl border border-emerald-400/45 bg-[#04140e]/85 px-3 py-2 backdrop-blur-sm">
          <div>
            <p className="font-display text-[10px] font-bold tracking-[0.18em] text-emerald-400 uppercase">
              SIMULATOR 3D • {profile.label}
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

        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          {/* Tombol Mode Jelajah / Autopilot (Tombol P) */}
          <button
            type="button"
            onClick={() => {
              cockpitSimAudio.start();
              cockpitInput.toggleAutopilotRequested = true;
            }}
            title="Nyalakan / Matikan Mode Jelajah Autopilot (Tombol P)"
            className={`flex h-10 items-center gap-1.5 rounded-lg border-2 px-3 font-display text-xs font-bold tracking-wider uppercase cursor-pointer active:scale-95 transition-all ${
              hud.autopilot
                ? 'border-emerald-300 bg-emerald-500/30 text-emerald-100 shadow-[0_0_16px_rgba(16,185,129,0.5)]'
                : 'border-sky-400/65 bg-[#061d2e]/90 text-sky-200 hover:bg-sky-500/20'
            }`}
          >
            <Navigation className={`h-4 w-4 ${hud.autopilot ? 'text-emerald-300 animate-pulse' : 'text-sky-300'}`} />
            <span>{hud.autopilot ? 'Jelajah: ON' : 'Mode Jelajah'}</span>
          </button>

          {/* Tombol Ganti Kamera (Dalam Kokpit / Ekor / Sayap / Orbit 360°) */}
          <button
            type="button"
            onClick={() => {
              cockpitInput.cycleCameraRequested = true;
            }}
            title="Ganti Sudut Pandang Kamera (Tombol C)"
            className="flex h-10 items-center gap-1.5 rounded-lg border border-cyan-400/65 bg-[#061d2e]/90 px-3 font-display text-xs font-bold tracking-wider text-cyan-200 uppercase hover:bg-cyan-500/20 cursor-pointer active:scale-95"
          >
            <Camera className="h-4 w-4 text-cyan-300" />
            <span>{CAM_LABELS[hud.cameraMode]}</span>
          </button>

          {/* Tombol Ikon Buku Manual Pilot */}
          <button
            type="button"
            onClick={() => setManualOpen(true)}
            title="Buka Buku Manual Kemudi Pilot (Tombol M)"
            className="flex h-10 items-center gap-1.5 rounded-lg border-2 border-amber-400/80 bg-amber-500/20 px-3 font-display text-xs font-bold tracking-wider text-amber-200 uppercase shadow-[0_0_14px_rgba(251,191,36,0.3)] hover:bg-amber-500/35 cursor-pointer active:scale-95"
          >
            <BookOpen className="h-4 w-4 text-amber-300" />
            <span>Manual Pilot</span>
          </button>

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
            <span className="hidden md:inline">Reset</span>
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

      {/* === KARTU MISI PELATIHAN PROGRESIF & PILOT COACH (KIRI ATAS) === */}
      <div className="app-cockpit-mission pointer-events-auto ml-3 sm:ml-5 mt-2 w-[min(340px,calc(100vw-1.5rem))] rounded-xl border border-emerald-400/45 bg-[#04140e]/85 p-2.5 backdrop-blur-sm shadow-lg">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Award className="h-4 w-4 text-amber-300 shrink-0" />
            <span className="font-display text-[11px] font-bold tracking-wider text-white uppercase">
              {activeMission.title}
            </span>
          </div>
          <span
            className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
              activeMission.difficulty === 'MUDAH'
                ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/40'
                : activeMission.difficulty === 'MENENGAH'
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-400/40'
                  : activeMission.difficulty === 'SULIT'
                    ? 'bg-orange-500/25 text-orange-300 border border-orange-400/40'
                    : 'bg-rose-500/25 text-rose-300 border border-rose-400/40'
            }`}
          >
            {activeMission.difficulty}
          </span>
        </div>

        {/* Pemilih Level Misi 1 -> 5 */}
        <div className="mt-1.5 flex items-center gap-1">
          {SIM_MISSIONS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                cockpitInput.requestedMissionId = m.id;
                setSliderPct(0);
              }}
              className={`flex-1 rounded py-1 font-display text-[10px] font-bold transition-all cursor-pointer ${
                hud.missionId === m.id
                  ? 'bg-emerald-400 text-[#03140d] shadow'
                  : 'border border-emerald-400/30 bg-[#082217] text-emerald-300 hover:bg-emerald-500/20'
              }`}
            >
              Misi {m.id}
            </button>
          ))}
        </div>

        <div className="mt-1.5 flex items-center justify-between text-[10px] text-emerald-300/90">
          <span>Target: {hud.missionProgressText}</span>
          {hud.missionCompleted && (
            <span className="inline-flex items-center gap-1 font-bold text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" /> SELESAI!
            </span>
          )}
        </div>

        <p className="mt-1 rounded-lg border border-amber-400/30 bg-amber-500/10 px-2 py-1.5 text-[11px] leading-snug text-amber-200">
          {hud.coachHint}
        </p>

        {hud.missionCompleted && hud.missionId < SIM_MISSIONS.length && (
          <button
            type="button"
            onClick={() => {
              cockpitInput.requestedMissionId = hud.missionId + 1;
              setSliderPct(0);
            }}
            className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-lg bg-emerald-500 py-1.5 font-display text-xs font-bold tracking-wider text-[#03140d] uppercase hover:bg-emerald-400 cursor-pointer active:scale-95"
          >
            <span>Lanjut ke Misi {hud.missionId + 1}</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {/* Kontrol Cepat Arah Kepala Pilot 360° (Tengok Kiri / Atas / Depan / Kanan / Belakang — bisa juga seret layar!) */}
        <div className="mt-2 border-t border-emerald-400/25 pt-1.5">
          <div className="flex items-center justify-between text-[9px] font-bold tracking-wider text-cyan-300/90 uppercase mb-1">
            <span>Tengok Kepala (Seret Layar / Q-E)</span>
            <span>
              {hud.lookYawDeg === 0 && hud.lookPitchDeg === 0
                ? 'DEPAN'
                : `${hud.lookYawDeg > 0 ? `KIRI ${hud.lookYawDeg}°` : hud.lookYawDeg < 0 ? `KANAN ${Math.abs(hud.lookYawDeg)}°` : ''}${
                    hud.lookPitchDeg > 8 ? ' ATAS' : ''
                  }`}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {[
              { label: 'Kiri', yaw: Math.PI / 2, pitch: 0.05 },
              { label: 'Atas', yaw: 0, pitch: 0.95 },
              { label: 'Depan', yaw: 0, pitch: 0 },
              { label: 'Kanan', yaw: -Math.PI / 2, pitch: 0.05 },
              { label: 'Belakang', yaw: Math.PI, pitch: 0.14 },
            ].map((view) => {
              const isCur =
                Math.abs(hud.lookYawDeg - Math.round((view.yaw * 180) / Math.PI)) < 15 &&
                Math.abs(hud.lookPitchDeg - Math.round((view.pitch * 180) / Math.PI)) < 20;
              return (
                <button
                  key={view.label}
                  type="button"
                  onClick={() => {
                    cockpitTelemetry.lookYaw = view.yaw;
                    cockpitTelemetry.lookPitch = view.pitch;
                  }}
                  className={`rounded py-1 font-display text-[9px] font-bold uppercase cursor-pointer active:scale-95 ${
                    isCur
                      ? 'bg-cyan-400 text-[#03140d]'
                      : 'border border-cyan-400/35 bg-[#072030] text-cyan-200 hover:bg-cyan-500/25'
                  }`}
                >
                  {view.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* === HEAD-UP DISPLAY (HUD) MILITER HIJAU BERCAHAYA DI TENGAH LAYAR === */}
      {!hud.crashed && (
        <div
          className={`pointer-events-none fixed inset-0 flex items-center justify-center transition-opacity ${
            hud.cameraMode === 'cockpit' && Math.abs(hud.lookYawDeg) < 35 && Math.abs(hud.lookPitchDeg) < 35
              ? 'opacity-100'
              : 'opacity-45'
          }`}
        >
          <div
            className="relative h-[min(60vh,430px)] w-[min(86vw,540px)]"
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

            {/* 2. Pitch Ladder & Artificial Horizon Dinamis (SVG) — lebih jernih saat mode luar */}
            {hud.cameraMode === 'cockpit' && (
              <svg viewBox="0 0 360 280" className="h-full w-full overflow-hidden">
                <defs>
                  <clipPath id="hud-horizon-clip">
                    <rect x="70" y="46" width="220" height="186" />
                  </clipPath>
                </defs>

                <g clipPath="url(#hud-horizon-clip)">
                  <g transform={`translate(180, 140) rotate(${-hud.rollDeg}) translate(0, ${hud.pitchDeg * 2.8})`}>
                    <line x1="-110" y1="0" x2="-26" y2="0" stroke="#34ff9a" strokeWidth="2.2" />
                    <line x1="26" y1="0" x2="110" y2="0" stroke="#34ff9a" strokeWidth="2.2" />

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

                <g transform="translate(180, 140)" stroke="#34ff9a" strokeWidth="2.2" fill="none">
                  <circle cx="0" cy="0" r="6" />
                  <line x1="-20" y1="0" x2="-6" y2="0" />
                  <line x1="6" y1="0" x2="20" y2="0" />
                  <line x1="0" y1="-12" x2="0" y2="-6" />
                </g>
              </svg>
            )}

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
      )}

      {/* === OVERLAY PESAWAT JATUH & TERBAKAR (AUTO-RESET KE RUNWAY) === */}
      {hud.crashed && (
        <div className="pointer-events-none fixed inset-0 flex items-center justify-center bg-rose-950/25">
          <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-rose-500 bg-[#1c070b]/92 px-6 py-5 text-center shadow-[0_0_40px_rgba(244,63,94,0.65)] animate-pulse">
            <Flame className="h-10 w-10 text-amber-400" />
            <h3 className="font-display text-lg sm:text-2xl font-bold tracking-[0.2em] text-rose-300 uppercase">
              MAYDAY! PESAWAT JATUH &amp; TERBAKAR
            </h3>
            <p className="text-xs sm:text-sm font-bold text-amber-200">{hud.crashReason}</p>
            <p className="mt-1 rounded-lg bg-black/50 px-3 py-1 text-xs font-bold text-white">
              Mengulang dari Runway 09 dalam {hud.crashTimer.toFixed(1)} detik...
            </p>
          </div>
        </div>
      )}

      {/* === MODAL BUKU MANUAL KEMUDI PILOT TNI AU === */}
      {manualOpen && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-6 backdrop-blur-sm">
          <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border-2 border-amber-400/65 bg-[#07192d] shadow-[0_0_50px_rgba(251,191,36,0.28)]">
            <div className="flex items-center justify-between border-b border-amber-400/30 bg-[#0b2542] px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-400/60 bg-amber-500/20">
                  <BookOpen className="h-5 w-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-display text-sm sm:text-base font-bold tracking-wider text-white uppercase">
                    BUKU MANUAL PILOT • {unit.name}
                  </h3>
                  <p className="text-[11px] text-amber-200/85">
                    Panduan Resmi Mengemudikan Pesawat di Mode Simulator 3D
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setManualOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-600 bg-slate-800/80 text-slate-300 hover:bg-rose-600 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tab Bab Buku Manual */}
            <div className="flex flex-wrap gap-1.5 border-b border-white/10 bg-[#081d35] px-5 py-2.5">
              {[
                { id: 'takeoff', label: '1. Cara Take Off' },
                { id: 'controls', label: '2. Kendali & HUD' },
                { id: 'landing', label: '3. Cara Landing Aman' },
                { id: 'missions', label: '4. Misi & Kamera' },
              ].map((tb) => (
                <button
                  key={tb.id}
                  type="button"
                  onClick={() => setManualTab(tb.id as ManualTab)}
                  className={`rounded-lg px-3 py-1.5 font-display text-xs font-bold uppercase transition-all cursor-pointer ${
                    manualTab === tb.id
                      ? 'bg-amber-400 text-[#07192d]'
                      : 'border border-sky-400/30 bg-[#0d2847] text-sky-200 hover:bg-sky-500/20'
                  }`}
                >
                  {tb.label}
                </button>
              ))}
            </div>

            {/* Isi Buku Manual */}
            <div className="flex-1 overflow-y-auto p-5 text-xs sm:text-sm leading-relaxed text-slate-200 space-y-3 font-sans">
              {manualTab === 'takeoff' && (
                <div className="space-y-3">
                  <h4 className="font-display text-sm font-bold text-amber-300 uppercase">
                    Prosedur Lepas Landas ({profile.isVtol ? 'Helikopter VTOL' : 'Pesawat Sayap Tetap'})
                  </h4>
                  {profile.isVtol ? (
                    <ol className="list-decimal pl-5 space-y-2">
                      <li>
                        Naikkan tuas <strong>COLLECTIVE (Throttle)</strong> di atas <strong>55%</strong> dengan tahan tombol{' '}
                        <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-amber-300">SHIFT</kbd> atau geser Slider Kiri ke atas. Helikopter akan terangkat lurus vertikal!
                      </li>
                      <li>
                        Setelah cukup tinggi, dorong sedikit stik ke depan (tekan <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-amber-300">W</kbd> / geser Joystick ke atas) untuk melaju ke depan.
                      </li>
                      <li>
                        Gunakan <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-amber-300">A</kbd> / <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-amber-300">D</kbd> untuk berbelok arah kiri &amp; kanan dengan halus.
                      </li>
                    </ol>
                  ) : (
                    <ol className="list-decimal pl-5 space-y-2">
                      <li>
                        <strong>Langkah 1 (Power Up):</strong> Tahan tombol{' '}
                        <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-amber-300">SHIFT</kbd> atau geser{' '}
                        <strong>Slider Throttle Kiri</strong> sampai <strong>90–100%</strong>. Pesawat akan meluncur kencang di Runway 09.
                      </li>
                      <li>
                        <strong>Langkah 2 (Rotate &amp; Liftoff):</strong> Perhatikan angka kecepatan <strong>IAS KTS</strong> di sebelah kiri HUD. Setelah melewati{' '}
                        <strong>{profile.liftoffKts} KTS</strong>, tekan &amp; tahan{' '}
                        <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-amber-300">S</kbd> (atau tarik <strong>Joystick Bawah</strong>) agar hidung pesawat terangkat dan mengudara!
                      </li>
                      <li>
                        <strong>Langkah 3 (Gear Up):</strong> Setelah aman mengudara, tekan{' '}
                        <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-amber-300">G</kbd> (atau tombol <strong>Gear</strong>) untuk melipat roda pendarat agar laju pesawat lebih cepat dan aerodinamis.
                      </li>
                    </ol>
                  )}
                </div>
              )}

              {manualTab === 'controls' && (
                <div className="space-y-3">
                  <h4 className="font-display text-sm font-bold text-amber-300 uppercase">
                    Panduan Kendali &amp; Pembacaan HUD Kokpit
                  </h4>
                  <ul className="space-y-2">
                    <li>• <strong>Tarik Stik (S / Panah Bawah / Joystick Bawah):</strong> Menaikkan hidung pesawat (Menanjak / Climb).</li>
                    <li>• <strong>Dorong Stik (W / Panah Atas / Joystick Atas):</strong> Menurunkan hidung pesawat (Menukik / Dive).</li>
                    <li>• <strong>A / D (Panah Kiri / Kanan / Joystick Kiri-Kanan):</strong> Memiringkan sayap &amp; berbelok terkoordinasi.</li>
                    <li>• <strong>SHIFT / CTRL (atau Slider Kiri):</strong> Menambah / mengurangi tenaga mesin (Throttle).</li>
                    <li>• <strong>IAS KTS:</strong> Kecepatan udara (jangan sampai turun di bawah <strong>{profile.stallKts} KTS</strong> atau muncul <em>STALL WARNING</em>!).</li>
                    <li>• <strong>ALT FT:</strong> Ketinggian di atas permukaan laut/landasan. Jangan menukik tajam terlalu dekat tanah agar tidak muncul <em>PULL UP!</em> dan jatuh terbakar.</li>
                  </ul>
                </div>
              )}

              {manualTab === 'landing' && (
                <div className="space-y-3">
                  <h4 className="font-display text-sm font-bold text-amber-300 uppercase">
                    Prosedur Pendaratan Aman (Wajib agar Tidak Terbakar!)
                  </h4>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>Arahkan pesawat sejajar menuju aspal <strong>Runway 09</strong> (hindari mendarat di laut atau menabrak lereng di luar runway).</li>
                    <li><strong>Wajib Turunkan Roda:</strong> Tekan <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-amber-300">G</kbd> dan pastikan HUD kanan menunjukkan <strong className="text-emerald-300">GEAR DN</strong>.</li>
                    <li>Kurangi Throttle dengan <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-amber-300">CTRL</kbd> hingga kecepatan turun mendekati batas aman (&lt; <strong>{Math.round(profile.liftoffKts * 1.4)} KTS</strong>).</li>
                    <li>Jaga sayap rata (tidak miring tajam) dan sentuhkan roda secara lembut. Setelah menyentuh aspal, turunkan Throttle ke <strong>0%</strong> hingga berhenti!</li>
                  </ol>
                </div>
              )}

              {manualTab === 'missions' && (
                <div className="space-y-3">
                  <h4 className="font-display text-sm font-bold text-amber-300 uppercase">
                    5 Misi Pelatihan &amp; 4 Sudut Pandang Kamera
                  </h4>
                  <div className="space-y-1.5">
                    {SIM_MISSIONS.map((m) => (
                      <div key={m.id} className="rounded-lg border border-white/10 bg-[#0b2542]/70 px-3 py-2">
                        <div className="flex items-center justify-between font-bold text-emerald-300 text-xs">
                          <span>{m.title}</span>
                          <span>{m.difficulty}</span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5">{m.brief}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-cyan-200">
                    Tekan tombol <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-cyan-300">C</kbd> atau klik tombol <strong>Kamera</strong> di pojok kanan atas untuk melihat pesawat dari <strong>Dalam Kokpit</strong>, <strong>Ekor (Chase)</strong>, <strong>Sayap (Wing)</strong>, dan <strong>Orbit 360°</strong>!
                  </p>
                  <p className="text-xs text-emerald-200">
                    Saat berada di dalam kokpit, Anda bebas menengok ke segala arah (<strong>Kiri, Kanan, Atas, Bawah, hingga Belakang 180°</strong>) dengan <strong>menyeret layar (Mouse/Sentuh)</strong>, tombol cepat <strong>Tengok Kepala</strong>, atau tombol <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-emerald-300">Q</kbd> / <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-emerald-300">E</kbd> (dan <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-emerald-300">V</kbd> untuk kembali lurus ke depan).
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-white/10 bg-[#081d35] px-5 py-3">
              <button
                type="button"
                onClick={() => setManualOpen(false)}
                className="rounded-lg bg-amber-400 px-5 py-2 font-display text-xs font-bold tracking-wider text-[#07192d] uppercase hover:bg-amber-300 cursor-pointer"
              >
                Siap Terbang!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === KONTROL SENTUH SMARTBOARD / TABLET / HP + PANDUAN KEYBOARD === */}
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

      {/* Tengah Bawah: Petunjuk Singkat Keyboard */}
      <div className="pointer-events-none fixed bottom-4 left-1/2 hidden lg:flex -translate-x-1/2 items-center gap-2.5 rounded-full border border-emerald-400/35 bg-[#04140e]/80 px-4 py-1.5 text-[11px] text-emerald-200/90">
        <span><strong className="text-amber-300">SHIFT/CTRL</strong> Throttle</span>
        <span className="text-emerald-500/50">•</span>
        <span><strong className="text-amber-300">S/W</strong> Naik/Turun</span>
        <span className="text-emerald-500/50">•</span>
        <span><strong className="text-amber-300">A/D</strong> Belok</span>
        <span className="text-emerald-500/50">•</span>
        <span><strong className="text-amber-300">G</strong> Roda</span>
        <span className="text-emerald-500/50">•</span>
        <span><strong className="text-cyan-300">C</strong> Kamera</span>
        <span className="text-emerald-500/50">•</span>
        <span><strong className="text-amber-300">M</strong> Manual</span>
      </div>

      {/* Kanan Bawah: Virtual Joystick Sentuh */}
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
          <div className="pointer-events-none absolute inset-3 rounded-full border border-dashed border-emerald-400/30" />
          <span className="pointer-events-none absolute top-1.5 text-[9px] font-bold text-emerald-400/75">TURUN</span>
          <span className="pointer-events-none absolute bottom-1.5 text-[9px] font-bold text-emerald-400/75">NAIK</span>
          <span className="pointer-events-none absolute left-2 text-[9px] font-bold text-emerald-400/75">L</span>
          <span className="pointer-events-none absolute right-2 text-[9px] font-bold text-emerald-400/75">R</span>

          <div
            style={{ transform: `translate(${knobPos.x}px, ${knobPos.y}px)` }}
            className="pointer-events-none h-11 w-11 sm:h-12 sm:w-12 rounded-full border-2 border-emerald-300 bg-gradient-to-br from-emerald-400/80 to-emerald-700/90 shadow-[0_0_16px_rgba(52,211,153,0.65)]"
          />
        </div>
      </div>
    </div>
  );
}
