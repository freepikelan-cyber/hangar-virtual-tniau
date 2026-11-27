import { useEffect, useState } from 'react';
import { useHangarStore } from '../../store/useHangarStore';
import { bgmPlayer } from '../../utils/bgmPlayer';
import { TniAuLogo3D } from './TniAuLogo3D';

type IntroStage = 'brand' | 'loading';

export function WelcomeScreen() {
  const showWelcome = useHangarStore((s) => s.showWelcome);
  const bgmEnabled = useHangarStore((s) => s.bgmEnabled);
  const enterHangar = useHangarStore((s) => s.enterHangar);

  const [stage, setStage] = useState<IntroStage>('brand');
  const [loadPct, setLoadPct] = useState(0);

  useEffect(() => {
    if (!showWelcome) return;
    setStage('brand');
    setLoadPct(0);

    // Tahap 1: Splash "Media Edukasi Interaktif Pesawat TNI AU" + "Created By : Herlani" ala Capcom (2.4 detik)
    const tBrand = window.setTimeout(() => {
      setStage('loading');
    }, 2400);

    // Tahap 2: Loading 0% -> 100% lalu LANGSUNG masuk ke halaman Hanggar Virtual 3D!
    let loadInterval: number | null = null;
    let finishTimeout: number | null = null;
    const tLoadStart = window.setTimeout(() => {
      let pct = 0;
      loadInterval = window.setInterval(() => {
        pct = Math.min(100, pct + 5);
        setLoadPct(pct);
        if (pct >= 100) {
          if (loadInterval !== null) window.clearInterval(loadInterval);
          finishTimeout = window.setTimeout(() => {
            if (bgmEnabled) bgmPlayer.unlockAndSync(true);
            enterHangar();
          }, 220);
        }
      }, 75);
    }, 2450);

    return () => {
      window.clearTimeout(tBrand);
      window.clearTimeout(tLoadStart);
      if (loadInterval !== null) window.clearInterval(loadInterval);
      if (finishTimeout !== null) window.clearTimeout(finishTimeout);
    };
  }, [showWelcome, bgmEnabled, enterHangar]);

  if (!showWelcome) return null;

  // === TAHAP 1: SPLASH SCREEN ALA CAPCOM ("Media Edukasi Interaktif Pesawat TNI AU" / "Created By : Herlani") ===
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
          <div className="h-[2px] w-28 sm:w-44 bg-gradient-to-r from-transparent via-[#ffb703] to-transparent" />
          <p className="font-display text-xs sm:text-sm md:text-base font-bold tracking-[0.22em] text-[#93c5fd] uppercase">
            Media Edukasi Interaktif Pesawat TNI AU
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
          <div className="h-[2px] w-28 sm:w-44 bg-gradient-to-r from-transparent via-[#ffb703] to-transparent" />
        </div>
      </div>
    );
  }

  // === TAHAP 2: SCREEN LOADING -> LANGSUNG MASUK HANGGAR VIRTUAL 3D ===
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050f22] px-6 text-center select-none">
      <div className="flex flex-col items-center gap-3.5 w-full max-w-sm animate-slidein">
        <div className="h-20 w-20 sm:h-24 sm:w-24">
          <TniAuLogo3D className="h-full w-full" animated />
        </div>
        <h2 className="font-display text-sm sm:text-lg font-bold tracking-[0.12em] text-white uppercase leading-snug">
          Selamat Datang di Hangar Virtual Pesawat TNI AU
        </h2>
        <p className="font-display text-[11px] sm:text-xs font-bold tracking-[0.22em] text-[#75bcff] uppercase">
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
