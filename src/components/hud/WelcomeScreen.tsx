import { useEffect, useState } from 'react';
import { ArrowRight, Mail, Music, Phone, Shield } from 'lucide-react';
import { useHangarStore } from '../../store/useHangarStore';
import { bgmPlayer } from '../../utils/bgmPlayer';
import { TniAuLogo3D } from './TniAuLogo3D';

type IntroStage = 'brand' | 'loading' | 'welcome';

let hasPlayedOpeningIntro = false;

export function WelcomeScreen() {
  const showWelcome = useHangarStore((s) => s.showWelcome);
  const bgmEnabled = useHangarStore((s) => s.bgmEnabled);
  const enterHangar = useHangarStore((s) => s.enterHangar);
  const toggle = useHangarStore((s) => s.toggle);

  const [stage, setStage] = useState<IntroStage>(() => (hasPlayedOpeningIntro ? 'welcome' : 'brand'));
  const [loadPct, setLoadPct] = useState(0);

  useEffect(() => {
    if (!showWelcome) return;
    if (hasPlayedOpeningIntro) {
      setStage('welcome');
      return;
    }

    // Tahap 1: Splash "Created By : Herlani" ala Capcom (2.4 detik)
    const tBrand = window.setTimeout(() => {
      setStage('loading');
    }, 2400);

    // Tahap 2: Animasi progress bar loading (1.8 detik -> 0% s/d 100%)
    const tLoadStart = window.setTimeout(() => {
      let pct = 0;
      const iv = window.setInterval(() => {
        pct = Math.min(100, pct + 5);
        setLoadPct(pct);
        if (pct >= 100) {
          window.clearInterval(iv);
          hasPlayedOpeningIntro = true;
          window.setTimeout(() => setStage('welcome'), 220);
        }
      }, 75);
    }, 2450);

    return () => {
      window.clearTimeout(tBrand);
      window.clearTimeout(tLoadStart);
    };
  }, [showWelcome]);

  if (!showWelcome) return null;

  // === TAHAP 1: SPLASH SCREEN ALA CAPCOM ("Created By : Herlani") ===
  if (stage === 'brand') {
    return (
      <div
        onClick={() => setStage('loading')}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#030916] px-6 text-center select-none cursor-pointer"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-65"
          style={{
            background:
              'radial-gradient(circle at center, rgba(255,183,3,0.16) 0%, rgba(14,42,84,0.22) 38%, rgba(3,9,22,1) 75%)',
          }}
        />
        <div className="relative z-10 flex flex-col items-center gap-2.5 animate-slidein">
          <div className="h-[2px] w-24 sm:w-36 bg-gradient-to-r from-transparent via-[#ffb703] to-transparent" />
          <p className="font-display text-[10px] sm:text-xs font-semibold tracking-[0.42em] text-[#93c5fd]/85 uppercase">
            OFFICIAL 3D AEROSPACE EXPERIENCE
          </p>
          <h1
            className="font-display text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-[0.14em] uppercase drop-shadow-[0_0_28px_rgba(255,183,3,0.45)]"
            style={{
              background: 'linear-gradient(180deg, #fffbeb 0%, #fde68a 45%, #f59e0b 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Created By : Herlani
          </h1>
          <div className="h-[2px] w-24 sm:w-36 bg-gradient-to-r from-transparent via-[#ffb703] to-transparent" />
        </div>
      </div>
    );
  }

  // === TAHAP 2: SCREEN LOADING ===
  if (stage === 'loading') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050f22] px-6 text-center select-none">
        <div className="flex flex-col items-center gap-3.5 w-full max-w-sm animate-slidein">
          <div className="h-16 w-16 sm:h-20 sm:w-20">
            <TniAuLogo3D className="h-full w-full" animated />
          </div>
          <p className="font-display text-xs sm:text-sm font-bold tracking-[0.24em] text-[#75bcff] uppercase">
            MEMUAT HANGGAR VIRTUAL 3D...
          </p>
          <div className="h-2.5 w-full overflow-hidden rounded-full border border-[#4da6ff]/40 bg-[#0b1f3f] p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#2563eb] via-[#38bdf8] to-[#ffb703] transition-all duration-100"
              style={{ width: `${Math.max(8, loadPct)}%` }}
            />
          </div>
          <span className="font-mono text-xs font-bold tracking-widest text-[#ffb703]">{loadPct}%</span>
        </div>
      </div>
    );
  }

  // === TAHAP 3: HALAMAN SELAMAT DATANG (LOGO TNI AU DI TENGAH + TOMBOL MASUK DI BAWAH) ===
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#061226] px-4 py-3 sm:py-6 overflow-y-auto touch-pan-y"
      style={{
        backgroundImage:
          'linear-gradient(rgba(77,166,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(77,166,255,0.05) 1px, transparent 1px)',
        backgroundSize: '36px 36px',
      }}
    >
      <div className="app-welcome-card relative flex w-full max-w-xl flex-col items-center rounded-xl border border-[#4da6ff]/35 bg-[#081933]/96 px-5 py-4 sm:px-9 sm:py-8 text-center shadow-[0_24px_64px_rgba(2,8,20,0.85)] animate-slidein">
        {/* Aksen sudut taktis aviasi */}
        <span className="pointer-events-none absolute top-0 left-0 h-4 w-4 border-t-2 border-l-2 border-[#ffb703]" />
        <span className="pointer-events-none absolute top-0 right-0 h-4 w-4 border-t-2 border-r-2 border-[#ffb703]" />
        <span className="pointer-events-none absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-[#ffb703]" />
        <span className="pointer-events-none absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-[#ffb703]" />

        {/* Header Komando */}
        <div className="inline-flex items-center gap-2 border-y border-[#4da6ff]/30 px-3.5 py-0.5 sm:py-1 font-display text-[10px] sm:text-[11px] font-bold tracking-[0.22em] text-[#93c5fd] uppercase">
          <Shield className="h-3.5 w-3.5 text-[#ffb703]" />
          TNI ANGKATAN UDARA • SWA BHUWANA PAKSA
        </div>

        {/* Judul Selamat Datang */}
        <h1 className="mt-2.5 sm:mt-4 font-display text-lg sm:text-2xl md:text-[30px] font-bold tracking-[0.06em] text-white uppercase leading-tight">
          Selamat Datang di Hangar Virtual Pesawat TNI AU
        </h1>

        {/* Logo Resmi TNI AU di Tengah */}
        <div className="app-welcome-logo my-3 sm:my-5 flex h-20 w-20 sm:h-28 sm:w-28 items-center justify-center">
          <TniAuLogo3D className="h-full w-full" animated />
        </div>

        {/* Tombol Masuk di Bagian Bawah + Musik Latar */}
        <div className="flex w-full max-w-xs flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (bgmEnabled) bgmPlayer.unlockAndSync(true);
              enterHangar();
            }}
            className="flex min-h-[44px] sm:min-h-[50px] w-full items-center justify-center gap-2.5 rounded-lg border border-[#ffb703] bg-[#ffb703] px-6 py-2 font-display text-sm sm:text-base font-bold tracking-[0.18em] text-[#07152c] uppercase shadow-[0_0_24px_rgba(255,183,3,0.35)] transition-colors duration-150 hover:bg-[#fcd34d] active:scale-[0.98] cursor-pointer"
          >
            <span>MASUK</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              const next = !bgmEnabled;
              toggle('bgmEnabled');
              bgmPlayer.unlockAndSync(next);
            }}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 font-display text-[10px] sm:text-xs font-bold tracking-wider uppercase transition-all cursor-pointer active:scale-95 ${
              bgmEnabled
                ? 'border-[#ffb703]/60 bg-[#ffb703]/15 text-[#ffb703] hover:bg-[#ffb703]/25'
                : 'border-slate-600/70 bg-[#0b1f3f]/80 text-slate-400 hover:border-slate-400 hover:text-white'
            }`}
          >
            <Music className="h-3 w-3" />
            <span>{bgmEnabled ? 'Musik Latar: Nyala' : 'Musik Latar: Mati'}</span>
          </button>
        </div>

        {/* Kredit Pembuat & Kontak */}
        <div className="mt-3 sm:mt-5 w-full border-t border-[#4da6ff]/20 pt-2.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-[10px] sm:text-xs text-slate-300">
          <a
            href="mailto:bangelan@gmail.com"
            title="Kirim email ke bangelan@gmail.com"
            className="inline-flex items-center gap-1 text-[#ffb703] hover:text-[#fcd34d] hover:underline transition-colors"
          >
            <Mail className="h-3 w-3 shrink-0" />
            <span>
              Created By : <strong className="font-semibold">Abang Elan</strong>
            </span>
          </a>
          <span className="text-[#4da6ff]/35">•</span>
          <a
            href="tel:+6281314127822"
            title="Hubungi +6281314127822"
            className="inline-flex items-center gap-1 text-[#93c5fd] hover:text-white hover:underline transition-colors"
          >
            <Phone className="h-3 w-3 shrink-0" />
            <span>+6281314127822</span>
          </a>
        </div>
      </div>
    </div>
  );
}
