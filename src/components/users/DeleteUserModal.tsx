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
      className="fixed inset-0 bg-ink/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Delete User Modal"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-ink-faint flex justify-between items-center bg-rose-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-xl text-ink font-bold">Delete User</h2>
              <p className="text-xs text-ink-muted">Specify the administrative reason</p>
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
            <div className="text-xs text-ink-soft">{user.email} &bull; ID #{user.id} ({user.role})</div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1.5">
              Reason Category <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(e.target.value)}
              disabled={loading}
              className="w-full px-3.5 py-2.5 rounded-xl border border-ink-faint/80 bg-white text-xs text-ink font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
            >
              {PRESET_REASONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1.5">
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
              className="w-full px-3.5 py-2.5 rounded-xl border border-ink-faint/80 bg-white text-xs text-ink focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all resize-none placeholder:text-ink-muted/60"
            />
            {error && <p className="text-xs text-rose-600 mt-1 font-medium">{error}</p>}
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-[11px] text-amber-900 leading-relaxed">
            ⚠️ This will archive the account and record their identity in the Blacklist registry for future verification cross-checks.
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl border border-ink-faint/80 text-xs font-semibold text-ink-soft hover:bg-paper transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
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
