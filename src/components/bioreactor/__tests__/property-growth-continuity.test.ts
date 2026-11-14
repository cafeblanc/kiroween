// Feature: kiroween-rearchitecture, Property 1: Growth Sequence Continuity
// **Validates: Requirements 1.1, 1.2**
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  GROWTH_STAGES,
  STAGE_COUNT,
  TOTAL_DURATION_SEC,
  getStageByElapsed,
  validateStageDurations,
} from '../growthStages';

const LABELS = ['STEM CELL', 'CELL DIVISION', 'EMBRYO', 'GROWTH', 'JUVENILE', 'ADULT'];

describe('Property 1: Growth Sequence Continuity', () => {
  it('has 6 stages in order, contiguous from 0.0s, totalling 15.0s', () => {
    expect(GROWTH_STAGES).toHaveLength(6);
    expect(GROWTH_STAGES.map((s) => s.stage)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(GROWTH_STAGES.map((s) => s.label)).toEqual(LABELS);
    expect(GROWTH_STAGES[0].start).toBe(0);
    for (let i = 1; i < GROWTH_STAGES.length; i++) {
      expect(GROWTH_STAGES[i].start).toBeCloseTo(GROWTH_STAGES[i - 1].end, 9);
    }
    const total = GROWTH_STAGES.reduce((sum, s) => sum + (s.end - s.start), 0);
    expect(total).toBeCloseTo(15.0, 9);
    expect(TOTAL_DURATION_SEC).toBe(15.0);
    expect(validateStageDurations().valid).toBe(true);
  });

  it('for any playback time in [0, 15), the active stage is the one whose range contains it', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 15, maxExcluded: true, noNaN: true }), (t) => {
        const s = getStageByElapsed(t);
        expect(t).toBeGreaterThanOrEqual(s.start);
        expect(t).toBeLessThan(s.end);
        expect(s.label).toBe(LABELS[s.stage - 1]);
      }),
      { numRuns: 200 },
    );
  });

  it('for any increasing sequence of sample times, stage numbers never decrease and cover 1..6 in order', () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 0, max: 15, maxExcluded: true, noNaN: true }), { minLength: 2, maxLength: 60 }),
        (times) => {
          const sorted = [...times].sort((a, b) => a - b);
          const stages = sorted.map((t) => getStageByElapsed(t).stage);
          for (let i = 1; i < stages.length; i++) {
            expect(stages[i]).toBeGreaterThanOrEqual(stages[i - 1]);
            // no stage skipped between consecutive samples within a range of one stage width
            if (sorted[i] - sorted[i - 1] < 2.5) {
              expect(stages[i] - stages[i - 1]).toBeLessThanOrEqual(1);
            }
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('a dense timeline sweep visits all 6 stages exactly once, in order', () => {
    fc.assert(
      fc.property(fc.integer({ min: 10, max: 300 }), fc.double({ min: 0, max: 0.009, noNaN: true }), (stepsPerStage, jitter) => {
        const visited: number[] = [];
        const n = stepsPerStage * STAGE_COUNT;
        for (let i = 0; i < n; i++) {
          const t = Math.min((i / n) * 15 + jitter, 14.999999);
          const st = getStageByElapsed(t).stage;
          if (visited[visited.length - 1] !== st) visited.push(st);
        }
        expect(visited).toEqual([1, 2, 3, 4, 5, 6]);
      }),
      { numRuns: 100 },
    );
  });
});
