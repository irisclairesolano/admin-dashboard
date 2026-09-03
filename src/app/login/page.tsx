'use client';

import { adminApi, warmUpServer } from '@/lib/api';
import {
  LogIn,
  ShieldCheck,
  CheckCircle2,
  Star,
  Lock,
  Mail,
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff,
  Building2,
  Check
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
    <div className="min-h-screen bg-[#F0F7FA] text-ink relative flex flex-col justify-between overflow-x-hidden selection:bg-primary selection:text-white">
      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <header className="w-full z-30 px-6 sm:px-12 py-4 flex items-center justify-between bg-white/70 backdrop-blur-md border-b border-white/60 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative h-9 w-32 flex items-center">
            <Image
              src="/logo/04_Wordmark.png"
              alt="SIKAP Logo"
              width={128}
              height={36}
              priority
              className="object-contain"
            />
          </div>
          <span className="hidden sm:inline-flex items-center text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-0.5 rounded-full border border-primary/20">
            Admin Portal
          </span>
        </div>

        {/* Center Links (Desktop only) */}
        <nav className="hidden lg:flex items-center gap-8 text-sm font-body font-semibold text-ink-soft">
          <span className="hover:text-primary transition-colors cursor-pointer flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-primary" /> Identity Verification
          </span>
          <span className="hover:text-primary transition-colors cursor-pointer flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-emerald-600" /> PESO & LGU Network
          </span>
          <span className="hover:text-primary transition-colors cursor-pointer flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" /> AI-Driven Analytics
          </span>
        </nav>

        {/* Right Status Badges */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>API Online</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-ink-faint shadow-xs text-xs font-semibold text-ink-soft">
            <span className="text-sm">🇵🇭</span>
            <span>Sorsogon, PH</span>
          </div>
        </div>
      </header>

      {/* ── Main Hero & Content Canvas ────────────────────────────────────── */}
      <main className="relative z-20 flex-1 max-w-7xl mx-auto w-full px-6 sm:px-10 py-8 lg:py-12 flex flex-col lg:flex-row items-center justify-between gap-12">
        
        {/* Left Column: Vision & Brand Story */}
        <div className="flex-1 max-w-xl text-center lg:text-left animate-slide-up">
          {/* Top Category Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent-peach/30 border border-accent-peach text-primary-dark text-xs font-bold tracking-wide uppercase mb-6 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Decentralized Skills Marketplace
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-[54px] font-black tracking-tight text-ink leading-[1.15] mb-6">
            Connecting Skills,<br />
            <span className="text-primary bg-gradient-to-r from-primary to-primary-soft bg-clip-text text-transparent">
              Empowering Local Work.
            </span>
          </h1>

          <p className="font-body text-base sm:text-lg text-ink-soft leading-relaxed mb-8">
            SIKAP connects certified local workers with verified employers across Sorsogon and Bulan through government-backed identity screening, tamper-proof job matching, and real-time moderation.
          </p>

          {/* Social Proof & Trust Badges */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
            <div className="flex items-center gap-3 bg-white/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/80 shadow-sm">
              <div className="flex items-center text-amber-500">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <div className="text-left border-l border-ink-faint pl-3">
                <span className="block text-xs font-extrabold text-ink font-numeric">4.9 / 5.0</span>
                <span className="block text-[10px] font-medium text-ink-muted">Verified Community Rating</span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2.5 rounded-2xl text-emerald-800 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>100% ID Verified</span>
            </div>
          </div>
        </div>

        {/* Center/Right Combined: Live Smartphone Mockup + Floating Sign-In Card */}
        <div className="w-full lg:w-auto flex flex-col sm:flex-row items-center justify-center gap-8 relative">
          
          {/* ── Realistic Smartphone Mockup (Illustration Feature) ──────────── */}
          <div className="hidden xl:block relative w-[290px] h-[580px] bg-slate-900 rounded-[44px] p-3 shadow-2xl border-4 border-slate-800 ring-1 ring-white/40 flex-shrink-0 animate-fade-in">
            {/* Phone Speaker Notch */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-900 rounded-full z-30 flex items-center justify-center">
              <div className="w-12 h-1 bg-slate-700 rounded-full" />
              <div className="w-2.5 h-2.5 bg-slate-800 rounded-full ml-2" />
            </div>

            {/* Inner Screen */}
            <div className="w-full h-full bg-[#FAFBFD] rounded-[34px] overflow-hidden flex flex-col pt-8 pb-3 px-3 relative border border-slate-200">
              
              {/* Mini App Top Header */}
              <div className="flex items-center justify-between pb-3 border-b border-ink-faint/60">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center text-white text-[10px] font-bold">
                    S
                  </div>
                  <span className="font-display font-bold text-xs text-ink">SIKAP</span>
                </div>
                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Negotiating
                </span>
              </div>

              {/* Chat Thread */}
              <div className="flex-1 py-3 space-y-2.5 text-[11px] font-body overflow-hidden">
                {/* Worker Message */}
                <div className="flex items-start gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-accent-peach flex items-center justify-center text-[10px] font-bold text-primary-dark flex-shrink-0 mt-0.5">
                    R
                  </div>
                  <div className="bg-white p-2.5 rounded-2xl rounded-tl-xs border border-ink-faint/60 shadow-xs max-w-[85%] text-ink">
                    <p className="font-semibold text-primary text-[10px]">Roland B. (Carpenter)</p>
                    <p className="mt-0.5 text-[10px] text-ink-soft leading-tight">
                      Good day! My government ID and masonry certifications are verified.
                    </p>
                  </div>
                </div>

                {/* Employer Offer Lock Bubble */}
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-2 text-[10px] text-primary-dark">
                  <div className="flex items-center gap-1 font-bold text-primary">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Offer Locked: ₱650 / day</span>
                  </div>
                  <p className="text-[9px] text-ink-muted mt-0.5">Location: San Rafael, Bulan</p>
                </div>

                {/* Worker Confirmation */}
                <div className="flex justify-end">
                  <div className="bg-primary text-white p-2.5 rounded-2xl rounded-tr-xs shadow-xs max-w-[85%]">
                    <p className="text-[10px] leading-tight font-medium">
                      Agreed! Ready to start tomorrow at 8:00 AM. Thank you!
                    </p>
                    <span className="block text-[8px] text-white/70 text-right mt-1">09:30 AM · Verified</span>
                  </div>
                </div>
              </div>

              {/* Simulated Input Bar */}
              <div className="pt-2 border-t border-ink-faint/60 flex items-center gap-2">
                <div className="flex-1 bg-white border border-ink-faint rounded-full px-3 py-1.5 text-[10px] text-ink-muted">
                  Type agreement details...
                </div>
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>

          {/* ── Floating Administrator Login Card ─────────────────────────── */}
          <div className="w-full sm:w-[410px] bg-white/90 backdrop-blur-xl p-8 sm:p-9 rounded-3xl border border-white/80 shadow-2xl relative z-10 animate-slide-up">
            
            {/* Form Header */}
            <div className="mb-6 text-center sm:text-left">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 text-primary mx-auto sm:mx-0 shadow-inner">
                <LogIn className="w-6 h-6" />
              </div>
              <h2 className="font-display text-2xl font-black text-ink tracking-tight">
                {mfaRequired ? 'Two-Factor Challenge' : 'Administrator Portal'}
              </h2>
              <p className="font-body text-xs text-ink-muted mt-1 leading-relaxed">
                {mfaRequired
                  ? 'Enter the 6-digit TOTP code generated by Google Authenticator or Authy.'
                  : 'Enter authorized administrative credentials to manage municipal workforce operations.'}
              </p>
            </div>

            {/* Error Message Alert */}
            {error && (
              <div className="bg-status-error/10 border border-status-error/20 text-status-error px-4 py-3 rounded-2xl mb-5 text-xs font-body font-semibold flex items-center gap-2 animate-fade-in">
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
                  <label className="block font-body font-semibold text-ink-soft text-xs mb-1.5">
                    Email Address
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-ink-muted absolute left-3.5 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-paper/60 rounded-xl border border-ink-faint focus:bg-white focus:border-primary/60 focus:ring-4 focus:ring-primary/10 outline-none font-body text-sm text-ink transition-all shadow-xs placeholder:text-ink-muted/50"
                      placeholder="admin@sikap.ph"
                      required
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <label className="block font-body font-semibold text-ink-soft text-xs mb-1.5">
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-ink-muted absolute left-3.5 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-11 py-3 bg-paper/60 rounded-xl border border-ink-faint focus:bg-white focus:border-primary/60 focus:ring-4 focus:ring-primary/10 outline-none font-body text-sm text-ink transition-all shadow-xs placeholder:text-ink-muted/50"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 text-ink-muted hover:text-ink p-1 cursor-pointer"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Sign-in CTA Button */}
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
                  <label className="block font-body font-semibold text-ink-soft text-xs mb-1.5">
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    className="w-full px-4 py-3 bg-paper/60 rounded-xl border border-ink-faint focus:bg-white focus:border-primary/60 focus:ring-4 focus:ring-primary/10 outline-none font-mono text-center text-xl tracking-widest text-ink font-bold transition-all shadow-xs placeholder:text-ink-muted/50"
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
                  className="w-full text-center text-xs font-semibold text-ink-soft hover:text-primary transition-colors mt-2 block"
                >
                  &larr; Back to password login
                </button>
              </form>
            )}

            {/* Micro Trust Guarantee Footer */}
            <div className="mt-6 pt-4 border-t border-ink-faint/60 flex items-center justify-between text-[10px] text-ink-muted font-medium">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                256-Bit SSL Encrypted
              </span>
              <span>PESO Sorsogon</span>
            </div>
          </div>
        </div>
      </main>

      {/* ── Scenic Landscape Vector Illustration (Bottom Skyline) ────────── */}
      <div className="relative w-full overflow-hidden leading-none pointer-events-none z-10 mt-auto">
        <svg
          viewBox="0 0 1440 220"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto min-h-[140px] max-h-[220px] object-cover"
          preserveAspectRatio="none"
        >
          {/* Distant Hills Layer 1 */}
          <path
            d="M0 130C240 80 480 150 720 110C960 70 1200 130 1440 90V220H0V130Z"
            fill="#BCE1DC"
            fillOpacity="0.45"
          />

          {/* Sorsogon Mountains / Municipal Silhouette Layer 2 */}
          <path
            d="M0 160C180 120 360 170 540 140C720 110 900 160 1080 130C1260 100 1380 140 1440 135V220H0V160Z"
            fill="#80C8BC"
            fillOpacity="0.55"
          />

          {/* Near Grass Hills Layer 3 */}
          <path
            d="M0 180C300 150 600 200 900 170C1200 140 1350 185 1440 180V220H0V180Z"
            fill="#3FA391"
            fillOpacity="0.85"
          />

          {/* Front Foreground Grass Strip */}
          <rect y="200" width="1440" height="20" fill="#2C8373" />

          {/* Stylized Modern Building Silhouettes */}
          <rect x="180" y="110" width="30" height="60" rx="3" fill="#A4D8CF" fillOpacity="0.7" />
          <rect x="220" y="90" width="35" height="80" rx="3" fill="#80C8BC" fillOpacity="0.8" />
          <rect x="265" y="120" width="25" height="50" rx="3" fill="#A4D8CF" fillOpacity="0.7" />

          <rect x="1180" y="95" width="40" height="80" rx="3" fill="#80C8BC" fillOpacity="0.7" />
          <rect x="1230" y="75" width="35" height="100" rx="3" fill="#A4D8CF" fillOpacity="0.8" />
          <rect x="1275" y="110" width="30" height="65" rx="3" fill="#80C8BC" fillOpacity="0.7" />

          {/* Stylized Foliage / Trees */}
          <circle cx="120" cy="175" r="18" fill="#2C8373" />
          <circle cx="140" cy="180" r="14" fill="#3FA391" />
          <circle cx="1120" cy="165" r="22" fill="#2C8373" />
          <circle cx="1145" cy="170" r="16" fill="#3FA391" />
          <circle cx="650" cy="185" r="15" fill="#2C8373" />
        </svg>
      </div>

      {/* ── Sub-Footer ────────────────────────────────────────────────────── */}
      <footer className="w-full bg-[#2C8373] text-white/80 py-3 px-6 text-center text-xs font-body relative z-20">
        <p>&copy; {new Date().getFullYear()} SIKAP Project · Sorsogon State University & LGU Bulan Partnered Platform</p>
      </footer>
    </div>
  );
}
