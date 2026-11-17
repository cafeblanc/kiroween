import { generateLtxVideo, type LtxAspect, type LtxJobStatus } from "./ltxJobClient";

export interface VideoGenRequest {
  prompt: string;
  provider: "ltx";
  /** Base64 data URI of the first frame (image-to-video). Omit for text-to-video. */
  image?: string;
  aspect?: LtxAspect;
  /** Local-only: the caller owns (and revokes) any blob URL instead of the shared single-slot tracker. */
  keepBlobUrl?: boolean;
  /** Local-only: aborts job creation, polling and the result download. */
  signal?: AbortSignal;
  /** Local-only: job status callback (queued / processing / completed). */
  onStatus?: (status: LtxJobStatus, elapsedMs: number) => void;
}

export interface VideoGenResult {
  success: boolean;
  videoUrl?: string;
  provider: string;
  error?: string;
}

// Only one generated video is live at a time; revoke the previous blob URL before issuing a new one.
let lastBlobUrl: string | null = null;

function trackBlobUrl(url: string): string {
  if (lastBlobUrl && lastBlobUrl !== url) URL.revokeObjectURL(lastBlobUrl);
  lastBlobUrl = url;
  return url;
}

/**
 * Generates a live AI video with the official LTX-2.5 fast API (1080p) through the server proxy
 * (/api/generate-video): create job -> poll -> result URL (downloaded into a blob: URL when possible).
 */
export async function generateMonsterVideo(fullReq: VideoGenRequest): Promise<VideoGenResult> {
  const { keepBlobUrl, signal, onStatus, ...req } = fullReq;
  const out = await generateLtxVideo({
    prompt: req.prompt,
    image: req.image,
    aspect: req.aspect,
    signal,
    onStatus,
    toBlob: true,
  });
  if (!out.success || !out.videoUrl) {
    return {
      success: false,
      provider: req.provider,
      error: out.code === "NO_API_KEY" ? "NO_API_KEY" : out.error || "NETWORK_ERROR",
    };
  }
  const videoUrl = out.isBlob && !keepBlobUrl ? trackBlobUrl(out.videoUrl) : out.videoUrl;
  return { success: true, videoUrl, provider: req.provider };
}
