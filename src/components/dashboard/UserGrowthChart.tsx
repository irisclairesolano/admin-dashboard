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

const UserGrowthChart = memo(function UserGrowthChart({
  data,
  intervalFilter,
  roleFilter = 'all',
  formatAxisTick = defaultFormatAxisTick,
  formatPeriodLabel = defaultFormatPeriodLabel,
  heightClass = 'h-48',
  margin = { top: 10, right: 10, left: -20, bottom: 0 },
}: UserGrowthChartProps) {
  return (
    <div className={`${heightClass} w-full min-w-0 font-numeric`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={margin}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8DFCE" opacity={0.5} />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#5C4F42', fontSize: 11 }}
            tickFormatter={(val) => formatAxisTick(val, intervalFilter)}
            dy={6}
          />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#5C4F42', fontSize: 11 }} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: 'rgba(148, 163, 184, 0.14)' }}
            wrapperClassName="bg-white/85 dark:bg-slate-900/85 text-ink dark:text-slate-100 border border-white/60 dark:border-slate-700/70 rounded-xl shadow-glass backdrop-blur-md"
            contentStyle={{
              borderRadius: '12px',
              border: 'none',
              boxShadow: 'none',
              backgroundColor: 'transparent',
            }}
            labelFormatter={(label) => formatPeriodLabel(label, intervalFilter)}
          />
          <Legend wrapperStyle={{ paddingTop: 6, fontSize: 11 }} />
          {(roleFilter === 'all' || roleFilter === 'worker') && (
            <Bar dataKey="workers" name="Workers" fill="#3E7648" radius={[4, 4, 0, 0]} />
          )}
          {(roleFilter === 'all' || roleFilter === 'employer') && (
            <Bar dataKey="employers" name="Employers" fill="#0284C7" radius={[4, 4, 0, 0]} />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

export default UserGrowthChart;
