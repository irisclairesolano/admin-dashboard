'use client';

import React from 'react';
import Avatar from '@/components/Avatar';
import { User } from '@/types/models';
import { getUserVerificationInfo } from '@/lib/verification';

interface UserTableProps {
  paginatedUsers: User[];
  loading: boolean;
  actionLoading: number | null;
  onSelectUser: (user: User) => void;
  onVerify: (user: User) => void;
  onSuspend: (user: User) => void;
  onDelete: (id: number) => void;
  onRestore?: (id: number) => void;
  selectedUserIds?: Set<number>;
  onToggleSelectUser?: (id: number) => void;
  onToggleSelectAll?: () => void;
  isAllSelected?: boolean;
}

export default function UserTable({
  paginatedUsers,
  loading,
  actionLoading,
  onSelectUser,
  onVerify,
  onSuspend,
  onDelete,
  onRestore,
  selectedUserIds,
  onToggleSelectUser,
  onToggleSelectAll,
  isAllSelected = false,
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
      <table className="w-full min-w-[800px] text-left font-body table-fixed border-collapse">
        <thead className="bg-white/50 dark:bg-slate-800/60 border-b border-ink-faint/50 dark:border-slate-800">
          <tr>
            {onToggleSelectUser && (
              <th className="px-3 py-4 w-[4%] text-center">
                <input
                  type="checkbox"
                  aria-label="Select all users"
                  checked={isAllSelected}
                  onChange={onToggleSelectAll}
                  className="w-4 h-4 rounded border-ink-faint text-primary focus:ring-primary/30 cursor-pointer"
                />
              </th>
            )}
            <th className="px-4 py-4 font-body font-semibold text-ink-soft dark:text-slate-300 text-xs uppercase tracking-wider w-[8%]">User ID</th>
            <th className="px-4 py-4 font-body font-semibold text-ink-soft dark:text-slate-300 text-xs uppercase tracking-wider w-[30%]">User Details</th>
            <th className="px-4 py-4 font-body font-semibold text-ink-soft dark:text-slate-300 text-xs uppercase tracking-wider w-[18%]">Role & Status</th>
            <th className="px-4 py-4 font-body font-semibold text-ink-soft dark:text-slate-300 text-xs uppercase tracking-wider w-[11%]">Joined</th>
            <th className="px-4 py-4 font-body font-semibold text-ink-soft dark:text-slate-300 text-xs uppercase tracking-wider w-[13%]">Last Active</th>
            <th className="px-4 py-4 font-body font-semibold text-ink-soft dark:text-slate-300 text-xs uppercase tracking-wider w-[16%] text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-faint/30 dark:divide-slate-800">
          {paginatedUsers.length === 0 ? (
            <tr>
              <td colSpan={onToggleSelectUser ? 7 : 6} className="px-8 py-16 text-center text-ink-soft dark:text-slate-400">
                No users found
              </td>
            </tr>
          ) : (
            paginatedUsers.map((user) => {
              const isSelected = selectedUserIds?.has(user.id) ?? false;
              return (
              <tr
                key={user.id}
                className={`transition-colors duration-200 ${
                  isSelected
                    ? 'bg-primary/10 dark:bg-sky-950/40 hover:bg-primary/15 dark:hover:bg-sky-900/50'
                    : user.deleted_at
                      ? 'bg-ink-faint/15 dark:bg-slate-800/40 hover:bg-ink-faint/25 dark:hover:bg-slate-800/70'
                      : user.is_suspended
                        ? 'bg-status-error/5 dark:bg-status-error/15 hover:bg-status-error/10 dark:hover:bg-status-error/25'
                        : 'hover:bg-white/60 dark:hover:bg-slate-800/60'
                }`}
              >
                {onToggleSelectUser && (
                  <td className="px-3 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label={`Select user ${user.name}`}
                      checked={isSelected}
                      disabled={user.role === 'admin'}
                      onChange={() => onToggleSelectUser(user.id)}
                      className="w-4 h-4 rounded border-ink-faint text-primary focus:ring-primary/30 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    />
                  </td>
                )}
                <td className="px-4 py-3.5 font-numeric text-xs font-semibold text-ink-muted dark:text-slate-400">
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
                        <span className={`font-body font-bold transition-colors group-hover/user:text-primary dark:group-hover/user:text-sky-400 ${user.is_suspended ? 'text-status-error' : 'text-ink dark:text-slate-100'}`}>
                          {user.name}
                        </span>
                        {/* Note: since reports_count and job_posts_count / applications_count are dynamically added, check safety */}
                        {(user as any).reports_count > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                            <i className="lni lni-warning text-xs" />
                            <span>{(user as any).reports_count} {(user as any).reports_count === 1 ? 'report' : 'reports'}</span>
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-ink-muted dark:text-slate-400 mt-0.5 group-hover/user:text-ink-soft dark:group-hover/user:text-slate-300">{user.email}</div>
                      {user.role === 'worker' ? (
                        <div className="text-xs text-ink-muted dark:text-slate-400 mt-1 font-body font-medium flex items-center gap-1.5">
                          <i className="lni lni-briefcase text-xs text-slate-500 dark:text-slate-400" />
                          <span>{(user as any).applications_count ?? 0} {(user as any).applications_count === 1 ? 'application' : 'applications'}</span>
                        </div>
                      ) : user.role === 'employer' ? (
                        <div className="text-xs text-ink-muted dark:text-slate-400 mt-1 font-body font-medium flex items-center gap-1.5">
                          <i className="lni lni-gallery text-xs text-slate-500 dark:text-slate-400" />
                          <span>{(user as any).job_posts_count ?? 0} {(user as any).job_posts_count === 1 ? 'post' : 'posts'}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex flex-col space-y-2 items-start">
                    <span className="badge-neutral uppercase tracking-wide text-xs">
                      {user.role}
                    </span>
                    {(() => {
                      const verifInfo = getUserVerificationInfo(user);
                      return user.deleted_at ? (
                        <span className="flex items-center text-xs font-body font-semibold text-rose-700 dark:text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
                          <i className="lni lni-trash-can mr-1.5 text-xs text-rose-600 dark:text-rose-400" /> Archived
                        </span>
                      ) : (
                        <>
                          <div className="flex flex-col gap-1 items-start">
                            <span className={`flex items-center text-xs font-body font-semibold px-3 py-1 rounded-full border ${verifInfo.badgeClass}`}>
                              <i className={`${verifInfo.iconClass} mr-1.5 text-xs`} /> {verifInfo.label}
                            </span>
                            {verifInfo.statusKey === 'rejected' && (user as any).rejection_reason && (
                              <span className="text-xs text-rose-700 dark:text-rose-400 mt-0.5 max-w-[200px]">
                                Reason: {(user as any).rejection_reason}
                              </span>
                            )}
                          </div>
                          {user.is_suspended && (
                            <span className="flex items-center text-xs font-body font-semibold text-amber-800 dark:text-amber-300 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                              <i className="lni lni-shield mr-1.5 text-xs" /> Suspended
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </td>
                <td className="px-4 py-3.5 text-xs font-body font-medium text-ink-soft dark:text-slate-300">
                  {new Date(user.created_at).toLocaleString('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })} PHT
                </td>
                <td className="px-4 py-3.5 text-xs text-ink-soft dark:text-slate-300 whitespace-nowrap">
                  <div className="flex items-center text-ink-muted dark:text-slate-400 font-body font-medium">
                    <i className="lni lni-timer mr-1.5 text-slate-500 dark:text-slate-400 text-xs" />
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
                      {user.deleted_at ? (
                        onRestore && (
                          <button
                            disabled={actionLoading === user.id}
                            onClick={() => onRestore(user.id)}
                            className="w-24 py-1.5 text-xs font-body font-semibold rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white transition-all text-center cursor-pointer"
                          >
                            Restore
                          </button>
                        )
                      ) : (
                        <>
                          {(() => {
                            const verifInfo = getUserVerificationInfo(user);
                            if (verifInfo.statusKey === 'approved') return null;

                            return verifInfo.canVerify ? (
                              <button
                                disabled={actionLoading === user.id}
                                onClick={() => onVerify(user)}
                                className="w-24 py-1.5 text-xs font-body font-semibold rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white transition-all text-center cursor-pointer"
                                title="Review & Verify User"
                              >
                                Verify
                              </button>
                            ) : (
                              <button
                                disabled
                                title={verifInfo.disabledReason || 'Cannot verify: User has not uploaded ID documents yet'}
                                className="w-24 py-1.5 text-xs font-body font-medium rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-400 cursor-not-allowed opacity-70 text-center"
                              >
                                {verifInfo.statusKey === 'rejected' ? 'Rejected' : 'No ID'}
                              </button>
                            );
                          })()}
                          <button
                            disabled={actionLoading === user.id}
                            onClick={() => onSuspend(user)}
                            className={`w-24 py-1.5 text-xs font-body font-medium rounded-lg border transition-all text-center cursor-pointer ${
                              user.is_suspended
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300 hover:bg-amber-500 hover:text-white'
                                : 'bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-ink dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                          >
                            {user.is_suspended ? 'Unsuspend' : 'Suspend'}
                          </button>
                          <button
                            disabled={actionLoading === user.id}
                            onClick={() => onDelete(user.id)}
                            className="w-24 py-1.5 text-xs font-body font-medium rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 hover:bg-rose-600 hover:text-white transition-all text-center cursor-pointer"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  {user.role === 'admin' && (
                    <span className="text-xs font-body font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 inline-block">Protected Admin</span>
                  )}
                </td>
              </tr>
            );
          })
        )}
      </tbody>
      </table>
    </div>
  );
}
