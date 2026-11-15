// VideoConcatenationService (Task 6.1, Requirements 5.1, REQ-14)
import type { StageClip, VideoConcatenationService } from '../types/kiroween';

export const CROSSFADE_SECONDS = 0.15;
export const EXPECTED_STAGE_COUNT = 6;
export const EXPECTED_TOTAL_SECONDS = 15.0;
export const DURATION_EPSILON = 1e-6;
import { FALLBACK_VIDEO_URL } from '../utils/security';
export { FALLBACK_VIDEO_URL };
export const DIRECT_CUT_MESSAGE = 'Converting to direct-cut sequence';

const ALLOWED_PROTOCOLS = new Set(['https:', 'http:', 'blob:']);

export type TransitionMode = 'crossfade' | 'direct-cut';

export interface ConcatenationPlan {
  url: string;
  mode: TransitionMode;
  totalDuration: number;
  /** Transition lengths in seconds between consecutive stages (black screen for direct-cut). */
  transitionSeconds: number;
  message?: string;
}

/** Allows only https:, http: and blob: URLs (and same-origin paths); otherwise returns the fallback. */
export function sanitizeVideoUrl(url: unknown): string {
  if (typeof url !== 'string') return FALLBACK_VIDEO_URL;
  const trimmed = url.trim();
  if (!trimmed) return FALLBACK_VIDEO_URL;
  // Root-relative paths (e.g. /videos/x.mp4); reject protocol-relative "//host".
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes('\\')) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    return ALLOWED_PROTOCOLS.has(parsed.protocol) ? trimmed : FALLBACK_VIDEO_URL;
  } catch {
    return FALLBACK_VIDEO_URL;
  }
}

function clipDuration(clip: StageClip): number {
  return clip.end - clip.start;
}

function isValidClip(clip: StageClip | undefined): clip is StageClip {
  return (
    !!clip &&
    Number.isFinite(clip.start) &&
    Number.isFinite(clip.end) &&
    clip.start >= 0 &&
    clip.end > clip.start
  );
}

/** Sum of clip durations. Crossfades occur inside stage boundaries, so they do not change the total. */
export function calculateTotalDuration(clips: StageClip[]): number {
  if (!Array.isArray(clips)) return 0;
  const total = clips.reduce((sum, c) => sum + (isValidClip(c) ? clipDuration(c) : 0), 0);
  return Math.round(total * 1e6) / 1e6;
}

/** Returns a description of why the clips are invalid, or null if they are valid. */
export function validateClips(clips: StageClip[]): string | null {
  if (!Array.isArray(clips) || clips.length !== EXPECTED_STAGE_COUNT) {
    return `Expected ${EXPECTED_STAGE_COUNT} clips, got ${Array.isArray(clips) ? clips.length : 'none'}`;
  }
  const bad = clips.findIndex((c) => !isValidClip(c));
  if (bad >= 0) return `Clip ${bad + 1} has invalid timing`;
  const total = calculateTotalDuration(clips);
  if (Math.abs(total - EXPECTED_TOTAL_SECONDS) > DURATION_EPSILON) {
    return `Total duration ${total}s does not equal ${EXPECTED_TOTAL_SECONDS}s`;
  }
  return null;
}

let lastPlan: ConcatenationPlan | null = null;

/** Plan produced by the most recent concatenateStages call (null before first call). */
export function getLastConcatenationPlan(): ConcatenationPlan | null {
  return lastPlan;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const videoConcatenationService: VideoConcatenationService = {
  concatenateStages(clips: StageClip[]): string {
    const safeUrl = sanitizeVideoUrl(Array.isArray(clips) ? clips[0]?.videoUrl : undefined);
    try {
      const problem = validateClips(clips);
      if (problem) throw new Error(problem);
      // Clips come from one source video at consecutive offsets, or are played in order by
      // the player; the returned URL is the (sanitized) source of the first stage.
      lastPlan = {
        url: safeUrl,
        mode: 'crossfade',
        totalDuration: calculateTotalDuration(clips),
        transitionSeconds: CROSSFADE_SECONDS,
      };
      return safeUrl;
    } catch (err) {
      // REQ-14: fall back to direct cuts with a 0.15s black screen between stages.
      console.error('[VideoConcatenation] Concatenation failed, using direct-cut transitions', {
        error: err instanceof Error ? err.message : String(err),
        clipCount: Array.isArray(clips) ? clips.length : 0,
        totalDuration: calculateTotalDuration(clips),
        expectedTotal: EXPECTED_TOTAL_SECONDS,
        durations: Array.isArray(clips) ? clips.map((c) => (c ? clipDuration(c) : NaN)) : [],
      });
      lastPlan = {
        url: safeUrl,
        mode: 'direct-cut',
        totalDuration: calculateTotalDuration(clips),
        transitionSeconds: CROSSFADE_SECONDS,
        message: DIRECT_CUT_MESSAGE,
      };
      return safeUrl;
    }
  },

  /** Resolves after exactly one crossfade interval (0.15s). Rejects on invalid clips so callers can direct-cut. */
  async createCrossfadeTransition(current: StageClip, next: StageClip): Promise<void> {
    if (!isValidClip(current) || !isValidClip(next)) {
      throw new Error('Cannot crossfade: invalid stage clip');
    }
    await wait(CROSSFADE_SECONDS * 1000);
  },

  calculateTotalDuration,
};

export default videoConcatenationService;
