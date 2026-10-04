'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { adminApi } from '@/lib/api';
import Avatar from '@/components/Avatar';
import dynamic from 'next/dynamic';
import { AlertDialog } from '@/components/AlertDialog';
import { exportMultiSectionCSV, formatCSVDate, formatCSVStatus } from '@/lib/export/csv';

const VerificationModal = dynamic(() => import('@/components/VerificationModal'), {
  ssr: false,
});

function getSlaStatus(submittedDate: string | Date | undefined) {
  if (!submittedDate) {
    return { label: '<12h Normal', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', isOverdue: false, badge: 'normal' };
  }
  const d = new Date(submittedDate).getTime();
  const diffHours = (Date.now() - d) / (1000 * 60 * 60);

  if (diffHours >= 48) {
    return {
      label: `${Math.floor(diffHours)}h (Overdue)`,
      color: 'bg-rose-50 text-rose-700 border-rose-300 font-bold',
      isOverdue: true,
      badge: 'overdue',
    };
  }
  if (diffHours >= 24) {
    return {
      label: `${Math.floor(diffHours)}h (Urgent)`,
      color: 'bg-amber-50 text-amber-700 border-amber-300 font-semibold',
      isOverdue: false,
      badge: 'urgent',
    };
  }
  if (diffHours >= 12) {
    return {
      label: `${Math.floor(diffHours)}h (Priority)`,
      color: 'bg-sky-50 text-sky-700 border-sky-200 font-medium',
      isOverdue: false,
      badge: 'priority',
    };
  }
  return {
    label: `${Math.max(1, Math.floor(diffHours))}h (Normal)`,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium',
    isOverdue: false,
    badge: 'normal',
  };
}

function VerificationsPageContent() {
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get('search') || '';

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewUser, setReviewUser] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState<'approved' | 'rejected' | null>(null);
  const [statusTab, setStatusTab] = useState<'pending' | 'rejected' | 'all'>('pending');
  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [slaFilter, setSlaFilter] = useState<'all' | 'overdue' | 'urgent' | 'priority' | 'normal'>('all');
  const [currentPage, setCurrentPage] = useState(1);
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

  // Sync search query from URL query parameter
  useEffect(() => {
    setSearchTerm(urlSearch);
    setCurrentPage(1);
  }, [urlSearch]);

  const fetchVerifications = async (silent = false, forceRefresh = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await adminApi.getVerifications(true, forceRefresh);
      setUsers(res.data.data || []);
    } catch (err: any) {
      if (!silent) setError(err.message || 'Failed to load verifications');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!users || users.length === 0) {
      setAlertState({
        isOpen: true,
        title: 'Export Empty',
        message: 'There are no verification records available to export.',
      });
      return;
    }

    const headers = [
      'User ID',
      'Full Name',
      'Role',
      'Email Address',
      'Phone Number',
      'Municipality',
      'Barangay',
      'Verification Status',
      'Front ID Uploaded',
      'Back ID Uploaded',
      'Selfie Uploaded',
      'Rejection Reason',
      'Submission Date',
      'Last Review Date'
    ];

    const rows = displayedUsers.map((u) => [
      u.id,
      u.name,
      u.role,
      u.email,
      u.phone || '',
      u.municipality || 'Bulan',
      u.barangay || '',
      formatCSVStatus(u.verification_status || u.registration_status),
      u.document_url ? 'Yes' : 'No',
      u.document_back_url ? 'Yes' : 'No',
      u.selfie_url ? 'Yes' : 'No',
      u.rejection_reason || '',
      formatCSVDate(u.created_at),
      formatCSVDate(u.updated_at)
    ]);

    const reportTypeName =
      statusTab === 'pending'
        ? 'Pending Review Queue'
        : statusTab === 'rejected'
          ? 'Rejected Verifications Masterlist'
          : 'All Verifications';

    exportMultiSectionCSV(
      `sikap_verifications_${statusTab}_${new Date().toISOString().slice(0, 10)}`,
      `SIKAP Identity Verifications (${reportTypeName})`,
      [
        ['Generated On:', formatCSVDate(new Date().toISOString())],
        ['Report Type:', reportTypeName],
        ['Total Records in View:', String(displayedUsers.length)],
        ['Current Tab:', statusTab.toUpperCase()],
        ['Sort Order:', sortOrder.toUpperCase()],
      ],
      [
        {
          title: `Verification Records (${reportTypeName})`,
          headers,
          rows,
        },
      ]
    );
  };

  useEffect(() => {
    let cancelled = false;

    const loadVerifications = async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        const res = await adminApi.getVerifications(true, true);
        if (!cancelled) {
          setUsers(res.data.data || []);
        }
      } catch (err: any) {
        if (!cancelled && !silent) setError(err.message || 'Failed to load verifications');
      } finally {
        if (!cancelled && !silent) setLoading(false);
      }
    };

    loadVerifications();
    const timer = setInterval(() => loadVerifications(true), 30000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const handleVerify = async (id: number, status: 'approved' | 'rejected', reason?: string) => {
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
      
      setReviewUser(null);
      fetchVerifications(true, true); // Refresh list
    } catch (err: any) {
      setAlertState({
        isOpen: true,
        title: 'Action Failed',
        message: 'Action failed: ' + (err.response?.data?.message || err.message),
      });
    } finally {
      setActionLoading(null);
    }
  };

  if (error) return <div className="text-center py-20 text-status-error font-body">{error}</div>;

  // 1. Pending: only users whose verification is pending (not approved, not rejected, not badged)
  const allPendingUsers = users.filter((u) => {
    const isApproved =
      u.verification_status === 'approved' ||
      u.registration_status === 'approved' ||
      !!u.verification_badge;
    const isRejected =
      u.verification_status === 'rejected' ||
      u.registration_status === 'rejected';
    return !isApproved && !isRejected;
  });

  // 2. Rejected: users who were rejected and are awaiting re-upload in the app
  const allRejectedUsers = users.filter((u) => {
    return (
      u.verification_status === 'rejected' ||
      u.registration_status === 'rejected'
    );
  });

  // 3. Approved: users who have completed verification
  const allApprovedUsers = users.filter((u) => {
    return (
      u.verification_status === 'approved' ||
      u.registration_status === 'approved' ||
      !!u.verification_badge
    );
  });

  const overdueCount = allPendingUsers.filter((u) => {
    const sla = getSlaStatus(u.updated_at || u.created_at);
    return sla.isOverdue;
  }).length;

  const currentTabUsers =
    statusTab === 'pending'
      ? allPendingUsers
      : statusTab === 'rejected'
        ? allRejectedUsers
        : users;

  const displayedUsers = currentTabUsers
    .filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.rejection_reason && u.rejection_reason.toLowerCase().includes(searchTerm.toLowerCase()));
      if (!matchesSearch) return false;

      if (slaFilter !== 'all' && statusTab === 'pending') {
        const sla = getSlaStatus(u.updated_at || u.created_at);
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
          <div className="relative w-full md:w-60 group">
            <input
              type="text"
              aria-label="Search users"
              placeholder={statusTab === 'rejected' ? 'Search rejected users or reasons...' : 'Search users...'}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 bg-white/90 rounded-xl border border-ink-faint/40 shadow-xs focus:bg-white focus:border-ink/50 outline-none text-xs font-body transition"
            />
            <i className="lni lni-search text-ink-muted absolute left-2.5 top-1/2 transform -translate-y-1/2 text-xs" />
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
                className="appearance-none pl-3 pr-7 py-1.5 rounded-lg font-body font-semibold text-xs transition-colors bg-white border border-ink-faint/40 text-ink-soft focus:bg-white outline-none cursor-pointer"
              >
                <option value="all">All SLAs</option>
                <option value="overdue">🚨 Overdue (&gt;48h)</option>
                <option value="urgent">⚠️ Urgent (24-48h)</option>
                <option value="priority">⏱️ Priority (12-24h)</option>
                <option value="normal">✅ Normal (&lt;12h)</option>
              </select>
              <i className="lni lni-chevron-down absolute right-2.5 top-1/2 transform -translate-y-1/2 text-ink-muted text-[10px] pointer-events-none" />
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
              className="appearance-none pl-3 pr-7 py-1.5 rounded-lg font-body font-semibold text-xs transition-colors bg-white border border-ink-faint/40 text-ink-soft focus:bg-white outline-none cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
            <i className="lni lni-chevron-down absolute right-2.5 top-1/2 transform -translate-y-1/2 text-ink-muted text-[10px] pointer-events-none" />
          </div>

          <button
            onClick={handleExportCSV}
            aria-label="Export verifications as CSV"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-ink-faint/40 shadow-2xs hover:bg-slate-900 hover:text-white text-ink-soft transition font-body font-bold text-xs cursor-pointer"
            title="Export verifications list as CSV"
          >
            <i className="lni lni-download text-xs" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => fetchVerifications(false, true)}
            aria-label="Refresh verifications list"
            className="p-1.5 bg-white rounded-lg border border-ink-faint/40 shadow-2xs hover:bg-white text-ink-soft hover:text-primary transition flex items-center justify-center cursor-pointer"
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
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-body font-bold transition-all cursor-pointer ${
            statusTab === 'pending'
              ? 'bg-primary text-white shadow-2xs'
              : 'bg-white/80 text-ink-muted hover:text-ink hover:bg-white border border-ink-faint/40'
          }`}
        >
          <span>Pending Review</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-numeric font-bold ${
              statusTab === 'pending' ? 'bg-white/20 text-white' : 'bg-slate-100 text-ink-muted'
            }`}
          >
            {allPendingUsers.length}
          </span>
        </button>

        <button
          onClick={() => {
            setStatusTab('rejected');
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-body font-bold transition-all cursor-pointer ${
            statusTab === 'rejected'
              ? 'bg-rose-600 text-white shadow-2xs'
              : 'bg-white/80 text-ink-muted hover:text-ink hover:bg-white border border-ink-faint/40'
          }`}
        >
          <span>Rejected / Awaiting Re-upload</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-numeric font-bold ${
              statusTab === 'rejected' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700'
            }`}
          >
            {allRejectedUsers.length}
          </span>
        </button>

        <button
          onClick={() => {
            setStatusTab('all');
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-body font-bold transition-all cursor-pointer ${
            statusTab === 'all'
              ? 'bg-slate-800 text-white shadow-2xs'
              : 'bg-white/80 text-ink-muted hover:text-ink hover:bg-white border border-ink-faint/40'
          }`}
        >
          <span>All Records</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-numeric font-bold ${
              statusTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-ink-muted'
            }`}
          >
            {users.length}
          </span>
        </button>
      </div>

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
              <thead className="bg-slate-50/70 border-b border-ink-faint/30">
                <tr>
                  <th className="px-4 py-3 font-body font-semibold text-ink-muted text-[11px] uppercase tracking-wider w-[10%]">User ID</th>
                  <th className="px-4 py-3 font-body font-semibold text-ink-muted text-[11px] uppercase tracking-wider w-[36%]">User Details</th>
                  <th className="px-4 py-3 font-body font-semibold text-ink-muted text-[11px] uppercase tracking-wider w-[16%]">Role</th>
                  {statusTab === 'rejected' ? (
                    <th className="px-4 py-3 font-body font-semibold text-ink-muted text-[11px] uppercase tracking-wider w-[24%]">Rejection Reason</th>
                  ) : (
                    <th className="px-4 py-3 font-body font-semibold text-ink-muted text-[11px] uppercase tracking-wider w-[24%]">Submitted & SLA Age</th>
                  )}
                  <th className="px-4 py-3 font-body font-semibold text-ink-muted text-[11px] uppercase tracking-wider w-[14%] text-right">
                    {statusTab === 'rejected' ? 'Status' : 'Action'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-faint/20">
                {paginatedUsers.map((user) => {
                  const isUserRejected = user.verification_status === 'rejected' || user.registration_status === 'rejected';
                  const isUserApproved = user.verification_status === 'approved' || user.registration_status === 'approved' || !!user.verification_badge;

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/70 transition-colors duration-150">
                      <td className="px-4 py-3 text-xs font-numeric font-bold text-ink-muted">
                        #{user.id}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <Avatar name={user.name} url={user.avatar_url} />
                          <div className="ml-3 truncate">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-body font-bold text-ink text-xs truncate">{user.name}</span>
                              {user.blacklist_matches && user.blacklist_matches.length > 0 && (
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100 border border-rose-200 px-1.5 py-0.5 rounded-full"
                                  title={`Possible Blacklist Match (${user.blacklist_matches.length})`}
                                >
                                  ⚠️ Blacklist Match
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-ink-muted truncate">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-body font-bold tracking-wide uppercase ${
                            user.role === 'employer' ? 'bg-accent-peach text-primary-dark border border-accent-peachBright/50' : 'bg-accent-mint text-accent-mintDeep border border-accent-mintDeep/30'
                          }`}>
                            {user.role}
                          </span>
                          {isUserRejected ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                              <i className="lni lni-cross-circle text-[10px]" /> Rejected
                            </span>
                          ) : isUserApproved ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              <i className="lni lni-checkmark text-[10px]" /> Verified
                            </span>
                          ) : user.role === 'employer' && (user.business_documents && (Array.isArray(user.business_documents) ? user.business_documents.length > 0 : !!user.business_documents)) ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                              <i className="lni lni-files text-[10px]" />
                              {Array.isArray(user.business_documents) ? `${user.business_documents.length} Doc(s)` : 'Business Doc'}
                            </span>
                          ) : user.document_url ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-ink-soft bg-paper px-1.5 py-0.5 rounded border border-ink-faint">
                              <i className="lni lni-postcard text-[10px]" /> Govt ID
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              <i className="lni lni-timer text-[10px]" /> Pending ID
                            </span>
                          )}
                        </div>
                      </td>

                      {statusTab === 'rejected' ? (
                        <td className="px-4 py-3 text-xs font-body">
                          <div className="bg-rose-50/70 border border-rose-200/70 rounded-lg p-2 max-w-sm">
                            <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block mb-0.5">
                              Rejection Reason:
                            </span>
                            <span className="text-rose-900 font-medium text-[11px] italic">
                              "{user.rejection_reason || 'Document does not meet verification requirements.'}"
                            </span>
                          </div>
                        </td>
                      ) : (
                        <td className="px-4 py-3 text-xs font-body font-medium text-ink-soft">
                          <div>{new Date(user.updated_at || user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                          {!isUserRejected && !isUserApproved && (
                            <div className="mt-1 flex items-center gap-1.5">
                              {(() => {
                                const sla = getSlaStatus(user.updated_at || user.created_at);
                                return (
                                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border ${sla.color}`}>
                                    {sla.isOverdue && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />}
                                    <i className="lni lni-timer text-[9px]" />
                                    <span>{sla.label}</span>
                                  </span>
                                );
                              })()}
                            </div>
                          )}
                        </td>
                      )}

                      <td className="px-4 py-3 text-right">
                        {isUserRejected ? (
                          <div className="flex flex-col items-end gap-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <i className="lni lni-reload text-[9px]" /> Awaiting Re-upload
                            </span>
                            <span className="text-[10px] text-ink-muted">
                              {new Date(user.updated_at || user.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        ) : isUserApproved ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200">
                            Approved ✓
                          </span>
                        ) : (
                          <button
                            onClick={() => setReviewUser(user)}
                            className="bg-ink text-white px-3 py-1.5 rounded-lg text-xs font-body font-semibold hover:bg-ink-soft transition-colors cursor-pointer"
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
