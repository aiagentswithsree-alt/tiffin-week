import React, { useState } from 'react';
import { DAY_NAMES } from '../lib/dates';
import { findConflicts, resolveConflict } from '../lib/days';
import { STARTER_NAMES, makeGroup, makeRoutine, makeSlot } from '../lib/model';
import { categoryOf, leadText, modeOf, parseServes } from '../lib/inheritance';
import { useWeekStore } from '../store/useWeekStore';
import { ALL_CATEGORIES } from '../types';
import type { DayOffset, EatMode, Group, Slot, SlotCategory } from '../types';
import { Banner, Button, Field, Hint, InheritNote, Label, Segmented, Select, Stepper } from '../components/ui';

/** N2 — routines, groups, slots and the inheritance chain. */
export default function RoutineSetup() {
  const { state, update } = useWeekStore();
  const [active, setActive] = useState(0);
  const [opened, setOpened] = useState(-1);
  const [adding, setAdding] = useState(false);
  const [starter, setStarter] = useState('Custom group');
  const [newName, setNewName] = useState('');

  const routines = state.routines;
  const idx = Math.min(active, Math.max(routines.length - 1, 0));
  const routine = routines[idx];
  const conflicts = findConflicts(routines).filter((c) => c.who.includes(idx));

  if (!routine) {
    return <div className="px-4 py-6"><Hint>No routines yet. Start from onboarding.</Hint></div>;
  }

  const editGroup = (gi: number, fn: (g: Group) => void, msg?: string) =>
    update((d) => fn(d.routines[idx].groups[gi]), msg);
  const editSlot = (gi: number, si: number, fn: (s: Slot) => void) =>
    update((d) => fn(d.routines[idx].groups[gi].slots[si]));

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-4">
      {/* household */}
      <section className="border-b border-line py-3.5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[14.5px] font-semibold">Household</h2>
          <Stepper value={state.household} label="people"
            onChange={(n) => update((d) => { d.household = n; }, 'Household updated')} />
        </div>
        <Hint>People eating, unless a group or a meal says otherwise.</Hint>
      </section>

      {/* routine */}
      <section className="border-b border-line py-3.5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[14.5px] font-semibold">Routine</h2>
          <Button variant="quiet" onClick={() => {
            update((d) => { d.routines.push(makeRoutine('New routine')); }, 'Routine added');
            setActive(routines.length); setOpened(-1);
          }}>+ New</Button>
        </div>

        <div role="tablist" aria-label="Routines" className="flex gap-1.5 overflow-x-auto py-2.5">
          {routines.map((r, i) => (
            <button key={r.id} role="tab" type="button" aria-selected={i === idx}
              onClick={() => { setActive(i); setOpened(-1); }}
              className={`min-h-[34px] whitespace-nowrap rounded-full px-3 py-1.5 text-[12.5px] border
                ${i === idx ? 'border-ink bg-ink font-semibold text-bg' : 'border-line-2 bg-white text-ink'}`}>
              {r.name || 'Unnamed'}
            </button>
          ))}
        </div>

        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <Label htmlFor="rname">Name</Label>
            <Field id="rname" value={routine.name}
              onChange={(e) => update((d) => { d.routines[idx].name = e.target.value; })} />
          </div>
          <Button variant="danger" disabled={routines.length === 1}
            onClick={() => { update((d) => { d.routines.splice(idx, 1); }, 'Routine removed'); setActive(0); setOpened(-1); }}>
            Delete
          </Button>
        </div>

        <div className="mt-2.5">
          <Label htmlFor="rmode">Applies</Label>
          <Select id="rmode" value={routine.mode}
            onChange={(e) => update((d) => { d.routines[idx].mode = e.target.value as 'weekly' | 'date'; })}>
            <option value="weekly">On these weekdays</option>
            <option value="date">On one specific date</option>
          </Select>
        </div>

        {routine.mode === 'weekly' ? (
          <div role="group" aria-label="Weekdays" className="mt-2 grid grid-cols-7 gap-1">
            {DAY_NAMES.map((dn, i) => (
              <button key={dn} type="button" aria-pressed={routine.days.includes(i)}
                onClick={() => update((d) => {
                  const r = d.routines[idx];
                  r.days = r.days.includes(i) ? r.days.filter((x) => x !== i) : [...r.days, i].sort((a, b) => a - b);
                })}
                className={`min-h-[34px] rounded-lg border py-1.5 text-[11px]
                  ${routine.days.includes(i) ? 'border-green bg-green font-semibold text-white' : 'border-line-2 bg-white'}`}>
                {dn}
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-2">
            <Label htmlFor="rdate">Date</Label>
            <Field id="rdate" type="date" value={routine.date}
              onChange={(e) => update((d) => { d.routines[idx].date = e.target.value; })} />
            <Hint>A dated routine beats a weekday routine. A day you edit beats both.</Hint>
          </div>
        )}

        {conflicts.map((c) => (
          <Banner key={`${c.kind}-${c.key}`} tone="warn">
            <div>
              <b className="font-semibold">{c.label} is claimed {c.who.length} times. </b>
              Also wanted by {c.who.filter((i) => i !== idx).map((i) => `“${routines[i].name}”`).join(', ')}. Pick one.
            </div>
            <Button className="mt-2 border border-amber bg-transparent text-amber"
              onClick={() => update((d) => resolveConflict(d.routines, c, idx), `${c.label} given to “${routine.name}”`)}>
              Give {c.label} to “{routine.name}”
            </Button>
          </Banner>
        ))}
      </section>

      {/* groups */}
      <section className="py-3.5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[14.5px] font-semibold">Groups &amp; meals</h2>
          <span className="text-xs text-ink-2">{routine.groups.length} {routine.groups.length === 1 ? 'group' : 'groups'}</span>
        </div>
        <Hint>A group is a place or a shift. Open one to set how it&rsquo;s eaten and what&rsquo;s in it.</Hint>

        {routine.groups.map((g, gi) => (
          <GroupCard
            key={g.id}
            group={g}
            open={opened === gi}
            household={state.household}
            routineDays={routine.mode === 'weekly' ? routine.days : [0, 1, 2, 3, 4, 5, 6]}
            onToggle={() => setOpened(opened === gi ? -1 : gi)}
            onEdit={(fn, msg) => editGroup(gi, fn, msg)}
            onEditSlot={(si, fn) => editSlot(gi, si, fn)}
            onAddSlot={() => editGroup(gi, (gr) => { gr.slots.push(makeSlot('', '')); })}
            onDeleteSlot={(si) => editGroup(gi, (gr) => { gr.slots.splice(si, 1); }, 'Meal removed')}
            onDelete={() => { update((d) => { d.routines[idx].groups.splice(gi, 1); }, `${g.name} removed`); setOpened(-1); }}
          />
        ))}

        {routine.groups.length === 0 && (
          <p className="py-4 text-center text-xs text-ink-2">No groups yet. Add the places or shifts this routine covers.</p>
        )}

        <Button variant="outline" className="mt-2.5" onClick={() => setAdding(true)}>+ Add group</Button>

        {adding && (
          <div className="mt-2.5 rounded-[10px] border border-line bg-white p-3">
            <Label htmlFor="starter">Start from</Label>
            <Select id="starter" value={starter}
              onChange={(e) => { setStarter(e.target.value); setNewName(e.target.value === 'Custom group' ? '' : e.target.value); }}>
              {STARTER_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
            </Select>
            <div className="mt-2.5">
              <Label htmlFor="gname">Group name</Label>
              <Field id="gname" value={newName} placeholder="e.g. Night shift" onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="mt-2.5 flex justify-end gap-2">
              <Button onClick={() => setAdding(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => {
                if (!newName.trim()) return;
                update((d) => { d.routines[idx].groups.push(makeGroup(starter, newName.trim())); }, 'Group added');
                setOpened(routine.groups.length); setAdding(false); setNewName(''); setStarter('Custom group');
              }}>Add group</Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

const GroupCard: React.FC<{
  group: Group; open: boolean; household: number; routineDays: number[];
  onToggle: () => void;
  onEdit: (fn: (g: Group) => void, msg?: string) => void;
  onEditSlot: (si: number, fn: (s: Slot) => void) => void;
  onAddSlot: () => void; onDeleteSlot: (si: number) => void; onDelete: () => void;
}> = ({ group: g, open, household, routineDays, onToggle, onEdit, onEditSlot, onAddSlot, onDeleteSlot, onDelete }) => {
  const summary = g.slots.length
    ? g.slots.map((s) => s.name || '…').join(' · ') +
      (g.tentativeDays.length ? ` · tentative ${g.tentativeDays.map((i) => DAY_NAMES[i]).join('/')}` : '')
    : 'No meals yet';

  return (
    <div className={`mt-2.5 overflow-hidden rounded-[11px] border bg-white ${open ? 'border-green' : 'border-line'}`}>
      <button type="button" aria-expanded={open} onClick={onToggle}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left">
        <span className={`grid h-[30px] w-[30px] flex-shrink-0 place-items-center rounded-lg text-sm font-bold
          ${g.mode === 'pack' ? 'bg-green-soft text-green' : 'bg-surface-2 text-ink-2'}`}>
          {g.mode === 'pack' ? 'P' : 'E'}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block break-words text-[13.5px] font-semibold">{g.name || 'Unnamed group'}</span>
          <span className="mt-px block break-words text-[11.5px] text-ink-2">{summary}</span>
        </span>
        <span>{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="border-t border-line px-3 pb-3">
          <div className="pt-2">
            <Label htmlFor={`gn-${g.id}`}>Group name</Label>
            <Field id={`gn-${g.id}`} value={g.name} onChange={(e) => onEdit((gr) => { gr.name = e.target.value; })} />
          </div>

          <div className="mt-2.5">
            <Label>How it&rsquo;s eaten</Label>
            <Segmented<EatMode> value={g.mode} ariaLabel="How the group is eaten"
              options={[{ value: 'eat', label: 'Eat here' }, { value: 'pack', label: 'Pack & carry' }]}
              onChange={(v) => onEdit((gr) => { gr.mode = v; })} />
            <Hint>Each meal can override this.</Hint>
          </div>

          <div className="mt-2.5">
            <Label>Attendance by default</Label>
            <Segmented<'confirmed' | 'tentative'> value={g.status === 'skipped' ? 'confirmed' : g.status}
              options={[{ value: 'confirmed', label: 'Confirmed' }, { value: 'tentative', label: 'Tentative' }]}
              onChange={(v) => onEdit((gr) => { gr.status = v; })} />
            <div className="mt-2"><Label>Tentative on these days only</Label></div>
            <div className="grid grid-cols-7 gap-1">
              {DAY_NAMES.map((dn, i) => (
                <button key={dn} type="button" aria-pressed={g.tentativeDays.includes(i)} disabled={!routineDays.includes(i)}
                  onClick={() => onEdit((gr) => {
                    gr.tentativeDays = gr.tentativeDays.includes(i)
                      ? gr.tentativeDays.filter((x) => x !== i) : [...gr.tentativeDays, i].sort((a, b) => a - b);
                  })}
                  className={`min-h-[34px] rounded-lg border py-1.5 text-[11px] disabled:opacity-40
                    ${g.tentativeDays.includes(i) ? 'border-green bg-green font-semibold text-white' : 'border-line-2 bg-white'}`}>
                  {dn}
                </button>
              ))}
            </div>
            <Hint>Confirmed Mon–Wed and tentative on Friday is this: leave the default Confirmed and mark Fri here.</Hint>
          </div>

          <div className="mt-2.5 rounded-lg border border-line bg-bg p-2.5">
            <Label>Defaults for every meal in this group</Label>
            <NumberInherit label="Servings" value={g.serves} inherited={household} from="household" scope="group"
              onSet={(v) => onEdit((gr) => { gr.serves = v; })} />
            {(g.mode === 'pack' || g.slots.some((s) => s.mode === 'pack')) && (
              <>
                <div className="mt-2.5">
                  <Label htmlFor={`pb-${g.id}`}>Pack by</Label>
                  <Field id={`pb-${g.id}`} type="time" value={g.packBy ?? ''}
                    onChange={(e) => onEdit((gr) => { gr.packBy = e.target.value || null; })} />
                  <InheritNote overridden={!!g.packBy} from="nothing set" inherited="" scope="group"
                    onReset={() => onEdit((gr) => { gr.packBy = null; })} />
                </div>
                <div className="mt-2.5">
                  <Label htmlFor={`pbd-${g.id}`}>Pack-by day</Label>
                  <Select id={`pbd-${g.id}`} value={String(g.packByDay)}
                    onChange={(e) => onEdit((gr) => { gr.packByDay = Number(e.target.value) as DayOffset; })}>
                    <option value="0">Same day</option><option value="1">Next day</option>
                  </Select>
                </div>
              </>
            )}
          </div>

          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_96px_46px_30px] gap-1.5">
            {['Meal / break', 'Eaten', 'Serves', ''].map((h, i) => (
              <span key={i} className="text-[9.5px] font-semibold uppercase tracking-wide text-ink-3">{h}</span>
            ))}
          </div>

          {g.slots.map((s, si) => (
            <SlotRow key={s.id} slot={s} group={g} household={household}
              onEdit={(fn) => onEditSlot(si, fn)} onDelete={() => onDeleteSlot(si)} />
          ))}

          <Button variant="outline" onClick={onAddSlot}>+ Meal / break</Button>
          <Button variant="danger" className="mt-2" onClick={onDelete}>Delete this group</Button>
        </div>
      )}
    </div>
  );
};

const NumberInherit: React.FC<{
  label: string; value: number | null; inherited: number; from: string; scope?: string;
  onSet: (v: number | null) => void;
}> = ({ label, value, inherited, from, scope, onSet }) => {
  const [invalid, setInvalid] = useState(false);
  const id = `ni-${label}-${from}`;
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Field id={id} type="number" min={1} step={1} invalid={invalid}
        value={value ?? ''} placeholder={String(inherited)}
        onChange={(e) => {
          const parsed = parseServes(e.target.value);
          if (parsed === undefined) { setInvalid(true); return; }
          setInvalid(false); onSet(parsed);
        }} />
      {invalid && <div className="mt-0.5 text-[11px] text-red">Enter a whole number of 1 or more.</div>}
      <InheritNote overridden={value !== null} from={from} inherited={inherited} scope={scope}
        onReset={() => { setInvalid(false); onSet(null); }} />
    </div>
  );
};

const SlotRow: React.FC<{
  slot: Slot; group: Group; household: number;
  onEdit: (fn: (s: Slot) => void) => void; onDelete: () => void;
}> = ({ slot: s, group: g, household, onEdit, onDelete }) => {
  const [more, setMore] = useState(false);
  const [badServes, setBadServes] = useState(false);
  const lead = leadText(g, s);
  const packed = modeOf(g, s) === 'pack';

  return (
    <div className="border-t border-dashed border-line py-2">
      <div className="grid grid-cols-[minmax(0,1fr)_96px_46px_30px] items-start gap-1.5">
        <Field aria-label="Meal name" value={s.name} placeholder="Name" className="px-1.5 py-1.5 text-[12.5px]"
          onChange={(e) => onEdit((x) => { x.name = e.target.value; })} />
        <Field aria-label="Time eaten" type="time" value={s.time} className="px-1.5 py-1.5 text-[12.5px]"
          onChange={(e) => onEdit((x) => { x.time = e.target.value; })} />
        <Field aria-label="Servings" type="number" min={1} invalid={badServes}
          value={s.serves ?? ''} placeholder={String(g.serves ?? household)} className="px-1.5 py-1.5 text-[12.5px]"
          onChange={(e) => {
            const parsed = parseServes(e.target.value);
            if (parsed === undefined) { setBadServes(true); return; }
            setBadServes(false); onEdit((x) => { x.serves = parsed; });
          }} />
        <button type="button" aria-label={`Delete ${s.name || 'meal'}`} onClick={onDelete}
          className="min-h-[32px] border-0 bg-transparent p-1 text-base text-ink-3 hover:text-red">×</button>
      </div>

      <button type="button" onClick={() => setMore(!more)}
        className="min-h-[28px] border-0 bg-transparent pb-0.5 pt-1.5 text-[11.5px] font-semibold text-green">
        {more ? 'Fewer options' : 'More options'}
      </button>

      {more && (
        <div className="mt-1.5 rounded-lg border border-line bg-bg p-2.5">
          <div className="mb-2.5">
            <Label>How this one is eaten</Label>
            <Segmented<EatMode | null> value={s.mode}
              options={[{ value: null, label: 'Inherit' }, { value: 'eat', label: 'Eat here' }, { value: 'pack', label: 'Pack & carry' }]}
              onChange={(v) => onEdit((x) => { x.mode = v; })} />
            <div className="mt-1 text-[10.5px] text-ink-3">
              {s.mode ? 'overrides the group' : `from group · ${g.mode === 'pack' ? 'Pack & carry' : 'Eat here'}`}
            </div>
          </div>

          <div className="mb-2.5">
            <Label htmlFor={`td-${s.id}`}>Eaten on</Label>
            <Select id={`td-${s.id}`} value={String(s.timeDay)}
              onChange={(e) => onEdit((x) => { x.timeDay = Number(e.target.value) as DayOffset; })}>
              <option value="0">Same day</option><option value="1">Next day</option>
            </Select>
          </div>

          <div className="mb-2.5">
            <Label htmlFor={`mn-${s.id}`}>Stove time (min)</Label>
            <Field id={`mn-${s.id}`} type="number" min={0} value={s.minutes}
              onChange={(e) => { const v = Number(e.target.value); onEdit((x) => { x.minutes = Number.isFinite(v) && v >= 0 ? v : 0; }); }} />
          </div>

          <div className="mb-2.5">
            <Label htmlFor={`bs-${s.id}`}>Shared prep (made once)</Label>
            <Field id={`bs-${s.id}`} value={s.base ?? ''} placeholder="e.g. one pot of rice"
              onChange={(e) => onEdit((x) => { x.base = e.target.value.trim() || null; })} />
            <div className="mt-1 text-[10.5px] text-ink-3">Meals sharing this name are cooked once, in a bigger batch.</div>
          </div>

          <div className="mb-2.5">
            <Label htmlFor={`ct-${s.id}`}>Opens on</Label>
            <Select id={`ct-${s.id}`} value={categoryOf(s)}
              onChange={(e) => onEdit((x) => { x.category = e.target.value === 'All recipes' ? null : (e.target.value as SlotCategory); })}>
              <option>All recipes</option>
              {ALL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            <div className="mt-1 text-[10.5px] text-ink-3">
              {s.category ? 'picker opens here' : 'picker opens on all recipes'}
            </div>
          </div>

          <div className="mb-2.5">
            <Label htmlFor={`rb-${s.id}`}>{packed ? 'Pack this one by' : 'Ready by'}</Label>
            <Field id={`rb-${s.id}`} type="time" value={s.readyBy ?? ''}
              placeholder={packed ? (g.packBy ?? '') : s.time}
              onChange={(e) => onEdit((x) => { x.readyBy = e.target.value || null; })} />
            <InheritNote overridden={s.readyBy !== null} from={packed ? 'group pack-by' : 'the time eaten'}
              inherited={packed ? (g.packBy ?? '') : s.time} onReset={() => onEdit((x) => { x.readyBy = null; })} />
          </div>

          <div className="mb-2.5">
            <Label htmlFor={`rd-${s.id}`}>Prepared on</Label>
            <Select id={`rd-${s.id}`} value={s.readyByDay === null ? '' : String(s.readyByDay)}
              onChange={(e) => onEdit((x) => { x.readyByDay = e.target.value === '' ? null : (Number(e.target.value) as DayOffset); })}>
              <option value="">Inherit</option><option value="0">Same day</option><option value="1">Next day</option>
            </Select>
          </div>

          <div className={`mt-1 text-[11.5px] leading-snug ${lead.bad ? 'font-semibold text-red' : 'text-ink-2'}`}>
            {lead.text}
          </div>
        </div>
      )}
    </div>
  );
};
