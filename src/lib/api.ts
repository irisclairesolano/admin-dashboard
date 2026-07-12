import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

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

// Admin-specific API endpoints
export const adminApi = {
  login: async (email: string, password: string) => {
    return apiClient.post('/auth/login', { email, password });
  },
  
  getVerifications: async () => {
    return apiClient.get('/admin/verifications');
  },
  
  verifyUser: async (id: number, status: 'approved' | 'rejected') => {
    return apiClient.patch(`/admin/users/${id}/verify`, { status });
  },
  
  getUsers: async (trashed: boolean = false) => {
    return apiClient.get(`/admin/users${trashed ? '?trashed=1' : ''}`);
  },
  
  suspendUser: async (id: number, is_suspended: boolean) => {
    return apiClient.patch(`/admin/users/${id}`, { is_suspended });
  },
  
  deleteUser: async (id: number) => {
    return apiClient.delete(`/admin/users/${id}`);
  },

  restoreUser: async (id: number) => {
    return apiClient.patch(`/admin/users/${id}/restore`);
  },

  getJobs: async (trashed: boolean = false) => {
    return apiClient.get(`/admin/jobs${trashed ? '?trashed=1' : ''}`);
  },

  deleteJob: async (id: number) => {
    return apiClient.delete(`/admin/jobs/${id}`);
  },

  restoreJob: async (id: number) => {
    return apiClient.patch(`/admin/jobs/${id}/restore`);
  },

  getReports: async () => {
    return apiClient.get('/admin/reports');
  },
  
  resolveReport: async (id: number, status: 'resolved' | 'dismissed') => {
    return apiClient.patch(`/admin/reports/${id}`, { status });
  },

  getAnalytics: async (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    const queryString = params.toString();
    return apiClient.get(`/admin/analytics${queryString ? `?${queryString}` : ''}`);
  }
};
