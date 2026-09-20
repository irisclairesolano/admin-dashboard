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
        className="fixed inset-0 bg-ink/40 backdrop-blur-sm transition-opacity duration-300"
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
        className="bg-white/95 backdrop-blur-xl border border-white/50 w-full max-w-md rounded-3xl p-6 shadow-2xl relative z-10 transform scale-100 transition-all duration-300 animate-fade-in my-auto"
      >
        <h3 id="alert-title" className="text-xl font-display font-bold text-ink mb-2">
          {cleanTitle}
        </h3>
        <p id="alert-msg" className="text-sm font-body text-ink-soft leading-relaxed mb-6">
          {cleanMessage}
        </p>

        <div className="flex items-center justify-end gap-3">
          {cancelText && onCancel && (
            <button
              onClick={onCancel}
              className="px-5 py-2.5 rounded-xl text-sm font-body font-semibold text-ink-soft hover:bg-ink-faint/30 border border-ink-faint/50 transition-all"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            className="px-5 py-2.5 rounded-xl text-sm font-body font-semibold text-white bg-ink hover:bg-ink-soft transition-all shadow-md active:scale-95"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
