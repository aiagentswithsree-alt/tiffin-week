import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DAY_NAMES, MONTHS, fromMinutes, iso, weekDates, weekdayOf } from '../lib/dates';
import { buildDayFromRoutine, buildDayFromScratch, copyWeekForward, copyWeekPreview, materialise, resolveDay } from '../lib/days';
import { categoryOf, leadText, parseServes } from '../lib/inheritance';
import { cookPlan, dayTotals } from '../lib/schedule';
import { SAMPLE_RECIPES } from '../data/recipes';
import { useWeekStore } from '../store/useWeekStore';
import { Banner, Button, Field, Hint, Label, Segmented } from '../components/ui';
import DishPicker from './DishPicker';
import type { Attendance, RecipeItem, Slot, SlotCategory } from '../types';

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
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button onClick={() => {
              const p = copyWeekPreview(state, offset);
              if (!p.planned) return;
              if (p.clashes) { setConfirmCopy({ clashes: p.clashes }); return; }
              update((d) => copyWeekForward(d, offset), 'Week copied forward');
            }}>
              Copy forward
            </Button>
            <Button variant="quiet" onClick={() => nav(`/start-next-week?srcOffset=${offset}`)}>
              Start options →
            </Button>
          </div>
          {preview.planned === 0 && <Hint>Nothing planned in this week to copy.</Hint>}
        </Banner>
      )}

      {/* Wireframe 21 Bottom Action Bar */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => nav('/shopping')}
          className="flex flex-col gap-1 rounded-xl bg-ink p-3 text-left text-white hover:bg-ink/90 cursor-pointer shadow-xs"
        >
          <span className="font-display text-[16px] font-bold">Shopping list →</span>
          <span className="text-[11px] opacity-80">Buy Sunday & Fresh midweek</span>
        </button>
        <button
          type="button"
          onClick={() => nav('/prep')}
          className="flex flex-col gap-1 rounded-xl border border-line-2 bg-white p-3 text-left text-ink hover:bg-surface-2 cursor-pointer shadow-xs"
        >
          <span className="font-display text-[16px] font-bold">Prep plan →</span>
          <span className="text-[11px] text-ink-2">Sunday batch & nightly</span>
        </button>
      </div>

      <div className="mt-2.5">
        <button
          type="button"
          onClick={() => nav(`/start-next-week?srcOffset=${offset}`)}
          className="w-full rounded-xl border border-line bg-white p-2.5 text-center text-xs font-semibold text-ink hover:bg-surface-2 cursor-pointer shadow-xs"
        >
          Start a new week (copy, shuffle, templates, blank) →
        </button>
      </div>
    </div>
  );
}

/** N4 — Day plan with progressive slot filling (empty → partial → planned). */
const DayPlan: React.FC<{ date: Date; onBack: () => void }> = ({ date: d, onBack }) => {
  const { state, update } = useWeekStore();
  const nav = useNavigate();
  const key = iso(d);
  const plan = resolveDay(state, d);
  const totals = dayTotals(plan.groups, state.household);
  const recipes = state.recipes && state.recipes.length > 0 ? state.recipes : SAMPLE_RECIPES;

  // Active slot being edited or picked into
  const [activeSlot, setActiveSlot] = useState<{ gi: number; si: number } | null>(null);

  // Writes strictly to this day instance via materialise
  const onDay = (fn: (groups: import('../types').Group[]) => void, msg?: string) =>
    update((draft) => { const inst = materialise(draft, d); if (inst) fn(inst.groups); }, msg);

  // Group and slot metrics across confirmed groups
  const confirmedGroups = plan.groups.filter((g) => (g.status ?? 'confirmed') === 'confirmed');
  const allConfirmedSlots = confirmedGroups.flatMap((g) => g.slots);
  const filledConfirmedSlots = allConfirmedSlots.filter((s) => Boolean(s.dishId || s.dishName));
  const unpickedConfirmedSlots = allConfirmedSlots.filter((s) => !s.dishId && !s.dishName);

  const isEmptyState = filledConfirmedSlots.length === 0;
  const isPartialState = filledConfirmedSlots.length > 0 && unpickedConfirmedSlots.length > 0;
  const isPlannedState = allConfirmedSlots.length > 0 && unpickedConfirmedSlots.length === 0;

  // Cook order calculated strictly for filled slots
  const filledGroups = plan.groups.map((g) => ({
    ...g,
    slots: g.slots.filter((s) => Boolean(s.dishId || s.dishName)),
  }));
  const cook = cookPlan(filledGroups, state.household);

  // Find shared bases for "Made once, split two ways" (Screen 08 & 12)
  const baseGroups: Record<string, { groupName: string; slotName: string }[]> = {};
  for (const g of confirmedGroups) {
    for (const s of g.slots) {
      if ((s.dishId || s.dishName) && s.base) {
        (baseGroups[s.base] ??= []).push({ groupName: g.name, slotName: s.name });
      }
    }
  }
  const sharedBases = Object.entries(baseGroups).filter(([_, list]) => list.length > 1);

  // Night before prep checklist extracted from picked dishes or shared bases
  const nightTasks: { task: string; forMeal: string }[] = [];
  const handledBases = new Set<string>();

  for (const g of confirmedGroups) {
    for (const s of g.slots) {
      if (!s.dishId && !s.dishName) continue;
      const rec = recipes.find((r) => r.id === s.dishId || r.name === s.dishName);
      if (rec?.nightBeforePrep) {
        nightTasks.push({ task: rec.nightBeforePrep, forMeal: `${g.name} · ${s.name}` });
      } else if (s.base && !handledBases.has(s.base)) {
        handledBases.add(s.base);
        if (s.base === 'one pot of rice') {
          nightTasks.push({ task: 'Cook or soak rice at night', forMeal: s.base });
        } else if (s.base === 'one batter') {
          nightTasks.push({ task: 'Batter out of fridge to warm', forMeal: s.base });
        } else if (s.base === 'one dough') {
          nightTasks.push({ task: 'Knead soft dough night before', forMeal: s.base });
        }
      }
    }
  }

  // Quick actions to pick or clear a dish
  const handlePickDish = (gi: number, si: number, recipe: RecipeItem) => {
    onDay((groups) => {
      const slot = groups[gi].slots[si];
      slot.dishId = recipe.id;
      slot.dishName = recipe.name;
      slot.category = recipe.category;
      // Dish minutes and base populate the slot; slot fields stay as override
      slot.minutes = recipe.cookMinutes ?? (parseInt(recipe.cookTime, 10) || 10);
      slot.base = recipe.base ?? null;
    }, `Picked “${recipe.name}”`);
    setActiveSlot(null);
  };

  const handleClearDish = (gi: number, si: number) => {
    onDay((groups) => {
      const slot = groups[gi].slots[si];
      slot.dishId = null;
      slot.dishName = null;
    }, 'Removed dish');
    setActiveSlot(null);
  };

  // State testing helpers
  const handleFillOne = () => {
    for (let gi = 0; gi < plan.groups.length; gi++) {
      if ((plan.groups[gi].status ?? 'confirmed') !== 'confirmed') continue;
      for (let si = 0; si < plan.groups[gi].slots.length; si++) {
        const s = plan.groups[gi].slots[si];
        if (!s.dishId && !s.dishName) {
          const match = recipes.find((r) => r.category === s.category) ?? recipes[0];
          handlePickDish(gi, si, match);
          return;
        }
      }
    }
  };

  const handleFillAll = () => {
    onDay((groups) => {
      let idx = 0;
      for (const g of groups) {
        if ((g.status ?? 'confirmed') !== 'confirmed') continue;
        for (const s of g.slots) {
          if (!s.dishId && !s.dishName) {
            const match = recipes.find((r) => r.category === s.category) ?? recipes[idx % recipes.length];
            s.dishId = match.id;
            s.dishName = match.name;
            s.category = match.category;
            s.minutes = match.cookMinutes ?? (parseInt(match.cookTime, 10) || 10);
            s.base = match.base ?? null;
            idx++;
          }
        }
      }
    }, 'Filled all empty slots');
  };

  const handleClearAll = () => {
    onDay((groups) => {
      for (const g of groups) {
        for (const s of g.slots) {
          s.dishId = null;
          s.dishName = null;
        }
      }
    }, 'Cleared all dishes');
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-4">
      <Button variant="quiet" onClick={onBack}>← Back to the week</Button>
      
      <div className="mt-1 flex items-baseline justify-between">
        <h2 className="font-display text-[15px] font-semibold">
          {DAY_NAMES[weekdayOf(d)]} {d.getDate()} {MONTHS[d.getMonth()]}
        </h2>
        {isPlannedState && (
          <span className="rounded-full bg-green-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green">
            All planned
          </span>
        )}
        {isPartialState && (
          <span className="rounded-full bg-amber-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber">
            {filledConfirmedSlots.length}/{allConfirmedSlots.length} picked
          </span>
        )}
        {isEmptyState && allConfirmedSlots.length > 0 && (
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-2">
            Empty
          </span>
        )}
      </div>

      <Hint>{plan.routineName ? `Routine: ${plan.routineName}` : 'No routine covers this day.'}</Hint>

      {/* DEV Quick Test bar for verifying all 3 states — removable without touching any other logic (see BUILD-ORDER.md) */}
      {Boolean(import.meta.env.DEV) && (
        <div className="mt-2 flex items-center justify-between rounded-lg border border-dashed border-amber/40 bg-amber-soft/40 px-2 py-1.5 text-[11px] text-ink-2">
          <span className="font-semibold text-amber">DEV test state:</span>
          <div className="flex gap-1.5">
            <button type="button" onClick={handleClearAll} className="rounded border border-line-2 bg-white px-2 py-0.5 font-medium hover:bg-surface-2">
              Empty
            </button>
            <button type="button" onClick={handleFillOne} className="rounded border border-line-2 bg-white px-2 py-0.5 font-medium hover:bg-surface-2">
              Partial (+1)
            </button>
            <button type="button" onClick={handleFillAll} className="rounded border border-line-2 bg-white px-2 py-0.5 font-medium hover:bg-surface-2">
              Planned (All)
            </button>
          </div>
        </div>
      )}

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

          {/* Screen 18 Progress bar for Partial State */}
          {isPartialState && (
            <div className="mt-2.5 rounded-[11px] border border-line bg-white p-3">
              <div className="flex justify-between text-[12.5px]">
                <b className="font-semibold text-ink">{filledConfirmedSlots.length} of {allConfirmedSlots.length} picked</b>
                <span className="text-ink-2 truncate max-w-[200px]">
                  {unpickedConfirmedSlots.map((s) => s.name).slice(0, 2).join(' and ')} still open
                </span>
              </div>
              <div className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-line">
                <div
                  className="rounded-full bg-amber transition-all duration-300"
                  style={{ width: `${(filledConfirmedSlots.length / allConfirmedSlots.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {plan.groups.map((g, gi) => (
            <div key={g.id} className="mt-2.5 overflow-hidden rounded-[11px] border border-line bg-white">
              <div className="flex items-center gap-2.5 px-3 py-2.5">
                <span className={`grid h-[30px] w-[30px] flex-shrink-0 place-items-center rounded-lg text-sm font-bold
                  ${g.mode === 'pack' ? 'bg-green-soft text-green' : 'bg-surface-2 text-ink-2'}`}>
                  {g.mode === 'pack' ? 'P' : 'E'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold">{g.name}</span>
                  <span className="mt-px block text-[11.5px] text-ink-2">
                    {g.slots.length} meals · {g.status}
                    {g.packBy ? ` · pack by ${g.packBy}` : ''}
                  </span>
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
                    const isFilled = Boolean(s.dishId || s.dishName);

                    return (
                      <div key={s.id} className="border-t border-dashed border-line py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[12px] font-semibold text-ink-2">
                            {s.name} · ~{s.time}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-ink-3">Serves</span>
                            <Field aria-label="Servings" type="number" min={1} value={s.serves ?? ''}
                              placeholder={String(g.serves ?? state.household)} className="!min-h-[28px] !w-[42px] px-1 py-0.5 text-center text-[12px]"
                              onChange={(e) => {
                                const parsed = parseServes(e.target.value);
                                if (parsed === undefined) return;
                                onDay((groups) => { groups[gi].slots[si].serves = parsed; });
                              }} />
                            <button type="button" aria-label="Mark cooked"
                              onClick={() => onDay((groups) => { groups[gi].slots[si].done = !groups[gi].slots[si].done; })}
                              className="grid h-7 w-7 place-items-center border-0 bg-transparent text-base text-ink-3 hover:text-ink">
                              {s.done ? '✓' : '○'}
                            </button>
                          </div>
                        </div>

                        {/* Slot state: Filled vs Empty */}
                        {isFilled ? (
                          <div className="mt-1.5 rounded-lg border border-line bg-[#FCFBF8] p-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className="font-display text-[14.5px] font-bold text-ink leading-tight">
                                  {s.dishName}
                                </h3>
                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setActiveSlot({ gi, si })}
                                    className="text-[11.5px] font-medium text-ink-2 underline decoration-dotted hover:text-ink cursor-pointer"
                                  >
                                    {categoryOf(s)} · Edit
                                  </button>
                                  {s.base && (
                                    <span className="rounded bg-green-soft px-1.5 py-0.5 text-[10px] font-semibold text-green">
                                      {s.base}
                                    </span>
                                  )}
                                  {s.minutes > 0 && (
                                    <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-ink-2">
                                      {s.minutes} min
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleClearDish(gi, si)}
                                title="Remove dish"
                                className="text-[11px] text-ink-3 hover:text-red px-1 py-0.5"
                              >
                                Clear
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setActiveSlot({ gi, si })}
                            className="mt-1.5 flex w-full items-center justify-between rounded-xl border border-dashed border-line-2 bg-[#FAF9F6] p-2.5 text-left hover:border-ink cursor-pointer"
                          >
                            <div>
                              <div className="text-[13px] font-medium text-ink-2">Choose a dish +</div>
                              <div className="text-[11px] text-ink-3">
                                Opens on <b className="font-medium text-ink">{categoryOf(s)}</b>
                              </div>
                            </div>
                            <span className="grid h-7 w-7 place-items-center rounded-lg bg-surface-2 text-base font-semibold text-ink-2">
                              +
                            </span>
                          </button>
                        )}

                        <div className={`mt-1 text-[11px] leading-snug ${lead.bad ? 'font-semibold text-red' : 'text-ink-3'}`}>
                          {lead.text}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}

          {/* Screen 18 Footer nudge: "N things for today aren't on the shopping list yet — Add" */}
          {isPartialState && (
            <button
              type="button"
              onClick={() => {
                for (let gi = 0; gi < plan.groups.length; gi++) {
                  if ((plan.groups[gi].status ?? 'confirmed') !== 'confirmed') continue;
                  const si = plan.groups[gi].slots.findIndex((s) => !s.dishId && !s.dishName);
                  if (si !== -1) {
                    setActiveSlot({ gi, si });
                    break;
                  }
                }
              }}
              className="mt-3 flex w-full items-center justify-between rounded-xl border border-amber/30 bg-amber-soft p-3 text-left text-[13px] hover:bg-amber-soft/80 cursor-pointer"
            >
              <span className="text-ink">
                <b className="font-semibold">{unpickedConfirmedSlots.length} {unpickedConfirmedSlots.length === 1 ? 'thing' : 'things'}</b> for today aren't on the shopping list yet
              </span>
              <span className="font-semibold text-amber">Add →</span>
            </button>
          )}

          {/* Screen 08 "Made once, split two ways" Panel */}
          {sharedBases.map(([base, slots]) => (
            <div key={base} className="mt-3 rounded-xl border border-green bg-green-soft p-3 text-ink">
              <span className="block text-[10.5px] font-bold uppercase tracking-wider text-green">
                MADE ONCE, SPLIT TWO WAYS
              </span>
              <span className="mt-0.5 block text-[13px]">
                <b className="font-semibold capitalize">{base}</b> covers {slots.map((x) => `${x.groupName} ${x.slotName}`).join(' and ')}.
              </span>
            </div>
          ))}

          {/* Night Before Prep Checklist (Wireframe 04 / 18 / 08) */}
          <div className="mt-3 rounded-xl border border-line bg-white p-3">
            <div className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-2">
              NIGHT BEFORE
            </div>
            {isEmptyState ? (
              <div className="mt-1 text-[13px] text-ink-2">
                Fills in as you pick the boxes.
              </div>
            ) : nightTasks.length > 0 ? (
              <div className="mt-1.5 space-y-1.5 text-[13px]">
                {nightTasks.map((t, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-2">
                    <span className="text-ink">{t.task}</span>
                    <span className="text-[11.5px] text-ink-2 flex-shrink-0">{t.forMeal}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-1 text-[13px] text-ink-2">
                No night-before prep required for today's dishes.
              </div>
            )}
          </div>

          {/* Morning Cook Order · One stove · Sequential (Wireframe 04 / 13 / 08 / 18) */}
          <div className="mt-3 rounded-xl border border-line bg-white p-3">
            <div className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-2">
              MORNING COOK ORDER · ONE STOVE · SEQUENTIAL
            </div>
            {isEmptyState ? (
              <div className="mt-1 text-[13px] text-ink-2">
                Start times appear once they're picked.
              </div>
            ) : cook.tasks.length === 0 ? (
              <div className="mt-1 text-[13px] text-ink-2">
                No active cooking tasks scheduled.
              </div>
            ) : (
              <>
                <div className="mt-1.5 space-y-1.5 text-[13px]">
                  {cook.tasks.map((t, i) => (
                    <div key={i} className="flex items-baseline gap-2">
                      <b className="w-4 font-bold text-amber">{i + 1}</b>
                      <span className="flex-1 text-ink">{t.name}</span>
                      <span className="text-[11.5px] text-ink-2">
                        {fromMinutes(t.start)} · {t.mins} min
                        {t.shared ? ` · ${t.serves} srv` : ''}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-2.5 border-t border-line pt-2 text-[12px] text-ink-2">
                  Total {cook.total} min of stove · start by <b className="font-semibold text-ink">{cook.start !== null ? fromMinutes(cook.start) : '—'}</b>
                  {cook.naive !== cook.total ? ` (shared prep saved ${cook.naive - cook.total} min)` : ''}
                </div>
              </>
            )}
          </div>

          {/* Shopping Servings summary banner */}
          <Banner>
            <div className="flex items-center justify-between gap-2">
              <div>
                <div>
                  Shopping: {totals.shopping} servings
                  {totals.tentativeShopped ? ` (includes ${totals.tentativeShopped} tentative)` : ''}.
                </div>
                {totals.tentative > 0 && (
                  <div className="text-[11px] text-ink-2 mt-0.5">
                    {totals.tentative} tentative serving{totals.tentative === 1 ? '' : 's'} — buying for them never
                    schedules them to cook.
                  </div>
                )}
              </div>
              <Button variant="outline" className="!py-1 !px-2.5 text-xs flex-shrink-0" onClick={() => nav('/shopping')}>
                View list →
              </Button>
            </div>
          </Banner>
        </>
      )}

      {/* N5 Real Dish Picker Bottom Sheet */}
      {activeSlot && plan.groups[activeSlot.gi]?.slots[activeSlot.si] && (
        <DishPicker
          group={plan.groups[activeSlot.gi]}
          slot={plan.groups[activeSlot.gi].slots[activeSlot.si]}
          household={state.household}
          onPick={(recipe) => handlePickDish(activeSlot.gi, activeSlot.si, recipe)}
          onClear={() => handleClearDish(activeSlot.gi, activeSlot.si)}
          onUpdateServes={(n) => {
            onDay((groups) => {
              groups[activeSlot.gi].slots[activeSlot.si].serves = n;
            }, 'Servings updated');
          }}
          onClose={() => setActiveSlot(null)}
        />
      )}
    </div>
  );
};

