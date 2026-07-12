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
    <div className="animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-display text-transparent bg-clip-text bg-gradient-to-r from-ink to-primary-dark font-bold">Job Posts</h1>
          <p className="text-ink-soft font-body mt-2 text-lg">
            Monitor and moderate active job postings on the platform.
          </p>
        </div>
        
        <div className="mt-6 md:mt-0 relative w-full md:w-80 group">
          <input
            type="text"
            placeholder="Search jobs or employers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white/70 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm focus:bg-white focus:border-primary/50 focus:ring-4 focus:ring-primary/10 outline-none font-body transition-all group-hover:shadow-md"
          />
          <Search className="w-5 h-5 text-ink-muted absolute left-4 top-4 transition-colors group-focus-within:text-primary" />
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-white/50 overflow-hidden transition-all hover:shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body">
            <thead className="bg-white/50 border-b border-ink-faint/50">
              <tr>
                <th className="px-8 py-5 font-body-semibold text-ink-soft text-sm uppercase tracking-wider">Job Details</th>
                <th className="px-8 py-5 font-body-semibold text-ink-soft text-sm uppercase tracking-wider">Employer</th>
                <th className="px-8 py-5 font-body-semibold text-ink-soft text-sm uppercase tracking-wider">Compensation & Slots</th>
                <th className="px-8 py-5 font-body-semibold text-ink-soft text-sm uppercase tracking-wider">Status</th>
                <th className="px-8 py-5 font-body-semibold text-ink-soft text-sm uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-faint/30">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-16 text-center text-ink-soft">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-20 h-20 bg-ink-faint/30 rounded-full flex items-center justify-center mb-4">
                        <Briefcase className="w-10 h-10 text-ink-muted" />
                      </div>
                      <p className="text-lg">No active job posts found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-white/60 transition-colors duration-200">
                    <td className="px-8 py-5">
                      <div className="font-body-bold text-ink text-lg">{job.title}</div>
                      <div className="flex items-center text-xs text-ink-muted mt-2">
                        <span className="px-2.5 py-1 rounded-md bg-accent-sky text-primary-dark font-body-semibold shadow-sm mr-3 border border-white/50">{job.category}</span>
                        <div className="flex items-center bg-white/50 px-2.5 py-1 rounded-md border border-white/50 shadow-sm">
                          <MapPin className="w-3.5 h-3.5 mr-1.5 text-primary" /> {job.barangay}, {job.municipality}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-accent-peach to-accent-peachBright/50 flex items-center justify-center text-primary-dark font-body-bold text-sm shadow-inner mr-3">
                          {(job.employer?.name || 'U').charAt(0)}
                        </div>
                        <div>
                          <div className="font-body-bold text-ink">{job.employer?.name || 'Unknown'}</div>
                          <div className="text-xs text-ink-soft mt-0.5">{job.employer?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="text-sm font-numeric-bold text-ink flex items-center">
                        <span className="text-primary mr-1">₱</span>{parseFloat(job.compensation).toFixed(2)} <span className="text-ink-muted font-body ml-1 text-xs">/ {job.duration_type}</span>
                      </div>
                      <div className="text-xs text-ink-soft mt-1.5 font-body-semibold bg-paper px-2.5 py-1 rounded border border-ink-faint/50 inline-block">Slots: {job.slots}</div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-4 py-1.5 rounded-full text-xs font-body-bold uppercase tracking-wide shadow-sm ${
                        job.status === 'open' ? 'bg-status-success/20 text-status-success border border-status-success/30' : 'bg-ink-faint/50 text-ink-soft border border-ink-faint'
                      }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button
                        disabled={actionLoading === job.id}
                        onClick={() => handleDelete(job.id)}
                        className="p-2.5 rounded-xl bg-white/80 border border-ink-faint/50 text-status-error hover:bg-status-error hover:text-white hover:border-status-error transition-all shadow-sm group"
                        title="Soft Delete Job Post"
                      >
                        <Trash2 className="w-4 h-4 transition-transform group-hover:scale-110" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
