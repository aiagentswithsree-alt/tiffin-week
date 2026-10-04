import type { PrintDefaults } from '../types';

export type SheetId = 'wall' | 'prep' | 'shopping' | 'fridge' | 'blank' | 'recipes';

export interface SheetSpec {
  id: SheetId;
  label: string;
  blurb: string;
  /** Which paper sizes this sheet can print on. A3 is offered only for wall and blank. */
  papers: ReadonlyArray<PrintDefaults['paperSize']>;
  orientation: 'landscape' | 'portrait';
  defaultPaper: PrintDefaults['paperSize'];
  path: string;
}

export const SHEETS: readonly SheetSpec[] = [
  { id: 'wall',     label: 'Weekly wall planner', blurb: 'Every day × every slot, big text',          papers: ['A3', 'A4'], orientation: 'landscape', defaultPaper: 'A4', path: '/print/wall' },
  { id: 'prep',     label: 'Prep sheet',          blurb: 'Sunday batch · each night · each morning', papers: ['A4'],       orientation: 'portrait',  defaultPaper: 'A4', path: '/print/prep' },
  { id: 'shopping', label: 'Shopping list',       blurb: 'By shop section, with tick boxes',          papers: ['A4'],       orientation: 'portrait',  defaultPaper: 'A4', path: '/print/shopping' },
  { id: 'fridge',   label: 'Daily fridge card',   blurb: "Today's boxes, cook order, tonight's prep", papers: ['A5'],       orientation: 'portrait',  defaultPaper: 'A5', path: '/print/fridge' },
  { id: 'blank',    label: 'Blank planner',       blurb: 'Empty grid to fill by hand',                papers: ['A3', 'A4'], orientation: 'landscape', defaultPaper: 'A4', path: '/print/blank' },
  { id: 'recipes',  label: 'Recipe cards',        blurb: 'One card per dish this week',               papers: ['A5'],       orientation: 'portrait',  defaultPaper: 'A5', path: '/print/recipes' },
] as const;

export const findSheet = (id: SheetId): SheetSpec => {
  const spec = SHEETS.find((s) => s.id === id);
  if (!spec) throw new Error(`Unknown sheet: ${id}`);
  return spec;
};

/** Load saved print defaults, defaulting to A4 landscape ink-saver if nothing persisted. */
export const paperSizeFor = (sheet: SheetSpec, pref: PrintDefaults | undefined): PrintDefaults['paperSize'] => {
  const preferred = pref?.paperSize ?? 'A4';
  if (sheet.papers.includes(preferred)) return preferred;
  return sheet.defaultPaper;
};
