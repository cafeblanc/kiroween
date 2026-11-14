import { describe, it, expect } from "vitest";
import { SlidingWindowRateLimiter } from "./rateLimiter";

describe("SlidingWindowRateLimiter", () => {
  it("allows 10 requests per 60s then blocks, and recovers after the window", () => {
    const rl = new SlidingWindowRateLimiter(10, 60_000);
    for (let i = 0; i < 10; i++) expect(rl.check("c", 1000).allowed).toBe(true);
    const blocked = rl.check("c", 2000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBe(59_000);
    expect(rl.check("c", 61_001).allowed).toBe(true);
  });

  it("tracks clients independently", () => {
    const rl = new SlidingWindowRateLimiter(1, 60_000);
    expect(rl.check("a", 0).allowed).toBe(true);
    expect(rl.check("b", 0).allowed).toBe(true);
    expect(rl.check("a", 1).allowed).toBe(false);
  });
});
