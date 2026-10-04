import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PrintSheet from '../components/PrintSheet';
import { useWeekStore } from '../store/useWeekStore';
import { DAY_NAMES, MONTHS, fromMinutes, iso, weekDates, weekdayOf } from '../lib/dates';
import { resolveDay } from '../lib/days';
import { cookPlan } from '../lib/schedule';
import type { Group, PrintDefaults } from '../types';

/** Cross-group cook schedule for one day. MUST pass EVERY confirmed group (rule
 *  3): computing per-group gave the original fridge card its wrong 6:42 start on
 *  a day that also packed office boxes. */
const filledConfirmed = (groups: Group[]): Group[] =>
  groups
    .filter((g) => (g.status ?? 'confirmed') === 'confirmed')
    .map((g) => ({ ...g, slots: g.slots.filter((s) => Boolean(s.dishId || s.dishName)) }));

/** N17 Daily fridge card (wireframe 33). A5 portrait. */
export default function PrintFridge() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { state } = useWeekStore();

  const paper = (params.get('paper') as PrintDefaults['paperSize']) ?? 'A5';
  const offset = Number(params.get('offset') ?? '0');
  const inkSaver = params.get('ink') === '1';
  const dateParam = params.get('date');

  const dates = weekDates(offset);
  const d = dateParam ? dates.find((x) => iso(x) === dateParam) ?? dates[0] : dates[0];

  const plan = resolveDay(state, d);
  const groups = filledConfirmed(plan.groups);
  const cook = cookPlan(groups, state.household);
  const startText = cook.start !== null ? fromMinutes(cook.start) : '—';

  const toolbar = (
    <div className="flex items-center justify-between gap-2">
      <button type="button" onClick={() => nav('/print')} className="rounded-md px-2 py-1 text-[13px] text-ink-2 hover:bg-surface-2">← Print centre</button>
      <select
        value={iso(d)}
        onChange={(e) => {
          const q = new URLSearchParams(params);
          q.set('date', e.target.value);
          nav(`/print/fridge?${q.toString()}`);
        }}
        className="rounded border border-line px-2 py-1 text-[12px]"
      >
        {dates.map((x) => (
          <option key={iso(x)} value={iso(x)}>
            {DAY_NAMES[weekdayOf(x)]} {x.getDate()} {MONTHS[x.getMonth()]}
          </option>
        ))}
      </select>
      <button type="button" onClick={() => window.print()} className="rounded-md bg-ink px-3 py-1.5 text-[13px] font-semibold text-bg">Save as PDF</button>
    </div>
  );

  return (
    <PrintSheet paper={paper} orientation="portrait" inkSaver={inkSaver} title={`Fridge card · ${DAY_NAMES[weekdayOf(d)]} ${d.getDate()}`} toolbar={toolbar}>
      <section>
        <header className="flex items-baseline justify-between border-b border-ink pb-2">
          <div>
            <h1 className="font-display text-[20px] font-bold leading-tight">
              {DAY_NAMES[weekdayOf(d)]} {d.getDate()} {MONTHS[d.getMonth()]}
            </h1>
            <p className="text-[11.5px] text-ink-2">{plan.routineName ?? 'No routine'}</p>
          </div>
          <div className="text-right">
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-2">Start cooking</div>
            <div data-testid="fridge-start-time" className="font-mono text-[18px] font-bold leading-tight">{startText}</div>
          </div>
        </header>

        <section className="mt-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-ink-2">Today's boxes</h2>
          {plan.groups.length === 0 ? (
            <p className="mt-1 text-[12px] text-ink-2">No groups set up for this day.</p>
          ) : (
            <ul className="mt-1 space-y-1">
              {plan.groups.map((g) => (
                <li key={g.id} className="border border-line-2 p-1.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wide">{g.name}</div>
                  <ul className="mt-0.5 space-y-0.5 text-[12px]">
                    {g.slots.map((s) => (
                      <li key={s.id} className="flex justify-between gap-2">
                        <span>
                          <span className="font-semibold">{s.name}</span>
                          {s.dishName ? <span className="ml-1">{s.dishName}</span> : <span className="ml-1 text-ink-3">—</span>}
                        </span>
                        <span className="text-ink-3">{s.time}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-ink-2">Cook order (single stove)</h2>
          {cook.tasks.length === 0 ? (
            <p className="mt-1 text-[12px] text-ink-2">Nothing on the stove today.</p>
          ) : (
            <ol className="mt-1 space-y-0.5 text-[12px]">
              {cook.tasks.map((t, i) => (
                <li key={`${t.name}-${i}`} data-testid={i === 0 ? 'fridge-cook-first' : undefined} className="flex gap-2">
                  <span className="w-24 shrink-0 font-mono text-[11.5px]">{fromMinutes(t.start)} – {fromMinutes(t.end)}</span>
                  <span className="flex-1">
                    <span className="font-semibold">{t.name}</span>
                    {t.shared ? <span className="ml-1 text-ink-2">(shared · made once)</span> : null}
                    <div className="text-[10.5px] text-ink-3">{t.from.join(', ')}</div>
                  </span>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-1.5 text-[10.5px] text-ink-3">
            Total {cook.total} min across every group{cook.naive > cook.total ? ` · shared prep saved ${cook.naive - cook.total} min` : ''}.
          </p>
        </section>
      </section>
    </PrintSheet>
  );
}
