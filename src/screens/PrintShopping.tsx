import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PrintSheet from '../components/PrintSheet';
import { useWeekStore } from '../store/useWeekStore';
import { MONTHS, weekDates } from '../lib/dates';
import { buildShoppingList, type ShopSection, type ShoppingItem } from '../lib/shopping';
import type { PrintDefaults } from '../types';

const SECTION_ORDER: ShopSection[] = ['VEGETABLES', 'FRUIT', 'DAIRY & REFRIGERATED', 'BAKERY & BREADS', 'DALS, GRAINS & SOYA', 'OTHER'];

/** N16 Shopping list (wireframe 32). A4 portrait, grouped by shop section with tick boxes. */
export default function PrintShopping() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { state } = useWeekStore();

  const paper = (params.get('paper') as PrintDefaults['paperSize']) ?? 'A4';
  const offset = Number(params.get('offset') ?? '0');
  const inkSaver = params.get('ink') === '1';

  const list = buildShoppingList(state, offset);
  const dates = weekDates(offset);
  const dateRange = `${dates[0].getDate()}–${dates[6].getDate()} ${MONTHS[dates[6].getMonth()]} ${dates[6].getFullYear()}`;

  const buildBySection = (items: ShoppingItem[]) => {
    const map = new Map<ShopSection, ShoppingItem[]>();
    for (const it of items) {
      (map.get(it.section) ?? map.set(it.section, []).get(it.section)!).push(it);
    }
    return SECTION_ORDER.filter((s) => map.has(s)).map((s) => ({ section: s, items: map.get(s)! }));
  };

  const sunday = buildBySection(list.sundayItems);
  const midweek = buildBySection(list.midweekItems);

  const toolbar = (
    <div className="flex items-center justify-between gap-2">
      <button type="button" onClick={() => nav('/print')} className="rounded-md px-2 py-1 text-[13px] text-ink-2 hover:bg-surface-2">← Print centre</button>
      <div className="text-[12px] text-ink-2">{paper} portrait</div>
      <button type="button" onClick={() => window.print()} className="rounded-md bg-ink px-3 py-1.5 text-[13px] font-semibold text-bg">Save as PDF</button>
    </div>
  );

  const SectionBlock: React.FC<{ title: string; sections: { section: ShopSection; items: ShoppingItem[] }[]; empty: string }> = ({ title, sections, empty }) => (
    <section className="mt-3">
      <h2 className="font-display text-[14px] font-bold uppercase tracking-wide border-b border-ink pb-0.5">{title}</h2>
      {sections.length === 0 ? (
        <p className="mt-1 text-[12px] text-ink-2">{empty}</p>
      ) : (
        <div className="mt-1 grid grid-cols-2 gap-x-5 gap-y-2">
          {sections.map(({ section, items }) => (
            <div key={section} className="break-inside-avoid">
              <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-2">{section}</div>
              <ul className="mt-0.5 space-y-0.5 text-[12px]">
                {items.map((it) => (
                  <li key={it.id} className="flex items-start gap-1.5">
                    <span className="mt-0.5 inline-block h-3.5 w-3.5 flex-shrink-0 border border-ink" aria-hidden />
                    <span className="flex-1">
                      <span className="font-semibold">{it.name}</span>
                      <span className="ml-1 text-ink-2">{it.quantity}{it.isEstimate ? ' est.' : ''}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <PrintSheet paper={paper} orientation="portrait" inkSaver={inkSaver} title="Shopping list" toolbar={toolbar}>
      <section>
        <header className="flex items-end justify-between border-b border-ink pb-2">
          <div>
            <h1 className="font-display text-[22px] font-bold leading-tight">Shopping list</h1>
            <p className="text-[12px] text-ink-2">{list.dateRangeLabel || dateRange}</p>
          </div>
          <div className="text-[11px] text-ink-2">
            {list.totalDishesCount} dishes · {list.totalServings} serves
          </div>
        </header>

        <SectionBlock title="Buy Sunday" sections={sunday} empty="Nothing to buy on Sunday." />
        <SectionBlock title="Fresh midweek" sections={midweek} empty="No midweek top-up needed." />
      </section>
    </PrintSheet>
  );
}
