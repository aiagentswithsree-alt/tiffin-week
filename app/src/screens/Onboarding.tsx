import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ONBOARDING, seedState } from '../lib/model';
import { useWeekStore } from '../store/useWeekStore';
import { Button } from '../components/ui';

/** N1 — asks what the household needs, not who they are. */
export default function Onboarding() {
  const { replace } = useWeekStore();
  const nav = useNavigate();
  const [picked, setPicked] = useState<Set<string>>(new Set(['Home']));

  const toggle = (k: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-line px-4 pb-2.5 pt-4">
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.11em] text-ink-2">Tiffin Week · Setup</div>
        <h1 className="mt-1 font-display text-[21px] font-bold tracking-tight">Which routines do you need?</h1>
        <p className="text-xs leading-snug text-ink-2">
          Pick everything that applies. You can add, rename or delete any of it later.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {ONBOARDING.map((o) => (
          <button
            key={o.key}
            type="button"
            aria-pressed={picked.has(o.key)}
            onClick={() => toggle(o.key)}
            className={`mt-2.5 block w-full rounded-[11px] border p-3 text-left
              ${picked.has(o.key) ? 'border-green bg-green-soft' : 'border-line-2 bg-white'}`}
          >
            <span className="block text-[13.5px] font-semibold">{o.title}</span>
            <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-2">{o.detail}</span>
          </button>
        ))}
      </div>

      <div className="border-t border-line bg-bg px-4 py-3">
        <Button
          variant="primary"
          className="w-full"
          disabled={picked.size === 0}
          onClick={() => { replace(seedState([...picked]), 'Routines created — edit anything'); nav('/routines'); }}
        >
          Create my routines
        </Button>
        <div className="mt-2 text-center text-[11.5px] text-ink-2">Nothing is fixed — these are starting points.</div>
      </div>
    </div>
  );
}
