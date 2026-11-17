/**
 * Pure composition of the single LTX "clash" prompt from the two fighters the user picked.
 * No React, no network. Used by the arena's "AI battle cutscene (LTX)" button.
 */
import {
  ELEMENT_INFO,
  detectArenaElement,
  resolveCombatStats,
  type CombatStats,
} from '../../../utils/arenaBattle';

export interface ClashFighter {
  id: string;
  nameEn: string;
  nameKo?: string;
  promptEn?: string;
  colorHex?: string;
  customStats?: { atk: number; def: number; spd: number; regen: number; energy: number };
}

const MAX_FIGHTER_PROMPT_CHARS = 420;
const MAX_CLASH_PROMPT_CHARS = 1400;

/** Cinematic style suffix appended verbatim to every clash prompt. */
export const CLASH_STYLE_SUFFIX =
  'AAA mobile game cinematic battle cutscene, 3D bio-engineered creature clash, dynamic action camera angle, ' +
  'motion blur, glowing bioluminescent energy particles, intense shockwave impact, dramatic rim lighting, ' +
  'photorealistic creature rendering, 4k game trailer quality, no text';

/** Requested clip length (seconds); always inside the 3-5 s cutscene window. */
export const CLASH_MIN_SECONDS = 3;
export const CLASH_MAX_SECONDS = 5;
export const CLASH_CLIP_SECONDS = 4;

// Leaves room for the labels and the suffix so the suffix is never truncated.
const FIGHTER_BUDGET = Math.floor((MAX_CLASH_PROMPT_CHARS - CLASH_STYLE_SUFFIX.length - 70) / 2);

function compact(text: string, max: number): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, max);
}

/** Fighter description: promptEn when present, otherwise built from name and stats. */
export function describeFighterForClash(f: ClashFighter): string {
  const fromPrompt = f.promptEn ? compact(f.promptEn, MAX_FIGHTER_PROMPT_CHARS) : '';
  if (fromPrompt) return fromPrompt;
  const name = compact(f.nameEn || f.nameKo || f.id, 80);
  const s = f.customStats;
  const stats = s
    ? ` (ATK ${s.atk}, DEF ${s.def}, SPD ${s.spd}, REGEN ${s.regen}, ENERGY ${s.energy})`
    : '';
  return `a bio-engineered ${name} monster${stats}`;
}

function statsText(s: CombatStats): string {
  return `ATK ${Math.round(s.atk)}, DEF ${Math.round(s.def)}, SPD ${Math.round(s.spd)}, REGEN ${Math.round(s.regen)}, ENERGY ${Math.round(s.energy)}`;
}

/** Design prompt of one fighter: body parts description + element + combat stats. */
export function describeFighterDesign(f: ClashFighter): string {
  const element = ELEMENT_INFO[detectArenaElement(f)].promptEn;
  const stats = statsText(resolveCombatStats(f.customStats));
  const tail = ` [element: ${element}; stats: ${stats}]`;
  const body = f.promptEn?.trim()
    ? describeFighterForClash(f)
    : compact(describeFighterForClash(f).replace(/\s*\(ATK[^)]*\)/, ''), MAX_FIGHTER_PROMPT_CHARS);
  return compact(body, FIGHTER_BUDGET - tail.length) + tail;
}

/** Clamps a requested clip length into the 3-5 s window (NaN -> default). */
export function clampClashSeconds(sec: number): number {
  if (!Number.isFinite(sec)) return CLASH_CLIP_SECONDS;
  return Math.min(CLASH_MAX_SECONDS, Math.max(CLASH_MIN_SECONDS, sec));
}

/**
 * Playback cap for the generated clip: when the model ignored the duration hint and returned a longer
 * video, the client wraps playback back to 0 once this many seconds have played.
 */
export function shouldWrapClashPlayback(currentTime: number): boolean {
  return Number.isFinite(currentTime) && currentTime >= CLASH_MAX_SECONDS;
}

/** Strips emoji/pictographs and collapses whitespace so story text is safe prompt text. */
export function plainStoryText(text: string): string {
  return text
    .replace(/[\p{Extended_Pictographic}\u200d\ufe0f]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const STORY_CLASH_PREFIX = 'AAA mobile game cinematic battle cutscene, 3D bio-engineered creature clash between ';
const STORY_CLASH_SUFFIX = 'dynamic camera angle, neon shockwaves, 4k game trailer, no text';
const STORY_BODY_BUDGET = 1000;

/**
 * LTX prompt built from the battle story (English acts 2 and 3). Pure; the fixed prefix and
 * suffix are never truncated, only the story body is bounded.
 */
export function composeStoryClashPrompt(
  nameEn1: string,
  nameEn2: string,
  storyEn: { act2_clash: string; act3_finish: string },
): string {
  const n1 = plainStoryText(nameEn1).slice(0, 60) || 'Fighter 1';
  const n2 = plainStoryText(nameEn2).slice(0, 60) || 'Fighter 2';
  const body = plainStoryText(`${plainStoryText(storyEn.act2_clash)}, ${plainStoryText(storyEn.act3_finish)}`)
    .slice(0, STORY_BODY_BUDGET);
  return `${STORY_CLASH_PREFIX}${n1} and ${n2}: ${body}, ${STORY_CLASH_SUFFIX}`;
}

/**
 * Single clash prompt: fighter 1 (left) then fighter 2 (right), each with parts, element and stats,
 * followed by the fixed cinematic suffix. Total length is bounded and the suffix is never cut.
 */
export function composeClashPrompt(f1: ClashFighter, f2: ClashFighter): string {
  return (
    `Fighter 1 on the left: ${describeFighterDesign(f1)}. ` +
    `Fighter 2 on the right: ${describeFighterDesign(f2)}. ` +
    CLASH_STYLE_SUFFIX
  );
}
