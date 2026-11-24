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
    <div className="pointer-events-none fixed bottom-[132px] sm:bottom-[142px] left-1/2 z-40 w-[min(430px,calc(100vw-1.5rem))] -translate-x-1/2">
      <div className="pointer-events-auto rounded-xl border border-[#ffb703]/70 bg-[#0a1e3c]/95 backdrop-blur-md p-3.5 sm:p-4 shadow-[0_12px_36px_rgba(2,10,28,0.85)] animate-slidein">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ffb703] font-display text-base font-bold text-[#0a1e3c]">
              {item.id}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="font-display text-[10px] font-bold tracking-[0.16em] text-[#ffb703] uppercase">
                  {unit.name}
                </p>
                {item.partType && (
                  <span
                    className={`rounded px-1.5 py-0.5 font-display text-[9px] font-bold tracking-wider uppercase ${
                      item.partType === 'Sistem Internal'
                        ? 'border border-cyan-300/60 bg-cyan-400/15 text-cyan-200'
                        : item.partType === 'Senjata'
                          ? 'border border-rose-400/60 bg-rose-500/15 text-rose-200'
                          : 'border border-[#4da6ff]/50 bg-[#4da6ff]/15 text-[#75bcff]'
                    }`}
                  >
                    {item.partType}
                  </span>
                )}
              </div>
              <h3 className="font-display text-base font-bold tracking-wide text-white truncate">
                {item.name}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={clearHotspot}
            aria-label="Tutup kartu komponen"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-[#0e2a54] text-slate-300 hover:border-[#4da6ff] hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-2.5 text-xs sm:text-[13px] leading-relaxed text-slate-200">{item.desc}</p>

        <div className="mt-3 flex items-center justify-between border-t border-[#4da6ff]/20 pt-2.5">
          <span className="font-display text-[11px] tracking-widest text-slate-400 uppercase">
            PIN {idx + 1} DARI {unit.hotspots.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prev}
              className="flex h-9 items-center gap-1 rounded-md border border-[#4da6ff]/35 bg-[#0f2d5c] px-2.5 font-display text-xs font-semibold text-[#4da6ff] hover:bg-[#4da6ff]/20 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              Sebelumnya
            </button>
            <button
              type="button"
              onClick={next}
              className="flex h-9 items-center gap-1 rounded-md border border-[#4da6ff]/35 bg-[#0f2d5c] px-2.5 font-display text-xs font-semibold text-[#4da6ff] hover:bg-[#4da6ff]/20 cursor-pointer"
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
