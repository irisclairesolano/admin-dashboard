'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { adminApi } from '@/lib/api';
import { AlertDialog } from '@/components/AlertDialog';
import StatCard from '@/components/StatCard';
import { Ban, ShieldAlert, UserX, UserMinus, Search, RefreshCw, CheckCircle, ArrowLeft, ArrowRight, Download } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/context/ToastContext';
import { exportMultiSectionCSV, formatCSVDate, formatCSVStatus } from '@/lib/export/csv';

interface BlacklistRecord {
  id: number;
  user_id: number | null;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  type: 'banned' | 'suspended' | 'deleted_by_admin' | 'self_deleted';
  reason: string | null;
  admin_id: number | null;
  admin?: { id: number; name: string } | null;
  suspended_until: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function BlacklistPage() {
  const [records, setRecords] = useState<BlacklistRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'banned' | 'suspended' | 'deleted_by_admin' | 'self_deleted'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [serverCounts, setServerCounts] = useState<{
    total: number;
    banned: number;
    suspended: number;
    deleted_by_admin: number;
    self_deleted: number;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const fetchBlacklist = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminApi.getBlacklist(activeTab, currentPage, debouncedSearch);
      const data = res.data;
      if (data && data.counts) {
        setServerCounts(data.counts);
      }
      if (data && Array.isArray(data.data)) {
        setRecords(data.data);
        setTotalPages(data.last_page || 1);
        setTotalCount(data.total || data.data.length);
      } else if (Array.isArray(data)) {
        setRecords(data);
        setTotalPages(1);
        setTotalCount(data.length);
      }
    } catch (err) {
      console.error('Failed to load blacklist registry', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, currentPage, debouncedSearch]);

  useEffect(() => {
    fetchBlacklist();
  }, [fetchBlacklist]);

  // Handle Tab change
  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const { toast } = useToast();

  const handleLiftRestriction = (record: BlacklistRecord) => {
    setAlertConfig({
      isOpen: true,
      title: 'Lift Restriction',
      message: `Are you sure you want to lift the restriction for ${record.name}? This will mark their identity record as inactive and allow clean verification in the future.`,
      confirmText: 'Lift Restriction',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          setActionLoading(record.id);
          await adminApi.liftBlacklist(record.id);
          toast.success(`Restriction lifted for ${record.name}.`, 'Restriction Lifted');
          await fetchBlacklist();
        } catch (err: any) {
          toast.error(err.response?.data?.message || 'Failed to lift restriction.', 'Action Failed');
          setAlertConfig({
            isOpen: true,
            title: 'Action Failed',
            message: err.response?.data?.message || 'Failed to lift restriction.',
            confirmText: 'OK',
            onConfirm: () => {},
          });
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const handleExport = async (format: 'csv' | 'xlsx') => {
    try {
      setExporting(true);
      let allRecords: BlacklistRecord[] = [];
      if (totalPages <= 1) {
        allRecords = records;
      } else {
        const pagePromises = [];
        for (let p = 1; p <= totalPages; p++) {
          pagePromises.push(adminApi.getBlacklist(activeTab, p, debouncedSearch));
        }
        const responses = await Promise.all(pagePromises);
        responses.forEach((res) => {
          const data = res.data;
          if (data && Array.isArray(data.data)) {
            allRecords.push(...data.data);
          } else if (Array.isArray(data)) {
            allRecords.push(...data);
          }
        });
      }

      if (allRecords.length === 0) {
        setAlertConfig({
          isOpen: true,
          title: 'Export Empty',
          message: 'There are no restriction records to export.',
          confirmText: 'OK',
          onConfirm: () => {},
        });
        return;
      }

      const headers = [
        'Record ID',
        'User ID',
        'Full Name',
        'Email Address',
        'Phone Number',
        'User Role',
        'Restriction Type',
        'Reason / Justification',
        'Issued By Admin',
        'Suspended Until',
        'Restriction Status',
        'Date Logged',
        'Last Updated',
      ];

      const rows = allRecords.map((r) => [
        r.id,
        r.user_id || 'N/A',
        r.name || '',
        r.email || '',
        r.phone || '',
        r.role || 'user',
        formatCSVStatus(r.type),
        r.reason || 'No reason provided',
        r.admin?.name || (r.admin_id ? `Admin #${r.admin_id}` : 'System Automated'),
        r.suspended_until ? formatCSVDate(r.suspended_until) : 'N/A',
        r.is_active ? 'Active Restriction' : 'Lifted / Inactive',
        formatCSVDate(r.created_at),
        formatCSVDate(r.updated_at),
      ]);

      const reportTypeName =
        activeTab === 'banned'
          ? 'Permanently Banned Registry'
          : activeTab === 'suspended'
            ? 'Suspended Users Registry'
            : activeTab === 'deleted_by_admin'
              ? 'Admin-Deleted Accounts Registry'
              : activeTab === 'self_deleted'
                ? 'Self-Deleted Accounts Registry'
                : 'All Restrictions Masterlist';

      const filename = `sikap_blacklist_${activeTab}_${new Date().toISOString().slice(0, 10)}`;
      const title = `SIKAP Blacklist & Restrictions Audit (${reportTypeName})`;
      const metadata: [string, string][] = [
        ['Generated On:', formatCSVDate(new Date().toISOString())],
        ['Report Type:', reportTypeName],
        ['Total Restrictions Exported:', String(allRecords.length)],
        ['Active Filter:', activeTab.toUpperCase()],
        ['Search Filter:', debouncedSearch.trim() || 'NONE'],
      ];
      const sections = [{ title: `Restriction Records (${reportTypeName})`, headers, rows }];

      if (format === 'xlsx') {
        const { exportMultiSectionExcel } = await import('@/lib/export/excel');
        await exportMultiSectionExcel(filename, title, metadata, sections);
        toast.success(`Exported ${allRecords.length} blacklist record(s) to Excel.`, 'Excel Export Ready');
      } else {
        exportMultiSectionCSV(filename, title, metadata, sections);
        toast.success(`Exported ${allRecords.length} blacklist record(s) to CSV.`, 'CSV Export Ready');
      }
    } catch (err: any) {
      toast.error('Failed to export blacklist registry.', 'Export Failed');
    } finally {
      setExporting(false);
    }
  };

  // Use global server-side counts (which exclude lifted/inactive bans & suspensions),
  // falling back to client-side active counts if counts payload is unavailable.
  const stats = useMemo(() => {
    if (serverCounts) {
      return {
        total: serverCounts.total,
        banned: serverCounts.banned,
        suspended: serverCounts.suspended,
        deletedByAdmin: serverCounts.deleted_by_admin,
        selfDeleted: serverCounts.self_deleted,
      };
    }

    const total = totalCount || records.length;
    const banned = records.filter(r => r.type === 'banned' && r.is_active).length;
    const suspended = records.filter(r => r.type === 'suspended' && r.is_active).length;
    const deletedByAdmin = records.filter(r => r.type === 'deleted_by_admin').length;
    const selfDeleted = records.filter(r => r.type === 'self_deleted').length;

    return { total, banned, suspended, deletedByAdmin, selfDeleted };
  }, [serverCounts, records, totalCount]);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'banned':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-500/10 text-rose-800 dark:text-rose-400 border border-rose-500/20 uppercase tracking-wide">
            <Ban className="w-3.5 h-3.5" /> Permanently Banned
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-800 dark:text-amber-400 border border-amber-500/20 uppercase tracking-wide">
            <ShieldAlert className="w-3.5 h-3.5" /> Suspended
          </span>
        );
      case 'deleted_by_admin':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 uppercase tracking-wide">
            <UserX className="w-3.5 h-3.5" /> Deleted by Admin
          </span>
        );
      case 'self_deleted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 uppercase tracking-wide">
            <UserMinus className="w-3.5 h-3.5" /> Self-Deleted
          </span>
        );
      default:
        return (
          <span className="badge-neutral">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="animate-fade-in space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-ink dark:text-slate-100 tracking-tight flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <Ban className="w-4 h-4" />
            </span>
            Blacklist &amp; Restrictions Registry
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted dark:text-slate-400 mt-1">
            Historical registry of banned, suspended, and deleted identities used for automated verification cross-checks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              aria-label="Search blacklist by name, email, phone, or reason"
              placeholder="Search by name, email, phone, reason..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="input-admin w-full pl-9 pr-7"
            />
            <Search className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
            {searchTerm && (
              <button
                type="button"
                onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink dark:text-slate-400 dark:hover:text-white p-0.5 rounded cursor-pointer"
              >
                <i className="lni lni-close text-[10px]" />
              </button>
            )}
          </div>

          <button
            onClick={() => handleExport('xlsx')}
            disabled={exporting}
            aria-label="Export blacklist to Excel"
            className="btn-export gap-1.5"
            title="Export blacklist records to styled Excel (.xlsx)"
          >
            <Download className={`w-3.5 h-3.5 ${exporting ? 'animate-bounce' : ''}`} />
            {exporting ? 'Exporting...' : 'Excel (.xlsx)'}
          </button>

          <button
            onClick={fetchBlacklist}
            aria-label="Refresh blacklist registry"
            className="btn-icon"
            title="Refresh registry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <StatCard
          title="Total Restrictions"
          value={stats.total}
          iconClass="lni lni-shield"
          bg="from-slate-100 to-slate-200"
          iconColor="text-slate-700"
          active={activeTab === 'all'}
          onClick={() => handleTabChange('all')}
        />
        <StatCard
          title="Permanently Banned"
          value={stats.banned}
          iconClass="lni lni-ban"
          bg="from-rose-50 to-rose-100"
          iconColor="text-rose-700"
          active={activeTab === 'banned'}
          onClick={() => handleTabChange('banned')}
        />
        <StatCard
          title="Active Suspensions"
          value={stats.suspended}
          iconClass="lni lni-timer"
          bg="from-amber-50 to-amber-100"
          iconColor="text-amber-700"
          active={activeTab === 'suspended'}
          onClick={() => handleTabChange('suspended')}
        />
        <StatCard
          title="Deleted by Admin"
          value={stats.deletedByAdmin}
          iconClass="lni lni-trash-can"
          bg="from-purple-50 to-purple-100"
          iconColor="text-purple-700"
          active={activeTab === 'deleted_by_admin'}
          onClick={() => handleTabChange('deleted_by_admin')}
        />
        <StatCard
          title="Self-Deleted"
          value={stats.selfDeleted}
          iconClass="lni lni-user"
          bg="from-slate-50 to-slate-100"
          iconColor="text-slate-600"
          active={activeTab === 'self_deleted'}
          onClick={() => handleTabChange('self_deleted')}
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 overflow-x-auto pb-0.5">
        {[
          { id: 'all', label: 'All Restrictions' },
          { id: 'banned', label: 'Banned' },
          { id: 'suspended', label: 'Suspended' },
          { id: 'deleted_by_admin', label: 'Deleted by Admin' },
          { id: 'self_deleted', label: 'Self-Deleted' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id as any)}
            className={`inline-flex items-center h-9 px-3.5 rounded-xl font-body text-xs font-semibold transition-all whitespace-nowrap cursor-pointer border ${
              activeTab === tab.id
                ? 'bg-ink text-white dark:bg-slate-800 border-ink dark:border-slate-700 shadow-2xs'
                : 'bg-white/90 dark:bg-slate-900/80 text-ink-soft dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 border-ink-faint/40 dark:border-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Table */}
      <div className="table-surface">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 bg-ink-faint/20 rounded-xl animate-pulse flex items-center justify-between px-4">
                <div className="w-1/4 h-4 bg-ink-faint/40 rounded-lg" />
                <div className="w-1/6 h-4 bg-ink-faint/40 rounded-lg" />
                <div className="w-1/3 h-4 bg-ink-faint/40 rounded-lg" />
                <div className="w-16 h-7 bg-ink-faint/40 rounded-lg" />
              </div>
            ))}
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center mb-3 text-emerald-600 shadow-inner">
              <CheckCircle className="w-7 h-7" />
            </div>
            <h3 className="font-display text-lg font-bold text-ink">No Restrictions Found</h3>
            <p className="font-body text-ink-muted mt-1 text-sm max-w-sm">
              {debouncedSearch
                ? `No blacklist entries match "${debouncedSearch}".`
                : 'There are currently no restricted identities registered in this category.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body table-fixed border-collapse min-w-[850px]">
              <thead className="bg-slate-50/70 dark:bg-slate-900/50 border-b border-ink-faint/30">
                <tr>
                  <th className="px-4 py-3.5 font-body font-semibold text-ink-muted text-xs uppercase tracking-wider w-[24%]">
                    Identity Details
                  </th>
                  <th className="px-4 py-3.5 font-body font-semibold text-ink-muted text-xs uppercase tracking-wider w-[18%]">
                    Restriction Type
                  </th>
                  <th className="px-4 py-3.5 font-body font-semibold text-ink-muted text-xs uppercase tracking-wider w-[26%]">
                    Reason / Administrative Note
                  </th>
                  <th className="px-4 py-3.5 font-body font-semibold text-ink-muted text-xs uppercase tracking-wider w-[18%]">
                    Action Log & Date
                  </th>
                  <th className="px-4 py-3.5 font-body font-semibold text-ink-muted text-xs uppercase tracking-wider w-[14%] text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-faint/20 text-sm">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition-colors">
                    {/* Identity Details */}
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-ink dark:text-slate-100 text-sm">{r.name}</div>
                      <div className="text-ink-muted dark:text-slate-400 text-xs mt-0.5 flex flex-col gap-0.5">
                        {r.email && <span>{r.email}</span>}
                        {r.phone && <span className="font-mono text-xs">{r.phone}</span>}
                      </div>
                      {r.role && (
                        <span className="badge-neutral mt-1">
                          Role: {r.role}
                        </span>
                      )}
                    </td>

                    {/* Restriction Type */}
                    <td className="px-4 py-3.5">
                      <div className="space-y-1.5">
                        {getTypeBadge(r.type)}
                        {r.type === 'suspended' && r.suspended_until && (
                          <div className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                            Until: {new Date(r.suspended_until).toLocaleDateString()}
                          </div>
                        )}
                        <div>
                          <span
                            className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                              r.is_active
                                ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {r.is_active ? 'Active Match Rule' : 'Inactive / Lifted'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Reason */}
                    <td className="px-4 py-3.5">
                      <div className="bg-paper/70 dark:bg-slate-800/60 p-3 rounded-xl border border-ink-faint/40 dark:border-slate-700 text-ink-soft dark:text-slate-300 leading-relaxed text-sm">
                        {r.reason || <span className="text-ink-muted dark:text-slate-500 italic">No specific reason provided</span>}
                      </div>
                    </td>

                    {/* Action Log & Date */}
                    <td className="px-4 py-3.5 text-ink-soft">
                      <div className="font-semibold text-ink text-sm">
                        {new Date(r.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                      <div className="text-xs text-ink-muted mt-0.5">
                        {r.admin?.name ? `Recorded by ${r.admin.name}` : 'System Log'}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      {r.is_active ? (
                        <button
                          onClick={() => handleLiftRestriction(r)}
                          disabled={actionLoading === r.id}
                          className="btn-glass text-xs h-9 inline-flex items-center gap-1.5"
                        >
                          {actionLoading === r.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                          ) : (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          )}
                          <span>Lift</span>
                        </button>
                      ) : (
                        <span className="text-xs text-ink-muted italic">Lifted</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
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
              className="p-2.5 rounded-xl border border-ink-faint/50 bg-white/70 text-ink hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2.5 rounded-xl border border-ink-faint/50 bg-white/70 text-ink hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Alert / Confirm Dialog */}
      <AlertDialog
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        onConfirm={() => {
          alertConfig.onConfirm();
          setAlertConfig((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setAlertConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
