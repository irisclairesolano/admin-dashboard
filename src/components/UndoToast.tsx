'use client';

import React from 'react';
import { Undo2, X, CheckCircle2 } from 'lucide-react';
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
  if (!action) return null;

  const totalDuration = action.timerSeconds ?? 5;
  const progressPercent = Math.max(0, Math.min(100, (secondsRemaining / totalDuration) * 100));

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 max-w-md w-full bg-ink text-white rounded-2xl shadow-2xl border border-white/20 overflow-hidden animate-slide-in backdrop-blur-md"
      style={{ boxShadow: '0 12px 36px rgba(0, 0, 0, 0.35)' }}
    >
      {/* Progress countdown bar */}
      <div className="h-1 w-full bg-white/20">
        <div
          className="h-full bg-primary transition-all duration-100 ease-linear"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-primary/20 text-primary border border-primary/30 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-body font-bold text-white truncate">
              {action.message}
            </p>
            {action.subtext && (
              <p className="text-[11px] font-body text-white/70 truncate mt-0.5">
                {action.subtext}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onUndo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-ink hover:bg-paper font-body font-bold text-xs transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Undo2 className="w-3.5 h-3.5 text-primary" />
            <span>Undo ({secondsRemaining}s)</span>
          </button>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Commit now"
            title="Commit now"
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
