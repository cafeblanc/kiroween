import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { bubbleParams, startBubbleSound } from "./bubbleSound";

describe("bubbleParams (bioreactor bubbling sound)", () => {
  it("makes short upward-sweeping bubbles at a lively pace, for any random input", () => {
    fc.assert(
      fc.property(fc.array(fc.double({ min: 0, max: 1, noNaN: true }), { minLength: 8, maxLength: 8 }), (vals) => {
        let i = 0;
        const p = bubbleParams(() => vals[i++ % vals.length]);
        expect(p.freq).toBeGreaterThan(80);
        expect(p.freq).toBeLessThan(800);
        expect(p.endFreq).toBeGreaterThan(p.freq);
        expect(p.duration).toBeGreaterThan(0.03);
        expect(p.duration).toBeLessThan(0.25);
        expect(p.gain).toBeGreaterThan(0);
        expect(p.gain).toBeLessThanOrEqual(1);
        expect(p.nextInMs).toBeGreaterThanOrEqual(35);
        expect(p.nextInMs).toBeLessThanOrEqual(300);
      }),
    );
  });

  it("is a safe no-op without WebAudio (test environment)", () => {
    const stop = startBubbleSound();
    expect(() => {
      stop();
      stop();
    }).not.toThrow();
  });
});
