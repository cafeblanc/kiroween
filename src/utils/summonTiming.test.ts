import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  ARENA_FACE_OFF_DEG,
  ENTRANCE_PLAY_SECONDS,
  SUMMON_ROAR_MAX_VOLUME,
  SUMMON_ROAR_MIN_VOLUME,
  faceOffAngleDeg,
  shouldFreezeEntrance,
  summonRoarVolume,
} from "./summonTiming";

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
describe("entrance video freeze", () => {
  it("plays the first ENTRANCE_PLAY_SECONDS (3 s) and then freezes", () => {
    expect(ENTRANCE_PLAY_SECONDS).toBe(3);
    expect(shouldFreezeEntrance(0)).toBe(false);
    expect(shouldFreezeEntrance(2.99)).toBe(false);
    expect(shouldFreezeEntrance(3)).toBe(true);
    expect(shouldFreezeEntrance(5.5)).toBe(true);
  });
  it("keeps playing for non-finite times (blob clips can report Infinity/NaN)", () => {
    expect(shouldFreezeEntrance(Number.NaN)).toBe(false);
    expect(shouldFreezeEntrance(Number.POSITIVE_INFINITY)).toBe(false);
  });
});
describe("face-off pose", () => {
  it("stays flat until both halves are filled, then turns toward each other, mirrored", () => {
    expect(faceOffAngleDeg("left", false)).toBe(0);
    expect(faceOffAngleDeg("right", false)).toBe(0);
    expect(faceOffAngleDeg("left", true)).toBe(ARENA_FACE_OFF_DEG);
    expect(faceOffAngleDeg("right", true)).toBe(-ARENA_FACE_OFF_DEG);
  });
  it("stays visible: well below 90 degrees (edge-on)", () => {
    expect(ARENA_FACE_OFF_DEG).toBeGreaterThanOrEqual(35);
    expect(ARENA_FACE_OFF_DEG).toBeLessThanOrEqual(45);
  });
});
import { INCUBATE_HOLD_MS, INCUBATE_MATERIALISE_MS, MONSTER_REVEAL_MS, incubationPhase } from "./summonTiming";
describe("incubationPhase (bioreactor -> image hand-off)", () => {
  it("is growing until the image is ready", () => {
    expect(incubationPhase(null)).toBe("growing");
    expect(incubationPhase(undefined)).toBe("growing");
    expect(incubationPhase(-5)).toBe("growing");
    expect(incubationPhase(Number.NaN)).toBe("growing");
  });
  it("walks materialising -> reveal -> done at the constant boundaries", () => {
    expect(incubationPhase(0)).toBe("materialising");
    expect(incubationPhase(INCUBATE_MATERIALISE_MS - 1)).toBe("materialising");
    expect(incubationPhase(INCUBATE_MATERIALISE_MS)).toBe("reveal");
    expect(incubationPhase(INCUBATE_MATERIALISE_MS + MONSTER_REVEAL_MS - 1)).toBe("reveal");
    expect(incubationPhase(INCUBATE_MATERIALISE_MS + MONSTER_REVEAL_MS)).toBe("done");
  });
  it("keeps the materialise step short (about 1.2-1.5 s) with a hold shorter than the step", () => {
    expect(INCUBATE_MATERIALISE_MS).toBeGreaterThanOrEqual(1200);
    expect(INCUBATE_MATERIALISE_MS).toBeLessThanOrEqual(1500);
    expect(INCUBATE_HOLD_MS).toBeLessThan(INCUBATE_MATERIALISE_MS);
  });
  it("never goes backwards as time passes", () => {
    const order = { growing: 0, materialising: 1, reveal: 2, done: 3 } as const;
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10000 }), fc.integer({ min: 0, max: 10000 }), (a, b) => {
        const [lo, hi] = a <= b ? [a, b] : [b, a];
        expect(order[incubationPhase(lo)]).toBeLessThanOrEqual(order[incubationPhase(hi)]);
      }),
    );
  });
});