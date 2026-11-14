import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fc from 'fast-check';
import {
  CROSSFADE_SECONDS,
  EXPECTED_STAGE_COUNT,
  getLastConcatenationPlan,
  videoConcatenationService,
} from './videoConcatenationService';
import type { StageClip } from '../types/kiroween';

// Feature: kiroween-rearchitecture, Property 5: Crossfade Transition Smoothness
// **Validates: Requirements 5.1**

const RUNS = { numRuns: 100 };

/** Six clips of positive duration summing to exactly 15.0s. */
const sixClips = fc
  .array(fc.integer({ min: 1, max: 1000 }), {
    minLength: EXPECTED_STAGE_COUNT,
    maxLength: EXPECTED_STAGE_COUNT,
  })
  .chain((weights) => {
    const sum = weights.reduce((a, b) => a + b, 0);
    return fc.integer({ min: 0, max: 50 }).map((offset) => {
      let cursor = offset;
      return weights.map((w, i): StageClip => {
        // Each stage is at least 0.3s (2x the crossfade); the rest is shared by weight. Total = 15s.
        const dur = 0.3 + (w / sum) * (15 - 0.3 * EXPECTED_STAGE_COUNT);
        const clip = { start: cursor, end: cursor + dur, label: `s${i}`, videoUrl: '/videos/a.mp4' };
        cursor += dur;
        return clip;
      });
    });
  });

describe('Property 5: Crossfade Transition Smoothness', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('every transition resolves after exactly 0.15s (not earlier, not later)', async () => {
    await fc.assert(
      fc.asyncProperty(sixClips, fc.integer({ min: 0, max: EXPECTED_STAGE_COUNT - 2 }), async (clips, i) => {
        let done = false;
        const p = videoConcatenationService.createCrossfadeTransition(clips[i], clips[i + 1]).then(() => {
          done = true;
        });
        await vi.advanceTimersByTimeAsync(CROSSFADE_SECONDS * 1000 - 1);
        expect(done).toBe(false); // no premature cut
        await vi.advanceTimersByTimeAsync(1);
        await p;
        expect(done).toBe(true); // completes at exactly 150ms
      }),
      RUNS,
    );
  });

  it('planned crossfade is 0.15s with no gap or overlap in total timeline', () => {
    fc.assert(
      fc.property(sixClips, (clips) => {
        videoConcatenationService.concatenateStages(clips);
        const plan = getLastConcatenationPlan()!;
        expect(plan.mode).toBe('crossfade'); // no black-screen gap fallback
        expect(plan.transitionSeconds).toBe(0.15);
        // Crossfade is within stage boundaries: total unchanged, so no gap or double-length overlap.
        expect(plan.totalDuration).toBeCloseTo(15, 5);
        expect(videoConcatenationService.calculateTotalDuration(clips)).toBeCloseTo(15, 5);
        // Crossfade must be shorter than every clip so only two videos ever overlap.
        for (const c of clips) expect(c.end - c.start).toBeGreaterThan(plan.transitionSeconds);
      }),
      RUNS,
    );
  });

  it('invalid clips reject instead of producing a flickering partial transition', async () => {
    await fc.assert(
      fc.asyncProperty(
        sixClips,
        fc.constantFrom(NaN, Infinity, -1),
        async (clips, badValue) => {
          const bad: StageClip = { ...clips[1], start: badValue };
          await expect(videoConcatenationService.createCrossfadeTransition(clips[0], bad)).rejects.toThrow();
        },
      ),
      RUNS,
    );
  });
});
