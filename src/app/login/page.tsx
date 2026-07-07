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
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-ink-faint">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary-soft rounded-full flex items-center justify-center mb-4">
            <LogIn className="w-8 h-8 text-primary-dark" />
          </div>
          <h1 className="font-display text-3xl text-ink">Admin Portal</h1>
          <p className="font-body text-ink-soft mt-2 text-center">
            Sign in to manage SIKAP verifications and user accounts.
          </p>
        </div>

        {error && (
          <div className="bg-status-error/10 border border-status-error text-status-error px-4 py-3 rounded-lg mb-6 text-sm font-body-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block font-body-semibold text-ink text-sm mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-ink-faint focus:border-primary focus:ring-2 focus:ring-primary-soft outline-none font-body transition-all"
              placeholder="admin@sikap.app"
              required
            />
          </div>
          
          <div>
            <label className="block font-body-semibold text-ink text-sm mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-ink-faint focus:border-primary focus:ring-2 focus:ring-primary-soft outline-none font-body transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark text-white font-body-semibold py-3 rounded-xl transition-colors flex justify-center items-center h-12"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
