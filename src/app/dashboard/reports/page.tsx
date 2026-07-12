'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { Flag, CheckCircle, XCircle } from 'lucide-react';

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getReports();
      setReports(res.data.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

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

  if (loading) return <div className="text-center py-20 font-body text-ink-muted">Loading reports...</div>;
  if (error) return <div className="text-center py-20 text-status-error font-body">{error}</div>;

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-4xl font-display text-transparent bg-clip-text bg-gradient-to-r from-ink to-primary-dark font-bold">Content Reports</h1>
        <p className="text-ink-soft font-body mt-2 text-lg">
          Review and resolve community reports for jobs, users, or applications.
        </p>
      </div>

      <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-white/50 overflow-hidden transition-all hover:shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body">
            <thead className="bg-white/50 border-b border-ink-faint/50">
              <tr>
                <th className="px-8 py-5 font-body-semibold text-ink-soft text-sm uppercase tracking-wider">Target / Type</th>
                <th className="px-8 py-5 font-body-semibold text-ink-soft text-sm uppercase tracking-wider">Reported By</th>
                <th className="px-8 py-5 font-body-semibold text-ink-soft text-sm uppercase tracking-wider">Reason / Description</th>
                <th className="px-8 py-5 font-body-semibold text-ink-soft text-sm uppercase tracking-wider">Reported At</th>
                <th className="px-8 py-5 font-body-semibold text-ink-soft text-sm uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-faint/30">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-24 h-24 bg-status-success/10 rounded-full flex items-center justify-center mb-6 shadow-inner animate-pulse-slow">
                        <Flag className="w-12 h-12 text-status-success" />
                      </div>
                      <h3 className="font-display text-2xl text-ink">All Clear!</h3>
                      <p className="font-body text-ink-soft mt-3 text-lg">No open reports found. Everything is good!</p>
                    </div>
                  </td>
                </tr>
              ) : reports.map((report) => (
                <tr key={report.id} className="hover:bg-white/60 transition-colors duration-200">
                  <td className="px-8 py-5">
                    <span className="px-4 py-1.5 rounded-full text-xs font-body-bold tracking-wide uppercase bg-gradient-to-r from-ink to-ink-soft text-white shadow-sm">
                      {report.reportable_type}
                    </span>
                    <div className="mt-2 text-sm font-body-medium text-ink-soft bg-white/50 inline-block px-2.5 py-1 rounded border border-ink-faint">
                      ID: {report.reportable_id}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-paper-cream to-ink-faint flex items-center justify-center text-ink font-body-bold text-sm shadow-inner mr-3">
                        {(report.reporter?.name || 'U').charAt(0)}
                      </div>
                      <div>
                        <div className="font-body-bold text-ink">{report.reporter?.name || 'Unknown'}</div>
                        <div className="text-xs text-ink-soft mt-0.5">{report.reporter?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 max-w-xs">
                    <div className="font-body-bold text-ink truncate text-base capitalize" title={report.type}>
                      {report.type.replace('_', ' ')}
                    </div>
                    <div className="text-sm text-ink-muted truncate mt-1" title={report.description}>
                      {report.description}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-sm font-body-medium text-ink-soft">
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
    </div>
  );
}
