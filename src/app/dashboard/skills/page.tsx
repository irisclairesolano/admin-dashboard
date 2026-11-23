'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { adminApi } from '@/lib/api';
import { AlertDialog } from '@/components/AlertDialog';
import { useToast } from '@/context/ToastContext';
import { AlertTriangle, Loader2, Plus, RefreshCw, Search, Tag, Trash2 } from 'lucide-react';

interface CatalogSkill {
  id: number;
  name: string;
  category: string | null;
  workers_count?: number;
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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState('Construction');
  const [addLoading, setAddLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
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
    <div className="animate-fade-in space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-ink dark:text-slate-100 tracking-tight">
            Skills Catalog &amp; Moderation
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted dark:text-slate-400 mt-1">
            Manage curated worker skills in the global catalog.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-body font-semibold">
          <span className="badge-neutral text-xs">
            {catalog.length} Catalog
          </span>
        </div>
      </div>

      {/* Persistent Load Error State */}
      {loadError && !loading && (
        <div
          role="alert"
          className="card-surface p-4 border-rose-300 dark:border-rose-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <p className="text-xs font-body font-bold text-ink dark:text-slate-100">Unable to load skills</p>
              <p className="text-xs font-body text-ink-muted dark:text-slate-400 mt-0.5">{loadError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchSkills(true)}
            className="btn-primary gap-1.5 self-start sm:self-center"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Add Curated Skill */}
        <div className="lg:col-span-1">
          <div className="card-surface p-5 sticky top-20 space-y-4">
            <div>
              <h3 className="text-sm font-display font-bold text-ink dark:text-slate-100">Add Curated Skill</h3>
              <p className="text-xs text-ink-muted dark:text-slate-400 mt-0.5">
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
                  className="input-admin w-full"
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
                  className="select-admin w-full"
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
                className="w-full btn-primary gap-2"
              >
                {addLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Add Skill</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Catalog */}
        <div className="lg:col-span-2 space-y-5">


          {/* Curated Global Catalog */}
          <section className="card-surface p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-ink-faint/30 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-ink dark:text-slate-100" />
                <h2 className="text-sm font-display font-bold text-ink dark:text-slate-100">
                  Curated Global Catalog
                </h2>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <label htmlFor="catalog-skill-search" className="sr-only">
                    Search catalog skills
                  </label>
                  <Search className="pointer-events-none absolute left-3 top-2.5 w-4 h-4 text-ink-muted" />
                  <input
                    id="catalog-skill-search"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search skills..."
                    className="input-admin w-full sm:w-52 pl-9 pr-3"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  aria-label="Filter by category"
                  className="select-admin"
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
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-ink-faint/30 text-xs font-body font-semibold uppercase tracking-wider text-ink-muted">
                      <th className="py-3 pr-4">Skill Name</th>
                      <th className="py-3 pr-4">Category</th>
                      <th className="py-3 pr-4">Workers</th>
                      <th className="py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-faint/20 text-sm">
                    {filteredCatalog.map((skill) => {
                      const isDeleting = busyKey === `delete:${skill.id}`;
                      return (
                        <tr key={skill.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 pr-4 font-body font-semibold text-ink break-words max-w-[14rem]">
                            {skill.name}
                          </td>
                          <td className="py-3 pr-4 whitespace-nowrap">
                            <span className="badge-neutral text-xs">
                              {skill.category || 'Other'}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-ink-muted font-numeric whitespace-nowrap">
                            {skill.workers_count ?? 0}
                          </td>
                          <td className="py-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              disabled={isDeleting}
                              onClick={() => handleDeleteCatalogSkill(skill)}
                              aria-label={`Delete ${skill.name}`}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 dark:bg-rose-950/40 px-3 py-1 text-xs font-body font-semibold text-rose-800 dark:text-rose-200 hover:bg-rose-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 cursor-pointer"
                            >
                              {isDeleting ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
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
