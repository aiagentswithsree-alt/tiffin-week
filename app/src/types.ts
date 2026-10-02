/**
 * Tiffin Week — domain model.
 *
 * A day does not have hardcoded places. It has a ROUTINE; a routine has GROUPS
 * (School, Office, Home, Night shift, anything the household invents); a group
 * has SLOTS (the meals and breaks). Everything below is driven by that.
 *
 * Inheritance chain, in order of precedence:
 *   serves    slot.serves  →  group.serves  →  household.people
 *   mode      slot.mode    →  group.mode
 *   readyBy   slot.readyBy →  group.packBy (packed) or slot.time (eaten here)
 *   category  slot.category →  "All recipes"
 *
 * `null` always means "inherit"; it never means "empty".
 */

export type SlotCategory =
  | 'Quick & light'
  | 'Cooked & rice'
  | 'Rotis & dosas'
  | 'Steamed'
  | 'Dry snacks & jars'
  | 'Crispy & fried'
  | 'Drinks'
  | 'Salads';

export const ALL_CATEGORIES: SlotCategory[] = [
  'Quick & light', 'Cooked & rice', 'Rotis & dosas', 'Steamed',
  'Dry snacks & jars', 'Crispy & fried', 'Drinks', 'Salads',
];

/** How a meal is consumed. Packed meals get a deadline and travel warnings. */
export type EatMode = 'eat' | 'pack';

/**
 * Attendance. `tentative` means "might not happen" — it is kept out of the cook
 * schedule entirely. Shopping inclusion is a SEPARATE flag (`shop`), because
 * buying ingredients for a maybe-meal must never commit you to cooking it.
 */
export type Attendance = 'confirmed' | 'tentative' | 'skipped';

/** 0 = same day, 1 = the next day. Meal time and deadline carry these separately,
 *  so a Monday shift can eat at 00:30 Tuesday from a box packed 17:30 Monday. */
export type DayOffset = 0 | 1;

export interface Slot {
  id: string;
  name: string;
  /** When it is eaten. */
  time: string;
  timeDay: DayOffset;
  /** Stove minutes. Stands in for the dish until one is picked. */
  minutes: number;
  /** Shared prep key. Slots sharing one are cooked ONCE in a combined batch. */
  base: string | null;
  serves: number | null;
  category: SlotCategory | null;
  mode: EatMode | null;
  readyBy: string | null;
  readyByDay: DayOffset | null;
  /** Reset whenever a week is copied forward. */
  done: boolean;
}

export interface Group {
  id: string;
  name: string;
  mode: EatMode;
  serves: number | null;
  /** Routine-level default attendance. */
  status: Attendance;
  /** Weekdays (0 = Mon) that are tentative even when `status` is confirmed —
   *  this is how "confirmed Mon–Wed, tentative Fri" is expressed. */
  tentativeDays: number[];
  /** Whether this group's ingredients reach the shopping list. */
  shop: boolean;
  packBy: string | null;
  packByDay: DayOffset;
  slots: Slot[];
}

export type RoutineMode = 'weekly' | 'date';

export interface Routine {
  id: string;
  name: string;
  mode: RoutineMode;
  /** Weekday indices, 0 = Mon. Used when mode is 'weekly'. */
  days: number[];
  /** ISO date. Used when mode is 'date'. A dated routine beats a weekly one. */
  date: string;
  groups: Group[];
}

/** A day the user has edited. Stored per ISO date; editing one never touches
 *  the routine it came from, nor any other day using that routine. */
export interface DayInstance {
  /** null when the day was built from scratch rather than from a routine. */
  routineId: string | null;
  groups: Group[];
}

export interface AppState {
  household: number;
  routines: Routine[];
  dayInstances: Record<string, DayInstance>;
}

/** What a date resolves to — either a stored instance or a fresh projection. */
export interface ResolvedDay {
  instance: boolean;
  routineId: string | null;
  routineName: string | null;
  groups: Group[];
}

export type ConflictKind = 'weekday' | 'date';

export interface Conflict {
  kind: ConflictKind;
  /** Weekday index, or ISO date. */
  key: number | string;
  label: string;
  /** Indices into `routines`. Always length 2 or more. */
  who: number[];
}

export interface CookTask {
  name: string;
  mins: number;
  base: string | null;
  group: string;
  serves: number;
  /** Minutes from midnight, may exceed 1440 for next-day deadlines. */
  deadline: number;
  /** Which meals this one task covers — more than one when prep is shared. */
  from: string[];
  shared?: boolean;
  start: number;
  end: number;
}

export interface CookPlan {
  tasks: CookTask[];
  /** Total stove minutes after shared prep is merged. */
  total: number;
  /** Naive sum before merging — the difference is what sharing saved. */
  naive: number;
  start: number | null;
}

/** A dish in the library the picker draws from. */
export interface RecipeItem {
  id: string;
  name: string;
  category: SlotCategory;
  prepTime: string;
  cookTime: string;
  ingredients: string[];
  steps: string[];
  nightBeforePrep?: string;
  /** "Cook extra rice for the office lunch box" — the shared-prep hint. */
  twoWaySynergy?: string;
}
