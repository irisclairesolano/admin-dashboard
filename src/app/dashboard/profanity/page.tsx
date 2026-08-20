'use client';

import React, { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { AlertDialog } from '@/components/AlertDialog';

export default function ProfanityFilterPage() {
  const [words, setWords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newWord, setNewWord] = useState('');
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
    const wordToAdd = newWord.trim();
    if (!wordToAdd) return;

    if (words.some((w) => w.word.toLowerCase() === wordToAdd.toLowerCase())) {
      showAlert('Duplicate Word', `"${wordToAdd}" is already in the blocked list.`);
      return;
    }

    try {
      setAddLoading(true);
      await adminApi.addProfanityWord(wordToAdd);
      setNewWord('');
      await fetchWords();
    } catch (err: any) {
      showAlert('Error', err.response?.data?.message || 'Failed to add word.');
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteWord = (id: number, word: string) => {
    confirmAction(
      'Remove Blocked Word',
      `Are you sure you want to remove "${word}" from the blocked words list? Content containing this word will no longer be flagged.`,
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

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-display text-transparent bg-clip-text bg-gradient-to-r from-ink to-primary-dark font-bold">
          Profanity {'\n'}Filter Moderation
        </h1>
        <p className="text-ink-soft font-body mt-2 text-lg">
          Manage words that are automatically blocked or flagged in job posts, descriptions, and profiles.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Form */}
        <div className="md:col-span-1">
          <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-white/50 shadow-sm sticky top-24">
            <h3 className="text-lg font-display font-bold text-ink mb-4">Add Banned Word</h3>
            <form onSubmit={handleAddWord} className="space-y-4">
              <div>
                <label className="block text-xs font-body font-bold text-ink-muted uppercase tracking-wider mb-2">Word</label>
                <input
                  type="text"
                  placeholder="E.g. spamword"
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  className="w-full px-4 py-3 bg-white/70 backdrop-blur-md rounded-2xl border border-ink-faint/30 outline-none text-sm font-body focus:bg-white focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all"
                  disabled={addLoading}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={addLoading || !newWord.trim()}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-body font-semibold text-white bg-ink hover:bg-ink-soft disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-98"
              >
                {addLoading ? (
                  <>
                    <i className="lni lni-spinner-arrow animate-spin mr-1.5"></i>
                    Adding...
                  </>
                ) : (
                  <>
                    <i className="lni lni-plus text-xs"></i>
                    Add Word
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Words List */}
        <div className="md:col-span-2">
          <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-white/50 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-display font-bold text-ink">Banned Words List</h3>
              <span className="text-xs font-body font-bold bg-primary-soft text-primary-dark px-3 py-1 rounded-full border border-primary/15">
                {words.length} Banned {words.length === 1 ? 'Word' : 'Words'}
              </span>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 5].map((i) => (
                  <div key={i} className="h-14 bg-ink-faint/25 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : words.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-3xl bg-primary-soft/30 flex items-center justify-center mb-4">
                  <i className="lni lni-ban text-3xl text-primary"></i>
                </div>
                <h4 className="text-lg font-display font-bold text-ink">No Words Blocked</h4>
                <p className="text-sm font-body text-ink-muted mt-2 max-w-sm">
                  The profanity filter is active, but no custom phrases are registered yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
                {words.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center bg-paper/40 border border-ink-faint/30 rounded-2xl px-4 py-3 hover:bg-white transition-all group hover:shadow-sm"
                  >
                    <span className="font-body text-sm font-semibold text-ink group-hover:text-primary transition-colors">
                      {item.word}
                    </span>
                    <button
                      onClick={() => handleDeleteWord(item.id, item.word)}
                      disabled={actionLoading === item.id}
                      className="p-1.5 hover:bg-status-error/15 text-ink-muted hover:text-status-error rounded-xl transition-all disabled:opacity-50"
                      title="Delete Word"
                    >
                      {actionLoading === item.id ? (
                        <i className="lni lni-spinner-arrow animate-spin text-sm" />
                      ) : (
                        <i className="lni lni-trash-can text-sm" />
                      )}
                    </button>
                  </div>
                ))}
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
