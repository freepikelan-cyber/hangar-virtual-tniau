import { Fuel, RotateCcw, X } from 'lucide-react';
import { useHangarStore, useSelectedUnit } from '../../store/useHangarStore';

const AAR_STEPS = [
  { short: '1. Approach', desc: 'Pesawat penerima mendekat stabil dari belakang-bawah tanker KC-130B Hercules.' },
  { short: '2. Contact', desc: 'Refueling probe masuk & terkunci presisi pada Drogue Basket (Probe Locked!).' },
  { short: '3. Transfer', desc: 'Bahan bakar Avtur / JP-8 mengalir deras dari KC-130B ke tangki pesawat tempur.' },
  { short: '4. Break Away', desc: 'Tangki penuh 100%! Pesawat melepas sambungan & manuver memisah dengan aman.' },
];

export function AarStatusPanel() {
  const unit = useSelectedUnit();
  const flightMode = useHangarStore((s) => s.flightMode);
  const aarFuel = useHangarStore((s) => s.aarFuel);
  const aarStep = useHangarStore((s) => s.aarStep);
  const triggerAar = useHangarStore((s) => s.triggerAar);
  const setFlightState = useHangarStore((s) => s.setFlightState);

  if (flightMode !== 'aar' || unit.id === 'gsuit' || unit.id === 'pilot-helmet') return null;

  return (
    <aside
      aria-label="Status Air-to-Air Refueling"
      className="pointer-events-none fixed top-[74px] sm:top-[84px] right-2.5 sm:right-4 z-30 lg:z-20 flex items-start"
    >
      <div className="hud-panel pointer-events-auto w-[min(325px,calc(100vw-1.25rem))] lg:w-[315px] xl:w-[340px] rounded-xl border-emerald-400/55 bg-[#081933]/92 px-3.5 py-3 shadow-xl space-y-2.5 animate-slidein">
        <div className="flex items-start justify-between gap-2 border-b border-emerald-400/20 pb-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-emerald-300 font-display text-[10px] sm:text-[11px] font-bold tracking-[0.14em] uppercase">
              <Fuel className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              AIR-TO-AIR REFUELING (AAR)
            </div>
            <div className="mt-0.5 text-[11px] text-slate-300">
              Tanker: <strong className="text-[#ffb703]">KC-130B Hercules (Skadron 32)</strong>
            </div>
            <div className="text-[11px] text-slate-300">
              Penerima: <strong className="text-white">{unit.name}</strong>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={triggerAar}
              title="Ulangi Simulasi AAR"
              className="inline-flex items-center gap-1 rounded-md border border-[#4da6ff]/50 bg-[#0e2a54] px-2 py-1 font-display text-[10px] font-bold tracking-wider text-[#75bcff] uppercase hover:bg-[#4da6ff]/20 cursor-pointer active:scale-95"
            >
              <RotateCcw className="h-3 w-3" />
              Ulangi
            </button>
            <button
              type="button"
              onClick={() => setFlightState('parked', null)}
              title="Selesai AAR"
              className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-700 bg-[#0e2a54] text-slate-300 hover:text-white cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Indikator Bahan Bakar Avtur Real-Time */}
        <div className="space-y-1">
          <div className="flex items-center justify-between font-display text-[11px] font-bold tracking-wider uppercase">
            <span className="text-slate-300">Bahan Bakar (Avtur / JP-8)</span>
            <span className={aarFuel >= 100 ? 'text-emerald-300' : 'text-[#ffb703]'}>{aarFuel}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800 border border-emerald-400/30">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#ffb703] via-emerald-400 to-cyan-300 transition-all duration-200"
              style={{ width: `${aarFuel}%` }}
            />
          </div>
        </div>

        {/* 4 Tahap Operasi AAR */}
        <div className="space-y-1.5">
          {AAR_STEPS.map((st, idx) => {
            const active = idx === aarStep;
            const done = idx < aarStep;
            return (
              <div
                key={st.short}
                className={`rounded-lg border px-2.5 py-1.5 transition-all ${
                  active
                    ? 'border-emerald-400 bg-emerald-500/15'
                    : done
                      ? 'border-emerald-400/30 bg-emerald-500/10 opacity-80'
                      : 'border-slate-700/60 bg-slate-900/40 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-display text-[10px] font-bold tracking-wider uppercase ${
                      active ? 'text-emerald-300' : done ? 'text-emerald-400' : 'text-slate-400'
                    }`}
                  >
                    {st.short}
                  </span>
                  {active && (
                    <span className="rounded bg-emerald-400/20 px-1.5 py-0.5 font-display text-[9px] font-bold text-emerald-300 uppercase">
                      AKTIF
                    </span>
                  )}
                </div>
                {active && <p className="mt-0.5 text-[11px] text-slate-200 leading-snug">{st.desc}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
