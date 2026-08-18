import React from 'react';

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
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs rounded-xl',
    md: 'h-12 w-12 text-sm rounded-2xl',
    lg: 'h-16 w-16 text-lg rounded-3xl',
  };

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={`${sizeClasses[size]} object-cover shadow-inner shrink-0 ${className}`}
      />
    );
  }

  const initials = getInitials(name);
  const bgClass = isSuspended
    ? 'bg-status-error/20 text-status-error'
    : 'bg-gradient-to-br from-accent-sky to-accent-skyDeep/40 text-primary-dark';

  return (
    <div
      className={`${sizeClasses[size]} flex items-center justify-center font-body font-bold shadow-inner shrink-0 ${bgClass} ${className}`}
    >
      {initials}
    </div>
  );
}
