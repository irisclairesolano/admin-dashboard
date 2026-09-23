'use client';

import React, { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { adminApi } from '@/lib/api';
import StatCard from '@/components/StatCard';
import StatusTabs from '@/components/StatusTabs';
import { AlertDialog } from '@/components/AlertDialog';
import { formatDate } from '@/lib/date';
import { STATUS_BADGE_MAP, DEFAULT_BADGE_CLASS } from '@/lib/constants';
import { exportMultiSectionCSV, formatCSVDate, formatCSVCurrency, formatCSVStatus, calculateNormalizedHourlyWage } from '@/lib/export/csv';

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
      j.employer?.name || '',
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
        ['Report Classification:', 'Official SIKAP Employment Record'],
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
    setAlertState({
      open: true,
      title: 'Delete Job Post',
      message: 'Are you sure you want to soft delete this job post? It will be removed from public view.',
      onConfirm: async () => {
        const previousActive = [...activeJobs];
        const previousArchived = [...archivedJobs];
        const target = activeJobs.find(j => j.id === id);
        setActiveJobs(prev => prev.filter(j => j.id !== id));
        if (target) {
          setArchivedJobs(prev => [{ ...target, deleted_at: new Date().toISOString() }, ...prev]);
        }
        if (selectedDetailJob?.id === id) {
          setSelectedDetailJob(null);
        }
        
        try {
          setActionLoading(id);
          await adminApi.deleteJob(id);
          await fetchJobs(true);
        } catch (err: any) {
          setActiveJobs(previousActive);
          setArchivedJobs(previousArchived);
          setAlertState({
            open: true,
            title: 'Error',
            message: 'Failed to delete job: ' + (err.response?.data?.message || err.message),
            onConfirm: () => {},
          });
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const handleRestore = (id: number) => {
    setAlertState({
      open: true,
      title: 'Restore Job Post',
      message: 'Are you sure you want to restore this job post? It will become visible again on the platform.',
      onConfirm: async () => {
        const previousArchived = [...archivedJobs];
        const previousActive = [...activeJobs];
        const target = archivedJobs.find(j => j.id === id);
        setArchivedJobs(prev => prev.filter(j => j.id !== id));
        if (target) {
          setActiveJobs(prev => [{ ...target, deleted_at: null }, ...prev]);
        }
        if (selectedDetailJob?.id === id) {
          setSelectedDetailJob(null);
        }

        try {
          setActionLoading(id);
          await adminApi.restoreJob(id);
          await fetchJobs(true);
        } catch (err: any) {
          setArchivedJobs(previousArchived);
          setActiveJobs(previousActive);
          setAlertState({
            open: true,
            title: 'Error',
            message: 'Failed to restore job: ' + (err.response?.data?.message || err.message),
            onConfirm: () => {},
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
    const actionText = isSuspended ? 'unsuspend' : 'suspend';

    setAlertState({
      open: true,
      title: `${isSuspended ? 'Unsuspend' : 'Suspend'} Job Post`,
      message: `Are you sure you want to ${actionText} this job post?`,
      onConfirm: async () => {
        const previousActive = [...activeJobs];
        setActiveJobs(prev =>
          prev.map(j => (j.id === id ? { ...j, status: newStatus } : j))
        );
        if (selectedDetailJob?.id === id) {
          setSelectedDetailJob((prev: any) => prev ? { ...prev, status: newStatus } : null);
        }

        try {
          setActionLoading(id);
          await adminApi.updateJobStatus(id, newStatus);
          await fetchJobs(true);
        } catch (err: any) {
          setActiveJobs(previousActive);
          if (selectedDetailJob?.id === id) {
            setSelectedDetailJob((prev: any) => prev ? { ...prev, status: currentStatus } : null);
          }
          setAlertState({
            open: true,
            title: 'Error',
            message: `Failed to ${actionText} job: ` + (err.response?.data?.message || err.message),
            onConfirm: () => {},
          });
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const filteredJobs = currentJobList.filter(j => {
    const matchesSearch =
      (j.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (j.employer?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (j.category || '').toLowerCase().includes(searchTerm.toLowerCase());
    
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
          <StatCard title="Total Posts" value={activeJobs.length + archivedJobs.length} iconClass="lni lni-briefcase" onClick={() => setStatusFilter('All')} />
          <StatCard title="Open" value={activeJobs.filter(j => j.status === 'open').length} iconClass="lni lni-play" onClick={() => setStatusFilter('Open')} />
          <StatCard title="In Progress" value={activeJobs.filter(j => j.status === 'in_progress' || j.status === 'in progress').length} iconClass="lni lni-pause" onClick={() => setStatusFilter('In Progress')} />
          <StatCard title="Completed" value={activeJobs.filter(j => j.status === 'completed').length} iconClass="lni lni-checkmark-circle" onClick={() => setStatusFilter('Completed')} />
          <StatCard title="Cancelled" value={activeJobs.filter(j => j.status === 'cancelled').length} iconClass="lni lni-close" onClick={() => setStatusFilter('Cancelled')} />
          <StatCard title="Suspended & Archived" value={activeJobs.filter(j => j.status === 'suspended').length + archivedJobs.length} iconClass="lni lni-trash-can" onClick={() => setStatusFilter(activeJobs.some(j => j.status === 'suspended') ? 'Suspended' : 'Archived')} />
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
                  <th className="px-4 py-3 font-body font-semibold text-ink-muted text-[11px] uppercase tracking-wider w-[32%]">Job Details</th>
                  <th className="px-4 py-3 font-body font-semibold text-ink-muted text-[11px] uppercase tracking-wider w-[18%]">Employer</th>
                  <th className="px-4 py-3 font-body font-semibold text-ink-muted text-[11px] uppercase tracking-wider w-[10%] text-center">Applicants</th>
                  <th className="px-4 py-3 font-body font-semibold text-ink-muted text-[11px] uppercase tracking-wider w-[12%] text-center">Posted Date</th>
                  <th className="px-4 py-3 font-body font-semibold text-ink-muted text-[11px] uppercase tracking-wider w-[14%] text-center">Status</th>
                  <th className="px-4 py-3 font-body font-semibold text-ink-muted text-[11px] uppercase tracking-wider w-[14%] text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-faint/20">
                {paginatedJobs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-ink-soft">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-12 h-12 bg-ink-faint/30 rounded-full flex items-center justify-center mb-3">
                          <i className="lni lni-briefcase text-xl text-ink-muted" />
                        </div>
                        <p className="text-sm font-semibold">No active job posts found.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedJobs.map((job) => (
                    <tr
                      key={job.id}
                      onClick={() => setSelectedDetailJob(job)}
                      className="hover:bg-slate-50/70 transition-colors duration-150 cursor-pointer"
                    >
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
                            {(job.employer?.name || 'U').charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-body font-bold text-ink text-xs truncate">{job.employer?.name || 'Unknown'}</div>
                            <div className="text-[10px] text-ink-soft truncate mt-0.5">{job.employer?.email}</div>
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
                  ))
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
