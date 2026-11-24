export type AircraftCategory = 'Tempur' | 'Angkut & VIP' | 'Latih' | 'Helikopter' | 'G-Suit & Pilot';
export type HotspotPartType = 'Sistem Internal' | 'Eksterior' | 'Senjata' | 'Aerodinamika';

export interface HotspotItem {
  id: number;
  name: string;
  partType?: HotspotPartType;
  pos: [number, number, number]; // Koordinat pin di ruang 3D
  camOffset: [number, number, number]; // Posisi kamera relatif terhadap pin saat diklik
  desc: string; // Penjelasan edukatif komponen & fungsinya
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
  glbPath?: string;
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

export const CATEGORIES: ('Semua' | AircraftCategory)[] = ['Semua', 'Tempur', 'Angkut & VIP', 'Latih', 'Helikopter', 'G-Suit & Pilot'];

export const CATEGORY_LABEL: Record<AircraftCategory, string> = {
  Tempur: 'TEMPUR',
  'Angkut & VIP': 'ANGKUT & VIP',
  Latih: 'LATIH',
  Helikopter: 'HELIKOPTER',
  'G-Suit & Pilot': 'G-SUIT PILOT',
};

export const FLEET: AircraftUnit[] = [
  {
    id: 'f16id',
    name: 'F-16 Fighting Falcon',
    code: 'C/D Block 52ID',
    origin: 'Amerika Serikat',
    tailNumber: 'TS-1601',
    category: 'Tempur',
    squadron: 'Skadron Udara 3, 14 & 16 (Lanud Iswahjudi & Roesmin Nurjadin)',
    role: 'Pesawat tempur multiperan bermesin tunggal yang lincah dan andal. Menjadi tulang punggung pertahanan udara nasional dengan kemampuan intersepsi, patroli udara tempur, dan serangan presisi ke sasaran darat.',
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
      { id: 1, name: 'Radar AN/APG-68(V)9', partType: 'Sistem Internal', pos: [0, 1.48, 6.1], camOffset: [3.0, 0.9, 3.2], desc: 'Antena piringan radar Doppler pulsa multimode di balik radome hidung. Mendeteksi pesawat lawan jarak jauh serta memetakan target darat & laut.' },
      { id: 2, name: 'Kokpit, HUD & Kursi ACES II', partType: 'Sistem Internal', pos: [0, 2.38, 3.45], camOffset: [2.6, 1.7, 2.4], desc: 'Kanopi gelembung anti-radar berlapis emas tipis dengan HUD lebar, layar MFD, dan kursi lontar ACES II yang direbahkan 30° untuk menahan gaya hingga 9G.' },
      { id: 3, name: 'Kanon M61A1 Vulcan 20 mm', partType: 'Senjata', pos: [-0.78, 1.58, 2.35], camOffset: [-2.8, 1.1, 2.4], desc: 'Senapan mesin putar 6 laras kaliber 20 mm di pangkal LERX kiri dengan kecepatan tembak 6.000 peluru/menit untuk pertempuran jarak dekat (dogfight).' },
      { id: 4, name: 'Ventral Air Intake & Splitter Plate', partType: 'Aerodinamika', pos: [0, 0.86, 3.1], camOffset: [2.5, -0.1, 3.0], desc: 'Mulut saluran udara di bawah perut dengan splitter plate pemisah lapisan batas udara agar pasokan oksigen ke mesin tetap stabil saat manuver ekstrem.' },
      { id: 5, name: 'Tangki Bahan Bakar Internal', partType: 'Sistem Internal', pos: [0, 1.66, 0.15], camOffset: [3.2, 1.6, 1.8], desc: 'Tangki bahan bakar internal terintegrasi di badan tengah dan sayap (kapasitas ±3.175 kg JP-8) dengan sistem penyeimbang pusat gravitasi otomatis.' },
      { id: 6, name: 'Inti Mesin Turbofan F100-PW-220E', partType: 'Sistem Internal', pos: [0, 1.5, -3.9], camOffset: [3.4, 1.2, -1.2], desc: 'Jantung penggerak F-16 terdiri dari kipas kompresor multi-tahap, ruang bakar bertekanan tinggi, dan turbin yang memutar poros utama dengan tenaga besar.' },
      { id: 7, name: 'Nozzle Afterburner (15 Kelopak)', partType: 'Eksterior', pos: [0, 1.5, -7.15], camOffset: [2.6, 1.2, -3.5], desc: 'Nozzle variabel dengan 15 kelopak logam (turkey feathers) yang membuka-tutup otomatis saat afterburner menyala untuk dorongan supersonik Mach 2.0.' },
      { id: 8, name: 'Sayap, Tangki 370-Gal & Rudal AIM-9/120', partType: 'Senjata', pos: [3.18, 1.38, -1.65], camOffset: [3.2, 2.4, 2.4], desc: 'Sayap berprofil airfoil NACA 64A204 membawa tangki eksternal 370 galon, rudal BVR AIM-120 AMRAAM, serta AIM-9 Sidewinder di rel ujung sayap.' },
      { id: 9, name: 'Ekor Tegak & Parabrake Housing', partType: 'Aerodinamika', pos: [0, 3.45, -5.65], camOffset: [3.2, 1.2, -1.8], desc: 'Vertical stabilizer pengatur arah (yaw) dilengkapi rumah parasut rem (parabrake housing) di pangkalnya untuk memperpendek jarak pengereman di landasan.' },
      { id: 10, name: 'Roda Pendarat Retractable', partType: 'Eksterior', pos: [1.12, 0.45, -1.25], camOffset: [2.8, 0.3, 2.2], desc: 'Sistem roda pendarat tiga titik hidraulik yang otomatis terlipat masuk ke dalam perut pesawat setelah lepas landas untuk mengurangi hambatan udara.' },
    ],
  },
  {
    id: 'su30mk2',
    name: 'Sukhoi Su-30MK2',
    code: 'Flanker-C',
    origin: 'Rusia',
    tailNumber: 'TS-3005',
    category: 'Tempur',
    squadron: 'Skadron Udara 11 (Lanud Sultan Hasanuddin, Makassar)',
    role: 'Pesawat tempur multiperan dua kursi kelas berat dengan jangkauan sangat jauh. Mampu melaksanakan misi superioritas udara, serangan darat, hingga serangan anti-kapal permukaan di wilayah maritim Nusantara yang luas.',
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
      { id: 1, name: 'Antena Radar N001VEP', partType: 'Sistem Internal', pos: [0, 1.5, 6.0], camOffset: [3.2, 1.1, 3.4], desc: 'Radar Doppler pulsa berdiameter besar di balik radome putih-abu. Melacak hingga 15 target udara sekaligus dan memandu serangan anti-kapal.' },
      { id: 2, name: 'Sensor Elektro-Optik IRST (OLS-30)', partType: 'Eksterior', pos: [0.14, 2.1, 5.0], camOffset: [2.4, 1.2, 2.6], desc: 'Bola kaca sensor inframerah & laser rangefinder di depan kokpit yang mendeteksi panas mesin pesawat lawan secara pasif tanpa memancarkan radar.' },
      { id: 3, name: 'Kokpit Tandem & Kursi K-36D-3.5', partType: 'Sistem Internal', pos: [0, 2.55, 3.35], camOffset: [2.8, 1.7, 2.6], desc: 'Kokpit dua kursi (Pilot depan & WSO belakang) dilengkapi kursi lontar terbaik di dunia K-36D-3.5 zero-zero yang aman pada kecepatan tinggi maupun nol.' },
      { id: 4, name: 'Sirip Canard & LERX Lebar', partType: 'Aerodinamika', pos: [1.55, 1.82, 2.45], camOffset: [3.2, 1.5, 2.6], desc: 'Sirip canard dan ekstensi pangkal sayap (LERX) yang menghasilkan pusaran daya angkat tinggi untuk kelincahan ekstrem seperti manuver Cobra.' },
      { id: 5, name: 'Intake Kotak Miring 28° (Raked)', partType: 'Aerodinamika', pos: [0.88, 1.25, 2.85], camOffset: [2.8, 0.3, 3.0], desc: 'Dua saluran masuk udara miring dengan ramp pengatur gelombang kejut supersonik serta kisi pelindung FOD agar kerikil landasan tidak masuk mesin.' },
      { id: 6, name: 'Tangki Bahan Bakar Internal Jumbo', partType: 'Sistem Internal', pos: [0, 1.86, -0.8], camOffset: [3.4, 1.8, 1.6], desc: 'Kapasitas bahan bakar internal sangat besar (±9.400 kg) di badan tengah & sayap sehingga mampu patroli 3.000 km tanpa perlu tangki eksternal.' },
      { id: 7, name: 'Inti Mesin Kembar Saturn AL-31F', partType: 'Sistem Internal', pos: [0.88, 1.32, -3.2], camOffset: [3.4, 1.2, -1.2], desc: 'Dua mesin turbofan terpisah di nacelle kiri dan kanan agar jika satu mesin terkena tembakan, mesin lainnya tetap mampu membawa pesawat pulang.' },
      { id: 8, name: 'Panel Titanium & Nozzle Afterburner', partType: 'Eksterior', pos: [0.88, 1.32, -6.5], camOffset: [3.2, 1.1, -3.5], desc: 'Selubung logam titanium tahan panas ekstrem tanpa cat dengan dua nozzle afterburner berdaya dorong total ±25.000 kgf dan tail stinger di tengahnya.' },
      { id: 9, name: 'Rudal Anti-Kapal Kh-31A & R-77/R-73', partType: 'Senjata', pos: [2.48, 1.15, -1.32], camOffset: [3.2, 1.6, 2.6], desc: '12 titik cantelan senjata termasuk rudal anti-kapal supersonik Kh-31A (4 intake ramjet), rudal BVR R-77/R-27 di terowongan tengah, dan R-73 ujung sayap.' },
      { id: 10, name: 'Ekor Kembar & Roda Depan Mudguard', partType: 'Eksterior', pos: [1.32, 3.25, -5.45], camOffset: [3.4, 1.4, -2.0], desc: 'Dua sirip ekor tegak di atas tail boom untuk kestabilan sudut serang tinggi, serta roda depan ganda berpelindung lumpur (mudguard) khas landasan keras.' },
    ],
  },
  {
    id: 'rafale',
    name: 'Dassault Rafale',
    code: 'F4 Standard',
    origin: 'Prancis',
    tailNumber: 'T-0302',
    category: 'Tempur',
    squadron: 'Program Modernisasi Alutsista TNI AU',
    role: 'Pesawat tempur omnirole generasi 4.5 bersayap delta dengan canard. Mampu melaksanakan misi superioritas udara, serangan darat dalam, pengintaian, dan anti-kapal dalam satu sorti penerbangan.',
    specs: {
      maxSpeed: 'Mach 1.8 (±1.912 km/jam)',
      range: '±3.700 km (ferry)',
      ceiling: '15.835 m',
      armament: 'Kanon GIAT 30M791 30 mm • 14 hardpoint',
    },
    history: {
      operational:
        'Indonesia menandatangani kontrak pengadaan 42 unit Rafale pada 2022 sebagai bagian program modernisasi alutsista TNI AU. Unit Rafale B kursi ganda seperti T-0302 hadir dengan kamuflase abu dua nada dan roundel low-visibility khas TNI AU.',
      tactical:
        'Sistem fusi sensor mengintegrasikan radar AESA RBE2, sensor optronik OSF, dan perang elektronik SPECTRA sehingga pilot memperoleh gambaran situasi menyeluruh. Kombinasi rudal Meteor jarak jauh dan MICA menjadikannya unggul dalam pertempuran di luar jarak pandang (BVR).',
      missions: ['Misi omnirole (udara & darat sekaligus)', 'Serangan presisi jarak jauh (SCALP)', 'Pengintaian taktis', 'Penangkalan strategis kawasan'],
    },
    hotspots: [
      { id: 1, name: 'Radar AESA RBE2', partType: 'Sistem Internal', pos: [0, 1.48, 5.95], camOffset: [3.0, 1.0, 3.2], desc: 'Radar Active Electronically Scanned Array buatan Thales di balik hidung yang memindai ratusan sasaran udara, darat, dan laut secara elektronik super cepat.' },
      { id: 2, name: 'Probe Pengisian BBM & Sensor OSF', partType: 'Eksterior', pos: [0.35, 2.12, 5.35], camOffset: [2.6, 1.1, 2.6], desc: 'Probe pengisian bahan bakar di udara model tetap (fixed) di sisi kanan hidung serta sensor optronik OSF (kamera TV & inframerah jarak jauh).' },
      { id: 3, name: 'Kokpit Tandem & Kursi Mk16', partType: 'Sistem Internal', pos: [0, 2.45, 3.25], camOffset: [2.6, 1.7, 2.4], desc: 'Kokpit kaca Rafale B dengan fusi sensor, layar sentuh, kendali suara, HUD lebar, dan dua kursi lontar Martin-Baker Mk16.' },
      { id: 4, name: 'Close-Coupled Canards', partType: 'Aerodinamika', pos: [1.65, 1.84, 2.15], camOffset: [3.0, 1.5, 2.6], desc: 'Sayap depan aktif yang terpasang rapat dengan sayap delta untuk menciptakan pusaran udara tambahan, meningkatkan daya angkat dan kelincahan manuver.' },
      { id: 5, name: 'Saluran Udara Samping (S-Duct)', partType: 'Aerodinamika', pos: [0.68, 1.24, 2.4], camOffset: [2.6, 0.4, 2.8], desc: 'Intake melengkung berbentuk S di kedua sisi perut yang menyembunyikan bilah kompresor mesin dari pantulan radar lawan (mengurangi RCS/siluman).' },
      { id: 6, name: 'Tangki Bahan Bakar Internal & Centerline', partType: 'Sistem Internal', pos: [0, 1.65, -0.4], camOffset: [3.2, 1.6, 1.8], desc: 'Tangki internal komposit ±4.700 kg dipadukan tangki supersonik 1.250 liter di bawah perut untuk jangkauan misi omnirole jarak jauh.' },
      { id: 7, name: 'Inti Mesin Kembar Safran M88-2', partType: 'Sistem Internal', pos: [0.41, 1.44, -3.8], camOffset: [3.2, 1.2, -1.2], desc: 'Dua mesin turbofan modular Safran M88-2 yang terpasang sangat rapat, efisien, dan mampu diganti di lapangan hanya dalam waktu kurang dari 1 jam.' },
      { id: 8, name: 'Nozzle M88-2 & Afterburner', partType: 'Eksterior', pos: [0.41, 1.44, -6.85], camOffset: [2.8, 1.2, -3.5], desc: 'Dua nozzle bergerigi (serrated) yang dirancang mengurangi jejak inframerah sekaligus menghasilkan dorongan total ±15.000 kgf.' },
      { id: 9, name: 'Sayap Delta & Rudal BVR Meteor', partType: 'Senjata', pos: [2.55, 1.28, -3.1], camOffset: [3.2, 2.4, 2.2], desc: 'Sayap delta murni tanpa ekor horizontal dengan 14 hardpoint untuk rudal jarak sangat jauh Meteor, MICA, rudal jelajah SCALP, dan bom AASM Hammer.' },
      { id: 10, name: 'Ekor Tegak & Sistem EW SPECTRA', partType: 'Aerodinamika', pos: [0, 4.15, -6.0], camOffset: [3.2, 1.4, -2.0], desc: 'Sirip ekor abu gelap dengan pod perang elektronik SPECTRA di pucuk dan pangkalnya yang mendeteksi, mengacak, dan mengecoh radar serta rudal musuh.' },
    ],
  },
  {
    id: 'su27skm',
    name: 'Sukhoi Su-27SKM',
    code: 'Flanker-B • Kursi Tunggal',
    origin: 'Rusia',
    tailNumber: 'TS-2703',
    category: 'Tempur',
    squadron: 'Skadron Udara 11 (Lanud Sultan Hasanuddin, Makassar)',
    role: 'Pesawat tempur superioritas udara kursi tunggal berjangkauan jauh. Dirancang khusus untuk menguasai ruang udara dan mencegat ancaman udara di seluruh kepulauan Nusantara.',
    specs: {
      maxSpeed: 'Mach 2.35 (±2.500 km/jam)',
      range: '±3.530 km',
      ceiling: '19.000 m',
      armament: 'Kanon GSh-30-1 30 mm • 10 hardpoint',
    },
    history: {
      operational:
        'TNI AU mulai mengoperasikan Sukhoi Su-27SK sejak 2003 dan kemudian Su-27SKM di Skadron Udara 11 Lanud Sultan Hasanuddin, Makassar. Kehadirannya menjadi tonggak kembalinya kekuatan tempur kelas berat TNI AU.',
      tactical:
        'Berbeda dari Su-30MK2 yang berkursi ganda, Su-27SKM berkursi tunggal dengan bobot lebih ringan dan kelincahan manuver tinggi (terkenal dengan manuver Pugachev Cobra), didukung radar N001VE serta rudal R-73 dan R-27.',
      missions: ['Superioritas udara & pencegatan jarak jauh', 'Patroli udara tempur (CAP)', 'Pengawalan udara strategis', 'Penindakan pelanggaran wilayah udara'],
    },
    hotspots: [
      { id: 1, name: 'Radar N001VE & Radome', partType: 'Sistem Internal', pos: [0, 1.5, 6.1], camOffset: [3.2, 1.1, 3.4], desc: 'Radar Doppler pulsa jarak jauh di balik radome putih-abu yang mendeteksi pesawat tempur lawan hingga lebih dari 100 km.' },
      { id: 2, name: 'Sensor Inframerah IRST Tengah', partType: 'Eksterior', pos: [0, 2.06, 4.92], camOffset: [2.4, 1.2, 2.6], desc: 'Sensor pelacak panas pasif OLS-27 tepat di tengah depan kaca kokpit (ciri pembeda Su-27 dengan Su-30) untuk menyergap lawan secara senyap.' },
      { id: 3, name: 'Kokpit Kursi Tunggal & K-36DM', partType: 'Sistem Internal', pos: [0, 2.58, 3.65], camOffset: [2.8, 1.7, 2.6], desc: 'Kokpit satu awak dengan kanopi gelembung luas, HUD, helm bidik target (HMS), serta kursi lontar K-36DM zero-zero.' },
      { id: 4, name: 'LERX (Tanpa Canard)', partType: 'Aerodinamika', pos: [1.32, 1.62, 1.6], camOffset: [3.0, 1.5, 2.4], desc: 'Ekstensi pangkal sayap lebar mulus tanpa canard yang menjaga aliran udara tetap menempel di sayap pada sudut serang sangat tinggi.' },
      { id: 5, name: 'Intake Miring 28° (Raked)', partType: 'Aerodinamika', pos: [0.88, 1.22, 2.8], camOffset: [2.8, 0.3, 3.0], desc: 'Saluran masuk udara supersonik dengan ramp variabel dan kisi anti-FOD untuk menyuplai udara ke mesin kembar hingga Mach 2.35.' },
      { id: 6, name: 'Tangki Bahan Bakar Internal', partType: 'Sistem Internal', pos: [0, 1.75, -0.8], camOffset: [3.4, 1.8, 1.6], desc: 'Kapasitas bahan bakar internal masif (±9.400 kg) membuat Su-27 mampu terbang sejauh 3.530 km tanpa membutuhkan tangki tambahan.' },
      { id: 7, name: 'Inti Mesin Kembar AL-31F', partType: 'Sistem Internal', pos: [0.88, 1.3, -3.2], camOffset: [3.4, 1.2, -1.2], desc: 'Dua mesin turbofan Saturn AL-31F berdaya dorong tinggi yang memungkinkan Su-27 menanjak hampir vertikal segera setelah lepas landas.' },
      { id: 8, name: 'Panel Titanium & Tail Stinger', partType: 'Eksterior', pos: [0.88, 1.3, -6.55], camOffset: [3.2, 1.1, -3.5], desc: 'Selubung logam titanium ekspos tahan panas dan tail stinger tengah tempat parasut rem serta radar peringatan ancaman belakang.' },
      { id: 9, name: 'Sayap & Rudal R-73 / R-27', partType: 'Senjata', pos: [3.0, 1.48, -1.85], camOffset: [3.4, 2.4, 2.2], desc: '10 titik cantelan senjata untuk rudal dogfight R-73 berpandu helm di ujung sayap serta rudal jarak menengah R-27/R-77 di bawah sayap.' },
      { id: 10, name: 'Ekor Tegak Kembar & Roda Pendarat', partType: 'Aerodinamika', pos: [1.3, 3.2, -5.45], camOffset: [3.4, 1.4, -2.0], desc: 'Dua sirip ekor tegak kokoh di atas tail boom plus sirip ventral bawah untuk stabilitas supersonik dan manuver ekstrim.' },
    ],
  },
  {
    id: 'hawk209',
    name: 'BAE Hawk 209',
    code: 'Light Fighter Mk.209',
    origin: 'Britania Raya',
    tailNumber: 'TT-0207',
    category: 'Tempur',
    squadron: 'Skadron Udara 1 (Supadio) & Skadron Udara 12 (Roesmin Nurjadin)',
    role: 'Pesawat tempur taktis ringan kursi tunggal berkemampuan serang darat dan pertahanan udara. Menjadi penjaga strategis perbatasan Kalimantan dan Sumatera.',
    specs: {
      maxSpeed: 'Mach 0.88 (±1.028 km/jam)',
      range: '±2.520 km (ferry)',
      ceiling: '13.500 m',
      armament: 'Pod Kanon ADEN 30 mm • AIM-9 Sidewinder & bom',
    },
    history: {
      operational:
        'TNI AU mengoperasikan armada Hawk 109 (latih tempur 2 kursi) dan Hawk 209 (tempur kursi tunggal) sejak pertengahan 1990-an di Skadron Udara 1 "Elang Khatulistiwa" (Pontianak) dan Skadron Udara 12 "Black Panther" (Pekanbaru).',
      tactical:
        'Dilengkapi radar modern AN/APG-66H (varian khusus Mk.200) di hidungnya, membuat Hawk 209 mampu melacak sasaran udara maupun laut, membawa rudal AIM-9 Sidewinder di ujung sayap, serta pod kanon ADEN 30 mm di bawah perut.',
      missions: ['Pertahanan udara & patroli perbatasan', 'Serangan udara langsung (CAS)', 'Serangan maritim ringan', 'Latihan tempur taktis'],
    },
    hotspots: [
      { id: 1, name: 'Radar AN/APG-66H', partType: 'Sistem Internal', pos: [0, 1.42, 5.45], camOffset: [2.8, 1.0, 3.0], desc: 'Radar multimode AN/APG-66H (turunan radar F-16) di dalam hidung Hawk 209 untuk mendeteksi target udara, darat, dan kapal di laut.' },
      { id: 2, name: 'Kokpit Kursi Tunggal & HUD', partType: 'Sistem Internal', pos: [0, 2.35, 2.85], camOffset: [2.6, 1.6, 2.4], desc: 'Kokpit satu awak dengan Head-Up Display, kontrol HOTAS, layar multifungsi, dan kursi lontar Martin-Baker Mk.10L zero-zero.' },
      { id: 3, name: 'Air Intake Samping Kembar', partType: 'Aerodinamika', pos: [0.64, 1.48, 1.8], camOffset: [2.6, 0.6, 2.6], desc: 'Dua saluran masuk udara setengah lingkaran di sisi kanan-kiri badan belakang kokpit yang mengalirkan udara mulus ke mesin tunggal.' },
      { id: 4, name: 'Rangka Badan & Tangki Internal', partType: 'Sistem Internal', pos: [0, 1.52, -0.5], camOffset: [3.0, 1.5, 1.8], desc: 'Struktur rangka aluminium alloy yang tangguh dengan tangki bahan bakar internal di badan tengah dan sayap untuk patroli perbatasan.' },
      { id: 5, name: 'Pod Kanon ADEN 30 mm', partType: 'Senjata', pos: [0, 0.88, -0.25], camOffset: [2.6, 0.1, 2.4], desc: 'Pod kanon revolver ADEN kaliber 30 mm yang dipasang di bawah perut pesawat untuk misi serangan udara langsung (CAS) dan dogfight.' },
      { id: 6, name: 'Inti Mesin Rolls-Royce Adour Mk.871', partType: 'Sistem Internal', pos: [0, 1.46, -3.6], camOffset: [3.2, 1.2, -1.0], desc: 'Mesin turbofan tanpa afterburner yang sangat irit bahan bakar, awet, dan andal dioperasikan dari pangkalan udara aju.' },
      { id: 7, name: 'Nozzle Gas Buang Belakang', partType: 'Eksterior', pos: [0, 1.46, -6.4], camOffset: [2.6, 1.1, -3.3], desc: 'Saluran buang jet belakang dengan jejak panas rendah untuk mengurangi risiko kunci rudal pencari panas musuh.' },
      { id: 8, name: 'Sayap, Tangki Eksternal & AIM-9', partType: 'Senjata', pos: [2.45, 1.2, -0.65], camOffset: [2.8, 2.2, 2.4], desc: 'Sayap sapu belakang dengan tangki bahan bakar eksternal bawah sayap, bom/roket, serta rel rudal AIM-9 Sidewinder di ujung sayap.' },
      { id: 9, name: 'Ekor Tegak & Stabilator Anhedral', partType: 'Aerodinamika', pos: [0, 3.3, -5.3], camOffset: [3.0, 1.2, -1.8], desc: 'Sirip ekor tegak dengan stabilator miring ke bawah (anhedral) khas keluarga BAE Hawk untuk respons kendali pitch yang presisi.' },
      { id: 10, name: 'Roda Pendarat Retractable', partType: 'Eksterior', pos: [1.55, 0.45, -0.65], camOffset: [2.6, 0.3, 2.2], desc: 'Roda pendarat lebar yang kokoh untuk mendarat di berbagai pangkalan udara dan otomatis masuk ke dalam sayap saat terbang.' },
    ],
  },
  {
    id: 'supertucano',
    name: 'EMB-314 Super Tucano',
    code: 'A-29 Light Attack • COIN',
    origin: 'Brasil',
    tailNumber: 'TT-3108',
    category: 'Tempur',
    squadron: 'Skadron Udara 21 (Lanud Abdulrachman Saleh, Malang)',
    role: 'Pesawat serang taktis ringan (Close Air Support) dan pengintaian bermesin turboprop. Sangat efektif untuk dukungan udara jarak dekat, patroli perbatasan, dan operasi anti-gerilya.',
    specs: {
      maxSpeed: '±590 km/jam',
      range: '±2.855 km (ferry)',
      ceiling: '10.670 m',
      armament: '2× SMB 12,7 mm internal • 5 hardpoint (1,55 ton)',
    },
    history: {
      operational:
        'Skadron Udara 21 "Tutuka" di Lanud Abdulrachman Saleh, Malang, mengoperasikan 16 unit EMB-314 Super Tucano sejak 2012 menggantikan OV-10 Bronco. Ciri khasnya adalah lukisan mulut hiu (shark-mouth) dan spinner merah di hidung.',
      tactical:
        'Dirancang tahan banting dengan pelindung baja Kevlar di sekitar kokpit, mampu terbang lambat dan lama (loiter time tinggi) di atas medan operasi, membawa sensor inframerah FLIR, roket, serta bom berpemandu presisi.',
      missions: ['Dukungan udara jarak dekat (CAS)', 'Pengintaian & patroli perbatasan', 'Operasi counter-insurgency (COIN)', 'Pencegatan pesawat berkecepatan rendah'],
    },
    hotspots: [
      { id: 1, name: 'Baling-baling 5 Bilah & Spinner Merah', partType: 'Aerodinamika', pos: [0, 1.52, 6.48], camOffset: [2.8, 0.9, 3.0], desc: 'Baling-baling Hartzell 5 bilah berkecepatan konstan dengan spinner merah menyala yang mengubah daya 1.600 shp menjadi gaya dorong besar.' },
      { id: 2, name: 'Inti Mesin Turboprop PT6A-68C', partType: 'Sistem Internal', pos: [0, 1.52, 4.9], camOffset: [2.8, 1.0, 2.6], desc: 'Mesin turbin gas Pratt & Whitney PT6A-68C di balik lukisan mulut hiu (shark-mouth) dengan 2 knalpot samping, tangguh di landasan pendek.' },
      { id: 3, name: 'Kokpit Tandem Berlapis Baja Kevlar', partType: 'Sistem Internal', pos: [0, 2.48, 2.25], camOffset: [2.6, 1.7, 2.4], desc: 'Kokpit 2 kursi tandem berpelindung baja anti-peluru Kevlar, HUD, kompatibel kacamata malam (NVG), dan kursi lontar Martin-Baker.' },
      { id: 4, name: 'Senapan Mesin 12,7 mm Internal Sayap', partType: 'Senjata', pos: [1.65, 1.2, 1.35], camOffset: [2.8, 1.6, 2.4], desc: 'Dua senapan mesin berat FN Herstal M3P kaliber 12,7 mm tertanam langsung di dalam sayap kiri dan kanan dengan 200 butir amunisi tiap laras.' },
      { id: 5, name: 'Pod Roket & Cantelan Bom Sayap', partType: 'Senjata', pos: [2.35, 0.85, 1.05], camOffset: [2.8, 1.4, 2.4], desc: '5 titik cantelan senjata berkapasitas 1,55 ton untuk membawa pod roket 70 mm, bom pintar berpemandu laser, hingga rudal udara-ke-udara.' },
      { id: 6, name: 'Tangki Bahan Bakar Centerline', partType: 'Eksterior', pos: [0, 0.72, 1.35], camOffset: [2.6, 0.2, 2.6], desc: 'Tangki bahan bakar eksternal di bawah perut yang memperpanjang waktu patroli (loiter time) hingga lebih dari 6 jam di atas sasaran.' },
      { id: 7, name: 'Turret Sensor Kamera FLIR', partType: 'Eksterior', pos: [0, 0.9, -0.45], camOffset: [2.6, 0.2, 2.6], desc: 'Kamera elektro-optik & inframerah FLIR berputar 360° untuk pengintaian siang/malam serta penandaan sasaran laser (laser designator).' },
      { id: 8, name: 'Rangka Fuselage & Sistem Avionik', partType: 'Sistem Internal', pos: [0, 1.58, -1.85], camOffset: [3.0, 1.2, 1.6], desc: 'Struktur rangka aluminium diperkuat untuk menahan manuver +7G/-3,5G serta ruang komputer misi & komunikasi taktis terenkripsi.' },
      { id: 9, name: 'Ekor Tegak & Kemudi Arah (Rudder)', partType: 'Aerodinamika', pos: [0, 3.2, -5.6], camOffset: [2.8, 1.2, -1.8], desc: 'Sirip ekor tegak dengan dorsal fillet panjang yang menjaga kestabilan pesawat saat menembak atau meluncur tajam ke sasaran darat.' },
      { id: 10, name: 'Roda Pendarat Landasan Darurat', partType: 'Eksterior', pos: [1.65, 0.45, 0.85], camOffset: [2.6, 0.3, 2.2], desc: 'Roda pendarat kuat dengan suspensi empuk untuk mendarat di landasan tanah/rumput pendek dan otomatis terlipat saat terbang.' },
    ],
  },
  {
    id: 'c130j',
    name: 'C-130J Super Hercules',
    code: 'C-130J-30 • 34,69 m',
    origin: 'Amerika Serikat',
    tailNumber: 'A-1342',
    category: 'Angkut & VIP',
    squadron: 'Skadron Udara 31 Wing I (Lanud Halim Perdanakusuma, Jakarta)',
    role: 'Pesawat angkut taktis berbadan panjang berlivery abu-abu taktis modern (5 unit: A-1339, A-1340, A-1342, A-1343, A-1344). Dimensi panjang 34,69 m, rentang sayap 39,7 m, tinggi 11,9 m, mampu terbang 11 jam nonstop.',
    specs: {
      maxSpeed: '660 km/jam (di 6.706 m)',
      range: '11 jam nonstop (±5.250 km)',
      ceiling: '8.615 m • Sayap 39,7 m',
      armament: 'Muatan 19 ton • 128 pasukan / ranpur',
    },
    history: {
      operational:
        'Kementerian Pertahanan mendatangkan 5 unit C-130J-30 Super Hercules secara bertahap untuk Skadron Udara 31 Wing I Lanud Halim Perdanakusuma: A-1339 (6 Mar 2023), A-1340 (28 Jun 2023), A-1343 (9 Agu 2023), A-1344 (22 Jan 2024), dan unit ke-5 A-1342 (16 Mei 2024). Secara total TNI AU mengoperasikan 36 Hercules aktif (5 C-130J, 4 C-130B, dan 27 C-130H).',
      tactical:
        'Lebih hemat bahan bakar, daya angkut kargo lebih besar, sistem aviasi & navigasi digital canggih, mampu lepas landas dan mendarat di runway pendek, serta sanggup terbang 11 jam nonstop untuk operasi perang maupun bantuan kemanusiaan.',
      missions: [
        'Mengangkut pasukan & kendaraan tempur',
        'Logistik & bantuan kemanusiaan bencana/perang',
        'Penerjunan pasukan & airdrop presisi',
        'Operasi runway pendek di wilayah 3T',
      ],
    },
    hotspots: [
      { id: 1, name: 'Radome Radar Cuaca & Navigasi', partType: 'Sistem Internal', pos: [0, 1.25, 6.0], camOffset: [2.8, 0.8, 2.8], desc: 'Radar cuaca digital berdaya tembus awan tebal di hidung pesawat untuk navigasi segala cuaca melintasi kepulauan Nusantara.' },
      { id: 2, name: 'Kokpit Digital (Glass Cockpit)', partType: 'Sistem Internal', pos: [0, 1.92, 5.25], camOffset: [2.6, 1.4, 2.8], desc: 'Kokpit modern 2 awak (pilot & kopilot) dengan 4 layar multifungsi, dua HUD, dan otomatisasi penuh menggantikan juru mesin.' },
      { id: 3, name: 'Baling-baling 6 Bilah Scimitar', partType: 'Aerodinamika', pos: [4.15, 1.96, 2.55], camOffset: [2.8, 1.2, 3.0], desc: 'Baling-baling komposit Dowty R391 6 bilah melengkung (scimitar) yang lebih senyap, cepat menanjak, dan hemat bahan bakar.' },
      { id: 4, name: 'Inti 4 Mesin Rolls-Royce AE2100D3', partType: 'Sistem Internal', pos: [2.05, 1.96, 1.1], camOffset: [2.8, 1.4, 2.6], desc: 'Empat mesin turboprop AE2100D3 berdaya 4.637 shp per mesin dengan kendali digital FADEC untuk daya jelajah 11 jam nonstop.' },
      { id: 5, name: 'Tangki Eksternal Bawah Sayap', partType: 'Eksterior', pos: [3.1, 1.62, 0.72], camOffset: [2.8, 1.0, 2.6], desc: 'Dua tangki bahan bakar eksternal di antara mesin dalam dan luar untuk memperluas jangkauan misi lintas samudera dan bantuan kemanusiaan.' },
      { id: 6, name: 'Sayap Tinggi (High Wing 39,7 m)', partType: 'Aerodinamika', pos: [5.6, 2.28, 0.55], camOffset: [2.8, 3.0, 2.8], desc: 'Sayap dipasang di atas badan agar mesin tinggi dari tanah—aman dari kerikil di landasan darurat—dan memberi ruang kargo lega di bawahnya.' },
      { id: 7, name: 'Ruang Kargo & Palet Logistik 34,69 m', partType: 'Sistem Internal', pos: [0, 1.38, 0.6], camOffset: [3.6, 1.4, 2.0], desc: 'Kabin kargo super panjang yang memuat 8 palet logistik (19 ton), 128 pasukan, kendaraan tempur, atau 97 tandu evakuasi medis.' },
      { id: 8, name: 'Ramp & Pintu Kargo Belakang', partType: 'Eksterior', pos: [0, 1.28, -4.35], camOffset: [2.8, 0.6, -3.4], desc: 'Pintu ramp hidraulik di ekor yang dapat dibuka di udara untuk penerjunan pasukan & airdrop logistik, atau jalur masuk kendaraan di darat.' },
      { id: 9, name: 'Ekor Tegak Tinggi (11,9 m)', partType: 'Aerodinamika', pos: [0, 3.7, -5.5], camOffset: [3.4, 1.4, -2.0], desc: 'Sirip ekor raksasa setinggi 11,9 m yang menjaga stabilitas arah saat terbang dengan muatan berat maupun saat pintu kargo dibuka.' },
      { id: 10, name: 'Sponson & Roda Utama Tandem', partType: 'Eksterior', pos: [0.82, 0.45, -0.35], camOffset: [2.8, 0.3, 2.4], desc: 'Sponson samping tempat menyimpan roda utama tandem bertekanan rendah yang dirancang khusus untuk mendarat di landasan pendek/tanah.' },
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
      { id: 1, name: 'Radome & Radar Cuaca', partType: 'Sistem Internal', pos: [0, 1.55, 6.7], camOffset: [2.6, 0.8, 2.8], desc: 'Hidung aerodinamis berisi antena radar cuaca Doppler dan sensor ILS untuk pendaratan presisi dalam kondisi hujan lebat atau kabut.' },
      { id: 2, name: 'Kokpit Dua Awak (Pilot & Kopilot)', partType: 'Sistem Internal', pos: [0, 2.05, 6.0], camOffset: [2.6, 1.2, 2.8], desc: 'Kokpit dengan sistem navigasi modern, autopilot penuh, dan komunikasi satelit aman untuk penerbangan kenegaraan.' },
      { id: 3, name: 'Ruang Rapat & Kabin VVIP Depan', partType: 'Sistem Internal', pos: [0, 1.75, 2.6], camOffset: [3.2, 1.2, 2.0], desc: 'Kabin kenegaraan berisi ruang kerja, meja rapat Presiden/pejabat tinggi, serta ruang istirahat berperedam suara tinggi.' },
      { id: 4, name: 'Kabin Penumpang Eksekutif', partType: 'Sistem Internal', pos: [0, 1.7, -1.2], camOffset: [3.2, 1.2, 1.8], desc: 'Deretan kursi kelas eksekutif luas untuk rombongan menteri, staf kepresidenan, paspampres, dan delegasi negara.' },
      { id: 5, name: 'Inti Mesin Turbofan CFM56-3', partType: 'Sistem Internal', pos: [1.95, 0.78, 0.8], camOffset: [2.8, 0.6, 2.6], desc: 'Dua mesin turbofan bypass tinggi CFM56-3 berdaya dorong ±10.000 kgf dengan bentuk nacelle bawah pipih (hamster pouch) khas 737 Classic.' },
      { id: 6, name: 'Kipas Depan (Fan) Mesin', partType: 'Aerodinamika', pos: [1.95, 0.78, 2.05], camOffset: [2.4, 0.5, 2.8], desc: 'Kipas utama berdiameter besar yang menghisap udara dingin untuk menghasilkan mayoritas gaya dorong dengan tingkat kebisingan rendah.' },
      { id: 7, name: 'Sayap Sapu & Flap Tiga Celah', partType: 'Aerodinamika', pos: [4.2, 1.25, -1.6], camOffset: [2.6, 2.8, 2.0], desc: 'Sayap sapu belakang (swept wing) dengan slat dan flap tiga celah yang memberi daya angkat tinggi agar aman di landasan pendek.' },
      { id: 8, name: 'Ekor Tegak & Bendera Negara', partType: 'Aerodinamika', pos: [0, 3.35, -5.9], camOffset: [3.0, 1.0, -2.0], desc: 'Vertical stabilizer pengatur arah dengan bendera Merah-Putih dan nomor registrasi A-7304 sebagai identitas pesawat kenegaraan.' },
      { id: 9, name: 'Stabilizer Horizontal & APU Ekor', partType: 'Eksterior', pos: [1.6, 1.85, -6.1], camOffset: [2.8, 1.2, -2.2], desc: 'Sayap ekor horizontal pengatur ketinggian (pitch) dan unit pembangkit listrik cadangan (APU) di ujung kerucut ekor.' },
      { id: 10, name: 'Roda Pendarat Ganda Retractable', partType: 'Eksterior', pos: [1.0, 0.45, -0.55], camOffset: [2.8, 0.3, 2.4], desc: 'Roda pendarat utama ganda dengan rem cakram anti-selip yang terlipat rapi ke dalam perut pesawat segera setelah lepas landas.' },
    ],
  },
  {
    id: 't50i',
    name: 'KAI T-50i Golden Eagle',
    code: 'LIFT Supersonic • 13,14 m',
    origin: 'Korea Selatan',
    tailNumber: 'TT-5005',
    category: 'Latih',
    squadron: 'Skadron Udara 15 (Lanud Iswahjudi, Madiun)',
    role: 'Pesawat latih tempur supersonik (Lead-In Fighter Trainer) berlivery biru-kuning Elang Emas. Dimensi panjang 13,14 m, rentang sayap 9,45 m, tinggi 4,81 m, berat lepas landas 10,7 ton, untuk 2 awak tandem.',
    specs: {
      maxSpeed: 'Mach 1.5 (±1.640 km/jam)',
      range: '1.400 km (dengan tangki tambahan)',
      ceiling: '14.630 m • MTOW 10,7 ton',
      armament: 'Kanon 20 mm • 7 hardpoint • 2 awak',
    },
    history: {
      operational:
        'Skadron Udara 15 Lanud Iswahjudi, Madiun, mengoperasikan 16 unit T-50i yang tiba sejak 2014 dan diperkuat pengadaan 6 unit tambahan (kontrak 2021–2024). Selain di Indonesia, T-50 juga dioperasikan oleh Korea Selatan, Irak, Filipina, dan Thailand.',
      tactical:
        'Ditenagai mesin GE F404-102 (Samsung Techwin) dengan afterburner dan kendali digital FADEC. Kokpit dilengkapi Zero-Zero Ejection Seats dan sistem suplai oksigen OBOGS (On-Board Oxygen Generating System) untuk kesiapan tempur penuh.',
      missions: [
        'Latihan Sikatan Daya (2020, Jawa Timur)',
        'Latihan Kilat Cakra (2020, Papua)',
        'Operasi Panah & Jelajah Medan (2019, NTT)',
        'Operasi Lintas Kaswari (2018, Kalimantan Utara)',
      ],
    },
    hotspots: [
      { id: 1, name: 'Radome Abu Terang & Avionik', partType: 'Sistem Internal', pos: [0, 1.44, 5.95], camOffset: [2.8, 1.0, 3.0], desc: 'Radome hidung abu-abu terang dengan pitot tube dan sistem avionik tempur digital untuk melatih calon penerbang F-16 dan Sukhoi.' },
      { id: 2, name: 'Kokpit Tandem • Zero-Zero & OBOGS', partType: 'Sistem Internal', pos: [0, 2.38, 2.95], camOffset: [2.6, 1.7, 2.4], desc: 'Kokpit 2 orang tandem dengan kursi lontar Zero-Zero Ejection Seats serta On-Board Oxygen Generating System (OBOGS) penghasil oksigen otomatis.' },
      { id: 3, name: 'Air Intake Samping & LERX', partType: 'Aerodinamika', pos: [0.64, 1.24, 2.05], camOffset: [2.8, 0.5, 2.8], desc: 'Dua saluran udara samping di bawah LERX berpola kuning-biru Elang Emas yang menjaga pasokan udara stabil saat manuver tinggi.' },
      { id: 4, name: 'Rangka Badan & Tangki Internal', partType: 'Sistem Internal', pos: [0, 1.56, 0.1], camOffset: [3.0, 1.5, 1.8], desc: 'Struktur rangka badan ringan dan tangki bahan bakar internal dengan berat lepas landas maksimum 10,7 ton.' },
      { id: 5, name: 'Inti Mesin GE F404-102 (FADEC)', partType: 'Sistem Internal', pos: [0, 1.48, -3.9], camOffset: [3.2, 1.2, -1.0], desc: 'Mesin turbofan General Electric F404-102 (Samsung Techwin) dikendalikan komputer digital FADEC untuk performa responsif hingga Mach 1.5.' },
      { id: 6, name: 'Nozzle Afterburner (14 Kelopak)', partType: 'Eksterior', pos: [0, 1.48, -6.75], camOffset: [2.6, 1.2, -3.4], desc: 'Nozzle afterburner berdaya dorong ±8.000 kgf yang mengakselerasi T-50i menembus kecepatan suara.' },
      { id: 7, name: 'Tangki Eksternal Putih Bawah Sayap', partType: 'Eksterior', pos: [2.05, 0.9, -1.05], camOffset: [2.8, 1.4, 2.4], desc: 'Sepasang tangki bahan bakar tambahan putih yang memperluas daya jelajah T-50i hingga 1.400 km dalam operasi lintas pulau.' },
      { id: 8, name: 'Sayap (9,45 m) & Rel AIM-9', partType: 'Senjata', pos: [4.38, 1.35, -1.55], camOffset: [3.0, 2.2, 2.4], desc: 'Rentang sayap 9,45 m dengan rel peluncur rudal AIM-9 Sidewinder di ujung sayap dan 7 cantelan persenjataan.' },
      { id: 9, name: 'Ekor Tegak Kuning-Biru (4,81 m)', partType: 'Aerodinamika', pos: [0, 3.35, -5.45], camOffset: [3.0, 1.2, -1.8], desc: 'Sirip ekor tegak setinggi 4,81 m bercorak emas Elang Emas Skadron Udara 15 dengan nomor registrasi TT-5005.' },
      { id: 10, name: 'Roda Pendarat & Pintu Bay Kuning', partType: 'Eksterior', pos: [1.05, 0.45, -1.1], camOffset: [2.6, 0.3, 2.2], desc: 'Roda pendarat tiga titik hidraulik dengan pintu kompartemen kuning yang otomatis menutup rapat setelah lepas landas.' },
    ],
  },
  {
    id: 'kt1b',
    name: 'KAI KT-1B Wong Bee (JAT)',
    code: 'Jupiter Aerobatic Team',
    origin: 'Korea Selatan',
    tailNumber: 'LD-0110',
    category: 'Latih',
    squadron: 'Skadik 102 & Jupiter Aerobatic Team (Lanud Adisutjipto, Yogyakarta)',
    role: 'Pesawat latih dasar modern bermesin turboprop PT6A-62 sekaligus tunggangan kebanggaan tim aerobatik TNI AU "The Jupiters" (Jupiter Aerobatic Team) berlivery Merah-Putih dengan spinner putih.',
    specs: {
      maxSpeed: '574 km/jam',
      range: '1.333 km',
      ceiling: '38.000 kaki (11.580 m)',
      armament: 'Tanpa senjata • 2 kru tandem',
    },
    history: {
      operational:
        'Dioperasikan oleh Skadron Pendidikan 102 (102nd Training Squadron) di Lanud Adisutjipto, Yogyakarta (17 pesawat sejak 2003–2008). Tim aerobatik "The Jupiters" menggunakan KT-1B Merah-Putih dan telah membanggakan Indonesia dengan tampil di 5 negara Asia Tenggara.',
      tactical:
        'Mesin turboprop berperforma tinggi Pratt & Whitney PT6A-62, kokpit tandem modern dengan kursi lontar Martin-Baker, serta stabilitas aerobatik tinggi untuk melatih dasar terbang, formasi rapat, hingga manuver kelas dunia.',
      missions: [
        'Pendidikan penerbang dasar Skadik 102',
        'Demonstrasi udara Jupiter Aerobatic Team',
        'Diplomasi dirgantara di 5 negara Asia Tenggara',
        'Latihan terbang formasi & manuver aerobatik',
      ],
    },
    hotspots: [
      { id: 1, name: 'Baling-baling 4 Bilah & Spinner Putih', partType: 'Aerodinamika', pos: [0, 1.48, 6.55], camOffset: [2.6, 0.8, 3.0], desc: 'Baling-baling Hartzell 4 bilah berkecepatan konstan dengan spinner putih bersih ciri khas Jupiter Aerobatic Team.' },
      { id: 2, name: 'Inti Mesin Turboprop PT6A-62', partType: 'Sistem Internal', pos: [0, 1.5, 4.85], camOffset: [2.8, 1.0, 2.6], desc: 'Mesin turboprop Pratt & Whitney Canada PT6A-62 (950 shp) berkinerja tinggi dengan kecepatan maksimum 574 km/jam.' },
      { id: 3, name: 'Knalpot Ganda Mesin Turbin', partType: 'Eksterior', pos: [0.46, 1.54, 4.95], camOffset: [2.4, 0.8, 2.4], desc: 'Dua saluran gas buang samping kiri-kanan di depan kokpit yang menyalurkan gas panas sisa pembakaran turbin.' },
      { id: 4, name: 'Kokpit Tandem & Kursi Lontar', partType: 'Sistem Internal', pos: [0, 2.48, 2.3], camOffset: [2.6, 1.7, 2.4], desc: 'Kanopi gelembung lebar dengan dua kursi lontar tandem untuk siswa/pilot depan dan instruktur/wingman di belakang hingga 38.000 kaki.' },
      { id: 5, name: 'Rangka Fuselage & Tangki Internal', partType: 'Sistem Internal', pos: [0, 1.54, -0.8], camOffset: [3.0, 1.4, 1.8], desc: 'Struktur rangka badan ringan dan tangki bahan bakar berdaya jelajah 1.333 km yang kuat menahan manuver aerobatik +7G/-3,5G.' },
      { id: 6, name: 'Sayap Lurus Merah & Aileron', partType: 'Aerodinamika', pos: [4.35, 1.38, 0.55], camOffset: [2.8, 2.6, 2.4], desc: 'Sayap rendah lurus dengan dihedral dan aileron responsif untuk manuver roll cepat, loop, serta terbang formasi rapat.' },
      { id: 7, name: 'Livery "THE JUPITERS" & Roundel', partType: 'Eksterior', pos: [0.52, 1.38, 3.1], camOffset: [2.8, 0.8, 2.2], desc: 'Identitas Merah-Putih kebanggaan bangsa Indonesia yang telah mengharumkan nama TNI AU di berbagai airshow 5 negara Asia Tenggara.' },
      { id: 8, name: 'Ekor Tegak Merah-Putih (Rudder)', partType: 'Aerodinamika', pos: [0, 3.05, -5.5], camOffset: [2.8, 1.2, -1.8], desc: 'Sirip ekor merah ber-strip putih lengkap dengan bendera Merah-Putih untuk mengendalikan arah yaw saat manuver stall turn.' },
      { id: 9, name: 'Generator Asap Aerobatik Ekor', partType: 'Eksterior', pos: [0, 1.45, -6.25], camOffset: [2.8, 1.2, -3.2], desc: 'Sistem penyemprot oli asap di ekor untuk melukis jejak asap putih dramatis di langit saat pertunjukan Jupiter Aerobatic Team.' },
      { id: 10, name: 'Roda Pendarat Retractable', partType: 'Eksterior', pos: [1.55, 0.42, 0.65], camOffset: [2.6, 0.3, 2.2], desc: 'Roda pendarat tiga titik hidraulik yang terlipat masuk ke dalam sayap segera setelah lepas landas.' },
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
      { id: 1, name: 'Rotor Utama 5 Bilah Komposit', partType: 'Aerodinamika', pos: [0, 3.35, 0.4], camOffset: [3.6, 2.4, 3.0], desc: 'Lima bilah rotor utama berbahan komposit dengan sistem peredam getaran dan anti-es yang menghasilkan daya angkat vertikal & manuver.' },
      { id: 2, name: 'Transmisi Utama (Main Gearbox)', partType: 'Sistem Internal', pos: [0, 2.58, 0.4], camOffset: [2.8, 1.6, 2.4], desc: 'Kotak roda gigi transmisi berat yang meneruskan tenaga dari dua mesin turboshaft ke poros rotor utama dan poros rotor ekor.' },
      { id: 3, name: 'Mesin Ganda Safran Makila 2A1', partType: 'Sistem Internal', pos: [0.55, 2.65, -0.9], camOffset: [2.8, 1.8, 2.2], desc: 'Dua mesin turboshaft Safran Makila 2A1 (±2.400 shp) berkendali digital FADEC; bila satu mesin mati, helikopter tetap terbang aman.' },
      { id: 4, name: 'Kokpit Digital & Autopilot 4 Sumbu', partType: 'Sistem Internal', pos: [0, 2.05, 4.15], camOffset: [2.6, 1.1, 2.8], desc: 'Kokpit kaca digital dengan autopilot 4 sumbu yang mampu menjaga posisi melayang (auto-hover) otomatis di atas laut saat misi SAR.' },
      { id: 5, name: 'Kamera FLIR & Probe BBM Udara', partType: 'Eksterior', pos: [0.55, 0.92, 4.95], camOffset: [2.6, 0.5, 2.8], desc: 'Kamera inframerah FLIR di bawah hidung untuk mencari korban di malam hari serta probe pengisian bahan bakar di udara jarak jauh.' },
      { id: 6, name: 'Kabin Pasukan & Kursi Evakuasi', partType: 'Sistem Internal', pos: [0, 1.45, 0.6], camOffset: [3.4, 1.0, 2.0], desc: 'Kabin luas berpintu geser kiri-kanan untuk 28 prajurit bersenjata lengkap atau 11 tandu pasien evakuasi medis udara.' },
      { id: 7, name: 'Sponson & Roda Pendarat Retractable', partType: 'Eksterior', pos: [1.1, 0.65, -0.6], camOffset: [2.8, 0.4, 2.4], desc: 'Sponson samping tempat menyimpan tangki bahan bakar serta roda pendarat utama yang masuk ke dalam sponson saat terbang jelajah.' },
      { id: 8, name: 'Tail Boom & Poros Penggerak Ekor', partType: 'Sistem Internal', pos: [0, 1.95, -4.4], camOffset: [3.2, 1.2, -1.4], desc: 'Batang ekor panjang yang di dalamnya terdapat poros transmisi berputar cepat untuk menggerakkan rotor ekor.' },
      { id: 9, name: 'Stabilizer Horizontal Ekor', partType: 'Aerodinamika', pos: [-0.85, 2.04, -6.55], camOffset: [-2.8, 1.2, -2.0], desc: 'Sayap kecil asimetris di sisi kiri batang ekor khas keluarga Super Puma/Caracal yang menjaga keseimbangan anggukan (pitch) saat terbang melaju kencang.' },
      { id: 10, name: 'Rotor Ekor 4 Bilah (Anti-Torsi)', partType: 'Aerodinamika', pos: [0.38, 3.05, -7.25], camOffset: [3.0, 1.2, -1.6], desc: 'Rotor ekor 4 bilah yang melawan gaya puntir (torsi) rotor utama agar badan helikopter tidak ikut berputar serta mengatur arah haluan.' },
    ],
  },
  {
    id: 'colibri',
    name: 'EC120B Colibri',
    code: 'Airbus / Eurocopter EC120B',
    origin: 'Prancis-Eropa',
    tailNumber: 'HL-1211',
    category: 'Helikopter',
    squadron: 'Skadron Udara 7 (Lanud Suryadarma, Kalijati) & Dynamic Pegasus',
    role: 'Helikopter latih dasar dan angkut ringan bermesin turbin tunggal yang sangat lincah dan senyap. Digunakan untuk mencetak penerbang helikopter TNI AU serta tampil memukau sebagai armada Tim Aerobatik Helikopter Dynamic Pegasus.',
    specs: {
      maxSpeed: '±278 km/jam',
      range: '±710 km',
      ceiling: '5.180 m',
      armament: '5 kursi (1-2 pilot + 3-4 penumpang) • Multiperan Latih & Aerobatik',
    },
    history: {
      operational:
        'Skadron Udara 7 di Lanud Suryadarma, Kalijati, Subang mengoperasikan helikopter EC120B Colibri sebagai helikopter latih utama penerbang helikopter TNI AU. Keandalan dan kelincahannya juga menjadikannya bintang dalam Tim Aerobatik Helikopter "Dynamic Pegasus" TNI AU.',
      tactical:
        'Mengusung teknologi rotor ekor tertutup Fenestron yang jauh lebih senyap dan aman bagi kru darat, kokpit kaca panoramik berpandangan luas, serta sistem instrumen digital VEMD yang memudahkan siswa penerbang memantau performa mesin Turbomeca Arrius 2F secara real-time.',
      missions: ['Pendidikan & Latihan Dasar Penerbang Helikopter', 'Atraksi Tim Aerobatik Dynamic Pegasus', 'Observasi & Pengintaian Ringan', 'Transportasi VIP & Penghubung'],
    },
    hotspots: [
      { id: 1, name: 'Rotor Utama 3 Bilah Spheriflex', partType: 'Aerodinamika', pos: [0, 3.25, 0.72], camOffset: [3.4, 2.2, 2.8], desc: 'Tiga bilah rotor utama berbahan komposit dengan hub Spheriflex bebas pelumas yang lincah, responsif untuk manuver aerobatik, dan minim getaran.' },
      { id: 2, name: 'Rotor Ekor Tertutup Fenestron (8 Bilah)', partType: 'Aerodinamika', pos: [0.35, 2.02, -6.05], camOffset: [3.0, 1.0, -1.6], desc: 'Kipas ekor 8 bilah tertutup di dalam cincin sirip tegak (Fenestron) khas EC120B Colibri yang sangat senyap, terlindungi dari benturan ranting, dan aman bagi teknisi di darat.' },
      { id: 3, name: 'Kokpit Gelembung Panoramik', partType: 'Eksterior', pos: [0, 1.88, 2.95], camOffset: [2.6, 1.0, 2.8], desc: 'Kaca kokpit panoramik super luas yang memberi jarak pandang nyaris tanpa batas bagi instruktur dan siswa penerbang saat berlatih hover maupun mendarat di ruang sempit.' },
      { id: 4, name: 'Mesin Turbin Turbomeca Arrius 2F', partType: 'Sistem Internal', pos: [0, 2.52, 0.05], camOffset: [2.8, 1.6, 2.2], desc: 'Mesin turboshaft tunggal Turbomeca Arrius 2F bertenaga ±504 shp yang irit bahan bakar, andal, dan dilengkapi sistem pemantauan digital VEMD.' },
      { id: 5, name: 'Kabin 5 Kursi & Kontrol Ganda', partType: 'Sistem Internal', pos: [0.65, 1.58, 1.55], camOffset: [2.8, 0.8, 2.2], desc: 'Kabin ergonomis berkapasitas 5 orang dengan tuas kendali ganda (cyclic, collective, pedal) untuk pelatihan intensif siswa penerbang helikopter TNI AU.' },
      { id: 6, name: 'Skid Pendarat Tubular & Pijakan', partType: 'Eksterior', pos: [1.18, 0.35, 1.35], camOffset: [2.8, 0.5, 2.4], desc: 'Kaki skid tubular aluminium ringan dengan peredam kejut yang kokoh untuk latihan pendaratan berulang (autorotation) di landasan rumput maupun beton.' },
      { id: 7, name: 'Pipa Knalpot Turbin Belakang', partType: 'Sistem Internal', pos: [0, 2.42, -1.12], camOffset: [2.6, 1.4, -1.8], desc: 'Saluran pembuangan gas panas mesin Arrius 2F di bagian atas belakang fairing mesin yang diarahkan menjauh dari batang ekor.' },
      { id: 8, name: 'Tail Boom Komposit Ramping', partType: 'Eksterior', pos: [0, 1.84, -3.25], camOffset: [3.0, 1.0, -1.2], desc: 'Batang ekor komposit ringan bertuliskan TNI AU yang menyalurkan poros penggerak ke kipas Fenestron dengan hambatan udara sangat rendah.' },
      { id: 9, name: 'Stabilizer Horizontal & Endplate', partType: 'Aerodinamika', pos: [1.22, 1.94, -4.46], camOffset: [2.8, 1.0, -1.8], desc: 'Sayap penyeimbang horizontal simetris dengan sirip ujung (endplate) yang menjaga kestabilan helikopter saat melaju pada kecepatan jelajah tinggi.' },
      { id: 10, name: 'Sirip Tegak & Bendera Merah Putih', partType: 'Aerodinamika', pos: [0.15, 3.05, -6.28], camOffset: [2.8, 1.2, -1.8], desc: 'Sirip tegak aerodinamis di atas Fenestron yang membantu stabilitas arah saat terbang cepat sekaligus menampilkan identitas Bendera Merah Putih TNI AU.' },
    ],
  },
  {
    id: 'gsuit',
    name: 'G-Suit & Baju Terbang Tempur',
    code: 'CSU-13B/P • Nomex • PCU-15/P • LPU-9/P',
    origin: 'Standar Penerbang Tempur TNI AU',
    tailNumber: 'ANTI-9G',
    category: 'G-Suit & Pilot',
    squadron: 'Penerbang Tempur Skadron Udara TNI AU (F-16, Su-27/30, Rafale, T-50i)',
    role: 'Set baju terbang tahan api Nomex, Anti-G Suit CSU-13B/P dengan 5 kantung udara pneumatik, rompi pelampung/survival LPU-9/P, serta harness kursi lontar PCU-15/P. Melindungi pilot dari gaya gravitasi hingga 9G (mencegah G-LOC / pingsan), api kokpit, dan skenario ejeksi darurat.',
    specs: {
      maxSpeed: 'Toleransi Manuver hingga +9G',
      range: '5 Kantung Udara (Perut, 2 Paha, 2 Betis)',
      ceiling: 'Tekanan Pneumatik Otomatis (Katup G-Valve)',
      armament: 'Nomex Anti-Api • Harness PCU-15/P • Rompi LPU-9/P',
    },
    history: {
      operational:
        'Setiap penerbang jet tempur TNI AU wajib mengenakan baju terbang anti-api Nomex yang dibalut Anti-G Suit CSU-13B/P, harness kursi lontar PCU-15/P, serta rompi survival LPU-9/P sebelum memasuki kokpit F-16, Sukhoi Su-27/30, Rafale, T-50i, maupun Hawk 209.',
      tactical:
        'Saat jet berbelok tajam hingga 9 kali gaya gravitasi (9G), katup Anti-G di pesawat langsung memompa udara bertekanan melalui selang pinggul ke 5 kantung udara di perut, paha, dan betis dalam hitungan milidetik. Tekanan serentak ini menahan darah agar tetap mengalir ke otak sehingga pilot tidak mengalami blackout.',
      missions: ['Proteksi Manuver Ekstrem 9G (Anti G-LOC)', 'Perlindungan Panas & Api Kokpit (Nomex)', 'Pengikatan Parasut Kursi Lontar', 'Kelengkapan Survival Darat & Laut'],
    },
    hotspots: [
      { id: 1, name: 'Flight Suit (FRW-2 Nomex Anti-Api)', partType: 'Eksterior', pos: [1.75, 8.15, 0.35], camOffset: [2.8, 0.4, 2.8], desc: 'Seragam penerbang FRW-2 berbahan serat Aramid/Nomex hijau zaitun tahan panas ekstrem yang tidak meleleh saat terkena api kokpit, lengkap dengan patch Merah Putih, Roundel TNI AU, dan sarung tangan Nomex.' },
      { id: 2, name: 'Pelampung Dada LPU & Harness Kursi Lontar', partType: 'Eksterior', pos: [0.68, 8.62, 0.92], camOffset: [2.4, 0.3, 2.8], desc: 'Sepasang lobus pelampung darurat LPU abu-hijau di dada atas yang langsung mengembang di air, dipadukan harness kursi lontar dengan pengait cepat logam Koch di kedua bahu.' },
      { id: 3, name: 'Survival Vest Multi-Pouch (MOLLE)', partType: 'Sistem Internal', pos: [0, 7.35, 1.05], camOffset: [2.4, 0.2, 2.9], desc: 'Rompi survival taktis dengan deretan kantong MOLLE berisi radio darurat PRC-112, amunisi suar, perlengkapan P3K, kompas, dan alat komunikasi penyelamatan SAR.' },
      { id: 4, name: 'Kantung Udara Perut (Abdominal G-Bladder)', partType: 'Sistem Internal', pos: [-0.55, 6.72, 0.88], camOffset: [-2.4, 0.3, 2.8], desc: 'Kantung udara pneumatik utama di perut yang mengembang otomatis saat manuver G tinggi untuk menekan diafragma agar darah tidak turun meninggalkan otak.' },
      { id: 5, name: 'Selang Pneumatik Katup Anti-G', partType: 'Sistem Internal', pos: [-1.45, 4.85, 0.32], camOffset: [-2.8, 0.2, 2.7], desc: 'Selang udara bertekanan di sisi kiri yang tersambung ke katup G-Valve kokpit, mengalirkan tekanan udara otomatis ke seluruh kantung G-Suit seiring naiknya gaya G hingga 9G.' },
      { id: 6, name: 'Flight Computer & GPS (Tablet EFB)', partType: 'Sistem Internal', pos: [-0.82, 5.18, 0.88], camOffset: [-2.4, 0.2, 2.8], desc: 'Komputer penerbangan & peta GPS digital tahan banting (Electronic Flight Bag) yang diikat di paha kiri untuk navigasi waypoint, checklist misi, dan telemetri penerbangan.' },
      { id: 7, name: 'Survival Kit & Pemancar Darurat', partType: 'Eksterior', pos: [1.45, 5.32, 0.32], camOffset: [2.8, 0.2, 2.7], desc: 'Paket survival di pinggul/paha kanan berisi pemancar sinyal darurat oranye (PLB), pisau taktis, karabiner, dan perlengkapan bertahan hidup jika pilot ejeksi di hutan atau laut.' },
      { id: 8, name: 'Pelindung Lutut Taktis (Knee Pads)', partType: 'Eksterior', pos: [0.80, 4.02, 0.68], camOffset: [2.5, 0.2, 2.8], desc: 'Cangkang pelindung lutut ergonomis tahan benturan yang melindungi sendi lutut pilot saat melakukan manuver darurat, ejeksi dari kokpit, maupun pendaratan dengan parasut.' },
      { id: 9, name: 'Kantung Udara Betis (Calf G-Bladders)', partType: 'Sistem Internal', pos: [-0.86, 2.75, 0.62], camOffset: [-2.6, 0.2, 2.8], desc: 'Kantung kompresi udara di kedua betis yang bekerja serentak bersama paha dan perut mendorong aliran darah vena kembali naik ke jantung saat belokan tajam 6G–9G.' },
      { id: 10, name: 'Modern Combat Flight Boots', partType: 'Eksterior', pos: [0.92, 0.85, 0.82], camOffset: [2.6, 0.5, 2.8], desc: 'Sepatu bot penerbang tempur modern berwarna olive-tan bersol karet anti-slip tebal untuk pijakan mantap di pedal rudder dan perlindungan pergelangan kaki saat ejeksi.' },
    ],
  },
  {
    id: 'pilot-helmet',
    name: 'Helm Pilot Tempur (HGU-55/P HMDS)',
    code: 'HGU-55/P • JHMCS / HMDS • MBU-20/P',
    origin: 'Standar Penerbang Tempur TNI AU',
    tailNumber: 'HMDS-3D',
    category: 'G-Suit & Pilot',
    squadron: 'Penerbang Tempur Skadron Udara TNI AU (F-16, Su-27/30, Rafale, T-50i)',
    role: 'Helm tempur komposit ringan berteknologi Helmet-Mounted Display System (HMDS) yang terintegrasi dengan visor proyeksi HUD, headset peredam bising aktif (ANR), dan masker oksigen bertekanan MBU-20/P dengan selang OBOGS.',
    specs: {
      maxSpeed: 'Proteksi Angin Ejeksi > 600 knots',
      range: 'Visor Ganda (Gelap Anti-Silau + Bening)',
      ceiling: 'Masker Oksigen Tekanan Positif hingga 50.000 ft',
      armament: 'JHMCS/HMDS Target Cueing • NVG Mount • ANR Intercom',
    },
    history: {
      operational:
        'Helm HGU-55/P yang dikombinasikan dengan masker oksigen MBU-20/P dan sistem bidik helm JHMCS/HMDS adalah perangkat vital penerbang tempur modern TNI AU. Bobotnya dirancang seminimal mungkin agar leher pilot tidak cedera saat menahan beban 9G (di mana berat helm terasa 9 kali lipat).',
      tactical:
        'Dengan teknologi HMDS, data penerbangan (kecepatan, ketinggian, sudut serang) serta lingkaran kunci rudal diproyeksikan langsung ke visor. Pilot cukup menoleh melihat pesawat musuh di samping untuk mengunci rudal jarak dekat (off-boresight) tanpa harus memutar moncong pesawat terlebih dahulu.',
      missions: ['Proyeksi Bidikan Rudal di Visor (HMDS)', 'Suplai Oksigen Ketinggian Tinggi (OBOGS)', 'Komunikasi Radio Jernih Anti-Bising', 'Proteksi Kepala Saat Ejeksi Supersonik'],
    },
    hotspots: [
      { id: 1, name: 'Cangkang Komposit Karbon-Kevlar (HGU-55/P)', partType: 'Eksterior', pos: [0, 6.45, -0.25], camOffset: [2.8, 1.0, 3.2], desc: 'Cangkang luar berlapis serat karbon & Kevlar yang sangat kuat namun ultra-ringan (±1 kg), melindungi kepala dari benturan kanopi dan mengurangi beban leher pilot saat manuver 9G.' },
      { id: 2, name: 'Quad-Tube NVG (Night Vision Goggles)', partType: 'Sistem Internal', pos: [0, 5.95, 2.55], camOffset: [2.4, 0.8, 3.4], desc: 'Kacamata penglihatan malam panoramik 4 tabung (GPNVG) berlensa hijau zamrud di dahi helm yang memperluas sudut pandang malam pilot hingga 97° untuk operasi tempur gelap total.' },
      { id: 3, name: 'Rel & Kenop Pengunci Visor Ganda', partType: 'Eksterior', pos: [0, 6.52, 0.92], camOffset: [2.4, 1.2, 3.0], desc: 'Mekanisme rel geser satu tangan di puncak rumah visor agar pilot bisa cepat menurunkan visor gelap saat menghadap matahari atau menaikkan visor saat terbang malam.' },
      { id: 4, name: 'Visor Gelap Anti-Silau & Proyeksi HUD', partType: 'Sistem Internal', pos: [0, 4.92, 2.25], camOffset: [2.2, 0.4, 3.2], desc: 'Visor polikarbonat berlapis filter UV/laser yang melindungi mata dari silau matahari di ketinggian 40.000 kaki sekaligus menjadi layar proyeksi bidikan rudal & telemetri HUD.' },
      { id: 5, name: 'Visor Bening Pelindung Ejeksi', partType: 'Eksterior', pos: [0.85, 4.68, 1.95], camOffset: [2.5, 0.3, 3.0], desc: 'Lapisan visor bening di balik visor gelap yang digunakan saat misi malam hari dan melindungi wajah dari terpaan angin supersonik (>1.000 km/jam) bila kursi lontar diaktifkan.' },
      { id: 6, name: 'Earcup Komunikasi Peredam Bising (ANR)', partType: 'Sistem Internal', pos: [2.15, 4.02, -0.06], camOffset: [3.4, 0.4, 2.2], desc: 'Headset internal berteknologi Active Noise Reduction yang meredam deru mesin jet tempur agar komunikasi radio dengan menara, AWACS, dan sesama pesawat terdengar jernih.' },
      { id: 7, name: 'Pengunci Bayonet Masker Oksigen', partType: 'Eksterior', pos: [-1.72, 3.68, 1.28], camOffset: [-2.8, 0.3, 2.6], desc: 'Pengait logam cepat (bayonet receiver) di kedua sisi pipi helm yang mengunci masker oksigen agar tetap rapat menempel di wajah meski pesawat terguncang hebat.' },
      { id: 8, name: 'Masker Oksigen MBU-20/P & Mikrofon', partType: 'Sistem Internal', pos: [0, 3.22, 2.65], camOffset: [2.2, 0.1, 3.2], desc: 'Masker silikon berkontur rapat yang mengalirkan oksigen bertekanan positif (mencegah hipoksia) serta dilengkapi katup ekshalasi dan mikrofon dinamis peredam bising di dalamnya.' },
      { id: 9, name: 'Selang Oksigen Berulir & Konektor OBOGS', partType: 'Sistem Internal', pos: [0.88, 1.45, 1.85], camOffset: [2.8, 0.4, 2.8], desc: 'Selang fleksibel berulir 24 ruas anti-tertekuk dengan konektor cepat aluminium yang menyambungkan masker langsung ke sistem pembangkit oksigen pesawat (OBOGS).' },
      { id: 10, name: 'Sensor Pelacak Kepala & Kabel Interkom', partType: 'Sistem Internal', pos: [-1.62, 2.25, -0.95], camOffset: [-3.2, 0.4, 2.0], desc: 'Sensor magnetik pelacak arah pandangan pilot untuk sistem bidik HMDS serta kabel interkom spiral yang terhubung ke panel audio kokpit.' },
    ],
  },
];

export const getUnit = (id: string) => FLEET.find((u) => u.id === id) ?? FLEET[0];
