'use client';

import { useState } from 'react';
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

const categoryConfig: Record<'insight' | 'trend' | 'concern' | 'recommendation', {
  label: string;
  icon: typeof CheckCircle2;
  accentBorder: string;
  badgeBg: string;
  badgeText: string;
}> = {
  insight: {
    label: 'Key Finding',
    icon: CheckCircle2,
    accentBorder: 'border-l-emerald-500',
    badgeBg: 'bg-emerald-50 border-emerald-200/80',
    badgeText: 'text-emerald-800',
  },
  trend: {
    label: 'Market Trend',
    icon: TrendingUp,
    accentBorder: 'border-l-sky-500',
    badgeBg: 'bg-sky-50 border-sky-200/80',
    badgeText: 'text-sky-800',
  },
  concern: {
    label: 'Area of Concern',
    icon: AlertTriangle,
    accentBorder: 'border-l-rose-500',
    badgeBg: 'bg-rose-50 border-rose-200/80',
    badgeText: 'text-rose-800',
  },
  recommendation: {
    label: 'Action Recommendation',
    icon: Lightbulb,
    accentBorder: 'border-l-amber-500',
    badgeBg: 'bg-amber-50 border-amber-200/80',
    badgeText: 'text-amber-800',
  },
};

function InsightStatCard({ 
  item, 
  category 
}: { 
  item: InsightItem; 
  category: 'insight' | 'trend' | 'concern' | 'recommendation';
}) {
  const [showData, setShowData] = useState(false);
  const cfg = categoryConfig[category] || categoryConfig.insight;

  return (
    <div className={`bg-white rounded-xl p-3.5 border border-ink-faint/40 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between border-l-4 ${cfg.accentBorder}`}>
      <div>
        {/* Card Header — badge only, no icon-in-circle */}
        <div className="flex items-center gap-2 flex-wrap mb-2.5">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-body font-bold uppercase tracking-wider border ${cfg.badgeBg} ${cfg.badgeText}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {cfg.label}
          </span>
        </div>

        {/* Primary Insight Text */}
        <p className="text-sm font-body font-semibold text-ink leading-relaxed mb-3">
          {item.text}
        </p>
      </div>

      {/* Footer / Evidence */}
      <div className="mt-2 pt-2.5 border-t border-ink-faint/30 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          {item.supportingData ? (
            <button
              type="button"
              onClick={() => setShowData(!showData)}
              className="inline-flex items-center gap-1.5 text-xs font-body font-semibold text-ink-soft border border-ink-faint/60 bg-white px-2.5 py-1 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              title="Inspect statistical telemetry supporting this finding"
            >
              <Database className="w-3.5 h-3.5" />
              <span>{showData ? 'Hide Evidence' : 'View Evidence'}</span>
              {showData ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          ) : (
            <span className="text-[11px] text-ink-muted/80 flex items-center gap-1">
              <Info className="w-3 h-3" /> System baseline insight
            </span>
          )}

          {item.actionLink && (
            <a
              href={item.actionLink}
              className="inline-flex items-center gap-1 text-xs font-body font-bold text-primary hover:text-primary-dark hover:underline transition-colors ml-auto py-1"
            >
              <span>Take Action</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {showData && item.supportingData && (
          <div className="p-3 rounded-xl bg-slate-50/90 border border-ink-faint/60 text-xs font-mono text-ink-soft leading-relaxed animate-fade-in shadow-inner">
            <span className="font-bold text-ink-muted uppercase tracking-wider text-[9px] block mb-1">Telemetry Metrics</span>
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
  const [activeCategory, setActiveCategory] = useState<'all' | 'insights' | 'trends' | 'concerns' | 'recommendations'>('all');

  const safeData: InsightsData = data || {};
  const keyInsights = safeData.keyInsights || [];
  const trends = safeData.trends || [];
  const allConcerns = safeData.areasOfConcern || [];
  const recommendations = safeData.recommendations || [];

  // Separate test-data flag items from regular concerns
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

  return (
    <div className="w-full rounded-2xl bg-white border border-ink-faint/40 shadow-sm overflow-hidden animate-fade-in">
      {/* Flat Header — matches rest of app design language */}
      <div className="px-5 py-4 bg-slate-50 border-b border-ink-faint/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-ink tracking-wide">
              AI Insights
            </h3>
            <p className="text-xs text-ink-muted font-body mt-0.5">
              Automated analysis of labor market supply, demand shifts, and moderation safety.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {period && (
            <div className="px-3 py-1.5 rounded-xl border border-ink-faint/60 bg-white text-xs font-numeric font-semibold text-ink-soft shadow-2xs">
              <span className="text-[10px] uppercase font-body tracking-wider text-ink-muted mr-1.5">Period:</span>
              {period}
            </div>
          )}
          {generatedAtLabel && (
            <span className="text-[10px] text-ink-muted font-body">
              {cached ? '(cached)' : 'Generated'} {generatedAtLabel}
            </span>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Test Data Alert — top-priority banner, above everything else */}
        {testDataConcerns.length > 0 && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-status-error/8 border border-status-error/25 text-xs font-body shadow-2xs">
            <AlertTriangle className="w-4 h-4 text-status-error flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-status-error mr-1.5">Data Integrity Notice:</span>
              {testDataConcerns.map((item, i) => (
                <span key={i} className="text-ink-soft">{item.text}{i < testDataConcerns.length - 1 ? ' · ' : ''}</span>
              ))}
              <span className="block text-ink-muted mt-0.5 italic">Statistics on this page may not reflect real-world conditions.</span>
            </div>
          </div>
        )}

        {/* Statistical Variance Notice */}
        {safeData.dataSufficiency?.isLowVolume && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-900 text-xs font-body shadow-2xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-800 mr-1.5">Statistical Variance Notice:</span>
              <span>{safeData.dataSufficiency.note ?? 'Data sample is limited for this period. Metric trends represent early directional signals.'}</span>
            </div>
          </div>
        )}

        {/* Category Navigation Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-faint/30 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'All Insights', count: totalInsights, icon: Layers },
              { id: 'concerns', label: 'Concerns', count: allConcerns.length, icon: AlertTriangle, color: 'text-rose-600' },
              { id: 'recommendations', label: 'Recommendations', count: recommendations.length, icon: Lightbulb, color: 'text-amber-600' },
              { id: 'insights', label: 'Key Findings', count: keyInsights.length, icon: CheckCircle2, color: 'text-emerald-600' },
              { id: 'trends', label: 'Trends', count: trends.length, icon: TrendingUp, color: 'text-sky-600' },
            ].map(({ id, label, count, icon: Icon, color }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveCategory(id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-body font-semibold transition-all cursor-pointer ${
                  activeCategory === id
                    ? 'bg-ink text-white shadow-2xs'
                    : 'bg-white border border-ink-faint/50 text-ink-soft hover:text-ink hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${activeCategory === id ? 'text-white' : color || 'text-ink-muted'}`} />
                <span>{label}</span>
                {count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    activeCategory === id ? 'bg-white/20 text-white' : 'bg-ink-faint/60 text-ink-muted'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="text-[11px] font-body text-ink-muted hidden sm:block">
            High-signal platform intelligence
          </div>
        </div>

        {/* Urgency-ordered card grid — Concerns → Recs → Key Findings → Trends */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3.5">
          {/* 1. Areas of Concern (non-test-data) — highest urgency */}
          {(activeCategory === 'all' || activeCategory === 'concerns') &&
            areasOfConcern.map((item, idx) => (
              <InsightStatCard key={`concern-${idx}`} item={item} category="concern" />
            ))}

          {/* 2. Recommendations */}
          {(activeCategory === 'all' || activeCategory === 'recommendations') &&
            recommendations.map((item, idx) => (
              <InsightStatCard key={`rec-${idx}`} item={item} category="recommendation" />
            ))}

          {/* 3. Key Findings */}
          {(activeCategory === 'all' || activeCategory === 'insights') &&
            keyInsights.map((item, idx) => (
              <InsightStatCard key={`insight-${idx}`} item={item} category="insight" />
            ))}

          {/* 4. Market Trends — lowest urgency */}
          {(activeCategory === 'all' || activeCategory === 'trends') &&
            trends.map((item, idx) => (
              <InsightStatCard key={`trend-${idx}`} item={item} category="trend" />
            ))}
        </div>

        {totalInsights === 0 && (
          <div className="py-12 text-center bg-white/70 rounded-xl border border-ink-faint/30">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h4 className="font-display font-bold text-ink text-sm">No Anomalies or Trends Identified</h4>
            <p className="text-xs text-ink-muted mt-1 max-w-sm mx-auto">
              System metrics for this period are within standard equilibrium with no urgent concerns flagged.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
