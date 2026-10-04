/**
 * Debounced last-write-wins sync for one shared document. No backend imports:
 * the cloud adapter supplies `send` and feeds snapshots into `receive`.
 *
 * - Snapshots written by this device are ignored (`writerId`).
 * - While a local save is waiting, remote snapshots are held, not applied, so
 *   they can never overwrite unsent edits.
 * - On flush the held snapshot is applied only if it is newer than what we just
 *   wrote. It arrived before our write left the device, so the server orders it
 *   BEFORE ours and our `rev` counts past it — the check drops it, which keeps
 *   this device equal to the server instead of silently diverging.
 * - With nothing pending, a snapshot from another device is the server's
 *   current state (snapshots arrive in server order), so it is applied as is.
 */

export interface Stamp {
  writerId: string;
  rev: number;
  /** Milliseconds; server time when read back from the cloud. */
  updatedAt: number;
}

export interface Remote<T> {
  state: T;
  stamp: Stamp;
}

const newer = (a: Stamp, b: Stamp) => a.rev > b.rev || (a.rev === b.rev && a.updatedAt > b.updatedAt);

export const createSyncQueue = <T>(
  writerId: string,
  send: (state: T, stamp: Stamp) => void,
  apply: (state: T) => void,
  delay = 1000,
) => {
  let pending: { state: T } | null = null;
  let held: Remote<T> | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let last: Stamp = { writerId: '', rev: 0, updatedAt: 0 };

  const flush = () => {
    clearTimeout(timer);
    if (!pending) return;
    const { state } = pending;
    pending = null;
    last = { writerId, rev: Math.max(last.rev, held?.stamp.rev ?? 0) + 1, updatedAt: Date.now() };
    send(state, last);
    const h = held;
    held = null;
    if (h && newer(h.stamp, last)) {
      last = h.stamp;
      apply(h.state);
    }
  };

  return {
    /** The stamp of the document as first loaded, so `rev` continues from it. */
    seen: (stamp: Stamp) => {
      last = stamp;
    },
    save: (state: T) => {
      pending = { state };
      clearTimeout(timer);
      timer = setTimeout(flush, delay);
    },
    receive: (r: Remote<T>) => {
      if (r.stamp.writerId === writerId) return;
      if (pending) {
        if (!held || newer(r.stamp, held.stamp)) held = r;
        return;
      }
      last = r.stamp;
      apply(r.state);
    },
    flush,
    lastStamp: () => last,
  };
};
