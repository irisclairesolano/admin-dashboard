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

function defaultFormatPeriodLabel(periodStr: string, interval: string): string {
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
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', weekday: 'short' });
  } catch {
    return periodStr;
  }
}

function defaultFormatAxisTick(val: string, interval: string): string {
  if (!val) return '';
  if (interval === 'hourly') {
    if (val.includes(' ')) return val.split(' ')[1];
    return val;
  }
  if (interval === 'monthly') {
    return val;
  }
  try {
    const d = new Date(val + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return val;
  }
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
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorAppsVelocity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FFB6C1" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#FFB6C1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorHiresVelocity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8DFCE" opacity={0.5} />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#8C7B6A', fontSize: 10 }}
            tickFormatter={(val) => formatAxisTick(val, intervalFilter)}
            dy={6}
          />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 11 }} allowDecimals={false} />
          <Tooltip
            shared
            labelFormatter={(label) => formatPeriodLabel(label, intervalFilter)}
            contentStyle={{
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.5)',
              boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.08)',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(8px)',
            }}
          />
          <Legend wrapperStyle={{ paddingTop: 6, fontSize: '11px', fontFamily: 'var(--font-body)' }} />
          {(trendsVolumeFilter === 'all' || trendsVolumeFilter === 'applications') && (
            <Area
              type="monotone"
              dataKey="applications"
              name="Applications Filed"
              stroke="#FFB6C1"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorAppsVelocity)"
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          )}
          {(trendsVolumeFilter === 'all' || trendsVolumeFilter === 'hires') && (
            <Area
              type="monotone"
              dataKey="completed_hires"
              name="Completed Hires"
              stroke="#10B981"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorHiresVelocity)"
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

export default ConversionVelocityChart;
