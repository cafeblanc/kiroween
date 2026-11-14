/**
 * Sliding-window rate limiter (no dependencies, usable in browser and Node).
 * Default policy per design.md Security (DoS): 10 requests per 60 seconds.
 */

export const RATE_LIMIT_MAX_REQUESTS = 10;
export const RATE_LIMIT_WINDOW_MS = 60_000;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Milliseconds until a slot frees up (0 when allowed). */
  retryAfterMs: number;
}

export class SlidingWindowRateLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private readonly maxRequests: number = RATE_LIMIT_MAX_REQUESTS,
    private readonly windowMs: number = RATE_LIMIT_WINDOW_MS,
  ) {}

  /** Records a request for `key` if under the limit. */
  check(key: string = "global", now: number = Date.now()): RateLimitResult {
    const cutoff = now - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((t) => t > cutoff);

    if (recent.length >= this.maxRequests) {
      this.hits.set(key, recent);
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: Math.max(0, recent[0] + this.windowMs - now),
      };
    }

    recent.push(now);
    this.hits.set(key, recent);
    this.prune(cutoff);
    return { allowed: true, remaining: this.maxRequests - recent.length, retryAfterMs: 0 };
  }

  reset(): void {
    this.hits.clear();
  }

  /** Drops keys with no hits inside the window so memory stays bounded. */
  private prune(cutoff: number): void {
    if (this.hits.size < 1000) return;
    for (const [k, v] of this.hits) {
      if (v.length === 0 || v[v.length - 1] <= cutoff) this.hits.delete(k);
    }
  }
}
