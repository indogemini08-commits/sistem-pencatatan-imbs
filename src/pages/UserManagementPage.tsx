import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  UserCog,
  Plus,
  Edit2,
  Trash2,
  ShieldCheck,
  Mail,
  Lock,
  CheckCircle2,
  X,
  AlertCircle,
  UserCheck,
  UserPlus,
  User as UserIcon,
  Shield,
  Activity,
  Phone,
  Eye,
  EyeOff,
  Copy,
  Check,
  KeyRound,
} from 'lucide-react';
import type { User, UserRole } from '../types';
import { api } from '../services/api';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface UserManagementPageProps {
  currentUser: User | null;
  onUserUpdated?: (user: User) => void;
}

export const UserManagementPage: React.FC<UserManagementPageProps> = ({
  currentUser,
  onUserUpdated,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string>('');

  // Form states
  const [formName, setFormName] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formPassword, setFormPassword] = useState<string>('');
  const [formRole, setFormRole] = useState<UserRole>('teacher');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formMustChangePassword, setFormMustChangePassword] = useState<boolean>(true);
  const [showFormPassword, setShowFormPassword] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);

  // Table password visibility & copy states
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Dedicated Reset Password Modal states
  const [resetModalUser, setResetModalUser] = useState<User | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState<string>('');
  const [resetMustChange, setResetMustChange] = useState<boolean>(true);
  const [showResetPassword, setShowResetPassword] = useState<boolean>(false);
  const [showResetCurrentPassword, setShowResetCurrentPassword] = useState<boolean>(false);
  const [resetSubmitting, setResetSubmitting] = useState<boolean>(false);
  const [resetError, setResetError] = useState<string>('');

  useEffect(() => {
    loadUsers();
    const handleDataChanged = () => {
      loadUsers();
    };
    window.addEventListener('app:data-changed', handleDataChanged);
    return () => {
      window.removeEventListener('app:data-changed', handleDataChanged);
    };
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const list = await api.users.list();
      setUsers(list);
    } catch (err: any) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const handleCopyPassword = async (pass: string, id: string) => {
    if (!pass) return;
    try {
      await navigator.clipboard.writeText(pass);
      setCopiedId(id);
      setSuccessMsg('Kata sandi berhasil disalin ke clipboard!');
      setTimeout(() => {
        setCopiedId(null);
        setSuccessMsg('');
      }, 3000);
    } catch {
      alert('Gagal menyalin kata sandi');
    }
  };

  const handleOpenResetPassword = (u: User) => {
    setResetModalUser(u);
    setResetNewPassword('');
    setResetMustChange(true);
    setShowResetPassword(false);
    setShowResetCurrentPassword(false);
    setResetError('');
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser) return;
    if (!resetNewPassword || resetNewPassword.length < 6) {
      setResetError('Kata sandi baru minimal 6 karakter');
      return;
    }
    setResetSubmitting(true);
    setResetError('');
    try {
      await api.users.update(resetModalUser.id, {
        password: resetNewPassword,
        must_change_password: resetMustChange ? 1 : 0,
        actorName: currentUser?.name || 'Admin',
      });
      setSuccessMsg(`Kata sandi untuk "${resetModalUser.name}" berhasil diubah!`);
      setTimeout(() => setSuccessMsg(''), 4000);
      setResetModalUser(null);
      await loadUsers();
    } catch (err: any) {
      setResetError(err.message || 'Gagal mengubah kata sandi');
    } finally {
      setResetSubmitting(false);
    }
  };

  const handleOpenAdd = () => {
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('teacher');
    setFormStatus('active');
    setFormPhone('');
    setFormMustChangePassword(true);
    setShowFormPassword(false);
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (u: User) => {
    setUserToEdit(u);
    setFormName(u.name);
    setFormEmail(u.email);
    setFormPassword(u.password || '');
    setFormRole(u.role);
    setFormStatus(u.status);
    setFormPhone('');
    setFormMustChangePassword(Boolean(u.must_change_password || u.mustChangePassword));
    setShowFormPassword(false);
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanName = formName.trim();
    const cleanEmail = formEmail.trim().toLowerCase();

    if (!cleanName || !cleanEmail || !formPassword) {
      setFormError('Nama, email/username, dan kata sandi wajib diisi');
      return;
    }

    setFormSubmitting(true);
    try {
      await api.users.create({
        name: cleanName,
        email: cleanEmail,
        password: formPassword,
        role: formRole,
        status: formStatus,
        phone: formPhone,
        actorName: currentUser?.name || 'Admin',
      });
      setIsAddModalOpen(false);
      setSuccessMsg(`Akun "${cleanName}" (${cleanEmail}) berhasil ditambahkan.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      await loadUsers();
    } catch (err: any) {
      setFormError(err.message || 'Gagal menambahkan akun');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit) return;
    setFormError('');

    const cleanName = formName.trim();
    const cleanEmail = formEmail.trim().toLowerCase();

    if (!cleanName || !cleanEmail) {
      setFormError('Nama dan email/username wajib diisi');
      return;
    }

    setFormSubmitting(true);
    try {
      const res = await api.users.update(userToEdit.id, {
        name: cleanName,
        email: cleanEmail,
        password: formPassword || undefined,
        role: formRole,
        status: formStatus,
        must_change_password: formMustChangePassword ? 1 : 0,
        actorName: currentUser?.name || 'Admin',
      });

      const updatedUser: User = res.user || {
        ...userToEdit,
        name: cleanName,
        email: cleanEmail,
        role: formRole,
        status: formStatus,
      };

      if (
        currentUser &&
        (userToEdit.id === currentUser.id || userToEdit.email.toLowerCase() === currentUser.email.toLowerCase())
      ) {
        const fullCurrentUser = {
          ...currentUser,
          name: cleanName,
          email: cleanEmail,
          role: formRole,
          status: formStatus,
        };
        onUserUpdated?.(fullCurrentUser);
        localStorage.setItem('halaqah_user', JSON.stringify(fullCurrentUser));
        if (sessionStorage.getItem('halaqah_user')) {
          sessionStorage.setItem('halaqah_user', JSON.stringify(fullCurrentUser));
        }
      }

      setIsEditModalOpen(false);
      setSuccessMsg(`Akun "${cleanName}" berhasil diperbarui.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      await loadUsers();
    } catch (err: any) {
      setFormError(err.message || 'Gagal memperbarui akun');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      await api.users.delete(userToDelete.id, currentUser?.name || 'Admin');
      const deletedName = userToDelete.name;
      setUserToDelete(null);
      setSuccessMsg(`Akun "${deletedName}" berhasil dihapus.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      await loadUsers();
    } catch (err: any) {
      setDeleteError(err.message || 'Gagal menghapus pengguna');
    } finally {
      setIsDeleting(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20">
            Admin
          </span>
        );
      case 'coordinator':
        return (
          <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-500/20">
            Koordinator Tahfizh
          </span>
        );
      case 'kepala_kesantrian':
        return (
          <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20">
            Kepala Kesantrian
          </span>
        );
      case 'teacher':
        return (
          <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20">
            Muhafizh Halaqah
          </span>
        );
      case 'guru':
        return (
          <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-teal-50 dark:bg-teal-500/10 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-500/20">
            Guru Pengajar
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-scale-in">
      {/* Title & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-inner shrink-0">
            <UserCog className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Manajemen Akun Pengguna
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Kelola hak akses pengguna, tambahkan akun baru, ubah role, dan atur kata sandi.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="w-full sm:w-auto justify-center min-h-[44px] px-5 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2 active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Tambah Akun Baru</span>
        </button>
      </div>

      {/* Success Notification Banner */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm rounded-2xl flex items-center justify-between shadow-soft animate-scale-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg('')}
            className="text-emerald-500 hover:text-emerald-700 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Users Table */}
      <div className="saas-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-100/90 dark:bg-white/[0.06] text-slate-800 dark:text-slate-200 uppercase text-[11px] font-black tracking-wider border-b-2 border-slate-200/90 dark:border-white/[0.1]">
              <tr>
                <th className="px-4 py-3.5 text-center w-12">#</th>
                <th className="px-4 py-3.5">Nama Pengguna</th>
                <th className="px-4 py-3.5">Email / Login ID</th>
                <th className="px-4 py-3.5">Role / Hak Akses</th>
                <th className="px-4 py-3.5">Kata Sandi</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5">Tanggal Terdaftar</th>
                <th className="px-4 py-3.5 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
              {users.map((u, idx) => (
                <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.03] transition-colors">
                  <td className="px-4 py-3.5 text-center font-bold text-slate-400 dark:text-slate-500">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-bold text-slate-900 dark:text-white">{u.name}</p>
                    {u.id === currentUser?.id && (
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-500/20 inline-block mt-0.5">
                        (Akun Anda)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 font-medium text-slate-600 dark:text-slate-300">
                    {u.email}
                  </td>
                  <td className="px-4 py-3.5">
                    {getRoleBadge(u.role)}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1 bg-slate-50 dark:bg-[#161d31] border border-slate-200 dark:border-white/[0.08] px-2.5 py-1 rounded-xl w-fit">
                        <span className="font-mono text-xs text-slate-800 dark:text-slate-200 select-all font-semibold tracking-wider">
                          {visiblePasswords[u.id] ? (u.password || '••••••••') : '••••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(u.id)}
                          title={visiblePasswords[u.id] ? "Sembunyikan Kata Sandi" : "Lihat Kata Sandi"}
                          className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md transition-colors cursor-pointer"
                        >
                          {visiblePasswords[u.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyPassword(u.password || '', u.id)}
                          title="Salin Kata Sandi"
                          className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-md transition-colors cursor-pointer"
                        >
                          {copiedId === u.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      {Boolean(u.must_change_password || u.mustChangePassword) && (
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-2 py-0.5 rounded-full w-fit" title="Pengguna ini wajib mengganti kata sandi saat login pertama kali">
                          Wajib Ganti Sandi
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {u.status === 'active' ? (
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                        Aktif
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-white/[0.06] px-2.5 py-0.5 rounded-full">
                        Nonaktif
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 text-xs">
                    {u.created_at ? u.created_at.substring(0, 10) : '-'}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleOpenResetPassword(u)}
                        title="Ubah / Reset Kata Sandi"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors cursor-pointer"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(u)}
                        title="Edit Akun"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setUserToDelete(u)}
                        disabled={u.id === currentUser?.id}
                        title={u.id === currentUser?.id ? 'Tidak dapat menghapus akun sendiri' : 'Hapus Akun'}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: TAMBAH / EDIT AKUN USER */}
      {(isAddModalOpen || isEditModalOpen) &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-scale-in">
            <div className="relative w-full max-w-lg m-auto h-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col saas-card overflow-hidden shadow-2xl">
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-indigo-800 text-white p-5 sm:p-6 flex items-center justify-between shrink-0 relative overflow-hidden">
                <div className="flex items-center gap-3.5 relative z-10">
                  <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                    {isAddModalOpen ? (
                      <UserPlus className="w-5 h-5 text-emerald-300" />
                    ) : (
                      <ShieldCheck className="w-5 h-5 text-amber-300" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      {isAddModalOpen ? 'Tambah Akun Pengguna' : 'Edit Akun Pengguna'}
                    </h3>
                    <p className="text-xs text-indigo-200/80 font-normal">
                      {isAddModalOpen
                        ? 'Daftarkan hak akses login pengurus atau muhafizh'
                        : `Memperbarui kredensial & hak akses: ${userToEdit?.name || ''}`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="text-white/70 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors relative z-10 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form
                onSubmit={isAddModalOpen ? handleAddSubmit : handleEditSubmit}
                className="flex flex-col flex-1 min-h-0 overflow-hidden"
              >
                <div className="p-5 sm:p-6 space-y-4 overflow-y-auto overscroll-contain flex-1 min-h-0">
                  {formError && (
                    <div className="p-3.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs sm:text-sm rounded-xl flex items-center gap-2.5">
                      <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      <UserIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Nama Lengkap Pengguna</span>
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Contoh: Ustadz Ahmad Dahlan / Petugas Piket"
                      className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-white focus:border-indigo-500 font-medium outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      <Mail className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Alamat Email (Username Login)</span>
                    </label>
                    <input
                      type="text"
                      inputMode="email"
                      autoComplete="username"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="contoh: ustadz@pesantren.id atau username"
                      className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-white focus:border-indigo-500 font-medium outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-amber-500" />
                        <span>
                          {isAddModalOpen ? 'Kata Sandi Awal' : 'Kata Sandi Akun'}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowFormPassword(!showFormPassword)}
                        className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                      >
                        {showFormPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{showFormPassword ? 'Sembunyikan' : 'Lihat Sandi'}</span>
                      </button>
                    </label>
                    <div className="relative">
                      <input
                        type={showFormPassword ? 'text' : 'password'}
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        placeholder={isAddModalOpen ? 'Minimal 6 karakter...' : 'Ketik kata sandi baru atau biarkan jika tidak berubah'}
                        className="w-full text-xs sm:text-sm pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-white focus:border-indigo-500 font-mono outline-none"
                        required={isAddModalOpen}
                      />
                      <button
                        type="button"
                        onClick={() => setShowFormPassword(!showFormPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                      >
                        {showFormPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <label className="flex items-center gap-2 mt-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formMustChangePassword}
                        onChange={(e) => setFormMustChangePassword(e.target.checked)}
                        className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                      <span>Wajibkan pengguna ubah kata sandi saat login berikutnya</span>
                    </label>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                      {isAddModalOpen
                        ? 'Pengguna baru akan langsung diminta membuat kata sandi mandiri begitu pertama kali masuk.'
                        : 'Admin memiliki akses penuh melihat dan mereset kata sandi jika pengguna lupa sandi.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        <Shield className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Role Akses</span>
                      </label>
                      <select
                        value={formRole}
                        onChange={(e) => setFormRole(e.target.value as UserRole)}
                        className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-white focus:border-indigo-500 font-medium outline-none"
                      >
                        <option value="teacher">Muhafizh (Input HP Halaqah)</option>
                        <option value="guru">Guru (Input Kedisiplinan / Kelas)</option>
                        <option value="coordinator">Koordinator Tahfizh</option>
                        <option value="kepala_kesantrian">Kepala Kesantrian</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        <Activity className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Status Akun</span>
                      </label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as any)}
                        className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-white focus:border-indigo-500 font-medium outline-none"
                      >
                        <option value="active">Aktif (Dapat Login)</option>
                        <option value="inactive">Nonaktif (Diblokir)</option>
                      </select>
                    </div>
                  </div>

                  {isAddModalOpen && (formRole === 'teacher' || formRole === 'guru') && (
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>No. WhatsApp {formRole === 'guru' ? 'Guru' : 'Muhafizh'} (Opsional)</span>
                      </label>
                      <input
                        type="text"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        placeholder="0812-3456-7890"
                        className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
                      />
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Otomatis sinkron jika akun terhubung ke data muhafizh halaqah</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-4 sm:p-5 bg-slate-50 dark:bg-[#161d31] border-t border-slate-100 dark:border-white/[0.08] shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setIsEditModalOpen(false);
                    }}
                    className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.1] hover:bg-slate-100 dark:hover:bg-white/[0.04] rounded-xl transition-all shadow-soft"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="px-5 py-2 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {formSubmitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                        <span>{isAddModalOpen ? 'Simpan Akun Baru' : 'Simpan Perubahan'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* MODAL: RESET / KELOLA KATA SANDI OLEH ADMIN */}
      {resetModalUser &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-scale-in">
            <div className="relative w-full max-w-md m-auto flex flex-col saas-card overflow-hidden shadow-2xl">
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-indigo-800 text-white p-5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                    <KeyRound className="w-5 h-5 text-amber-300" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      Kelola Kata Sandi Pengguna
                    </h3>
                    <p className="text-xs text-indigo-200/80">
                      Akses Khusus Administrator
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleResetPasswordSubmit}>
                <div className="p-5 space-y-4">
                  {/* User Profile Info Card */}
                  <div className="p-3.5 bg-slate-50 dark:bg-[#161d31] rounded-2xl border border-slate-200/70 dark:border-white/[0.08] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Pengguna:</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{resetModalUser.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Email / Login ID:</span>
                      <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">{resetModalUser.email}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-white/[0.06]">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Kata Sandi Saat Ini:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-[#111726] px-2 py-0.5 rounded border border-slate-200 dark:border-white/[0.1] select-all">
                          {showResetCurrentPassword ? (resetModalUser.password || '-') : '••••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowResetCurrentPassword(!showResetCurrentPassword)}
                          className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded cursor-pointer"
                          title="Lihat / Sembunyikan Sandi"
                        >
                          {showResetCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyPassword(resetModalUser.password || '', resetModalUser.id)}
                          className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded cursor-pointer"
                          title="Salin Sandi Saat Ini"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {resetError && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{resetError}</span>
                    </div>
                  )}

                  {/* Input Kata Sandi Baru */}
                  <div>
                    <label className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      <span>Kata Sandi Baru</span>
                      <button
                        type="button"
                        onClick={() => {
                          const randomPin = Math.floor(100000 + Math.random() * 900000).toString();
                          setResetNewPassword(randomPin);
                          setShowResetPassword(true);
                        }}
                        className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                      >
                        ⚡ Buat PIN Acak
                      </button>
                    </label>
                    <div className="relative">
                      <input
                        type={showResetPassword ? 'text' : 'password'}
                        value={resetNewPassword}
                        onChange={(e) => setResetNewPassword(e.target.value)}
                        placeholder="Ketik kata sandi baru (min. 6 karakter)..."
                        className="w-full text-xs sm:text-sm pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-white focus:border-indigo-500 font-mono outline-none"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetPassword(!showResetPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                      >
                        {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Checkbox Wajib Ganti Sandi */}
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={resetMustChange}
                      onChange={(e) => setResetMustChange(e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <span>Wajibkan pengguna ubah kata sandi ini saat login</span>
                  </label>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2.5 p-4 bg-slate-50 dark:bg-[#161d31] border-t border-slate-100 dark:border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setResetModalUser(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.1] hover:bg-slate-100 dark:hover:bg-white/[0.04] rounded-xl transition-all shadow-soft cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={resetSubmitting}
                    className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {resetSubmitting ? 'Menyimpan...' : 'Simpan Kata Sandi'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Delete User Dialog */}
      <ConfirmDialog
        isOpen={!!userToDelete}
        title="Hapus Akun Pengguna"
        message={`Apakah Anda yakin ingin menghapus akun "${userToDelete?.name}" (${userToDelete?.email})? Pengguna tidak akan dapat login kembali.`}
        confirmLabel="Hapus Akun"
        isDestructive={true}
        isLoading={isDeleting}
        error={deleteError}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setUserToDelete(null);
          setDeleteError('');
        }}
      />
    </div>
  );
};
