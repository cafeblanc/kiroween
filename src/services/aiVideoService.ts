import { COMIC_MONSTERS } from "../data/comicMonsters";
import { assertAllowedApiEndpoint, sanitizeVideoUrl } from "../utils/security";
import { SlidingWindowRateLimiter } from "../utils/rateLimiter";
import { pollLumaJob, LUMA_POLL_TIMEOUT_MS } from "./lumaJobClient";
import type {
  AIVideoGenerator,
  VideoCacheEntry,
  VideoGenerationResponse,
} from "../types/kiroween";

/** Response of generateSixStageSequence, with per-stage URLs for concatenation. */
export interface SixStageGenerationResponse extends VideoGenerationResponse {
  stageUrls?: string[];
}

export const AI_VIDEO_CACHE_KEY = "kiroween_ai_video_cache_v1";
export const AI_VIDEO_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
export const AI_VIDEO_CACHE_MAX_ENTRIES = 50;
export const AI_VIDEO_TIMEOUT_MS = 60_000;
export const STAGE_SECONDS = 2.5;

const videoRateLimiter = new SlidingWindowRateLimiter(10, 60_000);

export function resetVideoRateLimiter(): void {
  videoRateLimiter.reset();
}

const HF_LTX_URL = "https://api-inference.huggingface.co/models/Lightricks/LTX-Video";
const LOG = "[AIVideoGenerator]";

const STAGE_TEMPLATES: string[] = [
  "Stage 1 STEM CELL: a single glowing bioluminescent pluripotent stem cell floating in amniotic fluid, macro microscopy,",
  "Stage 2 CELL DIVISION: rapid mitotic division, spindle fibers, the cell cluster doubling,",
  "Stage 3 EMBRYO: translucent embryo with visible organ primordia and a beating heart,",
  "Stage 4 GROWTH: rapid morphogenesis, limbs and distinctive features protruding and growing,",
  "Stage 5 JUVENILE: juvenile creature moving and flexing inside the bioreactor,",
  "Stage 6 ADULT: fully grown adult creature filling the chamber and roaring,",
];

/** In-memory store for blob: URLs, which cannot survive a page reload. */
const memoryCache = new Map<string, VideoCacheEntry>();

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function readStore(): VideoCacheEntry[] {
  try {
    const raw = localStorage.getItem(AI_VIDEO_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as VideoCacheEntry[]) : [];
  } catch (err) {
    console.error(`${LOG} cache read failed`, err);
    return [];
  }
}

function writeStore(entries: VideoCacheEntry[]): void {
  try {
    localStorage.setItem(AI_VIDEO_CACHE_KEY, JSON.stringify(entries));
  } catch (err) {
    console.error(`${LOG} cache write failed`, err);
  }
}

function isFresh(e: VideoCacheEntry, now: number): boolean {
  return typeof e.expiry === "number" && e.expiry > now;
}

async function checkCache(prompt: string): Promise<string | null> {
  try {
    const hash = await sha256Hex(prompt);
    const now = Date.now();

    const mem = memoryCache.get(hash);
    if (mem && isFresh(mem, now)) return mem.videoUrl;
    if (mem) memoryCache.delete(hash);

    const entries = readStore();
    const fresh = entries.filter((e) => isFresh(e, now));
    if (fresh.length !== entries.length) writeStore(fresh); // purge expired
    return fresh.find((e) => e.promptHash === hash)?.videoUrl ?? null;
  } catch (err) {
    console.error(`${LOG} checkCache failed`, err);
    return null;
  }
}

async function cacheVideo(prompt: string, url: string): Promise<void> {
  try {
    const now = Date.now();
    const entry: VideoCacheEntry = {
      promptHash: await sha256Hex(prompt),
      videoUrl: url,
      timestamp: now,
      expiry: now + AI_VIDEO_CACHE_TTL_MS,
    };

    if (url.startsWith("blob:")) {
      memoryCache.set(entry.promptHash, entry);
      return;
    }

    const entries = readStore()
      .filter((e) => isFresh(e, now) && e.promptHash !== entry.promptHash)
      .concat(entry)
      .sort((a, b) => a.timestamp - b.timestamp);
    writeStore(entries.slice(-AI_VIDEO_CACHE_MAX_ENTRIES));
  } catch (err) {
    console.error(`${LOG} cacheVideo failed`, err);
  }
}

function splitIntoSixStages(prompt: string): string[] {
  const base = prompt.trim();
  return STAGE_TEMPLATES.map(
    (tpl) =>
      `${tpl} ${base}. Documentary scientific timelapse, fixed camera, no camera shake, ${STAGE_SECONDS}s.`,
  );
}

// Last blob URL created per prompt; replaced blobs are revoked so they do not leak.
const blobUrlByPrompt = new Map<string, string>();

function createTrackedBlobUrl(prompt: string, blob: Blob): string {
  const prev = blobUrlByPrompt.get(prompt);
  if (prev) URL.revokeObjectURL(prev);
  const next = URL.createObjectURL(blob);
  blobUrlByPrompt.set(prompt, next);
  return next;
}

function pickVideoUrl(data: any): string | null {
  const url = data?.videoUrl ?? data?.assets?.video ?? data?.video?.url;
  return sanitizeVideoUrl(url);
}

async function generateSingleStage(
  prompt: string,
  provider: string,
  apiKey?: string,
): Promise<string | null> {
  const cached = await checkCache(prompt);
  if (cached) return cached;

  // Client-side DoS guard; null makes callers fall back to the reference video (REQ-9).
  const rl = videoRateLimiter.check("ai-video");
  if (!rl.allowed) {
    console.warn(`${LOG} rate limited, retry in ${Math.ceil(rl.retryAfterMs / 1000)}s`);
    return null;
  }

  const controller = new AbortController();
  // Luma jobs are polled for up to LUMA_POLL_TIMEOUT_MS after the create call.
  const totalTimeout =
    provider === "luma" ? AI_VIDEO_TIMEOUT_MS + LUMA_POLL_TIMEOUT_MS : AI_VIDEO_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), totalTimeout);

  try {
    let url: string | null = null;

    // 1. Server proxy (uses server-side env keys when configured).
    const res = await fetch(assertAllowedApiEndpoint("/api/generate-video"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, provider, apiKey }),
      signal: controller.signal,
    });

    if (res.ok) {
      if ((res.headers.get("content-type") || "").includes("video")) {
        url = createTrackedBlobUrl(prompt, await res.blob());
      } else {
        const data = await res.json();
        if (typeof data?.jobId === "string") {
          const job = await pollLumaJob(data.jobId, apiKey, { signal: controller.signal });
          url = job.ok ? job.videoUrl : null;
          if (!job.ok) console.warn(`${LOG} luma job ended: ${job.error}`);
        } else {
          url = pickVideoUrl(data);
        }
      }
    } else {
      console.warn(`${LOG} proxy responded ${res.status}`);
    }

    // 2. Direct HuggingFace call with a user-supplied token.
    if (!url && provider === "huggingface_wan2" && apiKey) {
      const hf = await fetch(assertAllowedApiEndpoint(HF_LTX_URL), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: prompt }),
        signal: controller.signal,
      });
      if (hf.ok) url = createTrackedBlobUrl(prompt, await hf.blob());
      else console.warn(`${LOG} HuggingFace responded ${hf.status}`);
    }

    if (!url) {
      console.error(`${LOG} no video produced (provider=${provider})`);
      return null;
    }
    await cacheVideo(prompt, url);
    return url;
  } catch (err: any) {
    if (err?.name === "AbortError") {
      console.error(`${LOG} generation timed out after ${AI_VIDEO_TIMEOUT_MS / 1000}s`);
    } else {
      console.error(`${LOG} generation failed`, err);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function generateSixStageSequence(
  monsterId: string,
  provider: string = "huggingface_wan2",
  apiKey?: string,
): Promise<SixStageGenerationResponse> {
  const monster = COMIC_MONSTERS.find((m) => m.id === monsterId);
  if (!monster) {
    const error = `Unknown monster: ${monsterId}`;
    console.error(`${LOG} ${error}`);
    return { success: false, error };
  }

  const prompts = splitIntoSixStages(monster.promptEn);
  const urls: string[] = [];
  for (let i = 0; i < prompts.length; i++) {
    const url = await generateSingleStage(prompts[i], provider, apiKey);
    if (!url) {
      const error = `Stage ${i + 1} generation failed`;
      console.error(`${LOG} ${error}`);
      return { success: false, error };
    }
    urls.push(url);
  }

  return {
    success: true,
    videoUrl: urls[0],
    stageUrls: urls,
    duration: prompts.length * STAGE_SECONDS,
  };
}

export const aiVideoGenerator: AIVideoGenerator = {
  generateSixStageSequence,
  generateSingleStage,
  splitIntoSixStages,
  checkCache,
  cacheVideo,
};

export {
  generateSixStageSequence,
  generateSingleStage,
  splitIntoSixStages,
  checkCache,
  cacheVideo,
};
