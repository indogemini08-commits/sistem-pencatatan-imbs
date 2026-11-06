import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ShieldAlert,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  Sparkles,
  Info,
  Layers,
  Flame,
  Tag,
  Hash,
  FileText,
  Activity,
  BookOpen,
  Building2,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react';
import type { MasterViolation, User, ViolationDivision } from '../types';
import { api } from '../services/api';
import { storageSync } from '../services/storageSync';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface ViolationsMasterPageProps {
  currentUser: User | null;
  initialDivision?: 'tahfizh' | 'kesantrian' | 'akademik' | 'all';
}

export const ViolationsMasterPage: React.FC<ViolationsMasterPageProps> = ({
  currentUser,
  initialDivision = 'all',
}) => {
  const [violations, setViolations] = useState<MasterViolation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [activeDivisionFilter, setActiveDivisionFilter] = useState<'tahfizh' | 'kesantrian' | 'akademik' | 'all'>(initialDivision);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [violationToEdit, setViolationToEdit] = useState<MasterViolation | null>(null);
  const [violationToDelete, setViolationToDelete] = useState<MasterViolation | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string>('');

  // Bulk delete state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState<boolean>(false);

  // Form states
  const [formDivision, setFormDivision] = useState<ViolationDivision>('tahfizh');
  const [formCode, setFormCode] = useState<string>('');
  const [formName, setFormName] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('Tahfizh');
  const [formPoints, setFormPoints] = useState<number>(4);
  const [formDesc, setFormDesc] = useState<string>('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formError, setFormError] = useState<string>('');
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);

  useEffect(() => {
    setActiveDivisionFilter(initialDivision);
  }, [initialDivision]);

  useEffect(() => {
    loadViolations();

    const handleDataChanged = (e: any) => {
      if (!e?.detail?.resource || e?.detail?.resource === 'violation' || e?.detail?.resource === 'all') {
        loadViolations();
      }
    };

    window.addEventListener('app:data-changed', handleDataChanged);
    return () => {
      window.removeEventListener('app:data-changed', handleDataChanged);
    };
  }, []);

  const loadViolations = async () => {
    setLoading(true);
    try {
      const list = await api.violations.list();
      setViolations(list);
    } catch (err: any) {
      console.error('Error loading violations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    const defaultDiv = activeDivisionFilter === 'kesantrian' ? 'kesantrian' : activeDivisionFilter === 'akademik' ? 'akademik' : 'tahfizh';
    setFormDivision(defaultDiv);
    setFormCode('');
    setFormName('');
    setFormCategory(defaultDiv === 'kesantrian' ? 'Ibadah & Shalat' : defaultDiv === 'akademik' ? 'Akademik' : 'Tahfizh');
    setFormPoints(defaultDiv === 'kesantrian' ? 5 : defaultDiv === 'akademik' ? 5 : 4);
    setFormDesc('');
    setFormStatus('active');
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (v: MasterViolation) => {
    setViolationToEdit(v);
    setFormDivision(v.division || 'tahfizh');
    setFormCode(v.code);
    setFormName(v.name);
    setFormCategory(v.category);
    setFormPoints(v.default_points);
    setFormDesc(v.description || '');
    setFormStatus(v.status);
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formName || formPoints <= 0) {
      setFormError('Nama pelanggaran dan jumlah poin (>0) wajib diisi');
      return;
    }

    setFormSubmitting(true);
    try {
      await api.violations.create({
        code: formCode,
        name: formName,
        division: formDivision,
        category: formCategory,
        defaultPoints: formPoints,
        description: formDesc,
        status: formStatus,
        actorName: currentUser?.name || 'Admin',
      });
      setIsAddModalOpen(false);
      await loadViolations();
    } catch (err: any) {
      setFormError(err.message || 'Gagal menambahkan pelanggaran');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!violationToEdit) return;
    setFormError('');

    if (!formName || formPoints <= 0) {
      setFormError('Nama dan poin (>0) wajib diisi');
      return;
    }

    setFormSubmitting(true);
    try {
      await api.violations.update(violationToEdit.id, {
        code: formCode,
        name: formName,
        division: formDivision,
        category: formCategory,
        defaultPoints: formPoints,
        description: formDesc,
        status: formStatus,
        actorName: currentUser?.name || 'Admin',
      });
      setIsEditModalOpen(false);
      await loadViolations();
    } catch (err: any) {
      setFormError(err.message || 'Gagal memperbarui master pelanggaran');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!violationToDelete) return;
    const targetId = violationToDelete.id;
    setIsDeleting(true);
    setDeleteError('');
    try {
      await api.violations.delete(targetId, currentUser?.name || 'Admin');
      setViolations((prev) => prev.filter((v) => v.id !== targetId));
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(targetId); return n; });
      setViolationToDelete(null);
      storageSync.notifyDataChange({ action: 'delete', resource: 'violation', id: targetId });
      await loadViolations();
    } catch (err: any) {
      setDeleteError(err.message || 'Gagal menghapus master pelanggaran');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSelectViolation = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDeleteViolations = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setIsBulkDeleting(true);
    try {
      await api.violations.bulkDelete(ids, currentUser?.name || 'Admin');
      setViolations((prev) => prev.filter((v) => !selectedIds.has(v.id)));
      setSelectedIds(new Set());
      setShowBulkConfirm(false);
      storageSync.notifyDataChange({ action: 'delete', resource: 'violation' });
      await loadViolations();
    } catch (err: any) {
      alert('Gagal menghapus aturan secara massal: ' + (err?.message || err));
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const filteredViolations = violations
    .filter((v) => {
      const matchSearch =
        v.name.toLowerCase().includes(search.toLowerCase()) ||
        v.code.toLowerCase().includes(search.toLowerCase()) ||
        (v.description && v.description.toLowerCase().includes(search.toLowerCase()));

      const matchDivision =
        activeDivisionFilter === 'all' || (v.division || 'tahfizh') === activeDivisionFilter;

      const matchCategory = selectedCategory === 'all' || v.category === selectedCategory;

      return matchSearch && matchDivision && matchCategory;
    })
    .sort((a, b) => (Number(b.default_points) || 0) - (Number(a.default_points) || 0));

  const categories = [
    'Tahfizh',
    'Ibadah & Shalat',
    'Ketertiban Asrama',
    'Kedisiplinan',
    'Kehadiran',
    'Adab & Akhlak',
    'Akademik',
    'Tugas & PR',
    'Ketertiban Kelas',
    'Ujian & Evaluasi',
    'Kehadiran KBM',
    'Lainnya',
  ];

  const tahfizhCount = violations.filter((v) => (v.division || 'tahfizh') === 'tahfizh').length;
  const kesantrianCount = violations.filter((v) => v.division === 'kesantrian').length;
  const akademikCount = violations.filter((v) => v.division === 'akademik').length;

  return (
    <div className="space-y-5 sm:space-y-6 animate-scale-in">
      {/* Title & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-inner shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Master Pelanggaran & Poin
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Atur aturan dan bobot sanksi terpadu untuk Divisi Tahfizh, Kesantrian, dan Akademik.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          {selectedIds.size > 0 && (
            <button
              onClick={() => setShowBulkConfirm(true)}
              className="w-full sm:w-auto justify-center min-h-[44px] px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-500/20 transition-all flex items-center gap-2 active:scale-[0.98]"
            >
              <Trash2 className="w-4 h-4" />
              <span>Hapus {selectedIds.size} Aturan</span>
            </button>
          )}

          <button
            onClick={handleOpenAdd}
            className="w-full sm:w-auto justify-center min-h-[44px] px-5 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2 active:scale-[0.98] whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Tambah Aturan Baru</span>
          </button>
        </div>
      </div>

      {/* Division Navigation Switcher */}
      <div className="w-full overflow-x-auto no-scrollbar -mx-1 px-1">
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-200/70 dark:bg-[#111726] border border-slate-300/60 dark:border-white/[0.08] rounded-2xl w-max shadow-soft text-xs font-bold">
          <button
            onClick={() => setActiveDivisionFilter('all')}
            className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeDivisionFilter === 'all'
                ? 'bg-white dark:bg-[#1e2742] text-slate-900 dark:text-white shadow-soft ring-1 ring-slate-300 dark:ring-white/[0.1]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/40 dark:hover:bg-white/[0.04]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Semua Master</span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#111726] text-[10px] text-slate-700 dark:text-slate-300 font-extrabold border border-slate-200 dark:border-white/[0.1]">
              {violations.length}
            </span>
          </button>

          <button
            onClick={() => setActiveDivisionFilter('tahfizh')}
            className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeDivisionFilter === 'tahfizh'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-300/40 dark:hover:bg-white/[0.04]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Tahfizh</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeDivisionFilter === 'tahfizh' ? 'bg-white/20 text-white' : 'bg-slate-300/80 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300'
            }`}>
              {tahfizhCount}
            </span>
          </button>

          <button
            onClick={() => setActiveDivisionFilter('kesantrian')}
            className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeDivisionFilter === 'kesantrian'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-300/40 dark:hover:bg-white/[0.04]'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Kesantrian</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeDivisionFilter === 'kesantrian' ? 'bg-white/20 text-white' : 'bg-slate-300/80 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300'
            }`}>
              {kesantrianCount}
            </span>
          </button>

          <button
            onClick={() => setActiveDivisionFilter('akademik')}
            className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeDivisionFilter === 'akademik'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-300/40 dark:hover:bg-white/[0.04]'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Akademik</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeDivisionFilter === 'akademik' ? 'bg-white/20 text-white' : 'bg-slate-300/80 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300'
            }`}>
              {akademikCount}
            </span>
          </button>
        </div>
      </div>

      {/* Snapshot Safe Guarantee Notice */}
      <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-500/10 border border-indigo-200/80 dark:border-indigo-500/20 flex items-start gap-3 text-xs sm:text-sm text-indigo-950 dark:text-indigo-200">
        <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">Keamanan Data Historis (Snapshot Terpadu):</p>
          <p className="text-indigo-800/80 dark:text-indigo-300/80 text-xs mt-0.5 leading-relaxed">
            Perubahan nama atau nilai poin pada master ini tidak akan mengubah catatan riwayat pelanggaran santri yang sudah tersimpan sebelumnya. Kedua divisi menggunakan batas evaluasi (threshold) poin yang sama.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="saas-card p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode atau nama pelanggaran..."
            className="w-full min-h-[42px] text-xs sm:text-sm pl-10 pr-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 outline-none"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
          <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 sm:whitespace-nowrap">Kategori:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-48 min-h-[42px] text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-white font-medium focus:border-indigo-500 outline-none"
          >
            <option value="all">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* MOBILE CARDS VIEW */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <div className="saas-card p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Memuat master data aturan...</span>
          </div>
        ) : filteredViolations.length === 0 ? (
          <div className="saas-card p-12 text-center text-slate-400">
            Tidak ada aturan pelanggaran yang sesuai dengan filter.
          </div>
        ) : (
          filteredViolations.map((v) => {
            const isAkademik = v.division === 'akademik';
            const isKesantrian = v.division === 'kesantrian';
            return (
              <div
                key={v.id}
                className={`saas-card p-4 space-y-3 transition-colors ${
                  selectedIds.has(v.id) ? 'bg-rose-50/40 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/30' : ''
                }`}
              >
                {/* Header Card */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(v.id)}
                      onChange={() => toggleSelectViolation(v.id)}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.06] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/[0.1]">
                      {v.code}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${
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
                  </div>

                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      v.status === 'active'
                        ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                        : 'bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {v.status === 'active' ? 'Aktif' : 'Non-Aktif'}
                  </span>
                </div>

                {/* Violation Name & Desc */}
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">{v.name}</h3>
                  {v.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{v.description}</p>
                  )}
                </div>

                {/* Category, Usage & Bobot Poin */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
                  <div className="flex items-center gap-1.5 flex-wrap text-xs">
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-[#161d31] text-slate-700 dark:text-slate-300 rounded-lg font-semibold text-[11px] border border-slate-200 dark:border-white/[0.08]">
                      {v.category}
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      Dipakai: <strong>{v.usage_count || 0}x</strong>
                    </span>
                  </div>

                  <span className="inline-block px-2.5 py-1 font-black text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl text-xs">
                    +{v.default_points} Poin
                  </span>
                </div>

                {/* One-Handed Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(v)}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold text-xs flex items-center justify-center gap-1.5 border border-amber-200 dark:border-amber-500/20 active:scale-95 transition-all"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Ubah Aturan</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViolationToDelete(v)}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 font-bold text-xs flex items-center justify-center gap-1.5 border border-rose-200 dark:border-rose-500/20 active:scale-95 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DESKTOP TABLE VIEW */}
      <div className="hidden md:block saas-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-100/90 dark:bg-white/[0.06] text-slate-800 dark:text-slate-200 uppercase text-[11px] font-black tracking-wider border-b-2 border-slate-200/90 dark:border-white/[0.1]">
              <tr>
                <th className="py-3.5 px-4 text-center w-12">
                  <input
                    type="checkbox"
                    checked={filteredViolations.length > 0 && filteredViolations.every((v) => selectedIds.has(v.id))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(new Set(filteredViolations.map((v) => v.id)));
                      } else {
                        setSelectedIds(new Set());
                      }
                    }}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-rose-600 focus:ring-rose-500 cursor-pointer"
                    title="Pilih semua"
                  />
                </th>
                <th className="py-3.5 px-4">Kode</th>
                <th className="py-3.5 px-4">Divisi</th>
                <th className="py-3.5 px-4">Nama Pelanggaran</th>
                <th className="py-3.5 px-4">Kategori</th>
                <th className="py-3.5 px-4 text-center">Bobot Poin</th>
                <th className="py-3.5 px-4 text-center">Dipakai</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      <span>Memuat master data aturan...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredViolations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    Tidak ada aturan pelanggaran yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredViolations.map((v) => {
                  const isAkademik = v.division === 'akademik';
                  const isKesantrian = v.division === 'kesantrian';

                  return (
                    <tr key={v.id} className={`transition-colors ${selectedIds.has(v.id) ? 'bg-rose-50/40 dark:bg-rose-500/10' : 'hover:bg-slate-50/70 dark:hover:bg-white/[0.03]'}`}>
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(v.id)}
                          onChange={() => toggleSelectViolation(v.id)}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-rose-600 focus:ring-rose-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {v.code}
                      </td>

                      <td className="py-3.5 px-4">
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

                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="font-bold text-slate-900 dark:text-white">{v.name}</p>
                        {v.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{v.description}</p>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 dark:bg-[#161d31] text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-white/[0.08]">
                          {v.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-3 py-1 font-black text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl text-xs sm:text-sm">
                          +{v.default_points} Poin
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center text-xs text-slate-600 dark:text-slate-400 font-semibold">
                        {v.usage_count || 0}x
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            v.status === 'active'
                              ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                              : 'bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {v.status === 'active' ? 'Aktif' : 'Non-Aktif'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenEdit(v)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                          title="Edit Master Pelanggaran"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setViolationToDelete(v)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                          title="Hapus Master Pelanggaran"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL TAMBAH MASTER */}
      {isAddModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto">
            <div className="relative w-full max-w-lg m-auto h-auto max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3.5rem)] flex flex-col saas-card overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-white/[0.08] bg-slate-50/80 dark:bg-[#161d31]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold border border-indigo-500/20">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Tambah Aturan Pelanggaran Baru</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Tentukan divisi, nama, dan bobot poin sanksi</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
                {formError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Pilih Divisi */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Divisi Pelanggaran
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFormDivision('tahfizh');
                        setFormCategory('Tahfizh');
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        formDivision === 'tahfizh'
                          ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-500 text-emerald-800 dark:text-emerald-300 shadow-soft ring-1 ring-emerald-500/30'
                          : 'bg-white dark:bg-[#161d31] border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>🕌 Tahfizh</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormDivision('kesantrian');
                        setFormCategory('Ibadah & Shalat');
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        formDivision === 'kesantrian'
                          ? 'bg-blue-50 dark:bg-blue-500/15 border-blue-500 text-blue-800 dark:text-blue-300 shadow-soft ring-1 ring-blue-500/30'
                          : 'bg-white dark:bg-[#161d31] border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>🏢 Kesantrian</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormDivision('akademik');
                        setFormCategory('Akademik');
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        formDivision === 'akademik'
                          ? 'bg-purple-50 dark:bg-purple-500/15 border-purple-500 text-purple-800 dark:text-purple-300 shadow-soft ring-1 ring-purple-500/30'
                          : 'bg-white dark:bg-[#161d31] border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                      }`}
                    >
                      <GraduationCap className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      <span>📚 Akademik</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Kode (Opsional)
                    </label>
                    <input
                      type="text"
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                      placeholder={formDivision === 'kesantrian' ? 'KS001' : formDivision === 'akademik' ? 'AK001' : 'P001'}
                      className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Kategori
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Pelanggaran
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Misal: Terlambat Shalat Berjamaah Subuh"
                    className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Default Poin Pelanggaran (Angka Positif &gt; 0)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formPoints}
                    onChange={(e) => setFormPoints(parseInt(e.target.value, 10) || 1)}
                    className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-rose-600 dark:text-rose-400 font-bold focus:border-indigo-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Deskripsi / Aturan Kriteria (Opsional)
                  </label>
                  <textarea
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="Penjelasan kriteria pelanggaran..."
                    rows={2}
                    className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-3 border-t border-slate-100 dark:border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="w-full sm:w-auto justify-center min-h-[42px] px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] rounded-xl flex items-center transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="w-full sm:w-auto justify-center min-h-[42px] px-4 py-2 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 flex items-center active:scale-[0.98]"
                  >
                    {formSubmitting ? 'Menyimpan...' : 'Simpan Master Aturan'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* MODAL EDIT MASTER */}
      {isEditModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto">
            <div className="relative w-full max-w-lg m-auto h-auto max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3.5rem)] flex flex-col saas-card overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-white/[0.08] bg-slate-50/80 dark:bg-[#161d31]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold border border-indigo-500/20">
                    <Edit2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Ubah Master Pelanggaran</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Perubahan poin aman & tidak merusak historis</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
                {formError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Pilih Divisi */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Divisi Pelanggaran
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormDivision('tahfizh')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        formDivision === 'tahfizh'
                          ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-500 text-emerald-800 dark:text-emerald-300 shadow-soft ring-1 ring-emerald-500/30'
                          : 'bg-white dark:bg-[#161d31] border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>🕌 Tahfizh</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormDivision('kesantrian')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        formDivision === 'kesantrian'
                          ? 'bg-blue-50 dark:bg-blue-500/15 border-blue-500 text-blue-800 dark:text-blue-300 shadow-soft ring-1 ring-blue-500/30'
                          : 'bg-white dark:bg-[#161d31] border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>🏢 Kesantrian</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormDivision('akademik')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        formDivision === 'akademik'
                          ? 'bg-purple-50 dark:bg-purple-500/15 border-purple-500 text-purple-800 dark:text-purple-300 shadow-soft ring-1 ring-purple-500/30'
                          : 'bg-white dark:bg-[#161d31] border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                      }`}
                    >
                      <GraduationCap className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      <span>📚 Akademik</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Kode
                    </label>
                    <input
                      type="text"
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                      className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-white focus:border-indigo-500 font-mono font-bold outline-none"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Kategori
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Pelanggaran
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-white focus:border-indigo-500 font-medium outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Bobot Poin Pelanggaran
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formPoints}
                      onChange={(e) => setFormPoints(parseInt(e.target.value, 10) || 1)}
                      className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-rose-600 dark:text-rose-400 font-black focus:border-indigo-500 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Status
                    </label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as any)}
                      className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
                    >
                      <option value="active">Aktif</option>
                      <option value="inactive">Non-Aktif</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Deskripsi Aturan
                  </label>
                  <textarea
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    rows={2}
                    className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-3 border-t border-slate-100 dark:border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="w-full sm:w-auto justify-center min-h-[42px] px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] rounded-xl flex items-center transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="w-full sm:w-auto justify-center min-h-[42px] px-4 py-2 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 flex items-center active:scale-[0.98]"
                  >
                    {formSubmitting ? 'Memperbarui...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!violationToDelete}
        title="Hapus Master Pelanggaran"
        message={`Apakah Anda yakin ingin menghapus master aturan "${violationToDelete?.name}" (${violationToDelete?.code})? Catatan historis kejadian lama tetap aman di rekap santri.`}
        confirmLabel="Hapus Aturan"
        isDestructive={true}
        isLoading={isDeleting}
        error={deleteError}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setViolationToDelete(null)}
      />

      {/* Bulk Delete Dialog */}
      <ConfirmDialog
        isOpen={showBulkConfirm}
        title="Hapus Massal Master Pelanggaran"
        message={`Apakah Anda yakin ingin menghapus ${selectedIds.size} master aturan pelanggaran yang dipilih? Catatan riwayat kejadian masa lalu tetap aman di rekap santri.`}
        confirmLabel={isBulkDeleting ? 'Menghapus...' : `Hapus ${selectedIds.size} Aturan`}
        isDestructive={true}
        isLoading={isBulkDeleting}
        onConfirm={handleBulkDeleteViolations}
        onCancel={() => setShowBulkConfirm(false)}
      />
    </div>
  );
};
