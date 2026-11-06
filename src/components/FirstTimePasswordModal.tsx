import React, { useState } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { User, SchoolSettings } from '../types';
import { api } from '../services/api';

interface FirstTimePasswordModalProps {
  currentUser: User;
  settings: SchoolSettings | null;
  onPasswordChanged: (updatedUser: User) => void;
  onLogout: () => void;
}

export const FirstTimePasswordModal: React.FC<FirstTimePasswordModalProps> = ({
  currentUser,
  settings,
  onPasswordChanged,
  onLogout,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('Kata sandi baru minimal harus 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Konfirmasi kata sandi tidak cocok. Harap periksa kembali.');
      return;
    }

    setSubmitting(true);
    try {
      await api.auth.changePassword({
        userId: currentUser.id,
        newPassword: newPassword,
        actorName: currentUser.name,
      });

      const updatedUser: User = {
        ...currentUser,
        mustChangePassword: false,
        must_change_password: 0,
      };

      onPasswordChanged(updatedUser);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengubah kata sandi. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const isMatch = newPassword && confirmPassword && newPassword === confirmPassword;
  const isTooShort = newPassword && newPassword.length < 6;

  return (
    <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4 sm:p-6 text-slate-100 selection:bg-indigo-500 selection:text-white">
      <div className="w-full max-w-lg saas-card overflow-hidden shadow-2xl animate-scale-in">
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-indigo-800 text-white p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-xs font-semibold text-indigo-200 border border-white/15">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              <span>Aktivasi Akun Pengguna Baru</span>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner shrink-0">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Atur Kata Sandi Baru
                </h1>
                <p className="text-xs sm:text-sm text-indigo-200/90 font-light">
                  {settings?.school_name || "Pesantren Tahfizh Al-Qur'an Imam Asy-Syathibi"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="p-4 bg-indigo-50/60 dark:bg-indigo-500/10 rounded-2xl border border-indigo-200/80 dark:border-indigo-500/20 text-xs sm:text-sm text-indigo-950 dark:text-indigo-200 space-y-1.5">
            <p className="font-bold">
              Ahlan wa Sahlan, {currentUser.name}!
            </p>
            <p className="text-xs text-indigo-800/80 dark:text-indigo-300/80 leading-relaxed font-normal">
              Akun Anda baru saja dibuat oleh Administrator. Demi keamanan data dan kerahasiaan akun, silakan perbarui kata sandi awal Anda dengan kata sandi baru yang hanya Anda ketahui.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="text-slate-500 dark:text-slate-400">Username Login:</span>
              <span className="px-2 py-0.5 rounded-md bg-white dark:bg-[#161d31] border border-indigo-200 dark:border-indigo-500/30 font-mono text-indigo-600 dark:text-indigo-400">
                {currentUser.email}
              </span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2.5 animate-scale-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Input Password Baru */}
            <div>
              <label className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Kata Sandi Baru</span>
                </span>
                <span className="text-[11px] font-normal text-slate-400">Min. 6 karakter</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Ketik kata sandi baru Anda..."
                  className="w-full text-sm pl-3.5 pr-10 py-3 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-white focus:border-indigo-500 font-mono transition-all outline-none"
                  required
                  minLength={6}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {isTooShort && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                  Panjang kata sandi minimal 6 karakter.
                </p>
              )}
            </div>

            {/* Input Konfirmasi Password */}
            <div>
              <label className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Ulangi Kata Sandi Baru</span>
                </span>
                {confirmPassword && (
                  <span className={`text-[11px] font-bold ${isMatch ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                    {isMatch ? '✓ Cocok' : '✗ Tidak cocok'}
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang kata sandi baru..."
                  className={`w-full text-sm pl-3.5 pr-10 py-3 rounded-xl border ${
                    confirmPassword && !isMatch
                      ? 'border-rose-400 focus:border-rose-500'
                      : 'border-slate-300 dark:border-white/[0.1] focus:border-indigo-500'
                  } bg-white dark:bg-[#161d31] text-slate-900 dark:text-white font-mono transition-all outline-none`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !newPassword || !confirmPassword || !isMatch}
              className="w-full py-3.5 px-5 bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Menyimpan Kata Sandi...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Simpan & Masuk ke Aplikasi</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Logout Option */}
          <div className="pt-4 border-t border-slate-100 dark:border-white/[0.08] flex items-center justify-between text-xs text-slate-400">
            <span>Bukan akun milik Anda?</span>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 font-semibold transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar / Ganti Akun</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
