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
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8DFCE" opacity={0.5} />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 10 }} dy={6} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 11 }} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: 'rgba(148, 163, 184, 0.14)' }}
            wrapperClassName="bg-white/95 dark:bg-slate-900/95 text-ink dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg backdrop-blur-md"
            contentStyle={{
              borderRadius: '12px',
              border: 'none',
              boxShadow: 'none',
              backgroundColor: 'transparent',
            }}
          />
          <Legend wrapperStyle={{ paddingTop: 6, fontSize: '11px', fontFamily: 'var(--font-body)' }} />
          {stacked ? (
            <>
              <Bar dataKey="jobs" name="Job Posts" fill="#87CEEB" stackId="a" radius={[0, 0, 0, 0]} />
              <Bar dataKey="applications" name="Applications" fill="#90EE90" stackId="a" radius={[4, 4, 0, 0]} />
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
