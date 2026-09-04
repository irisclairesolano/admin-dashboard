'use client';

import { adminApi, warmUpServer } from '@/lib/api';
import {
  LogIn,
  ShieldCheck,
  Lock,
  Mail,
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff,
  Building2,
  Shield,
  Activity,
  Layers
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
  const router = useRouter();

  useEffect(() => {
    warmUpServer();
  }, []);

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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 relative flex flex-col justify-between selection:bg-primary selection:text-white">
      {/* ── Soft Ambient Glows ────────────────────────────────────────────── */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-sky-200/40 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-emerald-100/50 rounded-full blur-3xl pointer-events-none -z-10" />
      
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
          <span className="hidden sm:inline-flex items-center text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200">
            Admin Console
          </span>
        </div>

        {/* Center Nav Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-xs font-semibold text-slate-600">
          <span className="flex items-center gap-1.5 hover:text-primary transition-colors">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Identity Screening
          </span>
          <span className="flex items-center gap-1.5 hover:text-primary transition-colors">
            <Building2 className="w-3.5 h-3.5 text-emerald-600" /> PESO & LGU Bulan
          </span>
          <span className="flex items-center gap-1.5 hover:text-primary transition-colors">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> AI Insights & Moderation
          </span>
        </nav>

        {/* Right Status Pill */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>API Online</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
            <span>🇵🇭</span>
            <span>Sorsogon, PH</span>
          </div>
        </div>
      </header>

      {/* ── Main Hero & Content Canvas ────────────────────────────────────── */}
      <main className="relative z-20 flex-1 max-w-7xl mx-auto w-full px-6 sm:px-10 lg:px-16 py-8 lg:py-12 flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-14">
        
        {/* Left Column: Vision, Value Prop & Live App Preview */}
        <div className="flex-1 max-w-xl text-center lg:text-left space-y-6 animate-slide-up">
          
          {/* Tag Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/5 border border-primary/15 text-primary text-xs font-bold tracking-wide uppercase shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Decentralized Skills Marketplace
          </div>

          <h1 className="font-display text-3xl sm:text-4xl lg:text-[46px] font-black tracking-tight text-slate-900 leading-[1.18]">
            Connecting Skills,<br />
            <span className="text-primary bg-gradient-to-r from-primary via-slate-800 to-primary-soft bg-clip-text text-transparent">
              Empowering Local Work.
            </span>
          </h1>

          <p className="font-body text-sm sm:text-base text-slate-600 leading-relaxed max-w-lg">
            A trusted municipal directory and skills-matching platform uplifting labor sectors across Sorsogon through government-verified identity credentials, 4-stage job lifecycles, and real-time moderation.
          </p>

          {/* Three Feature Highlight Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-left">
            <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                <Shield className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-slate-900">100% ID-Verified</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Government screening</p>
            </div>

            <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2">
                <Layers className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-slate-900">4-Stage Pipeline</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Progressive disclosure</p>
            </div>

            <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center mb-2">
                <Activity className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-slate-900">Real-Time Sync</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Instant SSE moderation</p>
            </div>
          </div>

          {/* Mini Live Chat Notification Bubble (Sleek Compact Representation) */}
          <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/90 shadow-sm flex items-center gap-3.5 max-w-md mx-auto lg:mx-0 text-left">
            <div className="w-10 h-10 rounded-xl bg-primary text-white font-bold flex items-center justify-center text-sm flex-shrink-0 shadow-xs">
              S
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-900 truncate">Job Offer Locked · ₱650/day</p>
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Verified
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                Roland B. accepted offer for Carpentry & Repair at Bulan.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Prominent, Clean, Elevated Admin Sign-In Card */}
        <div className="w-full sm:w-[420px] bg-white rounded-3xl border border-slate-200 shadow-xl p-8 sm:p-9 relative z-20 animate-slide-up flex-shrink-0">
          
          {/* Card Header */}
          <div className="mb-6 text-left">
            <div className="w-11 h-11 bg-primary/10 rounded-2xl flex items-center justify-center mb-3.5 text-primary shadow-xs">
              <LogIn className="w-5 h-5" />
            </div>
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
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl mb-5 text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
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
                  <>
                    <span>Sign In to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
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

          {/* Micro Trust Guarantee Footer */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              256-Bit SSL Encrypted
            </span>
            <span className="font-semibold text-slate-600">PESO Sorsogon</span>
          </div>
        </div>
      </main>

      {/* ── Refined Clean Bottom Footer ───────────────────────────────────── */}
      <footer className="w-full bg-white border-t border-slate-200 py-3.5 px-6 text-center text-xs text-slate-500 font-body relative z-20">
        <p>&copy; {new Date().getFullYear()} SIKAP Capstone Project · Sorsogon State University & LGU Bulan Platform</p>
      </footer>
    </div>
  );
}

