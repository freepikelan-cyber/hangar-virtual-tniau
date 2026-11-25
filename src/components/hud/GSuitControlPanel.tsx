import { Activity, Gauge } from 'lucide-react';
import { useHangarStore } from '../../store/useHangarStore';

const G_LEVELS: {
  g: 1 | 4 | 9;
  badge: string;
  pressure: string;
  bladder: string;
  blood: string;
}[] = [
  {
    g: 1,
    badge: '±1G Normal',
    pressure: '0 Bar (Standby)',
    bladder: 'Kantung kempis normal, bebas bergerak',
    blood: 'Sirkulasi darah ke otak normal',
  },
  {
    g: 4,
    badge: '±4G Manuver',
    pressure: '3,2 Bar (Aktif)',
    bladder: 'Kantung perut, paha & betis mulai mengembang menekan',
    blood: 'Mendorong darah naik kembali ke jantung & otak',
  },
  {
    g: 9,
    badge: '±9G Tempur Maks',
    pressure: '6,8 Bar (Penuh)',
    bladder: 'Inflasi penuh! Tekanan maksimum cegah penumpukan darah',
    blood: 'Aliran darah ke otak terjaga optimal — Anti G-LOC!',
  },
];

export function GSuitControlPanel() {
  const selectedId = useHangarStore((s) => s.selectedId);
  const gForceLevel = useHangarStore((s) => s.gForceLevel);
  const setGForceLevel = useHangarStore((s) => s.setGForceLevel);
  const flightMode = useHangarStore((s) => s.flightMode);

  if (selectedId !== 'gsuit') return null;

  const activeG = flightMode === 'engineSim' ? 9 : gForceLevel;
  const info = G_LEVELS.find((l) => l.g === activeG) ?? G_LEVELS[0];

  return (
    <div className="pointer-events-none fixed bottom-[92px] sm:bottom-[104px] left-1/2 z-25 w-[min(460px,calc(100vw-1.25rem))] -translate-x-1/2 animate-slidein">
      <div className="hud-panel pointer-events-auto rounded-xl border-cyan-400/50 bg-[#081933]/92 px-3 py-2 shadow-xl space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 font-display text-[10px] sm:text-[11px] font-bold tracking-[0.14em] text-cyan-300 uppercase">
            <Gauge className="h-3.5 w-3.5 text-[#ffb703]" />
            PRINSIP KERJA G-SUIT • UJI TEKANAN G-FORCE
          </span>
          <span className="inline-flex items-center gap-1 rounded bg-cyan-500/15 border border-cyan-400/40 px-1.5 py-0.5 font-display text-[10px] font-bold text-[#ffb703]">
            <Activity className="h-3 w-3" /> {info.pressure}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {G_LEVELS.map((lvl) => {
            const isActive = activeG === lvl.g;
            return (
              <button
                key={lvl.g}
                type="button"
                onClick={() => setGForceLevel(lvl.g)}
                className={`rounded-lg border px-2 py-1.5 font-display text-[10px] sm:text-xs font-bold tracking-wider uppercase transition-all cursor-pointer active:scale-95 ${
                  isActive
                    ? lvl.g === 9
                      ? 'border-[#ffb703] bg-[#ffb703]/20 text-[#ffb703] shadow-amber'
                      : 'border-cyan-400 bg-cyan-400/20 text-cyan-200'
                    : 'border-slate-700/80 bg-[#0e2a54]/80 text-slate-300 hover:border-cyan-400/60'
                }`}
              >
                {lvl.badge}
              </button>
            );
          })}
        </div>

        <div className="text-[11px] text-slate-200 leading-snug flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
          <span>
            <strong className="text-cyan-300">Kantung:</strong> {info.bladder}
          </span>
        </div>
      </div>
    </div>
  );
}
