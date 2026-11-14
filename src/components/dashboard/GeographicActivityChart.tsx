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
  margin = { top: 10, right: 10, left: -20, bottom: 0 },
}: GeographicActivityChartProps) {
  return (
    <div className={`${heightClass} w-full min-w-0 font-numeric`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={margin}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8DFCE" opacity={0.4} />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={6} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: 'rgba(148, 163, 184, 0.14)' }}
            wrapperClassName="bg-white/85 dark:bg-slate-900/85 text-ink dark:text-slate-100 border border-white/60 dark:border-slate-700/70 rounded-xl shadow-glass backdrop-blur-md"
            contentStyle={{
              borderRadius: '12px',
              border: 'none',
              boxShadow: 'none',
              backgroundColor: 'transparent',
            }}
          />
          <Legend wrapperStyle={{ paddingTop: 8, fontSize: '12px', fontFamily: 'var(--font-body)' }} />
          {stacked ? (
            <>
              <Bar dataKey="jobs" name="Job Posts" fill="#0284C7" stackId="a" radius={[0, 0, 0, 0]} />
              <Bar dataKey="applications" name="Applications" fill="#10B981" stackId="a" radius={[4, 4, 0, 0]} />
            </>
          ) : (
            <Bar dataKey="jobs" name="Job Posts" fill="#0284C7" radius={[4, 4, 0, 0]} />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

export default GeographicActivityChart;
