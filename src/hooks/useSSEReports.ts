'use client';

import { useEffect, useRef, useState } from 'react';

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
    connected: false,
  });
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
    const url = `${apiBase}/admin/reports/stream?token=${encodeURIComponent(token)}`;

    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener('report_alert', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setState({
          newReportCount: data.count ?? 0,
          latestReportId: data.last_report_id ?? null,
          latestReportAt: data.last_report_at ?? null,
          connected: true,
        });
      } catch {}
    });

    es.addEventListener('reconnect', () => {
      es.close();
      esRef.current = null;
      setState(prev => ({ ...prev, connected: false }));
      reconnectTimer.current = setTimeout(connect, 3000);
    });

    es.onerror = () => {
      es.close();
      esRef.current = null;
      setState(prev => ({ ...prev, connected: false }));
      reconnectTimer.current = setTimeout(connect, 10000);
    };

    es.onopen = () => {
      setState(prev => ({ ...prev, connected: true }));
    };
  };

  useEffect(() => {
    connect();
    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearCount = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      await fetch(`${apiBase}/admin/reports/stream/clear`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {}
    setState(prev => ({ ...prev, newReportCount: 0 }));
  };

  return { ...state, clearCount };
}
