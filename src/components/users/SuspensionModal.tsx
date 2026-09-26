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
      className="fixed inset-0 bg-ink/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Suspend User Modal"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-ink-faint flex justify-between items-center bg-status-error/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-status-error/10 text-status-error flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-xl text-ink font-bold">Suspend User</h2>
              <p className="text-xs text-ink-muted">Set suspension duration and reason</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            aria-label="Close modal"
            className="p-2 hover:bg-paper rounded-full text-ink-muted hover:text-ink transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 font-body space-y-4">
          <div className="p-3.5 bg-paper rounded-2xl border border-ink-faint/60">
            <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block">Target User</span>
            <div className="font-semibold text-ink text-sm mt-0.5">{user.name}</div>
            <div className="text-xs text-ink-soft">{user.email} &bull; ID #{user.id}</div>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1.5">
              Suspension Duration <span className="text-status-error">*</span>
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              disabled={loading}
              className="w-full px-3.5 py-2.5 rounded-xl border border-ink-faint bg-paper-cream text-ink text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1.5">
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
              className="w-full px-3.5 py-2.5 rounded-xl border border-ink-faint bg-paper-cream text-ink text-sm placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
            />
            {error && <p className="text-xs text-status-error font-medium mt-1">{error}</p>}
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-ink-soft hover:text-ink rounded-xl border border-ink-faint hover:bg-paper transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-white bg-status-error hover:bg-status-error/90 rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
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
