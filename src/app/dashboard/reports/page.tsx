'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { Flag, CheckCircle, XCircle, Search, ArrowLeft, ArrowRight } from 'lucide-react';

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'open' | 'resolved' | 'dismissed'>('open');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getReports(statusFilter, currentPage);
      setReports(res.data.data || []);
      setTotalPages(res.data.last_page || 1);
    } catch (err: any) {
      setError(err.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, currentPage]);

  const handleResolve = async (id: number, status: 'resolved' | 'dismissed') => {
    if (!confirm(`Are you sure you want to mark this report as ${status}?`)) return;
    
    try {
      setActionLoading(id);
      await adminApi.resolveReport(id, status);
      await fetchReports();
    } catch (err: any) {
      alert('Action failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const filteredReports = reports.filter((r) => {
    const term = searchTerm.toLowerCase();
    return (
      r.type.toLowerCase().includes(term) ||
      (r.description && r.description.toLowerCase().includes(term)) ||
      (r.reporter?.name && r.reporter.name.toLowerCase().includes(term))
    );
  });

  if (loading) return <div className="text-center py-20 font-body text-ink-muted">Loading reports...</div>;
  if (error) return <div className="text-center py-20 text-status-error font-body">{error}</div>;

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-display text-transparent bg-clip-text bg-gradient-to-r from-ink to-primary-dark font-bold">Content Reports</h1>
          <p className="text-ink-soft font-body mt-2 text-lg">
            Review and resolve community reports for jobs, users, or applications.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-6 md:mt-0">
          <div className="relative w-full md:w-64 group">
            <input
              type="text"
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-12 pr-4 py-3.5 bg-white/70 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm focus:bg-white focus:border-primary/50 focus:ring-4 focus:ring-primary/10 outline-none font-body transition-all group-hover:shadow-md"
            />
            <Search className="w-5 h-5 text-ink-muted absolute left-4 top-4 transition-colors group-focus-within:text-primary" />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-4 py-3.5 rounded-xl font-body font-semibold text-sm transition-colors whitespace-nowrap bg-white/70 backdrop-blur-md border border-white/50 text-ink-soft focus:bg-white outline-none shadow-sm"
          >
            <option value="open">Open Reports</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-white/50 overflow-hidden transition-all hover:shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body">
            <thead className="bg-white/50 border-b border-ink-faint/50">
              <tr>
                <th className="px-8 py-5 font-body font-semibold text-ink-soft text-sm uppercase tracking-wider">Target / Type</th>
                <th className="px-8 py-5 font-body font-semibold text-ink-soft text-sm uppercase tracking-wider">Reported By</th>
                <th className="px-8 py-5 font-body font-semibold text-ink-soft text-sm uppercase tracking-wider">Reason / Description</th>
                <th className="px-8 py-5 font-body font-semibold text-ink-soft text-sm uppercase tracking-wider">Reported At</th>
                <th className="px-8 py-5 font-body font-semibold text-ink-soft text-sm uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-faint/30">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-24 h-24 bg-status-success/10 rounded-full flex items-center justify-center mb-6 shadow-inner animate-pulse-slow">
                        <Flag className="w-12 h-12 text-status-success" />
                      </div>
                      <h3 className="font-display text-2xl text-ink">All Clear!</h3>
                      <p className="font-body text-ink-soft mt-3 text-lg">No reports found matching your criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-white/60 transition-colors duration-200">
                  <td className="px-8 py-5">
                    <span className="px-4 py-1.5 rounded-full text-xs font-body font-bold tracking-wide uppercase bg-gradient-to-r from-ink to-ink-soft text-white shadow-sm">
                      {report.reportable_type}
                    </span>
                    <div className="mt-2 text-sm font-body font-medium text-ink-soft bg-white/50 inline-block px-2.5 py-1 rounded border border-ink-faint">
                      ID: {report.reportable_id}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-paper-cream to-ink-faint flex items-center justify-center text-ink font-body font-bold text-sm shadow-inner mr-3">
                        {(report.reporter?.name || 'U').charAt(0)}
                      </div>
                      <div>
                        <div className="font-body font-bold text-ink">{report.reporter?.name || 'Unknown'}</div>
                        <div className="text-xs text-ink-soft mt-0.5">{report.reporter?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 max-w-xs">
                    <div className="font-body font-bold text-ink truncate text-base capitalize" title={report.type}>
                      {report.type.replace('_', ' ')}
                    </div>
                    <div className="text-sm text-ink-muted truncate mt-1" title={report.description}>
                      {report.description}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-sm font-body font-medium text-ink-soft">
                    {new Date(report.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end space-x-3">
                      <button
                        disabled={actionLoading === report.id}
                        onClick={() => handleResolve(report.id, 'dismissed')}
                        className="p-2.5 rounded-xl bg-white/80 border border-ink-faint/50 text-ink-soft hover:text-ink hover:border-ink hover:bg-paper transition-all shadow-sm group"
                        title="Dismiss Report"
                      >
                        <XCircle className="w-5 h-5 transition-transform group-hover:scale-110" />
                      </button>
                      <button
                        disabled={actionLoading === report.id}
                        onClick={() => handleResolve(report.id, 'resolved')}
                        className="p-2.5 rounded-xl bg-status-success/10 border border-status-success/20 text-status-success hover:bg-status-success hover:text-white transition-all shadow-sm group"
                        title="Mark as Resolved"
                      >
                        <CheckCircle className="w-5 h-5 transition-transform group-hover:scale-110" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 px-4">
          <p className="text-sm font-body text-ink-soft">
            Page <span className="font-semibold text-ink">{currentPage}</span> of{' '}
            <span className="font-semibold text-ink">{totalPages}</span>
          </p>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2.5 rounded-xl border border-ink-faint/50 bg-white/70 text-ink hover:bg-white/95 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2.5 rounded-xl border border-ink-faint/50 bg-white/70 text-ink hover:bg-white/95 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
