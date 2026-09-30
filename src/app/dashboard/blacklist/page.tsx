'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { adminApi } from '@/lib/api';
import { AlertDialog } from '@/components/AlertDialog';
import StatCard from '@/components/StatCard';
import { Ban, ShieldAlert, UserX, UserMinus, Search, RefreshCw, CheckCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

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
  const [actionLoading, setActionLoading] = useState<number | null>(null);

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
          await fetchBlacklist();
        } catch (err: any) {
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

  // Compute stat counts from current dataset or active tab
  const stats = useMemo(() => {
    const total = totalCount || records.length;
    const banned = records.filter(r => r.type === 'banned').length;
    const suspended = records.filter(r => r.type === 'suspended').length;
    const deletedByAdmin = records.filter(r => r.type === 'deleted_by_admin').length;
    const selfDeleted = records.filter(r => r.type === 'self_deleted').length;

    return { total, banned, suspended, deletedByAdmin, selfDeleted };
  }, [records, totalCount]);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'banned':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200 uppercase tracking-wide">
            <Ban className="w-3 h-3" /> Permanently Banned
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-wide">
            <ShieldAlert className="w-3 h-3" /> Suspended
          </span>
        );
      case 'deleted_by_admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200 uppercase tracking-wide">
            <UserX className="w-3 h-3" /> Deleted by Admin
          </span>
        );
      case 'self_deleted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wide">
            <UserMinus className="w-3 h-3" /> Self-Deleted
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700">
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
          <h1 className="text-xl sm:text-2xl font-display font-bold text-ink flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-rose-500/10 text-rose-600">
              <Ban className="w-6 h-6" />
            </span>
            Blacklist & Restrictions Registry
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            Historical registry of banned, suspended, and deleted identities used for automated verification cross-checks.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              aria-label="Search blacklist by name, email, phone, or reason"
              placeholder="Search by name, email, phone, reason..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 bg-white/90 rounded-xl border border-ink-faint/40 shadow-xs focus:bg-white focus:border-ink/50 outline-none font-body transition-all text-xs"
            />
            <Search className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 transform -translate-y-1/2" />
          </div>

          <button
            onClick={fetchBlacklist}
            aria-label="Refresh blacklist registry"
            className="p-2.5 bg-white rounded-xl border border-ink-faint/40 shadow-2xs hover:bg-slate-50 text-ink-soft hover:text-primary transition flex items-center justify-center cursor-pointer"
            title="Refresh registry"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard
          title="Total Restrictions"
          value={stats.total}
          iconClass="lni lni-shield"
          bg="from-slate-100 to-slate-200"
          iconColor="text-slate-700"
          onClick={() => handleTabChange('all')}
        />
        <StatCard
          title="Permanently Banned"
          value={stats.banned}
          iconClass="lni lni-ban"
          bg="from-rose-50 to-rose-100"
          iconColor="text-rose-700"
          onClick={() => handleTabChange('banned')}
        />
        <StatCard
          title="Active Suspensions"
          value={stats.suspended}
          iconClass="lni lni-timer"
          bg="from-amber-50 to-amber-100"
          iconColor="text-amber-700"
          onClick={() => handleTabChange('suspended')}
        />
        <StatCard
          title="Deleted by Admin"
          value={stats.deletedByAdmin}
          iconClass="lni lni-trash-can"
          bg="from-purple-50 to-purple-100"
          iconColor="text-purple-700"
          onClick={() => handleTabChange('deleted_by_admin')}
        />
        <StatCard
          title="Self-Deleted"
          value={stats.selfDeleted}
          iconClass="lni lni-user"
          bg="from-slate-50 to-slate-100"
          iconColor="text-slate-600"
          onClick={() => handleTabChange('self_deleted')}
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => handleTabChange('all')}
          className={`px-3.5 py-1.5 rounded-xl font-body font-semibold text-xs transition-colors whitespace-nowrap ${
            activeTab === 'all'
              ? 'bg-ink text-white shadow-xs'
              : 'bg-white/70 text-ink-soft hover:bg-white border border-ink-faint/40'
          }`}
        >
          All Restrictions
        </button>
        <button
          onClick={() => handleTabChange('banned')}
          className={`px-3.5 py-1.5 rounded-xl font-body font-semibold text-xs transition-colors whitespace-nowrap ${
            activeTab === 'banned'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white/70 text-ink-soft hover:bg-white border border-ink-faint/40'
          }`}
        >
          Banned
        </button>
        <button
          onClick={() => handleTabChange('suspended')}
          className={`px-3.5 py-1.5 rounded-xl font-body font-semibold text-xs transition-colors whitespace-nowrap ${
            activeTab === 'suspended'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white/70 text-ink-soft hover:bg-white border border-ink-faint/40'
          }`}
        >
          Suspended
        </button>
        <button
          onClick={() => handleTabChange('deleted_by_admin')}
          className={`px-3.5 py-1.5 rounded-xl font-body font-semibold text-xs transition-colors whitespace-nowrap ${
            activeTab === 'deleted_by_admin'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white/70 text-ink-soft hover:bg-white border border-ink-faint/40'
          }`}
        >
          Deleted by Admin
        </button>
        <button
          onClick={() => handleTabChange('self_deleted')}
          className={`px-3.5 py-1.5 rounded-xl font-body font-semibold text-xs transition-colors whitespace-nowrap ${
            activeTab === 'self_deleted'
              ? 'bg-slate-700 text-white shadow-xs'
              : 'bg-white/70 text-ink-soft hover:bg-white border border-ink-faint/40'
          }`}
        >
          Self-Deleted
        </button>
      </div>

      {/* Main Table */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xs border border-ink-faint/30 overflow-hidden">
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
            <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mb-3 text-emerald-600 shadow-inner">
              <CheckCircle className="w-7 h-7" />
            </div>
            <h3 className="font-display text-lg font-bold text-ink">No Restrictions Found</h3>
            <p className="font-body text-ink-muted mt-1 text-xs max-w-sm">
              {debouncedSearch
                ? `No blacklist entries match "${debouncedSearch}".`
                : 'There are currently no restricted identities registered in this category.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body table-fixed border-collapse min-w-[850px]">
              <thead className="bg-slate-50/70 border-b border-ink-faint/30">
                <tr>
                  <th className="px-4 py-3 font-body font-semibold text-ink-muted text-[11px] uppercase tracking-wider w-[24%]">
                    Identity Details
                  </th>
                  <th className="px-4 py-3 font-body font-semibold text-ink-muted text-[11px] uppercase tracking-wider w-[18%]">
                    Restriction Type
                  </th>
                  <th className="px-4 py-3 font-body font-semibold text-ink-muted text-[11px] uppercase tracking-wider w-[26%]">
                    Reason / Administrative Note
                  </th>
                  <th className="px-4 py-3 font-body font-semibold text-ink-muted text-[11px] uppercase tracking-wider w-[18%]">
                    Action Log & Date
                  </th>
                  <th className="px-4 py-3 font-body font-semibold text-ink-muted text-[11px] uppercase tracking-wider w-[14%] text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-faint/20 text-xs">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Identity Details */}
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-ink text-sm">{r.name}</div>
                      <div className="text-ink-muted text-xs mt-0.5 flex flex-col gap-0.5">
                        {r.email && <span>{r.email}</span>}
                        {r.phone && <span className="font-mono text-[11px]">{r.phone}</span>}
                      </div>
                      {r.role && (
                        <span className="inline-block uppercase tracking-wider text-[9px] font-bold text-ink-muted/80 bg-paper px-2 py-0.5 rounded mt-1 border border-ink-faint/40">
                          Role: {r.role}
                        </span>
                      )}
                    </td>

                    {/* Restriction Type */}
                    <td className="px-4 py-3.5">
                      <div className="space-y-1">
                        {getTypeBadge(r.type)}
                        {r.type === 'suspended' && r.suspended_until && (
                          <div className="text-[11px] text-amber-700 font-medium">
                            Until: {new Date(r.suspended_until).toLocaleDateString()}
                          </div>
                        )}
                        <div>
                          <span
                            className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              r.is_active
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {r.is_active ? 'Active Match Rule' : 'Inactive / Lifted'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Reason */}
                    <td className="px-4 py-3.5">
                      <div className="bg-paper/70 p-2.5 rounded-xl border border-ink-faint/40 text-ink-soft leading-relaxed text-xs">
                        {r.reason || <span className="text-ink-muted italic">No specific reason provided</span>}
                      </div>
                    </td>

                    {/* Action Log & Date */}
                    <td className="px-4 py-3.5 text-ink-soft">
                      <div className="font-semibold text-ink">
                        {new Date(r.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                      <div className="text-[11px] text-ink-muted mt-0.5">
                        {r.admin?.name ? `Recorded by ${r.admin.name}` : 'System Log'}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      {r.is_active ? (
                        <button
                          onClick={() => handleLiftRestriction(r)}
                          disabled={actionLoading === r.id}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-ink border border-ink-faint/80 text-xs font-semibold shadow-2xs transition-all disabled:opacity-50 inline-flex items-center gap-1 cursor-pointer"
                        >
                          {actionLoading === r.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin text-primary" />
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
