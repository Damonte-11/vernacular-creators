/**
 * A copy of the team's data kept in this browser (IndexedDB), so the app opens instantly on the next visit
 * and then quietly refreshes from the database. Tied to the signed-in person and to this version of the app;
 * cleared on sign-out. Any failure (private window, storage blocked, full) just means no copy.
 */
const DB = "vern-creators";
const STORE = "cache";
const KEY = "app-state";
/** A new deploy can change the data's shape, so each one starts fresh. */
export const CACHE_VERSION = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? "dev";

function open(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest | void): Promise<T | null> {
  const db = await open();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => {
        resolve(req ? (req.result as T) : null);
        db.close();
      };
      tx.onerror = tx.onabort = () => {
        resolve(null);
        db.close();
      };
    } catch {
      resolve(null);
      db.close();
    }
  });
}

export interface Cached<T> {
  version: string;
  userId: string;
  savedAt: number;
  data: T;
}

export async function readCache<T>(userId: string): Promise<T | null> {
  const c = await run<Cached<T>>("readonly", (s) => s.get(KEY));
  return c && c.version === CACHE_VERSION && c.userId === userId ? c.data : null;
}

export function writeCache<T>(userId: string, data: T): Promise<unknown> {
  const c: Cached<T> = { version: CACHE_VERSION, userId, savedAt: Date.now(), data };
  return run("readwrite", (s) => s.put(c, KEY));
}

export function clearCache(): Promise<unknown> {
  return run("readwrite", (s) => s.delete(KEY));
}
