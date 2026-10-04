import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PrintSheet from '../components/PrintSheet';
import { useWeekStore } from '../store/useWeekStore';
import { MONTHS, weekDates, fromMinutes } from '../lib/dates';
import { buildPrepPlan } from '../lib/prep';
import type { PrintDefaults } from '../types';

/** N15 Prep sheet (wireframe 31). A4 portrait, derived from buildPrepPlan. */
export default function PrintPrep() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { state } = useWeekStore();

  const paper = (params.get('paper') as PrintDefaults['paperSize']) ?? 'A4';
  const offset = Number(params.get('offset') ?? '0');
  const inkSaver = params.get('ink') === '1';

  const plan = buildPrepPlan(state, offset);
  const dates = weekDates(offset);
  const dateRange = `${dates[0].getDate()}–${dates[6].getDate()} ${MONTHS[dates[6].getMonth()]} ${dates[6].getFullYear()}`;

  const toolbar = (
    <div className="flex items-center justify-between gap-2">
      <button type="button" onClick={() => nav('/print')} className="rounded-md px-2 py-1 text-[13px] text-ink-2 hover:bg-surface-2">← Print centre</button>
      <div className="text-[12px] text-ink-2">{paper} portrait</div>
      <button type="button" onClick={() => window.print()} className="rounded-md bg-ink px-3 py-1.5 text-[13px] font-semibold text-bg">Save as PDF</button>
    </div>
  );

  return (
    <PrintSheet paper={paper} orientation="portrait" inkSaver={inkSaver} title="Prep sheet" toolbar={toolbar}>
      <section>
        <header className="flex items-end justify-between border-b border-ink pb-2">
          <div>
            <h1 className="font-display text-[22px] font-bold leading-tight">Prep sheet</h1>
            <p className="text-[12px] text-ink-2">{dateRange}</p>
          </div>
          <div className="text-[11px] text-ink-2">
            {plan.totalDishesCount} dish{plan.totalDishesCount === 1 ? '' : 'es'} · {plan.sundayTotalMins} min batch
          </div>
        </header>

        {plan.leadNotices.length > 0 ? (
          <div className="mt-3 border border-ink p-2">
            <div className="text-[10.5px] font-semibold uppercase tracking-wide">Heads-up · lead times</div>
            <ul className="mt-1 space-y-0.5 text-[11.5px]">
              {plan.leadNotices.map((n) => (
                <li key={n.id}>
                  <span className="font-semibold">{n.nightLabel}:</span> {n.notice}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <section className="mt-4">
          <h2 className="font-display text-[14px] font-bold uppercase tracking-wide">Sunday batch</h2>
          {plan.sundayTasks.length === 0 ? (
            <p className="mt-1 text-[12px] text-ink-2">Nothing to pre-cook on Sunday.</p>
          ) : (
            <ul className="mt-1 space-y-1">
              {plan.sundayTasks.map((t) => (
                <li key={t.id} className="flex gap-2 border-b border-line-2 py-1 text-[12.5px]">
                  <span className="mt-0.5 inline-block h-3.5 w-3.5 flex-shrink-0 border border-ink" aria-hidden />
                  <span className="flex-1">
                    <span className="font-semibold">{t.title}</span>
                    <span className="ml-1 text-ink-2">· {t.kind} · keeps {t.keeps} · {t.mins} min</span>
                    <div className="text-[10.5px] text-ink-3">For: {t.dishes.join(', ')}</div>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-4">
          <h2 className="font-display text-[14px] font-bold uppercase tracking-wide">Each night</h2>
          {plan.nightlyByDay.length === 0 ? (
            <p className="mt-1 text-[12px] text-ink-2">No nightly prep needed this week.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {plan.nightlyByDay.map((n) => (
                <div key={n.nightLabel} className="border border-line-2 p-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wide">{n.nightLabel} · {n.totalMins} min</div>
                  <ul className="mt-1 space-y-0.5 text-[11.5px]">
                    {n.tasks.map((t) => (
                      <li key={t.id} className="flex gap-1.5">
                        <span className="mt-0.5 inline-block h-3 w-3 flex-shrink-0 border border-ink" aria-hidden />
                        <span>{t.title} <span className="text-ink-3">· {t.mins} min</span></span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-4">
          <h2 className="font-display text-[14px] font-bold uppercase tracking-wide">Each morning · stove order</h2>
          {plan.morningsByDay.length === 0 ? (
            <p className="mt-1 text-[12px] text-ink-2">No morning cook scheduled.</p>
          ) : (
            <div className="space-y-2">
              {plan.morningsByDay.map((m) => (
                <div key={m.dayLabel} className="border border-line-2 p-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wide">{m.dayLabel}</span>
                    <span className="text-[10.5px] text-ink-3">{m.cook.total} min on stove</span>
                  </div>
                  <ol className="mt-1 space-y-0.5 text-[11.5px]">
                    {m.cook.tasks.map((t, i) => (
                      <li key={`${t.name}-${i}`} className="flex gap-2">
                        <span className="w-20 shrink-0 font-mono text-[11px]">{fromMinutes(t.start)} – {fromMinutes(t.end)}</span>
                        <span className="flex-1">
                          <span className="font-semibold">{t.name}</span>
                          {t.shared ? <span className="ml-1 text-ink-2">(shared base — made once)</span> : null}
                          <div className="text-[10.5px] text-ink-3">{t.from.join(', ')}</div>
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </PrintSheet>
  );
}
