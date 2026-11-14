// Pure helpers for BioreactorFluid (task 2.2, Requirements 11.1, 11.2).

import type { Bubble } from '../../types/kiroween';

// Bubble fields are normalized: x,y,radius in 0..1 of frame; speed in frame heights/sec.

export const MIN_FLUID_LEVEL = 0.15;
export const MAX_FLUID_LEVEL = 1.0;
export const BASE_BPM = 58;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function clampFluidLevel(level: number): number {
  if (!Number.isFinite(level)) return MAX_FLUID_LEVEL;
  return clamp(level, MIN_FLUID_LEVEL, MAX_FLUID_LEVEL);
}

/** Bpm scale factor: 1 at base bpm, grows sub-linearly, bounded to [0.5, 4]. */
export function bpmFactor(bpm?: number): number {
  if (bpm === undefined || !Number.isFinite(bpm) || bpm <= 0) return 1;
  return clamp(bpm / BASE_BPM, 0.5, 4);
}

/** Bubble opacity: 1.0 fluid level -> 0.6 max opacity, 0.15 level -> 0.15 min. Linear. */
export function bubbleOpacity(fluidLevel: number): number {
  const level = clampFluidLevel(fluidLevel);
  const t = (level - MIN_FLUID_LEVEL) / (MAX_FLUID_LEVEL - MIN_FLUID_LEVEL);
  return MIN_FLUID_LEVEL + t * (0.6 - MIN_FLUID_LEVEL);
}

/** Normalized y of the fluid surface (0 top, 1 bottom). Full fluid is near the top. */
export function surfaceBaseY(fluidLevel: number): number {
  return 1 - clampFluidLevel(fluidLevel);
}

/** Surface wave vertical offset (normalized) at normalized x and time t (seconds). */
export function surfaceWaveOffset(x: number, timeSec: number, bpm?: number, stage?: number): number {
  const f = bpmFactor(bpm);
  const s = stageWaveFrequency(stage);
  const w1 = Math.sin(x * Math.PI * 2 * 2 * s + timeSec * 1.6 * f * s) * 0.008;
  const w2 = Math.sin(x * Math.PI * 2 * 5 * s - timeSec * 2.4 * f * s) * 0.004;
  return w1 + w2;
}

/** Wave frequency multiplier by growth stage (1-6): 1.0 at stage 1, +0.2 per stage, 2.0 at stage 6. */
export function stageWaveFrequency(stage?: number): number {
  if (stage === undefined || !Number.isFinite(stage)) return 1;
  return 1 + (clamp(Math.round(stage), 1, 6) - 1) * 0.2;
}

/** Create a bubble below the surface. `rand` returns [0,1). */
export function createBubble(rand: () => number = Math.random, fluidLevel = 1): Bubble {
  const top = surfaceBaseY(fluidLevel);
  return {
    x: rand(),
    y: top + rand() * (1 - top),
    radius: 0.004 + rand() * 0.014,
    speed: 0.06 + rand() * 0.14,
    wobble: rand() * Math.PI * 2,
  };
}

/** Advance a bubble. Recycles at the bottom once it reaches the surface. Always stays in [0,1]. */
export function stepBubble(
  b: Bubble,
  dtSec: number,
  fluidLevel: number,
  bpm?: number,
  rand: () => number = Math.random,
): Bubble {
  const top = surfaceBaseY(fluidLevel);
  const y = b.y - b.speed * bpmFactor(bpm) * dtSec;
  const wobble = b.wobble + dtSec * 3 * bpmFactor(bpm);
  if (y <= top) {
    return { ...createBubble(rand, fluidLevel), y: 1 };
  }
  return { ...b, y, wobble };
}

/** Horizontal draw position with wobble, clamped so the bubble stays inside the frame. */
export function bubbleX(b: Bubble): number {
  return clamp(b.x + Math.sin(b.wobble) * 0.01, b.radius, 1 - b.radius);
}

/** Bubble count scales with bpm and fluid level. */
export function bubbleCount(fluidLevel: number, bpm?: number): number {
  const n = Math.round(14 * bpmFactor(bpm) * clampFluidLevel(fluidLevel));
  return clamp(n, 3, 48);
}
