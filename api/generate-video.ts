import { SlidingWindowRateLimiter } from "../src/utils/rateLimiter.js";
import { isLtxProxyDownloadUrl, isTrustedLtxVideoUrl, isValidLtxJobId } from "../src/utils/ltxUrl.js";

export const config = {
  maxDuration: 60,
};

/*
 * Video generation: official LTX-2.5 async API (https://docs.ltx.io).
 *   POST /api/generate-video                       -> creates a job (text-to-video, or image-to-video when `image` is a data URI)
 *   GET  /api/generate-video?provider=ltx&id=<id>  -> job status; `kind=image` for image-to-video jobs (default: text)
 * The finished video is never streamed through this function (Vercel limits responses to ~4.5 MB):
 * the client receives the presigned result URL and downloads it directly.
 *
 * NOTE: every in-memory counter below (rate limits and the daily cap) is PER SERVERLESS INSTANCE.
 * Concurrent instances each keep their own counters. If abuse occurs, move them to a shared store
 * (Vercel KV / Upstash). That is intentionally not implemented now.
 */
const createLimiter = new SlidingWindowRateLimiter(); // 10 creates per minute per IP
const pollLimiter = new SlidingWindowRateLimiter(60, 60_000); // polls are cheap; client polls every ~5 s
const downloadLimiter = new SlidingWindowRateLimiter(40, 60_000); // a 1080p 6 s result is ~5.3 MB = 2 chunks

/*
 * Chunked download proxy for finished results. The LTX result bucket sends no CORS headers, so the browser
 * cannot turn the video into a Blob itself, and a whole 1080p clip (~5.3 MB) exceeds Vercel's ~4.5 MB
 * response limit. The client therefore requests byte ranges of at most DOWNLOAD_CHUNK_BYTES:
 *   GET /api/generate-video?provider=ltx&action=download&url=<signed result url>&start=<n>&end=<m>
 * Only https://storage.googleapis.com/ltxv-api-ephemeral-prd/... is allowed (see isLtxProxyDownloadUrl).
 */
export const DOWNLOAD_CHUNK_BYTES = 3_000_000;
const DOWNLOAD_TIMEOUT_MS = 30_000;

// Must stay below config.maxDuration so the handler can answer 504 itself.
const UPSTREAM_TIMEOUT_MS = 50_000;
const POLL_TIMEOUT_MS = 20_000;
// Upstream control-plane responses are tiny JSON; never buffer more than this.
const MAX_UPSTREAM_JSON_BYTES = 1_000_000;

const LTX_API_BASE = "https://api.ltx.io/v2";
const LTX_MODEL = "ltx-2-5-fast";
// ltx-2-5-fast @ 1080p: 24/25 fps, 6..20 s (docs.ltx.io/models/ltx-2-5). 6 s is the minimum; null duration would hold 20 s of credits.
const LTX_DURATION_SEC = 6;
// Battle clips run longer so the 3-act story unfolds in one multi-shot generation (LTX-2.5 keeps characters
// consistent across shots). ltx-2-5-fast @1080p/24fps allows 6..20 s; capped at 16 s to bound cost (~$2.08).
const LTX_ALLOWED_DURATIONS: readonly number[] = [6, 8, 10, 12, 14, 16];
const LTX_FPS = 24;
const MAX_PROMPT_CHARS = 2000;
// Vercel rejects request bodies above ~4.5 MB; the client downsizes to <= ~1.5 MB JPEG (~2 MB as base64).
const MAX_IMAGE_DATA_URI_CHARS = 3_500_000;
const IMAGE_DATA_URI = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

const RESOLUTIONS: Readonly<Record<string, string>> = {
  "16:9": "1920x1080",
  "9:16": "1080x1920",
  "1:1": "1080x1080",
};

// Cost guard: LTX bills per generated second, so cap creates per IP per UTC day (per instance, in memory).
// Temporarily 10 (user-approved) while the static embryo and experiment clips are generated; back to 5 afterwards.
export const LTX_DAILY_CREATE_CAP = 10;
const dailyCreates = new Map<string, { day: string; count: number }>();

const SUPPORTED_PROVIDERS: readonly string[] = ["ltx"];

const KEY_HINT = "LTXV_API_KEY (or LTX_API_KEY)";

function utcDay(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

function takeDailySlot(ip: string, now = Date.now()): { ok: boolean; retryAfterSec: number } {
  const day = utcDay(now);
  if (dailyCreates.size > 5000) {
    for (const [k, v] of dailyCreates) if (v.day !== day) dailyCreates.delete(k);
  }
  const cur = dailyCreates.get(ip);
  const count = cur && cur.day === day ? cur.count : 0;
  if (count >= LTX_DAILY_CREATE_CAP) {
    const midnight = Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), new Date(now).getUTCDate() + 1);
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((midnight - now) / 1000)) };
  }
  dailyCreates.set(ip, { day, count: count + 1 });
  return { ok: true, retryAfterSec: 0 };
}

function refundDailySlot(ip: string): void {
  const cur = dailyCreates.get(ip);
  if (cur && cur.count > 0) cur.count -= 1;
}

/** Only x-vercel-forwarded-for is set by Vercel's edge; x-forwarded-for is client-spoofable. */
function clientIp(req: any): string {
  const v = req.headers?.["x-vercel-forwarded-for"];
  const first = (Array.isArray(v) ? v[0] : v)?.split(",")[0]?.trim();
  return first || req.socket?.remoteAddress || "unknown";
}

/** Server-side env only. A key sent by the browser is ignored, and HF tokens are never used for video. */
function ltxKey(): string {
  return (process.env.LTXV_API_KEY || process.env.LTX_API_KEY || "").trim();
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

/** Parses a small upstream JSON body; `tooLarge` when it exceeds the cap, `data` null when not JSON. */
async function readUpstreamJson(res: Response): Promise<{ data: any; tooLarge: boolean }> {
  const buf = await readCapped(res, MAX_UPSTREAM_JSON_BYTES);
  if (!buf) return { data: null, tooLarge: true };
  try {
    return { data: JSON.parse(buf.toString("utf8")), tooLarge: false };
  } catch {
    return { data: null, tooLarge: false };
  }
}

/** Upstream message with the API key redacted and the length bounded. */
function safeMessage(data: any, key: string): string {
  let msg = typeof data?.error?.message === "string" ? data.error.message : "";
  if (key) msg = msg.split(key).join("[redacted]");
  return msg.replace(/\s+/g, " ").slice(0, 200);
}

/** Maps an upstream HTTP error (docs.ltx.io/errors) to our status + a clear message. */
export function mapLtxHttpError(status: number, upstreamMessage: string): { status: number; error: string } {
  const detail = upstreamMessage ? ` (${upstreamMessage})` : "";
  if (status === 401) return { status: 401, error: `LTX API key was rejected. Check ${KEY_HINT} on the server.` };
  if (status === 402) return { status: 402, error: "LTX account has insufficient credits." };
  if (status === 404) return { status: 404, error: "LTX job not found or expired (job status is kept for up to 24 hours)." };
  if (status === 413) return { status: 413, error: "Request is too large for the LTX API." };
  if (status === 400 || status === 422) return { status: status === 422 ? 422 : 400, error: `LTX rejected the request${detail}.` };
  if (status === 429) return { status: 429, error: "LTX queue limit reached. Try again shortly." };
  if (status >= 500) return { status: 502, error: "LTX service error. Try again later." };
  return { status: 502, error: `Unexpected LTX response (${status}).` };
}

/** Maps the LTX job-failure error type (docs.ltx.io/errors#job-failures) to a client-facing message. */
function mapJobFailure(type: string | undefined, message: string): string {
  switch (type) {
    case "insufficient_funds_error":
      return "LTX account has insufficient credits.";
    case "content_filtered_error":
      return "The prompt or image was rejected by the LTX content filter.";
    case "invalid_request_error":
      return `LTX rejected the input${message ? ` (${message})` : ""}.`;
    case "overloaded_error":
    case "service_unavailable_error":
    case "request_timeout_error":
    case "api_error":
      return "LTX could not finish the job (temporary). Try again later.";
    default:
      return message || "LTX job failed.";
  }
}

function mapStatus(upstream: unknown): "queued" | "processing" | "completed" | "failed" | null {
  switch (upstream) {
    case "pending":
      return "queued";
    case "processing":
      return "processing";
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    default:
      return null;
  }
}

function sendUpstreamError(res: any, httpStatus: number, upstreamHeaders: Headers, data: any, key: string): any {
  const mapped = mapLtxHttpError(httpStatus, safeMessage(data, key));
  console.warn(`[generate-video] ltx upstream HTTP ${httpStatus}: ${safeMessage(data, key)}`);
  const retry = upstreamHeaders.get("retry-after");
  if (retry && /^\d{1,6}$/.test(retry)) res.setHeader("Retry-After", retry);
  return res.status(mapped.status).json({ error: mapped.error });
}

function queryParam(req: any, name: string): string | undefined {
  let v = req.query?.[name];
  if (v === undefined && typeof req.url === "string") {
    try {
      v = new URL(req.url, "http://localhost").searchParams.get(name) ?? undefined;
    } catch {
      v = undefined;
    }
  }
  return typeof v === "string" ? v : undefined;
}

function parseByte(v: string | undefined): number | null {
  if (v === undefined || !/^\d{1,10}$/.test(v)) return null;
  return Number(v);
}

async function handleDownload(req: any, res: any): Promise<any> {
  const url = queryParam(req, "url");
  const start = parseByte(queryParam(req, "start"));
  const end = parseByte(queryParam(req, "end"));
  if (!isLtxProxyDownloadUrl(url)) {
    return res.status(400).json({ error: "url must be an LTX result URL" });
  }
  if (start === null || end === null || end < start || end - start + 1 > DOWNLOAD_CHUNK_BYTES) {
    return res.status(400).json({ error: `start/end must select at most ${DOWNLOAD_CHUNK_BYTES} bytes` });
  }

  const rl = downloadLimiter.check(clientIp(req));
  if (!rl.allowed) {
    res.setHeader("Retry-After", String(Math.ceil(rl.retryAfterMs / 1000)));
    return res.status(429).json({ error: "Rate limit exceeded. Try again later." });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
  try {
    // The signed URL carries its own credentials; no LTX key is sent. redirect: "error" keeps the fetch on the bucket.
    const up = await fetch(new URL(url).toString(), {
      method: "GET",
      headers: { Range: `bytes=${start}-${end}` },
      redirect: "error",
      signal: controller.signal,
    });
    if (up.status === 416) {
      await up.body?.cancel();
      return res.status(416).json({ error: "Requested range is past the end of the video" });
    }
    if (up.status === 400 || up.status === 401 || up.status === 403 || up.status === 404) {
      await up.body?.cancel();
      return res.status(410).json({ error: "The LTX result URL has expired (it is valid for about 1 hour)." });
    }
    if (up.status !== 206 && up.status !== 200) {
      await up.body?.cancel();
      return res.status(502).json({ error: `Result download failed (${up.status})` });
    }
    const buf = await readCapped(up, DOWNLOAD_CHUNK_BYTES);
    if (!buf) return res.status(502).json({ error: "Result chunk larger than expected" });

    // Content-Range: bytes 0-2999999/5273017. A 200 means the range was ignored and the whole file fit in one chunk.
    let total = buf.length;
    const range = up.headers.get("content-range");
    const m = range ? /\/(\d{1,12})$/.exec(range) : null;
    if (up.status === 206) {
      if (!m) return res.status(502).json({ error: "Result download returned no total length" });
      total = Number(m[1]);
    }
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Total-Length", String(total));
    return res.status(200).send(buf);
  } catch (err: any) {
    if (err?.name === "AbortError") return res.status(504).json({ error: "Result download timed out" });
    return res.status(502).json({ error: "Result download error" });
  } finally {
    clearTimeout(timer);
  }
}

async function handlePoll(req: any, res: any): Promise<any> {
  if (queryParam(req, "provider") === "ltx" && queryParam(req, "action") === "download") {
    return handleDownload(req, res);
  }
  const id = queryParam(req, "id");
  if (queryParam(req, "provider") !== "ltx" || !isValidLtxJobId(id)) {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const kindParam = queryParam(req, "kind") ?? "text";
  if (kindParam !== "text" && kindParam !== "image") {
    return res.status(400).json({ error: "kind must be 'text' or 'image'" });
  }

  const rl = pollLimiter.check(clientIp(req));
  if (!rl.allowed) {
    res.setHeader("Retry-After", String(Math.ceil(rl.retryAfterMs / 1000)));
    return res.status(429).json({ error: "Rate limit exceeded. Try again later." });
  }

  const key = ltxKey();
  if (!key) return res.status(400).json({ error: `No LTX API key configured (${KEY_HINT}).` });

  const endpoint = kindParam === "image" ? "image-to-video" : "text-to-video";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), POLL_TIMEOUT_MS);
  try {
    const up = await fetch(`${LTX_API_BASE}/${endpoint}/${id}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${key}` },
      signal: controller.signal,
    });
    const { data, tooLarge } = await readUpstreamJson(up);
    if (!up.ok) return sendUpstreamError(res, up.status, up.headers, data, key);
    if (tooLarge || !data) return res.status(502).json({ error: "Unreadable response from the LTX API." });

    const status = mapStatus(data.status);
    if (!status) return res.status(502).json({ error: "Unknown job status from the LTX API." });

    if (status === "completed") {
      const url = data?.result?.video_url;
      let resultHost = "missing";
      try {
        resultHost = new URL(String(url)).hostname.slice(0, 80);
      } catch {
        /* keep "missing" */
      }
      console.info(`[generate-video] ltx ${kindParam} job completed, result host: ${resultHost}`);
      if (!isTrustedLtxVideoUrl(url)) {
        let host = "unknown";
        try {
          host = new URL(String(url)).hostname.slice(0, 80);
        } catch {
          /* keep "unknown" */
        }
        return res.status(200).json({
          jobId: id,
          status: "failed",
          videoUrl: null,
          error: `LTX returned a result URL that is missing or not on a trusted host (${host}).`,
        });
      }
      return res.status(200).json({ jobId: id, status, videoUrl: url });
    }
    if (status === "failed") {
      const type = typeof data?.error?.type === "string" ? data.error.type : undefined;
      console.warn(`[generate-video] ltx ${kindParam} job failed: ${type ?? "unknown"} ${safeMessage(data, key)}`);
      return res.status(200).json({
        jobId: id,
        status,
        videoUrl: null,
        error: mapJobFailure(type, safeMessage(data, key)),
      });
    }
    return res.status(200).json({ jobId: id, status, videoUrl: null });
  } catch (err: any) {
    if (err?.name === "AbortError") return res.status(504).json({ error: "LTX status request timed out" });
    return res.status(500).json({ error: "Video status error" });
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req: any, res: any): Promise<any> {
  if (req.method === "GET") return handlePoll(req, res);
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip = clientIp(req);
  const rl = createLimiter.check(ip);
  if (!rl.allowed) {
    res.setHeader("Retry-After", String(Math.ceil(rl.retryAfterMs / 1000)));
    return res.status(429).json({ error: "Rate limit exceeded. Try again later." });
  }

  const { prompt, provider = "ltx", aspect = "16:9", image, lastImage, duration = LTX_DURATION_SEC } = req.body || {};
  if (typeof prompt !== "string" || !prompt.trim()) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    return res.status(400).json({ error: "Unsupported provider. Only the LTX (ltx) provider is available." });
  }

  const resolution = typeof aspect === "string" ? RESOLUTIONS[aspect] : undefined;
  if (!resolution) {
    return res.status(400).json({ error: "aspect must be one of 16:9, 9:16, 1:1" });
  }
  if (typeof duration !== "number" || !LTX_ALLOWED_DURATIONS.includes(duration)) {
    return res.status(400).json({ error: `duration must be one of ${LTX_ALLOWED_DURATIONS.join(", ")}` });
  }

  let imageUri: string | undefined;
  if (image !== undefined && image !== null && image !== "") {
    if (typeof image !== "string" || !IMAGE_DATA_URI.test(image)) {
      return res.status(400).json({ error: "image must be a base64 data URI (image/jpeg, image/png or image/webp)" });
    }
    if (image.length > MAX_IMAGE_DATA_URI_CHARS) {
      return res.status(413).json({ error: "image is too large; downscale it to a JPEG under ~1.5 MB" });
    }
    imageUri = image;
  }

  // Optional last frame (image-to-video only): LTX interpolates from `image` to `lastImage`
  // (docs.ltx.io submit-image-to-video: last_frame_uri; needs a fixed duration, which we always send).
  let lastImageUri: string | undefined;
  if (lastImage !== undefined && lastImage !== null && lastImage !== "") {
    if (!imageUri) {
      return res.status(400).json({ error: "lastImage needs image (the first frame)" });
    }
    if (typeof lastImage !== "string" || !IMAGE_DATA_URI.test(lastImage)) {
      return res.status(400).json({ error: "lastImage must be a base64 data URI (image/jpeg, image/png or image/webp)" });
    }
    // Both images together must stay under the request body budget (Vercel ~4.5 MB).
    if (imageUri.length + lastImage.length > MAX_IMAGE_DATA_URI_CHARS) {
      return res.status(413).json({ error: "image + lastImage are too large; downscale them" });
    }
    lastImageUri = lastImage;
  }

  const key = ltxKey();
  if (!key) {
    return res.status(400).json({ error: `No LTX API key configured (${KEY_HINT}).` });
  }

  const slot = takeDailySlot(ip);
  if (!slot.ok) {
    res.setHeader("Retry-After", String(slot.retryAfterSec));
    return res.status(429).json({ error: `Daily LTX video limit reached (${LTX_DAILY_CREATE_CAP} per day). Try again tomorrow.` });
  }

  const payload: Record<string, unknown> = {
    prompt: prompt.trim().slice(0, MAX_PROMPT_CHARS),
    model: LTX_MODEL,
    duration,
    resolution,
    fps: LTX_FPS,
    generate_audio: false,
  };
  if (imageUri) payload.image_uri = imageUri;
  if (lastImageUri) payload.last_frame_uri = lastImageUri;
  const kind = imageUri ? "image" : "text";
  const endpoint = imageUri ? "image-to-video" : "text-to-video";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  let created = false;
  try {
    const up = await fetch(`${LTX_API_BASE}/${endpoint}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const { data, tooLarge } = await readUpstreamJson(up);
    if (!up.ok) return sendUpstreamError(res, up.status, up.headers, data, key);
    if (tooLarge) {
      return res.status(502).json({ error: "Unexpectedly large response from the LTX API." });
    }
    const jobId = data?.id;
    if (!isValidLtxJobId(jobId)) {
      return res.status(502).json({ error: "LTX did not return a valid job id." });
    }
    created = true;
    return res.status(200).json({ jobId, status: "queued", kind });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      // The job may have been created upstream before the timeout, so keep the daily slot used.
      created = true;
      return res.status(504).json({ error: "Video generation timed out" });
    }
    return res.status(500).json({ error: "Video generation error" });
  } finally {
    clearTimeout(timer);
    // A job that was never created cost nothing, so it must not use up the daily allowance.
    if (!created) refundDailySlot(ip);
  }
}
