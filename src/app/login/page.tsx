'use client';

import { adminApi, warmUpServer } from '@/lib/api';
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  Shield,
  Briefcase,
  FileCheck,
  Building2
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resettingThrottle, setResettingThrottle] = useState(false);
  const router = useRouter();

  useEffect(() => {
    warmUpServer();
  }, []);

  const handleResetLockout = async () => {
    try {
      setResettingThrottle(true);
      await adminApi.resetThrottle();
      setError('Lockout reset! You can now log in with your credentials.');
    } catch {
      setError('Unable to reset automatically. Please wait 60 seconds.');
    } finally {
      setResettingThrottle(false);
    }
  };

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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 relative flex flex-col justify-between overflow-y-auto selection:bg-primary selection:text-white">
      {/* ── Soft Ambient Glows ────────────────────────────────────────────── */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-sky-200/40 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-40 right-1/4 w-96 h-96 bg-emerald-100/50 rounded-full blur-3xl pointer-events-none -z-10" />
      
      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <header className="w-full z-30 px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="relative h-8 w-28 flex items-center">
            <Image
              src="/logo/04_Wordmark.png"
              alt="SIKAP Logo"
              width={112}
              height={32}
              priority
              className="object-contain"
            />
          </div>
        </div>

        {/* Location Tag */}
        <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
          <span>🇵🇭</span>
          <span>Sorsogon, Philippines</span>
        </div>
      </header>

      {/* ── Main Hero & Content Canvas ────────────────────────────────────── */}
      <main className="relative z-20 flex-1 max-w-7xl mx-auto w-full px-4 sm:px-10 lg:px-16 py-8 sm:py-12 lg:py-16 flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-14">
        
        {/* Right Column (Ordered first on mobile for immediate access to login): Prominent Admin Sign-In Card */}
        <div className="w-full max-w-md sm:w-[420px] bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-9 relative z-20 animate-slide-up flex-shrink-0 order-1 lg:order-2">
          
          {/* Card Header */}
          <div className="mb-6 text-left">
            <h2 className="font-display text-2xl font-black text-slate-900 tracking-tight">
              {mfaRequired ? 'Two-Factor Challenge' : 'Administrator Portal'}
            </h2>
            <p className="font-body text-xs text-slate-500 mt-1 leading-relaxed">
              {mfaRequired
                ? 'Enter the 6-digit TOTP code generated by your authenticator application.'
                : 'Enter your authorized credentials to manage municipal platform assets.'}
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div
              className={`border px-4 py-3 rounded-xl mb-5 text-xs font-semibold flex flex-col gap-2 animate-fade-in ${
                error.includes('Lockout reset')
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="flex-1">{error}</span>
              </div>
              {error.toLowerCase().includes('too many') && process.env.NODE_ENV === 'development' && (
                <button
                  type="button"
                  onClick={handleResetLockout}
                  disabled={resettingThrottle}
                  className="self-start mt-1 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-lg font-bold text-xs transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {resettingThrottle ? 'Unlocking...' : '🔓 Reset Lockout Now'}
                </button>
              )}
            </div>
          )}

          {!mfaRequired ? (
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email Input */}
              <div>
                <label className="block font-body font-semibold text-slate-700 text-xs mb-1.5">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50/70 rounded-xl border border-slate-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none font-body text-sm text-slate-900 transition-all shadow-2xs placeholder:text-slate-400"
                    placeholder="admin@sikap.ph"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block font-body font-semibold text-slate-700 text-xs mb-1.5">
                  Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-11 py-3 bg-slate-50/70 rounded-xl border border-slate-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none font-body text-sm text-slate-900 transition-all shadow-2xs placeholder:text-slate-400"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-700 p-1 cursor-pointer transition-colors"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Sign In CTA */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-dark active:scale-[0.98] disabled:opacity-75 disabled:cursor-not-allowed text-white font-body font-bold py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all flex justify-center items-center gap-2 text-sm mt-6 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleMfaVerify} className="space-y-4">
              <div>
                <label className="block font-body font-semibold text-slate-700 text-xs mb-1.5">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50/70 rounded-xl border border-slate-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none font-mono text-center text-xl tracking-widest text-slate-900 font-bold transition-all shadow-2xs placeholder:text-slate-400"
                  placeholder="000000"
                  autoFocus
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || !totpCode}
                className="w-full bg-primary hover:bg-primary-dark active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white font-body font-bold py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all flex justify-center items-center gap-2 text-sm mt-4 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Verify & Access Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setMfaRequired(false); setTotpCode(''); setError(''); }}
                className="w-full text-center text-xs font-semibold text-slate-500 hover:text-primary transition-colors mt-2 block"
              >
                &larr; Back to password login
              </button>
            </form>
          )}
        </div>

        {/* Left Column: Vision, Value Prop & Info (Order 2 on mobile, Order 1 on desktop) */}
        <div className="flex-1 max-w-xl text-center lg:text-left space-y-6 animate-slide-up order-2 lg:order-1">
          
          {/* Tag Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/5 border border-primary/15 text-primary text-xs font-bold tracking-wide uppercase shadow-xs">
            <FileCheck className="w-3.5 h-3.5 text-primary" />
            Capstone Research Project
          </div>

          <h1 className="font-display text-3xl sm:text-4xl lg:text-[44px] font-black tracking-tight text-slate-900 leading-[1.2]">
            Local Skills & Labor<br />
            <span className="text-primary bg-gradient-to-r from-primary via-slate-800 to-primary-soft bg-clip-text text-transparent">
              Workforce Management.
            </span>
          </h1>

          <p className="font-body text-sm sm:text-base text-slate-600 leading-relaxed max-w-lg mx-auto lg:mx-0">
            An administrative management portal for the SIKAP mobile job platform—overseeing user identity verification, job post moderation, application tracking, and community safety in Bulan, Sorsogon.
          </p>

          {/* Three Feature Highlight Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-left">
            <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-slate-900">ID Verification</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Credential & ID review</p>
            </div>

            <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2">
                <Briefcase className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-slate-900">Job Listings</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Post & application oversight</p>
            </div>

            <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center mb-2">
                <Shield className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-slate-900">Safety & Moderation</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Reports & profanity filter</p>
            </div>
          </div>

          {/* Platform Note */}
          <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-3.5 max-w-md mx-auto lg:mx-0 text-left">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900">SIKAP Platform</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Skills & Job Matching Platform · Administrative Console
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* ── Simplified Footer: Meet the Team ─────────────────────────────── */}
      <footer className="w-full bg-white border-t border-slate-200/90 py-8 px-6 sm:px-10 lg:px-16 text-slate-600 font-body relative z-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Image
              src="/logo/04_Wordmark.png"
              alt="SIKAP Logo"
              width={96}
              height={28}
              className="h-6 w-auto object-contain"
            />
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">|</span>
            <p className="text-xs text-slate-500">
              Skills and Job Matching Platform · Bulan, Sorsogon
            </p>
          </div>

          {/* Meet the Team */}
          <div className="flex flex-col items-center md:items-end gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-900">
              Meet the Team
            </p>
            <div className="flex flex-wrap items-center justify-center md:justify-end gap-x-4 gap-y-1 text-xs">
              <span className="text-slate-700 font-medium">
                <strong className="font-semibold text-slate-900">Solano</strong> — Developer
              </span>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <span className="text-slate-700 font-medium">
                <strong className="font-semibold text-slate-900">Bohol</strong> — Project Manager
              </span>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <span className="text-slate-700 font-medium">
                <strong className="font-semibold text-slate-900">Escultura</strong> — Systems Analyst
              </span>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <span className="text-slate-700 font-medium">
                <strong className="font-semibold text-slate-900">Deticio</strong> — Technical Writer
              </span>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400">
          <p>&copy; {new Date().getFullYear()} SIKAP Project. All rights reserved.</p>
          <p>Local Skills &amp; Labor Workforce Management</p>
        </div>
      </footer>
    </div>
  );
}


