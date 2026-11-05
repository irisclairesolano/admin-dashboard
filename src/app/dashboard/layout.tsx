'use client';

import { adminApi, prefetchAll } from '@/api/admin';
import { useSSEReports } from '@/hooks/useSSEReports';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { usePolling } from '@/hooks/usePolling';
import { useInactivityTimer } from '@/hooks/useInactivityTimer';
import { TwoFactorSetupModal } from '@/components/TwoFactorSetupModal';
import { ShieldCheck, ShieldAlert, KeyRound, Volume2, VolumeX, Moon, Sun } from 'lucide-react';
import { authStorage } from '@/lib/authStorage';
import { humanizeModel } from '@/lib/constants';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { CommandPalette } from '@/components/CommandPalette';
import { playModerationAlertChime } from '@/lib/sound';
import { useToast } from '@/context/ToastContext';

type PrefetchStatus = 'idle' | 'loading' | 'ready' | 'error';

interface DashboardNotification {
  id: string;
  category: 'verification' | 'report' | 'support';
  title: string;
  description: string;
  timestamp: string;
  priority: 'critical' | 'attention' | 'update';
  link: string;
  targetId?: number;
}

const getRelativeTime = (timestamp?: string) => {
  if (!timestamp) return 'Just now';
  const date = new Date(timestamp);
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'unread' | 'reports' | 'verifications' | 'support'>('all');
  const [adminName, setAdminName] = useState('');
  const [adminRole, setAdminRole] = useState<'superadmin' | 'moderator'>('moderator');
  const [is2faEnabled, setIs2faEnabled] = useState(false);
  const [show2faModal, setShow2faModal] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [prefetchStatus, setPrefetchStatus] = useState<PrefetchStatus>('idle');
  const [reportToastDismissed, setReportToastDismissed] = useState(false);
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [readNotifications, setReadNotifications] = useLocalStorage<string[]>('admin_read_notifications', []);
  const [soundAlertsEnabled, setSoundAlertsEnabled] = useLocalStorage<boolean>('admin_sound_alerts_enabled', true);
  const [isDarkMode, setIsDarkMode] = useLocalStorage<boolean>('admin_dark_mode', false);
  const [desktopPermission, setDesktopPermission] = useState<NotificationPermission>('default');
  const [showPermissionBanner, setShowPermissionBanner] = useState(false);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('admin_dark_mode');
      if (saved === null && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setIsDarkMode(true);
      }
      if ('Notification' in window) {
        setDesktopPermission(Notification.permission);
        const dismissed = sessionStorage.getItem('admin_notif_banner_dismissed');
        if (Notification.permission === 'default' && !dismissed) {
          setShowPermissionBanner(true);
        }
      }
    }
  }, [setIsDarkMode]);

  const requestDesktopNotifications = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        setDesktopPermission(permission);
        setShowPermissionBanner(false);
        if (permission === 'granted') {
          triggerBrowserNotification('Notifications Enabled', 'You will receive real-time moderation and verification alerts.', '/dashboard');
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const dismissNotificationBanner = () => {
    setShowPermissionBanner(false);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('admin_notif_banner_dismissed', 'true');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  const didPrefetch = useRef(false);
  const initialSyncDone = useRef(false);
  const seenNotificationIds = useRef<Set<string>>(new Set());
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { newReportCount, latestReportAt, clearCount: clearSSECount } = useSSEReports();

  const triggerBrowserNotification = useCallback(
    (
      title: string,
      body: string,
      url: string,
      tag?: string,
      category?: 'verification' | 'report' | 'support'
    ) => {
      if (soundAlertsEnabled) {
        playModerationAlertChime();
      }
      // Always surface an immediate real-time in-browser toast so the admin sees it even if tab is focused or OS Focus Assist mutes desktop popups
      if (category === 'report') {
        toast.warning(body, title);
      } else {
        toast.info(body, title);
      }

      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          const notif = new Notification(title, {
            body,
            icon: '/favicon.ico',
            tag: tag || `${title}-${Date.now()}`,
          });
          notif.onclick = () => {
            window.focus();
            router.push(url);
            notif.close();
          };
        } catch (err) {
          console.error('Browser notification error', err);
        }
      }
    },
    [router, soundAlertsEnabled, toast]
  );

  // ── 10-Minute Inactivity Auto-Lockout ─────────────────────────────────────
  const handleInactivityLogout = () => {
    authStorage.clearSession();
    router.push('/login?reason=inactivity');
  };

  const { showWarning, secondsRemaining, stayLoggedIn } = useInactivityTimer({
    timeoutMs: 10 * 60 * 1000, // 10 minutes
    warningMs: 60 * 1000,      // 60-second warning countdown
    onTimeout: handleInactivityLogout,
  });

  // ── Auth check ────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = authStorage.getToken();
    if (!token) { router.push('/login'); return; }
    try {
      const user = authStorage.getUser<{ name?: string; admin_role?: string; two_factor_enabled?: boolean }>() || {};
      setAdminName(user.name || 'Admin');
      setAdminRole(user.admin_role === 'superadmin' ? 'superadmin' : 'moderator');
      setIs2faEnabled(!!user.two_factor_enabled);
    } catch (e) { console.error(e); }
  }, [router]);

  // ── Parallel pre-fetch & Load individual notifications (Always Fresh) ─────
  const fetchNotifications = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsSyncing(true);
      // Pass forceRefresh=true so real-time polling never reads stale 60-second cached responses
      const [verificationsRes, reportsRes, ticketsRes] = await Promise.all([
        adminApi.getVerifications(false, true),
        adminApi.getReports('open', 1, '', false, true),
        adminApi.getSupportTickets(true),
      ]);

      const list: DashboardNotification[] = [];

      // 1. Pending Verifications (Individual items)
      const pendingUsers = (verificationsRes.data?.data || []).filter((u: any) => {
        const isApproved = u.verification_status === 'approved' || !!u.verification_badge;
        const isRejected = u.verification_status === 'rejected' || u.registration_status === 'rejected';
        const hasSubmittedDocs =
          u.registration_status === 'pending_review' ||
          !!u.document_url ||
          !!u.document_back_url ||
          !!u.selfie_url ||
          (Array.isArray(u.business_documents) ? u.business_documents.length > 0 : !!u.business_documents);
        return !isApproved && !isRejected && hasSubmittedDocs;
      });

      pendingUsers.forEach((u: any) => {
        list.push({
          id: `verification-${u.id}`,
          category: 'verification',
          title: `ID Verification: ${u.name || 'User'}`,
          description: `${u.role === 'employer' ? 'Employer' : 'Worker'} submitted ID credentials (${u.municipality || 'Sorsogon'}).`,
          timestamp: u.updated_at || u.created_at || new Date().toISOString(),
          priority: 'attention',
          link: `/dashboard/verifications?search=${encodeURIComponent(u.name || '')}`,
          targetId: u.id,
        });
      });

      // 2. Open Reports (Individual items)
      const openReports = (reportsRes.data?.data || []);
      openReports.forEach((r: any) => {
        const rawModel = r.reportable_type ? humanizeModel(r.reportable_type) : 'Content';
        list.push({
          id: `report-${r.id}`,
          category: 'report',
          title: `Report #${r.id}: Flagged ${rawModel}`,
          description: `${r.reporter?.name ? `Reported by ${r.reporter.name}: ` : ''}${r.description || r.reason || 'Flagged content review needed.'}`,
          timestamp: r.created_at || new Date().toISOString(),
          priority: 'critical',
          link: `/dashboard/moderation?search=${encodeURIComponent(r.description || r.type || '')}`,
          targetId: r.id,
        });
      });

      // 3. Open Support Tickets (Individual items)
      const openTickets = (ticketsRes.data?.data || []).filter((t: any) => t.status === 'open');
      openTickets.forEach((t: any) => {
        list.push({
          id: `support-${t.id}`,
          category: 'support',
          title: `Support Ticket #${t.id}: ${t.subject || 'Inquiry'}`,
          description: `From ${t.user?.name || 'User'}: ${t.message ? (t.message.length > 70 ? t.message.slice(0, 70) + '...' : t.message) : 'Open inquiry ticket.'}`,
          timestamp: t.created_at || new Date().toISOString(),
          priority: 'update',
          link: `/dashboard/support?search=${encodeURIComponent(t.subject || t.user?.name || '')}`,
          targetId: t.id,
        });
      });

      // Sort newest first
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setNotifications(list);

      // Detect newly arrived or re-submitted notification items by unique signature (id + timestamp)
      const currentSignatures = new Set<string>();
      const newlyArrived: DashboardNotification[] = [];

      list.forEach((item) => {
        const sig = `${item.id}:${item.timestamp}`;
        currentSignatures.add(sig);
        if (initialSyncDone.current && !seenNotificationIds.current.has(sig)) {
          newlyArrived.push(item);
        }
      });

      seenNotificationIds.current = currentSignatures;

      if (initialSyncDone.current) {
        if (newlyArrived.length > 0) {
          // Ensure re-submitted items (e.g. user re-uploaded ID) appear as unread
          const newIds = new Set(newlyArrived.map((n) => n.id));
          setReadNotifications((prev) => prev.filter((id) => !newIds.has(id)));

          // Fire real-time browser & in-app notifications (up to 3 individual alerts at once)
          newlyArrived.slice(0, 3).forEach((item) => {
            triggerBrowserNotification(
              item.title,
              item.description,
              item.link,
              `${item.id}-${item.timestamp}`,
              item.category
            );
          });
        }
      } else {
        initialSyncDone.current = true;
      }
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setNotificationsLoading(false);
      setIsSyncing(false);
    }
  }, [triggerBrowserNotification, setReadNotifications]);

  useEffect(() => {
    if (didPrefetch.current) return;
    didPrefetch.current = true;

    const token = authStorage.getToken();
    if (!token) return;

    setPrefetchStatus('loading');

    // Initial pre-fetch + load notification counts
    Promise.all([prefetchAll(), fetchNotifications(true)])
      .then(() => {
        setPrefetchStatus('ready');
      })
      .catch(() => {
        setPrefetchStatus('error');
      });
  }, [fetchNotifications]);

  // When visiting the moderation page, automatically clear the SSE new reports alert counter
  useEffect(() => {
    if ((pathname === '/dashboard/moderation' || pathname === '/dashboard/reports') && newReportCount > 0) {
      clearSSECount();
    }
  }, [pathname, newReportCount, clearSSECount]);

  // When a real-time SSE report alert arrives, instantly re-sync notifications
  useEffect(() => {
    if (newReportCount > 0) {
      fetchNotifications(true);
    }
  }, [newReportCount, latestReportAt, fetchNotifications]);

  // Listen for real-time notification refresh events, window focus, and tab visibility
  useEffect(() => {
    const handleRefresh = () => {
      fetchNotifications(true);
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications(true);
      }
    };
    window.addEventListener('admin:refresh-notifications', handleRefresh);
    window.addEventListener('focus', handleRefresh);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('admin:refresh-notifications', handleRefresh);
      window.removeEventListener('focus', handleRefresh);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchNotifications]);

  // Auto-refresh notifications every 8 seconds for responsive real-time updates
  usePolling(() => fetchNotifications(true), 8000);

  const handleLogout = () => {
    authStorage.clearSession();
    router.push('/login');
  };

  const pendingVerificationsCount = notifications.filter(n => n.category === 'verification').length;
  const openReportsCount = Math.max(newReportCount, notifications.filter(n => n.category === 'report').length);
  const openTicketsCount = notifications.filter(n => n.category === 'support').length;

  const rawNavItems = [
    { name: 'Analytics',    href: '/dashboard',               iconClass: 'lni lni-grid-alt',  badge: 0,                       section: 'overview' },
    { name: 'Verifications',href: '/dashboard/verifications',  iconClass: 'lni lni-user',      badge: pendingVerificationsCount, badgeColor: 'bg-primary text-white', section: 'people' },
    { name: 'Users',        href: '/dashboard/users',          iconClass: 'lni lni-users',     badge: 0,                       section: 'people' },
    { name: 'Jobs',         href: '/dashboard/jobs',           iconClass: 'lni lni-briefcase', badge: 0,                       section: 'people' },
    { name: 'Moderation',   href: '/dashboard/moderation',     iconClass: 'lni lni-flag',      badge: openReportsCount,        badgeColor: 'bg-status-error text-white', section: 'trust' },
    { name: 'Blacklist',    href: '/dashboard/blacklist',      iconClass: 'lni lni-ban',       badge: 0,                       section: 'trust' },
    { name: 'Word Filter',  href: '/dashboard/profanity',      iconClass: 'lni lni-text-format', badge: 0,                     section: 'trust' },
    { name: 'Support',      href: '/dashboard/support',        iconClass: 'lni lni-comments',  badge: openTicketsCount,        badgeColor: 'bg-status-warning text-white', section: 'trust' },
    { name: 'Reports',      href: '/dashboard/export-reports', iconClass: 'lni lni-printer',   badge: 0,                       section: 'records' },
    { name: 'Archives',     href: '/dashboard/archives',       iconClass: 'lni lni-archive',   badge: 0,                       section: 'records' },
    { name: 'Audit Logs',   href: '/dashboard/logs',           iconClass: 'lni lni-shield',    badge: 0,                       superAdminOnly: true, section: 'records' },
  ];

  const navItems = rawNavItems.filter(item => !item.superAdminOnly || adminRole === 'superadmin');

  const navSections = [
    { key: 'overview', label: 'Overview',           items: navItems.filter(i => i.section === 'overview') },
    { key: 'people',   label: 'People & Listings',  items: navItems.filter(i => i.section === 'people') },
    { key: 'trust',    label: 'Trust & Safety',     items: navItems.filter(i => i.section === 'trust') },
    { key: 'records',  label: 'Records',            items: navItems.filter(i => i.section === 'records') },
  ].filter(s => s.items.length > 0);

  // ── Notifications Helper Computes ──────────────────────────────────────────
  const unreadNotifications = notifications.filter(n => !readNotifications.includes(n.id));
  const unreadCount = unreadNotifications.length;

  const filteredNotifications = notifications.filter(item => {
    if (notificationFilter === 'unread') return !readNotifications.includes(item.id);
    if (notificationFilter === 'reports') return item.category === 'report';
    if (notificationFilter === 'verifications') return item.category === 'verification';
    if (notificationFilter === 'support') return item.category === 'support';
    return true;
  });

  const markAllAsRead = () => {
    setReadNotifications(notifications.map(n => n.id));
  };

  const clearReadNotifications = () => {
    setNotifications(prev => prev.filter(n => !readNotifications.includes(n.id)));
  };

  const handleNotificationClick = (item: DashboardNotification) => {
    if (!readNotifications.includes(item.id)) {
      setReadNotifications(prev => [...prev, item.id]);
    }
    setDropdownOpen(false);
    setSidebarOpen(false);
    router.push(item.link);
  };

  // ── Notification Trigger Button ─────────────────────────────────────────────
  const NotificationButton = () => (
    <div className="relative">
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="p-2.5 bg-white/70 hover:bg-white dark:bg-slate-900/80 dark:hover:bg-slate-800 text-ink dark:text-slate-200 hover:text-primary dark:hover:text-primary-soft rounded-2xl border border-white/60 dark:border-slate-800 shadow-sm transition-all relative flex items-center justify-center cursor-pointer"
        aria-label="View notifications"
        title="Action Center & Notifications"
      >
        <i className="lni lni-alarm text-xl"></i>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-status-error text-white font-body font-bold text-[10px] rounded-full flex items-center justify-center shadow-md animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  );

  // ── Dark Mode Toggle Button ────────────────────────────────────────────────
  const DarkModeToggle = () => (
    <button
      type="button"
      onClick={() => setIsDarkMode((prev) => !prev)}
      className="p-2.5 bg-white/70 hover:bg-white dark:bg-slate-900/80 dark:hover:bg-slate-800 text-ink dark:text-slate-200 hover:text-primary dark:hover:text-amber-400 rounded-2xl border border-white/60 dark:border-slate-800 shadow-sm transition-all flex items-center justify-center cursor-pointer"
      title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {isDarkMode ? (
        <Sun className="w-5 h-5 text-amber-400 transition-transform duration-200 hover:rotate-45" />
      ) : (
        <Moon className="w-5 h-5 text-ink-muted hover:text-primary transition-transform duration-200 hover:-rotate-12" />
      )}
    </button>
  );

  // ── Admin Profile Dropdown Menu in Top Navbar ─────────────────────────────
  const AdminProfileMenu = () => (
    <div className="relative">
      <button
        type="button"
        onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
        className="flex items-center gap-2.5 p-1.5 pl-2 pr-2.5 bg-white/70 hover:bg-white dark:bg-slate-900/80 dark:hover:bg-slate-800 text-ink dark:text-slate-200 border border-white/60 dark:border-slate-800 rounded-2xl shadow-sm transition-all cursor-pointer focus:outline-none"
        aria-label="Admin Profile Menu"
        aria-expanded={profileDropdownOpen}
      >
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-peach to-accent-peachBright dark:from-slate-800 dark:to-slate-700 flex items-center justify-center shadow-inner flex-shrink-0">
          <span className="font-body font-bold text-primary-dark dark:text-primary-soft text-sm">{adminName ? adminName.charAt(0).toUpperCase() : 'A'}</span>
        </div>
        <div className="hidden sm:flex flex-col text-left">
          <span className="text-xs font-body font-bold text-ink dark:text-slate-200 leading-tight truncate max-w-[110px] md:max-w-[130px]">{adminName || 'Admin'}</span>
          <span className="text-[10px] text-ink-muted dark:text-slate-400 leading-tight capitalize">{adminRole === 'superadmin' ? 'Super Admin' : 'Moderator'}</span>
        </div>
        <i className={`lni lni-chevron-down text-[10px] text-ink-muted dark:text-slate-400 transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180 text-ink dark:text-slate-200' : ''}`} />
      </button>

      {/* Floating Dropdown Popover */}
      {profileDropdownOpen && (
        <>
          {/* Invisible click-away backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setProfileDropdownOpen(false)}
          />

          <div
            className="absolute right-0 mt-2 w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-800 shadow-xl z-50 py-2 animate-fade-in divide-y divide-ink-faint/30 dark:divide-slate-800"
            style={{ boxShadow: '0 12px 36px -4px rgba(0,0,0,0.12), 0 4px 12px -2px rgba(0,0,0,0.06)' }}
          >
            {/* User Info Header */}
            <div className="px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-peach to-accent-peachBright dark:from-slate-800 dark:to-slate-700 flex items-center justify-center shadow-inner flex-shrink-0">
                  <span className="font-body font-bold text-primary-dark dark:text-sky-300 text-base">{adminName ? adminName.charAt(0).toUpperCase() : 'A'}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-body font-bold text-ink dark:text-slate-100 truncate">{adminName}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`text-[10px] font-body font-bold px-1.5 py-0.2 rounded-md ${
                      adminRole === 'superadmin' 
                        ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800' 
                        : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    }`}>
                      {adminRole === 'superadmin' ? 'Super Admin' : 'Moderator'}
                    </span>
                    {is2faEnabled && (
                      <span className="text-[10px] bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 font-bold px-1.5 py-0.2 rounded-md flex items-center gap-0.5">
                        <ShieldCheck className="w-2.5 h-2.5" /> 2FA
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 2FA Setup trigger */}
            <div className="py-1 px-2">
              <button
                type="button"
                onClick={() => {
                  setProfileDropdownOpen(false);
                  setShow2faModal(true);
                }}
                className="w-full text-left py-2 px-3 text-xs font-semibold text-ink-soft dark:text-slate-300 hover:text-primary dark:hover:text-primary-soft hover:bg-paper dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-primary dark:text-sky-400" />
                  {is2faEnabled ? 'Manage 2FA' : 'Enable 2FA (TOTP)'}
                </span>
                {!is2faEnabled ? (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                )}
              </button>
            </div>

            {/* Sign Out action */}
            <div className="py-1 px-2">
              <button
                type="button"
                onClick={() => {
                  setProfileDropdownOpen(false);
                  handleLogout();
                }}
                className="group flex items-center w-full px-3 py-2 text-xs font-body font-semibold text-status-error hover:bg-status-error/10 dark:hover:bg-status-error/20 rounded-xl transition-all duration-200 cursor-pointer"
              >
                <i className="lni lni-exit text-sm mr-2.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="h-screen bg-paper flex relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-soft/50 dark:bg-primary/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-70 dark:opacity-30 animate-pulse-slow" />
      <div className="absolute top-[20%] right-[-5%] w-72 h-72 bg-accent-sky/50 dark:bg-sky-900/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-70 dark:opacity-30 animate-pulse-slow" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-[-10%] left-[20%] w-80 h-80 bg-accent-mint/40 dark:bg-emerald-950/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-70 dark:opacity-20 animate-pulse-slow" style={{ animationDelay: '2s' }} />

      {/* Mobile header */}
      <div className="no-print lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 dark:bg-slate-900/90 backdrop-blur-md border-b border-white/50 dark:border-slate-800 z-20 flex items-center justify-between px-4 shadow-sm flex-shrink-0">
        <div className="flex items-center">
          <Image src="/logo/04_Wordmark.png" alt="SIKAP Logo" width={120} height={32} className="h-8 object-contain dark:brightness-125" />
          <span className="text-xs font-body font-semibold text-ink-muted dark:text-slate-400 ml-2 bg-ink-faint/30 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-ink-faint/50 dark:border-slate-700">Admin</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="p-2 text-ink-muted dark:text-slate-400 hover:text-ink dark:hover:text-slate-100 hover:bg-paper dark:hover:bg-slate-800 rounded-full transition-colors flex items-center justify-center cursor-pointer"
            title="Search (Command Palette)"
            aria-label="Search"
          >
            <i className="lni lni-search text-lg" />
          </button>
          <DarkModeToggle />
          <NotificationButton />
          <AdminProfileMenu />
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-ink dark:text-slate-200 hover:bg-paper dark:hover:bg-slate-800 rounded-full transition-colors flex items-center justify-center cursor-pointer" aria-label="Toggle sidebar">
            {sidebarOpen ? <i className="lni lni-close text-lg" /> : <i className="lni lni-menu text-lg" />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={`no-print
        fixed inset-y-0 left-0 z-30 bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl border-r border-white/50 dark:border-slate-800 shadow-glass
        transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
        lg:static lg:flex-shrink-0 h-full flex flex-col
        ${sidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'}
        ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-72'}
      `}>
        {/* Sidebar Header */}
        <div className={`h-20 flex items-center border-b border-ink-faint/30 dark:border-slate-800 flex-shrink-0 transition-all duration-300 ${
          sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-5'
        }`}>
          {!sidebarCollapsed ? (
            <div className="flex items-center">
              <Image src="/logo/04_Wordmark.png" alt="SIKAP Logo" width={135} height={36} className="h-9 object-contain dark:brightness-125" />
              <span className="text-[10px] font-body font-semibold text-ink-muted dark:text-slate-400 ml-1.5 bg-ink-faint/30 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-ink-faint/50 dark:border-slate-700">Admin</span>
            </div>
          ) : (
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 dark:bg-slate-800 border border-primary/20 dark:border-slate-700 text-primary dark:text-primary-soft shadow-xs">
              <span className="font-display font-black text-lg text-primary dark:text-sky-400">S</span>
            </div>
          )}
        </div>

        <div className={`flex flex-col flex-1 min-h-0 justify-between transition-all duration-300 ${
          sidebarCollapsed ? 'p-2.5' : 'p-5'
        }`}>
          <nav className="flex-1 mt-4 lg:mt-0 overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:theme(colors.ink.faint)_transparent] space-y-4">
            {navSections.map((section) => (
              <div key={section.key}>
                {!sidebarCollapsed ? (
                  <span className="block text-[9px] font-body font-bold uppercase tracking-widest text-ink-muted/60 dark:text-slate-500 px-4 mb-1.5">
                    {section.label}
                  </span>
                ) : (
                  <div className="h-px bg-ink-faint/40 dark:bg-slate-800 my-2 mx-2" />
                )}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href;
                    const hasBadge = item.badge > 0;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        title={sidebarCollapsed ? item.name : undefined}
                        className={`
                          group flex items-center text-sm font-body font-semibold rounded-2xl
                          transition-all duration-300 relative overflow-hidden
                          ${sidebarCollapsed ? 'justify-center p-3' : 'px-4 py-3'}
                          ${isActive
                            ? 'bg-ink dark:bg-slate-800 text-white shadow-md transform scale-[1.02]'
                            : 'text-ink-soft dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/60 hover:text-ink dark:hover:text-slate-100 hover:shadow-sm'
                          }
                        `}
                      >
                        {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary dark:bg-sky-400 rounded-r-full" />}
                        <div className="relative flex items-center justify-center">
                          <i className={`${item.iconClass} text-lg transition-transform duration-300 group-hover:scale-110 ${
                            sidebarCollapsed ? '' : 'mr-3'
                          } ${isActive ? 'text-white' : 'text-ink-muted dark:text-slate-400 group-hover:text-primary-dark dark:group-hover:text-sky-300'}`} />

                          {/* Mini badge dot in collapsed rail mode */}
                          {sidebarCollapsed && hasBadge && (
                            <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 rounded-full bg-status-error border-2 border-white dark:border-slate-900 animate-pulse" />
                          )}
                        </div>

                        {!sidebarCollapsed && (
                          <>
                            <span className="truncate">{item.name}</span>
                            <span className="ml-auto flex items-center gap-1.5">
                              {hasBadge && (
                                <span className={`min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm ${
                                  item.badgeColor || 'bg-status-error text-white'
                                } ${item.name === 'Moderation' ? 'animate-pulse' : ''}`}>
                                  {item.badge > 99 ? '99+' : item.badge}
                                </span>
                              )}
                              {prefetchStatus === 'loading' && !hasBadge && (
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                              )}
                            </span>
                          </>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className={`pt-4 border-t border-ink-faint/30 dark:border-slate-800 mt-auto flex items-center text-[11px] text-ink-muted dark:text-slate-500 flex-shrink-0 ${
            sidebarCollapsed ? 'justify-center px-0' : 'justify-between px-2'
          }`}>
            {!sidebarCollapsed ? (
              <>
                <span className="font-body font-semibold">SIKAP Admin</span>
                <span className="font-mono text-[10px] bg-paper dark:bg-slate-800 px-1.5 py-0.5 rounded border border-ink-faint/40 dark:border-slate-700">v1.2</span>
              </>
            ) : (
              <span className="font-mono text-[9px] bg-paper dark:bg-slate-800 px-1 py-0.5 rounded border border-ink-faint/40 dark:border-slate-700">v1.2</span>
            )}
          </div>
        </div>
      </aside>

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
                  router.push('/dashboard/moderation');
                }}
                className="mt-2.5 text-xs font-body font-semibold text-status-error hover:underline flex items-center gap-1"
              >
                Review Moderation Queue <i className="lni lni-arrow-right text-[10px]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Persistent Content Wrapper (Main) ──────────────────── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Desktop Top Header (Content Page Side) */}
        <header className="no-print hidden lg:flex items-center justify-between h-14 px-6 bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl border-b border-white/50 dark:border-slate-800 z-20 flex-shrink-0 gap-6">
          <div className="flex items-center gap-3 shrink-0">
            {/* Sidebar toggle button */}
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? "Expand sidebar" : "Minimize sidebar"}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Minimize sidebar"}
              className="w-8 h-8 rounded-lg bg-white/80 hover:bg-white dark:bg-slate-900/80 dark:hover:bg-slate-800 border border-ink-faint/50 dark:border-slate-700 hover:border-ink-faint dark:hover:border-slate-600 text-ink-muted dark:text-slate-400 hover:text-ink dark:hover:text-slate-100 shadow-2xs flex items-center justify-center transition-all cursor-pointer group shrink-0"
            >
              <i className={`text-sm transition-transform duration-300 group-hover:scale-110 ${
                sidebarCollapsed ? 'lni lni-menu' : 'lni lni-chevron-left'
              }`} />
            </button>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-body uppercase tracking-wider text-ink-muted dark:text-slate-400">Admin Dashboard</span>
              <span className="text-ink-faint dark:text-slate-700">/</span>
              <span className="text-xs font-display font-bold text-ink dark:text-slate-200 capitalize truncate max-w-[160px]">
                {pathname.replace('/dashboard', '').replace('/', '') || 'Analytics Overview'}
              </span>
            </div>
          </div>

          {/* Prominent Quick Search Bar (Command Palette Trigger) */}
          <div className="flex-1 max-w-xl mx-auto flex items-center">
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="w-full flex items-center justify-between h-9 px-3.5 rounded-xl bg-white/90 hover:bg-white dark:bg-slate-900/90 dark:hover:bg-slate-800 border border-ink-faint/60 dark:border-slate-800 hover:border-primary/40 dark:hover:border-slate-700 text-ink-muted dark:text-slate-400 hover:text-ink dark:hover:text-slate-200 shadow-2xs hover:shadow-sm transition-all cursor-pointer group text-xs font-body"
              title="Search and jump to any page or command (Ctrl + K)"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <i className="lni lni-search text-sm text-ink-muted dark:text-slate-400 group-hover:text-primary dark:group-hover:text-amber-400 transition-colors shrink-0" />
                <span className="text-ink-muted/80 dark:text-slate-400 group-hover:text-ink/90 dark:group-hover:text-slate-200 font-medium truncate">
                  Search pages, workers, employers, reports, actions...
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-3">
                <kbd className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-semibold text-ink-muted/90 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-ink-faint/70 dark:border-slate-700 rounded shadow-2xs">
                  Ctrl
                </kbd>
                <kbd className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-semibold text-ink-muted/90 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-ink-faint/70 dark:border-slate-700 rounded shadow-2xs">
                  K
                </kbd>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Dark Mode Toggle */}
            <DarkModeToggle />

            {/* Audio Alerts Toggle */}
            <button
              type="button"
              onClick={() => setSoundAlertsEnabled((prev) => !prev)}
              className="p-2.5 bg-white/70 hover:bg-white dark:bg-slate-900/80 dark:hover:bg-slate-800 text-ink dark:text-slate-200 hover:text-primary dark:hover:text-primary-soft rounded-2xl border border-white/60 dark:border-slate-800 hover:border-primary/30 shadow-sm transition-all flex items-center justify-center cursor-pointer"
              title={soundAlertsEnabled ? 'Mute alert sounds' : 'Enable alert sounds'}
              aria-label={soundAlertsEnabled ? 'Mute alert sounds' : 'Enable alert sounds'}
            >
              {soundAlertsEnabled ? (
                <Volume2 className="w-5 h-5 text-primary dark:text-sky-400" />
              ) : (
                <VolumeX className="w-5 h-5 text-ink-muted dark:text-slate-400" />
              )}
            </button>

            {/* Action Center / Notifications Button on Content Side */}
            <NotificationButton />
            {/* Admin Profile Menu */}
            <AdminProfileMenu />
          </div>
        </header>

        {/* Desktop Notification Opt-in Banner */}
        {showPermissionBanner && desktopPermission === 'default' && (
          <div className="bg-primary/10 border-b border-primary/20 px-4 py-2.5 text-xs text-ink flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <i className="lni lni-alarm text-primary text-sm" />
              <span>
                Enable desktop notifications to receive immediate alerts for urgent reports and verifications even in background tabs.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={requestDesktopNotifications}
                className="px-3 py-1 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-hover transition-colors shadow-2xs cursor-pointer"
              >
                Enable Alerts
              </button>
              <button
                type="button"
                onClick={dismissNotificationBanner}
                className="text-ink-muted hover:text-ink p-1 rounded transition-colors cursor-pointer"
                aria-label="Dismiss banner"
              >
                <i className="lni lni-close text-xs" />
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 w-full mx-auto relative overflow-y-auto pt-16 lg:pt-0">
          <div className="p-3 sm:p-4 md:p-6 animate-fade-in max-w-[1560px] mx-auto">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {/* ── Two-Factor Authentication Setup Modal ─────────────── */}
      <TwoFactorSetupModal
        isOpen={show2faModal}
        isCurrentlyEnabled={is2faEnabled}
        onClose={() => setShow2faModal(false)}
        onSuccess={() => {
          setIs2faEnabled(true);
          try {
            const user = authStorage.getUser<Record<string, unknown>>() || {};
            user.two_factor_enabled = true;
            authStorage.setUser(user);
          } catch {}
        }}
        onDisableSuccess={() => {
          setIs2faEnabled(false);
          try {
            const user = authStorage.getUser<Record<string, unknown>>() || {};
            user.two_factor_enabled = false;
            authStorage.setUser(user);
          } catch {}
        }}
      />

      {/* ── 10-Minute Inactivity Warning Modal ─────────────────── */}
      {showWarning && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-amber-200 dark:border-amber-800/50 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 flex items-center justify-center text-amber-600 dark:text-amber-400 animate-pulse">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h3 className="font-display font-bold text-xl text-ink dark:text-slate-100 mb-2">Session Inactivity Warning</h3>
            <p className="text-sm text-ink-soft dark:text-slate-300 mb-6 leading-relaxed">
              You have been inactive for nearly 10 minutes. For security compliance, your session will automatically lock out in:
            </p>
            <div className="text-4xl font-mono font-black text-amber-600 dark:text-amber-400 mb-6 tracking-wider">
              {secondsRemaining}s
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleInactivityLogout}
                className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-ink dark:text-slate-100 font-bold text-xs rounded-xl transition-colors"
              >
                Sign Out Now
              </button>
              <button
                type="button"
                onClick={stayLoggedIn}
                className="flex-1 py-3 px-4 bg-primary hover:bg-primary-dark text-white font-bold text-xs rounded-xl transition-colors shadow-md shadow-primary/20"
              >
                Stay Signed In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Center / Notification Drawer (Static overlay, no slide-in re-animation) */}
      {dropdownOpen && (
        <>
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-ink/30 dark:bg-black/50 backdrop-blur-sm z-[100] transition-opacity"
            onClick={() => setDropdownOpen(false)}
          />

          {/* Static Drawer Panel (Fixed on right, static in place with content-only updates) */}
          <div className="fixed inset-y-0 right-0 z-[101] w-full max-w-md h-screen bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl border-l border-ink-faint/30 dark:border-slate-800 flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-ink-faint/30 dark:border-slate-800 bg-paper/40 dark:bg-slate-800/40">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-display text-xl text-ink dark:text-slate-100 font-bold flex items-center gap-2">
                    Action Center
                    {unreadCount > 0 && (
                      <span className="text-xs font-mono font-bold bg-status-error/10 text-status-error border border-status-error/20 px-2 py-0.5 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-ink-soft dark:text-slate-400 mt-1">Pending items requiring moderation & review</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => fetchNotifications(false)}
                    disabled={isSyncing}
                    className="p-2 text-ink-soft dark:text-slate-400 hover:text-primary dark:hover:text-primary-soft hover:bg-white/80 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    title="Refresh notifications"
                    aria-label="Refresh notifications"
                  >
                    <i className={`lni lni-reload text-sm ${isSyncing ? 'animate-spin text-primary' : ''}`} />
                  </button>
                  <button
                    onClick={() => setDropdownOpen(false)}
                    className="w-8 h-8 flex items-center justify-center hover:bg-paper dark:hover:bg-slate-800 rounded-full text-ink-muted dark:text-slate-400 hover:text-ink dark:hover:text-slate-100 transition-colors cursor-pointer"
                    aria-label="Close notifications"
                  >
                    <i className="lni lni-close text-xs" />
                  </button>
                </div>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex items-center gap-1.5 mt-4 overflow-x-auto pb-1 text-xs">
                <button
                  onClick={() => setNotificationFilter('all')}
                  className={`px-3 py-1.5 rounded-xl font-body font-semibold transition-all cursor-pointer ${
                    notificationFilter === 'all'
                      ? 'bg-ink dark:bg-slate-700 text-white shadow-sm'
                      : 'bg-white/60 dark:bg-slate-800/60 text-ink-soft dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-ink dark:hover:text-slate-100'
                  }`}
                >
                  All ({notifications.length})
                </button>
                <button
                  onClick={() => setNotificationFilter('unread')}
                  className={`px-3 py-1.5 rounded-xl font-body font-semibold transition-all cursor-pointer ${
                    notificationFilter === 'unread'
                      ? 'bg-ink dark:bg-slate-700 text-white shadow-sm'
                      : 'bg-white/60 dark:bg-slate-800/60 text-ink-soft dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-ink dark:hover:text-slate-100'
                  }`}
                >
                  Unread ({unreadCount})
                </button>
                <button
                  onClick={() => setNotificationFilter('reports')}
                  className={`px-3 py-1.5 rounded-xl font-body font-semibold transition-all cursor-pointer ${
                    notificationFilter === 'reports'
                      ? 'bg-status-error text-white shadow-sm'
                      : 'bg-white/60 dark:bg-slate-800/60 text-ink-soft dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-ink dark:hover:text-slate-100'
                  }`}
                >
                  Reports ({notifications.filter(n => n.category === 'report').length})
                </button>
                <button
                  onClick={() => setNotificationFilter('verifications')}
                  className={`px-3 py-1.5 rounded-xl font-body font-semibold transition-all cursor-pointer ${
                    notificationFilter === 'verifications'
                      ? 'bg-primary dark:bg-primary-soft text-white shadow-sm'
                      : 'bg-white/60 dark:bg-slate-800/60 text-ink-soft dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-ink dark:hover:text-slate-100'
                  }`}
                >
                  IDs ({notifications.filter(n => n.category === 'verification').length})
                </button>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-ink-faint/20 dark:border-slate-800 text-xs">
                {unreadCount > 0 ? (
                  <button
                    onClick={markAllAsRead}
                    className="font-body font-semibold text-primary dark:text-sky-400 hover:text-primary-dark dark:hover:text-sky-300 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <i className="lni lni-checkmark text-xs" />
                    Mark all read
                  </button>
                ) : (
                  <span className="text-[11px] text-ink-muted dark:text-slate-400">All notifications caught up</span>
                )}
                {notifications.some(n => readNotifications.includes(n.id)) && (
                  <button
                    onClick={clearReadNotifications}
                    className="font-body text-ink-muted dark:text-slate-400 hover:text-status-error dark:hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    Clear read
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-ink-faint/20 dark:divide-slate-800 p-4 space-y-2">
              {notificationsLoading && notifications.length === 0 ? (
                <div className="space-y-3 p-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-ink-faint/30 dark:border-slate-700 animate-pulse flex gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-ink-faint/50 dark:bg-slate-700 flex-shrink-0" />
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-4 bg-ink-faint/60 dark:bg-slate-700 rounded w-3/4" />
                        <div className="h-3 bg-ink-faint/40 dark:bg-slate-700 rounded w-full" />
                        <div className="h-2.5 bg-ink-faint/30 dark:bg-slate-700 rounded w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-14 h-14 bg-status-success/10 text-status-success rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                    <i className="lni lni-checkmark-circle text-2xl" />
                  </div>
                  <h4 className="font-display font-bold text-ink dark:text-slate-100 text-sm">Everything is Clear</h4>
                  <p className="text-xs text-ink-soft dark:text-slate-400 mt-1">No notifications matching this filter.</p>
                </div>
              ) : (
                filteredNotifications.map((item) => {
                  const isRead = readNotifications.includes(item.id);
                  const isCritical = item.priority === 'critical';
                  const isAttention = item.priority === 'attention';

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={`
                        w-full text-left p-4 transition-all flex gap-3.5 rounded-2xl border cursor-pointer
                        ${isRead
                          ? 'opacity-60 bg-white/40 dark:bg-slate-900/40 border-transparent hover:opacity-90 hover:bg-white/70 dark:hover:bg-slate-800/70'
                          : isCritical
                            ? 'bg-status-error/5 dark:bg-status-error/15 border-status-error/25 dark:border-status-error/40 shadow-sm hover:bg-status-error/10'
                            : isAttention
                              ? 'bg-amber-500/5 dark:bg-amber-500/15 border-amber-500/25 dark:border-amber-500/40 shadow-sm hover:bg-amber-500/10'
                              : 'bg-white dark:bg-slate-800/80 border-white/70 dark:border-slate-700 shadow-sm hover:bg-paper/80 dark:hover:bg-slate-800'}
                      `}
                    >
                      <div className={`
                        w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center shadow-inner
                        ${isCritical
                          ? 'bg-status-error/15 text-status-error border border-status-error/30 dark:border-status-error/40'
                          : isAttention
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 dark:border-amber-500/40'
                            : 'bg-primary/10 dark:bg-sky-950/40 text-primary dark:text-sky-400 border border-primary/25 dark:border-sky-800'
                        }
                      `}>
                        {isCritical ? (
                          <i className="lni lni-flag text-base" />
                        ) : isAttention ? (
                          <i className="lni lni-user text-base" />
                        ) : (
                          <i className="lni lni-comments text-base" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className={`text-[10px] font-body font-bold uppercase tracking-wider ${
                            isCritical ? 'text-status-error' : isAttention ? 'text-amber-600 dark:text-amber-400' : 'text-primary dark:text-sky-400'
                          }`}>
                            {isCritical ? 'Critical Report' : isAttention ? 'ID Verification' : 'Support Inquiry'}
                          </span>
                          <span className="text-[10px] font-mono text-ink-muted dark:text-slate-400 flex items-center gap-1">
                            {!isRead && <span className="w-2 h-2 rounded-full bg-primary dark:bg-sky-400 flex-shrink-0 animate-ping" />}
                            {getRelativeTime(item.timestamp)}
                          </span>
                        </div>
                        <h4 className={`text-sm font-body font-bold mt-1 truncate ${isRead ? 'text-ink-soft dark:text-slate-400' : 'text-ink dark:text-slate-100'}`}>
                          {item.title}
                        </h4>
                        <p className="text-xs font-body text-ink-soft dark:text-slate-300 mt-1 leading-relaxed line-clamp-2">
                          {item.description}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 bg-paper/40 dark:bg-slate-800/40 text-center border-t border-ink-faint/30 dark:border-slate-800">
              <span className="text-[10px] font-body font-semibold text-ink-muted dark:text-slate-400 flex items-center justify-center gap-1">
                <i className={`lni lni-checkmark-circle text-xs ${isSyncing ? 'text-primary animate-pulse' : 'text-emerald-500'}`} />
                {isSyncing ? 'Syncing notifications...' : 'Live background synchronization active'}
              </span>
            </div>
          </div>
        </>
      )}

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-ink/30 backdrop-blur-sm z-20 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onOpen2FA={() => setShow2faModal(true)}
      />
    </div>
  );
}
