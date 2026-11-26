export type FighterManeuverId =
  | 'auto'
  | 'barrelRoll'
  | 'aileronRoll'
  | 'immelmann'
  | 'chandelle';

export interface FighterManeuverSpec {
  id: Exclude<FighterManeuverId, 'auto'>;
  name: string;
  desc: string;
}

export const FIGHTER_MANEUVERS: FighterManeuverSpec[] = [
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
    id: 'immelmann',
    name: 'Immelmann Turn',
    desc: 'Setengah loop menanjak diikuti setengah gulung 180° untuk berbalik arah & tambah ketinggian.',
  },
  {
    id: 'chandelle',
    name: 'Chandelle',
    desc: 'Belokan menanjak tajam 180° mengonversi kecepatan menjadi ketinggian maksimal.',
  },
];

export const FIGHTER_AUTO_ORDER: Exclude<FighterManeuverId, 'auto'>[] = [
  'barrelRoll',
  'aileronRoll',
  'immelmann',
  'chandelle',
];

export function getFighterManeuverSpec(id: Exclude<FighterManeuverId, 'auto'>): FighterManeuverSpec {
  return FIGHTER_MANEUVERS.find((m) => m.id === id) ?? FIGHTER_MANEUVERS[0];
}
