import { Wind } from 'lucide-react';
import { FLAP_INFO, TRIM_INFO } from '../../data/supportSystems';
import { useHangarStore, useSelectedUnit, type AeroManeuver } from '../../store/useHangarStore';

const MANEUVER_INFO: Record<AeroManeuver, { title: string; badge: string; desc: string }> = {
  liftDemo: {
    title: 'Proses Lift (Terbang)',
    badge: 'AUTO DEMO',
    desc: 'Aliran angin dari depan mengenai sayap & trim, lalu dibelokkan ke bawah (downwash) sehingga timbul Gaya Angkat (Lift ↑) yang mengangkat pesawat terbang.',
  },
  climb: {
    title: 'Menanjak (Climb)',
    badge: 'PITCH UP',
    desc: 'Trim/Elevator ekor naik (+8°), mendorong ekor ke bawah sehingga hidung pesawat mendongak naik, sudut serang (AoA) membesar, dan Lift > Weight membuat pesawat menanjak.',
  },
  descend: {
    title: 'Menurun (Descend)',
    badge: 'PITCH DOWN',
    desc: 'Trim/Elevator ekor turun (-5°), mengangkat ekor sehingga hidung pesawat menunduk turun dan Weight > Lift membuat pesawat meluncur turun secara terkendali.',
  },
  turnLeft: {
    title: 'Belok Kiri (Bank Left)',
    badge: 'ROLL KIRI',
    desc: 'Aileron kiri NAIK (Lift kiri berkurang) & Aileron kanan TURUN (Lift kanan membesar). Perbedaan gaya angkat memiringkan pesawat ke kiri untuk berbelok.',
  },
  turnRight: {
    title: 'Belok Kanan (Bank Right)',
    badge: 'ROLL KANAN',
    desc: 'Aileron kanan NAIK (Lift kanan berkurang) & Aileron kiri TURUN (Lift kiri membesar). Sayap kiri terangkat lebih tinggi sehingga pesawat miring dan berbelok ke kanan.',
  },
  level: {
    title: 'Terbang Datar (Level)',
    badge: 'SEIMBANG',
    desc: 'Gaya Angkat (Lift ↑) seimbang dengan Berat (Weight ↓) dan Gaya Dorong (Thrust →) seimbang dengan Hambatan (Drag ←).',
  },
};

/**
 * Caption Keterangan Aerodinamika 3D di bagian bawah layar (di atas bar tombol kontrol Aerodinamika),
 * sehingga area tengah & samping layar 100% bebas untuk melihat animasi aliran angin, sayap, flap, & trim!
 */
export function AeroControlPanel() {
  const unit = useSelectedUnit();
  const aeroMode = useHangarStore((s) => s.aeroMode);
  const flapAngle = useHangarStore((s) => s.flapAngle);
  const trimAngle = useHangarStore((s) => s.trimAngle);
  const aeroManeuver = useHangarStore((s) => s.aeroManeuver);
  const setFlapAngle = useHangarStore((s) => s.setFlapAngle);
  const setTrimAngle = useHangarStore((s) => s.setTrimAngle);
  const setAeroManeuver = useHangarStore((s) => s.setAeroManeuver);

  const isEquipment = unit.id === 'gsuit' || unit.id === 'pilot-helmet';
  const isHeli = unit.category === 'Helikopter';

  if (!aeroMode || isEquipment) return null;

  const activeInfo = MANEUVER_INFO[aeroManeuver];

  return (
    <div className="pointer-events-none fixed bottom-[92px] sm:bottom-[104px] left-0 right-0 z-25 flex justify-center px-2.5 sm:px-4">
      <div className="hud-panel pointer-events-auto w-full max-w-3xl rounded-xl border-cyan-400/45 bg-[#081933]/90 px-3 sm:px-4 py-2.5 shadow-[0_12px_32px_rgba(2,10,28,0.8)] animate-slidein space-y-2">
        {/* Baris Judul Caption & Keterangan Utama */}
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <Wind className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
            <span className="rounded bg-cyan-400/20 px-1.5 py-0.5 font-display text-[10px] font-bold tracking-wider text-cyan-200 uppercase shrink-0">
              {activeInfo.badge}
            </span>
            <h2 className="font-display text-xs sm:text-sm font-bold tracking-wide text-white uppercase truncate">
              {activeInfo.title}
            </h2>
          </div>

          <div className="hidden sm:flex items-center gap-2 font-display text-[10px] font-semibold tracking-wider uppercase">
            <span className="text-emerald-300">Lift ↑</span>
            <span className="text-slate-600">•</span>
            <span className="text-amber-300">Weight ↓</span>
            <span className="text-slate-600">•</span>
            <span className="text-sky-300">Thrust → / Drag ←</span>
          </div>
        </div>

        <p className="text-[11px] sm:text-xs leading-relaxed text-slate-200">{activeInfo.desc}</p>

        {/* Kontrol Ringkas Flap & Trim + Keterangan Singkat (khusus pesawat sayap tetap) */}
        {!isHeli && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-cyan-400/20 pt-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-display text-[10px] font-bold tracking-wider text-[#ffb703] uppercase">Flap:</span>
              {([0, 15, 35] as const).map((deg) => (
                <button
                  key={deg}
                  type="button"
                  onClick={() => {
                    setFlapAngle(deg);
                    if (aeroManeuver === 'liftDemo') setAeroManeuver('level');
                  }}
                  className={`rounded border px-2 py-0.5 font-display text-[10px] font-bold uppercase transition-all cursor-pointer active:scale-95 ${
                    flapAngle === deg
                      ? 'border-[#ffb703] bg-[#ffb703] text-[#0a1e3c]'
                      : 'border-slate-700 bg-[#0e2a54] text-slate-200 hover:border-[#ffb703]/60'
                  }`}
                >
                  {deg === 0 ? '0°' : deg === 15 ? '15° T/O' : '35° Land'}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-display text-[10px] font-bold tracking-wider text-cyan-300 uppercase">Trim:</span>
              {([-5, 0, 8] as const).map((deg) => (
                <button
                  key={deg}
                  type="button"
                  onClick={() => {
                    setTrimAngle(deg);
                    setAeroManeuver(deg > 0 ? 'climb' : deg < 0 ? 'descend' : 'level');
                  }}
                  className={`rounded border px-2 py-0.5 font-display text-[10px] font-bold uppercase transition-all cursor-pointer active:scale-95 ${
                    trimAngle === deg
                      ? 'border-cyan-300 bg-cyan-400 text-[#0a1e3c]'
                      : 'border-slate-700 bg-[#0e2a54] text-slate-200 hover:border-cyan-400/60'
                  }`}
                >
                  {deg === -5 ? '-5°' : deg === 0 ? '0°' : '+8°'}
                </button>
              ))}
            </div>

            <p className="w-full text-[10px] sm:text-[11px] text-slate-300/90 leading-snug">
              <strong className="text-[#ffb703]">Flap {flapAngle}°:</strong> {FLAP_INFO[flapAngle].effect}{' '}
              <span className="text-slate-500">|</span>{' '}
              <strong className="text-cyan-300">Trim {trimAngle > 0 ? `+${trimAngle}°` : `${trimAngle}°`}:</strong>{' '}
              {TRIM_INFO[trimAngle].effect}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
