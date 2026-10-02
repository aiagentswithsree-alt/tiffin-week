import { DAY_NAMES, addDays, iso, weekDates, weekdayOf } from './dates';
import { makeGroup } from './model';
import type { AppState, Attendance, Conflict, DayInstance, Group, ResolvedDay, Routine } from '../types';

const clone = <T,>(v: T): T => structuredClone(v);

/** Which routine governs a date. A dated routine always beats a weekday one. */
export const routineForDate = (routines: Routine[], d: Date): Routine | null => {
  const key = iso(d);
  const wd = weekdayOf(d);
  return (
    routines.find((r) => r.mode === 'date' && r.date === key) ??
    routines.find((r) => r.mode === 'weekly' && r.days.includes(wd)) ??
    null
  );
};

/**
 * A group's attendance on a given weekday. The per-weekday list is what makes
 * "confirmed Mon–Wed, tentative Fri" expressible without a second group.
 */
export const defaultStatus = (g: Group, weekday: number): Attendance =>
  (g.tentativeDays ?? []).includes(weekday) ? 'tentative' : (g.status ?? 'confirmed');

/**
 * What a date currently plans. Returns a stored instance when the day has been
 * edited, otherwise a fresh projection of its routine. Projections are never
 * stored, which is what keeps templates and days independent.
 */
export const resolveDay = (state: AppState, d: Date): ResolvedDay => {
  const key = iso(d);
  const inst = state.dayInstances[key];

  if (inst) {
    const r = state.routines.find((x) => x.id === inst.routineId);
    return {
      instance: true,
      routineId: inst.routineId,
      routineName: r ? r.name : inst.routineId ? 'Deleted routine' : 'Built for this day',
      groups: inst.groups,
    };
  }

  const routine = routineForDate(state.routines, d);
  if (!routine) return { instance: false, routineId: null, routineName: null, groups: [] };

  const wd = weekdayOf(d);
  const groups = clone(routine.groups).map((g) => {
    const status = defaultStatus(g, wd);
    // A day that is tentative by default starts out of the shopping list.
    return { ...g, status, shop: status === 'confirmed' };
  });
  return { instance: false, routineId: routine.id, routineName: routine.name, groups };
};

/** Materialise an instance so an edit lands on the day, never on the template. */
export const materialise = (state: AppState, d: Date): DayInstance | null => {
  const key = iso(d);
  if (!state.dayInstances[key]) {
    const plan = resolveDay(state, d);
    if (!plan.routineId && plan.groups.length === 0) return null;
    state.dayInstances[key] = { routineId: plan.routineId, groups: clone(plan.groups) };
  }
  return state.dayInstances[key];
};

export interface CopyPreview {
  planned: number;
  clashes: number;
}

export const copyWeekPreview = (state: AppState, offset: number): CopyPreview => {
  const src = weekDates(offset);
  return {
    planned: src.filter((d) => resolveDay(state, d).groups.length > 0).length,
    clashes: src.map((d) => addDays(d, 7)).filter((d) => state.dayInstances[iso(d)]).length,
  };
};

/**
 * Copy a planned week seven days forward.
 *
 * Carries meals, servings, group and slot overrides, attendance and overnight
 * offsets into INDEPENDENT day instances. Resets done marks. Never touches a
 * routine template or a recurring assignment rule.
 */
export const copyWeekForward = (state: AppState, offset: number): void => {
  for (const d of weekDates(offset)) {
    const plan = resolveDay(state, d);
    if (plan.groups.length === 0) continue;
    const groups = clone(plan.groups);
    for (const g of groups) for (const s of g.slots) s.done = false;
    state.dayInstances[iso(addDays(d, 7))] = { routineId: plan.routineId, groups };
  }
};

export const buildDayFromRoutine = (state: AppState, dateKey: string, routine: Routine, weekday: number): void => {
  state.dayInstances[dateKey] = {
    routineId: routine.id,
    groups: clone(routine.groups).map((g) => {
      const status = defaultStatus(g, weekday);
      return { ...g, status, shop: status === 'confirmed' };
    }),
  };
};

export const buildDayFromScratch = (state: AppState, dateKey: string): void => {
  state.dayInstances[dateKey] = { routineId: null, groups: [makeGroup('Home')] };
};

/** Detects both weekday and dated contests, and reports every competitor. */
export const findConflicts = (routines: Routine[]): Conflict[] => {
  const out: Conflict[] = [];
  const weekly: Record<number, number[]> = {};
  const dated: Record<string, number[]> = {};

  routines.forEach((r, i) => {
    if (r.mode === 'weekly') r.days.forEach((d) => (weekly[d] ??= []).push(i));
    else if (r.date) (dated[r.date] ??= []).push(i);
  });

  Object.entries(weekly).forEach(([d, who]) => {
    if (who.length > 1) out.push({ kind: 'weekday', key: Number(d), label: DAY_NAMES[Number(d)], who });
  });
  Object.entries(dated).forEach(([k, who]) => {
    if (who.length > 1) out.push({ kind: 'date', key: k, label: k, who });
  });
  return out;
};

/** Hands the contested day to one routine and clears it from every other. */
export const resolveConflict = (routines: Routine[], c: Conflict, keep: number): void => {
  c.who.filter((i) => i !== keep).forEach((i) => {
    if (c.kind === 'weekday') routines[i].days = routines[i].days.filter((x) => x !== c.key);
    else routines[i].date = '';
  });
};
