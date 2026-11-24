import { useState } from 'react';
import { Wind, X } from 'lucide-react';
import { FLAP_INFO, TRIM_INFO } from '../../data/supportSystems';
import { useHangarStore, useSelectedUnit } from '../../store/useHangarStore';

type AeroTab = 'flap' | 'trim' | 'forces';

/**
 * Panel Kontrol Interaktif Aerodinamika (ringkas, bertab agar teks tidak menumpuk
 * dan tidak menutupi panah 3D di tengah layar).
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
  const [tab, setTab] = useState<AeroTab>(isHeli ? 'forces' : 'flap');

  if (!aeroMode || isEquipment) return null;

  const activeTab: AeroTab = isHeli ? 'forces' : tab;

  return (
    <div className="pointer-events-none fixed bottom-[126px] sm:bottom-[136px] left-1/2 z-40 w-[min(480px,calc(100vw-1.5rem))] -translate-x-1/2 animate-slidein">
      <div className="hud-panel pointer-events-auto rounded-xl border-cyan-400/55 bg-[#081a36]/96 p-3 shadow-[0_14px_36px_rgba(2,10,28,0.88)] space-y-2">
        {/* Baris Header + Tab Ringkas */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Wind className="h-4 w-4 shrink-0 text-cyan-300" />
            <span className="font-display text-xs font-bold tracking-[0.14em] text-cyan-300 uppercase truncate">
              AERODINAMIKA
            </span>
          </div>

          {!isHeli && (
            <div className="flex items-center gap-1 rounded-lg bg-[#0d264d] p-0.5 border border-[#4da6ff]/25">
              {(
                [
                  { id: 'flap', label: 'Flap' },
                  { id: 'trim', label: 'Trim' },
                  { id: 'forces', label: '4 Gaya' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`rounded-md px-2.5 py-1 font-display text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer ${
                    activeTab === t.id
                      ? 'bg-[#4da6ff] text-[#0a1e3c]'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => toggle('aeroMode')}
            aria-label="Tutup Panel Aerodinamika"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-[#0e2a54] text-slate-300 hover:border-cyan-400 hover:text-white cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Isi Tab: hanya 1 topik tampil pada satu waktu agar bersih & mudah dibaca */}
        {activeTab === 'flap' && !isHeli && (
          <div className="space-y-1.5">
            <div className="grid grid-cols-3 gap-1.5">
              {([0, 15, 35] as const).map((deg) => (
                <button
                  key={deg}
                  type="button"
                  onClick={() => setFlapAngle(deg)}
                  className={`rounded-lg border px-2 py-1.5 font-display text-[11px] font-bold uppercase transition-all cursor-pointer ${
                    flapAngle === deg
                      ? 'border-[#ffb703] bg-[#ffb703] text-[#0a1e3c] shadow-amber'
                      : 'border-slate-700 bg-[#0e2a54] text-slate-200 hover:border-[#ffb703]/60'
                  }`}
                >
                  {deg === 0 ? '0° Cruise' : deg === 15 ? '15° Take Off' : '35° Landing'}
                </button>
              ))}
            </div>
            <p className="text-[11px] sm:text-xs leading-relaxed text-slate-200">{FLAP_INFO[flapAngle].effect}</p>
          </div>
        )}

        {activeTab === 'trim' && !isHeli && (
          <div className="space-y-1.5">
            <div className="grid grid-cols-3 gap-1.5">
              {([-5, 0, 8] as const).map((deg) => (
                <button
                  key={deg}
                  type="button"
                  onClick={() => setTrimAngle(deg)}
                  className={`rounded-lg border px-2 py-1.5 font-display text-[11px] font-bold uppercase transition-all cursor-pointer ${
                    trimAngle === deg
                      ? 'border-cyan-300 bg-cyan-400 text-[#0a1e3c]'
                      : 'border-slate-700 bg-[#0e2a54] text-slate-200 hover:border-cyan-400/60'
                  }`}
                >
                  {deg === -5 ? 'Nose Down -5°' : deg === 0 ? 'Netral 0°' : 'Nose Up +8°'}
                </button>
              ))}
            </div>
            <p className="text-[11px] sm:text-xs leading-relaxed text-slate-200">{TRIM_INFO[trimAngle].effect}</p>
          </div>
        )}

        {activeTab === 'forces' && (
          <div className="grid grid-cols-2 gap-1.5 text-[11px] leading-snug">
            <div className="rounded-lg border border-emerald-400/35 bg-emerald-500/10 px-2.5 py-1.5 text-emerald-200">
              <strong className="text-emerald-300">LIFT (Angkat ↑):</strong> Melawan gravitasi lewat perbedaan tekanan udara sayap.
            </div>
            <div className="rounded-lg border border-amber-400/35 bg-amber-500/10 px-2.5 py-1.5 text-amber-200">
              <strong className="text-amber-300">WEIGHT (Berat ↓):</strong> Gaya gravitasi bumi menarik massa pesawat ke bawah.
            </div>
            <div className="rounded-lg border border-sky-400/35 bg-sky-500/10 px-2.5 py-1.5 text-sky-200">
              <strong className="text-sky-300">THRUST (Dorong →):</strong> Tenaga dorong mesin jet/baling-baling ke depan.
            </div>
            <div className="rounded-lg border border-rose-400/35 bg-rose-500/10 px-2.5 py-1.5 text-rose-200">
              <strong className="text-rose-300">DRAG (Hambat ←):</strong> Hambatan udara yang meningkat saat Flap diturunkan.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
