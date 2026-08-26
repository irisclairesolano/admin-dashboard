import React, { useState } from 'react';
import { Lock } from 'lucide-react';

interface AvatarProps {
  name: string;
  url?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  isSuspended?: boolean;
}

export const getInitials = (name: string) => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

export default function Avatar({ name, url, className = '', size = 'md', isSuspended = false }: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    sm: 'h-8 w-8 text-xs rounded-xl',
    md: 'h-12 w-12 text-sm rounded-2xl',
    lg: 'h-16 w-16 text-lg rounded-3xl',
  };

  const badgeSizeClasses = {
    sm: 'p-0.5 right-[-2px] bottom-[-2px]',
    md: 'p-1 right-[-4px] bottom-[-4px]',
    lg: 'p-1 right-[-4px] bottom-[-4px]',
  };

  const renderContent = () => {
    if (url && !imgError) {
      return (
        <img
          src={url}
          alt={name}
          onError={() => setImgError(true)}
          className={`${sizeClasses[size]} object-cover shadow-inner shrink-0 ${isSuspended ? 'filter grayscale contrast-75 opacity-75' : ''}`}
        />
      );
    }

    const initials = getInitials(name);
    const bgClass = isSuspended
      ? 'bg-status-error/20 text-status-error'
      : 'bg-gradient-to-br from-accent-sky to-accent-skyDeep/40 text-primary-dark';

    return (
      <div
        className={`${sizeClasses[size]} flex items-center justify-center font-body font-bold shadow-inner shrink-0 ${bgClass}`}
      >
        {initials}
      </div>
    );
  };

  return (
    <div className={`relative shrink-0 ${className}`}>
      {renderContent()}
      {isSuspended && (
        <div className={`absolute rounded-full bg-status-error text-white border-2 border-white shadow-sm flex items-center justify-center ${badgeSizeClasses[size]}`}>
          <Lock className={size === 'sm' ? "w-2.5 h-2.5" : "w-3.5 h-3.5"} />
        </div>
      )}
    </div>
  );
}
