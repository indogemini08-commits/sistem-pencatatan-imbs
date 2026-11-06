import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  BookOpen,
  Building2,
  Award,
  ShieldCheck,
  AlertTriangle,
  FileText,
  PhoneCall,
  UserCheck,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Clock,
  HeartHandshake,
  CheckCircle2,
  Download,
  ExternalLink,
  MessageCircle,
  GraduationCap,
  Info,
  LogOut,
  Calendar,
} from 'lucide-react';
import { api } from '../services/api';
import { SchoolSettings, Student, ViolationRecord, PositiveRecord, PointThreshold } from '../types';
import { generateStudentDetailPDF } from '../utils/pdfGenerator';

interface ParentPortalPageProps {
  settings: SchoolSettings | null;
  onBackToLogin?: () => void;
  initialNis?: string;
  isStaffPreview?: boolean;
}

interface PortalData {
  student: Student;
  records: ViolationRecord[];
  positive_records: PositiveRecord[];
  thresholds: PointThreshold[];
  settings: SchoolSettings | null;
}

export const ParentPortalPage: React.FC<ParentPortalPageProps> = ({
  settings,
  onBackToLogin,
  initialNis = '',
  isStaffPreview = false,
}) => {
  const [searchNis, setSearchNis] = useState<string>(initialNis);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [portalData, setPortalData] = useState<PortalData | null>(null);

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState<'pelanggaran' | 'kebaikan' | 'panduan'>('pelanggaran');
  const [filterDivision, setFilterDivision] = useState<'all' | 'tahfizh' | 'kesantrian' | 'akademik'>('all');

  // Auto-load if initialNis provided or from URL search params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const nisFromUrl = urlParams.get('nis') || initialNis;
    if (nisFromUrl) {
      setSearchNis(nisFromUrl);
      fetchStudentByNis(nisFromUrl);
    }
  }, [initialNis]);

  const fetchStudentByNis = async (nis: string) => {
    const clean = nis.trim();
    if (!clean) {
      setErrorMsg('Silakan masukkan Nomor Induk Santri (NIS)');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.portal.getByNis(clean);
      setPortalData(res);
      const url = new URL(window.location.href);
      url.searchParams.set('portal', 'wali');
      url.searchParams.set('nis', clean);
      window.history.replaceState({}, '', url.toString());
    } catch (err: any) {
      setPortalData(null);
      setErrorMsg(err?.message || `Santri dengan NIS "${clean}" tidak ditemukan.`);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStudentByNis(searchNis);
  };

  const handleResetSearch = () => {
    setSearchNis('');
    setPortalData(null);
    setErrorMsg('');
    const url = new URL(window.location.href);
    url.searchParams.delete('nis');
    window.history.replaceState({}, '', url.toString());
  };

  // Filtered violation records
  const filteredViolations = useMemo(() => {
    if (!portalData) return [];
    return portalData.records.filter((r) => {
      if (filterDivision === 'all') return true;
      const div = r.division || 'tahfizh';
      return div === filterDivision;
    });
  }, [portalData, filterDivision]);

  // Filtered positive records
  const filteredPositiveRecords = useMemo(() => {
    if (!portalData) return [];
    return portalData.positive_records.filter((r) => {
      if (filterDivision === 'all') return true;
      const div = r.division || 'tahfizh';
      return div === filterDivision;
    });
  }, [portalData, filterDivision]);

  // Handle PDF Export
  const handleExportPDF = () => {
    if (!portalData) return;
    const effectiveSettings: SchoolSettings = portalData.settings || settings || {
      id: 'default',
      app_name: 'Sistem Poin Santri Halaqah',
      school_name: "Pesantren Tahfizh Al-Qur'an",
      address: 'Kompleks Pesantren Tahfizh',
      phone: '-',
      email: '-',
      logo_url: '/logo.svg',
      kop_surat_text: "DIVISI KESISWAAN & HALAQAH TAHFIZH AL-QUR'AN",
      current_academic_year: '2025/2026',
    };
    generateStudentDetailPDF(portalData.student, portalData.records, effectiveSettings);
  };

  const school = portalData?.settings || settings;

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* 1. TOP NAVBAR / BRAND HEADER */}
      <header className="sticky top-0 z-30 bg-[#0d1222]/90 backdrop-blur-md border-b border-white/[0.08] px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {school?.logo_url ? (
              <img
                src={school.logo_url}
                alt="Logo Pesantren"
                className="w-10 h-10 object-contain rounded-xl bg-white/10 p-1 border border-white/20 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-indigo-700 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-lg shadow-indigo-500/25">
                IM
              </div>
            )}
            <div className="min-w-0">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5 truncate">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                Portal Orang Tua & Wali Santri
              </span>
              <h1 className="text-sm sm:text-base font-black text-white truncate tracking-tight">
                {school?.school_name || "Pesantren Tahfizh Al-Qur'an Imam Asy-Syathibi"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onBackToLogin && (
              <button
                type="button"
                onClick={onBackToLogin}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-bold text-slate-300 hover:text-white bg-[#161d31] hover:bg-[#1e2742] border border-white/[0.1] rounded-xl transition-all cursor-pointer shadow-soft"
              >
                <LogOut className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">
                  {isStaffPreview ? 'Kembali ke Dashboard Asatidz' : 'Masuk Sebagai Guru/Asatidz'}
                </span>
                <span className="sm:hidden">
                  {isStaffPreview ? 'Dashboard' : 'Login Guru'}
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. HERO / SEARCH CONTAINER */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Banner Sapaan */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#111726] via-[#161d31] to-[#1e1e38] border border-white/[0.08] shadow-2xl p-6 sm:p-8">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
              <HeartHandshake className="w-3.5 h-3.5" />
              <span>Sinergi Pesantren & Orang Tua Santri</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
              Pantau Kedisiplinan & Capaian Ananda Secara Real-Time
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Cukup masukkan <strong>Nomor Induk Santri (NIS)</strong> ananda untuk melihat akumulasi poin pelanggaran, catatan amal kebaikan, status pembinaan, dan perkembangan halaqah di pondok.
            </p>

            {/* Form Input NIS */}
            <form onSubmit={handleSearchSubmit} className="pt-2 max-w-xl">
              <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchNis}
                    onChange={(e) => setSearchNis(e.target.value)}
                    placeholder="Masukkan NIS Santri (cth: 2025001)..."
                    className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-slate-400 text-sm sm:text-base font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-[#111726] transition-all"
                  />
                  {searchNis && (
                    <button
                      type="button"
                      onClick={() => setSearchNis('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                    >
                      ×
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !searchNis.trim()}
                  className="px-6 py-3.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-sm rounded-2xl shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 whitespace-nowrap"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Memeriksa...</span>
                    </>
                  ) : (
                    <>
                      <span>Lihat Status Ananda</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {errorMsg && (
              <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs sm:text-sm flex items-start gap-3 animate-scale-in">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Pencarian Belum Berhasil</p>
                  <p className="text-xs text-rose-300 mt-0.5">{errorMsg}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. HASIL PENCARIAN SANTRI */}
        {portalData && (
          <div className="space-y-6 sm:space-y-8 animate-scale-in">
            {/* Header Hasil & Tombol Reset */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 glass-panel p-4">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                <span>Menampilkan Data Santri: <strong className="text-white font-black">{portalData.student.name}</strong> (NIS: {portalData.student.student_number})</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/25 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  <span>Cetak Lembar PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetSearch}
                  className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white bg-white/10 hover:bg-white/15 border border-white/15 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                  <span>Cari Santri Lain</span>
                </button>
              </div>
            </div>

            {/* Profile & Status Card */}
            <div className="glass-panel p-6 sm:p-8 space-y-6 shadow-2xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                {/* Left: Avatar & Bio */}
                <div className="flex items-start sm:items-center gap-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-indigo-700 text-white font-black text-2xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/25 ring-4 ring-white/10">
                    {portalData.student.name.charAt(0)}
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs font-bold font-mono">
                        NIS: {portalData.student.student_number}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-400/30 text-xs font-bold">
                        Kelas {portalData.student.class}
                      </span>
                      <span className="text-xs text-slate-400">
                        {portalData.student.gender === 'L' ? 'Laki-laki' : 'Perempuan'} • TA {portalData.student.academic_year || '2025/2026'}
                      </span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
                      {portalData.student.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-400 flex items-center gap-2 flex-wrap">
                      <span>🕌 Halaqah: <strong className="text-white">{portalData.student.halaqah_name || 'Reguler'}</strong></span>
                      <span>•</span>
                      <span>Pembimbing: <strong className="text-white">{portalData.student.teacher_name || 'Ustadz Pengampu'}</strong></span>
                    </p>
                  </div>
                </div>

                {/* Right: Status Kedisiplinan Badge */}
                {(() => {
                  const netPts = Number(portalData.student.total_points || 0);
                  const isAman = netPts < 20;
                  const badgeColor = isAman
                    ? 'emerald'
                    : (portalData.student.status_info?.badgeColor || (netPts < 50 ? 'amber' : netPts < 75 ? 'orange' : 'rose'));
                  const statusName = isAman
                    ? 'AMAN'
                    : (portalData.student.status_info?.statusName || 'PERLU PEMBINAAN');
                  const desc = isAman
                    ? 'Alhamdulillah, kedisiplinan dan hafalan ananda dalam kondisi aman & tertib.'
                    : (portalData.student.status_info?.description || 'Perlu bimbingan dan pemantauan berkala.');

                  const colorClasses =
                    badgeColor === 'emerald'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                      : badgeColor === 'amber'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-400/50'
                      : badgeColor === 'orange'
                      ? 'bg-orange-500/20 text-orange-300 border-orange-400/50'
                      : 'bg-rose-500/20 text-rose-300 border-rose-400/50';

                  const dotColor =
                    badgeColor === 'emerald'
                      ? 'bg-emerald-400'
                      : badgeColor === 'amber'
                      ? 'bg-amber-400'
                      : badgeColor === 'orange'
                      ? 'bg-orange-400'
                      : 'bg-rose-400';

                  return (
                    <div className="bg-[#161d31] p-4 rounded-2xl border border-white/[0.08] flex flex-col items-start md:items-end justify-center gap-1.5 shrink-0 min-w-[220px]">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Status Kedisiplinan:
                      </span>
                      <span
                        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-black border shadow-soft ${colorClasses}`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${dotColor} ${isAman ? 'animate-pulse' : 'animate-ping'}`} />
                        <span>{statusName}</span>
                      </span>
                      <p className="text-[11px] text-slate-400 max-w-xs text-left md:text-right">
                        {desc}
                      </p>
                    </div>
                  );
                })()}
              </div>

              {/* Direct Contact Teacher / School */}
              {portalData.student.teacher_phone && (
                <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 text-indigo-200">
                    <MessageCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>Perlu koordinasi mengenai ananda? Hubungi Muhafizh/Wali Asrama secara langsung.</span>
                  </div>
                  <a
                    href={`https://wa.me/${portalData.student.teacher_phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors shrink-0"
                  >
                    <span>Hubungi Ustadz via WhatsApp</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Metrics 5-Grid Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {/* Total Poin Netto */}
              {(() => {
                const netPts = Number(portalData.student.total_points || 0);
                const isAman = netPts < 20;

                return (
                  <div className={`p-4 sm:p-5 rounded-2xl border shadow-soft transition-all ${
                    isAman
                      ? 'bg-[#111726] border-emerald-500/30'
                      : netPts < 50
                      ? 'bg-[#111726] border-amber-500/30'
                      : 'bg-[#111726] border-rose-500/30'
                  }`}>
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase mb-1">
                      {isAman ? (
                        <>
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-300">Total Poin Netto</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className={`w-4 h-4 ${netPts < 50 ? 'text-amber-400' : 'text-rose-400'}`} />
                          <span className="text-slate-300">Total Poin Netto</span>
                        </>
                      )}
                    </div>
                    <p className={`text-2xl sm:text-3xl font-black font-mono ${
                      isAman
                        ? 'text-emerald-400'
                        : netPts < 50
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}>
                      {netPts}
                    </p>
                    <span className={`text-[11px] mt-1 block font-medium ${
                      isAman ? 'text-emerald-300/80' : 'text-slate-400'
                    }`}>
                      {isAman ? 'Kondisi aman & bersih dari sanksi' : 'Akumulasi terpadu setelah apresiasi'}
                    </span>
                  </div>
                );
              })()}

              {/* Pelanggaran Tahfizh */}
              <div className="bg-[#111726] p-4 sm:p-5 rounded-2xl border border-white/[0.08] shadow-soft">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase mb-1">
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  <span>Divisi Tahfizh</span>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                  {portalData.student.tahfizh_points || 0}
                </p>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Kedisiplinan halaqah Al-Qur'an
                </span>
              </div>

              {/* Pelanggaran Kesantrian */}
              <div className="bg-[#111726] p-4 sm:p-5 rounded-2xl border border-white/[0.08] shadow-soft">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase mb-1">
                  <Building2 className="w-4 h-4 text-blue-400" />
                  <span>Divisi Kesantrian</span>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-blue-400 font-mono">
                  {portalData.student.kesantrian_points || 0}
                </p>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Kedisiplinan asrama & ibadah
                </span>
              </div>

              {/* Pelanggaran Akademik */}
              <div className="bg-[#111726] p-4 sm:p-5 rounded-2xl border border-white/[0.08] shadow-soft">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase mb-1">
                  <GraduationCap className="w-4 h-4 text-purple-400" />
                  <span>Divisi Akademik</span>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-purple-400 font-mono">
                  {portalData.student.akademik_points || 0}
                </p>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Kedisiplinan KBM & sekolah
                </span>
              </div>

              {/* Poin Kebaikan / Pemulihan */}
              <div className="bg-[#111726] p-4 sm:p-5 rounded-2xl border border-emerald-500/20 shadow-soft">
                <div className="flex items-center gap-1.5 text-emerald-300 text-xs font-bold uppercase mb-1">
                  <Award className="w-4 h-4 text-emerald-400" />
                  <span>Poin Dipulihkan</span>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-emerald-300 font-mono">
                  -{portalData.student.total_deductions || 0}
                </p>
                <span className="text-[11px] text-emerald-400 mt-1 block">
                  Dari {portalData.positive_records.length} amal kebaikan
                </span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-white/[0.08] pb-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('pelanggaran')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                  activeTab === 'pelanggaran'
                    ? portalData.records.length > 0
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-400/30 shadow-soft'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 shadow-soft'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {portalData.records.length > 0 ? (
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                )}
                <span>Catatan Pelanggaran ({portalData.records.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('kebaikan')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                  activeTab === 'kebaikan'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 shadow-soft'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Award className="w-4 h-4" />
                <span>Catatan Kebaikan & Prestasi ({portalData.positive_records.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('panduan')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                  activeTab === 'panduan'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 shadow-soft'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Info className="w-4 h-4" />
                <span>Pedoman Pembinaan</span>
              </button>
            </div>

            {/* TAB CONTENT 1: PELANGGARAN */}
            {activeTab === 'pelanggaran' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#161d31] border border-white/[0.08] text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setFilterDivision('all')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        filterDivision === 'all' ? 'bg-[#1e2742] text-white shadow-soft' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Semua Divisi
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterDivision('tahfizh')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        filterDivision === 'tahfizh' ? 'bg-emerald-600 text-white shadow-soft' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Tahfizh
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterDivision('kesantrian')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        filterDivision === 'kesantrian' ? 'bg-blue-600 text-white shadow-soft' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Kesantrian (Asrama)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterDivision('akademik')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        filterDivision === 'akademik' ? 'bg-purple-600 text-white shadow-soft' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Akademik (Sekolah)
                    </button>
                  </div>

                  <span className="text-xs text-slate-400">
                    Menampilkan <strong>{filteredViolations.length}</strong> catatan
                  </span>
                </div>

                {filteredViolations.length === 0 ? (
                  <div className="bg-[#111726] rounded-2xl border border-white/[0.08] p-8 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h4 className="text-base font-bold text-white">
                      Alhamdulillah, Tidak Ada Pelanggaran Aktif
                    </h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Ananda menunjukkan sikap yang baik dan tidak memiliki riwayat pelanggaran pada divisi ini.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {filteredViolations.map((r, idx) => {
                      const isCancelled = r.status === 'cancelled';
                      const isAkademik = r.division === 'akademik';
                      const isKesantrian = r.division === 'kesantrian';

                      return (
                        <div
                          key={r.id || idx}
                          className={`p-4 rounded-2xl border transition-all ${
                            isCancelled
                              ? 'bg-[#111726]/40 border-white/[0.04] opacity-60'
                              : 'bg-[#111726] border-white/[0.08] hover:border-white/[0.15]'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/[0.06]">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                                  isAkademik
                                    ? 'bg-purple-500/20 text-purple-300 border-purple-400/30'
                                    : isKesantrian
                                    ? 'bg-blue-500/20 text-blue-300 border-blue-400/30'
                                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                                }`}
                              >
                                {isAkademik ? '📚 Divisi Akademik' : isKesantrian ? '🏢 Divisi Kesantrian' : '🕌 Divisi Tahfizh'}
                              </span>

                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {r.date} {r.time ? `• ${r.time} WIB` : ''}
                              </span>

                              {isCancelled && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/[0.08] text-slate-300">
                                  Dibatalkan (Poin Gugur)
                                </span>
                              )}
                            </div>

                            <div className="shrink-0">
                              <span
                                className={`font-mono text-xs font-black px-2.5 py-1 rounded-lg border ${
                                  isCancelled
                                    ? 'bg-white/[0.06] text-slate-400 border-white/[0.08] line-through'
                                    : 'bg-rose-500/20 text-rose-300 border-rose-400/40'
                                }`}
                              >
                                +{r.points_snapshot} Poin
                              </span>
                            </div>
                          </div>

                          <div className="pt-2.5 space-y-1.5">
                            <h5 className="font-bold text-white text-sm">
                              {r.violation_name_snapshot}
                            </h5>

                            {r.notes && (
                              <p className="text-xs text-slate-300 italic bg-[#161d31] p-2.5 rounded-xl border border-white/[0.06]">
                                "{r.notes}"
                              </p>
                            )}

                            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                              <span>Dicatat oleh: <strong className="text-slate-300">{r.teacher_name_snapshot || r.created_by || 'Petugas'}</strong></span>
                              <span>Lokasi: {r.halaqah_name_snapshot || 'Pesantren'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 2: KEBAIKAN */}
            {activeTab === 'kebaikan' && (
              <div className="space-y-4">
                {filteredPositiveRecords.length === 0 ? (
                  <div className="bg-[#111726] rounded-2xl border border-white/[0.08] p-8 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-white/[0.04] text-slate-400 flex items-center justify-center mx-auto">
                      <Award className="w-6 h-6" />
                    </div>
                    <h4 className="text-base font-bold text-white">
                      Belum Ada Catatan Kebaikan Terdata
                    </h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Kegiatan amal shalih, prestasi, dan apresiasi pemulihan poin ananda akan tercatat di halaman ini.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {filteredPositiveRecords.map((p, idx) => (
                      <div
                        key={p.id || idx}
                        className="p-4 rounded-2xl bg-[#111726] border border-emerald-500/30 space-y-2 hover:border-emerald-400/50 transition-all"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/[0.06]">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                              p.division === 'akademik'
                                ? 'bg-purple-500/20 text-purple-300 border-purple-400/30'
                                : p.division === 'kesantrian'
                                ? 'bg-blue-500/20 text-blue-300 border-blue-400/30'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                            }`}>
                              {p.division === 'akademik' ? '📚 Akademik' : p.division === 'kesantrian' ? '🏢 Kesantrian' : '🕌 Tahfizh'}
                            </span>
                            <span className="text-xs text-slate-400">
                              {p.date} {p.time ? `• ${p.time} WIB` : ''}
                            </span>
                          </div>

                          <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                            -{p.points_deducted} Poin (Dipulihkan)
                          </span>
                        </div>

                        <div>
                          <h5 className="font-bold text-emerald-200 text-sm">
                            {p.action_name_snapshot}
                          </h5>
                          {p.notes && (
                            <p className="text-xs text-slate-300 italic mt-1 bg-[#161d31] p-2.5 rounded-xl border border-white/[0.06]">
                              "{p.notes}"
                            </p>
                          )}
                          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2">
                            <span>Pembimbing: <strong className="text-slate-300">{p.teacher_name_snapshot || 'Ustadz Pembina'}</strong></span>
                            <span>{p.halaqah_name_snapshot || 'Halaqah'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 3: PANDUAN THRESHOLD */}
            {activeTab === 'panduan' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-[#111726] border border-white/[0.08] text-xs sm:text-sm text-slate-300 leading-relaxed space-y-2">
                  <h4 className="font-bold text-white text-base flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <span>Sistem Penilaian & Tahapan Pembinaan Pesantren</span>
                  </h4>
                  <p>
                    Setiap santri memulai kegiatan dengan <strong>0 Poin Pelanggaran</strong>. Pelanggaran yang dilakukan menambah poin akumulasi, sementara amal kebaikan dan prestasi dapat mengurangi/memulihkan poin tersebut.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(portalData.thresholds || []).map((t, idx) => (
                    <div
                      key={t.id || idx}
                      className="p-4 rounded-2xl border border-white/[0.08] bg-[#111726] space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#161d31] text-indigo-400 border border-white/[0.08]">
                          {t.minimum_points} - {t.maximum_points} Pts
                        </span>
                        <span className="text-xs font-black uppercase text-indigo-300">
                          Level {t.sort_order || idx + 1}
                        </span>
                      </div>
                      <h5 className="font-black text-white text-sm">
                        {t.status_name}
                      </h5>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {t.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. EDUKASI / TRANSPARANSI SAAT BELUM CARI SANTRI */}
        {!portalData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="p-5 rounded-2xl bg-[#111726] border border-white/[0.08] space-y-2 shadow-soft">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold">
                <BookOpen className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-sm">Transparansi Halaqah</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Mengetahui kedisiplinan setoran dan adab saat halaqah tahfizh bersama muhafizh secara terbuka.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#111726] border border-white/[0.08] space-y-2 shadow-soft">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-sm">Monitoring Asrama</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pemantauan shalat berjamaah, jam malam, dan kebersihan kamar yang dibina oleh bagian kesantrian.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#111726] border border-white/[0.08] space-y-2 shadow-soft">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold">
                <Award className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-sm">Pemulihan Poin Kebaikan</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Santri termotivasi beramal shalih dan berprestasi untuk memulihkan poin pelanggaran mereka.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* 5. FOOTER RESMI PESANTREN */}
      <footer className="mt-auto border-t border-white/[0.08] bg-[#0d1222] py-6 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500 space-y-1">
        <p className="font-semibold text-slate-400">
          {school?.school_name || "Pesantren Tahfizh Al-Qur'an Imam Asy-Syathibi"} • Divisi Pendidikan & Kepengasuhan
        </p>
        <p className="text-[11px]">
          {school?.address || 'Kompleks Pesantren Tahfizh'} | Kontak: {school?.phone || '-'} | Email: {school?.email || '-'}
        </p>
        <p className="text-[10px] text-slate-600 pt-1">
          Sistem Informasi Kedisiplinan Terpadu © {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
};
