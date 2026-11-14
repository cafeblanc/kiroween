/**
 * Integration: hybrid video pipeline (VideoPipeline + AIVideoGenerator + ReferenceVideoSelector).
 * Only the network (fetch) and localStorage are stubbed; all three services are real.
 *
 * Validates: Requirements 4.1, 9.1, 10.1, 10.2
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createVideoPipeline, AI_FALLBACK_MESSAGE } from './videoPipeline';
import { aiVideoGenerator, resetVideoRateLimiter } from './aiVideoService';
import { referenceVideoSelector, REFERENCE_VIDEOS } from './referenceVideoSelector';

const MONSTER = 'myth_dragon';
const STAGES = 6;

function stubLocalStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  });
}

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body,
  } as unknown as Response;
}

function buildPipeline(opts: { aiAvailable: boolean; onUserMessage?: (m: string) => void }) {
  return createVideoPipeline({
    isAIAvailable: () => opts.aiAvailable,
    getAIGenerator: async () => aiVideoGenerator,
    getReferenceSelector: async () => referenceVideoSelector,
    onUserMessage: opts.onUserMessage,
  });
}

describe('hybrid video pipeline integration', () => {
  beforeEach(() => {
    resetVideoRateLimiter();
    stubLocalStorage();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('AI available: generates via AI and returns six stage clips', async () => {
    let n = 0;
    const fetchMock = vi.fn(async () => jsonResponse({ videoUrl: `https://cdn.example/stage-${n++}.mp4` }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await buildPipeline({ aiAvailable: true }).getVideoSource(MONSTER);

    expect(result.source).toBe('ai');
    expect(result.videoUrl).toBe('https://cdn.example/stage-0.mp4');
    expect(result.clips).toHaveLength(STAGES);
    expect(fetchMock).toHaveBeenCalledTimes(STAGES);
  });

  it('AI unavailable: uses the reference video without calling the network', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const onUserMessage = vi.fn();

    const result = await buildPipeline({ aiAvailable: false, onUserMessage }).getVideoSource(MONSTER);

    expect(result.source).toBe('reference');
    expect(result.videoUrl).toBe(REFERENCE_VIDEOS[MONSTER]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onUserMessage).toHaveBeenCalledWith(AI_FALLBACK_MESSAGE);
  });

  it('AI API error: falls back to the reference video', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({}, false, 500)));

    const result = await buildPipeline({ aiAvailable: true }).getVideoSource(MONSTER);

    expect(result.source).toBe('reference');
    expect(result.videoUrl).toBe(REFERENCE_VIDEOS[MONSTER]);
  });

  it('cache miss generates and caches; cache hit reuses without network calls', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const { prompt } = JSON.parse(String(init?.body));
      return jsonResponse({ videoUrl: `https://cdn.example/${encodeURIComponent(prompt).slice(0, 40)}-${fetchMock.mock.calls.length}.mp4` });
    });
    vi.stubGlobal('fetch', fetchMock);
    const pipeline = buildPipeline({ aiAvailable: true });

    // Miss: every stage hits the network and is cached.
    const first = await pipeline.getVideoSource(MONSTER);
    expect(first.source).toBe('ai');
    expect(fetchMock).toHaveBeenCalledTimes(STAGES);

    const prompts = aiVideoGenerator.splitIntoSixStages(
      (await import('../data/comicMonsters')).COMIC_MONSTERS.find((m) => m.id === MONSTER)!.promptEn,
    );
    for (const p of prompts) {
      expect(await aiVideoGenerator.checkCache(p)).toBeTruthy();
    }

    // Hit: same result, no additional network calls.
    const second = await pipeline.getVideoSource(MONSTER);
    expect(second.source).toBe('ai');
    expect(second.videoUrl).toBe(first.videoUrl);
    expect(fetchMock).toHaveBeenCalledTimes(STAGES);
  });
});
