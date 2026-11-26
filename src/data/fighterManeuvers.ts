export type FighterManeuverId =
  | 'auto'
  | 'barrelRoll'
  | 'aileronRoll'
  | 'turnRight'
  | 'turnLeft'
  | 'climbUp'
  | 'bombBurst'
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
    id: 'turnRight',
    name: 'Manuver Kanan',
    desc: 'Belokan tempur miring kanan dengan sudut bank halus lalu kembali lurus stabil.',
  },
  {
    id: 'turnLeft',
    name: 'Manuver Kiri',
    desc: 'Belokan tempur miring kiri dengan sudut bank halus lalu kembali lurus stabil.',
  },
  {
    id: 'climbUp',
    name: 'Manuver Ke Atas',
    desc: 'Tanjakan tinggi bertenaga penuh menembus langit lalu melandai mulus ke posisi normal.',
  },
  {
    id: 'bombBurst',
    name: 'Bomb Burst',
    desc: 'Tanjakan tajam menuju puncak diikuti pecahan miring melebar dramatis lalu kembali stabil.',
  },
  {
    id: 'chandelle',
    name: 'Chandelle',
    desc: 'Belokan menanjak 180° mengonversi kecepatan menjadi ketinggian maksimal.',
  },
];

export const FIGHTER_AUTO_ORDER: Exclude<FighterManeuverId, 'auto'>[] = [
  'barrelRoll',
  'aileronRoll',
  'turnRight',
  'turnLeft',
  'climbUp',
  'bombBurst',
  'chandelle',
];

export function getFighterManeuverSpec(id: Exclude<FighterManeuverId, 'auto'>): FighterManeuverSpec {
  return FIGHTER_MANEUVERS.find((m) => m.id === id) ?? FIGHTER_MANEUVERS[0];
}
