'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { adminApi } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import { useRouter } from 'next/navigation';

export default function AnalyticsDashboard() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [presetFilter, setPresetFilter] = useState<'30days' | '6months' | '1year' | 'custom'>('1year');
  const [intervalFilter, setIntervalFilter] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      let from = '';
      let to = '';
      
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;

      if (presetFilter === '30days') {
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
  };

  useEffect(() => {
    fetchAnalytics();
  }, [presetFilter, startDate, endDate, intervalFilter]);

  const handleGenerateInsights = async () => {
    try {
      setAiLoading(true);
      setAiError('');
      
      let from = '';
      let to = '';
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      
      if (presetFilter === '30days') {
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

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "SIKAP ADMIN DASHBOARD - ANALYTICS REPORT\n";
    csvContent += `Generated On: ${new Date().toLocaleString()}\n`;
    csvContent += `Reporting Preset: ${presetFilter}\n\n`;

    // KPIs
    csvContent += "KEY PERFORMANCE INDICATORS\n";
    csvContent += "Metric,Current Value,PoP Change (%)\n";
    csvContent += `New Registrations,${data.kpis?.total_users?.value ?? 0},${data.kpis?.total_users?.change ?? 0}%\n`;
    csvContent += `Jobs Posted,${data.kpis?.active_jobs?.value ?? 0},${data.kpis?.active_jobs?.change ?? 0}%\n`;
    csvContent += `Applications,${data.kpis?.applications?.value ?? 0},${data.kpis?.applications?.change ?? 0}%\n`;
    csvContent += `Reports Filed,${data.kpis?.unresolved_reports?.value ?? 0},${data.kpis?.unresolved_reports?.change ?? 0}%\n\n`;

    // Funnel & Retention
    csvContent += "FUNNEL & RETENTION\n";
    csvContent += `Total Applications,${data.funnel?.total_applications ?? 0}\n`;
    csvContent += `Accepted Applications,${data.funnel?.accepted_applications ?? 0}\n`;
    csvContent += `Completed Jobs,${data.funnel?.completed_jobs ?? 0}\n`;
    csvContent += `Job Fill Rate,${data.fill_rate?.value ?? 0}%\n`;
    csvContent += `Worker Retention Rate,${data.worker_retention?.retention_rate ?? 0}%\n\n`;

    // User Demographics
    csvContent += "USER DEMOGRAPHICS\n";
    csvContent += `Workers count,${data.user_ratio?.workers ?? 0}\n`;
    csvContent += `Employers count,${data.user_ratio?.employers ?? 0}\n`;
    csvContent += `Verified count,${data.user_ratio?.verified_users ?? 0}\n`;
    csvContent += `Unverified count,${data.user_ratio?.unverified_users ?? 0}\n\n`;

    // Compensation
    csvContent += "COMPENSATION ANALYTICS\n";
    csvContent += `Min Compensation,PHP ${data.compensation?.min ?? 0}\n`;
    csvContent += `Avg Compensation,PHP ${data.compensation?.avg ?? 0}\n`;
    csvContent += `Max Compensation,PHP ${data.compensation?.max ?? 0}\n\n`;

    // Reports
    csvContent += "REPORTS MODERATION\n";
    csvContent += `Unresolved Open Reports,${data.reports?.open_reports ?? 0}\n`;
    csvContent += `Avg Resolution Time (Sec),${data.reports?.average_resolution_seconds ?? 0}\n`;
    csvContent += `Most Common Type,${data.reports?.most_common_type ?? 'None'}\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
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

    if (list.length <= 8) {
      return list;
    } else {
      const top = list.slice(0, 7);
      const rest = list.slice(7);
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

  // Skill demand stats
  const skillDemandStats = (() => {
    if (transformedJobsData.length === 0) return { min: 0, max: 0, avg: 0, total: 0 };
    const counts = transformedJobsData.map((j: any) => j.jobs);
    const total = counts.reduce((sum: number, val: number) => sum + val, 0);
    return {
      min: Math.min(...counts),
      max: Math.max(...counts),
      avg: Math.round(total / counts.length),
      total
    };
  })();

  const transformedGeographicActivity = (() => {
    if (!data?.geographic_activity) return [];
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

    const sorted = Object.values(grouped).sort((a, b) => b.jobs - a.jobs);
    if (sorted.length <= 8) {
      return sorted;
    } else {
      const top = sorted.slice(0, 7);
      const rest = sorted.slice(7);
      const others = rest.reduce(
        (acc, val) => {
          acc.jobs += val.jobs;
          acc.applications += val.applications;
          return acc;
        },
        { name: 'Others', jobs: 0, applications: 0 }
      );
      return [...top, others];
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
    return data.skill_distribution.map((item: any) => ({
      name: item.skill_name,
      value: parseInt(item.worker_count),
    })).slice(0, 10);
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

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="mb-8">
          <div className="h-10 w-64 bg-gray-200 rounded-xl mb-3"></div>
          <div className="h-5 w-96 bg-gray-200 rounded-lg"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-2xl"></div>
          ))}
        </div>
        <div className="h-96 bg-gray-200 rounded-3xl mb-8"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="h-80 bg-gray-200 rounded-3xl"></div>
          <div className="h-80 bg-gray-200 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in print:p-0 print:bg-white">
      {/* Dynamic Style Block for PDF Exports */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            font-size: 12px !important;
          }
          header, sidebar, nav, button, select, .no-print, [className*="sidebar"], [className*="Sidebar"] {
            display: none !important;
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
        }
      `}</style>

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 no-print">
        <div>
          <h1 className="text-4xl font-display text-transparent bg-clip-text bg-gradient-to-r from-ink to-primary-dark font-bold">Dashboard Overview</h1>
          <p className="text-ink-soft font-body mt-2 text-lg">Platform analytics and administrative insights.</p>
        </div>
        
        {/* Date Filter & Aggregation Components */}
        <div className="mt-6 md:mt-0 flex flex-wrap items-center gap-3">
          {/* Export Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 bg-white/70 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/50 shadow-sm text-sm font-body font-bold text-ink hover:bg-ink hover:text-white transition-all duration-300"
            >
              <i className="lni lni-download mr-1" />
              CSV
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 bg-white/70 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/50 shadow-sm text-sm font-body font-bold text-ink hover:bg-ink hover:text-white transition-all duration-300"
            >
              <i className="lni lni-printer mr-1" />
              PDF
            </button>
          </div>

          <div className="flex bg-white/70 backdrop-blur-md p-1 rounded-2xl border border-white/50 shadow-sm items-center gap-1">
            <span className="text-xs font-body font-bold text-ink-muted px-2.5 uppercase tracking-wider">Aggregation:</span>
            <select
              aria-label="Aggregation interval"
              value={intervalFilter}
              onChange={(e: any) => setIntervalFilter(e.target.value)}
              className="bg-transparent border-none outline-none font-body text-sm font-semibold text-ink-soft focus:text-ink pr-3 py-1.5 cursor-pointer ring-0 focus:ring-0"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          <div className="flex bg-white/70 backdrop-blur-md p-1 rounded-2xl border border-white/50 shadow-sm">
            <button
              onClick={() => setPresetFilter('30days')}
              className={`px-4 py-1.5 rounded-xl text-sm font-body font-semibold transition-all ${presetFilter === '30days' ? 'bg-ink text-white shadow-sm' : 'text-ink-soft hover:text-ink'}`}
            >
              30 Days
            </button>
            <button
              onClick={() => setPresetFilter('6months')}
              className={`px-4 py-1.5 rounded-xl text-sm font-body font-semibold transition-all ${presetFilter === '6months' ? 'bg-ink text-white shadow-sm' : 'text-ink-soft hover:text-ink'}`}
            >
              6 Months
            </button>
            <button
              onClick={() => setPresetFilter('1year')}
              className={`px-4 py-1.5 rounded-xl text-sm font-body font-semibold transition-all ${presetFilter === '1year' ? 'bg-ink text-white shadow-sm' : 'text-ink-soft hover:text-ink'}`}
            >
              1 Year
            </button>
            <button
              onClick={() => setPresetFilter('custom')}
              className={`px-4 py-1.5 rounded-xl text-sm font-body font-semibold transition-all ${presetFilter === 'custom' ? 'bg-ink text-white shadow-sm' : 'text-ink-soft hover:text-ink'}`}
            >
              Custom
            </button>
          </div>

          {presetFilter === 'custom' && (
            <div className="flex items-center gap-2 bg-white/70 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/50 shadow-sm">
              <input
                aria-label="Start date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-none outline-none font-body text-sm text-ink-soft focus:text-ink"
              />
              <span className="text-ink-muted text-sm font-body font-semibold">to</span>
              <input
                aria-label="End date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border-none outline-none font-body text-sm text-ink-soft focus:text-ink"
              />
            </div>
          )}
        </div>
      </div>

      {/* Printable Report Header */}
      <div className="hidden print:block mb-8">
        <h1 className="text-3xl font-bold font-display text-ink">SIKAP Platform Descriptive Analytics</h1>
        <p className="text-sm font-body text-ink-soft mt-1">Reporting Period: {presetFilter === 'custom' ? `${startDate} to ${endDate}` : presetFilter} | Aggregate: {intervalFilter}</p>
        <hr className="mt-4 border-gray-200" />
      </div>

      {/* KPI Cards section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 print-card-grid">
        {stats.map((stat, i) => (
          <div key={i} onClick={() => router.push(stat.href)} className={`cursor-pointer group relative p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-white/50 hover:-translate-y-1 overflow-hidden ${stat.bg} backdrop-blur-md`}>
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
            
            {/* Percentage Period Comparisons */}
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
      <div className="bg-gradient-to-r from-primary-soft to-accent-mint/30 backdrop-blur-md p-8 rounded-3xl shadow-sm border border-primary-dark/10 mb-8 print-chart-container">
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
            className="mt-4 md:mt-0 px-6 py-2.5 bg-ink text-white rounded-2xl font-body font-bold text-sm hover:bg-primary-dark hover:scale-105 active:scale-95 transition-all shadow-md disabled:opacity-50 flex items-center gap-2 no-print"
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

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print-chart-container">
        {/* User Growth */}
        <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-sm border border-white/50 transition-all hover:shadow-lg">
          <h3 className="font-display text-2xl text-ink mb-6 flex items-center justify-between">
            <span className="font-bold">User Registrations</span>
            <span className="text-xs bg-primary-soft text-primary-dark px-3 py-1 rounded-full font-body font-semibold capitalize">{intervalFilter} Aggregation</span>
          </h3>
          <div className="h-80 w-full font-numeric">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={transformedUserGrowth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8DFCE" opacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 13 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 13 }} />
                <Tooltip 
                  cursor={{ fill: '#FDF8F0' }}
                  contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)' }}
                />
                <Bar dataKey="workers" name="Workers" fill="url(#colorWorkers)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="employers" name="Employers" fill="url(#colorEmployers)" radius={[6, 6, 0, 0]} />
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

        {/* Skill Demand (Horizontal Bar Chart) */}
        <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-sm border border-white/50 transition-all hover:shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display text-2xl text-ink font-bold flex items-center">
              Skill & Category Demand
              <span className="ml-3 text-xs bg-accent-sky text-accent-skyDeep px-3 py-1 rounded-full font-body font-semibold">Active Posts</span>
            </h3>
            {/* Summary Statistics */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-right text-xs font-body no-print">
              <div><span className="text-ink-muted">Min:</span> <strong className="text-ink">{skillDemandStats.min}</strong></div>
              <div><span className="text-ink-muted">Max:</span> <strong className="text-ink">{skillDemandStats.max}</strong></div>
              <div><span className="text-ink-muted">Avg:</span> <strong className="text-ink">{skillDemandStats.avg}</strong></div>
              <div><span className="text-ink-muted">Total:</span> <strong className="text-ink">{skillDemandStats.total}</strong></div>
            </div>
          </div>
          <div className="h-80 w-full font-numeric">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={transformedJobsData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E8DFCE" opacity={0.5} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 13 }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 13 }} width={90} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)' }}
                />
                <Bar dataKey="jobs" name="Total Postings" fill="#3E7648" radius={[0, 6, 6, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Second Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 print-chart-container">
        {/* Application Volume respects global settings */}
        <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-sm border border-white/50 transition-all hover:shadow-lg">
          <h3 className="font-display text-2xl text-ink font-bold mb-6 flex items-center justify-between">
            <span>Application Volume Over Time</span>
            <span className="text-xs bg-accent-peach text-primary-dark px-3 py-1 rounded-full font-body font-semibold capitalize">{presetFilter} Scope</span>
          </h3>
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
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 13 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 13 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)' }}
                />
                <Area type="monotone" dataKey="applications" name="Applications" stroke="#FFB6C1" strokeWidth={3} fillOpacity={1} fill="url(#colorApps)" activeDot={{ r: 6, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="jobs" name="Unique Jobs" stroke="#87CEEB" strokeWidth={3} fillOpacity={1} fill="url(#colorAppJobs)" activeDot={{ r: 6, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Skill Distribution */}
        <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-sm border border-white/50 transition-all hover:shadow-lg">
          <h3 className="font-display text-2xl text-ink font-bold mb-6 flex items-center">
            Skill Profile Distribution
            <span className="ml-3 text-xs bg-accent-peach text-primary-dark px-3 py-1 rounded-full font-body font-semibold">Top 10 Workers</span>
          </h3>
          <div className="h-80 w-full font-numeric">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={transformedSkillDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={105}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {transformedSkillDistribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Third Row: Demographics & Geographic Map stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 print-chart-container">
        {/* User Demographics & Funnel */}
        <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-sm border border-white/50 transition-all hover:shadow-lg">
          <h3 className="font-display text-2xl text-ink font-bold mb-6">Application-to-Hire Funnel</h3>
          
          <div className="space-y-5">
            {funnelSteps.map((step, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-sm font-body font-semibold text-ink-soft">
                  <span>{step.label}</span>
                  <span className="font-bold text-ink">{step.value} <span className="text-xs font-normal text-ink-muted">({step.rate})</span></span>
                </div>
                <div className="h-6 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-200/50">
                  {parseFloat(step.rate) > 0 ? (
                    <div className="h-full bg-primary-dark border-r border-white/50 flex items-center justify-end px-3 transition-all duration-1000" style={{ width: step.rate, backgroundColor: idx === 0 ? '#3E7648' : idx === 1 ? '#87CEEB' : '#90EE90' }}>
                      <span className="text-[10px] font-bold font-numeric text-white">{step.rate}</span>
                    </div>
                  ) : (
                    <div className="h-full w-0 transition-all duration-1000" />
                  )}
                </div>
              </div>
            ))}
          </div>

          <hr className="my-6 border-white/60" />

          {/* User Ratio Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-white/60 p-4 rounded-2xl border border-white/50 shadow-inner">
              <span className="text-[11px] font-body font-semibold text-ink-soft uppercase tracking-wider block">Worker Count</span>
              <strong className="text-xl font-numeric text-ink mt-1 block">{data?.user_ratio?.workers ?? 0}</strong>
            </div>
            <div className="bg-white/60 p-4 rounded-2xl border border-white/50 shadow-inner">
              <span className="text-[11px] font-body font-semibold text-ink-soft uppercase tracking-wider block">Employers</span>
              <strong className="text-xl font-numeric text-ink mt-1 block">{data?.user_ratio?.employers ?? 0}</strong>
            </div>
            <div className="bg-white/60 p-4 rounded-2xl border border-white/50 shadow-inner">
              <span className="text-[11px] font-body font-semibold text-ink-soft uppercase tracking-wider block">Verified</span>
              <strong className="text-xl font-numeric text-status-success mt-1 block">{data?.user_ratio?.verified_users ?? 0}</strong>
            </div>
            <div className="bg-white/60 p-4 rounded-2xl border border-white/50 shadow-inner">
              <span className="text-[11px] font-body font-semibold text-ink-soft uppercase tracking-wider block">Unverified</span>
              <strong className="text-xl font-numeric text-status-error mt-1 block">{data?.user_ratio?.unverified_users ?? 0}</strong>
            </div>
          </div>
        </div>

        {/* Geographic Activity */}
        <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-sm border border-white/50 transition-all hover:shadow-lg">
          <h3 className="font-display text-2xl text-ink font-bold mb-6">Geographic Postings & Activity</h3>
          <div className="h-80 w-full font-numeric">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={transformedGeographicActivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8DFCE" opacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 13 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 13 }} />
                <Tooltip 
                  cursor={{ fill: '#FDF8F0' }}
                  contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)' }}
                />
                <Bar dataKey="jobs" name="Job Postings" fill="#87CEEB" radius={[6, 6, 0, 0]} />
                <Bar dataKey="applications" name="Applications" fill="#90EE90" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Fourth Row: Ratings, Turnaround, Compensation & Reports breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 print-chart-container">
        {/* Verification Performance & Worker Retention */}
        <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-sm border border-white/50 transition-all hover:shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-2xl text-ink font-bold">Verification & Retention</h3>
              {data?.verification?.delayed_verifications > 0 && (
                <span className="text-xs bg-status-error/10 text-status-error px-3 py-1 rounded-full font-body font-semibold animate-pulse border border-status-error/20">
                  {data.verification.delayed_verifications} Delayed &gt;48h
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white/60 p-5 rounded-2xl border border-white/50 shadow-inner text-center">
                <span className="text-xs font-body font-semibold text-ink-soft uppercase tracking-wider block">Avg Turnaround Time</span>
                <strong className="text-2xl font-numeric text-ink mt-1.5 block">
                  {data?.verification?.average_turnaround_seconds > 0 
                    ? `${(data.verification.average_turnaround_seconds / 3600).toFixed(1)} hrs` 
                    : 'N/A'}
                </strong>
                <span className="text-[10px] font-body text-ink-muted mt-1 block">From ID Upload to Admin review</span>
              </div>
              <div className="bg-white/60 p-5 rounded-2xl border border-white/50 shadow-inner text-center">
                <span className="text-xs font-body font-semibold text-ink-soft uppercase tracking-wider block">Job Fill Rate</span>
                <strong className="text-2xl font-numeric text-primary-dark mt-1.5 block">
                  {data?.fill_rate?.value ?? 0}%
                </strong>
                <span className={`text-[10px] font-body font-bold mt-1 block ${data?.fill_rate?.change >= 0 ? 'text-status-success' : 'text-status-error'}`}>
                  {data?.fill_rate?.change >= 0 ? '↑' : '↓'} {Math.abs(data?.fill_rate?.change ?? 0)}% change PoP
                </span>
              </div>
            </div>
          </div>

          <div>
            <hr className="my-5 border-white/60" />
            <h4 className="font-display text-lg font-bold text-ink mb-4">Worker Retention Metrics</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <span className="text-xs font-body text-ink-soft block">Active Applicants</span>
                <strong className="text-xl font-numeric text-ink mt-1 block">{data?.worker_retention?.total_applicants ?? 0}</strong>
              </div>
              <div>
                <span className="text-xs font-body text-ink-soft block">Returning Users</span>
                <strong className="text-xl font-numeric text-ink mt-1 block">{data?.worker_retention?.returning_applicants ?? 0}</strong>
              </div>
              <div>
                <span className="text-xs font-body text-ink-soft block">Retention Rate</span>
                <strong className="text-xl font-numeric text-primary-dark mt-1 block">{data?.worker_retention?.retention_rate ?? 0}%</strong>
              </div>
            </div>
            <p className="text-[10px] text-ink-muted font-body mt-3 text-center">Percentage of worker profiles returning to apply for more than one job.</p>
          </div>
        </div>

        {/* Two-Way Rating System distribution */}
        <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-sm border border-white/50 transition-all hover:shadow-lg">
          <h3 className="font-display text-2xl text-ink font-bold mb-5">Two-Way Star Ratings</h3>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white/60 p-4 rounded-2xl border border-white/50 shadow-inner flex items-center justify-between">
              <div>
                <span className="text-[11px] font-body font-semibold text-ink-soft uppercase tracking-wider">Worker Average</span>
                <strong className="text-2xl font-numeric text-ink block mt-1">{data?.ratings?.average_worker_rating ?? 'N/A'}</strong>
              </div>
              <div className="text-3xl text-yellow-400">★</div>
            </div>
            <div className="bg-white/60 p-4 rounded-2xl border border-white/50 shadow-inner flex items-center justify-between">
              <div>
                <span className="text-[11px] font-body font-semibold text-ink-soft uppercase tracking-wider">Employer Average</span>
                <strong className="text-2xl font-numeric text-ink block mt-1">{data?.ratings?.average_employer_rating ?? 'N/A'}</strong>
              </div>
              <div className="text-3xl text-yellow-400">★</div>
            </div>
          </div>

          <hr className="my-5 border-white/60" />
          <h4 className="font-display text-lg font-bold text-ink mb-4">Rating Star Distribution</h4>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((stars) => {
              const matches = data?.ratings?.distribution?.find((d: any) => Math.round(d.rating) === stars);
              const count = matches ? matches.count : 0;
              const totalReviews = data?.ratings?.distribution?.reduce((acc: number, d: any) => acc + d.count, 0) || 1;
              const barWidth = `${Math.round((count / totalReviews) * 100)}%`;

              return (
                <div key={stars} className="flex items-center gap-3 text-xs font-body">
                  <span className="w-10 text-right text-ink font-bold font-numeric">{stars} Stars</span>
                  <div className="h-3 flex-1 bg-gray-100 rounded-full overflow-hidden border border-gray-200/50">
                    <div className="h-full bg-yellow-400 rounded-full transition-all duration-1000" style={{ width: barWidth }}></div>
                  </div>
                  <span className="w-8 text-ink-muted text-right font-numeric">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Compensation & Reports Breakdown section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 mb-8 print-chart-container">
        {/* Compensation Analytics */}
        <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-sm border border-white/50 transition-all hover:shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="font-display text-2xl text-ink font-bold mb-5">Compensation & Wage Analytics</h3>
            <div className="grid grid-cols-3 gap-4 text-center mb-6">
              <div className="bg-white/60 p-4 rounded-2xl border border-white/50 shadow-inner">
                <span className="text-xs font-body text-ink-soft block">Min Wage</span>
                <strong className="text-lg font-numeric text-ink mt-1 block">PHP {data?.compensation?.min ?? 0}</strong>
              </div>
              <div className="bg-white/60 p-4 rounded-2xl border border-white/50 shadow-inner">
                <span className="text-xs font-body text-ink-soft block">Avg Wage</span>
                <strong className="text-lg font-numeric text-primary-dark mt-1 block">PHP {data?.compensation?.avg ?? 0}</strong>
              </div>
              <div className="bg-white/60 p-4 rounded-2xl border border-white/50 shadow-inner">
                <span className="text-xs font-body text-ink-soft block">Max Wage</span>
                <strong className="text-lg font-numeric text-ink mt-1 block">PHP {data?.compensation?.max ?? 0}</strong>
              </div>
            </div>

            <h4 className="font-display text-md font-bold text-ink mb-3">Average Wage by Job Category</h4>
            <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-2xl bg-white/50 p-2 shadow-inner">
              <table className="w-full text-xs font-body text-left">
                <thead>
                  <tr className="border-b border-gray-200/60 text-ink-muted uppercase text-[10px]">
                    <th className="py-2 px-3 font-semibold">Category</th>
                    <th className="py-2 px-3 text-right font-semibold">Average Compensation</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.compensation?.categories?.length > 0 ? (
                    data.compensation.categories.map((c: any, idx: number) => (
                      <tr key={idx} className="border-b border-gray-100/50 hover:bg-white/30 last:border-none">
                        <td className="py-2.5 px-3 text-ink font-semibold">{c.category}</td>
                        <td className="py-2.5 px-3 text-right font-numeric text-ink-soft font-bold">PHP {parseFloat(c.avg_comp).toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} className="py-4 text-center text-ink-muted">No wages data recorded in this period.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Reports Analytics */}
        <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-sm border border-white/50 transition-all hover:shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-2xl text-ink font-bold">Reports & Moderation Insights</h3>
              {data?.reports?.open_reports > 0 && (
                <span className="text-xs bg-status-error/10 text-status-error px-3 py-1 rounded-full font-body font-semibold border border-status-error/20">
                  {data.reports.open_reports} Open
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white/60 p-4 rounded-2xl border border-white/50 shadow-inner text-center">
                <span className="text-xs font-body text-ink-soft uppercase tracking-wider block">Most Common Reason</span>
                <strong className="text-md font-display text-ink mt-2 block truncate">
                  {data?.reports?.most_common_type || 'None'}
                </strong>
              </div>
              <div className="bg-white/60 p-4 rounded-2xl border border-white/50 shadow-inner text-center">
                <span className="text-xs font-body text-ink-soft uppercase tracking-wider block">Avg Resolution Time</span>
                <strong className="text-md font-numeric text-ink mt-2 block">
                  {data?.reports?.average_resolution_seconds > 0 
                    ? `${(data.reports.average_resolution_seconds / 3600).toFixed(1)} hrs` 
                    : 'N/A'}
                </strong>
              </div>
            </div>

            <h4 className="font-display text-md font-bold text-ink mb-3">Report Category Breakdown</h4>
            <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-2xl bg-white/50 p-2 shadow-inner">
              <table className="w-full text-xs font-body text-left">
                <thead>
                  <tr className="border-b border-gray-200/60 text-ink-muted uppercase text-[10px]">
                    <th className="py-2 px-3 font-semibold">Violation Type</th>
                    <th className="py-2 px-3 text-right font-semibold">Total Reports</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.reports?.breakdown?.length > 0 ? (
                    data.reports.breakdown.map((r: any, idx: number) => (
                      <tr key={idx} className="border-b border-gray-100/50 hover:bg-white/30 last:border-none">
                        <td className="py-2.5 px-3 text-ink font-semibold capitalize">{r.type}</td>
                        <td className="py-2.5 px-3 text-right font-numeric text-ink-soft font-bold">{r.count}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} className="py-4 text-center text-ink-muted">No reports filed in this period.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
