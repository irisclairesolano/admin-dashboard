'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Avatar from '@/components/Avatar';
import Tooltip from '@/components/Tooltip';
import { AlertDialog } from '@/components/AlertDialog';
import VerificationModal from '@/components/VerificationModal';
import { useDebounce } from '@/hooks/useDebounce';
import { adminApi } from '@/lib/api';
import StatCard from '@/components/StatCard';
import { ArrowLeft, ArrowRight, X, ShieldAlert, CheckCircle2, AlertCircle, MapPin, Star, RefreshCw, Mail, Phone, Calendar, UserX, Undo, Trash2, Search } from 'lucide-react';

function UsersContent() {
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get('search') || '';

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [filter, setFilter] = useState<'all' | 'verified' | 'unverified' | 'rejected'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'worker' | 'employer'>('all');
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

  // Verification modal states
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Job Preview state
  const [selectedJob, setSelectedJob] = useState<any | null>(null);

  const [alertState, setAlertState] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({ open: false, title: '', message: '', onConfirm: () => {} });
  const [showIdModal, setShowIdModal] = useState(false);

  const itemsPerPage = 10;

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getUsers(showArchived);
      setUsers(res.data.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [showArchived]);

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

  const handleVerify = async (id: number) => {
    const userToVerify = userDetailData?.user || selectedDetailUser;
    setSelectedIdUser(userToVerify);
    setShowIdModal(true);
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

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
        <StatCard title="Total Users" value={users.length} iconClass="lni lni-users" />
        <StatCard title="Workers" value={users.filter(u => u.role === 'worker').length} iconClass="lni lni-user" />
        <StatCard title="Employers" value={users.filter(u => u.role === 'employer').length} iconClass="lni lni-briefcase" />
        <StatCard title="Pending Review" value={users.filter(u => u.registration_status === 'pending_review' || (u.verification_status === 'pending' && u.document_url)).length} iconClass="lni lni-warning" />
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
            className="px-4 py-2 rounded-xl font-body font-semibold text-sm transition-colors whitespace-nowrap bg-white/70 backdrop-blur-md border border-white/50 text-ink-soft focus:bg-white outline-none"
          >
            <option value="all">All Roles</option>
            <option value="worker">Workers</option>
            <option value="employer">Employers</option>
          </select>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-white/50 overflow-hidden transition-all hover:shadow-lg">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-ink-faint/30 rounded-2xl animate-pulse flex items-center justify-between px-6">
                <div className="w-1/3 h-6 bg-ink-faint/50 rounded-lg"></div>
                <div className="w-1/6 h-6 bg-ink-faint/50 rounded-lg"></div>
                <div className="w-1/4 h-8 bg-ink-faint/50 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body table-fixed border-collapse">
              <thead className="bg-white/50 border-b border-ink-faint/50">
                <tr>
                  <th className="px-4 py-4 font-body font-semibold text-ink-soft text-xs uppercase tracking-wider w-[8%]">User ID</th>
                  <th className="px-4 py-4 font-body font-semibold text-ink-soft text-xs uppercase tracking-wider w-[32%]">User Details</th>
                  <th className="px-4 py-4 font-body font-semibold text-ink-soft text-xs uppercase tracking-wider w-[18%]">Role & Status</th>
                  <th className="px-4 py-4 font-body font-semibold text-ink-soft text-xs uppercase tracking-wider w-[11%]">Joined</th>
                  <th className="px-4 py-4 font-body font-semibold text-ink-soft text-xs uppercase tracking-wider w-[15%]">Last Active</th>
                  <th className="px-4 py-4 font-body font-semibold text-ink-soft text-xs uppercase tracking-wider w-[16%] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-faint/30">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-16 text-center text-ink-soft">
                      No users found
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user) => (
                    <tr key={user.id} className={`transition-colors duration-200 ${user.is_suspended ? 'bg-status-error/5 hover:bg-status-error/10' : 'hover:bg-white/60'}`}>
                      <td className="px-4 py-3.5 font-numeric text-xs font-semibold text-ink-muted">
                        #{user.id}
                      </td>
                      <td className="px-4 py-3.5">
                        <div
                          className="flex items-center cursor-pointer group/user select-none"
                          onClick={() => setSelectedDetailUser(user)}
                        >
                          <Avatar name={user.name} url={user.avatar_url} isSuspended={user.is_suspended} />
                          <div className="ml-3">
                            <div className="flex items-center flex-wrap gap-1.5">
                              <span className={`font-body font-bold transition-colors group-hover/user:text-primary ${user.is_suspended ? 'text-status-error' : 'text-ink'}`}>
                                {user.name}
                              </span>
                              {user.reports_count > 0 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-status-error/10 text-status-error border border-status-error/20 animate-pulse">
                                  ⚠️ {user.reports_count} {user.reports_count === 1 ? 'report' : 'reports'}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-ink-muted mt-0.5 group-hover/user:text-ink-soft">{user.email}</div>
                            {user.role === 'worker' ? (
                              <div className="text-[11px] text-ink-muted mt-1 font-body font-semibold flex items-center gap-1">
                                <i className="lni lni-briefcase text-[10px] text-primary" />
                                <span>{user.applications_count ?? 0} {user.applications_count === 1 ? 'application' : 'applications'}</span>
                              </div>
                            ) : user.role === 'employer' ? (
                              <div className="text-[11px] text-ink-muted mt-1 font-body font-semibold flex items-center gap-1">
                                <i className="lni lni-gallery text-[10px] text-primary" />
                                <span>{user.job_posts_count ?? 0} {user.job_posts_count === 1 ? 'post' : 'posts'}</span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col space-y-2 items-start">
                          <span className={`px-4 py-1.5 rounded-full text-xs font-body font-bold tracking-wide uppercase shadow-sm ${user.role === 'employer' ? 'bg-accent-peach border border-accent-peachBright/50 text-primary-dark' : 'bg-accent-mint border border-accent-mintDeep/30 text-accent-mintDeep'
                            }`}>
                            {user.role}
                          </span>
                          {user.verification_status === 'approved' ? (
                            <span className="flex items-center text-xs font-body font-semibold text-status-success bg-status-success/10 px-3 py-1 rounded-full border border-status-success/20">
                              <i className="lni lni-checkmark-circle mr-1.5 text-xs" /> Verified
                            </span>
                          ) : user.verification_status === 'pending' ? (
                            <span className="flex items-center text-xs font-body font-semibold text-status-gold bg-status-gold/10 px-3 py-1 rounded-full border border-status-gold/20">
                              <i className="lni lni-warning mr-1.5 text-xs text-status-warning" /> Pending Review
                            </span>
                          ) : user.verification_status === 'rejected' || user.registration_status === 'rejected' ? (
                            <div className="flex flex-col gap-1">
                              <span className="flex items-center text-xs font-body font-semibold text-status-error bg-status-error/10 px-3 py-1 rounded-full border border-status-error/20">
                                <i className="lni lni-close mr-1.5 text-xs" /> Rejected
                              </span>
                              {user.rejection_reason && (
                                <span className="text-xs text-status-error mt-1 max-w-[200px]">
                                  Reason: {user.rejection_reason}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="flex items-center text-xs font-body font-semibold text-ink-muted bg-paper px-3 py-1 rounded-full border border-ink-faint">
                              Unverified
                            </span>
                          )}
                          {user.is_suspended && (
                            <span className="flex items-center text-xs font-body font-semibold text-status-error bg-status-error/10 px-3 py-1 rounded-full border border-status-error/20">
                              <i className="lni lni-shield mr-1.5 text-xs" /> Suspended
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-body font-medium text-ink-soft">
                        {new Date(user.created_at).toLocaleString('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })} PHT
                      </td>
                      <td className="px-4 py-3.5 text-xs text-ink-soft whitespace-nowrap">
                        <div className="flex items-center text-ink-muted font-body font-semibold">
                          <i className="lni lni-timer mr-1.5 text-primary text-xs" />
                          {user.last_login_at 
                            ? new Date(user.last_login_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) 
                            : (user.updated_at 
                               ? new Date(user.updated_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) 
                               : 'Never')}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {user.role !== 'admin' && (
                          <div className="flex flex-col gap-1.5 items-end justify-center">
                            {user.role === 'worker' && user.verification_status !== 'approved' && (
                              <button
                                disabled={actionLoading === user.id}
                                onClick={() => handleVerify(user.id)}
                                className="w-24 py-1 text-[10px] font-body font-bold uppercase tracking-wider rounded-lg bg-status-success/15 border border-status-success/20 text-status-success hover:bg-status-success hover:text-white transition-all text-center"
                              >
                                Verify
                              </button>
                            )}
                            <button
                              disabled={actionLoading === user.id}
                              onClick={() => handleSuspend(user.id, user.is_suspended)}
                              className={`w-24 py-1 text-[10px] font-body font-bold uppercase tracking-wider rounded-lg border transition-all text-center ${
                                user.is_suspended
                                  ? 'bg-status-warning/15 border-status-warning/20 text-status-warning hover:bg-status-warning hover:text-white'
                                  : 'bg-white/80 border border-ink-faint/50 text-ink hover:bg-ink hover:text-white'
                              }`}
                            >
                              {user.is_suspended ? 'Unsuspend' : 'Suspend'}
                            </button>
                            <button
                              disabled={actionLoading === user.id}
                              onClick={() => handleDelete(user.id)}
                              className="w-24 py-1 text-[10px] font-body font-bold uppercase tracking-wider rounded-lg bg-status-error/15 border border-status-error/20 text-status-error hover:bg-status-error hover:text-white transition-all text-center"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                        {user.role === 'admin' && (
                          <span className="text-[10px] font-body font-bold text-ink-muted uppercase tracking-wider bg-ink-faint/50 px-2.5 py-1 rounded-lg border border-ink-faint inline-block">Protected Admin</span>
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
      {showIdModal && selectedIdUser && <VerificationModal user={selectedIdUser} onClose={() => { setShowIdModal(false); setSelectedIdUser(null); }} onVerify={async (id, status, reason) => { await handleManualVerify(id, status, reason); }} actionLoading={actionLoading} />}

      {/* User Details Drawer */}
      {selectedDetailUser && (
        <div 
          className="fixed inset-0 z-40 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-drawer-title"
          tabIndex={-1}
          onKeyDown={(e) => { if (e.key === 'Escape') setSelectedDetailUser(null); }}
        >
          <style>{`
            @keyframes slideIn {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
            .animate-slide-in {
              animation: slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
          `}</style>

          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-ink/40 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setSelectedDetailUser(null)}
          />

          {/* Drawer Body */}
          <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col z-50 animate-slide-in overflow-hidden">
            {/* Header / Top Summary */}
            <div className="p-6 bg-paper-cream border-b border-ink-faint flex flex-col gap-4 relative">
              <button
                onClick={() => setSelectedDetailUser(null)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-ink-faint/50 text-ink-muted hover:text-ink transition-colors"
                aria-label="Close details"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="flex items-start gap-5">
                <Avatar name={selectedDetailUser.name} url={selectedDetailUser.avatar_url} size="lg" isSuspended={selectedDetailUser.is_suspended} />
                <div className="flex-1 min-w-0 pr-10">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 id="user-drawer-title" className="text-2xl font-display font-bold text-ink truncate" title={selectedDetailUser.name}>
                      {selectedDetailUser.name}
                    </h2>
                    {selectedDetailUser.deleted_at && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-status-error/15 text-status-error uppercase tracking-wider">
                        Archived / Soft Deleted
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-body text-ink-muted truncate mt-0.5">{selectedDetailUser.email}</p>

                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm ${selectedDetailUser.role === 'employer' ? 'bg-accent-peach text-primary-dark border border-accent-peachBright/50' : 'bg-accent-mint text-accent-mintDeep border border-accent-mintDeep/30'
                      }`}>
                      {selectedDetailUser.role}
                    </span>

                    {selectedDetailUser.is_suspended && (
                      <span className="flex items-center text-[10px] font-bold text-status-error bg-status-error/10 px-2 py-0.5 rounded-full border border-status-error/20 uppercase tracking-wider">
                        <ShieldAlert className="w-3 h-3 mr-1" /> Suspended
                      </span>
                    )}

                    {selectedDetailUser.verification_status === 'approved' ? (
                      <span className="flex items-center text-[10px] font-bold text-status-success bg-status-success/10 px-2 py-0.5 rounded-full border border-status-success/20 uppercase tracking-wider">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
                      </span>
                    ) : selectedDetailUser.verification_status === 'rejected' || selectedDetailUser.registration_status === 'rejected' ? (
                      <span className="flex items-center text-[10px] font-bold text-status-error bg-status-error/10 px-2 py-0.5 rounded-full border border-status-error/20 uppercase tracking-wider">
                        <AlertCircle className="w-3 h-3 mr-1" /> Verification Rejected
                      </span>
                    ) : (
                      <span className="flex items-center text-[10px] font-bold text-ink-muted bg-paper px-2 py-0.5 rounded-full border border-ink-faint uppercase tracking-wider">
                        Unverified
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats Summary Line */}
              <div className="flex items-center gap-6 mt-2 text-sm text-ink-soft font-body bg-white/40 p-3 rounded-2xl border border-white/50">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>Brgy. {selectedDetailUser.barangay || 'N/A'}, {selectedDetailUser.municipality || 'N/A'}</span>
                </div>
                {userDetailData && (
                  <>
                    <div className="w-1.5 h-1.5 bg-ink-faint rounded-full" />
                    <div className="flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-status-gold fill-status-gold" />
                      <span>{Number(userDetailData.stats.average_rating).toFixed(1)} / 5.0 ({userDetailData.stats.reviews_count} reviews)</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Inconsistency Warning & Missing Document Info */}
            {selectedDetailUser.verification_status !== 'approved' && (
              <div className="px-6 pt-4 shrink-0">
                {selectedDetailUser.registration_status === 'pending_review' && !selectedDetailUser.document_url ? (
                  <div className="bg-status-warning/10 border border-status-warning/20 rounded-2xl p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-status-warning shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-status-warning">Inconsistent Verification State</h4>
                      <p className="text-xs text-status-warning/90 mt-1 leading-relaxed">
                        This user is in "Pending Review" status but has not uploaded any ID documents. Bypassing document review is recommended via manual verification.
                      </p>
                    </div>
                  </div>
                ) : !selectedDetailUser.document_url ? (
                  <div className="bg-ink-faint/50 border border-ink-faint rounded-2xl p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-ink-muted shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-ink-soft">Unverified (Missing ID Upload)</h4>
                      <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                        The user has created their account but hasn't submitted their government ID documents. They will not appear in the verification queue.
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* Tab Controls */}
            <div className="flex border-b border-ink-faint px-6 mt-4 shrink-0 overflow-x-auto pb-1 gap-2">
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-3 px-4 font-body font-bold text-sm border-b-2 transition-all whitespace-nowrap ${activeTab === 'profile' ? 'border-primary text-primary' : 'border-transparent text-ink-muted hover:text-ink'}`}
              >
                Profile Details
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`py-3 px-4 font-body font-bold text-sm border-b-2 transition-all whitespace-nowrap ${activeTab === 'activity' ? 'border-primary text-primary' : 'border-transparent text-ink-muted hover:text-ink'}`}
              >
                Work History
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`py-3 px-4 font-body font-bold text-sm border-b-2 transition-all whitespace-nowrap ${activeTab === 'reviews' ? 'border-primary text-primary' : 'border-transparent text-ink-muted hover:text-ink'}`}
              >
                Reviews
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`py-3 px-4 font-body font-bold text-sm border-b-2 transition-all whitespace-nowrap ${activeTab === 'reports' ? 'border-primary text-primary' : 'border-transparent text-ink-muted hover:text-ink'}`}
              >
                Reports
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`py-3 px-4 font-body font-bold text-sm border-b-2 transition-all whitespace-nowrap ${activeTab === 'logs' ? 'border-primary text-primary' : 'border-transparent text-ink-muted hover:text-ink'}`}
              >
                Activity Logs
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 font-body">
              {detailLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-ink-muted">
                  <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                  <span className="text-sm mt-3 font-semibold">Loading details...</span>
                </div>
              ) : (
                <>
                  {/* TAB 1: PROFILE DETAILS */}
                  {activeTab === 'profile' && userDetailData && (
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-2">Biography / Description</h4>
                        <p className="text-sm text-ink leading-relaxed bg-paper p-4 rounded-2xl border border-ink-faint whitespace-pre-line">
                          {selectedDetailUser.role === 'worker'
                            ? (userDetailData.user.worker_profile?.bio || 'No worker bio provided yet.')
                            : (userDetailData.user.employer_profile?.description || 'No business description provided yet.')}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Email Address</h4>
                          <div className="flex items-center gap-2 text-sm text-ink font-semibold">
                            <Mail className="w-4 h-4 text-ink-muted" />
                            <span>{userDetailData.user.email}</span>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Phone Number</h4>
                          <div className="flex items-center gap-2 text-sm text-ink font-semibold">
                            <Phone className="w-4 h-4 text-ink-muted" />
                            <span>{userDetailData.user.phone || 'No phone number'}</span>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Barangay / Municipality</h4>
                          <div className="flex items-center gap-2 text-sm text-ink font-semibold">
                            <MapPin className="w-4 h-4 text-ink-muted" />
                            <span>{userDetailData.user.barangay || 'N/A'}, {userDetailData.user.municipality || 'N/A'}</span>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Date of Birth</h4>
                          <div className="flex items-center gap-2 text-sm text-ink font-semibold">
                            <Calendar className="w-4 h-4 text-ink-muted" />
                            <span>
                              {userDetailData.user.date_of_birth
                                ? new Date(userDetailData.user.date_of_birth).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
                                : 'Not set'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Worker Skills Section */}
                      {selectedDetailUser.role === 'worker' && (
                        <div>
                          <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-2">Skills & Certifications</h4>
                          <div className="flex flex-wrap gap-2">
                            {userDetailData.user.worker_profile?.skills && userDetailData.user.worker_profile.skills.length > 0 ? (
                              userDetailData.user.worker_profile.skills.map((s: any) => (
                                <span key={s.id} className="bg-primary/5 border border-primary/10 text-primary px-3 py-1 rounded-xl text-xs font-semibold">
                                  {s.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-ink-muted">No skills listed yet.</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Admin Actions Panel */}
                      <div className="border-t border-ink-faint pt-6">
                        <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-3">Administrative Actions</h4>
                        <div className="flex flex-wrap gap-3">
                          {selectedDetailUser.verification_status !== 'approved' && (
                            <button
                              disabled={actionLoading === selectedDetailUser.id}
                              onClick={() => handleVerify(selectedDetailUser.id)}
                              className="px-5 py-3 bg-status-success text-white text-sm font-semibold rounded-xl hover:bg-status-success/90 transition-all flex items-center gap-1.5 shadow-sm"
                              title="Verify User"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Manually Verify User</span>
                            </button>
                          )}

                          <button
                            disabled={actionLoading === selectedDetailUser.id}
                            onClick={() => handleSuspend(selectedDetailUser.id, selectedDetailUser.is_suspended)}
                            className={`px-5 py-3 text-sm font-semibold rounded-xl transition-all flex items-center gap-1.5 shadow-sm border ${selectedDetailUser.is_suspended
                                ? 'bg-status-warning/10 border-status-warning/20 text-status-warning hover:bg-status-warning hover:text-white'
                                : 'bg-white border-ink-faint text-ink hover:bg-ink hover:text-white'
                              }`}
                            title={selectedDetailUser.is_suspended ? 'Unsuspend User' : 'Suspend User'}
                          >
                            <UserX className="w-4 h-4" />
                            <span>{selectedDetailUser.is_suspended ? 'Unsuspend User' : 'Suspend User'}</span>
                          </button>

                          {selectedDetailUser.deleted_at ? (
                            <button
                              disabled={actionLoading === selectedDetailUser.id}
                              onClick={() => handleRestore(selectedDetailUser.id)}
                              className="px-5 py-3 bg-paper-dark border border-ink-faint text-ink text-sm font-semibold rounded-xl hover:bg-ink hover:text-white transition-all flex items-center gap-1.5 shadow-sm"
                              title="Restore User"
                            >
                              <Undo className="w-4 h-4" />
                              <span>Restore Soft Deleted User</span>
                            </button>
                          ) : (
                            <button
                              disabled={actionLoading === selectedDetailUser.id}
                              onClick={() => handleDelete(selectedDetailUser.id)}
                              className="px-5 py-3 bg-status-error/10 border border-status-error/20 text-status-error text-sm font-semibold rounded-xl hover:bg-status-error hover:text-white transition-all flex items-center gap-1.5 shadow-sm"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Soft Delete User</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: JOB POSTS / ACTIVITY */}
                  {activeTab === 'activity' && (
                    <div className="space-y-4">
                      {/* Employer Activity Search/Filter Header */}
                      {selectedDetailUser.role === 'employer' && (
                        <div className="flex space-x-2 border-b border-ink-faint pb-3">
                          <button
                            onClick={() => { setEmployerSubTab('posts'); setActivityPage(1); setActivityData(null); }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${employerSubTab === 'posts' ? 'bg-ink text-white' : 'bg-paper text-ink-soft hover:bg-paper-dark'}`}
                          >
                            Job Postings
                          </button>
                          <button
                            onClick={() => { setEmployerSubTab('hired'); setActivityPage(1); setActivityData(null); }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${employerSubTab === 'hired' ? 'bg-ink text-white' : 'bg-paper text-ink-soft hover:bg-paper-dark'}`}
                          >
                            Hired Workers
                          </button>
                        </div>
                      )}

                      {/* Search Bar for Posts/Applications */}
                      <div className="flex gap-2 shrink-0">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            aria-label="Search activity"
                            placeholder={selectedDetailUser.role === 'employer' && employerSubTab === 'hired' ? "Search workers by name..." : "Search posts by title..."}
                            value={activitySearch}
                            onChange={(e) => { setActivitySearch(e.target.value); setActivityPage(1); }}
                            className="w-full pl-10 pr-4 py-2 border border-ink-faint rounded-xl text-sm focus:border-primary outline-none"
                          />
                          <Search className="w-4 h-4 text-ink-muted absolute left-3 top-3" />
                        </div>

                        {!(selectedDetailUser.role === 'employer' && employerSubTab === 'hired') && (
                          <select
                            value={activityStatus}
                            aria-label="Filter by activity status"
                            onChange={(e) => { setActivityStatus(e.target.value); setActivityPage(1); }}
                            className="px-3 py-2 border border-ink-faint rounded-xl text-sm outline-none"
                          >
                            <option value="all">All Status</option>
                            {selectedDetailUser.role === 'employer' ? (
                              <>
                                <option value="open">Open</option>
                                <option value="closed">Closed</option>
                                <option value="completed">Completed</option>
                                <option value="suspended">Suspended</option>
                              </>
                            ) : (
                              <>
                                <option value="pending">Pending</option>
                                <option value="accepted">Accepted</option>
                                <option value="completed">Completed</option>
                                <option value="rejected">Rejected</option>
                              </>
                            )}
                          </select>
                        )}
                      </div>

                      {/* Activity List Body */}
                      {activityLoading ? (
                        <div className="flex justify-center py-10">
                          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      ) : activityData && activityData.data && activityData.data.length > 0 ? (
                        <div className="space-y-3">
                          {activityData.data.map((item: any) => {
                            if (selectedDetailUser.role === 'employer' && employerSubTab === 'posts') {
                              return (
                                <div
                                  key={item.id}
                                  onClick={() => setSelectedJob(item)}
                                  className="p-4 bg-paper rounded-2xl border border-ink-faint hover:border-primary/40 cursor-pointer transition-all flex justify-between items-center group/post"
                                >
                                  <div>
                                    <div className="font-bold text-ink group-hover/post:text-primary transition-colors">{item.title}</div>
                                    <div className="text-xs text-ink-muted mt-1">
                                      Brgy. {item.barangay}, {item.municipality} • ₱{Number(item.compensation).toLocaleString()}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${item.status === 'open' ? 'bg-status-success/15 text-status-success' : 'bg-ink-faint text-ink-soft'
                                      }`}>
                                      {item.status}
                                    </span>
                                    <div className="text-[10px] text-ink-muted mt-1">{new Date(item.created_at).toLocaleDateString()}</div>
                                  </div>
                                </div>
                              );
                            } else if (selectedDetailUser.role === 'employer' && employerSubTab === 'hired') {
                              return (
                                <div key={item.id} className="p-4 bg-paper rounded-2xl border border-ink-faint flex justify-between items-center">
                                  <div className="flex items-center gap-3">
                                    <Avatar name={item.worker.name} url={item.worker.avatar_url} size="sm" />
                                    <div>
                                      <div className="font-bold text-ink">{item.worker.name}</div>
                                      <div className="text-xs text-ink-muted mt-0.5">Hired for: <span className="font-medium">{item.job.title}</span></div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-[10px] font-bold uppercase bg-status-success/15 text-status-success px-2 py-0.5 rounded">
                                      {item.status}
                                    </span>
                                    <div className="text-[10px] text-ink-muted mt-1">{new Date(item.updated_at || item.created_at).toLocaleDateString()}</div>
                                  </div>
                                </div>
                              );
                            } else {
                              // Worker applications
                              return (
                                <div
                                  key={item.id}
                                  onClick={() => setSelectedJob(item.job)}
                                  className="p-4 bg-paper rounded-2xl border border-ink-faint hover:border-primary/40 cursor-pointer transition-all flex justify-between items-center group/post"
                                >
                                  <div>
                                    <div className="font-bold text-ink group-hover/post:text-primary transition-colors">{item.job?.title || 'N/A'}</div>
                                    <div className="text-xs text-ink-muted mt-1">
                                      Employer: {item.job?.employer?.name || 'N/A'} • Agreed Price: ₱{Number(item.final_agreed_price || item.job?.compensation).toLocaleString()}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${item.status === 'accepted' || item.status === 'completed' ? 'bg-status-success/15 text-status-success' : 'bg-ink-faint text-ink-soft'
                                      }`}>
                                      {item.status}
                                    </span>
                                    <div className="text-[10px] text-ink-muted mt-1">{new Date(item.created_at).toLocaleDateString()}</div>
                                  </div>
                                </div>
                              );
                            }
                          })}

                          {/* Pagination controls for activity */}
                          {activityData.last_page > 1 && (
                            <div className="flex justify-between items-center pt-2">
                              <button
                                disabled={activityPage === 1}
                                onClick={() => setActivityPage(p => Math.max(1, p - 1))}
                                className="px-3 py-1 bg-paper border border-ink-faint rounded-lg text-xs font-semibold disabled:opacity-40"
                              >
                                Previous
                              </button>
                              <span className="text-xs text-ink-muted">Page {activityPage} of {activityData.last_page}</span>
                              <button
                                disabled={activityPage === activityData.last_page}
                                onClick={() => setActivityPage(p => Math.min(activityData.last_page, p + 1))}
                                className="px-3 py-1 bg-paper border border-ink-faint rounded-lg text-xs font-semibold disabled:opacity-40"
                              >
                                Next
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-10 text-sm text-ink-muted">No activity items found.</div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: REVIEWS RECEIVED */}
                  {activeTab === 'reviews' && (
                    <div className="space-y-4">
                      {reviewsLoading ? (
                        <div className="flex justify-center py-10">
                          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      ) : reviewsData && reviewsData.data && reviewsData.data.length > 0 ? (
                        <div className="space-y-4">
                          {reviewsData.data.map((r: any) => (
                            <div key={r.id} className="p-4 bg-paper rounded-2xl border border-ink-faint space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Avatar name={r.reviewer?.name || 'System User'} url={r.reviewer?.avatar_url} size="sm" />
                                  <div>
                                    <div className="font-bold text-sm text-ink">{r.reviewer?.name || 'System User'}</div>
                                    <div className="text-[10px] text-ink-muted uppercase font-semibold tracking-wider">{r.reviewer_role}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 bg-status-gold/10 px-2 py-0.5 rounded border border-status-gold/20 text-xs font-bold text-status-gold">
                                  <Star className="w-3.5 h-3.5 fill-status-gold" />
                                  <span>{Number(r.overall_rating).toFixed(1)}</span>
                                </div>
                              </div>
                              <p className="text-sm text-ink-soft leading-relaxed italic bg-white/50 p-3 rounded-xl border border-white/60">
                                "{r.comment || 'No comment provided.'}"
                              </p>
                            </div>
                          ))}

                          {/* Pagination controls for reviews */}
                          {reviewsData.last_page > 1 && (
                            <div className="flex justify-between items-center pt-2">
                              <button
                                disabled={reviewsPage === 1}
                                onClick={() => setReviewsPage(p => Math.max(1, p - 1))}
                                className="px-3 py-1 bg-paper border border-ink-faint rounded-lg text-xs font-semibold disabled:opacity-40"
                              >
                                Previous
                              </button>
                              <span className="text-xs text-ink-muted">Page {reviewsPage} of {reviewsData.last_page}</span>
                              <button
                                disabled={reviewsPage === reviewsData.last_page}
                                onClick={() => setReviewsPage(p => Math.min(reviewsData.last_page, p + 1))}
                                className="px-3 py-1 bg-paper border border-ink-faint rounded-lg text-xs font-semibold disabled:opacity-40"
                              >
                                Next
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-10 text-sm text-ink-muted">No reviews received yet.</div>
                      )}
                    </div>
                  )}

                  {/* TAB 4: REPORTS */}
                  {activeTab === 'reports' && (
                    <div className="space-y-4">
                      {reportsLoading ? (
                        <div className="flex justify-center py-10">
                          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      ) : reportsData && reportsData.data && reportsData.data.length > 0 ? (
                        <div className="space-y-3">
                          {reportsData.data.map((r: any) => {
                            const isSubmittedByThisUser = r.reporter_id === selectedDetailUser.id;
                            return (
                              <div key={r.id} className="p-4 bg-paper rounded-2xl border border-ink-faint space-y-2">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${isSubmittedByThisUser ? 'bg-primary/10 text-primary' : 'bg-status-error/10 text-status-error'
                                      }`}>
                                      {isSubmittedByThisUser ? 'Submitted by User' : 'Report against User'}
                                    </span>
                                    <div className="text-xs text-ink-muted mt-1">Type: <span className="font-semibold text-ink capitalize">{r.type}</span></div>
                                  </div>
                                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${r.status === 'open' ? 'bg-status-warning/15 text-status-warning' : 'bg-status-success/15 text-status-success'
                                    }`}>
                                    {r.status}
                                  </span>
                                </div>
                                <p className="text-sm text-ink-soft leading-relaxed italic bg-white/50 p-3 rounded-xl border border-white/60">
                                  "{r.description || 'No description provided.'}"
                                </p>
                                <div className="text-[10px] text-ink-muted text-right">
                                  {new Date(r.created_at).toLocaleDateString()}
                                </div>
                              </div>
                            );
                          })}

                          {/* Pagination controls for reports */}
                          {reportsData.last_page > 1 && (
                            <div className="flex justify-between items-center pt-2">
                              <button
                                disabled={reportsPage === 1}
                                onClick={() => setReportsPage(p => Math.max(1, p - 1))}
                                className="px-3 py-1 bg-paper border border-ink-faint rounded-lg text-xs font-semibold disabled:opacity-40"
                              >
                                Previous
                              </button>
                              <span className="text-xs text-ink-muted">Page {reportsPage} of {reportsData.last_page}</span>
                              <button
                                disabled={reportsPage === reportsData.last_page}
                                onClick={() => setReportsPage(p => Math.min(reportsData.last_page, p + 1))}
                                className="px-3 py-1 bg-paper border border-ink-faint rounded-lg text-xs font-semibold disabled:opacity-40"
                              >
                                Next
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-10 text-sm text-ink-muted">No reports found.</div>
                      )}
                    </div>
                  )}

                  {/* TAB 5: ACTIVITY LOGS */}
                  {activeTab === 'logs' && (
                    <div className="space-y-4">
                      {logsLoading ? (
                        <div className="flex justify-center py-10">
                          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      ) : logsData && logsData.data && logsData.data.length > 0 ? (
                        <div className="space-y-3">
                          {logsData.data.map((log: any) => (
                            <div key={log.id} className="p-4 bg-paper rounded-2xl border border-ink-faint flex flex-col gap-1.5">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-mono font-bold text-primary uppercase bg-primary/10 px-2 py-0.5 rounded">
                                  {log.action.replace(/_/g, ' ')}
                                </span>
                                <span className="text-[10px] text-ink-muted">
                                  {new Date(log.created_at).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-sm text-ink">{log.description}</p>
                              {log.admin && log.admin.id !== selectedDetailUser.id && (
                                <div className="text-[10px] text-ink-muted mt-1 flex items-center gap-1.5">
                                  <span>Performed by:</span>
                                  <Avatar name={log.admin.name} url={log.admin.avatar_url} size="sm" className="h-5 w-5 rounded-md" />
                                  <span className="font-semibold">{log.admin.name} (Admin)</span>
                                </div>
                              )}
                            </div>
                          ))}

                          {/* Pagination controls for logs */}
                          {logsData.last_page > 1 && (
                            <div className="flex justify-between items-center pt-2">
                              <button
                                disabled={logsPage === 1}
                                onClick={() => setLogsPage(p => Math.max(1, p - 1))}
                                className="px-3 py-1 bg-paper border border-ink-faint rounded-lg text-xs font-semibold disabled:opacity-40"
                              >
                                Previous
                              </button>
                              <span className="text-xs text-ink-muted">Page {logsPage} of {logsData.last_page}</span>
                              <button
                                disabled={logsPage === logsData.last_page}
                                onClick={() => setLogsPage(p => Math.min(logsData.last_page, p + 1))}
                                className="px-3 py-1 bg-paper border border-ink-faint rounded-lg text-xs font-semibold disabled:opacity-40"
                              >
                                Next
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-10 text-sm text-ink-muted">No activity logs found.</div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Job Post Preview Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-ink/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-ink-faint flex justify-between items-center bg-paper-cream">
              <div>
                <span className="text-xs font-mono font-semibold text-primary uppercase bg-primary/10 px-2.5 py-1 rounded-md">
                  {selectedJob.reference_number}
                </span>
                <h2 className="font-display text-2xl text-ink mt-2">{selectedJob.title}</h2>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="p-2 hover:bg-paper rounded-full text-ink-muted hover:text-ink transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto font-body space-y-4">
              <div>
                <span className="block text-xs font-semibold text-ink-soft uppercase tracking-wide">Category</span>
                <span className="text-sm font-medium text-ink bg-paper px-3 py-1.5 rounded-lg border border-ink-faint inline-block mt-1">
                  {selectedJob.category || 'N/A'}
                </span>
              </div>

              <div>
                <span className="block text-xs font-semibold text-ink-soft uppercase tracking-wide">Location (Privacy Protected)</span>
                <div className="flex items-center gap-1.5 mt-1 text-sm font-medium text-ink font-semibold">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>Brgy. {selectedJob.barangay}, {selectedJob.municipality}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-xs font-semibold text-ink-soft uppercase tracking-wide">Compensation</span>
                  <span className="text-sm font-bold text-status-success mt-1 block">
                    ₱{Number(selectedJob.compensation).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-ink-soft uppercase tracking-wide">Slots Available</span>
                  <span className="text-sm font-bold text-ink mt-1 block">
                    {selectedJob.accepted_count} / {selectedJob.slots} filled
                  </span>
                </div>
              </div>

              <div>
                <span className="block text-xs font-semibold text-ink-soft uppercase tracking-wide">Schedule Date</span>
                <div className="flex items-center gap-1.5 mt-1 text-sm font-medium text-ink font-semibold">
                  <Calendar className="w-4 h-4 text-ink-muted" />
                  <span>{new Date(selectedJob.schedule_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              </div>

              <div>
                <span className="block text-xs font-semibold text-ink-soft uppercase tracking-wide">Description</span>
                <p className="text-sm text-ink-soft leading-relaxed mt-1 whitespace-pre-line bg-paper p-4 rounded-2xl border border-ink-faint">
                  {selectedJob.description}
                </p>
              </div>

              {selectedJob.tools_required && (
                <div>
                  <span className="block text-xs font-semibold text-ink-soft uppercase tracking-wide">Tools Required</span>
                  <p className="text-sm text-ink-soft mt-1 bg-paper p-4 rounded-2xl border border-ink-faint">
                    {selectedJob.tools_required}
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-ink-faint bg-white flex justify-end">
              <button
                onClick={() => setSelectedJob(null)}
                className="px-6 py-3 bg-ink text-white font-body font-semibold rounded-xl hover:bg-ink-soft transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
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
