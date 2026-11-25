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
  desc: string;
}

export const JUPITER_MANEUVERS: JupiterManeuverSpec[] = [
  // === MANUVER & FORMASI ANDALAN ===
  {
    id: 'jupiterRoll',
    name: 'Jupiter Roll',
    group: 'andalan',
    element: '6 Pesawat (Main Body + Synchro)',
    desc: 'Gulingan 360° serentak seluruh formasi 6 KT-1B Wong Bee dengan asap putih solid.',
  },
  {
    id: 'jupiterRollBack',
    name: 'Jupiter Roll Back',
    group: 'andalan',
    element: '6 Pesawat (Main Body + Synchro)',
    desc: 'Gulingan 360° ke kanan lalu langsung dibalas counter-roll 360° ke kiri secara presisi.',
  },
  {
    id: 'arrowHead',
    name: 'Arrow Head Loop',
    group: 'andalan',
    element: 'Formasi Anak Panah (J1–J6)',
    desc: 'Formasi anak panah rapat 6 pesawat menanjak membentuk lingkaran vertikal penuh.',
  },
  {
    id: 'eagleToArrow',
    name: 'Eagle to Arrow Head Loop',
    group: 'andalan',
    element: '6 Pesawat Transisi Formasi',
    desc: 'Berawal dari formasi lebar Elang (Eagle) lalu merapat mulus menjadi Anak Panah saat loop.',
  },
  {
    id: 'heart',
    name: 'Heart Loop / Hearts',
    group: 'andalan',
    element: 'Synchro (J5–J6) + Main Body',
    desc: 'Jupiter 5 & 6 memisah melukis bentuk Hati (♥) raksasa dari asap putih di langit biru!',
  },
  {
    id: 'diamond',
    name: 'Tango to Diamond Loop',
    group: 'andalan',
    element: 'Main Body (J1–J4) + Synchro',
    desc: 'Main Body membentuk wajik (Diamond) rapat sementara Synchro bergabung dalam loop.',
  },
  {
    id: 'delta',
    name: 'Delta Loop',
    group: 'andalan',
    element: 'Formasi Segitiga Delta (1-2-3)',
    desc: 'Formasi segitiga Delta 6 pesawat penuh melakukan looping megah dengan 6 jalur asap.',
  },
  {
    id: 'cloverLeaf',
    name: 'Clover Leaf Cascade',
    group: 'andalan',
    element: '6 Pesawat Bergantian',
    desc: 'Manuver 4 kelopak daun semanggi dengan putaran 90° dan efek air terjun asap.',
  },
  {
    id: 'bombBurst',
    name: 'Bomb Burst',
    group: 'andalan',
    element: '6 Pesawat Memencar Radial',
    desc: 'Puncak pertunjukan! 6 pesawat menanjak vertikal lalu memencar meledak ke 6 penjuru!',
  },

  // === MANUVER VARIASI & SPESIAL ===
  {
    id: 'screwRoll',
    name: 'Super Screw Roll',
    group: 'spesial',
    element: 'Synchro (J5–J6) + Main Body',
    desc: 'Synchro J5 & J6 berputar spiral (ulir sekrup) mengelilingi sumbu terbang Main Body.',
  },
  {
    id: 'garuda',
    name: 'Garuda Loop (Sayap Garuda)',
    group: 'spesial',
    element: 'Formasi Sayap Sang Garuda',
    desc: '6 pesawat membentangkan siluet Sayap Sang Garuda Nusantara saat menanjak loop.',
  },
  {
    id: 'snakeLoop',
    name: 'Snake Loop',
    group: 'spesial',
    element: '6 Pesawat Ekor-Beriringan',
    desc: 'Formasi memanjang meliuk bergelombang seperti ular menembus awan sambil loop.',
  },
  {
    id: 'mirror',
    name: 'Mirror (Terbang Terbalik)',
    group: 'spesial',
    element: 'Synchro J5 Normal & J6 Terbalik 180°',
    desc: 'Jupiter 5 terbang normal berdampingan rapat dengan Jupiter 6 dalam posisi terbalik 180°!',
  },
  {
    id: 'twinHalfCuban',
    name: 'Twin Half Cuban & Stall Turn',
    group: 'spesial',
    element: 'Synchro Pair (J5–J6)',
    desc: 'Setengah loop menanjak, gulingan 180°, silang menukik, dan stall turn vertikal.',
  },
  {
    id: 'barrelRoll',
    name: 'Barrel Roll & Loop',
    group: 'spesial',
    element: '6 Pesawat Serempak',
    desc: 'Lintasan spiral tong 360° secara harmonis oleh seluruh 6 pesawat KT-1B.',
  },
  {
    id: 'rollSlide',
    name: 'Roll Slide',
    group: 'spesial',
    element: 'Main Body + Synchro Shift',
    desc: 'Gulingan cepat diikuti pergeseran lateral menyilang posisi antar elemen formasi.',
  },
  {
    id: 'soloSpin',
    name: 'Solo Spin',
    group: 'spesial',
    element: 'Jupiter 5/6 Solo + Main Body Orbit',
    desc: 'Pesawat solo menukik berputar spin spiral tajam sementara Main Body mengorbit.',
  },
  {
    id: 'fiveCards',
    name: 'Five Cards Loop',
    group: 'spesial',
    element: '5 Pesawat Kipas + 1 Solo',
    desc: 'Lima pesawat membuka formasi kipas kartu lebar melakukan looping beriringan.',
  },
  {
    id: 'leaderBenefit',
    name: 'Leader Benefit',
    group: 'spesial',
    element: 'Jupiter 1 Leader + 5 Pengawal',
    desc: 'Jupiter 1 melesat menonjol di tengah dibingkai simetris oleh Jupiter 2 hingga 6.',
  },
  {
    id: 'crossOverBreak',
    name: 'Cross Over Break',
    group: 'spesial',
    element: 'Pecah Silang Kiri & Kanan',
    desc: 'Elemen kiri dan kanan membelok tajam saling menyilang membelah langit!',
  },
  {
    id: 'bombers',
    name: 'Bombers Formation',
    group: 'spesial',
    element: '6 Pesawat Echelon Lebar',
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
