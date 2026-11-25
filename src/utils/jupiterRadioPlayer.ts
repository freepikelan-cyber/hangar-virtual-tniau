import type { JupiterVoiceRole } from '../data/jupiterShowScript';

/**
 * Pemutar Komunikasi Radio Kokpit Jupiter Aerobatic Show:
 * - Memutar efek PTT Squelch + desis radio VHF Bandpass (300Hz–3000Hz) lewat Web Audio API.
 * - Memutar dialog suara dengan karakter berbeda tiap peran (Jupiter Lead tenang & berwibawa,
 *   ATC tajam & cepat, Wingmen 2–6 berenergi tinggi, Ground Crew ramah & bangga).
 */
class JupiterRadioPlayer {
  private ctx: AudioContext | null = null;

  private ensureCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /** Efek PTT Squelch "KRRSSHH" + Bandpass 300-3000 Hz khas radio VHF kokpit. */
  private playVhfSquelch(durationSec = 0.14) {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * durationSec));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      ch[i] = (Math.random() * 2 - 1) * 0.7;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 350;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2850;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.14, now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

    src.connect(hp);
    hp.connect(lp);
    lp.connect(g);
    g.connect(ctx.destination);
    src.start(now);
    src.stop(now + durationSec + 0.02);
  }

  speak(text: string, role: JupiterVoiceRole, soundEnabled: boolean) {
    if (!soundEnabled || typeof window === 'undefined') return;
    this.playVhfSquelch(0.13);

    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'en-US';
      utter.volume = 0.92;

      if (role === 'lead') {
        // Jupiter Lead: tenang, berwibawa, bariton dalam
        utter.pitch = 0.82;
        utter.rate = 0.96;
      } else if (role === 'atc') {
        // Adisutjipto ATC Tower: tajam, cepat, jelas
        utter.pitch = 1.14;
        utter.rate = 1.12;
      } else if (role === 'wingman') {
        // Jupiter Wingmen 2–6: tegas & berenergi tinggi
        utter.pitch = 1.05;
        utter.rate = 1.15;
      } else {
        // Ground Crew / Marshal: ramah & bangga
        utter.pitch = 0.95;
        utter.rate = 0.98;
      }

      const voices = window.speechSynthesis.getVoices();
      const enVoice =
        voices.find((v) => v.lang.startsWith('en') && /male|david|mark|google us english/i.test(v.name)) ??
        voices.find((v) => v.lang.startsWith('en'));
      if (enVoice) utter.voice = enVoice;

      utter.onend = () => {
        this.playVhfSquelch(0.09);
      };
      window.speechSynthesis.speak(utter);
    } catch {
      // ignore if speechSynthesis blocked
    }
  }

  stop() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
  }
}

export const jupiterRadioPlayer = new JupiterRadioPlayer();
