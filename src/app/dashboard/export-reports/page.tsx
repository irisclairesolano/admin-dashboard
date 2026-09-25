'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { adminApi } from '@/lib/api';
import { formatDate } from '@/lib/date';
import StatCard from '@/components/StatCard';
import { exportMultiSectionCSV, formatCSVDate, formatCSVCurrency, formatCSVStatus, formatCSVReputation, calculateNormalizedHourlyWage } from '@/lib/export/csv';

type ReportType = 'users' | 'jobs' | 'demographics' | 'verifications';
type DatePreset = 'all' | 'today' | '7days' | '30days' | 'year' | 'custom';

export default function ExportReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('users');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'worker' | 'employer'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [users, setUsers] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adminName, setAdminName] = useState('Admin');

  // Load Admin name for official signatory
  useEffect(() => {
    try {
      const stored = localStorage.getItem('admin_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u.name) setAdminName(u.name);
      }
    } catch {}
  }, []);

  // Fetch all necessary data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [usersRes, jobsRes, verifRes] = await Promise.all([
        adminApi.getUsers({ all: true, forceRefresh: true }),
        adminApi.getJobs({ all: true, forceRefresh: true }),
        adminApi.getVerifications(true),
      ]);

      setUsers(usersRes.data?.data || usersRes.data || []);
      setJobs(jobsRes.data?.data || jobsRes.data || []);
      setVerifications(verifRes.data?.data || verifRes.data || []);
    } catch (err: any) {
      console.error('Failed to load report data:', err);
      setError(err.message || 'Unable to load report data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Date filtering helper
  const isWithinDateRange = useCallback((dateStr?: string) => {
    if (!dateStr || datePreset === 'all') return true;
    const itemDate = new Date(dateStr).getTime();
    const now = new Date();

    if (datePreset === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      return itemDate >= startOfDay;
    }
    if (datePreset === '7days') {
      const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
      return itemDate >= sevenDaysAgo;
    }
    if (datePreset === '30days') {
      const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
      return itemDate >= thirtyDaysAgo;
    }
    if (datePreset === 'year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();
      return itemDate >= startOfYear;
    }
    if (datePreset === 'custom') {
      if (customStartDate && itemDate < new Date(customStartDate).getTime()) return false;
      if (customEndDate) {
        const endOfSelected = new Date(customEndDate);
        endOfSelected.setHours(23, 59, 59, 999);
        if (itemDate > endOfSelected.getTime()) return false;
      }
      return true;
    }
    return true;
  }, [datePreset, customStartDate, customEndDate]);

  // ── FILTERED DATASETS ────────────────────────────────────────────────────────

  // 1. Users Masterlist
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (!isWithinDateRange(u.created_at)) return false;
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter === 'verified' && u.verification_status !== 'approved') return false;
      if (statusFilter === 'pending' && u.verification_status !== 'pending') return false;
      if (statusFilter === 'rejected' && u.verification_status !== 'rejected') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (u.name || '').toLowerCase().includes(q);
        const matchesEmail = (u.email || '').toLowerCase().includes(q);
        const matchesLoc = (u.barangay || '').toLowerCase().includes(q) || (u.municipality || '').toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesLoc) return false;
      }
      return true;
    });
  }, [users, isWithinDateRange, roleFilter, statusFilter, searchQuery]);

  // 2. Jobs Postings & Placements
  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      if (!isWithinDateRange(j.created_at)) return false;
      if (categoryFilter !== 'all' && (j.category?.name || j.category) !== categoryFilter) return false;
      if (statusFilter === 'archived') return !!j.deleted_at;
      if (statusFilter !== 'all' && j.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (j.title || '').toLowerCase().includes(q);
        const matchesEmployer = (j.employer?.name || '').toLowerCase().includes(q);
        const matchesLoc = (j.barangay || '').toLowerCase().includes(q) || (j.municipality || '').toLowerCase().includes(q);
        const matchesRef = (j.reference_number || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesEmployer && !matchesLoc && !matchesRef) return false;
      }
      return true;
    });
  }, [jobs, isWithinDateRange, categoryFilter, statusFilter, searchQuery]);

  // 3. Barangay Demographics Aggregation
  const barangaySummary = useMemo(() => {
    const map = new Map<string, { barangay: string; municipality: string; workers: number; employers: number; jobs: number }>();

    users.forEach((u) => {
      const b = u.barangay || 'Unspecified';
      const m = u.municipality || 'Sorsogon';
      const key = `${b}-${m}`;
      if (!map.has(key)) {
        map.set(key, { barangay: b, municipality: m, workers: 0, employers: 0, jobs: 0 });
      }
      const entry = map.get(key)!;
      if (u.role === 'employer') entry.employers += 1;
      else entry.workers += 1;
    });

    jobs.forEach((j) => {
      const b = j.barangay || 'Unspecified';
      const m = j.municipality || 'Sorsogon';
      const key = `${b}-${m}`;
      if (!map.has(key)) {
        map.set(key, { barangay: b, municipality: m, workers: 0, employers: 0, jobs: 0 });
      }
      map.get(key)!.jobs += 1;
    });

    let list = Array.from(map.values()).sort((a, b) => (b.workers + b.employers + b.jobs) - (a.workers + a.employers + a.jobs));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((item) => item.barangay.toLowerCase().includes(q) || item.municipality.toLowerCase().includes(q));
    }
    return list;
  }, [users, jobs, searchQuery]);

  // 4. Verifications Audit
  const filteredVerifications = useMemo(() => {
    return verifications.filter((v) => {
      if (!isWithinDateRange(v.created_at || v.updated_at)) return false;
      if (roleFilter !== 'all' && v.role !== roleFilter) return false;
      if (statusFilter !== 'all' && v.verification_status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (v.name || '').toLowerCase().includes(q);
        const matchesEmail = (v.email || '').toLowerCase().includes(q);
        if (!matchesName && !matchesEmail) return false;
      }
      return true;
    });
  }, [verifications, isWithinDateRange, roleFilter, statusFilter, searchQuery]);

  // Extract unique categories for job filter
  const jobCategories = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach((j) => {
      const cat = j.category?.name || j.category;
      if (cat) set.add(cat);
    });
    return Array.from(set);
  }, [jobs]);

  // ── EXPORT ACTIONS ──────────────────────────────────────────────────────────

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const dateStamp = new Date().toISOString().split('T')[0];
    const timestamp = formatCSVDate(new Date().toISOString());

    if (reportType === 'users') {
      const headers = [
        'User ID',
        'Full Name',
        'Role',
        'Email Address',
        'Phone Number',
        'Municipality',
        'Barangay',
        'Verification Status',
        'Reputation Score',
        'Date Registered'
      ];
      const rows = filteredUsers.map((u) => [
        u.id,
        u.name || '',
        u.role || '',
        u.email || '',
        u.phone || 'N/A',
        u.municipality || 'Bulan',
        u.barangay || '',
        formatCSVStatus(u.verification_status),
        formatCSVReputation(u.reputation_score, u.ratings_count ?? u.reviews_received_count),
        formatCSVDate(u.created_at)
      ]);

      exportMultiSectionCSV(
        `SIKAP_USERS_REPORT_${dateStamp}`,
        'SIKAP Registered Users & Demographics Masterlist',
        [
          ['Generated On:', timestamp],
          ['Official Signatory:', adminName],
          ['Report Classification:', 'Official SIKAP User Registry'],
          ['Total Records Included:', String(filteredUsers.length)],
          ['Role Filter:', roleFilter.toUpperCase()],
          ['Date Scope:', datePreset.toUpperCase()]
        ],
        [
          {
            title: 'Users Masterlist',
            headers,
            rows
          }
        ]
      );
    } else if (reportType === 'jobs') {
      const headers = [
        'Job ID',
        'Reference Code',
        'Job Title',
        'Category',
        'Employer Name',
        'Municipality',
        'Barangay',
        'Offered Comp (PHP)',
        'Rate Unit',
        'Duration',
        'Hourly Wage (PHP/hr)',
        'Slots Required',
        'Slots Hired',
        'Status',
        'Date Posted'
      ];
      const rows = filteredJobs.map((j) => [
        j.id,
        j.reference_number || `SKP-JOB-${j.id}`,
        j.title || '',
        j.category?.name || j.category || 'General',
        j.employer?.name || '',
        j.municipality || 'Bulan',
        j.barangay || '',
        formatCSVCurrency(j.compensation),
        j.rate_unit ? String(j.rate_unit).replace(/_/g, ' ') : (j.duration_type ? String(j.duration_type).replace(/_/g, ' ') : 'per day'),
        j.duration ? String(j.duration) : 'N/A',
        formatCSVCurrency(calculateNormalizedHourlyWage(j.compensation, j.rate_unit, j.duration, j.duration_unit, j.duration_type)),
        Number(j.slots) || 1,
        Number(j.filled_slots ?? j.accepted_count) || 0,
        formatCSVStatus(j.deleted_at ? 'archived' : j.status),
        formatCSVDate(j.created_at)
      ]);

      exportMultiSectionCSV(
        `SIKAP_JOBS_REPORT_${dateStamp}`,
        'SIKAP Job Postings & Employment Demand Report',
        [
          ['Generated On:', timestamp],
          ['Official Signatory:', adminName],
          ['Report Classification:', 'Official SIKAP Employment Record'],
          ['Total Records Included:', String(filteredJobs.length)],
          ['Category Filter:', categoryFilter.toUpperCase()],
          ['Status Filter:', statusFilter.toUpperCase()],
          ['Date Scope:', datePreset.toUpperCase()]
        ],
        [
          {
            title: 'Job Postings Directory',
            headers,
            rows
          }
        ]
      );
    } else if (reportType === 'demographics') {
      const headers = ['Barangay', 'Municipality', 'Registered Workers', 'Registered Employers', 'Jobs Posted', 'Total Platform Activity'];
      const rows = barangaySummary.map((b) => [
        b.barangay,
        b.municipality,
        b.workers,
        b.employers,
        b.jobs,
        b.workers + b.employers + b.jobs
      ]);

      exportMultiSectionCSV(
        `SIKAP_DEMOGRAPHICS_REPORT_${dateStamp}`,
        'SIKAP Barangay-Level Coverage & Placement Summary',
        [
          ['Generated On:', timestamp],
          ['Official Signatory:', adminName],
          ['Report Classification:', 'Official SIKAP Demographic Survey'],
          ['Total Barangays Covered:', String(barangaySummary.length)]
        ],
        [
          {
            title: 'Barangay Demographics',
            headers,
            rows
          }
        ]
      );
    } else {
      const headers = [
        'User ID',
        'Full Name',
        'Role',
        'Email Address',
        'Verification Status',
        'Front ID',
        'Back ID',
        'Selfie',
        'Rejection Reason',
        'Submission Date'
      ];
      const rows = filteredVerifications.map((v) => [
        v.id,
        v.name || '',
        v.role || '',
        v.email || '',
        formatCSVStatus(v.verification_status),
        v.document_url ? 'Yes' : 'No',
        v.document_back_url ? 'Yes' : 'No',
        v.selfie_url ? 'Yes' : 'No',
        v.rejection_reason || 'N/A',
        formatCSVDate(v.created_at || v.updated_at)
      ]);

      exportMultiSectionCSV(
        `SIKAP_VERIFICATIONS_REPORT_${dateStamp}`,
        'SIKAP Identity Verification & Compliance Audit Report',
        [
          ['Generated On:', timestamp],
          ['Official Signatory:', adminName],
          ['Report Classification:', 'Official SIKAP Compliance Audit'],
          ['Total Records Included:', String(filteredVerifications.length)],
          ['Verification Filter:', statusFilter.toUpperCase()],
          ['Date Scope:', datePreset.toUpperCase()]
        ],
        [
          {
            title: 'Verification Queue',
            headers,
            rows
          }
        ]
      );
    }
  };

  const getReportTitle = () => {
    switch (reportType) {
      case 'users':
        return 'Registered Users & Demographics Masterlist';
      case 'jobs':
        return 'Job Postings & Employment Demand Report';
      case 'demographics':
        return 'Barangay-Level Coverage & Placement Summary';
      case 'verifications':
        return 'Identity Verification & Compliance Audit Report';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ── SCREEN TITLE & ACTION BAR (HIDDEN IN PRINT) ── */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-display font-bold text-ink">Reports</h1>
          </div>
          <p className="text-ink-soft font-body text-sm mt-1">
            Generate, view, and export platform masterlists and summary reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-3.5 py-2 bg-white border border-ink-faint text-ink hover:bg-paper font-body text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Reload latest records"
          >
            <i className={`lni lni-reload text-xs ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={handleExportCSV}
            disabled={loading}
            className="px-3.5 py-2 bg-slate-700 hover:bg-slate-800 text-white font-body text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Export filtered records of current tab as CSV"
          >
            <i className="lni lni-download text-xs" />
            Export Masterlist (CSV)
          </button>

          <button
            onClick={handlePrint}
            disabled={loading}
            className="px-4 py-2 bg-ink hover:bg-primary-dark text-white font-body text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Print official letterhead report with signatories"
          >
            <i className="lni lni-printer text-xs" />
            Print / Export PDF
          </button>
        </div>
      </div>

      {/* ── REPORT TYPE SELECTOR TABS (HIDDEN IN PRINT) ── */}
      <div className="no-print bg-white/80 backdrop-blur-md rounded-2xl p-2 border border-white/60 shadow-xs flex flex-wrap gap-2">
        <button
          onClick={() => setReportType('users')}
          className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-xl text-xs font-body font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            reportType === 'users'
              ? 'bg-ink text-white shadow-sm'
              : 'text-ink-soft hover:text-ink hover:bg-white/60'
          }`}
        >
          <i className="lni lni-users text-sm" />
          Users Masterlist ({users.length})
        </button>

        <button
          onClick={() => setReportType('jobs')}
          className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-xl text-xs font-body font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            reportType === 'jobs'
              ? 'bg-ink text-white shadow-sm'
              : 'text-ink-soft hover:text-ink hover:bg-white/60'
          }`}
        >
          <i className="lni lni-briefcase text-sm" />
          Jobs & Placements ({jobs.length})
        </button>

        <button
          onClick={() => setReportType('demographics')}
          className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-xl text-xs font-body font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            reportType === 'demographics'
              ? 'bg-ink text-white shadow-sm'
              : 'text-ink-soft hover:text-ink hover:bg-white/60'
          }`}
        >
          <i className="lni lni-map-marker text-sm" />
          Barangay Demographics
        </button>

        <button
          onClick={() => setReportType('verifications')}
          className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-xl text-xs font-body font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            reportType === 'verifications'
              ? 'bg-ink text-white shadow-sm'
              : 'text-ink-soft hover:text-ink hover:bg-white/60'
          }`}
        >
          <i className="lni lni-shield text-sm" />
          Verification Audit ({verifications.length})
        </button>
      </div>

      {/* ── FILTERING CONTROLS BAR (HIDDEN IN PRINT) ── */}
      <div className="no-print bg-white/70 backdrop-blur-md rounded-2xl p-4 border border-white/50 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search box */}
          <div className="flex-1 min-w-[240px] relative">
            <i className="lni lni-search-alt absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted text-xs" />
            <input
              type="text"
              placeholder={`Search in ${getReportTitle()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white/90 border border-ink-faint/60 rounded-xl text-xs font-body text-ink placeholder-ink-muted focus:outline-none focus:border-primary transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
              >
                <i className="lni lni-close text-[10px]" />
              </button>
            )}
          </div>

          {/* Date range preset */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-body font-semibold text-ink-muted">Period:</span>
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value as DatePreset)}
              className="px-3 py-2 bg-white/90 border border-ink-faint/60 rounded-xl text-xs font-body font-semibold text-ink focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="7days">Past 7 Days</option>
              <option value="30days">Past 30 Days</option>
              <option value="year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Contextual filter: Role (for Users & Verifications) */}
          {(reportType === 'users' || reportType === 'verifications') && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-body font-semibold text-ink-muted">Role:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="px-3 py-2 bg-white/90 border border-ink-faint/60 rounded-xl text-xs font-body font-semibold text-ink focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="all">All Roles</option>
                <option value="worker">Workers Only</option>
                <option value="employer">Employers Only</option>
              </select>
            </div>
          )}

          {/* Contextual filter: Category (for Jobs) */}
          {reportType === 'jobs' && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-body font-semibold text-ink-muted">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-white/90 border border-ink-faint/60 rounded-xl text-xs font-body font-semibold text-ink focus:outline-none focus:border-primary cursor-pointer max-w-[150px]"
              >
                <option value="all">All Categories</option>
                {jobCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-body font-semibold text-ink-muted">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white/90 border border-ink-faint/60 rounded-xl text-xs font-body font-semibold text-ink focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="all">All Statuses</option>
              {reportType === 'users' && (
                <>
                  <option value="verified">Approved / Verified</option>
                  <option value="pending">Pending Review</option>
                  <option value="rejected">Rejected</option>
                </>
              )}
              {reportType === 'jobs' && (
                <>
                  <option value="open">Open / Active</option>
                  <option value="completed">Completed</option>
                  <option value="suspended">Suspended</option>
                  <option value="cancelled">Cancelled</option>
                </>
              )}
              {reportType === 'verifications' && (
                <>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* Custom date range picker if selected */}
        {datePreset === 'custom' && (
          <div className="flex items-center gap-3 pt-2 border-t border-ink-faint/30">
            <span className="text-xs font-body font-semibold text-ink">Custom Window:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-3 py-1.5 bg-white border border-ink-faint/60 rounded-lg text-xs font-body text-ink"
            />
            <span className="text-xs font-body text-ink-muted">to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-3 py-1.5 bg-white border border-ink-faint/60 rounded-lg text-xs font-body text-ink"
            />
          </div>
        )}
      </div>

      {/* ── KPI SUMMARY METRICS (SCREEN + PRINT) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {reportType === 'users' && (
          <>
            <StatCard title="Filtered Users" value={filteredUsers.length} iconClass="lni lni-users" />
            <StatCard
              title="Workers"
              value={filteredUsers.filter((u) => u.role === 'worker').length}
              iconClass="lni lni-user"
              bg="from-accent-sky to-accent-skyDeep/40"
              iconColor="text-sky-700"
            />
            <StatCard
              title="Employers"
              value={filteredUsers.filter((u) => u.role === 'employer').length}
              iconClass="lni lni-briefcase"
              bg="from-accent-peach to-accent-peachBright"
              iconColor="text-amber-700"
            />
            <StatCard
              title="Verified Rate"
              value={`${filteredUsers.length ? Math.round((filteredUsers.filter((u) => u.verification_status === 'approved').length / filteredUsers.length) * 100) : 0}%`}
              iconClass="lni lni-checkmark-circle"
              bg="from-accent-mint to-accent-mintDeep/40"
              iconColor="text-emerald-700"
            />
          </>
        )}

        {reportType === 'jobs' && (
          <>
            <StatCard title="Filtered Jobs" value={filteredJobs.length} iconClass="lni lni-briefcase" />
            <StatCard
              title="Open Positions"
              value={filteredJobs.filter((j) => j.status === 'open').length}
              iconClass="lni lni-radio-button"
              bg="from-accent-mint to-accent-mintDeep/40"
              iconColor="text-emerald-700"
            />
            <StatCard
              title="Completed Hires"
              value={filteredJobs.filter((j) => j.status === 'completed').length}
              iconClass="lni lni-checkmark-circle"
              bg="from-accent-sky to-accent-skyDeep/40"
              iconColor="text-sky-700"
            />
            <StatCard
              title="Total Slots"
              value={filteredJobs.reduce((acc, j) => acc + (j.slots || 1), 0)}
              iconClass="lni lni-target"
              bg="from-accent-peach to-accent-peachBright"
              iconColor="text-amber-700"
            />
          </>
        )}

        {reportType === 'demographics' && (
          <>
            <StatCard title="Total Barangays" value={barangaySummary.length} iconClass="lni lni-map" />
            <StatCard
              title="Total Population"
              value={users.length}
              iconClass="lni lni-users"
              bg="from-accent-sky to-accent-skyDeep/40"
              iconColor="text-sky-700"
            />
            <StatCard
              title="Top Location"
              value={barangaySummary[0]?.barangay || 'N/A'}
              iconClass="lni lni-star"
              bg="from-accent-peach to-accent-peachBright"
              iconColor="text-amber-700"
            />
            <StatCard
              title="Total Jobs Posted"
              value={jobs.length}
              iconClass="lni lni-briefcase"
              bg="from-accent-mint to-accent-mintDeep/40"
              iconColor="text-emerald-700"
            />
          </>
        )}

        {reportType === 'verifications' && (
          <>
            <StatCard title="Audited Records" value={filteredVerifications.length} iconClass="lni lni-shield" />
            <StatCard
              title="Approved"
              value={filteredVerifications.filter((v) => v.verification_status === 'approved').length}
              iconClass="lni lni-checkmark-circle"
              bg="from-accent-mint to-accent-mintDeep/40"
              iconColor="text-emerald-700"
            />
            <StatCard
              title="Pending Review"
              value={filteredVerifications.filter((v) => v.verification_status === 'pending').length}
              iconClass="lni lni-timer"
              bg="from-accent-peach to-accent-peachBright"
              iconColor="text-amber-700"
            />
            <StatCard
              title="Rejected"
              value={filteredVerifications.filter((v) => v.verification_status === 'rejected').length}
              iconClass="lni lni-cross-circle"
              bg="from-rose-100 to-rose-200"
              iconColor="text-rose-700"
            />
          </>
        )}
      </div>

      {/* ── PRINT-ONLY OFFICIAL INSTITUTIONAL HEADER ── */}
      <div className="hidden print:block text-center border-b-2 border-black pb-4 mb-6">
        <div className="text-[11px] font-serif uppercase tracking-widest text-gray-700">Republic of the Philippines</div>
        <div className="text-xs font-serif uppercase tracking-wider font-bold text-gray-900">Province of Sorsogon</div>
        <div className="text-base font-serif font-black tracking-wide text-gray-950 mt-1">
          SIKAP: Skills &amp; Inclusive Knowledge for Agricultural and Blue-Collar Placement
        </div>
        <div className="text-sm font-sans font-bold uppercase tracking-wider text-black mt-2 underline">
          {getReportTitle()}
        </div>
        <div className="flex justify-between items-center text-[10px] text-gray-600 font-sans mt-3 px-2">
          <span>Date Generated: {new Date().toLocaleString()}</span>
          <span>Coverage: {datePreset === 'all' ? 'All Time' : datePreset.toUpperCase()}</span>
          <span>Prepared by: {adminName} (System Administrator)</span>
        </div>
      </div>

      {/* ── TABULAR DATA DISPLAY ── */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-white/60 overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-ink-muted font-body text-sm flex flex-col items-center gap-2">
            <i className="lni lni-spinner-solid animate-spin text-2xl text-primary" />
            Generating report data...
          </div>
        ) : error ? (
          <div className="p-12 text-center text-status-error font-body text-sm">
            <i className="lni lni-warning text-xl mb-1 inline-block" />
            <p>{error}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* 1. USERS REPORT TABLE */}
            {reportType === 'users' && (
              <table className="w-full text-left font-body text-xs border-collapse">
                <thead>
                  <tr className="bg-ink/5 border-b border-ink-faint/50 text-ink-soft uppercase text-[10px] font-bold tracking-wider">
                    <th className="py-3.5 px-4">User</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Location (Brgy / Mun)</th>
                    <th className="py-3.5 px-4">Contact</th>
                    <th className="py-3.5 px-4">Verification</th>
                    <th className="py-3.5 px-4">Date Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-faint/30">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-ink-muted">
                        No users match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-paper/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-ink">{u.name || 'Unnamed'}</div>
                          <div className="text-[10px] text-ink-muted">{u.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold capitalize ${
                              u.role === 'employer'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-sky-100 text-sky-800'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {u.barangay ? `${u.barangay}, ` : ''}{u.municipality || 'Sorsogon'}
                        </td>
                        <td className="py-3 px-4">{u.phone || 'N/A'}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              u.verification_status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : u.verification_status === 'rejected'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {u.verification_status || 'unverified'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-ink-muted">{formatDate(u.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* 2. JOBS REPORT TABLE */}
            {reportType === 'jobs' && (
              <table className="w-full text-left font-body text-xs border-collapse">
                <thead>
                  <tr className="bg-ink/5 border-b border-ink-faint/50 text-ink-soft uppercase text-[10px] font-bold tracking-wider">
                    <th className="py-3.5 px-4">Ref &amp; Title</th>
                    <th className="py-3.5 px-4">Employer</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Location</th>
                    <th className="py-3.5 px-4 text-center">Slots (Filled/Tot)</th>
                    <th className="py-3.5 px-4">Budget / Wage</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Date Posted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-faint/30">
                  {filteredJobs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-ink-muted">
                        No job postings match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredJobs.map((j) => (
                      <tr key={j.id} className="hover:bg-paper/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-ink">{j.title}</div>
                          <div className="text-[10px] text-ink-muted font-mono">{j.reference_number || `#${j.id}`}</div>
                        </td>
                        <td className="py-3 px-4 text-ink">{j.employer?.name || 'Unknown'}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold">
                            {j.category?.name || j.category || 'General'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {j.barangay ? `${j.barangay}, ` : ''}{j.municipality || 'Sorsogon'}
                        </td>
                        <td className="py-3 px-4 text-center font-bold">
                          {(j.filled_slots ?? j.accepted_count) || 0} / {j.slots || 1}
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-700">
                          ₱{(Number(j.wage_amount) || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              j.status === 'open'
                                ? 'bg-emerald-100 text-emerald-800'
                                : j.status === 'completed'
                                ? 'bg-sky-100 text-sky-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {j.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-ink-muted">{formatDate(j.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* 3. BARANGAY DEMOGRAPHICS TABLE */}
            {reportType === 'demographics' && (
              <table className="w-full text-left font-body text-xs border-collapse">
                <thead>
                  <tr className="bg-ink/5 border-b border-ink-faint/50 text-ink-soft uppercase text-[10px] font-bold tracking-wider">
                    <th className="py-3.5 px-4">Barangay</th>
                    <th className="py-3.5 px-4">Municipality</th>
                    <th className="py-3.5 px-4 text-center">Registered Workers</th>
                    <th className="py-3.5 px-4 text-center">Registered Employers</th>
                    <th className="py-3.5 px-4 text-center">Jobs Posted</th>
                    <th className="py-3.5 px-4 text-center">Total Platform Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-faint/30">
                  {barangaySummary.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-ink-muted">
                        No barangay records found.
                      </td>
                    </tr>
                  ) : (
                    barangaySummary.map((b, idx) => (
                      <tr key={idx} className="hover:bg-paper/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-ink">{b.barangay}</td>
                        <td className="py-3 px-4 text-ink-soft">{b.municipality}</td>
                        <td className="py-3 px-4 text-center font-bold text-sky-700">{b.workers}</td>
                        <td className="py-3 px-4 text-center font-bold text-amber-700">{b.employers}</td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-700">{b.jobs}</td>
                        <td className="py-3 px-4 text-center font-bold text-ink">
                          {b.workers + b.employers + b.jobs}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* 4. VERIFICATIONS AUDIT TABLE */}
            {reportType === 'verifications' && (
              <table className="w-full text-left font-body text-xs border-collapse">
                <thead>
                  <tr className="bg-ink/5 border-b border-ink-faint/50 text-ink-soft uppercase text-[10px] font-bold tracking-wider">
                    <th className="py-3.5 px-4">Applicant</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Rejection Notes</th>
                    <th className="py-3.5 px-4">Submission Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-faint/30">
                  {filteredVerifications.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-ink-muted">
                        No verification records match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredVerifications.map((v) => (
                      <tr key={v.id} className="hover:bg-paper/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-ink">{v.name}</div>
                          <div className="text-[10px] text-ink-muted">{v.email}</div>
                        </td>
                        <td className="py-3 px-4 capitalize">{v.role}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              v.verification_status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : v.verification_status === 'rejected'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {v.verification_status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-ink-muted italic">
                          {v.rejection_reason || '—'}
                        </td>
                        <td className="py-3 px-4 text-ink-muted">{formatDate(v.created_at || v.updated_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* ── OFFICIAL SIGNATORY BLOCK (PRINT ONLY) ── */}
      <div className="hidden print:block mt-16 pt-8 break-inside-avoid">
        <div className="grid grid-cols-2 gap-16 text-center text-xs font-serif">
          <div>
            <div className="border-b border-black pb-1 mb-1 font-bold">{adminName}</div>
            <div className="text-[10px] uppercase tracking-wider text-gray-700">Prepared by: System Administrator</div>
            <div className="text-[9px] text-gray-500">SIKAP Platform Management</div>
          </div>
          <div>
            <div className="border-b border-black pb-1 mb-1 font-bold">_____________________________________</div>
            <div className="text-[10px] uppercase tracking-wider text-gray-700">Approved &amp; Certified Correct: PESO Officer / Evaluator</div>
            <div className="text-[9px] text-gray-500">Public Employment Service Office</div>
          </div>
        </div>
      </div>
    </div>
  );
}
