'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { adminApi } from '@/lib/api';
import StatCard from '@/components/StatCard';
import StatusTabs from '@/components/StatusTabs';
import { AlertDialog } from '@/components/AlertDialog';
import { formatDate } from '@/lib/date';
import { STATUS_BADGE_MAP, DEFAULT_BADGE_CLASS } from '@/lib/constants';
import { exportMultiSectionCSV, formatCSVDate, formatCSVCurrency, formatCSVStatus, calculateNormalizedHourlyWage } from '@/lib/export/csv';
import BulkJobActionModal, { BulkJobActionType } from '@/components/jobs/BulkJobActionModal';
import { useUndoToast } from '@/hooks/useUndoToast';
import { UndoToast } from '@/components/UndoToast';

const JobDetailModal = dynamic(() => import('@/components/jobs/JobDetailModal'), {
  ssr: false,
});

function JobsPageContent() {
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get('search') || '';

  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [archivedJobs, setArchivedJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedDetailJob, setSelectedDetailJob] = useState<any | null>(null);
  const [alertState, setAlertState] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({ open: false, title: '', message: '', onConfirm: () => {} });
  const [selectedJobIds, setSelectedJobIds] = useState<Set<number>>(new Set());
  const [bulkModalState, setBulkModalState] = useState<{
    isOpen: boolean;
    actionType: BulkJobActionType;
  }>({
    isOpen: false,
    actionType: 'delete',
  });
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const {
    activeAction,
    secondsRemaining,
    scheduleUndoAction,
    handleUndo,
    handleDismissNow,
  } = useUndoToast();

  const isArchivedView = statusFilter === 'Archived';
  const currentJobList = isArchivedView ? archivedJobs : activeJobs;
  const jobs = currentJobList;

  const handleExportCSV = () => {
    if (!jobs || jobs.length === 0) {
      setAlertState({
        open: true,
        title: 'Export Empty',
        message: 'No job postings available to export.',
        onConfirm: () => setAlertState(s => ({ ...s, open: false })),
      });
      return;
    }

    const headers = [
      'Job ID',
      'Reference Number',
      'Job Title',
      'Employer Name',
      'Category',
      'Offered Comp (PHP)',
      'Rate Unit',
      'Duration',
      'Hourly Wage (PHP/hr)',
      'Slots Required',
      'Slots Hired',
      'Municipality',
      'Barangay',
      'Status',
      'Applications Count',
      'Date Posted'
    ];

    const rows = filteredJobs.map((j) => [
      j.id,
      j.reference_number || `SKP-JOB-${j.id}`,
      j.title,
      j.employer?.name || 'Deleted Account',
      j.category,
      formatCSVCurrency(j.compensation),
      j.rate_unit ? String(j.rate_unit).replace(/_/g, ' ') : (j.duration_type ? String(j.duration_type).replace(/_/g, ' ') : 'per day'),
      j.duration ? String(j.duration) : 'N/A',
      formatCSVCurrency(calculateNormalizedHourlyWage(j.compensation, j.rate_unit, j.duration, j.duration_unit, j.duration_type)),
      j.slots ?? 1,
      j.filled_slots ?? j.accepted_count ?? 0,
      j.municipality || 'Bulan',
      j.barangay || '',
      formatCSVStatus(j.deleted_at ? 'archived' : j.status),
      j.applications_count ?? 0,
      formatCSVDate(j.created_at)
    ]);

    exportMultiSectionCSV(
      `sikap_jobs_${new Date().toISOString().slice(0, 10)}`,
      'SIKAP Job Postings & Opportunities Masterlist',
      [
        ['Generated On:', formatCSVDate(new Date().toISOString())],
        ['Report Type:', 'Job Postings Directory'],
        ['Total Records Exported:', String(filteredJobs.length)],
        ['Status Filter:', statusFilter.toUpperCase()],
      ],
      [
        {
          title: 'Job Postings Directory',
          headers,
          rows,
        },
      ]
    );
  };

  // Sync search from URL query param
  useEffect(() => {
    setSearchTerm(urlSearch);
  }, [urlSearch]);

  const fetchJobs = async (forceRefresh: boolean = false) => {
    try {
      setLoading(true);
      const [activeRes, archivedRes] = await Promise.all([
        adminApi.getJobs({
          trashed: false,
          all: true,
          forceRefresh,
        }),
        adminApi.getJobs({
          trashed: true,
          all: true,
          forceRefresh,
        }),
      ]);
      setActiveJobs(activeRes.data?.data || []);
      setArchivedJobs(archivedRes.data?.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedDetailJob) {
        setSelectedDetailJob(null);
      }
    };
    if (selectedDetailJob) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedDetailJob]);

  const handleDelete = (id: number) => {
    const target = activeJobs.find(j => j.id === id);
    if (!target) return;
    const jobTitle = target.title || `Job #${id}`;
    const previousActive = [...activeJobs];
    const previousArchived = [...archivedJobs];
    const previousDetail = selectedDetailJob;

    // Optimistically remove from active, add to archived
    setActiveJobs(prev => prev.filter(j => j.id !== id));
    setArchivedJobs(prev => [{ ...target, deleted_at: new Date().toISOString() }, ...prev]);
    if (selectedDetailJob?.id === id) {
      setSelectedDetailJob(null);
    }

    scheduleUndoAction({
      id: `job-delete-${id}`,
      message: `Archived "${jobTitle}"`,
      subtext: 'Moved to archives. Click Undo within 5s to cancel.',
      timerSeconds: 5,
      onUndo: () => {
        setActiveJobs(previousActive);
        setArchivedJobs(previousArchived);
        setSelectedDetailJob(previousDetail);
      },
      onCommit: async () => {
        try {
          setActionLoading(id);
          await adminApi.deleteJob(id);
          const [activeRes, archivedRes] = await Promise.all([
            adminApi.getJobs({ trashed: false, all: true, forceRefresh: true }),
            adminApi.getJobs({ trashed: true, all: true, forceRefresh: true }),
          ]);
          setActiveJobs(activeRes.data?.data || []);
          setArchivedJobs(archivedRes.data?.data || []);
        } catch (err: any) {
          setActiveJobs(previousActive);
          setArchivedJobs(previousArchived);
          setSelectedDetailJob(previousDetail);
          setAlertState({
            open: true,
            title: 'Delete Failed',
            message: 'Failed to delete job: ' + (err.response?.data?.message || err.message),
            onConfirm: () => setAlertState(s => ({ ...s, open: false })),
          });
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const handleRestore = (id: number) => {
    const target = archivedJobs.find(j => j.id === id);
    if (!target) return;
    const jobTitle = target.title || `Job #${id}`;
    const previousArchived = [...archivedJobs];
    const previousActive = [...activeJobs];
    const previousDetail = selectedDetailJob;

    setArchivedJobs(prev => prev.filter(j => j.id !== id));
    setActiveJobs(prev => [{ ...target, deleted_at: null }, ...prev]);
    if (selectedDetailJob?.id === id) {
      setSelectedDetailJob(null);
    }

    scheduleUndoAction({
      id: `job-restore-${id}`,
      message: `Restored "${jobTitle}"`,
      subtext: 'Returned to active listings. Click Undo within 5s to cancel.',
      timerSeconds: 5,
      onUndo: () => {
        setArchivedJobs(previousArchived);
        setActiveJobs(previousActive);
        setSelectedDetailJob(previousDetail);
      },
      onCommit: async () => {
        try {
          setActionLoading(id);
          await adminApi.restoreJob(id);
          const [activeRes, archivedRes] = await Promise.all([
            adminApi.getJobs({ trashed: false, all: true, forceRefresh: true }),
            adminApi.getJobs({ trashed: true, all: true, forceRefresh: true }),
          ]);
          setActiveJobs(activeRes.data?.data || []);
          setArchivedJobs(archivedRes.data?.data || []);
        } catch (err: any) {
          setArchivedJobs(previousArchived);
          setActiveJobs(previousActive);
          setAlertState({
            open: true,
            title: 'Restore Failed',
            message: 'Failed to restore job: ' + (err.response?.data?.message || err.message),
            onConfirm: () => setAlertState(s => ({ ...s, open: false })),
          });
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const handleSuspendToggle = (id: number, currentStatus: string) => {
    const isSuspended = currentStatus === 'suspended';
    const newStatus = isSuspended ? 'open' : 'suspended';
    const actionLabel = isSuspended ? 'Unsuspended' : 'Suspended';
    const target = activeJobs.find(j => j.id === id);
    const jobTitle = target?.title || `Job #${id}`;

    const previousActive = [...activeJobs];
    const previousDetail = selectedDetailJob;

    // Immediate optimistic update
    setActiveJobs(prev =>
      prev.map(j => (j.id === id ? { ...j, status: newStatus } : j))
    );
    if (selectedDetailJob?.id === id) {
      setSelectedDetailJob((prev: any) => prev ? { ...prev, status: newStatus } : null);
    }

    scheduleUndoAction({
      id: `job-suspend-${id}`,
      message: `${actionLabel} "${jobTitle}"`,
      subtext: isSuspended ? 'Job is now public and accepting applications' : 'Job post has been hidden from public feed',
      timerSeconds: 5,
      onUndo: () => {
        setActiveJobs(previousActive);
        setSelectedDetailJob(previousDetail);
      },
      onCommit: async () => {
        try {
          setActionLoading(id);
          await adminApi.updateJobStatus(id, newStatus);
          const res = await adminApi.getJobs({ trashed: false, all: true, forceRefresh: true });
          setActiveJobs(res.data?.data || []);
        } catch (err: any) {
          setActiveJobs(previousActive);
          setSelectedDetailJob(previousDetail);
          setAlertState({
            open: true,
            title: 'Action Failed',
            message: `Failed to update job status: ${err.response?.data?.message || err.message}`,
            onConfirm: () => setAlertState(s => ({ ...s, open: false })),
          });
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const filteredJobs = currentJobList.filter(j => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      (j.title || '').toLowerCase().includes(term) ||
      (j.employer?.name || '').toLowerCase().includes(term) ||
      (j.category || '').toLowerCase().includes(term) ||
      String(j.id).includes(term) ||
      (j.reference_number || '').toLowerCase().includes(term);
    
    if (statusFilter === 'All' || statusFilter === 'Archived') {
      return matchesSearch;
    }

    const normalizedFilter = statusFilter.toLowerCase().replace(/\s+/g, '_');
    const normalizedStatus = (j.status || '').toLowerCase().replace(/\s+/g, '_');
    return matchesSearch && normalizedStatus === normalizedFilter;
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(filteredJobs.length / pageSize);
  const paginatedJobs = filteredJobs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const goToPrev = () => setCurrentPage(p => Math.max(p - 1, 1));
  const goToNext = () => setCurrentPage(p => Math.min(p + 1, totalPages));

  const isAllJobsSelected = useMemo(() => {
    if (paginatedJobs.length === 0) return false;
    return paginatedJobs.every((j: any) => selectedJobIds.has(j.id));
  }, [paginatedJobs, selectedJobIds]);

  const handleToggleSelectJob = (id: number) => {
    setSelectedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAllJobs = () => {
    if (isAllJobsSelected) {
      setSelectedJobIds((prev) => {
        const next = new Set(prev);
        paginatedJobs.forEach((j: any) => next.delete(j.id));
        return next;
      });
    } else {
      setSelectedJobIds((prev) => {
        const next = new Set(prev);
        paginatedJobs.forEach((j: any) => next.add(j.id));
        return next;
      });
    }
  };

  const handleDeselectAllJobs = () => {
    setSelectedJobIds(new Set());
  };

  const selectedJobsList = useMemo(() => {
    return currentJobList.filter((j) => selectedJobIds.has(j.id));
  }, [currentJobList, selectedJobIds]);

  const suspendableJobs = useMemo(() => {
    return selectedJobsList.filter((j) => j.status !== 'suspended' && !j.deleted_at);
  }, [selectedJobsList]);

  const unsuspendableJobs = useMemo(() => {
    return selectedJobsList.filter((j) => j.status === 'suspended' && !j.deleted_at);
  }, [selectedJobsList]);

  const deletableJobs = useMemo(() => {
    return selectedJobsList.filter((j) => !j.deleted_at);
  }, [selectedJobsList]);

  const handleBulkJobSuspendToggle = (suspend: boolean) => {
    const targetJobs = suspend ? suspendableJobs : unsuspendableJobs;
    if (targetJobs.length === 0) return;
    setBulkModalState({
      isOpen: true,
      actionType: suspend ? 'suspend' : 'unsuspend',
    });
  };

  const handleBulkJobDelete = () => {
    if (deletableJobs.length === 0) return;
    setBulkModalState({
      isOpen: true,
      actionType: 'delete',
    });
  };

  const handleConfirmBulkJobAction = async (jobIds: number[], reason: string) => {
    try {
      setBulkActionLoading(true);
      const action = bulkModalState.actionType;

      if (action === 'delete') {
        try {
          await adminApi.bulkDeleteJobs(jobIds, reason);
        } catch {
          // Fallback to batched individual calls
          const results = await Promise.allSettled(jobIds.map((id) => adminApi.deleteJob(id, reason)));
          const failures = results.filter((r) => r.status === 'rejected');
          if (failures.length === jobIds.length) {
            throw new Error('All job deletion requests failed.');
          }
        }
      } else if (action === 'suspend') {
        try {
          await adminApi.bulkUpdateJobStatus(jobIds, 'suspended', reason);
        } catch {
          // Fallback to batched individual calls
          const results = await Promise.allSettled(jobIds.map((id) => adminApi.suspendJob(id, reason)));
          const failures = results.filter((r) => r.status === 'rejected');
          if (failures.length === jobIds.length) {
            throw new Error('All job suspension requests failed.');
          }
        }
      } else if (action === 'unsuspend') {
        try {
          await adminApi.bulkUpdateJobStatus(jobIds, 'open', reason);
        } catch {
          // Fallback to batched individual calls
          const results = await Promise.allSettled(jobIds.map((id) => adminApi.unsuspendJob(id, reason)));
          const failures = results.filter((r) => r.status === 'rejected');
          if (failures.length === jobIds.length) {
            throw new Error('All job unsuspend requests failed.');
          }
        }
      }

      setSelectedJobIds(new Set());
      setBulkModalState((prev) => ({ ...prev, isOpen: false }));
      await fetchJobs(true);

      const actionLabel = action === 'delete' ? 'archived' : action === 'suspend' ? 'suspended' : 'unsuspended and restored to open status';
      setAlertState({
        open: true,
        title: 'Bulk Action Successful',
        message: `Successfully ${actionLabel} ${jobIds.length} job post${jobIds.length === 1 ? '' : 's'}.`,
        onConfirm: () => setAlertState((s) => ({ ...s, open: false })),
      });
    } catch (err: any) {
      setAlertState({
        open: true,
        title: 'Bulk Action Failed',
        message: 'An error occurred during bulk operation: ' + (err.response?.data?.message || err.message),
        onConfirm: () => setAlertState((s) => ({ ...s, open: false })),
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  if (loading) return (
    <div className="animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-ink">Job Posts</h1>
          <p className="text-xs text-ink-muted mt-0.5">Monitor and moderate active job postings on the platform.</p>
        </div>
      </div>
      <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-xs border border-ink-faint/30 overflow-hidden mt-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left font-body table-fixed border-collapse">
            <thead className="bg-slate-50/70 border-b border-ink-faint/30">
              <tr>
                {['Job Details', 'Employer', 'Applicants', 'Posted Date', 'Status', ''].map((h) => (
                  <th key={h} className="px-4 py-3 font-body font-semibold text-ink-muted text-[11px] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-faint/20">
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-4 py-3"><div className="h-4 bg-ink-faint/30 rounded w-3/4 mb-1.5" /><div className="h-3 bg-ink-faint/20 rounded w-1/2" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-ink-faint/30 rounded w-2/3" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-ink-faint/30 rounded w-8 mx-auto" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-ink-faint/30 rounded w-20 mx-auto" /></td>
                  <td className="px-4 py-3"><div className="h-5 bg-ink-faint/30 rounded-full w-16 mx-auto" /></td>
                  <td className="px-4 py-3"><div className="h-6 bg-ink-faint/30 rounded w-12 ml-auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-12 h-12 bg-status-error/10 rounded-full flex items-center justify-center mb-3">
        <i className="lni lni-warning text-xl text-status-error" />
      </div>
      <h2 className="text-base font-body font-bold text-ink mb-1">Failed to load jobs</h2>
      <p className="text-ink-muted font-body text-xs mb-4">{error}</p>
      <button
        onClick={() => fetchJobs()}
        className="px-4 py-2 bg-ink text-white font-body font-semibold rounded-lg hover:bg-ink-soft transition-colors text-xs cursor-pointer"
      >
        Retry
      </button>
    </div>
  );

  return (
    <>
      <div className="animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-ink">Job Posts</h1>
            <p className="text-xs text-ink-muted mt-0.5">
              Monitor and moderate active job postings on the platform.
            </p>
          </div>
        </div>

        {/* 6 Stat Cards: Total, Open, In Progress, Completed, Cancelled, Suspended & Archived */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-4">
          <StatCard title="Total Posts" value={activeJobs.length + archivedJobs.length} iconClass="lni lni-briefcase" bg="from-slate-100 to-slate-200" iconColor="text-slate-700" onClick={() => setStatusFilter('All')} />
          <StatCard title="Open" value={activeJobs.filter(j => j.status === 'open').length} iconClass="lni lni-play" bg="from-emerald-50 to-emerald-100" iconColor="text-emerald-700" onClick={() => setStatusFilter('Open')} />
          <StatCard title="In Progress" value={activeJobs.filter(j => j.status === 'in_progress' || j.status === 'in progress').length} iconClass="lni lni-pause" bg="from-sky-50 to-sky-100" iconColor="text-sky-700" onClick={() => setStatusFilter('In Progress')} />
          <StatCard title="Completed" value={activeJobs.filter(j => j.status === 'completed').length} iconClass="lni lni-checkmark-circle" bg="from-teal-50 to-teal-100" iconColor="text-teal-700" onClick={() => setStatusFilter('Completed')} />
          <StatCard title="Cancelled" value={activeJobs.filter(j => j.status === 'cancelled').length} iconClass="lni lni-close" bg="from-rose-50 to-rose-100" iconColor="text-rose-700" onClick={() => setStatusFilter('Cancelled')} />
          <StatCard title="Suspended & Archived" value={activeJobs.filter(j => j.status === 'suspended').length + archivedJobs.length} iconClass="lni lni-trash-can" bg="from-amber-50 to-amber-100" iconColor="text-amber-700" onClick={() => setStatusFilter(activeJobs.some(j => j.status === 'suspended') ? 'Suspended' : 'Archived')} />
        </div>

        {/* Status Switcher & Search Bar */}
        <div className="mb-4 flex flex-col md:flex-row gap-3 items-center">
          <StatusTabs
            options={["All", "Open", "In Progress", "Completed", "Cancelled", "Suspended", "Archived"]}
            activeKey={statusFilter}
            onSelect={setStatusFilter}
          />
          <div className="relative flex-1 max-w-xs group">
            <input
              type="text"
              aria-label="Search jobs"
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white/90 border border-ink-faint/40 rounded-xl focus:outline-none focus:border-ink/50 transition text-xs font-body shadow-xs"
            />
            <i className="lni lni-search text-ink-muted absolute left-3 top-1/2 transform -translate-y-1/2 text-xs" />
          </div>

          <button
            onClick={handleExportCSV}
            aria-label="Export jobs as CSV"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-ink-faint/40 shadow-2xs hover:bg-slate-900 hover:text-white text-ink-soft transition font-body font-bold text-xs cursor-pointer"
            title="Export filtered job postings as CSV"
          >
            <i className="lni lni-download text-xs" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Table layout (fixed w-full to prevent shifts) */}
        <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-xs border border-ink-faint/30 overflow-hidden mt-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left font-body table-fixed border-collapse">
              <thead className="bg-slate-50/70 border-b border-ink-faint/30">
                <tr>
                  <th className="px-3 py-3 w-[4%] text-center">
                    <input
                      type="checkbox"
                      aria-label="Select all jobs"
                      checked={isAllJobsSelected}
                      onChange={handleToggleSelectAllJobs}
                      className="w-4 h-4 rounded border-ink-faint text-primary focus:ring-primary/30 cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3 font-body font-semibold text-ink-muted text-[11px] uppercase tracking-wider w-[30%]">Job Details</th>
                  <th className="px-4 py-3 font-body font-semibold text-ink-muted text-[11px] uppercase tracking-wider w-[18%]">Employer</th>
                  <th className="px-4 py-3 font-body font-semibold text-ink-muted text-[11px] uppercase tracking-wider w-[10%] text-center">Applicants</th>
                  <th className="px-4 py-3 font-body font-semibold text-ink-muted text-[11px] uppercase tracking-wider w-[12%] text-center">Posted Date</th>
                  <th className="px-4 py-3 font-body font-semibold text-ink-muted text-[11px] uppercase tracking-wider w-[12%] text-center">Status</th>
                  <th className="px-4 py-3 font-body font-semibold text-ink-muted text-[11px] uppercase tracking-wider w-[13%] text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-faint/20">
                {paginatedJobs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-ink-soft">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-12 h-12 bg-ink-faint/30 rounded-full flex items-center justify-center mb-3">
                          <i className="lni lni-briefcase text-xl text-ink-muted" />
                        </div>
                        <p className="text-sm font-semibold">No active job posts found.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedJobs.map((job) => {
                    const isSelected = selectedJobIds.has(job.id);
                    return (
                    <tr
                      key={job.id}
                      onClick={() => setSelectedDetailJob(job)}
                      className={`transition-colors duration-150 cursor-pointer ${
                        isSelected ? 'bg-primary/10 hover:bg-primary/15' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Select job ${job.title}`}
                          checked={isSelected}
                          onChange={() => handleToggleSelectJob(job.id)}
                          className="w-4 h-4 rounded border-ink-faint text-primary focus:ring-primary/30 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-body font-bold text-ink text-sm flex items-center flex-wrap gap-1.5">
                          <span>{job.title}</span>
                          {job.reports_count > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-status-error/10 text-status-error border border-status-error/20 animate-pulse">
                              ⚠️ {job.reports_count} {job.reports_count === 1 ? 'report' : 'reports'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center text-[11px] text-ink-muted mt-1.5 flex-wrap gap-2">
                          <span className="px-2 py-0.5 rounded bg-accent-sky text-primary-dark font-body font-semibold border border-white/50">{job.category}</span>
                          <span className="flex items-center bg-white/50 px-2 py-0.5 rounded border border-white/50">
                            <i className="lni lni-map-marker mr-1 text-primary" /> {job.barangay}, {job.municipality}
                          </span>
                        </div>
                        <div className="flex items-center text-[11px] text-ink-soft mt-1.5 gap-2 flex-wrap">
                          <span className="font-numeric font-bold text-ink bg-primary-soft/40 px-2 py-0.5 rounded border border-primary/10">
                            ₱{(parseFloat(job.compensation) || 0).toFixed(2)} <span className="text-[10px] text-ink-muted font-normal">/ {
                              job.rate_unit === 'per_hour' ? 'hour' :
                              job.rate_unit === 'per_project' ? 'project' :
                              job.rate_unit === 'per_piece' ? 'piece' :
                              job.rate_unit === 'per_day' ? 'day' :
                              job.duration_type || 'day'
                            }</span>
                          </span>
                          <span className="text-[10px] text-ink-soft font-body font-semibold bg-white/40 px-2 py-0.5 rounded border border-ink-faint/30">Slots: {(job.filled_slots ?? job.accepted_count) ?? 0}/{job.slots}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent-peach to-accent-peachBright/50 flex items-center justify-center text-primary-dark font-body font-bold text-xs shadow-inner mr-2.5 flex-shrink-0">
                            {(job.employer?.name || 'Deleted Account').charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-body font-bold text-ink text-xs truncate">{job.employer?.name || 'Deleted Account'}</div>
                            <div className="text-[10px] text-ink-soft truncate mt-0.5">{job.employer?.email || ''}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center text-xs font-bold text-ink">
                        {job.applications_count ?? 0}
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-ink-soft font-numeric">
                        {formatDate(job.created_at)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-body font-bold uppercase tracking-wide inline-block ${
                          job.deleted_at
                            ? 'bg-status-error/15 text-status-error border border-status-error/20'
                            : (STATUS_BADGE_MAP[job.status] ?? DEFAULT_BADGE_CLASS)
                        }`}>
                          {job.deleted_at ? 'Archived' : job.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end space-x-1.5">
                          {job.deleted_at ? (
                            <button
                              disabled={actionLoading === job.id}
                              onClick={() => handleRestore(job.id)}
                              className="p-1.5 rounded-lg bg-white border border-ink-faint/40 text-status-success hover:bg-status-success hover:text-white hover:border-status-success transition-all shadow-xs cursor-pointer"
                              title="Restore Job Post"
                            >
                              <i className="lni lni-reload text-xs" />
                            </button>
                          ) : (
                            <>
                              <button
                                disabled={actionLoading === job.id}
                                onClick={() => handleSuspendToggle(job.id, job.status)}
                                className={`p-1.5 rounded-lg border transition-all shadow-xs group cursor-pointer ${
                                  job.status === 'suspended'
                                    ? 'bg-status-success/10 text-status-success hover:bg-status-success hover:text-white border-status-success/30'
                                    : 'bg-status-warning/10 text-status-warning hover:bg-status-warning hover:text-white border-status-warning/30'
                                }`}
                                title={job.status === 'suspended' ? "Unsuspend Job Post" : "Suspend Job Post"}
                              >
                                <i className={`${job.status === 'suspended' ? 'lni lni-play' : 'lni lni-pause'} text-xs`} />
                              </button>
                              <button
                                disabled={actionLoading === job.id}
                                onClick={() => handleDelete(job.id)}
                                className="p-1.5 rounded-lg bg-white border border-ink-faint/40 text-status-error hover:bg-status-error hover:text-white hover:border-status-error transition-all shadow-xs cursor-pointer"
                                title="Soft Delete Job Post"
                              >
                                <i className="lni lni-trash-can text-xs" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center mt-6 space-x-4">
            <button
              onClick={goToPrev}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-xs font-body font-bold rounded-lg bg-white/80 backdrop-blur-md border border-ink-faint/30 disabled:opacity-50 hover:bg-white transition-colors"
            >
              Previous
            </button>
            <span className="text-xs text-ink-soft font-body font-semibold">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={goToNext}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-xs font-body font-bold rounded-lg bg-white/80 backdrop-blur-md border border-ink-faint/30 disabled:opacity-50 hover:bg-white transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Job Details Modal - Centered modal matching UserDetailDrawer */}
      {selectedDetailJob && (
        <JobDetailModal
          job={selectedDetailJob}
          onClose={() => setSelectedDetailJob(null)}
          onSuspendToggle={handleSuspendToggle}
          onDelete={handleDelete}
          onRestore={handleRestore}
          actionLoading={actionLoading}
          onRefresh={() => fetchJobs(true)}
        />
      )}

      {/* Floating Bulk Actions Bar */}
      {selectedJobIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-ink text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/20 animate-fade-in backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold font-numeric">
              {selectedJobIds.size}
            </span>
            <span className="text-xs font-body font-semibold whitespace-nowrap">
              {selectedJobIds.size === 1 ? 'job' : 'jobs'} selected
            </span>
          </div>
          <div className="h-4 w-px bg-white/20" />
          <div className="flex items-center gap-2">
            {suspendableJobs.length > 0 && (
              <button
                onClick={() => handleBulkJobSuspendToggle(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-white border border-amber-500/30 text-xs font-body font-bold transition-all cursor-pointer whitespace-nowrap"
              >
                Bulk Suspend {suspendableJobs.length !== selectedJobsList.length ? `(${suspendableJobs.length})` : ''}
              </button>
            )}
            {unsuspendableJobs.length > 0 && (
              <button
                onClick={() => handleBulkJobSuspendToggle(false)}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-white border border-emerald-500/30 text-xs font-body font-bold transition-all cursor-pointer whitespace-nowrap"
              >
                Bulk Unsuspend {unsuspendableJobs.length !== selectedJobsList.length ? `(${unsuspendableJobs.length})` : ''}
              </button>
            )}
            {deletableJobs.length > 0 && (
              <button
                onClick={handleBulkJobDelete}
                className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white border border-rose-500/30 text-xs font-body font-bold transition-all cursor-pointer whitespace-nowrap"
              >
                Bulk Delete {deletableJobs.length !== selectedJobsList.length ? `(${deletableJobs.length})` : ''}
              </button>
            )}
            {suspendableJobs.length === 0 && unsuspendableJobs.length === 0 && deletableJobs.length === 0 && (
              <span className="text-xs text-white/70 italic px-2 whitespace-nowrap">
                No bulk actions applicable
              </span>
            )}
            <button
              onClick={handleDeselectAllJobs}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-xs font-body font-medium transition-all cursor-pointer ml-1 whitespace-nowrap"
            >
              Deselect
            </button>
          </div>
        </div>
      )}

      {bulkModalState.isOpen && (
        <BulkJobActionModal
          isOpen={bulkModalState.isOpen}
          actionType={bulkModalState.actionType}
          selectedJobs={
            bulkModalState.actionType === 'suspend'
              ? suspendableJobs
              : bulkModalState.actionType === 'unsuspend'
              ? unsuspendableJobs
              : deletableJobs
          }
          onClose={() => setBulkModalState((prev) => ({ ...prev, isOpen: false }))}
          onConfirm={handleConfirmBulkJobAction}
          loading={bulkActionLoading}
        />
      )}

      <AlertDialog
        isOpen={alertState.open}
        title={alertState.title}
        message={alertState.message}
        onConfirm={() => {
          alertState.onConfirm();
          setAlertState(s => ({...s, open: false}));
        }}
        onCancel={() => setAlertState(s => ({...s, open: false}))}
        confirmText="Confirm"
        cancelText="Cancel"
      />

      <UndoToast
        action={activeAction}
        secondsRemaining={secondsRemaining}
        onUndo={handleUndo}
        onDismiss={handleDismissNow}
      />
    </>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 font-body text-ink-muted">Loading jobs...</div>}>
      <JobsPageContent />
    </Suspense>
  );
}
