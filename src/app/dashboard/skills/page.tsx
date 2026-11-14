'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { adminApi } from '@/lib/api';
import { AlertDialog } from '@/components/AlertDialog';
import { useToast } from '@/context/ToastContext';
import { Check, Plus, Search, Sparkles, Tag, Trash2, X } from 'lucide-react';

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
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const fetchSkills = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const res = await adminApi.getSkillsCatalog(forceRefresh);
      const data = res?.data ?? res;
      setCatalog(Array.isArray(data?.catalog) ? data.catalog : []);
      setSuggestions(Array.isArray(data?.suggestions) ? data.suggestions : []);
    } catch (err) {
      console.error('Failed to load skills catalog', err);
      toast.error('Failed to load skills catalog.');
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
        <div className="flex items-center gap-2 text-xs font-body font-semibold">
          <span className="px-3 py-1.5 rounded-xl bg-white border border-ink-faint/40 text-ink shadow-2xs">
            {catalog.length} Catalog
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 shadow-2xs">
            {suggestions.length} Pending Suggestions
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Left Column: Add Curated Skill */}
        <div className="md:col-span-1">
          <div className="bg-white p-5 rounded-2xl border border-ink-faint/40 shadow-xs sticky top-20 space-y-4">
            <div>
              <h3 className="text-sm font-display font-bold text-ink">Add Curated Skill</h3>
              <p className="text-[11px] text-ink-muted mt-0.5">
                Add an official skill to the global catalog. Matching worker custom skills are automatically promoted.
              </p>
            </div>

            <form onSubmit={handleAddSkill} className="space-y-4">
              <div>
                <label className="block text-[11px] font-body font-semibold text-ink-muted uppercase tracking-wider mb-1.5">
                  Skill Name
                </label>
                <input
                  type="text"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  placeholder="e.g. Solar Panel Installation"
                  maxLength={100}
                  disabled={addLoading}
                  required
                  className="w-full px-3.5 py-2 bg-slate-50 rounded-xl border border-ink-faint/50 outline-none text-xs font-body text-ink focus:bg-white focus:border-ink/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-body font-semibold text-ink-muted uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <select
                  value={newSkillCategory}
                  onChange={(e) => setNewSkillCategory(e.target.value)}
                  aria-label="New skill category"
                  disabled={addLoading}
                  className="w-full px-3.5 py-2 bg-slate-50 rounded-xl border border-ink-faint/50 outline-none text-xs font-body text-ink focus:bg-white focus:border-ink/50 transition-all cursor-pointer"
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
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-body font-bold text-white bg-ink hover:bg-ink-soft disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{addLoading ? 'Adding...' : 'Add Skill'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Suggestions + Catalog */}
        <div className="md:col-span-2 space-y-5">
          {/* Worker Custom Skill Suggestions */}
          <section className="bg-white p-5 rounded-2xl border border-ink-faint/40 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-ink-faint/30">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
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
            ) : suggestions.length === 0 ? (
              <p className="py-6 text-center text-xs text-ink-muted">
                No pending custom skill suggestions from workers.
              </p>
            ) : (
              <div className="divide-y divide-ink-faint/20">
                {suggestions.map((suggestion) => {
                  const selectedCat = promoteCategories[suggestion.name] || 'Other';
                  const isBusy =
                    busyKey === `promote:${suggestion.name}` ||
                    busyKey === `dismiss:${suggestion.name}`;

                  return (
                    <div
                      key={suggestion.name}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div>
                        <p className="text-xs font-body font-semibold text-ink">
                          {suggestion.name}
                        </p>
                        <p className="text-[11px] text-ink-muted">
                          Requested by {suggestion.worker_count}{' '}
                          {suggestion.worker_count === 1 ? 'worker' : 'workers'}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={selectedCat}
                          onChange={(e) =>
                            setPromoteCategories((prev) => ({
                              ...prev,
                              [suggestion.name]: e.target.value,
                            }))
                          }
                          aria-label={`Category for ${suggestion.name}`}
                          className="px-2.5 py-1.5 rounded-xl border border-ink-faint/50 bg-slate-50 text-xs font-body text-ink cursor-pointer"
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
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-body font-semibold transition-all disabled:opacity-50 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleDismissSuggestion(suggestion)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 hover:bg-rose-100 text-xs font-body font-semibold transition-all disabled:opacity-50 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          Dismiss
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Curated Global Catalog */}
          <section className="bg-white p-5 rounded-2xl border border-ink-faint/40 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-ink-faint/30">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-ink" />
                <h2 className="text-sm font-display font-bold text-ink">
                  Curated Global Catalog
                </h2>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-2 w-3.5 h-3.5 text-ink-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search skills..."
                    className="w-full sm:w-48 pl-8 pr-3 py-1.5 bg-slate-50 rounded-xl border border-ink-faint/50 outline-none text-xs font-body text-ink focus:bg-white focus:border-ink/50 transition-all"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  aria-label="Filter by category"
                  className="px-3 py-1.5 bg-slate-50 rounded-xl border border-ink-faint/50 outline-none text-xs font-body text-ink focus:bg-white focus:border-ink/50 transition-all cursor-pointer"
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
                    {filteredCatalog.map((skill) => (
                      <tr key={skill.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 pr-4 font-body font-medium text-ink">
                          {skill.name}
                        </td>
                        <td className="py-2.5 pr-4">
                          <span className="inline-flex rounded-full bg-slate-100 border border-ink-faint/40 px-2.5 py-0.5 text-[11px] font-medium text-ink">
                            {skill.category || 'Other'}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-ink-muted">
                          {skill.workers_count ?? 0}
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            type="button"
                            disabled={busyKey === `delete:${skill.id}`}
                            onClick={() => handleDeleteCatalogSkill(skill)}
                            aria-label={`Delete ${skill.name}`}
                            className="inline-flex items-center gap-1 rounded-xl border border-rose-300 bg-rose-50 px-2.5 py-1 text-[11px] font-body font-semibold text-rose-800 hover:bg-rose-100 transition-all disabled:opacity-50 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
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
        onConfirm={() => {
          setAlertConfig((prev) => ({ ...prev, isOpen: false }));
          alertConfig.onConfirm();
        }}
      />
    </div>
  );
}
