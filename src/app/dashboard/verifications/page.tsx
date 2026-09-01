'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { adminApi } from '@/lib/api';
import Avatar from '@/components/Avatar';
import dynamic from 'next/dynamic';
import { AlertDialog } from '@/components/AlertDialog';

const VerificationModal = dynamic(() => import('@/components/VerificationModal'), {
  ssr: false,
});

function VerificationsPageContent() {
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get('search') || '';

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewUser, setReviewUser] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState<'approved' | 'rejected' | null>(null);
  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
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

  const fetchVerifications = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await adminApi.getVerifications();
      setUsers(res.data.data || []);
    } catch (err: any) {
      if (!silent) setError(err.message || 'Failed to load verifications');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadVerifications = async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        const res = await adminApi.getVerifications();
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
      
      // Instantly remove the verified/rejected user from state
      setUsers((prev) => prev.filter((u) => u.id !== id));
      
      setReviewUser(null);
      fetchVerifications(true); // Refresh list
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

  const pendingUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch && (u.verification_status === 'pending' || u.registration_status === 'pending_review');
  }).sort((a, b) => {
    const dateA = new Date(a.updated_at).getTime();
    const dateB = new Date(b.updated_at).getTime();
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  const totalPages = Math.ceil(pendingUsers.length / itemsPerPage) || 1;
  const paginatedUsers = pendingUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-display text-transparent bg-clip-text bg-gradient-to-r from-ink to-primary-dark font-bold">ID Verifications</h1>
          <p className="text-ink-soft font-body mt-2 text-lg">
            Review and approve user-submitted government IDs to grant platform access.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-6 md:mt-0">
          <div className="relative w-full md:w-64 group">
            <input
              type="text"
              aria-label="Search pending users"
              placeholder="Search pending users..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-white/70 backdrop-blur-md rounded-xl border border-white/50 shadow-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary transition text-sm font-body"
            />
            <i className="lni lni-search text-ink-muted absolute left-3.5 top-1/2 transform -translate-y-1/2" />
          </div>

          <div className="relative">
            <select
              aria-label="Sort order"
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value as any);
                setCurrentPage(1);
              }}
              className="appearance-none pl-4 pr-10 py-2.5 rounded-xl font-body font-semibold text-sm transition-colors bg-white/70 backdrop-blur-md border border-white/50 text-ink-soft focus:bg-white outline-none shadow-sm cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
            <i className="lni lni-chevron-down absolute right-3.5 top-1/2 transform -translate-y-1/2 text-ink-muted pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-white/50 overflow-hidden transition-all hover:shadow-lg">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-ink-faint/30 rounded-2xl animate-pulse flex items-center justify-between px-6">
                <div className="w-1/3 h-6 bg-ink-faint/50 rounded-lg"></div>
                <div className="w-1/6 h-6 bg-ink-faint/50 rounded-lg"></div>
                <div className="w-1/4 h-8 bg-ink-faint/50 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : pendingUsers.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 bg-status-success/10 rounded-full flex items-center justify-center mb-6 shadow-inner animate-pulse-slow">
              <i className="lni lni-checkmark-circle text-5xl text-status-success" />
            </div>
            <h3 className="font-display text-2xl text-ink">All caught up!</h3>
            <p className="font-body text-ink-soft mt-3 text-lg">There are no pending ID verifications at the moment.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body table-fixed border-collapse">
              <thead className="bg-white/50 border-b border-ink-faint/50">
                <tr>
                  <th className="px-8 py-5 font-body font-semibold text-ink-soft text-sm uppercase tracking-wider w-[12%]">User ID</th>
                  <th className="px-8 py-5 font-body font-semibold text-ink-soft text-sm uppercase tracking-wider w-[40%]">User Details</th>
                  <th className="px-8 py-5 font-body font-semibold text-ink-soft text-sm uppercase tracking-wider w-[18%]">Role</th>
                  <th className="px-8 py-5 font-body font-semibold text-ink-soft text-sm uppercase tracking-wider w-[18%]">Submitted At</th>
                  <th className="px-8 py-5 font-body font-semibold text-ink-soft text-sm uppercase tracking-wider w-[12%] text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-faint/30">
                {paginatedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-white/60 transition-colors duration-200">
                    <td className="px-8 py-5 text-sm font-numeric font-bold text-ink-muted">
                      #{user.id}
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center">
                        <Avatar name={user.name} url={user.avatar_url} />
                        <div className="ml-5 truncate">
                          <div className="font-body font-bold text-ink text-sm truncate">{user.name}</div>
                          <div className="text-xs text-ink-muted mt-0.5 truncate">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-4 py-1.5 rounded-full text-xs font-body font-bold tracking-wide uppercase shadow-sm ${
                        user.role === 'employer' ? 'bg-accent-peach border border-accent-peachBright/50 text-primary-dark' : 'bg-accent-mint border border-accent-mintDeep/30 text-accent-mintDeep'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-sm font-body font-medium text-ink-soft">
                      {new Date(user.updated_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button
                        onClick={() => setReviewUser(user)}
                        className="bg-ink text-white px-4 py-2 rounded-lg text-sm font-body font-medium hover:bg-ink-soft transition-colors"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
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
