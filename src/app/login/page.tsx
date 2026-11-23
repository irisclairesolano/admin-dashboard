'use client';

import { adminApi, warmUpServer } from '@/lib/api';
import { authStorage } from '@/lib/authStorage';
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  Shield,
  Briefcase,
  AlertTriangle,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [mfaToken, setMfaToken] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resettingThrottle, setResettingThrottle] = useState(false);
  const router = useRouter();

  useEffect(() => {
    warmUpServer();
    router.prefetch('/dashboard/verifications');
  }, [router]);

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

      authStorage.setToken(res.data.token, rememberMe);
      authStorage.setUser(user, rememberMe);
      if (res.data.permissions) {
        authStorage.setPermissions(res.data.permissions, rememberMe);
      }

      // Start loading verifications data immediately while Next.js transitions routes
      void adminApi.getVerifications(true).catch(() => {});
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

      authStorage.setToken(res.data.token, rememberMe);
      authStorage.setUser(user, rememberMe);
      if (res.data.permissions) {
        authStorage.setPermissions(res.data.permissions, rememberMe);
      }

      // Start loading verifications data immediately while Next.js transitions routes
      void adminApi.getVerifications(true).catch(() => {});
      router.push('/dashboard/verifications');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid authenticator or recovery code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-paper dark:bg-slate-950 text-ink dark:text-slate-100 relative flex flex-col justify-between overflow-x-hidden overflow-y-auto selection:bg-primary selection:text-white dark:selection:bg-sky-400 dark:selection:text-slate-950 transition-colors">

      {/* ── Ambient Background Glows & Subtle Grid (SIKAP Pastel Palette) ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-20 -left-20 w-64 h-64 sm:w-[400px] sm:h-[400px] lg:w-[480px] lg:h-[480px] bg-accent-sky/45 dark:bg-sky-900/20 rounded-full blur-[100px] sm:blur-[130px]" />
        <div className="absolute top-1/4 -right-16 w-72 h-72 sm:w-[420px] sm:h-[420px] lg:w-[520px] lg:h-[520px] bg-accent-peach/45 dark:bg-rose-900/15 rounded-full blur-[110px] sm:blur-[140px]" />
        <div className="absolute -bottom-20 left-1/3 w-64 h-64 sm:w-[360px] sm:h-[360px] lg:w-[440px] lg:h-[440px] bg-accent-mint/35 dark:bg-emerald-950/20 rounded-full blur-[100px] sm:blur-[130px]" />

        {/* Delicate blueprint grid overlay */}
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.045] dark:opacity-[0.035]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="admin-hero-grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path
                d="M 48 0 L 0 0 0 48"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="text-primary dark:text-sky-400"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#admin-hero-grid)" />
        </svg>
      </div>

      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <header className="w-full z-30 px-4 sm:px-8 lg:px-14 py-3 sm:py-3.5 flex items-center justify-between gap-2 border-b border-ink-faint/70 dark:border-slate-800 bg-white/70 dark:bg-slate-950/75 backdrop-blur-xl shrink-0">

        {/* Left: Official SIKAP Wordmark + Admin Pill */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="relative h-6 w-20 sm:h-8 sm:w-28 flex items-center shrink-0">
            <Image
              src="/logo/04_Wordmark.png"
              alt="SIKAP Logo"
              width={112}
              height={32}
              priority
              className="object-contain dark:brightness-0 dark:invert opacity-95 hover:opacity-100 transition-opacity"
            />
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-body font-semibold bg-primary-tint dark:bg-slate-800 text-primary dark:text-slate-300 border border-primary/15 dark:border-slate-700 shrink-0">
            Admin
          </span>
        </div>

        {/* Right: Location Badge */}
        <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 border border-ink-faint/80 dark:border-slate-700 text-[11px] sm:text-xs font-semibold text-ink-soft dark:text-slate-200 shadow-2xs backdrop-blur-sm shrink-0">
          <span className="w-2 h-2 rounded-full bg-accent-mintDeep dark:bg-emerald-400 animate-pulse shrink-0" />
          <span className="whitespace-nowrap">
            Sorsogon<span className="hidden sm:inline">, Philippines</span>
          </span>
        </div>
      </header>

      {/* ── Main Hero Section ─────────────────────────────────────────────── */}
      <main className="relative z-20 flex-1 min-h-0 max-w-7xl mx-auto w-full px-4 sm:px-8 lg:px-14 py-6 sm:py-10 lg:py-8 flex flex-col lg:flex-row items-center justify-center lg:justify-between gap-8 sm:gap-10 lg:gap-12">

        {/* ── Left Column: SIKAP Brand Hero ── */}
        <div className="w-full lg:flex-1 max-w-xl text-center lg:text-left flex flex-col items-center lg:items-start space-y-3.5 sm:space-y-4 lg:space-y-5 animate-slide-up order-2 lg:order-1">

          {/* Eyebrow Badge */}
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 rounded-full bg-primary-tint/90 dark:bg-slate-900/90 border border-primary/15 dark:border-slate-700 text-primary dark:text-sky-300 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider shadow-2xs backdrop-blur-sm">
            <Shield className="w-3.5 h-3.5 text-primary dark:text-sky-400 shrink-0" />
            <span>Built for Informal Work · Admin Console</span>
          </div>

          {/* Heading */}
          <h1 className="font-display text-2xl sm:text-4xl lg:text-[42px] xl:text-[46px] font-black tracking-tight text-ink dark:text-white leading-[1.14]">
            Trusted Local Work.<br />
            Steward the{' '}
            <span className="italic text-primary-soft dark:text-sky-300">
              Kabuhayan.
            </span>
          </h1>

          {/* Description */}
          <p className="font-body text-xs sm:text-sm text-ink-soft dark:text-slate-300 leading-relaxed max-w-md lg:max-w-lg">
            The administrative console behind the SIKAP mobile job platform.
            Verify identities, moderate job listings, and keep Sorsogon&apos;s
            informal workforce community safe and trusted.
          </p>

          {/* Feature / Value Props Row */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 pt-0.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-white/85 dark:bg-slate-900/80 border border-ink-faint/80 dark:border-slate-700 text-[11px] sm:text-xs font-medium text-ink-soft dark:text-slate-200 shadow-2xs backdrop-blur-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-accent-mintDeep dark:text-emerald-400 shrink-0" />
              <span>ID Verification</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-white/85 dark:bg-slate-900/80 border border-ink-faint/80 dark:border-slate-700 text-[11px] sm:text-xs font-medium text-ink-soft dark:text-slate-200 shadow-2xs backdrop-blur-sm">
              <Briefcase className="w-3.5 h-3.5 text-primary dark:text-sky-400 shrink-0" />
              <span>Job Moderation</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-white/85 dark:bg-slate-900/80 border border-ink-faint/80 dark:border-slate-700 text-[11px] sm:text-xs font-medium text-ink-soft dark:text-slate-200 shadow-2xs backdrop-blur-sm">
              <AlertTriangle className="w-3.5 h-3.5 text-primary-soft dark:text-sky-300 shrink-0" />
              <span>Safety &amp; Trust</span>
            </div>
          </div>

          {/* Team Credits */}
          <div className="pt-2 sm:pt-3 flex flex-wrap items-center justify-center lg:justify-start gap-x-3 gap-y-1.5 text-[11px] sm:text-xs text-ink-muted dark:text-slate-400">
            <span className="font-bold uppercase tracking-wider text-primary dark:text-sky-400 text-[10px] sm:text-[11px] mr-1">
              TEAM
            </span>
            <span className="text-ink-soft dark:text-slate-300">
              <strong className="text-ink dark:text-white font-semibold">Solano</strong> Developer
            </span>
            <span className="text-ink-light dark:text-slate-700 hidden sm:inline">•</span>
            <span className="text-ink-soft dark:text-slate-300">
              <strong className="text-ink dark:text-white font-semibold">Bohol</strong> Project Manager
            </span>
            <span className="text-ink-light dark:text-slate-700 hidden sm:inline">•</span>
            <span className="text-ink-soft dark:text-slate-300">
              <strong className="text-ink dark:text-white font-semibold">Escultura</strong> Systems Analyst
            </span>
            <span className="text-ink-light dark:text-slate-700 hidden sm:inline">•</span>
            <span className="text-ink-soft dark:text-slate-300">
              <strong className="text-ink dark:text-white font-semibold">Deticio</strong> Technical Writer
            </span>
          </div>
        </div>

        {/* ── Right Column: Administrator Portal Sign-In Card ── */}
        <div className="relative w-full max-w-[420px] lg:w-[420px] flex-shrink-0 order-1 lg:order-2 animate-slide-up">
          {/* Card-scoped ambient pastel glows matching SIKAP LoginScreen */}
          <div className="pointer-events-none absolute -top-5 -right-4 sm:-top-6 sm:-right-6 w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-accent-peach/40 dark:bg-rose-500/15 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-5 -left-4 sm:-bottom-6 sm:-left-6 w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-accent-sky/45 dark:bg-sky-500/15 blur-2xl" />

          <div className="relative z-20 bg-white/85 dark:bg-slate-900/85 rounded-2xl sm:rounded-3xl border border-white/80 dark:border-slate-800 shadow-glass p-5 sm:p-6 lg:p-7 backdrop-blur-xl">

            {/* Card Header */}
            <div className="mb-4 text-left">
              <h2 className="font-display text-xl sm:text-2xl font-black text-ink dark:text-white tracking-tight">
                {mfaRequired ? 'Two-Factor Challenge' : 'Administrator Portal'}
              </h2>
              <p className="font-body text-xs text-ink-muted dark:text-slate-400 mt-1 leading-relaxed">
                {mfaRequired
                  ? 'Enter the 6-digit TOTP code generated by your authenticator application.'
                  : 'Sign in with your authorized credentials to manage the SIKAP platform.'}
              </p>
            </div>

            {/* Error / Lockout Alert */}
            {error && (
              <div
                className={`border px-3 py-2 rounded-xl mb-3.5 text-xs font-medium flex flex-col gap-1.5 animate-fade-in ${
                  error.includes('Lockout reset')
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-500/40 text-rose-800 dark:text-rose-300'
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
                    className="self-start mt-0.5 px-3 py-1 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-lg font-bold text-xs transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {resettingThrottle ? 'Unlocking...' : '🔓 Reset Lockout Now'}
                  </button>
                )}
              </div>
            )}

            {!mfaRequired ? (
              <form onSubmit={handleLogin} className="space-y-3.5">

                {/* Email Address */}
                <div>
                  <label htmlFor="admin-email" className="block font-body font-semibold text-ink-soft dark:text-slate-300 text-xs mb-1">
                    Email address
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-ink-muted dark:text-slate-400 absolute left-3 pointer-events-none" />
                    <input
                      id="admin-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-paper/80 dark:bg-slate-950/80 rounded-xl border border-ink-faint dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:border-primary dark:focus:border-sky-400 focus:ring-2 focus:ring-primary/15 dark:focus:ring-sky-400/20 outline-none font-body text-base sm:text-sm text-ink dark:text-slate-100 transition-all placeholder:text-ink-light dark:placeholder:text-slate-500"
                      placeholder="admin@sikap.ph"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="admin-password" className="font-body font-semibold text-ink-soft dark:text-slate-300 text-xs">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setError('To reset your administrator password or 2FA, please contact your municipal system administrator.')}
                      className="text-xs font-semibold text-primary-soft dark:text-sky-400 hover:text-primary dark:hover:text-sky-300 transition-colors cursor-pointer"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-ink-muted dark:text-slate-400 absolute left-3 pointer-events-none" />
                    <input
                      id="admin-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-11 py-2.5 bg-paper/80 dark:bg-slate-950/80 rounded-xl border border-ink-faint dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:border-primary dark:focus:border-sky-400 focus:ring-2 focus:ring-primary/15 dark:focus:ring-sky-400/20 outline-none font-body text-base sm:text-sm text-ink dark:text-slate-100 transition-all placeholder:text-ink-light dark:placeholder:text-slate-500"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 text-ink-muted dark:text-slate-400 hover:text-ink dark:hover:text-slate-200 p-1.5 cursor-pointer transition-colors"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Keep Me Signed In Checkbox */}
                <div className="flex items-center gap-2 pt-0.5">
                  <input
                    id="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-ink-faint dark:border-slate-700 bg-white dark:bg-slate-900 text-primary dark:text-sky-400 focus:ring-primary/20 dark:focus:ring-sky-400/20 focus:ring-offset-0 cursor-pointer accent-primary"
                  />
                  <label
                    htmlFor="remember-me"
                    className="text-xs text-ink-soft dark:text-slate-300 font-medium cursor-pointer select-none"
                  >
                    Keep me signed in
                  </label>
                </div>

                {/* Sign In Button: Midnight Navy matching SIKAP primary Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary-hover dark:bg-sky-500 dark:hover:bg-sky-400 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed text-white dark:text-slate-950 font-body font-bold py-2.5 sm:py-3 rounded-xl shadow-md shadow-primary/20 dark:shadow-sky-500/20 transition-all flex justify-center items-center gap-2 text-sm mt-3.5 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 dark:border-slate-950/30 border-t-white dark:border-t-slate-950 rounded-full animate-spin" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleMfaVerify} className="space-y-3.5">
                <div>
                  <label htmlFor="admin-totp" className="block font-body font-semibold text-ink-soft dark:text-slate-300 text-xs mb-1">
                    6-Digit Verification Code
                  </label>
                  <input
                    id="admin-totp"
                    type="text"
                    maxLength={10}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    className="w-full px-4 py-2.5 bg-paper/80 dark:bg-slate-950/80 rounded-xl border border-ink-faint dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:border-primary dark:focus:border-sky-400 focus:ring-2 focus:ring-primary/15 dark:focus:ring-sky-400/20 outline-none font-mono text-center text-lg tracking-widest text-ink dark:text-white font-bold transition-all placeholder:text-ink-light dark:placeholder:text-slate-500"
                    placeholder="000000"
                    autoFocus
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !totpCode}
                  className="w-full bg-primary hover:bg-primary-hover dark:bg-sky-500 dark:hover:bg-sky-400 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white dark:text-slate-950 font-body font-bold py-2.5 sm:py-3 rounded-xl shadow-md shadow-primary/20 dark:shadow-sky-500/20 transition-all flex justify-center items-center gap-2 text-sm mt-3 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 dark:border-slate-950/30 border-t-white dark:border-t-slate-950 rounded-full animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify &amp; Access Portal</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMfaRequired(false);
                    setTotpCode('');
                    setError('');
                  }}
                  className="w-full text-center text-xs font-semibold text-ink-muted dark:text-slate-400 hover:text-primary dark:hover:text-sky-300 transition-colors mt-1.5 block cursor-pointer"
                >
                  &larr; Back to password login
                </button>
              </form>
            )}

            {/* Secured Access Divider */}
            <div className="relative my-4 flex items-center justify-center">
              <div className="w-full border-t border-ink-faint/80 dark:border-slate-800" />
              <span className="relative bg-white/95 dark:bg-slate-900 px-3 text-[10px] uppercase font-bold tracking-widest text-ink-muted dark:text-slate-400">
                SECURED ACCESS
              </span>
            </div>

            {/* Card Bottom Security Notice */}
            <div className="flex items-center justify-center gap-2 text-[10px] sm:text-[11px] text-ink-muted dark:text-slate-400">
              <Shield className="w-3.5 h-3.5 text-primary-soft dark:text-sky-400 flex-shrink-0" />
              <span>Authorized personnel only. All admin actions are logged.</span>
            </div>
          </div>
        </div>
      </main>

      {/* ── Minimal Bottom Edge ───────────────────────────────────────────── */}
      <footer className="w-full px-4 sm:px-8 lg:px-14 py-3 border-t border-ink-faint/60 dark:border-slate-800/80 flex items-center justify-center text-center text-[10px] sm:text-[11px] text-ink-muted dark:text-slate-400 relative z-20 shrink-0 bg-white/40 dark:bg-slate-950/40 backdrop-blur-sm">
        <span>&copy; 2026 SIKAP Project · Capstone</span>
      </footer>
    </div>
  );
}
