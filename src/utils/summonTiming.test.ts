import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { SUMMON_ROAR_MAX_VOLUME, SUMMON_ROAR_MIN_VOLUME, summonRoarVolume } from "./summonTiming";

describe("summonRoarVolume (arena waiting screen: a quiet roar that grows louder)", () => {
  it("starts quiet and ends loud", () => {
    expect(summonRoarVolume(0)).toBe(SUMMON_ROAR_MIN_VOLUME);
    expect(summonRoarVolume(100)).toBe(SUMMON_ROAR_MAX_VOLUME);
    expect(summonRoarVolume(50)).toBeLessThan((SUMMON_ROAR_MIN_VOLUME + SUMMON_ROAR_MAX_VOLUME) / 2);
  });

  it("is clamped and safe for bad input", () => {
    expect(summonRoarVolume(-20)).toBe(SUMMON_ROAR_MIN_VOLUME);
    expect(summonRoarVolume(400)).toBe(SUMMON_ROAR_MAX_VOLUME);
    expect(summonRoarVolume(Number.NaN)).toBe(SUMMON_ROAR_MIN_VOLUME);
  });

  it("never gets quieter as progress grows and stays a valid audio volume", () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 100, noNaN: true }), fc.double({ min: 0, max: 100, noNaN: true }), (a, b) => {
        const [lo, hi] = a <= b ? [a, b] : [b, a];
        expect(summonRoarVolume(lo)).toBeLessThanOrEqual(summonRoarVolume(hi));
        expect(summonRoarVolume(hi)).toBeGreaterThanOrEqual(0);
        expect(summonRoarVolume(hi)).toBeLessThanOrEqual(1);
      }),
    );
  });
});
