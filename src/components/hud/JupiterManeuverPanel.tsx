import { useEffect, useState } from 'react';
import { Flame, Radio, Sparkles, Users } from 'lucide-react';
import { JUPITER_MANEUVERS, type JupiterManeuverId } from '../../data/jupiterManeuvers';
import {
  JUPITER_PARTS,
  jupiterShowLive,
  requestJupiterPartSeek,
  type JupiterDialogueLine,
} from '../../data/jupiterShowScript';
import { useHangarStore } from '../../store/useHangarStore';

export function JupiterManeuverPanel() {
  const selectedId = useHangarStore((s) => s.selectedId);
  const flightMode = useHangarStore((s) => s.flightMode);
  const jupiterManeuver = useHangarStore((s) => s.jupiterManeuver);
  const setJupiterManeuver = useHangarStore((s) => s.setJupiterManeuver);

  const [livePart, setLivePart] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [liveLine, setLiveLine] = useState<JupiterDialogueLine | null>(jupiterShowLive.activeLine);

  const isShowActive = selectedId === 'kt1b' && flightMode === 'maneuver';

  useEffect(() => {
    if (!isShowActive) return;
    const id = window.setInterval(() => {
      setLivePart(jupiterShowLive.part);
      setLiveLine(jupiterShowLive.activeLine);
    }, 180);
    return () => window.clearInterval(id);
  }, [isShowActive]);

  if (!isShowActive) return null;

  const andalan = JUPITER_MANEUVERS.filter((m) => m.group === 'andalan');
  const spesial = JUPITER_MANEUVERS.filter((m) => m.group === 'spesial');
  const activeSpec =
    jupiterManeuver === 'auto' ? null : JUPITER_MANEUVERS.find((m) => m.id === jupiterManeuver) ?? null;

  const renderBtn = (id: JupiterManeuverId, label: string) => {
    const active = jupiterManeuver === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => setJupiterManeuver(id)}
        className={`rounded-lg border px-2 py-1.5 text-left font-display text-[10px] font-bold tracking-wide uppercase transition-all cursor-pointer active:scale-95 ${
          active
            ? 'border-[#ffb703] bg-[#ffb703]/20 text-[#ffb703] shadow-amber'
            : 'border-slate-700/75 bg-[#0e2a54]/80 text-slate-200 hover:border-[#4da6ff]/60'
        }`}
      >
        {label}
      </button>
    );
  };

  const roleBadgeColor =
    liveLine?.role === 'atc'
      ? 'border-cyan-400/70 bg-cyan-500/20 text-cyan-200'
      : liveLine?.role === 'wingman'
        ? 'border-rose-400/70 bg-rose-500/20 text-rose-200'
        : liveLine?.role === 'ground'
          ? 'border-emerald-400/70 bg-emerald-500/20 text-emerald-200'
          : 'border-[#ffb703]/70 bg-[#ffb703]/20 text-[#ffb703]';

  return (
    <>
      {/* === CAPTION RADIO KOKPIT LIVE DI BAGIAN BAWAH LAYAR (Khusus Skenario 5-Part Berurutan) === */}
      {jupiterManeuver === 'auto' && liveLine && (
        <div className="pointer-events-none fixed bottom-[106px] sm:bottom-[118px] left-0 right-0 z-25 flex justify-center px-3">
          <div className="hud-panel pointer-events-auto w-full max-w-2xl rounded-xl border-[#ffb703]/55 bg-[#071830]/92 px-3.5 py-2.5 shadow-[0_14px_34px_rgba(2,10,28,0.85)] animate-slidein">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Radio className="h-3.5 w-3.5 text-[#ffb703] animate-pulse shrink-0" />
                <span className={`rounded border px-1.5 py-0.5 font-display text-[10px] font-bold tracking-wider uppercase ${roleBadgeColor}`}>
                  {liveLine.speaker}
                </span>
              </div>
              <span className="font-display text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                PART {livePart} / 5 • ADISUTJIPTO AEROBATIC SHOW
              </span>
            </div>
            <p className="mt-1.5 text-xs sm:text-sm font-medium leading-snug text-white">
              &ldquo;{liveLine.text}&rdquo;
            </p>
          </div>
        </div>
      )}

      {/* === PANEL KANAN: URUTAN SKENARIO 5-PART & PILIHAN MANUVER === */}
      <aside
        aria-label="Manuver Jupiter Aerobatic Team"
        className="pointer-events-none fixed top-[74px] sm:top-[84px] bottom-[102px] sm:bottom-[112px] right-2.5 sm:right-4 z-30 lg:z-20 hidden md:flex items-start"
      >
        <div className="hud-panel pointer-events-auto flex h-full w-[min(325px,calc(100vw-1.25rem))] lg:w-[315px] xl:w-[340px] flex-col rounded-xl border-rose-400/55 bg-[#081933]/92 overflow-hidden animate-slidein">
          {/* Header JAT */}
          <div className="border-b border-rose-400/25 bg-gradient-to-r from-rose-950/60 to-[#0b2349]/90 px-3.5 py-2.5">
            <div className="flex items-center gap-1.5 text-[#ffb703] font-display text-[11px] font-bold tracking-[0.14em] uppercase">
              <Flame className="h-4 w-4 text-rose-400 shrink-0" />
              JUPITER AEROBATIC SHOW (6-SHIP)
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5 text-[10px]">
              <span className="inline-flex items-center gap-1 rounded border border-[#ffb703]/45 bg-[#ffb703]/10 px-1.5 py-0.5 font-display font-bold text-[#ffb703]">
                <Users className="h-3 w-3" /> Main Body: J1–J4
              </span>
              <span className="inline-flex items-center gap-1 rounded border border-rose-400/45 bg-rose-500/15 px-1.5 py-0.5 font-display font-bold text-rose-200">
                <Sparkles className="h-3 w-3" /> Synchro: J5–J6
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-3">
            {/* Urutan Skenario 5-Part Berurutan */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-display text-[10px] font-bold tracking-[0.14em] text-[#ffb703] uppercase">
                  Skenario Berurutan (Part 1–5)
                </span>
                {jupiterManeuver !== 'auto' && (
                  <button
                    type="button"
                    onClick={() => setJupiterManeuver('auto')}
                    className="text-[10px] font-display font-bold text-cyan-300 underline cursor-pointer"
                  >
                    Putar Urutan
                  </button>
                )}
              </div>

              <div className="space-y-1">
                {JUPITER_PARTS.map((p) => {
                  const isCurrent = jupiterManeuver === 'auto' && livePart === p.part;
                  return (
                    <button
                      key={p.part}
                      type="button"
                      onClick={() => {
                        setJupiterManeuver('auto');
                        requestJupiterPartSeek(p.part);
                      }}
                      className={`w-full rounded-lg border px-2.5 py-1.5 text-left font-display text-[11px] font-bold tracking-wide transition-all cursor-pointer active:scale-95 ${
                        isCurrent
                          ? 'border-[#ffb703] bg-[#ffb703]/20 text-[#ffb703] shadow-amber'
                          : 'border-slate-700/75 bg-[#0e2a54]/75 text-slate-200 hover:border-[#4da6ff]/60'
                      }`}
                    >
                      {p.title}
                    </button>
                  );
                })}
              </div>
            </div>

            {activeSpec && (
              <div className="rounded-lg border border-cyan-400/35 bg-[#0b2347]/80 p-2.5">
                <div className="font-display text-xs font-bold text-[#ffb703] uppercase">{activeSpec.name}</div>
                <p className="mt-0.5 text-[11px] text-slate-200 leading-snug">{activeSpec.desc}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="font-display text-[10px] font-bold tracking-[0.14em] text-slate-300 uppercase">
                Manuver Andalan (9)
              </div>
              <div className="grid grid-cols-2 gap-1.5">{andalan.map((m) => renderBtn(m.id, m.name))}</div>
            </div>

            <div className="space-y-1.5">
              <div className="font-display text-[10px] font-bold tracking-[0.14em] text-rose-300 uppercase">
                Manuver Spesial (12)
              </div>
              <div className="grid grid-cols-2 gap-1.5">{spesial.map((m) => renderBtn(m.id, m.name))}</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
