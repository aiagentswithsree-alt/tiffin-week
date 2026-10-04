import type { RecipeIngredient, RecipeItem } from '../types';

export function toStructuredIngredients(rawList: (string | RecipeIngredient)[]): RecipeIngredient[] {
  return rawList.map((item) => {
    if (typeof item === 'object' && item !== null && 'name' in item) {
      return item;
    }
    const raw = String(item);
    const lower = raw.toLowerCase().trim();
    let qty = 50;
    let unit = 'g';
    let shopSection = 'Pantry';

    if (/paneer/i.test(lower)) {
      qty = 150;
      unit = 'g';
      shopSection = 'Dairy';
    } else if (/onion/i.test(lower)) {
      qty = 150;
      unit = 'g';
      shopSection = 'Veg';
    } else if (/tomato/i.test(lower)) {
      qty = 135;
      unit = 'g';
      shopSection = 'Veg';
    } else if (/potato|aloo/i.test(lower)) {
      qty = 180;
      unit = 'g';
      shopSection = 'Veg';
    } else if (/bhindi|okra/i.test(lower)) {
      qty = 180;
      unit = 'g';
      shopSection = 'Veg';
    } else if (/cucumber/i.test(lower)) {
      qty = 120;
      unit = 'g';
      shopSection = 'Veg';
    } else if (/rice/i.test(lower)) {
      qty = 165;
      unit = 'g';
      shopSection = 'Pantry';
    } else if (/poha/i.test(lower)) {
      qty = 120;
      unit = 'g';
      shopSection = 'Pantry';
    } else if (/toor/i.test(lower)) {
      qty = 105;
      unit = 'g';
      shopSection = 'Pantry';
    } else if (/chana dal/i.test(lower)) {
      qty = 105;
      unit = 'g';
      shopSection = 'Pantry';
    } else if (/chickpea|kabuli/i.test(lower)) {
      qty = 150;
      unit = 'g';
      shopSection = 'Pantry';
    } else if (/moong/i.test(lower)) {
      qty = 120;
      unit = 'g';
      shopSection = 'Pantry';
    } else if (/flour|dough/i.test(lower)) {
      qty = 150;
      unit = 'g';
      shopSection = 'Pantry';
    } else if (/besan/i.test(lower)) {
      qty = 105;
      unit = 'g';
      shopSection = 'Pantry';
    } else if (/rava|sooji/i.test(lower)) {
      qty = 120;
      unit = 'g';
      shopSection = 'Pantry';
    } else if (/peanuts|cashew|almond/i.test(lower)) {
      qty = 45;
      unit = 'g';
      shopSection = 'Pantry';
    } else if (/makhana/i.test(lower)) {
      qty = 60;
      unit = 'g';
      shopSection = 'Pantry';
    } else if (/banana/i.test(lower)) {
      qty = 2;
      unit = 'count';
      shopSection = 'Fruit';
    } else if (/apple/i.test(lower)) {
      qty = 2;
      unit = 'count';
      shopSection = 'Fruit';
    } else if (/curd|yogurt/i.test(lower)) {
      qty = 200;
      unit = 'g';
      shopSection = 'Dairy';
    } else if (/milk/i.test(lower)) {
      qty = 225;
      unit = 'ml';
      shopSection = 'Dairy';
    } else if (/butter|ghee/i.test(lower)) {
      qty = 45;
      unit = 'g';
      shopSection = 'Dairy';
    } else if (/bread/i.test(lower)) {
      qty = 4;
      unit = 'slices';
      shopSection = 'Bakery';
    } else if (/coriander|mint|chilli|ginger|garlic|curry/i.test(lower)) {
      qty = 30;
      unit = 'g';
      shopSection = 'Veg';
    } else if (/corn/i.test(lower)) {
      qty = 150;
      unit = 'g';
      shopSection = 'Veg';
    } else if (/oil/i.test(lower)) {
      qty = 2;
      unit = 'tbsp';
      shopSection = 'Pantry';
    } else if (/masala|amchur|hing|turmeric|mustard|cumin|salt|powder/i.test(lower)) {
      qty = 1;
      unit = 'tsp';
      shopSection = 'Pantry';
    }

    return {
      name: raw,
      qty,
      unit,
      shopSection,
      estimated: true,
    };
  });
}

type RawRecipe = Omit<RecipeItem, 'ingredients'> & { ingredients: string[] };

const RAW_SAMPLE_RECIPES: RawRecipe[] = [
  // Quick & light
  {
    id: 'r1',
    name: 'Mini Idli Podi',
    category: 'Quick & light',
    prepTime: '5 min',
    cookTime: '10 min',
    cookMinutes: 10,
    base: 'one batter',
    note: 'Stays soft for hours in airtight box',
    ingredients: ['Mini idli batter', 'Idli podi (gunpowder)', 'Ghee or sesame oil'],
    steps: ['Steam mini idlis in mould for 7 minutes', 'Toss warm idlis with melted ghee and spiced podi until evenly coated', 'Pack in airtight school container'],
    twoWaySynergy: 'Steam full-sized idlis in parallel for Office Breakfast box',
  },
  {
    id: 'r2',
    name: 'Kanda Poha with Peanuts',
    category: 'Quick & light',
    prepTime: '10 min',
    cookTime: '10 min',
    cookMinutes: 10,
    note: "Don't overwet — goes gluey by noon",
    ingredients: ['Thick poha (flattened rice)', 'Onion', 'Mustard seeds', 'Curry leaves', 'Green chilli', 'Roasted peanuts', 'Turmeric', 'Lemon juice'],
    steps: ['Rinse poha gently and drain', 'Sauté mustard, curry leaves, onions, and peanuts in oil', 'Add turmeric and drained poha, steam covered for 3 minutes', 'Finish with lemon juice and fresh coriander'],
  },
  {
    id: 'r3',
    name: 'Sweet Corn Sundal',
    category: 'Quick & light',
    prepTime: '5 min',
    cookTime: '8 min',
    cookMinutes: 8,
    note: 'Light and crunchy snack',
    ingredients: ['Sweet corn kernels', 'Grated coconut', 'Mustard seeds', 'Urad dal', 'Hing', 'Curry leaves'],
    steps: ['Boil or steam sweet corn until tender', 'Temper mustard, urad dal, hing, and curry leaves in coconut oil', 'Toss sweet corn with salt and fresh coconut'],
  },
  {
    id: 'r4',
    name: 'Cucumber Butter Sandwich Rounds',
    category: 'Quick & light',
    prepTime: '8 min',
    cookTime: '0 min',
    cookMinutes: 0,
    note: 'Cut just before packing — bread can soften',
    travelsSoSo: true,
    ingredients: ['Brown or white bread', 'Salted butter', 'Thinly sliced English cucumber', 'Chaat masala', 'Mint chutney'],
    steps: ['Spread soft butter and mint chutney onto bread slices', 'Layer sliced cucumber and sprinkle chaat masala', 'Trim edges and slice into kid-friendly quarters'],
  },
  {
    id: 'r4b',
    name: 'Apple Slices + Chaat Masala',
    category: 'Quick & light',
    prepTime: '3 min',
    cookTime: '0 min',
    cookMinutes: 0,
    note: 'Browns by 3 PM without lemon',
    travelsSoSo: true,
    ingredients: ['Crisp apple', 'Lemon juice', 'Chaat masala', 'Rock salt'],
    steps: ['Slice crisp apples evenly into wedges', 'Toss in cold water with a squeeze of fresh lemon juice to prevent browning', 'Dust lightly with chaat masala before packing'],
  },
  {
    id: 'r4c',
    name: 'Banana + a Few Almonds',
    category: 'Quick & light',
    prepTime: '1 min',
    cookTime: '0 min',
    cookMinutes: 1,
    note: 'No spoon — eaten standing in 10 minutes',
    ingredients: ['Elaichi or Robusta banana', 'Whole roasted almonds'],
    steps: ['Pack unpeeled ripe banana with a handful of roasted almonds in small snack pouch'],
  },

  // Cooked & rice
  {
    id: 'r5',
    name: 'Lemon Rice & Crispy Aloo',
    category: 'Cooked & rice',
    prepTime: '10 min',
    cookTime: '15 min',
    cookMinutes: 15,
    base: 'one pot of rice',
    note: 'Cool rice completely before packing',
    ingredients: ['Sona Masoori cooked rice', 'Lemon juice', 'Peanuts', 'Chana dal', 'Urad dal', 'Curry leaves', 'Turmeric', 'Baby potatoes'],
    steps: ['Cool freshly cooked rice on a wide plate', 'Fry baby potato cubes with chilli powder and salt until crisp', 'Temper dal, peanuts, mustard, turmeric, and mix with lemon juice & rice'],
    twoWaySynergy: 'Made once, split two ways: Pack half for School lunch, half for Office lunch',
  },
  {
    id: 'r5c',
    name: 'Tomato Rice',
    category: 'Cooked & rice',
    prepTime: '10 min',
    cookTime: '12 min',
    cookMinutes: 12,
    base: 'one pot of rice',
    note: 'One pot of rice covers Box 2 and Dinner',
    ingredients: ['Cooked rice', 'Ripe tomatoes', 'Onion', 'Sambar powder', 'Ghee'],
    steps: ['Sauté onions and spiced tomato pulp in ghee until thick', 'Toss cooked rice gently until well coated', 'Garnish with coriander and serve hot'],
    twoWaySynergy: 'Made once, split two ways: one pot of rice covers Box 2 and Dinner',
  },
  {
    id: 'r5b',
    name: 'Tomato Rice + Paneer',
    category: 'Cooked & rice',
    prepTime: '10 min',
    cookTime: '12 min',
    cookMinutes: 12,
    base: 'one pot of rice',
    note: 'One pot of rice covers Box 2 and Dinner',
    ingredients: ['Cooked rice', 'Ripe tomatoes', 'Paneer cubes', 'Onion', 'Sambar powder', 'Ghee'],
    steps: ['Sauté onions and spiced tomato pulp in ghee until thick', 'Toss fresh paneer cubes and cooked rice gently until well coated', 'Garnish with coriander and pack warm'],
    twoWaySynergy: 'Made once, split two ways: one pot of rice covers Box 2 and Dinner',
  },
  {
    id: 'r6',
    name: 'Curd Rice with Tadka & Pomegranate',
    category: 'Cooked & rice',
    prepTime: '5 min',
    cookTime: '10 min',
    cookMinutes: 10,
    base: 'one pot of rice',
    note: 'Milk keeps it from going sour by lunchtime',
    ingredients: ['Mashed warm rice', 'Fresh curd', 'Milk', 'Ginger julienne', 'Green chilli', 'Mustard seeds', 'Pomegranate seeds'],
    steps: ['Mash cooked rice soft; stir in milk and fresh curd so it stays fresh until noon', 'Temper mustard seeds, ginger, and curry leaves', 'Garnish with ruby pomegranate seeds before packing'],
  },
  {
    id: 'r7',
    name: 'Dal Tadka, Rice & Bhindi Fry',
    category: 'Cooked & rice',
    prepTime: '15 min',
    cookTime: '20 min',
    cookMinutes: 20,
    base: 'one pot of rice',
    note: 'Pack dal and rice in separate containers',
    nightBeforePrep: 'Soak toor dal or wash and dry bhindi on a towel night before',
    ingredients: ['Toor dal', 'Basmati rice', 'Bhindi (okra)', 'Cumin', 'Garlic', 'Ghee', 'Tomatoes'],
    steps: ['Pressure cook toor dal with turmeric', 'Pan-fry sliced bhindi with dry spices until not sticky', 'Temper dal with cumin, crushed garlic, and ghee'],
    twoWaySynergy: 'Comforting hot meal split between Office Lunch and Home Dinner',
  },
  {
    id: 'r8',
    name: 'Bisibelebath with Boondi',
    category: 'Cooked & rice',
    prepTime: '15 min',
    cookTime: '25 min',
    cookMinutes: 25,
    base: 'one pot of rice',
    note: 'Pack boondi in a small ziplock so it stays crunchy',
    ingredients: ['Rice', 'Toor dal', 'Mixed vegetables (carrot, beans, peas)', 'Bisibelebath powder', 'Tamarind pulp', 'Ghee cashews', 'Khara boondi'],
    steps: ['Cook rice, dal, and diced vegetables together until soft', 'Add tamarind extract, bisibelebath spice powder, and simmer', 'Temper in hot ghee with mustard seeds, cashews, and curry leaves'],
  },
  {
    id: 'r8b',
    name: 'Ragi Mudde + Sambar',
    category: 'Cooked & rice',
    prepTime: '15 min',
    cookTime: '20 min',
    cookMinutes: 20,
    base: 'one pot of rice',
    note: 'Thaw sambar from Sunday batch',
    nightBeforePrep: 'Sambar from Sunday batch — thaw in fridge',
    ingredients: ['Ragi flour (finger millet)', 'Toor dal sambar', 'Mixed greens palya', 'Ghee'],
    steps: ['Boil water with pinch of salt and a spoon of ragi flour', 'Whisk in remaining flour vigorously without lumps and roll into smooth mudde spheres', 'Serve steaming hot with spiced vegetable sambar'],
  },

  // Rotis & dosas
  {
    id: 'r9',
    name: 'Methi Thepla with Chhundo',
    category: 'Rotis & dosas',
    prepTime: '15 min',
    cookTime: '15 min',
    cookMinutes: 15,
    base: 'one dough',
    note: 'Stays ultra-soft all day without hardening',
    nightBeforePrep: 'Pluck and wash fresh fenugreek (methi) leaves',
    ingredients: ['Whole wheat flour', 'Besan', 'Fresh chopped methi', 'Curd', 'Ajwain', 'Turmeric', 'Chilli powder', 'Oil'],
    steps: ['Knead soft dough with wheat flour, methi leaves, curd, and spices', 'Roll thin discs and cook with a touch of oil until speckled', 'Wrap in foil or parchment; stays soft all day without hardening'],
  },
  {
    id: 'r10',
    name: 'Paneer Paratha & Curd',
    category: 'Rotis & dosas',
    prepTime: '15 min',
    cookTime: '15 min',
    cookMinutes: 15,
    base: 'one dough',
    note: 'Cut into triangles for easy tiffin eating',
    ingredients: ['Whole wheat dough', 'Grated fresh paneer', 'Green chilli', 'Coriander', 'Garam masala', 'Amchur', 'Ghee'],
    steps: ['Mix grated paneer with chopped herbs and dry spice powders', 'Stuff into wheat dough pedas, roll gently and cook on tawa with ghee', 'Cut into triangles for easy tiffin eating'],
  },
  {
    id: 'r11',
    name: 'Soft Phulkas & Paneer Butter Masala',
    category: 'Rotis & dosas',
    prepTime: '20 min',
    cookTime: '20 min',
    cookMinutes: 20,
    base: 'one dough',
    note: 'Puff directly on flame and pack warm',
    ingredients: ['Whole wheat flour', 'Paneer cubes', 'Tomatoes', 'Cashew paste', 'Butter', 'Kasuri methi', 'Fresh cream'],
    steps: ['Make aromatic makhani gravy with pureed tomatoes and cashew paste', 'Toss fresh paneer cubes and simmer gently with butter and crushed kasuri methi', 'Puff phulkas directly on flame and pack warm'],
  },
  {
    id: 'r11b',
    name: 'Set Dosa + Saagu',
    category: 'Rotis & dosas',
    prepTime: '10 min',
    cookTime: '18 min',
    cookMinutes: 18,
    base: 'one batter',
    note: 'Batter out of fridge night before; pack saagu separately',
    travelsSoSo: true,
    nightBeforePrep: 'Batter out of fridge to warm on counter',
    ingredients: ['Set dosa batter (rice, poha, urad dal)', 'Mixed vegetable saagu', 'Fresh coconut chutney', 'Butter'],
    steps: ['Pour thick small ladles of batter on medium hot tawa without spreading', 'Cook covered on one side until porous and spongy', 'Stack in pairs with butter'],
  },
  {
    id: 'r11c',
    name: 'Dosa + Chutney',
    category: 'Rotis & dosas',
    prepTime: '10 min',
    cookTime: '15 min',
    cookMinutes: 15,
    base: 'one batter',
    note: 'Chutney in the morning, not at the last minute',
    travelsSoSo: true,
    ingredients: ['Fermented dosa batter', 'Coconut chutney', 'Ghee or oil'],
    steps: ['Spread thin crisp dosas on cast iron tawa with ghee', 'Fold crisp triangles and pack alongside fresh coconut-coriander chutney'],
  },

  // Steamed
  {
    id: 'r12',
    name: 'Rava Idli with Coconut Chutney',
    category: 'Steamed',
    prepTime: '10 min',
    cookTime: '12 min',
    cookMinutes: 12,
    base: 'one batter',
    note: 'Instant batter — no fermentation required',
    ingredients: ['Roasted rava (sooji)', 'Sour curd', 'Cashew nuts', 'Carrot grated', 'Mustard seeds', 'Fresh coconut', 'Green chillies'],
    steps: ['Roast rava with tempered mustard, cashews, and curry leaves', 'Whisk with curd and water to a thick batter; rest 10 minutes', 'Pour into idli moulds with a pinch of eno, steam 10 minutes until fluffy'],
  },
  {
    id: 'r12b',
    name: 'Steamed Chickpea, Banana & Paneer Dessert',
    category: 'Steamed',
    prepTime: '10 min',
    cookTime: '20 min',
    cookMinutes: 20,
    note: 'High-protein sweet — good for Box 3 or after school',
    nightBeforePrep: 'Soak and boil the chickpeas',
    ingredients: ['Boiled chickpeas', 'Melted jaggery', 'Cardamom powder', 'Banana slices', 'Paneer cubes', 'Whole almonds', 'Pumpkin seeds', 'Grated coconut'],
    steps: ['Drizzle boiled chickpeas with melted jaggery and cardamom', 'Arrange on a banana leaf or plate with banana, paneer, almonds, seeds and coconut', 'Steam covered for 15 minutes until fragrant and warm'],
  },
  {
    id: 'r12c',
    name: 'Steamed Banana & Moong + Beetroot Shot',
    category: 'Steamed',
    prepTime: '10 min',
    cookTime: '20 min',
    cookMinutes: 20,
    base: 'soaked moong',
    note: 'High energy morning boost',
    nightBeforePrep: 'Soak whole green moong overnight',
    ingredients: ['Soaked green moong', 'Robusta banana slices', 'Beetroot juice', 'Moringa leaf powder', 'Grated coconut'],
    steps: ['Steam soaked moong and banana slices together for 15 minutes', 'Extract fresh beetroot shot with a pinch of moringa and rock salt'],
  },
  {
    id: 'r13',
    name: 'Khaman Dhokla',
    category: 'Steamed',
    prepTime: '10 min',
    cookTime: '20 min',
    cookMinutes: 20,
    note: 'Keep tempering syrup on side until packing',
    ingredients: ['Besan (gram flour)', 'Ginger-chilli paste', 'Lemon juice', 'Eno fruit salt', 'Mustard seeds', 'Curry leaves', 'Fresh coriander'],
    steps: ['Whisk smooth besan batter with lemon and ginger chilli', 'Steam in greased thali for 15 minutes', 'Pour sweet-tangy mustard and green chilli tempering over hot dhokla'],
  },

  // Dry snacks & jars
  {
    id: 'r14',
    name: 'Roasted Spiced Makhana',
    category: 'Dry snacks & jars',
    prepTime: '2 min',
    cookTime: '8 min',
    cookMinutes: 8,
    note: 'Keeps crunchy for weeks in airtight jar',
    ingredients: ['Fox nuts (phool makhana)', 'Ghee', 'Turmeric', 'Chaat masala', 'Pink salt'],
    steps: ['Heat 1 tsp ghee in a wide heavy kadai', 'Slow roast makhana on low flame until ultra-crunchy', 'Toss with turmeric, chaat masala, and salt; cool and jar'],
  },
  {
    id: 'r15',
    name: 'Ribbon Murukku & Dry Fruit Box',
    category: 'Dry snacks & jars',
    prepTime: '2 min',
    cookTime: '0 min',
    cookMinutes: 0,
    note: 'Energy boost for second break',
    ingredients: ['Homemade ribbon pakoda/murukku', 'Almonds', 'Cashews', 'Black raisins'],
    steps: ['Assemble crunchy ribbon murukku with roasted salted dry fruits', 'Pack in airtight mini snack container for 2nd break energy boost'],
  },

  // Crispy & fried
  {
    id: 'r16',
    name: 'Onion Pakoda',
    category: 'Crispy & fried',
    prepTime: '10 min',
    cookTime: '10 min',
    cookMinutes: 10,
    note: 'Best eaten fresh with evening chai',
    travelsSoSo: true,
    ingredients: ['Thin sliced onions', 'Besan', 'Rice flour', 'Ajwain', 'Green chillies', 'Hot oil for dough', 'Curry leaves'],
    steps: ['Rub sliced onions with salt, ajwain, chilli until onions release moisture', 'Add besan and rice flour with a spoon of hot oil (no added water)', 'Drop irregular clumps into medium-hot oil and fry until golden crisp'],
  },
  {
    id: 'r17',
    name: 'Masala Vadai',
    category: 'Crispy & fried',
    prepTime: '10 min',
    cookTime: '15 min',
    cookMinutes: 15,
    note: 'Crunchy golden tea-time snack',
    nightBeforePrep: 'Soak chana dal overnight or for 4 hours',
    ingredients: ['Chana dal', 'Fennel seeds', 'Dry red chillies', 'Onion', 'Ginger', 'Curry leaves', 'Coriander'],
    steps: ['Coarsely grind soaked chana dal with fennel and dry chillies', 'Fold in chopped onions and curry leaves', 'Flatten small patties on your palm and deep fry till crunchy brown'],
  },

  // Drinks
  {
    id: 'r18',
    name: 'South Indian Filter Coffee',
    category: 'Drinks',
    prepTime: '5 min',
    cookTime: '5 min',
    cookMinutes: 5,
    note: 'Best fresh; keeps warm in thermos for 2 hours',
    travelsSoSo: true,
    ingredients: ['Fresh coffee decoction (80/20 chicory blend)', 'Full cream milk', 'Raw sugar'],
    steps: ['Brew thick decoction using traditional brass filter', 'Boil fresh milk and froth vigorously in dabarah set', 'Pour with signature high-fall froth into davarah'],
  },
  {
    id: 'r19',
    name: 'Ginger Cardamom Masala Chai',
    category: 'Drinks',
    prepTime: '3 min',
    cookTime: '7 min',
    cookMinutes: 7,
    note: 'Warm restorative drink',
    travelsSoSo: true,
    ingredients: ['Crushed fresh ginger', 'Green cardamom', 'Assam CTC tea leaves', 'Milk', 'Jaggery or sugar'],
    steps: ['Boil water with pounded ginger and cracked cardamom pods', 'Add robust tea leaves and simmer for 2 minutes', 'Add milk, bring to a frothy roll boil twice, strain hot into mugs'],
  },
  {
    id: 'r20',
    name: 'Mint & Jeera Chaas (Spiced Buttermilk)',
    category: 'Drinks',
    prepTime: '5 min',
    cookTime: '0 min',
    cookMinutes: 0,
    note: 'Chilled bottle with ice cubes',
    ingredients: ['Whisked curd', 'Chilled water', 'Roasted cumin powder', 'Black salt', 'Finely minced mint & ginger', 'Curry leaves'],
    steps: ['Blend curd and chilled water with black salt and roasted cumin until frothy', 'Garnish with freshly torn mint leaves and cracked ice'],
  },

  // Salads
  {
    id: 'r21',
    name: 'Sprouted Moong Kosambari',
    category: 'Salads',
    prepTime: '10 min',
    cookTime: '2 min',
    cookMinutes: 2,
    note: 'Drizzle lemon right before eating',
    nightBeforePrep: 'Sprout whole green moong',
    ingredients: ['Sprouted moong beans', 'Finely grated carrot', 'Grated coconut', 'Lemon juice', 'Mustard tempering with green chilli'],
    steps: ['Toss fresh sprouts with grated carrot, coconut, and chopped coriander', 'Temper mustard seeds, green chilli, and curry leaves in a dash of oil', 'Drizzle fresh lemon juice right before packing'],
  },
];

export const SAMPLE_RECIPES: RecipeItem[] = RAW_SAMPLE_RECIPES.map((r) => ({
  ...r,
  servesDefault: 3,
  ingredients: toStructuredIngredients(r.ingredients),
}));

