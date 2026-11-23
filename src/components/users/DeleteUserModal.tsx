'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2 } from 'lucide-react';
import { User } from '@/types/models';

interface DeleteUserModalProps {
  user: User | null;
  onClose: () => void;
  onConfirm: (userId: number, reason: string) => Promise<void>;
  loading?: boolean;
}

const PRESET_REASONS = [
  'Violation of Terms & Community Guidelines',
  'Fraudulent identity or fake documents',
  'Duplicate or spam account',
  'Harassment or abusive behavior',
  'User requested deletion via support',
  'Other',
];

export default function DeleteUserModal({
  user,
  onClose,
  onConfirm,
  loading = false,
}: DeleteUserModalProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(PRESET_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
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
    const finalReason =
      selectedPreset === 'Other'
        ? customReason.trim()
        : customReason.trim()
        ? `${selectedPreset} - ${customReason.trim()}`
        : selectedPreset;

    if (!finalReason) {
      setError('Please specify a reason for deleting this user.');
      return;
    }
    setError('');
    await onConfirm(user.id, finalReason);
  };

  const modalContent = (
    <div
      className="fixed inset-0 bg-ink/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Delete User Modal"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-ink-faint/40 dark:border-slate-700/80 flex flex-col animate-in fade-in zoom-in-95 duration-200 my-auto">
        <div className="px-6 py-4 border-b border-ink-faint/40 dark:border-slate-800 flex justify-between items-center bg-rose-50/60 dark:bg-rose-950/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display text-lg text-ink dark:text-slate-100 font-bold">Delete User</h2>
              <p className="text-xs text-ink-muted dark:text-slate-400">Specify the administrative reason</p>
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
            <div className="text-xs text-ink-soft dark:text-slate-300">{user.email} &bull; ID #{user.id} ({user.role})</div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-ink-muted dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Reason Category <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(e.target.value)}
              disabled={loading}
              className="w-full h-9 px-3 rounded-xl border border-ink-faint/60 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-ink dark:text-slate-100 font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all cursor-pointer"
            >
              {PRESET_REASONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-ink-muted dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Additional Notes / Details {selectedPreset === 'Other' && <span className="text-rose-500">*</span>}
            </label>
            <textarea
              rows={3}
              value={customReason}
              onChange={(e) => {
                setCustomReason(e.target.value);
                if (error) setError('');
              }}
              disabled={loading}
              placeholder={selectedPreset === 'Other' ? 'Describe the specific reason for deletion...' : 'Optional notes for the audit registry...'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-ink-faint/60 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-ink dark:text-slate-100 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all resize-none placeholder:text-ink-muted/60"
            />
            {error && <p className="text-xs text-rose-600 mt-1 font-medium">{error}</p>}
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200/80 dark:border-amber-800/50 text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed">
            ⚠️ This will archive the account and record their identity in the Blacklist registry for future verification cross-checks.
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-9 px-4 rounded-xl border border-ink-faint/60 dark:border-slate-700 text-xs font-semibold text-ink-soft dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete User</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
