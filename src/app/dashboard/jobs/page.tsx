'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { Briefcase, Trash2, Search, MapPin } from 'lucide-react';

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getJobs(false);
      setJobs(res.data.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to soft delete this job post? It will be removed from public view.')) return;
    
    try {
      setActionLoading(id);
      await adminApi.deleteJob(id);
      await fetchJobs();
    } catch (err: any) {
      alert('Failed to delete job: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const filteredJobs = jobs.filter(j => 
    j.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (j.employer?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="text-center py-20 font-body text-ink-muted">Loading jobs...</div>;
  if (error) return <div className="text-center py-20 text-status-error font-body">{error}</div>;

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display text-ink">Job Posts</h1>
          <p className="text-ink-soft font-body mt-2">
            Monitor and moderate active job postings on the platform.
          </p>
        </div>
        
        <div className="mt-4 md:mt-0 relative w-full md:w-64">
          <input
            type="text"
            placeholder="Search jobs..."
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
                <th className="px-6 py-4 font-body-semibold text-ink-soft text-sm">Job Details</th>
                <th className="px-6 py-4 font-body-semibold text-ink-soft text-sm">Employer</th>
                <th className="px-6 py-4 font-body-semibold text-ink-soft text-sm">Compensation & Slots</th>
                <th className="px-6 py-4 font-body-semibold text-ink-soft text-sm">Status</th>
                <th className="px-6 py-4 font-body-semibold text-ink-soft text-sm text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-faint">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-ink-muted">
                    <Briefcase className="w-10 h-10 mx-auto text-ink-faint mb-3" />
                    No active job posts found.
                  </td>
                </tr>
              ) : filteredJobs.map((job) => (
                <tr key={job.id} className="hover:bg-paper/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-body-bold text-ink">{job.title}</div>
                    <div className="flex items-center text-xs text-ink-muted mt-1">
                      <span className="px-2 py-0.5 rounded bg-ink-faint text-ink mr-2">{job.category}</span>
                      <MapPin className="w-3 h-3 mr-1" /> {job.barangay}, {job.municipality}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-body-medium text-ink">{job.employer?.name || 'Unknown'}</div>
                    <div className="text-xs text-ink-soft">{job.employer?.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-numeric-medium text-ink">₱{parseFloat(job.compensation).toFixed(2)} / {job.duration_type}</div>
                    <div className="text-xs text-ink-soft mt-1">Slots: {job.slots}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-body-semibold capitalize ${
                      job.status === 'open' ? 'bg-status-success/10 text-status-success' : 'bg-ink-faint text-ink'
                    }`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      disabled={actionLoading === job.id}
                      onClick={() => handleDelete(job.id)}
                      className="p-2 rounded-lg bg-status-error/10 text-status-error hover:bg-status-error hover:text-white transition-colors"
                      title="Soft Delete Job Post"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
