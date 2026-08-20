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
    default: 'bg-white/90 border-white/50 text-ink',
    danger:  'bg-status-error/90 border-status-error/30 text-white',
    success: 'bg-status-success/90 border-status-success/30 text-white',
    warning: 'bg-status-warning/90 border-status-warning/30 text-white',
  };

  const arrowColor: Record<string, string> = {
    top: {
      default: 'border-t-white/90',
      danger:  'border-t-status-error/90',
      success: 'border-t-status-success/90',
      warning: 'border-t-status-warning/90',
    }[variant],
    bottom: {
      default: 'border-b-white/90',
      danger:  'border-b-status-error/90',
      success: 'border-b-status-success/90',
      warning: 'border-b-status-warning/90',
    }[variant],
    left: {
      default: 'border-l-white/90',
      danger:  'border-l-status-error/90',
      success: 'border-l-status-success/90',
      warning: 'border-l-status-warning/90',
    }[variant],
    right: {
      default: 'border-r-white/90',
      danger:  'border-r-status-error/90',
      success: 'border-r-status-success/90',
      warning: 'border-r-status-warning/90',
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
          pointer-events-none absolute z-[9999] whitespace-nowrap
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
