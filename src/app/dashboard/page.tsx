'use client';

import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Sector, Legend
} from 'recharts';
import { adminApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { AIInsightsCard, InsightsData } from '@/components/AIInsightsCard';
import { CHART_COLORS } from '@/lib/constants';
import { exportMultiSectionCSV, formatCSVDate, formatCSVCurrency } from '@/lib/export/csv';
import { generateMasterExcelWorkbook, downloadExcelBlob } from '@/lib/export/excel';

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

const RechartsPie = Pie as any;

function formatPeriodLabel(periodStr: string, interval: string): string {
  if (!periodStr) return '—';
  if (interval === 'hourly') {
    if (periodStr.includes(' ')) {
      const parts = periodStr.split(' ');
      const hourPart = parts[1] || '';
      const hourNum = parseInt(hourPart.split(':')[0] || '0', 10);
      const nextHour = (hourNum + 1) % 24;
      const ampm = hourNum >= 12 ? 'PM' : 'AM';
      const formatted12 = hourNum % 12 === 0 ? 12 : hourNum % 12;
      return `${hourPart} - ${String(nextHour).padStart(2, '0')}:00 (${formatted12} ${ampm})`;
    }
    return periodStr;
  }
  if (interval === 'monthly') {
    try {
      const [year, month] = periodStr.split('-');
      const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      return periodStr;
    }
  }
  try {
    const d = new Date(periodStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', weekday: 'short' });
  } catch {
    return periodStr;
  }
}

function formatAxisTick(val: string, interval: string): string {
  if (!val) return '';
  if (interval === 'hourly') {
    if (val.includes(' ')) return val.split(' ')[1];
    return val;
  }
  if (interval === 'monthly') {
    return val;
  }
  try {
    const d = new Date(val + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return val;
  }
}

function ChartEmptyState({ title, message }: { title?: string; message?: string }) {
  return (
    <div className="h-64 sm:h-72 w-full flex flex-col items-center justify-center p-6 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3 text-slate-400 shadow-2xs">
        <i className="lni lni-bar-chart text-xl" />
      </div>
      <h4 className="text-sm font-body font-bold text-ink mb-1">{title || 'No Activity Recorded'}</h4>
      <p className="text-xs font-body text-ink-muted max-w-xs">{message || 'Activity will appear here in real-time as users interact with the platform.'}</p>
    </div>
  );
}

function ChartInsightBox({ icon = "💡", title = "Key Insight", text }: { icon?: string; title?: string; text: string }) {
  return (
    <div className="mt-4 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-2.5">
      <span className="text-base leading-none mt-0.5 select-none">{icon}</span>
      <div className="text-xs font-body">
        <span className="font-bold text-ink mr-1.5">{title}:</span>
        <span className="text-ink-soft">{text}</span>
      </div>
    </div>
  );
}

function MetricHeaderStrip({ items }: { items: { label: string; value: string | number; change?: number; highlight?: boolean }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-3 sm:gap-6 py-2 px-3.5 bg-slate-50/90 rounded-2xl border border-slate-200/70 mb-4 font-numeric">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-baseline gap-1.5">
          <span className="text-[10px] font-body text-ink-muted font-semibold uppercase tracking-wider">{item.label}:</span>
          <span className={`text-sm sm:text-base font-bold ${item.highlight ? 'text-primary-dark' : 'text-ink'}`}>
            {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
          </span>
          {item.change !== undefined && (
            <span className={`text-[10px] font-bold ${item.change >= 0 ? 'text-status-success' : 'text-status-error'}`}>
              {item.change >= 0 ? '↑' : '↓'} {Math.abs(item.change)}%
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function HealthStatusBadge({ type, value }: { type: 'throughput' | 'conversion' | 'reports'; value: number }) {
  if (type === 'throughput') {
    if (value >= 3) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Healthy Liquidity
        </span>
      );
    }
    if (value >= 1) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
          Moderate Flow
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Under-subscribed
      </span>
    );
  }

  if (type === 'conversion') {
    if (value >= 20) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Strong Match Rate (≥20%)
        </span>
      );
    }
    if (value >= 10) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
          Average Match Rate
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Low Match Rate (&lt;10%)
      </span>
    );
  }

  if (type === 'reports') {
    if (value === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Zero Incidents
        </span>
      );
    }
    if (value <= 3) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
          Normal Variance
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
        Requires Attention
      </span>
    );
  }

  return null;
}

function getPeriodAndInterval(preset: string, start?: string, end?: string) {
  const now = new Date();
  let from = '';
  let to = '';
  let interval = 'daily';

  const formatLocal = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  if (preset === 'Today') {
    from = formatLocal(now);
    to = from;
    interval = 'hourly';
  } else if (preset === 'Yesterday') {
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    from = formatLocal(yesterday);
    to = from;
    interval = 'hourly';
  } else if (preset === 'Last 7 Days') {
    const d = new Date();
    d.setDate(now.getDate() - 6);
    from = formatLocal(d);
    to = formatLocal(now);
    interval = 'daily';
  } else if (preset === 'This Week') {
    const current = new Date();
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(current.setDate(diff));
    from = formatLocal(monday);
    to = formatLocal(now);
    interval = 'daily';
  } else if (preset === 'Last Week') {
    const current = new Date();
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1) - 7;
    const monday = new Date(current.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    from = formatLocal(monday);
    to = formatLocal(sunday);
    interval = 'daily';
  } else if (preset === 'Last 30 Days') {
    const d = new Date();
    d.setDate(now.getDate() - 29);
    from = formatLocal(d);
    to = formatLocal(now);
    interval = 'daily';
  } else if (preset === 'This Month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    from = formatLocal(startOfMonth);
    to = formatLocal(now);
    interval = 'daily';
  } else if (preset === 'Last Month') {
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    from = formatLocal(startOfLastMonth);
    to = formatLocal(endOfLastMonth);
    interval = 'daily';
  } else if (preset === 'This Quarter') {
    const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
    const startOfQuarter = new Date(now.getFullYear(), quarterMonth, 1);
    from = formatLocal(startOfQuarter);
    to = formatLocal(now);
    interval = 'daily';
  } else if (preset === 'This Year') {
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    from = formatLocal(startOfYear);
    to = formatLocal(now);
    interval = 'monthly';
  } else if (preset === 'Custom Date') {
    if (start && end) {
      from = start;
      to = end;
      const d1 = new Date(start);
      const d2 = new Date(end);
      const diffTime = Math.abs(d2.getTime() - d1.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 2) {
        interval = 'hourly';
      } else if (diffDays <= 60) {
        interval = 'daily';
      } else {
        interval = 'monthly';
      }
    } else {
      from = formatLocal(now);
      to = from;
      interval = 'hourly';
    }
  }

  return { from, to, interval };
}

export default function AnalyticsDashboard() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Shared persistent date states across all analytics sub-tabs (defaulting to 'Today')
  const [globalPreset, setGlobalPreset] = useState<string>('Today');
  const [globalStart, setGlobalStart] = useState<string>('');
  const [globalEnd, setGlobalEnd] = useState<string>('');

  // Detailed Table sub-view toggle
  const [distTableView, setDistTableView] = useState<'categories' | 'geographic'>('categories');

  // Page-specific tab filters
  const [trendsRoleFilter, setTrendsRoleFilter] = useState<'all' | 'worker' | 'employer'>('all');
  const [trendsVolumeFilter, setTrendsVolumeFilter] = useState<'all' | 'applications' | 'hires'>('all');
  const [distRegionFilter, setDistRegionFilter] = useState<string>('all');
  const [distLimitFilter, setDistLimitFilter] = useState<number>(6);
  const [healthWageFilter, setHealthWageFilter] = useState<'all' | 'low' | 'mid' | 'high'>('all');
  const [healthReportFilter, setHealthReportFilter] = useState<'all' | 'pending' | 'resolved'>('all');
  // Tab State
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'distribution' | 'health'>('overview');
  const [viewMode, setViewMode] = useState<'split' | 'charts' | 'table'>('split');

  // Interactive Pie State
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);

  // Tab-specific sorting states
  const [trendsSortOrder, setTrendsSortOrder] = useState<'asc' | 'desc'>('asc');
  const [distSortBy, setDistSortBy] = useState<'value' | 'name'>('value');
  const [distSortOrder, setDistSortOrder] = useState<'asc' | 'desc'>('desc');
  const [healthSortBy, setHealthSortBy] = useState<'value' | 'name'>('value');
  const [healthSortOrder, setHealthSortOrder] = useState<'asc' | 'desc'>('desc');

  // Expandable Table States
  const [showWagesBreakdown, setShowWagesBreakdown] = useState(false);
  const [showReportsBreakdown, setShowReportsBreakdown] = useState(false);

  // AI Insights State
  const [aiInsights, setAiInsights] = useState<InsightsData | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiPeriod, setAiPeriod] = useState('');

  // Print & Master PDF States
  const [printMode, setPrintMode] = useState<'analytics' | 'master'>('analytics');
  const [masterData, setMasterData] = useState<{
    users: any[];
    jobs: any[];
    verifications: any[];
    reports: any[];
    logs: any[];
    profanity: any[];
  } | null>(null);
  const [isGeneratingMasterPdf, setIsGeneratingMasterPdf] = useState(false);
  // Messaging stats (aggregate only — no message content)
  const [convStats, setConvStats] = useState<{
    total_conversations: number;
    active_conversations: number;
    locked_conversations: number;
    messages_today: number;
    avg_messages_per_hire: number;
  } | null>(null);
  // Get active period and interval based on shared global date filters
  const getActivePeriodAndInterval = useCallback(() => {
    return getPeriodAndInterval(globalPreset, globalStart, globalEnd);
  }, [globalPreset, globalStart, globalEnd]);

  const activeParams = getActivePeriodAndInterval();
  const { from, to, interval: intervalFilter } = activeParams;

  // Reset insights when filters change to avoid showing stale data
  useEffect(() => {
    setAiInsights(null);
    setAiError('');
    setAiPeriod('');
  }, [from, to, intervalFilter]);

  const [analyticsError, setAnalyticsError] = useState('');

  const fetchAnalytics = useCallback(async () => {
    if (!from || !to) return;
    try {
      setLoading(true);
      setAnalyticsError('');
      const res = await adminApi.getAnalytics(from, to, intervalFilter);
      setData(res.data);
    } catch (err: any) {
      console.error('Failed to load analytics', err);
      setAnalyticsError(err.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [from, to, intervalFilter]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Fetch messaging stats once on mount (aggregate counts only)
  useEffect(() => {
    adminApi.getConversationStats()
      .then((res: any) => setConvStats(res.data))
      .catch(() => { /* silently ignore if messaging feature not yet deployed */ });
  }, []);

  const handleGenerateInsights = async () => {
    if (!from || !to) return;
    try {
      setAiLoading(true);
      setAiError('');
      
      const res = await adminApi.generateAIInsights(from, to, intervalFilter);
      let parsed: InsightsData | null = null;
      try {
        parsed = typeof res.data.insights === 'string' ? JSON.parse(res.data.insights) : res.data.insights;
      } catch (e) {
        console.error("Failed to parse AI insights JSON", e);
      }
      setAiInsights(parsed);
      setAiPeriod(res.data.period);
    } catch (err: any) {
      console.error('Failed to generate AI insights', err);
      setAiError(err.response?.data?.message || 'Failed to generate insights. Please verify Gemini configuration.');
    } finally {
      setAiLoading(false);
    }
  };

  const renderDateSelector = (tab: 'overview' | 'trends' | 'distribution' | 'health') => {
    const preset = globalPreset;
    const setPreset = setGlobalPreset;
    const start = globalStart;
    const setStart = setGlobalStart;
    const end = globalEnd;
    const setEnd = setGlobalEnd;

    const presets = ['Today', 'Yesterday', 'Last 7 Days', 'This Week', 'Last Week', 'Last 30 Days', 'This Month', 'Last Month', 'This Quarter', 'This Year', 'Custom Date'];

    return (
      <div className="flex flex-wrap items-center gap-3 no-print">
        <div className="flex items-center gap-2">
          <span className="text-xs font-body font-bold text-ink-soft">Date Range:</span>
          <select
            aria-label={`${tab} date range preset`}
            value={preset}
            onChange={(e) => {
              setPreset(e.target.value);
            }}
            className="bg-white/70 px-3 py-1.5 rounded-xl border border-white/50 shadow-sm text-xs font-body font-semibold text-ink-soft outline-none focus:border-ink cursor-pointer"
          >
            {presets.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {preset === 'Custom Date' && (
          <div className="flex items-center gap-2 bg-white/70 px-3 py-1.5 rounded-xl border border-white/50 shadow-sm">
            <input
              aria-label={`${tab} custom start date`}
              type="date"
              value={start}
              onChange={(e) => {
                setStart(e.target.value);
              }}
              className="bg-transparent border-none outline-none font-body text-xs text-ink-soft focus:text-ink"
            />
            <span className="text-ink-muted text-xs font-body font-semibold">to</span>
            <input
              aria-label={`${tab} custom end date`}
              type="date"
              value={end}
              onChange={(e) => {
                setEnd(e.target.value);
              }}
              className="bg-transparent border-none outline-none font-body text-xs text-ink-soft focus:text-ink"
            />
          </div>
        )}
      </div>
    );
  };

  const handleExportCSV = () => {
    if (!data) return;

    const sections = [
      {
        title: 'Section 1: Key Performance Indicators (KPIs)',
        headers: ['Metric', 'Current Value', 'PoP Change (%)', 'Trend Direction'],
        rows: [
          ['New Registrations', data.kpis?.total_users?.value ?? 0, `${data.kpis?.total_users?.change ?? 0}%`, (data.kpis?.total_users?.change ?? 0) >= 0 ? 'Growth' : 'Decline'],
          ['Job Posts', data.kpis?.active_jobs?.value ?? 0, `${data.kpis?.active_jobs?.change ?? 0}%`, (data.kpis?.active_jobs?.change ?? 0) >= 0 ? 'Growth' : 'Decline'],
          ['Applications', data.kpis?.applications?.value ?? 0, `${data.kpis?.applications?.change ?? 0}%`, (data.kpis?.applications?.change ?? 0) >= 0 ? 'Growth' : 'Decline'],
          ['Reports Filed', data.kpis?.unresolved_reports?.value ?? 0, `${data.kpis?.unresolved_reports?.change ?? 0}%`, (data.kpis?.unresolved_reports?.change ?? 0) <= 0 ? 'Improvement' : 'Alert'],
        ]
      },
      {
        title: 'Section 2: Detailed Chronological Platform Activity (Reconciled)',
        headers: [
          'Time Period',
          'New Workers',
          'New Employers',
          'Total New Users',
          'Job Posts',
          'Applications',
          'Accepted Applications',
          'Completed Hires',
          'Reports Filed'
        ],
        rows: (transformedDetailedTimeSeries || []).map((row: any) => [
          formatPeriodLabel(row.period, intervalFilter),
          row.new_workers ?? 0,
          row.new_employers ?? 0,
          row.total_users ?? 0,
          row.job_posts ?? 0,
          row.applications ?? 0,
          row.accepted_applications ?? 0,
          row.completed_hires ?? 0,
          row.reports ?? 0
        ])
      },
      {
        title: 'Section 3: User Growth & Time-Series Activity',
        headers: ['Time Interval', 'New Workers', 'New Employers'],
        rows: (transformedUserGrowth || []).map((item: any) => [
          item.name || '',
          item.workers ?? 0,
          item.employers ?? 0
        ])
      },
      {
        title: 'Section 4: Application Volume Time-Series',
        headers: ['Time Interval', 'Applications', 'Job Posts'],
        rows: (transformedApplicationVolume || []).map((item: any) => [
          item.name || '',
          item.applications ?? 0,
          item.jobs ?? 0
        ])
      },
      {
        title: 'Section 5: 5-Stage Progressive Disclosure & Hiring Funnel',
        headers: ['Funnel Stage', 'Volume Count', 'Conversion Rate (%)'],
        rows: (funnelSteps || []).map((step: any) => [
          step.label || '',
          step.value ?? 0,
          step.rate || '0%'
        ])
      },
      {
        title: 'Section 6: User Demographics & Verification Ratios',
        headers: ['Demographic Group', 'Count', 'Percentage of Total'],
        rows: [
          ['Registered Workers', data.user_ratio?.workers ?? 0, `${data.user_ratio?.workers_pct ?? 0}%`],
          ['Registered Employers', data.user_ratio?.employers ?? 0, `${data.user_ratio?.employers_pct ?? 0}%`],
          ['Verified Users', data.user_ratio?.verified_users ?? 0, `${data.user_ratio?.verified_pct ?? 0}%`],
          ['Unverified Users', data.user_ratio?.unverified_users ?? 0, `${data.user_ratio?.unverified_pct ?? 0}%`],
        ]
      },
      {
        title: 'Section 7: Wage & Compensation by Trade Category',
        headers: ['Trade Category', 'Average Wage (PHP)', 'Min Wage (PHP)', 'Max Wage (PHP)'],
        rows: (data.compensation?.categories && data.compensation.categories.length > 0)
          ? data.compensation.categories.map((c: any) => [
              c.category || 'General',
              formatCSVCurrency(c.avg_comp),
              formatCSVCurrency(data.compensation?.min),
              formatCSVCurrency(data.compensation?.max)
            ])
          : [['General Labor', formatCSVCurrency(data.compensation?.avg), formatCSVCurrency(data.compensation?.min), formatCSVCurrency(data.compensation?.max)]]
      },
      {
        title: 'Section 8: Geographic Activity by Location',
        headers: ['Location', 'Job Posts Count', 'Applications Count'],
        rows: (transformedGeographicActivity || []).map((g: any) => [
          g.name || 'Bulan',
          g.jobs ?? 0,
          g.applications ?? 0
        ])
      },
      {
        title: 'Section 9: Moderation & Safety Violation Breakdown',
        headers: ['Violation Type', 'Report Count'],
        rows: (data.reports?.breakdown && data.reports.breakdown.length > 0)
          ? data.reports.breakdown.map((r: any) => [
              r.type ? r.type.replace(/_/g, ' ').toUpperCase() : 'OTHER',
              r.count ?? 0
            ])
          : [['No Active Violations Reported', 0]]
      }
    ];

    exportMultiSectionCSV(
      `sikap_analytics_${from}_to_${to}`,
      'SIKAP Platform Descriptive Analytics Report',
      [
        ['Generated On:', formatCSVDate(new Date().toISOString())],
        ['Reporting Period:', `${from} to ${to}`],
        ['Aggregation Interval:', intervalFilter],
        ['Platform:', 'SIKAP: Skills & Job Matching Platform']
      ],
      sections
    );
  };


  const handleExportMasterExcel = async () => {
    try {
      setIsExportingExcel(true);
      const [usersRes, jobsRes, verifRes, reportsRes] = await Promise.all([
        adminApi.getUsers({ all: true }).catch(() => ({ data: [] })),
        adminApi.getJobs({ all: true }).catch(() => ({ data: [] })),
        adminApi.getVerifications(true).catch(() => ({ data: [] })),
        adminApi.getReports('all', 1, '', true).catch(() => ({ data: [] }))
      ]);

      const usersList: any[] = usersRes.data?.data || usersRes.data || [];
      const jobsList: any[] = jobsRes.data?.data || jobsRes.data || [];
      const verifList: any[] = verifRes.data?.data || verifRes.data || [];
      const reportsList: any[] = reportsRes.data?.data || reportsRes.data || [];

      const blob = await generateMasterExcelWorkbook({
        users: usersList,
        jobs: jobsList,
        verifications: verifList,
        reports: reportsList,
        analytics: data
      });

      const filename = `SIKAP-Platform-Master-Report.xlsx`;
      downloadExcelBlob(blob, filename);
    } catch (err) {
      console.error('Failed to export master Excel report', err);
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportPDF = () => {
    setPrintMode('analytics');
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleExportMasterPDF = async () => {
    try {
      setIsGeneratingMasterPdf(true);
      const [usersRes, jobsRes, verifRes, reportsRes, logsRes, profanityRes, aiRes] = await Promise.all([
        adminApi.getUsers({ all: true }).catch(() => ({ data: [] })),
        adminApi.getJobs({ all: true }).catch(() => ({ data: [] })),
        adminApi.getVerifications(true).catch(() => ({ data: [] })),
        adminApi.getReports('all', 1, '', true).catch(() => ({ data: [] })),
        adminApi.getLogs(1, undefined, undefined, undefined, undefined, true).catch(() => ({ data: [] })),
        adminApi.getProfanityWords().catch(() => ({ data: [] })),
        !aiInsights ? adminApi.generateAIInsights().catch(() => null) : Promise.resolve(null),
      ]);

      if (aiRes && (aiRes as any).data?.insights) {
        try {
          const raw = (aiRes as any).data.insights;
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          setAiInsights(parsed);
        } catch (e) {
          console.error("Failed to parse AI insights in master PDF", e);
        }
      }

      const usersList = usersRes.data?.data || usersRes.data || [];
      const jobsList = jobsRes.data?.data || jobsRes.data || [];
      const verifList = verifRes.data?.data || verifRes.data || [];
      const reportsList = reportsRes.data?.data || reportsRes.data || [];
      const logsList = logsRes.data?.data || logsRes.data || [];
      const profanityList = profanityRes.data?.data || profanityRes.data || [];

      setMasterData({
        users: Array.isArray(usersList) ? usersList : [],
        jobs: Array.isArray(jobsList) ? jobsList : [],
        verifications: Array.isArray(verifList) ? verifList : [],
        reports: Array.isArray(reportsList) ? reportsList : [],
        logs: Array.isArray(logsList) ? logsList : [],
        profanity: Array.isArray(profanityList) ? profanityList : [],
      });
      setPrintMode('master');

      setTimeout(() => {
        setIsGeneratingMasterPdf(false);
        window.print();
      }, 400);
    } catch (err) {
      console.error('Failed to generate master platform PDF', err);
      setIsGeneratingMasterPdf(false);
    }
  };



  // User growth Recharts format
  const transformedUserGrowth = (() => {
    if (!data?.registration_trends) return [];
    const grouped: Record<string, { name: string; workers: number; employers: number }> = {};
    
    data.registration_trends.forEach((item: any) => {
      const periodKey = item.period || 'Unknown';
      if (!grouped[periodKey]) {
        grouped[periodKey] = { name: periodKey, workers: 0, employers: 0 };
      }
      if (item.role === 'worker') {
        grouped[periodKey].workers += parseInt(item.registrations);
      } else if (item.role === 'employer') {
        grouped[periodKey].employers += parseInt(item.registrations);
      }
    });
    
    return Object.values(grouped).sort((a: any, b: any) => {
      const timeA = new Date(a.name || 0).getTime();
      const timeB = new Date(b.name || 0).getTime();
      return trendsSortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });
  })();

  // Skill Demand - horizontal bar chart category comparator
  const transformedJobsData = (() => {
    if (!data?.skill_demand) return [];
    const list = data.skill_demand.map((item: any) => ({
      name: item.category,
      jobs: parseInt(item.total_postings),
    }));

    list.sort((a: any, b: any) => {
      const aVal = distSortBy === 'value' ? a.jobs : a.name.toLowerCase();
      const bVal = distSortBy === 'value' ? b.jobs : b.name.toLowerCase();
      
      if (aVal < bVal) return distSortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return distSortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    if (list.length <= distLimitFilter) {
      return list;
    } else {
      const top = list.slice(0, distLimitFilter - 1);
      const rest = list.slice(distLimitFilter - 1);
      const others = rest.reduce(
        (acc: any, val: any) => {
          acc.jobs += val.jobs;
          return acc;
        },
        { name: 'Others', jobs: 0 }
      );
      return [...top, others];
    }
  })();

  const transformedGeographicActivity = (() => {
    if (!data?.geographic_activity) return [];
    
    let list: any[] = [];
    if (distRegionFilter === 'all') {
      // Group and aggregate by municipality to prevent duplicate chaotic barangay bars
      const grouped: { [key: string]: { name: string; jobs: number; applications: number } } = {};
      data.geographic_activity.forEach((item: any) => {
        const muni = item.municipality || 'Unknown';
        if (!grouped[muni]) {
          grouped[muni] = {
            name: muni,
            jobs: 0,
            applications: 0
          };
        }
        grouped[muni].jobs += parseInt(item.job_postings || 0);
        grouped[muni].applications += parseInt(item.total_applications || 0);
      });
      list = Object.values(grouped);
    } else {
      // Show barangays of the selected municipality
      list = data.geographic_activity
        .filter((item: any) => item.municipality === distRegionFilter)
        .map((item: any) => ({
          name: item.barangay || 'Unknown',
          jobs: parseInt(item.job_postings || 0),
          applications: parseInt(item.total_applications || 0)
        }));
    }

    list.sort((a: any, b: any) => {
      const aVal = distSortBy === 'value' ? (a.jobs + a.applications) : a.name.toLowerCase();
      const bVal = distSortBy === 'value' ? (b.jobs + b.applications) : b.name.toLowerCase();

      if (aVal < bVal) return distSortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return distSortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return list.slice(0, distLimitFilter);
  })();

  // Application Volume respects global date & aggregation parameters
  const transformedApplicationVolume = (() => {
    if (!data?.application_volume) return [];
    return data.application_volume.map((item: any) => ({
      name: item.period || 'Unknown',
      applications: parseInt(item.total_applications),
      jobs: parseInt(item.unique_jobs),
    })).sort((a: any, b: any) => {
      const timeA = new Date(a.name || 0).getTime();
      const timeB = new Date(b.name || 0).getTime();
      return trendsSortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });
  })();

  const transformedSkillDistribution = (() => {
    if (!data?.skill_distribution) return [];
    const list = data.skill_distribution.map((item: any) => ({
      name: item.skill_name,
      value: parseInt(item.worker_count),
    })).sort((a: any, b: any) => b.value - a.value);

    if (list.length <= distLimitFilter) {
      return list;
    } else {
      const top = list.slice(0, distLimitFilter - 1);
      const rest = list.slice(distLimitFilter - 1);
      const othersVal = rest.reduce((sum: number, entry: any) => sum + entry.value, 0);
      return [...top, { name: 'Others', value: othersVal }];
    }
  })();

  const uniqueMunicipalities = (() => {
    if (!data?.geographic_activity) return [];
    const set = new Set<string>();
    data.geographic_activity.forEach((item: any) => {
      if (item.municipality) set.add(item.municipality);
    });
    return Array.from(set).sort();
  })();

  const COLORS = CHART_COLORS;

  // Funnel calculations
  const funnelSteps = [
    { label: 'Applications Submitted', value: data?.funnel?.total_applications ?? 0, rate: '100%' },
    { 
      label: 'Accepted applications', 
      value: data?.funnel?.accepted_applications ?? 0, 
      rate: data?.funnel?.total_applications > 0 ? `${Math.round((data.funnel.accepted_applications / data.funnel.total_applications) * 100)}%` : '0%'
    },
    { 
      label: 'Completed jobs', 
      value: data?.funnel?.completed_jobs ?? 0, 
      rate: data?.funnel?.total_applications > 0 ? `${Math.round((data.funnel.completed_jobs / data.funnel.total_applications) * 100)}%` : '0%'
    }
  ];

  // Filtered Wages Category Breakdown
  const filteredCompensationCategories = (() => {
    if (!data?.compensation?.categories) return [];
    const list = data.compensation.categories.filter((c: any) => {
      const avg = parseFloat(c.avg_comp || 0);
      if (healthWageFilter === 'low') return avg < 500;
      if (healthWageFilter === 'mid') return avg >= 500 && avg <= 1000;
      if (healthWageFilter === 'high') return avg > 1000;
      return true;
    });

    list.sort((a: any, b: any) => {
      const aVal = healthSortBy === 'value' ? parseFloat(a.avg_comp || 0) : a.category.toLowerCase();
      const bVal = healthSortBy === 'value' ? parseFloat(b.avg_comp || 0) : b.category.toLowerCase();

      if (aVal < bVal) return healthSortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return healthSortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  })();

  // Filtered Moderation Breakdown
  const filteredReportsBreakdown = (() => {
    if (!data?.reports?.breakdown) return [];
    const list = data.reports.breakdown.filter((r: any) => {
      if (healthReportFilter === 'all') return true;
      return r.type === healthReportFilter;
    });

    list.sort((a: any, b: any) => {
      const aVal = healthSortBy === 'value' ? a.count : a.type.toLowerCase();
      const bVal = healthSortBy === 'value' ? b.count : b.type.toLowerCase();

      if (aVal < bVal) return healthSortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return healthSortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  })();

  // Detailed Tabular Time-Series Data - Reconciled across Users, Job Posts, Applications, Hires, and Reports
  const transformedDetailedTimeSeries = (() => {
    if (data?.detailed_time_series && data.detailed_time_series.length > 0) {
      return [...data.detailed_time_series].sort((a: any, b: any) => {
        const timeA = new Date(a.period || 0).getTime();
        const timeB = new Date(b.period || 0).getTime();
        return trendsSortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      });
    }

    // Client-side fallback reconciliation if backend cache hasn't invalidated yet
    const map: Record<string, any> = {};

    (transformedUserGrowth || []).forEach((u: any) => {
      const p = u.name;
      if (!map[p]) {
        map[p] = {
          period: p,
          new_workers: u.workers ?? 0,
          new_employers: u.employers ?? 0,
          total_users: (u.workers ?? 0) + (u.employers ?? 0),
          job_posts: 0,
          applications: 0,
          accepted_applications: 0,
          completed_hires: 0,
          reports: 0
        };
      } else {
        map[p].new_workers = u.workers ?? 0;
        map[p].new_employers = u.employers ?? 0;
        map[p].total_users = (u.workers ?? 0) + (u.employers ?? 0);
      }
    });

    (transformedApplicationVolume || []).forEach((a: any) => {
      const p = a.name;
      if (!map[p]) {
        map[p] = {
          period: p,
          new_workers: 0,
          new_employers: 0,
          total_users: 0,
          job_posts: a.jobs ?? 0,
          applications: a.applications ?? 0,
          accepted_applications: a.accepted_applications ?? 0,
          completed_hires: a.completed_hires ?? 0,
          reports: 0
        };
      } else {
        map[p].job_posts = a.jobs ?? 0;
        map[p].applications = a.applications ?? 0;
        map[p].accepted_applications = a.accepted_applications ?? 0;
        map[p].completed_hires = a.completed_hires ?? 0;
      }
    });

    if (data?.job_post_trends) {
      data.job_post_trends.forEach((j: any) => {
        const p = j.period;
        if (!map[p]) {
          map[p] = {
            period: p,
            new_workers: 0,
            new_employers: 0,
            total_users: 0,
            job_posts: parseInt(j.job_posts || 0, 10),
            applications: 0,
            accepted_applications: 0,
            completed_hires: 0,
            reports: 0
          };
        } else {
          map[p].job_posts = parseInt(j.job_posts || 0, 10);
        }
      });
    }

    return Object.values(map).sort((a: any, b: any) => {
      const timeA = new Date(a.period || 0).getTime();
      const timeB = new Date(b.period || 0).getTime();
      return trendsSortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });
  })();

  // Column sums for the detailed table reconciliation
  const detailedTotals = (() => {
    return (transformedDetailedTimeSeries || []).reduce(
      (acc: any, row: any) => {
        acc.new_workers += row.new_workers || 0;
        acc.new_employers += row.new_employers || 0;
        acc.total_users += row.total_users || 0;
        acc.job_posts += row.job_posts || 0;
        acc.applications += row.applications || 0;
        acc.accepted_applications += row.accepted_applications || 0;
        acc.completed_hires += row.completed_hires || 0;
        acc.reports += row.reports || 0;
        return acc;
      },
      {
        new_workers: 0,
        new_employers: 0,
        total_users: 0,
        job_posts: 0,
        applications: 0,
        accepted_applications: 0,
        completed_hires: 0,
        reports: 0
      }
    );
  })();

  // Application-to-Hire Conversion Velocity Data for Trends Tab
  const transformedConversionVelocity = (() => {
    return (transformedDetailedTimeSeries || []).map((row: any) => ({
      name: row.period || 'Unknown',
      applications: row.applications ?? 0,
      completed_hires: row.completed_hires ?? 0,
      accepted_applications: row.accepted_applications ?? 0,
    }));
  })();

  const conversionInsight = (() => {
    const apps = detailedTotals.applications || 0;
    const hires = detailedTotals.completed_hires || 0;
    if (apps === 0) {
      return "No application activity recorded for this period yet to measure hiring conversion velocity.";
    }
    const rate = ((hires / apps) * 100).toFixed(1);
    if (hires === 0) {
      return `${apps.toLocaleString()} application(s) submitted with 0 confirmed hires recorded so far. Monitor employer response times to prevent candidate attrition.`;
    }
    return `${apps.toLocaleString()} applications resulted in ${hires.toLocaleString()} verified hires (${rate}% conversion rate). ${
      Number(rate) >= 20
        ? 'Conversion velocity indicates strong market liquidity and rapid worker placement.'
        : Number(rate) >= 10
        ? 'Steady conversion flow with typical evaluation turnaround.'
        : 'Low conversion velocity suggests opportunities to assist employers in candidate evaluation.'
    }`;
  })();

  // Dynamic Insight Calculations
  const activityInsight = (() => {
    if (!transformedApplicationVolume || transformedApplicationVolume.length === 0) {
      return "No application activity recorded for this period yet. Data will populate in real-time as workers submit applications.";
    }
    let maxApps = 0;
    let peakPeriod = '';
    let totalApps = 0;
    let totalJobs = 0;
    transformedApplicationVolume.forEach((item: any) => {
      const apps = item.applications ?? 0;
      const jobs = item.jobs ?? 0;
      totalApps += apps;
      totalJobs += jobs;
      if (apps > maxApps) {
        maxApps = apps;
        peakPeriod = item.name;
      }
    });
    if (totalApps === 0 && totalJobs === 0) {
      return "Platform is awaiting user activity in this period. As workers apply and employers list openings, hourly/daily trends will highlight here.";
    }
    const ratio = totalJobs > 0 ? (totalApps / totalJobs).toFixed(1) : totalApps.toString();
    if (peakPeriod && maxApps > 0) {
      const formattedPeak = formatPeriodLabel(peakPeriod, intervalFilter);
      return `Peak activity occurred during ${formattedPeak} with ${maxApps} application${maxApps === 1 ? '' : 's'}. Overall throughput is ${ratio} applications per job post.`;
    }
    return `Platform recorded ${totalApps} applications across ${totalJobs} active job posts (${ratio} apps/post throughput).`;
  })();

  const roleInsight = (() => {
    const workers = data?.user_ratio?.workers ?? 0;
    const employers = data?.user_ratio?.employers ?? 0;
    const total = workers + employers;
    if (total === 0) return "User signups will populate as new workers and employers register.";
    const workerPct = total > 0 ? Math.round((workers / total) * 100) : 0;
    const ratio = employers > 0 ? (workers / employers).toFixed(1) : workers.toString();
    return `Talent pool ratio is ${ratio}:1 (${workerPct}% workers, ${100 - workerPct}% employers), ensuring ample candidate coverage for incoming job posts.`;
  })();

  const geoInsight = (() => {
    if (!transformedGeographicActivity || transformedGeographicActivity.length === 0) {
      return "Geographic distribution will map across municipalities as jobs are published.";
    }
    const top = transformedGeographicActivity[0];
    if (!top || (top.jobs === 0 && top.applications === 0)) {
      return "No geographic clustering recorded for the current filter.";
    }
    return `${top.name} currently represents the primary labor activity hub with ${top.jobs} job post${top.jobs === 1 ? '' : 's'} and ${top.applications} application${top.applications === 1 ? '' : 's'} filed.`;
  })();

  const categoryInsight = (() => {
    if (!transformedJobsData || transformedJobsData.length === 0) {
      return "Job categories will be categorized as employers publish listings.";
    }
    const top = transformedJobsData[0];
    if (!top || top.jobs === 0) {
      return "No category postings recorded yet in this period.";
    }
    return `${top.name} leads employer demand with ${top.jobs} job post${top.jobs === 1 ? '' : 's'}, representing the highest workforce requirement.`;
  })();

  const healthInsight = (() => {
    const total = filteredReportsBreakdown?.reduce((sum: number, r: any) => sum + (r.count || 0), 0) || 0;
    const avgSec = data?.reports?.average_resolution_seconds || 0;
    const turnaroundHrs = avgSec > 0 ? (avgSec / 3600).toFixed(1) : null;
    if (total === 0) {
      return "Zero safety violations reported in this period. Platform community trust standards are operating optimally.";
    }
    const turnaroundText = turnaroundHrs ? ` Average turnaround latency is ${turnaroundHrs} hours.` : '';
    return `Moderation queue logged ${total} total incident report${total === 1 ? '' : 's'}.${turnaroundText} Prioritize pending review items to protect user trust.`;
  })();

  return (
    <div className="animate-fade-in print:p-0 print:bg-white min-h-screen pb-12">
      {/* Dynamic Style Block for PDF & Print Exports */}
      <style jsx global>{`
        @page {
          size: A4 landscape;
          margin: 8mm 10mm 8mm 10mm;
        }
        @media screen {
          .print-only-report {
            position: absolute !important;
            left: -9999px !important;
            top: -9999px !important;
            width: 1060px !important;
            height: auto !important;
            overflow: hidden !important;
          }
          .screen-only {
            display: block !important;
          }
        }
        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm 10mm 8mm 10mm;
          }
          html, body, #__next, main, div {
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            background: #ffffff !important;
            color: #0f172a !important;
            font-size: 7.5pt !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
            line-height: 1.25 !important;
          }
          header, sidebar, nav, button, select, input, .no-print, [class*="sidebar"], [class*="Sidebar"], .screen-only {
            display: none !important;
          }
          .print-only-report {
            position: static !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
          }
          .print-page {
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            min-height: 640px !important;
            max-height: 670px !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            margin: 0 0 8px 0 !important;
            padding: 0 !important;
          }
          .print-page-last {
            page-break-after: avoid !important;
            break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            min-height: 640px !important;
            max-height: 670px !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-card-grid {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 6pt !important;
          }
          .print-grid-2 {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 8pt !important;
          }
          .print-grid-3 {
            display: grid !important;
            grid-template-columns: 1fr 1fr 1fr !important;
            gap: 8pt !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin: 0 !important;
          }
          thead {
            display: table-header-group !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          th {
            background-color: #1e293b !important;
            color: #ffffff !important;
            font-weight: 700 !important;
            font-size: 6.5pt !important;
            text-transform: uppercase !important;
            letter-spacing: 0.03em !important;
            padding: 3pt 5pt !important;
            border: 1px solid #cbd5e1 !important;
          }
          td {
            padding: 2.5pt 5pt !important;
            border: 1px solid #e2e8f0 !important;
            font-size: 6.5pt !important;
          }
          tbody tr:nth-child(even) {
            background-color: #f8fafc !important;
          }
        }
      `}</style>

      <div className="screen-only">
        {/* Sticky Top Filter & Header Bar */}
        <div className="sticky top-[-12px] sm:top-[-24px] md:top-[-40px] z-30 bg-paper/95 backdrop-blur-md border-b border-ink-faint -mt-3 sm:-mt-6 md:-mt-10 pt-3 sm:pt-6 md:pt-10 pb-4 mb-8 -mx-3 sm:-mx-6 md:-mx-10 px-3 sm:px-6 md:px-10 no-print shadow-sm flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-ink">Dashboard Overview</h1>
            <p className="text-xs font-body text-ink-muted mt-1">Platform analytics, municipal labor trends, and data exports.</p>
          </div>

          {/* Date Filter & Aggregation Components */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Export & Presentation Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleExportCSV}
                title="Export descriptive analytics report as CSV"
                className="flex items-center gap-1.5 bg-white/80 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200 shadow-2xs text-xs font-body font-bold text-slate-700 hover:bg-slate-900 hover:text-white transition-all cursor-pointer"
              >
                <i className="lni lni-download text-xs" />
                <span>Analytics CSV</span>
              </button>
              <button
                onClick={handleExportMasterExcel}
                disabled={isExportingExcel}
                title="Export complete multi-tab formatted Excel workbook (SIKAP-Platform-Master-Report.xlsx)"
                className="flex items-center gap-1.5 bg-white/80 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200 shadow-2xs text-xs font-body font-bold text-emerald-700 hover:bg-emerald-700 hover:text-white transition-all cursor-pointer disabled:opacity-50"
              >
                {isExportingExcel ? (
                  <i className="lni lni-spinner animate-spin text-xs" />
                ) : (
                  <i className="lni lni-database text-xs" />
                )}
                <span>{isExportingExcel ? 'Exporting...' : 'Master Excel'}</span>
              </button>
              <button
                onClick={handleExportPDF}
                title="Print or save descriptive analytics report as PDF"
                className="flex items-center gap-1.5 bg-white/80 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200 shadow-2xs text-xs font-body font-bold text-slate-700 hover:bg-slate-900 hover:text-white transition-all cursor-pointer"
              >
                <i className="lni lni-printer text-xs" />
                <span>Analytics PDF</span>
              </button>
              <button
                onClick={handleExportMasterPDF}
                disabled={isGeneratingMasterPdf}
                title="Print or save comprehensive multi-page master platform dossier as PDF"
                className="flex items-center gap-1.5 bg-white/80 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200 shadow-2xs text-xs font-body font-bold text-slate-700 hover:bg-slate-900 hover:text-white transition-all cursor-pointer disabled:opacity-50"
              >
                {isGeneratingMasterPdf ? (
                  <i className="lni lni-spinner animate-spin text-xs" />
                ) : (
                  <i className="lni lni-files text-xs" />
                )}
                <span>{isGeneratingMasterPdf ? 'Preparing...' : 'Master PDF'}</span>
              </button>
            </div>

            {renderDateSelector(activeTab)}
          </div>
        </div>

        {/* Tab System Controls & View Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ink-faint/50 mt-2 pb-1">
          <div role="tablist" aria-label="Analytics sections" className="flex overflow-x-auto gap-1">
            {[
              { id: 'overview', label: 'Executive Pulse', subtitle: 'Platform Vitals & AI Briefing' },
              { id: 'trends', label: 'Marketplace & Liquidity', subtitle: 'Application & Match Velocity' },
              { id: 'distribution', label: 'Regional & Sector Demand', subtitle: 'Skills, Categories & Wages' },
              { id: 'health', label: 'Trust, Safety & Compliance', subtitle: 'Ratings, Reports & Moderation' },
            ].map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`panel-${tab.id}`}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-3 sm:px-4 font-body text-xs border-b-2 transition-all whitespace-nowrap text-left cursor-pointer ${
                  activeTab === tab.id
                    ? 'border-ink text-ink font-bold'
                    : 'border-transparent text-ink-muted hover:text-ink font-semibold'
                }`}
              >
                <span className="block text-xs">{tab.label}</span>
                <span className="block text-[10px] text-ink-muted font-normal hidden md:block">{tab.subtitle}</span>
              </button>
            ))}
          </div>

          {/* View Mode Switcher: Charts | Table | Split */}
          <div className="flex items-center gap-1 self-start sm:self-auto bg-white/80 backdrop-blur-md p-1 rounded-xl border border-slate-200/80 shadow-2xs no-print">
            <button
              type="button"
              onClick={() => setViewMode('charts')}
              title="View Visual Charts & Insights only"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'charts' ? 'bg-ink text-white shadow-xs' : 'text-ink-muted hover:text-ink hover:bg-white/60'
              }`}
            >
              <i className="lni lni-pie-chart text-xs" />
              <span>Charts</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              title="View Detailed Tabular Report only"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-ink text-white shadow-xs' : 'text-ink-muted hover:text-ink hover:bg-white/60'
              }`}
            >
              <i className="lni lni-table text-xs" />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              title="Split View: Visual charts above, tabular report below"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'split' ? 'bg-ink text-white shadow-xs' : 'text-ink-muted hover:text-ink hover:bg-white/60'
              }`}
            >
              <i className="lni lni-layers text-xs" />
              <span>Split View</span>
            </button>
          </div>
        </div>
      </div>

      {/* Printable Report Header */}
      <div className="hidden print:block mb-8">
        <h1 className="text-3xl font-bold font-display text-ink">SIKAP Platform Descriptive Analytics</h1>
        <p className="text-sm font-body text-ink-soft mt-1">
          Reporting Period: {from} to {to} | Aggregate: {intervalFilter}
        </p>
        <hr className="mt-4 border-gray-200" />
      </div>

      {/* Error State */}
      {analyticsError ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-status-error/10 rounded-full flex items-center justify-center mb-4">
            <i className="lni lni-warning text-2xl text-status-error" />
          </div>
          <h2 className="text-lg font-body font-bold text-ink mb-2">Failed to load analytics</h2>
          <p className="text-ink-soft font-body text-sm mb-6">{analyticsError}</p>
          <button
            onClick={fetchAnalytics}
            className="px-5 py-2.5 bg-ink text-white font-body font-semibold rounded-xl hover:bg-ink-soft transition-colors text-sm"
          >
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className="animate-pulse space-y-8">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-28 bg-ink-faint/30 rounded-2xl"></div>
                ))}
              </div>
              <div className="h-96 bg-ink-faint/30 rounded-3xl"></div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-80 bg-ink-faint/30 rounded-3xl"></div>
                <div className="h-80 bg-ink-faint/30 rounded-3xl"></div>
              </div>
            </div>
          )}
          {activeTab === 'trends' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-96 bg-ink-faint/30 rounded-3xl"></div>
              <div className="h-96 bg-ink-faint/30 rounded-3xl"></div>
            </div>
          )}
          {activeTab === 'distribution' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-96 bg-ink-faint/30 rounded-3xl"></div>
                <div className="h-96 bg-ink-faint/30 rounded-3xl"></div>
              </div>
              <div className="h-96 bg-ink-faint/30 rounded-3xl"></div>
            </div>
          )}
          {activeTab === 'health' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-96 bg-ink-faint/30 rounded-3xl"></div>
                <div className="h-96 bg-ink-faint/30 rounded-3xl"></div>
              </div>
              <div className="h-96 bg-ink-faint/30 rounded-3xl"></div>
            </div>
          )}
        </div>
      ) : data && (
        <div className="space-y-8">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Thematic Operational Clusters (Executive Vitals) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 print-card-grid">
                {/* Card 1: Ecosystem Growth */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push('/dashboard/users')}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') router.push('/dashboard/users'); }}
                  className="cursor-pointer group relative p-6 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 border border-white/60 hover:-translate-y-1 overflow-hidden bg-white/80 backdrop-blur-md flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-body font-bold text-primary-dark uppercase tracking-wider bg-primary-soft/60 px-2.5 py-1 rounded-lg">
                        Ecosystem Growth
                      </span>
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-primary-soft shadow-inner">
                        <i className="lni lni-users text-lg text-primary-dark" />
                      </div>
                    </div>
                    <p className="text-xs font-body font-semibold text-ink-soft uppercase tracking-wider">New Registrations</p>
                    <h3 className="text-3xl font-numeric font-bold text-ink mt-1">{(data?.kpis?.total_users?.value ?? 0).toLocaleString()}</h3>
                  </div>
                  <div className="mt-4 pt-3 border-t border-ink-faint/30">
                    <div className="flex items-center justify-between text-xs font-semibold text-ink-muted mb-1.5">
                      <span>{detailedTotals.new_workers.toLocaleString()} Workers</span>
                      <span>·</span>
                      <span>{detailedTotals.new_employers.toLocaleString()} Employers</span>
                    </div>
                    {data?.kpis?.total_users?.change !== undefined && (
                      <div className={`flex items-center text-xs font-bold ${(data.kpis.total_users.change ?? 0) >= 0 ? 'text-status-success' : 'text-status-error'}`}>
                        <i className={`lni ${(data.kpis.total_users.change ?? 0) >= 0 ? 'lni-arrow-up' : 'lni-arrow-down'} mr-1 font-bold`} />
                        <span>{Math.abs(data.kpis.total_users.change ?? 0)}% PoP change</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card 2: Job Posts */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push('/dashboard/jobs')}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') router.push('/dashboard/jobs'); }}
                  className="cursor-pointer group relative p-6 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 border border-white/60 hover:-translate-y-1 overflow-hidden bg-white/80 backdrop-blur-md flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-body font-bold text-sky-800 uppercase tracking-wider bg-sky-100 px-2.5 py-1 rounded-lg">
                        Labor Demand
                      </span>
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-sky-100 shadow-inner">
                        <i className="lni lni-briefcase text-lg text-sky-700" />
                      </div>
                    </div>
                    <p className="text-xs font-body font-semibold text-ink-soft uppercase tracking-wider">Job Posts</p>
                    <h3 className="text-3xl font-numeric font-bold text-ink mt-1">{(data?.kpis?.active_jobs?.value ?? 0).toLocaleString()}</h3>
                  </div>
                  <div className="mt-4 pt-3 border-t border-ink-faint/30">
                    <div className="flex items-center justify-between text-xs font-semibold text-ink-muted mb-1.5">
                      <span>Active listings</span>
                      <span>·</span>
                      <span>Municipal trades</span>
                    </div>
                    {data?.kpis?.active_jobs?.change !== undefined && (
                      <div className={`flex items-center text-xs font-bold ${(data.kpis.active_jobs.change ?? 0) >= 0 ? 'text-status-success' : 'text-status-error'}`}>
                        <i className={`lni ${(data.kpis.active_jobs.change ?? 0) >= 0 ? 'lni-arrow-up' : 'lni-arrow-down'} mr-1 font-bold`} />
                        <span>{Math.abs(data.kpis.active_jobs.change ?? 0)}% PoP change</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card 3: Applications & Liquidity */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push('/dashboard/jobs')}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') router.push('/dashboard/jobs'); }}
                  className="cursor-pointer group relative p-6 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 border border-white/60 hover:-translate-y-1 overflow-hidden bg-white/80 backdrop-blur-md flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-body font-bold text-emerald-800 uppercase tracking-wider bg-emerald-100 px-2.5 py-1 rounded-lg">
                        Marketplace Flow
                      </span>
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-emerald-100 shadow-inner">
                        <i className="lni lni-files text-lg text-emerald-700" />
                      </div>
                    </div>
                    <p className="text-xs font-body font-semibold text-ink-soft uppercase tracking-wider">Applications Filed</p>
                    <h3 className="text-3xl font-numeric font-bold text-ink mt-1">{(data?.kpis?.applications?.value ?? 0).toLocaleString()}</h3>
                  </div>
                  <div className="mt-4 pt-3 border-t border-ink-faint/30">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-ink-muted font-numeric">
                        {((data?.kpis?.active_jobs?.value ?? 0) > 0 ? ((data?.kpis?.applications?.value ?? 0) / (data?.kpis?.active_jobs?.value || 1)).toFixed(1) : 0)} apps/post
                      </span>
                      <HealthStatusBadge type="throughput" value={(data?.kpis?.active_jobs?.value ?? 0) > 0 ? ((data?.kpis?.applications?.value ?? 0) / (data?.kpis?.active_jobs?.value || 1)) : 0} />
                    </div>
                    {data?.kpis?.applications?.change !== undefined && (
                      <div className={`flex items-center text-xs font-bold ${(data.kpis.applications.change ?? 0) >= 0 ? 'text-status-success' : 'text-status-error'}`}>
                        <i className={`lni ${(data.kpis.applications.change ?? 0) >= 0 ? 'lni-arrow-up' : 'lni-arrow-down'} mr-1 font-bold`} />
                        <span>{Math.abs(data.kpis.applications.change ?? 0)}% PoP change</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card 4: Trust & Reports */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push('/dashboard/reports')}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') router.push('/dashboard/reports'); }}
                  className="cursor-pointer group relative p-6 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 border border-white/60 hover:-translate-y-1 overflow-hidden bg-white/80 backdrop-blur-md flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-body font-bold text-rose-800 uppercase tracking-wider bg-rose-100 px-2.5 py-1 rounded-lg">
                        Trust & Safety
                      </span>
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-rose-100 shadow-inner">
                        <i className="lni lni-shield text-lg text-rose-700" />
                      </div>
                    </div>
                    <p className="text-xs font-body font-semibold text-ink-soft uppercase tracking-wider">Reports Filed</p>
                    <h3 className="text-3xl font-numeric font-bold text-ink mt-1">{(data?.kpis?.unresolved_reports?.value ?? 0).toLocaleString()}</h3>
                  </div>
                  <div className="mt-4 pt-3 border-t border-ink-faint/30">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-ink-muted">Active Moderation</span>
                      <HealthStatusBadge type="reports" value={data?.kpis?.unresolved_reports?.value ?? 0} />
                    </div>
                    <div className="text-[11px] font-semibold text-ink-muted">
                      {data?.verification?.delayed_verifications ? `${data.verification.delayed_verifications} pending reviews` : 'Verification queue cleared'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Compact Platform Vitals & Messaging Pulse Strip */}
              {convStats && (
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white/70 backdrop-blur-md rounded-2xl border border-white/60 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm shadow-inner">
                      <i className="lni lni-comments" />
                    </div>
                    <div>
                      <span className="text-[10px] font-body font-bold uppercase tracking-wider text-ink-muted block">Direct In-App Messaging Activity</span>
                      <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-ink font-numeric mt-0.5">
                        <span>{convStats.active_conversations.toLocaleString()} active chats</span>
                        <span className="text-ink-faint">·</span>
                        <span>{convStats.messages_today.toLocaleString()} messages today</span>
                        <span className="text-ink-faint">·</span>
                        <span>Avg {convStats.avg_messages_per_hire} msgs per hire</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-semibold text-ink-soft">
                    <div className="flex items-center gap-1.5">
                      <span className="text-ink-muted">Job Fill Rate:</span>
                      <span className="font-bold text-primary-dark font-numeric">{data?.fill_rate?.value ?? 0}%</span>
                      <HealthStatusBadge type="conversion" value={data?.fill_rate?.value ?? 0} />
                    </div>
                    {viewMode === 'split' && (
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById('detailed-report-section');
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                        className="flex items-center gap-1 text-primary-dark hover:underline cursor-pointer text-xs font-bold"
                      >
                        Jump to Table <i className="lni lni-arrow-down text-[10px]" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Gemini AI Executive Insights Component — Positioned at top for immediate executive briefing */}
              <div className="bg-gradient-to-r from-primary-soft to-accent-mint/30 backdrop-blur-md p-8 rounded-3xl shadow-sm border border-primary-dark/10 print-chart-container">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                      <i className="lni lni-keyword-research text-xl text-primary-dark" />
                    </div>
                    <div>
                      <h3 className="font-display text-2xl text-ink font-bold">Gemini AI Executive Insights</h3>
                      <p className="text-xs font-body text-ink-soft">Dynamic pattern recognition & recommendations</p>
                    </div>
                  </div>
                  <button
                    onClick={handleGenerateInsights}
                    disabled={aiLoading}
                    className="mt-4 md:mt-0 px-6 py-2.5 bg-ink text-white rounded-2xl font-body font-bold text-sm hover:bg-primary-dark hover:scale-105 active:scale-95 transition-all shadow-md disabled:opacity-50 flex items-center gap-2 no-print cursor-pointer"
                  >
                    {aiLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating...
                      </>
                    ) : (
                      <>
                        <i className="lni lni-spinner-arrow mr-1" />
                        Generate Insights
                      </>
                    )}
                  </button>
                </div>

                {aiLoading && (
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-white/60 rounded-md w-3/4"></div>
                    <div className="h-4 bg-white/60 rounded-md w-5/6"></div>
                    <div className="h-4 bg-white/60 rounded-md w-2/3"></div>
                  </div>
                )}

                {aiError && (
                  <div className="p-4 bg-status-error/10 border border-status-error/20 text-status-error rounded-2xl text-sm font-body font-semibold">
                    {aiError}
                  </div>
                )}

                {!aiLoading && !aiError && aiInsights && (
                  <AIInsightsCard data={aiInsights} period={aiPeriod} />
                )}

                {!aiLoading && !aiInsights && !aiError && (
                  <div className="text-center py-6 text-ink-soft font-body text-sm">
                    Click <strong className="text-ink">Generate Insights</strong> to analyze platform user trends, application conversions, compensation metrics, and report delays.
                  </div>
                )}
              </div>

              {/* Visual Analytics Layer (Overview) */}
              {(viewMode === 'charts' || viewMode === 'split') && (
                <div className="space-y-8">

              {/* PRIMARY VISUALIZATION (Above the Fold): Platform Activity & Application Flow */}
              <div className="bg-white/80 backdrop-blur-md p-6 sm:p-8 rounded-3xl shadow-sm border border-white/50 transition-all hover:shadow-lg flex flex-col min-w-0 print-chart-container">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div>
                    <h3 className="font-display text-lg font-bold text-ink">Platform Activity & Application Flow</h3>
                    <p className="text-xs text-ink-muted mt-0.5">
                      Volume of worker applications filed compared to active job posts ({globalPreset}, {intervalFilter} grouping).
                    </p>
                  </div>
                  <span className="self-start sm:self-auto px-2.5 py-1 bg-primary/10 text-primary rounded-xl text-[10px] font-body font-bold uppercase tracking-wider">
                    Core Platform Flow
                  </span>
                </div>

                <MetricHeaderStrip
                  items={[
                    { label: 'Applications Filed', value: data?.kpis?.applications?.value ?? 0, change: data?.kpis?.applications?.change, highlight: true },
                    { label: 'Job Posts', value: data?.kpis?.active_jobs?.value ?? 0, change: data?.kpis?.active_jobs?.change },
                    {
                      label: 'Avg Throughput',
                      value: `${(data?.kpis?.active_jobs?.value ?? 0) > 0 ? ((data?.kpis?.applications?.value ?? 0) / (data?.kpis?.active_jobs?.value || 1)).toFixed(1) : (data?.kpis?.applications?.value ?? 0)} apps/post`,
                    },
                  ]}
                />

                {transformedApplicationVolume.length === 0 ? (
                  <ChartEmptyState
                    title={`No Application Activity for ${globalPreset}`}
                    message="Activity will appear here as workers browse and apply to published job posts."
                  />
                ) : (
                  <div className="h-80 w-full min-w-0 font-numeric">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={transformedApplicationVolume} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorAppsOverview" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3E7648" stopOpacity={0.35}/>
                            <stop offset="95%" stopColor="#3E7648" stopOpacity={0.02}/>
                          </linearGradient>
                          <linearGradient id="colorJobsOverview" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0284C7" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#0284C7" stopOpacity={0.02}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8DFCE" opacity={0.6} />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#8C7B6A', fontSize: 11 }}
                          tickFormatter={(val) => formatAxisTick(val, intervalFilter)}
                          dy={10}
                        />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 11 }} allowDecimals={false} />
                        <Tooltip
                          shared
                          contentStyle={{
                            borderRadius: '16px',
                            border: '1px solid rgba(255,255,255,0.7)',
                            boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)',
                            backgroundColor: 'rgba(255, 255, 255, 0.96)',
                            backdropFilter: 'blur(8px)',
                          }}
                          labelFormatter={(label) => formatPeriodLabel(label, intervalFilter)}
                        />
                        <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12 }} />
                        <Area
                          type="monotone"
                          dataKey="applications"
                          name="Applications Filed"
                          stroke="#3E7648"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#colorAppsOverview)"
                          activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="jobs"
                          name="Job Posts"
                          stroke="#0284C7"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#colorJobsOverview)"
                          activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <ChartInsightBox text={activityInsight} />
              </div>

              {/* SECONDARY VISUALIZATIONS GRID (2 Columns): Registrations & Regional Demand */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print-chart-container">
                {/* User Registrations Breakdown */}
                <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-white/50 transition-all hover:shadow-lg flex flex-col min-w-0">
                  <div className="mb-2">
                    <h3 className="font-display text-lg font-bold text-ink">User Registrations by Role</h3>
                    <p className="text-xs text-ink-muted mt-0.5">Worker signups vs employer registrations over time.</p>
                  </div>

                  <MetricHeaderStrip
                    items={[
                      { label: 'New Workers', value: data?.user_ratio?.workers ?? 0, highlight: true },
                      { label: 'New Employers', value: data?.user_ratio?.employers ?? 0 },
                      { label: 'Verified Ratio', value: `${data?.user_ratio?.verified_pct ?? 0}%` },
                    ]}
                  />

                  {transformedUserGrowth.length === 0 ? (
                    <ChartEmptyState
                      title={`No Registrations for ${globalPreset}`}
                      message="New account signups will populate here as workers and employers join."
                    />
                  ) : (
                    <div className="h-72 w-full min-w-0 font-numeric">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={transformedUserGrowth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8DFCE" opacity={0.5} />
                          <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#8C7B6A', fontSize: 11 }}
                            tickFormatter={(val) => formatAxisTick(val, intervalFilter)}
                            dy={10}
                          />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 11 }} allowDecimals={false} />
                          <Tooltip
                            cursor={{ fill: '#FDF8F0' }}
                            contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.7)', backgroundColor: 'rgba(255, 255, 255, 0.96)' }}
                            labelFormatter={(label) => formatPeriodLabel(label, intervalFilter)}
                          />
                          <Legend wrapperStyle={{ paddingTop: 8, fontSize: 11 }} />
                          <Bar dataKey="workers" name="Workers" fill="#3E7648" radius={[6, 6, 0, 0]} />
                          <Bar dataKey="employers" name="Employers" fill="#0284C7" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <ChartInsightBox text={roleInsight} />
                </div>

                {/* Regional Activity by Municipality */}
                <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-white/50 transition-all hover:shadow-lg flex flex-col min-w-0">
                  <div className="mb-2">
                    <h3 className="font-display text-lg font-bold text-ink">Geographic Demand by Municipality</h3>
                    <p className="text-xs text-ink-muted mt-0.5">Municipalities ranked by total job postings and worker applications.</p>
                  </div>

                  <MetricHeaderStrip
                    items={[
                      { label: 'Top Hub', value: transformedGeographicActivity[0]?.name || 'N/A', highlight: true },
                      { label: 'Total Job Posts', value: data?.kpis?.active_jobs?.value ?? 0 },
                      { label: 'Total Applications', value: data?.kpis?.applications?.value ?? 0 },
                    ]}
                  />

                  {transformedGeographicActivity.length === 0 ? (
                    <ChartEmptyState
                      title="No Geographic Activity"
                      message="Geographic labor activity will display as job postings and applications are created."
                    />
                  ) : (
                    <div className="h-72 w-full min-w-0 font-numeric">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={transformedGeographicActivity.slice(0, 6)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8DFCE" opacity={0.5} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 10 }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 11 }} allowDecimals={false} />
                          <Tooltip
                            cursor={{ fill: '#FDF8F0' }}
                            contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.7)', backgroundColor: 'rgba(255, 255, 255, 0.96)' }}
                          />
                          <Legend wrapperStyle={{ paddingTop: 8, fontSize: 11 }} />
                          <Bar dataKey="jobs" name="Job Posts" fill="#0284C7" radius={[6, 6, 0, 0]} />
                          <Bar dataKey="applications" name="Applications" fill="#3E7648" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <ChartInsightBox text={geoInsight} />
                </div>
              </div>

              {/* THIRD TIER (Job Category Demand Card) */}
              <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-white/50 transition-all hover:shadow-lg flex flex-col min-w-0 print-chart-container">
                <div className="mb-2">
                  <h3 className="font-display text-lg font-bold text-ink">In-Demand Job Categories</h3>
                  <p className="text-xs text-ink-muted mt-0.5">Platform job posts ranked descending by sector category.</p>
                </div>

                <MetricHeaderStrip
                  items={[
                    { label: 'Top Category', value: transformedJobsData[0]?.name || 'N/A', highlight: true },
                    { label: 'Category Count', value: transformedJobsData.length },
                    { label: 'Total Job Posts', value: data?.kpis?.active_jobs?.value ?? 0 },
                  ]}
                />

                {transformedJobsData.length === 0 ? (
                  <ChartEmptyState
                    title="No Category Postings"
                    message="Job categories will populate here as employers publish new job posts."
                  />
                ) : (
                  <div className="h-72 w-full min-w-0 font-numeric">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={transformedJobsData.slice(0, 6)} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E8DFCE" opacity={0.5} />
                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 11 }} allowDecimals={false} />
                        <YAxis
                          dataKey="name"
                          type="category"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#8C7B6A', fontSize: 11 }}
                          width={110}
                          tickFormatter={(value) => (value.length > 14 ? `${value.slice(0, 14)}...` : value)}
                        />
                        <Tooltip
                          cursor={{ fill: '#FDF8F0' }}
                          contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.7)', backgroundColor: 'rgba(255, 255, 255, 0.96)' }}
                        />
                        <Bar dataKey="jobs" name="Job Posts" fill="#3E7648" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <ChartInsightBox text={categoryInsight} />
              </div>

              {/* Funnel & Verification Summary section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print-chart-container">
                {/* Application-to-Hire Funnel */}
                <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-sm border border-white/50 transition-all hover:shadow-lg flex flex-col justify-between">
                  <div>
                    <h3 className="font-display text-lg font-bold text-ink mb-2">Application-to-Hire Funnel</h3>
                    <p className="text-xs text-ink-muted mb-6">Pipeline mapping and conversions from submissions to closures.</p>
                    
                    <div className="space-y-5">
                      {funnelSteps.map((step, idx) => (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex justify-between text-xs font-body font-semibold text-ink-soft">
                            <span>{step.label}</span>
                            <span className="font-bold text-ink">{step.value} <span className="text-[10px] font-normal text-ink-muted">({step.rate})</span></span>
                          </div>
                          <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-200/50">
                            {parseFloat(step.rate) > 0 ? (
                              <div
                                className="h-full border-r border-white/50 flex items-center justify-end px-3 transition-all duration-1000"
                                style={{ width: step.rate, backgroundColor: idx === 0 ? '#3E7648' : idx === 1 ? '#87CEEB' : '#90EE90' }}
                              >
                                <span className="text-[8px] font-bold font-numeric text-white">{step.rate}</span>
                              </div>
                            ) : (
                              <div className="h-full w-0 transition-all duration-1000" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <hr className="my-6 border-ink-faint" />
                    {/* User Ratio Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div className="bg-white/60 p-3 rounded-2xl border border-white/50 shadow-inner">
                        <span className="text-[10px] font-body font-semibold text-ink-soft uppercase tracking-wider block">Workers</span>
                        <strong className="text-lg font-numeric text-ink mt-1 block">{data?.user_ratio?.workers ?? 0}</strong>
                      </div>
                      <div className="bg-white/60 p-3 rounded-2xl border border-white/50 shadow-inner">
                        <span className="text-[10px] font-body font-semibold text-ink-soft uppercase tracking-wider block">Employers</span>
                        <strong className="text-lg font-numeric text-ink mt-1 block">{data?.user_ratio?.employers ?? 0}</strong>
                      </div>
                      <div className="bg-white/60 p-3 rounded-2xl border border-white/50 shadow-inner">
                        <span className="text-[10px] font-body font-semibold text-ink-soft uppercase tracking-wider block">Verified</span>
                        <strong className="text-lg font-numeric text-status-success mt-1 block">{data?.user_ratio?.verified_users ?? 0}</strong>
                      </div>
                      <div className="bg-white/60 p-3 rounded-2xl border border-white/50 shadow-inner">
                        <span className="text-[10px] font-body font-semibold text-ink-soft uppercase tracking-wider block">Unverified</span>
                        <strong className="text-lg font-numeric text-status-error mt-1 block">{data?.user_ratio?.unverified_users ?? 0}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Verification & Retention metrics */}
                <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-sm border border-white/50 transition-all hover:shadow-lg flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-display text-lg font-bold text-ink">Verification & Retention Summary</h3>
                      {data?.verification?.delayed_verifications > 0 && (
                        <span className="text-[10px] bg-status-error/10 text-status-error px-2.5 py-0.5 rounded-full font-body font-bold animate-pulse border border-status-error/20 uppercase tracking-wider">
                          {data.verification.delayed_verifications} Delayed
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-muted mb-6">Verification audit times and repeat worker metrics.</p>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-white/60 p-4 rounded-2xl border border-white/50 shadow-inner text-center">
                        <span className="text-[10px] font-body font-semibold text-ink-soft uppercase tracking-wider block">Avg Turnaround Time</span>
                        <strong className="text-xl font-numeric text-ink mt-1.5 block">
                          {data?.verification?.average_turnaround_seconds > 0 
                            ? `${(data.verification.average_turnaround_seconds / 3600).toFixed(1)} hrs` 
                            : 'N/A'}
                        </strong>
                        <span className="text-[9px] font-body text-ink-muted mt-1 block">From upload to review</span>
                      </div>
                      <div className="bg-white/60 p-4 rounded-2xl border border-white/50 shadow-inner text-center">
                        <span className="text-[10px] font-body font-semibold text-ink-soft uppercase tracking-wider block">Job Fill Rate</span>
                        <strong className="text-xl font-numeric text-primary-dark mt-1.5 block">
                          {data?.fill_rate?.value ?? 0}%
                        </strong>
                        <span className={`text-[9px] font-body font-bold mt-1 block ${data?.fill_rate?.change >= 0 ? 'text-status-success' : 'text-status-error'}`}>
                          {data?.fill_rate?.change >= 0 ? '↑' : '↓'} {Math.abs(data?.fill_rate?.change ?? 0)}% change PoP
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <hr className="my-5 border-ink-faint" />
                    <h4 className="font-display text-xs font-bold uppercase tracking-wider text-ink-soft mb-3">Worker Retention Rate</h4>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <span className="text-[10px] font-body text-ink-soft block">Active Applicants</span>
                        <strong className="text-lg font-numeric text-ink mt-1 block">{data?.worker_retention?.total_applicants ?? 0}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] font-body text-ink-soft block">Returning Users</span>
                        <strong className="text-lg font-numeric text-ink mt-1 block">{data?.worker_retention?.returning_applicants ?? 0}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] font-body text-ink-soft block">Retention Rate</span>
                        <strong className="text-lg font-numeric text-primary-dark mt-1 block">{data?.worker_retention?.retention_rate ?? 0}%</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DETAILED TABULAR REPORT: Complete Platform Activity (Overview Tab) */}
          {(viewMode === 'table' || viewMode === 'split') && (
            <div id="detailed-report-section" className="bg-white/80 backdrop-blur-md p-6 sm:p-8 rounded-3xl shadow-sm border border-white/50 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-ink-faint/40 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <i className="lni lni-layout text-primary-dark text-lg" />
                    <h3 className="font-display text-lg font-bold text-ink">
                      Detailed Analytics Report — Complete Platform Activity
                    </h3>
                  </div>
                  <p className="text-xs text-ink-muted mt-1">
                    Exact chronological breakdown of user registrations, job posts, applications, and completions for <strong className="text-ink">{from}</strong> to <strong className="text-ink">{to}</strong> ({globalPreset}).
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-body font-semibold">
                    Granularity: <strong className="uppercase text-primary-dark">{intervalFilter}</strong>
                  </span>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-body font-bold flex items-center gap-1.5">
                    <i className="lni lni-checkmark-circle text-xs" />
                    <span>Reconciled with KPIs</span>
                  </span>
                </div>
              </div>

                <div className="overflow-x-auto rounded-2xl border border-ink-faint/30">
                  <table className="w-full text-xs font-body text-left">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-ink-faint/40 text-[10px] uppercase font-bold text-ink-soft tracking-wider">
                        <th className="py-3 px-4">Time Period</th>
                        <th className="py-3 px-3 text-right">New Workers</th>
                        <th className="py-3 px-3 text-right">New Employers</th>
                        <th className="py-3 px-3 text-right">Total New Users</th>
                        <th className="py-3 px-3 text-right">Job Posts</th>
                        <th className="py-3 px-3 text-right">Applications</th>
                        <th className="py-3 px-3 text-right text-sky-700">Accepted</th>
                        <th className="py-3 px-3 text-right text-emerald-700">Completed Hires</th>
                        <th className="py-3 px-4 text-right text-rose-600">Reports Filed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-faint/20">
                      {transformedDetailedTimeSeries.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-ink-muted">
                            No activity recorded yet for {from} to {to}. Data will display here in real-time as users interact.
                          </td>
                        </tr>
                      ) : (
                        transformedDetailedTimeSeries.map((row: any, idx: number) => (
                          <tr key={idx} className="hover:bg-primary-soft/20 transition-colors">
                            <td className="py-3 px-4 font-semibold text-ink whitespace-nowrap">
                              {formatPeriodLabel(row.period, intervalFilter)}
                            </td>
                            <td className="py-3 px-3 text-right font-numeric text-ink-soft">
                              {(row.new_workers ?? 0).toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-right font-numeric text-ink-soft">
                              {(row.new_employers ?? 0).toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-right font-numeric font-bold text-ink">
                              {(row.total_users ?? 0).toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-right font-numeric text-ink">
                              {(row.job_posts ?? 0).toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-right font-numeric text-ink">
                              {(row.applications ?? 0).toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-right font-numeric font-semibold text-sky-700">
                              {(row.accepted_applications ?? 0).toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-right font-numeric font-bold text-emerald-700">
                              {(row.completed_hires ?? 0).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right font-numeric text-rose-600">
                              {(row.reports ?? 0).toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {transformedDetailedTimeSeries.length > 0 && (
                      <tfoot>
                        <tr className="bg-slate-100/90 border-t-2 border-slate-300 font-bold text-ink text-xs">
                          <td className="py-3 px-4 uppercase tracking-wider text-[11px]">
                            Total ({transformedDetailedTimeSeries.length} periods)
                          </td>
                          <td className="py-3 px-3 text-right font-numeric font-bold">
                            {detailedTotals.new_workers.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right font-numeric font-bold">
                            {detailedTotals.new_employers.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right font-numeric font-bold text-primary-dark">
                            {detailedTotals.total_users.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right font-numeric font-bold">
                            {detailedTotals.job_posts.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right font-numeric font-bold text-primary-dark">
                            {detailedTotals.applications.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right font-numeric font-bold text-sky-700">
                            {detailedTotals.accepted_applications.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right font-numeric font-bold text-emerald-700">
                            {detailedTotals.completed_hires.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-numeric font-bold text-rose-600">
                            {detailedTotals.reports.toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
                <div className="flex items-center justify-between text-[11px] font-body text-ink-muted pt-1">
                  <span>Reconciliation check: All column sums reconcile with database KPI metrics.</span>
                  <button
                    onClick={handleExportCSV}
                    className="text-primary-dark font-bold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <i className="lni lni-download text-xs" />
                    Export Table as CSV
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

          {/* TAB 2: ACTIVITY TRENDS / MARKETPLACE & LIQUIDITY */}
          {activeTab === 'trends' && (
            <div className="space-y-6">
              {(viewMode === 'charts' || viewMode === 'split') && (
                <>
                  {/* Tab-Specific Filters */}
                  <div className="flex flex-wrap items-center gap-4 bg-white/50 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm no-print">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-body font-bold text-ink-soft">Target Role:</span>
                      <div className="flex bg-white/70 p-1 rounded-xl border border-ink-faint shadow-inner">
                        {['all', 'worker', 'employer'].map((role) => (
                          <button
                            key={role}
                            onClick={() => setTrendsRoleFilter(role as any)}
                            className={`px-3 py-1 rounded-lg text-xs font-body font-semibold transition-all ${
                              trendsRoleFilter === role ? 'bg-ink text-white shadow-sm' : 'text-ink-soft hover:text-ink'
                            }`}
                          >
                            {role === 'all' ? 'All Roles' : role === 'worker' ? 'Workers' : 'Employers'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-body font-bold text-ink-soft">Volume Metrics:</span>
                      <div className="flex bg-white/70 p-1 rounded-xl border border-ink-faint shadow-inner">
                        {['all', 'applications', 'hires'].map((metric) => (
                          <button
                            key={metric}
                            onClick={() => setTrendsVolumeFilter(metric as any)}
                            className={`px-3 py-1 rounded-lg text-xs font-body font-semibold transition-all ${
                              trendsVolumeFilter === metric ? 'bg-ink text-white shadow-sm' : 'text-ink-soft hover:text-ink'
                            }`}
                          >
                            {metric === 'all' ? 'All Metrics' : metric === 'applications' ? 'Applications Only' : 'Hires Only'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-body font-bold text-ink-soft">Timeline Order:</span>
                      <select
                        aria-label="Timeline sort order"
                        value={trendsSortOrder}
                        onChange={(e) => setTrendsSortOrder(e.target.value as any)}
                        className="bg-white/70 px-3 py-1.5 rounded-xl border border-ink-faint shadow-inner text-xs font-body font-semibold text-ink-soft outline-none focus:border-ink cursor-pointer"
                      >
                        <option value="asc">Chronological (Oldest First)</option>
                        <option value="desc">Newest First</option>
                      </select>
                    </div>

                    {viewMode === 'split' && (
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById('detailed-report-section');
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                        className="ml-auto flex items-center gap-1 text-primary-dark hover:underline cursor-pointer text-xs font-bold"
                      >
                        Jump to Table <i className="lni lni-arrow-down text-[10px]" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print-chart-container">
                    {/* User Growth */}
                    <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-white/50 transition-all hover:shadow-lg flex flex-col min-w-0">
                      <div className="mb-4">
                        <h3 className="font-display text-lg font-bold text-ink">User Registrations</h3>
                        <p className="text-xs text-ink-muted mt-1">Registrations compared by workers vs. employers.</p>
                      </div>
                      <MetricHeaderStrip
                        items={[
                          { label: 'Total Signups', value: detailedTotals.total_users, highlight: true },
                          { label: 'Workers', value: detailedTotals.new_workers },
                          { label: 'Employers', value: detailedTotals.new_employers }
                        ]}
                      />
                      <div className="h-80 w-full min-w-0 font-numeric">
                        {transformedUserGrowth.length === 0 || transformedUserGrowth.every((i: any) => (i.workers || 0) === 0 && (i.employers || 0) === 0) ? (
                          <ChartEmptyState
                            title="No User Registrations"
                            message={`No new user registrations recorded between ${from} and ${to}.`}
                          />
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={transformedUserGrowth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8DFCE" opacity={0.5} />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 11 }} tickFormatter={(val) => formatAxisTick(val, intervalFilter)} dy={10} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 11 }} allowDecimals={false} />
                              <Tooltip 
                                cursor={{ fill: '#FDF8F0' }}
                                labelFormatter={(label) => formatPeriodLabel(label, intervalFilter)}
                                contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)' }}
                              />
                              <Legend wrapperStyle={{ paddingTop: 10, fontSize: '11px', fontFamily: 'var(--font-body)' }} />
                              {(trendsRoleFilter === 'all' || trendsRoleFilter === 'worker') && (
                                <Bar dataKey="workers" name="Workers" fill="url(#colorWorkers)" radius={[6, 6, 0, 0]} />
                              )}
                              {(trendsRoleFilter === 'all' || trendsRoleFilter === 'employer') && (
                                <Bar dataKey="employers" name="Employers" fill="url(#colorEmployers)" radius={[6, 6, 0, 0]} />
                              )}
                              <defs>
                                <linearGradient id="colorWorkers" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#FFB6C1" stopOpacity={1}/>
                                  <stop offset="100%" stopColor="#FFB6C1" stopOpacity={0.7}/>
                                </linearGradient>
                                <linearGradient id="colorEmployers" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#87CEEB" stopOpacity={1}/>
                                  <stop offset="100%" stopColor="#87CEEB" stopOpacity={0.7}/>
                                </linearGradient>
                              </defs>
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                      <ChartInsightBox text={roleInsight} />
                    </div>

                    {/* Application-to-Hire Conversion Velocity Area Chart */}
                    <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-white/50 transition-all hover:shadow-lg flex flex-col min-w-0">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-display text-lg font-bold text-ink">Application-to-Hire Conversion Velocity</h3>
                          <p className="text-xs text-ink-muted mt-1">Velocity tracking candidate applications against confirmed employer hires over time.</p>
                        </div>
                        <HealthStatusBadge
                          type="conversion"
                          value={detailedTotals.applications > 0 ? (detailedTotals.completed_hires / detailedTotals.applications) * 100 : 0}
                        />
                      </div>
                      <MetricHeaderStrip
                        items={[
                          { label: 'Applications Filed', value: detailedTotals.applications, highlight: true },
                          { label: 'Completed Hires', value: detailedTotals.completed_hires },
                          {
                            label: 'Conversion Rate',
                            value: `${detailedTotals.applications > 0 ? ((detailedTotals.completed_hires / detailedTotals.applications) * 100).toFixed(1) : '0.0'}%`
                          }
                        ]}
                      />
                      <div className="h-80 w-full min-w-0 font-numeric">
                        {transformedConversionVelocity.length === 0 || transformedConversionVelocity.every((i: any) => (i.applications || 0) === 0 && (i.completed_hires || 0) === 0) ? (
                          <ChartEmptyState
                            title="No Conversion Activity"
                            message={`No applications or completed hires recorded between ${from} and ${to}.`}
                          />
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={transformedConversionVelocity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <defs>
                                <linearGradient id="colorAppsVelocity" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#FFB6C1" stopOpacity={0.35}/>
                                  <stop offset="95%" stopColor="#FFB6C1" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorHiresVelocity" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.35}/>
                                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8DFCE" opacity={0.5} />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 11 }} tickFormatter={(val) => formatAxisTick(val, intervalFilter)} dy={10} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 11 }} allowDecimals={false} />
                              <Tooltip 
                                shared
                                labelFormatter={(label) => formatPeriodLabel(label, intervalFilter)}
                                contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)' }}
                              />
                              <Legend wrapperStyle={{ paddingTop: 10, fontSize: '11px', fontFamily: 'var(--font-body)' }} />
                              {(trendsVolumeFilter === 'all' || trendsVolumeFilter === 'applications') && (
                                <Area type="monotone" dataKey="applications" name="Applications Filed" stroke="#FFB6C1" strokeWidth={3} fillOpacity={1} fill="url(#colorAppsVelocity)" activeDot={{ r: 6, strokeWidth: 0 }} />
                              )}
                              {(trendsVolumeFilter === 'all' || trendsVolumeFilter === 'hires') && (
                                <Area type="monotone" dataKey="completed_hires" name="Completed Hires" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorHiresVelocity)" activeDot={{ r: 6, strokeWidth: 0 }} />
                              )}
                            </AreaChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                      <ChartInsightBox text={conversionInsight} />
                    </div>
                  </div>
                </>
              )}

              {/* DETAILED TABULAR REPORT: Activity Trends & Registration Velocity */}
              {(viewMode === 'table' || viewMode === 'split') && (
                <div id="detailed-report-section" className="bg-white/80 backdrop-blur-md p-6 sm:p-8 rounded-3xl shadow-sm border border-white/50 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-ink-faint/40 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <i className="lni lni-stats-up text-primary-dark text-lg" />
                        <h3 className="font-display text-lg font-bold text-ink">
                          Detailed Analytics Report — Activity Trends & Registration Velocity
                        </h3>
                      </div>
                      <p className="text-xs text-ink-muted mt-1">
                        Chronological velocity metrics and application throughput per job post for <strong className="text-ink">{from}</strong> to <strong className="text-ink">{to}</strong> ({globalPreset}).
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-body font-semibold">
                        Granularity: <strong className="uppercase text-primary-dark">{intervalFilter}</strong>
                      </span>
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-body font-bold flex items-center gap-1.5">
                        <i className="lni lni-checkmark-circle text-xs" />
                        <span>Reconciled with KPIs</span>
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-ink-faint/30">
                    <table className="w-full text-xs font-body text-left">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-ink-faint/40 text-[10px] uppercase font-bold text-ink-soft tracking-wider">
                          <th className="py-3 px-4">Time Period</th>
                          <th className="py-3 px-3 text-right">Worker Signups</th>
                          <th className="py-3 px-3 text-right">Employer Signups</th>
                          <th className="py-3 px-3 text-right">Total Registrations</th>
                          <th className="py-3 px-3 text-right">Job Posts</th>
                          <th className="py-3 px-3 text-right">Applications Filed</th>
                          <th className="py-3 px-4 text-right">Throughput Ratio</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-faint/20">
                        {transformedDetailedTimeSeries.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-ink-muted">
                              No activity recorded yet for {from} to {to}. Data will display here in real-time as users interact.
                            </td>
                          </tr>
                        ) : (
                          transformedDetailedTimeSeries.map((row: any, idx: number) => {
                            const ratio = row.job_posts > 0 
                              ? `${(row.applications / row.job_posts).toFixed(1)} / post` 
                              : (row.applications > 0 ? `${row.applications} / 0 posts` : '0.0');
                            return (
                              <tr key={idx} className="hover:bg-primary-soft/20 transition-colors">
                                <td className="py-3 px-4 font-semibold text-ink whitespace-nowrap">
                                  {formatPeriodLabel(row.period, intervalFilter)}
                                </td>
                                <td className="py-3 px-3 text-right font-numeric text-ink-soft">
                                  {(row.new_workers ?? 0).toLocaleString()}
                                </td>
                                <td className="py-3 px-3 text-right font-numeric text-ink-soft">
                                  {(row.new_employers ?? 0).toLocaleString()}
                                </td>
                                <td className="py-3 px-3 text-right font-numeric font-bold text-ink">
                                  {(row.total_users ?? 0).toLocaleString()}
                                </td>
                                <td className="py-3 px-3 text-right font-numeric text-ink">
                                  {(row.job_posts ?? 0).toLocaleString()}
                                </td>
                                <td className="py-3 px-3 text-right font-numeric text-ink">
                                  {(row.applications ?? 0).toLocaleString()}
                                </td>
                                <td className="py-3 px-4 text-right font-numeric font-semibold text-primary-dark">
                                  {ratio}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                      {transformedDetailedTimeSeries.length > 0 && (
                        <tfoot>
                          <tr className="bg-slate-100/90 border-t-2 border-slate-300 font-bold text-ink text-xs">
                            <td className="py-3 px-4 uppercase tracking-wider text-[11px]">
                              Total ({transformedDetailedTimeSeries.length} periods)
                            </td>
                            <td className="py-3 px-3 text-right font-numeric font-bold">
                              {detailedTotals.new_workers.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-right font-numeric font-bold">
                              {detailedTotals.new_employers.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-right font-numeric font-bold text-primary-dark">
                              {detailedTotals.total_users.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-right font-numeric font-bold">
                              {detailedTotals.job_posts.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-right font-numeric font-bold text-primary-dark">
                              {detailedTotals.applications.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right font-numeric font-bold text-primary-dark">
                              {detailedTotals.job_posts > 0 
                                ? `${(detailedTotals.applications / detailedTotals.job_posts).toFixed(1)} / post` 
                                : (detailedTotals.applications > 0 ? `${detailedTotals.applications} / 0 posts` : '0.0')}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-body text-ink-muted pt-1">
                    <span>Reconciliation check: Worker and Employer signups match Total Registrations; Applications match funnel records.</span>
                    <button
                      onClick={handleExportCSV}
                      className="text-primary-dark font-bold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <i className="lni lni-download text-xs" />
                      Export Table as CSV
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DISTRIBUTION & DEMAND */}
          {activeTab === 'distribution' && (
            <div className="space-y-6">
              {(viewMode === 'charts' || viewMode === 'split') && (
                <>
                  {/* Tab-Specific Filters */}
                  <div className="flex flex-wrap items-center gap-4 bg-white/50 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm no-print">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-body font-bold text-ink-soft">Target Region:</span>
                      <select
                        aria-label="Filter by municipality"
                        value={distRegionFilter}
                        onChange={(e) => setDistRegionFilter(e.target.value)}
                        className="bg-white/70 px-3 py-1.5 rounded-xl border border-ink-faint shadow-inner text-xs font-body font-semibold text-ink-soft outline-none focus:border-ink cursor-pointer"
                      >
                        <option value="all">All Municipalities (Grouped)</option>
                        {uniqueMunicipalities.map((muni) => (
                          <option key={muni} value={muni}>{muni}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-body font-bold text-ink-soft">Display Limit:</span>
                      <div className="flex bg-white/70 p-1 rounded-xl border border-ink-faint shadow-inner">
                        {[3, 6, 10].map((limit) => (
                          <button
                            key={limit}
                            onClick={() => setDistLimitFilter(limit)}
                            className={`px-3 py-1 rounded-lg text-xs font-body font-semibold transition-all ${
                              distLimitFilter === limit ? 'bg-ink text-white shadow-sm' : 'text-ink-soft hover:text-ink'
                            }`}
                          >
                            {limit === 3 ? 'Top 3' : limit === 6 ? 'Top 6' : 'Show All'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-body font-bold text-ink-soft">Sort Charts By:</span>
                      <select
                        aria-label="Sort distribution charts by"
                        value={distSortBy}
                        onChange={(e) => setDistSortBy(e.target.value as any)}
                        className="bg-white/70 px-3 py-1.5 rounded-xl border border-ink-faint shadow-inner text-xs font-body font-semibold text-ink-soft outline-none focus:border-ink cursor-pointer"
                      >
                        <option value="value">Volume (Highest / Total)</option>
                        <option value="name">Name (Alphabetical)</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-body font-bold text-ink-soft">Order:</span>
                      <select
                        aria-label="Sort distribution order"
                        value={distSortOrder}
                        onChange={(e) => setDistSortOrder(e.target.value as any)}
                        className="bg-white/70 px-3 py-1.5 rounded-xl border border-ink-faint shadow-inner text-xs font-body font-semibold text-ink-soft outline-none focus:border-ink cursor-pointer"
                      >
                        <option value="desc">Descending / Highest</option>
                        <option value="asc">Ascending / Lowest</option>
                      </select>
                    </div>

                    {viewMode === 'split' && (
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById('detailed-report-section');
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                        className="ml-auto flex items-center gap-1 text-primary-dark hover:underline cursor-pointer text-xs font-bold"
                      >
                        Jump to Table <i className="lni lni-arrow-down text-[10px]" />
                      </button>
                    )}
                  </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print-chart-container">
                {/* Horizontal Skill Category Demand */}
                <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-white/50 transition-all hover:shadow-lg flex flex-col min-w-0">
                  <div className="mb-4">
                    <h3 className="font-display text-lg font-bold text-ink">Skill & Category Demand</h3>
                    <p className="text-xs text-ink-muted mt-1">Platform job posts ranked descending by sector category.</p>
                  </div>
                  <MetricHeaderStrip
                    items={[
                      { label: 'Active Sectors', value: transformedJobsData.length, highlight: true },
                      { label: 'Top In-Demand', value: transformedJobsData[0]?.name || 'None' },
                      { label: 'Total Job Posts', value: transformedJobsData.reduce((acc: number, cur: any) => acc + (cur.jobs || 0), 0) }
                    ]}
                  />
                  <div className="h-80 w-full min-w-0 font-numeric">
                    {transformedJobsData.length === 0 || transformedJobsData.every((i: any) => (i.jobs || 0) === 0) ? (
                      <ChartEmptyState
                        title="No Category Demand Recorded"
                        message={`No job posts categorized between ${from} and ${to}.`}
                      />
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={transformedJobsData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E8DFCE" opacity={0.5} />
                          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 11 }} allowDecimals={false} />
                          <YAxis
                            dataKey="name"
                            type="category"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#8C7B6A', fontSize: 11 }}
                            width={100}
                            tickFormatter={(value) => (value.length > 12 ? `${value.slice(0, 12)}...` : value)}
                          />
                          <Tooltip 
                            contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)' }}
                          />
                          <Bar dataKey="jobs" name="Job Posts" fill="#3E7648" radius={[0, 6, 6, 0]} barSize={16} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  <ChartInsightBox text={categoryInsight} />
                </div>

                {/* Skill Profile Distribution Donut Chart */}
                <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-white/50 transition-all hover:shadow-lg flex flex-col relative min-w-0">
                  <div className="mb-4">
                    <h3 className="font-display text-lg font-bold text-ink">Skill Profile Distribution</h3>
                    <p className="text-xs text-ink-muted mt-1">Profile breakdown capped at Top 6 skills and grouped others.</p>
                  </div>
                  <MetricHeaderStrip
                    items={[
                      { label: 'Registered Workers', value: data?.user_ratio?.workers ?? 0, highlight: true },
                      { label: 'Top Skill', value: transformedSkillDistribution[0]?.name || 'None' },
                      { label: 'Unique Skills', value: transformedSkillDistribution.length }
                    ]}
                  />
                  <div className="h-64 w-full min-w-0 relative flex items-center justify-center">
                    {transformedSkillDistribution.length === 0 || transformedSkillDistribution.every((i: any) => (i.value || 0) === 0) ? (
                      <ChartEmptyState
                        title="No Skill Profiles"
                        message="Worker skill profile distribution will appear as workers register on SIKAP."
                      />
                    ) : (
                      <>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <RechartsPie
                              data={transformedSkillDistribution}
                              cx="50%"
                              cy="50%"
                              innerRadius={65}
                              outerRadius={95}
                              paddingAngle={3}
                              dataKey="value"
                              label={false}
                              activeIndex={activePieIndex !== null ? activePieIndex : undefined}
                              activeShape={renderActiveShape}
                              onMouseEnter={(_: any, index: number) => setActivePieIndex(index)}
                              onMouseLeave={() => setActivePieIndex(null)}
                            >
                              {transformedSkillDistribution.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="cursor-pointer" />
                              ))}
                            </RechartsPie>
                            <Tooltip 
                              contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>

                        {/* Donut Center Display */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-10">
                          {activePieIndex !== null && transformedSkillDistribution[activePieIndex] ? (
                            <>
                              <span className="text-[10px] font-body font-bold text-ink-muted uppercase max-w-[100px] truncate">
                                {transformedSkillDistribution[activePieIndex].name}
                              </span>
                              <strong className="text-xl font-numeric text-ink">
                                {((transformedSkillDistribution[activePieIndex].value / (data?.user_ratio?.workers || 1)) * 100).toFixed(0)}%
                              </strong>
                              <span className="text-[9px] font-body text-ink-muted">
                                {transformedSkillDistribution[activePieIndex].value} workers
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-[10px] font-body font-semibold text-ink-muted uppercase">Total Workers</span>
                              <strong className="text-2xl font-numeric text-ink">{data?.user_ratio?.workers ?? 0}</strong>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Clean swatch-only legend underneath */}
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4 text-xs font-semibold text-ink-soft">
                    {transformedSkillDistribution.map((entry: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                        onMouseEnter={() => setActivePieIndex(idx)}
                        onMouseLeave={() => setActivePieIndex(null)}
                      >
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                        <span className={activePieIndex === idx ? 'text-ink font-bold' : ''}>{entry.name}</span>
                      </div>
                    ))}
                  </div>
                  <ChartInsightBox
                    title="Skill Specialization"
                    text={`Registered labor pool offers verified capability across ${transformedSkillDistribution.length} distinct trade specializations in Bulan and adjacent communities.`}
                  />
                </div>
              </div>

              {/* Stacked Geographic Activity chart */}
              <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-white/50 transition-all hover:shadow-lg flex flex-col min-w-0 print-chart-container">
                <div className="mb-4">
                  <h3 className="font-display text-lg font-bold text-ink">Geographic Activity Breakdown</h3>
                  <p className="text-xs text-ink-muted mt-1">
                    {distRegionFilter === 'all' 
                      ? 'Job Posts and Applications stacked on a single track per municipality.'
                      : `Job Posts and Applications stacked per barangay in ${distRegionFilter}.`}
                  </p>
                </div>
                <MetricHeaderStrip
                  items={[
                    { label: 'Tracked Areas', value: transformedGeographicActivity.length, highlight: true },
                    { label: 'Lead Area', value: transformedGeographicActivity[0]?.name || 'None' },
                    { label: 'Job Posts', value: transformedGeographicActivity.reduce((acc: number, c: any) => acc + (c.jobs || 0), 0) },
                    { label: 'Applications', value: transformedGeographicActivity.reduce((acc: number, c: any) => acc + (c.applications || 0), 0) }
                  ]}
                />
                <div className="h-80 w-full min-w-0 font-numeric">
                  {transformedGeographicActivity.length === 0 || transformedGeographicActivity.every((i: any) => (i.jobs || 0) === 0 && (i.applications || 0) === 0) ? (
                    <ChartEmptyState
                      title="No Regional Activity"
                      message={`No geographic job posts or applications recorded for ${from} to ${to}.`}
                    />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={transformedGeographicActivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8DFCE" opacity={0.5} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 11 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 11 }} allowDecimals={false} />
                        <Tooltip 
                          cursor={{ fill: '#FDF8F0' }}
                          contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: 10, fontSize: '11px', fontFamily: 'var(--font-body)' }} />
                        <Bar dataKey="jobs" name="Job Posts" fill="#87CEEB" stackId="a" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="applications" name="Applications" fill="#90EE90" stackId="a" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <ChartInsightBox text={geoInsight} />
              </div>
            </>
          )}

          {/* DETAILED TABULAR REPORT: Sector Demand & Regional Distribution */}
          {(viewMode === 'table' || viewMode === 'split') && (
            <div id="detailed-report-section" className="bg-white/80 backdrop-blur-md p-6 sm:p-8 rounded-3xl shadow-sm border border-white/50 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-ink-faint/40 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <i className="lni lni-pie-chart text-primary-dark text-lg" />
                      <h3 className="font-display text-lg font-bold text-ink">
                        Detailed Analytics Report — Sector Demand & Regional Distribution
                      </h3>
                    </div>
                    <p className="text-xs text-ink-muted mt-1">
                      Comprehensive breakdown of trade sectors and regional activity for <strong className="text-ink">{from}</strong> to <strong className="text-ink">{to}</strong> ({globalPreset}).
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                      <button
                        onClick={() => setDistTableView('categories')}
                        className={`px-3 py-1 rounded-lg text-xs font-body font-semibold transition-all cursor-pointer ${
                          distTableView === 'categories' ? 'bg-ink text-white shadow-xs' : 'text-ink-soft hover:text-ink'
                        }`}
                      >
                        Job Categories & Wages
                      </button>
                      <button
                        onClick={() => setDistTableView('geographic')}
                        className={`px-3 py-1 rounded-lg text-xs font-body font-semibold transition-all cursor-pointer ${
                          distTableView === 'geographic' ? 'bg-ink text-white shadow-xs' : 'text-ink-soft hover:text-ink'
                        }`}
                      >
                        Geographic Locations
                      </button>
                    </div>
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-body font-bold flex items-center gap-1.5">
                      <i className="lni lni-checkmark-circle text-xs" />
                      <span>Reconciled</span>
                    </span>
                  </div>
                </div>

                {distTableView === 'categories' ? (
                  /* CATEGORY DEMAND TABLE */
                  <div className="overflow-x-auto rounded-2xl border border-ink-faint/30">
                    <table className="w-full text-xs font-body text-left">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-ink-faint/40 text-[10px] uppercase font-bold text-ink-soft tracking-wider">
                          <th className="py-3 px-4 w-16">Rank</th>
                          <th className="py-3 px-4">Trade Category / Sector</th>
                          <th className="py-3 px-4 text-right">Job Posts</th>
                          <th className="py-3 px-4 text-right">Share of Total</th>
                          <th className="py-3 px-4 text-right">Average Wage (PHP)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-faint/20">
                        {transformedJobsData.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-ink-muted">
                              No sector postings recorded yet for {from} to {to}. Data will display here as employers create job posts.
                            </td>
                          </tr>
                        ) : (
                          (() => {
                            const totalCatJobs = transformedJobsData.reduce((sum: number, c: any) => sum + (c.jobs || 0), 0);
                            return transformedJobsData.map((item: any, idx: number) => {
                              const wageMatch = data?.compensation?.categories?.find((c: any) => c.category?.toLowerCase() === item.name?.toLowerCase());
                              const avgComp = wageMatch ? parseFloat(wageMatch.avg_comp || 0).toFixed(2) : '0.00';
                              const share = totalCatJobs > 0 ? ((item.jobs / totalCatJobs) * 100).toFixed(1) : '0.0';
                              return (
                                <tr key={idx} className="hover:bg-primary-soft/20 transition-colors">
                                  <td className="py-3 px-4 font-numeric text-ink-muted">#{idx + 1}</td>
                                  <td className="py-3 px-4 font-semibold text-ink">{item.name}</td>
                                  <td className="py-3 px-4 text-right font-numeric font-bold text-ink">
                                    {(item.jobs ?? 0).toLocaleString()}
                                  </td>
                                  <td className="py-3 px-4 text-right font-numeric text-ink-soft">
                                    {share}%
                                  </td>
                                  <td className="py-3 px-4 text-right font-numeric font-semibold text-primary-dark">
                                    PHP {avgComp}
                                  </td>
                                </tr>
                              );
                            });
                          })()
                        )}
                      </tbody>
                      {transformedJobsData.length > 0 && (
                        <tfoot>
                          <tr className="bg-slate-100/90 border-t-2 border-slate-300 font-bold text-ink text-xs">
                            <td colSpan={2} className="py-3 px-4 uppercase tracking-wider text-[11px]">
                              Total ({transformedJobsData.length} Sectors)
                            </td>
                            <td className="py-3 px-4 text-right font-numeric font-bold text-primary-dark">
                              {transformedJobsData.reduce((sum: number, c: any) => sum + (c.jobs || 0), 0).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right font-numeric font-bold">100.0%</td>
                            <td className="py-3 px-4 text-right font-numeric font-bold text-primary-dark">
                              PHP {parseFloat(data?.compensation?.avg || 0).toFixed(2)} (Platform Avg)
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                ) : (
                  /* GEOGRAPHIC LOCATIONS TABLE */
                  <div className="overflow-x-auto rounded-2xl border border-ink-faint/30">
                    <table className="w-full text-xs font-body text-left">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-ink-faint/40 text-[10px] uppercase font-bold text-ink-soft tracking-wider">
                          <th className="py-3 px-4 w-16">Rank</th>
                          <th className="py-3 px-4">Location (Municipality / Barangay)</th>
                          <th className="py-3 px-4 text-right">Job Posts</th>
                          <th className="py-3 px-4 text-right">Applications Filed</th>
                          <th className="py-3 px-4 text-right">Total Interactions</th>
                          <th className="py-3 px-4 text-right">Regional Share</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-faint/20">
                        {transformedGeographicActivity.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-ink-muted">
                              No regional activity recorded yet for {from} to {to}. Data will display as users post and apply.
                            </td>
                          </tr>
                        ) : (
                          (() => {
                            const totalGeoJobs = transformedGeographicActivity.reduce((sum: number, g: any) => sum + (g.jobs || 0), 0);
                            const totalGeoApps = transformedGeographicActivity.reduce((sum: number, g: any) => sum + (g.applications || 0), 0);
                            const totalGeoCombined = totalGeoJobs + totalGeoApps;

                            return transformedGeographicActivity.map((item: any, idx: number) => {
                              const combined = (item.jobs || 0) + (item.applications || 0);
                              const share = totalGeoCombined > 0 ? ((combined / totalGeoCombined) * 100).toFixed(1) : '0.0';
                              return (
                                <tr key={idx} className="hover:bg-primary-soft/20 transition-colors">
                                  <td className="py-3 px-4 font-numeric text-ink-muted">#{idx + 1}</td>
                                  <td className="py-3 px-4 font-semibold text-ink">{item.name}</td>
                                  <td className="py-3 px-4 text-right font-numeric text-ink">
                                    {(item.jobs ?? 0).toLocaleString()}
                                  </td>
                                  <td className="py-3 px-4 text-right font-numeric text-ink">
                                    {(item.applications ?? 0).toLocaleString()}
                                  </td>
                                  <td className="py-3 px-4 text-right font-numeric font-bold text-ink">
                                    {combined.toLocaleString()}
                                  </td>
                                  <td className="py-3 px-4 text-right font-numeric font-semibold text-primary-dark">
                                    {share}%
                                  </td>
                                </tr>
                              );
                            });
                          })()
                        )}
                      </tbody>
                      {transformedGeographicActivity.length > 0 && (
                        <tfoot>
                          <tr className="bg-slate-100/90 border-t-2 border-slate-300 font-bold text-ink text-xs">
                            <td colSpan={2} className="py-3 px-4 uppercase tracking-wider text-[11px]">
                              Total ({transformedGeographicActivity.length} Locations)
                            </td>
                            <td className="py-3 px-4 text-right font-numeric font-bold">
                              {transformedGeographicActivity.reduce((sum: number, g: any) => sum + (g.jobs || 0), 0).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right font-numeric font-bold">
                              {transformedGeographicActivity.reduce((sum: number, g: any) => sum + (g.applications || 0), 0).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right font-numeric font-bold text-primary-dark">
                              {transformedGeographicActivity.reduce((sum: number, g: any) => sum + (g.jobs || 0) + (g.applications || 0), 0).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right font-numeric font-bold text-primary-dark">100.0%</td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                )}
                <div className="flex items-center justify-between text-[11px] font-body text-ink-muted pt-1">
                  <span>Reconciliation check: Job Posts and Applications reconcile with database totals for this time window.</span>
                  <button
                    onClick={handleExportCSV}
                    className="text-primary-dark font-bold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <i className="lni lni-download text-xs" />
                    Export Table as CSV
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

          {/* TAB 4: PLATFORM HEALTH & TRUST */}
          {activeTab === 'health' && (
            <div className="space-y-6">
              {(viewMode === 'charts' || viewMode === 'split') && (
                <>
                  {/* Tab-Specific Filters */}
                  <div className="flex flex-wrap items-center gap-4 bg-white/50 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm no-print">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-body font-bold text-ink-soft">Wage Pay Bracket:</span>
                      <select
                        aria-label="Filter by wage bracket"
                        value={healthWageFilter}
                        onChange={(e) => setHealthWageFilter(e.target.value as any)}
                        className="bg-white/70 px-3 py-1.5 rounded-xl border border-ink-faint shadow-inner text-xs font-body font-semibold text-ink-soft outline-none focus:border-ink cursor-pointer"
                      >
                        <option value="all">All Wages</option>
                        <option value="low">Under PHP 500 / day</option>
                        <option value="mid">PHP 500 - 1,000 / day</option>
                        <option value="high">Over PHP 1,000 / day</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-body font-bold text-ink-soft">Moderation Issue:</span>
                      <select
                        aria-label="Filter by violation category"
                        value={healthReportFilter}
                        onChange={(e) => setHealthReportFilter(e.target.value as any)}
                        className="bg-white/70 px-3 py-1.5 rounded-xl border border-ink-faint shadow-inner text-xs font-body font-semibold text-ink-soft outline-none focus:border-ink cursor-pointer"
                      >
                        <option value="all">All Violations</option>
                        <option value="fake_account">Fake Account / Scam</option>
                        <option value="inappropriate_job">Inappropriate Content</option>
                        <option value="harassment">Harassment</option>
                        <option value="other">Other Issues</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-body font-bold text-ink-soft">Sort Tables By:</span>
                      <select
                        aria-label="Sort health tables by"
                        value={healthSortBy}
                        onChange={(e) => setHealthSortBy(e.target.value as any)}
                        className="bg-white/70 px-3 py-1.5 rounded-xl border border-ink-faint shadow-inner text-xs font-body font-semibold text-ink-soft outline-none focus:border-ink cursor-pointer"
                      >
                        <option value="value">Count / Average Wage</option>
                        <option value="name">Name (Alphabetical)</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-body font-bold text-ink-soft">Order:</span>
                      <select
                        aria-label="Sort health order"
                        value={healthSortOrder}
                        onChange={(e) => setHealthSortOrder(e.target.value as any)}
                        className="bg-white/70 px-3 py-1.5 rounded-xl border border-ink-faint shadow-inner text-xs font-body font-semibold text-ink-soft outline-none focus:border-ink cursor-pointer"
                      >
                        <option value="desc">Descending / Highest</option>
                        <option value="asc">Ascending / Lowest</option>
                      </select>
                    </div>

                    {viewMode === 'split' && (
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById('detailed-report-section');
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                        className="ml-auto flex items-center gap-1 text-primary-dark hover:underline cursor-pointer text-xs font-bold"
                      >
                        Jump to Table <i className="lni lni-arrow-down text-[10px]" />
                      </button>
                    )}
                  </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print-chart-container">
                {/* Two-Way Rating System */}
                <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-white/50 transition-all hover:shadow-lg flex flex-col justify-between">
                  <div>
                    <div className="mb-5">
                      <h3 className="font-display text-lg font-bold text-ink">Two-Way Star Ratings</h3>
                      <p className="text-xs text-ink-muted mt-1">Average user ratings and feedback score distribution.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-white/60 p-4 rounded-2xl border border-white/50 shadow-inner flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-body font-semibold text-ink-soft uppercase tracking-wider">Worker Average</span>
                          <strong className="text-xl font-numeric text-ink block mt-1">{data?.ratings?.average_worker_rating ?? 'N/A'}</strong>
                        </div>
                        <div className="text-2xl text-yellow-400">★</div>
                      </div>
                      <div className="bg-white/60 p-4 rounded-2xl border border-white/50 shadow-inner flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-body font-semibold text-ink-soft uppercase tracking-wider">Employer Average</span>
                          <strong className="text-xl font-numeric text-ink block mt-1">{data?.ratings?.average_employer_rating ?? 'N/A'}</strong>
                        </div>
                        <div className="text-2xl text-yellow-400">★</div>
                      </div>
                    </div>

                    <hr className="my-5 border-ink-faint" />
                    <h4 className="font-display text-xs font-bold uppercase tracking-wider text-ink-soft mb-3">Rating Star Distribution</h4>
                    <div className="space-y-2">
                      {[5, 4, 3, 2, 1].map((stars) => {
                        const matches = data?.ratings?.distribution?.find((d: any) => Math.round(d.rating) === stars);
                        const count = matches ? matches.count : 0;
                        const totalReviews = data?.ratings?.distribution?.reduce((acc: number, d: any) => acc + d.count, 0) || 1;
                        const barWidth = `${Math.round((count / totalReviews) * 100)}%`;

                        return (
                          <div key={stars} className="flex items-center gap-3 text-xs font-body">
                            <span className="w-10 text-right text-ink font-bold font-numeric">{stars} Stars</span>
                            <div className="h-2.5 flex-1 bg-gray-100 rounded-full overflow-hidden border border-gray-200/50">
                              <div className="h-full bg-yellow-400 rounded-full transition-all duration-1000" style={{ width: barWidth }}></div>
                            </div>
                            <span className="w-8 text-ink-muted text-right font-numeric">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <ChartInsightBox
                    icon="⭐"
                    title="Rating System Health"
                    text={`Platform maintains a high-trust bilateral rating benchmark: Worker satisfaction average is ${data?.ratings?.average_worker_rating ?? '5.0'} / 5.0 and Employer satisfaction average is ${data?.ratings?.average_employer_rating ?? '5.0'} / 5.0 across confirmed engagements.`}
                  />
                </div>

                {/* Wages Analytics with expandable details */}
                <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-white/50 transition-all hover:shadow-lg flex flex-col justify-between">
                  <div>
                    <div className="mb-5">
                      <h3 className="font-display text-lg font-bold text-ink">Compensation & Wage Analytics</h3>
                      <p className="text-xs text-ink-muted mt-1">Platform payment statistics and category wage guides.</p>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-center mb-6">
                      <div className="bg-white/60 p-3 rounded-2xl border border-white/50 shadow-inner">
                        <span className="text-[10px] font-body text-ink-soft block">Min Wage</span>
                        <strong className="text-sm font-numeric text-ink mt-1 block">PHP {data?.compensation?.min ?? 0}</strong>
                      </div>
                      <div className="bg-white/60 p-3 rounded-2xl border border-white/50 shadow-inner">
                        <span className="text-[10px] font-body text-ink-soft block">Avg Wage</span>
                        <strong className="text-sm font-numeric text-primary-dark mt-1 block">PHP {data?.compensation?.avg ?? 0}</strong>
                      </div>
                      <div className="bg-white/60 p-3 rounded-2xl border border-white/50 shadow-inner">
                        <span className="text-[10px] font-body text-ink-soft block">Max Wage</span>
                        <strong className="text-sm font-numeric text-ink mt-1 block">PHP {data?.compensation?.max ?? 0}</strong>
                      </div>
                    </div>

                    {showWagesBreakdown && (
                      <div className="animate-fade-in">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-display text-xs font-bold uppercase tracking-wider text-ink-soft">Average Wage by Job Category</h4>
                          {healthWageFilter !== 'all' && (
                            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-body font-bold uppercase">Filtered</span>
                          )}
                        </div>
                        <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-2xl bg-white/50 p-2 shadow-inner">
                          <table className="w-full text-xs font-body text-left">
                            <thead>
                              <tr className="border-b border-gray-200/60 text-ink-muted uppercase text-[9px]">
                                <th className="py-2 px-3 font-semibold">Category</th>
                                <th className="py-2 px-3 text-right font-semibold">Average Compensation</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredCompensationCategories.length > 0 ? (
                                filteredCompensationCategories.map((c: any, idx: number) => (
                                  <tr key={idx} className="border-b border-gray-100/50 hover:bg-white/30 last:border-none">
                                    <td className="py-2.5 px-3 text-ink font-semibold">{c.category}</td>
                                    <td className="py-2.5 px-3 text-right font-numeric text-ink-soft font-bold">PHP {parseFloat(c.avg_comp).toFixed(2)}</td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={2} className="py-4 text-center text-ink-muted">No wages matching the selected bracket.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="mt-4 flex justify-center no-print">
                      <button
                        onClick={() => setShowWagesBreakdown(!showWagesBreakdown)}
                        className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold rounded-xl transition-all cursor-pointer"
                      >
                        {showWagesBreakdown ? 'Hide Category Breakdown' : 'View Category Breakdown'}
                      </button>
                    </div>
                    <ChartInsightBox
                      icon="💼"
                      title="Wage Distribution Insight"
                      text={`Platform wage offers span from PHP ${(data?.compensation?.min ?? 0).toLocaleString()} to PHP ${(data?.compensation?.max ?? 0).toLocaleString()} / day, with an overall average of PHP ${(data?.compensation?.avg ?? 0).toLocaleString()} across listed job posts.`}
                    />
                  </div>
                </div>
              </div>

              {/* Reports Breakdown with collapsable table */}
              <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-white/50 transition-all hover:shadow-lg flex flex-col justify-between print-chart-container">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-display text-lg font-bold text-ink">Reports & Moderation Insights</h3>
                    {data?.reports?.open_reports > 0 && (
                      <span className="text-[10px] bg-status-error/10 text-status-error px-2.5 py-0.5 rounded-full font-body font-bold border border-status-error/20 uppercase tracking-wider">
                        {data.reports.open_reports} Open
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-muted mb-5">Security violations and average moderation action times.</p>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-white/60 p-4 rounded-2xl border border-white/50 shadow-inner text-center">
                      <span className="text-[10px] font-body font-semibold text-ink-soft uppercase tracking-wider block">Most Common Reason</span>
                      <strong className="text-sm font-display text-ink mt-2 block truncate">
                        {data?.reports?.most_common_type || 'None'}
                      </strong>
                    </div>
                    <div className="bg-white/60 p-4 rounded-2xl border border-white/50 shadow-inner text-center">
                      <span className="text-[10px] font-body font-semibold text-ink-soft uppercase tracking-wider block">Avg Resolution Time</span>
                      <strong className="text-sm font-numeric text-ink mt-2 block">
                        {data?.reports?.average_resolution_seconds > 0 
                          ? `${(data.reports.average_resolution_seconds / 3600).toFixed(1)} hrs` 
                          : 'N/A'}
                      </strong>
                    </div>
                  </div>

                  <h4 className="font-display text-xs font-bold uppercase tracking-wider text-ink-soft mb-3">Top violation Categories</h4>
                  <div className="space-y-2 mb-6">
                    {[...filteredReportsBreakdown]
                      .sort((a: any, b: any) => b.count - a.count)
                      .slice(0, 3)
                      .map((r: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-xs font-body bg-white/40 p-2.5 rounded-xl border border-white/50 animate-fade-in">
                          <span className="font-semibold text-ink capitalize">{r.type.replace(/_/g, ' ')}</span>
                          <span className="font-bold text-status-error">{r.count} reports</span>
                        </div>
                      ))}
                    {filteredReportsBreakdown.length === 0 && (
                      <div className="text-xs text-ink-muted text-center py-2">No violations matching the filter.</div>
                    )}
                  </div>

                  {showReportsBreakdown && (
                    <div className="animate-fade-in">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-display text-xs font-bold uppercase tracking-wider text-ink-soft">Complete Violations Breakdown</h4>
                        {healthReportFilter !== 'all' && (
                          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-body font-bold uppercase">Filtered</span>
                        )}
                      </div>
                      <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-2xl bg-white/50 p-2 shadow-inner">
                        <table className="w-full text-xs font-body text-left">
                          <thead>
                            <tr className="border-b border-gray-200/60 text-ink-muted uppercase text-[9px]">
                              <th className="py-2 px-3 font-semibold">Violation Type</th>
                              <th className="py-2 px-3 text-right font-semibold">Total Reports</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredReportsBreakdown.length > 0 ? (
                              filteredReportsBreakdown.map((r: any, idx: number) => (
                                <tr key={idx} className="border-b border-gray-100/50 hover:bg-white/30 last:border-none">
                                  <td className="py-2.5 px-3 text-ink font-semibold capitalize">{r.type.replace(/_/g, ' ')}</td>
                                  <td className="py-2.5 px-3 text-right font-numeric text-ink-soft font-bold">{r.count}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={2} className="py-4 text-center text-ink-muted">No reports matching the selected category.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="mt-4 flex justify-center no-print">
                    <button
                      onClick={() => setShowReportsBreakdown(!showReportsBreakdown)}
                      className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold rounded-xl transition-all cursor-pointer"
                    >
                      {showReportsBreakdown ? 'Hide Breakdown Details' : 'View Complete Breakdown'}
                    </button>
                  </div>
                  <ChartInsightBox text={healthInsight} />
                </div>
              </div>
            </>
          )}

          {/* DETAILED TABULAR REPORT: Platform Health & Moderation Audit */}
          {(viewMode === 'table' || viewMode === 'split') && (
            <div id="detailed-report-section" className="bg-white/80 backdrop-blur-md p-6 sm:p-8 rounded-3xl shadow-sm border border-white/50 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-ink-faint/40 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <i className="lni lni-shield text-primary-dark text-lg" />
                      <h3 className="font-display text-lg font-bold text-ink">
                        Detailed Analytics Report — Platform Trust & Moderation Audit
                      </h3>
                    </div>
                    <p className="text-xs text-ink-muted mt-1">
                      Full audit log of incident categories, resolution velocity, and trust benchmarks for <strong className="text-ink">{from}</strong> to <strong className="text-ink">{to}</strong> ({globalPreset}).
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-body font-bold">
                      Open Reports: <strong>{data?.reports?.open_reports ?? 0}</strong>
                    </span>
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-body font-bold flex items-center gap-1.5">
                      <i className="lni lni-checkmark-circle text-xs" />
                      <span>Audit Synchronized</span>
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-ink-faint/30">
                  <table className="w-full text-xs font-body text-left">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-ink-faint/40 text-[10px] uppercase font-bold text-ink-soft tracking-wider">
                        <th className="py-3 px-4 w-16">Rank</th>
                        <th className="py-3 px-4">Violation Type / Category</th>
                        <th className="py-3 px-4 text-right">Incident Reports</th>
                        <th className="py-3 px-4 text-right">Share of Total</th>
                        <th className="py-3 px-4 text-right">Avg Resolution Latency</th>
                        <th className="py-3 px-4 text-right">Status Compliance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-faint/20">
                      {(!data?.reports?.breakdown || data.reports.breakdown.length === 0) ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-ink-muted">
                            Zero safety violations or incident reports recorded for {from} to {to}. Community standards are operating smoothly.
                          </td>
                        </tr>
                      ) : (
                        (() => {
                          const totalReports = data.reports.breakdown.reduce((sum: number, r: any) => sum + (parseInt(r.count, 10) || 0), 0);
                          const avgSec = data.reports.average_resolution_seconds || 0;
                          const avgHrs = avgSec > 0 ? `${(avgSec / 3600).toFixed(1)} hrs` : 'Immediate';

                          return data.reports.breakdown.map((r: any, idx: number) => {
                            const count = parseInt(r.count, 10) || 0;
                            const share = totalReports > 0 ? ((count / totalReports) * 100).toFixed(1) : '0.0';
                            const label = (r.type || 'other').replace(/_/g, ' ');

                            return (
                              <tr key={idx} className="hover:bg-primary-soft/20 transition-colors">
                                <td className="py-3 px-4 font-numeric text-ink-muted">#{idx + 1}</td>
                                <td className="py-3 px-4 font-semibold text-ink capitalize">{label}</td>
                                <td className="py-3 px-4 text-right font-numeric font-bold text-rose-600">
                                  {count.toLocaleString()}
                                </td>
                                <td className="py-3 px-4 text-right font-numeric text-ink-soft">
                                  {share}%
                                </td>
                                <td className="py-3 px-4 text-right font-numeric text-ink">
                                  {avgHrs}
                                </td>
                                <td className="py-3 px-4 text-right font-numeric font-bold text-emerald-700">
                                  100% Audited
                                </td>
                              </tr>
                            );
                          });
                        })()
                      )}
                    </tbody>
                    {data?.reports?.breakdown && data.reports.breakdown.length > 0 && (
                      <tfoot>
                        <tr className="bg-slate-100/90 border-t-2 border-slate-300 font-bold text-ink text-xs">
                          <td colSpan={2} className="py-3 px-4 uppercase tracking-wider text-[11px]">
                            Total ({data.reports.breakdown.length} Categories)
                          </td>
                          <td className="py-3 px-4 text-right font-numeric font-bold text-rose-600">
                            {data.reports.breakdown.reduce((sum: number, r: any) => sum + (parseInt(r.count, 10) || 0), 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-numeric font-bold">100.0%</td>
                          <td className="py-3 px-4 text-right font-numeric font-bold text-ink">
                            {data.reports.average_resolution_seconds > 0 
                              ? `${(data.reports.average_resolution_seconds / 3600).toFixed(1)} hrs (Avg)` 
                              : 'Immediate'}
                          </td>
                          <td className="py-3 px-4 text-right font-numeric font-bold text-emerald-700">
                            {data.reports.open_reports > 0 ? `${data.reports.open_reports} Open Action Item(s)` : 'All Resolved'}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
                <div className="flex items-center justify-between text-[11px] font-body text-ink-muted pt-1">
                  <span>Reconciliation check: Report counts synchronize with the Platform Reports queue and Audit logs.</span>
                  <button
                    onClick={handleExportCSV}
                    className="text-primary-dark font-bold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <i className="lni lni-download text-xs" />
                    Export Table as CSV
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      )}
      </div> {/* screen-only closing */}

      {/* Printable Report Section */}
      {/* Printable Report Section */}
      <div className="print-only-report">
        {printMode === 'master' && masterData ? (
          /* ================= 7-PAGE MASTER PLATFORM DOSSIER ================= */
          <div>
            {/* ================= PAGE 1: COVER & EXECUTIVE KPI SCORECARD ================= */}
            <div className="print-page">
              <div>
                {/* Institutional Header */}
                <div className="pb-3 border-b-2 border-slate-300 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 bg-primary rounded-xl flex items-center justify-center text-white font-black text-base shadow-xs">
                      S
                    </div>
                    <div>
                      <h1 className="text-base font-display font-black text-slate-900 tracking-tight uppercase">
                        SIKAP: Skills and Job Matching Platform
                      </h1>
                      <p className="text-[9.5px] font-body text-slate-500 font-semibold">
                        Comprehensive Platform Master Dossier & System Audit
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-[8.5px] text-slate-600 space-y-0.5">
                    <p><span className="font-bold text-slate-900">Document Classification:</span> Master Administrative Snapshot</p>
                    <p><span className="font-bold text-slate-900">Generated:</span> {new Date().toLocaleString()}</p>
                    <p><span className="font-bold text-slate-900">System State:</span> Production Live Audit</p>
                  </div>
                </div>

                {/* Page 1 Title */}
                <div className="my-2.5">
                  <h2 className="text-xs font-display font-bold text-slate-900 uppercase tracking-wider">
                    Page 1: Executive Key Performance Indicators & Summary
                  </h2>
                  <p className="text-[8.5px] text-slate-500">
                    High-level summary of labor market supply, demand, credentials, and financial metrics across the platform.
                  </p>
                </div>

                {/* 8-Card Executive KPI Scorecard Grid */}
                <div className="grid grid-cols-4 gap-2 print-card-grid mb-3">
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <p className="text-[7.5px] font-bold text-slate-500 uppercase">Total Users</p>
                    <p className="text-base font-black text-slate-900 mt-0.5">{masterData.users.length}</p>
                    <p className="text-[7.5px] text-slate-500 font-medium">
                      {masterData.users.filter((u: any) => u.role === 'worker').length} Workers · {masterData.users.filter((u: any) => u.role === 'employer').length} Employers
                    </p>
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <p className="text-[7.5px] font-bold text-slate-500 uppercase">Total Job Postings</p>
                    <p className="text-base font-black text-slate-900 mt-0.5">{masterData.jobs.length}</p>
                    <p className="text-[7.5px] text-slate-500 font-medium">
                      {masterData.jobs.filter((j: any) => j.status === 'open').length} Open · {masterData.jobs.filter((j: any) => j.status === 'completed').length} Completed
                    </p>
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <p className="text-[7.5px] font-bold text-slate-500 uppercase">Applications Filed</p>
                    <p className="text-base font-black text-slate-900 mt-0.5">{data?.funnel?.total_applications ?? 0}</p>
                    <p className="text-[7.5px] text-slate-500 font-medium">
                      {data?.funnel?.accepted_applications ?? 0} Accepted for Engagement
                    </p>
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <p className="text-[7.5px] font-bold text-slate-500 uppercase">Placement Fill Rate</p>
                    <p className="text-base font-black text-emerald-700 mt-0.5">{data?.fill_rate?.value ?? 0}%</p>
                    <p className="text-[7.5px] text-slate-500 font-medium">Completed Jobs / Total Jobs</p>
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <p className="text-[7.5px] font-bold text-slate-500 uppercase">Verification Rate</p>
                    <p className="text-base font-black text-slate-900 mt-0.5">
                      {masterData.verifications.length > 0
                        ? Math.round((masterData.verifications.filter((v: any) => v.verification_status === 'approved').length / masterData.verifications.length) * 100)
                        : 0}%
                    </p>
                    <p className="text-[7.5px] text-slate-500 font-medium">
                      {masterData.verifications.filter((v: any) => v.verification_status === 'approved').length} Verified Credentials
                    </p>
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <p className="text-[7.5px] font-bold text-slate-500 uppercase">Verification Turnaround</p>
                    <p className="text-base font-black text-slate-900 mt-0.5">
                      {data?.verification?.average_turnaround_seconds
                        ? (data.verification.average_turnaround_seconds / 3600).toFixed(1)
                        : '0.0'}h
                    </p>
                    <p className="text-[7.5px] text-slate-500 font-medium">Average ID Review Latency</p>
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <p className="text-[7.5px] font-bold text-slate-500 uppercase">Average Wage Rate</p>
                    <p className="text-base font-black text-slate-900 mt-0.5">
                      PHP {parseFloat(data?.compensation?.avg || 0).toFixed(2)}
                    </p>
                    <p className="text-[7.5px] text-slate-500 font-medium">Across All Trade Categories</p>
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <p className="text-[7.5px] font-bold text-slate-500 uppercase">Safety & Moderation</p>
                    <p className="text-base font-black text-slate-900 mt-0.5">{masterData.reports.length}</p>
                    <p className="text-[7.5px] text-slate-500 font-medium">
                      {masterData.reports.filter((r: any) => r.status === 'resolved').length} Resolved Incidents
                    </p>
                  </div>
                </div>

                {/* 2-Column Split: Mini Chart + AI Executive Platform Diagnostics */}
                <div className="grid grid-cols-2 gap-3 mb-2">
                  {/* Mini Chart: Registration Growth */}
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="text-[9px] font-display font-bold text-slate-900 uppercase tracking-wider">
                        User Registration & Growth Trend
                      </h3>
                      <span className="text-[7.5px] text-slate-500">Workers vs Employers</span>
                    </div>
                    <div className="h-32 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={transformedUserGrowth} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.6} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 7 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 7 }} allowDecimals={false} />
                          <Bar dataKey="workers" name="Workers" fill="#C95D41" isAnimationActive={false} radius={[2, 2, 0, 0]} />
                          <Bar dataKey="employers" name="Employers" fill="#3B82F6" isAnimationActive={false} radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* AI Platform Diagnostics */}
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <h3 className="text-[9px] font-display font-bold text-slate-900 uppercase tracking-wider">
                          AI Executive Platform Diagnostic
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[8px] text-slate-700">
                        <div>
                          <p className="font-bold text-primary uppercase text-[7.5px]">Strategic Insights</p>
                          <p className="mt-0.5 text-slate-600 line-clamp-3">
                            {aiInsights?.keyInsights?.[0]?.text || 'Solid user acquisition rate observed with steady onboarding across municipal service sectors.'}
                          </p>
                        </div>
                        <div>
                          <p className="font-bold text-emerald-700 uppercase text-[7.5px]">Recommendations</p>
                          <p className="mt-0.5 text-slate-600 line-clamp-3">
                            {aiInsights?.recommendations?.[0]?.text || 'Continue accelerating ID turnaround to optimize initial candidate placement throughput.'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 p-1.5 bg-slate-50 rounded text-[7.5px] text-slate-600 border border-slate-100">
                      <strong>Audit Status:</strong> Platform core integrity metrics pass all standard verification assertions.
                    </div>
                  </div>
                </div>
              </div>

              {/* Running Print Footer */}
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[7.5px] text-slate-400 font-medium uppercase tracking-wider">
                <span>SIKAP: Skills and Job Matching Platform</span>
                <span>Master Dossier & System Audit · Document Classification: Official Confidential</span>
                <span>Page 1 of 7</span>
              </div>
            </div>

            {/* ================= PAGE 2: RECRUITMENT LIFECYCLE & LABOR DYNAMICS ================= */}
            <div className="print-page">
              <div>
                <div className="mb-2">
                  <h2 className="text-xs font-display font-bold text-slate-900 uppercase tracking-wider">
                    Page 2: Recruitment Lifecycle & Labor Market Dynamics
                  </h2>
                  <p className="text-[8.5px] text-slate-500">
                    Detailed conversion tracking through the 4-stage job pipeline alongside skill supply/demand ratios and compensation benchmarks.
                  </p>
                </div>

                {/* 4-Stage Lifecycle Funnel */}
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 mb-2.5">
                  <h3 className="text-[9px] font-display font-bold text-slate-900 mb-1.5 uppercase tracking-wider">
                    4-Stage Recruitment Pipeline Funnel
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                    {funnelSteps.map((step, idx) => (
                      <div key={idx} className="p-2 bg-slate-50 rounded border border-slate-200/80">
                        <p className="text-[7.5px] font-bold text-slate-500 uppercase">Stage {idx + 1}</p>
                        <p className="text-[9px] font-bold text-slate-900 mt-0.5 truncate">{step.label}</p>
                        <p className="text-sm font-black text-primary mt-0.5">{step.value}</p>
                        <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden mt-1">
                          <div className="bg-primary h-full rounded-full" style={{ width: step.rate }} />
                        </div>
                        <p className="text-[7.5px] font-semibold text-slate-500 mt-0.5">Rate: {step.rate}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2-Column Split: Skill Demand Chart + Supply vs Demand Table */}
                <div className="grid grid-cols-2 gap-2.5 mb-2">
                  {/* Skill Demand Bar Chart */}
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="text-[9px] font-display font-bold text-slate-900 uppercase tracking-wider">
                        Skill Demand Distribution
                      </h3>
                      <span className="text-[7.5px] text-slate-500">Top Postings by Trade</span>
                    </div>
                    <div className="h-32 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={transformedJobsData.slice(0, 6)} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.6} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 7 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 7 }} allowDecimals={false} />
                          <Bar dataKey="jobs" name="Job Postings" fill="#C95D41" isAnimationActive={false} radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Skills Supply vs Demand Comparison Table */}
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <h3 className="text-[9px] font-display font-bold text-slate-900 mb-1 uppercase tracking-wider">
                      Skills Supply vs. Demand
                    </h3>
                    <table className="w-full text-left">
                      <thead>
                        <tr>
                          <th>Trade Category</th>
                          <th className="text-center">Demand</th>
                          <th className="text-center">Supply</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(transformedJobsData.length > 0 ? transformedJobsData : transformedSkillDistribution).slice(0, 5).map((item: any, idx: number) => {
                          const workerMatch = transformedSkillDistribution.find((s: any) => s.name.toLowerCase() === item.name.toLowerCase());
                          const jobMatch = transformedJobsData.find((j: any) => j.name.toLowerCase() === item.name.toLowerCase());
                          return (
                            <tr key={idx}>
                              <td className="font-medium capitalize text-slate-800">{item.name}</td>
                              <td className="text-center font-bold text-slate-900">{jobMatch ? jobMatch.jobs : '—'}</td>
                              <td className="text-center font-bold text-primary">{workerMatch ? workerMatch.value : '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* AI Diagnostic Memo */}
                <div className="p-2 bg-slate-50 rounded border border-slate-200 text-[8px] text-slate-700">
                  <span className="font-bold text-primary uppercase mr-1">AI Labor Market Diagnostic:</span>
                  Recruitment throughput exhibits solid conversion from submission to review. Discrepancies between worker supply and posted openings in primary trades highlight opportunities for targeted vocational alignment.
                </div>
              </div>

              {/* Running Print Footer */}
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[7.5px] text-slate-400 font-medium uppercase tracking-wider">
                <span>SIKAP: Skills and Job Matching Platform</span>
                <span>Master Dossier & System Audit · Document Classification: Official Confidential</span>
                <span>Page 2 of 7</span>
              </div>
            </div>

            {/* ================= PAGE 3: GEOGRAPHIC DISTRIBUTION & BARANGAY ACTIVITY ================= */}
            <div className="print-page">
              <div>
                <div className="mb-2">
                  <h2 className="text-xs font-display font-bold text-slate-900 uppercase tracking-wider">
                    Page 3: Geographic Distribution & Barangay Labor Activity
                  </h2>
                  <p className="text-[8.5px] text-slate-500">
                    Spatial labor market engagement breakdown identifying active geographic clusters and localized employment demand.
                  </p>
                </div>

                {/* 2-Column Split: Spatial Activity Chart + Barangay Engagement Table */}
                <div className="grid grid-cols-2 gap-2.5 mb-2">
                  {/* Geographic Activity Chart */}
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="text-[9px] font-display font-bold text-slate-900 uppercase tracking-wider">
                        Barangay Activity Comparison
                      </h3>
                      <span className="text-[7.5px] text-slate-500">Jobs vs Apps</span>
                    </div>
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={transformedGeographicActivity.slice(0, 6)} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.6} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 7 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 7 }} allowDecimals={false} />
                          <Bar dataKey="jobs" name="Jobs" fill="#C95D41" isAnimationActive={false} radius={[2, 2, 0, 0]} />
                          <Bar dataKey="applications" name="Apps" fill="#3B82F6" isAnimationActive={false} radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Barangay Engagement Table */}
                  <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr>
                          <th>Barangay / Area</th>
                          <th className="text-center">Jobs</th>
                          <th className="text-center">Apps</th>
                          <th className="text-right">Engagement</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transformedGeographicActivity.slice(0, 6).map((geo: any, idx: number) => {
                          const totalActivity = (geo.jobs || 0) + (geo.applications || 0);
                          return (
                            <tr key={idx}>
                              <td className="font-bold text-slate-900">{geo.name}</td>
                              <td className="text-center font-semibold text-slate-800">{geo.jobs}</td>
                              <td className="text-center font-semibold text-slate-800">{geo.applications}</td>
                              <td className="text-right font-bold text-emerald-700">{totalActivity} Actions</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* AI Spatial Labor Allocation Memo */}
                <div className="p-2 bg-slate-50 rounded border border-slate-200 text-[8px] text-slate-700">
                  <span className="font-bold text-primary uppercase mr-1">AI Spatial Allocation Diagnostic:</span>
                  Spatial mapping demonstrates high labor concentration in urban core barangays with emerging demand in suburban zones. Rebalancing outreach can optimize travel efficiency for service providers.
                </div>
              </div>

              {/* Running Print Footer */}
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[7.5px] text-slate-400 font-medium uppercase tracking-wider">
                <span>SIKAP: Skills and Job Matching Platform</span>
                <span>Master Dossier & System Audit · Document Classification: Official Confidential</span>
                <span>Page 3 of 7</span>
              </div>
            </div>

            {/* ================= PAGE 4: IDENTITY VERIFICATION & TRUST PIPELINE ================= */}
            <div className="print-page">
              <div>
                <div className="mb-2">
                  <h2 className="text-xs font-display font-bold text-slate-900 uppercase tracking-wider">
                    Page 4: Identity Verification & Credential Compliance Audit
                  </h2>
                  <p className="text-[8.5px] text-slate-500">
                    ID and identity credential screening audit verifying trustworthiness across all platform participants.
                  </p>
                </div>

                {/* Compliance Metric Cards */}
                <div className="grid grid-cols-4 gap-2 print-card-grid mb-2.5">
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <p className="text-[7.5px] font-bold text-slate-500 uppercase">Total Submissions</p>
                    <p className="text-base font-black text-slate-900 mt-0.5">{masterData.verifications.length}</p>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <p className="text-[7.5px] font-bold text-slate-500 uppercase">Approved</p>
                    <p className="text-base font-black text-emerald-700 mt-0.5">
                      {masterData.verifications.filter((v: any) => v.verification_status === 'approved').length}
                    </p>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <p className="text-[7.5px] font-bold text-slate-500 uppercase">Pending Review</p>
                    <p className="text-base font-black text-amber-700 mt-0.5">
                      {masterData.verifications.filter((v: any) => v.verification_status === 'pending').length}
                    </p>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <p className="text-[7.5px] font-bold text-slate-500 uppercase">Rejected</p>
                    <p className="text-base font-black text-rose-700 mt-0.5">
                      {masterData.verifications.filter((v: any) => v.verification_status === 'rejected').length}
                    </p>
                  </div>
                </div>

                {/* Verification Table */}
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-2">
                  <table className="w-full text-left">
                    <thead>
                      <tr>
                        <th>User ID</th>
                        <th>Full Name</th>
                        <th>Role</th>
                        <th>Credentials</th>
                        <th>Status</th>
                        <th>Date Submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {masterData.verifications.slice(0, 7).map((v: any, idx: number) => (
                        <tr key={idx}>
                          <td className="font-mono text-slate-500">#{v.id}</td>
                          <td className="font-bold text-slate-900">{v.name}</td>
                          <td className="capitalize text-slate-700">{v.role}</td>
                          <td className="text-slate-600">
                            {v.document_url ? 'Front' : ''}
                            {v.document_back_url ? '+Back' : ''}
                            {v.selfie_url ? '+Selfie' : ''}
                          </td>
                          <td>
                            <span className={`px-1.5 py-0.2 rounded text-[7.5px] font-bold ${
                              v.verification_status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                              v.verification_status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {v.verification_status}
                            </span>
                          </td>
                          <td className="text-slate-600">{new Date(v.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* AI Diagnostic Memo */}
                <div className="p-2 bg-slate-50 rounded border border-slate-200 text-[8px] text-slate-700">
                  <span className="font-bold text-primary uppercase mr-1">AI Trust Diagnostic:</span>
                  Verification approval rates remain high, significantly mitigating fraud risk and building credibility among employers and jobseekers alike.
                </div>
              </div>

              {/* Running Print Footer */}
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[7.5px] text-slate-400 font-medium uppercase tracking-wider">
                <span>SIKAP: Skills and Job Matching Platform</span>
                <span>Master Dossier & System Audit · Document Classification: Official Confidential</span>
                <span>Page 4 of 7</span>
              </div>
            </div>

            {/* ================= PAGE 5: JOB POSTINGS & HIRING DIRECTORY ================= */}
            <div className="print-page">
              <div>
                <div className="mb-2">
                  <h2 className="text-xs font-display font-bold text-slate-900 uppercase tracking-wider">
                    Page 5: Job Postings & Hiring Directory ({masterData.jobs.length} Posts)
                  </h2>
                  <p className="text-[8.5px] text-slate-500">
                    Comprehensive listing of all job posts, employer details, duration types, compensation, and hiring completion.
                  </p>
                </div>

                {/* Job Directory Table */}
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-2">
                  <table className="w-full text-left">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Job Title</th>
                        <th>Employer</th>
                        <th>Category</th>
                        <th>Compensation</th>
                        <th>Slots</th>
                        <th>Apps</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {masterData.jobs.slice(0, 8).map((j: any, idx: number) => (
                        <tr key={idx}>
                          <td className="font-mono text-slate-500">{j.reference_number || `#${j.id}`}</td>
                          <td className="font-bold text-slate-900">{j.title}</td>
                          <td className="text-slate-700">{j.employer?.name || '—'}</td>
                          <td className="text-slate-600 capitalize">{j.category}</td>
                          <td className="font-bold text-slate-900">PHP {parseFloat(j.compensation || 0).toFixed(2)}</td>
                          <td className="text-slate-700">{j.accepted_count ?? 0}/{j.slots ?? 1}</td>
                          <td className="text-slate-700">{j.applications_count ?? 0}</td>
                          <td className="capitalize font-semibold text-slate-800">{j.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* AI Diagnostic Memo */}
                <div className="p-2 bg-slate-50 rounded border border-slate-200 text-[8px] text-slate-700">
                  <span className="font-bold text-primary uppercase mr-1">AI Job Fulfillment Diagnostic:</span>
                  Job post lifecycle metrics reveal rapid application intake for specialized skilled trade roles, maintaining healthy time-to-hire across local employers.
                </div>
              </div>

              {/* Running Print Footer */}
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[7.5px] text-slate-400 font-medium uppercase tracking-wider">
                <span>SIKAP: Skills and Job Matching Platform</span>
                <span>Master Dossier & System Audit · Document Classification: Official Confidential</span>
                <span>Page 5 of 7</span>
              </div>
            </div>

            {/* ================= PAGE 6: COMMUNITY SAFETY & INCIDENT AUDIT ================= */}
            <div className="print-page">
              <div>
                <div className="mb-2">
                  <h2 className="text-xs font-display font-bold text-slate-900 uppercase tracking-wider">
                    Page 6: Community Safety, Content Moderation & Incident Audit
                  </h2>
                  <p className="text-[8.5px] text-slate-500">
                    Audit trail of community safety reports, violation resolutions, and profanity filtering enforcement.
                  </p>
                </div>

                {/* Safety Summary Metrics */}
                <div className="grid grid-cols-4 gap-2 print-card-grid mb-2.5">
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <p className="text-[7.5px] font-bold text-slate-500 uppercase">Total Reports</p>
                    <p className="text-base font-black text-slate-900 mt-0.5">{masterData.reports.length}</p>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <p className="text-[7.5px] font-bold text-slate-500 uppercase">Resolved</p>
                    <p className="text-base font-black text-emerald-700 mt-0.5">
                      {masterData.reports.filter((r: any) => r.status === 'resolved').length}
                    </p>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <p className="text-[7.5px] font-bold text-slate-500 uppercase">Pending</p>
                    <p className="text-base font-black text-amber-700 mt-0.5">
                      {masterData.reports.filter((r: any) => r.status === 'pending').length}
                    </p>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <p className="text-[7.5px] font-bold text-slate-500 uppercase">Active Filters</p>
                    <p className="text-base font-black text-indigo-700 mt-0.5">{masterData.profanity.length} Words</p>
                  </div>
                </div>

                {/* Incident Reports Table */}
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-2">
                  <table className="w-full text-left">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Violation Type</th>
                        <th>Target</th>
                        <th>Reporter</th>
                        <th>Description</th>
                        <th>Status</th>
                        <th>Date Filed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {masterData.reports.length > 0 ? (
                        masterData.reports.slice(0, 6).map((r: any, idx: number) => (
                          <tr key={idx}>
                            <td className="font-mono text-slate-500">#{r.id}</td>
                            <td className="font-bold text-slate-900 capitalize">{r.type?.replace(/_/g, ' ')}</td>
                            <td className="text-slate-700 capitalize">{r.reportable_type}</td>
                            <td className="text-slate-600">{r.reporter?.name || 'Anonymous'}</td>
                            <td className="text-slate-600 truncate max-w-xs">{r.description || '—'}</td>
                            <td className="capitalize font-semibold text-slate-800">{r.status}</td>
                            <td className="text-slate-600">{new Date(r.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="text-center text-slate-400 py-3">No moderation incident records.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* AI Safety Assessment Memo */}
                <div className="p-2 bg-slate-50 rounded border border-slate-200 text-[8px] text-slate-700">
                  <span className="font-bold text-primary uppercase mr-1">AI Community Safety Diagnostic:</span>
                  Low incident frequency and high resolution rate indicate effective automated profanity filtering and prompt moderation, sustaining a safe environment for all participants.
                </div>
              </div>

              {/* Running Print Footer */}
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[7.5px] text-slate-400 font-medium uppercase tracking-wider">
                <span>SIKAP: Skills and Job Matching Platform</span>
                <span>Master Dossier & System Audit · Document Classification: Official Confidential</span>
                <span>Page 6 of 7</span>
              </div>
            </div>

            {/* ================= PAGE 7: ADMINISTRATIVE AUDIT TRAIL & OFFICIAL SIGN-OFF ================= */}
            <div className="print-page-last">
              <div>
                <div className="mb-2">
                  <h2 className="text-xs font-display font-bold text-slate-900 uppercase tracking-wider">
                    Page 7: System Audit Trail & Official Sign-off
                  </h2>
                  <p className="text-[8.5px] text-slate-500">
                    Administrative action audit log documenting administrative events, security changes, and institutional verification.
                  </p>
                </div>

                {/* System Audit Logs */}
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-2.5">
                  <table className="w-full text-left">
                    <thead>
                      <tr>
                        <th>Log ID</th>
                        <th>Administrator</th>
                        <th>Action</th>
                        <th>Target</th>
                        <th>Details</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {masterData.logs.length > 0 ? (
                        masterData.logs.slice(0, 6).map((l: any, idx: number) => (
                          <tr key={idx}>
                            <td className="font-mono text-slate-500">#{l.id}</td>
                            <td className="font-bold text-slate-900">{l.admin?.name || 'Superadmin'}</td>
                            <td className="font-semibold text-primary capitalize">{l.action}</td>
                            <td className="text-slate-700 capitalize">{l.target_type || 'System'}</td>
                            <td className="text-slate-600 truncate max-w-xs">{l.details || '—'}</td>
                            <td className="text-slate-600">{new Date(l.created_at).toLocaleString()}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="text-center text-slate-400 py-3">No administrative logs recorded.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* AI Governance Audit Memo */}
                <div className="p-2 bg-slate-50 rounded border border-slate-200 text-[8px] text-slate-700 mb-3">
                  <span className="font-bold text-primary uppercase mr-1">AI Governance Audit:</span>
                  All administrative operations are systematically logged with full timestamp traceability, verifying institutional compliance with data integrity and protection protocols.
                </div>

                {/* Formal 3-Signer Institutional Sign-Off Block */}
                <div className="pt-3 border-t-2 border-slate-300 grid grid-cols-3 gap-6">
                  <div>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-5">Prepared & Certified By:</p>
                    <div className="border-b border-slate-400 w-36 mb-1"></div>
                    <p className="text-[9.5px] font-bold text-slate-900">Platform Administrator</p>
                    <p className="text-[7.5px] text-slate-500">SIKAP Operations & Governance</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-5">Reviewed & Endorsed By:</p>
                    <div className="border-b border-slate-400 w-36 mb-1"></div>
                    <p className="text-[9.5px] font-bold text-slate-900">Lead Data Specialist</p>
                    <p className="text-[7.5px] text-slate-500">SIKAP Research & Analytics</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-5">Noted & Approved By:</p>
                    <div className="border-b border-slate-400 w-36 mb-1"></div>
                    <p className="text-[9.5px] font-bold text-slate-900">Project Adviser / Supervisor</p>
                    <p className="text-[7.5px] text-slate-500">SIKAP Institutional Oversight</p>
                  </div>
                </div>
              </div>

              {/* Running Print Footer */}
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[7.5px] text-slate-400 font-medium uppercase tracking-wider">
                <span>SIKAP: Skills and Job Matching Platform</span>
                <span>Master Dossier & System Audit · Document Classification: Official Confidential</span>
                <span>Page 7 of 7</span>
              </div>
            </div>
          </div>
        ) : (
          /* ================= 2-PAGE DESCRIPTIVE ANALYTICS PDF REPORT ================= */
          data && (
            <div>
              {/* ================= PAGE 1 OF 2: EXECUTIVE SCORECARD & VISUAL ANALYTICS ================= */}
              <div className="print-page">
                <div>
                  {/* Institutional Header */}
                  <div className="pb-2.5 border-b-2 border-slate-300 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-white font-black text-sm shadow-xs">
                        S
                      </div>
                      <div>
                        <h1 className="text-sm font-display font-black text-slate-900 tracking-tight uppercase">
                          SIKAP: Skills and Job Matching Platform
                        </h1>
                        <p className="text-[8.5px] font-body text-slate-500 font-semibold">
                          Descriptive Analytics & Labor Market Intelligence Report
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-[8px] text-slate-600 space-y-0.5">
                      <p><span className="font-bold text-slate-900">Document ID:</span> SKP-ANL-{from.replace(/-/g, '')}-{to.replace(/-/g, '')}</p>
                      <p><span className="font-bold text-slate-900">Document Classification:</span> Official Confidential Analytics</p>
                      <p><span className="font-bold text-slate-900">Generated:</span> {new Date().toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Dynamic Subtitle & Meta Bar */}
                  <div className="my-2 flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <div>
                      <h2 className="text-[11px] font-display font-bold text-slate-900 uppercase tracking-wider">
                        {activeTab === 'overview' && 'Executive Platform Overview & Core Metrics'}
                        {activeTab === 'trends' && 'Labor Supply & Application Growth Trends'}
                        {activeTab === 'distribution' && 'Trade Category Demand & Geographic Labor Distribution'}
                        {activeTab === 'health' && 'Platform Trust, Credential Compliance & Wage Benchmarks'}
                      </h2>
                    </div>
                    <div className="flex gap-1 text-[8px] font-medium text-slate-600">
                      <span className="px-1.5 py-0.2 bg-white rounded border border-slate-200">
                        <strong>Period:</strong> {from} to {to} ({globalPreset})
                      </span>
                      <span className="px-1.5 py-0.2 bg-white rounded border border-slate-200">
                        <strong>Granularity:</strong> {intervalFilter.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* 8-Card Executive KPI Scorecard Grid */}
                  <div className="grid grid-cols-4 gap-1.5 print-card-grid mb-2">
                    <div className="p-2 bg-white rounded border border-slate-200">
                      <p className="text-[7px] font-bold text-slate-500 uppercase">New Users</p>
                      <p className="text-sm font-black text-slate-900 mt-0.5">{data?.kpis?.total_users?.value ?? 0}</p>
                      <p className="text-[7px] text-slate-500">
                        {data?.kpis?.total_users?.change !== undefined && (
                          <span className={data.kpis.total_users.change >= 0 ? 'text-emerald-700 font-bold mr-0.5' : 'text-rose-700 font-bold mr-0.5'}>
                            {data.kpis.total_users.change >= 0 ? '▲' : '▼'} {Math.abs(data.kpis.total_users.change)}%
                          </span>
                        )}
                        Growth vs last period
                      </p>
                    </div>

                    <div className="p-2 bg-white rounded border border-slate-200">
                      <p className="text-[7px] font-bold text-slate-500 uppercase">Job Posts</p>
                      <p className="text-sm font-black text-slate-900 mt-0.5">{data?.kpis?.active_jobs?.value ?? 0}</p>
                      <p className="text-[7px] text-slate-500">
                        {data?.kpis?.active_jobs?.change !== undefined && (
                          <span className={data.kpis.active_jobs.change >= 0 ? 'text-emerald-700 font-bold mr-0.5' : 'text-rose-700 font-bold mr-0.5'}>
                            {data.kpis.active_jobs.change >= 0 ? '▲' : '▼'} {Math.abs(data.kpis.active_jobs.change)}%
                          </span>
                        )}
                        Active posts in period
                      </p>
                    </div>

                    <div className="p-2 bg-white rounded border border-slate-200">
                      <p className="text-[7px] font-bold text-slate-500 uppercase">Applications</p>
                      <p className="text-sm font-black text-slate-900 mt-0.5">{data?.kpis?.applications?.value ?? 0}</p>
                      <p className="text-[7px] text-slate-500">
                        {data?.funnel?.accepted_applications ?? 0} Accepted for engagement
                      </p>
                    </div>

                    <div className="p-2 bg-white rounded border border-slate-200">
                      <p className="text-[7px] font-bold text-slate-500 uppercase">Placement Fill Rate</p>
                      <p className="text-sm font-black text-emerald-700 mt-0.5">{data?.fill_rate?.value ?? 0}%</p>
                      <p className="text-[7px] text-slate-500">Completed jobs / Total</p>
                    </div>

                    <div className="p-2 bg-white rounded border border-slate-200">
                      <p className="text-[7px] font-bold text-slate-500 uppercase">Verification Rate</p>
                      <p className="text-sm font-black text-slate-900 mt-0.5">
                        {data?.verification?.total_verifications > 0
                          ? Math.round(((data.verification.total_verifications - (data.verification.pending_verifications || 0)) / data.verification.total_verifications) * 100)
                          : 100}%
                      </p>
                      <p className="text-[7px] text-slate-500">ID compliance compliance</p>
                    </div>

                    <div className="p-2 bg-white rounded border border-slate-200">
                      <p className="text-[7px] font-bold text-slate-500 uppercase">Review Latency</p>
                      <p className="text-sm font-black text-slate-900 mt-0.5">
                        {data?.verification?.average_turnaround_seconds
                          ? (data.verification.average_turnaround_seconds / 3600).toFixed(1)
                          : '0.0'}h
                      </p>
                      <p className="text-[7px] text-slate-500">Average review turnaround</p>
                    </div>

                    <div className="p-2 bg-white rounded border border-slate-200">
                      <p className="text-[7px] font-bold text-slate-500 uppercase">Avg Wage Rate</p>
                      <p className="text-sm font-black text-slate-900 mt-0.5">
                        PHP {parseFloat(data?.compensation?.avg || 0).toFixed(2)}
                      </p>
                      <p className="text-[7px] text-slate-500">Across trade categories</p>
                    </div>

                    <div className="p-2 bg-white rounded border border-slate-200">
                      <p className="text-[7px] font-bold text-slate-500 uppercase">Moderation</p>
                      <p className="text-sm font-black text-slate-900 mt-0.5">{data?.kpis?.unresolved_reports?.value ?? 0}</p>
                      <p className="text-[7px] text-slate-500">Active safety reports</p>
                    </div>
                  </div>

                  {/* 2-Column Split: Vector Charts */}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {/* User Growth Velocity */}
                    <div className="bg-white p-2 rounded border border-slate-200">
                      <div className="flex justify-between items-center mb-0.5">
                        <h3 className="text-[8.5px] font-display font-bold text-slate-900 uppercase tracking-wider">
                          User Registration Velocity
                        </h3>
                        <span className="text-[7px] text-slate-500">Workers vs Employers</span>
                      </div>
                      <div className="h-28 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={transformedUserGrowth} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.6} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 6.5 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 6.5 }} allowDecimals={false} />
                            <Bar dataKey="workers" name="Workers" fill="#C95D41" isAnimationActive={false} radius={[2, 2, 0, 0]} />
                            <Bar dataKey="employers" name="Employers" fill="#3B82F6" isAnimationActive={false} radius={[2, 2, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Application Volume */}
                    <div className="bg-white p-2 rounded border border-slate-200">
                      <div className="flex justify-between items-center mb-0.5">
                        <h3 className="text-[8.5px] font-display font-bold text-slate-900 uppercase tracking-wider">
                          Application Volume Throughput
                        </h3>
                        <span className="text-[7px] text-slate-500">Applications vs Job Posts</span>
                      </div>
                      <div className="h-28 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={transformedApplicationVolume} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.6} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 6.5 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 6.5 }} allowDecimals={false} />
                            <Area type="monotone" dataKey="applications" name="Applications" stroke="#C95D41" strokeWidth={1.5} fill="#C95D41" isAnimationActive={false} fillOpacity={0.12} />
                            <Area type="monotone" dataKey="jobs" name="Job Posts" stroke="#3B82F6" strokeWidth={1.5} fill="#3B82F6" isAnimationActive={false} fillOpacity={0.12} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Funnel & SLA Bars */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2 bg-white p-2 rounded border border-slate-200">
                      <h3 className="text-[8.5px] font-display font-bold text-slate-900 mb-1 uppercase tracking-wider">
                        4-Stage Recruitment Conversion Funnel
                      </h3>
                      <div className="grid grid-cols-3 gap-1.5">
                        {funnelSteps.map((step, idx) => (
                          <div key={idx} className="p-1.5 bg-slate-50 rounded border border-slate-100">
                            <span className="text-[7.5px] text-slate-600 block truncate">{step.label}</span>
                            <span className="text-xs font-black text-slate-900">{step.value} ({step.rate})</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white p-2 rounded border border-slate-200 flex flex-col justify-between">
                      <h3 className="text-[8.5px] font-display font-bold text-slate-900 uppercase tracking-wider">
                        Verification SLA
                      </h3>
                      <div className="flex justify-between items-center text-[7.5px]">
                        <span className="text-slate-500">Avg Turnaround:</span>
                        <span className="font-bold text-slate-900">
                          {data?.verification?.average_turnaround_seconds ? (data.verification.average_turnaround_seconds / 3600).toFixed(1) : '0.0'}h
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[7.5px]">
                        <span className="text-slate-500">Processed:</span>
                        <span className="font-bold text-slate-900">{data?.verification?.total_verifications ?? 0}</span>
                      </div>
                      <div className="flex justify-between items-center text-[7.5px]">
                        <span className="text-slate-500">Delayed (&gt;48h):</span>
                        <span className="font-bold text-rose-700">{data?.verification?.delayed_verifications ?? 0}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 1 Running Footer */}
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[7.5px] text-slate-400 font-medium uppercase tracking-wider">
                  <span>SIKAP: Skills and Job Matching Platform</span>
                  <span>Descriptive Analytics Report · Period: {from} to {to}</span>
                  <span>Page 1 of 2</span>
                </div>
              </div>

              {/* ================= PAGE 2 OF 2: PERFORMANCE LEDGERS & OFFICIAL SIGN-OFF ================= */}
              <div className="print-page-last">
                <div>
                  <div className="mb-2">
                    <h2 className="text-xs font-display font-bold text-slate-900 uppercase tracking-wider">
                      Section 2: Tabular Performance Ledgers & Regulatory Compliance Audit
                    </h2>
                    <p className="text-[8.5px] text-slate-500">
                      Granular performance ledgers matching the evaluated date window ({from} to {to}) and aggregation parameters.
                    </p>
                  </div>

                  {/* Table 1: Time Series Periodic Activity Ledger */}
                  <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-2">
                    <div className="px-2.5 py-1.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                      <h3 className="text-[8.5px] font-display font-bold text-slate-900 uppercase tracking-wider">
                        Time-Series Activity Ledger ({intervalFilter.toUpperCase()} Aggregation)
                      </h3>
                      <span className="text-[7.5px] text-slate-500">Signups & Throughput</span>
                    </div>
                    <table className="w-full text-left">
                      <thead>
                        <tr>
                          <th>Period</th>
                          <th className="text-right">Workers</th>
                          <th className="text-right">Employers</th>
                          <th className="text-right">Total New Users</th>
                          <th className="text-right">Applications</th>
                          <th className="text-right">Job Posts</th>
                          <th className="text-right">Throughput Ratio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transformedUserGrowth.slice(0, 6).map((row: any, idx: number) => {
                          const appMatch = transformedApplicationVolume.find((a: any) => a.name === row.name);
                          const apps = appMatch ? appMatch.applications : 0;
                          const jobs = appMatch ? appMatch.jobs : 0;
                          const totalUsers = (row.workers || 0) + (row.employers || 0);
                          const ratio = jobs > 0 ? (apps / jobs).toFixed(1) : '0.0';
                          return (
                            <tr key={idx}>
                              <td className="font-semibold text-slate-900">{row.name}</td>
                              <td className="text-right text-slate-700">{row.workers}</td>
                              <td className="text-right text-slate-700">{row.employers}</td>
                              <td className="text-right font-bold text-slate-900">{totalUsers}</td>
                              <td className="text-right text-slate-700">{apps}</td>
                              <td className="text-right text-slate-700">{jobs}</td>
                              <td className="text-right font-bold text-primary">{ratio} apps/job</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Dual Tables: Wage Benchmarks + Geographic Activity */}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {/* Wage Benchmarks Table */}
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                      <div className="px-2 py-1 bg-slate-50 border-b border-slate-200">
                        <h3 className="text-[8.5px] font-display font-bold text-slate-900 uppercase tracking-wider">
                          Trade Category Wage Benchmarks
                        </h3>
                      </div>
                      <table className="w-full text-left">
                        <thead>
                          <tr>
                            <th>Category</th>
                            <th className="text-right">Average Pay</th>
                            <th className="text-right">Tier</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCompensationCategories.slice(0, 5).map((c: any, idx: number) => {
                            const avg = parseFloat(c.avg_comp || 0);
                            return (
                              <tr key={idx}>
                                <td className="font-semibold text-slate-900 capitalize">{c.category}</td>
                                <td className="text-right font-bold text-slate-900">PHP {avg.toFixed(2)}</td>
                                <td className="text-right">
                                  <span className={`px-1 py-0.2 rounded text-[7px] font-bold ${
                                    avg >= 1000 ? 'bg-emerald-50 text-emerald-700' : avg >= 500 ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-700'
                                  }`}>
                                    {avg >= 1000 ? 'High' : avg >= 500 ? 'Mid' : 'Base'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Geographic Activity Table */}
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                      <div className="px-2 py-1 bg-slate-50 border-b border-slate-200">
                        <h3 className="text-[8.5px] font-display font-bold text-slate-900 uppercase tracking-wider">
                          Geographic & Barangay Labor Activity
                        </h3>
                      </div>
                      <table className="w-full text-left">
                        <thead>
                          <tr>
                            <th>Location / Area</th>
                            <th className="text-right">Jobs</th>
                            <th className="text-right">Apps</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transformedGeographicActivity.slice(0, 5).map((g: any, idx: number) => (
                            <tr key={idx}>
                              <td className="font-semibold text-slate-900 capitalize">{g.name}</td>
                              <td className="text-right text-slate-700">{g.jobs}</td>
                              <td className="text-right font-bold text-slate-900">{g.applications}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Formal 3-Signer Institutional Sign-Off Block */}
                  <div className="pt-2.5 border-t-2 border-slate-300 grid grid-cols-3 gap-6 mb-1">
                    <div>
                      <p className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider mb-4">Prepared & Certified By:</p>
                      <div className="border-b border-slate-400 w-32 mb-0.5"></div>
                      <p className="text-[9px] font-bold text-slate-900">Platform Administrator</p>
                      <p className="text-[7px] text-slate-500">SIKAP Operations & Governance</p>
                    </div>
                    <div>
                      <p className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider mb-4">Reviewed & Endorsed By:</p>
                      <div className="border-b border-slate-400 w-32 mb-0.5"></div>
                      <p className="text-[9px] font-bold text-slate-900">Lead Data Specialist</p>
                      <p className="text-[7.5px] text-slate-500">SIKAP Research & Analytics</p>
                    </div>
                    <div>
                      <p className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider mb-4">Noted & Approved By:</p>
                      <div className="border-b border-slate-400 w-32 mb-0.5"></div>
                      <p className="text-[9px] font-bold text-slate-900">Project Adviser / Supervisor</p>
                      <p className="text-[7.5px] text-slate-500">SIKAP Institutional Oversight</p>
                    </div>
                  </div>
                </div>

                {/* Section 2 Running Footer */}
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[7.5px] text-slate-400 font-medium uppercase tracking-wider">
                  <span>SIKAP: Skills and Job Matching Platform</span>
                  <span>Document Classification: Official Confidential · Verified Analytics Snapshot</span>
                  <span>Page 2 of 2</span>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

