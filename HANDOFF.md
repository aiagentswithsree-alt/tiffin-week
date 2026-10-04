# Handoff · 2026-10-04

Firebase sync merged to `main` at 58ee050 and live at
https://meal-planner-dps.netlify.app (auto-deploys from `main`).

> This is remaining work only. For spec / architecture read `CLAUDE.md`. For
> milestone progression read `BUILD-ORDER.md`. For the current code shape read
> `STATE.md`. For what shifted today read `SESSION.md`.

## Next, in order

### 1. Open decision — tentative-by-default vs shopping inclusion

Carried over from `BUILD-ORDER.md`. A group tentative **by routine default**
starts out of the shopping list; one switched to tentative **by hand** keeps
its shopping inclusion. The reasoning was: silently dropping items the user
had already committed to buying is worse than the asymmetry. The cost is that
"tentative" ends up meaning two slightly different things.

Settle one way:

- Keep the asymmetry and document it in `CLAUDE.md` as a sixth-rule
  footnote, OR
- Make `shop` always follow `status` and accept the lost-shopping-items
  case, OR
- Expose both as explicit toggles everywhere `status` is edited and stop
  having a default coupling at all.

This is a product call, not a code task. Whoever picks it should grep for
`g.shop` and `defaultStatus` to see the two sites that implement the current
coupling.

### 2. UI redesign with Claude Design

Not started. Constraints that still hold (see `CLAUDE.md`): design tokens stay
Tailwind v4 `@theme` entries in `src/index.css`; print layouts (`@page`,
A3/A4/A5, multi-page spill) stay as they are; no existing Playwright test may
be weakened — selectors the specs rely on (roles, labels, `data-testid`s such
as `household-count`, `sync-section`) must survive the redesign.

### 3. Invite / join test with a second Google account

Built and rules-checked on the emulator (25/25), not yet tried live. Steps:

1. Account A: Settings → **Get a join code**.
2. Account B (another device or browser profile): sign in, enter the code,
   **Join**. B's plan should be replaced by the household's.
3. Edit on A, see it on B, and the other way round.
4. Reuse the same code from a third account → should fail (code deleted
   after use). An expired or mistyped code → "wrong or has expired".

## Firebase gotchas

- **1 MiB document limit.** Seed state is ~60 KB; a busy day instance ~3 KB;
  `dayInstances` are never pruned, so roughly a year of weeks reaches 1 MiB.
  Settings warns above 800 KB. Fix: prune old `dayInstances`, or move them to
  `households/{id}/days/{iso}`.
- Join codes are not single-use in the rules — the client deletes the code
  after use, but until then (≤48 h) a second person could use it.
- Any member may rewrite `members` (remove others). Matches "members can
  read/write"; tighten if households ever include people who shouldn't.
- No leave-household / remove-member UI yet.
- First sign-in tap on iOS may be popup-blocked (SDK is still downloading);
  the second tap works. See `SESSION.md` decision 7.
- Offline edits can take ~60 s to arrive after a phone reconnects. Normal.
- Local sign-in testing: use `http://localhost:3000`, not `127.0.0.1`
  (Firebase authorizes `localhost` by default only).
- Tests use `127.0.0.1`; never add a test that signs in for real.

## Done

- `import.meta.dirname` in `vite.config.ts`; Save button wording.
- PWA deploy on Netlify, auto-deploying from `main`.
- Firebase household sync: console setup, rules published, merged, live,
  sign-in and two-way sync verified on laptop and phone.
