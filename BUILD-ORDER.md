# Build order

Supersedes the version written against the original 36 wireframes. That one was
organised as *School flow → Office flow → Home evening*, which no longer exists:
those were variants of two components, and the dynamic routine model collapsed
them. Building to the old order now produces the wrong app.

The ordering logic changed with it. It used to be **build one place end to end,
then repeat**. It is now **build the configuration layer, then the one day screen
and one picker that serve every group**.

`tiffin-screen-remap.xlsx` maps each of the 36 originals to its new home and
lists the interactions that must survive. The wireframes themselves stay as
visual reference — they are not being redrawn.

---

## Status

| | |
|---|---|
| **Done** | M1 Configuration layer (N1 Onboarding · N2 Routine setup · N3 Week view + day plan) · M2 Core loop (N4 Day plan slot filling · N5 Dish picker) · M3 Derived outputs (N6 Shopping list + N7 Pantry drawer · N8 Prep plan) · M4 Library (N9 Bases · N10 Recipe editor) · M5 Settings & seeding (N11 Settings · N12 Start next week) · M6 Print (N13 Print centre + N14 Wall · N15 Prep · N16 Shopping · N17 Fridge · N18 Blank · N19 Recipe cards) |
| **Next** | No milestone outstanding. See `HANDOFF.md` for remaining non-feature work. |
| Verified | typecheck + build clean; 46/46 Playwright specs pass (33 pre-M6 + 13 M6) |

Milestone 1 landed as a **port** of `routine-setup-v5.html`, not a fresh design.
The inheritance chain, conflict resolution, day instances, attendance and the
sequential cook scheduler were all working there first.

---

## Milestone 1 — Configuration layer ✅

| Surface | File | Absorbs |
|---|---|---|
| N1 Onboarding | `screens/Onboarding.tsx` | new |
| N2 Routine setup | `screens/RoutineSetup.tsx` | part of 27 |
| N3 Week view + day plan | `screens/WeekView.tsx` | 1, 21 |

What it already does: household → group → slot inheritance with live labels;
eat/pack per group with per-slot override; slot time separate from ready-by, each
with its own day offset; weekday-specific tentative attendance; shopping
inclusion independent of cooking commitment; weekday **and** dated conflict
detection that resolves against every competitor and navigates to a blocking
conflict on save; day instances that leave templates alone; copy-week-forward
that resets done marks and asks before replacing; sequential cross-group cook
scheduling with shared prep merged.

## Milestone 2 — The core loop ✅

| Surface | Absorbs | Notes |
|---|---|---|
| N4 Day plan (slot filling) | 2, 4, 8, 9, 12, 13, 17, 18, 20 | One screen, three states: empty → partial → planned. The originals say so themselves — screen 04's empty panel reads *"Fills in as you pick the three boxes"*, screen 13's reads *"Start times appear once they're picked."* |
| N5 Dish picker | 5, 6, 7, 10, 11, 14, 15, 16, 19 | One sheet. States: recipe expanded (07), editing a saved slot (19). Options: search, serves stepper, base and minutes chips. |

**18 originals land here.** This is the milestone that matters; everything after
it is derivation and presentation.

Things the remap flags as must-survive and easy to lose in the merge:

- Screen 18's footer nudge — *"2 things for today aren't on the shopping list yet
  — Add"* — appears nowhere else.
- Screen 07's recipe expansion must stay **inline**. Making it a route breaks
  backing out of the picker.
- *"travels so-so"* keys off the slot's **effective** pack mode, not a place name.
- Dish `minutes` and `base` currently live on the slot as a stand-in. When a real
  dish is picked they come from the dish; keep the slot fields as the override.
- **Temporary dev helper**: The `Empty / Partial / Planned` state test bar in
  `src/screens/WeekView.tsx` is strictly behind `import.meta.env.DEV` and is
  completely isolated from domain logic. It must be removed before Milestone 6.

## Milestone 3 — Derived outputs [COMPLETED]

| Surface | Absorbs | Status |
|---|---|---|
| N6 Shopping list (with N7 Pantry drawer) | 22, 23 | Completed & tested |
| N8 Prep plan | 24 | Completed & tested |

Both already have their engine: `schedule.ts` provides `cookPlan` and
`dayTotals`. `prep.ts` provides `buildPrepPlan` computing Sunday batch sessions,
nightly checklists, morning cook orders, and heads-up lead notices.

The Pantry (wireframe 23) was absorbed directly into N6 Shopping list as an
integrated drawer rather than a standalone disconnected screen. Users review
always-in-stock staples directly on their shopping list, and toggling a staple
"Running low" immediately adds it to this week's active shopping list.

Quantities scale from **effective** serves per slot, and lead times respect
day offsets so overnight or night-shift prep lands on the correct calendar day.
Shared bases appear once across every meal that uses them.

Tested via `tests/milestone-3-shopping.spec.ts` and `tests/milestone-3-prep.spec.ts`.

## Milestone 4 — Library [COMPLETED]

N10 Recipe editor (26) · N9 Bases library (25) (N7 Pantry absorbed into N6)

- Recipes in persisted state, seeded from SAMPLE_RECIPES on first run. Never mutate the constant.
- Structured ingredients `{ name, qty, unit, shopSection, estimated }`.
- Recipe is a LIBRARY item: editing it changes every day that uses that dish.
- Serves stepper rescales every amount.
- Typing over an estimated amount makes it real and removes "est." tag.
- Method steps, morning cook time, and base linking feeding the prep plan.
- Bases library with lead time, keeps, batch size, used-by count, and adding new bases.

Tested via `tests/milestone-4-library.spec.ts` (5/5 passed).

## Milestone 5 — Settings and seeding

N11 Settings (rest of 27) · N12 Start next week (28)

Settings loses days, groups and timings to N2; it keeps household, pantry, bases
and print defaults, and links out. Screen 28's *copy last week* is built;
*shuffle repeats* and *start from a saved template* are not.

## Milestone 6 — Print [COMPLETED]

N13 Print centre (29) · N14 Wall planner (30) · N15 Prep sheet (31) ·
N16 Shopping list (32) · N17 Fridge card (33) · N18 Blank planner (34) ·
N19 Recipe card (35)

Row bands became generated rows. Group count is unbounded, so sheets **spill
onto further pages with repeated headings** — groups never capped, type never
shrunk. Paper is `A3 | A4 | A5`; A3 is offered for the wall and blank planner
only. Old saved state missing the field defaults to A4.

Tested via `tests/milestone-6-print.spec.ts` (13/13 passed), including the four
required: fridge start-time ≡ Mornings-tab start-time on a 2+ group day
(rule 3), wall planner 6-group PDF spans >1 page with heading repeated, blank
planner row labels follow routine slot renames, and ink-saver clears every
coloured background fill across all six sheets.

---

## Reference, not screens

Screens **03** (app map) and **36** (user flow) are the model and navigation
specs. Both still describe the fixed School/Office/Home hierarchy and are now
wrong. Rewrite them when you need them; `CLAUDE.md` carries the current model in
the meantime.

## Open decisions

- Whether the cook model gains attended-vs-unattended minutes and a burner count.
  Until then, sequential and conservative.
- Asymmetry worth settling: a group tentative **by routine default** starts out
  of the shopping list; one switched to tentative **by hand** keeps its shopping
  inclusion. Reasoning was that silently dropping items someone already committed
  to buy is worse — but "tentative" then means two slightly different things.
