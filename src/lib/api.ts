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
  // We'll store the token in localStorage for simplicity on the web
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Memory Cache for Instant Sidebar Navigation (60 second TTL)
const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 1000;

export const clearApiCache = () => apiCache.clear();

const cachedGet = async (url: string) => {
  const cached = apiCache.get(url);
  const now = Date.now();
  if (cached && (now - cached.timestamp < CACHE_TTL)) {
    return cached.data;
  }
  const response = await apiClient.get(url);
  apiCache.set(url, { data: response, timestamp: now });
  return response;
};

// Admin-specific API endpoints
export const adminApi = {
  login: async (email: string, password: string) => {
    clearApiCache();
    return apiClient.post('/auth/login', { email, password });
  },
  
  getVerifications: async () => {
    return cachedGet('/admin/verifications');
  },
  
  verifyUser: async (id: number, status: 'approved' | 'rejected') => {
    clearApiCache();
    return apiClient.patch(`/admin/users/${id}/verify`, { status });
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

  restoreJob: async (id: number) => {
    clearApiCache();
    return apiClient.patch(`/admin/jobs/${id}/restore`);
  },

  getReports: async () => {
    return cachedGet('/admin/reports');
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
  }
};
