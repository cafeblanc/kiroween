import { assertAllowedApiEndpoint, sanitizeVideoUrl } from "../utils/security";

/** Poll interval must stay >= 5 s (server poll limiter + Luma API courtesy). */
export const LUMA_POLL_INTERVAL_MS = 5_000;
/** Bounded total wait for a Luma job. */
export const LUMA_POLL_TIMEOUT_MS = 180_000;

export type LumaJobOutcome =
  | { ok: true; videoUrl: string }
  | { ok: false; error: "LUMA_FAILED" | "LUMA_TIMEOUT" | "LUMA_BAD_URL" | "LUMA_HTTP_ERROR" };

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Polls GET /api/generate-video?provider=luma&id=... until the job completes,
 * fails, or the total timeout elapses.
 */
export async function pollLumaJob(
  jobId: string,
  apiKey?: string,
  opts: { intervalMs?: number; timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<LumaJobOutcome> {
  const interval = Math.max(opts.intervalMs ?? LUMA_POLL_INTERVAL_MS, LUMA_POLL_INTERVAL_MS);
  const deadline = Date.now() + (opts.timeoutMs ?? LUMA_POLL_TIMEOUT_MS);
  const url = assertAllowedApiEndpoint(
    `/api/generate-video?provider=luma&id=${encodeURIComponent(jobId)}`,
  );

  while (Date.now() < deadline) {
    await sleep(interval);
    if (opts.signal?.aborted) return { ok: false, error: "LUMA_TIMEOUT" };
    const res = await fetch(url, {
      headers: apiKey ? { "x-luma-api-key": apiKey } : undefined,
      signal: opts.signal,
    });
    // 429 / 5xx on a poll are transient; keep waiting until the deadline.
    if (res.status === 429 || res.status >= 500) continue;
    if (!res.ok) return { ok: false, error: "LUMA_HTTP_ERROR" };
    const data = await res.json();
    if (data?.status === "failed") return { ok: false, error: "LUMA_FAILED" };
    if (data?.status === "completed") {
      const safe = sanitizeVideoUrl(data.videoUrl);
      return safe ? { ok: true, videoUrl: safe } : { ok: false, error: "LUMA_BAD_URL" };
    }
  }
  return { ok: false, error: "LUMA_TIMEOUT" };
}
