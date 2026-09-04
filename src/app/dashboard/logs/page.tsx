'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { Download } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { useDebounce } from '@/hooks/useDebounce';
import { AlertDialog } from '@/components/AlertDialog';
import { formatDate } from '@/lib/date';
import { ACTION_TYPES, DEFAULT_ACTION_BADGE } from '@/lib/constants';
import { exportTableToCSV, formatCSVDate } from '@/lib/export/csv';

function LogsPageContent() {
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get('search') || '';

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
  });

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Sync search query from URL query parameter
  useEffect(() => {
    setSearchTerm(urlSearch);
    setCurrentPage(1);
  }, [urlSearch]);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminApi.getLogs(
        currentPage,
        debouncedSearchTerm,
        actionFilter,
        dateFrom || undefined,
        dateTo || undefined
      );
      setLogs(res.data.data || []);
      setTotalPages(res.data.last_page || 1);
    } catch (err: any) {
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearchTerm, actionFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const getActionBadgeColor = (action: string) => {
    const style = ACTION_TYPES[action] ?? DEFAULT_ACTION_BADGE;
    return `${style.bg} ${style.text} border-transparent`;
  };

  const formatActionName = (action: string) => {
    return action
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  // Convert current logs list to CSV and trigger browser download
  const handleExportCSV = () => {
    if (logs.length === 0) {
      setAlertState({
        isOpen: true,
        title: 'Export Failed',
        message: 'No logs available to export.',
      });
      return;
    }

    const headers = [
      'Log ID',
      'Timestamp',
      'Administrator Name',
      'Administrator Email',
      'Action Code',
      'Target Entity',
      'Target ID',
      'Activity Description'
    ];

    const rows = logs.map(log => [
      log.id,
      formatCSVDate(log.created_at),
      log.admin?.name || 'System Admin',
      log.admin?.email || 'N/A',
      formatActionName(log.action),
      log.target_type || log.target_name || '-',
      log.target_id || '',
      log.description || ''
    ]);

    exportTableToCSV(
      `sikap_audit_logs_${new Date().toISOString().slice(0, 10)}`,
      headers,
      rows
    );
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

        <div className="flex flex-wrap items-center gap-3 mt-6 md:mt-0">
          <button
            onClick={handleExportCSV}
            className="flex items-center px-4 py-2 bg-primary text-white rounded-xl font-body font-semibold hover:bg-primary-dark transition-colors shadow-sm text-sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
          
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-64 group">
            <input
              type="text"
              placeholder="Search description..."
              aria-label="Search description"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-white/80 backdrop-blur-md rounded-xl border border-ink-faint/30 shadow-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary transition text-sm font-body"
            />
            <i className="lni lni-search text-ink-muted absolute left-3.5 top-1/2 transform -translate-y-1/2" />
          </form>
        </div>
      </div>

      {/* Date Range Inputs & Action Filter */}
      <div className="flex flex-wrap gap-4 items-center mb-6 font-body">
        <div className="flex items-center space-x-2 bg-white/50 border border-ink-faint/50 px-3 py-1.5 rounded-xl">
          <span className="text-xs text-ink-soft font-semibold">From:</span>
          <input
            type="date"
            aria-label="From date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
            className="bg-transparent text-sm text-ink outline-none border-none font-semibold cursor-pointer"
          />
        </div>

        <div className="flex items-center space-x-2 bg-white/50 border border-ink-faint/50 px-3 py-1.5 rounded-xl">
          <span className="text-xs text-ink-soft font-semibold">To:</span>
          <input
            type="date"
            aria-label="To date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
            className="bg-transparent text-sm text-ink outline-none border-none font-semibold cursor-pointer"
          />
        </div>

        <select
          value={actionFilter}
          aria-label="Filter by action"
          onChange={(e) => {
            setActionFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="px-4 py-2 rounded-xl font-body font-semibold text-sm transition-colors whitespace-nowrap bg-white/70 backdrop-blur-md border border-white/50 text-ink-soft focus:bg-white outline-none"
        >
          <option value="">All Actions</option>
          {Object.keys(ACTION_TYPES).map(act => (
            <option key={act} value={act}>{formatActionName(act)}</option>
          ))}
        </select>
      </div>

      {/* Table Section */}
      <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-white/50 overflow-hidden transition-all hover:shadow-lg">
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
            <table className="w-full text-left font-body table-fixed border-collapse">
              <thead className="bg-white/50 border-b border-ink-faint/50">
                <tr>
                  <th className="px-6 py-4 font-body font-semibold text-ink-soft text-xs uppercase tracking-wider w-[15%]">Timestamp</th>
                  <th className="px-6 py-4 font-body font-semibold text-ink-soft text-xs uppercase tracking-wider w-[22%]">Administrator</th>
                  <th className="px-6 py-4 font-body font-semibold text-ink-soft text-xs uppercase tracking-wider w-[15%]">Action</th>
                  <th className="px-6 py-4 font-body font-semibold text-ink-soft text-xs uppercase tracking-wider w-[18%]">Target</th>
                  <th className="px-6 py-4 font-body font-semibold text-ink-soft text-xs uppercase tracking-wider w-[30%]">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-faint/30">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                          <i className="lni lni-shield text-2xl text-primary" />
                        </div>
                        <h3 className="font-display text-lg text-ink font-bold">No Logs</h3>
                        <p className="font-body text-ink-soft mt-1.5 text-sm">No admin audit logs match your query.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/60 transition-colors duration-200">
                      <td className="px-6 py-4 text-xs text-ink-soft whitespace-nowrap font-numeric">
                        <div className="flex items-center text-ink-muted">
                          <i className="lni lni-calendar mr-1.5 text-primary text-xs" />
                          {formatDate(log.created_at)} {new Date(log.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <Avatar name={log.admin?.name || 'System Admin'} url={log.admin?.avatar_url} size="sm" className="mr-2.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="font-body font-bold text-ink text-xs truncate">{log.admin?.name || 'System Admin'}</div>
                            <div className="text-[10px] text-ink-soft truncate mt-0.5">{log.admin?.email || 'system@sikap.app'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-body font-semibold border ${getActionBadgeColor(log.action)}`}>
                          {formatActionName(log.action)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-ink truncate">
                        {log.target_name || '-'}
                      </td>
                      <td className="px-6 py-4 text-ink font-body font-medium text-xs leading-relaxed">
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

      {/* Pagination Controls */}
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
        isOpen={alertState.isOpen}
        title={alertState.title}
        message={alertState.message}
        onConfirm={() => setAlertState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

export default function LogsPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 font-body text-ink-muted">Loading audit logs...</div>}>
      <LogsPageContent />
    </Suspense>
  );
}
