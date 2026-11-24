import { create } from 'zustand';
import * as THREE from 'three';
import { FLEET, getUnit, type AircraftCategory } from '../data/fleetData';

export type InfoTab = 'spec' | 'ops' | 'quiz';
export type Vec3 = [number, number, number];

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
  selectedId: string;
  search: string;
  category: 'Semua' | AircraftCategory;
  leftOpen: boolean;
  rightOpen: boolean;
  infoTab: InfoTab;

  xray: boolean;
  wireframe: boolean;
  showPins: boolean;
  autoRotate: boolean;
  engineSim: boolean;

  activeHotspot: number | null;
  camRequest: CamRequest | null;
  quiz: QuizState;

  selectAircraft: (id: string) => void;
  setSearch: (v: string) => void;
  setCategory: (c: 'Semua' | AircraftCategory) => void;
  toggleLeft: () => void;
  toggleRight: () => void;
  setInfoTab: (t: InfoTab) => void;
  toggle: (key: 'xray' | 'wireframe' | 'showPins' | 'autoRotate' | 'engineSim') => void;

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

export const useHangarStore = create<HangarState>((set, get) => ({
  selectedId: 'f16id',
  search: '',
  category: 'Semua',
  leftOpen: true,
  rightOpen: true,
  infoTab: 'spec',

  xray: false,
  wireframe: false,
  showPins: true,
  autoRotate: false,
  engineSim: false,

  activeHotspot: null,
  camRequest: null,
  quiz: emptyQuiz,

  selectAircraft: (id) => {
    if (id === get().selectedId) return;
    pinRegistry.clear();
    set({
      selectedId: id,
      activeHotspot: null,
      quiz: emptyQuiz,
      infoTab: get().infoTab === 'quiz' ? 'quiz' : get().infoTab,
      camRequest: { ...DEFAULT_CAMERA, nonce: nonce++ },
    });
  },
  setSearch: (search) => set({ search }),
  setCategory: (category) => set({ category }),
  toggleLeft: () => set((s) => ({ leftOpen: !s.leftOpen })),
  toggleRight: () => set((s) => ({ rightOpen: !s.rightOpen })),
  setInfoTab: (infoTab) => set({ infoTab }),
  toggle: (key) => {
    const next = !get()[key];
    set({ [key]: next } as Partial<HangarState>);
    if (key === 'autoRotate' && next) set({ activeHotspot: null });
  },

  requestCamera: (pos, target) => set({ camRequest: { pos, target, nonce: nonce++ } }),
  resetCamera: () => set({ camRequest: { ...DEFAULT_CAMERA, nonce: nonce++ }, activeHotspot: null }),
  focusHotspot: (id) => {
    const unit = getUnit(get().selectedId);
    const h = unit.hotspots.find((x) => x.id === id);
    if (!h) return;
    const obj = pinRegistry.get(id);
    if (obj) obj.getWorldPosition(tmp);
    else tmp.set(...h.pos);
    const target: Vec3 = [tmp.x, tmp.y, tmp.z];
    const pos: Vec3 = [tmp.x + h.camOffset[0], tmp.y + h.camOffset[1], tmp.z + h.camOffset[2]];
    set({ activeHotspot: id, autoRotate: false, camRequest: { pos, target, nonce: nonce++ } });
  },
  clearHotspot: () => set({ activeHotspot: null }),

  startQuiz: () => {
    const unit = getUnit(get().selectedId);
    set({
      quiz: { ...emptyQuiz, status: 'active', order: shuffle(unit.hotspots.map((h) => h.id)) },
      infoTab: 'quiz',
      showPins: true,
      autoRotate: false,
      activeHotspot: null,
      camRequest: { ...DEFAULT_CAMERA, nonce: nonce++ },
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
    if (q.index + 1 >= q.order.length) set({ quiz: { ...q, status: 'finished', feedback: null } });
    else set({ quiz: { ...q, index: q.index + 1, feedback: null } });
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
