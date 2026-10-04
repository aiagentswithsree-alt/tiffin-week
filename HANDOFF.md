# Handoff · 2026-10-04

M6 committed on branch milestone-6-print and merged to main (built on c6f2d80).

> This is remaining work only. For spec / architecture read `CLAUDE.md`. For
> milestone progression read `BUILD-ORDER.md`. For the current code shape read
> `STATE.md`. For what shifted today read `SESSION.md`.

## Remaining work

### 1. `__dirname` → `import.meta.dirname` in `vite.config.ts`

Vite 8 prints this warning on every dev-server start and every build:

> Your Vite config uses features that are unsupported by `configLoader:
> 'native'`, which is planned to become the default in a future major
> version of Vite — `__dirname` (vite.config.ts:37:41).

It is cosmetic now but is a known future break. One-line swap:
`__dirname` → `import.meta.dirname`. No downstream code touches this value.

### 2. Save button wording — "All changes saved"

The `useWeekStore` persists every mutation to localStorage immediately, so by
the time the user clicks **Save** the state is already on disk. The button in
`App.tsx`'s `Shell` still says **Save** and surfaces a *Saved · N routines…*
status; the clearer message is **All changes saved** (and probably a disabled
button when `dirty` is false). The store already exposes `dirty` and
`setMessage`; this is a label + condition change inside `Shell`, nothing deep.

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
