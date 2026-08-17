'use client';

import React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { LogIn } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await adminApi.login(email, password);
      const user = res.data.user;
      
      if (user.role !== 'admin') {
        setError('Access denied. Admin privileges required.');
        setLoading(false);
        return;
      }
      
      localStorage.setItem('admin_token', res.data.token);
      localStorage.setItem('admin_user', JSON.stringify(user));
      
      router.push('/dashboard/verifications');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative soft pastel background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-accent-peach/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse-slow"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-accent-sky/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse-slow" style={{ animationDelay: '1.5s' }}></div>
      <div className="absolute top-[30%] right-[10%] w-[400px] h-[400px] bg-primary-tint/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse-slow" style={{ animationDelay: '3s' }}></div>

      <div className="bg-white/80 backdrop-blur-md p-10 rounded-xl shadow-lg border border-white/50 max-w-md w-full relative z-10 animate-slide-up hover:shadow-xl transition-all duration-300">
        <div className="flex flex-col items-center mb-10 relative">
          <div className="absolute -top-16 bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-sm border border-white/50">
            <div className="w-16 h-16 bg-accent-peach rounded-xl flex items-center justify-center shadow-inner">
              <LogIn className="w-8 h-8 text-primary-dark" />
            </div>
          </div>
          <img 
            src="/logo/04_Wordmark.png" 
            alt="SIKAP Logo" 
            className="h-12 object-contain mt-12 mb-2" 
          />
          <h2 className="font-display text-xl text-ink-soft font-semibold">Admin Portal</h2>
          <p className="font-body text-ink-muted mt-2 text-center text-sm">
            Sign in to manage SIKAP verifications and user accounts.
          </p>
        </div>

        {error && (
          <div className="bg-status-error/10 backdrop-blur-sm border border-status-error/20 text-status-error px-4 py-3 rounded-xl mb-6 text-sm font-body font-semibold animate-fade-in flex items-center">
            <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6 relative">
          <div className="group">
            <label className="block font-body font-semibold text-ink-soft text-sm mb-2 group-focus-within:text-primary transition-colors">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-5 py-3.5 bg-white/60 rounded-xl border border-ink-faint focus:bg-white focus:border-primary/50 outline-none font-body transition-all shadow-sm focus:shadow-md"
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
              className="w-full px-5 py-3.5 bg-white/60 rounded-xl border border-ink-faint focus:bg-white focus:border-primary/50 outline-none font-body transition-all shadow-sm focus:shadow-md"
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
              'Secure Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
