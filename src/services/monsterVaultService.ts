/**
 * KiroweenMonsterVault: native IndexedDB persistence (no dependencies) for
 *  - custom_monsters   (designed monsters; image/video kept as raw Blobs)
 *  - battle_chronicles (battle stories + optional AI battle video Blob)
 *
 * Every public function resolves (never throws): when IndexedDB is missing or a transaction fails
 * (private mode, quota, blocked upgrade) it returns an empty/false/null result so the app keeps working.
 * blob: URLs are created only on load; callers own them and release them with revokeObjectUrls().
 */
import type { StoryActs } from './battleStoryService';

export const VAULT_DB_NAME = 'KiroweenMonsterVault';
export const VAULT_DB_VERSION = 1;
export const STORE_MONSTERS = 'custom_monsters';
export const STORE_CHRONICLES = 'battle_chronicles';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VaultMonsterInput {
  id: string;
  /** JSON-safe monster fields (names, prompts, stats ...). */
  meta: Record<string, unknown>;
  image?: Blob | null;
  video?: Blob | null;
}

export interface VaultMonster {
  id: string;
  meta: Record<string, unknown>;
  /** Fresh blob: URLs created on load (null when no Blob was stored). The caller must revoke them. */
  imageUrl: string | null;
  videoUrl: string | null;
  savedAt: number;
}

export interface BattleChronicleInput {
  id: string;
  fighter1Id: string;
  fighter2Id: string;
  winnerId: string;
  storyKo: string;
  storyEn: string;
  actsKo?: StoryActs;
  actsEn?: StoryActs;
  aiBattleVideo?: Blob | null;
  timestamp?: number;
}

export interface BattleChronicle {
  id: string;
  fighter1Id: string;
  fighter2Id: string;
  winnerId: string;
  storyKo: string;
  storyEn: string;
  actsKo?: StoryActs;
  actsEn?: StoryActs;
  aiBattleVideo?: Blob;
  timestamp: number;
}

interface StoredMonster {
  id: string;
  meta: Record<string, unknown>;
  image?: Blob;
  video?: Blob;
  savedAt: number;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/** Revokes blob: URLs (ignores null/undefined/non-blob values and revoke errors). */
export function revokeObjectUrls(urls: Iterable<string | null | undefined>): void {
  for (const u of urls) {
    if (typeof u !== 'string' || !u.startsWith('blob:')) continue;
    try {
      URL.revokeObjectURL(u);
    } catch {
      /* ignore */
    }
  }
}

function makeUrl(blob: Blob | undefined): string | null {
  if (!blob) return null;
  try {
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

function isBlob(v: unknown): v is Blob {
  return typeof Blob !== 'undefined' && v instanceof Blob;
}

/** Newest first, bounded by limit (limit <= 0 or non-finite = no bound). */
export function sortChronicles<T extends { timestamp: number }>(items: T[], limit?: number): T[] {
  const sorted = [...items].sort((a, b) => b.timestamp - a.timestamp);
  return typeof limit === 'number' && Number.isFinite(limit) && limit > 0 ? sorted.slice(0, Math.floor(limit)) : sorted;
}

/** New unique id for a chronicle (timestamp + counter, no randomness required). */
let idCounter = 0;
export function newChronicleId(now: number = Date.now()): string {
  idCounter = (idCounter + 1) % 1_000_000;
  return `chronicle_${now}_${idCounter}`;
}

// ---------------------------------------------------------------------------
// IndexedDB plumbing
// ---------------------------------------------------------------------------

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
  });
}

/** Creates any missing store/index. Idempotent, so upgrades from any older version are safe. */
export function upgradeVaultSchema(db: IDBDatabase, tx: IDBTransaction | null): void {
  if (!db.objectStoreNames.contains(STORE_MONSTERS)) {
    db.createObjectStore(STORE_MONSTERS, { keyPath: 'id' });
  }
  let chronicles: IDBObjectStore;
  if (!db.objectStoreNames.contains(STORE_CHRONICLES)) {
    chronicles = db.createObjectStore(STORE_CHRONICLES, { keyPath: 'id' });
  } else if (tx) {
    chronicles = tx.objectStore(STORE_CHRONICLES);
  } else {
    return;
  }
  for (const [name, path] of [
    ['timestamp', 'timestamp'],
    ['fighter1Id', 'fighter1Id'],
    ['fighter2Id', 'fighter2Id'],
  ] as const) {
    if (!chronicles.indexNames.contains(name)) chronicles.createIndex(name, path);
  }
}

export interface MonsterVault {
  isAvailable(): boolean;
  saveMonster(input: VaultMonsterInput): Promise<boolean>;
  getAllMonsters(): Promise<VaultMonster[]>;
  deleteMonster(id: string): Promise<boolean>;
  clearVault(): Promise<boolean>;
  saveChronicle(input: BattleChronicleInput): Promise<boolean>;
  getChronicles(limit?: number): Promise<BattleChronicle[]>;
  getChronicle(id: string): Promise<BattleChronicle | null>;
  deleteChronicle(id: string): Promise<boolean>;
}

/** Builds a vault bound to an IDBFactory (injectable for tests; defaults to globalThis.indexedDB). */
export function createMonsterVault(factory?: IDBFactory | null): MonsterVault {
  const resolveFactory = (): IDBFactory | null => {
    if (factory !== undefined) return factory;
    try {
      return typeof indexedDB !== 'undefined' ? indexedDB : null;
    } catch {
      return null; // access can throw in sandboxed contexts
    }
  };

  let dbPromise: Promise<IDBDatabase> | null = null;

  const openDb = (): Promise<IDBDatabase> => {
    if (dbPromise) return dbPromise;
    const f = resolveFactory();
    if (!f) return Promise.reject(new Error('IndexedDB unavailable'));
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      let req: IDBOpenDBRequest;
      try {
        req = f.open(VAULT_DB_NAME, VAULT_DB_VERSION);
      } catch (e) {
        reject(e);
        return;
      }
      req.onupgradeneeded = () => {
        try {
          upgradeVaultSchema(req.result, req.transaction);
        } catch (e) {
          reject(e);
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        // Another tab upgrades the schema: release our connection so it is not blocked.
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        db.onclose = () => {
          dbPromise = null;
        };
        resolve(db);
      };
      req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
      req.onblocked = () => reject(new Error('IndexedDB open blocked'));
    }).catch((e) => {
      dbPromise = null;
      throw e;
    });
    return dbPromise;
  };

  /** Runs fn in a transaction; resolves its value after the transaction commits, or `fallback` on any error. */
  async function run<T>(
    stores: string | string[],
    mode: IDBTransactionMode,
    fn: (tx: IDBTransaction) => Promise<T>,
    fallback: T,
  ): Promise<T> {
    try {
      const db = await openDb();
      const tx = db.transaction(stores, mode);
      const done = txDone(tx);
      done.catch(() => {}); // avoid unhandled rejection when fn fails first
      const value = await fn(tx);
      await done;
      return value;
    } catch (e) {
      console.warn('[monsterVault] operation failed', e);
      return fallback;
    }
  }

  return {
    isAvailable: () => resolveFactory() !== null,

    saveMonster: (input) => {
      const record: StoredMonster = {
        id: input.id,
        meta: input.meta,
        savedAt: Date.now(),
        ...(isBlob(input.image) ? { image: input.image } : {}),
        ...(isBlob(input.video) ? { video: input.video } : {}),
      };
      return run(STORE_MONSTERS, 'readwrite', async (tx) => {
        await reqToPromise(tx.objectStore(STORE_MONSTERS).put(record));
        return true;
      }, false);
    },

    getAllMonsters: () =>
      run<VaultMonster[]>(STORE_MONSTERS, 'readonly', async (tx) => {
        const rows = (await reqToPromise(tx.objectStore(STORE_MONSTERS).getAll())) as StoredMonster[];
        return rows
          .sort((a, b) => b.savedAt - a.savedAt)
          .map((r) => ({
            id: r.id,
            meta: r.meta,
            imageUrl: makeUrl(r.image),
            videoUrl: makeUrl(r.video),
            savedAt: r.savedAt,
          }));
      }, []),

    deleteMonster: (id) =>
      run(STORE_MONSTERS, 'readwrite', async (tx) => {
        await reqToPromise(tx.objectStore(STORE_MONSTERS).delete(id));
        return true;
      }, false),

    clearVault: () =>
      run([STORE_MONSTERS, STORE_CHRONICLES], 'readwrite', async (tx) => {
        await Promise.all([
          reqToPromise(tx.objectStore(STORE_MONSTERS).clear()),
          reqToPromise(tx.objectStore(STORE_CHRONICLES).clear()),
        ]);
        return true;
      }, false),

    saveChronicle: (input) => {
      const { aiBattleVideo, timestamp, ...rest } = input;
      const record: BattleChronicle = {
        ...rest,
        timestamp: typeof timestamp === 'number' && Number.isFinite(timestamp) ? timestamp : Date.now(),
        ...(isBlob(aiBattleVideo) ? { aiBattleVideo } : {}),
      };
      return run(STORE_CHRONICLES, 'readwrite', async (tx) => {
        await reqToPromise(tx.objectStore(STORE_CHRONICLES).put(record));
        return true;
      }, false);
    },

    getChronicles: (limit) =>
      run<BattleChronicle[]>(STORE_CHRONICLES, 'readonly', async (tx) => {
        const max = typeof limit === 'number' && Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : Infinity;
        const index = tx.objectStore(STORE_CHRONICLES).index('timestamp');
        const out: BattleChronicle[] = [];
        await new Promise<void>((resolve, reject) => {
          const cursorReq = index.openCursor(null, 'prev'); // newest first
          cursorReq.onerror = () => reject(cursorReq.error ?? new Error('cursor failed'));
          cursorReq.onsuccess = () => {
            const cursor = cursorReq.result;
            if (!cursor || out.length >= max) {
              resolve();
              return;
            }
            out.push(cursor.value as BattleChronicle);
            cursor.continue();
          };
        });
        return sortChronicles(out, max === Infinity ? undefined : max);
      }, []),

    getChronicle: (id) =>
      run<BattleChronicle | null>(STORE_CHRONICLES, 'readonly', async (tx) => {
        const row = await reqToPromise(tx.objectStore(STORE_CHRONICLES).get(id));
        return (row as BattleChronicle | undefined) ?? null;
      }, null),

    deleteChronicle: (id) =>
      run(STORE_CHRONICLES, 'readwrite', async (tx) => {
        await reqToPromise(tx.objectStore(STORE_CHRONICLES).delete(id));
        return true;
      }, false),
  };
}

// ---------------------------------------------------------------------------
// Default singleton bound to window.indexedDB
// ---------------------------------------------------------------------------

const defaultVault = createMonsterVault();

export const isVaultAvailable = defaultVault.isAvailable;
export const saveMonster = defaultVault.saveMonster;
export const getAllMonsters = defaultVault.getAllMonsters;
export const deleteMonster = defaultVault.deleteMonster;
export const clearVault = defaultVault.clearVault;
export const saveChronicle = defaultVault.saveChronicle;
export const getChronicles = defaultVault.getChronicles;
export const getChronicle = defaultVault.getChronicle;
export const deleteChronicle = defaultVault.deleteChronicle;
