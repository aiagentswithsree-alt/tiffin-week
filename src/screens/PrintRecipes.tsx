import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PrintSheet from '../components/PrintSheet';
import { useWeekStore } from '../store/useWeekStore';
import { weekDates } from '../lib/dates';
import { resolveDay } from '../lib/days';
import { SAMPLE_RECIPES } from '../data/recipes';
import type { PrintDefaults, RecipeItem } from '../types';

/** Collect every unique dish picked across the given offset week. */
const dishesThisWeek = (state: Parameters<typeof resolveDay>[0], offset: number, recipes: RecipeItem[]): RecipeItem[] => {
  const seen = new Set<string>();
  const out: RecipeItem[] = [];
  for (const d of weekDates(offset)) {
    const plan = resolveDay(state, d);
    for (const g of plan.groups) {
      for (const s of g.slots) {
        if (!s.dishId && !s.dishName) continue;
        const rec = recipes.find((r) => r.id === s.dishId || r.name.toLowerCase() === (s.dishName ?? '').toLowerCase());
        if (!rec) continue;
        if (seen.has(rec.id)) continue;
        seen.add(rec.id);
        out.push(rec);
      }
    }
  }
  return out;
};

/** N19 Recipe cards (wireframe 35). A5 portrait, one card per dish this week. */
export default function PrintRecipes() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { state } = useWeekStore();

  const paper = (params.get('paper') as PrintDefaults['paperSize']) ?? 'A5';
  const offset = Number(params.get('offset') ?? '0');
  const inkSaver = params.get('ink') === '1';

  const recipes = state.recipes && state.recipes.length > 0 ? state.recipes : SAMPLE_RECIPES;
  const cards = dishesThisWeek(state, offset, recipes);

  const toolbar = (
    <div className="flex items-center justify-between gap-2">
      <button type="button" onClick={() => nav('/print')} className="rounded-md px-2 py-1 text-[13px] text-ink-2 hover:bg-surface-2">← Print centre</button>
      <div className="text-[12px] text-ink-2">{paper} portrait · {cards.length} card{cards.length === 1 ? '' : 's'}</div>
      <button type="button" onClick={() => window.print()} className="rounded-md bg-ink px-3 py-1.5 text-[13px] font-semibold text-bg">Save as PDF</button>
    </div>
  );

  return (
    <PrintSheet paper={paper} orientation="portrait" inkSaver={inkSaver} title="Recipe cards" toolbar={toolbar}>
      {cards.length === 0 ? (
        <section>
          <h1 className="font-display text-[22px] font-bold">Recipe cards</h1>
          <p className="mt-2 text-[13px] text-ink-2">No dishes picked for this week yet.</p>
        </section>
      ) : (
        cards.map((r) => (
          <section key={r.id} data-recipe-id={r.id} className="recipe-card">
            <header className="border-b border-ink pb-1.5">
              <h1 className="font-display text-[20px] font-bold leading-tight">{r.name}</h1>
              <p className="text-[11px] text-ink-2">
                {r.category}
                {r.prepTime ? ` · prep ${r.prepTime}` : ''}
                {r.cookTime ? ` · cook ${r.cookTime}` : ''}
                {r.base ? ` · base: ${r.base}` : ''}
              </p>
            </header>

            <section className="mt-2">
              <h2 className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-2">Ingredients</h2>
              <ul className="mt-0.5 space-y-0.5 text-[11.5px]">
                {r.ingredients.map((ing, i) => (
                  <li key={i} className="flex gap-1.5">
                    <span className="w-16 shrink-0 font-mono">{ing.qty} {ing.unit}</span>
                    <span className="flex-1">
                      {ing.name}
                      {ing.estimated ? <span className="ml-1 text-ink-3">est.</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {r.steps.length > 0 ? (
              <section className="mt-2">
                <h2 className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-2">Method</h2>
                <ol className="mt-0.5 list-decimal space-y-0.5 pl-4 text-[11.5px]">
                  {r.steps.map((s, i) => <li key={i}>{s}</li>)}
                </ol>
              </section>
            ) : null}

            {r.nightBeforePrep ? (
              <section className="mt-2 border border-ink p-1.5">
                <div className="text-[10.5px] font-semibold uppercase tracking-wide">Night before</div>
                <div className="text-[11.5px]">{r.nightBeforePrep}</div>
              </section>
            ) : null}

            {r.note ? <p className="mt-2 text-[11px] italic text-ink-2">{r.note}</p> : null}
          </section>
        ))
      )}
    </PrintSheet>
  );
}
