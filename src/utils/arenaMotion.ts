/**
 * Pure mapping from the arena battle state to presentation classes (no React, no timers).
 * The motion is derived from the event's `attacker` field first and falls back to the phase name,
 * so the second striker in a round (counter-attack) and a right-side first striker both work.
 * Every transform utility carries a `motion-reduce:` override, and the custom shake classes are
 * disabled by the prefers-reduced-motion block in index.css.
 */

export type ArenaPhase = "idle" | "f1_strike" | "f2_strike" | "clash" | "ko";
export type ArenaSide = 1 | 2;

export interface ArenaMotionEvent {
  attacker: ArenaSide | null;
  skill: string | null;
  evaded: boolean;
  /** Round number; its parity alternates the stage-shake animation so consecutive hits restart it. */
  seq: number;
}

const REDUCED = "motion-reduce:scale-100 motion-reduce:translate-x-0 motion-reduce:translate-y-0 motion-reduce:brightness-100";

/** Attacker: ~1.25x zoom toward the camera and a 4rem (64px) lunge toward the opponent. */
const LUNGE: Record<ArenaSide, string> = {
  1: `scale-125 translate-x-16 z-30 brightness-125 ${REDUCED}`,
  2: `scale-125 -translate-x-16 z-30 brightness-125 ${REDUCED}`,
};

/** Defender that took a hit: pushed away from the attacker, flashed bright, shaking. */
const PUSHED_BACK: Record<ArenaSide, string> = {
  1: `-translate-x-7 scale-95 brightness-125 arena-shake ${REDUCED}`,
  2: `translate-x-7 scale-95 brightness-125 arena-shake ${REDUCED}`,
};

const DODGE = `-translate-y-3 scale-95 ${REDUCED}`;
const WINNER_CLOSEUP = "scale-[1.3] z-30 brightness-110 motion-reduce:scale-100 motion-reduce:brightness-100";
const LOSER_FADE = "opacity-0 scale-90 motion-reduce:scale-100";

/** Which fighter is striking right now: the event's attacker wins, then the phase name; null for clash/ko/idle. */
export function strikingSide(phase: ArenaPhase, ev: ArenaMotionEvent | null): ArenaSide | null {
  if (phase !== "f1_strike" && phase !== "f2_strike") return null;
  if (ev && (ev.attacker === 1 || ev.attacker === 2)) return ev.attacker;
  return phase === "f1_strike" ? 1 : 2;
}

/** True when this fighter was hit by a landed strike (not dodged) in the current event. */
export function isFighterHit(phase: ArenaPhase, ev: ArenaMotionEvent | null, side: ArenaSide): boolean {
  const striker = strikingSide(phase, ev);
  return striker !== null && striker !== side && ev?.evaded !== true;
}

/**
 * Motion class set for one fighter.
 * @param winnerSide side of the K.O. winner once decided, otherwise null.
 */
export function fighterMotionClasses(
  phase: ArenaPhase,
  ev: ArenaMotionEvent | null,
  side: ArenaSide,
  winnerSide: ArenaSide | null,
): string {
  if (winnerSide !== null) return side === winnerSide ? WINNER_CLOSEUP : LOSER_FADE;
  if (phase === "clash") return LUNGE[side];
  const striker = strikingSide(phase, ev);
  if (striker === null) return "";
  if (striker === side) return LUNGE[side];
  return ev?.evaded === true ? DODGE : PUSHED_BACK[side];
}

/** Camera-shake class for the whole stage: on every landed strike, the clash and the K.O. */
export function stageShakeClass(phase: ArenaPhase, ev: ArenaMotionEvent | null): string {
  const hits =
    phase === "clash" || phase === "ko" || (strikingSide(phase, ev) !== null && ev?.evaded !== true);
  if (!hits) return "";
  return (ev?.seq ?? 0) % 2 === 0 ? "arena-stage-shake-a" : "arena-stage-shake-b";
}

/** Element skill name to pop up at the collision point (null when dodged or none). */
export function collisionSkill(phase: ArenaPhase, ev: ArenaMotionEvent | null): string | null {
  if (!ev || ev.evaded || !ev.skill) return null;
  return phase === "f1_strike" || phase === "f2_strike" || phase === "clash" ? ev.skill : null;
}
