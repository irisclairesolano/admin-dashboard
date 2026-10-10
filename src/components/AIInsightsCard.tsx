'use client';

import React, { useState } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Lightbulb, 
  ChevronDown, 
  ChevronUp,
  ArrowUpRight,
  Database,
  Layers,
  Info
} from 'lucide-react';

export type Severity = 'positive' | 'neutral' | 'concern';

export interface InsightItem {
  text: string;
  severity?: Severity;
  supportingData?: string;
  sampleSizeWarning?: boolean;
  actionLink?: string | null;
}

export interface InsightsData {
  dataSufficiency?: { isLowVolume?: boolean; note?: string | null };
  keyInsights?: InsightItem[];
  trends?: InsightItem[];
  areasOfConcern?: InsightItem[];
  recommendations?: InsightItem[];
}

const columnConfig = {
  concern: {
    label: 'Problems & Risks',
    shortLabel: 'Problems',
    icon: AlertTriangle,
    accentBorder: 'border-l-rose-500',
    headerBg: 'bg-rose-50/80 text-rose-800 border-rose-200/80',
    badgeText: 'text-rose-700 bg-rose-100',
    dotColor: 'bg-rose-500',
  },
  recommendation: {
    label: 'Strategic Actions',
    shortLabel: 'Suggestions',
    icon: Lightbulb,
    accentBorder: 'border-l-amber-500',
    headerBg: 'bg-amber-50/80 text-amber-800 border-amber-200/80',
    badgeText: 'text-amber-700 bg-amber-100',
    dotColor: 'bg-amber-500',
  },
  insight: {
    label: 'Key Findings',
    shortLabel: 'Findings',
    icon: CheckCircle2,
    accentBorder: 'border-l-emerald-500',
    headerBg: 'bg-emerald-50/80 text-emerald-800 border-emerald-200/80',
    badgeText: 'text-emerald-700 bg-emerald-100',
    dotColor: 'bg-emerald-500',
  },
  trend: {
    label: 'Market Shifts',
    shortLabel: 'Changes',
    icon: TrendingUp,
    accentBorder: 'border-l-sky-500',
    headerBg: 'bg-sky-50/80 text-sky-800 border-sky-200/80',
    badgeText: 'text-sky-700 bg-sky-100',
    dotColor: 'bg-sky-500',
  },
};

function CompactInsightCard({ 
  item, 
  category 
}: { 
  item: InsightItem; 
  category: 'insight' | 'trend' | 'concern' | 'recommendation';
}) {
  const [showData, setShowData] = useState(false);
  const cfg = columnConfig[category];

  return (
    <div className={`bg-white rounded-xl p-3 border border-ink-faint/50 shadow-2xs hover:shadow-xs transition-all duration-150 border-l-[3.5px] ${cfg.accentBorder} flex flex-col justify-between group`}>
      <div>
        <p className="text-xs font-body font-semibold text-ink leading-relaxed">
          {item.text}
        </p>
      </div>

      <div className="mt-2 pt-2 border-t border-ink-faint/25 flex flex-col gap-1.5 text-[11px]">
        <div className="flex items-center justify-between gap-1.5">
          {item.supportingData ? (
            <button
              type="button"
              onClick={() => setShowData(!showData)}
              className="inline-flex items-center gap-1 text-[10px] font-body font-semibold text-ink-muted hover:text-ink px-1.5 py-0.5 rounded border border-ink-faint/50 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Database className="w-2.5 h-2.5" />
              <span>{showData ? 'Hide Evidence' : 'Evidence'}</span>
              {showData ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
            </button>
          ) : (
            <span className="text-[10px] text-ink-muted/70 flex items-center gap-1">
              <Info className="w-2.5 h-2.5" /> Baseline
            </span>
          )}

          {item.actionLink && (
            <a
              href={item.actionLink}
              className="inline-flex items-center gap-1 text-[10px] font-body font-bold text-primary hover:text-primary-dark hover:underline transition-colors ml-auto py-0.5"
            >
              <span>Action</span>
              <ArrowUpRight className="w-2.5 h-2.5" />
            </a>
          )}
        </div>

        {showData && item.supportingData && (
          <div className="p-2 rounded-lg bg-slate-50 border border-ink-faint/50 text-[10px] font-mono text-ink-soft leading-normal animate-fade-in break-words">
            <span className="font-bold text-ink-muted uppercase tracking-wider text-[8px] block mb-0.5">Underlying Metrics</span>
            {item.supportingData}
          </div>
        )}
      </div>
    </div>
  );
}

function isTestDataConcern(item: InsightItem): boolean {
  const lower = item.text.toLowerCase();
  return lower.includes('test data') || lower.includes('likely test') || lower.includes('test/placeholder') || lower.includes('placeholder data');
}

export function AIInsightsCard({ 
  data, 
  period,
  cached,
  generatedAt,
}: { 
  data?: InsightsData | null; 
  period?: string;
  cached?: boolean;
  generatedAt?: Date | null;
}) {
  const [activeCategory, setActiveCategory] = useState<'all' | 'concerns' | 'recommendations' | 'insights' | 'trends'>('all');

  const safeData: InsightsData = data || {};
  const keyInsights = safeData.keyInsights || [];
  const trends = safeData.trends || [];
  const allConcerns = safeData.areasOfConcern || [];
  const recommendations = safeData.recommendations || [];

  const testDataConcerns = allConcerns.filter(isTestDataConcern);
  const areasOfConcern = allConcerns.filter(item => !isTestDataConcern(item));

  const totalInsights = 
    keyInsights.length + 
    trends.length + 
    allConcerns.length + 
    recommendations.length;

  const generatedAtLabel = (() => {
    if (!generatedAt) return null;
    const diffMs = Date.now() - generatedAt.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin === 1) return '1 min ago';
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHr = Math.floor(diffMin / 60);
    return `${diffHr}h ago`;
  })();

  const categories = [
    { id: 'all' as const, label: 'All Pillars', count: totalInsights, icon: Layers },
    { id: 'concerns' as const, label: 'Problems', count: allConcerns.length, icon: AlertTriangle, color: 'text-rose-600' },
    { id: 'recommendations' as const, label: 'Suggestions', count: recommendations.length, icon: Lightbulb, color: 'text-amber-600' },
    { id: 'insights' as const, label: 'Findings', count: keyInsights.length, icon: CheckCircle2, color: 'text-emerald-600' },
    { id: 'trends' as const, label: 'Changes', count: trends.length, icon: TrendingUp, color: 'text-sky-600' },
  ];

  return (
    <div className="w-full rounded-2xl bg-white border border-ink-faint/50 shadow-sm overflow-hidden animate-fade-in flex flex-col">
      {/* 1. COMPACT TOP HEADER */}
      <div className="px-4 py-3 bg-slate-50/90 border-b border-ink-faint/40 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-sm text-ink tracking-tight">
                AI Platform Intelligence
              </h3>
              <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 font-numeric">
                {totalInsights} Insights
              </span>
            </div>
            <p className="text-[11px] text-ink-muted font-body leading-none mt-0.5">
              Live executive summary of labor dynamics, platform safety, and strategic steps.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 text-xs">
          {period && (
            <div className="px-2.5 py-1 rounded-lg border border-ink-faint/60 bg-white text-[11px] font-numeric font-semibold text-ink-soft shadow-2xs">
              <span className="text-[9px] uppercase font-body tracking-wider text-ink-muted mr-1">Period:</span>
              {period}
            </div>
          )}
          {generatedAtLabel && (
            <span className="text-[10px] text-ink-muted font-body">
              {cached ? '(cached)' : 'Updated'} {generatedAtLabel}
            </span>
          )}
        </div>
      </div>

      {/* 2. COMPACT ALERT STRIPS (Single Line) */}
      {(testDataConcerns.length > 0 || safeData.dataSufficiency?.isLowVolume) && (
        <div className="px-4 pt-2.5 space-y-1.5">
          {testDataConcerns.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-status-error/8 border border-status-error/20 text-[11px] font-body text-ink">
              <AlertTriangle className="w-3.5 h-3.5 text-status-error flex-shrink-0" />
              <span className="font-bold text-status-error">Notice:</span>
              <span className="text-ink-soft truncate">
                {testDataConcerns.map(item => item.text).join(' · ')}
              </span>
            </div>
          )}

          {safeData.dataSufficiency?.isLowVolume && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-[11px] font-body text-amber-900">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
              <span className="font-bold text-amber-800">Early Signal:</span>
              <span className="truncate">{safeData.dataSufficiency.note ?? 'Limited activity in this window. Findings represent early trends.'}</span>
            </div>
          )}
        </div>
      )}

      {/* 3. CATEGORY SWITCHER BAR */}
      <div className="px-4 py-2 border-b border-ink-faint/30 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
          {categories.map(({ id, label, count, icon: Icon, color }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveCategory(id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-body font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeCategory === id
                  ? 'bg-ink text-white shadow-2xs'
                  : 'bg-slate-50 border border-ink-faint/50 text-ink-soft hover:text-ink hover:bg-slate-100'
              }`}
            >
              <Icon className={`w-3 h-3 ${activeCategory === id ? 'text-white' : color || 'text-ink-muted'}`} />
              <span>{label}</span>
              {count > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                  activeCategory === id ? 'bg-white/20 text-white' : 'bg-ink-faint/50 text-ink-muted'
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        <span className="text-[10px] text-ink-muted font-body hidden md:inline">
          {activeCategory === 'all' ? '4-Pillar Synchronized Deck' : `Filtered by ${activeCategory}`}
        </span>
      </div>

      {/* 4. MAIN DECK VIEWPORT (Fits in 1 screen view with max-h and column scrolling) */}
      <div className="p-3.5 sm:p-4 bg-slate-50/40">
        {activeCategory === 'all' ? (
          /* 4-COLUMN SYNCHRONIZED DECK */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Column 1: Problems & Risks */}
            <div className="flex flex-col bg-slate-100/60 rounded-xl p-2.5 border border-slate-200/80">
              <div className="flex items-center justify-between px-1 mb-2">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span className="text-xs font-bold text-ink">Problems</span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700">
                  {allConcerns.length}
                </span>
              </div>
              <div className="max-h-[380px] overflow-y-auto space-y-2 pr-0.5 custom-scrollbar">
                {allConcerns.length === 0 ? (
                  <div className="p-4 text-center text-[11px] text-ink-muted italic">No issues detected</div>
                ) : (
                  allConcerns.map((item, idx) => (
                    <CompactInsightCard key={`concern-${idx}`} item={item} category="concern" />
                  ))
                )}
              </div>
            </div>

            {/* Column 2: Suggestions */}
            <div className="flex flex-col bg-slate-100/60 rounded-xl p-2.5 border border-slate-200/80">
              <div className="flex items-center justify-between px-1 mb-2">
                <div className="flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-xs font-bold text-ink">Suggestions</span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-700">
                  {recommendations.length}
                </span>
              </div>
              <div className="max-h-[380px] overflow-y-auto space-y-2 pr-0.5 custom-scrollbar">
                {recommendations.length === 0 ? (
                  <div className="p-4 text-center text-[11px] text-ink-muted italic">No suggestions</div>
                ) : (
                  recommendations.map((item, idx) => (
                    <CompactInsightCard key={`rec-${idx}`} item={item} category="recommendation" />
                  ))
                )}
              </div>
            </div>

            {/* Column 3: Findings */}
            <div className="flex flex-col bg-slate-100/60 rounded-xl p-2.5 border border-slate-200/80">
              <div className="flex items-center justify-between px-1 mb-2">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-xs font-bold text-ink">Findings</span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-700">
                  {keyInsights.length}
                </span>
              </div>
              <div className="max-h-[380px] overflow-y-auto space-y-2 pr-0.5 custom-scrollbar">
                {keyInsights.length === 0 ? (
                  <div className="p-4 text-center text-[11px] text-ink-muted italic">No findings recorded</div>
                ) : (
                  keyInsights.map((item, idx) => (
                    <CompactInsightCard key={`insight-${idx}`} item={item} category="insight" />
                  ))
                )}
              </div>
            </div>

            {/* Column 4: Market Changes */}
            <div className="flex flex-col bg-slate-100/60 rounded-xl p-2.5 border border-slate-200/80">
              <div className="flex items-center justify-between px-1 mb-2">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-sky-600" />
                  <span className="text-xs font-bold text-ink">Changes</span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-sky-100 text-sky-700">
                  {trends.length}
                </span>
              </div>
              <div className="max-h-[380px] overflow-y-auto space-y-2 pr-0.5 custom-scrollbar">
                {trends.length === 0 ? (
                  <div className="p-4 text-center text-[11px] text-ink-muted italic">No trend shifts</div>
                ) : (
                  trends.map((item, idx) => (
                    <CompactInsightCard key={`trend-${idx}`} item={item} category="trend" />
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          /* FOCUSED VIEW (For specific selected category) */
          <div className="max-h-[380px] overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeCategory === 'concerns' &&
                allConcerns.map((item, idx) => (
                  <CompactInsightCard key={`focus-concern-${idx}`} item={item} category="concern" />
                ))}
              {activeCategory === 'recommendations' &&
                recommendations.map((item, idx) => (
                  <CompactInsightCard key={`focus-rec-${idx}`} item={item} category="recommendation" />
                ))}
              {activeCategory === 'insights' &&
                keyInsights.map((item, idx) => (
                  <CompactInsightCard key={`focus-insight-${idx}`} item={item} category="insight" />
                ))}
              {activeCategory === 'trends' &&
                trends.map((item, idx) => (
                  <CompactInsightCard key={`focus-trend-${idx}`} item={item} category="trend" />
                ))}
            </div>
          </div>
        )}

        {totalInsights === 0 && (
          <div className="py-8 text-center bg-white rounded-xl border border-ink-faint/30">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
            <h4 className="font-display font-bold text-ink text-xs">Platform Running Smoothly</h4>
            <p className="text-[11px] text-ink-muted mt-0.5 max-w-sm mx-auto">
              No anomalies or critical issues detected for this reporting window.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
