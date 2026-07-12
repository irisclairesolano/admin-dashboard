'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Users, UserCheck, LogOut, Menu, X, Flag, Briefcase, Archive } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminName, setAdminName] = useState('');
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.push('/login');
      return;
    }
    
    try {
      const user = JSON.parse(localStorage.getItem('admin_user') || '{}');
      setAdminName(user.name || 'Admin');
    } catch (e) {
      console.error(e);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    router.push('/login');
  };

  const navItems = [
    { name: 'Analytics', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Verifications', href: '/dashboard/verifications', icon: UserCheck },
    { name: 'Users', href: '/dashboard/users', icon: Users },
    { name: 'Jobs', href: '/dashboard/jobs', icon: Briefcase },
    { name: 'Reports', href: '/dashboard/reports', icon: Flag },
    { name: 'Archives', href: '/dashboard/archives', icon: Archive },
  ];

  return (
    <div className="min-h-screen bg-paper flex relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-soft/50 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse-slow"></div>
      <div className="absolute top-[20%] right-[-5%] w-72 h-72 bg-accent-sky/50 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
      <div className="absolute bottom-[-10%] left-[20%] w-80 h-80 bg-accent-mint/40 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse-slow" style={{ animationDelay: '2s' }}></div>

      {/* Mobile sidebar toggle */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-white/50 z-20 flex items-center justify-between px-4 shadow-sm">
        <span className="font-display text-xl text-ink font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-dark to-ink">SIKAP Admin</span>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-ink hover:bg-paper rounded-full transition-colors">
          {sidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-72 bg-white/70 backdrop-blur-xl border-r border-white/50 shadow-glass transform transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:translate-x-0 lg:static lg:flex-shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-20 flex items-center px-8 border-b border-ink-faint/30 lg:flex hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center mr-3 shadow-md">
            <span className="font-display text-2xl text-white font-bold leading-none">S</span>
          </div>
          <span className="font-display text-2xl text-transparent bg-clip-text bg-gradient-to-r from-ink to-primary-dark font-bold tracking-tight">SIKAP</span>
        </div>

        <div className="p-5 flex flex-col h-[calc(100vh-5rem)]">
          <nav className="flex-1 space-y-2 mt-4 lg:mt-0">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    group flex items-center px-4 py-3.5 text-sm font-body-semibold rounded-2xl transition-all duration-300 relative overflow-hidden
                    ${isActive 
                      ? 'bg-ink text-white shadow-md transform scale-[1.02]' 
                      : 'text-ink-soft hover:bg-white/50 hover:text-ink hover:shadow-sm'
                    }
                  `}
                >
                  {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full"></div>}
                  <Icon className={`w-5 h-5 mr-3 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-white' : 'text-ink-muted group-hover:text-primary-dark'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="pt-6 border-t border-ink-faint/30 mt-4 relative">
            <div className="absolute -top-[1px] left-1/2 transform -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-ink-faint to-transparent"></div>
            <div className="flex items-center px-4 py-3 mb-3 bg-white/40 rounded-2xl border border-white/50">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-peach to-accent-peachBright flex items-center justify-center mr-3 shadow-inner">
                <span className="font-body-bold text-primary-dark text-lg">{adminName.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-body-bold text-ink truncate">{adminName}</p>
                <p className="text-xs font-body text-ink-muted truncate">Administrator</p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="group flex items-center w-full px-4 py-3.5 text-sm font-body-semibold text-status-error hover:bg-status-error/10 rounded-2xl transition-all duration-300 hover:shadow-sm border border-transparent hover:border-status-error/20"
            >
              <LogOut className="w-5 h-5 mr-3 transition-transform duration-300 group-hover:-translate-x-1" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:pl-0 pt-16 lg:pt-0 max-w-[1400px] mx-auto w-full z-10 relative">
        <div className="p-6 md:p-10 animate-fade-in">
          {children}
        </div>
      </main>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-ink/30 backdrop-blur-sm z-20 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
