'use client';

import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { Users, Briefcase, FileCheck, AlertTriangle } from 'lucide-react';

const userGrowthData = [
  { name: 'Jan', workers: 40, employers: 24 },
  { name: 'Feb', workers: 30, employers: 13 },
  { name: 'Mar', workers: 20, employers: 98 },
  { name: 'Apr', workers: 27, employers: 39 },
  { name: 'May', workers: 18, employers: 48 },
  { name: 'Jun', workers: 23, employers: 38 },
];

const jobsData = [
  { name: 'Week 1', jobs: 12 },
  { name: 'Week 2', jobs: 19 },
  { name: 'Week 3', jobs: 15 },
  { name: 'Week 4', jobs: 22 },
];

export default function AnalyticsDashboard() {
  const stats = [
    { label: 'Total Users', value: '1,248', icon: Users, color: 'text-primary-dark', bg: 'bg-primary-soft' },
    { label: 'Active Jobs', value: '156', icon: Briefcase, color: 'text-accent-skyDeep', bg: 'bg-accent-sky' },
    { label: 'Pending Verifications', value: '23', icon: FileCheck, color: 'text-accent-mintDeep', bg: 'bg-accent-mint' },
    { label: 'Unresolved Reports', value: '5', icon: AlertTriangle, color: 'text-status-error', bg: 'bg-status-error/10' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-display text-ink">Dashboard Overview</h1>
        <p className="text-ink-soft font-body mt-2">Platform analytics and key performance metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-ink-faint flex items-center">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mr-4 ${stat.bg}`}>
              <stat.icon className={`w-7 h-7 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm font-body-semibold text-ink-soft">{stat.label}</p>
              <h3 className="text-2xl font-numeric-bold text-ink mt-1">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-ink-faint">
          <h3 className="font-display text-xl text-ink mb-6">User Growth</h3>
          <div className="h-72 w-full font-numeric">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userGrowthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8DFCE" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: '#FDF8F0' }}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #E8DFCE', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="workers" name="Workers" fill="#E8744A" radius={[4, 4, 0, 0]} />
                <Bar dataKey="employers" name="Employers" fill="#5A8AA8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-ink-faint">
          <h3 className="font-display text-xl text-ink mb-6">Jobs Posted (This Month)</h3>
          <div className="h-72 w-full font-numeric">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={jobsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8DFCE" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8C7B6A', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: '1px solid #E8DFCE', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line type="monotone" dataKey="jobs" name="Jobs Posted" stroke="#6BA475" strokeWidth={3} dot={{ r: 4, fill: '#6BA475' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
