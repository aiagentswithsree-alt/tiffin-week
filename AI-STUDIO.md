# Continuing this project in Google AI Studio

AI Studio imports from GitHub, so the route is: push this repo, import it, then
paste the brief below so the agent knows the model before it writes anything.

---

## 1. Push to GitHub

From the `app/` folder:

```bash
git init
git add .
git commit -m "Tiffin Week — Milestone 1: routines, week view, cook scheduler"
gh repo create tiffin-week --private --source=. --push
```

No `gh`? Create an empty private repo on github.com, then:

```bash
git remote add origin https://github.com/<you>/tiffin-week.git
git branch -M main
git push -u origin main
```

`node_modules/` and `dist/` are already gitignored.

## 2. Import into AI Studio

1. Open AI Studio → **Build**
2. In the prompt box, click **Add files (+)** → **Import from GitHub**
3. Pick `tiffin-week`

Sync runs both ways after that: changes made in AI Studio push back as commits,
and edits you make locally or in a pull request pull in, with a side-by-side diff
for conflicts. So you can keep working in your own editor on WSL2 and let AI
Studio pick the changes up.

## 3. Paste this brief before asking for anything

**AI Studio will not read `CLAUDE.md` on its own** — that is a Claude Code
convention, not a universal one. Without this the agent will cheerfully
reintroduce hardcoded School/Office/Home, because that is what the domain looks
like from the outside.

Copy everything between the lines into your first message.

---

```
Read CLAUDE.md and BUILD-ORDER.md in this repo before writing any code, and
follow them. Summary of the parts that are easy to get wrong:

A day has NO hardcoded places. It has a ROUTINE; a routine has GROUPS (School,
Office, Home, Night shift, or anything a household invents); a group has SLOTS.
A couple deletes School. A homemaker deletes Office. Never reintroduce fixed
places, a `section: 'school' | 'office' | 'home'` field, or a SlotKey union.

Inheritance — `null` means INHERIT, never "empty":
  serves    slot.serves  -> group.serves -> household.people
  mode      slot.mode    -> group.mode   ('eat' | 'pack')
  readyBy   slot.readyBy -> group.packBy (packed) or slot.time (eaten here)
  category  slot.category -> "All recipes"

Six rules:
1. A routine is a TEMPLATE. Editing a day creates a DayInstance keyed by ISO
   date and changes THAT DAY ONLY. Updating the template is a separate explicit
   action. Never write a day edit back to a routine implicitly.
2. slot.timeDay and slot.readyByDay are INDEPENDENT, so a Monday shift can eat
   at 00:30 Tuesday from a box packed 17:30 Monday. Use both in any time maths.
3. The cook schedule spans EVERY included group. Computing per group is the bug
   that made the original fridge card print a School-only 6:42 start on a day
   that also packed two office boxes — 52 minutes of work shown as 33.
4. Shared prep is made ONCE: slots naming the same `base` ("one pot of rice")
   merge into one task — duration is the LONGEST of them, not the sum; servings
   add into one bigger batch.
5. Scheduling is SEQUENTIAL, one stove. Conservative on purpose. Do not add
   burner capacity or attended/unattended time yet.
6. Attendance (`confirmed | tentative | skipped`) and shopping inclusion
   (`shop`) are SEPARATE flags. Buying for a tentative meal must never schedule
   it to cook.

Conventions: one screen per file in src/screens/; shared UI in src/components/;
pure logic in src/lib/ taking plain arguments; all plan state through
useWeekStore, never component-local and never straight to localStorage; colours
from the Tailwind @theme tokens in src/index.css (text-ink-2, border-line,
bg-green-soft), never raw hex.

Do not add @google/genai, express, esbuild or tsx. They were removed —
esbuild@0.25 in particular breaks the Vite 8 install.

Milestone 1 is done: onboarding, routine setup, week view, day plan with
attendance, shopping totals and the sequential cook scheduler. Confirm you have
read CLAUDE.md and tell me what Milestone 2 is before you start.
```

---

## 4. First real task

Once it confirms, give it Milestone 2 one surface at a time. Do not ask for both
at once — they share the slot model and it will conflate them.

```
Build N4 slot filling, per BUILD-ORDER.md Milestone 2.

The day plan screen already renders groups, slots, attendance and the cook
order. Add picking a dish into a slot.

Reference wireframes (in the wireframes/ folder of the original handoff, not in
this repo): 02 and 04 for the empty state, 18 for partial, 08/12/17/20 for
planned. One screen, three states — the originals say so themselves: screen 04's
empty panel reads "Fills in as you pick the three boxes", screen 13's reads
"Start times appear once they're picked."

Must survive the merge:
- An empty slot shows "Choose a dish +"; a filled one shows "<category> · Edit".
- Screen 18's footer nudge — "2 things for today aren't on the shopping list yet
  — Add" — appears nowhere else in the 36. Keep it.
- Dish `minutes` and `base` currently sit on the slot as a stand-in. When a real
  dish is picked they come from the dish; the slot fields stay as the override.

Do not build the picker sheet yet — that is N5, next.
```

---

## What AI Studio will probably fight you on

**It may re-add the scaffold.** `@google/genai`, `express`, a `GEMINI_API_KEY`
in `.env` — these came from the AI Studio starter and the agent may assume they
belong. They are not used anywhere. The brief above tells it not to; check
`package.json` in the diff before accepting a sync.

**The service worker may not register in the preview.** `vite-plugin-pwa` emits
`sw.js` on build, and sandboxed preview iframes often refuse to register service
workers. The app works regardless — treat a registration error in the preview
console as cosmetic, and test installability on a real deployment instead.

**Deep links need an SPA fallback.** Routes like `/week/2026-09-23` work in dev
and preview because Vite rewrites unknown paths to `index.html`. A plain static
host without that rewrite will 404 on a refresh. If you hit it, either configure
the host's SPA fallback or switch `BrowserRouter` to `HashRouter` in
`src/main.tsx` — a one-line change, at the cost of `#` in the URL.

**`metadata.json` is only for device permissions** (camera, microphone,
geolocation). This app needs none, so the array stays empty. If the agent adds
permissions there, ask why — nothing in the plan needs them.

## Keeping the docs true

`CLAUDE.md` and `BUILD-ORDER.md` are the contract. When a decision changes,
change them in the same commit as the code. A stale `BUILD-ORDER.md` is what
caused the last round of confusion — it still described the School/Office/Home
milestones months after that model was dropped.

Sources: [Build apps in AI Studio](https://ai.google.dev/gemini-api/docs/aistudio-build-mode) ·
[Sync AI Studio apps with GitHub](https://aistudio.google.com/learn/sync-your-ai-studio-apps-with-github)
