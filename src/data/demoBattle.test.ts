import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { DEMO_BATTLE, DEMO_BATTLES, DEMO_BATTLE_TITLE, DEMO_BATTLE_VIDEO_URL } from "./demoBattle";

describe("free demo battle", () => {
  it("ships a real video file under public/", () => {
    const file = resolve(__dirname, "..", "..", "public", DEMO_BATTLE_VIDEO_URL.slice(1));
    expect(existsSync(file)).toBe(true);
    expect(statSync(file).size).toBeGreaterThan(500_000);
  });
  it("lists the 16 s showcase first, then other battles whose videos all exist", () => {
    expect(DEMO_BATTLES.length).toBeGreaterThan(1);
    expect(DEMO_BATTLES[0].seconds).toBe(16);
    expect(DEMO_BATTLES[0].videoUrl).toBe(DEMO_BATTLE_VIDEO_URL);
    expect(new Set(DEMO_BATTLES.map((d) => d.record.id)).size).toBe(DEMO_BATTLES.length);
    for (const d of DEMO_BATTLES) {
      const file = resolve(__dirname, "..", "..", "public", d.videoUrl.slice(1));
      expect(existsSync(file), d.videoUrl).toBe(true);
      expect(d.title.ko).toMatch(/ vs /);
      expect(d.record.storyKo + d.record.storyEn).not.toMatch(/커스텀|\bCustom\b|Full-body shot/);
    }
  });
  it("the header dropdown lists every demo and the player uses the chosen one", () => {
    const lab = readFileSync(resolve(__dirname, "..", "components", "BioStitchLabView.tsx"), "utf8");
    expect(lab).toMatch(/DEMO_BATTLES\.map\(\(d, i\)/);
    expect(lab).toMatch(/onClick=\{\(\) => playDemoBattle\(i\)\}/);
    expect(lab).toMatch(/src=\{activeDemo\.videoUrl\}/);
  });
  it("is reachable from the arena header and plays full screen, then shows its story", () => {
    const lab = readFileSync(resolve(__dirname, "..", "components", "BioStitchLabView.tsx"), "utf8");
    expect(lab).toMatch(/setDemoBattlePhase\("playing"\)/);
    expect(lab).toMatch(/무료 데모 전투/);
    expect(lab).toMatch(/src=\{activeDemo\.videoUrl\}/);
    expect(lab).toMatch(/onEnded=\{\(\) => setDemoBattlePhase\("outcome"\)\}/);
  });
  it("has a title, a valid date and both stories without the 'custom' label", () => {
    expect(DEMO_BATTLE_TITLE.ko).toMatch(/ vs /);
    expect(Number.isFinite(DEMO_BATTLE.timestamp)).toBe(true);
    for (const s of [DEMO_BATTLE.storyKo, DEMO_BATTLE.storyEn]) {
      expect(s.length).toBeGreaterThan(50);
      expect(s).not.toMatch(/커스텀|\bCustom\b/);
    }
  });
});
