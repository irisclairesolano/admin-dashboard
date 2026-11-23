'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { adminApi } from '@/api/admin';
import { ShieldAlert, KeyRound, Loader2, X } from 'lucide-react';

interface ReAuthModalProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  confirmLabel?: string;
  onSuccess: (reauthToken: string) => void;
  onCancel: () => void;
}

export const ReAuthModal: React.FC<ReAuthModalProps> = ({
  isOpen,
  title = 'Re-Authentication Required',
  description = 'For your security, please confirm your administrator credentials before executing this sensitive action.',
  confirmText,
  confirmLabel,
  onSuccess,
  onCancel,
}) => {
  const [mounted, setMounted] = useState(false);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [confirmInput, setConfirmInput] = useState('');
  const [useOtp, setUseOtp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onCancel]);

  if (!isOpen || !mounted) return null;

  const isNameConfirmed = !confirmText || confirmInput.trim().toLowerCase() === confirmText.trim().toLowerCase();
  const isCredentialProvided = useOtp ? code.length > 0 : password.length > 0;
  const isSubmitDisabled = loading || !isCredentialProvided || !isNameConfirmed;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (confirmText && !isNameConfirmed) {
      setError(`Please type "${confirmText}" to confirm.`);
      return;
    }

    setLoading(true);

    try {
      const payload = useOtp ? { code } : { password };
      const res = await adminApi.reauth(payload);
      const token = res.data.reauth_token;
      setPassword('');
      setCode('');
      setConfirmInput('');
      onSuccess(token);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-ink/50 dark:bg-black/65 backdrop-blur-sm animate-fade-in overflow-y-auto"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel();
      }}
    >
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl max-w-md w-full p-6 shadow-2xl border border-ink-faint/40 dark:border-slate-700/80 relative my-auto">
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-slate-100/80 dark:bg-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-700 text-ink-muted hover:text-ink dark:text-slate-400 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-ink dark:text-slate-100">{title}</h3>
            <p className="text-xs text-ink-muted dark:text-slate-400">Elevated security verification</p>
          </div>
        </div>

        <p className="text-sm text-ink-soft dark:text-slate-300 mb-6 leading-relaxed">
          {description}
        </p>

        {error && (
          <div className="p-3 mb-4 bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-800/60 text-red-700 dark:text-rose-300 rounded-xl text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {confirmText && (
            <div className="p-3 bg-red-50/70 dark:bg-rose-950/30 border border-red-200/80 dark:border-rose-800/50 rounded-xl space-y-1.5">
              <label className="block text-xs font-bold text-red-900 dark:text-rose-200">
                {confirmLabel || `Type "${confirmText}" to confirm:`}
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder={confirmText}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-red-200 dark:border-rose-700 rounded-lg text-xs font-mono text-ink dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          )}

          {!useOtp ? (
            <div>
              <label className="block text-xs font-bold text-ink dark:text-slate-200 mb-1.5">
                Admin Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoFocus={!confirmText}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-blue-400 focus:bg-white dark:focus:bg-slate-800 text-ink dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400"
                />
                <KeyRound className="w-4 h-4 text-gray-400 absolute right-3.5 top-3" />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">
                6-Digit Authenticator (TOTP) Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                required
                autoFocus={!confirmText}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-center tracking-widest text-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-blue-400 focus:bg-white dark:focus:bg-slate-800 text-ink dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400"
              />
            </div>
          )}

          <div className="flex justify-between items-center text-xs">
            <button
              type="button"
              onClick={() => { setUseOtp(!useOtp); setError(''); }}
              className="text-primary hover:underline font-medium"
            >
              {useOtp ? 'Use Password instead' : 'Use Authenticator code instead'}
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-ink dark:text-slate-100 font-bold text-xs rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="flex-1 py-2.5 px-4 bg-primary hover:bg-primary-dark text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-primary/20 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirm Action
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
