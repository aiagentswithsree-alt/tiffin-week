import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { emptyState } from '../lib/model';
import { SAMPLE_RECIPES } from '../data/recipes';
import { DEFAULT_BASES } from '../data/bases';
import { DEFAULT_PRINT_DEFAULTS, DEFAULT_WEEK_TEMPLATES } from '../data/templates';
import type { AppState } from '../types';

const KEY = 'tiffin-week-v1';
/** Set while signed in; the only thing that loads Firebase on a cold start. */
const SIGNED_IN = 'tiffin-week-signed-in';
const DEVICE = 'tiffin-week-device';

/** Where the plan lives. localStorage always; a household document when signed in. */
export interface StorageAdapter {
  load: () => AppState | null | Promise<AppState | null>;
  save: (state: AppState) => void;
  /** Changes made elsewhere (another device). Returns the unsubscribe. */
  subscribe: (cb: (state: AppState) => void) => () => void;
  /** Send anything still debounced, e.g. when the tab is hidden. */
  flush?: () => void;
}

type Cloud = typeof import('./cloud');

const configured = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID &&
    import.meta.env.VITE_FIREBASE_APP_ID,
);

export interface Sync {
  /** False when the VITE_FIREBASE_* vars are missing: local-only, no sign-in. */
  configured: boolean;
  email: string | null;
  householdId: string | null;
  /** Both this device and the household have a plan, and they differ. */
  conflict: boolean;
  error: string;
  signIn: () => void;
  signOut: () => void;
  keep: (which: 'device' | 'household') => void;
  invite: () => Promise<string>;
  join: (code: string) => Promise<void>;
}

/**
 * One store for the whole plan, persisted through the storage adapters.
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
  sync: Sync;
}

const Ctx = createContext<Store | null>(null);

/** Fills fields older saves lack. Also the validation gate for cloud data. */
const migrate = (parsed: Partial<AppState> | null): AppState | null => {
  if (!parsed || !Array.isArray(parsed.routines)) return null;
  return {
    household: parsed.household ?? 3,
    routines: parsed.routines,
    dayInstances: parsed.dayInstances ?? {},
    recipes: parsed.recipes && parsed.recipes.length > 0 ? parsed.recipes : structuredClone(SAMPLE_RECIPES),
    bases: parsed.bases && parsed.bases.length > 0 ? parsed.bases : structuredClone(DEFAULT_BASES),
    weekTemplates: parsed.weekTemplates && parsed.weekTemplates.length > 0 ? parsed.weekTemplates : structuredClone(DEFAULT_WEEK_TEMPLATES),
    printDefaults: parsed.printDefaults ?? structuredClone(DEFAULT_PRINT_DEFAULTS),
  };
};

const read = (): AppState | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const migrated = migrate(parsed);
    // If the saved payload was missing recipes or bases, write back the migrated structure
    if (migrated && (!parsed.recipes || !parsed.bases || parsed.recipes.length === 0 || parsed.bases.length === 0)) {
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

// ponytail: localStorage has no other writer, so subscribe is a no-op; listen to `storage` events if two tabs ever need to agree.
const localAdapter: StorageAdapter = { load: read, save: write, subscribe: () => () => {} };

const flag = {
  get: (k: string) => {
    try { return localStorage.getItem(k); } catch { return null; }
  },
  set: (k: string, v: string | null) => {
    try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* storage blocked */ }
  },
};

const deviceId = () => {
  let id = flag.get(DEVICE);
  if (!id) flag.set(DEVICE, (id = crypto.randomUUID()));
  return id;
};

/** JSON with sorted keys — Firestore does not keep map key order. */
const canon = (v: unknown) =>
  JSON.stringify(v, (_k, x) =>
    x && typeof x === 'object' && !Array.isArray(x)
      ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : 1)))
      : x,
  );

export const WeekStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(() => read() ?? emptyState());
  const [ready, setReady] = useState(true);
  const [message, setMessage] = useState(() => (read() ? 'Loaded saved plan' : 'Ready'));
  const [dirty, setDirty] = useState(false);
  const undoRef = useRef<AppState | null>(null);
  const [canUndo, setCanUndo] = useState(false);

  const stateRef = useRef(state);
  stateRef.current = state;
  const cloudRef = useRef<Cloud | null>(null);
  const cloudLoad = useRef<Promise<Cloud> | null>(null);
  const remoteRef = useRef<StorageAdapter | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);
  const uidRef = useRef<string | null>(null);
  const conflictRef = useRef<{ adapter: StorageAdapter; remote: AppState } | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [syncError, setSyncError] = useState('');

  const persist = (s: AppState) => {
    remoteRef.current?.save(s);
    return write(s); // localAdapter.save, kept for its boolean
  };

  const update = useCallback((fn: (draft: AppState) => void, msg?: string) => {
    setState((prev) => {
      undoRef.current = structuredClone(prev);
      const draft = structuredClone(prev);
      fn(draft);
      persist(draft); // Automatically persist after every change
      return draft;
    });
    setCanUndo(true);
    setDirty(false);
    setMessage(msg ?? 'Saved');
  }, []);

  const replace = useCallback((next: AppState, msg?: string) => {
    setState((prev) => {
      undoRef.current = structuredClone(prev);
      persist(next); // Automatically persist after onboarding
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
    persist(restored); // Automatically persist restored state
    undoRef.current = null;
    setCanUndo(false);
    setDirty(false);
    setMessage('Restored · saved');
  }, []);

  const save = useCallback(() => {
    const ok = persist(state);
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

  /* ---- Household sync. Nothing below runs until someone signs in. ---- */

  /** A plan from another device: shown and mirrored locally, never sent back. */
  const applyRemote = useCallback((s: AppState) => {
    const m = migrate(s);
    if (!m) return;
    setState(m);
    localAdapter.save(m);
    setMessage('Synced from household');
  }, []);

  const start = useCallback((adapter: StorageAdapter) => {
    remoteRef.current = adapter;
    unsubRef.current = adapter.subscribe(applyRemote);
  }, [applyRemote]);

  const stop = useCallback(() => {
    remoteRef.current?.flush?.();
    unsubRef.current?.();
    unsubRef.current = null;
    remoteRef.current = null;
    conflictRef.current = null;
    setConflict(false);
  }, []);

  /** Attach to a household. `takeHousehold` skips the which-plan question (joining). */
  const connect = useCallback(async (cloud: Cloud, hid: string, takeHousehold: boolean) => {
    stop();
    const hadLocalPlan = localAdapter.load() !== null;
    const adapter = cloud.householdAdapter(hid, deviceId(), setSyncError);
    const remote = migrate((await adapter.load()) as AppState | null);
    setHouseholdId(hid);
    if (!remote) {
      adapter.save(stateRef.current); // empty household: upload this device's plan
      adapter.flush?.();
    } else if (!takeHousehold && hadLocalPlan && canon(remote) !== canon(stateRef.current)) {
      conflictRef.current = { adapter, remote };
      setConflict(true);
      return; // edits stay local until the user picks
    } else {
      applyRemote(remote);
    }
    start(adapter);
  }, [applyRemote, start, stop]);

  const loadCloud = useCallback((): Promise<Cloud> => {
    cloudLoad.current ??= import('./cloud').then((cloud) => {
      cloudRef.current = cloud;
      cloud.onUser(async (u) => {
        uidRef.current = u?.uid ?? null;
        setEmail(u?.email ?? null);
        if (!u) {
          flag.set(SIGNED_IN, null);
          stop();
          setHouseholdId(null);
          return;
        }
        flag.set(SIGNED_IN, '1');
        try {
          await connect(cloud, await cloud.openHousehold(u.uid), false);
        } catch (e) {
          setSyncError(`Couldn't reach your household: ${(e as Error).message}`);
        }
      });
      return cloud;
    }, (e) => {
      cloudLoad.current = null; // offline before the SDK was ever cached: let a later tap retry
      throw e;
    });
    return cloudLoad.current;
  }, [connect, stop]);

  useEffect(() => {
    if (configured && flag.get(SIGNED_IN))
      loadCloud().catch(() => setSyncError('Offline — showing the copy saved on this device.'));
  }, [loadCloud]);

  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && remoteRef.current?.flush?.();
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, []);

  const sync = useMemo<Sync>(() => ({
    configured,
    email,
    householdId,
    conflict,
    error: syncError,
    signIn: () => {
      setSyncError('');
      const go = (cloud: Cloud) => cloud.signIn().catch((e) => setSyncError(cloud.signInError(e)));
      // Already loaded: call in this tap, so the popup isn't blocked. First tap
      // has to download the module first; if iOS blocks that popup, the message
      // asks for a second tap, which then goes through this branch.
      if (cloudRef.current) void go(cloudRef.current);
      else loadCloud().then(go, () => setSyncError("Couldn't load sign-in. Check your connection."));
    },
    signOut: () => {
      setSyncError('');
      stop();
      void cloudRef.current?.signOut();
    },
    keep: (which) => {
      const c = conflictRef.current;
      if (!c) return;
      conflictRef.current = null;
      setConflict(false);
      if (which === 'device') {
        c.adapter.save(stateRef.current);
        c.adapter.flush?.();
      } else {
        undoRef.current = structuredClone(stateRef.current);
        setCanUndo(true);
        applyRemote(c.remote);
      }
      start(c.adapter);
    },
    invite: () => {
      const cloud = cloudRef.current;
      if (!cloud || !householdId || !uidRef.current) return Promise.reject(new Error('Sign in first.'));
      return cloud.createInvite(householdId, uidRef.current);
    },
    join: async (code) => {
      const cloud = cloudRef.current;
      if (!cloud || !uidRef.current) throw new Error('Sign in first.');
      remoteRef.current?.flush?.();
      undoRef.current = structuredClone(stateRef.current);
      setCanUndo(true);
      await connect(cloud, await cloud.joinHousehold(code, uidRef.current), true);
    },
  }), [email, householdId, conflict, syncError, loadCloud, stop, start, connect, applyRemote]);

  const value = useMemo<Store>(
    () => ({ state, ready, update, replace, undo, canUndo, message, setMessage, save, dirty, sync }),
    [state, ready, update, replace, undo, canUndo, message, save, dirty, sync],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useWeekStore = (): Store => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useWeekStore must be used inside WeekStoreProvider');
  return v;
};
