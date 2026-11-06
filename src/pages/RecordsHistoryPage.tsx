import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  History,
  Search,
  Filter,
  Download,
  FileText,
  Trash2,
  Ban,
  CheckCircle2,
  Calendar,
  Layers,
  X,
  AlertTriangle,
  AlertCircle,
  RotateCcw,
  BookOpen,
  Building2,
  GraduationCap,
  UserCheck,
  Globe,
} from 'lucide-react';
import { ViolationRecord, Halaqah, Teacher, SchoolSettings, User, ViolationDivision } from '../types';
import { api } from '../services/api';
import { storageSync } from '../services/storageSync';
import { exportToExcel } from '../utils/excelHelper';
import { generateViolationReportPDF } from '../utils/pdfGenerator';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface RecordsHistoryPageProps {
  currentUser: User | null;
  settings: SchoolSettings | null;
  onSelectStudent?: (studentId: string) => void;
  initialDivision?: 'tahfizh' | 'kesantrian' | 'akademik' | 'all';
}

export const RecordsHistoryPage: React.FC<RecordsHistoryPageProps> = ({
  currentUser,
  settings,
  onSelectStudent,
  initialDivision = 'all',
}) => {
  const [records, setRecords] = useState<ViolationRecord[]>([]);
  const [halaqahs, setHalaqahs] = useState<Halaqah[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [filterDivision, setFilterDivision] = useState<'tahfizh' | 'kesantrian' | 'akademik' | 'all'>(initialDivision);
  const [search, setSearch] = useState<string>('');
  const [filterHalaqah, setFilterHalaqah] = useState<string>('all');
  const [filterTeacher, setFilterTeacher] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Cancel Record Dialog
  const [recordToCancel, setRecordToCancel] = useState<ViolationRecord | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [cancelling, setCancelling] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string>('');

  // Hard Delete Dialog
  const [recordToDelete, setRecordToDelete] = useState<ViolationRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string>('');

  // Bulk select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkConfirm, setShowBulkConfirm] = useState<boolean>(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);

  const canDelete =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'coordinator' ||
    currentUser?.role === 'kepala_kesantrian';

  useEffect(() => {
    setFilterDivision(initialDivision);
  }, [initialDivision]);

  useEffect(() => {
    loadRecordsAndOptions();

    const handleDataChanged = (e: any) => {
      if (!e?.detail?.resource || e?.detail?.resource === 'record' || e?.detail?.resource === 'student' || e?.detail?.resource === 'all') {
        loadRecordsAndOptions();
      }
    };

    window.addEventListener('app:data-changed', handleDataChanged);
    return () => {
      window.removeEventListener('app:data-changed', handleDataChanged);
    };
  }, [filterDivision]);

  const loadRecordsAndOptions = async () => {
    setLoading(true);
    try {
      const [recList, hList, tList] = await Promise.all([
        api.records.list(),
        api.halaqah.list(),
        api.teachers.list(),
      ]);

      // If teacher (muhafizh) role, filter Tahfizh records to their halaqah
      let filteredByRole = recList;
      if (currentUser?.role === 'teacher') {
        const myHalaqahIds = new Set(
          hList.filter((h) => h.teacher_id === currentUser.teacherId).map((h) => h.id)
        );
        filteredByRole = recList.filter(
          (r) =>
            r.division === 'kesantrian' || // Allow seeing kesantrian records if needed
            (r.halaqah_id && myHalaqahIds.has(r.halaqah_id)) ||
            r.teacher_name_snapshot?.includes(currentUser.name)
        );
      }

      setRecords(filteredByRole);
      setHalaqahs(hList);
      setTeachers(tList);
    } catch (err: any) {
      console.error('Error loading records:', err);
    } finally {
      setLoading(false);
    }
  };

  // Cancel / Soft Delete Record
  const handleCancelRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordToCancel) return;
    const targetId = recordToCancel.id;
    setCancelError('');

    setCancelling(true);
    try {
      await api.records.cancel(targetId, cancelReason, currentUser?.name || 'Admin');
      setRecords((prev) =>
        prev.map((r) => (r.id === targetId ? { ...r, status: 'cancelled' as const, cancellation_reason: cancelReason } : r))
      );
      setRecordToCancel(null);
      setCancelReason('');
      storageSync.notifyDataChange({ action: 'cancel', resource: 'record', id: targetId });
      await loadRecordsAndOptions();
    } catch (err: any) {
      setCancelError(err.message || 'Gagal membatalkan catatan');
    } finally {
      setCancelling(false);
    }
  };

  // Hard Delete Record
  const handleDeleteRecord = async () => {
    if (!recordToDelete) return;
    const targetId = recordToDelete.id;
    setDeleteError('');
    setIsDeleting(true);
    try {
      await api.records.delete(targetId, currentUser?.name || 'Admin');
      setRecords((prev) => prev.filter((r) => r.id !== targetId));
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(targetId); return n; });
      setRecordToDelete(null);
      storageSync.notifyDataChange({ action: 'delete', resource: 'record', id: targetId });
      await loadRecordsAndOptions();
    } catch (err: any) {
      console.error('Error deleting record:', err);
      setDeleteError(err.message || 'Gagal menghapus data secara permanen');
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk delete records
  const handleBulkDeleteRecords = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setIsBulkDeleting(true);
    try {
      await api.records.bulkDelete(ids, currentUser?.name || 'Admin');
      setRecords((prev) => prev.filter((r) => !selectedIds.has(r.id)));
      setSelectedIds(new Set());
      setShowBulkConfirm(false);
      storageSync.notifyDataChange({ action: 'delete', resource: 'record', id: ids[0] });
      await loadRecordsAndOptions();
    } catch (err: any) {
      alert('Gagal menghapus: ' + err.message);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const toggleSelectRecord = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filtering Logic
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // 1. Division Filter
      if (filterDivision !== 'all') {
        const rDiv = r.division || 'tahfizh';
        if (rDiv !== filterDivision) return false;
      }

      // 2. Status Filter
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;

      // 3. Halaqah Filter (only applies if not kesantrian or if matching)
      if (filterHalaqah !== 'all' && r.halaqah_id !== filterHalaqah) return false;

      // 4. Teacher Filter
      if (filterTeacher !== 'all' && r.teacher_id !== filterTeacher) return false;

      // 5. Category Filter
      if (filterCategory !== 'all') {
        const cat = r.violation_category || '';
        if (cat !== filterCategory && !r.violation_name_snapshot?.includes(filterCategory)) {
          return false;
        }
      }

      // 6. Date Range Filter
      if (startDate && r.date < startDate) return false;
      if (endDate && r.date > endDate) return false;

      // 7. Search Filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const sName = (r.student_name || '').toLowerCase();
        const sNis = (r.student_nis || '').toLowerCase();
        const vName = (r.violation_name_snapshot || '').toLowerCase();
        const notes = (r.notes || '').toLowerCase();
        const hName = (r.halaqah_name_snapshot || '').toLowerCase();
        const tName = (r.teacher_name_snapshot || '').toLowerCase();

        return (
          sName.includes(q) ||
          sNis.includes(q) ||
          vName.includes(q) ||
          notes.includes(q) ||
          hName.includes(q) ||
          tName.includes(q)
        );
      }

      return true;
    });
  }, [records, filterDivision, filterStatus, filterHalaqah, filterTeacher, filterCategory, startDate, endDate, search]);

  const totalPoints = useMemo(() => {
    return filteredRecords
      .filter((r) => r.status === 'active')
      .reduce((sum, r) => sum + (r.points_snapshot || 0), 0);
  }, [filteredRecords]);

  const tahfizhRecords = useMemo(() => {
    return records.filter((r) => (r.division || 'tahfizh') === 'tahfizh');
  }, [records]);

  const kesantrianRecords = useMemo(() => {
    return records.filter((r) => r.division === 'kesantrian');
  }, [records]);

  const akademikRecords = useMemo(() => {
    return records.filter((r) => r.division === 'akademik');
  }, [records]);

  // Export to Excel
  const handleExportExcel = () => {
    const dataToExport = filteredRecords.map((r, idx) => ({
      No: idx + 1,
      Tanggal: r.date,
      Waktu: r.time,
      Divisi: r.division === 'akademik' ? 'Akademik' : r.division === 'kesantrian' ? 'Kesantrian' : 'Tahfizh',
      NIS: r.student_nis || '-',
      'Nama Santri': r.student_name || '-',
      Kelas: r.student_class_snapshot || '-',
      'Jenis Pelanggaran': r.violation_name_snapshot,
      'Poin Pelanggaran': r.points_snapshot,
      'Lokasi / Halaqah': r.halaqah_name_snapshot || '-',
      'Pembina / Muhafizh': r.teacher_name_snapshot || '-',
      Status: r.status === 'active' ? 'Aktif' : `Dibatalkan (${r.cancellation_reason || '-'})`,
      Keterangan: r.notes || '-',
      'Pencatat Data': r.created_by || '-',
    }));

    const prefix = filterDivision === 'akademik' ? 'Akademik' : filterDivision === 'kesantrian' ? 'Kesantrian' : filterDivision === 'tahfizh' ? 'Tahfizh' : 'Semua';
    exportToExcel(dataToExport, `Rekap_Pelanggaran_${prefix}_${new Date().toISOString().split('T')[0]}`);
  };

  // Export to PDF with Kop Surat
  const handleExportPDF = () => {
    if (!settings) {
      alert('Pengaturan sekolah belum dimuat.');
      return;
    }

    generateViolationReportPDF(filteredRecords, settings, {
      period: startDate && endDate ? `${startDate} s/d ${endDate}` : (startDate ? `Sejak ${startDate}` : undefined),
      halaqah:
        filterDivision === 'kesantrian'
          ? 'Bagian Kesantrian (Asrama)'
          : filterDivision === 'tahfizh'
          ? 'Bagian Tahfizh (Halaqah)'
          : 'Terpadu (Tahfizh & Kesantrian)',
    });
  };

  // Title rendering
  const pageTitle =
    filterDivision === 'kesantrian'
      ? 'Monitoring & Pelanggaran Kesantrian'
      : filterDivision === 'tahfizh'
      ? 'Monitoring & Pelanggaran Tahfizh'
      : 'Rekap Terpadu Seluruh Pelanggaran';

  const pageDesc =
    filterDivision === 'kesantrian'
      ? 'Pencatatan kedisiplinan asrama, ibadah shalat berjamaah, dan tata tertib santri.'
      : filterDivision === 'tahfizh'
      ? 'Pencatatan kedisiplinan halaqah Al-Quran, mutabaah, hafalan, dan adab halaqah.'
      : 'Monitoring terpadu mencakup divisi Tahfizh dan Kesantrian dengan akumulasi poin terintegrasi.';

  return (
    <div className="space-y-5 sm:space-y-6 animate-scale-in">
      {/* Title & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-inner shrink-0">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {pageTitle}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">{pageDesc}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {/* Bulk Delete button — visible when selections are active */}
          {selectedIds.size > 0 && (
            <button
              onClick={() => setShowBulkConfirm(true)}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center gap-2 min-h-[44px] sm:min-h-0 w-full sm:w-auto whitespace-nowrap shrink-0"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              <span>Hapus {selectedIds.size} Catatan</span>
            </button>
          )}

          <button
            onClick={handleExportPDF}
            className="px-5 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 min-h-[44px] sm:min-h-0 w-full sm:w-auto whitespace-nowrap shrink-0"
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>Export PDF (Kop Surat)</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-5 py-2.5 bg-white dark:bg-[#161d31] hover:bg-slate-50 dark:hover:bg-[#1e2742] text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-white/[0.1] shadow-soft transition-all flex items-center justify-center gap-2 min-h-[44px] sm:min-h-0 w-full sm:w-auto whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Division Tabs Switcher */}
      <div className="w-full overflow-x-auto no-scrollbar -mx-1 px-1">
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-200/70 dark:bg-[#111726] border border-slate-300/60 dark:border-white/[0.08] text-xs font-bold w-max shadow-soft">
          <button
            onClick={() => setFilterDivision('all')}
            className={`py-2 px-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shrink-0 ${
              filterDivision === 'all'
                ? 'bg-white dark:bg-[#1e2742] text-slate-900 dark:text-white shadow-md ring-1 ring-slate-300 dark:ring-white/[0.1]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/40 dark:hover:bg-white/[0.04]'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Rekap Terpadu</span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#111726] text-[10px] text-slate-700 dark:text-slate-300 font-extrabold border border-slate-200 dark:border-white/[0.1]">
              {records.length}
            </span>
          </button>

          <button
            onClick={() => setFilterDivision('tahfizh')}
            className={`py-2 px-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shrink-0 ${
              filterDivision === 'tahfizh'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-300/40 dark:hover:bg-white/[0.04]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Tahfizh</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
              filterDivision === 'tahfizh' ? 'bg-white/20 text-white' : 'bg-slate-300/80 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300'
            }`}>
              {tahfizhRecords.length}
            </span>
          </button>

          <button
            onClick={() => setFilterDivision('kesantrian')}
            className={`py-2 px-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shrink-0 ${
              filterDivision === 'kesantrian'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-300/40 dark:hover:bg-white/[0.04]'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Kesantrian</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
              filterDivision === 'kesantrian' ? 'bg-white/20 text-white' : 'bg-slate-300/80 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300'
            }`}>
              {kesantrianRecords.length}
            </span>
          </button>

          <button
            onClick={() => setFilterDivision('akademik')}
            className={`py-2 px-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shrink-0 ${
              filterDivision === 'akademik'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-300/40 dark:hover:bg-white/[0.04]'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Akademik</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
              filterDivision === 'akademik' ? 'bg-white/20 text-white' : 'bg-slate-300/80 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300'
            }`}>
              {akademikRecords.length}
            </span>
          </button>
        </div>
      </div>

      {/* Filter and Date Range Card */}
      <div className="saas-card p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Global Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari santri, NIS, pelanggaran..."
              className="w-full text-xs sm:text-sm pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 dark:focus:border-indigo-400 min-h-[42px] outline-none"
            />
          </div>

          {/* Halaqah Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap sm:w-16">Halaqah:</span>
            <select
              value={filterHalaqah}
              onChange={(e) => setFilterHalaqah(e.target.value)}
              className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-white focus:border-indigo-500 dark:focus:border-indigo-400 min-h-[42px] outline-none"
            >
              <option value="all">Semua Halaqah</option>
              {halaqahs.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tanggal Dari & Sampai */}
          <div className="grid grid-cols-2 sm:contents gap-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap sm:w-10">Dari:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-white focus:border-indigo-500 dark:focus:border-indigo-400 min-h-[42px] outline-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap sm:w-12">Sampai:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-white focus:border-indigo-500 dark:focus:border-indigo-400 min-h-[42px] outline-none"
              />
            </div>
          </div>
        </div>

        {/* Secondary Filter Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3">
            {/* Status Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full sm:w-auto text-xs px-2.5 py-2 rounded-lg border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-white min-h-[38px] outline-none"
              >
                <option value="all">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="cancelled">Dibatalkan</option>
              </select>
            </div>

            {/* Kategori Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">Kategori:</span>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full sm:w-auto text-xs px-2.5 py-2 rounded-lg border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-white min-h-[38px] outline-none"
              >
                <option value="all">Semua Kategori</option>
                <option value="Tahfizh">Tahfizh</option>
                <option value="Ibadah & Shalat">Ibadah & Shalat</option>
                <option value="Ketertiban Asrama">Ketertiban Asrama</option>
                <option value="Kedisiplinan">Kedisiplinan</option>
                <option value="Kehadiran">Kehadiran</option>
                <option value="Adab & Akhlak">Adab & Akhlak</option>
              </select>
            </div>
          </div>

          {/* Summary metric of current filtered records */}
          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs pt-1 sm:pt-0">
            <span className="text-slate-500 dark:text-slate-400">
              Kejadian: <strong className="text-slate-900 dark:text-white">{filteredRecords.length}</strong>
            </span>
            <span className="px-3 py-1 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 font-black rounded-xl border border-rose-200 dark:border-rose-500/20 shadow-xs">
              Total: {totalPoints} Poin
            </span>
            {(search || filterHalaqah !== 'all' || filterCategory !== 'all' || startDate || endDate || filterDivision !== 'all' || filterStatus !== 'all') && (
              <button
                onClick={() => {
                  setSearch('');
                  setFilterDivision('all');
                  setFilterHalaqah('all');
                  setFilterTeacher('all');
                  setFilterCategory('all');
                  setFilterStatus('all');
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-bold ml-1 min-h-[36px] flex items-center"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table & Mobile Cards */}
      <div className="saas-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <span>Memuat data riwayat...</span>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            Tidak ada catatan pelanggaran yang cocok dengan kriteria filter.
          </div>
        ) : (
          <>
            {/* VIEW 1: Mobile Card List */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-white/[0.06]">
              {filteredRecords.map((r) => {
                const isCancelled = r.status === 'cancelled';
                const isAkademik = r.division === 'akademik';
                const isKesantrian = r.division === 'kesantrian';

                return (
                  <div
                    key={r.id}
                    className={`p-4 space-y-3 transition-colors ${
                      isCancelled
                        ? 'bg-slate-50/60 dark:bg-white/[0.02] opacity-60'
                        : selectedIds.has(r.id)
                        ? 'bg-rose-50/50 dark:bg-rose-500/10'
                        : 'hover:bg-slate-50/70 dark:hover:bg-white/[0.02]'
                    }`}
                  >
                    {/* Top Row: Checkbox, Name, NIS, Division Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(r.id)}
                          onChange={() => toggleSelectRecord(r.id)}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-rose-600 focus:ring-rose-500 cursor-pointer shrink-0 mt-1"
                        />
                        <div className="min-w-0">
                          <button
                            onClick={() => onSelectStudent && onSelectStudent(r.student_id)}
                            className="font-bold text-slate-900 dark:text-white text-sm text-left hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate block"
                          >
                            {r.student_name}
                          </button>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            NIS: {r.student_nis} • Kelas {r.student_class_snapshot}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg border ${
                            isAkademik
                              ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/20'
                              : isKesantrian
                              ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20'
                              : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                          }`}
                        >
                          {isAkademik ? 'Akademik' : isKesantrian ? 'Kesantrian' : 'Tahfizh'}
                        </span>
                        {isCancelled ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/[0.1]">
                            Dibatalkan
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
                            Aktif
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Violation Detail & Points Badge */}
                    <div className="flex items-start justify-between gap-3 bg-slate-50/80 dark:bg-[#161d31] p-3 rounded-xl border border-slate-200/70 dark:border-white/[0.06]">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">
                          {r.violation_name_snapshot}
                        </p>
                        {r.notes && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic mt-0.5 line-clamp-2">
                            "{r.notes}"
                          </p>
                        )}
                        {isCancelled && r.cancellation_reason && (
                          <p className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold mt-1">
                            Alasan batal: {r.cancellation_reason}
                          </p>
                        )}
                      </div>

                      <span
                        className={`inline-block font-black px-2.5 py-1 rounded-xl text-xs shrink-0 ${
                          r.points_snapshot >= 15
                            ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30'
                            : r.points_snapshot >= 8
                            ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30'
                            : 'bg-slate-100 dark:bg-white/[0.08] text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-white/[0.1]'
                        }`}
                      >
                        +{r.points_snapshot} Poin
                      </span>
                    </div>

                    {/* Footer: Date, Location, Actions */}
                    <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <div>
                        <span>{r.date} • {r.time} WIB</span>
                        <p className="text-slate-400 dark:text-slate-500 truncate max-w-[180px]">
                          {r.halaqah_name_snapshot} ({r.teacher_name_snapshot || 'Pembina'})
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {!isCancelled && (
                          <button
                            onClick={() => setRecordToCancel(r)}
                            className="px-3 py-1.5 rounded-lg text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 border border-amber-200 dark:border-amber-500/20 text-xs font-bold transition-colors min-h-[36px] flex items-center gap-1"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Batalkan</span>
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setRecordToDelete(r)}
                            className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-transparent hover:border-rose-200 dark:hover:border-rose-500/20 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                            title="Hapus Permanen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* VIEW 2: Desktop Table (screens >= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-100/90 dark:bg-white/[0.06] text-slate-800 dark:text-slate-200 uppercase text-[11px] font-black tracking-wider border-b-2 border-slate-200/90 dark:border-white/[0.1]">
                  <tr>
                    <th className="px-4 py-3.5 text-center w-10">
                      <input
                        type="checkbox"
                        checked={filteredRecords.length > 0 && filteredRecords.every((r) => selectedIds.has(r.id))}
                        onChange={() => {
                          if (filteredRecords.every((r) => selectedIds.has(r.id))) {
                            setSelectedIds((prev) => { const n = new Set(prev); filteredRecords.forEach((r) => n.delete(r.id)); return n; });
                          } else {
                            setSelectedIds((prev) => { const n = new Set(prev); filteredRecords.forEach((r) => n.add(r.id)); return n; });
                          }
                        }}
                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-rose-600 focus:ring-rose-500 cursor-pointer"
                        title="Pilih semua"
                      />
                    </th>
                    <th className="px-4 py-3.5 text-center w-12">#</th>
                    <th className="px-4 py-3.5">Tanggal & Waktu</th>
                    <th className="px-4 py-3.5">Divisi</th>
                    <th className="px-4 py-3.5">Nama Santri</th>
                    <th className="px-4 py-3.5">Lokasi / Halaqah & Pembina</th>
                    <th className="px-4 py-3.5">Pelanggaran</th>
                    <th className="px-4 py-3.5 text-center">Poin</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                    <th className="px-4 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                  {filteredRecords.map((r, index) => {
                    const isCancelled = r.status === 'cancelled';
                    const isAkademik = r.division === 'akademik';
                    const isKesantrian = r.division === 'kesantrian';

                    return (
                      <tr
                        key={r.id}
                        className={`hover:bg-slate-50/70 dark:hover:bg-white/[0.03] transition-colors ${
                          isCancelled
                            ? 'bg-slate-50/60 dark:bg-white/[0.02] opacity-60'
                            : selectedIds.has(r.id)
                            ? 'bg-rose-50/40 dark:bg-rose-500/10'
                            : ''
                        }`}
                      >
                        <td className="px-4 py-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(r.id)}
                            onChange={() => toggleSelectRecord(r.id)}
                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-rose-600 focus:ring-rose-500 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3.5 text-center text-xs text-slate-400 dark:text-slate-500 font-medium">
                          {index + 1}
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{r.date}</div>
                          <div className="text-[11px] text-slate-400 dark:text-slate-500">{r.time} WIB</div>
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
                              isAkademik
                                ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/20'
                                : isKesantrian
                                ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20'
                                : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                            }`}
                          >
                            {isAkademik ? (
                              <>
                                <GraduationCap className="w-3 h-3" />
                                Akademik
                              </>
                            ) : isKesantrian ? (
                              <>
                                <Building2 className="w-3 h-3" />
                                Kesantrian
                              </>
                            ) : (
                              <>
                                <BookOpen className="w-3 h-3" />
                                Tahfizh
                              </>
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          <button
                            onClick={() => onSelectStudent && onSelectStudent(r.student_id)}
                            className="text-left font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors block truncate max-w-[180px]"
                          >
                            {r.student_name}
                          </button>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500">
                            NIS: {r.student_nis} • Kelas {r.student_class_snapshot}
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="font-medium text-slate-800 dark:text-slate-200">{r.halaqah_name_snapshot}</div>
                          <div className="text-[11px] text-slate-400 dark:text-slate-500">
                            {r.teacher_name_snapshot || 'Pembina'}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 max-w-xs">
                          <div className="font-bold text-slate-800 dark:text-slate-200">{r.violation_name_snapshot}</div>
                          {r.notes && (
                            <div className="text-xs text-slate-500 dark:text-slate-400 italic mt-0.5 truncate">
                              "{r.notes}"
                            </div>
                          )}
                          {isCancelled && r.cancellation_reason && (
                            <div className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-1">
                              Alasan batal: {r.cancellation_reason}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span
                            className={`inline-block font-black px-2.5 py-1 rounded-xl text-xs ${
                              isCancelled
                                ? 'line-through bg-slate-100 dark:bg-white/[0.06] text-slate-400 dark:text-slate-500'
                                : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
                            }`}
                          >
                            +{r.points_snapshot}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              r.status === 'active'
                                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                                : 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300'
                            }`}
                          >
                            {r.status === 'active' ? 'Aktif' : 'Dibatalkan'}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-right whitespace-nowrap space-x-1">
                          {r.status === 'active' && (
                            <button
                              onClick={() => setRecordToCancel(r)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
                              title="Batalkan Catatan (Soft Delete)"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => setRecordToDelete(r)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                              title="Hapus Permanen"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Cancel Record Modal */}
      {recordToCancel &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto">
            <div className="relative w-full max-w-md m-auto h-auto max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3.5rem)] flex flex-col saas-card overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-white/[0.08] bg-slate-50/80 dark:bg-[#161d31]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold border border-amber-500/20">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Batalkan Catatan Pelanggaran</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Poin santri akan otomatis dikurangi kembali</p>
                  </div>
                </div>
                <button
                  onClick={() => setRecordToCancel(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCancelRecord} className="p-5 space-y-4 overflow-y-auto flex-1">
                {cancelError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span>{cancelError}</span>
                  </div>
                )}

                <div className="p-3.5 bg-slate-50 dark:bg-[#161d31] rounded-xl text-xs space-y-1.5 border border-slate-200 dark:border-white/[0.08]">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Santri:</span>{' '}
                    <strong className="text-slate-800 dark:text-slate-200">{recordToCancel.student_name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Pelanggaran:</span>{' '}
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {recordToCancel.violation_name_snapshot} (+{recordToCancel.points_snapshot} Poin)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Divisi:</span>{' '}
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {recordToCancel.division === 'kesantrian' ? '🏢 Kesantrian' : '🕌 Tahfizh'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Alasan Pembatalan <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Contoh: Salah input nama santri, sudah ada surat dispensasi dokter..."
                    rows={3}
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 dark:focus:border-indigo-400 outline-none"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setRecordToCancel(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] rounded-xl transition-colors"
                  >
                    Tutup
                  </button>
                  <button
                    type="submit"
                    disabled={cancelling}
                    className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-xl shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
                  >
                    {cancelling ? 'Memproses...' : 'Ya, Batalkan Catatan'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Hard Delete Dialog */}
      <ConfirmDialog
        isOpen={!!recordToDelete}
        title="Hapus Catatan Permanen"
        message={`Apakah Anda yakin ingin menghapus data pelanggaran "${recordToDelete?.violation_name_snapshot}" santri ${recordToDelete?.student_name} secara permanen dari database? Tindakan ini tidak dapat diurungkan.`}
        confirmLabel="Hapus Permanen"
        isDestructive={true}
        isLoading={isDeleting}
        error={deleteError}
        onConfirm={handleDeleteRecord}
        onCancel={() => setRecordToDelete(null)}
      />

      {/* Bulk Delete Dialog */}
      <ConfirmDialog
        isOpen={showBulkConfirm}
        title={`Hapus ${selectedIds.size} Catatan Sekaligus`}
        message={`Anda akan menghapus ${selectedIds.size} catatan pelanggaran terpilih secara permanen dari database. Tindakan ini tidak dapat dibatalkan. Lanjutkan?`}
        confirmLabel={isBulkDeleting ? 'Menghapus...' : `Hapus ${selectedIds.size} Catatan`}
        isDestructive={true}
        isLoading={isBulkDeleting}
        onConfirm={handleBulkDeleteRecords}
        onCancel={() => setShowBulkConfirm(false)}
      />
    </div>
  );
};
