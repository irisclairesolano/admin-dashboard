'use client';

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
      {/* Decorative background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary-soft/40 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse-slow"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-accent-sky/40 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse-slow" style={{ animationDelay: '1.5s' }}></div>

      <div className="bg-white/70 backdrop-blur-xl p-10 rounded-3xl shadow-glass border border-white/50 max-w-md w-full relative z-10 animate-slide-up hover:shadow-glass-hover transition-shadow duration-500">
        <div className="flex flex-col items-center mb-10 relative">
          <div className="absolute -top-16 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-white/50">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center shadow-inner">
              <LogIn className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="font-display text-4xl text-transparent bg-clip-text bg-gradient-to-r from-ink to-primary-dark font-bold mt-12">Admin Portal</h1>
          <p className="font-body text-ink-soft mt-3 text-center text-lg">
            Sign in to manage SIKAP verifications and user accounts.
          </p>
        </div>

        {error && (
          <div className="bg-status-error/10 backdrop-blur-sm border border-status-error/50 text-status-error px-4 py-3 rounded-xl mb-6 text-sm font-body-semibold animate-fade-in flex items-center">
            <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6 relative">
          <div className="group">
            <label className="block font-body-semibold text-ink-soft text-sm mb-2 group-focus-within:text-primary transition-colors">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-5 py-3.5 bg-white/60 rounded-xl border border-white focus:bg-white focus:border-primary/50 focus:ring-4 focus:ring-primary/10 outline-none font-body transition-all shadow-sm"
              placeholder="admin@sikap.app"
              required
            />
          </div>
          
          <div className="group">
            <label className="block font-body-semibold text-ink-soft text-sm mb-2 group-focus-within:text-primary transition-colors">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-3.5 bg-white/60 rounded-xl border border-white focus:bg-white focus:border-primary/50 focus:ring-4 focus:ring-primary/10 outline-none font-body transition-all shadow-sm"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-white font-body-bold py-4 rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex justify-center items-center text-lg mt-8"
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
