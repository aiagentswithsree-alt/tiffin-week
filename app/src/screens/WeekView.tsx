import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DAY_NAMES, MONTHS, fromMinutes, iso, weekDates, weekdayOf } from '../lib/dates';
import { buildDayFromRoutine, buildDayFromScratch, copyWeekForward, copyWeekPreview, materialise, resolveDay } from '../lib/days';
import { leadText, parseServes, servesOf } from '../lib/inheritance';
import { cookPlan, dayTotals } from '../lib/schedule';
import { useWeekStore } from '../store/useWeekStore';
import { Banner, Button, Field, Hint, Label, Segmented } from '../components/ui';
import type { Attendance } from '../types';

/** N3 — the week, and a single day resolved from its routine or its own instance. */
export default function WeekView() {
  const { state, update } = useWeekStore();
  const { date } = useParams();
  const nav = useNavigate();
  const [offset, setOffset] = useState(0);
  const [confirmCopy, setConfirmCopy] = useState<{ clashes: number } | null>(null);

  const dates = weekDates(offset);
  const open = date ? dates.find((d) => iso(d) === date) ?? null : null;

  if (open) return <DayPlan date={open} onBack={() => nav('/week')} />;

  const preview = copyWeekPreview(state, offset);

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-4">
      <div className="mt-2.5 flex items-center justify-between">
        <Button onClick={() => setOffset(offset - 1)} aria-label="Previous week">←</Button>
        <strong className="text-sm">
          {dates[0].getDate()} – {dates[6].getDate()} {MONTHS[dates[6].getMonth()]} {dates[6].getFullYear()}
        </strong>
        <Button onClick={() => setOffset(offset + 1)} aria-label="Next week">→</Button>
      </div>

      <Hint>Each day follows its routine until you edit it. Editing a day changes that day only.</Hint>

      {dates.map((d) => {
        const plan = resolveDay(state, d);
        return (
          <button key={iso(d)} type="button" onClick={() => nav(`/week/${iso(d)}`)}
            className="mt-2 flex w-full items-start gap-2.5 rounded-[11px] border border-line bg-white px-3 py-2.5 text-left hover:border-line-2">
            <span className="w-10 flex-shrink-0">
              <span className="block text-[10px] font-semibold tracking-wide text-ink-2">{DAY_NAMES[weekdayOf(d)].toUpperCase()}</span>
              <span className="block font-display text-[19px] font-bold leading-tight">{d.getDate()}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold">{plan.routineName ?? 'No routine yet'}</span>
              <span className="mt-px block break-words text-[11.5px] text-ink-2">
                {plan.groups.length
                  ? plan.groups.map((g) => g.name + (g.status === 'tentative' ? ' (tentative)' : g.status === 'skipped' ? ' (skipped)' : '')).join(' · ')
                  : 'Tap to choose a routine or start from scratch'}
              </span>
              <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide
                ${plan.instance ? 'bg-amber-soft text-amber' : 'bg-surface-2 text-ink-2'}`}>
                {plan.instance ? 'Edited for this day' : 'Follows routine'}
              </span>
            </span>
          </button>
        );
      })}

      {confirmCopy ? (
        <Banner tone="warn">
          <div>{confirmCopy.clashes} day{confirmCopy.clashes === 1 ? '' : 's'} in the destination week already have plans. Replace them?</div>
          <div className="mt-2 flex gap-2">
            <Button onClick={() => { update((d) => copyWeekForward(d, offset), 'Week copied forward'); setConfirmCopy(null); }}>
              Replace them
            </Button>
            <Button onClick={() => setConfirmCopy(null)}>Cancel</Button>
          </div>
        </Banner>
      ) : (
        <Banner>
          <div>
            Copy this week forward: meals, servings, overrides, attendance and overnight offsets move to the next
            week as independent days. Done marks reset. Routines are not touched.
          </div>
          <Button className="mt-2" onClick={() => {
            const p = copyWeekPreview(state, offset);
            if (!p.planned) return;
            if (p.clashes) { setConfirmCopy({ clashes: p.clashes }); return; }
            update((d) => copyWeekForward(d, offset), 'Week copied forward');
          }}>
            Copy to next week
          </Button>
          {preview.planned === 0 && <Hint>Nothing planned in this week to copy.</Hint>}
        </Banner>
      )}
    </div>
  );
}

const DayPlan: React.FC<{ date: Date; onBack: () => void }> = ({ date: d, onBack }) => {
  const { state, update } = useWeekStore();
  const key = iso(d);
  const plan = resolveDay(state, d);
  const totals = dayTotals(plan.groups, state.household);
  const cook = cookPlan(plan.groups, state.household);

  const onDay = (fn: (groups: import('../types').Group[]) => void, msg?: string) =>
    update((draft) => { const inst = materialise(draft, d); if (inst) fn(inst.groups); }, msg);

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-4">
      <Button variant="quiet" onClick={onBack}>← Back to the week</Button>
      <h2 className="mt-1.5 font-display text-[14.5px] font-semibold">
        {DAY_NAMES[weekdayOf(d)]} {d.getDate()} {MONTHS[d.getMonth()]}
      </h2>
      <Hint>{plan.routineName ? `Routine: ${plan.routineName}` : 'No routine covers this day.'}</Hint>

      {!plan.routineId && plan.groups.length === 0 ? (
        <>
          <Banner>
            No routine covers this day. Pick one, or start from scratch — either way it stays a one-off until you
            update a template.
          </Banner>
          <div className="mt-2.5">
            <Label>Choose a routine</Label>
            {state.routines.map((r) => (
              <Button key={r.id} variant="outline" className="mt-2"
                onClick={() => update((draft) => buildDayFromRoutine(draft, key, draft.routines.find((x) => x.id === r.id)!, weekdayOf(d)), `Day set from “${r.name}”`)}>
                {r.name}
              </Button>
            ))}
            <Button variant="outline" className="mt-2"
              onClick={() => update((draft) => buildDayFromScratch(draft, key), 'Day created from scratch')}>
              Create this day from scratch
            </Button>
          </div>
        </>
      ) : (
        <>
          <Banner tone={plan.instance ? 'warn' : 'neutral'}>
            {plan.instance ? (
              <>
                <div>This day has been edited. The routine template and every other day using it are unchanged.</div>
                <div className="mt-2 flex gap-2">
                  <Button onClick={() => update((draft) => { delete draft.dayInstances[key]; }, 'Day reverted to its routine')}>
                    Revert to routine
                  </Button>
                  <Button onClick={() => update((draft) => {
                    const inst = draft.dayInstances[key];
                    const rt = draft.routines.find((x) => x.id === inst.routineId);
                    if (rt) rt.groups = structuredClone(inst.groups);
                    delete draft.dayInstances[key];
                  }, 'Routine template updated from this day')}>
                    Update routine template
                  </Button>
                </div>
              </>
            ) : (
              <div>Following the routine. Any edit below applies to this day only.</div>
            )}
          </Banner>

          {plan.groups.map((g, gi) => (
            <div key={g.id} className="mt-2.5 overflow-hidden rounded-[11px] border border-line bg-white">
              <div className="flex items-center gap-2.5 px-3 py-2.5">
                <span className={`grid h-[30px] w-[30px] flex-shrink-0 place-items-center rounded-lg text-sm font-bold
                  ${g.mode === 'pack' ? 'bg-green-soft text-green' : 'bg-surface-2 text-ink-2'}`}>
                  {g.mode === 'pack' ? 'P' : 'E'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold">{g.name}</span>
                  <span className="mt-px block text-[11.5px] text-ink-2">{g.slots.length} meals · {g.status}</span>
                </span>
              </div>

              <div className="border-t border-line px-3 pb-3 pt-2">
                <Label>Attendance today</Label>
                <Segmented<Attendance> value={g.status}
                  options={[
                    { value: 'confirmed', label: 'Confirmed' },
                    { value: 'tentative', label: 'Tentative' },
                    { value: 'skipped', label: 'Skipped' },
                  ]}
                  onChange={(v) => onDay((groups) => {
                    groups[gi].status = v;
                    if (v === 'confirmed') groups[gi].shop = true;
                    if (v === 'skipped') groups[gi].shop = false;
                  })} />

                {g.status === 'tentative' && (
                  <>
                    <Hint>
                      {g.shop
                        ? 'Tentative, but its ingredients ARE on the shopping list. Still not scheduled to cook.'
                        : 'Tentative — not on the shopping list and not scheduled to cook.'}
                    </Hint>
                    <Button variant="quiet" onClick={() => onDay((groups) => { groups[gi].shop = !groups[gi].shop; })}>
                      {g.shop ? 'Remove from shopping list' : 'Buy ingredients anyway'}
                    </Button>
                  </>
                )}

                {g.status === 'skipped' ? (
                  <Hint>Skipped today — out of shopping and out of the cook schedule.</Hint>
                ) : (
                  g.slots.map((s, si) => {
                    const lead = leadText(g, s);
                    return (
                      <div key={s.id} className="border-t border-dashed border-line py-2">
                        <div className="grid grid-cols-[minmax(0,1fr)_96px_46px_30px] items-start gap-1.5">
                          <Field aria-label="Meal name" value={s.name} className="px-1.5 py-1.5 text-[12.5px]"
                            onChange={(e) => onDay((groups) => { groups[gi].slots[si].name = e.target.value; })} />
                          <Field aria-label="Time eaten" type="time" value={s.time} className="px-1.5 py-1.5 text-[12.5px]"
                            onChange={(e) => onDay((groups) => { groups[gi].slots[si].time = e.target.value; })} />
                          <Field aria-label="Servings" type="number" min={1} value={s.serves ?? ''}
                            placeholder={String(g.serves ?? state.household)} className="px-1.5 py-1.5 text-[12.5px]"
                            onChange={(e) => {
                              const parsed = parseServes(e.target.value);
                              if (parsed === undefined) return;
                              onDay((groups) => { groups[gi].slots[si].serves = parsed; });
                            }} />
                          <button type="button" aria-label="Mark cooked"
                            onClick={() => onDay((groups) => { groups[gi].slots[si].done = !groups[gi].slots[si].done; })}
                            className="min-h-[32px] border-0 bg-transparent p-1 text-base text-ink-3">
                            {s.done ? '✓' : '○'}
                          </button>
                        </div>
                        <div className={`mt-1 text-[11.5px] leading-snug ${lead.bad ? 'font-semibold text-red' : 'text-ink-2'}`}>
                          {lead.text}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}

          <Banner>
            <div>
              Shopping: {totals.shopping} servings
              {totals.tentativeShopped ? ` (includes ${totals.tentativeShopped} tentative)` : ''}.
            </div>
            {totals.tentative > 0 && (
              <div>
                {totals.tentative} tentative serving{totals.tentative === 1 ? '' : 's'} — buying for them never
                schedules them to cook.
              </div>
            )}
          </Banner>

          <Banner>
            <div className="font-semibold">Cook order · one stove · sequential</div>
            {cook.tasks.length === 0 ? (
              <div>Nothing confirmed to cook today.</div>
            ) : (
              <>
                {cook.tasks.map((t, i) => (
                  <div key={i}>
                    {fromMinutes(t.start)} · {t.name} · {t.mins} min
                    {t.shared ? ` · ${t.serves} servings, covers ${t.from.join(' + ')}` : ''}
                  </div>
                ))}
                <div className="mt-1">
                  Total {cook.total} min · start {cook.start !== null ? fromMinutes(cook.start) : '—'}
                  {cook.naive !== cook.total ? ` (shared prep saved ${cook.naive - cook.total} min)` : ''}
                </div>
              </>
            )}
          </Banner>
        </>
      )}
    </div>
  );
};
