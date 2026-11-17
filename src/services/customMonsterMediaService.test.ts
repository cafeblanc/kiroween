/**
 * Unit: custom monster English prompt composition, per-call seed variation, and the
 * LTX-first / MediaRecorder-fallback video path (network stubbed, no real API calls).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  MONSTER_STUDIO_PRESETS,
  buildImageSeed,
  composeEnglishMonsterPrompt,
  describeStatsForPrompt,
  generateVideoFromMonsterImage,
} from "./customMonsterMediaService";

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

  it("includes all five stats with their values", () => {
    expect(prompt).toContain("ATK 91");
    expect(prompt).toContain("DEF 55");
    expect(prompt).toContain("SPD 70");
    expect(prompt).toContain("REGEN 42");
    expect(prompt).toContain("ENERGY 88");
  });

  it("changes when stats change and stays English-only for the stat clause", () => {
    expect(describeStatsForPrompt({ ...stats, atk: 40 })).not.toBe(describeStatsForPrompt(stats));
    expect(composeEnglishMonsterPrompt("X", "a", stats)).not.toBe(composeEnglishMonsterPrompt("X", "a"));
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
  afterEach(() => vi.unstubAllGlobals());
  const base = {
    imageUrl: "data:image/png;base64,AAAA",
    description: "x",
    accentColor: "#fff",
    promptEn: MONSTER_STUDIO_PRESETS[0].nameEn,
  };

  it("uses the server proxy video and reports source=ltx", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(new Blob(["v"], { type: "video/mp4" }), {
      status: 200,
      headers: { "content-type": "video/mp4" },
    }));
    vi.stubGlobal("fetch", fetchMock);
    const out = await generateVideoFromMonsterImage(base);
    expect(out.source).toBe("ltx");
    expect(out.videoUrl.startsWith("blob:")).toBe(true);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/generate-video");
    // local-only options must not leak into the proxy body
    const body = JSON.parse((fetchMock.mock.calls[0][1]?.body as string) || "{}");
    expect(body).not.toHaveProperty("keepBlobUrl");
    expect(body).not.toHaveProperty("signal");
  });

  it("on proxy 413 with a user token, calls HuggingFace LTX-Video directly", async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url === "/api/generate-video"
        ? new Response(JSON.stringify({ error: "too large" }), { status: 413 })
        : new Response(new Blob(["v"], { type: "video/mp4" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const out = await generateVideoFromMonsterImage({ ...base, hfToken: "hf_test_token" });
    expect(out.source).toBe("ltx");
    expect(String(fetchMock.mock.calls[1][0])).toContain("Lightricks/LTX-Video");
  });

  it("falls back to MediaRecorder when LTX is unconfigured (no MediaRecorder here, so it rejects after trying LTX)", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ error: "no token" }), { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(generateVideoFromMonsterImage(base)).rejects.toThrow(/MediaRecorder/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
