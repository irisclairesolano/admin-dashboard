'use client';

import React from 'react';
import Avatar from '@/components/Avatar';
import { User } from '@/types/models';

interface UserTableProps {
  paginatedUsers: User[];
  loading: boolean;
  actionLoading: number | null;
  onSelectUser: (user: User) => void;
  onVerify: (user: User) => void;
  onSuspend: (id: number, isSuspended: boolean) => void;
  onDelete: (id: number) => void;
}

export default function UserTable({
  paginatedUsers,
  loading,
  actionLoading,
  onSelectUser,
  onVerify,
  onSuspend,
  onDelete,
}: UserTableProps) {
  if (loading) {
    return (
      <div className="p-8 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 bg-ink-faint/30 rounded-2xl animate-pulse flex items-center justify-between px-6">
            <div className="w-1/3 h-6 bg-ink-faint/50 rounded-lg"></div>
            <div className="w-1/6 h-6 bg-ink-faint/50 rounded-lg"></div>
            <div className="w-1/4 h-8 bg-ink-faint/50 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
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
          {paginatedUsers.length === 0 ? (
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
                    onClick={() => onSelectUser(user)}
                  >
                    <Avatar name={user.name} url={user.avatar_url} isSuspended={user.is_suspended} />
                    <div className="ml-3">
                      <div className="flex items-center flex-wrap gap-1.5">
                        <span className={`font-body font-bold transition-colors group-hover/user:text-primary ${user.is_suspended ? 'text-status-error' : 'text-ink'}`}>
                          {user.name}
                        </span>
                        {/* Note: since reports_count and job_posts_count / applications_count are dynamically added, check safety */}
                        {(user as any).reports_count > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-status-error/10 text-status-error border border-status-error/20 animate-pulse">
                            ⚠️ {(user as any).reports_count} {(user as any).reports_count === 1 ? 'report' : 'reports'}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-ink-muted mt-0.5 group-hover/user:text-ink-soft">{user.email}</div>
                      {user.role === 'worker' ? (
                        <div className="text-[11px] text-ink-muted mt-1 font-body font-semibold flex items-center gap-1">
                          <i className="lni lni-briefcase text-[10px] text-primary" />
                          <span>{(user as any).applications_count ?? 0} {(user as any).applications_count === 1 ? 'application' : 'applications'}</span>
                        </div>
                      ) : user.role === 'employer' ? (
                        <div className="text-[11px] text-ink-muted mt-1 font-body font-semibold flex items-center gap-1">
                          <i className="lni lni-gallery text-[10px] text-primary" />
                          <span>{(user as any).job_posts_count ?? 0} {(user as any).job_posts_count === 1 ? 'post' : 'posts'}</span>
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
                        {(user as any).rejection_reason && (
                          <span className="text-xs text-status-error mt-1 max-w-[200px]">
                            Reason: {(user as any).rejection_reason}
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
                    {(user as any).last_login_at 
                      ? new Date((user as any).last_login_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) 
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
                          onClick={() => onVerify(user)}
                          className="w-24 py-1 text-[10px] font-body font-bold uppercase tracking-wider rounded-lg bg-status-success/15 border border-status-success/20 text-status-success hover:bg-status-success hover:text-white transition-all text-center"
                        >
                          Verify
                        </button>
                      )}
                      <button
                        disabled={actionLoading === user.id}
                        onClick={() => onSuspend(user.id, user.is_suspended)}
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
                        onClick={() => onDelete(user.id)}
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
  );
}
