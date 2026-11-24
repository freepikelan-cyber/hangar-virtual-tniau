import {
  Activity,
  FileText,
  Flame,
  Grid3X3,
  Mail,
  MapPin,
  Phone,
  PlaneLanding,
  PlaneTakeoff,
  Rotate3d,
  RotateCcw,
} from 'lucide-react';
import { useHangarStore } from '../../store/useHangarStore';

export function BottomDock() {
  const selectedId = useHangarStore((s) => s.selectedId);
  const wireframe = useHangarStore((s) => s.wireframe);
  const showInfographic = useHangarStore((s) => s.showInfographic);
  const showPins = useHangarStore((s) => s.showPins);
  const autoRotate = useHangarStore((s) => s.autoRotate);
  const flightMode = useHangarStore((s) => s.flightMode);
  const flightLabel = useHangarStore((s) => s.flightLabel);

  const toggle = useHangarStore((s) => s.toggle);
  const toggleInfographic = useHangarStore((s) => s.toggleInfographic);
  const triggerTakeOff = useHangarStore((s) => s.triggerTakeOff);
  const triggerLanding = useHangarStore((s) => s.triggerLanding);
  const toggleEngineSim = useHangarStore((s) => s.toggleEngineSim);
  const resetCamera = useHangarStore((s) => s.resetCamera);

  const isGSuit = selectedId === 'gsuit';
  const isHelmet = selectedId === 'pilot-helmet';

  const flightButtons = isGSuit
    ? [
        {
          id: 'sim9g',
          label: 'Simulasi 9G',
          short: 'Sim 9G',
          icon: Activity,
          active: flightMode === 'engineSim',
          onClick: toggleEngineSim,
          accent: 'amber' as const,
        },
      ]
    : isHelmet
      ? [
          {
            id: 'simhmds',
            label: 'Simulasi HMDS',
            short: 'HMDS',
            icon: Activity,
            active: flightMode === 'engineSim',
            onClick: toggleEngineSim,
            accent: 'emerald' as const,
          },
        ]
      : [
        {
          id: 'takeoff',
          label: 'Take Off',
          short: 'Take Off',
          icon: PlaneTakeoff,
          active: flightMode === 'takeoff',
          onClick: triggerTakeOff,
          accent: 'amber' as const,
        },
        {
          id: 'landing',
          label: 'Landing',
          short: 'Landing',
          icon: PlaneLanding,
          active: flightMode === 'landing',
          onClick: triggerLanding,
          accent: 'emerald' as const,
        },
        {
          id: 'engine',
          label: 'Simulasi Mesin',
          short: 'Mesin',
          icon: Flame,
          active: flightMode === 'engineSim',
          onClick: toggleEngineSim,
          accent: 'amber' as const,
        },
      ];

  const buttons: {
    id: string;
    label: string;
    short: string;
    icon: typeof Activity;
    active: boolean;
    onClick: () => void;
    accent?: 'amber' | 'emerald';
  }[] = [
    ...flightButtons,
    {
      id: 'infographic',
      label: 'Spesifikasi',
      short: 'Spek',
      icon: FileText,
      active: showInfographic,
      onClick: toggleInfographic,
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
      {/* Indikator Fase Penerbangan (Take Off / Landing / Simulasi Mesin) */}
      {flightLabel && (
        <div className="hud-panel pointer-events-none rounded-full border-[#ffb703]/60 px-3.5 py-1 font-display text-[11px] sm:text-xs font-bold tracking-[0.16em] text-[#ffb703] uppercase shadow-amber animate-slidein">
          {flightLabel}
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
            </button>
          );
        })}

        <div className="mx-0.5 h-7 sm:h-8 w-px shrink-0 bg-[#4da6ff]/25" />

        <button
          type="button"
          onClick={resetCamera}
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
