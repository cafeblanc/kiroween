/**
 * Unit: story-driven battle video prompt and request (fetch mocked, no real LTX calls).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import fc from "fast-check";
import {
  BATTLE_VIDEO_SECONDS,
  FIRST_FRAME_CROP_BOTTOM,
  MAX_BATTLE_PROMPT_CHARS,
  colorWord,
  composeBattleVideoPrompt,
  containRect,
  coverSourceRect,
  designFromImagePrompt,
  generateBattleVideo,
} from "./battleVideoService";
import * as videoGenService from "./videoGenService";

const fire = { id: "custom_a", nameEn: "Flame Dragon Custom", promptEn: "a crimson dragon with magma scales and ember wings", colorHex: "#ef4444" };
const xeno = { id: "custom_b", nameEn: "12. Xenomorph Bio-Titan", promptEn: "an obsidian xenomorph titan with acid blood", colorHex: "#84cc16" };
const story = {
  act2_clash: "First strike: Flame Dragon Custom slashes its claws across the titan's torso.",
  act3_finish: "Flame Dragon Custom coils its tail around the titan and slams it down. K.O.!",
};

afterEach(() => vi.restoreAllMocks());

describe("composeBattleVideoPrompt", () => {
  const p = composeBattleVideoPrompt(fire, xeno, story);

  it("makes every body part fight, with the mouth flame cannon, tail attacks and lasers", () => {
    for (const word of ["head", "jaws", "clawed arms", "legs", "tail", "torso", "flame cannons from their mouths", "laser beams"]) {
      expect(p).toContain(word);
    }
    expect(p).toMatch(/whips its spiked tail/);
  });

  it("is one continuous take with no cuts (cuts let the model re-draw both fighters as the same creature)", () => {
    expect(p).not.toContain("\n");
    expect(p).toContain("One continuous cinematic take, no cuts");
    expect(p).not.toMatch(/\bcuts to\b|hard cut|match cut|dissolve/i);
  });

  it("locks each fighter's identity: different colours, never merge or swap", () => {
    expect(p).toContain("Two completely different creatures");
    expect(p).toContain("they never merge, swap places or turn into each other");
    expect(p).toContain("the crimson red left creature");
    expect(p).toContain("the toxic green right creature");
  });

  it("puts both fighters, the edited exchange and the finish in the prompt", () => {
    expect(p).toContain("On the left: Flame Dragon Custom, a crimson red creature: a crimson dragon");
    expect(p).toContain("On the right: Xenomorph Bio-Titan, a toxic green creature");
    expect(p).not.toContain("12.");
    expect(p).toContain("slashes its claws across the titan's torso");
    expect(p).toContain("slams it down");
  });

  it("asks for no on-screen text", () => {
    expect(p.endsWith("no text, no subtitles, no logos.")).toBe(true);
  });

  it("stays ASCII and bounded, and never loses the closing sentence", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 900 }), fc.string({ maxLength: 900 }), fc.string({ maxLength: 900 }), (a, b, c) => {
        const out = composeBattleVideoPrompt({ ...fire, promptEn: a }, { ...xeno, nameEn: `불꽃 ${b}` }, { act2_clash: c, act3_finish: c });
        expect(out.length).toBeLessThanOrEqual(MAX_BATTLE_PROMPT_CHARS);
        expect(/^[\x20-\x7E]*$/.test(out)).toBe(true);
        expect(out.endsWith("no logos.")).toBe(true);
      }),
      { numRuns: 200 },
    );
  });
});

describe("fighter descriptions stay distinct", () => {
  const boiler = (body: string) =>
    `Photorealistic bio-engineered Pyroclastic Dragon monster inside a dark sci-fi laboratory bioreactor chamber, ${body}, ferocious battle-scarred predator, ATK 98, DEF 99, SPD 90, REGEN 99, ENERGY 88, cinematic studio lighting, ultra detailed creature anatomy, no text\n[Combat Stats: ATK 98]`;

  it("drops the studio boilerplate and keeps only the design", () => {
    expect(designFromImagePrompt(boiler("a horned dragon head with golden eyes"))).toBe("a horned dragon head with golden eyes");
    expect(designFromImagePrompt(undefined)).toBe("");
    expect(designFromImagePrompt("a plain design")).toBe("a plain design");
  });

  it("gives two monsters from the same preset different descriptions when their designs differ", () => {
    const a = composeBattleVideoPrompt(
      { id: "custom_1", nameEn: "Dragon A", promptEn: boiler("obsidian scales and ember wings"), colorHex: "#ef4444" },
      { id: "custom_2", nameEn: "Leviathan B", promptEn: boiler("a blue void demon with glowing eyes"), colorHex: "#3b82f6" },
      story,
    );
    expect(a).toContain("On the left: Dragon A, a crimson red creature: obsidian scales and ember wings.");
    expect(a).toContain("On the right: Leviathan B, a deep blue creature: a blue void demon with glowing eyes.");
    expect(a).not.toContain("laboratory bioreactor chamber");
  });

  it("names colours from the theme hex", () => {
    expect(colorWord("#ef4444")).toBe("crimson red");
    expect(colorWord("#10b981")).toBe("toxic green");
    expect(colorWord("#3b82f6")).toBe("deep blue");
    expect(colorWord("#a855f7")).toBe("violet purple");
    expect(colorWord("#64748b")).toBe("grey");
    expect(colorWord("nope")).toBe("");
  });
});

describe("coverSourceRect (first frame: each monster fills its half, watermark strip cropped)", () => {
  it("crops the sides of a wide image and the bottom strip", () => {
    const s = coverSourceRect(1000, 1000, 640, 720, FIRST_FRAME_CROP_BOTTOM);
    expect(s.sh).toBeCloseTo(900);
    expect(s.sw).toBeCloseTo(800);
    expect(s.sx).toBeCloseTo(100);
    expect(s.sy).toBe(0);
  });

  it("always stays inside the image and above the cropped strip, with the box's aspect", () => {
    fc.assert(
      fc.property(fc.integer({ min: 50, max: 4000 }), fc.integer({ min: 50, max: 4000 }), fc.integer({ min: 50, max: 2000 }), fc.integer({ min: 50, max: 2000 }), (iw, ih, bw, bh) => {
        const s = coverSourceRect(iw, ih, bw, bh, FIRST_FRAME_CROP_BOTTOM);
        expect(s.sx).toBeGreaterThanOrEqual(-1e-6);
        expect(s.sy).toBeGreaterThanOrEqual(-1e-6);
        expect(s.sx + s.sw).toBeLessThanOrEqual(iw + 1e-6);
        expect(s.sy + s.sh).toBeLessThanOrEqual(ih * (1 - FIRST_FRAME_CROP_BOTTOM) + 1e-6);
        expect(s.sw / s.sh).toBeCloseTo(bw / bh, 3);
      }),
    );
  });
});

describe("containRect", () => {
  it("fits inside the box and keeps the aspect ratio", () => {
    expect(containRect(1000, 500, 0, 0, 600, 600)).toEqual({ x: 0, y: 150, w: 600, h: 300 });
    expect(containRect(500, 1000, 640, 0, 600, 600)).toEqual({ x: 790, y: 0, w: 300, h: 600 });
  });
});

describe("generateBattleVideo", () => {
  it("requests a 12 s 16:9 LTX clip and keeps the blob URL for the caller", async () => {
    const spy = vi.spyOn(videoGenService, "generateMonsterVideo").mockResolvedValue({ success: true, videoUrl: "blob:x", provider: "ltx" });
    const out = await generateBattleVideo({ f1: fire, f2: xeno, storyEn: story });
    expect(BATTLE_VIDEO_SECONDS).toBe(12);
    expect(out).toEqual({ success: true, videoUrl: "blob:x", mode: "text" });
    const req = spy.mock.calls[0][0];
    expect(req).toMatchObject({ provider: "ltx", aspect: "16:9", duration: 12, keepBlobUrl: true });
    expect(req.image).toBeUndefined(); // no avatar images -> text-to-video
  });

  it("reports the LTX error", async () => {
    vi.spyOn(videoGenService, "generateMonsterVideo").mockResolvedValue({ success: false, provider: "ltx", error: "LTX account has insufficient credits." });
    expect(await generateBattleVideo({ f1: fire, f2: xeno, storyEn: story })).toEqual({ success: false, error: "LTX account has insufficient credits." });
  });
});
