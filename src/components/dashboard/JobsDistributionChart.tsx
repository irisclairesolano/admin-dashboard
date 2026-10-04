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
} from 'recharts';

interface JobsDistributionChartProps {
  data: Array<{
    name: string;
    jobs: number;
    [key: string]: any;
  }>;
  heightClass?: string;
}

const JobsDistributionChart = memo(function JobsDistributionChart({
  data,
  heightClass = 'h-56',
}: JobsDistributionChartProps) {
  return (
    <div className={`${heightClass} w-full min-w-0 font-numeric`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E8DFCE" opacity={0.5} />
          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 10 }} allowDecimals={false} />
          <YAxis
            dataKey="name"
            type="category"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#8C7B6A', fontSize: 10 }}
            width={95}
            tickFormatter={(value) => (value.length > 12 ? `${value.slice(0, 12)}...` : value)}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.5)',
              boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.08)',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(8px)',
            }}
          />
          <Bar dataKey="jobs" name="Job Posts" fill="#3E7648" radius={[0, 4, 4, 0]} barSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

export default JobsDistributionChart;
