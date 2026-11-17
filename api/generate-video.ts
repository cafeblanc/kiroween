import { SlidingWindowRateLimiter } from "../src/utils/rateLimiter.js";

export const config = {
  maxDuration: 60,
};

/*
 * NOTE: the rate limiter below is in-memory, so it is PER SERVERLESS INSTANCE.
 * Concurrent instances each keep their own counters. If abuse occurs, move the counters
 * to a shared store (Vercel KV / Upstash). That is intentionally not implemented now.
 */
const limiter = new SlidingWindowRateLimiter();

// Must stay below config.maxDuration so the handler can answer 504 itself.
const UPSTREAM_TIMEOUT_MS = 50_000;
// Vercel limits function responses to 4.5 MB; never relay larger bodies.
const MAX_INLINE_VIDEO_BYTES = 4_000_000;

// The only provider id this endpoint accepts (HuggingFace Lightricks/LTX-Video).
const SUPPORTED_PROVIDERS: readonly string[] = ["huggingface_wan2"];

/** Only x-vercel-forwarded-for is set by Vercel's edge; x-forwarded-for is client-spoofable. */
function clientIp(req: any): string {
  const v = req.headers?.["x-vercel-forwarded-for"];
  const first = (Array.isArray(v) ? v[0] : v)?.split(",")[0]?.trim();
  return first || req.socket?.remoteAddress || "unknown";
}

/** Reads at most `limit` bytes; returns null (and cancels the stream) when exceeded. */
async function readCapped(res: Response, limit: number): Promise<Buffer | null> {
  const declared = Number(res.headers.get("content-length"));
  if (declared > limit) {
    await res.body?.cancel();
    return null;
  }
  const reader = res.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: any, res: any): Promise<any> {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const rl = limiter.check(clientIp(req));
  if (!rl.allowed) {
    res.setHeader("Retry-After", String(Math.ceil(rl.retryAfterMs / 1000)));
    return res.status(429).json({ error: "Rate limit exceeded. Try again later." });
  }

  const { prompt, provider = "huggingface_wan2", apiKey } = req.body || {};
  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    return res.status(400).json({ error: "Unsupported provider. Only the LTX (huggingface_wan2) provider is available." });
  }

  const hfToken = apiKey || process.env.HF_TOKEN || process.env.HUGGINGFACE_TOKEN;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    if (hfToken) {
      const hfRes = await fetch(
        "https://api-inference.huggingface.co/models/Lightricks/LTX-Video",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${hfToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ inputs: prompt }),
          signal: controller.signal,
        }
      );
      if (!hfRes.ok) {
        const text = await hfRes.text();
        return res.status(hfRes.status).json({ error: text });
      }
      const body = await readCapped(hfRes, MAX_INLINE_VIDEO_BYTES);
      if (!body) {
        return res.status(413).json({
          error: "Generated video is too large to relay through the serverless function.",
        });
      }
      res.setHeader("Content-Type", "video/mp4");
      return res.status(200).send(body);
    }

    return res.status(400).json({ error: "No AI Video API token configured (HF_TOKEN)." });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return res.status(504).json({ error: "Video generation timed out" });
    }
    return res.status(500).json({ error: err?.message || "Video generation error" });
  } finally {
    clearTimeout(timer);
  }
}
