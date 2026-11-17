/**
 * Smoke burst for the bioreactor finale (pure maths, drawn by components/bioreactor/SmokeBurst.tsx).
 * Timeline inside INCUBATE_BURST_MS (see summonTiming.ts):
 *   0 .. BURST_EXPLODE_MS            no smoke (the monster lunges out of the screen)
 *   BURST_EXPLODE_MS .. +250 ms      the smoke blasts outward from the centre and covers the screen
 *   .. BURST_SMOKE_CLEAR_START_MS    the screen stays covered (only a faint silhouette shows through)
 *   .. INCUBATE_BURST_MS - 200 ms    the smoke sinks to the floor and thins out, revealing the adult
 */
import { BURST_EXPLODE_MS, BURST_SMOKE_CLEAR_START_MS, INCUBATE_BURST_MS } from "./summonTiming";

export interface SmokeParticle {
  /** Outward direction (radians). */
  angle: number;
  /** How far it travels, as a fraction of the screen's half-diagonal. */
  reach: number;
  /** Start radius, as a fraction of the screen's shorter side. */
  size: number;
  /** Radius growth per second (fraction of `size`). */
  grow: number;
  /** Grey level 0..255 (dark smoke with lighter puffs). */
  shade: number;
  /** Delay after the explosion before this puff appears (ms). */
  delayMs: number;
  /** Downward pull while the smoke clears (multiplier). */
  sink: number;
}

export const SMOKE_PARTICLE_COUNT = 70;
/** Time for the cover to build up after the explosion. */
export const SMOKE_BUILD_MS = 250;
/** The smoke is gone this long before the burst ends, so the last moment is a clean full-screen adult. */
export const SMOKE_GONE_BEFORE_END_MS = 200;

/** Random puffs from `rng()` in [0, 1). Pure, for tests. */
export function smokeParticles(rng: () => number, count = SMOKE_PARTICLE_COUNT): SmokeParticle[] {
  const r = () => Math.min(0.999999, Math.max(0, rng()));
  const out: SmokeParticle[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      angle: r() * Math.PI * 2,
      reach: 0.15 + r() * 0.95,
      size: 0.1 + r() * 0.16,
      grow: 0.6 + r() * 0.9,
      shade: Math.round(35 + r() * 85),
      delayMs: Math.round(r() * 150),
      sink: 0.6 + r() * 0.8,
    });
  }
  return out;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** How opaque the smoke is overall at `tMs` (0 = none, 1 = screen covered). Non-finite input -> 0. */
export function smokeCover(tMs: number): number {
  if (!Number.isFinite(tMs) || tMs < BURST_EXPLODE_MS) return 0;
  if (tMs < BURST_EXPLODE_MS + SMOKE_BUILD_MS) return clamp01((tMs - BURST_EXPLODE_MS) / SMOKE_BUILD_MS);
  if (tMs < BURST_SMOKE_CLEAR_START_MS) return 1;
  const clearEnd = INCUBATE_BURST_MS - SMOKE_GONE_BEFORE_END_MS;
  const p = clamp01((tMs - BURST_SMOKE_CLEAR_START_MS) / (clearEnd - BURST_SMOKE_CLEAR_START_MS));
  // Ease-in: the smoke thins slowly at first, then the adult comes through quickly.
  return Math.round((1 - p * p) * 1000) / 1000;
}

/**
 * Where a puff is at `tMs` on a `w` x `h` screen, or null when it has not appeared yet.
 * It blasts outward fast and slows down; while the smoke clears it sinks toward the floor.
 */
export function particleState(
  p: SmokeParticle,
  tMs: number,
  w: number,
  h: number,
): { x: number; y: number; radius: number; alpha: number } | null {
  const age = tMs - BURST_EXPLODE_MS - p.delayMs;
  if (!Number.isFinite(age) || age < 0) return null;
  const halfDiag = Math.hypot(w, h) / 2;
  const travel = halfDiag * p.reach * (1 - Math.exp(-age / 380));
  let x = w / 2 + Math.cos(p.angle) * travel;
  let y = h * 0.55 + Math.sin(p.angle) * travel;
  const clearing = Math.max(0, tMs - BURST_SMOKE_CLEAR_START_MS) / 1000;
  y += clearing * clearing * h * 0.22 * p.sink;
  x += Math.sin(age / 700 + p.angle) * 12; // gentle swirl
  const radius = Math.min(w, h) * p.size * (1 + (age / 1000) * p.grow);
  return { x, y, radius, alpha: 0.55 * smokeCover(tMs) };
}
