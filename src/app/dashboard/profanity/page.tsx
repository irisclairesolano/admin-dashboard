'use client';

import React, { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { AlertDialog } from '@/components/AlertDialog';
import { ProfanityWord } from '@/types/models';
import { Ban, Flag, Plus, Trash2, ShieldAlert } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

export default function ProfanityFilterPage() {
  const { toast } = useToast();
  const [words, setWords] = useState<ProfanityWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [newWord, setNewWord] = useState('');
  const [newAction, setNewAction] = useState<'block' | 'flag'>('block');
  const [activeTab, setActiveTab] = useState<'all' | 'block' | 'flag'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const fetchWords = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getProfanityWords();
      setWords(res.data || []);
    } catch (err) {
      console.error('Failed to load profanity words', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWords();
  }, []);

  const confirmAction = (title: string, message: string, onConfirm: () => void) => {
    setAlertConfig({
      isOpen: true,
      title,
      message,
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      onConfirm,
    });
  };

  const showAlert = (title: string, message: string) => {
    setAlertConfig({
      isOpen: true,
      title,
      message,
      confirmText: 'OK',
      onConfirm: () => {},
    });
  };

  const handleAddWord = async (e: React.FormEvent) => {
    e.preventDefault();
    const wordToAdd = newWord.trim().toLowerCase();
    if (!wordToAdd) return;

    const existing = words.find((w) => w.word.toLowerCase() === wordToAdd);
    if (existing) {
      if (existing.action === newAction) {
        showAlert('Duplicate Word', `"${wordToAdd}" is already registered as ${existing.action === 'block' ? 'Blocked' : 'Flagged'}.`);
        return;
      }
    }

    try {
      setAddLoading(true);
      await adminApi.addProfanityWord(wordToAdd, newAction);
      toast.success(`Added "${wordToAdd}" to ${newAction === 'block' ? 'Blocked' : 'Flagged'} words.`, 'Word Added');
      setNewWord('');
      await fetchWords();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add word.', 'Action Failed');
      showAlert('Error', err.response?.data?.message || 'Failed to add word.');
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteWord = (id: number, word: string, action: 'block' | 'flag') => {
    const tierName = action === 'block' ? 'blocked' : 'flagged';
    confirmAction(
      `Remove ${action === 'block' ? 'Blocked' : 'Flagged'} Word`,
      `Are you sure you want to remove "${word}" from the ${tierName} words list?`,
      async () => {
        try {
          setActionLoading(id);
          await adminApi.deleteProfanityWord(id);
          toast.info(`Removed "${word}" from filter.`, 'Word Removed');
          await fetchWords();
        } catch (err: any) {
          toast.error(err.response?.data?.message || 'Failed to delete word.', 'Action Failed');
          showAlert('Error', err.response?.data?.message || 'Failed to delete word.');
        } finally {
          setActionLoading(null);
        }
      }
    );
  };

  const blockedCount = words.filter((w) => (w.action || 'block') === 'block').length;
  const flaggedCount = words.filter((w) => w.action === 'flag').length;

  const filteredWords = words.filter((item) => {
    const itemAction = item.action || 'block';
    if (activeTab === 'block' && itemAction !== 'block') return false;
    if (activeTab === 'flag' && itemAction !== 'flag') return false;
    if (searchQuery && !item.word.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="animate-fade-in space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-display font-bold text-ink dark:text-slate-100 tracking-tight">
          Content Moderation Word Filter
        </h1>
        <p className="text-xs sm:text-sm text-ink-muted dark:text-slate-400 mt-1">
          Configure two-tier moderation rules: hard-block prohibited language or flag context-dependent words for human review.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Form */}
        <div className="lg:col-span-1">
          <div className="card-surface p-5 sticky top-20 space-y-4">
            <div>
              <h3 className="text-sm font-display font-bold text-ink dark:text-slate-100">Add Moderation Word</h3>
              <p className="text-xs text-ink-muted dark:text-slate-400 mt-0.5">
                Define the word and its enforcement severity tier.
              </p>
            </div>

            <form onSubmit={handleAddWord} className="space-y-4">
              {/* Word Input */}
              <div>
                <label className="block text-[11px] font-body font-semibold text-ink-muted uppercase tracking-wider mb-1.5">
                  Word / Phrase
                </label>
                <input
                  type="text"
                  placeholder="e.g. bakla, bading, spamword"
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  className="input-admin w-full"
                  disabled={addLoading}
                  required
                />
              </div>

              {/* Action Tier Selector */}
              <div>
                <label className="block text-[11px] font-body font-semibold text-ink-muted uppercase tracking-wider mb-2">
                  Action Policy Tier
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setNewAction('block')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-body font-medium transition-all cursor-pointer ${
                      newAction === 'block'
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-300 shadow-2xs font-semibold'
                        : 'bg-white/80 dark:bg-slate-800/80 border-ink-faint/50 dark:border-slate-700 text-ink-muted hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Ban className="w-4 h-4 mb-1 text-rose-600 dark:text-rose-400" />
                    <span>Block</span>
                    <span className="text-[11px] font-normal text-rose-700/80 dark:text-rose-400/80 mt-0.5">Hard reject (422)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewAction('flag')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-body font-medium transition-all cursor-pointer ${
                      newAction === 'flag'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-300 shadow-2xs font-semibold'
                        : 'bg-white/80 dark:bg-slate-800/80 border-ink-faint/50 dark:border-slate-700 text-ink-muted hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Flag className="w-4 h-4 mb-1 text-amber-600 dark:text-amber-400" />
                    <span>Flag</span>
                    <span className="text-[11px] font-normal text-amber-700/80 dark:text-amber-400/80 mt-0.5">Context review</span>
                  </button>
                </div>
                <p className="text-xs text-ink-muted dark:text-slate-400 mt-2 leading-relaxed">
                  {newAction === 'block'
                    ? 'Prohibits submission outright across job posts, profiles, and listings.'
                    : 'Allows conversational submission (reviews/notes) and auto-routes a report to Moderation.'}
                </p>
              </div>

              <button
                type="submit"
                disabled={addLoading || !newWord.trim()}
                className="w-full btn-primary gap-2"
              >
                {addLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Add Filter Word</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Words List */}
        <div className="lg:col-span-2">
          <div className="card-surface p-5 space-y-4">
            {/* List Header & Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-ink-faint/30 dark:border-slate-800">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`inline-flex items-center h-9 px-3.5 rounded-xl text-xs font-body font-semibold transition-all cursor-pointer border ${
                    activeTab === 'all'
                      ? 'bg-ink text-white dark:bg-slate-800 border-ink dark:border-slate-700 shadow-2xs'
                      : 'bg-white/90 dark:bg-slate-800/80 border-ink-faint/50 dark:border-slate-700 text-ink-soft dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  All ({words.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('block')}
                  className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-xs font-body font-semibold transition-all cursor-pointer border ${
                    activeTab === 'block'
                      ? 'bg-ink text-white dark:bg-slate-800 border-ink dark:border-slate-700 shadow-2xs'
                      : 'bg-white/90 dark:bg-slate-800/80 border-ink-faint/50 dark:border-slate-700 text-ink-soft dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Ban className="w-3.5 h-3.5 text-rose-600" />
                  <span>Blocked ({blockedCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('flag')}
                  className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-xs font-body font-semibold transition-all cursor-pointer border ${
                    activeTab === 'flag'
                      ? 'bg-ink text-white dark:bg-slate-800 border-ink dark:border-slate-700 shadow-2xs'
                      : 'bg-white/90 dark:bg-slate-800/80 border-ink-faint/50 dark:border-slate-700 text-ink-soft dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Flag className="w-3.5 h-3.5 text-amber-600" />
                  <span>Flagged ({flaggedCount})</span>
                </button>
              </div>

              {/* Search input */}
              <div className="w-full sm:w-56">
                <input
                  type="text"
                  placeholder="Search words..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-admin w-full"
                />
              </div>
            </div>

            {/* List Body */}
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-11 bg-slate-50 rounded-xl animate-pulse border border-ink-faint/20" />
                ))}
              </div>
            ) : filteredWords.length === 0 ? (
              <div className="py-14 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-ink-faint/30 flex items-center justify-center mb-2.5">
                  <ShieldAlert className="w-5 h-5 text-ink-muted" />
                </div>
                <h4 className="text-base font-display font-bold text-ink">No Words in Filter</h4>
                <p className="text-sm font-body text-ink-muted mt-1 max-w-xs">
                  {searchQuery ? 'No words match your search query.' : 'No filter words registered in this tier.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
                {filteredWords.map((item) => {
                  const isBlock = (item.action || 'block') === 'block';
                  return (
                    <div
                      key={item.id}
                      className="flex justify-between items-center bg-slate-50/70 dark:bg-slate-800/60 border border-ink-faint/30 rounded-xl px-4 py-2.5 hover:bg-white dark:hover:bg-slate-800 transition-all group"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className="font-body text-sm font-semibold text-ink truncate">
                          {item.word}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-body font-medium border ${
                            isBlock
                              ? 'bg-rose-500/10 text-rose-800 dark:text-rose-400 border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {isBlock ? (
                            <>
                              <Ban className="w-3 h-3 text-rose-600" />
                              Blocked
                            </>
                          ) : (
                            <>
                              <Flag className="w-3 h-3 text-amber-600" />
                              Flagged
                            </>
                          )}
                        </span>
                      </div>

                      <button
                        onClick={() => handleDeleteWord(item.id, item.word, item.action || 'block')}
                        disabled={actionLoading === item.id}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-muted hover:text-rose-600 hover:bg-rose-500/10 transition-all disabled:opacity-50 cursor-pointer flex-shrink-0"
                        title="Delete Word"
                      >
                        {actionLoading === item.id ? (
                          <svg className="animate-spin h-3.5 w-3.5 text-rose-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <AlertDialog
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        onConfirm={() => {
          setAlertConfig((prev) => ({ ...prev, isOpen: false }));
          alertConfig.onConfirm();
        }}
        onCancel={() => setAlertConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
