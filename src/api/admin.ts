import axios from 'axios';
import { authStorage } from '@/lib/authStorage';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://sikap-backend-singapore.onrender.com/api/v1';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Add interceptor to attach bearer token
apiClient.interceptors.request.use((config) => {
  const token = authStorage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 Unauthorized (expired token)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const url = error.config?.url || '';
      const isAuthEndpoint = url.includes('/admin/auth/reauth') || url.includes('/admin/auth/login');

      if (!isAuthEndpoint && typeof window !== 'undefined') {
        authStorage.clearSession();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Stale-While-Revalidate Cache for Admin Dashboard
const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 60 seconds TTL (instant tab switching with background revalidation)

// Identical GETs that are already on the wire share one promise (avoids duplicate requests
// when e.g. the layout badge and a page both ask for the same endpoint at mount).
const inFlight = new Map<string, Promise<any>>();

// Large payloads (all=1 masterlists) are kept in memory only: serialising them into
// sessionStorage blocks the main thread and quickly exhausts the storage quota.
const MAX_PERSIST_CHARS = 200_000;

const SESSION_PREFIX = 'api_cache_';
const SESSION_TIME_PREFIX = 'api_cache_time_';

const urlFromStorageKey = (key: string): string | null => {
  if (key.startsWith(SESSION_TIME_PREFIX)) return key.slice(SESSION_TIME_PREFIX.length);
  if (key.startsWith(SESSION_PREFIX)) return key.slice(SESSION_PREFIX.length);
  return null;
};

/**
 * Clears cached GET responses.
 * - No argument: clears everything (logout / login / tests).
 * - With prefixes: only entries whose URL starts with one of the prefixes are dropped,
 *   so unrelated sections stay warm after a mutation.
 */
export const clearApiCache = (prefixes?: string[]) => {
  const matches = (url: string) => !prefixes || prefixes.some((p) => url.startsWith(p));

  Array.from(apiCache.keys()).forEach((url) => {
    if (matches(url)) apiCache.delete(url);
  });
  Array.from(inFlight.keys()).forEach((url) => {
    if (matches(url)) inFlight.delete(url);
  });

  if (typeof window !== 'undefined') {
    try {
      Object.keys(sessionStorage).forEach((key) => {
        const url = urlFromStorageKey(key);
        if (url !== null && matches(url)) sessionStorage.removeItem(key);
      });
      if (!prefixes) {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith(SESSION_PREFIX)) localStorage.removeItem(key);
        });
      }
    } catch {
      // Ignore
    }
  }
};

// Cache invalidation groups used after mutations
const INVALIDATE = {
  users: ['/admin/users', '/admin/verifications', '/admin/blacklist', '/admin/jobs', '/admin/reports', '/admin/analytics', '/admin/logs'],
  verification: ['/admin/users', '/admin/verifications', '/admin/analytics', '/admin/logs'],
  jobs: ['/admin/jobs', '/admin/users', '/admin/reports', '/admin/analytics', '/admin/logs'],
  reports: ['/admin/reports', '/admin/analytics', '/admin/logs'],
  support: ['/admin/support', '/admin/logs'],
  profanity: ['/admin/profanity-words', '/admin/logs'],
};

/** Runs a mutation, then invalidates only the related cache entries once it succeeds. */
const mutate = async <T>(request: Promise<T>, prefixes: string[]): Promise<T> => {
  const result = await request;
  clearApiCache(prefixes);
  return result;
};

const storeResponse = (url: string, response: { data: any; status: number }) => {
  const payload = { data: response.data, status: response.status };
  apiCache.set(url, { data: payload, timestamp: Date.now() });

  if (typeof window === 'undefined' || url.includes('all=1')) return;
  try {
    const serialized = JSON.stringify(payload);
    if (serialized.length > MAX_PERSIST_CHARS) return;
    sessionStorage.setItem(SESSION_PREFIX + url, serialized);
    sessionStorage.setItem(SESSION_TIME_PREFIX + url, Date.now().toString());
  } catch {
    // Quota exceeded: drop persisted entries; the in-memory cache still works.
    try {
      Object.keys(sessionStorage)
        .filter((k) => k.startsWith(SESSION_PREFIX))
        .forEach((k) => sessionStorage.removeItem(k));
    } catch {}
  }
};

const fetchAndStore = (url: string): Promise<any> => {
  const existing = inFlight.get(url);
  if (existing) return existing;

  const promise = apiClient
    .get(url)
    .then((response) => {
      storeResponse(url, response);
      return response;
    })
    .finally(() => {
      inFlight.delete(url);
    });

  inFlight.set(url, promise);
  return promise;
};

/** Bypasses the cache for one URL only (does not wipe unrelated cached sections). */
const freshGet = (url: string) => {
  apiCache.delete(url);
  inFlight.delete(url);
  return fetchAndStore(url);
};

const cachedGet = async (url: string) => {
  const now = Date.now();

  // 1. Return from memory cache if fresh
  const memoryCached = apiCache.get(url);
  if (memoryCached && (now - memoryCached.timestamp < CACHE_TTL)) {
    return memoryCached.data;
  }

  // 2. Return from sessionStorage if fresh
  let localData: any = null;
  let isFresh = false;
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem(SESSION_PREFIX + url);
      const storedTime = sessionStorage.getItem(SESSION_TIME_PREFIX + url);
      if (stored && storedTime) {
        const age = now - parseInt(storedTime);
        if (age < CACHE_TTL) {
          isFresh = true;
        }
        localData = JSON.parse(stored);
      }
    } catch {
      // Ignore
    }
  }

  const fetchPromise = fetchAndStore(url);

  if (localData && isFresh) {
    fetchPromise.catch(console.error); // Revalidate quietly
    return localData;
  }

  return await fetchPromise;
};

// Admin-specific API endpoints
export const adminApi = {
  login: async (email: string, password: string) => {
    clearApiCache();
    return apiClient.post('/admin/auth/login', { email, password });
  },

  resetThrottle: async () => {
    return apiClient.get('/admin/auth/reset-throttle');
  },

  mfaVerify: async (mfa_token: string, code: string) => {
    clearApiCache();
    return apiClient.post('/admin/auth/mfa-verify', { mfa_token, code });
  },

  getAdminMe: async () => {
    return apiClient.get('/admin/auth/me');
  },

  mfaSetup: async () => {
    return apiClient.post('/admin/auth/mfa/setup');
  },

  mfaConfirm: async (code: string) => {
    return apiClient.post('/admin/auth/mfa/confirm', { code });
  },

  mfaDisable: async (password: string) => {
    return apiClient.post('/admin/auth/mfa/disable', { password });
  },

  reauth: async (credentials: { password?: string; code?: string }) => {
    return apiClient.post('/admin/auth/reauth', credentials);
  },

  logout: async () => {
    clearApiCache();
    authStorage.clearSession();
    try {
      await apiClient.post('/admin/auth/logout');
    } catch {}
  },
  
  getVerifications: async (
    allOrOptions: boolean | { status?: string; all?: boolean; forceRefresh?: boolean } = false,
    forceRefresh: boolean = false
  ) => {
    let url = '/admin/verifications';
    let shouldForce = forceRefresh;

    if (typeof allOrOptions === 'boolean') {
      url = `/admin/verifications${allOrOptions ? '?all=1&status=all' : ''}`;
    } else if (typeof allOrOptions === 'object' && allOrOptions !== null) {
      const params = new URLSearchParams();
      if (allOrOptions.status) params.append('status', allOrOptions.status);
      if (allOrOptions.all) params.append('all', '1');
      const qs = params.toString();
      url = `/admin/verifications${qs ? `?${qs}` : ''}`;
      if (allOrOptions.forceRefresh) shouldForce = true;
    }

    if (shouldForce) {
      return freshGet(url);
    }
    return cachedGet(url);
  },
  
  verifyUser: async (id: number, status: 'approved' | 'rejected', rejection_reason?: string) => {
    return mutate(apiClient.patch(`/admin/users/${id}/verify`, { status, rejection_reason }), INVALIDATE.verification);
  },
  
  getUsers: async (
    trashedOrOptions?: boolean | {
      trashed?: boolean;
      page?: number;
      search?: string;
      role?: string;
      all?: boolean;
      forceRefresh?: boolean;
    },
    forceRefresh: boolean = false
  ) => {
    let url = '/admin/users';
    let shouldForce = forceRefresh;

    if (typeof trashedOrOptions === 'boolean') {
      url = `/admin/users${trashedOrOptions ? '?trashed=1' : ''}`;
    } else if (typeof trashedOrOptions === 'object' && trashedOrOptions !== null) {
      const params = new URLSearchParams();
      if (trashedOrOptions.trashed) params.append('trashed', '1');
      if (trashedOrOptions.page) params.append('page', trashedOrOptions.page.toString());
      if (trashedOrOptions.search) params.append('search', trashedOrOptions.search);
      if (trashedOrOptions.role && trashedOrOptions.role !== 'all') params.append('role', trashedOrOptions.role);
      if (trashedOrOptions.all) params.append('all', '1');
      const qs = params.toString();
      url = `/admin/users${qs ? `?${qs}` : ''}`;
      if (trashedOrOptions.forceRefresh) shouldForce = true;
    }

    if (shouldForce) {
      return freshGet(url);
    }
    return cachedGet(url);
  },

  getUserDetails: async (id: number) => {
    return apiClient.get(`/admin/users/${id}`);
  },

  getUserPosts: async (id: number, page: number = 1, search: string = '', status: string = 'all') => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    return apiClient.get(`/admin/users/${id}/posts?${params.toString()}`);
  },

  getUserApplications: async (id: number, page: number = 1, search: string = '', status: string = 'all') => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    return apiClient.get(`/admin/users/${id}/applications?${params.toString()}`);
  },

  getUserHired: async (id: number, page: number = 1, search: string = '') => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    if (search) params.append('search', search);
    return apiClient.get(`/admin/users/${id}/hired?${params.toString()}`);
  },

  getUserReviews: async (id: number, page: number = 1) => {
    return apiClient.get(`/admin/users/${id}/reviews?page=${page}`);
  },

  getUserReports: async (id: number, page: number = 1) => {
    return apiClient.get(`/admin/users/${id}/reports?page=${page}`);
  },

  getUserLogs: async (id: number, page: number = 1) => {
    return apiClient.get(`/admin/users/${id}/logs?page=${page}`);
  },

  getUserBlocks: async (id: number) => {
    return apiClient.get(`/admin/users/${id}/blocks`);
  },
  
  suspendUser: async (id: number, is_suspended: boolean = true, duration?: string, reason?: string) => {
    return mutate(apiClient.patch(`/admin/users/${id}`, { is_suspended, duration, reason }), INVALIDATE.users);
  },

  bulkUpdateUserStatus: async (ids: number[], is_suspended: boolean, duration?: string, reason?: string) => {
    return mutate(apiClient.patch('/admin/users/bulk-status', { ids, is_suspended, duration, reason }), INVALIDATE.users);
  },
  
  deleteUser: async (id: number, reason?: string) => {
    return mutate(apiClient.delete(`/admin/users/${id}`, { data: { reason } }), INVALIDATE.users);
  },

  bulkDeleteUsers: async (ids: number[], reason?: string) => {
    return mutate(apiClient.post('/admin/users/bulk-delete', { ids, reason }), INVALIDATE.users);
  },

  restoreUser: async (id: number) => {
    return mutate(apiClient.patch(`/admin/users/${id}/restore`), INVALIDATE.users);
  },

  // Blacklist & Restrictions
  getBlacklist: async (type?: string, page: number = 1, search?: string) => {
    const params = new URLSearchParams();
    if (type && type !== 'all') params.append('type', type);
    if (page) params.append('page', page.toString());
    if (search) params.append('search', search);
    const qs = params.toString();
    return cachedGet(`/admin/blacklist${qs ? `?${qs}` : ''}`);
  },

  liftBlacklist: async (id: number) => {
    return mutate(apiClient.post(`/admin/blacklist/${id}/lift`), INVALIDATE.users);
  },

  getJobs: async (
    trashedOrOptions?: boolean | {
      trashed?: boolean;
      page?: number;
      search?: string;
      status?: string;
      all?: boolean;
      forceRefresh?: boolean;
    },
    forceRefresh: boolean = false
  ) => {
    let url = '/admin/jobs';
    let shouldForce = forceRefresh;

    if (typeof trashedOrOptions === 'boolean') {
      url = `/admin/jobs${trashedOrOptions ? '?trashed=1' : ''}`;
    } else if (typeof trashedOrOptions === 'object' && trashedOrOptions !== null) {
      const params = new URLSearchParams();
      if (trashedOrOptions.trashed) params.append('trashed', '1');
      if (trashedOrOptions.page) params.append('page', trashedOrOptions.page.toString());
      if (trashedOrOptions.search) params.append('search', trashedOrOptions.search);
      if (trashedOrOptions.status && trashedOrOptions.status !== 'All' && trashedOrOptions.status !== 'all') {
        params.append('status', trashedOrOptions.status.toLowerCase());
      }
      if (trashedOrOptions.all) params.append('all', '1');
      const qs = params.toString();
      url = `/admin/jobs${qs ? `?${qs}` : ''}`;
      if (trashedOrOptions.forceRefresh) shouldForce = true;
    }

    if (shouldForce) {
      return freshGet(url);
    }
    return cachedGet(url);
  },

  getJob: async (id: number, forceRefresh: boolean = false) => {
    const url = `/admin/jobs/${id}`;
    if (forceRefresh) {
      return freshGet(url);
    }
    return cachedGet(url);
  },

  deleteJob: async (id: number, reason?: string) => {
    return mutate(apiClient.delete(`/admin/jobs/${id}`, { data: { reason } }), INVALIDATE.jobs);
  },

  updateJobStatus: async (id: number, status: string, reason?: string) => {
    return mutate(apiClient.patch(`/admin/jobs/${id}/status`, { status, reason }), INVALIDATE.jobs);
  },

  suspendJob: async (id: number, reason?: string) => {
    return mutate(apiClient.patch(`/admin/jobs/${id}/status`, { status: 'suspended', reason }), INVALIDATE.jobs);
  },

  unsuspendJob: async (id: number, reason?: string) => {
    return mutate(apiClient.patch(`/admin/jobs/${id}/status`, { status: 'open', reason }), INVALIDATE.jobs);
  },

  bulkUpdateJobStatus: async (ids: number[], status: string, reason?: string) => {
    return mutate(apiClient.patch('/admin/jobs/bulk-status', { ids, status, reason }), INVALIDATE.jobs);
  },

  bulkDeleteJobs: async (ids: number[], reason?: string) => {
    return mutate(apiClient.post('/admin/jobs/bulk-delete', { ids, reason }), INVALIDATE.jobs);
  },

  restoreJob: async (id: number) => {
    return mutate(apiClient.patch(`/admin/jobs/${id}/restore`), INVALIDATE.jobs);
  },

  getReports: async (status: string = 'open', page: number = 1, search: string = '', all: boolean = false, forceRefresh: boolean = false) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (all) {
      params.append('all', '1');
    } else if (page) {
      params.append('page', page.toString());
    }
    if (search) params.append('search', search);
    const qs = params.toString();
    const url = `/admin/reports${qs ? `?${qs}` : ''}`;
    if (forceRefresh) {
      return freshGet(url);
    }
    return cachedGet(url);
  },
  
  resolveReport: async (id: number, status: 'resolved' | 'dismissed') => {
    return mutate(apiClient.patch(`/admin/reports/${id}`, { status }), INVALIDATE.reports);
  },

  getAnalytics: async (from?: string, to?: string, interval?: string, forceRefresh: boolean = false) => {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (interval) params.append('interval', interval);
    const queryString = params.toString();
    const url = `/admin/analytics${queryString ? `?${queryString}` : ''}`;
    if (forceRefresh) {
      return freshGet(url);
    }
    return cachedGet(url);
  },

  generateAIInsights: async (from?: string, to?: string, interval?: string, forceRefresh: boolean = false, analyticsData?: any) => {
    return apiClient.post('/admin/analytics/insights', {
      from,
      to,
      interval,
      force_refresh: forceRefresh,
      analytics: analyticsData
    });
  },

  // Support Tickets
  getSupportTickets: async () => {
    return cachedGet('/admin/support');
  },
  
  replyToTicket: async (id: number, admin_reply: string) => {
    return mutate(apiClient.post(`/admin/support/${id}/reply`, { admin_reply }), INVALIDATE.support);
  },

  updateSupportTicketStatus: async (id: number, status: 'open' | 'processing' | 'resolved') => {
    return mutate(apiClient.patch(`/admin/support/${id}/status`, { status }), INVALIDATE.support);
  },

  getLogs: async (page: number = 1, search?: string, action?: string, dateFrom?: string, dateTo?: string, all: boolean = false, adminName?: string) => {
    const params = new URLSearchParams();
    if (all) {
      params.append('all', '1');
    } else {
      params.append('page', page.toString());
    }
    if (search) params.append('search', search);
    if (action) params.append('action', action);
    if (dateFrom) {
      params.append('from', dateFrom);
      params.append('date_from', dateFrom);
    }
    if (dateTo) {
      params.append('to', dateTo);
      params.append('date_to', dateTo);
    }
    if (adminName) params.append('admin_name', adminName);
    return cachedGet(`/admin/logs?${params.toString()}`);
  },

  getProfanityWords: async () => {
    return cachedGet('/admin/profanity-words');
  },
  addProfanityWord: async (word: string, action: 'block' | 'flag' = 'block') => {
    return mutate(apiClient.post('/admin/profanity-words', { word, action }), INVALIDATE.profanity);
  },
  deleteProfanityWord: async (id: number) => {
    return mutate(apiClient.delete(`/admin/profanity-words/${id}`), INVALIDATE.profanity);
  },

  permanentDeleteUser: async (id: number, reauthToken?: string) => {
    return mutate(
      apiClient.delete(`/admin/users/${id}/force`, {
        headers: reauthToken ? { 'X-Reauth-Token': reauthToken } : {},
      }),
      INVALIDATE.users
    );
  },
  permanentDeleteJob: async (id: number, reauthToken?: string) => {
    return mutate(
      apiClient.delete(`/admin/jobs/${id}/force`, {
        headers: reauthToken ? { 'X-Reauth-Token': reauthToken } : {},
      }),
      INVALIDATE.jobs
    );
  },

  // ─── Messaging Stats (aggregate only — no message content) ───────────────
  getConversationStats: async () => {
    return cachedGet('/admin/conversations/stats');
  },
};

/**
 * Fires a lightweight GET /health ping to wake the Render free-tier server.
 * Returns a promise that resolves once the server responds (or silently fails).
 */
export const warmUpServer = (): Promise<void> => {
  return apiClient
    .get('/health', { timeout: 60_000 })
    .then(() => {})
    .catch(() => {}); // silent — warm-up only
};

/**
 * Pre-fetches all admin dashboard section data in parallel and populates
 * the stale-while-revalidate cache. Call this after warmUpServer() resolves
 * so every section is instant on first navigation.
 */
export const prefetchAll = (): Promise<void> => {
  // Compute a default 1-year analytics window
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const yearAgo = new Date(now);
  yearAgo.setFullYear(now.getFullYear() - 1);

  return Promise.allSettled([
    adminApi.getVerifications(),
    adminApi.getUsers(),
    adminApi.getUsers(true),           // archived users
    adminApi.getJobs(),
    adminApi.getJobs(true),            // archived jobs
    adminApi.getReports('open', 1),
    adminApi.getAnalytics(fmt(yearAgo), fmt(now)),
    adminApi.getSupportTickets(),
    adminApi.getLogs(1),
    adminApi.getProfanityWords(),
  ]).then(() => {});
};
