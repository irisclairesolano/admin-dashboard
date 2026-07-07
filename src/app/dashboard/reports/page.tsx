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
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-display text-ink">Content Reports</h1>
        <p className="text-ink-soft font-body mt-2">
          Review and resolve community reports for jobs, users, or applications.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-ink-faint overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body">
            <thead className="bg-paper-cream border-b border-ink-faint">
              <tr>
                <th className="px-6 py-4 font-body-semibold text-ink-soft text-sm">Target / Type</th>
                <th className="px-6 py-4 font-body-semibold text-ink-soft text-sm">Reported By</th>
                <th className="px-6 py-4 font-body-semibold text-ink-soft text-sm">Reason / Description</th>
                <th className="px-6 py-4 font-body-semibold text-ink-soft text-sm">Reported At</th>
                <th className="px-6 py-4 font-body-semibold text-ink-soft text-sm text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-faint">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Flag className="w-12 h-12 text-status-success mx-auto mb-4" />
                    <p className="text-ink-muted">No open reports found. Everything is good!</p>
                  </td>
                </tr>
              ) : reports.map((report) => (
                <tr key={report.id} className="hover:bg-paper/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-md text-xs font-body-semibold capitalize bg-ink text-white">
                      {report.type}
                    </span>
                    <div className="mt-1 text-sm text-ink-soft">
                      ID: {report.target_id}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-ink-soft">
                    {report.reporter?.name || 'Unknown'} <br/>
                    <span className="text-ink-muted text-xs">{report.reporter?.email}</span>
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    <div className="font-body-medium text-ink truncate" title={report.reason}>
                      {report.reason}
                    </div>
                    <div className="text-sm text-ink-muted truncate" title={report.description}>
                      {report.description}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-ink-soft">
                    {new Date(report.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      <button
                        disabled={actionLoading === report.id}
                        onClick={() => handleResolve(report.id, 'dismissed')}
                        className="p-2 rounded-lg bg-paper text-ink hover:bg-ink hover:text-white transition-colors"
                        title="Dismiss Report"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                      <button
                        disabled={actionLoading === report.id}
                        onClick={() => handleResolve(report.id, 'resolved')}
                        className="p-2 rounded-lg bg-status-success/10 text-status-success hover:bg-status-success hover:text-white transition-colors"
                        title="Mark as Resolved"
                      >
                        <CheckCircle className="w-5 h-5" />
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
