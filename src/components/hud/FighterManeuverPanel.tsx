import { Crosshair, Flame, Zap } from 'lucide-react';
import { FIGHTER_MANEUVERS, type FighterManeuverId } from '../../data/fighterManeuvers';
import { useHangarStore, useSelectedUnit } from '../../store/useHangarStore';

export function FighterManeuverPanel() {
  const unit = useSelectedUnit();
  const flightMode = useHangarStore((s) => s.flightMode);
  const fighterManeuver = useHangarStore((s) => s.fighterManeuver);
  const setFighterManeuver = useHangarStore((s) => s.setFighterManeuver);

  if (unit.category !== 'Tempur' || flightMode !== 'maneuver') return null;

  const dasar = FIGHTER_MANEUVERS.filter((m) => m.group === 'dasar');
  const acm = FIGHTER_MANEUVERS.filter((m) => m.group === 'acm');
  const superM = FIGHTER_MANEUVERS.filter((m) => m.group === 'super');
  const activeSpec =
    fighterManeuver === 'auto' ? null : FIGHTER_MANEUVERS.find((m) => m.id === fighterManeuver) ?? null;

  const renderBtn = (id: FighterManeuverId, label: string) => {
    const active = fighterManeuver === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => setFighterManeuver(id)}
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
      aria-label="Manuver Pesawat Tempur"
      className="pointer-events-none fixed top-[74px] sm:top-[84px] bottom-[102px] sm:bottom-[112px] right-2.5 sm:right-4 z-30 lg:z-20 flex items-start"
    >
      <div className="hud-panel pointer-events-auto flex h-full w-[min(330px,calc(100vw-1.25rem))] lg:w-[320px] xl:w-[345px] flex-col rounded-xl border-[#4da6ff]/55 bg-[#081933]/92 overflow-hidden animate-slidein">
        <div className="border-b border-[#4da6ff]/25 bg-gradient-to-r from-[#0e2d5c]/80 to-[#0b2349]/90 px-3.5 py-2.5">
          <div className="flex items-center gap-1.5 text-[#ffb703] font-display text-[11px] font-bold tracking-[0.14em] uppercase">
            <Flame className="h-4 w-4 text-[#4da6ff] shrink-0" />
            MANUVER TEMPUR • {unit.name}
          </div>
          <p className="mt-0.5 text-[10px] text-slate-300">
            Manuver Dasar, Dogfight Pertempuran Udara &amp; Supermaneuverability
          </p>
        </div>

        <div className="border-b border-white/10 bg-[#0b2347]/75 px-3.5 py-2">
          {activeSpec ? (
            <>
              <div className="font-display text-xs font-bold text-[#ffb703] uppercase">{activeSpec.name}</div>
              <p className="text-[11px] text-slate-200 leading-snug mt-0.5">{activeSpec.desc}</p>
            </>
          ) : (
            <>
              <div className="font-display text-xs font-bold text-[#ffb703] uppercase">
                AUTO COMBAT DEMO (SIKLUS OTOMATIS)
              </div>
              <p className="text-[11px] text-slate-200 leading-snug mt-0.5">
                Menjalankan rangkaian manuver tempur otomatis, atau pilih langsung manuver di bawah!
              </p>
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-3">
          <div>{renderBtn('auto', '✦ Auto Combat Demo (Otomatis)')}</div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-1 font-display text-[10px] font-bold tracking-[0.14em] text-cyan-300 uppercase">
              <Flame className="h-3 w-3" /> 1. Manuver Dasar (7)
            </div>
            <div className="grid grid-cols-2 gap-1.5">{dasar.map((m) => renderBtn(m.id, m.name))}</div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-1 font-display text-[10px] font-bold tracking-[0.14em] text-[#ffb703] uppercase">
              <Crosshair className="h-3 w-3" /> 2. Dogfight (Pertempuran Udara)
            </div>
            <div className="grid grid-cols-1 gap-1.5">{acm.map((m) => renderBtn(m.id, m.name))}</div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-1 font-display text-[10px] font-bold tracking-[0.14em] text-rose-300 uppercase">
              <Zap className="h-3 w-3" /> 3. Supermaneuverability (5)
            </div>
            <div className="grid grid-cols-2 gap-1.5">{superM.map((m) => renderBtn(m.id, m.name))}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
