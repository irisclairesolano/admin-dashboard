'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { CheckCircle2, XCircle } from 'lucide-react';

export default function VerificationsPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState<'approved' | 'rejected' | null>(null);

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
      setActionLoading(status);
      await adminApi.verifyUser(id, status);
      setSelectedUser(null);
      fetchVerifications(); // Refresh list
    } catch (err: any) {
      alert('Action failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(null);
    }
  };

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
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-ink-faint/30 rounded-2xl animate-pulse flex items-center justify-between px-6">
                <div className="w-1/3 h-6 bg-ink-faint/50 rounded-lg"></div>
                <div className="w-1/6 h-6 bg-ink-faint/50 rounded-lg"></div>
                <div className="w-1/4 h-8 bg-ink-faint/50 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : pendingUsers.length === 0 ? (
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
                        {user.avatar_url ? (
                          <img 
                            src={user.avatar_url} 
                            alt={user.name} 
                            className="h-12 w-12 rounded-2xl object-cover shadow-inner"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-accent-sky to-accent-skyDeep/40 flex items-center justify-center text-primary-dark font-body-bold text-lg shadow-inner">
                            {user.name.charAt(0)}
                          </div>
                        )}
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <span className="block font-body-semibold text-ink-soft text-sm mb-2">Government ID (Front)</span>
                  <div className="bg-paper rounded-xl border border-ink-faint p-2 h-[260px] flex items-center justify-center bg-black/5 overflow-hidden">
                    {selectedUser.document_url ? (
                      <img 
                        src={selectedUser.document_url} 
                        alt="ID Front" 
                        className="max-w-full max-h-full object-contain rounded-lg"
                      />
                    ) : (
                      <p className="text-ink-muted text-sm font-body-medium">No Front ID uploaded</p>
                    )}
                  </div>
                </div>

                <div>
                  <span className="block font-body-semibold text-ink-soft text-sm mb-2">Government ID (Back)</span>
                  <div className="bg-paper rounded-xl border border-ink-faint p-2 h-[260px] flex items-center justify-center bg-black/5 overflow-hidden">
                    {selectedUser.document_back_url ? (
                      <img 
                        src={selectedUser.document_back_url} 
                        alt="ID Back" 
                        className="max-w-full max-h-full object-contain rounded-lg"
                      />
                    ) : (
                      <p className="text-ink-muted text-sm font-body-medium">No Back ID uploaded</p>
                    )}
                  </div>
                </div>

                <div>
                  <span className="block font-body-semibold text-ink-soft text-sm mb-2">Selfie holding ID</span>
                  <div className="bg-paper rounded-xl border border-ink-faint p-2 h-[260px] flex items-center justify-center bg-black/5 overflow-hidden">
                    {selectedUser.selfie_url ? (
                      <img 
                        src={selectedUser.selfie_url} 
                        alt="Selfie holding ID" 
                        className="max-w-full max-h-full object-contain rounded-lg"
                      />
                    ) : (
                      <p className="text-ink-muted text-sm font-body-medium">
                        {selectedUser.role === 'employer' ? 'Selfie not required for employers' : 'No selfie uploaded'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {selectedUser.role === 'employer' && selectedUser.business_documents && selectedUser.business_documents.length > 0 && (
                <div className="mt-6 border-t border-ink-faint pt-6">
                  <span className="block font-body-semibold text-ink-soft text-sm mb-3">Uploaded Business Documents</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {selectedUser.business_documents.map((doc: string, idx: number) => {
                      const isPdf = doc.toLowerCase().includes('.pdf') || doc.includes('token=') && doc.toLowerCase().includes('%2fpdf') || doc.toLowerCase().includes('pdf');
                      return (
                        <div key={idx} className="bg-paper rounded-xl border border-ink-faint p-2 h-[180px] flex flex-col items-center justify-center bg-black/5 overflow-hidden relative group">
                          {isPdf ? (
                            <div className="flex flex-col items-center justify-center">
                              <svg className="w-12 h-12 text-status-error mb-2" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"/><path d="M9 9a1 1 0 00-1 1v3a1 1 0 102 0v-3a1 1 0 00-1-1z"/></svg>
                              <span className="text-xs text-ink-soft font-body-semibold">Business Doc {idx + 1}</span>
                              <a href={doc} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline mt-2">Open PDF</a>
                            </div>
                          ) : (
                            <>
                              <img 
                                src={doc} 
                                alt={`Business Doc ${idx + 1}`} 
                                className="max-w-full max-h-full object-contain rounded-lg"
                              />
                              <a href={doc} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-body-bold rounded-lg">
                                View Full Image
                              </a>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-ink-faint bg-white flex justify-end space-x-4">
              <button
                disabled={!!actionLoading}
                onClick={() => handleVerify(selectedUser.id, 'rejected')}
                className="px-6 py-3 border border-status-error text-status-error font-body-semibold rounded-xl hover:bg-status-error/10 transition-colors disabled:opacity-50 flex items-center"
              >
                {actionLoading === 'rejected' && <span className="w-4 h-4 border-2 border-status-error border-t-transparent rounded-full animate-spin mr-2"></span>}
                Reject ID
              </button>
              <button
                disabled={!!actionLoading}
                onClick={() => handleVerify(selectedUser.id, 'approved')}
                className="px-6 py-3 bg-status-success text-white font-body-semibold rounded-xl hover:bg-status-success/90 transition-colors disabled:opacity-50 flex items-center"
              >
                {actionLoading === 'approved' && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>}
                Approve & Verify
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
