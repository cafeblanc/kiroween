import { assertAllowedApiEndpoint, sanitizeVideoUrl } from "../utils/security";
import { isLtxProxyDownloadUrl, isTrustedLtxVideoUrl } from "../utils/ltxUrl";

/**
 * Browser client for the /api/generate-video LTX-2.5 job API
 * (docs: https://docs.ltx.io/async-jobs.md): create a job, poll every ~5 s, return the result URL.
 * Image generation is NOT handled here (it stays on HuggingFace FLUX).
 */

export const LTX_MODEL_LABEL = "LTX-2.5 fast · 1080p";
export const LTX_POLL_INTERVAL_MS = 5_000;
export const LTX_MAX_WAIT_MS = 4 * 60_000;
/** Server cap is ~3.5 MB of base64; a JPEG at most this size stays well below Vercel's ~4.5 MB body limit. */
export const LTX_MAX_IMAGE_BYTES = 1_500_000;
const MAX_CONSECUTIVE_POLL_ERRORS = 3;

export type LtxAspect = "16:9" | "9:16" | "1:1";
/** ltx-2-5-fast at 1080p / 24 fps allows 6..20 s in steps of 2; the server accepts up to 16 s (cost guard). */
export type LtxDuration = 6 | 8 | 10 | 12 | 14 | 16;
export type LtxJobStatus = "queued" | "processing" | "completed" | "failed";
export type LtxErrorCode =
  | "NO_API_KEY"
  | "DAILY_LIMIT"
  | "RATE_LIMITED"
  | "INSUFFICIENT_CREDITS"
  | "TIMEOUT"
  | "ABORTED"
  | "FAILED";

export interface LtxJobOptions {
  prompt: string;
  /** Base64 data URI of the first frame; omitted -> text-to-video. */
  image?: string;
  aspect?: LtxAspect;
  /** Omitted -> server default (6 s). */
  duration?: LtxDuration;
  signal?: AbortSignal;
  onStatus?: (status: LtxJobStatus, elapsedMs: number) => void;
  /** Download the result into a blob: URL (presigned URLs expire). Falls back to the remote URL if the download fails. */
  toBlob?: boolean;
  pollIntervalMs?: number;
  maxWaitMs?: number;
  /** Test hook. */
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
}

export interface LtxJobResult {
  success: boolean;
  /** blob: URL when the download worked (caller owns and must revoke it), else the trusted remote URL. */
  videoUrl?: string;
  remoteUrl?: string;
  isBlob?: boolean;
  error?: string;
  code?: LtxErrorCode;
}

function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

async function readJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function codeForCreateError(status: number, message: string): LtxErrorCode {
  if (status === 400 && /LTXV_API_KEY|LTX_API_KEY/.test(message)) return "NO_API_KEY";
  if (status === 429 && /daily/i.test(message)) return "DAILY_LIMIT";
  if (status === 429) return "RATE_LIMITED";
  if (status === 402) return "INSUFFICIENT_CREDITS";
  return "FAILED";
}

/** Creates an LTX job, polls until it finishes (bounded), and returns a sanitized result URL. */
export async function generateLtxVideo(opts: LtxJobOptions): Promise<LtxJobResult> {
  const {
    prompt,
    image,
    aspect = "16:9",
    duration,
    signal,
    onStatus,
    toBlob = true,
    pollIntervalMs = LTX_POLL_INTERVAL_MS,
    maxWaitMs = LTX_MAX_WAIT_MS,
    sleep = abortableSleep,
  } = opts;
  const started = Date.now();
  try {
    const createRes = await fetch(assertAllowedApiEndpoint("/api/generate-video"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, provider: "ltx", aspect, ...(duration ? { duration } : {}), ...(image ? { image } : {}) }),
      signal,
    });
    const created = await readJson(createRes);
    if (!createRes.ok) {
      const message = typeof created?.error === "string" ? created.error : `HTTP ${createRes.status}`;
      return { success: false, error: message, code: codeForCreateError(createRes.status, message) };
    }
    const jobId: unknown = created?.jobId;
    if (typeof jobId !== "string" || !/^[A-Za-z0-9_-]{8,64}$/.test(jobId)) {
      return { success: false, error: "Invalid job id from the server", code: "FAILED" };
    }
    const kind = created?.kind === "image" ? "image" : "text";
    onStatus?.("queued", 0);

    let pollErrors = 0;
    for (;;) {
      if (Date.now() - started >= maxWaitMs) {
        return { success: false, error: "LTX video generation timed out", code: "TIMEOUT" };
      }
      // 5-6 s between polls (docs recommend >= 5 s with a little jitter).
      await sleep(pollIntervalMs + Math.floor(Math.random() * 1000), signal);

      let data: any = null;
      let httpOk = false;
      let httpStatus = 0;
      try {
        const pollRes = await fetch(
          assertAllowedApiEndpoint(
            `/api/generate-video?provider=ltx&kind=${kind}&id=${encodeURIComponent(jobId)}`,
          ),
          { method: "GET", signal },
        );
        httpOk = pollRes.ok;
        httpStatus = pollRes.status;
        data = await readJson(pollRes);
      } catch (e: any) {
        if (e?.name === "AbortError") throw e;
        httpOk = false;
        httpStatus = 0;
      }

      if (!httpOk) {
        // 5xx / network / rate limit are transient; 401/402/404 are final.
        const transient = httpStatus === 0 || httpStatus === 429 || httpStatus >= 500;
        if (!transient || ++pollErrors >= MAX_CONSECUTIVE_POLL_ERRORS) {
          const message = typeof data?.error === "string" ? data.error : `HTTP ${httpStatus || "network error"}`;
          return { success: false, error: message, code: httpStatus === 402 ? "INSUFFICIENT_CREDITS" : "FAILED" };
        }
        continue;
      }
      pollErrors = 0;

      const status = data?.status as LtxJobStatus | undefined;
      if (status === "queued" || status === "processing") {
        onStatus?.(status, Date.now() - started);
        continue;
      }
      if (status === "failed") {
        return { success: false, error: typeof data?.error === "string" ? data.error : "LTX job failed", code: "FAILED" };
      }
      if (status === "completed") {
        const safe = sanitizeVideoUrl(data?.videoUrl);
        if (!safe || !isTrustedLtxVideoUrl(safe)) {
          return { success: false, error: "LTX returned an untrusted video URL", code: "FAILED" };
        }
        onStatus?.("completed", Date.now() - started);
        if (toBlob) {
          try {
            // The LTX bucket sends no CORS headers, so a direct fetch cannot be read; use the chunked proxy.
            const blob = isLtxProxyDownloadUrl(safe)
              ? await downloadLtxResultViaProxy(safe, signal)
              : await (async () => {
                  const dl = await fetch(safe, { signal });
                  return dl.ok ? dl.blob() : null;
                })();
            if (blob && blob.size > 0) {
              return { success: true, videoUrl: URL.createObjectURL(blob), remoteUrl: safe, isBlob: true };
            }
          } catch (e: any) {
            if (e?.name === "AbortError") throw e;
            // Download failed: the remote URL still plays in a <video> element until it expires (~1 hour).
            console.warn(`[ltxJobClient] result download failed, playing the remote URL: ${e?.message ?? e}`);
          }
        }
        return { success: true, videoUrl: safe, remoteUrl: safe, isBlob: false };
      }
      return { success: false, error: "Unknown job status from the server", code: "FAILED" };
    }
  } catch (e: any) {
    if (e?.name === "AbortError") return { success: false, error: "aborted", code: "ABORTED" };
    return { success: false, error: e?.message || "NETWORK_ERROR", code: "FAILED" };
  }
}

/** Must match DOWNLOAD_CHUNK_BYTES in api/generate-video.ts (stays under Vercel's ~4.5 MB response limit). */
export const LTX_DOWNLOAD_CHUNK_BYTES = 3_000_000;
/** Refuse absurd sizes so a bad X-Total-Length can't loop forever (a 20 s 4K clip is far below this). */
const LTX_MAX_DOWNLOAD_BYTES = 200_000_000;

/**
 * Downloads a finished LTX result through /api/generate-video in byte ranges and returns it as a video/mp4 Blob.
 * Throws on any failed chunk so the caller can fall back to the remote URL.
 */
export async function downloadLtxResultViaProxy(
  resultUrl: string,
  signal?: AbortSignal,
  chunkBytes: number = LTX_DOWNLOAD_CHUNK_BYTES,
): Promise<Blob> {
  const parts: ArrayBuffer[] = [];
  let start = 0;
  let total = Infinity;
  while (start < total) {
    const end = start + chunkBytes - 1;
    const res = await fetch(
      assertAllowedApiEndpoint(
        `/api/generate-video?provider=ltx&action=download&start=${start}&end=${end}&url=${encodeURIComponent(resultUrl)}`,
      ),
      { method: "GET", signal },
    );
    if (!res.ok) {
      const data = await readJson(res);
      throw new Error(typeof data?.error === "string" ? data.error : `download chunk HTTP ${res.status}`);
    }
    const declared = Number(res.headers.get("x-total-length"));
    if (!Number.isFinite(declared) || declared <= 0 || declared > LTX_MAX_DOWNLOAD_BYTES) {
      throw new Error("download returned an invalid total length");
    }
    total = declared;
    const buf = await res.arrayBuffer();
    if (buf.byteLength === 0) throw new Error("download returned an empty chunk");
    parts.push(buf);
    start += buf.byteLength;
  }
  if (start !== total) throw new Error("downloaded size does not match the declared length");
  return new Blob(parts, { type: "video/mp4" });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

/** Aspect bucket closest to the image (the API supports 16:9, 9:16 and 1:1 at 1080p). */
export function pickAspect(width: number, height: number): LtxAspect {
  const r = width / Math.max(1, height);
  if (r >= 1.3) return "16:9";
  if (r <= 0.77) return "9:16";
  return "1:1";
}

/**
 * Downscales an image (data:/blob:/same-origin URL) to a JPEG data URI of at most `maxBytes`
 * (Vercel rejects request bodies above ~4.5 MB). Returns null when it cannot be done safely
 * (no canvas, tainted canvas, image too heavy) so the caller can use text-to-video instead.
 */
export async function prepareImageForLtx(
  imageUrl: string,
  maxBytes: number = LTX_MAX_IMAGE_BYTES,
): Promise<{ dataUri: string; aspect: LtxAspect } | null> {
  if (typeof document === "undefined" || typeof Image === "undefined") return null;
  try {
    const img = await loadImage(imageUrl);
    const aspect = pickAspect(img.naturalWidth || img.width, img.naturalHeight || img.height);
    for (const maxSide of [1280, 960, 720]) {
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
      const w = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
      const h = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      for (const q of [0.9, 0.8, 0.7]) {
        const uri = canvas.toDataURL("image/jpeg", q);
        // base64 expands 4/3; compare the decoded size.
        const bytes = Math.floor(((uri.length - uri.indexOf(",") - 1) * 3) / 4);
        if (bytes <= maxBytes) return { dataUri: uri, aspect };
      }
    }
    return null;
  } catch {
    return null;
  }
}
