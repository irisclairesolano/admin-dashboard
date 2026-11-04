'use client';

/**
 * ============================================================================
 * FILE OVERVIEW: Real-Time Moderation Report Stream & Visibility-Aware Polling Hook
 * ============================================================================
 * (a) Purpose in the SIKAP Admin Dashboard:
 *     Provides the `useSSEReports` custom React hook (`src/hooks/useSSEReports.ts`)
 *     that powers real-time unread moderation report badge counters and toast
 *     notifications in the Admin Sidebar and Top Header.
 *
 * (b) Key Admin Features & RBAC/Performance Rules:
 *     - Authenticates every request with the admin's Bearer JWT from `authStorage`.
 *     - Implements visibility-aware background synchronization (20-second interval
 *       that automatically pauses when `document.visibilityState === 'hidden'` and
 *       immediately refreshes when the admin returns to the tab) to eliminate
 *       long-lived connection timeouts on serverless/Render deployments.
 *     - Exposes `clearCount()` to reset the unread stream counter both locally and
 *       on the backend when the admin opens the Moderation Reports queue.
 *
 * (c) Data Flow (Admin Layout / Sidebar <-> `useSSEReports` <-> Backend Report Stream API):
 *     - Queries `GET /api/v1/admin/reports/unread-count` for `{ count, last_report_id, last_report_at }`.
 *     - Acknowledges and clears unread notifications via `POST /api/v1/admin/reports/stream/clear`.
 * ============================================================================
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { authStorage } from '@/lib/authStorage';

// ── REAL-TIME REPORT NOTIFICATION STATE CONTRACT ─────────────────────────────
interface SSEReportState {
  newReportCount: number;
  latestReportId: number | null;
  latestReportAt: string | null;
  connected: boolean;
}

export function useSSEReports() {
  const [state, setState] = useState<SSEReportState>({
    newReportCount: 0,
    latestReportId: null,
    latestReportAt: null,
    connected: true,
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── AUTHENTICATED UNREAD REPORT COUNT FETCHER ──────────────────────────────
  const fetchUnreadCount = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const token = authStorage.getToken();
    if (!token) return;

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://sikap-backend-singapore.onrender.com/api/v1';
      const res = await fetch(`${apiBase}/admin/reports/unread-count`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (res.ok) {
        const data = await res.json();
        setState({
          newReportCount: data.count ?? 0,
          latestReportId: data.last_report_id ?? null,
          latestReportAt: data.last_report_at ?? null,
          connected: true,
        });
      }
    } catch {
      // Quiet fail on network hiccups without blocking UI
    }
  }, []);

  // ── VISIBILITY-AWARE POLLING LIFECYCLE (20S INTERVAL + TAB FOCUS WAKEUP) ───
  useEffect(() => {
    // Initial fetch
    fetchUnreadCount();

    // Lightweight 20-second background polling (pauses when tab is hidden)
    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      fetchUnreadCount();
    };

    timerRef.current = setInterval(tick, 20000);

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchUnreadCount();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [fetchUnreadCount]);

  // ── UNREAD STREAM ACKNOWLEDGMENT & BADGE RESET ─────────────────────────────
  const clearCount = async () => {
    try {
      const token = authStorage.getToken();
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://sikap-backend-singapore.onrender.com/api/v1';
      await fetch(`${apiBase}/admin/reports/stream/clear`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
    } catch {}
    setState(prev => ({ ...prev, newReportCount: 0 }));
  };

  return { ...state, clearCount };
}
