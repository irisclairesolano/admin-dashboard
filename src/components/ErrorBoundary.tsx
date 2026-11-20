'use client';
import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Dashboard error boundary caught:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen gap-4 text-center px-6">
          <div className="w-14 h-14 rounded-2xl bg-status-error/10 text-status-error flex items-center justify-center mx-auto">
            <i className="lni lni-warning text-3xl" />
          </div>
          <h2 className="font-display text-lg font-bold text-ink">Something went wrong</h2>
          <p className="text-sm text-ink-soft max-w-sm leading-relaxed">
            An unexpected error occurred in the dashboard. Try again or refresh the page. If this keeps
            happening, contact the platform administrator.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-5 py-2.5 rounded-xl border border-ink-faint bg-white text-ink font-body font-semibold text-sm hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-ink text-white font-body font-semibold text-sm hover:bg-ink/80 transition-colors cursor-pointer"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
