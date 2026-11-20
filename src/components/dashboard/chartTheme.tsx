'use client';

import React from 'react';

// ─── Unified SIKAP Analytics Chart Design System ─────────────────────────────
// Shared visual tokens, adaptive bar sizing, formatters, and minimalist tooltip
// used across all Recharts visualizations in the SIKAP Admin Dashboard.

export const CHART_PALETTE = {
  // Primary semantic series colors (aligned with SIKAP brand identity)
  workers: '#3E7648',      // SIKAP Forest Green
  employers: '#0284C7',    // SIKAP Sky Blue
  applications: '#3E7648', // SIKAP Forest Green
  jobs: '#0284C7',         // SIKAP Sky Blue
  hires: '#6366F1',        // Restrained Indigo (high contrast against green)
  others: '#94A3B8',       // Neutral Slate-400 for grouped "Others"

  // Structural chrome
  grid: '#E2E8F0',         // Subtle light-gray gridlines (Slate-200)
  axisTick: '#64748B',     // Secondary muted slate axis labels (Slate-500)
  cursorFill: 'rgba(148, 163, 184, 0.09)',
  cursorStroke: '#CBD5E1',
} as const;

export const CHART_GRID_PROPS = {
  strokeDasharray: '3 3',
  vertical: false,
  stroke: CHART_PALETTE.grid,
  strokeOpacity: 0.75,
} as const;

export const CHART_HORIZONTAL_GRID_PROPS = {
  strokeDasharray: '3 3',
  horizontal: false,
  stroke: CHART_PALETTE.grid,
  strokeOpacity: 0.75,
} as const;

export const CHART_AXIS_TICK = {
  fill: CHART_PALETTE.axisTick,
  fontSize: 11,
  fontWeight: 500,
} as const;

export const CHART_DEFAULT_MARGIN = {
  top: 10,
  right: 12,
  left: -16,
  bottom: 2,
} as const;

export const CHART_BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0];
export const CHART_HORIZONTAL_BAR_RADIUS: [number, number, number, number] = [0, 4, 4, 0];

export const CHART_LEGEND_STYLE: React.CSSProperties = {
  paddingTop: 10,
  fontSize: '11px',
  fontWeight: 500,
  color: '#64748B',
};

/**
 * Computes slim, well-spaced bar geometry adapted to category & series count.
 * Prevents oversized chunky bars on small datasets and crowding on large ones.
 */
export function getAdaptiveBarConfig(categoryCount: number, seriesCount: number = 1) {
  const isGrouped = seriesCount > 1;

  if (categoryCount <= 3) {
    return {
      barSize: isGrouped ? 14 : 16,
      maxBarSize: isGrouped ? 16 : 18,
      barGap: 6,
      barCategoryGap: '42%',
    };
  }
  if (categoryCount <= 7) {
    return {
      barSize: isGrouped ? 12 : 15,
      maxBarSize: isGrouped ? 14 : 16,
      barGap: 5,
      barCategoryGap: '34%',
    };
  }
  if (categoryCount <= 14) {
    return {
      barSize: isGrouped ? 10 : 13,
      maxBarSize: isGrouped ? 12 : 14,
      barGap: 4,
      barCategoryGap: '28%',
    };
  }
  return {
    barSize: isGrouped ? 8 : 10,
    maxBarSize: isGrouped ? 10 : 12,
    barGap: 3,
    barCategoryGap: '20%',
  };
}

export function truncateLabel(value: string, maxLength: number = 14): string {
  if (!value) return '';
  const str = String(value);
  return str.length > maxLength ? `${str.slice(0, maxLength - 1)}…` : str;
}

export function formatPeriodLabel(periodStr: string, interval: string): string {
  if (!periodStr) return '—';
  if (interval === 'hourly') {
    if (periodStr.includes(' ')) {
      const parts = periodStr.split(' ');
      const hourPart = parts[1] || '';
      const hourNum = parseInt(hourPart.split(':')[0] || '0', 10);
      const nextHour = (hourNum + 1) % 24;
      const ampm = hourNum >= 12 ? 'PM' : 'AM';
      const formatted12 = hourNum % 12 === 0 ? 12 : hourNum % 12;
      return `${hourPart} - ${String(nextHour).padStart(2, '0')}:00 (${formatted12} ${ampm})`;
    }
    return periodStr;
  }
  if (interval === 'monthly') {
    try {
      const [year, month] = periodStr.split('-');
      const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      return periodStr;
    }
  }
  try {
    const d = new Date(periodStr + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return periodStr;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      weekday: 'short',
    });
  } catch {
    return periodStr;
  }
}

export function formatAxisTick(val: string, interval: string): string {
  if (!val) return '';
  if (interval === 'hourly') {
    if (val.includes(' ')) return val.split(' ')[1];
    return val;
  }
  if (interval === 'monthly') {
    try {
      const [year, month] = val.split('-');
      if (year && month) {
        const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
        if (!Number.isNaN(d.getTime())) {
          return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        }
      }
    } catch {
      return val;
    }
    return val;
  }
  try {
    const d = new Date(val + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return val;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return val;
  }
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number | string;
    color?: string;
    dataKey?: string;
  }>;
  label?: string;
  labelFormatter?: (label: string) => string;
  valueSuffix?: string;
}

/**
 * Clean, minimal white-surface tooltip shared across Bar & Area charts.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueSuffix = '',
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const formattedLabel = labelFormatter && label !== undefined ? labelFormatter(String(label)) : label;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700/80 rounded-xl shadow-md px-3 py-2 text-xs min-w-[148px] font-sans">
      {formattedLabel && (
        <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 pb-1.5 mb-1.5 border-b border-slate-100 dark:border-slate-800">
          {formattedLabel}
        </div>
      )}
      <div className="space-y-1">
        {payload.map((entry, idx) => (
          <div key={`${entry.dataKey ?? entry.name}-${idx}`} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: entry.color || CHART_PALETTE.workers }}
              />
              <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {entry.name}
              </span>
            </div>
            <span className="text-[11px] font-numeric font-semibold text-slate-900 dark:text-slate-100 tabular-nums shrink-0">
              {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
              {valueSuffix}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function renderCompactLegendText(value: string) {
  return (
    <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 ml-0.5 mr-2">
      {value}
    </span>
  );
}
