import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SAMPLE_RECIPES } from '../data/recipes';
import { modeOf, readyOf, servesOf } from '../lib/inheritance';
import { useWeekStore } from '../store/useWeekStore';
import { Stepper } from '../components/ui';
import type { Group, RecipeItem, Slot, SlotCategory } from '../types';
import { ALL_CATEGORIES } from '../types';

interface DishPickerProps {
  group: Group;
  slot: Slot;
  household: number;
  onPick: (recipe: RecipeItem) => void;
  onClear: () => void;
  onUpdateServes: (serves: number) => void;
  onClose: () => void;
}

/**
 * N5 Dish Picker — A single bottom sheet covering all 9 original picker wireframes.
 * Absorbs 05, 06, 07, 10, 11, 14, 15, 16, 19.
 *
 * States and features:
 * - Opens on the slot's own category, with "All categories" and other categories available.
 * - Search across dish names, ingredients, notes, and bases.
 * - Dish cards with notes, cook minutes, and base tags.
 * - "travels so-so" warning badge, keyed strictly off the slot's EFFECTIVE pack mode (modeOf).
 * - Inline recipe expansion (Screen 07) showing ingredients, steps, and night-before prep without route changes.
 * - Editing a saved slot (Screen 19): "IN THIS SLOT NOW" block at the top with Clear button, and current dish marked below.
 * - Serves stepper in the header reading and writing effective serves.
 */
export default function DishPicker({
  group,
  slot,
  household,
  onPick,
  onClear,
  onUpdateServes,
  onClose,
}: DishPickerProps) {
  // 1. Initial category: opens on slot's own category if present, else 'All'
  const initialCategory = slot.category ?? 'All';
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const nav = useNavigate();
  const { state } = useWeekStore();
  const recipes = state.recipes && state.recipes.length > 0 ? state.recipes : SAMPLE_RECIPES;

  // 2. Track inline expanded recipe IDs (Screen 07)
  const [expandedRecipeIds, setExpandedRecipeIds] = useState<Record<string, boolean>>({});

  // 3. Current effective pack mode and ready time
  const effectiveMode = modeOf(group, slot);
  const isPacked = effectiveMode === 'pack';
  const ready = readyOf(group, slot);
  const effectiveServes = servesOf(group, slot, household);

  // 4. Currently saved dish in this slot (if editing a saved slot — Screen 19)
  const currentDish = useMemo(() => {
    if (!slot.dishId && !slot.dishName) return null;
    return recipes.find((r) => r.id === slot.dishId || r.name === slot.dishName) ?? {
      id: slot.dishId || 'custom',
      name: slot.dishName || 'Custom dish',
      category: slot.category ?? 'Quick & light',
      prepTime: '5 min',
      cookTime: `${slot.minutes} min`,
      cookMinutes: slot.minutes,
      base: slot.base,
      ingredients: [],
      steps: [],
      note: 'Saved in slot',
    } as RecipeItem;
  }, [recipes, slot.dishId, slot.dishName, slot.category, slot.minutes, slot.base]);

  // 5. Category counts for pill badges
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of recipes) {
      counts[r.category] = (counts[r.category] || 0) + 1;
    }
    return counts;
  }, [recipes]);

  // 6. Filter recipes by category and search query
  const filteredRecipes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return recipes.filter((r) => {
      // Category filter: when not actively searching, enforce selected category tab
      if (!q && selectedCategory !== 'All' && r.category !== selectedCategory) {
        return false;
      }
      // Search query across name, ingredients, note, base
      if (q) {
        const inName = r.name.toLowerCase().includes(q);
        const inNote = Boolean(r.note && r.note.toLowerCase().includes(q));
        const inBase = Boolean(r.base && r.base.toLowerCase().includes(q));
        const inIng = r.ingredients.some((ing) =>
          (typeof ing === 'string' ? ing : ing.name).toLowerCase().includes(q),
        );
        if (!inName && !inNote && !inBase && !inIng) return false;
      }
      return true;
    });
  }, [recipes, selectedCategory, searchQuery]);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedRecipeIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Pick a dish for ${slot.name}`}
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/45 backdrop-blur-[1px]"
      onClick={onClose}
    >
      {/* Bottom Sheet Container */}
      <div
        className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[20px] bg-bg shadow-2xl border-t border-line-2 transition-transform duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex-shrink-0 pt-2 pb-1">
          <div className="h-1 w-9 rounded-full bg-line-2 mx-auto" />
        </div>

        {/* Sheet Header */}
        <div className="border-b border-line px-4 pb-3 pt-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-[19px] font-bold tracking-tight text-ink leading-snug">
                {slot.name}
              </h2>
              <div className="mt-0.5 text-[12.5px] text-ink-2 truncate">
                {group.name} · {isPacked ? `pack by ${ready.time || '7:15'}` : `~${slot.time}`} · for {effectiveServes}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Serves stepper reading and writing effective serves */}
              <div className="flex items-center gap-1 rounded-lg border border-line bg-white px-2 py-1">
                <span className="text-[11px] font-semibold text-ink-2 mr-1">Serves</span>
                <Stepper
                  value={effectiveServes}
                  onChange={onUpdateServes}
                  min={1}
                  label="servings"
                />
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close picker"
                className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-white text-ink-2 hover:bg-surface-2"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Search Bar across dish names and ingredients */}
          <div className="mt-3">
            <label className="relative block">
              <span className="sr-only">Search dishes</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search every category or ingredient..."
                className="h-10 w-full rounded-xl border border-line-2 bg-white px-3 text-[13.5px] text-ink placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-green"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-xs text-ink-3 hover:text-ink"
                >
                  ✕
                </button>
              )}
            </label>
          </div>

          {/* Screen 19: "IN THIS SLOT NOW" block if slot already has a dish */}
          {currentDish && (
            <div className="mt-3 overflow-hidden rounded-xl border-2 border-green bg-white shadow-xs">
              <div className="flex items-center justify-between gap-2.5 px-3 py-2.5 bg-green-soft/40">
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-green">
                    IN THIS SLOT NOW
                  </div>
                  <div className="font-display text-[15px] font-bold text-ink leading-tight mt-0.5">
                    {currentDish.name}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                    {currentDish.base && (
                      <span className="rounded bg-green-soft px-1.5 py-0.5 font-semibold text-green text-[10px]">
                        {currentDish.base}
                      </span>
                    )}
                    <span className="rounded bg-surface-2 px-1.5 py-0.5 text-ink-2 text-[10px]">
                      {currentDish.cookTime || `${slot.minutes} min`}
                    </span>
                    {/* travels so-so warning keyed off effective pack mode */}
                    {isPacked && currentDish.travelsSoSo && (
                      <span className="rounded bg-amber-soft px-1.5 py-0.5 font-medium text-amber text-[10px]">
                        travels so-so
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClear}
                  className="rounded-lg border border-line-2 bg-white px-3 py-1.5 text-xs font-semibold text-ink-2 hover:bg-surface-2 hover:text-red flex-shrink-0"
                >
                  Clear
                </button>
              </div>

              {/* Inline expansion toggle for the currently saved dish */}
              {currentDish.ingredients.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => toggleExpand(currentDish.id, e)}
                  className="flex w-full items-center gap-1.5 border-t border-dashed border-line px-3 py-1.5 text-left text-[11.5px] font-semibold text-green hover:bg-surface-2/40"
                >
                  <span className="inline-block transition-transform duration-200" style={{ transform: expandedRecipeIds[currentDish.id] ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                    ▶
                  </span>
                  {expandedRecipeIds[currentDish.id] ? 'Hide recipe' : 'View recipe'} · {currentDish.ingredients.length} ingredients · scaled for {effectiveServes}
                </button>
              )}

              {/* Expanded details for current dish */}
              {expandedRecipeIds[currentDish.id] && currentDish.ingredients.length > 0 && (
                <div className="border-t border-line bg-surface-2/60 p-3 text-xs">
                  <div className="font-semibold uppercase tracking-wider text-ink-2 text-[10px]">
                    INGREDIENTS (for {effectiveServes})
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {currentDish.ingredients.map((ing, idx) => (
                      <span key={idx} className="rounded bg-white border border-line px-2 py-0.5 text-ink">
                        {typeof ing === 'string' ? ing : ing.name}
                      </span>
                    ))}
                  </div>

                  {currentDish.steps.length > 0 && (
                    <>
                      <div className="mt-2.5 font-semibold uppercase tracking-wider text-ink-2 text-[10px]">
                        METHOD
                      </div>
                      <ol className="mt-1 list-decimal pl-4 space-y-1 text-ink-2 leading-relaxed">
                        {currentDish.steps.map((step, idx) => (
                          <li key={idx}>{step}</li>
                        ))}
                      </ol>
                    </>
                  )}

                  {currentDish.nightBeforePrep && (
                    <div className="mt-2 text-[11.5px] text-ink-2">
                      <b className="text-ink">Night before:</b> {currentDish.nightBeforePrep}
                    </div>
                  )}

                  <div className="mt-2.5 pt-2 border-t border-line flex justify-end">
                    <button
                      type="button"
                      onClick={() => nav(`/recipes/${currentDish.id}`)}
                      className="rounded-lg border border-line-2 bg-white px-2.5 py-1 text-xs font-semibold text-ink hover:bg-surface-2 cursor-pointer flex items-center gap-1"
                    >
                      Edit recipe ✎
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Categories Pill Bar */}
          <div className="mt-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink-2 mb-1.5">
              CATEGORIES {slot.category ? `(OPENS ON ${slot.category.toUpperCase()})` : ''}
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
              <button
                type="button"
                onClick={() => setSelectedCategory('All')}
                className={`min-h-[32px] rounded-full px-3 py-1 font-medium whitespace-nowrap border transition-all ${
                  selectedCategory === 'All'
                    ? 'border-ink bg-ink text-white font-semibold'
                    : 'border-line-2 bg-white text-ink hover:bg-surface-2'
                }`}
              >
                All categories <span className="opacity-60">{SAMPLE_RECIPES.length}</span>
              </button>

              {ALL_CATEGORIES.map((cat) => {
                const count = categoryCounts[cat] || 0;
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`min-h-[32px] rounded-full px-3 py-1 font-medium whitespace-nowrap border transition-all ${
                      isSelected
                        ? 'border-ink bg-ink text-white font-semibold'
                        : 'border-line-2 bg-white text-ink hover:bg-surface-2'
                    }`}
                  >
                    {cat} <span className={isSelected ? 'opacity-70' : 'text-ink-3'}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recipe List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
          {currentDish && (
            <div className="text-xs text-ink-2 font-medium">
              Tap any dish below to swap it in:
            </div>
          )}

          {filteredRecipes.length === 0 ? (
            <div className="py-8 text-center text-sm text-ink-2">
              No dishes found matching your search. Try another category or query.
            </div>
          ) : (
            filteredRecipes.map((recipe) => {
              const isCurrent = slot.dishId === recipe.id || slot.dishName === recipe.name;
              const isExpanded = Boolean(expandedRecipeIds[recipe.id]);

              return (
                <div
                  key={recipe.id}
                  className={`overflow-hidden rounded-xl border transition-all ${
                    isCurrent
                      ? 'border-green bg-green-soft/30 shadow-xs'
                      : 'border-line bg-white hover:border-ink-2'
                  }`}
                >
                  {/* Dish Card Header — Clicking picks this dish */}
                  <div
                    onClick={() => onPick(recipe)}
                    className="cursor-pointer p-3 flex flex-col gap-1"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-display text-[15px] font-bold text-ink leading-snug">
                          {recipe.name}
                        </div>
                        {recipe.note && (
                          <div className="text-[12.5px] text-ink-2 mt-0.5 line-clamp-2">
                            {recipe.note}
                          </div>
                        )}
                      </div>

                      {/* Pick indicator or checkmark */}
                      {isCurrent ? (
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-green text-white text-xs font-bold flex-shrink-0">
                          ✓
                        </span>
                      ) : (
                        <span className="rounded-lg border border-line-2 bg-surface-2 px-2 py-1 text-[11px] font-semibold text-ink hover:bg-ink hover:text-white flex-shrink-0">
                          Pick
                        </span>
                      )}
                    </div>

                    {/* Metadata Chips: cook minutes, base tag, travels so-so warning */}
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                      {recipe.base && (
                        <span className="rounded bg-green-soft px-1.5 py-0.5 text-[10.5px] font-semibold text-green">
                          {recipe.base}
                        </span>
                      )}
                      <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10.5px] text-ink-2">
                        {recipe.cookTime}
                      </span>
                      {recipe.twoWaySynergy && (
                        <span className="rounded bg-amber-soft px-1.5 py-0.5 text-[10.5px] font-medium text-amber">
                          shared prep
                        </span>
                      )}
                      {/* travels so-so warning: ONLY shown when slot's effective mode is 'pack' */}
                      {isPacked && recipe.travelsSoSo && (
                        <span className="rounded bg-amber-soft px-1.5 py-0.5 text-[10.5px] font-medium text-amber">
                          travels so-so
                        </span>
                      )}
                      {isCurrent && (
                        <span className="text-[11px] font-semibold text-green ml-auto">
                          In this slot now
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Inline Recipe Expansion Toggle Button (Wireframe 07) */}
                  <button
                    type="button"
                    onClick={(e) => toggleExpand(recipe.id, e)}
                    className="flex w-full items-center gap-1.5 border-t border-dashed border-line px-3 py-1.5 text-left text-[12px] font-semibold text-green hover:bg-surface-2/50"
                  >
                    <span
                      className="inline-block transition-transform duration-200"
                      style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                    >
                      ▶
                    </span>
                    {isExpanded ? 'Hide recipe' : 'Recipe'} · {recipe.ingredients.length} ingredients
                  </button>

                  {/* Inline Expanded Content (Wireframe 07) — strictly inline, no separate route */}
                  {isExpanded && (
                    <div className="border-t border-line bg-surface-2/50 p-3 text-xs">
                      {/* Ingredients */}
                      <div className="font-semibold uppercase tracking-wider text-ink-2 text-[10px]">
                        INGREDIENTS
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {recipe.ingredients.map((ing, idx) => (
                          <span key={idx} className="rounded bg-white border border-line px-2 py-0.5 text-ink text-[11.5px]">
                            {typeof ing === 'string' ? ing : ing.name}
                          </span>
                        ))}
                      </div>

                      {/* Method / Steps */}
                      {recipe.steps.length > 0 && (
                        <>
                          <div className="mt-2.5 font-semibold uppercase tracking-wider text-ink-2 text-[10px]">
                            METHOD
                          </div>
                          <ol className="mt-1 list-decimal pl-4 space-y-1 text-ink-2 text-[12px] leading-relaxed">
                            {recipe.steps.map((step, idx) => (
                              <li key={idx}>{step}</li>
                            ))}
                          </ol>
                        </>
                      )}

                      {/* Night before prep */}
                      {recipe.nightBeforePrep && (
                        <div className="mt-2.5 rounded-lg border border-line bg-white p-2 text-[11.5px] text-ink-2">
                          <b className="text-ink font-semibold">Night before:</b> {recipe.nightBeforePrep}
                        </div>
                      )}

                      {/* Synergy note */}
                      {recipe.twoWaySynergy && (
                        <div className="mt-1.5 rounded-lg border border-green/30 bg-green-soft/40 p-2 text-[11.5px] text-green">
                          <b className="font-semibold">Synergy:</b> {recipe.twoWaySynergy}
                        </div>
                      )}

                      {/* Action button inside expansion */}
                      <div className="mt-3 pt-2 border-t border-line flex items-center justify-between">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            nav(`/recipes/${recipe.id}`);
                          }}
                          className="text-[12px] font-semibold text-ink-2 hover:text-ink cursor-pointer"
                        >
                          Edit recipe ✎
                        </button>
                        <button
                          type="button"
                          onClick={() => onPick(recipe)}
                          className="rounded-lg bg-green px-3 py-1.5 text-xs font-semibold text-white hover:bg-green/90"
                        >
                          Use this recipe
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
