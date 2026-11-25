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

export interface TakeOffTiming {
  voiceStart: number;
  rollStart: number;
  rotStart: number;
  climbStart: number;
  airborneStart: number;
}

/**
 * Penyelarasan timing Take Off (detik) agar pesawat BERHENTI mantap di runway sampai
 * aba-aba "Rolling / Afterburner on / Power set" benar-benar terucap di rekaman suara kokpit!
 */
export function getTakeOffTiming(unitId: string): TakeOffTiming {
  const profile = getSoundProfile(unitId);
  const isFighter = profile === 'fighter_single' || profile === 'fighter_twin';
  const isVvip = unitId === 'b737vip' || unitId === 'falcon8x';
  const isCargoTransport =
    unitId === 'c130j' ||
    unitId === 'a400m' ||
    unitId === 'cn295' ||
    unitId === 'cn235' ||
    unitId === 'c212' ||
    unitId === 'a330mrtt';

  if (isFighter) {
    // 6.0s mulai suara -> 10.6s "Afterburner on, rolling" -> 14.3s "Full throttle, airborne"
    return { voiceStart: 6.0, rollStart: 10.6, rotStart: 14.2, climbStart: 16.0, airborneStart: 18.4 };
  }
  if (isCargoTransport) {
    // 6.0s mulai suara -> 14.4s "Power set" -> 16.4s "Rotate!"
    return { voiceStart: 6.0, rollStart: 14.4, rotStart: 16.4, climbStart: 18.3, airborneStart: 20.6 };
  }
  if (isVvip) {
    // 6.0s mulai suara -> 10.8s "Rolling" -> 14.2s Rotation & Liftoff
    return { voiceStart: 6.0, rollStart: 10.8, rotStart: 14.2, climbStart: 16.0, airborneStart: 18.4 };
  }
  return { voiceStart: 6.0, rollStart: 7.6, rotStart: 10.8, climbStart: 12.5, airborneStart: 14.8 };
}

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
  private transportCruisePlayed = false;
  private atcBuffers = new Map<string, AudioBuffer>();
  private atcLoading = new Set<string>();
  private activeAtcSrc: AudioBufferSourceNode | null = null;
  private activeAtcCarrier: AudioBufferSourceNode | null = null;
  private radioCurve: Float32Array | null = null;

  // Rekaman audio asli pesawat tempur (Take Off, Terbang, & Taxiway)
  private jetBuffers = new Map<'takeoff' | 'fly' | 'taxi', AudioBuffer>();
  private jetLoading = new Set<'takeoff' | 'fly' | 'taxi'>();
  private activeJetKey: 'takeoff' | 'fly' | 'taxi' | null = null;
  private activeJetSrc: AudioBufferSourceNode | null = null;
  private activeJetGain: GainNode | null = null;

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
    // Preload rekaman suara ATC & suara asli pesawat tempur (Take Off, Terbang, Taxiway)
    void this.preloadAtc('takeoff');
    void this.preloadAtc('landing');
    void this.preloadAtc('vacate');
    void this.preloadAtc('vvip-escort');
    void this.preloadAtc('fighter-takeoff');
    void this.preloadAtc('fighter-maneuver');
    void this.preloadAtc('fighter-landing');
    void this.preloadAtc('transport-takeoff');
    void this.preloadAtc('transport-cruise');
    void this.preloadAtc('transport-landing');
    void this.preloadAtc('transport-airdrop');
    void this.preloadAtc('vvip-takeoff');
    void this.preloadAtc('vvip-welcome');
    void this.preloadAtc('vvip-reply');
    void this.preloadAtc('vvip-landing');
    void this.preloadJetAudio('taxi');
    void this.preloadJetAudio('takeoff');
    void this.preloadJetAudio('fly');
  }

  /**
   * Membuat AudioBuffer loop yang 100% mulus tanpa jeda/putus-putus (equal-power overlap crossfade)
   * dengan memangkas bagian sunyi awal/akhir rekaman asli.
   */
  private makeSeamlessLoopBuffer(raw: AudioBuffer, trimStartSec: number, trimEndSec: number, xfadeSec: number): AudioBuffer {
    if (!this.ctx) return raw;
    const sr = raw.sampleRate;
    const startIdx = Math.min(raw.length - 1, Math.max(0, Math.floor(trimStartSec * sr)));
    const endIdx = Math.max(startIdx + sr, Math.min(raw.length, raw.length - Math.floor(trimEndSec * sr)));
    const xfadeSamples = Math.min(Math.floor(xfadeSec * sr), Math.floor((endIdx - startIdx) * 0.3));
    const outLen = Math.max(sr, endIdx - startIdx - xfadeSamples);

    const out = this.ctx.createBuffer(raw.numberOfChannels, outLen, sr);
    for (let ch = 0; ch < raw.numberOfChannels; ch++) {
      const src = raw.getChannelData(ch);
      const dst = out.getChannelData(ch);
      // Salin isi utama
      for (let i = 0; i < outLen; i++) {
        dst[i] = src[startIdx + i];
      }
      // Equal-power crossfade bagian ekor (tail) ke bagian awal (head) agar sambungan loop 100% tak terdengar!
      for (let i = 0; i < xfadeSamples; i++) {
        const t = i / xfadeSamples;
        const fadeIn = Math.sin(t * Math.PI * 0.5);
        const fadeOut = Math.cos(t * Math.PI * 0.5);
        const headSample = src[startIdx + i];
        const tailSample = src[startIdx + outLen + i];
        dst[i] = headSample * fadeIn + tailSample * fadeOut;
      }
    }
    return out;
  }

  private async preloadJetAudio(key: 'takeoff' | 'fly' | 'taxi'): Promise<AudioBuffer | null> {
    if (!this.ctx) return null;
    const cached = this.jetBuffers.get(key);
    if (cached) return cached;
    if (this.jetLoading.has(key)) return null;
    this.jetLoading.add(key);
    try {
      const res = await fetch(`/audio/fighter-${key}.mp3`);
      if (!res.ok) return null;
      const arr = await res.arrayBuffer();
      const raw = await this.ctx.decodeAudioData(arr);
      // Proses seamless crossfade loop untuk 'fly' & 'taxi' agar TIDAK PERNAH putus-putus!
      const processed =
        key === 'fly'
          ? this.makeSeamlessLoopBuffer(raw, 0.55, 0.75, 1.35)
          : key === 'taxi'
            ? this.makeSeamlessLoopBuffer(raw, 0.85, 0.9, 1.6)
            : raw;
      this.jetBuffers.set(key, processed);
      return processed;
    } catch {
      return null;
    } finally {
      this.jetLoading.delete(key);
    }
  }

  private stopJetSample(fadeSec = 0.75) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const oldSrc = this.activeJetSrc;
    const oldGain = this.activeJetGain;
    this.activeJetSrc = null;
    this.activeJetGain = null;
    this.activeJetKey = null;
    if (oldGain) {
      try {
        oldGain.gain.cancelScheduledValues(now);
        oldGain.gain.setValueAtTime(Math.max(0.0001, oldGain.gain.value), now);
        oldGain.gain.exponentialRampToValueAtTime(0.0001, now + fadeSec);
      } catch {
        // ignore
      }
    }
    if (oldSrc) {
      setTimeout(() => {
        try {
          oldSrc.stop();
        } catch {
          // already stopped
        }
      }, Math.max(120, Math.ceil((fadeSec + 0.08) * 1000)));
    }
  }

  /** Memutar & melakukan crossfade panjang & mulus (0.85s) antar rekaman audio asli pesawat tempur. */
  private updateJetSample(desiredKey: 'takeoff' | 'fly' | 'taxi', targetVol: number, playbackRate = 1.0): boolean {
    if (!this.ctx) return false;
    const buf = this.jetBuffers.get(desiredKey);
    if (!buf) {
      void this.preloadJetAudio(desiredKey);
      return false;
    }
    const now = this.ctx.currentTime;
    if (this.activeJetKey !== desiredKey || !this.activeJetSrc || !this.activeJetGain) {
      const xfade = 0.85;
      this.stopJetSample(xfade);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      if (desiredKey === 'takeoff') {
        // Untuk Take Off: mulai dari 0 (spool-up -> afterburner), dan jika masih menanjak loop mulus di zona raungan penuh!
        src.loopStart = Math.min(4.2, buf.duration * 0.28);
        src.loopEnd = Math.max(src.loopStart + 2.0, buf.duration - 1.4);
      }
      src.playbackRate.value = playbackRate;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(Math.max(0.001, targetVol), now + xfade);

      src.connect(gain);
      gain.connect(this.ctx.destination);
      src.start(now);

      this.activeJetKey = desiredKey;
      this.activeJetSrc = src;
      this.activeJetGain = gain;
    } else {
      this.activeJetGain.gain.setTargetAtTime(Math.max(0.0001, targetVol), now, 0.22);
      this.activeJetSrc.playbackRate.setTargetAtTime(playbackRate, now, 0.24);
    }
    return true;
  }

  private async preloadAtc(
    key:
      | 'takeoff'
      | 'landing'
      | 'vacate'
      | 'vvip-escort'
      | 'fighter-takeoff'
      | 'fighter-maneuver'
      | 'fighter-landing'
      | 'transport-takeoff'
      | 'transport-cruise'
      | 'transport-landing'
      | 'transport-airdrop'
      | 'vvip-takeoff'
      | 'vvip-welcome'
      | 'vvip-reply'
      | 'vvip-landing',
  ): Promise<AudioBuffer | null> {
    if (!this.ctx) return null;
    const cached = this.atcBuffers.get(key);
    if (cached) return cached;
    if (this.atcLoading.has(key)) return null;
    this.atcLoading.add(key);
    try {
      const url =
        key === 'vvip-escort'
          ? '/audio/vvip-escort.mp3'
          : key === 'fighter-takeoff'
            ? '/audio/fighter-voice-takeoff.wav'
            : key === 'fighter-maneuver'
              ? '/audio/fighter-voice-maneuver.wav'
              : key === 'fighter-landing'
                ? '/audio/fighter-voice-landing.wav'
                : key === 'transport-takeoff'
                  ? '/audio/transport-voice-takeoff.wav'
                  : key === 'transport-cruise'
                    ? '/audio/transport-voice-cruise.wav'
                    : key === 'transport-landing'
                      ? '/audio/transport-voice-landing.wav'
                      : key === 'transport-airdrop'
                        ? '/audio/transport-voice-airdrop.wav'
                        : key === 'vvip-takeoff'
                          ? '/audio/vvip-voice-takeoff.wav'
                          : key === 'vvip-welcome'
                            ? '/audio/vvip-voice-welcome.wav'
                            : key === 'vvip-reply'
                              ? '/audio/vvip-voice-reply.wav'
                              : key === 'vvip-landing'
                                ? '/audio/vvip-voice-landing.wav'
                                : `/audio/atc-${key}.mp3`;
      const res = await fetch(url);
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
    this.transportCruisePlayed = false;
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
   * Memutar rekaman suara ATC / Radio Kokpit realistis melalui rantai DSP Radio Kokpit VHF asli:
   * Highpass 520 Hz -> Lowpass 2300 Hz -> Presence 1550 Hz -> Saturasi AM Radio + Kresek Statis VHF nyata!
   */
  private playAtcRadio(
    key:
      | 'takeoff'
      | 'landing'
      | 'vacate'
      | 'vvip-escort'
      | 'fighter-takeoff'
      | 'fighter-maneuver'
      | 'fighter-landing'
      | 'transport-takeoff'
      | 'transport-cruise'
      | 'transport-landing'
      | 'transport-airdrop'
      | 'vvip-takeoff'
      | 'vvip-welcome'
      | 'vvip-reply'
      | 'vvip-landing',
  ) {
    if (!this.ctx) return;
    const run = (buffer: AudioBuffer) => {
      if (!this.ctx) return;
      const ctx = this.ctx;
      this.stopAtcPlayback();

      const now = ctx.currentTime;
      const isVvipVoice =
        key.startsWith('vvip-') ||
        key.startsWith('fighter-') ||
        key.startsWith('transport-');
      const rate = isVvipVoice ? 1.0 : 1.07; // Kecepatan asli 1.0 untuk rekaman suara manusia asli kokpit!
      const dur = buffer.duration / rate;

      // 1. PTT Squelch "KRRSSHH" pembuka & penutup saluran radio kokpit
      this.playRadioSquelch(0);
      this.playRadioSquelch(dur + 0.08);

      // 2. Sumber suara manusia + desis kresek VHF digabung masuk ke filter radio kokpit!
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.value = rate;

      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = isVvipVoice ? 420 : 520;
      hp.Q.value = isVvipVoice ? 0.95 : 1.1;

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = isVvipVoice ? 2750 : 2300;
      lp.Q.value = isVvipVoice ? 1.1 : 1.25;

      const peak = ctx.createBiquadFilter();
      peak.type = 'peaking';
      peak.frequency.value = 1600;
      peak.Q.value = 1.5;
      peak.gain.value = isVvipVoice ? 5.2 : 7.0;

      const shaper = ctx.createWaveShaper();
      shaper.curve = this.getRadioDistortionCurve();
      shaper.oversample = '2x';

      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -24;
      comp.ratio.value = isVvipVoice ? 6 : 8;
      comp.attack.value = 0.004;
      comp.release.value = 0.11;

      const outGain = ctx.createGain();
      outGain.gain.value = isVvipVoice ? 1.0 : 0.88;

      src.connect(hp);

      // 3. Latar "ngeresek" statis radio VHF & sedikit dengung kokpit khas transmisi dari masker oksigen pilot
      const carrier = this.createRadioCrackleSource(dur + 0.16);
      if (carrier) {
        const cGain = ctx.createGain();
        const noiseLvl = isVvipVoice ? 0.085 : 0.14;
        cGain.gain.setValueAtTime(noiseLvl, now + 0.04);
        cGain.gain.setValueAtTime(noiseLvl, now + dur + 0.06);
        cGain.gain.exponentialRampToValueAtTime(0.001, now + dur + 0.16);
        carrier.connect(cGain);
        cGain.connect(hp);
        carrier.start(now + 0.04);
        carrier.stop(now + dur + 0.17);
        this.activeAtcCarrier = carrier;
      }

      hp.connect(lp);
      lp.connect(peak);
      if (isVvipVoice) {
        // Campuran paralel: suara kokpit jernih + sentuhan saturasi radio AM kokpit agar terasa nyata di dalam pesawat!
        const dryG = ctx.createGain();
        dryG.gain.value = 0.72;
        const wetG = ctx.createGain();
        wetG.gain.value = 0.34;
        peak.connect(dryG);
        dryG.connect(comp);
        peak.connect(shaper);
        shaper.connect(wetG);
        wetG.connect(comp);
      } else {
        peak.connect(shaper);
        shaper.connect(comp);
      }
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

  /** Memutar pengumuman kabin / balasan radio dari Indonesia One (VVIP). */
  playVvipVoice(kind: 'vvip-welcome' | 'vvip-reply', soundEnabled: boolean) {
    if (!soundEnabled) return;
    this.unlock();
    const cached = this.atcBuffers.get(kind);
    if (cached) {
      this.playAtcRadio(kind);
      return;
    }
    void this.preloadAtc(kind).then((buf) => {
      if (buf) this.playAtcRadio(kind);
    });
  }

  /** Memutar ucapan radio kokpit Bahasa Indonesia dari pesawat tempur pengawal VVIP. */
  playVvipEscortRadio(soundEnabled: boolean) {
    if (!soundEnabled) return;
    this.unlock();
    const cached = this.atcBuffers.get('vvip-escort');
    if (cached) {
      this.playAtcRadio('vvip-escort');
      return;
    }
    void this.preloadAtc('vvip-escort').then((buf) => {
      if (buf) {
        this.playAtcRadio('vvip-escort');
      } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        // Fallback suara Bahasa Indonesia apabila file MP3 belum termuat
        try {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(
            'Selamat pagi, Yang kami hormati Bapak Presiden, saat ini perjalanan Anda kami kawal. Dari kokpit pesawat Letkol Penerbang Muhammad Jaki Dirgantara mengucapkan, Salam Suwa Buwana Paksa.',
          );
          u.lang = 'id-ID';
          u.rate = 0.98;
          u.pitch = 0.88;
          window.speechSynthesis.speak(u);
        } catch {
          // ignore
        }
      }
    });
  }

  /** Efek ledakan rudal berat realistis (sub-bass impact + deru api crackle) untuk mode Safety. */
  playMissileExplosionSfx(soundEnabled: boolean) {
    if (!soundEnabled) return;
    this.unlock();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const boomSrc = this.createNoiseSource(1.4);
    if (boomSrc) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(220, now);
      lp.frequency.exponentialRampToValueAtTime(38, now + 1.2);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.75, now + 0.025);
      g.gain.exponentialRampToValueAtTime(0.001, now + 1.35);
      boomSrc.connect(lp);
      lp.connect(g);
      g.connect(ctx.destination);
      boomSrc.start(now);
      boomSrc.stop(now + 1.38);
    }

    const crackSrc = this.createNoiseSource(0.85);
    if (crackSrc) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(980, now);
      bp.Q.value = 1.2;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.32, now + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.82);
      crackSrc.connect(bp);
      bp.connect(g);
      g.connect(ctx.destination);
      crackSrc.start(now);
      crackSrc.stop(now + 0.84);
    }
  }

  /** Efek roket kursi lontar Zero-Zero (canopy jettison pop + semburan roket padat). */
  playEjectionRocketSfx(soundEnabled: boolean) {
    if (!soundEnabled) return;
    this.unlock();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const rocketSrc = this.createNoiseSource(1.65);
    if (rocketSrc) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1400, now);
      bp.frequency.exponentialRampToValueAtTime(320, now + 1.5);
      bp.Q.value = 0.8;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.52, now + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, now + 1.6);
      rocketSrc.connect(bp);
      bp.connect(g);
      g.connect(ctx.destination);
      rocketSrc.start(now);
      rocketSrc.stop(now + 1.62);
    }
  }

  /** Efek kanopi parasut mengembang (hentakan kain + desiran angin) & cipratan air laut (water ditching). */
  playWaterSplashSfx(soundEnabled: boolean) {
    if (!soundEnabled) return;
    this.unlock();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const src = this.createNoiseSource(1.3);
    if (src) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(680, now);
      bp.frequency.exponentialRampToValueAtTime(220, now + 1.2);
      bp.Q.value = 0.7;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.45, now + 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, now + 1.25);
      src.connect(bp);
      bp.connect(g);
      g.connect(ctx.destination);
      src.start(now);
      src.stop(now + 1.28);
    }
  }

  /** Efek letupan suar Flare Countermeasure yang tegas & singkat. */
  playFlarePopSfx(soundEnabled: boolean) {
    if (!soundEnabled) return;
    this.unlock();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const src = this.createNoiseSource(0.24);
    if (src) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1250, now);
      bp.Q.value = 1.8;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.26, now + 0.012);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      src.connect(bp);
      bp.connect(g);
      g.connect(ctx.destination);
      src.start(now);
      src.stop(now + 0.23);
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
      this.stopJetSample(0.22);
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

    const isFighter = profile === 'fighter_single' || profile === 'fighter_twin';
    const isVvip = unitId === 'b737vip' || unitId === 'falcon8x';
    const isCargoTransport =
      unitId === 'c130j' ||
      unitId === 'a400m' ||
      unitId === 'cn295' ||
      unitId === 'cn235' ||
      unitId === 'c212' ||
      unitId === 'a330mrtt';

    const toTiming = getTakeOffTiming(unitId);

    if (flightMode === 'takeoff') {
      const isHeli = profile === 'helicopter';
      const atcTime = isHeli ? 4.2 : toTiming.voiceStart;
      const rollStart = isHeli ? 6.0 : toTiming.rollStart;
      const gearUpTime = isHeli ? 8.4 : toTiming.climbStart;

      if (phaseTime > atcTime && !this.atcStartPlayed) {
        this.atcStartPlayed = true;
        this.playAtcRadio(
          isFighter ? 'fighter-takeoff' : isCargoTransport ? 'transport-takeoff' : isVvip ? 'vvip-takeoff' : 'takeoff',
        );
      }
      if (phaseTime < atcTime) {
        // Taxi keluar dari hanggar: tenaga mesin taxi rendah & halus
        throttle = 0.24 + Math.sin(phaseTime * 2) * 0.03;
      } else if (phaseTime < rollStart) {
        // Berhenti di garis start Runway sambil berkomunikasi dengan Tower -> mulai spool-up saat hampir rolling
        const holdDur = Math.max(0.5, rollStart - atcTime);
        const p = Math.max(0, (phaseTime - (rollStart - Math.min(1.6, holdDur))) / Math.min(1.6, holdDur));
        throttle = 0.26 + p * 0.72;
      } else if (phaseTime < toTiming.airborneStart) {
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
        this.playAtcRadio(
          isFighter ? 'fighter-landing' : isCargoTransport ? 'transport-landing' : isVvip ? 'vvip-landing' : 'landing',
        );
      }
      const isHeli = profile === 'helicopter';
      const touchTime = 5.8;
      const stopTime = isHeli ? 6.4 : 16.0;
      const vacateTime = isHeli ? 6.1 : 16.0;
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
        // High-speed rollout + thrust reverser & pengereman panjang mulus sampai berhenti di runway
        const p = Math.min(1, (phaseTime - touchTime) / (stopTime - touchTime));
        throttle = isHeli ? 0.42 * (1 - p * 0.55) : 0.76 * (1 - p * 0.78);
      } else {
        // Berhenti sejenak -> taxi pelan menyusuri jalur panjang masuk hanggar -> idle mati
        const taxiEnd = isHeli ? 11.2 : 26.5;
        if (phaseTime < taxiEnd) {
          throttle = 0.21;
        } else {
          const idleP = Math.min(1, (phaseTime - taxiEnd) / 1.3);
          throttle = Math.max(0.03, 0.16 * (1 - idleP * 0.8));
        }
      }
    } else if (flightMode === 'airborne' || flightMode === 'aar' || flightMode === 'mission') {
      if (flightMode === 'airborne' && isCargoTransport && phaseTime > 1.2 && !this.transportCruisePlayed) {
        this.transportCruisePlayed = true;
        this.playAtcRadio('transport-cruise');
      } else if (flightMode === 'mission' && isCargoTransport && phaseTime > 0.2 && !this.atcStartPlayed) {
        this.atcStartPlayed = true;
        this.playAtcRadio('transport-airdrop');
      }
      throttle = flightMode === 'mission' ? 0.84 : 0.74 + Math.sin(phaseTime * 1.3) * 0.04;
      speedMod = flightMode === 'mission' ? 0.08 : 0.02;
    } else if (flightMode === 'maneuver' || flightMode === 'engineSim') {
      if (flightMode === 'maneuver' && isFighter && phaseTime > 0.25 && !this.atcStartPlayed) {
        this.atcStartPlayed = true;
        this.playAtcRadio('fighter-maneuver');
      }
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

    // Gunakan rekaman audio asli pesawat tempur yang disinkronkan presisi dengan tiap fase gerak!
    if (profile === 'fighter_single' || profile === 'fighter_twin') {
      let desiredTrack: 'takeoff' | 'fly' | 'taxi' = 'fly';
      let sampleVol = 0.62;
      let sampleRate = 1.0;

      if (flightMode === 'takeoff') {
        const spoolStart = toTiming.rollStart - 1.4;
        if (phaseTime < spoolStart) {
          // Fase Taxi Out dari Hanggar -> Line-Up & Tunggu Izin Tower di garis start Runway
          desiredTrack = 'taxi';
          sampleVol = phaseTime < 5.5 ? 0.52 : 0.38; // Lebih tenang saat berbicara dengan Tower agar suara pilot sangat jelas!
          sampleRate = 0.94 + Math.min(1, phaseTime / 5.5) * 0.06;
        } else {
          // Fase Spool-Up -> "Afterburner on, rolling!" -> Akselerasi Full Afterburner -> Liftoff & Climb!
          desiredTrack = 'takeoff';
          const accelBoost = phaseTime < toTiming.rollStart ? 0.58 + ((phaseTime - spoolStart) / 1.4) * 0.24 : 0.82;
          sampleVol = accelBoost;
          sampleRate = phaseTime < toTiming.rollStart ? 0.98 : 1.04;
        }
      } else if (flightMode === 'landing') {
        if (phaseTime < 5.8) {
          // Long Final Approach & Flare: deru jet melandai halus
          desiredTrack = 'fly';
          const p = phaseTime / 5.8;
          sampleVol = 0.58 - p * 0.14;
          sampleRate = 0.98 - p * 0.07;
        } else if (phaseTime < 10.6) {
          // Touchdown & High-Speed Rollout di runway: thrust reverser / rollout roar
          desiredTrack = 'fly';
          const p = (phaseTime - 5.8) / 4.8;
          sampleVol = 0.56 - p * 0.18;
          sampleRate = 0.94 - p * 0.1;
        } else if (phaseTime < 26.2) {
          // Pengereman akhir -> berhenti di runway -> taxi pelan kembali ke Hanggar
          desiredTrack = 'taxi';
          const p = Math.min(1, (phaseTime - 10.6) / 5.4);
          sampleVol = 0.48 - p * 0.1;
          sampleRate = 0.98 - p * 0.08;
        } else {
          // Parkir di dalam Hanggar: mesin spool-down perlahan hingga mati!
          desiredTrack = 'taxi';
          const idleP = Math.min(1, (phaseTime - 26.2) / 1.6);
          sampleVol = Math.max(0.001, 0.38 * (1 - idleP));
          sampleRate = Math.max(0.45, 0.9 - idleP * 0.45);
        }
      } else {
        // airborne, maneuver, aar, engineSim
        desiredTrack = 'fly';
        sampleVol = flightMode === 'maneuver' ? 0.7 : 0.56;
        sampleRate = 1.0 + speedMod * 0.32;
      }

      if (this.updateJetSample(desiredTrack, sampleVol, sampleRate)) {
        // Matikan sintesis osilator saat rekaman asli pesawat tempur aktif agar suara bersih & 100% autentik!
        this.masterGain.gain.setTargetAtTime(0, now, 0.15);
        return;
      }
    } else if (this.activeJetSrc) {
      this.stopJetSample(0.4);
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
    this.stopJetSample(0.18);
    this.stopAtcPlayback();
  }
}

export const aircraftAudio = new AircraftAudioEngine();
