/**
 * One-off tour screenshotter. Not a test — not under ./tests, so `npm test`
 * ignores it.
 *
 *   npm run dev              # in another shell
 *   npx tsx scripts/screenshots.ts
 *
 * Writes Pixel 7-sized PNGs into ./screenshots/.
 */
import { chromium, devices, Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const OUT = path.resolve(process.cwd(), 'screenshots');

const shot = (page: Page, name: string) =>
  page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });

async function onboard(page: Page) {
  await page.goto(BASE + '/');
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE + '/');

  for (const label of ['Home meals', 'School lunchboxes', 'Office meals']) {
    const btn = page.getByRole('button', { name: new RegExp(label, 'i') });
    if ((await btn.getAttribute('aria-pressed')) !== 'true') await btn.click();
  }
  await page.getByRole('button', { name: /create my routines/i }).click();
  await page.waitForURL(/\/routines$/);
  await page.getByRole('button', { name: /^save$/i }).click();
  await page.getByRole('status').waitFor();
}

async function openMonday(page: Page) {
  await page.getByRole('link', { name: /this week/i }).click();
  await page.waitForURL(/\/week$/);
  await page.getByRole('button').filter({ hasText: 'MON' }).first().click();
  await page.getByText(/back to the week/i).waitFor();
}

async function pickFirstEmpty(page: Page, search: string, dishName: string) {
  await page.getByText(/choose a dish/i).first().click();
  await page.getByPlaceholder(/search/i).fill(search);
  await page.getByText(dishName, { exact: true }).first().click();
  await page.getByPlaceholder(/search/i).waitFor({ state: 'hidden' });
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({ ...devices['Pixel 7'] });
  const page = await context.newPage();

  await onboard(page);

  // 1. Routines (we're already here, post-save).
  await shot(page, '01-routines');

  // 2. Week view.
  await page.getByRole('link', { name: /this week/i }).click();
  await page.waitForURL(/\/week$/);
  await shot(page, '02-week');

  // 3. Day plan — Monday — with a few picks.
  await openMonday(page);
  await pickFirstEmpty(page, 'paneer', 'Paneer Paratha & Curd');
  await pickFirstEmpty(page, 'dal', 'Dal Tadka, Rice & Bhindi Fry');
  await pickFirstEmpty(page, 'poha', 'Kanda Poha with Peanuts');
  await shot(page, '03-day-monday');

  // Persist the picks so later shopping/prep screens have data,
  // then reopen the picker for shot 04.
  await page.getByRole('button', { name: /^save$/i }).click();
  await page.getByRole('status').waitFor();

  // 4. Dish picker open — click the next empty slot (or re-open a filled one).
  const nextEmpty = page.getByText(/choose a dish/i).first();
  if (await nextEmpty.count()) {
    await nextEmpty.click();
  } else {
    await page.getByText(/· edit/i).first().click();
  }
  await page.getByPlaceholder(/search/i).waitFor();
  await shot(page, '04-dish-picker');

  // Close the picker by reloading — safe because state was just saved.
  await page.reload();
  await page.getByPlaceholder(/search/i).waitFor({ state: 'hidden' }).catch(() => {});

  // 5. Shopping list.
  await page.goto(BASE + '/shopping');
  await page.waitForLoadState('networkidle');
  await shot(page, '05-shopping');

  // 6. Prep plan.
  await page.goto(BASE + '/prep');
  await page.waitForLoadState('networkidle');
  await shot(page, '06-prep');

  // 7. Recipe editor — reopen picker, open recipe, click Edit recipe.
  await page.goto(BASE + '/week');
  await page.getByRole('button').filter({ hasText: 'MON' }).first().click();
  await page.getByText(/· edit/i).first().click();
  await page.getByPlaceholder(/search/i).waitFor();
  await page.getByText(/recipe/i).first().click();
  await page.getByRole('button', { name: /edit recipe/i }).first().click();
  await page.waitForURL(/\/recipes\//);
  await shot(page, '07-recipe-editor');

  // 8. Settings.
  await page.goto(BASE + '/settings');
  await page.waitForLoadState('networkidle');
  await shot(page, '08-settings');

  await browser.close();
  console.log(`Done. ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
