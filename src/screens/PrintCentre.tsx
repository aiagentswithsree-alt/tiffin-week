import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeekStore } from '../store/useWeekStore';
import { DEFAULT_PRINT_DEFAULTS } from '../data/templates';
import { SHEETS, type SheetId, findSheet, paperSizeFor } from '../lib/print';
import { MONTHS, weekDates } from '../lib/dates';
import type { PrintDefaults } from '../types';

/** N13 Print centre (wireframe 29). Picks a sheet, overrides paper/orientation
 *  for sheets that offer the choice, and routes to the preview. */
export default function PrintCentre() {
  const nav = useNavigate();
  const { state } = useWeekStore();
  const defaults: PrintDefaults = state.printDefaults ?? DEFAULT_PRINT_DEFAULTS;

  const [sheetId, setSheetId] = useState<SheetId>('wall');
  const [offset, setOffset] = useState(0);
  const [paper, setPaper] = useState<PrintDefaults['paperSize']>(defaults.paperSize);
  const [inkSaver, setInkSaver] = useState<boolean>(defaults.inkSaver);

  const sheet = findSheet(sheetId);
  const activePaper = sheet.papers.includes(paper) ? paper : paperSizeFor(sheet, defaults);
  const dates = weekDates(offset);
  const weekLabel = `${dates[0].getDate()}–${dates[6].getDate()} ${MONTHS[dates[6].getMonth()]}`;

  const go = () => {
    const q = new URLSearchParams({
      offset: String(offset),
      paper: activePaper,
      ink: inkSaver ? '1' : '0',
    });
    nav(`${sheet.path}?${q.toString()}`);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg text-ink">
      <header className="flex-shrink-0 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => nav('/week')} className="h-9 w-9 rounded-md text-ink-2 hover:bg-surface-2" aria-label="Back">←</button>
          <div>
            <h1 className="font-display text-[20px] font-bold leading-tight">Print</h1>
            <p className="text-[12px] text-ink-2">Pick a template for the wall, the fridge or the shop</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <ul className="mt-3 space-y-1.5" aria-label="Print templates">
          {SHEETS.map((s) => {
            const active = s.id === sheetId;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setSheetId(s.id)}
                  className={`flex w-full items-center gap-3 rounded-[11px] bg-white px-3 py-2.5 text-left ${
                    active ? 'border-2 border-ink' : 'border border-line'
                  }`}
                  aria-pressed={active}
                >
                  <span
                    className={`h-5 w-5 flex-shrink-0 rounded-full border-2 ${
                      active ? 'border-ink bg-ink' : 'border-line-2'
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold">{s.label}</span>
                    <span className="block text-[11.5px] text-ink-2">{s.blurb}</span>
                  </span>
                  <span className="text-[11px] font-semibold text-ink-2">
                    {s.papers.join('/')} {s.orientation === 'landscape' ? '↔' : '↕'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-3 rounded-[12px] border border-line bg-white">
          <div className="flex items-center justify-between border-b border-line/60 px-3 py-2 text-[13px]">
            <span>Week</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setOffset(offset - 1)} className="h-7 w-7 rounded-md border border-line hover:bg-surface-2" aria-label="Previous week">←</button>
              <strong>{weekLabel}</strong>
              <button type="button" onClick={() => setOffset(offset + 1)} className="h-7 w-7 rounded-md border border-line hover:bg-surface-2" aria-label="Next week">→</button>
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-line/60 px-3 py-2 text-[13px]">
            <span>Paper</span>
            <div className="flex rounded-lg border border-line bg-surface-2 p-0.5">
              {sheet.papers.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPaper(p)}
                  className={`rounded-md px-3 py-1 text-[12px] font-semibold ${
                    activePaper === p ? 'bg-white text-ink shadow-xs' : 'text-ink-2'
                  }`}
                  aria-pressed={activePaper === p}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between px-3 py-2 text-[13px]">
            <span>Ink-saver (black &amp; white)</span>
            <button
              type="button"
              role="switch"
              aria-checked={inkSaver}
              onClick={() => setInkSaver(!inkSaver)}
              className={`relative h-6 w-11 rounded-full transition-colors ${inkSaver ? 'bg-green' : 'bg-line-2'}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${inkSaver ? 'left-[22px]' : 'left-0.5'}`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-line px-4 py-3">
        <button
          type="button"
          onClick={go}
          className="flex min-h-[46px] w-full items-center justify-center rounded-xl bg-ink text-[15px] font-semibold text-bg"
        >
          Preview &amp; save as PDF
        </button>
        <p className="mt-2 text-center text-[11.5px] text-ink-2">
          Print the PDF at home, or send it to a print shop.
        </p>
      </div>
    </div>
  );
}
