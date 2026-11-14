import { assertAllowedApiEndpoint, sanitizeVideoUrl } from "../utils/security";

export interface VideoGenRequest {
  prompt: string;
  provider: "huggingface_wan2" | "luma" | "replicate";
  apiKey?: string;
}

export interface VideoGenResult {
  success: boolean;
  videoUrl?: string;
  provider: string;
  error?: string;
}

/**
 * Generates a live AI combat or 3D awakening video via HuggingFace (Wan2.1 / LTX-Video)
 * or server-side proxy (/api/generate-video).
 */
export async function generateMonsterVideo(req: VideoGenRequest): Promise<VideoGenResult> {
  try {
    // 1. Try local/Vercel serverless endpoint first (uses server env keys if configured)
    const serverRes = await fetch(assertAllowedApiEndpoint("/api/generate-video"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });

    if (serverRes.ok) {
      const contentType = serverRes.headers.get("content-type") || "";
      if (contentType.includes("video")) {
        const blob = await serverRes.blob();
        return {
          success: true,
          videoUrl: URL.createObjectURL(blob),
          provider: req.provider,
        };
      }
      const data = await serverRes.json();
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
        }
      );

      if (hfRes.ok) {
        const blob = await hfRes.blob();
        return {
          success: true,
          videoUrl: URL.createObjectURL(blob),
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
