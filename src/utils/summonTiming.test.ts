import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  ARENA_FACE_OFF_DEG,
  ENTRANCE_PLAY_SECONDS,
  SUMMON_ROAR_MAX_VOLUME,
  SUMMON_ROAR_MIN_VOLUME,
  TANK_CAPTION_CROP_SCALE,
  TANK_EMBRYO_END_FRACTION,
  TANK_GROWTH_STAGE_START_FRACTION,
  TANK_HANDOFF_FRACTION,
  TANK_HOLD_LOOP_START_FRACTION,
  faceOffAngleDeg,
  shouldFreezeEntrance,
  summonRoarVolume,
  tankClipAction,
} from "./summonTiming";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ADULT_SEGMENT_START } from "./customMonsterFlow";
import { GROWTH_STAGES } from "../components/bioreactor/growthStages";

describe("tankClipAction (bioreactor hand-off waits for the embryo growth, never plays the stock creature)", () => {
  const D = 24;
  it("orders the points: hold loop < embryo end < hand-off < the GROWTH stage where species features appear", () => {
    expect(TANK_HOLD_LOOP_START_FRACTION).toBeLessThan(TANK_EMBRYO_END_FRACTION);
    expect(TANK_EMBRYO_END_FRACTION).toBeLessThanOrEqual(TANK_HANDOFF_FRACTION);
    expect(TANK_HANDOFF_FRACTION).toBeLessThan(TANK_GROWTH_STAGE_START_FRACTION);
    expect(TANK_GROWTH_STAGE_START_FRACTION).toBeLessThan(ADULT_SEGMENT_START);
    // The hold loop stays inside the EMBRYO stage (33-50%): the loop never shows a recognisable creature either.
    expect(TANK_HOLD_LOOP_START_FRACTION).toBeGreaterThanOrEqual(2 / 6);
  });
  it("matches the clip's 6 equal growth stages: GROWTH (feature-protrusion) starts at stage 4", () => {
    const growth = GROWTH_STAGES.find((s) => s.label === "GROWTH");
    expect(growth?.stage).toBe(4);
    expect(TANK_GROWTH_STAGE_START_FRACTION).toBeCloseTo((growth!.stage - 1) / GROWTH_STAGES.length);
  });
  it("crops the clip's burned-in caption bands off screen", () => {
    const labSrc = readFileSync(resolve(__dirname, "../components/BioStitchLabView.tsx"), "utf8");
    expect(TANK_CAPTION_CROP_SCALE).toBeGreaterThanOrEqual(1.4);
    expect(labSrc).toMatch(/transform: `scale\(\$\{TANK_CAPTION_CROP_SCALE\}\)`/);
  });
  it("an early image still waits until the embryo growth is over", () => {
    expect(tankClipAction(2, D, true)).toBe("play");
    expect(tankClipAction(D * TANK_EMBRYO_END_FRACTION, D, true)).toBe("play");
    expect(tankClipAction(D * TANK_HANDOFF_FRACTION, D, true)).toBe("handoff");
  });
  it("a late image loops the clip back instead of playing past the hand-off point", () => {
    expect(tankClipAction(D * TANK_HANDOFF_FRACTION, D, false)).toBe("loop-back");
    expect(tankClipAction(D - 0.1, D, false)).toBe("loop-back");
  });
  it("keeps playing while the clip is still loading", () => {
    expect(tankClipAction(0, Number.NaN, true)).toBe("play");
    expect(tankClipAction(0, 0, true)).toBe("play");
    expect(tankClipAction(Number.NaN, D, true)).toBe("play");
  });
  it("never hands off before the embryo growth ends, for any time and duration", () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 600, noNaN: true }), fc.double({ min: 1, max: 600, noNaN: true }), fc.boolean(), (t, d, ready) => {
        const a = tankClipAction(t, d, ready);
        if (t < d * TANK_EMBRYO_END_FRACTION) expect(a).toBe("play");
        if (a === "handoff") expect(ready).toBe(true);
      }),
    );
  });
});

describe("bioreactor overlay wiring", () => {
  const lab = readFileSync(resolve(__dirname, "../components/BioStitchLabView.tsx"), "utf8");
  const css = readFileSync(resolve(__dirname, "../index.css"), "utf8");
  it("the tank clip does not loop by itself and is paused at the hand-off", () => {
    const tank = lab.slice(lab.indexOf('src="/videos/chimera_growth_dragon_24s.mp4"') - 120, lab.indexOf('src="/videos/chimera_growth_dragon_24s.mp4"') + 260);
    // The JSX boolean attribute `loop` on its own line (comments may mention the word).
    expect(tank).not.toMatch(/^\s*loop\s*$/m);
    expect(tank).toMatch(/onTimeUpdate=\{\(e\) => onTankTimeUpdate\(e\.currentTarget\)\}/);
    expect(lab).toMatch(/v\.pause\(\);/);
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