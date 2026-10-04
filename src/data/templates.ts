import type { Group, PrintDefaults, Slot, WeekTemplate } from '../types';
import { nid } from '../lib/ids';

export const DEFAULT_PRINT_DEFAULTS: PrintDefaults = {
  paperSize: 'A4',
  orientation: 'landscape',
  inkSaver: true,
};

const makeTemplateSlot = (
  name: string,
  time: string,
  minutes = 15,
  dishId?: string,
  dishName?: string,
): Slot => ({
  id: nid(),
  name,
  time,
  timeDay: 0,
  minutes,
  base: null,
  serves: null,
  category: 'Cooked & rice',
  mode: null,
  readyBy: null,
  readyByDay: null,
  done: false,
  dishId: dishId || null,
  dishName: dishName || null,
});

const makeTemplateHomeGroup = (dishId?: string, dishName?: string): Group => ({
  id: nid(),
  name: 'Home',
  mode: 'eat',
  serves: null,
  status: 'confirmed',
  tentativeDays: [],
  shop: true,
  packBy: null,
  packByDay: 0,
  slots: [
    makeTemplateSlot('Breakfast', '07:30', 15),
    makeTemplateSlot('Snack', '16:30', 10),
    makeTemplateSlot('Dinner', '20:00', 20, dishId, dishName),
    makeTemplateSlot('Beverage', '20:00', 5),
  ],
});

/**
 * Starter week templates (Wireframe 28):
 * - Busy week · one-pot dinners
 * - Exam week · light school boxes
 * - Festival week · 2 festive days
 *
 * Each week template holds a full week of picks across days 0..6 (Mon..Sun).
 */
export const DEFAULT_WEEK_TEMPLATES: WeekTemplate[] = [
  {
    id: 'template-busy',
    name: 'Busy week',
    description: 'one-pot dinners',
    days: [0, 1, 2, 3, 4, 5, 6].map((weekday) => {
      let dishId: string | undefined;
      let dishName: string | undefined;
      if (weekday === 0) {
        dishId = 'r1';
        dishName = 'Tomato Rice';
      } else if (weekday === 1) {
        dishId = 'r4';
        dishName = 'Vegetable Khichdi & Papad';
      } else if (weekday === 2) {
        dishId = 'r7';
        dishName = 'Curd Rice & Tadka';
      } else if (weekday === 3) {
        dishId = 'r2';
        dishName = 'Vegetable Pulao & Raita';
      } else if (weekday === 4) {
        dishId = 'r10';
        dishName = 'Paneer Paratha & Curd';
      }
      return { weekday, groups: [makeTemplateHomeGroup(dishId, dishName)] };
    }),
  },
  {
    id: 'template-exam',
    name: 'Exam week',
    description: 'light school boxes',
    days: [0, 1, 2, 3, 4, 5, 6].map((weekday) => {
      const schoolGroup: Group = {
        id: nid(),
        name: 'School',
        mode: 'pack',
        serves: null,
        status: 'confirmed',
        tentativeDays: [],
        shop: true,
        packBy: '07:15',
        packByDay: 0,
        slots: [
          makeTemplateSlot('1st short break', '10:30', 1),
          makeTemplateSlot('Lunch', '12:45', 12, 'r10', 'Paneer Paratha & Curd'),
          makeTemplateSlot('2nd short break', '15:00', 20),
        ],
      };
      return { weekday, groups: [schoolGroup, makeTemplateHomeGroup()] };
    }),
  },
  {
    id: 'template-festival',
    name: 'Festival week',
    description: '2 festive days',
    days: [0, 1, 2, 3, 4, 5, 6].map((weekday) => {
      const dishId = weekday === 4 || weekday === 5 ? 'r8' : undefined;
      const dishName = weekday === 4 || weekday === 5 ? 'Puri & Chana Masala' : undefined;
      return { weekday, groups: [makeTemplateHomeGroup(dishId, dishName)] };
    }),
  },
];
