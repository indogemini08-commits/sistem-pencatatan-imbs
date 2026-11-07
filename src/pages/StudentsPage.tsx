import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  ArrowUpDown,
  MoreVertical,
  Trash2,
  Edit2,
  Eye,
  CheckCircle2,
  AlertCircle,
  X,
  UploadCloud,
  FileDown,
  GraduationCap,
  UserPlus,
  UserCheck,
  Hash,
  User as UserIcon,
  Calendar,
  BookOpen,
  Users,
  CheckSquare,
} from 'lucide-react';
import type { Student, Halaqah, User } from '../types';
import { api } from '../services/api';
import { storageSync } from '../services/storageSync';
import { StatusBadge } from '../components/Badge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  downloadStudentImportTemplate,
  parseStudentExcelFile,
  exportToExcel,
  StudentExcelRow,
} from '../utils/excelHelper';

interface StudentsPageProps {
  currentUser: User | null;
  onSelectStudent: (studentId: string) => void;
}

export const StudentsPage: React.FC<StudentsPageProps> = ({
  currentUser,
  onSelectStudent,
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [halaqahs, setHalaqahs] = useState<Halaqah[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Search & Filters
  const [search, setSearch] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedHalaqah, setSelectedHalaqah] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string>('');

  // Bulk select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState<boolean>(false);

  // Form State for Add / Edit
  const [formNIS, setFormNIS] = useState<string>('');
  const [formName, setFormName] = useState<string>('');
  const [formClass, setFormClass] = useState<string>('');
  const [formGender, setFormGender] = useState<'L' | 'P'>('L');
  const [formHalaqahId, setFormHalaqahId] = useState<string>('');
  const [formYear, setFormYear] = useState<string>('2025/2026');
  const [formError, setFormError] = useState<string>('');
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);

  // Excel Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<StudentExcelRow[]>([]);
  const [importValidCount, setImportValidCount] = useState<number>(0);
  const [importErrors, setImportErrors] = useState<Array<{ row: number; error: string }>>([]);
  const [importing, setImporting] = useState<boolean>(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string>('');

  useEffect(() => {
    loadStudentsAndHalaqah();

    const handleDataChanged = (e: any) => {
      if (!e?.detail?.resource || e?.detail?.resource === 'student' || e?.detail?.resource === 'record' || e?.detail?.resource === 'all') {
        loadStudentsAndHalaqah();
      }
    };

    window.addEventListener('app:data-changed', handleDataChanged);
    return () => {
      window.removeEventListener('app:data-changed', handleDataChanged);
    };
  }, []);

  const loadStudentsAndHalaqah = async () => {
    setLoading(true);
    try {
      const [sList, hList] = await Promise.all([api.students.list(), api.halaqah.list()]);
      const deletedIds = storageSync.getDeletedStudentIds();
      setStudents(sList.filter((s) => !deletedIds.has(s.id)));
      setHalaqahs(hList);
    } catch (err: any) {
      console.error('Error loading students:', err);
    } finally {
      setLoading(false);
    }
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setFormNIS('');
    setFormName('');
    setFormClass('7A');
    setFormGender('L');
    setFormHalaqahId(halaqahs.length > 0 ? halaqahs[0].id : '');
    setFormYear('2025/2026');
    setFormError('');
    setIsAddModalOpen(true);
  };

  // Submit Add Student
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formNIS || !formName || !formClass) {
      setFormError('NIS, Nama, dan Kelas wajib diisi');
      return;
    }

    setFormSubmitting(true);
    try {
      await api.students.create({
        studentNumber: formNIS,
        name: formName,
        studentClass: formClass,
        gender: formGender,
        halaqahId: formHalaqahId,
        academicYear: formYear,
        actorName: currentUser?.name || 'Admin',
      });
      setIsAddModalOpen(false);
      await loadStudentsAndHalaqah();
    } catch (err: any) {
      setFormError(err.message || 'Gagal menambahkan santri');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (student: Student) => {
    setStudentToEdit(student);
    setFormNIS(student.student_number);
    setFormName(student.name);
    setFormClass(student.class);
    setFormGender(student.gender);
    setFormHalaqahId(student.halaqah_id || '');
    setFormYear(student.academic_year || '2025/2026');
    setFormError('');
    setIsEditModalOpen(true);
  };

  // Submit Edit Student
  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentToEdit) return;
    setFormError('');

    setFormSubmitting(true);
    try {
      await api.students.update(studentToEdit.id, {
        studentNumber: formNIS,
        name: formName,
        studentClass: formClass,
        gender: formGender,
        halaqahId: formHalaqahId,
        academicYear: formYear,
        actorName: currentUser?.name || 'Admin',
      });
      setIsEditModalOpen(false);
      await loadStudentsAndHalaqah();
    } catch (err: any) {
      setFormError(err.message || 'Gagal memperbarui santri');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Student
  const handleDeleteConfirm = async () => {
    if (!studentToDelete) return;
    const targetId = studentToDelete.id;
    setIsDeleting(true);
    setDeleteError('');
    try {
      // 1. Trigger HTTP DELETE request to backend database
      await api.students.delete(targetId, currentUser?.name || 'Admin');

      // 2. Immediately update local state so row is removed without delay or resurrection
      setStudents((prev) => prev.filter((s) => s.id !== targetId));
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(targetId); return n; });
      setStudentToDelete(null);

      // 3. Notify application data changed
      storageSync.notifyDataChange({ action: 'delete', resource: 'student', id: targetId });

      // 4. Refetch from database to ensure full synchronization
      await loadStudentsAndHalaqah();
    } catch (err: any) {
      console.error('Error deleting student:', err);
      setDeleteError(err.message || 'Gagal menghapus data santri dari database');
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk delete handler
  const handleBulkDeleteConfirm = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setIsBulkDeleting(true);
    try {
      await api.students.bulkDelete(ids, currentUser?.name || 'Admin');
      setStudents((prev) => prev.filter((s) => !selectedIds.has(s.id)));
      setSelectedIds(new Set());
      setShowBulkConfirm(false);
      storageSync.notifyDataChange({ action: 'delete', resource: 'student', id: ids[0] });
      await loadStudentsAndHalaqah();
    } catch (err: any) {
      alert('Gagal menghapus: ' + err.message);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Toggle individual checkbox
  const toggleSelectStudent = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Toggle select all (only visible/filtered students)
  const toggleSelectAll = () => {
    if (filteredStudents.every((s) => selectedIds.has(s.id))) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredStudents.forEach((s) => next.delete(s.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredStudents.forEach((s) => next.add(s.id));
        return next;
      });
    }
  };

  // Handle file select for Excel import
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setImportSuccessMsg('');
    try {
      const rows = await parseStudentExcelFile(file);
      setParsedRows(rows);

      // Validate on client
      const existingNIS = new Set(students.map((s) => s.student_number));
      const errors: Array<{ row: number; error: string }> = [];
      let valid = 0;

      rows.forEach((r, idx) => {
        const rowNum = idx + 2;
        if (!r.student_number) {
          errors.push({ row: rowNum, error: 'NIS kosong' });
        } else if (existingNIS.has(r.student_number)) {
          errors.push({ row: rowNum, error: `NIS ${r.student_number} (${r.name}) sudah ada di database` });
        } else if (!r.name) {
          errors.push({ row: rowNum, error: 'Nama santri kosong' });
        } else {
          valid++;
        }
      });

      setImportValidCount(valid);
      setImportErrors(errors);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Submit Excel Import to Database
  const handleConfirmImport = async () => {
    if (parsedRows.length === 0) return;

    setImporting(true);
    try {
      const res = await api.students.importExcel(parsedRows, currentUser?.name || 'Admin');
      setImportSuccessMsg(res.message);
      setParsedRows([]);
      setImportFile(null);
      await loadStudentsAndHalaqah();
    } catch (err: any) {
      alert('Gagal mengimpor ke database: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  // Export to Excel
  const handleExportStudents = () => {
    const exportData = filteredStudents.map((s, idx) => ({
      'No': idx + 1,
      'NIS': s.student_number,
      'Nama Lengkap': s.name,
      'Kelas': s.class,
      'Jenis Kelamin': s.gender === 'L' ? 'Laki-laki' : 'Perempuan',
      'Nama Halaqah': s.halaqah_name || 'Tanpa Halaqah',
      'Muhafizh Pengampu': s.teacher_name || '-',
      'Total Poin': s.total_points,
      'Status Poin': s.status_info?.statusName || 'AMAN',
      'Tahun Ajaran': s.academic_year,
    }));
    exportToExcel(exportData, 'Data_Santri_Halaqah');
  };

  // Filter & Sorting logic
  const filteredStudents = students
    .filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.student_number.toLowerCase().includes(search.toLowerCase()) ||
        (s.halaqah_name && s.halaqah_name.toLowerCase().includes(search.toLowerCase()));

      const matchClass = selectedClass === 'all' || s.class === selectedClass;
      const matchHalaqah = selectedHalaqah === 'all' || s.halaqah_id === selectedHalaqah;

      return matchSearch && matchClass && matchHalaqah;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'nis') {
        comparison = a.student_number.localeCompare(b.student_number);
      } else if (sortBy === 'class') {
        comparison = a.class.localeCompare(b.class);
      } else if (sortBy === 'points') {
        comparison = (a.total_points || 0) - (b.total_points || 0);
      }
      return sortDir === 'asc' ? comparison : -comparison;
    });

  const allFilteredSelected = filteredStudents.length > 0 && filteredStudents.every((s) => selectedIds.has(s.id));

  const uniqueClasses = Array.from(new Set(students.map((s) => s.class))).sort();

  return (
    <div className="space-y-6 animate-scale-in">
      {/* Page Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span>Data Santri Halaqah</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola santri, import dari Excel dengan template resmi, dan pantau status poin.
          </p>
        </div>

        {/* Buttons: Tambah Santri, Import Excel, Export, Bulk Delete */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {/* Bulk Delete button — appears when selections are active */}
          {selectedIds.size > 0 && (
            <button
              onClick={() => setShowBulkConfirm(true)}
              className="w-full sm:w-auto justify-center min-h-[44px] px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 active:scale-[0.98] animate-pulse-once cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Hapus {selectedIds.size} Santri</span>
            </button>
          )}

          <button
            onClick={handleOpenAddModal}
            className="w-full sm:w-auto justify-center min-h-[44px] px-6 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2.5 active:scale-[0.98] cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="pr-0.5">Tambah Santri</span>
          </button>

          <button
            onClick={() => {
              setImportFile(null);
              setParsedRows([]);
              setImportSuccessMsg('');
              setIsImportModalOpen(true);
            }}
            className="w-full sm:w-auto justify-center min-h-[44px] px-4 py-2.5 bg-white dark:bg-[#111726] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 dark:border-white/[0.1] shadow-sm transition-all flex items-center gap-2 active:scale-[0.98] cursor-pointer whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Import Excel</span>
          </button>

          <button
            onClick={handleExportStudents}
            className="w-full sm:w-auto justify-center min-h-[44px] px-4 py-2.5 bg-white dark:bg-[#111726] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 dark:border-white/[0.1] shadow-sm transition-all flex items-center gap-2 active:scale-[0.98] cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Card */}
      <div className="glass-panel p-3.5 sm:p-5 space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Global Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, NIS, atau halaqah..."
              className="w-full min-h-[44px] text-xs sm:text-sm pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/[0.14] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-white/90 dark:bg-[#161d31]/90 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 font-semibold shadow-inner"
            />
          </div>

          {/* Filter Kelas */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="text-[11px] sm:text-xs font-black text-slate-700 dark:text-slate-300 sm:whitespace-nowrap">Kelas:</span>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full min-h-[44px] text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-slate-300 dark:border-white/[0.14] focus:border-indigo-500 bg-white/90 dark:bg-[#161d31]/90 text-slate-900 dark:text-slate-100 font-semibold shadow-inner"
            >
              <option value="all">Semua Kelas</option>
              {uniqueClasses.map((c) => (
                <option key={c} value={c}>
                  Kelas {c}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Halaqah */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="text-[11px] sm:text-xs font-black text-slate-700 dark:text-slate-300 sm:whitespace-nowrap">Halaqah:</span>
            <select
              value={selectedHalaqah}
              onChange={(e) => setSelectedHalaqah(e.target.value)}
              className="w-full min-h-[44px] text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-slate-300 dark:border-white/[0.14] focus:border-indigo-500 bg-white/90 dark:bg-[#161d31]/90 text-slate-900 dark:text-slate-100 font-semibold shadow-inner"
            >
              <option value="all">Semua Halaqah</option>
              {halaqahs.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Control */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="text-[11px] sm:text-xs font-black text-slate-700 dark:text-slate-300 sm:whitespace-nowrap">Urutkan:</span>
            <select
              value={`${sortBy}-${sortDir}`}
              onChange={(e) => {
                const [by, dir] = e.target.value.split('-');
                setSortBy(by);
                setSortDir(dir as 'asc' | 'desc');
              }}
              className="w-full min-h-[44px] text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-slate-300 dark:border-white/[0.14] focus:border-indigo-500 bg-white/90 dark:bg-[#161d31]/90 text-slate-900 dark:text-slate-100 font-semibold shadow-inner"
            >
              <option value="name-asc">Nama (A - Z)</option>
              <option value="name-desc">Nama (Z - A)</option>
              <option value="points-desc">Poin Tertinggi (Z - A)</option>
              <option value="points-asc">Poin Terendah (A - Z)</option>
              <option value="class-asc">Kelas</option>
              <option value="nis-asc">NIS</option>
            </select>
          </div>
        </div>

        {/* Total stats count indicator */}
        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 font-semibold pt-2 border-t border-slate-200/80 dark:border-white/[0.08]">
          <span>
            Menampilkan <strong className="text-slate-900 dark:text-white font-black">{filteredStudents.length}</strong> dari <strong className="text-slate-900 dark:text-white font-black">{students.length}</strong> santri
          </span>
          {(search || selectedClass !== 'all' || selectedHalaqah !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedClass('all');
                setSelectedHalaqah('all');
              }}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* ========================================== */}
      {/* MOBILE CARDS VIEW (block md:hidden)        */}
      {/* Ergonomis untuk penggunaan satu tangan     */}
      {/* ========================================== */}
      <div className="block md:hidden space-y-3">
        {filteredStudents.length === 0 ? (
          <div className="bg-white dark:bg-[#111726] rounded-2xl border border-slate-200/90 dark:border-white/[0.08] p-8 text-center text-slate-400">
            Tidak ditemukan data santri yang cocok dengan filter.
          </div>
        ) : (
          filteredStudents.map((s, idx) => (
            <div
              key={s.id}
              className={`rounded-2xl border shadow-sm p-3.5 space-y-3 transition-colors ${
                selectedIds.has(s.id)
                  ? 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-900/50'
                  : 'bg-white dark:bg-[#111726]/90 border-slate-200/90 dark:border-white/[0.08]'
              }`}
            >
              {/* Card Header: Checkbox, NIS, Nama, Gender & Status */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(s.id)}
                    onChange={() => toggleSelectStudent(s.id)}
                    className="w-4 h-4 rounded border-slate-300 dark:border-white/[0.1] text-rose-600 focus:ring-rose-500 cursor-pointer shrink-0 mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {s.student_number}
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/40">
                        Kelas {s.class}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectStudent(s.id)}
                      className="font-black text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 text-base transition-colors text-left line-clamp-1 cursor-pointer"
                    >
                      {s.name}
                    </button>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {s.gender === 'L' ? 'Laki-laki' : 'Perempuan'} • TA {s.academic_year}
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  <StatusBadge
                    statusName={s.status_info?.statusName || 'AMAN'}
                    badgeColor={s.status_info?.badgeColor || 'emerald'}
                  />
                </div>
              </div>

              {/* Halaqah & Pengampu */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-white/[0.06] text-xs">
                <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>{s.halaqah_name || 'Tanpa Halaqah'}</span>
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 ml-5 mt-0.5">
                  Ustadz: {s.teacher_name || '-'}
                </p>
              </div>

              {/* Points Summary & Deductions */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-white/[0.06]">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40">
                    {s.total_points} Poin
                  </span>
                  {(s.total_deductions || 0) > 0 && (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      ★ -{s.total_deductions}
                    </span>
                  )}
                </div>

                {(s.tahfizh_points !== undefined || s.kesantrian_points !== undefined || s.akademik_points !== undefined) && (
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                    <span className="text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/40">
                      T: {s.tahfizh_points || 0}
                    </span>
                    <span className="text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-900/40">
                      K: {s.kesantrian_points || 0}
                    </span>
                    <span className="text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-900/40">
                      A: {s.akademik_points || 0}
                    </span>
                  </div>
                )}
              </div>

              {/* One-Handed Action Buttons */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onSelectStudent(s.id)}
                  className="min-h-[40px] px-2 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center gap-1 border border-indigo-200 dark:border-indigo-800 active:scale-95 transition-all cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Profil</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenEditModal(s)}
                  className="min-h-[40px] px-2 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center justify-center gap-1 border border-amber-200 dark:border-amber-800 active:scale-95 transition-all cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStudentToDelete(s)}
                  className="min-h-[40px] px-2 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center justify-center gap-1 border border-rose-200 dark:border-rose-800 active:scale-95 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ========================================== */}
      {/* DESKTOP TABLE VIEW (hidden md:block)       */}
      {/* ========================================== */}
      <div className="hidden md:block glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-100/90 dark:bg-white/[0.06] text-slate-800 dark:text-slate-200 uppercase text-[11px] font-black tracking-wider border-b-2 border-slate-200/90 dark:border-white/[0.1]">
              <tr>
                <th className="px-4 py-3.5 text-center w-10">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 dark:border-white/[0.14] text-rose-600 focus:ring-rose-500 cursor-pointer"
                    title="Pilih semua"
                  />
                </th>
                <th className="px-4 py-3.5 text-center w-12">#</th>
                <th className="px-4 py-3.5">NIS</th>
                <th className="px-4 py-3.5">Nama Santri</th>
                <th className="px-4 py-3.5 text-center">Kelas</th>
                <th className="px-4 py-3.5">Halaqah & Muhafizh</th>
                <th className="px-4 py-3.5 text-center">Akumulasi Poin</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-white/[0.06]">
              {filteredStudents.map((s, idx) => (
                <tr key={s.id} className={`hover:bg-indigo-50/70 dark:hover:bg-indigo-500/10 transition-colors ${selectedIds.has(s.id) ? 'bg-rose-50/70 dark:bg-rose-950/30' : ''}`}>
                  <td className="px-4 py-3.5 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(s.id)}
                      onChange={() => toggleSelectStudent(s.id)}
                      className="w-4 h-4 rounded border-slate-300 dark:border-white/[0.14] text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3.5 text-center font-black text-slate-700 dark:text-slate-300">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-slate-700 dark:text-slate-300 font-bold">
                    {s.student_number}
                  </td>
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => onSelectStudent(s.id)}
                      className="font-black text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left cursor-pointer"
                    >
                      {s.name}
                    </button>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                      {s.gender === 'L' ? 'Laki-laki' : 'Perempuan'} • TA: {s.academic_year}
                    </p>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 font-black text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10 shadow-xs">
                      {s.class}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-bold text-slate-900 dark:text-white">{s.halaqah_name || 'Tanpa Halaqah'}</p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">{s.teacher_name || '-'}</p>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <div className="inline-flex items-center gap-1.5 flex-wrap justify-center">
                      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-900/50 shadow-xs">
                        {s.total_points} Poin
                      </span>
                      {(s.total_deductions || 0) > 0 && (
                        <span
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                          title={`Pengurangan Melalui Kegiatan Baik: -${s.total_deductions} Poin`}
                        >
                          <span>★</span>
                          <span>-{s.total_deductions}</span>
                        </span>
                      )}
                    </div>
                    {(s.tahfizh_points !== undefined || s.kesantrian_points !== undefined || s.akademik_points !== undefined) && (
                      <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1">
                        <span
                          className="text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/40"
                          title={`Poin Bersih Tahfizh: ${s.tahfizh_points || 0}`}
                        >
                          T: {s.tahfizh_points || 0}
                        </span>
                        <span
                          className="text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-900/40"
                          title={`Poin Bersih Kesantrian: ${s.kesantrian_points || 0}`}
                        >
                          K: {s.kesantrian_points || 0}
                        </span>
                        <span
                          className="text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-900/40"
                          title={`Poin Bersih Akademik: ${s.akademik_points || 0}`}
                        >
                          A: {s.akademik_points || 0}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <StatusBadge
                      statusName={s.status_info?.statusName || 'AMAN'}
                      badgeColor={s.status_info?.badgeColor || 'emerald'}
                    />
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => onSelectStudent(s.id)}
                        title="Lihat Profil Santri"
                        className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(s)}
                        title="Edit Data Santri"
                        className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setStudentToDelete(s)}
                        title="Hapus Santri"
                        className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    Tidak ditemukan data santri yang cocok dengan filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================================================== */}
      {/* MODAL: TAMBAH / EDIT SANTRI                         */}
      {/* ==================================================== */}
      {(isAddModalOpen || isEditModalOpen) &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-scale-in">
            <div className="relative w-full max-w-lg m-auto h-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col bg-white dark:bg-[#111726] rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 dark:border-white/[0.08] overflow-hidden transition-colors">
            {/* Header with SaaS Indigo Gradient */}
            <div className="bg-gradient-to-r from-[#0d1222] via-[#1e1b4b] to-[#0f172a] text-white p-5 sm:p-6 relative shrink-0 border-b border-indigo-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-500/20 rounded-2xl backdrop-blur-sm ring-1 ring-indigo-400/30">
                    {isAddModalOpen ? (
                      <UserPlus className="w-6 h-6 text-indigo-300" />
                    ) : (
                      <UserCheck className="w-6 h-6 text-indigo-300" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                      {isAddModalOpen ? 'Tambah Data Santri' : 'Edit Profil Santri'}
                    </h3>
                    <p className="text-xs text-indigo-200/80 font-light">
                      {isAddModalOpen
                        ? 'Daftarkan santri baru ke dalam sistem & halaqah'
                        : 'Perbarui biodata dan penempatan halaqah santri'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
                  aria-label="Tutup modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form
              onSubmit={isAddModalOpen ? handleAddStudent : handleEditStudent}
              className="flex flex-col flex-1 min-h-0 overflow-hidden"
            >
              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto overscroll-contain flex-1 min-h-0">
                {formError && (
                  <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-200 text-xs sm:text-sm rounded-xl flex items-center gap-2.5 animate-scale-in">
                    <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span className="font-medium">{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 text-indigo-500" />
                      <span>NIS / No. Induk</span>
                    </label>
                    <input
                      type="text"
                      value={formNIS}
                      onChange={(e) => setFormNIS(e.target.value)}
                      placeholder="Misal: 2025001"
                      className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/[0.1] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-slate-50/50 dark:bg-[#161d31] text-slate-900 dark:text-slate-100 hover:bg-white transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Kelas</span>
                    </label>
                    <input
                      type="text"
                      value={formClass}
                      onChange={(e) => setFormClass(e.target.value)}
                      placeholder="Contoh: 7A / 8B / 9C"
                      className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/[0.1] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-slate-50/50 dark:bg-[#161d31] text-slate-900 dark:text-slate-100 hover:bg-white transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Nama Lengkap Santri</span>
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Masukkan nama lengkap santri..."
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/[0.1] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-slate-50/50 dark:bg-[#161d31] text-slate-900 dark:text-slate-100 hover:bg-white transition-colors"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Jenis Kelamin</span>
                    </label>
                    <select
                      value={formGender}
                      onChange={(e) => setFormGender(e.target.value as 'L' | 'P')}
                      className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/[0.1] focus:border-indigo-500 bg-slate-50/50 dark:bg-[#161d31] text-slate-900 dark:text-slate-100 font-medium transition-colors"
                    >
                      <option value="L">Laki-laki (Ikhwan)</option>
                      <option value="P">Perempuan (Akhawat)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Tahun Ajaran</span>
                    </label>
                    <input
                      type="text"
                      value={formYear}
                      onChange={(e) => setFormYear(e.target.value)}
                      placeholder="2025/2026"
                      className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/[0.1] focus:border-indigo-500 bg-slate-50/50 dark:bg-[#161d31] text-slate-900 dark:text-slate-100 font-medium transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Penempatan Halaqah Al-Qur'an</span>
                  </label>
                  <select
                    value={formHalaqahId}
                    onChange={(e) => setFormHalaqahId(e.target.value)}
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/[0.1] focus:border-indigo-500 bg-slate-50/50 dark:bg-[#161d31] text-slate-900 dark:text-slate-100 font-medium transition-colors"
                  >
                    <option value="">-- Belum Ditempatkan (Tanpa Halaqah) --</option>
                    {halaqahs.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} — Pengampu: {h.teacher_name || 'Belum Ada Ustadz'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3.5 sm:p-5 bg-slate-50/80 dark:bg-slate-900/80 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 border-t border-slate-100 dark:border-white/[0.06] shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="w-full sm:w-auto justify-center min-h-[44px] px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-[#161d31] hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/[0.1] rounded-xl transition-colors shadow-sm active:scale-[0.98] flex items-center cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="w-full sm:w-auto justify-center min-h-[44px] px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 flex items-center gap-2 active:scale-[0.98] cursor-pointer"
                >
                  {formSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Menyimpan ke Database...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white/90" />
                      <span>{isAddModalOpen ? 'Simpan Santri' : 'Perbarui Data Santri'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ==================================================== */}
      {/* MODAL: IMPORT EXCEL (DENGAN TEMPLATE RESMI & PREVIEW) */}
      {/* ==================================================== */}
      {isImportModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-scale-in">
            <div className="relative w-full max-w-2xl m-auto h-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col bg-white dark:bg-[#111726] rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200/90 dark:border-white/[0.08] overflow-y-auto transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Import Data Santri dari Excel</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Sistem akan memvalidasi dan menyimpan langsung ke database relasional
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Template Download Notice */}
            <div className="mt-4 p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-indigo-950 dark:text-indigo-200">
                  Unduh Template Excel Resmi (.xlsx)
                </h4>
                <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-0.5">
                  Gunakan format kolom yang telah disesuaikan agar data tervalidasi dengan sempurna.
                </p>
              </div>
              <button
                type="button"
                onClick={downloadStudentImportTemplate}
                className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <FileDown className="w-4 h-4" />
                <span>Unduh Template</span>
              </button>
            </div>

            {/* File Upload Zone */}
            <div className="mt-4">
              <label className="block border-2 border-dashed border-slate-300 dark:border-white/[0.1] hover:border-indigo-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-50/50 dark:bg-[#161d31]/50 hover:bg-indigo-50/20 transition-all">
                <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 block">
                  {importFile ? importFile.name : 'Pilih file Excel (.xlsx / .csv)'}
                </span>
                <span className="text-xs text-slate-400 block mt-1">
                  Klik untuk mencari file atau seret file ke sini
                </span>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>

            {/* Success Feedback */}
            {importSuccessMsg && (
              <div className="mt-4 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs sm:text-sm flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <span>{importSuccessMsg}</span>
              </div>
            )}

            {/* Preview Validation Section */}
            {parsedRows.length > 0 && (
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Preview Data Validasi
                  </h4>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-bold rounded-lg border border-emerald-200 dark:border-emerald-800">
                      ✓ {importValidCount} Data Siap Disimpan
                    </span>
                    {importErrors.length > 0 && (
                      <span className="px-2.5 py-1 bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 font-bold rounded-lg border border-rose-200 dark:border-rose-800">
                        ✗ {importErrors.length} Baris Error
                      </span>
                    )}
                  </div>
                </div>

                {/* Errors list if any */}
                {importErrors.length > 0 && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-800 dark:text-rose-200 space-y-1 max-h-24 overflow-y-auto">
                    {importErrors.map((err, i) => (
                      <p key={i}>
                        • Baris {err.row}: {err.error}
                      </p>
                    ))}
                  </div>
                )}

                {/* Table Preview */}
                <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-white/[0.08] rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold sticky top-0">
                      <tr>
                        <th className="px-3 py-2">NIS</th>
                        <th className="px-3 py-2">Nama</th>
                        <th className="px-3 py-2">Kelas</th>
                        <th className="px-3 py-2">Halaqah</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                      {parsedRows.slice(0, 8).map((r, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                          <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-300">{r.student_number}</td>
                          <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">{r.name}</td>
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{r.class}</td>
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{r.halaqah || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-4 sm:pt-5 mt-4 sm:mt-5 border-t border-slate-100 dark:border-white/[0.08]">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="w-full sm:w-auto justify-center min-h-[44px] px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors flex items-center cursor-pointer"
              >
                Tutup
              </button>
              {parsedRows.length > 0 && (
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={importing || importValidCount === 0}
                  className="w-full sm:w-auto justify-center min-h-[44px] px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50 active:scale-[0.98] cursor-pointer"
                >
                  {importing ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Menyimpan ke Database...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Konfirmasi & Simpan ke Database</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!studentToDelete}
        title="Hapus Data Santri"
        message={`Apakah Anda yakin ingin menghapus santri "${studentToDelete?.name}" (NIS: ${studentToDelete?.student_number})? Seluruh riwayat pelanggaran dan poin santri ini akan dihapus permanen dari database.`}
        confirmLabel="Hapus Santri"
        isDestructive={true}
        isLoading={isDeleting}
        error={deleteError}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setStudentToDelete(null);
          setDeleteError('');
        }}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showBulkConfirm}
        title={`Hapus ${selectedIds.size} Santri Sekaligus`}
        message={`Anda akan menghapus ${selectedIds.size} santri terpilih beserta SELURUH riwayat pelanggaran dan poin mereka secara permanen dari database. Tindakan ini tidak dapat dibatalkan. Lanjutkan?`}
        confirmLabel={isBulkDeleting ? 'Menghapus...' : `Hapus ${selectedIds.size} Santri`}
        isDestructive={true}
        isLoading={isBulkDeleting}
        onConfirm={handleBulkDeleteConfirm}
        onCancel={() => setShowBulkConfirm(false)}
      />
    </div>
  );
};
