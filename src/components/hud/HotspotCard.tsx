import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useHangarStore, useSelectedUnit } from '../../store/useHangarStore';

export function HotspotCard() {
  const unit = useSelectedUnit();
  const activeHotspot = useHangarStore((s) => s.activeHotspot);
  const focusHotspot = useHangarStore((s) => s.focusHotspot);
  const clearHotspot = useHangarStore((s) => s.clearHotspot);
  const quizStatus = useHangarStore((s) => s.quiz.status);

  if (activeHotspot === null || quizStatus === 'active') return null;

  const idx = unit.hotspots.findIndex((h) => h.id === activeHotspot);
  if (idx < 0) return null;
  const item = unit.hotspots[idx];

  const prev = () => {
    const p = unit.hotspots[(idx - 1 + unit.hotspots.length) % unit.hotspots.length];
    focusHotspot(p.id);
  };
  const next = () => {
    const n = unit.hotspots[(idx + 1) % unit.hotspots.length];
    focusHotspot(n.id);
  };

  return (
    <div className="pointer-events-none fixed bottom-[96px] left-1/2 z-25 w-[min(440px,calc(100vw-2rem))] -translate-x-1/2">
      <div className="hud-panel pointer-events-auto rounded-xl border-[#ffb703]/60 p-4 shadow-[0_0_28px_rgba(0,0,0,0.65)] animate-slidein">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ffb703] font-display text-base font-bold text-[#060d18]">
              {item.id}
            </span>
            <div className="min-w-0">
              <p className="font-display text-[10px] font-bold tracking-[0.18em] text-[#ffb703] uppercase">
                INSPEKSI KOMPONEN • {unit.name}
              </p>
              <h3 className="font-display text-base font-bold tracking-wide text-white truncate">
                {item.name}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={clearHotspot}
            aria-label="Tutup kartu komponen"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-[#081526] text-slate-300 hover:border-[#00d2ff] hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-2.5 text-xs sm:text-[13px] leading-relaxed text-slate-200">{item.desc}</p>

        <div className="mt-3 flex items-center justify-between border-t border-[#00d2ff]/20 pt-2.5">
          <span className="font-display text-[11px] tracking-widest text-slate-400 uppercase">
            PIN {idx + 1} DARI {unit.hotspots.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prev}
              className="flex h-9 items-center gap-1 rounded-md border border-[#00d2ff]/35 bg-[#08182c] px-2.5 font-display text-xs font-semibold text-[#00d2ff] hover:bg-[#00d2ff]/20 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              Sebelumnya
            </button>
            <button
              type="button"
              onClick={next}
              className="flex h-9 items-center gap-1 rounded-md border border-[#00d2ff]/35 bg-[#08182c] px-2.5 font-display text-xs font-semibold text-[#00d2ff] hover:bg-[#00d2ff]/20 cursor-pointer"
            >
              Berikutnya
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
