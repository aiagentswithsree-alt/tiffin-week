import { test, expect, Page } from '@playwright/test';

/**
 * Firebase sync — signed-out behaviour only. No real Firebase calls.
 *
 * Signed out must be exactly the old app: plan in localStorage, and Firebase
 * never even downloaded. `.env.local` is present on the dev server, so this
 * also proves the lazy load holds when sync IS configured.
 */

// Firebase hosts, plus "firebase" itself so the SDK chunk loading counts too.
// (Google Fonts from fonts.googleapis.com is the app's own CSS, not Firebase.)
const FIREBASE =
  /firebase|firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com|apis\.google\.com|accounts\.google\.com/;

const watchFirebase = (page: Page) => {
  const hits: string[] = [];
  page.on('request', (r) => {
    if (FIREBASE.test(r.url())) hits.push(r.url());
  });
  return hits;
};

test('signed out: no Firebase requests, Settings offers sign-in, edits land in localStorage', async ({ page }) => {
  const hits = watchFirebase(page);

  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');
  await page.getByRole('button', { name: /create my routines/i }).click();
  await expect(page).toHaveURL(/\/routines$/);

  await page.goto('/settings');
  const section = page.getByTestId('sync-section');
  await expect(section.getByRole('button', { name: /sign in with google/i })).toBeVisible();
  await expect(page.getByTestId('join-code')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /join/i })).toHaveCount(0);

  const before = await page.getByTestId('household-count').innerText();
  await page.getByRole('button', { name: /more people/i }).click();
  await expect(page.getByTestId('household-count')).toHaveText(String(Number(before) + 1));
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('tiffin-week-v1')!).household);
  expect(saved).toBe(Number(before) + 1);
  expect(await page.evaluate(() => localStorage.getItem('tiffin-week-signed-in'))).toBeNull();

  // Survives a reload, still with no Firebase traffic.
  await page.reload();
  await expect(page.getByTestId('household-count')).toHaveText(String(Number(before) + 1));
  expect(hits).toEqual([]);
});

test('sync queue: held snapshots never overwrite unsent edits; own echoes ignored', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { createSyncQueue } = await import(/* @vite-ignore */ '/src/lib/syncQueue.ts' as string);
    const sent: { state: string; rev: number }[] = [];
    const applied: string[] = [];
    const q = createSyncQueue('me', (state: string, s: { rev: number }) => sent.push({ state, rev: s.rev }), (s: string) => applied.push(s), 60_000);
    q.seen({ writerId: 'other', rev: 4, updatedAt: 1 });

    // Remote change with nothing pending: applied.
    q.receive({ state: 'remote-5', stamp: { writerId: 'other', rev: 5, updatedAt: 2 } });
    // Our own echo: ignored.
    q.receive({ state: 'echo', stamp: { writerId: 'me', rev: 99, updatedAt: 3 } });
    // Local edit pending, then a remote arrives: held, not applied.
    q.save('local-edit');
    q.receive({ state: 'remote-7', stamp: { writerId: 'other', rev: 7, updatedAt: 4 } });
    const appliedWhilePending = [...applied];
    q.flush();
    return { sent, applied, appliedWhilePending };
  });

  expect(result.appliedWhilePending).toEqual(['remote-5']);
  // Our write counts past the held snapshot, so it wins and the held one is dropped.
  expect(result.sent).toEqual([{ state: 'local-edit', rev: 8 }]);
  expect(result.applied).toEqual(['remote-5']);
});
