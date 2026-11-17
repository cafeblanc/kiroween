import type {
  ReferenceVideoSelector,
  StageClip,
  VideoSourceResult,
} from "../types/kiroween";
import { sanitizeVideoUrl } from "../utils/security";

/** Stage layout: 6 stages x 2.5s = 15.0s (Requirements 1.1, 2.1). */
export const STAGE_COUNT = 6;
export const STAGE_DURATION_SEC = 2.5;

export const STAGE_LABELS: readonly string[] = [
  "① STEM CELL",
  "② CELL DIVISION",
  "③ EMBRYO",
  "④ ORGANOGENESIS",
  "⑤ JUVENILE",
  "⑥ ADULT",
];

/** Generic biological growth video used when no reference exists for a monster (Requirements 4.2). */
export const FALLBACK_REFERENCE_VIDEO = "/videos/chimera_growth_deepsea_abyss_30s.mp4";

export const FALLBACK_MESSAGE = "Reference video unavailable, using generic growth sequence";

/** Reference videos (existing files under public/videos) keyed by monster id. */
// Incubator footage must be biological growth/awakening, never arena battle clips.
const GROWTH_DRAGON = "/videos/chimera_growth_dragon_24s.mp4";
const GROWTH_KRAKEN = "/videos/chimera_growth_kraken_24s.mp4";
const GROWTH_ABYSS = "/videos/chimera_growth_deepsea_abyss_30s.mp4";
const AWAKENING_CYBER = "/videos/chimera_awakening_cyber.mp4";

export const REFERENCE_VIDEOS: Readonly<Record<string, string>> = {
  myth_dragon: GROWTH_DRAGON,
  myth_kraken: GROWTH_KRAKEN,
  myth_leviathan: GROWTH_ABYSS,
  myth_chimera: GROWTH_DRAGON,
  myth_hydra: GROWTH_KRAKEN,
  myth_cerberus: GROWTH_DRAGON,
  myth_basilisk: GROWTH_DRAGON,
  myth_sphinx: GROWTH_DRAGON,
  myth_frankenstein: AWAKENING_CYBER,
  alien_xenomorph: GROWTH_ABYSS,
  alien_arachno: GROWTH_ABYSS,
  alien_void_slug: GROWTH_ABYSS,
  human_prometheus: "/videos/chimera_awakening_cyber.mp4",
};

/** Splits a reference video into 6 consecutive 2.5s clips covering 0-15s. */
export function extractStageClips(videoUrl: string): StageClip[] {
  return STAGE_LABELS.map((label, i) => ({
    start: i * STAGE_DURATION_SEC,
    end: (i + 1) * STAGE_DURATION_SEC,
    label,
    videoUrl,
  }));
}

export const referenceVideoSelector: ReferenceVideoSelector = {
  select(monsterId: string): VideoSourceResult {
    const reference = Object.prototype.hasOwnProperty.call(REFERENCE_VIDEOS, monsterId)
      ? REFERENCE_VIDEOS[monsterId]
      : undefined;

    const safeReference = sanitizeVideoUrl(reference);
    if (safeReference) {
      return {
        source: "reference",
        videoUrl: safeReference,
        clips: extractStageClips(safeReference),
      };
    }

    console.error(
      `[ReferenceVideoSelector] No reference video for "${monsterId}"; using ${FALLBACK_REFERENCE_VIDEO}`,
    );
    return {
      source: "reference",
      videoUrl: FALLBACK_REFERENCE_VIDEO,
      clips: extractStageClips(FALLBACK_REFERENCE_VIDEO),
      message: FALLBACK_MESSAGE,
    };
  },
};

export default referenceVideoSelector;
