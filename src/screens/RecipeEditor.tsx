import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWeekStore } from '../store/useWeekStore';
import { ALL_CATEGORIES, RecipeIngredient, Slot, SlotCategory } from '../types';
import { SAMPLE_RECIPES } from '../data/recipes';
import { DEFAULT_BASES } from '../data/bases';

const SHOP_SECTIONS = ['Veg', 'Pantry', 'Dairy', 'Fruit', 'Bakery', 'Other'] as const;

export default function RecipeEditor() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { state, update, save } = useWeekStore();

  const recipes = state.recipes && state.recipes.length > 0 ? state.recipes : SAMPLE_RECIPES;
  const bases = state.bases && state.bases.length > 0 ? state.bases : DEFAULT_BASES;

  const existingRecipe = recipes.find((r) => r.id === id) ?? SAMPLE_RECIPES[0];

  // Local state initialized from the persisted recipe
  const [name, setName] = useState(existingRecipe.name);
  const [category, setCategory] = useState<SlotCategory>(existingRecipe.category);
  const [serves, setServes] = useState<number>(existingRecipe.servesDefault || 3);
  const [cookMinutes, setCookMinutes] = useState<number>(existingRecipe.cookMinutes ?? 12);
  const [base, setBase] = useState<string | null>(existingRecipe.base ?? null);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(
    () =>
      existingRecipe.ingredients.map((ing) => ({
        name: typeof ing === 'string' ? ing : ing.name,
        qty: typeof ing === 'object' && ing !== null ? ing.qty : 50,
        unit: typeof ing === 'object' && ing !== null ? ing.unit : 'g',
        shopSection: typeof ing === 'object' && ing !== null ? ing.shopSection : 'Pantry',
        estimated: typeof ing === 'object' && ing !== null ? ing.estimated !== false : true,
      })),
  );
  const [steps, setSteps] = useState<string[]>(existingRecipe.steps || []);
  const [showBasePicker, setShowBasePicker] = useState(false);
  const [customBaseInput, setCustomBaseInput] = useState('');
  const [showMethod, setShowMethod] = useState(false);
  const [deleteConflict, setDeleteConflict] = useState<{ slotsCount: number; details: string[] } | null>(null);

  // Stepper rescales every ingredient amount proportionally
  const handleServesChange = (delta: number) => {
    const nextServes = Math.max(1, serves + delta);
    if (nextServes === serves) return;
    const ratio = nextServes / serves;

    setIngredients((prev) =>
      prev.map((ing) => ({
        ...ing,
        qty: Math.round(ing.qty * ratio * 10) / 10,
      })),
    );
    setServes(nextServes);
  };

  // Typing over an amount makes it real and removes the "est." tag
  const handleQtyChange = (index: number, newQtyVal: string) => {
    const val = parseFloat(newQtyVal);
    setIngredients((prev) =>
      prev.map((ing, i) => {
        if (i !== index) return ing;
        return {
          ...ing,
          qty: Number.isFinite(val) ? val : 0,
          estimated: false, // Typing over amount makes it real!
        };
      }),
    );
  };

  const handleUnitChange = (index: number, newUnit: string) => {
    setIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, unit: newUnit, estimated: false } : ing)),
    );
  };

  const handleSectionChange = (index: number, newSection: string) => {
    setIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, shopSection: newSection } : ing)),
    );
  };

  const handleNameChange = (index: number, newName: string) => {
    setIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, name: newName } : ing)),
    );
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddIngredient = () => {
    setIngredients((prev) => [
      ...prev,
      {
        name: '',
        qty: 50,
        unit: 'g',
        shopSection: 'Veg',
        estimated: false,
      },
    ]);
  };

  const handleSave = () => {
    update((draft) => {
      if (!draft.recipes || draft.recipes.length === 0) {
        draft.recipes = structuredClone(SAMPLE_RECIPES);
      }
      const idx = draft.recipes.findIndex((r) => r.id === existingRecipe.id);
      const updated: (typeof draft.recipes)[0] = {
        ...existingRecipe,
        name: name.trim() || existingRecipe.name,
        category,
        servesDefault: serves,
        cookMinutes,
        cookTime: `${cookMinutes} min`,
        base: base || null,
        ingredients,
        steps,
      };

      if (idx >= 0) {
        draft.recipes[idx] = updated;
      } else {
        draft.recipes.push(updated);
      }

      // Recipe is a LIBRARY item: editing it changes every day and routine that uses that dish
      const updateSlotWithRecipe = (s: Slot) => {
        if (s.dishId === existingRecipe.id || s.dishName === existingRecipe.name) {
          s.dishName = updated.name;
          s.minutes = updated.cookMinutes ?? s.minutes;
          s.base = updated.base ?? null;
          s.category = updated.category ?? s.category;
        }
      };

      for (const r of draft.routines) {
        for (const g of r.groups) {
          for (const s of g.slots) {
            updateSlotWithRecipe(s);
          }
        }
      }

      for (const inst of Object.values(draft.dayInstances)) {
        for (const g of inst.groups) {
          for (const s of g.slots) {
            updateSlotWithRecipe(s);
          }
        }
      }
    }, `Updated recipe “${name}”`);

    nav('/week');
  };

  const findSlotsWithRecipe = () => {
    const list: string[] = [];
    if (!id) return list;
    for (const r of state.routines) {
      for (const g of r.groups) {
        for (const s of g.slots) {
          if (s.dishId === id || s.dishName === name || (existingRecipe && s.dishName === existingRecipe.name)) {
            list.push(`${r.name} · ${s.name}`);
          }
        }
      }
    }
    for (const [dt, inst] of Object.entries(state.dayInstances)) {
      for (const g of inst.groups) {
        for (const s of g.slots) {
          if (s.dishId === id || s.dishName === name || (existingRecipe && s.dishName === existingRecipe.name)) {
            list.push(`${dt} · ${s.name}`);
          }
        }
      }
    }
    return list;
  };

  const handleRequestDelete = () => {
    const inSlots = findSlotsWithRecipe();
    if (inSlots.length > 0) {
      setDeleteConflict({ slotsCount: inSlots.length, details: inSlots });
      return;
    }
    executeDelete(false);
  };

  const executeDelete = (cleanSlots: boolean) => {
    update((draft) => {
      if (draft.recipes) {
        draft.recipes = draft.recipes.filter((r) => r.id !== id && r.name !== name);
      }
      if (cleanSlots) {
        for (const r of draft.routines) {
          for (const g of r.groups) {
            for (const s of g.slots) {
              if (s.dishId === id || s.dishName === name || (existingRecipe && s.dishName === existingRecipe.name)) {
                s.dishId = null;
                s.dishName = null;
              }
            }
          }
        }
        for (const inst of Object.values(draft.dayInstances)) {
          for (const g of inst.groups) {
            for (const s of g.slots) {
              if (s.dishId === id || s.dishName === name || (existingRecipe && s.dishName === existingRecipe.name)) {
                s.dishId = null;
                s.dishName = null;
              }
            }
          }
        }
      }
    }, `Deleted recipe “${name}”`);

    nav('/week');
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      nav(-1);
    } else {
      nav('/week');
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg text-ink">
      {/* Top Header — Screen 26 */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-line px-2 py-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleBack}
            aria-label="Back"
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
          <h1 className="font-display text-[20px] font-bold">Edit recipe</h1>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="min-h-[38px] rounded-[10px] bg-ink px-4 text-[14px] font-semibold text-bg hover:bg-ink/90 cursor-pointer shadow-xs"
        >
          Save
        </button>
      </div>

      {/* Scrollable Content Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {/* Dish Name */}
        <label className="flex flex-col gap-1 text-[12px] font-medium text-[#5F5B54]">
          Dish name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11 w-full rounded-[10px] border border-[#DDDBC0] bg-white px-3 font-sans text-[15px] text-ink focus:border-ink focus:outline-none"
          />
        </label>

        {/* Category Pill with Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium text-[#5F5B54]">Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as SlotCategory)}
            className="rounded-full bg-ink px-3 py-1 text-[12px] font-medium text-white cursor-pointer"
          >
            {ALL_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Serves Stepper Card */}
        <div className="flex items-center gap-2.5 rounded-[12px] border border-[#DDDBC0] bg-white p-3 shadow-xs">
          <div className="flex flex-1 flex-col">
            <span className="text-[13.5px] font-semibold text-ink">Serves</span>
            <span className="text-[12px] text-[#6B675F]">
              change it and every amount rescales
            </span>
          </div>
          <button
            type="button"
            aria-label="Fewer servings"
            onClick={() => handleServesChange(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#DDDBC0] bg-[#F1F0EC] text-[18px] font-medium hover:bg-surface-2 cursor-pointer"
          >
            −
          </button>
          <span className="w-7 text-center font-display text-[20px] font-bold tabular-nums">
            {serves}
          </span>
          <button
            type="button"
            aria-label="More servings"
            onClick={() => handleServesChange(1)}
            className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#DDDBC0] bg-[#F1F0EC] text-[18px] font-medium hover:bg-surface-2 cursor-pointer"
          >
            +
          </button>
        </div>

        {/* Estimate Explanation Banner (Wireframe 26) */}
        <div className="rounded-[9px] bg-[#F6EBD9] p-2.5 text-[12px] leading-relaxed text-[#6E4608]">
          <b className="font-semibold">est.</b> = pre-filled estimate for {serves}. Type over any
          amount to make it yours — the tag disappears.
        </div>

        {/* INGREDIENTS SECTION (Wireframe 26) */}
        <div className="rounded-[12px] border border-[#DDDBC0] bg-white shadow-xs overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#E7E6E1] bg-[#F7F6F2] px-3 py-2">
            <span className="text-[10.5px] font-semibold tracking-wider uppercase text-[#6B675F]">
              INGREDIENTS
            </span>
            <span className="text-[10.5px] font-semibold tracking-wider uppercase text-[#6B675F]">
              AMOUNT · SHOP SECTION
            </span>
          </div>

          <div className="divide-y divide-[#F0EFEA]">
            {ingredients.map((ing, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-3 py-2 hover:bg-surface-2/30"
              >
                {/* Ingredient name input */}
                <input
                  type="text"
                  value={ing.name}
                  placeholder="Ingredient"
                  onChange={(e) => handleNameChange(idx, e.target.value)}
                  className="flex-1 min-w-0 bg-transparent text-[13.5px] text-ink focus:outline-none"
                />

                {/* Amount input */}
                <input
                  type="number"
                  aria-label={`${ing.name} amount`}
                  value={ing.qty || ''}
                  onChange={(e) => handleQtyChange(idx, e.target.value)}
                  className="w-16 rounded-[7px] border border-[#DDDBC0] bg-white px-2 py-1 text-right font-mono text-[13px] tabular-nums text-ink focus:border-ink focus:outline-none"
                />

                {/* Unit input/select */}
                <input
                  type="text"
                  aria-label={`${ing.name} unit`}
                  value={ing.unit}
                  onChange={(e) => handleUnitChange(idx, e.target.value)}
                  className="w-11 rounded-[7px] border border-[#DDDBC0] bg-white px-1.5 py-1 text-center font-mono text-[12px] text-ink focus:border-ink focus:outline-none"
                />

                {/* "est." tag or empty placeholder */}
                {ing.estimated ? (
                  <span className="rounded-[4px] bg-[#F6EBD9] px-1.5 py-0.5 text-[10px] font-semibold text-[#8F5A0F]">
                    est.
                  </span>
                ) : (
                  <span className="w-6" />
                )}

                {/* Shop section selector */}
                <select
                  value={ing.shopSection}
                  onChange={(e) => handleSectionChange(idx, e.target.value)}
                  className="w-16 bg-transparent text-right text-[11px] text-[#6B675F] cursor-pointer focus:outline-none"
                >
                  {SHOP_SECTIONS.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>

                {/* Remove ingredient */}
                <button
                  type="button"
                  aria-label={`Remove ${ing.name}`}
                  onClick={() => handleRemoveIngredient(idx)}
                  className="text-[14px] text-ink-3 hover:text-red px-1 cursor-pointer"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Add Ingredient Button */}
          <button
            type="button"
            onClick={handleAddIngredient}
            className="flex w-full items-center px-3 py-2.5 text-[13.5px] font-semibold text-[#8F5A0F] hover:bg-[#F6EBD9]/30 cursor-pointer"
          >
            + Add ingredient
          </button>
        </div>

        {/* MADE AHEAD — FEEDS THE PREP PLAN (Wireframe 26) */}
        <div className="flex flex-col gap-2 rounded-[12px] border border-[#DDDBC0] bg-white p-3 shadow-xs">
          <span className="text-[10.5px] font-semibold tracking-wider uppercase text-[#6B675F]">
            MADE AHEAD — FEEDS THE PREP PLAN
          </span>

          <div className="flex flex-wrap items-center gap-1.5">
            {base && (
              <span className="flex items-center gap-1.5 rounded-[8px] bg-[#E0EDE3] px-2.5 py-1 text-[12px] font-medium text-[#2E5F3E]">
                <span>{base}</span>
                <button
                  type="button"
                  aria-label="Unlink base"
                  onClick={() => setBase(null)}
                  className="text-[12px] font-bold hover:text-red cursor-pointer"
                >
                  ×
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={() => setShowBasePicker(!showBasePicker)}
              className="rounded-[8px] border-[1.5px] border-dashed border-[#9FC2AA] px-2.5 py-1 text-[12px] font-semibold text-[#2E5F3E] hover:bg-[#E0EDE3]/50 cursor-pointer"
            >
              + Link a base
            </button>
          </div>

          {/* Base selector dropdown */}
          {showBasePicker && (
            <div className="mt-1 rounded-lg border border-line bg-surface-2/60 p-2 space-y-2">
              <div className="text-[11px] font-semibold text-ink-2">Choose an existing base:</div>
              <div className="flex flex-wrap gap-1">
                {bases.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setBase(b.name);
                      setShowBasePicker(false);
                    }}
                    className={`rounded border px-2 py-1 text-[11px] font-medium cursor-pointer ${
                      base === b.name
                        ? 'border-green bg-green text-white'
                        : 'border-line-2 bg-white text-ink hover:bg-surface-2'
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>

              <div className="flex gap-1.5 pt-1">
                <input
                  type="text"
                  placeholder="Or custom base name"
                  value={customBaseInput}
                  onChange={(e) => setCustomBaseInput(e.target.value)}
                  className="flex-1 rounded border border-line bg-white px-2 py-1 text-[12px] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customBaseInput.trim()) {
                      setBase(customBaseInput.trim());
                      setCustomBaseInput('');
                      setShowBasePicker(false);
                    }
                  }}
                  className="rounded bg-ink px-2.5 py-1 text-[11.5px] font-semibold text-bg"
                >
                  Link
                </button>
              </div>
            </div>
          )}

          {/* Method and Morning Cook Time Footer */}
          <div className="flex items-center justify-between border-t border-[#F0EFEA] pt-2 text-[13px]">
            <button
              type="button"
              onClick={() => setShowMethod(!showMethod)}
              className="font-medium text-ink hover:text-green cursor-pointer"
            >
              Method · {steps.length} steps {showMethod ? '▲' : '▼'}
            </button>
            <label className="flex items-center gap-1 text-[#6B675F]">
              Morning cook time:
              <input
                type="number"
                min={0}
                value={cookMinutes}
                onChange={(e) => setCookMinutes(parseInt(e.target.value, 10) || 0)}
                className="w-12 rounded border border-line bg-white px-1 py-0.5 text-center font-bold text-ink font-mono text-[13px]"
              />
              <span className="font-semibold text-ink">min</span>
            </label>
          </div>

          {/* Expandable Method Steps */}
          {showMethod && (
            <div className="mt-2 space-y-1.5 border-t border-dashed border-line pt-2 text-xs">
              <ol className="list-decimal pl-4 space-y-1 text-ink-2">
                {steps.map((st, i) => (
                  <li key={i} className="leading-snug">
                    <input
                      type="text"
                      value={st}
                      onChange={(e) =>
                        setSteps((prev) =>
                          prev.map((s, idx) => (idx === i ? e.target.value : s)),
                        )
                      }
                      className="w-full bg-transparent border-b border-line/60 pb-0.5 text-ink focus:outline-none"
                    />
                  </li>
                ))}
              </ol>
              <button
                type="button"
                onClick={() => setSteps((prev) => [...prev, 'New step'])}
                className="font-semibold text-green text-[11.5px] mt-1"
              >
                + Add step
              </button>
            </div>
          )}
        </div>

        {/* Delete Recipe Section */}
        <div className="pt-2 border-t border-line space-y-2 pb-6">
          {deleteConflict ? (
            <div role="alert" className="rounded-lg border border-[#E0A85B] bg-[#FFF9F0] p-3 text-xs text-ink space-y-2">
              <div className="font-semibold text-[#8F5A0F]">
                Cannot delete “{name}”: this recipe is assigned to {deleteConflict.slotsCount} slot{deleteConflict.slotsCount === 1 ? '' : 's'} in your plan ({deleteConflict.details.slice(0, 3).join(', ')}{deleteConflict.details.length > 3 ? '…' : ''}).
              </div>
              <div className="text-[11.5px] text-[#6B675F]">
                Clear it from your slots first, or clean up all slot references automatically.
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDeleteConflict(null)}
                  className="rounded border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface-2 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => executeDelete(true)}
                  className="rounded bg-[#C43827] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#B02F20] cursor-pointer"
                >
                  Clean up slot references &amp; delete
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-[11.5px] text-ink-3">Remove this recipe from your library</span>
              <button
                type="button"
                onClick={handleRequestDelete}
                className="text-[12px] font-semibold text-ink-3 hover:text-red px-2 py-1 cursor-pointer"
              >
                Delete recipe
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
