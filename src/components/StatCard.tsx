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
      className={`bg-white/80 backdrop-blur-md rounded-2xl p-5 border border-white/50 shadow-sm transition-all ${
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
          <p className="text-xs font-body font-semibold text-ink-soft uppercase tracking-wider mb-1">{title}</p>
          <p className="text-2xl font-display font-bold text-ink">{value}</p>
          {trendValue && (
            <div className={`flex items-center gap-1 mt-1.5 text-xs font-body font-semibold ${trendColor}`}>
              {trendIcon && <i className={`${trendIcon} text-[10px]`} />}
              <span>{trendValue}</span>
              {trendLabel && <span className="text-ink-muted font-normal">{trendLabel}</span>}
            </div>
          )}
        </div>
        {(Icon || iconClass) && (
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${bg} flex items-center justify-center shadow-inner flex-shrink-0`}>
            {Icon
              ? <Icon className={`w-5 h-5 ${iconColor}`} />
              : <i className={`${iconClass} ${iconColor} text-lg`} />}
          </div>
        )}
      </div>
    </div>
  );
}
