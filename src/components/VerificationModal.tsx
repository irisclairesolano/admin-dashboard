'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { XCircle, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import Tooltip from '@/components/Tooltip';
import { adminApi } from '@/api/admin';

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  document_url?: string | null;
  document_front_url?: string | null;
  id_front_url?: string | null;
  document_back_url?: string | null;
  id_back_url?: string | null;
  selfie_url?: string | null;
  id_selfie_url?: string | null;
  business_documents?: string[] | string | null;
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
  const [currentUser, setCurrentUser] = useState<User>(user);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  // Sync state if user prop changes
  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  // If document_url is missing or potentially stale, fetch fresh details from API
  useEffect(() => {
    let isCancelled = false;
    const loadFreshUser = async () => {
      const frontDoc = user.document_url || user.document_front_url || user.id_front_url;
      if (!frontDoc && user.id) {
        try {
          setFetchingDetails(true);
          const res = await adminApi.getUserDetails(user.id);
          const freshUser = res.data?.user || res.data;
          if (!isCancelled && freshUser && freshUser.id === user.id) {
            setCurrentUser(freshUser);
          }
        } catch {
          // Keep current state if fetch fails
        } finally {
          if (!isCancelled) setFetchingDetails(false);
        }
      }
    };
    loadFreshUser();
    return () => {
      isCancelled = true;
    };
  }, [user.id, user.document_url, user.document_front_url, user.id_front_url]);

  const frontUrl = currentUser.document_url || currentUser.document_front_url || currentUser.id_front_url || null;
  const backUrl = currentUser.document_back_url || currentUser.id_back_url || null;
  const selfieUrl = currentUser.selfie_url || currentUser.id_selfie_url || null;

  const handleImageError = (key: string) => {
    setImageErrors(prev => ({ ...prev, [key]: true }));
  };

  const handleRetryImage = (key: string) => {
    setImageErrors(prev => ({ ...prev, [key]: false }));
  };

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

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

  const modalContent = (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="verification-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      }}
      className="fixed inset-0 bg-ink/60 z-[200] flex items-center justify-center p-3 sm:p-6 backdrop-blur-md overflow-y-auto"
      data-testid="verification-modal"
    >
      <div 
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto relative z-10 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-ink-faint flex justify-between items-center bg-paper-cream flex-shrink-0 sticky top-0 z-10">
          <h2 id="verification-title" className="font-display text-2xl text-ink">Review ID Document</h2>
          <button 
            onClick={onClose} 
            className="p-2 -mr-2 text-ink-muted hover:text-ink hover:bg-ink-faint/50 rounded-full transition-colors cursor-pointer flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary" 
            aria-label="Close modal" 
            data-testid="modal-close-btn"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-body font-bold text-ink text-lg" data-testid="user-name">{currentUser.name || user.name}</h3>
                {fetchingDetails && (
                  <span className="inline-flex items-center text-[10px] text-ink-muted bg-paper px-2 py-0.5 rounded-full animate-pulse border border-ink-faint">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin mr-1 text-primary" /> Updating details...
                  </span>
                )}
              </div>
              <p className="text-ink-soft font-body text-sm" data-testid="user-email">{currentUser.email || user.email}</p>
            </div>
            <div className="text-right">
              <span className="capitalize font-body font-medium text-ink-muted bg-paper px-3 py-1 rounded-lg border border-ink-faint" data-testid="user-role">
                Role: {currentUser.role || user.role}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Front ID */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-body font-semibold text-ink-soft text-sm">Government ID (Front)</span>
                {frontUrl && !imageErrors['front'] && (
                  <a
                    href={frontUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Open <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <div className="bg-paper rounded-xl border border-ink-faint p-2 h-[260px] flex items-center justify-center bg-black/5 overflow-hidden relative">
                {frontUrl ? (
                  imageErrors['front'] ? (
                    <div className="flex flex-col items-center justify-center text-center p-4">
                      <AlertCircle className="w-8 h-8 text-status-warning mb-2" />
                      <p className="text-xs font-semibold text-ink mb-1">Image preview failed</p>
                      <p className="text-[11px] text-ink-muted mb-3 max-w-[180px] truncate">{frontUrl}</p>
                      <div className="flex items-center gap-2">
                        <a
                          href={frontUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 text-xs bg-primary text-white rounded-lg font-medium inline-flex items-center gap-1 hover:bg-primary-dark transition-colors"
                        >
                          View Direct <ExternalLink className="w-3 h-3" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleRetryImage('front')}
                          className="p-1 text-ink-muted hover:text-ink rounded-lg border border-ink-faint hover:bg-white transition-colors"
                          title="Retry preview"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <Image
                      src={frontUrl}
                      alt="ID Front"
                      width={400}
                      height={300}
                      unoptimized
                      data-testid="id-front-img"
                      onError={() => handleImageError('front')}
                      onClick={() => setLightboxImage({ url: frontUrl, title: 'Government ID (Front)' })}
                      className="max-w-full max-h-full object-contain rounded-lg cursor-pointer hover:scale-105 transition-all"
                    />
                  )
                ) : (
                  <p className="text-ink-muted text-sm font-body font-medium" data-testid="no-id-front">No Front ID uploaded</p>
                )}
              </div>
            </div>

            {/* Back ID */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-body font-semibold text-ink-soft text-sm">Government ID (Back)</span>
                {backUrl && !imageErrors['back'] && (
                  <a
                    href={backUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Open <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <div className="bg-paper rounded-xl border border-ink-faint p-2 h-[260px] flex items-center justify-center bg-black/5 overflow-hidden relative">
                {backUrl ? (
                  imageErrors['back'] ? (
                    <div className="flex flex-col items-center justify-center text-center p-4">
                      <AlertCircle className="w-8 h-8 text-status-warning mb-2" />
                      <p className="text-xs font-semibold text-ink mb-1">Image preview failed</p>
                      <p className="text-[11px] text-ink-muted mb-3 max-w-[180px] truncate">{backUrl}</p>
                      <div className="flex items-center gap-2">
                        <a
                          href={backUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 text-xs bg-primary text-white rounded-lg font-medium inline-flex items-center gap-1 hover:bg-primary-dark transition-colors"
                        >
                          View Direct <ExternalLink className="w-3 h-3" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleRetryImage('back')}
                          className="p-1 text-ink-muted hover:text-ink rounded-lg border border-ink-faint hover:bg-white transition-colors"
                          title="Retry preview"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <Image
                      src={backUrl}
                      alt="ID Back"
                      width={400}
                      height={300}
                      unoptimized
                      data-testid="id-back-img"
                      onError={() => handleImageError('back')}
                      onClick={() => setLightboxImage({ url: backUrl, title: 'Government ID (Back)' })}
                      className="max-w-full max-h-full object-contain rounded-lg cursor-pointer hover:scale-105 transition-all"
                    />
                  )
                ) : (
                  <p className="text-ink-muted text-sm font-body font-medium" data-testid="no-id-back">No Back ID uploaded</p>
                )}
              </div>
            </div>

            {/* Selfie ID */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-body font-semibold text-ink-soft text-sm">Selfie holding ID</span>
                {selfieUrl && !imageErrors['selfie'] && (
                  <a
                    href={selfieUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Open <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <div className="bg-paper rounded-xl border border-ink-faint p-2 h-[260px] flex items-center justify-center bg-black/5 overflow-hidden relative">
                {selfieUrl ? (
                  imageErrors['selfie'] ? (
                    <div className="flex flex-col items-center justify-center text-center p-4">
                      <AlertCircle className="w-8 h-8 text-status-warning mb-2" />
                      <p className="text-xs font-semibold text-ink mb-1">Image preview failed</p>
                      <p className="text-[11px] text-ink-muted mb-3 max-w-[180px] truncate">{selfieUrl}</p>
                      <div className="flex items-center gap-2">
                        <a
                          href={selfieUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 text-xs bg-primary text-white rounded-lg font-medium inline-flex items-center gap-1 hover:bg-primary-dark transition-colors"
                        >
                          View Direct <ExternalLink className="w-3 h-3" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleRetryImage('selfie')}
                          className="p-1 text-ink-muted hover:text-ink rounded-lg border border-ink-faint hover:bg-white transition-colors"
                          title="Retry preview"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <Image
                      src={selfieUrl}
                      alt="Selfie holding ID"
                      width={400}
                      height={300}
                      unoptimized
                      data-testid="selfie-id-img"
                      onError={() => handleImageError('selfie')}
                      onClick={() => setLightboxImage({ url: selfieUrl, title: 'Selfie holding ID' })}
                      className="max-w-full max-h-full object-contain rounded-lg cursor-pointer hover:scale-105 transition-all"
                    />
                  )
                ) : (
                  <p className="text-ink-muted text-sm font-body font-medium" data-testid="no-selfie-id">
                    {(currentUser.role || user.role) === 'employer' ? 'Selfie not required for employers' : 'No selfie uploaded'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Business Documents for Employers */}
          {(currentUser.role || user.role) === 'employer' && (() => {
            const docsSource = currentUser.business_documents || user.business_documents;
            const docs: string[] = Array.isArray(docsSource)
              ? docsSource
              : typeof docsSource === 'string' && docsSource.trim()
              ? [docsSource]
              : [];

            return (
              <div className="mt-6 border-t border-ink-faint pt-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-body font-bold text-ink text-sm">Uploaded Business Documents</h4>
                  {docs.length > 0 && (
                    <span className="text-xs text-ink-muted font-body">
                      {docs.length} document{docs.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {docs.length === 0 ? (
                  <div className="bg-paper p-4 rounded-xl border border-ink-faint text-sm text-ink-muted flex items-center gap-2">
                    <p className="text-xs text-ink-muted">No business documents uploaded yet by this employer.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {docs.map((docUrl, idx) => {
                      const isPdf = typeof docUrl === 'string' && (docUrl.toLowerCase().endsWith('.pdf') || docUrl.includes('.pdf?'));
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
                                  className="text-xs text-primary font-bold hover:underline text-center px-2 inline-flex items-center gap-1"
                                >
                                  <span>Open PDF Document</span>
                                  <i className="lni lni-arrow-right text-[10px]" />
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
                )}
              </div>
            );
          })()}
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
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
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
                  className="px-6 py-2 bg-status-error text-white font-body font-semibold rounded-xl hover:bg-status-error/90 transition-colors disabled:opacity-50 flex items-center justify-center"
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
          <div className="p-4 sm:p-6 border-t border-ink-faint bg-white flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-4" data-testid="actions-section">
            <Tooltip text="Reject ID — user will be asked to re-upload" position="top" variant="danger">
              <button
                disabled={!!actionLoading}
                onClick={() => setIsRejecting(true)}
                data-testid="reject-btn"
                className="px-6 py-3 border border-status-error text-status-error font-body font-semibold rounded-xl hover:bg-status-error/10 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                Reject ID
              </button>
            </Tooltip>
            <Tooltip text="Approve — grants verification badge" position="top" variant="success">
              <button
                disabled={!!actionLoading}
                onClick={handleApprove}
                data-testid="approve-btn"
                className="px-6 py-3 bg-status-success text-white font-body font-semibold rounded-xl hover:bg-status-success/90 transition-colors disabled:opacity-50 flex items-center justify-center"
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
          className="fixed inset-0 bg-black/90 z-[250] flex flex-col items-center justify-center p-4 backdrop-blur-md animate-fade-in"
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

  if (!mounted) {
    return null;
  }

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
