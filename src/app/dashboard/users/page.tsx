'use client';

import React, { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AlertDialog } from '@/components/AlertDialog';
import VerificationModal from '@/components/VerificationModal';
import { useDebounce } from '@/hooks/useDebounce';
import { adminApi } from '@/lib/api';
import StatCard from '@/components/StatCard';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import UserTable from '@/components/users/UserTable';
import UserDetailDrawer from '@/components/users/UserDetailDrawer';
import JobPreviewModal from '@/components/users/JobPreviewModal';

function UsersContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlSearch = searchParams.get('search') || '';

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [filter, setFilter] = useState<'all' | 'verified' | 'unverified' | 'rejected'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'worker' | 'employer'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'rating'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [selectedIdUser, setSelectedIdUser] = useState<any | null>(null);

  // Sync search from URL query param
  useEffect(() => {
    setSearchTerm(urlSearch);
    setCurrentPage(1);
  }, [urlSearch]);

  // New Drawer & Lazy-Loading States
  const [showArchived, setShowArchived] = useState(false);
  const [selectedDetailUser, setSelectedDetailUser] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [userDetailData, setUserDetailData] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'activity' | 'reviews' | 'reports' | 'logs'>('profile');

  // Tab 2: Activity states
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityData, setActivityData] = useState<any | null>(null);
  const [activityPage, setActivityPage] = useState(1);
  const [activitySearch, setActivitySearch] = useState('');
  const [activityStatus, setActivityStatus] = useState('all');
  const [employerSubTab, setEmployerSubTab] = useState<'posts' | 'hired'>('posts');
  const debouncedActivitySearch = useDebounce(activitySearch, 300);

  // Tab 3: Reviews states
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsData, setReviewsData] = useState<any | null>(null);
  const [reviewsPage, setReviewsPage] = useState(1);

  // Tab 4: Reports states
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsData, setReportsData] = useState<any | null>(null);
  const [reportsPage, setReportsPage] = useState(1);

  // Tab 5: Logs states
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsData, setLogsData] = useState<any | null>(null);
  const [logsPage, setLogsPage] = useState(1);



  // Job Preview state
  const [selectedJob, setSelectedJob] = useState<any | null>(null);

  const [alertState, setAlertState] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({ open: false, title: '', message: '', onConfirm: () => {} });
  const [showIdModal, setShowIdModal] = useState(false);

  const itemsPerPage = 10;

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminApi.getUsers(showArchived);
      setUsers(res.data.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [showArchived]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const fetchUserDetails = async (id: number) => {
    try {
      setDetailLoading(true);
      const res = await adminApi.getUserDetails(id);
      setUserDetailData(res.data);
    } catch (err: any) {
      setAlertState({ open: true, title: 'Error', message: 'Failed to load user details: ' + (err.response?.data?.message || err.message), onConfirm: () => setAlertState(s => ({...s, open: false})) });
    } finally {
      setDetailLoading(false);
    }
  };

  const fetchUserActivity = async (id: number, page: number, search: string, status: string, role: string) => {
    try {
      setActivityLoading(true);
      if (role === 'employer') {
        const res = await adminApi.getUserPosts(id, page, search, status);
        setActivityData(res.data);
      } else {
        const res = await adminApi.getUserApplications(id, page, search, status);
        setActivityData(res.data);
      }
    } catch (err: any) {
      setAlertState({ open: true, title: 'Error', message: 'Failed to load user activity: ' + (err.response?.data?.message || err.message), onConfirm: () => setAlertState(s => ({...s, open: false})) });
    } finally {
      setActivityLoading(false);
    }
  };

  const fetchUserHired = async (id: number, page: number, search: string) => {
    try {
      setActivityLoading(true);
      const res = await adminApi.getUserHired(id, page, search);
      setActivityData(res.data);
    } catch (err: any) {
      setAlertState({ open: true, title: 'Error', message: 'Failed to load hired history: ' + (err.response?.data?.message || err.message), onConfirm: () => setAlertState(s => ({...s, open: false})) });
    } finally {
      setActivityLoading(false);
    }
  };

  const fetchUserReviews = async (id: number, page: number) => {
    try {
      setReviewsLoading(true);
      const res = await adminApi.getUserReviews(id, page);
      setReviewsData(res.data);
    } catch (err: any) {
      setAlertState({ open: true, title: 'Error', message: 'Failed to load reviews: ' + (err.response?.data?.message || err.message), onConfirm: () => setAlertState(s => ({...s, open: false})) });
    } finally {
      setReviewsLoading(false);
    }
  };

  const fetchUserReports = async (id: number, page: number) => {
    try {
      setReportsLoading(true);
      const res = await adminApi.getUserReports(id, page);
      setReportsData(res.data);
    } catch (err: any) {
      setAlertState({ open: true, title: 'Error', message: 'Failed to load reports: ' + (err.response?.data?.message || err.message), onConfirm: () => setAlertState(s => ({...s, open: false})) });
    } finally {
      setReportsLoading(false);
    }
  };

  const fetchUserLogs = async (id: number, page: number) => {
    try {
      setLogsLoading(true);
      const res = await adminApi.getUserLogs(id, page);
      setLogsData(res.data);
    } catch (err: any) {
      setAlertState({ open: true, title: 'Error', message: 'Failed to load activity logs: ' + (err.response?.data?.message || err.message), onConfirm: () => setAlertState(s => ({...s, open: false})) });
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDetailUser) {
      fetchUserDetails(selectedDetailUser.id);
      setActiveTab('profile');
      setActivityPage(1);
      setActivitySearch('');
      setActivityStatus('all');
      setActivityData(null);
      setReviewsPage(1);
      setReviewsData(null);
      setEmployerSubTab('posts');
      setReportsPage(1);
      setReportsData(null);
      setLogsPage(1);
      setLogsData(null);
    } else {
      setUserDetailData(null);
    }
  }, [selectedDetailUser]);

  useEffect(() => {
    if (selectedDetailUser && activeTab === 'activity') {
      if (selectedDetailUser.role === 'employer') {
        if (employerSubTab === 'posts') {
          fetchUserActivity(selectedDetailUser.id, activityPage, debouncedActivitySearch, activityStatus, 'employer');
        } else {
          fetchUserHired(selectedDetailUser.id, activityPage, debouncedActivitySearch);
        }
      } else {
        fetchUserActivity(selectedDetailUser.id, activityPage, debouncedActivitySearch, activityStatus, 'worker');
      }
    }
  }, [selectedDetailUser, activeTab, activityPage, debouncedActivitySearch, activityStatus, employerSubTab]);

  useEffect(() => {
    if (selectedDetailUser && activeTab === 'reviews') {
      fetchUserReviews(selectedDetailUser.id, reviewsPage);
    }
  }, [selectedDetailUser, activeTab, reviewsPage]);

  useEffect(() => {
    if (selectedDetailUser && activeTab === 'reports') {
      fetchUserReports(selectedDetailUser.id, reportsPage);
    }
  }, [selectedDetailUser, activeTab, reportsPage]);

  useEffect(() => {
    if (selectedDetailUser && activeTab === 'logs') {
      fetchUserLogs(selectedDetailUser.id, logsPage);
    }
  }, [selectedDetailUser, activeTab, logsPage]);

  const handleSuspend = (id: number, currentStatus: boolean) => {
    setAlertState({
      open: true,
      title: 'Update Suspension Status',
      message: `Are you sure you want to ${currentStatus ? 'unsuspend' : 'suspend'} this user?`,
      onConfirm: async () => {
        const previousUsers = [...users];
        setUsers((prev: any[]) => prev.map(u => u.id === id ? { ...u, is_suspended: !currentStatus } : u));
        if (selectedDetailUser && selectedDetailUser.id === id) {
          setSelectedDetailUser((prev: any) => prev ? { ...prev, is_suspended: !currentStatus } : null);
        }
        try {
          setActionLoading(id);
          await adminApi.suspendUser(id, !currentStatus);
          await fetchUsers(); // Refresh list
          if (selectedDetailUser && selectedDetailUser.id === id) {
            fetchUserDetails(id); // Refresh drawer
          }
        } catch (err: any) {
          setUsers(previousUsers);
          if (selectedDetailUser && selectedDetailUser.id === id) {
            setSelectedDetailUser((prev: any) => prev ? { ...prev, is_suspended: currentStatus } : null);
          }
          setAlertState({ open: true, title: 'Error', message: 'Failed to update suspension status: ' + (err.response?.data?.message || err.message), onConfirm: () => setAlertState(s => ({...s, open: false})) });
        } finally {
          setActionLoading(null);
        }
      } })
  };

  const handleDelete = (id: number) => {
    setAlertState({
      open: true,
      title: 'Delete User',
      message: 'Are you sure you want to delete this user? This action can be undone later by a database administrator (soft delete).',
      onConfirm: async () => {
        const previousUsers = [...users];
        setUsers(prev => prev.filter(u => u.id !== id));
        if (selectedDetailUser && selectedDetailUser.id === id) {
          setSelectedDetailUser(null);
        }
        try {
          setActionLoading(id);
          await adminApi.deleteUser(id);
          await fetchUsers(); // Refresh list
        } catch (err: any) {
          setUsers(previousUsers);
          setAlertState({ open: true, title: 'Error', message: 'Failed to delete user: ' + (err.response?.data?.message || err.message), onConfirm: () => setAlertState(s => ({...s, open: false})) });
        } finally {
          setActionLoading(null);
        }
      } })
  };

  const handleRestore = (id: number) => {
    setAlertState({
      open: true,
      title: 'Restore User',
      message: 'Are you sure you want to restore this user?',
      onConfirm: async () => {
        const previousUsers = [...users];
        setUsers(prev => prev.filter(u => u.id !== id));
        if (selectedDetailUser && selectedDetailUser.id === id) {
          setSelectedDetailUser(null);
        }
        try {
          setActionLoading(id);
          await adminApi.restoreUser(id);
          await fetchUsers(); // Refresh list
        } catch (err: any) {
          setUsers(previousUsers);
          setAlertState({ open: true, title: 'Error', message: 'Failed to restore user: ' + (err.response?.data?.message || err.message), onConfirm: () => setAlertState(s => ({...s, open: false})) });
        } finally {
          setActionLoading(null);
        }
      } })
  };

  const handleManualVerify = async (id: number, status: 'approved' | 'rejected', reason?: string) => {
    try {
      setActionLoading(id);
      await adminApi.verifyUser(id, status, reason);
      await fetchUsers(); // Refresh list
      if (selectedDetailUser && selectedDetailUser.id === id) {
        fetchUserDetails(id); // Refresh drawer
      }
      setSelectedIdUser(null);
      setShowIdModal(false);
    } catch (err: any) {
      setAlertState({ open: true, title: 'Error', message: 'Verification action failed: ' + (err.response?.data?.message || err.message), onConfirm: () => setAlertState(s => ({...s, open: false})) });
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerify = (user?: any) => {
    const userToVerify = user || userDetailData?.user || selectedDetailUser;
    if (userToVerify) {
      setSelectedIdUser(userToVerify);
      setShowIdModal(true);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;

    if (filter === 'all') return true;
    if (filter === 'verified') return u.verification_status === 'approved';
    if (filter === 'rejected') return u.verification_status === 'rejected' || u.registration_status === 'rejected';
    if (filter === 'unverified') return u.verification_status !== 'approved' && u.verification_status !== 'rejected' && u.registration_status !== 'rejected';

    return true;
  });

  const sortedUsers = [...filteredUsers].sort((a: any, b: any) => {
    let aVal: any;
    let bVal: any;

    if (sortBy === 'name') {
      aVal = a.name.toLowerCase();
      bVal = b.name.toLowerCase();
    } else if (sortBy === 'created_at') {
      aVal = new Date(a.created_at || 0).getTime();
      bVal = new Date(b.created_at || 0).getTime();
    } else if (sortBy === 'rating') {
      aVal = a.reputation_score || a.rating || 0;
      bVal = b.reputation_score || b.rating || 0;
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage) || 1;
  const paginatedUsers = sortedUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (error) return <div className="text-center py-20 text-status-error font-body">{error}</div>;

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-display text-transparent bg-clip-text bg-gradient-to-r from-ink to-primary-dark font-bold">User Management</h1>
          <p className="text-ink-soft font-body mt-2 text-lg">
            Monitor, suspend, or remove users from the platform.
          </p>
        </div>

        <div className="mt-6 md:mt-0 relative w-full md:w-80 group">
          <input
            type="text"
            aria-label="Search users by name or email"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-white/70 backdrop-blur-md rounded-xl border border-white/50 shadow-sm focus:bg-white focus:border-primary/50 focus:ring-4 focus:ring-primary/10 outline-none font-body transition-all group-hover:shadow-md text-sm"
          />
          <i className="lni lni-search text-ink-muted absolute left-3.5 top-1/2 transform -translate-y-1/2" />
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Users" value={users.length} iconClass="lni lni-users" onClick={() => { setFilter('all'); setRoleFilter('all'); setCurrentPage(1); }} />
        <StatCard title="Workers" value={users.filter(u => u.role === 'worker').length} iconClass="lni lni-user" onClick={() => { setRoleFilter('worker'); setFilter('all'); setCurrentPage(1); }} />
        <StatCard title="Employers" value={users.filter(u => u.role === 'employer').length} iconClass="lni lni-briefcase" onClick={() => { setRoleFilter('employer'); setFilter('all'); setCurrentPage(1); }} />
        <StatCard title="Pending Review" value={users.filter(u => u.registration_status === 'pending_review' || (u.verification_status === 'pending' && u.document_url)).length} iconClass="lni lni-warning" onClick={() => router.push('/dashboard/verifications')} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex space-x-2 overflow-x-auto pb-1">
          <button
            onClick={() => { setFilter('all'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-xl font-body font-semibold text-sm transition-colors whitespace-nowrap ${filter === 'all' ? 'bg-ink text-white' : 'bg-white/50 text-ink-soft hover:bg-white/80 border border-ink-faint/50'}`}>
            All Users
          </button>
          <button
            onClick={() => { setFilter('verified'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-xl font-body font-semibold text-sm transition-colors whitespace-nowrap ${filter === 'verified' ? 'bg-status-success text-white' : 'bg-white/50 text-ink-soft hover:bg-white/80 border border-ink-faint/50'}`}>
            Verified
          </button>
          <button
            onClick={() => { setFilter('unverified'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-xl font-body font-semibold text-sm transition-colors whitespace-nowrap ${filter === 'unverified' ? 'bg-status-warning text-white' : 'bg-white/50 text-ink-soft hover:bg-white/80 border border-ink-faint/50'}`}>
            Unverified
          </button>
          <button
            onClick={() => { setFilter('rejected'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-xl font-body font-semibold text-sm transition-colors whitespace-nowrap ${filter === 'rejected' ? 'bg-status-error text-white' : 'bg-white/50 text-ink-soft hover:bg-white/80 border border-ink-faint/50'}`}>
            Rejected
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2 bg-white/50 border border-ink-faint/50 px-4 py-2 rounded-xl text-sm font-body font-semibold text-ink-soft cursor-pointer hover:bg-white/80 transition-all select-none">
            <input
              type="checkbox"
              aria-label="Show archived users"
              checked={showArchived}
              onChange={(e) => {
                setShowArchived(e.target.checked);
                setCurrentPage(1);
              }}
              className="rounded text-primary focus:ring-primary w-4 h-4 border-ink-faint"
            />
            <span>Show Archived Users</span>
          </label>

          <select
            value={roleFilter}
            aria-label="Filter by user role"
            onChange={(e) => {
              setRoleFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-4 py-2 rounded-xl font-body font-semibold text-sm transition-colors whitespace-nowrap bg-white/70 backdrop-blur-md border border-white/50 text-ink-soft focus:bg-white outline-none cursor-pointer"
          >
            <option value="all">All Roles</option>
            <option value="worker">Workers</option>
            <option value="employer">Employers</option>
          </select>

          <select
            value={sortBy}
            aria-label="Sort users by"
            onChange={(e) => {
              setSortBy(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-4 py-2 rounded-xl font-body font-semibold text-sm transition-colors whitespace-nowrap bg-white/70 backdrop-blur-md border border-white/50 text-ink-soft focus:bg-white outline-none cursor-pointer"
          >
            <option value="created_at">Date Registered</option>
            <option value="name">Name (Alphabetical)</option>
            <option value="rating">Reputation / Rating</option>
          </select>

          <select
            value={sortOrder}
            aria-label="Sort order"
            onChange={(e) => {
              setSortOrder(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-4 py-2 rounded-xl font-body font-semibold text-sm transition-colors whitespace-nowrap bg-white/70 backdrop-blur-md border border-white/50 text-ink-soft focus:bg-white outline-none cursor-pointer"
          >
            <option value="desc">Descending / Newest</option>
            <option value="asc">Ascending / Oldest</option>
          </select>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-white/50 overflow-hidden transition-all hover:shadow-lg">
        <UserTable
          paginatedUsers={paginatedUsers}
          loading={loading}
          actionLoading={actionLoading}
          onSelectUser={(user) => setSelectedDetailUser(user)}
          onVerify={(user) => handleVerify(user)}
          onSuspend={handleSuspend}
          onDelete={handleDelete}
        />
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
              className="p-2.5 rounded-xl border border-ink-faint/50 bg-white/70 text-ink hover:bg-white/95 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2.5 rounded-xl border border-ink-faint/50 bg-white/70 text-ink hover:bg-white/95 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* View ID Modal */}
      {showIdModal && selectedIdUser && (
        <VerificationModal
          user={selectedIdUser}
          onClose={() => {
            setShowIdModal(false);
            setSelectedIdUser(null);
          }}
          onVerify={async (id, status, reason) => {
            await handleManualVerify(id, status, reason);
          }}
          actionLoading={actionLoading === selectedIdUser.id ? 'approved' : null}
        />
      )}

      {/* User Details Drawer */}
      {selectedDetailUser && (
        <UserDetailDrawer
          selectedDetailUser={selectedDetailUser}
          onClose={() => setSelectedDetailUser(null)}
          userDetailData={userDetailData}
          detailLoading={detailLoading}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          actionLoading={actionLoading}
          onVerify={() => handleVerify(selectedDetailUser)}
          onSuspend={handleSuspend}
          onDelete={handleDelete}
          onRestore={handleRestore}
          employerSubTab={employerSubTab}
          setEmployerSubTab={setEmployerSubTab}
          activitySearch={activitySearch}
          setActivitySearch={setActivitySearch}
          activityStatus={activityStatus}
          setActivityStatus={setActivityStatus}
          activityLoading={activityLoading}
          activityData={activityData}
          activityPage={activityPage}
          setActivityPage={setActivityPage}
          onSelectJob={(job) => setSelectedJob(job)}
          reviewsLoading={reviewsLoading}
          reviewsData={reviewsData}
          reviewsPage={reviewsPage}
          setReviewsPage={setReviewsPage}
          reportsLoading={reportsLoading}
          reportsData={reportsData}
          reportsPage={reportsPage}
          setReportsPage={setReportsPage}
          logsLoading={logsLoading}
          logsData={logsData}
          logsPage={logsPage}
          setLogsPage={setLogsPage}
        />
      )}

      {/* Job Post Preview Modal */}
      {selectedJob && (
        <JobPreviewModal
          selectedJob={selectedJob}
          onClose={() => setSelectedJob(null)}
        />
      )}
      <AlertDialog isOpen={alertState.open} title={alertState.title} message={alertState.message} onConfirm={() => { alertState.onConfirm(); setAlertState(s => ({...s, open: false})); }} onCancel={() => setAlertState(s => ({...s, open: false}))} confirmText="Confirm" cancelText="Cancel" />
    </div>
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 font-body text-ink-muted">Loading users...</div>}>
      <UsersContent />
    </Suspense>
  );
}
