import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { sanitizeErrorMessage } from '@/lib/errorSanitizer';

export interface AlertState {
  isOpen?: boolean;
  open?: boolean;
  title: string;
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'destructive';
}

interface AlertDialogProps extends AlertState {
  isOpen?: boolean;
  open?: boolean;
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  open,
  title,
  message,
  confirmText = 'OK',
  cancelText,
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const visible = isOpen ?? open ?? false;
  const cleanTitle = sanitizeErrorMessage(title);
  const cleanMessage = sanitizeErrorMessage(message);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;

    modalRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (onCancel) {
          onCancel();
        } else {
          onConfirm?.();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [visible, onCancel, onConfirm]);

  if (!visible) return null;

  const handleBackdropClick = () => {
    if (cancelText && onCancel) {
      onCancel();
    } else if (onCancel) {
      onCancel();
    } else {
      onConfirm?.();
    }
  };

  if (!visible || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-ink/50 dark:bg-black/65 backdrop-blur-sm transition-opacity duration-300"
        onClick={handleBackdropClick}
      />

      {/* Modal box */}
      <div
        ref={modalRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="alert-title"
        aria-describedby="alert-msg"
        tabIndex={-1}
        className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-ink-faint/40 dark:border-slate-700/80 w-full max-w-md rounded-2xl p-6 shadow-2xl relative z-10 transform scale-100 transition-all duration-200 animate-fade-in my-auto outline-none"
      >
        <h3 id="alert-title" className="text-lg sm:text-xl font-display font-bold text-ink dark:text-slate-100 mb-2">
          {cleanTitle}
        </h3>
        <p id="alert-msg" className="text-sm font-body text-ink-soft dark:text-slate-300 leading-relaxed mb-6">
          {cleanMessage}
        </p>

        <div className="flex items-center justify-end gap-2.5">
          {cancelText && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="h-9 px-4 rounded-xl text-xs font-body font-semibold text-ink-soft dark:text-slate-300 hover:text-ink dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-ink-faint/60 dark:border-slate-700 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            className={`h-9 px-4 rounded-xl text-xs font-body font-semibold text-white transition-all shadow-sm active:scale-95 focus-visible:outline-none focus-visible:ring-2 cursor-pointer ${
              confirmVariant === 'destructive'
                ? 'bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-500/50'
                : 'bg-ink hover:bg-ink-soft dark:bg-primary dark:hover:bg-primary-hover focus-visible:ring-primary/50'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
