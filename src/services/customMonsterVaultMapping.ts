/**
 * Pure helpers that map a custom ComicMonster <-> a KiroweenMonsterVault record.
 * No React and no IndexedDB here, so everything is unit-testable.
 */
import type { ComicMonster } from '../data/comicMonsters';
import type { VaultMonster, VaultMonsterInput } from './monsterVaultService';

/** How many roster entries the arena dropdowns display. The vault itself is unbounded (source of truth). */
export const CUSTOM_ROSTER_DISPLAY_LIMIT = 24;

const FALLBACK_VIDEO = '/videos/chimera_growth_dragon_24s.mp4';
const FALLBACK_AUDIO = '/sounds/monster_roar_ferocious.wav';

/** blob:/data: URLs die with the page (or are too large for meta); everything else can be kept as a plain fallback src. */
export function isEphemeralUrl(url: string | null | undefined): boolean {
  return typeof url === 'string' && /^(blob:|data:)/i.test(url);
}

/** Only these need to be turned into a Blob; relative asset paths (/videos/..., /images/...) are already persistent. */
export function isFetchableMedia(url: string | null | undefined): url is string {
  return typeof url === 'string' && /^(blob:|data:|https?:)/i.test(url);
}

/** Fetches a media URL into a Blob. Returns null on any failure (never throws). */
export async function urlToBlob(
  url: string | null | undefined,
  fetchImpl: typeof fetch = (...a) => fetch(...a),
): Promise<Blob | null> {
  if (!isFetchableMedia(url)) return null;
  try {
    const res = await fetchImpl(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return blob.size > 0 ? blob : null;
  } catch {
    return null;
  }
}

/** JSON-safe meta of a monster. Media that live as Blobs are not repeated here; static paths are kept as fallbacks. */
export function monsterToVaultMeta(m: ComicMonster): Record<string, unknown> {
  const { avatarImg, jumpscareImg, videoSrc, ...rest } = m;
  return {
    ...rest,
    avatarFallback: isEphemeralUrl(avatarImg) ? null : avatarImg,
    jumpscareFallback: isEphemeralUrl(jumpscareImg) ? null : jumpscareImg,
    videoFallback: isEphemeralUrl(videoSrc) ? null : videoSrc,
  };
}

export function monsterToVaultInput(m: ComicMonster, image: Blob | null, video: Blob | null): VaultMonsterInput {
  return { id: m.id, meta: monsterToVaultMeta(m), image, video };
}

const str = (v: unknown, d = ''): string => (typeof v === 'string' ? v : d);
const num = (v: unknown, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);

/** Rebuilds a ComicMonster from a vault record. Returns null when the record is unusable. */
export function vaultToComicMonster(v: VaultMonster): ComicMonster | null {
  const m = v.meta ?? {};
  if (typeof v.id !== 'string' || !v.id || typeof m.nameKo !== 'string' || !m.nameKo) return null;
  const image = v.imageUrl ?? str(m.avatarFallback) ?? '';
  const jump = v.imageUrl ?? str(m.jumpscareFallback) ?? image;
  const stats = m.customStats as Record<string, unknown> | undefined;
  return {
    id: v.id,
    nameEn: str(m.nameEn, str(m.nameKo)),
    nameKo: m.nameKo,
    taglineKo: str(m.taglineKo),
    taglineEn: str(m.taglineEn),
    icon: str(m.icon, '🧬'),
    bpm: num(m.bpm, 100),
    colorHex: str(m.colorHex, '#10b981'),
    badge: str(m.badge, 'CUSTOM AI'),
    promptKo: str(m.promptKo),
    promptEn: str(m.promptEn),
    avatarImg: image,
    jumpscareImg: jump,
    videoSrc: v.videoUrl ?? (str(m.videoFallback) || FALLBACK_VIDEO),
    roarAudio: str(m.roarAudio, FALLBACK_AUDIO),
    funFactKo: str(m.funFactKo),
    funFactEn: str(m.funFactEn),
    ...(stats
      ? {
          customStats: {
            atk: num(stats.atk, 70),
            def: num(stats.def, 70),
            spd: num(stats.spd, 70),
            regen: num(stats.regen, 70),
            energy: num(stats.energy, 70),
          },
        }
      : {}),
  };
}

/** blob: URLs a restored monster owns (to revoke on replacement/unmount). */
export function ownedBlobUrls(monsters: Iterable<ComicMonster>): string[] {
  const out: string[] = [];
  for (const m of monsters) {
    for (const u of [m.avatarImg, m.jumpscareImg, m.videoSrc]) {
      if (typeof u === 'string' && u.startsWith('blob:') && !out.includes(u)) out.push(u);
    }
  }
  return out;
}

/**
 * Merges in-memory roster entries (newest, this session) with restored vault entries, without duplicate ids.
 * In-memory wins on conflict. The result is capped for display only; the vault keeps everything.
 */
export function mergeRoster(
  current: ComicMonster[],
  restored: ComicMonster[],
  limit: number = CUSTOM_ROSTER_DISPLAY_LIMIT,
): ComicMonster[] {
  const seen = new Set<string>();
  const out: ComicMonster[] = [];
  for (const m of [...current, ...restored]) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    out.push(m);
  }
  return limit > 0 ? out.slice(0, limit) : out;
}

/** Prepends a new entry (upsert by id) to the roster, capped for display. */
export function addToRoster(
  prev: ComicMonster[],
  m: ComicMonster,
  limit: number = CUSTOM_ROSTER_DISPLAY_LIMIT,
): ComicMonster[] {
  return mergeRoster([m], prev, limit);
}
