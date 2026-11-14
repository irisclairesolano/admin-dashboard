'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { adminApi } from '@/lib/api';
import { AlertDialog } from '@/components/AlertDialog';
import { useToast } from '@/context/ToastContext';
import { AlertTriangle, Check, Loader2, Plus, RefreshCw, Search, Sparkles, Tag, Trash2, X } from 'lucide-react';

interface CatalogSkill {
  id: number;
  name: string;
  category: string | null;
  workers_count?: number;
}

interface CustomSkillSuggestion {
  name: string;
  worker_count: number;
}

const CATEGORIES = [
  'Construction',
  'Domestic',
  'Agriculture',
  'Wellness',
  'Repair',
  'Transport',
  'Crafts',
  'Other',
];

export default function SkillsManagementPage() {
  const { toast } = useToast();
  const [catalog, setCatalog] = useState<CatalogSkill[]>([]);
  const [suggestions, setSuggestions] = useState<CustomSkillSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState('Construction');
  const [addLoading, setAddLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [promoteCategories, setPromoteCategories] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmVariant?: 'primary' | 'destructive';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmVariant: 'primary',
    onConfirm: () => {},
  });

  const fetchSkills = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await adminApi.getSkillsCatalog(forceRefresh);
      const data = res?.data ?? res;
      setCatalog(Array.isArray(data?.catalog) ? data.catalog : []);
      setSuggestions(Array.isArray(data?.suggestions) ? data.suggestions : []);
    } catch (err: any) {
      console.error('Failed to load skills catalog', err);
      const msg = err?.response?.data?.message || 'Could not load the skills catalog. Please try again.';
      setLoadError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredCatalog = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return catalog.filter((skill) => {
      const matchesCategory =
        categoryFilter === 'All' || (skill.category ?? 'Other') === categoryFilter;
      const matchesQuery =
        !q ||
        skill.name.toLowerCase().includes(q) ||
        (skill.category ?? '').toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [catalog, searchQuery, categoryFilter]);

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSkillName.trim();
    if (!trimmed) return;

    try {
      setAddLoading(true);
      const res = await adminApi.addCatalogSkill(trimmed, newSkillCategory);
      const promoted = res?.data?.promoted_count ?? 0;
      setNewSkillName('');
      toast.success(
        promoted > 0
          ? `Added "${trimmed}" and promoted ${promoted} worker profile(s).`
          : `Added "${trimmed}" to the skills catalog.`
      );
      await fetchSkills(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to add skill.';
      toast.error(msg);
    } finally {
      setAddLoading(false);
    }
  };

  const handlePromoteSuggestion = async (suggestion: CustomSkillSuggestion) => {
    const category = promoteCategories[suggestion.name] || 'Other';
    try {
      setBusyKey(`promote:${suggestion.name}`);
      const res = await adminApi.addCatalogSkill(suggestion.name, category);
      const promoted = res?.data?.promoted_count ?? 0;
      toast.success(
        `Approved "${suggestion.name}" under ${category} (${promoted} worker profile(s) updated).`
      );
      await fetchSkills(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to promote skill.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleDismissSuggestion = (suggestion: CustomSkillSuggestion) => {
    setAlertConfig({
      isOpen: true,
      title: 'Dismiss Custom Skill',
      message: `Remove "${suggestion.name}" from ${suggestion.worker_count} worker profile(s)? This cannot be undone.`,
      confirmText: 'Dismiss',
      cancelText: 'Cancel',
      confirmVariant: 'destructive',
      onConfirm: async () => {
        try {
          setBusyKey(`dismiss:${suggestion.name}`);
          await adminApi.dismissCustomSkill(suggestion.name);
          toast.info(`Dismissed "${suggestion.name}".`);
          await fetchSkills(true);
        } catch {
          toast.error('Failed to dismiss custom skill.');
        } finally {
          setBusyKey(null);
        }
      },
    });
  };

  const handleDeleteCatalogSkill = (skill: CatalogSkill) => {
    setAlertConfig({
      isOpen: true,
      title: 'Delete Catalog Skill',
      message: `Remove "${skill.name}" from the global catalog? Workers currently using it (${skill.workers_count ?? 0}) will have it detached.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmVariant: 'destructive',
      onConfirm: async () => {
        try {
          setBusyKey(`delete:${skill.id}`);
          await adminApi.deleteCatalogSkill(skill.id);
          toast.info(`Deleted "${skill.name}" from catalog.`);
          await fetchSkills(true);
        } catch {
          toast.error('Failed to delete skill.');
        } finally {
          setBusyKey(null);
        }
      },
    });
  };

  return (
    <div className="animate-fade-in max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-ink">
            Skills Catalog &amp; Moderation
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            Manage curated worker skills and review custom skills submitted by workers.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-body font-semibold">
          <span className="px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-ink-faint/40 dark:border-slate-700/60 text-ink shadow-2xs">
            {catalog.length} Catalog
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-700/50 text-amber-800 dark:text-amber-200 shadow-2xs">
            {suggestions.length} Pending Suggestions
          </span>
        </div>
      </div>

      {/* Persistent Load Error State */}
      {loadError && !loading && (
        <div
          role="alert"
          className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl border border-rose-300 dark:border-rose-500/40 shadow-glass flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <p className="text-xs font-body font-bold text-ink">Unable to load skills</p>
              <p className="text-xs font-body text-ink-muted mt-0.5">{loadError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchSkills(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-ink hover:bg-ink-soft text-white text-xs font-body font-semibold transition-all shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 cursor-pointer self-start sm:self-center"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Left Column: Add Curated Skill */}
        <div className="md:col-span-1">
          <div className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md p-5 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-glass sticky top-20 space-y-4">
            <div>
              <h3 className="text-sm font-display font-bold text-ink">Add Curated Skill</h3>
              <p className="text-[11px] text-ink-muted mt-0.5">
                Add an official skill to the global catalog. Matching worker custom skills are automatically promoted.
              </p>
            </div>

            <form onSubmit={handleAddSkill} className="space-y-4">
              <div>
                <label
                  htmlFor="new-skill-name"
                  className="block text-[11px] font-body font-semibold text-ink-muted uppercase tracking-wider mb-1.5"
                >
                  Skill Name
                </label>
                <input
                  id="new-skill-name"
                  type="text"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  placeholder="e.g. Solar Panel Installation"
                  maxLength={100}
                  disabled={addLoading}
                  required
                  className="w-full px-3.5 py-2 bg-slate-50 rounded-xl border border-ink-faint/50 outline-none text-xs font-body text-ink focus:bg-white dark:focus:bg-slate-900/90 focus:border-ink/50 transition-all"
                />
              </div>

              <div>
                <label
                  htmlFor="new-skill-category"
                  className="block text-[11px] font-body font-semibold text-ink-muted uppercase tracking-wider mb-1.5"
                >
                  Category
                </label>
                <select
                  id="new-skill-category"
                  value={newSkillCategory}
                  onChange={(e) => setNewSkillCategory(e.target.value)}
                  disabled={addLoading}
                  className="w-full px-3.5 py-2 bg-slate-50 rounded-xl border border-ink-faint/50 outline-none text-xs font-body text-ink focus:bg-white dark:focus:bg-slate-900/90 focus:border-ink/50 transition-all cursor-pointer"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={addLoading || !newSkillName.trim()}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-body font-bold text-white bg-ink hover:bg-ink-soft disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 cursor-pointer"
              >
                {addLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Skill</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Suggestions + Catalog */}
        <div className="md:col-span-2 space-y-5">
          {/* Worker Custom Skill Suggestions */}
          <section className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md p-5 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-glass space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-ink-faint/30">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <h2 className="text-sm font-display font-bold text-ink">
                  Worker Custom Skill Suggestions
                </h2>
              </div>
              <span className="text-[11px] text-ink-muted">
                Approve to promote or dismiss junk entries
              </span>
            </div>

            {loading ? (
              <p className="py-6 text-center text-xs text-ink-muted">Loading suggestions...</p>
            ) : loadError ? (
              <p className="py-6 text-center text-xs text-ink-muted">
                Suggestions unavailable until catalog reloads.
              </p>
            ) : suggestions.length === 0 ? (
              <p className="py-6 text-center text-xs text-ink-muted">
                No pending custom skill suggestions from workers.
              </p>
            ) : (
              <div className="divide-y divide-ink-faint/20">
                {suggestions.map((suggestion) => {
                  const selectedCat = promoteCategories[suggestion.name] || 'Other';
                  const isPromoting = busyKey === `promote:${suggestion.name}`;
                  const isDismissing = busyKey === `dismiss:${suggestion.name}`;
                  const isBusy = isPromoting || isDismissing;

                  return (
                    <div
                      key={suggestion.name}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-body font-semibold text-ink break-words">
                          {suggestion.name}
                        </p>
                        <p className="text-[11px] text-ink-muted">
                          Requested by {suggestion.worker_count}{' '}
                          {suggestion.worker_count === 1 ? 'worker' : 'workers'}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                        <select
                          value={selectedCat}
                          onChange={(e) =>
                            setPromoteCategories((prev) => ({
                              ...prev,
                              [suggestion.name]: e.target.value,
                            }))
                          }
                          aria-label={`Category for ${suggestion.name}`}
                          disabled={isBusy}
                          className="px-2.5 py-1.5 rounded-xl border border-ink-faint/50 bg-slate-50 text-xs font-body text-ink focus:bg-white dark:focus:bg-slate-900/90 cursor-pointer disabled:opacity-50"
                        >
                          {CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handlePromoteSuggestion(suggestion)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-body font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 cursor-pointer"
                        >
                          {isPromoting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>{isPromoting ? 'Approving...' : 'Approve'}</span>
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleDismissSuggestion(suggestion)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs font-body font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 cursor-pointer"
                        >
                          {isDismissing ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <X className="w-3.5 h-3.5" />
                          )}
                          <span>{isDismissing ? 'Dismissing...' : 'Dismiss'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Curated Global Catalog */}
          <section className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md p-5 rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-glass space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-ink-faint/30">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-ink" />
                <h2 className="text-sm font-display font-bold text-ink">
                  Curated Global Catalog
                </h2>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <label htmlFor="catalog-skill-search" className="sr-only">
                    Search catalog skills
                  </label>
                  <Search className="pointer-events-none absolute left-3 top-2 w-3.5 h-3.5 text-ink-muted" />
                  <input
                    id="catalog-skill-search"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search skills..."
                    className="w-full sm:w-48 pl-8 pr-3 py-1.5 bg-slate-50 rounded-xl border border-ink-faint/50 outline-none text-xs font-body text-ink focus:bg-white dark:focus:bg-slate-900/90 focus:border-ink/50 transition-all"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  aria-label="Filter by category"
                  className="px-3 py-1.5 bg-slate-50 rounded-xl border border-ink-faint/50 outline-none text-xs font-body text-ink focus:bg-white dark:focus:bg-slate-900/90 focus:border-ink/50 transition-all cursor-pointer"
                >
                  <option value="All">All Categories</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <p className="py-8 text-center text-xs text-ink-muted">Loading catalog...</p>
            ) : loadError ? (
              <p className="py-8 text-center text-xs text-ink-muted">
                Catalog unavailable until connection succeeds.
              </p>
            ) : filteredCatalog.length === 0 ? (
              <p className="py-8 text-center text-xs text-ink-muted">No matching skills found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-ink-faint/30 text-[10px] font-body font-semibold uppercase tracking-wider text-ink-muted">
                      <th className="py-2 pr-4">Skill Name</th>
                      <th className="py-2 pr-4">Category</th>
                      <th className="py-2 pr-4">Workers</th>
                      <th className="py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-faint/20">
                    {filteredCatalog.map((skill) => {
                      const isDeleting = busyKey === `delete:${skill.id}`;
                      return (
                        <tr key={skill.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 pr-4 font-body font-medium text-ink break-words max-w-[14rem]">
                            {skill.name}
                          </td>
                          <td className="py-2.5 pr-4 whitespace-nowrap">
                            <span className="inline-flex rounded-full bg-slate-100 dark:bg-slate-800 border border-ink-faint/40 dark:border-slate-700 px-2.5 py-0.5 text-[11px] font-medium text-ink">
                              {skill.category || 'Other'}
                            </span>
                          </td>
                          <td className="py-2.5 pr-4 text-ink-muted whitespace-nowrap">
                            {skill.workers_count ?? 0}
                          </td>
                          <td className="py-2.5 text-right whitespace-nowrap">
                            <button
                              type="button"
                              disabled={isDeleting}
                              onClick={() => handleDeleteCatalogSkill(skill)}
                              aria-label={`Delete ${skill.name}`}
                              className="inline-flex items-center gap-1 rounded-xl border border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-950/50 px-2.5 py-1 text-[11px] font-body font-semibold text-rose-800 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 cursor-pointer"
                            >
                              {isDeleting ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3" />
                              )}
                              <span>{isDeleting ? 'Removing...' : 'Remove'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>

      <AlertDialog
        isOpen={alertConfig.isOpen}
        onCancel={() => setAlertConfig((prev) => ({ ...prev, isOpen: false }))}
        title={alertConfig.title}
        message={alertConfig.message}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        confirmVariant={alertConfig.confirmVariant}
        onConfirm={() => {
          setAlertConfig((prev) => ({ ...prev, isOpen: false }));
          alertConfig.onConfirm();
        }}
      />
    </div>
  );
}
