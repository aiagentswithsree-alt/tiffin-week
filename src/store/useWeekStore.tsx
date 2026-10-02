import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { emptyState } from '../lib/model';
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
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed || !Array.isArray(parsed.routines)) return null;
    return { household: parsed.household ?? 3, routines: parsed.routines, dayInstances: parsed.dayInstances ?? {} };
  } catch {
    return null; // private window, blocked storage, corrupted value
  }
};

export const WeekStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(emptyState);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('Ready');
  const [dirty, setDirty] = useState(false);
  const undoRef = useRef<AppState | null>(null);
  const [canUndo, setCanUndo] = useState(false);

  useEffect(() => {
    const saved = read();
    if (saved) { setState(saved); setMessage('Loaded saved plan'); }
    setReady(true);
  }, []);

  const update = useCallback((fn: (draft: AppState) => void, msg?: string) => {
    setState((prev) => {
      undoRef.current = structuredClone(prev);
      const draft = structuredClone(prev);
      fn(draft);
      return draft;
    });
    setCanUndo(true);
    setDirty(true);
    setMessage(msg ?? 'Unsaved changes');
  }, []);

  const replace = useCallback((next: AppState, msg?: string) => {
    setState((prev) => { undoRef.current = structuredClone(prev); return next; });
    setCanUndo(true);
    setDirty(true);
    setMessage(msg ?? 'Unsaved changes');
  }, []);

  const undo = useCallback(() => {
    if (!undoRef.current) return;
    setState(undoRef.current);
    undoRef.current = null;
    setCanUndo(false);
    setMessage('Restored · unsaved');
  }, []);

  const save = useCallback(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      setDirty(false);
      setCanUndo(false);
      undoRef.current = null;
      return true;
    } catch {
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
