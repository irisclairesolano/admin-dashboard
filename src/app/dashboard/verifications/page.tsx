'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { adminApi } from '@/lib/api';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export default function VerificationsPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchVerifications = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getVerifications();
      setUsers(res.data.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load verifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerifications();
  }, []);

  const handleVerify = async (id: number, status: 'approved' | 'rejected') => {
    try {
      setActionLoading(true);
      await adminApi.verifyUser(id, status);
      setSelectedUser(null);
      fetchVerifications(); // Refresh list
    } catch (err: any) {
      alert('Action failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="text-center py-20 font-body text-ink-muted">Loading verifications...</div>;
  if (error) return <div className="text-center py-20 text-status-error font-body">{error}</div>;

  const pendingUsers = users.filter(u => u.registration_status === 'pending_review');

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-4xl font-display text-transparent bg-clip-text bg-gradient-to-r from-ink to-primary-dark font-bold">ID Verifications</h1>
        <p className="text-ink-soft font-body mt-2 text-lg">
          Review and approve user-submitted government IDs to grant platform access.
        </p>
      </div>

      <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-white/50 overflow-hidden transition-all hover:shadow-lg">
        {pendingUsers.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 bg-status-success/10 rounded-full flex items-center justify-center mb-6 shadow-inner animate-pulse-slow">
              <CheckCircle2 className="w-12 h-12 text-status-success" />
            </div>
            <h3 className="font-display text-2xl text-ink">All caught up!</h3>
            <p className="font-body text-ink-soft mt-3 text-lg">There are no pending ID verifications at the moment.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body">
              <thead className="bg-white/50 border-b border-ink-faint/50">
                <tr>
                  <th className="px-8 py-5 font-body-semibold text-ink-soft text-sm uppercase tracking-wider">User</th>
                  <th className="px-8 py-5 font-body-semibold text-ink-soft text-sm uppercase tracking-wider">Role</th>
                  <th className="px-8 py-5 font-body-semibold text-ink-soft text-sm uppercase tracking-wider">Submitted At</th>
                  <th className="px-8 py-5 font-body-semibold text-ink-soft text-sm uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-faint/30">
                {pendingUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-white/60 transition-colors duration-200">
                    <td className="px-8 py-5">
                      <div className="flex items-center">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-accent-sky to-accent-skyDeep/40 flex items-center justify-center text-primary-dark font-body-bold text-lg shadow-inner">
                          {user.name.charAt(0)}
                        </div>
                        <div className="ml-5">
                          <div className="font-body-bold text-ink">{user.name}</div>
                          <div className="text-sm text-ink-muted mt-0.5">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-4 py-1.5 rounded-full text-xs font-body-bold tracking-wide uppercase shadow-sm ${
                        user.role === 'employer' ? 'bg-accent-peach border border-accent-peachBright/50 text-primary-dark' : 'bg-accent-mint border border-accent-mintDeep/30 text-accent-mintDeep'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-sm font-body-medium text-ink-soft">
                      {new Date(user.updated_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="bg-ink text-white px-4 py-2 rounded-lg text-sm font-body-medium hover:bg-ink-soft transition-colors"
                      >
                        Review ID
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-ink/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-ink-faint flex justify-between items-center bg-paper-cream">
              <h2 className="font-display text-2xl text-ink">Review ID Document</h2>
              <button onClick={() => !actionLoading && setSelectedUser(null)} className="text-ink-muted hover:text-ink">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="flex justify-between mb-6">
                <div>
                  <h3 className="font-body-bold text-ink text-lg">{selectedUser.name}</h3>
                  <p className="text-ink-soft font-body">{selectedUser.email}</p>
                </div>
                <div className="text-right">
                  <span className="capitalize font-body-medium text-ink-muted bg-paper px-3 py-1 rounded-lg border border-ink-faint">
                    Role: {selectedUser.role}
                  </span>
                </div>
              </div>

              <div className="bg-paper rounded-xl border border-ink-faint p-2 mb-6">
                {selectedUser.document_url ? (
                  <div className="relative w-full h-[400px]">
                    <Image 
                      src={selectedUser.document_url} 
                      alt="ID Document" 
                      fill
                      className="object-contain rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="py-20 flex flex-col items-center text-ink-muted">
                    <AlertCircle className="w-12 h-12 mb-2" />
                    <p>No document URL provided.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-ink-faint bg-white flex justify-end space-x-4">
              <button
                disabled={actionLoading}
                onClick={() => handleVerify(selectedUser.id, 'rejected')}
                className="px-6 py-3 border border-status-error text-status-error font-body-semibold rounded-xl hover:bg-status-error/10 transition-colors disabled:opacity-50"
              >
                Reject ID
              </button>
              <button
                disabled={actionLoading}
                onClick={() => handleVerify(selectedUser.id, 'approved')}
                className="px-6 py-3 bg-status-success text-white font-body-semibold rounded-xl hover:bg-status-success/90 transition-colors disabled:opacity-50 flex items-center"
              >
                {actionLoading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>}
                Approve & Verify
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
