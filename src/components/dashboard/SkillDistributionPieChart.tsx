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
import { CHART_ANIMATION, CHART_PALETTE, isChartAnimationActive } from './chartTheme';

const RechartsPie = Pie as any;

const DEFAULT_COLORS = [
  '#3E7648', '#0284C7', '#6366F1', '#10B981', '#F59E0B',
  '#06B6D4', '#8B5CF6', '#94A3B8',
];

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy + 3}
        innerRadius={innerRadius - 1}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill="rgba(15, 23, 42, 0.25)"
      />
      <Sector
        cx={cx}
        cy={cy - 2}
        innerRadius={innerRadius - 1}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        filter="url(#pie3dActiveShadow)"
      />
      <Sector
        cx={cx}
        cy={cy - 2}
        innerRadius={outerRadius + 4}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill="rgba(255, 255, 255, 0.35)"
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
      <div className="bg-white dark:bg-slate-900 px-3 py-2.5 rounded-xl shadow-md border border-slate-200/90 dark:border-slate-700/80 text-xs min-w-[200px] max-w-[260px] font-sans">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-2">
          <span className="font-semibold text-slate-800 dark:text-slate-100">Others</span>
          <span className="font-numeric font-semibold text-primary dark:text-sky-400 tabular-nums">
            {item.value.toLocaleString()} ({pct}%)
          </span>
        </div>

        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5">
          Includes {item.subItems.length} skills:
        </p>

        <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300 mb-2 font-numeric">
          {previewList.map((sub, i) => (
            <li key={i} className="flex justify-between items-center gap-2">
              <span className="truncate max-w-[140px] font-medium text-slate-700 dark:text-slate-200">
                • {sub.name}
              </span>
              <span className="text-slate-500 dark:text-slate-400 shrink-0 tabular-nums">
                {sub.value.toLocaleString()}
              </span>
            </li>
          ))}
          {remainingCount > 0 && (
            <li className="text-[10px] text-slate-400 dark:text-slate-500 italic pt-0.5">
              + {remainingCount} more skills
            </li>
          )}
        </ul>

        <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-primary dark:text-sky-400 font-semibold">
          <span>Click slice to view all</span>
          <span>→</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 px-3 py-2 rounded-xl shadow-md border border-slate-200/90 dark:border-slate-700/80 text-xs min-w-[152px] font-sans">
      <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-100">{item.name}</div>
      {item.category && (
        <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5 mb-1">
          {item.category}
        </div>
      )}
      <div className="flex items-center justify-between gap-3 mt-1">
        <span className="text-[11px] text-slate-500 dark:text-slate-400">Workers</span>
        <span className="text-[11px] font-numeric font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
          {item.value.toLocaleString()} <span className="text-slate-400 font-normal">({pct}%)</span>
        </span>
      </div>
    </div>
  );
};

const SkillDistributionPieChart = memo(function SkillDistributionPieChart({
  data,
  totalWorkers = 1,
  colors = DEFAULT_COLORS,
  heightClass = 'h-52',
  onSliceClick,
}: SkillDistributionPieChartProps) {
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);
  const animationActive = isChartAnimationActive();

  const handleSliceClick = (entry: SkillDistributionItem) => {
    if (onSliceClick) {
      onSliceClick(entry);
    }
  };

  const getSliceColor = (entry: SkillDistributionItem, index: number) =>
    entry.name === 'Others' ? CHART_PALETTE.others : colors[index % colors.length];

  return (
    <div className="w-full flex flex-col">
      <div className={`${heightClass} w-full min-w-0 relative flex items-center justify-center font-numeric`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              <filter id="pie3dShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#0F172A" floodOpacity="0.18" />
              </filter>
              <filter id="pie3dActiveShadow" x="-25%" y="-25%" width="150%" height="150%">
                <feDropShadow dx="0" dy="7" stdDeviation="5" floodColor="#0F172A" floodOpacity="0.26" />
              </filter>
            </defs>
            <RechartsPie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={56}
              outerRadius={78}
              paddingAngle={2.5}
              stroke="none"
              dataKey="value"
              label={false}
              filter="url(#pie3dShadow)"
              isAnimationActive={animationActive}
              animationBegin={0}
              animationDuration={CHART_ANIMATION.duration}
              animationEasing={CHART_ANIMATION.easing}
              activeIndex={activePieIndex !== null ? activePieIndex : undefined}
              activeShape={renderActiveShape}
              onMouseEnter={(_: any, index: number) => setActivePieIndex(index)}
              onMouseLeave={() => setActivePieIndex(null)}
              onClick={(entry: any) => handleSliceClick(entry)}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getSliceColor(entry, index)}
                  className="cursor-pointer transition-opacity"
                />
              ))}
            </RechartsPie>
            <Tooltip content={<CustomTooltip totalWorkers={totalWorkers} />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Donut Center Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {activePieIndex !== null && data[activePieIndex] ? (
            <>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider max-w-[92px] truncate">
                {data[activePieIndex].name}
              </span>
              <strong className="text-lg font-numeric font-bold text-slate-900 dark:text-slate-100 leading-tight mt-0.5 tabular-nums">
                {((data[activePieIndex].value / (totalWorkers || 1)) * 100).toFixed(0)}%
              </strong>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                {data[activePieIndex].value.toLocaleString()} workers
              </span>
            </>
          ) : (
            <>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
                Top Skill
              </span>
              <strong className="text-xs font-bold text-slate-800 dark:text-slate-100 max-w-[96px] truncate text-center mt-0.5">
                {data[0]?.name || 'N/A'}
              </strong>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                {data[0]?.value ? `${data[0].value.toLocaleString()} workers` : '—'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Compact swatch legend underneath */}
      <div className="flex flex-wrap justify-center gap-x-3.5 gap-y-1.5 mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] font-medium text-slate-600 dark:text-slate-300">
        {data.map((entry, idx) => (
          <button
            key={idx}
            type="button"
            className="inline-flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity focus:outline-none"
            onMouseEnter={() => setActivePieIndex(idx)}
            onMouseLeave={() => setActivePieIndex(null)}
            onClick={() => handleSliceClick(entry)}
            title={entry.subItems ? `Click to view breakdown of ${entry.subItems.length} skills` : undefined}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: getSliceColor(entry, idx) }}
            />
            <span className={activePieIndex === idx ? 'text-slate-900 dark:text-white font-semibold' : ''}>
              {entry.name}
              {entry.subItems && (
                <span className="text-[10px] text-primary dark:text-sky-400 ml-1 font-normal">
                  ({entry.subItems.length})
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
});

export default SkillDistributionPieChart;
