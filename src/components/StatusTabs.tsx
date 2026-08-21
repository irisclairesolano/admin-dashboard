import React from 'react';

interface StatusTabsProps {
  options: string[];
  activeKey: string;
  onSelect: (key: string) => void;
}

export default function StatusTabs({ options, activeKey, onSelect }: StatusTabsProps) {
  return (
    <div className="flex space-x-2 overflow-x-auto pb-1">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onSelect(opt)}
          className={`px-4 py-2 rounded-xl font-body font-semibold text-sm transition-all whitespace-nowrap ${
            opt === activeKey
              ? 'bg-ink text-white shadow-sm'
              : 'bg-white/50 text-ink-soft hover:bg-white/80 border border-ink-faint/50'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
