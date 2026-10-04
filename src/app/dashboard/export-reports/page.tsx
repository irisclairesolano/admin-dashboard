'use client';

import React, { useState, useEffect, useMemo, useCallback, useDeferredValue, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { authStorage } from '@/lib/authStorage';
import { formatDate } from '@/lib/date';
import StatCard from '@/components/StatCard';
import { exportMultiSectionCSV, formatCSVDate, formatCSVCurrency, formatCSVStatus, formatCSVReputation, calculateNormalizedHourlyWage } from '@/lib/export/csv';
import { useToast } from '@/context/ToastContext';

type ReportType = 'users' | 'jobs' | 'demographics' | 'verifications' | 'moderation';
type DatePreset = 'all' | 'today' | '7days' | '30days' | 'year' | 'custom';

function ReportSkeletonTable({ columns = 6 }: { columns?: number }) {
  return (
    <div className="p-4 space-y-3 animate-pulse">
      <div className="h-9 bg-slate-100 rounded-lg w-full mb-3" />
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-3 border-b border-slate-100">
          {[...Array(columns)].map((_, j) => (
            <div
              key={j}
              className="h-4 bg-slate-200/70 rounded"
              style={{ width: `${j === 0 ? 30 : j === 1 ? 20 : 15}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function ExportReportsContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [reportType, setReportType] = useState<ReportType>(() => (searchParams.get('tab') as ReportType) || 'users');
  const [datePreset, setDatePreset] = useState<DatePreset>(() => (searchParams.get('preset') as DatePreset) || 'all');
  const [customStartDate, setCustomStartDate] = useState(() => searchParams.get('start') || '');
  const [customEndDate, setCustomEndDate] = useState(() => searchParams.get('end') || '');
  const [roleFilter, setRoleFilter] = useState<'all' | 'worker' | 'employer'>(() => (searchParams.get('role') as any) || 'all');
  const [categoryFilter, setCategoryFilter] = useState(() => searchParams.get('category') || 'all');
  const [municipalityFilter, setMunicipalityFilter] = useState(() => searchParams.get('municipality') || 'all');
  const [barangayFilter, setBarangayFilter] = useState(() => searchParams.get('barangay') || 'all');
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || 'all');
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '');
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    const handleBeforePrint = () => setIsPrinting(true);
    const handleAfterPrint = () => setIsPrinting(false);
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  // Sync tab & filter state into URL parameters (U3)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    if (reportType !== 'users') params.set('tab', reportType);
    if (datePreset !== 'all') params.set('preset', datePreset);
    if (customStartDate) params.set('start', customStartDate);
    if (customEndDate) params.set('end', customEndDate);
    if (roleFilter !== 'all') params.set('role', roleFilter);
    if (categoryFilter !== 'all') params.set('category', categoryFilter);
    if (municipalityFilter !== 'all') params.set('municipality', municipalityFilter);
    if (barangayFilter !== 'all') params.set('barangay', barangayFilter);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (searchQuery.trim()) params.set('q', searchQuery.trim());

    const qs = params.toString();
    const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', newUrl);
  }, [reportType, datePreset, customStartDate, customEndDate, roleFilter, categoryFilter, municipalityFilter, barangayFilter, statusFilter, searchQuery]);

  // Reset page number on filter changes (P3)
  useEffect(() => {
    setCurrentPage(1);
  }, [reportType, datePreset, customStartDate, customEndDate, roleFilter, categoryFilter, municipalityFilter, barangayFilter, statusFilter, deferredSearchQuery]);

  const [users, setUsers] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingVerifs, setLoadingVerifs] = useState(true);
  const [loadingReports, setLoadingReports] = useState(true);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [error, setError] = useState('');
  const [exportError, setExportError] = useState('');
  const [adminName, setAdminName] = useState('Admin');

  // Load Admin name for official signatory
  useEffect(() => {
    try {
      const u = authStorage.getUser<{ name?: string }>();
      if (u?.name) setAdminName(u.name);
    } catch {}
  }, []);

  // Fetch all necessary data with independent progress (U4)
  const fetchData = useCallback(async (isManualRefresh: boolean = false) => {
    setError('');
    setLoadingUsers(true);
    setLoadingJobs(true);
    setLoadingVerifs(true);
    setLoadingReports(true);

    const loadUsers = adminApi.getUsers({ all: true, forceRefresh: isManualRefresh })
      .then((res) => {
        const list = res.data?.data || res.data || [];
        setUsers(list);
        setVerifications((prev) => (prev.length > 0 ? prev : list.filter((u: any) => u.role !== 'admin')));
      })
      .catch((err) => {
        console.error('Failed to load users:', err);
        setError(err.message || 'Unable to load user records.');
      })
      .finally(() => setLoadingUsers(false));

    const loadJobs = adminApi.getJobs({ all: true, forceRefresh: isManualRefresh })
      .then((res) => setJobs(res.data?.data || res.data || []))
      .catch((err) => console.error('Failed to load jobs:', err))
      .finally(() => setLoadingJobs(false));

    const loadVerifs = adminApi.getVerifications({ all: true, status: 'all', forceRefresh: isManualRefresh })
      .then((res) => {
        const list = res.data?.data || res.data || [];
        if (list.length > 0) setVerifications(list);
      })
      .catch((err) => console.error('Failed to load verifications:', err))
      .finally(() => setLoadingVerifs(false));

    const loadReports = adminApi.getReports('all', 1, '', true, isManualRefresh)
      .then((res) => setReports(res.data?.data || res.data || []))
      .catch(() => setReports([]))
      .finally(() => setLoadingReports(false));

    await Promise.allSettled([loadUsers, loadJobs, loadVerifs, loadReports]);
  }, []);

  useEffect(() => {
    fetchData(false);
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

      if (deferredSearchQuery.trim()) {
        const q = deferredSearchQuery.toLowerCase();
        const matchesName = (u.name || '').toLowerCase().includes(q);
        const matchesEmail = (u.email || '').toLowerCase().includes(q);
        const matchesLoc = (u.barangay || '').toLowerCase().includes(q) || (u.municipality || '').toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesLoc) return false;
      }
      return true;
    });
  }, [users, isWithinDateRange, roleFilter, statusFilter, deferredSearchQuery]);

  // 2. Jobs Postings & Placements
  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      if (!isWithinDateRange(j.created_at)) return false;
      if (categoryFilter !== 'all' && (j.category?.name || j.category) !== categoryFilter) return false;
      if (statusFilter === 'archived') return !!j.deleted_at;
      if (statusFilter !== 'all' && j.status !== statusFilter) return false;

      if (deferredSearchQuery.trim()) {
        const q = deferredSearchQuery.toLowerCase();
        const matchesTitle = (j.title || '').toLowerCase().includes(q);
        const matchesEmployer = (j.employer?.name || '').toLowerCase().includes(q);
        const matchesLoc = (j.barangay || '').toLowerCase().includes(q) || (j.municipality || '').toLowerCase().includes(q);
        const matchesRef = (j.reference_number || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesEmployer && !matchesLoc && !matchesRef) return false;
      }
      return true;
    });
  }, [jobs, isWithinDateRange, categoryFilter, statusFilter, deferredSearchQuery]);

  // Extract unique municipalities for demographic & location filters
  const uniqueMunicipalities = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => {
      if (u.municipality) set.add(u.municipality);
    });
    jobs.forEach((j) => {
      if (j.municipality) set.add(j.municipality);
    });
    if (set.size === 0) {
      set.add('Bulan');
    }
    return Array.from(set).sort();
  }, [users, jobs]);

  // Extract available barangays (cascading from selected municipality if filtered)
  const availableBarangays = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => {
      if (municipalityFilter === 'all' || u.municipality === municipalityFilter) {
        if (u.barangay) set.add(u.barangay);
      }
    });
    jobs.forEach((j) => {
      if (municipalityFilter === 'all' || j.municipality === municipalityFilter) {
        if (j.barangay) set.add(j.barangay);
      }
    });
    return Array.from(set).sort();
  }, [users, jobs, municipalityFilter]);

  // 3. Municipal & Barangay Demographics Aggregation
  const municipalSummary = useMemo(() => {
    const map = new Map<string, { municipality: string; barangay: string; workers: number; employers: number; jobs: number }>();

    users.forEach((u) => {
      if (!isWithinDateRange(u.created_at)) return;
      const m = u.municipality || 'Bulan';
      const b = u.barangay || 'Unspecified';
      if (municipalityFilter !== 'all' && m !== municipalityFilter) return;
      if (barangayFilter !== 'all' && b !== barangayFilter) return;

      const key = `${m}-${b}`;
      if (!map.has(key)) {
        map.set(key, { municipality: m, barangay: b, workers: 0, employers: 0, jobs: 0 });
      }
      const entry = map.get(key)!;
      if (u.role === 'employer') entry.employers += 1;
      else entry.workers += 1;
    });

    jobs.forEach((j) => {
      if (!isWithinDateRange(j.created_at)) return;
      const m = j.municipality || 'Bulan';
      const b = j.barangay || 'Unspecified';
      if (municipalityFilter !== 'all' && m !== municipalityFilter) return;
      if (barangayFilter !== 'all' && b !== barangayFilter) return;

      const key = `${m}-${b}`;
      if (!map.has(key)) {
        map.set(key, { municipality: m, barangay: b, workers: 0, employers: 0, jobs: 0 });
      }
      map.get(key)!.jobs += 1;
    });

    let list = Array.from(map.values()).sort((a, b) => {
      if (a.municipality !== b.municipality) {
        return a.municipality.localeCompare(b.municipality);
      }
      return (b.workers + b.employers + b.jobs) - (a.workers + a.employers + a.jobs);
    });

    if (deferredSearchQuery.trim()) {
      const q = deferredSearchQuery.toLowerCase();
      list = list.filter((item) => item.barangay.toLowerCase().includes(q) || item.municipality.toLowerCase().includes(q));
    }
    return list;
  }, [users, jobs, isWithinDateRange, municipalityFilter, barangayFilter, deferredSearchQuery]);

  // Grouped Municipal Overview for Executive Demographics & Multi-section Export
  const municipalOverview = useMemo(() => {
    const map = new Map<string, {
      municipality: string;
      barangaysCount: number;
      workers: number;
      employers: number;
      jobs: number;
      totalImpact: number;
    }>();

    municipalSummary.forEach((row) => {
      if (!map.has(row.municipality)) {
        map.set(row.municipality, {
          municipality: row.municipality,
          barangaysCount: 0,
          workers: 0,
          employers: 0,
          jobs: 0,
          totalImpact: 0,
        });
      }
      const entry = map.get(row.municipality)!;
      entry.barangaysCount += 1;
      entry.workers += row.workers;
      entry.employers += row.employers;
      entry.jobs += row.jobs;
      entry.totalImpact += row.workers + row.employers + row.jobs;
    });

    return Array.from(map.values()).sort((a, b) => b.totalImpact - a.totalImpact);
  }, [municipalSummary]);

  // 4. Verifications Audit
  const filteredVerifications = useMemo(() => {
    const sourceList = verifications && verifications.length > 0 ? verifications : users.filter((u) => u.role !== 'admin');
    return sourceList.filter((v) => {
      if (!isWithinDateRange(v.created_at || v.updated_at)) return false;
      if (roleFilter !== 'all' && v.role !== roleFilter) return false;
      
      const vStatus = (v.verification_status || (v.registration_status === 'approved' ? 'approved' : 'pending')).toLowerCase();
      if (statusFilter !== 'all') {
        if (statusFilter === 'approved' || statusFilter === 'verified') {
          if (vStatus !== 'approved') return false;
        } else if (statusFilter === 'rejected') {
          if (vStatus !== 'rejected') return false;
        } else if (statusFilter === 'pending') {
          if (vStatus !== 'pending' && vStatus !== 'pending_review' && vStatus !== 'pending_id_upload') return false;
        }
      }

      if (deferredSearchQuery.trim()) {
        const q = deferredSearchQuery.toLowerCase();
        const matchesName = (v.name || '').toLowerCase().includes(q);
        const matchesEmail = (v.email || '').toLowerCase().includes(q);
        const matchesLoc = (v.barangay || '').toLowerCase().includes(q) || (v.municipality || '').toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesLoc) return false;
      }
      return true;
    });
  }, [verifications, users, isWithinDateRange, roleFilter, statusFilter, deferredSearchQuery]);

  // 5. Moderation Reports
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (!isWithinDateRange(r.created_at || r.updated_at)) return false;
      if (statusFilter !== 'all') {
        const s = (r.status || '').toLowerCase();
        if (statusFilter === 'open' || statusFilter === 'pending') {
          if (s !== 'open' && s !== 'pending') return false;
        } else if (statusFilter === 'resolved' && s !== 'resolved') {
          return false;
        } else if (statusFilter === 'dismissed' && s !== 'dismissed') {
          return false;
        }
      }
      if (deferredSearchQuery.trim()) {
        const q = deferredSearchQuery.toLowerCase();
        const matchesType = (r.type || '').toLowerCase().includes(q);
        const matchesReporter = (r.reporter?.name || '').toLowerCase().includes(q);
        const matchesDesc = (r.description || '').toLowerCase().includes(q);
        if (!matchesType && !matchesReporter && !matchesDesc) return false;
      }
      return true;
    });
  }, [reports, isWithinDateRange, statusFilter, deferredSearchQuery]);

  // Extract unique categories for job filter
  const jobCategories = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach((j) => {
      const cat = j.category?.name || j.category;
      if (cat) set.add(cat);
    });
    return Array.from(set);
  }, [jobs]);

  const isLoadingActiveTab = useMemo(() => {
    switch (reportType) {
      case 'users': return loadingUsers;
      case 'jobs': return loadingJobs;
      case 'demographics': return loadingUsers || loadingJobs;
      case 'verifications': return loadingVerifs || loadingUsers;
      case 'moderation': return loadingReports;
      default: return false;
    }
  }, [reportType, loadingUsers, loadingJobs, loadingVerifs, loadingReports]);

  const isAnyLoading = loadingUsers || loadingJobs || loadingVerifs || loadingReports;

  // Pagination calculations (P3)
  const paginatedUsers = useMemo(() => {
    if (isPrinting) return filteredUsers;
    return filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredUsers, currentPage, isPrinting, pageSize]);

  const paginatedJobs = useMemo(() => {
    if (isPrinting) return filteredJobs;
    return filteredJobs.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredJobs, currentPage, isPrinting, pageSize]);

  const paginatedDemographics = useMemo(() => {
    if (isPrinting) return municipalSummary;
    return municipalSummary.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [municipalSummary, currentPage, isPrinting, pageSize]);

  const paginatedVerifications = useMemo(() => {
    if (isPrinting) return filteredVerifications;
    return filteredVerifications.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredVerifications, currentPage, isPrinting, pageSize]);

  const paginatedReports = useMemo(() => {
    if (isPrinting) return filteredReports;
    return filteredReports.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredReports, currentPage, isPrinting, pageSize]);

  const currentTotalFiltered = useMemo(() => {
    switch (reportType) {
      case 'users': return filteredUsers.length;
      case 'jobs': return filteredJobs.length;
      case 'demographics': return municipalSummary.length;
      case 'verifications': return filteredVerifications.length;
      case 'moderation': return filteredReports.length;
      default: return 0;
    }
  }, [reportType, filteredUsers.length, filteredJobs.length, municipalSummary.length, filteredVerifications.length, filteredReports.length]);

  const totalPages = Math.max(1, Math.ceil(currentTotalFiltered / pageSize));
  const startRecord = currentTotalFiltered === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, currentTotalFiltered);

  const handleClearAllFilters = () => {
    setDatePreset('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setRoleFilter('all');
    setCategoryFilter('all');
    setMunicipalityFilter('all');
    setBarangayFilter('all');
    setStatusFilter('all');
    setSearchQuery('');
  };

  const activeFilters = useMemo(() => {
    const list: { id: string; label: string; onRemove: () => void }[] = [];
    if (datePreset !== 'all') {
      const label = datePreset === 'custom'
        ? `Custom: ${customStartDate || '...'} to ${customEndDate || '...'}`
        : `Preset: ${datePreset}`;
      list.push({
        id: 'date',
        label,
        onRemove: () => { setDatePreset('all'); setCustomStartDate(''); setCustomEndDate(''); }
      });
    }
    if (searchQuery.trim()) {
      list.push({
        id: 'query',
        label: `Search: "${searchQuery.trim()}"`,
        onRemove: () => setSearchQuery('')
      });
    }
    if (statusFilter !== 'all') {
      list.push({
        id: 'status',
        label: `Status: ${statusFilter}`,
        onRemove: () => setStatusFilter('all')
      });
    }
    if ((reportType === 'users' || reportType === 'verifications') && roleFilter !== 'all') {
      list.push({
        id: 'role',
        label: `Role: ${roleFilter}`,
        onRemove: () => setRoleFilter('all')
      });
    }
    if (reportType === 'jobs' && categoryFilter !== 'all') {
      list.push({
        id: 'category',
        label: `Category: ${categoryFilter}`,
        onRemove: () => setCategoryFilter('all')
      });
    }
    if (reportType === 'demographics' && municipalityFilter !== 'all') {
      list.push({
        id: 'municipality',
        label: `Municipality: ${municipalityFilter}`,
        onRemove: () => { setMunicipalityFilter('all'); setBarangayFilter('all'); }
      });
    }
    if (reportType === 'demographics' && barangayFilter !== 'all') {
      list.push({
        id: 'barangay',
        label: `Barangay: ${barangayFilter}`,
        onRemove: () => setBarangayFilter('all')
      });
    }
    return list;
  }, [datePreset, customStartDate, customEndDate, searchQuery, statusFilter, reportType, roleFilter, categoryFilter, municipalityFilter, barangayFilter]);

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
        'SIKAP Registered Users & Demographics Summary',
        [
          ['Generated On:', timestamp],
          ['Generated By:', adminName],
          ['Report Type:', 'User Registry Summary'],
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
        j.employer?.name || 'Deleted Account',
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
        'SIKAP Job Postings & Employment Summary',
        [
          ['Generated On:', timestamp],
          ['Generated By:', adminName],
          ['Report Type:', 'Job Postings Directory'],
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
      const totalPlatformActivity = municipalSummary.reduce((acc, b) => acc + b.workers + b.employers + b.jobs, 0);

      // Section 1: Executive Municipal Summary
      const municipalHeaders = [
        'Municipality',
        'Active Barangays Count',
        'Registered Workers',
        'Registered Employers',
        'Total Registered Users',
        'Jobs Posted',
        'Total Platform Activity',
        'Activity Share (%)'
      ];
      const municipalRows = municipalOverview.map((m) => [
        m.municipality,
        m.barangaysCount,
        m.workers,
        m.employers,
        m.workers + m.employers,
        m.jobs,
        m.totalImpact,
        totalPlatformActivity > 0 ? `${((m.totalImpact / totalPlatformActivity) * 100).toFixed(1)}%` : '0.0%'
      ]);

      // Grand Total Row
      municipalRows.push([
        'GRAND TOTAL (ALL MUNICIPALITIES)',
        municipalSummary.length,
        municipalOverview.reduce((acc, m) => acc + m.workers, 0),
        municipalOverview.reduce((acc, m) => acc + m.employers, 0),
        municipalOverview.reduce((acc, m) => acc + m.workers + m.employers, 0),
        municipalOverview.reduce((acc, m) => acc + m.jobs, 0),
        totalPlatformActivity,
        '100.0%'
      ]);

      // Section 2: Detailed Barangay Demographics Breakdown
      const barangayHeaders = [
        'Municipality',
        'Barangay',
        'Registered Workers',
        'Registered Employers',
        'Total Users',
        'Jobs Posted',
        'Total Platform Activity',
        'Municipal Activity Share (%)'
      ];
      const barangayRows = municipalSummary.map((b) => {
        const munTotal = municipalOverview.find((m) => m.municipality === b.municipality)?.totalImpact || 1;
        const bTotal = b.workers + b.employers + b.jobs;
        return [
          b.municipality,
          b.barangay,
          b.workers,
          b.employers,
          b.workers + b.employers,
          b.jobs,
          bTotal,
          munTotal > 0 ? `${((bTotal / munTotal) * 100).toFixed(1)}%` : '0.0%'
        ];
      });

      exportMultiSectionCSV(
        `SIKAP_MUNICIPAL_DEMOGRAPHICS_REPORT_${dateStamp}`,
        'SIKAP Municipal & Barangay Demographics Master Summary',
        [
          ['Generated On:', timestamp],
          ['Generated By:', adminName],
          ['Report Type:', 'Municipal & Barangay Demographics Analysis'],
          ['Municipality Filter:', municipalityFilter.toUpperCase()],
          ['Barangay Filter:', barangayFilter.toUpperCase()],
          ['Date Scope:', datePreset.toUpperCase()],
          ['Total Municipalities Covered:', String(municipalOverview.length)],
          ['Total Barangays Covered:', String(municipalSummary.length)],
          ['Total Registered Platform Population:', String(municipalSummary.reduce((acc, m) => acc + m.workers + m.employers, 0))],
          ['Total Jobs Posted in Scope:', String(municipalSummary.reduce((acc, m) => acc + m.jobs, 0))]
        ],
        [
          {
            title: 'Executive Municipal Coverage Summary',
            headers: municipalHeaders,
            rows: municipalRows
          },
          {
            title: 'Barangay-Level Demographics Breakdown',
            headers: barangayHeaders,
            rows: barangayRows
          }
        ]
      );
    } else if (reportType === 'verifications') {
      const headers = [
        'User ID',
        'Full Name',
        'Role',
        'Email Address',
        'Municipality',
        'Barangay',
        'Verification Status',
        'Front ID Submitted',
        'Back ID Submitted',
        'Selfie Submitted',
        'Rejection Reason',
        'Date Registered / Submitted'
      ];
      const rows = filteredVerifications.map((v) => [
        v.id,
        v.name || '',
        v.role || '',
        v.email || '',
        v.municipality || 'Bulan',
        v.barangay || '',
        formatCSVStatus(v.verification_status || (v.registration_status === 'approved' ? 'approved' : 'pending')),
        v.document_url ? 'Yes' : 'No',
        v.document_back_url ? 'Yes' : 'No',
        v.selfie_url ? 'Yes' : 'No',
        v.rejection_reason || 'N/A',
        formatCSVDate(v.created_at || v.updated_at)
      ]);

      exportMultiSectionCSV(
        `SIKAP_VERIFICATIONS_REPORT_${dateStamp}`,
        'SIKAP Identity Verification & Compliance Summary',
        [
          ['Generated On:', timestamp],
          ['Generated By:', adminName],
          ['Report Type:', 'Verification Audit Summary'],
          ['Total Records Audited:', String(filteredVerifications.length)],
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
    } else if (reportType === 'moderation') {
      const headers = [
        'Report ID',
        'Violation Type',
        'Target Type',
        'Target ID',
        'Reporter Name',
        'Reporter Email',
        'Incident Description',
        'Status',
        'Date Logged',
        'Date Resolved'
      ];
      const rows = filteredReports.map((r) => [
        r.id,
        formatCSVStatus(r.type),
        r.reportable_type ? r.reportable_type.replace(/_/g, ' ') : 'N/A',
        r.reportable_id ?? 'N/A',
        r.reporter?.name || 'Anonymous',
        r.reporter?.email || 'N/A',
        r.description || '',
        formatCSVStatus(r.status),
        formatCSVDate(r.created_at),
        formatCSVDate(r.resolved_at)
      ]);

      exportMultiSectionCSV(
        `SIKAP_MODERATION_REPORTS_${dateStamp}`,
        'SIKAP Community Moderation & Incident Reports Summary',
        [
          ['Generated On:', timestamp],
          ['Generated By:', adminName],
          ['Report Type:', 'Community Moderation Queue'],
          ['Total Reports Audited:', String(filteredReports.length)],
          ['Status Filter:', statusFilter.toUpperCase()],
          ['Date Scope:', datePreset.toUpperCase()]
        ],
        [
          {
            title: 'Moderation Reports Masterlist',
            headers,
            rows
          }
        ]
      );
    }
    toast.success(`Exported ${getReportTitle()} to CSV.`, 'CSV Export Ready');
  };

  const handleExportDemographicsCSV = () => {
    const dateStamp = new Date().toISOString().split('T')[0];
    const timestamp = formatCSVDate(new Date().toISOString());
    const totalPlatformActivity = municipalSummary.reduce((acc, b) => acc + b.workers + b.employers + b.jobs, 0);

    const municipalHeaders = [
      'Municipality',
      'Active Barangays Count',
      'Registered Workers',
      'Registered Employers',
      'Total Registered Users',
      'Jobs Posted',
      'Total Platform Activity',
      'Activity Share (%)'
    ];
    const municipalRows = municipalOverview.map((m) => [
      m.municipality,
      m.barangaysCount,
      m.workers,
      m.employers,
      m.workers + m.employers,
      m.jobs,
      m.totalImpact,
      totalPlatformActivity > 0 ? `${((m.totalImpact / totalPlatformActivity) * 100).toFixed(1)}%` : '0.0%'
    ]);

    municipalRows.push([
      'GRAND TOTAL (ALL MUNICIPALITIES)',
      municipalSummary.length,
      municipalOverview.reduce((acc, m) => acc + m.workers, 0),
      municipalOverview.reduce((acc, m) => acc + m.employers, 0),
      municipalOverview.reduce((acc, m) => acc + m.workers + m.employers, 0),
      municipalOverview.reduce((acc, m) => acc + m.jobs, 0),
      totalPlatformActivity,
      '100.0%'
    ]);

    const barangayHeaders = [
      'Municipality',
      'Barangay',
      'Registered Workers',
      'Registered Employers',
      'Total Users',
      'Jobs Posted',
      'Total Platform Impact',
      'Municipal Share (%)'
    ];
    const barangayRows = municipalSummary.map((b) => {
      const munTotal = municipalOverview.find((m) => m.municipality === b.municipality)?.totalImpact || 1;
      const bTotal = b.workers + b.employers + b.jobs;
      return [
        b.municipality,
        b.barangay,
        b.workers,
        b.employers,
        b.workers + b.employers,
        b.jobs,
        bTotal,
        munTotal > 0 ? `${((bTotal / munTotal) * 100).toFixed(1)}%` : '0.0%'
      ];
    });

    exportMultiSectionCSV(
      `SIKAP_DEMOGRAPHICS_FILTERED_${municipalityFilter}_${barangayFilter}_${dateStamp}`,
      'SIKAP Municipal & Barangay Demographics Report',
      [
        ['Generated On:', timestamp],
        ['Generated By:', adminName],
        ['Report Type:', 'Filtered Municipal & Barangay Demographics'],
        ['Municipality Filter:', municipalityFilter === 'all' ? 'All Municipalities' : municipalityFilter],
        ['Barangay Filter:', barangayFilter === 'all' ? 'All Barangays' : barangayFilter],
        ['Date Scope:', datePreset.toUpperCase()],
        ['Active Municipalities Covered:', String(municipalOverview.length)],
        ['Active Barangays Covered:', String(municipalSummary.length)],
        ['Total Registered Users:', String(municipalSummary.reduce((acc, m) => acc + m.workers + m.employers, 0))],
        ['Total Jobs Posted:', String(municipalSummary.reduce((acc, m) => acc + m.jobs, 0))]
      ],
      [
        {
          title: 'Executive Municipal Coverage Summary',
          headers: municipalHeaders,
          rows: municipalRows
        },
        {
          title: 'Barangay-Level Demographics Breakdown',
          headers: barangayHeaders,
          rows: barangayRows
        }
      ]
    );
    toast.success('Demographics breakdown exported to CSV.', 'CSV Export Ready');
  };

  const handleExportMasterExcel = async () => {
    try {
      setIsExportingExcel(true);
      setExportError('');
      const dateStamp = new Date().toISOString().split('T')[0];

      const { generateMasterExcelWorkbook, downloadExcelBlob } = await import('@/lib/export/excel');
      const blob = await generateMasterExcelWorkbook({
        users: filteredUsers.length > 0 && (roleFilter !== 'all' || statusFilter !== 'all' || datePreset !== 'all' || deferredSearchQuery) ? filteredUsers : users,
        jobs: filteredJobs.length > 0 && (categoryFilter !== 'all' || statusFilter !== 'all' || datePreset !== 'all' || deferredSearchQuery) ? filteredJobs : jobs,
        verifications: filteredVerifications.length > 0 && (statusFilter !== 'all' || roleFilter !== 'all' || datePreset !== 'all' || deferredSearchQuery) ? filteredVerifications : verifications,
        reports: filteredReports.length > 0 || statusFilter !== 'all' || deferredSearchQuery ? filteredReports : reports,
        municipalSummary,
        municipalOverview,
      });

      const filename = `SIKAP_Reports_Master_Workbook_${dateStamp}.xlsx`;
      downloadExcelBlob(blob, filename);
      toast.success('Master Excel workbook generated and downloaded.', 'Excel Export Ready');
    } catch (err) {
      console.error('Failed to export Excel workbook:', err);
      toast.error('Failed to generate Excel report. Please try again.', 'Export Failed');
      setExportError('Failed to generate Excel report. Please try again.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  const getReportTitle = () => {
    switch (reportType) {
      case 'users':
        return 'Registered Users & Demographics Summary';
      case 'jobs':
        return 'Job Postings & Employment Summary';
      case 'demographics':
        return 'Municipal & Barangay Demographics Summary';
      case 'verifications':
        return 'Identity Verification & Compliance Summary';
      case 'moderation':
        return 'Community Moderation & Incident Reports';
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
            onClick={() => fetchData(true)}
            disabled={isAnyLoading}
            className="px-3.5 py-2 bg-white border border-ink-faint text-ink hover:bg-paper font-body text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Reload latest records"
          >
            <i className={`lni lni-reload text-xs ${isAnyLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={handleExportCSV}
            disabled={isAnyLoading}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-body text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Export active report view as CSV (.csv)"
          >
            <i className="lni lni-download text-xs" />
            Export CSV
          </button>

          <button
            onClick={handleExportMasterExcel}
            disabled={isAnyLoading || isExportingExcel}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-body text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Export full multi-tab formatted Excel workbook with Users, Jobs, Demographics, and Verifications (.xlsx)"
          >
            <i className={`lni ${isExportingExcel ? 'lni-reload animate-spin' : 'lni-empty-file'} text-xs`} />
            {isExportingExcel ? 'Generating Workbook...' : 'Export Workbook (Excel)'}
          </button>

          <button
            onClick={handlePrint}
            disabled={isAnyLoading}
            className="px-4 py-2 bg-ink hover:bg-primary-dark text-white font-body text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Print or export PDF summary"
          >
            <i className="lni lni-printer text-xs" />
            Print / Export PDF
          </button>
        </div>
      </div>

      {/* ── EXPORT ERROR NOTIFICATION (HIDDEN IN PRINT) ── */}
      {exportError && (
        <div className="no-print flex items-center justify-between p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <i className="lni lni-warning text-base text-red-500" />
            <span>{exportError}</span>
          </div>
          <button
            type="button"
            onClick={() => setExportError('')}
            className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
            aria-label="Dismiss error"
          >
            <i className="lni lni-close text-xs" />
          </button>
        </div>
      )}

      {/* ── REPORT TYPE SELECTOR TABS (HIDDEN IN PRINT) ── */}
      <div className="no-print bg-white/80 backdrop-blur-md rounded-2xl p-2 border border-white/60 shadow-xs flex flex-wrap gap-2">
        <button
          onClick={() => setReportType('users')}
          className={`flex-1 min-w-[150px] py-2.5 px-3.5 rounded-xl text-xs font-body font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
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
          className={`flex-1 min-w-[150px] py-2.5 px-3.5 rounded-xl text-xs font-body font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
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
          className={`flex-1 min-w-[150px] py-2.5 px-3.5 rounded-xl text-xs font-body font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            reportType === 'demographics'
              ? 'bg-ink text-white shadow-sm'
              : 'text-ink-soft hover:text-ink hover:bg-white/60'
          }`}
        >
          <i className="lni lni-map-marker text-sm" />
          Municipal Demographics
        </button>

        <button
          onClick={() => setReportType('verifications')}
          className={`flex-1 min-w-[150px] py-2.5 px-3.5 rounded-xl text-xs font-body font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            reportType === 'verifications'
              ? 'bg-ink text-white shadow-sm'
              : 'text-ink-soft hover:text-ink hover:bg-white/60'
          }`}
        >
          <i className="lni lni-shield text-sm" />
          Verification Audit ({verifications.length})
        </button>

        <button
          onClick={() => setReportType('moderation')}
          className={`flex-1 min-w-[150px] py-2.5 px-3.5 rounded-xl text-xs font-body font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            reportType === 'moderation'
              ? 'bg-ink text-white shadow-sm'
              : 'text-ink-soft hover:text-ink hover:bg-white/60'
          }`}
        >
          <i className="lni lni-bullhorn text-sm" />
          Moderation Reports ({reports.length})
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

          {/* Contextual filter: Municipality (for Demographics) */}
          {reportType === 'demographics' && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-body font-semibold text-ink-muted">Municipality:</span>
                <select
                  value={municipalityFilter}
                  onChange={(e) => {
                    setMunicipalityFilter(e.target.value);
                    setBarangayFilter('all');
                  }}
                  className="px-3 py-2 bg-white/90 border border-ink-faint/60 rounded-xl text-xs font-body font-semibold text-ink focus:outline-none focus:border-primary cursor-pointer max-w-[170px]"
                >
                  <option value="all">All Municipalities</option>
                  {uniqueMunicipalities.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-body font-semibold text-ink-muted">Barangay:</span>
                <select
                  value={barangayFilter}
                  onChange={(e) => setBarangayFilter(e.target.value)}
                  className="px-3 py-2 bg-white/90 border border-ink-faint/60 rounded-xl text-xs font-body font-semibold text-ink focus:outline-none focus:border-primary cursor-pointer max-w-[170px]"
                >
                  <option value="all">All Barangays</option>
                  {availableBarangays.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

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

          {/* Status filter (for Users, Jobs, Verifications) */}
          {reportType !== 'demographics' && (
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
                {reportType === 'moderation' && (
                  <>
                    <option value="open">Open / Investigating</option>
                    <option value="resolved">Resolved</option>
                    <option value="dismissed">Dismissed</option>
                  </>
                )}
              </select>
            </div>
          )}
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

        {/* Active Filters Chips Bar & Clear All (U5) */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-ink-faint/30">
            <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
              Active Filters ({activeFilters.length}):
            </span>
            {activeFilters.map((f) => (
              <span
                key={f.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary-dark border border-primary/20 rounded-full text-xs font-medium shadow-2xs"
              >
                <span>{f.label}</span>
                <button
                  type="button"
                  onClick={f.onRemove}
                  className="hover:text-red-600 transition-colors cursor-pointer"
                  title="Remove filter"
                >
                  <i className="lni lni-close text-[10px]" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={handleClearAllFilters}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 underline underline-offset-2 ml-1 cursor-pointer transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* ── KPI SUMMARY METRICS (SCREEN ONLY) ── */}
      <div className="no-print print:hidden grid grid-cols-2 md:grid-cols-4 gap-4">
        {reportType === 'users' && (
          <>
            <StatCard
              title="Filtered Users"
              value={filteredUsers.length}
              iconClass="lni lni-users"
              bg="from-slate-50 to-slate-100"
              iconColor="text-slate-700"
            />
            <StatCard
              title="Workers"
              value={filteredUsers.filter((u) => u.role === 'worker').length}
              iconClass="lni lni-user"
              bg="from-sky-50 to-sky-100"
              iconColor="text-sky-700"
            />
            <StatCard
              title="Employers"
              value={filteredUsers.filter((u) => u.role === 'employer').length}
              iconClass="lni lni-briefcase"
              bg="from-amber-50 to-amber-100"
              iconColor="text-amber-700"
            />
            <StatCard
              title="Verified Rate"
              value={`${filteredUsers.length ? Math.round((filteredUsers.filter((u) => u.verification_status === 'approved').length / filteredUsers.length) * 100) : 0}%`}
              iconClass="lni lni-checkmark-circle"
              bg="from-emerald-50 to-emerald-100"
              iconColor="text-emerald-700"
            />
          </>
        )}

        {reportType === 'jobs' && (
          <>
            <StatCard
              title="Filtered Jobs"
              value={filteredJobs.length}
              iconClass="lni lni-briefcase"
              bg="from-slate-50 to-slate-100"
              iconColor="text-slate-700"
            />
            <StatCard
              title="Open Positions"
              value={filteredJobs.filter((j) => j.status === 'open').length}
              iconClass="lni lni-radio-button"
              bg="from-emerald-50 to-emerald-100"
              iconColor="text-emerald-700"
            />
            <StatCard
              title="Completed Hires"
              value={filteredJobs.filter((j) => j.status === 'completed').length}
              iconClass="lni lni-checkmark-circle"
              bg="from-sky-50 to-sky-100"
              iconColor="text-sky-700"
            />
            <StatCard
              title="Total Slots"
              value={filteredJobs.reduce((acc, j) => acc + (j.slots || 1), 0)}
              iconClass="lni lni-target"
              bg="from-amber-50 to-amber-100"
              iconColor="text-amber-700"
            />
          </>
        )}

        {reportType === 'demographics' && (
          <>
            <StatCard
              title="Locations Covered"
              value={municipalSummary.length}
              iconClass="lni lni-map"
              bg="from-sky-50 to-sky-100"
              iconColor="text-sky-700"
            />
            <StatCard
              title="Registered Population"
              value={municipalSummary.reduce((acc, m) => acc + m.workers + m.employers, 0)}
              iconClass="lni lni-users"
              bg="from-indigo-50 to-indigo-100"
              iconColor="text-indigo-700"
            />
            <StatCard
              title="Top Barangay"
              value={municipalSummary[0]?.barangay || 'N/A'}
              iconClass="lni lni-star"
              bg="from-amber-50 to-amber-100"
              iconColor="text-amber-700"
            />
            <StatCard
              title="Total Jobs Posted"
              value={municipalSummary.reduce((acc, m) => acc + m.jobs, 0)}
              iconClass="lni lni-briefcase"
              bg="from-emerald-50 to-emerald-100"
              iconColor="text-emerald-700"
            />
          </>
        )}

        {reportType === 'verifications' && (
          <>
            <StatCard
              title="Audited Records"
              value={filteredVerifications.length}
              iconClass="lni lni-shield"
              bg="from-slate-50 to-slate-100"
              iconColor="text-slate-700"
            />
            <StatCard
              title="Approved"
              value={filteredVerifications.filter((v) => v.verification_status === 'approved').length}
              iconClass="lni lni-checkmark-circle"
              bg="from-emerald-50 to-emerald-100"
              iconColor="text-emerald-700"
            />
            <StatCard
              title="Pending Review"
              value={filteredVerifications.filter((v) => v.verification_status === 'pending').length}
              iconClass="lni lni-timer"
              bg="from-amber-50 to-amber-100"
              iconColor="text-amber-700"
            />
            <StatCard
              title="Rejected"
              value={filteredVerifications.filter((v) => v.verification_status === 'rejected').length}
              iconClass="lni lni-cross-circle"
              bg="from-rose-50 to-rose-100"
              iconColor="text-rose-700"
            />
          </>
        )}

        {reportType === 'moderation' && (
          <>
            <StatCard
              title="Total Incident Reports"
              value={filteredReports.length}
              iconClass="lni lni-bullhorn"
              bg="from-slate-50 to-slate-100"
              iconColor="text-slate-700"
            />
            <StatCard
              title="Open / Pending"
              value={filteredReports.filter((r) => r.status === 'open' || r.status === 'pending' || r.status === 'investigating').length}
              iconClass="lni lni-warning"
              bg="from-rose-50 to-rose-100"
              iconColor="text-rose-700"
            />
            <StatCard
              title="Resolved"
              value={filteredReports.filter((r) => r.status === 'resolved').length}
              iconClass="lni lni-checkmark-circle"
              bg="from-emerald-50 to-emerald-100"
              iconColor="text-emerald-700"
            />
            <StatCard
              title="Dismissed"
              value={filteredReports.filter((r) => r.status === 'dismissed').length}
              iconClass="lni lni-cross-circle"
              bg="from-gray-50 to-gray-100"
              iconColor="text-gray-700"
            />
          </>
        )}
      </div>

      {/* ── PRINT-ONLY SUMMARY HEADER ── */}
      <div className="hidden print:block text-center border-b-2 border-black pb-4 mb-6">
        <div className="text-base font-sans font-bold uppercase tracking-wider text-black">
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
        {/* Header toolbar for table: Record counter (U5) */}
        <div className="no-print px-4 py-2.5 bg-slate-50/80 border-b border-ink-faint/40 flex items-center justify-between text-xs text-ink-muted font-body">
          <div>
            Showing <strong className="text-ink font-semibold">{startRecord}</strong> to{' '}
            <strong className="text-ink font-semibold">{endRecord}</strong> of{' '}
            <strong className="text-ink font-semibold">{currentTotalFiltered}</strong> records
          </div>
          {totalPages > 1 && (
            <div className="text-[11px] text-ink-muted">
              Page <strong className="text-ink">{currentPage}</strong> of <strong className="text-ink">{totalPages}</strong>
            </div>
          )}
        </div>

        {isLoadingActiveTab ? (
          <ReportSkeletonTable columns={reportType === 'moderation' ? 7 : reportType === 'jobs' ? 8 : 6} />
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
                    paginatedUsers.map((u) => (
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
                    paginatedJobs.map((j) => (
                      <tr key={j.id} className="hover:bg-paper/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-ink">{j.title}</div>
                          <div className="text-[10px] text-ink-muted font-mono">{j.reference_number || `#${j.id}`}</div>
                        </td>
                        <td className="py-3 px-4 text-ink">{j.employer?.name || 'Deleted Account'}</td>
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

            {/* 3. MUNICIPAL & BARANGAY DEMOGRAPHICS VIEW */}
            {reportType === 'demographics' && (
              <div className="space-y-6">
                {/* Interactive Municipal Overview Grid (Screen Only) */}
                {municipalOverview.length > 0 && (
                  <div className="no-print p-4 bg-slate-50/70 border-b border-ink-faint/30">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <div>
                        <span className="text-xs font-display font-bold text-ink uppercase tracking-wider block">
                          Municipal Coverage Summary ({municipalOverview.length} Municipalities)
                        </span>
                        <span className="text-[11px] text-ink-muted">
                          Click any card to focus on that municipality
                        </span>
                      </div>
                      <button
                        onClick={handleExportDemographicsCSV}
                        className="no-print px-3.5 py-1.5 bg-slate-700 hover:bg-slate-800 text-white font-body text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Export current filtered municipal & barangay demographics as CSV"
                      >
                        <i className="lni lni-download text-xs" />
                        Export Demographics (CSV)
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {municipalOverview.map((m) => {
                        const isSelected = municipalityFilter === m.municipality;
                        const totalAct = municipalSummary.reduce((acc, b) => acc + b.workers + b.employers + b.jobs, 0);
                        const sharePercent = totalAct > 0 ? ((m.totalImpact / totalAct) * 100).toFixed(1) : '0.0';
                        return (
                          <button
                            type="button"
                            key={m.municipality}
                            aria-pressed={isSelected}
                            onClick={() => {
                              if (isSelected) {
                                setMunicipalityFilter('all');
                              } else {
                                setMunicipalityFilter(m.municipality);
                              }
                              setBarangayFilter('all');
                            }}
                            className={`p-3.5 rounded-xl border transition-all text-left w-full focus:outline-none focus:ring-2 focus:ring-primary ${
                              isSelected
                                ? 'bg-primary/10 border-primary shadow-sm ring-2 ring-primary/20'
                                : 'bg-white hover:bg-slate-50 border-ink-faint/40 shadow-xs'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-bold text-sm text-ink">{m.municipality}</span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                {m.barangaysCount} {m.barangaysCount === 1 ? 'Brgy' : 'Brgys'}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-1 text-center my-2 text-[11px] bg-slate-50/90 rounded-lg p-1.5 border border-ink-faint/20">
                              <div>
                                <div className="text-[9px] text-ink-muted font-bold uppercase">Workers</div>
                                <div className="font-bold text-sky-700">{m.workers}</div>
                              </div>
                              <div>
                                <div className="text-[9px] text-ink-muted font-bold uppercase">Empl.</div>
                                <div className="font-bold text-amber-700">{m.employers}</div>
                              </div>
                              <div>
                                <div className="text-[9px] text-ink-muted font-bold uppercase">Jobs</div>
                                <div className="font-bold text-emerald-700">{m.jobs}</div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-ink-muted mt-1">
                              <span>Total Platform Impact:</span>
                              <span className="font-bold text-ink">{m.totalImpact} ({sharePercent}%)</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Print-Only Municipal Summary Table */}
                <div className="hidden print:block mb-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-2 text-black">
                    Executive Municipal Coverage Summary
                  </h3>
                  <table className="w-full text-left font-sans text-[11px] border border-black border-collapse mb-4">
                    <thead>
                      <tr className="bg-gray-100 border-b border-black text-black uppercase font-bold text-[10px]">
                        <th className="py-2 px-3 border-r border-black">Municipality</th>
                        <th className="py-2 px-3 text-center border-r border-black">Barangays</th>
                        <th className="py-2 px-3 text-center border-r border-black">Workers</th>
                        <th className="py-2 px-3 text-center border-r border-black">Employers</th>
                        <th className="py-2 px-3 text-center border-r border-black">Jobs</th>
                        <th className="py-2 px-3 text-center border-r border-black">Total Impact</th>
                        <th className="py-2 px-3 text-center">Share (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-300">
                      {municipalOverview.map((m, idx) => {
                        const totalAct = municipalSummary.reduce((acc, b) => acc + b.workers + b.employers + b.jobs, 0);
                        const sharePercent = totalAct > 0 ? ((m.totalImpact / totalAct) * 100).toFixed(1) : '0.0';
                        return (
                          <tr key={idx} className="border-b border-gray-200">
                            <td className="py-1.5 px-3 font-bold border-r border-black">{m.municipality}</td>
                            <td className="py-1.5 px-3 text-center border-r border-black">{m.barangaysCount}</td>
                            <td className="py-1.5 px-3 text-center border-r border-black">{m.workers}</td>
                            <td className="py-1.5 px-3 text-center border-r border-black">{m.employers}</td>
                            <td className="py-1.5 px-3 text-center border-r border-black">{m.jobs}</td>
                            <td className="py-1.5 px-3 text-center font-bold border-r border-black">{m.totalImpact}</td>
                            <td className="py-1.5 px-3 text-center">{sharePercent}%</td>
                          </tr>
                        );
                      })}
                      <tr className="bg-gray-100 font-bold border-t-2 border-black">
                        <td className="py-2 px-3 border-r border-black">GRAND TOTAL</td>
                        <td className="py-2 px-3 text-center border-r border-black">{municipalSummary.length}</td>
                        <td className="py-2 px-3 text-center border-r border-black">{municipalOverview.reduce((acc, m) => acc + m.workers, 0)}</td>
                        <td className="py-2 px-3 text-center border-r border-black">{municipalOverview.reduce((acc, m) => acc + m.employers, 0)}</td>
                        <td className="py-2 px-3 text-center border-r border-black">{municipalOverview.reduce((acc, m) => acc + m.jobs, 0)}</td>
                        <td className="py-2 px-3 text-center border-r border-black">{municipalSummary.reduce((acc, b) => acc + b.workers + b.employers + b.jobs, 0)}</td>
                        <td className="py-2 px-3 text-center">100.0%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Detailed Barangay Demographics Table */}
                <table className="w-full text-left font-body text-xs border-collapse">
                  <thead>
                    <tr className="bg-ink/5 border-b border-ink-faint/50 text-ink-soft uppercase text-[10px] font-bold tracking-wider">
                      <th className="py-3.5 px-4">Municipality</th>
                      <th className="py-3.5 px-4">Barangay</th>
                      <th className="py-3.5 px-4 text-center">Registered Workers</th>
                      <th className="py-3.5 px-4 text-center">Registered Employers</th>
                      <th className="py-3.5 px-4 text-center">Jobs Posted</th>
                      <th className="py-3.5 px-4 text-center">Total Platform Impact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-faint/30">
                    {municipalSummary.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-ink-muted">
                          No municipal/barangay records found matching the filters.
                        </td>
                      </tr>
                    ) : (
                      paginatedDemographics.map((b, idx) => (
                        <tr key={idx} className="hover:bg-paper/40 transition-colors">
                          <td className="py-3 px-4 font-bold text-ink">{b.municipality}</td>
                          <td className="py-3 px-4 text-ink-soft">{b.barangay}</td>
                          <td className="py-3 px-4 text-center font-bold text-sky-700">
                            <span className="px-2 py-0.5 rounded-md bg-sky-50">{b.workers}</span>
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-amber-700">
                            <span className="px-2 py-0.5 rounded-md bg-amber-50">{b.employers}</span>
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-emerald-700">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50">{b.jobs}</span>
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-ink">
                            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-800">
                              {b.workers + b.employers + b.jobs}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 4. VERIFICATIONS AUDIT TABLE */}
            {reportType === 'verifications' && (
              <table className="w-full text-left font-body text-xs border-collapse">
                <thead>
                  <tr className="bg-ink/5 border-b border-ink-faint/50 text-ink-soft uppercase text-[10px] font-bold tracking-wider">
                    <th className="py-3.5 px-4">Applicant</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Location</th>
                    <th className="py-3.5 px-4 text-center">ID / Docs Submitted</th>
                    <th className="py-3.5 px-4">Verification Status</th>
                    <th className="py-3.5 px-4">Rejection Notes</th>
                    <th className="py-3.5 px-4">Submission Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-faint/30">
                  {filteredVerifications.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-ink-muted">
                        No verification records match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedVerifications.map((v) => {
                      const vStat = (v.verification_status || (v.registration_status === 'approved' ? 'approved' : 'pending')).toLowerCase();
                      const hasFront = !!v.document_url;
                      const hasBack = !!v.document_back_url;
                      const hasSelfie = !!v.selfie_url;
                      const hasBusiness = !!(v.business_documents && (Array.isArray(v.business_documents) ? v.business_documents.length > 0 : true));
                      return (
                        <tr key={v.id} className="hover:bg-paper/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-ink">{v.name || 'Unnamed'}</div>
                            <div className="text-[10px] text-ink-muted">{v.email}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold capitalize ${
                                v.role === 'employer'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-sky-100 text-sky-800'
                              }`}
                            >
                              {v.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-ink-soft text-[11px]">
                            {v.barangay ? `${v.barangay}, ` : ''}{v.municipality || 'Bulan'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center gap-1.5 text-[10px]">
                              {v.role === 'employer' ? (
                                hasBusiness ? (
                                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">
                                    <i className="lni lni-checkmark mr-1" />Business Permit
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                                    No Permit
                                  </span>
                                )
                              ) : (
                                <>
                                  <span className={`px-1.5 py-0.5 rounded font-semibold ${hasFront ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                                    Front
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded font-semibold ${hasBack ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                                    Back
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded font-semibold ${hasSelfie ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                                    Selfie
                                  </span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                vStat === 'approved'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : vStat === 'rejected'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {vStat}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-ink-muted italic text-[11px]">
                            {v.rejection_reason || '—'}
                          </td>
                          <td className="py-3 px-4 text-ink-muted">{formatDate(v.created_at || v.updated_at)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}

            {/* 5. MODERATION REPORTS TABLE */}
            {reportType === 'moderation' && (
              <table className="w-full text-left font-body text-xs border-collapse">
                <thead>
                  <tr className="bg-ink/5 border-b border-ink-faint/50 text-ink-soft uppercase text-[10px] font-bold tracking-wider">
                    <th className="py-3.5 px-4">Report ID</th>
                    <th className="py-3.5 px-4">Violation Type</th>
                    <th className="py-3.5 px-4">Target Entity</th>
                    <th className="py-3.5 px-4">Reporter</th>
                    <th className="py-3.5 px-4">Incident Description</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Date Logged</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-faint/30">
                  {filteredReports.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-ink-muted">
                        No incident or moderation reports match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedReports.map((r) => (
                      <tr key={r.id} className="hover:bg-paper/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-ink">#{r.id}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[10px] font-bold capitalize">
                            {formatCSVStatus(r.type)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-ink-soft">
                          <span className="capitalize font-semibold text-ink">
                            {r.reportable_type ? r.reportable_type.replace(/_/g, ' ') : 'N/A'}
                          </span>
                          {r.reportable_id && <span className="text-ink-muted text-[10px] ml-1">#{r.reportable_id}</span>}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-ink">{r.reporter?.name || 'Anonymous'}</div>
                          {r.reporter?.email && <div className="text-[10px] text-ink-muted">{r.reporter.email}</div>}
                        </td>
                        <td className="py-3 px-4 text-ink max-w-xs truncate" title={r.description}>
                          {r.description || '—'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              r.status === 'resolved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : r.status === 'dismissed'
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {r.status || 'open'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-ink-muted">{formatDate(r.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Pagination Controls Bar (P3) */}
        {!isLoadingActiveTab && currentTotalFiltered > pageSize && (
          <div className="no-print px-4 py-3 bg-slate-50/80 border-t border-ink-faint/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-ink-muted">
              Showing page <strong className="text-ink">{currentPage}</strong> of{' '}
              <strong className="text-ink">{totalPages}</strong> ({currentTotalFiltered} total records)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 rounded-lg border border-ink-faint/60 bg-white hover:bg-slate-50 text-ink disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="First Page"
              >
                <i className="lni lni-angle-double-left text-[10px]" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-ink-faint/60 bg-white hover:bg-slate-50 text-ink font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1 cursor-pointer"
              >
                <i className="lni lni-chevron-left text-[10px]" />
                Prev
              </button>
              <div className="px-3 py-1 bg-white border border-ink-faint/40 rounded-lg font-semibold text-ink">
                {currentPage} / {totalPages}
              </div>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-ink-faint/60 bg-white hover:bg-slate-50 text-ink font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1 cursor-pointer"
              >
                Next
                <i className="lni lni-chevron-right text-[10px]" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1.5 rounded-lg border border-ink-faint/60 bg-white hover:bg-slate-50 text-ink disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Last Page"
              >
                <i className="lni lni-angle-double-right text-[10px]" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── PRINT FOOTER ── */}
      <div className="hidden print:block mt-8 pt-4 border-t border-gray-300 text-center text-[10px] text-gray-500 font-sans">
        SIKAP Platform Report · Generated on {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}

export default function ExportReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 space-y-4">
          <div className="h-8 bg-slate-200/80 rounded w-48 animate-pulse" />
          <div className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
          <div className="h-96 bg-white rounded-2xl border border-slate-200 p-4 animate-pulse" />
        </div>
      }
    >
      <ExportReportsContent />
    </Suspense>
  );
}
