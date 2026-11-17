import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  ARENA_FACE_OFF_DEG,
  EMBRYO_FRAMES,
  EMBRYO_STAGE_MS,
  EMBRYO_TOTAL_MS,
  ENTRANCE_PLAY_SECONDS,
  SUMMON_ROAR_MAX_VOLUME,
  SUMMON_ROAR_MIN_VOLUME,
  embryoSequence,
  faceOffAngleDeg,
  shouldFreezeEntrance,
  summonRoarVolume,
} from "./summonTiming";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("embryoSequence (photorealistic embryo development, then the finished adult)", () => {
  it("has six frames that exist in public/ and lasts as long as the 6 growth stages (15 s)", () => {
    expect(EMBRYO_FRAMES).toHaveLength(6);
    for (const f of EMBRYO_FRAMES) expect(existsSync(resolve(__dirname, "../../public" + f)), f).toBe(true);
    expect(EMBRYO_TOTAL_MS).toBe(6 * EMBRYO_STAGE_MS);
    expect(EMBRYO_TOTAL_MS).toBe(15000);
  });
  it("steps through the stages in order", () => {
    expect(embryoSequence(0, false)).toEqual({ stage: 0, action: "play" });
    expect(embryoSequence(EMBRYO_STAGE_MS - 1, false).stage).toBe(0);
    expect(embryoSequence(EMBRYO_STAGE_MS, false).stage).toBe(1);
    expect(embryoSequence(EMBRYO_TOTAL_MS - 1, false)).toEqual({ stage: 5, action: "play" });
  });
  it("an early image still waits for the whole embryo development", () => {
    expect(embryoSequence(1000, true).action).toBe("play");
    expect(embryoSequence(EMBRYO_TOTAL_MS - 1, true).action).toBe("play");
    expect(embryoSequence(EMBRYO_TOTAL_MS, true)).toEqual({ stage: 5, action: "handoff" });
  });
  it("a late image holds on the last embryo frame instead of showing anything else", () => {
    expect(embryoSequence(EMBRYO_TOTAL_MS, false)).toEqual({ stage: 5, action: "hold" });
    expect(embryoSequence(EMBRYO_TOTAL_MS * 10, false)).toEqual({ stage: 5, action: "hold" });
  });
  it("is safe for bad input and never hands off early, for any time", () => {
    expect(embryoSequence(Number.NaN, true)).toEqual({ stage: 0, action: "play" });
    expect(embryoSequence(-500, true)).toEqual({ stage: 0, action: "play" });
    fc.assert(
      fc.property(fc.double({ min: 0, max: 120000, noNaN: true }), fc.boolean(), (t, ready) => {
        const r = embryoSequence(t, ready);
        expect(r.stage).toBeGreaterThanOrEqual(0);
        expect(r.stage).toBeLessThan(EMBRYO_FRAMES.length);
        if (r.action === "handoff") expect(ready && t >= EMBRYO_TOTAL_MS).toBe(true);
      }),
    );
  });
});

describe("bioreactor overlay wiring", () => {
  const lab = readFileSync(resolve(__dirname, "../components/BioStitchLabView.tsx"), "utf8");
  const css = readFileSync(resolve(__dirname, "../index.css"), "utf8");
  it("uses the embryo frames, not the stock tank clip that showed its own creature", () => {
    const overlay = lab.slice(lab.indexOf("{incubating && ("), lab.indexOf("{revealMonster && ("));
    expect(overlay).toMatch(/EMBRYO_FRAMES\.map/);
    expect(overlay).not.toMatch(/chimera_growth_dragon_24s\.mp4/);
  });
  it("keeps the frames enlarged from the top-left so the generator watermark never shows", () => {
    const rule = /\.embryo-frame\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(rule).toMatch(/transform-origin:\s*0% 0%/);
    const scale = Number(/scale\(([\d.]+)\)/.exec(rule)?.[1]);
    expect(scale).toBeGreaterThanOrEqual(1.14);
  });
  it("the expansion ends with the finished adult filling the screen (scale 1, no fade-out)", () => {
    const kf = /@keyframes incubateExpand\s*\{([\s\S]*?)\r?\n\}/.exec(css)?.[1] ?? "";
    expect(kf).toMatch(/100%\s*\{[^}]*scale\(1\)[^}]*opacity:\s*1/);
    expect(lab).toMatch(/incubate-expand absolute inset-0 w-full h-full object-cover/);
  });
  it("the bubbling sound runs only while the embryo grows and is stopped on cleanup", () => {
    expect(lab).toMatch(/const stop = startBubbleSound\(\);\s*return stop;/);
    expect(lab).toMatch(/const isIncubationGrowing = incubatePhase === "growing";/);
  });
});
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