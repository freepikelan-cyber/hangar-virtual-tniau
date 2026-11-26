import { useEffect, useState } from 'react';
import { Info, SlidersHorizontal, Wind, X } from 'lucide-react';
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

type DrawerTab = 'info' | 'controls' | null;

/**
 * Opsi 1 — Collapsible Pill Aerodinamika:
 * - Default hanya tampil sebagai 1 strip tipis di bagian atas layar (tepat di bawah TopHeader)
 *   agar 95% area layar HP maupun Laptop benar-benar lega untuk melihat animasi pesawat 3D!
 * - Pengguna bisa klik "Info" atau "Flap & Trim" kapan saja untuk membuka/menutup kartu detail.
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

  const [openTab, setOpenTab] = useState<DrawerTab>(null);

  useEffect(() => {
    if (!aeroMode) setOpenTab(null);
  }, [aeroMode]);

  const isEquipment = unit.id === 'gsuit' || unit.id === 'pilot-helmet';
  const isHeli = unit.category === 'Helikopter';

  if (!aeroMode || isEquipment) return null;

  const activeInfo = MANEUVER_INFO[aeroManeuver];
  const trimText = trimAngle > 0 ? `+${trimAngle}°` : `${trimAngle}°`;

  return (
    <div className="pointer-events-none fixed top-[60px] sm:top-[68px] left-0 right-0 z-25 flex flex-col items-center gap-1.5 px-2.5 sm:px-4">
      {/* === STRIP PILL RINGKAS 1 BARIS (TIDAK MENUTUPI PESAWAT 3D) === */}
      <div className="hud-panel pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-1.5 sm:gap-2 rounded-full border-cyan-400/50 bg-[#071830]/82 px-2.5 sm:px-3.5 py-1.5 shadow-[0_8px_24px_rgba(2,10,28,0.65)] backdrop-blur-md animate-slidein">
        <div className="flex items-center gap-1.5 min-w-0">
          <Wind className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
          <span className="rounded-full bg-cyan-400/20 px-2 py-0.5 font-display text-[9px] sm:text-[10px] font-bold tracking-wider text-cyan-200 uppercase shrink-0">
            {activeInfo.badge}
          </span>
          <span className="font-display text-[11px] sm:text-xs font-bold tracking-wide text-white uppercase truncate max-w-[140px] sm:max-w-none">
            {activeInfo.title}
          </span>
        </div>

        {!isHeli && (
          <span className="hidden md:inline-flex items-center gap-1.5 border-l border-cyan-400/25 pl-2 font-mono text-[10px] text-slate-300">
            <span className="text-[#ffb703] font-bold">Flap {flapAngle}°</span>
            <span className="text-slate-600">•</span>
            <span className="text-cyan-300 font-bold">Trim {trimText}</span>
          </span>
        )}

        <div className="flex items-center gap-1 border-l border-cyan-400/25 pl-1.5 sm:pl-2">
          <button
            type="button"
            onClick={() => setOpenTab((prev) => (prev === 'info' ? null : 'info'))}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-display text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer active:scale-95 ${
              openTab === 'info'
                ? 'border-cyan-300 bg-cyan-400 text-[#081933]'
                : 'border-cyan-400/50 bg-[#0d274d] text-cyan-200 hover:bg-cyan-400/20'
            }`}
          >
            <Info className="h-3 w-3" />
            <span>Info</span>
          </button>

          {!isHeli && (
            <button
              type="button"
              onClick={() => setOpenTab((prev) => (prev === 'controls' ? null : 'controls'))}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-display text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer active:scale-95 ${
                openTab === 'controls'
                  ? 'border-[#ffb703] bg-[#ffb703] text-[#081933]'
                  : 'border-[#ffb703]/55 bg-[#0d274d] text-[#ffb703] hover:bg-[#ffb703]/20'
              }`}
            >
              <SlidersHorizontal className="h-3 w-3" />
              <span>Flap &amp; Trim</span>
            </button>
          )}
        </div>
      </div>

      {/* === KARTU POPOVER DETAIL (HANYA MUNCUL SAAT DIKLIK "INFO" ATAU "FLAP & TRIM") === */}
      {openTab === 'info' && (
        <div className="hud-panel pointer-events-auto w-full max-w-md rounded-xl border-cyan-400/55 bg-[#081933]/94 px-3.5 py-3 shadow-[0_14px_36px_rgba(2,10,28,0.85)] backdrop-blur-md animate-slidein space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="font-display text-[10px] font-bold tracking-widest text-cyan-300 uppercase">
                Penjelasan Aerodinamika • {activeInfo.badge}
              </span>
              <h3 className="font-display text-sm font-bold text-white uppercase">{activeInfo.title}</h3>
            </div>
            <button
              type="button"
              onClick={() => setOpenTab(null)}
              aria-label="Tutup Keterangan"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/70 text-slate-300 hover:bg-rose-500/25 hover:text-white cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <p className="text-xs leading-relaxed text-slate-200">{activeInfo.desc}</p>

          <div className="flex flex-wrap items-center gap-2 border-t border-cyan-400/20 pt-2 font-display text-[10px] font-semibold tracking-wider uppercase">
            <span className="text-emerald-300">Lift ↑ (Angkat)</span>
            <span className="text-slate-600">•</span>
            <span className="text-amber-300">Weight ↓ (Berat)</span>
            <span className="text-slate-600">•</span>
            <span className="text-sky-300">Thrust → / Drag ←</span>
          </div>

          {!isHeli && (
            <div className="rounded-lg border border-white/10 bg-[#0b2347]/80 px-2.5 py-2 text-[11px] leading-snug text-slate-300 space-y-1">
              <p>
                <strong className="text-[#ffb703]">Flap {flapAngle}°:</strong> {FLAP_INFO[flapAngle].effect}
              </p>
              <p>
                <strong className="text-cyan-300">Trim {trimText}:</strong> {TRIM_INFO[trimAngle].effect}
              </p>
            </div>
          )}
        </div>
      )}

      {openTab === 'controls' && !isHeli && (
        <div className="hud-panel pointer-events-auto w-full max-w-md rounded-xl border-[#ffb703]/55 bg-[#081933]/94 px-3.5 py-3 shadow-[0_14px_36px_rgba(2,10,28,0.85)] backdrop-blur-md animate-slidein space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-display text-xs font-bold tracking-wider text-[#ffb703] uppercase">
              Pengaturan Sudut Flap &amp; Trim
            </span>
            <button
              type="button"
              onClick={() => setOpenTab(null)}
              aria-label="Tutup Pengaturan Flap & Trim"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/70 text-slate-300 hover:bg-rose-500/25 hover:text-white cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-display text-[10px] font-bold tracking-wider text-[#ffb703] uppercase">
                Sudut Flap:
              </span>
              <div className="flex items-center gap-1.5">
                {([0, 15, 35] as const).map((deg) => (
                  <button
                    key={deg}
                    type="button"
                    onClick={() => {
                      setFlapAngle(deg);
                      if (aeroManeuver === 'liftDemo') setAeroManeuver('level');
                    }}
                    className={`rounded border px-2.5 py-1 font-display text-[10px] font-bold uppercase transition-all cursor-pointer active:scale-95 ${
                      flapAngle === deg
                        ? 'border-[#ffb703] bg-[#ffb703] text-[#0a1e3c]'
                        : 'border-slate-700 bg-[#0e2a54] text-slate-200 hover:border-[#ffb703]/60'
                    }`}
                  >
                    {deg === 0 ? '0°' : deg === 15 ? '15° T/O' : '35° Land'}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">{FLAP_INFO[flapAngle].effect}</p>
          </div>

          <div className="space-y-1.5 border-t border-white/10 pt-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-display text-[10px] font-bold tracking-wider text-cyan-300 uppercase">
                Sudut Trim Ekor:
              </span>
              <div className="flex items-center gap-1.5">
                {([-5, 0, 8] as const).map((deg) => (
                  <button
                    key={deg}
                    type="button"
                    onClick={() => {
                      setTrimAngle(deg);
                      setAeroManeuver(deg > 0 ? 'climb' : deg < 0 ? 'descend' : 'level');
                    }}
                    className={`rounded border px-2.5 py-1 font-display text-[10px] font-bold uppercase transition-all cursor-pointer active:scale-95 ${
                      trimAngle === deg
                        ? 'border-cyan-300 bg-cyan-400 text-[#0a1e3c]'
                        : 'border-slate-700 bg-[#0e2a54] text-slate-200 hover:border-cyan-400/60'
                    }`}
                  >
                    {deg === -5 ? '-5°' : deg === 0 ? '0°' : '+8°'}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">{TRIM_INFO[trimAngle].effect}</p>
          </div>
        </div>
      )}
    </div>
  );
}
