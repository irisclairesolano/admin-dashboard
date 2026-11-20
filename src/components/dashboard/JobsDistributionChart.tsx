'use client';

import React, { memo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import {
  Bar3DHorizontal,
  CHART_ANIMATION,
  CHART_AXIS_TICK,
  CHART_HORIZONTAL_GRID_PROPS,
  CHART_PALETTE,
  getAdaptiveBarConfig,
  truncateLabel,
} from './chartTheme';

export interface JobsDistributionItem {
  name: string;
  jobs: number;
  subItems?: Array<{ name: string; value: number; category?: string }>;
  [key: string]: any;
}

interface JobsDistributionChartProps {
  data: JobsDistributionItem[];
  heightClass?: string;
  onBarClick?: (entry: JobsDistributionItem) => void;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const item: JobsDistributionItem = payload[0].payload;

  if (item.name === 'Others' && item.subItems && item.subItems.length > 0) {
    const previewList = item.subItems.slice(0, 4);
    const remainingCount = item.subItems.length - previewList.length;

    return (
      <div className="bg-white dark:bg-slate-900 px-3 py-2.5 rounded-xl shadow-md border border-slate-200/90 dark:border-slate-700/80 text-xs min-w-[200px] max-w-[260px] font-sans">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-2">
          <span className="font-semibold text-slate-800 dark:text-slate-100">Others</span>
          <span className="font-numeric font-semibold text-primary dark:text-sky-400 tabular-nums">
            {item.jobs.toLocaleString()} job posts
          </span>
        </div>

        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5">
          Includes {item.subItems.length} categories:
        </p>

        <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300 mb-2 font-numeric">
          {previewList.map((sub, i) => (
            <li key={i} className="flex justify-between items-center gap-2">
              <span className="truncate max-w-[140px] font-medium text-slate-700 dark:text-slate-200">
                • {sub.name}
              </span>
              <span className="text-slate-500 dark:text-slate-400 shrink-0 tabular-nums">
                {sub.value.toLocaleString()}
              </span>
            </li>
          ))}
          {remainingCount > 0 && (
            <li className="text-[10px] text-slate-400 dark:text-slate-500 italic pt-0.5">
              + {remainingCount} more categories
            </li>
          )}
        </ul>

        <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-primary dark:text-sky-400 font-semibold">
          <span>Click bar to view all</span>
          <span>→</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 px-3 py-2 rounded-xl shadow-md border border-slate-200/90 dark:border-slate-700/80 text-xs min-w-[148px] font-sans">
      <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 mb-1">
        {item.name}
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: item.name === 'Others' ? CHART_PALETTE.others : CHART_PALETTE.workers }}
          />
          Job Posts
        </span>
        <span className="text-[11px] font-numeric font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
          {item.jobs.toLocaleString()}
        </span>
      </div>
    </div>
  );
};

const JobsDistributionChart = memo(function JobsDistributionChart({
  data,
  heightClass = 'h-56',
  onBarClick,
}: JobsDistributionChartProps) {
  const barConfig = getAdaptiveBarConfig(data.length, 1);

  return (
    <div className={`${heightClass} w-full min-w-0 font-numeric`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 14, left: 4, bottom: 2 }}
          barCategoryGap={barConfig.barCategoryGap}
        >
          <CartesianGrid {...CHART_HORIZONTAL_GRID_PROPS} />
          <XAxis
            type="number"
            axisLine={false}
            tickLine={false}
            tick={CHART_AXIS_TICK}
            allowDecimals={false}
          />
          <YAxis
            dataKey="name"
            type="category"
            axisLine={false}
            tickLine={false}
            tick={CHART_AXIS_TICK}
            width={116}
            interval={0}
            tickFormatter={(value) => truncateLabel(value, 16)}
          />
          <Tooltip
            cursor={{ fill: CHART_PALETTE.cursorFill }}
            content={<CustomTooltip />}
          />
          <Bar
            dataKey="jobs"
            name="Job Posts"
            shape={<Bar3DHorizontal />}
            barSize={barConfig.barSize}
            maxBarSize={barConfig.maxBarSize}
            animationDuration={CHART_ANIMATION.duration}
            animationEasing={CHART_ANIMATION.easing}
            onClick={(entry: any) => onBarClick?.(entry)}
          >
            {data.map((entry, index) => (
              <Cell
                key={`bar-cell-${index}`}
                fill={entry.name === 'Others' ? CHART_PALETTE.others : CHART_PALETTE.workers}
                className="cursor-pointer hover:opacity-85 transition-opacity"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

export default JobsDistributionChart;
