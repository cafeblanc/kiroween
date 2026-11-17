/**
 * Unit: story-driven battle video prompt and request (fetch mocked, no real LTX calls).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import fc from "fast-check";
import {
  BATTLE_VIDEO_SECONDS,
  MAX_BATTLE_PROMPT_CHARS,
  composeBattleVideoPrompt,
  containRect,
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

  it("follows the LTX multi-shot form: one paragraph with named cuts", () => {
    expect(p).not.toContain("\n");
    expect(p).toContain("The view cuts to");
    expect(p).toContain("A hard cut");
  });

  it("puts both fighters, the edited exchange and the finish in the prompt", () => {
    expect(p).toContain("On the left stands Flame Dragon Custom, a crimson dragon");
    expect(p).toContain("On the right stands Xenomorph Bio-Titan");
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
