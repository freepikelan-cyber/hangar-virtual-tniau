import { Fuel } from 'lucide-react';
import { useHangarStore, useSelectedUnit } from '../../store/useHangarStore';

const AAR_STEPS = [
  { short: 'Tahap 1: Approach', desc: 'Pesawat penerima mendekat stabil dari belakang-bawah tanker KC-130B Hercules.' },
  { short: 'Tahap 2: Contact', desc: 'Refueling probe masuk & terkunci presisi pada Drogue Basket (Probe Locked!).' },
  { short: 'Tahap 3: Transfer Avtur', desc: 'Bahan bakar Avtur / JP-8 mengalir deras dari KC-130B ke tangki pesawat.' },
  { short: 'Tahap 4: Break Away', desc: 'Tangki penuh 100%! Pesawat melepas sambungan & memisah dengan aman.' },
];

export function AarStatusPanel() {
  const unit = useSelectedUnit();
  const flightMode = useHangarStore((s) => s.flightMode);
  const aarFuel = useHangarStore((s) => s.aarFuel);
  const aarStep = useHangarStore((s) => s.aarStep);

  if (flightMode !== 'aar' || unit.id === 'gsuit' || unit.id === 'pilot-helmet') return null;

  const current = AAR_STEPS[Math.min(AAR_STEPS.length - 1, Math.max(0, aarStep))] ?? AAR_STEPS[0];

  return (
    <div
      aria-label="Subtitle Air-to-Air Refueling"
      className="pointer-events-none fixed bottom-14 sm:bottom-16 left-1/2 z-25 flex w-[min(680px,calc(100vw-1.5rem))] -translate-x-1/2 flex-col items-center text-center animate-slidein"
    >
      {/* Baris 1: Status Tahap AAR & Indikator Avtur Ringkas Tanpa Kotak */}
      <div
        className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-0.5 font-display text-[10px] sm:text-xs font-bold tracking-[0.14em] uppercase"
        style={{ textShadow: '0 2px 8px rgba(0,0,0,1), 0 0 4px rgba(0,0,0,0.95)' }}
      >
        <span className="inline-flex items-center gap-1 text-emerald-300">
          <Fuel className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          {current.short}
        </span>
        <span className="text-slate-300/80">•</span>
        <span className="text-[#ffb703]">KC-130B → {unit.name}</span>
        <span className="text-slate-300/80">•</span>
        <span className={aarFuel >= 100 ? 'text-emerald-300' : 'text-cyan-300'}>AVTUR {aarFuel}%</span>
        <span className="inline-block h-1.5 w-16 sm:w-20 overflow-hidden rounded-full bg-black/55 align-middle">
          <span
            className="block h-full rounded-full bg-gradient-to-r from-[#ffb703] via-emerald-400 to-cyan-300 transition-all duration-200"
            style={{ width: `${aarFuel}%` }}
          />
        </span>
      </div>

      {/* Baris 2: Subtitle Penjelasan Jelas Tanpa Kotak */}
      <p
        className="mt-1 text-xs sm:text-sm font-semibold leading-snug text-white"
        style={{ textShadow: '0 2px 10px rgba(0,0,0,1), 0 0 5px rgba(0,0,0,0.98)' }}
      >
        {current.desc}
      </p>
    </div>
  );
}
