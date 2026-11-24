import { useMemo } from 'react';
import {
  Compass,
  Crosshair,
  Gauge,
  MapPin,
  Mountain,
  Shield,
  Target,
  X,
} from 'lucide-react';
import { CATEGORY_LABEL } from '../../data/fleetData';
import { getSupportSystems } from '../../data/supportSystems';
import { useHangarStore, useSelectedUnit } from '../../store/useHangarStore';
import { getAircraftTransparentSnapshot } from '../../utils/aircraftSnapshot';
import { TniAuLogo3D } from './TniAuLogo3D';

export function InfographicModal() {
  const unit = useSelectedUnit();
  const showInfographic = useHangarStore((s) => s.showInfographic);
  const closeInfographic = useHangarStore((s) => s.closeInfographic);
  const focusHotspot = useHangarStore((s) => s.focusHotspot);
  const glbVer = useHangarStore((s) => s.glbVersion[unit.id] ?? 0);

  const previewUrl = useMemo(() => {
    if (!showInfographic) return '';
    try {
      return getAircraftTransparentSnapshot(unit.id);
    } catch {
      return '';
    }
  }, [showInfographic, unit.id, glbVer]);

  if (!showInfographic) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#06142b]/82 backdrop-blur-md p-3 sm:p-6"
      onClick={closeInfographic}
    >
      <div
        className="hud-panel relative flex max-h-[90dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border-[#4da6ff]/55 shadow-[0_20px_60px_rgba(2,10,28,0.8)] animate-slidein"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Poster Infografis */}
        <div className="flex items-start justify-between gap-3 border-b border-[#4da6ff]/30 bg-[#0b2349]/90 px-4 py-3.5 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center">
              <TniAuLogo3D className="h-full w-full" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-[#ffb703] px-2 py-0.5 font-display text-[11px] font-bold tracking-widest text-[#0a1e3c] uppercase">
                  INFOGRAFIS ALUTSISTA
                </span>
                <span className="rounded border border-[#4da6ff]/50 bg-[#4da6ff]/15 px-2 py-0.5 font-display text-[11px] font-bold tracking-widest text-[#75bcff] uppercase">
                  {CATEGORY_LABEL[unit.category]} • {unit.tailNumber}
                </span>
              </div>
              <h2 className="mt-1 font-display text-xl sm:text-3xl font-bold tracking-wide text-white uppercase leading-tight truncate">
                {unit.name}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 truncate">
                {unit.code} • {unit.origin} — {unit.squadron}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeInfographic}
            aria-label="Tutup Infografis"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#4da6ff]/40 bg-[#0e2a54] text-slate-200 hover:border-[#ffb703] hover:text-[#ffb703] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Isi Infografis Scrollable */}
        <div className="hud-scroll flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Gambar Pesawat Berlatar Transparan (Render langsung dari Model 3D) */}
          {previewUrl && (
            <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-[#4da6ff]/35 bg-gradient-to-b from-[#0f2e5e]/60 via-[#0a2145]/40 to-transparent px-4 py-3 sm:py-5">
              {/* Garis grid teknis halus di belakang pesawat transparan */}
              <div
                className="pointer-events-none absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, rgba(77,166,255,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(77,166,255,0.35) 1px, transparent 1px)',
                  backgroundSize: '36px 36px',
                }}
                aria-hidden
              />
              <img
                src={previewUrl}
                alt={`Gambar 3D ${unit.name}`}
                className="relative z-10 max-h-[210px] sm:max-h-[270px] w-auto object-contain drop-shadow-[0_14px_24px_rgba(0,0,0,0.65)]"
              />
              <span className="relative z-10 mt-1 rounded-full border border-[#4da6ff]/40 bg-[#0a1e3c]/70 px-3 py-0.5 font-display text-[10px] font-semibold tracking-[0.2em] text-[#75bcff] uppercase">
                {unit.name} • {unit.tailNumber} • {unit.origin}
              </span>
            </div>
          )}
          {/* Peran & 4 Kartu Performa */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-5 rounded-xl border border-[#4da6ff]/30 bg-[#0a2145]/80 p-4 flex flex-col justify-between">
              <div>
                <h3 className="font-display text-xs font-bold tracking-[0.18em] text-[#4da6ff] uppercase">
                  PROFIL & PERAN OPERASIONAL
                </h3>
                <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-200">{unit.role}</p>
              </div>
              <div className="mt-3 pt-3 border-t border-[#4da6ff]/20 flex flex-wrap gap-1.5">
                {unit.history.missions.map((m, i) => (
                  <span
                    key={i}
                    className="rounded-md border border-[#ffb703]/35 bg-[#ffb703]/10 px-2 py-1 text-[11px] text-[#ffe199]"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-2 gap-3">
              <StatBox icon={Gauge} label="Kecepatan Maksimum" value={unit.specs.maxSpeed} />
              <StatBox icon={Compass} label="Daya Jelajah / Range" value={unit.specs.range} />
              <StatBox icon={Mountain} label="Ketinggian / Dimensi" value={unit.specs.ceiling} />
              <StatBox icon={Crosshair} label="Persenjataan / Kapasitas" value={unit.specs.armament} />
            </div>
          </div>

          {/* Infografis 10 Komponen Pesawat & Fungsinya */}
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-display text-sm sm:text-base font-bold tracking-[0.16em] text-[#ffb703] uppercase">
                <MapPin className="h-4 w-4" />
                ANATOMI {unit.hotspots.length} KOMPONEN UTAMA & FUNGSINYA
              </h3>
              <span className="text-[11px] text-slate-300">
                Klik salah satu komponen untuk langsung melihat posisinya di model 3D
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {unit.hotspots.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => {
                    closeInfographic();
                    focusHotspot(h.id);
                  }}
                  className="group flex items-start gap-3 rounded-xl border border-[#4da6ff]/30 bg-[#0b2349]/80 p-3.5 text-left transition-all hover:border-[#ffb703] hover:bg-[#113366] cursor-pointer"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#4da6ff]/70 bg-[#4da6ff]/20 font-display text-sm font-bold text-[#75bcff] group-hover:border-[#ffb703] group-hover:bg-[#ffb703] group-hover:text-[#0a1e3c] transition-colors">
                    {h.id}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-display text-sm font-bold tracking-wide text-white group-hover:text-[#ffb703] transition-colors">
                        {h.name}
                      </h4>
                      {h.partType && (
                        <span
                          className={`rounded px-1.5 py-0.5 font-display text-[9px] font-bold tracking-wider uppercase ${
                            h.partType === 'Sistem Internal'
                              ? 'border border-cyan-300/50 bg-cyan-400/15 text-cyan-200'
                              : h.partType === 'Senjata'
                                ? 'border border-rose-400/50 bg-rose-500/15 text-rose-200'
                                : 'border border-[#4da6ff]/40 bg-[#4da6ff]/15 text-[#75bcff]'
                          }`}
                        >
                          {h.partType}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-300">{h.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Sistem Pendukung Keselamatan & Kehidupan (Ejection Seat, Oksigen OBOGS, ECS, Hidrolik) */}
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-display text-sm sm:text-base font-bold tracking-[0.16em] text-cyan-300 uppercase">
                <Shield className="h-4 w-4" />
                SISTEM PENDUKUNG KESELAMATAN & KEHIDUPAN PESAWAT
              </h3>
              <span className="text-[11px] text-slate-300">
                Ejection Seat • Oksigen OBOGS • Tekanan Kabin (ECS) • Kontrol Terbang
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {getSupportSystems(unit.id, unit.category).map((sys, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-cyan-400/30 bg-[#082042]/85 p-3.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <h4 className="font-display text-sm font-bold tracking-wide text-white">{sys.title}</h4>
                    <span className="rounded border border-cyan-300/45 bg-cyan-400/15 px-1.5 py-0.5 font-display text-[9px] font-bold tracking-wider text-cyan-200 uppercase">
                      {sys.tag}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{sys.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Sejarah Operasional & Keunggulan Taktis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-[#4da6ff]/30 bg-[#0a2145]/75 p-4">
              <h3 className="flex items-center gap-1.5 font-display text-xs font-bold tracking-[0.16em] text-[#4da6ff] uppercase">
                <Shield className="h-4 w-4" />
                SKADRON & SEJARAH OPERASIONAL TNI AU
              </h3>
              <p className="mt-2 text-xs sm:text-[13px] leading-relaxed text-slate-200">
                {unit.history.operational}
              </p>
            </div>
            <div className="rounded-xl border border-[#ffb703]/35 bg-[#1a2238]/75 p-4">
              <h3 className="flex items-center gap-1.5 font-display text-xs font-bold tracking-[0.16em] text-[#ffb703] uppercase">
                <Target className="h-4 w-4" />
                KEUNGGULAN TAKTIS & TEKNOLOGI
              </h3>
              <p className="mt-2 text-xs sm:text-[13px] leading-relaxed text-slate-200">
                {unit.history.tactical}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Modal */}
        <div className="flex items-center justify-between border-t border-[#4da6ff]/25 bg-[#091c3a]/90 px-4 py-2.5 sm:px-6 text-xs text-slate-300">
          <span>Hanggar Virtual Pesawat TNI AU • Infografis Edukasi 3D</span>
          <button
            type="button"
            onClick={closeInfographic}
            className="rounded-lg border border-[#4da6ff]/50 bg-[#4da6ff]/20 px-4 py-1.5 font-display text-xs font-bold tracking-widest text-[#75bcff] uppercase hover:bg-[#4da6ff] hover:text-[#0a1e3c] transition-colors cursor-pointer"
          >
            Kembali ke 3D
          </button>
        </div>
      </div>
    </div>
  );
}

function StatBox({ icon: Icon, label, value }: { icon: typeof Gauge; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#4da6ff]/30 bg-[#0b2349]/85 p-3.5 flex flex-col justify-center">
      <div className="flex items-center gap-1.5 text-[#4da6ff]">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="font-display text-[11px] font-bold tracking-[0.14em] uppercase">{label}</span>
      </div>
      <p className="mt-1.5 font-display text-base sm:text-lg font-bold leading-snug text-white">{value}</p>
    </div>
  );
}
