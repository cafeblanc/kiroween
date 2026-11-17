/**
 * Timing for the Monster Design Room hand-offs (pure, tested).
 * - Bioreactor launch: when the background image is ready, it bursts out of the screen in 3D with a roar.
 * - Arena launch: while the video renders, a quiet roar repeats and grows louder with the progress.
 */

/** How long the 3D reveal stays on screen (matches the monster-reveal-burst / incubate-expand CSS animations). */
export const MONSTER_REVEAL_MS = 2000;

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
/** The arena entrance video plays only its first seconds, then freezes on that frame. */
export const ENTRANCE_PLAY_SECONDS = 3;
/** True once the entrance video has reached the freeze point (pause it). Non-finite input -> keep playing. */
export function shouldFreezeEntrance(currentTimeSec: number): boolean {
  return Number.isFinite(currentTimeSec) && currentTimeSec >= ENTRANCE_PLAY_SECONDS;
}
/**
 * Face-off pose in the arena: each monster turns this many degrees around the vertical axis toward its opponent.
 * A flat image turned a full 90 degrees is edge-on and invisible, so ~40 degrees is used (they still face each other).
 */
export const ARENA_FACE_OFF_DEG = 40;
/** How long the slow turn takes (CSS transition). */
export const ARENA_TURN_MS = 2500;
/** CSS rotateY degrees for a half: 0 until both halves are filled; then the left turns right (+) and the right turns left (-). */
export function faceOffAngleDeg(side: "left" | "right", bothFilled: boolean): number {
  if (!bothFilled) return 0;
  return side === "left" ? ARENA_FACE_OFF_DEG : -ARENA_FACE_OFF_DEG;
}
/**
 * Bioreactor hand-off (one continuous scene, no hard cut):
 *   growing       the full-screen tank video plays while the image renders in the background
 *   materialising the finished image forms inside the tank over the still-playing video (blur -> sharp, 0 -> 1 opacity,
 *                 green glow in the monster colour), the last INCUBATE_HOLD_MS is a beat with the creature fully formed
 *   reveal        glass-burst flash and the 3D pop-out toward the viewer with the roar (MONSTER_REVEAL_MS)
 *   done          back to the Design Room
 */
export type IncubationPhase = "growing" | "materialising" | "reveal" | "done";
/** Length of the in-tank materialise step including the final hold. */
export const INCUBATE_MATERIALISE_MS = 1400;
/** The last part of the materialise step: the creature is fully formed and still. */
export const INCUBATE_HOLD_MS = 300;
/** Phase for the time elapsed since the image became ready (null/undefined/negative/non-finite = not ready yet). */
export function incubationPhase(elapsedSinceReadyMs: number | null | undefined): IncubationPhase {
  if (elapsedSinceReadyMs === null || elapsedSinceReadyMs === undefined || !Number.isFinite(elapsedSinceReadyMs) || elapsedSinceReadyMs < 0) {
    return "growing";
  }
  if (elapsedSinceReadyMs < INCUBATE_MATERIALISE_MS) return "materialising";
  if (elapsedSinceReadyMs < INCUBATE_MATERIALISE_MS + MONSTER_REVEAL_MS) return "reveal";
  return "done";
}
/** Clip time (s) where the embryo-growth part ends; handy for logs and tests. */
export function tankEmbryoEndSec(durationSec: number): number {
  return Number.isFinite(durationSec) && durationSec > 0 ? durationSec * TANK_EMBRYO_END_FRACTION : 0;
}

/**
 * Bioreactor tank clip timing (fractions of the clip length, so they fit any clip).
 * The stock tank clip shows its own adult creature from ADULT_SEGMENT_START (0.68, customMonsterFlow); the hand-off to
 * the user's monster happens just before that, after the embryo-growth part, and the clip never plays past it.
 */
/**
 * The tank clip is cut into 6 equal growth stages (growthStages.ts): STEM CELL, CELL DIVISION, EMBRYO (33-50%),
 * GROWTH "feature-protrusion" (50-67%: the stock creature's species becomes recognisable), JUVENILE, ADULT.
 * The hand-off must happen at the end of the EMBRYO stage, before any species feature shows.
 */
export const TANK_GROWTH_STAGE_START_FRACTION = 3 / 6;
/** Embryo growth is over: before this point the hand-off never starts, even if the image is already ready. */
export const TANK_EMBRYO_END_FRACTION = 0.45;
/** Hand-off point: just before the GROWTH stage, while the embryo is still an unrecognisable shape. Never played past. */
export const TANK_HANDOFF_FRACTION = 0.47;
/** While waiting for a slow image, the clip loops back to here (inside the EMBRYO stage). */
export const TANK_HOLD_LOOP_START_FRACTION = 0.36;
/**
 * The stock tank clip has burned-in captions in its top and bottom bands (title, stage label and a disclaimer).
 * Scaling the video up crops those bands off screen: at 1.5x, the top and bottom 1/6 of the frame fall outside.
 */
export const TANK_CAPTION_CROP_SCALE = 1.5;

export type TankClipAction = "play" | "loop-back" | "handoff";

/**
 * What the tank clip should do at `currentTimeSec`:
 *   play      keep playing (embryo growth still running, or waiting before the hand-off point)
 *   loop-back the image is not ready yet at the hand-off point: seek back to the hold-loop start
 *   handoff   the hand-off point is reached and the image is ready: pause and expand the image
 * Unknown/invalid duration -> "play" (the clip is still loading).
 */
export function tankClipAction(currentTimeSec: number, durationSec: number, imageReady: boolean): TankClipAction {
  if (!Number.isFinite(durationSec) || durationSec <= 0 || !Number.isFinite(currentTimeSec)) return "play";
  const handoffAt = durationSec * TANK_HANDOFF_FRACTION;
  if (currentTimeSec < handoffAt) return "play";
  return imageReady ? "handoff" : "loop-back";
}

/** Reduced motion: a plain cross-fade of this length replaces the materialise effects. */
export const INCUBATE_REDUCED_FADE_MS = 400;
/** Fade from the still image to the entrance video once its first frame is decoded. */
export const ENTRANCE_CROSSFADE_MS = 500;