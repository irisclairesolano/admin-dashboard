'use client';

import React, { useState } from 'react';
import { XCircle } from 'lucide-react';

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  document_url?: string | null;
  document_back_url?: string | null;
  selfie_url?: string | null;
  business_documents?: string[];
  updated_at?: string;
  registration_status?: string;
}

export interface VerificationModalProps {
  user: User;
  onClose: () => void;
  onApprove?: (id: number) => void | Promise<void>;
  onReject?: (id: number, reason: string) => void | Promise<void>;
  onVerify?: (id: number, status: 'approved' | 'rejected', reason?: string) => void | Promise<void>;
  actionLoading?: 'approved' | 'rejected' | null;
}

export default function VerificationModal({
  user,
  onClose,
  onApprove,
  onReject,
  onVerify,
  actionLoading = null,
}: VerificationModalProps) {
  const [isRejecting, setIsRejecting] = useState(false);

  const handleApprove = () => {
    if (onApprove) {
      onApprove(user.id);
    }
    if (onVerify) {
      onVerify(user.id, 'approved');
    }
  };

  const handleRejectConfirm = () => {
    if (onReject) {
      onReject(user.id, "Generic Rejection");
    }
    if (onVerify) {
      onVerify(user.id, 'rejected', "Generic Rejection");
    }
  };

  return (
    <div className="fixed inset-0 bg-ink/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" data-testid="verification-modal">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-ink-faint flex justify-between items-center bg-paper-cream">
          <h2 className="font-display text-2xl text-ink">Review ID Document</h2>
          <button onClick={onClose} className="text-ink-muted hover:text-ink" aria-label="Close modal" data-testid="modal-close-btn">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="flex justify-between mb-6">
            <div>
              <h3 className="font-body-bold text-ink text-lg" data-testid="user-name">{user.name}</h3>
              <p className="text-ink-soft font-body" data-testid="user-email">{user.email}</p>
            </div>
            <div className="text-right">
              <span className="capitalize font-body-medium text-ink-muted bg-paper px-3 py-1 rounded-lg border border-ink-faint" data-testid="user-role">
                Role: {user.role}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Front ID */}
            <div>
              <span className="block font-body-semibold text-ink-soft text-sm mb-2">Government ID (Front)</span>
              <div className="bg-paper rounded-xl border border-ink-faint p-2 h-[260px] flex items-center justify-center bg-black/5 overflow-hidden">
                {user.document_url ? (
                  <img
                    src={user.document_url}
                    alt="ID Front"
                    data-testid="id-front-img"
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                ) : (
                  <p className="text-ink-muted text-sm font-body-medium" data-testid="no-id-front">No Front ID uploaded</p>
                )}
              </div>
            </div>

            {/* Back ID */}
            <div>
              <span className="block font-body-semibold text-ink-soft text-sm mb-2">Government ID (Back)</span>
              <div className="bg-paper rounded-xl border border-ink-faint p-2 h-[260px] flex items-center justify-center bg-black/5 overflow-hidden">
                {user.document_back_url ? (
                  <img
                    src={user.document_back_url}
                    alt="ID Back"
                    data-testid="id-back-img"
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                ) : (
                  <p className="text-ink-muted text-sm font-body-medium" data-testid="no-id-back">No Back ID uploaded</p>
                )}
              </div>
            </div>

            {/* Selfie ID */}
            <div>
              <span className="block font-body-semibold text-ink-soft text-sm mb-2">Selfie holding ID</span>
              <div className="bg-paper rounded-xl border border-ink-faint p-2 h-[260px] flex items-center justify-center bg-black/5 overflow-hidden">
                {user.selfie_url ? (
                  <img
                    src={user.selfie_url}
                    alt="Selfie holding ID"
                    data-testid="selfie-id-img"
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                ) : (
                  <p className="text-ink-muted text-sm font-body-medium" data-testid="no-selfie-id">
                    {user.role === 'employer' ? 'Selfie not required for employers' : 'No selfie uploaded'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        {isRejecting ? (
          <div className="p-6 border-t border-ink-faint bg-white bg-status-error/5" data-testid="rejection-section">
            <h4 className="font-body-bold text-status-error mb-2">Confirm Rejection</h4>
            <p className="text-sm text-ink-soft mb-4">
              Are you sure you want to reject this ID? The user will be notified with a standard generic rejection reason and prompted to re-upload.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsRejecting(false);
                }}
                data-testid="cancel-reject-btn"
                className="px-4 py-2 text-ink-soft font-body-medium hover:bg-paper rounded-xl"
              >
                Cancel
              </button>
              <button
                disabled={!!actionLoading}
                onClick={handleRejectConfirm}
                data-testid="confirm-reject-btn"
                className="px-6 py-2 bg-status-error text-white font-body-semibold rounded-xl hover:bg-status-error/90 transition-colors disabled:opacity-50 flex items-center"
              >
                {actionLoading === 'rejected' && (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                )}
                Confirm Rejection
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 border-t border-ink-faint bg-white flex justify-end space-x-4" data-testid="actions-section">
            <button
              disabled={!!actionLoading}
              onClick={() => setIsRejecting(true)}
              data-testid="reject-btn"
              className="px-6 py-3 border border-status-error text-status-error font-body-semibold rounded-xl hover:bg-status-error/10 transition-colors disabled:opacity-50 flex items-center"
            >
              Reject ID
            </button>
            <button
              disabled={!!actionLoading}
              onClick={handleApprove}
              data-testid="approve-btn"
              className="px-6 py-3 bg-status-success text-white font-body-semibold rounded-xl hover:bg-status-success/90 transition-colors disabled:opacity-50 flex items-center"
            >
              {actionLoading === 'approved' && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
              )}
              Approve & Verify
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
