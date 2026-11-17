import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { SMOKE_PARTICLE_COUNT, particleState, smokeCover, smokeParticles } from "./smokeBurst";
import { BURST_EXPLODE_MS, BURST_SMOKE_CLEAR_START_MS, INCUBATE_BURST_MS } from "./summonTiming";

const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

describe("smokeCover (bioreactor finale)", () => {
  it("has no smoke before the explosion and bad input", () => {
    expect(smokeCover(0)).toBe(0);
    expect(smokeCover(BURST_EXPLODE_MS - 1)).toBe(0);
    expect(smokeCover(Number.NaN)).toBe(0);
  });
  it("covers the screen between the explosion and the clearing", () => {
    expect(smokeCover(BURST_EXPLODE_MS + 300)).toBe(1);
    expect(smokeCover(BURST_SMOKE_CLEAR_START_MS - 1)).toBe(1);
  });
  it("is gone before the burst ends, so the adult is shown clean", () => {
    expect(smokeCover(INCUBATE_BURST_MS - 200)).toBe(0);
    expect(smokeCover(INCUBATE_BURST_MS)).toBe(0);
  });
  it("only thins out while clearing", () => {
    fc.assert(
      fc.property(fc.integer({ min: BURST_SMOKE_CLEAR_START_MS, max: INCUBATE_BURST_MS }), fc.integer({ min: 0, max: 2000 }), (a, d) => {
        expect(smokeCover(a + d)).toBeLessThanOrEqual(smokeCover(a));
      }),
    );
  });
  it("timings keep the CSS order: lunge < explosion < clearing < end", () => {
    expect(BURST_EXPLODE_MS).toBeGreaterThan(0);
    expect(BURST_SMOKE_CLEAR_START_MS).toBeGreaterThan(BURST_EXPLODE_MS);
    expect(INCUBATE_BURST_MS).toBeGreaterThan(BURST_SMOKE_CLEAR_START_MS + 1500);
  });
});

describe("smoke particles", () => {
  it("are deterministic for a seed and in range", () => {
    const a = smokeParticles(seeded(7));
    expect(a).toHaveLength(SMOKE_PARTICLE_COUNT);
    expect(smokeParticles(seeded(7))).toEqual(a);
    for (const p of a) {
      expect(p.shade).toBeGreaterThanOrEqual(35);
      expect(p.shade).toBeLessThanOrEqual(120);
      expect(p.delayMs).toBeLessThanOrEqual(150);
    }
  });
  it("appear only after the explosion, blast outward, then sink while clearing", () => {
    const p = { angle: 0, reach: 0.8, size: 0.1, grow: 1, shade: 60, delayMs: 0, sink: 1 };
    expect(particleState(p, BURST_EXPLODE_MS - 1, 1000, 600)).toBeNull();
    const early = particleState(p, BURST_EXPLODE_MS + 50, 1000, 600)!;
    const later = particleState(p, BURST_EXPLODE_MS + 800, 1000, 600)!;
    expect(later.x).toBeGreaterThan(early.x); // angle 0 -> moves right
    const clearing = particleState(p, BURST_SMOKE_CLEAR_START_MS + 1500, 1000, 600)!;
    const before = particleState(p, BURST_SMOKE_CLEAR_START_MS, 1000, 600)!;
    expect(clearing.y).toBeGreaterThan(before.y + 50);
    expect(clearing.alpha).toBeLessThan(before.alpha);
  });
});

describe("finale wiring (static)", () => {
  const lab = readFileSync(resolve(__dirname, "../components/BioStitchLabView.tsx"), "utf8");
  const css = readFileSync(resolve(__dirname, "../index.css"), "utf8");
  it("roars, booms at the explosion, and returns after the whole burst", () => {
    expect(lab).toMatch(/setTimeout\(\(\) => playExplosionSound\(\), BURST_EXPLODE_MS\)/);
    expect(lab).toMatch(/\}, INCUBATE_BURST_MS\);/);
    expect(lab).toMatch(/<SmokeBurst \/>/);
  });
  it("CSS animations last INCUBATE_BURST_MS and the lunge goes past full screen", () => {
    expect(css).toMatch(new RegExp(`animation: incubateExpand ${INCUBATE_BURST_MS / 1000}s`));
    const kf = /@keyframes incubateExpand\s*\{([\s\S]*?)\r?\n\}/.exec(css)?.[1] ?? "";
    const lunge = Math.round((BURST_EXPLODE_MS / INCUBATE_BURST_MS) * 100);
    expect(kf).toMatch(new RegExp(`${lunge}%\\s*\\{[^}]*scale\\(1\\.6`));
  });
});
