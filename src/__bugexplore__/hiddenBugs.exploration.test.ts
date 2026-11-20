/**
 * Bug condition exploration tests for spec `hidden-bugs-audit` (Task 1).
 *
 * These tests encode the EXPECTED (fixed) behavior for C1-C10 and are meant to FAIL on
 * unfixed code. Do not "fix" them; they validate the fix in task 3.6.
 *
 * Run alone:  npx vitest --run src/__bugexplore__
 *
 * The workspace has no jsdom / testing-library, so UI-only bugs (C3, C5, C6, C10 timers)
 * are checked by structural assertions on the component source, while C1, C2, C7,
 * C8, C9 are checked behaviorally (file system, vercel.json, real handler, real service).
 * C11/C12 (OpenAI Realtime voice) were removed together with the voice module.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf8');
const LAB = 'src/components/BioStitchLabView.tsx';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('C1/C2 missing assets and routing (1.1, 1.2)', () => {
  it('C1: /videos/fallback.mp4 exists under public/', () => {
    expect(existsSync(resolve(ROOT, 'public/videos/fallback.mp4'))).toBe(true);
  });

  it('C1: vercel.json catch-all rewrite does not swallow missing media paths', () => {
    const cfg = JSON.parse(read('vercel.json'));
    const spa = (cfg.rewrites as { source: string; destination: string }[]).find(
      (r) => r.destination === '/index.html',
    )!;
    const re = new RegExp('^' + spa.source + '$');
    for (const p of ['/videos/missing.mp4', '/sounds/missing.wav', '/images/missing.jpg']) {
      expect(re.test(p), `${p} would be rewritten to index.html (HTTP 200 HTML)`).toBe(false);
    }
  });

  it('C2: CustomMonsterStudio default videoSrc and roarAudio exist in public/', () => {
    const src = read('src/components/bioreactor/CustomMonsterStudio.tsx');
    // Default clip used when no video exists yet (`videoSrc: <generated video> || "/videos/..."`).
    const video = /videoSrc:\s*\w+\s*\|\|\s*"([^"]+)"/.exec(src)?.[1];
    const audio = /roarAudio:\s*"([^"]+)"/.exec(src)?.[1];
    expect(video).toBeTruthy();
    expect(audio).toBeTruthy();
    expect(existsSync(resolve(ROOT, 'public' + video)), `default video ${video}`).toBe(true);
    expect(existsSync(resolve(ROOT, 'public' + audio)), `default audio ${audio}`).toBe(true);
  });
});

describe('C3 viewport media handling (1.3)', () => {
  const src = read(LAB);
  const effect = /useEffect\(\(\) => \{\s*setVideoFailed\(false\);[\s\S]*?\}, \[[^\]]*\]\);/.exec(src)?.[0] ?? '';

  it('C3: experiment-change effect does not call load() and does not blindly set videoFailed on play() rejection', () => {
    expect(effect.length).toBeGreaterThan(0);
    expect(effect).not.toMatch(/\.load\(\)/);
    expect(effect).not.toMatch(/\.catch\(\(\) => \{\s*setVideoFailed\(true\)/);
  });

  it('C3: play() rejection is classified by error name (AbortError / NotAllowedError)', () => {
    expect(src).toMatch(/AbortError/);
    expect(src).toMatch(/NotAllowedError/);
  });

  it('C3: background <img> has an onError fallback', () => {
    const idx = src.indexOf('<img', src.indexOf('videoFailed') > 0 ? src.indexOf('<video') - 1200 : 0);
    const tag = /<img[\s\S]*?\/>/.exec(src.slice(idx))?.[0] ?? '';
    expect(tag).toMatch(/onError/);
  });

  it('C3: a canvas bio-simulation fallback exists', () => {
    expect(/BioSimCanvas/.test(src) || existsSync(resolve(ROOT, 'src/components/BioSimCanvas.tsx'))).toBe(true);
  });
});

describe('C4 error boundary (1.4)', () => {
  it('C4: the app tree is wrapped in ErrorBoundary (main.tsx or App.tsx)', () => {
    const wired = /<ErrorBoundary[\s>]/.test(read('src/main.tsx')) || /<ErrorBoundary[\s>]/.test(read('src/App.tsx'));
    expect(wired).toBe(true);
  });
});

describe('C5 narrator and audio lifecycle (1.5)', () => {
  const src = read(LAB);

  it('C5: stale narration is discarded after the translate await (request id guard)', () => {
    expect(src).toMatch(/narrationIdRef/);
  });

  it('C5: narration effect cleanup cancels speechSynthesis', () => {
    const eff = /void speakText\([\s\S]*?\}, \[isSoundOn[^\]]*\]\);/.exec(src)?.[0] ?? '';
    expect(eff.length).toBeGreaterThan(0);
    const cleanup = eff.slice(eff.indexOf('return () =>'));
    expect(cleanup).toMatch(/speechSynthesis\.cancel\(\)/);
  });

  it('C5: shared AudioContext is closed on unmount', () => {
    expect(src).toMatch(/audioCtxRef\.current\??\.close\(/);
  });
});

describe('C6 Lab Manual (1.6)', () => {
  const src = read(LAB);
  const modal = src.slice(src.indexOf('{isHelpOpen && ('));

  // The LIVE BIO-FEED badge was removed at the user's request; the Help button now lives in the top header bar.
  it('C6: the Help / Lab Guide button is in the header and opens the Lab Manual', () => {
    const header = src.slice(src.indexOf('<header'), src.indexOf('</header>'));
    expect(header).toMatch(/setIsHelpOpen\(true\)/);
    expect(header).toMatch(/사용법/);
    expect(src).not.toMatch(/LIVE BIO-FEED/);
  });

  it('C6: Lab Manual defines exactly 6 points (LAB_MANUAL_POINTS)', () => {
    const m = /LAB_MANUAL_POINTS[^=]*=\s*\[([\s\S]*?)\n\];/.exec(src);
    expect(m, 'LAB_MANUAL_POINTS constant missing').toBeTruthy();
    expect((m![1].match(/\bko:/g) ?? []).length).toBe(6);
  });

  it('C6: modal renders 6 cards (currently 4)', () => {
    const cards = modal.slice(0, 6000).match(/bg-slate-950\/90 border border-slate-800 rounded-xl/g) ?? [];
    expect(cards.length).toBe(6);
  });

  it('C6: confirm button text is localized by isKo (currently hard-coded Korean)', () => {
    const marker = modal.indexOf('w-full bg-emerald-500');
    expect(marker).toBeGreaterThan(0);
    const btn = modal.slice(marker, modal.indexOf('</button>', marker));
    expect(btn).toMatch(/isKo/);
  });
});

describe('C7 chat lock and timeouts (1.7)', () => {
  it('C7: handleSendChat resets isQueryingApi in a finally block', () => {
    const src = read(LAB);
    const i = src.indexOf('setIsQueryingApi(true)');
    const seg = src.slice(i, i + 600);
    expect(seg).toMatch(/finally\s*\{[\s\S]*setIsQueryingApi\(false\)/);
  });

  it('C7: stitchLiveQuery settles within 8s when every fetch hangs', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    vi.stubGlobal('window', globalThis);
    const { scienceStitchService } = await import('../services/scienceStitchService');
    let settled = false;
    void scienceStitchService
      .stitchLiveQuery('what is a chimera embryo', 'en')
      .then(() => (settled = true), () => (settled = true));
    await vi.advanceTimersByTimeAsync(9_000);
    expect(settled, 'stitchLiveQuery still pending after 9s with hung fetch -> Send stays disabled').toBe(true);
  });
});

describe('C8/C9 generate-video handler (1.8, 1.9)', () => {
  function mockRes() {
    const res: any = { statusCode: 200, headers: {} as Record<string, string>, body: undefined as unknown };
    res.setHeader = (k: string, v: string) => ((res.headers[k] = v), res);
    res.status = (c: number) => ((res.statusCode = c), res);
    res.json = (b: unknown) => ((res.body = b), res);
    res.send = (b: unknown) => ((res.body = b), res);
    return res;
  }
  async function loadHandler() {
    vi.resetModules();
    for (const k of ['HF_TOKEN', 'HUGGINGFACE_TOKEN', 'LTX_API_KEY']) delete process.env[k];
    process.env.LTXV_API_KEY = 'ltx_test_key'; // video now runs on the LTX API (server env key)
    return (await import('../../api/generate-video')).default;
  }
  const post = (body: any, headers: Record<string, string> = {}) => ({
    method: 'POST',
    body,
    headers,
    socket: { remoteAddress: '10.0.0.1' },
  });

  it('C8: upstream timeout fires before maxDuration (60s)', async () => {
    vi.useFakeTimers();
    const handler = await loadHandler();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_u: string, init: any) =>
          new Promise((_r, rej) => {
            init.signal.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' })));
          }),
      ),
    );
    const res = mockRes();
    void handler(post({ prompt: 'p' }), res);
    await vi.advanceTimersByTimeAsync(55_000);
    expect(res.statusCode, 'no 504 within 55s; timeout equals maxDuration').toBe(504);
  });

  it('C8: a 6 MB upstream body is not buffered into the function response', async () => {
    const handler = await loadHandler();
    const big = new Uint8Array(6_000_000);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(big, { status: 200, headers: { 'content-type': 'video/mp4' } })));
    const res = mockRes();
    await handler(post({ prompt: 'p' }), res);
    const size = Buffer.isBuffer(res.body) ? res.body.length : 0;
    expect(size, 'handler sent a >4.5MB Buffer via res.send').toBeLessThanOrEqual(4_500_000);
  });

  it('C8: provider "luma" is rejected with 400 "unsupported provider" and calls no upstream', async () => {
    const handler = await loadHandler();
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    const res = mockRes();
    await handler(post({ prompt: 'p', provider: 'luma', apiKey: 'luma_x' }), res);
    expect(res.statusCode).toBe(400);
    expect(JSON.stringify(res.body)).toMatch(/unsupported provider/i);
    expect(f).not.toHaveBeenCalled();
  });

  it('C8: a luma request never falls through to HuggingFace', async () => {
    const handler = await loadHandler();
    process.env.HF_TOKEN = 'hf_env_token';
    const f = vi.fn(async () => new Response('x', { status: 200 }));
    vi.stubGlobal('fetch', f);
    const res = mockRes();
    await handler(post({ prompt: 'p', provider: 'luma' }), res);
    delete process.env.HF_TOKEN;
    expect(res.statusCode).toBe(400);
    const urls = f.mock.calls.map((c: any[]) => String(c[0]));
    expect(urls.some((u) => u.includes('huggingface'))).toBe(false);
  });

  it('C9: rotating x-forwarded-for does not bypass the rate limit', async () => {
    const handler = await loadHandler();
    let last = 0;
    for (let i = 0; i < 15; i++) {
      const res = mockRes();
      await handler(
        post({ prompt: '' }, { 'x-forwarded-for': `1.2.3.${i}`, 'x-vercel-forwarded-for': '9.9.9.9' }),
        res,
      );
      last = res.statusCode;
    }
    expect(last, 'all 15 requests with spoofed XFF passed the limiter').toBe(429);
  });
});

describe('C10 resource leaks (1.10)', () => {
  it('C10: blob URLs are revoked in the video services', () => {
    for (const f of [
      'src/services/aiVideoService.ts',
      'src/services/videoGenService.ts',
      'src/services/customMonsterMediaService.ts',
    ]) {
      expect(read(f), `${f} never calls URL.revokeObjectURL`).toMatch(/revokeObjectURL/);
    }
  });

  it('C10: arena/incubation timers and the battle-video generation are cleaned up (unmount or leave)', () => {
    const src = read(LAB);
    // old duel timers (arenaTimersRef) no longer exist; the remaining timers each have a cleanup:
    expect(src).not.toMatch(/arenaTimersRef/);
    expect(src).toMatch(/return \(\) => window\.clearTimeout\(t\);/); // duel-ready delay and 3D reveal timer
    expect(src).toMatch(/return \(\) => window\.clearInterval\(t\);/); // entrance roar interval
    // Incubation: no tick timer any more (the tank clip's timeupdate drives the hand-off); the bubbling sound it
    // starts must be stopped on cleanup.
    expect(src).toMatch(/const stop = startBubbleSound\(\);\s*return stop;/);
    expect(src).toMatch(/return\s*\(\)\s*=>\s*\{[^}]*aiClashAbortRef\.current\?\.abort\(\)/); // unmount aborts generation
  });
});
