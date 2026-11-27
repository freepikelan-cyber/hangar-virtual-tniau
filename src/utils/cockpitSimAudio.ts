import type { AircraftCategory } from '../data/fleetData';

/**
 * Engine Audio Kokpit Realistis Khusus per Jenis Pesawat TNI AU:
 * - TEMPUR (Su-30MK2, F-16, Rafale, dll.): Sampel jet asli (/audio/fighter-fly.mp3) + turbine whine tajam + deru afterburner!
 * - ANGKUT C-130J: Gemuruh dalam 4-mesin turboprop dengan pulsa synchrophase baling-baling khas Hercules!
 * - VVIP B737: Dengung halus twin-turbofan jet komersial + aliran udara kabin bertekanan!
 * - HELIKOPTER (Caracal, Colibri, Super Puma): Suara bilah rotor "WHOP-WHOP-WHOP" ritmis + gearbox whine khas heli!
 * - LATIH (KT-1B, Grob, T-50i): Deru turboprop/aerobatik lincah & responsif!
 */
class CockpitSimAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  // Layer 1: Brown/Pink noise untuk aliran jet / rotor slap / afterburner
  private noiseFilter: BiquadFilterNode | null = null;
  private noiseGain: GainNode | null = null;

  // Layer 2: Afterburner / Wind rush bandpass noise
  private jetRoarFilter: BiquadFilterNode | null = null;
  private jetRoarGain: GainNode | null = null;

  // Layer 3: Dual harmonic oscillator (turbine whine / prop drone / gearbox whine)
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private oscFilter: BiquadFilterNode | null = null;
  private oscGain: GainNode | null = null;

  // Layer 4: Sub-bass engine rumble (C-130J / Fighter body vibration / Heli tail rotor)
  private subOsc: OscillatorNode | null = null;
  private subGain: GainNode | null = null;

  // Layer 5: Chopper LFO untuk WHOP-WHOP Helikopter & Prop-Beating C-130J
  private lfo: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;

  // Layer 6: Sampel rekaman mesin jet tempur asli (untuk kategori Tempur!)
  private fighterSampleEl: HTMLAudioElement | null = null;
  private fighterSampleActive = false;

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
    if (!this.fighterSampleEl) {
      try {
        const el = new Audio('/audio/fighter-fly.mp3');
        el.loop = true;
        el.volume = 0;
        el.preload = 'auto';
        this.fighterSampleEl = el;
      } catch {
        this.fighterSampleEl = null;
      }
    }
    this.running = true;
  }

  private buildGraph() {
    if (!this.ctx) return;
    const ctx = this.ctx;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0;
    this.masterGain.connect(ctx.destination);

    // Buffer brown noise untuk deru utama & rotor slap
    const bufLen = ctx.sampleRate * 2;
    const brownBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const bData = brownBuf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufLen; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.032 * white) / 1.032;
      bData[i] = last * 3.4;
    }

    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = brownBuf;
    noiseSrc.loop = true;
    this.noiseFilter = ctx.createBiquadFilter();
    this.noiseFilter.type = 'lowpass';
    this.noiseFilter.frequency.value = 260;
    this.noiseGain = ctx.createGain();
    this.noiseGain.gain.value = 0.55;
    noiseSrc.connect(this.noiseFilter);
    this.noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.masterGain);
    noiseSrc.start();

    // Buffer white noise untuk afterburner / high-speed wind rush
    const whiteBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const wData = whiteBuf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      wData[i] = (Math.random() * 2 - 1) * 0.65;
    }
    const roarSrc = ctx.createBufferSource();
    roarSrc.buffer = whiteBuf;
    roarSrc.loop = true;
    this.jetRoarFilter = ctx.createBiquadFilter();
    this.jetRoarFilter.type = 'bandpass';
    this.jetRoarFilter.frequency.value = 900;
    this.jetRoarFilter.Q.value = 0.85;
    this.jetRoarGain = ctx.createGain();
    this.jetRoarGain.gain.value = 0.0;
    roarSrc.connect(this.jetRoarFilter);
    this.jetRoarFilter.connect(this.jetRoarGain);
    this.jetRoarGain.connect(this.masterGain);
    roarSrc.start();

    // Dual harmonic oscillators + filter (turbine whine / turboprop drone / heli gearbox)
    this.osc1 = ctx.createOscillator();
    this.osc2 = ctx.createOscillator();
    this.osc1.type = 'sawtooth';
    this.osc2.type = 'sine';
    this.osc1.frequency.value = 180;
    this.osc2.frequency.value = 360;

    this.oscFilter = ctx.createBiquadFilter();
    this.oscFilter.type = 'lowpass';
    this.oscFilter.frequency.value = 1800;

    this.oscGain = ctx.createGain();
    this.oscGain.gain.value = 0.08;

    this.osc1.connect(this.oscFilter);
    this.osc2.connect(this.oscFilter);
    this.oscFilter.connect(this.oscGain);
    this.oscGain.connect(this.masterGain);
    this.osc1.start();
    this.osc2.start();

    // Sub-bass oscillator untuk getaran badan pesawat berat / baling-baling / rotor
    this.subOsc = ctx.createOscillator();
    this.subOsc.type = 'triangle';
    this.subOsc.frequency.value = 48;
    this.subGain = ctx.createGain();
    this.subGain.gain.value = 0.0;
    this.subOsc.connect(this.subGain);
    this.subGain.connect(this.masterGain);
    this.subOsc.start();

    // LFO modulasi amplitudo kuat untuk efek "WHOP-WHOP" helikopter & pulsa prop C-130J
    this.lfo = ctx.createOscillator();
    this.lfo.type = 'triangle';
    this.lfo.frequency.value = 7;
    this.lfoGain = ctx.createGain();
    this.lfoGain.gain.value = 0.04;
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.noiseGain.gain);
    this.lfo.start();
  }

  private setFighterSample(active: boolean, volume: number, rate: number) {
    const el = this.fighterSampleEl;
    if (!el) return;
    if (active && volume > 0.005) {
      el.volume = Math.min(0.62, Math.max(0, volume));
      try {
        el.playbackRate = Math.min(1.55, Math.max(0.72, rate));
      } catch {
        // ignore unsupported rate
      }
      if (!this.fighterSampleActive) {
        this.fighterSampleActive = true;
        el.play().catch(() => {
          this.fighterSampleActive = false;
        });
      }
    } else if (this.fighterSampleActive) {
      this.fighterSampleActive = false;
      el.pause();
      el.volume = 0;
    }
  }

  update(
    category: AircraftCategory,
    throttle: number,
    speedKts: number,
    stallWarn: boolean,
    pullUpWarn: boolean,
    soundEnabled: boolean,
    unitId?: string,
  ) {
    if (
      !this.running ||
      !this.ctx ||
      !this.masterGain ||
      !this.noiseFilter ||
      !this.noiseGain ||
      !this.jetRoarFilter ||
      !this.jetRoarGain ||
      !this.osc1 ||
      !this.osc2 ||
      !this.oscFilter ||
      !this.oscGain ||
      !this.subOsc ||
      !this.subGain ||
      !this.lfo ||
      !this.lfoGain
    ) {
      return;
    }
    const now = this.ctx.currentTime;
    if (!soundEnabled) {
      this.masterGain.gain.setTargetAtTime(0, now, 0.08);
      this.setFighterSample(false, 0, 1);
      return;
    }

    const spdNorm = Math.min(1, speedKts / 480);
    const pwr = Math.max(0.1, throttle);

    if (category === 'Helikopter') {
      // === HELIKOPTER: WHOP-WHOP-WHOP rotor blade-slap dalam + turboshaft gearbox whine tajam ===
      this.setFighterSample(false, 0, 1);
      this.masterGain.gain.setTargetAtTime(0.36 * pwr + 0.14, now, 0.1);

      // Blade-slap kuat (lowpass noise dipotong ritmis oleh LFO 6.2 - 11.8 Hz!)
      this.noiseFilter.type = 'lowpass';
      this.noiseFilter.frequency.setTargetAtTime(140 + pwr * 210, now, 0.1);
      this.noiseGain.gain.setTargetAtTime(0.68, now, 0.1);
      this.lfo.type = 'sine';
      this.lfo.frequency.setTargetAtTime(6.2 + pwr * 5.6, now, 0.1);
      this.lfoGain.gain.setTargetAtTime(0.62, now, 0.1); // Pulsa WHOP-WHOP sangat terasa!

      // Gearbox & Turboshaft whine khas kabin helikopter
      this.osc1.type = 'sine';
      this.osc2.type = 'triangle';
      this.osc1.frequency.setTargetAtTime(1320 + pwr * 560, now, 0.12);
      this.osc2.frequency.setTargetAtTime(76 + pwr * 22, now, 0.12);
      this.oscFilter.frequency.setTargetAtTime(2400, now, 0.1);
      this.oscGain.gain.setTargetAtTime(0.048 + pwr * 0.035, now, 0.1);

      // Tail rotor low rumble
      this.subOsc.frequency.setTargetAtTime(34 + pwr * 18, now, 0.1);
      this.subGain.gain.setTargetAtTime(0.16 + pwr * 0.12, now, 0.1);

      // Sedikit aliran udara rotor
      this.jetRoarFilter.frequency.setTargetAtTime(420 + spdNorm * 350, now, 0.1);
      this.jetRoarGain.gain.setTargetAtTime(0.03 + spdNorm * 0.08, now, 0.1);
    } else if (category === 'Angkut & VIP') {
      this.setFighterSample(false, 0, 1);
      const isTurbofanVip = unitId === 'b737-vvip';

      if (isTurbofanVip) {
        // === B737 VVIP: Dengung Twin-Turbofan halus & kabin jet bertekanan ===
        this.masterGain.gain.setTargetAtTime(0.28 * pwr + 0.08, now, 0.12);
        this.noiseFilter.type = 'lowpass';
        this.noiseFilter.frequency.setTargetAtTime(220 + pwr * 420 + spdNorm * 280, now, 0.12);
        this.noiseGain.gain.setTargetAtTime(0.55, now, 0.1);
        this.lfo.frequency.setTargetAtTime(3.2, now, 0.15);
        this.lfoGain.gain.setTargetAtTime(0.04, now, 0.15);

        // Smooth bypass fan hum (sine + triangle, lembut seperti kokpit airliner)
        this.osc1.type = 'sine';
        this.osc2.type = 'triangle';
        this.osc1.frequency.setTargetAtTime(145 + pwr * 125, now, 0.12);
        this.osc2.frequency.setTargetAtTime(520 + pwr * 480, now, 0.12);
        this.oscFilter.frequency.setTargetAtTime(1150, now, 0.12);
        this.oscGain.gain.setTargetAtTime(0.055 + pwr * 0.04, now, 0.12);

        this.subOsc.frequency.setTargetAtTime(58 + pwr * 34, now, 0.12);
        this.subGain.gain.setTargetAtTime(0.14 + pwr * 0.09, now, 0.12);

        // Aliran angin kabin kecepatan jelajah
        this.jetRoarFilter.frequency.setTargetAtTime(850 + spdNorm * 650, now, 0.12);
        this.jetRoarGain.gain.setTargetAtTime(0.04 + spdNorm * 0.16, now, 0.12);
      } else {
        // === C-130J SUPER HERCULES: Gemuruh 4-Mesin Turboprop Berat + Synchrophase Prop Drone ===
        this.masterGain.gain.setTargetAtTime(0.35 * pwr + 0.11, now, 0.12);
        this.noiseFilter.type = 'lowpass';
        this.noiseFilter.frequency.setTargetAtTime(190 + pwr * 320 + spdNorm * 160, now, 0.12);
        this.noiseGain.gain.setTargetAtTime(0.62, now, 0.1);

        // Pulsa baling-baling 4-mesin C-130J yang khas (16 - 23 Hz)
        this.lfo.type = 'sine';
        this.lfo.frequency.setTargetAtTime(15.5 + pwr * 7.5, now, 0.12);
        this.lfoGain.gain.setTargetAtTime(0.28, now, 0.12);

        // Harmonik prop berat & dalam
        this.osc1.type = 'sawtooth';
        this.osc2.type = 'triangle';
        this.osc1.frequency.setTargetAtTime(72 + pwr * 38, now, 0.12);
        this.osc2.frequency.setTargetAtTime(144 + pwr * 76, now, 0.12);
        this.oscFilter.frequency.setTargetAtTime(340 + pwr * 280, now, 0.12);
        this.oscGain.gain.setTargetAtTime(0.16 + pwr * 0.09, now, 0.12);

        // Sub-bass gemuruh badan pesawat angkut
        this.subOsc.frequency.setTargetAtTime(38 + pwr * 22, now, 0.12);
        this.subGain.gain.setTargetAtTime(0.24 + pwr * 0.14, now, 0.12);

        this.jetRoarFilter.frequency.setTargetAtTime(520 + spdNorm * 400, now, 0.12);
        this.jetRoarGain.gain.setTargetAtTime(0.03 + spdNorm * 0.09, now, 0.12);
      }
    } else if (category === 'Latih') {
      // === PESAWAT LATIH (KT-1B Wong Bee / Grob): Deru Turboprop Aerobatik Lincah ===
      this.setFighterSample(false, 0, 1);
      this.masterGain.gain.setTargetAtTime(0.28 * pwr + 0.08, now, 0.1);
      this.noiseFilter.type = 'bandpass';
      this.noiseFilter.frequency.setTargetAtTime(280 + pwr * 480 + spdNorm * 180, now, 0.1);
      this.noiseGain.gain.setTargetAtTime(0.52, now, 0.1);

      this.lfo.type = 'sine';
      this.lfo.frequency.setTargetAtTime(19 + pwr * 12, now, 0.1);
      this.lfoGain.gain.setTargetAtTime(0.2, now, 0.1);

      this.osc1.type = 'sawtooth';
      this.osc2.type = 'triangle';
      this.osc1.frequency.setTargetAtTime(118 + pwr * 110, now, 0.1);
      this.osc2.frequency.setTargetAtTime(238 + pwr * 220, now, 0.1);
      this.oscFilter.frequency.setTargetAtTime(680 + pwr * 560, now, 0.1);
      this.oscGain.gain.setTargetAtTime(0.12 + pwr * 0.07, now, 0.1);

      this.subOsc.frequency.setTargetAtTime(62 + pwr * 42, now, 0.1);
      this.subGain.gain.setTargetAtTime(0.11 + pwr * 0.07, now, 0.1);

      this.jetRoarFilter.frequency.setTargetAtTime(750 + spdNorm * 650, now, 0.1);
      this.jetRoarGain.gain.setTargetAtTime(0.03 + spdNorm * 0.12, now, 0.1);
    } else {
      // === PESAWAT TEMPUR (Su-30MK2, F-16, Rafale, T-50i): Rekaman Jet Asli + Turbine Whine + Afterburner Roar! ===
      const sampleVol = 0.18 + pwr * 0.34 + spdNorm * 0.1;
      const sampleRate = 0.78 + pwr * 0.42 + spdNorm * 0.18;
      this.setFighterSample(true, sampleVol, sampleRate);

      this.masterGain.gain.setTargetAtTime(0.32 * pwr + 0.08, now, 0.08);
      this.noiseFilter.type = 'lowpass';
      this.noiseFilter.frequency.setTargetAtTime(340 + pwr * 1350 + spdNorm * 580, now, 0.08);
      this.noiseGain.gain.setTargetAtTime(0.55 + (pwr > 0.78 ? 0.25 : 0), now, 0.08);

      this.lfo.type = 'sine';
      this.lfo.frequency.setTargetAtTime(6.5, now, 0.1);
      this.lfoGain.gain.setTargetAtTime(0.04, now, 0.1);

      // Siulan kompresor turbin jet tempur tajam (680 - 1850 Hz)
      this.osc1.type = 'sine';
      this.osc2.type = 'triangle';
      this.osc1.frequency.setTargetAtTime(640 + pwr * 920 + spdNorm * 240, now, 0.08);
      this.osc2.frequency.setTargetAtTime(648 + pwr * 935 + spdNorm * 240, now, 0.08);
      this.oscFilter.frequency.setTargetAtTime(2800, now, 0.08);
      this.oscGain.gain.setTargetAtTime(0.045 + pwr * 0.04, now, 0.08);

      // Getaran rendah afterburner saat throttle tinggi (>75%)
      const abBoost = Math.max(0, (pwr - 0.72) / 0.28);
      this.subOsc.frequency.setTargetAtTime(52 + pwr * 38, now, 0.08);
      this.subGain.gain.setTargetAtTime(0.08 + abBoost * 0.22, now, 0.08);

      // Deru aliran jet kecepatan tinggi & afterburner
      this.jetRoarFilter.frequency.setTargetAtTime(1100 + pwr * 1200 + spdNorm * 700, now, 0.08);
      this.jetRoarGain.gain.setTargetAtTime(0.06 + pwr * 0.18 + abBoost * 0.24, now, 0.08);
    }

    // Alarm Peringatan Kokpit (STALL / PULL UP WARNING)
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
    this.setFighterSample(false, 0, 1);
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(0, now);
    }
  }
}

export const cockpitSimAudio = new CockpitSimAudio();
