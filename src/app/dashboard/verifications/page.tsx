'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';

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
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-display text-ink">ID Verifications</h1>
        <p className="text-ink-soft font-body mt-2">
          Review and approve user-submitted government IDs to grant platform access.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-ink-faint overflow-hidden">
        {pendingUsers.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="w-16 h-16 text-status-success mb-4" />
            <h3 className="font-display text-xl text-ink">All caught up!</h3>
            <p className="font-body text-ink-soft mt-2">There are no pending ID verifications at the moment.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body">
              <thead className="bg-paper-cream border-b border-ink-faint">
                <tr>
                  <th className="px-6 py-4 font-body-semibold text-ink-soft text-sm">User</th>
                  <th className="px-6 py-4 font-body-semibold text-ink-soft text-sm">Role</th>
                  <th className="px-6 py-4 font-body-semibold text-ink-soft text-sm">Submitted At</th>
                  <th className="px-6 py-4 font-body-semibold text-ink-soft text-sm text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-faint">
                {pendingUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-paper/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-accent-sky flex items-center justify-center text-primary-dark font-body-bold">
                          {user.name.charAt(0)}
                        </div>
                        <div className="ml-4">
                          <div className="font-body-medium text-ink">{user.name}</div>
                          <div className="text-sm text-ink-muted">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-body-semibold capitalize ${
                        user.role === 'employer' ? 'bg-accent-peach text-primary-dark' : 'bg-accent-mint text-accent-mintDeep'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-ink-soft">
                      {new Date(user.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
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
                  <img 
                    src={selectedUser.document_url} 
                    alt="ID Document" 
                    className="w-full h-auto object-contain max-h-[400px] rounded-lg"
                  />
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
