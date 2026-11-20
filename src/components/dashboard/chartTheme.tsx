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

export const CHART_ANIMATION = {
  duration: 650,
  easing: 'ease-out' as const,
  staggerDelay: 90,
};

/**
 * Returns `true` in all real browsers so Recharts entrance/update animations
 * always run smoothly (instead of Recharts 3.9's `'auto'` default skipping
 * animations when Windows OS reduced-motion is active).
 * In jsdom unit tests where `(prefers-reduced-motion: reduce)` is explicitly
 * mocked to `true`, returns `false` so synchronous geometry assertions work at t=0.
 */
export function isChartAnimationActive(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  if (/jsdom/i.test(ua) && typeof window.matchMedia === 'function') {
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return false;
      }
    } catch {
      // ignore
    }
  }
  return true;
}

interface Bar3DShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
}

/**
 * Custom Recharts shape rendering a slim vertical 3D isometric bar with a
 * beveled top cap, shaded right extrusion, left specular highlight, and drop shadow.
 * Keeps `<rect>` as the sole rect primitive for deterministic geometry & tests.
 */
export function Bar3DVertical(props: Bar3DShapeProps) {
  const x = Number(props.x ?? 0);
  const y = Number(props.y ?? 0);
  const width = Number(props.width ?? 0);
  const height = Number(props.height ?? 0);
  const fill = props.fill || CHART_PALETTE.workers;

  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }

  const depth = Math.min(4, Math.max(2.5, Math.round(width * 0.32)));
  const highlightW = Math.max(1.5, width * 0.2);

  const shadowPoints = `${x + 2},${y + height} ${x + width + depth + 2},${y + height} ${x + width + depth + 2},${y + height - depth + 2} ${x + depth + 2},${y + height - depth + 2}`;
  const topPoints = `${x},${y} ${x + depth},${y - depth} ${x + width + depth},${y - depth} ${x + width},${y}`;
  const sidePoints = `${x + width},${y} ${x + width + depth},${y - depth} ${x + width + depth},${y + height - depth} ${x + width},${y + height}`;
  const sheenPoints = `${x},${y} ${x + highlightW},${y} ${x + highlightW},${y + height} ${x},${y + height}`;

  return (
    <g className="recharts-3d-bar-vertical">
      <polygon points={shadowPoints} fill="rgba(15, 23, 42, 0.08)" />
      <rect x={x} y={y} width={width} height={height} fill={fill} rx={1.5} />
      <polygon points={sheenPoints} fill="rgba(255, 255, 255, 0.22)" />
      <polygon points={topPoints} fill={fill} />
      <polygon points={topPoints} fill="rgba(255, 255, 255, 0.32)" />
      <polygon points={sidePoints} fill={fill} />
      <polygon points={sidePoints} fill="rgba(15, 23, 42, 0.26)" />
    </g>
  );
}

/**
 * Custom Recharts shape rendering a slim horizontal 3D bar with an
 * extruded top wall, beveled right cap, top sheen, and subtle ground shadow.
 */
export function Bar3DHorizontal(props: Bar3DShapeProps) {
  const x = Number(props.x ?? 0);
  const y = Number(props.y ?? 0);
  const width = Number(props.width ?? 0);
  const height = Number(props.height ?? 0);
  const fill = props.fill || CHART_PALETTE.workers;

  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }

  const depth = Math.min(3.5, Math.max(2.5, Math.round(height * 0.3)));
  const sheenH = Math.max(1.5, height * 0.2);

  const shadowPoints = `${x + 2},${y + height} ${x + width + 2},${y + height} ${x + width + depth + 2},${y + height + 2} ${x + 2},${y + height + 2}`;
  const topPoints = `${x},${y} ${x + depth},${y - depth} ${x + width + depth},${y - depth} ${x + width},${y}`;
  const rightPoints = `${x + width},${y} ${x + width + depth},${y - depth} ${x + width + depth},${y + height - depth} ${x + width},${y + height}`;
  const sheenPoints = `${x},${y} ${x + width},${y} ${x + width},${y + sheenH} ${x},${y + sheenH}`;

  return (
    <g className="recharts-3d-bar-horizontal">
      <polygon points={shadowPoints} fill="rgba(15, 23, 42, 0.08)" />
      <rect x={x} y={y} width={width} height={height} fill={fill} rx={1.5} />
      <polygon points={sheenPoints} fill="rgba(255, 255, 255, 0.22)" />
      <polygon points={topPoints} fill={fill} />
      <polygon points={topPoints} fill="rgba(255, 255, 255, 0.3)" />
      <polygon points={rightPoints} fill={fill} />
      <polygon points={rightPoints} fill="rgba(15, 23, 42, 0.26)" />
    </g>
  );
}

/**
 * Computes slim, well-spaced bar geometry adapted to category & series count.
 * Prevents oversized chunky bars on small datasets and crowding on large ones.
 */
export function getAdaptiveBarConfig(categoryCount: number, seriesCount: number = 1) {
  const isGrouped = seriesCount > 1;

  if (isGrouped) {
    if (categoryCount <= 4) {
      return {
        barSize: 11,
        maxBarSize: 12,
        barGap: 4,
        barCategoryGap: '38%',
      };
    }
    if (categoryCount <= 8) {
      return {
        barSize: 10,
        maxBarSize: 12,
        barGap: 4,
        barCategoryGap: '32%',
      };
    }
    if (categoryCount <= 14) {
      return {
        barSize: 9,
        maxBarSize: 10,
        barGap: 3,
        barCategoryGap: '26%',
      };
    }
    return {
      barSize: 7,
      maxBarSize: 9,
      barGap: 2,
      barCategoryGap: '20%',
    };
  }

  if (categoryCount <= 4) {
    return {
      barSize: 12,
      maxBarSize: 14,
      barGap: 4,
      barCategoryGap: '40%',
    };
  }
  if (categoryCount <= 8) {
    return {
      barSize: 11,
      maxBarSize: 13,
      barGap: 4,
      barCategoryGap: '32%',
    };
  }
  if (categoryCount <= 14) {
    return {
      barSize: 10,
      maxBarSize: 12,
      barGap: 3,
      barCategoryGap: '26%',
    };
  }
  return {
    barSize: 8,
    maxBarSize: 10,
    barGap: 2,
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
