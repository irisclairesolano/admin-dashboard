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

export interface SkillDistributionItem {
  name: string;
  value: number;
  category?: string;
  subItems?: Array<{ name: string; value: number; category?: string }>;
}

interface SkillDistributionPieChartProps {
  data: SkillDistributionItem[];
  totalWorkers?: number;
  colors?: string[];
  heightClass?: string;
  onSliceClick?: (entry: SkillDistributionItem) => void;
}

const CustomTooltip = ({ active, payload, totalWorkers }: any) => {
  if (!active || !payload || !payload.length) return null;
  const item: SkillDistributionItem = payload[0].payload;
  const pct = totalWorkers > 0 ? ((item.value / totalWorkers) * 100).toFixed(1) : '0';

  if (item.name === 'Others' && item.subItems && item.subItems.length > 0) {
    const previewList = item.subItems.slice(0, 4);
    const remainingCount = item.subItems.length - previewList.length;

    return (
      <div className="bg-white/95 backdrop-blur-md p-3 rounded-xl shadow-lg border border-ink-faint/60 text-xs min-w-[200px] max-w-[260px] animate-fade-in font-sans">
        <div className="flex items-center justify-between gap-2 border-b border-ink-faint/40 pb-1.5 mb-2">
          <span className="font-bold text-ink">Others</span>
          <span className="font-numeric font-bold text-primary">
            {item.value} workers ({pct}%)
          </span>
        </div>

        <p className="text-[11px] font-semibold text-ink-muted mb-1.5">
          Includes {item.subItems.length} skills:
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
              + {remainingCount} more skills...
            </li>
          )}
        </ul>

        <div className="pt-1.5 border-t border-ink-faint/40 flex items-center justify-between text-[10px] text-primary font-semibold">
          <span>Click slice to view all</span>
          <span>→</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl shadow-lg border border-ink-faint/60 text-xs min-w-[150px] animate-fade-in font-sans">
      <div className="font-bold text-ink">{item.name}</div>
      {item.category && (
        <div className="text-[10px] text-ink-muted uppercase tracking-wider mb-1">
          {item.category}
        </div>
      )}
      <div className="font-numeric text-primary font-bold">
        {item.value} workers <span className="text-ink-muted font-normal">({pct}%)</span>
      </div>
    </div>
  );
};

const SkillDistributionPieChart = memo(function SkillDistributionPieChart({
  data,
  totalWorkers = 1,
  colors = DEFAULT_COLORS,
  heightClass = 'h-48',
  onSliceClick,
}: SkillDistributionPieChartProps) {
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);

  const handleSliceClick = (entry: SkillDistributionItem) => {
    if (onSliceClick) {
      onSliceClick(entry);
    }
  };

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
              onClick={(entry: any) => handleSliceClick(entry)}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} className="cursor-pointer" />
              ))}
            </RechartsPie>
            <Tooltip
              content={<CustomTooltip totalWorkers={totalWorkers} />}
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
          <button
            key={idx}
            type="button"
            className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity focus:outline-none"
            onMouseEnter={() => setActivePieIndex(idx)}
            onMouseLeave={() => setActivePieIndex(null)}
            onClick={() => handleSliceClick(entry)}
            title={entry.subItems ? `Click to view breakdown of ${entry.subItems.length} skills` : undefined}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }} />
            <span className={activePieIndex === idx ? 'text-ink font-bold' : ''}>
              {entry.name}
              {entry.subItems && (
                <span className="text-[10px] text-primary ml-1 font-normal">({entry.subItems.length})</span>
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
});

export default SkillDistributionPieChart;
