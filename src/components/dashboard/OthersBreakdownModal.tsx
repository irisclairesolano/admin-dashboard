'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, ArrowUpDown, Copy, Check, Briefcase, Users, Tag } from 'lucide-react';

export interface OthersBreakdownItem {
  name: string;
  value: number;
  category?: string;
}

export interface OthersBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  total: number;
  totalOverall?: number;
  unit?: string; // 'workers' | 'jobs' | 'job posts'
  items: OthersBreakdownItem[];
}

export default function OthersBreakdownModal({
  isOpen,
  onClose,
  title,
  subtitle,
  total,
  totalOverall,
  unit = 'workers',
  items = [],
}: OthersBreakdownModalProps) {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'value' | 'name'>('value');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Extract distinct categories if available
  const distinctCategories = useMemo(() => {
    const cats = new Set<string>();
    items.forEach((item) => {
      if (item.category && item.category.trim().length > 0) {
        cats.add(item.category.trim());
      }
    });
    return Array.from(cats).sort();
  }, [items]);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    const result = items.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchName = item.name.toLowerCase().includes(q);
      const matchCat = item.category ? item.category.toLowerCase().includes(q) : false;
      const matchesSearch = q === '' || matchName || matchCat;

      const matchesCategory =
        selectedCategory === 'all' ||
        (item.category && item.category.toLowerCase() === selectedCategory.toLowerCase());

      return matchesSearch && matchesCategory;
    });

    result.sort((a, b) => {
      if (sortBy === 'value') {
        const diff = a.value - b.value;
        return sortOrder === 'asc' ? diff : -diff;
      } else {
        const cmp = a.name.localeCompare(b.name);
        return sortOrder === 'asc' ? cmp : -cmp;
      }
    });

    return result;
  }, [items, searchQuery, selectedCategory, sortBy, sortOrder]);

  const handleCopy = () => {
    const lines = [
      `SIKAP Admin — ${title}`,
      `Total: ${total.toLocaleString()} ${unit} (${items.length} items grouped under 'Others')`,
      `---`,
      ...items.map(
        (it, idx) =>
          `${idx + 1}. ${it.name}${it.category ? ` [${it.category}]` : ''}: ${it.value.toLocaleString()} ${unit} (${total > 0 ? ((it.value / total) * 100).toFixed(1) : 0}%)`
      ),
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen || !mounted) return null;

  const percentageOfOverall =
    totalOverall && totalOverall > 0 ? ((total / totalOverall) * 100).toFixed(1) : null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="others-modal-title"
        className="relative bg-white rounded-2xl shadow-2xl border border-ink-faint/80 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden z-10 animate-scale-up"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-ink-faint/50 bg-gradient-to-r from-paper to-white flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary">
                {unit.includes('worker') ? <Users className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
              </span>
              <h2 id="others-modal-title" className="text-base sm:text-lg font-bold font-display text-ink truncate">
                {title}
              </h2>
            </div>
            <p className="text-xs text-ink-muted">
              {subtitle || `Comprehensive list of all ${items.length} items aggregated inside the "Others" chart slice.`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-black/5 transition-colors"
            title="Close modal (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Aggregate Stats Cards */}
        <div className="grid grid-cols-3 gap-2 p-3 sm:p-4 bg-paper/50 border-b border-ink-faint/40 text-xs">
          <div className="p-2.5 rounded-xl bg-white border border-ink-faint/50 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-ink-muted block tracking-wider">Group Total</span>
            <strong className="text-base sm:text-lg font-bold text-ink font-numeric block mt-0.5">
              {total.toLocaleString()}
            </strong>
            <span className="text-[10px] text-ink-muted">{unit} in this group</span>
          </div>

          <div className="p-2.5 rounded-xl bg-white border border-ink-faint/50 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-ink-muted block tracking-wider">Unique Items</span>
            <strong className="text-base sm:text-lg font-bold text-ink font-numeric block mt-0.5">
              {items.length}
            </strong>
            <span className="text-[10px] text-ink-muted">aggregated entries</span>
          </div>

          <div className="p-2.5 rounded-xl bg-white border border-ink-faint/50 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-ink-muted block tracking-wider">Platform Share</span>
            <strong className="text-base sm:text-lg font-bold text-primary font-numeric block mt-0.5">
              {percentageOfOverall ? `${percentageOfOverall}%` : '—'}
            </strong>
            <span className="text-[10px] text-ink-muted">of overall total</span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-3 sm:px-4 sm:py-3 border-b border-ink-faint/40 space-y-2 bg-white">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
              <input
                type="text"
                placeholder={`Search by ${unit.includes('worker') ? 'skill or category' : 'category'}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 text-xs bg-paper/60 border border-ink-faint/70 rounded-lg text-ink placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-ink-muted hover:text-ink"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort Toggle */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  if (sortBy === 'value') {
                    setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
                  } else {
                    setSortBy('value');
                    setSortOrder('desc');
                  }
                }}
                className={`px-2 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1 ${
                  sortBy === 'value'
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-paper/60 border-ink-faint/60 text-ink-muted hover:text-ink'
                }`}
                title="Sort by Count"
              >
                <span>Count</span>
                <ArrowUpDown className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (sortBy === 'name') {
                    setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
                  } else {
                    setSortBy('name');
                    setSortOrder('asc');
                  }
                }}
                className={`px-2 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1 ${
                  sortBy === 'name'
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-paper/60 border-ink-faint/60 text-ink-muted hover:text-ink'
                }`}
                title="Sort by Name"
              >
                <span>A-Z</span>
                <ArrowUpDown className="w-3 h-3" />
              </button>
            </div>

            {/* Copy button */}
            <button
              type="button"
              onClick={handleCopy}
              className="p-1.5 rounded-lg border border-ink-faint/60 bg-paper/60 hover:bg-paper text-ink-muted hover:text-ink transition-colors flex items-center gap-1 text-xs"
              title="Copy breakdown to clipboard"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* Category Chips (if any) */}
          {distinctCategories.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
              <span className="text-ink-muted font-bold text-[10px] uppercase shrink-0">Category:</span>
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-2 py-0.5 rounded-md font-semibold shrink-0 transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-ink text-white'
                    : 'bg-paper text-ink-muted hover:text-ink hover:bg-paper/80'
                }`}
              >
                All ({items.length})
              </button>
              {distinctCategories.map((cat) => {
                const count = items.filter(
                  (i) => i.category && i.category.toLowerCase() === cat.toLowerCase()
                ).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2 py-0.5 rounded-md font-semibold shrink-0 transition-colors ${
                      selectedCategory === cat
                        ? 'bg-primary text-white'
                        : 'bg-paper text-ink-muted hover:text-ink hover:bg-paper/80'
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Scrollable Item Breakdown List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 divide-y divide-ink-faint/30">
          {filteredItems.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm font-semibold text-ink">No items match your search</p>
              <p className="text-xs text-ink-muted mt-1">Try adjusting your query or category filter.</p>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const groupPct = total > 0 ? (item.value / total) * 100 : 0;
              const overallPct = totalOverall && totalOverall > 0 ? (item.value / totalOverall) * 100 : null;

              return (
                <div
                  key={`${item.name}-${index}`}
                  className="py-2.5 px-2 flex items-center justify-between gap-3 hover:bg-paper/40 rounded-lg transition-colors group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[11px] font-bold font-numeric text-ink-muted/80 w-5 shrink-0 text-center">
                      #{index + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-semibold text-ink group-hover:text-primary transition-colors truncate">
                          {item.name}
                        </span>
                        {item.category && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-paper border border-ink-faint/60 text-ink-muted">
                            <Tag className="w-2.5 h-2.5" />
                            {item.category}
                          </span>
                        )}
                      </div>
                      {/* Mini Visual Progress Bar */}
                      <div className="w-32 sm:w-48 h-1.5 bg-paper rounded-full overflow-hidden mt-1.5">
                        <div
                          className="h-full bg-primary/70 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(Math.max(groupPct, 3), 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Value and Percentages */}
                  <div className="text-right shrink-0">
                    <div className="text-xs sm:text-sm font-bold text-ink font-numeric">
                      {item.value.toLocaleString()} <span className="text-[10px] font-normal text-ink-muted">{unit}</span>
                    </div>
                    <div className="text-[10px] text-ink-muted font-numeric">
                      {groupPct.toFixed(1)}% of &quot;Others&quot;
                      {overallPct !== null && ` • ${overallPct.toFixed(1)}% overall`}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-ink-faint/40 bg-paper/40 flex items-center justify-between text-xs text-ink-muted">
          <span>
            Showing {filteredItems.length} of {items.length} items
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-ink text-white font-semibold text-xs rounded-lg hover:bg-ink-soft transition-colors shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
