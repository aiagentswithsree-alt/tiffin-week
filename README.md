# Tiffin Week — everything

Three folders. Only one of them is code you run.

```
app/         the React app — this is the project
wireframes/  the 36 original design screens, as reference
planning/    the remap, the config prototype, the test report
```

---

## app/ — start here

The working project. React 19 + TypeScript + Vite + Tailwind v4, routed with
react-router, installable as a PWA.

```bash
cd app
npm install
npm run dev        # http://localhost:3000
npm run typecheck
npm run build
```

Three docs inside it decide everything else:

- **`app/CLAUDE.md`** — the domain model and the six rules that are easy to break
  by accident. Any coding agent reads this automatically. Read it before writing
  a line.
- **`app/BUILD-ORDER.md`** — what is built, what is next, and why the old build
  order was wrong.
- **`app/AI-STUDIO.md`** — how to push this to GitHub, import it into Google AI
  Studio, and the brief to paste so the agent knows the model before it writes
  anything. AI Studio does not read `CLAUDE.md` by itself.

**Built so far (Milestone 1):** onboarding, routine setup with the full
inheritance chain, week view, and the day plan with attendance, shopping totals
and the sequential cook scheduler. Typecheck and build are clean; five
end-to-end checks pass.

**Next (Milestone 2):** slot filling on the day plan, and the dish picker.
18 of the 36 wireframes land there.

---

## wireframes/ — reference, not build targets

The original 36 screens, split one file per screen with real content and no
runtime. Open `wireframes/index.html` to browse them all.

**Do not edit these.** They are the record of how each interaction was designed,
and `planning/tiffin-screen-remap.xlsx` points at them screen by screen. They
are not being redrawn for the new model.

Two of them are now out of date and marked as such in the remap: **03** (app map)
and **36** (user flow) still describe the old fixed School / Office / Home
hierarchy. `app/CLAUDE.md` carries the current model instead.

---

## planning/

| File | What it is |
|---|---|
| `tiffin-screen-remap.xlsx` | Every original screen → its new surface, the interactions that must survive, and the watch-outs. Doubles as the build tracker — status dropdowns on each row. |
| `routine-setup-v5.html` | The standalone prototype the configuration layer was designed and tested in. Open it directly in a browser. Milestone 1 is a port of this; keep it as the behavioural reference. |
| `acceptance-results.txt` | 16 checks across three suites, all passing: inheritance, conflicts, day instances, overnight offsets, servings validation, sequential cooking, shared prep, copy-week. |

---

## The model in six lines

A day has no hardcoded places. It has a **routine**; a routine has **groups**;
a group has **slots**.

1. `null` means inherit — serves and mode and ready-by all fall back a level.
2. A routine is a template; editing a day changes **that day only**.
3. Meal time and ready-by carry **separate** day offsets, so overnight shifts work.
4. The cook schedule spans **every** included group, never one group at a time.
5. Shared prep is made **once** — longest duration, combined batch.
6. Attendance and shopping are **separate** flags.

Full detail, and the bug each rule exists to prevent, is in `app/CLAUDE.md`.
