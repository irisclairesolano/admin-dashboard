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
            cursor={{ fill: '#FDF8F0' }}
            contentStyle={{
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.5)',
              boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.08)',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(8px)',
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
