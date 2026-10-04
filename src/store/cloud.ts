/**
 * The only file that imports Firebase. Loaded with a dynamic import, and only
 * after a tap on "Sign in with Google" or when a previous sign-in left the
 * `tiffin-week-signed-in` flag — signed-out users never download or call it.
 *
 * Swapping to another backend means rewriting this file against the same
 * exports; `useWeekStore` and the sync queue stay as they are.
 */
import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
} from 'firebase/auth';
import {
  Timestamp,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentSnapshot,
  type Firestore,
} from 'firebase/firestore';
import { createSyncQueue, type Remote } from '../lib/syncQueue';
import type { AppState } from '../types';
import type { StorageAdapter } from './useWeekStore';

const env = import.meta.env;
const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
});
const auth = getAuth(app);

let fs: Firestore | null = null;
const db = () =>
  (fs ??= initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    // Optional fields such as `slot.dishId` can be undefined; Firestore rejects those otherwise.
    ignoreUndefinedProperties: true,
  }));

export interface CloudUser {
  uid: string;
  email: string | null;
}

export const onUser = (cb: (u: CloudUser | null) => void) =>
  onAuthStateChanged(auth, (u) => cb(u ? { uid: u.uid, email: u.email } : null));

/** Call straight from the click handler — no await before it — or iOS blocks the popup. */
export const signIn = () => signInWithPopup(auth, new GoogleAuthProvider()).then(() => undefined);

export const signOut = () => fbSignOut(auth);

/** '' means "say nothing" (the user closed the popup themselves). */
export const signInError = (e: unknown): string => {
  const code = (e as { code?: string })?.code ?? '';
  if (code === 'auth/popup-blocked')
    return 'Your browser blocked the sign-in window. Tap "Sign in with Google" again — if it keeps happening, allow pop-ups for this site.';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return '';
  if (code === 'auth/unauthorized-domain')
    return `${location.hostname} isn't an authorized domain in Firebase Auth settings.`;
  if (code === 'auth/network-request-failed') return 'No connection — sign-in needs the internet once.';
  return `Sign-in failed: ${(e as Error)?.message ?? code}`;
};

/** The user's household id, creating a one-member household on first sign-in. */
export const openHousehold = async (uid: string): Promise<string> => {
  const userRef = doc(db(), 'users', uid);
  const existing = (await getDoc(userRef)).data()?.householdId as string | undefined;
  if (existing) return existing;
  const hRef = doc(collection(db(), 'households'));
  const batch = writeBatch(db());
  batch.set(hRef, { members: [uid], state: null, updatedAt: serverTimestamp(), writerId: '', rev: 0 });
  batch.set(userRef, { householdId: hRef.id });
  await batch.commit();
  return hRef.id;
};

const toRemote = (snap: DocumentSnapshot): Remote<AppState> | null => {
  const d = snap.data();
  if (!d?.state) return null;
  return {
    state: d.state as AppState,
    stamp: {
      writerId: d.writerId ?? '',
      rev: d.rev ?? 0,
      updatedAt: (d.updatedAt as Timestamp | null)?.toMillis?.() ?? 0,
    },
  };
};

/** `households/{id}` as a storage adapter; saves are debounced through the sync queue. */
export const householdAdapter = (
  householdId: string,
  writerId: string,
  onError: (msg: string) => void,
): StorageAdapter => {
  const ref = doc(db(), 'households', householdId);
  let listener: (s: AppState) => void = () => {};
  const q = createSyncQueue<AppState>(
    writerId,
    (state, stamp) => {
      // updateDoc replaces the `state` field whole (a merge would keep deleted
      // days) and leaves `members` alone. It resolves on server ack; the write is
      // already in the offline cache before that, so don't wait on it.
      updateDoc(ref, { state, updatedAt: serverTimestamp(), writerId: stamp.writerId, rev: stamp.rev }).catch(
        (e: Error) => onError(`Couldn't sync: ${e.message}`),
      );
    },
    (s) => listener(s),
  );
  return {
    load: async () => {
      const r = toRemote(await getDoc(ref));
      if (r) q.seen(r.stamp);
      return r?.state ?? null;
    },
    save: q.save,
    subscribe: (cb) => {
      listener = cb;
      return onSnapshot(
        ref,
        (snap) => {
          const r = toRemote(snap);
          if (r) q.receive(r);
        },
        (e) => onError(`Sync stopped: ${e.message}`),
      );
    },
    flush: q.flush,
  };
};

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I

export const createInvite = async (householdId: string, uid: string): Promise<string> => {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const code = Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
  await setDoc(doc(db(), 'joinCodes', code), {
    householdId,
    createdBy: uid,
    expiresAt: Timestamp.fromMillis(Date.now() + 48 * 3600_000),
  });
  return code;
};

/** Joins the household a code points to; returns its id. Needs a connection. */
export const joinHousehold = async (rawCode: string, uid: string): Promise<string> => {
  const code = rawCode.replace(/[\s-]/g, '').toUpperCase();
  if (!/^[A-Z0-9]{8}$/.test(code)) throw new Error('A join code is 8 letters and numbers.');
  const codeRef = doc(db(), 'joinCodes', code);
  const jc = (await getDoc(codeRef)).data();
  if (!jc || (jc.expiresAt as Timestamp).toMillis() < Date.now())
    throw new Error('That code is wrong or has expired. Ask for a new one.');
  const householdId = jc.householdId as string;
  // One batch: the rules read the code from the users doc via getAfter().
  const batch = writeBatch(db());
  batch.set(doc(db(), 'users', uid), { householdId, joinCode: code });
  batch.update(doc(db(), 'households', householdId), { members: arrayUnion(uid) });
  await batch.commit();
  await deleteDoc(codeRef).catch(() => {}); // it expires anyway
  return householdId;
};
