# State

As of 2026-10-04. M6 committed on branch milestone-6-print and merged to main (built on c6f2d80).

> This file is a snapshot of the code's shape. For the domain contract read
> `CLAUDE.md` (SPEC/ARCHITECTURE). For milestone progression read
> `BUILD-ORDER.md` (PROGRESS).

## Branch

`milestone-6-print` (main is `main`).

## What runs

Vite + React 19 + TypeScript + Tailwind v4, routed with react-router. Build is
a PWA via `vite-plugin-pwa`. One persisted store (`src/store/useWeekStore.tsx`,
localStorage key `tiffin-week-v1`) with undo and migrating load.

## Screens

| Route | File | Role |
|---|---|---|
| `/` | `Onboarding.tsx` | First-run routine seeder |
| `/routines` | `RoutineSetup.tsx` | N2 — edit routines, groups, slots |
| `/week`, `/week/:date` | `WeekView.tsx` | N3 week + N4 day plan |
| `/shopping` | `ShoppingList.tsx` | N6 shopping + N7 pantry drawer |
| `/prep` | `PrepPlan.tsx` | N8 prep plan |
| `/recipes/:id` | `RecipeEditor.tsx` | N10 recipe editor |
| `/bases` | `BasesLibrary.tsx` | N9 bases library |
| `/settings` | `Settings.tsx` | N11 settings (household, pantry, print defaults) |
| `/start-next-week` | `StartNextWeek.tsx` | N12 copy/shuffle/template/blank |
| `/print` | `PrintCentre.tsx` | N13 print centre |
| `/print/wall` | `PrintWall.tsx` | N14 wall planner (A4/A3 landscape) |
| `/print/prep` | `PrintPrep.tsx` | N15 prep sheet (A4 portrait) |
| `/print/shopping` | `PrintShopping.tsx` | N16 shopping list (A4 portrait) |
| `/print/fridge` | `PrintFridge.tsx` | N17 fridge card (A5 portrait) |
| `/print/blank` | `PrintBlank.tsx` | N18 blank planner (A4/A3 landscape) |
| `/print/recipes` | `PrintRecipes.tsx` | N19 recipe cards (A5 portrait) |

Print routes bypass the 390×844 phone Frame in `App.tsx` so sheets render at
real paper dimensions.

## Shared print infrastructure

- `src/components/PrintSheet.tsx` — injects `@page` CSS, renders each child as
  a separate `.sheet` sibling with `page-break-before: always` between them,
  carries ink-saver mode (clears every background inside the sheet to white).
- `src/lib/print.ts` — `SHEETS` catalogue (paper, orientation, path per sheet),
  `paperSizeFor` fallback for sheets that do not allow a given paper.

## Domain + derived logic

- `src/lib/dates.ts` — ISO keys, weekday index (0 = Mon), minute math.
- `src/lib/model.ts` — slot/group/routine factories, starters.
- `src/lib/inheritance.ts` — `modeOf`, `servesOf`, `readyOf`, `leadText`.
- `src/lib/schedule.ts` — `cookPlan` (sequential, shared-prep merged across
  every included group), `dayTotals`.
- `src/lib/shopping.ts` — `buildShoppingList`, pantry split, section ordering.
- `src/lib/prep.ts` — `buildPrepPlan` (Sunday batch, nightly, mornings, leads).
- `src/lib/days.ts` — `resolveDay`, `materialise`, `copyWeekForward`,
  `shuffleRepeats`, `startBlankWeek`, `saveWeekTemplate`, `applyWeekTemplate`,
  `findConflicts`.

## Data

- `src/data/recipes.ts` — `SAMPLE_RECIPES` seed for the recipe library.
- `src/data/bases.ts` — `DEFAULT_BASES` seed.
- `src/data/templates.ts` — `DEFAULT_PRINT_DEFAULTS` (A4 landscape, ink-saver
  on) + `DEFAULT_WEEK_TEMPLATES`.

## Types that matter

`PrintDefaults.paperSize: 'A3' | 'A4' | 'A5'`. A3 is offered for the wall and
blank planners only; everywhere else the sheet's own default wins. Saved state
missing `paperSize` falls through to A4 at read time (no migration needed).

## Deleted this session

- `src/screens/PrintStub.tsx` — temporary scaffold during M6, replaced by real
  sheets.
- The DEV test state bar in `WeekView.tsx` (`handleFillOne`, `handleFillAll`,
  `handleClearAll` and the surrounding `import.meta.env.DEV` block).

## Not a dependency change

M6 added no new npm dependencies. Playwright, React, Vite, Tailwind, and
react-router were already in place.
