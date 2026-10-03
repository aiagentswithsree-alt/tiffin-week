import { weekDates, DAY_NAMES, MONTHS } from './dates';
import { resolveDay } from './days';
import { servesOf } from './inheritance';
import { SAMPLE_RECIPES } from '../data/recipes';
import type { AppState, Group, RecipeItem, Slot } from '../types';

export type ShopSection =
  | 'VEGETABLES'
  | 'DALS, GRAINS & SOYA'
  | 'FRUIT'
  | 'DAIRY & REFRIGERATED'
  | 'BAKERY & BREADS'
  | 'OTHER';

export type ShopSplit = 'sunday' | 'midweek';

export interface ShoppingItem {
  id: string;
  name: string;
  section: ShopSection;
  split: ShopSplit;
  quantity: string;
  isEstimate: boolean;
  dishes: string[];
  isPantry: boolean;
}

export interface ShoppingListResult {
  sundayItems: ShoppingItem[];
  midweekItems: ShoppingItem[];
  pantryStaples: ShoppingItem[];
  totalDishesCount: number;
  totalServings: number;
  dateRangeLabel: string;
}

export const BASELINE_PANTRY_CATALOG = [
  { id: 'staple-rice', name: 'Sona masoori rice', section: 'DALS, GRAINS & SOYA' as ShopSection, quantity: '1 kg' },
  { id: 'staple-toor', name: 'Toor dal', section: 'DALS, GRAINS & SOYA' as ShopSection, quantity: '500 g' },
  { id: 'staple-rava', name: 'Rava (sooji)', section: 'DALS, GRAINS & SOYA' as ShopSection, quantity: '500 g' },
  { id: 'staple-poha', name: 'Poha', section: 'DALS, GRAINS & SOYA' as ShopSection, quantity: '500 g' },
  { id: 'staple-urad', name: 'Urad dal', section: 'DALS, GRAINS & SOYA' as ShopSection, quantity: '250 g' },
  { id: 'staple-oil', name: 'Groundnut oil', section: 'OTHER' as ShopSection, quantity: '1 L' },
  { id: 'staple-ghee', name: 'Ghee', section: 'DAIRY & REFRIGERATED' as ShopSection, quantity: '500 ml' },
  { id: 'staple-mustard', name: 'Mustard seeds, jeera, hing', section: 'OTHER' as ShopSection, quantity: '1 pack' },
  { id: 'staple-turmeric', name: 'Turmeric, chilli powder', section: 'OTHER' as ShopSection, quantity: '1 pack' },
  { id: 'staple-salt', name: 'Salt', section: 'OTHER' as ShopSection, quantity: '1 kg' },
  { id: 'staple-garam', name: 'Garam masala & dry spices', section: 'OTHER' as ShopSection, quantity: '1 pack' },
  { id: 'staple-curry', name: 'Curry leaves', section: 'VEGETABLES' as ShopSection, quantity: '1 bunch' },
  { id: 'staple-jaggery', name: 'Jaggery', section: 'OTHER' as ShopSection, quantity: '500 g' },
  { id: 'staple-honey', name: 'Honey', section: 'OTHER' as ShopSection, quantity: '1 jar' },
  { id: 'staple-chana', name: 'Chana dal', section: 'DALS, GRAINS & SOYA' as ShopSection, quantity: '250 g' },
  { id: 'staple-peanuts', name: 'Roasted peanuts', section: 'DALS, GRAINS & SOYA' as ShopSection, quantity: '250 g' },
  { id: 'staple-tea', name: 'Assam CTC tea & Coffee', section: 'OTHER' as ShopSection, quantity: '1 pack' },
  { id: 'staple-tamarind', name: 'Tamarind pulp', section: 'OTHER' as ShopSection, quantity: '200 g' },
];

/** Standard pantry items kept in stock, hidden by default unless running low */
export const PANTRY_STAPLES_SET = new Set([
  'mustard seeds',
  'urad dal',
  'hing',
  'curry leaves',
  'turmeric',
  'salt',
  'pink salt',
  'rock salt',
  'oil',
  'ghee',
  'sesame oil',
  'coconut oil',
  'cumin',
  'jeera',
  'roasted cumin powder',
  'black salt',
  'fennel seeds',
  'dry red chillies',
  'green cardamom',
  'cardamom powder',
  'garam masala',
  'amchur',
  'chaat masala',
  'kasuri methi',
  'eno fruit salt',
  'sugar',
  'raw sugar',
  'jaggery',
  'melted jaggery',
  'idli podi (gunpowder)',
  'bisibelebath powder',
  'sambar powder',
  'assam ctc tea leaves',
  'fresh coffee decoction (80/20 chicory blend)',
]);

interface IngredientRule {
  normalized: string;
  section: ShopSection;
  perServe: number;
  unit: string;
  defaultSplit: ShopSplit;
}

/** Knowledge base for section categorization, portion weights, and split */
const RULES: Record<string, IngredientRule> = {
  // Vegetables
  onion: { normalized: 'Onion', section: 'VEGETABLES', perServe: 50, unit: 'g', defaultSplit: 'sunday' },
  tomato: { normalized: 'Tomato', section: 'VEGETABLES', perServe: 45, unit: 'g', defaultSplit: 'midweek' },
  potato: { normalized: 'Potato', section: 'VEGETABLES', perServe: 60, unit: 'g', defaultSplit: 'sunday' },
  bhindi: { normalized: 'Bhindi (okra)', section: 'VEGETABLES', perServe: 60, unit: 'g', defaultSplit: 'sunday' },
  cucumber: { normalized: 'English cucumber', section: 'VEGETABLES', perServe: 40, unit: 'g', defaultSplit: 'midweek' },
  methi: { normalized: 'Fresh methi leaves', section: 'VEGETABLES', perServe: 35, unit: 'g', defaultSplit: 'sunday' },
  capsicum: { normalized: 'Capsicum', section: 'VEGETABLES', perServe: 30, unit: 'g', defaultSplit: 'midweek' },
  carrot: { normalized: 'Carrot', section: 'VEGETABLES', perServe: 30, unit: 'g', defaultSplit: 'sunday' },
  garlic: { normalized: 'Garlic', section: 'VEGETABLES', perServe: 10, unit: 'g', defaultSplit: 'sunday' },
  ginger: { normalized: 'Ginger', section: 'VEGETABLES', perServe: 10, unit: 'g', defaultSplit: 'sunday' },
  coriander: { normalized: 'Fresh coriander', section: 'VEGETABLES', perServe: 15, unit: 'g', defaultSplit: 'midweek' },
  mint: { normalized: 'Fresh mint', section: 'VEGETABLES', perServe: 10, unit: 'g', defaultSplit: 'midweek' },
  chillies: { normalized: 'Green chillies', section: 'VEGETABLES', perServe: 10, unit: 'g', defaultSplit: 'sunday' },
  chilli: { normalized: 'Green chilli', section: 'VEGETABLES', perServe: 10, unit: 'g', defaultSplit: 'sunday' },
  corn: { normalized: 'Sweet corn kernels', section: 'VEGETABLES', perServe: 50, unit: 'g', defaultSplit: 'sunday' },
  vegetables: { normalized: 'Mixed vegetables', section: 'VEGETABLES', perServe: 60, unit: 'g', defaultSplit: 'sunday' },
  beetroot: { normalized: 'Beetroot', section: 'VEGETABLES', perServe: 50, unit: 'g', defaultSplit: 'sunday' },

  // Dals, grains & soya
  rice: { normalized: 'Rice (Sona Masoori / Basmati)', section: 'DALS, GRAINS & SOYA', perServe: 55, unit: 'g', defaultSplit: 'sunday' },
  poha: { normalized: 'Thick poha', section: 'DALS, GRAINS & SOYA', perServe: 40, unit: 'g', defaultSplit: 'sunday' },
  toor: { normalized: 'Toor dal', section: 'DALS, GRAINS & SOYA', perServe: 35, unit: 'g', defaultSplit: 'sunday' },
  chana: { normalized: 'Chana dal', section: 'DALS, GRAINS & SOYA', perServe: 35, unit: 'g', defaultSplit: 'sunday' },
  chickpeas: { normalized: 'Kabuli chana (chickpeas)', section: 'DALS, GRAINS & SOYA', perServe: 50, unit: 'g', defaultSplit: 'sunday' },
  moong: { normalized: 'Whole green moong', section: 'DALS, GRAINS & SOYA', perServe: 40, unit: 'g', defaultSplit: 'sunday' },
  flour: { normalized: 'Whole wheat flour', section: 'DALS, GRAINS & SOYA', perServe: 50, unit: 'g', defaultSplit: 'sunday' },
  dough: { normalized: 'Whole wheat dough', section: 'DALS, GRAINS & SOYA', perServe: 50, unit: 'g', defaultSplit: 'sunday' },
  besan: { normalized: 'Besan (gram flour)', section: 'DALS, GRAINS & SOYA', perServe: 35, unit: 'g', defaultSplit: 'sunday' },
  rava: { normalized: 'Roasted rava', section: 'DALS, GRAINS & SOYA', perServe: 40, unit: 'g', defaultSplit: 'sunday' },
  peanuts: { normalized: 'Peanuts', section: 'DALS, GRAINS & SOYA', perServe: 15, unit: 'g', defaultSplit: 'sunday' },
  cashew: { normalized: 'Cashews', section: 'DALS, GRAINS & SOYA', perServe: 15, unit: 'g', defaultSplit: 'sunday' },
  almonds: { normalized: 'Whole almonds', section: 'DALS, GRAINS & SOYA', perServe: 15, unit: 'g', defaultSplit: 'sunday' },
  makhana: { normalized: 'Fox nuts (makhana)', section: 'DALS, GRAINS & SOYA', perServe: 20, unit: 'g', defaultSplit: 'sunday' },
  seeds: { normalized: 'Pumpkin seeds', section: 'DALS, GRAINS & SOYA', perServe: 10, unit: 'g', defaultSplit: 'sunday' },

  // Fruit
  banana: { normalized: 'Banana', section: 'FRUIT', perServe: 0.5, unit: 'count', defaultSplit: 'midweek' },
  apple: { normalized: 'Crisp apple', section: 'FRUIT', perServe: 0.5, unit: 'count', defaultSplit: 'sunday' },
  lemon: { normalized: 'Lemon', section: 'FRUIT', perServe: 0.4, unit: 'count', defaultSplit: 'sunday' },
  pomegranate: { normalized: 'Pomegranate', section: 'FRUIT', perServe: 0.25, unit: 'count', defaultSplit: 'midweek' },
  coconut: { normalized: 'Fresh coconut', section: 'FRUIT', perServe: 25, unit: 'g', defaultSplit: 'sunday' },

  // Dairy & Refrigerated
  curd: { normalized: 'Fresh curd', section: 'DAIRY & REFRIGERATED', perServe: 65, unit: 'g', defaultSplit: 'midweek' },
  milk: { normalized: 'Milk', section: 'DAIRY & REFRIGERATED', perServe: 75, unit: 'ml', defaultSplit: 'midweek' },
  paneer: { normalized: 'Fresh paneer', section: 'DAIRY & REFRIGERATED', perServe: 50, unit: 'g', defaultSplit: 'midweek' },
  butter: { normalized: 'Butter', section: 'DAIRY & REFRIGERATED', perServe: 15, unit: 'g', defaultSplit: 'sunday' },
  cream: { normalized: 'Fresh cream', section: 'DAIRY & REFRIGERATED', perServe: 20, unit: 'g', defaultSplit: 'midweek' },
  batter: { normalized: 'Dosa / Idli batter', section: 'DAIRY & REFRIGERATED', perServe: 80, unit: 'g', defaultSplit: 'sunday' },

  // Bakery & Breads
  bread: { normalized: 'Bread', section: 'BAKERY & BREADS', perServe: 1.5, unit: 'slices', defaultSplit: 'midweek' },
  boondi: { normalized: 'Khara boondi', section: 'BAKERY & BREADS', perServe: 20, unit: 'g', defaultSplit: 'sunday' },
  murukku: { normalized: 'Ribbon murukku', section: 'BAKERY & BREADS', perServe: 25, unit: 'g', defaultSplit: 'sunday' },
};

const PERISHABLE_SECTIONS = new Set<ShopSection>([
  'DAIRY & REFRIGERATED',
  'BAKERY & BREADS',
  'FRUIT',
]);

const DELICATE_VEGETABLES = new Set([
  'tomato',
  'cucumber',
  'coriander',
  'mint',
  'capsicum',
  'methi',
  'spinach',
  'bhindi',
]);

function isPerishable(rule: IngredientRule): boolean {
  if (PERISHABLE_SECTIONS.has(rule.section)) {
    if (rule.normalized === 'Butter') return false; // Butter keeps well
    return true;
  }
  if (rule.section === 'VEGETABLES') {
    const low = rule.normalized.toLowerCase();
    return Array.from(DELICATE_VEGETABLES).some((v) => low.includes(v));
  }
  return false;
}

function matchRule(rawIngredient: string): IngredientRule {
  const low = rawIngredient.toLowerCase();
  for (const [key, rule] of Object.entries(RULES)) {
    if (low.includes(key)) {
      return rule;
    }
  }
  return {
    normalized: rawIngredient.trim(),
    section: 'OTHER',
    perServe: 25,
    unit: 'g',
    defaultSplit: 'sunday',
  };
}

function formatQuantity(total: number, unit: string): string {
  if (unit === 'g') {
    if (total >= 1000) {
      return `${(total / 1000).toFixed(1).replace(/\.0$/, '')} kg`;
    }
    return `${Math.round(total / 25) * 25 || 50} g`;
  }
  if (unit === 'ml') {
    if (total >= 1000) {
      return `${(total / 1000).toFixed(1).replace(/\.0$/, '')} L`;
    }
    return `${Math.round(total / 25) * 25 || 50} ml`;
  }
  if (unit === 'count') {
    return `${Math.max(1, Math.round(total))}`;
  }
  if (unit === 'slices') {
    const count = Math.max(2, Math.round(total));
    if (count >= 10) return '1 loaf';
    return `${count} slices`;
  }
  return `${Math.round(total)} ${unit}`;
}

/**
 * Derives the weekly shopping list from the plan.
 * Rules:
 *  - Quantities scale from EFFECTIVE serves per slot.
 *  - Tentative groups are included ONLY when group.shop is true.
 *  - Skipped groups are excluded.
 *  - Pantry staples are isolated with a count unless running low.
 *  - Grouped into "Buy Sunday" vs "Fresh midweek".
 */
interface ItemAccumulator {
  rule: IngredientRule;
  split: ShopSplit;
  totalAmount: number;
  unit: string;
  isEstimate: boolean;
  dishes: Set<string>;
  dayIndices: Set<number>;
  isPantry: boolean;
}

export function buildShoppingList(
  state: AppState,
  offset: number = 0,
  lowStaples: Set<string> = new Set(),
): ShoppingListResult {
  const dates = weekDates(offset);
  const recipes = state.recipes && state.recipes.length > 0 ? state.recipes : SAMPLE_RECIPES;
  const dishLookup = new Map<string, RecipeItem>();
  for (const r of recipes) {
    dishLookup.set(r.id, r);
    dishLookup.set(r.name.toLowerCase(), r);
  }

  const itemsMap = new Map<string, ItemAccumulator>();
  let totalDishesCount = 0;
  let totalServings = 0;

  dates.forEach((d, dayIndex) => {
    const plan = resolveDay(state, d);

    for (const g of plan.groups) {
      const status = g.status ?? 'confirmed';
      if (status === 'skipped') continue;
      if (status === 'tentative' && !g.shop) continue;

      for (const s of g.slots) {
        if (!s.dishId && !s.dishName) continue;

        totalDishesCount++;
        const serves = servesOf(g, s, state.household);
        totalServings += serves;

        const dishName = s.dishName || 'Selected dish';
        const recipe =
          (s.dishId && dishLookup.get(s.dishId)) ||
          dishLookup.get(dishName.toLowerCase()) ||
          null;

        const ingredients = recipe ? recipe.ingredients : [];
        const baseServings = recipe?.servesDefault || 3;
        const servesRatio = serves / baseServings;

        for (const ing of ingredients) {
          const ingName = typeof ing === 'string' ? ing : ing.name;
          const rule = matchRule(ingName);
          const isPantryStaple =
            PANTRY_STAPLES_SET.has(ingName.toLowerCase().trim()) ||
            PANTRY_STAPLES_SET.has(rule.normalized.toLowerCase());

          const perishable = isPerishable(rule);
          const effectiveSplit: ShopSplit = perishable
            ? (dayIndex <= 1 ? 'sunday' : 'midweek')
            : 'sunday';

          const key = isPantryStaple
            ? rule.normalized.toLowerCase()
            : `${rule.normalized.toLowerCase()}:${effectiveSplit}`;

          const ingQty = typeof ing === 'object' && ing !== null && typeof ing.qty === 'number'
            ? ing.qty
            : rule.perServe * baseServings;
          const isIngEstimated = typeof ing === 'object' && ing !== null ? ing.estimated !== false : true;

          const itemAmount = ingQty * servesRatio;
          const ingUnit = (typeof ing === 'object' && ing !== null && ing.unit) || rule.unit;

          if (!itemsMap.has(key)) {
            itemsMap.set(key, {
              rule,
              split: effectiveSplit,
              totalAmount: 0,
              unit: ingUnit,
              isEstimate: isIngEstimated,
              dishes: new Set(),
              dayIndices: new Set(),
              isPantry: isPantryStaple,
            });
          }

          const acc = itemsMap.get(key)!;
          acc.totalAmount += itemAmount;
          if (!isIngEstimated) {
            acc.isEstimate = false;
          }
          acc.dishes.add(dishName);
          acc.dayIndices.add(dayIndex);
        }
      }
    }
  });

  const sundayItems: ShoppingItem[] = [];
  const midweekItems: ShoppingItem[] = [];
  const pantryStaples: ShoppingItem[] = [];

  for (const [key, acc] of itemsMap.entries()) {
    const isForcedLow =
      lowStaples.has(key) ||
      lowStaples.has(acc.rule.normalized) ||
      lowStaples.has(acc.rule.normalized.toLowerCase());
    const dishList = Array.from(acc.dishes);

    const formattedQty = acc.isEstimate
      ? formatQuantity(acc.totalAmount, acc.unit || acc.rule.unit)
      : `${Math.round(acc.totalAmount * 10) / 10} ${acc.unit || acc.rule.unit}`;

    const item: ShoppingItem = {
      id: key,
      name: acc.rule.normalized,
      section: acc.rule.section,
      split: acc.split,
      quantity: formattedQty,
      isEstimate: acc.isEstimate,
      dishes: dishList,
      isPantry: acc.isPantry,
    };

    if (acc.isPantry) {
      pantryStaples.push(item);
      if (!isForcedLow) {
        continue;
      }
    }

    if (acc.split === 'midweek') {
      midweekItems.push(item);
    } else {
      sundayItems.push(item);
    }
  }

  // Include baseline catalog staples so the pantry drawer always represents the household staples
  const presentPantryIds = new Set(pantryStaples.map((p) => p.name.toLowerCase()));
  for (const staple of BASELINE_PANTRY_CATALOG) {
    const key = staple.name.toLowerCase();
    const isForcedLow = lowStaples.has(staple.id) || lowStaples.has(staple.name) || lowStaples.has(key);
    
    if (!presentPantryIds.has(key)) {
      pantryStaples.push({
        id: staple.id,
        name: staple.name,
        section: staple.section,
        split: 'sunday',
        quantity: staple.quantity,
        isEstimate: true,
        dishes: ['Pantry baseline'],
        isPantry: true,
      });
      presentPantryIds.add(key);
    }

    if (isForcedLow) {
      if (!sundayItems.some((s) => s.name.toLowerCase() === key)) {
        sundayItems.push({
          id: staple.id,
          name: staple.name,
          section: staple.section,
          split: 'sunday',
          quantity: staple.quantity,
          isEstimate: true,
          dishes: ['Pantry staple (running low)'],
          isPantry: true,
        });
      }
    }
  }

  // Sort by section then name
  const sectionOrder: Record<ShopSection, number> = {
    VEGETABLES: 1,
    'DALS, GRAINS & SOYA': 2,
    FRUIT: 3,
    'DAIRY & REFRIGERATED': 4,
    'BAKERY & BREADS': 5,
    OTHER: 6,
  };

  const sortItems = (a: ShoppingItem, b: ShoppingItem) => {
    const sDiff = sectionOrder[a.section] - sectionOrder[b.section];
    if (sDiff !== 0) return sDiff;
    return a.name.localeCompare(b.name);
  };

  sundayItems.sort(sortItems);
  midweekItems.sort(sortItems);
  pantryStaples.sort(sortItems);

  const startD = dates[0];
  const endD = dates[6];
  const dateRangeLabel = `${startD.getDate()} – ${endD.getDate()} ${MONTHS[endD.getMonth()]}`;

  return {
    sundayItems,
    midweekItems,
    pantryStaples,
    totalDishesCount,
    totalServings,
    dateRangeLabel,
  };
}
