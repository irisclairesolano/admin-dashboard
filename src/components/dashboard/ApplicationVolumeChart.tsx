'use client';

import React, { memo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import {
  CHART_AXIS_TICK,
  CHART_DEFAULT_MARGIN,
  CHART_GRID_PROPS,
  CHART_LEGEND_STYLE,
  CHART_PALETTE,
  ChartTooltip,
  formatAxisTick as defaultFormatAxisTick,
  formatPeriodLabel as defaultFormatPeriodLabel,
  renderCompactLegendText,
} from './chartTheme';

interface ApplicationVolumeChartProps {
  data: Array<{
    name: string;
    applications: number;
    jobs: number;
    [key: string]: any;
  }>;
  intervalFilter: string;
  formatAxisTick?: (val: string, interval: string) => string;
  formatPeriodLabel?: (periodStr: string, interval: string) => string;
  heightClass?: string;
  margin?: { top: number; right: number; left: number; bottom: number };
}

const ApplicationVolumeChart = memo(function ApplicationVolumeChart({
  data,
  intervalFilter,
  formatAxisTick = defaultFormatAxisTick,
  formatPeriodLabel = defaultFormatPeriodLabel,
  heightClass = 'h-56',
  margin = CHART_DEFAULT_MARGIN,
}: ApplicationVolumeChartProps) {
  return (
    <div className={`${heightClass} w-full min-w-0 font-numeric`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={margin}>
          <defs>
            <linearGradient id="colorAppsOverview" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_PALETTE.applications} stopOpacity={0.18} />
              <stop offset="95%" stopColor={CHART_PALETTE.applications} stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="colorJobsOverview" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_PALETTE.jobs} stopOpacity={0.18} />
              <stop offset="95%" stopColor={CHART_PALETTE.jobs} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid {...CHART_GRID_PROPS} />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={CHART_AXIS_TICK}
            tickFormatter={(val) => formatAxisTick(val, intervalFilter)}
            minTickGap={24}
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={CHART_AXIS_TICK}
            allowDecimals={false}
            width={36}
          />
          <Tooltip
            shared
            cursor={{ stroke: CHART_PALETTE.cursorStroke, strokeWidth: 1, strokeDasharray: '3 3' }}
            content={
              <ChartTooltip
                labelFormatter={(label) => formatPeriodLabel(label, intervalFilter)}
              />
            }
          />
          <Legend
            iconType="circle"
            iconSize={7}
            wrapperStyle={CHART_LEGEND_STYLE}
            formatter={renderCompactLegendText}
          />
          <Area
            type="monotone"
            dataKey="applications"
            name="Applications Filed"
            stroke={CHART_PALETTE.applications}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorAppsOverview)"
            activeDot={{ r: 4, stroke: '#FFFFFF', strokeWidth: 2 }}
          />
          <Area
            type="monotone"
            dataKey="jobs"
            name="Job Posts"
            stroke={CHART_PALETTE.jobs}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorJobsOverview)"
            activeDot={{ r: 4, stroke: '#FFFFFF', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

export default ApplicationVolumeChart;
