export type JupiterManeuverId =
  | 'auto'
  | 'jupiterRoll'
  | 'jupiterRollBack'
  | 'arrowHead'
  | 'eagleToArrow'
  | 'heart'
  | 'diamond'
  | 'delta'
  | 'cloverLeaf'
  | 'bombBurst'
  | 'screwRoll'
  | 'garuda'
  | 'snakeLoop'
  | 'mirror'
  | 'twinHalfCuban'
  | 'barrelRoll'
  | 'rollSlide'
  | 'soloSpin'
  | 'fiveCards'
  | 'leaderBenefit'
  | 'crossOverBreak'
  | 'bombers';

export interface JupiterManeuverSpec {
  id: Exclude<JupiterManeuverId, 'auto'>;
  name: string;
  group: 'andalan' | 'spesial';
  element: string;
  activeShips: number[];
  desc: string;
}

const ALL_6 = [1, 2, 3, 4, 5, 6];

export const JUPITER_MANEUVERS: JupiterManeuverSpec[] = [
  // === MANUVER & FORMASI ANDALAN ===
  {
    id: 'jupiterRoll',
    name: 'Jupiter Roll',
    group: 'andalan',
    element: '6 Pesawat (Main Body + Synchro)',
    activeShips: ALL_6,
    desc: 'Gulingan 360° serentak seluruh formasi 6 KT-1B Wong Bee dengan asap putih solid.',
  },
  {
    id: 'jupiterRollBack',
    name: 'Jupiter Roll Back',
    group: 'andalan',
    element: '6 Pesawat (Main Body + Synchro)',
    activeShips: ALL_6,
    desc: 'Gulingan 360° ke kanan lalu langsung dibalas counter-roll 360° ke kiri secara presisi.',
  },
  {
    id: 'arrowHead',
    name: 'Arrow Head Loop',
    group: 'andalan',
    element: '6 Pesawat • Formasi Anak Panah',
    activeShips: ALL_6,
    desc: 'Formasi anak panah rapat 6 pesawat menanjak membentuk lingkaran vertikal penuh.',
  },
  {
    id: 'eagleToArrow',
    name: 'Eagle to Arrow Head Loop',
    group: 'andalan',
    element: '6 Pesawat • Transisi Formasi',
    activeShips: ALL_6,
    desc: 'Berawal dari formasi lebar Elang (Eagle) lalu merapat mulus menjadi Anak Panah saat loop.',
  },
  {
    id: 'heart',
    name: 'Heart Loop / Hearts',
    group: 'andalan',
    element: '2 Pesawat • Synchro (J5–J6)',
    activeShips: [5, 6],
    desc: 'Hanya Jupiter 5 & 6 di panggung melukis bentuk Hati (♥) raksasa dari asap putih di langit biru!',
  },
  {
    id: 'diamond',
    name: 'Tango to Diamond Loop',
    group: 'andalan',
    element: '4 Pesawat • Main Body (J1–J4)',
    activeShips: [1, 2, 3, 4],
    desc: '4 pesawat Main Body membentuk wajik (Diamond) rapat melakukan loop, sementara Synchro menyingkir.',
  },
  {
    id: 'delta',
    name: 'Delta Loop',
    group: 'andalan',
    element: '6 Pesawat • Segitiga Delta (1-2-3)',
    activeShips: ALL_6,
    desc: 'Formasi segitiga Delta 6 pesawat penuh melakukan looping megah dengan 6 jalur asap.',
  },
  {
    id: 'cloverLeaf',
    name: 'Clover Leaf Cascade',
    group: 'andalan',
    element: '6 Pesawat Bergantian',
    activeShips: ALL_6,
    desc: 'Manuver 4 kelopak daun semanggi dengan putaran 90° dan efek air terjun asap.',
  },
  {
    id: 'bombBurst',
    name: 'Bomb Burst',
    group: 'andalan',
    element: '6 Pesawat Memencar Radial',
    activeShips: ALL_6,
    desc: 'Puncak pertunjukan! 6 pesawat menanjak vertikal lalu memencar meledak ke 6 penjuru!',
  },

  // === MANUVER VARIASI & SPESIAL ===
  {
    id: 'screwRoll',
    name: 'Super Screw Roll',
    group: 'spesial',
    element: '2 Pesawat • Synchro (J5–J6)',
    activeShips: [5, 6],
    desc: 'Jupiter 5 terbang lurus sebagai sumbu, Jupiter 6 berputar spiral (ulir sekrup) mengelilinginya!',
  },
  {
    id: 'garuda',
    name: 'Garuda Loop (Sayap Garuda)',
    group: 'spesial',
    element: '6 Pesawat • Sayap Sang Garuda',
    activeShips: ALL_6,
    desc: '6 pesawat membentangkan siluet Sayap Sang Garuda Nusantara saat menanjak loop.',
  },
  {
    id: 'snakeLoop',
    name: 'Snake Loop',
    group: 'spesial',
    element: '6 Pesawat Ekor-Beriringan',
    activeShips: ALL_6,
    desc: 'Formasi memanjang meliuk bergelombang seperti ular menembus awan sambil loop.',
  },
  {
    id: 'mirror',
    name: 'Mirror (Terbang Terbalik)',
    group: 'spesial',
    element: '2 Pesawat • Synchro (J5 & J6 180°)',
    activeShips: [5, 6],
    desc: 'Hanya 2 pesawat Synchro: Jupiter 5 terbang normal berdampingan rapat dengan Jupiter 6 terbalik 180°!',
  },
  {
    id: 'twinHalfCuban',
    name: 'Twin Half Cuban & Stall Turn',
    group: 'spesial',
    element: '2 Pesawat • Synchro (J5–J6)',
    activeShips: [5, 6],
    desc: '2 pesawat Synchro melakukan setengah loop, gulingan 180°, silang menukik, dan stall turn vertikal.',
  },
  {
    id: 'barrelRoll',
    name: 'Barrel Roll & Loop',
    group: 'spesial',
    element: '6 Pesawat Serempak',
    activeShips: ALL_6,
    desc: 'Lintasan spiral tong 360° secara harmonis oleh seluruh 6 pesawat KT-1B.',
  },
  {
    id: 'rollSlide',
    name: 'Roll Slide',
    group: 'spesial',
    element: '6 Pesawat • Main Body + Synchro',
    activeShips: ALL_6,
    desc: 'Gulingan cepat diikuti pergeseran lateral menyilang posisi antar elemen formasi.',
  },
  {
    id: 'soloSpin',
    name: 'Solo Spin',
    group: 'spesial',
    element: '1 Pesawat • Solo (Jupiter 5)',
    activeShips: [5],
    desc: 'Atraksi tunggal Jupiter 5 menukik berputar spin spiral tajam sementara 5 pesawat lain menyingkir.',
  },
  {
    id: 'fiveCards',
    name: 'Five Cards Loop',
    group: 'spesial',
    element: '5 Pesawat • Formasi Kipas (J1–J5)',
    activeShips: [1, 2, 3, 4, 5],
    desc: 'Lima pesawat membuka formasi kipas kartu lebar melakukan looping beriringan.',
  },
  {
    id: 'leaderBenefit',
    name: 'Leader Benefit',
    group: 'spesial',
    element: '6 Pesawat • J1 Leader + 5 Pengawal',
    activeShips: ALL_6,
    desc: 'Jupiter 1 melesat menonjol di tengah dibingkai simetris oleh Jupiter 2 hingga 6.',
  },
  {
    id: 'crossOverBreak',
    name: 'Cross Over Break',
    group: 'spesial',
    element: '6 Pesawat • Pecah Silang',
    activeShips: ALL_6,
    desc: 'Elemen kiri dan kanan membelok tajam saling menyilang membelah langit!',
  },
  {
    id: 'bombers',
    name: 'Bombers Formation',
    group: 'spesial',
    element: '6 Pesawat Echelon Lebar',
    activeShips: ALL_6,
    desc: 'Lintasan rendah berjajar lebar ala formasi pembom berat dengan 6 garis asap paralel.',
  },
];

export const JUPITER_AUTO_ORDER: Exclude<JupiterManeuverId, 'auto'>[] = [
  'arrowHead',
  'jupiterRoll',
  'mirror',
  'heart',
  'diamond',
  'garuda',
  'bombBurst',
  'screwRoll',
  'crossOverBreak',
  'delta',
  'snakeLoop',
  'soloSpin',
];

export function getJupiterSpec(id: Exclude<JupiterManeuverId, 'auto'>): JupiterManeuverSpec {
  return JUPITER_MANEUVERS.find((m) => m.id === id) ?? JUPITER_MANEUVERS[0];
}
