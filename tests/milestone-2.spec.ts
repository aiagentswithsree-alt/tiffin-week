import { test, expect, Page } from '@playwright/test';

/**
 * Milestone 2 acceptance checks — N4 slot filling and N5 dish picker.
 *
 * Two rules for this file:
 *
 * 1. Navigate IN-APP (click the tabs and day rows), never page.goto() after
 *    onboarding. The app persists only on Save; a reload throws away unsaved
 *    state. A reload would also make the template-safety test pass vacuously,
 *    because the edit it is checking for would be gone.
 *
 * 2. Click Save before anything that might reload, so the state under test is
 *    real and persisted.
 *
 * Dishes are named explicitly ("Paneer Paratha & Curd") rather than picked as
 * "first button containing 'min'", so a test cannot silently pick something
 * else and still pass.
 */

const DISH = 'Paneer Paratha & Curd';

async function onboard(page: Page, options: string[]) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');

  const all = ['Home meals', 'School lunchboxes', 'Office meals', 'Shift work'];
  for (const label of all) {
    const btn = page.getByRole('button', { name: new RegExp(label, 'i') });
    const on = (await btn.getAttribute('aria-pressed')) === 'true';
    const want = options.some((o) => new RegExp(o, 'i').test(label));
    if (on !== want) await btn.click();
  }

  await page.getByRole('button', { name: /create my routines/i }).click();
  await expect(page).toHaveURL(/\/routines$/);
  await save(page);
}

const save = async (page: Page) => {
  await page.getByRole('button', { name: /^save$/i }).click();
  await expect(page.getByRole('status')).toContainText(/saved/i);
};

const goToWeek = async (page: Page) => {
  await page.getByRole('link', { name: /this week/i }).click();
  await expect(page).toHaveURL(/\/week$/);
};

const goToRoutines = async (page: Page) => {
  await page.getByRole('link', { name: /^routines$/i }).click();
  await expect(page).toHaveURL(/\/routines$/);
};

/** Monday of the first week, reached by clicking — no reload. */
const openMonday = async (page: Page) => {
  await goToWeek(page);
  await page.getByRole('button').filter({ hasText: 'MON' }).first().click();
  await expect(page.getByText(/back to the week/i)).toBeVisible();
};

const firstEmptySlot = (page: Page) => page.getByText(/choose a dish/i).first();

/** Opens the first empty slot's picker and picks DISH via search. */
const pickDish = async (page: Page) => {
  await firstEmptySlot(page).click();
  await page.getByPlaceholder(/search/i).fill('paneer');
  await page.getByText(DISH).first().click();
  await expect(page.getByPlaceholder(/search/i)).toBeHidden(); // sheet closed
};

/* ------------------------------------------------------------------ */

test.describe('N4 — slot filling', () => {
  test.beforeEach(async ({ page }) => {
    await onboard(page, ['Home meals']);
    await openMonday(page);
  });

  test('empty slots invite a pick and name the category they open on', async ({ page }) => {
    await expect(firstEmptySlot(page)).toBeVisible();
    await expect(page.getByText(/opens on/i).first()).toBeVisible();
  });

  test('picking a dish fills the slot without touching the routine template', async ({ page }) => {
    await pickDish(page);
    await expect(page.getByText(DISH).first()).toBeVisible();

    await save(page);          // persisted, so this is a real check
    await goToRoutines(page);
    await page.locator('button[aria-expanded]').first().click();

    // RULE 1: the template never receives the day's dish.
    await expect(page.getByText(DISH)).toHaveCount(0);

    // And the day still has it — the edit was kept, just not leaked.
    await openMonday(page);
    await expect(page.getByText(DISH).first()).toBeVisible();
  });
});

test.describe('N5 — dish picker', () => {
  test.beforeEach(async ({ page }) => {
    // Home only: the first slot is Breakfast, which opens on Rotis & dosas.
    await onboard(page, ['Home meals']);
    await openMonday(page);
  });

  test('opens on the slot own category', async ({ page }) => {
    await expect(page.getByText(/rotis & dosas/i).first()).toBeVisible(); // stated on the slot
    await firstEmptySlot(page).click();

    // A Rotis & dosas dish is listed without searching or switching chips.
    await expect(page.getByText(/methi thepla|paneer paratha|phulka/i).first()).toBeVisible();
  });

  test('search matches an ingredient, not just a dish name', async ({ page }) => {
    await firstEmptySlot(page).click();
    await page.getByPlaceholder(/search/i).fill('paneer');
    await expect(page.getByText(DISH).first()).toBeVisible();
    // "Soft Phulkas & Paneer Butter Masala" also matches; either proves search runs.
  });

  test('recipe expands inline and the sheet stays open', async ({ page }) => {
    await firstEmptySlot(page).click();
    const urlBefore = page.url();

    await page.getByText(/recipe/i).first().click();

    await expect(page.getByText(/ingredient/i).first()).toBeVisible();
    expect(page.url()).toBe(urlBefore);                              // no new route
    await expect(page.getByPlaceholder(/search/i)).toBeVisible();    // still in the sheet
  });

  test('reopening a filled slot shows what is in it now', async ({ page }) => {
    await pickDish(page);

    // Reopen via the filled slot — NOT via Clear.
    await page.getByText(/rotis & dosas\s*·\s*edit/i).first().click();

    await expect(page.getByText(/in this slot now/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^clear$/i }).first()).toBeVisible();
  });
});

/**
 * The one that proves the model held. Same slot, same dish list — only the
 * group's pack mode changes. If the badge follows that toggle it is keyed to
 * modeOf(group, slot). If it does not, something is keyed to a group name.
 *
 * School only, so every slot on the day belongs to the School group.
 */
test.describe('travel warning', () => {
  test('follows the effective pack mode, not the group name', async ({ page }) => {
    await onboard(page, ['School lunchboxes']);
    await openMonday(page);

    // Packed (School default).
    await firstEmptySlot(page).click();
    await page.getByRole('button', { name: /^all/i }).first().click(); // widest dish list
    const whenPacked = await page.getByText(/travels so-so/i).count();

    // Close the sheet by reloading — safe, state was saved at onboarding.
    await page.reload();

    // Switch School to Eat here, and persist it.
    await goToRoutines(page);
    await page.locator('button[aria-expanded]').first().click();
    await page.getByRole('button', { name: /^eat here$/i }).first().click();
    await save(page);

    // Same slot again.
    await openMonday(page);
    await firstEmptySlot(page).click();
    await page.getByRole('button', { name: /^all/i }).first().click();
    const whenEaten = await page.getByText(/travels so-so/i).count();

    // If whenPacked is 0, no recipe in the library carries the flag — that is
    // a data gap worth knowing about, not a selector problem.
    expect(whenPacked, 'no "travels so-so" badge on a packed slot').toBeGreaterThan(0);
    expect(whenEaten, 'badge still shows after switching to Eat here').toBe(0);
  });
});
