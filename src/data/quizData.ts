import { FLEET, type AircraftUnit } from './fleetData';

export type QuizQuestion =
  | {
      kind: 'hotspot';
      hotspotId: number;
      prompt: string;
      explanation: string;
      label: string;
    }
  | {
      kind: 'mcq';
      prompt: string;
      options: string[];
      correctIndex: number;
      explanation: string;
      label: string;
    };

interface GeneralQuestionSeed {
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
  label: string;
}

const GENERAL_TNIAU_BANK: GeneralQuestionSeed[] = [
  {
    prompt: 'Apa semboyan resmi TNI Angkatan Udara yang berarti "Sayap Tanah Air"?',
    options: ['Jalesveva Jayamahe', 'Swa Bhuwana Paksa', 'Kartika Eka Paksi', 'Bhinneka Tunggal Ika'],
    correctIndex: 1,
    explanation: 'Swa Bhuwana Paksa merupakan semboyan resmi TNI Angkatan Udara yang bermakna Sayap Tanah Air.',
    label: 'Semboyan TNI AU',
  },
  {
    prompt: 'Kapan Hari Jadi TNI Angkatan Udara diperingati setiap tahunnya?',
    options: ['5 Oktober 1945', '9 April 1946', '17 Agustus 1945', '10 November 1945'],
    correctIndex: 1,
    explanation: 'TNI Angkatan Udara (awalnya TRI-AU) resmi berdiri pada tanggal 9 April 1946.',
    label: 'Hari Jadi TNI AU',
  },
  {
    prompt: 'Pesawat apa yang digunakan oleh tim aerobatik kebanggaan TNI AU, Jupiter Aerobatic Team (JAT)?',
    options: ['T-50i Golden Eagle', 'KT-1B Wong Bee', 'EMB-314 Super Tucano', 'Hawk 209'],
    correctIndex: 1,
    explanation: 'Jupiter Aerobatic Team (JAT) mengoperasikan 6 pesawat latih KT-1B Wong Bee berkelir merah-putih.',
    label: 'Jupiter Aerobatic Team',
  },
  {
    prompt: 'Apa fungsi utama baju Anti-G (G-Suit) bagi penerbang pesawat tempur saat manuver ekstrem?',
    options: [
      'Menghangatkan tubuh pilot di ketinggian rendah',
      'Mencegah G-LOC (pingsan) dengan menekan perut & kaki agar darah tetap mengalir ke otak',
      'Menggantikan fungsi parasut saat kursi lontar aktif',
      'Meningkatkan kecepatan maksimum pesawat',
    ],
    correctIndex: 1,
    explanation: 'G-Suit mengembang otomatis saat beban G meningkat (hingga 9G) untuk mencegah darah turun ke kaki sehingga pilot tidak kehilangan kesadaran (G-LOC).',
    label: 'Fungsi Anti-G Suit',
  },
  {
    prompt: 'Apa kepanjangan dan fungsi sistem OBOGS pada pesawat tempur modern TNI AU?',
    options: [
      'Sistem radar pengunci rudal jarak jauh',
      'On-Board Oxygen Generating System — memproduksi oksigen langsung bagi pilot di ketinggian',
      'Sistem peluncur suar pengecoh rudal pencari panas',
      'Sistem pengereman otomatis di landasan basah',
    ],
    correctIndex: 1,
    explanation: 'OBOGS menyaring udara dari mesin pesawat untuk menghasilkan oksigen murni secara kontinu ke masker pilot.',
    label: 'Sistem Oksigen OBOGS',
  },
  {
    prompt: 'Apa tujuan utama melepaskan Flare Countermeasure pada pesawat tempur saat berada di zona bahaya?',
    options: [
      'Menerangi landasan pacu saat malam hari',
      'Mengecoh rudal pencari panas (inframerah) agar melenceng dari mesin pesawat',
      'Memberi tanda formasi aerobatik',
      'Mengurangi berat bahan bakar sebelum mendarat',
    ],
    correctIndex: 1,
    explanation: 'Flare memancarkan panas sangat tinggi sehingga sensor inframerah rudal musuh terkecoh dan mengarah ke suar.',
    label: 'Flare Countermeasure',
  },
  {
    prompt: 'Apa maksud kemampuan "Zero-Zero" pada kursi lontar (Ejection Seat) pesawat tempur?',
    options: [
      'Hanya dapat aktif pada kecepatan di atas Mach 1',
      'Dapat melontarkan pilot dengan aman bahkan pada ketinggian 0 kaki dan kecepatan 0 knot',
      'Tidak membutuhkan parasut saat mendarat di laut',
      'Menggunakan bahan bakar nol emisi',
    ],
    correctIndex: 1,
    explanation: 'Kursi lontar Zero-Zero mampu menyelamatkan pilot bahkan saat pesawat berhenti di darat (0 knot, 0 kaki).',
    label: 'Kursi Lontar Zero-Zero',
  },
  {
    prompt: 'Empat gaya aerodinamika utama yang bekerja pada pesawat terbang adalah...',
    options: [
      'Lift, Weight, Thrust, dan Drag',
      'Pitch, Roll, Yaw, dan Stall',
      'Mach, Knot, Feet, dan G-Force',
      'Radar, Sonar, Lidar, dan Flaps',
    ],
    correctIndex: 0,
    explanation: 'Pesawat dapat terbang karena keseimbangan empat gaya: Lift (angkat), Weight (berat), Thrust (dorong), dan Drag (hambat).',
    label: '4 Gaya Aerodinamika',
  },
  {
    prompt: 'Skadron Udara TNI AU manakah yang bertugas mengoperasikan pesawat Kepresidenan VVIP RI?',
    options: ['Skadron Udara 3', 'Skadron Udara 17', 'Skadron Udara 31', 'Skadron Udara 8'],
    correctIndex: 1,
    explanation: 'Skadron Udara 17 di Lanud Halim Perdanakusuma bertugas melayani penerbangan VVIP Kepresidenan dan tamu negara.',
    label: 'Skadron Udara 17 VVIP',
  },
  {
    prompt: 'Apa tujuan manuver Air-to-Air Refueling (AAR) bersama pesawat tanker KC-130B Hercules?',
    options: [
      'Memperpanjang jangkauan dan durasi misi tempur di udara tanpa harus mendarat',
      'Menurunkan muatan logistik dengan parasut',
      'Mengurangi kebisingan mesin di atas kota',
      'Mendinginkan suhu mesin jet tempur',
    ],
    correctIndex: 0,
    explanation: 'AAR memungkinkan pesawat tempur mengisi bahan bakar Avtur langsung di udara sehingga daya jelajah patroli meningkat drastis.',
    label: 'Air-to-Air Refueling',
  },
  {
    prompt: 'Skadron Udara 8 di Lanud Atang Sendjaja Bogor dikenal mengoperasikan armada apa?',
    options: [
      'Jet tempur Sukhoi Su-30MK2',
      'Helikopter angkut berat H225M Caracal & Super Puma',
      'Pesawat angkut C-130J Super Hercules',
      'Pesawat latih KT-1B Wong Bee',
    ],
    correctIndex: 1,
    explanation: 'Skadron Udara 8 merupakan satuan helikopter angkut berat & SAR tempur TNI AU yang berpangkalan di Lanud Atang Sendjaja.',
    label: 'Skadron Udara 8',
  },
  {
    prompt: 'Dalam aerodinamika pesawat, permukaan kendali Aileron di tepi belakang sayap berfungsi untuk mengatur gerak...',
    options: ['Pitch (mendongak/menukik)', 'Roll (miring kanan/kiri)', 'Yaw (belok hidung kanan/kiri)', 'Rem roda di landasan'],
    correctIndex: 1,
    explanation: 'Aileron bergerak berlawanan arah di sayap kiri dan kanan untuk memiringkan pesawat (Roll).',
    label: 'Kendali Aileron',
  },
];

function shuffleArr<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function makeMcqOptions(correct: string, pool: string[]): { options: string[]; correctIndex: number } {
  const distractors = shuffleArr(
    Array.from(new Set(pool.filter((v) => v && v.trim() !== correct.trim()))),
  ).slice(0, 3);
  const combined = shuffleArr([correct, ...distractors]);
  return { options: combined, correctIndex: combined.indexOf(correct) };
}

/**
 * Menghasilkan 7 soal kuis campuran (tidak hanya Pin Hotspot!):
 * - 2 Soal Pin 3D Hotspot langsung pada model pesawat
 * - 2 Soal Pengetahuan Teknis unit yang sedang dipilih (Asal Negara, Kecepatan, Jangkauan, Skadron)
 * - 3 Soal Pengetahuan Umum TNI AU & Dirgantara
 */
export function buildMixedQuiz(unit: AircraftUnit): QuizQuestion[] {
  // 1. Ambil 2 soal Pin Hotspot 3D acak
  const hotspotQs: QuizQuestion[] = shuffleArr(unit.hotspots)
    .slice(0, 2)
    .map((h) => ({
      kind: 'hotspot',
      hotspotId: h.id,
      prompt: `Temukan & ketuk pin 3D yang menunjukkan "${h.name}" pada ${unit.name}!`,
      explanation: h.desc,
      label: `Pin 3D: ${h.name}`,
    }));

  // 2. Bangun soal pengetahuan teknis spesifik unit aktif
  const unitPool: QuizQuestion[] = [];
  const origins = FLEET.map((u) => u.origin);
  const speeds = FLEET.map((u) => u.specs.maxSpeed);
  const ranges = FLEET.map((u) => u.specs.range);
  const squadrons = FLEET.map((u) => u.squadron);

  {
    const { options, correctIndex } = makeMcqOptions(unit.origin, origins);
    if (options.length === 4) {
      unitPool.push({
        kind: 'mcq',
        prompt: `Dari negara manakah ${unit.name} berasal?`,
        options,
        correctIndex,
        explanation: `${unit.name} (${unit.code}) diproduksi oleh ${unit.origin}.`,
        label: `Asal ${unit.name}`,
      });
    }
  }
  {
    const { options, correctIndex } = makeMcqOptions(unit.specs.maxSpeed, speeds);
    if (options.length === 4) {
      unitPool.push({
        kind: 'mcq',
        prompt: `Berapa kecepatan maksimum operasional ${unit.name}?`,
        options,
        correctIndex,
        explanation: `${unit.name} memiliki kecepatan maksimum hingga ${unit.specs.maxSpeed}.`,
        label: `Kecepatan ${unit.name}`,
      });
    }
  }
  {
    const { options, correctIndex } = makeMcqOptions(unit.specs.range, ranges);
    if (options.length === 4) {
      unitPool.push({
        kind: 'mcq',
        prompt: `Berapa jangkauan operasional ${unit.name}?`,
        options,
        correctIndex,
        explanation: `Jangkauan operasional ${unit.name} mencapai ${unit.specs.range}.`,
        label: `Jangkauan ${unit.name}`,
      });
    }
  }
  {
    const { options, correctIndex } = makeMcqOptions(unit.squadron, squadrons);
    if (options.length === 4) {
      unitPool.push({
        kind: 'mcq',
        prompt: `Satuan/Skadron TNI AU manakah yang mengoperasikan ${unit.name}?`,
        options,
        correctIndex,
        explanation: `${unit.name} dioperasikan oleh ${unit.squadron}.`,
        label: `Skadron ${unit.name}`,
      });
    }
  }

  const unitQs = shuffleArr(unitPool).slice(0, 2);

  // 3. Ambil 3 soal pengetahuan umum TNI AU & Dirgantara
  const generalQs: QuizQuestion[] = shuffleArr(GENERAL_TNIAU_BANK)
    .slice(0, 3)
    .map((g) => ({
      kind: 'mcq',
      prompt: g.prompt,
      options: [...g.options],
      correctIndex: g.correctIndex,
      explanation: g.explanation,
      label: g.label,
    }));

  // Acak urutan soal campuran agar bervariasi antara Pin 3D & Pilihan Ganda Umum
  return shuffleArr([...hotspotQs, ...unitQs, ...generalQs]);
}
