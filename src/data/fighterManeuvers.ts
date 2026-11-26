export type FighterManeuverId =
  | 'auto'
  | 'loop'
  | 'barrelRoll'
  | 'aileronRoll'
  | 'splitS'
  | 'immelmann'
  | 'chandelle'
  | 'cubanEight';

export interface FighterManeuverSpec {
  id: Exclude<FighterManeuverId, 'auto'>;
  name: string;
  desc: string;
}

export const FIGHTER_MANEUVERS: FighterManeuverSpec[] = [
  {
    id: 'loop',
    name: 'Loop (360° Vertikal)',
    desc: 'Putaran vertikal penuh 360° membentuk lingkaran sempurna di udara.',
  },
  {
    id: 'barrelRoll',
    name: 'Barrel Roll',
    desc: 'Berputar menyamping membentuk lintasan spiral halus di udara.',
  },
  {
    id: 'aileronRoll',
    name: 'Aileron Roll',
    desc: 'Pesawat berputar 360° pada poros memanjang tanpa mengubah arah terbang lurus.',
  },
  {
    id: 'splitS',
    name: 'Split S',
    desc: 'Setengah gulung ke posisi terbalik lalu menukik tajam untuk berbalik arah & turun cepat.',
  },
  {
    id: 'immelmann',
    name: 'Immelmann Turn',
    desc: 'Setengah loop menanjak diikuti setengah gulung 180° untuk berbalik arah & tambah ketinggian.',
  },
  {
    id: 'chandelle',
    name: 'Chandelle',
    desc: 'Belokan menanjak tajam 180° mengonversi kecepatan menjadi ketinggian maksimal.',
  },
  {
    id: 'cubanEight',
    name: 'Cuban Eight',
    desc: 'Gabungan dua loop dan half-roll membentuk lintasan angka delapan (∞) horizontal di udara.',
  },
];

export const FIGHTER_AUTO_ORDER: Exclude<FighterManeuverId, 'auto'>[] = [
  'loop',
  'barrelRoll',
  'aileronRoll',
  'immelmann',
  'chandelle',
  'splitS',
  'cubanEight',
];

export function getFighterManeuverSpec(id: Exclude<FighterManeuverId, 'auto'>): FighterManeuverSpec {
  return FIGHTER_MANEUVERS.find((m) => m.id === id) ?? FIGHTER_MANEUVERS[0];
}
