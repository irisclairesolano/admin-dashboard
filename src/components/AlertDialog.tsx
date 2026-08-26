import React, { useEffect, useRef } from 'react';

interface AlertDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'OK',
  cancelText,
  onConfirm,
  onCancel,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    modalRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (onCancel) {
          onCancel();
        } else {
          onConfirm();
        }
      } else if (e.key === 'Enter') {
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel, onConfirm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-ink/40 backdrop-blur-sm transition-opacity duration-300"
        onClick={onCancel || onConfirm}
      />

      {/* Modal box */}
      <div
        ref={modalRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="alert-title"
        aria-describedby="alert-msg"
        tabIndex={-1}
        className="bg-white/95 backdrop-blur-xl border border-white/50 w-full max-w-md rounded-3xl p-6 shadow-2xl relative z-10 transform scale-100 transition-all duration-300 animate-fade-in"
      >
        <h3 id="alert-title" className="text-xl font-display font-bold text-ink mb-2">
          {title}
        </h3>
        <p id="alert-msg" className="text-sm font-body text-ink-soft leading-relaxed mb-6">
          {message}
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
};
