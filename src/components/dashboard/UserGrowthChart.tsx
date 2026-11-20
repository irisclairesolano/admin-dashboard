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
  Legend,
} from 'recharts';
import {
  Bar3DVertical,
  CHART_ANIMATION,
  CHART_AXIS_TICK,
  CHART_DEFAULT_MARGIN,
  CHART_GRID_PROPS,
  CHART_LEGEND_STYLE,
  CHART_PALETTE,
  ChartTooltip,
  formatAxisTick as defaultFormatAxisTick,
  formatPeriodLabel as defaultFormatPeriodLabel,
  getAdaptiveBarConfig,
  renderCompactLegendText,
} from './chartTheme';

interface UserGrowthChartProps {
  data: Array<{
    name: string;
    workers: number;
    employers: number;
    [key: string]: any;
  }>;
  intervalFilter: string;
  roleFilter?: 'all' | 'worker' | 'employer';
  formatAxisTick?: (val: string, interval: string) => string;
  formatPeriodLabel?: (periodStr: string, interval: string) => string;
  heightClass?: string;
  margin?: { top: number; right: number; left: number; bottom: number };
}

const UserGrowthChart = memo(function UserGrowthChart({
  data,
  intervalFilter,
  roleFilter = 'all',
  formatAxisTick = defaultFormatAxisTick,
  formatPeriodLabel = defaultFormatPeriodLabel,
  heightClass = 'h-56',
  margin = CHART_DEFAULT_MARGIN,
}: UserGrowthChartProps) {
  const seriesCount = roleFilter === 'all' ? 2 : 1;
  const barConfig = getAdaptiveBarConfig(data.length, seriesCount);

  return (
    <div className={`${heightClass} w-full min-w-0 font-numeric`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={margin}
          barGap={barConfig.barGap}
          barCategoryGap={barConfig.barCategoryGap}
        >
          <CartesianGrid {...CHART_GRID_PROPS} />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={CHART_AXIS_TICK}
            tickFormatter={(val) => formatAxisTick(val, intervalFilter)}
            interval={data.length <= 7 ? 0 : 'preserveStartEnd'}
            minTickGap={20}
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
            cursor={{ fill: CHART_PALETTE.cursorFill }}
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
          {(roleFilter === 'all' || roleFilter === 'worker') && (
            <Bar
              dataKey="workers"
              name="Workers"
              fill={CHART_PALETTE.workers}
              shape={<Bar3DVertical />}
              barSize={barConfig.barSize}
              maxBarSize={barConfig.maxBarSize}
              animationBegin={0}
              animationDuration={CHART_ANIMATION.duration}
              animationEasing={CHART_ANIMATION.easing}
            />
          )}
          {(roleFilter === 'all' || roleFilter === 'employer') && (
            <Bar
              dataKey="employers"
              name="Employers"
              fill={CHART_PALETTE.employers}
              shape={<Bar3DVertical />}
              barSize={barConfig.barSize}
              maxBarSize={barConfig.maxBarSize}
              animationBegin={CHART_ANIMATION.staggerDelay}
              animationDuration={CHART_ANIMATION.duration}
              animationEasing={CHART_ANIMATION.easing}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

export default UserGrowthChart;
