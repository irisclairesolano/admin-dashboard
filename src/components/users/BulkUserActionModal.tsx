'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, UserX, UserCheck, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react';
import { User } from '@/types/models';

export type BulkUserActionType = 'delete' | 'suspend' | 'unsuspend';

interface BulkUserActionModalProps {
  isOpen: boolean;
  actionType: BulkUserActionType;
  selectedUsers: User[];
  onClose: () => void;
  onConfirm: (userIds: number[], reason: string, duration?: string) => Promise<void>;
  loading?: boolean;
}

const PRESET_USER_REASONS: Record<BulkUserActionType, string[]> = {
  delete: [
    'Violation of Terms & Community Guidelines',
    'Fraudulent identity or fake documents',
    'Duplicate or spam accounts',
    'Harassment or abusive behavior',
    'User requested deletion via support',
    'Other',
  ],
  suspend: [
    'Investigation of multiple user reports',
    'Suspected fraudulent activity or scam',
    'Inappropriate messages or profanity violations',
    'Temporary safety precaution pending review',
    'Other',
  ],
  unsuspend: [
    'Investigation completed / Cleared of violation',
    'User submitted required verification documents',
    'Administrative appeal granted',
    'Other',
  ],
};

const SUSPENSION_DURATIONS = [
  { label: 'Indefinite / Until resolved', value: 'indefinite' },
  { label: '24 Hours', value: '24h' },
  { label: '3 Days', value: '3d' },
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
];

export default function BulkUserActionModal({
  isOpen,
  actionType,
  selectedUsers,
  onClose,
  onConfirm,
  loading = false,
}: BulkUserActionModalProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(PRESET_USER_REASONS[actionType][0]);
  const [customReason, setCustomReason] = useState('');
  const [duration, setDuration] = useState('indefinite');
  const [confirmKeyword, setConfirmKeyword] = useState('');
  const [showUserList, setShowUserList] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSelectedPreset(PRESET_USER_REASONS[actionType][0]);
      setCustomReason('');
      setDuration('indefinite');
      setConfirmKeyword('');
      setShowUserList(false);
      setError('');
    }
  }, [isOpen, actionType]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose, loading]);

  const verifiedCount = useMemo(() => {
    return selectedUsers.filter((u) => u.verification_status === 'approved').length;
  }, [selectedUsers]);

  const workerCount = useMemo(() => {
    return selectedUsers.filter((u) => u.role === 'worker').length;
  }, [selectedUsers]);

  const employerCount = useMemo(() => {
    return selectedUsers.filter((u) => u.role === 'employer').length;
  }, [selectedUsers]);

  const requiredKeyword = useMemo(() => {
    if (actionType === 'delete') return 'DELETE';
    if (actionType === 'suspend') return 'SUSPEND';
    return '';
  }, [actionType]);

  const isKeywordValid = useMemo(() => {
    if (!requiredKeyword) return true;
    return confirmKeyword.trim().toUpperCase() === requiredKeyword;
  }, [requiredKeyword, confirmKeyword]);

  if (!isOpen || !mounted || selectedUsers.length === 0) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isKeywordValid) return;

    const finalReason =
      selectedPreset === 'Other'
        ? customReason.trim()
        : customReason.trim()
        ? `${selectedPreset} - ${customReason.trim()}`
        : selectedPreset;

    if (!finalReason) {
      setError('Please specify a reason for this bulk action.');
      return;
    }

    setError('');
    const userIds = selectedUsers.map((u) => u.id);
    await onConfirm(userIds, finalReason, actionType === 'suspend' ? duration : undefined);
  };

  const actionTitle =
    actionType === 'delete'
      ? 'Bulk Delete Users'
      : actionType === 'suspend'
      ? 'Bulk Suspend Users'
      : 'Bulk Unsuspend Users';

  const actionColorClasses =
    actionType === 'delete'
      ? {
          bg: 'bg-rose-50/70',
          iconBg: 'bg-rose-100 text-rose-600',
          btn: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20',
        }
      : actionType === 'suspend'
      ? {
          bg: 'bg-amber-50/70',
          iconBg: 'bg-amber-100 text-amber-600',
          btn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20',
        }
      : {
          bg: 'bg-emerald-50/70',
          iconBg: 'bg-emerald-100 text-emerald-600',
          btn: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20',
        };

  const modalContent = (
    <div
      className="fixed inset-0 bg-ink/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={actionTitle}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className={`p-5 border-b border-ink-faint flex justify-between items-center ${actionColorClasses.bg}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl ${actionColorClasses.iconBg} flex items-center justify-center flex-shrink-0 shadow-xs`}>
              {actionType === 'delete' ? (
                <Trash2 className="w-5 h-5" />
              ) : actionType === 'suspend' ? (
                <UserX className="w-5 h-5" />
              ) : (
                <UserCheck className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="font-display text-lg text-ink font-bold">{actionTitle}</h2>
              <p className="text-xs text-ink-muted">Administrative bulk moderation safeguard</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            aria-label="Close modal"
            className="p-2 hover:bg-paper rounded-full text-ink-muted hover:text-ink transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 font-body space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Summary Box */}
          <div className="p-4 bg-paper rounded-2xl border border-ink-faint/60 space-y-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-ink-muted uppercase tracking-wider">
              <span>Selected Users Breakdown</span>
              <span className="text-ink font-semibold">{selectedUsers.length} Users</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 bg-white rounded-xl border border-ink-faint/40 shadow-2xs">
                <div className="text-[10px] text-ink-muted mb-0.5">Workers</div>
                <div className="font-numeric font-bold text-ink text-sm">{workerCount}</div>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-ink-faint/40 shadow-2xs">
                <div className="text-[10px] text-ink-muted mb-0.5">Employers</div>
                <div className="font-numeric font-bold text-ink text-sm">{employerCount}</div>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-ink-faint/40 shadow-2xs">
                <div className="text-[10px] text-ink-muted mb-0.5">Verified</div>
                <div className="font-numeric font-bold text-emerald-600 text-sm">{verifiedCount}</div>
              </div>
            </div>

            {/* Warning regarding account deletion & blacklist */}
            {actionType === 'delete' && (
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-900 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-[11px]">Identity & Blacklist Impact</p>
                  <p className="text-[10px] leading-relaxed text-rose-800">
                    Deleting accounts will log their identity into the restriction registry to prevent immediate re-registration with the same credentials.
                  </p>
                </div>
              </div>
            )}

            {/* Expandable Users List */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowUserList((prev) => !prev)}
                className="w-full flex items-center justify-between text-[11px] font-semibold text-primary hover:text-primary-dark transition cursor-pointer py-1"
              >
                <span>{showUserList ? 'Hide user list' : `View all ${selectedUsers.length} selected users`}</span>
                {showUserList ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showUserList && (
                <div className="mt-2 max-h-40 overflow-y-auto space-y-1.5 pr-1 divide-y divide-ink-faint/30">
                  {selectedUsers.map((u) => (
                    <div key={u.id} className="pt-1.5 flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-ink truncate text-[11px]">{u.name}</div>
                        <div className="text-[10px] text-ink-muted truncate">
                          {u.email} &bull; ID #{u.id}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 text-[10px]">
                        <span className="px-1.5 py-0.5 rounded capitalize bg-slate-100 text-ink-soft">
                          {u.role}
                        </span>
                        {u.verification_status === 'approved' && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold">
                            Verified
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Reason Selection */}
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1.5">
              Reason Category <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(e.target.value)}
              disabled={loading}
              className="w-full px-3.5 py-2.5 rounded-xl border border-ink-faint/80 bg-white text-xs text-ink font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            >
              {PRESET_USER_REASONS[actionType].map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Suspension Duration (if suspend) */}
          {actionType === 'suspend' && (
            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1.5">
                Suspension Duration
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                disabled={loading}
                className="w-full px-3.5 py-2.5 rounded-xl border border-ink-faint/80 bg-white text-xs text-ink font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              >
                {SUSPENSION_DURATIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Custom Notes */}
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1.5">
              Administrative Notes / Details {selectedPreset === 'Other' && <span className="text-rose-500">*</span>}
            </label>
            <textarea
              rows={2}
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              disabled={loading}
              placeholder={
                selectedPreset === 'Other'
                  ? 'Required: Explain why this action is being applied...'
                  : 'Optional additional context for the audit log...'
              }
              className="w-full px-3.5 py-2 rounded-xl border border-ink-faint/80 bg-white text-xs text-ink placeholder:text-ink-muted/50 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
            />
          </div>

          {/* Strict Type-to-Confirm Safeguard */}
          {requiredKeyword && (
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-ink-faint/70 space-y-2">
              <label className="block text-[11px] font-bold text-ink">
                Type <span className="font-mono text-rose-600 font-extrabold select-all">{requiredKeyword}</span> to confirm this action:
              </label>
              <input
                type="text"
                value={confirmKeyword}
                onChange={(e) => setConfirmKeyword(e.target.value)}
                disabled={loading}
                placeholder={`Type ${requiredKeyword} in capital letters`}
                className="w-full px-3.5 py-2 rounded-xl border border-ink-faint/80 bg-white text-xs font-mono uppercase tracking-wider text-ink focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
              />
            </div>
          )}

          {error && <div className="text-xs text-status-error font-semibold bg-rose-50 p-2.5 rounded-xl">{error}</div>}

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-ink-faint/40">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-ink-muted hover:text-ink hover:bg-paper rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !isKeywordValid}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${actionColorClasses.btn}`}
            >
              {loading ? (
                <>
                  <i className="lni lni-spinner animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>
                  {actionType === 'delete'
                    ? `Delete ${selectedUsers.length} ${selectedUsers.length === 1 ? 'User' : 'Users'}`
                    : actionType === 'suspend'
                    ? `Suspend ${selectedUsers.length} ${selectedUsers.length === 1 ? 'User' : 'Users'}`
                    : `Unsuspend ${selectedUsers.length} ${selectedUsers.length === 1 ? 'User' : 'Users'}`}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
