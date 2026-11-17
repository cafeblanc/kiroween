/**
 * Story-driven LTX battle video between two user-designed monsters.
 *
 * - The prompt (pure, tested) describes both designs, the story's clash and finish, and explicit full-body combat
 *   motion: heads, arms, legs, tails and bodies moving, fire breath and laser beams, impacts and explosions.
 * - The first frame (browser only) puts both monster images side by side on one 16:9 canvas, so LTX
 *   image-to-video animates the user's actual designs instead of inventing creatures from text.
 */
import { detectArenaElement, type ArenaElement, type ElementSource } from "../utils/arenaBattle";
import { plainStoryText } from "../components/bioreactor/arena/clashPrompt";
import { generateMonsterVideo } from "./videoGenService";
import type { LtxDuration, LtxJobStatus } from "./ltxJobClient";

export interface BattleVideoFighter extends ElementSource {
  nameEn: string;
  avatarImg?: string;
}

export interface BattleStoryActsEn {
  act2_clash: string;
  act3_finish: string;
}

/**
 * One multi-shot generation long enough for the 3-act story (LTX-2.5 keeps both creatures consistent across cuts).
 * 12 s at 1080p costs about $1.56 on ltx-2-5-fast; the server allows up to 16 s for a longer try.
 */
export const BATTLE_VIDEO_SECONDS: LtxDuration = 12;
/** Must stay under the server's MAX_PROMPT_CHARS (2000). */
export const MAX_BATTLE_PROMPT_CHARS = 1900;
const MAX_FIGHTER_CHARS = 200;
const MAX_STORY_CHARS = 300;
const MAX_EXCHANGE_CHARS = 360;

/** Signature ranged attack per element; every battle also gets generic fire and laser fire. */
export const ELEMENT_ATTACK_EN: Readonly<Record<ArenaElement, string>> = {
  fire: "molten magma blasts",
  electric: "crackling lightning bolts",
  poison: "jets of toxic venom",
  acid: "corrosive acid sprays",
};

/** Text that must be readable by the video model: no emoji, no Korean/CJK, bounded. */
function toPromptText(text: string | undefined, max: number): string {
  const ascii = plainStoryText(text ?? "")
    .replace(/\[[^\]]*\]/g, " ") // drop "[Combat Stats: ...]" tags
    .replace(/[^\x20-\x7E]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .trim();
  if (ascii.length <= max) return ascii;
  // Cut at the last word boundary so the model never sees half a word.
  const cut = ascii.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:]+$/, "");
}

function cleanName(nameEn: string, fallback: string): string {
  return toPromptText(nameEn.replace(/^\d+\s*[.)]\s*/, ""), 60) || fallback;
}

/** Appearance of one fighter for the prompt: its English design text, or a generic line from the name. */
export function describeBattleFighter(f: BattleVideoFighter, fallbackName: string): string {
  const name = cleanName(f.nameEn, fallbackName);
  const design = toPromptText(f.promptEn, MAX_FIGHTER_CHARS);
  return design ? `${name}, ${design}` : `${name}, a hulking bio-engineered monster`;
}

/**
 * The battle prompt: one chronological paragraph with named cuts, as the LTX-2.5 multi-shot guide asks
 * (https://docs.ltx.io/api-documentation/implementation-guides/prompting-guide.md#multi-shot-prompts).
 * Shot 1 continues the side-by-side first frame (claws and tail attacks), shot 2 is the mouth flame cannon and
 * laser exchange, shot 3 is the story's finish. Fixed sentences are never truncated; only fighter and story text is bounded.
 */
export function composeBattleVideoPrompt(
  f1: BattleVideoFighter,
  f2: BattleVideoFighter,
  storyEn: BattleStoryActsEn,
): string {
  const n1 = cleanName(f1.nameEn, "the left monster");
  const n2 = cleanName(f2.nameEn, "the right monster");
  const atk1 = ELEMENT_ATTACK_EN[detectArenaElement(f1)];
  const atk2 = ELEMENT_ATTACK_EN[detectArenaElement(f2)];
  // Act 2 (the exchange, possibly edited by the user) and act 3 (the finish, which names the winner).
  const finish = toPromptText(storyEn.act3_finish, MAX_STORY_CHARS);
  const build = (exchangeChars: number) => {
    const exchange = exchangeChars > 20 ? toPromptText(storyEn.act2_clash, exchangeChars) : "";
    return composeParts(f1, f2, n1, n2, atk1, atk2, exchange, finish);
  };
  // The exchange is the flexible part: shrink it so the fixed motion and "no text" sentences always fit.
  let prompt = build(MAX_EXCHANGE_CHARS);
  if (prompt.length > MAX_BATTLE_PROMPT_CHARS) {
    prompt = build(MAX_EXCHANGE_CHARS - (prompt.length - MAX_BATTLE_PROMPT_CHARS) - 10);
  }
  return prompt.slice(0, MAX_BATTLE_PROMPT_CHARS);
}

function composeParts(
  f1: BattleVideoFighter,
  f2: BattleVideoFighter,
  n1: string,
  n2: string,
  atk1: string,
  atk2: string,
  exchange: string,
  finish: string,
): string {
  const parts = [
    "A wide shot opens on a dark sci-fi bio-lab arena lit by cold cyan and red rim light.",
    `On the left stands ${describeBattleFighter(f1, "the left monster")}.`,
    `On the right stands ${describeBattleFighter(f2, "the right monster")}.`,
    `The two monsters charge and collide: ${n1} swings its clawed arms and slashes ${n2}'s torso while its legs stomp the cracking floor,`,
    `and ${n2} whips its spiked tail like a scythe, smashing it into ${n1}'s head; their bodies twist and grapple.`,
    "The view cuts to a low-angle medium shot: both monsters rear their heads, open their jaws wide and fire roaring flame cannons from their mouths at each other,",
    `while bright laser beams cross in mid-air; ${n1} unleashes ${atk1} and ${n2} answers with ${atk2},`,
    "exploding into sparks, shockwaves, smoke and flying debris.",
    exchange ? `The exchange unfolds like this: ${exchange}.` : "",
    `A hard cut to a close-up of the finish: ${finish || `the winner coils its tail around the loser and slams it down`}.`,
    "The same two monsters stay recognizable across every cut.",
    "Fast handheld action camera with motion blur, photorealistic creatures, Unreal Engine 5 quality, no text, no subtitles, no logos.",
  ].filter(Boolean);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

/** Fits an image inside a box (contain) and returns the drawn rect. Pure, for tests. */
export function containRect(
  imgW: number,
  imgH: number,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
): { x: number; y: number; w: number; h: number } {
  const scale = Math.min(boxW / Math.max(1, imgW), boxH / Math.max(1, imgH));
  const w = Math.round(imgW * scale);
  const h = Math.round(imgH * scale);
  return { x: Math.round(boxX + (boxW - w) / 2), y: Math.round(boxY + (boxH - h) / 2), w, h };
}

/**
 * Both monsters side by side on a 1280x720 dark arena as a JPEG data URI (well under the 1.5 MB body budget).
 * Returns null when either image cannot be loaded or the canvas is tainted; the caller then uses text-to-video.
 */
export async function composeBattleFirstFrame(img1: string, img2: string): Promise<string | null> {
  if (typeof document === "undefined" || typeof Image === "undefined") return null;
  try {
    const [a, b] = await Promise.all([loadImage(img1), loadImage(img2)]);
    const W = 1280;
    const H = 720;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const bg = ctx.createRadialGradient(W / 2, H * 0.6, 40, W / 2, H / 2, W * 0.7);
    bg.addColorStop(0, "#1e293b");
    bg.addColorStop(1, "#020617");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    const pad = 24;
    const half = W / 2;
    for (const [img, x0] of [[a, 0], [b, half]] as const) {
      const r = containRect(img.naturalWidth || img.width, img.naturalHeight || img.height, x0 + pad, pad, half - pad * 2, H - pad * 2);
      ctx.drawImage(img, r.x, r.y, r.w, r.h);
    }
    return canvas.toDataURL("image/jpeg", 0.85);
  } catch {
    return null;
  }
}

export interface BattleVideoResult {
  success: boolean;
  videoUrl?: string;
  error?: string;
  /** "image": both designs were used as the first frame; "text": text-to-video fallback. */
  mode?: "image" | "text";
}

/** Generates the battle video. The caller owns (and must revoke) a returned blob: URL. */
export async function generateBattleVideo(params: {
  f1: BattleVideoFighter;
  f2: BattleVideoFighter;
  storyEn: BattleStoryActsEn;
  signal?: AbortSignal;
  onStatus?: (status: LtxJobStatus, elapsedMs: number) => void;
}): Promise<BattleVideoResult> {
  const { f1, f2, storyEn, signal, onStatus } = params;
  const frame = f1.avatarImg && f2.avatarImg ? await composeBattleFirstFrame(f1.avatarImg, f2.avatarImg) : null;
  const res = await generateMonsterVideo({
    prompt: composeBattleVideoPrompt(f1, f2, storyEn),
    provider: "ltx",
    image: frame ?? undefined,
    aspect: "16:9",
    duration: BATTLE_VIDEO_SECONDS,
    keepBlobUrl: true,
    signal,
    onStatus,
  });
  if (!res.success || !res.videoUrl) return { success: false, error: res.error };
  return { success: true, videoUrl: res.videoUrl, mode: frame ? "image" : "text" };
}
