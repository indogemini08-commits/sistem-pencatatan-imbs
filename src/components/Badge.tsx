import React from 'react';

interface BadgeProps {
  statusName: string;
  badgeColor?: string;
  points?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<BadgeProps> = ({
  statusName,
  badgeColor = 'blue',
  points,
  size = 'md',
}) => {
  const color = badgeColor.toLowerCase();

  let colorClasses = 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-white/[0.08] dark:text-slate-200 dark:border-white/20';

  if (color.includes('emerald') || color.includes('green') || statusName === 'AMAN') {
    colorClasses = 'bg-emerald-100 text-emerald-900 border-emerald-300 ring-1 ring-emerald-500/20 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-600/70';
  } else if (color.includes('amber') || color.includes('yellow') || statusName.includes('PEMBINAAN')) {
    colorClasses = 'bg-amber-100 text-amber-900 border-amber-300 ring-1 ring-amber-500/20 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-600/70';
  } else if (color.includes('orange') || statusName.includes('KHUSUS')) {
    colorClasses = 'bg-orange-100 text-orange-900 border-orange-300 ring-1 ring-orange-500/20 dark:bg-orange-950/80 dark:text-orange-200 dark:border-orange-600/70';
  } else if (color.includes('rose') || statusName.includes('PERINGATAN')) {
    colorClasses = 'bg-rose-100 text-rose-900 border-rose-300 ring-1 ring-rose-500/20 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-600/70';
  } else if (color.includes('red') || statusName.includes('TINDAKAN')) {
    colorClasses = 'bg-red-100 text-red-950 border-red-300 ring-1 ring-red-500/30 dark:bg-red-950/90 dark:text-red-200 dark:border-red-600/80 animate-pulse';
  } else if (color.includes('blue')) {
    colorClasses = 'bg-blue-100 text-blue-900 border-blue-300 ring-1 ring-blue-500/20 dark:bg-blue-950/80 dark:text-blue-200 dark:border-blue-600/70';
  }

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-0.5 font-bold',
    md: 'text-xs px-3 py-1 font-black tracking-wide',
    lg: 'text-sm px-4 py-1.5 font-black tracking-wide',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border shadow-sm ${sizeClasses} ${colorClasses}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
      <span>{statusName}</span>
      {points !== undefined && (
        <span className="ml-0.5 rounded-full bg-black/5 px-1.5 py-0.2 text-[10px] font-bold">
          {points} Poin
        </span>
      )}
    </span>
  );
};
