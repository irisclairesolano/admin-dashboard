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

  const resetTimer = () => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
    setSecondsRemaining(Math.floor(warningMs / 1000));

    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    // Schedule warning before final timeout
    const warningDelay = Math.max(0, timeoutMs - warningMs);
    timerRef.current = setTimeout(() => {
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

    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    resetTimer();

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
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
