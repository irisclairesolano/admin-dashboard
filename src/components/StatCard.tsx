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
    'text-ink-muted';
  const trendIcon =
    trend === 'up' ? 'lni lni-arrow-up' :
    trend === 'down' ? 'lni lni-arrow-down' :
    null;

  return (
    <div
      className={`bg-white/90 backdrop-blur-md rounded-xl p-3.5 sm:p-4 border border-ink-faint/30 shadow-xs transition-all ${
        onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''
      } ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
      aria-label={onClick ? `${title}: ${value}` : undefined}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-body font-semibold text-ink-muted uppercase tracking-wider mb-0.5">{title}</p>
          <p className="text-xl sm:text-2xl font-display font-bold text-ink">{value}</p>
          {trendValue && (
            <div className={`flex items-center gap-1 mt-1 text-xs font-body font-semibold ${trendColor}`}>
              {trendIcon && <i className={`${trendIcon} text-[10px]`} />}
              <span>{trendValue}</span>
              {trendLabel && <span className="text-ink-muted font-normal">{trendLabel}</span>}
            </div>
          )}
        </div>
        {(Icon || iconClass) && (
          <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br ${bg} flex items-center justify-center shadow-inner flex-shrink-0`}>
            {Icon
              ? <Icon className={`w-4 h-4 ${iconColor}`} />
              : <i className={`${iconClass} ${iconColor} text-base`} />}
          </div>
        )}
      </div>
    </div>
  );
}
