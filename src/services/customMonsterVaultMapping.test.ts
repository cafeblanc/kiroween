import { afterEach, describe, expect, it, vi } from 'vitest';
import { FakeFactory, asFactory } from './fakeIdb.testutil';
import type { ComicMonster } from '../data/comicMonsters';
import {
  CUSTOM_ROSTER_DISPLAY_LIMIT,
  addToRoster,
  isEphemeralUrl,
  mergeRoster,
  monsterToVaultInput,
  monsterToVaultMeta,
  ownedBlobUrls,
  urlToBlob,
  vaultToComicMonster,
} from './customMonsterVaultMapping';
import { createMonsterVault } from './monsterVaultService';

const mk = (id: string, over: Partial<ComicMonster> = {}): ComicMonster => ({
  id,
  nameEn: 'Lava Custom',
  nameKo: '용암 커스텀',
  taglineKo: '화염',
  taglineEn: 'Fire',
  icon: '🐉',
  bpm: 120,
  colorHex: '#f97316',
  badge: 'CUSTOM AI',
  promptKo: '용암 비늘',
  promptEn: 'lava scales',
  avatarImg: 'blob:http://x/avatar',
  jumpscareImg: 'blob:http://x/avatar',
  videoSrc: 'blob:http://x/video',
  roarAudio: '/sounds/monster_roar_ferocious.wav',
  funFactKo: '재미',
  funFactEn: 'fun',
  customStats: { atk: 90, def: 40, spd: 55, regen: 30, energy: 77 },
  ...over,
});

afterEach(() => vi.restoreAllMocks());

describe('record <-> ComicMonster mapping', () => {
  it('meta never carries ephemeral media URLs but keeps static fallbacks', () => {
    const meta = monsterToVaultMeta(mk('c1', { avatarImg: '/images/a.jpg', jumpscareImg: 'data:image/png;base64,AAA' }));
    expect(meta.avatarFallback).toBe('/images/a.jpg');
    expect(meta.jumpscareFallback).toBeNull();
    expect(meta.videoFallback).toBeNull();
    expect(meta).not.toHaveProperty('avatarImg');
    expect(meta).not.toHaveProperty('videoSrc');
    expect(JSON.parse(JSON.stringify(meta))).toEqual(meta);
  });

  it('round-trips through an in-memory IndexedDB with fresh blob URLs and stats', async () => {
    const urls = ['blob:fresh/img', 'blob:fresh/vid'];
    let n = 0;
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => urls[n++ % 2]);
    const vault = createMonsterVault(asFactory(new FakeFactory()));
    const m = mk('c1');
    const ok = await vault.saveMonster(
      monsterToVaultInput(m, new Blob(['img'], { type: 'image/png' }), new Blob(['vid'], { type: 'video/mp4' })),
    );
    expect(ok).toBe(true);
    const [rec] = await vault.getAllMonsters();
    const back = vaultToComicMonster(rec)!;
    expect(back.id).toBe('c1');
    expect(back.nameKo).toBe('용암 커스텀');
    expect(back.customStats).toEqual(m.customStats);
    expect(back.avatarImg).toBe('blob:fresh/img');
    expect(back.videoSrc).toBe('blob:fresh/vid');
    expect(back.colorHex).toBe('#f97316');
    expect(ownedBlobUrls([back]).sort()).toEqual(['blob:fresh/img', 'blob:fresh/vid']);
  });

  it('upserts by id: saving the same monster twice leaves one record', async () => {
    const vault = createMonsterVault(asFactory(new FakeFactory()));
    const m = mk('c1');
    await vault.saveMonster(monsterToVaultInput(m, null, null));
    await vault.saveMonster(monsterToVaultInput({ ...m, nameKo: '수정됨' }, null, null));
    const all = await vault.getAllMonsters();
    expect(all).toHaveLength(1);
    expect(all[0].meta.nameKo).toBe('수정됨');
  });

  it('without Blobs it falls back to static paths and the default video', () => {
    const rec = {
      id: 'c2',
      meta: monsterToVaultMeta(mk('c2', { avatarImg: '/images/a.jpg', jumpscareImg: '/images/a.jpg', videoSrc: '/videos/chimera_growth_kraken_24s.mp4' })),
      imageUrl: null,
      videoUrl: null,
      savedAt: 1,
    };
    const back = vaultToComicMonster(rec)!;
    expect(back.avatarImg).toBe('/images/a.jpg');
    expect(back.videoSrc).toBe('/videos/chimera_growth_kraken_24s.mp4');
    const noMedia = vaultToComicMonster({ ...rec, meta: monsterToVaultMeta(mk('c2')) })!;
    expect(noMedia.videoSrc).toBe('/videos/chimera_growth_dragon_24s.mp4');
  });

  it('rejects unusable records', () => {
    expect(vaultToComicMonster({ id: 'x', meta: {}, imageUrl: null, videoUrl: null, savedAt: 0 })).toBeNull();
    expect(vaultToComicMonster({ id: '', meta: { nameKo: 'a' }, imageUrl: null, videoUrl: null, savedAt: 0 })).toBeNull();
  });
});

describe('roster merge', () => {
  it('deduplicates by id and lets in-memory entries win', () => {
    const cur = [mk('a', { nameKo: '새것' })];
    const restored = [mk('a', { nameKo: '옛것' }), mk('b')];
    const out = mergeRoster(cur, restored);
    expect(out.map((m) => m.id)).toEqual(['a', 'b']);
    expect(out[0].nameKo).toBe('새것');
  });

  it('addToRoster upserts at the front', () => {
    const out = addToRoster([mk('a'), mk('b')], mk('b', { nameKo: '갱신' }));
    expect(out.map((m) => m.id)).toEqual(['b', 'a']);
    expect(out[0].nameKo).toBe('갱신');
  });

  it('shows more than the old 6-entry limit; the cap only limits display', () => {
    expect(CUSTOM_ROSTER_DISPLAY_LIMIT).toBeGreaterThan(6);
    const restored = Array.from({ length: 10 }, (_, i) => mk(`r${i}`));
    expect(mergeRoster([], restored)).toHaveLength(10);
    const many = Array.from({ length: CUSTOM_ROSTER_DISPLAY_LIMIT + 5 }, (_, i) => mk(`m${i}`));
    expect(mergeRoster([], many)).toHaveLength(CUSTOM_ROSTER_DISPLAY_LIMIT);
  });
});

describe('urlToBlob', () => {
  it('returns null for static paths and never throws on fetch failure', async () => {
    const f = vi.fn();
    expect(await urlToBlob('/videos/a.mp4', f as unknown as typeof fetch)).toBeNull();
    expect(f).not.toHaveBeenCalled();
    const bad = vi.fn().mockRejectedValue(new Error('net'));
    expect(await urlToBlob('blob:x', bad as unknown as typeof fetch)).toBeNull();
    const notOk = vi.fn().mockResolvedValue({ ok: false });
    expect(await urlToBlob('https://x/y', notOk as unknown as typeof fetch)).toBeNull();
  });

  it('returns the Blob on success', async () => {
    const f = vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['abc']) });
    const b = await urlToBlob('data:image/png;base64,AAA', f as unknown as typeof fetch);
    expect(b?.size).toBe(3);
    expect(isEphemeralUrl('blob:a')).toBe(true);
    expect(isEphemeralUrl('/a')).toBe(false);
  });
});

describe('body parts survive a vault round trip', () => {
  it('keeps the designed parts so stories after a reload still use them', () => {
    const parts = { head: 'horned head', arms: 'titanium claws', legs: 'lava legs', tail: 'scorpion tail', torso: 'obsidian chest', hornsOrCrown: '', auraAndSkin: 'ember aura' };
    const meta = monsterToVaultMeta(mk('custom_parts', { bodyParts: parts }));
    const back = vaultToComicMonster({ id: 'custom_parts', meta, imageUrl: 'blob:i', videoUrl: 'blob:v' } as never);
    expect(back?.bodyParts).toEqual({ head: 'horned head', arms: 'titanium claws', legs: 'lava legs', tail: 'scorpion tail', torso: 'obsidian chest', auraAndSkin: 'ember aura' });
  });

  it('ignores missing, non-string or unknown parts (older records)', () => {
    expect(vaultToComicMonster({ id: 'custom_old', meta: monsterToVaultMeta(mk('custom_old')) } as never)?.bodyParts).toBeUndefined();
    const meta = { ...monsterToVaultMeta(mk('custom_bad')), bodyParts: { head: 42, wings: 'x', tail: '  ' } };
    expect(vaultToComicMonster({ id: 'custom_bad', meta } as never)?.bodyParts).toBeUndefined();
  });
});
