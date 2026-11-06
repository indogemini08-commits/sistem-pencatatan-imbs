import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X, AlertCircle, Trash2 } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Ya, Lanjutkan',
  cancelLabel = 'Batal',
  isDestructive = true,
  isLoading = false,
  error,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-scale-in">
      <div className="relative w-full max-w-md m-auto h-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col bg-white dark:bg-[#111726] rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 dark:border-white/[0.08] overflow-hidden transition-colors">
        {/* Header with gradient tint */}
        <div
          className={`p-5 sm:p-6 border-b shrink-0 flex items-start justify-between ${
            isDestructive
              ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/40'
              : 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/40'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-2xl shrink-0 shadow-sm ${
                isDestructive
                  ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 ring-4 ring-rose-50 dark:ring-rose-900/20'
                  : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 ring-4 ring-indigo-50 dark:ring-indigo-900/20'
              }`}
            >
              {isDestructive ? (
                <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
              ) : (
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  {title}
                </h3>
              </div>
              <p
                className={`text-xs font-semibold mt-0.5 ${
                  isDestructive ? 'text-rose-600 dark:text-rose-400' : 'text-indigo-600 dark:text-indigo-400'
                }`}
              >
                {isDestructive ? '⚠️ Peringatan Hapus Data Permanen' : 'Konfirmasi Tindakan Sistem'}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-white/80 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Message Content */}
        <div className="p-5 sm:p-6 overflow-y-auto pr-2 space-y-3 flex-1">
          {error && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-200 text-xs sm:text-sm rounded-xl flex items-start gap-2.5 animate-scale-in">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-white/[0.06]">
            {message}
          </div>

          {isDestructive && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 italic flex items-center gap-1.5 px-1">
              <span>* Data yang telah dihapus akan dihilangkan dari basis data sistem dan audit log akan mencatat aktivitas ini.</span>
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200/80 dark:border-white/[0.06] flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/[0.1] text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-700 active:scale-[0.98]'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-indigo-500/25 active:scale-[0.98]'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <span>{confirmLabel}</span>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
