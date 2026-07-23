'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { Users, Briefcase, FileCheck, AlertTriangle } from 'lucide-react';
import { adminApi } from '@/lib/api';

export default function AnalyticsDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await adminApi.getAnalytics();
        setData(res.data);
      } catch (err) {
        console.error('Failed to load analytics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const stats = [
    { label: 'Total Users', value: data?.kpis?.total_users || 0, icon: Users, color: 'text-primary-dark', bg: 'bg-primary-soft' },
    { label: 'Active Jobs', value: data?.kpis?.active_jobs || 0, icon: Briefcase, color: 'text-accent-skyDeep', bg: 'bg-accent-sky' },
    { label: 'Pending Verifications', value: data?.kpis?.pending_verifications || 0, icon: FileCheck, color: 'text-accent-mintDeep', bg: 'bg-accent-mint' },
    { label: 'Unresolved Reports', value: data?.kpis?.unresolved_reports || 0, icon: AlertTriangle, color: 'text-status-error', bg: 'bg-status-error/10' },
  ];

  // Transform registration_trends into Recharts format
  // Source: [{ month: '2024-01', role: 'worker', registrations: 10 }, ...]
  const transformedUserGrowth = (() => {
    if (!data?.registration_trends) return [];
    const grouped: Record<string, { name: string; workers: number; employers: number }> = {};
    
    data.registration_trends.forEach((item: any) => {
      if (!grouped[item.month]) {
        grouped[item.month] = { name: item.month, workers: 0, employers: 0 };
      }
      if (item.role === 'worker') {
        grouped[item.month].workers += parseInt(item.registrations);
      } else if (item.role === 'employer') {
        grouped[item.month].employers += parseInt(item.registrations);
      }
    });
    
    return Object.values(grouped).slice(-6); // Last 6 months
  })();

  const transformedJobsData = (() => {
    if (!data?.skill_demand) return [];
    return data.skill_demand.map((item: any) => ({
      name: item.category,
      jobs: parseInt(item.total_postings),
    }));
  })();

  const transformedApplicationVolume = (() => {
    if (!data?.application_volume) return [];
    return data.application_volume.map((item: any) => ({
      name: item.month,
      applications: parseInt(item.total_applications),
      jobs: parseInt(item.unique_jobs),
    })).slice(-6);
  })();

  const transformedSkillDistribution = (() => {
    if (!data?.skill_distribution) return [];
    return data.skill_distribution.map((item: any) => ({
      name: item.skill_name,
      value: parseInt(item.worker_count),
    })).slice(0, 10);
  })();

  const transformedGeographicActivity = (() => {
    if (!data?.geographic_activity) return [];
    return data.geographic_activity.map((item: any) => ({
      name: item.municipality || 'Unknown',
      jobs: parseInt(item.job_postings),
      applications: parseInt(item.total_applications),
    })).slice(0, 10);
  })();

  const COLORS = ['#E8744A', '#5A8AA8', '#6BA475', '#E9B854', '#8C7B6A', '#C9572D', '#3C647F', '#4A7A53', '#D69E3A', '#A39180'];

  if (loading) return <div className="p-8 text-center text-ink-muted">Loading Analytics...</div>;

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-4xl font-display text-transparent bg-clip-text bg-gradient-to-r from-ink to-primary-dark font-bold">Dashboard Overview</h1>
        <p className="text-ink-soft font-body mt-2 text-lg">Platform analytics and key performance metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, i) => (
          <div key={i} className="group relative bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-white/50 hover:-translate-y-1 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative flex items-center">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mr-5 shadow-inner transition-transform group-hover:scale-110 duration-300 ${stat.bg}`}>
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm font-body-semibold text-ink-soft uppercase tracking-wider">{stat.label}</p>
                <h3 className="text-3xl font-numeric-bold text-ink mt-1">{stat.value}</h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-sm border border-white/50 transition-all hover:shadow-lg">
          <h3 className="font-display text-2xl text-ink mb-6 flex items-center">
            User Growth Trends
            <span className="ml-3 text-xs bg-primary-soft text-primary-dark px-3 py-1 rounded-full font-body-semibold">Last 6 Months</span>
          </h3>
          <div className="h-80 w-full font-numeric">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={transformedUserGrowth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8DFCE" opacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 13 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 13 }} />
                <Tooltip 
                  cursor={{ fill: '#FDF8F0' }}
                  contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)' }}
                />
                <Bar dataKey="workers" name="Workers" fill="url(#colorWorkers)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="employers" name="Employers" fill="url(#colorEmployers)" radius={[6, 6, 0, 0]} />
                <defs>
                  <linearGradient id="colorWorkers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E8744A" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#C9572D" stopOpacity={0.8}/>
                  </linearGradient>
                  <linearGradient id="colorEmployers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5A8AA8" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#3C647F" stopOpacity={0.8}/>
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-sm border border-white/50 transition-all hover:shadow-lg">
          <h3 className="font-display text-2xl text-ink mb-6 flex items-center">
            Skill Demand
            <span className="ml-3 text-xs bg-accent-sky text-accent-skyDeep px-3 py-1 rounded-full font-body-semibold">All Time</span>
          </h3>
          <div className="h-80 w-full font-numeric">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={transformedJobsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8DFCE" opacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 13 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 13 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)' }}
                />
                <Line type="monotone" dataKey="jobs" name="Total Jobs" stroke="#6BA475" strokeWidth={4} dot={{ r: 5, fill: '#6BA475', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8, strokeWidth: 0, fill: '#4A7A53' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-sm border border-white/50 transition-all hover:shadow-lg">
          <h3 className="font-display text-2xl text-ink mb-6 flex items-center">
            Skill Distribution
            <span className="ml-3 text-xs bg-accent-peach text-primary-dark px-3 py-1 rounded-full font-body-semibold">Top 10 Verified Workers</span>
          </h3>
          <div className="h-80 w-full font-numeric">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={transformedSkillDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {transformedSkillDistribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-sm border border-white/50 transition-all hover:shadow-lg">
          <h3 className="font-display text-2xl text-ink mb-6 flex items-center">
            Geographic Activity
            <span className="ml-3 text-xs bg-accent-mint text-accent-mintDeep px-3 py-1 rounded-full font-body-semibold">Top 10 Municipalities</span>
          </h3>
          <div className="h-80 w-full font-numeric">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={transformedGeographicActivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E8DFCE" opacity={0.5} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 13 }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 13 }} width={90} />
                <Tooltip 
                  cursor={{ fill: '#FDF8F0' }}
                  contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="jobs" name="Job Postings" fill="#5A8AA8" radius={[0, 6, 6, 0]} barSize={12} />
                <Bar dataKey="applications" name="Applications" fill="#6BA475" radius={[0, 6, 6, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 mb-8">
        <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-sm border border-white/50 transition-all hover:shadow-lg">
          <h3 className="font-display text-2xl text-ink mb-6 flex items-center">
            Application Volume
            <span className="ml-3 text-xs bg-accent-peach text-primary-dark px-3 py-1 rounded-full font-body-semibold">Last 6 Months</span>
          </h3>
          <div className="h-80 w-full font-numeric">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={transformedApplicationVolume} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E8744A" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#E8744A" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAppJobs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5A8AA8" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#5A8AA8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8DFCE" opacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 13 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 13 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Area type="monotone" dataKey="applications" name="Applications" stroke="#E8744A" strokeWidth={3} fillOpacity={1} fill="url(#colorApps)" activeDot={{ r: 6, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="jobs" name="Unique Jobs" stroke="#5A8AA8" strokeWidth={3} fillOpacity={1} fill="url(#colorAppJobs)" activeDot={{ r: 6, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
