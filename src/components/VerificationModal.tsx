'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { XCircle, ExternalLink, RefreshCw, AlertCircle, ZoomIn, ZoomOut, RotateCw, Download, FileText } from 'lucide-react';
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
  const [lightboxDoc, setLightboxDoc] = useState<{ url: string; title: string; isPdf?: boolean } | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [mounted, setMounted] = useState(false);

  const handleOpenLightbox = (url: string, title: string, isPdf = false) => {
    setZoom(1);
    setRotation(0);
    setLightboxDoc({ url, title, isPdf });
  };

  const handleCloseLightbox = () => {
    setLightboxDoc(null);
    setZoom(1);
    setRotation(0);
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(Number((prev + 0.5).toFixed(1)), 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(Number((prev - 0.5).toFixed(1)), 1));
  const handleZoomReset = () => {
    setZoom(1);
    setRotation(0);
  };
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  // Sync state if user prop changes
  useEffect(() => {
    setCurrentUser(user);
    setImageErrors({});
  }, [user]);

  // If document_url is missing or is an unsigned public URL on a private bucket, fetch fresh signed details from API
  useEffect(() => {
    let isCancelled = false;
    const loadFreshUser = async () => {
      const frontDoc = user.document_url || user.document_front_url || user.id_front_url;
      const needsFreshDetails =
        !frontDoc ||
        (typeof frontDoc === 'string' &&
          frontDoc.includes('/government-ids/') &&
          !frontDoc.includes('token='));

      if (needsFreshDetails && user.id) {
        try {
          setFetchingDetails(true);
          const res = await adminApi.getUserDetails(user.id);
          const freshUser = res.data?.user || res.data;
          if (!isCancelled && freshUser && freshUser.id === user.id) {
            setCurrentUser(freshUser);
            setImageErrors({});
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

  const handleRetryImage = async (key: string) => {
    setImageErrors(prev => ({ ...prev, [key]: false }));
    if (currentUser?.id) {
      try {
        setFetchingDetails(true);
        const res = await adminApi.getUserDetails(currentUser.id);
        const freshUser = res.data?.user || res.data;
        if (freshUser && freshUser.id === currentUser.id) {
          setCurrentUser(freshUser);
          setImageErrors({});
        }
      } catch {
        // Keep current state
      } finally {
        setFetchingDetails(false);
      }
    }
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

          {/* ADAPTIVE VERIFICATION LAYOUTS */}
          {(() => {
            const isEmployer = (currentUser.role || user.role) === 'employer';
            const docsSource = currentUser.business_documents || user.business_documents;
            const businessDocs: string[] = Array.isArray(docsSource)
              ? docsSource
              : typeof docsSource === 'string' && docsSource.trim()
              ? [docsSource]
              : [];
            const hasPersonalId = Boolean(frontUrl || backUrl);
            const hasBusinessDocs = businessDocs.length > 0;

            // 1. WORKER LAYOUT: 3-column personal ID (Front, Back, Selfie)
            if (!isEmployer) {
              return (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-body font-bold text-ink text-sm flex items-center gap-1.5">
                      <i className="lni lni-user text-primary" />
                      Personal Identification Documents
                    </h4>
                    <span className="text-xs text-ink-muted font-body">Government ID & Selfie</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-2">
                    {/* Front ID */}
                    <div>
                      <div className="flex items-center justify-between mb-2 h-6">
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
                              onClick={() => handleOpenLightbox(frontUrl, 'Government ID (Front)', false)}
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
                      <div className="flex items-center justify-between mb-2 h-6">
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
                              onClick={() => handleOpenLightbox(backUrl, 'Government ID (Back)', false)}
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
                      <div className="flex items-center justify-between mb-2 h-6">
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
                              onClick={() => handleOpenLightbox(selfieUrl, 'Selfie holding ID', false)}
                              className="max-w-full max-h-full object-contain rounded-lg cursor-pointer hover:scale-105 transition-all"
                            />
                          )
                        ) : (
                          <p className="text-ink-muted text-sm font-body font-medium" data-testid="no-selfie-id">No selfie uploaded</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // 2. EMPLOYER LAYOUT: Purpose-fit sections for Representative ID + Business Documents
            return (
              <div className="space-y-6">
                {/* Employer Section 1: Representative ID (2-column, no selfie placeholder) */}
                {hasPersonalId ? (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-body font-bold text-ink text-sm flex items-center gap-1.5">
                        <i className="lni lni-user text-primary" />
                        Representative Government ID
                      </h4>
                      <span className="text-xs text-ink-muted font-body">Authorized Representative</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Front ID */}
                      <div>
                        <div className="flex items-center justify-between mb-2 h-6">
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
                        <div className="bg-paper rounded-xl border border-ink-faint p-2 h-[220px] flex items-center justify-center bg-black/5 overflow-hidden relative">
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
                                onClick={() => handleOpenLightbox(frontUrl, 'Government ID (Front)', false)}
                                className="max-w-full max-h-full object-contain rounded-lg cursor-pointer hover:scale-105 transition-all"
                              />
                            )
                          ) : (
                            <p className="text-ink-muted text-sm font-body font-medium">No Front ID uploaded</p>
                          )}
                        </div>
                      </div>

                      {/* Back ID */}
                      <div>
                        <div className="flex items-center justify-between mb-2 h-6">
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
                        <div className="bg-paper rounded-xl border border-ink-faint p-2 h-[220px] flex items-center justify-center bg-black/5 overflow-hidden relative">
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
                                onClick={() => handleOpenLightbox(backUrl, 'Government ID (Back)', false)}
                                className="max-w-full max-h-full object-contain rounded-lg cursor-pointer hover:scale-105 transition-all"
                              />
                            )
                          ) : (
                            <p className="text-ink-muted text-sm font-body font-medium">No Back ID uploaded</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-paper/70 p-3 rounded-xl border border-ink-faint/60 text-xs text-ink-muted flex items-center gap-2">
                    <i className="lni lni-information text-primary text-sm" />
                    <span>Representative personal ID was not submitted for this employer entity.</span>
                  </div>
                )}

                {/* Employer Section 2: Business Registration Documents & Permits */}
                <div className="border-t border-ink-faint pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-body font-bold text-ink text-sm flex items-center gap-1.5">
                      <i className="lni lni-briefcase text-primary" />
                      Business Registration & Permits
                    </h4>
                    {hasBusinessDocs && (
                      <span className="text-xs text-ink-muted font-body">
                        {businessDocs.length} document{businessDocs.length > 1 ? 's' : ''} attached
                      </span>
                    )}
                  </div>

                  {!hasBusinessDocs ? (
                    <div className="bg-paper p-4 rounded-xl border border-ink-faint text-xs text-ink-muted flex items-center gap-2">
                      <p>No business documents or permits uploaded yet by this employer.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {businessDocs.map((docUrl, idx) => {
                        const isPdf = typeof docUrl === 'string' && (docUrl.toLowerCase().endsWith('.pdf') || docUrl.includes('.pdf?'));
                        return (
                          <div key={idx} className="group relative">
                            <div className="flex items-center justify-between mb-1.5 h-6">
                              <span className="font-body font-semibold text-ink-soft text-xs">Document #{idx + 1}</span>
                              <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded bg-paper text-ink-muted border border-ink-faint">
                                {isPdf ? 'PDF' : 'IMAGE'}
                              </span>
                            </div>
                            <div className="bg-paper rounded-xl border border-ink-faint p-2 h-[180px] flex items-center justify-center bg-black/5 overflow-hidden relative">
                              {isPdf ? (
                                <div className="flex flex-col items-center justify-center text-center p-3">
                                  <FileText className="w-10 h-10 text-primary mb-2" />
                                  <p className="text-xs font-semibold text-ink mb-2">Business Permit (PDF)</p>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenLightbox(docUrl, `Business Document #${idx + 1} (PDF)`, true)}
                                      className="px-2.5 py-1 text-xs bg-primary text-white rounded-lg font-medium inline-flex items-center gap-1 hover:bg-primary-dark transition-colors"
                                    >
                                      Preview <ExternalLink className="w-3 h-3" />
                                    </button>
                                    <a
                                      href={docUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-1 text-ink-muted hover:text-ink rounded-lg border border-ink-faint hover:bg-white transition-colors"
                                      title="Open direct"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  </div>
                                </div>
                              ) : (
                                <Image
                                  src={docUrl}
                                  alt={`Business Doc ${idx + 1}`}
                                  width={400}
                                  height={300}
                                  unoptimized
                                  onClick={() => handleOpenLightbox(docUrl, `Business Document #${idx + 1}`, false)}
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

      {lightboxDoc && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="lightbox-title"
          className="fixed inset-0 bg-black/92 z-[250] flex flex-col p-4 backdrop-blur-md animate-fade-in"
          onClick={handleCloseLightbox}
          data-testid="lightbox-overlay"
        >
          {/* Lightbox Controls Header */}
          <div
            className="w-full max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-3 text-white z-10 pb-3 border-b border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h4 id="lightbox-title" className="font-display text-lg font-bold tracking-wide">
                {lightboxDoc.title}
              </h4>
              <p className="text-white/60 text-xs font-body">
                {lightboxDoc.isPdf ? 'PDF Document Preview' : 'Interactive Document Viewer · Click outside or press Esc to close'}
              </p>
            </div>

            {/* Inspection Toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
              {!lightboxDoc.isPdf && (
                <>
                  <div className="flex items-center bg-white/10 rounded-xl p-1 border border-white/10">
                    <button
                      type="button"
                      onClick={handleZoomOut}
                      disabled={zoom <= 1}
                      data-testid="lightbox-zoom-out"
                      className="p-1.5 hover:bg-white/20 disabled:opacity-40 disabled:hover:bg-transparent rounded-lg text-white transition-colors"
                      title="Zoom out"
                      aria-label="Zoom out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span
                      data-testid="lightbox-zoom-level"
                      className="px-2 text-xs font-medium font-body text-white min-w-[48px] text-center"
                    >
                      {Math.round(zoom * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={handleZoomIn}
                      disabled={zoom >= 3}
                      data-testid="lightbox-zoom-in"
                      className="p-1.5 hover:bg-white/20 disabled:opacity-40 disabled:hover:bg-transparent rounded-lg text-white transition-colors"
                      title="Zoom in"
                      aria-label="Zoom in"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleRotate}
                    data-testid="lightbox-rotate"
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-xl border border-white/10 text-white text-xs font-body inline-flex items-center gap-1.5 transition-colors"
                    title="Rotate 90° clockwise"
                  >
                    <RotateCw className="w-4 h-4" />
                    <span className="hidden sm:inline">Rotate</span>
                  </button>

                  {(zoom > 1 || rotation > 0) && (
                    <button
                      type="button"
                      onClick={handleZoomReset}
                      data-testid="lightbox-reset"
                      className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl border border-white/10 text-white text-xs font-body inline-flex items-center gap-1 transition-colors"
                      title="Reset view"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </button>
                  )}
                </>
              )}

              <a
                href={lightboxDoc.url}
                target="_blank"
                rel="noreferrer"
                download
                data-testid="lightbox-download-btn"
                className="p-2 bg-primary hover:bg-primary-dark rounded-xl text-white text-xs font-body font-semibold inline-flex items-center gap-1.5 transition-colors shadow-lg"
                title="Download original file"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download</span>
              </a>

              <a
                href={lightboxDoc.url}
                target="_blank"
                rel="noreferrer"
                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl border border-white/10 text-white text-xs font-body inline-flex items-center gap-1.5 transition-colors"
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="hidden sm:inline">Open Direct</span>
              </a>

              <button
                onClick={handleCloseLightbox}
                data-testid="lightbox-close-btn"
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all flex items-center justify-center ml-1"
                aria-label="Close document viewer"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Document Content Viewport */}
          <div className="w-full flex-1 max-w-6xl mx-auto flex items-center justify-center p-2 sm:p-4 overflow-auto">
            {lightboxDoc.isPdf ? (
              <div
                className="w-full h-full min-h-[500px] max-h-[82vh] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <iframe
                  src={lightboxDoc.url}
                  title={lightboxDoc.title}
                  data-testid="lightbox-pdf-iframe"
                  className="w-full flex-1 border-0 rounded-2xl"
                />
              </div>
            ) : (
              <div
                className="w-full h-full flex items-center justify-center overflow-auto p-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transition: 'transform 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)',
                    maxWidth: '100%',
                    maxHeight: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Image
                    src={lightboxDoc.url}
                    alt={lightboxDoc.title}
                    width={800}
                    height={600}
                    unoptimized
                    data-testid="lightbox-img"
                    className="max-w-full max-h-[76vh] object-contain rounded-xl shadow-2xl animate-scale-up select-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (!mounted) {
    return null;
  }

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
