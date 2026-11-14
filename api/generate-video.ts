import { SlidingWindowRateLimiter } from "../src/utils/rateLimiter.js";

export const config = {
  maxDuration: 60,
};

const limiter = new SlidingWindowRateLimiter();
const UPSTREAM_TIMEOUT_MS = 60_000;

function clientIp(req: any): string {
  const fwd = req.headers?.["x-forwarded-for"];
  const first = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(",")[0]?.trim();
  return first || req.headers?.["x-real-ip"] || req.socket?.remoteAddress || "unknown";
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

  const hfToken = apiKey || process.env.HF_TOKEN || process.env.HUGGINGFACE_TOKEN;
  const lumaKey = apiKey || process.env.LUMA_API_KEY;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    if (provider === "luma" && lumaKey) {
      const lumaRes = await fetch("https://api.lumalabs.ai/dream-machine/v1/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lumaKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, aspect_ratio: "16:9", loop: true }),
        signal: controller.signal,
      });
      const data = await lumaRes.json();
      return res.status(lumaRes.status).json(data);
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

      const arrayBuffer = await hfRes.arrayBuffer();
      res.setHeader("Content-Type", "video/mp4");
      return res.status(200).send(Buffer.from(arrayBuffer));
    }

    return res.status(400).json({ error: "No AI Video API token configured (HF_TOKEN or LUMA_API_KEY)." });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return res.status(504).json({ error: "Video generation timed out" });
    }
    return res.status(500).json({ error: err?.message || "Video generation error" });
  } finally {
    clearTimeout(timer);
  }
}
