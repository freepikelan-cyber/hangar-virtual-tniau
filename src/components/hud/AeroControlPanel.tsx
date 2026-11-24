import { Wind, X } from 'lucide-react';
import { FLAP_INFO, TRIM_INFO } from '../../data/supportSystems';
import { useHangarStore, useSelectedUnit } from '../../store/useHangarStore';

/**
 * Panel Lab Aerodinamika di sisi kanan (menggantikan posisi Panel Info saat mode Aerodinamika aktif)
 * sehingga area tengah 3D sepenuhnya lapang untuk mengamati 4 gaya, aliran udara, Flap, & Trim.
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
    <aside className="pointer-events-none fixed top-[74px] sm:top-[84px] bottom-[102px] sm:bottom-[112px] right-2.5 sm:right-4 z-30 lg:z-20 flex items-start">
      <div className="hud-panel pointer-events-auto flex h-full w-[min(340px,calc(100vw-1.25rem))] lg:w-[320px] xl:w-[360px] flex-col rounded-xl border-cyan-400/50 overflow-hidden animate-slidein">
        {/* Header Panel Aerodinamika */}
        <div className="flex items-start justify-between gap-2 border-b border-cyan-400/25 bg-[#0b2349]/90 px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-cyan-300">
              <Wind className="h-4 w-4 shrink-0" />
              <span className="font-display text-[11px] font-bold tracking-[0.16em] uppercase">
                LAB AERODINAMIKA 3D
              </span>
            </div>
            <h2 className="mt-0.5 font-display text-base sm:text-lg font-bold tracking-wide text-white truncate">
              {unit.name}
            </h2>
            <p className="text-[11px] text-slate-300">
              {isHeli ? 'Prinsip 4 Gaya Terbang Helikopter' : 'Prinsip 4 Gaya, Sistem Flap & Trim'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => toggle('aeroMode')}
            aria-label="Tutup Panel Aerodinamika"
            title="Tutup Aerodinamika"
            className="hud-btn h-11 w-11 shrink-0 border-cyan-400/35 bg-[#103060]/70 text-cyan-300 hover:bg-cyan-400/20"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Isi Scrollable Rapi */}
        <div className="hud-scroll flex-1 overflow-y-auto p-3.5 space-y-4">
          {!isHeli && (
            <>
              {/* 1. Sistem Flap Sayap */}
              <div className="rounded-xl border border-[#ffb703]/35 bg-[#0a2145]/85 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-xs font-bold tracking-[0.14em] text-[#ffb703] uppercase">
                    1. Sistem Flap Sayap
                  </span>
                  <span className="rounded bg-[#ffb703]/20 px-1.5 py-0.5 font-display text-[10px] font-bold text-[#ffb703]">
                    {flapAngle}°
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {([0, 15, 35] as const).map((deg) => (
                    <button
                      key={deg}
                      type="button"
                      onClick={() => setFlapAngle(deg)}
                      className={`rounded-lg border px-2 py-2 font-display text-[11px] font-bold uppercase transition-all cursor-pointer ${
                        flapAngle === deg
                          ? 'border-[#ffb703] bg-[#ffb703] text-[#0a1e3c] shadow-amber'
                          : 'border-slate-700 bg-[#0e2a54] text-slate-200 hover:border-[#ffb703]/60'
                      }`}
                    >
                      {deg === 0 ? '0° Cruise' : deg === 15 ? '15° T/O' : '35° Land'}
                    </button>
                  ))}
                </div>
                <p className="text-xs leading-relaxed text-slate-200">{FLAP_INFO[flapAngle].effect}</p>
              </div>

              {/* 2. Sistem Trim Ekor */}
              <div className="rounded-xl border border-cyan-400/35 bg-[#0a2145]/85 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-xs font-bold tracking-[0.14em] text-cyan-300 uppercase">
                    2. Sistem Trim Ekor (Pitch)
                  </span>
                  <span className="rounded bg-cyan-400/20 px-1.5 py-0.5 font-display text-[10px] font-bold text-cyan-300">
                    {trimAngle > 0 ? `+${trimAngle}°` : `${trimAngle}°`}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {([-5, 0, 8] as const).map((deg) => (
                    <button
                      key={deg}
                      type="button"
                      onClick={() => setTrimAngle(deg)}
                      className={`rounded-lg border px-1.5 py-2 font-display text-[11px] font-bold uppercase transition-all cursor-pointer ${
                        trimAngle === deg
                          ? 'border-cyan-300 bg-cyan-400 text-[#0a1e3c]'
                          : 'border-slate-700 bg-[#0e2a54] text-slate-200 hover:border-cyan-400/60'
                      }`}
                    >
                      {deg === -5 ? 'Down -5°' : deg === 0 ? 'Netral 0°' : 'Up +8°'}
                    </button>
                  ))}
                </div>
                <p className="text-xs leading-relaxed text-slate-200">{TRIM_INFO[trimAngle].effect}</p>
              </div>
            </>
          )}

          {/* 3. 4 Gaya Aerodinamika Terbang */}
          <div className="space-y-2">
            <h3 className="font-display text-xs font-bold tracking-[0.14em] text-[#4da6ff] uppercase">
              {isHeli ? '4 Gaya Aerodinamika Helikopter' : '3. Empat Gaya Aerodinamika'}
            </h3>
            <div className="space-y-2 text-xs leading-relaxed">
              <div className="rounded-lg border border-emerald-400/35 bg-emerald-500/10 p-2.5 text-slate-200">
                <strong className="font-display tracking-wider text-emerald-300 uppercase">LIFT (Gaya Angkat ↑)</strong>
                <p className="mt-0.5 text-[11px] text-slate-300">
                  Dihasilkan dari perbedaan tekanan udara di atas & bawah sayap (Hukum Bernoulli). Saat Lift &gt; Weight, pesawat mengudara.
                </p>
              </div>
              <div className="rounded-lg border border-amber-400/35 bg-amber-500/10 p-2.5 text-slate-200">
                <strong className="font-display tracking-wider text-amber-300 uppercase">WEIGHT (Gaya Berat ↓)</strong>
                <p className="mt-0.5 text-[11px] text-slate-300">
                  Gaya gravitasi bumi yang menarik seluruh massa badan pesawat, bahan bakar, awak, dan persenjataan ke bawah.
                </p>
              </div>
              <div className="rounded-lg border border-sky-400/35 bg-sky-500/10 p-2.5 text-slate-200">
                <strong className="font-display tracking-wider text-sky-300 uppercase">THRUST (Gaya Dorong →)</strong>
                <p className="mt-0.5 text-[11px] text-slate-300">
                  Tenaga dorong ke depan dari mesin jet turbofan/afterburner atau baling-baling untuk membelah udara & menciptakan Lift.
                </p>
              </div>
              <div className="rounded-lg border border-rose-400/35 bg-rose-500/10 p-2.5 text-slate-200">
                <strong className="font-display tracking-wider text-rose-300 uppercase">DRAG (Gaya Hambat ←)</strong>
                <p className="mt-0.5 text-[11px] text-slate-300">
                  Hambatan gesekan udara yang menahan laju pesawat; meningkat saat Flap 35° & roda pendarat diturunkan ketika Landing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
