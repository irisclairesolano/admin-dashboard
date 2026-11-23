'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { authStorage } from '@/lib/authStorage';
import { Download } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { useDebounce } from '@/hooks/useDebounce';
import { AlertDialog } from '@/components/AlertDialog';
import { formatDate } from '@/lib/date';
import { ACTION_TYPES, DEFAULT_ACTION_BADGE } from '@/lib/constants';
import { exportMultiSectionCSV, formatCSVDate } from '@/lib/export/csv';
import { useToast } from '@/context/ToastContext';

function LogsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get('search') || '';

  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [actionFilter, setActionFilter] = useState('');
  const [adminNameFilter, setAdminNameFilter] = useState('');
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
  const debouncedAdminName = useDebounce(adminNameFilter, 300);
  const { toast } = useToast();

  // Client-side role guard: Super Admin only
  useEffect(() => {
    try {
      const user = authStorage.getUser<{ admin_role?: string }>();
      if (!user || user.admin_role !== 'superadmin') {
        setIsAuthorized(false);
        router.replace('/dashboard');
        return;
      }
      setIsAuthorized(true);
    } catch {
      setIsAuthorized(false);
      router.replace('/dashboard');
    }
  }, [router]);

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
        dateTo || undefined,
        false,
        debouncedAdminName || undefined
      );
      setLogs(res.data.data || []);
      setTotalPages(res.data.last_page || 1);
    } catch (err: any) {
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearchTerm, actionFilter, dateFrom, dateTo, debouncedAdminName]);

  useEffect(() => {
    if (isAuthorized) {
      fetchLogs();
    }
  }, [fetchLogs, isAuthorized]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setActionFilter('');
    setAdminNameFilter('');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  const hasActiveFilters = !!(searchTerm || actionFilter || adminNameFilter || dateFrom || dateTo);

  const getActionBadgeColor = (action: string) => {
    const style = ACTION_TYPES[action] ?? DEFAULT_ACTION_BADGE;
    return `${style.bg} ${style.text} border-transparent`;
  };

  const formatActionName = (action: string) => {
    return action
      .replace(/\./g, ' ')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  // Convert current or all matching logs list to CSV or Excel and trigger browser download
  const handleExport = async (format: 'csv' | 'xlsx') => {
    try {
      setExporting(true);
      const res = await adminApi.getLogs(
        1,
        debouncedSearchTerm,
        actionFilter,
        dateFrom || undefined,
        dateTo || undefined,
        true, // all matching logs
        debouncedAdminName || undefined
      );
      const exportLogs = res.data?.data || logs;
      if (exportLogs.length === 0) {
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

      const rows = exportLogs.map((log: any) => [
        log.id,
        formatCSVDate(log.created_at),
        log.admin?.name || 'System Admin',
        log.admin?.email || 'N/A',
        formatActionName(log.action),
        log.target_name && log.target_name !== '-' ? log.target_name : (log.target_type ? `${log.target_type.split('\\').pop()} #${log.target_id || ''}` : '-'),
        log.target_id || '',
        log.description || ''
      ]);

      const filename = `sikap_audit_logs_${new Date().toISOString().slice(0, 10)}`;
      const title = 'SIKAP Administrative Activity Audit Trail';
      const metadata: [string, string][] = [
        ['Generated On:', formatCSVDate(new Date().toISOString())],
        ['Report Type:', 'Activity Audit Trail'],
        ['Total Audit Events:', String(exportLogs.length)],
        ['Action Filter:', actionFilter ? formatActionName(actionFilter) : 'ALL ACTIONS'],
      ];
      const sections = [{ title: 'Administrative Logs', headers, rows }];

      if (format === 'xlsx') {
        const { exportMultiSectionExcel } = await import('@/lib/export/excel');
        await exportMultiSectionExcel(filename, title, metadata, sections);
        toast.success(`Exported ${exportLogs.length} audit log record(s) to Excel.`, 'Excel Export Ready');
      } else {
        exportMultiSectionCSV(filename, title, metadata, sections);
        toast.success(`Exported ${exportLogs.length} audit log record(s) to CSV.`, 'CSV Export Ready');
      }
    } catch (err: any) {
      setAlertState({
        isOpen: true,
        title: 'Export Error',
        message: err.message || 'Failed to export audit logs.',
      });
    } finally {
      setExporting(false);
    }
  };

  if (isAuthorized === false) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
        <div className="w-16 h-16 bg-status-error/10 rounded-full flex items-center justify-center mb-4">
          <i className="lni lni-shield text-2xl text-status-error" />
        </div>
        <h2 className="text-lg font-body font-bold text-ink mb-2">Access Denied</h2>
        <p className="text-ink-soft font-body text-sm mb-6">Super Admin privileges are required to access Audit Logs. Redirecting to dashboard...</p>
      </div>
    );
  }

  if (isAuthorized === null) {
    return null;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 bg-status-error/10 rounded-full flex items-center justify-center mb-3">
          <i className="lni lni-warning text-xl text-status-error" />
        </div>
        <h2 className="text-base font-body font-bold text-ink dark:text-slate-100 mb-1">Failed to load audit logs</h2>
        <p className="text-ink-muted dark:text-slate-400 font-body text-xs mb-4">{error}</p>
        <button
          type="button"
          onClick={() => { setError(''); fetchLogs(); }}
          className="px-4 py-2 bg-ink dark:bg-primary text-white font-body font-semibold rounded-lg hover:bg-ink-soft transition-colors text-xs cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-ink dark:text-slate-100 tracking-tight">Audit Logs</h1>
          <p className="text-xs sm:text-sm text-ink-muted dark:text-slate-400 mt-1">
            Track administrator actions and system activities.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={() => handleExport('xlsx')}
            disabled={exporting}
            className="btn-export gap-1.5"
            title="Export audit logs as styled Excel (.xlsx)"
          >
            <Download className="w-3.5 h-3.5" />
            {exporting ? 'Exporting...' : 'Excel (.xlsx)'}
          </button>
          
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-64 group">
            <input
              type="text"
              placeholder="Search activity, admin, or target..."
              aria-label="Search audit logs"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="input-admin w-full pl-9 pr-8"
            />
            <i className="lni lni-search text-ink-muted absolute left-3 top-1/2 transform -translate-y-1/2 text-xs" />
            {searchTerm && (
              <button
                type="button"
                onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink dark:text-slate-400 dark:hover:text-white p-0.5 rounded-md transition-colors cursor-pointer"
              >
                <i className="lni lni-close text-xs" />
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Date Range Inputs & Action Filter & Admin Filter */}
      <div className="flex flex-wrap gap-2.5 items-center font-body text-xs">
        <div className="flex items-center space-x-2 bg-white/90 dark:bg-slate-900/90 border border-ink-faint/40 dark:border-slate-700 px-3 h-9 rounded-xl shadow-2xs">
          <span className="text-xs text-ink-muted dark:text-slate-400 font-semibold">From:</span>
          <input
            type="date"
            aria-label="From date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
            className="bg-transparent text-xs text-ink dark:text-slate-100 outline-none border-none font-medium cursor-pointer"
          />
        </div>

        <div className="flex items-center space-x-2 bg-white/90 dark:bg-slate-900/90 border border-ink-faint/40 dark:border-slate-700 px-3 h-9 rounded-xl shadow-2xs">
          <span className="text-xs text-ink-muted dark:text-slate-400 font-semibold">To:</span>
          <input
            type="date"
            aria-label="To date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
            className="bg-transparent text-xs text-ink dark:text-slate-100 outline-none border-none font-medium cursor-pointer"
          />
        </div>

        <div className="flex items-center space-x-2 bg-white/90 dark:bg-slate-900/90 border border-ink-faint/40 dark:border-slate-700 px-3 h-9 rounded-xl shadow-2xs">
          <span className="text-xs text-ink-muted dark:text-slate-400 font-semibold">Admin:</span>
          <input
            type="text"
            aria-label="Filter by admin name"
            placeholder="Any admin..."
            value={adminNameFilter}
            onChange={(e) => { setAdminNameFilter(e.target.value); setCurrentPage(1); }}
            className="bg-transparent text-xs text-ink dark:text-slate-100 outline-none border-none font-medium w-32 placeholder:text-ink-muted dark:placeholder:text-slate-500 placeholder:font-normal"
          />
        </div>

        <select
          value={actionFilter}
          aria-label="Filter by action"
          onChange={(e) => {
            setActionFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="select-admin"
        >
          <option value="">All Actions</option>
          {Array.from(new Set(Object.keys(ACTION_TYPES).filter((k) => !k.includes('.')))).map((act) => (
            <option key={act} value={act}>{formatActionName(act)}</option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="btn-glass gap-1.5"
          >
            <i className="lni lni-reload text-xs" />
            Clear Filters
          </button>
        )}
      </div>

      {/* Table Section */}
      <div className="table-surface">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-ink-faint/20 rounded-xl animate-pulse flex items-center justify-between px-4">
                <div className="w-1/4 h-4 bg-ink-faint/40 rounded-lg"></div>
                <div className="w-1/2 h-4 bg-ink-faint/40 rounded-lg"></div>
                <div className="w-1/6 h-4 bg-ink-faint/40 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left font-body table-fixed border-collapse">
              <thead className="bg-slate-50/70 dark:bg-slate-900/50 border-b border-ink-faint/30">
                <tr>
                  <th className="px-4 py-3.5 font-body font-semibold text-ink-muted text-xs uppercase tracking-wider w-[15%]">Timestamp</th>
                  <th className="px-4 py-3.5 font-body font-semibold text-ink-muted text-xs uppercase tracking-wider w-[22%]">Administrator</th>
                  <th className="px-4 py-3.5 font-body font-semibold text-ink-muted text-xs uppercase tracking-wider w-[15%]">Action</th>
                  <th className="px-4 py-3.5 font-body font-semibold text-ink-muted text-xs uppercase tracking-wider w-[18%]">Target</th>
                  <th className="px-4 py-3.5 font-body font-semibold text-ink-muted text-xs uppercase tracking-wider w-[30%]">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-faint/20">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                          <i className="lni lni-shield text-xl text-primary" />
                        </div>
                        <h3 className="font-display text-base text-ink font-bold">No Logs</h3>
                        <p className="font-body text-ink-muted mt-1 text-sm">No admin audit logs match your query.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition-colors duration-150">
                      <td className="px-4 py-3.5 text-sm text-ink-soft whitespace-nowrap font-numeric">
                        <div className="flex items-center text-ink-muted">
                          <i className="lni lni-calendar mr-1.5 text-primary text-xs" />
                          {formatDate(log.created_at)} {new Date(log.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center">
                          <Avatar name={log.admin?.name || 'System Admin'} url={log.admin?.avatar_url} size="sm" className="mr-2.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="font-body font-bold text-ink text-sm truncate">{log.admin?.name || 'System Admin'}</div>
                            <div className="text-xs text-ink-muted truncate mt-0.5">{log.admin?.email || 'system@sikap.app'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-body font-medium border ${getActionBadgeColor(log.action)}`}>
                          {formatActionName(log.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm">
                        {log.target_name && log.target_name !== '-' ? (
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-ink truncate block" title={log.target_name}>
                              {log.target_name}
                            </span>
                            {log.target_id && (
                              <span className="text-xs text-ink-muted font-numeric">
                                {log.target_type ? log.target_type.split('\\').pop() : 'Entity'} #{log.target_id}
                              </span>
                            )}
                          </div>
                        ) : log.target_type ? (
                          <span className="text-ink-soft text-sm font-medium">
                            {log.target_type.split('\\').pop()} #{log.target_id || ''}
                          </span>
                        ) : (
                          <span className="text-ink-muted text-sm">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-ink font-body font-normal text-sm leading-relaxed">
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
            type="button"
            aria-label="Previous page"
            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 text-xs font-body font-bold rounded-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-ink-faint/30 dark:border-slate-700/80 disabled:opacity-50 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Previous
          </button>
          <span className="text-xs text-ink-soft dark:text-slate-300 font-body font-semibold">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            aria-label="Next page"
            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 text-xs font-body font-bold rounded-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-ink-faint/30 dark:border-slate-700/80 disabled:opacity-50 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
