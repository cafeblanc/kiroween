import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CROSSFADE_SECONDS,
  DIRECT_CUT_MESSAGE,
  FALLBACK_VIDEO_URL,
  calculateTotalDuration,
  getLastConcatenationPlan,
  sanitizeVideoUrl,
  validateClips,
  videoConcatenationService,
} from './videoConcatenationService';
import {
  FALLBACK_REFERENCE_VIDEO,
  FALLBACK_MESSAGE,
  REFERENCE_VIDEOS,
  STAGE_LABELS,
  extractStageClips,
  referenceVideoSelector,
} from './referenceVideoSelector';

const URL_A = '/videos/battles/battle_dragon_vs_kraken.mp4';

describe('crossfade transition timing', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('uses a 0.15s crossfade constant', () => {
    expect(CROSSFADE_SECONDS).toBe(0.15);
  });

  it('resolves after exactly 150ms, not before', async () => {
    const [a, b] = extractStageClips(URL_A);
    let done = false;
    const p = videoConcatenationService.createCrossfadeTransition(a, b).then(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(149);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await p;
    expect(done).toBe(true);
  });

  it('rejects when a clip is invalid', async () => {
    const [a] = extractStageClips(URL_A);
    const bad = { ...a, start: 5, end: 5 };
    await expect(videoConcatenationService.createCrossfadeTransition(a, bad)).rejects.toThrow();
  });
});

describe('concatenateStages / video URL generation', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));
  afterEach(() => vi.restoreAllMocks());

  it('returns the source URL and a crossfade plan for 6 clips totalling 15s', () => {
    const clips = extractStageClips(URL_A);
    expect(videoConcatenationService.concatenateStages(clips)).toBe(URL_A);
    const plan = getLastConcatenationPlan();
    expect(plan?.mode).toBe('crossfade');
    expect(plan?.totalDuration).toBe(15);
    expect(plan?.transitionSeconds).toBe(0.15);
  });

  it('falls back to direct-cut when clip count is wrong', () => {
    const clips = extractStageClips(URL_A).slice(0, 5);
    expect(videoConcatenationService.concatenateStages(clips)).toBe(URL_A);
    const plan = getLastConcatenationPlan();
    expect(plan?.mode).toBe('direct-cut');
    expect(plan?.message).toBe(DIRECT_CUT_MESSAGE);
  });

  it('falls back to direct-cut when total duration is not 15s', () => {
    const clips = extractStageClips(URL_A).map((c) => ({ ...c, end: c.end + 0.1 }));
    expect(validateClips(clips)).toMatch(/Total duration/);
    videoConcatenationService.concatenateStages(clips);
    expect(getLastConcatenationPlan()?.mode).toBe('direct-cut');
  });

  it('returns fallback URL for unsafe or missing URLs', () => {
    expect(sanitizeVideoUrl('javascript:alert(1)')).toBe(FALLBACK_VIDEO_URL);
    expect(sanitizeVideoUrl('//evil.com/x.mp4')).toBe(FALLBACK_VIDEO_URL);
    expect(sanitizeVideoUrl('')).toBe(FALLBACK_VIDEO_URL);
    expect(sanitizeVideoUrl(undefined)).toBe(FALLBACK_VIDEO_URL);
    expect(sanitizeVideoUrl('https://example.com/a.mp4')).toBe('https://example.com/a.mp4');
    expect(sanitizeVideoUrl('/videos/a.mp4')).toBe('/videos/a.mp4');
    const unsafe = extractStageClips('javascript:alert(1)');
    expect(videoConcatenationService.concatenateStages(unsafe)).toBe(FALLBACK_VIDEO_URL);
  });

  it('calculateTotalDuration sums clip durations', () => {
    expect(calculateTotalDuration(extractStageClips(URL_A))).toBe(15);
    expect(calculateTotalDuration([])).toBe(0);
  });
});

describe('ReferenceVideoSelector stage extraction', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));
  afterEach(() => vi.restoreAllMocks());

  it('extracts 6 consecutive 2.5s clips covering 0-15s', () => {
    const clips = extractStageClips(URL_A);
    expect(clips).toHaveLength(6);
    clips.forEach((c, i) => {
      expect(c.start).toBe(i * 2.5);
      expect(c.end).toBe((i + 1) * 2.5);
      expect(c.label).toBe(STAGE_LABELS[i]);
      expect(c.videoUrl).toBe(URL_A);
    });
    expect(clips[5].end).toBe(15);
  });

  it('selects the mapped reference video for a known monster', () => {
    const result = referenceVideoSelector.select('alien_xenomorph');
    expect(result.source).toBe('reference');
    expect(result.videoUrl).toBe(REFERENCE_VIDEOS.alien_xenomorph);
    expect(result.clips).toHaveLength(6);
    expect(result.message).toBeUndefined();
  });

  it('falls back to dragon_vs_kraken for unknown monsters', () => {
    const result = referenceVideoSelector.select('unknown_monster');
    expect(result.videoUrl).toBe(FALLBACK_REFERENCE_VIDEO);
    expect(FALLBACK_REFERENCE_VIDEO).toContain('dragon_vs_kraken');
    expect(result.message).toBe(FALLBACK_MESSAGE);
    expect(result.clips).toHaveLength(6);
  });

  it('does not treat prototype keys as monsters', () => {
    expect(referenceVideoSelector.select('constructor').videoUrl).toBe(FALLBACK_REFERENCE_VIDEO);
  });

  it('selector output passes concatenation validation', () => {
    const { clips } = referenceVideoSelector.select('myth_dragon');
    expect(validateClips(clips)).toBeNull();
  });
});
