import { create } from 'zustand';
import * as THREE from 'three';
import { FLEET, getUnit, type AircraftCategory } from '../data/fleetData';
import { getFighterManeuverSpec, type FighterManeuverId } from '../data/fighterManeuvers';
import type { JupiterManeuverId } from '../data/jupiterManeuvers';
import { aircraftAudio } from '../utils/aircraftAudio';

export type InfoTab = 'spec' | 'ops' | 'quiz';
export type FlightMode = 'parked' | 'takeoff' | 'airborne' | 'maneuver' | 'landing' | 'engineSim' | 'aar' | 'mission';
export type TimeOfDay = 'day' | 'sunset' | 'night';
export type AeroManeuver = 'liftDemo' | 'climb' | 'descend' | 'turnLeft' | 'turnRight' | 'level';
export type Vec3 = [number, number, number];

export function isCompactViewport() {
  return typeof window !== 'undefined' && window.innerWidth < 1024;
}

export function isPortraitMobile() {
  return typeof window !== 'undefined' && window.innerWidth < 768 && window.innerHeight > window.innerWidth;
}

export function getDefaultCamera(unitId?: string): { pos: Vec3; target: Vec3 } {
  if (unitId === 'gsuit') {
    if (isPortraitMobile()) {
      return { pos: [3.4, 5.6, 17.8], target: [0, 5.3, 0] };
    }
    return { pos: [3.0, 5.6, 14.5], target: [0, 5.3, 0] };
  }
  if (unitId === 'pilot-helmet') {
    if (isPortraitMobile()) {
      return { pos: [3.2, 4.8, 12.6], target: [0, 3.8, 0] };
    }
    return { pos: [2.8, 4.6, 9.6], target: [0, 3.8, 0] };
  }
  if (isPortraitMobile()) {
    return { pos: [17.5, 7.6, 20.5], target: [0, 1.4, 0] };
  }
  return { pos: [12.5, 5.4, 14.5], target: [0, 1.5, 0] };
}

export const DEFAULT_CAMERA: { pos: Vec3; target: Vec3 } = {
  pos: [12.5, 5.4, 14.5],
  target: [0, 1.5, 0],
};

/** Registri objek pin 3D (non-reaktif) agar UI di luar kanvas dapat menghitung posisi dunia pin. */
export const pinRegistry = new Map<number, THREE.Object3D>();

export interface QuizAnswer {
  questionId: number;
  pickedId: number;
  correct: boolean;
}

export interface QuizState {
  status: 'idle' | 'active' | 'finished';
  order: number[];
  index: number;
  score: number;
  answers: QuizAnswer[];
  feedback: QuizAnswer | null;
}

interface CamRequest {
  pos: Vec3;
  target: Vec3;
  nonce: number;
}

interface HangarState {
  showWelcome: boolean;
  selectedId: string;
  search: string;
  category: 'Semua' | AircraftCategory;
  leftOpen: boolean;
  rightOpen: boolean;
  infoTab: InfoTab;

  wireframe: boolean;
  showInfographic: boolean;
  showPins: boolean;
  autoRotate: boolean;
  soundEnabled: boolean;
  timeOfDay: TimeOfDay;
  showcaseMode: boolean;
  aeroMode: boolean;
  safetyMode: boolean;
  safetyNonce: number;
  safetyStep: number;
  oxygenMode: boolean;
  flapAngle: 0 | 15 | 35;
  trimAngle: -5 | 0 | 8;
  aeroManeuver: AeroManeuver;
  fighterManeuver: FighterManeuverId;
  jupiterManeuver: JupiterManeuverId;
  gForceLevel: 1 | 4 | 9;
  aarFuel: number;
  aarStep: number;
  flightMode: FlightMode;
  flightNonce: number;
  flightLabel: string | null;

  activeHotspot: number | null;
  camRequest: CamRequest | null;
  quiz: QuizState;
  glbVersion: Record<string, number>;
  selectedLivery: Record<string, string>;

  enterHangar: () => void;
  openWelcome: () => void;
  toggleInfographic: () => void;
  closeInfographic: () => void;
  bumpGlbVersion: (unitId: string) => void;
  setLivery: (unitId: string, liveryId: string) => void;
  selectAircraft: (id: string) => void;
  setSearch: (v: string) => void;
  setCategory: (c: 'Semua' | AircraftCategory) => void;
  toggleLeft: () => void;
  toggleRight: () => void;
  setInfoTab: (t: InfoTab) => void;
  toggle: (key: 'wireframe' | 'showPins' | 'autoRotate' | 'soundEnabled' | 'aeroMode' | 'safetyMode' | 'oxygenMode') => void;
  setFlapAngle: (deg: 0 | 15 | 35) => void;
  setTrimAngle: (deg: -5 | 0 | 8) => void;
  setAeroManeuver: (m: AeroManeuver) => void;
  setFighterManeuver: (m: FighterManeuverId) => void;
  setJupiterManeuver: (m: JupiterManeuverId) => void;
  setGForceLevel: (g: 1 | 4 | 9) => void;
  triggerAar: () => void;
  setAarProgress: (fuel: number, step: number) => void;
  triggerMission: () => void;
  triggerJupiterShow: () => void;
  cycleTimeOfDay: () => void;
  toggleShowcase: () => void;
  replaySafety: () => void;
  setSafetyStep: (step: number) => void;

  triggerTakeOff: () => void;
  triggerManeuver: () => void;
  triggerLanding: () => void;
  toggleEngineSim: () => void;
  setFlightState: (mode: FlightMode, label: string | null) => void;
  setFlightLabel: (label: string | null) => void;

  requestCamera: (pos: Vec3, target: Vec3) => void;
  resetCamera: () => void;
  focusHotspot: (id: number) => void;
  clearHotspot: () => void;

  startQuiz: () => void;
  answerQuiz: (pickedId: number) => void;
  nextQuestion: () => void;
  exitQuiz: () => void;
}

const emptyQuiz: QuizState = { status: 'idle', order: [], index: 0, score: 0, answers: [], feedback: null };

const shuffle = <T,>(arr: T[]) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

let nonce = 1;
const tmp = new THREE.Vector3();
const initialDesktop = !isCompactViewport();

export const useHangarStore = create<HangarState>((set, get) => ({
  showWelcome: true,
  selectedId: 'su30mk2',
  search: '',
  category: 'Semua',
  leftOpen: initialDesktop,
  rightOpen: initialDesktop,
  infoTab: 'spec',

  wireframe: false,
  showInfographic: false,
  showPins: false,
  autoRotate: false,
  soundEnabled: true,
  timeOfDay: 'day',
  showcaseMode: false,
  aeroMode: false,
  safetyMode: false,
  safetyNonce: 0,
  safetyStep: 0,
  oxygenMode: false,
  flapAngle: 15,
  trimAngle: 8,
  aeroManeuver: 'liftDemo',
  fighterManeuver: 'auto',
  jupiterManeuver: 'auto',
  gForceLevel: 4,
  aarFuel: 35,
  aarStep: 0,
  flightMode: 'parked',
  flightNonce: 0,
  flightLabel: null,

  activeHotspot: null,
  camRequest: null,
  quiz: emptyQuiz,
  glbVersion: {},
  selectedLivery: {},

  enterHangar: () => set({ showWelcome: false }),
  openWelcome: () => set({ showWelcome: true, showInfographic: false }),
  toggleInfographic: () => set((s) => ({ showInfographic: !s.showInfographic })),
  closeInfographic: () => set({ showInfographic: false }),
  bumpGlbVersion: (unitId) =>
    set((s) => ({
      glbVersion: { ...s.glbVersion, [unitId]: (s.glbVersion[unitId] ?? 0) + 1 },
    })),
  setLivery: (unitId, liveryId) =>
    set((s) => ({
      selectedLivery: { ...s.selectedLivery, [unitId]: liveryId },
    })),

  selectAircraft: (id) => {
    const mobile = isCompactViewport();
    if (id === get().selectedId) {
      if (mobile) set({ leftOpen: false });
      return;
    }
    pinRegistry.clear();
    set({
      selectedId: id,
      activeHotspot: null,
      quiz: emptyQuiz,
      safetyMode: false,
      oxygenMode: false,
      flightMode: 'parked',
      flightLabel: null,
      leftOpen: mobile ? false : get().leftOpen,
      infoTab: get().infoTab === 'quiz' ? 'quiz' : get().infoTab,
      camRequest: { ...getDefaultCamera(id), nonce: nonce++ },
    });
  },
  setSearch: (search) => set({ search }),
  setCategory: (category) => set({ category }),
  toggleLeft: () =>
    set((s) => {
      const next = !s.leftOpen;
      return { leftOpen: next, rightOpen: next && isCompactViewport() ? false : s.rightOpen };
    }),
  toggleRight: () =>
    set((s) => {
      const next = !s.rightOpen;
      return {
        rightOpen: next,
        aeroMode: next ? false : s.aeroMode,
        safetyMode: next ? false : s.safetyMode,
        leftOpen: next && isCompactViewport() ? false : s.leftOpen,
      };
    }),
  setInfoTab: (infoTab) => set({ infoTab }),
  toggle: (key) => {
    const next = !get()[key];
    if (key === 'aeroMode') {
      set({
        aeroMode: next,
        rightOpen: next ? false : get().rightOpen,
        leftOpen: next && isCompactViewport() ? false : get().leftOpen,
      });
      return;
    }
    if (key === 'safetyMode') {
      set({
        safetyMode: next,
        safetyNonce: next ? get().safetyNonce + 1 : get().safetyNonce,
        safetyStep: 0,
        aeroMode: next ? false : get().aeroMode,
        oxygenMode: next ? false : get().oxygenMode,
        flightMode: next ? 'parked' : get().flightMode,
        flightLabel: null,
        autoRotate: next ? false : get().autoRotate,
        activeHotspot: next ? null : get().activeHotspot,
        rightOpen: next && isCompactViewport() ? false : get().rightOpen,
      });
      return;
    }
    if (key === 'oxygenMode') {
      set({
        oxygenMode: next,
        safetyMode: next ? false : get().safetyMode,
        flightMode: next ? 'parked' : get().flightMode,
        flightLabel: null,
        activeHotspot: next ? null : get().activeHotspot,
      });
      return;
    }
    set({ [key]: next } as Partial<HangarState>);
    if (key === 'autoRotate' && next) set({ activeHotspot: null });
  },
  setFlapAngle: (flapAngle) => set({ flapAngle }),
  setTrimAngle: (trimAngle) => set({ trimAngle }),
  setAeroManeuver: (aeroManeuver) =>
    set((s) => ({
      aeroManeuver,
      trimAngle: aeroManeuver === 'climb' ? 8 : aeroManeuver === 'descend' ? -5 : aeroManeuver === 'level' ? 0 : s.trimAngle,
    })),
  setGForceLevel: (gForceLevel) => set({ gForceLevel }),
  setFighterManeuver: (fighterManeuver) => {
    const s = get();
    set({ fighterManeuver });
    if (s.flightMode === 'maneuver') {
      const isCombat = fighterManeuver !== 'auto' && getFighterManeuverSpec(fighterManeuver).group === 'acm';
      if (isCombat) {
        aircraftAudio.playFighterCombatVoice(s.soundEnabled);
      } else {
        aircraftAudio.stopVoiceRadio();
      }
    }
  },
  setJupiterManeuver: (jupiterManeuver) => set({ jupiterManeuver }),
  triggerAar: () => {
    const s = get();
    aircraftAudio.unlock();
    aircraftAudio.resetPhaseTriggers();
    set({
      flightMode: 'aar',
      flightNonce: s.flightNonce + 1,
      flightLabel: 'AAR • PENGISIAN BAHAN BAKAR DI UDARA (KC-130B SKADRON 32)',
      safetyMode: false,
      aeroMode: false,
      oxygenMode: false,
      autoRotate: false,
      activeHotspot: null,
      aarFuel: 35,
      aarStep: 0,
      camRequest: { pos: [19.5, 8.8, 25.0] as Vec3, target: [0, 3.6, 8.5] as Vec3, nonce: nonce++ },
    });
  },
  setAarProgress: (aarFuel, aarStep) => {
    const s = get();
    if (s.aarFuel !== aarFuel || s.aarStep !== aarStep) {
      set({ aarFuel, aarStep });
    }
  },
  triggerMission: () => {
    const s = get();
    const u = getUnit(s.selectedId);
    aircraftAudio.unlock();
    aircraftAudio.resetPhaseTriggers();
    const label =
      u.category === 'Helikopter'
        ? 'MISI SAR LAUT • RESCUE HOIST EVAKUASI KORBAN'
        : u.category === 'Angkut & VIP'
          ? 'MISI ANGKUT • DROP BARANG LOGISTIK & TERJUN PAYUNG KOPASGAT'
          : 'MISI TEMPUR • FLARE COUNTERMEASURE & SCRAMBLE INTERSEP';
    set({
      flightMode: 'mission',
      flightNonce: s.flightNonce + 1,
      flightLabel: label,
      safetyMode: false,
      aeroMode: false,
      oxygenMode: false,
      autoRotate: false,
      activeHotspot: null,
      camRequest:
        u.category === 'Helikopter'
          ? { pos: [14.5, 6.2, 16.5] as Vec3, target: [0, 1.8, 0] as Vec3, nonce: nonce++ }
          : { pos: [17.5, 7.5, 21.0] as Vec3, target: [0, 2.2, -2.5] as Vec3, nonce: nonce++ },
    });
  },
  triggerJupiterShow: () => {
    const s = get();
    const mobile = isCompactViewport();
    aircraftAudio.unlock();
    aircraftAudio.resetPhaseTriggers();
    pinRegistry.clear();
    set({
      selectedId: 'kt1b',
      flightMode: 'maneuver',
      flightNonce: s.flightNonce + 1,
      jupiterManeuver: 'auto',
      flightLabel: 'JUPITER AEROBATIC SHOW • JUPITER 1 MEMIMPIN FORMASI',
      safetyMode: false,
      aeroMode: false,
      oxygenMode: false,
      showcaseMode: false,
      autoRotate: false,
      activeHotspot: null,
      leftOpen: mobile ? false : s.leftOpen,
      camRequest: { pos: [34, 18, 44] as Vec3, target: [0, 3.2, -13] as Vec3, nonce: nonce++ },
    });
  },
  cycleTimeOfDay: () =>
    set((s) => ({
      timeOfDay: s.timeOfDay === 'day' ? 'sunset' : s.timeOfDay === 'sunset' ? 'night' : 'day',
    })),
  toggleShowcase: () =>
    set((s) => {
      const next = !s.showcaseMode;
      return {
        showcaseMode: next,
        autoRotate: next,
        leftOpen: next ? false : s.leftOpen,
        rightOpen: next ? false : s.rightOpen,
      };
    }),
  replaySafety: () => set((s) => ({ safetyNonce: s.safetyNonce + 1, safetyStep: 0 })),
  setSafetyStep: (safetyStep) => {
    if (get().safetyStep !== safetyStep) set({ safetyStep });
  },

  triggerTakeOff: () => {
    const s = get();
    if (s.flightMode !== 'parked') return;
    aircraftAudio.unlock();
    aircraftAudio.resetPhaseTriggers();
    set({
      flightMode: 'takeoff',
      flightNonce: s.flightNonce + 1,
      flightLabel: 'TAHAP 1 • TAKE OFF DI RUNWAY & FULL POWER',
      autoRotate: false,
      activeHotspot: null,
    });
  },
  triggerManeuver: () => {
    const s = get();
    if (
      s.flightMode !== 'airborne' &&
      s.flightMode !== 'maneuver' &&
      s.flightMode !== 'mission' &&
      s.flightMode !== 'aar'
    )
      return;
    aircraftAudio.unlock();
    aircraftAudio.resetPhaseTriggers();
    const activating = s.flightMode !== 'maneuver';
    if (activating) {
      const u = getUnit(s.selectedId);
      const isCombat =
        u.category === 'Tempur' &&
        s.fighterManeuver !== 'auto' &&
        getFighterManeuverSpec(s.fighterManeuver).group === 'acm';
      if (isCombat) {
        aircraftAudio.playFighterCombatVoice(s.soundEnabled);
      }
    }
    set({
      flightMode: activating ? 'maneuver' : 'airborne',
      flightNonce: s.flightNonce + 1,
      flightLabel: activating
        ? s.selectedId === 'kt1b'
          ? 'JUPITER AEROBATIC TEAM (6-SHIP) • FORMASI AKTIF'
          : 'TAHAP 2 • MANUVER UDARA AKTIF'
        : 'TERBANG JELAJAH • SIAP MANUVER ATAU LANDING',
      autoRotate: false,
      activeHotspot: null,
      ...(activating && s.selectedId === 'kt1b'
        ? { camRequest: { pos: [26.0, 18.0, 44.0] as Vec3, target: [0, 3.5, -8.5] as Vec3, nonce: nonce++ } }
        : {}),
    });
  },
  triggerLanding: () => {
    const s = get();
    if (
      s.flightMode !== 'airborne' &&
      s.flightMode !== 'maneuver' &&
      s.flightMode !== 'mission' &&
      s.flightMode !== 'aar'
    )
      return;
    aircraftAudio.unlock();
    aircraftAudio.resetPhaseTriggers();
    set({
      flightMode: 'landing',
      flightNonce: s.flightNonce + 1,
      flightLabel: 'TAHAP 3 • LANDING • FINAL APPROACH KE RUNWAY',
      autoRotate: false,
      activeHotspot: null,
    });
  },
  toggleEngineSim: () => {
    aircraftAudio.unlock();
    aircraftAudio.resetPhaseTriggers();
    set((s) => {
      const activating = s.flightMode !== 'engineSim';
      const isGSuit = s.selectedId === 'gsuit';
      const isHelmet = s.selectedId === 'pilot-helmet';
      return {
        flightMode: activating ? 'engineSim' : 'parked',
        flightNonce: s.flightNonce + 1,
        flightLabel: activating
          ? isGSuit
            ? 'SIMULASI 9G • KANTUNG UDARA G-SUIT MENGEMBANG & SALURAN TEKANAN AKTIF'
            : isHelmet
              ? 'SIMULASI HMDS • VISOR HUD AKTIF & SUPLAI OKSIGEN OBOGS'
              : 'SIMULASI MESIN • RODA MASUK OTOMATIS'
          : null,
        activeHotspot: activating ? null : s.activeHotspot,
      };
    });
  },
  setFlightState: (flightMode, flightLabel) => {
    const s = get();
    const isVvip = s.selectedId === 'b737vip' || s.selectedId === 'falcon8x';
    set({
      flightMode,
      flightLabel,
      ...(flightMode === 'airborne' && isVvip
        ? { camRequest: { pos: [30.0, 14.5, 42.0] as Vec3, target: [-2.0, 3.4, -4.5] as Vec3, nonce: nonce++ } }
        : {}),
    });
  },
  setFlightLabel: (flightLabel) => {
    if (get().flightLabel !== flightLabel) set({ flightLabel });
  },

  requestCamera: (pos, target) => set({ camRequest: { pos, target, nonce: nonce++ } }),
  resetCamera: () => set({ camRequest: { ...getDefaultCamera(get().selectedId), nonce: nonce++ }, activeHotspot: null }),
  focusHotspot: (id) => {
    const unit = getUnit(get().selectedId);
    const h = unit.hotspots.find((x) => x.id === id);
    if (!h) return;
    const obj = pinRegistry.get(id);
    if (obj) obj.getWorldPosition(tmp);
    else tmp.set(...h.pos);
    const scale = isPortraitMobile() ? 1.35 : 1;
    const target: Vec3 = [tmp.x, tmp.y, tmp.z];
    const pos: Vec3 = [tmp.x + h.camOffset[0] * scale, tmp.y + h.camOffset[1] * scale, tmp.z + h.camOffset[2] * scale];
    set({
      activeHotspot: id,
      showPins: true,
      autoRotate: false,
      leftOpen: isCompactViewport() ? false : get().leftOpen,
      rightOpen: isCompactViewport() ? false : get().rightOpen,
      camRequest: { pos, target, nonce: nonce++ },
    });
  },
  clearHotspot: () => set({ activeHotspot: null }),

  startQuiz: () => {
    const unit = getUnit(get().selectedId);
    const mobile = isCompactViewport();
    set({
      quiz: { ...emptyQuiz, status: 'active', order: shuffle(unit.hotspots.map((h) => h.id)).slice(0, 5) },
      infoTab: 'quiz',
      showPins: true,
      showInfographic: false,
      autoRotate: false,
      activeHotspot: null,
      leftOpen: mobile ? false : get().leftOpen,
      rightOpen: mobile ? false : get().rightOpen,
      camRequest: { ...getDefaultCamera(unit.id), nonce: nonce++ },
    });
  },
  answerQuiz: (pickedId) => {
    const q = get().quiz;
    if (q.status !== 'active' || q.feedback) return;
    const questionId = q.order[q.index];
    const ans: QuizAnswer = { questionId, pickedId, correct: questionId === pickedId };
    set({
      quiz: { ...q, feedback: ans, answers: [...q.answers, ans], score: q.score + (ans.correct ? 1 : 0) },
    });
  },
  nextQuestion: () => {
    const q = get().quiz;
    if (q.status !== 'active') return;
    if (q.index + 1 >= q.order.length) {
      set({
        quiz: { ...q, status: 'finished', feedback: null },
        rightOpen: true,
      });
    } else {
      set({ quiz: { ...q, index: q.index + 1, feedback: null } });
    }
  },
  exitQuiz: () => set({ quiz: emptyQuiz }),
}));

export const useSelectedUnit = () => {
  const id = useHangarStore((s) => s.selectedId);
  return getUnit(id);
};

export const filterFleet = (search: string, category: 'Semua' | AircraftCategory) => {
  const q = search.trim().toLowerCase();
  return FLEET.filter((u) => {
    if (category !== 'Semua' && u.category !== category) return false;
    if (!q) return true;
    return [u.name, u.code, u.tailNumber, u.role, u.origin, u.squadron, u.category].some((f) => f.toLowerCase().includes(q));
  });
};
