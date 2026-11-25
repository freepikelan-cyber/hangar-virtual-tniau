import { Radio, Volume2, VolumeX } from 'lucide-react';
import { CATEGORY_LABEL } from '../../data/fleetData';
import { useHangarStore, useSelectedUnit } from '../../store/useHangarStore';
import { aircraftAudio } from '../../utils/aircraftAudio';
import { TniAuLogo3D } from './TniAuLogo3D';

export function TopHeader() {
  const unit = useSelectedUnit();
  const openWelcome = useHangarStore((s) => s.openWelcome);
  const soundEnabled = useHangarStore((s) => s.soundEnabled);
  const toggle = useHangarStore((s) => s.toggle);

  return (
    <header className="pointer-events-none fixed top-0 left-0 right-0 z-30 flex items-start justify-between gap-2 sm:gap-3 px-2.5 sm:px-4 pt-2 sm:pt-3">
      {/* Header Kiri Atas: Logo 3D Resmi TNI AU (Swa Bhuwana Paksa) + Judul Ringkas */}
      <div className="hud-panel pointer-events-auto flex w-full md:w-auto md:max-w-[54vw] items-center gap-2 sm:gap-2.5 rounded-xl px-2.5 sm:px-3 py-1.5">
        <button
          type="button"
          onClick={openWelcome}
          title="Kembali ke Halaman Awal"
          className="relative flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg border border-[#ffb703]/35 bg-[#0c264d]/60 p-1 hover:border-[#ffb703] transition-colors cursor-pointer"
        >
          <TniAuLogo3D className="h-full w-full" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[9px] sm:text-[10px] font-semibold tracking-[0.14em] sm:tracking-[0.16em] text-[#4da6ff] uppercase truncate">
            TNI ANGKATAN UDARA • EDUKASI DIRGANTARA 3D
          </p>
          <h1 className="font-display text-xs sm:text-sm lg:text-base font-bold tracking-[0.05em] sm:tracking-[0.07em] text-white uppercase leading-tight truncate">
            HANGAR VIRTUAL PESAWAT TNI AU 3D
          </h1>
          {/* Ringkasan Unit Aktif khusus layar HP (< md) */}
          <div className="mt-0.5 flex md:hidden items-center gap-1.5 text-[10px] text-slate-300 truncate">
            <Radio className="h-3 w-3 shrink-0 text-[#4da6ff] animate-pulse" />
            <span className="font-display font-bold text-white uppercase truncate">{unit.name}</span>
            <span className="rounded border border-[#ffb703]/50 bg-[#ffb703]/15 px-1.5 py-0.2 font-display text-[9px] font-bold text-[#ffb703] uppercase shrink-0">
              {unit.tailNumber}
            </span>
          </div>
        </div>

        {/* Ikon Sound ringkas (mobile & desktop) */}
        <button
          type="button"
          onClick={() => {
            aircraftAudio.unlock();
            toggle('soundEnabled');
          }}
          aria-label={soundEnabled ? 'Matikan Suara' : 'Aktifkan Suara'}
          title={soundEnabled ? 'Suara Aktif (Klik untuk Mute)' : 'Suara Mati (Klik untuk Aktifkan)'}
          className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full border transition-all cursor-pointer active:scale-95 ${
            soundEnabled
              ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
              : 'border-slate-600/70 bg-[#0c2448]/80 text-slate-400 hover:border-slate-400 hover:text-white'
          }`}
        >
          {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
      </div>

      {/* Header Kanan Atas: Telemetri Unit Aktif & Kategori (Tablet/Desktop/Smartboard) */}
      <div className="hud-panel pointer-events-auto hidden md:flex items-center gap-4 rounded-xl px-4 py-2.5">
        <div className="flex flex-col items-end">
          <span className="flex items-center gap-1.5 font-display text-[11px] font-semibold tracking-[0.18em] text-[#4da6ff]/85 uppercase">
            <Radio className="h-3.5 w-3.5 text-[#4da6ff] animate-pulse" />
            UNIT AKTIF
          </span>
          <span className="font-display text-lg font-bold tracking-wider text-white uppercase leading-tight">
            {unit.name}
          </span>
          <span className="text-[11px] text-slate-300/90 max-w-[240px] truncate">
            {unit.code} • {unit.origin}
          </span>
        </div>

        <div className="h-10 w-px bg-[#4da6ff]/30" />

        <div className="flex flex-col items-end">
          <span className="font-display text-[11px] font-semibold tracking-[0.18em] text-slate-400 uppercase">
            KATEGORI
          </span>
          <span className="mt-0.5 rounded-md border border-[#ffb703]/60 bg-[#ffb703]/15 px-2.5 py-0.5 font-display text-sm font-bold tracking-[0.14em] text-[#ffb703] uppercase">
            {CATEGORY_LABEL[unit.category]}
          </span>
          <span className="mt-0.5 font-display text-xs tracking-widest text-[#4da6ff]/90">
            {unit.tailNumber}
          </span>
        </div>
      </div>
    </header>
  );
}
