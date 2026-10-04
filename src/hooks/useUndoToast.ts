'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export interface PendingUndoAction {
  id: string;
  message: string;
  subtext?: string;
  timerSeconds?: number;
  onCommit: () => Promise<void> | void;
  onUndo: () => void;
}

export function useUndoToast() {
  const [activeAction, setActiveAction] = useState<PendingUndoAction | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(5);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const actionRef = useRef<PendingUndoAction | null>(null);

  actionRef.current = activeAction;

  const clearExistingTimers = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timerRef.current = null;
    intervalRef.current = null;
  };

  const scheduleUndoAction = useCallback((action: PendingUndoAction) => {
    // If there is already an uncommitted action, commit it now before scheduling the next
    if (actionRef.current) {
      clearExistingTimers();
      actionRef.current.onCommit();
    }

    const duration = action.timerSeconds ?? 5;
    setActiveAction(action);
    setSecondsRemaining(duration);

    const startTime = Date.now();
    const endTime = startTime + duration * 1000;

    intervalRef.current = setInterval(() => {
      const remainingMs = Math.max(0, endTime - Date.now());
      const remainingSec = Math.ceil(remainingMs / 1000);
      setSecondsRemaining(remainingSec);
      if (remainingMs <= 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }, 100);

    timerRef.current = setTimeout(async () => {
      clearExistingTimers();
      setActiveAction(null);
      try {
        await action.onCommit();
      } catch (err) {
        console.error('Failed to commit action:', err);
        action.onUndo();
      }
    }, duration * 1000);
  }, []);

  const handleUndo = useCallback(() => {
    if (!actionRef.current) return;
    const { onUndo } = actionRef.current;
    clearExistingTimers();
    setActiveAction(null);
    onUndo();
  }, []);

  const handleDismissNow = useCallback(async () => {
    if (!actionRef.current) return;
    const { onCommit, onUndo } = actionRef.current;
    clearExistingTimers();
    setActiveAction(null);
    try {
      await onCommit();
    } catch (err) {
      console.error('Failed to commit action:', err);
      onUndo();
    }
  }, []);

  useEffect(() => {
    return () => {
      if (actionRef.current) {
        clearExistingTimers();
        actionRef.current.onCommit();
      }
    };
  }, []);

  return {
    activeAction,
    secondsRemaining,
    scheduleUndoAction,
    handleUndo,
    handleDismissNow,
  };
}
