import { ShieldCheck } from 'lucide-react';
import { useHangarStore, useSelectedUnit } from '../../store/useHangarStore';

const SALUTE_STEPS = [
  {
    short: 'Tahap 1/4: Pelepasan Pengaman',
    desc: 'Teknisi (Crew Chief) melepas ganjal roda (wheel chocks) & menunjukkan pin pengaman "Remove Before Flight" — pemeriksaan akhir selesai.',
  },
  {
    short: 'Tahap 2/4: Hormat Resmi Teknisi',
    desc: 'Teknisi memberi hormat dari area steril — sinyal resmi bahwa pesawat 100% layak terbang & jalur mesin aman dari peralatan darat.',
  },
  {
    short: 'Tahap 3/4: Balasan Hormat Pilot',
    desc: 'Pilot membalas hormat dari dalam kokpit — simbol kepercayaan penuh kepada teknisi yang menyiapkan pesawatnya untuk terbang.',
  },
  {
    short: 'Tahap 4/4: Isyarat Jalan & Taxi Out',
    desc: 'Crew Chief memberi isyarat marshalling maju — mesin spool-up & pesawat bergerak keluar apron menuju landasan pacu (runway).',
  },
];

export function SaluteStatusPanel() {
  const unit = useSelectedUnit();
  const flightMode = useHangarStore((s) => s.flightMode);
  const saluteStep = useHangarStore((s) => s.saluteStep);

  if (flightMode !== 'salute' || unit.id === 'gsuit' || unit.id === 'pilot-helmet') return null;

  const idx = Math.min(SALUTE_STEPS.length - 1, Math.max(0, saluteStep));
  const current = SALUTE_STEPS[idx] ?? SALUTE_STEPS[0];
  const pct = ((idx + 1) / SALUTE_STEPS.length) * 100;

  return (
    <div
      aria-label="Subtitle Hormat Teknisi"
      className="pointer-events-none fixed bottom-14 sm:bottom-16 left-1/2 z-25 flex w-[min(700px,calc(100vw-1.5rem))] -translate-x-1/2 flex-col items-center text-center animate-slidein"
    >
      {/* Baris 1: Status Tahap & Progress Tipis Tanpa Kotak */}
      <div
        className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-0.5 font-display text-[10px] sm:text-xs font-bold tracking-[0.14em] uppercase"
        style={{ textShadow: '0 2px 8px rgba(0,0,0,1), 0 0 4px rgba(0,0,0,0.95)' }}
      >
        <span className="inline-flex items-center gap-1 text-[#ffb703]">
          <ShieldCheck className="h-3.5 w-3.5 text-[#ffb703] shrink-0" />
          {current.short}
        </span>
        <span className="text-slate-300/80">•</span>
        <span className="text-cyan-300">Crew Chief → {unit.name}</span>
        <span className="inline-block h-1.5 w-14 sm:w-18 overflow-hidden rounded-full bg-black/55 align-middle">
          <span
            className="block h-full rounded-full bg-gradient-to-r from-[#ffb703] to-emerald-400 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </span>
      </div>

      {/* Baris 2: Subtitle Edukasi Jelas Tanpa Kotak */}
      <p
        className="mt-1 text-xs sm:text-sm font-semibold leading-snug text-white"
        style={{ textShadow: '0 2px 10px rgba(0,0,0,1), 0 0 5px rgba(0,0,0,0.98)' }}
      >
        {current.desc}
      </p>
    </div>
  );
}
