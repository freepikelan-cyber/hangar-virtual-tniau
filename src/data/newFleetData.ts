import type { AircraftUnit } from './fleetData';

/**
 * 16 Armada Tambahan TNI AU berdasarkan lembar referensi resmi:
 * Angkut & Tanker: A400M Atlas, CN-295, CN-235, C-212 Aviocar, Falcon 8X, A330 MRTT
 * Tempur: A-4E/TA-4H Skyhawk
 * Latih & Glider: Grob G-120TP, Cessna 182 Skylane, Beechcraft T-41 Mescalero, Schweizer SGS 2-33, DG-1000
 * Helikopter: AS332 Super Puma, AW101, Airbus H145, AS365 Dauphin
 */
export const NEW_FLEET: AircraftUnit[] = [
  {
    id: 'a400m',
    name: 'Airbus A400M Atlas',
    code: 'A400M-180',
    origin: 'Eropa (Airbus Defence & Space)',
    tailNumber: 'A-4001',
    category: 'Angkut & VIP',
    squadron: 'Skadron Udara 31 (Lanud Halim Perdanakusuma)',
    role: 'Pesawat angkut militer strategis bermesin 4 turboprop berdaya angkut hingga 37 ton kargo atau 116–132 personel. Mampu beroperasi dari landasan pendek/semi-permanen serta berperan sebagai tanker pengisian bahan bakar di udara.',
    specs: {
      maxSpeed: '±780 km/jam (Mach 0,72)',
      range: '±8.700 km (muatan 20 ton)',
      ceiling: '12.200 m',
      armament: 'Kargo 37 ton • 116–132 personel • Air Refueling',
    },
    history: {
      operational:
        'Airbus A400M Atlas memperkuat kapasitas angkut strategis jarak jauh TNI AU untuk operasi militer, pergeseran alutsista berat, dan misi bantuan kemanusiaan (HADR) ke seluruh kepulauan Indonesia.',
      tactical:
        'Ditenagai 4 mesin Europrop TP400-D6 (11.000 shp/mesin) dengan baling-baling 8 bilah melengkung dan ekor T-Tail tinggi, A400M menjembatani celah antara angkut taktis C-130 dan angkut strategis jet berat.',
      missions: ['Angkut Pasukan & Kendaraan Berat', 'Logistik Kargo 37 Ton', 'Evakuasi Medis (MEDEVAC)', 'Bantuan Kemanusiaan & Bencana (HADR)'],
    },
    hotspots: [
      { id: 1, name: 'Kokpit Kaca & HUD Ganda', partType: 'Sistem Internal', pos: [0, 2.25, 5.4], camOffset: [3.2, 1.2, 3.4], desc: 'Kokpit modern fly-by-wire dengan layar multifungsi dan HUD ganda untuk operasi siang-malam.' },
      { id: 2, name: '4 Mesin Europrop TP400-D6 (8 Bilah)', partType: 'Sistem Internal', pos: [2.4, 2.5, 1.6], camOffset: [3.6, 1.4, 3.0], desc: 'Empat mesin turboprop terkuat di kelasnya (11.000 shp per mesin) dengan bilah komposit 8 bilah ujung kuning.' },
      { id: 3, name: 'Ruang Kargo Berat 37 Ton', partType: 'Eksterior', pos: [0, 1.65, -0.5], camOffset: [4.2, 1.5, 2.2], desc: 'Kabin kargo lebar mampu mengangkut kendaraan taktis, helikopter ringan, atau hingga 132 prajurit.' },
      { id: 4, name: 'Ekor T-Tail Tinggi & Bendera RI', partType: 'Aerodinamika', pos: [0, 4.4, -5.8], camOffset: [3.6, 1.4, -2.0], desc: 'Desain T-Tail tinggi menjaga stabilitas dan membuka ruang bebas untuk ramp door kargo belakang.' },
      { id: 5, name: 'Roda Pendarat 12 Roda Sponson', partType: 'Eksterior', pos: [1.15, 0.5, -0.6], camOffset: [3.4, 0.5, 2.2], desc: 'Roda utama multi-bogie di sponson samping dirancang untuk mendarat di landasan tanah maupun rumput.' },
    ],
  },
  {
    id: 'cn295',
    name: 'Airbus CN-295',
    code: 'CN-295M (PT DI / Airbus)',
    origin: 'Spanyol / Indonesia (PT DI)',
    tailNumber: 'A-2901',
    category: 'Angkut & VIP',
    squadron: 'Skadron Udara 2 (Lanud Halim Perdanakusuma)',
    role: 'Pesawat angkut taktis kelas sedang bermesin turboprop ganda hasil kerja sama Airbus Defence & Space dan PT Dirgantara Indonesia. Andal untuk angkut pasukan, logistik, patroli maritim, dan evakuasi medis.',
    specs: {
      maxSpeed: '±480 km/jam (259 knot)',
      range: '±4.500 km',
      ceiling: '9.144 m (30.000 ft)',
      armament: '71 personel • ±9.250 kg kargo',
    },
    history: {
      operational:
        'CN-295 dioperasikan Skadron Udara 2 TNI AU dengan nomor registrasi A-2901 dan seterusnya, menjadi andalan operasi lintas udara, SAR, dan dukungan logistik antar-pulau.',
      tactical:
        'Menggunakan 2 mesin Pratt & Whitney PW127G (2.645 shp/mesin) dengan baling-baling 6 bilah, mampu lepas landas di landasan pendek (STOL) dan dilengkapi ramp door belakang.',
      missions: ['Angkut Personel (±71 orang)', 'Logistik & Kargo (±9,2 ton)', 'Evakuasi Medis (MEDEVAC)', 'Operasi SAR & Patroli'],
    },
    hotspots: [
      { id: 1, name: 'Radome Hidung & Kokpit Digital', partType: 'Sistem Internal', pos: [0, 1.75, 5.2], camOffset: [3.0, 1.1, 3.0], desc: 'Kokpit avionik terpadu dengan radar cuaca/maritim di balik radome hitam.' },
      { id: 2, name: '2 Mesin PW127G (6 Bilah)', partType: 'Sistem Internal', pos: [2.2, 2.35, 1.2], camOffset: [3.4, 1.3, 2.8], desc: 'Sepasang turboprop PW127G bertenaga 2.645 shp dengan 6 bilah komposit berujung kuning.' },
      { id: 3, name: 'Sayap Tinggi (High-Wing STOL)', partType: 'Aerodinamika', pos: [3.8, 2.45, 0.2], camOffset: [4.0, 1.8, 2.6], desc: 'Konfigurasi sayap tinggi memberi jarak aman baling-baling di landasan perintis.' },
      { id: 4, name: 'Ekor Tegak A-2901 & Aksen Kuning', partType: 'Eksterior', pos: [0, 3.8, -5.6], camOffset: [3.4, 1.2, -2.0], desc: 'Sirip tegak khas TNI AU dengan bendera Merah Putih, ujung kuning, dan registrasi A-2901.' },
      { id: 5, name: 'Sponson Roda Utama & Ramp Door', partType: 'Eksterior', pos: [1.05, 0.55, -0.4], camOffset: [3.2, 0.5, 2.2], desc: 'Roda pendarat utama tandem di sponson samping untuk pendaratan mulus di landasan pendek.' },
    ],
  },
  {
    id: 'cn235',
    name: 'CASA/IPTN CN-235',
    code: 'CN-235-220M',
    origin: 'Indonesia (PT DI) / Spanyol',
    tailNumber: 'A-2317',
    category: 'Angkut & VIP',
    squadron: 'Skadron Udara 2 & Skadron Udara 27',
    role: 'Pesawat angkut sedang serbaguna (multirole) kebanggaan kolaborasi IPTN/PT Dirgantara Indonesia dan CASA Spanyol. Digunakan TNI AU untuk angkut personel, kargo, SAR, patroli maritim, dan MEDEVAC.',
    specs: {
      maxSpeed: '±454 km/jam (245 knot)',
      range: '±5.000 km',
      ceiling: '7.620 m (25.000 ft)',
      armament: '±44 personel • ±6.000 kg kargo',
    },
    history: {
      operational:
        'CN-235 adalah simbol kemandirian dirgantara Indonesia yang telah teruji dalam ribuan jam terbang misi operasi militer, patroli maritim, dan bantuan kemanusiaan di seluruh Nusantara.',
      tactical:
        'Ditenagai 2 mesin General Electric CT7-9C3 (1.750 shp/mesin), tampil ikonik dengan livery putih, garis biru memanjang, dan ekor kuning cerah TNI AU.',
      missions: ['Angkut Personel (±44 orang)', 'Logistik (±6.000 kg)', 'Patroli Maritim & Pengawasan', 'SAR & Evakuasi Medis'],
    },
    hotspots: [
      { id: 1, name: 'Kokpit & Radome Cuaca', partType: 'Sistem Internal', pos: [0, 1.7, 4.9], camOffset: [3.0, 1.1, 3.0], desc: 'Kokpit 2–3 awak dengan visibilitas luas untuk operasi pendaratan jarak pendek.' },
      { id: 2, name: '2 Mesin GE CT7-9C3', partType: 'Sistem Internal', pos: [2.1, 2.3, 1.1], camOffset: [3.4, 1.2, 2.8], desc: 'Dua mesin turboprop General Electric CT7-9C3 berdaya 1.750 shp dengan 4 bilah baling-baling.' },
      { id: 3, name: 'Livery Putih-Biru & Roundel TNI AU', partType: 'Eksterior', pos: [0.95, 1.5, -0.8], camOffset: [3.6, 1.0, 2.0], desc: 'Identitas resmi TNI Angkatan Udara dengan garis biru dan roundel segilima merah-putih.' },
      { id: 4, name: 'Ekor Kuning A-2317 & Bendera RI', partType: 'Eksterior', pos: [0, 3.7, -5.2], camOffset: [3.2, 1.2, -2.0], desc: 'Sirip tegak berwarna kuning visibilitas tinggi dengan bendera Merah Putih dan kode A-2317.' },
      { id: 5, name: 'Sponson Roda Utama Ganda', partType: 'Eksterior', pos: [1.0, 0.55, -0.3], camOffset: [3.2, 0.5, 2.0], desc: 'Roda utama dalam fairing aerodinamis samping untuk operasi landasan pendek.' },
    ],
  },
  {
    id: 'c212',
    name: 'CASA C-212 Aviocar',
    code: 'NC-212i (PT DI / CASA)',
    origin: 'Spanyol / Indonesia (PT DI)',
    tailNumber: 'A-2105',
    category: 'Angkut & VIP',
    squadron: 'Skadron Udara 4 (Lanud Abdulrachman Saleh)',
    role: 'Pesawat angkut ringan bermesin turboprop ganda yang sangat andal, ekonomis, dan serbaguna. Andalan TNI AU untuk angkut ringan, hujan buatan (TMC), foto udara, SAR, dan operasi perintis.',
    specs: {
      maxSpeed: '±370 km/jam (200 knot)',
      range: '±2.440 km',
      ceiling: '7.620 m (25.000 ft)',
      armament: '18–24 penumpang • ±2.720 kg kargo',
    },
    history: {
      operational:
        'Diproduksi pula secara lisensi oleh PT Dirgantara Indonesia (NC-212), pesawat ini menjadi tulang punggung Skadron Udara 4 Malang untuk dukungan logistik ringan dan teknologi modifikasi cuaca.',
      tactical:
        'Badan berkotak efisien memaksimalkan volume kabin, roda pendarat tetap yang kokoh, dan 2 mesin Garrett TPE331-10R (900 shp/mesin) memungkinkannya mendarat di landasan perintis pegunungan.',
      missions: ['Angkut Personel & Logistik Ringan', 'Teknologi Modifikasi Cuaca (TMC)', 'SAR & Evakuasi Medis', 'Dukungan Operasi Wilayah Terpencil'],
    },
    hotspots: [
      { id: 1, name: 'Hidung Radome & Kokpit C-212', partType: 'Sistem Internal', pos: [0, 1.65, 4.4], camOffset: [2.8, 1.0, 2.8], desc: 'Kokpit lapang dengan jendela besar untuk operasi visual di lembah dan pegunungan.' },
      { id: 2, name: '2 Mesin Garrett TPE331-10R', partType: 'Sistem Internal', pos: [2.0, 2.25, 1.0], camOffset: [3.2, 1.2, 2.6], desc: 'Sepasang mesin turboprop 900 shp dengan baling-baling 4 bilah yang responsif dan irit.' },
      { id: 3, name: 'Kabin Multiguna & Ramp Door', partType: 'Eksterior', pos: [0.85, 1.45, -0.6], camOffset: [3.4, 1.0, 2.0], desc: 'Kabin kotak berkapasitas 18–24 personel atau 2,7 ton kargo dengan pintu belakang.' },
      { id: 4, name: 'Ekor Tegak A-2105 & Strip Kuning', partType: 'Eksterior', pos: [0, 3.6, -4.8], camOffset: [3.2, 1.2, -1.8], desc: 'Sirip ekor abu-abu muda dengan strip kuning di rudder, bendera Merah Putih, dan A-2105.' },
      { id: 5, name: 'Roda Pendarat Tetap Kokoh', partType: 'Eksterior', pos: [1.0, 0.5, -0.3], camOffset: [3.0, 0.5, 2.0], desc: 'Roda pendarat tetap minim perawatan yang tangguh untuk landasan tanah maupun aspal.' },
    ],
  },
  {
    id: 'falcon8x',
    name: 'Dassault Falcon 8X',
    code: 'Falcon 8X VIP Tri-Jet',
    origin: 'Prancis (Dassault Aviation)',
    tailNumber: 'A-0805',
    category: 'Angkut & VIP',
    squadron: 'Skadron Udara 17 (Lanud Halim Perdanakusuma)',
    role: 'Pesawat jet eksekutif jarak jauh (ultra-long-range tri-jet) TNI AU untuk tugas kenegaraan, komando strategis, dan pengangkutan pejabat tinggi VIP/VVIP lintas benua.',
    specs: {
      maxSpeed: 'Mach 0,90 (±1.100 km/jam)',
      range: '±11.945 km (6.450 NM)',
      ceiling: '15.545 m (51.000 ft)',
      armament: 'Kabin VIP 14–16 penumpang • 3 Mesin PW307D',
    },
    history: {
      operational:
        'Dioperasikan Skadron Udara 17 VIP TNI AU dengan livery abu-abu muda perak berstrip merah elegan, mendukung mobilitas cepat pimpinan TNI dan kenegaraan hingga antar-benua tanpa transit.',
      tactical:
        'Konfigurasi unik 3 mesin turbofan Pratt & Whitney PW307D di ekor (S-duct tengah + 2 samping) memberi keselamatan ekstra di atas samudra serta kemampuan mendarat di bandara berlandasan pendek.',
      missions: ['Penerbangan VIP / VVIP Kenegaraan', 'Komando & Pengendalian Jarak Jauh', 'Misi Diplomatik Lintas Benua', 'Dukungan Pejabat Strategis TNI AU'],
    },
    hotspots: [
      { id: 1, name: 'Kokpit Digital EASy III', partType: 'Sistem Internal', pos: [0, 1.65, 5.2], camOffset: [3.0, 1.0, 3.0], desc: 'Kokpit canggih dengan sistem penglihatan kombinasi FalconEye HUD untuk cuaca buruk.' },
      { id: 2, name: 'Kabin VIP 14–16 Penumpang', partType: 'Eksterior', pos: [0.72, 1.6, 0.8], camOffset: [3.6, 1.0, 2.2], desc: 'Kabin ultra-senyap dengan strip merah TNI AU dan jendela oval berjajar.' },
      { id: 3, name: '3 Mesin Turbofan PW307D (Tri-Jet)', partType: 'Sistem Internal', pos: [0.95, 1.85, -4.1], camOffset: [3.2, 1.3, -2.2], desc: 'Tiga mesin di ekor (kiri, kanan, dan saluran S-duct tengah) untuk keandalan antar-benua.' },
      { id: 4, name: 'Sayap Sapu & Winglet Melengkung', partType: 'Aerodinamika', pos: [4.8, 1.25, -1.6], camOffset: [3.8, 1.6, 2.4], desc: 'Sayap ultra-efisien dengan winglet tinggi untuk jangkauan hingga 11.945 km.' },
      { id: 5, name: 'Ekor Tegak A-0805 & Bendera RI', partType: 'Eksterior', pos: [0, 3.6, -5.6], camOffset: [3.2, 1.2, -2.0], desc: 'Sirip ekor dengan bendera Merah Putih dan nomor registrasi VIP A-0805.' },
    ],
  },
  {
    id: 'a330mrtt',
    name: 'Airbus A330 MRTT',
    code: 'Multi-Role Tanker Transport',
    origin: 'Eropa (Airbus Defence & Space)',
    tailNumber: 'A-3301',
    category: 'Angkut & VIP',
    squadron: 'Skadron Angkut Strategis & Tanker TNI AU',
    role: 'Pesawat tanker pengisian bahan bakar di udara (air-to-air refueling) sekaligus angkut strategis berbadan lebar. Mampu mengangkut 111 ton bahan bakar atau 280 personel lintas benua.',
    specs: {
      maxSpeed: '±913 km/jam (Mach 0,86)',
      range: '±14.800 km',
      ceiling: '12.600 m',
      armament: '111.000 L BBM Tanker • 280 personel / 45 ton kargo',
    },
    history: {
      operational:
        'A330 MRTT merupakan standar global pesawat tanker modern yang menggandakan jangkauan operasi jet tempur seperti F-16, Su-30MK2, dan Rafale F4 di seluruh wilayah udara nasional.',
      tactical:
        'Ditenagai 2 turbofan besar Rolls-Royce Trent 700, dilengkapi boom pengisian BBM ekor (ARBS) dan pod selang drogue di bawah kedua sayap untuk kompatibilitas semua jenis jet tempur.',
      missions: ['Air-to-Air Refueling (Boom & Drogue)', 'Angkut Pasukan Strategis (±280 personel)', 'Kargo Strategis (±45 ton)', 'Evakuasi Medis Skala Besar'],
    },
    hotspots: [
      { id: 1, name: 'Kokpit & Stasiun Operator Tanker', partType: 'Sistem Internal', pos: [0, 1.9, 5.8], camOffset: [3.2, 1.1, 3.2], desc: 'Dilengkapi konsol operator refueling 3D digital untuk memandu boom pengisian BBM secara presisi.' },
      { id: 2, name: '2 Mesin Rolls-Royce Trent 700', partType: 'Sistem Internal', pos: [2.2, 1.0, 0.8], camOffset: [3.6, 1.0, 2.8], desc: 'Sepasang mesin turbofan berdaya dorong 72.000 lbf masing-masing.' },
      { id: 3, name: 'Pod Refueling Drogue Sayap', partType: 'Eksterior', pos: [4.6, 1.35, -1.2], camOffset: [3.8, 1.5, 2.2], desc: 'Pod selang pengisian BBM di bawah sayap untuk mengisi jet tempur sistem probe-and-drogue.' },
      { id: 4, name: 'Boom Pengisian BBM Ekor (ARBS)', partType: 'Eksterior', pos: [0, 1.45, -6.2], camOffset: [3.2, 1.0, -2.6], desc: 'Lengan boom teleskopik berkecepatan alir tinggi di bawah ekor pesawat.' },
      { id: 5, name: 'Ekor Abu-Abu A-3301 & Bendera RI', partType: 'Eksterior', pos: [0, 3.9, -5.8], camOffset: [3.4, 1.2, -2.2], desc: 'Livery abu-abu militer strategis TNI Angkatan Udara dengan registrasi A-3301.' },
    ],
  },
  {
    id: 'a4skyhawk',
    name: 'A-4E / TA-4H Skyhawk',
    code: 'Skyhawk TNI AU (Legendaris)',
    origin: 'Amerika Serikat (Douglas Aircraft)',
    tailNumber: 'TT-0440',
    category: 'Tempur',
    squadron: 'Skadron Udara 11 & Skadron Udara 12 (Historis TNI AU)',
    role: 'Pesawat tempur serang darat ringan (light attack) bersayap delta yang legendaris dalam sejarah TNI AU sejak era 1980-an. Lincah, tangguh, dan mampu membawa muatan bom besar dibanding ukurannya.',
    specs: {
      maxSpeed: '±1.083 km/jam (Mach 0,88)',
      range: '±3.300 km (tangki eksternal)',
      ceiling: '12.800 m (42.000 ft)',
      armament: '2× Kanon 20 mm • Bom Mk-82/83 • Roket 70 mm',
    },
    history: {
      operational:
        'A-4E dan TA-4H Skyhawk dioperasikan TNI AU selama lebih dari dua dekade di Skadron Udara 11 (Makassar) dan Skadron Udara 12 (Pekanbaru), melahirkan banyak penerbang tempur senior terbaik TNI AU.',
      tactical:
        'Berjuluk "Scooter" karena gesit, memiliki sayap delta rendah kompak tanpa perlu dilipat, probe pengisian BBM di sisi kanan hidung, dan intake samping berbibir merah khas.',
      missions: ['Serangan Udara Langsung (CAS)', 'Serangan Darat & Anti-Permukaan', 'Latihan Konversi Tempur (TA-4H)', 'Operasi Keamanan Nasional'],
    },
    hotspots: [
      { id: 1, name: 'Kokpit & Probe Pengisian BBM', partType: 'Eksterior', pos: [0.35, 1.95, 3.6], camOffset: [2.8, 1.2, 2.8], desc: 'Kokpit dengan probe pengisian BBM udara menonjol di sisi kanan hidung.' },
      { id: 2, name: 'Air Intake Samping Berbingkai Merah', partType: 'Aerodinamika', pos: [0.78, 1.65, 1.5], camOffset: [3.0, 1.0, 2.4], desc: 'Intake setengah lingkaran khas Skyhawk dengan bibir merah peringatan bahaya hisap.' },
      { id: 3, name: 'Sayap Delta & Tangki Eksternal', partType: 'Senjata', pos: [2.2, 1.05, -0.8], camOffset: [3.2, 1.4, 2.4], desc: 'Sayap delta rendah kokoh membawa tangki bahan bakar besar, bom Mk-82, dan roket 70 mm.' },
      { id: 4, name: 'Mesin Turbojet Pratt & Whitney J52', partType: 'Sistem Internal', pos: [0, 1.55, -3.5], camOffset: [3.2, 1.0, -2.0], desc: 'Mesin turbojet tunggal J52-P-8A berdaya dorong 9.300 lbf.' },
      { id: 5, name: 'Ekor Tegak TT-0440 & Bendera RI', partType: 'Eksterior', pos: [0, 3.4, -5.0], camOffset: [3.2, 1.2, -2.0], desc: 'Kamuflase biru-abu-abu gelap TNI AU dengan registrasi TT-0440 dan bendera Merah Putih.' },
    ],
  },
  {
    id: 'g120tp',
    name: 'Grob G-120TP',
    code: 'G-120TP Basic Trainer',
    origin: 'Jerman (Grob Aircraft SE)',
    tailNumber: 'LD-1201',
    category: 'Latih',
    squadron: 'Skadron Pendidikan 101 (Lanud Adisutjipto, Yogyakarta)',
    role: 'Pesawat latih dasar-lanjut bermesin turboprop modern berbahan komposit penuh dengan kokpit berdampingan (side-by-side). Menjadi pesawat pertama bagi calon penerbang TNI AU di Sekolah Penerbang (Sekbang).',
    specs: {
      maxSpeed: '±530 km/jam (287 knot)',
      range: '±1.600 km',
      ceiling: '9.144 m (30.000 ft)',
      armament: 'Non-Combat • Glass Cockpit • Aerobatik +6G/-4G',
    },
    history: {
      operational:
        'TNI AU menjadi pengguna peluncuran (launch customer) Grob G-120TP di dunia, memperkuat Skadik 101 Lanud Adisutjipto untuk mencetak generasi baru penerbang TNI AU.',
      tactical:
        'Ditenagai mesin turboprop Rolls-Royce M250 / PT6 kelas 450 shp, tampil elegan dengan cat putih bersih, spinner kuning, garis kuning melingkar badan, serta winglet kuning melengkung ke atas.',
      missions: ['Pelatihan Terbang Dasar (Sekbang)', 'Pengenalan Glass Cockpit Modern', 'Latihan Manuver Aerobatik Dasar', 'Navigasi & Instrument Flight'],
    },
    hotspots: [
      { id: 1, name: 'Spinner Kuning & Baling-Baling 5 Bilah', partType: 'Sistem Internal', pos: [0, 1.35, 4.6], camOffset: [2.8, 1.0, 2.8], desc: 'Spinner kuning khas Grob TNI AU dengan baling-baling komposit berakselerasi cepat.' },
      { id: 2, name: 'Kokpit Side-by-Side Glass Cockpit', partType: 'Sistem Internal', pos: [0, 2.05, 1.4], camOffset: [2.8, 1.3, 2.6], desc: 'Kanopi gelembung luas dengan 2 kursi berdampingan (instruktur & siswa) dan layar digital.' },
      { id: 3, name: 'Winglet Melengkung Kuning', partType: 'Aerodinamika', pos: [4.6, 1.45, 0.2], camOffset: [3.2, 1.4, 2.4], desc: 'Ujung sayap winglet melengkung warna kuning cerah mengurangi vortex hambatan udara.' },
      { id: 4, name: 'Garis Kuning & Roundel TNI AU', partType: 'Eksterior', pos: [0.62, 1.45, -1.6], camOffset: [3.0, 1.0, 2.0], desc: 'Identitas resmi TNI AU putih-kuning dengan roundel segilima merah-putih.' },
      { id: 5, name: 'Ekor Tegak LD-1201', partType: 'Eksterior', pos: [0, 2.9, -4.4], camOffset: [3.0, 1.0, -1.8], desc: 'Sirip tegak putih berstrip kuning puncak, bendera Merah Putih, dan kode LD-1201.' },
    ],
  },
  {
    id: 'superpuma',
    name: 'Eurocopter AS332 Super Puma',
    code: 'NAS-332 / AS332L1',
    origin: 'Prancis / Indonesia (PT DI)',
    tailNumber: 'HX-3202',
    category: 'Helikopter',
    squadron: 'Skadron Udara 6 & Skadron Udara 45 VVIP',
    role: 'Helikopter angkut sedang multiperan bermesin kembar hasil kerja sama Eurocopter dan PT Dirgantara Indonesia. Andalan TNI AU untuk angkut personel, VVIP kepresidenan, logistik, dan SAR.',
    specs: {
      maxSpeed: '±278 km/jam (150 knot)',
      range: '±857 km',
      ceiling: '6.000 m',
      armament: '19–24 personel • ±4.000 kg kargo • Winch SAR',
    },
    history: {
      operational:
        'AS332 / NAS-332 Super Puma telah menjadi tulang punggung helikopter medium TNI AU selama puluhan tahun, baik untuk misi VIP kenegaraan di Skadron 45 maupun operasi SAR & angkut di Skadron 6.',
      tactical:
        'Ditenagai 2 mesin Turbomeca Makila 1A1 (1.812 shp/mesin), menggunakan rotor utama 4 bilah, roda retractable di sponson samping, dan tampil khas dengan livery putih-abu serta ujung ekor kuning.',
      missions: ['Angkut Personel & VVIP', 'Evakuasi Medis (MEDEVAC)', 'Operasi SAR & Bencana', 'Angkut Logistik Internal & Sling Load'],
    },
    hotspots: [
      { id: 1, name: 'Rotor Utama 4 Bilah Komposit', partType: 'Aerodinamika', pos: [0, 3.45, 0.6], camOffset: [3.8, 2.2, 3.0], desc: 'Empat bilah rotor utama berdiameter 15,6 m berdaya angkat tinggi dan stabil.' },
      { id: 2, name: '2 Mesin Turbomeca Makila 1A1', partType: 'Sistem Internal', pos: [0, 2.7, -0.4], camOffset: [3.4, 1.6, 2.4], desc: 'Sepasang mesin turboshaft 1.812 shp di atas kabin untuk redundansi keselamatan penuh.' },
      { id: 3, name: 'Kabin Putih-Abu & Jendela Luas', partType: 'Eksterior', pos: [0.95, 1.6, 1.2], camOffset: [3.6, 1.0, 2.4], desc: 'Kabin berkapasitas 19–24 personel dengan livery putih atas, abu-abu bawah, dan lambang TNI AU.' },
      { id: 4, name: 'Sponson Roda Pendarat Retractable', partType: 'Eksterior', pos: [1.35, 0.75, 0.3], camOffset: [3.2, 0.6, 2.2], desc: 'Roda utama terlipat rapi ke dalam sponson samping untuk kecepatan jelajah optimal.' },
      { id: 5, name: 'Ekor Kuning HX-3202 & Rotor Ekor', partType: 'Aerodinamika', pos: [0.3, 2.6, -6.1], camOffset: [3.2, 1.2, -2.0], desc: 'Sirip ekor berujung kuning visibilitas tinggi dengan kode HX-3202 dan rotor ekor 5 bilah.' },
    ],
  },
  {
    id: 'aw101',
    name: 'AgustaWestland AW101',
    code: 'AW101 Heavy-Lift',
    origin: 'Italia – Inggris (Leonardo)',
    tailNumber: 'H-5101',
    category: 'Helikopter',
    squadron: 'Skadron Udara 45 / Angkut Berat TNI AU',
    role: 'Helikopter angkut berat (heavy-lift) bermesin 3 turbin Rolls-Royce RTM322 dengan kapasitas besar hingga 30–38 personel atau 5,5 ton kargo. Dirancang untuk jangkauan jauh dan misi berat.',
    specs: {
      maxSpeed: '±309 km/jam (167 knot)',
      range: '±1.360 km',
      ceiling: '4.570 m (15.000 ft)',
      armament: '30–38 personel • ±5.500 kg kargo • 3 Mesin Turbin',
    },
    history: {
      operational:
        'AW101 adalah helikopter kelas berat berteknologi mutakhir dengan 3 mesin (tri-engine) yang menawarkan tingkat keselamatan sangat tinggi untuk operasi maritim dan angkut jarak jauh.',
      tactical:
        'Dilengkapi 5 bilah rotor utama berujung BERP khusus, kabin tinggi yang dapat dilewati sambil berdiri, ramp door belakang, serta kamuflase loreng hijau-cokelat TNI AU.',
      missions: ['Angkut Pasukan Berat (30–38 orang)', 'Logistik Kargo 5,5 Ton', 'SAR Jarak Jauh & Maritim', 'Evakuasi Medis Skala Besar'],
    },
    hotspots: [
      { id: 1, name: 'Rotor Utama 5 Bilah BERP', partType: 'Aerodinamika', pos: [0, 3.6, 0.5], camOffset: [4.0, 2.2, 3.2], desc: 'Lima bilah rotor canggih berujung BERP yang meningkatkan kecepatan jelajah dan daya angkat.' },
      { id: 2, name: '3 Mesin Rolls-Royce RTM322', partType: 'Sistem Internal', pos: [0, 2.8, -0.5], camOffset: [3.6, 1.6, 2.6], desc: 'Tiga mesin turboshaft (2.270 shp/mesin) menjamin helikopter tetap terbang aman bila satu mesin padam.' },
      { id: 3, name: 'Kabin Loreng & 4 Jendela Besar', partType: 'Eksterior', pos: [1.05, 1.65, 1.0], camOffset: [3.8, 1.0, 2.4], desc: 'Kabin ekstra lega berkapasitas 38 prajurit dengan kamuflase hutan TNI AU.' },
      { id: 4, name: 'Tail Boom H-5101 & Bendera RI', partType: 'Eksterior', pos: [0.4, 2.2, -5.4], camOffset: [3.4, 1.2, -2.0], desc: 'Batang ekor kokoh dengan nomor registrasi H-5101, bendera Merah Putih, dan rotor ekor 4 bilah.' },
      { id: 5, name: 'Roda Tiga Titik Retractable', partType: 'Eksterior', pos: [1.2, 0.55, 0.2], camOffset: [3.4, 0.5, 2.2], desc: 'Sistem roda tiga titik kuat menahan bobot maksimum lepas landas hingga 31,7 ton.' },
    ],
  },
  {
    id: 'h145',
    name: 'Airbus H145',
    code: 'H145M Multirole',
    origin: 'Jerman / Prancis (Airbus Helicopters)',
    tailNumber: 'H-1451',
    category: 'Helikopter',
    squadron: 'Skadron Helikopter Ringan-Sedang TNI AU',
    role: 'Helikopter multiguna kelas ringan-sedang bermesin kembar dengan kokpit digital Helionix dan rotor ekor tertutup Fenestron. Lincah, senyap, dan ideal untuk latih lanjut, SAR, dan MEDEVAC.',
    specs: {
      maxSpeed: '±246 km/jam (133 knot)',
      range: '±662 km',
      ceiling: '6.096 m',
      armament: '8–11 penumpang • Mesin Kembar Arriel 2E • Fenestron',
    },
    history: {
      operational:
        'Airbus H145 melengkapi armada helikopter modern TNI AU dengan teknologi avionik mutakhir, biaya operasi efisien, dan fleksibilitas konfigurasi kabin cepat.',
      tactical:
        'Ditenagai 2 mesin Safran Arriel 2E, rotor utama 5 bilah tanpa bantalan, kaki skid kokoh, dan rotor ekor Fenestron yang sangat aman di darat.',
      missions: ['Angkut Personel (8–11 orang)', 'Evakuasi Medis (MEDEVAC)', 'Operasi SAR Perkotaan & Pegunungan', 'Patroli & Latih Lanjut'],
    },
    hotspots: [
      { id: 1, name: 'Rotor Utama 5 Bilah Bearingless', partType: 'Aerodinamika', pos: [0, 3.25, 0.6], camOffset: [3.4, 2.0, 2.8], desc: 'Rotor utama 5 bilah ultra-halus dengan getaran sangat rendah dan performa angkat tinggi.' },
      { id: 2, name: 'Kokpit Digital Helionix', partType: 'Sistem Internal', pos: [0, 1.8, 2.8], camOffset: [2.8, 1.1, 2.8], desc: 'Kokpit kaca panoramik kompatibel NVG dengan autopilot 4-sumbu.' },
      { id: 3, name: 'Kabin Abu-Abu TNI Angkatan Udara', partType: 'Eksterior', pos: [0.8, 1.5, 1.0], camOffset: [3.2, 0.9, 2.4], desc: 'Kabin serbaguna berpintu geser besar dan pintu kerang (clamshell) belakang untuk tandu MEDEVAC.' },
      { id: 4, name: 'Rotor Ekor Tertutup Fenestron', partType: 'Aerodinamika', pos: [0.3, 2.1, -5.6], camOffset: [3.0, 1.1, -1.8], desc: 'Kipas ekor tertutup yang senyap dan aman bagi kru di area pendaratan sempit.' },
      { id: 5, name: 'Skid Pendarat Tubular Hitam', partType: 'Eksterior', pos: [1.1, 0.35, 1.2], camOffset: [2.8, 0.5, 2.2], desc: 'Kaki skid baja ringan untuk pendaratan di medan tidak rata.' },
    ],
  },
  {
    id: 'as365',
    name: 'Eurocopter AS365 Dauphin',
    code: 'AS365 N3+ Dauphin',
    origin: 'Prancis (Airbus Helicopters)',
    tailNumber: 'H-3651',
    category: 'Helikopter',
    squadron: 'Skadron Helikopter SAR & Patroli Maritim',
    role: 'Helikopter multiguna kelas medium yang ramping, cepat, dan aerodinamis dengan rotor ekor Fenestron dan roda retractable. Sangat unggul untuk misi SAR maritim, patroli udara, dan angkut cepat.',
    specs: {
      maxSpeed: '±306 km/jam (165 knot)',
      range: '±834 km',
      ceiling: '5.865 m',
      armament: '10–12 penumpang • 2× Arriel 1C2/2C • Fenestron',
    },
    history: {
      operational:
        'AS365 Dauphin dikenal luas di Indonesia sebagai helikopter SAR maritim dan dukungan udara cepat berkat kecepatannya yang melampaui 300 km/jam serta jarak tempuh jauh.',
      tactical:
        'Bentuk hidung lumba-lumba aerodinamis, roda tiga titik yang dapat ditarik masuk, dan ekor Fenestron memberikan efisiensi bahan bakar dan kelincahan luar biasa di laut terbuka.',
      missions: ['SAR Maritim & Penyelamatan Laut', 'Patroli Udara & Pengawasan', 'Evakuasi Medis Cepat', 'Angkut Personel (10–12 orang)'],
    },
    hotspots: [
      { id: 1, name: 'Rotor Utama 4 Bilah Starflex', partType: 'Aerodinamika', pos: [0, 3.25, 0.6], camOffset: [3.6, 2.0, 2.8], desc: 'Empat bilah rotor utama berkecepatan tinggi dengan hub Starflex komposit.' },
      { id: 2, name: 'Hidung Aerodinamis Dauphin', partType: 'Eksterior', pos: [0, 1.45, 3.6], camOffset: [2.8, 1.0, 2.8], desc: 'Profil hidung ramping mengurangi hambatan udara hingga kecepatan 306 km/jam.' },
      { id: 3, name: 'Kabin & Identitas TNI AU', partType: 'Eksterior', pos: [0.82, 1.5, 1.0], camOffset: [3.2, 0.9, 2.4], desc: 'Kabin abu-abu terang dengan lambang Garuda Emas dan tulisan TNI ANGKATAN UDARA.' },
      { id: 4, name: 'Rotor Ekor Fenestron & H-3651', partType: 'Aerodinamika', pos: [0.3, 2.05, -5.8], camOffset: [3.0, 1.1, -1.8], desc: 'Fenestron khas Dauphin dengan sirip ekor berbendera Merah Putih dan registrasi H-3651.' },
      { id: 5, name: 'Roda Pendarat Retractable', partType: 'Eksterior', pos: [0.95, 0.4, 0.2], camOffset: [3.0, 0.4, 2.2], desc: 'Roda pendarat tiga titik yang terlipat masuk selama terbang jelajah.' },
    ],
  },
  {
    id: 'c182',
    name: 'Cessna 182 Skylane',
    code: 'Cessna 182T Skylane',
    origin: 'Amerika Serikat (Cessna)',
    tailNumber: 'A-1821',
    category: 'Latih',
    squadron: 'Skadron Latih & Patroli Ringan TNI AU',
    role: 'Pesawat sayap tinggi bermesin piston tunggal yang sangat stabil, andal, dan ekonomis. Digunakan untuk pelatihan terbang, patroli udara ringan, survei pemetaan, dan misi penghubung (liaison).',
    specs: {
      maxSpeed: '±302 km/jam (163 knot)',
      range: '±1.606 km',
      ceiling: '5.517 m (18.100 ft)',
      armament: '1 Pilot + 3 Penumpang • Lycoming IO-540 (230 hp)',
    },
    history: {
      operational:
        'Cessna 182 Skylane menjadi pesawat serbaguna ringan yang populer untuk pembinaan jam terbang, survei wilayah, dan dukungan penghubung antar-pangkalan.',
      tactical:
        'Sayap tinggi bertopang strut memberi stabilitas alami dan jarak pandang bawah yang leluasa untuk observasi serta pemetaan udara, tampil rapi dengan livery putih-biru navy TNI AU.',
      missions: ['Latih Terbang (Flight Training)', 'Patroli Udara Ringan', 'Survei & Pemetaan Udara', 'Transportasi Ringan / Liaison'],
    },
    hotspots: [
      { id: 1, name: 'Mesin Piston Lycoming IO-540', partType: 'Sistem Internal', pos: [0, 1.35, 3.8], camOffset: [2.6, 1.0, 2.6], desc: 'Mesin piston 6-silinder bertenaga 230 hp dengan baling-baling 3 bilah berujung kuning.' },
      { id: 2, name: 'Sayap Tinggi & Strut Penopang', partType: 'Aerodinamika', pos: [3.4, 2.05, 0.6], camOffset: [3.4, 1.4, 2.6], desc: 'Sayap high-wing stabil dengan batang strut diagonal yang kokoh.' },
      { id: 3, name: 'Kabin 4 Kursi & Livery Biru Navy', partType: 'Eksterior', pos: [0.65, 1.45, 0.8], camOffset: [3.0, 0.9, 2.2], desc: 'Kabin putih dengan garis biru navy, lambang Garuda Emas, dan tulisan TNI ANGKATAN UDARA.' },
      { id: 4, name: 'Roda Pendarat Berfairing (Wheel Pants)', partType: 'Eksterior', pos: [1.1, 0.4, 0.4], camOffset: [2.8, 0.4, 2.2], desc: 'Roda tetap berpenutup aerodinamis untuk mengurangi hambatan udara.' },
      { id: 5, name: 'Ekor Tegak A-1821', partType: 'Eksterior', pos: [0, 2.6, -4.0], camOffset: [2.8, 1.0, -1.8], desc: 'Sirip ekor putih dengan bendera Merah Putih dan registrasi A-1821.' },
    ],
  },
  {
    id: 't41',
    name: 'Beechcraft T-41 Mescalero',
    code: 'T-41 Primary Trainer',
    origin: 'Amerika Serikat',
    tailNumber: 'A-411',
    category: 'Latih',
    squadron: 'Skadron Pendidikan Terbang Dasar TNI AU',
    role: 'Pesawat latih dasar bermesin tunggal berkapasitas 2 kursi (instruktur & siswa) untuk pembentukan jam terbang awal, pengenalan navigasi, dan operasi liaison ringan.',
    specs: {
      maxSpeed: '±296 km/jam (160 knot)',
      range: '±1.296 km',
      ceiling: '5.180 m (17.000 ft)',
      armament: '2 Kursi Latih • Continental O-470 (230 hp)',
    },
    history: {
      operational:
        'Pesawat latih dasar kelas T-41 telah lama digunakan dalam program pembentukan penerbang militer untuk melatih dasar lepas landas, pendaratan, dan navigasi visual.',
      tactical:
        'Tampil mencolok dengan bodi putih, cowling hidung oranye-hitam, dan ujung sayap serta ekor oranye visibilitas tinggi agar mudah terlihat saat latihan di area pangkalan.',
      missions: ['Pelatihan Terbang Dasar (Primary)', 'Pembentukan Jam Terbang Awal', 'Navigasi & Prosedur Penerbangan', 'Operasi Liaison Ringan'],
    },
    hotspots: [
      { id: 1, name: 'Hidung Oranye & Mesin 230 hp', partType: 'Sistem Internal', pos: [0, 1.3, 3.8], camOffset: [2.6, 1.0, 2.6], desc: 'Cowling oranye-hitam melindungi mesin 230 hp yang andal untuk latihan intensif.' },
      { id: 2, name: 'Kokpit 2 Kursi Kontrol Ganda', partType: 'Sistem Internal', pos: [0, 1.85, 1.0], camOffset: [2.6, 1.2, 2.4], desc: 'Kokpit dua kursi dengan instrumen analog-digital lengkap untuk siswa dan instruktur.' },
      { id: 3, name: 'Sayap Rendah Berujung Oranye', partType: 'Aerodinamika', pos: [3.2, 1.15, 0.2], camOffset: [3.2, 1.3, 2.4], desc: 'Sayap stabil dengan cat ujung oranye visibilitas tinggi untuk keselamatan latihan.' },
      { id: 4, name: 'Identitas TNI AU & Roundel', partType: 'Eksterior', pos: [0.6, 1.4, -1.2], camOffset: [2.8, 0.9, 2.0], desc: 'Tulisan TNI ANGKATAN UDARA, roundel segilima, dan nomor registrasi A-411.' },
      { id: 5, name: 'Ekor Tegak & Bendera RI', partType: 'Eksterior', pos: [0, 2.6, -4.0], camOffset: [2.8, 1.0, -1.8], desc: 'Sirip ekor putih berujung oranye dengan bendera Merah Putih.' },
    ],
  },
  {
    id: 'sgs233',
    name: 'Schweizer SGS 2-33',
    code: 'SGS 2-33A Glider Latih',
    origin: 'Amerika Serikat (Schweizer Aircraft)',
    tailNumber: 'G-233',
    category: 'Latih',
    squadron: 'FASI / Pembinaan Terbang Layang Kadet TNI AU',
    role: 'Pesawat latih layang (glider) dua kursi tandem tanpa mesin yang terkenal sederhana, kokoh, dan aman. Digunakan untuk membina kepekaan aerodinamika (airmanship) dan teknik terbang luncur kadet penerbang.',
    specs: {
      maxSpeed: '±120 km/jam (operasi)',
      range: 'Rasio Luncur 27:1 (tanpa mesin)',
      ceiling: 'Terbang Thermal & Ridge Soaring',
      armament: 'Glider 2 Kursi Tandem • Rentang Sayap 15,24 m',
    },
    history: {
      operational:
        'Schweizer SGS 2-33 adalah salah satu glider latih paling legendaris di dunia militer dan sipil untuk memperkenalkan dasar aerodinamika tanpa mesin kepada taruna penerbang.',
      tactical:
        'Memiliki sayap tinggi sangat panjang (15,24 m) bertopang strut, satu roda utama di bawah perut, serta livery putih dengan hidung, garis samping, dan ujung sayap oranye cerah.',
      missions: ['Pelatihan Terbang Luncur (Soaring)', 'Pembinaan Kadet Penerbang (Flight Cadet)', 'Pengenalan Aerodinamika Tanpa Mesin', 'Pengembangan Airmanship'],
    },
    hotspots: [
      { id: 1, name: 'Hidung Oranye & Kait Tarik (Tow Hook)', partType: 'Eksterior', pos: [0, 1.0, 3.8], camOffset: [2.6, 0.9, 2.6], desc: 'Hidung oranye visibilitas tinggi dengan kait pelepas tali tarik pesawat penarik (aerotow).' },
      { id: 2, name: 'Kokpit Tandem Dua Kursi', partType: 'Sistem Internal', pos: [0, 1.55, 1.8], camOffset: [2.6, 1.1, 2.4], desc: 'Kokpit tandem untuk siswa di depan dan instruktur di belakang dengan kanopi jernih.' },
      { id: 3, name: 'Sayap Panjang 15,24 m (Rasio 27:1)', partType: 'Aerodinamika', pos: [5.0, 1.65, 0.4], camOffset: [3.6, 1.6, 2.6], desc: 'Sayap berasio aspek tinggi memungkinkan glider meluncur 27 meter ke depan per 1 meter turun.' },
      { id: 4, name: 'Roda Tunggal Perut (Monowheel)', partType: 'Eksterior', pos: [0, 0.35, 0.8], camOffset: [2.6, 0.4, 2.2], desc: 'Roda tunggal di tengah perut khas pesawat layang untuk mengurangi hambatan udara.' },
      { id: 5, name: 'Ekor G-233 & Bendera RI', partType: 'Eksterior', pos: [0, 2.2, -4.4], camOffset: [2.8, 1.0, -1.8], desc: 'Sirip ekor putih berujung oranye dengan bendera Merah Putih dan kode G-233.' },
    ],
  },
  {
    id: 'dg1000',
    name: 'Glider DG-1000',
    code: 'DG-1000S Sailplane',
    origin: 'Jerman (DG Flugzeugbau)',
    tailNumber: 'G-1000',
    category: 'Latih',
    squadron: 'FASI / Pembinaan Terbang Layang Lanjut TNI AU',
    role: 'Pesawat layang (sailplane) komposit modern berkursi ganda dengan performa luncur luar biasa (rasio 43:1) dan rentang sayap ultra-ramping 20 meter. Digunakan untuk pelatihan terbang layang lanjut & aerobatik glider.',
    specs: {
      maxSpeed: '±280 km/jam (151 knot)',
      range: 'Rasio Luncur 43:1 • Jangkauan ±1.000 km',
      ceiling: 'Soaring Ketinggian Tinggi',
      armament: 'Sailplane 2 Kursi • Rentang Sayap 20,0 m • T-Tail',
    },
    history: {
      operational:
        'DG-1000 adalah glider performa tinggi generasi modern berbahan serat karbon-fiberglass yang dipakai akademi angkatan udara dunia untuk melatih presisi aerodinamika dan navigasi tanpa mesin.',
      tactical:
        'Sayap ramping 20 meter berujung winglet merah, bodi putih aerodinamis licin tanpa strut, dan ekor T-Tail tinggi menghasilkan laju turun minimal hanya 0,54 m/detik.',
      missions: ['Pelatihan Terbang Layang Lanjut', 'Navigasi Jarak Jauh Tanpa Mesin', 'Latihan Aerobatik Glider', 'Pengembangan Presisi Airmanship'],
    },
    hotspots: [
      { id: 1, name: 'Kokpit Tandem Ultra-Aerodinamis', partType: 'Sistem Internal', pos: [0, 1.35, 2.4], camOffset: [2.6, 1.0, 2.6], desc: 'Kanopi gelembung sangat halus menyatu dengan bodi untuk hambatan udara nyaris nol.' },
      { id: 2, name: 'Sayap Komposit 20 m (Rasio 43:1)', partType: 'Aerodinamika', pos: [5.6, 1.45, 0.2], camOffset: [3.8, 1.6, 2.6], desc: 'Sayap komposit ultra-ramping dengan rasio luncur 43:1 — meluncur 43 km dari ketinggian 1 km.' },
      { id: 3, name: 'Winglet Ujung Sayap Merah', partType: 'Aerodinamika', pos: [6.8, 1.85, 0.0], camOffset: [3.2, 1.2, 2.2], desc: 'Winglet vertikal merah mengurangi hambatan ujung sayap saat terbang thermal.' },
      { id: 4, name: 'Ekor T-Tail Ramping & G-1000', partType: 'Aerodinamika', pos: [0, 2.25, -4.8], camOffset: [2.8, 1.0, -1.8], desc: 'Ekor T-Tail menjaga stabilizer aman dari rumput saat pendaratan di lapangan terbuka.' },
      { id: 5, name: 'Roda Tunggal Retractable', partType: 'Eksterior', pos: [0, 0.3, 0.8], camOffset: [2.6, 0.4, 2.0], desc: 'Roda utama tunggal dapat dilipat ke dalam badan saat mengudara.' },
    ],
  },
];
