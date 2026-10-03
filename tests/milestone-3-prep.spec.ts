import { test, expect, Page } from '@playwright/test';

/**
 * Milestone 3 acceptance checks — N8 Prep plan (Wireframe 24).
 * Purely derived prep plan:
 * 1. Empty week has NO static content (no Sunday batch, no heads-up banner).
 * 2. Sunday batch, nightly, and morning stove orders derive strictly from picked dishes.
 * 3. Prep calendar day formula D_cook = D_routine + ready.day respects routine day.
 *    Night shift packed Monday and eaten Tuesday lands on Monday.
 */

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
}

const goToWeek = async (page: Page) => {
  await page.getByRole('link', { name: /this week/i }).click();
  await expect(page).toHaveURL(/\/week$/);
};

const goToPrep = async (page: Page) => {
  await page.getByRole('link', { name: /prep/i }).click();
  await expect(page).toHaveURL(/\/prep$/);
};

test.describe('N8 — prep plan', () => {
  test('1. empty week (no dishes picked) renders empty prep: no static Sunday batch tasks and no heads-up banner', async ({ page }) => {
    await onboard(page, ['Home meals']);
    await goToPrep(page);

    await expect(page.getByRole('heading', { name: /prep plan/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sunday batch/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /nightly/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /mornings/i })).toBeVisible();

    // Sunday batch MUST be empty — no static wireframe tasks
    await expect(page.getByText(/no sunday batch tasks yet/i)).toBeVisible();
    await expect(page.getByText(/onion-tomato base gravy/i)).toHaveCount(0);
    await expect(page.getByText(/sambar · double batch/i)).toHaveCount(0);
    await expect(page.getByText(/roast makhana/i)).toHaveCount(0);

    // Heads-up lead times banner MUST NOT be visible when no dishes need lead prep
    await expect(page.getByText(/heads-up · lead times/i)).toHaveCount(0);

    // Nightly tab is empty
    await page.getByRole('button', { name: /nightly/i }).click();
    await expect(page.getByText(/no nightly prep needed yet/i)).toBeVisible();

    // Mornings tab is empty
    await page.getByRole('button', { name: /mornings/i }).click();
    await expect(page.getByText(/no morning cook scheduled yet/i)).toBeVisible();
  });

  test('2. picking dishes dynamically derives Sunday batch tasks with kind, keeps, dishes and minutes', async ({ page }) => {
    await onboard(page, ['Home meals']);
    await goToWeek(page);
    await page.getByRole('button').filter({ hasText: 'MON' }).first().click();

    // Pick Tomato Rice + Paneer on Monday
    await page.getByText(/choose a dish/i).first().click();
    await page.getByRole('button', { name: /^all/i }).first().click();
    await page.getByPlaceholder(/search/i).fill('tomato rice');
    await page.getByText('Tomato Rice + Paneer').first().click();

    // Go to prep plan
    await goToPrep(page);

    // Sunday batch is now populated with Onion-tomato base gravy derived from Tomato Rice
    const task = page.getByText(/onion-tomato base gravy/i).first();
    await expect(task).toBeVisible();
    await expect(page.getByText(/cook a base/i).first()).toBeVisible();
    await expect(page.getByText(/fridge 4 days/i).first()).toBeVisible();
    await expect(page.getByText(/35 min/i).first()).toBeVisible();
    await expect(page.getByText(/tomato rice \+ paneer \(mon\)/i).first()).toBeVisible();

    // Interactive completion toggles checked style
    await task.click();
    await expect(task).toHaveClass(/line-through/);
    await task.click();
    await expect(task).not.toHaveClass(/line-through/);
  });

  test('3. mornings tab uses cookPlan: shared bases appear once covering every dish', async ({ page }) => {
    await onboard(page, ['Home meals', 'School lunchboxes']);
    await goToWeek(page);
    await page.getByRole('button').filter({ hasText: 'MON' }).first().click();

    // On Home Breakfast (first slot), pick Lemon Rice (base: one pot of rice)
    await page.getByText(/choose a dish/i).first().click();
    await page.getByRole('button', { name: /^all/i }).first().click();
    await page.getByPlaceholder(/search/i).fill('lemon rice');
    await page.getByText('Lemon Rice & Crispy Aloo').first().click();

    // On School Lunch (third slot), pick Tomato Rice (base: one pot of rice)
    const chooseButtons = page.getByText(/choose a dish/i);
    if ((await chooseButtons.count()) > 0) {
      await chooseButtons.first().click();
      await page.getByRole('button', { name: /^all/i }).first().click();
      await page.getByPlaceholder(/search/i).fill('tomato rice');
      await page.getByText('Tomato Rice + Paneer').first().click();
    }

    // Go to prep plan -> Mornings tab
    await goToPrep(page);
    await page.getByRole('button', { name: /mornings/i }).click();

    // One pot of rice should appear once as a shared base
    await expect(page.getByText(/one pot of rice/i).first()).toBeVisible();
    await expect(page.getByText(/shared base/i).first()).toBeVisible();
  });

  test('4. heads-up section displays lead times (e.g. soak moong Monday night for Wednesday)', async ({ page }) => {
    await onboard(page, ['Home meals']);
    await goToWeek(page);
    await page.getByRole('button').filter({ hasText: 'WED' }).first().click();

    // Pick Sprouted Moong Kosambari on Wednesday
    await page.getByText(/choose a dish/i).first().click();
    await page.getByRole('button', { name: /^all/i }).first().click();
    await page.getByPlaceholder(/search/i).fill('kosambari');
    await page.getByText('Sprouted Moong Kosambari').first().click();

    // Go to prep plan
    await goToPrep(page);

    // Sprouting requires 2-day lead -> Monday night for Wednesday
    await expect(page.getByText(/heads-up · lead times/i)).toBeVisible();
    await expect(page.getByText(/mon night:/i)).toBeVisible();
    await expect(page.getByText(/soak whole moong/i)).toBeVisible();
    await expect(page.getByText(/sprouts needed wed/i)).toBeVisible();
  });

  test('5. night shift on Monday (eaten 00:30 Tuesday, packed 17:30 Monday) lands on MONDAY, not Tuesday', async ({ page }) => {
    // Onboard with Shift work: Night shift group on Mon–Fri
    await onboard(page, ['Shift work']);
    await goToWeek(page);

    // Open Monday plan
    await page.getByRole('button').filter({ hasText: 'MON' }).first().click();

    // Slot 2 of Night Shift is "Shift lunch" (time: 00:30 timeDay: 1, packed 17:30 readyByDay: 0)
    // Pick Kanda Poha (10 min cook time) for Shift lunch
    const shiftLunchCard = page.locator('div').filter({ hasText: /^Shift lunch/i }).first();
    await shiftLunchCard.getByText(/choose a dish/i).click();
    await page.getByRole('button', { name: /^all/i }).first().click();
    await page.getByPlaceholder(/search/i).fill('kanda poha');
    await page.getByText('Kanda Poha with Peanuts').first().click();

    // Go to Prep plan -> Mornings tab
    await goToPrep(page);
    await page.getByRole('button', { name: /mornings/i }).click();

    // Assert: Under Monday 21 Sep STOVE ORDER, the task lands on MONDAY (packed 17:30)
    const monSection = page.locator('div').filter({ hasText: /MON 21 SEP · STOVE ORDER/i }).first();
    await expect(monSection).toBeVisible();
    await expect(monSection.getByText(/shift lunch/i).first()).toBeVisible();
    await expect(monSection.getByText(/17:20 – 17:30/i)).toBeVisible();

    // Assert: Under Tuesday 22 Sep STOVE ORDER, it does NOT appear
    const tueSection = page.locator('div').filter({ hasText: /TUE 22 SEP · STOVE ORDER/i });
    if (await tueSection.count() > 0) {
      await expect(tueSection.first().getByText(/shift lunch/i)).toHaveCount(0);
    }
  });
});
