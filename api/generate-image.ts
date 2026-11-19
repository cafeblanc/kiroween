import { SlidingWindowRateLimiter } from "../src/utils/rateLimiter.js";
import { HF_IMAGE_DAILY_CAP, HF_IMAGE_URL, MAX_IMAGE_PROMPT_CHARS, hfImageRequestBody } from "../src/utils/hfImage.js";

export const config = {
  maxDuration: 60,
};

/*
 * Monster image generation with the server's HuggingFace token (HF_TOKEN, never sent to the browser).
 *   POST /api/generate-image { prompt, seed } -> { imageDataUrl } (JPEG/PNG as a data URL, ~0.1-0.3 MB)
 * 503 { code: "NO_KEY" } when HF_TOKEN is not set and 402/429/5xx on upstream errors: the browser then falls back to
 * Pollinations. In-memory counters are per serverless instance (same trade-off as /api/generate-video).
 */
const limiter = new SlidingWindowRateLimiter(6, 60_000);
const daily = new Map<string, { day: string; count: number }>();
const UPSTREAM_TIMEOUT_MS = 50_000;
const MAX_IMAGE_BYTES = 3_000_000;

function clientIp(req: any): string {
  const v = req.headers?.["x-vercel-forwarded-for"];
  const first = (Array.isArray(v) ? v[0] : v)?.split(",")[0]?.trim();
  return first || req.socket?.remoteAddress || "unknown";
}

export function takeDailySlot(ip: string, now = Date.now()): boolean {
  const day = new Date(now).toISOString().slice(0, 10);
  if (daily.size > 5000) for (const [k, v] of daily) if (v.day !== day) daily.delete(k);
  const cur = daily.get(ip);
  const count = cur && cur.day === day ? cur.count : 0;
  if (count >= HF_IMAGE_DAILY_CAP) return false;
  daily.set(ip, { day, count: count + 1 });
  return true;
}

export function refundDailySlot(ip: string): void {
  const cur = daily.get(ip);
  if (cur && cur.count > 0) cur.count -= 1;
}

export default async function handler(req: any, res: any): Promise<any> {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = (process.env.HF_TOKEN || "").trim();
  if (!token) return res.status(503).json({ error: "Image service is not configured.", code: "NO_KEY" });

  const ip = clientIp(req);
  const rl = limiter.check(ip);
  if (!rl.allowed) {
    res.setHeader("Retry-After", String(Math.ceil(rl.retryAfterMs / 1000)));
    return res.status(429).json({ error: "Rate limit exceeded. Try again later." });
  }

  const { prompt, seed = 0, negative } = req.body || {};
  if (negative !== undefined && typeof negative !== "string") {
    return res.status(400).json({ error: "negative must be a string" });
  }
  if (typeof prompt !== "string" || !prompt.trim()) return res.status(400).json({ error: "Prompt is required" });
  if (prompt.length > MAX_IMAGE_PROMPT_CHARS) {
    return res.status(400).json({ error: `Prompt must be at most ${MAX_IMAGE_PROMPT_CHARS} characters` });
  }
  if (typeof seed !== "number" || !Number.isFinite(seed)) return res.status(400).json({ error: "seed must be a number" });

  if (!takeDailySlot(ip)) {
    return res.status(429).json({ error: `Daily image limit reached (${HF_IMAGE_DAILY_CAP} per day).`, code: "DAILY_CAP" });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const up = await fetch(HF_IMAGE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "image/jpeg" },
      // The extra negative terms are sanitised (ASCII, bounded) inside hfImageRequestBody.
      body: hfImageRequestBody(prompt, seed, negative),
      signal: controller.signal,
    });
    const type = (up.headers.get("content-type") || "").split(";")[0];
    if (!up.ok || !type.startsWith("image/")) {
      // Do not echo upstream bodies (they can name the account); log a short reason only.
      console.warn(`[generate-image] HF ${up.status} ${type}`);
      if (up.status >= 500 || up.status === 0) refundDailySlot(ip);
      const status = up.status === 402 ? 402 : up.status === 429 ? 429 : 502;
      return res.status(status).json({ error: status === 402 ? "Image credits are used up." : "Image service failed." });
    }
    const buf = Buffer.from(await up.arrayBuffer());
    if (buf.length === 0 || buf.length > MAX_IMAGE_BYTES) {
      refundDailySlot(ip);
      return res.status(502).json({ error: "Image service returned an invalid image." });
    }
    return res.status(200).json({ imageDataUrl: `data:${type};base64,${buf.toString("base64")}` });
  } catch (err: any) {
    refundDailySlot(ip);
    const aborted = err?.name === "AbortError";
    return res.status(aborted ? 504 : 502).json({ error: aborted ? "Image service timed out." : "Image service failed." });
  } finally {
    clearTimeout(timer);
  }
}
