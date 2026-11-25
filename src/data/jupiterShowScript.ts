export type JupiterVoiceRole = 'lead' | 'atc' | 'wingman' | 'ground';

export type JupiterShowStage =
  | 'holding'
  | 'checkin'
  | 'takeoff_roll'
  | 'climb_box'
  | 'arrowhead'
  | 'jupiter_roll'
  | 'opposing_pass'
  | 'heart_climb'
  | 'heart_carve'
  | 'heart_pierce'
  | 'bomb_burst'
  | 'echelon_rejoin'
  | 'final_approach'
  | 'touchdown_stop';

export interface JupiterDialogueLine {
  id: number;
  part: 1 | 2 | 3 | 4 | 5;
  tStart: number; // detik dari awal pertunjukan
  speaker: string;
  role: JupiterVoiceRole;
  text: string;
  stage: JupiterShowStage;
}

export interface JupiterPartMeta {
  part: 1 | 2 | 3 | 4 | 5;
  title: string;
  shortTitle: string;
  tStart: number;
  tEnd: number;
}

export const JUPITER_SHOW_TOTAL_SEC = 154;

export const JUPITER_PARTS: JupiterPartMeta[] = [
  { part: 1, title: 'Part 1: Persiapan & Permohonan Take-Off', shortTitle: '1. Holding & ATC', tStart: 0, tEnd: 21 },
  { part: 2, title: 'Part 2: Take-Off & Pembentukan Formasi', shortTitle: '2. Take-Off & Climb', tStart: 21, tEnd: 48 },
  { part: 3, title: 'Part 3: Arrowhead, Jupiter Roll & Opposing Pass', shortTitle: '3. Roll & Crossing', tStart: 48, tEnd: 84 },
  { part: 4, title: 'Part 4: Heart Maneuver & Bomb Burst', shortTitle: '4. Heart & Burst', tStart: 84, tEnd: 122 },
  { part: 5, title: 'Part 5: Echelon Rejoin & Landing', shortTitle: '5. Rejoin & Landing', tStart: 122, tEnd: 154 },
];

export const JUPITER_SCRIPT: JupiterDialogueLine[] = [
  // === PART 1: PERSIAPAN & PERMOHONAN TAKE-OFF (0..21s) ===
  {
    id: 1,
    part: 1,
    tStart: 1.0,
    speaker: 'JUPITER LEAD',
    role: 'lead',
    text: 'Adisutjipto Tower, Jupiter Flight, formation of six KT-1 Bravo, holding short Runway Zero-Nine, ready for departure.',
    stage: 'holding',
  },
  {
    id: 2,
    part: 1,
    tStart: 9.0,
    speaker: 'ADISUTJIPTO TOWER',
    role: 'atc',
    text: 'Jupiter Flight, Adisutjipto Tower. Wind zero-nine-zero at eight knots. Runway Zero-Nine, cleared for take-off. Report airborne.',
    stage: 'holding',
  },
  {
    id: 3,
    part: 1,
    tStart: 16.5,
    speaker: 'JUPITER LEAD',
    role: 'lead',
    text: 'Cleared for take-off Runway Zero-Nine, Jupiter Flight.',
    stage: 'holding',
  },

  // === PART 2: TAKE-OFF & PEMBENTUKAN FORMASI (21..48s) ===
  {
    id: 4,
    part: 2,
    tStart: 21.0,
    speaker: 'JUPITER LEAD',
    role: 'lead',
    text: 'Jupiters, check in!',
    stage: 'checkin',
  },
  { id: 5, part: 2, tStart: 22.8, speaker: 'JUPITER 2', role: 'wingman', text: 'Two!', stage: 'checkin' },
  { id: 6, part: 2, tStart: 23.8, speaker: 'JUPITER 3', role: 'wingman', text: 'Three!', stage: 'checkin' },
  { id: 7, part: 2, tStart: 24.8, speaker: 'JUPITER 4', role: 'wingman', text: 'Four!', stage: 'checkin' },
  { id: 8, part: 2, tStart: 25.8, speaker: 'JUPITER 5', role: 'wingman', text: 'Five!', stage: 'checkin' },
  { id: 9, part: 2, tStart: 26.8, speaker: 'JUPITER 6', role: 'wingman', text: 'Six!', stage: 'checkin' },
  {
    id: 10,
    part: 2,
    tStart: 28.2,
    speaker: 'JUPITER LEAD',
    role: 'lead',
    text: 'Brakes release... power up! Rolling now! ... Rotate! ... Gears up, smoke on!',
    stage: 'takeoff_roll',
  },
  {
    id: 11,
    part: 2,
    tStart: 36.5,
    speaker: 'JUPITER LEAD',
    role: 'lead',
    text: 'Adisutjipto Tower, Jupiter Flight airborne, climbing to five thousand feet, entering aerobatic box.',
    stage: 'climb_box',
  },
  {
    id: 12,
    part: 2,
    tStart: 43.0,
    speaker: 'ADISUTJIPTO TOWER',
    role: 'atc',
    text: 'Jupiter Flight, radar contact. Aerobatic box is clear. Have a great show.',
    stage: 'climb_box',
  },

  // === PART 3: DI UDARA & MANUVER PEMBUKA (48..84s) ===
  {
    id: 13,
    part: 3,
    tStart: 48.0,
    speaker: 'JUPITER LEAD',
    role: 'lead',
    text: 'Jupiters, tighten up into Arrowhead formation. Maintain spacing, steady on my wing.',
    stage: 'arrowhead',
  },
  {
    id: 14,
    part: 3,
    tStart: 54.0,
    speaker: 'JUPITER 2 • 3 • 4',
    role: 'wingman',
    text: 'Two, in position. Three, locked in. Four, steady.',
    stage: 'arrowhead',
  },
  {
    id: 15,
    part: 3,
    tStart: 59.0,
    speaker: 'JUPITER LEAD',
    role: 'lead',
    text: 'Standby for Jupiter Roll... Pulling up, twenty degrees... Ready, roll... NOW!',
    stage: 'jupiter_roll',
  },
  {
    id: 16,
    part: 3,
    tStart: 68.5,
    speaker: 'JUPITER 5 (SYNCHRO)',
    role: 'wingman',
    text: 'Five and Six, breaking off for opposing pass. Heading reciprocal, altitude five hundred feet. Visual contact!',
    stage: 'opposing_pass',
  },
  {
    id: 17,
    part: 3,
    tStart: 76.5,
    speaker: 'JUPITER 6 (SYNCHRO)',
    role: 'wingman',
    text: 'Six, visual! Closing speed four hundred knots... Three, two, one... CROSSING!',
    stage: 'opposing_pass',
  },

  // === PART 4: MANUVER PUNCAK (84..122s) ===
  {
    id: 18,
    part: 4,
    tStart: 84.0,
    speaker: 'JUPITER LEAD',
    role: 'lead',
    text: 'Jupiters, climbing vertical for the Heart Maneuver! Pull... pull... ease off at the top. Five and Six, paint the heart!',
    stage: 'heart_climb',
  },
  {
    id: 19,
    part: 4,
    tStart: 92.0,
    speaker: 'JUPITER 5 (SYNCHRO)',
    role: 'wingman',
    text: 'Five, diving right! Smoke on, carving the right curve!',
    stage: 'heart_carve',
  },
  {
    id: 20,
    part: 4,
    tStart: 96.5,
    speaker: 'JUPITER 6 (SYNCHRO)',
    role: 'wingman',
    text: 'Six, diving left! Completing the heart! ... Arrow coming through!',
    stage: 'heart_carve',
  },
  {
    id: 21,
    part: 4,
    tStart: 102.0,
    speaker: 'JUPITER 4 (ARROW)',
    role: 'wingman',
    text: 'Four, piercing the heart! Smoke off!',
    stage: 'heart_pierce',
  },
  {
    id: 22,
    part: 4,
    tStart: 106.5,
    speaker: 'JUPITER LEAD',
    role: 'lead',
    text: 'All Jupiters, final maneuver, Bomb Burst! Pitch up vertical... Ready... BREAK, BREAK, BREAK!',
    stage: 'bomb_burst',
  },
  {
    id: 23,
    part: 4,
    tStart: 114.0,
    speaker: 'JUPITER 2 • 3 • 4',
    role: 'wingman',
    text: 'Two, breaking left! Three, breaking right! Four, pulling high!',
    stage: 'bomb_burst',
  },

  // === PART 5: KEMBALI KE PANGKALAN & LANDING (122..154s) ===
  {
    id: 24,
    part: 5,
    tStart: 122.0,
    speaker: 'JUPITER LEAD',
    role: 'lead',
    text: 'Jupiters, rejoin on my left wing, echelon formation. Smoke off, prepare for landing.',
    stage: 'echelon_rejoin',
  },
  {
    id: 25,
    part: 5,
    tStart: 128.5,
    speaker: 'JUPITER LEAD',
    role: 'lead',
    text: 'Adisutjipto Tower, Jupiter Flight, show complete, initial Runway Zero-Nine for full stop landing.',
    stage: 'echelon_rejoin',
  },
  {
    id: 26,
    part: 5,
    tStart: 135.0,
    speaker: 'ADISUTJIPTO TOWER',
    role: 'atc',
    text: 'Jupiter Flight, welcome back. Number one, cleared to land Runway Zero-Nine. Wind calm.',
    stage: 'final_approach',
  },
  {
    id: 27,
    part: 5,
    tStart: 141.0,
    speaker: 'JUPITER LEAD',
    role: 'lead',
    text: 'Cleared to land Runway Zero-Nine, Jupiter Flight. ... Jupiters, gears down, flaps full... On final... Touchdown!',
    stage: 'final_approach',
  },
  {
    id: 28,
    part: 5,
    tStart: 148.5,
    speaker: 'GROUND CREW / MARSHAL',
    role: 'ground',
    text: 'Welcome home, Jupiters. Chocks in place, engines cut. Great show today, Sir!',
    stage: 'touchdown_stop',
  },
];

/** State sinkronisasi ringan antara 3D JupiterFormationLayer dan HUD JupiterManeuverPanel. */
export const jupiterShowLive = {
  time: 0,
  part: 1 as 1 | 2 | 3 | 4 | 5,
  activeLine: JUPITER_SCRIPT[0] as JupiterDialogueLine | null,
  seekTarget: null as number | null,
};

export function requestJupiterPartSeek(part: 1 | 2 | 3 | 4 | 5) {
  const meta = JUPITER_PARTS.find((p) => p.part === part);
  if (meta) {
    jupiterShowLive.seekTarget = meta.tStart;
  }
}
