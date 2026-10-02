# Tiffin Week

Weekly meal and tiffin planner. Routines → groups → slots → picked dishes →
shopping list, prep plan and printable sheets.

Read `BUILD-ORDER.md` for what to build next and in what order.

## Stack — settled, do not change

React 19 + TypeScript + Vite + Tailwind v4, routed with react-router.
**Web app, not React Native.** Ships as an installable PWA; Capacitor can wrap
this build later if the app stores are ever needed.

Don't propose React Native again without revisiting these:

- 6 of the 36 original screens are A4/A5 print layouts — CSS on the web,
  nonexistent in RN (`expo-print` takes an HTML string, so you'd write them as
  web HTML anyway).
- No native requirements anywhere: no camera, GPS, Bluetooth or background work.
- Dev machine is Windows/WSL2 — no Mac, so no local iOS builds.

## The domain model — this is the part that matters

**A day has no hardcoded places.** It has a ROUTINE; a routine has GROUPS
(School, Office, Home, Night shift, or anything a household invents); a group has
SLOTS. Everything derives from that. A couple deletes School. A homemaker deletes
Office. A shift worker keeps only Night shift.

```
Week → Day → Routine → Group[] → Slot[] → Dish
```

Inheritance, in precedence order. `null` always means *inherit*, never *empty*:

| Value | Chain |
|---|---|
| serves | `slot.serves` → `group.serves` → `household.people` |
| mode | `slot.mode` → `group.mode` (`eat` \| `pack`) |
| readyBy | `slot.readyBy` → `group.packBy` (packed) or `slot.time` (eaten here) |
| category | `slot.category` → `"All recipes"` |

### Picked-dish shape on Slot

When a dish from the library (`RecipeItem`) is picked into a slot:
- `slot.dishId`: ID of the chosen dish (`null` or `undefined` when the slot is empty).
- `slot.dishName`: Name of the chosen dish. Empty slots render `"Choose a dish +"`; filled slots render `"<category> · Edit"`.
- `slot.minutes`: Populated from `dish.cookMinutes` upon picking. Stays on the slot as the stove-minute override.
- `slot.base`: Populated from `dish.base` upon picking. Stays on the slot as the shared-prep override.
- `slot.category`: Inherits `dish.category` if slot had none set.

### Six rules that are easy to break by accident

1. **Template vs instance.** A routine is a template. Editing a day creates a
   `DayInstance` keyed by ISO date and changes **that day only**. Updating the
   template is a separate, explicit action. Never write an edit back to a
   routine implicitly.

2. **Day offsets are independent.** `slot.timeDay` and `slot.readyByDay` are set
   separately, so a Monday shift can eat at 00:30 Tuesday from a box packed
   17:30 Monday. Any time arithmetic must use both.

3. **The cook schedule spans every included group.** Computing per group is the
   bug that made the original fridge card print a School-only 6:42 start on a day
   that also packed two office boxes — 52 minutes of work shown as 33. Correct
   answer was 6:23.

4. **Shared prep is made once.** Slots naming the same `base` ("one pot of rice")
   collapse into one task: duration is the **longest** of them, not the sum;
   servings add into one bigger batch.

5. **Scheduling is sequential (one stove).** MVP decision. Burner capacity and
   attended-vs-unattended time come later. Until then the printed start time is
   conservative, never optimistic.

6. **Attendance and shopping are separate flags.** `status` is
   `confirmed | tentative | skipped`; `shop` is whether ingredients reach the
   shopping list. Buying for a tentative meal must never schedule it to cook.
   Per-weekday `tentativeDays` is how "confirmed Mon–Wed, tentative Fri" is
   expressed without a second group.

## Layout

```
src/
  types.ts              domain types — read this first
  lib/
    dates.ts            ISO keys, weekday index (0 = Mon), minute maths
    model.ts            slot/group/routine constructors, starters, seeding
    inheritance.ts      modeOf, servesOf, readyOf, leadText, parseServes
    schedule.ts         cookPlan (sequential, shared-prep merge), dayTotals
    days.ts             resolveDay, materialise, copyWeekForward, conflicts
  store/useWeekStore    one persisted store; update(draft => …) + undo
  screens/              one screen per file
  components/ui.tsx     shared primitives
```

## Conventions

- One screen per file in `src/screens/`; shared UI in `src/components/`.
- All plan state goes through `useWeekStore`. Never component-local, never
  straight to `localStorage`.
- Pure logic lives in `src/lib/` and takes plain arguments, so it can be tested
  without React.
- Print screens use real page dimensions and `@page`, not scaled phone layouts.
- Design tokens are Tailwind v4 `@theme` entries in `src/index.css` — use
  `text-ink-2`, `border-line`, `bg-green-soft`, never raw hex.

## Don't

- Don't reintroduce fixed School/Office/Home anywhere. No `section: 'school'`,
  no `SlotKey` union, no per-place components.
- Don't add `@google/genai`, `express`, `esbuild` or `tsx` back — AI Studio
  scaffold cruft, removed, and `esbuild@0.25` breaks the Vite 8 install.
- Don't put new screens in `App.tsx`; it is the router and the shell only.
- Don't sum durations for shared prep, and don't compute a cook order per group.
