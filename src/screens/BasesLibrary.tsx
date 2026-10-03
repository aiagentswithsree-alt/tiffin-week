import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeekStore } from '../store/useWeekStore';
import { DEFAULT_BASES } from '../data/bases';
import { SAMPLE_RECIPES } from '../data/recipes';
import { BaseItem } from '../types';

const FILTER_PILLS = ['All', 'Soak', 'Sprout', 'Grind', 'Cut', 'Cook a base'] as const;

export default function BasesLibrary() {
  const nav = useNavigate();
  const { state, update, save } = useWeekStore();

  const bases = state.bases && state.bases.length > 0 ? state.bases : DEFAULT_BASES;
  const recipes = state.recipes && state.recipes.length > 0 ? state.recipes : SAMPLE_RECIPES;

  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [creating, setCreating] = useState(false);
  const [deleteConflict, setDeleteConflict] = useState<{ base: BaseItem; usedBy: string[] } | null>(null);

  // New base form state
  const [newName, setNewName] = useState('');
  const [newKind, setNewKind] = useState('cook a base');
  const [newLead, setNewLead] = useState('Sunday');
  const [newKeeps, setNewKeeps] = useState('4 days');
  const [newBatch, setNewBatch] = useState('≈ 3 dishes');

  // Compute used-by dishes count for each base from state.recipes
  const usedByMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const b of bases) {
      const bLow = b.name.toLowerCase();
      const matching = recipes.filter(
        (r) =>
          r.base &&
          (r.base.toLowerCase() === bLow ||
            r.base.toLowerCase().includes(bLow) ||
            bLow.includes(r.base.toLowerCase()) ||
            (bLow.includes('batter') && r.base.toLowerCase().includes('batter')) ||
            (bLow.includes('rice') && r.base.toLowerCase().includes('rice')) ||
            (bLow.includes('dough') && r.base.toLowerCase().includes('dough')) ||
            (bLow.includes('moong') && r.base.toLowerCase().includes('moong'))),
      );
      map.set(b.id, matching.map((r) => r.name));
    }
    return map;
  }, [bases, recipes]);

  const filteredBases = useMemo(() => {
    if (activeFilter === 'All') return bases;
    const filterLow = activeFilter.toLowerCase();
    return bases.filter((b) => b.kind.toLowerCase().includes(filterLow));
  }, [bases, activeFilter]);

  const handleCreateBase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newBase: BaseItem = {
      id: `base-${Date.now()}`,
      name: newName.trim(),
      kind: newKind,
      leadTime: newLead,
      keeps: newKeeps,
      batchSize: newBatch,
      isCustom: true,
    };

    update((draft) => {
      if (!draft.bases || draft.bases.length === 0) {
        draft.bases = structuredClone(DEFAULT_BASES);
      }
      draft.bases.push(newBase);
    }, `Added base “${newName}”`);

    setNewName('');
    setCreating(false);
  };

  const requestDeleteBase = (base: BaseItem) => {
    const used = usedByMap.get(base.id) || [];
    if (used.length > 0) {
      setDeleteConflict({ base, usedBy: used });
      return;
    }
    executeDeleteBase(base, false);
  };

  const executeDeleteBase = (base: BaseItem, cleanReferences: boolean) => {
    update((draft) => {
      const baseNameLower = base.name.toLowerCase();
      if (draft.bases) {
        draft.bases = draft.bases.filter((b) => b.id !== base.id && b.name.toLowerCase() !== baseNameLower);
      }
      if (cleanReferences) {
        if (draft.recipes) {
          for (const r of draft.recipes) {
            if (r.base && (r.base.toLowerCase() === baseNameLower || r.base === base.id)) {
              r.base = null;
            }
          }
        }
        for (const rt of draft.routines) {
          for (const g of rt.groups) {
            for (const s of g.slots) {
              if (s.base && (s.base.toLowerCase() === baseNameLower || s.base === base.id)) {
                s.base = null;
              }
            }
          }
        }
        for (const inst of Object.values(draft.dayInstances)) {
          for (const g of inst.groups) {
            for (const s of g.slots) {
              if (s.base && (s.base.toLowerCase() === baseNameLower || s.base === base.id)) {
                s.base = null;
              }
            }
          }
        }
      }
    }, `Removed base “${base.name}”`);
    setDeleteConflict(null);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg text-ink">
      {/* Top Header — Screen 25 */}
      <div className="flex flex-shrink-0 items-center gap-1 border-b border-line px-2 py-3">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? nav(-1) : nav('/prep'))}
          aria-label="Back to prep plan"
          className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-surface-2 cursor-pointer"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path
              d="M11 3.5 5.5 9l5.5 5.5"
              stroke="#1B1A17"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className="flex flex-1 flex-col min-w-0">
          <h1 className="font-display text-[20px] font-bold leading-tight">Bases &amp; preps</h1>
          <span className="text-[12.5px] text-[#6B675F] truncate">
            Made ahead once, used by many dishes
          </span>
        </div>
      </div>

      {/* Filter Pills Bar (Wireframe 25) */}
      <div className="flex flex-shrink-0 items-center gap-1.5 overflow-x-auto px-4 py-2.5">
        {FILTER_PILLS.map((pill) => {
          const isActive = activeFilter === pill;
          return (
            <button
              key={pill}
              type="button"
              onClick={() => setActiveFilter(pill)}
              className={`min-h-[34px] px-3 rounded-full text-[12.5px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-ink text-bg border border-ink'
                  : 'bg-white text-[#3F3C37] border border-[#DDDBC0] hover:bg-surface-2'
              }`}
            >
              {pill}
            </button>
          );
        })}
      </div>

      {/* Scrollable Bases List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 pt-1">
        {/* + New base or prep Button */}
        {!creating ? (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex min-h-[44px] w-full items-center justify-center rounded-[12px] border-[1.5px] border-dashed border-[#B4761A] bg-transparent text-[14px] font-semibold text-[#8F5A0F] hover:bg-[#F6EBD9]/30 cursor-pointer"
          >
            + New base or prep
          </button>
        ) : (
          <form
            onSubmit={handleCreateBase}
            className="rounded-[12px] border border-[#B4761A] bg-white p-3 space-y-2.5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8F5A0F]">
                New base or prep
              </span>
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="text-sm font-semibold text-ink-3 hover:text-ink cursor-pointer"
              >
                ✕
              </button>
            </div>

            <label className="block text-[11px] font-semibold text-ink-2">
              Name
              <input
                type="text"
                placeholder="e.g. Sambar paste"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                className="mt-0.5 w-full rounded border border-line px-2 py-1.5 text-xs text-ink focus:border-ink focus:outline-none"
              />
            </label>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-ink-2">
              <label>
                Kind
                <select
                  value={newKind}
                  onChange={(e) => setNewKind(e.target.value)}
                  className="mt-0.5 w-full rounded border border-line bg-white px-2 py-1 text-xs text-ink"
                >
                  <option value="cook a base">cook a base</option>
                  <option value="grind + ferment">grind + ferment</option>
                  <option value="soak">soak</option>
                  <option value="sprout">sprout</option>
                  <option value="cut">cut</option>
                  <option value="roast">roast</option>
                </select>
              </label>

              <label>
                Lead time
                <input
                  type="text"
                  placeholder="e.g. overnight"
                  value={newLead}
                  onChange={(e) => setNewLead(e.target.value)}
                  className="mt-0.5 w-full rounded border border-line px-2 py-1 text-xs text-ink"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-ink-2">
              <label>
                Keeps
                <input
                  type="text"
                  placeholder="e.g. 4 days"
                  value={newKeeps}
                  onChange={(e) => setNewKeeps(e.target.value)}
                  className="mt-0.5 w-full rounded border border-line px-2 py-1 text-xs text-ink"
                />
              </label>

              <label>
                Batch size
                <input
                  type="text"
                  placeholder="e.g. ≈ 4 dishes"
                  value={newBatch}
                  onChange={(e) => setNewBatch(e.target.value)}
                  className="mt-0.5 w-full rounded border border-line px-2 py-1 text-xs text-ink"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="rounded border border-line px-3 py-1 text-xs font-semibold text-ink-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded bg-ink px-3 py-1 text-xs font-semibold text-white"
              >
                Save base
              </button>
            </div>
          </form>
        )}

        {/* List of Base Cards (Screen 25) */}
        {filteredBases.map((b) => {
          const usedBy = usedByMap.get(b.id) || [];
          return (
            <div
              key={b.id}
              className="flex flex-col gap-1.5 rounded-[12px] border border-[#DDDBC0] bg-white p-3 shadow-xs hover:border-line-2 transition-colors"
            >
              {/* Header: Name + Kind Pill */}
              <div className="flex items-start justify-between gap-2">
                <span className="font-sans text-[14.5px] font-semibold text-ink leading-snug">
                  {b.name}
                </span>
                <span className="rounded-[5px] bg-[#E0EDE3] px-2 py-0.5 text-[11px] font-medium text-[#2E5F3E] whitespace-nowrap">
                  {b.kind}
                </span>
              </div>

              {/* Tags: Lead, Keeps, Batch */}
              <div className="flex flex-wrap gap-1.5 text-[11px] text-[#4F4B45]">
                <span className="rounded-[5px] bg-[#E7E6E1] px-2 py-0.5">
                  lead <b className="font-medium text-ink">{b.leadTime}</b>
                </span>
                <span className="rounded-[5px] bg-[#E7E6E1] px-2 py-0.5">
                  keeps <b className="font-medium text-ink">{b.keeps}</b>
                </span>
                <span className="rounded-[5px] bg-[#E7E6E1] px-2 py-0.5">
                  batch <b className="font-medium text-ink">{b.batchSize}</b>
                </span>
              </div>

              {/* Used by summary */}
              <div className="flex items-center justify-between text-[12px] text-[#6B675F] pt-0.5">
                <span>
                  {usedBy.length > 0 ? (
                    <>
                      Used by <b className="font-semibold text-ink">{usedBy.length} dishes</b>
                      {usedBy.length > 0 && ` — ${usedBy.slice(0, 3).join(', ')}${usedBy.length > 3 ? '…' : ''}`}
                    </>
                  ) : (
                    'Not currently used by any dishes'
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => requestDeleteBase(b)}
                  aria-label={`Delete ${b.name}`}
                  className="text-[11px] text-ink-3 hover:text-red cursor-pointer ml-2"
                >
                  Delete
                </button>
              </div>

              {/* Conflict banner if base is in use */}
              {deleteConflict?.base.id === b.id && (
                <div role="alert" className="mt-2 rounded-lg border border-[#E0A85B] bg-[#FFF9F0] p-2.5 text-xs text-ink space-y-1.5">
                  <div className="font-semibold text-[#8F5A0F]">
                    Cannot delete “{b.name}”: it is used by {usedBy.length} dish{usedBy.length === 1 ? '' : 'es'} ({usedBy.join(', ')}).
                  </div>
                  <div className="text-[11px] text-[#6B675F]">
                    Unlink this base from those recipes first, or clean up all references.
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setDeleteConflict(null)}
                      className="rounded border border-line bg-white px-2.5 py-1 text-[11px] font-semibold text-ink hover:bg-surface-2 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => executeDeleteBase(b, true)}
                      className="rounded bg-[#C43827] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#B02F20] cursor-pointer"
                    >
                      Clean up references &amp; delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
