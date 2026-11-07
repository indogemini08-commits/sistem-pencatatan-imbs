import { query, run, logAudit, getTombstones, persistDb } from './database';

export const DEFAULT_TEACHERS = [
  { id: 'tch_ahmad', name: 'Ustadz Ahmad Al-Hafizh', phone: '0812-3456-7890', status: 'active', userId: 'usr_ahmad' },
  { id: 'tch_muhammad', name: 'Ustadz Muhammad Al-Hafizh', phone: '0813-4567-8901', status: 'active', userId: 'usr_muhammad' },
  { id: 'tch_abdullah', name: 'Ustadz Abdullah Al-Hafizh', phone: '0814-5678-9012', status: 'active', userId: 'usr_abdullah' },
];

export const DEFAULT_HALAQAHS = [
  { id: 'hlq_doha', name: 'Halaqah Doha', teacherId: 'tch_ahmad', schedule: "Ba'da Subuh & Ba'da Maghrib", location: 'Masjid Lantai 1', academicYear: '2025/2026' },
  { id: 'hlq_makkah', name: 'Halaqah Makkah', teacherId: 'tch_muhammad', schedule: "Ba'da Subuh & Ba'da Ashar", location: 'Masjid Lantai 2', academicYear: '2025/2026' },
  { id: 'hlq_madinah', name: 'Halaqah Madinah', teacherId: 'tch_abdullah', schedule: "Ba'da Maghrib & Ba'da Isya", location: 'Gedung Tahfizh B', academicYear: '2025/2026' },
];

export const DEFAULT_STUDENTS = [
  { id: 'std_001', nis: '2025001', name: 'Muhammad Abdullah', class: '8A', gender: 'L', halaqahId: 'hlq_doha' },
  { id: 'std_002', nis: '2025002', name: 'Ahmad Farhan Kamil', class: '8A', gender: 'L', halaqahId: 'hlq_doha' },
  { id: 'std_003', nis: '2025003', name: 'Ibrahim Malik Ar-Rasyid', class: '7B', gender: 'L', halaqahId: 'hlq_doha' },
  { id: 'std_004', nis: '2025004', name: 'Zaid bin Tsabit Robbani', class: '9B', gender: 'L', halaqahId: 'hlq_doha' },
  { id: 'std_005', nis: '2025005', name: 'Hasan Al-Banna Pratama', class: '8B', gender: 'L', halaqahId: 'hlq_makkah' },
  { id: 'std_006', nis: '2025006', name: 'Umar Dani Ramadhan', class: '7A', gender: 'L', halaqahId: 'hlq_makkah' },
  { id: 'std_007', nis: '2025007', name: 'Salman Al-Farisi Munir', class: '7C', gender: 'L', halaqahId: 'hlq_makkah' },
  { id: 'std_008', nis: '2025008', name: 'Ali Zainal Abidin', class: '9A', gender: 'L', halaqahId: 'hlq_madinah' },
  { id: 'std_009', nis: '2025009', name: 'Bilal Habasyi Asy-Syahid', class: '8C', gender: 'L', halaqahId: 'hlq_madinah' },
  { id: 'std_010', nis: '2025010', name: 'Usamah bin Zaid Akbar', class: '8A', gender: 'L', halaqahId: 'hlq_madinah' },
];

export function seedTeachersIfEmpty() {
  const teacherCount = query<{ count: number }>('SELECT COUNT(*) as count FROM teachers')[0]?.count || 0;
  if (teacherCount > 0) return;

  const tombstones = getTombstones();
  for (const t of DEFAULT_TEACHERS) {
    if (tombstones.has(t.id)) continue;
    run(
      `INSERT INTO teachers (id, user_id, name, phone, status, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
      [t.id, t.userId || null, t.name, t.phone, t.status]
    );
  }
}

export function seedHalaqahIfEmpty() {
  const halaqahCount = query<{ count: number }>('SELECT COUNT(*) as count FROM halaqah')[0]?.count || 0;
  if (halaqahCount > 0) return;

  const tombstones = getTombstones();
  for (const h of DEFAULT_HALAQAHS) {
    if (tombstones.has(h.id)) continue;
    run(
      `INSERT INTO halaqah (id, name, teacher_id, schedule, location, academic_year, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', datetime('now', 'localtime'))`,
      [h.id, h.name, h.teacherId, h.schedule, h.location, h.academicYear]
    );
  }
}

export function seedStudentsIfEmpty() {
  const studentCount = query<{ count: number }>('SELECT COUNT(*) as count FROM students')[0]?.count || 0;
  if (studentCount > 0) return;

  const tombstones = getTombstones();
  const halaqahs = query<{ id: string; teacher_id: string }>('SELECT id, teacher_id FROM halaqah');

  for (const s of DEFAULT_STUDENTS) {
    if (tombstones.has(s.id)) continue;
    run(
      `INSERT INTO students (id, student_number, name, class, gender, halaqah_id, academic_year, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, '2025/2026', 'active', datetime('now', 'localtime'))`,
      [s.id, s.nis, s.name, s.class, s.gender, s.halaqahId]
    );

    const hInfo = halaqahs.find(h => h.id === s.halaqahId);
    run(
      `INSERT INTO student_halaqah_history (id, student_id, halaqah_id, teacher_id, academic_year, class, start_date)
       VALUES (?, ?, ?, ?, '2025/2026', ?, date('now', 'localtime'))`,
      ['hist_' + s.id, s.id, s.halaqahId, hInfo?.teacher_id || null, s.class]
    );
  }
}

export const DEFAULT_KESANTRIAN_VIOLATIONS = [
  { id: 'v_ks_001', code: 'KS001', name: 'Terlambat / Masbuq Shalat Berjamaah', cat: 'Kedisiplinan', points: 5, desc: "Masbuq shalat fardhu berjamaah di masjid pesantren tanpa udzur syar'i" },
  { id: 'v_ks_002', code: 'KS002', name: 'Masbuq Shalat Subuh / Kesiangan', cat: 'Kedisiplinan', points: 8, desc: 'Bangun terlambat sehingga masbuq pada shalat Subuh berjamaah' },
  { id: 'v_ks_003', code: 'KS003', name: 'Tidak Shalat Berjamaah di Masjid', cat: 'Kehadiran', points: 15, desc: 'Tidak hadir shalat fardhu di masjid tanpa izin bagian kesantrian / sakit' },
  { id: 'v_ks_004', code: 'KS004', name: 'Kamar / Lemari Asrama Berantakan & Jorok', cat: 'Kedisiplinan', points: 3, desc: 'Tidak merapikan tempat tidur, pakaian menumpuk, atau lemari tidak teratur saat inspeksi' },
  { id: 'v_ks_005', code: 'KS005', name: 'Membawa / Menyimpan HP & Gawai Ilegal', cat: 'Kedisiplinan', points: 30, desc: 'Membawa smartphone, tablet, atau perangkat elektronik yang tidak diizinkan di asrama' },
  { id: 'v_ks_006', code: 'KS006', name: 'Melewati Jam Malam Asrama (>22:30)', cat: 'Kedisiplinan', points: 5, desc: 'Masih berkeliaran atau berisik di luar kamar setelah bel jam istirahat malam' },
  { id: 'v_ks_007', code: 'KS007', name: 'Keluar Kompleks Tanpa Izin (Kabur/Pesiar Ilegal)', cat: 'Kehadiran', points: 40, desc: 'Meninggalkan area pesantren tanpa surat izin resmi dari bagian kesantrian' },
  { id: 'v_ks_008', code: 'KS008', name: 'Merokok / Vape di Lingkungan Pesantren', cat: 'Kedisiplinan', points: 50, desc: 'Kedapatan merokok, vape, atau menyimpan rokok di area asrama/pesantren' },
  { id: 'v_ks_009', code: 'KS009', name: 'Berkelahi / Mengintimidasi / Bullying', cat: 'Adab & Akhlak', points: 35, desc: 'Melakukan kekerasan fisik atau perundungan kepada sesama santri' },
  { id: 'v_ks_010', code: 'KS010', name: 'Merusak Fasilitas Asrama & Pesantren', cat: 'Kedisiplinan', points: 20, desc: 'Mencoret-coret tembok, memecahkan kaca, atau merusak sarana asrama' },
  { id: 'v_ks_011', code: 'KS011', name: 'Ghashab / Mengambil Barang Teman Tanpa Izin', cat: 'Adab & Akhlak', points: 15, desc: 'Memakai sandal, pakaian, atau perlengkapan santri lain tanpa kerelaan' },
  { id: 'v_ks_012', code: 'KS012', name: 'Membawa Senjata Tajam / Benda Berbahaya', cat: 'Kedisiplinan', points: 60, desc: 'Menyimpan senjata tajam atau benda membahayakan di kamar santri' },
];

export function seedKesantrianViolationsIfEmpty() {
  const ksCount = query<{ count: number }>("SELECT COUNT(*) as count FROM violations WHERE division = 'kesantrian'")[0]?.count || 0;
  if (ksCount > 0) return;

  const tombstones = getTombstones();
  console.log('Menginisialisasi master pelanggaran divisi kesantrian...');
  for (const v of DEFAULT_KESANTRIAN_VIOLATIONS) {
    if (tombstones.has(v.id)) continue;
    run(
      `INSERT INTO violations (id, code, name, division, category, description, default_points, status)
       VALUES (?, ?, ?, 'kesantrian', ?, ?, ?, 'active')`,
      [v.id, v.code, v.name, v.cat, v.desc, v.points]
    );
  }
}

export const DEFAULT_AKADEMIK_VIOLATIONS = [
  { id: 'v_ak_001', code: 'AK001', name: 'Terlambat Masuk Kelas / KBM (>10 menit)', cat: 'Kedisiplinan', points: 3, desc: 'Datang terlambat ke ruang kelas saat KBM berlangsung tanpa surat izin' },
  { id: 'v_ak_002', code: 'AK002', name: 'Tidak Mengerjakan Tugas / PR Sekolah', cat: 'Tugas & PR', points: 5, desc: 'Tidak menyelesaikan atau mengumpulkan tugas/PR yang diberikan guru' },
  { id: 'v_ak_003', code: 'AK003', name: 'Tidur / Mengantuk Saat KBM Berlangsung', cat: 'Ketertiban Kelas', points: 4, desc: 'Tidur atau tidak memperhatikan materi saat guru sedang menerangkan di kelas' },
  { id: 'v_ak_004', code: 'AK004', name: 'Tidak Membawa Buku Pelajaran / Modul', cat: 'Kedisiplinan', points: 3, desc: 'Tidak membawa buku paket, catatan, atau peralatan belajar saat pelajaran dimulai' },
  { id: 'v_ak_005', code: 'AK005', name: 'Alpa / Tidak Hadir KBM Tanpa Surat Izin', cat: 'Kehadiran KBM', points: 10, desc: 'Tidak hadir di kelas sekolah tanpa surat izin resmi dari bagian piket/sekolah' },
  { id: 'v_ak_006', code: 'AK006', name: 'Membuat Keributan / Gaduh di Kelas', cat: 'Ketertiban Kelas', points: 5, desc: 'Berbicara tidak pantas atau bercanda berlebihan sehingga mengganggu KBM' },
  { id: 'v_ak_007', code: 'AK007', name: 'Keluar Kelas Tanpa Izin Guru Pengajar', cat: 'Ketertiban Kelas', points: 6, desc: 'Meninggalkan ruang kelas saat jam KBM tanpa membawa kartu/izin guru' },
  { id: 'v_ak_008', code: 'AK008', name: 'Mencontek / Kerjasama Ilegal Saat Ujian', cat: 'Ujian & Evaluasi', points: 25, desc: 'Melakukan kecurangan, membawa contekan, atau bertukar jawaban saat asesmen/ujian' },
  { id: 'v_ak_009', code: 'AK009', name: 'Membawa Barang Non-Edukasi Terlarang ke Kelas', cat: 'Kedisiplinan', points: 15, desc: 'Membawa gawai, komik, atau mainan ke dalam ruang belajar tanpa izin' },
  { id: 'v_ak_010', code: 'AK010', name: 'Mencoret / Merusak Meja & Fasilitas Kelas', cat: 'Kedisiplinan', points: 10, desc: 'Merusak fasilitas sekolah, mencoret meja, papan tulis, atau dinding ruang kelas' },
  { id: 'v_ak_011', code: 'AK011', name: 'Memalsukan Tanda Tangan Guru / Wali Kelas', cat: 'Adab & Akhlak', points: 30, desc: 'Memalsukan tanda tangan guru pada lembar izin, buku tugas, atau buku raport' },
  { id: 'v_ak_012', code: 'AK012', name: 'Membolos Sekolah / Meninggalkan Area KBM', cat: 'Kehadiran KBM', points: 15, desc: 'Meninggalkan area sekolah saat jam belajar masih berlangsung' },
];

export function seedAkademikViolationsIfEmpty() {
  const akCount = query<{ count: number }>("SELECT COUNT(*) as count FROM violations WHERE division = 'akademik'")[0]?.count || 0;
  if (akCount > 0) return;

  const tombstones = getTombstones();
  console.log('Menginisialisasi master pelanggaran divisi akademik (KBM/sekolah)...');
  for (const v of DEFAULT_AKADEMIK_VIOLATIONS) {
    if (tombstones.has(v.id)) continue;
    run(
      `INSERT INTO violations (id, code, name, division, category, description, default_points, status)
       VALUES (?, ?, ?, 'akademik', ?, ?, ?, 'active')`,
      [v.id, v.code, v.name, v.cat, v.desc, v.points]
    );
  }
}

export function seedNewRolesIfEmpty() {
  const kesantrianUser = query<{ id: string }>("SELECT id FROM users WHERE role = 'kepala_kesantrian'")[0];
  if (!kesantrianUser) {
    run(
      `INSERT INTO users (id, name, email, password_hash, role, status, created_at)
       VALUES ('usr_kesantrian', 'Ustadz Zulkifli, S.Pd.I (Kepala Kesantrian)', 'kesantrian@pesantren.id', 'kesantrian123', 'kepala_kesantrian', 'active', datetime('now', 'localtime'))`
    );
    console.log('Seeded demo user: Kepala Kesantrian (kesantrian@pesantren.id / kesantrian123)');
  }

  const guruUser = query<{ id: string }>("SELECT id FROM users WHERE role = 'guru'")[0];
  if (!guruUser) {
    run(
      `INSERT INTO users (id, name, email, password_hash, role, status, created_at)
       VALUES ('usr_guru', 'Ustadz Herman, S.Pd (Guru Pengajar)', 'guru@pesantren.id', 'guru123', 'guru', 'active', datetime('now', 'localtime'))`
    );
    console.log('Seeded demo user: Guru (guru@pesantren.id / guru123)');
  }

  const akademikUser = query<{ id: string }>("SELECT id FROM users WHERE role = 'badan_akademik'")[0];
  if (!akademikUser) {
    run(
      `INSERT INTO users (id, name, email, password_hash, role, status, created_at)
       VALUES ('usr_akademik', 'Ustadz Abdullah Faruq, M.Pd (Badan Akademik)', 'akademik@pesantren.id', 'akademik123', 'badan_akademik', 'active', datetime('now', 'localtime'))`
    );
    console.log('Seeded demo user: Badan Akademik (akademik@pesantren.id / akademik123)');
  }
}

export const DEFAULT_POSITIVE_ACTIONS = [
  // Tahfizh Division
  { id: 'act_t_001', code: 'KB-T01', name: "Tasmi' 1 Juz Sekali Duduk Tanpa Salah", division: 'tahfizh', cat: 'Tahfizh', points: 10, desc: "Menyetorkan hafalan 1 juz bil ghoib sekali duduk dengan lancar dan tajwid mutqin" },
  { id: 'act_t_002', code: 'KB-T02', name: 'Setor Ziyadah Ekstra Melampaui Target', division: 'tahfizh', cat: 'Tahfizh', points: 5, desc: "Menambah capaian hafalan baru melebihi target minimal mingguan/bulanan" },
  { id: 'act_t_003', code: 'KB-T03', name: 'Murojaah Mandiri Terdisiplin (1 Pekan Penuh)', division: 'tahfizh', cat: 'Tahfizh', points: 5, desc: "Konsisten hadir dan murojaah mandiri sebelum halaqah dimulai selama 1 pekan penuh" },
  { id: 'act_t_004', code: 'KB-T04', name: 'Talaqqi / Membimbing Teman Sebaya di Halaqah', division: 'tahfizh', cat: 'Tahfizh', points: 3, desc: "Membantu menyimak dan mengoreksi bacaan teman se-halaqah yang tertinggal" },
  { id: 'act_t_005', code: 'KB-T05', name: "Juara / Peserta Terbaik Musabaqah Hifzhil Qur'an (MHQ)", division: 'tahfizh', cat: 'Prestasi', points: 15, desc: "Meraih juara atau apresiasi terbaik dalam perlombaan tahfizh Qur'an" },

  // Kesantrian Division
  { id: 'act_k_001', code: 'KB-K01', name: 'Muadzin / Imam Shalat Rawatib Tepat Waktu', division: 'kesantrian', cat: 'Ibadah & Shalat', points: 5, desc: "Bertugas adzan atau mengimami shalat fardhu rawatib di masjid tepat waktu" },
  { id: 'act_k_002', code: 'KB-K02', name: 'Piket Kamar / Kebersihan Asrama Teladan', division: 'kesantrian', cat: 'Kedisiplinan', points: 5, desc: "Kamar atau area lorong asrama terbersih dan paling rapi saat inspeksi kesantrian" },
  { id: 'act_k_003', code: 'KB-K03', name: 'Khidmat Sosial Dapur / Membantu Operasional Pesantren', division: 'kesantrian', cat: 'Khidmat & Sosial', points: 10, desc: "Secara sukarela membantu penyiapan makan, kebersihan lingkungan, atau acara pesantren" },
  { id: 'act_k_004', code: 'KB-K04', name: 'Amanah: Menemukan & Mengembalikan Barang Teman', division: 'kesantrian', cat: 'Khidmat & Sosial', points: 5, desc: "Menemukan barang berharga atau uang tercecer dan menyerahkannya ke bagian kesantrian" },
  { id: 'act_k_005', code: 'KB-K05', name: 'Keteladanan Bangun Subuh Tanpa Dibangunkan (1 Pekan)', division: 'kesantrian', cat: 'Kedisiplinan', points: 5, desc: "Bangun mandiri dan membangunkan teman kamar shalat Subuh berjamaah selama 1 pekan" },
  { id: 'act_k_006', code: 'KB-K06', name: 'Prestasi Lomba Akademik / Bahasa / Olahraga', division: 'kesantrian', cat: 'Prestasi', points: 10, desc: "Membawa nama baik pesantren dalam kompetisi akademik, bahasa Arab/Inggris, atau olahraga" },

  // Divisi Akademik (KBM / Sekolah)
  { id: 'act_a_001', code: 'KB-A01', name: 'Juara Olimpiade / Lomba Sains & Akademik', division: 'akademik', cat: 'Prestasi', points: 15, desc: 'Meraih juara 1, 2, atau 3 pada kompetisi sains, matematika, atau akademik resmi' },
  { id: 'act_a_002', code: 'KB-A02', name: 'Nilai Ujian / Asesmen Sempurna (100)', division: 'akademik', cat: 'Prestasi', points: 10, desc: 'Meraih nilai sempurna pada ujian semester, asesmen harian, atau kuis mata pelajaran' },
  { id: 'act_a_003', code: 'KB-A03', name: 'Santri Terdisiplin KBM Kelas (1 Bulan Penuh)', division: 'akademik', cat: 'Kedisiplinan', points: 5, desc: 'Hadir 100% tepat waktu, tugas selalu tuntas, dan aktif dalam pembelajaran kelas' },
  { id: 'act_a_004', code: 'KB-A04', name: 'Tutor / Membimbing Teman Sekelas yang Tertinggal', division: 'akademik', cat: 'Khidmat & Sosial', points: 5, desc: 'Membantu menjelaskan materi pelajaran kepada teman sekelas yang mengalami kesulitan' },
  { id: 'act_a_005', code: 'KB-A05', name: 'Presentasi Karya Ilmiah / Proyek KBM Terbaik', division: 'akademik', cat: 'Prestasi', points: 5, desc: 'Menghasilkan proyek atau presentasi materi pelajaran dengan mutu terbaik di kelas' },
];

export function seedPositiveActionsIfEmpty() {
  const tombstones = getTombstones();
  for (const a of DEFAULT_POSITIVE_ACTIONS) {
    if (tombstones.has(a.id)) continue;
    const exists = query<{ id: string }>('SELECT id FROM positive_actions WHERE id = ? OR code = ?', [a.id, a.code]);
    if (exists.length === 0) {
      run(
        `INSERT INTO positive_actions (id, code, name, division, category, description, default_points_deduction, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
        [a.id, a.code, a.name, a.division, a.cat, a.desc, a.points]
      );
    }
  }
}

export function seedDefaultAdminIfEmpty() {
  const existing = query<{ id: string; password_hash: string }>("SELECT id, password_hash FROM users WHERE LOWER(email) = 'imbs@aldri'")[0];
  if (!existing) {
    run(
      `INSERT INTO users (id, name, email, password_hash, role, status, created_at)
       VALUES ('usr_admin_imbs', 'Admin Utama', 'imbs@aldri', 'admin112', 'admin', 'active', datetime('now', 'localtime'))`
    );
    console.log('Seeded default admin user: imbs@aldri / admin112');
  } else if (existing.password_hash !== 'admin112') {
    run(
      `UPDATE users SET password_hash = 'admin112', role = 'admin', status = 'active' WHERE LOWER(email) = 'imbs@aldri'`
    );
  }
}

export function seedDatabase() {
  const userCount = query<{ count: number }>('SELECT COUNT(*) as count FROM users')[0]?.count || 0;
  if (userCount > 0) {
    seedDefaultAdminIfEmpty();
    seedTeachersIfEmpty();
    seedHalaqahIfEmpty();
    seedStudentsIfEmpty();
    seedKesantrianViolationsIfEmpty();
    seedAkademikViolationsIfEmpty();
    seedNewRolesIfEmpty();
    seedPositiveActionsIfEmpty();
    console.log('Database master dan entitas siap digunakan.');
    return;
  }

  console.log('Mengisi data awal database (seeding)...');
  const tombstones = getTombstones();

  // 1. Settings
  run(`
    INSERT OR IGNORE INTO school_settings (id, app_name, school_name, address, phone, email, logo_url, kop_surat_text, current_academic_year)
    VALUES (
      'settings_default',
      'Sistem Poin Santri Halaqah',
      'Pesantren Tahfizh Al-Qur''an Imam Asy-Syathibi',
      'Jl. Karang Anyar No. 45, Kompleks Islamic Center, Bogor, Jawa Barat',
      '0811-9876-5432 / (0251) 8345678',
      'tahfizh@imamsyathibi.sch.id',
      '/logo.svg',
      'BIDANG PENDIDIKAN DAN KEPENGASUHAN - DIVISI HALAQAH TAHFIZH AL-QUR''AN',
      '2025/2026'
    )
  `);

  // 2. Point Thresholds
  const thresholds = [
    { id: 'th_1', min: 0, max: 19, name: 'AMAN', color: 'emerald', desc: 'Kedisiplinan dan capaian hafalan santri dalam kondisi baik.', order: 1 },
    { id: 'th_2', min: 20, max: 49, name: 'PERLU PEMBINAAN', color: 'amber', desc: 'Perlu bimbingan dan pemantauan berkala oleh Muhafizh.', order: 2 },
    { id: 'th_3', min: 50, max: 74, name: 'PEMBINAAN KHUSUS', color: 'orange', desc: 'Pemanggilan oleh Koordinator Tahfizh dan jadwal murojaah tambahan.', order: 3 },
    { id: 'th_4', min: 75, max: 99, name: 'PERINGATAN RESMI', color: 'rose', desc: 'Penerbitan Surat Peringatan (SP) dan pemanggilan orang tua/wali.', order: 4 },
    { id: 'th_5', min: 100, max: 999, name: 'TINDAKAN LANJUT', color: 'red', desc: 'Sidang Dewan Asatidz dan evaluasi kelanjutan kepesertaan halaqah.', order: 5 },
  ];

  for (const th of thresholds) {
    run(
      `INSERT OR IGNORE INTO point_thresholds (id, minimum_points, maximum_points, status_name, badge_color, description, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [th.id, th.min, th.max, th.name, th.color, th.desc, th.order]
    );
  }

  // 3. Users (Primary default admin: imbs@aldri / admin112)
  const users = [
    { id: 'usr_admin_imbs', name: 'Admin Utama', email: 'imbs@aldri', pass: 'admin112', role: 'admin' },
    { id: 'usr_admin', name: 'Ustadz Farhan, M.Pd (Admin)', email: 'admin@pesantren.id', pass: 'admin123', role: 'admin' },
    { id: 'usr_koor', name: 'Ustadz Ridwan, Lc (Koordinator)', email: 'koordinator@pesantren.id', pass: 'koor123', role: 'coordinator' },
    { id: 'usr_ahmad', name: 'Ustadz Ahmad Al-Hafizh', email: 'ahmad@pesantren.id', pass: 'ahmad123', role: 'teacher' },
    { id: 'usr_muhammad', name: 'Ustadz Muhammad Al-Hafizh', email: 'muhammad@pesantren.id', pass: 'muhammad123', role: 'teacher' },
    { id: 'usr_abdullah', name: 'Ustadz Abdullah Al-Hafizh', email: 'abdullah@pesantren.id', pass: 'abdullah123', role: 'teacher' },
    { id: 'usr_kesantrian', name: 'Ustadz Zulkifli, S.Pd.I (Kepala Kesantrian)', email: 'kesantrian@pesantren.id', pass: 'kesantrian123', role: 'kepala_kesantrian' },
    { id: 'usr_akademik', name: 'Ustadz Abdullah Faruq, M.Pd (Badan Akademik)', email: 'akademik@pesantren.id', pass: 'akademik123', role: 'badan_akademik' },
    { id: 'usr_guru', name: 'Ustadz Herman, S.Pd (Guru Pengajar)', email: 'guru@pesantren.id', pass: 'guru123', role: 'guru' },
  ];

  for (const u of users) {
    if (tombstones.has(u.id)) continue;
    run(
      `INSERT OR IGNORE INTO users (id, name, email, password_hash, role, status)
       VALUES (?, ?, ?, ?, ?, 'active')`,
      [u.id, u.name, u.email, u.pass, u.role]
    );
  }

  // 4. Master Violations - Tahfizh
  const violations = [
    { id: 'v_001', code: 'P001', name: 'Terlambat halaqah (>10 menit)', cat: 'Kedisiplinan', points: 3, desc: "Datang terlambat tanpa udzur syar'i" },
    { id: 'v_002', code: 'P002', name: 'Tidak murojaah mandiri', cat: 'Tahfizh', points: 4, desc: 'Tidak menyelesaikan target lembar murojaah harian' },
    { id: 'v_003', code: 'P003', name: 'Tidak setor hafalan baru', cat: 'Tahfizh', points: 3, desc: 'Tidak menyetorkan ziyadah sesuai target halaqah' },
    { id: 'v_004', code: 'P004', name: 'Alpa / Tidak hadir tanpa izin', cat: 'Kehadiran', points: 10, desc: 'Meninggalkan halaqah tanpa keterangan atau surat izin resmi' },
    { id: 'v_005', code: 'P005', name: 'Tidak mencapai target bulanan', cat: 'Tahfizh', points: 15, desc: 'Evaluasi bulanan di bawah standar target juz' },
    { id: 'v_006', code: 'P006', name: 'Tidur saat kegiatan halaqah', cat: 'Kedisiplinan', points: 5, desc: 'Tidur saat muhafizh menyimak atau tilawah bersama' },
    { id: 'v_007', code: 'P007', name: 'Bercanda berlebihan / mengganggu', cat: 'Adab & Akhlak', points: 8, desc: 'Mengganggu konsentrasi teman halaqah' },
    { id: 'v_008', code: 'P008', name: 'Meninggalkan halaqah sebelum selesai', cat: 'Kedisiplinan', points: 7, desc: 'Keluar halaqah sebelum doa penutup tanpa izin' },
    { id: 'v_009', code: 'P009', name: 'Tidak membawa mushaf standar', cat: 'Kedisiplinan', points: 2, desc: "Tidak membawa Al-Qur'an pojok / rasm Utsmani" },
    { id: 'v_010', code: 'P010', name: 'Membawa gawai / barang terlarang', cat: 'Kedisiplinan', points: 20, desc: 'Membawa HP atau gadget ke area halaqah tanpa izin' },
  ];

  for (const v of violations) {
    if (tombstones.has(v.id)) continue;
    run(
      `INSERT OR IGNORE INTO violations (id, code, name, division, category, description, default_points, status)
       VALUES (?, ?, ?, 'tahfizh', ?, ?, ?, 'active')`,
      [v.id, v.code, v.name, v.cat, v.desc, v.points]
    );
  }

  seedTeachersIfEmpty();
  seedHalaqahIfEmpty();
  seedStudentsIfEmpty();
  seedKesantrianViolationsIfEmpty();
  seedAkademikViolationsIfEmpty();
  seedPositiveActionsIfEmpty();

  logAudit({
    userName: 'System Initialization',
    action: 'SEED_DATABASE',
    tableName: 'all',
    newData: { status: 'Database master aturan dan konfigurasi sistem siap digunakan.' },
  });

  persistDb(false);
  console.log('Inisialisasi database master berhasil.');
}
