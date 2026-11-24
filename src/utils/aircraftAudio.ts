import type { FlightMode } from '../store/useHangarStore';

export type SoundProfile =
  | 'fighter_single'
  | 'fighter_twin'
  | 'turboprop_heavy'
  | 'turboprop_light'
  | 'airliner'
  | 'helicopter'
  | 'gsuit'
  | 'helmet';

export function getSoundProfile(unitId: string): SoundProfile {
  switch (unitId) {
    case 'su30mk2':
    case 'su27skm':
    case 'rafale':
      return 'fighter_twin';
    case 'f16id':
    case 't50i':
    case 'hawk209':
      return 'fighter_single';
    case 'c130j':
      return 'turboprop_heavy';
    case 'supertucano':
    case 'kt1b':
      return 'turboprop_light';
    case 'b737vip':
      return 'airliner';
    case 'caracal':
      return 'helicopter';
    case 'colibri':
      return 'helicopter';
    case 'gsuit':
      return 'gsuit';
    case 'pilot-helmet':
      return 'helmet';
    default:
      return 'fighter_single';
  }
}

/**
 * Engine Audio Sintesis Real-Time (Web Audio API) khusus Hangar Virtual TNI AU.
 * Menghasilkan karakter suara autentik berbeda untuk tiap jenis pesawat:
 * Jet Tempur Tunggal, Jet Tempur Ganda (Afterburner), Super Hercules 4-Turboprop,
 * Turboprop Latih, Boeing 737 Turbofan, Helikopter 5-Bilah (Whop-Whop),
 * Pneumatik G-Suit 9G, serta HMDS Helm Pilot.
 */
class AircraftAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseGain: GainNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  private tone1: OscillatorNode | null = null;
  private tone2: OscillatorNode | null = null;
  private toneGain: GainNode | null = null;
  private lfo: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;
  private currentProfile: SoundProfile | null = null;
  private touchdownPlayed = false;
  private gearChimePlayed = false;

  /** Wajib dipanggil dari event klik pengguna agar AudioContext browser aktif. */
  unlock() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.setupGraph();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private setupGraph() {
    if (!this.ctx) return;
    const ctx = this.ctx;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0;
    this.masterGain.connect(ctx.destination);

    // 1. Sumber Noise (untuk deru jet, afterburner, hembusan baling-baling, rotor, & udara pneumatik)
    const bufferSize = ctx.sampleRate * 3;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Pink/brown-ish smooth noise agar deru mesin terasa tebal & tidak kasar
      lastOut = (lastOut + 0.06 * white) / 1.06;
      data[i] = lastOut * 2.4 + white * 0.28;
    }
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;
    noiseSrc.loop = true;

    this.noiseFilter = ctx.createBiquadFilter();
    this.noiseFilter.type = 'lowpass';
    this.noiseFilter.frequency.value = 400;
    this.noiseFilter.Q.value = 1.2;

    this.noiseGain = ctx.createGain();
    this.noiseGain.gain.value = 0.45;

    noiseSrc.connect(this.noiseFilter);
    this.noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.masterGain);
    noiseSrc.start();

    // 2. Dua Osilator Turbin / Baling-Baling (memungkinkan efek twin-engine detune & turbine whine)
    this.tone1 = ctx.createOscillator();
    this.tone2 = ctx.createOscillator();
    this.tone1.type = 'sawtooth';
    this.tone2.type = 'triangle';

    const toneFilter = ctx.createBiquadFilter();
    toneFilter.type = 'lowpass';
    toneFilter.frequency.value = 1800;

    this.toneGain = ctx.createGain();
    this.toneGain.gain.value = 0.12;

    this.tone1.connect(toneFilter);
    this.tone2.connect(toneFilter);
    toneFilter.connect(this.toneGain);
    this.toneGain.connect(this.masterGain);

    this.tone1.start();
    this.tone2.start();

    // 3. LFO (untuk denyut baling-baling turboprop, whop-whop helikopter, & denyut pneumatik 9G)
    this.lfo = ctx.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 8;

    this.lfoGain = ctx.createGain();
    this.lfoGain.gain.value = 0;

    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.noiseGain.gain);
    this.lfo.start();
  }

  /** Reset penanda one-shot SFX saat fase baru (Take Off / Landing) dimulai. */
  resetPhaseTriggers() {
    this.touchdownPlayed = false;
    this.gearChimePlayed = false;
  }

  /** Efek suara singkat ban menyentuh landasan (touchdown chirp + thump). */
  private playTouchdownSfx(isHeli: boolean) {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Thump hentakan suspensi
    const thump = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(95, now);
    thump.frequency.exponentialRampToValueAtTime(32, now + 0.22);
    thumpGain.gain.setValueAtTime(0.32, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    thump.connect(thumpGain);
    thumpGain.connect(ctx.destination);
    thump.start(now);
    thump.stop(now + 0.26);

    // Decit ban pesawat sayap tetap menyentuh aspal
    if (!isHeli) {
      const chirp = ctx.createOscillator();
      const chirpGain = ctx.createGain();
      chirp.type = 'triangle';
      chirp.frequency.setValueAtTime(1650, now);
      chirp.frequency.exponentialRampToValueAtTime(720, now + 0.18);
      chirpGain.gain.setValueAtTime(0.09, now);
      chirpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
      chirp.connect(chirpGain);
      chirpGain.connect(ctx.destination);
      chirp.start(now);
      chirp.stop(now + 0.2);
    }
  }

  /** Efek suara mekanik hidrolik saat roda pendarat mulai terlipat masuk / keluar. */
  private playGearServoSfx() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.linearRampToValueAtTime(360, now + 0.45);
    g.gain.setValueAtTime(0.035, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.52);
  }

  /** Dipanggil setiap frame oleh AircraftModel untuk menyelaraskan suara dengan animasi 3D. */
  update(unitId: string, flightMode: FlightMode, phaseTime: number, soundEnabled: boolean) {
    if (!this.ctx || !this.masterGain || !this.noiseFilter || !this.noiseGain || !this.tone1 || !this.tone2 || !this.toneGain || !this.lfo || !this.lfoGain) {
      return;
    }

    const now = this.ctx.currentTime;
    const active = soundEnabled && flightMode !== 'parked';

    if (!active) {
      this.masterGain.gain.setTargetAtTime(0, now, 0.18);
      return;
    }

    const profile = getSoundProfile(unitId);
    if (this.currentProfile !== profile) {
      this.currentProfile = profile;
      this.applyProfileWaveform(profile);
    }

    // Hitung intensitas throttle (0..1) berdasarkan fase Take Off / Landing / Simulasi Mesin
    let throttle = 0.6;
    let speedMod = 0;

    if (flightMode === 'takeoff') {
      if (phaseTime < 1.8) {
        throttle = 0.28 + (phaseTime / 1.8) * 0.7;
      } else if (phaseTime < 8.4) {
        throttle = 1.0;
        if (phaseTime > 6.3 && !this.gearChimePlayed) {
          this.gearChimePlayed = true;
          this.playGearServoSfx();
        }
      } else {
        throttle = 0.76 + Math.sin(phaseTime * 1.4) * 0.04;
      }
    } else if (flightMode === 'landing') {
      const isHeli = profile === 'helicopter';
      const touchTime = isHeli ? 5.8 : 5.4;
      const stopTime = isHeli ? 7.0 : 9.2;
      if (phaseTime < touchTime) {
        throttle = 0.62 - (phaseTime / touchTime) * 0.16;
        if (phaseTime > 1.0 && !this.gearChimePlayed) {
          this.gearChimePlayed = true;
          this.playGearServoSfx();
        }
      } else if (phaseTime < stopTime) {
        if (!this.touchdownPlayed) {
          this.touchdownPlayed = true;
          this.playTouchdownSfx(isHeli);
        }
        // Thrust reverser / deselerasi halus sampai berhenti
        const p = Math.min(1, (phaseTime - touchTime) / (stopTime - touchTime));
        throttle = isHeli ? 0.42 * (1 - p * 0.72) : 0.66 * (1 - p * 0.8);
      } else {
        throttle = 0.06;
      }
    } else if (flightMode === 'airborne') {
      throttle = 0.74 + Math.sin(phaseTime * 1.3) * 0.04;
      speedMod = 0.02;
    } else if (flightMode === 'maneuver' || flightMode === 'engineSim') {
      const cycle = phaseTime % 20;
      if (cycle < 5) {
        // Barrel / Aileron Roll -> high energy!
        throttle = 0.9 + Math.sin((cycle / 5) * Math.PI) * 0.1;
        speedMod = 0.14;
      } else if (cycle < 10) {
        // High-G Combat Break -> afterburner sustain
        throttle = 0.88 + Math.sin(((cycle - 5) / 5) * Math.PI) * 0.12;
        speedMod = 0.08;
      } else if (cycle < 15) {
        // Cobra / High-AoA Climb -> full afterburner roar!
        throttle = 0.94 + Math.sin(((cycle - 10) / 5) * Math.PI) * 0.06;
        speedMod = 0.22;
      } else {
        // Tactical Dive & Pull-Up
        throttle = 0.78 + Math.sin(((cycle - 15) / 5) * Math.PI) * 0.18;
        speedMod = -0.1;
      }
    }

    // Terapkan parameter akustik spesifik tiap pesawat
    switch (profile) {
      case 'fighter_single': {
        this.masterGain.gain.setTargetAtTime(0.32 * throttle, now, 0.12);
        this.noiseFilter.type = 'lowpass';
        this.noiseFilter.frequency.setTargetAtTime(320 + throttle * 1150, now, 0.1);
        this.noiseGain.gain.setTargetAtTime(0.65, now, 0.1);
        this.tone1.frequency.setTargetAtTime(420 + throttle * 620 + speedMod * 120, now, 0.12);
        this.tone2.frequency.setTargetAtTime(840 + throttle * 980 + speedMod * 180, now, 0.12);
        this.toneGain.gain.setTargetAtTime(0.08 * throttle, now, 0.12);
        this.lfoGain.gain.setTargetAtTime(0.04, now, 0.1);
        this.lfo.frequency.setTargetAtTime(14, now, 0.1);
        break;
      }
      case 'fighter_twin': {
        // Deru mesin ganda lebih dalam, berat, dengan efek beating twin-engine khas Sukhoi & Rafale
        this.masterGain.gain.setTargetAtTime(0.36 * throttle, now, 0.12);
        this.noiseFilter.type = 'lowpass';
        this.noiseFilter.frequency.setTargetAtTime(240 + throttle * 980, now, 0.1);
        this.noiseGain.gain.setTargetAtTime(0.75, now, 0.1);
        this.tone1.frequency.setTargetAtTime(290 + throttle * 460 + speedMod * 90, now, 0.12);
        this.tone2.frequency.setTargetAtTime(296 + throttle * 468 + speedMod * 90, now, 0.12); // detune 6-8 Hz!
        this.toneGain.gain.setTargetAtTime(0.11 * throttle, now, 0.12);
        this.lfoGain.gain.setTargetAtTime(0.06, now, 0.1);
        this.lfo.frequency.setTargetAtTime(7.5, now, 0.1);
        break;
      }
      case 'turboprop_heavy': {
        // C-130J Super Hercules: 4 baling-baling berat bergetar rendah & mantap
        this.masterGain.gain.setTargetAtTime(0.34 * throttle, now, 0.12);
        this.noiseFilter.type = 'bandpass';
        this.noiseFilter.frequency.setTargetAtTime(180 + throttle * 320, now, 0.1);
        this.noiseGain.gain.setTargetAtTime(0.55, now, 0.1);
        this.tone1.frequency.setTargetAtTime(68 + throttle * 44 + speedMod * 10, now, 0.12);
        this.tone2.frequency.setTargetAtTime(138 + throttle * 88 + speedMod * 20, now, 0.12);
        this.toneGain.gain.setTargetAtTime(0.18 * throttle, now, 0.12);
        this.lfo.frequency.setTargetAtTime(11 + throttle * 7, now, 0.1);
        this.lfoGain.gain.setTargetAtTime(0.24, now, 0.1);
        break;
      }
      case 'turboprop_light': {
        // Super Tucano & KT-1B Wong Bee: baling-baling turboprop lincah & renyah
        this.masterGain.gain.setTargetAtTime(0.30 * throttle, now, 0.12);
        this.noiseFilter.type = 'bandpass';
        this.noiseFilter.frequency.setTargetAtTime(260 + throttle * 480, now, 0.1);
        this.noiseGain.gain.setTargetAtTime(0.45, now, 0.1);
        this.tone1.frequency.setTargetAtTime(98 + throttle * 72 + speedMod * 18, now, 0.12);
        this.tone2.frequency.setTargetAtTime(200 + throttle * 145 + speedMod * 30, now, 0.12);
        this.toneGain.gain.setTargetAtTime(0.16 * throttle, now, 0.12);
        this.lfo.frequency.setTargetAtTime(16 + throttle * 10, now, 0.1);
        this.lfoGain.gain.setTargetAtTime(0.18, now, 0.1);
        break;
      }
      case 'airliner': {
        // Boeing 737 VIP: dengung turbofan halus high-bypass khas pesawat komersial/VIP
        this.masterGain.gain.setTargetAtTime(0.28 * throttle, now, 0.14);
        this.noiseFilter.type = 'lowpass';
        this.noiseFilter.frequency.setTargetAtTime(260 + throttle * 720, now, 0.12);
        this.noiseGain.gain.setTargetAtTime(0.58, now, 0.12);
        this.tone1.frequency.setTargetAtTime(220 + throttle * 380 + speedMod * 60, now, 0.14);
        this.tone2.frequency.setTargetAtTime(445 + throttle * 760 + speedMod * 120, now, 0.14);
        this.toneGain.gain.setTargetAtTime(0.07 * throttle, now, 0.14);
        this.lfoGain.gain.setTargetAtTime(0.02, now, 0.1);
        break;
      }
      case 'helicopter': {
        // H225M Caracal: suara ikonik "whop-whop-whop" 5 bilah rotor utama + turbin Makila
        this.masterGain.gain.setTargetAtTime(0.38 * throttle, now, 0.12);
        this.noiseFilter.type = 'lowpass';
        this.noiseFilter.frequency.setTargetAtTime(170 + throttle * 260, now, 0.1);
        this.noiseGain.gain.setTargetAtTime(0.62, now, 0.1);
        this.tone1.frequency.setTargetAtTime(52 + throttle * 22, now, 0.12);
        this.tone2.frequency.setTargetAtTime(760 + throttle * 480, now, 0.12); // turbine whine
        this.toneGain.gain.setTargetAtTime(0.06 * throttle, now, 0.12);
        this.lfo.frequency.setTargetAtTime(5.5 + throttle * 5.8, now, 0.1); // whop-whop tempo!
        this.lfoGain.gain.setTargetAtTime(0.45, now, 0.1);
        break;
      }
      case 'gsuit': {
        // Desis udara pneumatik katup Anti-G memompa kantung perut/paha/betis
        const pulse = 0.5 + 0.5 * Math.sin(phaseTime * 3.4);
        this.masterGain.gain.setTargetAtTime(0.20, now, 0.1);
        this.noiseFilter.type = 'highpass';
        this.noiseFilter.frequency.setTargetAtTime(1100 + pulse * 1400, now, 0.08);
        this.noiseGain.gain.setTargetAtTime(0.22 + pulse * 0.35, now, 0.08);
        this.tone1.frequency.setTargetAtTime(340 + pulse * 120, now, 0.1);
        this.tone2.frequency.setTargetAtTime(680, now, 0.1);
        this.toneGain.gain.setTargetAtTime(0.025 * pulse, now, 0.1);
        this.lfoGain.gain.setTargetAtTime(0.05, now, 0.1);
        break;
      }
      case 'helmet': {
        // Suara aliran oksigen OBOGS halus + nada kunci target HMDS
        const pulse = 0.5 + 0.5 * Math.sin(phaseTime * 3.2);
        this.masterGain.gain.setTargetAtTime(0.18, now, 0.1);
        this.noiseFilter.type = 'bandpass';
        this.noiseFilter.frequency.setTargetAtTime(900 + pulse * 500, now, 0.1);
        this.noiseGain.gain.setTargetAtTime(0.18 + pulse * 0.16, now, 0.1);
        this.tone1.frequency.setTargetAtTime(880 + (pulse > 0.7 ? 220 : 0), now, 0.06);
        this.tone2.frequency.setTargetAtTime(1320, now, 0.06);
        this.toneGain.gain.setTargetAtTime(0.045, now, 0.08);
        this.lfoGain.gain.setTargetAtTime(0.03, now, 0.1);
        break;
      }
    }
  }

  private applyProfileWaveform(profile: SoundProfile) {
    if (!this.tone1 || !this.tone2) return;
    if (profile === 'turboprop_heavy' || profile === 'turboprop_light') {
      this.tone1.type = 'sawtooth';
      this.tone2.type = 'sawtooth';
    } else if (profile === 'airliner' || profile === 'gsuit' || profile === 'helmet') {
      this.tone1.type = 'sine';
      this.tone2.type = 'triangle';
    } else {
      this.tone1.type = 'sawtooth';
      this.tone2.type = 'triangle';
    }
  }

  stop() {
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.12);
    }
  }
}

export const aircraftAudio = new AircraftAudioEngine();
