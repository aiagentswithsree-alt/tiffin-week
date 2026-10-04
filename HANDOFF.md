# Handoff · 2026-10-04

M6 committed on branch milestone-6-print and merged to main (built on c6f2d80).

> This is remaining work only. For spec / architecture read `CLAUDE.md`. For
> milestone progression read `BUILD-ORDER.md`. For the current code shape read
> `STATE.md`. For what shifted today read `SESSION.md`.

## Remaining work

### 1. `__dirname` → `import.meta.dirname` in `vite.config.ts` [DONE]

Swapped at `vite.config.ts:37`. The Vite 8 warning no longer appears on dev
start or build. 46/46 Playwright tests still pass.

### 2. Save button wording — "All changes saved" [DONE]

`App.tsx` Shell now reads `canUndo` as the pending-change signal (every
mutation already persists through `useWeekStore.update`, so `dirty` is
vestigial here). The Save button says **Save** while a change is pending and
**All changes saved** (disabled) otherwise. 46/46 Playwright tests still
pass, including the existing specs that click the button after an edit.

### 3. PWA deploy

`vite-plugin-pwa` is configured and the build produces `dist/sw.js` plus an
11-entry precache manifest, but the app has never been deployed. Static hosts
that work out of the box: Netlify, Vercel, Cloudflare Pages, GitHub Pages.
Pick one, point it at `dist/`, confirm the service worker registers on
HTTPS, add the site icon, and the install prompt starts firing on Android /
Chromium desktops. iOS Safari takes "Add to Home Screen" from the share menu;
no extra work.

### 4. Open decision — tentative-by-default vs shopping inclusion (carried
over from `BUILD-ORDER.md`)

A group tentative **by routine default** starts out of the shopping list; one
switched to tentative **by hand** keeps its shopping inclusion. The reasoning
in `BUILD-ORDER.md` was: silently dropping items the user had already
committed to buying is worse than the asymmetry. The cost is that
"tentative" ends up meaning two slightly different things.

Settle one way:

- Keep the asymmetry and document it in `CLAUDE.md` as a sixth-rule
  footnote, OR
- Make `shop` always follow `status` and accept the lost-shopping-items
  case, OR
- Expose both as explicit toggles everywhere `status` is edited and stop
  having a default coupling at all.

No code change is urgent; this is a product call. Whoever picks it should
grep for `g.shop` and `defaultStatus` to see the two sites that implement
the current coupling.

## Not open

- No new npm dependencies for M6. If you were considering adding a PDF
  parser for test (b), the regex over `/Type /Page` already works and is
  what the current test uses.
- No wireframes were edited this session, per the task constraint.
- No existing test was weakened or edited. 33 pre-existing specs still
  pass unchanged; 13 M6 specs were added alongside.

## Suggested first commit from this state

Two commits read cleanly if you want to separate them:

1. The six print sheets, the test file, the final App wiring, and the stub
   deletion — "M6: six print sheets, routes, and tests".
2. The three handoff docs — "docs: STATE / SESSION / HANDOFF for 2026-10-04".

Or one lump — "M6 complete" — if the branch is going to merge straight to
`main` as a single PR.
