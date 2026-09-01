'use client';

import React, { useState } from 'react';
import { adminApi } from '@/api/admin';
import { ShieldAlert, KeyRound, Loader2, X } from 'lucide-react';

interface ReAuthModalProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  onSuccess: (reauthToken: string) => void;
  onCancel: () => void;
}

export const ReAuthModal: React.FC<ReAuthModalProps> = ({
  isOpen,
  title = 'Re-Authentication Required',
  description = 'For your security, please confirm your administrator credentials before executing this sensitive action.',
  onSuccess,
  onCancel,
}) => {
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [useOtp, setUseOtp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = useOtp ? { code } : { password };
      const res = await adminApi.reauth(payload);
      const token = res.data.reauth_token;
      setPassword('');
      setCode('');
      onSuccess(token);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-200">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-ink">{title}</h3>
            <p className="text-xs text-ink-muted">Elevated security verification</p>
          </div>
        </div>

        <p className="text-sm text-ink-soft mb-6 leading-relaxed">
          {description}
        </p>

        {error && (
          <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!useOtp ? (
            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">
                Admin Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white text-ink"
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
                autoFocus
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-center tracking-widest text-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white text-ink"
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
              className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-ink font-bold text-xs rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (!password && !code)}
              className="flex-1 py-2.5 px-4 bg-primary hover:bg-primary-dark text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-primary/20 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirm Action
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
