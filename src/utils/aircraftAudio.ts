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

export interface LandingTiming {
  approachEnd: number;
  touchTime: number;
  rolloutEnd: number;
  brakeEnd: number;
  holdEnd: number;
  turnEnd: number;
  taxiEnd: number;
  parkEnd: number;
}

/**
 * Penyelarasan timing Take Off (detik nyata sesuai durasi WAV 24kHz mono) agar pesawat BERHENTI
 * mantap di runway sampai aba-aba "Afterburner on / Rolling / Power set" benar-benar terucap!
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

  const isBasicTrainer =
    unitId === 'g120tp' || unitId === 'c182' || unitId === 't41' || unitId === 'sgs233' || unitId === 'dg1000';

  if (profile === 'helicopter') {
    // heli-voice-takeoff.wav (15.76s): 4.2..19.96s suara selesai -> 20.8..25.4s naik vertikal perlahan & hover di tempat -> 25.4..29.8s baru maju perlahan & menanjak!
    return { voiceStart: 4.2, rollStart: 20.8, rotStart: 25.4, climbStart: 26.8, airborneStart: 29.8 };
  }
  if (unitId === 'kt1b') {
    // Khusus KT-1B Wong Bee (Jupiter Aerobatic Show):
    // 1. Keluar hanggar jauh satu per satu berjeda 5 detik (J1=0s..J6=25s -> selesai 33s).
    // 2. jupiter-checkin.wav (29.2..36.61s): Semua 6 pesawat sudah rapi di posisi start ("Jupiters, check in! 2..6").
    // 3. Take Off SAMA-SAMA melaju kencang sepanjang runway penuh (37.0..43.8s) -> Rotate di ujung runway (43.8..46.0s) -> Climb & Airborne (50.0s)!
    return { voiceStart: 10.5, rollStart: 37.0, rotStart: 43.8, climbStart: 46.0, airborneStart: 50.0 };
  }
  if (isBasicTrainer) {
    // Khusus Pesawat Latih selain T-50i Golden Eagle & KT-1B Wong Bee:
    // 0..12.5s Taxi pelan dari Hanggar jauh -> 12.5..18.0s Belok melingkar halus ke Runway
    // Part 1: trainer-voice-takeoff.wav (12.0..24.35s) -> Part 2: trainer-voice-roll.wav (25.0..48.99s)
    // "Full power" di ~31.8s (rollStart) -> melaju penuh 285m di runway -> "Rotate!" di 44.8s (rotStart) -> Airborne 49.4s!
    return { voiceStart: 12.0, rollStart: 31.8, rotStart: 44.8, climbStart: 46.8, airborneStart: 49.4 };
  }
  if (unitId === 'rafale') {
    // Dassault Rafale: 0..12.5s Taxi pelan -> 12.5..18.0s Belok halus ke Runway;
    // fighter-voice-takeoff.wav (18.08s: 12.0..30.08s) selesai pas di Runway -> 30.6..37.6s sprint 285m -> Rotate -> Climb!
    return { voiceStart: 12.0, rollStart: 30.6, rotStart: 37.6, climbStart: 40.2, airborneStart: 44.0 };
  }
  if (isFighter) {
    // Pesawat Tempur: 0..12.5s Taxi pelan -> 12.5..18.0s Belok halus ke Runway;
    // fighter-voice-takeoff.wav (18.08s: 12.0..30.08s) selesai pas di titik start -> 30.6..37.6s sprint 285m -> Rotate di ujung runway!
    return { voiceStart: 12.0, rollStart: 30.6, rotStart: 37.6, climbStart: 40.0, airborneStart: 43.2 };
  }
  if (isCargoTransport) {
    // Pesawat Angkut (C-130J, A400M, CN295, dll): 0..12.5s Taxi pelan -> 12.5..18.0s Belok halus ke Runway;
    // transport-voice-takeoff.wav (20.56s: 12.0..32.56s) selesai penuh -> 33.4..41.9s akselerasi penuh 285m -> Rotate di ujung runway!
    return { voiceStart: 12.0, rollStart: 33.4, rotStart: 41.9, climbStart: 44.6, airborneStart: 48.0 };
  }
  if (isVvip) {
    // Pesawat VVIP (B737-400, Falcon 8X): 0..34s Pengumuman di Apron -> 34..46.5s Taxi pelan -> 46.5..52.0s Belok halus ke Runway;
    // vvip-voice-takeoff.wav (10.84s: 46.5..57.34s) selesai pas di Runway -> 58.0..66.5s akselerasi penuh 285m -> Rotate di ujung runway!
    return { voiceStart: 46.5, rollStart: 58.0, rotStart: 66.5, climbStart: 69.2, airborneStart: 72.6 };
  }
  return { voiceStart: 12.0, rollStart: 19.2, rotStart: 26.4, climbStart: 28.6, airborneStart: 31.8 };
}

/**
 * Penyelarasan timing Landing (detik nyata) agar roda menyentuh aspal tepat saat aba-aba "Touchdown!"
 */
export function getLandingTiming(unitId: string): LandingTiming {
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

  const isBasicTrainer =
    unitId === 'g120tp' || unitId === 'c182' || unitId === 't41' || unitId === 'sgs233' || unitId === 'dg1000';

  // fighter-voice-landing.wav (21.0s): selesai penuh di 21.1s + jeda -> baru Flare & Touchdown di 24.5s!
  // transport-voice-landing.wav (13.76s): selesai penuh di 13.86s + jeda -> baru Flare & Touchdown di 17.6s!
  // trainer-voice-landing.wav (0.1..13.44s) + trainer-voice-landroll.wav (14.0..43.49s):
  //   "500 ft.. 65 kts.. Minimums.. Power idle.. Flare!" (33.8s) -> Touchdown tepat di 35.8s -> Rollout & "Runway vacated — Oke, terima kasih"!
  // vvip-voice-landing.wav (19.24s): pengumuman persiapan mendarat selesai di 19.34s -> baru turun & Touchdown di 25.4s!
  // jupiter-landing.wav (9.27s): "Cleared to land" -> "gears down" (3.2s) -> "On final..." (7.0s) -> "Touchdown!" (8.6s)!
  const touchTime = unitId === 'kt1b' ? 8.6 : isFighter ? 24.5 : isCargoTransport ? 17.6 : isBasicTrainer ? 35.8 : isVvip ? 25.4 : 5.8;
  const flareDur = 2.0;
  const approachEnd = Math.max(2.0, touchTime - flareDur);
  const rolloutEnd = touchTime + 4.4;
  const brakeEnd = rolloutEnd + 5.8;
  const holdEnd = brakeEnd + 1.5;
  const turnEnd = holdEnd + 3.0;
  const taxiEnd = turnEnd + 11.0;
  const parkEnd = taxiEnd + 1.5;
  return { approachEnd, touchTime, rolloutEnd, brakeEnd, holdEnd, turnEnd, taxiEnd, parkEnd };
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
  private vvipWelcomePlayed = false;
  private trainerRollPlayed = false;
  private trainerLandRollPlayed = false;
  private jupiterCheckinPlayed = false;
  private jupiterAirbornePlayed = false;
  private jupiterArrowheadPlayed = false;
  private jupiterOpposingPlayed = false;
  private jupiterHeartPlayed = false;
  private jupiterRejoinPlayed = false;
  private atcBuffers = new Map<string, AudioBuffer>();
  private atcPromises = new Map<string, Promise<AudioBuffer | null>>();
  private activeAtcSrc: AudioBufferSourceNode | null = null;
  private activeAtcCarrier: AudioBufferSourceNode | null = null;
  private voiceEpoch = 0;
  private radioCurve: Float32Array | null = null;

  // Rekaman audio asli pesawat tempur (Take Off, Rafale Take Off/Landing khusus, Terbang, & Taxiway)
  private jetBuffers = new Map<'takeoff' | 'rafale-takeoff' | 'rafale-landing' | 'fly' | 'taxi', AudioBuffer>();
  private jetLoading = new Set<'takeoff' | 'rafale-takeoff' | 'rafale-landing' | 'fly' | 'taxi'>();
  private activeJetKey: 'takeoff' | 'rafale-takeoff' | 'rafale-landing' | 'fly' | 'taxi' | null = null;
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
      this.ctx.resume().catch(() => { });
    }
    // Audio dimuat secara on-demand (lazy) tepat saat dipakai agar bebas loading 18MB di awal!
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

  private async preloadJetAudio(
    key: 'takeoff' | 'rafale-takeoff' | 'rafale-landing' | 'fly' | 'taxi',
  ): Promise<AudioBuffer | null> {
    if (!this.ctx) return null;
    const cached = this.jetBuffers.get(key);
    if (cached) return cached;
    if (this.jetLoading.has(key)) return null;
    this.jetLoading.add(key);
    try {
      const url =
        key === 'rafale-takeoff'
          ? '/audio/rafale-takeoff.mp3'
          : key === 'rafale-landing'
            ? '/audio/rafale-landing.mp3'
            : `/audio/fighter-${key}.mp3`;
      const res = await fetch(url);
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
  private updateJetSample(
    desiredKey: 'takeoff' | 'rafale-takeoff' | 'rafale-landing' | 'fly' | 'taxi',
    targetVol: number,
    playbackRate = 1.0,
  ): boolean {
    if (!this.ctx) return false;
    const buf = this.jetBuffers.get(desiredKey);
    if (!buf) {
      void this.preloadJetAudio(desiredKey);
      return false;
    }
    const now = this.ctx.currentTime;
    if (this.activeJetKey !== desiredKey || !this.activeJetSrc || !this.activeJetGain) {
      const isOneShotRafale = desiredKey === 'rafale-takeoff' || desiredKey === 'rafale-landing';
      const xfade = isOneShotRafale ? 0.55 : 0.85;
      this.stopJetSample(xfade);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = !isOneShotRafale;
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
      | 'vvip-landing'
      | 'heli-takeoff'
      | 'heli-cruise'
      | 'heli-landing'
      | 'trainer-takeoff'
      | 'trainer-roll'
      | 'trainer-landing'
      | 'trainer-landroll'
      | 'jupiter-takeoff-prep'
      | 'jupiter-checkin'
      | 'jupiter-airborne'
      | 'jupiter-arrowhead-roll'
      | 'jupiter-opposing-pass'
      | 'jupiter-heart-bombburst'
      | 'jupiter-rejoin-landing'
      | 'jupiter-landing',
  ): Promise<AudioBuffer | null> {
    if (!this.ctx) return null;
    const cached = this.atcBuffers.get(key);
    if (cached) return cached;
    const inflight = this.atcPromises.get(key);
    if (inflight) return inflight;

    const promise = (async (): Promise<AudioBuffer | null> => {
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
                                  : key === 'heli-takeoff'
                                    ? '/audio/heli-voice-takeoff.wav'
                                    : key === 'heli-cruise'
                                      ? '/audio/heli-voice-cruise.wav'
                                      : key === 'heli-landing'
                                        ? '/audio/heli-voice-landing.wav'
                                        : key === 'trainer-takeoff'
                                          ? '/audio/trainer-voice-takeoff.wav'
                                          : key === 'trainer-roll'
                                            ? '/audio/trainer-voice-roll.wav'
                                            : key === 'trainer-landing'
                                              ? '/audio/trainer-voice-landing.wav'
                                              : key === 'trainer-landroll'
                                                ? '/audio/trainer-voice-landroll.wav'
                                                : key === 'jupiter-takeoff-prep'
                                                  ? '/audio/jupiter-takeoff-prep.wav'
                                                  : key === 'jupiter-checkin'
                                                    ? '/audio/jupiter-checkin.wav'
                                                    : key === 'jupiter-airborne'
                                                      ? '/audio/jupiter-airborne.wav'
                                                      : key === 'jupiter-arrowhead-roll'
                                                        ? '/audio/jupiter-arrowhead-roll.wav'
                                                        : key === 'jupiter-opposing-pass'
                                                          ? '/audio/jupiter-opposing-pass.wav'
                                                          : key === 'jupiter-heart-bombburst'
                                                            ? '/audio/jupiter-heart-bombburst.wav'
                                                            : key === 'jupiter-rejoin-landing'
                                                              ? '/audio/jupiter-rejoin-landing.wav'
                                                              : key === 'jupiter-landing'
                                                                ? '/audio/jupiter-landing.wav'
                                                                : `/audio/atc-${key}.mp3`;
        const res = await fetch(url);
        if (!res.ok || !this.ctx) return null;
        const arr = await res.arrayBuffer();
        const decoded = await this.ctx.decodeAudioData(arr);
        this.atcBuffers.set(key, decoded);
        return decoded;
      } catch {
        return null;
      } finally {
        this.atcPromises.delete(key);
      }
    })();

    this.atcPromises.set(key, promise);
    return promise;
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

  private stopAtcPlayback(bumpEpoch = true) {
    if (bumpEpoch) this.voiceEpoch++;
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

  /**
   * Reset penanda one-shot SFX & transmisi ATC saat fase baru dimulai.
   * `resetSessionVoices = true` dipakai hanya saat penerbangan baru dimulai (Take Off / stop / ganti pesawat)
   * agar suara jelajah ("Anda sedang berada di ketinggian...") hanya diputar SEKALI per penerbangan,
   * tidak diulang-ulang setiap kali Manuver / Drop Barang / AAR dihentikan kembali ke mode mengudara!
   */
  resetPhaseTriggers(resetSessionVoices = false) {
    this.touchdownPlayed = false;
    this.gearChimePlayed = false;
    this.atcStartPlayed = false;
    this.atcVacatePlayed = false;
    if (resetSessionVoices) {
      this.transportCruisePlayed = false;
    }
    this.vvipWelcomePlayed = false;
    this.trainerRollPlayed = false;
    this.trainerLandRollPlayed = false;
    this.jupiterCheckinPlayed = false;
    this.jupiterAirbornePlayed = false;
    this.jupiterArrowheadPlayed = false;
    this.jupiterOpposingPlayed = false;
    this.jupiterHeartPlayed = false;
    this.jupiterRejoinPlayed = false;
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
      | 'vvip-landing'
      | 'heli-takeoff'
      | 'heli-cruise'
      | 'heli-landing'
      | 'trainer-takeoff'
      | 'trainer-roll'
      | 'trainer-landing'
      | 'trainer-landroll'
      | 'jupiter-takeoff-prep'
      | 'jupiter-checkin'
      | 'jupiter-airborne'
      | 'jupiter-arrowhead-roll'
      | 'jupiter-opposing-pass'
      | 'jupiter-heart-bombburst'
      | 'jupiter-rejoin-landing'
      | 'jupiter-landing',
  ) {
    if (!this.ctx) return;
    const myEpoch = ++this.voiceEpoch;
    const run = (buffer: AudioBuffer) => {
      if (!this.ctx || myEpoch !== this.voiceEpoch) return;
      const ctx = this.ctx;
      this.stopAtcPlayback(false);

      const now = ctx.currentTime;
      const isVvipVoice =
        key.startsWith('vvip-') ||
        key.startsWith('fighter-') ||
        key.startsWith('transport-') ||
        key.startsWith('heli-') ||
        key.startsWith('trainer-');
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
        if (buf && myEpoch === this.voiceEpoch) run(buf);
      });
    }
  }

  /** Memutar suara radio tempur khusus manuver perang (Dogfight / ACM) atau menghentikannya jika non-tempur. */
  playFighterCombatVoice(soundEnabled: boolean) {
    if (!soundEnabled) return;
    this.unlock();
    this.playAtcRadio('fighter-maneuver');
  }

  stopVoiceRadio() {
    this.stopAtcPlayback();
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

  /**
   * Efek tembakan kanon pesawat tempur (GSh-30-1 / M61 Vulcan 20mm-30mm):
   * Rentetan ledakan propelan ritmis + hentakan sub-bass mekanis + desis supersonik yang tegas & nyata!
   */
  playCannonBurstSfx(soundEnabled: boolean, durationSec = 0.72) {
    if (!soundEnabled) return;
    this.unlock();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const rounds = Math.max(4, Math.round(durationSec / 0.085));
    const step = durationSec / rounds;

    for (let i = 0; i < rounds; i++) {
      const t0 = now + i * step;

      // 1. Hentakan muzzle thump (sub-low punch 160 Hz -> 48 Hz)
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(165 + (i % 2) * 14, t0);
      osc.frequency.exponentialRampToValueAtTime(46, t0 + 0.068);
      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.001, t0);
      oscGain.gain.linearRampToValueAtTime(0.55, t0 + 0.005);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.072);
      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.078);

      // 2. Ledakan propelan kanon & crack mekanis (bandpass noise tegas)
      const shotNoise = this.createNoiseSource(0.085);
      if (shotNoise) {
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(1150 + (i % 3) * 140, t0);
        bp.Q.value = 0.85;
        const ng = ctx.createGain();
        ng.gain.setValueAtTime(0.001, t0);
        ng.gain.linearRampToValueAtTime(0.48, t0 + 0.004);
        ng.gain.exponentialRampToValueAtTime(0.001, t0 + 0.078);
        shotNoise.connect(bp);
        bp.connect(ng);
        ng.connect(ctx.destination);
        shotNoise.start(t0);
        shotNoise.stop(t0 + 0.082);
      }
    }
  }

  /** Efek peluncuran rudal udara-ke-udara (FOX-2): ignition pop + deru roket motor kencang! */
  playMissileLaunchSfx(soundEnabled: boolean) {
    if (!soundEnabled) return;
    this.unlock();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // 1. Ignition pop awal dari rel sayap
    const popOsc = ctx.createOscillator();
    popOsc.type = 'sine';
    popOsc.frequency.setValueAtTime(190, now);
    popOsc.frequency.exponentialRampToValueAtTime(48, now + 0.14);
    const popGain = ctx.createGain();
    popGain.gain.setValueAtTime(0.001, now);
    popGain.gain.linearRampToValueAtTime(0.45, now + 0.01);
    popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    popOsc.connect(popGain);
    popGain.connect(ctx.destination);
    popOsc.start(now);
    popOsc.stop(now + 0.16);

    // 2. Deru roket padat melesat (high-pressure whoosh sweep)
    const whooshSrc = this.createNoiseSource(1.75);
    if (whooshSrc) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(720, now);
      bp.frequency.exponentialRampToValueAtTime(2200, now + 0.35);
      bp.frequency.exponentialRampToValueAtTime(420, now + 1.7);
      bp.Q.value = 0.75;
      const wg = ctx.createGain();
      wg.gain.setValueAtTime(0.001, now);
      wg.gain.linearRampToValueAtTime(0.58, now + 0.05);
      wg.gain.setValueAtTime(0.46, now + 0.55);
      wg.gain.exponentialRampToValueAtTime(0.001, now + 1.72);
      whooshSrc.connect(bp);
      bp.connect(wg);
      wg.connect(ctx.destination);
      whooshSrc.start(now);
      whooshSrc.stop(now + 1.74);
    }
  }

  /**
   * Efek ledakan udara dahsyat + kobaran api terbakar (sustained fire roar & crackle)
   * saat pesawat musuh BANDIT-01 tertembak jatuh di mode Dogfight!
   */
  playExplosionSfx(soundEnabled: boolean) {
    if (!soundEnabled) return;
    this.unlock();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // 1. Sub-bass shockwave impact (dentuman berat yang langsung terasa!)
    const subOsc = ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(115, now);
    subOsc.frequency.exponentialRampToValueAtTime(26, now + 0.65);
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.001, now);
    subGain.gain.linearRampToValueAtTime(0.85, now + 0.014);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.72);
    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.75);

    // 2. Ledakan utama broadband lowpass (BOOM panjang)
    const boomSrc = this.createNoiseSource(2.2);
    if (boomSrc) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(980, now);
      lp.frequency.exponentialRampToValueAtTime(62, now + 1.9);
      lp.Q.value = 1.1;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.88, now + 0.02);
      g.gain.setValueAtTime(0.68, now + 0.16);
      g.gain.exponentialRampToValueAtTime(0.001, now + 2.15);
      boomSrc.connect(lp);
      lp.connect(g);
      g.connect(ctx.destination);
      boomSrc.start(now);
      boomSrc.stop(now + 2.18);
    }

    // 3. Ledakan susulan tangki bahan bakar (secondary blast +0.26s)
    const secSrc = this.createNoiseSource(1.1);
    if (secSrc) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(520, now + 0.24);
      bp.frequency.exponentialRampToValueAtTime(110, now + 1.2);
      bp.Q.value = 0.9;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, now + 0.24);
      g.gain.linearRampToValueAtTime(0.56, now + 0.28);
      g.gain.exponentialRampToValueAtTime(0.001, now + 1.3);
      secSrc.connect(bp);
      bp.connect(g);
      g.connect(ctx.destination);
      secSrc.start(now + 0.24);
      secSrc.stop(now + 1.32);
    }

    // 4. Suara api berkobar & gemuruh terbakar (fire roar + crackle selama 4.2 detik saat musuh jatuh terbakar)
    const fireDur = 4.2;
    const fireLen = Math.floor(ctx.sampleRate * fireDur);
    const fireBuf = ctx.createBuffer(1, fireLen, ctx.sampleRate);
    const ch = fireBuf.getChannelData(0);
    let smooth = 0;
    for (let i = 0; i < fireLen; i++) {
      const w = Math.random() * 2 - 1;
      smooth = (smooth + 0.08 * w) / 1.08;
      // Campuran gemuruh api rendah + letupan percikan api (crackle)
      const crackle = Math.random() > 0.994 ? (Math.random() * 2 - 1) * 1.45 : 0;
      ch[i] = Math.max(-1, Math.min(1, smooth * 2.2 + w * 0.22 + crackle));
    }
    const fireSrc = ctx.createBufferSource();
    fireSrc.buffer = fireBuf;
    const fireFilter = ctx.createBiquadFilter();
    fireFilter.type = 'bandpass';
    fireFilter.frequency.setValueAtTime(480, now + 0.15);
    fireFilter.frequency.linearRampToValueAtTime(260, now + fireDur);
    fireFilter.Q.value = 0.65;

    const fireGain = ctx.createGain();
    fireGain.gain.setValueAtTime(0.001, now + 0.12);
    fireGain.gain.linearRampToValueAtTime(0.46, now + 0.35);
    fireGain.gain.setValueAtTime(0.38, now + 2.4);
    fireGain.gain.exponentialRampToValueAtTime(0.001, now + fireDur + 0.1);

    fireSrc.connect(fireFilter);
    fireFilter.connect(fireGain);
    fireGain.connect(ctx.destination);
    fireSrc.start(now + 0.12);
    fireSrc.stop(now + fireDur + 0.12);
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
      this.masterGain.gain.setTargetAtTime(0, now, 0.05);
      this.stopJetSample(0.08);
      if (this.activeAtcSrc || this.activeAtcCarrier) {
        this.stopAtcPlayback();
      }
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

    const isBasicTrainer =
      unitId === 'g120tp' || unitId === 'c182' || unitId === 't41' || unitId === 'sgs233' || unitId === 'dg1000';

    const toTiming = getTakeOffTiming(unitId);

    if (flightMode === 'takeoff') {
      const isHeli = profile === 'helicopter';
      const atcTime = toTiming.voiceStart;
      const rollStart = toTiming.rollStart;
      const gearUpTime = toTiming.climbStart;

      if (isVvip && phaseTime > 0.25 && !this.vvipWelcomePlayed) {
        this.vvipWelcomePlayed = true;
        this.playAtcRadio('vvip-welcome');
      }

      if (phaseTime > atcTime && !this.atcStartPlayed) {
        this.atcStartPlayed = true;
        if (isBasicTrainer) {
          void this.preloadAtc('trainer-roll');
        }
        if (unitId === 'kt1b') {
          void this.preloadAtc('jupiter-checkin');
          void this.preloadAtc('jupiter-airborne');
        }
        this.playAtcRadio(
          unitId === 'kt1b'
            ? 'jupiter-takeoff-prep'
            : isHeli
              ? 'heli-takeoff'
              : isBasicTrainer
                ? 'trainer-takeoff'
                : isFighter
                  ? 'fighter-takeoff'
                  : isCargoTransport
                    ? 'transport-takeoff'
                    : isVvip
                      ? 'vvip-takeoff'
                      : 'takeoff',
        );
      }

      if (unitId === 'kt1b' && phaseTime > 29.2 && !this.jupiterCheckinPlayed) {
        this.jupiterCheckinPlayed = true;
        this.playAtcRadio('jupiter-checkin');
      }
      // Suara "Airborne / Gear up" tepat saat pesawat mulai mengudara (45.5s, bukan saat masih lari di runway!)
      if (unitId === 'kt1b' && phaseTime > 45.5 && !this.jupiterAirbornePlayed) {
        this.jupiterAirbornePlayed = true;
        this.playAtcRadio('jupiter-airborne');
      }

      if (isBasicTrainer && phaseTime > atcTime + 13.0 && !this.trainerRollPlayed) {
        this.trainerRollPlayed = true;
        this.playAtcRadio('trainer-roll');
      }
      if (phaseTime < atcTime) {
        // Saat pengumuman keberangkatan VVIP di apron, mesin idle super lembut agar suara Kapten sangat jernih
        throttle = isVvip && phaseTime < 34.0 ? 0.14 : 0.24 + Math.sin(phaseTime * 2) * 0.03;
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
      const isHeli = profile === 'helicopter';
      if (phaseTime > 0.1 && !this.atcStartPlayed) {
        this.atcStartPlayed = true;
        if (isBasicTrainer) {
          void this.preloadAtc('trainer-landroll');
        }
        this.playAtcRadio(
          unitId === 'kt1b'
            ? 'jupiter-landing'
            : isHeli
              ? 'heli-landing'
              : isBasicTrainer
                ? 'trainer-landing'
                : isFighter
                  ? 'fighter-landing'
                  : isCargoTransport
                    ? 'transport-landing'
                    : isVvip
                      ? 'vvip-landing'
                      : 'landing',
        );
      }
      if (isBasicTrainer && phaseTime > 14.0 && !this.trainerLandRollPlayed) {
        this.trainerLandRollPlayed = true;
        this.playAtcRadio('trainer-landroll');
      }
      const ld = getLandingTiming(unitId);
      const touchTime = isHeli ? 25.0 : ld.touchTime;
      const stopTime = isHeli ? 25.4 : ld.brakeEnd;
      const vacateTime = isHeli ? 25.2 : ld.brakeEnd;
      if (phaseTime > vacateTime && !this.atcVacatePlayed) {
        this.atcVacatePlayed = true;
        if (!isHeli && !isBasicTrainer && unitId !== 'kt1b') this.playAtcRadio('vacate');
      }
      if (phaseTime < touchTime) {
        throttle = 0.62 - (phaseTime / touchTime) * 0.16;
        const gearCue = unitId === 'kt1b' ? 3.2 : Math.min(2.2, touchTime * 0.25);
        if (phaseTime > gearCue && !this.gearChimePlayed) {
          this.gearChimePlayed = true;
          this.playGearServoSfx();
        }
      } else if (phaseTime < stopTime) {
        if (!this.touchdownPlayed) {
          this.touchdownPlayed = true;
          this.playTouchdownSfx(isHeli);
        }
        // High-speed rollout + thrust reverser & pengereman panjang mulus sampai berhenti di runway
        const p = Math.min(1, (phaseTime - touchTime) / Math.max(0.5, stopTime - touchTime));
        throttle = isHeli ? 0.42 * (1 - p * 0.55) : 0.76 * (1 - p * 0.78);
      } else {
        // Helikopter langsung spool-down di Helipad H tanpa taxi; sayap tetap taxi masuk hanggar
        const taxiEnd = isHeli ? 25.5 : ld.taxiEnd;
        if (phaseTime < taxiEnd) {
          throttle = 0.21;
        } else {
          const idleP = Math.min(1, (phaseTime - taxiEnd) / 1.3);
          throttle = Math.max(0.03, 0.16 * (1 - idleP * 0.8));
        }
      }
    } else if (flightMode === 'salute') {
      // Hormat Teknisi: suara mesin idle tenang di apron (0..16.2s) -> spool-up mantap saat pesawat mulai taxi keluar apron (16.2..21.5s), TANPA suara narasi/radio!
      if (this.activeAtcSrc || this.activeAtcCarrier) {
        this.stopAtcPlayback();
      }
      const cyc = phaseTime % 22.0;
      if (cyc < 16.2) {
        throttle = 0.28 + Math.sin(phaseTime * 1.4) * 0.015;
        speedMod = -0.08;
      } else {
        const spoolP = Math.min(1, (cyc - 16.2) / 4.2);
        throttle = 0.28 + spoolP * 0.52;
        speedMod = -0.08 + spoolP * 0.22;
      }
    } else if (flightMode === 'airborne' || flightMode === 'aar' || flightMode === 'mission') {
      if (flightMode === 'airborne' && unitId === 'kt1b') {
        if (!this.atcBuffers.has('jupiter-arrowhead-roll')) {
          void this.preloadAtc('jupiter-arrowhead-roll');
        }
        if (!this.atcBuffers.has('jupiter-opposing-pass')) {
          void this.preloadAtc('jupiter-opposing-pass');
        }
        if (!this.atcBuffers.has('jupiter-heart-bombburst')) {
          void this.preloadAtc('jupiter-heart-bombburst');
        }
        if (!this.atcBuffers.has('jupiter-rejoin-landing')) {
          void this.preloadAtc('jupiter-rejoin-landing');
        }
        // Diselaraskan PRESISI dengan jadwal 3D JupiterTakeOffLayer.tsx agar suara TIDAK PERNAH mendahului atraksi!
        // 20.5s: Arrow Head Loop & Jupiter Roll | 56.5s: Mirror | 78.0s: Heart (Love) & Roll | 154.5s: Rejoin Arrowhead
        if (phaseTime >= 20.5 && !this.jupiterArrowheadPlayed) {
          this.jupiterArrowheadPlayed = true;
          this.playAtcRadio('jupiter-arrowhead-roll');
        }
        if (phaseTime >= 56.5 && !this.jupiterOpposingPlayed) {
          this.jupiterOpposingPlayed = true;
          this.playAtcRadio('jupiter-opposing-pass');
        }
        if (phaseTime >= 78.0 && !this.jupiterHeartPlayed) {
          this.jupiterHeartPlayed = true;
          this.playAtcRadio('jupiter-heart-bombburst');
        }
        if (phaseTime >= 154.5 && !this.jupiterRejoinPlayed) {
          this.jupiterRejoinPlayed = true;
          this.playAtcRadio('jupiter-rejoin-landing');
        }
      } else if (flightMode === 'airborne' && isCargoTransport && phaseTime > 1.2 && !this.transportCruisePlayed) {
        this.transportCruisePlayed = true;
        this.playAtcRadio('transport-cruise');
      } else if (flightMode === 'mission' && isCargoTransport && phaseTime > 0.2 && !this.atcStartPlayed) {
        this.atcStartPlayed = true;
        this.playAtcRadio('transport-airdrop');
      }
      throttle = flightMode === 'mission' ? 0.84 : 0.74 + Math.sin(phaseTime * 1.3) * 0.04;
      speedMod = flightMode === 'mission' ? 0.08 : 0.02;
    } else if (flightMode === 'maneuver' || flightMode === 'engineSim') {
      // Pada mode Manuver untuk pesawat angkut, latih, & helikopter: pastikan tidak ada suara pilot/ATC tersisa!
      if (!isFighter && !isVvip && (this.activeAtcSrc || this.activeAtcCarrier)) {
        this.stopAtcPlayback();
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
      let desiredTrack: 'takeoff' | 'rafale-takeoff' | 'rafale-landing' | 'fly' | 'taxi' = 'fly';
      let sampleVol = 0.62;
      let sampleRate = 1.0;

      if (flightMode === 'takeoff') {
        const isRafale = unitId === 'rafale';
        if (isRafale) {
          // Preload audio khusus Rafale sejak fase taxi agar 0ms delay saat spool-up dimulai!
          if (!this.jetBuffers.has('rafale-takeoff')) {
            void this.preloadJetAudio('rafale-takeoff');
          }
          const spoolStart = toTiming.rollStart - 4.0; // 20.4s: 4 detik spool-up -> 24.4s full afterburner roll -> 30.2s rotate -> 37.2s airborne
          if (phaseTime < spoolStart) {
            desiredTrack = 'taxi';
            sampleVol = phaseTime < 5.5 ? 0.5 : 0.34;
            sampleRate = 0.94 + Math.min(1, phaseTime / 5.5) * 0.06;
          } else {
            desiredTrack = 'rafale-takeoff';
            if (phaseTime < toTiming.rollStart) {
              const p = Math.min(1, (phaseTime - spoolStart) / 4.0);
              sampleVol = 0.42 + p * 0.48; // Spool-up makin menderu tanpa menutupi akhir aba-aba kokpit
            } else {
              sampleVol = 0.94; // Full afterburner roar saat rolling, rotate, liftoff & initial climb!
            }
            sampleRate = 1.0; // Pitch asli mesin ganda Snecma M88 Rafale
          }
        } else {
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
        }
      } else if (flightMode === 'landing') {
        const ld = getLandingTiming(unitId);
        const isRafale = unitId === 'rafale';
        if (isRafale) {
          // Preload audio khusus Rafale Landing sejak awal approach agar 0ms delay!
          if (!this.jetBuffers.has('rafale-landing')) {
            void this.preloadJetAudio('rafale-landing');
          }
          // Sinkronkan rekaman ~19.5s tepat dengan Touchdown (24.5s) -> Rollout (28.9s) -> Brake End (34.7s):
          // Mulai 8.0s sebelum touchdown (16.5s): 0..4.5s final glidepath -> 4.5..8.0s flare & touchdown -> 8.0..18.2s rollout & braking di runway!
          const rafaleLandStart = ld.touchTime - 8.0;
          if (phaseTime < rafaleLandStart) {
            // Fase komunikasi final approach awal: deru jet lembut agar suara pilot sangat jernih
            desiredTrack = 'fly';
            const p = phaseTime / Math.max(0.5, rafaleLandStart);
            sampleVol = 0.42 - p * 0.06;
            sampleRate = 0.95 - p * 0.05;
          } else if (phaseTime < ld.brakeEnd) {
            // Fase Final Approach -> Flare -> Touchdown -> Rollout & Pengereman di Runway dengan audio asli Rafale!
            desiredTrack = 'rafale-landing';
            if (phaseTime < ld.approachEnd) {
              // 16.5..22.5s: suara mesin mendekat (halus saat akhir suara pilot, lalu naik menuju flare)
              const p = (phaseTime - rafaleLandStart) / Math.max(0.5, ld.approachEnd - rafaleLandStart);
              sampleVol = 0.46 + p * 0.36;
            } else {
              // 22.5..34.7s: Flare -> Touchdown -> High-Speed Rollout & Deceleration di Runway!
              sampleVol = 0.92;
            }
            sampleRate = 1.0; // Pitch asli Snecma M88 Rafale
          } else if (phaseTime < ld.taxiEnd) {
            // Keluar runway & taxi pelan kembali masuk Hanggar
            desiredTrack = 'taxi';
            sampleVol = 0.42;
            sampleRate = 0.92;
          } else {
            // Parkir di dalam Hanggar: mesin spool-down perlahan hingga mati!
            desiredTrack = 'taxi';
            const idleP = Math.min(1, (phaseTime - ld.taxiEnd) / 1.4);
            sampleVol = Math.max(0.001, 0.38 * (1 - idleP));
            sampleRate = Math.max(0.45, 0.9 - idleP * 0.45);
          }
        } else if (phaseTime < ld.touchTime) {
          // Long Final Approach & Flare: deru jet melandai halus (suara pilot tetap jernih!)
          desiredTrack = 'fly';
          const p = phaseTime / Math.max(0.5, ld.touchTime);
          sampleVol = 0.44 - p * 0.1;
          sampleRate = 0.96 - p * 0.08;
        } else if (phaseTime < ld.rolloutEnd) {
          // Touchdown & High-Speed Rollout di runway: thrust reverser / drag chute rollout roar
          desiredTrack = 'fly';
          const p = (phaseTime - ld.touchTime) / Math.max(0.5, ld.rolloutEnd - ld.touchTime);
          sampleVol = 0.56 - p * 0.16;
          sampleRate = 0.94 - p * 0.1;
        } else if (phaseTime < ld.taxiEnd) {
          // Pengereman akhir -> berhenti di runway -> taxi pelan kembali ke Hanggar
          desiredTrack = 'taxi';
          const p = Math.min(1, (phaseTime - ld.rolloutEnd) / Math.max(0.5, ld.brakeEnd - ld.rolloutEnd));
          sampleVol = 0.48 - p * 0.1;
          sampleRate = 0.98 - p * 0.08;
        } else {
          // Parkir di dalam Hanggar: mesin spool-down perlahan hingga mati!
          desiredTrack = 'taxi';
          const idleP = Math.min(1, (phaseTime - ld.taxiEnd) / 1.4);
          sampleVol = Math.max(0.001, 0.38 * (1 - idleP));
          sampleRate = Math.max(0.45, 0.9 - idleP * 0.45);
        }
      } else if (flightMode === 'salute') {
        const cyc = phaseTime % 22.0;
        desiredTrack = 'taxi';
        if (cyc < 16.2) {
          sampleVol = 0.34;
          sampleRate = 0.86;
        } else {
          const spoolP = Math.min(1, (cyc - 16.2) / 4.2);
          sampleVol = 0.34 + spoolP * 0.38;
          sampleRate = 0.86 + spoolP * 0.22;
        }
      } else {
        // airborne, maneuver, mission (Dogfight), aar, engineSim
        desiredTrack = 'fly';
        sampleVol = flightMode === 'maneuver' ? 0.68 : flightMode === 'mission' ? 0.44 : 0.56;
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
    this.resetPhaseTriggers(true);
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(0, now);
    }
    this.stopJetSample(0.04);
    this.stopAtcPlayback();
  }
}

export const aircraftAudio = new AircraftAudioEngine();
