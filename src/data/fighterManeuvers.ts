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
  // 2. Dogfight / ACM
  | 'highGTurn'
  | 'highYoYo'
  | 'lowYoYo'
  | 'scissors'
  | 'displacementRoll'
  | 'circleFight'
  | 'thachWeave'
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

  // === 2. DOGFIGHT / ACM ===
  {
    id: 'highGTurn',
    name: 'High-G Break Turn',
    group: 'acm',
    desc: 'Belokan ekstrem beban G-Force tinggi untuk memotong sudut lawan atau menghindari rudal.',
  },
  {
    id: 'highYoYo',
    name: 'High Yo-Yo',
    group: 'acm',
    desc: 'Menanjak sementara di tengah belokan untuk mencegah overshoot lalu menukik ke ekor lawan.',
  },
  {
    id: 'lowYoYo',
    name: 'Low Yo-Yo',
    group: 'acm',
    desc: 'Menukik sementara di dalam radius belok untuk menambah kecepatan & memperkecil jarak.',
  },
  {
    id: 'scissors',
    name: 'Scissors (Rolling/Flat)',
    group: 'acm',
    desc: 'Serangkaian belokan tajam bolak-balik menyilang memaksa pengejar melampaui posisi tembak.',
  },
  {
    id: 'displacementRoll',
    name: 'Displacement Roll',
    group: 'acm',
    desc: 'Gulung kecil keluar/masuk bidang belok untuk mengatur sudut tembak & cegah overshoot.',
  },
  {
    id: 'circleFight',
    name: 'One & Two-Circle Fight',
    group: 'acm',
    desc: 'Pola pertempuran berputar ketat mengejar sudut tembak ekor lawan secara agresif.',
  },
  {
    id: 'thachWeave',
    name: 'Thach Weave',
    group: 'acm',
    desc: 'Taktik berbelok silang berpasangan memancing musuh masuk ke garis tembak rekan.',
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
  'highGTurn',
  'kulbit',
  'splitS',
  'scissors',
  'tailslide',
  'immelmann',
  'cubanEight',
];

export function getFighterManeuverSpec(id: Exclude<FighterManeuverId, 'auto'>): FighterManeuverSpec {
  return FIGHTER_MANEUVERS.find((m) => m.id === id) ?? FIGHTER_MANEUVERS[0];
}
