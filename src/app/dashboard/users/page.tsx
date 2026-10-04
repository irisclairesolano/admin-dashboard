'use client';

import React, { useEffect, useState, useMemo, Suspense, useCallback, useDeferredValue } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AlertDialog } from '@/components/AlertDialog';
import dynamic from 'next/dynamic';
import { useDebounce } from '@/hooks/useDebounce';
import { adminApi } from '@/lib/api';
import StatCard from '@/components/StatCard';
import UserTable from '@/components/users/UserTable';
import { Download, ArrowLeft, ArrowRight } from 'lucide-react';
import { exportMultiSectionCSV, formatCSVDate, formatCSVStatus, formatCSVReputation } from '@/lib/export/csv';
import { useUndoToast } from '@/hooks/useUndoToast';
import { UndoToast } from '@/components/UndoToast';

const VerificationModal = dynamic(() => import('@/components/VerificationModal'), {
  ssr: false,
});
const UserDetailDrawer = dynamic(() => import('@/components/users/UserDetailDrawer'), {
  ssr: false,
});
const JobPreviewModal = dynamic(() => import('@/components/users/JobPreviewModal'), {
  ssr: false,
});
const SuspensionModal = dynamic(() => import('@/components/users/SuspensionModal'), {
  ssr: false,
});
const DeleteUserModal = dynamic(() => import('@/components/users/DeleteUserModal'), {
  ssr: false,
});
const BulkUserActionModal = dynamic(() => import('@/components/users/BulkUserActionModal'), {
  ssr: false,
});

function UsersContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlSearch = searchParams.get('search') || '';

  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [archivedUsers, setArchivedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [filter, setFilter] = useState<'all' | 'verified' | 'unverified' | 'rejected'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'worker' | 'employer' | 'admin'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'rating'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [selectedIdUser, setSelectedIdUser] = useState<any | null>(null);
  const [suspensionModalUser, setSuspensionModalUser] = useState<any | null>(null);
  const [suspensionSubmitting, setSuspensionSubmitting] = useState(false);
  const [deleteModalUser, setDeleteModalUser] = useState<any | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
  const [bulkModalState, setBulkModalState] = useState<{
    isOpen: boolean;
    actionType: 'delete' | 'suspend' | 'unsuspend';
  }>({
    isOpen: false,
    actionType: 'delete',
  });
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const {
    activeAction,
    secondsRemaining,
    scheduleUndoAction,
    handleUndo,
    handleDismissNow,
  } = useUndoToast();

  // Sync search from URL query param
  useEffect(() => {
    setSearchTerm(urlSearch);
    setCurrentPage(1);
  }, [urlSearch]);

  // New Drawer & Lazy-Loading States
  const [showArchived, setShowArchived] = useState(false);
  const users = useMemo(() => {
    if (!showArchived) return activeUsers;
    const activeIds = new Set(activeUsers.map((u: any) => u.id));
    const uniqueArchived = archivedUsers.filter((u: any) => !activeIds.has(u.id));
    return [...activeUsers, ...uniqueArchived];
  }, [showArchived, activeUsers, archivedUsers]);
  const [selectedDetailUser, setSelectedDetailUser] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [userDetailData, setUserDetailData] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'activity' | 'reviews' | 'reports' | 'logs' | 'blocks'>('profile');

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

  // Tab 6: Blocks states
  const [blocksLoading, setBlocksLoading] = useState(false);
  const [blocksData, setBlocksData] = useState<{ blocked: any[]; blocked_by: any[] } | null>(null);



  // Job Preview state
  const [selectedJob, setSelectedJob] = useState<any | null>(null);

  const [alertState, setAlertState] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({ open: false, title: '', message: '', onConfirm: () => {} });
  const [showIdModal, setShowIdModal] = useState(false);

  const itemsPerPage = 10;

  const fetchUsers = useCallback(async (forceRefresh: boolean = false) => {
    try {
      setLoading(true);
      const [activeRes, archivedRes] = await Promise.all([
        adminApi.getUsers({
          trashed: false,
          all: true,
          forceRefresh,
        }),
        adminApi.getUsers({
          trashed: true,
          all: true,
          forceRefresh,
        }),
      ]);
      setActiveUsers(activeRes.data?.data || []);
      setArchivedUsers(archivedRes.data?.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

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

  const fetchUserBlocks = async (id: number) => {
    try {
      setBlocksLoading(true);
      const res = await adminApi.getUserBlocks(id);
      setBlocksData(res.data);
    } catch (err: any) {
      setAlertState({ open: true, title: 'Error', message: 'Failed to load user blocks: ' + (err.response?.data?.message || err.message), onConfirm: () => setAlertState(s => ({...s, open: false})) });
    } finally {
      setBlocksLoading(false);
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
      setBlocksData(null);
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

  useEffect(() => {
    if (selectedDetailUser && activeTab === 'blocks') {
      fetchUserBlocks(selectedDetailUser.id);
    }
  }, [selectedDetailUser, activeTab]);

  const handleSuspend = (userOrId: any, currentStatus?: boolean) => {
    const user = typeof userOrId === 'object' && userOrId !== null
      ? userOrId
      : activeUsers.find(u => u.id === userOrId);

    if (!user) return;
    const isCurrentlySuspended = typeof currentStatus === 'boolean' ? currentStatus : user.is_suspended;

    if (!isCurrentlySuspended) {
      setSuspensionModalUser(user);
    } else {
      const previousActive = [...activeUsers];
      const previousDetail = selectedDetailUser;
      setActiveUsers((prev: any[]) => prev.map(u => u.id === user.id ? { ...u, is_suspended: false } : u));
      if (selectedDetailUser && selectedDetailUser.id === user.id) {
        setSelectedDetailUser((prev: any) => prev ? { ...prev, is_suspended: false } : null);
      }

      scheduleUndoAction({
        id: `user-unsuspend-${user.id}`,
        message: `Unsuspended "${user.name}"`,
        subtext: 'Account privileges restored. Click Undo within 5s to cancel.',
        timerSeconds: 5,
        onUndo: () => {
          setActiveUsers(previousActive);
          setSelectedDetailUser(previousDetail);
        },
        onCommit: async () => {
          try {
            setActionLoading(user.id);
            await adminApi.suspendUser(user.id, false);
            const res = await adminApi.getUsers({ trashed: false, all: true, forceRefresh: true });
            setActiveUsers(res.data?.data || []);
            if (selectedDetailUser && selectedDetailUser.id === user.id) {
              fetchUserDetails(user.id);
            }
          } catch (err: any) {
            setActiveUsers(previousActive);
            setSelectedDetailUser(previousDetail);
            setAlertState({
              open: true,
              title: 'Unsuspend Failed',
              message: 'Failed to unsuspend user: ' + (err.response?.data?.message || err.message),
              onConfirm: () => setAlertState(s => ({ ...s, open: false })),
            });
          } finally {
            setActionLoading(null);
          }
        },
      });
    }
  };

  const handleConfirmSuspend = async (userId: number, duration: string, reason: string) => {
    try {
      setSuspensionSubmitting(true);
      setActionLoading(userId);
      await adminApi.suspendUser(userId, true, duration, reason);
      setSuspensionModalUser(null);
      await fetchUsers(true);
      if (selectedDetailUser && selectedDetailUser.id === userId) {
        fetchUserDetails(userId);
      }
    } catch (err: any) {
      setAlertState({
        open: true,
        title: 'Suspension Failed',
        message: 'Failed to suspend user: ' + (err.response?.data?.message || err.message),
        onConfirm: () => setAlertState(s => ({ ...s, open: false }))
      });
    } finally {
      setSuspensionSubmitting(false);
      setActionLoading(null);
    }
  };

  const handleDelete = (id: number) => {
    const target = activeUsers.find(u => u.id === id) || archivedUsers.find(u => u.id === id) || (selectedDetailUser?.id === id ? selectedDetailUser : null);
    if (target) {
      setDeleteModalUser(target);
    }
  };

  const handleConfirmDelete = async (userId: number, reason: string) => {
    const previousActive = [...activeUsers];
    const previousArchived = [...archivedUsers];
    try {
      setDeleteSubmitting(true);
      setActionLoading(userId);
      const target = activeUsers.find(u => u.id === userId);
      setActiveUsers(prev => prev.filter(u => u.id !== userId));
      if (target) {
        setArchivedUsers(prev => [{ ...target, deleted_at: new Date().toISOString() }, ...prev]);
      }
      if (selectedDetailUser && selectedDetailUser.id === userId) {
        setSelectedDetailUser(null);
      }

      await adminApi.deleteUser(userId, reason);
      setDeleteModalUser(null);
      await fetchUsers(true);
    } catch (err: any) {
      setActiveUsers(previousActive);
      setArchivedUsers(previousArchived);
      setAlertState({
        open: true,
        title: 'Delete Failed',
        message: 'Failed to delete user: ' + (err.response?.data?.message || err.message),
        onConfirm: () => setAlertState(s => ({ ...s, open: false }))
      });
      await fetchUsers(true);
    } finally {
      setDeleteSubmitting(false);
      setActionLoading(null);
    }
  };

  const handleRestore = (id: number) => {
    const target = archivedUsers.find(u => u.id === id);
    if (!target) return;
    const userName = target.name || `User #${id}`;
    const previousArchived = [...archivedUsers];
    const previousActive = [...activeUsers];
    const previousDetail = selectedDetailUser;

    setArchivedUsers(prev => prev.filter(u => u.id !== id));
    setActiveUsers(prev => [{ ...target, deleted_at: null }, ...prev]);
    if (selectedDetailUser && selectedDetailUser.id === id) {
      setSelectedDetailUser(null);
    }

    scheduleUndoAction({
      id: `user-restore-${id}`,
      message: `Restored "${userName}"`,
      subtext: 'User returned to active registry. Click Undo within 5s to cancel.',
      timerSeconds: 5,
      onUndo: () => {
        setArchivedUsers(previousArchived);
        setActiveUsers(previousActive);
        setSelectedDetailUser(previousDetail);
      },
      onCommit: async () => {
        try {
          setActionLoading(id);
          await adminApi.restoreUser(id);
          const [activeRes, archivedRes] = await Promise.all([
            adminApi.getUsers({ trashed: false, all: true, forceRefresh: true }),
            adminApi.getUsers({ trashed: true, all: true, forceRefresh: true }),
          ]);
          setActiveUsers(activeRes.data?.data || []);
          setArchivedUsers(archivedRes.data?.data || []);
        } catch (err: any) {
          setArchivedUsers(previousArchived);
          setActiveUsers(previousActive);
          setAlertState({
            open: true,
            title: 'Restore Failed',
            message: 'Failed to restore user: ' + (err.response?.data?.message || err.message),
            onConfirm: () => setAlertState(s => ({ ...s, open: false })),
          });
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const handleManualVerify = async (id: number, status: 'approved' | 'rejected', reason?: string) => {
    try {
      setActionLoading(id);
      await adminApi.verifyUser(id, status, reason);
      await fetchUsers(true); // Refresh list
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
    // If the active drawer already loaded full user details with signed document URLs, prefer that object
    let userToVerify = user || selectedDetailUser;
    if (userDetailData?.user && userToVerify && userDetailData.user.id === userToVerify.id) {
      userToVerify = { ...userToVerify, ...userDetailData.user };
    }
    if (userToVerify) {
      setSelectedIdUser(userToVerify);
      setShowIdModal(true);
    }
  };

  const handleExportCSV = () => {
    if (!users || users.length === 0) {
      setAlertState({
        open: true,
        title: 'Export Empty',
        message: 'No user records available to export.',
        onConfirm: () => setAlertState(s => ({ ...s, open: false })),
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
      'Operational Status',
      'Reputation Score',
      'Date Registered'
    ];

    const rows = sortedUsers.map((u) => [
      u.id,
      u.name,
      u.role,
      u.email,
      u.phone || '',
      u.municipality || 'Bulan',
      u.barangay || '',
      formatCSVStatus(u.verification_status),
      u.is_suspended ? 'Suspended' : u.deleted_at ? 'Archived' : 'Active',
      formatCSVReputation(u.reputation_score, u.ratings_count ?? u.reviews_received_count),
      formatCSVDate(u.created_at)
    ]);

    exportMultiSectionCSV(
      `sikap_users_directory_${new Date().toISOString().slice(0, 10)}`,
      'SIKAP Registered Users Masterlist',
      [
        ['Generated On:', formatCSVDate(new Date().toISOString())],
        ['Report Type:', 'User Registry Summary'],
        ['Total Records Exported:', String(sortedUsers.length)],
        ['Active View Filter:', showArchived ? `${filter.toUpperCase()} (Including Archived)` : filter.toUpperCase()],
        ['Role Filter:', roleFilter.toUpperCase()],
      ],
      [
        {
          title: 'Users Directory',
          headers,
          rows,
        },
      ]
    );
  };

  const filteredUsers = useMemo(() => {
    const q = deferredSearchTerm.trim().toLowerCase();
    return users.filter(u => {
      const matchesSearch = !q ||
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q));

      if (!matchesSearch) return false;
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;

      if (filter === 'all') return true;
      if (filter === 'verified') return u.verification_status === 'approved';
      if (filter === 'rejected') return u.verification_status === 'rejected' || u.registration_status === 'rejected';
      if (filter === 'unverified') return u.verification_status !== 'approved' && u.verification_status !== 'rejected' && u.registration_status !== 'rejected';

      return true;
    });
  }, [users, deferredSearchTerm, roleFilter, filter]);

  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a: any, b: any) => {
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
  }, [filteredUsers, sortBy, sortOrder]);

  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage) || 1;
  const paginatedUsers = sortedUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const eligiblePaginatedUsers = useMemo(() => {
    return paginatedUsers.filter((u: any) => u.role !== 'admin');
  }, [paginatedUsers]);

  const isAllSelected = useMemo(() => {
    if (eligiblePaginatedUsers.length === 0) return false;
    return eligiblePaginatedUsers.every((u: any) => selectedUserIds.has(u.id));
  }, [eligiblePaginatedUsers, selectedUserIds]);

  const handleToggleSelectUser = (id: number) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedUserIds((prev) => {
        const next = new Set(prev);
        eligiblePaginatedUsers.forEach((u: any) => next.delete(u.id));
        return next;
      });
    } else {
      setSelectedUserIds((prev) => {
        const next = new Set(prev);
        eligiblePaginatedUsers.forEach((u: any) => next.add(u.id));
        return next;
      });
    }
  };

  const handleDeselectAll = () => {
    setSelectedUserIds(new Set());
  };

  const selectedUsersList = useMemo(() => {
    return users.filter((u) => selectedUserIds.has(u.id));
  }, [users, selectedUserIds]);

  const suspendableUsers = useMemo(() => {
    return selectedUsersList.filter((u) => !u.is_suspended && !u.deleted_at);
  }, [selectedUsersList]);

  const unsuspendableUsers = useMemo(() => {
    return selectedUsersList.filter((u) => !!u.is_suspended && !u.deleted_at);
  }, [selectedUsersList]);

  const deletableUsers = useMemo(() => {
    return selectedUsersList.filter((u) => !u.deleted_at);
  }, [selectedUsersList]);

  const handleBulkSuspend = (isSuspended: boolean) => {
    const targetUsers = isSuspended ? suspendableUsers : unsuspendableUsers;
    if (targetUsers.length === 0) return;
    setBulkModalState({
      isOpen: true,
      actionType: isSuspended ? 'suspend' : 'unsuspend',
    });
  };

  const handleBulkDelete = () => {
    if (deletableUsers.length === 0) return;
    setBulkModalState({
      isOpen: true,
      actionType: 'delete',
    });
  };

  const handleConfirmBulkUserAction = async (userIds: number[], reason: string, duration?: string) => {
    try {
      setBulkActionLoading(true);
      const action = bulkModalState.actionType;

      if (action === 'delete') {
        try {
          await adminApi.bulkDeleteUsers(userIds, reason);
        } catch {
          const results = await Promise.allSettled(userIds.map((id) => adminApi.deleteUser(id, reason)));
          const failures = results.filter((r) => r.status === 'rejected');
          if (failures.length === userIds.length) {
            throw new Error('All user deletion requests failed.');
          }
        }
      } else if (action === 'suspend') {
        try {
          await adminApi.bulkUpdateUserStatus(userIds, true, duration, reason);
        } catch {
          const results = await Promise.allSettled(userIds.map((id) => adminApi.suspendUser(id, true, duration, reason)));
          const failures = results.filter((r) => r.status === 'rejected');
          if (failures.length === userIds.length) {
            throw new Error('All user suspension requests failed.');
          }
        }
      } else if (action === 'unsuspend') {
        try {
          await adminApi.bulkUpdateUserStatus(userIds, false, undefined, reason);
        } catch {
          const results = await Promise.allSettled(userIds.map((id) => adminApi.suspendUser(id, false, undefined, reason)));
          const failures = results.filter((r) => r.status === 'rejected');
          if (failures.length === userIds.length) {
            throw new Error('All user unsuspend requests failed.');
          }
        }
      }

      setSelectedUserIds(new Set());
      setBulkModalState((prev) => ({ ...prev, isOpen: false }));
      await fetchUsers(true);

      const actionLabel = action === 'delete' ? 'archived' : action === 'suspend' ? 'suspended' : 'unsuspended';
      setAlertState({
        open: true,
        title: 'Bulk Action Successful',
        message: `Successfully ${actionLabel} ${userIds.length} user account${userIds.length === 1 ? '' : 's'}.`,
        onConfirm: () => setAlertState((s) => ({ ...s, open: false })),
      });
    } catch (err: any) {
      setAlertState({
        open: true,
        title: 'Bulk Action Failed',
        message: 'An error occurred during bulk operation: ' + (err.response?.data?.message || err.message),
        onConfirm: () => setAlertState((s) => ({ ...s, open: false })),
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  if (error) return <div className="text-center py-20 text-status-error font-body">{error}</div>;

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-ink">User Management</h1>
          <p className="text-xs text-ink-muted mt-0.5">
            Monitor, suspend, or remove users from the platform.
          </p>
        </div>

        <div className="mt-3 md:mt-0 relative w-full md:w-72 group">
          <input
            type="text"
            aria-label="Search users by name or email"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 bg-white/90 rounded-xl border border-ink-faint/40 shadow-xs focus:bg-white focus:border-ink/50 outline-none font-body transition-all text-xs"
          />
          <i className="lni lni-search text-ink-muted absolute left-3 top-1/2 transform -translate-y-1/2 text-xs" />
        </div>
      </div>

      {/* 6 Stat Cards: Total, Workers, Employers, Admins, Pending Review, Archived */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-4">
        <StatCard
          title="Total Users"
          value={activeUsers.length + archivedUsers.length}
          iconClass="lni lni-users"
          bg="from-slate-100 to-slate-200"
          iconColor="text-slate-700"
          onClick={() => { setShowArchived(false); setFilter('all'); setRoleFilter('all'); setCurrentPage(1); }}
        />
        <StatCard
          title="Workers"
          value={activeUsers.filter(u => u.role === 'worker').length}
          iconClass="lni lni-user"
          bg="from-emerald-50 to-emerald-100"
          iconColor="text-emerald-700"
          onClick={() => { setShowArchived(false); setRoleFilter('worker'); setFilter('all'); setCurrentPage(1); }}
        />
        <StatCard
          title="Employers"
          value={activeUsers.filter(u => u.role === 'employer').length}
          iconClass="lni lni-briefcase"
          bg="from-amber-50 to-amber-100"
          iconColor="text-amber-700"
          onClick={() => { setShowArchived(false); setRoleFilter('employer'); setFilter('all'); setCurrentPage(1); }}
        />
        <StatCard
          title="Admins"
          value={activeUsers.filter(u => u.role === 'admin').length}
          iconClass="lni lni-shield"
          bg="from-indigo-50 to-indigo-100"
          iconColor="text-indigo-700"
          onClick={() => { setShowArchived(false); setRoleFilter('admin'); setFilter('all'); setCurrentPage(1); }}
        />
        <StatCard
          title="Pending Review"
          value={activeUsers.filter(u => u.registration_status === 'pending_review' || (u.verification_status === 'pending' && u.document_url)).length}
          iconClass="lni lni-warning"
          bg="from-orange-50 to-orange-100"
          iconColor="text-orange-700"
          onClick={() => router.push('/dashboard/verifications')}
        />
        <StatCard
          title="Archived & Deleted"
          value={archivedUsers.length}
          iconClass="lni lni-trash-can"
          bg="from-rose-50 to-rose-100"
          iconColor="text-rose-700"
          onClick={() => { setShowArchived(true); setFilter('all'); setRoleFilter('all'); setCurrentPage(1); }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-4">
        <div className="flex space-x-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => { setFilter('all'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg font-body font-semibold text-xs transition-colors whitespace-nowrap ${filter === 'all' ? 'bg-ink text-white' : 'bg-white/70 text-ink-soft hover:bg-white border border-ink-faint/40'}`}>
            All Users
          </button>
          <button
            onClick={() => { setFilter('verified'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg font-body font-semibold text-xs transition-colors whitespace-nowrap ${filter === 'verified' ? 'bg-status-success text-white' : 'bg-white/70 text-ink-soft hover:bg-white border border-ink-faint/40'}`}>
            Verified
          </button>
          <button
            onClick={() => { setFilter('unverified'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg font-body font-semibold text-xs transition-colors whitespace-nowrap ${filter === 'unverified' ? 'bg-status-warning text-white' : 'bg-white/70 text-ink-soft hover:bg-white border border-ink-faint/40'}`}>
            Unverified
          </button>
          <button
            onClick={() => { setFilter('rejected'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg font-body font-semibold text-xs transition-colors whitespace-nowrap ${filter === 'rejected' ? 'bg-status-error text-white' : 'bg-white/70 text-ink-soft hover:bg-white border border-ink-faint/40'}`}>
            Rejected
          </button>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <label className="flex items-center space-x-1.5 bg-white/70 border border-ink-faint/40 px-2.5 py-1.5 rounded-lg text-xs font-body font-semibold text-ink-soft cursor-pointer hover:bg-white transition-all select-none">
            <input
              type="checkbox"
              aria-label="Show archived users"
              checked={showArchived}
              onChange={(e) => {
                setShowArchived(e.target.checked);
                setCurrentPage(1);
              }}
              className="rounded text-primary focus:ring-primary w-3.5 h-3.5 border-ink-faint"
            />
            <span>Show Archived</span>
          </label>

          <select
            value={roleFilter}
            aria-label="Filter by user role"
            onChange={(e) => {
              setRoleFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 rounded-lg font-body font-semibold text-xs transition-colors whitespace-nowrap bg-white border border-ink-faint/40 text-ink-soft focus:bg-white outline-none cursor-pointer"
          >
            <option value="all">All Roles</option>
            <option value="worker">Workers</option>
            <option value="employer">Employers</option>
            <option value="admin">Admins</option>
          </select>

          <select
            value={sortBy}
            aria-label="Sort users by"
            onChange={(e) => {
              setSortBy(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 rounded-lg font-body font-semibold text-xs transition-colors whitespace-nowrap bg-white border border-ink-faint/40 text-ink-soft focus:bg-white outline-none cursor-pointer"
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
            className="px-2.5 py-1.5 rounded-lg font-body font-semibold text-xs transition-colors whitespace-nowrap bg-white border border-ink-faint/40 text-ink-soft focus:bg-white outline-none cursor-pointer"
          >
            <option value="desc">Newest</option>
            <option value="asc">Oldest</option>
          </select>

          <button
            onClick={handleExportCSV}
            aria-label="Export users as CSV"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-ink-faint/40 shadow-2xs hover:bg-slate-900 hover:text-white text-ink-soft transition font-body font-bold text-xs cursor-pointer"
            title="Export filtered users directory as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-xs border border-ink-faint/30 overflow-hidden">
        <UserTable
          paginatedUsers={paginatedUsers}
          loading={loading}
          actionLoading={actionLoading}
          onSelectUser={(user) => setSelectedDetailUser(user)}
          onVerify={(user) => handleVerify(user)}
          onSuspend={handleSuspend}
          onDelete={handleDelete}
          onRestore={handleRestore}
          selectedUserIds={selectedUserIds}
          onToggleSelectUser={handleToggleSelectUser}
          onToggleSelectAll={handleToggleSelectAll}
          isAllSelected={isAllSelected}
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
          blocksLoading={blocksLoading}
          blocksData={blocksData}
        />
      )}

      {/* Job Post Preview Modal */}
      {selectedJob && (
        <JobPreviewModal
          selectedJob={selectedJob}
          onClose={() => setSelectedJob(null)}
        />
      )}
      {/* Suspension Modal */}
      {suspensionModalUser && (
        <SuspensionModal
          user={suspensionModalUser}
          onClose={() => setSuspensionModalUser(null)}
          onConfirm={handleConfirmSuspend}
          loading={suspensionSubmitting}
        />
      )}
      {/* Delete User Modal */}
      {deleteModalUser && (
        <DeleteUserModal
          user={deleteModalUser}
          onClose={() => setDeleteModalUser(null)}
          onConfirm={handleConfirmDelete}
          loading={deleteSubmitting}
        />
      )}
      {bulkModalState.isOpen && (
        <BulkUserActionModal
          isOpen={bulkModalState.isOpen}
          actionType={bulkModalState.actionType}
          selectedUsers={
            bulkModalState.actionType === 'suspend'
              ? suspendableUsers
              : bulkModalState.actionType === 'unsuspend'
              ? unsuspendableUsers
              : deletableUsers
          }
          onClose={() => setBulkModalState((prev) => ({ ...prev, isOpen: false }))}
          onConfirm={handleConfirmBulkUserAction}
          loading={bulkActionLoading}
        />
      )}
      {/* Floating Bulk Actions Bar */}
      {selectedUserIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-ink text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/20 animate-fade-in backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold font-numeric">
              {selectedUserIds.size}
            </span>
            <span className="text-xs font-body font-semibold whitespace-nowrap">
              {selectedUserIds.size === 1 ? 'user' : 'users'} selected
            </span>
          </div>
          <div className="h-4 w-px bg-white/20" />
          <div className="flex items-center gap-2">
            {suspendableUsers.length > 0 && (
              <button
                onClick={() => handleBulkSuspend(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-white border border-amber-500/30 text-xs font-body font-bold transition-all cursor-pointer whitespace-nowrap"
              >
                Bulk Suspend {suspendableUsers.length !== selectedUsersList.length ? `(${suspendableUsers.length})` : ''}
              </button>
            )}
            {unsuspendableUsers.length > 0 && (
              <button
                onClick={() => handleBulkSuspend(false)}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-white border border-emerald-500/30 text-xs font-body font-bold transition-all cursor-pointer whitespace-nowrap"
              >
                Bulk Unsuspend {unsuspendableUsers.length !== selectedUsersList.length ? `(${unsuspendableUsers.length})` : ''}
              </button>
            )}
            {deletableUsers.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white border border-rose-500/30 text-xs font-body font-bold transition-all cursor-pointer whitespace-nowrap"
              >
                Bulk Delete {deletableUsers.length !== selectedUsersList.length ? `(${deletableUsers.length})` : ''}
              </button>
            )}
            {suspendableUsers.length === 0 && unsuspendableUsers.length === 0 && deletableUsers.length === 0 && (
              <span className="text-xs text-white/70 italic px-2 whitespace-nowrap">
                No bulk actions applicable
              </span>
            )}
            <button
              onClick={handleDeselectAll}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-xs font-body font-medium transition-all cursor-pointer ml-1 whitespace-nowrap"
            >
              Deselect
            </button>
          </div>
        </div>
      )}
      <AlertDialog isOpen={alertState.open} title={alertState.title} message={alertState.message} onConfirm={() => { alertState.onConfirm(); setAlertState(s => ({...s, open: false})); }} onCancel={() => setAlertState(s => ({...s, open: false}))} confirmText="Confirm" cancelText="Cancel" />
      <UndoToast
        action={activeAction}
        secondsRemaining={secondsRemaining}
        onUndo={handleUndo}
        onDismiss={handleDismissNow}
      />
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
