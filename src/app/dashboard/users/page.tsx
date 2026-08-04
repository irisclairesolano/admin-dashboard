'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { UserX, Trash2, Search, ShieldAlert, Eye } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [selectedIdUser, setSelectedIdUser] = useState<any | null>(null);

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

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white/70 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm focus:bg-white focus:border-primary/50 focus:ring-4 focus:ring-primary/10 outline-none font-body transition-all group-hover:shadow-md"
          />
          <Search className="w-5 h-5 text-ink-muted absolute left-4 top-4 transition-colors group-focus-within:text-primary" />
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
                <th className="px-8 py-5 font-body-semibold text-ink-soft text-sm uppercase tracking-wider">User Details</th>
                <th className="px-8 py-5 font-body-semibold text-ink-soft text-sm uppercase tracking-wider">Role & Status</th>
                <th className="px-8 py-5 font-body-semibold text-ink-soft text-sm uppercase tracking-wider">Joined</th>
                <th className="px-8 py-5 font-body-semibold text-ink-soft text-sm uppercase tracking-wider text-right">Actions</th>
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
                filteredUsers.map((user) => (
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
                          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-body-bold text-lg shadow-inner ${
                            user.is_suspended ? 'bg-status-error/20 text-status-error' : 'bg-gradient-to-br from-accent-sky to-accent-skyDeep/40 text-primary-dark'
                          }`}>
                            {user.name.charAt(0)}
                          </div>
                        )}
                        <div className="ml-5">
                          <div className={`font-body-bold ${user.is_suspended ? 'text-status-error' : 'text-ink'}`}>{user.name}</div>
                          <div className="text-sm text-ink-muted mt-0.5">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col space-y-2 items-start">
                        <span className={`px-4 py-1.5 rounded-full text-xs font-body-bold tracking-wide uppercase shadow-sm ${
                          user.role === 'employer' ? 'bg-accent-peach border border-accent-peachBright/50 text-primary-dark' : 'bg-accent-mint border border-accent-mintDeep/30 text-accent-mintDeep'
                        }`}>
                          {user.role}
                        </span>
                        {user.is_suspended && (
                          <span className="flex items-center text-xs font-body-semibold text-status-error bg-status-error/10 px-3 py-1 rounded-full border border-status-error/20">
                            <ShieldAlert className="w-3 h-3 mr-1.5" /> Suspended
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm font-body-medium text-ink-soft">
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
                        <span className="text-xs font-body-bold text-ink-muted uppercase tracking-wider bg-ink-faint/50 px-3 py-1.5 rounded-lg border border-ink-faint">Protected Admin</span>
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
                  <h3 className="font-body-bold text-ink text-lg">{selectedIdUser.name}</h3>
                  <p className="text-ink-soft font-body">{selectedIdUser.email}</p>
                </div>
                <div className="text-right">
                  <span className="capitalize font-body-medium text-ink-muted bg-paper px-3 py-1 rounded-lg border border-ink-faint">
                    Role: {selectedIdUser.role}
                  </span>
                </div>
              </div>

              <div className="bg-paper rounded-xl border border-ink-faint p-2 mb-6">
                {selectedIdUser.document_url ? (
                  <div className="relative w-full h-[400px] flex items-center justify-center bg-black/5 rounded-lg overflow-hidden">
                    <img 
                      src={selectedIdUser.document_url} 
                      alt="Government ID" 
                      className="max-w-full max-h-full object-contain rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="py-20 flex flex-col items-center text-ink-muted">
                    <p>No document URL available.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-ink-faint bg-white flex justify-end">
              <button
                onClick={() => setSelectedIdUser(null)}
                className="px-6 py-3 bg-ink text-white font-body-semibold rounded-xl hover:bg-ink-soft transition-colors"
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
