# Session · 2026-10-04

M6 committed on branch milestone-6-print and merged to main (built on c6f2d80).

## Decisions taken this session

1. **A3 added to `PrintDefaults.paperSize`**, offered only for the wall and
   blank planners. Old saved state missing the field defaults to A4 at read
   time. No migration path needed because the field is already optional and
   read through `?? DEFAULT_PRINT_DEFAULTS`.
2. **WhatsApp share and A3-for-everything-else dropped from scope** — the
   wireframe showed both; neither matches the stated use case and both can
   wait until there is user pressure for them.
3. **Each print sheet is its own `/print/*` route outside the phone Frame.**
   Alternative was to render into a dedicated viewport inside the Frame; this
   path keeps sheets rendering at real paper dimensions on screen so authors
   see the real bounds, not a scaled phone layout.
4. **Multi-page spill lives in the `PrintSheet` wrapper**, not in each sheet.
   Each immediate child of `PrintSheet` becomes a sibling `.sheet` div with
   `page-break-before: always` between them. Sheets that spill (wall, blank)
   chunk their rows into pages and pass each chunk as a child.
5. **Ink-saver clears every background inside the sheet to white, including
   greys.** The strict reading of "no coloured background fill" treats grey
   fills as coloured for printing economy. Borders are preserved for
   structure.
6. **Fridge card feeds the full day's confirmed groups into `cookPlan`.**
   Rule 3 in CLAUDE.md calls out the bug of computing per group; the fridge
   card is the sheet most at risk of regressing it, and its test (a) now
   locks the behaviour in by comparing against the Mornings-tab start.

## Changes

### New

- `src/screens/PrintCentre.tsx` — N13
- `src/screens/PrintWall.tsx` — N14
- `src/screens/PrintPrep.tsx` — N15
- `src/screens/PrintShopping.tsx` — N16
- `src/screens/PrintFridge.tsx` — N17
- `src/screens/PrintBlank.tsx` — N18
- `src/screens/PrintRecipes.tsx` — N19
- `src/components/PrintSheet.tsx` — @page CSS, multi-page spill, ink-saver
- `src/lib/print.ts` — `SHEETS` catalogue + helpers
- `tests/milestone-6-print.spec.ts` — 13 Playwright checks
- `STATE.md`, `SESSION.md`, `HANDOFF.md` (this handoff)

### Edited

- `src/App.tsx` — print routes, print-sheet frame bypass, PrintStub removed
- `src/types.ts` — `PrintDefaults.paperSize: 'A3' | 'A4' | 'A5'`
- `src/screens/Settings.tsx` — A3 button added to paper picker
- `src/screens/WeekView.tsx` — DEV test state bar removed; Print centre link
  added to the bottom row
- `BUILD-ORDER.md` — stale Status table updated; M6 marked completed

### Deleted

- `src/screens/PrintStub.tsx` — temporary scaffold during the build

## Tests run today

- `npm run typecheck` → clean (tsc, no output)
- `npm run build` → built (442 kB JS, 36 kB CSS, 11-entry PWA precache)
- `npm test` → **46 passed**: 33 pre-existing specs + 13 new M6 specs. No
  existing test was weakened or edited.

The four required M6 tests are present and green:

- (a) Fridge start-time ≡ Mornings-tab start-time on a day with 2+ groups
  (rule 3).
- (b) Wall planner with 6 groups produces a PDF with >1 page and the
  heading repeats on page 2 (both DOM `.sheet` count and PDF `/Type /Page`
  count verified).
- (c) Blank planner row labels follow routine slot names — rename a slot in
  storage, the row label changes on reload.
- (d) Ink-saver on: no element on any sheet has a coloured background fill
  (asserted per sheet by walking the DOM and checking computed background
  colours are transparent or greyscale).
