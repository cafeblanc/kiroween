/**
 * Integration: hybrid video pipeline (VideoPipeline + AIVideoGenerator + ReferenceVideoSelector).
 * Only the network (fetch) and localStorage are stubbed; all three services are real.
 *
 * Validates: Requirements 4.1, 9.1, 10.1, 10.2
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Poll without real 5 s waits; the job client logic itself stays real.
vi.mock('./ltxJobClient', async (orig) => {
  const actual = await orig<typeof import('./ltxJobClient')>();
  return {
    ...actual,
    generateLtxVideo: (o: Parameters<typeof actual.generateLtxVideo>[0]) =>
      actual.generateLtxVideo({ ...o, sleep: async () => {} }),
  };
});
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

/**
 * Mocks the LTX job API: POST creates a job, GET reports it completed with a trusted result URL.
 * The result download (storage.googleapis.com) fails, so the remote URL is used as-is (no blob).
 */
function ltxFetch(onCreate?: (body: any) => void) {
  let created = 0;
  return vi.fn(async (url: string, init?: RequestInit) => {
    if (String(url).startsWith('https://storage.googleapis.com/')) return jsonResponse({}, false, 403);
    if (init?.method === 'POST') {
      const body = JSON.parse(String(init.body));
      onCreate?.(body);
      return jsonResponse({ jobId: `job_${String(++created).padStart(8, '0')}`, status: 'queued', kind: 'text' });
    }
    const id = new URL(String(url), 'http://x').searchParams.get('id');
    return jsonResponse({ status: 'completed', videoUrl: `https://storage.googleapis.com/ltx-out/${id}.mp4` });
  });
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
    const fetchMock = ltxFetch();
    vi.stubGlobal('fetch', fetchMock);

    const result = await buildPipeline({ aiAvailable: true }).getVideoSource(MONSTER);

    expect(result.source).toBe('ai');
    expect(result.videoUrl).toBe('https://storage.googleapis.com/ltx-out/job_00000001.mp4');
    expect(result.clips).toHaveLength(STAGES);
    // Per stage: 1 create + 1 poll + 1 failed download attempt.
    expect(fetchMock.mock.calls.filter(([, i]) => (i as RequestInit | undefined)?.method === 'POST')).toHaveLength(STAGES);
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
    const fetchMock = ltxFetch();
    vi.stubGlobal('fetch', fetchMock);
    const pipeline = buildPipeline({ aiAvailable: true });

    // Miss: every stage hits the network and is cached.
    const first = await pipeline.getVideoSource(MONSTER);
    expect(first.source).toBe('ai');
    const creates = () => fetchMock.mock.calls.filter(([, i]) => (i as RequestInit | undefined)?.method === 'POST').length;
    expect(creates()).toBe(STAGES);

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
    expect(creates()).toBe(STAGES);
  });
});
