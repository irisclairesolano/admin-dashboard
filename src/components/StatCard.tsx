import React from 'react';

interface StatCardProps {
  title: string;
  value: number | string;
  Icon?: React.ComponentType<{ className?: string }>;
  iconClass?: string;
  iconColor?: string;      // e.g. 'text-primary-dark'
  bg?: string;             // e.g. 'from-accent-sky to-accent-skyDeep/40'
  className?: string;
  onClick?: () => void;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;     // e.g. '+12%' or '-3'
  trendLabel?: string;     // e.g. 'vs last month'
}

function getDarkIconStyles(iconColorStr: string, bgStr: string) {
  const combined = `${iconColorStr} ${bgStr}`.toLowerCase();
  if (combined.includes('emerald') || combined.includes('green')) {
    return {
      container: 'dark:from-emerald-950/70 dark:to-emerald-900/40 dark:border dark:border-emerald-500/30 dark:shadow-none',
      icon: 'dark:text-emerald-400',
    };
  }
  if (combined.includes('amber') || combined.includes('yellow') || combined.includes('orange')) {
    return {
      container: 'dark:from-amber-950/70 dark:to-amber-900/40 dark:border dark:border-amber-500/30 dark:shadow-none',
      icon: 'dark:text-amber-400',
    };
  }
  if (combined.includes('rose') || combined.includes('red')) {
    return {
      container: 'dark:from-rose-950/70 dark:to-rose-900/40 dark:border dark:border-rose-500/30 dark:shadow-none',
      icon: 'dark:text-rose-400',
    };
  }
  if (combined.includes('indigo') || combined.includes('purple') || combined.includes('violet')) {
    return {
      container: 'dark:from-indigo-950/70 dark:to-indigo-900/40 dark:border dark:border-indigo-500/30 dark:shadow-none',
      icon: 'dark:text-indigo-400',
    };
  }
  if (combined.includes('teal')) {
    return {
      container: 'dark:from-teal-950/70 dark:to-teal-900/40 dark:border dark:border-teal-500/30 dark:shadow-none',
      icon: 'dark:text-teal-400',
    };
  }
  if (combined.includes('sky') || combined.includes('blue') || combined.includes('primary')) {
    return {
      container: 'dark:from-sky-950/70 dark:to-blue-900/40 dark:border dark:border-sky-500/30 dark:shadow-none',
      icon: 'dark:text-sky-400',
    };
  }
  return {
    container: 'dark:from-slate-800 dark:to-slate-800/80 dark:border dark:border-slate-700/60 dark:shadow-none',
    icon: 'dark:text-slate-300',
  };
}

export default function StatCard({
  title,
  value,
  Icon,
  iconClass,
  iconColor = 'text-primary',
  bg = 'from-primary-soft to-primary-soft/50',
  className = '',
  onClick,
  trend,
  trendValue,
  trendLabel,
}: StatCardProps) {
  const trendColor =
    trend === 'up' ? 'text-status-success' :
    trend === 'down' ? 'text-status-error' :
    'text-ink-muted dark:text-slate-400';
  const trendIcon =
    trend === 'up' ? 'lni lni-arrow-up' :
    trend === 'down' ? 'lni lni-arrow-down' :
    null;

  const darkStyles = getDarkIconStyles(iconColor, bg);

  return (
    <div
      className={`bg-white/90 dark:bg-slate-900/80 backdrop-blur-md rounded-xl p-3.5 sm:p-4 border border-ink-faint/30 dark:border-slate-800 shadow-xs transition-all ${
        onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 dark:hover:bg-slate-850 dark:hover:border-slate-700' : ''
      } ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
      aria-label={onClick ? `${title}: ${value}` : undefined}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-body font-semibold text-ink-muted dark:text-slate-400 uppercase tracking-wider mb-0.5">{title}</p>
          <p className="text-xl sm:text-2xl font-display font-bold text-ink dark:text-slate-100">{value}</p>
          {trendValue && (
            <div className={`flex items-center gap-1 mt-1 text-xs font-body font-semibold ${trendColor}`}>
              {trendIcon && <i className={`${trendIcon} text-[10px]`} />}
              <span>{trendValue}</span>
              {trendLabel && <span className="text-ink-muted dark:text-slate-400 font-normal">{trendLabel}</span>}
            </div>
          )}
        </div>
        {(Icon || iconClass) && (
          <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br ${bg} ${darkStyles.container} flex items-center justify-center shadow-inner flex-shrink-0`}>
            {Icon
              ? <Icon className={`w-4 h-4 ${iconColor} ${darkStyles.icon}`} />
              : <i className={`${iconClass} ${iconColor} ${darkStyles.icon} text-base`} />}
          </div>
        )}
      </div>
    </div>
  );
}
