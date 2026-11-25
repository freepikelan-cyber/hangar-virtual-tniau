import { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, ChevronDown, ChevronUp, RotateCcw, RotateCw, Sparkles, Square, Wind } from 'lucide-react';
import { FLAP_INFO, TRIM_INFO } from '../../data/supportSystems';
import { useHangarStore, useSelectedUnit, type AeroManeuver } from '../../store/useHangarStore';

const MANEUVER_INFO: Record<AeroManeuver, { title: string; badge: string; desc: string }> = {
  liftDemo: {
    title: 'Proses Lift (Terbang)',
    badge: 'AUTO DEMO',
    desc: 'Aliran angin dari depan mengenai sayap & trim yang berubah posisi, lalu dibelokkan ke bawah (downwash) sehingga timbul Gaya Angkat (Lift ↑) yang mengangkat pesawat terbang!',
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
    desc: 'Aileron kiri NAIK (Lift kiri berkurang) & Aileron kanan TURUN (Lift kanan membesar). Perbedaan gaya angkat di kedua sayap memiringkan pesawat ke kiri untuk berbelok.',
  },
  turnRight: {
    title: 'Belok Kanan (Bank Right)',
    badge: 'ROLL KANAN',
    desc: 'Aileron kanan NAIK (Lift kanan berkurang) & Aileron kiri TURUN (Lift kiri membesar). Sayap kiri terangkat lebih tinggi sehingga pesawat miring dan berbelok ke kanan.',
  },
  level: {
    title: 'Terbang Datar (Level)',
    badge: 'SEIMBANG',
    desc: 'Gaya Angkat (Lift) seimbang dengan Berat (Weight) dan Gaya Dorong (Thrust) seimbang dengan Hambatan (Drag).',
  },
};

export function AeroControlPanel() {
  const unit = useSelectedUnit();
  const aeroMode = useHangarStore((s) => s.aeroMode);
  const flapAngle = useHangarStore((s) => s.flapAngle);
  const trimAngle = useHangarStore((s) => s.trimAngle);
  const aeroManeuver = useHangarStore((s) => s.aeroManeuver);
  const setFlapAngle = useHangarStore((s) => s.setFlapAngle);
  const setTrimAngle = useHangarStore((s) => s.setTrimAngle);
  const setAeroManeuver = useHangarStore((s) => s.setAeroManeuver);
  const toggle = useHangarStore((s) => s.toggle);
  // Pada layar HP/Smartphone (< lg), panel detail default tertutup agar animasi 3D pesawat terlihat 100% penuh!
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const isEquipment = unit.id === 'gsuit' || unit.id === 'pilot-helmet';
  const isHeli = unit.category === 'Helikopter';

  if (!aeroMode || isEquipment) return null;

  const activeInfo = MANEUVER_INFO[aeroManeuver];

  return (
    <>
      {/* Tombol Pill Ringkas khusus HP/Smartphone (agar layar tengah 100% bebas melihat animasi pesawat 3D!) */}
      <div className="pointer-events-none fixed top-[66px] right-2.5 z-30 flex items-center gap-1.5 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileExpanded((v) => !v)}
          className="hud-panel pointer-events-auto inline-flex items-center gap-1.5 rounded-full border-cyan-400/55 bg-[#091c3a]/90 px-3 py-1.5 font-display text-[11px] font-bold tracking-wider text-cyan-200 uppercase shadow-glow cursor-pointer active:scale-95"
        >
          <Wind className="h-3.5 w-3.5 text-cyan-300" />
          <span>{mobileExpanded ? 'Sembunyikan Info' : 'Detail Flap & Trim'}</span>
          {mobileExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      <aside
        className={`pointer-events-none fixed top-[106px] lg:top-[84px] bottom-[96px] lg:bottom-[112px] right-2.5 sm:right-4 z-30 lg:z-20 items-start ${
          mobileExpanded ? 'flex' : 'hidden lg:flex'
        }`}
      >
        <div className="hud-panel pointer-events-auto flex max-h-full lg:h-full w-[min(340px,calc(100vw-1.25rem))] lg:w-[330px] xl:w-[365px] flex-col rounded-xl border-cyan-400/50 overflow-hidden animate-slidein">
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
                Aliran Angin, Gaya Lift Sayap &amp; Manuver 3D
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setMobileExpanded(false);
                toggle('aeroMode');
              }}
              aria-label="Stop Aerodinamika"
              title="Stop & Kembali ke Menu Utama"
              className="inline-flex items-center gap-1 rounded-lg border border-rose-400/60 bg-rose-500/20 px-2.5 py-2 font-display text-xs font-bold tracking-wider text-rose-200 uppercase hover:bg-rose-500/35 hover:text-white cursor-pointer active:scale-95 shrink-0"
            >
              <Square className="h-3.5 w-3.5" />
              Stop
            </button>
          </div>

        {/* Isi Scrollable Rapi */}
        <div className="hud-scroll flex-1 overflow-y-auto p-3.5 space-y-3.5">
          {/* 1. Animasi Aerodinamika Manuver & Proses Lift */}
          <div className="rounded-xl border border-emerald-400/45 bg-[#0a2145]/90 p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-display text-xs font-bold tracking-[0.14em] text-emerald-300 uppercase">
                1. Simulasi Aliran Angin &amp; Manuver
              </span>
              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 font-display text-[10px] font-bold text-emerald-300">
                {activeInfo.badge}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setAeroManeuver('liftDemo')}
              className={`w-full inline-flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 font-display text-xs font-bold uppercase transition-all cursor-pointer ${
                aeroManeuver === 'liftDemo'
                  ? 'border-emerald-400 bg-emerald-400 text-[#0a1e3c] shadow-[0_0_16px_rgba(52,211,153,0.45)]'
                  : 'border-emerald-400/45 bg-[#0e2a54] text-emerald-300 hover:bg-emerald-400/20'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Demo Angin → Trim → Gaya Lift Terbang
            </button>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setAeroManeuver('climb')}
                className={`inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-2 font-display text-[11px] font-bold uppercase transition-all cursor-pointer ${
                  aeroManeuver === 'climb'
                    ? 'border-[#ffb703] bg-[#ffb703] text-[#0a1e3c]'
                    : 'border-slate-700 bg-[#0e2a54] text-slate-200 hover:border-[#ffb703]/60'
                }`}
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
                Menanjak
              </button>
              <button
                type="button"
                onClick={() => setAeroManeuver('descend')}
                className={`inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-2 font-display text-[11px] font-bold uppercase transition-all cursor-pointer ${
                  aeroManeuver === 'descend'
                    ? 'border-[#ffb703] bg-[#ffb703] text-[#0a1e3c]'
                    : 'border-slate-700 bg-[#0e2a54] text-slate-200 hover:border-[#ffb703]/60'
                }`}
              >
                <ArrowDownRight className="h-3.5 w-3.5" />
                Menurun
              </button>
              <button
                type="button"
                onClick={() => setAeroManeuver('turnLeft')}
                className={`inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-2 font-display text-[11px] font-bold uppercase transition-all cursor-pointer ${
                  aeroManeuver === 'turnLeft'
                    ? 'border-cyan-300 bg-cyan-400 text-[#0a1e3c]'
                    : 'border-slate-700 bg-[#0e2a54] text-slate-200 hover:border-cyan-400/60'
                }`}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Belok Kiri
              </button>
              <button
                type="button"
                onClick={() => setAeroManeuver('turnRight')}
                className={`inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-2 font-display text-[11px] font-bold uppercase transition-all cursor-pointer ${
                  aeroManeuver === 'turnRight'
                    ? 'border-cyan-300 bg-cyan-400 text-[#0a1e3c]'
                    : 'border-slate-700 bg-[#0e2a54] text-slate-200 hover:border-cyan-400/60'
                }`}
              >
                <RotateCw className="h-3.5 w-3.5" />
                Belok Kanan
              </button>
            </div>

            <p className="text-[11px] leading-relaxed text-slate-200">{activeInfo.desc}</p>
          </div>

          {!isHeli && (
            <>
              {/* 2. Sistem Flap Sayap */}
              <div className="rounded-xl border border-[#ffb703]/35 bg-[#0a2145]/85 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-xs font-bold tracking-[0.14em] text-[#ffb703] uppercase">
                    2. Sistem Flap Sayap
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
                      onClick={() => {
                        setFlapAngle(deg);
                        if (aeroManeuver === 'liftDemo') setAeroManeuver('level');
                      }}
                      className={`rounded-lg border px-2 py-1.5 font-display text-[11px] font-bold uppercase transition-all cursor-pointer ${
                        flapAngle === deg
                          ? 'border-[#ffb703] bg-[#ffb703] text-[#0a1e3c] shadow-amber'
                          : 'border-slate-700 bg-[#0e2a54] text-slate-200 hover:border-[#ffb703]/60'
                      }`}
                    >
                      {deg === 0 ? '0° Cruise' : deg === 15 ? '15° T/O' : '35° Land'}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] leading-relaxed text-slate-200">{FLAP_INFO[flapAngle].effect}</p>
              </div>

              {/* 3. Sistem Trim Ekor */}
              <div className="rounded-xl border border-cyan-400/35 bg-[#0a2145]/85 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-xs font-bold tracking-[0.14em] text-cyan-300 uppercase">
                    3. Sistem Trim Ekor (Pitch)
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
                      onClick={() => {
                        setTrimAngle(deg);
                        setAeroManeuver(deg > 0 ? 'climb' : deg < 0 ? 'descend' : 'level');
                      }}
                      className={`rounded-lg border px-1.5 py-1.5 font-display text-[11px] font-bold uppercase transition-all cursor-pointer ${
                        trimAngle === deg
                          ? 'border-cyan-300 bg-cyan-400 text-[#0a1e3c]'
                          : 'border-slate-700 bg-[#0e2a54] text-slate-200 hover:border-cyan-400/60'
                      }`}
                    >
                      {deg === -5 ? 'Down -5°' : deg === 0 ? 'Netral 0°' : 'Up +8°'}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] leading-relaxed text-slate-200">{TRIM_INFO[trimAngle].effect}</p>
              </div>
            </>
          )}

          {/* 4. Penjelasan 4 Gaya & Tekanan Sayap */}
          <div className="space-y-2 text-[11px] leading-relaxed">
            <div className="rounded-lg border border-emerald-400/35 bg-emerald-500/10 p-2.5 text-slate-200">
              <strong className="font-display tracking-wider text-emerald-300 uppercase">LIFT ↑ (Gaya Angkat Sayap)</strong>
              <p className="mt-0.5 text-slate-300">
                Angin cepat di atas sayap menciptakan <strong>Tekanan Rendah (Biru)</strong>, sedangkan angin dibelokkan ke bawah (<em>Downwash</em>) menciptakan <strong>Tekanan Tinggi (Oranye)</strong> di bawah sayap yang mengangkat pesawat.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-2 text-slate-200">
                <strong className="font-display text-amber-300 uppercase">WEIGHT ↓</strong>
                <p className="text-[10px] text-slate-300">Gaya gravitasi menarik pesawat ke bawah.</p>
              </div>
              <div className="rounded-lg border border-sky-400/30 bg-sky-500/10 p-2 text-slate-200">
                <strong className="font-display text-sky-300 uppercase">THRUST → / DRAG ←</strong>
                <p className="text-[10px] text-slate-300">Dorongan mesin melawan hambatan angin.</p>
              </div>
            </div>
          </div>
        </div>
        </div>
      </aside>
    </>
  );
}
