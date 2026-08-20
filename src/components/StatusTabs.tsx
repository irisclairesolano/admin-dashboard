import React from 'react';

interface StatusTabsProps {
  options: string[];
  activeKey: string;
  onSelect: (key: string) => void;
}

export default function StatusTabs({ options, activeKey, onSelect }: StatusTabsProps) {
  return (
    <div className="flex space-x-4 overflow-x-auto">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onSelect(opt)}
          className={`px-3 py-2 text-sm font-body transition-colors ${
            opt === activeKey
              ? 'border-b-2 border-primary text-primary'
              : 'text-ink-muted hover:text-primary'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
