import { RotateCcw, ShieldAlert } from 'lucide-react';
import { useHangarStore, useSelectedUnit } from '../../store/useHangarStore';

interface StoryChapter {
  short: string;
  title: string;
  desc: string;
}

const FIGHTER_STORY: StoryChapter[] = [
  {
    short: 'Tahap 1/4: Manuver',
    title: 'Patroli & Manuver Tempur Udara',
    desc: 'Pesawat tempur melakukan manuver mengelak di ketinggian. Pilot TNI AU terlihat siap siaga di dalam kokpit.',
  },
  {
    short: 'Tahap 2/4: Tertembak',
    title: 'Peringatan! Rudal Menghantam Mesin',
    desc: 'Rudal musuh mengenai bagian ekor & mesin! Api dan asap hitam keluar, pesawat oleng tak terkendali (MAYDAY!).',
  },
  {
    short: 'Tahap 3/4: Eject Seat',
    title: 'Canopy Jettison & Kursi Lontar Aktif',
    desc: 'Kanopi kokpit meledak lepas, roket kursi lontar Zero-Zero melontarkan pilot keluar menjauhi pesawat yang terbakar.',
  },
  {
    short: 'Tahap 4/4: Parasut',
    title: 'Parasut Mengembang — Pilot Selamat',
    desc: 'Kursi terlepas otomatis, parasut utama oranye-putih mengembang penuh dan suar sinyal SAR memancar.',
  },
];

const TRANSPORT_STORY: StoryChapter[] = [
  {
    short: 'Tahap 1/4: Darurat',
    title: 'Gangguan Mesin di Atas Lautan',
    desc: 'Mesin mengeluarkan asap saat melintasi perairan. Pilot menyatakan MAYDAY dan bersiap pendaratan darurat di laut.',
  },
  {
    short: 'Tahap 2/4: Ditching',
    title: 'Pendaratan Darurat di Laut (Water Ditching)',
    desc: 'Pesawat turun perlahan menyentuh permukaan laut berombak dengan cipratan air, lalu mengapung stabil.',
  },
  {
    short: 'Tahap 3/4: Life Raft',
    title: 'Perosotan & Perahu Karet Mengembang',
    desc: 'Pintu darurat terbuka otomatis, seluncuran evakuasi dan perahu karet (Life Raft) mengembang di atas air.',
  },
  {
    short: 'Tahap 4/4: SAR Aktif',
    title: 'Kru Aman di Rakit & Suar Asap SAR',
    desc: 'Kru berjaket pelampung oranye mengevakuasi diri ke perahu karet, suar asap oranye & beacon ELT memanggil tim SAR.',
  },
];

const HELI_STORY: StoryChapter[] = [
  {
    short: 'Tahap 1/4: Autorotasi',
    title: 'Kegagalan Turbin di Atas Laut',
    desc: 'Helikopter mengalami gangguan mesin di atas samudra. Pilot melakukan manuver autorotasi turun terkendali.',
  },
  {
    short: 'Tahap 2/4: Pelampung',
    title: 'Emergency Floats (CO2) Mengembang',
    desc: 'Tabung gas CO2 memompa 4 kantung pelampung darurat kuning-oranye di sisi bawah bodi helikopter sebelum menyentuh air.',
  },
  {
    short: 'Tahap 3/4: Mengapung',
    title: 'Mendarat & Mengapung Aman di Ombak',
    desc: 'Helikopter mendarat di permukaan laut dengan aman dan mengapung stabil tanpa tenggelam berkat pelampung darurat.',
  },
  {
    short: 'Tahap 4/4: Evakuasi',
    title: 'Perahu Karet & Sinyal Suar SAR Aktif',
    desc: 'Life Raft mengembang di samping helikopter dengan kru berjaket pelampung serta suar asap oranye untuk tim SAR.',
  },
];

export function SafetyStoryPanel() {
  const unit = useSelectedUnit();
  const safetyMode = useHangarStore((s) => s.safetyMode);
  const safetyStep = useHangarStore((s) => s.safetyStep);
  const replaySafety = useHangarStore((s) => s.replaySafety);

  const isEquipment = unit.id === 'gsuit' || unit.id === 'pilot-helmet';
  if (!safetyMode || isEquipment) return null;

  const isFighter = unit.category === 'Tempur' || unit.category === 'Latih';
  const isHeli = unit.category === 'Helikopter';
  const story = isFighter ? FIGHTER_STORY : isHeli ? HELI_STORY : TRANSPORT_STORY;
  const idx = Math.min(story.length - 1, Math.max(0, safetyStep));
  const current = story[idx] ?? story[0];
  const pct = ((idx + 1) / story.length) * 100;

  const modeTag = isFighter ? 'Ejection Seat' : isHeli ? 'Emergency Floats' : 'Water Ditching';

  return (
    <div
      aria-label="Subtitle Simulasi Safety 3D"
      className="pointer-events-none fixed bottom-14 sm:bottom-16 left-1/2 z-25 flex w-[min(700px,calc(100vw-1.5rem))] -translate-x-1/2 flex-col items-center text-center animate-slidein"
    >
      {/* Baris 1: Status Tahap Safety, Progress Tipis, & Tombol Ulangi Ringkas Tanpa Kotak */}
      <div
        className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-0.5 font-display text-[10px] sm:text-xs font-bold tracking-[0.14em] uppercase"
        style={{ textShadow: '0 2px 8px rgba(0,0,0,1), 0 0 4px rgba(0,0,0,0.95)' }}
      >
        <span className="inline-flex items-center gap-1 text-rose-300">
          <ShieldAlert className="h-3.5 w-3.5 text-rose-400 shrink-0" />
          {current.short}
        </span>
        <span className="text-slate-300/80">•</span>
        <span className="text-[#ffb703]">
          {modeTag} ({unit.name})
        </span>
        <span className="inline-block h-1.5 w-14 sm:w-18 overflow-hidden rounded-full bg-black/55 align-middle">
          <span
            className="block h-full rounded-full bg-gradient-to-r from-rose-400 via-[#ffb703] to-emerald-400 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </span>
        <button
          type="button"
          onClick={replaySafety}
          title="Ulangi Simulasi Safety"
          className="pointer-events-auto inline-flex items-center gap-1 text-cyan-300 hover:text-white cursor-pointer active:scale-95 transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          Ulangi
        </button>
      </div>

      {/* Baris 2: Subtitle Penjelasan Safety Jelas Tanpa Kotak */}
      <p
        className="mt-1 text-xs sm:text-sm font-semibold leading-snug text-white"
        style={{ textShadow: '0 2px 10px rgba(0,0,0,1), 0 0 5px rgba(0,0,0,0.98)' }}
      >
        {current.title} — {current.desc}
      </p>
    </div>
  );
}
