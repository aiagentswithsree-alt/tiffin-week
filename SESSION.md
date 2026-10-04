# Session · 2026-10-04 (Firebase sync)

Branch `firebase-sync`. Household sync via Firebase, signed-out behaviour unchanged.

## Decisions taken this session

1. **Storage adapter seam in `useWeekStore`.** `localAdapter` (today's
   read/write) is always written; while signed in a Firestore household
   adapter is layered on top. `src/store/cloud.ts` is the only Firebase
   import, so a backend swap rewrites that one file.
2. **Firebase is lazy.** `cloud.ts` is loaded only on a "Sign in with Google"
   tap or when the `tiffin-week-signed-in` flag (set on sign-in, cleared on
   sign-out) is present. Signed-out users make zero Firebase requests, and the
   SW no longer precaches the Firebase chunk either.
3. **Lost-edit race handled in `src/lib/syncQueue.ts`.** Each save writes
   `{ state, updatedAt, writerId, rev }`. Snapshots from this device are
   skipped. Snapshots arriving while a debounced save is pending are held.
   On flush the held one is applied only if newer than what was written —
   and because the held snapshot reached us before our write left, the
   server orders it first, so our `rev` is set past it and it is dropped.
   This keeps the device equal to the server rather than diverging.
4. **Whole state replaced by `updateDoc`, not `setDoc(merge)`.** A merge would
   deep-merge the `state` map and resurrect deleted days; `updateDoc` replaces
   the field whole and leaves `members` alone.
5. **Join passes the code via the joiner's own `users` doc** in the same batch,
   read in rules with `getAfter()` — rules take no parameters.
6. **Join-code create rule allows up to 49 h**, not 48 h: the client sets
   now + 48 h and its clock may run ahead of the server.
7. **First tap on iOS may be blocked.** The first sign-in tap has to download
   the module before calling `signInWithPopup`; if Safari blocks that popup,
   the message asks for a second tap, which calls it directly in the gesture.
   Preloading on Settings mount would avoid this but breaks "zero Firebase
   requests signed out".
8. **Conflict prompt only when plans differ.** Compared with sorted-key JSON
   (Firestore doesn't keep map key order), so signing out and back in doesn't
   nag.

## Changes

### New
- `src/store/cloud.ts`, `src/lib/syncQueue.ts`
- `firestore.rules`, `firebase.json`
- `tests/sync-signed-out.spec.ts` — 2 tests

### Edited
- `src/store/useWeekStore.tsx` — adapters, `sync` API, lazy cloud load
- `src/screens/Settings.tsx` — "Sync & household" section at the top
- `vite.config.ts` — `navigateFallbackDenylist` for `/__/`, Firebase chunk
  excluded from precache + runtime-cached
- `public/_redirects` — `/__/auth/*` proxy to `tiffin-week.firebaseapp.com`
- `package.json` — `firebase` dependency
- `CLAUDE.md` layout, `STATE.md`, `HANDOFF.md`

## Tests run today

- `npm run typecheck` → clean
- `npm run build` → built; main JS 449.5 kB, Firebase chunk 612 kB (lazy,
  not precached); precache 11 entries / 478 KiB
- `npm test` → **48 passed** (46 existing, untouched + 2 new)
- Firestore rules: **25/25** allow/deny checks as expected against the
  Firestore + Auth emulators (firebase-tools 15.32.1 via npx, not a project
  dependency; script not committed). Covers create, member write, non-member
  read/write, code create/get/list/delete, join with expired / missing /
  wrong-household code, join that also edits state, join adding someone else,
  valid join, users doc isolation.
- Build with all `VITE_FIREBASE_*` blank: Settings says "Sync isn't set up",
  no console errors, no Firebase requests (even with a stale signed-in flag).
- Not tested: real Google sign-in, real two-device sync, installed PWA on
  iPhone / Android — no device and no real-project calls from tests.

## After the commit — live rollout

Owner did the console setup and live testing; no code changed.

### Console setup (done)
- Netlify env: `VITE_FIREBASE_AUTH_DOMAIN = meal-planner-dps.netlify.app`
  plus the other three `VITE_FIREBASE_*` vars (not marked secret — they ship
  in the client bundle anyway).
- Google OAuth web client: origin `https://meal-planner-dps.netlify.app` and
  redirect URI `https://meal-planner-dps.netlify.app/__/auth/handler` added.
- Firebase Auth: `meal-planner-dps.netlify.app` added to authorized domains.
- `firestore.rules` published.

### Deploy
- `firebase-sync` merged to `main` at 58ee050; Netlify deployed it.
- `https://meal-planner-dps.netlify.app/__/auth/handler` serves Firebase's
  page, so the `_redirects` proxy works.

### Live tests (passed)
- Google sign-in on laptop and on phone.
- Two-way live sync between them, including dish edits.
- Offline edit arrives after reconnect — up to ~60 s on a phone, which is
  normal (the Firestore SDK backs off reconnecting while the page is in the
  background).

### Not yet tested
- Invite / join with a second Google account.

### Tests on main after merge
- `npm test` → **48 passed** (16.2 s), unchanged from the branch.
