import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, Sparkles, X } from 'lucide-react';
import { FLEET } from '../../data/fleetData';
import { useHangarStore, useSelectedUnit } from '../../store/useHangarStore';
import { getProceduralAircraft } from '../../utils/proceduralBuilder';

export const ALL_SHOWCASE_UNITS = FLEET.filter((u) => u.category !== 'G-Suit & Pilot');
const SLIDE_DURATION_MS = 10000;

/**
 * Mode Pameran (Slideshow) mulus untuk SELURUH pesawat TNI AU:
 * - Pre-warm model pesawat berikutnya di background agar perpindahan slide 0ms tanpa patah-patah!
 * - Menampilkan kartu informasi detail pesawat (peran, skadron, negara asal, & 4 spesifikasi kunci) selama pameran berlangsung.
 */
export function ShowcaseOverlay() {
  const showcaseMode = useHangarStore((s) => s.showcaseMode);
  const selectedId = useHangarStore((s) => s.selectedId);
  const toggleShowcase = useHangarStore((s) => s.toggleShowcase);
  const unit = useSelectedUnit();

  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  const curIndex = Math.max(
    0,
    ALL_SHOWCASE_UNITS.findIndex((u) => u.id === selectedId),
  );
  const total = ALL_SHOWCASE_UNITS.length;

  const goTo = (nextIdx: number) => {
    const wrapped = ((nextIdx % total) + total) % total;
    const targetUnit = ALL_SHOWCASE_UNITS[wrapped];
    useHangarStore.getState().selectAircraft(targetUnit.id);
    useHangarStore.setState({ autoRotate: true, leftOpen: false, rightOpen: false, showcaseMode: true });
    setProgress(0);
  };

  // Pre-warm pesawat berikutnya 1.5 detik setelah slide aktif agar transisi slide 0ms tanpa lag/freeze!
  useEffect(() => {
    if (!showcaseMode) return;
    const nextUnit = ALL_SHOWCASE_UNITS[(curIndex + 1) % total];
    const t = window.setTimeout(() => {
      try {
        getProceduralAircraft(nextUnit.id, nextUnit.liveries?.[0]?.id);
      } catch {
        // ignore
      }
    }, 1500);
    return () => window.clearTimeout(t);
  }, [showcaseMode, curIndex, total]);

  // Timer slideshow halus + progress bar
  useEffect(() => {
    if (!showcaseMode || paused) return;
    setProgress(0);
    const start = performance.now();
    const tick = window.setInterval(() => {
      const elapsed = performance.now() - start;
      const pct = Math.min(100, (elapsed / SLIDE_DURATION_MS) * 100);
      setProgress(pct);
      if (elapsed >= SLIDE_DURATION_MS) {
        goTo(curIndex + 1);
      }
    }, 100);
    return () => window.clearInterval(tick);
  }, [showcaseMode, paused, curIndex]);

  if (!showcaseMode) return null;

  const keySpecs = [
    { label: 'Kecepatan', value: unit.specs.maxSpeed },
    { label: 'Jarak Jelajah', value: unit.specs.range },
    { label: 'Plafon Terbang', value: unit.specs.ceiling },
    { label: 'Persenjataan / Muatan', value: unit.specs.armament },
  ];

  return (
    <aside
      aria-label="Informasi Detail Mode Pameran"
      className="pointer-events-none fixed bottom-[86px] sm:bottom-[94px] left-2.5 sm:left-4 z-30 w-[min(370px,calc(100vw-1.25rem))] animate-slidein"
    >
      <div className="hud-panel pointer-events-auto overflow-hidden rounded-2xl border-[#ffb703]/55 bg-[#071730]/92 shadow-[0_14px_38px_rgba(2,10,28,0.85)] backdrop-blur-md">
        {/* Progress bar halus */}
        <div className="h-1 w-full bg-slate-800/90">
          <div
            className="h-full bg-gradient-to-r from-[#4da6ff] via-[#ffb703] to-[#ffd166] transition-[width] duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-3 sm:p-3.5 space-y-2">
          {/* Header Mode Pameran + Kontrol Slideshow */}
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#ffb703]/40 bg-[#ffb703]/15 px-2.5 py-0.5 font-display text-[10px] font-bold tracking-[0.14em] text-[#ffb703] uppercase">
              <Sparkles className="h-3 w-3" />
              Mode Pameran • {curIndex + 1}/{total}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => goTo(curIndex - 1)}
                title="Pesawat Sebelumnya"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700 bg-[#0e2a54] text-slate-200 hover:border-[#4da6ff] hover:text-white cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                title={paused ? 'Lanjutkan Slideshow' : 'Jeda Slideshow'}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700 bg-[#0e2a54] text-slate-200 hover:border-[#ffb703] hover:text-[#ffb703] cursor-pointer"
              >
                {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => goTo(curIndex + 1)}
                title="Pesawat Berikutnya"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700 bg-[#0e2a54] text-slate-200 hover:border-[#4da6ff] hover:text-white cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={toggleShowcase}
                title="Keluar Mode Pameran"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-rose-400/40 bg-rose-500/20 text-rose-200 hover:bg-rose-500/35 hover:text-white cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Identitas Pesawat */}
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-display text-base sm:text-lg font-bold tracking-wide text-white leading-tight">
                {unit.name}
              </h2>
              <span className="shrink-0 rounded border border-[#4da6ff]/40 bg-[#4da6ff]/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#75bcff]">
                {unit.category}
              </span>
            </div>
            <div className="mt-0.5 text-[11px] font-medium text-[#ffb703]">
              {unit.code} • {unit.role}
            </div>
            <div className="mt-0.5 text-[10px] text-slate-300">
              {unit.squadron} • {unit.origin}
            </div>
          </div>

          {/* Deskripsi Ringkas */}
          <p className="text-[11px] leading-relaxed text-slate-200 line-clamp-2">{unit.history.operational}</p>

          {/* 4 Spesifikasi Utama */}
          <div className="grid grid-cols-2 gap-1.5 pt-0.5">
            {keySpecs.map((sp) => (
              <div key={sp.label} className="rounded-lg border border-white/10 bg-[#0c2447]/80 px-2 py-1">
                <div className="text-[9px] font-display font-bold tracking-wider text-slate-400 uppercase">
                  {sp.label}
                </div>
                <div className="truncate text-[11px] font-semibold text-slate-100">{sp.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
