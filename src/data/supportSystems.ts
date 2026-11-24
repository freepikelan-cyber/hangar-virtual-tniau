import type { AircraftCategory } from './fleetData';

export interface SupportSystemItem {
  title: string;
  tag: string;
  desc: string;
}

/**
 * Data edukatif Sistem Pendukung Pesawat (Life Support & Safety Systems):
 * Kursi Lontar (Ejection Seat), Sistem Oksigen (OBOGS), Tekanan Kabin (ECS), & Hidrolik/Anti-G.
 */
export function getSupportSystems(unitId: string, category: AircraftCategory): SupportSystemItem[] {
  if (category === 'Tempur') {
    const seatModel =
      unitId === 'su30mk2' || unitId === 'su27skm'
        ? 'Zvezda K-36DM (Zero-Zero)'
        : unitId === 'rafale'
          ? 'Martin-Baker Mk.F16F (Zero-Zero)'
          : unitId === 'f16id'
            ? 'ACES II (Zero-Zero, Sudut 30°)'
            : 'Martin-Baker Mk.10 / US16T (Zero-Zero)';

    return [
      {
        title: `Kursi Lontar ${seatModel}`,
        tag: 'EJECTION SEAT',
        desc: 'Melontarkan pilot keluar kokpit dalam < 2 detik secara aman bahkan pada ketinggian 0 meter & kecepatan 0 knot (Zero-Zero): kanopi pecah/terlepas otomatis → roket bawah kursi menyala → parasut penstabil (drogue) → parasut utama mengembang.',
      },
      {
        title: 'Sistem Oksigen OBOGS',
        tag: 'LIFE SUPPORT',
        desc: 'On-Board Oxygen Generating System menyaring udara bertekanan dari kompresor mesin (bleed air) melalui saringan molekuler zeolit untuk menghasilkan oksigen 93% tanpa henti hingga ketinggian 50.000 kaki.',
      },
      {
        title: 'Tekanan Kabin & ECS',
        tag: 'CABIN PRESSURIZATION',
        desc: 'Environmental Control System menjaga tekanan udara kokpit tetap nyaman seperti di ketinggian rendah, mendinginkan perangkat radar/avionik panas, dan mencegah kaca kanopi berembun di awan dingin.',
      },
      {
        title: 'Katup Anti-G, Hidrolik & Fly-by-Wire',
        tag: 'FLIGHT CONTROL',
        desc: 'Sistem hidrolik ganda menggerakkan Flap, Trim/Stabilator, dan roda pendarat dengan presisi komputer Fly-by-Wire, sementara katup Anti-G otomatis memompa udara ke G-Suit pilot saat manuver hingga 9G.',
      },
    ];
  }

  if (category === 'Latih') {
    return [
      {
        title: 'Kursi Lontar Martin-Baker (Zero-Zero)',
        tag: 'EJECTION SEAT',
        desc: 'Dilengkapi sepasang kursi lontar Martin-Baker untuk siswa dan instruktur dengan sistem urutan ejeksi otomatis (belakang lebih dulu 0,4 detik agar tidak bertabrakan) dan aman pada kecepatan nol di landasan.',
      },
      {
        title: 'Sistem Oksigen OBOGS & Masker MBU',
        tag: 'LIFE SUPPORT',
        desc: 'Menyuplai oksigen murni otomatis bagi kedua penerbang saat berlatih di ketinggian di atas 10.000 kaki sehingga mencegah hipoksia (kekurangan oksigen di otak).',
      },
      {
        title: 'Pendingin Kokpit & Anti-Embun (ECS)',
        tag: 'ENVIRONMENTAL',
        desc: 'Mengatur sirkulasi udara, suhu kokpit tandem, dan sistem defogging kaca kanopi agar pandangan instruktur maupun siswa tetap jernih dalam segala cuaca.',
      },
      {
        title: 'Sistem Flap, Trim Elektrik & Katup G-Suit',
        tag: 'FLIGHT CONTROL',
        desc: 'Kendali Flap dan Trim elektrik pada tuas stick melatih siswa menyeimbangkan gaya angkat saat Take Off & Landing, dilengkapi konektor selang Anti-G untuk latihan manuver aerobatik.',
      },
    ];
  }

  if (category === 'Angkut & VIP') {
    return [
      {
        title: 'Sistem Oksigen Darurat Kru & Penumpang',
        tag: 'LIFE SUPPORT',
        desc: 'Tabung oksigen bertekanan khusus kokpit (Quick-Donning Mask) untuk pilot serta generator oksigen kimia otomatis di kabin apabila terjadi penurunan tekanan mendadak (dekompresi).',
      },
      {
        title: 'Tekanan Kabin Penuh & Dual-Pack ECS',
        tag: 'CABIN PRESSURIZATION',
        desc: 'Dua unit AC & pengatur tekanan kabin menjaga tekanan udara di dalam kabin kargo/VIP tetap setara ketinggian ±8.000 kaki meski pesawat terbang jelajah di 35.000 kaki.',
      },
      {
        title: 'Pintu Darurat, Parasut Pasukan & Ramp',
        tag: 'SAFETY & ESCAPE',
        desc: 'Pesawat angkut tidak memakai kursi lontar, melainkan pintu keluar darurat, rakit pelampung otomatis, serta jalur static-line parasut di pintu samping & pintu rampa belakang (C-130J).',
      },
      {
        title: 'Hidrolik Ganda Flap Fowler & Trim Stabilizer',
        tag: 'FLIGHT CONTROL',
        desc: 'Aktuator hidrolik bertenaga besar menggerakkan Flap Fowler dan Trim ekor (Horizontal Stabilizer Trim) agar pesawat berbobot puluhan ton tetap ringan dikendalikan saat lepas landas maupun mendarat.',
      },
    ];
  }

  if (category === 'Helikopter') {
    return [
      {
        title: 'Kursi Penyerap Benturan (Crashworthy Seats)',
        tag: 'CRASH SAFETY',
        desc: 'Helikopter tidak menggunakan kursi lontar karena terdapat rotor di atas kepala; sebagai gantinya memakai kursi energi-absorpsi khusus & tangki BBM anti-pecah (self-sealing) untuk melindungi kru saat pendaratan darurat.',
      },
      {
        title: 'Sistem Oksigen Portabel & Evakuasi Medis',
        tag: 'LIFE SUPPORT',
        desc: 'Dilengkapi konsol suplai oksigen medis di kabin untuk pasien evakuasi SAR/bencana serta masker oksigen kru saat operasi di pegunungan tinggi.',
      },
      {
        title: 'Pelampung Darurat & Winch Penyelamat SAR',
        tag: 'SAR & SURVIVAL',
        desc: 'Kantung pelampung darurat (emergency flotation) mencegah helikopter tenggelam saat mendarat di laut, dipadukan katrol winch listrik untuk mengangkat korban dari medan sulit.',
      },
      {
        title: 'Autopilot 4-Sumbu, Hidrolik & Anti-Es Rotor',
        tag: 'FLIGHT CONTROL',
        desc: 'Servo hidrolik ganda meringankan tuas Cyclic & Collective, dilengkapi sistem Trim otomatis (Force Trim) dan pemanas anti-es bilah rotor untuk operasi segala cuaca.',
      },
    ];
  }

  // G-Suit & Helm
  return [
    {
      title: 'Integrasi Katup Anti-G Kokpit',
      tag: 'ANTI-9G SYSTEM',
      desc: 'Terhubung langsung ke katup pneumatik kokpit yang memompa udara ke 5 kantung G-Suit dalam milidetik saat gaya gravitasi melampaui +2G hingga +9G.',
    },
    {
      title: 'Koneksi Oksigen Tekanan Positif (OBOGS)',
      tag: 'LIFE SUPPORT',
      desc: 'Selang berulir pada masker MBU-20/P tersambung ke regulator OBOGS pesawat agar pilot tetap bernapas lancar meski tubuh tertekan gaya G tinggi.',
    },
    {
      title: 'Pengait Cepat Kursi Lontar (Koch Fittings)',
      tag: 'EJECTION SAFETY',
      desc: 'Harness PCU-15/P mengunci tubuh pilot secara presisi ke parasut kursi lontar dan otomatis terpisah dari kursi setelah keluar dari kokpit.',
    },
    {
      title: 'Komunikasi ANR & Proyeksi HMDS',
      tag: 'AVIONICS LINK',
      desc: 'Kabel interkom & sensor pelacak kepala pada helm menyatukan pilot dengan sistem radar, radio taktis, dan bidikan rudal pesawat.',
    },
  ];
}

export const FLAP_INFO: Record<0 | 15 | 35, { label: string; effect: string }> = {
  0: {
    label: '0° (Cruise / Jelajah)',
    effect: 'Flap rata dengan sayap agar hambatan udara (Drag) minimum saat terbang kecepatan tinggi.',
  },
  15: {
    label: '15° (Take Off)',
    effect: 'Flap turun 15° memperbesar kelengkungan sayap → Gaya Angkat (Lift) melonjak agar pesawat bisa lepas landas lebih cepat di landasan pendek.',
  },
  35: {
    label: '35° (Full Landing)',
    effect: 'Flap turun penuh 35° menghasilkan Gaya Angkat tinggi di kecepatan rendah sekaligus menambah Drag sebagai rem udara saat mendarat.',
  },
};

export const TRIM_INFO: Record<-5 | 0 | 8, { label: string; effect: string }> = {
  [-5]: {
    label: 'Nose Down (-5°)',
    effect: 'Trim ekor mendorong ekor naik → hidung pesawat menunduk stabil untuk terbang cepat atau mulai turun (descent).',
  },
  0: {
    label: 'Netral (0°)',
    effect: 'Stabilizer ekor seimbang di posisi netral untuk terbang datar (level flight) tanpa pilot harus menahan stick terus-menerus.',
  },
  8: {
    label: 'Nose Up (+8° Take Off)',
    effect: 'Trim ekor diatur Nose Up sebelum Take Off untuk membantu hidung pesawat terangkat (rotate) ringan dan stabil saat menanjak.',
  },
};
