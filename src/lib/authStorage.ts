/**
 * Secure Session Storage for Admin Authentication and PII data.
 * Uses sessionStorage so credentials, tokens, and PII caches
 * do not persist after the browser tab is closed.
 */

export const authStorage = {
  getToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      const token = sessionStorage.getItem('admin_token') || localStorage.getItem('admin_token');
      if (token) return token;
    } catch {
      // Ignore storage access errors
    }
    return null;
  },

  setToken: (token: string, persistent = false): void => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem('admin_token', token);
      if (persistent) {
        localStorage.setItem('admin_token', token);
      } else {
        localStorage.removeItem('admin_token');
      }
    } catch {
      // Ignore
    }
  },

  getUser: <T = unknown>(): T | null => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = sessionStorage.getItem('admin_user') || localStorage.getItem('admin_user');
      if (stored) return JSON.parse(stored) as T;
    } catch {
      // Ignore
    }
    return null;
  },

  setUser: (user: unknown, persistent = false): void => {
    if (typeof window === 'undefined') return;
    try {
      const serialized = JSON.stringify(user);
      sessionStorage.setItem('admin_user', serialized);
      if (persistent) {
        localStorage.setItem('admin_user', serialized);
      } else {
        localStorage.removeItem('admin_user');
      }
    } catch {
      // Ignore
    }
  },

  getPermissions: <T = unknown>(): T | null => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = sessionStorage.getItem('admin_permissions') || localStorage.getItem('admin_permissions');
      if (stored) return JSON.parse(stored) as T;
    } catch {
      // Ignore
    }
    return null;
  },

  setPermissions: (permissions: unknown, persistent = false): void => {
    if (typeof window === 'undefined') return;
    try {
      const serialized = JSON.stringify(permissions);
      sessionStorage.setItem('admin_permissions', serialized);
      if (persistent) {
        localStorage.setItem('admin_permissions', serialized);
      } else {
        localStorage.removeItem('admin_permissions');
      }
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
