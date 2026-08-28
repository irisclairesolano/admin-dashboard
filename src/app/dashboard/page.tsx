'use client';

import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Sector
} from 'recharts';
import { adminApi } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import { useRouter } from 'next/navigation';

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

export default function AnalyticsDashboard() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [presetFilter, setPresetFilter] = useState<'7days' | '30days' | '6months' | '1year' | 'custom'>('7days');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Page-specific tab filters
  const [trendsRoleFilter, setTrendsRoleFilter] = useState<'all' | 'worker' | 'employer'>('all');
  const [trendsVolumeFilter, setTrendsVolumeFilter] = useState<'all' | 'applications' | 'jobs'>('all');
  const [distRegionFilter, setDistRegionFilter] = useState<string>('all');
  const [distLimitFilter, setDistLimitFilter] = useState<number>(6);
  const [healthWageFilter, setHealthWageFilter] = useState<'all' | 'low' | 'mid' | 'high'>('all');
  const [healthReportFilter, setHealthReportFilter] = useState<'all' | 'pending' | 'resolved'>('all');

  // Auto-calculated aggregation interval based on selected date preset
  const intervalFilter = (() => {
    if (presetFilter === '7days') return 'daily';
    if (presetFilter === '30days') return 'daily';
    if (presetFilter === '6months') return 'weekly';
    if (presetFilter === '1year') return 'monthly';
    if (presetFilter === 'custom' && startDate && endDate) {
      const diffTime = Math.abs(new Date(endDate).getTime() - new Date(startDate).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < 45) return 'daily';
      if (diffDays < 180) return 'weekly';
      return 'monthly';
    }
    return 'daily';
  })();

  // Tab State
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'distribution' | 'health'>('overview');

  // Interactive Pie State
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);

  // Expandable Table States
  const [showWagesBreakdown, setShowWagesBreakdown] = useState(false);
  const [showReportsBreakdown, setShowReportsBreakdown] = useState(false);

  // AI Insights State
  const [aiInsights, setAiInsights] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiPeriod, setAiPeriod] = useState('');

  // Reset insights when filters change to avoid showing stale data
  useEffect(() => {
    setAiInsights('');
    setAiError('');
    setAiPeriod('');
  }, [presetFilter, startDate, endDate, intervalFilter]);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      let from = '';
      let to = '';
      
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;

      if (presetFilter === '7days') {
        const past = new Date();
        past.setDate(now.getDate() - 7);
        from = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, '0')}-${String(past.getDate()).padStart(2, '0')}`;
        to = todayStr;
      } else if (presetFilter === '30days') {
        const past = new Date();
        past.setDate(now.getDate() - 30);
        from = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, '0')}-${String(past.getDate()).padStart(2, '0')}`;
        to = todayStr;
      } else if (presetFilter === '6months') {
        const past = new Date();
        past.setMonth(now.getMonth() - 6);
        from = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, '0')}-${String(past.getDate()).padStart(2, '0')}`;
        to = todayStr;
      } else if (presetFilter === '1year') {
        const past = new Date();
        past.setFullYear(now.getFullYear() - 1);
        from = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, '0')}-${String(past.getDate()).padStart(2, '0')}`;
        to = todayStr;
      } else if (presetFilter === 'custom') {
        from = startDate;
        to = endDate;
      }

      if (presetFilter !== 'custom' || (startDate && endDate)) {
        const res = await adminApi.getAnalytics(from, to, intervalFilter);
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load analytics', err);
    } finally {
      setLoading(false);
    }
  }, [presetFilter, startDate, endDate, intervalFilter]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleGenerateInsights = async () => {
    try {
      setAiLoading(true);
      setAiError('');
      
      let from = '';
      let to = '';
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      
      if (presetFilter === '7days') {
        const past = new Date();
        past.setDate(now.getDate() - 7);
        from = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, '0')}-${String(past.getDate()).padStart(2, '0')}`;
        to = todayStr;
      } else if (presetFilter === '30days') {
        const past = new Date();
        past.setDate(now.getDate() - 30);
        from = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, '0')}-${String(past.getDate()).padStart(2, '0')}`;
        to = todayStr;
      } else if (presetFilter === '6months') {
        const past = new Date();
        past.setMonth(now.getMonth() - 6);
        from = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, '0')}-${String(past.getDate()).padStart(2, '0')}`;
        to = todayStr;
      } else if (presetFilter === '1year') {
        const past = new Date();
        past.setFullYear(now.getFullYear() - 1);
        from = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, '0')}-${String(past.getDate()).padStart(2, '0')}`;
        to = todayStr;
      } else if (presetFilter === 'custom') {
        from = startDate;
        to = endDate;
      }

      const res = await adminApi.generateAIInsights(from, to, intervalFilter);
      setAiInsights(res.data.insights);
      setAiPeriod(res.data.period);
    } catch (err: any) {
      console.error('Failed to generate AI insights', err);
      setAiError(err.response?.data?.message || 'Failed to generate insights. Please verify Gemini configuration.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!data) return;

    let csv = "";
    csv += "SIKAP ADMIN DASHBOARD - ANALYTICS REPORT\r\n";
    csv += `Generated On: ${new Date().toLocaleString()}\r\n`;
    csv += `Reporting Preset: ${presetFilter}\r\n\r\n`;

    // KPIs
    csv += "KEY PERFORMANCE INDICATORS\r\n";
    csv += "Metric,Current Value,PoP Change (%)\r\n";
    csv += `New Registrations,${data.kpis?.total_users?.value ?? 0},${data.kpis?.total_users?.change ?? 0}%\r\n`;
    csv += `Jobs Posted,${data.kpis?.active_jobs?.value ?? 0},${data.kpis?.active_jobs?.change ?? 0}%\r\n`;
    csv += `Applications,${data.kpis?.applications?.value ?? 0},${data.kpis?.applications?.change ?? 0}%\r\n`;
    csv += `Reports Filed,${data.kpis?.unresolved_reports?.value ?? 0},${data.kpis?.unresolved_reports?.change ?? 0}%\r\n\r\n`;

    // Funnel & Retention
    csv += "FUNNEL & RETENTION\r\n";
    csv += `Total Applications,${data.funnel?.total_applications ?? 0}\r\n`;
    csv += `Accepted Applications,${data.funnel?.accepted_applications ?? 0}\r\n`;
    csv += `Completed Jobs,${data.funnel?.completed_jobs ?? 0}\r\n`;
    csv += `Job Fill Rate,${data.fill_rate?.value ?? 0}%\r\n`;
    csv += `Worker Retention Rate,${data.worker_retention?.retention_rate ?? 0}%\r\n\r\n`;

    // User Demographics
    csv += "USER DEMOGRAPHICS\r\n";
    csv += `Workers count,${data.user_ratio?.workers ?? 0}\r\n`;
    csv += `Employers count,${data.user_ratio?.employers ?? 0}\r\n`;
    csv += `Verified count,${data.user_ratio?.verified_users ?? 0}\r\n`;
    csv += `Unverified count,${data.user_ratio?.unverified_users ?? 0}\r\n\r\n`;

    // Compensation
    csv += "COMPENSATION ANALYTICS\r\n";
    csv += `Min Compensation,PHP ${data.compensation?.min ?? 0}\r\n`;
    csv += `Avg Compensation,PHP ${data.compensation?.avg ?? 0}\r\n`;
    csv += `Max Compensation,PHP ${data.compensation?.max ?? 0}\r\n\r\n`;

    // Reports
    csv += "REPORTS MODERATION\r\n";
    csv += `Unresolved Open Reports,${data.reports?.open_reports ?? 0}\r\n`;
    csv += `Avg Resolution Time (Sec),${data.reports?.average_resolution_seconds ?? 0}\r\n`;
    csv += `Most Common Type,${data.reports?.most_common_type ?? 'None'}\r\n`;

    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `sikap_analytics_${presetFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    window.print();
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
    
    return Object.values(grouped);
  })();

  // Skill Demand - horizontal bar chart category comparator
  const transformedJobsData = (() => {
    if (!data?.skill_demand) return [];
    const list = data.skill_demand.map((item: any) => ({
      name: item.category,
      jobs: parseInt(item.total_postings),
    })).sort((a: any, b: any) => b.jobs - a.jobs);

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
      return Object.values(grouped).sort((a, b) => b.jobs - a.jobs).slice(0, distLimitFilter);
    } else {
      // Show barangays of the selected municipality
      return data.geographic_activity
        .filter((item: any) => item.municipality === distRegionFilter)
        .map((item: any) => ({
          name: item.barangay || 'Unknown',
          jobs: parseInt(item.job_postings || 0),
          applications: parseInt(item.total_applications || 0)
        }))
        .sort((a: any, b: any) => b.jobs - a.jobs)
        .slice(0, distLimitFilter);
    }
  })();

  // Application Volume respects global date & aggregation parameters
  const transformedApplicationVolume = (() => {
    if (!data?.application_volume) return [];
    return data.application_volume.map((item: any) => ({
      name: item.period || 'Unknown',
      applications: parseInt(item.total_applications),
      jobs: parseInt(item.unique_jobs),
    }));
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

  const COLORS = ['#FFB6C1', '#87CEEB', '#90EE90', '#DDA0DD', '#F0E68C', '#FCD9C5', '#DCE9F2', '#D8EBDC', '#FFE9B0', '#E8DFCE'];

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
    return data.compensation.categories.filter((c: any) => {
      const avg = parseFloat(c.avg_comp || 0);
      if (healthWageFilter === 'low') return avg < 500;
      if (healthWageFilter === 'mid') return avg >= 500 && avg <= 1000;
      if (healthWageFilter === 'high') return avg > 1000;
      return true;
    });
  })();

  // Filtered Moderation Breakdown
  const filteredReportsBreakdown = (() => {
    if (!data?.reports?.breakdown) return [];
    return data.reports.breakdown.filter((r: any) => {
      if (healthReportFilter === 'all') return true;
      return r.type === healthReportFilter;
    });
  })();

  return (
    <div className="animate-fade-in print:p-0 print:bg-white min-h-screen pb-12">
      {/* Dynamic Style Block for PDF Exports */}
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
          body {
            background: white !important;
            color: black !important;
            font-size: 12px !important;
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
            padding: 0 !important;
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
          .print-chart-container {
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
            <p className="text-xs font-body text-ink-muted mt-1">Platform analytics and administrative insights.</p>
          </div>

          {/* Date Filter & Aggregation Components */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Export Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 bg-white/70 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/50 shadow-sm text-xs font-body font-bold text-ink hover:bg-ink hover:text-white transition-all duration-300"
              >
                <i className="lni lni-download mr-1" />
                CSV
              </button>
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-2 bg-white/70 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/50 shadow-sm text-xs font-body font-bold text-ink hover:bg-ink hover:text-white transition-all duration-300"
              >
                <i className="lni lni-printer mr-1" />
                PDF
              </button>
            </div>



            <div className="flex bg-white/70 backdrop-blur-md p-1 rounded-2xl border border-white/50 shadow-sm">
              {['7days', '30days', '6months', '1year', 'custom'].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setPresetFilter(preset as any)}
                  className={`px-3 py-1 rounded-xl text-xs font-body font-semibold transition-all ${
                    presetFilter === preset ? 'bg-ink text-white shadow-sm' : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  {preset === '7days' ? 'Weekly' : preset === '30days' ? '30 Days' : preset === '6months' ? '6 Months' : preset === '1year' ? '1 Year' : 'Custom'}
                </button>
              ))}
            </div>

            {presetFilter === 'custom' && (
              <div className="flex items-center gap-2 bg-white/70 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/50 shadow-sm">
                <input
                  aria-label="Start date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent border-none outline-none font-body text-xs text-ink-soft focus:text-ink"
                />
                <span className="text-ink-muted text-xs font-body font-semibold">to</span>
                <input
                  aria-label="End date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent border-none outline-none font-body text-xs text-ink-soft focus:text-ink"
                />
              </div>
            )}
          </div>
        </div>

        {/* Tab System Controls */}
        <div className="flex border-b border-ink-faint/50 overflow-x-auto pb-1 gap-2 mt-2">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'trends', label: 'Activity Trends' },
            { id: 'distribution', label: 'Distribution & Demand' },
            { id: 'health', label: 'Platform Health & Trust' },
          ].map((tab) => (
            <button
              key={tab.id}
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
          Reporting Period: {presetFilter === 'custom' ? `${startDate} to ${endDate}` : presetFilter} | Aggregate: {intervalFilter}
        </p>
        <hr className="mt-4 border-gray-200" />
      </div>

      {/* Loading Skeletons Orchestration */}
      {loading ? (
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
                    onClick={() => router.push(stat.href)}
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
                  <div className="prose max-w-none text-ink font-body leading-relaxed border-t border-white/40 pt-6">
                    {aiPeriod && (
                      <div className="mb-4 text-xs font-bold uppercase tracking-wider text-ink-soft bg-white/50 px-3 py-1 rounded-full w-max">
                        Analyzed Period: {aiPeriod}
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {aiInsights.split('###').filter(Boolean).map((section, idx) => {
                        const lines = section.trim().split('\n');
                        const title = lines[0];
                        const content = lines.slice(1).join('\n');
                        
                        return (
                          <div key={idx} className="bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-white/50 shadow-inner">
                            <h4 className="font-display text-lg font-bold text-primary-dark mb-3 flex items-center gap-2 border-b border-primary-dark/10 pb-2">
                              <span className="w-1.5 h-6 bg-primary-dark rounded-full"></span>
                              {title}
                            </h4>
                            <div className="text-sm text-ink-soft font-body space-y-2 whitespace-pre-line">
                              <ReactMarkdown>
                                {content}
                              </ReactMarkdown>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
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
                    {filteredReportsBreakdown
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

      {data && (
        <div className="print-only-report">
          {/* Cover Page */}
          <div className="mb-8 flex flex-col items-center text-center pb-8 border-b border-gray-200">
            <h1 className="text-3xl font-display font-black text-ink uppercase tracking-tight">SIKAP Platform Descriptive Analytics Report</h1>
            <p className="text-sm font-body text-ink-soft mt-2">
              Reporting Preset: <span className="font-bold">{presetFilter === 'custom' ? `${startDate} to ${endDate}` : presetFilter}</span> | 
              Aggregation: <span className="font-bold">{intervalFilter}</span>
            </p>
            <p className="text-xs font-body text-ink-muted mt-1">
              Generated On: {new Date().toLocaleString()}
            </p>
          </div>

          {/* AI Insights & Recommendations */}
          {aiInsights && (
            <div className="bg-white p-6 rounded-2xl border border-gray-200 mb-8 print-chart-container">
              <h2 className="text-base font-display font-bold text-ink mb-4 uppercase tracking-wider">AI Executive Summary & Recommendations</h2>
              <div className="prose prose-sm font-body text-xs text-ink-soft">
                <ReactMarkdown>{aiInsights}</ReactMarkdown>
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

          {/* Distribution & Demand */}
          <div className="grid grid-cols-2 gap-6 mb-8 print-page-break print-chart-container">
            <div className="bg-white p-6 rounded-xl border border-gray-200 flex flex-col">
              <h3 className="text-xs font-display font-bold text-gray-800 mb-4 uppercase tracking-wider">Skill & Category Demand</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={transformedJobsData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E8DFCE" opacity={0.5} />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 9 }} allowDecimals={false} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#8C7B6A', fontSize: 9 }}
                      width={100}
                      tickFormatter={(value) => (value.length > 12 ? `${value.slice(0, 12)}...` : value)}
                    />
                    <Bar dataKey="jobs" name="Total Postings" fill="#3E7648" radius={[0, 4, 4, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 flex flex-col items-center justify-center relative">
              <h3 className="text-xs font-display font-bold text-gray-800 mb-4 w-full uppercase tracking-wider text-left">Skill Profile Distribution</h3>
              <div className="h-48 w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <RechartsPie
                      data={transformedSkillDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {transformedSkillDistribution.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </RechartsPie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[8px] font-body font-bold text-gray-400 uppercase tracking-wider">Total Workers</span>
                  <span className="text-lg font-display font-black text-gray-800">{data?.user_ratio?.workers ?? 0}</span>
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2 text-[9px] font-semibold text-gray-500 w-full">
                {transformedSkillDistribution.map((entry: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span>{entry.name} ({entry.value})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Geographic stacked */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 flex flex-col mb-8 print-chart-container">
            <h3 className="text-xs font-display font-bold text-gray-800 mb-4 uppercase tracking-wider">Geographic Activity</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={transformedGeographicActivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8DFCE" opacity={0.5} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 9 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 9 }} allowDecimals={false} />
                  <Bar dataKey="jobs" name="Job Postings" fill="#87CEEB" stackId="a" />
                  <Bar dataKey="applications" name="Applications" fill="#90EE90" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
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
        </div>
      )}
    </div>
  );
}
