// Feature: kiroween-rearchitecture, Property 6: BPM Progression Logic
// **Validates: Requirements 6.1**
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  GROWTH_STAGES,
  TOTAL_DURATION_SEC,
  getBpmForElapsed,
  getStageByElapsed,
} from '../growthStages';

// Spec BPMs per stage (REQ-6). Stage 6 must be >= 255 (spec lists 255, 260+).
const SPEC_BPM = [58, 66, 105, 142, 192];

describe('Property 6: BPM Progression Logic', () => {
  it('stages 1-5 match spec BPMs exactly and stage 6 is >= 255', () => {
    SPEC_BPM.forEach((bpm, i) => expect(GROWTH_STAGES[i].targetBpm).toBe(bpm));
    expect(GROWTH_STAGES[5].targetBpm).toBeGreaterThanOrEqual(255);
  });

  it('for any elapsed time, BPM equals the spec BPM of the active stage', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: TOTAL_DURATION_SEC, noNaN: true }), (t) => {
        const stage = getStageByElapsed(t);
        const bpm = getBpmForElapsed(t);
        expect(bpm).toBe(stage.targetBpm);
        if (stage.stage <= 5) expect(bpm).toBe(SPEC_BPM[stage.stage - 1]);
        else expect(bpm).toBeGreaterThanOrEqual(255);
      }),
      { numRuns: 200 },
    );
  });

  it('BPM starts at 58 and is non-decreasing over time, strictly increasing across stages', () => {
    expect(getBpmForElapsed(0)).toBe(58);
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: TOTAL_DURATION_SEC, noNaN: true }),
        fc.double({ min: 0, max: TOTAL_DURATION_SEC, noNaN: true }),
        (a, b) => {
          const [t1, t2] = a <= b ? [a, b] : [b, a];
          const b1 = getBpmForElapsed(t1);
          const b2 = getBpmForElapsed(t2);
          expect(b2).toBeGreaterThanOrEqual(b1);
          if (getStageByElapsed(t2).stage > getStageByElapsed(t1).stage) expect(b2).toBeGreaterThan(b1);
        },
      ),
      { numRuns: 200 },
    );
  });
});
