import { describe, it, expect } from "vitest";
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { DEMO_BATTLE, DEMO_BATTLE_TITLE, DEMO_BATTLE_VIDEO_URL } from "./demoBattle";

describe("free demo battle", () => {
  it("ships a real video file under public/", () => {
    const file = resolve(__dirname, "..", "..", "public", DEMO_BATTLE_VIDEO_URL.slice(1));
    expect(existsSync(file)).toBe(true);
    expect(statSync(file).size).toBeGreaterThan(500_000);
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
