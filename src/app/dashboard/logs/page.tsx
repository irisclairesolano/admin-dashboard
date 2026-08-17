'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { ShieldCheck, Search, Calendar, ArrowLeft, ArrowRight } from 'lucide-react';

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getLogs(currentPage, searchTerm, actionFilter);
      setLogs(res.data.data || []);
      setTotalPages(res.data.last_page || 1);
    } catch (err: any) {
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, actionFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchLogs();
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'approve_user':
        return 'bg-status-success/10 text-status-success border-status-success/20';
      case 'reject_user':
      case 'suspend_user':
      case 'delete_user':
        return 'bg-status-error/10 text-status-error border-status-error/20';
      case 'unsuspend_user':
      case 'restore_user':
        return 'bg-accent-mint/10 text-accent-mintDeep border-accent-mint/20';
      case 'resolve_report':
        return 'bg-accent-sky/10 text-accent-skyDeep border-accent-sky/20';
      default:
        return 'bg-ink-faint/50 text-ink-soft border-ink-faint/80';
    }
  };

  const formatActionName = (action: string) => {
    return action
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  if (error) return <div className="text-center py-20 text-status-error font-body">{error}</div>;

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-display text-transparent bg-clip-text bg-gradient-to-r from-ink to-primary-dark font-bold">Audit Logs</h1>
          <p className="text-ink-soft font-body mt-2 text-lg">
            Track administrator actions and system activities.
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} className="mt-6 md:mt-0 relative w-full md:w-80 group">
          <input
            type="text"
            placeholder="Search description and press Enter..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white/70 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm focus:bg-white focus:border-primary/50 focus:ring-4 focus:ring-primary/10 outline-none font-body transition-all group-hover:shadow-md"
          />
          <Search className="w-5 h-5 text-ink-muted absolute left-4 top-4 transition-colors group-focus-within:text-primary" />
        </form>
      </div>

      <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="px-4 py-2 rounded-xl font-body font-semibold text-sm transition-colors whitespace-nowrap bg-white/70 backdrop-blur-md border border-white/50 text-ink-soft focus:bg-white outline-none"
        >
          <option value="">All Actions</option>
          <option value="approve_user">Approve User</option>
          <option value="reject_user">Reject User</option>
          <option value="suspend_user">Suspend User</option>
          <option value="unsuspend_user">Unsuspend User</option>
          <option value="delete_user">Delete User</option>
          <option value="restore_user">Restore User</option>
          <option value="resolve_report">Resolve Report</option>
          <option value="dismiss_report">Dismiss Report</option>
          <option value="reply_support">Reply Support Ticket</option>
          <option value="update_support_status">Update Support Status</option>
        </select>
      </div>

      <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-white/50 overflow-hidden transition-all hover:shadow-lg">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-ink-faint/30 rounded-2xl animate-pulse flex items-center justify-between px-6">
                <div className="w-1/4 h-6 bg-ink-faint/50 rounded-lg"></div>
                <div className="w-1/2 h-6 bg-ink-faint/50 rounded-lg"></div>
                <div className="w-1/6 h-6 bg-ink-faint/50 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body">
              <thead className="bg-white/50 border-b border-ink-faint/50">
                <tr>
                  <th className="px-8 py-5 font-body font-semibold text-ink-soft text-sm uppercase tracking-wider">Timestamp</th>
                  <th className="px-8 py-5 font-body font-semibold text-ink-soft text-sm uppercase tracking-wider">Administrator</th>
                  <th className="px-8 py-5 font-body font-semibold text-ink-soft text-sm uppercase tracking-wider">Action</th>
                  <th className="px-8 py-5 font-body font-semibold text-ink-soft text-sm uppercase tracking-wider">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-faint/30">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-24 h-24 bg-primary-soft rounded-full flex items-center justify-center mb-6 shadow-inner animate-pulse-slow">
                          <ShieldCheck className="w-12 h-12 text-primary-dark" />
                        </div>
                        <h3 className="font-display text-2xl text-ink">No Logs</h3>
                        <p className="font-body text-ink-soft mt-3 text-lg">No admin audit logs match your query.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/60 transition-colors duration-200">
                      <td className="px-8 py-5 text-sm text-ink-soft whitespace-nowrap">
                        <div className="flex items-center text-ink-muted">
                          <Calendar className="w-4 h-4 mr-2" />
                          {new Date(log.created_at).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-paper-cream to-ink-faint flex items-center justify-center text-ink font-body font-bold text-sm shadow-inner mr-3 overflow-hidden">
                            {log.admin?.avatar_url ? (
                              <img src={log.admin.avatar_url} alt={log.admin.name} className="h-full w-full object-cover" />
                            ) : (
                              (log.admin?.name || 'A').charAt(0)
                            )}
                          </div>
                          <div>
                            <div className="font-body font-bold text-ink">{log.admin?.name || 'System Admin'}</div>
                            <div className="text-xs text-ink-soft mt-0.5">{log.admin?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-lg text-xs font-body font-semibold border ${getActionBadgeColor(log.action)}`}>
                          {formatActionName(log.action)}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-ink font-body font-medium max-w-md">
                        {log.description}
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
        <div className="flex items-center justify-between mt-6 px-4">
          <p className="text-sm font-body text-ink-soft">
            Page <span className="font-semibold text-ink">{currentPage}</span> of{' '}
            <span className="font-semibold text-ink">{totalPages}</span>
          </p>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2.5 rounded-xl border border-ink-faint/50 bg-white/70 text-ink hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2.5 rounded-xl border border-ink-faint/50 bg-white/70 text-ink hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
