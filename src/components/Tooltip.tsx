'use client';

import React, { useState } from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  variant?: 'default' | 'danger' | 'success' | 'warning';
}

export default function Tooltip({
  text,
  children,
  position = 'top',
  variant = 'default',
}: TooltipProps) {
  const [visible, setVisible] = useState(false);

  const positionStyles: Record<string, string> = {
    top:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left:   'right-full top-1/2 -translate-y-1/2 mr-2',
    right:  'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowStyles: Record<string, string> = {
    top:    'top-full left-1/2 -translate-x-1/2 border-t-[6px] border-x-[5px] border-x-transparent border-b-0',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-[6px] border-x-[5px] border-x-transparent border-t-0',
    left:   'left-full top-1/2 -translate-y-1/2 border-l-[6px] border-y-[5px] border-y-transparent border-r-0',
    right:  'right-full top-1/2 -translate-y-1/2 border-r-[6px] border-y-[5px] border-y-transparent border-l-0',
  };

  const variantBg: Record<string, string> = {
    default: 'bg-white/95 dark:bg-slate-900/95 border-white/50 dark:border-slate-700 text-ink dark:text-slate-100',
    danger:  'bg-status-error/95 border-status-error/30 text-white',
    success: 'bg-emerald-700/95 border-emerald-500/30 text-white',
    warning: 'bg-amber-700/95 border-amber-500/30 text-white',
  };

  const arrowColor: Record<string, string> = {
    top: {
      default: 'border-t-white/95 dark:border-t-slate-900/95',
      danger:  'border-t-status-error/95',
      success: 'border-t-emerald-700/95',
      warning: 'border-t-amber-700/95',
    }[variant],
    bottom: {
      default: 'border-b-white/95 dark:border-b-slate-900/95',
      danger:  'border-b-status-error/95',
      success: 'border-b-emerald-700/95',
      warning: 'border-b-amber-700/95',
    }[variant],
    left: {
      default: 'border-l-white/95 dark:border-l-slate-900/95',
      danger:  'border-l-status-error/95',
      success: 'border-l-emerald-700/95',
      warning: 'border-l-amber-700/95',
    }[variant],
    right: {
      default: 'border-r-white/95 dark:border-r-slate-900/95',
      danger:  'border-r-status-error/95',
      success: 'border-r-emerald-700/95',
      warning: 'border-r-amber-700/95',
    }[variant],
  };

  return (
    <div
      className="relative inline-flex items-center justify-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}

      {/* Tooltip bubble */}
      <div
        role="tooltip"
        className={`
          pointer-events-none absolute z-[9999] max-w-[calc(100vw-2rem)] whitespace-normal sm:whitespace-nowrap text-center
          ${positionStyles[position]}
          transition-all duration-200
          ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
        `}
      >
        <div
          className={`
            relative px-3 py-1.5 rounded-lg text-xs font-semibold
            shadow-lg backdrop-blur-md border
            ${variantBg[variant]}
          `}
        >
          {text}
          {/* Arrow */}
          <span
            className={`absolute w-0 h-0 border-solid ${arrowStyles[position]} ${arrowColor[position]}`}
          />
        </div>
      </div>
    </div>
  );
}
