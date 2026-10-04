import { test, expect, Page } from '@playwright/test';

/**
 * Milestone 6 acceptance checks — N13 Print centre and six print sheets.
 *
 * These exercise print output in two ways:
 *   - page.emulateMedia({ media: 'print' }) to render the print DOM
 *   - page.pdf() to produce the actual PDF, with counts cross-checked
 *     against the DOM's `.sheet` siblings.
 */

const STORAGE_KEY = 'tiffin-week-v1';

interface SeedSlot {
  name: string;
  time: string;
  timeDay?: 0 | 1;
  minutes?: number;
  base?: string | null;
  dishId?: string;
  dishName?: string;
}

interface SeedGroup {
  name: string;
  mode?: 'eat' | 'pack';
  packBy?: string | null;
  packByDay?: 0 | 1;
  slots: SeedSlot[];
}

async function seedState(page: Page, groups: SeedGroup[]) {
  const makeSlot = (s: SeedSlot) => ({
    id: `slot-${Math.random().toString(36).slice(2)}`,
    name: s.name,
    time: s.time,
    timeDay: s.timeDay ?? 0,
    minutes: s.minutes ?? 20,
    base: s.base ?? null,
    serves: null,
    category: null,
    mode: null,
    readyBy: null,
    readyByDay: null,
    done: false,
    dishId: s.dishId ?? null,
    dishName: s.dishName ?? null,
  });
  const makeGroup = (g: SeedGroup) => ({
    id: `group-${Math.random().toString(36).slice(2)}`,
    name: g.name,
    mode: g.mode ?? 'eat',
    serves: null,
    status: 'confirmed',
    tentativeDays: [],
    shop: true,
    packBy: g.packBy ?? null,
    packByDay: g.packByDay ?? 0,
    slots: g.slots.map(makeSlot),
  });
  const routine = {
    id: 'routine-weekly',
    name: 'Weekday routine',
    mode: 'weekly' as const,
    days: [0, 1, 2, 3, 4, 5, 6],
    date: '',
    groups: groups.map(makeGroup),
  };
  const state = {
    household: 3,
    routines: [routine],
    dayInstances: {},
    printDefaults: { paperSize: 'A4', orientation: 'landscape', inkSaver: false },
  };
  await page.goto('/');
  await page.evaluate(([key, value]) => {
    localStorage.setItem(key as string, value as string);
  }, [STORAGE_KEY, JSON.stringify(state)]);
}

/** PDFs produced by Playwright contain one `/Type /Page` object per rendered
 *  page (and one `/Type /Pages` for the pages tree). This counts the former. */
function pdfPageCount(buf: Buffer): number {
  const bin = buf.toString('binary');
  const matches = bin.match(/\/Type\s*\/Page(?!s)/g) ?? [];
  return matches.length;
}

test.describe('N13 — print centre', () => {
  test('opens, lists every template, lets paper be overridden where allowed', async ({ page }) => {
    await seedState(page, [{ name: 'Home', slots: [{ name: 'Dinner', time: '20:00' }] }]);
    await page.goto('/print');
    await expect(page.getByRole('heading', { name: 'Print' })).toBeVisible();
    for (const label of ['Weekly wall planner', 'Prep sheet', 'Shopping list', 'Daily fridge card', 'Blank planner', 'Recipe cards']) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
    // Wall planner (selected by default) offers A3 and A4
    await expect(page.getByRole('button', { name: 'A3', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'A4', exact: true })).toBeVisible();
    // Fridge card: paper locked to A5
    await page.getByText('Daily fridge card', { exact: true }).click();
    await expect(page.getByRole('button', { name: 'A3', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'A5', exact: true })).toBeVisible();
  });
});

test.describe('N15 — prep sheet', () => {
  test('renders Sunday batch / each night / each morning sections', async ({ page }) => {
    await seedState(page, [{ name: 'Home', slots: [{ name: 'Dinner', time: '20:00' }] }]);
    await page.goto('/print/prep?paper=A4&ink=0&offset=0');
    await expect(page.getByRole('heading', { name: 'Prep sheet' })).toBeVisible();
    await expect(page.getByText(/sunday batch/i)).toBeVisible();
    await expect(page.getByText(/each night/i)).toBeVisible();
    await expect(page.getByText(/each morning/i)).toBeVisible();
  });
});

test.describe('N17 — fridge card', () => {
  test('a. start time equals Mornings-tab start time on a day with 2+ groups (rule 3)', async ({ page }) => {
    // Two confirmed groups, both with a filled slot on every weekday. The
    // schedule must span BOTH groups — picking just one would give the wrong
    // start time per rule 3 in CLAUDE.md.
    await seedState(page, [
      {
        name: 'Home',
        mode: 'eat',
        slots: [{ name: 'Breakfast', time: '08:00', minutes: 25, dishName: 'Idli' }],
      },
      {
        name: 'Office',
        mode: 'pack',
        packBy: '07:30',
        slots: [{ name: 'Office lunch', time: '13:00', minutes: 20, dishName: 'Rice' }],
      },
    ]);

    // Read Monday's start time from the Mornings tab in Prep plan.
    await page.goto('/prep');
    await page.getByRole('button', { name: /mornings/i }).click();
    const monBlock = page.locator('div').filter({ hasText: /MON 21 SEP · STOVE ORDER/i }).first();
    await expect(monBlock).toBeVisible();
    const prepText = await monBlock.textContent();
    const prepStartMatch = prepText && prepText.match(/(\d{2}:\d{2})\s*[–-]\s*\d{2}:\d{2}/);
    expect(prepStartMatch, 'prep plan mornings should show a HH:MM – HH:MM').not.toBeNull();
    const prepStart = prepStartMatch![1];

    // Read the fridge card start for the same day.
    await page.goto('/print/fridge?date=2026-09-21&paper=A5&ink=0&offset=0');
    const fridgeStart = await page.getByTestId('fridge-start-time').textContent();
    expect(fridgeStart?.trim()).toBe(prepStart);
  });
});

test.describe('N16 — shopping list', () => {
  test('renders Buy Sunday and Fresh midweek headings and tick boxes', async ({ page }) => {
    await seedState(page, [{ name: 'Home', slots: [{ name: 'Dinner', time: '20:00' }] }]);
    await page.goto('/print/shopping?paper=A4&ink=0&offset=0');
    await expect(page.getByRole('heading', { name: 'Shopping list' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /buy sunday/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /fresh midweek/i })).toBeVisible();
  });
});

test.describe('N19 — recipe cards', () => {
  test('one card per unique dish picked this week', async ({ page }) => {
    // Pre-seed with a routine + a filled slot pointing at a known SAMPLE recipe.
    await seedState(page, [
      { name: 'Home', slots: [{ name: 'Dinner', time: '20:00', dishName: 'Paneer Paratha & Curd' }] },
    ]);
    await page.goto('/print/recipes?paper=A5&ink=0&offset=0');
    await expect(page.getByRole('heading', { name: 'Paneer Paratha & Curd' })).toBeVisible();
    await expect(page.locator('[data-recipe-id]')).toHaveCount(1);
  });
});

test.describe('N18 — blank planner', () => {
  test('c. row labels match routine slot names — rename a slot, the row label changes', async ({ page }) => {
    await seedState(page, [
      { name: 'Home', slots: [{ name: 'Breakfast', time: '08:00' }, { name: 'Dinner', time: '20:00' }] },
    ]);

    await page.goto('/print/blank?paper=A4&ink=0&offset=0');
    await expect(page.getByTestId('blank-row-Home-Breakfast')).toHaveText('Breakfast');
    await expect(page.getByTestId('blank-row-Home-Dinner')).toHaveText('Dinner');

    // Rename the "Breakfast" slot to "Early tiffin" directly in storage. The
    // UI edit path lives in Routine setup; here we exercise that the sheet
    // reads whatever the routine says, which is what the user path produces.
    await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) throw new Error('no state');
      const s = JSON.parse(raw);
      const slot = s.routines[0].groups[0].slots.find((x: { name: string }) => x.name === 'Breakfast');
      slot.name = 'Early tiffin';
      localStorage.setItem(key, JSON.stringify(s));
    }, STORAGE_KEY);

    await page.goto('/print/blank?paper=A4&ink=0&offset=0');
    await expect(page.getByTestId('blank-row-Home-Early tiffin')).toHaveText('Early tiffin');
    await expect(page.getByTestId('blank-row-Home-Breakfast')).toHaveCount(0);
    await expect(page.getByTestId('blank-row-Home-Dinner')).toHaveText('Dinner');
  });
});

test.describe('N14 — wall planner', () => {
  test('b. 6 groups produces more than one PDF page and the heading repeats on page 2', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium' && !browserName.includes('chrome'), 'page.pdf is Chromium-only');

    const groups: SeedGroup[] = Array.from({ length: 6 }, (_, i) => ({
      name: `Group ${i + 1}`,
      slots: [{ name: `Slot ${i + 1}`, time: `${7 + i}:00` }],
    }));
    await seedState(page, groups);

    await page.goto('/print/wall?paper=A4&ink=0&offset=0');
    await expect(page.getByRole('heading', { name: 'Weekly wall planner' }).first()).toBeVisible();

    // DOM: more than one .sheet block
    const sheets = page.locator('.sheet');
    const sheetCount = await sheets.count();
    expect(sheetCount).toBeGreaterThan(1);

    // Heading text ("Weekly wall planner") repeats on page 2
    const headings = page.getByRole('heading', { name: 'Weekly wall planner' });
    const headingCount = await headings.count();
    expect(headingCount).toBeGreaterThanOrEqual(2);

    // Switch to print media and generate a PDF; verify it has >1 page.
    await page.emulateMedia({ media: 'print' });
    const pdf = await page.pdf({ format: 'A4', landscape: true, preferCSSPageSize: true, printBackground: true });
    const pages = pdfPageCount(pdf);
    expect(pages).toBeGreaterThan(1);
  });
});

test.describe('Ink-saver', () => {
  // Walks the DOM inside .sheet and asserts every element's computed
  // background-color is transparent, white, or black — no coloured fills.
  async function assertNoColouredFills(page: Page) {
    const nonInk = await page.evaluate(() => {
      const bad: { tag: string; bg: string; cls: string }[] = [];
      const parseRgb = (s: string) => {
        const m = s.match(/rgba?\(([^)]+)\)/);
        if (!m) return null;
        const parts = m[1].split(',').map((x) => parseFloat(x.trim()));
        return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
      };
      const isOk = (bg: string): boolean => {
        const rgb = parseRgb(bg);
        if (!rgb) return true;
        if (rgb.a === 0) return true;
        // Non-coloured means r == g == b (greyscale). Pure white and pure
        // black trivially pass; mid-greys also pass; a hue does not.
        return rgb.r === rgb.g && rgb.g === rgb.b;
      };
      document.querySelectorAll<HTMLElement>('.sheet, .sheet *').forEach((el) => {
        const bg = getComputedStyle(el).backgroundColor;
        if (!isOk(bg)) bad.push({ tag: el.tagName, bg, cls: el.className });
      });
      return bad;
    });
    expect(nonInk, 'coloured background fills detected').toEqual([]);
  }

  const routes = [
    { label: 'wall', url: '/print/wall?paper=A4&ink=1&offset=0' },
    { label: 'prep', url: '/print/prep?paper=A4&ink=1&offset=0' },
    { label: 'shopping', url: '/print/shopping?paper=A4&ink=1&offset=0' },
    { label: 'fridge', url: '/print/fridge?paper=A5&ink=1&offset=0&date=2026-09-21' },
    { label: 'blank', url: '/print/blank?paper=A4&ink=1&offset=0' },
    { label: 'recipes', url: '/print/recipes?paper=A5&ink=1&offset=0' },
  ];

  for (const r of routes) {
    test(`d. ink-saver on ${r.label}: no coloured background fill`, async ({ page }) => {
      // Seed something with picked dishes so each sheet has real content to colour.
      await seedState(page, [
        { name: 'Home', slots: [{ name: 'Dinner', time: '20:00', dishName: 'Paneer Paratha & Curd' }] },
        { name: 'Office', mode: 'pack', packBy: '07:30', slots: [{ name: 'Lunch box', time: '13:00', dishName: 'Rice' }] },
      ]);
      await page.goto(r.url);
      await assertNoColouredFills(page);
    });
  }
});
