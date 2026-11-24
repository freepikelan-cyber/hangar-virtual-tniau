import { Wind, X } from 'lucide-react';
import { FLAP_INFO, TRIM_INFO } from '../../data/supportSystems';
import { useHangarStore, useSelectedUnit } from '../../store/useHangarStore';

/**
 * Panel Kontrol Interaktif Aerodinamika (Flap & Trim) — tampil ringkas di atas-tengah
 * saat pengguna mengaktifkan mode "Aerodinamika".
 */
export function AeroControlPanel() {
  const unit = useSelectedUnit();
  const aeroMode = useHangarStore((s) => s.aeroMode);
  const flapAngle = useHangarStore((s) => s.flapAngle);
  const trimAngle = useHangarStore((s) => s.trimAngle);
  const setFlapAngle = useHangarStore((s) => s.setFlapAngle);
  const setTrimAngle = useHangarStore((s) => s.setTrimAngle);
  const toggle = useHangarStore((s) => s.toggle);

  const isEquipment = unit.id === 'gsuit' || unit.id === 'pilot-helmet';
  const isHeli = unit.category === 'Helikopter';

  if (!aeroMode || isEquipment) return null;

  return (
    <div className="pointer-events-none fixed top-[74px] sm:top-[84px] left-1/2 z-25 w-[min(460px,calc(100vw-1.5rem))] -translate-x-1/2 animate-slidein">
      <div className="hud-panel pointer-events-auto rounded-xl border-cyan-400/55 bg-[#091c3a]/95 p-3 shadow-[0_14px_36px_rgba(2,10,28,0.8)] space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Wind className="h-4 w-4 text-cyan-300" />
            <span className="font-display text-xs font-bold tracking-[0.14em] text-cyan-300 uppercase">
              LAB AERODINAMIKA • {isHeli ? '4 GAYA & ROTOR' : '4 GAYA, FLAP & TRIM'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => toggle('aeroMode')}
            aria-label="Tutup Panel Aerodinamika"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700 bg-[#0e2a54] text-slate-300 hover:border-cyan-400 hover:text-white cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Penjelasan singkat 4 gaya terbang */}
        <p className="text-[11px] leading-snug text-slate-200">
          Pesawat terbang saat <strong className="text-emerald-300">Lift</strong> (Gaya Angkat) &gt;{' '}
          <strong className="text-amber-300">Weight</strong> (Berat) dan{' '}
          <strong className="text-sky-300">Thrust</strong> (Dorong) &gt;{' '}
          <strong className="text-rose-300">Drag</strong> (Hambat).
        </p>

        {!isHeli && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-[#4da6ff]/20">
            {/* Kontrol Flap */}
            <div>
              <span className="font-display text-[10px] font-bold tracking-wider text-[#ffb703] uppercase">
                SISTEM FLAP SAYAP
              </span>
              <div className="mt-1 grid grid-cols-3 gap-1">
                {([0, 15, 35] as const).map((deg) => (
                  <button
                    key={deg}
                    type="button"
                    onClick={() => setFlapAngle(deg)}
                    className={`rounded-md border px-1.5 py-1 font-display text-[10px] font-bold uppercase transition-all cursor-pointer ${
                      flapAngle === deg
                        ? 'border-[#ffb703] bg-[#ffb703] text-[#0a1e3c]'
                        : 'border-slate-700 bg-[#0e2a54] text-slate-300 hover:border-[#ffb703]/60'
                    }`}
                  >
                    {deg === 0 ? '0°' : deg === 15 ? '15° T/O' : '35° LND'}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[10px] leading-snug text-slate-300">{FLAP_INFO[flapAngle].effect}</p>
            </div>

            {/* Kontrol Trim */}
            <div>
              <span className="font-display text-[10px] font-bold tracking-wider text-cyan-300 uppercase">
                SISTEM TRIM EKOR (PITCH)
              </span>
              <div className="mt-1 grid grid-cols-3 gap-1">
                {([-5, 0, 8] as const).map((deg) => (
                  <button
                    key={deg}
                    type="button"
                    onClick={() => setTrimAngle(deg)}
                    className={`rounded-md border px-1.5 py-1 font-display text-[10px] font-bold uppercase transition-all cursor-pointer ${
                      trimAngle === deg
                        ? 'border-cyan-300 bg-cyan-400 text-[#0a1e3c]'
                        : 'border-slate-700 bg-[#0e2a54] text-slate-300 hover:border-cyan-400/60'
                    }`}
                  >
                    {deg === -5 ? 'Down -5°' : deg === 0 ? 'Netral 0°' : 'Up +8°'}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[10px] leading-snug text-slate-300">{TRIM_INFO[trimAngle].effect}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
