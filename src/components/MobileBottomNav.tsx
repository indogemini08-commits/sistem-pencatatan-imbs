import React from 'react';
import { LayoutDashboard, History, Plus, GraduationCap, BookOpen } from 'lucide-react';

interface MobileBottomNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenQuickRecord: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenQuickRecord,
}) => {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-[#0d1222]/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-white/[0.08] px-2 py-2 shadow-2xl transition-colors duration-300">
      <div className="flex items-center justify-around relative max-w-md mx-auto">
        {/* Dashboard */}
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all duration-200 relative ${
            currentTab === 'dashboard'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold scale-105'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          {currentTab === 'dashboard' && (
            <span className="absolute -top-1 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500" />
          )}
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 tracking-tight">Beranda</span>
        </button>

        {/* Riwayat */}
        <button
          onClick={() => onSelectTab('records')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all duration-200 relative ${
            currentTab === 'records'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold scale-105'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          {currentTab === 'records' && (
            <span className="absolute -top-1 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500" />
          )}
          <History className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 tracking-tight">Riwayat</span>
        </button>

        {/* Big Center Action Button: + CATAT */}
        <div className="relative -top-5 flex flex-col items-center group">
          <button
            onClick={onOpenQuickRecord}
            className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-600 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-indigo-500/40 ring-4 ring-white dark:ring-[#0d1222] transform active:scale-90 transition-transform duration-200"
            aria-label="Catat Pelanggaran"
          >
            <Plus className="w-7 h-7 stroke-[2.5]" />
          </button>
          <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 mt-1 uppercase tracking-wider">
            Catat
          </span>
        </div>

        {/* Santri */}
        <button
          onClick={() => onSelectTab('students')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all duration-200 relative ${
            currentTab === 'students'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold scale-105'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          {currentTab === 'students' && (
            <span className="absolute -top-1 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500" />
          )}
          <GraduationCap className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 tracking-tight">Santri</span>
        </button>

        {/* Halaqah */}
        <button
          onClick={() => onSelectTab('halaqah')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all duration-200 relative ${
            currentTab === 'halaqah'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold scale-105'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          {currentTab === 'halaqah' && (
            <span className="absolute -top-1 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500" />
          )}
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 tracking-tight">Halaqah</span>
        </button>
      </div>
    </div>
  );
};
