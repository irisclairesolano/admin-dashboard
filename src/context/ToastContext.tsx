'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

export interface ToastContextType {
  toasts: ToastItem[];
  showToast: (options: { type: ToastType; message: string; title?: string; duration?: number }) => string;
  removeToast: (id: string) => void;
  toast: {
    success: (message: string, title?: string, duration?: number) => string;
    error: (message: string, title?: string, duration?: number) => string;
    warning: (message: string, title?: string, duration?: number) => string;
    info: (message: string, title?: string, duration?: number) => string;
  };
}

const noop = () => '';
const defaultToast = {
  success: noop,
  error: noop,
  warning: noop,
  info: noop,
};

const ToastContext = createContext<ToastContextType>({
  toasts: [],
  showToast: noop,
  removeToast: () => {},
  toast: defaultToast,
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type, message, title, duration = 4000 }: { type: ToastType; message: string; title?: string; duration?: number }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newToast: ToastItem = { id, type, message, title, duration };

      setToasts((prev) => [newToast, ...prev].slice(0, 5)); // Keep maximum 5 concurrent

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }

      return id;
    },
    [removeToast]
  );

  const toast = useMemo(
    () => ({
      success: (message: string, title?: string, duration?: number) =>
        showToast({ type: 'success', message, title, duration }),
      error: (message: string, title?: string, duration?: number) =>
        showToast({ type: 'error', message, title, duration }),
      warning: (message: string, title?: string, duration?: number) =>
        showToast({ type: 'warning', message, title, duration }),
      info: (message: string, title?: string, duration?: number) =>
        showToast({ type: 'info', message, title, duration }),
    }),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast, toast }}>
      {children}
      {/* Toast Render Portal / Container */}
      <aside
        aria-label="Notification alerts"
        className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((t) => {
          let bgClass = 'bg-white/95 border-ink-faint text-ink shadow-slate-900/10';
          let IconComponent = Info;
          let iconColor = 'text-primary';
          let defaultTitle = 'Notification';

          if (t.type === 'success') {
            bgClass = 'bg-emerald-50/95 border-emerald-200 text-emerald-950 shadow-emerald-900/10';
            IconComponent = CheckCircle2;
            iconColor = 'text-emerald-600';
            defaultTitle = 'Success';
          } else if (t.type === 'error') {
            bgClass = 'bg-rose-50/95 border-rose-200 text-rose-950 shadow-rose-900/10';
            IconComponent = AlertCircle;
            iconColor = 'text-rose-600';
            defaultTitle = 'Error';
          } else if (t.type === 'warning') {
            bgClass = 'bg-amber-50/95 border-amber-200 text-amber-950 shadow-amber-900/10';
            IconComponent = AlertTriangle;
            iconColor = 'text-amber-600';
            defaultTitle = 'Warning';
          } else if (t.type === 'info') {
            bgClass = 'bg-sky-50/95 border-sky-200 text-sky-950 shadow-sky-900/10';
            IconComponent = Info;
            iconColor = 'text-sky-600';
            defaultTitle = 'Information';
          }

          return (
            <div
              key={t.id}
              role="alert"
              className={`pointer-events-auto flex items-start justify-between gap-3 p-3.5 sm:p-4 rounded-xl border shadow-lg backdrop-blur-md animate-slide-in transition-all ${bgClass}`}
              style={{ boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.12)' }}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5 flex-shrink-0">
                  <IconComponent className={`w-5 h-5 ${iconColor}`} />
                </div>
                <div className="min-w-0 pr-1">
                  <h4 className="text-xs sm:text-[13px] font-bold font-body leading-tight">
                    {t.title || defaultTitle}
                  </h4>
                  <p className="text-[11px] sm:text-xs font-body opacity-90 leading-snug mt-1 break-words">
                    {t.message}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="flex-shrink-0 p-1 rounded-md opacity-60 hover:opacity-100 hover:bg-black/5 transition-colors cursor-pointer"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </aside>
    </ToastContext.Provider>
  );
}
