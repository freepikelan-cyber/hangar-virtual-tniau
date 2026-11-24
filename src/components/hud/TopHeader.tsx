import { Radio } from 'lucide-react';
import { CATEGORY_LABEL } from '../../data/fleetData';
import { useSelectedUnit } from '../../store/useHangarStore';

export function TopHeader() {
  const unit = useSelectedUnit();

  return (
    <header className="pointer-events-none fixed top-0 left-0 right-0 z-30 flex items-start justify-between gap-2 sm:gap-3 px-2.5 sm:px-4 pt-2 sm:pt-3">
      {/* Header Kiri Atas: Logo Resmi TNI AU (Swa Bhuwana Paksa) + Judul */}
      <div className="hud-panel pointer-events-auto flex w-full md:w-auto md:max-w-[62vw] items-center gap-2.5 sm:gap-3 rounded-xl px-2.5 sm:px-4 py-1.5 sm:py-2">
        <div className="relative flex h-10 w-10 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-lg border border-[#ffb703]/40 bg-[#0c264d]/85 p-1 shadow-[0_0_16px_rgba(255,183,3,0.22)]">
          <img
            src="/logo-tniau.png"
            alt="Logo Resmi TNI AU Swa Bhuwana Paksa"
            className="h-full w-full object-contain drop-shadow-[0_0_6px_rgba(255,183,3,0.35)]"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[10px] sm:text-xs font-semibold tracking-[0.16em] sm:tracking-[0.2em] text-[#4da6ff] uppercase truncate">
            TNI ANGKATAN UDARA • EDUKASI DIRGANTARA 3D
          </p>
          <h1 className="font-display text-sm sm:text-xl lg:text-2xl font-bold tracking-[0.06em] sm:tracking-[0.08em] text-white uppercase leading-tight truncate">
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
