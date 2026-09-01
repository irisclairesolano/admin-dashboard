'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { XCircle } from 'lucide-react';
import Tooltip from '@/components/Tooltip';

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
  const [rejectionReason, setRejectionReason] = useState('');
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

  // Focus trap
  const modalRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = modalRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    el.addEventListener('keydown', trap);
    return () => el.removeEventListener('keydown', trap);
  }, []);

  const handleApprove = () => {
    if (onVerify) {
      onVerify(user.id, 'approved');
    } else if (onApprove) {
      onApprove(user.id);
    }
  };

  const handleRejectConfirm = () => {
    const reason = rejectionReason.trim() || "Generic Rejection";
    if (onVerify) {
      onVerify(user.id, 'rejected', reason);
    } else if (onReject) {
      onReject(user.id, reason);
    }
  };

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="verification-title"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      }}
      className="fixed inset-0 bg-ink/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      data-testid="verification-modal"
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-ink-faint flex justify-between items-center bg-paper-cream">
          <h2 id="verification-title" className="font-display text-2xl text-ink">Review ID Document</h2>
          <button onClick={onClose} className="text-ink-muted hover:text-ink" aria-label="Close modal" data-testid="modal-close-btn">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="flex justify-between mb-6">
            <div>
              <h3 className="font-body font-bold text-ink text-lg" data-testid="user-name">{user.name}</h3>
              <p className="text-ink-soft font-body" data-testid="user-email">{user.email}</p>
            </div>
            <div className="text-right">
              <span className="capitalize font-body font-medium text-ink-muted bg-paper px-3 py-1 rounded-lg border border-ink-faint" data-testid="user-role">
                Role: {user.role}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Front ID */}
            <div>
              <span className="block font-body font-semibold text-ink-soft text-sm mb-2">Government ID (Front)</span>
              <div className="bg-paper rounded-xl border border-ink-faint p-2 h-[260px] flex items-center justify-center bg-black/5 overflow-hidden">
                {user.document_url ? (
                  <Image
                    src={user.document_url}
                    alt="ID Front"
                    width={400}
                    height={300}
                    unoptimized
                    data-testid="id-front-img"
                    onClick={() => setLightboxImage({ url: user.document_url!, title: 'Government ID (Front)' })}
                    className="max-w-full max-h-full object-contain rounded-lg cursor-pointer hover:scale-105 transition-all"
                  />
                ) : (
                  <p className="text-ink-muted text-sm font-body font-medium" data-testid="no-id-front">No Front ID uploaded</p>
                )}
              </div>
            </div>

            {/* Back ID */}
            <div>
              <span className="block font-body font-semibold text-ink-soft text-sm mb-2">Government ID (Back)</span>
              <div className="bg-paper rounded-xl border border-ink-faint p-2 h-[260px] flex items-center justify-center bg-black/5 overflow-hidden">
                {user.document_back_url ? (
                  <Image
                    src={user.document_back_url}
                    alt="ID Back"
                    width={400}
                    height={300}
                    unoptimized
                    data-testid="id-back-img"
                    onClick={() => setLightboxImage({ url: user.document_back_url!, title: 'Government ID (Back)' })}
                    className="max-w-full max-h-full object-contain rounded-lg cursor-pointer hover:scale-105 transition-all"
                  />
                ) : (
                  <p className="text-ink-muted text-sm font-body font-medium" data-testid="no-id-back">No Back ID uploaded</p>
                )}
              </div>
            </div>

            {/* Selfie ID */}
            <div>
              <span className="block font-body font-semibold text-ink-soft text-sm mb-2">Selfie holding ID</span>
              <div className="bg-paper rounded-xl border border-ink-faint p-2 h-[260px] flex items-center justify-center bg-black/5 overflow-hidden">
                {user.selfie_url ? (
                  <Image
                    src={user.selfie_url}
                    alt="Selfie holding ID"
                    width={400}
                    height={300}
                    unoptimized
                    data-testid="selfie-id-img"
                    onClick={() => setLightboxImage({ url: user.selfie_url!, title: 'Selfie holding ID' })}
                    className="max-w-full max-h-full object-contain rounded-lg cursor-pointer hover:scale-105 transition-all"
                  />
                ) : (
                  <p className="text-ink-muted text-sm font-body font-medium" data-testid="no-selfie-id">
                    {user.role === 'employer' ? 'Selfie not required for employers' : 'No selfie uploaded'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Business Documents for Employers */}
          {user.role === 'employer' && user.business_documents && user.business_documents.length > 0 && (
            <div className="mt-6 border-t border-ink-faint pt-6">
              <h4 className="font-body font-bold text-ink text-sm mb-3">Uploaded Business Documents</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {user.business_documents.map((docUrl, idx) => {
                  const isPdf = docUrl.toLowerCase().endsWith('.pdf') || docUrl.includes('.pdf?');
                  return (
                    <div key={idx} className="group relative">
                      <span className="block font-body font-semibold text-ink-soft text-xs mb-1.5">Document #{idx + 1}</span>
                      <div className="bg-paper rounded-xl border border-ink-faint p-2 h-[180px] flex items-center justify-center bg-black/5 overflow-hidden">
                        {isPdf ? (
                          <div className="flex flex-col items-center gap-2">
                            <i className="lni lni-files text-3xl text-primary" />
                            <a
                              href={docUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-primary font-bold hover:underline text-center px-2"
                            >
                              Open PDF Document
                            </a>
                          </div>
                        ) : (
                          <Image
                            src={docUrl}
                            alt={`Business Doc ${idx + 1}`}
                            width={400}
                            height={300}
                            unoptimized
                            onClick={() => setLightboxImage({ url: docUrl, title: `Business Document #${idx + 1}` })}
                            className="max-w-full max-h-full object-contain rounded-lg cursor-pointer hover:scale-105 transition-all"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        {isRejecting ? (
          <div className="p-6 border-t border-ink-faint bg-white bg-status-error/5" data-testid="rejection-section">
            <h4 className="font-body font-bold text-status-error mb-2">Confirm Rejection</h4>
            <p className="text-sm text-ink-soft mb-3">
              Please specify the reason for rejecting this ID. The user will be notified and prompted to re-upload.
            </p>
            <textarea
              autoFocus
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Front ID photo is blurry, Name does not match profile, ID is expired..."
              className="w-full p-3.5 bg-white border border-ink-faint rounded-xl focus:border-status-error/50 outline-none font-body text-sm mb-4 resize-none shadow-sm focus:shadow-md transition-all"
              rows={3}
              data-testid="rejection-reason-input"
              required
            />
            <div className="flex justify-end space-x-3">
              <Tooltip text="Go back without rejecting" position="top">
                <button
                  onClick={() => {
                    setIsRejecting(false);
                    setRejectionReason('');
                  }}
                  data-testid="cancel-reject-btn"
                  className="px-4 py-2 text-ink-soft font-body font-medium hover:bg-paper rounded-xl"
                >
                  Cancel
                </button>
              </Tooltip>
              <Tooltip text="Send rejection & notify user" position="top" variant="danger">
                <button
                  disabled={!rejectionReason.trim() || !!actionLoading}
                  onClick={handleRejectConfirm}
                  data-testid="confirm-reject-btn"
                  className="px-6 py-2 bg-status-error text-white font-body font-semibold rounded-xl hover:bg-status-error/90 transition-colors disabled:opacity-50 flex items-center"
                >
                  {actionLoading === 'rejected' && (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                  )}
                  Confirm Rejection
                </button>
              </Tooltip>
            </div>
          </div>
        ) : (
          <div className="p-6 border-t border-ink-faint bg-white flex justify-end space-x-4" data-testid="actions-section">
            <Tooltip text="Reject ID — user will be asked to re-upload" position="top" variant="danger">
              <button
                disabled={!!actionLoading}
                onClick={() => setIsRejecting(true)}
                data-testid="reject-btn"
                className="px-6 py-3 border border-status-error text-status-error font-body font-semibold rounded-xl hover:bg-status-error/10 transition-colors disabled:opacity-50 flex items-center"
              >
                Reject ID
              </button>
            </Tooltip>
            <Tooltip text="Approve — grants verification badge" position="top" variant="success">
              <button
                disabled={!!actionLoading}
                onClick={handleApprove}
                data-testid="approve-btn"
                className="px-6 py-3 bg-status-success text-white font-body font-semibold rounded-xl hover:bg-status-success/90 transition-colors disabled:opacity-50 flex items-center"
              >
                {actionLoading === 'approved' && (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                )}
                Approve & Verify
              </button>
            </Tooltip>
          </div>
        )}
      </div>

      {lightboxImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="lightbox-title"
          className="fixed inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center p-4 backdrop-blur-md animate-fade-in"
          onClick={() => setLightboxImage(null)}
        >
          {/* Header */}
          <div className="absolute top-4 left-0 right-0 px-6 flex justify-between items-center text-white z-10">
            <h4 id="lightbox-title" className="font-display text-lg font-bold tracking-wide">{lightboxImage.title}</h4>
            <button
              onClick={() => setLightboxImage(null)}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all flex items-center justify-center"
              aria-label="Close image viewer"
            >
              <XCircle className="w-8 h-8" />
            </button>
          </div>

          {/* Image Container */}
          <div className="w-full h-full max-w-5xl max-h-[80vh] flex items-center justify-center p-4">
            <Image
              src={lightboxImage.url}
              alt={lightboxImage.title}
              width={400}
              height={300}
              unoptimized
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl animate-scale-up"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image itself
            />
          </div>
          
          <p className="text-white/60 text-xs font-body mt-4">Click anywhere outside to close full screen view</p>
        </div>
      )}
    </div>
  );
}
