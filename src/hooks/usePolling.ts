import { useEffect, useRef } from 'react';

/**
 * usePolling — runs `fn` every `intervalMs` milliseconds.
 * Does NOT run immediately on mount (the component's initial useEffect handles that).
 * Automatically clears the interval on unmount.
 */
export function usePolling(fn: () => void, intervalMs: number, enabled = true) {
  const savedFn = useRef(fn);

  // Always keep ref up-to-date so stale closures are never invoked
  useEffect(() => {
    savedFn.current = fn;
  }, [fn]);

  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      savedFn.current();
    };

    const id = setInterval(tick, intervalMs);

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        savedFn.current();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      clearInterval(id);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [intervalMs, enabled]);
}
