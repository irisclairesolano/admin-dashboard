'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ShieldAlert } from 'lucide-react';
import { User } from '@/types/models';

interface SuspensionModalProps {
  user: User | null;
  onClose: () => void;
  onConfirm: (userId: number, duration: string, reason: string) => Promise<void>;
  loading?: boolean;
}

const DURATION_OPTIONS = [
  { value: '1_day', label: '1 Day' },
  { value: '3_days', label: '3 Days' },
  { value: '1_week', label: '1 Week' },
  { value: '2_weeks', label: '2 Weeks' },
  { value: '3_weeks', label: '3 Weeks' },
  { value: '1_month', label: '1 Month' },
  { value: '6_months', label: '6 Months' },
  { value: '1_year', label: '1 Year' },
  { value: 'forever', label: 'Permanent (Indefinite)' },
];

export default function SuspensionModal({
  user,
  onClose,
  onConfirm,
  loading = false,
}: SuspensionModalProps) {
  const [mounted, setMounted] = useState(false);
  const [duration, setDuration] = useState('1_week');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, loading]);

  if (!user || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a reason for the suspension.');
      return;
    }
    setError('');
    await onConfirm(user.id, duration, reason.trim());
  };

  const modalContent = (
    <div
      className="fixed inset-0 bg-ink/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Suspend User Modal"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-ink-faint/40 dark:border-slate-700/80 flex flex-col animate-in fade-in zoom-in-95 duration-200 my-auto">
        <div className="px-6 py-4 border-b border-ink-faint/40 dark:border-slate-800 flex justify-between items-center bg-status-error/5 dark:bg-rose-950/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-status-error/10 text-status-error flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display text-lg text-ink dark:text-slate-100 font-bold">Suspend User</h2>
              <p className="text-xs text-ink-muted dark:text-slate-400">Set suspension duration and reason</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            aria-label="Close modal"
            className="w-8 h-8 rounded-xl bg-slate-100/80 dark:bg-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-700 text-ink-muted hover:text-ink dark:text-slate-400 dark:hover:text-white flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 font-body space-y-4">
          <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/60 rounded-xl border border-ink-faint/50 dark:border-slate-700/80">
            <span className="text-[10px] font-bold text-ink-muted dark:text-slate-400 uppercase tracking-wider block">Target User</span>
            <div className="font-semibold text-ink dark:text-slate-100 text-sm mt-0.5">{user.name}</div>
            <div className="text-xs text-ink-soft dark:text-slate-300">{user.email} &bull; ID #{user.id}</div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-ink-muted dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Suspension Duration <span className="text-status-error">*</span>
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              disabled={loading}
              className="w-full h-9 px-3 rounded-xl border border-ink-faint/60 dark:border-slate-700 bg-white dark:bg-slate-800 text-ink dark:text-slate-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-ink-muted dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Reason for Suspension <span className="text-status-error">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              rows={3}
              placeholder="Provide a clear explanation for this suspension..."
              disabled={loading}
              className="w-full px-3.5 py-2.5 rounded-xl border border-ink-faint/60 dark:border-slate-700 bg-white dark:bg-slate-800 text-ink dark:text-slate-100 text-xs placeholder:text-ink-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
            />
            {error && <p className="text-xs text-status-error font-medium mt-1">{error}</p>}
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-9 px-4 text-xs font-semibold text-ink-soft dark:text-slate-300 hover:text-ink rounded-xl border border-ink-faint/60 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-9 px-4 text-xs font-semibold text-white bg-status-error hover:bg-status-error/90 rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {loading && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <span>Confirm Suspension</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
