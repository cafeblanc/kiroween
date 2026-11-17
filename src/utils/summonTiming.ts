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
/**
 * Photorealistic embryo sequence for the bioreactor (replaces the stock tank clip, which showed its own creature):
 * six FLUX frames from a single stem cell to a late embryo whose species is still unrecognisable.
 */
export const EMBRYO_FRAMES: readonly string[] = [
  "/images/incubation/stage1_stem_cell.jpg",
  "/images/incubation/stage2_division.jpg",
  "/images/incubation/stage3_morula.jpg",
  "/images/incubation/stage4_blastocyst.jpg",
  "/images/incubation/stage5_early_embryo.jpg",
  "/images/incubation/stage6_late_embryo.jpg",
];
/**
 * Time per embryo frame. The middle division stages (2 cells, morula, blastocyst) get the most time so the splitting
 * can be watched; total 23.5 s.
 */
export const EMBRYO_STAGE_DURATIONS_MS: readonly number[] = [3000, 4500, 4500, 4500, 3500, 3500];
export const EMBRYO_TOTAL_MS = EMBRYO_STAGE_DURATIONS_MS.reduce((a, b) => a + b, 0);
/** Start time of each stage (cumulative). */
export const EMBRYO_STAGE_STARTS_MS: readonly number[] = EMBRYO_STAGE_DURATIONS_MS.map((_, i) =>
  EMBRYO_STAGE_DURATIONS_MS.slice(0, i).reduce((a, b) => a + b, 0),
);
/**
 * After the last embryo frame, the user's finished monster slowly emerges inside the egg (blurred and dark -> sharp and
 * lit) before the 3D burst, so the complete form appears gradually instead of popping out of an empty egg.
 */
export const MONSTER_EMERGE_MS = 4000;
/** Cross-fade between two embryo frames (slow, so one stage melts into the next). */
export const EMBRYO_CROSSFADE_MS = 1400;

/**
 * LTX-2.5 transition clips between consecutive embryo frames (frame k -> k+1, made with first + last frame, 6 s each).
 * Played back to back; each clip ends on the frame the next one starts with, so the development is continuous.
 * The photo sequence above stays as the fallback when a clip cannot be played.
 */
export const EMBRYO_CLIPS: readonly string[] = [
  "/videos/incubation/embryo_1_2.mp4",
  "/videos/incubation/embryo_2_3.mp4",
  "/videos/incubation/embryo_3_4.mp4",
  "/videos/incubation/embryo_4_5.mp4",
  "/videos/incubation/embryo_5_6.mp4",
];
/** Playback speed: 5 clips x 6 s / 1.25 = 24 s, close to the 23.5 s photo sequence. */
export const EMBRYO_CLIP_RATE = 1.25;

/** After clip `index` ends: play the next one, or the development is complete. */
export function nextEmbryoClip(index: number): { index: number; done: boolean } {
  const last = EMBRYO_CLIPS.length - 1;
  if (!Number.isFinite(index) || index < 0) return { index: 0, done: false };
  if (index >= last) return { index: last, done: true };
  return { index: Math.floor(index) + 1, done: false };
}

export type EmbryoAction = "play" | "hold" | "handoff";

/**
 * Embryo sequence state after `elapsedMs`:
 *   stage   index of the frame to show (0..5)
 *   action  play    the embryo is still developing
 *           hold    all stages were shown but the monster image is not ready: stay on the last frame (pulsing)
 *           handoff all stages were shown and the image is ready: expand the finished adult
 * An early image therefore still waits for the whole embryo development.
 */
export function embryoSequence(elapsedMs: number, imageReady: boolean): { stage: number; action: EmbryoAction } {
  const last = EMBRYO_FRAMES.length - 1;
  const t = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  let stage = 0;
  for (let i = 0; i <= last; i++) if (t >= EMBRYO_STAGE_STARTS_MS[i]) stage = i;
  if (t < EMBRYO_TOTAL_MS) return { stage, action: "play" };
  return { stage: last, action: imageReady ? "handoff" : "hold" };
}

/** Reduced motion: a plain cross-fade of this length replaces the materialise effects. */
export const INCUBATE_REDUCED_FADE_MS = 400;
/** Fade from the still image to the entrance video once its first frame is decoded. */
export const ENTRANCE_CROSSFADE_MS = 500;