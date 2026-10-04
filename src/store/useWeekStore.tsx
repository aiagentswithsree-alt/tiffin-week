import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { emptyState } from '../lib/model';
import { SAMPLE_RECIPES } from '../data/recipes';
import { DEFAULT_BASES } from '../data/bases';
import { DEFAULT_PRINT_DEFAULTS, DEFAULT_WEEK_TEMPLATES } from '../data/templates';
import type { AppState } from '../types';

const KEY = 'tiffin-week-v1';

/**
 * One store for the whole plan, persisted to localStorage.
 *
 * `update` takes a mutator over a structural clone, so callers write plain
 * imperative code and still get a new object for React to diff. Every write
 * stores an undo snapshot of the state as it was before the change.
 */
interface Store {
  state: AppState;
  ready: boolean;
  update: (fn: (draft: AppState) => void, message?: string) => void;
  replace: (next: AppState, message?: string) => void;
  undo: () => void;
  canUndo: boolean;
  message: string;
  setMessage: (m: string) => void;
  save: () => boolean;
  dirty: boolean;
}

const Ctx = createContext<Store | null>(null);

const read = (): AppState | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    if (!parsed || !Array.isArray(parsed.routines)) return null;
    const migrated: AppState = {
      household: parsed.household ?? 3,
      routines: parsed.routines,
      dayInstances: parsed.dayInstances ?? {},
      recipes: parsed.recipes && parsed.recipes.length > 0 ? parsed.recipes : structuredClone(SAMPLE_RECIPES),
      bases: parsed.bases && parsed.bases.length > 0 ? parsed.bases : structuredClone(DEFAULT_BASES),
      weekTemplates: parsed.weekTemplates && parsed.weekTemplates.length > 0 ? parsed.weekTemplates : structuredClone(DEFAULT_WEEK_TEMPLATES),
      printDefaults: parsed.printDefaults ?? structuredClone(DEFAULT_PRINT_DEFAULTS),
    };
    // If the saved payload was missing recipes or bases, write back the migrated structure
    if (!parsed.recipes || !parsed.bases || parsed.recipes.length === 0 || parsed.bases.length === 0) {
      write(migrated);
    }
    return migrated;
  } catch {
    return null; // private window, blocked storage, corrupted value
  }
};

const write = (state: AppState): boolean => {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
};

export const WeekStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(() => read() ?? emptyState());
  const [ready, setReady] = useState(true);
  const [message, setMessage] = useState(() => (read() ? 'Loaded saved plan' : 'Ready'));
  const [dirty, setDirty] = useState(false);
  const undoRef = useRef<AppState | null>(null);
  const [canUndo, setCanUndo] = useState(false);

  const update = useCallback((fn: (draft: AppState) => void, msg?: string) => {
    setState((prev) => {
      undoRef.current = structuredClone(prev);
      const draft = structuredClone(prev);
      fn(draft);
      write(draft); // Automatically persist to localStorage after every change
      return draft;
    });
    setCanUndo(true);
    setDirty(false);
    setMessage(msg ?? 'Saved');
  }, []);

  const replace = useCallback((next: AppState, msg?: string) => {
    setState((prev) => {
      undoRef.current = structuredClone(prev);
      write(next); // Automatically persist to localStorage after onboarding
      return next;
    });
    setCanUndo(true);
    setDirty(false);
    setMessage(msg ?? 'Saved');
  }, []);

  const undo = useCallback(() => {
    if (!undoRef.current) return;
    const restored = undoRef.current;
    setState(restored);
    write(restored); // Automatically persist restored state
    undoRef.current = null;
    setCanUndo(false);
    setDirty(false);
    setMessage('Restored · saved');
  }, []);

  const save = useCallback(() => {
    const ok = write(state);
    if (ok) {
      setDirty(false);
      setCanUndo(false);
      undoRef.current = null;
      return true;
    } else {
      setMessage('Storage unavailable — changes last until you close this tab.');
      return false;
    }
  }, [state]);

  const value = useMemo<Store>(
    () => ({ state, ready, update, replace, undo, canUndo, message, setMessage, save, dirty }),
    [state, ready, update, replace, undo, canUndo, message, save, dirty],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useWeekStore = (): Store => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useWeekStore must be used inside WeekStoreProvider');
  return v;
};
