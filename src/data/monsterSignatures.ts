/**
 * Signature moves of the six base monsters: one finisher (wins the fight) and one defence (survives one blow).
 * Monsters designed in the Design Room inherit the moves of the preset they were built from.
 * Pure data and lookups (no React), shared by the battle story and the battle video prompt.
 */

export interface SignatureMoves {
  finisherKo: string;
  finisherEn: string;
  /** English gerund phrase for the story and the video prompt ("firing twin laser beams from its eyes ..."). */
  finisherActionEn: string;
  defenseKo: string;
  defenseEn: string;
  defenseActionEn: string;
}

/** Keyed by MonsterStudioPreset.id (the ids stay stable even where a preset was renamed). */
export const PRESET_SIGNATURES: Readonly<Record<string, SignatureMoves>> = {
  myth_dragon: {
    finisherKo: "용암 폭풍 브레스",
    finisherEn: "Lava Storm Breath",
    finisherActionEn: "pouring a two-second torrent of lava-storm breath from its jaws that melts the floor",
    defenseKo: "흑요석 비늘 방패",
    defenseEn: "Obsidian Scale Shield",
    defenseActionEn: "wrapping its wings around its body as an obsidian shield that deflects the blow",
  },
  myth_kraken: {
    finisherKo: "심연 조임",
    finisherEn: "Abyssal Crush",
    finisherActionEn: "wrapping all eight tentacles around the enemy, lifting it high and smashing it into the floor",
    defenseKo: "먹물 연막",
    defenseEn: "Ink Smokescreen",
    defenseActionEn: "spraying a cloud of black ink to vanish and slip away from the blow",
  },
  alien_xenomorph: {
    finisherKo: "용융 유리 창우",
    finisherEn: "Molten Glass Lance Storm",
    finisherActionEn: "firing every crystal lance on its back at once and spraying molten glass from its furnace mouth",
    defenseKo: "압전 반격",
    defenseEn: "Piezo Rebound",
    defenseActionEn: "turning the impact into piezoelectric lightning that blasts back into the attacker",
  },
  alien_void_slug: {
    finisherKo: "플라스마 낫 회오리",
    finisherEn: "Plasma Scythe Cyclone",
    finisherActionEn: "spinning like a cyclone on its six blade legs and slicing with trails of blue nitrogen plasma",
    defenseKo: "육각 세라믹 갑각",
    defenseEn: "Hex Ceramic Carapace",
    defenseActionEn: "locking its hexagonal boron-nitride plates so the strike glances off in sparks",
  },
  myth_frankenstein: {
    finisherKo: "티타늄 해머 펀치",
    finisherEn: "Titanium Hammer Punch",
    finisherActionEn: "clasping both giant fists together and hammering them down so the floor splits open",
    defenseKo: "초재생",
    defenseEn: "Hyper Regeneration",
    defenseActionEn: "closing its wound instantly as glowing cyan tissue knits itself back together",
  },
  human_prometheus: {
    finisherKo: "에메랄드 레이저 눈빛",
    finisherEn: "Emerald Laser Gaze",
    finisherActionEn: "firing twin searing emerald laser beams from its eyes that pierce straight through the enemy",
    defenseKo: "탄성 신체",
    defenseEn: "Elastic Body",
    defenseActionEn: "stretching its body like a cable to bend around the blow and snapping back with a long-reaching punch",
  },
};

/** Moves for a monster that matches no preset. */
export const DEFAULT_SIGNATURE: SignatureMoves = {
  finisherKo: "필살 일격",
  finisherEn: "Signature Strike",
  finisherActionEn: "gathering all its power into one devastating strike that hurls the enemy down",
  defenseKo: "철벽 방어",
  defenseEn: "Iron Guard",
  defenseActionEn: "bracing its whole body to absorb the blow",
};

/** Name keywords (current and earlier preset names) for monsters saved before signatureId existed. */
const NAME_KEYWORDS: ReadonlyArray<readonly [string, RegExp]> = [
  ["myth_dragon", /화염룡|드래곤|dragon/i],
  ["myth_kraken", /크라켄|kraken/i],
  ["alien_xenomorph", /실로크락스|제노모프|silokrax|xenomorph/i],
  ["alien_void_slug", /보르닉스|보이드|레비아탄|bornyx|void|leviathan/i],
  ["myth_frankenstein", /프랑켄|frankenstein/i],
  ["human_prometheus", /프로메테우스|prometheus/i],
];

export interface SignatureSource {
  /** Preset id the monster was designed from (ComicMonster.signatureId). */
  signatureId?: string;
  id?: string;
  nameKo?: string;
  nameEn?: string;
}

/** Preset id for a monster: its signatureId, its own id when it is a preset, else a name match. Null when unknown. */
export function signaturePresetId(m: SignatureSource): string | null {
  for (const key of [m.signatureId, m.id]) if (key && PRESET_SIGNATURES[key]) return key;
  const name = `${m.nameKo ?? ""} ${m.nameEn ?? ""}`;
  for (const [id, re] of NAME_KEYWORDS) if (re.test(name)) return id;
  return null;
}

/** The finisher and defence of a monster (never null: unknown monsters get DEFAULT_SIGNATURE). */
export function signatureFor(m: SignatureSource): SignatureMoves {
  const id = signaturePresetId(m);
  return id ? PRESET_SIGNATURES[id] : DEFAULT_SIGNATURE;
}
