# State

As of 2026-10-04. Firebase household sync built on branch `firebase-sync` (not yet merged). M6 is on main.
Deployed: https://meal-planner-dps.netlify.app — Netlify auto-deploys from `main`.

> This file is a snapshot of the code's shape. For the domain contract read
> `CLAUDE.md` (SPEC/ARCHITECTURE). For milestone progression read
> `BUILD-ORDER.md` (PROGRESS).

## Branch

`firebase-sync` (main is `main`).

## What runs

Vite + React 19 + TypeScript + Tailwind v4, routed with react-router. Build is
a PWA via `vite-plugin-pwa`. One persisted store (`src/store/useWeekStore.tsx`,
localStorage key `tiffin-week-v1`) with undo and migrating load.

## Sync (Firebase, optional)

- `src/store/useWeekStore.tsx` — `StorageAdapter` interface (`load` / `save` /
  `subscribe` / optional `flush`). `localAdapter` is always written; a
  household adapter is added on top while signed in. Exposes `sync` on the
  store (email, householdId, conflict, signIn/signOut/keep/invite/join).
- `src/store/cloud.ts` — the ONLY file importing `firebase`. Dynamic import,
  loaded only on a "Sign in with Google" tap or when the
  `tiffin-week-signed-in` localStorage flag is set. Firestore offline cache
  (`persistentLocalCache`, multi-tab), `ignoreUndefinedProperties`.
- `src/lib/syncQueue.ts` — backend-free debounced last-write-wins queue:
  `writerId` echo skip, holds remote snapshots while a save is pending, `rev`
  counts past held snapshots.
- Firestore: `households/{id} = { members, state, updatedAt, writerId, rev }`,
  `users/{uid} = { householdId, joinCode? }`,
  `joinCodes/{code} = { householdId, createdBy, expiresAt }`.
  Rules in `firestore.rules`.
- Missing `VITE_FIREBASE_*` vars → `sync.configured` false, local-only.
- PWA: Firebase chunk (`cloud-*.js`, ~612 kB) is excluded from precache and
  runtime-cached on first use. `/__/auth/*` is proxied to
  `tiffin-week.firebaseapp.com` (`public/_redirects`) and excluded from the
  SW navigate fallback.

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
| `/settings` | `Settings.tsx` | N11 settings (sync & household, household size, pantry, print defaults) |
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

## Dependencies

`firebase` (^12) added for sync — the only dependency added since M6.
