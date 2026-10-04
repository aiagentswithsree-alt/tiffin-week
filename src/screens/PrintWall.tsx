import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PrintSheet from '../components/PrintSheet';
import { useWeekStore } from '../store/useWeekStore';
import { DAY_NAMES, MONTHS, weekDates, weekdayOf, iso } from '../lib/dates';
import { resolveDay } from '../lib/days';
import type { PrintDefaults } from '../types';

interface Row {
  key: string;
  groupName: string;
  slotName: string;
  time: string;
}

/** Max rows per printed page. A4 landscape fits ~6 big rows cleanly, A3 more.
 *  Set deliberately low so the planner spills onto further sheets with repeated
 *  headings for larger routines, per BUILD-ORDER's "do not shrink type" note. */
const ROWS_PER_PAGE: Record<PrintDefaults['paperSize'], number> = { A5: 4, A4: 5, A3: 10 };

/** N14 Wall planner (wireframe 30). Day × slot grid at real paper dimensions.
 *  Spills onto further sheets with the heading repeated. */
export default function PrintWall() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { state } = useWeekStore();

  const paper = (params.get('paper') as PrintDefaults['paperSize']) ?? 'A4';
  const offset = Number(params.get('offset') ?? '0');
  const inkSaver = params.get('ink') === '1';

  const dates = weekDates(offset);
  const resolved = dates.map((d) => resolveDay(state, d));

  // Union of (groupName, slotName) pairs across the week, in first-seen order.
  const seen = new Set<string>();
  const rows: Row[] = [];
  resolved.forEach((plan) => {
    for (const g of plan.groups) {
      for (const s of g.slots) {
        const key = `${g.name}|||${s.name}`;
        if (seen.has(key)) continue;
        seen.add(key);
        rows.push({ key, groupName: g.name, slotName: s.name, time: s.time });
      }
    }
  });

  const findCell = (dayIdx: number, groupName: string, slotName: string): string => {
    const plan = resolved[dayIdx];
    const g = plan.groups.find((gg) => gg.name === groupName);
    if (!g) return '';
    const s = g.slots.find((ss) => ss.name === slotName);
    if (!s) return '';
    return s.dishName ?? '';
  };

  const perPage = ROWS_PER_PAGE[paper] ?? 5;
  const pages: Row[][] = rows.length === 0 ? [[]] : [];
  for (let i = 0; i < rows.length; i += perPage) pages.push(rows.slice(i, i + perPage));

  const title = 'Weekly wall planner';
  const dateRange = `${dates[0].getDate()}–${dates[6].getDate()} ${MONTHS[dates[6].getMonth()]} ${dates[6].getFullYear()}`;

  const toolbar = (
    <div className="flex items-center justify-between gap-2">
      <button type="button" onClick={() => nav('/print')} className="rounded-md px-2 py-1 text-[13px] text-ink-2 hover:bg-surface-2">← Print centre</button>
      <div className="text-[12px] text-ink-2">{paper} landscape · {pages.length} sheet{pages.length === 1 ? '' : 's'}</div>
      <button type="button" onClick={() => window.print()} className="rounded-md bg-ink px-3 py-1.5 text-[13px] font-semibold text-bg">Save as PDF</button>
    </div>
  );

  return (
    <PrintSheet paper={paper} orientation="landscape" inkSaver={inkSaver} title={title} toolbar={toolbar}>
      {pages.map((pageRows, pageIdx) => (
        <WallPage
          key={pageIdx}
          pageNumber={pageIdx + 1}
          totalPages={pages.length}
          title={title}
          dateRange={dateRange}
          dates={dates}
          rows={pageRows}
          findCell={findCell}
        />
      ))}
    </PrintSheet>
  );
}

interface PageProps {
  pageNumber: number;
  totalPages: number;
  title: string;
  dateRange: string;
  dates: Date[];
  rows: Row[];
  findCell: (dayIdx: number, group: string, slot: string) => string;
}

const WallPage: React.FC<PageProps> = ({ pageNumber, totalPages, title, dateRange, dates, rows, findCell }) => {
  return (
    <section data-wall-page={pageNumber} className="wall-page">
      <header className="flex items-end justify-between border-b border-ink pb-2">
        <div>
          <h1 className="wall-heading font-display text-[26px] font-bold leading-tight">{title}</h1>
          <p className="text-[13px] text-ink-2">{dateRange}</p>
        </div>
        <div className="text-[12px] text-ink-2">
          Sheet {pageNumber} of {totalPages}
        </div>
      </header>

      {rows.length === 0 ? (
        <p className="mt-6 text-[14px] text-ink-2">No slots to print yet. Set up a routine and come back.</p>
      ) : (
        <table className="mt-3 w-full border-collapse text-[12.5px]">
          <thead>
            <tr>
              <th className="w-[22%] border border-line-2 bg-surface-2 px-2 py-1.5 text-left align-bottom">
                <span className="block text-[10.5px] font-semibold uppercase tracking-wide text-ink-2">Group · slot</span>
              </th>
              {dates.map((d) => (
                <th key={iso(d)} className="border border-line-2 bg-surface-2 px-2 py-1.5 text-left align-bottom">
                  <span className="block text-[10.5px] font-semibold uppercase tracking-wide text-ink-2">
                    {DAY_NAMES[weekdayOf(d)]}
                  </span>
                  <span className="block text-[13px] font-bold text-ink">{d.getDate()}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <th scope="row" className="border border-line-2 px-2 py-1.5 text-left align-top">
                  <span className="block text-[11px] uppercase tracking-wide text-ink-2">{row.groupName}</span>
                  <span className="block text-[14px] font-semibold">{row.slotName}</span>
                  {row.time ? <span className="block text-[10.5px] text-ink-3">{row.time}</span> : null}
                </th>
                {dates.map((_, di) => {
                  const dish = findCell(di, row.groupName, row.slotName);
                  return (
                    <td key={di} className="border border-line-2 px-2 py-2 align-top text-[13px]">
                      {dish || <span className="text-ink-3">—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
};
