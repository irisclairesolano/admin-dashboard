'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, PauseCircle, PlayCircle, AlertTriangle, ChevronDown, ChevronUp, Users, Briefcase } from 'lucide-react';

export type BulkJobActionType = 'delete' | 'suspend' | 'unsuspend';

interface BulkJobActionModalProps {
  isOpen: boolean;
  actionType: BulkJobActionType;
  selectedJobs: any[];
  onClose: () => void;
  onConfirm: (jobIds: number[], reason: string) => Promise<void>;
  loading?: boolean;
}

const PRESET_REASONS: Record<BulkJobActionType, string[]> = {
  delete: [
    'Violation of Community Guidelines / ToS',
    'Spam, Duplicate, or Test Posting',
    'Fraudulent or Deceptive Job Offer',
    'Employer Requested Removal',
    'Expired or Inactive Opportunity',
    'Other',
  ],
  suspend: [
    'Investigation of User Reports / Dispute',
    'Suspicious Compensation or Unverified Details',
    'Prohibited or Inappropriate Content',
    'Pending Employer Safety Review',
    'Other',
  ],
  unsuspend: [
    'Investigation cleared / Approved after review',
    'Employer resolved compliance requirements',
    'False report / Administrative correction',
    'Other',
  ],
};

export default function BulkJobActionModal({
  isOpen,
  actionType,
  selectedJobs,
  onClose,
  onConfirm,
  loading = false,
}: BulkJobActionModalProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(PRESET_REASONS[actionType][0]);
  const [customReason, setCustomReason] = useState('');
  const [confirmKeyword, setConfirmKeyword] = useState('');
  const [ackApplicants, setAckApplicants] = useState(false);
  const [showJobList, setShowJobList] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSelectedPreset(PRESET_REASONS[actionType][0]);
      setCustomReason('');
      setConfirmKeyword('');
      setAckApplicants(false);
      setShowJobList(false);
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

  // Derived stats
  const totalApplicants = useMemo(() => {
    return selectedJobs.reduce((sum, j) => sum + (Number(j.applications_count) || 0), 0);
  }, [selectedJobs]);

  const uniqueEmployers = useMemo(() => {
    const set = new Set<string>();
    selectedJobs.forEach((j) => {
      if (j.employer?.name) set.add(j.employer.name);
    });
    return set.size;
  }, [selectedJobs]);

  const hasInProgressOrHired = useMemo(() => {
    return selectedJobs.some(
      (j) => j.status === 'in_progress' || (j.filled_slots && j.filled_slots > 0) || (j.accepted_count && j.accepted_count > 0)
    );
  }, [selectedJobs]);

  const requiredKeyword = useMemo(() => {
    if (actionType === 'delete') return 'DELETE';
    if (actionType === 'suspend') return 'SUSPEND';
    return '';
  }, [actionType]);

  const isKeywordValid = useMemo(() => {
    if (!requiredKeyword) return true;
    return confirmKeyword.trim().toUpperCase() === requiredKeyword;
  }, [requiredKeyword, confirmKeyword]);

  const isFormValid = useMemo(() => {
    if (!isKeywordValid) return false;
    if (actionType === 'delete' && (totalApplicants > 0 || hasInProgressOrHired) && !ackApplicants) {
      return false;
    }
    return true;
  }, [isKeywordValid, actionType, totalApplicants, hasInProgressOrHired, ackApplicants]);

  if (!isOpen || !mounted || selectedJobs.length === 0) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

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
    const jobIds = selectedJobs.map((j) => j.id);
    await onConfirm(jobIds, finalReason);
  };

  const actionTitle =
    actionType === 'delete'
      ? 'Bulk Delete Job Postings'
      : actionType === 'suspend'
      ? 'Bulk Suspend Job Postings'
      : 'Bulk Unsuspend Job Postings';

  const actionColorClasses =
    actionType === 'delete'
      ? {
          bg: 'bg-rose-50/70',
          iconBg: 'bg-rose-100 text-rose-600',
          btn: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20',
          border: 'border-rose-200',
        }
      : actionType === 'suspend'
      ? {
          bg: 'bg-amber-50/70',
          iconBg: 'bg-amber-100 text-amber-600',
          btn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20',
          border: 'border-amber-200',
        }
      : {
          bg: 'bg-emerald-50/70',
          iconBg: 'bg-emerald-100 text-emerald-600',
          btn: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20',
          border: 'border-emerald-200',
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
        {/* Modal Header */}
        <div className={`p-5 border-b border-ink-faint flex justify-between items-center ${actionColorClasses.bg}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl ${actionColorClasses.iconBg} flex items-center justify-center flex-shrink-0 shadow-xs`}>
              {actionType === 'delete' ? (
                <Trash2 className="w-5 h-5" />
              ) : actionType === 'suspend' ? (
                <PauseCircle className="w-5 h-5" />
              ) : (
                <PlayCircle className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="font-display text-lg text-ink font-bold">{actionTitle}</h2>
              <p className="text-xs text-ink-muted">Strict administrative confirmation required</p>
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

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-5 font-body space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Impact Overview Stats Card */}
          <div className="p-4 bg-paper rounded-2xl border border-ink-faint/60 space-y-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-ink-muted uppercase tracking-wider">
              <span>Impact Summary</span>
              <span className="text-ink font-semibold">{selectedJobs.length} Selected</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 bg-white rounded-xl border border-ink-faint/40 shadow-2xs">
                <div className="flex items-center justify-center text-ink-muted mb-1">
                  <Briefcase className="w-3.5 h-3.5 mr-1" />
                </div>
                <div className="font-numeric font-bold text-ink text-sm">{selectedJobs.length}</div>
                <div className="text-[10px] text-ink-muted">Job Posts</div>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-ink-faint/40 shadow-2xs">
                <div className="flex items-center justify-center text-ink-muted mb-1">
                  <Users className="w-3.5 h-3.5 mr-1" />
                </div>
                <div className="font-numeric font-bold text-ink text-sm">{uniqueEmployers}</div>
                <div className="text-[10px] text-ink-muted">Employers</div>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-ink-faint/40 shadow-2xs">
                <div className="flex items-center justify-center text-ink-muted mb-1">
                  <AlertTriangle className={`w-3.5 h-3.5 mr-1 ${totalApplicants > 0 ? 'text-amber-500' : ''}`} />
                </div>
                <div className={`font-numeric font-bold text-sm ${totalApplicants > 0 ? 'text-amber-600' : 'text-ink'}`}>
                  {totalApplicants}
                </div>
                <div className="text-[10px] text-ink-muted">Applicants</div>
              </div>
            </div>

            {/* Warning Banner for Active Applicants or Ongoing Jobs */}
            {(totalApplicants > 0 || hasInProgressOrHired) && actionType !== 'unsuspend' && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-[11px]">Warning: Active Applications Affected</p>
                  <p className="text-[10px] leading-relaxed text-amber-800">
                    {actionType === 'delete'
                      ? `Deleting these postings will remove them from public view and cancel ${totalApplicants} active application(s).`
                      : `Suspending these postings will hide them from the worker feed while under administrative review.`}
                  </p>
                </div>
              </div>
            )}

            {/* Expandable Selected Jobs List */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowJobList((prev) => !prev)}
                className="w-full flex items-center justify-between text-[11px] font-semibold text-primary hover:text-primary-dark transition cursor-pointer py-1"
              >
                <span>{showJobList ? 'Hide affected jobs list' : `View all ${selectedJobs.length} affected jobs`}</span>
                {showJobList ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showJobList && (
                <div className="mt-2 max-h-40 overflow-y-auto space-y-1.5 pr-1 divide-y divide-ink-faint/30">
                  {selectedJobs.map((job) => (
                    <div key={job.id} className="pt-1.5 flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-ink truncate text-[11px]">{job.title}</div>
                        <div className="text-[10px] text-ink-muted truncate">
                          {job.employer?.name || 'Unknown Employer'} &bull; {job.municipality || 'Bulan'}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 text-[10px]">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-ink-soft font-numeric">
                          {job.applications_count ?? 0} apps
                        </span>
                        <span className="px-1.5 py-0.5 rounded uppercase font-bold text-[9px] bg-slate-200 text-slate-700">
                          {job.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Reason Category Selection */}
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
              {PRESET_REASONS[actionType].map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

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
                  ? 'Required: Explain why this administrative action is being applied...'
                  : 'Optional additional context recorded in the admin audit log...'
              }
              className="w-full px-3.5 py-2 rounded-xl border border-ink-faint/80 bg-white text-xs text-ink placeholder:text-ink-muted/50 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
            />
          </div>

          {/* Acknowledgment Checkbox (for deletions with active applicants) */}
          {actionType === 'delete' && (totalApplicants > 0 || hasInProgressOrHired) && (
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-ink-faint/60 cursor-pointer">
              <input
                type="checkbox"
                checked={ackApplicants}
                onChange={(e) => setAckApplicants(e.target.checked)}
                disabled={loading}
                className="mt-0.5 w-4 h-4 rounded border-ink-faint text-rose-600 focus:ring-rose-500/20 cursor-pointer"
              />
              <span className="text-[11px] text-ink font-medium leading-tight">
                I acknowledge that deleting these postings will cancel active worker applications and soft-delete the records to Archives.
              </span>
            </label>
          )}

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

          {/* Footer Actions */}
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
              disabled={loading || !isFormValid}
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
                    ? `Delete ${selectedJobs.length} ${selectedJobs.length === 1 ? 'Job' : 'Jobs'}`
                    : actionType === 'suspend'
                    ? `Suspend ${selectedJobs.length} ${selectedJobs.length === 1 ? 'Job' : 'Jobs'}`
                    : `Unsuspend ${selectedJobs.length} ${selectedJobs.length === 1 ? 'Job' : 'Jobs'}`}
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
