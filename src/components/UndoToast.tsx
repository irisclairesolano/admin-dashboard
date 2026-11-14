'use client';

import React, { useEffect } from 'react';
import { Undo2, Check, CheckCircle2 } from 'lucide-react';
import { PendingUndoAction } from '@/hooks/useUndoToast';

interface UndoToastProps {
  action: PendingUndoAction | null;
  secondsRemaining: number;
  onUndo: () => void;
  onDismiss: () => void;
}

export function UndoToast({
  action,
  secondsRemaining,
  onUndo,
  onDismiss,
}: UndoToastProps) {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (action) {
      document.documentElement.style.setProperty('--undo-toast-offset', '5.5rem');
    } else {
      document.documentElement.style.removeProperty('--undo-toast-offset');
    }
    return () => {
      document.documentElement.style.removeProperty('--undo-toast-offset');
    };
  }, [action]);

  if (!action) return null;

  const totalDuration = action.timerSeconds ?? 5;
  const progressPercent = Math.max(0, Math.min(100, (secondsRemaining / totalDuration) * 100));

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-3 right-3 sm:left-auto sm:bottom-6 sm:right-6 sm:w-full sm:max-w-md z-50 bg-slate-900/88 dark:bg-slate-950/90 text-white rounded-2xl shadow-xl border border-white/15 overflow-hidden animate-slide-in backdrop-blur-md"
    >
      {/* Progress countdown bar */}
      <div className="h-1.5 w-full bg-white/15">
        <div
          className="h-full bg-sky-400 transition-all duration-100 ease-linear"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-body font-bold text-white break-words leading-snug">
              {action.message}
            </p>
            {action.subtext && (
              <p className="text-[11px] font-body text-slate-300 break-words leading-snug mt-0.5">
                {action.subtext}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onUndo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-body font-bold text-xs transition-all shadow-xs cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <Undo2 className="w-3.5 h-3.5 text-primary" />
            <span>Undo ({secondsRemaining}s)</span>
          </button>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Commit now"
            title="Commit now"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/20 font-body font-semibold text-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Commit</span>
          </button>
        </div>
      </div>
    </div>
  );
}
