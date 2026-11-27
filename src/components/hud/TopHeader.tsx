import { useEffect, useRef, useState } from 'react';
import { Info, LogOut, Mail, Moon, Music, Phone, Power, Radio, Settings, Sun, Sunset, Tv, Volume2, VolumeX, X } from 'lucide-react';
import { CATEGORY_LABEL } from '../../data/fleetData';
import { useHangarStore, useSelectedUnit, type TimeOfDay } from '../../store/useHangarStore';
import { aircraftAudio } from '../../utils/aircraftAudio';
import { bgmPlayer } from '../../utils/bgmPlayer';
import { TniAuLogo3D } from './TniAuLogo3D';

export function TopHeader() {
  const unit = useSelectedUnit();
  const soundEnabled = useHangarStore((s) => s.soundEnabled);
  const bgmEnabled = useHangarStore((s) => s.bgmEnabled);
  const bgmVolume = useHangarStore((s) => s.bgmVolume);
  const flightMode = useHangarStore((s) => s.flightMode);
  const safetyMode = useHangarStore((s) => s.safetyMode);
  const timeOfDay = useHangarStore((s) => s.timeOfDay);
  const showcaseMode = useHangarStore((s) => s.showcaseMode);
  const toggle = useHangarStore((s) => s.toggle);
  const setTimeOfDay = useHangarStore((s) => s.setTimeOfDay);
  const setBgmVolume = useHangarStore((s) => s.setBgmVolume);
  const toggleShowcase = useHangarStore((s) => s.toggleShowcase);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [devInfoOpen, setDevInfoOpen] = useState(false);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [webExitNotice, setWebExitNotice] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleConfirmExit = () => {
    aircraftAudio.stop();
    bgmPlayer.unlockAndSync(false);
    const androidBridge = (window as unknown as { AndroidApp?: { exitApp?: () => void } }).AndroidApp;
    if (androidBridge?.exitApp) {
      androidBridge.exitApp();
      return;
    }
    window.close();
    setExitConfirmOpen(false);
    setWebExitNotice(true);
    window.setTimeout(() => setWebExitNotice(false), 3500);
  };

  // Tutup panel pengaturan jika klik di luar area menu
  useEffect(() => {
    if (!settingsOpen) return;
    const onDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [settingsOpen]);

  const timeOptions: { id: TimeOfDay; label: string; icon: typeof Sun }[] = [
    { id: 'day', label: 'Siang', icon: Sun },
    { id: 'sunset', label: 'Senja', icon: Sunset },
    { id: 'night', label: 'Malam', icon: Moon },
  ];

  const volumePercent = Math.round(bgmVolume * 100);

  return (
    <header className="app-top-header pointer-events-none fixed top-0 left-0 right-0 z-30 flex items-start justify-between gap-2 sm:gap-3 px-2.5 sm:px-4 pt-2 sm:pt-3">
      {/* Header Kiri Atas: Tombol Pengaturan + Logo 3D TNI AU + Judul Ringkas */}
      <div ref={menuRef} className="relative pointer-events-auto w-full md:w-auto md:max-w-[54vw]">
        <div className="hud-panel flex items-center gap-1.5 sm:gap-2 rounded-xl px-2 sm:px-3 py-1.5">
          {/* Tombol Keluar Aplikasi */}
          <button
            type="button"
            onClick={() => {
              setSettingsOpen(false);
              setDevInfoOpen(false);
              setExitConfirmOpen(true);
            }}
            aria-label="Keluar Aplikasi"
            title="Keluar dari Aplikasi"
            className="flex h-9 sm:h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-rose-500/50 bg-rose-500/15 px-2.5 font-display text-xs font-bold tracking-wider text-rose-300 uppercase hover:bg-rose-500/30 hover:border-rose-400 hover:text-white transition-all cursor-pointer active:scale-95"
          >
            <Power className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Keluar</span>
          </button>

          {/* Tombol Info Pengembang (Pengganti Beranda) */}
          <button
            type="button"
            onClick={() => {
              setSettingsOpen(false);
              setDevInfoOpen(true);
            }}
            aria-label="Info Pengembang"
            title="Info Pengembang Aplikasi"
            className={`flex h-9 sm:h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border px-2.5 font-display text-xs font-bold tracking-wider uppercase transition-all cursor-pointer active:scale-95 ${
              devInfoOpen
                ? 'border-[#ffb703] bg-[#ffb703]/25 text-[#ffb703] shadow-amber'
                : 'border-[#ffb703]/45 bg-[#ffb703]/15 text-[#ffb703] hover:bg-[#ffb703]/25 hover:border-[#ffb703]'
            }`}
          >
            <Info className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Pengembang</span>
          </button>

          {/* Tombol Pengaturan (Kiri Atas) */}
          <button
            type="button"
            onClick={() => setSettingsOpen((v) => !v)}
            aria-expanded={settingsOpen}
            aria-label="Menu Pengaturan"
            title="Pengaturan (Siang/Senja/Malam, Musik & Volume, Efek Suara, Mode Pameran)"
            className={`flex h-9 sm:h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border px-2.5 sm:px-3 font-display text-xs font-bold tracking-wider uppercase transition-all cursor-pointer active:scale-95 ${
              settingsOpen
                ? 'border-[#ffb703] bg-[#ffb703]/20 text-[#ffb703] shadow-amber'
                : 'border-[#4da6ff]/40 bg-[#0c264d]/80 text-slate-200 hover:border-[#4da6ff] hover:text-white'
            }`}
          >
            <Settings className={`h-4 w-4 shrink-0 transition-transform duration-300 ${settingsOpen ? 'rotate-90' : ''}`} />
            <span className="hidden sm:inline">Pengaturan</span>
          </button>

          <div
            className="relative flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg border border-[#ffb703]/35 bg-[#0c264d]/60 p-1"
          >
            <TniAuLogo3D className="h-full w-full" />
          </div>

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
        </div>

        {/* Panel Dropdown Pengaturan di Kiri Atas */}
        {settingsOpen && (
          <div className="hud-panel mt-2 w-[min(310px,calc(100vw-1.25rem))] rounded-xl border-[#4da6ff]/45 bg-[#081933]/96 p-3.5 shadow-[0_18px_48px_rgba(2,8,20,0.88)] animate-slidein space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#4da6ff]/20 pb-2">
              <div className="flex items-center gap-2 text-[#ffb703]">
                <Settings className="h-4 w-4" />
                <span className="font-display text-xs font-bold tracking-[0.16em] uppercase">
                  PENGATURAN APLIKASI
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                aria-label="Tutup Pengaturan"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-700 bg-[#0e2a54] text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* 1. Mode Waktu (Siang / Senja / Malam) */}
            <div className="space-y-1.5">
              <span className="font-display text-[11px] font-bold tracking-[0.14em] text-slate-300 uppercase">
                Waktu &amp; Pencahayaan
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {timeOptions.map((opt) => {
                  const Icon = opt.icon;
                  const active = timeOfDay === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setTimeOfDay(opt.id)}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 font-display text-xs font-bold uppercase transition-all cursor-pointer active:scale-95 ${
                        active
                          ? 'border-[#ffb703] bg-[#ffb703]/20 text-[#ffb703] shadow-amber'
                          : 'border-slate-700/80 bg-[#0e2a54]/80 text-slate-300 hover:border-[#4da6ff]/60 hover:text-white'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Musik Latar Belakang + Pengatur Volume */}
            <div className="rounded-lg border border-[#4da6ff]/25 bg-[#0a2145]/85 p-2.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Music className={`h-4 w-4 ${bgmEnabled ? 'text-[#ffb703]' : 'text-slate-500'}`} />
                  <div>
                    <p className="font-display text-xs font-bold tracking-wider text-white uppercase leading-none">
                      Musik Latar
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-400">Otomatis mati saat simulasi</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !bgmEnabled;
                    toggle('bgmEnabled');
                    bgmPlayer.unlockAndSync(next && flightMode === 'parked' && !safetyMode);
                  }}
                  className={`rounded-md border px-2.5 py-1 font-display text-[11px] font-bold tracking-wider uppercase transition-all cursor-pointer active:scale-95 ${
                    bgmEnabled
                      ? 'border-emerald-400/70 bg-emerald-500/20 text-emerald-300'
                      : 'border-slate-600 bg-slate-800/80 text-slate-400'
                  }`}
                >
                  {bgmEnabled ? 'Nyala' : 'Mati'}
                </button>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-display font-semibold tracking-wider text-slate-300 uppercase">
                  <span>Volume Musik</span>
                  <span className="text-[#ffb703]">{volumePercent}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={volumePercent}
                  disabled={!bgmEnabled}
                  aria-label="Volume Musik Latar"
                  onChange={(e) => {
                    const v = Number(e.target.value) / 100;
                    setBgmVolume(v);
                    bgmPlayer.setVolume(v);
                  }}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-[#ffb703] disabled:opacity-40"
                />
              </div>
            </div>

            {/* 3. Efek Suara Mesin & Radio Kokpit */}
            <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-700/70 bg-[#0a2145]/75 px-2.5 py-2">
              <div className="flex items-center gap-2">
                {soundEnabled ? (
                  <Volume2 className="h-4 w-4 text-emerald-300" />
                ) : (
                  <VolumeX className="h-4 w-4 text-slate-500" />
                )}
                <span className="font-display text-xs font-bold tracking-wider text-white uppercase">
                  Suara Mesin &amp; Radio
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  aircraftAudio.unlock();
                  toggle('soundEnabled');
                }}
                className={`rounded-md border px-2.5 py-1 font-display text-[11px] font-bold tracking-wider uppercase transition-all cursor-pointer active:scale-95 ${
                  soundEnabled
                    ? 'border-emerald-400/70 bg-emerald-500/20 text-emerald-300'
                    : 'border-slate-600 bg-slate-800/80 text-slate-400'
                }`}
              >
                {soundEnabled ? 'Nyala' : 'Mati'}
              </button>
            </div>

            {/* 4. Mode Pameran (Auto-Showcase) */}
            <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-700/70 bg-[#0a2145]/75 px-2.5 py-2">
              <div className="flex items-center gap-2">
                <Tv className={`h-4 w-4 ${showcaseMode ? 'text-[#ffb703]' : 'text-slate-400'}`} />
                <span className="font-display text-xs font-bold tracking-wider text-white uppercase">
                  Mode Pameran
                </span>
              </div>
              <button
                type="button"
                onClick={toggleShowcase}
                className={`rounded-md border px-2.5 py-1 font-display text-[11px] font-bold tracking-wider uppercase transition-all cursor-pointer active:scale-95 ${
                  showcaseMode
                    ? 'border-[#ffb703] bg-[#ffb703]/20 text-[#ffb703]'
                    : 'border-slate-600 bg-slate-800/80 text-slate-400'
                }`}
              >
                {showcaseMode ? 'Aktif' : 'Off'}
              </button>
            </div>
          </div>
        )}
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

      {/* Modal Info Pengembang Aplikasi */}
      {devInfoOpen && (
        <div
          className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-[#040d1e]/80 backdrop-blur-md p-3 sm:p-6"
          onClick={() => setDevInfoOpen(false)}
        >
          <div
            className="hud-panel relative flex max-h-[88dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl border-[#ffb703]/55 bg-[#081933]/98 shadow-[0_20px_60px_rgba(2,8,20,0.9)] animate-slidein"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal Info Pengembang */}
            <div className="flex items-center justify-between gap-2 border-b border-[#4da6ff]/25 bg-[#0b2349]/90 px-4 py-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#ffb703]/50 bg-[#ffb703]/15 text-[#ffb703]">
                  <Info className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-display text-sm sm:text-base font-bold tracking-[0.14em] text-[#ffb703] uppercase leading-tight">
                    INFO PENGEMBANG
                  </h2>
                  <p className="text-[10px] sm:text-[11px] text-slate-300">
                    Media Edukasi Interaktif Pesawat TNI AU 3D
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDevInfoOpen(false)}
                aria-label="Tutup Info Pengembang"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-600/80 bg-[#0e2a54] text-slate-200 hover:border-[#ffb703] hover:text-[#ffb703] cursor-pointer active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Isi Detail Pengembang (Touch-Scrollable di HP Landscape) */}
            <div
              className="hud-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y p-4 space-y-3 text-xs sm:text-sm"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <div className="rounded-xl border border-[#4da6ff]/25 bg-[#0a2145]/80 p-3 space-y-2.5">
                <div>
                  <p className="font-display text-[10px] font-bold tracking-[0.16em] text-[#4da6ff] uppercase">
                    Programming and Director
                  </p>
                  <p className="font-display text-sm sm:text-base font-bold text-white">Herlani</p>
                </div>
                <div className="h-px bg-[#4da6ff]/15" />
                <div>
                  <p className="font-display text-[10px] font-bold tracking-[0.16em] text-[#4da6ff] uppercase">
                    Analisa
                  </p>
                  <p className="font-semibold text-slate-100">Muhammad Dzaky Dirgantara</p>
                </div>
                <div className="h-px bg-[#4da6ff]/15" />
                <div>
                  <p className="font-display text-[10px] font-bold tracking-[0.16em] text-[#4da6ff] uppercase">
                    Desain
                  </p>
                  <p className="font-semibold text-slate-100">Aqila Mufidah, Dahlia</p>
                </div>
                <div className="h-px bg-[#4da6ff]/15" />
                <div>
                  <p className="font-display text-[10px] font-bold tracking-[0.16em] text-[#ffb703] uppercase">
                    Support
                  </p>
                  <p className="font-semibold text-white">IT RSAU dr. ESNAWAN ANTARIKSA</p>
                </div>
              </div>

              {/* Kontak */}
              <div className="rounded-xl border border-[#ffb703]/30 bg-[#0b2349]/75 p-3 space-y-2">
                <a
                  href="tel:081314127822"
                  className="flex items-center gap-2 text-slate-200 hover:text-[#ffb703] transition-colors"
                >
                  <Phone className="h-3.5 w-3.5 shrink-0 text-[#ffb703]" />
                  <span>
                    <strong className="text-slate-400 font-medium">Telp :</strong> 081314127822
                  </span>
                </a>
                <div className="flex items-start gap-2 text-slate-200">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-[#4da6ff] mt-0.5" />
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                    <strong className="text-slate-400 font-medium">Email :</strong>
                    <a href="mailto:itrsauantariksa@gmail.com" className="text-[#75bcff] hover:underline">
                      itrsauantariksa@gmail.com
                    </a>
                    <span className="text-slate-500">•</span>
                    <a href="mailto:bangelan@gmail.com" className="text-[#75bcff] hover:underline">
                      bangelan@gmail.com
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Keluar Aplikasi */}
      {exitConfirmOpen && (
        <div
          className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-[#040d1e]/82 backdrop-blur-md p-4"
          onClick={() => setExitConfirmOpen(false)}
        >
          <div
            className="hud-panel w-full max-w-xs sm:max-w-sm rounded-2xl border-rose-400/50 bg-[#081933]/98 p-5 text-center shadow-[0_20px_60px_rgba(2,8,20,0.9)] animate-slidein space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-rose-400/60 bg-rose-500/20 text-rose-300">
              <LogOut className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-display text-base sm:text-lg font-bold tracking-wider text-white uppercase">
                Keluar dari Aplikasi?
              </h3>
              <p className="mt-1 text-xs text-slate-300">
                Apakah Anda yakin ingin menutup Hangar Virtual Pesawat TNI AU 3D?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setExitConfirmOpen(false)}
                className="min-h-[42px] rounded-lg border border-slate-600/80 bg-[#0e2a54] px-3 py-2 font-display text-xs font-bold tracking-wider text-slate-200 uppercase hover:border-[#4da6ff] hover:text-white cursor-pointer active:scale-95"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmExit}
                className="min-h-[42px] rounded-lg border border-rose-400 bg-rose-600 px-3 py-2 font-display text-xs font-bold tracking-wider text-white uppercase shadow-[0_0_16px_rgba(244,63,94,0.4)] hover:bg-rose-500 cursor-pointer active:scale-95"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pemberitahuan singkat bila diakses lewat browser desktop */}
      {webExitNotice && (
        <div className="pointer-events-none fixed top-16 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-[#ffb703]/60 bg-[#081933]/95 px-4 py-2 text-xs font-medium text-[#fde68a] shadow-lg">
          Suara dimatikan. Anda dapat menutup tab browser ini.
        </div>
      )}
    </header>
  );
}
