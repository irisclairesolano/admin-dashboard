'use client';

import { adminApi, warmUpServer } from '@/lib/api';
import {
  LogIn,
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
      <main className="relative z-20 flex-1 max-w-7xl mx-auto w-full px-6 sm:px-10 lg:px-16 py-12 lg:py-16 flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-14">
        
        {/* Left Column: Vision, Value Prop & Live App Preview */}
        <div className="flex-1 max-w-xl text-center lg:text-left space-y-6 animate-slide-up">
          
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

          <p className="font-body text-sm sm:text-base text-slate-600 leading-relaxed max-w-lg">
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

          {/* Institutional Note */}
          <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-3.5 max-w-md mx-auto lg:mx-0 text-left">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900">Sorsogon State University & LGU Bulan</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                SIKAP Mobile Job Platform · Administrative Oversight Console
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
        </div>
      </main>

      {/* ── Comprehensive Professional Footer ─────────────────────────────── */}
      <footer className="w-full bg-white border-t border-slate-200/90 pt-12 pb-8 px-6 sm:px-10 lg:px-16 text-slate-600 font-body relative z-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          
          {/* Col 1: Brand & Mission */}
          <div className="space-y-3">
            <div className="relative h-8 w-28 flex items-center">
              <Image
                src="/logo/04_Wordmark.png"
                alt="SIKAP Logo"
                width={112}
                height={32}
                className="object-contain"
              />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              A dedicated mobile job platform and administrative management portal connecting local workers with nearby employment opportunities across Bulan, Sorsogon.
            </p>
          </div>

          {/* Col 2: Core Platform Capabilities */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3.5">
              Platform Features
            </h4>
            <ul className="space-y-2 text-xs text-slate-500">
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <span>Identity Verification</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>Job Postings & Applications</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <span>User Reports & Moderation</span>
              </li>
              <li className="flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                <span>Activity Logs & Analytics</span>
              </li>
            </ul>
          </div>

          {/* Col 3: Institutional Partnerships */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3.5">
              Institutional Partners
            </h4>
            <ul className="space-y-2 text-xs text-slate-500">
              <li className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                <span>Sorsogon State University</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                <span>LGU Bulan, Sorsogon</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                <span>Public Employment Service Office</span>
              </li>
            </ul>
          </div>

          {/* Col 4: Compliance & Security */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3.5">
              Compliance & Security
            </h4>
            <ul className="space-y-2 text-xs text-slate-500">
              <li>Data Privacy Act of 2012 (RA 10173)</li>
              <li>Two-Factor Authentication (TOTP)</li>
              <li>Role-Based Access Control (RBAC)</li>
              <li>Encrypted Credential Storage</li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright Strip */}
        <div className="max-w-7xl mx-auto pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} SIKAP Capstone Project. All rights reserved.</p>
          <p className="text-[11px] text-slate-500">
            Sorsogon State University & LGU Bulan Platform
          </p>
        </div>
      </footer>
    </div>
  );
}


