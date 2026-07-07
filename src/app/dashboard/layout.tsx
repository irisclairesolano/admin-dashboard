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
    <div className="min-h-screen bg-paper flex">
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-ink-faint z-20 flex items-center justify-between px-4">
        <span className="font-display text-xl text-ink">SIKAP Admin</span>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-ink">
          {sidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-10 w-64 bg-white border-r border-ink-faint transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:flex-shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-16 flex items-center px-6 border-b border-ink-faint lg:flex hidden">
          <span className="font-display text-2xl text-primary-dark">SIKAP</span>
        </div>

        <div className="p-4 flex flex-col h-[calc(100vh-4rem)]">
          <nav className="flex-1 space-y-1 mt-4 lg:mt-0">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center px-4 py-3 text-sm font-body-medium rounded-xl transition-colors
                    ${isActive 
                      ? 'bg-ink text-white' 
                      : 'text-ink-soft hover:bg-paper-cream hover:text-ink'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-white' : 'text-ink-muted'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="pt-4 border-t border-ink-faint mt-4">
            <div className="flex items-center px-4 py-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-accent-peach flex items-center justify-center mr-3">
                <span className="font-body-bold text-primary-dark text-sm">{adminName.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-body-bold text-ink truncate">{adminName}</p>
                <p className="text-xs font-body text-ink-muted truncate">Administrator</p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-3 text-sm font-body-medium text-status-error hover:bg-status-error/10 rounded-xl transition-colors"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:pl-0 pt-16 lg:pt-0 max-w-[1200px] mx-auto w-full">
        <div className="p-6 md:p-8">
          {children}
        </div>
      </main>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-ink/20 z-0 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
