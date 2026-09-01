'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { adminApi } from '@/lib/api';
import StatCard from '@/components/StatCard';
import StatusTabs from '@/components/StatusTabs';
import { AlertDialog } from '@/components/AlertDialog';
import { formatDate } from '@/lib/date';
import { STATUS_BADGE_MAP, DEFAULT_BADGE_CLASS } from '@/lib/constants';

function JobsPageContent() {
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get('search') || '';

  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedDetailJob, setSelectedDetailJob] = useState<any | null>(null);
  const [alertState, setAlertState] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({ open: false, title: '', message: '', onConfirm: () => {} });

  // Sync search from URL query param
  useEffect(() => {
    setSearchTerm(urlSearch);
  }, [urlSearch]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getJobs(false);
      setJobs(res.data.data || []);
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
        const previousJobs = [...jobs];
        setJobs(prev => prev.filter(j => j.id !== id));
        if (selectedDetailJob?.id === id) {
          setSelectedDetailJob(null);
        }
        
        try {
          setActionLoading(id);
          await adminApi.deleteJob(id);
          await fetchJobs();
        } catch (err: any) {
          setJobs(previousJobs);
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

  const handleSuspendToggle = (id: number, currentStatus: string) => {
    const isSuspended = currentStatus === 'suspended';
    const newStatus = isSuspended ? 'open' : 'suspended';
    const actionText = isSuspended ? 'unsuspend' : 'suspend';

    setAlertState({
      open: true,
      title: `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Job Post`,
      message: `Are you sure you want to ${actionText} this job post?`,
      onConfirm: async () => {
        const previousJobs = [...jobs];
        setJobs(prev => prev.map(j => j.id === id ? { ...j, status: newStatus } : j));
        if (selectedDetailJob?.id === id) {
          setSelectedDetailJob((prev: any) => prev ? { ...prev, status: newStatus } : null);
        }

        try {
          setActionLoading(id);
          await adminApi.updateJobStatus(id, newStatus);
          await fetchJobs();
        } catch (err: any) {
          setJobs(previousJobs);
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

  const filteredJobs = jobs.filter(j => {
    const matchesSearch =
      j.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (j.employer?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (j.category || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'All' || j.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
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
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-display text-transparent bg-clip-text bg-gradient-to-r from-ink to-primary-dark font-bold">Job Posts</h1>
          <p className="text-ink-soft font-body mt-2 text-lg">Monitor and moderate active job postings on the platform.</p>
        </div>
      </div>
      <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-white/50 overflow-hidden mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body table-fixed border-collapse">
            <thead className="bg-white/50 border-b border-ink-faint/50">
              <tr>
                {['Job Details', 'Employer', 'Applicants', 'Posted Date', 'Status', ''].map((h) => (
                  <th key={h} className="px-6 py-4 font-body font-semibold text-ink-soft text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-faint/30">
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-6 py-4"><div className="h-4 bg-ink-faint/30 rounded w-3/4 mb-2" /><div className="h-3 bg-ink-faint/20 rounded w-1/2" /></td>
                  <td className="px-6 py-4"><div className="h-4 bg-ink-faint/30 rounded w-2/3" /></td>
                  <td className="px-6 py-4"><div className="h-4 bg-ink-faint/30 rounded w-8 mx-auto" /></td>
                  <td className="px-6 py-4"><div className="h-4 bg-ink-faint/30 rounded w-20 mx-auto" /></td>
                  <td className="px-6 py-4"><div className="h-5 bg-ink-faint/30 rounded-full w-16 mx-auto" /></td>
                  <td className="px-6 py-4"><div className="h-6 bg-ink-faint/30 rounded w-12 ml-auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 bg-status-error/10 rounded-full flex items-center justify-center mb-4">
        <i className="lni lni-warning text-2xl text-status-error" />
      </div>
      <h2 className="text-lg font-body font-bold text-ink mb-2">Failed to load jobs</h2>
      <p className="text-ink-soft font-body text-sm mb-6">{error}</p>
      <button
        onClick={fetchJobs}
        className="px-5 py-2.5 bg-ink text-white font-body font-semibold rounded-xl hover:bg-ink-soft transition-colors text-sm"
      >
        Retry
      </button>
    </div>
  );

  return (
    <>
      <div className="animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-display text-transparent bg-clip-text bg-gradient-to-r from-ink to-primary-dark font-bold">Job Posts</h1>
            <p className="text-ink-soft font-body mt-2 text-lg">
              Monitor and moderate active job postings on the platform.
            </p>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard title="Total Posts" value={jobs.length} iconClass="lni lni-briefcase" onClick={() => setStatusFilter('All')} />
          <StatCard title="Open" value={jobs.filter(j => j.status === 'open').length} iconClass="lni lni-play" onClick={() => setStatusFilter('Open')} />
          <StatCard title="In Progress" value={jobs.filter(j => j.status === 'in_progress' || j.status === 'in progress').length} iconClass="lni lni-pause" onClick={() => setStatusFilter('In Progress')} />
          <StatCard title="Suspended" value={jobs.filter(j => j.status === 'suspended').length} iconClass="lni lni-warning" onClick={() => setStatusFilter('Suspended')} />
        </div>

        {/* Status Switcher & Search Bar */}
        <div className="mb-6 flex flex-col md:flex-row gap-4 items-center">
          <StatusTabs
            options={["All", "Open", "In Progress", "Completed", "Cancelled", "Suspended"]}
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
              className="w-full pl-10 pr-4 py-2 bg-white/80 backdrop-blur-md border border-ink-faint/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition"
            />
            <i className="lni lni-search text-ink-muted absolute left-3.5 top-1/2 transform -translate-y-1/2" />
          </div>
        </div>

        {/* Table layout (fixed w-full to prevent shifts) */}
        <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-white/50 overflow-hidden transition-all hover:shadow-lg mt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body table-fixed border-collapse">
              <thead className="bg-white/50 border-b border-ink-faint/50">
                <tr>
                  <th className="px-6 py-4 font-body font-semibold text-ink-soft text-xs uppercase tracking-wider w-[32%]">Job Details</th>
                  <th className="px-6 py-4 font-body font-semibold text-ink-soft text-xs uppercase tracking-wider w-[18%]">Employer</th>
                  <th className="px-6 py-4 font-body font-semibold text-ink-soft text-xs uppercase tracking-wider w-[10%] text-center">Applicants</th>
                  <th className="px-6 py-4 font-body font-semibold text-ink-soft text-xs uppercase tracking-wider w-[12%] text-center">Posted Date</th>
                  <th className="px-6 py-4 font-body font-semibold text-ink-soft text-xs uppercase tracking-wider w-[14%] text-center">Status</th>
                  <th className="px-6 py-4 font-body font-semibold text-ink-soft text-xs uppercase tracking-wider w-[14%] text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-faint/30">
                {paginatedJobs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-ink-soft">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-ink-faint/30 rounded-full flex items-center justify-center mb-4">
                          <i className="lni lni-briefcase text-2xl text-ink-muted" />
                        </div>
                        <p className="text-base font-semibold">No active job posts found.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedJobs.map((job) => (
                    <tr
                      key={job.id}
                      onClick={() => setSelectedDetailJob(job)}
                      className="hover:bg-white/60 transition-colors duration-200 cursor-pointer"
                    >
                      <td className="px-6 py-4">
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
                            ₱{(parseFloat(job.compensation) || 0).toFixed(2)} <span className="text-[10px] text-ink-muted font-normal">/ {job.duration_type}</span>
                          </span>
                          <span className="text-[10px] text-ink-soft font-body font-semibold bg-white/40 px-2 py-0.5 rounded border border-ink-faint/30">Slots: {job.slots}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
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

                      <td className="px-6 py-4 text-center text-xs font-bold text-ink">
                        {job.applications_count ?? 0}
                      </td>
                      <td className="px-6 py-4 text-center text-xs text-ink-soft font-numeric">
                        {formatDate(job.created_at)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-body font-bold uppercase tracking-wide shadow-sm inline-block ${STATUS_BADGE_MAP[job.status] ?? DEFAULT_BADGE_CLASS}`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end space-x-2">
                          <button
                            disabled={actionLoading === job.id}
                            onClick={() => handleSuspendToggle(job.id, job.status)}
                            className={`p-1.5 rounded-lg border transition-all shadow-sm group ${
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
                            className="p-1.5 rounded-lg bg-white/80 border border-ink-faint/50 text-status-error hover:bg-status-error hover:text-white hover:border-status-error transition-all shadow-sm"
                            title="Soft Delete Job Post"
                          >
                            <i className="lni lni-trash-can text-xs" />
                          </button>
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

      {/* Right-Side Fixed Drawer (Glassmorphic details panel) */}
      {selectedDetailJob && (
        <>
          <div 
            className="fixed inset-0 bg-ink/20 backdrop-blur-sm z-40 transition-opacity animate-fade-in"
            onClick={() => setSelectedDetailJob(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="job-drawer-title"
            tabIndex={-1}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setSelectedDetailJob(null);
            }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white/95 backdrop-blur-xl border-l border-white/50 shadow-2xl flex flex-col h-screen transform transition-transform duration-300 translate-x-0 animate-slide-in"
          >
            {/* Header */}
            <div className="p-6 border-b border-ink-faint/30 bg-paper/30 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-mono font-bold text-primary uppercase bg-primary/10 px-2.5 py-1 rounded">
                  #{selectedDetailJob.id}
                </span>
                <h2 id="job-drawer-title" className="font-display text-xl text-ink font-bold mt-2 leading-tight">{selectedDetailJob.title}</h2>
              </div>
              <button
                onClick={() => setSelectedDetailJob(null)}
                className="w-8 h-8 flex items-center justify-center hover:bg-paper rounded-full text-ink-muted hover:text-ink transition-colors"
                aria-label="Close details"
              >
                <i className="lni lni-close text-xs" />
              </button>
            </div>

            {/* Content list */}
            <div className="p-6 flex-1 overflow-y-auto space-y-5 font-body">
              <div>
                <span className="block text-[10px] font-bold text-ink-muted uppercase tracking-wider">Employer</span>
                <div className="flex items-center mt-2 p-3 bg-white/50 rounded-xl border border-white/50">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-peach to-accent-peachBright/50 flex items-center justify-center text-primary-dark font-body font-bold text-sm shadow-inner mr-3 flex-shrink-0">
                    {(selectedDetailJob.employer?.name || 'U').charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-ink text-sm truncate">{selectedDetailJob.employer?.name || 'Unknown'}</h4>
                    <p className="text-[10px] text-ink-soft mt-0.5 truncate">{selectedDetailJob.employer?.email}</p>
                  </div>
                </div>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-ink-muted uppercase tracking-wider">Job Details</span>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div className="p-3 bg-white/50 rounded-xl border border-white/50">
                    <span className="block text-[9px] font-bold text-ink-muted uppercase tracking-wide">Compensation</span>
                    <span className="text-sm font-bold text-status-success mt-1 block">
                      ₱{(parseFloat(selectedDetailJob.compensation) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      <span className="text-[9px] text-ink-muted font-normal"> / {selectedDetailJob.duration_type || 'job'}</span>
                    </span>
                  </div>
                  <div className="p-3 bg-white/50 rounded-xl border border-white/50">
                    <span className="block text-[9px] font-bold text-ink-muted uppercase tracking-wide">Slots filled</span>
                    <span className="text-sm font-bold text-ink mt-1 block">
                      {selectedDetailJob.accepted_count ?? 0} / {selectedDetailJob.slots}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">Location</span>
                <div className="flex items-center gap-2 p-3 bg-white/50 rounded-xl border border-white/50 text-xs font-semibold text-ink">
                  <i className="lni lni-map-marker text-primary text-sm" />
                  <span>Brgy. {selectedDetailJob.barangay}, {selectedDetailJob.municipality}</span>
                </div>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">Posted & Status</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-white/50 rounded-xl border border-white/50">
                    <span className="block text-[9px] font-bold text-ink-muted uppercase tracking-wide">Posted Date</span>
                    <span className="text-xs font-semibold text-ink mt-1 block">
                      {formatDate(selectedDetailJob.created_at)}
                    </span>
                  </div>
                  <div className="p-3 bg-white/50 rounded-xl border border-white/50">
                    <span className="block text-[9px] font-bold text-ink-muted uppercase tracking-wide">Status</span>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${
                      selectedDetailJob.status === 'open' ? 'bg-status-success/20 text-status-success border border-status-success/30' :
                      selectedDetailJob.status === 'suspended' ? 'bg-status-warning/20 text-status-warning border border-status-warning/30' :
                      'bg-ink-faint/50 text-ink-soft border border-ink-faint'
                    }`}>
                      {selectedDetailJob.status}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">Description</span>
                <p className="text-xs text-ink-soft leading-relaxed bg-white/50 p-3 rounded-xl border border-white/50 whitespace-pre-line">
                  {selectedDetailJob.description}
                </p>
              </div>

              {selectedDetailJob.tools_required && (
                <div>
                  <span className="block text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">Tools Required</span>
                  <p className="text-xs text-ink-soft bg-white/50 p-3 rounded-xl border border-white/50">
                    {selectedDetailJob.tools_required}
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
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
