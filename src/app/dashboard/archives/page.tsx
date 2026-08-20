'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { adminApi } from '@/lib/api';
import StatCard from '@/components/StatCard';
import StatusTabs from '@/components/StatusTabs';

function ArchivesPageContent() {
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get('search') || '';

  const [users, setUsers] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('Deleted Users');
  const [userSearch, setUserSearch] = useState('');
  const [jobSearch, setJobSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Sync global search with the active tab's local search state
  useEffect(() => {
    if (urlSearch) {
      if (activeTab === 'Deleted Users') {
        setUserSearch(urlSearch);
      } else {
        setJobSearch(urlSearch);
      }
    }
  }, [urlSearch, activeTab]);

  const fetchArchives = async () => {
    try {
      setLoading(true);
      const [usersRes, jobsRes] = await Promise.all([
        adminApi.getUsers(true), // trashed users
        adminApi.getJobs(true),  // trashed jobs
      ]);
      setUsers(usersRes.data.data || []);
      setJobs(jobsRes.data.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load archives');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchives();
  }, []);

  const handleRestoreUser = async (id: number) => {
    if (!confirm('Are you sure you want to restore this user? They will regain access to the platform.')) return;
    try {
      setActionLoading(`user-${id}`);
      await adminApi.restoreUser(id);
      await fetchArchives();
    } catch (err: any) {
      alert('Failed to restore user: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const handlePermanentDeleteUser = async (id: number) => {
    if (!confirm('Are you sure you want to PERMANENTLY delete this user? This cannot be undone. All data will be permanently erased.')) return;
    try {
      setActionLoading(`user-force-${id}`);
      await adminApi.permanentDeleteUser(id);
      await fetchArchives();
    } catch (err: any) {
      alert('Failed to permanently delete user: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestoreJob = async (id: number) => {
    if (!confirm('Are you sure you want to restore this job post? It will become visible again.')) return;
    try {
      setActionLoading(`job-${id}`);
      await adminApi.restoreJob(id);
      await fetchArchives();
    } catch (err: any) {
      alert('Failed to restore job: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const handlePermanentDeleteJob = async (id: number) => {
    if (!confirm('Are you sure you want to PERMANENTLY delete this job post? This cannot be undone. All data will be permanently erased.')) return;
    try {
      setActionLoading(`job-force-${id}`);
      await adminApi.permanentDeleteJob(id);
      await fetchArchives();
    } catch (err: any) {
      alert('Failed to permanently delete job: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  // Filter lists based on local search terms
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredJobs = jobs.filter(job =>
    job.title.toLowerCase().includes(jobSearch.toLowerCase()) ||
    (job.employer?.name || '').toLowerCase().includes(jobSearch.toLowerCase())
  );

  if (loading) return <div className="text-center py-20 font-body text-ink-muted">Loading archives...</div>;
  if (error) return <div className="text-center py-20 text-status-error font-body">{error}</div>;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-display text-transparent bg-clip-text bg-gradient-to-r from-ink to-primary-dark font-bold">Archives</h1>
          <p className="text-ink-soft font-body mt-2 text-lg">
            Manage soft-deleted accounts and job postings.
          </p>
        </div>
        <button 
          onClick={fetchArchives}
          className="flex items-center px-4 py-2 bg-paper rounded-xl text-ink font-body font-semibold hover:bg-ink-faint border border-ink-faint/55 transition-colors text-sm"
        >
          <i className="lni lni-reload mr-2" />
          Refresh
        </button>
      </div>

      {/* 2 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <StatCard title="Deleted Users" value={users.length} iconClass="lni lni-user text-primary" />
        <StatCard title="Deleted Jobs" value={jobs.length} iconClass="lni lni-briefcase text-primary" />
      </div>

      {/* Tab Switcher & Search Bar */}
      <div className="mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
        <StatusTabs
          options={[`Deleted Users (${users.length})`, `Deleted Jobs (${jobs.length})`]}
          activeKey={activeTab.startsWith('Deleted Users') ? `Deleted Users (${users.length})` : `Deleted Jobs (${jobs.length})`}
          onSelect={(tab) => setActiveTab(tab.startsWith('Deleted Users') ? 'Deleted Users' : 'Deleted Jobs')}
        />

        <div className="relative w-full md:w-80 group">
          {activeTab === 'Deleted Users' ? (
            <>
              <input
                type="text"
                placeholder="Search deleted users..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/80 backdrop-blur-md border border-ink-faint/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition text-sm font-body"
              />
              <i className="lni lni-search text-ink-muted absolute left-3.5 top-1/2 transform -translate-y-1/2" />
            </>
          ) : (
            <>
              <input
                type="text"
                placeholder="Search deleted jobs..."
                value={jobSearch}
                onChange={e => setJobSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/80 backdrop-blur-md border border-ink-faint/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition text-sm font-body"
              />
              <i className="lni lni-search text-ink-muted absolute left-3.5 top-1/2 transform -translate-y-1/2" />
            </>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-white/50 overflow-hidden transition-all hover:shadow-lg">
        {activeTab === 'Deleted Users' ? (
          <div>
            <div className="px-6 py-4 border-b border-ink-faint/30 bg-paper/20 flex items-center">
              <i className="lni lni-user text-primary mr-3 text-lg" />
              <h2 className="font-display text-lg text-ink font-bold">Deleted Users List</h2>
            </div>
            {filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-ink-muted font-body">No deleted users found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-body table-fixed border-collapse">
                  <thead className="bg-white/50 border-b border-ink-faint/50">
                    <tr>
                      <th className="px-6 py-3.5 text-xs font-semibold text-ink-soft uppercase tracking-wider w-[12%]">User ID</th>
                      <th className="px-6 py-3.5 text-xs font-semibold text-ink-soft uppercase tracking-wider w-[38%]">User Details</th>
                      <th className="px-6 py-3.5 text-xs font-semibold text-ink-soft uppercase tracking-wider w-[18%]">Role</th>
                      <th className="px-6 py-3.5 text-xs font-semibold text-ink-soft uppercase tracking-wider w-[17%]">Deleted At</th>
                      <th className="px-6 py-3.5 text-xs font-semibold text-ink-soft uppercase tracking-wider w-[15%] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-faint/30">
                    {filteredUsers.map(user => (
                      <tr key={user.id} className="hover:bg-white/60 transition-colors duration-200">
                        <td className="px-6 py-4 text-xs font-numeric font-bold text-ink-muted">#{user.id}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-ink-faint to-ink-muted/30 flex items-center justify-center text-ink font-bold text-xs shadow-inner mr-2.5 flex-shrink-0">
                              {(user.name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-ink text-xs truncate">{user.name}</div>
                              <div className="text-[10px] text-ink-soft truncate mt-0.5">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            user.role === 'employer' ? 'bg-accent-peach text-primary-dark border border-accent-peachBright/50' : 'bg-accent-mint text-accent-mintDeep border border-accent-mintDeep/20'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-status-error font-numeric">
                          {new Date(user.deleted_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end space-x-2">
                            <button
                              disabled={actionLoading === `user-${user.id}`}
                              onClick={() => handleRestoreUser(user.id)}
                              className="p-1.5 rounded-lg bg-status-success/10 text-status-success hover:bg-status-success hover:text-white border border-status-success/20 transition-all"
                              title="Restore User"
                            >
                              <i className="lni lni-arrow-left text-xs" />
                            </button>
                            <button
                              disabled={actionLoading === `user-force-${user.id}`}
                              onClick={() => handlePermanentDeleteUser(user.id)}
                              className="p-1.5 rounded-lg bg-status-error/10 text-status-error hover:bg-status-error hover:text-white border border-status-error/20 transition-all"
                              title="Permanently Delete User"
                            >
                              <i className="lni lni-trash-can text-xs" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="px-6 py-4 border-b border-ink-faint/30 bg-paper/20 flex items-center">
              <i className="lni lni-briefcase text-primary mr-3 text-lg" />
              <h2 className="font-display text-lg text-ink font-bold">Deleted Jobs List</h2>
            </div>
            {filteredJobs.length === 0 ? (
              <div className="p-8 text-center text-ink-muted font-body">No deleted jobs found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-body table-fixed border-collapse">
                  <thead className="bg-white/50 border-b border-ink-faint/50">
                    <tr>
                      <th className="px-6 py-3.5 text-xs font-semibold text-ink-soft uppercase tracking-wider w-[12%]">Job ID</th>
                      <th className="px-6 py-3.5 text-xs font-semibold text-ink-soft uppercase tracking-wider w-[35%]">Job Details</th>
                      <th className="px-6 py-3.5 text-xs font-semibold text-ink-soft uppercase tracking-wider w-[21%]">Employer</th>
                      <th className="px-6 py-3.5 text-xs font-semibold text-ink-soft uppercase tracking-wider w-[17%]">Deleted At</th>
                      <th className="px-6 py-3.5 text-xs font-semibold text-ink-soft uppercase tracking-wider w-[15%] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-faint/30">
                    {filteredJobs.map(job => (
                      <tr key={job.id} className="hover:bg-white/60 transition-colors duration-200">
                        <td className="px-6 py-4 text-xs font-numeric font-bold text-ink-muted">#{job.id}</td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-ink text-xs truncate">{job.title}</div>
                          <span className="inline-block px-2 py-0.5 rounded bg-accent-sky text-primary-dark text-[9px] font-bold border border-white/50 mt-1">{job.category}</span>
                        </td>
                        <td className="px-6 py-4 text-xs text-ink font-bold truncate">
                          {job.employer?.name || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 text-xs text-status-error font-numeric">
                          {new Date(job.deleted_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end space-x-2">
                            <button
                              disabled={actionLoading === `job-${job.id}`}
                              onClick={() => handleRestoreJob(job.id)}
                              className="p-1.5 rounded-lg bg-status-success/10 text-status-success hover:bg-status-success hover:text-white border border-status-success/20 transition-all"
                              title="Restore Job Post"
                            >
                              <i className="lni lni-arrow-left text-xs" />
                            </button>
                            <button
                              disabled={actionLoading === `job-force-${job.id}`}
                              onClick={() => handlePermanentDeleteJob(job.id)}
                              className="p-1.5 rounded-lg bg-status-error/10 text-status-error hover:bg-status-error hover:text-white border border-status-error/20 transition-all"
                              title="Permanently Delete Job Post"
                            >
                              <i className="lni lni-trash-can text-xs" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ArchivesPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 font-body text-ink-muted">Loading archives...</div>}>
      <ArchivesPageContent />
    </Suspense>
  );
}
