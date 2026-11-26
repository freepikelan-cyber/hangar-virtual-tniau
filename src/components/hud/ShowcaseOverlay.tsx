import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, Sparkles, X } from 'lucide-react';
import { FLEET } from '../../data/fleetData';
import { useHangarStore, useSelectedUnit } from '../../store/useHangarStore';
import { getProceduralAircraft } from '../../utils/proceduralBuilder';

// Menampilkan SELURUH armada & perlengkapan di hanggar (100% terdisplay tanpa terkecuali!)
export const ALL_SHOWCASE_UNITS = FLEET;
const SLIDE_DURATION_MS = 18000; // 18 detik per unit agar pengunjung leluasa menikmati 360° & membaca info

/**
 * Mode Pameran (Slideshow) bergaya Subtitle Cinema di bagian bawah layar:
 * - Seluruh menu bawah (BottomDock) disembunyikan agar tampilan 3D bersih & lega.
 * - Menampilkan informasi detail & spesifikasi lengkap secara informatif di bagian bawah seperti subtitle.
 * - Pre-warm model unit berikutnya di background agar perpindahan slide 0ms mulus tanpa patah-patah!
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

  // Pre-warm unit berikutnya 2 detik setelah slide aktif agar transisi slide 0ms tanpa lag/freeze!
  useEffect(() => {
    if (!showcaseMode) return;
    const nextUnit = ALL_SHOWCASE_UNITS[(curIndex + 1) % total];
    const t = window.setTimeout(() => {
      try {
        getProceduralAircraft(nextUnit.id, nextUnit.liveries?.[0]?.id);
      } catch {
        // ignore
      }
    }, 2000);
    return () => window.clearTimeout(t);
  }, [showcaseMode, curIndex, total]);

  // Timer slideshow 18 detik per pesawat + progress bar mulus
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
    { label: 'Jarak', value: unit.specs.range },
    { label: 'Plafon', value: unit.specs.ceiling },
    { label: 'Persenjataan / Fitur', value: unit.specs.armament },
  ];

  return (
    <section
      aria-label="Subtitle Informasi Mode Pameran"
      className="pointer-events-none fixed bottom-3 sm:bottom-5 left-1/2 z-30 w-[min(920px,calc(100vw-1.25rem))] -translate-x-1/2 animate-slidein"
    >
      <div className="pointer-events-auto overflow-hidden rounded-2xl border border-white/15 bg-slate-950/84 shadow-[0_14px_40px_rgba(2,10,28,0.88)] backdrop-blur-md">
        {/* Progress bar tipis di bagian atas subtitle */}
        <div className="h-1 w-full bg-slate-800/90">
          <div
            className="h-full bg-gradient-to-r from-[#4da6ff] via-[#ffb703] to-[#ffd166] transition-[width] duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="px-3.5 sm:px-5 py-2.5 sm:py-3 space-y-2">
          {/* Baris 1: Identitas Pesawat + Kontrol Slideshow */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <span className="inline-flex items-center gap-1 rounded-full border border-[#ffb703]/45 bg-[#ffb703]/15 px-2.5 py-0.5 font-display text-[10px] font-bold tracking-[0.14em] text-[#ffb703] uppercase shrink-0">
                <Sparkles className="h-3 w-3" />
                Pameran {curIndex + 1}/{total}
              </span>
              <h2 className="font-display text-sm sm:text-lg font-bold tracking-wide text-white leading-tight">
                {unit.name}
              </h2>
              <span className="rounded border border-[#4da6ff]/40 bg-[#4da6ff]/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#75bcff] shrink-0">
                {unit.code} • {unit.category}
              </span>
              <span className="hidden md:inline text-[11px] text-slate-300 truncate">
                {unit.squadron} • {unit.origin}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => goTo(curIndex - 1)}
                title="Sebelumnya"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 bg-slate-900/80 text-slate-200 hover:border-[#4da6ff] hover:text-white cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                title={paused ? 'Lanjutkan Slideshow' : 'Jeda Slideshow'}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 bg-slate-900/80 text-slate-200 hover:border-[#ffb703] hover:text-[#ffb703] cursor-pointer"
              >
                {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => goTo(curIndex + 1)}
                title="Berikutnya"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 bg-slate-900/80 text-slate-200 hover:border-[#4da6ff] hover:text-white cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={toggleShowcase}
                title="Keluar Mode Pameran"
                className="inline-flex h-7 items-center gap-1 rounded-lg border border-rose-400/45 bg-rose-500/20 px-2 font-display text-[10px] font-bold tracking-wider text-rose-100 uppercase hover:bg-rose-500/35 hover:text-white cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          </div>

          {/* Baris 2: Subtitle Deskripsi Informatif */}
          <p className="text-[11px] sm:text-xs leading-relaxed text-slate-100">
            <span className="font-semibold text-[#ffb703]">{unit.role}</span> — {unit.history.operational}
          </p>

          {/* Baris 3: Strip Spesifikasi Utama 1 Baris */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {keySpecs.map((sp) => (
              <div
                key={sp.label}
                className="rounded-lg border border-white/10 bg-slate-900/75 px-2.5 py-1"
              >
                <div className="text-[9px] font-display font-bold tracking-wider text-[#75bcff] uppercase">
                  {sp.label}
                </div>
                <div className="truncate text-[11px] font-semibold text-white" title={sp.value}>
                  {sp.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
