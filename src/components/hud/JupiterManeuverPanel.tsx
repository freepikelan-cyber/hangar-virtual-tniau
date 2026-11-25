import { Flame, Sparkles, Users } from 'lucide-react';
import { JUPITER_MANEUVERS, type JupiterManeuverId } from '../../data/jupiterManeuvers';
import { useHangarStore } from '../../store/useHangarStore';

export function JupiterManeuverPanel() {
  const selectedId = useHangarStore((s) => s.selectedId);
  const flightMode = useHangarStore((s) => s.flightMode);
  const jupiterManeuver = useHangarStore((s) => s.jupiterManeuver);
  const setJupiterManeuver = useHangarStore((s) => s.setJupiterManeuver);

  if (selectedId !== 'kt1b' || flightMode !== 'maneuver') return null;

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

  return (
    <aside
      aria-label="Manuver Jupiter Aerobatic Team"
      className="pointer-events-none fixed top-[74px] sm:top-[84px] bottom-[102px] sm:bottom-[112px] right-2.5 sm:right-4 z-30 lg:z-20 flex items-start"
    >
      <div className="hud-panel pointer-events-auto flex h-full w-[min(330px,calc(100vw-1.25rem))] lg:w-[320px] xl:w-[345px] flex-col rounded-xl border-rose-400/55 bg-[#081933]/92 overflow-hidden animate-slidein">
        {/* Header JAT */}
        <div className="border-b border-rose-400/25 bg-gradient-to-r from-rose-950/60 to-[#0b2349]/90 px-3.5 py-2.5">
          <div className="flex items-center gap-1.5 text-[#ffb703] font-display text-[11px] font-bold tracking-[0.14em] uppercase">
            <Flame className="h-4 w-4 text-rose-400 shrink-0" />
            JUPITER AEROBATIC TEAM (6-SHIP)
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

        {/* Deskripsi Manuver Aktif */}
        <div className="border-b border-white/10 bg-[#0b2347]/75 px-3.5 py-2">
          {activeSpec ? (
            <>
              <div className="font-display text-xs font-bold text-[#ffb703] uppercase">{activeSpec.name}</div>
              <div className="text-[10px] font-semibold text-cyan-300">{activeSpec.element}</div>
              <p className="text-[11px] text-slate-200 leading-snug mt-0.5">{activeSpec.desc}</p>
            </>
          ) : (
            <>
              <div className="font-display text-xs font-bold text-[#ffb703] uppercase">
                AUTO AIRSHOW • 12 MANUVER IKONIK
              </div>
              <p className="text-[11px] text-slate-200 leading-snug mt-0.5">
                Menampilkan rangkaian atraksi 6 pesawat Jupiter secara otomatis, atau klik manuver di bawah!
              </p>
            </>
          )}
        </div>

        {/* Daftar 21 Manuver */}
        <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-3">
          <div>
            {renderBtn('auto', '✦ Auto Airshow (Siklus Otomatis)')}
          </div>

          <div className="space-y-1.5">
            <div className="font-display text-[10px] font-bold tracking-[0.14em] text-[#ffb703] uppercase">
              Manuver &amp; Formasi Andalan (9)
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {andalan.map((m) => renderBtn(m.id, m.name))}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="font-display text-[10px] font-bold tracking-[0.14em] text-rose-300 uppercase">
              Manuver Variasi &amp; Spesial (12)
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {spesial.map((m) => renderBtn(m.id, m.name))}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
