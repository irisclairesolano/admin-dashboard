'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { UserX, Trash2, Search, ShieldAlert } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

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

  if (loading) return <div className="text-center py-20 font-body text-ink-muted">Loading users...</div>;
  if (error) return <div className="text-center py-20 text-status-error font-body">{error}</div>;

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display text-ink">User Management</h1>
          <p className="text-ink-soft font-body mt-2">
            Monitor, suspend, or remove users from the platform.
          </p>
        </div>
        
        <div className="mt-4 md:mt-0 relative w-full md:w-64">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-ink-faint focus:border-primary focus:ring-1 focus:ring-primary outline-none font-body"
          />
          <Search className="w-5 h-5 text-ink-muted absolute left-3 top-2.5" />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-ink-faint overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body">
            <thead className="bg-paper-cream border-b border-ink-faint">
              <tr>
                <th className="px-6 py-4 font-body-semibold text-ink-soft text-sm">User Details</th>
                <th className="px-6 py-4 font-body-semibold text-ink-soft text-sm">Role & Status</th>
                <th className="px-6 py-4 font-body-semibold text-ink-soft text-sm">Joined</th>
                <th className="px-6 py-4 font-body-semibold text-ink-soft text-sm text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-faint">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-ink-muted">No users found.</td>
                </tr>
              ) : filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-paper/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center font-body-bold ${
                        user.is_suspended ? 'bg-status-error/10 text-status-error' : 'bg-accent-peach text-primary-dark'
                      }`}>
                        {user.name.charAt(0)}
                      </div>
                      <div className="ml-4">
                        <div className="font-body-medium text-ink flex items-center">
                          {user.name}
                          {user.is_suspended && <ShieldAlert className="w-4 h-4 ml-2 text-status-error" />}
                        </div>
                        <div className="text-sm text-ink-muted">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col space-y-1 items-start">
                      <span className="px-2.5 py-1 rounded-md text-xs font-body-semibold capitalize bg-ink-faint text-ink">
                        {user.role}
                      </span>
                      {user.registration_status === 'approved' ? (
                        <span className="text-xs text-status-success font-body-medium">Verified</span>
                      ) : (
                        <span className="text-xs text-status-warning font-body-medium capitalize">
                          {(user.registration_status || 'pending').replace('_', ' ')}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-ink-soft">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {user.role !== 'admin' && (
                      <div className="flex justify-end space-x-2">
                        <button
                          disabled={actionLoading === user.id}
                          onClick={() => handleSuspend(user.id, user.is_suspended)}
                          className={`p-2 rounded-lg transition-colors ${
                            user.is_suspended 
                              ? 'bg-status-warning/10 text-status-warning hover:bg-status-warning/20' 
                              : 'bg-paper text-ink hover:bg-ink hover:text-white'
                          }`}
                          title={user.is_suspended ? "Unsuspend User" : "Suspend User"}
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                        <button
                          disabled={actionLoading === user.id}
                          onClick={() => handleDelete(user.id)}
                          className="p-2 rounded-lg bg-status-error/10 text-status-error hover:bg-status-error hover:text-white transition-colors"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {user.role === 'admin' && (
                      <span className="text-xs text-ink-muted italic">Protected</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
