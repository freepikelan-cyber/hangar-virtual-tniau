import { RotateCcw, ShieldAlert, X } from 'lucide-react';
import { useHangarStore, useSelectedUnit } from '../../store/useHangarStore';

interface StoryChapter {
  short: string;
  title: string;
  desc: string;
}

const FIGHTER_STORY: StoryChapter[] = [
  {
    short: '1. Manuver',
    title: 'Patroli & Manuver Tempur Udara',
    desc: 'Pesawat tempur melakukan manuver mengelak di ketinggian. Pilot TNI AU terlihat siap siaga di dalam kokpit.',
  },
  {
    short: '2. Tertembak',
    title: 'Peringatan! Rudal Menghantam Mesin',
    desc: 'Rudal musuh mengenai bagian ekor & mesin! Api dan asap hitam keluar, pesawat oleng tak terkendali (MAYDAY!).',
  },
  {
    short: '3. Eject Seat',
    title: 'Canopy Jettison & Kursi Lontar Aktif',
    desc: 'Kanopi kokpit meledak lepas, roket kursi lontar Zero-Zero melontarkan pilot keluar menjauhi pesawat yang terbakar.',
  },
  {
    short: '4. Parasut',
    title: 'Parasut Mengembang — Pilot Selamat',
    desc: 'Kursi terlepas otomatis, parasut utama oranye-putih mengembang penuh dan suar sinyal SAR memancar.',
  },
];

const TRANSPORT_STORY: StoryChapter[] = [
  {
    short: '1. Darurat',
    title: 'Gangguan Mesin di Atas Lautan',
    desc: 'Mesin mengeluarkan asap saat melintasi perairan. Pilot menyatakan MAYDAY dan bersiap pendaratan darurat di laut.',
  },
  {
    short: '2. Ditching',
    title: 'Pendaratan Darurat di Laut (Water Ditching)',
    desc: 'Pesawat turun perlahan menyentuh permukaan laut berombak dengan cipratan air, lalu mengapung stabil.',
  },
  {
    short: '3. Life Raft',
    title: 'Perosotan & Perahu Karet Mengembang',
    desc: 'Pintu darurat terbuka otomatis, seluncuran evakuasi dan perahu karet (Life Raft) mengembang di atas air.',
  },
  {
    short: '4. SAR Aktif',
    title: 'Kru Aman di Rakit & Suar Asap SAR',
    desc: 'Kru berjaket pelampung oranye mengevakuasi diri ke perahu karet, suar asap oranye & beacon ELT memanggil tim SAR.',
  },
];

const HELI_STORY: StoryChapter[] = [
  {
    short: '1. Autorotasi',
    title: 'Kegagalan Turbin di Atas Laut',
    desc: 'Helikopter mengalami gangguan mesin di atas samudra. Pilot melakukan manuver autorotasi turun terkendali.',
  },
  {
    short: '2. Pelampung',
    title: 'Emergency Floats (CO2) Mengembang',
    desc: 'Tabung gas CO2 memompa 4 kantung pelampung darurat kuning-oranye di sisi bawah bodi helikopter sebelum menyentuh air.',
  },
  {
    short: '3. Mengapung',
    title: 'Mendarat & Mengapung Aman di Ombak',
    desc: 'Helikopter mendarat di permukaan laut dengan aman dan mengapung stabil tanpa tenggelam berkat pelampung darurat.',
  },
  {
    short: '4. Evakuasi',
    title: 'Perahu Karet & Sinyal Suar SAR Aktif',
    desc: 'Life Raft mengembang di samping helikopter dengan kru berjaket pelampung serta suar asap oranye untuk tim SAR.',
  },
];

export function SafetyStoryPanel() {
  const unit = useSelectedUnit();
  const safetyMode = useHangarStore((s) => s.safetyMode);
  const safetyStep = useHangarStore((s) => s.safetyStep);
  const toggle = useHangarStore((s) => s.toggle);
  const replaySafety = useHangarStore((s) => s.replaySafety);

  const isEquipment = unit.id === 'gsuit' || unit.id === 'pilot-helmet';
  if (!safetyMode || isEquipment) return null;

  const isFighter = unit.category === 'Tempur' || unit.category === 'Latih';
  const isHeli = unit.category === 'Helikopter';
  const story = isFighter ? FIGHTER_STORY : isHeli ? HELI_STORY : TRANSPORT_STORY;
  const current = story[Math.min(story.length - 1, Math.max(0, safetyStep))];

  const headerTitle = isFighter
    ? 'SIMULASI SAFETY TEMPUR • EJECTION SEAT'
    : isHeli
      ? 'SIMULASI SAFETY LAUT • EMERGENCY FLOATS'
      : 'SIMULASI SAFETY LAUT • WATER DITCHING';

  return (
    <aside
      aria-label="Cerita Simulasi Safety 3D"
      className="pointer-events-none fixed top-[74px] sm:top-[84px] right-2.5 sm:right-4 z-30 lg:z-20 flex items-start"
    >
      <div className="hud-panel pointer-events-auto w-[min(320px,calc(100vw-1.25rem))] lg:w-[310px] xl:w-[340px] rounded-xl border-rose-400/55 bg-[#081933]/92 px-3.5 py-3 shadow-[0_12px_32px_rgba(2,10,28,0.85)] space-y-2.5 animate-slidein">
        <div className="flex items-start justify-between gap-2 border-b border-rose-400/20 pb-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-rose-300 font-display text-[10px] sm:text-[11px] font-bold tracking-[0.14em] uppercase">
              <ShieldAlert className="h-3.5 w-3.5 text-rose-400 shrink-0" />
              <span className="truncate">{headerTitle}</span>
            </div>
            <div className="mt-0.5 font-display text-sm font-bold text-white truncate">{unit.name}</div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={replaySafety}
              title="Ulangi Cerita Simulasi"
              className="inline-flex items-center gap-1 rounded-md border border-[#4da6ff]/50 bg-[#0e2a54] px-2 py-1 font-display text-[10px] font-bold tracking-wider text-[#75bcff] uppercase hover:bg-[#4da6ff]/20 cursor-pointer active:scale-95"
            >
              <RotateCcw className="h-3 w-3" />
              Ulangi
            </button>
            <button
              type="button"
              onClick={() => toggle('safetyMode')}
              title="Tutup Simulasi Safety"
              className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-700 bg-[#0e2a54] text-slate-300 hover:text-white cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* 4 Babak Cerita (vertikal ringkas di panel kanan agar area 3D tengah 100% bebas!) */}
        <div className="space-y-1.5">
          {story.map((ch, idx) => {
            const active = idx === safetyStep;
            const done = idx < safetyStep;
            return (
              <div
                key={ch.short}
                className={`rounded-lg border px-2.5 py-1.5 transition-all ${
                  active
                    ? 'border-[#ffb703] bg-[#ffb703]/15'
                    : done
                      ? 'border-emerald-400/35 bg-emerald-500/10'
                      : 'border-slate-700/60 bg-slate-900/40 opacity-65'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`font-display text-[10px] font-bold tracking-wider uppercase ${
                      active ? 'text-[#ffb703]' : done ? 'text-emerald-300' : 'text-slate-400'
                    }`}
                  >
                    {ch.short}
                  </span>
                  {active && (
                    <span className="rounded bg-[#ffb703]/25 px-1.5 py-0.5 font-display text-[9px] font-bold tracking-wider text-[#ffb703] uppercase">
                      AKTIF
                    </span>
                  )}
                </div>
                {active && (
                  <>
                    <div className="font-display text-xs font-bold text-white mt-0.5 leading-snug">
                      {current.title}
                    </div>
                    <p className="text-[11px] text-slate-200 leading-snug mt-0.5">{current.desc}</p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
