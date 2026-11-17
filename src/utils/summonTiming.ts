/**
 * Timing for the Monster Design Room hand-offs (pure, tested).
 * - Bioreactor launch: when the background image is ready, it bursts out of the screen in 3D with a roar.
 * - Arena launch: while the video renders, a quiet roar repeats and grows louder with the progress.
 */

/** How long the 3D reveal stays on screen (matches the monster-reveal-burst CSS animation). */
export const MONSTER_REVEAL_MS = 2800;

/** Gap between roars on the arena waiting screen. */
export const SUMMON_ROAR_INTERVAL_MS = 4000;

export const SUMMON_ROAR_MIN_VOLUME = 0.06;
export const SUMMON_ROAR_MAX_VOLUME = 0.9;

/** Roar volume for a video progress of 0..100: quiet at first, loud near the end. Non-finite input -> quietest. */
export function summonRoarVolume(progressPct: number): number {
  const p = Number.isFinite(progressPct) ? Math.min(100, Math.max(0, progressPct)) / 100 : 0;
  // Ease-in so the growth is felt mostly near the end.
  const v = SUMMON_ROAR_MIN_VOLUME + (SUMMON_ROAR_MAX_VOLUME - SUMMON_ROAR_MIN_VOLUME) * p * p;
  return Math.round(v * 1000) / 1000;
}
