import { ArrowRight, Mail, Music, Phone, Shield } from 'lucide-react';
import { FLEET } from '../../data/fleetData';
import { useHangarStore } from '../../store/useHangarStore';
import { bgmPlayer } from '../../utils/bgmPlayer';
import { TniAuLogo3D } from './TniAuLogo3D';

export function WelcomeScreen() {
  const showWelcome = useHangarStore((s) => s.showWelcome);
  const bgmEnabled = useHangarStore((s) => s.bgmEnabled);
  const enterHangar = useHangarStore((s) => s.enterHangar);
  const toggle = useHangarStore((s) => s.toggle);

  if (!showWelcome) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#061226] px-4 py-6 overflow-y-auto"
      style={{
        backgroundImage:
          'linear-gradient(rgba(77,166,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(77,166,255,0.05) 1px, transparent 1px)',
        backgroundSize: '36px 36px',
      }}
    >
      <div className="relative flex w-full max-w-xl flex-col items-center rounded-xl border border-[#4da6ff]/35 bg-[#081933]/96 px-6 py-7 sm:px-9 sm:py-9 text-center shadow-[0_24px_64px_rgba(2,8,20,0.85)] animate-slidein">
        {/* Aksen sudut taktis aviasi */}
        <span className="pointer-events-none absolute top-0 left-0 h-4 w-4 border-t-2 border-l-2 border-[#ffb703]" />
        <span className="pointer-events-none absolute top-0 right-0 h-4 w-4 border-t-2 border-r-2 border-[#ffb703]" />
        <span className="pointer-events-none absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-[#ffb703]" />
        <span className="pointer-events-none absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-[#ffb703]" />

        {/* Header Komando */}
        <div className="inline-flex items-center gap-2 border-y border-[#4da6ff]/30 px-4 py-1 font-display text-[11px] font-bold tracking-[0.24em] text-[#93c5fd] uppercase">
          <Shield className="h-3.5 w-3.5 text-[#ffb703]" />
          TNI ANGKATAN UDARA • SWA BHUWANA PAKSA
        </div>

        {/* Emblem Resmi TNI AU */}
        <div className="mt-5 flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center">
          <TniAuLogo3D className="h-full w-full" animated />
        </div>

        {/* Judul Utama */}
        <h1 className="mt-4 font-display text-2xl sm:text-[32px] font-bold tracking-[0.07em] text-white uppercase leading-tight">
          HANGAR VIRTUAL ALUTSISTA 3D
        </h1>
        <p className="mt-2.5 max-w-md text-xs sm:text-sm leading-relaxed text-slate-300">
          Eksplorasi interaktif <strong className="text-white">{FLEET.length} armada &amp; perlengkapan TNI AU</strong>{' '}
          lengkap dengan simulasi <em>Take Off</em>, manuver taktis, misi operasi udara, aerodinamika, dan kuis 3D.
        </p>

        {/* Strip Telemetri Ringkas */}
        <div className="mt-5 grid w-full max-w-md grid-cols-3 divide-x divide-[#4da6ff]/20 rounded-lg border border-[#4da6ff]/25 bg-[#061329]/90 py-2.5">
          <div className="px-2">
            <p className="font-display text-lg sm:text-xl font-bold text-white">{FLEET.length}</p>
            <p className="font-display text-[10px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
              Unit Armada
            </p>
          </div>
          <div className="px-2">
            <p className="font-display text-lg sm:text-xl font-bold text-[#ffb703]">10 PIN</p>
            <p className="font-display text-[10px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
              Inspeksi 3D
            </p>
          </div>
          <div className="px-2">
            <p className="font-display text-lg sm:text-xl font-bold text-white">360°</p>
            <p className="font-display text-[10px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
              Flight Sim
            </p>
          </div>
        </div>

        {/* Tombol Masuk Hanggar + Tombol Musik Latar */}
        <div className="mt-6 flex w-full max-w-xs flex-col items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              if (bgmEnabled) bgmPlayer.unlockAndSync(true);
              enterHangar();
            }}
            className="flex min-h-[50px] w-full items-center justify-center gap-2.5 rounded-lg border border-[#ffb703] bg-[#ffb703] px-6 py-2.5 font-display text-base font-bold tracking-[0.16em] text-[#07152c] uppercase transition-colors duration-150 hover:bg-[#fcd34d] active:scale-[0.98] cursor-pointer"
          >
            <span>BUKA HANGGAR 3D</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              const next = !bgmEnabled;
              toggle('bgmEnabled');
              bgmPlayer.unlockAndSync(next);
            }}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 font-display text-xs font-bold tracking-wider uppercase transition-all cursor-pointer active:scale-95 ${
              bgmEnabled
                ? 'border-[#ffb703]/60 bg-[#ffb703]/15 text-[#ffb703] hover:bg-[#ffb703]/25'
                : 'border-slate-600/70 bg-[#0b1f3f]/80 text-slate-400 hover:border-slate-400 hover:text-white'
            }`}
          >
            <Music className="h-3.5 w-3.5" />
            <span>{bgmEnabled ? 'Musik Latar: Nyala' : 'Musik Latar: Mati'}</span>
          </button>
        </div>

        {/* Kredit Pembuat & Kontak */}
        <div className="mt-6 w-full border-t border-[#4da6ff]/20 pt-3.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-300">
          <a
            href="mailto:bangelan@gmail.com"
            title="Kirim email ke bangelan@gmail.com"
            className="inline-flex items-center gap-1.5 text-[#ffb703] hover:text-[#fcd34d] hover:underline transition-colors"
          >
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span>
              Created By : <strong className="font-semibold">Abang Elan</strong>
            </span>
          </a>
          <span className="text-[#4da6ff]/35">•</span>
          <a
            href="tel:+6281314127822"
            title="Hubungi +6281314127822"
            className="inline-flex items-center gap-1.5 text-[#93c5fd] hover:text-white hover:underline transition-colors"
          >
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span>+6281314127822</span>
          </a>
        </div>
      </div>
    </div>
  );
}
