/**
 * Minimal in-memory IDBFactory double (fake-indexeddb is not a dependency). Supports exactly what the vault uses:
 * open/upgrade, keyPath stores, put/get/getAll/delete/clear, indexes with openCursor('prev'), transaction completion.
 * Blobs are stored by reference (no structured clone).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Rec = Record<string, any>;

export class FakeRequest<T = any> {
  result!: T;
  error: Error | null = null;
  onsuccess: (() => void) | null = null;
  onerror: (() => void) | null = null;
}

export class FakeTx {
  oncomplete: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  error: Error | null = null;
  private pending = 0;
  private finished = false;
  constructor(private db: FakeDb, private mode: string) {}
  objectStore(name: string) {
    const data = this.db.stores.get(name);
    if (!data) throw new Error(`NotFoundError: ${name}`);
    return new FakeStore(this, name, data, this.db.indexDefs.get(name) ?? new Map());
  }
  schedule<T>(work: () => T): FakeRequest<T> {
    const req = new FakeRequest<T>();
    this.pending++;
    setTimeout(() => {
      try {
        req.result = work();
        req.onsuccess?.();
      } catch (e) {
        req.error = e as Error;
        req.onerror?.();
        this.error = e as Error;
        this.onerror?.();
      }
      this.pending--;
      setTimeout(() => {
        if (this.pending === 0 && !this.finished) {
          this.finished = true;
          this.oncomplete?.();
        }
      }, 0);
    }, 0);
    return req;
  }
  get writable() {
    return this.mode === 'readwrite';
  }
}

export class FakeCursor {
  constructor(private rows: Rec[], private i: number, private req: FakeRequest<any>, private tx: FakeTx) {}
  get value() {
    return this.rows[this.i];
  }
  continue() {
    const next = this.i + 1;
    this.tx.schedule(() => {
      this.req.result = next < this.rows.length ? new FakeCursor(this.rows, next, this.req, this.tx) : null;
      return undefined;
    });
    // re-fire the original request's handler with the new cursor
    setTimeout(() => this.req.onsuccess?.(), 1);
  }
}

export class FakeStore {
  indexNames = { contains: (n: string) => this.indexDefs.has(n) };
  constructor(private tx: FakeTx, _name: string, private data: Map<string, Rec>, private indexDefs: Map<string, string>) {}
  private key(v: Rec) {
    return v.id as string;
  }
  put(v: Rec) {
    return this.tx.schedule(() => {
      if (!this.tx.writable) throw new Error('ReadOnlyError');
      this.data.set(this.key(v), { ...v });
      return this.key(v);
    });
  }
  get(k: string) {
    return this.tx.schedule(() => this.data.get(k));
  }
  getAll() {
    return this.tx.schedule(() => [...this.data.values()]);
  }
  delete(k: string) {
    return this.tx.schedule(() => {
      this.data.delete(k);
      return undefined;
    });
  }
  clear() {
    return this.tx.schedule(() => {
      this.data.clear();
      return undefined;
    });
  }
  createIndex(name: string, path: string) {
    this.indexDefs.set(name, path);
  }
  index(name: string) {
    const path = this.indexDefs.get(name);
    if (!path) throw new Error(`NotFoundError: index ${name}`);
    const tx = this.tx;
    const data = this.data;
    return {
      openCursor(_range: unknown, dir: 'next' | 'prev') {
        const req = new FakeRequest<any>();
        const rows = [...data.values()].sort((a, b) => (dir === 'prev' ? b[path] - a[path] : a[path] - b[path]));
        tx.schedule(() => {
          req.result = rows.length ? new FakeCursor(rows, 0, req, tx) : null;
          return undefined;
        });
        // the schedule() request above has its own handler slot; fire ours right after it resolves
        setTimeout(() => req.onsuccess?.(), 1);
        return req;
      },
    };
  }
}

export class FakeDb {
  stores = new Map<string, Map<string, Rec>>();
  indexDefs = new Map<string, Map<string, string>>();
  version = 0;
  closed = false;
  onversionchange: (() => void) | null = null;
  onclose: (() => void) | null = null;
  objectStoreNames = { contains: (n: string) => this.stores.has(n) };
  createObjectStore(name: string) {
    this.stores.set(name, new Map());
    this.indexDefs.set(name, new Map());
    return new FakeStore(new FakeTx(this, 'versionchange'), name, this.stores.get(name)!, this.indexDefs.get(name)!);
  }
  transaction(_names: string | string[], mode: string) {
    if (this.closed) throw new Error('InvalidStateError');
    return new FakeTx(this, mode);
  }
  close() {
    this.closed = true;
  }
}

export class FakeFactory {
  dbs = new Map<string, FakeDb>();
  opens = 0;
  failOpen = false;
  open(name: string, version: number) {
    this.opens++;
    const req: any = new FakeRequest();
    setTimeout(() => {
      if (this.failOpen) {
        req.error = new Error('open failed');
        req.onerror?.();
        return;
      }
      let db = this.dbs.get(name);
      const isNew = !db;
      if (!db) {
        db = new FakeDb();
        this.dbs.set(name, db);
      }
      req.result = db;
      if (isNew || db.version < version) {
        db.version = version;
        req.transaction = new FakeTx(db, 'versionchange');
        req.transaction.objectStore = (n: string) =>
          new FakeStore(req.transaction, n, db!.stores.get(n)!, db!.indexDefs.get(n)!);
        req.onupgradeneeded?.();
      }
      req.onsuccess?.();
    }, 0);
    return req;
  }
}

export const asFactory = (f: FakeFactory) => f as unknown as IDBFactory;
