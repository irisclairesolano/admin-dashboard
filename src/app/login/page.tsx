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

      authStorage.setToken(res.data.token);
      authStorage.setUser(user);
      if (res.data.permissions) {
        authStorage.setPermissions(res.data.permissions);
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

      authStorage.setToken(res.data.token);
      authStorage.setUser(user);
      if (res.data.permissions) {
        authStorage.setPermissions(res.data.permissions);
      }

      router.push('/dashboard/verifications');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid authenticator or recovery code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070D0C] text-slate-100 relative flex flex-col justify-between overflow-x-hidden selection:bg-teal-400 selection:text-slate-950">
      
      {/* ── Ambient Background Glows & Subtle Grid ──────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
        {/* Soft radial emerald / cyan halos */}
        <div className="absolute top-1/4 -left-24 w-[520px] h-[520px] bg-emerald-500/12 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 right-4 w-[580px] h-[580px] bg-teal-500/15 rounded-full blur-[160px]" />
        <div className="absolute -bottom-24 left-1/3 w-[460px] h-[460px] bg-cyan-500/8 rounded-full blur-[140px]" />

        {/* Delicate tech grid overlay */}
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.035]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="admin-hero-grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path
                d="M 48 0 L 0 0 0 48"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="text-emerald-400"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#admin-hero-grid)" />
        </svg>
      </div>

      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <header className="w-full z-30 px-6 sm:px-12 lg:px-16 py-5 flex items-center justify-between border-b border-emerald-950/40 bg-[#070D0C]/60 backdrop-blur-md">
        
        {/* Left: Official SIKAP Logo */}
        <div className="flex items-center gap-3">
          <div className="relative h-8 w-28 flex items-center">
            <Image
              src="/logo/04_Wordmark.png"
              alt="SIKAP Logo"
              width={112}
              height={32}
              priority
              className="object-contain brightness-0 invert opacity-95 hover:opacity-100 transition-opacity"
            />
          </div>
        </div>



        {/* Right: Location Badge with Pulsing Live Dot */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0E1A18]/90 border border-emerald-500/25 text-xs font-semibold text-emerald-300 shadow-xs backdrop-blur-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
          <span>Sorsogon, Philippines</span>
        </div>
      </header>

      {/* ── Main Hero Section ─────────────────────────────────────────────── */}
      <main className="relative z-20 flex-1 max-w-7xl mx-auto w-full px-6 sm:px-12 lg:px-16 py-8 sm:py-12 lg:py-16 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16">
        
        {/* ── Left Column: Value Prop & Local Context ── */}
        <div className="flex-1 max-w-xl text-left space-y-6 animate-slide-up order-2 lg:order-1">
          
          {/* Capstone Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0C1917]/90 border border-emerald-500/30 text-emerald-300 text-xs font-semibold tracking-wide shadow-xs backdrop-blur-sm">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Capstone Research Project</span>
          </div>

          {/* Heading */}
          <h1 className="font-display text-4xl sm:text-5xl lg:text-[54px] font-black tracking-tight text-white leading-[1.12]">
            Local Skills &amp; Labor<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300">
              Workforce Management
            </span>
          </h1>

          {/* Description */}
          <p className="font-body text-sm sm:text-base text-slate-300/85 leading-relaxed max-w-lg">
            The administrative console behind the SIKAP mobile job platform.
            Verify identities, moderate job posts, track applications, and keep
            Bulan&apos;s workforce community safe.
          </p>

          {/* Feature Badges Row */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#0D1817]/80 border border-emerald-500/20 text-xs font-medium text-slate-200 backdrop-blur-sm hover:border-emerald-500/40 transition-colors">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>ID Verification</span>
            </div>
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#0D1817]/80 border border-emerald-500/20 text-xs font-medium text-slate-200 backdrop-blur-sm hover:border-emerald-500/40 transition-colors">
              <Briefcase className="w-3.5 h-3.5 text-teal-400" />
              <span>Job Listings</span>
            </div>
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#0D1817]/80 border border-emerald-500/20 text-xs font-medium text-slate-200 backdrop-blur-sm hover:border-emerald-500/40 transition-colors">
              <AlertTriangle className="w-3.5 h-3.5 text-emerald-300" />
              <span>Safety &amp; Moderation</span>
            </div>
          </div>

          {/* Team Credits: Clean, Integrated Bottom-Left Signature */}
          <div className="pt-6 sm:pt-8 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-xs text-slate-400">
            <span className="font-bold uppercase tracking-wider text-emerald-400 text-[11px] mr-1">
              TEAM
            </span>
            <span className="text-slate-300">
              <strong className="text-white font-semibold">Solano</strong> Developer
            </span>
            <span className="text-slate-700 hidden sm:inline">•</span>
            <span className="text-slate-300">
              <strong className="text-white font-semibold">Bohol</strong> Project Manager
            </span>
            <span className="text-slate-700 hidden sm:inline">•</span>
            <span className="text-slate-300">
              <strong className="text-white font-semibold">Escultura</strong> Systems Analyst
            </span>
            <span className="text-slate-700 hidden sm:inline">•</span>
            <span className="text-slate-300">
              <strong className="text-white font-semibold">Deticio</strong> Technical Writer
            </span>
          </div>
        </div>

        {/* ── Right Column: Administrator Portal Sign-In Card ── */}
        <div className="w-full max-w-md sm:w-[420px] bg-[#0A1413]/85 rounded-3xl border border-emerald-500/20 shadow-2xl shadow-emerald-950/60 p-7 sm:p-9 relative z-20 animate-slide-up flex-shrink-0 order-1 lg:order-2 backdrop-blur-xl">
          
          {/* Card Header */}
          <div className="mb-6 text-left">
            <h2 className="font-display text-2xl font-black text-white tracking-tight">
              {mfaRequired ? 'Two-Factor Challenge' : 'Administrator Portal'}
            </h2>
            <p className="font-body text-xs text-slate-400 mt-1.5 leading-relaxed">
              {mfaRequired
                ? 'Enter the 6-digit TOTP code generated by your authenticator application.'
                : 'Sign in with your authorized credentials to manage municipal platform assets.'}
            </p>
          </div>

          {/* Error / Lockout Alert */}
          {error && (
            <div
              className={`border px-4 py-3 rounded-xl mb-5 text-xs font-medium flex flex-col gap-2 animate-fade-in ${
                error.includes('Lockout reset')
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
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
              
              {/* Email Address */}
              <div>
                <label className="block font-body font-medium text-slate-300 text-xs mb-1.5">
                  Email address
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-[#060D0C]/90 rounded-xl border border-emerald-950/80 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 outline-none font-body text-sm text-slate-100 transition-all placeholder:text-slate-600"
                    placeholder="admin@sikap.ph"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-body font-medium text-slate-300 text-xs">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setError('Password reset instructions have been forwarded to the municipal system coordinator.')}
                    className="text-xs font-semibold text-teal-400 hover:text-teal-300 transition-colors cursor-pointer"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-11 py-3 bg-[#060D0C]/90 rounded-xl border border-emerald-950/80 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 outline-none font-body text-sm text-slate-100 transition-all placeholder:text-slate-600"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-slate-500 hover:text-slate-300 p-1 cursor-pointer transition-colors"
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
                  className="w-4 h-4 rounded border-slate-700 bg-[#060D0C] text-teal-400 focus:ring-teal-400/20 focus:ring-offset-0 cursor-pointer accent-teal-400"
                />
                <label
                  htmlFor="remember-me"
                  className="text-xs text-slate-300 font-medium cursor-pointer select-none"
                >
                  Keep me signed in
                </label>
              </div>

              {/* Sign In Button: Vibrant Glowing Mint/Teal Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#6ee7b7] via-[#2dd4bf] to-[#38bdf8] hover:brightness-110 active:scale-[0.98] disabled:opacity-75 disabled:cursor-not-allowed text-slate-950 font-body font-bold py-3.5 rounded-xl shadow-lg shadow-teal-500/25 transition-all flex justify-center items-center gap-2 text-sm mt-5 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
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
            <form onSubmit={handleMfaVerify} className="space-y-4">
              <div>
                <label className="block font-body font-medium text-slate-300 text-xs mb-1.5">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  className="w-full px-4 py-3 bg-[#060D0C]/90 rounded-xl border border-emerald-950/80 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 outline-none font-mono text-center text-xl tracking-widest text-white font-bold transition-all placeholder:text-slate-600"
                  placeholder="000000"
                  autoFocus
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || !totpCode}
                className="w-full bg-gradient-to-r from-[#6ee7b7] via-[#2dd4bf] to-[#38bdf8] hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-body font-bold py-3.5 rounded-xl shadow-lg shadow-teal-500/25 transition-all flex justify-center items-center gap-2 text-sm mt-4 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
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
                className="w-full text-center text-xs font-semibold text-slate-400 hover:text-teal-300 transition-colors mt-2 block"
              >
                &larr; Back to password login
              </button>
            </form>
          )}

          {/* Secured Access Divider */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="w-full border-t border-slate-800/80" />
            <span className="absolute bg-[#0A1413] px-3 text-[10px] uppercase font-bold tracking-widest text-slate-500">
              SECURED ACCESS
            </span>
          </div>

          {/* Card Bottom Security Notice */}
          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <Shield className="w-3.5 h-3.5 text-teal-400/80 flex-shrink-0" />
            <span>Authorized personnel only. All admin actions are logged.</span>
          </div>
        </div>
      </main>

      {/* ── Minimal Bottom Edge (Old Bulky Footer Completely Removed) ────── */}
      <div className="w-full px-6 sm:px-12 lg:px-16 py-3.5 border-t border-slate-900/90 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500/80 relative z-20 gap-1">
        <span>&copy; {new Date().getFullYear()} SIKAP Project · Skills &amp; Job Matching Platform</span>
        <span className="hidden sm:inline">Local Skills &amp; Labor Workforce Management</span>
      </div>
    </div>
  );
}
