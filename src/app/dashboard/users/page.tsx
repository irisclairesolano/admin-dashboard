'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { UserX, Trash2, Search, ShieldAlert, Eye, CheckCircle2, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'verified' | 'unverified' | 'rejected'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'worker' | 'employer'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [selectedIdUser, setSelectedIdUser] = useState<any | null>(null);

  const itemsPerPage = 10;

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getUsers();
      setUsers(res.data.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSuspend = async (id: number, currentStatus: boolean) => {
    if (!confirm(`Are you sure you want to ${currentStatus ? 'unsuspend' : 'suspend'} this user?`)) return;
    
    try {
      setActionLoading(id);
      await adminApi.suspendUser(id, !currentStatus);
      await fetchUsers(); // Refresh
    } catch (err: any) {
      alert('Failed to update suspension status: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user? This action can be undone later by a database administrator (soft delete).')) return;
    
    try {
      setActionLoading(id);
      await adminApi.deleteUser(id);
      await fetchUsers();
    } catch (err: any) {
      alert('Failed to delete user: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;

    if (filter === 'all') return true;
    if (filter === 'verified') return u.verification_status === 'approved';
    if (filter === 'rejected') return u.verification_status === 'rejected' || u.registration_status === 'rejected';
    if (filter === 'unverified') return u.verification_status !== 'approved' && u.verification_status !== 'rejected' && u.registration_status !== 'rejected';
    
    return true;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (error) return <div className="text-center py-20 text-status-error font-body">{error}</div>;

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-display text-transparent bg-clip-text bg-gradient-to-r from-ink to-primary-dark font-bold">User Management</h1>
          <p className="text-ink-soft font-body mt-2 text-lg">
            Monitor, suspend, or remove users from the platform.
          </p>
        </div>
        
        <div className="mt-6 md:mt-0 relative w-full md:w-80 group">
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-12 pr-4 py-3.5 bg-white/70 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm focus:bg-white focus:border-primary/50 focus:ring-4 focus:ring-primary/10 outline-none font-body transition-all group-hover:shadow-md"
          />
          <Search className="w-5 h-5 text-ink-muted absolute left-4 top-4 transition-colors group-focus-within:text-primary" />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex space-x-2 overflow-x-auto pb-1">
          <button 
             onClick={() => { setFilter('all'); setCurrentPage(1); }}
             className={`px-4 py-2 rounded-xl font-body font-semibold text-sm transition-colors whitespace-nowrap ${filter === 'all' ? 'bg-ink text-white' : 'bg-white/50 text-ink-soft hover:bg-white/80 border border-ink-faint/50'}`}>
            All Users
          </button>
          <button 
             onClick={() => { setFilter('verified'); setCurrentPage(1); }}
             className={`px-4 py-2 rounded-xl font-body font-semibold text-sm transition-colors whitespace-nowrap ${filter === 'verified' ? 'bg-status-success text-white' : 'bg-white/50 text-ink-soft hover:bg-white/80 border border-ink-faint/50'}`}>
            Verified
          </button>
          <button 
             onClick={() => { setFilter('unverified'); setCurrentPage(1); }}
             className={`px-4 py-2 rounded-xl font-body font-semibold text-sm transition-colors whitespace-nowrap ${filter === 'unverified' ? 'bg-status-warning text-white' : 'bg-white/50 text-ink-soft hover:bg-white/80 border border-ink-faint/50'}`}>
            Unverified
          </button>
          <button 
             onClick={() => { setFilter('rejected'); setCurrentPage(1); }}
             className={`px-4 py-2 rounded-xl font-body font-semibold text-sm transition-colors whitespace-nowrap ${filter === 'rejected' ? 'bg-status-error text-white' : 'bg-white/50 text-ink-soft hover:bg-white/80 border border-ink-faint/50'}`}>
            Rejected
          </button>
        </div>

        <div>
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-4 py-2 rounded-xl font-body font-semibold text-sm transition-colors whitespace-nowrap bg-white/70 backdrop-blur-md border border-white/50 text-ink-soft focus:bg-white outline-none"
          >
            <option value="all">All Roles</option>
            <option value="worker">Workers</option>
            <option value="employer">Employers</option>
          </select>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-white/50 overflow-hidden transition-all hover:shadow-lg">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-ink-faint/30 rounded-2xl animate-pulse flex items-center justify-between px-6">
                <div className="w-1/3 h-6 bg-ink-faint/50 rounded-lg"></div>
                <div className="w-1/6 h-6 bg-ink-faint/50 rounded-lg"></div>
                <div className="w-1/4 h-8 bg-ink-faint/50 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body">
            <thead className="bg-white/50 border-b border-ink-faint/50">
              <tr>
                <th className="px-8 py-5 font-body font-semibold text-ink-soft text-sm uppercase tracking-wider">User Details</th>
                <th className="px-8 py-5 font-body font-semibold text-ink-soft text-sm uppercase tracking-wider">Role & Status</th>
                <th className="px-8 py-5 font-body font-semibold text-ink-soft text-sm uppercase tracking-wider">Joined</th>
                <th className="px-8 py-5 font-body font-semibold text-ink-soft text-sm uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
             <tbody className="divide-y divide-ink-faint/30">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-16 text-center text-ink-soft">
                    No users found matching "{searchTerm}"
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr key={user.id} className={`transition-colors duration-200 ${user.is_suspended ? 'bg-status-error/5 hover:bg-status-error/10' : 'hover:bg-white/60'}`}>
                    <td className="px-8 py-5">
                      <div className="flex items-center">
                        {user.avatar_url ? (
                          <img 
                            src={user.avatar_url} 
                            alt={user.name} 
                            className="h-12 w-12 rounded-2xl object-cover shadow-inner"
                          />
                        ) : (
                          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-body font-bold text-lg shadow-inner ${
                            user.is_suspended ? 'bg-status-error/20 text-status-error' : 'bg-gradient-to-br from-accent-sky to-accent-skyDeep/40 text-primary-dark'
                          }`}>
                            {user.name.charAt(0)}
                          </div>
                        )}
                        <div className="ml-5">
                          <div className={`font-body font-bold ${user.is_suspended ? 'text-status-error' : 'text-ink'}`}>{user.name}</div>
                          <div className="text-sm text-ink-muted mt-0.5">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col space-y-2 items-start">
                        <span className={`px-4 py-1.5 rounded-full text-xs font-body font-bold tracking-wide uppercase shadow-sm ${
                          user.role === 'employer' ? 'bg-accent-peach border border-accent-peachBright/50 text-primary-dark' : 'bg-accent-mint border border-accent-mintDeep/30 text-accent-mintDeep'
                        }`}>
                          {user.role}
                        </span>
                        {user.verification_status === 'approved' ? (
                          <span className="flex items-center text-xs font-body font-semibold text-status-success bg-status-success/10 px-3 py-1 rounded-full border border-status-success/20">
                            <CheckCircle2 className="w-3 h-3 mr-1.5" /> Verified
                          </span>
                        ) : user.verification_status === 'pending' ? (
                          <span className="flex items-center text-xs font-body font-semibold text-status-gold bg-status-gold/10 px-3 py-1 rounded-full border border-status-gold/20">
                            <AlertCircle className="w-3 h-3 mr-1.5 text-status-warning" /> Pending Review
                          </span>
                        ) : user.verification_status === 'rejected' || user.registration_status === 'rejected' ? (
                          <div className="flex flex-col gap-1">
                            <span className="flex items-center text-xs font-body font-semibold text-status-error bg-status-error/10 px-3 py-1 rounded-full border border-status-error/20">
                              <AlertCircle className="w-3 h-3 mr-1.5" /> Rejected
                            </span>
                            {user.rejection_reason && (
                              <span className="text-xs text-status-error mt-1 max-w-[200px]">
                                Reason: {user.rejection_reason}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="flex items-center text-xs font-body font-semibold text-ink-muted bg-paper px-3 py-1 rounded-full border border-ink-faint">
                            Unverified
                          </span>
                        )}
                        {user.is_suspended && (
                          <span className="flex items-center text-xs font-body font-semibold text-status-error bg-status-error/10 px-3 py-1 rounded-full border border-status-error/20">
                            <ShieldAlert className="w-3 h-3 mr-1.5" /> Suspended
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm font-body font-medium text-ink-soft">
                      {new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-8 py-5 text-right">
                      {user.role !== 'admin' && (
                        <div className="flex justify-end space-x-3">
                          {user.document_url && (
                            <button
                              onClick={() => setSelectedIdUser(user)}
                              className="p-2.5 rounded-xl bg-white/80 border border-ink-faint/50 text-ink hover:bg-ink hover:text-white transition-all shadow-sm"
                              title="View Government ID"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            disabled={actionLoading === user.id}
                            onClick={() => handleSuspend(user.id, user.is_suspended)}
                            className={`p-2.5 rounded-xl transition-all shadow-sm ${
                              user.is_suspended 
                                ? 'bg-status-warning/20 text-status-warning hover:bg-status-warning hover:text-white' 
                                : 'bg-white/80 border border-ink-faint/50 text-ink hover:bg-ink hover:text-white'
                            }`}
                            title={user.is_suspended ? "Unsuspend User" : "Suspend User"}
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                          <button
                            disabled={actionLoading === user.id}
                            onClick={() => handleDelete(user.id)}
                            className="p-2.5 rounded-xl bg-status-error/10 border border-status-error/20 text-status-error hover:bg-status-error hover:text-white transition-all shadow-sm"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      {user.role === 'admin' && (
                        <span className="text-xs font-body font-bold text-ink-muted uppercase tracking-wider bg-ink-faint/50 px-3 py-1.5 rounded-lg border border-ink-faint">Protected Admin</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
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

      {/* View ID Modal */}
      {selectedIdUser && (
        <div className="fixed inset-0 bg-ink/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-ink-faint flex justify-between items-center bg-paper-cream">
              <h2 className="font-display text-2xl text-ink">Submitted ID Document</h2>
              <button onClick={() => setSelectedIdUser(null)} className="text-ink-muted hover:text-ink">
                <span className="text-2xl font-bold">&times;</span>
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="flex justify-between mb-6">
                <div>
                  <h3 className="font-body font-bold text-ink text-lg">{selectedIdUser.name}</h3>
                  <p className="text-ink-soft font-body">{selectedIdUser.email}</p>
                </div>
                <div className="text-right">
                  <span className="capitalize font-body font-medium text-ink-muted bg-paper px-3 py-1 rounded-lg border border-ink-faint">
                    Role: {selectedIdUser.role}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <span className="block font-body font-semibold text-ink-soft text-sm mb-2">Government ID</span>
                  <div className="bg-paper rounded-xl border border-ink-faint p-2 h-[300px] flex items-center justify-center bg-black/5 overflow-hidden">
                    {selectedIdUser.document_url ? (
                      <img 
                        src={selectedIdUser.document_url} 
                        alt="Government ID" 
                        className="max-w-full max-h-full object-contain rounded-lg"
                      />
                    ) : (
                      <p className="text-ink-muted text-sm font-body font-medium">No ID uploaded</p>
                    )}
                  </div>
                </div>

                <div>
                  <span className="block font-body font-semibold text-ink-soft text-sm mb-2">Selfie holding ID</span>
                  <div className="bg-paper rounded-xl border border-ink-faint p-2 h-[300px] flex items-center justify-center bg-black/5 overflow-hidden">
                    {selectedIdUser.selfie_url ? (
                      <img 
                        src={selectedIdUser.selfie_url} 
                        alt="Selfie holding ID" 
                        className="max-w-full max-h-full object-contain rounded-lg"
                      />
                    ) : (
                      <p className="text-ink-muted text-sm font-body font-medium">No selfie uploaded</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-ink-faint bg-white flex justify-end">
              <button
                onClick={() => setSelectedIdUser(null)}
                className="px-6 py-3 bg-ink text-white font-body font-semibold rounded-xl hover:bg-ink-soft transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
