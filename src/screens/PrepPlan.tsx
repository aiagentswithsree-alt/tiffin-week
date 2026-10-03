import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { humanSpan } from '../lib/dates';
import { buildPrepPlan, PrepTask } from '../lib/prep';
import { useWeekStore } from '../store/useWeekStore';

type PrepTab = 'sunday' | 'nightly' | 'mornings';

export default function PrepPlan() {
  const { state } = useWeekStore();
  const nav = useNavigate();
  const [activeTab, setActiveTab] = useState<PrepTab>('sunday');
  const [checkedTasks, setCheckedTasks] = useState<Set<string>>(new Set());

  const prep = useMemo(() => buildPrepPlan(state, 0), [state]);

  const toggleCheck = (id: string) => {
    setCheckedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderTaskRow = (task: PrepTask) => {
    const isChecked = checkedTasks.has(task.id);
    return (
      <div
        key={task.id}
        onClick={() => toggleCheck(task.id)}
        className="flex cursor-pointer items-start gap-2.5 border-b border-[#F0EFEA] py-2.5 last:border-b-0 select-none hover:bg-surface-2/40 px-1 rounded-md transition-colors"
      >
        {/* Checkbox */}
        <div
          className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[6px] transition-colors ${
            isChecked
              ? 'bg-[#356E48] text-white'
              : 'border-[1.5px] border-[#C9C6BE] bg-white'
          }`}
        >
          {isChecked && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path
                d="M2 6.2 4.6 9 10 3.3"
                stroke="#FFFFFF"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>

        {/* Task Details */}
        <div className="flex flex-1 flex-col gap-1 min-w-0">
          <div
            className={`text-[14px] font-medium leading-snug text-ink ${
              isChecked ? 'line-through text-ink-3' : ''
            }`}
          >
            {task.title}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded-[5px] px-1.5 py-0.5 text-[11px] font-medium ${
                task.kind === 'shared base'
                  ? 'bg-green-soft text-green font-semibold'
                  : 'bg-[#E0EDE3] text-[#2E5F3E]'
              }`}
            >
              {task.kind}
            </span>
            <span className="rounded-[5px] bg-[#E7E6E1] px-1.5 py-0.5 text-[11px] text-[#4F4B45]">
              {task.keeps}
            </span>
            {task.timeRange && (
              <span className="rounded-[5px] bg-surface-2 px-1.5 py-0.5 text-[11px] text-ink-2">
                {task.timeRange}
              </span>
            )}
          </div>

          {/* Dishes Attribution */}
          {task.dishes.length > 0 && (
            <div className="text-[12px] text-[#6B675F] leading-tight mt-0.5">
              {task.dishes.join(' · ')}
            </div>
          )}
        </div>

        {/* Minutes */}
        <div className="whitespace-nowrap text-right font-mono text-[12px] text-[#6B675F]">
          {task.mins} min
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg text-ink">
      {/* Top Header — Screen 24 */}
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
          <h1 className="font-display text-[20px] font-bold leading-tight">Prep plan</h1>
          <span className="text-[12.5px] text-[#6B675F] truncate">
            21 – 27 Sep · soak, cut, grind, base gravy
          </span>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          aria-label="Print prep sheet"
          className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-surface-2 cursor-pointer text-ink"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M5 8V3h10v5M5 14H3V8h14v6h-2M6 12h8v5H6z"
              stroke="#1B1A17"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Tabs Segmented Control: Sunday batch | Nightly | Mornings */}
      <div className="flex-shrink-0 px-4 pt-3 pb-1">
        <div className="grid grid-cols-3 rounded-[11px] bg-[#E7E6E1] p-[3px]">
          <button
            type="button"
            onClick={() => setActiveTab('sunday')}
            className={`min-h-[36px] rounded-[9px] text-[13px] font-semibold transition-all cursor-pointer ${
              activeTab === 'sunday'
                ? 'bg-white text-ink shadow-xs'
                : 'bg-transparent text-[#5F5B54] hover:text-ink'
            }`}
          >
            Sunday batch
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('nightly')}
            className={`min-h-[36px] rounded-[9px] text-[13px] font-semibold transition-all cursor-pointer ${
              activeTab === 'nightly'
                ? 'bg-white text-ink shadow-xs'
                : 'bg-transparent text-[#5F5B54] hover:text-ink'
            }`}
          >
            Nightly
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mornings')}
            className={`min-h-[36px] rounded-[9px] text-[13px] font-semibold transition-all cursor-pointer ${
              activeTab === 'mornings'
                ? 'bg-white text-ink shadow-xs'
                : 'bg-transparent text-[#5F5B54] hover:text-ink'
            }`}
          >
            Mornings
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3 pt-2">
        {/* TAB 1: SUNDAY BATCH */}
        {activeTab === 'sunday' && (
          prep.sundayTasks.length > 0 ? (
            <div className="rounded-[12px] border border-[#DDDBC0] bg-white p-3 shadow-xs">
              <div className="flex items-baseline justify-between border-b border-[#F0EFEA] pb-2">
                <span className="text-[10.5px] font-semibold tracking-wider uppercase text-[#6B675F]">
                  SUNDAY 20 · BATCH SESSION
                </span>
                <span className="text-[12px] font-semibold text-ink">
                  ≈ {humanSpan(prep.sundayTotalMins)}
                </span>
              </div>
              <div className="pt-1">{prep.sundayTasks.map(renderTaskRow)}</div>
            </div>
          ) : (
            <div className="rounded-[12px] border border-[#DDDBC0] bg-white p-6 text-center text-ink-2">
              <div className="font-semibold text-ink">No Sunday batch tasks yet</div>
              <div className="mt-1 text-xs">
                Pick dishes on This Week to calculate ahead-of-time bases, gravies, and batters.
              </div>
            </div>
          )
        )}

        {/* TAB 2: NIGHTLY PREP */}
        {activeTab === 'nightly' && (
          <div className="space-y-3">
            {prep.nightlyByDay.map((night) => {
              if (night.tasks.length === 0) return null;
              return (
                <div
                  key={night.nightLabel}
                  className="rounded-[12px] border border-[#DDDBC0] bg-white p-3 shadow-xs"
                >
                  <div className="flex items-baseline justify-between border-b border-[#F0EFEA] pb-2">
                    <span className="text-[10.5px] font-semibold tracking-wider uppercase text-[#6B675F]">
                      {night.nightLabel.toUpperCase()} · NIGHT PREP
                    </span>
                    <span className="text-[12px] font-semibold text-ink">
                      ≈ {humanSpan(night.totalMins)}
                    </span>
                  </div>
                  <div className="pt-1">{night.tasks.map(renderTaskRow)}</div>
                </div>
              );
            })}
            {prep.nightlyByDay.every((n) => n.tasks.length === 0) && (
              <div className="rounded-[12px] border border-[#DDDBC0] bg-white p-6 text-center text-ink-2">
                <div className="font-semibold text-ink">No nightly prep needed yet</div>
                <div className="mt-1 text-xs">
                  Pick dishes on This Week that need overnight soaking, dough kneading, or thaw steps.
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MORNINGS (cookPlan from schedule.ts) */}
        {activeTab === 'mornings' && (
          <div className="space-y-3">
            {prep.morningsByDay.map((day) => {
              if (day.tasks.length === 0) return null;
              return (
                <div
                  key={day.dayLabel}
                  className="rounded-[12px] border border-[#DDDBC0] bg-white p-3 shadow-xs"
                >
                  <div className="flex items-baseline justify-between border-b border-[#F0EFEA] pb-2">
                    <span className="text-[10.5px] font-semibold tracking-wider uppercase text-[#6B675F]">
                      {day.dayLabel.toUpperCase()} · STOVE ORDER
                    </span>
                    <span className="text-[12px] font-semibold text-ink">
                      {day.cook.start !== null && `Start ~${day.tasks[0]?.timeRange?.split(' – ')[0] || ''} · `}
                      ≈ {humanSpan(day.cook.total)}
                    </span>
                  </div>
                  <div className="pt-1">{day.tasks.map(renderTaskRow)}</div>
                </div>
              );
            })}
            {prep.morningsByDay.every((d) => d.tasks.length === 0) && (
              <div className="rounded-[12px] border border-[#DDDBC0] bg-white p-6 text-center text-ink-2">
                <div className="font-semibold text-ink">No morning cook scheduled yet</div>
                <div className="mt-1 text-xs">
                  Pick dishes on This Week to calculate sequential stove start and cook order.
                </div>
              </div>
            )}
          </div>
        )}

        {/* HEADS-UP · LEAD TIMES SECTION (Screen 24) */}
        {prep.leadNotices.length > 0 && (
          <div className="rounded-[12px] border border-[#D9B47A] bg-[#F6EBD9] p-3 text-[#6E4608] shadow-xs">
            <span className="block text-[10.5px] font-semibold tracking-wider uppercase">
              HEADS-UP · LEAD TIMES
            </span>
            <div className="mt-1.5 space-y-1.5 text-[13px] leading-relaxed">
              {prep.leadNotices.map((n) => (
                <div key={n.id}>
                  <b className="font-semibold">{n.nightLabel}:</b> {n.notice}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Wireframe 24 Footer Reference */}
        <div className="pt-1 pb-2">
          <button
            type="button"
            onClick={() => nav('/bases')}
            className="text-left text-[12.5px] text-[#5F5B54] hover:text-ink cursor-pointer"
          >
            Batch sizes and how long each keeps come from{' '}
            <b className="font-semibold text-ink">Bases & preps</b> ›
          </button>
        </div>
      </div>
    </div>
  );
}
