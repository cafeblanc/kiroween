import type {
  BattleMatrix as BattleMatrixContract,
  BattleVideoMapping,
  MonsterDefinition,
} from '../../../types/kiroween';
import { COMIC_MONSTERS } from '../../../data/comicMonsters';

const BATTLES_DIR = '/videos/battles';

/** Custom (user-designed) monsters always have ids starting with this prefix. */
export const CUSTOM_MONSTER_ID_PREFIX = 'custom_';

/** True for a monster the user designed (id starts with "custom_"). */
export function isCustomFighterId(id: string): boolean {
  return typeof id === 'string' && id.startsWith(CUSTOM_MONSTER_ID_PREFIX);
}

/** Short names used in battle file names where they differ from the monster id suffix. */
const SHORT_NAME_ALIASES: Readonly<Record<string, string>> = {
  xenomorph: 'xeno',
};

/**
 * Pre-made battle videos under public/videos/battles, as unordered pairs of
 * short names ("a_vs_b" in battle_<a>_vs_<b>.mp4). Either fighter order resolves to the file.
 */
export const PREMADE_BATTLES: ReadonlyArray<readonly [string, string]> = [
  ['dragon', 'kraken'],
  ['cerberus', 'hydra'],
  ['xeno', 'frankenstein'],
];

/** "myth_dragon" -> "dragon", "alien_xenomorph" -> "xeno". */
export function toShortName(monsterId: string): string {
  const idx = monsterId.indexOf('_');
  const base = (idx >= 0 ? monsterId.slice(idx + 1) : monsterId).toLowerCase();
  return SHORT_NAME_ALIASES[base] ?? base;
}

function pairKey(f1Id: string, f2Id: string): string {
  return `${f1Id}|${f2Id}`;
}

/**
 * The genuine pre-authored clash video for exactly this pair, or null.
 * Custom monsters and unknown/self pairs never get one.
 */
function premadeUrl(f1Id: string, f2Id: string): string | null {
  if (isCustomFighterId(f1Id) || isCustomFighterId(f2Id)) return null;
  if (f1Id === f2Id) return null;
  const a = toShortName(f1Id);
  const b = toShortName(f2Id);
  const hit = PREMADE_BATTLES.find(
    ([x, y]) => (x === a && y === b) || (x === b && y === a),
  );
  return hit ? `${BATTLES_DIR}/battle_${hit[0]}_vs_${hit[1]}.mp4` : null;
}

let sharedMatrix: BattleMatrix | null = null;

/**
 * Pre-authored battle video for a pair of fighters using a lazily built 16x16 matrix over
 * COMIC_MONSTERS. Returns null (never a generic substitute clip) when either fighter is custom
 * or when no genuine clash video exists for the exact pair; the UI then renders the
 * Dual Confrontation Stage with the two real fighters.
 */
export function getBattleVideoForPair(f1Id: string, f2Id: string): string | null {
  if (!sharedMatrix) {
    sharedMatrix = new BattleMatrix(
      COMIC_MONSTERS.map((m) => ({ id: m.id }) as MonsterDefinition),
    );
  }
  return sharedMatrix.getBattleVideo(f1Id, f2Id);
}

/**
 * 16x16 battle matrix: every ordered pair (f1, f2) with f1 !== f2.
 * For 16 monsters that is 16 * 15 = 240 mappings. Pairs without a pre-made video map to null.
 */
export class BattleMatrix implements BattleMatrixContract {
  private mappings = new Map<string, BattleVideoMapping>();

  constructor(monsters: MonsterDefinition[] = []) {
    if (monsters.length > 0) this.generateMatrix(monsters);
  }

  generateMatrix(monsters: MonsterDefinition[]): void {
    this.mappings = new Map();
    const ids = Array.from(new Set(monsters.map((m) => m.id)));
    for (const f1Id of ids) {
      for (const f2Id of ids) {
        if (f1Id === f2Id) continue;
        const url = premadeUrl(f1Id, f2Id);
        this.mappings.set(pairKey(f1Id, f2Id), {
          f1Id,
          f2Id,
          videoUrl: url,
          isPreMade: url !== null,
        });
      }
    }
  }

  /** Returns the pair's pre-made video URL, or null when none exists (including any custom fighter). */
  getBattleVideo(f1Id: string, f2Id: string): string | null {
    return premadeUrl(f1Id, f2Id);
  }

  getMapping(f1Id: string, f2Id: string): BattleVideoMapping | undefined {
    return this.mappings.get(pairKey(f1Id, f2Id));
  }

  getAllMappings(): BattleVideoMapping[] {
    return Array.from(this.mappings.values());
  }

  get size(): number {
    return this.mappings.size;
  }
}
