import type { AircraftCategory } from '../data/fleetData';

/**
 * Engine Audio Murni Web Audio API (tanpa file audio eksternal) khusus Mode Simulator Kokpit 3D:
 * - Suara mesin dinamis mengikuti throttle & kecepatan (Jet Tempur, Turboprop/Angkut, Helikopter VTOL)
 * - Alarm peringatan Stall & Pull-Up Warning (pulsing military cockpit master caution)
 * - Bunyi konfirmasi radar-lock saat melewati cincin target di udara & servo roda pendarat (Gear).
 */
class CockpitSimAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  private noiseGain: GainNode | null = null;
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private oscGain: GainNode | null = null;
  private lfo: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;
  private running = false;
  private lastWarnTime = 0;

  start() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.buildGraph();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this.running = true;
  }

  private buildGraph() {
    if (!this.ctx) return;
    const ctx = this.ctx;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0;
    this.masterGain.connect(ctx.destination);

    // Brown-filtered noise untuk deru aliran jet / baling-baling / rotor
    const bufLen = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufLen; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.03 * white) / 1.03;
      data[i] = last * 3.2;
    }
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = buf;
    noiseSrc.loop = true;

    this.noiseFilter = ctx.createBiquadFilter();
    this.noiseFilter.type = 'lowpass';
    this.noiseFilter.frequency.value = 260;

    this.noiseGain = ctx.createGain();
    this.noiseGain.gain.value = 0.65;

    noiseSrc.connect(this.noiseFilter);
    this.noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.masterGain);
    noiseSrc.start();

    // Dual oscillator untuk turbine whine / prop harmonics / rotor bass
    this.osc1 = ctx.createOscillator();
    this.osc2 = ctx.createOscillator();
    this.osc1.type = 'sawtooth';
    this.osc2.type = 'triangle';
    this.osc1.frequency.value = 180;
    this.osc2.frequency.value = 360;

    this.oscGain = ctx.createGain();
    this.oscGain.gain.value = 0.08;

    this.osc1.connect(this.oscGain);
    this.osc2.connect(this.oscGain);
    this.oscGain.connect(this.masterGain);
    this.osc1.start();
    this.osc2.start();

    // LFO untuk efek whop-whop helikopter atau beating twin-engine
    this.lfo = ctx.createOscillator();
    this.lfo.frequency.value = 7;
    this.lfoGain = ctx.createGain();
    this.lfoGain.gain.value = 0.04;
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.noiseGain.gain);
    this.lfo.start();
  }

  update(
    category: AircraftCategory,
    throttle: number,
    speedKts: number,
    stallWarn: boolean,
    pullUpWarn: boolean,
    soundEnabled: boolean,
  ) {
    if (!this.running || !this.ctx || !this.masterGain || !this.noiseFilter || !this.osc1 || !this.osc2 || !this.oscGain || !this.lfo || !this.lfoGain) {
      return;
    }
    const now = this.ctx.currentTime;
    if (!soundEnabled) {
      this.masterGain.gain.setTargetAtTime(0, now, 0.08);
      return;
    }

    const spdNorm = Math.min(1, speedKts / 450);
    const pwr = Math.max(0.12, throttle);

    if (category === 'Helikopter') {
      this.masterGain.gain.setTargetAtTime(0.28 * pwr + 0.06, now, 0.1);
      this.noiseFilter.type = 'lowpass';
      this.noiseFilter.frequency.setTargetAtTime(160 + pwr * 280, now, 0.1);
      this.osc1.frequency.setTargetAtTime(52 + pwr * 26, now, 0.1);
      this.osc2.frequency.setTargetAtTime(620 + pwr * 420, now, 0.1);
      this.oscGain.gain.setTargetAtTime(0.055 * pwr, now, 0.1);
      this.lfo.frequency.setTargetAtTime(5.5 + pwr * 6.5, now, 0.1);
      this.lfoGain.gain.setTargetAtTime(0.42, now, 0.1);
    } else if (category === 'Angkut & VIP') {
      this.masterGain.gain.setTargetAtTime(0.24 * pwr + 0.05, now, 0.1);
      this.noiseFilter.type = 'lowpass';
      this.noiseFilter.frequency.setTargetAtTime(220 + pwr * 560 + spdNorm * 220, now, 0.1);
      this.osc1.frequency.setTargetAtTime(92 + pwr * 75, now, 0.1);
      this.osc2.frequency.setTargetAtTime(188 + pwr * 150, now, 0.1);
      this.oscGain.gain.setTargetAtTime(0.09 * pwr, now, 0.1);
      this.lfo.frequency.setTargetAtTime(11 + pwr * 6, now, 0.1);
      this.lfoGain.gain.setTargetAtTime(0.16, now, 0.1);
    } else if (category === 'Latih') {
      this.masterGain.gain.setTargetAtTime(0.24 * pwr + 0.05, now, 0.1);
      this.noiseFilter.type = 'bandpass';
      this.noiseFilter.frequency.setTargetAtTime(260 + pwr * 480, now, 0.1);
      this.osc1.frequency.setTargetAtTime(110 + pwr * 95, now, 0.1);
      this.osc2.frequency.setTargetAtTime(225 + pwr * 190, now, 0.1);
      this.oscGain.gain.setTargetAtTime(0.1 * pwr, now, 0.1);
      this.lfo.frequency.setTargetAtTime(15 + pwr * 10, now, 0.1);
      this.lfoGain.gain.setTargetAtTime(0.14, now, 0.1);
    } else {
      // Pesawat Tempur: raungan afterburner & turbine whine tajam
      this.masterGain.gain.setTargetAtTime(0.3 * pwr + 0.06, now, 0.08);
      this.noiseFilter.type = 'lowpass';
      this.noiseFilter.frequency.setTargetAtTime(280 + pwr * 1150 + spdNorm * 450, now, 0.08);
      this.osc1.frequency.setTargetAtTime(320 + pwr * 540 + spdNorm * 160, now, 0.1);
      this.osc2.frequency.setTargetAtTime(328 + pwr * 555 + spdNorm * 160, now, 0.1);
      this.oscGain.gain.setTargetAtTime(0.075 * pwr, now, 0.1);
      this.lfo.frequency.setTargetAtTime(8.5, now, 0.1);
      this.lfoGain.gain.setTargetAtTime(0.05, now, 0.1);
    }

    // Alarm Peringatan Kokpit (STALL / PULL UP WARNING) murni Web Audio API
    if ((pullUpWarn || stallWarn) && now - this.lastWarnTime > (pullUpWarn ? 0.36 : 0.48)) {
      this.lastWarnTime = now;
      this.playWarningBeep(pullUpWarn);
    }
  }

  private playWarningBeep(isPullUp: boolean) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isPullUp ? 'sawtooth' : 'square';
    osc.frequency.setValueAtTime(isPullUp ? 880 : 1220, now);
    if (isPullUp) {
      osc.frequency.exponentialRampToValueAtTime(1420, now + 0.16);
    }
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  /** Nada konfirmasi radar-lock saat berhasil menembus cincin target di udara! */
  playRingPassChime(soundEnabled: boolean) {
    if (!soundEnabled) return;
    this.start();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    [740, 1110].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      g.gain.setValueAtTime(0.001, now + idx * 0.08);
      g.gain.linearRampToValueAtTime(0.16, now + idx * 0.08 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.24);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.26);
    });
  }

  /** Efek ledakan & kobaran api saat pesawat jatuh (crash) di simulator. */
  playExplosionSfx(soundEnabled: boolean) {
    if (!soundEnabled) return;
    this.start();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * 1.8);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      ch[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(540, now);
    lp.frequency.exponentialRampToValueAtTime(48, now + 1.65);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.7, now + 0.025);
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.75);
    src.connect(lp);
    lp.connect(g);
    g.connect(ctx.destination);
    src.start(now);
    src.stop(now + 1.78);
  }

  /** Nada selebrasi 3-nada saat Misi Pelatihan Simulator berhasil diselesaikan! */
  playMissionCompleteChime(soundEnabled: boolean) {
    if (!soundEnabled) return;
    this.start();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    [523.25, 659.25, 1046.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.11);
      g.gain.setValueAtTime(0.001, now + idx * 0.11);
      g.gain.linearRampToValueAtTime(0.18, now + idx * 0.11 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.11 + 0.38);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now + idx * 0.11);
      osc.stop(now + idx * 0.11 + 0.4);
    });
  }

  /** Bunyi mekanik servo roda pendarat (Gear Up / Gear Down). */
  playGearClick(soundEnabled: boolean) {
    if (!soundEnabled) return;
    this.start();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.18);
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  stop() {
    this.running = false;
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(0, now);
    }
  }
}

export const cockpitSimAudio = new CockpitSimAudio();
