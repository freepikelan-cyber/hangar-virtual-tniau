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
    case 'a4skyhawk':
      return 'fighter_single';
    case 'c130j':
    case 'a400m':
    case 'cn295':
    case 'cn235':
      return 'turboprop_heavy';
    case 'supertucano':
    case 'kt1b':
    case 'c212':
    case 'g120tp':
    case 'c182':
    case 't41':
      return 'turboprop_light';
    case 'b737vip':
    case 'falcon8x':
    case 'a330mrtt':
    case 'sgs233':
    case 'dg1000':
      return 'airliner';
    case 'caracal':
    case 'colibri':
    case 'superpuma':
    case 'aw101':
    case 'h145':
    case 'as365':
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
  private atcStartPlayed = false;
  private atcVacatePlayed = false;
  private atcBuffers = new Map<string, AudioBuffer>();
  private atcLoading = new Set<string>();
  private activeAtcSrc: AudioBufferSourceNode | null = null;
  private activeAtcCarrier: AudioBufferSourceNode | null = null;
  private radioCurve: Float32Array | null = null;

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
    // Preload rekaman suara ATC asli agar langsung siap saat Take Off & Landing tanpa jeda
    void this.preloadAtc('takeoff');
    void this.preloadAtc('landing');
    void this.preloadAtc('vacate');
  }

  private async preloadAtc(key: 'takeoff' | 'landing' | 'vacate'): Promise<AudioBuffer | null> {
    if (!this.ctx) return null;
    const cached = this.atcBuffers.get(key);
    if (cached) return cached;
    if (this.atcLoading.has(key)) return null;
    this.atcLoading.add(key);
    try {
      const res = await fetch(`/audio/atc-${key}.mp3`);
      if (!res.ok) return null;
      const arr = await res.arrayBuffer();
      const decoded = await this.ctx.decodeAudioData(arr);
      this.atcBuffers.set(key, decoded);
      return decoded;
    } catch {
      return null;
    } finally {
      this.atcLoading.delete(key);
    }
  }

  private getRadioDistortionCurve(): Float32Array {
    if (this.radioCurve) return this.radioCurve;
    const samples = 512;
    const curve = new Float32Array(samples);
    const drive = 5.8; // saturasi & grit autentik khas transmisi radio AM VHF kokpit
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = Math.tanh(x * drive) / Math.tanh(drive);
    }
    this.radioCurve = curve;
    return curve;
  }

  /** Membuat buffer noise radio VHF dengan desis + kresek (crackle) autentik khas radio penerbangan. */
  private createRadioCrackleSource(durationSec: number): AudioBufferSourceNode | null {
    if (!this.ctx) return null;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * durationSec));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      // Desis dasar VHF + impuls kresek/pop statis acak khas sinyal radio AM udara
      const base = (Math.random() * 2 - 1) * 0.42;
      const crackle = Math.random() > 0.992 ? (Math.random() * 2 - 1) * 1.45 : 0;
      ch[i] = Math.max(-1, Math.min(1, base + crackle));
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    return src;
  }

  private stopAtcPlayback() {
    try {
      this.activeAtcSrc?.stop();
    } catch {
      // already stopped
    }
    try {
      this.activeAtcCarrier?.stop();
    } catch {
      // already stopped
    }
    this.activeAtcSrc = null;
    this.activeAtcCarrier = null;
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

  /** Reset penanda one-shot SFX & transmisi ATC saat fase baru (Take Off / Landing) dimulai. */
  resetPhaseTriggers() {
    this.touchdownPlayed = false;
    this.gearChimePlayed = false;
    this.atcStartPlayed = false;
    this.atcVacatePlayed = false;
    this.stopAtcPlayback();
  }

  /** Efek "KRRSSHH" squelch statis radio VHF yang tegas saat saluran ATC dibuka & ditutup. */
  private playRadioSquelch(delaySec = 0) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const start = ctx.currentTime + delaySec;
    const src = this.createRadioCrackleSource(0.16);
    if (!src) return;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1650, start);
    bp.Q.value = 1.6;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, start);
    g.gain.linearRampToValueAtTime(0.24, start + 0.012);
    g.gain.setValueAtTime(0.2, start + 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, start + 0.155);

    src.connect(bp);
    bp.connect(g);
    g.connect(ctx.destination);
    src.start(start);
    src.stop(start + 0.16);
  }

  /**
   * Memutar rekaman suara ATC realistis melalui rantai DSP Radio Kokpit VHF asli:
   * Highpass 520 Hz -> Lowpass 2300 Hz -> Presence 1550 Hz -> Saturasi AM Radio + Kresek Statis VHF nyata!
   */
  private playAtcRadio(key: 'takeoff' | 'landing' | 'vacate') {
    if (!this.ctx) return;
    const run = (buffer: AudioBuffer) => {
      if (!this.ctx) return;
      const ctx = this.ctx;
      this.stopAtcPlayback();

      const now = ctx.currentTime;
      const rate = 1.07; // tempo tegas & cepat khas petugas menara ATC sungguhan
      const dur = buffer.duration / rate;

      // 1. PTT Squelch "KRRSSHH" pembuka & penutup saluran radio
      this.playRadioSquelch(0);
      this.playRadioSquelch(dur + 0.08);

      // 2. Sumber suara manusia + desis kresek VHF digabung masuk ke filter radio yang sama!
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.value = rate;

      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 520;
      hp.Q.value = 1.1;

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2300;
      lp.Q.value = 1.25;

      const peak = ctx.createBiquadFilter();
      peak.type = 'peaking';
      peak.frequency.value = 1550;
      peak.Q.value = 1.6;
      peak.gain.value = 7.0;

      const shaper = ctx.createWaveShaper();
      shaper.curve = this.getRadioDistortionCurve();
      shaper.oversample = '2x';

      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -24;
      comp.ratio.value = 8;
      comp.attack.value = 0.003;
      comp.release.value = 0.1;

      const outGain = ctx.createGain();
      outGain.gain.value = 0.88;

      src.connect(hp);

      // 3. Latar "ngeresek" statis & crackle VHF masuk langsung ke rantai radio agar menyatu organik dengan suara ATC!
      const carrier = this.createRadioCrackleSource(dur + 0.16);
      if (carrier) {
        const cGain = ctx.createGain();
        cGain.gain.setValueAtTime(0.14, now + 0.04);
        cGain.gain.setValueAtTime(0.14, now + dur + 0.06);
        cGain.gain.exponentialRampToValueAtTime(0.001, now + dur + 0.16);
        carrier.connect(cGain);
        cGain.connect(hp);
        carrier.start(now + 0.04);
        carrier.stop(now + dur + 0.17);
        this.activeAtcCarrier = carrier;
      }

      hp.connect(lp);
      lp.connect(peak);
      peak.connect(shaper);
      shaper.connect(comp);
      comp.connect(outGain);
      outGain.connect(ctx.destination);

      src.start(now + 0.08);
      this.activeAtcSrc = src;
    };

    const cached = this.atcBuffers.get(key);
    if (cached) {
      run(cached);
    } else {
      void this.preloadAtc(key).then((buf) => {
        if (buf) run(buf);
      });
    }
  }

  /** Helper membuat buffer white noise pendek untuk sintesis akustik realistis (non-arcade). */
  private createNoiseSource(durationSec: number): AudioBufferSourceNode | null {
    if (!this.ctx) return null;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * durationSec));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      ch[i] = Math.random() * 2 - 1;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    return src;
  }

  /**
   * Efek akustik realistis saat roda menyentuh aspal runway (filtered noise — bukan beep/oscillator game):
   * 1. Hentakan suspensi oleo-strut & ban berat (sub-bass lowpass noise)
   * 2. Gesekan singkat karet ban di aspal (narrow bandpass noise, khusus sayap tetap)
   * 3. Getaran halus roda menggelinding di aspal (lowpass rollout rumble)
   */
  private playTouchdownSfx(isHeli: boolean) {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // 1. Hentakan suspensi & ban berat (lowpass noise 115 Hz -> 48 Hz)
    const impactSrc = this.createNoiseSource(0.35);
    if (impactSrc) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(120, now);
      lp.frequency.exponentialRampToValueAtTime(48, now + 0.28);
      lp.Q.value = 0.8;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.42, now + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      impactSrc.connect(lp);
      lp.connect(g);
      g.connect(ctx.destination);
      impactSrc.start(now);
      impactSrc.stop(now + 0.34);
    }

    // 2. Gesekan karet ban di aspal (bandpass filtered noise realistis — bukan suara game!)
    if (!isHeli) {
      const screechSrc = this.createNoiseSource(0.22);
      if (screechSrc) {
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(2250, now);
        bp.frequency.exponentialRampToValueAtTime(1750, now + 0.16);
        bp.Q.value = 7.5;

        const g = ctx.createGain();
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(0.085, now + 0.018);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.17);

        screechSrc.connect(bp);
        bp.connect(g);
        g.connect(ctx.destination);
        screechSrc.start(now);
        screechSrc.stop(now + 0.2);
      }

      // 3. Getaran ban menggelinding di aspal saat pengereman awal
      const rollSrc = this.createNoiseSource(1.6);
      if (rollSrc) {
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(145, now);
        lp.frequency.linearRampToValueAtTime(80, now + 1.5);

        const g = ctx.createGain();
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(0.14, now + 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, now + 1.55);

        rollSrc.connect(lp);
        lp.connect(g);
        g.connect(ctx.destination);
        rollSrc.start(now);
        rollSrc.stop(now + 1.58);
      }
    }
  }

  /** Efek suara hidrolik realistis saat roda pendarat terlipat/turun (desis fluida + kunci mekanik lembut). */
  private playGearServoSfx() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Desis tekanan hidrolik halus
    const hissSrc = this.createNoiseSource(0.5);
    if (hissSrc) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(920, now);
      bp.Q.value = 2.2;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.032, now + 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      hissSrc.connect(bp);
      bp.connect(g);
      g.connect(ctx.destination);
      hissSrc.start(now);
      hissSrc.stop(now + 0.48);
    }

    // Bunyi kunci mekanik lembut saat roda terkunci (gear down-lock clunk)
    const lockSrc = this.createNoiseSource(0.14);
    if (lockSrc) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(130, now + 0.36);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, now + 0.36);
      g.gain.linearRampToValueAtTime(0.14, now + 0.375);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.48);

      lockSrc.connect(lp);
      lp.connect(g);
      g.connect(ctx.destination);
      lockSrc.start(now + 0.36);
      lockSrc.stop(now + 0.5);
    }
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
      const isHeli = profile === 'helicopter';
      const atcTime = isHeli ? 2.6 : 4.2;
      const rollStart = isHeli ? 4.4 : 5.8;
      const gearUpTime = isHeli ? 6.8 : 10.4;

      if (phaseTime > atcTime && !this.atcStartPlayed) {
        this.atcStartPlayed = true;
        this.playAtcRadio('takeoff');
      }
      if (phaseTime < atcTime) {
        // Taxi keluar dari hanggar: tenaga mesin taxi rendah & halus
        throttle = 0.24 + Math.sin(phaseTime * 2) * 0.03;
      } else if (phaseTime < rollStart) {
        // Spool-up full power di garis start Runway 09
        const p = (phaseTime - atcTime) / (rollStart - atcTime);
        throttle = 0.28 + p * 0.72;
      } else if (phaseTime < 12.2) {
        throttle = 1.0;
        if (phaseTime > gearUpTime && !this.gearChimePlayed) {
          this.gearChimePlayed = true;
          this.playGearServoSfx();
        }
      } else {
        throttle = 0.76 + Math.sin(phaseTime * 1.4) * 0.04;
      }
    } else if (flightMode === 'landing') {
      if (phaseTime > 0.15 && !this.atcStartPlayed) {
        this.atcStartPlayed = true;
        this.playAtcRadio('landing');
      }
      const isHeli = profile === 'helicopter';
      const touchTime = isHeli ? 5.8 : 6.0;
      const stopTime = isHeli ? 6.4 : 12.2;
      const vacateTime = isHeli ? 6.1 : 12.2;
      if (phaseTime > vacateTime && !this.atcVacatePlayed) {
        this.atcVacatePlayed = true;
        this.playAtcRadio('vacate');
      }
      if (phaseTime < touchTime) {
        throttle = 0.62 - (phaseTime / touchTime) * 0.16;
        if (phaseTime > 1.2 && !this.gearChimePlayed) {
          this.gearChimePlayed = true;
          this.playGearServoSfx();
        }
      } else if (phaseTime < stopTime) {
        if (!this.touchdownPlayed) {
          this.touchdownPlayed = true;
          this.playTouchdownSfx(isHeli);
        }
        // Thrust reverser & pengereman panjang mulus sampai berhenti di runway
        const p = Math.min(1, (phaseTime - touchTime) / (stopTime - touchTime));
        throttle = isHeli ? 0.42 * (1 - p * 0.55) : 0.72 * (1 - p * 0.76);
      } else {
        // Berhenti sejenak -> taxi pelan masuk hanggar -> idle mati
        const taxiEnd = isHeli ? 8.6 : 19.2;
        if (phaseTime < taxiEnd) {
          throttle = 0.21;
        } else {
          const idleP = Math.min(1, (phaseTime - taxiEnd) / 1.2);
          throttle = Math.max(0.03, 0.16 * (1 - idleP * 0.8));
        }
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
    this.stopAtcPlayback();
  }
}

export const aircraftAudio = new AircraftAudioEngine();
