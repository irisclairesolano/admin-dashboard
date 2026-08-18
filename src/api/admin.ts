import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://sikap-backend.onrender.com/api/v1';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Add interceptor to attach bearer token
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401 Unauthorized (expired token)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Stale-While-Revalidate Cache for Admin Dashboard
const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 10 * 1000; // 10 seconds TTL (short for real-time dashboard updates)

export const clearApiCache = () => {
  apiCache.clear();
  if (typeof window !== 'undefined') {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('api_cache_')) localStorage.removeItem(key);
    });
  }
};

const cachedGet = async (url: string) => {
  const now = Date.now();

  // 1. Return from memory cache if fresh
  const memoryCached = apiCache.get(url);
  if (memoryCached && (now - memoryCached.timestamp < CACHE_TTL)) {
    return memoryCached.data;
  }

  // 2. Return from localStorage instantly while revalidating in background
  let localData: any = null;
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('api_cache_' + url);
    if (stored) {
      try {
        localData = JSON.parse(stored);
      } catch {}
    }
  }

  const fetchPromise = apiClient.get(url).then(response => {
    apiCache.set(url, { data: response, timestamp: Date.now() });
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('api_cache_' + url, JSON.stringify(response));
      } catch {}
    }
    return response;
  });

  if (localData) {
    fetchPromise.catch(console.error); // Revalidate in background quietly
    return localData;
  }

  return await fetchPromise;
};

// Admin-specific API endpoints
export const adminApi = {
  login: async (email: string, password: string) => {
    clearApiCache();
    return apiClient.post('/auth/login', { email, password });
  },
  
  getVerifications: async () => {
    return apiClient.get('/admin/verifications');
  },
  
  verifyUser: async (id: number, status: 'approved' | 'rejected', rejection_reason?: string) => {
    clearApiCache();
    return apiClient.patch(`/admin/users/${id}/verify`, { status, rejection_reason });
  },
  
  getUsers: async (trashed: boolean = false) => {
    return cachedGet(`/admin/users${trashed ? '?trashed=1' : ''}`);
  },
  
  suspendUser: async (id: number, is_suspended: boolean) => {
    clearApiCache();
    return apiClient.patch(`/admin/users/${id}`, { is_suspended });
  },
  
  deleteUser: async (id: number) => {
    clearApiCache();
    return apiClient.delete(`/admin/users/${id}`);
  },

  restoreUser: async (id: number) => {
    clearApiCache();
    return apiClient.patch(`/admin/users/${id}/restore`);
  },

  getJobs: async (trashed: boolean = false) => {
    return cachedGet(`/admin/jobs${trashed ? '?trashed=1' : ''}`);
  },

  deleteJob: async (id: number) => {
    clearApiCache();
    return apiClient.delete(`/admin/jobs/${id}`);
  },

  updateJobStatus: async (id: number, status: string) => {
    clearApiCache();
    return apiClient.patch(`/admin/jobs/${id}/status`, { status });
  },

  restoreJob: async (id: number) => {
    clearApiCache();
    return apiClient.patch(`/admin/jobs/${id}/restore`);
  },

  getReports: async (status: string = 'open', page: number = 1) => {
    return apiClient.get(`/admin/reports?status=${status}&page=${page}`);
  },
  
  resolveReport: async (id: number, status: 'resolved' | 'dismissed') => {
    clearApiCache();
    return apiClient.patch(`/admin/reports/${id}`, { status });
  },

  getAnalytics: async (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    const queryString = params.toString();
    return cachedGet(`/admin/analytics${queryString ? `?${queryString}` : ''}`);
  },

  // Support Tickets
  getSupportTickets: async () => {
    return apiClient.get('/admin/support');
  },
  
  replyToTicket: async (id: number, admin_reply: string) => {
    clearApiCache();
    return apiClient.post(`/admin/support/${id}/reply`, { admin_reply });
  },

  updateSupportTicketStatus: async (id: number, status: 'open' | 'processing' | 'resolved') => {
    clearApiCache();
    return apiClient.patch(`/admin/support/${id}/status`, { status });
  },

  getLogs: async (page: number = 1, search?: string, action?: string) => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    if (search) params.append('search', search);
    if (action) params.append('action', action);
    return apiClient.get(`/admin/logs?${params.toString()}`);
  }
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
  ]).then(() => {});
};
