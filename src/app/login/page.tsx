'use client';

import { adminApi } from '@/lib/api';
import { LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await adminApi.login(email, password);
      
      // If 2FA challenge is required
      if (res.data.mfa_required) {
        setMfaToken(res.data.mfa_token);
        setMfaRequired(true);
        setLoading(false);
        return;
      }

      const user = res.data.user;
      if (user.role !== 'admin') {
        setError('Access denied. Administrator privileges required.');
        setLoading(false);
        return;
      }

      localStorage.setItem('admin_token', res.data.token);
      localStorage.setItem('admin_user', JSON.stringify(user));
      if (res.data.permissions) {
        localStorage.setItem('admin_permissions', JSON.stringify(res.data.permissions));
      }

      router.push('/dashboard/verifications');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid administrative credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await adminApi.mfaVerify(mfaToken, totpCode);
      const user = res.data.user;

      localStorage.setItem('admin_token', res.data.token);
      localStorage.setItem('admin_user', JSON.stringify(user));
      if (res.data.permissions) {
        localStorage.setItem('admin_permissions', JSON.stringify(res.data.permissions));
      }

      router.push('/dashboard/verifications');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid authenticator or recovery code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col lg:flex-row relative overflow-hidden">
      {/* Soft Background Blobs (Behind Everything) */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-accent-peach/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse-slow pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-accent-sky/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse-slow pointer-events-none" style={{ animationDelay: '1.5s' }}></div>

      {/* Left Pane: System Info & Brand Hero */}
      <div className="lg:w-[55%] bg-gradient-to-br from-primary-dark via-primary to-accent-peach/20 p-8 lg:p-16 flex flex-col justify-between text-white relative overflow-hidden shadow-2xl">
        {/* Subtle geometric grid pattern */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        
        {/* Top Section: Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/90 rounded-xl flex items-center justify-center shadow-md">
            <LogIn className="w-5 h-5 text-primary-dark" />
          </div>
          <span className="font-display text-2xl font-bold tracking-tight">SIKAP</span>
        </div>

        {/* Middle Section: Hero Content & System Info */}
        <div className="relative z-10 my-12 lg:my-auto max-w-xl">
          <h1 className="font-display text-4xl lg:text-5xl font-black leading-tight tracking-tight mb-6">
            Connecting Skills,<br />
            <span className="text-accent-peach font-displayItalic">Empowering Local Work.</span>
          </h1>
          <p className="font-body text-white/80 text-lg mb-8 leading-relaxed">
            SIKAP is a decentralized skills-matching and service directory marketplace designed to uplift local labor sectors through verified identity credentials, secure job status lifecycle tracking, and smart moderation.
          </p>

          {/* System Information Panel */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-lg space-y-4">
            <h3 className="font-display text-lg font-bold text-white tracking-wide uppercase">System Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-status-success rounded-full animate-pulse"></span>
                <span className="font-body text-sm text-white/80">API Gateway: <strong className="text-white">Online</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-status-success rounded-full animate-pulse"></span>
                <span className="font-body text-sm text-white/80">Database: <strong className="text-white">Active</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-status-success rounded-full animate-pulse"></span>
                <span className="font-body text-sm text-white/80">Security Shield: <strong className="text-white">Protected</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-status-success rounded-full animate-pulse"></span>
                <span className="font-body text-sm text-white/80">Moderator: <strong className="text-white">Automated</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Section */}
        <div className="relative z-10 text-sm text-white/60 font-body">
          &copy; {new Date().getFullYear()} SIKAP Capstone Project. All rights reserved.
        </div>
      </div>

      {/* Right Pane: Login Form */}
      <div className="lg:w-[45%] flex items-center justify-center p-8 lg:p-16 bg-white/40 backdrop-blur-sm relative">
        <div className="max-w-md w-full animate-slide-up">
          <div className="mb-10 text-center lg:text-left">
            <h2 className="font-display text-3xl font-bold text-ink tracking-tight mb-2">
              {mfaRequired ? 'Two-Factor Challenge' : 'Administrator Portal'}
            </h2>
            <p className="font-body text-ink-muted text-sm">
              {mfaRequired
                ? 'Enter the 6-digit authentication code generated by your authenticator app (Google Authenticator / Authy).'
                : 'Please sign in with your administrative credentials to manage platform assets.'}
            </p>
          </div>

          {error && (
            <div className="bg-status-error/10 backdrop-blur-sm border border-status-error/20 text-status-error px-4 py-3 rounded-xl mb-6 text-sm font-body font-semibold animate-fade-in flex items-center">
              <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
              {error}
            </div>
          )}

          {!mfaRequired ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="group">
                <label className="block font-body font-semibold text-ink-soft text-sm mb-2 group-focus-within:text-primary transition-colors">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-5 py-3.5 bg-white rounded-xl border border-ink-faint focus:border-primary/50 outline-none font-body transition-all shadow-sm focus:shadow-md text-ink"
                  placeholder="admin@sikap.ph"
                  required
                />
              </div>

              <div className="group">
                <label className="block font-body font-semibold text-ink-soft text-sm mb-2 group-focus-within:text-primary transition-colors">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-5 py-3.5 bg-white rounded-xl border border-ink-faint focus:border-primary/50 outline-none font-body transition-all shadow-sm focus:shadow-md text-ink"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-dark text-white font-body font-bold py-4 rounded-xl shadow-md hover:shadow-lg transition-all flex justify-center items-center text-lg mt-8"
              >
                {loading ? (
                  <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleMfaVerify} className="space-y-6">
              <div className="group">
                <label className="block font-body font-semibold text-ink-soft text-sm mb-2 group-focus-within:text-primary transition-colors">
                  6-Digit Authenticator / Recovery Code
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  className="w-full px-5 py-4 bg-white rounded-xl border border-ink-faint focus:border-primary/50 outline-none font-mono text-center text-2xl tracking-widest transition-all shadow-sm focus:shadow-md text-ink font-bold"
                  placeholder="000000"
                  autoFocus
                  required
                />
                <p className="text-xs text-ink-muted mt-2">
                  Open Google Authenticator, Microsoft Authenticator, or Authy on your mobile device.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !totpCode}
                className="w-full bg-primary hover:bg-primary-dark text-white font-body font-bold py-4 rounded-xl shadow-md hover:shadow-lg transition-all flex justify-center items-center text-lg mt-8 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  'Verify & Log In'
                )}
              </button>

              <button
                type="button"
                onClick={() => { setMfaRequired(false); setTotpCode(''); setError(''); }}
                className="w-full text-center text-sm font-semibold text-ink-soft hover:text-primary transition-colors"
              >
                &larr; Back to password login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
