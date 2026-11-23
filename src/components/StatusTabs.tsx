import React from 'react';

interface StatusTabsProps {
  options: string[];
  activeKey: string;
  onSelect: (key: string) => void;
}

export default function StatusTabs({ options, activeKey, onSelect }: StatusTabsProps) {
  return (
    <div role="tablist" aria-label="Filter by status" className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
      {options.map((opt) => {
        const isActive = opt === activeKey;
        return (
          <button
            key={opt}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(opt)}
            className={`px-3.5 py-2 rounded-xl font-body font-semibold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
              isActive
                ? 'bg-ink dark:bg-slate-800 text-white dark:text-slate-100 shadow-sm border border-transparent dark:border-slate-700'
                : 'bg-white/75 dark:bg-slate-900/70 text-ink-soft dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:text-ink dark:hover:text-white border border-ink-faint/50 dark:border-slate-700/80'
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
