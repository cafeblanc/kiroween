import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { designRoomButtonState } from "./designRoomState";

describe("designRoomButtonState (image first, then the arena)", () => {
  it("before an image exists only the bioreactor is enabled", () => {
    expect(designRoomButtonState({ hasImage: false, isBusy: false })).toEqual({ incubateEnabled: true, deployEnabled: false });
  });
  it("after an image exists only the arena launch is enabled", () => {
    expect(designRoomButtonState({ hasImage: true, isBusy: false })).toEqual({ incubateEnabled: false, deployEnabled: true });
  });
  it("both are disabled while a job is running", () => {
    expect(designRoomButtonState({ hasImage: false, isBusy: true })).toEqual({ incubateEnabled: false, deployEnabled: false });
    expect(designRoomButtonState({ hasImage: true, isBusy: true })).toEqual({ incubateEnabled: false, deployEnabled: false });
  });
  it("after a monster was sent to the arena, the Design Room starts over at ⚡ (the studio clears its image and video)", () => {
    const src = readFileSync(resolve(__dirname, "../components/bioreactor/CustomMonsterStudio.tsx"), "utf8");
    const afterDeploy = src.slice(src.indexOf("onSendToArena?.(monster, video.ltxError);"));
    const block = afterDeploy.slice(0, afterDeploy.indexOf("};"));
    expect(block).toMatch(/buildIdRef\.current = null;/);
    expect(block).toMatch(/setGeneratedImageUrl\(null\);/);
    expect(block).toMatch(/setGeneratedVideoUrl\(null\);/);
    // No image any more -> only the bioreactor is enabled, the arena launch is disabled.
    expect(designRoomButtonState({ hasImage: false, isBusy: false })).toEqual({ incubateEnabled: true, deployEnabled: false });
  });
  it("never enables both buttons at once", () => {
    for (const hasImage of [true, false]) for (const isBusy of [true, false]) {
      const s = designRoomButtonState({ hasImage, isBusy });
      expect(s.incubateEnabled && s.deployEnabled).toBe(false);
    }
  });
});