import { test, expect, Page } from '@playwright/test';

/**
 * Milestone 4 acceptance checks — Library:
 * N10 Recipe editor (Wireframe 26) & N9 Bases library (Wireframe 25).
 *
 * User Acceptance Criteria:
 * 1. Editing paneer to a real amount in Paneer Paratha changes the number on the shopping list and removes "est." there.
 * 2. Linking a base in the editor makes it appear in the prep plan.
 * 3. Reload after editing a recipe keeps the edit.
 * 4. Serves stepper in editor rescales every amount.
 * 5. Bases library lists bases with lead time, keeps, batch size, used-by count, and allows adding a new base.
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
  await page.goto('/week');
  await expect(page).toHaveURL(/\/week$/);
};

const goToShopping = async (page: Page) => {
  await page.goto('/shopping');
  await expect(page).toHaveURL(/\/shopping$/);
};

const goToPrep = async (page: Page) => {
  await page.goto('/prep');
  await expect(page).toHaveURL(/\/prep$/);
};

test.describe('Milestone 4 — Library (Recipe editor & Bases library)', () => {
  test.beforeEach(async ({ page }) => {
    await onboard(page, ['Home meals']);
  });

  test('1. Editing paneer to a real amount in Paneer Paratha changes the number on the shopping list and removes "est." there', async ({ page }) => {
    // Step 1: Pick Paneer Paratha on Monday
    await goToWeek(page);
    await page.getByRole('button').filter({ hasText: 'MON' }).first().click();
    await page.getByText(/choose a dish/i).first().click();
    await page.getByPlaceholder(/search/i).fill('paneer');
    await page.getByText('Paneer Paratha & Curd').first().click();

    // Step 2: Verify initially on shopping list that paneer has 150 g with "est."
    await goToShopping(page);
    const paneerItemInitial = page.locator('div.divide-y > div').filter({ hasText: /fresh paneer/i });
    await expect(paneerItemInitial).toBeVisible();
    await expect(paneerItemInitial).toContainText('150 g');
    await expect(paneerItemInitial).toContainText('est.');

    // Step 3: Open Recipe Editor for Paneer Paratha (r10)
    await page.goto('/recipes/r10');
    await expect(page.getByRole('heading', { name: /edit recipe/i })).toBeVisible();

    // Verify paneer amount field initially has 150 and est. tag next to it
    const paneerInput = page.getByLabel(/paneer amount/i);
    await expect(paneerInput).toHaveValue('150');

    // Step 4: Type over estimated amount to make it real (200 g)
    await paneerInput.fill('200');

    // Click Save
    await page.getByRole('button', { name: /^save$/i }).click();
    await expect(page).toHaveURL(/\/week$/);

    // Step 5: Verify on shopping list: paneer amount is now 200 g and "est." is removed
    await goToShopping(page);
    const paneerItemUpdated = page.locator('div.divide-y > div').filter({ hasText: /fresh paneer/i });
    await expect(paneerItemUpdated).toBeVisible();
    await expect(paneerItemUpdated).toContainText('200 g');
    // Ensure the "est." tag is no longer inside the paneer item row
    await expect(paneerItemUpdated.locator('text="est."')).toHaveCount(0);
  });

  test('2. Linking a base in the editor makes it appear in the prep plan', async ({ page }) => {
    // Pick Paneer Paratha on Monday
    await goToWeek(page);
    await page.getByRole('button').filter({ hasText: 'MON' }).first().click();
    await page.getByText(/choose a dish/i).first().click();
    await page.getByPlaceholder(/search/i).fill('paneer');
    await page.getByText('Paneer Paratha & Curd').first().click();

    // Go to prep plan before linking gravy base — Sunday batch should not have Onion-tomato base gravy task
    await goToPrep(page);
    await expect(page.getByText('Onion-tomato base gravy · 1 batch')).toHaveCount(0);

    // Open Recipe Editor for Paneer Paratha
    await page.goto('/recipes/r10');
    await expect(page.getByRole('heading', { name: /edit recipe/i })).toBeVisible();

    // Link "Onion-tomato base gravy" base
    await page.getByRole('button', { name: /\+ link a base/i }).click();
    await page.getByRole('button', { name: /onion-tomato base gravy/i }).first().click();

    // Save recipe
    await page.getByRole('button', { name: /^save$/i }).click();
    await expect(page).toHaveURL(/\/week$/);

    // Go to Prep plan — Onion-tomato base gravy now appears in the prep plan
    await goToPrep(page);
    await expect(page.getByText('Onion-tomato base gravy · 1 batch')).toBeVisible();
  });

  test('3. Reload after editing a recipe keeps the edit', async ({ page }) => {
    // Open Recipe Editor for Paneer Paratha
    await page.goto('/recipes/r10');
    await expect(page.getByRole('heading', { name: /edit recipe/i })).toBeVisible();

    // Change dish name
    const nameInput = page.getByLabel(/dish name/i);
    await nameInput.fill('Super Crispy Paneer Paratha');

    // Save
    await page.getByRole('button', { name: /^save$/i }).click();
    await expect(page).toHaveURL(/\/week$/);

    // Reload browser page
    await page.reload();

    // Return to Recipe Editor for r10
    await page.goto('/recipes/r10');
    await expect(page.getByRole('heading', { name: /edit recipe/i })).toBeVisible();

    // The edited dish name persists!
    await expect(page.getByLabel(/dish name/i)).toHaveValue('Super Crispy Paneer Paratha');
  });

  test('4. Serves stepper rescales every ingredient amount proportionally', async ({ page }) => {
    await page.goto('/recipes/r10');
    await expect(page.getByRole('heading', { name: /edit recipe/i })).toBeVisible();

    // Default serves is 3, paneer amount is 150
    const paneerInput = page.getByLabel(/paneer amount/i);
    await expect(paneerInput).toHaveValue('150');

    // Increase serves to 4 (+1)
    await page.getByRole('button', { name: /more servings/i }).click();
    await expect(page.getByText('4', { exact: true })).toBeVisible();

    // 150 * (4 / 3) = 200
    await expect(paneerInput).toHaveValue('200');

    // Decrease serves to 2 (-2)
    await page.getByRole('button', { name: /fewer servings/i }).click();
    await page.getByRole('button', { name: /fewer servings/i }).click();
    await expect(page.getByText('2', { exact: true })).toBeVisible();

    // 200 * (2 / 4) = 100
    await expect(paneerInput).toHaveValue('100');
  });

  test('5. Bases library displays lead time, keeps, batch size, used-by count, and adds a new base', async ({ page }) => {
    await page.goto('/bases');
    await expect(page.getByRole('heading', { name: /bases & preps/i })).toBeVisible();

    // Check filter pills from Wireframe 25
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cook a base' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Soak', exact: true })).toBeVisible();

    // Verify existing base card metadata
    await expect(page.getByText('Onion-tomato base gravy')).toBeVisible();
    await expect(page.getByText(/lead/i).first()).toBeVisible();
    await expect(page.getByText(/keeps/i).first()).toBeVisible();
    await expect(page.getByText(/batch/i).first()).toBeVisible();
    await expect(page.getByText(/used by/i).first()).toBeVisible();

    // Add a new base
    await page.getByRole('button', { name: /\+ new base or prep/i }).click();
    await page.getByPlaceholder(/sambar paste/i).fill('Spiced Ginger Garlic Paste');
    await page.getByPlaceholder(/overnight/i).fill('10 min');
    await page.getByPlaceholder(/4 days/i).fill('1 month');
    await page.getByPlaceholder(/4 dishes/i).fill('2 jars');

    await page.getByRole('button', { name: /save base/i }).click();

    // Newly added base appears in library
    await expect(page.getByText('Spiced Ginger Garlic Paste')).toBeVisible();
    await expect(page.getByText('10 min', { exact: true })).toBeVisible();
    await expect(page.getByText('1 month', { exact: true })).toBeVisible();
  });

  test('6. Migration: old-shape state without recipes or bases seeds them on load and picked dishes still render', async ({ page }) => {
    // 1. Clear and write old-shape state (Milestone 2/3 style, without recipes or bases keys)
    await page.goto('/');
    await page.evaluate(() => {
      const oldState = {
        household: 3,
        routines: [
          {
            id: 'rt-regular',
            name: 'Regular',
            mode: 'weekly',
            days: [0, 1, 2, 3, 4],
            date: '',
            groups: [
              {
                id: 'grp-home',
                name: 'Home',
                mode: 'eat',
                serves: null,
                status: 'confirmed',
                tentativeDays: [],
                shop: true,
                packBy: null,
                packByDay: 0,
                slots: [
                  {
                    id: 's-bfast',
                    name: 'Breakfast',
                    time: '07:30',
                    timeDay: 0,
                    minutes: 18,
                    base: 'one batter',
                    serves: null,
                    category: 'Rotis & dosas',
                    mode: null,
                    readyBy: null,
                    readyByDay: null,
                    done: false,
                    dishId: 'r10',
                    dishName: 'Paneer Paratha & Curd',
                  },
                ],
              },
            ],
          },
        ],
        dayInstances: {},
      };
      localStorage.setItem('tiffin-week-v1', JSON.stringify(oldState));
    });

    // 2. Reload page to trigger state load & migration fallback
    await page.goto('/week');
    await expect(page).toHaveURL(/\/week$/);

    // 3. Confirm picked dishes still render in DayPlan
    await page.getByRole('button').filter({ hasText: 'MON' }).first().click();
    await expect(page.getByText('Paneer Paratha & Curd')).toBeVisible();

    // 4. Confirm recipes and bases were seeded into store:
    // Check shopping list has paneer
    await page.goto('/shopping');
    await expect(page.getByText(/fresh paneer/i)).toBeVisible();

    // Check bases library loaded default bases
    await page.goto('/bases');
    await expect(page.getByText('Onion-tomato base gravy')).toBeVisible();
  });

  test('7. Deleting a base that recipes link to blocks with a message or cleans up references without dangling ids', async ({ page }) => {
    await page.goto('/bases');
    await expect(page.getByRole('heading', { name: /bases & preps/i })).toBeVisible();

    // Attempt to delete "One pot of rice" which is linked to dishes in recipes
    await page.getByRole('button', { name: /delete one pot of rice/i }).click();

    // Blocking message is displayed
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByText(/cannot delete/i)).toBeVisible();

    // Click "Clean up references & delete"
    await page.getByRole('button', { name: /clean up references & delete/i }).click();

    // Base is removed from the library
    await expect(page.getByText('One pot of rice')).toBeHidden();
  });

  test('8. Deleting a recipe that is in a slot blocks with a message or cleans up slot references', async ({ page }) => {
    // Assign recipe r10 (Paneer Paratha & Curd) to a slot on Monday
    await goToWeek(page);
    await page.getByRole('button').filter({ hasText: 'MON' }).first().click();
    await page.getByText(/choose a dish/i).first().click();
    await page.getByPlaceholder(/search/i).fill('paneer');
    await page.getByText('Paneer Paratha & Curd').first().click();
    await expect(page.getByRole('heading', { name: 'Paneer Paratha & Curd' })).toBeVisible();

    // Go to recipe editor for r10
    await page.goto('/recipes/r10');
    await expect(page.getByRole('heading', { name: /edit recipe/i })).toBeVisible();

    // Click Delete recipe
    await page.getByRole('button', { name: /delete recipe/i }).click();

    // Blocking alert is displayed
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByText(/cannot delete/i)).toBeVisible();

    // Click "Clean up slot references & delete"
    await page.getByRole('button', { name: /clean up slot references & delete/i }).click();

    // Redirected back to week view
    await expect(page).toHaveURL(/\/week$/);

    // Verify Monday slot no longer has dangling recipe; reverts to "Choose a dish"
    await page.getByRole('button').filter({ hasText: 'MON' }).first().click();
    await expect(page.getByRole('heading', { name: 'Paneer Paratha & Curd' })).toBeHidden();
    await expect(page.getByText(/choose a dish/i).first()).toBeVisible();
  });
});
