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
        className="fixed top-4 right-3 left-3 sm:left-auto sm:top-5 sm:right-5 sm:w-full sm:max-w-md z-[9999] flex flex-col gap-2.5 pointer-events-none max-h-[60vh] overflow-hidden"
      >
        {toasts.slice(-3).map((t) => {
          let accentBar = 'bg-primary dark:bg-sky-400';
          let iconWrap = 'bg-primary/10 dark:bg-sky-500/15 border-primary/25 dark:border-sky-400/30';
          let IconComponent = Info;
          let iconColor = 'text-primary dark:text-sky-400';
          let defaultTitle = 'Notification';

          if (t.type === 'success') {
            accentBar = 'bg-emerald-600 dark:bg-emerald-400';
            iconWrap = 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/25 dark:border-emerald-400/30';
            IconComponent = CheckCircle2;
            iconColor = 'text-emerald-700 dark:text-emerald-400';
            defaultTitle = 'Success';
          } else if (t.type === 'error') {
            accentBar = 'bg-rose-600 dark:bg-rose-400';
            iconWrap = 'bg-rose-500/10 dark:bg-rose-500/15 border-rose-500/25 dark:border-rose-400/30';
            IconComponent = AlertCircle;
            iconColor = 'text-rose-700 dark:text-rose-400';
            defaultTitle = 'Error';
          } else if (t.type === 'warning') {
            accentBar = 'bg-amber-500 dark:bg-amber-400';
            iconWrap = 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/25 dark:border-amber-400/30';
            IconComponent = AlertTriangle;
            iconColor = 'text-amber-700 dark:text-amber-400';
            defaultTitle = 'Warning';
          } else if (t.type === 'info') {
            accentBar = 'bg-sky-600 dark:bg-sky-400';
            iconWrap = 'bg-sky-500/10 dark:bg-sky-500/15 border-sky-500/25 dark:border-sky-400/30';
            IconComponent = Info;
            iconColor = 'text-sky-700 dark:text-sky-400';
            defaultTitle = 'Information';
          }

          return (
            <div
              key={t.id}
              role="alert"
              className="pointer-events-auto relative overflow-hidden flex items-start justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border border-ink-faint/40 dark:border-slate-700/70 bg-white/85 dark:bg-slate-900/85 text-ink dark:text-slate-100 shadow-glass backdrop-blur-md animate-slide-in transition-all"
            >
              <span className={`absolute left-0 top-0 bottom-0 w-1 ${accentBar}`} aria-hidden="true" />
              <div className="flex items-start gap-3 min-w-0 pl-1">
                <div className={`mt-0.5 w-8 h-8 rounded-xl border flex items-center justify-center flex-shrink-0 ${iconWrap}`}>
                  <IconComponent className={`w-4 h-4 ${iconColor}`} />
                </div>
                <div className="min-w-0 pr-1">
                  <h4 className="text-xs sm:text-[13px] font-bold font-body leading-tight text-ink dark:text-slate-100">
                    {t.title || defaultTitle}
                  </h4>
                  <p className="text-[11px] sm:text-xs font-body text-ink-soft dark:text-slate-300 leading-snug mt-1 break-words">
                    {t.message}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="flex-shrink-0 p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-slate-200/70 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 dark:focus-visible:ring-sky-400/60 transition-colors cursor-pointer"
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
