import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeekStore } from '../store/useWeekStore';
import { DEFAULT_PRINT_DEFAULTS } from '../data/templates';
import type { PrintDefaults } from '../types';

/**
 * N11 Settings (Wireframe 27).
 *
 * Keeps only: household size, pantry, bases library link, print defaults.
 * Days, groups and timings live in Routine setup (N2) — links there without duplicating.
 */
export default function Settings() {
  const nav = useNavigate();
  const { state, update } = useWeekStore();

  const household = state.household ?? 3;
  const printDefaults: PrintDefaults = state.printDefaults ?? DEFAULT_PRINT_DEFAULTS;

  const handleHouseholdChange = (delta: number) => {
    const next = Math.max(1, household + delta);
    if (next === household) return;
    update((draft) => {
      draft.household = next;
    }, `Updated household size to ${next}`);
  };

  const handleUpdatePrint = (patch: Partial<PrintDefaults>) => {
    update((draft) => {
      draft.printDefaults = {
        ...(draft.printDefaults ?? DEFAULT_PRINT_DEFAULTS),
        ...patch,
      };
    }, 'Updated print defaults');
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg text-ink">
      {/* Top Header */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? nav(-1) : nav('/week'))}
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-surface-2 cursor-pointer"
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
          <h1 className="font-display text-[22px] font-bold">Settings</h1>
        </div>
      </div>

      {/* Settings Form Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        <SyncSection />

        {/* Section 1: Household */}
        <div className="space-y-1.5">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-2">
            HOUSEHOLD
          </span>
          <div className="rounded-[12px] border border-line bg-white p-3 shadow-xs">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-[14px] font-semibold text-ink">People at dinner</span>
                <span className="text-[12px] text-ink-2">
                  default for Home meals · change per day too
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Fewer people"
                  onClick={() => handleHouseholdChange(-1)}
                  className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-line bg-surface-2 text-[18px] font-medium hover:bg-surface-3 cursor-pointer"
                >
                  −
                </button>
                <span
                  data-testid="household-count"
                  className="w-7 text-center font-display text-[20px] font-bold tabular-nums"
                >
                  {household}
                </span>
                <button
                  type="button"
                  aria-label="More people"
                  onClick={() => handleHouseholdChange(1)}
                  className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-line bg-surface-2 text-[18px] font-medium hover:bg-surface-3 cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Routine Setup Link */}
        <div className="space-y-1.5">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-2">
            ROUTINES &amp; TIMINGS
          </span>
          <div className="rounded-[12px] border border-line bg-white p-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[14px] font-semibold text-ink">Days, groups &amp; timings</span>
                <span className="text-[12px] text-ink-2">
                  School, Office, Home days and box deadlines live in your routines
                </span>
              </div>
              <button
                type="button"
                onClick={() => nav('/routines')}
                className="flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-ink hover:bg-surface-2 cursor-pointer"
              >
                Routine setup ›
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: Lists & Library Links */}
        <div className="space-y-1.5">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-2">
            LISTS &amp; LIBRARY
          </span>
          <div className="divide-y divide-line rounded-[12px] border border-line bg-white shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={() => nav('/shopping')}
              className="flex w-full items-center justify-between p-3 text-left hover:bg-surface-2 cursor-pointer"
            >
              <div className="flex flex-col">
                <span className="text-[14px] font-semibold text-ink">Pantry staples</span>
                <span className="text-[12px] text-ink-2">Always-in-stock items checked off list</span>
              </div>
              <span className="text-[12.5px] text-ink-3">Open pantry ›</span>
            </button>

            <button
              type="button"
              onClick={() => nav('/bases')}
              className="flex w-full items-center justify-between p-3 text-left hover:bg-surface-2 cursor-pointer"
            >
              <div className="flex flex-col">
                <span className="text-[14px] font-semibold text-ink">Bases &amp; preps library</span>
                <span className="text-[12px] text-ink-2">Made ahead once, used by many dishes</span>
              </div>
              <span className="text-[12.5px] text-ink-3">Bases library ›</span>
            </button>
          </div>
        </div>

        {/* Section 4: Print Defaults */}
        <div className="space-y-1.5">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-2">
            PRINT DEFAULTS
          </span>
          <div className="rounded-[12px] border border-line bg-white p-3 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-[13px]">
              <span className="font-semibold text-ink">Paper size</span>
              <div className="flex rounded-lg border border-line p-0.5 bg-surface-2">
                {(['A3', 'A4', 'A5'] as const).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => handleUpdatePrint({ paperSize: sz })}
                    className={`px-3 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                      printDefaults.paperSize === sz ? 'bg-white shadow-xs text-ink' : 'text-ink-2'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-[13px] border-t border-line/60 pt-2.5">
              <span className="font-semibold text-ink">Orientation</span>
              <div className="flex rounded-lg border border-line p-0.5 bg-surface-2">
                <button
                  type="button"
                  onClick={() => handleUpdatePrint({ orientation: 'landscape' })}
                  className={`px-3 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                    printDefaults.orientation === 'landscape' ? 'bg-white shadow-xs text-ink' : 'text-ink-2'
                  }`}
                >
                  Landscape
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdatePrint({ orientation: 'portrait' })}
                  className={`px-3 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                    printDefaults.orientation === 'portrait' ? 'bg-white shadow-xs text-ink' : 'text-ink-2'
                  }`}
                >
                  Portrait
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[13px] border-t border-line/60 pt-2.5">
              <div className="flex flex-col">
                <span className="font-semibold text-ink">Ink-saver mode</span>
                <span className="text-[11.5px] text-ink-2">High contrast, clean lines</span>
              </div>
              <input
                type="checkbox"
                aria-label="Ink-saver mode"
                checked={printDefaults.inkSaver}
                onChange={(e) => handleUpdatePrint({ inkSaver: e.target.checked })}
                className="h-5 w-5 accent-ink rounded cursor-pointer"
              />
            </div>

            <div className="border-t border-dashed border-line pt-2 text-[11.5px] text-ink-3">
              Default: {printDefaults.paperSize} {printDefaults.orientation} · {printDefaults.inkSaver ? 'ink-saver' : 'full tone'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const sectionLabel = 'text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-2';
const button =
  'rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-ink hover:bg-surface-2 cursor-pointer disabled:opacity-50';

/** Google sign-in, the household join code, and the which-plan choice. */
function SyncSection() {
  const { state, sync } = useWeekStore();
  const [code, setCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setNote('');
    try {
      await fn();
    } catch (e) {
      setNote((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // Firestore caps a document at 1 MiB; the whole plan is one document.
  const sizeKB = sync.email ? Math.round(JSON.stringify(state).length / 1024) : 0;

  return (
    <div className="space-y-1.5">
      <span className={sectionLabel}>SYNC &amp; HOUSEHOLD</span>
      <div className="rounded-[12px] border border-line bg-white p-3 shadow-xs space-y-3" data-testid="sync-section">
        {!sync.configured ? (
          <p className="text-[12.5px] text-ink-2">Sync isn't set up on this build. Your plan is saved on this device.</p>
        ) : !sync.email ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-[14px] font-semibold text-ink">Same plan on every device</span>
              <span className="text-[12px] text-ink-2">Saved on this device only until you sign in</span>
            </div>
            <button type="button" onClick={sync.signIn} className={button}>
              Sign in with Google
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-col">
                <span className="text-[12px] text-ink-2">Signed in as</span>
                <span className="truncate text-[14px] font-semibold text-ink" data-testid="sync-email">
                  {sync.email}
                </span>
              </div>
              <button type="button" onClick={sync.signOut} className={button}>
                Sign out
              </button>
            </div>

            {sync.conflict && (
              <div role="alert" className="rounded-lg border border-amber bg-amber-soft p-2.5 space-y-2">
                <p className="text-[12.5px] text-ink">
                  This device and your household both have a plan, and they differ. Which one do you want to keep?
                  The other is replaced everywhere.
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => sync.keep('device')} className={button}>
                    Keep this device's plan
                  </button>
                  <button type="button" onClick={() => sync.keep('household')} className={button}>
                    Keep household plan
                  </button>
                </div>
              </div>
            )}

            {!sync.conflict && sync.householdId && (
              <div className="space-y-2 border-t border-line/60 pt-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="text-[13px] font-semibold text-ink">Invite someone</span>
                    <span className="text-[11.5px] text-ink-2">Code works once, for 48 hours</span>
                  </div>
                  {code ? (
                    <span className="font-display text-[18px] font-bold tracking-[0.15em] tabular-nums" data-testid="join-code">
                      {code.slice(0, 4)}-{code.slice(4)}
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => run(async () => setCode(await sync.invite()))}
                      className={button}
                    >
                      Get a join code
                    </button>
                  )}
                </div>
                <form
                  className="flex items-end gap-2 border-t border-line/60 pt-2.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(async () => {
                      await sync.join(joinCode);
                      setJoinCode('');
                      setNote('Joined. You now share the household plan.');
                    });
                  }}
                >
                  <label className="flex flex-1 flex-col gap-1 text-[12px] text-ink-2">
                    Join a household — replaces this device's plan with theirs
                    <input
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      placeholder="ABCD-2345"
                      autoCapitalize="characters"
                      autoComplete="off"
                      className="rounded-lg border border-line px-2.5 py-1.5 text-[14px] text-ink uppercase tracking-[0.1em]"
                    />
                  </label>
                  <button type="submit" disabled={busy || !joinCode.trim()} className={button}>
                    Join
                  </button>
                </form>
              </div>
            )}

            {sizeKB > 800 && (
              <p role="alert" className="text-[12px] text-amber">
                Your plan is {sizeKB} KB; household sync stops working at 1024 KB. Old days will need clearing out.
              </p>
            )}
          </>
        )}
        {(sync.error || note) && (
          <p aria-live="polite" className="text-[12px] text-ink-2">
            {sync.error || note}
          </p>
        )}
      </div>
    </div>
  );
}
