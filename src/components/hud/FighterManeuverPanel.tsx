import { FIGHTER_MANEUVERS, type FighterManeuverId } from '../../data/fighterManeuvers';
import { useHangarStore, useSelectedUnit } from '../../store/useHangarStore';

/**
 * Subtitle ringkas di bagian bawah layar (tanpa panel besar di sebelah kanan!) untuk mode Manuver Pesawat Tempur,
 * lengkap dengan tombol pil cepat pilihan manuver.
 */
export function FighterManeuverPanel() {
  const unit = useSelectedUnit();
  const flightMode = useHangarStore((s) => s.flightMode);
  const flightLabel = useHangarStore((s) => s.flightLabel);
  const fighterManeuver = useHangarStore((s) => s.fighterManeuver);
  const setFighterManeuver = useHangarStore((s) => s.setFighterManeuver);

  if (unit.category !== 'Tempur' || flightMode !== 'maneuver') return null;

  const activeSpec =
    fighterManeuver === 'auto'
      ? FIGHTER_MANEUVERS.find((m) => flightLabel?.toUpperCase().includes(m.name.toUpperCase())) ?? null
      : FIGHTER_MANEUVERS.find((m) => m.id === fighterManeuver) ?? null;

  const subtitleText = activeSpec
    ? `${activeSpec.name} — ${activeSpec.desc}`
    : flightLabel || 'Auto Manuver — Pesawat melakukan stabilisasi menuju manuver berikutnya';

  const renderPill = (id: FighterManeuverId, label: string) => {
    const active = fighterManeuver === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => setFighterManeuver(id)}
        className={`rounded-full border px-2.5 py-0.5 font-display text-[10px] font-bold tracking-wide uppercase transition-all cursor-pointer active:scale-95 whitespace-nowrap ${
          active
            ? 'border-[#ffb703] bg-[#ffb703]/25 text-[#ffb703]'
            : 'border-white/15 bg-slate-950/70 text-slate-200 hover:border-[#4da6ff]/60'
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div
      aria-label="Subtitle Manuver Pesawat Tempur"
      className="pointer-events-none fixed bottom-[132px] sm:bottom-[142px] left-1/2 z-30 flex w-[min(780px,calc(100vw-1.25rem))] -translate-x-1/2 flex-col items-center gap-1.5"
    >
      {/* Subtitle gaya film ringkas & jernih */}
      <div className="rounded-lg bg-slate-950/82 px-3.5 py-1.5 text-center text-[11px] sm:text-xs font-medium text-slate-100 shadow-lg backdrop-blur-sm border border-white/10">
        {subtitleText}
      </div>

      {/* Pilihan cepat manuver 1 baris ringkas */}
      <div className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-full bg-slate-950/75 px-2 py-1 border border-white/10 backdrop-blur-sm">
        {renderPill('auto', 'Auto')}
        {FIGHTER_MANEUVERS.map((m) => renderPill(m.id, m.name.replace(/^Manuver\s+/i, '')))}
      </div>
    </div>
  );
}
