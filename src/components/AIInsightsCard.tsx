import { useState } from "react";
import { ChevronDown, TrendingUp, AlertTriangle, CheckCircle2, Info } from "lucide-react";

export type Severity = "positive" | "neutral" | "concern";

export interface InsightItem {
  text: string;
  severity: Severity;
  supportingData: string;
  sampleSizeWarning?: boolean;
  actionLink?: string | null;
}

export interface InsightsData {
  dataSufficiency: { isLowVolume: boolean; note: string | null };
  keyInsights: InsightItem[];
  trends: InsightItem[];
  areasOfConcern: InsightItem[];
  recommendations: InsightItem[];
}

const severityStyles: Record<Severity, { dot: string; border: string; bg: string; text: string }> = {
  positive: { dot: "bg-accent-mintDeep", border: "border-l-accent-mintDeep", bg: "bg-accent-mint/10", text: "text-accent-mintDeep" },
  neutral: { dot: "bg-accent-skyDeep", border: "border-l-accent-skyDeep", bg: "bg-accent-sky/10", text: "text-accent-skyDeep" },
  concern: { dot: "bg-status-error", border: "border-l-status-error", bg: "bg-status-error/10", text: "text-status-error" },
};

function InsightRow({ item }: { item: InsightItem }) {
  const [expanded, setExpanded] = useState(false);
  const style = severityStyles[item.severity];

  return (
    <div className={`border-l-4 ${style.border} pl-3 py-2 bg-white/40 rounded-r-xl border border-y-white/50 border-r-white/50 transition-all hover:bg-white/60 mb-2`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <span className={`mt-1.5 h-2 w-2 rounded-full ${style.dot} shrink-0`} />
          <p className="text-sm leading-snug font-body text-ink-soft">
            {item.text}
            {item.sampleSizeWarning && (
              <span className="ml-1.5 text-xs font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                low sample size
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="shrink-0 text-ink-muted hover:text-ink p-1 rounded-lg hover:bg-white/80 transition-colors"
          aria-label="Show supporting data"
        >
          <Info size={14} />
        </button>
      </div>
      {expanded && (
        <div className="mt-2 ml-4 text-xs font-body text-ink-muted bg-white/80 p-2.5 rounded-xl border border-white/50 shadow-inner animate-fade-in">
          <strong>Supporting Data:</strong> {item.supportingData}
        </div>
      )}
      {item.actionLink && (
        <a 
          href={item.actionLink} 
          className="ml-4 mt-2 inline-block text-xs font-bold text-primary hover:underline hover:text-primary-dark transition-colors"
        >
          Take action →
        </a>
      )}
    </div>
  );
}

function Section({
  title,
  icon,
  items,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ReactNode;
  items: InsightItem[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (!items || items.length === 0) return null;

  return (
    <div className="border-b border-ink-faint/30 last:border-b-0 py-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-3 text-sm font-semibold font-display text-ink hover:text-primary transition-colors focus:outline-none"
      >
        <span className="flex items-center gap-2 text-ink-soft">{icon}{title}</span>
        <ChevronDown size={16} className={`transition-transform duration-300 text-ink-muted ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-1 pb-3 animate-fade-in">
          {items.map((it, i) => (
            <InsightRow key={i} item={it} />
          ))}
        </div>
      )}
    </div>
  );
}

export function AIInsightsCard({ data, period }: { data: InsightsData; period?: string }) {
  return (
    <div className="rounded-3xl border border-white/50 bg-white/40 p-6 shadow-inner animate-fade-in w-full">
      {period && (
        <div className="mb-4 text-xs font-bold uppercase tracking-wider text-ink-soft bg-white/60 border border-white/50 px-3 py-1.5 rounded-full w-max shadow-sm font-numeric">
          Analyzed Period: {period}
        </div>
      )}

      {data.dataSufficiency?.isLowVolume && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl bg-amber-50/80 border border-amber-200/50 px-4 py-3 text-xs font-body text-amber-700 shadow-sm animate-pulse">
          <AlertTriangle size={15} className="shrink-0" />
          <span>{data.dataSufficiency.note ?? "Low data volume this period — insights may be less reliable."}</span>
        </div>
      )}

      <div className="space-y-1">
        <Section title="Key Insights" icon={<CheckCircle2 size={15} className="text-accent-mintDeep" />} items={data.keyInsights} />
        <Section title="Trends" icon={<TrendingUp size={15} className="text-accent-skyDeep" />} items={data.trends} />
        <Section title="Areas of Concern" icon={<AlertTriangle size={15} className="text-status-error" />} items={data.areasOfConcern} defaultOpen={false} />
        <Section title="Recommendations" icon={<CheckCircle2 size={15} className="text-primary-dark" />} items={data.recommendations} defaultOpen={false} />
      </div>
    </div>
  );
}
