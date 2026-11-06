import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Users,
  MapPin,
  Clock,
  Eye,
  CheckCircle2,
  X,
  AlertCircle,
  Layers,
  Calendar,
  UserCheck,
} from 'lucide-react';
import type { Halaqah, Teacher, Student, User } from '../types';
import { api } from '../services/api';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface HalaqahPageProps {
  currentUser: User | null;
  onSelectStudent?: (studentId: string) => void;
}

export const HalaqahPage: React.FC<HalaqahPageProps> = ({
  currentUser,
  onSelectStudent,
}) => {
  const [halaqahs, setHalaqahs] = useState<Halaqah[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [halaqahToEdit, setHalaqahToEdit] = useState<Halaqah | null>(null);
  const [halaqahToDelete, setHalaqahToDelete] = useState<Halaqah | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // View students in halaqah modal
  const [viewStudentsHalaqah, setViewStudentsHalaqah] = useState<Halaqah | null>(null);
  const [studentsInHalaqah, setStudentsInHalaqah] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState<boolean>(false);

  // Form states
  const [formName, setFormName] = useState<string>('');
  const [formTeacherId, setFormTeacherId] = useState<string>('');
  const [formSchedule, setFormSchedule] = useState<string>("Ba'da Subuh & Ba'da Maghrib");
  const [formLocation, setFormLocation] = useState<string>('Masjid Utama');
  const [formYear, setFormYear] = useState<string>('2025/2026');
  const [formError, setFormError] = useState<string>('');
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);

  useEffect(() => {
    loadData();
    const handleDataChanged = () => {
      loadData();
    };
    window.addEventListener('app:data-changed', handleDataChanged);
    return () => {
      window.removeEventListener('app:data-changed', handleDataChanged);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [hList, tList] = await Promise.all([api.halaqah.list(), api.teachers.list()]);
      setHalaqahs(hList);
      setTeachers(tList);
    } catch (err: any) {
      console.error('Error loading halaqah:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setFormName('');
    setFormTeacherId(teachers.length > 0 ? teachers[0].id : '');
    setFormSchedule("Ba'da Subuh & Ba'da Maghrib");
    setFormLocation('Masjid Utama');
    setFormYear('2025/2026');
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (h: Halaqah) => {
    setHalaqahToEdit(h);
    setFormName(h.name);
    setFormTeacherId(h.teacher_id || '');
    setFormSchedule(h.schedule || "Ba'da Subuh");
    setFormLocation(h.location || 'Masjid');
    setFormYear(h.academic_year || '2025/2026');
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formName) {
      setFormError('Nama halaqah wajib diisi');
      return;
    }

    setFormSubmitting(true);
    try {
      await api.halaqah.create({
        name: formName,
        teacherId: formTeacherId || null,
        schedule: formSchedule,
        location: formLocation,
        academicYear: formYear,
        actorName: currentUser?.name || 'Admin',
      });
      setIsAddModalOpen(false);
      setSuccessMsg(`Halaqah "${formName}" berhasil dibuat.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Gagal membuat halaqah');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!halaqahToEdit) return;
    setFormError('');

    if (!formName) {
      setFormError('Nama halaqah tidak boleh kosong');
      return;
    }

    setFormSubmitting(true);
    try {
      await api.halaqah.update(halaqahToEdit.id, {
        name: formName,
        teacherId: formTeacherId || null,
        schedule: formSchedule,
        location: formLocation,
        academicYear: formYear,
        actorName: currentUser?.name || 'Admin',
      });
      setIsEditModalOpen(false);
      setSuccessMsg(`Halaqah "${formName}" berhasil diperbarui.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Gagal mengubah halaqah');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!halaqahToDelete) return;
    const target = halaqahToDelete;
    setIsDeleting(true);
    setDeleteError('');
    try {
      await api.halaqah.delete(target.id, currentUser?.name || 'Admin');
      setHalaqahs((prev) => prev.filter((h) => h.id !== target.id));
      setHalaqahToDelete(null);
      setSuccessMsg(`Halaqah "${target.name}" berhasil dihapus.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      await loadData();
    } catch (err: any) {
      setDeleteError(err.message || 'Gagal menghapus halaqah');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewStudents = async (h: Halaqah) => {
    setViewStudentsHalaqah(h);
    setLoadingStudents(true);
    try {
      const sList = await api.halaqah.getStudents(h.id);
      setStudentsInHalaqah(sList);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingStudents(false);
    }
  };

  return (
    <div className="space-y-6 animate-scale-in">
      {/* Page Title & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <span>Data Halaqah Al-Qur'an</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola kelompok halaqah, ubah nama secara fleksibel, atur muhafizh pengampu, dan pantau anggota santri.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4.5 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2 cursor-pointer active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Halaqah Baru</span>
        </button>
      </div>

      {/* Success Notification Banner */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm rounded-2xl flex items-center justify-between shadow-sm animate-scale-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg('')}
            className="text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Halaqah Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {halaqahs.map((h) => (
          <div
            key={h.id}
            className="bg-white dark:bg-[#111726]/90 rounded-3xl border border-slate-200/90 dark:border-white/[0.08] p-6 shadow-sm hover:shadow-card hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/20">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(h)}
                    title="Edit Nama Halaqah & Pengampu"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setHalaqahToDelete(h)}
                    title="Hapus Halaqah"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Halaqah Title */}
              <h2 className="text-xl font-black text-slate-900 dark:text-white mt-3 tracking-tight">
                {h.name}
              </h2>
              <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-0.5 rounded-md inline-block mt-1 border border-indigo-200 dark:border-indigo-900/40">
                Muhafizh: {h.teacher_name || 'Belum Ditentukan'}
              </p>

              {/* Meta details */}
              <div className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Jadwal: {h.schedule || "Ba'da Subuh"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Lokasi: {h.location || 'Masjid'}</span>
                </div>
              </div>
            </div>

            {/* Bottom Card Action: View Students */}
            <div className="pt-4 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                <Users className="w-4 h-4 text-indigo-500" />
                <span>{h.student_count || 0} Santri Terdaftar</span>
              </div>
              <button
                onClick={() => handleViewStudents(h)}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Lihat Santri</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ==================================================== */}
      {/* MODAL: TAMBAH / EDIT HALAQAH                        */}
      {/* ==================================================== */}
      {(isAddModalOpen || isEditModalOpen) &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-scale-in">
            <div className="relative w-full max-w-lg m-auto h-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col bg-white dark:bg-[#111726] rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 dark:border-white/[0.08] overflow-hidden transition-colors">
            {/* Header with SaaS Midnight Gradient */}
            <div className="bg-gradient-to-r from-[#0d1222] via-[#1e1b4b] to-[#0f172a] text-white p-5 sm:p-6 relative shrink-0 border-b border-indigo-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-500/20 rounded-2xl backdrop-blur-sm ring-1 ring-indigo-400/30">
                    <Layers className="w-6 h-6 text-indigo-300" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                      {isAddModalOpen ? 'Tambah Halaqah Baru' : 'Edit Data Halaqah'}
                    </h3>
                    <p className="text-xs text-indigo-200/80 font-light">
                      {isAddModalOpen
                        ? 'Buat kelompok halaqah tahfizh baru & tentukan pengampu'
                        : 'Ubah nama halaqah, asatidz pengampu, jadwal & lokasi'}
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
              onSubmit={isAddModalOpen ? handleAddSubmit : handleEditSubmit}
              className="flex flex-col flex-1 min-h-0 overflow-hidden"
            >
              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto overscroll-contain flex-1 min-h-0">
                {formError && (
                  <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-200 text-xs sm:text-sm rounded-xl flex items-center gap-2.5 animate-scale-in">
                    <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span className="font-medium">{formError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Nama Kelompok Halaqah</span>
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Misal: Halaqah Doha, Halaqah Makkah..."
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/[0.1] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-slate-50/50 dark:bg-[#161d31] text-slate-900 dark:text-slate-100 hover:bg-white font-medium transition-colors"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                    <span>💡 Nama halaqah dapat diganti kapan saja tanpa merusak catatan masa lalu.</span>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Muhafizh / Ustadz Pengampu</span>
                  </label>
                  <select
                    value={formTeacherId}
                    onChange={(e) => setFormTeacherId(e.target.value)}
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/[0.1] focus:border-indigo-500 bg-slate-50/50 dark:bg-[#161d31] text-slate-900 dark:text-slate-100 font-medium transition-colors"
                  >
                    <option value="">-- Belum Ditentukan (Tanpa Pengampu) --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.phone || 'No HP -'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Jadwal Sesi</span>
                    </label>
                    <input
                      type="text"
                      value={formSchedule}
                      onChange={(e) => setFormSchedule(e.target.value)}
                      placeholder="Ba'da Subuh & Maghrib"
                      className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-300 dark:border-white/[0.1] focus:border-indigo-500 bg-slate-50/50 dark:bg-[#161d31] text-slate-900 dark:text-slate-100 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Lokasi Sesi</span>
                    </label>
                    <input
                      type="text"
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      placeholder="Masjid Lt 2 / Gazebo"
                      className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-300 dark:border-white/[0.1] focus:border-indigo-500 bg-slate-50/50 dark:bg-[#161d31] text-slate-900 dark:text-slate-100 transition-colors"
                    />
                  </div>
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

              <div className="p-4 sm:p-5 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-white/[0.06] shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-[#161d31] hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/[0.1] rounded-xl transition-colors shadow-sm cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer active:scale-[0.98]"
                >
                  {formSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Menyimpan ke Database...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white/90" />
                      <span>{isAddModalOpen ? 'Simpan Halaqah' : 'Perbarui Halaqah'}</span>
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
      {/* MODAL: DAFTAR SANTRI DI HALAQAH                     */}
      {/* ==================================================== */}
      {viewStudentsHalaqah &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-scale-in">
            <div className="relative w-full max-w-lg m-auto h-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col bg-white dark:bg-[#111726] rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200/90 dark:border-white/[0.08] overflow-hidden transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.08] flex-shrink-0">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Santri {viewStudentsHalaqah.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Muhafizh: {viewStudentsHalaqah.teacher_name || '-'}
                </p>
              </div>
              <button
                onClick={() => setViewStudentsHalaqah(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 divide-y divide-slate-100 dark:divide-white/[0.06] overflow-y-auto pr-1 flex-1">
              {studentsInHalaqah.map((s) => (
                <div key={s.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{s.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      NIS: {s.student_number} • Kelas {s.class}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-0.5 rounded-md border border-rose-200 dark:border-rose-900/40">
                    {s.total_points} Poin
                  </span>
                </div>
              ))}

              {studentsInHalaqah.length === 0 && !loadingStudents && (
                <p className="text-center py-8 text-slate-400 text-xs">
                  Belum ada santri terdaftar di halaqah ini.
                </p>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-white/[0.08] text-right flex-shrink-0">
              <button
                onClick={() => setViewStudentsHalaqah(null)}
                className="px-4 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={!!halaqahToDelete}
        title="Hapus Halaqah"
        message={`Apakah Anda yakin ingin menghapus "${halaqahToDelete?.name}"? Santri yang terdaftar di halaqah ini akan dialihkan menjadi tanpa halaqah.`}
        confirmLabel="Hapus Halaqah"
        isDestructive={true}
        isLoading={isDeleting}
        error={deleteError}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setHalaqahToDelete(null);
          setDeleteError('');
        }}
      />
    </div>
  );
};
