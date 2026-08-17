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
    default: 'bg-[#1A3C5E] border-[#1A3C5E]',
    danger:  'bg-red-600 border-red-600',
    success: 'bg-emerald-600 border-emerald-600',
    warning: 'bg-amber-500 border-amber-500',
  };

  const arrowColor: Record<string, string> = {
    top:    {
      default: 'border-t-[#1A3C5E]',
      danger:  'border-t-red-600',
      success: 'border-t-emerald-600',
      warning: 'border-t-amber-500',
    }[variant],
    bottom: {
      default: 'border-b-[#1A3C5E]',
      danger:  'border-b-red-600',
      success: 'border-b-emerald-600',
      warning: 'border-b-amber-500',
    }[variant],
    left: {
      default: 'border-l-[#1A3C5E]',
      danger:  'border-l-red-600',
      success: 'border-l-emerald-600',
      warning: 'border-l-amber-500',
    }[variant],
    right: {
      default: 'border-r-[#1A3C5E]',
      danger:  'border-r-red-600',
      success: 'border-r-emerald-600',
      warning: 'border-r-amber-500',
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
            relative px-3 py-1.5 rounded-lg text-white text-xs font-semibold
            shadow-lg backdrop-blur-sm border
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
