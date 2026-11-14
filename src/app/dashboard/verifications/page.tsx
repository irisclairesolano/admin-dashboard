'use client';

/**
 * ============================================================================
 * FILE OVERVIEW: SIKAP KYC Identity Verification & SLA Review Queue Page
 * ============================================================================
 * (a) Purpose in the SIKAP Admin Dashboard:
 *     Provides the KYC compliance workstation (`/dashboard/verifications`) where
 *     PESO/LGU administrators review user-submitted Government IDs (Front & Back),
 *     Selfies holding IDs (for Workers), and Business Permits (for Employers)
 *     before granting verified platform badges.
 *
 * (b) Key Admin Features & RBAC Rules:
 *     - Automated 4-tier SLA Aging Engine (`getSlaStatus`):
 *         • `<12h` Normal | `12-24h` Priority | `24-48h` Urgent | `>=48h` Overdue
 *     - Surfaces automated Blacklist Match warning pills (`⚠️ Blacklist Match`)
 *       directly in the queue table when an applicant shares a name, phone, or
 *       email with a previously banned, suspended, or deleted account.
 *     - Optimistic UI state updates on Approve/Reject + custom window event dispatch
 *       (`admin:refresh-notifications`) to keep sidebar badge counters in sync.
 *
 * (c) Data Flow (Polling & Window Events <-> API <-> VerificationModal):
 *     - Polls `adminApi.getVerifications(true, true)` every 15s via `usePolling`
 *       and re-fetches on window focus.
 *     - Opens `<VerificationModal />` for high-resolution document inspection and
 *       calls `PATCH /api/v1/admin/users/:id/verify` (`adminApi.verifyUser`).
 * ============================================================================
 */

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { adminApi } from '@/lib/api';
import Avatar from '@/components/Avatar';
import dynamic from 'next/dynamic';
import { AlertDialog } from '@/components/AlertDialog';
import { useToast } from '@/context/ToastContext';
import { usePolling } from '@/hooks/usePolling';
import { hasSubmittedDocs, getSlaStatus } from '@/lib/verification';
import ActionRequiredAnalytics from '@/components/dashboard/ActionRequiredAnalytics';

const VerificationModal = dynamic(() => import('@/components/VerificationModal'), {
  ssr: false,
});

function VerificationsPageContent() {
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get('search') || '';
  const urlTab = searchParams.get('tab');

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewUser, setReviewUser] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState<'approved' | 'rejected' | null>(null);
  const [statusTab, setStatusTab] = useState<'pending' | 'awaiting_upload' | 'rejected' | 'approved' | 'all'>(
    urlTab === 'awaiting_upload' || urlTab === 'rejected' || urlTab === 'approved' || urlTab === 'all'
      ? (urlTab as any)
      : 'pending'
  );
  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [slaFilter, setSlaFilter] = useState<'all' | 'overdue' | 'urgent' | 'priority' | 'normal'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
  });

  const itemsPerPage = 5;

  // Tick real-time SLA counters every second
  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync search query from URL query parameter
  useEffect(() => {
    setSearchTerm(urlSearch);
    setCurrentPage(1);
  }, [urlSearch]);

  const fetchVerifications = useCallback(async (silent = false, forceRefresh = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await adminApi.getVerifications(true, forceRefresh);
      setUsers(res.data.data || []);
    } catch (err: any) {
      if (!silent) setError(err.message || 'Failed to load verifications');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVerifications(false, false);
  }, [fetchVerifications]);

  usePolling(() => fetchVerifications(true, true), 15000);

  useEffect(() => {
    const handleRefresh = () => {
      fetchVerifications(true, true);
    };
    window.addEventListener('admin:refresh-notifications', handleRefresh);
    window.addEventListener('focus', handleRefresh);
    return () => {
      window.removeEventListener('admin:refresh-notifications', handleRefresh);
      window.removeEventListener('focus', handleRefresh);
    };
  }, [fetchVerifications]);

  const { toast } = useToast();

  const handleVerify = async (id: number, status: 'approved' | 'rejected', reason?: string) => {
    const targetUser = users.find((u) => u.id === id);
    try {
      setActionLoading(status);
      await adminApi.verifyUser(id, status, status === 'rejected' ? reason : undefined);
      
      // Update state locally immediately
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === id) {
            return {
              ...u,
              verification_status: status,
              registration_status: status,
              verification_badge: status === 'approved',
              rejection_reason: status === 'rejected' ? reason : null,
              document_url: status === 'rejected' ? null : u.document_url,
              document_back_url: status === 'rejected' ? null : u.document_back_url,
              selfie_url: status === 'rejected' ? null : u.selfie_url,
              business_documents: status === 'rejected' ? null : u.business_documents,
              updated_at: new Date().toISOString(),
            };
          }
          return u;
        })
      );
      
      if (status === 'approved') {
        toast.success(`Verification approved for ${targetUser?.name || 'user'}.`, 'Verification Approved');
      } else {
        toast.info(`Verification rejected for ${targetUser?.name || 'user'}${reason ? ': ' + reason : '.'}`, 'Verification Rejected');
      }

      setReviewUser(null);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('admin:refresh-notifications'));
      }
      fetchVerifications(true, true); // Refresh list
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Verification update failed.', 'Action Failed');
      setAlertState({
        isOpen: true,
        title: 'Action Failed',
        message: 'Action failed: ' + (err.response?.data?.message || err.message),
      });
    } finally {
      setActionLoading(null);
    }
  };

  // 2. Action Required from User: registered users waiting for user action (OTP, ID upload, or re-upload)
  const allActionRequiredUsers = useMemo(() => {
    return users.filter((u) => {
      const isApproved =
        u.verification_status === 'approved' ||
        !!u.verification_badge;
      if (isApproved) return false;

      const isRejected =
        u.verification_status === 'rejected' ||
        u.registration_status === 'rejected';

      return isRejected || !hasSubmittedDocs(u);
    });
  }, [users]);

  if (error) return <div className="text-center py-20 text-status-error font-body">{error}</div>;

  // 1. Pending: only users who submitted verification documents and are awaiting review (not approved, not rejected, not badged)
  const allPendingUsers = users.filter((u) => {
    const isApproved =
      u.verification_status === 'approved' ||
      !!u.verification_badge;
    const isRejected =
      u.verification_status === 'rejected' ||
      u.registration_status === 'rejected';
    return !isApproved && !isRejected && hasSubmittedDocs(u);
  });

  // 3. Rejected: users who were rejected and are awaiting re-upload in the app
  const allRejectedUsers = users.filter((u) => {
    return (
      u.verification_status === 'rejected' ||
      u.registration_status === 'rejected'
    );
  });

  // 4. Approved: users who have completed ID verification
  const allApprovedUsers = users.filter((u) => {
    return (
      u.verification_status === 'approved' ||
      !!u.verification_badge
    );
  });

  const overdueCount = allPendingUsers.filter((u) => {
    const sla = getSlaStatus(u.updated_at || u.created_at, nowMs);
    return sla.isOverdue;
  }).length;

  const currentTabUsers =
    statusTab === 'pending'
      ? allPendingUsers
      : statusTab === 'awaiting_upload'
        ? allActionRequiredUsers
        : statusTab === 'rejected'
          ? allRejectedUsers
          : statusTab === 'approved'
            ? allApprovedUsers
            : users;

  const displayedUsers = currentTabUsers
    .filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.rejection_reason && u.rejection_reason.toLowerCase().includes(searchTerm.toLowerCase()));
      if (!matchesSearch) return false;

      if (slaFilter !== 'all' && statusTab === 'pending') {
        const sla = getSlaStatus(u.updated_at || u.created_at, nowMs);
        if (slaFilter === 'overdue' && !sla.isOverdue) return false;
        if (slaFilter === 'urgent' && sla.badge !== 'urgent') return false;
        if (slaFilter === 'priority' && sla.badge !== 'priority') return false;
        if (slaFilter === 'normal' && sla.badge !== 'normal') return false;
      }
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
      const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

  const totalPages = Math.ceil(displayedUsers.length / itemsPerPage) || 1;
  const paginatedUsers = displayedUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-display font-bold text-ink">ID Verifications</h1>
            {allPendingUsers.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold font-numeric bg-primary text-white shadow-2xs">
                {allPendingUsers.length} Pending
              </span>
            )}
            {overdueCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-numeric bg-rose-600 text-white shadow-2xs flex items-center gap-1.5 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                {overdueCount} Overdue (&gt;48h)
              </span>
            )}
          </div>
          <p className="text-xs text-ink-muted mt-0.5">
            Review and approve user-submitted government IDs to grant platform access.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-3 md:mt-0 text-xs">
          {statusTab !== 'awaiting_upload' && (
            <>
              <div className="relative w-full md:w-60 group">
                <input
                  type="text"
                  aria-label={statusTab === 'pending' ? 'Search pending users' : 'Search users'}
                  placeholder={statusTab === 'rejected' ? 'Search rejected users or reasons...' : 'Search users...'}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 bg-white/90 dark:bg-slate-900/90 rounded-xl border border-ink-faint/40 dark:border-slate-700 shadow-xs focus:bg-white dark:focus:bg-slate-900 focus:border-ink/50 dark:focus:border-slate-500 outline-none text-xs font-body transition text-ink dark:text-slate-200 placeholder:text-ink-muted dark:placeholder:text-slate-400"
                />
                <i className="lni lni-search text-ink-muted dark:text-slate-400 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-xs" />
              </div>

              {statusTab === 'pending' && (
                <div className="relative">
                  <select
                    aria-label="Filter by SLA status"
                    value={slaFilter}
                    onChange={(e) => {
                      setSlaFilter(e.target.value as any);
                      setCurrentPage(1);
                    }}
                    className="appearance-none pl-3 pr-7 py-1.5 rounded-lg font-body font-semibold text-xs transition-colors bg-white dark:bg-slate-900 border border-ink-faint/40 dark:border-slate-700 text-ink dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 outline-none cursor-pointer"
                  >
                    <option value="all" className="bg-white dark:bg-slate-900 text-ink dark:text-slate-200">All SLAs</option>
                    <option value="overdue" className="bg-white dark:bg-slate-900 text-ink dark:text-slate-200">🚨 Overdue (&gt;48h)</option>
                    <option value="urgent" className="bg-white dark:bg-slate-900 text-ink dark:text-slate-200">⚠️ Urgent (24-48h)</option>
                    <option value="priority" className="bg-white dark:bg-slate-900 text-ink dark:text-slate-200">⏱️ Priority (12-24h)</option>
                    <option value="normal" className="bg-white dark:bg-slate-900 text-ink dark:text-slate-200">✅ Normal (&lt;12h)</option>
                  </select>
                  <i className="lni lni-chevron-down absolute right-2.5 top-1/2 transform -translate-y-1/2 text-ink-muted dark:text-slate-400 text-[10px] pointer-events-none" />
                </div>
              )}

              <div className="relative">
                <select
                  aria-label="Sort order"
                  value={sortOrder}
                  onChange={(e) => {
                    setSortOrder(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="appearance-none pl-3 pr-7 py-1.5 rounded-lg font-body font-semibold text-xs transition-colors bg-white dark:bg-slate-900 border border-ink-faint/40 dark:border-slate-700 text-ink dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 outline-none cursor-pointer"
                >
                  <option value="newest" className="bg-white dark:bg-slate-900 text-ink dark:text-slate-200">Newest First</option>
                  <option value="oldest" className="bg-white dark:bg-slate-900 text-ink dark:text-slate-200">Oldest First</option>
                </select>
                <i className="lni lni-chevron-down absolute right-2.5 top-1/2 transform -translate-y-1/2 text-ink-muted dark:text-slate-400 text-[10px] pointer-events-none" />
              </div>
            </>
          )}

          <button
            onClick={() => fetchVerifications(false, true)}
            aria-label="Refresh verifications list"
            className="p-1.5 bg-white dark:bg-slate-900 rounded-lg border border-ink-faint/40 dark:border-slate-700 shadow-2xs hover:bg-slate-100 dark:hover:bg-slate-800 text-ink-soft dark:text-slate-300 hover:text-primary dark:hover:text-primary transition flex items-center justify-center cursor-pointer"
            title="Refresh list"
          >
            <i className={`lni lni-reload text-xs ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Status Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 mb-4 border-b border-ink-faint/30 pb-3">
        <button
          onClick={() => {
            setStatusTab('pending');
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-body font-semibold transition-all cursor-pointer ${
            statusTab === 'pending'
              ? 'bg-ink text-white dark:bg-slate-800 dark:text-white dark:border dark:border-slate-700 shadow-2xs'
              : 'bg-white/80 dark:bg-slate-800/80 text-ink-muted dark:text-slate-300 hover:text-ink dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700'
          }`}
        >
          <span>Pending Review</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-xs font-numeric font-medium ${
              statusTab === 'pending' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-ink-muted dark:text-slate-300'
            }`}
          >
            {allPendingUsers.length}
          </span>
        </button>

        <button
          onClick={() => {
            setStatusTab('awaiting_upload');
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-body font-semibold transition-all cursor-pointer ${
            statusTab === 'awaiting_upload'
              ? 'bg-ink text-white dark:bg-slate-800 dark:text-white dark:border dark:border-slate-700 shadow-2xs'
              : 'bg-white/80 dark:bg-slate-800/80 text-ink-muted dark:text-slate-300 hover:text-ink dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700'
          }`}
        >
          <span>Action Required from User</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-xs font-numeric font-medium ${
              statusTab === 'awaiting_upload' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-ink-muted dark:text-slate-300'
            }`}
          >
            {allActionRequiredUsers.length}
          </span>
        </button>

        <button
          onClick={() => {
            setStatusTab('rejected');
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-body font-semibold transition-all cursor-pointer ${
            statusTab === 'rejected'
              ? 'bg-ink text-white dark:bg-slate-800 dark:text-white dark:border dark:border-slate-700 shadow-2xs'
              : 'bg-white/80 dark:bg-slate-800/80 text-ink-muted dark:text-slate-300 hover:text-ink dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700'
          }`}
        >
          <span>Rejected / Awaiting Re-upload</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-xs font-numeric font-medium ${
              statusTab === 'rejected' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-ink-muted dark:text-slate-300'
            }`}
          >
            {allRejectedUsers.length}
          </span>
        </button>

        <button
          onClick={() => {
            setStatusTab('approved');
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-body font-semibold transition-all cursor-pointer ${
            statusTab === 'approved'
              ? 'bg-ink text-white dark:bg-slate-800 dark:text-white dark:border dark:border-slate-700 shadow-2xs'
              : 'bg-white/80 dark:bg-slate-800/80 text-ink-muted dark:text-slate-300 hover:text-ink dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700'
          }`}
        >
          <span>Approved</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-xs font-numeric font-medium ${
              statusTab === 'approved' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-ink-muted dark:text-slate-300'
            }`}
          >
            {allApprovedUsers.length}
          </span>
        </button>

        <button
          onClick={() => {
            setStatusTab('all');
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-body font-semibold transition-all cursor-pointer ${
            statusTab === 'all'
              ? 'bg-ink text-white dark:bg-slate-800 dark:text-white dark:border dark:border-slate-700 shadow-2xs'
              : 'bg-white/80 dark:bg-slate-800/80 text-ink-muted dark:text-slate-300 hover:text-ink dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700'
          }`}
        >
          <span>All Records</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-xs font-numeric font-medium ${
              statusTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-ink-muted dark:text-slate-300'
            }`}
          >
            {users.length}
          </span>
        </button>
      </div>

      {statusTab === 'awaiting_upload' ? (
        loading ? (
          <div className="p-8 space-y-3 bg-white/95 rounded-2xl border border-ink-faint/30">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-ink-faint/20 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <ActionRequiredAnalytics
            users={allActionRequiredUsers}
            nowMs={nowMs}
            onInspectUser={(u) => setReviewUser(u)}
          />
        )
      ) : (
        <>
          <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-xs border border-ink-faint/30 overflow-hidden">
            {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-ink-faint/20 rounded-xl animate-pulse flex items-center justify-between px-4">
                <div className="w-1/3 h-4 bg-ink-faint/40 rounded-lg"></div>
                <div className="w-1/6 h-4 bg-ink-faint/40 rounded-lg"></div>
                <div className="w-1/4 h-6 bg-ink-faint/40 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : displayedUsers.length === 0 ? (
          <div className="p-10 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 bg-status-success/10 rounded-full flex items-center justify-center mb-3 shadow-inner">
              <i className="lni lni-checkmark-circle text-2xl text-status-success" />
            </div>
            <h3 className="font-display text-lg font-bold text-ink">
              {statusTab === 'pending'
                ? 'All caught up!'
                : statusTab === 'rejected'
                  ? 'No rejected verifications'
                  : 'No records found'}
            </h3>
            <p className="font-body text-ink-muted mt-1 text-xs">
              {statusTab === 'pending'
                ? 'There are no pending ID verifications at the moment.'
                : statusTab === 'rejected'
                  ? 'No users currently have rejected verification credentials awaiting re-upload.'
                  : 'No verification records match your filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left font-body table-fixed border-collapse">
              <thead className="bg-slate-50/70 dark:bg-slate-800/50 border-b border-ink-faint/30 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3.5 font-body font-semibold text-ink-muted dark:text-slate-400 text-xs uppercase tracking-wider w-[10%]">User ID</th>
                  <th className="px-4 py-3.5 font-body font-semibold text-ink-muted dark:text-slate-400 text-xs uppercase tracking-wider w-[36%]">User Details</th>
                  <th className="px-4 py-3.5 font-body font-semibold text-ink-muted dark:text-slate-400 text-xs uppercase tracking-wider w-[16%]">Role</th>
                  {statusTab === 'rejected' ? (
                    <th className="px-4 py-3.5 font-body font-semibold text-ink-muted dark:text-slate-400 text-xs uppercase tracking-wider w-[24%]">Rejection Reason</th>
                  ) : (
                    <th className="px-4 py-3.5 font-body font-semibold text-ink-muted dark:text-slate-400 text-xs uppercase tracking-wider w-[24%]">Submitted & SLA Age</th>
                  )}
                  <th className="px-4 py-3.5 font-body font-semibold text-ink-muted dark:text-slate-400 text-xs uppercase tracking-wider w-[14%] text-right">
                    {statusTab === 'rejected' ? 'Status' : 'Action'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-faint/20 dark:divide-slate-800">
                {paginatedUsers.map((user) => {
                  const isUserRejected = user.verification_status === 'rejected' || user.registration_status === 'rejected';
                  const isUserApproved = user.verification_status === 'approved' || !!user.verification_badge;

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition-colors duration-150">
                      <td className="px-4 py-3.5 text-xs font-numeric font-semibold text-ink-muted dark:text-slate-400">
                        #{user.id}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center">
                          <Avatar name={user.name} url={user.avatar_url} />
                          <div className="ml-3 truncate">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-body font-semibold text-ink dark:text-slate-100 text-sm truncate">{user.name}</span>
                              {user.blacklist_matches && user.blacklist_matches.length > 0 && (
                                <span
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md"
                                  title={`Possible Blacklist Match (${user.blacklist_matches.length})`}
                                >
                                  <i className="lni lni-warning text-xs" /> Blacklist Match
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-ink-muted dark:text-slate-400 truncate mt-0.5">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-1.5 items-start">
                          <span className="badge-neutral uppercase tracking-wide text-xs">
                            {user.role}
                          </span>
                          {isUserRejected ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                              <i className="lni lni-cross-circle text-xs" /> Rejected
                            </span>
                          ) : isUserApproved ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              <i className="lni lni-checkmark text-xs" /> Verified
                            </span>
                          ) : user.role === 'employer' && (user.business_documents && (Array.isArray(user.business_documents) ? user.business_documents.length > 0 : !!user.business_documents)) ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                              <i className="lni lni-files text-xs text-slate-500 dark:text-slate-400" />
                              {Array.isArray(user.business_documents) ? `${user.business_documents.length} Doc(s)` : 'Business Doc'}
                            </span>
                          ) : user.document_url ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                              <i className="lni lni-postcard text-xs text-slate-500 dark:text-slate-400" /> Govt ID
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100/80 dark:bg-slate-800/60 px-2 py-0.5 rounded border border-slate-200/80 dark:border-slate-700/80">
                              <i className="lni lni-timer text-xs text-slate-400" /> Pending ID
                            </span>
                          )}
                        </div>
                      </td>

                      {statusTab === 'rejected' ? (
                        <td className="px-4 py-3.5 text-xs font-body">
                          <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5 max-w-sm">
                            <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider block mb-0.5">
                              Rejection Reason:
                            </span>
                            <span className="text-rose-800 dark:text-rose-300 font-medium text-xs italic">
                              "{user.rejection_reason || 'Document does not meet verification requirements.'}"
                            </span>
                          </div>
                        </td>
                      ) : (
                        <td className="px-4 py-3.5 text-xs font-body font-medium text-ink-soft dark:text-slate-300">
                          <div>
                            {new Date(user.updated_at || user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                            <span className="text-xs text-ink-muted dark:text-slate-400 ml-1">
                              {new Date(user.updated_at || user.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {!isUserRejected && !isUserApproved && hasSubmittedDocs(user) && (
                            <div className="mt-1 flex items-center gap-1.5">
                              {(() => {
                                const sla = getSlaStatus(user.updated_at || user.created_at, nowMs, true);
                                return (
                                  <span
                                    title={`Submitted: ${new Date(user.updated_at || user.created_at).toLocaleString()}`}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-numeric border ${sla.color}`}
                                  >
                                    {sla.isOverdue && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />}
                                    <i className="lni lni-timer text-xs" />
                                    <span>SLA: {sla.label}</span>
                                  </span>
                                );
                              })()}
                            </div>
                          )}
                        </td>
                      )}

                      <td className="px-4 py-3.5 text-right">
                        {isUserRejected ? (
                          <div className="flex flex-col items-end gap-1">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              <i className="lni lni-reload text-xs text-slate-500" /> Awaiting Re-upload
                            </span>
                            <span className="text-xs text-ink-muted dark:text-slate-400">
                              {new Date(user.updated_at || user.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        ) : isUserApproved ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20">
                            Approved ✓
                          </span>
                        ) : !hasSubmittedDocs(user) ? (
                          <div className="flex flex-col items-end gap-0.5">
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 cursor-not-allowed select-none"
                              title="Cannot verify: User has not uploaded identification documents yet. Awaiting applicant upload in mobile app."
                            >
                              <i className="lni lni-hourglass text-xs" />
                              Awaiting User
                            </span>
                            <span className="text-[11px] text-ink-muted dark:text-slate-400">Verification Locked</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => setReviewUser(user)}
                            className="btn-glass px-3.5 py-1.5 text-xs font-semibold"
                          >
                            Review
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
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
              aria-label="Previous page"
              className="p-2.5 rounded-xl border border-ink-faint/50 bg-white/70 text-ink hover:bg-white/95 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <i className="lni lni-arrow-left text-sm" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              aria-label="Next page"
              className="p-2.5 rounded-xl border border-ink-faint/50 bg-white/70 text-ink hover:bg-white/95 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <i className="lni lni-arrow-right text-sm" />
            </button>
          </div>
        </div>
      )}
    </>
  )}

      {/* Callout Section for Accounts Requiring User Action */}
      {statusTab === 'pending' && allActionRequiredUsers.length > 0 && (
        <div className="mt-8 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-800 shrink-0 mt-0.5">
              <i className="lni lni-timer text-xl" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                {allActionRequiredUsers.length} Incomplete Account{allActionRequiredUsers.length === 1 ? '' : 's'} Requiring User Action
              </h3>
              <p className="text-xs text-amber-700/90 dark:text-amber-300 mt-0.5 leading-relaxed">
                These users registered on SIKAP but need to complete email OTP verification or upload identification documents. View real-time analytics, duration tracking, and filterable accounts.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setStatusTab('awaiting_upload');
              setCurrentPage(1);
            }}
            className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold rounded-xl transition shadow-xs whitespace-nowrap self-start sm:self-auto cursor-pointer flex items-center gap-1.5"
          >
            <span>View Action Required Analytics ({allActionRequiredUsers.length})</span>
            <i className="lni lni-arrow-right text-xs" />
          </button>
        </div>
      )}

      {reviewUser && (
        <VerificationModal
          user={reviewUser}
          onClose={() => setReviewUser(null)}
          onVerify={handleVerify}
          actionLoading={actionLoading}
        />
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

export default function VerificationsPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 font-body text-ink-muted">Loading verifications...</div>}>
      <VerificationsPageContent />
    </Suspense>
  );
}
