import { assertAllowedApiEndpoint, sanitizeVideoUrl } from "../utils/security";
import { pollLumaJob } from "./lumaJobClient";

export interface VideoGenRequest {
  prompt: string;
  provider: "huggingface_wan2" | "luma" | "replicate";
  apiKey?: string;
  /** Local-only: the caller owns (and revokes) any blob URL instead of the shared single-slot tracker. */
  keepBlobUrl?: boolean;
  /** Local-only: aborts the proxy / direct HuggingFace requests. */
  signal?: AbortSignal;
}

export interface VideoGenResult {
  success: boolean;
  videoUrl?: string;
  provider: string;
  error?: string;
}

// Only one generated video is live at a time; revoke the previous blob URL before issuing a new one.
let lastBlobUrl: string | null = null;

function createTrackedBlobUrl(blob: Blob): string {
  if (lastBlobUrl) URL.revokeObjectURL(lastBlobUrl);
  lastBlobUrl = URL.createObjectURL(blob);
  return lastBlobUrl;
}

/**
 * Generates a live AI combat or 3D awakening video via HuggingFace (Wan2.1 / LTX-Video)
 * or server-side proxy (/api/generate-video).
 */
export async function generateMonsterVideo(fullReq: VideoGenRequest): Promise<VideoGenResult> {
  // Local-only options must never be serialized into the proxy request body.
  const { keepBlobUrl, signal, ...req } = fullReq;
  const toBlobUrl = (blob: Blob): string =>
    keepBlobUrl ? URL.createObjectURL(blob) : createTrackedBlobUrl(blob);
  try {
    // 1. Try local/Vercel serverless endpoint first (uses server env keys if configured)
    const serverRes = await fetch(assertAllowedApiEndpoint("/api/generate-video"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
      signal,
    });

    if (serverRes.ok) {
      const contentType = serverRes.headers.get("content-type") || "";
      if (contentType.includes("video")) {
        const blob = await serverRes.blob();
        return {
          success: true,
          videoUrl: toBlobUrl(blob),
          provider: req.provider,
        };
      }
      const data = await serverRes.json();
      if (typeof data?.jobId === "string") {
        const job = await pollLumaJob(data.jobId, req.apiKey, { signal });
        return job.ok
          ? { success: true, videoUrl: job.videoUrl, provider: req.provider }
          : { success: false, provider: req.provider, error: job.error };
      }
      const safeUrl = sanitizeVideoUrl(data.videoUrl);
      if (safeUrl) {
        return {
          success: true,
          videoUrl: safeUrl,
          provider: req.provider,
        };
      }
    }

    // 2. Direct client-side call if user supplied a free HuggingFace Token
    if (req.provider === "huggingface_wan2" && req.apiKey) {
      const hfRes = await fetch(
        assertAllowedApiEndpoint("https://api-inference.huggingface.co/models/Lightricks/LTX-Video"),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${req.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ inputs: req.prompt }),
          signal,
        }
      );

      if (hfRes.ok) {
        const blob = await hfRes.blob();
        return {
          success: true,
          videoUrl: toBlobUrl(blob),
          provider: "huggingface_ltx_video",
        };
      }
      const errText = await hfRes.text();
      return { success: false, provider: req.provider, error: errText };
    }

    return {
      success: false,
      provider: req.provider,
      error: "NO_API_KEY",
    };
  } catch (err: any) {
    return {
      success: false,
      provider: req.provider,
      error: err?.message || "NETWORK_ERROR",
    };
  }
}
