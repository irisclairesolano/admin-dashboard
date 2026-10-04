'use client';

import React, { memo, useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Sector,
  Tooltip,
} from 'recharts';

const RechartsPie = Pie as any;

const DEFAULT_COLORS = [
  '#3E7648', '#0284C7', '#D97706', '#9333EA', '#E11D48',
  '#059669', '#2563EB', '#D946EF', '#64748B'
];

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    </g>
  );
};

interface SkillDistributionPieChartProps {
  data: Array<{ name: string; value: number }>;
  totalWorkers?: number;
  colors?: string[];
  heightClass?: string;
}

const SkillDistributionPieChart = memo(function SkillDistributionPieChart({
  data,
  totalWorkers = 1,
  colors = DEFAULT_COLORS,
  heightClass = 'h-48',
}: SkillDistributionPieChartProps) {
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);

  return (
    <div className="w-full flex flex-col">
      <div className={`${heightClass} w-full min-w-0 relative flex items-center justify-center font-numeric`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <RechartsPie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
              label={false}
              activeIndex={activePieIndex !== null ? activePieIndex : undefined}
              activeShape={renderActiveShape}
              onMouseEnter={(_: any, index: number) => setActivePieIndex(index)}
              onMouseLeave={() => setActivePieIndex(null)}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} className="cursor-pointer" />
              ))}
            </RechartsPie>
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.5)',
                boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.08)',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(8px)',
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Donut Center Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-4">
          {activePieIndex !== null && data[activePieIndex] ? (
            <>
              <span className="text-[10px] font-bold text-ink-muted uppercase max-w-[90px] truncate">
                {data[activePieIndex].name}
              </span>
              <strong className="text-lg font-numeric text-ink">
                {((data[activePieIndex].value / (totalWorkers || 1)) * 100).toFixed(0)}%
              </strong>
              <span className="text-[9px] text-ink-muted">
                {data[activePieIndex].value} workers
              </span>
            </>
          ) : (
            <>
              <span className="text-[10px] text-ink-muted font-bold uppercase tracking-wider">Top Skill</span>
              <strong className="text-sm font-bold text-ink max-w-[90px] truncate text-center">
                {data[0]?.name || 'N/A'}
              </strong>
              <span className="text-[9px] text-ink-muted">
                {data[0]?.value ? `${data[0].value} workers` : '—'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Clean swatch-only legend underneath */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 mt-2 text-xs font-semibold text-ink-soft">
        {data.map((entry, idx) => (
          <div
            key={idx}
            className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
            onMouseEnter={() => setActivePieIndex(idx)}
            onMouseLeave={() => setActivePieIndex(null)}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }} />
            <span className={activePieIndex === idx ? 'text-ink font-bold' : ''}>{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

export default SkillDistributionPieChart;
