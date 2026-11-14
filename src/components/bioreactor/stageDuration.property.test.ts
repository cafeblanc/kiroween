import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  GROWTH_STAGES,
  STAGE_DURATION_SEC,
  STAGE_COUNT,
  getStageByElapsed,
} from './growthStages';

/**
 * Property 2: Stage Duration Accuracy
 * **Validates: Requirements 2.1, 2.2**
 */
describe('Property 2: Stage Duration Accuracy', () => {
  const EPS = 1e-9;
  const stageIndex = fc.integer({ min: 0, max: STAGE_COUNT - 1 });

  it('every stage spans exactly 2.5s with start = index * 2.5', () => {
    fc.assert(
      fc.property(stageIndex, (i) => {
        const s = GROWTH_STAGES[i];
        expect(STAGE_DURATION_SEC).toBe(2.5);
        expect(Math.abs(s.end - s.start - 2.5)).toBeLessThan(EPS);
        expect(Math.abs(s.start - i * 2.5)).toBeLessThan(EPS);
        expect(Math.abs(s.end - (i + 1) * 2.5)).toBeLessThan(EPS);
      }),
      { numRuns: 100 },
    );
  });

  it('any elapsed time within a stage window resolves to that stage', () => {
    fc.assert(
      fc.property(stageIndex, fc.double({ min: 0, max: 1, noNaN: true, maxExcluded: true }), (i, frac) => {
        const t = i * 2.5 + frac * 2.5;
        // Floating-point rounding can land exactly on the next boundary; skip that.
        fc.pre(t < (i + 1) * 2.5);
        expect(getStageByElapsed(t).stage).toBe(i + 1);
      }),
      { numRuns: 200 },
    );
  });

  it('time spent in each stage over a fine-grained timeline is 2.5s', () => {
    fc.assert(
      fc.property(fc.constantFrom(0.01, 0.05, 0.1, 0.25, 0.5), (dt) => {
        const counts = new Array(STAGE_COUNT).fill(0);
        const steps = Math.round(15 / dt);
        for (let k = 0; k < steps; k++) {
          counts[getStageByElapsed(k * dt + dt / 2).stage - 1]++;
        }
        counts.forEach((c) => expect(Math.abs(c * dt - 2.5)).toBeLessThan(dt + EPS));
      }),
      { numRuns: 100 },
    );
  });
});
