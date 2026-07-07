'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { ArchiveRestore, User, Briefcase, RefreshCw } from 'lucide-react';

export default function ArchivesPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchArchives = async () => {
    try {
      setLoading(true);
      const [usersRes, jobsRes] = await Promise.all([
        adminApi.getUsers(true),
        adminApi.getJobs(true),
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

  if (loading) return <div className="text-center py-20 font-body text-ink-muted">Loading archives...</div>;
  if (error) return <div className="text-center py-20 text-status-error font-body">{error}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display text-ink">Archives</h1>
          <p className="text-ink-soft font-body mt-2">
            View and restore soft-deleted users and job posts.
          </p>
        </div>
        <button 
          onClick={fetchArchives}
          className="flex items-center px-4 py-2 bg-paper rounded-xl text-ink font-body-semibold hover:bg-ink-faint transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* Soft Deleted Users */}
        <div className="bg-white rounded-2xl shadow-sm border border-ink-faint overflow-hidden">
          <div className="p-6 border-b border-ink-faint bg-paper-cream flex items-center">
            <User className="w-5 h-5 text-primary mr-3" />
            <h2 className="font-display text-xl text-ink">Deleted Users</h2>
          </div>
          <div className="p-0">
            {users.length === 0 ? (
              <div className="p-8 text-center text-ink-muted">No deleted users found.</div>
            ) : (
              <ul className="divide-y divide-ink-faint">
                {users.map(user => (
                  <li key={user.id} className="p-6 flex items-center justify-between hover:bg-paper/30">
                    <div>
                      <div className="font-body-bold text-ink">{user.name}</div>
                      <div className="text-sm text-ink-soft mt-1">{user.email} • {user.role}</div>
                      <div className="text-xs text-status-error mt-1">Deleted at: {new Date(user.deleted_at).toLocaleString()}</div>
                    </div>
                    <button
                      disabled={actionLoading === `user-${user.id}`}
                      onClick={() => handleRestoreUser(user.id)}
                      className="px-3 py-2 bg-status-success/10 text-status-success rounded-lg hover:bg-status-success hover:text-white transition-colors flex items-center font-body-semibold text-sm"
                    >
                      <ArchiveRestore className="w-4 h-4 mr-2" />
                      Restore
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Soft Deleted Jobs */}
        <div className="bg-white rounded-2xl shadow-sm border border-ink-faint overflow-hidden">
          <div className="p-6 border-b border-ink-faint bg-paper-cream flex items-center">
            <Briefcase className="w-5 h-5 text-accent-skyDeep mr-3" />
            <h2 className="font-display text-xl text-ink">Deleted Jobs</h2>
          </div>
          <div className="p-0">
            {jobs.length === 0 ? (
              <div className="p-8 text-center text-ink-muted">No deleted jobs found.</div>
            ) : (
              <ul className="divide-y divide-ink-faint">
                {jobs.map(job => (
                  <li key={job.id} className="p-6 flex items-center justify-between hover:bg-paper/30">
                    <div>
                      <div className="font-body-bold text-ink">{job.title}</div>
                      <div className="text-sm text-ink-soft mt-1">{job.employer?.name || 'Unknown'}</div>
                      <div className="text-xs text-status-error mt-1">Deleted at: {new Date(job.deleted_at).toLocaleString()}</div>
                    </div>
                    <button
                      disabled={actionLoading === `job-${job.id}`}
                      onClick={() => handleRestoreJob(job.id)}
                      className="px-3 py-2 bg-status-success/10 text-status-success rounded-lg hover:bg-status-success hover:text-white transition-colors flex items-center font-body-semibold text-sm"
                    >
                      <ArchiveRestore className="w-4 h-4 mr-2" />
                      Restore
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
