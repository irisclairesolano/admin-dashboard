'use client';

import React, { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { AlertDialog } from '@/components/AlertDialog';
import { ProfanityWord } from '@/types/models';
import { Ban, Flag, Plus, Trash2, ShieldAlert, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function ProfanityFilterPage() {
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
      setNewWord('');
      await fetchWords();
    } catch (err: any) {
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
          await fetchWords();
        } catch (err: any) {
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
    <div className="animate-fade-in max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-display font-bold text-ink">
          Content Moderation Word Filter
        </h1>
        <p className="text-xs text-ink-muted mt-1">
          Configure two-tier moderation rules: hard-block prohibited language or flag context-dependent words for human review.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Left Column: Form */}
        <div className="md:col-span-1">
          <div className="bg-white p-5 rounded-2xl border border-ink-faint/40 shadow-xs sticky top-20 space-y-4">
            <div>
              <h3 className="text-sm font-display font-bold text-ink">Add Moderation Word</h3>
              <p className="text-[11px] text-ink-muted mt-0.5">
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
                  className="w-full px-3.5 py-2 bg-slate-50 rounded-xl border border-ink-faint/50 outline-none text-xs font-body focus:bg-white focus:border-ink/50 transition-all"
                  disabled={addLoading}
                  required
                />
              </div>

              {/* Action Tier Selector */}
              <div>
                <label className="block text-[11px] font-body font-semibold text-ink-muted uppercase tracking-wider mb-1.5">
                  Action Policy Tier
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewAction('block')}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-body font-semibold transition-all cursor-pointer ${
                      newAction === 'block'
                        ? 'bg-rose-50 border-rose-300 text-rose-800 shadow-2xs'
                        : 'bg-white border-ink-faint/50 text-ink-muted hover:bg-slate-50'
                    }`}
                  >
                    <Ban className="w-4 h-4 mb-1 text-rose-600" />
                    <span>Block</span>
                    <span className="text-[10px] font-normal text-rose-600/80 mt-0.5">Hard reject (422)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewAction('flag')}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-body font-semibold transition-all cursor-pointer ${
                      newAction === 'flag'
                        ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-2xs'
                        : 'bg-white border-ink-faint/50 text-ink-muted hover:bg-slate-50'
                    }`}
                  >
                    <Flag className="w-4 h-4 mb-1 text-amber-600" />
                    <span>Flag</span>
                    <span className="text-[10px] font-normal text-amber-600/80 mt-0.5">Context review</span>
                  </button>
                </div>
                <p className="text-[10px] text-ink-muted mt-2 leading-relaxed">
                  {newAction === 'block'
                    ? 'Prohibits submission outright across job posts, profiles, and listings.'
                    : 'Allows conversational submission (reviews/notes) and auto-routes a report to Moderation.'}
                </p>
              </div>

              <button
                type="submit"
                disabled={addLoading || !newWord.trim()}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-body font-bold text-white bg-ink hover:bg-ink-soft disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
              >
                {addLoading ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Filter Word</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Words List */}
        <div className="md:col-span-2">
          <div className="bg-white p-5 rounded-2xl border border-ink-faint/40 shadow-xs space-y-4">
            {/* List Header & Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-ink-faint/30">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-body font-semibold transition-all cursor-pointer ${
                    activeTab === 'all'
                      ? 'bg-ink text-white shadow-2xs'
                      : 'bg-white border border-ink-faint/50 text-ink-soft hover:bg-slate-50'
                  }`}
                >
                  All ({words.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('block')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-body font-semibold transition-all cursor-pointer ${
                    activeTab === 'block'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'bg-white border border-ink-faint/50 text-rose-700 hover:bg-rose-50'
                  }`}
                >
                  <Ban className="w-3 h-3" />
                  <span>Blocked ({blockedCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('flag')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-body font-semibold transition-all cursor-pointer ${
                    activeTab === 'flag'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-white border border-ink-faint/50 text-amber-700 hover:bg-amber-50'
                  }`}
                >
                  <Flag className="w-3 h-3" />
                  <span>Flagged ({flaggedCount})</span>
                </button>
              </div>

              {/* Search input */}
              <div className="w-full sm:w-48">
                <input
                  type="text"
                  placeholder="Search words..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-1 bg-slate-50 rounded-lg border border-ink-faint/50 outline-none text-xs font-body focus:bg-white focus:border-ink/50 transition-all"
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
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-ink-faint/30 flex items-center justify-center mb-2.5">
                  <ShieldAlert className="w-5 h-5 text-ink-muted" />
                </div>
                <h4 className="text-sm font-display font-bold text-ink">No Words in Filter</h4>
                <p className="text-xs font-body text-ink-muted mt-1 max-w-xs">
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
                      className="flex justify-between items-center bg-slate-50/70 border border-ink-faint/30 rounded-xl px-3.5 py-2 hover:bg-white transition-all group"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className="font-body text-xs font-semibold text-ink truncate">
                          {item.word}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-body font-bold border ${
                            isBlock
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {isBlock ? (
                            <>
                              <Ban className="w-2.5 h-2.5" />
                              Blocked
                            </>
                          ) : (
                            <>
                              <Flag className="w-2.5 h-2.5" />
                              Flagged
                            </>
                          )}
                        </span>
                      </div>

                      <button
                        onClick={() => handleDeleteWord(item.id, item.word, item.action || 'block')}
                        disabled={actionLoading === item.id}
                        className="p-1.5 text-ink-muted hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-50 cursor-pointer flex-shrink-0"
                        title="Delete Word"
                      >
                        {actionLoading === item.id ? (
                          <svg className="animate-spin h-3.5 w-3.5 text-rose-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
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
