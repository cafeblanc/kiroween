import type {
  BattleMatrix as BattleMatrixContract,
  BattleVideoMapping,
  MonsterDefinition,
} from '../../../types/kiroween';
import { COMIC_MONSTERS } from '../../../data/comicMonsters';

/** Generic battle video used when no pre-made video exists for a pair (no error). */
export const FALLBACK_BATTLE_VIDEO = '/videos/battles/battle_dragon_vs_kraken.mp4';

const BATTLES_DIR = '/videos/battles';

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

function premadeUrl(f1Id: string, f2Id: string): string | null {
  const a = toShortName(f1Id);
  const b = toShortName(f2Id);
  const hit = PREMADE_BATTLES.find(
    ([x, y]) => (x === a && y === b) || (x === b && y === a),
  );
  return hit ? `${BATTLES_DIR}/battle_${hit[0]}_vs_${hit[1]}.mp4` : null;
}

let sharedMatrix: BattleMatrix | null = null;

/**
 * Battle video for a pair of fighters using a lazily built 16x16 matrix over
 * COMIC_MONSTERS. Unknown or missing pairs resolve to FALLBACK_BATTLE_VIDEO.
 */
export function getBattleVideoForPair(f1Id: string, f2Id: string): string {
  if (!sharedMatrix) {
    sharedMatrix = new BattleMatrix(
      COMIC_MONSTERS.map((m) => ({ id: m.id }) as MonsterDefinition),
    );
  }
  return sharedMatrix.getBattleVideo(f1Id, f2Id);
}

/**
 * 16x16 battle matrix: every ordered pair (f1, f2) with f1 !== f2.
 * For 16 monsters that is 16 * 15 = 240 mappings.
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
          videoUrl: url ?? FALLBACK_BATTLE_VIDEO,
          isPreMade: url !== null,
        });
      }
    }
  }

  /** Returns the pair's video URL, or the generic fallback for unknown/missing pairs. */
  getBattleVideo(f1Id: string, f2Id: string): string {
    return (
      this.mappings.get(pairKey(f1Id, f2Id))?.videoUrl ??
      premadeUrl(f1Id, f2Id) ??
      FALLBACK_BATTLE_VIDEO
    );
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
