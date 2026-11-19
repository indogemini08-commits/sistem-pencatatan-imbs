import { Router, Request, Response } from 'express';
import { query, get, run, logAudit, persistDb, addTombstone } from '../db/database';

const router = Router();

// GET list of violation records with advanced filter & sort
router.get('/', (req: Request, res: Response) => {
  try {
    const {
      division,
      studentId,
      halaqahId,
      teacherId,
      violationId,
      category,
      studentClass,
      academicYear,
      startDate,
      endDate,
      month,
      status = 'all',
      search,
      sortBy = 'date',
      sortDir = 'desc',
    } = req.query;

    let sql = `
      SELECT vr.*,
             COALESCE(s.name, vr.halaqah_name_snapshot) as student_name,
             COALESCE(s.student_number, '-') as student_nis,
             COALESCE(s.gender, 'L') as student_gender,
             h.name as current_halaqah_name,
             t.name as current_teacher_name,
             v.category as violation_category
      FROM violation_records vr
      JOIN students s ON s.id = vr.student_id AND s.status = 'active'
      LEFT JOIN halaqah h ON h.id = vr.halaqah_id
      LEFT JOIN teachers t ON t.id = vr.teacher_id
      LEFT JOIN violations v ON v.id = vr.violation_id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (division && division !== 'all') {
      sql += ` AND vr.division = ?`;
      params.push(division);
    }

    if (status && status !== 'all') {
      sql += ` AND vr.status = ?`;
      params.push(status);
    }

    if (studentId) {
      sql += ` AND vr.student_id = ?`;
      params.push(studentId);
    }

    if (halaqahId) {
      sql += ` AND vr.halaqah_id = ?`;
      params.push(halaqahId);
    }

    if (teacherId) {
      sql += ` AND vr.teacher_id = ?`;
      params.push(teacherId);
    }

    if (violationId) {
      sql += ` AND vr.violation_id = ?`;
      params.push(violationId);
    }

    if (category) {
      sql += ` AND (v.category = ? OR vr.violation_name_snapshot LIKE ?)`;
      params.push(category, `%${category}%`);
    }

    if (studentClass) {
      sql += ` AND vr.student_class_snapshot = ?`;
      params.push(studentClass);
    }

    if (academicYear) {
      sql += ` AND vr.academic_year_snapshot = ?`;
      params.push(academicYear);
    }

    if (startDate) {
      sql += ` AND vr.date >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      sql += ` AND vr.date <= ?`;
      params.push(endDate);
    }

    if (month) {
      // format YYYY-MM
      sql += ` AND vr.date LIKE ?`;
      params.push(`${month}%`);
    }

    if (search) {
      const q = `%${search}%`;
      sql += ` AND (s.name LIKE ? OR s.student_number LIKE ? OR vr.violation_name_snapshot LIKE ? OR vr.notes LIKE ? OR vr.halaqah_name_snapshot LIKE ?)`;
      params.push(q, q, q, q, q);
    }

    // Dynamic sorting
    const validSortCols: Record<string, string> = {
      date: 'vr.date',
      points: 'vr.points_snapshot',
      student: 's.name',
      halaqah: 'vr.halaqah_name_snapshot',
      violation: 'vr.violation_name_snapshot',
      createdAt: 'vr.created_at',
    };

    const orderCol = validSortCols[sortBy as string] || 'vr.date';
    const direction = (sortDir as string)?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    sql += ` ORDER BY ${orderCol} ${direction}, vr.time DESC, vr.created_at DESC`;

    const records = query<any>(sql, params);
    return res.json(records);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST record new violation (AUTO SNAPSHOT OF DATA)
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      studentId,
      studentName,
      studentNis,
      studentClass,
      halaqahId,
      violationId,
      violationName,
      customViolationName,
      customPoints,
      points,
      division,
      locationName,
      supervisorName,
      date,
      time,
      notes,
      evidenceUrl,
      createdBy = 'Muhafizh',
    } = req.body;

    if (!studentId) {
      return res.status(400).json({ error: 'Santri wajib dipilih' });
    }

    if (!violationId && !customViolationName && !violationName) {
      return res.status(400).json({ error: 'Jenis pelanggaran wajib dipilih atau diisi' });
    }

    // 1. Fetch Student (self-healing for serverless ephemeral instances)
    let student = get<any>('SELECT * FROM students WHERE id = ?', [studentId]);
    if (!student && studentName) {
      run(
        `INSERT OR IGNORE INTO students (id, student_number, name, class, gender, academic_year, status)
         VALUES (?, ?, ?, ?, 'L', '2025/2026', 'active')`,
        [studentId, studentNis || studentId, studentName, studentClass || '-']
      );
      student = get<any>('SELECT * FROM students WHERE id = ?', [studentId]);
    }
    if (!student) {
      return res.status(404).json({ error: 'Santri tidak ditemukan' });
    }

    // 2. Fetch Violation Master or Custom Violation
    let violationActualName = (customViolationName || violationName || '').trim();
    let violationPoints = Number(customPoints !== undefined ? customPoints : points) || 0;
    let actualViolationId: string | null = (violationId && violationId !== '__custom__') ? violationId : null;

    if (actualViolationId) {
      let violation = get<any>('SELECT * FROM violations WHERE id = ?', [actualViolationId]);
      if (!violation && violationName) {
        run(
          `INSERT OR IGNORE INTO violations (id, code, name, division, category, description, default_points, status)
           VALUES (?, ?, ?, ?, 'Kedisiplinan', '', ?, 'active')`,
          [actualViolationId, 'CUST_' + String(actualViolationId).substring(0, 5), violationName, division || 'tahfizh', Number(points || 5)]
        );
        violation = get<any>('SELECT * FROM violations WHERE id = ?', [actualViolationId]);
      }
      if (violation) {
        if (!violationActualName) {
          violationActualName = violation.name;
        }
        if (violationPoints <= 0) {
          violationPoints = violation.default_points;
        }
      } else {
        actualViolationId = null;
      }
    }

    if (!violationActualName) {
      return res.status(400).json({ error: 'Nama pelanggaran wajib diisi' });
    }

    if (violationPoints <= 0) {
      return res.status(400).json({ error: 'Bobot poin pelanggaran harus lebih dari 0' });
    }

    // Determine division
    const finalDivision = division === 'kesantrian' ? 'kesantrian' : division === 'akademik' ? 'akademik' : 'tahfizh';

    // 3. Halaqah & Teacher resolution
    const actualHalaqahId = halaqahId || student.halaqah_id;
    let halaqahName = 'Tanpa Halaqah';
    let teacherId = null;
    let teacherName = 'Ustadz Pengampu';

    if (actualHalaqahId) {
      const hInfo = get<any>(`
        SELECT h.*, t.name as t_name
        FROM halaqah h
        LEFT JOIN teachers t ON t.id = h.teacher_id
        WHERE h.id = ?
      `, [actualHalaqahId]);

      if (hInfo) {
        halaqahName = hInfo.name;
        teacherId = hInfo.teacher_id;
        teacherName = hInfo.t_name || 'Ustadz Pengampu';
      }
    }

    // If Kesantrian or Akademik division, allow location and supervisor overrides
    if (finalDivision === 'kesantrian') {
      if (locationName && locationName.trim()) {
        halaqahName = locationName.trim();
      } else {
        halaqahName = 'Asrama & Kesantrian';
      }

      if (supervisorName && supervisorName.trim()) {
        teacherName = supervisorName.trim();
      } else {
        teacherName = createdBy || 'Bagian Kesantrian';
      }
    } else if (finalDivision === 'akademik') {
      if (locationName && locationName.trim()) {
        halaqahName = locationName.trim();
      } else {
        halaqahName = 'Ruang Kelas / KBM';
      }

      if (supervisorName && supervisorName.trim()) {
        teacherName = supervisorName.trim();
      } else {
        teacherName = createdBy || 'Guru Mata Pelajaran';
      }
    }

    // Date and time defaults
    const today = new Date();
    const finalDate = date || today.toISOString().split('T')[0];
    const finalTime = time || today.toTimeString().substring(0, 5);

    const recordId = 'rec_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

    // INSERT with SNAPSHOTS
    run(
      `INSERT INTO violation_records (
        id, student_id, division, halaqah_id, teacher_id, violation_id,
        violation_name_snapshot, points_snapshot, halaqah_name_snapshot,
        teacher_name_snapshot, student_class_snapshot, academic_year_snapshot,
        date, time, notes, evidence_url, status, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, datetime('now', 'localtime'))`,
      [
        recordId,
        student.id,
        finalDivision,
        finalDivision === 'tahfizh' ? (actualHalaqahId || null) : null,
        finalDivision === 'tahfizh' ? (teacherId || null) : null,
        actualViolationId,
        violationActualName,      // Snapshot name (Custom or Master)
        violationPoints,          // Snapshot points (Custom or Master)
        halaqahName,              // Snapshot halaqah / lokasi
        teacherName,              // Snapshot teacher / pembina
        student.class,            // Snapshot student class at this moment
        student.academic_year || '2025/2026',
        finalDate,
        finalTime,
        notes ? notes.trim() : '',
        evidenceUrl || '',
        createdBy,
      ]
    );

    // Calculate new total points for this student
    const totalPointsRow = get<any>(`
      SELECT COALESCE(SUM(points_snapshot), 0) as total,
             COALESCE(SUM(CASE WHEN division = 'tahfizh' THEN points_snapshot ELSE 0 END), 0) as tahfizh_points,
             COALESCE(SUM(CASE WHEN division = 'kesantrian' THEN points_snapshot ELSE 0 END), 0) as kesantrian_points,
             COALESCE(SUM(CASE WHEN division = 'akademik' THEN points_snapshot ELSE 0 END), 0) as akademik_points
      FROM violation_records
      WHERE student_id = ? AND status = 'active'
    `, [student.id]);

    const newTotalPoints = Number(totalPointsRow?.total || 0);
    const tahfizhPoints = Number(totalPointsRow?.tahfizh_points || 0);
    const kesantrianPoints = Number(totalPointsRow?.kesantrian_points || 0);
    const akademikPoints = Number(totalPointsRow?.akademik_points || 0);

    logAudit({
      userName: createdBy,
      action: 'RECORD_VIOLATION',
      tableName: 'violation_records',
      recordId: recordId,
      newData: {
        student: student.name,
        violation: violationActualName,
        division: finalDivision,
        points: violationPoints,
        newTotalPoints,
        tahfizhPoints,
        kesantrianPoints,
        akademikPoints,
      },
    });

    await persistDb();

    return res.status(201).json({
      message: 'Pelanggaran berhasil dicatat.',
      recordId,
      studentName: student.name,
      violationName: violationActualName,
      division: finalDivision,
      points: violationPoints,
      newTotalPoints,
      tahfizhPoints,
      kesantrianPoints,
      akademikPoints,
    });
  } catch (err: any) {
    console.error('Record violation error:', err);
    return res.status(500).json({ error: 'Data belum berhasil disimpan. Silakan coba kembali.' });
  }
});

// PUT cancel / soft delete record
router.put('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { cancellationReason, actorName = 'Admin' } = req.body;

    const record = get<any>('SELECT * FROM violation_records WHERE id = ?', [id]);
    if (!record) return res.status(404).json({ error: 'Catatan pelanggaran tidak ditemukan' });

    if (record.status === 'cancelled') {
      return res.status(400).json({ error: 'Catatan pelanggaran ini sudah dibatalkan sebelumnya' });
    }

    run(
      `UPDATE violation_records
       SET status = 'cancelled', cancelled_at = datetime('now', 'localtime'), cancelled_by = ?, cancellation_reason = ?
       WHERE id = ?`,
      [actorName, cancellationReason || 'Dibatalkan oleh pengawas', id]
    );
    await persistDb();

    logAudit({
      userName: actorName,
      action: 'CANCEL_VIOLATION_RECORD',
      tableName: 'violation_records',
      recordId: id,
      oldData: { status: 'active', points: record.points_snapshot },
      newData: { status: 'cancelled', reason: cancellationReason },
    });

    return res.json({ success: true, message: 'Catatan pelanggaran berhasil dibatalkan. Total poin santri telah diperbarui otomatis.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE hard delete record (Admin only)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { actorName = 'Admin' } = req.body || {};

    const record = get<any>('SELECT * FROM violation_records WHERE id = ?', [id]);
    if (!record) {
      return res.json({ success: true, message: 'Catatan pelanggaran sudah tidak ada atau telah dihapus' });
    }

    run('DELETE FROM violation_records WHERE id = ?', [id]);
    addTombstone(id, 'record');
    await persistDb();

    logAudit({
      userName: actorName,
      action: 'HARD_DELETE_VIOLATION_RECORD',
      tableName: 'violation_records',
      recordId: id,
      oldData: record,
    });

    return res.json({ success: true, message: 'Catatan pelanggaran berhasil dihapus permanen' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST bulk delete records (Admin only)
router.post('/bulk-delete', async (req: Request, res: Response) => {
  try {
    const { ids, actorName = 'Admin' } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Daftar ID catatan wajib diisi' });
    }

    const deleted: string[] = [];
    const skipped: string[] = [];

    for (const id of ids) {
      const record = get<any>('SELECT id FROM violation_records WHERE id = ?', [id]);
      if (!record) {
        skipped.push(id);
        continue;
      }
      run('DELETE FROM violation_records WHERE id = ?', [id]);
      addTombstone(id, 'record');
      logAudit({
        userName: actorName,
        action: 'BULK_DELETE_VIOLATION_RECORD',
        tableName: 'violation_records',
        recordId: id,
      });
      deleted.push(id);
    }

    await persistDb();
    return res.json({
      success: true,
      deletedCount: deleted.length,
      skippedCount: skipped.length,
      deletedIds: deleted,
      message: `${deleted.length} catatan pelanggaran berhasil dihapus permanen`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Gagal menghapus catatan secara massal' });
  }
});

// GET dashboard statistics & analytics
router.get('/stats', (req: Request, res: Response) => {
  try {
    const { division } = req.query;
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7);

    const hasDivisionFilter = division && division !== 'all';
    const divisionFilterSql = hasDivisionFilter ? `AND vr.division = '${division}'` : '';

    const totalStudents = get<any>('SELECT COUNT(*) as count FROM students WHERE status = "active"')?.count || 0;
    const totalTeachers = get<any>('SELECT COUNT(*) as count FROM teachers WHERE status = "active"')?.count || 0;
    const totalHalaqah = get<any>('SELECT COUNT(*) as count FROM halaqah WHERE status = "active"')?.count || 0;
    
    const totalRecords = get<any>(`SELECT COUNT(*) as count FROM violation_records vr JOIN students s ON s.id = vr.student_id AND s.status = 'active' WHERE vr.status = "active" ${divisionFilterSql}`)?.count || 0;
    const totalPoints = get<any>(`SELECT COALESCE(SUM(vr.points_snapshot), 0) as total FROM violation_records vr JOIN students s ON s.id = vr.student_id AND s.status = 'active' WHERE vr.status = "active" ${divisionFilterSql}`)?.total || 0;

    const tahfizhRecordsCount = get<any>('SELECT COUNT(*) as count FROM violation_records vr JOIN students s ON s.id = vr.student_id AND s.status = "active" WHERE vr.status = "active" AND vr.division = "tahfizh"')?.count || 0;
    const tahfizhTotalPoints = get<any>('SELECT COALESCE(SUM(vr.points_snapshot), 0) as total FROM violation_records vr JOIN students s ON s.id = vr.student_id AND s.status = "active" WHERE vr.status = "active" AND vr.division = "tahfizh"')?.total || 0;

    const kesantrianRecordsCount = get<any>('SELECT COUNT(*) as count FROM violation_records vr JOIN students s ON s.id = vr.student_id AND s.status = "active" WHERE vr.status = "active" AND vr.division = "kesantrian"')?.count || 0;
    const kesantrianTotalPoints = get<any>('SELECT COALESCE(SUM(vr.points_snapshot), 0) as total FROM violation_records vr JOIN students s ON s.id = vr.student_id AND s.status = "active" WHERE vr.status = "active" AND vr.division = "kesantrian"')?.total || 0;

    const akademikRecordsCount = get<any>('SELECT COUNT(*) as count FROM violation_records vr JOIN students s ON s.id = vr.student_id AND s.status = "active" WHERE vr.status = "active" AND vr.division = "akademik"')?.count || 0;
    const akademikTotalPoints = get<any>('SELECT COALESCE(SUM(vr.points_snapshot), 0) as total FROM violation_records vr JOIN students s ON s.id = vr.student_id AND s.status = "active" WHERE vr.status = "active" AND vr.division = "akademik"')?.total || 0;

    const todayCount = get<any>(`SELECT COUNT(*) as count FROM violation_records vr JOIN students s ON s.id = vr.student_id AND s.status = "active" WHERE vr.date = ? AND vr.status = "active" ${divisionFilterSql}`, [today])?.count || 0;
    const monthCount = get<any>(`SELECT COUNT(*) as count FROM violation_records vr JOIN students s ON s.id = vr.student_id AND s.status = "active" WHERE vr.date LIKE ? AND vr.status = "active" ${divisionFilterSql}`, [`${currentMonth}%`])?.count || 0;

    const totalPositiveRecords = get<any>(`SELECT COUNT(*) as count FROM positive_records pr JOIN students s ON s.id = pr.student_id AND s.status = "active" WHERE pr.status = "active" ${hasDivisionFilter ? `AND pr.division = '${division}'` : ''}`)?.count || 0;
    const totalPointsDeducted = get<any>(`SELECT COALESCE(SUM(pr.points_deducted), 0) as total FROM positive_records pr JOIN students s ON s.id = pr.student_id AND s.status = "active" WHERE pr.status = "active" ${hasDivisionFilter ? `AND pr.division = '${division}'` : ''}`)?.total || 0;

    const tahfizhDeductedPoints = get<any>('SELECT COALESCE(SUM(pr.points_deducted), 0) as total FROM positive_records pr JOIN students s ON s.id = pr.student_id AND s.status = "active" WHERE pr.status = "active" AND pr.division = "tahfizh"')?.total || 0;
    const kesantrianDeductedPoints = get<any>('SELECT COALESCE(SUM(pr.points_deducted), 0) as total FROM positive_records pr JOIN students s ON s.id = pr.student_id AND s.status = "active" WHERE pr.status = "active" AND pr.division = "kesantrian"')?.total || 0;
    const akademikDeductedPoints = get<any>('SELECT COALESCE(SUM(pr.points_deducted), 0) as total FROM positive_records pr JOIN students s ON s.id = pr.student_id AND s.status = "active" WHERE pr.status = "active" AND pr.division = "akademik"')?.total || 0;

    // Thresholds
    const thresholds = query<any>('SELECT * FROM point_thresholds ORDER BY sort_order ASC');

    // Fetch positive deductions per student
    const deductionsList = query<any>(`
      SELECT student_id,
             COALESCE(SUM(points_deducted), 0) as total_deducted,
             COALESCE(SUM(CASE WHEN division = 'tahfizh' THEN points_deducted ELSE 0 END), 0) as tahfizh_deducted,
             COALESCE(SUM(CASE WHEN division = 'kesantrian' THEN points_deducted ELSE 0 END), 0) as kesantrian_deducted,
             COALESCE(SUM(CASE WHEN division = 'akademik' THEN points_deducted ELSE 0 END), 0) as akademik_deducted
      FROM positive_records
      WHERE status = 'active'
      GROUP BY student_id
    `);

    const deductionsMap = new Map<string, any>();
    for (const d of deductionsList) {
      deductionsMap.set(d.student_id, d);
    }

    // Students with violations (strictly active students)
    const rawStudentPoints = query<any>(`
      SELECT s.id, s.name, s.student_number, s.class, h.name as halaqah_name,
             COALESCE(SUM(vr.points_snapshot), 0) as gross_total_points,
             COALESCE(SUM(CASE WHEN vr.division = 'tahfizh' THEN vr.points_snapshot ELSE 0 END), 0) as gross_tahfizh_points,
             COALESCE(SUM(CASE WHEN vr.division = 'kesantrian' THEN vr.points_snapshot ELSE 0 END), 0) as gross_kesantrian_points,
             COALESCE(SUM(CASE WHEN vr.division = 'akademik' THEN vr.points_snapshot ELSE 0 END), 0) as gross_akademik_points,
             COUNT(vr.id) as violation_count
      FROM students s
      LEFT JOIN halaqah h ON h.id = s.halaqah_id
      JOIN violation_records vr ON vr.student_id = s.id AND vr.status = 'active'
      WHERE s.status = 'active'
      ${hasDivisionFilter ? `AND vr.division = '${division}'` : ''}
      GROUP BY s.id
    `);

    const enrichedStudents = rawStudentPoints.map((s: any) => {
      const d = deductionsMap.get(s.id) || {};
      const deductedTahfizh = Number(d.tahfizh_deducted || 0);
      const deductedKesantrian = Number(d.kesantrian_deducted || 0);
      const deductedAkademik = Number(d.akademik_deducted || 0);
      const grossTahfizh = Number(s.gross_tahfizh_points || 0);
      const grossKesantrian = Number(s.gross_kesantrian_points || 0);
      const grossAkademik = Number(s.gross_akademik_points || 0);

      const netTahfizh = Math.max(0, grossTahfizh - deductedTahfizh);
      const netKesantrian = Math.max(0, grossKesantrian - deductedKesantrian);
      const netAkademik = Math.max(0, grossAkademik - deductedAkademik);
      const netTotal = hasDivisionFilter
        ? (division === 'tahfizh' ? netTahfizh : division === 'kesantrian' ? netKesantrian : netAkademik)
        : (netTahfizh + netKesantrian + netAkademik);

      return {
        id: s.id,
        name: s.name,
        student_number: s.student_number,
        class: s.class,
        halaqah_name: s.halaqah_name,
        total_points: netTotal,
        gross_points: Number(s.gross_total_points || 0),
        tahfizh_points: netTahfizh,
        kesantrian_points: netKesantrian,
        akademik_points: netAkademik,
        tahfizh_deductions: deductedTahfizh,
        kesantrian_deductions: deductedKesantrian,
        akademik_deductions: deductedAkademik,
        total_deductions: deductedTahfizh + deductedKesantrian + deductedAkademik,
        violation_count: s.violation_count,
      };
    });

    // Top 10 students with highest points
    const topStudents = [...enrichedStudents]
      .sort((a, b) => b.total_points - a.total_points)
      .slice(0, 10);

    // Violations by category (LEFT JOIN so records with deleted/custom violations are never lost)
    const byCategory = query<any>(`
      SELECT COALESCE(v.category, 'Kedisiplinan') as category,
             COALESCE(vr.division, 'tahfizh') as division,
             COUNT(vr.id) as count,
             COALESCE(SUM(vr.points_snapshot), 0) as points
      FROM violation_records vr
      JOIN students s ON s.id = vr.student_id AND s.status = 'active'
      LEFT JOIN violations v ON v.id = vr.violation_id
      WHERE vr.status = 'active' ${divisionFilterSql}
      GROUP BY COALESCE(v.category, 'Kedisiplinan'), COALESCE(vr.division, 'tahfizh')
      ORDER BY count DESC
    `);

    // Points per halaqah
    const pointsByHalaqah = query<any>(`
      SELECT vr.halaqah_name_snapshot as halaqah_name,
             COUNT(vr.id) as violation_count,
             COALESCE(SUM(vr.points_snapshot), 0) as total_points
      FROM violation_records vr
      JOIN students s ON s.id = vr.student_id AND s.status = 'active'
      WHERE vr.status = 'active' ${divisionFilterSql}
      GROUP BY vr.halaqah_name_snapshot
      ORDER BY total_points DESC
    `);

    // 1. Weekly Trend (7 days: Monday to Sunday of current week)
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const dayOfWeek = now.getDay();
    const distToMon = (dayOfWeek + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - distToMon);

    const dayNames = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'];
    const shortDays = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Ahd'];

    const weekStartDate = new Date(monday).toISOString().split('T')[0];
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const weekEndDate = sunday.toISOString().split('T')[0];

    const weekViolations = query<any>(`
      SELECT vr.date, vr.division,
             COUNT(vr.id) as count,
             COALESCE(SUM(vr.points_snapshot), 0) as points
      FROM violation_records vr
      JOIN students s ON s.id = vr.student_id AND s.status = 'active'
      WHERE vr.status = 'active' AND vr.date >= ? AND vr.date <= ? ${divisionFilterSql}
      GROUP BY vr.date, vr.division
    `, [weekStartDate, weekEndDate]);

    const weekPositives = query<any>(`
      SELECT pr.date, pr.division,
             COUNT(pr.id) as count,
             COALESCE(SUM(pr.points_deducted), 0) as points
      FROM positive_records pr
      JOIN students s ON s.id = pr.student_id AND s.status = 'active'
      WHERE pr.status = 'active' AND pr.date >= ? AND pr.date <= ? ${hasDivisionFilter ? `AND pr.division = '${division}'` : ''}
      GROUP BY pr.date, pr.division
    `, [weekStartDate, weekEndDate]);

    const weeklyTrend: Array<any> = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dStr = d.toISOString().split('T')[0];

      const vDay = weekViolations.filter((v: any) => v.date === dStr);
      const pDay = weekPositives.filter((p: any) => p.date === dStr);

      const tahfizhV = vDay.find((v: any) => v.division === 'tahfizh');
      const kesantrianV = vDay.find((v: any) => v.division === 'kesantrian');
      const akademikV = vDay.find((v: any) => v.division === 'akademik');

      weeklyTrend.push({
        date: dStr,
        dayName: dayNames[i],
        shortDay: shortDays[i],
        isToday: dStr === todayStr,
        count: vDay.reduce((sum: number, v: any) => sum + Number(v.count || 0), 0),
        points: vDay.reduce((sum: number, v: any) => sum + Number(v.points || 0), 0),
        tahfizhCount: Number(tahfizhV?.count || 0),
        tahfizhPoints: Number(tahfizhV?.points || 0),
        kesantrianCount: Number(kesantrianV?.count || 0),
        kesantrianPoints: Number(kesantrianV?.points || 0),
        akademikCount: Number(akademikV?.count || 0),
        akademikPoints: Number(akademikV?.points || 0),
        positiveCount: pDay.reduce((sum: number, p: any) => sum + Number(p.count || 0), 0),
        positivePoints: pDay.reduce((sum: number, p: any) => sum + Number(p.points || 0), 0),
      });
    }

    // 2. Current Month Trends (4 Weeks and Days)
    const monthYearStr = todayStr.substring(0, 7);
    const monthViolations = query<any>(`
      SELECT vr.date, vr.division,
             COUNT(vr.id) as count,
             COALESCE(SUM(vr.points_snapshot), 0) as points
      FROM violation_records vr
      JOIN students s ON s.id = vr.student_id AND s.status = 'active'
      WHERE vr.status = 'active' AND vr.date LIKE ? ${divisionFilterSql}
      GROUP BY vr.date, vr.division
    `, [`${monthYearStr}%`]);

    const monthPositives = query<any>(`
      SELECT pr.date, pr.division,
             COUNT(pr.id) as count,
             COALESCE(SUM(pr.points_deducted), 0) as points
      FROM positive_records pr
      JOIN students s ON s.id = pr.student_id AND s.status = 'active'
      WHERE pr.status = 'active' AND pr.date LIKE ? ${hasDivisionFilter ? `AND pr.division = '${division}'` : ''}
      GROUP BY pr.date, pr.division
    `, [`${monthYearStr}%`]);

    const year = now.getFullYear();
    const month = now.getMonth();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const weekRanges = [
      { label: 'Pekan 1', start: 1, end: 7, rangeText: '1 - 7' },
      { label: 'Pekan 2', start: 8, end: 14, rangeText: '8 - 14' },
      { label: 'Pekan 3', start: 15, end: 21, rangeText: '15 - 21' },
      { label: 'Pekan 4', start: 22, end: totalDaysInMonth, rangeText: `22 - ${totalDaysInMonth}` },
    ];

    const monthWeeksTrend = weekRanges.map((wr) => {
      const vWeek = monthViolations.filter((v: any) => {
        const day = parseInt(v.date.split('-')[2], 10);
        return day >= wr.start && day <= wr.end;
      });
      const pWeek = monthPositives.filter((p: any) => {
        const day = parseInt(p.date.split('-')[2], 10);
        return day >= wr.start && day <= wr.end;
      });

      const tahfizhV = vWeek.filter((v: any) => v.division === 'tahfizh');
      const kesantrianV = vWeek.filter((v: any) => v.division === 'kesantrian');
      const akademikV = vWeek.filter((v: any) => v.division === 'akademik');

      return {
        weekLabel: wr.label,
        dateRange: `Tgl ${wr.rangeText}`,
        count: vWeek.reduce((sum: number, v: any) => sum + Number(v.count || 0), 0),
        points: vWeek.reduce((sum: number, v: any) => sum + Number(v.points || 0), 0),
        tahfizhCount: tahfizhV.reduce((sum: number, v: any) => sum + Number(v.count || 0), 0),
        tahfizhPoints: tahfizhV.reduce((sum: number, v: any) => sum + Number(v.points || 0), 0),
        kesantrianCount: kesantrianV.reduce((sum: number, v: any) => sum + Number(v.count || 0), 0),
        kesantrianPoints: kesantrianV.reduce((sum: number, v: any) => sum + Number(v.points || 0), 0),
        akademikCount: akademikV.reduce((sum: number, v: any) => sum + Number(v.count || 0), 0),
        akademikPoints: akademikV.reduce((sum: number, v: any) => sum + Number(v.points || 0), 0),
        positiveCount: pWeek.reduce((sum: number, p: any) => sum + Number(p.count || 0), 0),
        positivePoints: pWeek.reduce((sum: number, p: any) => sum + Number(p.points || 0), 0),
      };
    });

    const monthDaysTrend = [];
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dStr = `${monthYearStr}-${String(day).padStart(2, '0')}`;
      const vDay = monthViolations.filter((v: any) => v.date === dStr);
      const pDay = monthPositives.filter((p: any) => p.date === dStr);

      const tahfizhV = vDay.find((v: any) => v.division === 'tahfizh');
      const kesantrianV = vDay.find((v: any) => v.division === 'kesantrian');
      const akademikV = vDay.find((v: any) => v.division === 'akademik');

      const dateObj = new Date(year, month, day);
      const dayIdx = (dateObj.getDay() + 6) % 7;

      monthDaysTrend.push({
        date: dStr,
        dayNumber: day,
        dayName: dayNames[dayIdx],
        shortDay: `${day}`,
        isToday: dStr === todayStr,
        count: vDay.reduce((sum: number, v: any) => sum + Number(v.count || 0), 0),
        points: vDay.reduce((sum: number, v: any) => sum + Number(v.points || 0), 0),
        tahfizhCount: Number(tahfizhV?.count || 0),
        tahfizhPoints: Number(tahfizhV?.points || 0),
        kesantrianCount: Number(kesantrianV?.count || 0),
        kesantrianPoints: Number(kesantrianV?.points || 0),
        akademikCount: Number(akademikV?.count || 0),
        akademikPoints: Number(akademikV?.points || 0),
        positiveCount: pDay.reduce((sum: number, p: any) => sum + Number(p.count || 0), 0),
        positivePoints: pDay.reduce((sum: number, p: any) => sum + Number(p.points || 0), 0),
      });
    }

    // 3. Violations per month (last 6 months with division & positive breakdown)
    const rawMonthly = query<any>(`
      SELECT substr(vr.date, 1, 7) as month,
             vr.division,
             COUNT(vr.id) as count,
             COALESCE(SUM(vr.points_snapshot), 0) as points
      FROM violation_records vr
      JOIN students s ON s.id = vr.student_id AND s.status = 'active'
      WHERE vr.status = 'active' ${divisionFilterSql}
      GROUP BY month, vr.division
      ORDER BY month ASC
    `);

    const rawMonthlyPos = query<any>(`
      SELECT substr(pr.date, 1, 7) as month,
             COUNT(pr.id) as count,
             COALESCE(SUM(pr.points_deducted), 0) as points
      FROM positive_records pr
      JOIN students s ON s.id = pr.student_id AND s.status = 'active'
      WHERE pr.status = 'active' ${hasDivisionFilter ? `AND pr.division = '${division}'` : ''}
      GROUP BY month
    `);

    const last6Months: string[] = [];
    for (let m = 5; m >= 0; m--) {
      const d = new Date(year, month - m, 1);
      last6Months.push(d.toISOString().substring(0, 7));
    }

    const monthlyTrend = last6Months.map((mStr) => {
      const vMonth = rawMonthly.filter((r: any) => r.month === mStr);
      const pMonth = rawMonthlyPos.find((r: any) => r.month === mStr);

      const tahfizhV = vMonth.find((r: any) => r.division === 'tahfizh');
      const kesantrianV = vMonth.find((r: any) => r.division === 'kesantrian');
      const akademikV = vMonth.find((r: any) => r.division === 'akademik');

      return {
        month: mStr,
        count: vMonth.reduce((sum: number, r: any) => sum + Number(r.count || 0), 0),
        points: vMonth.reduce((sum: number, r: any) => sum + Number(r.points || 0), 0),
        tahfizhCount: Number(tahfizhV?.count || 0),
        tahfizhPoints: Number(tahfizhV?.points || 0),
        kesantrianCount: Number(kesantrianV?.count || 0),
        kesantrianPoints: Number(kesantrianV?.points || 0),
        akademikCount: Number(akademikV?.count || 0),
        akademikPoints: Number(akademikV?.points || 0),
        positiveCount: Number(pMonth?.count || 0),
        positivePoints: Number(pMonth?.points || 0),
      };
    });

    // Santri needing attention (e.g. points >= 20)
    const attentionThreshold = thresholds.find((t: any) => t.minimum_points > 0)?.minimum_points || 20;
    const studentsNeedingAttention = enrichedStudents
      .filter((s: any) => s.total_points >= attentionThreshold)
      .sort((a: any, b: any) => b.total_points - a.total_points);

    return res.json({
      summary: {
        totalStudents,
        totalTeachers,
        totalHalaqah,
        totalRecords,
        totalPoints,
        todayCount,
        monthCount,
        tahfizhRecordsCount,
        tahfizhTotalPoints,
        kesantrianRecordsCount,
        kesantrianTotalPoints,
        akademikRecordsCount,
        akademikTotalPoints,
        totalPositiveRecords,
        totalPointsDeducted,
        tahfizhDeductedPoints,
        kesantrianDeductedPoints,
        akademikDeductedPoints,
        netTotalPoints: Math.max(0, totalPoints - totalPointsDeducted),
      },
      topStudents,
      byCategory,
      pointsByHalaqah,
      monthlyTrend,
      weeklyTrend,
      monthWeeksTrend,
      monthDaysTrend,
      studentsNeedingAttention,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
