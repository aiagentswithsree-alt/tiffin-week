import { dayOffsetLabel, humanSpan, toMinutes } from './dates';
import type { DayOffset, EatMode, Group, Slot, SlotCategory } from '../types';

/** Resolved readiness: when the meal must actually be finished, and on which day. */
export interface Ready {
  time: string;
  day: DayOffset;
}

export const modeOf = (g: Group, s: Slot): EatMode => s.mode ?? g.mode;

export const servesOf = (g: Group, s: Slot, household: number): number =>
  s.serves ?? g.serves ?? household;

export const categoryOf = (s: Slot): SlotCategory | 'All recipes' => s.category ?? 'All recipes';

/**
 * A packed meal is ready by the group's pack-by deadline; a meal eaten here is
 * ready at the moment it is eaten. Either can be overridden on the slot, and the
 * day offset is inherited separately from the time.
 */
export const readyOf = (g: Group, s: Slot): Ready => {
  if (modeOf(g, s) === 'pack') {
    return { time: s.readyBy ?? g.packBy ?? '', day: s.readyByDay ?? g.packByDay ?? 0 };
  }
  return { time: s.readyBy ?? s.time ?? '', day: s.readyByDay ?? s.timeDay ?? 0 };
};

/**
 * How far ahead of eating the food must be finished. Day offsets are applied to
 * both ends, so an overnight shift produces a positive lead rather than a
 * nonsensical negative one.
 */
export const leadMinutes = (g: Group, s: Slot): number | null => {
  const ready = readyOf(g, s);
  const eaten = toMinutes(s.time);
  const done = toMinutes(ready.time);
  if (eaten === null || done === null) return null;
  return (s.timeDay * 1440 + eaten) - (ready.day * 1440 + done);
};

export interface LeadText {
  text: string;
  bad: boolean;
}

export const leadText = (g: Group, s: Slot): LeadText => {
  const packed = modeOf(g, s) === 'pack';
  const ready = readyOf(g, s);
  const lead = leadMinutes(g, s);

  if (!s.time) return { text: 'Set a time to see the schedule.', bad: false };
  if (!packed) return { text: `On the table at ${s.time}${dayOffsetLabel(s.timeDay)}.`, bad: false };
  if (!ready.time) return { text: 'Packed meal with no deadline set yet.', bad: false };
  if (lead === null) return { text: '', bad: false };
  if (lead < 0) {
    return {
      text: `Deadline ${ready.time}${dayOffsetLabel(ready.day)} falls after the meal at ` +
            `${s.time}${dayOffsetLabel(s.timeDay)}. Check the day offsets.`,
      bad: true,
    };
  }
  return {
    text: `Eaten ${s.time}${dayOffsetLabel(s.timeDay)}, packed by ${ready.time}` +
          `${dayOffsetLabel(ready.day)} — ${humanSpan(lead)} ahead.`,
    bad: false,
  };
};

/**
 * Servings must be whole and at least one. Returns null for "inherit" (empty
 * input) and undefined for invalid, so a caller can tell the two apart and
 * refuse to commit the invalid case.
 */
export const parseServes = (raw: string): number | null | undefined => {
  const t = raw.trim();
  if (t === '') return null;
  const n = Number(t);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return undefined;
  return n;
};
