/**
 * Unit: story-driven battle video prompt and request (fetch mocked, no real LTX calls).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import fc from "fast-check";
import {
  BATTLE_VIDEO_SECONDS,
  BATTLE_VIDEO_COST_USD,
  FIRST_FRAME_CROP_BOTTOM,
  MAX_BATTLE_PROMPT_CHARS,
  colorWord,
  composeBattleVideoPrompt,
  containRect,
  coverSourceRect,
  designFromImagePrompt,
  generateBattleVideo,
  MIRROR_RIGHT_FIGHTER,
  BATTLE_PLAYBACK_RATE,
  FIRST_FRAME_CONTACT_OVERLAP,
  FIRST_FRAME_MASK_RADIUS,
  FIRST_FRAME_MASK_SOLID,
  battleFrameLayout,
  dimBackdropPixel,
  wholeBodyRect,
} from "./battleVideoService";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { composeEnglishMonsterPrompt } from "./customMonsterMediaService";
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

  it("makes every body part fight, with the mouth flame cannon, tail attacks and spinning kicks", () => {
    for (const word of ["head", "jaws", "claws", "legs", "tail", "chest", "roundhouse kick", "back kick", "flame cannons from their mouths"]) {
      expect(p).toContain(word);
    }
    expect(p).toMatch(/whips its massive spiked tail/);
  });

  it("varies the attacks beat by beat: claws, tail, spinning roundhouse, spinning back kick, head ram, mouth fire", () => {
    const order = [
      "rakes its claws across the face of",
      "whips its massive spiked tail into the head",
      "spins a full turn and slams a powerful spinning roundhouse kick into the head of the toxic green right beast",
      "answers with a jumping spinning back kick to the chest of the crimson red left beast",
      "rams its head into the torso of the toxic green right beast and bites deep into its neck",
      "unleash huge roaring flame cannons from their mouths",
    ].map((s) => p.indexOf(s));
    expect(order.every((i) => i > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(p).toContain("each beat a different body part");
  });

  it("makes the spinning kicks the heaviest blows, with a fallback for legless creatures", () => {
    expect(p).toContain("these spinning kicks are the heaviest blows, legs in full view");
    expect(p).toContain("legless creatures spin and strike with tail or tentacles");
  });

  it("makes the flame cannon the biggest moment: a long, thick torrent that engulfs and explodes", () => {
    expect(p).toContain("the biggest moment: both open their jaws wide");
    expect(p).toContain("thick torrents of molten magma blasts and corrosive acid sprays");
    expect(p).toContain("held for two full seconds, engulfing each other");
    expect(p).toContain("the torrents collide in a giant fireball that hurls both back");
  });

  it("starts in close combat and stays in contact (no separate dancing, then one clash)", () => {
    expect(p).toContain("locked in close combat at the centre from the first second");
    expect(p).toContain("they stay in contact trading blows nonstop");
    expect(p.indexOf("At once")).toBeLessThan(p.indexOf("whips its massive spiked tail"));
  });

  it("keeps the tails the same size all clip long and asks for full speed", () => {
    expect(p).toContain("long massive tail all clip long");
    expect(p).toContain("Full speed, no slow motion");
    expect(BATTLE_PLAYBACK_RATE).toBeGreaterThan(1);
    expect(BATTLE_PLAYBACK_RATE).toBeLessThanOrEqual(1.3);
  });

  it("aims every attack at the opponent, never at the camera (fighting, not dancing)", () => {
    expect(p).toContain("a wide side view of a dark sci-fi arena");
    expect(p).toContain("Left, facing right:");
    expect(p).toContain("Right, facing left:");
    expect(p).toContain("They never face or attack the camera");
    expect(p).toContain("every hit travels sideways into the other's body");
    // who -> direction -> body part hit -> reaction
    expect(p).toContain("rakes its claws across the face of the toxic green right beast");
    expect(p).toContain("whips its massive spiked tail into the head of the crimson red left beast");
    expect(p).toContain("engulfing each other");
    expect(p).toContain("every hit shoves its target back.");
    // The edited story still fits in full with normal-length input
    expect(p).toContain("slashes its claws across the titan's torso");
    expect(p.length).toBeLessThanOrEqual(MAX_BATTLE_PROMPT_CHARS);
  });

  it("keeps the direction sentences even with the longest names, designs and story", () => {
    const long = "x".repeat(900);
    const out = composeBattleVideoPrompt(
      { ...fire, nameEn: long, promptEn: long },
      { ...xeno, nameEn: long, promptEn: long },
      { act2_clash: long, act3_finish: long },
    );
    expect(out.length).toBeLessThanOrEqual(MAX_BATTLE_PROMPT_CHARS);
    expect(out).toContain("They never face or attack the camera");
    expect(out).toContain("every hit shoves its target back.");
    expect(out).toContain("whips its massive spiked tail");
    expect(out.endsWith("no text, no subtitles, no logos.")).toBe(true);
  });

  it("is one continuous take with no cuts (cuts let the model re-draw both fighters as the same creature)", () => {
    expect(p).not.toContain("\n");
    expect(p).toContain("One continuous take, no cuts");
    expect(p).not.toMatch(/\bcuts to\b|hard cut|match cut|dissolve/i);
  });

  it("locks each fighter's identity: different colours, never merge or swap", () => {
    expect(p).toContain("Two completely different creatures");
    expect(p).toContain("they never merge or swap");
    expect(p).toContain("the crimson red left beast");
    expect(p).toContain("the toxic green right beast");
  });

  it("puts both fighters, the edited exchange and the finish in the prompt", () => {
    expect(p).toContain("Left, facing right: Flame Dragon Custom, a crimson red creature: a crimson dragon");
    expect(p).toContain("Right, facing left: Xenomorph Bio-Titan, a toxic green creature");
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
    expect(a).toContain("Left, facing right: Dragon A, a crimson red creature: obsidian scales and ember wings.");
    expect(a).toContain("Right, facing left: Leviathan B, a deep blue creature: a blue void demon with glowing eyes.");
    expect(a).not.toContain("laboratory bioreactor chamber");
  });

  it("reads only the design from the current image prompt format", () => {
    const img = composeEnglishMonsterPrompt("Pyroclastic Dragon", "a horned black dragon, bat wings", { atk: 90, def: 90, spd: 90, regen: 90, energy: 90 });
    expect(designFromImagePrompt(img)).toBe("a horned black dragon, bat wings");
    expect(designFromImagePrompt(`${img}\n[Combat Stats: ATK 90]`)).toBe("a horned black dragon, bat wings");
  });

  it("mirrors the right fighter so the two face each other", () => {
    expect(MIRROR_RIGHT_FIGHTER).toBe(true);
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

describe("first frame: one shared arena, fighters already in contact, no divider", () => {
  it("the two boxes overlap in the centre and together cover the whole width", () => {
    const { left, right } = battleFrameLayout(1280, 720);
    expect(left.x).toBe(0);
    expect(right.x + right.w).toBe(1280);
    const overlap = left.x + left.w - right.x;
    expect(overlap).toBeCloseTo(1280 * FIRST_FRAME_CONTACT_OVERLAP, -1);
    // The whole bodies drawn inside the boxes reach into each other's side
    const a = wholeBodyRect(1024, 963, left.w, left.h);
    const b = wholeBodyRect(1024, 963, right.w, right.h);
    expect(left.x + a.x + a.w).toBeGreaterThan(right.x + (right.w - (b.x + b.w)));
  });

  it("draws one background and soft oval edges, never a seam band or per-half clipping", () => {
    const src = readFileSync(resolve(__dirname, "battleVideoService.ts"), "utf8");
    const fn = src.slice(src.indexOf("export async function composeBattleFirstFrame"), src.indexOf("export interface BattleVideoResult"));
    expect(fn).toContain('globalCompositeOperation = "destination-in"');
    expect(fn).not.toMatch(/seam|SEAM/);
    expect(fn).not.toContain("ctx.clip()");
    expect(fn).not.toContain("blur(18px)");
    // Every image edge midpoint (normalised distance 0.5 / radius) is at or outside the oval: fully transparent, so
    // no rectangle and no horizontal line shows
    expect(0.5 / FIRST_FRAME_MASK_RADIUS).toBeGreaterThanOrEqual(1);
    expect(FIRST_FRAME_MASK_SOLID).toBeLessThan(1);
  });

  it("sinks white/grey studio backdrops into the dark arena but keeps coloured parts", () => {
    const [r, g, b] = dimBackdropPixel(255, 255, 255);
    expect(Math.max(r, g, b)).toBeLessThanOrEqual(60);
    expect(dimBackdropPixel(240, 120, 20)).toEqual([240, 120, 20]); // fire orange
    expect(dimBackdropPixel(40, 200, 90)).toEqual([40, 200, 90]); // green glow
    expect(dimBackdropPixel(30, 30, 30)).toEqual([30, 30, 30]); // dark parts
  });
});

describe("wholeBodyRect (first frame shows the whole body, tail included)", () => {
  it("fits a square image entirely inside a tall half with a margin, standing low", () => {
    const r = wholeBodyRect(1024, 963, 640, 720);
    expect(r.x).toBeGreaterThanOrEqual(0);
    expect(r.x + r.w).toBeLessThanOrEqual(640);
    expect(r.y).toBeGreaterThanOrEqual(0);
    expect(r.y + r.h).toBeLessThanOrEqual(720);
    expect(r.w / r.h).toBeCloseTo(1024 / 963, 1);
    expect(r.y).toBeGreaterThan((720 - r.h) / 2); // lower than centred
  });
  it("never leaves the half for any image or box size", () => {
    fc.assert(
      fc.property(fc.integer({ min: 50, max: 4000 }), fc.integer({ min: 50, max: 4000 }), fc.integer({ min: 100, max: 2000 }), fc.integer({ min: 100, max: 2000 }), (iw, ih, bw, bh) => {
        const r = wholeBodyRect(iw, ih, bw, bh);
        expect(r.x).toBeGreaterThanOrEqual(0);
        expect(r.y).toBeGreaterThanOrEqual(0);
        expect(r.x + r.w).toBeLessThanOrEqual(bw + 1);
        expect(r.y + r.h).toBeLessThanOrEqual(bh + 1);
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
  it("requests a 16 s 16:9 LTX clip (about $2.08) and keeps the blob URL for the caller", async () => {
    const spy = vi.spyOn(videoGenService, "generateMonsterVideo").mockResolvedValue({ success: true, videoUrl: "blob:x", provider: "ltx" });
    const out = await generateBattleVideo({ f1: fire, f2: xeno, storyEn: story });
    expect(BATTLE_VIDEO_SECONDS).toBe(16);
    expect(BATTLE_VIDEO_COST_USD).toBe(2.08);
    expect(out).toEqual({ success: true, videoUrl: "blob:x", mode: "text" });
    const req = spy.mock.calls[0][0];
    expect(req).toMatchObject({ provider: "ltx", aspect: "16:9", duration: 16, keepBlobUrl: true });
    expect(req.image).toBeUndefined(); // no avatar images -> text-to-video
  });

  it("reports the LTX error", async () => {
    vi.spyOn(videoGenService, "generateMonsterVideo").mockResolvedValue({ success: false, provider: "ltx", error: "LTX account has insufficient credits." });
    expect(await generateBattleVideo({ f1: fire, f2: xeno, storyEn: story })).toEqual({ success: false, error: "LTX account has insufficient credits." });
  });
});
