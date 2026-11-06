import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Clock,
  UserCheck,
  BookOpen,
  Award,
  Sparkles,
  RotateCcw,
  Eye,
  FileText,
  Building2,
  GraduationCap,
  Search,
  MapPin,
} from 'lucide-react';
import { User, Halaqah, Student, MasterViolation, ViolationDivision } from '../types';
import { api } from '../services/api';

interface QuickViolationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onSuccess?: () => void;
  onViewHistory?: () => void;
  initialDivision?: ViolationDivision;
}

export const QuickViolationModal: React.FC<QuickViolationModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSuccess,
  onViewHistory,
  initialDivision = 'tahfizh',
}) => {
  const [division, setDivision] = useState<ViolationDivision>(initialDivision);

  // Halaqah data (for Tahfizh)
  const [halaqahs, setHalaqahs] = useState<Halaqah[]>([]);
  const [selectedHalaqahId, setSelectedHalaqahId] = useState<string>('');
  const [halaqahStudents, setHalaqahStudents] = useState<Student[]>([]);

  // All Students data (for Kesantrian direct search)
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [studentSearch, setStudentSearch] = useState<string>('');

  // Selected student
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  // Violations Master
  const [violations, setViolations] = useState<MasterViolation[]>([]);
  const [selectedViolationId, setSelectedViolationId] = useState<string>('');
  const [points, setPoints] = useState<number>(0);

  // Kesantrian specific fields
  const [locationName, setLocationName] = useState<string>('Asrama Putra');
  const [supervisorName, setSupervisorName] = useState<string>('');

  // Common fields
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successData, setSuccessData] = useState<{
    studentName: string;
    violationName: string;
    division: ViolationDivision;
    points: number;
    newTotalPoints: number;
    tahfizhPoints?: number;
    kesantrianPoints?: number;
    akademikPoints?: number;
  } | null>(null);

  // Initialize date & time and fetch options
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      setDate(now.toISOString().split('T')[0]);
      setTime(now.toTimeString().substring(0, 5));
      setSuccessData(null);
      setErrorMsg('');
      setDivision(initialDivision);
      setSupervisorName(currentUser?.name || '');

      loadInitialData();
    }
  }, [isOpen, currentUser, initialDivision]);

  const loadInitialData = async () => {
    try {
      // 1. Fetch halaqahs & all students in parallel
      const [allHalaqahs, studentList, vList] = await Promise.all([
        api.halaqah.list(),
        api.students.list(),
        api.violations.list(),
      ]);

      let accessibleHalaqahs = allHalaqahs;
      if (currentUser?.role === 'teacher') {
        const teacherId = currentUser.teacherId;
        if (teacherId) {
          accessibleHalaqahs = allHalaqahs.filter((h) => h.teacher_id === teacherId);
        } else if (currentUser.assignedHalaqahs && currentUser.assignedHalaqahs.length > 0) {
          accessibleHalaqahs = currentUser.assignedHalaqahs;
        }
      }

      setHalaqahs(accessibleHalaqahs);
      setAllStudents(studentList.filter((s) => s.status === 'active'));

      if (accessibleHalaqahs.length > 0) {
        setSelectedHalaqahId(accessibleHalaqahs[0].id);
      }

      // 2. Set master violations
      const activeViolations = vList.filter((v) => v.status === 'active');
      setViolations(activeViolations);
    } catch (err: any) {
      setErrorMsg('Gagal memuat data halaqah dan pelanggaran: ' + err.message);
    }
  };

  // When halaqah changes, fetch students in that halaqah (for Tahfizh mode)
  useEffect(() => {
    if (division === 'tahfizh' && selectedHalaqahId) {
      fetchStudentsForHalaqah(selectedHalaqahId);
    } else if (division === 'tahfizh') {
      setHalaqahStudents([]);
      setSelectedStudentId('');
    }
  }, [selectedHalaqahId, division]);

  const fetchStudentsForHalaqah = async (hId: string) => {
    try {
      const sList = await api.halaqah.getStudents(hId);
      setHalaqahStudents(sList);
      if (sList.length > 0) {
        setSelectedStudentId(sList[0].id);
      } else {
        setSelectedStudentId('');
      }
    } catch (err: any) {
      setErrorMsg('Gagal memuat daftar santri di halaqah ini: ' + err.message);
    }
  };

  // Filtered master violations according to currently active division
  const currentDivisionViolations = useMemo(() => {
    return violations.filter((v) => (v.division || 'tahfizh') === division);
  }, [violations, division]);

  // Filtered all-students for Kesantrian search
  const filteredAllStudents = useMemo(() => {
    if (!studentSearch.trim()) return allStudents;
    const q = studentSearch.toLowerCase();
    return allStudents.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.student_number.toLowerCase().includes(q) ||
        s.class.toLowerCase().includes(q)
    );
  }, [allStudents, studentSearch]);

  // When selected violation changes, automatically set points (READ-ONLY)
  useEffect(() => {
    const found = violations.find((v) => v.id === selectedViolationId);
    if (found) {
      setPoints(found.default_points);
    } else {
      setPoints(0);
    }
  }, [selectedViolationId, violations]);

  const handleResetForNext = () => {
    setSuccessData(null);
    setSelectedViolationId('');
    setPoints(0);
    setNotes('');
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Validations
    if (division === 'tahfizh' && !selectedHalaqahId) {
      setErrorMsg('Silakan pilih Halaqah terlebih dahulu.');
      return;
    }
    if (!selectedStudentId) {
      setErrorMsg('Silakan pilih Santri yang melakukan pelanggaran.');
      return;
    }
    if (!selectedViolationId) {
      setErrorMsg('Silakan pilih Jenis Pelanggaran dari master list.');
      return;
    }
    if (points <= 0) {
      setErrorMsg('Poin pelanggaran tidak valid.');
      return;
    }

    setLoading(true);
    try {
      const studentObj =
        (division === 'tahfizh' ? halaqahStudents : allStudents).find((s) => s.id === selectedStudentId) ||
        allStudents.find((s) => s.id === selectedStudentId);
      const violationObj = violations.find((v) => v.id === selectedViolationId);

      const res = await api.records.create({
        studentId: selectedStudentId,
        studentName: studentObj?.name,
        studentNis: studentObj?.student_number,
        studentClass: studentObj?.class,
        halaqahId: division === 'tahfizh' ? selectedHalaqahId : null,
        violationId: selectedViolationId,
        violationName: violationObj?.name,
        points: violationObj?.default_points || points,
        division: division,
        locationName: division === 'kesantrian' ? locationName : undefined,
        supervisorName: division === 'kesantrian' ? (supervisorName || currentUser?.name) : undefined,
        date: date,
        time: time,
        notes: notes,
        createdBy: currentUser?.name || (division === 'tahfizh' ? 'Muhafizh' : 'Bagian Kesantrian'),
      });

      setSuccessData({
        studentName: res.studentName || studentObj?.name || 'Santri',
        violationName: res.violationName || violationObj?.name || 'Pelanggaran',
        division: res.division || division,
        points: res.points,
        newTotalPoints: res.newTotalPoints,
        tahfizhPoints: res.tahfizhPoints,
        kesantrianPoints: res.kesantrianPoints,
      });

      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Data belum berhasil disimpan. Silakan coba kembali.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg m-auto h-auto max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3.5rem)] flex flex-col bg-white dark:bg-[#111726] rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 dark:border-white/[0.08] overflow-hidden transition-colors">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0d1222] via-[#1e1b4b] to-[#0f172a] text-white p-4 sm:p-6 relative shrink-0 border-b border-indigo-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="p-2 sm:p-2.5 bg-indigo-500/20 rounded-2xl backdrop-blur-sm ring-1 ring-indigo-400/30 shrink-0">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-300" />
              </div>
              <div>
                <h2 className="text-base sm:text-xl font-bold tracking-tight text-white">Catat Pelanggaran Santri</h2>
                <p className="text-[11px] sm:text-xs text-indigo-200/80 font-light">
                  Pencatatan resmi terpadu dengan bobot poin otomatis
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Division Switcher Tabs */}
          {!successData && (
            <div className="grid grid-cols-3 bg-black/40 p-1.5 rounded-2xl border border-white/10 mt-3 sm:mt-4 gap-1.5 shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setDivision('tahfizh');
                  setSelectedViolationId('');
                  setErrorMsg('');
                }}
                className={`min-h-[42px] py-2 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${
                  division === 'tahfizh'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/30 ring-1 ring-emerald-400/40'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                <span className="truncate">Tahfizh</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDivision('kesantrian');
                  setSelectedViolationId('');
                  setErrorMsg('');
                }}
                className={`min-h-[42px] py-2 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${
                  division === 'kesantrian'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 ring-1 ring-blue-400/40'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                <span className="truncate">Kesantrian</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDivision('akademik');
                  setSelectedViolationId('');
                  setErrorMsg('');
                  if (!locationName || locationName === 'Asrama Putra') {
                    setLocationName('Ruang Kelas / KBM');
                  }
                }}
                className={`min-h-[42px] py-2 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${
                  division === 'akademik'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30 ring-1 ring-purple-400/40'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                <span className="truncate">Akademik</span>
              </button>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-3.5 sm:p-6 overflow-y-auto flex-1 min-h-0">
          {/* SUCCESS STATE */}
          {successData ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3 ring-8 ring-emerald-50 dark:ring-emerald-900/20">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-1">
                Pelanggaran Berhasil Dicatat!
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-5">
                Data telah tersimpan permanen dan terakumulasi ke profil santri.
              </p>

              <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-4 border border-slate-200 dark:border-white/[0.08] text-left mb-6 space-y-2.5">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Divisi Bagian:</span>
                  <span className={`font-bold px-2.5 py-0.5 rounded-lg text-xs flex items-center gap-1 ${
                    successData.division === 'kesantrian'
                      ? 'bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40'
                      : successData.division === 'akademik'
                      ? 'bg-purple-100 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-900/40'
                      : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40'
                  }`}>
                    {successData.division === 'kesantrian' ? '🏢 Bagian Kesantrian' : successData.division === 'akademik' ? '📚 Bagian Akademik' : '🕌 Bagian Tahfizh'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Santri:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{successData.studentName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Pelanggaran:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{successData.violationName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Poin Pelanggaran:</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">+{successData.points} Poin</span>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-white/[0.08] space-y-1.5">
                  <div className="flex justify-between text-sm items-center">
                    <span className="font-bold text-slate-800 dark:text-slate-100">Total Akumulasi Poin:</span>
                    <span className="font-black text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 px-3 py-1 rounded-xl border border-rose-200 dark:border-rose-900/40 text-base">
                      {successData.newTotalPoints} Poin
                    </span>
                  </div>
                  {(successData.tahfizhPoints !== undefined || successData.kesantrianPoints !== undefined || successData.akademikPoints !== undefined) && (
                    <div className="flex items-center justify-end gap-1.5 flex-wrap text-xs text-slate-500 dark:text-slate-400 font-medium pt-1">
                      <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/40">
                        📗 T: {successData.tahfizhPoints || 0}
                      </span>
                      <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900/40">
                        🏢 K: {successData.kesantrianPoints || 0}
                      </span>
                      <span className="bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-900/40">
                        📚 A: {successData.akademikPoints || 0}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleResetForNext}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  Catat Santri Berikutnya
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onViewHistory) onViewHistory();
                  }}
                  className="py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  Lihat Riwayat
                </button>
              </div>
            </div>
          ) : (
            /* FORM INPUT */
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-200 rounded-xl text-xs sm:text-sm flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Tanggal & Waktu (2 Kolom) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                    Tanggal Kejadian
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    Waktu
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>
              </div>

              {/* ========================================================= */}
              {/* DIVISI 1: TAHFIZH (HALAQAH) MODE */}
              {/* ========================================================= */}
              {division === 'tahfizh' && (
                <>
                  {/* Muhafizh Pelapor */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                      Muhafizh Pelapor (Akun Login)
                    </label>
                    <input
                      type="text"
                      value={currentUser?.name || 'Ustadz Pengampu'}
                      disabled
                      className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-medium cursor-not-allowed"
                    />
                  </div>

                  {/* Halaqah Dropdown */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                      Pilih Halaqah
                    </label>
                    <select
                      value={selectedHalaqahId}
                      onChange={(e) => setSelectedHalaqahId(e.target.value)}
                      className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium"
                      required
                    >
                      <option value="">-- Pilih Halaqah --</option>
                      {halaqahs.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name} {h.schedule ? `(${h.schedule})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Santri Dropdown (Filtered to selected halaqah) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-emerald-500" />
                        Nama Santri
                      </span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        {halaqahStudents.length} santri terdaftar
                      </span>
                    </label>
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      disabled={halaqahStudents.length === 0}
                      className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium disabled:opacity-50"
                      required
                    >
                      <option value="">-- Pilih Santri di Halaqah Ini --</option>
                      {halaqahStudents.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (NIS: {s.student_number} - Kelas {s.class})
                        </option>
                      ))}
                    </select>
                    {halaqahStudents.length === 0 && selectedHalaqahId && (
                      <p className="text-xs text-amber-500 mt-1">
                        Belum ada santri di halaqah ini. Silakan tambahkan santri melalui menu Data Santri.
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* ========================================================= */}
              {/* DIVISI 2 & 3: KESANTRIAN & AKADEMIK MODE */}
              {/* ========================================================= */}
              {(division === 'kesantrian' || division === 'akademik') && (
                <>
                  {/* Petugas / Guru / Pembina */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                        {division === 'akademik' ? 'Guru Pengajar / Pelapor' : 'Pembina / Petugas'}
                      </label>
                      <input
                        type="text"
                        value={supervisorName}
                        onChange={(e) => setSupervisorName(e.target.value)}
                        placeholder={division === 'akademik' ? 'Guru Mata Pelajaran / Wali Kelas' : 'Wali Asrama / Bagian Kesantrian'}
                        className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                        Lokasi Kejadian
                      </label>
                      <input
                        type="text"
                        value={locationName}
                        onChange={(e) => setLocationName(e.target.value)}
                        placeholder={division === 'akademik' ? 'Misal: Ruang Kelas 8A, Lab' : 'Misal: Kamar 02, Masjid, Kantin'}
                        className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        required
                      />
                    </div>
                  </div>

                  {/* Santri Selection with live search */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-indigo-500" />
                        Pilih Santri ({division === 'akademik' ? 'Semua Kelas / Siswa' : 'Semua Kelas / Asrama'})
                      </span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        {allStudents.length} santri aktif
                      </span>
                    </label>

                    {/* Quick filter box */}
                    <div className="relative mb-1.5">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Ketik Nama, NIS, atau Kelas santri..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/[0.1] bg-slate-50 dark:bg-[#161d31] text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium"
                      required
                    >
                      <option value="">-- Pilih Santri --</option>
                      {filteredAllStudents.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (NIS: {s.student_number} - Kelas {s.class})
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* ========================================================= */}
              {/* MASTER VIOLATION SELECTION (FILTERED BY DIVISION) */}
              {/* ========================================================= */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    Jenis Pelanggaran ({division === 'kesantrian' ? 'Aturan Kesantrian' : division === 'akademik' ? 'Aturan Akademik' : 'Aturan Halaqah'})
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    {currentDivisionViolations.length} aturan tersedia
                  </span>
                </label>
                <select
                  value={selectedViolationId}
                  onChange={(e) => setSelectedViolationId(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium"
                  required
                >
                  <option value="">-- Pilih Jenis Pelanggaran --</option>
                  {currentDivisionViolations.map((v) => (
                    <option key={v.id} value={v.id}>
                      [{v.code}] {v.name} ({v.default_points} Poin - {v.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* POIN OTOMATIS (READ ONLY BADGE) */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Bobot Poin Pelanggaran
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Ditentukan otomatis berdasarkan standar terpadu
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-white dark:bg-[#161d31] px-4 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/40 shadow-sm">
                  <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{points}</span>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">POIN</span>
                </div>
              </div>

              {/* Keterangan Tambahan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Keterangan / Kronologi Tambahan (Opsional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    division === 'kesantrian'
                      ? 'Misal: Santri terlambat bangun shalat Subuh, sudah ditegur musyrif...'
                      : 'Misal: Lupa membawa buku mutabaah, target hafalan belum setor...'
                  }
                  rows={2}
                  className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Tombol Simpan */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full min-h-[48px] py-3.5 px-4 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/25 bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] cursor-pointer"
                >
                  {loading ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Menyimpan ke Database...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-white/90" />
                      <span>SIMPAN PELANGGARAN {division === 'kesantrian' ? 'KESANTRIAN' : 'TAHFIZH'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
