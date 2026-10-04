'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  LayoutDashboard,
  Users,
  Briefcase,
  FileCheck,
  Flag,
  FileSpreadsheet,
  LifeBuoy,
  Archive,
  ShieldAlert,
  ClipboardList,
  KeyRound,
  Download,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface PaletteItem {
  id: string;
  title: string;
  category: 'Navigation' | 'Actions' | 'Tools';
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen2FA?: () => void;
}

export function CommandPalette({ isOpen, onClose, onOpen2FA }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const items: PaletteItem[] = useMemo(() => [
    {
      id: 'nav-dashboard',
      title: 'Analytics Overview',
      category: 'Navigation',
      description: 'KPI metrics, trade sector trends, and activity volume',
      icon: LayoutDashboard,
      action: () => { router.push('/dashboard'); onClose(); },
    },
    {
      id: 'nav-users',
      title: 'Users Masterlist',
      category: 'Navigation',
      description: 'Manage workers and employers, account status, and roles',
      icon: Users,
      action: () => { router.push('/dashboard/users'); onClose(); },
    },
    {
      id: 'nav-verifications',
      title: 'ID Verifications',
      category: 'Navigation',
      description: 'Review government ID submissions and SLA queues',
      icon: FileCheck,
      action: () => { router.push('/dashboard/verifications'); onClose(); },
    },
    {
      id: 'nav-jobs',
      title: 'Job Postings Management',
      category: 'Navigation',
      description: 'Moderate community jobs, monitor applicants and trades',
      icon: Briefcase,
      action: () => { router.push('/dashboard/jobs'); onClose(); },
    },
    {
      id: 'nav-moderation',
      title: 'Content Moderation & Reports',
      category: 'Navigation',
      description: 'Review reported users, inappropriate jobs, and abuse flags',
      icon: Flag,
      action: () => { router.push('/dashboard/moderation'); onClose(); },
    },
    {
      id: 'nav-reports',
      title: 'Export Reports & Demographics',
      category: 'Navigation',
      description: 'Generate multi-section Excel/CSV and municipal breakdowns',
      icon: FileSpreadsheet,
      action: () => { router.push('/dashboard/export-reports'); onClose(); },
    },
    {
      id: 'nav-logs',
      title: 'Audit Activity Logs',
      category: 'Navigation',
      description: 'Superadmin audit trail of administrative moderation actions',
      icon: ClipboardList,
      action: () => { router.push('/dashboard/logs'); onClose(); },
    },
    {
      id: 'nav-support',
      title: 'Support Tickets',
      category: 'Navigation',
      description: 'Assist users with inquiry resolution and account issues',
      icon: LifeBuoy,
      action: () => { router.push('/dashboard/support'); onClose(); },
    },
    {
      id: 'nav-archives',
      title: 'Platform Archives',
      category: 'Navigation',
      description: 'View and restore soft-deleted users and job posts',
      icon: Archive,
      action: () => { router.push('/dashboard/archives'); onClose(); },
    },
    {
      id: 'nav-profanity',
      title: 'Profanity & Content Filters',
      category: 'Navigation',
      description: 'Manage forbidden keywords and automated filter dictionaries',
      icon: ShieldAlert,
      action: () => { router.push('/dashboard/profanity'); onClose(); },
    },
    {
      id: 'action-export-reports',
      title: 'Jump to Excel & CSV Report Center',
      category: 'Actions',
      description: 'Directly download master workbooks and filtered datasets',
      icon: Download,
      action: () => { router.push('/dashboard/export-reports'); onClose(); },
    },
    {
      id: 'action-2fa',
      title: 'Configure Two-Factor Authentication',
      category: 'Actions',
      description: 'Manage TOTP authenticator app and security keys',
      icon: KeyRound,
      action: () => {
        onClose();
        if (onOpen2FA) onOpen2FA();
      },
    },
  ], [router, onClose, onOpen2FA]);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q)
    );
  }, [items, query]);

  // Reset highlighted selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Keyboard navigation inside palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement;
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[250] bg-ink/60 backdrop-blur-sm flex items-start justify-center pt-16 sm:pt-24 px-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-ink-faint/40 overflow-hidden flex flex-col max-h-[70vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-ink-faint/30 bg-slate-50/70">
          <Search className="w-5 h-5 text-ink-muted flex-shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command, page, or action... (e.g. users, export, SLA)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm font-body text-ink placeholder:text-ink-muted/70 outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono font-bold text-ink-muted bg-white border border-ink-faint/60 rounded shadow-2xs">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-10 text-center text-xs text-ink-muted font-body">
              <Sparkles className="w-6 h-6 mx-auto mb-2 text-ink-faint" />
              No results found for &ldquo;<span className="font-semibold text-ink">{query}</span>&rdquo;
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  data-index={idx}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected ? 'bg-ink text-white' : 'hover:bg-slate-100/70 text-ink'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-ink-soft'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold font-body truncate">{item.title}</div>
                      {item.description && (
                        <div
                          className={`text-[11px] truncate ${
                            isSelected ? 'text-white/70' : 'text-ink-muted'
                          }`}
                        >
                          {item.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-ink-muted border border-ink-faint/30'
                      }`}
                    >
                      {item.category}
                    </span>
                    <ArrowRight
                      className={`w-3.5 h-3.5 transition-transform ${
                        isSelected ? 'text-white translate-x-0.5' : 'text-ink-muted opacity-0'
                      }`}
                    />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-ink-faint/20 bg-slate-50/50 flex items-center justify-between text-[11px] text-ink-muted font-body">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-white border border-ink-faint/50 rounded shadow-2xs">↑</kbd>
              <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-white border border-ink-faint/50 rounded shadow-2xs">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-white border border-ink-faint/50 rounded shadow-2xs">↵</kbd>
              Select
            </span>
          </div>
          <span className="hidden sm:inline text-[10px] text-ink-muted/80">SIKAP Admin Command Palette</span>
        </div>
      </div>
    </div>
  );
}
