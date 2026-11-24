import { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';

const WA_URL =
  'https://wa.me/6281314127822?text=' +
  encodeURIComponent(
    'Halo Abang Elan, saya ingin memberikan saran dan masukan untuk aplikasi Hanggar Virtual Pesawat TNI AU 3D.',
  );

/**
 * Menu melayang (floating) untuk Saran & Masukan langsung terhubung ke WhatsApp 081314127822.
 * Dapat diperkecil menjadi tombol ikon WhatsApp ringkas agar tidak mengganggu eksplorasi 3D.
 */
export function FloatingWhatsApp() {
  const [open, setOpen] = useState(true);

  return (
    <div className="pointer-events-none fixed right-2.5 sm:right-4 bottom-[112px] sm:bottom-[120px] z-[45] flex flex-col items-end gap-2">
      {open ? (
        <div className="hud-panel pointer-events-auto relative w-[min(275px,calc(100vw-1.5rem))] rounded-2xl border-emerald-400/55 bg-[#091d3b]/95 p-3 shadow-[0_12px_32px_rgba(2,10,28,0.75)] animate-slidein">
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Perkecil menu Saran & Masukan"
            title="Perkecil"
            className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700/80 bg-[#0e2a54] text-slate-300 hover:border-emerald-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          <div className="flex items-start gap-2.5 pr-7">
            <span className="relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-400/60 text-emerald-300">
              <MessageCircle className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-[11px] font-bold tracking-[0.14em] text-emerald-300 uppercase">
                Saran & Masukan
              </p>
              <p className="mt-0.5 text-[11px] sm:text-xs leading-snug text-slate-200">
                Saran dan masukan silahkan hubungi WhatsApp:
              </p>
            </div>
          </div>

          <a
            href={WA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/70 bg-emerald-500 px-3 py-2 font-display text-xs sm:text-sm font-bold tracking-wider text-[#062016] shadow-[0_0_16px_rgba(16,185,129,0.45)] hover:bg-emerald-400 transition-all active:scale-95"
          >
            <MessageCircle className="h-4 w-4 shrink-0" />
            <span>WhatsApp : 081314127822</span>
          </a>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Saran dan masukan silahkan hubungi WhatsApp : 081314127822"
          className="pointer-events-auto flex items-center gap-2 rounded-full border border-emerald-400/70 bg-emerald-500 px-3.5 py-2.5 font-display text-xs font-bold tracking-wider text-[#062016] uppercase shadow-[0_8px_24px_rgba(16,185,129,0.45)] hover:bg-emerald-400 transition-all cursor-pointer active:scale-95"
        >
          <MessageCircle className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Saran & Masukan</span>
          <span className="sm:hidden">WA</span>
        </button>
      )}
    </div>
  );
}
