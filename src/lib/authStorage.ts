/**
 * Secure Session Storage for Admin Authentication and PII data.
 * Uses sessionStorage so credentials, tokens, and PII caches
 * do not persist after the browser tab is closed.
 */

export const authStorage = {
  getToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      const token = sessionStorage.getItem('admin_token');
      if (token) return token;
      // One-time fallback & migration from legacy localStorage if present
      const legacyToken = localStorage.getItem('admin_token');
      if (legacyToken) {
        sessionStorage.setItem('admin_token', legacyToken);
        localStorage.removeItem('admin_token');
        return legacyToken;
      }
    } catch {
      // Ignore storage access errors
    }
    return null;
  },

  setToken: (token: string): void => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem('admin_token', token);
      localStorage.removeItem('admin_token'); // Ensure removed from persistent storage
    } catch {
      // Ignore
    }
  },

  getUser: <T = unknown>(): T | null => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = sessionStorage.getItem('admin_user');
      if (stored) return JSON.parse(stored) as T;
      const legacy = localStorage.getItem('admin_user');
      if (legacy) {
        sessionStorage.setItem('admin_user', legacy);
        localStorage.removeItem('admin_user');
        return JSON.parse(legacy) as T;
      }
    } catch {
      // Ignore
    }
    return null;
  },

  setUser: (user: unknown): void => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem('admin_user', JSON.stringify(user));
      localStorage.removeItem('admin_user');
    } catch {
      // Ignore
    }
  },

  getPermissions: <T = unknown>(): T | null => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = sessionStorage.getItem('admin_permissions');
      if (stored) return JSON.parse(stored) as T;
      const legacy = localStorage.getItem('admin_permissions');
      if (legacy) {
        sessionStorage.setItem('admin_permissions', legacy);
        localStorage.removeItem('admin_permissions');
        return JSON.parse(legacy) as T;
      }
    } catch {
      // Ignore
    }
    return null;
  },

  setPermissions: (permissions: unknown): void => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem('admin_permissions', JSON.stringify(permissions));
      localStorage.removeItem('admin_permissions');
    } catch {
      // Ignore
    }
  },

  clearSession: (): void => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.removeItem('admin_token');
      sessionStorage.removeItem('admin_user');
      sessionStorage.removeItem('admin_permissions');
      sessionStorage.removeItem('admin_last_activity');

      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      localStorage.removeItem('admin_permissions');
      localStorage.removeItem('admin_last_activity');

      // Clear any cached API entries in both storages
      Object.keys(sessionStorage).forEach((k) => {
        if (k.startsWith('api_cache_')) sessionStorage.removeItem(k);
      });
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith('api_cache_')) localStorage.removeItem(k);
      });
    } catch {
      // Ignore
    }
  },
};
