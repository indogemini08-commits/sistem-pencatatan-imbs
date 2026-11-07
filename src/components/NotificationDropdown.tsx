import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  Award,
  ShieldAlert,
  ChevronRight,
  X,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { User, ViolationDivision } from '../types';
import { api } from '../services/api';

export interface AppNotification {
  id: string;
  type: 'attention' | 'violation' | 'reward';
  title: string;
  message: string;
  dateStr?: string;
  timeStr?: string;
  timeFormatted: string;
  division?: ViolationDivision;
  points?: number;
  studentId?: string;
  studentName?: string;
  targetTab?: string;
  isRead: boolean;
}

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onSelectTab?: (tab: string) => void;
  onSelectStudent?: (studentId: string) => void;
  onUnreadCountChange?: (count: number) => void;
}

function formatRelativeTime(dateStr?: string, timeStr?: string): string {
  if (!dateStr) return 'Baru saja';
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  if (dateStr === todayStr) {
    return timeStr ? `Hari ini, ${timeStr.substring(0, 5)}` : 'Hari ini';
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  if (dateStr === yesterdayStr) {
    return timeStr ? `Kemarin, ${timeStr.substring(0, 5)}` : 'Kemarin';
  }

  // format as DD/MM
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}` + (timeStr ? ` ${timeStr.substring(0, 5)}` : '');
  }

  return dateStr;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectTab,
  onSelectStudent,
  onUnreadCountChange,
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'attention' | 'violation' | 'reward'>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load saved read IDs
  const getReadSet = (): Set<string> => {
    try {
      const saved = localStorage.getItem('halaqah_read_notifications');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  };

  const saveReadSet = (set: Set<string>) => {
    try {
      localStorage.setItem('halaqah_read_notifications', JSON.stringify(Array.from(set)));
    } catch (e) {
      console.warn('Failed to save read notifications', e);
    }
  };

  const loadNotificationsData = async () => {
    try {
      setLoading(true);
      const readSet = getReadSet();

      // Fetch stats for attention, records, and rewards in parallel
      const [statsData, recordsList, positiveRecordsList] = await Promise.all([
        api.records.stats().catch(() => null),
        api.records.list().catch(() => []),
        api.positiveRecords.list().catch(() => []),
      ]);

      const items: AppNotification[] = [];

      // 1. Santri Needing Attention (SP Thresholds)
      const attentionStudents = statsData?.studentsNeedingAttention || [];
      attentionStudents.slice(0, 5).forEach((s: any) => {
        const id = `attention-${s.id}`;
        items.push({
          id,
          type: 'attention',
          title: `Atensi Disiplin: ${s.name}`,
          message: `Akumulasi poin mencapai ${s.total_points} Poin (${s.halaqah_name || 'Kelas ' + s.class}). Perlu evaluasi pendampingan.`,
          dateStr: new Date().toISOString().split('T')[0],
          timeFormatted: 'Perlu Perhatian',
          points: s.total_points,
          studentId: s.id,
          studentName: s.name,
          targetTab: 'students',
          isRead: readSet.has(id),
        });
      });

      // 2. Recent Violations (last 12 records)
      const recentRecords = (recordsList || [])
        .filter((r) => r.status === 'active')
        .slice(0, 12);

      recentRecords.forEach((r) => {
        const id = `record-${r.id}`;
        items.push({
          id,
          type: 'violation',
          title: r.violation_name_snapshot || 'Pelanggaran Disiplin',
          message: `${r.student_name} (+${r.points_snapshot} Poin) • ${r.halaqah_name_snapshot || r.student_class_snapshot || 'Pondok'}`,
          dateStr: r.date,
          timeStr: r.time,
          timeFormatted: formatRelativeTime(r.date, r.time),
          division: r.division || 'tahfizh',
          points: r.points_snapshot,
          studentId: r.student_id,
          studentName: r.student_name,
          targetTab: r.division === 'kesantrian' ? 'records_kesantrian' : r.division === 'akademik' ? 'records_akademik' : 'records_tahfizh',
          isRead: readSet.has(id),
        });
      });

      // 3. Recent Good Deeds / Rewards (last 8 positive records)
      const recentRewards = (positiveRecordsList || [])
        .filter((pr) => pr.status === 'active')
        .slice(0, 8);

      recentRewards.forEach((pr) => {
        const id = `reward-${pr.id}`;
        items.push({
          id,
          type: 'reward',
          title: pr.action_name_snapshot || 'Apresiasi Kebaikan',
          message: `${pr.student_name} (-${pr.points_deducted} Poin) • ${pr.halaqah_name_snapshot || 'Pondok'}`,
          dateStr: pr.date,
          timeStr: pr.time,
          timeFormatted: formatRelativeTime(pr.date, pr.time),
          division: pr.division || 'tahfizh',
          points: pr.points_deducted,
          studentId: pr.student_id,
          studentName: pr.student_name,
          targetTab: pr.division === 'kesantrian' ? 'rewards_kesantrian' : pr.division === 'akademik' ? 'rewards_akademik' : 'rewards_tahfizh',
          isRead: readSet.has(id),
        });
      });

      // Sort: unread first, then by dateStr/timeStr descending
      items.sort((a, b) => {
        if (a.isRead !== b.isRead) {
          return a.isRead ? 1 : -1;
        }
        const timeA = (a.dateStr || '') + (a.timeStr || '');
        const timeB = (b.dateStr || '') + (b.timeStr || '');
        return timeB.localeCompare(timeA);
      });

      setNotifications(items);
      const unread = items.filter((n) => !n.isRead).length;
      if (onUnreadCountChange) {
        onUnreadCountChange(unread);
      }
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotificationsData();

    // Listen to real-time changes
    const handleDataChanged = () => {
      loadNotificationsData();
    };

    window.addEventListener('app:data-changed', handleDataChanged);
    return () => {
      window.removeEventListener('app:data-changed', handleDataChanged);
    };
  }, []);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleMarkAllRead = () => {
    const readSet = getReadSet();
    notifications.forEach((n) => readSet.add(n.id));
    saveReadSet(readSet);

    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    if (onUnreadCountChange) {
      onUnreadCountChange(0);
    }
  };

  const handleItemClick = (item: AppNotification) => {
    // Mark as read
    const readSet = getReadSet();
    readSet.add(item.id);
    saveReadSet(readSet);

    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
    );

    const newUnread = notifications.filter((n) => n.id !== item.id && !n.isRead).length;
    if (onUnreadCountChange) {
      onUnreadCountChange(newUnread);
    }

    onClose();

    // Action navigation
    if (item.studentId && onSelectStudent) {
      onSelectStudent(item.studentId);
    } else if (item.targetTab && onSelectTab) {
      onSelectTab(item.targetTab);
    }
  };

  if (!isOpen) return null;

  const filteredList = notifications.filter((n) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'attention') return n.type === 'attention';
    if (activeTab === 'violation') return n.type === 'violation';
    if (activeTab === 'reward') return n.type === 'reward';
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div
      ref={dropdownRef}
      className="fixed inset-x-2 top-16 sm:inset-x-auto sm:absolute sm:right-0 sm:top-full sm:mt-2.5 w-auto sm:w-[490px] max-w-[calc(100vw-1rem)] rounded-3xl bg-white/95 dark:bg-[#111726]/95 backdrop-blur-2xl border border-slate-200/90 dark:border-white/[0.12] shadow-2xl z-50 overflow-hidden animate-scale-in"
    >
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-white/[0.08] flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25 shrink-0">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Notifikasi Aktivitas
              </h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black shadow-xs">
                  {unreadCount} Baru
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Pembaruan kedisiplinan dan poin santri
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-white/[0.08] transition-colors flex items-center gap-1 cursor-pointer"
              title="Tandai Semua Sudah Dibaca"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tandai Dibaca</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Category Segmented Tabs (Anti-Crop Full Width Flex with Smooth Overflow) */}
      <div className="p-2 sm:px-4 sm:py-2.5 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02]">
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-200/60 dark:bg-white/[0.06] overflow-x-auto no-scrollbar text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex-1 min-w-fit py-1.5 px-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Semua</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                activeTab === 'all'
                  ? 'bg-white/25 text-white'
                  : 'bg-slate-300 dark:bg-white/10 text-slate-700 dark:text-slate-300'
              }`}
            >
              {notifications.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('attention')}
            className={`flex-1 min-w-fit py-1.5 px-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all text-center flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
              activeTab === 'attention'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Atensi SP</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('violation')}
            className={`flex-1 min-w-fit py-1.5 px-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all text-center flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
              activeTab === 'violation'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            <span>Pelanggaran</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reward')}
            className={`flex-1 min-w-fit py-1.5 px-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all text-center flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
              activeTab === 'reward'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>Kebaikan</span>
          </button>
        </div>
      </div>

      {/* Notification Items List */}
      <div className="max-h-[380px] sm:max-h-[420px] overflow-y-auto divide-y divide-slate-100 dark:divide-white/[0.06] overscroll-contain">
        {loading ? (
          <div className="py-10 text-center space-y-2">
            <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-semibold">Memuat aktivitas terbaru...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-12 px-6 text-center space-y-2.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-white/[0.06] text-indigo-500 dark:text-indigo-400 flex items-center justify-center mx-auto">
              <Bell className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
              Tidak Ada Notifikasi
            </p>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Semua santri dalam pemantauan normal dan belum ada aktivitas pada kategori ini.
            </p>
          </div>
        ) : (
          filteredList.map((item) => {
            const isAttention = item.type === 'attention';
            const isReward = item.type === 'reward';
            const isViolation = item.type === 'violation';

            return (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`p-3.5 sm:p-4 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer flex items-start gap-3 relative group ${
                  !item.isRead ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                }`}
              >
                {/* Visual Icon Badge */}
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 shadow-xs ${
                    isAttention
                      ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 ring-1 ring-amber-400/40'
                      : isReward
                      ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-400/40'
                      : 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 ring-1 ring-rose-400/40'
                  }`}
                >
                  {isAttention ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : isReward ? (
                    <Award className="w-4 h-4" />
                  ) : (
                    <ShieldAlert className="w-4 h-4" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <p
                      className={`text-xs sm:text-sm font-bold truncate leading-tight ${
                        !item.isRead
                          ? 'text-slate-900 dark:text-white font-black'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {item.title}
                    </p>
                    <span className="text-[10px] text-slate-400 font-semibold shrink-0">
                      {item.timeFormatted}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {item.message}
                  </p>

                  <div className="flex items-center gap-1.5 pt-0.5">
                    {item.division && (
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                          item.division === 'akademik'
                            ? 'bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60'
                            : item.division === 'kesantrian'
                            ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60'
                            : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                        }`}
                      >
                        {item.division}
                      </span>
                    )}

                    {isAttention && (
                      <span className="text-[9px] px-2 py-0.5 rounded-md font-extrabold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                        Evaluasi SP
                      </span>
                    )}

                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-0.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>Buka</span>
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>

                {/* Unread Glowing Dot */}
                {!item.isRead && (
                  <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 ring-2 ring-white dark:ring-[#111726] shrink-0 mt-2" />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-100 dark:border-white/[0.08] bg-slate-50/80 dark:bg-slate-900/60 flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={() => {
            onClose();
            if (onSelectTab) onSelectTab('records');
          }}
          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
        >
          <span>Buka Semua Riwayat Catatan</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>

        <span className="text-[10px] text-slate-400 font-medium">Real-time sync</span>
      </div>
    </div>
  );
};

