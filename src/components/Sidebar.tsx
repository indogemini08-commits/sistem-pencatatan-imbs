import React, { useRef, useState } from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  History,
  Users,
  BookOpen,
  GraduationCap,
  ShieldAlert,
  ShieldCheck,
  Building2,
  UserCog,
  Settings,
  ScrollText,
  X,
  ChevronRight,
  Sparkles,
  Camera,
  Check,
  Award,
  HeartHandshake,
  Moon,
  Sun,
  Shield,
  Layers,
} from 'lucide-react';
import { UserRole, SchoolSettings } from '../types';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  userRole?: UserRole;
  isOpen: boolean;
  onClose: () => void;
  onOpenQuickRecord: () => void;
  onOpenQuickReward?: () => void;
  settings?: SchoolSettings | null;
  onSettingsUpdated?: () => void;
  userName?: string;
}

interface NavSection {
  title: string;
  items: Array<{
    id: string;
    label: string;
    icon: React.ElementType;
    roles: UserRole[];
    badge?: string;
  }>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  userRole = 'teacher',
  isOpen,
  onClose,
  onOpenQuickRecord,
  onOpenQuickReward,
  settings,
  onSettingsUpdated,
  userName = 'Admin',
}) => {
  const { isDark, toggleTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const isAdmin = userRole === 'admin';

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Format file tidak didukung. Harap pilih file gambar (PNG, JPG, SVG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran file gambar maksimal 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      if (event.target?.result && settings) {
        setUploadingLogo(true);
        try {
          await api.settings.updateSchool({
            appName: settings.app_name,
            schoolName: settings.school_name,
            address: settings.address,
            phone: settings.phone,
            email: settings.email,
            logoUrl: event.target.result as string,
            kopSuratText: settings.kop_surat_text,
            currentAcademicYear: settings.current_academic_year,
            actorName: userName,
          });
          setUploadSuccess(true);
          setTimeout(() => setUploadSuccess(false), 3000);
          if (onSettingsUpdated) onSettingsUpdated();
        } catch (err: any) {
          alert('Gagal memperbarui logo: ' + err.message);
        } finally {
          setUploadingLogo(false);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const sections: NavSection[] = [
    {
      title: 'MENU UTAMA',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard Terpadu',
          icon: LayoutDashboard,
          roles: ['admin', 'coordinator', 'kepala_kesantrian', 'teacher', 'guru'],
        },
      ],
    },
    {
      title: 'DIVISI TAHFIZH (HALAQAH)',
      items: [
        {
          id: 'records_tahfizh',
          label: 'Pelanggaran Tahfizh',
          icon: BookOpen,
          roles: ['admin', 'coordinator', 'kepala_kesantrian', 'teacher', 'guru'],
        },
        {
          id: 'rewards_tahfizh',
          label: 'Kebaikan & Prestasi',
          icon: Award,
          roles: ['admin', 'coordinator', 'kepala_kesantrian', 'teacher', 'guru'],
        },
        {
          id: 'violations_tahfizh',
          label: 'Master Aturan Tahfizh',
          icon: ShieldAlert,
          roles: ['admin', 'coordinator', 'kepala_kesantrian'],
        },
        {
          id: 'halaqah',
          label: 'Data Halaqah',
          icon: Users,
          roles: ['admin', 'coordinator', 'kepala_kesantrian', 'teacher'],
        },
        {
          id: 'teachers',
          label: 'Data Muhafizh',
          icon: GraduationCap,
          roles: ['admin', 'coordinator', 'kepala_kesantrian'],
        },
      ],
    },
    {
      title: 'DIVISI KESANTRIAN (ASRAMA)',
      items: [
        {
          id: 'records_kesantrian',
          label: 'Pelanggaran Kesantrian',
          icon: Building2,
          roles: ['admin', 'coordinator', 'kepala_kesantrian', 'teacher', 'guru'],
        },
        {
          id: 'rewards_kesantrian',
          label: 'Kebaikan & Prestasi',
          icon: Award,
          roles: ['admin', 'coordinator', 'kepala_kesantrian', 'teacher', 'guru'],
        },
        {
          id: 'violations_kesantrian',
          label: 'Master Aturan Kesantrian',
          icon: ShieldCheck,
          roles: ['admin', 'coordinator', 'kepala_kesantrian'],
        },
      ],
    },
    {
      title: 'DIVISI AKADEMIK (SEKOLAH / KBM)',
      items: [
        {
          id: 'records_akademik',
          label: 'Pelanggaran Akademik',
          icon: BookOpen,
          roles: ['admin', 'coordinator', 'kepala_kesantrian', 'teacher', 'guru'],
        },
        {
          id: 'rewards_akademik',
          label: 'Kebaikan & Prestasi',
          icon: Award,
          roles: ['admin', 'coordinator', 'kepala_kesantrian', 'teacher', 'guru'],
        },
        {
          id: 'violations_akademik',
          label: 'Master Aturan Akademik',
          icon: Shield,
          roles: ['admin', 'coordinator', 'kepala_kesantrian'],
        },
      ],
    },
    {
      title: 'DATA SANTRI & PUSAT',
      items: [
        {
          id: 'students',
          label: 'Data Santri & Poin',
          icon: GraduationCap,
          roles: ['admin', 'coordinator', 'kepala_kesantrian', 'teacher', 'guru'],
        },
        {
          id: 'records',
          label: 'Rekap Terpadu (Semua)',
          icon: History,
          roles: ['admin', 'coordinator', 'kepala_kesantrian', 'teacher', 'guru'],
        },
        {
          id: 'parent_portal',
          label: 'Portal Wali (Pratinjau)',
          icon: HeartHandshake,
          roles: ['admin', 'coordinator', 'kepala_kesantrian', 'teacher', 'guru'],
          badge: 'Cek NIS',
        },
      ],
    },
    {
      title: 'PENGATURAN & AUDIT',
      items: [
        {
          id: 'users',
          label: 'Manajemen Akun',
          icon: UserCog,
          roles: ['admin'],
        },
        {
          id: 'settings',
          label: 'Pengaturan & Batas Poin',
          icon: Settings,
          roles: ['admin'],
        },
        {
          id: 'audit',
          label: 'Audit Log',
          icon: ScrollText,
          roles: ['admin'],
        },
      ],
    },
  ];

  return (
    <>
      {/* Hidden file picker for direct logo upload from device */}
      {isAdmin && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleLogoUpload}
        />
      )}

      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Full-Height Modern SaaS Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-white/80 dark:bg-[#0b101d]/85 backdrop-blur-2xl border-r border-slate-200/90 dark:border-white/[0.1] text-slate-900 dark:text-slate-100 transition-all duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        } flex flex-col justify-between overflow-y-auto`}
      >
        <div className="flex flex-col flex-1">
          {/* Top Brand Header */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200/90 dark:border-white/[0.08] shrink-0 bg-white/70 dark:bg-[#0e1424]/85 backdrop-blur-xl">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Logo Container with Quick Upload Trigger for Admin */}
              <div
                className={`relative group ${isAdmin ? 'cursor-pointer' : ''}`}
                onClick={() => {
                  if (isAdmin) {
                    fileInputRef.current?.click();
                  }
                }}
                title={isAdmin ? 'Klik untuk ganti logo dari perangkat' : undefined}
              >
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 p-1 flex items-center justify-center ring-2 ring-indigo-500/30 shadow-md shadow-indigo-500/20 flex-shrink-0 transition-transform group-hover:scale-105">
                  <div className="w-full h-full rounded-xl bg-white/95 dark:bg-slate-900/95 p-1 flex items-center justify-center overflow-hidden">
                    <img
                      src={settings?.logo_url || '/logo.svg'}
                      alt="Logo Halaqah"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/logo.svg';
                      }}
                    />
                  </div>
                </div>

                {isAdmin && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-white ring-2 ring-white dark:ring-[#0b101d] shadow-md opacity-85 group-hover:opacity-100 transition-opacity">
                    {uploadingLogo ? (
                      <div className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : uploadSuccess ? (
                      <Check className="w-3 h-3 text-emerald-300" />
                    ) : (
                      <Camera className="w-2.5 h-2.5" />
                    )}
                  </div>
                )}
              </div>

              {/* Title & Subtitle */}
              <div
                className="min-w-0 flex-1 cursor-pointer"
                onClick={() => {
                  onSelectTab('dashboard');
                  onClose();
                }}
              >
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm font-black tracking-tight text-slate-900 dark:text-white truncate hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                    {settings?.app_name || 'Sistem Poin IMBS'}
                  </h1>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate font-bold">
                  {settings?.school_name || "Pesantren Tahfizh"}
                </p>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Tutup Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Action Button & Navigation Links */}
          <div className="p-4 space-y-5 flex-1">
            {/* Quick Action Buttons with SaaS Gradient & Glow */}
            <div className="space-y-2">
              <button
                onClick={() => {
                  onOpenQuickRecord();
                  onClose();
                }}
                className="w-full py-2.5 px-3.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white font-black rounded-2xl shadow-lg shadow-indigo-600/30 border border-white/20 transition-all flex items-center justify-center gap-2 group transform active:scale-95 text-xs sm:text-sm"
              >
                <PlusCircle className="w-4 h-4 text-purple-200 group-hover:rotate-90 transition-transform duration-300" />
                <span className="tracking-wide">+ Catat Pelanggaran</span>
              </button>

              {onOpenQuickReward && (
                <button
                  onClick={() => {
                    onOpenQuickReward();
                    onClose();
                  }}
                  className="w-full py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-2xl shadow-md shadow-emerald-600/25 border border-emerald-400/20 transition-all flex items-center justify-center gap-2 group transform active:scale-95 text-xs"
                >
                  <Award className="w-4 h-4 text-emerald-200 group-hover:scale-110 transition-transform duration-200" />
                  <span className="tracking-wide">★ Catat Kebaikan</span>
                </button>
              )}
            </div>

            {/* Navigation Sections */}
            <nav className="space-y-4 pt-1" aria-label="Menu Navigasi">
              {sections.map((sec, secIdx) => {
                const visibleItems = sec.items.filter((item) => item.roles.includes(userRole));
                if (visibleItems.length === 0) return null;

                return (
                  <div key={sec.title} className="space-y-1">
                    {/* Section Divider (between sections) */}
                    {secIdx > 0 && (
                      <div className="pt-2 pb-1 border-t border-slate-200/70 dark:border-white/[0.08] my-1" />
                    )}

                    {/* Section Title Header with accent dot */}
                    <div className="px-3 py-1 flex items-center gap-2 select-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 shadow-[0_0_6px_#6366f1]" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        {sec.title}
                      </span>
                    </div>

                    {/* Section Items */}
                    <div className="space-y-1 mt-1">
                      {visibleItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = currentTab === item.id;

                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              onSelectTab(item.id);
                              onClose();
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] font-bold transition-all group ${
                              isActive
                                ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/30 border border-white/20'
                                : 'text-slate-700 dark:text-slate-200 hover:bg-indigo-50/90 dark:hover:bg-white/[0.08] hover:text-indigo-700 dark:hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                  isActive
                                    ? 'bg-white/20 text-white'
                                    : 'bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-slate-200 group-hover:bg-indigo-500/25 group-hover:text-indigo-700 dark:group-hover:text-indigo-300'
                                }`}
                              >
                                <Icon className="w-4 h-4 shrink-0" />
                              </div>
                              <span className="tracking-tight truncate text-left">{item.label}</span>
                            </div>

                            {isActive ? (
                              <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)] shrink-0" />
                            ) : item.badge ? (
                              <span className="px-1.5 py-0.2 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 text-[9px] font-black">
                                {item.badge}
                              </span>
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Sidebar Footer: Info Mini Card & Dark Mode Switch Bar */}
        <div className="p-3.5 border-t border-slate-200/90 dark:border-white/[0.08] bg-white/70 dark:bg-[#0e1424]/85 backdrop-blur-xl shrink-0 space-y-2.5">
          {/* Mini SaaS Discipline Card */}
          <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent dark:from-indigo-500/20 dark:via-purple-500/10 dark:to-transparent border border-indigo-200/90 dark:border-indigo-500/25 text-left shadow-xs">
            <div className="flex items-center justify-between gap-1.5 mb-1">
              <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300">
                <Shield className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span className="text-[11px] font-black uppercase tracking-wide">Pusat Poin IMBS</span>
              </div>
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[9px] font-black">
                Online
              </span>
            </div>
            <p className="text-[10px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed font-medium">
              Tahfizh & Asrama terintegrasi dengan ambang batas sanksi otomatis.
            </p>
          </div>

          {/* Interactive Dark Mode Toggle Switch (Matching Reference Image) */}
          <div className="flex items-center justify-between px-2.5 py-2 rounded-xl bg-slate-100/90 dark:bg-white/[0.08] border border-slate-200/90 dark:border-white/[0.08] text-xs">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-black">
              {isDark ? (
                <Moon className="w-4 h-4 text-indigo-400 fill-indigo-400/40" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500 fill-amber-500/40" />
              )}
              <span className="text-xs">Dark Mode</span>
            </div>

            {/* Switch Knob */}
            <button
              type="button"
              role="switch"
              aria-checked={isDark}
              onClick={toggleTheme}
              className={`w-11 h-6 p-0.5 rounded-full transition-colors duration-300 ease-in-out cursor-pointer flex items-center ${
                isDark
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 shadow-inner'
                  : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-300 ease-in-out flex items-center justify-center ${
                  isDark ? 'translate-x-5' : 'translate-x-0'
                }`}
              >
                {isDark ? (
                  <Moon className="w-2.5 h-2.5 text-indigo-600" />
                ) : (
                  <Sun className="w-2.5 h-2.5 text-amber-500" />
                )}
              </div>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
