import { nid } from './ids';
import type { AppState, DayOffset, EatMode, Group, Routine, Slot, SlotCategory } from '../types';

export const makeSlot = (
  name: string,
  time: string,
  category: SlotCategory | null = null,
  timeDay: DayOffset = 0,
  minutes = 0,
  base: string | null = null,
): Slot => ({
  id: nid(), name, time, timeDay, minutes, base,
  serves: null, category, mode: null, readyBy: null, readyByDay: null, done: false,
});

interface Starter {
  mode: EatMode;
  packBy: string | null;
  packByDay: DayOffset;
  slots: Slot[];
}

/**
 * Starting points, not a fixed taxonomy. Every one of these can be renamed,
 * deleted, or built from scratch — a couple deletes School, a homemaker deletes
 * Office, a shift worker keeps only Night shift.
 */
export const STARTERS: Record<string, Starter> = {
  'Custom group': { mode: 'eat', packBy: null, packByDay: 0, slots: [] },
  Home: {
    mode: 'eat', packBy: null, packByDay: 0,
    slots: [
      makeSlot('Breakfast', '07:30', 'Rotis & dosas', 0, 18, 'one batter'),
      makeSlot('Snack', '16:30', 'Crispy & fried', 0, 12),
      makeSlot('Dinner', '20:00', 'Cooked & rice', 0, 20, 'one pot of rice'),
      makeSlot('Beverage', '20:00', 'Drinks', 0, 5),
    ],
  },
  School: {
    mode: 'pack', packBy: '07:15', packByDay: 0,
    slots: [
      makeSlot('1st short break', '10:30', 'Quick & light', 0, 1),
      makeSlot('Lunch', '12:45', 'Cooked & rice', 0, 12, 'one pot of rice'),
      makeSlot('2nd short break', '15:00', 'Dry snacks & jars', 0, 20),
    ],
  },
  Office: {
    mode: 'pack', packBy: '07:15', packByDay: 0,
    slots: [
      makeSlot('Breakfast box', '09:00', 'Steamed', 0, 15, 'one batter'),
      makeSlot('Lunch box', '13:00', 'Cooked & rice', 0, 12, 'one pot of rice'),
    ],
  },
  'Night shift': {
    mode: 'pack', packBy: '17:30', packByDay: 0,
    slots: [
      makeSlot('Shift dinner', '19:00', 'Cooked & rice', 0, 20),
      // Eaten after midnight, packed the evening before — the two offsets differ.
      makeSlot('Shift lunch', '00:30', 'Quick & light', 1, 5),
    ],
  },
};

export const STARTER_NAMES = Object.keys(STARTERS);

export const makeGroup = (starter: string, name?: string): Group => {
  const s = STARTERS[starter] ?? STARTERS['Custom group'];
  return {
    id: nid(),
    name: name || starter,
    mode: s.mode,
    serves: null,
    status: 'confirmed',
    tentativeDays: [],
    shop: true,
    packBy: s.packBy,
    packByDay: s.packByDay,
    slots: s.slots.map((x) => ({ ...x, id: nid() })),
  };
};

export const makeRoutine = (name: string, days: number[] = [], groups: Group[] = []): Routine => ({
  id: nid(), name, mode: 'weekly', days, date: '', groups,
});

/** Onboarding options. Phrased as needs, not as household identities. */
export const ONBOARDING = [
  { key: 'Home', title: 'Home meals', detail: 'Breakfast, snack, dinner — eaten at home.' },
  { key: 'School', title: 'School lunchboxes', detail: 'Boxes packed in the morning and carried out.' },
  { key: 'Office', title: 'Office meals', detail: 'Breakfast and lunch boxes packed before leaving.' },
  { key: 'Night shift', title: 'Shift work', detail: 'Meals timed around a shift, crossing midnight.' },
] as const;

export const seedState = (keys: string[], household = 3): AppState => {
  const weekday = makeRoutine('Regular', [0, 1, 2, 3, 4]);
  keys.filter((k) => k !== 'Home').forEach((k) => weekday.groups.push(makeGroup(k)));
  if (keys.includes('Home') || weekday.groups.length === 0) weekday.groups.push(makeGroup('Home'));

  const weekend = makeRoutine('Weekend', [5, 6], [makeGroup('Home', 'Full day at home')]);

  return { household, routines: [weekday, weekend], dayInstances: {} };
};

export const emptyState = (): AppState => ({ household: 3, routines: [], dayInstances: {} });
