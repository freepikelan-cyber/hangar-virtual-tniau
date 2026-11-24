import { create } from 'zustand';
import * as THREE from 'three';
import { FLEET, getUnit, type AircraftCategory } from '../data/fleetData';

export type InfoTab = 'spec' | 'ops' | 'quiz';
export type FlightMode = 'parked' | 'takeoff' | 'landing' | 'engineSim';
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
      return { pos: [3.4, 5.8, 17.8], target: [0, 5.4, 0] };
    }
    return { pos: [2.6, 5.8, 13.8], target: [0, 5.4, 0] };
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
  flightMode: FlightMode;
  flightNonce: number;
  flightLabel: string | null;

  activeHotspot: number | null;
  camRequest: CamRequest | null;
  quiz: QuizState;

  enterHangar: () => void;
  openWelcome: () => void;
  toggleInfographic: () => void;
  closeInfographic: () => void;
  selectAircraft: (id: string) => void;
  setSearch: (v: string) => void;
  setCategory: (c: 'Semua' | AircraftCategory) => void;
  toggleLeft: () => void;
  toggleRight: () => void;
  setInfoTab: (t: InfoTab) => void;
  toggle: (key: 'wireframe' | 'showPins' | 'autoRotate') => void;

  triggerTakeOff: () => void;
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
  selectedId: 'f16id',
  search: '',
  category: 'Semua',
  leftOpen: initialDesktop,
  rightOpen: initialDesktop,
  infoTab: 'spec',

  wireframe: false,
  showInfographic: false,
  showPins: false,
  autoRotate: false,
  flightMode: 'parked',
  flightNonce: 0,
  flightLabel: null,

  activeHotspot: null,
  camRequest: null,
  quiz: emptyQuiz,

  enterHangar: () => set({ showWelcome: false }),
  openWelcome: () => set({ showWelcome: true, showInfographic: false }),
  toggleInfographic: () => set((s) => ({ showInfographic: !s.showInfographic })),
  closeInfographic: () => set({ showInfographic: false }),

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
      return { rightOpen: next, leftOpen: next && isCompactViewport() ? false : s.leftOpen };
    }),
  setInfoTab: (infoTab) => set({ infoTab }),
  toggle: (key) => {
    const next = !get()[key];
    set({ [key]: next } as Partial<HangarState>);
    if (key === 'autoRotate' && next) set({ activeHotspot: null });
  },

  triggerTakeOff: () =>
    set((s) => ({
      flightMode: 'takeoff',
      flightNonce: s.flightNonce + 1,
      flightLabel: 'TAKE OFF • ANCANG-ANCANG & FULL POWER',
      autoRotate: false,
      activeHotspot: null,
    })),
  triggerLanding: () =>
    set((s) => ({
      flightMode: 'landing',
      flightNonce: s.flightNonce + 1,
      flightLabel: 'LANDING • FINAL APPROACH & RODA KELUAR',
      autoRotate: false,
      activeHotspot: null,
    })),
  toggleEngineSim: () =>
    set((s) => {
      const activating = s.flightMode !== 'engineSim';
      const isGSuit = s.selectedId === 'gsuit';
      return {
        flightMode: activating ? 'engineSim' : 'parked',
        flightNonce: s.flightNonce + 1,
        flightLabel: activating
          ? isGSuit
            ? 'SIMULASI 9G • KANTUNG UDARA G-SUIT MENGEMBANG & VISOR HMDS AKTIF'
            : 'SIMULASI MESIN • RODA MASUK OTOMATIS'
          : null,
        activeHotspot: activating ? null : s.activeHotspot,
      };
    }),
  setFlightState: (flightMode, flightLabel) => set({ flightMode, flightLabel }),
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
