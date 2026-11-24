import { ArrowRight, Mail, Phone, Plane, Sparkles } from 'lucide-react';
import { FLEET } from '../../data/fleetData';
import { useHangarStore } from '../../store/useHangarStore';
import { TniAuLogo3D } from './TniAuLogo3D';

export function WelcomeScreen() {
  const showWelcome = useHangarStore((s) => s.showWelcome);
  const enterHangar = useHangarStore((s) => s.enterHangar);

  if (!showWelcome) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a1e3c]/88 backdrop-blur-md px-4 py-6 overflow-y-auto">
      {/* Efek pendaran cahaya latar Biru TNI AU & Emas */}
      <div
        className="pointer-events-none absolute h-[420px] w-[420px] rounded-full bg-[#4da6ff]/15 blur-[110px]"
        aria-hidden
      />

      <div className="hud-panel relative flex w-full max-w-xl flex-col items-center rounded-3xl border-[#4da6ff]/50 px-6 py-8 sm:px-10 sm:py-10 text-center shadow-[0_20px_60px_rgba(3,12,30,0.75)] animate-slidein">
        {/* Badge atas */}
        <div className="inline-flex items-center gap-2 rounded-full border border-[#4da6ff]/45 bg-[#0f2d59]/80 px-3.5 py-1 font-display text-[11px] sm:text-xs font-bold tracking-[0.2em] text-[#75bcff] uppercase">
          <Sparkles className="h-3.5 w-3.5 text-[#ffb703]" />
          EDUKASI DIRGANTARA 3D INTERAKTIF
        </div>

        {/* Logo 3D Resmi TNI AU */}
        <div className="mt-5 flex h-28 w-28 sm:h-32 sm:w-32 items-center justify-center">
          <TniAuLogo3D className="h-full w-full" animated />
        </div>

        {/* Judul Selamat Datang */}
        <p className="mt-5 font-display text-xs sm:text-sm font-bold tracking-[0.26em] text-[#ffb703] uppercase">
          SELAMAT DATANG DI
        </p>
        <h1 className="mt-1 font-display text-2xl sm:text-4xl font-bold tracking-[0.06em] text-white uppercase leading-tight">
          HANGGAR VIRTUAL PESAWAT TNI AU
        </h1>
        <p className="mt-3 max-w-md text-xs sm:text-sm leading-relaxed text-slate-200/90">
          Eksplorasi 360° <strong className="text-white">{FLEET.length} armada utama TNI Angkatan Udara</strong>{' '}
          lengkap dengan simulasi <em>Take Off</em>, <em>Landing</em>, inspeksi komponen internal, dan Kuis 3D
          interaktif.
        </p>

        {/* Statistik Ringkas */}
        <div className="mt-5 grid w-full max-w-md grid-cols-3 gap-2">
          <div className="rounded-xl border border-[#4da6ff]/30 bg-[#0a2145]/80 px-2 py-2.5">
            <p className="font-display text-lg sm:text-xl font-bold text-[#4da6ff]">{FLEET.length}</p>
            <p className="font-display text-[10px] font-semibold tracking-wider text-slate-300 uppercase">
              Armada 3D
            </p>
          </div>
          <div className="rounded-xl border border-[#4da6ff]/30 bg-[#0a2145]/80 px-2 py-2.5">
            <p className="font-display text-lg sm:text-xl font-bold text-[#ffb703]">10</p>
            <p className="font-display text-[10px] font-semibold tracking-wider text-slate-300 uppercase">
              Pin / Pesawat
            </p>
          </div>
          <div className="rounded-xl border border-[#4da6ff]/30 bg-[#0a2145]/80 px-2 py-2.5">
            <p className="font-display text-lg sm:text-xl font-bold text-emerald-300">360°</p>
            <p className="font-display text-[10px] font-semibold tracking-wider text-slate-300 uppercase">
              Simulasi Flight
            </p>
          </div>
        </div>

        {/* Tombol Masuk Hanggar */}
        <button
          type="button"
          onClick={enterHangar}
          className="mt-6 flex min-h-[52px] w-full max-w-xs items-center justify-center gap-2.5 rounded-xl border border-[#ffb703] bg-[#ffb703] px-6 py-3 font-display text-base sm:text-lg font-bold tracking-[0.14em] text-[#0a1e3c] uppercase shadow-amber transition-all duration-200 hover:bg-[#ffd166] active:scale-95 cursor-pointer"
        >
          <Plane className="h-5 w-5" />
          <span>MASUK HANGGAR 3D</span>
          <ArrowRight className="h-5 w-5" />
        </button>

        {/* Kredit Pembuat & Kontak */}
        <div className="mt-7 w-full border-t border-[#4da6ff]/25 pt-4 flex flex-col items-center gap-1.5 text-xs sm:text-sm text-slate-300">
          <a
            href="mailto:bangelan@gmail.com"
            title="Kirim email ke bangelan@gmail.com"
            className="inline-flex items-center gap-1.5 text-[#ffb703] hover:text-[#ffd166] hover:underline transition-colors"
          >
            <Mail className="h-4 w-4 shrink-0" />
            <span>
              Created By : <strong className="font-bold">Abang Elan</strong>
            </span>
          </a>
          <a
            href="tel:+6281314127822"
            title="Hubungi +6281314127822"
            className="inline-flex items-center gap-1.5 text-[#4da6ff] hover:text-white hover:underline transition-colors text-xs"
          >
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span>+6281314127822</span>
          </a>
        </div>
      </div>
    </div>
  );
}
