import { SlidingWindowRateLimiter } from "../src/utils/rateLimiter.js";

export const config = {
  maxDuration: 60,
};

/*
 * NOTE: the rate limiters below are in-memory, so they are PER SERVERLESS INSTANCE.
 * Concurrent instances each keep their own counters. If abuse occurs, move the counters
 * to a shared store (Vercel KV / Upstash). That is intentionally not implemented now.
 */
const limiter = new SlidingWindowRateLimiter();
// Polling (every >= 5 s) needs a larger budget than job creation.
const pollLimiter = new SlidingWindowRateLimiter(60, 60_000);

// Must stay below config.maxDuration so the handler can answer 504 itself.
const UPSTREAM_TIMEOUT_MS = 50_000;
// Vercel limits function responses to 4.5 MB; never relay larger bodies.
const MAX_INLINE_VIDEO_BYTES = 4_000_000;

// Luma Agents API (https://docs.agents.lumalabs.ai). The legacy Dream Machine API rejects Agents keys.
const LUMA_BASE = "https://agents.lumalabs.ai/v1/generations";
const LUMA_KEY_HINT = "LUMA_AGENTS_API_KEY or LUMA_API_KEY";
// Agents API ids are UUIDs; this also admits the old opaque id charset.
const LUMA_ID_RE = /^[A-Za-z0-9_-]{1,100}$/;

/** LUMA_AGENTS_API_KEY is the documented name; LUMA_API_KEY stays as an alias. */
function envLumaKey(): string | undefined {
  return process.env.LUMA_AGENTS_API_KEY || process.env.LUMA_API_KEY || undefined;
}

/** Maps an upstream Luma error to a client-safe message. Never echoes credentials. */
function lumaErrorMessage(status: number, data: any, fallback: string): string {
  const detail = typeof data?.detail === "string" ? data.detail.slice(0, 300) : null;
  switch (status) {
    case 401:
      return `Luma rejected the API key (invalid or missing). Check ${LUMA_KEY_HINT}.`;
    case 402:
      return "Luma account has insufficient balance. Add funds and retry.";
    case 403:
      return "Luma denied access (the key's account is suspended or deactivated).";
    case 422:
      return `Luma rejected the request: ${detail ?? "invalid parameters"}`;
    case 429:
      return "Luma rate limit or concurrent-job limit reached. Retry shortly.";
    default:
      return detail ?? fallback;
  }
}

/** Only x-vercel-forwarded-for is set by Vercel's edge; x-forwarded-for is client-spoofable. */
function clientIp(req: any): string {
  const v = req.headers?.["x-vercel-forwarded-for"];
  const first = (Array.isArray(v) ? v[0] : v)?.split(",")[0]?.trim();
  return first || req.socket?.remoteAddress || "unknown";
}

function header(req: any, name: string): string | undefined {
  const v = req.headers?.[name];
  return (Array.isArray(v) ? v[0] : v) || undefined;
}

function isLumaPoll(req: any): boolean {
  const q = req.query || {};
  return req.method === "GET" && q.provider === "luma" && typeof q.id === "string" && LUMA_ID_RE.test(q.id);
}

function mapLumaState(state: unknown): "queued" | "processing" | "completed" | "failed" {
  if (state === "completed") return "completed";
  if (state === "failed") return "failed";
  if (state === "queued") return "queued";
  return "processing";
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

async function handlePoll(req: any, res: any): Promise<any> {
  const rl = pollLimiter.check(clientIp(req));
  if (!rl.allowed) {
    res.setHeader("Retry-After", String(Math.ceil(rl.retryAfterMs / 1000)));
    return res.status(429).json({ error: "Rate limit exceeded. Try again later." });
  }

  // GET has no body, so a user-supplied key travels in a header (never in the URL).
  const lumaKey = header(req, "x-luma-api-key") || envLumaKey();
  if (!lumaKey) {
    return res.status(400).json({ error: `No Luma API key configured (${LUMA_KEY_HINT}).` });
  }

  const jobId: string = req.query.id;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const r = await fetch(`${LUMA_BASE}/${encodeURIComponent(jobId)}`, {
      headers: { Authorization: `Bearer ${lumaKey}` },
      signal: controller.signal,
    });
    const data: any = await r.json().catch(() => ({}));
    if (!r.ok) {
      return res
        .status(r.status)
        .json({ jobId, status: "failed", error: lumaErrorMessage(r.status, data, "Luma request failed") });
    }
    const status = mapLumaState(data?.state);
    // Agents API: the presigned MP4 is output[].url with type "video" (1 h expiry).
    const outputs: any[] = Array.isArray(data?.output) ? data.output : [];
    const video = outputs.find((o) => o?.type === "video" && typeof o?.url === "string");
    const videoUrl = status === "completed" ? video?.url ?? null : null;
    if (status === "failed") {
      return res.status(200).json({
        jobId,
        status,
        videoUrl: null,
        error: data?.failure_code || data?.failure_reason || "generation_failed",
      });
    }
    return res.status(200).json({ jobId, status, videoUrl });
  } catch (err: any) {
    if (err?.name === "AbortError") return res.status(504).json({ error: "Luma status check timed out" });
    return res.status(500).json({ error: err?.message || "Luma status error" });
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req: any, res: any): Promise<any> {
  if (isLumaPoll(req)) return handlePoll(req, res);

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

  // Tokens are per provider: a user key for one provider is never sent to the other.
  const isLuma = provider === "luma";
  const lumaKey = isLuma ? apiKey || envLumaKey() : undefined;
  const hfToken = isLuma ? undefined : apiKey || process.env.HF_TOKEN || process.env.HUGGINGFACE_TOKEN;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    if (isLuma) {
      if (!lumaKey) {
        return res.status(400).json({ error: `No Luma API key configured (${LUMA_KEY_HINT}).` });
      }
      const lumaRes = await fetch(LUMA_BASE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lumaKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "ray-3.2",
          type: "video",
          prompt,
          aspect_ratio: "16:9",
          video: { resolution: "720p", duration: "5s", loop: true },
        }),
        signal: controller.signal,
      });
      const data: any = await lumaRes.json().catch(() => ({}));
      if (!lumaRes.ok || !data?.id) {
        const status = lumaRes.ok ? 502 : lumaRes.status;
        return res.status(status).json({ error: lumaErrorMessage(status, data, "Luma job creation failed") });
      }
      return res.status(200).json({ jobId: data.id, status: mapLumaState(data.state) });
    }

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

    return res
      .status(400)
      .json({ error: "No AI Video API token configured (HF_TOKEN, LUMA_AGENTS_API_KEY or LUMA_API_KEY)." });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return res.status(504).json({ error: "Video generation timed out" });
    }
    return res.status(500).json({ error: err?.message || "Video generation error" });
  } finally {
    clearTimeout(timer);
  }
}
