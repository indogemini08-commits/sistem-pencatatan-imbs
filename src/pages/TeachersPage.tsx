import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Phone,
  BookOpen,
  CheckCircle2,
  X,
  AlertCircle,
  UserCheck,
  UserPlus,
  User as UserIcon,
  Activity,
} from 'lucide-react';
import type { Teacher, User } from '../types';
import { api } from '../services/api';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface TeachersPageProps {
  currentUser: User | null;
}

export const TeachersPage: React.FC<TeachersPageProps> = ({ currentUser }) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [teacherToEdit, setTeacherToEdit] = useState<Teacher | null>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Form State
  const [formName, setFormName] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formError, setFormError] = useState<string>('');
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);

  useEffect(() => {
    loadTeachers();
    const handleDataChanged = () => {
      loadTeachers();
    };
    window.addEventListener('app:data-changed', handleDataChanged);
    return () => {
      window.removeEventListener('app:data-changed', handleDataChanged);
    };
  }, []);

  const loadTeachers = async () => {
    setLoading(true);
    try {
      const list = await api.teachers.list();
      setTeachers(list);
    } catch (err: any) {
      console.error('Error loading teachers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setFormName('');
    setFormPhone('');
    setFormStatus('active');
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (t: Teacher) => {
    setTeacherToEdit(t);
    setFormName(t.name);
    setFormPhone(t.phone || '');
    setFormStatus(t.status);
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formName) {
      setFormError('Nama muhafizh wajib diisi');
      return;
    }

    setFormSubmitting(true);
    try {
      await api.teachers.create({
        name: formName,
        phone: formPhone,
        status: formStatus,
        actorName: currentUser?.name || 'Admin',
      });
      setIsAddModalOpen(false);
      setSuccessMsg(`Muhafizh "${formName}" berhasil ditambahkan.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      await loadTeachers();
    } catch (err: any) {
      setFormError(err.message || 'Gagal menambahkan muhafizh');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherToEdit) return;
    setFormError('');

    setFormSubmitting(true);
    try {
      await api.teachers.update(teacherToEdit.id, {
        name: formName,
        phone: formPhone,
        status: formStatus,
        actorName: currentUser?.name || 'Admin',
      });
      setIsEditModalOpen(false);
      setSuccessMsg(`Data Muhafizh "${formName}" berhasil diperbarui.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      await loadTeachers();
    } catch (err: any) {
      setFormError(err.message || 'Gagal memperbarui muhafizh');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!teacherToDelete) return;
    const target = teacherToDelete;
    setIsDeleting(true);
    setDeleteError('');
    try {
      await api.teachers.delete(target.id, currentUser?.name || 'Admin');
      setTeachers((prev) => prev.filter((t) => t.id !== target.id));
      setTeacherToDelete(null);
      setSuccessMsg(`Data Muhafizh "${target.name}" berhasil dihapus.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      await loadTeachers();
    } catch (err: any) {
      setDeleteError(err.message || 'Gagal menghapus muhafizh');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-scale-in">
      {/* Title & Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <span>Data Muhafizh / Asatidz</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Daftar asatidz pengampu halaqah tahfizh dan monitoring tanggung jawab halaqah.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="w-full sm:w-auto justify-center min-h-[44px] px-5 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2 cursor-pointer active:scale-[0.98] whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Tambah Muhafizh</span>
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

      {/* Grid of Teachers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {teachers.map((t) => (
          <div
            key={t.id}
            className="glass-panel p-6 flex flex-col justify-between space-y-4 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300"
          >
            {/* Ambient Corner Flare */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-500/10 via-indigo-500/5 to-transparent rounded-bl-full pointer-events-none" />

            <div>
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-indigo-800 text-white flex items-center justify-center font-black text-lg shadow-md shadow-indigo-500/30 ring-4 ring-indigo-500/20">
                  {t.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEdit(t)}
                    title="Edit Data Muhafizh"
                    className="p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:text-amber-700 dark:hover:text-amber-300 bg-slate-100/90 dark:bg-white/10 hover:bg-amber-100/90 dark:hover:bg-amber-950/50 border border-slate-200 dark:border-white/10 transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setTeacherToDelete(t)}
                    title="Hapus Muhafizh"
                    className="p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:text-rose-700 dark:hover:text-rose-300 bg-slate-100/90 dark:bg-white/10 hover:bg-rose-100/90 dark:hover:bg-rose-950/50 border border-slate-200 dark:border-white/10 transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h2 className="text-lg font-black text-slate-900 dark:text-white mt-3.5 tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {t.name}
              </h2>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-[11px] px-2.5 py-0.5 rounded-full font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-xs">
                  {t.status === 'active' ? '● Muhafizh Aktif' : 'Nonaktif'}
                </span>
                {t.email && <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold truncate">{t.email}</span>}
              </div>

              <div className="mt-4 p-2.5 rounded-xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/[0.08] text-xs font-semibold text-slate-800 dark:text-slate-200">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>No. HP / WA: {t.phone || '-'}</span>
                </div>
              </div>
            </div>

            {/* Halaqah Binaan */}
            <div className="pt-4 border-t border-slate-200/80 dark:border-white/10">
              <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2">
                Halaqah yang Diampu:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {t.halaqahList && t.halaqahList.length > 0 ? (
                  t.halaqahList.map((h) => (
                    <span
                      key={h.id}
                      className="px-2.5 py-1 rounded-xl text-xs font-bold bg-indigo-100/90 dark:bg-indigo-950/70 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800/70 flex items-center gap-1.5 shadow-xs"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>{h.name}</span>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500 dark:text-slate-400 italic font-medium">
                    Belum mengampu halaqah
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ==================================================== */}
      {/* MODAL: TAMBAH / EDIT MUHAFIZH                       */}
      {/* ==================================================== */}
      {(isAddModalOpen || isEditModalOpen) &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-scale-in">
            <div className="relative w-full max-w-lg m-auto h-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col bg-white dark:bg-[#111726] rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 dark:border-white/[0.08] overflow-hidden transition-colors">
              {/* Header with SaaS Midnight Indigo Gradient */}
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
                        {isAddModalOpen ? 'Tambah Muhafizh Baru' : 'Edit Data Muhafizh'}
                      </h3>
                      <p className="text-xs text-indigo-200/80 font-light">
                        {isAddModalOpen
                          ? 'Daftarkan ustadz pengampu kegiatan halaqah tahfizh'
                          : 'Perbarui nama lengkap, nomor WhatsApp & status aktif'}
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
                      <UserIcon className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Nama Lengkap Muhafizh</span>
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Contoh: Ustadz Ahmad Al-Hafizh"
                      className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/[0.1] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-slate-50/50 dark:bg-[#161d31] text-slate-900 dark:text-slate-100 hover:bg-white font-medium transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Nomor HP / WhatsApp Aktif</span>
                    </label>
                    <input
                      type="text"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="Contoh: 0812-3456-7890"
                      className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/[0.1] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-slate-50/50 dark:bg-[#161d31] text-slate-900 dark:text-slate-100 hover:bg-white font-medium transition-colors"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Digunakan untuk koordinasi dan kontak pemanggilan santri.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Status Keaktifan</span>
                    </label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as any)}
                      className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/[0.1] focus:border-indigo-500 bg-slate-50/50 dark:bg-[#161d31] text-slate-900 dark:text-slate-100 font-medium transition-colors"
                    >
                      <option value="active">🟢 Aktif Mengampu Halaqah</option>
                      <option value="inactive">⚪ Nonaktif / Cuti</option>
                    </select>
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
                        <span>{isAddModalOpen ? 'Simpan Muhafizh' : 'Perbarui Muhafizh'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!teacherToDelete}
        title="Hapus Data Muhafizh"
        message={`Apakah Anda yakin ingin menghapus "${teacherToDelete?.name}"? Hubungan pengampu pada halaqah terkait akan dikosongkan.`}
        confirmLabel="Hapus Muhafizh"
        isDestructive={true}
        isLoading={isDeleting}
        error={deleteError}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setTeacherToDelete(null);
          setDeleteError('');
        }}
      />
    </div>
  );
};
