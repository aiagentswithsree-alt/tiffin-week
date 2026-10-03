import { addDays, DAY_NAMES, fromMinutes, weekdayOf } from './dates';
import { readyOf, servesOf } from './inheritance';
import { resolveDay } from './days';
import { cookPlan } from './schedule';
import { SAMPLE_RECIPES } from '../data/recipes';
import { DEFAULT_BASES } from '../data/bases';
import type { AppState, CookPlan, RecipeItem } from '../types';

export type PrepKind =
  | 'cook a base'
  | 'grind + ferment overnight'
  | 'soak'
  | 'sprout'
  | 'roast'
  | 'cut'
  | 'knead'
  | 'thaw'
  | 'shared base'
  | 'cook fresh';

export interface PrepTask {
  id: string;
  title: string;
  kind: PrepKind;
  keeps: string;
  dishes: string[];
  mins: number;
  session: 'sunday' | 'nightly' | 'mornings';
  dayIndex?: number;
  dayName?: string;
  timeRange?: string;
  shared?: boolean;
}

export interface LeadTimeNotice {
  id: string;
  nightLabel: string; // e.g. "Mon night"
  nightDate: Date;
  notice: string;
  dishName: string;
  forMeal: string;
}

export interface PrepPlanResult {
  sundayTasks: PrepTask[];
  sundayTotalMins: number;
  nightlyByDay: {
    nightLabel: string;
    nightDate: Date;
    tasks: PrepTask[];
    totalMins: number;
  }[];
  morningsByDay: {
    dayLabel: string;
    dayDate: Date;
    cook: CookPlan;
    tasks: PrepTask[];
  }[];
  leadNotices: LeadTimeNotice[];
  totalDishesCount: number;
}

interface ScheduledDish {
  dish: RecipeItem;
  dayIndex: number;
  dayDate: Date;
  cookDate: Date;
  groupName: string;
  slotName: string;
  serves: number;
  readyDayOffset: number;
}

export function buildPrepPlan(state: AppState, offset: number = 0): PrepPlanResult {
  const dates = Array.from({ length: 7 }, (_, i) => addDays(new Date(2026, 8, 21 + offset * 7), i));
  const recipes = state.recipes && state.recipes.length > 0 ? state.recipes : SAMPLE_RECIPES;
  const bases = state.bases && state.bases.length > 0 ? state.bases : DEFAULT_BASES;

  const scheduledDishes: ScheduledDish[] = [];
  let totalDishesCount = 0;

  dates.forEach((d, dayIndex) => {
    const plan = resolveDay(state, d);
    for (const g of plan.groups) {
      if ((g.status ?? 'confirmed') !== 'confirmed') continue;
      for (const s of g.slots) {
        if (!s.dishId && !s.dishName) continue;
        totalDishesCount++;

        const recipe =
          recipes.find((r) => r.id === s.dishId || r.name.toLowerCase() === (s.dishName || '').toLowerCase()) ??
          {
            id: s.dishId || 'custom',
            name: s.dishName || 'Custom dish',
            category: s.category || 'Quick & light',
            prepTime: '5 min',
            cookTime: `${s.minutes || 10} min`,
            cookMinutes: s.minutes || 10,
            base: s.base,
            ingredients: [],
            steps: [],
          };

        const ready = readyOf(g, s);
        const cookDate = addDays(d, ready.day);

        // A recipe is a LIBRARY item: editing its base changes every day that uses that dish
        const effectiveBase = recipe.base ?? s.base ?? null;

        scheduledDishes.push({
          dish: { ...recipe, base: effectiveBase },
          dayIndex,
          dayDate: d,
          cookDate,
          groupName: g.name,
          slotName: s.name,
          serves: servesOf(g, s, state.household),
          readyDayOffset: ready.day,
        });
      }
    }
  });

  // 1. Sunday Batch Session
  const sundayTasks: PrepTask[] = [];

  const getIngNames = (dish: RecipeItem) =>
    dish.ingredients.map((i) => (typeof i === 'string' ? i : i.name));

  // Match batch bases from scheduled dishes
  const batterDishes = scheduledDishes.filter(
    (x) =>
      x.dish.base === 'one batter' ||
      x.dish.base?.toLowerCase().includes('batter') ||
      /idli|dosa|batter/i.test(x.dish.name) ||
      getIngNames(x.dish).some((i) => /batter|idli|dosa/i.test(i)),
  );
  if (batterDishes.length > 0) {
    const uniqueDishes = Array.from(new Set(batterDishes.map((x) => `${x.dish.name} (${DAY_NAMES[x.dayIndex]})`)));
    sundayTasks.push({
      id: 'sunday-batter',
      title: 'Grind idli / dosa batter · 1.5 kg',
      kind: 'grind + ferment overnight',
      keeps: 'fridge 4 days',
      dishes: uniqueDishes,
      mins: 20,
      session: 'sunday',
    });
  }

  const gravyDishes = scheduledDishes.filter(
    (x) =>
      x.dish.base === 'Onion-tomato base gravy' ||
      (x.dish.base && x.dish.base.toLowerCase().includes('gravy')) ||
      /tomato rice|paneer butter masala|rajma masala/i.test(x.dish.name),
  );
  if (gravyDishes.length > 0) {
    const uniqueDishes = Array.from(new Set(gravyDishes.map((x) => `${x.dish.name} (${DAY_NAMES[x.dayIndex]})`)));
    sundayTasks.push({
      id: 'sunday-gravy',
      title: 'Onion-tomato base gravy · 1 batch',
      kind: 'cook a base',
      keeps: 'fridge 4 days',
      dishes: uniqueDishes,
      mins: 35,
      session: 'sunday',
    });
  }

  const sambarDishes = scheduledDishes.filter(
    (x) =>
      x.dish.base?.toLowerCase().includes('sambar') ||
      /sambar|mudde/i.test(x.dish.name) ||
      getIngNames(x.dish).some((i) => /sambar/i.test(i)),
  );
  if (sambarDishes.length > 0) {
    const uniqueDishes = Array.from(new Set(sambarDishes.map((x) => `${x.dish.name} (${DAY_NAMES[x.dayIndex]})`)));
    sundayTasks.push({
      id: 'sunday-sambar',
      title: 'Sambar · double batch, freeze half',
      kind: 'cook a base',
      keeps: 'freezer 1 month',
      dishes: uniqueDishes,
      mins: 30,
      session: 'sunday',
    });
  }

  const makhanaDishes = scheduledDishes.filter(
    (x) =>
      x.dish.base?.toLowerCase().includes('makhana') ||
      /makhana|murukku|snack/i.test(x.dish.name) ||
      getIngNames(x.dish).some((i) => /makhana/i.test(i)),
  );
  if (makhanaDishes.length > 0) {
    const uniqueDishes = Array.from(new Set(makhanaDishes.map((x) => `${x.dish.name} (${DAY_NAMES[x.dayIndex]})`)));
    sundayTasks.push({
      id: 'sunday-makhana',
      title: 'Roast makhana · fill the jar',
      kind: 'roast',
      keeps: 'jar 2 weeks',
      dishes: uniqueDishes,
      mins: 10,
      session: 'sunday',
    });
  }

  const onionCutDishes = scheduledDishes.filter(
    (x) =>
      x.dayIndex <= 1 &&
      (getIngNames(x.dish).some((i) => /onion/i.test(i)) || /poha|paratha|thepla|rasam/i.test(x.dish.name)),
  );
  if (onionCutDishes.length > 0) {
    const uniqueDishes = Array.from(new Set(onionCutDishes.map((x) => x.dish.name)));
    sundayTasks.push({
      id: 'sunday-cut-onions',
      title: 'Chop onions for Mon–Tue',
      kind: 'cut',
      keeps: 'fridge box 2 days',
      dishes: uniqueDishes,
      mins: 10,
      session: 'sunday',
    });
  }

  // Also include any bases explicitly linked to scheduled dishes that aren't already represented
  for (const s of scheduledDishes) {
    if (!s.dish.base) continue;
    const baseName = s.dish.base.trim();
    const alreadyPresent = sundayTasks.some(
      (t) => t.title.toLowerCase().includes(baseName.toLowerCase()) || baseName.toLowerCase().includes(t.title.toLowerCase())
    );
    if (!alreadyPresent) {
      const matchedBaseItem = bases.find(
        (b) => b.name.toLowerCase() === baseName.toLowerCase() ||
               b.name.toLowerCase().includes(baseName.toLowerCase()) ||
               baseName.toLowerCase().includes(b.name.toLowerCase())
      );
      const linked = scheduledDishes.filter(
        (x) => x.dish.base && x.dish.base.toLowerCase() === baseName.toLowerCase()
      );
      const uniqueDishes = Array.from(new Set(linked.map((x) => `${x.dish.name} (${DAY_NAMES[x.dayIndex]})`)));
      sundayTasks.push({
        id: `sunday-${matchedBaseItem ? matchedBaseItem.id : baseName.toLowerCase().replace(/\s+/g, '-')}`,
        title: `${matchedBaseItem ? matchedBaseItem.name : baseName} · 1 batch`,
        kind: (matchedBaseItem?.kind as PrepKind) || 'cook a base',
        keeps: matchedBaseItem?.keeps || 'fridge 4 days',
        dishes: uniqueDishes,
        mins: 25,
        session: 'sunday',
      });
    }
  }

  const sundayTotalMins = sundayTasks.reduce((sum, t) => sum + t.mins, 0);

  // 2. Nightly Prep Sessions
  // Build a night map for the 7 nights preceding each weekday:
  // Sunday night (night before Mon), Mon night, Tue night, Wed night, Thu night, Fri night, Sat night.
  const nightlyMap = new Map<number, PrepTask[]>();
  for (let i = 0; i < 7; i++) {
    nightlyMap.set(i, []);
  }

  // Pre-seed shared nightly tasks
  for (const s of scheduledDishes) {
    // Lead time respects readyDayOffset!
    // The night before cook date is cookDate - 1 day
    const prepNightDate = addDays(s.cookDate, -1);
    const nightIndex = weekdayOf(prepNightDate);

    // Night prep from recipe metadata
    if (s.dish.nightBeforePrep) {
      const existing = (nightlyMap.get(nightIndex) || []).find((t) => t.title === s.dish.nightBeforePrep);
      if (existing) {
        if (!existing.dishes.includes(s.dish.name)) existing.dishes.push(s.dish.name);
      } else {
        nightlyMap.get(nightIndex)!.push({
          id: `night-${nightIndex}-${s.dish.id}`,
          title: s.dish.nightBeforePrep,
          kind: /soak/i.test(s.dish.nightBeforePrep)
            ? 'soak'
            : /sprout/i.test(s.dish.nightBeforePrep)
              ? 'sprout'
              : /cut|wash|pluck/i.test(s.dish.nightBeforePrep)
                ? 'cut'
                : /thaw/i.test(s.dish.nightBeforePrep)
                  ? 'thaw'
                  : 'cook a base',
          keeps: 'overnight',
          dishes: [`${s.dish.name} (${s.groupName} · ${s.slotName})`],
          mins: 10,
          session: 'nightly',
          dayIndex: nightIndex,
        });
      }
    }

    // Shared dough / batter night prep
    if (s.dish.base === 'one dough') {
      const existing = (nightlyMap.get(nightIndex) || []).find((t) => t.id === `dough-${nightIndex}`);
      if (existing) {
        if (!existing.dishes.includes(s.dish.name)) existing.dishes.push(s.dish.name);
      } else {
        nightlyMap.get(nightIndex)!.push({
          id: `dough-${nightIndex}`,
          title: 'Knead soft dough night before',
          kind: 'knead',
          keeps: 'fridge overnight',
          dishes: [s.dish.name],
          mins: 10,
          session: 'nightly',
          dayIndex: nightIndex,
        });
      }
    }
  }

  const nightlyByDay = Array.from({ length: 7 }, (_, i) => {
    // 0 = Sunday night (before Monday 21 Sep), 1 = Mon night, ..., 6 = Sat night
    const nightDate = addDays(dates[0], i - 1);
    const tasks = nightlyMap.get(weekdayOf(nightDate)) || [];
    const nightName = `${DAY_NAMES[weekdayOf(nightDate)]} night`;

    return {
      nightLabel: nightName,
      nightDate,
      tasks,
      totalMins: tasks.reduce((sum, t) => sum + t.mins, 0),
    };
  });

  // 3. Mornings Cook Session (uses cookPlan)
  const morningsByDay = dates.map((d, dayIndex) => {
    const plan = resolveDay(state, d);
    const filledGroups = plan.groups
      .filter((g) => (g.status ?? 'confirmed') === 'confirmed')
      .map((g) => ({
        ...g,
        slots: g.slots.filter((s) => Boolean(s.dishId || s.dishName)),
      }));

    const cook = cookPlan(filledGroups, state.household);

    const morningTasks: PrepTask[] = cook.tasks.map((t, idx) => ({
      id: `morning-${dayIndex}-${idx}`,
      title: t.name,
      kind: t.shared ? 'shared base' : 'cook fresh',
      keeps: 'packed warm / fresh',
      dishes: t.from,
      mins: t.mins,
      timeRange: `${fromMinutes(t.start)} – ${fromMinutes(t.end)}`,
      session: 'mornings',
      shared: t.shared,
      dayIndex,
    }));

    return {
      dayLabel: `${DAY_NAMES[dayIndex]} ${d.getDate()} Sep`,
      dayDate: d,
      cook,
      tasks: morningTasks,
    };
  });

  // 4. Heads-Up Lead Times (e.g. soak moong Mon night for Wednesday)
  const leadNotices: LeadTimeNotice[] = [];
  const handledNotices = new Set<string>();

  for (const s of scheduledDishes) {
    const dishLower = s.dish.name.toLowerCase();
    const ingredientsLower = s.dish.ingredients.map((i) =>
      (typeof i === 'string' ? i : i.name).toLowerCase(),
    );

    // Sprouting: 2-day lead time (e.g., soak Monday night, sprout Tuesday, eat Wednesday)
    const isSprout =
      /sprout|kosambari/i.test(dishLower) ||
      ingredientsLower.some((i) => i.includes('sprouted') || i.includes('sprout'));

    if (isSprout) {
      // Lead is 2 days before cookDate!
      const leadDate = addDays(s.cookDate, -2);
      const leadNight = `${DAY_NAMES[weekdayOf(leadDate)]} night`;
      const cookDayName = DAY_NAMES[weekdayOf(s.cookDate)];
      const key = `${leadNight}-${s.dish.name}-sprout`;

      if (!handledNotices.has(key)) {
        handledNotices.add(key);
        leadNotices.push({
          id: key,
          nightLabel: leadNight,
          nightDate: leadDate,
          notice: `soak whole moong — sprouts needed ${cookDayName} for ${s.dish.name}.`,
          dishName: s.dish.name,
          forMeal: `${s.groupName} · ${s.slotName}`,
        });
      }
      continue;
    }

    // Overnight soaking: 1-day lead time (rajma, chana, kabuli chana, whole moong, toor dal)
    const isOvernightSoak =
      /rajma|chickpea|chana|moong/i.test(dishLower) ||
      (s.dish.nightBeforePrep && /soak/i.test(s.dish.nightBeforePrep)) ||
      ingredientsLower.some((i) => /rajma|chickpea|chana dal|whole green moong/i.test(i));

    if (isOvernightSoak) {
      // Lead is 1 day before cookDate!
      const leadDate = addDays(s.cookDate, -1);
      const leadNight = `${DAY_NAMES[weekdayOf(leadDate)]} night`;
      const cookDayName = DAY_NAMES[weekdayOf(s.cookDate)];

      const hasIng = (re: RegExp) => re.test(dishLower) || ingredientsLower.some((i) => re.test(i));
      const legume = hasIng(/rajma/)
        ? 'rajma'
        : hasIng(/chickpea|chana/)
          ? 'chana'
          : hasIng(/moong/)
            ? 'whole moong'
            : 'dal';

      const key = `${leadNight}-${s.dish.name}-soak`;
      if (!handledNotices.has(key)) {
        handledNotices.add(key);
        leadNotices.push({
          id: key,
          nightLabel: leadNight,
          nightDate: leadDate,
          notice: `soak ${legume} — ${cookDayName} ${s.slotName.toLowerCase() || 'meal'}.`,
          dishName: s.dish.name,
          forMeal: `${s.groupName} · ${s.slotName}`,
        });
      }
    }
  }

  // Sort lead notices chronologically by nightDate
  leadNotices.sort((a, b) => a.nightDate.getTime() - b.nightDate.getTime());

  return {
    sundayTasks,
    sundayTotalMins,
    nightlyByDay,
    morningsByDay,
    leadNotices,
    totalDishesCount,
  };
}
