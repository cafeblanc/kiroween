import { describe, it, expect } from 'vitest';
import {
  GROWTH_STAGES,
  STAGE_COUNT,
  STAGE_DURATION_SEC,
  TOTAL_DURATION_SEC,
  validateStageDurations,
  getStageByElapsed,
  getStageProgress,
  getBpmForElapsed,
  isSequenceComplete,
} from './growthStages';
import { getStageLabel } from './StageProgressHUD';

describe('GrowthStageManager: stage duration accuracy', () => {
  it('defines 6 stages of 2.5s each totalling 15.0s', () => {
    expect(GROWTH_STAGES).toHaveLength(6);
    expect(STAGE_DURATION_SEC).toBe(2.5);
    expect(TOTAL_DURATION_SEC).toBe(15.0);
    GROWTH_STAGES.forEach((s, i) => {
      expect(s.stage).toBe(i + 1);
      expect(s.end - s.start).toBeCloseTo(2.5, 9);
      expect(s.start).toBeCloseTo(i * 2.5, 9);
    });
    expect(GROWTH_STAGES[5].end).toBe(15.0);
  });

  it('passes validateStageDurations and detects bad tables', () => {
    expect(validateStageDurations()).toEqual({ valid: true, errors: [] });
    const bad = GROWTH_STAGES.map((s, i) => (i === 2 ? { ...s, end: 8.0 } : s));
    expect(validateStageDurations(bad).valid).toBe(false);
    expect(validateStageDurations(GROWTH_STAGES.slice(0, 5)).valid).toBe(false);
  });

  it('maps elapsed time to stage with boundaries belonging to the next stage', () => {
    expect(getStageByElapsed(0).stage).toBe(1);
    expect(getStageByElapsed(2.499).stage).toBe(1);
    expect(getStageByElapsed(2.5).stage).toBe(2);
    expect(getStageByElapsed(7.5).stage).toBe(4);
    expect(getStageByElapsed(12.5).stage).toBe(6);
    expect(getStageByElapsed(14.999).stage).toBe(6);
  });

  it('clamps out-of-range and non-finite elapsed times', () => {
    expect(getStageByElapsed(-1).stage).toBe(1);
    expect(getStageByElapsed(15).stage).toBe(6);
    expect(getStageByElapsed(100).stage).toBe(6);
    expect(getStageByElapsed(NaN).stage).toBe(1);
  });

  it('reports per-stage progress and completion', () => {
    expect(getStageProgress(0)).toBe(0);
    expect(getStageProgress(1.25)).toBeCloseTo(50, 9);
    expect(getStageProgress(3.75)).toBeCloseTo(50, 9);
    expect(getStageProgress(15)).toBe(100);
    expect(isSequenceComplete(14.99)).toBe(false);
    expect(isSequenceComplete(15)).toBe(true);
  });
});

describe('GrowthStageManager: BPM progression', () => {
  it('follows 58, 66, 105, 142, 192, 260 across stages', () => {
    expect(GROWTH_STAGES.map((s) => s.targetBpm)).toEqual([58, 66, 105, 142, 192, 260]);
  });

  it('is strictly increasing and final stage meets REQ-6 (>= 255)', () => {
    const bpms = GROWTH_STAGES.map((s) => s.targetBpm);
    for (let i = 1; i < bpms.length; i++) expect(bpms[i]).toBeGreaterThan(bpms[i - 1]);
    expect(bpms[5]).toBeGreaterThanOrEqual(255);
  });

  it('returns the stage BPM for the midpoint of each stage', () => {
    const expected = [58, 66, 105, 142, 192, 260];
    expected.forEach((bpm, i) => expect(getBpmForElapsed(i * 2.5 + 1.25)).toBe(bpm));
  });
});

describe('GrowthStageManager: stage labels', () => {
  it('displays glyph + name for stages 1-6', () => {
    expect([1, 2, 3, 4, 5, 6].map(getStageLabel)).toEqual([
      '① STEM CELL',
      '② CELL DIVISION',
      '③ EMBRYO',
      '④ GROWTH',
      '⑤ JUVENILE',
      '⑥ ADULT',
    ]);
  });

  it('clamps out-of-range stage numbers', () => {
    expect(getStageLabel(0)).toBe('① STEM CELL');
    expect(getStageLabel(99)).toBe('⑥ ADULT');
  });

  it('only the final stage triggers the awakening transition', () => {
    expect(GROWTH_STAGES.filter((s) => s.transitionTrigger).map((s) => s.stage)).toEqual([6]);
    expect(STAGE_COUNT).toBe(6);
  });
});
