'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { adminApi } from '@/lib/api';
import Tooltip from '@/components/Tooltip';
import { AlertDialog } from '@/components/AlertDialog';

function ReportsPageContent() {
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

  // Sync search query from URL query parameter
  useEffect(() => {
    setSearchTerm(urlSearch);
    setCurrentPage(1);
  }, [urlSearch]);

  const fetchReports = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await adminApi.getReports(statusFilter, currentPage);
      setReports(res.data.data || []);
      setTotalPages(res.data.last_page || 1);
    } catch (err: any) {
      if (!silent) setError(err.message || 'Failed to load reports');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [statusFilter, currentPage]);

  useEffect(() => {
    fetchReports(false);
  }, [fetchReports]);

  useEffect(() => {
    const timer = setInterval(() => fetchReports(true), 30000);
    return () => clearInterval(timer);
  }, [fetchReports]);

  const handleResolve = (id: number, status: 'resolved' | 'dismissed') => {
    setAlertState({
      open: true,
      title: 'Confirm Action',
      message: `Are you sure you want to mark this report as ${status}?`,
      onConfirm: async () => {
        try {
          setActionLoading(id);
          await adminApi.resolveReport(id, status);
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
                    <tr key={report.id} className="hover:bg-white/60 transition-colors duration-200">
                      <td className="px-8 py-5">
                        <span className="px-3 py-1 rounded-md text-[10px] font-body font-bold tracking-wide uppercase bg-gradient-to-r from-ink to-ink-soft text-white shadow-sm inline-block truncate max-w-full">
                          {report.reportable_type}
                        </span>
                        <div className="mt-1.5 text-[10px] font-numeric font-bold text-ink-soft bg-white/50 inline-block px-2 py-0.5 rounded border border-ink-faint">
                          ID: {report.reportable_id}
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
                        {new Date(report.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-8 py-5 text-right">
                        {statusFilter === 'open' ? (
                          <div className="flex justify-end space-x-2">
                            <Tooltip text="Dismiss Report" position="top">
                              <button
                                disabled={actionLoading === report.id}
                                onClick={() => handleResolve(report.id, 'dismissed')}
                                className="p-1.5 rounded-lg bg-white/80 border border-ink-faint/50 text-ink-soft hover:text-ink hover:border-ink hover:bg-paper transition-all shadow-sm"
                                title="Dismiss Report"
                              >
                                <i className="lni lni-close text-xs" />
                              </button>
                            </Tooltip>
                            <Tooltip text="Mark as Resolved" position="top" variant="success">
                              <button
                                disabled={actionLoading === report.id}
                                onClick={() => handleResolve(report.id, 'resolved')}
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
            className="px-3 py-1.5 text-xs font-body font-bold rounded-lg bg-white/80 backdrop-blur-md border border-ink-faint/30 disabled:opacity-50 hover:bg-white transition-colors"
          >
            Previous
          </button>
          <span className="text-xs text-ink-soft font-body font-semibold">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 text-xs font-body font-bold rounded-lg bg-white/80 backdrop-blur-md border border-ink-faint/30 disabled:opacity-50 hover:bg-white transition-colors"
          >
            Next
          </button>
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
