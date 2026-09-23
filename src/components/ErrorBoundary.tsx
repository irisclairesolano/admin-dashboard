'use client';
import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Dashboard error boundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen gap-4 text-center px-6">
          <div className="w-14 h-14 rounded-2xl bg-status-error/10 text-status-error flex items-center justify-center mx-auto">
            <i className="lni lni-warning text-3xl" />
          </div>
          <h2 className="font-display text-lg font-bold text-ink">Something went wrong</h2>
          <p className="text-sm text-ink-soft max-w-sm leading-relaxed">
            An unexpected error occurred in the dashboard. Try refreshing the page. If this keeps
            happening, contact the platform administrator.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-xl bg-ink text-white font-body font-semibold text-sm hover:bg-ink/80 transition-colors cursor-pointer"
          >
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
