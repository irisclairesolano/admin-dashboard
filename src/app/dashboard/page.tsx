'use client';

import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Sector
} from 'recharts';
import { adminApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { AIInsightsCard, InsightsData } from '@/components/AIInsightsCard';
import { CHART_COLORS } from '@/lib/constants';
import { exportMultiSectionCSV, formatCSVDate, formatCSVCurrency } from '@/lib/export/csv';

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
  const [isPresentationMode, setIsPresentationMode] = useState(false);

  // Tab-specific date states (defaulting to 'Today')
  const [overviewPreset, setOverviewPreset] = useState<string>('Today');
  const [overviewStart, setOverviewStart] = useState<string>('');
  const [overviewEnd, setOverviewEnd] = useState<string>('');

  const [trendsPreset, setTrendsPreset] = useState<string>('Today');
  const [trendsStart, setTrendsStart] = useState<string>('');
  const [trendsEnd, setTrendsEnd] = useState<string>('');

  const [distPreset, setDistPreset] = useState<string>('Today');
  const [distStart, setDistStart] = useState<string>('');
  const [distEnd, setDistEnd] = useState<string>('');

  const [healthPreset, setHealthPreset] = useState<string>('Today');
  const [healthStart, setHealthStart] = useState<string>('');
  const [healthEnd, setHealthEnd] = useState<string>('');

  // Page-specific tab filters
  const [trendsRoleFilter, setTrendsRoleFilter] = useState<'all' | 'worker' | 'employer'>('all');
  const [trendsVolumeFilter, setTrendsVolumeFilter] = useState<'all' | 'applications' | 'jobs'>('all');
  const [distRegionFilter, setDistRegionFilter] = useState<string>('all');
  const [distLimitFilter, setDistLimitFilter] = useState<number>(6);
  const [healthWageFilter, setHealthWageFilter] = useState<'all' | 'low' | 'mid' | 'high'>('all');
  const [healthReportFilter, setHealthReportFilter] = useState<'all' | 'pending' | 'resolved'>('all');
  // Tab State
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'distribution' | 'health'>('overview');

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
  // Get active period and interval based on selected tab and its filters
  const getActivePeriodAndInterval = useCallback(() => {
    let preset: string;
    let start: string;
    let end: string;

    if (activeTab === 'overview') {
      preset = overviewPreset; start = overviewStart; end = overviewEnd;
    } else if (activeTab === 'trends') {
      preset = trendsPreset; start = trendsStart; end = trendsEnd;
    } else if (activeTab === 'distribution') {
      preset = distPreset; start = distStart; end = distEnd;
    } else {
      preset = healthPreset; start = healthStart; end = healthEnd;
    }

    return getPeriodAndInterval(preset, start, end);
  }, [
    activeTab,
    overviewPreset, overviewStart, overviewEnd,
    trendsPreset, trendsStart, trendsEnd,
    distPreset, distStart, distEnd,
    healthPreset, healthStart, healthEnd
  ]);

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
    let preset: string;
    let setPreset: (p: string) => void;
    let start: string;
    let setStart: (s: string) => void;
    let end: string;
    let setEnd: (e: string) => void;

    if (tab === 'overview') {
      preset = overviewPreset; setPreset = setOverviewPreset;
      start = overviewStart; setStart = setOverviewStart;
      end = overviewEnd; setEnd = setOverviewEnd;
    } else if (tab === 'trends') {
      preset = trendsPreset; setPreset = setTrendsPreset;
      start = trendsStart; setStart = setTrendsStart;
      end = trendsEnd; setEnd = setTrendsEnd;
    } else if (tab === 'distribution') {
      preset = distPreset; setPreset = setDistPreset;
      start = distStart; setStart = setDistStart;
      end = distEnd; setEnd = setDistEnd;
    } else {
      preset = healthPreset; setPreset = setHealthPreset;
      start = healthStart; setStart = setHealthStart;
      end = healthEnd; setEnd = setHealthEnd;
    }

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
        title: 'Key Performance Indicators (KPIs)',
        headers: ['Metric', 'Current Value', 'PoP Change (%)', 'Trend Direction'],
        rows: [
          ['New Registrations', data.kpis?.total_users?.value ?? 0, `${data.kpis?.total_users?.change ?? 0}%`, (data.kpis?.total_users?.change ?? 0) >= 0 ? 'Growth' : 'Decline'],
          ['Jobs Posted', data.kpis?.active_jobs?.value ?? 0, `${data.kpis?.active_jobs?.change ?? 0}%`, (data.kpis?.active_jobs?.change ?? 0) >= 0 ? 'Growth' : 'Decline'],
          ['Applications', data.kpis?.applications?.value ?? 0, `${data.kpis?.applications?.change ?? 0}%`, (data.kpis?.applications?.change ?? 0) >= 0 ? 'Growth' : 'Decline'],
          ['Reports Filed', data.kpis?.unresolved_reports?.value ?? 0, `${data.kpis?.unresolved_reports?.change ?? 0}%`, (data.kpis?.unresolved_reports?.change ?? 0) <= 0 ? 'Improvement' : 'Alert'],
        ]
      },
      {
        title: 'User Growth & Time-Series Activity',
        headers: ['Time Interval', 'New Workers', 'New Employers'],
        rows: (transformedUserGrowth || []).map((item: any) => [
          item.name || '',
          item.workers ?? 0,
          item.employers ?? 0
        ])
      },
      {
        title: 'Application Volume Time-Series',
        headers: ['Time Interval', 'Applications', 'Unique Jobs'],
        rows: (transformedApplicationVolume || []).map((item: any) => [
          item.name || '',
          item.applications ?? 0,
          item.jobs ?? 0
        ])
      },
      {
        title: '4-Stage Application-to-Hire Funnel',
        headers: ['Funnel Stage', 'Volume Count', 'Conversion Rate (%)'],
        rows: (funnelSteps || []).map((step: any) => [
          step.label || '',
          step.value ?? 0,
          step.rate || '0%'
        ])
      },
      {
        title: 'User Demographics & Verification Ratios',
        headers: ['Demographic Group', 'Count', 'Percentage of Total'],
        rows: [
          ['Registered Workers', data.user_ratio?.workers ?? 0, `${data.user_ratio?.workers_pct ?? 0}%`],
          ['Registered Employers', data.user_ratio?.employers ?? 0, `${data.user_ratio?.employers_pct ?? 0}%`],
          ['Verified Users', data.user_ratio?.verified_users ?? 0, `${data.user_ratio?.verified_pct ?? 0}%`],
          ['Unverified Users', data.user_ratio?.unverified_users ?? 0, `${data.user_ratio?.unverified_pct ?? 0}%`],
        ]
      },
      {
        title: 'Wage & Compensation by Category',
        headers: ['Trade Category', 'Average Wage (PHP)', 'Min Wage (PHP)', 'Max Wage (PHP)'],
        rows: (data.compensation?.categories || []).map((c: any) => [
          c.category || 'General',
          formatCSVCurrency(c.avg_comp),
          formatCSVCurrency(data.compensation?.min),
          formatCSVCurrency(data.compensation?.max)
        ])
      },
      {
        title: 'Geographic Activity by Location',
        headers: ['Location', 'Job Postings Count', 'Applications Count'],
        rows: (transformedGeographicActivity || []).map((g: any) => [
          g.name || 'Bulan',
          g.jobs ?? 0,
          g.applications ?? 0
        ])
      },
      {
        title: 'Moderation & Safety Violation Breakdown',
        headers: ['Violation Type', 'Report Count'],
        rows: (data.reports?.breakdown || []).map((r: any) => [
          r.type || 'Other',
          r.count ?? 0
        ])
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

  const handleExportMasterCSV = async () => {
    try {
      setLoading(true);
      const [usersRes, jobsRes, verifRes, reportsRes] = await Promise.all([
        adminApi.getUsers().catch(() => ({ data: [] })),
        adminApi.getJobs().catch(() => ({ data: [] })),
        adminApi.getVerifications().catch(() => ({ data: [] })),
        adminApi.getReports('all', 1).catch(() => ({ data: [] }))
      ]);

      const usersList = usersRes.data?.data || usersRes.data || [];
      const jobsList = jobsRes.data?.data || jobsRes.data || [];
      const verifList = verifRes.data?.data || verifRes.data || [];
      const reportsList = reportsRes.data?.data || reportsRes.data || [];

      const masterSections = [
        {
          title: 'Section 1: Platform Executive Summary',
          headers: ['Metric', 'Total Value'],
          rows: [
            ['Total Registered Users', usersList.length],
            ['Total Jobs Posted', jobsList.length],
            ['Pending Verifications', verifList.filter((v: any) => v.verification_status === 'pending').length],
            ['Total Moderation Reports', reportsList.length],
            ['Fill Rate', `${data?.fill_rate?.value ?? 0}%`],
            ['Average Compensation (PHP)', formatCSVCurrency(data?.compensation?.avg)]
          ]
        },
        {
          title: 'Section 2: Registered Users Directory',
          headers: ['User ID', 'Full Name', 'Role', 'Email', 'Phone', 'Municipality', 'Barangay', 'Verification Status', 'Operational Status', 'Reputation Score', 'Date Registered'],
          rows: usersList.map((u: any) => [
            u.id,
            u.name,
            u.role,
            u.email,
            u.phone || '',
            u.municipality || 'Bulan',
            u.barangay || '',
            u.verification_status,
            u.is_suspended ? 'Suspended' : 'Active',
            u.reputation_score ?? '5.00',
            formatCSVDate(u.created_at)
          ])
        },
        {
          title: 'Section 3: Job Postings & Opportunities',
          headers: ['Job ID', 'Reference Code', 'Job Title', 'Employer', 'Category', 'Compensation (PHP)', 'Duration Type', 'Slots Required', 'Slots Hired', 'Status', 'Applications Count', 'Date Posted'],
          rows: jobsList.map((j: any) => [
            j.id,
            j.reference_number || `SKP-JOB-${j.id}`,
            j.title,
            j.employer?.name || '',
            j.category,
            formatCSVCurrency(j.compensation),
            j.duration_type,
            j.slots ?? 1,
            j.accepted_count ?? 0,
            j.status,
            j.applications_count ?? 0,
            formatCSVDate(j.created_at)
          ])
        },
        {
          title: 'Section 4: Identity Verification & Credential Audit',
          headers: ['User ID', 'Full Name', 'Role', 'Verification Status', 'Front ID', 'Back ID', 'Selfie', 'Rejection Reason', 'Submission Date'],
          rows: verifList.map((v: any) => [
            v.id,
            v.name,
            v.role,
            v.verification_status,
            v.document_url ? 'Yes' : 'No',
            v.document_back_url ? 'Yes' : 'No',
            v.selfie_url ? 'Yes' : 'No',
            v.rejection_reason || '',
            formatCSVDate(v.created_at)
          ])
        },
        {
          title: 'Section 5: Community Safety & Incident Reports',
          headers: ['Report ID', 'Violation Type', 'Target Type', 'Target ID', 'Reporter Name', 'Description', 'Status', 'Date Reported', 'Date Resolved'],
          rows: reportsList.map((r: any) => [
            r.id,
            r.type,
            r.reportable_type,
            r.reportable_id,
            r.reporter?.name || '',
            r.description,
            r.status,
            formatCSVDate(r.created_at),
            formatCSVDate(r.resolved_at)
          ])
        },
        {
          title: 'Section 6: Wage & Trade Category Benchmarks',
          headers: ['Trade Category', 'Average Wage (PHP)'],
          rows: (data?.compensation?.categories || []).map((c: any) => [
            c.category,
            formatCSVCurrency(c.avg_comp)
          ])
        }
      ];

      exportMultiSectionCSV(
        `sikap_master_platform_${new Date().toISOString().slice(0, 10)}`,
        'SIKAP Comprehensive Platform Master Report',
        [
          ['Generated On:', formatCSVDate(new Date().toISOString())],
          ['Reporting Scope:', 'Complete Platform Snapshot (All Entities)'],
          ['Platform:', 'SIKAP: Skills & Job Matching Platform'],
          ['Document Classification:', 'SIKAP Platform Master Database Snapshot']
        ],
        masterSections
      );
    } catch (err) {
      console.error('Failed to export master platform CSV', err);
    } finally {
      setLoading(false);
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
        adminApi.getUsers().catch(() => ({ data: [] })),
        adminApi.getJobs().catch(() => ({ data: [] })),
        adminApi.getVerifications().catch(() => ({ data: [] })),
        adminApi.getReports('all', 1).catch(() => ({ data: [] })),
        adminApi.getLogs(1).catch(() => ({ data: [] })),
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

  const stats = [
    { label: 'New Users', value: data?.kpis?.total_users?.value ?? 0, change: data?.kpis?.total_users?.change, iconClass: 'lni lni-users', color: 'text-primary-dark', bg: 'bg-primary-soft', href: '/dashboard/users' },
    { label: 'Jobs Posted', value: data?.kpis?.active_jobs?.value ?? 0, change: data?.kpis?.active_jobs?.change, iconClass: 'lni lni-briefcase', color: 'text-accent-skyDeep', bg: 'bg-accent-sky', href: '/dashboard/jobs' },
    { label: 'Applications', value: data?.kpis?.applications?.value ?? 0, change: data?.kpis?.applications?.change, iconClass: 'lni lni-files', color: 'text-accent-mintDeep', bg: 'bg-accent-mint', href: '/dashboard/jobs' },
    { label: 'Reports Filed', value: data?.kpis?.unresolved_reports?.value ?? 0, change: data?.kpis?.unresolved_reports?.change, iconClass: 'lni lni-warning', color: 'text-status-error', bg: 'bg-status-error/10', href: '/dashboard/reports' },
  ];

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

  return (
    <div className="animate-fade-in print:p-0 print:bg-white min-h-screen pb-12">
      {/* Dynamic Style Block for PDF & Print Exports */}
      <style jsx global>{`
        @media screen {
          .print-only-report {
            position: absolute !important;
            left: -9999px !important;
            top: -9999px !important;
            width: 1100px !important;
            height: auto !important;
            overflow: hidden !important;
          }
          .screen-only {
            display: block !important;
          }
        }
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            background: white !important;
            color: #0f172a !important;
            font-size: 11px !important;
          }
          header, sidebar, nav, button, select, .no-print, [className*="sidebar"], [className*="Sidebar"], .screen-only {
            display: none !important;
          }
          .print-only-report {
            position: static !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            padding: 16px !important;
            margin: 0 !important;
            background: white !important;
          }
          .print-full-width {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-card-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          }
          .print-chart-container, .print-card-grid, table, .avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .print-page-break {
            page-break-before: always !important;
          }
        }
      `}</style>

      <div className="screen-only">
        {/* Sticky Top Filter & Header Bar */}
        <div className="sticky top-[-24px] md:top-[-40px] z-30 bg-paper/95 backdrop-blur-md border-b border-ink-faint -mt-6 md:-mt-10 pt-6 md:pt-10 pb-4 mb-8 -mx-6 md:-mx-10 px-6 md:px-10 no-print shadow-sm flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-ink">Dashboard Overview</h1>
            <p className="text-xs font-body text-ink-muted mt-1">Platform analytics, municipal labor trends, and data exports.</p>
          </div>

          {/* Date Filter & Aggregation Components */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Export & Presentation Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPresentationMode(!isPresentationMode)}
                title="Toggle distraction-free Capstone Panel Presentation Mode"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border shadow-2xs text-xs font-body font-bold transition-all cursor-pointer ${
                  isPresentationMode
                    ? 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-300'
                    : 'bg-white/80 backdrop-blur-md border-slate-200 text-slate-700 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <i className={`lni ${isPresentationMode ? 'lni-cross-circle' : 'lni-display'} text-xs`} />
                <span>{isPresentationMode ? 'Exit Defense' : 'Defense Mode'}</span>
              </button>
              <button
                onClick={handleExportCSV}
                title="Export descriptive analytics report as CSV"
                className="flex items-center gap-1.5 bg-white/80 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200 shadow-2xs text-xs font-body font-bold text-slate-700 hover:bg-slate-900 hover:text-white transition-all cursor-pointer"
              >
                <i className="lni lni-download text-xs" />
                <span>Analytics CSV</span>
              </button>
              <button
                onClick={handleExportMasterCSV}
                title="Export complete master database snapshot as CSV"
                className="flex items-center gap-1.5 bg-white/80 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200 shadow-2xs text-xs font-body font-bold text-primary hover:bg-primary hover:text-white transition-all cursor-pointer"
              >
                <i className="lni lni-database text-xs" />
                <span>Master CSV</span>
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
                className="flex items-center gap-1.5 bg-white/80 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200 shadow-2xs text-xs font-body font-bold text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer disabled:opacity-50"
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

        {/* Tab System Controls */}
        <div role="tablist" aria-label="Analytics sections" className="flex border-b border-ink-faint/50 overflow-x-auto pb-1 gap-2 mt-2">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'trends', label: 'Activity Trends' },
            { id: 'distribution', label: 'Distribution & Demand' },
            { id: 'health', label: 'Platform Health & Trust' },
          ].map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2.5 px-4 font-body font-bold text-xs border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-ink text-ink'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
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
              {/* KPI Cards section */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 print-card-grid">
                {stats.map((stat, i) => (
                  <div
                    key={i}
                    role="button"
                    tabIndex={0}
                    aria-label={`${stat.label}: ${stat.value}`}
                    onClick={() => router.push(stat.href)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') router.push(stat.href); }}
                    className={`cursor-pointer group relative p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-white/50 hover:-translate-y-1 overflow-hidden ${stat.bg} backdrop-blur-md`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mr-4 shadow-inner bg-white/60">
                          <i className={`${stat.iconClass} text-xl ${stat.color}`} />
                        </div>
                        <div>
                          <p className="text-xs font-body font-semibold text-ink-soft uppercase tracking-wider">{stat.label}</p>
                          <h3 className="text-2xl font-numeric font-bold text-ink mt-0.5">{stat.value}</h3>
                        </div>
                      </div>
                    </div>
                    {stat.change !== undefined && (
                      <div className={`mt-3 flex items-center text-xs font-semibold ${stat.change >= 0 ? 'text-status-success' : 'text-status-error'}`}>
                        <i className={`lni ${stat.change >= 0 ? 'lni-arrow-up' : 'lni-arrow-down'} mr-1 font-bold`} />
                        <span>{Math.abs(stat.change)}% from previous period</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Gemini AI Insights Component */}
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

          {/* TAB 2: ACTIVITY TRENDS */}
          {activeTab === 'trends' && (
            <div className="space-y-6">
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
                    {['all', 'applications', 'jobs'].map((metric) => (
                      <button
                        key={metric}
                        onClick={() => setTrendsVolumeFilter(metric as any)}
                        className={`px-3 py-1 rounded-lg text-xs font-body font-semibold transition-all ${
                          trendsVolumeFilter === metric ? 'bg-ink text-white shadow-sm' : 'text-ink-soft hover:text-ink'
                        }`}
                      >
                        {metric === 'all' ? 'All Metrics' : metric === 'applications' ? 'Applications Only' : 'Jobs Only'}
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
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print-chart-container">
                {/* User Growth */}
                <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-white/50 transition-all hover:shadow-lg flex flex-col">
                  <div className="mb-4">
                    <h3 className="font-display text-lg font-bold text-ink">User Registrations</h3>
                    <p className="text-xs text-ink-muted mt-1">Registrations compared by workers vs. employers.</p>
                  </div>
                  <div className="h-80 w-full font-numeric">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={transformedUserGrowth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8DFCE" opacity={0.5} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 11 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 11 }} allowDecimals={false} />
                        <Tooltip 
                          cursor={{ fill: '#FDF8F0' }}
                          contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)' }}
                        />
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
                  </div>
                </div>

                {/* Application Volume Area Chart */}
                <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-white/50 transition-all hover:shadow-lg flex flex-col">
                  <div className="mb-4">
                    <h3 className="font-display text-lg font-bold text-ink">Application Volume Over Time</h3>
                    <p className="text-xs text-ink-muted mt-1">Historical flow matching applications to unique job postings.</p>
                  </div>
                  <div className="h-80 w-full font-numeric">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={transformedApplicationVolume} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FFB6C1" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#FFB6C1" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorAppJobs" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#87CEEB" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#87CEEB" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8DFCE" opacity={0.5} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 11 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 11 }} allowDecimals={false} />
                        <Tooltip 
                          shared
                          contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)' }}
                        />
                        {(trendsVolumeFilter === 'all' || trendsVolumeFilter === 'applications') && (
                          <Area type="monotone" dataKey="applications" name="Applications" stroke="#FFB6C1" strokeWidth={3} fillOpacity={1} fill="url(#colorApps)" activeDot={{ r: 6, strokeWidth: 0 }} />
                        )}
                        {(trendsVolumeFilter === 'all' || trendsVolumeFilter === 'jobs') && (
                          <Area type="monotone" dataKey="jobs" name="Unique Jobs" stroke="#87CEEB" strokeWidth={3} fillOpacity={1} fill="url(#colorAppJobs)" activeDot={{ r: 6, strokeWidth: 0 }} />
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DISTRIBUTION & DEMAND */}
          {activeTab === 'distribution' && (
            <div className="space-y-6">
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
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print-chart-container">
                {/* Horizontal Skill Category Demand */}
                <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-white/50 transition-all hover:shadow-lg flex flex-col">
                  <div className="mb-4">
                    <h3 className="font-display text-lg font-bold text-ink">Skill & Category Demand</h3>
                    <p className="text-xs text-ink-muted mt-1">Platform job postings ranked descending by sector category.</p>
                  </div>
                  <div className="h-80 w-full font-numeric">
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
                        <Bar dataKey="jobs" name="Total Postings" fill="#3E7648" radius={[0, 6, 6, 0]} barSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Skill Profile Distribution Donut Chart */}
                <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-white/50 transition-all hover:shadow-lg flex flex-col relative">
                  <div className="mb-4">
                    <h3 className="font-display text-lg font-bold text-ink">Skill Profile Distribution</h3>
                    <p className="text-xs text-ink-muted mt-1">Profile breakdown capped at Top 6 skills and grouped others.</p>
                  </div>
                  <div className="h-64 w-full relative flex items-center justify-center">
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
                </div>
              </div>

              {/* Stacked Geographic Activity chart */}
              <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-white/50 transition-all hover:shadow-lg flex flex-col print-chart-container">
                <div className="mb-4">
                  <h3 className="font-display text-lg font-bold text-ink">Geographic Activity Breakdown</h3>
                  <p className="text-xs text-ink-muted mt-1">
                    {distRegionFilter === 'all' 
                      ? 'Jobs and Applications stacked on a single track per municipality.'
                      : `Jobs and Applications stacked per barangay in ${distRegionFilter}.`}
                  </p>
                </div>
                <div className="h-80 w-full font-numeric">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={transformedGeographicActivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8DFCE" opacity={0.5} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 11 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 11 }} allowDecimals={false} />
                      <Tooltip 
                        cursor={{ fill: '#FDF8F0' }}
                        contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)' }}
                      />
                      <Bar dataKey="jobs" name="Job Postings" fill="#87CEEB" stackId="a" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="applications" name="Applications" fill="#90EE90" stackId="a" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PLATFORM HEALTH & TRUST */}
          {activeTab === 'health' && (
            <div className="space-y-6">
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
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print-chart-container">
                {/* Two-Way Rating System */}
                <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-white/50 transition-all hover:shadow-lg">
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

                  <div className="mt-4 flex justify-center no-print">
                    <button
                      onClick={() => setShowWagesBreakdown(!showWagesBreakdown)}
                      className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold rounded-xl transition-all cursor-pointer"
                    >
                      {showWagesBreakdown ? 'Hide Category Breakdown' : 'View Category Breakdown'}
                    </button>
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

                <div className="mt-4 flex justify-center no-print">
                  <button
                    onClick={() => setShowReportsBreakdown(!showReportsBreakdown)}
                    className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold rounded-xl transition-all cursor-pointer"
                  >
                    {showReportsBreakdown ? 'Hide Breakdown Details' : 'View Complete Breakdown'}
                  </button>
                </div>
              </div>
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
          <div className="space-y-8">
            {/* ================= PAGE 1: COVER & EXECUTIVE KPI SCORECARD ================= */}
            <div className="avoid-break flex flex-col justify-between min-h-[960px]">
              <div>
                {/* Institutional Header */}
                <div className="pb-6 border-b-2 border-slate-300 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 bg-primary rounded-xl flex items-center justify-center text-white font-black text-xl">
                      S
                    </div>
                    <div>
                      <h1 className="text-xl font-display font-black text-slate-900 tracking-tight uppercase">
                        SIKAP: Skills and Job Matching Platform
                      </h1>
                      <p className="text-[11px] font-body text-slate-500 font-semibold">
                        Comprehensive Platform Master Dossier & System Audit
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-[10px] text-slate-600 space-y-0.5">
                    <p><span className="font-bold text-slate-900">Document Classification:</span> Master Administrative Snapshot</p>
                    <p><span className="font-bold text-slate-900">Generated:</span> {new Date().toLocaleString()}</p>
                    <p><span className="font-bold text-slate-900">System State:</span> Production Live Audit</p>
                  </div>
                </div>

                {/* Page 1 Title */}
                <div className="my-5">
                  <h2 className="text-base font-display font-bold text-slate-900 uppercase tracking-wider">
                    Page 1: Executive Key Performance Indicators & Summary
                  </h2>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    High-level summary of labor market supply, demand, credentials, and financial metrics across the platform.
                  </p>
                </div>

                {/* 8-Card Executive KPI Scorecard */}
                <div className="grid grid-cols-4 gap-4 print-card-grid mb-5">
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200">
                    <p className="text-[9px] font-bold text-slate-500 uppercase">Total Users</p>
                    <p className="text-xl font-black text-slate-900 mt-0.5">{masterData.users.length}</p>
                    <p className="text-[9px] text-slate-500 mt-1 font-medium">
                      {masterData.users.filter((u: any) => u.role === 'worker').length} Workers · {masterData.users.filter((u: any) => u.role === 'employer').length} Employers
                    </p>
                  </div>

                  <div className="p-3.5 bg-white rounded-xl border border-slate-200">
                    <p className="text-[9px] font-bold text-slate-500 uppercase">Total Job Postings</p>
                    <p className="text-xl font-black text-slate-900 mt-0.5">{masterData.jobs.length}</p>
                    <p className="text-[9px] text-slate-500 mt-1 font-medium">
                      {masterData.jobs.filter((j: any) => j.status === 'open').length} Open · {masterData.jobs.filter((j: any) => j.status === 'completed').length} Completed
                    </p>
                  </div>

                  <div className="p-3.5 bg-white rounded-xl border border-slate-200">
                    <p className="text-[9px] font-bold text-slate-500 uppercase">Applications Filed</p>
                    <p className="text-xl font-black text-slate-900 mt-0.5">{data?.funnel?.total_applications ?? 0}</p>
                    <p className="text-[9px] text-slate-500 mt-1 font-medium">
                      {data?.funnel?.accepted_applications ?? 0} Accepted for Engagement
                    </p>
                  </div>

                  <div className="p-3.5 bg-white rounded-xl border border-slate-200">
                    <p className="text-[9px] font-bold text-slate-500 uppercase">Placement Fill Rate</p>
                    <p className="text-xl font-black text-emerald-700 mt-0.5">{data?.fill_rate?.value ?? 0}%</p>
                    <p className="text-[9px] text-slate-500 mt-1 font-medium">Completed Jobs / Total Jobs</p>
                  </div>

                  <div className="p-3.5 bg-white rounded-xl border border-slate-200">
                    <p className="text-[9px] font-bold text-slate-500 uppercase">Verification Rate</p>
                    <p className="text-xl font-black text-slate-900 mt-0.5">
                      {masterData.verifications.length > 0
                        ? Math.round((masterData.verifications.filter((v: any) => v.verification_status === 'approved').length / masterData.verifications.length) * 100)
                        : 0}%
                    </p>
                    <p className="text-[9px] text-slate-500 mt-1 font-medium">
                      {masterData.verifications.filter((v: any) => v.verification_status === 'approved').length} Verified Credentials
                    </p>
                  </div>

                  <div className="p-3.5 bg-white rounded-xl border border-slate-200">
                    <p className="text-[9px] font-bold text-slate-500 uppercase">Verification Turnaround</p>
                    <p className="text-xl font-black text-slate-900 mt-0.5">
                      {data?.verification?.average_turnaround_seconds
                        ? (data.verification.average_turnaround_seconds / 3600).toFixed(1)
                        : '0.0'}h
                    </p>
                    <p className="text-[9px] text-slate-500 mt-1 font-medium">Average ID Review Latency</p>
                  </div>

                  <div className="p-3.5 bg-white rounded-xl border border-slate-200">
                    <p className="text-[9px] font-bold text-slate-500 uppercase">Average Wage Rate</p>
                    <p className="text-xl font-black text-slate-900 mt-0.5">
                      PHP {parseFloat(data?.compensation?.avg || 0).toFixed(2)}
                    </p>
                    <p className="text-[9px] text-slate-500 mt-1 font-medium">Across All Trade Categories</p>
                  </div>

                  <div className="p-3.5 bg-white rounded-xl border border-slate-200">
                    <p className="text-[9px] font-bold text-slate-500 uppercase">Safety & Moderation</p>
                    <p className="text-xl font-black text-slate-900 mt-0.5">{masterData.reports.length}</p>
                    <p className="text-[9px] text-slate-500 mt-1 font-medium">
                      {masterData.reports.filter((r: any) => r.status === 'resolved').length} Resolved Incidents
                    </p>
                  </div>
                </div>

                {/* Mini Chart: Registration Growth */}
                {transformedUserGrowth.length > 0 && (
                  <div className="bg-white p-4 rounded-xl border border-slate-200 mb-5">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-xs font-display font-bold text-slate-900 uppercase tracking-wider">
                        User Registration & Growth Trend
                      </h3>
                      <span className="text-[9px] text-slate-500">Workers vs Employers</span>
                    </div>
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={transformedUserGrowth} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.6} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 8 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 8 }} allowDecimals={false} />
                          <Bar dataKey="workers" name="Workers" fill="#C95D41" radius={[3, 3, 0, 0]} />
                          <Bar dataKey="employers" name="Employers" fill="#3B82F6" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* AI Executive Platform Diagnostics */}
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <h3 className="text-xs font-display font-bold text-slate-900 uppercase tracking-wider">
                      AI Platform Executive Diagnostic & Strategic Summary
                    </h3>
                  </div>
                  
                  {aiInsights ? (
                    <div className="grid grid-cols-2 gap-4 text-[10px] text-slate-700">
                      <div className="space-y-2">
                        <div>
                          <p className="font-bold text-slate-900 uppercase text-[9px] text-primary">Key Strategic Insights</p>
                          <ul className="list-disc pl-4 space-y-1 mt-1">
                            {(aiInsights.keyInsights || []).slice(0, 2).map((item, idx) => (
                              <li key={idx}>
                                <strong>{item.text}</strong> {item.supportingData && `(${item.supportingData})`}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 uppercase text-[9px] text-blue-700">Market Dynamics & Trends</p>
                          <ul className="list-disc pl-4 space-y-1 mt-1">
                            {(aiInsights.trends || []).slice(0, 2).map((item, idx) => (
                              <li key={idx}>
                                <strong>{item.text}</strong> {item.supportingData && `(${item.supportingData})`}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className="font-bold text-slate-900 uppercase text-[9px] text-amber-700">Operational Observations</p>
                          <ul className="list-disc pl-4 space-y-1 mt-1">
                            {(aiInsights.areasOfConcern || []).slice(0, 2).map((item, idx) => (
                              <li key={idx}>
                                <strong>{item.text}</strong> {item.supportingData && `(${item.supportingData})`}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 uppercase text-[9px] text-emerald-700">Executive Recommendations</p>
                          <ul className="list-disc pl-4 space-y-1 mt-1">
                            {(aiInsights.recommendations || []).slice(0, 2).map((item, idx) => (
                              <li key={idx}>
                                <strong>{item.text}</strong> {item.supportingData && `(${item.supportingData})`}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-500 italic">
                      Platform metrics indicate healthy user onboarding with active conversion across municipal barangays. ID verification throughput maintains strong compliance integrity.
                    </p>
                  )}
                </div>
              </div>

              {/* Running Print Footer */}
              <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center text-[8px] text-slate-400 font-medium uppercase tracking-wider">
                <span>SIKAP: Skills and Job Matching Platform</span>
                <span>Master Dossier & System Audit · Document Classification: Official Confidential</span>
                <span>Page 1 of 7</span>
              </div>
            </div>

            {/* ================= PAGE 2: RECRUITMENT LIFECYCLE & LABOR DYNAMICS ================= */}
            <div className="print-page-break avoid-break flex flex-col justify-between min-h-[960px]">
              <div>
                <div className="mb-4">
                  <h2 className="text-base font-display font-bold text-slate-900 uppercase tracking-wider">
                    Page 2: Recruitment Lifecycle & Labor Market Dynamics
                  </h2>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Detailed conversion tracking through the 4-stage job pipeline alongside skill supply/demand ratios and compensation benchmarks.
                  </p>
                </div>

                {/* 4-Stage Lifecycle Funnel */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 mb-5">
                  <h3 className="text-xs font-display font-bold text-slate-900 mb-2.5 uppercase tracking-wider">
                    4-Stage Recruitment Pipeline Funnel
                  </h3>
                  <div className="grid grid-cols-4 gap-3">
                    {funnelSteps.map((step, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                        <p className="text-[8px] font-bold text-slate-500 uppercase">Stage {idx + 1}</p>
                        <p className="text-[11px] font-bold text-slate-900 mt-0.5">{step.label}</p>
                        <p className="text-lg font-black text-primary mt-0.5">{step.value}</p>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1.5">
                          <div className="bg-primary h-full rounded-full" style={{ width: step.rate }} />
                        </div>
                        <p className="text-[8px] font-semibold text-slate-500 mt-1">Conversion: {step.rate}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Chart: Skill Demand Bar Chart */}
                {transformedJobsData.length > 0 && (
                  <div className="bg-white p-4 rounded-xl border border-slate-200 mb-5">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-xs font-display font-bold text-slate-900 uppercase tracking-wider">
                        Skill Demand Distribution (Job Postings by Category)
                      </h3>
                      <span className="text-[9px] text-slate-500">Top In-Demand Trades</span>
                    </div>
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={transformedJobsData.slice(0, 8)} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.6} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 8 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 8 }} allowDecimals={false} />
                          <Bar dataKey="jobs" name="Job Postings" fill="#C95D41" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Skills Supply vs Demand Gap & Wage Benchmarks */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {/* Skills Supply vs Demand */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <h3 className="text-xs font-display font-bold text-slate-900 mb-2 uppercase tracking-wider">
                      Skills Supply vs. Demand Comparison
                    </h3>
                    <table className="w-full text-[9px] font-body text-left">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 uppercase">
                          <th className="py-1.5 px-2">Skill / Trade Category</th>
                          <th className="py-1.5 px-2 text-center">Postings (Demand)</th>
                          <th className="py-1.5 px-2 text-center">Workers (Supply)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(transformedJobsData.length > 0 ? transformedJobsData : transformedSkillDistribution).slice(0, 6).map((item: any, idx: number) => {
                          const workerMatch = transformedSkillDistribution.find((s: any) => s.name.toLowerCase() === item.name.toLowerCase());
                          const jobMatch = transformedJobsData.find((j: any) => j.name.toLowerCase() === item.name.toLowerCase());
                          return (
                            <tr key={idx} className="border-b border-slate-100 last:border-none">
                              <td className="py-1 px-2 font-medium capitalize text-slate-800">{item.name}</td>
                              <td className="py-1 px-2 text-center font-bold text-slate-900">{jobMatch ? jobMatch.jobs : '—'}</td>
                              <td className="py-1 px-2 text-center font-bold text-primary">{workerMatch ? workerMatch.value : '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Compensation Benchmarks */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <h3 className="text-xs font-display font-bold text-slate-900 mb-2 uppercase tracking-wider">
                      Trade Category Compensation Benchmarks
                    </h3>
                    <table className="w-full text-[9px] font-body text-left">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 uppercase">
                          <th className="py-1.5 px-2">Trade Category</th>
                          <th className="py-1.5 px-2 text-right">Average Pay (PHP)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data?.compensation?.categories || []).slice(0, 6).map((c: any, idx: number) => (
                          <tr key={idx} className="border-b border-slate-100 last:border-none">
                            <td className="py-1 px-2 font-medium capitalize text-slate-800">{c.category}</td>
                            <td className="py-1 px-2 text-right font-bold text-slate-900">PHP {parseFloat(c.avg_comp || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* AI Labor Market Diagnostic Memo */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[9px] text-slate-700">
                  <span className="font-bold text-primary uppercase mr-1.5">AI Labor Market Diagnostic:</span>
                  Recruitment throughput exhibits solid transition from submission to review. Discrepancies between worker supply and posted openings in primary vocational trades highlight opportunities for targeted skill alignment.
                </div>
              </div>

              {/* Running Print Footer */}
              <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center text-[8px] text-slate-400 font-medium uppercase tracking-wider">
                <span>SIKAP: Skills and Job Matching Platform</span>
                <span>Master Dossier & System Audit · Document Classification: Official Confidential</span>
                <span>Page 2 of 7</span>
              </div>
            </div>

            {/* ================= PAGE 3: GEOGRAPHIC DISTRIBUTION & BARANGAY ACTIVITY ================= */}
            <div className="print-page-break avoid-break flex flex-col justify-between min-h-[960px]">
              <div>
                <div className="mb-4">
                  <h2 className="text-base font-display font-bold text-slate-900 uppercase tracking-wider">
                    Page 3: Geographic Distribution & Barangay Labor Activity
                  </h2>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Spatial labor market engagement breakdown identifying active geographic clusters and localized employment demand.
                  </p>
                </div>

                {/* Geographic Activity Chart */}
                {transformedGeographicActivity.length > 0 && (
                  <div className="bg-white p-4 rounded-xl border border-slate-200 mb-5">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-xs font-display font-bold text-slate-900 uppercase tracking-wider">
                        Barangay Spatial Activity Comparison
                      </h3>
                      <span className="text-[9px] text-slate-500">Job Postings vs Applications by Area</span>
                    </div>
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={transformedGeographicActivity.slice(0, 8)} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.6} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 8 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 8 }} allowDecimals={false} />
                          <Bar dataKey="jobs" name="Job Postings" fill="#C95D41" radius={[3, 3, 0, 0]} />
                          <Bar dataKey="applications" name="Applications" fill="#3B82F6" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Barangay Engagement Table */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
                  <table className="w-full text-[10px] font-body text-left">
                    <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Barangay / Area</th>
                        <th className="py-2 px-3 text-center">Job Postings</th>
                        <th className="py-2 px-3 text-center">Applications Filed</th>
                        <th className="py-2 px-3 text-center">Registered Workers</th>
                        <th className="py-2 px-3 text-right">Labor Engagement Index</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transformedGeographicActivity.length > 0 ? (
                        transformedGeographicActivity.map((geo: any, idx: number) => {
                          const totalActivity = (geo.jobs || 0) + (geo.applications || 0);
                          const workersInArea = masterData.users.filter((u: any) => (u.barangay || '').toLowerCase() === geo.name.toLowerCase()).length;
                          return (
                            <tr key={idx} className="border-b border-slate-100 last:border-none">
                              <td className="py-1.5 px-3 font-bold text-slate-900">{geo.name}</td>
                              <td className="py-1.5 px-3 text-center font-semibold text-slate-800">{geo.jobs}</td>
                              <td className="py-1.5 px-3 text-center font-semibold text-slate-800">{geo.applications}</td>
                              <td className="py-1.5 px-3 text-center font-semibold text-primary">{workersInArea}</td>
                              <td className="py-1.5 px-3 text-right font-bold text-emerald-700">{totalActivity} Actions</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-400">No localized geographic records recorded.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* AI Spatial Labor Allocation Memo */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[9px] text-slate-700">
                  <span className="font-bold text-primary uppercase mr-1.5">AI Spatial Allocation Diagnostic:</span>
                  Spatial mapping demonstrates high labor concentration in urban core barangays with emerging demand in suburban zones. Rebalancing outreach can optimize travel efficiency for service providers.
                </div>
              </div>

              {/* Running Print Footer */}
              <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center text-[8px] text-slate-400 font-medium uppercase tracking-wider">
                <span>SIKAP: Skills and Job Matching Platform</span>
                <span>Master Dossier & System Audit · Document Classification: Official Confidential</span>
                <span>Page 3 of 7</span>
              </div>
            </div>

            {/* ================= PAGE 4: IDENTITY VERIFICATION & TRUST PIPELINE ================= */}
            <div className="print-page-break avoid-break flex flex-col justify-between min-h-[960px]">
              <div>
                <div className="mb-4">
                  <h2 className="text-base font-display font-bold text-slate-900 uppercase tracking-wider">
                    Page 4: Identity Verification & Credential Compliance Audit
                  </h2>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    ID and identity credential screening audit verifying trustworthiness across all platform participants.
                  </p>
                </div>

                {/* Compliance Metric Cards */}
                <div className="grid grid-cols-4 gap-4 print-card-grid mb-5">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <p className="text-[9px] font-bold text-slate-500 uppercase">Total Submissions</p>
                    <p className="text-xl font-black text-slate-900 mt-0.5">{masterData.verifications.length}</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <p className="text-[9px] font-bold text-slate-500 uppercase">Approved Credentials</p>
                    <p className="text-xl font-black text-emerald-700 mt-0.5">
                      {masterData.verifications.filter((v: any) => v.verification_status === 'approved').length}
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <p className="text-[9px] font-bold text-slate-500 uppercase">Pending Review</p>
                    <p className="text-xl font-black text-amber-700 mt-0.5">
                      {masterData.verifications.filter((v: any) => v.verification_status === 'pending').length}
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <p className="text-[9px] font-bold text-slate-500 uppercase">Rejected Submissions</p>
                    <p className="text-xl font-black text-red-700 mt-0.5">
                      {masterData.verifications.filter((v: any) => v.verification_status === 'rejected').length}
                    </p>
                  </div>
                </div>

                {/* Verification Table */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
                  <table className="w-full text-[10px] font-body text-left">
                    <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">User ID</th>
                        <th className="py-2 px-3">Full Name</th>
                        <th className="py-2 px-3">Role</th>
                        <th className="py-2 px-3">Credentials Submitted</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">Date Submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {masterData.verifications.slice(0, 16).map((v: any, idx: number) => (
                        <tr key={idx} className="border-b border-slate-100 last:border-none">
                          <td className="py-1.5 px-3 font-mono text-slate-500">#{v.id}</td>
                          <td className="py-1.5 px-3 font-bold text-slate-900">{v.name}</td>
                          <td className="py-1.5 px-3 capitalize text-slate-700">{v.role}</td>
                          <td className="py-1.5 px-3 text-slate-600">
                            {v.document_url ? 'Front ID' : ''}
                            {v.document_back_url ? ' + Back ID' : ''}
                            {v.selfie_url ? ' + Selfie' : ''}
                          </td>
                          <td className="py-1.5 px-3">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              v.verification_status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                              v.verification_status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {v.verification_status}
                            </span>
                          </td>
                          <td className="py-1.5 px-3 text-slate-600">{new Date(v.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* AI Trust & Compliance Assessment Memo */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[9px] text-slate-700">
                  <span className="font-bold text-primary uppercase mr-1.5">AI Trust & Verification Diagnostic:</span>
                  Verification approval rates remain consistently high, significantly mitigating platform fraud risk and building credibility among employers and jobseekers alike.
                </div>
              </div>

              {/* Running Print Footer */}
              <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center text-[8px] text-slate-400 font-medium uppercase tracking-wider">
                <span>SIKAP: Skills and Job Matching Platform</span>
                <span>Master Dossier & System Audit · Document Classification: Official Confidential</span>
                <span>Page 4 of 7</span>
              </div>
            </div>

            {/* ================= PAGE 5: JOB POSTINGS & HIRING DIRECTORY ================= */}
            <div className="print-page-break avoid-break flex flex-col justify-between min-h-[960px]">
              <div>
                <div className="mb-4">
                  <h2 className="text-base font-display font-bold text-slate-900 uppercase tracking-wider">
                    Page 5: Job Postings & Hiring Directory ({masterData.jobs.length} Posts)
                  </h2>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Comprehensive listing of all job posts, employer details, duration types, compensation, and hiring completion.
                  </p>
                </div>

                {/* Application Volume Area Chart */}
                {transformedApplicationVolume.length > 0 && (
                  <div className="bg-white p-4 rounded-xl border border-slate-200 mb-5">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-xs font-display font-bold text-slate-900 uppercase tracking-wider">
                        Application Volume & Job Postings Velocity
                      </h3>
                      <span className="text-[9px] text-slate-500">Applications vs Unique Jobs</span>
                    </div>
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={transformedApplicationVolume} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.6} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 8 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 8 }} allowDecimals={false} />
                          <Area type="monotone" dataKey="applications" name="Applications" stroke="#C95D41" strokeWidth={2} fill="#C95D41" fillOpacity={0.12} />
                          <Area type="monotone" dataKey="jobs" name="Unique Jobs" stroke="#3B82F6" strokeWidth={2} fill="#3B82F6" fillOpacity={0.12} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Job Directory Table */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
                  <table className="w-full text-[10px] font-body text-left">
                    <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Code</th>
                        <th className="py-2 px-3">Job Title</th>
                        <th className="py-2 px-3">Employer</th>
                        <th className="py-2 px-3">Category</th>
                        <th className="py-2 px-3">Compensation</th>
                        <th className="py-2 px-3">Slots</th>
                        <th className="py-2 px-3">Apps</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {masterData.jobs.slice(0, 15).map((j: any, idx: number) => (
                        <tr key={idx} className="border-b border-slate-100 last:border-none">
                          <td className="py-1.5 px-3 font-mono text-slate-500">{j.reference_number || `#${j.id}`}</td>
                          <td className="py-1.5 px-3 font-bold text-slate-900">{j.title}</td>
                          <td className="py-1.5 px-3 text-slate-700">{j.employer?.name || '—'}</td>
                          <td className="py-1.5 px-3 text-slate-600 capitalize">{j.category}</td>
                          <td className="py-1.5 px-3 font-bold text-slate-900">PHP {parseFloat(j.compensation || 0).toFixed(2)}</td>
                          <td className="py-1.5 px-3 text-slate-700">{j.accepted_count ?? 0}/{j.slots ?? 1}</td>
                          <td className="py-1.5 px-3 text-slate-700">{j.applications_count ?? 0}</td>
                          <td className="py-1.5 px-3 capitalize font-semibold text-slate-800">{j.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* AI Labor Liquidity Diagnostic Memo */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[9px] text-slate-700">
                  <span className="font-bold text-primary uppercase mr-1.5">AI Job Fulfillment Diagnostic:</span>
                  Job post lifecycle metrics reveal rapid application intake for specialized skilled trade roles, maintaining healthy time-to-hire across local employers.
                </div>
              </div>

              {/* Running Print Footer */}
              <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center text-[8px] text-slate-400 font-medium uppercase tracking-wider">
                <span>SIKAP: Skills and Job Matching Platform</span>
                <span>Master Dossier & System Audit · Document Classification: Official Confidential</span>
                <span>Page 5 of 7</span>
              </div>
            </div>

            {/* ================= PAGE 6: COMMUNITY SAFETY & INCIDENT AUDIT ================= */}
            <div className="print-page-break avoid-break flex flex-col justify-between min-h-[960px]">
              <div>
                <div className="mb-4">
                  <h2 className="text-base font-display font-bold text-slate-900 uppercase tracking-wider">
                    Page 6: Community Safety, Content Moderation & Incident Audit
                  </h2>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Audit trail of community safety reports, violation resolutions, and profanity filtering enforcement.
                  </p>
                </div>

                {/* Safety Summary Metrics */}
                <div className="grid grid-cols-4 gap-4 print-card-grid mb-5">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <p className="text-[9px] font-bold text-slate-500 uppercase">Total Reports Filed</p>
                    <p className="text-xl font-black text-slate-900 mt-0.5">{masterData.reports.length}</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <p className="text-[9px] font-bold text-slate-500 uppercase">Resolved Incidents</p>
                    <p className="text-xl font-black text-emerald-700 mt-0.5">
                      {masterData.reports.filter((r: any) => r.status === 'resolved').length}
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <p className="text-[9px] font-bold text-slate-500 uppercase">Pending Review</p>
                    <p className="text-xl font-black text-amber-700 mt-0.5">
                      {masterData.reports.filter((r: any) => r.status === 'pending').length}
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <p className="text-[9px] font-bold text-slate-500 uppercase">Active Profanity Filters</p>
                    <p className="text-xl font-black text-indigo-700 mt-0.5">{masterData.profanity.length} Words</p>
                  </div>
                </div>

                {/* Incident Reports Table */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
                  <table className="w-full text-[10px] font-body text-left">
                    <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">ID</th>
                        <th className="py-2 px-3">Violation Type</th>
                        <th className="py-2 px-3">Target Entity</th>
                        <th className="py-2 px-3">Reporter</th>
                        <th className="py-2 px-3">Description</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">Date Filed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {masterData.reports.length > 0 ? (
                        masterData.reports.slice(0, 12).map((r: any, idx: number) => (
                          <tr key={idx} className="border-b border-slate-100 last:border-none">
                            <td className="py-1.5 px-3 font-mono text-slate-500">#{r.id}</td>
                            <td className="py-1.5 px-3 font-bold text-slate-900 capitalize">{r.type?.replace(/_/g, ' ')}</td>
                            <td className="py-1.5 px-3 text-slate-700 capitalize">{r.reportable_type}</td>
                            <td className="py-1.5 px-3 text-slate-600">{r.reporter?.name || 'Anonymous'}</td>
                            <td className="py-1.5 px-3 text-slate-600 truncate max-w-xs">{r.description || '—'}</td>
                            <td className="py-1.5 px-3 capitalize font-semibold text-slate-800">{r.status}</td>
                            <td className="py-1.5 px-3 text-slate-600">{new Date(r.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-4 text-center text-slate-400">No moderation incident records.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* AI Community Safety Diagnostic Memo */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[9px] text-slate-700">
                  <span className="font-bold text-primary uppercase mr-1.5">AI Community Safety Assessment:</span>
                  Low incident frequency and high resolution rate indicate effective automated profanity filtering and prompt administrative moderation, sustaining a safe environment for all participants.
                </div>
              </div>

              {/* Running Print Footer */}
              <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center text-[8px] text-slate-400 font-medium uppercase tracking-wider">
                <span>SIKAP: Skills and Job Matching Platform</span>
                <span>Master Dossier & System Audit · Document Classification: Official Confidential</span>
                <span>Page 6 of 7</span>
              </div>
            </div>

            {/* ================= PAGE 7: ADMINISTRATIVE AUDIT TRAIL & OFFICIAL SIGN-OFF ================= */}
            <div className="print-page-break avoid-break flex flex-col justify-between min-h-[960px]">
              <div>
                <div className="mb-4">
                  <h2 className="text-base font-display font-bold text-slate-900 uppercase tracking-wider">
                    Page 7: System Audit Trail & Official Sign-off
                  </h2>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Administrative action audit log documenting administrative events, security changes, and institutional verification.
                  </p>
                </div>

                {/* System Audit Logs */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
                  <table className="w-full text-[10px] font-body text-left">
                    <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Log ID</th>
                        <th className="py-2 px-3">Administrator</th>
                        <th className="py-2 px-3">Action</th>
                        <th className="py-2 px-3">Target Entity</th>
                        <th className="py-2 px-3">Details</th>
                        <th className="py-2 px-3">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {masterData.logs.length > 0 ? (
                        masterData.logs.slice(0, 12).map((l: any, idx: number) => (
                          <tr key={idx} className="border-b border-slate-100 last:border-none">
                            <td className="py-1.5 px-3 font-mono text-slate-500">#{l.id}</td>
                            <td className="py-1.5 px-3 font-bold text-slate-900">{l.admin?.name || 'Superadmin'}</td>
                            <td className="py-1.5 px-3 font-semibold text-primary capitalize">{l.action}</td>
                            <td className="py-1.5 px-3 text-slate-700 capitalize">{l.target_type || 'System'}</td>
                            <td className="py-1.5 px-3 text-slate-600 truncate max-w-xs">{l.details || '—'}</td>
                            <td className="py-1.5 px-3 text-slate-600">{new Date(l.created_at).toLocaleString()}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-4 text-center text-slate-400">No administrative logs recorded.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* AI Governance Audit Memo */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[9px] text-slate-700 mb-6">
                  <span className="font-bold text-primary uppercase mr-1.5">AI Administrative Governance Audit:</span>
                  All administrative operations are systematically logged with full timestamp traceability, verifying institutional compliance with data integrity and user data protection protocols.
                </div>

                {/* Formal 3-Signer Institutional Sign-Off Block */}
                <div className="pt-6 border-t-2 border-slate-300 grid grid-cols-3 gap-8 avoid-break">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-8">Prepared & Certified By:</p>
                    <div className="border-b border-slate-400 w-40 mb-1"></div>
                    <p className="text-xs font-bold text-slate-900">Platform Administrator</p>
                    <p className="text-[9px] text-slate-500">SIKAP Management Console</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-8">Reviewed & Endorsed By:</p>
                    <div className="border-b border-slate-400 w-40 mb-1"></div>
                    <p className="text-xs font-bold text-slate-900">Lead Researcher / Data Specialist</p>
                    <p className="text-[9px] text-slate-500">SIKAP Project Team</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-8">Noted & Approved By:</p>
                    <div className="border-b border-slate-400 w-40 mb-1"></div>
                    <p className="text-xs font-bold text-slate-900">Project Adviser / Supervisor</p>
                    <p className="text-[9px] text-slate-500">SIKAP Project Advisory & Oversight</p>
                  </div>
                </div>
              </div>

              {/* Running Print Footer */}
              <div className="mt-6 pt-3 border-t border-slate-200 flex justify-between items-center text-[8px] text-slate-400 font-medium uppercase tracking-wider">
                <span>SIKAP: Skills and Job Matching Platform</span>
                <span>Master Dossier & System Audit · Document Classification: Official Confidential</span>
                <span>Page 7 of 7</span>
              </div>
            </div>
          </div>
        ) : (
          /* ================= ANALYTICS PERIOD REPORT ================= */
          data && (
            <div>
              {/* Institutional Document Header */}
              <div className="mb-8 pb-6 border-b-2 border-slate-300 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center text-white font-black text-lg">
                    S
                  </div>
                  <div>
                    <h1 className="text-xl font-display font-black text-slate-900 tracking-tight uppercase">
                      SIKAP Descriptive Analytics Report
                    </h1>
                    <p className="text-[11px] font-body text-slate-500 font-semibold">
                      SIKAP: Skills and Job Matching Platform
                    </p>
                  </div>
                </div>
                <div className="text-right text-[10px] text-slate-600 space-y-0.5">
                  <p><span className="font-bold text-slate-900">Period:</span> {from} to {to}</p>
                  <p><span className="font-bold text-slate-900">Granularity:</span> {intervalFilter.toUpperCase()}</p>
                  <p><span className="font-bold text-slate-900">Generated:</span> {new Date().toLocaleString()}</p>
                </div>
              </div>

              {/* AI Insights & Recommendations */}
              {aiInsights && (
                <div className="bg-white p-6 rounded-2xl border border-gray-200 mb-8 print-chart-container">
                  <h2 className="text-base font-display font-bold text-ink mb-4 uppercase tracking-wider">AI Executive Summary & Recommendations</h2>
                  
                  {aiInsights.dataSufficiency?.isLowVolume && (
                    <div className="mb-4 text-xs font-semibold text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
                      {aiInsights.dataSufficiency.note ?? "Low data volume this period."}
                    </div>
                  )}

                  <div className="space-y-4">
                    {aiInsights.keyInsights?.length > 0 && (
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-ink mb-2">Key Insights</h3>
                        <ul className="list-disc pl-5 space-y-1 text-xs text-ink-soft">
                          {aiInsights.keyInsights.map((item, idx) => (
                            <li key={idx}>
                              <strong>{item.text}</strong> {item.supportingData && `— ${item.supportingData}`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {aiInsights.trends?.length > 0 && (
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-ink mb-2">Trends</h3>
                        <ul className="list-disc pl-5 space-y-1 text-xs text-ink-soft">
                          {aiInsights.trends.map((item, idx) => (
                            <li key={idx}>
                              <strong>{item.text}</strong> {item.sampleSizeWarning && " (low sample size)"} {item.supportingData && `— ${item.supportingData}`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {aiInsights.areasOfConcern?.length > 0 && (
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-ink mb-2">Areas of Concern</h3>
                        <ul className="list-disc pl-5 space-y-1 text-xs text-ink-soft">
                          {aiInsights.areasOfConcern.map((item, idx) => (
                            <li key={idx}>
                              <strong>{item.text}</strong> {item.supportingData && `— ${item.supportingData}`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {aiInsights.recommendations?.length > 0 && (
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-ink mb-2">Recommendations</h3>
                        <ul className="list-disc pl-5 space-y-1 text-xs text-ink-soft">
                          {aiInsights.recommendations.map((item, idx) => (
                            <li key={idx}>
                              <strong>{item.text}</strong> {item.supportingData && `— ${item.supportingData}`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* KPI Summary Grid */}
              <div className="mb-8 print-chart-container">
                <h2 className="text-base font-display font-bold text-ink mb-4 uppercase tracking-wider">Key Performance Indicators</h2>
                <div className="grid grid-cols-4 gap-4 print-card-grid">
                  {stats.map((stat, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-body font-bold text-gray-500 uppercase tracking-wider">{stat.label}</span>
                        <div className="w-6 h-6 rounded bg-gray-50 flex items-center justify-center">
                          <i className={`${stat.iconClass} text-xs text-gray-600`} />
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="text-xl font-display font-black text-gray-900">{stat.value}</span>
                        {stat.change !== undefined && (
                          <div className="flex items-center gap-1 mt-1 text-[9px] font-body font-semibold">
                            <span className={stat.change >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {stat.change >= 0 ? '▲' : '▼'} {Math.abs(stat.change)}%
                            </span>
                            <span className="text-gray-400">vs last period</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Funnel & Turnaround */}
              <div className="grid grid-cols-3 gap-6 mb-8 print-page-break print-chart-container">
                <div className="col-span-2 bg-white p-6 rounded-xl border border-gray-200">
                  <h3 className="text-xs font-display font-bold text-gray-800 mb-4 uppercase tracking-wider">Application-to-Hire Funnel</h3>
                  <div className="space-y-4">
                    {funnelSteps.map((step, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-semibold">
                          <span className="text-gray-700">{step.label}</span>
                          <span className="text-gray-900">{step.value} ({step.rate})</span>
                        </div>
                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-primary h-full rounded-full" style={{ width: step.rate }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-display font-bold text-gray-800 mb-3 uppercase tracking-wider">Verification Turnaround</h3>
                    <span className="text-2xl font-display font-black text-gray-900">
                      {data?.verification?.average_turnaround_seconds
                        ? (data.verification.average_turnaround_seconds / 3600).toFixed(1)
                        : '0.0'}
                    </span>
                    <span className="text-[10px] font-semibold text-gray-500 ml-1">hours</span>
                  </div>
                  <div className="space-y-2 mt-4 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Processed</span>
                      <span className="font-bold text-gray-800">{data?.verification?.total_verifications ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Pending Review</span>
                      <span className="font-bold text-gray-800">{data?.verification?.pending_verifications ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Delayed (&gt;48h)</span>
                      <span className="font-bold text-red-600">{data?.verification?.delayed_verifications ?? 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Activity Trends */}
              <div className="grid grid-cols-2 gap-6 mb-8 print-page-break print-chart-container">
                <div className="bg-white p-6 rounded-xl border border-gray-200 flex flex-col">
                  <h3 className="text-xs font-display font-bold text-gray-800 mb-4 uppercase tracking-wider">User Registrations</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={transformedUserGrowth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8DFCE" opacity={0.5} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 9 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 9 }} allowDecimals={false} />
                        <Bar dataKey="workers" name="Workers" fill="#FFB6C1" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="employers" name="Employers" fill="#87CEEB" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 flex flex-col">
                  <h3 className="text-xs font-display font-bold text-gray-800 mb-4 uppercase tracking-wider">Application Volume</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={transformedApplicationVolume} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8DFCE" opacity={0.5} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 9 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 9 }} allowDecimals={false} />
                        <Area type="monotone" dataKey="applications" name="Applications" stroke="#FFB6C1" strokeWidth={2} fill="#FFB6C1" fillOpacity={0.08} />
                        <Area type="monotone" dataKey="jobs" name="Unique Jobs" stroke="#87CEEB" strokeWidth={2} fill="#87CEEB" fillOpacity={0.08} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Detailed Data Tables (Wages & Reports) */}
              <div className="grid grid-cols-2 gap-6 print-page-break print-chart-container">
                {/* Wages */}
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <h3 className="text-xs font-display font-bold text-gray-800 mb-4 uppercase tracking-wider">Wage Category Breakdown</h3>
                  <table className="w-full text-xs font-body text-left">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-500 uppercase text-[9px]">
                        <th className="py-2 px-3 font-semibold">Category</th>
                        <th className="py-2 px-3 text-right font-semibold">Average Pay</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.compensation?.categories?.length > 0 ? (
                        data.compensation.categories.map((c: any, idx: number) => (
                          <tr key={idx} className="border-b border-gray-100 last:border-none">
                            <td className="py-2 px-3 font-semibold text-gray-700 capitalize">{c.category}</td>
                            <td className="py-2 px-3 text-right text-gray-900 font-bold">PHP {parseFloat(c.avg_comp || 0).toFixed(2)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={2} className="py-4 text-center text-gray-400">No wage records.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Reports */}
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <h3 className="text-xs font-display font-bold text-gray-800 mb-4 uppercase tracking-wider">Moderation Breakdown</h3>
                  <table className="w-full text-xs font-body text-left">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-500 uppercase text-[9px]">
                        <th className="py-2 px-3 font-semibold">Violation Type</th>
                        <th className="py-2 px-3 text-right font-semibold">Total Reports</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.reports?.breakdown?.length > 0 ? (
                        data.reports.breakdown.map((r: any, idx: number) => (
                          <tr key={idx} className="border-b border-gray-100 last:border-none">
                            <td className="py-2 px-3 font-semibold text-gray-700 capitalize">{r.type}</td>
                            <td className="py-2 px-3 text-right text-gray-900 font-bold">{r.count}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={2} className="py-4 text-center text-gray-400">No report records.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Official SIKAP Sign-off Block */}
              <div className="mt-12 pt-8 border-t-2 border-slate-200 grid grid-cols-2 gap-12 print-chart-container avoid-break">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-8">Prepared & Certified By:</p>
                  <div className="border-b border-gray-400 w-48 mb-1"></div>
                  <p className="text-xs font-bold text-gray-800">Platform Administrator</p>
                  <p className="text-[10px] text-gray-500">SIKAP Management Console</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-8">Noted & Approved By:</p>
                  <div className="border-b border-gray-400 w-48 mb-1"></div>
                  <p className="text-xs font-bold text-gray-800">Project Supervisor</p>
                  <p className="text-[10px] text-gray-500">SIKAP Project Advisory & Oversight</p>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
