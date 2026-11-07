import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  Building,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Upload,
  Save,
  RotateCcw,
  Sparkles,
  Image as ImageIcon,
  Trash2,
  Eye,
  FileText,
  Phone,
  Mail,
  MapPin,
  Cloud,
  RefreshCw,
  Download,
  Database,
  Share2,
  Copy,
  Check,
  BookOpen,
  Building2,
  GraduationCap,
} from 'lucide-react';
import { SchoolSettings, PointThreshold, User } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/Badge';

interface SettingsPageProps {
  currentUser: User | null;
  settings: SchoolSettings | null;
  onSettingsUpdated: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  currentUser,
  settings,
  onSettingsUpdated,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'school' | 'thresholds' | 'sync'>('school');

  // Cloud Sync state
  const [cloudInfo, setCloudInfo] = useState<{ provider: string; isConnected: boolean; details: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // School Settings form
  const [appName, setAppName] = useState<string>('');
  const [schoolName, setSchoolName] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string>('/logo.svg');
  const [kopSuratText, setKopSuratText] = useState<string>('');
  const [academicYear, setAcademicYear] = useState<string>('2025/2026');
  const [signatureCity, setSignatureCity] = useState<string>('Bogor');

  // Multi-Division Signatures State
  const [signerDivisionTab, setSignerDivisionTab] = useState<'tahfizh' | 'kesantrian' | 'akademik'>('tahfizh');

  // Tahfizh Signers
  const [signerTahfizh1Title, setSignerTahfizh1Title] = useState<string>('Koordinator Tahfizh / Mudir');
  const [signerTahfizh1Name, setSignerTahfizh1Name] = useState<string>('');
  const [signerTahfizh2Title, setSignerTahfizh2Title] = useState<string>('Petugas / Muhafizh Pengampu');
  const [signerTahfizh2Name, setSignerTahfizh2Name] = useState<string>('');

  // Kesantrian Signers
  const [signerKesantrian1Title, setSignerKesantrian1Title] = useState<string>('Kepala Kesantrian / Mudir');
  const [signerKesantrian1Name, setSignerKesantrian1Name] = useState<string>('');
  const [signerKesantrian2Title, setSignerKesantrian2Title] = useState<string>('Wali Asrama / Musyrif Kesantrian');
  const [signerKesantrian2Name, setSignerKesantrian2Name] = useState<string>('');

  // Akademik Signers
  const [signerAkademik1Title, setSignerAkademik1Title] = useState<string>('Kepala Sekolah / Kurikulum');
  const [signerAkademik1Name, setSignerAkademik1Name] = useState<string>('');
  const [signerAkademik2Title, setSignerAkademik2Title] = useState<string>('Wali Kelas / Guru Pengajar');
  const [signerAkademik2Name, setSignerAkademik2Name] = useState<string>('');

  // Device Logo Upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const [logoFileError, setLogoFileError] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Thresholds form
  const [thresholds, setThresholds] = useState<PointThreshold[]>([]);

  const [saving, setSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    loadSettings();
    loadCloudInfo();
  }, []);

  const loadCloudInfo = async () => {
    try {
      const res = await api.sync.getStatus();
      setCloudInfo(res.cloud);
    } catch (e) {
      console.warn('Gagal memuat status cloud:', e);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const res = await api.sync.syncWithServer();
      if (res.success) {
        setSuccessMsg('Semua data berhasil disinkronkan dengan server dan perangkat lain!');
        onSettingsUpdated();
        await loadCloudInfo();
      } else {
        setErrorMsg('Gagal menyinkronkan data. Pastikan koneksi internet aktif.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menyinkronkan');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      const res = await api.sync.getState();
      const jsonStr = JSON.stringify(res.state, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_halaqah_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccessMsg('Cadangan data berhasil diunduh.');
    } catch (e: any) {
      setErrorMsg('Gagal mengunduh cadangan: ' + e?.message);
    }
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        if (!json.students && !json.users) {
          throw new Error('File cadangan tidak valid (format data tidak sesuai).');
        }
        await fetch('/api/sync/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientState: json }),
        });
        setSuccessMsg('Cadangan data berhasil dipulihkan secara penuh! Memuat ulang sistem...');
        onSettingsUpdated();
        setTimeout(() => window.location.reload(), 1200);
      } catch (err: any) {
        setErrorMsg('Gagal memulihkan cadangan: ' + err?.message);
      }
    };
    reader.readAsText(file);
  };

  const handleCopyShareLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.origin);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const loadSettings = async () => {
    try {
      const data = await api.settings.get();
      if (data.settings) {
        setAppName(data.settings.app_name);
        setSchoolName(data.settings.school_name);
        setAddress(data.settings.address);
        setPhone(data.settings.phone || '');
        setEmail(data.settings.email || '');
        setLogoUrl(data.settings.logo_url || '/logo.svg');
        setKopSuratText(data.settings.kop_surat_text || '');
        setAcademicYear(data.settings.current_academic_year || '2025/2026');
        setSignatureCity(data.settings.signature_city || 'Bogor');

        // Tahfizh
        setSignerTahfizh1Title(data.settings.signer_tahfizh_1_title || data.settings.signer_1_title || 'Koordinator Tahfizh / Mudir');
        setSignerTahfizh1Name(data.settings.signer_tahfizh_1_name || data.settings.signer_1_name || '');
        setSignerTahfizh2Title(data.settings.signer_tahfizh_2_title || data.settings.signer_2_title || 'Petugas / Muhafizh Pengampu');
        setSignerTahfizh2Name(data.settings.signer_tahfizh_2_name || data.settings.signer_2_name || '');

        // Kesantrian
        setSignerKesantrian1Title(data.settings.signer_kesantrian_1_title || 'Kepala Kesantrian / Mudir');
        setSignerKesantrian1Name(data.settings.signer_kesantrian_1_name || '');
        setSignerKesantrian2Title(data.settings.signer_kesantrian_2_title || 'Wali Asrama / Musyrif Kesantrian');
        setSignerKesantrian2Name(data.settings.signer_kesantrian_2_name || '');

        // Akademik
        setSignerAkademik1Title(data.settings.signer_akademik_1_title || 'Kepala Sekolah / Kurikulum');
        setSignerAkademik1Name(data.settings.signer_akademik_1_name || '');
        setSignerAkademik2Title(data.settings.signer_akademik_2_title || 'Wali Kelas / Guru Pengajar');
        setSignerAkademik2Name(data.settings.signer_akademik_2_name || '');
      }
      if (data.thresholds) {
        setThresholds(data.thresholds);
      }
    } catch (err: any) {
      console.error('Error loading settings:', err);
    }
  };

  // Handle image upload from device
  const processImageFile = (file: File) => {
    setLogoFileError('');

    if (!file.type.startsWith('image/')) {
      setLogoFileError('Format file tidak didukung. Harap pilih file gambar (PNG, JPG, JPEG, SVG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setLogoFileError('Ukuran file gambar terlalu besar (maksimal 5 MB).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setLogoUrl(e.target.result as string);
        setSuccessMsg('Logo baru berhasil dipilih dari perangkat. Klik "Simpan Pengaturan" untuk menerapkan secara permanen.');
      }
    };
    reader.onerror = () => {
      setLogoFileError('Gagal membaca file gambar dari perangkat.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleResetToDefaultLogo = () => {
    setLogoUrl('/logo.svg');
    setLogoFileError('');
    setSuccessMsg('Logo dikembalikan ke logo bawaan sistem (/logo.svg). Jangan lupa simpan perubahan.');
  };

  const handleSaveSchoolSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await api.settings.updateSchool({
        appName,
        schoolName,
        address,
        phone,
        email,
        logoUrl,
        kopSuratText,
        currentAcademicYear: academicYear,
        signatureCity,
        signerTahfizh1Title,
        signerTahfizh1Name,
        signerTahfizh2Title,
        signerTahfizh2Name,
        signerKesantrian1Title,
        signerKesantrian1Name,
        signerKesantrian2Title,
        signerKesantrian2Name,
        signerAkademik1Title,
        signerAkademik1Name,
        signerAkademik2Title,
        signerAkademik2Name,
        actorName: currentUser?.name || 'Admin',
      });
      setSuccessMsg(res.message);
      onSettingsUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan pengaturan lembaga');
    } finally {
      setSaving(false);
    }
  };

  const handleThresholdChange = (index: number, field: keyof PointThreshold, val: any) => {
    const next = [...thresholds];
    (next[index] as any)[field] = val;
    setThresholds(next);
  };

  const handleSaveThresholds = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await api.settings.updateThresholds(thresholds, currentUser?.name || 'Admin');
      setSuccessMsg(res.message);
      onSettingsUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan batas poin');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-scale-in">
      {/* Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-inner shrink-0">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Pengaturan Lembaga & Sistem
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Ubah identitas aplikasi, unggah logo dari perangkat, format Kop Surat PDF, dan konfigurasi ambang batas status poin.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="w-full overflow-x-auto no-scrollbar -mx-1 px-1">
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-200/70 dark:bg-[#111726] rounded-2xl w-max sm:w-auto max-w-xl border border-slate-300/60 dark:border-white/[0.08] shadow-soft">
          <button
            onClick={() => {
              setActiveSubTab('school');
              setSuccessMsg('');
              setErrorMsg('');
            }}
            className={`py-2.5 px-3.5 sm:px-4 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 rounded-xl transition-all whitespace-nowrap shrink-0 ${
              activeSubTab === 'school'
                ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/[0.04]'
            }`}
          >
            <Building className="w-4 h-4 shrink-0" />
            <span>Identitas & Logo</span>
          </button>

          <button
            onClick={() => {
              setActiveSubTab('thresholds');
              setSuccessMsg('');
              setErrorMsg('');
            }}
            className={`py-2.5 px-3.5 sm:px-4 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 rounded-xl transition-all whitespace-nowrap shrink-0 ${
              activeSubTab === 'thresholds'
                ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/[0.04]'
            }`}
          >
            <Sliders className="w-4 h-4 shrink-0" />
            <span>Batas Poin (Status)</span>
          </button>

          <button
            onClick={() => {
              setActiveSubTab('sync');
              setSuccessMsg('');
              setErrorMsg('');
              loadCloudInfo();
            }}
            className={`py-2.5 px-3.5 sm:px-4 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 rounded-xl transition-all whitespace-nowrap shrink-0 ${
              activeSubTab === 'sync'
                ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/[0.04]'
            }`}
          >
            <Cloud className="w-4 h-4 shrink-0" />
            <span>Sinkronisasi Cloud</span>
          </button>
        </div>
      </div>

      {/* Feedback Alerts */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-900 dark:text-emerald-300 text-xs sm:text-sm rounded-2xl flex items-center gap-3 shadow-soft animate-scale-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-900 dark:text-rose-300 text-xs sm:text-sm rounded-2xl flex items-center gap-3 shadow-soft animate-scale-in">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          <span className="font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* SUB-TAB 1: IDENTITAS SEKOLAH & LOGO UPLOAD */}
      {activeSubTab === 'school' && (
        <form onSubmit={handleSaveSchoolSettings} className="space-y-6">
          {/* LOGO UPLOAD SECTION */}
          <div className="saas-card p-6 sm:p-7 space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/[0.08]">
              <div className="p-2.5 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-500/20">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Logo Aplikasi & Lembaga (Upload dari Perangkat)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Logo akan otomatis tampil di Navbar atas, halaman Login, dan Kop Surat resmi PDF.
                </p>
              </div>
            </div>

            {logoFileError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>{logoFileError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Dropzone & File Selector */}
              <div className="lg:col-span-7 space-y-3">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                    isDragging
                      ? 'border-indigo-500 bg-indigo-500/10 ring-4 ring-indigo-500/20 scale-[1.01]'
                      : 'border-slate-300 dark:border-white/[0.12] hover:border-indigo-500 dark:hover:border-indigo-400 bg-slate-50/60 dark:bg-[#161d31]/60 hover:bg-indigo-50/20 dark:hover:bg-indigo-500/5'
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner border border-indigo-500/20">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Klik untuk Pilih Gambar dari Perangkat HP / Laptop
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Atau seret dan lepas (drag & drop) file gambar ke kotak ini
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                    <span>Format: PNG, JPG, JPEG, SVG, WebP</span>
                    <span>•</span>
                    <span>Maksimal 5 MB</span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/svg+xml, image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">
                    Ingin menggunakan logo bawaan pesantren?
                  </span>
                  <button
                    type="button"
                    onClick={handleResetToDefaultLogo}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-bold flex items-center gap-1.5 hover:underline"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset ke Logo Standar</span>
                  </button>
                </div>
              </div>

              {/* Live Preview Cards */}
              <div className="lg:col-span-5 space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Pratinjau Tampilan (Live Preview)
                </span>

                {/* Preview on Dark Navbar */}
                <div className="p-4 rounded-2xl bg-[#0d1222] text-white border border-white/[0.08] shadow-md">
                  <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold block mb-2">
                    Pratinjau di Header / Navbar:
                  </span>
                  <div className="flex items-center gap-3">
                    <img
                      src={logoUrl || '/logo.svg'}
                      alt="Logo Preview"
                      className="w-10 h-10 object-contain rounded-xl bg-white/10 p-1 ring-1 ring-white/20"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/logo.svg';
                      }}
                    />
                    <div className="truncate">
                      <p className="text-sm font-black text-white truncate">
                        {appName || 'Poin Halaqah'}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {schoolName || 'Pesantren Tahfizh'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Preview on Official Paper / Kop Surat */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#161d31] border border-slate-200 dark:border-white/[0.08]">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold block mb-2">
                    Pratinjau di Kop Surat PDF:
                  </span>
                  <div className="flex items-center gap-3 bg-white dark:bg-[#111726] p-3 rounded-xl border border-slate-200 dark:border-white/[0.08]">
                    <img
                      src={logoUrl || '/logo.svg'}
                      alt="Logo Preview"
                      className="w-10 h-10 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/logo.svg';
                      }}
                    />
                    <div className="text-center flex-1 truncate">
                      <p className="text-xs font-bold text-slate-900 dark:text-white uppercase truncate">
                        {schoolName || 'PESANTREN TAHFIZH'}
                      </p>
                      <p className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 truncate">
                        {kopSuratText || 'DIVISI HALAQAH TAHFIZH'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FORM IDENTITAS SEKOLAH */}
          <div className="saas-card p-6 sm:p-7 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/[0.08]">
              <div className="p-2.5 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-500/20">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Informasi Sekolah & Aplikasi
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Informasi ini akan tercantum di kop surat resmi, laporan PDF, dan header aplikasi.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Nama Aplikasi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Nama Aplikasi
                </label>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="Sistem Poin Santri Halaqah"
                  className="w-full text-xs sm:text-sm px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-white focus:border-indigo-500 font-medium outline-none"
                  required
                />
              </div>

              {/* Nama Sekolah / Lembaga */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Nama Lembaga / Pesantren
                </label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="Pesantren Tahfizh Al-Qur'an Imam Asy-Syathibi"
                  className="w-full text-xs sm:text-sm px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-white focus:border-indigo-500 font-medium outline-none"
                  required
                />
              </div>

              {/* Alamat Lengkap */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Alamat Lengkap Pesantren / Lembaga
                </label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Jl. Karang Anyar No. 45, Kompleks Islamic Center, Bogor, Jawa Barat"
                  rows={2}
                  className="w-full text-xs sm:text-sm px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-white focus:border-indigo-500 font-medium outline-none"
                  required
                />
              </div>

              {/* No. Telepon / Kontak */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Nomor Telepon / Kontak Resmi
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0811-9876-5432 / (0251) 8345678"
                  className="w-full text-xs sm:text-sm px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
                />
              </div>

              {/* Email Lembaga */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Email Resmi Lembaga
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tahfizh@pesantren.sch.id"
                  className="w-full text-xs sm:text-sm px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
                />
              </div>

              {/* Teks Sub-Kop Surat */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Teks Baris Kedua Kop Surat (Sub-Lembaga / Bidang)
                </label>
                <input
                  type="text"
                  value={kopSuratText}
                  onChange={(e) => setKopSuratText(e.target.value)}
                  placeholder="BIDANG PENDIDIKAN DAN KEPENGASUHAN - DIVISI HALAQAH TAHFIZH"
                  className="w-full text-xs sm:text-sm px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-white focus:border-indigo-500 font-semibold uppercase outline-none"
                />
              </div>

              {/* Tahun Ajaran */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tahun Ajaran Berjalan
                </label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="2025/2026"
                  className="w-full text-xs sm:text-sm px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-white focus:border-indigo-500 font-bold outline-none"
                />
              </div>
            </div>
          </div>

          {/* KONFIGURASI TANDA TANGAN & PENGESAHAN LAPORAN PDF (3 DIVISI) */}
          <div className="saas-card p-6 sm:p-7 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/[0.08]">
              <div className="p-2.5 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-500/20">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Konfigurasi Pengesahan & Tanda Tangan Laporan PDF
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Atur penandatangan laporan resmi untuk setiap divisi (Tahfizh, Kesantrian, dan Akademik) serta kota pengesahan.
                </p>
              </div>
            </div>

            {/* Kota Tanda Tangan */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Kota Lokasi Pengesahan Seluruh Dokumen
              </label>
              <input
                type="text"
                value={signatureCity}
                onChange={(e) => setSignatureCity(e.target.value)}
                placeholder="Bogor"
                className="w-full max-w-md text-xs sm:text-sm px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-white focus:border-indigo-500 font-medium outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Akan otomatis tercantum pada format tanggal pengesahan di sudut kanan laporan (contoh: &quot;{signatureCity || 'Bogor'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}&quot;).
              </p>
            </div>

            {/* Division Switcher */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Pilih Divisi yang Ingin Dikonfigurasi:
              </label>
              <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-slate-200/70 dark:bg-[#111726] border border-slate-300/60 dark:border-white/[0.08] w-fit shadow-inner">
                <button
                  type="button"
                  onClick={() => setSignerDivisionTab('tahfizh')}
                  className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    signerDivisionTab === 'tahfizh'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Divisi Tahfizh (Halaqah)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSignerDivisionTab('kesantrian')}
                  className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    signerDivisionTab === 'kesantrian'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>Divisi Kesantrian (Asrama)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSignerDivisionTab('akademik')}
                  className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    signerDivisionTab === 'akademik'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400'
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Divisi Akademik (Sekolah)</span>
                </button>
              </div>
            </div>

            {/* Form Fields for Active Division */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-2">
              {/* Pihak 1 (Kiri - Mengetahui) */}
              <div className="md:col-span-6 p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-[#141b2d] border border-slate-200 dark:border-white/[0.08] space-y-3.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Pihak Mengetahui (Kiri) • Divisi {signerDivisionTab === 'tahfizh' ? 'Tahfizh' : signerDivisionTab === 'kesantrian' ? 'Kesantrian' : 'Akademik'}
                  </h3>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Jabatan Penandatangan 1
                  </label>
                  <input
                    type="text"
                    value={
                      signerDivisionTab === 'tahfizh'
                        ? signerTahfizh1Title
                        : signerDivisionTab === 'kesantrian'
                        ? signerKesantrian1Title
                        : signerAkademik1Title
                    }
                    onChange={(e) => {
                      if (signerDivisionTab === 'tahfizh') setSignerTahfizh1Title(e.target.value);
                      else if (signerDivisionTab === 'kesantrian') setSignerKesantrian1Title(e.target.value);
                      else setSignerAkademik1Title(e.target.value);
                    }}
                    placeholder={
                      signerDivisionTab === 'tahfizh'
                        ? 'Koordinator Tahfizh / Mudir'
                        : signerDivisionTab === 'kesantrian'
                        ? 'Kepala Kesantrian / Mudir'
                        : 'Kepala Sekolah / Kurikulum'
                    }
                    className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-white focus:border-indigo-500 font-semibold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Lengkap & Gelar Penandatangan 1
                  </label>
                  <input
                    type="text"
                    value={
                      signerDivisionTab === 'tahfizh'
                        ? signerTahfizh1Name
                        : signerDivisionTab === 'kesantrian'
                        ? signerKesantrian1Name
                        : signerAkademik1Name
                    }
                    onChange={(e) => {
                      if (signerDivisionTab === 'tahfizh') setSignerTahfizh1Name(e.target.value);
                      else if (signerDivisionTab === 'kesantrian') setSignerKesantrian1Name(e.target.value);
                      else setSignerAkademik1Name(e.target.value);
                    }}
                    placeholder="Contoh: Ustadz H. Ahmad Abdullah, Lc. (kosongkan jika titik-titik)"
                    className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-white focus:border-indigo-500 font-medium outline-none"
                  />
                  <p className="text-[10.5px] text-slate-400 mt-1">
                    Jika diisi, nama akan otomatis dicetak di dalam tanda kurung pada berkas PDF resmi divisi ini.
                  </p>
                </div>
              </div>

              {/* Pihak 2 (Kanan - Pelapor / Petugas) */}
              <div className="md:col-span-6 p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-[#141b2d] border border-slate-200 dark:border-white/[0.08] space-y-3.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Pihak Pelapor / Petugas (Kanan) • Divisi {signerDivisionTab === 'tahfizh' ? 'Tahfizh' : signerDivisionTab === 'kesantrian' ? 'Kesantrian' : 'Akademik'}
                  </h3>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Jabatan Penandatangan 2
                  </label>
                  <input
                    type="text"
                    value={
                      signerDivisionTab === 'tahfizh'
                        ? signerTahfizh2Title
                        : signerDivisionTab === 'kesantrian'
                        ? signerKesantrian2Title
                        : signerAkademik2Title
                    }
                    onChange={(e) => {
                      if (signerDivisionTab === 'tahfizh') setSignerTahfizh2Title(e.target.value);
                      else if (signerDivisionTab === 'kesantrian') setSignerKesantrian2Title(e.target.value);
                      else setSignerAkademik2Title(e.target.value);
                    }}
                    placeholder={
                      signerDivisionTab === 'tahfizh'
                        ? 'Petugas / Muhafizh Pengampu'
                        : signerDivisionTab === 'kesantrian'
                        ? 'Wali Asrama / Musyrif Kesantrian'
                        : 'Wali Kelas / Guru Pengajar'
                    }
                    className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-white focus:border-indigo-500 font-semibold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Lengkap & Gelar Penandatangan 2
                  </label>
                  <input
                    type="text"
                    value={
                      signerDivisionTab === 'tahfizh'
                        ? signerTahfizh2Name
                        : signerDivisionTab === 'kesantrian'
                        ? signerKesantrian2Name
                        : signerAkademik2Name
                    }
                    onChange={(e) => {
                      if (signerDivisionTab === 'tahfizh') setSignerTahfizh2Name(e.target.value);
                      else if (signerDivisionTab === 'kesantrian') setSignerKesantrian2Name(e.target.value);
                      else setSignerAkademik2Name(e.target.value);
                    }}
                    placeholder="Contoh: Ustadz Muhammad Yusuf, S.Pd. (kosongkan jika otomatis/titik-titik)"
                    className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#161d31] text-slate-900 dark:text-white focus:border-indigo-500 font-medium outline-none"
                  />
                  <p className="text-[10.5px] text-slate-400 mt-1">
                    Jika dikosongkan, laporan akan memakai nama pengampu halaqah santri atau titik-titik.
                  </p>
                </div>
              </div>

              {/* Live Preview Tanda Tangan Sesuai Divisi yang Dipilih */}
              <div className="md:col-span-12 p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0f1525] border border-slate-200 dark:border-white/[0.1] shadow-inner space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-500 dark:text-indigo-400 block">
                    Pratinjau Format Tanda Tangan Resmi PDF: Divisi {signerDivisionTab === 'tahfizh' ? 'Tahfizh' : signerDivisionTab === 'kesantrian' ? 'Kesantrian' : 'Akademik'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    Ukuran A4 Standar
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 pt-3 text-xs text-slate-700 dark:text-slate-300">
                  <div className="space-y-1">
                    <p className="font-normal text-slate-500 dark:text-slate-400">Mengetahui,</p>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {signerDivisionTab === 'tahfizh'
                        ? (signerTahfizh1Title || 'Koordinator Tahfizh / Mudir')
                        : signerDivisionTab === 'kesantrian'
                        ? (signerKesantrian1Title || 'Kepala Kesantrian / Mudir')
                        : (signerAkademik1Title || 'Kepala Sekolah / Kurikulum')}
                    </p>
                    <div className="h-14" />
                    <p className="font-bold text-slate-900 dark:text-white">
                      ( {
                        (signerDivisionTab === 'tahfizh'
                          ? signerTahfizh1Name
                          : signerDivisionTab === 'kesantrian'
                          ? signerKesantrian1Name
                          : signerAkademik1Name
                        ).trim() || '............................................'
                      } )
                    </p>
                  </div>
                  <div className="space-y-1 sm:text-right">
                    <p className="font-normal text-slate-500 dark:text-slate-400">
                      {signatureCity || 'Bogor'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {signerDivisionTab === 'tahfizh'
                        ? (signerTahfizh2Title || 'Petugas / Muhafizh Pengampu')
                        : signerDivisionTab === 'kesantrian'
                        ? (signerKesantrian2Title || 'Wali Asrama / Musyrif Kesantrian')
                        : (signerAkademik2Title || 'Wali Kelas / Guru Pengajar')}
                    </p>
                    <div className="h-14" />
                    <p className="font-bold text-slate-900 dark:text-white sm:text-right">
                      ( {
                        (signerDivisionTab === 'tahfizh'
                          ? signerTahfizh2Name
                          : signerDivisionTab === 'kesantrian'
                          ? signerKesantrian2Name
                          : signerAkademik2Name
                        ).trim() || '............................................'
                      } )
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-5 border-t border-slate-100 dark:border-white/[0.08]">
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto justify-center px-7 py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2 transform active:scale-98 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Save className="w-4 h-4 shrink-0" />
                <span>{saving ? 'Menyimpan...' : 'Simpan Pengaturan Lembaga'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* SUB-TAB 2: BATAS POIN (THRESHOLDS MANAGEMENT) */}
      {activeSubTab === 'thresholds' && (
        <form onSubmit={handleSaveThresholds} className="saas-card p-6 sm:p-7 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.08]">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Pengaturan Status Ambang Batas Poin
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Angka batas poin tidak di-hardcode dan dapat disesuaikan dengan pedoman kepengasuhan pondok.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {thresholds.map((th, idx) => (
              <div
                key={th.id || idx}
                className="p-5 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-[#161d31] space-y-3 hover:border-indigo-400/50 transition-colors"
              >
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
                  {/* Min Poin */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Min Poin
                    </label>
                    <input
                      type="number"
                      value={th.minimum_points}
                      onChange={(e) =>
                        handleThresholdChange(idx, 'minimum_points', parseInt(e.target.value, 10) || 0)
                      }
                      className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#111726] font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Max Poin */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Maks Poin
                    </label>
                    <input
                      type="number"
                      value={th.maximum_points}
                      onChange={(e) =>
                        handleThresholdChange(idx, 'maximum_points', parseInt(e.target.value, 10) || 0)
                      }
                      className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#111726] font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Status Label */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Label Status
                    </label>
                    <input
                      type="text"
                      value={th.status_name}
                      onChange={(e) => handleThresholdChange(idx, 'status_name', e.target.value)}
                      placeholder="AMAN / PERLU PEMBINAAN..."
                      className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#111726] font-bold text-indigo-600 dark:text-indigo-400 uppercase outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Preview Badge */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Tampilan Badge
                    </label>
                    <div className="pt-1">
                      <StatusBadge statusName={th.status_name} badgeColor={th.badge_color} />
                    </div>
                  </div>
                </div>

                {/* Deskripsi */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                    Tindakan / Deskripsi Arahan
                  </label>
                  <input
                    type="text"
                    value={th.description || ''}
                    onChange={(e) => handleThresholdChange(idx, 'description', e.target.value)}
                    placeholder="Bimbingan oleh muhafizh / Surat peringatan..."
                    className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-white/[0.1] bg-white dark:bg-[#111726] text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-white/[0.08]">
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto justify-center px-7 py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2 transform active:scale-98 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Save className="w-4 h-4 shrink-0" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan Batas Poin'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: Sinkronisasi Multi-Perangkat & Cloud */}
      {activeSubTab === 'sync' && (
        <div className="space-y-6">
          {/* Cloud Persistence Status Card */}
          <div className="saas-card p-6 sm:p-7 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl ${cloudInfo?.isConnected ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'}`}>
                  <Cloud className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">Status Penyimpanan & Sinkronisasi Cloud</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Memastikan data sinkron ketika link web app dibuka di HP, laptop, atau perangkat lain</p>
                </div>
              </div>

              <div>
                {cloudInfo?.isConnected ? (
                  <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 shadow-soft">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    {cloudInfo.provider === 'postgres' ? 'Cloud Postgres (Neon) Terhubung' : 'Cloud Storage Terhubung'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 shadow-soft">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Sinkronisasi Klien & Serverless Aktif
                  </span>
                )}
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-[#161d31] rounded-2xl border border-slate-200/80 dark:border-white/[0.08] text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                <p className="font-bold text-slate-900 dark:text-white mb-1">Informasi Infrastruktur:</p>
                <p>{cloudInfo?.details || 'Memuat status server...'}</p>
              </div>

              {!cloudInfo?.isConnected && (
                <div className="p-5 bg-gradient-to-br from-indigo-50/50 to-purple-50/40 dark:from-indigo-500/10 dark:to-purple-500/10 rounded-2xl border border-indigo-200/70 dark:border-indigo-500/20 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-300 font-bold mb-2">
                    <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Cara Mengaktifkan Cloud Database Bersama di Vercel (Gratis 100%):</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-600 dark:text-slate-400 pl-1">
                    <li>Buka dashboard Vercel Anda di <code className="bg-white dark:bg-[#111726] px-1.5 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-200 dark:border-indigo-500/30">vercel.com</code></li>
                    <li>Pilih proyek Anda <strong className="text-slate-800 dark:text-white">sistem-pencatatan-imbs</strong></li>
                    <li>Klik tab <strong className="text-slate-800 dark:text-white">Storage</strong> di bagian atas</li>
                    <li>Klik tombol <strong className="text-slate-800 dark:text-white">Connect Store</strong> &rarr; pilih <strong className="text-indigo-600 dark:text-indigo-400">Postgres (Neon)</strong> atau <strong className="text-indigo-600 dark:text-indigo-400">KV</strong></li>
                    <li>Klik <strong className="text-slate-800 dark:text-white">Connect</strong>. Vercel akan otomatis menyuntikkan database cloud bersama tanpa perlu konfigurasi manual!</li>
                  </ol>
                </div>
              )}
            </div>
          </div>

          {/* Action Hub Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sync Now & Share Link */}
            <div className="saas-card p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-500/20">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Sinkronisasi Sekarang</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Perbarui data perangkat ini dengan data terbaru dari server</p>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className="py-3 px-4 bg-white dark:bg-[#161d31] hover:bg-slate-50 dark:hover:bg-[#1e2742] text-slate-800 dark:text-slate-200 font-bold rounded-xl border border-slate-300 dark:border-white/[0.1] transition-all flex items-center justify-center gap-2 text-xs sm:text-sm"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                  <span>{copiedLink ? 'Tautan Disalin!' : 'Bagikan Tautan'}</span>
                </button>
              </div>
            </div>

            {/* Backup & Restore */}
            <div className="saas-card p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Cadangan & Pemulihan (JSON)</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Amankan data santri, poin, dan pengaturan atau pindahkan ke perangkat lain</p>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Cadangan</span>
                </button>

                <label className="flex-1 py-3 px-4 bg-white dark:bg-[#161d31] hover:bg-slate-50 dark:hover:bg-[#1e2742] text-slate-800 dark:text-slate-200 font-bold rounded-xl border border-slate-300 dark:border-white/[0.1] transition-all flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer text-center">
                  <Upload className="w-4 h-4" />
                  <span>Pulihkan Data</span>
                  <input
                    ref={backupInputRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleRestoreBackup}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
