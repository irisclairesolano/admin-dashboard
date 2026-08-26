import React from 'react';

interface StatCardProps {
  title: string;
  value: number | string;
  Icon?: React.ComponentType<{ className?: string }>;
  iconClass?: string;
  className?: string;
  onClick?: () => void;
}

export default function StatCard({ title, value, Icon, iconClass, className = '', onClick }: StatCardProps) {
  const isClickable = !!onClick;
  return (
    <div 
      onClick={onClick}
      className={`flex items-center p-5 bg-white/80 backdrop-blur-md border border-white/50 rounded-lg shadow-sm transition-all duration-300 ${
        isClickable ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:bg-white' : ''
      } ${className}`}
    >
      <div className="p-3 bg-primary/10 rounded-xl mr-4 flex items-center justify-center w-12 h-12 flex-shrink-0">
        {iconClass ? (
          <i className={`${iconClass} text-xl text-primary`} />
        ) : Icon ? (
          <Icon className="w-6 h-6 text-primary" />
        ) : null}
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-ink-muted font-body font-bold uppercase tracking-wider">{title}</span>
        <span className="text-2xl font-numeric font-bold text-ink mt-0.5">{value}</span>
      </div>
    </div>
  );
}
