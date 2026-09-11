'use client';

import React, { useState, useEffect } from 'react';
import { adminApi } from '@/api/admin';
import { ShieldCheck, Copy, Check, Loader2, X, AlertTriangle, KeyRound, Lock, ShieldAlert } from 'lucide-react';

interface TwoFactorSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isCurrentlyEnabled?: boolean;
  onDisableSuccess?: () => void;
}

export const TwoFactorSetupModal: React.FC<TwoFactorSetupModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  isCurrentlyEnabled = false,
  onDisableSuccess,
}) => {
  const [step, setStep] = useState<'initial' | 'verify' | 'manage' | 'disable'>('initial');
  const [loading, setLoading] = useState(false);
  const [secretData, setSecretData] = useState<{
    secret: string;
    qr_code_uri: string;
    recovery_codes: string[];
  } | null>(null);
  const [code, setCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  // Sync initial step based on current status whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(isCurrentlyEnabled ? 'manage' : 'initial');
      setError('');
      setCode('');
      setDisablePassword('');
      setSecretData(null);
    }
  }, [isOpen, isCurrentlyEnabled]);

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

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await adminApi.mfaDisable(disablePassword);
      setDisablePassword('');
      if (onDisableSuccess) {
        onDisableSuccess();
      } else {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to disable two-factor authentication.');
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
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
            step === 'disable'
              ? 'bg-rose-50 text-status-error border-rose-200'
              : isCurrentlyEnabled
                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                : 'bg-primary/10 text-primary border-primary/20'
          }`}>
            {step === 'disable' ? (
              <ShieldAlert className="w-5 h-5" />
            ) : (
              <ShieldCheck className="w-5 h-5" />
            )}
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-ink">
              {step === 'disable'
                ? 'Disable Two-Factor Authentication'
                : isCurrentlyEnabled
                  ? 'Manage Two-Factor Authentication'
                  : 'Two-Factor Authentication'}
            </h3>
            <p className="text-xs text-ink-muted">
              {isCurrentlyEnabled ? 'Enterprise security management' : 'Mandatory enterprise security protocol'}
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">
            {error}
          </div>
        )}

        {/* View 1: Currently Enabled (Manage) */}
        {step === 'manage' && (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">2FA Protection Active</span>
              </div>
              <p className="text-xs text-emerald-700 leading-relaxed mt-1">
                Your administrator account is secured with Time-based One-Time Passwords (TOTP). Verification codes are required during sign-in and privileged system actions.
              </p>
            </div>

            <div className="bg-paper/40 border border-ink-faint/30 rounded-xl p-3.5 space-y-2 text-xs text-ink-soft">
              <div className="flex items-center justify-between">
                <span className="font-medium text-ink">Protocol</span>
                <span className="font-mono text-ink-muted">RFC 6238 TOTP (6-digit)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-ink">Compatible Apps</span>
                <span className="text-ink-muted">Google Authenticator, Authy, 1Password</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setStep('disable')}
                className="flex-1 py-2.5 px-4 bg-status-error/10 hover:bg-status-error/20 text-status-error font-bold text-xs rounded-xl border border-status-error/20 transition-colors flex items-center justify-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                Disable 2FA
              </button>
              <button
                type="button"
                onClick={handleStartSetup}
                disabled={loading}
                className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-ink font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Reconfigure Key
              </button>
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-5 bg-ink text-white hover:bg-ink-soft font-bold text-xs rounded-xl transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* View 2: Disable Confirmation */}
        {step === 'disable' && (
          <form onSubmit={handleDisable} className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex gap-3 text-xs text-amber-800">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600" />
              <span>
                Disabling 2FA significantly reduces account security. Enter your current admin password to proceed.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">
                Admin Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  placeholder="Enter your current password"
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-status-error focus:bg-white text-ink"
                />
                <KeyRound className="w-4 h-4 text-gray-400 absolute right-3.5 top-3" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep('manage')}
                className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-ink font-bold text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !disablePassword}
                className="flex-1 py-2.5 px-4 bg-status-error hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-status-error/20 disabled:opacity-50"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Disable
              </button>
            </div>
          </form>
        )}

        {/* View 3: Initial Setup */}
        {step === 'initial' && (
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
        )}

        {/* View 4: Verify Code & Activate */}
        {step === 'verify' && (
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
