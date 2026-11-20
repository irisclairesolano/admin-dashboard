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

interface ConversionVelocityChartProps {
  data: Array<{
    name: string;
    applications: number;
    completed_hires: number;
    [key: string]: any;
  }>;
  intervalFilter: string;
  trendsVolumeFilter?: 'all' | 'applications' | 'hires';
  formatAxisTick?: (val: string, interval: string) => string;
  formatPeriodLabel?: (periodStr: string, interval: string) => string;
  heightClass?: string;
}

const ConversionVelocityChart = memo(function ConversionVelocityChart({
  data,
  intervalFilter,
  trendsVolumeFilter = 'all',
  formatAxisTick = defaultFormatAxisTick,
  formatPeriodLabel = defaultFormatPeriodLabel,
  heightClass = 'h-56',
}: ConversionVelocityChartProps) {
  return (
    <div className={`${heightClass} w-full min-w-0 font-numeric`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={CHART_DEFAULT_MARGIN}>
          <defs>
            <linearGradient id="colorAppsVelocity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_PALETTE.applications} stopOpacity={0.18} />
              <stop offset="95%" stopColor={CHART_PALETTE.applications} stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="colorHiresVelocity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_PALETTE.hires} stopOpacity={0.18} />
              <stop offset="95%" stopColor={CHART_PALETTE.hires} stopOpacity={0.01} />
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
          {(trendsVolumeFilter === 'all' || trendsVolumeFilter === 'applications') && (
            <Area
              type="monotone"
              dataKey="applications"
              name="Applications Filed"
              stroke={CHART_PALETTE.applications}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorAppsVelocity)"
              activeDot={{ r: 4, stroke: '#FFFFFF', strokeWidth: 2 }}
            />
          )}
          {(trendsVolumeFilter === 'all' || trendsVolumeFilter === 'hires') && (
            <Area
              type="monotone"
              dataKey="completed_hires"
              name="Completed Hires"
              stroke={CHART_PALETTE.hires}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorHiresVelocity)"
              activeDot={{ r: 4, stroke: '#FFFFFF', strokeWidth: 2 }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

export default ConversionVelocityChart;
