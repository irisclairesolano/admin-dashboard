'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  titleId?: string;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  headerRight?: React.ReactNode;
  size?: 'md' | 'lg' | 'xl';
  footerLeft?: React.ReactNode;
  footerRight?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  bodyClassName?: string;
  usePortal?: boolean;
}

const SIZE_CLASSES: Record<'md' | 'lg' | 'xl', string> = {
  md: 'max-w-lg',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
};

/**
 * Unified Glassmorphic 3-Zone Admin Modal
 * - Sticky Glass Header (Badge + Title + Subtitle + Status/Controls + Close)
 * - Scrollable Body
 * - Sticky Glass Footer (Left: Destructive/Secondary · Right: Cancel + Primary CTA)
 */
export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  title,
  titleId = 'admin-modal-title',
  subtitle,
  badge,
  headerRight,
  size = 'lg',
  footerLeft,
  footerRight,
  footer,
  children,
  bodyClassName = 'p-6 sm:p-7',
  usePortal = true,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const hasFooter = Boolean(footer || footerLeft || footerRight);

  const modalNode = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-ink/50 dark:bg-black/65 backdrop-blur-md animate-fade-in outline-none"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full ${SIZE_CLASSES[size]} max-h-[90vh] flex flex-col overflow-hidden rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl border border-ink-faint/40 dark:border-slate-700/80`}
      >
        {/* Sticky Glass Header */}
        <div className="shrink-0 px-6 py-4 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-ink-faint/40 dark:border-slate-800 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {badge && <div className="flex flex-wrap items-center gap-2 mb-1.5">{badge}</div>}
            <h2
              id={titleId}
              className="text-lg sm:text-xl font-display font-bold text-ink dark:text-slate-100 leading-snug break-words"
            >
              {title}
            </h2>
            {subtitle && (
              <div className="text-xs font-body text-ink-muted dark:text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                {subtitle}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {headerRight}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="w-8 h-8 rounded-xl bg-slate-100/80 dark:bg-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-700 text-ink-muted hover:text-ink dark:text-slate-400 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className={`flex-1 overflow-y-auto ${bodyClassName}`}>{children}</div>

        {/* Sticky Glass Footer */}
        {hasFooter && (
          <div className="shrink-0 px-6 py-3.5 bg-slate-50/80 dark:bg-slate-900/85 backdrop-blur-md border-t border-ink-faint/40 dark:border-slate-800">
            {footer ? (
              footer
            ) : (
              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">{footerLeft}</div>
                <div className="flex flex-wrap items-center justify-end gap-2.5">{footerRight}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (usePortal) {
    if (!mounted || typeof document === 'undefined') return null;
    return createPortal(modalNode, document.body);
  }

  return modalNode;
};

export default AdminModal;
