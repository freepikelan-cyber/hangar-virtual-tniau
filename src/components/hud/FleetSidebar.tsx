import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Search, X } from 'lucide-react';
import { CATEGORIES, FLEET, type AircraftCategory } from '../../data/fleetData';
import { filterFleet, useHangarStore } from '../../store/useHangarStore';
import { getCachedAircraftThumbnail, requestAircraftThumbnail } from '../../utils/aircraftSnapshot';

function CategorySilhouette({ category, active }: { category: AircraftCategory; active: boolean }) {
  const color = active ? '#4da6ff' : '#94a3b8';
  if (category === 'G-Suit & Pilot') {
    return (
      <svg viewBox="0 0 40 24" className="h-6 w-9 shrink-0" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="20" cy="8" r="5" fill={active ? 'rgba(77,166,255,0.22)' : 'none'} />
        <path d="M16 8 h8" />
        <path d="M12 21 c0-4.5 3.2-7 8-7 s8 2.5 8 7" fill={active ? 'rgba(77,166,255,0.16)' : 'none'} />
      </svg>
    );
  }
  if (category === 'Helikopter') {
    return (
      <svg viewBox="0 0 40 24" className="h-6 w-9 shrink-0" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="6" y1="5" x2="32" y2="5" />
        <line x1="19" y1="5" x2="19" y2="9" />
        <path d="M12 10 h13 c4 0 7 2 7 5 c0 2-2 3-5 3 H13 c-2 0-3-1-3-3 v-2 c0-2 1-3 2-3 z" fill={active ? 'rgba(77,166,255,0.2)' : 'none'} />
        <line x1="10" y1="13" x2="3" y2="11" />
        <line x1="3" y1="8" x2="3" y2="14" />
        <line x1="14" y1="20" x2="28" y2="20" />
      </svg>
    );
  }
  if (category === 'Angkut & VIP') {
    return (
      <svg viewBox="0 0 40 24" className="h-6 w-9 shrink-0" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 13 L11 11 L17 4 L21 4 L19 11 L32 11 L37 13 L32 15 L19 15 L21 21 L17 21 L11 15 Z" fill={active ? 'rgba(77,166,255,0.2)' : 'none'} />
      </svg>
    );
  }
  if (category === 'Latih') {
    return (
      <svg viewBox="0 0 40 24" className="h-6 w-9 shrink-0" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12 L10 11 L19 5 L22 5 L21 11 L34 12 L21 13 L22 19 L19 19 L10 13 Z" fill={active ? 'rgba(77,166,255,0.2)' : 'none'} />
        <line x1="36" y1="8" x2="36" y2="16" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 40 24" className="h-6 w-9 shrink-0" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12 L9 10 L18 3 L23 10 L37 12 L23 14 L18 21 L9 14 Z" fill={active ? 'rgba(77,166,255,0.22)' : 'none'} />
    </svg>
  );
}

/** Thumbnail foto 3D nyata tiap pesawat (dirender malas 1 per frame saat kartu terlihat agar tetap 60 FPS). */
function AircraftThumbnail({
  unitId,
  name,
  category,
  active,
}: {
  unitId: string;
  name: string;
  category: AircraftCategory;
  active: boolean;
}) {
  const [src, setSrc] = useState<string | null>(() => getCachedAircraftThumbnail(unitId));
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cached = getCachedAircraftThumbnail(unitId);
    if (cached) {
      setSrc(cached);
      return;
    }
    const el = boxRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      return requestAircraftThumbnail(unitId, setSrc);
    }
    let cancelReq: (() => void) | null = null;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          obs.disconnect();
          cancelReq = requestAircraftThumbnail(unitId, setSrc);
        }
      },
      { rootMargin: '120px' },
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      if (cancelReq) cancelReq();
    };
  }, [unitId]);

  return (
    <div
      ref={boxRef}
      className={`relative flex h-12 w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-lg border ${
        active
          ? 'border-[#4da6ff]/70 bg-gradient-to-br from-[#0e2d5c] via-[#091d3d] to-[#061226]'
          : 'border-slate-700/80 bg-gradient-to-br from-[#0b2144] via-[#071630] to-[#040d1d]'
      }`}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          loading="lazy"
          draggable={false}
          className="h-full w-full object-contain p-0.5 drop-shadow-[0_2px_6px_rgba(0,0,0,0.65)]"
        />
      ) : (
        <CategorySilhouette category={category} active={active} />
      )}
    </div>
  );
}

export function FleetSidebar() {
  const leftOpen = useHangarStore((s) => s.leftOpen);
  const toggleLeft = useHangarStore((s) => s.toggleLeft);
  const selectedId = useHangarStore((s) => s.selectedId);
  const selectAircraft = useHangarStore((s) => s.selectAircraft);
  const search = useHangarStore((s) => s.search);
  const setSearch = useHangarStore((s) => s.setSearch);
  const category = useHangarStore((s) => s.category);
  const setCategory = useHangarStore((s) => s.setCategory);

  const items = filterFleet(search, category);

  return (
    <aside
      className={`pointer-events-none fixed top-[74px] sm:top-[84px] bottom-[102px] sm:bottom-[112px] left-2.5 sm:left-4 flex items-start gap-2 ${
        leftOpen ? 'z-30 lg:z-20' : 'z-20'
      }`}
    >
      {leftOpen && (
        <div className="hud-panel pointer-events-auto flex h-full w-[min(320px,calc(100vw-1.25rem))] lg:w-[290px] xl:w-[320px] flex-col rounded-xl overflow-hidden animate-slidein">
          {/* Header Katalog */}
          <div className="flex items-center justify-between border-b border-[#4da6ff]/25 px-3.5 py-2.5">
            <div>
              <h2 className="font-display text-sm font-bold tracking-[0.16em] text-[#4da6ff] uppercase">
                PILIH ARMADA
              </h2>
              <p className="text-[11px] text-slate-400">{items.length} dari {FLEET.length} unit Alutsista</p>
            </div>
            <button
              type="button"
              onClick={toggleLeft}
              aria-label="Sembunyikan Katalog Armada"
              title="Sembunyikan Panel Kiri"
              className="hud-btn h-12 w-12 border-[#4da6ff]/30 bg-[#103060]/70 text-[#4da6ff] hover:bg-[#4da6ff]/20"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          </div>

          {/* Pencarian Real-time */}
          <div className="px-3 pt-3">
            <div className="relative flex items-center">
              <Search className="pointer-events-none absolute left-3 h-4 w-4 text-[#4da6ff]/70" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari pesawat, kode, peran..."
                className="h-12 w-full rounded-lg border border-[#4da6ff]/30 bg-[#091b38]/80 pl-9 pr-10 text-sm text-white placeholder-slate-400 outline-none focus:border-[#4da6ff] focus:shadow-glow"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Hapus pencarian"
                  className="absolute right-1.5 flex h-9 w-9 items-center justify-center rounded-md text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Tab Kategori */}
          <div className="flex flex-wrap gap-2 px-3 py-2.5 border-b border-[#4da6ff]/20">
            {CATEGORIES.map((cat) => {
              const active = category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`min-h-[36px] rounded-md border px-2.5 py-1 font-display text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer ${
                    active
                      ? 'border-[#4da6ff] bg-[#4da6ff]/20 text-[#4da6ff] shadow-[0_0_12px_rgba(77,166,255,0.28)]'
                      : 'border-slate-700/80 bg-[#0e2a54]/70 text-slate-300 hover:border-[#4da6ff]/50 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Daftar Kartu Armada */}
          <div className="hud-scroll flex-1 space-y-2 overflow-y-auto p-3">
            {items.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-700 p-5 text-center text-xs text-slate-400">
                Tidak ada armada yang cocok dengan pencarian Anda.
              </div>
            ) : (
              items.map((unit) => {
                const active = unit.id === selectedId;
                return (
                  <button
                    key={unit.id}
                    type="button"
                    onClick={() => selectAircraft(unit.id)}
                    className={`w-full min-h-[68px] flex items-center gap-3 rounded-xl border p-3 text-left transition-all cursor-pointer ${
                      active
                        ? 'border-[#4da6ff] bg-[#4da6ff]/15 shadow-[0_0_18px_rgba(77,166,255,0.22)]'
                        : 'border-slate-700/60 bg-[#0e2a54]/60 hover:border-[#4da6ff]/50 hover:bg-[#13376e]/80'
                    }`}
                  >
                    <AircraftThumbnail unitId={unit.id} name={unit.name} category={unit.category} active={active} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className={`font-display text-sm font-bold tracking-wide truncate ${active ? 'text-white' : 'text-slate-100'}`}>
                          {unit.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        {unit.code} • {unit.origin}
                      </p>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="font-display text-[10px] font-semibold tracking-widest text-[#ffb703] uppercase">
                          {unit.tailNumber}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded border border-[#4da6ff]/40 bg-[#4da6ff]/10 px-1.5 py-0.5 font-display text-[10px] font-bold tracking-wider text-[#4da6ff]">
                          <MapPin className="h-2.5 w-2.5" />
                          {unit.hotspots.length} PIN
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {!leftOpen && (
        <button
          type="button"
          onClick={toggleLeft}
          aria-label="Tampilkan Katalog Armada"
          title="Buka Katalog Armada"
          className="hud-panel hud-btn pointer-events-auto h-12 px-3 gap-1.5 text-[#4da6ff] hover:bg-[#4da6ff]/20"
        >
          <ChevronRight className="h-5 w-5" />
          <span className="font-display text-xs font-bold tracking-widest uppercase">Pilih Armada</span>
        </button>
      )}
    </aside>
  );
}
