import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MONTHS, addDays, iso, weekDates } from '../lib/dates';
import { applyWeekTemplate, copyWeekForward, saveWeekTemplate, shuffleRepeats, startBlankWeek } from '../lib/days';
import { useWeekStore } from '../store/useWeekStore';
import { DEFAULT_WEEK_TEMPLATES } from '../data/templates';
import type { WeekTemplate } from '../types';

/**
 * N12 Start next week (Wireframe 28).
 *
 * Four starting options:
 * 1. Copy last week (reusing copyWeekForward)
 * 2. Shuffle repeats (rotates dishes so no dish lands in same weekday + slot)
 * 3. Start from a saved week template
 * 4. Start blank (routines apply, dishes cleared)
 * Plus "Save this week as a template".
 *
 * All four options confirm before replacing days that already have plans.
 */
export default function StartNextWeek() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { state, update } = useWeekStore();

  // Source week (default 0) and target week (default 1)
  const srcOffset = parseInt(params.get('srcOffset') ?? params.get('offset') ?? '0', 10);
  const targetOffset = parseInt(params.get('targetOffset') ?? String(srcOffset + 1), 10);

  const targetDates = weekDates(targetOffset);
  const srcDates = weekDates(srcOffset);

  const templates = state.weekTemplates && state.weekTemplates.length > 0
    ? state.weekTemplates
    : DEFAULT_WEEK_TEMPLATES;

  // Clashes in target week
  const clashes = targetDates.filter((d) => Boolean(state.dayInstances[iso(d)])).length;

  // Pending action awaiting confirmation if clashes exist
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Save template dialog state
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');

  const executeOrConfirm = (action: () => void) => {
    if (clashes > 0) {
      setPendingAction(() => action);
    } else {
      action();
      nav('/week');
    }
  };

  const handleCopyLastWeek = () => {
    executeOrConfirm(() => {
      update((draft) => {
        copyWeekForward(draft, srcOffset);
      }, 'Copied last week forward');
    });
  };

  const handleShuffleRepeats = () => {
    executeOrConfirm(() => {
      update((draft) => {
        shuffleRepeats(draft, srcOffset);
      }, 'Shuffled repeated dishes forward');
    });
  };

  const handleStartFromTemplate = (template: WeekTemplate) => {
    executeOrConfirm(() => {
      update((draft) => {
        applyWeekTemplate(draft, template, targetOffset);
      }, `Started from week template “${template.name}”`);
    });
  };

  const handleStartBlank = () => {
    executeOrConfirm(() => {
      update((draft) => {
        startBlankWeek(draft, targetOffset);
      }, 'Started blank week with routines applied');
    });
  };

  const handleConfirmReplace = () => {
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
      nav('/week');
    }
  };

  const handleSaveWeekAsTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) return;

    update((draft) => {
      saveWeekTemplate(draft, srcOffset, templateName, templateDesc);
    }, `Saved week template “${templateName}”`);

    setTemplateName('');
    setTemplateDesc('');
    setSavingTemplate(false);
  };

  const targetDateLabel = `${targetDates[0].getDate()} ${MONTHS[targetDates[0].getMonth()]} – ${targetDates[6].getDate()} ${MONTHS[targetDates[6].getMonth()]}`;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg text-ink">
      {/* Top Header — Screen 28 */}
      <div className="flex flex-shrink-0 items-center gap-1 border-b border-line px-2 py-3">
        <button
          type="button"
          onClick={() => nav('/week')}
          aria-label="Back to the week"
          className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-surface-2 cursor-pointer"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path
              d="M11 3.5 5.5 9l5.5 5.5"
              stroke="#1B1A17"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className="flex flex-1 flex-col min-w-0">
          <h1 className="font-display text-[20px] font-bold leading-tight">
            Plan {targetDateLabel}
          </h1>
          <span className="text-[12.5px] text-[#6B675F] truncate">
            How do you want to start?
          </span>
        </div>
      </div>

      {/* Clashes Confirmation Alert */}
      {pendingAction && (
        <div role="alert" className="border-b border-[#E0A85B] bg-[#FFF9F0] px-4 py-3 text-xs text-ink space-y-2">
          <div className="font-semibold text-[#8F5A0F]">
            {clashes} day{clashes === 1 ? '' : 's'} in the destination week already have plans. Replace them?
          </div>
          <div className="flex gap-2 pt-0.5">
            <button
              type="button"
              onClick={handleConfirmReplace}
              className="rounded bg-ink px-3 py-1.5 text-xs font-semibold text-white hover:bg-ink/90 cursor-pointer"
            >
              Replace them
            </button>
            <button
              type="button"
              onClick={() => setPendingAction(null)}
              className="rounded border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface-2 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Scrollable Options Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {/* Option 1: Copy last week */}
        <div className="rounded-[14px] border-2 border-ink bg-white p-3.5 space-y-2 shadow-xs">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-[16px] font-semibold text-ink leading-tight">Copy last week</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-[#5F5B54]">
                Keeps day types and every pick. Swap only what you want — usually two or three dishes.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleCopyLastWeek}
              className="rounded-lg bg-ink px-3.5 py-1.5 text-[13px] font-semibold text-white hover:bg-ink/90 cursor-pointer shadow-xs"
            >
              Copy last week
            </button>
            <button
              type="button"
              onClick={handleShuffleRepeats}
              className="rounded-lg border border-[#B4761A] bg-[#F6EBD9] px-3 py-1.5 text-[12.5px] font-semibold text-[#8F5A0F] hover:bg-[#F6EBD9]/80 cursor-pointer"
            >
              Shuffle repeats
            </button>
          </div>
        </div>

        {/* Option 2: Shuffle repeats standalone card */}
        <div className="rounded-[14px] border border-line bg-white p-3.5 space-y-2 shadow-xs">
          <div>
            <h2 className="text-[16px] font-semibold text-ink leading-tight">Shuffle repeats</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-[#5F5B54]">
              Copy last week, but rotate dishes so no dish lands in the same weekday + slot as last week, where an alternative exists.
            </p>
          </div>
          <button
            type="button"
            onClick={handleShuffleRepeats}
            className="rounded-lg border border-line bg-surface-2 px-3.5 py-1.5 text-[13px] font-semibold text-ink hover:bg-surface-3 cursor-pointer"
          >
            Shuffle and start
          </button>
        </div>

        {/* Option 3: Start from a saved week (Week templates) */}
        <div className="rounded-[14px] border border-line bg-white p-3.5 space-y-2.5 shadow-xs">
          <div>
            <h2 className="text-[16px] font-semibold text-ink leading-tight">Start from a saved week</h2>
            <p className="mt-0.5 text-[12.5px] text-[#6B675F]">
              Week templates hold a full week of picks across all 7 days.
            </p>
          </div>

          <div className="space-y-1.5 pt-0.5">
            {templates.map((tmpl) => (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => handleStartFromTemplate(tmpl)}
                className="flex w-full items-center justify-between min-h-[42px] px-3 rounded-[9px] bg-surface-2 hover:bg-surface-3 text-left transition-colors cursor-pointer"
              >
                <span className="font-semibold text-[13.5px] text-ink">{tmpl.name}</span>
                {tmpl.description && (
                  <span className="text-[12px] text-[#6B675F]">{tmpl.description}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Option 4: Start blank */}
        <div className="rounded-[14px] border border-line bg-white p-3.5 space-y-2 shadow-xs">
          <div>
            <h2 className="text-[16px] font-semibold text-ink leading-tight">Start blank</h2>
            <p className="mt-1 text-[13px] text-[#5F5B54]">
              Day types only — no dishes picked.
            </p>
          </div>
          <button
            type="button"
            onClick={handleStartBlank}
            className="rounded-lg border border-line bg-white px-3.5 py-1.5 text-[13px] font-semibold text-ink hover:bg-surface-2 cursor-pointer"
          >
            Start blank
          </button>
        </div>

        {/* Inline Save Template Form Modal */}
        {savingTemplate ? (
          <form
            onSubmit={handleSaveWeekAsTemplate}
            className="rounded-[14px] border border-ink bg-white p-3.5 space-y-2.5 shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="font-display text-[15px] font-bold text-ink">
                Save this week as a template
              </span>
              <button
                type="button"
                onClick={() => setSavingTemplate(false)}
                className="text-sm font-semibold text-ink-3 hover:text-ink cursor-pointer"
              >
                ✕
              </button>
            </div>

            <label className="block text-xs font-semibold text-ink-2">
              Template name
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g. Summer favourites"
                required
                className="mt-1 w-full rounded border border-line px-2.5 py-1.5 text-xs text-ink focus:border-ink focus:outline-none"
              />
            </label>

            <label className="block text-xs font-semibold text-ink-2">
              Description (optional)
              <input
                type="text"
                value={templateDesc}
                onChange={(e) => setTemplateDesc(e.target.value)}
                placeholder="e.g. quick dinners &amp; light boxes"
                className="mt-1 w-full rounded border border-line px-2.5 py-1.5 text-xs text-ink focus:border-ink focus:outline-none"
              />
            </label>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSavingTemplate(false)}
                className="rounded border border-line px-3 py-1.5 text-xs font-semibold text-ink-2 hover:bg-surface-2 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded bg-ink px-3 py-1.5 text-xs font-semibold text-white hover:bg-ink/90 cursor-pointer"
              >
                Save template
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setSavingTemplate(true)}
            className="w-full min-h-[48px] rounded-[12px] border border-ink bg-transparent font-sans text-[14px] font-semibold text-ink hover:bg-surface-2 transition-colors cursor-pointer mt-2"
          >
            Save this week as a template
          </button>
        )}
      </div>
    </div>
  );
}
