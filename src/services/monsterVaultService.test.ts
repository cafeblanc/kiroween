/**
 * fake-indexeddb is NOT a dependency (and none may be added), so these tests run against a minimal
 * in-memory IDBFactory double defined below. It supports exactly what the vault uses: open/upgrade,
 * object stores with keyPath, put/get/getAll/delete/clear, indexes with openCursor('prev'), and
 * transaction completion. Blobs are stored by reference (no structured clone).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import {
  STORE_CHRONICLES,
  STORE_MONSTERS,
  VAULT_DB_NAME,
  createMonsterVault,
  newChronicleId,
  revokeObjectUrls,
  sortChronicles,
} from './monsterVaultService';

// ---------------------------------------------------------------------------
// Minimal IDB test double
// ---------------------------------------------------------------------------

import { FakeFactory, FakeStore, asFactory } from './fakeIdb.testutil';

const blob = (s: string, type = 'video/mp4') => new Blob([s], { type });

// ---------------------------------------------------------------------------

describe('monsterVaultService', () => {
  let created: string[];
  beforeEach(() => {
    created = [];
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    revokeObjectUrls(created);
    vi.restoreAllMocks();
  });

  it('creates the DB with both stores and the chronicle indexes', async () => {
    const f = new FakeFactory();
    const v = createMonsterVault(asFactory(f));
    expect(await v.getAllMonsters()).toEqual([]);
    const db = f.dbs.get(VAULT_DB_NAME)!;
    expect([...db.stores.keys()].sort()).toEqual([STORE_CHRONICLES, STORE_MONSTERS].sort());
    expect([...db.indexDefs.get(STORE_CHRONICLES)!.keys()].sort()).toEqual(['fighter1Id', 'fighter2Id', 'timestamp']);
  });

  it('stores monster image/video as Blobs and recreates blob: URLs on load', async () => {
    const v = createMonsterVault(asFactory(new FakeFactory()));
    expect(await v.saveMonster({ id: 'custom_a', meta: { nameKo: '한글 괴수' }, image: blob('img', 'image/png'), video: blob('vid') })).toBe(true);
    expect(await v.saveMonster({ id: 'custom_b', meta: { nameKo: 'B' } })).toBe(true);
    const all = await v.getAllMonsters();
    created.push(...all.flatMap((m) => [m.imageUrl, m.videoUrl].filter((u): u is string => !!u)));
    const a = all.find((m) => m.id === 'custom_a')!;
    const b = all.find((m) => m.id === 'custom_b')!;
    expect(a.meta.nameKo).toBe('한글 괴수');
    expect(a.imageUrl).toMatch(/^blob:/);
    expect(a.videoUrl).toMatch(/^blob:/);
    expect(b.imageUrl).toBeNull();
    expect(b.videoUrl).toBeNull();
  });

  it('renameMonster changes only the names and keeps the image, video and save time', async () => {
    const v = createMonsterVault(asFactory(new FakeFactory()));
    await v.saveMonster({ id: 'custom_a', meta: { nameKo: '옛 이름', nameEn: 'Old', colorHex: '#f97316' }, image: blob('img', 'image/png'), video: blob('vid') });
    const before = (await v.getAllMonsters())[0];
    created.push(before.imageUrl!, before.videoUrl!);
    expect(await v.renameMonster('custom_a', '새 이름')).toBe(true);
    const after = (await v.getAllMonsters())[0];
    created.push(after.imageUrl!, after.videoUrl!);
    expect(after.meta).toEqual({ nameKo: '새 이름', nameEn: '새 이름', colorHex: '#f97316' });
    expect(after.imageUrl).toMatch(/^blob:/);
    expect(after.videoUrl).toMatch(/^blob:/);
    expect(after.savedAt).toBe(before.savedAt);
    expect(await v.renameMonster('missing', 'x')).toBe(false);
  });

  it('deleteMonster removes one, clearVault removes everything (both stores)', async () => {
    const v = createMonsterVault(asFactory(new FakeFactory()));
    await v.saveMonster({ id: 'custom_a', meta: {} });
    await v.saveMonster({ id: 'custom_b', meta: {} });
    await v.saveChronicle({ id: 'c1', fighter1Id: 'a', fighter2Id: 'b', winnerId: 'a', storyKo: 'k', storyEn: 'e' });
    expect(await v.deleteMonster('custom_a')).toBe(true);
    expect((await v.getAllMonsters()).map((m) => m.id)).toEqual(['custom_b']);
    expect(await v.clearVault()).toBe(true);
    expect(await v.getAllMonsters()).toEqual([]);
    expect(await v.getChronicles()).toEqual([]);
  });

  it('saves chronicles, lists newest first with a limit, and updates the same record with a video', async () => {
    const v = createMonsterVault(asFactory(new FakeFactory()));
    for (const t of [100, 300, 200, 400]) {
      await v.saveChronicle({ id: `c${t}`, fighter1Id: 'a', fighter2Id: 'b', winnerId: 'a', storyKo: `ko${t}`, storyEn: `en${t}`, timestamp: t });
    }
    expect((await v.getChronicles()).map((c) => c.timestamp)).toEqual([400, 300, 200, 100]);
    expect((await v.getChronicles(2)).map((c) => c.id)).toEqual(['c400', 'c300']);

    const before = await v.getChronicle('c200');
    expect(before?.aiBattleVideo).toBeUndefined();
    await v.saveChronicle({ id: 'c200', fighter1Id: 'a', fighter2Id: 'b', winnerId: 'a', storyKo: 'ko200', storyEn: 'en200', timestamp: 200, aiBattleVideo: blob('clip') });
    const after = await v.getChronicle('c200');
    expect(after?.aiBattleVideo).toBeInstanceOf(Blob);
    expect(await v.getChronicles()).toHaveLength(4); // updated in place, not duplicated

    expect(await v.getChronicle('missing')).toBeNull();
    expect(await v.deleteChronicle('c200')).toBe(true);
    expect(await v.getChronicle('c200')).toBeNull();
  });

  it('persists across vault instances on the same factory (page reload)', async () => {
    const f = new FakeFactory();
    await createMonsterVault(asFactory(f)).saveChronicle({ id: 'c1', fighter1Id: 'a', fighter2Id: 'b', winnerId: 'b', storyKo: '한', storyEn: 'en' });
    const reloaded = await createMonsterVault(asFactory(f)).getChronicles();
    expect(reloaded.map((c) => c.storyKo)).toEqual(['한']);
  });

  it('returns safe fallbacks (no throw) when indexedDB is missing', async () => {
    const v = createMonsterVault(null);
    expect(v.isAvailable()).toBe(false);
    expect(await v.saveMonster({ id: 'x', meta: {} })).toBe(false);
    expect(await v.getAllMonsters()).toEqual([]);
    expect(await v.saveChronicle({ id: 'c', fighter1Id: 'a', fighter2Id: 'b', winnerId: 'a', storyKo: '', storyEn: '' })).toBe(false);
    expect(await v.getChronicles(5)).toEqual([]);
    expect(await v.getChronicle('c')).toBeNull();
    expect(await v.deleteChronicle('c')).toBe(false);
    expect(await v.clearVault()).toBe(false);
  });

  it('returns safe fallbacks when open fails, and retries on the next call', async () => {
    const f = new FakeFactory();
    f.failOpen = true;
    const v = createMonsterVault(asFactory(f));
    expect(await v.getChronicles()).toEqual([]);
    f.failOpen = false;
    expect(await v.saveChronicle({ id: 'c', fighter1Id: 'a', fighter2Id: 'b', winnerId: 'a', storyKo: '', storyEn: '' })).toBe(true);
    expect(await v.getChronicles()).toHaveLength(1);
  });

  it('survives a throwing factory', async () => {
    const bad = { open: () => { throw new Error('SecurityError'); } } as unknown as IDBFactory;
    expect(await createMonsterVault(bad).getAllMonsters()).toEqual([]);
  });

  it('survives a Blob/put failure and reports false', async () => {
    const f = new FakeFactory();
    const v = createMonsterVault(asFactory(f));
    await v.getAllMonsters(); // open
    const db = f.dbs.get(VAULT_DB_NAME)!;
    db.stores.set(STORE_MONSTERS, new Map([['x', {}]]));
    const orig = FakeStore.prototype.put;
    FakeStore.prototype.put = function (this: any) {
      return this.tx.schedule(() => {
        throw new Error('QuotaExceededError');
      });
    } as any;
    try {
      expect(await v.saveMonster({ id: 'big', meta: {}, video: blob('x'.repeat(10)) })).toBe(false);
    } finally {
      FakeStore.prototype.put = orig;
    }
  });
});

describe('vault pure helpers', () => {
  it('revokeObjectUrls revokes only blob: URLs and ignores bad values', () => {
    const spy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    revokeObjectUrls(['blob:abc', null, undefined, '/videos/x.mp4', 'https://x/y', 'blob:def']);
    expect(spy.mock.calls.map((c) => c[0])).toEqual(['blob:abc', 'blob:def']);
    spy.mockRestore();
  });

  it('revokeObjectUrls does not throw when revoke throws', () => {
    const spy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {
      throw new Error('boom');
    });
    expect(() => revokeObjectUrls(['blob:abc'])).not.toThrow();
    spy.mockRestore();
  });

  it('sortChronicles is newest-first, bounded, and does not mutate its input', () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 0, max: 1e9 })), fc.integer({ min: 0, max: 20 }), (ts, limit) => {
        const items = ts.map((timestamp, i) => ({ timestamp, i }));
        const copy = [...items];
        const out = sortChronicles(items, limit);
        expect(items).toEqual(copy);
        for (let i = 1; i < out.length; i++) expect(out[i - 1].timestamp).toBeGreaterThanOrEqual(out[i].timestamp);
        expect(out.length).toBe(limit > 0 ? Math.min(limit, items.length) : items.length);
      }),
      { numRuns: 100 },
    );
  });

  it('newChronicleId is unique within the same millisecond', () => {
    const ids = new Set(Array.from({ length: 200 }, () => newChronicleId(1700000000000)));
    expect(ids.size).toBe(200);
  });
});
