import { useState } from 'react';
import {
  Activity,
  Check,
  ChevronUp,
  FileText,
  Flame,
  Grid3X3,
  Lock,
  Mail,
  MapPin,
  Phone,
  PlaneLanding,
  PlaneTakeoff,
  Rotate3d,
  RotateCcw,
  ShieldAlert,
  Square,
  Waves,
  Wind,
} from 'lucide-react';
import { useHangarStore } from '../../store/useHangarStore';

export function BottomDock() {
  const selectedId = useHangarStore((s) => s.selectedId);
  const wireframe = useHangarStore((s) => s.wireframe);
  const showInfographic = useHangarStore((s) => s.showInfographic);
  const showPins = useHangarStore((s) => s.showPins);
  const autoRotate = useHangarStore((s) => s.autoRotate);
  const aeroMode = useHangarStore((s) => s.aeroMode);
  const safetyMode = useHangarStore((s) => s.safetyMode);
  const oxygenMode = useHangarStore((s) => s.oxygenMode);
  const flightMode = useHangarStore((s) => s.flightMode);
  const flightLabel = useHangarStore((s) => s.flightLabel);

  const toggle = useHangarStore((s) => s.toggle);
  const toggleInfographic = useHangarStore((s) => s.toggleInfographic);
  const triggerTakeOff = useHangarStore((s) => s.triggerTakeOff);
  const triggerManeuver = useHangarStore((s) => s.triggerManeuver);
  const triggerLanding = useHangarStore((s) => s.triggerLanding);
  const toggleEngineSim = useHangarStore((s) => s.toggleEngineSim);
  const setFlightState = useHangarStore((s) => s.setFlightState);
  const resetCamera = useHangarStore((s) => s.resetCamera);

  const [simMenuOpen, setSimMenuOpen] = useState(false);

  const isGSuit = selectedId === 'gsuit';
  const isHelmet = selectedId === 'pilot-helmet';
  const isEquipment = isGSuit || isHelmet;
  const anySimActive = flightMode !== 'parked' || safetyMode || oxygenMode;

  const canTakeOff = flightMode === 'parked';
  const isAirborneReady = flightMode === 'airborne' || flightMode === 'maneuver';
  const takeOffDone = flightMode === 'airborne' || flightMode === 'maneuver' || flightMode === 'landing';

  const stopAllSim = () => {
    if (safetyMode) toggle('safetyMode');
    if (oxygenMode) toggle('oxygenMode');
    setFlightState('parked', null);
    setSimMenuOpen(false);
  };

  const buttons: {
    id: string;
    label: string;
    short: string;
    icon: typeof Activity;
    active: boolean;
    onClick: () => void;
    accent?: 'amber' | 'emerald';
    hasMenu?: boolean;
  }[] = [
    ...(isEquipment
      ? [
          {
            id: 'sim-equip',
            label: isGSuit ? 'Simulasi 9G' : 'Simulasi HMDS',
            short: isGSuit ? 'Sim 9G' : 'HMDS',
            icon: Activity,
            active: flightMode === 'engineSim',
            onClick: toggleEngineSim,
            accent: (isGSuit ? 'amber' : 'emerald') as 'amber' | 'emerald',
          },
        ]
      : [
          {
            id: 'simulasi',
            label: 'Simulasi',
            short: 'Simulasi',
            icon: Flame,
            active: simMenuOpen || anySimActive,
            onClick: () => setSimMenuOpen((v) => !v),
            accent: 'amber' as const,
            hasMenu: true,
          },
          {
            id: 'aero',
            label: 'Aerodinamika',
            short: 'Aero',
            icon: Wind,
            active: aeroMode,
            onClick: () => {
              setSimMenuOpen(false);
              toggle('aeroMode');
            },
          },
        ]),
    {
      id: 'infographic',
      label: 'Spesifikasi',
      short: 'Spek',
      icon: FileText,
      active: showInfographic,
      onClick: () => {
        setSimMenuOpen(false);
        toggleInfographic();
      },
    },
    {
      id: 'wireframe',
      label: 'Wireframe',
      short: 'Wire',
      icon: Grid3X3,
      active: wireframe,
      onClick: () => toggle('wireframe'),
    },
    {
      id: 'pins',
      label: 'Pin Hotspot',
      short: 'Pin',
      icon: MapPin,
      active: showPins,
      onClick: () => toggle('showPins'),
    },
    {
      id: 'rotate',
      label: 'Putar 360°',
      short: '360°',
      icon: Rotate3d,
      active: autoRotate,
      onClick: () => toggle('autoRotate'),
    },
  ];

  return (
    <div className="pointer-events-none fixed bottom-1.5 sm:bottom-2 left-0 right-0 z-30 flex flex-col items-center gap-1 sm:gap-1.5 px-2 sm:px-3">
      {/* Indikator Fase Penerbangan / Safety */}
      {flightLabel && (
        <div className="hud-panel pointer-events-none rounded-full border-[#ffb703]/60 px-3.5 py-1 font-display text-[11px] sm:text-xs font-bold tracking-[0.16em] text-[#ffb703] uppercase shadow-amber animate-slidein">
          {flightLabel}
        </div>
      )}

      {/* Sub-Menu Ringkas "SIMULASI" Berurutan: 1. Take Off -> 2. Manuver -> 3. Landing */}
      {simMenuOpen && !isEquipment && (
        <div className="hud-panel pointer-events-auto flex flex-col items-center gap-1.5 rounded-2xl border-[#ffb703]/50 bg-[#091c3a]/95 px-3 py-2 shadow-[0_12px_32px_rgba(2,10,28,0.85)] animate-slidein">
          <div className="text-[10px] sm:text-[11px] font-medium tracking-wider text-slate-300">
            {flightMode === 'parked' && 'Tahapan Terbang: 1. Take Off → 2. Manuver → 3. Landing'}
            {flightMode === 'takeoff' && 'Pesawat sedang lepas landas di Runway... tunggu mengudara'}
            {flightMode === 'airborne' && 'Pesawat sudah mengudara! Lanjut klik 2. Manuver atau 3. Landing'}
            {flightMode === 'maneuver' && 'Manuver udara aktif! Klik 3. Landing untuk mendarat di Runway'}
            {flightMode === 'landing' && 'Pesawat sedang melakukan pendaratan ke Runway...'}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <button
              type="button"
              disabled={!canTakeOff}
              title={canTakeOff ? 'Mulai lepas landas dari Runway' : 'Pesawat sudah lepas landas'}
              onClick={() => {
                if (!canTakeOff) return;
                if (safetyMode) toggle('safetyMode');
                if (oxygenMode) toggle('oxygenMode');
                triggerTakeOff();
                setSimMenuOpen(false);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 font-display text-xs font-bold tracking-wider uppercase transition-all ${
                flightMode === 'takeoff'
                  ? 'border-[#ffb703] bg-[#ffb703] text-[#0a1e3c] cursor-default'
                  : takeOffDone
                    ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300/80 cursor-not-allowed'
                    : 'border-[#ffb703]/70 bg-[#0e2a54] text-[#ffb703] hover:bg-[#ffb703]/20 cursor-pointer active:scale-95 shadow-amber'
              }`}
            >
              {takeOffDone ? <Check className="h-3.5 w-3.5" /> : <PlaneTakeoff className="h-4 w-4" />}
              1. Take Off
            </button>

            <button
              type="button"
              disabled={!isAirborneReady}
              title={
                isAirborneReady
                  ? 'Jalankan manuver udara (Barrel Roll, High-G Break, Cobra Climb)'
                  : 'Terkunci — lakukan 1. Take Off terlebih dahulu'
              }
              onClick={() => {
                if (!isAirborneReady) return;
                if (safetyMode) toggle('safetyMode');
                if (oxygenMode) toggle('oxygenMode');
                triggerManeuver();
                setSimMenuOpen(false);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 font-display text-xs font-bold tracking-wider uppercase transition-all ${
                flightMode === 'maneuver'
                  ? 'border-[#4da6ff] bg-[#4da6ff] text-[#0a1e3c] cursor-pointer active:scale-95'
                  : isAirborneReady
                    ? 'border-[#4da6ff]/80 bg-[#0e2a54] text-[#75bcff] hover:bg-[#4da6ff]/20 cursor-pointer active:scale-95 shadow-glow'
                    : 'border-slate-700/70 bg-slate-900/60 text-slate-500 opacity-60 cursor-not-allowed'
              }`}
            >
              {isAirborneReady ? <Flame className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}
              2. Manuver
            </button>

            <button
              type="button"
              disabled={!isAirborneReady}
              title={
                isAirborneReady
                  ? 'Turun & mendarat kembali ke Runway'
                  : 'Terkunci — lakukan 1. Take Off terlebih dahulu'
              }
              onClick={() => {
                if (!isAirborneReady) return;
                if (safetyMode) toggle('safetyMode');
                if (oxygenMode) toggle('oxygenMode');
                triggerLanding();
                setSimMenuOpen(false);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 font-display text-xs font-bold tracking-wider uppercase transition-all ${
                flightMode === 'landing'
                  ? 'border-emerald-400 bg-emerald-400 text-[#0a1e3c] cursor-default'
                  : isAirborneReady
                    ? 'border-emerald-400/75 bg-[#0e2a54] text-emerald-300 hover:bg-emerald-400/20 cursor-pointer active:scale-95'
                    : 'border-slate-700/70 bg-slate-900/60 text-slate-500 opacity-60 cursor-not-allowed'
              }`}
            >
              {isAirborneReady ? <PlaneLanding className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}
              3. Landing
            </button>

            <div className="mx-0.5 h-6 w-px bg-[#4da6ff]/25 hidden sm:block" />

            <button
              type="button"
              onClick={() => {
                toggle('safetyMode');
                setSimMenuOpen(false);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 font-display text-xs font-bold tracking-wider uppercase transition-all cursor-pointer active:scale-95 ${
                safetyMode
                  ? 'border-rose-400 bg-rose-400 text-[#0a1e3c]'
                  : 'border-rose-400/45 bg-[#0e2a54] text-rose-300 hover:bg-rose-400/20'
              }`}
            >
              <ShieldAlert className="h-4 w-4" />
              Safety 3D
            </button>

            <button
              type="button"
              onClick={() => {
                toggle('oxygenMode');
                setSimMenuOpen(false);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 font-display text-xs font-bold tracking-wider uppercase transition-all cursor-pointer active:scale-95 ${
                oxygenMode
                  ? 'border-cyan-400 bg-cyan-400 text-[#0a1e3c]'
                  : 'border-cyan-400/45 bg-[#0e2a54] text-cyan-300 hover:bg-cyan-400/20'
              }`}
            >
              <Waves className="h-4 w-4" />
              Oksigen OBOGS
            </button>

            {anySimActive && (
              <button
                type="button"
                onClick={stopAllSim}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-500/60 bg-slate-800/90 px-3 py-2 font-display text-xs font-bold tracking-wider text-slate-200 uppercase hover:border-white hover:text-white cursor-pointer active:scale-95"
              >
                <Square className="h-3.5 w-3.5" />
                Stop
              </button>
            )}
          </div>
        </div>
      )}

      <nav
        aria-label="Kontrol Hangar 3D"
        className="hud-panel pointer-events-auto flex max-w-full items-center gap-1 sm:gap-2 overflow-x-auto rounded-2xl px-1.5 sm:px-3 py-1.5 sm:py-2"
      >
        {buttons.map((b) => {
          const Icon = b.icon;
          const activeClass =
            b.accent === 'amber'
              ? 'border-[#ffb703] bg-[#ffb703]/20 text-[#ffb703] shadow-amber'
              : b.accent === 'emerald'
                ? 'border-emerald-400 bg-emerald-400/20 text-emerald-300 shadow-[0_0_16px_rgba(52,211,153,0.4)]'
                : 'border-[#4da6ff] bg-[#4da6ff]/20 text-[#4da6ff] shadow-glow';
          return (
            <button
              key={b.id}
              type="button"
              onClick={b.onClick}
              aria-pressed={b.active}
              title={b.label}
              className={`min-h-[44px] min-w-[44px] sm:min-h-[48px] sm:min-w-[48px] flex flex-col sm:flex-row items-center justify-center shrink-0 gap-0.5 sm:gap-2 rounded-lg border px-2 sm:px-3.5 py-1 transition-all duration-200 cursor-pointer active:scale-95 font-display text-[10px] sm:text-sm font-bold tracking-wider uppercase ${
                b.active
                  ? activeClass
                  : 'border-slate-700/80 bg-[#0e2a54]/80 text-slate-200 hover:border-[#4da6ff]/60 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="sm:hidden whitespace-nowrap leading-none">{b.short}</span>
              <span className="hidden sm:inline whitespace-nowrap">{b.label}</span>
              {b.hasMenu && (
                <ChevronUp
                  className={`hidden sm:inline h-3.5 w-3.5 transition-transform ${simMenuOpen ? 'rotate-180' : ''}`}
                />
              )}
            </button>
          );
        })}

        <div className="mx-0.5 h-7 sm:h-8 w-px shrink-0 bg-[#4da6ff]/25" />

        <button
          type="button"
          onClick={() => {
            setSimMenuOpen(false);
            resetCamera();
          }}
          title="Reset Kamera"
          className="min-h-[44px] min-w-[44px] sm:min-h-[48px] sm:min-w-[48px] flex flex-col sm:flex-row items-center justify-center shrink-0 gap-0.5 sm:gap-2 rounded-lg border border-slate-700/80 bg-[#0e2a54]/80 px-2 sm:px-3.5 py-1 font-display text-[10px] sm:text-sm font-bold tracking-wider text-slate-200 uppercase hover:border-[#4da6ff]/60 hover:text-white transition-all duration-200 cursor-pointer active:scale-95"
        >
          <RotateCcw className="h-4 w-4 shrink-0 text-[#4da6ff]" />
          <span className="sm:hidden whitespace-nowrap leading-none">Reset</span>
          <span className="hidden sm:inline whitespace-nowrap">Reset Kamera</span>
        </button>
      </nav>

      {/* Footer Kredit & Kontak di Bagian Bawah Aplikasi */}
      <footer className="hud-panel pointer-events-auto flex flex-wrap items-center justify-center gap-x-2.5 sm:gap-x-3 gap-y-0.5 rounded-full px-3 sm:px-4 py-1 text-[10px] sm:text-xs text-slate-300">
        <a
          href="mailto:bangelan@gmail.com"
          title="Kirim email ke bangelan@gmail.com"
          className="inline-flex items-center gap-1 text-[#ffb703] hover:text-[#ffd166] hover:underline transition-colors"
        >
          <Mail className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
          <span>
            Created By : <strong className="font-semibold">Abang Elan</strong>
          </span>
        </a>
        <span className="text-[#4da6ff]/45">•</span>
        <a
          href="tel:+6281314127822"
          title="Hubungi +6281314127822"
          className="inline-flex items-center gap-1 text-[#4da6ff] hover:text-white hover:underline transition-colors"
        >
          <Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
          <span>+6281314127822</span>
        </a>
      </footer>
    </div>
  );
}
