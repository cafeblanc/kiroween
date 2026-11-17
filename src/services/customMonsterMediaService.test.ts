/**
 * Unit: custom monster English prompt composition, per-call seed variation, and the
 * LTX-first / MediaRecorder-fallback video path (network stubbed, no real API calls).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import fc from "fast-check";
import * as videoGenService from "./videoGenService";
import {
  IMAGE_PROMPT_HEAD,
  IMAGE_SIZE_PX,
  MAX_IMAGE_DESIGN_CHARS,
  MONSTER_STUDIO_PRESETS,
  buildImageSeed,
  composeDescriptionFromParts,
  composeEnglishMonsterPrompt,
  describeStatsForPrompt,
  generateVideoFromMonsterImage,
  pollinationsImageUrl,
  statCuesForImage,
  stripPartLabels,
} from "./customMonsterMediaService";
import { COMIC_MONSTERS, HUMAN_PROMETHEUS_MONSTER } from "../data/comicMonsters";
import { REAL_STEM_CELL_PHOTOS } from "../data/stemCellPhotos";

const stats = { atk: 91, def: 55, spd: 70, regen: 42, energy: 88 };

describe("composeEnglishMonsterPrompt", () => {
  const parts = [
    "head: glowing reptile eyes",
    "horns crown electrode: obsidian twin horns",
    "torso: lava scale armor",
    "arms tentacles wings: bat wings",
    "legs: thick hind legs",
    "tail: spiked tail",
    "skin aura: ember particles",
  ];
  const prompt = composeEnglishMonsterPrompt("Pyroclastic Dragon", parts.join("\n"), stats);

  it("includes every translated body part and the preset name", () => {
    for (const p of parts) expect(prompt).toContain(p);
    expect(prompt).toContain("Pyroclastic Dragon");
  });

  it("carries the stats as visual cues but never the numbers (numbers get drawn as text)", () => {
    expect(prompt).toContain("razor-sharp apex claws and fangs");
    expect(prompt).not.toMatch(/ATK|DEF \d|SPD \d|\b91\b|\b88\b/);
    expect(statCuesForImage(stats)).toBe(describeStatsForPrompt(stats).replace(/\s*\(combat stats[^)]*\)$/, ""));
  });

  it("changes when stats change and stays English-only for the stat clause", () => {
    expect(describeStatsForPrompt({ ...stats, atk: 40 })).not.toBe(describeStatsForPrompt(stats));
    expect(composeEnglishMonsterPrompt("X", "a", stats)).not.toBe(composeEnglishMonsterPrompt("X", "a"));
  });

  it("asks for one full-body creature seen from the side, then design, cues and scene split by ';'", () => {
    const sections = prompt.split(";").map((s) => s.trim());
    expect(sections[0]).toBe(`${IMAGE_PROMPT_HEAD} Pyroclastic Dragon monster, its whole body visible from head to toe inside the frame, side three-quarter view facing right`);
    expect(sections[1].startsWith("head: glowing reptile eyes")).toBe(true);
    expect(sections).toHaveLength(4);
    expect(prompt.endsWith("no text, no letters")).toBe(true);
    expect(prompt).not.toMatch(/bioreactor chamber/);
  });

  it("drops the base-species line and the field labels (they put tentacles on dragons)", () => {
    const en = "[Base species: Flame Dragon]\n• Head: a horned head\n• Arms, Tentacles, Wings: bat wings\n• Tail/Rear: a spiked tail";
    const out = composeEnglishMonsterPrompt("Pyroclastic Dragon", en);
    expect(out).toContain("; a horned head, bat wings, a spiked tail;");
    expect(out).not.toMatch(/Tentacles|Base species|Head:/);
  });

  it("keeps the design part bounded and cut at a word", () => {
    fc.assert(
      fc.property(fc.array(fc.string({ maxLength: 120 }), { maxLength: 30 }), (lines) => {
        const out = composeEnglishMonsterPrompt("X", lines.join("\n"), stats);
        const design = out.split(";")[1].trim();
        expect(design.length).toBeLessThanOrEqual(MAX_IMAGE_DESIGN_CHARS);
        expect(out.split(";").length).toBe(4);
      }),
      { numRuns: 150 },
    );
  });
});

describe("stripPartLabels (Korean design text before translation)", () => {
  it("keeps only the design phrases", () => {
    const ko = composeDescriptionFromParts(MONSTER_STUDIO_PRESETS[0], MONSTER_STUDIO_PRESETS[0].defaultParts);
    const out = stripPartLabels(ko).split("\n");
    expect(out).toHaveLength(7);
    expect(out[0]).toBe(MONSTER_STUDIO_PRESETS[0].defaultParts.head);
    expect(stripPartLabels(ko)).not.toMatch(/베이스 종족|머리:|팔·촉수·날개/);
  });
  it("leaves free text without labels alone", () => {
    expect(stripPartLabels("a dragon: very big")).toBe("a dragon: very big");
  });
});

describe("Pollinations request", () => {
  it("uses the FLUX model, a square image and the seed", () => {
    const url = pollinationsImageUrl("a b", 42);
    expect(url).toContain("model=flux");
    expect(url).toContain(`width=${IMAGE_SIZE_PX}&height=${IMAGE_SIZE_PX}`);
    expect(url).toContain("seed=42");
    expect(url.startsWith("https://image.pollinations.ai/prompt/a%20b?")).toBe(true);
  });
});

describe("the six sample presets: name = description = image", () => {
  const root = resolve(__dirname, "../..");
  it("each preset has its own sample image file", () => {
    expect(MONSTER_STUDIO_PRESETS).toHaveLength(6);
    for (const p of MONSTER_STUDIO_PRESETS) {
      expect(p.baseImageSrc).toBe(`/images/samples/${p.id}.jpg`);
      expect(existsSync(resolve(root, "public", p.baseImageSrc.slice(1)))).toBe(true);
    }
  });
  it("no description uses words that drew the wrong subject (brain, organoid, nebula)", () => {
    for (const p of MONSTER_STUDIO_PRESETS) {
      expect(Object.values(p.defaultParts).join(" ")).not.toMatch(/뇌|오가노이드|성운|미토콘드리아/);
    }
  });
  it("tentacles only where the creature has them", () => {
    for (const p of MONSTER_STUDIO_PRESETS) {
      const text = Object.values(p.defaultParts).join(" ");
      if (!["myth_kraken", "alien_void_slug"].includes(p.id)) expect(text).not.toContain("촉수");
    }
  });
  it("the home sample data uses the same images", () => {
    for (const p of MONSTER_STUDIO_PRESETS) {
      const m = [...COMIC_MONSTERS, HUMAN_PROMETHEUS_MONSTER].find((c) => c.id === p.id);
      expect(m?.avatarImg).toBe(p.baseImageSrc);
      expect(REAL_STEM_CELL_PHOTOS.find((s) => s.targetMonsterId === p.id)?.imgSrc).toBe(p.baseImageSrc);
    }
  });
});

describe("buildImageSeed", () => {
  it("returns a different seed on every call, even for identical input and time", () => {
    const seeds = new Set(Array.from({ length: 50 }, () => buildImageSeed("same description", stats, 1234)));
    expect(seeds.size).toBe(50);
  });

  it("differs for different descriptions or stats", () => {
    expect(buildImageSeed("a", stats, 1)).not.toBe(buildImageSeed("b", stats, 1));
    expect(buildImageSeed("a", stats, 1)).not.toBe(buildImageSeed("a", { ...stats, atk: 10 }, 1));
  });
});

describe("generateVideoFromMonsterImage (LTX first)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  const base = {
    imageUrl: "data:image/png;base64,AAAA",
    description: "x",
    accentColor: "#fff",
    promptEn: MONSTER_STUDIO_PRESETS[0].nameEn,
  };

  it("uses the server proxy video and reports source=ltx", async () => {
    vi.spyOn(videoGenService, "generateMonsterVideo").mockResolvedValueOnce({
      success: true,
      videoUrl: "blob:http://localhost/video123",
      provider: "ltx",
    });
    const out = await generateVideoFromMonsterImage(base);
    expect(out.source).toBe("ltx");
    expect(out.videoUrl.startsWith("blob:")).toBe(true);
  });

  it("falls back to MediaRecorder when LTX fails (no MediaRecorder in test env, so it rejects after trying LTX)", async () => {
    vi.spyOn(videoGenService, "generateMonsterVideo").mockResolvedValueOnce({
      success: false,
      provider: "ltx",
      error: "NO_API_KEY",
    });
    await expect(generateVideoFromMonsterImage(base)).rejects.toThrow(/MediaRecorder/);
  });
});
