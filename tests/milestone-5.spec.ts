import { test, expect, Page } from '@playwright/test';
import { iso, weekDates } from '../src/lib/dates';

/**
 * Milestone 5 acceptance checks:
 * - N11 Settings (Wireframe 27)
 * - N12 Start next week (Wireframe 28)
 *
 * User Acceptance Criteria:
 * 1. copy carries picks
 * 2. start blank has no dishes
 * 3. save-then-start-from reproduces picks
 * 4. shuffle puts no dish in the same weekday+slot
 * 5. changing household in Settings changes inherited servings on the day plan
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

const save = async (page: Page) => {
  await page.getByRole('button', { name: /^save$/i }).click();
  await expect(page.getByRole('status')).toContainText(/saved/i);
};

const goToWeek = async (page: Page) => {
  await page.goto('/week');
  await expect(page).toHaveURL(/\/week$/);
};

test.describe('Milestone 5 — Settings & Start next week', () => {
  test.beforeEach(async ({ page }) => {
    await onboard(page, ['Home meals']);
  });

  test('1. copy carries picks to next week', async ({ page }) => {
    await goToWeek(page);

    // Pick Paneer Paratha on Monday
    await page.getByRole('button').filter({ hasText: 'MON' }).first().click();
    await page.getByText(/choose a dish/i).first().click();
    await page.getByPlaceholder(/search/i).fill('paneer');
    await page.getByText('Paneer Paratha & Curd').first().click();
    await expect(page.getByRole('heading', { name: 'Paneer Paratha & Curd' })).toBeVisible();

    await page.getByText(/back to the week/i).click();
    await save(page);

    // Navigate to Start next week
    await page.goto('/start-next-week?srcOffset=0&targetOffset=1');
    await expect(page.getByRole('heading', { name: /plan/i })).toBeVisible();

    // Click Copy last week
    await page.getByRole('button', { name: 'Copy last week' }).click();

    // If confirmation is needed for clashes, confirm replace
    const replaceBtn = page.getByRole('button', { name: /replace them/i });
    if (await replaceBtn.isVisible()) {
      await replaceBtn.click();
    }

    await expect(page).toHaveURL(/\/week$/);

    // Navigate to next week
    await page.getByRole('button', { name: 'Next week' }).click();

    // Verify Monday carries the picked dish
    await page.getByRole('button').filter({ hasText: 'MON' }).first().click();
    await expect(page.getByRole('heading', { name: 'Paneer Paratha & Curd' })).toBeVisible();
  });

  test('2. start blank has no dishes', async ({ page }) => {
    await goToWeek(page);

    // Pick a dish in week 0
    await page.getByRole('button').filter({ hasText: 'MON' }).first().click();
    await page.getByText(/choose a dish/i).first().click();
    await page.getByPlaceholder(/search/i).fill('paneer');
    await page.getByText('Paneer Paratha & Curd').first().click();
    await expect(page.getByRole('heading', { name: 'Paneer Paratha & Curd' })).toBeVisible();

    await page.getByText(/back to the week/i).click();
    await save(page);

    // Go to Start next week and start blank
    await page.goto('/start-next-week?srcOffset=0&targetOffset=1');
    await page.getByRole('button', { name: 'Start blank' }).click();

    const replaceBtn = page.getByRole('button', { name: /replace them/i });
    if (await replaceBtn.isVisible()) {
      await replaceBtn.click();
    }

    await expect(page).toHaveURL(/\/week$/);

    // Navigate to next week
    await page.getByRole('button', { name: 'Next week' }).click();

    // Verify Monday has routines applied but NO dishes picked
    await page.getByRole('button').filter({ hasText: 'MON' }).first().click();
    await expect(page.getByRole('heading', { name: 'Paneer Paratha & Curd' })).toBeHidden();
    await expect(page.getByText(/choose a dish/i).first()).toBeVisible();
  });

  test('3. save-then-start-from reproduces picks', async ({ page }) => {
    await goToWeek(page);

    // Pick Paneer Paratha on Monday
    await page.getByRole('button').filter({ hasText: 'MON' }).first().click();
    await page.getByText(/choose a dish/i).first().click();
    await page.getByPlaceholder(/search/i).fill('paneer');
    await page.getByText('Paneer Paratha & Curd').first().click();
    await expect(page.getByRole('heading', { name: 'Paneer Paratha & Curd' })).toBeVisible();
    await page.getByText(/back to the week/i).click();

    // Pick Tomato Rice on Tuesday
    await page.getByRole('button').filter({ hasText: 'TUE' }).first().click();
    await page.getByText(/choose a dish/i).first().click();
    await page.getByPlaceholder(/search/i).fill('tomato rice');
    await page.getByText('Tomato Rice').first().click();
    await expect(page.getByRole('heading', { name: 'Tomato Rice' })).toBeVisible();
    await page.getByText(/back to the week/i).click();

    await save(page);

    // Go to Start next week and save this week as template
    await page.goto('/start-next-week?srcOffset=0&targetOffset=1');
    await page.getByRole('button', { name: /save this week as a template/i }).click();

    await page.getByPlaceholder(/summer favourites/i).fill('Holiday Feast Week');
    await page.getByPlaceholder(/quick dinners/i).fill('Special family picks');
    await page.getByRole('button', { name: /save template/i }).click();

    // Verify the newly saved week template appears in the list
    await expect(page.getByText('Holiday Feast Week')).toBeVisible();

    // Now start next week from "Holiday Feast Week"
    await page.getByRole('button', { name: /holiday feast week/i }).click();

    const replaceBtn = page.getByRole('button', { name: /replace them/i });
    if (await replaceBtn.isVisible()) {
      await replaceBtn.click();
    }

    await expect(page).toHaveURL(/\/week$/);

    // In the target week, verify Monday and Tuesday picks were reproduced
    await page.getByRole('button', { name: 'Next week' }).click();

    // Monday has Paneer Paratha & Curd
    await page.getByRole('button').filter({ hasText: 'MON' }).first().click();
    await expect(page.getByRole('heading', { name: 'Paneer Paratha & Curd' })).toBeVisible();
    await page.getByText(/back to the week/i).click();

    // Tuesday has Tomato Rice
    await page.getByRole('button').filter({ hasText: 'TUE' }).first().click();
    await expect(page.getByRole('heading', { name: 'Tomato Rice' })).toBeVisible();
  });

  test('4. shuffle puts no dish in the same weekday+slot', async ({ page }) => {
    await goToWeek(page);

    // In Monday: pick Paneer Paratha for Breakfast and Tomato Rice for Dinner
    await page.getByRole('button').filter({ hasText: 'MON' }).first().click();

    // Fill Breakfast (slot 0)
    await page.getByText(/choose a dish/i).first().click();
    await page.getByPlaceholder(/search/i).fill('paneer');
    await page.getByText('Paneer Paratha & Curd').first().click();
    await expect(page.getByRole('heading', { name: 'Paneer Paratha & Curd' })).toBeVisible();

    // Fill Dinner (slot 2)
    await page.locator('div.border-t.border-dashed').nth(2).getByText(/choose a dish/i).click();
    await page.getByPlaceholder(/search/i).fill('tomato rice');
    await page.getByText('Tomato Rice').first().click();
    await expect(page.getByRole('heading', { name: 'Tomato Rice' })).toBeVisible();

    await page.getByText(/back to the week/i).click();
    await save(page);

    // Go to Start next week and click Shuffle repeats
    await page.goto('/start-next-week?srcOffset=0&targetOffset=1');
    await page.getByRole('button', { name: /shuffle repeats/i }).first().click();

    const replaceBtn = page.getByRole('button', { name: /replace them/i });
    if (await replaceBtn.isVisible()) {
      await replaceBtn.click();
    }

    await expect(page).toHaveURL(/\/week$/);

    // Go to next week
    await page.getByRole('button', { name: 'Next week' }).click();
    await page.getByRole('button').filter({ hasText: 'MON' }).first().click();

    // In the shuffled week, the Breakfast and Dinner slots swapped:
    // Breakfast does NOT have Paneer Paratha
    // Dinner does NOT have Tomato Rice
    const firstMeal = page.locator('div.border-t.border-dashed').nth(0);
    const dinnerMeal = page.locator('div.border-t.border-dashed').nth(2);

    await expect(firstMeal).toContainText('Tomato Rice');
    await expect(dinnerMeal).toContainText('Paneer Paratha & Curd');
  });

  test('5. changing household in Settings changes inherited servings on the day plan', async ({ page }) => {
    // Navigate to Settings
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

    // Default household size is 3
    const countDisplay = page.getByTestId('household-count');
    await expect(countDisplay).toHaveText('3');

    // Increase household size to 4 (+1)
    await page.getByRole('button', { name: 'More people' }).click();
    await expect(countDisplay).toHaveText('4');

    // Go to Day plan for Monday
    await goToWeek(page);
    await page.getByRole('button').filter({ hasText: 'MON' }).first().click();

    // Servings input placeholder inherits from household (now 4)
    const servingsField = page.getByLabel('Servings').first();
    await expect(servingsField).toHaveAttribute('placeholder', '4');
  });
});
