'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import Tooltip from '@/components/Tooltip';
import { AlertDialog } from '@/components/AlertDialog';
import { humanizeModel } from '@/lib/constants';
import { formatDate } from '@/lib/date';
import { usePolling } from '@/hooks/usePolling';
import { exportTableToCSV, formatCSVDate } from '@/lib/export/csv';

function ReportsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get('search') || '';

  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'open' | 'resolved' | 'dismissed'>('open');
  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [alertState, setAlertState] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const handleExportCSV = () => {
    if (!reports || reports.length === 0) {
      setAlertState({
        open: true,
        title: 'Export Empty',
        message: 'No moderation reports available to export.',
        onConfirm: () => setAlertState(s => ({ ...s, open: false })),
      });
      return;
    }

    const headers = [
      'Report ID',
      'Violation Type',
      'Target Model',
      'Target ID',
      'Reporter Name',
      'Reporter Role',
      'Description',
      'Status',
      'Date Reported',
      'Date Resolved'
    ];

    const rows = filteredReports.map((r) => [
      r.id,
      r.type,
      r.reportable_type,
      r.reportable_id,
      r.reporter?.name || '',
      r.reporter?.role || '',
      r.description,
      r.status,
      formatCSVDate(r.created_at),
      formatCSVDate(r.resolved_at)
    ]);

    exportTableToCSV(
      `sikap_reports_${new Date().toISOString().slice(0, 10)}`,
      headers,
      rows
    );
  };

  // Sync search query from URL query parameter
  useEffect(() => {
    setSearchTerm(urlSearch);
    setCurrentPage(1);
  }, [urlSearch]);

  const fetchReports = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await adminApi.getReports(statusFilter, currentPage, searchTerm);
      setReports(res.data.data || []);
      setTotalPages(res.data.last_page || 1);
    } catch (err: any) {
      if (!silent) setError(err.message || 'Failed to load reports');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [statusFilter, currentPage, searchTerm]);

  useEffect(() => {
    fetchReports(false);
  }, [fetchReports]);

  usePolling(() => fetchReports(true), 30000);

  const handleResolve = (id: number, status: 'resolved' | 'dismissed') => {
    setAlertState({
      open: true,
      title: 'Confirm Action',
      message: `Are you sure you want to mark this report as ${status}?`,
      onConfirm: async () => {
        try {
          setActionLoading(id);
          await adminApi.resolveReport(id, status);
          if (selectedReport && selectedReport.id === id) {
            setSelectedReport(null);
          }
          await fetchReports(true);
        } catch (err: any) {
          setAlertState({
            open: true,
            title: 'Error',
            message: 'Failed to update report status: ' + (err.response?.data?.message || err.message),
            onConfirm: () => {},
          });
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const handleModerateTarget = (targetType: string, targetId: number) => {
    const isJob = targetType.toLowerCase().includes('job');
    const actionName = isJob ? 'Delete / Suspend Job Post' : 'Suspend User Account';

    setAlertState({
      open: true,
      title: `Confirm: ${actionName}`,
      message: `Are you sure you want to take disciplinary action on ${isJob ? `Job #${targetId}` : `User #${targetId}`}?`,
      onConfirm: async () => {
        try {
          setActionLoading(targetId);
          if (isJob) {
            await adminApi.deleteJob(targetId);
          } else {
            await adminApi.suspendUser(targetId);
          }
          // Also automatically resolve the report
          if (selectedReport) {
            await adminApi.resolveReport(selectedReport.id, 'resolved');
            setSelectedReport(null);
          }
          await fetchReports(true);
        } catch (err: any) {
          setAlertState({
            open: true,
            title: 'Action Failed',
            message: 'Could not moderate target: ' + (err.response?.data?.message || err.message),
            onConfirm: () => {},
          });
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const filteredReports = reports.filter((r) =>
    (r.reporter?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.reportable_type || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (error) return <div className="text-center py-20 text-status-error font-body">{error}</div>;

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-display text-transparent bg-clip-text bg-gradient-to-r from-ink to-primary-dark font-bold">Reported Content</h1>
          <p className="text-ink-soft font-body mt-2 text-lg">
            Review and take action on content flagged by the community.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-6 md:mt-0">
          <div className="relative w-full md:w-64 group">
            <input
              type="text"
              aria-label="Search reports"
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-white/70 backdrop-blur-md rounded-xl border border-white/50 shadow-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary transition text-sm font-body"
            />
            <i className="lni lni-search text-ink-muted absolute left-3.5 top-1/2 transform -translate-y-1/2" />
          </div>

          <div className="relative">
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="appearance-none pl-4 pr-10 py-2.5 rounded-xl font-body font-semibold text-sm transition-colors bg-white/70 backdrop-blur-md border border-white/50 text-ink-soft focus:bg-white outline-none shadow-sm cursor-pointer"
            >
              <option value="open">Open Reports</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
            <i className="lni lni-chevron-down absolute right-3.5 top-1/2 transform -translate-y-1/2 text-ink-muted pointer-events-none" />
          </div>

          <button
            onClick={handleExportCSV}
            aria-label="Export reports as CSV"
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white/70 backdrop-blur-md rounded-xl border border-white/50 shadow-sm hover:bg-slate-900 hover:text-white text-ink-soft transition font-body font-bold text-xs cursor-pointer"
            title="Export filtered reports list as CSV"
          >
            <i className="lni lni-download text-xs" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => fetchReports(false)}
            aria-label="Refresh reports list"
            className="p-2.5 bg-white/70 backdrop-blur-md rounded-xl border border-white/50 shadow-sm hover:bg-white text-ink-soft hover:text-primary transition flex items-center justify-center cursor-pointer"
            title="Refresh list"
          >
            <i className={`lni lni-reload text-sm ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-white/50 overflow-hidden transition-all hover:shadow-lg">
        {loading && reports.length === 0 ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-ink-faint/30 rounded-2xl animate-pulse flex items-center justify-between px-6">
                <div className="w-1/3 h-6 bg-ink-faint/50 rounded-lg"></div>
                <div className="w-1/6 h-6 bg-ink-faint/50 rounded-lg"></div>
                <div className="w-1/4 h-8 bg-ink-faint/50 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body table-fixed border-collapse">
              <thead className="bg-white/50 border-b border-ink-faint/50">
                <tr>
                  <th className="px-8 py-5 font-body font-semibold text-ink-soft text-sm uppercase tracking-wider w-[15%]">Target / Type</th>
                  <th className="px-8 py-5 font-body font-semibold text-ink-soft text-sm uppercase tracking-wider w-[22%]">Reported By</th>
                  <th className="px-8 py-5 font-body font-semibold text-ink-soft text-sm uppercase tracking-wider w-[33%]">Reason / Description</th>
                  <th className="px-8 py-5 font-body font-semibold text-ink-soft text-sm uppercase tracking-wider w-[15%]">Reported At</th>
                  <th className="px-8 py-5 font-body font-semibold text-ink-soft text-sm uppercase tracking-wider w-[15%] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-faint/30">
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-status-success/10 rounded-full flex items-center justify-center mb-4">
                          <i className="lni lni-flag text-2xl text-status-success" />
                        </div>
                        <h3 className="font-display text-lg text-ink font-bold">All Clear!</h3>
                        <p className="font-body text-ink-soft mt-1.5 text-sm">No reports found matching your criteria.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((report) => (
                    <tr
                      key={report.id}
                      onClick={() => setSelectedReport(report)}
                      className="hover:bg-primary/5 transition-colors duration-200 cursor-pointer group"
                    >
                      <td className="px-8 py-5">
                        <span className="px-3 py-1 rounded-md text-[10px] font-body font-bold tracking-wide uppercase bg-gradient-to-r from-ink to-ink-soft text-white shadow-sm inline-block truncate max-w-full">
                          {humanizeModel(report.reportable_type)}
                        </span>
                        <div className="mt-1.5 text-[10px] font-numeric font-bold text-ink-soft bg-white/50 inline-block px-2 py-0.5 rounded border border-ink-faint">
                          ID: #{report.reportable_id}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-paper-cream to-ink-faint flex items-center justify-center text-ink font-body font-bold text-xs shadow-inner mr-2.5 flex-shrink-0">
                            {(report.reporter?.name || 'U').charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-body font-bold text-ink text-xs truncate">{report.reporter?.name || 'Unknown'}</div>
                            <div className="text-[10px] text-ink-soft truncate mt-0.5">{report.reporter?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="font-body font-bold text-ink text-xs truncate capitalize" title={report.type}>
                          {report.type.replace(/_/g, ' ')}
                        </div>
                        <div className="text-xs text-ink-muted mt-1 leading-relaxed truncate" title={report.description}>
                          {report.description}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-xs font-body font-medium text-ink-soft whitespace-nowrap font-numeric">
                        {formatDate(report.created_at)}
                      </td>
                      <td className="px-8 py-5 text-right">
                        {statusFilter === 'open' ? (
                          <div className="flex justify-end items-center space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedReport(report);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-ink group-hover:bg-primary text-white font-body font-bold text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                            >
                              <i className="lni lni-shield text-xs" />
                              <span>Take Action</span>
                            </button>
                            <Tooltip text="Dismiss Report" position="top">
                              <button
                                disabled={actionLoading === report.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleResolve(report.id, 'dismissed');
                                }}
                                className="p-1.5 rounded-lg bg-white/80 border border-ink-faint/50 text-ink-soft hover:text-ink hover:border-ink hover:bg-paper transition-all shadow-sm"
                                title="Dismiss Report"
                              >
                                <i className="lni lni-close text-xs" />
                              </button>
                            </Tooltip>
                            <Tooltip text="Mark as Resolved" position="top" variant="success">
                              <button
                                disabled={actionLoading === report.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleResolve(report.id, 'resolved');
                                }}
                                className="p-1.5 rounded-lg bg-status-success/10 border border-status-success/20 text-status-success hover:bg-status-success hover:text-white transition-all shadow-sm"
                                title="Mark as Resolved"
                              >
                                <i className="lni lni-checkmark-circle text-xs" />
                              </button>
                            </Tooltip>
                          </div>
                        ) : (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-body font-semibold border ${
                            statusFilter === 'resolved' ? 'bg-status-success/15 text-status-success border-status-success/20' : 'bg-ink-faint text-ink-soft border-ink-faint/45'
                          }`}>
                            {statusFilter}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center mt-6 space-x-4">
          <button
            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 text-xs font-body font-bold rounded-lg bg-white/80 backdrop-blur-md border border-ink-faint/30 disabled:opacity-50 hover:bg-white transition-colors cursor-pointer"
          >
            Previous
          </button>
          <span className="text-xs text-ink-soft font-body font-semibold">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 text-xs font-body font-bold rounded-lg bg-white/80 backdrop-blur-md border border-ink-faint/30 disabled:opacity-50 hover:bg-white transition-colors cursor-pointer"
          >
            Next
          </button>
        </div>
      )}

      {/* ── Report Action & Review Modal ──────────────────────── */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-white/60 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-ink-faint/30 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-md text-xs font-body font-bold tracking-wide uppercase bg-status-error text-white shadow-sm">
                    Report #{selectedReport.id}
                  </span>
                  <span className="text-xs font-body font-semibold text-ink-muted">
                    {formatDate(selectedReport.created_at)}
                  </span>
                </div>
                <h3 className="font-display font-bold text-2xl text-ink mt-2">
                  Review Reported {humanizeModel(selectedReport.reportable_type)}
                </h3>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="w-9 h-9 rounded-full bg-paper hover:bg-ink-faint flex items-center justify-center text-ink-muted hover:text-ink transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <i className="lni lni-close text-sm" />
              </button>
            </div>

            {/* Reporter Info */}
            <div className="p-4 bg-paper/40 rounded-2xl border border-ink-faint/30 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center shadow-inner text-sm">
                  {(selectedReport.reporter?.name || 'U').charAt(0)}
                </div>
                <div>
                  <div className="text-xs text-ink-muted font-body">Reported by</div>
                  <div className="text-sm font-body font-bold text-ink">{selectedReport.reporter?.name || 'Anonymous User'}</div>
                  <div className="text-xs text-ink-soft">{selectedReport.reporter?.email}</div>
                </div>
              </div>
              <span className="text-xs font-mono font-bold bg-white px-2.5 py-1 rounded-lg border border-ink-faint text-ink-soft">
                Reporter ID: #{selectedReport.reporter?.id || 'N/A'}
              </span>
            </div>

            {/* Violation & Complaint Message */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-body font-bold text-ink-soft uppercase tracking-wider">Violation Category</label>
                <div className="mt-1.5 inline-block px-3 py-1.5 rounded-xl bg-status-error/10 border border-status-error/20 text-status-error font-body font-bold text-sm capitalize">
                  {selectedReport.type?.replace(/_/g, ' ') || 'Flagged Content'}
                </div>
              </div>

              <div>
                <label className="text-xs font-body font-bold text-ink-soft uppercase tracking-wider">Complaint Description</label>
                <div className="mt-1.5 p-4 rounded-2xl bg-paper/60 border border-ink-faint/40 text-sm font-body text-ink leading-relaxed">
                  {selectedReport.description || 'No additional explanation provided by the reporter.'}
                </div>
              </div>
            </div>

            {/* Target Information & Navigation Link */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-paper to-white border border-ink-faint/50 mb-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-body font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
                  <i className="lni lni-target text-primary" />
                  Target Item Details
                </div>
                <span className="text-xs font-numeric font-bold bg-ink-faint px-2 py-0.5 rounded text-ink-soft">
                  Target ID: #{selectedReport.reportable_id}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const isJob = selectedReport.reportable_type?.toLowerCase().includes('job');
                    if (isJob) {
                      router.push(`/dashboard/jobs?search=${selectedReport.reportable_id}`);
                    } else {
                      router.push(`/dashboard/users?search=${selectedReport.reportable_id}`);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-paper text-ink font-body font-bold text-xs border border-ink-faint/60 transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <i className="lni lni-popup text-xs text-primary" />
                  Inspect in {selectedReport.reportable_type?.toLowerCase().includes('job') ? 'Jobs Manager' : 'Users Manager'}
                </button>

                <button
                  type="button"
                  onClick={() => handleModerateTarget(selectedReport.reportable_type, selectedReport.reportable_id)}
                  disabled={actionLoading !== null}
                  className="px-4 py-2 rounded-xl bg-status-error/10 hover:bg-status-error text-status-error hover:text-white font-body font-bold text-xs border border-status-error/30 transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <i className="lni lni-ban text-xs" />
                  {selectedReport.reportable_type?.toLowerCase().includes('job') ? 'Suspend / Remove Job' : 'Suspend User Account'}
                </button>
              </div>
            </div>

            {/* Report Resolution Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-ink-faint/30">
              <button
                type="button"
                disabled={actionLoading === selectedReport.id}
                onClick={() => handleResolve(selectedReport.id, 'dismissed')}
                className="flex-1 py-3 px-4 rounded-2xl bg-paper hover:bg-ink-faint text-ink font-body font-bold text-sm border border-ink-faint/50 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <i className="lni lni-close text-xs" />
                Dismiss (No Violation)
              </button>
              <button
                type="button"
                disabled={actionLoading === selectedReport.id}
                onClick={() => handleResolve(selectedReport.id, 'resolved')}
                className="flex-1 py-3 px-4 rounded-2xl bg-status-success hover:bg-emerald-600 text-white font-body font-bold text-sm transition-all shadow-md shadow-status-success/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <i className="lni lni-checkmark-circle text-base" />
                Mark Resolved (Action Completed)
              </button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog
        isOpen={alertState.open}
        title={alertState.title}
        message={alertState.message}
        onConfirm={() => {
          alertState.onConfirm();
          setAlertState(s => ({ ...s, open: false }));
        }}
        onCancel={() => setAlertState(s => ({ ...s, open: false }))}
        confirmText="Confirm"
        cancelText="Cancel"
      />
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 font-body text-ink-muted">Loading reports...</div>}>
      <ReportsPageContent />
    </Suspense>
  );
}
