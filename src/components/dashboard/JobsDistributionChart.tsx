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
  Cell,
} from 'recharts';

export interface JobsDistributionItem {
  name: string;
  jobs: number;
  subItems?: Array<{ name: string; value: number; category?: string }>;
  [key: string]: any;
}

interface JobsDistributionChartProps {
  data: JobsDistributionItem[];
  heightClass?: string;
  onBarClick?: (entry: JobsDistributionItem) => void;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const item: JobsDistributionItem = payload[0].payload;

  if (item.name === 'Others' && item.subItems && item.subItems.length > 0) {
    const previewList = item.subItems.slice(0, 4);
    const remainingCount = item.subItems.length - previewList.length;

    return (
      <div className="bg-white/95 backdrop-blur-md p-3 rounded-xl shadow-lg border border-ink-faint/60 text-xs min-w-[200px] max-w-[260px] animate-fade-in font-sans">
        <div className="flex items-center justify-between gap-2 border-b border-ink-faint/40 pb-1.5 mb-2">
          <span className="font-bold text-ink">Others</span>
          <span className="font-numeric font-bold text-primary">
            {item.jobs} job posts
          </span>
        </div>

        <p className="text-[11px] font-semibold text-ink-muted mb-1.5">
          Includes {item.subItems.length} categories:
        </p>

        <ul className="space-y-1 text-[11px] text-ink-soft mb-2 font-numeric">
          {previewList.map((sub, i) => (
            <li key={i} className="flex justify-between items-center gap-2">
              <span className="truncate max-w-[130px] font-medium text-ink">
                • {sub.name}
              </span>
              <span className="text-ink-muted shrink-0">{sub.value}</span>
            </li>
          ))}
          {remainingCount > 0 && (
            <li className="text-[10px] text-ink-muted italic pt-0.5">
              + {remainingCount} more categories...
            </li>
          )}
        </ul>

        <div className="pt-1.5 border-t border-ink-faint/40 flex items-center justify-between text-[10px] text-primary font-semibold">
          <span>Click bar to view all</span>
          <span>→</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl shadow-lg border border-ink-faint/60 text-xs min-w-[140px] animate-fade-in font-sans">
      <div className="font-bold text-ink">{item.name}</div>
      <div className="font-numeric text-primary font-bold mt-0.5">
        {item.jobs} job posts
      </div>
    </div>
  );
};

const JobsDistributionChart = memo(function JobsDistributionChart({
  data,
  heightClass = 'h-56',
  onBarClick,
}: JobsDistributionChartProps) {
  return (
    <div className={`${heightClass} w-full min-w-0 font-numeric`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
        >
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
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="jobs"
            name="Job Posts"
            radius={[0, 4, 4, 0]}
            barSize={14}
            onClick={(entry: any) => onBarClick?.(entry)}
          >
            {data.map((entry, index) => (
              <Cell
                key={`bar-cell-${index}`}
                fill={entry.name === 'Others' ? '#8C7B6A' : '#3E7648'}
                className="cursor-pointer hover:opacity-85 transition-opacity"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

export default JobsDistributionChart;
