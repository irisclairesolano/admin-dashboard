'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

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

  const fetchUnreadCount = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://sikap-backend.onrender.com/api/v1';
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

  useEffect(() => {
    // Initial fetch
    fetchUnreadCount();

    // Lightweight 20-second background polling
    timerRef.current = setInterval(fetchUnreadCount, 20000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [fetchUnreadCount]);

  const clearCount = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://sikap-backend.onrender.com/api/v1';
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
