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
  CHART_AXIS_TICK,
  CHART_BAR_RADIUS,
  CHART_DEFAULT_MARGIN,
  CHART_GRID_PROPS,
  CHART_HORIZONTAL_BAR_RADIUS,
  CHART_HORIZONTAL_GRID_PROPS,
  CHART_LEGEND_STYLE,
  CHART_PALETTE,
  ChartTooltip,
  getAdaptiveBarConfig,
  renderCompactLegendText,
  truncateLabel,
} from './chartTheme';

interface GeographicActivityChartProps {
  data: Array<{
    name: string;
    jobs: number;
    applications?: number;
    [key: string]: any;
  }>;
  heightClass?: string;
  stacked?: boolean;
  margin?: { top: number; right: number; left: number; bottom: number };
}

const GeographicActivityChart = memo(function GeographicActivityChart({
  data,
  heightClass = 'h-56',
  stacked = false,
  margin = CHART_DEFAULT_MARGIN,
}: GeographicActivityChartProps) {
  // Automatically switch to horizontal bars when there are many towns/barangays
  // so municipality & barangay labels remain crisp and never overlap.
  const useHorizontalLayout = data.length > 7;
  const hasApplicationsSeries = data.some((d) => typeof d.applications === 'number');
  const seriesCount = !stacked && hasApplicationsSeries ? 2 : 1;
  const barConfig = getAdaptiveBarConfig(data.length, seriesCount);

  if (useHorizontalLayout) {
    const dynamicHeight = Math.max(224, Math.min(data.length * 32 + 44, 420));

    return (
      <div className="w-full min-w-0 font-numeric" style={{ height: dynamicHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 16, left: 4, bottom: 2 }}
            barGap={barConfig.barGap}
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
              tickFormatter={(val) => truncateLabel(val, 16)}
            />
            <Tooltip
              cursor={{ fill: CHART_PALETTE.cursorFill }}
              content={<ChartTooltip />}
            />
            <Legend
              iconType="circle"
              iconSize={7}
              wrapperStyle={CHART_LEGEND_STYLE}
              formatter={renderCompactLegendText}
            />
            {stacked ? (
              <>
                <Bar
                  dataKey="jobs"
                  name="Job Posts"
                  fill={CHART_PALETTE.jobs}
                  stackId="a"
                  barSize={barConfig.barSize}
                  maxBarSize={barConfig.maxBarSize}
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="applications"
                  name="Applications"
                  fill={CHART_PALETTE.applications}
                  stackId="a"
                  barSize={barConfig.barSize}
                  maxBarSize={barConfig.maxBarSize}
                  radius={CHART_HORIZONTAL_BAR_RADIUS}
                />
              </>
            ) : hasApplicationsSeries ? (
              <>
                <Bar
                  dataKey="jobs"
                  name="Job Posts"
                  fill={CHART_PALETTE.jobs}
                  barSize={barConfig.barSize}
                  maxBarSize={barConfig.maxBarSize}
                  radius={CHART_HORIZONTAL_BAR_RADIUS}
                />
                <Bar
                  dataKey="applications"
                  name="Applications"
                  fill={CHART_PALETTE.applications}
                  barSize={barConfig.barSize}
                  maxBarSize={barConfig.maxBarSize}
                  radius={CHART_HORIZONTAL_BAR_RADIUS}
                />
              </>
            ) : (
              <Bar
                dataKey="jobs"
                name="Job Posts"
                fill={CHART_PALETTE.jobs}
                barSize={barConfig.barSize}
                maxBarSize={barConfig.maxBarSize}
                radius={CHART_HORIZONTAL_BAR_RADIUS}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

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
            tickFormatter={(val) => truncateLabel(val, 14)}
            interval={0}
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
            content={<ChartTooltip />}
          />
          <Legend
            iconType="circle"
            iconSize={7}
            wrapperStyle={CHART_LEGEND_STYLE}
            formatter={renderCompactLegendText}
          />
          {stacked ? (
            <>
              <Bar
                dataKey="jobs"
                name="Job Posts"
                fill={CHART_PALETTE.jobs}
                stackId="a"
                barSize={barConfig.barSize}
                maxBarSize={barConfig.maxBarSize}
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="applications"
                name="Applications"
                fill={CHART_PALETTE.applications}
                stackId="a"
                barSize={barConfig.barSize}
                maxBarSize={barConfig.maxBarSize}
                radius={CHART_BAR_RADIUS}
              />
            </>
          ) : hasApplicationsSeries ? (
            <>
              <Bar
                dataKey="jobs"
                name="Job Posts"
                fill={CHART_PALETTE.jobs}
                barSize={barConfig.barSize}
                maxBarSize={barConfig.maxBarSize}
                radius={CHART_BAR_RADIUS}
              />
              <Bar
                dataKey="applications"
                name="Applications"
                fill={CHART_PALETTE.applications}
                barSize={barConfig.barSize}
                maxBarSize={barConfig.maxBarSize}
                radius={CHART_BAR_RADIUS}
              />
            </>
          ) : (
            <Bar
              dataKey="jobs"
              name="Job Posts"
              fill={CHART_PALETTE.jobs}
              barSize={barConfig.barSize}
              maxBarSize={barConfig.maxBarSize}
              radius={CHART_BAR_RADIUS}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

export default GeographicActivityChart;
