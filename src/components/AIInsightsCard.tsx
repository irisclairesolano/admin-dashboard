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
  ShieldAlert,
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
  iconBg: string;
  iconColor: string;
  accentBorder: string;
  badgeBg: string;
  badgeText: string;
}> = {
  insight: {
    label: 'Key Finding',
    icon: CheckCircle2,
    iconBg: 'from-emerald-500/10 to-emerald-500/20',
    iconColor: 'text-emerald-700',
    accentBorder: 'border-l-emerald-500',
    badgeBg: 'bg-emerald-50 border-emerald-200/80',
    badgeText: 'text-emerald-800',
  },
  trend: {
    label: 'Market Trend',
    icon: TrendingUp,
    iconBg: 'from-sky-500/10 to-sky-500/20',
    iconColor: 'text-sky-700',
    accentBorder: 'border-l-sky-500',
    badgeBg: 'bg-sky-50 border-sky-200/80',
    badgeText: 'text-sky-800',
  },
  concern: {
    label: 'Area of Concern',
    icon: AlertTriangle,
    iconBg: 'from-rose-500/10 to-rose-500/20',
    iconColor: 'text-rose-700',
    accentBorder: 'border-l-rose-500',
    badgeBg: 'bg-rose-50 border-rose-200/80',
    badgeText: 'text-rose-800',
  },
  recommendation: {
    label: 'Action Recommendation',
    icon: Lightbulb,
    iconBg: 'from-amber-500/10 to-amber-500/20',
    iconColor: 'text-amber-700',
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
  const Icon = cfg.icon;

  return (
    <div className={`bg-white/95 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-ink-faint/40 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between border-l-4 ${cfg.accentBorder}`}>
      <div>
        {/* Card Header similar to StatCard */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-body font-bold uppercase tracking-wider border ${cfg.badgeBg} ${cfg.badgeText}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {cfg.label}
            </span>

            {item.sampleSizeWarning && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 shadow-2xs">
                <ShieldAlert className="w-3 h-3 text-amber-600" />
                Low Sample Size
              </span>
            )}
          </div>

          <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br ${cfg.iconBg} flex items-center justify-center flex-shrink-0 shadow-inner`}>
            <Icon className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${cfg.iconColor}`} />
          </div>
        </div>

        {/* Primary Insight Headline / Value */}
        <p className="text-sm font-body font-semibold text-ink leading-relaxed mb-3">
          {item.text}
        </p>
      </div>

      {/* Footer / Supporting Evidence Section */}
      <div className="mt-2 pt-2.5 border-t border-ink-faint/30 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          {item.supportingData ? (
            <button
              type="button"
              onClick={() => setShowData(!showData)}
              className="inline-flex items-center gap-1.5 text-xs font-body font-semibold text-ink-muted hover:text-primary transition-colors cursor-pointer py-1"
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

export function AIInsightsCard({ data, period }: { data?: InsightsData | null; period?: string }) {
  const [activeCategory, setActiveCategory] = useState<'all' | 'insights' | 'trends' | 'concerns' | 'recommendations'>('all');

  const safeData: InsightsData = data || {};
  const keyInsights = safeData.keyInsights || [];
  const trends = safeData.trends || [];
  const areasOfConcern = safeData.areasOfConcern || [];
  const recommendations = safeData.recommendations || [];

  const totalInsights = 
    keyInsights.length + 
    trends.length + 
    areasOfConcern.length + 
    recommendations.length;

  return (
    <div className="w-full rounded-2xl bg-gradient-to-br from-white via-white/95 to-primary-tint/30 border border-primary/20 shadow-sm overflow-hidden animate-fade-in">
      {/* Executive Briefing Banner Header */}
      <div className="relative px-5 py-4 bg-gradient-to-r from-primary to-primary-soft text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-64 bg-radial from-white/10 to-transparent pointer-events-none" />
        
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center text-amber-300 shadow-inner flex-shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-base text-white tracking-wide">
                Gemini Intelligence Executive Briefing
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/15 text-white border border-white/25">
                AI Synthesis
              </span>
            </div>
            <p className="text-xs text-white/80 font-body mt-0.5">
              Automated high-signal analysis of labor market supply, demand shifts, and moderation safety.
            </p>
          </div>
        </div>

        {period && (
          <div className="relative z-10 flex-shrink-0 bg-white/15 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 text-xs font-numeric font-semibold text-white/90 shadow-2xs">
            <span className="text-[10px] uppercase font-body tracking-wider text-white/70 mr-1.5">Period:</span>
            {period}
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Data Sufficiency Notice */}
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
              { id: 'insights', label: 'Key Insights', count: keyInsights.length, icon: CheckCircle2, color: 'text-emerald-600' },
              { id: 'trends', label: 'Market Trends', count: trends.length, icon: TrendingUp, color: 'text-sky-600' },
              { id: 'concerns', label: 'Areas of Concern', count: areasOfConcern.length, icon: AlertTriangle, color: 'text-rose-600' },
              { id: 'recommendations', label: 'Recommendations', count: recommendations.length, icon: Lightbulb, color: 'text-amber-600' },
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
            High-signal platform intelligence cards
          </div>
        </div>

        {/* StatCard-Style Grid Findings */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-3.5">
          {/* 1. Key Insights */}
          {(activeCategory === 'all' || activeCategory === 'insights') &&
            keyInsights.map((item, idx) => (
              <InsightStatCard key={`insight-${idx}`} item={item} category="insight" />
            ))}

          {/* 2. Trends */}
          {(activeCategory === 'all' || activeCategory === 'trends') &&
            trends.map((item, idx) => (
              <InsightStatCard key={`trend-${idx}`} item={item} category="trend" />
            ))}

          {/* 3. Areas of Concern */}
          {(activeCategory === 'all' || activeCategory === 'concerns') &&
            areasOfConcern.map((item, idx) => (
              <InsightStatCard key={`concern-${idx}`} item={item} category="concern" />
            ))}

          {/* 4. Strategic Recommendations */}
          {(activeCategory === 'all' || activeCategory === 'recommendations') &&
            recommendations.map((item, idx) => (
              <InsightStatCard key={`rec-${idx}`} item={item} category="recommendation" />
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
