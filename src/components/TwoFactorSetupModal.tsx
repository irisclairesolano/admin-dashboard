'use client';

import React, { useState } from 'react';
import { adminApi } from '@/api/admin';
import { ShieldCheck, Copy, Check, Loader2, X, AlertTriangle } from 'lucide-react';

interface TwoFactorSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const TwoFactorSetupModal: React.FC<TwoFactorSetupModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<'initial' | 'verify'>('initial');
  const [loading, setLoading] = useState(false);
  const [secretData, setSecretData] = useState<{
    secret: string;
    qr_code_uri: string;
    recovery_codes: string[];
  } | null>(null);
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleStartSetup = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.mfaSetup();
      setSecretData(res.data);
      setStep('verify');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to initialize two-factor setup.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await adminApi.mfaConfirm(code);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid verification code.');
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    if (secretData?.secret) {
      navigator.clipboard.writeText(secretData.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-200">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-ink">Two-Factor Authentication</h3>
            <p className="text-xs text-ink-muted">Mandatory enterprise security protocol</p>
          </div>
        </div>

        {error && (
          <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">
            {error}
          </div>
        )}

        {step === 'initial' ? (
          <div className="space-y-4">
            <p className="text-sm text-ink-soft leading-relaxed">
              Protect your administrator account with Time-based One-Time Passwords (TOTP). Compatible with <strong>Google Authenticator</strong>, <strong>Microsoft Authenticator</strong>, <strong>Authy</strong>, and <strong>1Password</strong>.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex gap-3 text-xs text-amber-800">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600" />
              <span>You will need to scan a QR code or enter a secret key into your authenticator app.</span>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-ink font-bold text-xs rounded-xl transition-colors"
              >
                Later
              </button>
              <button
                type="button"
                onClick={handleStartSetup}
                disabled={loading}
                className="flex-1 py-2.5 px-4 bg-primary hover:bg-primary-dark text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-primary/20"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Begin Setup
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleConfirm} className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
              <p className="text-xs font-bold text-ink-muted uppercase mb-1">Your Secret Setup Key</p>
              <div className="flex items-center justify-center gap-2 font-mono text-sm font-bold text-primary tracking-widest bg-white p-2.5 rounded-lg border border-gray-200">
                <span>{secretData?.secret}</span>
                <button
                  type="button"
                  onClick={copySecret}
                  className="p-1 text-gray-500 hover:text-primary transition-colors"
                  title="Copy secret"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-ink-muted mt-2">
                Enter this key manually into Google Authenticator or your authenticator app.
              </p>
            </div>

            {secretData?.recovery_codes && (
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 text-xs">
                <p className="font-bold text-blue-900 mb-1">Emergency Recovery Codes:</p>
                <div className="grid grid-cols-2 gap-1 font-mono text-[11px] text-blue-800">
                  {secretData.recovery_codes.map((rc, i) => (
                    <span key={i}>{rc}</span>
                  ))}
                </div>
                <p className="text-[10px] text-blue-700 mt-1.5">Save these codes in a secure password manager in case you lose access to your device.</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Enter 6-Digit Verification Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                required
                autoFocus
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-center tracking-widest text-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white text-ink"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-ink font-bold text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="flex-1 py-2.5 px-4 bg-primary hover:bg-primary-dark text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-primary/20 disabled:opacity-50"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Activate 2FA
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
