'use client';

import { AlertDialog } from '@/components/AlertDialog';
import AdminModal from '@/components/AdminModal';
import Tooltip from '@/components/Tooltip';
import { useToast } from '@/context/ToastContext';
import { usePolling } from '@/hooks/usePolling';
import { adminApi } from '@/lib/api';
import { humanizeModel } from '@/lib/constants';
import { formatDate, formatDateTime } from '@/lib/date';
import { exportMultiSectionCSV, formatCSVDate, formatCSVStatus } from '@/lib/export/csv';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const JobDetailModal = dynamic(() => import('@/components/jobs/JobDetailModal'), {
  ssr: false,
});

function parseModerationNote(description: string) {
  if (!description) return { isAutoFlagged: false, text: '', cleanDisplay: '' };

  // 1. Standard format: Flagged Term: "..." • Source: ... • Excerpt: "..."
  const cleanMatch = description.match(
    /Flagged Term:\s*"([^"]+)"\s*•\s*Source:\s*([^•]+)\s*•\s*Excerpt:\s*"([^"]*)"/i
  );
  if (cleanMatch) {
    const term = cleanMatch[1];
    const source = cleanMatch[2].trim();
    const excerpt = cleanMatch[3];
    return {
      isAutoFlagged: true,
      term,
      source,
      excerpt,
      text: description,
      cleanDisplay: `Flagged Term: "${term}" • Source: ${source} • Excerpt: "${excerpt}"`,
    };
  }

  // 2. Legacy format: Auto-Flagged: "..." [Sender: Michaela Deticio (ID #37), Conv #15] — Content: "..."
  const legacyMatch = description.match(
    /Auto-Flagged:\s*"([^"]+)"(?:\s*\[([^\]]+)\])?\s*—\s*Content:\s*"([^"]*)"/i
  );
  if (legacyMatch) {
    const term = legacyMatch[1];
    const context = legacyMatch[2] || '';
    const excerpt = legacyMatch[3];
    let senderName = '';
    let senderId = '';
    const senderMatch = context.match(/Sender:\s*([^(,]+)(?:\(ID\s*#(\d+)\))?/i);
    if (senderMatch) {
      senderName = senderMatch[1].trim();
      senderId = senderMatch[2] || '';
    }
    const source = 'Chat Message';
    return {
      isAutoFlagged: true,
      term,
      source,
      senderName,
      senderId,
      excerpt,
      text: description,
      cleanDisplay: `Flagged Term: "${term}" • Source: ${source} • Excerpt: "${excerpt}"`,
    };
  }

  return { isAutoFlagged: false, text: description, cleanDisplay: description };
}

function ModerationPageContent() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get('search') || '';
  const inspectIdParam = searchParams.get('inspect');
  const handledInspectRef = React.useRef<string | null>(null);

  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved' | 'dismissed'>('open');
  const [openCount, setOpenCount] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);

  // Auto-open specific report modal when deep-linked via ?inspect=<id>
  useEffect(() => {
    if (!inspectIdParam || handledInspectRef.current === inspectIdParam) return;
    const targetId = Number(inspectIdParam);
    if (!targetId) return;
    const match = reports.find((r) => Number(r.id) === targetId);
    if (match) {
      handledInspectRef.current = inspectIdParam;
      setSelectedReport(match);
    }
  }, [inspectIdParam, reports]);
  const [targetDetails, setTargetDetails] = useState<any | null>(null);
  const [targetLoading, setTargetLoading] = useState(false);
  const [inspectedJob, setInspectedJob] = useState<any | null>(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [alertState, setAlertState] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });

  const handleExport = async (format: 'csv' | 'xlsx') => {
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
      formatCSVStatus(r.type),
      humanizeModel(r.reportable_type),
      r.reportable_id,
      r.reporter?.name || '',
      r.reporter?.role || '',
      r.description,
      formatCSVStatus(r.status),
      formatCSVDate(r.created_at),
      formatCSVDate(r.resolved_at)
    ]);

    const filename = `sikap_moderation_audit_${new Date().toISOString().slice(0, 10)}`;
    const title = 'SIKAP Moderation & Safety Audit Report';
    const metadata: [string, string][] = [
      ['Generated On:', formatCSVDate(new Date().toISOString())],
      ['Report Type:', 'Moderation Audit Summary'],
      ['Total Audit Records:', String(filteredReports.length)],
      ['Status Filter:', statusFilter.toUpperCase()],
    ];
    const sections = [{ title: 'Moderation Reports', headers, rows }];

    if (format === 'xlsx') {
      const { exportMultiSectionExcel } = await import('@/lib/export/excel');
      await exportMultiSectionExcel(filename, title, metadata, sections);
      toast.success(`Exported ${filteredReports.length} moderation record(s) to Excel.`, 'Excel Export Ready');
    } else {
      exportMultiSectionCSV(filename, title, metadata, sections);
      toast.success(`Exported ${filteredReports.length} moderation record(s) to CSV.`, 'CSV Export Ready');
    }
  };

  // Sync search query from URL query parameter
  useEffect(() => {
    setSearchTerm(urlSearch);
    setCurrentPage(1);
  }, [urlSearch]);

  const fetchReports = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [res, openRes] = await Promise.all([
        adminApi.getReports(statusFilter, currentPage, searchTerm),
        // Reuse the shared cached open-reports query from layout.tsx (which includes pagination `total`)
        statusFilter === 'open' ? Promise.resolve(null) : adminApi.getReports('open', 1).catch(() => null),
      ]);
      setReports(res.data.data || []);
      setTotalPages(res.data.last_page || 1);
      if (statusFilter === 'open') {
        setOpenCount(res.data.total ?? (res.data.data || []).length);
      } else if (openRes?.data) {
        setOpenCount(openRes.data.total ?? (openRes.data.data || []).length);
      }
    } catch (err: any) {
      if (!silent) setError(err.message || 'Failed to load moderation reports');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [statusFilter, currentPage, searchTerm]);

  useEffect(() => {
    fetchReports(false);
  }, [fetchReports]);

  // Load detailed target info and preset suspension reason when a report modal is opened
  useEffect(() => {
    if (!selectedReport) {
      setTargetDetails(null);
      setSuspensionReason('');
      return;
    }

    setSuspensionReason(selectedReport.description || '');

    const type = (selectedReport.reportable_type || '').toLowerCase();
    const id = selectedReport.reportable_id;
    if (!id) return;

    let isMounted = true;
    setTargetLoading(true);

    const loadTarget = async () => {
      try {
        if (type.includes('job')) {
          const res = await adminApi.getJob(id, true);
          if (isMounted) setTargetDetails(res.data?.job || res.data);
        } else if (type.includes('user')) {
          const res = await adminApi.getUserDetails(id);
          if (isMounted) setTargetDetails(res.data?.user || res.data);
        } else {
          if (isMounted) setTargetDetails(null);
        }
      } catch {
        if (isMounted) setTargetDetails(null);
      } finally {
        if (isMounted) setTargetLoading(false);
      }
    };

    loadTarget();

    return () => {
      isMounted = false;
    };
  }, [selectedReport]);

  usePolling(() => fetchReports(true), 15000);

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
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('admin:refresh-notifications'));
          }
          toast.info(`Report #${id} marked as ${status}.`, 'Report Updated');
          await fetchReports(true);
        } catch (err: any) {
          toast.error(err.response?.data?.message || err.message || 'Failed to update report', 'Action Failed');
          setAlertState({
            open: true,
            title: 'Error',
            message: 'Failed to update report status: ' + (err.response?.data?.message || err.message),
            onConfirm: () => { },
          });
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const handleModerateTarget = (targetType: string, targetId: number, customReason?: string) => {
    const isJob = targetType.toLowerCase().includes('job');
    const actionName = isJob ? 'Delete / Suspend Job Post' : 'Suspend User Account';
    const reasonToUse = (customReason || suspensionReason).trim() || 'Moderation disciplinary action';

    setAlertState({
      open: true,
      title: `Confirm: ${actionName}`,
      message: `Are you sure you want to take disciplinary action on ${isJob ? `Job #${targetId}` : `User #${targetId}`}?`,
      onConfirm: async () => {
        try {
          setActionLoading(targetId);
          try {
            if (isJob) {
              await adminApi.deleteJob(targetId);
            } else {
              await adminApi.suspendUser(targetId, true, 'forever', reasonToUse);
            }
          } catch (targetErr: any) {
            // F1: If target is already deleted / not found (404), continue and resolve report
            if (targetErr?.response?.status === 404) {
              setAlertState({
                open: true,
                title: 'Target Already Deleted',
                message: `The ${isJob ? 'job post' : 'user'} #${targetId} was already deleted or not found. The report has been marked as resolved.`,
                onConfirm: () => { },
              });
            } else {
              throw targetErr;
            }
          }
          // Also automatically resolve the report
          if (selectedReport) {
            await adminApi.resolveReport(selectedReport.id, 'resolved');
            setSelectedReport(null);
          }
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('admin:refresh-notifications'));
          }
          toast.success(`Disciplinary action executed on ${isJob ? 'job post' : 'user'} #${targetId}.`, 'Action Taken');
          await fetchReports(true);
        } catch (err: any) {
          toast.error(err.response?.data?.message || err.message || 'Could not moderate target', 'Action Failed');
          setAlertState({
            open: true,
            title: 'Action Failed',
            message: 'Could not moderate target: ' + (err.response?.data?.message || err.message),
            onConfirm: () => { },
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
    <div className="animate-fade-in space-y-4">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-display font-bold text-ink">Content Moderation &amp; Safety</h1>
            <span className="inline-flex items-center gap-1.5 bg-rose-500/10 text-rose-700 dark:text-rose-300 font-body font-bold text-[11px] px-2.5 py-1 rounded-full border border-rose-500/25 whitespace-nowrap shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Violation &amp; Abuse Queue
            </span>
          </div>
          <p className="text-xs text-ink-muted mt-1">
            Review, investigate, and resolve user-submitted complaints, scams, and flagged content.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm shrink-0">
          {/* Status Tabs with Badges */}
          <div className="flex items-center gap-1 bg-white/90 dark:bg-slate-900/80 p-1 rounded-xl border border-ink-faint/40 shadow-2xs h-10">
            {([
              { id: 'all', label: 'All', count: statusFilter === 'all' ? (reports.length) : null, highlight: false },
              { id: 'open', label: 'Open', count: openCount, highlight: true },
              { id: 'resolved', label: 'Resolved', count: statusFilter === 'resolved' ? (reports.length) : null, highlight: false },
              { id: 'dismissed', label: 'Dismissed', count: statusFilter === 'dismissed' ? (reports.length) : null, highlight: false },
            ] as const).map(({ id, label, count, highlight }) => (
              <button
                key={id}
                onClick={() => {
                  setStatusFilter(id as any);
                  setCurrentPage(1);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-body font-medium rounded-lg capitalize transition-all cursor-pointer whitespace-nowrap ${statusFilter === id
                  ? 'bg-ink text-white dark:bg-slate-800 shadow-2xs font-semibold'
                  : 'text-ink-soft hover:text-ink hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                  }`}
              >
                <span>{label}</span>
                {typeof count === 'number' && count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold leading-none ${statusFilter === id
                    ? 'bg-white/20 text-white'
                    : highlight
                      ? 'bg-status-error/15 text-status-error border border-status-error/30'
                      : 'bg-ink-faint/60 text-ink-muted'
                    }`}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-52 group">
            <input
              type="text"
              aria-label="Search reports"
              placeholder="Search violations..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3.5 h-10 bg-white/90 dark:bg-slate-900/80 rounded-xl border border-ink-faint/40 shadow-xs focus:bg-white dark:focus:bg-slate-900/95 focus:border-ink/50 outline-none text-sm font-body transition"
            />
            <i className="lni lni-search text-ink-muted absolute left-3 top-1/2 transform -translate-y-1/2 text-sm" />
          </div>

          <button
            onClick={() => handleExport('xlsx')}
            aria-label="Export moderation audit as Excel"
            className="flex items-center gap-1.5 px-3.5 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl border border-emerald-700 shadow-2xs transition font-body font-semibold text-xs sm:text-sm cursor-pointer whitespace-nowrap"
            title="Export filtered moderation audit as styled Excel (.xlsx)"
          >
            <i className="lni lni-download text-sm" />
            <span>Excel (.xlsx)</span>
          </button>

          <button
            onClick={() => fetchReports(false)}
            aria-label="Refresh reports list"
            className="w-10 h-10 bg-white dark:bg-slate-900/80 rounded-xl border border-ink-faint/40 shadow-2xs hover:bg-slate-100 dark:hover:bg-slate-800 text-ink-soft hover:text-primary transition flex items-center justify-center cursor-pointer shrink-0"
            title="Refresh list"
          >
            <i className={`lni lni-reload text-sm ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-md rounded-xl shadow-xs border border-ink-faint/30 overflow-hidden">
        {loading && reports.length === 0 ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-ink-faint/20 rounded-xl animate-pulse flex items-center justify-between px-4">
                <div className="w-1/3 h-4 bg-ink-faint/40 rounded-lg"></div>
                <div className="w-1/6 h-4 bg-ink-faint/40 rounded-lg"></div>
                <div className="w-1/4 h-6 bg-ink-faint/40 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left font-body table-fixed border-collapse">
              <thead className="bg-slate-50/70 dark:bg-slate-900/50 border-b border-ink-faint/30">
                <tr>
                  <th className="px-4 py-3.5 font-body font-semibold text-ink-muted text-xs uppercase tracking-wider w-[13%]">Target / Type</th>
                  <th className="px-4 py-3.5 font-body font-semibold text-ink-muted text-xs uppercase tracking-wider w-[21%]">Reported By</th>
                  <th className="px-4 py-3.5 font-body font-semibold text-ink-muted text-xs uppercase tracking-wider w-[28%]">Reason / Description</th>
                  <th className="px-4 py-3.5 font-body font-semibold text-ink-muted text-xs uppercase tracking-wider w-[15%]">Reported At</th>
                  <th className="px-4 py-3.5 font-body font-semibold text-ink-muted text-xs uppercase tracking-wider w-[23%] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-faint/20">
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-12 h-12 bg-status-success/10 rounded-full flex items-center justify-center mb-3">
                          <i className="lni lni-shield text-xl text-status-success" />
                        </div>
                        <h3 className="font-display text-base text-ink font-bold">All Clear!</h3>
                        <p className="font-body text-ink-muted mt-1 text-sm">No moderation tickets found matching your criteria.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((report) => (
                    <tr
                      key={report.id}
                      onClick={() => setSelectedReport(report)}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition-colors duration-150 cursor-pointer group"
                    >
                      <td className="px-4 py-3.5">
                        <span className="badge-neutral font-medium uppercase tracking-wide inline-block truncate max-w-full">
                          {humanizeModel(report.reportable_type)}
                        </span>
                        <div className="mt-1 text-xs font-numeric font-medium text-ink-muted">
                          ID: #{report.reportable_id}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center">
                          {report.reporter ? (
                            <>
                              <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-ink-faint/30 flex items-center justify-center text-ink dark:text-slate-100 font-body font-semibold text-xs flex-shrink-0 mr-2.5">
                                {(report.reporter?.name || 'Deleted Account').charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <div className="font-body font-bold text-ink text-sm truncate">{report.reporter?.name || 'Deleted Account'}</div>
                                <div className="text-xs text-ink-muted truncate mt-0.5">{report.reporter?.email || ''}</div>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-ink-faint/30 text-ink-soft flex items-center justify-center text-sm mr-2.5 flex-shrink-0">
                                <i className="lni lni-shield" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-body font-bold text-ink text-sm truncate">System Auto-Moderation</div>
                                <div className="text-xs text-ink-muted font-medium truncate mt-0.5">Word Filter Rule</div>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-body font-bold text-ink text-sm truncate capitalize" title={report.type}>
                          {report.type.replace(/_/g, ' ')}
                        </div>
                        <div className="text-sm text-ink-muted mt-0.5 leading-relaxed truncate" title={parseModerationNote(report.description).cleanDisplay}>
                          {parseModerationNote(report.description).cleanDisplay}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-body font-medium text-ink-soft font-numeric">
                        {formatDateTime(report.created_at)}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {!report.status || report.status === 'open' || report.status === 'pending' ? (
                          <div className="flex justify-end items-center gap-1.5 whitespace-nowrap">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedReport(report);
                              }}
                              className="btn-glass text-xs h-8 px-2.5 whitespace-nowrap shrink-0"
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
                                className="w-8 h-8 shrink-0 rounded-lg bg-white/80 dark:bg-slate-800 border border-ink-faint/50 text-ink-soft hover:text-ink hover:border-ink transition-all shadow-2xs flex items-center justify-center cursor-pointer"
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
                                className="w-8 h-8 shrink-0 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all shadow-2xs flex items-center justify-center cursor-pointer"
                                title="Mark as Resolved"
                              >
                                <i className="lni lni-checkmark-circle text-xs" />
                              </button>
                            </Tooltip>
                          </div>
                        ) : (
                          <span className={`px-2.5 py-1 rounded-md text-xs font-body font-medium border capitalize ${report.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}>
                            {report.status}
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
      {selectedReport && (() => {
        const parsedNote = parseModerationNote(selectedReport.description || '');
        const targetUser = (() => {
          if (selectedReport.target_user) return selectedReport.target_user;
          if (selectedReport.reportable_type?.toLowerCase().includes('user') && targetDetails) {
            return targetDetails;
          }
          if (selectedReport.reportable_type?.toLowerCase().includes('job') && targetDetails?.employer) {
            return targetDetails.employer;
          }
          if (selectedReport.reportable_type?.toLowerCase().includes('message') && targetDetails?.sender) {
            return targetDetails.sender;
          }
          if (parsedNote.senderName || parsedNote.senderId) {
            return { id: parsedNote.senderId, name: parsedNote.senderName };
          }
          return null;
        })();

        const isJobReport = selectedReport.reportable_type?.toLowerCase().includes('job');

        return (
          <AdminModal
            isOpen={!!selectedReport}
            onClose={() => setSelectedReport(null)}
            titleId="report-modal-title"
            size="xl"
            badge={
              <>
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-body font-bold tracking-wide uppercase bg-status-error text-white shadow-2xs">
                  Report #{selectedReport.id}
                </span>
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-body font-bold capitalize bg-status-error/10 text-status-error border border-status-error/20">
                  {isJobReport && selectedReport.type === 'fake_account'
                    ? 'Fake / Scam Job'
                    : selectedReport.type?.replace(/_/g, ' ') || 'Flagged Content'}
                </span>
                <span className="text-xs font-body text-ink-muted dark:text-slate-400">
                  {formatDateTime(selectedReport.created_at)}
                </span>
              </>
            }
            title={`Review Reported ${humanizeModel(selectedReport.reportable_type)}`}
            footerLeft={
              <button
                type="button"
                onClick={() => {
                  if (isJobReport) {
                    handleModerateTarget('job', selectedReport.reportable_id, suspensionReason);
                  } else {
                    const targetIdToSuspend = targetUser?.id || selectedReport.reportable_id;
                    handleModerateTarget('user', targetIdToSuspend, suspensionReason);
                  }
                }}
                disabled={actionLoading !== null}
                className="px-4 py-2.5 rounded-xl border border-rose-300 dark:border-rose-700/70 bg-rose-50/80 dark:bg-rose-950/40 hover:bg-rose-600 hover:text-white hover:border-rose-600 text-rose-700 dark:text-rose-300 font-body font-bold text-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <i className="lni lni-ban text-xs" />
                <span>{isJobReport ? 'Suspend / Remove Job Post' : 'Suspend Offending User'}</span>
              </button>
            }
            footerRight={
              <>
                <button
                  type="button"
                  disabled={actionLoading === selectedReport.id}
                  onClick={() => handleResolve(selectedReport.id, 'dismissed')}
                  className="px-4 py-2.5 rounded-xl bg-paper/90 dark:bg-slate-800 hover:bg-ink-faint/60 dark:hover:bg-slate-700 text-ink dark:text-slate-200 font-body font-semibold text-xs border border-ink-faint/60 dark:border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <i className="lni lni-close text-xs" />
                  Dismiss (No Violation)
                </button>
                <button
                  type="button"
                  disabled={actionLoading === selectedReport.id}
                  onClick={() => handleResolve(selectedReport.id, 'resolved')}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-body font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <i className="lni lni-checkmark-circle text-xs" />
                  Mark as Resolved
                </button>
              </>
            }
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT COLUMN (7/12): Primary Evidence & Reported Target */}
              <div className="lg:col-span-7 space-y-5">
                {/* Complaint / Auto-Moderation Excerpt */}
                <div>
                  <label className="text-[11px] font-body font-bold text-ink-muted uppercase tracking-wider block mb-2">
                    {parsedNote.isAutoFlagged ? 'Auto-Moderation Audit Details' : 'Complaint / Content Excerpt'}
                  </label>

                  {parsedNote.isAutoFlagged ? (
                    <div className="p-4 rounded-2xl bg-paper/60 dark:bg-slate-800/60 border border-ink-faint/40 dark:border-slate-700/60 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-100 text-rose-800 border border-rose-200 text-xs font-body font-bold">
                          <span>Flagged Term:</span>
                          <span className="font-mono">"{parsedNote.term}"</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 text-xs font-body font-semibold">
                          <span>Source:</span>
                          <span>{parsedNote.source}</span>
                        </div>
                        {targetUser && (
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 text-xs font-body font-semibold">
                            <span>Author:</span>
                            <span>{targetUser.name} {targetUser.id ? `(#${targetUser.id})` : ''}</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-ink-faint/30">
                        <span className="text-[11px] font-body font-bold text-ink-muted uppercase tracking-wider block mb-1">
                          Captured Excerpt
                        </span>
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-ink-faint/60 dark:border-slate-700 text-xs font-body text-ink dark:text-slate-200 leading-relaxed italic">
                          "{parsedNote.excerpt || parsedNote.text}"
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-paper/60 dark:bg-slate-800/60 border border-ink-faint/40 dark:border-slate-700/60 text-sm font-body text-ink dark:text-slate-100 leading-relaxed">
                      {selectedReport.description || 'No additional explanation provided.'}
                    </div>
                  )}
                </div>

                {/* Attached Screenshots / Evidence */}
                {selectedReport.evidence_urls && Array.isArray(selectedReport.evidence_urls) && selectedReport.evidence_urls.length > 0 && (
                  <div>
                    <label className="text-[11px] font-body font-bold text-ink-muted uppercase tracking-wider flex items-center gap-1.5 mb-2">
                      <i className="lni lni-gallery text-primary" />
                      Attached Evidence ({selectedReport.evidence_urls.length} Screenshot{selectedReport.evidence_urls.length > 1 ? 's' : ''})
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 p-3 bg-paper/50 dark:bg-slate-800/50 rounded-2xl border border-ink-faint/40 dark:border-slate-700/60">
                      {selectedReport.evidence_urls.map((url: string, idx: number) => (
                        <button
                          key={url + idx}
                          type="button"
                          onClick={() => setPreviewImage(url)}
                          className="group relative aspect-square rounded-xl overflow-hidden border border-ink-faint/60 bg-white hover:border-primary transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                        >
                          <img
                            src={url}
                            alt={`Evidence screenshot ${idx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 flex items-center justify-center transition-colors">
                            <i className="lni lni-zoom-in text-white opacity-0 group-hover:opacity-100 text-lg drop-shadow" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Target Item Details Card */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-paper/80 to-white dark:from-slate-800/80 dark:to-slate-900 border border-ink-faint/40 dark:border-slate-700/70 shadow-2xs">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[11px] font-body font-bold text-ink dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <i className="lni lni-target text-primary" />
                      Target Item ({humanizeModel(selectedReport.reportable_type)})
                    </div>
                    <span className="text-[11px] font-numeric font-bold bg-ink-faint/70 dark:bg-slate-700 px-2 py-0.5 rounded text-ink-soft dark:text-slate-300">
                      Target #{selectedReport.reportable_id}
                    </span>
                  </div>

                  {selectedReport.reportable_type?.toLowerCase().includes('message') && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-3 text-xs text-amber-900 dark:text-amber-200 font-body">
                      <span className="font-bold">Privacy Guard:</span> Private message exchanges are sealed to safeguard user privacy. The offending excerpt and sender identity have been isolated above for investigation.
                    </div>
                  )}

                  {targetLoading ? (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-ink-faint/30 text-xs text-ink-muted text-center animate-pulse">
                      Loading target item details...
                    </div>
                  ) : targetDetails ? (
                    <div className="p-4 rounded-xl bg-white/80 dark:bg-slate-900/70 border border-ink-faint/40 dark:border-slate-700/60 text-xs font-body space-y-2">
                      {isJobReport && (
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-ink dark:text-slate-100 text-sm">{targetDetails.title || 'Untitled Job'}</span>
                            <span className="px-2 py-0.5 rounded bg-accent-sky dark:bg-sky-900/70 text-primary-dark dark:text-sky-200 font-semibold text-[10px]">
                              {targetDetails.category || 'General'}
                            </span>
                          </div>
                          <p className="text-ink-soft dark:text-slate-300 text-xs line-clamp-3 leading-relaxed">
                            {targetDetails.description || 'No description available.'}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] text-ink-muted border-t border-ink-faint/20">
                            <span><strong>Employer:</strong> {targetDetails.employer?.name || 'Deleted Account'}</span>
                            <span><strong>Location:</strong> {targetDetails.barangay ? `${targetDetails.barangay}, ` : ''}{targetDetails.municipality || 'Sorsogon'}</span>
                            <span><strong>Status:</strong> <span className="uppercase font-semibold">{targetDetails.status}</span></span>
                          </div>
                        </>
                      )}

                      {selectedReport.reportable_type?.toLowerCase().includes('user') && (
                        <>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                                {(targetDetails.name || 'Deleted Account').charAt(0)}
                              </div>
                              <div>
                                <div className="font-bold text-ink dark:text-slate-100 text-sm">{targetDetails.name || 'Deleted Account'}</div>
                                <div className="text-[11px] text-ink-muted">{targetDetails.email}</div>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded uppercase font-bold text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {targetDetails.role}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] text-ink-muted border-t border-ink-faint/20">
                            <span><strong>Phone:</strong> {targetDetails.phone || targetDetails.phone_number || 'N/A'}</span>
                            <span><strong>Location:</strong> {targetDetails.municipality || 'Sorsogon'}</span>
                            <span><strong>Status:</strong> {targetDetails.is_suspended ? <span className="text-status-error font-bold">Suspended</span> : <span className="text-status-success font-bold">Active</span>}</span>
                          </div>
                        </>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* RIGHT COLUMN (5/12): Reporter, Deep Inspection & Enforcement Note */}
              <div className="lg:col-span-5 space-y-5">
                {/* Reporter Info */}
                <div className="p-4 bg-paper/60 dark:bg-slate-800/60 rounded-2xl border border-ink-faint/30 dark:border-slate-700/60">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[11px] font-body font-bold text-ink-muted uppercase tracking-wider">
                      {selectedReport.reporter ? 'Reported By' : 'Source'}
                    </span>
                    <span className="text-[11px] font-mono font-bold bg-white/80 dark:bg-slate-900/70 px-2 py-0.5 rounded-md border border-ink-faint/50 dark:border-slate-700 text-ink-soft dark:text-slate-300">
                      {selectedReport.reporter ? `#${selectedReport.reporter.id}` : 'System'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {selectedReport.reporter ? (
                      <>
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                          {(selectedReport.reporter?.name || 'U').charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-body font-bold text-ink dark:text-slate-100 truncate">{selectedReport.reporter?.name || 'Anonymous User'}</div>
                          <div className="text-xs text-ink-soft dark:text-slate-400 truncate">{selectedReport.reporter?.email}</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-base border border-primary/20 shrink-0">
                          <i className="lni lni-shield" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-body font-bold text-ink dark:text-slate-100">System Auto-Moderator</div>
                          <div className="text-xs text-ink-soft dark:text-slate-400">Word Filter Context Policy</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Deep Inspection Links */}
                <div className="p-4 rounded-2xl bg-paper/60 dark:bg-slate-800/60 border border-ink-faint/30 dark:border-slate-700/60 space-y-2.5">
                  <div className="text-[11px] font-body font-bold text-ink-muted uppercase tracking-wider flex items-center gap-1.5">
                    <i className="lni lni-search-alt text-primary" />
                    Deep Inspection
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const targetId = targetUser?.id || selectedReport.reportable_id;
                        router.push(`/dashboard/users?inspect=${targetId}`);
                      }}
                      className="w-full px-3.5 py-2 rounded-xl bg-white/90 dark:bg-slate-900/70 hover:bg-white dark:hover:bg-slate-800 text-ink dark:text-slate-200 font-body font-semibold text-xs border border-ink-faint/50 dark:border-slate-700 transition-all flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <i className="lni lni-user text-xs text-primary" />
                        Inspect in Users Manager {targetUser?.id ? `(#${targetUser.id})` : ''}
                      </span>
                      <i className="lni lni-arrow-right text-xs text-ink-muted" />
                    </button>

                    {isJobReport && (
                      <>
                        <button
                          type="button"
                          onClick={() => router.push(`/dashboard/jobs?inspect=${selectedReport.reportable_id}`)}
                          className="w-full px-3.5 py-2 rounded-xl bg-white/90 dark:bg-slate-900/70 hover:bg-white dark:hover:bg-slate-800 text-ink dark:text-slate-200 font-body font-semibold text-xs border border-ink-faint/50 dark:border-slate-700 transition-all flex items-center justify-between cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <i className="lni lni-briefcase text-xs text-primary" />
                            Inspect in Jobs Manager
                          </span>
                          <i className="lni lni-arrow-right text-xs text-ink-muted" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setInspectedJob(targetDetails || { id: selectedReport.reportable_id })}
                          className="w-full px-3.5 py-2 rounded-xl bg-primary/10 hover:bg-primary/15 text-primary dark:text-sky-300 font-body font-semibold text-xs border border-primary/20 transition-all flex items-center justify-between cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <i className="lni lni-eye text-xs" />
                            View Full Job Details
                          </span>
                          <i className="lni lni-arrow-right text-xs" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Enforcement Justification Note */}
                <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/60">
                  <div className="flex items-center justify-between mb-1.5 gap-2">
                    <span className="text-[11px] font-body font-bold text-rose-900 dark:text-rose-200 uppercase tracking-wider flex items-center gap-1.5">
                      <i className="lni lni-ban text-rose-600" />
                      Enforcement Justification
                    </span>
                    {targetUser && (
                      <span className="text-[11px] font-body font-semibold text-rose-700 dark:text-rose-300 truncate">
                        {targetUser.name}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-rose-800/80 dark:text-rose-200/80 font-body mb-2.5 leading-relaxed">
                    Add a reason before clicking <span className="font-semibold">{isJobReport ? 'Suspend / Remove Job Post' : 'Suspend Offending User'}</span> in the footer.
                  </p>
                  <textarea
                    rows={3}
                    value={suspensionReason}
                    onChange={(e) => setSuspensionReason(e.target.value)}
                    placeholder="Specify violation or justification for disciplinary action..."
                    className="w-full p-3 bg-white/90 dark:bg-slate-900/80 border border-rose-200/90 dark:border-rose-800/70 rounded-xl text-xs font-body text-ink dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20 resize-none"
                  />
                </div>
              </div>
            </div>
          </AdminModal>
        );
      })()}

      {inspectedJob && (
        <JobDetailModal
          job={inspectedJob}
          onClose={() => setInspectedJob(null)}
          onRefresh={() => fetchReports(true)}
        />
      )}

      {/* Evidence Image Preview Lightbox */}
      {previewImage && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setPreviewImage(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-transparent rounded-2xl overflow-hidden shadow-2xl flex flex-col items-center">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center cursor-pointer transition-colors"
              aria-label="Close image preview"
            >
              <i className="lni lni-close text-base" />
            </button>
            <img
              src={previewImage}
              alt="Full evidence screenshot"
              className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>,
        document.body
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

export default function ModerationPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 font-body text-ink-muted">Loading moderation queue...</div>}>
      <ModerationPageContent />
    </Suspense>
  );
}
