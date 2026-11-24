import { Flame, Grid3X3, MapPin, Rotate3d, RotateCcw, ScanEye } from 'lucide-react';
import { useHangarStore } from '../../store/useHangarStore';

export function BottomDock() {
  const xray = useHangarStore((s) => s.xray);
  const wireframe = useHangarStore((s) => s.wireframe);
  const showPins = useHangarStore((s) => s.showPins);
  const autoRotate = useHangarStore((s) => s.autoRotate);
  const engineSim = useHangarStore((s) => s.engineSim);

  const toggle = useHangarStore((s) => s.toggle);
  const resetCamera = useHangarStore((s) => s.resetCamera);

  const buttons = [
    { id: 'xray', label: 'X-Ray', icon: ScanEye, active: xray, onClick: () => toggle('xray') },
    { id: 'wireframe', label: 'Wireframe', icon: Grid3X3, active: wireframe, onClick: () => toggle('wireframe') },
    { id: 'pins', label: 'Pin Hotspot', icon: MapPin, active: showPins, onClick: () => toggle('showPins') },
    { id: 'rotate', label: 'Putar 360°', icon: Rotate3d, active: autoRotate, onClick: () => toggle('autoRotate') },
    { id: 'engine', label: 'Simulasi Mesin', icon: Flame, active: engineSim, onClick: () => toggle('engineSim'), accent: 'amber' as const },
  ];

  return (
    <nav
      aria-label="Kontrol Hangar 3D"
      className="pointer-events-none fixed bottom-3 left-0 right-0 z-30 flex justify-center px-3"
    >
      <div className="hud-panel pointer-events-auto flex max-w-full items-center gap-2 overflow-x-auto rounded-2xl px-3 py-2">
        {buttons.map((b) => {
          const Icon = b.icon;
          const activeClass =
            b.accent === 'amber'
              ? 'border-[#ffb703] bg-[#ffb703]/20 text-[#ffb703] shadow-amber'
              : 'border-[#00d2ff] bg-[#00d2ff]/20 text-[#00d2ff] shadow-glow';
          return (
            <button
              key={b.id}
              type="button"
              onClick={b.onClick}
              aria-pressed={b.active}
              className={`hud-btn shrink-0 gap-2 px-3.5 font-display text-xs sm:text-sm font-bold tracking-wider uppercase ${
                b.active
                  ? activeClass
                  : 'border-slate-700/80 bg-[#081526]/80 text-slate-200 hover:border-[#00d2ff]/60 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">{b.label}</span>
            </button>
          );
        })}

        <div className="mx-0.5 h-8 w-px shrink-0 bg-[#00d2ff]/25" />

        <button
          type="button"
          onClick={resetCamera}
          className="hud-btn shrink-0 gap-2 border-slate-700/80 bg-[#081526]/80 px-3.5 font-display text-xs sm:text-sm font-bold tracking-wider text-slate-200 uppercase hover:border-[#00d2ff]/60 hover:text-white"
        >
          <RotateCcw className="h-4 w-4 shrink-0 text-[#00d2ff]" />
          <span className="whitespace-nowrap">Reset Kamera</span>
        </button>
      </div>
    </nav>
  );
}
