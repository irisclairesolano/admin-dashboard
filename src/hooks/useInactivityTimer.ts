'use client';

import { useEffect, useRef, useState } from 'react';

interface InactivityTimerOptions {
  timeoutMs?: number; // default 15 minutes = 900,000 ms
  warningMs?: number; // default 60 seconds warning = 60,000 ms
  onTimeout: () => void;
}

export function useInactivityTimer({
  timeoutMs = 15 * 60 * 1000,
  warningMs = 60 * 1000,
  onTimeout,
}: InactivityTimerOptions) {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(Math.floor(warningMs / 1000));
  
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimer = (skipStorage = false) => {
    const now = Date.now();
    lastActivityRef.current = now;
    if (!skipStorage && typeof window !== 'undefined') {
      try {
        localStorage.setItem('admin_last_activity', now.toString());
      } catch {}
    }
    setShowWarning(false);
    setSecondsRemaining(Math.floor(warningMs / 1000));

    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    // Schedule warning before final timeout
    const warningDelay = Math.max(0, timeoutMs - warningMs);
    timerRef.current = setTimeout(() => {
      // Re-check cross-tab last activity before opening warning
      if (typeof window !== 'undefined') {
        const storedLast = localStorage.getItem('admin_last_activity');
        if (storedLast) {
          const diff = Date.now() - parseInt(storedLast, 10);
          if (diff < timeoutMs - warningMs) {
            // User was active in another tab! Reschedule
            resetTimer(true);
            return;
          }
        }
      }

      setShowWarning(true);
      const startCount = Math.floor(warningMs / 1000);
      setSecondsRemaining(startCount);

      countdownIntervalRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            onTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, warningDelay);
  };

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    const handleActivity = () => {
      // Only reset if warning modal is not currently blocking or if user interacts
      if (!showWarning) {
        resetTimer();
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'admin_last_activity') {
        // User was active in another tab, reset timer locally
        resetTimer(true);
      }
    };

    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });
    window.addEventListener('storage', handleStorageChange);

    resetTimer();

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      window.removeEventListener('storage', handleStorageChange);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showWarning, timeoutMs, warningMs]);

  const stayLoggedIn = () => {
    resetTimer();
  };

  return {
    showWarning,
    secondsRemaining,
    stayLoggedIn,
  };
}
