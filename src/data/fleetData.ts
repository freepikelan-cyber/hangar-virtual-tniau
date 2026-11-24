export type AircraftCategory = 'Tempur' | 'Angkut & VIP' | 'Latih' | 'Helikopter';

export interface HotspotItem {
  id: number;
  name: string;
  pos: [number, number, number]; // Koordinat pin di ruang 3D
  camOffset: [number, number, number]; // Posisi kamera relatif terhadap pin saat diklik
  desc: string; // Penjelasan edukatif komponen
}

export interface AircraftUnit {
  id: string;
  name: string;
  code: string;
  origin: string;
  tailNumber: string;
  category: AircraftCategory;
  squadron: string;
  role: string;
  glbPath?: string; // Opsional: path ke /models/*.glb
  specs: {
    maxSpeed: string;
    range: string;
    ceiling: string;
    armament: string;
  };
  history: {
    operational: string;
    tactical: string;
    missions: string[];
  };
  hotspots: HotspotItem[];
}

export const CATEGORIES: ('Semua' | AircraftCategory)[] = ['Semua', 'Tempur', 'Angkut & VIP', 'Latih', 'Helikopter'];

export const CATEGORY_LABEL: Record<AircraftCategory, string> = {
  Tempur: 'TEMPUR',
  'Angkut & VIP': 'ANGKUT & VIP',
  Latih: 'LATIH',
  Helikopter: 'HELIKOPTER',
};

export const FLEET: AircraftUnit[] = [
  {
    id: 'su30mk2',
    name: 'Sukhoi Su-30MK2',
    code: 'Flanker-C',
    origin: 'Rusia',
    tailNumber: 'TS-3005',
    category: 'Tempur',
    squadron: 'Skadron Udara 11 (Lanud Sultan Hasanuddin, Makassar)',
    role: 'Pesawat tempur multiperan dua kursi kelas berat dengan jangkauan sangat jauh. Mampu melaksanakan misi superioritas udara, serangan darat, hingga serangan anti-kapal permukaan di wilayah maritim Nusantara yang luas.',
    glbPath: '/models/su30_mk2.glb',
    specs: {
      maxSpeed: 'Mach 2.0 (±2.120 km/jam)',
      range: '±3.000 km',
      ceiling: '17.300 m',
      armament: 'Kanon GSh-30-1 30 mm • 12 hardpoint (8 ton)',
    },
    history: {
      operational:
        'Su-30MK2 memperkuat Skadron Udara 11 "Thunder" di Lanud Sultan Hasanuddin, Makassar, bersama Su-27SKM. Kedatangannya sejak 2008–2013 menjadikan TNI AU memiliki kekuatan pemukul udara strategis yang mampu menjangkau seluruh wilayah Indonesia dari Indonesia bagian tengah.',
      tactical:
        'Desain aerodinamis Flanker memberikan kelincahan luar biasa di kecepatan rendah, didukung radar N001VEP dengan jangkauan deteksi jauh, kapasitas bahan bakar internal besar, serta kemampuan membawa rudal anti-kapal Kh-31A dan Kh-59MK untuk mengamankan Alur Laut Kepulauan Indonesia (ALKI).',
      missions: ['Superioritas udara & patroli jarak jauh', 'Serangan anti-kapal di ALKI', 'Penindakan pelanggaran wilayah udara', 'Pengawalan pesawat VVIP'],
    },
    hotspots: [
      { id: 1, name: 'Radar N001VEP', pos: [0, 1.56, 6.45], camOffset: [3.2, 1.2, 3.4], desc: 'Radar Doppler pulsa koheren yang tersimpan di dalam radome hidung. Mampu melacak hingga 15 sasaran sekaligus dan menyerang 2 sasaran secara bersamaan pada jarak puluhan kilometer.' },
      { id: 2, name: 'Kokpit Tandem 2 Kursi & IRST', pos: [0, 2.75, 3.65], camOffset: [2.8, 1.8, 2.6], desc: 'Kokpit tandem untuk pilot (depan) dan perwira sistem senjata (belakang) dengan kursi lontar K-36D-3.5 zero-zero serta sensor elektro-optik IRST OLS-30 di depan kaca kokpit.' },
      { id: 3, name: 'Sirip Canard', pos: [1.55, 1.94, 2.55], camOffset: [3.2, 1.5, 2.6], desc: 'Sayap kecil di depan sayap utama yang meningkatkan kemampuan manuver dan stabilitas pada sudut serang tinggi, ciri khas varian Su-30 multiperan.' },
      { id: 4, name: 'Mesin Kembar AL-31F', pos: [0.94, 1.28, -6.55], camOffset: [3.2, 1.1, -3.6], desc: 'Dua mesin turbofan Saturn AL-31F dengan panel titanium ekspos dan afterburner, masing-masing menghasilkan daya dorong ±12.500 kgf. Konfigurasi mesin terpisah meningkatkan keselamatan bila satu mesin rusak.' },
      { id: 5, name: 'Sayap & Rudal Kh-31A / R-77', pos: [3.72, 1.58, -2.2], camOffset: [3.4, 2.8, 2.2], desc: 'Sayap terpadu (blended wing body) berprofil airfoil dengan 12 titik cantelan senjata untuk rudal udara-ke-udara R-73/R-77/R-27 serta rudal anti-kapal supersonik Kh-31A.' },
    ],
  },
  {
    id: 'f16id',
    name: 'F-16 Fighting Falcon',
    code: 'C/D Block 52ID',
    origin: 'Amerika Serikat',
    tailNumber: 'TS-1601',
    category: 'Tempur',
    squadron: 'Skadron Udara 3, 14 & 16 (Lanud Iswahjudi & Roesmin Nurjadin)',
    role: 'Pesawat tempur multiperan bermesin tunggal yang lincah dan andal. Menjadi tulang punggung pertahanan udara nasional dengan kemampuan intersepsi, patroli udara tempur, dan serangan presisi ke sasaran darat.',
    glbPath: '/models/f16_ts1601.glb',
    specs: {
      maxSpeed: 'Mach 2.0 (±2.120 km/jam)',
      range: '±4.220 km (ferry)',
      ceiling: '15.240 m',
      armament: 'Kanon M61A1 Vulcan 20 mm • 9 hardpoint',
    },
    history: {
      operational:
        'TNI AU mengoperasikan F-16 sejak 1989 (Block 15 OCU) di Skadron Udara 3 Lanud Iswahjudi. Pada 2014–2018 hadir 24 unit F-16 C/D Block 52ID hasil peremajaan yang memperkuat Skadron Udara 16 (Pekanbaru) dan Skadron Udara 3. Nomor ekor TS-1601 menjadi identitas legendaris armada ini.',
      tactical:
        'Desain fly-by-wire pertama di dunia dengan kokpit kanopi gelembung tanpa rangka memberikan pandangan 360°. Rasio dorong-berat tinggi membuatnya unggul dalam pertempuran jarak dekat (dogfight), didukung radar APG-68(V) serta kemampuan membawa AIM-120 AMRAAM dan bom berpemandu.',
      missions: ['Patroli udara tempur (CAP)', 'Intersepsi pesawat asing', 'Serangan udara langsung (CAS)', 'Latihan bersama internasional (Cope West, Pitch Black)'],
    },
    hotspots: [
      { id: 1, name: 'Radar AN/APG-68', pos: [0, 1.52, 6.45], camOffset: [3.0, 1.0, 3.2], desc: 'Radar Doppler pulsa multimode di dalam radome hidung. Mendeteksi pesawat lawan dari jarak jauh, mendukung mode udara-ke-udara maupun pemetaan permukaan darat & laut.' },
      { id: 2, name: 'Kokpit & Kanopi Bubble', pos: [0, 2.48, 3.55], camOffset: [2.6, 1.7, 2.4], desc: 'Kanopi gelembung satu potong berlapis emas tipis (anti-radar) dengan HUD lebar dan kursi lontar ACES II yang direbahkan 30° untuk membantu pilot menahan gaya gravitasi hingga 9G.' },
      { id: 3, name: 'Saluran Udara (Air Intake)', pos: [0, 0.86, 3.1], camOffset: [2.4, -0.1, 3.0], desc: 'Saluran masuk udara di bawah badan (ventral intake) lengkap dengan splitter plate yang menyuplai udara stabil ke mesin bahkan pada sudut serang tinggi. Bentuknya menjadi ciri ikonik F-16.' },
      { id: 4, name: 'Mesin F100 & Afterburner', pos: [0, 1.52, -7.1], camOffset: [2.6, 1.2, -3.5], desc: 'Mesin turbofan Pratt & Whitney F100-PW-220E dengan 15 kelopak nozzle (turkey feathers) dan afterburner berdaya dorong ±10.800 kgf untuk lonjakan kecepatan supersonik.' },
      { id: 5, name: 'Sayap, Tangki 370-Gal & Rudal', pos: [4.66, 1.44, -1.85], camOffset: [3.0, 2.4, 2.4], desc: 'Sayap berprofil airfoil dengan rel peluncur AIM-9 Sidewinder di ujung sayap, rudal jarak menengah AIM-120 AMRAAM, dan tangki bahan bakar eksternal 370 galon di bawah sayap.' },
    ],
  },
  {
    id: 'rafale',
    name: 'Dassault Rafale',
    code: 'F4 Standard',
    origin: 'Prancis',
    tailNumber: 'TS-0301',
    category: 'Tempur',
    squadron: 'Program Modernisasi Alutsista TNI AU',
    role: 'Pesawat tempur omnirole generasi 4.5 bersayap delta dengan canard. Mampu melaksanakan misi superioritas udara, serangan darat dalam, pengintaian, dan anti-kapal dalam satu sorti penerbangan.',
    glbPath: '/models/rafale_tniau.glb',
    specs: {
      maxSpeed: 'Mach 1.8 (±1.912 km/jam)',
      range: '±3.700 km (ferry)',
      ceiling: '15.835 m',
      armament: 'Kanon GIAT 30M791 30 mm • 14 hardpoint',
    },
    history: {
      operational:
        'Indonesia menandatangani kontrak pengadaan 42 unit Rafale pada 2022 sebagai bagian program modernisasi alutsista TNI AU. Rafale disiapkan untuk melengkapi dan menggantikan armada tempur lama, sekaligus membuka kerja sama industri pertahanan dengan Prancis.',
      tactical:
        'Sistem fusi sensor mengintegrasikan radar AESA RBE2, sensor optronik OSF, dan perang elektronik SPECTRA sehingga pilot memperoleh gambaran situasi menyeluruh. Kombinasi rudal Meteor jarak jauh dan MICA menjadikannya unggul dalam pertempuran di luar jarak pandang (BVR).',
      missions: ['Misi omnirole (udara & darat sekaligus)', 'Serangan presisi jarak jauh (SCALP)', 'Pengintaian taktis', 'Penangkalan strategis kawasan'],
    },
    hotspots: [
      { id: 1, name: 'Radar AESA RBE2', pos: [0, 1.6, 6.5], camOffset: [3.0, 1.0, 3.2], desc: 'Radar Active Electronically Scanned Array buatan Thales. Berkas radarnya digerakkan secara elektronik sehingga mampu melacak banyak sasaran udara dan darat secara bersamaan.' },
      { id: 2, name: 'Kokpit Kaca & HUD', pos: [0, 2.4, 3.8], camOffset: [2.6, 1.8, 2.4], desc: 'Kokpit dengan layar sentuh, Head-Up Display lebar, serta kendali suara. Kursi lontar Martin-Baker Mk16 menjamin keselamatan pilot.' },
      { id: 3, name: 'Canard Terpadu', pos: [1.7, 1.85, 2.2], camOffset: [3.0, 1.6, 2.6], desc: 'Canard yang terpasang dekat (close-coupled) dengan sayap delta, menciptakan pusaran udara yang meningkatkan daya angkat dan kelincahan tanpa kehilangan kecepatan.' },
      { id: 4, name: 'Mesin Kembar Safran M88', pos: [0.42, 1.4, -6.9], camOffset: [2.8, 1.2, -3.6], desc: 'Dua mesin turbofan Safran M88-2 yang ringkas dan efisien, masing-masing ±7.500 kgf dengan afterburner. Memungkinkan supercruise ringan dengan muatan tertentu.' },
      { id: 5, name: 'Sayap Delta & SPECTRA', pos: [3.8, 1.42, -3.8], camOffset: [3.2, 3.0, 2.2], desc: 'Sayap delta besar dengan 14 titik cantelan. Sistem perlindungan diri SPECTRA terintegrasi di badan pesawat untuk mendeteksi, mengacak, dan mengecoh ancaman radar maupun rudal.' },
    ],
  },
  {
    id: 'c130j',
    name: 'C-130J Super Hercules',
    code: 'C-130J-30',
    origin: 'Amerika Serikat',
    tailNumber: 'A-1339',
    category: 'Angkut & VIP',
    squadron: 'Skadron Udara 31 (Lanud Halim Perdanakusuma, Jakarta)',
    role: 'Pesawat angkut taktis berbadan panjang bermesin empat turboprop. Mampu mendarat di landasan pendek dan tidak beraspal untuk misi logistik, penerjunan pasukan, evakuasi medis, dan bantuan kemanusiaan.',
    glbPath: '/models/c130j_hercules.glb',
    specs: {
      maxSpeed: '±671 km/jam',
      range: '±5.250 km',
      ceiling: '8.615 m',
      armament: 'Muatan 19 ton • 128 pasukan / 92 penerjun',
    },
    history: {
      operational:
        'Hercules telah melayani TNI AU sejak 1960. Mulai 2023 Skadron Udara 31 "Wing Udara 1" menerima C-130J-30 Super Hercules versi badan panjang yang menjadi andalan jembatan udara ke seluruh pelosok Nusantara, termasuk wilayah 3T (terdepan, terluar, tertinggal).',
      tactical:
        'Mesin Rolls-Royce AE2100D3 dengan baling-baling komposit 6 bilah memberikan tenaga lebih besar dan konsumsi bahan bakar lebih hemat. Kokpit digital dua awak dan ramp kargo belakang memungkinkan bongkar muat cepat serta penerjunan barang (airdrop) yang presisi.',
      missions: ['Angkutan logistik & pasukan', 'Bantuan bencana alam & kemanusiaan', 'Penerjunan pasukan & airdrop', 'Evakuasi medis udara'],
    },
    hotspots: [
      { id: 1, name: 'Kokpit Digital (Glass Cockpit)', pos: [0, 1.95, 5.0], camOffset: [2.6, 1.4, 2.8], desc: 'Kokpit dua awak dengan 4 layar multifungsi dan dua Head-Up Display. Otomatisasi sistem menggantikan peran navigator dan juru mesin pada Hercules generasi lama.' },
      { id: 2, name: 'Mesin AE2100D3 & Baling-baling 6 Bilah', pos: [3.8, 1.9, 2.35], camOffset: [2.8, 1.4, 3.2], desc: 'Empat mesin turboprop Rolls-Royce AE2100D3 (±4.637 shp) dengan baling-baling komposit Dowty R391 berbilah 6 berbentuk scimitar yang lebih senyap dan efisien.' },
      { id: 3, name: 'Sayap Tinggi (High Wing)', pos: [5.6, 2.2, 0.6], camOffset: [2.6, 3.0, 2.8], desc: 'Sayap dipasang di atas badan pesawat agar mesin dan baling-baling jauh dari tanah—aman dari kerikil di landasan darurat—serta memaksimalkan ruang kargo di bawahnya.' },
      { id: 4, name: 'Ruang Kargo Badan Panjang', pos: [0.8, 1.3, 0.0], camOffset: [3.4, 1.2, 1.8], desc: 'Varian -30 memiliki badan 4,6 m lebih panjang dari C-130J standar sehingga mampu membawa 8 palet kargo, 128 pasukan, atau 97 tandu pasien evakuasi medis.' },
      { id: 5, name: 'Ramp & Pintu Kargo Belakang', pos: [0, 1.15, -4.3], camOffset: [2.8, 0.6, -3.4], desc: 'Ramp hidraulik di ekor yang dapat dibuka saat terbang untuk penerjunan pasukan dan muatan (airdrop), atau sebagai jalur masuk kendaraan saat di darat.' },
    ],
  },
  {
    id: 'b737vip',
    name: 'Boeing 737-400 / VIP',
    code: 'VVIP Transport',
    origin: 'Amerika Serikat',
    tailNumber: 'A-7304',
    category: 'Angkut & VIP',
    squadron: 'Skadron Udara 17 (Lanud Halim Perdanakusuma, Jakarta)',
    role: 'Pesawat angkut penumpang VIP/VVIP bermesin jet kembar untuk mendukung mobilitas Presiden, Wakil Presiden, pejabat tinggi negara, serta tamu negara.',
    glbPath: '/models/boeing_737_vip.glb',
    specs: {
      maxSpeed: 'Mach 0.82 (±912 km/jam)',
      range: '±4.000 km',
      ceiling: '11.300 m',
      armament: 'Kabin VVIP • ±40 penumpang',
    },
    history: {
      operational:
        'Skadron Udara 17 "VIP" di Lanud Halim Perdanakusuma bertugas melayani angkutan udara kenegaraan. Armada Boeing 737 berlivery putih-merah dengan tulisan "REPUBLIK INDONESIA" menjadi wajah TNI AU dalam penerbangan kenegaraan dalam dan luar negeri.',
      tactical:
        'Kabin dikonfigurasi khusus dengan ruang rapat, ruang istirahat, dan kursi kelas eksekutif. Pesawat dilengkapi sistem komunikasi aman dan navigasi modern, dengan dua mesin CFM56-3 yang andal untuk penerbangan jarak menengah.',
      missions: ['Angkutan VVIP Presiden & Wapres', 'Penerbangan delegasi kenegaraan', 'Evakuasi WNI', 'Dukungan misi kemanusiaan'],
    },
    hotspots: [
      { id: 1, name: 'Kokpit Dua Awak', pos: [0, 2.05, 6.2], camOffset: [2.6, 1.2, 2.8], desc: 'Kokpit untuk pilot dan kopilot dengan instrumen navigasi modern, autopilot, dan sistem pendaratan instrumen (ILS) untuk operasi segala cuaca.' },
      { id: 2, name: 'Mesin Turbofan CFM56-3', pos: [1.95, 0.78, 2.1], camOffset: [2.6, 0.6, 3.0], desc: 'Dua mesin turbofan CFM56-3 berdaya dorong ±10.000 kgf. Bentuk nacelle bagian bawah yang pipih (hamster pouch) memberi jarak aman dari permukaan landasan.' },
      { id: 3, name: 'Kabin VVIP', pos: [0.75, 1.75, 1.5], camOffset: [3.2, 1.0, 1.8], desc: 'Kabin utama yang ditata khusus dengan ruang kerja, ruang rapat, dan kursi eksekutif untuk Presiden dan rombongan kenegaraan.' },
      { id: 4, name: 'Sayap Sapu & Flap', pos: [4.2, 1.25, -1.6], camOffset: [2.6, 2.8, 2.0], desc: 'Sayap sapu-belakang (swept wing) dengan slat dan flap tiga celah yang memperbesar daya angkat saat lepas landas dan mendarat di landasan pendek.' },
      { id: 5, name: 'Ekor Tegak & Bendera', pos: [0, 3.35, -5.9], camOffset: [3.0, 1.0, -2.0], desc: 'Sirip tegak (vertical stabilizer) yang menjaga kestabilan arah pesawat dan menampilkan bendera Merah Putih sebagai identitas pesawat kenegaraan.' },
    ],
  },
  {
    id: 't50i',
    name: 'KAI T-50i Golden Eagle',
    code: 'LIFT Supersonic',
    origin: 'Korea Selatan',
    tailNumber: 'TT-5007',
    category: 'Latih',
    squadron: 'Skadron Udara 15 (Lanud Iswahjudi, Madiun)',
    role: 'Pesawat latih lanjut supersonik (Lead-In Fighter Trainer) yang menjembatani calon penerbang tempur sebelum menerbangkan F-16 dan Sukhoi, sekaligus dapat berperan sebagai pesawat serang ringan.',
    glbPath: '/models/t50i_golden_eagle.glb',
    specs: {
      maxSpeed: 'Mach 1.5 (±1.640 km/jam)',
      range: '±1.851 km',
      ceiling: '14.630 m',
      armament: 'Kanon M197 20 mm • 7 hardpoint',
    },
    history: {
      operational:
        'Sejak 2013 Skadron Udara 15 "Golden Eagle" di Lanud Iswahjudi mengoperasikan T-50i menggantikan Hawk Mk.53. Armada ini juga menjadi pesawat tim aerobatik "Elang Biru" dan dilengkapi kanon untuk latihan tempur sungguhan.',
      tactical:
        'Mesin GE F404 (yang juga digunakan F/A-18 Hornet) memberi kemampuan supersonik. Kokpit dan karakter terbangnya meniru pesawat tempur modern sehingga transisi siswa ke F-16 lebih cepat dan hemat biaya.',
      missions: ['Pendidikan penerbang tempur lanjut', 'Latihan taktik pertempuran udara', 'Serangan darat ringan', 'Demonstrasi udara'],
    },
    hotspots: [
      { id: 1, name: 'Hidung & Radar EL/M-2032', pos: [0, 1.55, 6.0], camOffset: [2.8, 1.0, 3.0], desc: 'Hidung pesawat memuat sistem avionik dan radar (pada varian bersenjata) untuk melatih siswa mengoperasikan sensor seperti di pesawat tempur.' },
      { id: 2, name: 'Kokpit Tandem Instruktur', pos: [0, 2.25, 2.9], camOffset: [2.6, 1.8, 2.4], desc: 'Kokpit dua kursi berurutan: siswa di depan dan instruktur di belakang yang dapat mengambil alih kendali kapan saja selama pelatihan.' },
      { id: 3, name: 'Saluran Udara Samping', pos: [0.82, 1.3, 1.6], camOffset: [2.8, 0.6, 2.8], desc: 'Dua saluran udara di sisi badan (di bawah LERX) yang menyalurkan udara ke mesin tunggal, desain yang terinspirasi F-16.' },
      { id: 4, name: 'Mesin GE F404-102', pos: [0, 1.45, -6.45], camOffset: [2.6, 1.2, -3.4], desc: 'Mesin turbofan tunggal General Electric F404 dengan afterburner (±8.000 kgf) yang membawa T-50i menembus kecepatan suara.' },
      { id: 5, name: 'Sayap & Rel Rudal', pos: [4.15, 1.42, -1.6], camOffset: [3.0, 2.6, 2.4], desc: 'Sayap trapesium dengan rel rudal latih di ujung sayap dan cantelan untuk roket, bom latih, serta tangki bahan bakar eksternal.' },
    ],
  },
  {
    id: 'kt1b',
    name: 'KT-1B Woongbi',
    code: 'Basic Trainer',
    origin: 'Korea Selatan',
    tailNumber: 'LL-0108',
    category: 'Latih',
    squadron: 'Skadik 102 & Jupiter Aerobatic Team (Lanud Adisutjipto, Yogyakarta)',
    role: 'Pesawat latih dasar bermesin turboprop tunggal dua kursi tandem untuk pendidikan calon penerbang di Sekolah Penerbang TNI AU, sekaligus tunggangan tim aerobatik kebanggaan Jupiter.',
    glbPath: '/models/kt1b_woongbi.glb',
    specs: {
      maxSpeed: '±648 km/jam',
      range: '±1.333 km',
      ceiling: '11.580 m',
      armament: 'Tanpa senjata • 2 kru tandem',
    },
    history: {
      operational:
        'KT-1B tiba sejak 2003 dan menjadi pesawat latih dasar di Skadron Pendidikan 102 Lanud Adisutjipto. Pada 2010 Jupiter Aerobatic Team (JAT) mulai beraksi menggunakan KT-1B berlivery Merah-Putih, tampil di berbagai airshow dalam dan luar negeri.',
      tactical:
        'Mesin turboprop Pratt & Whitney PT6A-62 yang responsif, kokpit tandem dengan kursi lontar Martin-Baker, serta karakter terbang yang stabil membuatnya ideal untuk mengajarkan dasar terbang, navigasi, terbang formasi, hingga aerobatik.',
      missions: ['Pendidikan terbang dasar Sekbang', 'Latihan terbang formasi', 'Aerobatik Jupiter Aerobatic Team', 'Promosi & edukasi dirgantara'],
    },
    hotspots: [
      { id: 1, name: 'Baling-baling 4 Bilah', pos: [0, 1.45, 6.75], camOffset: [2.6, 0.8, 3.0], desc: 'Baling-baling Hartzell 4 bilah berkecepatan konstan yang mengubah tenaga mesin menjadi gaya dorong. Sudut bilahnya berubah otomatis sesuai kecepatan terbang.' },
      { id: 2, name: 'Mesin Turboprop PT6A-62', pos: [0.55, 1.5, 5.2], camOffset: [2.6, 1.0, 2.6], desc: 'Mesin turboprop Pratt & Whitney Canada PT6A-62 berdaya 950 shp, terkenal andal dan banyak dipakai pesawat latih di seluruh dunia.' },
      { id: 3, name: 'Kokpit Tandem & Kanopi', pos: [0, 2.3, 2.5], camOffset: [2.6, 1.8, 2.4], desc: 'Kanopi lebar dengan dua kursi lontar Martin-Baker Mk16LF. Siswa duduk di depan, instruktur di belakang dengan posisi lebih tinggi untuk pandangan yang baik.' },
      { id: 4, name: 'Sayap Lurus Latih', pos: [4.6, 1.2, 0.4], camOffset: [2.8, 2.8, 2.4], desc: 'Sayap rendah lurus yang stabil pada kecepatan rendah, memudahkan siswa berlatih lepas landas, pendaratan, dan manuver dasar.' },
      { id: 5, name: 'Sistem Asap Aerobatik', pos: [0, 1.35, -6.1], camOffset: [2.8, 1.4, -3.2], desc: 'Generator asap di bagian ekor yang digunakan Jupiter Aerobatic Team untuk melukis formasi Merah-Putih di angkasa saat pertunjukan udara.' },
    ],
  },
  {
    id: 'caracal',
    name: 'H225M Caracal / Super Puma',
    code: 'NAS 332 / EC725',
    origin: 'Prancis-Indonesia',
    tailNumber: 'H-7206',
    category: 'Helikopter',
    squadron: 'Skadron Udara 6 & 8 (Lanud Atang Sendjaja, Bogor)',
    role: 'Helikopter angkut menengah bermesin ganda untuk misi SAR tempur (CSAR), angkut pasukan, evakuasi medis, dan dukungan logistik. Dirakit sebagian oleh PT Dirgantara Indonesia.',
    glbPath: '/models/h225m_caracal.glb',
    specs: {
      maxSpeed: '±324 km/jam',
      range: '±857 km',
      ceiling: '6.096 m',
      armament: '28 pasukan / 11 tandu • 2 SMB 12,7 mm',
    },
    history: {
      operational:
        'Skadron Udara 6 dan 8 di Lanud Atang Sendjaja, Bogor, mengoperasikan helikopter NAS-332 Super Puma dan H225M Caracal. Caracal dirakit melalui kerja sama Airbus Helicopters dan PT Dirgantara Indonesia, menjadi andalan misi SAR dan penanggulangan bencana.',
      tactical:
        'Dilengkapi probe pengisian bahan bakar di udara, autopilot 4 sumbu, sistem anti-es rotor, dan kamera FLIR. Kemampuan terbang segala cuaca menjadikan Caracal efektif untuk operasi SAR tempur dan evakuasi di medan sulit.',
      missions: ['SAR tempur (CSAR)', 'Angkut pasukan & logistik', 'Evakuasi medis & bencana', 'Dukungan operasi khusus'],
    },
    hotspots: [
      { id: 1, name: 'Rotor Utama 5 Bilah', pos: [0, 3.35, 0.4], camOffset: [3.6, 2.6, 3.0], desc: 'Rotor utama berbilah lima berbahan komposit dengan sistem anti-getar yang menghasilkan daya angkat dan kendali arah terbang helikopter.' },
      { id: 2, name: 'Mesin Ganda Makila 2A1', pos: [0.55, 2.65, -0.9], camOffset: [2.8, 1.8, 2.2], desc: 'Dua mesin turboshaft Safran Makila 2A1 (±2.400 shp) dengan kendali digital FADEC. Bila satu mesin mati, helikopter tetap dapat terbang aman.' },
      { id: 3, name: 'Kokpit & Kamera FLIR', pos: [0, 2.1, 4.4], camOffset: [2.6, 1.0, 2.8], desc: 'Kokpit kaca dengan layar digital, autopilot 4 sumbu, dan kamera inframerah FLIR untuk misi malam hari maupun pencarian korban.' },
      { id: 4, name: 'Kabin Pasukan & Pintu Geser', pos: [1.1, 1.6, 0.6], camOffset: [3.2, 0.8, 2.0], desc: 'Kabin luas dengan pintu geser di kedua sisi, mampu membawa 28 prajurit bersenjata lengkap atau 11 tandu untuk evakuasi medis.' },
      { id: 5, name: 'Rotor Ekor (Anti-Torsi)', pos: [0.45, 2.75, -7.25], camOffset: [3.0, 1.2, -1.6], desc: 'Rotor ekor 4 bilah yang melawan gaya puntir (torsi) rotor utama sehingga badan helikopter tidak ikut berputar, sekaligus mengendalikan arah haluan.' },
    ],
  },
];

export const getUnit = (id: string) => FLEET.find((u) => u.id === id) ?? FLEET[0];
