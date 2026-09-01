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
    const id = setInterval(() => savedFn.current(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
}
