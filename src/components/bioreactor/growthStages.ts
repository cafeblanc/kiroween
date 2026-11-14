import type { GrowthStageConfig } from '../../types/kiroween';

/** Fixed duration of every growth stage, in seconds (REQ-2). */
export const STAGE_DURATION_SEC = 2.5;
export const STAGE_COUNT = 6;
/** Total growth sequence duration: 6 x 2.5s = 15.0s (REQ-1). */
export const TOTAL_DURATION_SEC = STAGE_DURATION_SEC * STAGE_COUNT;

/**
 * Growth stage table. BPM values follow REQ-6 (58, 66, 105, 142, 192, 255-260+);
 * the BPMs in design.md are inconsistent and are intentionally not used.
 */
export const GROWTH_STAGES: readonly GrowthStageConfig[] = [
  { stage: 1, label: 'STEM CELL', start: 0.0, end: 2.5, targetBpm: 58, visualEffect: 'bioluminescent-cell', transitionTrigger: false },
  { stage: 2, label: 'CELL DIVISION', start: 2.5, end: 5.0, targetBpm: 66, visualEffect: 'mitotic-spindles', transitionTrigger: false },
  { stage: 3, label: 'EMBRYO', start: 5.0, end: 7.5, targetBpm: 105, visualEffect: 'organ-primordia', transitionTrigger: false },
  { stage: 4, label: 'GROWTH', start: 7.5, end: 10.0, targetBpm: 142, visualEffect: 'feature-protrusion', transitionTrigger: false },
  { stage: 5, label: 'JUVENILE', start: 10.0, end: 12.5, targetBpm: 192, visualEffect: 'behavioral-movement', transitionTrigger: false },
  { stage: 6, label: 'ADULT', start: 12.5, end: 15.0, targetBpm: 260, visualEffect: 'awakening-roar', transitionTrigger: true },
];

export interface StageValidationResult {
  valid: boolean;
  errors: string[];
}

const EPS = 1e-9;

/** Validate stage count, 2.5s durations, contiguity, and 15.0s total. */
export function validateStageDurations(
  stages: readonly GrowthStageConfig[] = GROWTH_STAGES,
): StageValidationResult {
  const errors: string[] = [];
  if (stages.length !== STAGE_COUNT) {
    errors.push(`Expected ${STAGE_COUNT} stages, got ${stages.length}`);
  }
  stages.forEach((s, i) => {
    if (s.stage !== i + 1) errors.push(`Stage index ${i} has stage number ${s.stage}`);
    if (Math.abs(s.end - s.start - STAGE_DURATION_SEC) > EPS) {
      errors.push(`Stage ${s.stage} duration is ${s.end - s.start}s, expected ${STAGE_DURATION_SEC}s`);
    }
    if (i > 0 && Math.abs(s.start - stages[i - 1].end) > EPS) {
      errors.push(`Stage ${s.stage} start ${s.start} does not follow previous end ${stages[i - 1].end}`);
    }
  });
  if (stages.length > 0) {
    if (Math.abs(stages[0].start) > EPS) errors.push('First stage must start at 0.0s');
    const total = stages[stages.length - 1].end - stages[0].start;
    if (Math.abs(total - TOTAL_DURATION_SEC) > EPS) {
      errors.push(`Total duration is ${total}s, expected ${TOTAL_DURATION_SEC}s`);
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Get the stage for an elapsed time in seconds. Times below 0 clamp to stage 1;
 * times at or beyond 15.0s clamp to stage 6. Boundaries belong to the next stage.
 */
export function getStageByElapsed(
  elapsedSec: number,
  stages: readonly GrowthStageConfig[] = GROWTH_STAGES,
): GrowthStageConfig {
  const t = Number.isFinite(elapsedSec) ? elapsedSec : 0;
  for (const s of stages) {
    if (t >= s.start && t < s.end) return s;
  }
  return t < stages[0].start ? stages[0] : stages[stages.length - 1];
}

export function getStageByNumber(
  stage: number,
  stages: readonly GrowthStageConfig[] = GROWTH_STAGES,
): GrowthStageConfig | undefined {
  return stages.find((s) => s.stage === stage);
}

/** Progress (0-100) within the stage that contains elapsedSec. */
export function getStageProgress(
  elapsedSec: number,
  stages: readonly GrowthStageConfig[] = GROWTH_STAGES,
): number {
  const s = getStageByElapsed(elapsedSec, stages);
  const pct = ((elapsedSec - s.start) / (s.end - s.start)) * 100;
  return Math.min(100, Math.max(0, pct));
}

/** Overall sequence progress (0-100). */
export function getTotalProgress(elapsedSec: number): number {
  return Math.min(100, Math.max(0, (elapsedSec / TOTAL_DURATION_SEC) * 100));
}

export function getBpmForElapsed(
  elapsedSec: number,
  stages: readonly GrowthStageConfig[] = GROWTH_STAGES,
): number {
  return getStageByElapsed(elapsedSec, stages).targetBpm;
}

export function isSequenceComplete(elapsedSec: number): boolean {
  return elapsedSec >= TOTAL_DURATION_SEC;
}
