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
import { signatureFor } from "../data/monsterSignatures";
import { generateMonsterVideo } from "./videoGenService";
import type { LtxDuration, LtxJobStatus } from "./ltxJobClient";

export interface BattleVideoFighter extends ElementSource {
  nameEn: string;
  avatarImg?: string;
  /** Preset id for the finisher and defence (ComicMonster.signatureId). */
  signatureId?: string;
}

export interface BattleStoryActsEn {
  act2_clash: string;
  act3_finish: string;
}

/**
 * One continuous take long enough for every beat (claws, tail, two spinning kicks, head ram and bite, flame cannon).
 * 16 s is the server maximum; at 1080p on ltx-2-5-fast it costs about $2.08 ($0.13 per second).
 */
export const BATTLE_VIDEO_SECONDS: LtxDuration = 16;
/** Approximate LTX cost of one battle clip in USD, shown on the buttons. */
export const BATTLE_VIDEO_COST_USD = Math.round(BATTLE_VIDEO_SECONDS * 0.13 * 100) / 100;
/** Must stay under the server's MAX_PROMPT_CHARS (2000), with a small margin. */
export const MAX_BATTLE_PROMPT_CHARS = 1980;
const MAX_FIGHTER_CHARS = 200;
const MIN_FIGHTER_CHARS = 30;
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
  return toPromptText(nameEn.replace(/^\d+\s*[.)]\s*/, ""), 40) || fallback;
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
  /** Who wins (resolveBattle): the winner's finisher and the loser's defence go into the climax. */
  winner?: 1 | 2,
): string {
  const n1 = cleanName(f1.nameEn, "the left monster");
  const n2 = cleanName(f2.nameEn, "the right monster");
  const atk1 = ELEMENT_ATTACK_EN[detectArenaElement(f1)];
  const atk2 = ELEMENT_ATTACK_EN[detectArenaElement(f2)];
  // Act 2 (the exchange, possibly edited by the user) and act 3 (the finish, which names the winner).
  const build = (exchangeChars: number, finishChars: number, fighterChars: number) => {
    const exchange = exchangeChars > 20 ? toPromptText(storyEn.act2_clash, exchangeChars) : "";
    const finish = toPromptText(storyEn.act3_finish, finishChars);
    return composeParts(f1, f2, n1, n2, atk1, atk2, exchange, finish, fighterChars, winner);
  };
  // The fixed direction and "no text" sentences must always fit. Shrink the flexible parts in this order:
  // the exchange, then the finish, then the fighter designs (each step only as far as needed).
  // Start each cap at the text's real length, so every shrink step actually removes characters.
  let ex = toPromptText(storyEn.act2_clash, MAX_EXCHANGE_CHARS).length;
  let fin = Math.max(MIN_FINISH_CHARS, toPromptText(storyEn.act3_finish, MAX_STORY_CHARS).length);
  let fig = Math.max(
    MIN_FIGHTER_CHARS,
    ...[f1, f2].map((f) => toPromptText(designFromImagePrompt(f.promptEn), MAX_FIGHTER_CHARS).length),
  );
  let prompt = build(ex, fin, fig);
  for (let i = 0; i < 40 && prompt.length > MAX_BATTLE_PROMPT_CHARS; i++) {
    const over = prompt.length - MAX_BATTLE_PROMPT_CHARS + 10;
    if (ex > 20) ex = Math.max(0, ex - over);
    else if (fin > MIN_FINISH_CHARS) fin = Math.max(MIN_FINISH_CHARS, fin - over);
    else fig = Math.max(MIN_FIGHTER_CHARS, fig - Math.ceil(over / 2));
    prompt = build(ex, fin, fig);
  }
  return prompt.slice(0, MAX_BATTLE_PROMPT_CHARS);
}

/**
 * The last beats. With a known winner: a short mouth-fire exchange, the loser's signature defence holding once, then
 * the winner's signature finisher as the biggest moment (the fight is won with it). Without one: both fire flame
 * cannons that collide.
 */
function climax(
  f1: BattleVideoFighter,
  f2: BattleVideoFighter,
  tag1: string,
  tag2: string,
  atk1: string,
  atk2: string,
  winner?: 1 | 2,
): string[] {
  if (winner !== 1 && winner !== 2) {
    return [
      `the biggest moment: both open their jaws wide and unleash huge roaring flame cannons from their mouths, thick torrents of ${atk1} and ${atk2} held for two full seconds, engulfing each other;`,
      "the torrents collide in a giant fireball that hurls both back; every hit shoves its target back.",
    ];
  }
  const [wf, lf, wTag, lTag] = winner === 1 ? [f1, f2, tag1, tag2] : [f2, f1, tag2, tag1];
  const ws = signatureFor(wf);
  const ls = signatureFor(lf);
  return [
    `${lTag} survives one blow with its defence, ${ls.defenseEn}, ${ls.defenseActionEn};`,
    `then the biggest moment, held for two full seconds: ${wTag} unleashes its finisher, ${ws.finisherEn}, ${ws.finisherActionEn}; every hit shoves its target back.`,
  ];
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
  fighterChars: number,
  winner?: 1 | 2,
): string {
  const c1 = colorWord(f1.colorHex);
  const c2 = colorWord(f2.colorHex);
  // Short visual tags reused in every sentence so the model keeps the two creatures apart ("the crimson red left beast").
  const tag1 = `the ${c1 && c1 !== c2 ? `${c1} ` : ""}left beast`;
  const tag2 = `the ${c2 && c2 !== c1 ? `${c2} ` : ""}right beast`;
  // One continuous take (no cuts): the LTX guide recommends it for image-to-video, and cuts let the model re-draw
  // both fighters from text, which turned two different designs into the same creature.
  // Every attack names who attacks, the direction (across the arena), the body part it hits and the reaction:
  // LTX has no negative prompt, and attacks without a target come out as creatures roaring and punching at the camera.
  void n1;
  void n2;
  const parts = [
    "One continuous take, no cuts: a wide side view of a dark sci-fi arena.",
    "Two completely different creatures, locked in close combat at the centre from the first second.",
    `Left, facing right: ${describeBattleFighter(f1, "the left monster", fighterChars)}.`,
    `Right, facing left: ${describeBattleFighter(f2, "the right monster", fighterChars)}.`,
    "Each keeps its own colours, shape and long massive tail all clip long; they never merge or swap.",
    "They never face or attack the camera; every hit travels sideways into the other's body.",
    "Full speed, no slow motion; they stay in contact trading blows nonstop, each beat a different body part.",
    `At once ${tag1} rakes its claws across the face of ${tag2};`,
    `${tag2} whips its massive spiked tail into the head of ${tag1};`,
    `${tag1} spins a full turn and slams a powerful spinning roundhouse kick into the head of ${tag2}, sending it staggering;`,
    `${tag2} answers with a jumping spinning back kick to the chest of ${tag1};`,
    "these spinning kicks are the heaviest blows, legs in full view (legless creatures spin and strike with tail or tentacles);",
    `${tag1} rams its head into the torso of ${tag2} and bites deep into its neck;`,
    ...climax(f1, f2, tag1, tag2, atk1, atk2, winner),
    exchange ? `The exchange: ${exchange}.` : "",
    `Finish: ${finish || "the winner coils its tail around the loser and slams it down"}.`,
    "Handheld side-on camera, motion blur, photorealistic, no text, no subtitles, no logos.",
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
/** Battle clip playback speed: a little faster than real time so the fight feels snappy (16 s -> about 13 s). */
export const BATTLE_PLAYBACK_RATE = 1.2;
/** The right fighter is drawn mirrored (images face right), in the first frame and in the arena's right half. */
export const MIRROR_RIGHT_FIGHTER = true;
/**
 * Share of the frame width where the two fighters' boxes overlap in the centre of the first frame: the bodies already
 * touch, so the video starts in close combat instead of two creatures moving about on their own.
 */
export const FIRST_FRAME_CONTACT_OVERLAP = 0.22;

/**
 * The two fighters' boxes in the first frame (one shared arena, no halves): each box is wider than half the frame and
 * they overlap in the centre by FIRST_FRAME_CONTACT_OVERLAP. Pure, for tests.
 */
/**
 * Oval mask radius as a share of the monster's drawn width/height, and where the fade-out starts (0..1).
 * Radius 0.5 makes the oval touch the image's edge midpoints, so every edge and corner is fully transparent
 * (a larger radius left a faint horizontal line at the top of each image).
 */
export const FIRST_FRAME_MASK_RADIUS = 0.5;
export const FIRST_FRAME_MASK_SOLID = 0.55;

/**
 * Darkens bright, colourless pixels (white or grey studio backdrops) so they sink into the dark arena instead of
 * forming a bright oval behind the monster. Coloured pixels (fire, glow, skin) are left alone. Pure, for tests.
 */
export function dimBackdropPixel(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const sat = max === 0 ? 0 : (max - min) / max;
  if (lum < 0.55 || sat > 0.22) return [r, g, b];
  // Stronger for brighter and greyer pixels: pure white -> about 20% brightness
  const k = Math.min(1, (lum - 0.55) / 0.35) * (1 - sat / 0.22);
  const f = 1 - 0.8 * k;
  return [Math.round(r * f), Math.round(g * f), Math.round(b * f)];
}

export function battleFrameLayout(W: number, H: number): {
  left: { x: number; w: number; h: number };
  right: { x: number; w: number; h: number };
} {
  const boxW = Math.round(W * (0.5 + FIRST_FRAME_CONTACT_OVERLAP / 2));
  return { left: { x: 0, w: boxW, h: H }, right: { x: W - boxW, w: boxW, h: H } };
}

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

/** Margin kept around the whole body in each half of the first frame. */
export const FIRST_FRAME_BODY_MARGIN = 0.04;

/**
 * Where the whole (uncropped) monster image goes inside one half of the first frame: contain-fit with a small margin,
 * standing on the lower part of the half. Pure, for tests.
 */
export function wholeBodyRect(imgW: number, imgH: number, boxW: number, boxH: number): { x: number; y: number; w: number; h: number } {
  const m = Math.round(Math.min(boxW, boxH) * FIRST_FRAME_BODY_MARGIN);
  const r = containRect(imgW, imgH, m, m, Math.max(1, boxW - 2 * m), Math.max(1, boxH - 2 * m));
  // Feet on the ground: push a short image down toward the bottom margin instead of floating in the middle.
  const y = Math.max(m, boxH - m - r.h - Math.round((boxH - 2 * m - r.h) * 0.15));
  return { ...r, y };
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
    // ONE shared arena, not two halves: a split frame (two backgrounds side by side, a dark band between them) was kept
    // by the video model as a wall for the whole clip. So there is one background, and each monster is laid on it with
    // soft oval edges (its own backdrop fades into the arena; no rectangle, no line).
    const glow = ctx.createRadialGradient(W / 2, H * 0.6, H * 0.05, W / 2, H * 0.6, W * 0.7);
    glow.addColorStop(0, "#1e293b");
    glow.addColorStop(1, "#020617");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    // Monster images face right (composeEnglishMonsterPrompt), so the right fighter is mirrored: the two face each other.
    // Whole body (contain), tail included: a cropped tail was drawn small while fighting and huge once it came into view.
    // The two boxes overlap in the centre (battleFrameLayout), so the bodies already touch: close combat from frame 1.
    const layout = battleFrameLayout(W, H);
    for (const [img, box, mirror] of [[a, layout.left, false], [b, layout.right, MIRROR_RIGHT_FIGHTER]] as const) {
      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;
      const usableH = Math.round(ih * (1 - FIRST_FRAME_CROP_BOTTOM));
      const fit = wholeBodyRect(iw, usableH, box.w, box.h);
      const off = document.createElement("canvas");
      off.width = box.w;
      off.height = box.h;
      const o = off.getContext("2d");
      if (!o) return null;
      if (mirror) {
        o.translate(box.w, 0);
        o.scale(-1, 1);
      }
      o.drawImage(img, 0, 0, iw, usableH, fit.x, fit.y, fit.w, fit.h);
      // White/grey studio backdrops sink into the dark arena (skipped if the canvas cannot be read back)
      try {
        const px = o.getImageData(0, 0, box.w, box.h);
        const d = px.data;
        for (let i = 0; i < d.length; i += 4) {
          const [r, g, bl] = dimBackdropPixel(d[i], d[i + 1], d[i + 2]);
          d[i] = r;
          d[i + 1] = g;
          d[i + 2] = bl;
        }
        o.putImageData(px, 0, 0);
      } catch {
        /* tainted canvas: keep the image as drawn */
      }
      // Soft oval mask: opaque in the middle, fully transparent at the image's edges and corners.
      o.setTransform(1, 0, 0, 1, 0, 0);
      o.globalCompositeOperation = "destination-in";
      const cx = mirror ? box.w - (fit.x + fit.w / 2) : fit.x + fit.w / 2;
      o.translate(cx, fit.y + fit.h / 2);
      o.scale(fit.w * FIRST_FRAME_MASK_RADIUS, fit.h * FIRST_FRAME_MASK_RADIUS);
      const mask = o.createRadialGradient(0, 0, 0, 0, 0, 1);
      mask.addColorStop(0, "rgba(0,0,0,1)");
      mask.addColorStop(FIRST_FRAME_MASK_SOLID, "rgba(0,0,0,1)");
      mask.addColorStop(1, "rgba(0,0,0,0)");
      o.fillStyle = mask;
      o.fillRect(-2, -2, 4, 4);
      ctx.drawImage(off, box.x, 0);
    }
    // Shared lighting: a vignette and a darker floor so the whole frame reads as the same place.
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
  /** Who wins the planned battle: the winner's finisher ends the clip. */
  winner?: 1 | 2;
  signal?: AbortSignal;
  onStatus?: (status: LtxJobStatus, elapsedMs: number) => void;
}): Promise<BattleVideoResult> {
  const { f1, f2, storyEn, winner, signal, onStatus } = params;
  const frame = f1.avatarImg && f2.avatarImg ? await composeBattleFirstFrame(f1.avatarImg, f2.avatarImg) : null;
  const res = await generateMonsterVideo({
    prompt: composeBattleVideoPrompt(f1, f2, storyEn, winner),
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
