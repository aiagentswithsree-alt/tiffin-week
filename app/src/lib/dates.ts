/** Week 1 of the planner. Monday 21 September 2026. */
export const BASE_WEEK = new Date(2026, 8, 21);

export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] as const;

export const addDays = (d: Date, n: number): Date => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const iso = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** 0 = Monday, so it lines up with Routine.days and Group.tentativeDays. */
export const weekdayOf = (d: Date): number => (d.getDay() + 6) % 7;

export const weekStart = (offset: number): Date => addDays(BASE_WEEK, offset * 7);

export const weekDates = (offset: number): Date[] =>
  Array.from({ length: 7 }, (_, i) => addDays(weekStart(offset), i));

/** Minutes from midnight. Returns null for an empty time. */
export const toMinutes = (t: string | null | undefined): number | null => {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
};

/** Formats minutes that may fall before midnight (a start time the night before). */
export const fromMinutes = (m: number): string => {
  let back = 0;
  let v = m;
  while (v < 0) { v += 1440; back--; }
  const h = Math.floor(v / 60) % 24;
  return `${String(h).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}${back < 0 ? ' (prev day)' : ''}`;
};

export const dayOffsetLabel = (d: number): string => (d ? ' (next day)' : '');

/** "7 h 20 min", "45 min", "0 min". */
export const humanSpan = (mins: number): string => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return [h ? `${h} h` : '', m ? `${m} min` : ''].filter(Boolean).join(' ') || '0 min';
};
