import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PrintSheet from '../components/PrintSheet';
import { useWeekStore } from '../store/useWeekStore';
import { DAY_NAMES, MONTHS, iso, weekDates, weekdayOf } from '../lib/dates';
import { resolveDay } from '../lib/days';
import type { PrintDefaults } from '../types';

interface Row {
  key: string;
  groupName: string;
  slotName: string;
  time: string;
}

const ROWS_PER_PAGE: Record<PrintDefaults['paperSize'], number> = { A5: 4, A4: 6, A3: 12 };

/** N18 Blank planner (wireframe 34). A4/A3 landscape, empty grid to fill by
 *  hand. Row labels come from the current week's routine slot names, so a
 *  renamed slot flows through to the printed row. */
export default function PrintBlank() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { state } = useWeekStore();

  const paper = (params.get('paper') as PrintDefaults['paperSize']) ?? 'A4';
  const offset = Number(params.get('offset') ?? '0');
  const inkSaver = params.get('ink') === '1';

  const dates = weekDates(offset);
  const resolved = dates.map((d) => resolveDay(state, d));

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

  const perPage = ROWS_PER_PAGE[paper] ?? 6;
  const pages: Row[][] = rows.length === 0 ? [[]] : [];
  for (let i = 0; i < rows.length; i += perPage) pages.push(rows.slice(i, i + perPage));

  const title = 'Blank planner';
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
        <section key={pageIdx} className="blank-page">
          <header className="flex items-end justify-between border-b border-ink pb-2">
            <div>
              <h1 className="font-display text-[26px] font-bold leading-tight">{title}</h1>
              <p className="text-[13px] text-ink-2">{dateRange}</p>
            </div>
            <div className="text-[12px] text-ink-2">Sheet {pageIdx + 1} of {pages.length}</div>
          </header>

          {pageRows.length === 0 ? (
            <p className="mt-6 text-[14px] text-ink-2">Set up a routine first; the row labels come from your slot names.</p>
          ) : (
            <table className="mt-3 w-full border-collapse text-[12.5px]">
              <thead>
                <tr>
                  <th className="w-[22%] border border-ink px-2 py-1.5 text-left align-bottom">
                    <span className="block text-[10.5px] font-semibold uppercase tracking-wide text-ink-2">Group · slot</span>
                  </th>
                  {dates.map((d) => (
                    <th key={iso(d)} className="border border-ink px-2 py-1.5 text-left align-bottom">
                      <span className="block text-[10.5px] font-semibold uppercase tracking-wide text-ink-2">
                        {DAY_NAMES[weekdayOf(d)]}
                      </span>
                      <span className="block text-[13px] font-bold text-ink">{d.getDate()}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.key} className="h-16">
                    <th scope="row" className="border border-ink px-2 py-1 text-left align-top">
                      <span className="block text-[11px] uppercase tracking-wide text-ink-2">{row.groupName}</span>
                      <span data-testid={`blank-row-${row.groupName}-${row.slotName}`} className="block text-[14px] font-semibold">{row.slotName}</span>
                      {row.time ? <span className="block text-[10.5px] text-ink-3">{row.time}</span> : null}
                    </th>
                    {dates.map((_, di) => (
                      <td key={di} className="border border-ink" />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ))}
    </PrintSheet>
  );
}
