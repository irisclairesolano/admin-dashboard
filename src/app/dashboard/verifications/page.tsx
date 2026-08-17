'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { CheckCircle2, XCircle, Search, ArrowLeft, ArrowRight } from 'lucide-react';

export default function VerificationsPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState<'approved' | 'rejected' | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 5;

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
      await adminApi.verifyUser(id, status, status === 'rejected' ? rejectionReason : undefined);
      
      // Instantly remove the verified/rejected user from state
      setUsers((prev) => prev.filter((u) => u.id !== id));
      
      setSelectedUser(null);
      setIsRejecting(false);
      setRejectionReason('');
      fetchVerifications(); // Refresh list
    } catch (err: any) {
      alert('Action failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  if (error) return <div className="text-center py-20 text-status-error font-body">{error}</div>;

  const pendingUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch && (u.registration_status === 'pending_review' || (u.verification_status === 'pending' && u.document_url));
  }).sort((a, b) => {
    const dateA = new Date(a.updated_at).getTime();
    const dateB = new Date(b.updated_at).getTime();
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  const totalPages = Math.ceil(pendingUsers.length / itemsPerPage) || 1;
  const paginatedUsers = pendingUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-display text-transparent bg-clip-text bg-gradient-to-r from-ink to-primary-dark font-bold">ID Verifications</h1>
          <p className="text-ink-soft font-body mt-2 text-lg">
            Review and approve user-submitted government IDs to grant platform access.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-6 md:mt-0">
          <div className="relative w-full md:w-64 group">
            <input
              type="text"
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-12 pr-4 py-3.5 bg-white/70 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm focus:bg-white focus:border-primary/50 focus:ring-4 focus:ring-primary/10 outline-none font-body transition-all group-hover:shadow-md"
            />
            <Search className="w-5 h-5 text-ink-muted absolute left-4 top-4 transition-colors group-focus-within:text-primary" />
          </div>

          <select
            value={sortOrder}
            onChange={(e) => {
              setSortOrder(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-4 py-3.5 rounded-xl font-body-semibold text-sm transition-colors whitespace-nowrap bg-white/70 backdrop-blur-md border border-white/50 text-ink-soft focus:bg-white outline-none shadow-sm"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
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
                {paginatedUsers.map((user) => (
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 px-4">
          <p className="text-sm font-body text-ink-soft">
            Page <span className="font-semibold text-ink">{currentPage}</span> of{' '}
            <span className="font-semibold text-ink">{totalPages}</span>
          </p>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2.5 rounded-xl border border-ink-faint/50 bg-white/70 text-ink hover:bg-white/95 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2.5 rounded-xl border border-ink-faint/50 bg-white/70 text-ink hover:bg-white/95 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

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

            {isRejecting ? (
              <div className="p-6 border-t border-ink-faint bg-white bg-status-error/5">
                <h4 className="font-body-bold text-status-error mb-2">Confirm Rejection</h4>
                <p className="text-sm text-ink-soft mb-4">
                  Are you sure you want to reject this ID submission? The user will receive a notification and be prompted to re-submit clear photos of their government ID.
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setIsRejecting(false);
                      setRejectionReason('');
                    }}
                    className="px-4 py-2 text-ink-soft font-body-medium hover:bg-paper rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!!actionLoading}
                    onClick={() => handleVerify(selectedUser.id, 'rejected')}
                    className="px-6 py-2 bg-status-error text-white font-body-semibold rounded-xl hover:bg-status-error/90 transition-colors disabled:opacity-50 flex items-center"
                  >
                    {actionLoading === 'rejected' && (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                    )}
                    Confirm Rejection
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 border-t border-ink-faint bg-white flex justify-end space-x-4">
                <button
                  disabled={!!actionLoading}
                  onClick={() => setIsRejecting(true)}
                  className="px-6 py-3 border border-status-error text-status-error font-body-semibold rounded-xl hover:bg-status-error/10 transition-colors disabled:opacity-50 flex items-center"
                >
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}
