'use client';

/**
 * ============================================================================
 * Action Required from User Analytics & Management Component (ActionRequiredAnalytics.tsx)
 * ============================================================================
 * (a) Purpose:
 *     Provides deep analytical telemetries and an interactive filterable workstation
 *     for accounts waiting for user actions (Email OTP verification, ID upload, or
 *     re-upload post-rejection).
 *
 * (b) Core Capabilities:
 *     1. Unique Account Count: Total unique users currently blocked by user action.
 *     2. Breakdown by Reason:
 *        - Pending Email OTP (!email_verified_at)
 *        - Pending ID Upload (email verified, missing ID/selfie/permit)
 *        - Awaiting Re-upload (post-rejection)
 *        - Specific missing requirements (Front ID, Back ID, Selfie, Business Permit)
 *     3. Waiting Duration Analytics:
 *        - Accurate waiting-start time (Registration, OTP verification, or Rejection)
 *        - Real-time elapsed duration with ticking minute/second precision
 *        - 4-Tier SLA Aging Breakdown (<12h Fresh, 12-24h Priority, 24-48h Urgent, >48h Stalled)
 *        - Average and Median turnaround duration
 *        - Priority highlight for the longest-waiting user
 *     4. Filterable & Searchable Table:
 *        - Search by Name, Email, Phone, User ID
 *        - Filter by Reason (All, OTP, ID Upload, Missing Specific Docs, Re-upload)
 *        - Filter by Role (All, Worker, Employer)
 *        - Filter by Aging Bucket (<12h, 12-24h, 24-48h, >48h)
 *        - Sort by duration descending/ascending, registration date, or name
 * ============================================================================
 */

import React, { useState, useMemo } from 'react';
import Avatar from '@/components/Avatar';
import {
  getWaitingStartTime,
  getWaitingDurationInfo,
  getWaitingAccountStats,
  getMissingRequirements,
} from '@/lib/verification';

export interface ActionRequiredAnalyticsProps {
  users: any[];
  nowMs: number;
  onInspectUser: (user: any) => void;
}

export default function ActionRequiredAnalytics({
  users,
  nowMs,
  onInspectUser,
}: ActionRequiredAnalyticsProps) {
  // ── FILTER & SORT STATES ──────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [reasonFilter, setReasonFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'worker' | 'employer'>('all');
  const [agingFilter, setAgingFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'duration_desc' | 'duration_asc' | 'newest' | 'oldest' | 'name_asc'>('duration_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // ── AGGREGATE ANALYTICS ───────────────────────────────────────────────────
  const stats = useMemo(() => {
    return getWaitingAccountStats(users, nowMs);
  }, [users, nowMs]);

  // ── FILTERED & SORTED USERS ───────────────────────────────────────────────
  const processedUsers = useMemo(() => {
    return users
      .map((user) => {
        const startInfo = getWaitingStartTime(user);
        const durInfo = getWaitingDurationInfo(startInfo.startTime, nowMs);
        const reqInfo = getMissingRequirements(user);
        return {
          user,
          startInfo,
          durInfo,
          reqInfo,
        };
      })
      .filter(({ user, startInfo, durInfo, reqInfo }) => {
        // Search filter (Name, Email, Phone, ID)
        if (searchTerm.trim() !== '') {
          const q = searchTerm.toLowerCase();
          const matchesName = user.name?.toLowerCase().includes(q);
          const matchesEmail = user.email?.toLowerCase().includes(q);
          const matchesPhone = user.phone?.toLowerCase().includes(q);
          const matchesId = String(user.id).includes(q);
          const matchesReason = user.rejection_reason?.toLowerCase().includes(q);
          if (!matchesName && !matchesEmail && !matchesPhone && !matchesId && !matchesReason) {
            return false;
          }
        }

        // Role filter
        if (roleFilter !== 'all' && user.role !== roleFilter) {
          return false;
        }

        // Aging bucket filter
        if (agingFilter !== 'all' && durInfo.agingBucket !== agingFilter) {
          return false;
        }

        // Reason filter
        if (reasonFilter !== 'all') {
          if (reasonFilter === 'pending_otp' && startInfo.reasonKey !== 'pending_otp') return false;
          if (reasonFilter === 'pending_id_upload' && startInfo.reasonKey !== 'pending_id_upload') return false;
          if (reasonFilter === 'rejected_reupload' && startInfo.reasonKey !== 'rejected_reupload') return false;
          if (reasonFilter === 'missing_front') {
            const hasFront = reqInfo.missingItems.includes('Front of ID') || reqInfo.missingItems.includes('Representative ID');
            if (!hasFront) return false;
          }
          if (reasonFilter === 'missing_back' && !reqInfo.missingItems.includes('Back of ID')) return false;
          if (reasonFilter === 'missing_selfie' && !reqInfo.missingItems.includes('Selfie holding ID')) return false;
          if (reasonFilter === 'missing_permit' && !reqInfo.missingItems.includes('Business Permit')) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'duration_desc') {
          return b.durInfo.durationMs - a.durInfo.durationMs;
        }
        if (sortBy === 'duration_asc') {
          return a.durInfo.durationMs - b.durInfo.durationMs;
        }
        if (sortBy === 'newest') {
          return new Date(b.user.created_at).getTime() - new Date(a.user.created_at).getTime();
        }
        if (sortBy === 'oldest') {
          return new Date(a.user.created_at).getTime() - new Date(b.user.created_at).getTime();
        }
        if (sortBy === 'name_asc') {
          return (a.user.name || '').localeCompare(b.user.name || '');
        }
        return 0;
      });
  }, [users, nowMs, searchTerm, roleFilter, agingFilter, reasonFilter, sortBy]);

  // ── PAGINATION ────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(processedUsers.length / itemsPerPage));
  const activePage = Math.min(currentPage, totalPages);
  const paginatedItems = useMemo(() => {
    const startIndex = (activePage - 1) * itemsPerPage;
    return processedUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [processedUsers, activePage, itemsPerPage]);

  const handleCopyContact = (id: number, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const hasActiveFilters =
    searchTerm !== '' ||
    reasonFilter !== 'all' ||
    roleFilter !== 'all' ||
    agingFilter !== 'all' ||
    sortBy !== 'duration_desc';

  const resetFilters = () => {
    setSearchTerm('');
    setReasonFilter('all');
    setRoleFilter('all');
    setAgingFilter('all');
    setSortBy('duration_desc');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* ── TOP ANALYTICS SCORECARDS GRID ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Unique Accounts Waiting */}
        <div className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md rounded-2xl p-5 border border-white/60 dark:border-slate-700/60 shadow-glass flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold tracking-wider uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                Action Required
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center">
                <i className="lni lni-timer text-base" />
              </div>
            </div>
            <h4 className="text-xs font-semibold text-ink-muted">Total Unique Accounts</h4>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold font-numeric text-ink">
                {stats.totalUnique}
              </span>
              <span className="text-xs text-ink-muted font-medium">waiting for user</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-ink-faint/30 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-ink-soft">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-semibold">{stats.byRole.worker}</span>
              <span className="text-[11px] text-ink-muted">Workers ({stats.byRole.workerPct}%)</span>
            </div>
            <div className="flex items-center gap-1.5 text-ink-soft">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="font-semibold">{stats.byRole.employer}</span>
              <span className="text-[11px] text-ink-muted">Employers ({stats.byRole.employerPct}%)</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Breakdown by Primary Reason */}
        <div className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md rounded-2xl p-5 border border-white/60 dark:border-slate-700/60 shadow-glass flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold tracking-wider uppercase text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                Reason Breakdown
              </span>
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-700 flex items-center justify-center">
                <i className="lni lni-layers text-base" />
              </div>
            </div>
            <h4 className="text-xs font-semibold text-ink-muted">Bottleneck Reason</h4>
          </div>

          <div className="space-y-2 mt-2">
            {/* Pending OTP */}
            <button
              onClick={() => {
                setReasonFilter(reasonFilter === 'pending_otp' ? 'all' : 'pending_otp');
                setCurrentPage(1);
              }}
              className={`w-full flex items-center justify-between p-1.5 rounded-lg text-xs transition cursor-pointer ${
                reasonFilter === 'pending_otp' ? 'bg-sky-100/80 dark:bg-sky-900/60 font-bold text-sky-900 dark:text-sky-100' : 'hover:bg-slate-50 dark:hover:bg-slate-800/70 text-ink-soft dark:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <i className="lni lni-envelope text-sky-600 text-xs" />
                <span>Pending Email OTP</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold font-numeric">{stats.byReason.pendingOtp.count}</span>
                <span className="text-[10px] text-ink-muted">({stats.byReason.pendingOtp.pct}%)</span>
              </div>
            </button>

            {/* Pending ID Upload */}
            <button
              onClick={() => {
                setReasonFilter(reasonFilter === 'pending_id_upload' ? 'all' : 'pending_id_upload');
                setCurrentPage(1);
              }}
              className={`w-full flex items-center justify-between p-1.5 rounded-lg text-xs transition cursor-pointer ${
                reasonFilter === 'pending_id_upload' ? 'bg-amber-100/80 dark:bg-amber-900/60 font-bold text-amber-900 dark:text-amber-100' : 'hover:bg-slate-50 dark:hover:bg-slate-800/70 text-ink-soft dark:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <i className="lni lni-empty-file text-amber-600 text-xs" />
                <span>Pending ID Upload</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold font-numeric">{stats.byReason.pendingIdUpload.count}</span>
                <span className="text-[10px] text-ink-muted">({stats.byReason.pendingIdUpload.pct}%)</span>
              </div>
            </button>

            {/* Awaiting Re-upload (if any) */}
            {stats.byReason.rejectedReupload.count > 0 && (
              <button
                onClick={() => {
                  setReasonFilter(reasonFilter === 'rejected_reupload' ? 'all' : 'rejected_reupload');
                  setCurrentPage(1);
                }}
                className={`w-full flex items-center justify-between p-1.5 rounded-lg text-xs transition cursor-pointer ${
                  reasonFilter === 'rejected_reupload' ? 'bg-rose-100/80 font-bold text-rose-900' : 'hover:bg-slate-50 text-ink-soft'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <i className="lni lni-reload text-rose-600 text-xs" />
                  <span>Awaiting Re-upload</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold font-numeric">{stats.byReason.rejectedReupload.count}</span>
                  <span className="text-[10px] text-ink-muted">({stats.byReason.rejectedReupload.pct}%)</span>
                </div>
              </button>
            )}
          </div>

          {/* Missing document sub-chips */}
          <div className="mt-2.5 pt-2 border-t border-ink-faint/30 flex flex-wrap gap-1 text-[10px]">
            <button
              type="button"
              onClick={() => {
                setReasonFilter('missing_front');
                setCurrentPage(1);
              }}
              className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-ink-soft dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer"
            >
              Front: {stats.byReason.pendingIdUpload.missingFront}
            </button>
            <button
              type="button"
              onClick={() => {
                setReasonFilter('missing_back');
                setCurrentPage(1);
              }}
              className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-ink-soft dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer"
            >
              Back: {stats.byReason.pendingIdUpload.missingBack}
            </button>
            <button
              type="button"
              onClick={() => {
                setReasonFilter('missing_selfie');
                setCurrentPage(1);
              }}
              className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-ink-soft dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer"
            >
              Selfie: {stats.byReason.pendingIdUpload.missingSelfie}
            </button>
            {stats.byReason.pendingIdUpload.missingPermit > 0 && (
              <button
                type="button"
                onClick={() => {
                  setReasonFilter('missing_permit');
                  setCurrentPage(1);
                }}
                className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-ink-soft dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer"
              >
                Permit: {stats.byReason.pendingIdUpload.missingPermit}
              </button>
            )}
          </div>
        </div>

        {/* Metric 3: Waiting Duration & Turnaround */}
        <div className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md rounded-2xl p-5 border border-white/60 dark:border-slate-700/60 shadow-glass flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Duration Telemetry
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center">
                <i className="lni lni-alarm-clock text-base" />
              </div>
            </div>
            <h4 className="text-xs font-semibold text-ink-muted">Waiting Duration</h4>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold font-numeric text-ink">
                {stats.durationMetrics.avgFormatted}
              </span>
              <span className="text-[11px] text-ink-muted font-medium">average waiting</span>
            </div>
            <div className="text-[11px] text-ink-muted mt-0.5 flex items-center gap-1">
              <span>Median:</span>
              <strong className="text-ink font-numeric font-semibold">{stats.durationMetrics.medianFormatted}</strong>
            </div>
          </div>

          {/* Aging Buckets Clickable Pills */}
          <div className="mt-3 pt-3 border-t border-ink-faint/30">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block mb-1.5">
              Aging Distribution:
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  setAgingFilter(agingFilter === '<12h' ? 'all' : '<12h');
                  setCurrentPage(1);
                }}
                className={`flex items-center justify-between px-2 py-1 rounded-md text-[11px] transition cursor-pointer border ${
                  agingFilter === '<12h'
                    ? 'bg-emerald-700 text-white border-emerald-700 font-bold'
                    : 'bg-emerald-50/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-200/80 dark:border-emerald-700/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/70'
                }`}
              >
                <span>&lt; 12h</span>
                <span className="font-numeric font-bold">{stats.byAging.under12h.count}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAgingFilter(agingFilter === '12-24h' ? 'all' : '12-24h');
                  setCurrentPage(1);
                }}
                className={`flex items-center justify-between px-2 py-1 rounded-md text-[11px] transition cursor-pointer border ${
                  agingFilter === '12-24h'
                    ? 'bg-sky-700 text-white border-sky-700 font-bold'
                    : 'bg-sky-50/80 dark:bg-sky-950/60 text-sky-800 dark:text-sky-200 border-sky-200/80 dark:border-sky-700/60 hover:bg-sky-100 dark:hover:bg-sky-900/70'
                }`}
              >
                <span>12–24h</span>
                <span className="font-numeric font-bold">{stats.byAging.h12to24.count}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAgingFilter(agingFilter === '24-48h' ? 'all' : '24-48h');
                  setCurrentPage(1);
                }}
                className={`flex items-center justify-between px-2 py-1 rounded-md text-[11px] transition cursor-pointer border ${
                  agingFilter === '24-48h'
                    ? 'bg-amber-700 text-white border-amber-700 font-bold'
                    : 'bg-amber-50/80 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border-amber-200/80 dark:border-amber-700/60 hover:bg-amber-100 dark:hover:bg-amber-900/70'
                }`}
              >
                <span>24–48h</span>
                <span className="font-numeric font-bold">{stats.byAging.h24to48.count}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAgingFilter(agingFilter === '>48h' ? 'all' : '>48h');
                  setCurrentPage(1);
                }}
                className={`flex items-center justify-between px-2 py-1 rounded-md text-[11px] transition cursor-pointer border ${
                  agingFilter === '>48h'
                    ? 'bg-rose-700 text-white border-rose-700 font-bold'
                    : 'bg-rose-50/80 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border-rose-200/80 dark:border-rose-700/60 hover:bg-rose-100 dark:hover:bg-rose-900/70'
                }`}
              >
                <span>&gt; 48h</span>
                <span className="font-numeric font-bold">{stats.byAging.over48h.count}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Metric 4: Longest Waiting & Stalled Attention */}
        <div className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md rounded-2xl p-5 border border-white/60 dark:border-slate-700/60 shadow-glass flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md border ${
                stats.byAging.over48h.count > 0
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-slate-50 text-slate-700 border-slate-200'
              }`}>
                {stats.byAging.over48h.count > 0 ? '⚠️ Priority Attention' : 'Queue Health'}
              </span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                stats.byAging.over48h.count > 0 ? 'bg-rose-500/10 text-rose-700' : 'bg-slate-500/10 text-slate-700'
              }`}>
                <i className="lni lni-flag text-base" />
              </div>
            </div>
            <h4 className="text-xs font-semibold text-ink-muted">Stalled Accounts (&gt;48h)</h4>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-3xl font-extrabold font-numeric ${stats.byAging.over48h.count > 0 ? 'text-rose-600' : 'text-ink'}`}>
                {stats.byAging.over48h.count}
              </span>
              <span className="text-xs text-ink-muted">
                {stats.byAging.over48h.count === 1 ? 'account stalled' : 'accounts stalled'}
              </span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-ink-faint/30">
            {stats.durationMetrics.longestWaiting ? (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block mb-1">
                  Longest Waiting Account:
                </span>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-ink-faint/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink truncate max-w-[130px]">
                      {stats.durationMetrics.longestWaiting.user.name}
                    </span>
                    <span className="text-[10px] font-bold font-numeric text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                      {stats.durationMetrics.longestWaiting.durationText}
                    </span>
                  </div>
                  <span className="text-[10px] text-ink-muted block truncate mt-0.5">
                    {stats.durationMetrics.longestWaiting.reasonLabel}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-ink-muted italic">No accounts currently waiting.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── FILTERABLE TABLE SECTION ───────────────────────────────────────── */}
      <div className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-glass overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-4 sm:p-5 border-b border-ink-faint/30 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-sm font-bold text-ink flex items-center gap-2">
                <span>Accounts Awaiting User Action</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-numeric font-bold bg-amber-100 text-amber-800">
                  {processedUsers.length} of {users.length}
                </span>
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">
                Users registered on SIKAP who need to complete email OTP verification, submit identification documents, or re-upload.
              </p>
            </div>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="self-start sm:self-auto px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition cursor-pointer flex items-center gap-1.5"
              >
                <i className="lni lni-close text-[10px]" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          {/* Interactive Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-2">
            {/* 1. Search Field */}
            <div className="relative">
              <i className="lni lni-search absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted dark:text-slate-400 text-sm" />
              <input
                type="text"
                aria-label="Search accounts by name, email, or ID"
                placeholder="Search name, email, ID..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/80 text-ink dark:text-slate-100 placeholder-ink-muted dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
              {searchTerm && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink dark:text-slate-400 dark:hover:text-slate-200 text-xs cursor-pointer p-1"
                >
                  <i className="lni lni-close text-xs" />
                </button>
              )}
            </div>

            {/* 2. Reason Filter */}
            <div>
              <select
                aria-label="Filter by reason"
                value={reasonFilter}
                onChange={(e) => {
                  setReasonFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/80 text-ink dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition cursor-pointer"
              >
                <option value="all">All Reasons ({users.length})</option>
                <option value="pending_otp">✉️ Pending Email OTP ({stats.byReason.pendingOtp.count})</option>
                <option value="pending_id_upload">🪪 Pending ID Upload ({stats.byReason.pendingIdUpload.count})</option>
                <option value="missing_front">-- Missing Front ID ({stats.byReason.pendingIdUpload.missingFront})</option>
                <option value="missing_back">-- Missing Back ID ({stats.byReason.pendingIdUpload.missingBack})</option>
                <option value="missing_selfie">-- Missing Selfie holding ID ({stats.byReason.pendingIdUpload.missingSelfie})</option>
                {stats.byReason.pendingIdUpload.missingPermit > 0 && (
                  <option value="missing_permit">-- Missing Business Permit ({stats.byReason.pendingIdUpload.missingPermit})</option>
                )}
                {stats.byReason.rejectedReupload.count > 0 && (
                  <option value="rejected_reupload">🔄 Awaiting Re-upload ({stats.byReason.rejectedReupload.count})</option>
                )}
              </select>
            </div>

            {/* 3. Role Filter */}
            <div>
              <select
                aria-label="Filter by role"
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/80 text-ink dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition cursor-pointer"
              >
                <option value="all">All Roles ({users.length})</option>
                <option value="worker">Workers ({stats.byRole.worker})</option>
                <option value="employer">Employers ({stats.byRole.employer})</option>
              </select>
            </div>

            {/* 4. Aging Filter */}
            <div>
              <select
                aria-label="Filter by waiting duration"
                value={agingFilter}
                onChange={(e) => {
                  setAgingFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/80 text-ink dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition cursor-pointer"
              >
                <option value="all">All Durations</option>
                <option value="<12h">&lt; 12 hours (Fresh: {stats.byAging.under12h.count})</option>
                <option value="12-24h">12 – 24 hours (Priority: {stats.byAging.h12to24.count})</option>
                <option value="24-48h">24 – 48 hours (Urgent: {stats.byAging.h24to48.count})</option>
                <option value=">48h">&gt; 48 hours (Stalled: {stats.byAging.over48h.count})</option>
              </select>
            </div>

            {/* 5. Sort By */}
            <div>
              <select
                aria-label="Sort accounts"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/80 text-ink dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition cursor-pointer"
              >
                <option value="duration_desc">Longest Waiting First</option>
                <option value="duration_asc">Shortest Waiting First</option>
                <option value="newest">Newest Account First</option>
                <option value="oldest">Oldest Account First</option>
                <option value="name_asc">Name (A–Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-slate-800/50 border-b border-ink-faint/30">
                <th className="px-4 py-3.5 font-body font-semibold text-ink-muted dark:text-slate-400 text-xs uppercase tracking-wider w-[10%]">
                  User ID
                </th>
                <th className="px-4 py-3.5 font-body font-semibold text-ink-muted dark:text-slate-400 text-xs uppercase tracking-wider w-[30%]">
                  User Details
                </th>
                <th className="px-4 py-3.5 font-body font-semibold text-ink-muted dark:text-slate-400 text-xs uppercase tracking-wider w-[12%]">
                  Role
                </th>
                <th className="px-4 py-3.5 font-body font-semibold text-ink-muted dark:text-slate-400 text-xs uppercase tracking-wider w-[23%]">
                  Required Action & Missing Items
                </th>
                <th className="px-4 py-3.5 font-body font-semibold text-ink-muted dark:text-slate-400 text-xs uppercase tracking-wider w-[15%]">
                  Waiting Since & Duration
                </th>
                <th className="px-4 py-3.5 font-body font-semibold text-ink-muted dark:text-slate-400 text-xs uppercase tracking-wider w-[9%] text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-faint/20">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-ink-muted">
                    <div className="max-w-sm mx-auto flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                        <i className="lni lni-inbox text-xl" />
                      </div>
                      <h4 className="text-sm font-bold text-ink dark:text-slate-100">No Accounts Found</h4>
                      <p className="text-xs text-ink-muted dark:text-slate-400 mt-1 leading-relaxed">
                        {hasActiveFilters
                          ? 'No waiting accounts match the applied filters and search criteria.'
                          : 'There are currently no accounts waiting for user actions.'}
                      </p>
                      {hasActiveFilters && (
                        <button
                          onClick={resetFilters}
                          className="mt-3 px-3.5 py-1.5 text-xs font-semibold text-ink dark:text-slate-200 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition cursor-pointer shadow-2xs"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedItems.map(({ user, startInfo, durInfo, reqInfo }) => {
                  const isWorker = user.role === 'worker';
                  const isEmployer = user.role === 'employer';
                  const hasBlacklist = user.blacklist_matches && user.blacklist_matches.length > 0;

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group"
                    >
                      {/* 1. User ID */}
                      <td className="px-4 py-3.5 align-top">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="font-numeric font-bold text-xs text-ink dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-ink-faint/30 dark:border-slate-700">
                            #{user.id}
                          </span>
                          {hasBlacklist && (
                            <span
                              title="Blacklist match detected"
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20"
                            >
                              <i className="lni lni-warning text-xs" />
                              <span>Blacklist Match</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. User Details */}
                      <td className="px-4 py-3.5 align-top">
                        <div className="flex items-start gap-3">
                          <Avatar
                            name={user.name}
                            url={user.avatar_url}
                            size="md"
                            className="shrink-0 mt-0.5"
                          />
                          <div className="min-w-0">
                            <span className="font-semibold text-sm text-ink dark:text-slate-100 block truncate group-hover:text-primary dark:group-hover:text-sky-400 transition">
                              {user.name}
                            </span>
                            <div className="flex items-center gap-1.5 text-xs text-ink-muted dark:text-slate-400 truncate mt-0.5">
                              <span className="truncate">{user.email}</span>
                              {user.email_verified_at ? (
                                <span title="Email Verified" className="text-emerald-600 dark:text-emerald-400 shrink-0">
                                  <i className="lni lni-checkmark-circle text-xs" />
                                </span>
                              ) : (
                                <span title="Email Unverified (Awaiting OTP)" className="text-slate-400 shrink-0">
                                  <i className="lni lni-envelope text-xs" />
                                </span>
                              )}
                            </div>
                            {user.phone && (
                              <div className="flex items-center gap-1 text-xs text-ink-muted dark:text-slate-400 mt-0.5">
                                <span>{user.phone}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyContact(user.id, user.phone)}
                                  className="text-ink-muted hover:text-ink dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                                  title="Copy phone number"
                                >
                                  <i
                                    className={`lni ${
                                      copiedId === user.id ? 'lni-checkmark text-emerald-600' : 'lni-clipboard'
                                    } text-xs`}
                                  />
                                </button>
                              </div>
                            )}
                            {(user.barangay || user.municipality) && (
                              <span className="text-xs text-ink-muted dark:text-slate-400 block mt-0.5">
                                {[user.barangay, user.municipality].filter(Boolean).join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 3. Role */}
                      <td className="px-4 py-3.5 align-top">
                        <span className="badge-neutral capitalize">
                          <i
                            className={`lni ${
                              isWorker ? 'lni-construction' : isEmployer ? 'lni-briefcase' : 'lni-user'
                            } text-xs text-slate-500 dark:text-slate-400`}
                          />
                          <span>{user.role || 'User'}</span>
                        </span>
                      </td>

                      {/* 4. Required Action & Missing Items */}
                      <td className="px-4 py-3.5 align-top">
                        <div className="flex flex-col gap-1.5 items-start">
                          {startInfo.reasonKey === 'pending_otp' ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink dark:text-slate-200">
                              <i className="lni lni-envelope text-xs text-slate-500 dark:text-slate-400" />
                              <span>Pending Email OTP Verification</span>
                            </span>
                          ) : startInfo.reasonKey === 'rejected_reupload' ? (
                            <div className="flex flex-col gap-1 items-start">
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-800 dark:text-rose-300">
                                <i className="lni lni-reload text-xs text-rose-600 dark:text-rose-400" />
                                <span>Awaiting Re-upload After Rejection</span>
                              </span>
                              {user.rejection_reason && (
                                <span className="text-xs text-rose-700 dark:text-rose-400 italic bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 max-w-xs truncate">
                                  "{user.rejection_reason}"
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink dark:text-slate-200">
                              <i className="lni lni-empty-file text-xs text-slate-500 dark:text-slate-400" />
                              <span>Pending Identification Upload</span>
                            </span>
                          )}

                          {/* Specific missing requirements calm secondary text */}
                          {reqInfo.missingItems.length > 0 && (
                            <p className="text-xs text-ink-muted dark:text-slate-400 mt-0.5">
                              <span className="font-medium text-ink-soft dark:text-slate-300">Missing:</span>{' '}
                              {reqInfo.missingItems.join(' · ')}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* 5. Waiting Since & Duration */}
                      <td className="px-4 py-3.5 align-top">
                        <div className="flex flex-col gap-1 items-start">
                          <div className="flex items-center gap-1.5 text-xs font-numeric font-medium text-ink dark:text-slate-200">
                            <i className="lni lni-timer text-xs text-slate-500 dark:text-slate-400" />
                            <span>Waiting: {durInfo.durationText}</span>
                            {durInfo.isStalled && (
                              <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-400 font-semibold ml-1">
                                · <i className="lni lni-warning text-xs" /> Stalled
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-ink-muted dark:text-slate-400">
                            <span className="block">
                              {startInfo.label}:{' '}
                              <strong className="text-ink-soft dark:text-slate-300 font-medium">
                                {startInfo.startTime
                                  ? new Date(startInfo.startTime).toLocaleDateString(undefined, {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                    })
                                  : 'N/A'}
                              </strong>
                            </span>
                            <span className="text-[11px] text-ink-muted/80 dark:text-slate-400/80 block">
                              Event: {startInfo.eventName}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 6. Action */}
                      <td className="px-4 py-3.5 align-top text-right">
                        <button
                          onClick={() => onInspectUser(user)}
                          className="btn-glass"
                        >
                          <span>Inspect</span>
                          <i className="lni lni-chevron-right text-[10px]" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination */}
        {processedUsers.length > 0 && (
          <div className="p-4 border-t border-ink-faint/30 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-ink-muted">
              <span>Showing</span>
              <span className="font-bold text-ink">
                {Math.min(processedUsers.length, (activePage - 1) * itemsPerPage + 1)}–
                {Math.min(processedUsers.length, activePage * itemsPerPage)}
              </span>
              <span>of</span>
              <span className="font-bold text-ink">{processedUsers.length}</span>
              <span>accounts</span>

              <span className="mx-2 text-ink-faint">|</span>

              <label className="flex items-center gap-1.5">
                <span>Per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-0.5 rounded border border-ink-faint/60 bg-white text-ink text-xs cursor-pointer"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </label>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={activePage === 1}
                className="px-2.5 py-1 rounded border border-ink-faint/60 bg-white text-ink disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition cursor-pointer"
              >
                Previous
              </button>
              <div className="px-3 py-1 text-xs font-bold font-numeric text-ink">
                {activePage} / {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={activePage === totalPages}
                className="px-2.5 py-1 rounded border border-ink-faint/60 bg-white text-ink disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
