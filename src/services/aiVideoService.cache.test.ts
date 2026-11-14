/**
 * Unit: AIVideoGenerator client cache (localStorage, SHA-256 key, 24h TTL, 50 max).
 *
 * Validates: Requirements 10.1, 10.2
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  aiVideoGenerator,
  AI_VIDEO_CACHE_KEY,
  AI_VIDEO_CACHE_MAX_ENTRIES,
  AI_VIDEO_CACHE_TTL_MS,
} from './aiVideoService';

function stubLocalStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  });
}

describe('aiVideoGenerator cache', () => {
  beforeEach(() => {
    stubLocalStorage();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('returns cached URL on hit and null on miss', async () => {
    await aiVideoGenerator.cacheVideo('p1', 'https://x/v1.mp4');
    expect(await aiVideoGenerator.checkCache('p1')).toBe('https://x/v1.mp4');
    expect(await aiVideoGenerator.checkCache('other')).toBeNull();
  });

  it('stores a 64-char SHA-256 hash with timestamp and 24h expiry', async () => {
    await aiVideoGenerator.cacheVideo('p1', 'https://x/v1.mp4');
    const [e] = JSON.parse(localStorage.getItem(AI_VIDEO_CACHE_KEY)!);
    expect(e.promptHash).toMatch(/^[0-9a-f]{64}$/);
    expect(e.expiry - e.timestamp).toBe(AI_VIDEO_CACHE_TTL_MS);
  });

  it('expires entries after 24 hours', async () => {
    await aiVideoGenerator.cacheVideo('p1', 'https://x/v1.mp4');
    vi.setSystemTime(Date.now() + AI_VIDEO_CACHE_TTL_MS - 1000);
    expect(await aiVideoGenerator.checkCache('p1')).toBe('https://x/v1.mp4');
    vi.setSystemTime(Date.now() + 2000);
    expect(await aiVideoGenerator.checkCache('p1')).toBeNull();
  });

  it('keeps at most 50 entries, evicting the oldest', async () => {
    for (let i = 0; i < AI_VIDEO_CACHE_MAX_ENTRIES + 5; i++) {
      vi.setSystemTime(Date.now() + 1000);
      await aiVideoGenerator.cacheVideo(`p${i}`, `https://x/${i}.mp4`);
    }
    const stored = JSON.parse(localStorage.getItem(AI_VIDEO_CACHE_KEY)!);
    expect(stored).toHaveLength(AI_VIDEO_CACHE_MAX_ENTRIES);
    expect(await aiVideoGenerator.checkCache('p0')).toBeNull();
    expect(await aiVideoGenerator.checkCache('p54')).toBe('https://x/54.mp4');
  });
});
