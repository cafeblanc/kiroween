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
import { IMAGE_PROMPT_HEAD } from "./customMonsterMediaService";
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
const MIN_FIGHTER_CHARS = 60;
const MAX_STORY_CHARS = 300;
const MIN_FINISH_CHARS = 80;
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

/**
 * The studio's English image prompt wraps the design in fixed boilerplate ("Photorealistic bio-engineered X monster
 * inside a dark sci-fi laboratory bioreactor chamber, ... cinematic studio lighting, ultra detailed creature anatomy,
 * no text"). Keeping it made both fighters' descriptions nearly identical, so the model blended them into one creature.
 * Only the design part in the middle is kept.
 */
export function designFromImagePrompt(promptEn: string | undefined): string {
  const raw = promptEn ?? "";
  // Current format: "<head>; <design>; <stat cues>; <scene>" (composeEnglishMonsterPrompt). Only the design is kept.
  if (raw.trimStart().startsWith(IMAGE_PROMPT_HEAD)) {
    const sections = raw.split(";");
    return sections.length >= 3 ? sections[1].replace(/\s+/g, " ").trim() : "";
  }
  return raw
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^\s*photorealistic bio-engineered .*? monster inside a dark sci-fi laboratory bioreactor chamber,?\s*/i, "")
    .replace(/,?\s*(cinematic studio lighting|ultra detailed creature anatomy|no text)\b.*$/is, "")
    // Stat cues ("ferocious battle-scarred predator, ATK 98, ...") describe numbers, not the creature's look.
    .replace(/,?\s*[^,]*,\s*ATK \d+\b.*$/is, "")
    .replace(/,?\s*ATK \d+\b.*$/is, "")
    .trim();
}

/** Plain colour word for a #rrggbb theme colour, so the two fighters get clearly different visual identifiers. */
export function colorWord(hex: string | undefined): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? "");
  if (!m) return "";
  const n = parseInt(m[1], 16);
  const r = (n >> 16) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  // Low saturation (e.g. slate #64748b) reads as grey, not as a hue.
  if (max - min < 0.12 || (max - min) / max < 0.3) return max > 0.7 ? "pale silver" : max < 0.25 ? "black" : "grey";
  let h = 0;
  if (max === r) h = ((g - b) / (max - min)) % 6;
  else if (max === g) h = (b - r) / (max - min) + 2;
  else h = (r - g) / (max - min) + 4;
  const deg = (h * 60 + 360) % 360;
  if (deg < 15 || deg >= 345) return "crimson red";
  if (deg < 40) return "fiery orange";
  if (deg < 65) return "golden yellow";
  if (deg < 170) return "toxic green";
  if (deg < 200) return "glowing cyan";
  if (deg < 255) return "deep blue";
  if (deg < 300) return "violet purple";
  return "magenta pink";
}

/** Appearance of one fighter for the prompt: colour + its own design text, or a generic line from the name. */
export function describeBattleFighter(f: BattleVideoFighter, fallbackName: string, maxChars = MAX_FIGHTER_CHARS): string {
  const name = cleanName(f.nameEn, fallbackName);
  const color = colorWord(f.colorHex);
  const design = toPromptText(designFromImagePrompt(f.promptEn), maxChars);
  const body = design || "a hulking bio-engineered monster";
  return `${name}, a ${color ? `${color} ` : ""}creature: ${body}`;
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
  const build = (exchangeChars: number, finishChars: number, fighterChars: number) => {
    const exchange = exchangeChars > 20 ? toPromptText(storyEn.act2_clash, exchangeChars) : "";
    const finish = toPromptText(storyEn.act3_finish, finishChars);
    return composeParts(f1, f2, n1, n2, atk1, atk2, exchange, finish, fighterChars);
  };
  // The fixed direction and "no text" sentences must always fit. Shrink the flexible parts in this order:
  // the exchange, then the finish, then the fighter designs (each step only as far as needed).
  let ex = MAX_EXCHANGE_CHARS;
  let fin = MAX_STORY_CHARS;
  let fig = MAX_FIGHTER_CHARS;
  let prompt = build(ex, fin, fig);
  for (let i = 0; i < 6 && prompt.length > MAX_BATTLE_PROMPT_CHARS; i++) {
    const over = prompt.length - MAX_BATTLE_PROMPT_CHARS + 10;
    if (ex > 20) ex = Math.max(0, ex - over);
    else if (fin > MIN_FINISH_CHARS) fin = Math.max(MIN_FINISH_CHARS, fin - over);
    else fig = Math.max(MIN_FIGHTER_CHARS, fig - Math.ceil(over / 2));
    prompt = build(ex, fin, fig);
  }
  return prompt.slice(0, MAX_BATTLE_PROMPT_CHARS);
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function composeParts(
  f1: BattleVideoFighter,
  f2: BattleVideoFighter,
  n1: string,
  n2: string,
  atk1: string,
  atk2: string,
  exchange: string,
  finish: string,
  fighterChars: number,
): string {
  const c1 = colorWord(f1.colorHex);
  const c2 = colorWord(f2.colorHex);
  // Short visual tags reused in every sentence so the model keeps the two creatures apart ("the crimson red left creature").
  const tag1 = `the ${c1 && c1 !== c2 ? `${c1} ` : ""}left creature`;
  const tag2 = `the ${c2 && c2 !== c1 ? `${c2} ` : ""}right creature`;
  // One continuous take (no cuts): the LTX guide recommends it for image-to-video, and cuts let the model re-draw
  // both fighters from text, which turned two different designs into the same creature.
  // Every attack names who attacks, the direction (across the arena), the body part it hits and the reaction:
  // LTX has no negative prompt, and attacks without a target come out as creatures roaring and punching at the camera.
  void n1;
  void n2;
  const parts = [
    "One continuous cinematic take, no cuts, from the first frame: a wide side-view shot of a dark sci-fi bio-lab arena.",
    "Two completely different creatures face each other in profile.",
    `On the left, facing right toward its enemy: ${describeBattleFighter(f1, "the left monster", fighterChars)}.`,
    `On the right, facing left toward its enemy: ${describeBattleFighter(f2, "the right monster", fighterChars)}.`,
    "Each keeps its own colours, body shape, head, horns, limbs and tail; they never merge, swap places or turn into each other.",
    "They never look at or attack toward the camera; every strike and blast travels sideways across the arena into the other creature's body.",
    `They charge and collide: ${tag1} swings its clawed arms into the face and torso of ${tag2}, which is knocked back;`,
    `${tag2} whips its spiked tail into the head of ${tag1}, which reels backward; legs stomp the cracking floor.`,
    `${cap(tag1)} turns its head toward ${tag2}, opens its jaws and fires a flame cannon from its mouth with ${atk1}, hitting ${tag2} in the chest;`,
    `${tag2} fires back from its mouth with ${atk2} and laser beams into the body of ${tag1}.`,
    "The blasts collide between them in sparks, smoke and debris, and every hit visibly shoves its target backward.",
    exchange ? `The exchange: ${exchange}.` : "",
    `The camera tracks sideways for the finish: ${finish || "the winner coils its tail around the loser and slams it down"}.`,
    "Fast handheld side-on action camera, motion blur, photorealistic creatures, no text, no subtitles, no logos.",
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

/** Share of the image height cut from the bottom of each monster image (removes the pollinations.ai watermark). */
export const FIRST_FRAME_CROP_BOTTOM = 0.1;
/** The right fighter is drawn mirrored (images face right), in the first frame and in the arena's right half. */
export const MIRROR_RIGHT_FIGHTER = true;
/** Half-width of the blended dark band between the two monsters in the first frame. */
export const FIRST_FRAME_SEAM_PX = 70;

/**
 * Source rectangle that makes an image cover a box (crop, no letterbox), after cutting `cropBottom` (0..0.5) of its
 * height from the bottom. Pure, for tests.
 */
export function coverSourceRect(
  imgW: number,
  imgH: number,
  boxW: number,
  boxH: number,
  cropBottom = 0,
): { sx: number; sy: number; sw: number; sh: number } {
  const w = Math.max(1, imgW);
  const usableH = Math.max(1, imgH * (1 - Math.min(0.5, Math.max(0, cropBottom))));
  const boxAspect = Math.max(1, boxW) / Math.max(1, boxH);
  if (w / usableH > boxAspect) {
    // Image is wider than the box: keep full usable height, crop the sides around the centre.
    const sw = usableH * boxAspect;
    return { sx: (w - sw) / 2, sy: 0, sw, sh: usableH };
  }
  // Image is taller: keep full width, crop from the top part (heads sit near the top of creature shots).
  const sh = w / boxAspect;
  return { sx: 0, sy: Math.max(0, (usableH - sh) * 0.25), sw: w, sh };
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
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, W, H);
    // One scene, not two framed photos: each monster fills its half edge to edge (cover), with the image's bottom strip
    // cropped off (pollinations.ai stamps its watermark there). The video model then animates a single arena instead of
    // re-drawing the creatures from text.
    const half = W / 2;
    // Monster images face right (composeEnglishMonsterPrompt), so the right fighter is mirrored: from the first frame
    // the two face each other, and the video model attacks across the arena instead of toward the camera.
    for (const [img, x0, mirror] of [[a, 0, false], [b, half, MIRROR_RIGHT_FIGHTER]] as const) {
      const s = coverSourceRect(img.naturalWidth || img.width, img.naturalHeight || img.height, half, H, FIRST_FRAME_CROP_BOTTOM);
      if (mirror) {
        ctx.save();
        ctx.translate(x0 + half, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(img, s.sx, s.sy, s.sw, s.sh, 0, 0, half, H);
        ctx.restore();
      } else {
        ctx.drawImage(img, s.sx, s.sy, s.sw, s.sh, x0, 0, half, H);
      }
    }
    // Blend the seam: a dark band in the middle fades both halves into the same smoky arena.
    const seam = ctx.createLinearGradient(half - FIRST_FRAME_SEAM_PX, 0, half + FIRST_FRAME_SEAM_PX, 0);
    seam.addColorStop(0, "rgba(2,6,23,0)");
    seam.addColorStop(0.5, "rgba(2,6,23,0.85)");
    seam.addColorStop(1, "rgba(2,6,23,0)");
    ctx.fillStyle = seam;
    ctx.fillRect(half - FIRST_FRAME_SEAM_PX, 0, FIRST_FRAME_SEAM_PX * 2, H);
    // Shared lighting: a vignette and a darker floor so both halves read as the same place.
    const vignette = ctx.createRadialGradient(W / 2, H * 0.55, H * 0.35, W / 2, H * 0.55, W * 0.75);
    vignette.addColorStop(0, "rgba(2,6,23,0)");
    vignette.addColorStop(1, "rgba(2,6,23,0.7)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);
    const floor = ctx.createLinearGradient(0, H * 0.78, 0, H);
    floor.addColorStop(0, "rgba(2,6,23,0)");
    floor.addColorStop(1, "rgba(2,6,23,0.75)");
    ctx.fillStyle = floor;
    ctx.fillRect(0, H * 0.78, W, H * 0.22);
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
