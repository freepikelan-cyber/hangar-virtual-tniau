/**
 * Pemutar Musik Latar Belakang (BGM) Hangar Virtual TNI AU 3D:
 * - Berjalan mulus & berulang (loop) saat halaman selamat datang & eksplorasi hanggar/menu non-simulasi.
 * - Otomatis fade-out & berhenti total saat simulasi penerbangan (Take Off, Airborne, Manuver, Landing, AAR, Misi, Safety) aktif!
 * - Menangani kebijakan autoplay browser secara otomatis pada interaksi sentuh/klik pertama pengguna.
 */
class BgmPlayer {
  private audio: HTMLAudioElement | null = null;
  private shouldPlay = false;
  private fadeTimer: number | null = null;
  private targetVol = 0.35;
  private unlockBound = false;
  private epoch = 0;

  private ensureAudio(): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null;
    if (!this.audio) {
      const a = new Audio('/audio/bgm-theme.mp3');
      a.loop = true;
      a.preload = 'auto';
      a.volume = 0;
      this.audio = a;
    }
    if (!this.unlockBound) {
      this.unlockBound = true;
      const onGesture = () => {
        // Jalankan setelah handler klik tombol (microtask/timeout 0) agar klik tombol "Mati" tidak memicu play ulang!
        window.setTimeout(() => {
          if (this.shouldPlay && this.audio && this.audio.paused) {
            this.tryStart();
          }
        }, 0);
      };
      window.addEventListener('pointerdown', onGesture, { passive: true });
      window.addEventListener('touchstart', onGesture, { passive: true });
      window.addEventListener('click', onGesture, { passive: true });
      window.addEventListener('keydown', onGesture, { passive: true });
    }
    return this.audio;
  }

  private clearFade() {
    if (this.fadeTimer !== null) {
      window.clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }
  }

  private tryStart() {
    const a = this.ensureAudio();
    if (!a || !this.shouldPlay) return;
    const myEpoch = ++this.epoch;
    if (!a.paused) {
      this.fadeTo(this.targetVol, false);
      return;
    }
    const p = a.play();
    if (p && typeof p.then === 'function') {
      p.then(() => {
        if (this.shouldPlay && this.epoch === myEpoch) {
          this.fadeTo(this.targetVol, false);
        } else {
          this.clearFade();
          a.pause();
          a.volume = 0;
        }
      }).catch(() => {
        // Browser memblokir autoplay sebelum interaksi pertama; listener gesture akan memutar otomatis!
      });
    }
  }

  private fadeTo(dest: number, pauseWhenZero: boolean) {
    const a = this.audio;
    if (!a) return;
    this.clearFade();
    const stepMs = 40;
    const stepDelta = 0.045;
    this.fadeTimer = window.setInterval(() => {
      if (!this.audio) {
        this.clearFade();
        return;
      }
      if (!this.shouldPlay && !pauseWhenZero) {
        this.clearFade();
        this.audio.pause();
        this.audio.volume = 0;
        return;
      }
      const cur = this.audio.volume;
      if (Math.abs(cur - dest) <= stepDelta) {
        this.audio.volume = dest;
        this.clearFade();
        if (pauseWhenZero && dest <= 0.001) {
          this.audio.pause();
        }
      } else {
        this.audio.volume = cur < dest ? Math.min(1, cur + stepDelta) : Math.max(0, cur - stepDelta);
      }
    }, stepMs);
  }

  /** Dipanggil reaktif dari App.tsx berdasarkan bgmEnabled, showWelcome, flightMode & safetyMode. */
  sync(active: boolean) {
    this.shouldPlay = active;
    const a = this.ensureAudio();
    if (!a) return;
    if (active) {
      this.tryStart();
    } else {
      this.epoch++;
      this.clearFade();
      a.pause();
      a.volume = 0;
    }
  }

  /** Mengatur volume musik latar secara langsung (0.0 .. 1.0). */
  setVolume(vol: number) {
    this.targetVol = Math.max(0, Math.min(1, vol));
    if (this.audio && this.shouldPlay && !this.audio.paused) {
      this.clearFade();
      this.audio.volume = this.targetVol;
    }
  }

  /** Panggil dari klik tombol untuk langsung membuka blokir autoplay atau mematikan seketika. */
  unlockAndSync(active: boolean) {
    this.sync(active);
  }
}

export const bgmPlayer = new BgmPlayer();
