import React, { useState, useEffect } from 'react';
import { ScrollText, Search, Clock, User, ShieldCheck, ChevronDown } from 'lucide-react';
import { AuditLog } from '../types';
import { api } from '../services/api';

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await api.audit.list(150);
      setLogs(data);
    } catch (err) {
      console.error('Error loading audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((l) => {
    const q = search.toLowerCase();
    return (
      l.user_name.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      l.table_name.toLowerCase().includes(q)
    );
  });

  const formatActionName = (action: string) => {
    switch (action) {
      case 'RECORD_VIOLATION':
        return <span className="px-2.5 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 font-bold border border-rose-200 dark:border-rose-500/20">Catat Pelanggaran</span>;
      case 'CANCEL_VIOLATION_RECORD':
        return <span className="px-2.5 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold border border-amber-200 dark:border-amber-500/20">Batalkan Pelanggaran</span>;
      case 'CREATE_STUDENT':
        return <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-500/20">Tambah Santri</span>;
      case 'UPDATE_STUDENT':
        return <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-500/20">Edit Santri</span>;
      case 'DELETE_STUDENT':
        return <span className="px-2.5 py-0.5 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 font-bold border border-red-200 dark:border-red-500/20">Hapus Santri</span>;
      case 'IMPORT_EXCEL_STUDENTS':
        return <span className="px-2.5 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 font-bold border border-purple-200 dark:border-purple-500/20">Import Excel</span>;
      case 'CREATE_USER':
        return <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-500/20">Tambah Akun</span>;
      case 'LOGIN':
        return <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-white/[0.1]">Login Pengguna</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 font-mono text-xs border border-slate-200 dark:border-white/[0.1]">{action}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-scale-in">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-inner shrink-0">
          <ScrollText className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Audit Log Aktivitas Sistem
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Riwayat pencatatan jejak audit: siapa yang membuat, mengubah, membatalkan, atau menghapus data.
          </p>
        </div>
      </div>

      {/* Search Filter */}
      <div className="saas-card p-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari user, aksi, atau tabel..."
            className="w-full text-xs sm:text-sm pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 outline-none"
          />
        </div>
      </div>

      {/* Table Logs */}
      <div className="saas-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-100/90 dark:bg-white/[0.06] text-slate-800 dark:text-slate-200 uppercase text-[11px] font-black tracking-wider border-b-2 border-slate-200/90 dark:border-white/[0.1]">
              <tr>
                <th className="px-4 py-3.5 text-center w-12">#</th>
                <th className="px-4 py-3.5">Waktu Kejadian</th>
                <th className="px-4 py-3.5">Nama Petugas / User</th>
                <th className="px-4 py-3.5">Aksi Sistem</th>
                <th className="px-4 py-3.5">Tabel Terkait</th>
                <th className="px-4 py-3.5">Rincian Data Baru</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Memuat log aktivitas...</span>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    Belum ada riwayat aktivitas yang cocok.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((l, idx) => (
                  <tr key={l.id} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3.5 text-center font-bold text-slate-400 dark:text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-slate-600 dark:text-slate-300 font-mono text-xs">
                      {l.created_at}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                      {l.user_name}
                    </td>
                    <td className="px-4 py-3.5">
                      {formatActionName(l.action)}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {l.table_name}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300 max-w-md truncate font-mono">
                      {l.new_data ? JSON.stringify(l.new_data) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
