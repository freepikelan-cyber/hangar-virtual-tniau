export type FighterManeuverId =
  | 'auto'
  // 1. Manuver Dasar
  | 'loop'
  | 'barrelRoll'
  | 'aileronRoll'
  | 'splitS'
  | 'immelmann'
  | 'chandelle'
  | 'cubanEight'
  // 2. Dogfight (Pertempuran Udara)
  | 'dogfight'
  // 3. Supermaneuverability
  | 'cobra'
  | 'kulbit'
  | 'herbst'
  | 'fallingLeaf'
  | 'tailslide';

export interface FighterManeuverSpec {
  id: Exclude<FighterManeuverId, 'auto'>;
  name: string;
  group: 'dasar' | 'acm' | 'super';
  desc: string;
}

export const FIGHTER_MANEUVERS: FighterManeuverSpec[] = [
  // === 1. MANUVER DASAR ===
  {
    id: 'loop',
    name: 'Loop (360° Vertikal)',
    group: 'dasar',
    desc: 'Putaran vertikal penuh 360° membentuk lingkaran sempurna di udara.',
  },
  {
    id: 'barrelRoll',
    name: 'Barrel Roll',
    group: 'dasar',
    desc: 'Berputar menyamping membentuk lintasan spiral seperti menyusuri dinding dalam tabung.',
  },
  {
    id: 'aileronRoll',
    name: 'Aileron Roll',
    group: 'dasar',
    desc: 'Pesawat berputar 360° pada poros memanjang tanpa mengubah arah terbang lurus.',
  },
  {
    id: 'splitS',
    name: 'Split S',
    group: 'dasar',
    desc: 'Setengah gulung ke posisi terbalik lalu menukik tajam untuk berbalik arah & turun cepat.',
  },
  {
    id: 'immelmann',
    name: 'Immelmann Turn',
    group: 'dasar',
    desc: 'Setengah loop menanjak diikuti setengah gulung 180° untuk berbalik arah & tambah ketinggian.',
  },
  {
    id: 'chandelle',
    name: 'Chandelle',
    group: 'dasar',
    desc: 'Belokan menanjak tajam 180° mengonversi kecepatan menjadi ketinggian maksimal.',
  },
  {
    id: 'cubanEight',
    name: 'Cuban Eight',
    group: 'dasar',
    desc: 'Gabungan dua loop dan half-roll membentuk lintasan angka delapan (∞) horizontal di udara.',
  },

  // === 2. DOGFIGHT (PERTEMPURAN UDARA) ===
  {
    id: 'dogfight',
    name: 'Dogfight (Pertempuran Udara)',
    group: 'acm',
    desc: 'Drama pertempuran udara 1-vs-1: pengejaran, salvo flare, tembakan kanon & rudal hingga pesawat musuh meledak hancur dan jatuh!',
  },

  // === 3. SUPERMANEUVERABILITY ===
  {
    id: 'cobra',
    name: "Pugachev's Cobra",
    group: 'super',
    desc: 'Hidung mendongak ekstrem 90–115° seperti ular kobra untuk mengerem laju udara seketika!',
  },
  {
    id: 'kulbit',
    name: "Kulbit (Frolov's Chakra)",
    group: 'super',
    desc: 'Salto vertikal 360° super ketat hampir di tempat berkat thrust vectoring!',
  },
  {
    id: 'herbst',
    name: 'Herbst Maneuver (J-Turn)',
    group: 'super',
    desc: 'Mendongak ekstrem melewati stall lalu berputar cepat berbalik arah dalam radius sangat sempit.',
  },
  {
    id: 'fallingLeaf',
    name: 'Falling Leaf',
    group: 'super',
    desc: 'Melayang turun dari sisi ke sisi secara terkendali pada kecepatan super rendah.',
  },
  {
    id: 'tailslide',
    name: 'Tailslide (Bell Maneuver)',
    group: 'super',
    desc: 'Menanjak vertikal lurus hingga berhenti, meluncur mundur sejenak, lalu menukik recovery!',
  },
];

export const FIGHTER_AUTO_ORDER: Exclude<FighterManeuverId, 'auto'>[] = [
  'cobra',
  'barrelRoll',
  'dogfight',
  'kulbit',
  'splitS',
  'loop',
  'immelmann',
  'herbst',
  'cubanEight',
  'tailslide',
];

export function getFighterManeuverSpec(id: Exclude<FighterManeuverId, 'auto'>): FighterManeuverSpec {
  return FIGHTER_MANEUVERS.find((m) => m.id === id) ?? FIGHTER_MANEUVERS[0];
}
