import React, { useState, useEffect, useMemo } from 'react';
import {
  PlusCircle,
  Users,
  GraduationCap,
  BookOpen,
  AlertTriangle,
  History,
  TrendingUp,
  Calendar,
  Sparkles,
  ArrowUpRight,
  Clock,
  MapPin,
  CheckCircle2,
  FileText,
  ChevronRight,
  Building2,
  ShieldAlert,
  Award,
  Search,
  Filter,
  ChevronLeft,
  Flame,
  Star,
  Check,
  Bot,
  Quote,
  Activity,
  ArrowRight,
  Target,
  Globe,
} from 'lucide-react';
import { User, DashboardStats, Halaqah, Student } from '../types';
import { api } from '../services/api';
import { storageSync } from '../services/storageSync';
import { StatusBadge } from '../components/Badge';
import { sortClasses } from '../utils/classHelper';

interface DisciplineTrendChartProps {
  stats: DashboardStats | null;
  chartTimeframe: 'week' | 'month' | 'semester';
  setChartTimeframe: (tf: 'week' | 'month' | 'semester') => void;
  onSelectTab: (tab: string) => void;
}

type ChartMode = 'cases' | 'points' | 'divisions' | 'comparison';

interface TrendChartItem {
  key: string;
  label: string;
  fullLabel: string;
  count: number;
  points: number;
  tahfizhCount: number;
  tahfizhPoints: number;
  kesantrianCount: number;
  kesantrianPoints: number;
  akademikCount: number;
  akademikPoints: number;
  positiveCount: number;
  positivePoints: number;
  isToday?: boolean;
}

// Cubic Bezier Spline generator for ultra-smooth neon curves
function getSplinePath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;

  let d = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < points.length - 2 ? points[i + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

function getAreaPath(points: Array<{ x: number; y: number }>, baselineY: number = 155): string {
  if (points.length === 0) return '';
  const spline = getSplinePath(points);
  const firstX = points[0].x.toFixed(1);
  const lastX = points[points.length - 1].x.toFixed(1);
  return `${spline} L ${lastX},${baselineY} L ${firstX},${baselineY} Z`;
}

export const DisciplineTrendChart: React.FC<DisciplineTrendChartProps> = ({
  stats,
  chartTimeframe,
  setChartTimeframe,
  onSelectTab,
}) => {
  const [chartMode, setChartMode] = useState<ChartMode>('cases');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Normalize dataset based on chartTimeframe
  const dataset: TrendChartItem[] = useMemo(() => {
    if (chartTimeframe === 'week') {
      const raw = stats?.weeklyTrend || [];
      if (raw.length === 0) {
        const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Ahd'];
        const dayNames = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'];
        return days.map((d, i) => ({
          key: `w-${i}`,
          label: d,
          fullLabel: `${dayNames[i]}, Pekan Ini`,
          count: 0,
          points: 0,
          tahfizhCount: 0,
          tahfizhPoints: 0,
          kesantrianCount: 0,
          kesantrianPoints: 0,
          akademikCount: 0,
          akademikPoints: 0,
          positiveCount: 0,
          positivePoints: 0,
          isToday: false,
        }));
      }
      return raw.map((item, idx) => ({
        key: `w-${idx}`,
        label: item.shortDay,
        fullLabel: `${item.dayName}${item.date ? `, ${new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}` : ''}`,
        count: item.count || 0,
        points: item.points || 0,
        tahfizhCount: item.tahfizhCount || 0,
        tahfizhPoints: item.tahfizhPoints || 0,
        kesantrianCount: item.kesantrianCount || 0,
        kesantrianPoints: item.kesantrianPoints || 0,
        akademikCount: item.akademikCount || 0,
        akademikPoints: item.akademikPoints || 0,
        positiveCount: item.positiveCount || 0,
        positivePoints: item.positivePoints || 0,
        isToday: item.isToday,
      }));
    }

    if (chartTimeframe === 'month') {
      const raw = stats?.monthWeeksTrend || [];
      if (raw.length === 0) {
        return [1, 2, 3, 4].map((w, i) => ({
          key: `m-${i}`,
          label: `Pekan ${w}`,
          fullLabel: `Pekan ${w} Bulan Ini`,
          count: 0,
          points: 0,
          tahfizhCount: 0,
          tahfizhPoints: 0,
          kesantrianCount: 0,
          kesantrianPoints: 0,
          akademikCount: 0,
          akademikPoints: 0,
          positiveCount: 0,
          positivePoints: 0,
          isToday: false,
        }));
      }
      return raw.map((item, idx) => ({
        key: `m-${idx}`,
        label: item.weekLabel,
        fullLabel: `${item.weekLabel} (${item.dateRange})`,
        count: item.count || 0,
        points: item.points || 0,
        tahfizhCount: item.tahfizhCount || 0,
        tahfizhPoints: item.tahfizhPoints || 0,
        kesantrianCount: item.kesantrianCount || 0,
        kesantrianPoints: item.kesantrianPoints || 0,
        akademikCount: item.akademikCount || 0,
        akademikPoints: item.akademikPoints || 0,
        positiveCount: item.positiveCount || 0,
        positivePoints: item.positivePoints || 0,
        isToday: false,
      }));
    }

    // chartTimeframe === 'semester'
    const raw = stats?.monthlyTrend || [];
    if (raw.length === 0) {
      return ['Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'].map((m, i) => ({
        key: `s-${i}`,
        label: m,
        fullLabel: `Bulan ${m}`,
        count: 0,
        points: 0,
        tahfizhCount: 0,
        tahfizhPoints: 0,
        kesantrianCount: 0,
        kesantrianPoints: 0,
        akademikCount: 0,
        akademikPoints: 0,
        positiveCount: 0,
        positivePoints: 0,
        isToday: false,
      }));
    }
    return raw.map((item, idx) => {
      let displayMonth = item.month;
      if (item.month.includes('-')) {
        const parts = item.month.split('-');
        const mIdx = parseInt(parts[1], 10) - 1;
        const mNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        displayMonth = mNames[mIdx] || item.month;
      }
      return {
        key: `s-${idx}`,
        label: displayMonth,
        fullLabel: `Bulan ${displayMonth} (${item.month})`,
        count: item.count || 0,
        points: item.points || 0,
        tahfizhCount: item.tahfizhCount || 0,
        tahfizhPoints: item.tahfizhPoints || 0,
        kesantrianCount: item.kesantrianCount || 0,
        kesantrianPoints: item.kesantrianPoints || 0,
        akademikCount: item.akademikCount || 0,
        akademikPoints: item.akademikPoints || 0,
        positiveCount: item.positiveCount || 0,
        positivePoints: item.positivePoints || 0,
        isToday: false,
      };
    });
  }, [stats, chartTimeframe]);

  // Analytical summary
  const summary = useMemo(() => {
    const totalCases = dataset.reduce((s, it) => s + it.count, 0);
    const totalPoints = dataset.reduce((s, it) => s + it.points, 0);
    const totalTahfizh = dataset.reduce((s, it) => s + it.tahfizhCount, 0);
    const totalKesantrian = dataset.reduce((s, it) => s + it.kesantrianCount, 0);
    const totalAkademik = dataset.reduce((s, it) => s + it.akademikCount, 0);
    const totalPositive = dataset.reduce((s, it) => s + it.positiveCount, 0);
    const totalPositivePoints = dataset.reduce((s, it) => s + it.positivePoints, 0);

    let peak = dataset[0];
    for (const it of dataset) {
      if (chartMode === 'points') {
        if (it.points > (peak?.points || 0)) peak = it;
      } else {
        if (it.count > (peak?.count || 0)) peak = it;
      }
    }

    const maxDivCount = Math.max(totalTahfizh, totalKesantrian, totalAkademik);
    let dominantDiv = 'Seimbang';
    if (totalCases > 0 && maxDivCount > 0) {
      if (maxDivCount === totalTahfizh) {
        dominantDiv = `Tahfizh (${Math.round((totalTahfizh / totalCases) * 100)}%)`;
      } else if (maxDivCount === totalKesantrian) {
        dominantDiv = `Kesantrian (${Math.round((totalKesantrian / totalCases) * 100)}%)`;
      } else {
        dominantDiv = `Akademik (${Math.round((totalAkademik / totalCases) * 100)}%)`;
      }
    }

    return {
      totalCases,
      totalPoints,
      totalTahfizh,
      totalKesantrian,
      totalAkademik,
      totalPositive,
      totalPositivePoints,
      peak,
      dominantDiv,
    };
  }, [dataset, chartMode]);

  // Max value for scaling
  const maxValue = useMemo(() => {
    if (chartMode === 'cases') {
      const max = Math.max(...dataset.map((d) => d.count), 0);
      return Math.max(max, 4);
    }
    if (chartMode === 'points') {
      const max = Math.max(...dataset.map((d) => d.points), 0);
      return Math.max(max, 20);
    }
    if (chartMode === 'divisions') {
      const max = Math.max(
        ...dataset.flatMap((d) => [d.tahfizhCount, d.kesantrianCount, d.akademikCount]),
        0
      );
      return Math.max(max, 4);
    }
    // comparison mode
    const max = Math.max(
      ...dataset.flatMap((d) => [d.count, d.positiveCount]),
      0
    );
    return Math.max(max, 4);
  }, [dataset, chartMode]);

  // SVG coordinate computation
  const getX = (idx: number) => 45 + (idx / Math.max(1, dataset.length - 1)) * 590;
  const getY = (val: number) => 155 - (Math.min(val, maxValue) / maxValue) * 125;

  const pointsCases = useMemo(() => dataset.map((d, i) => ({ x: getX(i), y: getY(d.count), data: d })), [dataset, maxValue]);
  const pointsPoints = useMemo(() => dataset.map((d, i) => ({ x: getX(i), y: getY(d.points), data: d })), [dataset, maxValue]);

  const pointsTahfizh = useMemo(() => dataset.map((d, i) => ({ x: getX(i), y: getY(d.tahfizhCount), data: d })), [dataset, maxValue]);
  const pointsKesantrian = useMemo(() => dataset.map((d, i) => ({ x: getX(i), y: getY(d.kesantrianCount), data: d })), [dataset, maxValue]);
  const pointsAkademik = useMemo(() => dataset.map((d, i) => ({ x: getX(i), y: getY(d.akademikCount), data: d })), [dataset, maxValue]);

  const pointsViolations = useMemo(() => dataset.map((d, i) => ({ x: getX(i), y: getY(d.count), data: d })), [dataset, maxValue]);
  const pointsPositives = useMemo(() => dataset.map((d, i) => ({ x: getX(i), y: getY(d.positiveCount), data: d })), [dataset, maxValue]);

  // Determine current active index for tooltip
  const todayIndex = dataset.findIndex((d) => d.isToday);
  const defaultIndex = todayIndex !== -1 ? todayIndex : (summary.peak ? dataset.indexOf(summary.peak) : 0);
  const currentActiveIndex = activeIndex !== null ? activeIndex : defaultIndex;
  const activeItem = dataset[currentActiveIndex] || dataset[0];
  const activeX = getX(currentActiveIndex);
  const leftPercent = Math.max(16, Math.min(84, (activeX / 680) * 100));

  return (
    <div className="saas-card p-5 sm:p-6 transition-all duration-300">
      {/* 1. Header with Title & Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Tren Kedisiplinan & Pelanggaran</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-bold uppercase tracking-wide">
                  Data Riil
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {chartMode === 'cases' && 'Frekuensi jumlah kasus catatan kedisiplinan santri'}
                {chartMode === 'points' && 'Akumulasi bobot poin sanksi kedisiplinan'}
                {chartMode === 'divisions' && 'Komparasi catatan antar Divisi Tahfizh, Kesantrian & Akademik'}
                {chartMode === 'comparison' && 'Perbandingan pelanggaran disiplin vs amalan kebaikan & prestasi'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls: Mode Switcher & Timeframe Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Chart Mode Pills (Alih Fungsi) */}
          <div className="inline-flex items-center p-1 rounded-xl bg-slate-100/90 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/[0.08] text-xs font-semibold">
            <button
              type="button"
              onClick={() => setChartMode('cases')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                chartMode === 'cases'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Frekuensi Jumlah Kasus"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Kasus</span>
            </button>
            <button
              type="button"
              onClick={() => setChartMode('points')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                chartMode === 'points'
                  ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Bobot Poin Sanksi"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Poin</span>
            </button>
            <button
              type="button"
              onClick={() => setChartMode('divisions')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                chartMode === 'divisions'
                  ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Komparasi 3 Divisi"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>3 Divisi</span>
            </button>
            <button
              type="button"
              onClick={() => setChartMode('comparison')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                chartMode === 'comparison'
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Disiplin vs Prestasi"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Prestasi</span>
            </button>
          </div>

          {/* Timeframe pill selector */}
          <div className="inline-flex items-center p-1 rounded-xl bg-slate-100/90 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/[0.08] text-xs font-semibold">
            <button
              type="button"
              onClick={() => setChartTimeframe('week')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                chartTimeframe === 'week'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Minggu Ini
            </button>
            <button
              type="button"
              onClick={() => setChartTimeframe('month')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                chartTimeframe === 'month'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Bulan Ini
            </button>
            <button
              type="button"
              onClick={() => setChartTimeframe('semester')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                chartTimeframe === 'semester'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              6 Bulan
            </button>
          </div>
        </div>
      </div>

      {/* 2. Smart KPI Metric Summary Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 pb-2">
        <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Total Periode Ini
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-lg font-black text-slate-900 dark:text-white">{summary.totalCases}</span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Kasus</span>
            <span className="text-[11px] font-bold text-rose-500 dark:text-rose-400 ml-auto">
              +{summary.totalPoints} Pts
            </span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Puncak Kejadian
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5 truncate">
            <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 truncate">
              {summary.peak?.label || '-'}
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              ({chartMode === 'points' ? `${summary.peak?.points || 0} Pts` : `${summary.peak?.count || 0} Kasus`})
            </span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Divisi Terbanyak
          </span>
          <div className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200 mt-0.5 truncate">
            {summary.dominantDiv}
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Kebaikan & Prestasi
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
              {summary.totalPositive}
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Catatan</span>
            <span className="text-[11px] font-bold text-emerald-500 dark:text-emerald-400 ml-auto">
              -{summary.totalPositivePoints} Pts
            </span>
          </div>
        </div>
      </div>

      {/* 3. Multi-line Legends when in divisions or comparison mode */}
      {chartMode === 'divisions' && (
        <div className="flex flex-wrap items-center gap-4 text-xs font-bold pt-1 pb-1 px-1">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <span className="w-3 h-1 rounded-full bg-emerald-500 inline-block"></span>
            <span>Tahfizh: {summary.totalTahfizh} Kasus</span>
          </div>
          <div className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
            <span className="w-3 h-1 rounded-full bg-sky-500 inline-block"></span>
            <span>Kesantrian: {summary.totalKesantrian} Kasus</span>
          </div>
          <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
            <span className="w-3 h-1 rounded-full bg-purple-500 inline-block"></span>
            <span>Akademik: {summary.totalAkademik} Kasus</span>
          </div>
        </div>
      )}

      {chartMode === 'comparison' && (
        <div className="flex flex-wrap items-center gap-4 text-xs font-bold pt-1 pb-1 px-1">
          <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
            <span className="w-3 h-1 rounded-full bg-rose-500 inline-block"></span>
            <span>Pelanggaran Disiplin: {summary.totalCases} Kasus (+{summary.totalPoints} Poin)</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <span className="w-3 h-1 rounded-full bg-emerald-500 inline-block"></span>
            <span>Kebaikan & Prestasi: {summary.totalPositive} Catatan (-{summary.totalPositivePoints} Poin)</span>
          </div>
        </div>
      )}

      {/* 4. Glowing Neon Chart Graphic & Interactive Tooltip */}
      <div className="pt-4 pb-1">
        <div className="relative w-full h-48 sm:h-56">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 680 180" preserveAspectRatio="none">
            <defs>
              {/* Neon Purple Gradient */}
              <linearGradient id="neonPurpleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="50%" stopColor="#c084fc" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
              <linearGradient id="neonPurpleArea" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
                <stop offset="60%" stopColor="#6366f1" stopOpacity="0.10" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
              </linearGradient>

              {/* Neon Amber Gradient (Points Mode) */}
              <linearGradient id="neonAmberGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="50%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
              <linearGradient id="neonAmberArea" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
                <stop offset="60%" stopColor="#ef4444" stopOpacity="0.10" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
              </linearGradient>

              {/* Neon Emerald Gradient (Positives / Tahfizh) */}
              <linearGradient id="neonEmeraldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
              <linearGradient id="neonEmeraldArea" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>

              {/* Neon Sky Gradient (Kesantrian) */}
              <linearGradient id="neonSkyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0ea5e9" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>

              {/* Neon Violet Gradient (Akademik) */}
              <linearGradient id="neonVioletGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#7c3aed" />
              </linearGradient>

              {/* Neon Rose Gradient (Violations in comparison) */}
              <linearGradient id="neonRoseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f43f5e" />
                <stop offset="100%" stopColor="#e11d48" />
              </linearGradient>
              <linearGradient id="neonRoseArea" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
              </linearGradient>

              {/* Filter for Glow Effect */}
              <filter id="neonGlowEffect" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Horizontal Grid lines & Y-Axis Scale Values */}
            <g className="text-slate-200/50 dark:text-white/[0.04]">
              <line x1="40" y1="30" x2="640" y2="30" stroke="currentColor" strokeDasharray="4 4" />
              <text x="32" y="34" textAnchor="end" className="text-[10px] fill-slate-400 dark:fill-slate-500 font-bold">
                {maxValue}
              </text>

              <line x1="40" y1="72" x2="640" y2="72" stroke="currentColor" strokeDasharray="4 4" />
              <text x="32" y="76" textAnchor="end" className="text-[10px] fill-slate-400 dark:fill-slate-500 font-bold">
                {Math.round(maxValue * 0.66)}
              </text>

              <line x1="40" y1="114" x2="640" y2="114" stroke="currentColor" strokeDasharray="4 4" />
              <text x="32" y="118" textAnchor="end" className="text-[10px] fill-slate-400 dark:fill-slate-500 font-bold">
                {Math.round(maxValue * 0.33)}
              </text>

              <line x1="40" y1="155" x2="640" y2="155" stroke="currentColor" />
              <text x="32" y="159" textAnchor="end" className="text-[10px] fill-slate-400 dark:fill-slate-500 font-bold">
                0
              </text>
            </g>

            {/* Active Vertical Guideline */}
            <line
              x1={activeX}
              y1="30"
              x2={activeX}
              y2="155"
              stroke="#818cf8"
              strokeOpacity="0.45"
              strokeDasharray="3 3"
              strokeWidth="1.5"
            />

            {/* MODE 1: CASUS DISIPLIN */}
            {chartMode === 'cases' && (
              <>
                <path d={getAreaPath(pointsCases, 155)} fill="url(#neonPurpleArea)" />
                <path
                  d={getSplinePath(pointsCases)}
                  fill="none"
                  stroke="url(#neonPurpleGrad)"
                  strokeWidth="3.5"
                  filter="url(#neonGlowEffect)"
                  strokeLinecap="round"
                />
                {pointsCases.map((pt, i) => {
                  const isActive = i === currentActiveIndex;
                  return (
                    <circle
                      key={`pt-cases-${i}`}
                      cx={pt.x}
                      cy={pt.y}
                      r={isActive ? 6 : 4}
                      fill={isActive ? '#ffffff' : '#c084fc'}
                      stroke={isActive ? '#9333ea' : '#ffffff'}
                      strokeWidth={isActive ? 3 : 1.5}
                      filter={isActive ? 'url(#neonGlowEffect)' : undefined}
                      className="transition-all duration-200"
                    />
                  );
                })}
              </>
            )}

            {/* MODE 2: BOBOT POIN */}
            {chartMode === 'points' && (
              <>
                <path d={getAreaPath(pointsPoints, 155)} fill="url(#neonAmberArea)" />
                <path
                  d={getSplinePath(pointsPoints)}
                  fill="none"
                  stroke="url(#neonAmberGrad)"
                  strokeWidth="3.5"
                  filter="url(#neonGlowEffect)"
                  strokeLinecap="round"
                />
                {pointsPoints.map((pt, i) => {
                  const isActive = i === currentActiveIndex;
                  return (
                    <circle
                      key={`pt-points-${i}`}
                      cx={pt.x}
                      cy={pt.y}
                      r={isActive ? 6 : 4}
                      fill={isActive ? '#ffffff' : '#f59e0b'}
                      stroke={isActive ? '#d97706' : '#ffffff'}
                      strokeWidth={isActive ? 3 : 1.5}
                      filter={isActive ? 'url(#neonGlowEffect)' : undefined}
                      className="transition-all duration-200"
                    />
                  );
                })}
              </>
            )}

            {/* MODE 3: KOMPARASI 3 DIVISI */}
            {chartMode === 'divisions' && (
              <>
                {/* Tahfizh Line */}
                <path
                  d={getSplinePath(pointsTahfizh)}
                  fill="none"
                  stroke="url(#neonEmeraldGrad)"
                  strokeWidth="3"
                  filter="url(#neonGlowEffect)"
                  strokeLinecap="round"
                />
                {/* Kesantrian Line */}
                <path
                  d={getSplinePath(pointsKesantrian)}
                  fill="none"
                  stroke="url(#neonSkyGrad)"
                  strokeWidth="3"
                  filter="url(#neonGlowEffect)"
                  strokeLinecap="round"
                />
                {/* Akademik Line */}
                <path
                  d={getSplinePath(pointsAkademik)}
                  fill="none"
                  stroke="url(#neonVioletGrad)"
                  strokeWidth="3"
                  filter="url(#neonGlowEffect)"
                  strokeLinecap="round"
                />
                {/* Nodes for each */}
                {dataset.map((_, i) => {
                  const isActive = i === currentActiveIndex;
                  return (
                    <g key={`div-nodes-${i}`}>
                      <circle
                        cx={pointsTahfizh[i].x}
                        cy={pointsTahfizh[i].y}
                        r={isActive ? 5 : 3.5}
                        fill="#10b981"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                      <circle
                        cx={pointsKesantrian[i].x}
                        cy={pointsKesantrian[i].y}
                        r={isActive ? 5 : 3.5}
                        fill="#0ea5e9"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                      <circle
                        cx={pointsAkademik[i].x}
                        cy={pointsAkademik[i].y}
                        r={isActive ? 5 : 3.5}
                        fill="#a855f7"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    </g>
                  );
                })}
              </>
            )}

            {/* MODE 4: DISIPLIN VS PRESTASI */}
            {chartMode === 'comparison' && (
              <>
                <path d={getAreaPath(pointsViolations, 155)} fill="url(#neonRoseArea)" />
                <path
                  d={getSplinePath(pointsViolations)}
                  fill="none"
                  stroke="url(#neonRoseGrad)"
                  strokeWidth="3"
                  filter="url(#neonGlowEffect)"
                  strokeLinecap="round"
                />

                <path d={getAreaPath(pointsPositives, 155)} fill="url(#neonEmeraldArea)" />
                <path
                  d={getSplinePath(pointsPositives)}
                  fill="none"
                  stroke="url(#neonEmeraldGrad)"
                  strokeWidth="3"
                  filter="url(#neonGlowEffect)"
                  strokeLinecap="round"
                />

                {dataset.map((_, i) => {
                  const isActive = i === currentActiveIndex;
                  return (
                    <g key={`comp-nodes-${i}`}>
                      <circle
                        cx={pointsViolations[i].x}
                        cy={pointsViolations[i].y}
                        r={isActive ? 5.5 : 3.5}
                        fill="#ef4444"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                      <circle
                        cx={pointsPositives[i].x}
                        cy={pointsPositives[i].y}
                        r={isActive ? 5.5 : 3.5}
                        fill="#10b981"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    </g>
                  );
                })}
              </>
            )}

            {/* Wide transparent click/hover hitboxes for all devices */}
            {dataset.map((_, i) => {
              const colWidth = 590 / Math.max(1, dataset.length);
              const xStart = getX(i) - colWidth / 2;
              return (
                <rect
                  key={`hitbox-${i}`}
                  x={xStart}
                  y="0"
                  width={colWidth}
                  height="180"
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => setActiveIndex(i)}
                />
              );
            })}
          </svg>

          {/* Floating Interactive Tooltip Pill (Real Live Data) */}
          <div
            style={{ left: `${leftPercent}%` }}
            className="absolute -translate-x-1/2 top-0 sm:top-1 z-20 transition-all duration-200 pointer-events-auto"
          >
            <div className="px-3.5 py-2 rounded-2xl bg-slate-900/95 dark:bg-slate-900/95 text-white border border-slate-700/80 shadow-2xl backdrop-blur-md min-w-[210px] text-center">
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1 mb-1.5 text-[11px] font-bold text-slate-300">
                <span>{activeItem.fullLabel}</span>
                {activeItem.isToday && (
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-extrabold uppercase tracking-wide">
                    Hari Ini
                  </span>
                )}
              </div>

              {/* Mode 1: Cases */}
              {chartMode === 'cases' && (
                <div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm sm:text-base font-black text-purple-300">
                      {activeItem.count} Catatan Disiplin
                    </span>
                    <span className="text-[11px] font-semibold text-rose-300">
                      ({activeItem.points} Poin)
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-1 text-[10px] text-slate-300 font-semibold">
                    <span className="text-emerald-400">Tahfizh: {activeItem.tahfizhCount}</span>
                    <span>•</span>
                    <span className="text-sky-400">Kesantrian: {activeItem.kesantrianCount}</span>
                    <span>•</span>
                    <span className="text-purple-400">Akademik: {activeItem.akademikCount}</span>
                  </div>
                </div>
              )}

              {/* Mode 2: Points */}
              {chartMode === 'points' && (
                <div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm sm:text-base font-black text-amber-300">
                      {activeItem.points} Poin Sanksi
                    </span>
                    <span className="text-[11px] font-semibold text-slate-300">
                      ({activeItem.count} Kasus)
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-1 text-[10px] text-slate-300 font-semibold">
                    <span className="text-emerald-400">Tahfizh: {activeItem.tahfizhPoints} Pts</span>
                    <span>•</span>
                    <span className="text-sky-400">Kesantrian: {activeItem.kesantrianPoints} Pts</span>
                    <span>•</span>
                    <span className="text-purple-400">Akademik: {activeItem.akademikPoints} Pts</span>
                  </div>
                </div>
              )}

              {/* Mode 3: Divisions */}
              {chartMode === 'divisions' && (
                <div className="space-y-1 text-[11px] font-semibold text-left">
                  <div className="flex items-center justify-between text-emerald-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                      Tahfizh:
                    </span>
                    <span className="font-bold">{activeItem.tahfizhCount} kasus ({activeItem.tahfizhPoints} pts)</span>
                  </div>
                  <div className="flex items-center justify-between text-sky-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-sky-500 inline-block"></span>
                      Kesantrian:
                    </span>
                    <span className="font-bold">{activeItem.kesantrianCount} kasus ({activeItem.kesantrianPoints} pts)</span>
                  </div>
                  <div className="flex items-center justify-between text-purple-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-500 inline-block"></span>
                      Akademik:
                    </span>
                    <span className="font-bold">{activeItem.akademikCount} kasus ({activeItem.akademikPoints} pts)</span>
                  </div>
                </div>
              )}

              {/* Mode 4: Comparison */}
              {chartMode === 'comparison' && (
                <div className="space-y-1 text-[11px] font-semibold text-left">
                  <div className="flex items-center justify-between text-rose-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                      Pelanggaran:
                    </span>
                    <span className="font-bold">{activeItem.count} kasus (+{activeItem.points} pts)</span>
                  </div>
                  <div className="flex items-center justify-between text-emerald-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                      Kebaikan & Prestasi:
                    </span>
                    <span className="font-bold">{activeItem.positiveCount} amalan (-{activeItem.positivePoints} pts)</span>
                  </div>
                </div>
              )}

              {/* Fast Jump Link to Records Tab */}
              <button
                type="button"
                onClick={() => onSelectTab('records')}
                className="mt-2 w-full py-1 px-2 rounded-lg bg-white/10 hover:bg-white/20 text-indigo-300 hover:text-white text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>Buka Riwayat Kasus Lengkap</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Empty state notice if period has 0 records */}
          {summary.totalCases === 0 && summary.totalPositive === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="px-3.5 py-1.5 rounded-xl bg-slate-900/80 dark:bg-white/10 backdrop-blur-sm text-xs font-bold text-slate-300 flex items-center gap-2 shadow-lg">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Nihil catatan kedisiplinan pada periode ini. Santri tertib!</span>
              </div>
            </div>
          )}
        </div>

        {/* 5. Dynamic X-Axis with interactive selection */}
        <div className="flex items-center justify-between text-xs text-slate-400 font-bold px-4 pt-2">
          {dataset.map((d, i) => {
            const isSelected = i === currentActiveIndex;
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => setActiveIndex(i)}
                className={`flex flex-col items-center transition-all cursor-pointer ${
                  isSelected
                    ? 'text-indigo-600 dark:text-indigo-300 font-black scale-110'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{d.label}</span>
                {d.isToday && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-0.5"></span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface DashboardProps {
  currentUser: User | null;
  onOpenQuickRecord: () => void;
  onOpenQuickReward?: () => void;
  onSelectTab: (tab: string) => void;
  onSelectStudent: (studentId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  currentUser,
  onOpenQuickRecord,
  onOpenQuickReward,
  onSelectTab,
  onSelectStudent,
}) => {
  const isMuhafizh = currentUser?.role === 'teacher';
  const isGuru = currentUser?.role === 'guru';

  const [dashboardDivision, setDashboardDivision] = useState<'all' | 'tahfizh' | 'kesantrian' | 'akademik'>('all');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [teacherHalaqahs, setTeacherHalaqahs] = useState<Halaqah[]>([]);
  const [teacherStudents, setTeacherStudents] = useState<Student[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [guruStudentSearch, setGuruStudentSearch] = useState<string>('');
  const [guruClassFilter, setGuruClassFilter] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);

  // Calendar State for interactive widget
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [chartTimeframe, setChartTimeframe] = useState<'week' | 'month' | 'semester'>('week');

  // Interactive Calendar Helpers
  const currentMonthYear = calendarDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    // Convert so 0 is Monday, 6 is Sunday
    const startOffset = (firstDayIndex + 6) % 7;
    const days: Array<{ day: number | null; isToday: boolean; hasEvent?: boolean }> = [];
    
    for (let i = 0; i < startOffset; i++) {
      days.push({ day: null, isToday: false });
    }
    
    const today = new Date();
    for (let d = 1; d <= totalDays; d++) {
      const isToday =
        today.getDate() === d &&
        today.getMonth() === month &&
        today.getFullYear() === year;
      const hasEvent = d % 4 === 0;
      days.push({ day: d, isToday, hasEvent });
    }
    return days;
  }, [calendarDate]);

  const handlePrevMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
  };

  useEffect(() => {
    loadDashboardData();

    // Auto-refetch when data changes (e.g. deleted/created student, record, etc.)
    const handleDataChanged = () => {
      api.records.stats(dashboardDivision).then((s) => {
        setStats(s);
      }).catch(console.error);

      if (isMuhafizh) {
        api.halaqah.list().then(async (allHalaqahs) => {
          const myHalaqahs = allHalaqahs.filter(
            (h) => (currentUser?.teacherId && h.teacher_id === currentUser.teacherId) ||
                   (currentUser?.name && h.teacher_name?.toLowerCase().includes(currentUser.name.toLowerCase()))
          );
          setTeacherHalaqahs(myHalaqahs);
          if (myHalaqahs.length > 0) {
            const sList = await api.halaqah.getStudents(myHalaqahs[0].id);
            setTeacherStudents(sList);
          } else {
            setTeacherStudents([]);
          }
        }).catch(console.error);
      } else if (isGuru) {
        api.students.list().then((sList) => {
          setAllStudents(sList.filter((st) => st.status === 'active'));
        }).catch(console.error);
      }
    };

    window.addEventListener('app:data-changed', handleDataChanged);
    window.addEventListener('storage', handleDataChanged);
    window.addEventListener('focus', handleDataChanged);

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        handleDataChanged();
      }
    }, 8000);

    return () => {
      window.removeEventListener('app:data-changed', handleDataChanged);
      window.removeEventListener('storage', handleDataChanged);
      window.removeEventListener('focus', handleDataChanged);
      clearInterval(interval);
    };
  }, [currentUser, dashboardDivision, isMuhafizh, isGuru]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const s = await api.records.stats(dashboardDivision);
      setStats(s);

      if (isMuhafizh) {
        const allHalaqahs = await api.halaqah.list();
        const myHalaqahs = allHalaqahs.filter(
          (h) => (currentUser?.teacherId && h.teacher_id === currentUser.teacherId) ||
                 (currentUser?.name && h.teacher_name?.toLowerCase().includes(currentUser.name.toLowerCase()))
        );
        setTeacherHalaqahs(myHalaqahs);

        // Fetch students in my halaqah (strictly without fallback)
        if (myHalaqahs.length > 0) {
          const sList = await api.halaqah.getStudents(myHalaqahs[0].id);
          setTeacherStudents(sList);
        } else {
          setTeacherStudents([]);
        }
      } else if (isGuru) {
        const sList = await api.students.list();
        setAllStudents(sList.filter((st) => st.status === 'active'));
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentClick = (studentId: string) => {
    if (storageSync.getDeletedStudentIds().has(studentId)) {
      alert('Data santri ini sudah dihapus dari sistem.');
      return;
    }
    onSelectStudent(studentId);
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-500">Memuat data dashboard...</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: DASHBOARD GURU PENGAJAR
  // ==========================================
  if (isGuru) {
    const filteredGuruStudents = allStudents.filter((st) => {
      const matchSearch =
        guruStudentSearch === '' ||
        st.name.toLowerCase().includes(guruStudentSearch.toLowerCase()) ||
        st.student_number.toLowerCase().includes(guruStudentSearch.toLowerCase());
      const matchClass = guruClassFilter === 'all' || st.class === guruClassFilter;
      return matchSearch && matchClass;
    });

    const uniqueClasses = sortClasses(Array.from(new Set(allStudents.map((s) => s.class))));

    return (
      <div className="space-y-6 animate-scale-in">
        {/* Banner Sapaan Guru Pengajar */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 text-white p-6 sm:p-8 shadow-xl border border-white/[0.08]">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-indigo-200 mb-3 border border-white/15">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              <span>Portal Guru Pengajar IMBS</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Assalamu'alaikum, {currentUser?.name || 'Ustadz'} 👋
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-2xl font-light">
              Pusat monitoring kedisiplinan dan apresiasi santri IMBS. Catat pelanggaran tata tertib dan apresiasi kebaikan santri di kelas maupun lingkungan madrasah.
            </p>

            {/* ACTION BUTTONS */}
            <div className="mt-5 sm:mt-6 flex flex-col sm:flex-row gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={onOpenQuickRecord}
                className="w-full sm:w-auto px-5 sm:px-6 py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white text-xs sm:text-sm font-black rounded-2xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 transform active:scale-95 group cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-purple-200 group-hover:rotate-90 transition-transform duration-300 shrink-0" />
                <span>+ CATAT PELANGGARAN SANTRI</span>
              </button>

              {onOpenQuickReward && (
                <button
                  type="button"
                  onClick={onOpenQuickReward}
                  className="w-full sm:w-auto px-5 sm:px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-black rounded-2xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 transform active:scale-95 group cursor-pointer"
                >
                  <Award className="w-4 h-4 text-emerald-200 group-hover:scale-110 transition-transform duration-200 shrink-0" />
                  <span>★ CATAT KEBAIKAN SANTRI</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 4 SaaS Stat Cards for Guru */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="saas-card-glow p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Santri Aktif</span>
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {allStudents.length}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Santri terdaftar aktif</p>
          </div>

          <div className="saas-card-glow p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Poin Pelanggaran</span>
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-inner">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400">
              {stats?.summary?.totalPoints || 0}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">{stats?.summary?.totalRecords || 0} kasus tercatat</p>
          </div>

          <div className="saas-card-glow p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Apresiasi Kebaikan</span>
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                <Award className="w-5 h-5" />
              </div>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {stats?.summary?.totalPointsDeducted || 0} pts
            </p>
            <p className="text-[11px] text-slate-400 mt-1">{stats?.summary?.totalPositiveRecords || 0} reward dicatat</p>
          </div>

          <div className="saas-card-glow p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Perlu Pembinaan</span>
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
              {stats?.studentsNeedingAttention?.length || 0}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Santri butuh pendampingan</p>
          </div>
        </div>

        {/* Monitoring Daftar Santri Sekolah */}
        <div className="saas-card p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/[0.08]">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>Monitoring Kedisiplinan Seluruh Santri</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Cari santri berdasarkan nama, NIS, atau kelas untuk melihat rekapitulasi poin kedisiplinan.
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari santri / NIS..."
                  value={guruStudentSearch}
                  onChange={(e) => setGuruStudentSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.04] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <select
                value={guruClassFilter}
                onChange={(e) => setGuruClassFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.04] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Semua Kelas</option>
                {uniqueClasses.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls.toLowerCase().startsWith('kelas') ? cls : `Kelas ${cls}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* List Santri */}
          <div className="mt-4 divide-y divide-slate-100 dark:divide-white/[0.06] max-h-[500px] overflow-y-auto">
            {filteredGuruStudents.slice(0, 30).map((st) => (
              <div
                key={st.id}
                onClick={() => handleStudentClick(st.id)}
                className="py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/[0.04] px-3 rounded-2xl cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                    {st.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{st.name}</p>
                    <p className="text-xs text-slate-400">NIS: {st.student_number} • Kelas {st.class}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  {(st.total_deductions || 0) > 0 && (
                    <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/80 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                      -{st.total_deductions} pts
                    </span>
                  )}
                  <span className="text-xs font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-1 rounded-xl border border-rose-200 dark:border-rose-900/50">
                    {st.total_points || 0} Poin
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            ))}

            {filteredGuruStudents.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-xs sm:text-sm">
                Tidak ada data santri yang cocok dengan pencarian.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: DASHBOARD MUHAFIZH
  // ==========================================
  if (isMuhafizh) {
    const halaqahPrimary = teacherHalaqahs[0];
    const topStudentsInHalaqah = [...teacherStudents].sort(
      (a, b) => (b.total_points || 0) - (a.total_points || 0)
    );

    return (
      <div className="space-y-6 animate-scale-in">
        {/* Sapaan Islami & Kartu Utama Muhafizh */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 text-white p-6 sm:p-8 shadow-xl border border-white/[0.08]">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-indigo-200 mb-3 border border-white/15">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              <span>Portal Muhafizh & Pembina Santri</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Assalamu'alaikum, {currentUser?.name || 'Ustadz'} 👋
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-xl font-light">
              Catat dan pantau kedisiplinan santri baik di halaqah Al-Qur'an maupun di lingkungan asrama dengan sistem poin terpadu.
            </p>

            {/* ACTION BUTTONS */}
            <div className="mt-5 sm:mt-6 flex flex-col sm:flex-row gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={onOpenQuickRecord}
                className="w-full sm:w-auto px-5 sm:px-6 py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white text-xs sm:text-sm font-black rounded-2xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 transform active:scale-95 group cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-purple-200 group-hover:rotate-90 transition-transform duration-300 shrink-0" />
                <span>+ CATAT PELANGGARAN SANTRI</span>
              </button>

              {onOpenQuickReward && (
                <button
                  type="button"
                  onClick={onOpenQuickReward}
                  className="w-full sm:w-auto px-5 sm:px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-black rounded-2xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 transform active:scale-95 group cursor-pointer"
                >
                  <Award className="w-4 h-4 text-emerald-200 group-hover:scale-110 transition-transform duration-200 shrink-0" />
                  <span>★ CATAT KEBAIKAN SANTRI</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Status Halaqah Aktif */}
        {halaqahPrimary ? (
          <div className="saas-card p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/[0.08]">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Halaqah yang Diampu
                </span>
                <h2 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                  {halaqahPrimary.name}
                </h2>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {halaqahPrimary.schedule || 'Jadwal Reguler'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {halaqahPrimary.location || 'Masjid Utama'}
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    {teacherStudents.length} Santri Bimbingan
                  </span>
                </div>
              </div>
            </div>

            {/* List Santri di Halaqah */}
            <div className="mt-4 divide-y divide-slate-100 dark:divide-white/[0.06]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Daftar Santri & Akumulasi Poin
              </h3>
              {topStudentsInHalaqah.slice(0, 8).map((st) => (
                <div
                  key={st.id}
                  onClick={() => handleStudentClick(st.id)}
                  className="py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/[0.04] px-2 rounded-2xl cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                      {st.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{st.name}</p>
                      <p className="text-xs text-slate-400">NIS: {st.student_number} • Kelas {st.class}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(st.total_deductions || 0) > 0 && (
                      <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/80 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                        -{st.total_deductions} pts
                      </span>
                    )}
                    <span className="text-xs font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-1 rounded-xl border border-rose-200 dark:border-rose-900/50">
                      {st.total_points || 0} Poin
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              ))}

              {topStudentsInHalaqah.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-sm">
                  Belum ada data santri pada halaqah ini.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="saas-card p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Belum Ada Halaqah yang Diampu
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Akun Anda terdaftar sebagai Muhafizh Halaqah, namun saat ini belum ada halaqah bimbingan aktif yang ditugaskan kepada Anda. Silakan hubungi Koordinator Tahfizh atau Admin untuk pengaturan penugasan halaqah.
            </p>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW: DASHBOARD MUDIR / KOORDINATOR / KEPALA KESANTRIAN / ADMIN
  // ==========================================
  return (
    <div className="space-y-6 animate-scale-in pb-10">
      {/* 1. Header Hero with Greeting & Action Buttons */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0d1326] via-[#111936] to-[#19153a] p-6 sm:p-8 text-white shadow-2xl border border-white/[0.08]">
        {/* Soft Background Mesh Light */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-indigo-200 border border-white/15">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              <span>Pusat Kendali Kedisiplinan Santri IMBS</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
              Assalamu'alaikum, {currentUser?.name || 'Admin'}! 👋
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-light max-w-2xl leading-relaxed">
              Monitoring terpadu akumulasi kedisiplinan dan pengurangan poin prestasi santri di Divisi Tahfizh dan Divisi Kesantrian secara real-time.
            </p>

            {/* Division Switcher Glass Tabs */}
            <div className="pt-2 w-full overflow-x-auto no-scrollbar -mx-1 px-1">
              <div className="inline-flex items-center p-1 bg-black/30 backdrop-blur-md border border-white/10 rounded-2xl gap-1 min-w-max">
                <button
                  onClick={() => setDashboardDivision('all')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    dashboardDivision === 'all'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Terpadu</span>
                </button>
                <button
                  onClick={() => setDashboardDivision('tahfizh')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    dashboardDivision === 'tahfizh'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30'
                      : 'text-slate-300 hover:text-emerald-300 hover:bg-white/5'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Tahfizh</span>
                </button>
                <button
                  onClick={() => setDashboardDivision('kesantrian')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    dashboardDivision === 'kesantrian'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-300 hover:text-blue-300 hover:bg-white/5'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Kesantrian</span>
                </button>
                <button
                  onClick={() => setDashboardDivision('akademik')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    dashboardDivision === 'akademik'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                      : 'text-slate-300 hover:text-purple-300 hover:bg-white/5'
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Akademik</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 shrink-0 w-full sm:w-auto">
            <button
              onClick={onOpenQuickRecord}
              className="w-full sm:w-auto px-5 py-2.5 sm:py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white text-xs sm:text-sm font-extrabold rounded-2xl shadow-xl shadow-indigo-600/30 border border-white/20 transition-all flex items-center justify-center gap-2 transform active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
            >
              <PlusCircle className="w-4 h-4 text-purple-200 shrink-0" />
              <span>+ Catat Pelanggaran</span>
            </button>

            {onOpenQuickReward && (
              <button
                onClick={onOpenQuickReward}
                className="w-full sm:w-auto px-5 py-2.5 sm:py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-extrabold rounded-2xl shadow-xl shadow-emerald-600/30 border border-emerald-400/20 transition-all flex items-center justify-center gap-2 transform active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Award className="w-4 h-4 text-emerald-200 shrink-0" />
                <span>★ Catat Kebaikan</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Top Metric Cards (6 SaaS Cards matching Reference Image 2) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-4">
        {/* Total Santri */}
        <div className="saas-card-glow p-3.5 sm:p-5">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[10px] sm:text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider truncate">
              Total Santri
            </span>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-purple-100/90 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 flex items-center justify-center ring-1 ring-purple-400/40 shadow-xs shrink-0">
              <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="mt-2 text-xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {stats?.summary.totalStudents || 0}
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-[10px] sm:text-[11px] text-emerald-700 dark:text-emerald-400 font-extrabold truncate">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_#10b981] shrink-0" />
            <span className="truncate">Santri aktif pondok</span>
          </div>
        </div>

        {/* Poin Netto Terpadu */}
        <div className="saas-card-glow p-3.5 sm:p-5">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[10px] sm:text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider truncate">
              Poin Netto
            </span>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-rose-100/90 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 flex items-center justify-center ring-1 ring-rose-400/40 shadow-xs shrink-0">
              <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="mt-2 text-xl sm:text-3xl font-black text-rose-600 dark:text-rose-400">
            {stats?.summary.netTotalPoints !== undefined ? stats.summary.netTotalPoints : (stats?.summary.totalPoints || 0)}
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-300 font-bold truncate">
            <span>{stats?.summary.totalRecords || 0} kasus aktif</span>
          </div>
        </div>

        {/* Poin Dikurangi (Reward) */}
        <div className="saas-card-glow p-3.5 sm:p-5">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[10px] sm:text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider truncate">
              Poin Dikurangi
            </span>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-emerald-100/90 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center ring-1 ring-emerald-400/40 shadow-xs shrink-0">
              <Award className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="mt-2 text-xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
            -{stats?.summary.totalPointsDeducted || 0}
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-[10px] sm:text-[11px] text-emerald-700 dark:text-emerald-400 font-extrabold truncate">
            <span>{stats?.summary.totalPositiveRecords || 0} kebaikan</span>
          </div>
        </div>

        {/* Divisi Tahfizh */}
        <div className="saas-card-glow p-3.5 sm:p-5">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[10px] sm:text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider truncate">
              Tahfizh
            </span>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-cyan-100/90 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 flex items-center justify-center ring-1 ring-cyan-400/40 shadow-xs shrink-0">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="mt-2 text-xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {stats?.summary.tahfizhTotalPoints || 0}
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-300 font-semibold truncate">
            <span>Ded: -{stats?.summary.tahfizhDeductedPoints || 0} • {stats?.summary.tahfizhRecordsCount || 0} kjdn</span>
          </div>
        </div>

        {/* Divisi Kesantrian */}
        <div className="saas-card-glow p-3.5 sm:p-5">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[10px] sm:text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider truncate">
              Kesantrian
            </span>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-amber-100/90 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 flex items-center justify-center ring-1 ring-amber-400/40 shadow-xs shrink-0">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="mt-2 text-xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {stats?.summary.kesantrianTotalPoints || 0}
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-300 font-semibold truncate">
            <span>Ded: -{stats?.summary.kesantrianDeductedPoints || 0} • {stats?.summary.kesantrianRecordsCount || 0} kjdn</span>
          </div>
        </div>

        {/* Divisi Akademik */}
        <div className="saas-card-glow p-3.5 sm:p-5">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[10px] sm:text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider truncate">
              Akademik
            </span>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-violet-100/90 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 flex items-center justify-center ring-1 ring-violet-400/40 shadow-xs shrink-0">
              <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="mt-2 text-xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {stats?.summary.akademikTotalPoints || 0}
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-300 font-semibold truncate">
            <span>Ded: -{stats?.summary.akademikDeductedPoints || 0} • {stats?.summary.akademikRecordsCount || 0} kjdn</span>
          </div>
        </div>
      </div>

      {/* 3. Monitoring 4 Pilar Utama (Continue Learning Style Cards) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Monitoring Program & Divisi IMBS</span>
          </h2>
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Pembaruan Real-Time</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Tahfizh Al-Qur'an */}
          <div
            onClick={() => onSelectTab('halaqah')}
            className="saas-card p-4 sm:p-5 relative overflow-hidden group cursor-pointer hover:-translate-y-1 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Halaqah
              </span>
            </div>
            <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              Halaqah Al-Qur'an
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Kedisiplinan & setoran harian santri
            </p>
            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Tingkat Ketertiban</span>
                <span className="font-bold text-slate-900 dark:text-white">94%</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full w-[94%]" />
              </div>
            </div>
          </div>

          {/* Card 2: Kedisiplinan Asrama */}
          <div
            onClick={() => onSelectTab('records_kesantrian')}
            className="saas-card p-4 sm:p-5 relative overflow-hidden group cursor-pointer hover:-translate-y-1 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
                <Building2 className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Asrama
              </span>
            </div>
            <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              Kedisiplinan Asrama
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Shalat berjamaah, jam malam & adab
            </p>
            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Tingkat Kepatuhan</span>
                <span className="font-bold text-slate-900 dark:text-white">88%</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 rounded-full w-[88%]" />
              </div>
            </div>
          </div>

          {/* Card 3: Apresiasi & Kebaikan */}
          <div
            onClick={() => onSelectTab('rewards_tahfizh')}
            className="saas-card p-4 sm:p-5 relative overflow-hidden group cursor-pointer hover:-translate-y-1 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20">
                <Award className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                Reward
              </span>
            </div>
            <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
              Apresiasi & Prestasi
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Reward kebaikan pengurang poin
            </p>
            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Santri Berprestasi</span>
                <span className="font-bold text-slate-900 dark:text-white">92%</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full w-[92%]" />
              </div>
            </div>
          </div>

          {/* Card 4: Pemantauan Khusus (Atensi) */}
          <div
            onClick={() => onSelectTab('students')}
            className="saas-card p-4 sm:p-5 relative overflow-hidden group cursor-pointer hover:-translate-y-1 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                Atensi
              </span>
            </div>
            <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
              Pemantauan Khusus
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Santri butuh pendampingan sanksi (SP)
            </p>
            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Status Atensi</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {stats?.studentsNeedingAttention?.length || 0} Santri
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full"
                  style={{ width: `${Math.min(((stats?.studentsNeedingAttention?.length || 0) / 10) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Main Analytics Layout (2/3 Left Charts & Tables + 1/3 Right SaaS Widgets) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Card A: Glowing Dynamic Multi-mode Neon Trend Chart */}
          <DisciplineTrendChart
            stats={stats}
            chartTimeframe={chartTimeframe}
            setChartTimeframe={setChartTimeframe}
            onSelectTab={onSelectTab}
          />

          {/* Card B: Top 10 Santri Poin Tertinggi Table */}
          <div className="saas-card overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-white/[0.08] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 shrink-0">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-lg font-black text-slate-900 dark:text-white">
                    10 Santri Poin Tertinggi
                  </h2>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                    Akumulasi terpadu Divisi Tahfizh, Kesantrian & Akademik
                  </p>
                </div>
              </div>
              <button
                onClick={() => onSelectTab('students')}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-white/[0.05] transition-colors"
              >
                <span>Semua Santri</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile View */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-white/[0.06]">
              {(stats?.topStudents || []).map((s, idx) => (
                <div
                  key={s.id}
                  onClick={() => handleStudentClick(s.id)}
                  className="p-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{s.name}</p>
                        <p className="text-[11px] text-slate-400">NIS: {s.student_number} • Kelas {s.class}</p>
                      </div>
                    </div>
                    <span className="shrink-0 px-2.5 py-1 rounded-xl text-xs font-black bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
                      {s.total_points} Poin
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-50 dark:border-white/[0.04]">
                    <span className="text-slate-500 dark:text-slate-300 truncate">{s.halaqah_name || 'Tanpa Halaqah'}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-bold">
                        T: {s.tahfizh_points || 0}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 font-bold">
                        K: {s.kesantrian_points || 0}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 font-bold">
                        A: {s.akademik_points || 0}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {(!stats?.topStudents || stats.topStudents.length === 0) && (
                <div className="p-6 text-center text-slate-400 text-xs">
                  Belum ada santri dengan catatan poin pelanggaran.
                </div>
              )}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-100/90 dark:bg-white/[0.06] text-slate-800 dark:text-slate-200 font-black uppercase text-[11px] border-b-2 border-slate-200/90 dark:border-white/[0.1]">
                  <tr>
                    <th className="px-4 py-3 text-center w-12">#</th>
                    <th className="px-4 py-3">Nama Santri</th>
                    <th className="px-4 py-3">Kelas</th>
                    <th className="px-4 py-3">Halaqah</th>
                    <th className="px-4 py-3 text-center">Rincian Divisi</th>
                    <th className="px-4 py-3 text-center">Total Poin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                  {(stats?.topStudents || []).map((s, idx) => (
                    <tr
                      key={s.id}
                      onClick={() => handleStudentClick(s.id)}
                      className="hover:bg-indigo-50/50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-3 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                            {s.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {s.name}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono">NIS: {s.student_number}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">{s.class}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.halaqah_name || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center gap-1.5 text-[11px]">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-bold">
                            T: {s.tahfizh_points || 0}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 font-bold">
                            K: {s.kesantrian_points || 0}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 font-bold">
                            A: {s.akademik_points || 0}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block px-3 py-1 rounded-xl text-xs font-black bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 shadow-xs">
                          {s.total_points} Poin
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!stats?.topStudents || stats.topStudents.length === 0) && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                        Belum ada santri dengan catatan poin pelanggaran.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col: Sidebar Widgets matching LearnZimTPS Reference) */}
        <div className="space-y-5">
          {/* Widget 1: Interactive Mini Calendar */}
          <div className="saas-card p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white capitalize">
                  {currentMonthYear}
                </h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Day of Week Headers */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 py-2">
              <span>Sn</span>
              <span>Sl</span>
              <span>Rb</span>
              <span>Km</span>
              <span>Jm</span>
              <span>Sb</span>
              <span>Ah</span>
            </div>

            {/* Calendar Dates Grid */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {calendarDays.map((item, idx) => {
                if (!item.day) {
                  return <div key={`empty-${idx}`} className="h-8" />;
                }

                return (
                  <div
                    key={`day-${item.day}`}
                    className={`h-8 flex flex-col items-center justify-center rounded-xl transition-all relative ${
                      item.isToday
                        ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-black shadow-md shadow-purple-500/30'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                    }`}
                  >
                    <span>{item.day}</span>
                    {item.hasEvent && !item.isToday && (
                      <span className="w-1 h-1 rounded-full bg-indigo-500 absolute bottom-1" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Widget 2: Indeks Kedisiplinan Radial Gauge (Daily Goal Style in Reference) */}
          <div className="saas-card p-5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/[0.08]">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Indeks Kedisiplinan
              </span>
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                Zona Aman Pondok
              </span>
            </div>

            <div className="pt-4 flex items-center gap-4">
              {/* Circular Gauge Ring */}
              <div className="relative w-20 h-20 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  {/* Background Circle */}
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    className="text-slate-100 dark:text-white/[0.08]"
                    strokeWidth="3.5"
                  />
                  {/* Progress Arc */}
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="url(#gaugeGradient)"
                    strokeWidth="3.5"
                    strokeDasharray="92, 100"
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-base font-black text-slate-900 dark:text-white">92%</span>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Kedisiplinan Prima!</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Sebagian besar santri berada di zona aman tanpa sanksi pelanggaran berat.
                </p>
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-indigo-600 dark:text-indigo-300 font-bold">
                  <Clock className="w-3 h-3" />
                  <span>Periode Aktif Semester Ganjil</span>
                </div>
              </div>
            </div>
          </div>

          {/* Widget 3: Kategori Pelanggaran (Donut & Distribution Bars) */}
          <div className="saas-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/[0.08]">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Kategori Pelanggaran
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Distribusi</span>
            </div>

            <div className="space-y-3">
              {(stats?.byCategory || []).slice(0, 5).map((c) => {
                const maxCount = Math.max(...((stats?.byCategory || []).map((x) => x.count) || [1]), 1);
                const percentage = Math.round((c.count / maxCount) * 100);
                const isKesantrian = c.division === 'kesantrian';
                const isAkademik = c.division === 'akademik';

                return (
                  <div key={c.category + (c.division || '')} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <span className="truncate max-w-[140px]">{c.category}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                            isAkademik
                              ? 'bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300'
                              : isKesantrian
                              ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300'
                              : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          {isAkademik ? 'Akademik' : isKesantrian ? 'Kesantrian' : 'Tahfizh'}
                        </span>
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">
                        <strong className="text-slate-900 dark:text-white">{c.count}</strong>x ({c.points} Poin)
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isAkademik
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-500'
                            : isKesantrian
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-500'
                            : 'bg-gradient-to-r from-teal-600 to-emerald-400'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {(!stats?.byCategory || stats.byCategory.length === 0) && (
                <p className="text-xs text-slate-400 text-center py-4">Belum ada data kategori pelanggaran</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Bottom Row: Inspiring Hadith & Quick Assistant / Portal Card (Matching Bottom Cards in Reference) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        {/* Wisdom / Hadith Card */}
        <div className="md:col-span-2 saas-card p-5 sm:p-6 bg-gradient-to-br from-indigo-950/30 via-slate-900/30 to-purple-950/30 border border-indigo-500/20 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Star className="w-4 h-4 fill-indigo-500/40" />
              <span className="text-xs font-black uppercase tracking-wider">Mutiara Hadits Tahfizh</span>
            </div>
            <Quote className="w-5 h-5 text-indigo-400/30" />
          </div>

          <div className="space-y-2">
            <p className="font-arabic text-xl sm:text-2xl text-slate-900 dark:text-indigo-200 text-right leading-loose">
              خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ
            </p>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 italic font-medium leading-relaxed">
              "Sebaik-baik kalian adalah orang yang mempelajari Al-Qur'an dan mengajarkannya."
            </p>
            <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
              — HR. Al-Bukhari No. 5027
            </p>
          </div>
        </div>

        {/* Quick Portal Wali & Bantuan Card (AI Assistant / Tutor style) */}
        <div className="saas-card p-5 sm:p-6 bg-gradient-to-br from-purple-950/20 to-indigo-950/20 border border-purple-500/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                <Bot className="w-5 h-5 text-purple-500" />
                <span className="text-xs font-black uppercase tracking-wider">Portal Wali Santri</span>
              </div>
              <span className="px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-300 text-[9px] font-bold">
                Online
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Pengecekan Poin Wali</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Wali santri dapat memeriksa akumulasi kedisiplinan dan apresiasi ananda secara langsung menggunakan Nomor Induk Santri (NIS).
            </p>
          </div>

          <div className="pt-4">
            <button
              onClick={() => onSelectTab('parent_portal')}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-md shadow-purple-600/25 transition-all flex items-center justify-center gap-2 text-xs"
            >
              <span>Buka Portal Wali Santri</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
