'use client';

import { adminApi, prefetchAll } from '@/api/admin';
import { useSSEReports } from '@/hooks/useSSEReports';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';

type PrefetchStatus = 'idle' | 'loading' | 'ready' | 'error';

interface DashboardNotification {
  id: string;
  category: 'verification' | 'report' | 'support';
  title: string;
  description: string;
  count: number;
  priority: 'attention' | 'update' | 'info';
  link: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [prefetchStatus, setPrefetchStatus] = useState<PrefetchStatus>('idle');
  const [bannerVisible, setBannerVisible] = useState(false);
  const [reportToastDismissed, setReportToastDismissed] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didPrefetch = useRef(false);
  const router = useRouter();
  const pathname = usePathname();

  // ── SSE Real-time Report Alerts ───────────────────────────────────────────
  const { newReportCount, latestReportAt, clearCount: clearSSECount } = useSSEReports();

  // Auto-dismiss toast when user navigates to reports page
  useEffect(() => {
    if (pathname === '/dashboard/reports' && newReportCount > 0) {
      clearSSECount();
      setReportToastDismissed(true);
    }
  }, [pathname, newReportCount, clearSSECount]);

  // Show toast again whenever new reports arrive
  useEffect(() => {
    if (newReportCount > 0) {
      setReportToastDismissed(false);
    }
  }, [newReportCount]);

  // ── Global Notifications State ────────────────────────────────────────────
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [readNotifications, setReadNotifications] = useState<string[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);


  // ── Web Notifications Permission & Helper ────────────────────────────
  const prevVerifications = useRef(0);
  const prevReports = useRef(0);
  const prevTickets = useRef(0);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  const triggerBrowserNotification = (title: string, body: string, path: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const n = new Notification(title, {
        body,
        icon: '/favicon.ico',
      });
      n.onclick = () => {
        window.focus();
        router.push(path);
        n.close();
      };
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Search value synced from URL for future use
    }
  }, [pathname]);

  // ── Auth check ────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) { router.push('/login'); return; }
    try {
      const user = JSON.parse(localStorage.getItem('admin_user') || '{}');
      setAdminName(user.name || 'Admin');
    } catch (e) { console.error(e); }
  }, [router]);

  // ── Parallel pre-fetch & Load notifications ────────────────────────────────
  const fetchNotifications = async () => {
    try {
      const [verificationsRes, reportsRes, ticketsRes] = await Promise.all([
        adminApi.getVerifications(),
        adminApi.getReports('open', 1),
        adminApi.getSupportTickets(),
      ]);

      const pendingVerificationsCount = (verificationsRes.data?.data || []).filter((u: any) =>
        u.registration_status === 'pending_review' || (u.verification_status === 'pending' && u.document_url)
      ).length;

      const openReportsCount = (reportsRes.data?.data || []).length;

      const openTicketsCount = (ticketsRes.data?.data || []).filter((t: any) =>
        t.status === 'open'
      ).length;

      const list: DashboardNotification[] = [];

      list.push({
        id: 'verification-pending',
        category: 'verification',
        title: 'Pending Verifications',
        description: pendingVerificationsCount > 0
          ? `${pendingVerificationsCount} identity verification request${pendingVerificationsCount > 1 ? 's' : ''} waiting for review.`
          : 'No identity verification requests waiting for review.',
        count: pendingVerificationsCount,
        priority: pendingVerificationsCount > 0 ? 'attention' : 'info',
        link: '/dashboard/verifications',
      });

      list.push({
        id: 'reports-open',
        category: 'report',
        title: 'Reported Content',
        description: openReportsCount > 0
          ? `${openReportsCount} content report${openReportsCount > 1 ? 's' : ''} require attention.`
          : 'No content reports require attention.',
        count: openReportsCount,
        priority: openReportsCount > 0 ? 'attention' : 'info',
        link: '/dashboard/reports',
      });

      list.push({
        id: 'support-open',
        category: 'support',
        title: 'Open Support Tickets',
        description: openTicketsCount > 0
          ? `${openTicketsCount} support inquiry ticket${openTicketsCount > 1 ? 's' : ''} awaiting response.`
          : 'No open support tickets.',
        count: openTicketsCount,
        priority: openTicketsCount > 0 ? 'update' : 'info',
        link: '/dashboard/support',
      });

      setNotifications(list);

      // Trigger web push notification if counts increased
      if (!isFirstLoad.current) {
        if (pendingVerificationsCount > prevVerifications.current) {
          triggerBrowserNotification(
            'New Pending Verification',
            `There are ${pendingVerificationsCount} identity verifications awaiting review.`,
            '/dashboard/verifications'
          );
        }
        if (openReportsCount > prevReports.current) {
          triggerBrowserNotification(
            'New Report Filed',
            `There are ${openReportsCount} content reports requiring moderation.`,
            '/dashboard/reports'
          );
        }
        if (openTicketsCount > prevTickets.current) {
          triggerBrowserNotification(
            'New Support Ticket',
            `There are ${openTicketsCount} open support tickets awaiting response.`,
            '/dashboard/support'
          );
        }
      } else {
        isFirstLoad.current = false;
      }
      prevVerifications.current = pendingVerificationsCount;
      prevReports.current = openReportsCount;
      prevTickets.current = openTicketsCount;
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  };

  useEffect(() => {
    if (didPrefetch.current) return;
    didPrefetch.current = true;

    const token = localStorage.getItem('admin_token');
    if (!token) return;

    setPrefetchStatus('loading');
    setBannerVisible(true);

    // Initial pre-fetch + load notification counts
    Promise.all([prefetchAll(), fetchNotifications()])
      .then(() => {
        setPrefetchStatus('ready');
        hideTimer.current = setTimeout(() => setBannerVisible(false), 2500);
      })
      .catch(() => {
        setPrefetchStatus('error');
      });

    // Auto-refresh notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);

    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    router.push('/login');
  };

  const navItems = [
    { name: 'Analytics',     href: '/dashboard',              iconClass: 'lni lni-grid-alt',  badge: 0 },
    { name: 'Verifications', href: '/dashboard/verifications', iconClass: 'lni lni-user',      badge: 0 },
    { name: 'Users',         href: '/dashboard/users',         iconClass: 'lni lni-users',     badge: 0 },
    { name: 'Jobs',          href: '/dashboard/jobs',          iconClass: 'lni lni-briefcase', badge: 0 },
    { name: 'Support',       href: '/dashboard/support',       iconClass: 'lni lni-comments',  badge: 0 },
    { name: 'Reports',       href: '/dashboard/reports',       iconClass: 'lni lni-flag',      badge: newReportCount },
    { name: 'Word Filter',   href: '/dashboard/profanity',     iconClass: 'lni lni-ban',       badge: 0 },
    { name: 'Archives',      href: '/dashboard/archives',      iconClass: 'lni lni-archive',   badge: 0 },
    { name: 'Audit Logs',    href: '/dashboard/logs',          iconClass: 'lni lni-shield',    badge: 0 },
  ];

  // ── Pre-fetch banner config ────────────────────────────────────────────────
  const bannerMap: Record<PrefetchStatus, { bg: string; icon: React.ReactNode; text: string } | null> = {
    idle: null,
    loading: { bg: 'bg-blue-500/90', icon: <i className="lni lni-spinner-arrow animate-spin mr-1.5 text-sm" />, text: 'Loading all sections in background…' },
    ready: { bg: 'bg-emerald-500/90', icon: <i className="lni lni-checkmark-circle mr-1.5 text-sm" />, text: 'All sections loaded — navigation is instant.' },
    error: { bg: 'bg-red-500/90', icon: <i className="lni lni-ban mr-1.5 text-sm" />, text: 'Could not reach server. Check your connection.' },
  };
  const banner = bannerMap[prefetchStatus];

  // ── Notifications Helper Computes ──────────────────────────────────────────
  const unreadNotifications = notifications.filter(n => n.count > 0 && !readNotifications.includes(n.id));
  const unreadCount = unreadNotifications.length;

  const markAllAsRead = () => {
    setReadNotifications(notifications.map(n => n.id));
  };

  const handleNotificationClick = (item: DashboardNotification) => {
    if (!readNotifications.includes(item.id)) {
      setReadNotifications(prev => [...prev, item.id]);
    }
    setDropdownOpen(false);
    setSidebarOpen(false);
    router.push(item.link);
  };
  // ── Notification Dropdown Element (Slide-over drawer panel) ─────────────────
  const NotificationButton = () => (
    <div className="relative">
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="p-2.5 bg-white/50 hover:bg-white text-ink hover:text-primary rounded-2xl border border-ink-faint/30 hover:border-primary/20 shadow-sm transition-all relative flex items-center justify-center"
        aria-label="View notifications"
      >
        <i className="lni lni-alarm text-xl"></i>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-status-error text-white font-body font-bold text-[10px] rounded-full flex items-center justify-center shadow-md animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {dropdownOpen && (
        <>
          {/* Backdrop overlay */}
          <div className="fixed inset-0 bg-ink/20 backdrop-blur-sm z-[100]" onClick={() => setDropdownOpen(false)} />
          <div className="fixed inset-0 z-[101] w-screen h-screen bg-white/95 backdrop-blur-xl shadow-2xl flex flex-col transform transition-transform duration-300 translate-x-0 animate-slide-in">
            {/* Header */}
            <div className="p-6 border-b border-ink-faint/30 bg-paper/30 flex justify-between items-center">
              <div>
                <h3 className="font-display text-xl text-ink font-bold">Action Center</h3>
                <p className="text-xs text-ink-soft mt-1">Pending tasks requiring administrative attention</p>
              </div>
              <div className="flex items-center space-x-3">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs font-body font-semibold text-primary hover:text-primary-dark transition-colors flex items-center gap-1 bg-primary/10 px-2.5 py-1 rounded-md"
                  >
                    <i className="lni lni-checkmark text-xs mr-1"></i>
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setDropdownOpen(false)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-paper rounded-full text-ink-muted hover:text-ink transition-colors"
                >
                  <i className="lni lni-close text-xs" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-ink-faint/25 p-4 space-y-3">
              {notifications.map((item) => {
                const isRead = item.count === 0 || readNotifications.includes(item.id);
                const isAttention = item.count > 0 && item.priority === 'attention';

                return (
                  <button
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`
                      w-full text-left p-4 transition-all flex gap-3.5 rounded-xl border hover:bg-paper/50
                      ${isRead ? 'opacity-50 bg-white/30 border-transparent' : 'bg-white border-white/50 shadow-sm'}
                    `}
                  >
                    <div className={`
                      w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center shadow-inner
                      ${isAttention
                        ? 'bg-status-error/10 text-status-error border border-status-error/25'
                        : item.count > 0 ? 'bg-primary/10 text-primary border border-primary/25'
                        : 'bg-ink-faint/40 text-ink-muted border border-ink-faint'
                      }
                    `}>
                      {isAttention ? (
                        <i className="lni lni-warning text-base" />
                      ) : item.count > 0 ? (
                        <i className="lni lni-alarm text-base" />
                      ) : (
                        <i className="lni lni-checkmark text-base" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className={`text-[10px] font-body font-bold uppercase tracking-wider ${
                          isAttention ? 'text-status-error' : item.count > 0 ? 'text-primary' : 'text-ink-muted'
                        }`}>
                          {isAttention ? 'Attention Needed' : item.count > 0 ? 'Task Update' : 'All Clear'}
                        </span>
                        {!isRead && (
                          <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 animate-ping" />
                        )}
                      </div>
                      <h4 className="text-sm font-body font-bold text-ink mt-1 truncate">
                        {item.title}
                      </h4>
                      <p className="text-xs font-body text-ink-soft mt-1 leading-normal">
                        {item.description}
                      </p>
                      {item.count > 0 && (
                        <span className="inline-block mt-2 text-[10px] font-mono font-bold bg-ink-faint px-2 py-0.5 rounded text-ink-soft">
                          {item.count} items
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 bg-paper/30 text-center border-t border-ink-faint/30">
              <span className="text-[10px] font-body font-semibold text-ink-muted flex items-center justify-center gap-1">
                <i className="lni lni-question-circle text-xs" />
                Live refresh active (updates every 30s)
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="h-screen bg-paper flex relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-soft/50 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse-slow" />
      <div className="absolute top-[20%] right-[-5%] w-72 h-72 bg-accent-sky/50 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse-slow" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-[-10%] left-[20%] w-80 h-80 bg-accent-mint/40 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse-slow" style={{ animationDelay: '2s' }} />

      {/* ── Pre-fetch status banner ─────────────────────────────────────── */}
      {banner && (
        <div className={`
          fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2
          px-4 py-2 text-white text-xs font-body font-semibold backdrop-blur-md shadow-md
          transition-all duration-500
          ${banner.bg}
          ${bannerVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}
        `}>
          {banner.icon}
          {banner.text}
          {prefetchStatus === 'error' && (
            <button
              onClick={() => { didPrefetch.current = false; window.location.reload(); }}
              className="ml-3 underline hover:no-underline"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-white/50 z-20 flex items-center justify-between px-4 shadow-sm flex-shrink-0">
        <div className="flex items-center">
          <Image src="/logo/04_Wordmark.png" alt="SIKAP Logo" width={120} height={32} className="h-8 object-contain" />
          <span className="text-xs font-body font-semibold text-ink-muted ml-2 bg-ink-faint/30 px-2 py-0.5 rounded-md border border-ink-faint/50">Admin</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-ink hover:bg-paper rounded-full transition-colors flex items-center justify-center" aria-label="Toggle sidebar">
            {sidebarOpen ? <i className="lni lni-close text-lg" /> : <i className="lni lni-menu text-lg" />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-72 bg-white/70 backdrop-blur-xl border-r border-white/50 shadow-glass
        transform transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
        lg:translate-x-0 lg:static lg:flex-shrink-0 h-screen flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-20 flex items-center justify-between px-5 border-b border-ink-faint/30 flex-shrink-0">
          <div className="flex items-center gap-3">
            <NotificationButton />
            <div className="flex items-center">
              <Image src="/logo/04_Wordmark.png" alt="SIKAP Logo" width={135} height={36} className="h-9 object-contain" />
              <span className="text-[10px] font-body font-semibold text-ink-muted ml-1.5 bg-ink-faint/30 px-1.5 py-0.5 rounded border border-ink-faint/50">Admin</span>
            </div>
          </div>
        </div>

        <div className="p-5 flex flex-col flex-1 min-h-0 justify-between">
          <nav className="flex-1 space-y-2 mt-4 lg:mt-0 overflow-y-auto pr-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const hasBadge = item.badge > 0;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    group flex items-center px-4 py-3.5 text-sm font-body font-semibold rounded-2xl
                    transition-all duration-300 relative overflow-hidden
                    ${isActive
                      ? 'bg-ink text-white shadow-md transform scale-[1.02]'
                      : 'text-ink-soft hover:bg-white/50 hover:text-ink hover:shadow-sm'
                    }
                  `}
                >
                  {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />}
                  <i className={`${item.iconClass} text-lg mr-3 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-white' : 'text-ink-muted group-hover:text-primary-dark'}`} />
                  {item.name}
                  <span className="ml-auto flex items-center gap-1.5">
                    {/* SSE live badge (Reports nav item) */}
                    {hasBadge && (
                      <span className={`min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm animate-pulse ${
                        isActive ? 'bg-status-error text-white' : 'bg-status-error text-white'
                      }`}>
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                    {/* Pulse dot while pre-fetch is in flight */}
                    {prefetchStatus === 'loading' && !hasBadge && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                    )}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="pt-6 border-t border-ink-faint/30 mt-4 relative flex-shrink-0">
            <div className="absolute -top-[1px] left-1/2 transform -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-ink-faint to-transparent" />
            <div className="flex items-center px-4 py-3 mb-3 bg-white/40 rounded-2xl border border-white/50">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-peach to-accent-peachBright flex items-center justify-center mr-3 shadow-inner flex-shrink-0">
                <span className="font-body font-bold text-primary-dark text-lg">{adminName.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-body font-bold text-ink truncate">{adminName}</p>
                <p className="text-xs font-body text-ink-muted truncate">Administrator</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="group flex items-center w-full px-4 py-3.5 text-sm font-body font-semibold text-status-error hover:bg-status-error/10 rounded-2xl transition-all duration-300 hover:shadow-sm border border-transparent hover:border-status-error/20"
            >
              <i className="lni lni-exit text-lg mr-3 transition-transform duration-300 group-hover:-translate-x-1" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* ── SSE Report Alert Toast ────────────────────────────────── */}
      {newReportCount > 0 && !reportToastDismissed && (
        <div
          className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-white border border-status-error/30 shadow-2xl rounded-2xl overflow-hidden animate-slide-in"
          style={{ boxShadow: '0 8px 32px rgba(220,53,69,0.18)' }}
        >
          {/* Red accent top bar */}
          <div className="h-1 w-full bg-gradient-to-r from-status-error to-rose-400" />
          <div className="p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-status-error/10 border border-status-error/25 flex items-center justify-center flex-shrink-0 mt-0.5">
              <i className="lni lni-flag text-status-error text-base" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-body font-bold uppercase tracking-wider text-status-error">New Report Filed</span>
                <button
                  onClick={() => setReportToastDismissed(true)}
                  className="w-5 h-5 flex items-center justify-center text-ink-muted hover:text-ink rounded transition-colors flex-shrink-0"
                  aria-label="Dismiss"
                >
                  <i className="lni lni-close text-[10px]" />
                </button>
              </div>
              <p className="text-sm font-body font-bold text-ink mt-0.5">
                {newReportCount === 1
                  ? '1 new report requires your attention'
                  : `${newReportCount} new reports require your attention`}
              </p>
              {latestReportAt && (
                <p className="text-[10px] font-body text-ink-muted mt-0.5">
                  Latest: {new Date(latestReportAt).toLocaleTimeString()}
                </p>
              )}
              <button
                onClick={() => {
                  setReportToastDismissed(true);
                  clearSSECount();
                  router.push('/dashboard/reports');
                }}
                className="mt-2.5 text-xs font-body font-semibold text-status-error hover:underline flex items-center gap-1"
              >
                View Reports <i className="lni lni-arrow-right text-[10px]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Persistent Content Wrapper (Main) ──────────────────── */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <main className="flex-1 w-full mx-auto z-10 relative overflow-y-auto pt-20 lg:pt-10">
          <div className="p-6 md:p-10 animate-fade-in max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>

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
