import { toMinutes } from './dates';
import { readyOf, servesOf } from './inheritance';
import type { CookPlan, CookTask, Group } from '../types';

/**
 * Build the morning's cook order.
 *
 * MVP rules, decided deliberately:
 *
 *  1. ONE STOVE, SEQUENTIAL. Tasks never overlap. Burner capacity and
 *     attended-vs-unattended time are a later refinement; until then the printed
 *     start time is conservative rather than optimistic.
 *
 *  2. ACROSS EVERY INCLUDED GROUP. The original wireframes computed per place,
 *     which is how the fridge card came to print a School-only start time on a
 *     day that also packed two office boxes — 52 minutes of work shown as 33.
 *
 *  3. SHARED PREP IS MADE ONCE. Slots that name the same `base` ("one pot of
 *     rice") collapse into a single task: duration is the longest of them, not
 *     the sum, and servings add up into one bigger batch.
 *
 *  4. ONLY CONFIRMED GROUPS. Tentative means "might not happen" — its
 *     ingredients may be bought, but it is never scheduled to cook.
 *
 * Scheduling runs backwards from the latest deadline so each task finishes by
 * its own deadline, and the earliest start is what the cook needs to know.
 */
export const cookPlan = (groups: Group[], household: number): CookPlan => {
  const raw: Omit<CookTask, 'start' | 'end'>[] = [];

  for (const g of groups) {
    if ((g.status ?? 'confirmed') !== 'confirmed') continue;
    for (const s of g.slots) {
      const mins = Number(s.minutes) || 0;
      if (mins <= 0) continue;
      const ready = readyOf(g, s);
      const at = toMinutes(ready.time);
      if (at === null) continue;
      raw.push({
        name: s.name,
        mins,
        base: s.base || null,
        group: g.name,
        serves: servesOf(g, s, household),
        deadline: ready.day * 1440 + at,
        from: [`${g.name} · ${s.name}`],
      });
    }
  }

  const byBase = new Map<string, CookTask>();
  const merged: Omit<CookTask, 'start' | 'end'>[] = [];

  for (const t of raw) {
    if (!t.base) { merged.push({ ...t }); continue; }
    const existing = byBase.get(t.base) as (Omit<CookTask, 'start' | 'end'> | undefined);
    if (!existing) {
      const node = { ...t, name: t.base, shared: true } as CookTask;
      byBase.set(t.base, node);
      merged.push(node);
    } else {
      existing.mins = Math.max(existing.mins, t.mins); // made once
      existing.serves += t.serves;                     // bigger batch
      existing.deadline = Math.min(existing.deadline, t.deadline);
      existing.from.push(...t.from);
    }
  }

  merged.sort((a, b) => b.deadline - a.deadline);

  let cursor = Number.POSITIVE_INFINITY;
  const scheduled: CookTask[] = [];
  for (const t of merged) {
    const end = Math.min(t.deadline, cursor);
    const start = end - t.mins;
    scheduled.push({ ...t, start, end } as CookTask);
    cursor = start;
  }
  scheduled.reverse();

  return {
    tasks: scheduled,
    total: merged.reduce((a, t) => a + t.mins, 0),
    naive: raw.reduce((a, t) => a + t.mins, 0),
    start: scheduled.length ? scheduled[0].start : null,
  };
};

/** Servings split by what the shopping list should buy versus what is committed. */
export interface DayTotals {
  confirmed: number;
  tentative: number;
  tentativeShopped: number;
  shopping: number;
}

export const dayTotals = (groups: Group[], household: number): DayTotals => {
  let confirmed = 0;
  let tentative = 0;
  let tentativeShopped = 0;

  for (const g of groups) {
    const status = g.status ?? 'confirmed';
    if (status === 'skipped') continue;
    for (const s of g.slots) {
      const n = servesOf(g, s, household);
      if (status === 'tentative') {
        tentative += n;
        if (g.shop) tentativeShopped += n;
      } else {
        confirmed += n;
      }
    }
  }
  return { confirmed, tentative, tentativeShopped, shopping: confirmed + tentativeShopped };
};
