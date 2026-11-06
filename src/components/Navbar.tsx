import React, { useState } from 'react';
import {
  LogOut,
  User,
  PlusCircle,
  Menu,
  Sparkles,
  Calendar,
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  Users,
  ShieldAlert,
  History,
  UserCog,
  Settings as SettingsIcon,
  ScrollText,
  Award,
  Building2,
  ShieldCheck,
  Search,
  Bell,
} from 'lucide-react';
import { User as UserType, SchoolSettings } from '../types';
import { ThemeToggle } from './ThemeToggle';
import { NotificationDropdown } from './NotificationDropdown';

interface NavbarProps {
  currentUser: UserType | null;
  settings: SchoolSettings | null;
  onLogout: () => void;
  onOpenQuickRecord: () => void;
  onOpenQuickReward?: () => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  currentTab?: string;
  onSelectTab?: (tab: string) => void;
  onSelectStudent?: (studentId: string) => void;
  onSettingsUpdated?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  settings,
  onLogout,
  onOpenQuickRecord,
  onOpenQuickReward,
  onToggleSidebar,
  currentTab = 'dashboard',
  onSelectTab,
  onSelectStudent,
}) => {
  const [isNotificationOpen, setIsNotificationOpen] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const getTabTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return { label: 'Dashboard Monitoring', icon: LayoutDashboard };
      case 'students':
        return { label: 'Data Santri & Poin', icon: GraduationCap };
      case 'student_detail':
        return { label: 'Profil Detail Santri', icon: GraduationCap };
      case 'halaqah':
        return { label: 'Kelompok Halaqah Al-Qur\'an', icon: BookOpen };
      case 'teachers':
        return { label: 'Data Asatidz & Muhafizh', icon: Users };
      case 'violations_master':
        return { label: 'Master Pelanggaran & Poin', icon: ShieldAlert };
      case 'violations_tahfizh':
        return { label: 'Master Aturan Tahfizh', icon: ShieldAlert };
      case 'violations_kesantrian':
        return { label: 'Master Aturan Kesantrian', icon: ShieldCheck };
      case 'violations_akademik':
        return { label: 'Master Aturan Akademik', icon: ShieldCheck };
      case 'records':
        return { label: 'Riwayat Pelanggaran Terpadu', icon: History };
      case 'records_tahfizh':
        return { label: 'Pelanggaran Divisi Tahfizh', icon: BookOpen };
      case 'records_kesantrian':
        return { label: 'Pelanggaran Divisi Kesantrian', icon: Building2 };
      case 'records_akademik':
        return { label: 'Pelanggaran Divisi Akademik', icon: BookOpen };
      case 'rewards_tahfizh':
        return { label: 'Kebaikan & Prestasi Tahfizh', icon: Award };
      case 'rewards_kesantrian':
        return { label: 'Kebaikan & Prestasi Kesantrian', icon: Award };
      case 'rewards_akademik':
        return { label: 'Kebaikan & Prestasi Akademik', icon: Award };
      case 'users':
        return { label: 'Manajemen Akun Pengguna', icon: UserCog };
      case 'settings':
        return { label: 'Pengaturan & Batas Poin', icon: SettingsIcon };
      case 'audit':
        return { label: 'Log Audit Aktivitas Sistem', icon: ScrollText };
      default:
        return { label: 'Sistem Poin Halaqah', icon: Sparkles };
    }
  };

  const activeTabMeta = getTabTitle(currentTab);
  const TabIcon = activeTabMeta.icon;

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-700/70 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Admin
          </span>
        );
      case 'coordinator':
        return (
          <span className="bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-700/70 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Koordinator Tahfizh
          </span>
        );
      case 'kepala_kesantrian':
        return (
          <span className="bg-indigo-100 text-indigo-800 border border-indigo-300 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-700/70 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Kepala Kesantrian
          </span>
        );
      case 'teacher':
        return (
          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-700/70 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Muhafizh
          </span>
        );
      case 'guru':
        return (
          <span className="bg-teal-100 text-teal-800 border border-teal-300 dark:bg-teal-950/70 dark:text-teal-300 dark:border-teal-700/70 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Guru
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <header className="sticky top-0 z-20 h-16 sm:h-18 bg-white/80 dark:bg-[#0b101d]/85 backdrop-blur-2xl border-b border-slate-200/90 dark:border-white/[0.1] px-3 sm:px-6 lg:px-8 flex items-center justify-between shadow-xs transition-colors duration-200">
      {/* Left: Mobile Toggle & Desktop Breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        {/* Mobile Hamburger Menu */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] border border-slate-300/80 dark:border-white/[0.1] transition-colors shrink-0"
          aria-label="Buka Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile Logo & App Title */}
        <div
          className="flex lg:hidden items-center gap-2 cursor-pointer min-w-0"
          onClick={() => onSelectTab && onSelectTab('dashboard')}
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 p-0.5 flex items-center justify-center ring-1 ring-indigo-500/30 shrink-0">
            <div className="w-full h-full rounded-lg bg-white dark:bg-slate-950 p-1 flex items-center justify-center">
              <img
                src={settings?.logo_url || '/logo.svg'}
                alt="Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo.svg';
                }}
              />
            </div>
          </div>
          <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate max-w-[105px] xs:max-w-[130px] sm:max-w-[200px]">
            {settings?.app_name || 'Sistem Poin IMBS'}
          </span>
        </div>

        {/* Desktop Active Section Title with Icon */}
        <div className="hidden lg:flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-100/90 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 shadow-xs">
            <TabIcon className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
              {activeTabMeta.label}
            </h1>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold">
              {settings?.school_name || "Pesantren Tahfizh Al-Qur'an"}
            </p>
          </div>
        </div>
      </div>

      {/* Middle: SaaS Search Bar (Desktop) */}
      <div className="hidden xl:flex items-center relative min-w-[260px] 2xl:min-w-[320px]">
        <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
        <input
          type="text"
          placeholder="Cari santri, NIS, halaqah..."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && onSelectTab) {
              onSelectTab('students');
            }
          }}
          className="w-full pl-9 pr-4 py-1.5 text-xs rounded-full bg-white/80 dark:bg-white/[0.08] border border-slate-300 dark:border-white/[0.14] text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-inner transition-all"
        />
      </div>

      {/* Right: Academic Year Pill, Quick Action, Theme, Notifications & Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Academic Year Pill */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/85 dark:bg-white/[0.08] border border-slate-300 dark:border-white/[0.12] text-xs text-slate-800 dark:text-slate-200 font-bold shadow-xs">
          <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>T.A. {settings?.current_academic_year || '2025/2026'}</span>
        </div>

        {/* Quick Reward (Kebaikan & Pengurangan Poin) Button */}
        {onOpenQuickReward && (
          <button
            onClick={onOpenQuickReward}
            className="flex items-center gap-1.5 p-2 sm:px-3.5 sm:py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 border border-white/10 transition-all transform active:scale-95 shrink-0 whitespace-nowrap"
            title="Catat Kegiatan Baik / Pengurangan Poin Santri"
            aria-label="Catat Kebaikan"
          >
            <Sparkles className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-emerald-200 shrink-0" />
            <span className="hidden sm:inline">Catat Kebaikan</span>
          </button>
        )}

        {/* Quick Violation Record Button */}
        <button
          onClick={onOpenQuickRecord}
          className="flex items-center gap-1.5 p-2 sm:px-3.5 sm:py-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/25 border border-white/20 transition-all transform active:scale-95 shrink-0 whitespace-nowrap"
          title="Catat Pelanggaran Santri"
          aria-label="Catat Pelanggaran"
        >
          <PlusCircle className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-purple-200 shrink-0" />
          <span className="hidden sm:inline">Catat Pelanggaran</span>
        </button>

        {/* Notification Bell */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
            title="Notifikasi Aktivitas"
            aria-label="Notifikasi Aktivitas"
            className={`relative p-2 rounded-xl transition-all cursor-pointer ${
              isNotificationOpen
                ? 'bg-indigo-50 dark:bg-white/[0.12] text-indigo-600 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-500/40 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-slate-200/80 dark:border-white/[0.08]'
            }`}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white dark:ring-[#0b101d] shadow-sm animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <NotificationDropdown
            isOpen={isNotificationOpen}
            onClose={() => setIsNotificationOpen(false)}
            currentUser={currentUser}
            onSelectTab={onSelectTab}
            onSelectStudent={onSelectStudent}
            onUnreadCountChange={setUnreadCount}
          />
        </div>

        {/* Theme Toggle Switcher (Matahari - Bulan) */}
        <div className="shrink-0">
          <ThemeToggle size="sm" />
        </div>

        {/* User Profile Pill Card (Matching Reference Image) */}
        <div className="flex items-center shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 py-1 rounded-2xl bg-slate-100/90 dark:bg-white/[0.06] border border-slate-200/90 dark:border-white/[0.08] shadow-xs">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-md shadow-indigo-500/25 ring-1 ring-white/20 shrink-0">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
            </div>
            <div className="text-left hidden sm:block pr-1">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[110px] leading-tight">
                {currentUser?.name || 'Pengguna'}
              </p>
              <div className="mt-0.5">{getRoleBadge(currentUser?.role)}</div>
            </div>
            <button
              onClick={onLogout}
              title="Keluar / Logout"
              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all shrink-0 ml-0.5"
              aria-label="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
