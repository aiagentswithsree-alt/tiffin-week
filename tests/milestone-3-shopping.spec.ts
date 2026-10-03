import { test, expect, Page } from '@playwright/test';

/**
 * Milestone 3 acceptance checks — N6 Shopping list.
 * Absorbs Wireframe 22 (Shopping list) and Wireframe 23 (Pantry staples).
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

const goToShopping = async (page: Page) => {
  await page.getByRole('link', { name: /shopping/i }).click();
  await expect(page).toHaveURL(/\/shopping$/);
};

test.describe('N6 — shopping list', () => {
  test.beforeEach(async ({ page }) => {
    await onboard(page, ['Home meals']);
  });

  test('1. navigates to shopping list and renders Wireframe 22 structure', async ({ page }) => {
    await goToShopping(page);
    await expect(page.getByRole('heading', { name: /shopping list/i })).toBeVisible();
    await expect(page.getByText(/buy sunday/i)).toBeVisible();
    await expect(page.getByText(/fresh midweek/i)).toBeVisible();
    await expect(page.getByText(/amounts are estimates/i)).toBeVisible();
  });

  test('2. perishables for Monday dishes land in Buy Sunday (not Fresh midweek)', async ({ page }) => {
    // Pick Paneer Paratha on Monday
    await goToWeek(page);
    await page.getByRole('button').filter({ hasText: 'MON' }).first().click();
    await page.getByText(/choose a dish/i).first().click();
    await page.getByPlaceholder(/search/i).fill('paneer');
    await page.getByText('Paneer Paratha & Curd').first().click();

    // Check shopping list
    await goToShopping(page);

    // Question 1 rule: Paneer needed Mon–Tue MUST be in "Buy Sunday"
    await expect(page.getByText(/fresh paneer/i)).toBeVisible();
    await expect(page.getByText(/paneer paratha/i).first()).toBeVisible();
    await expect(page.getByText(/est\./i).first()).toBeVisible();

    // Verify Fresh midweek does NOT contain Monday's paneer
    await page.getByRole('button', { name: /fresh midweek/i }).click();
    await expect(page.getByText(/fresh paneer/i)).toHaveCount(0);
  });

  test('3. perishables cooked Thursday onwards land in Fresh midweek', async ({ page }) => {
    // Pick Cucumber Butter Sandwich on Thursday
    await goToWeek(page);
    await page.getByRole('button').filter({ hasText: 'THU' }).first().click();
    await page.getByText(/choose a dish/i).first().click();
    await page.getByRole('button', { name: /^all/i }).first().click();
    await page.getByPlaceholder(/search/i).fill('cucumber');
    await page.getByText('Cucumber Butter Sandwich Rounds').first().click();

    // Check shopping list
    await goToShopping(page);

    // Delicate cucumber on Thursday lands in "Fresh midweek"
    await page.getByRole('button', { name: /fresh midweek/i }).click();
    await expect(page.getByText(/english cucumber/i)).toBeVisible();
    await expect(page.getByText(/bread/i).first()).toBeVisible();

    // Shelf-stable butter lands in "Buy Sunday"
    await page.getByRole('button', { name: /buy sunday/i }).click();
    await expect(page.getByText(/butter/i).first()).toBeVisible();
  });

  test('4. tentative group with shop=false is excluded from shopping list', async ({ page }) => {
    await goToWeek(page);
    await page.getByRole('button').filter({ hasText: 'MON' }).first().click();

    // Pick a dish
    await page.getByText(/choose a dish/i).first().click();
    await page.getByPlaceholder(/search/i).fill('paneer');
    await page.getByText('Paneer Paratha & Curd').first().click();

    // Set group attendance to Tentative
    await page.getByRole('button', { name: /^tentative$/i }).click();

    // Explicitly set shop=false via "Remove from shopping list" if it's on the list
    const removeBtn = page.getByRole('button', { name: /remove from shopping list/i });
    if (await removeBtn.isVisible()) {
      await removeBtn.click();
    }
    await expect(page.getByText(/tentative — not on the shopping list/i)).toBeVisible();

    // Check shopping list — should NOT include the dish
    await goToShopping(page);
    await expect(page.getByText(/fresh paneer/i)).toHaveCount(0);
    await expect(page.getByText(/from 0 picked dishes/i)).toBeVisible();
  });

  test('5. tentative group with shop=true includes ingredients in shopping list', async ({ page }) => {
    await goToWeek(page);
    await page.getByRole('button').filter({ hasText: 'MON' }).first().click();

    // Pick a dish
    await page.getByText(/choose a dish/i).first().click();
    await page.getByPlaceholder(/search/i).fill('paneer');
    await page.getByText('Paneer Paratha & Curd').first().click();

    // Set group attendance to Tentative
    await page.getByRole('button', { name: /^tentative$/i }).click();

    // Ensure shop=true via "Buy ingredients anyway" if not already on list
    const buyBtn = page.getByRole('button', { name: /buy ingredients anyway/i });
    if (await buyBtn.isVisible()) {
      await buyBtn.click();
    }
    await expect(page.getByText(/ingredients ARE on the shopping list/i)).toBeVisible();

    // Check shopping list — MUST now include the dish ingredients
    await goToShopping(page);
    await expect(page.getByText(/fresh paneer/i)).toBeVisible();
    await expect(page.getByText(/from 1 picked dish/i)).toBeVisible();
  });

  test('6. items can be interactively checked off while shopping', async ({ page }) => {
    await goToWeek(page);
    await page.getByRole('button').filter({ hasText: 'MON' }).first().click();
    await page.getByText(/choose a dish/i).first().click();
    await page.getByText('Methi Thepla with Chhundo').first().click();

    await goToShopping(page);
    const item = page.getByText(/wheat flour/i).first();
    await expect(item).toBeVisible();

    // Toggle check
    await item.click();
    await expect(item).toHaveClass(/line-through/);
  });

  test('7. hides pantry staples with count and allows moving running low staples to list', async ({ page }) => {
    await goToShopping(page);
    const pantryBtn = page.getByText(/staples hidden/i);
    await expect(pantryBtn).toBeVisible();

    // Open pantry drawer
    await pantryBtn.click();
    await expect(page.getByRole('heading', { name: /^pantry$/i })).toBeVisible();

    // Toggle a staple switch to running low
    const stapleSwitch = page.getByRole('switch').first();
    await expect(stapleSwitch).toBeVisible();
    await stapleSwitch.click();
    await expect(page.getByText(/running low/i).first()).toBeVisible();

    // Close pantry drawer
    await page.getByRole('button', { name: /^done$/i }).click();
    await expect(page.getByRole('heading', { name: /^pantry$/i })).toBeHidden();

    // The staple is now on the active shopping list with running low tag
    await expect(page.getByText(/running low/i).first()).toBeVisible();
  });

  test('8. exact numeric scaling: 3 servings of Paneer Paratha computes 3 × 50 g = 150 g paneer', async ({ page }) => {
    // Pick Paneer Paratha on Monday
    await goToWeek(page);
    await page.getByRole('button').filter({ hasText: 'MON' }).first().click();
    await page.getByText(/choose a dish/i).first().click();
    await page.getByPlaceholder(/search/i).fill('paneer');
    await page.getByText('Paneer Paratha & Curd').first().click();

    // Check shopping list: effective serves is 3 (from household=3).
    // Paneer perServe = 50 g -> 3 * 50 g = 150 g.
    await goToShopping(page);
    const paneerRow = page.locator('div').filter({ hasText: /fresh paneer/i }).first();
    await expect(paneerRow).toBeVisible();
    await expect(paneerRow).toContainText('150 g');
    await expect(paneerRow).toContainText('est.');
  });
});
