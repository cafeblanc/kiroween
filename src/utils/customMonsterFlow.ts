/**
 * Pure helpers for the custom-monster flow (incubator -> awakening -> arena).
 * Kept free of React/DOM so they can be unit tested without a browser.
 */

/** Fraction of a curated clip where the adult-stage segment starts. */
export const ADULT_SEGMENT_START = 0.68;

export function isCustomMonsterId(id: string): boolean {
  return id.startsWith("custom_");
}

/**
 * Time (seconds) the adult segment of a clip starts at, or null when no seek must happen.
 * Custom monsters play their own short clip from the start, and a MediaRecorder webm blob
 * reports duration === Infinity (assigning that to currentTime throws a TypeError), so
 * only finite, positive durations of curated clips are seekable.
 */
export function adultSegmentStart(duration: number, monsterId: string): number | null {
  if (isCustomMonsterId(monsterId)) return null;
  if (!Number.isFinite(duration) || duration <= 0) return null;
  return duration * ADULT_SEGMENT_START;
}

/**
 * Whether BioreactorScreen may swap the monster's own clip for the AI/reference pipeline.
 * Custom monsters (blob: or custom_ id) already carry their generated video and must never be replaced.
 */
export function shouldResolveViaPipeline(monster: { id: string; videoSrc: string }): boolean {
  if (isCustomMonsterId(monster.id)) return false;
  return !/^\s*blob:/i.test(monster.videoSrc);
}
