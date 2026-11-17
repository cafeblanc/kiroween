/**
 * Arena roster rules: battles are only between monsters the user designed (ids starting with "custom_").
 * The 6 sample monsters are for the bioreactor only and never fight. Pure, no React.
 */
export interface RosterMonster {
  id: string;
}

export function isDesignedMonster(m: RosterMonster | null | undefined): boolean {
  return !!m && m.id.startsWith("custom_");
}

/** Two different designed monsters are required for a battle. */
export function canStartDesignedBattle(f1: RosterMonster | null | undefined, f2: RosterMonster | null | undefined): boolean {
  return isDesignedMonster(f1) && isDesignedMonster(f2) && f1!.id !== f2!.id;
}

/** Opponents a designed monster can be matched with: every other designed monster in the roster. */
export function opponentsFor<T extends RosterMonster>(roster: readonly T[], meId: string): T[] {
  return roster.filter((m) => isDesignedMonster(m) && m.id !== meId);
}

/** Left and right fighter ids in the arena; null = empty half. */
export interface ArenaSlots {
  left: string | null;
  right: string | null;
}

export const EMPTY_SLOTS: ArenaSlots = { left: null, right: null };

/**
 * Where a monster that just entered from the Design Room stands: the left half when it is empty, otherwise the right
 * half (replacing whoever stood there). A monster already standing in a slot stays where it is.
 */
export function placeEntrant(slots: ArenaSlots, id: string): ArenaSlots {
  if (slots.left === id || slots.right === id) return slots;
  if (!slots.left) return { ...slots, left: id };
  return { ...slots, right: id };
}

/** Picking from the match list: the same monster cannot stand on both halves (the other half is cleared). */
export function selectSlot(slots: ArenaSlots, side: "left" | "right", id: string | null): ArenaSlots {
  const other = side === "left" ? "right" : "left";
  const next: ArenaSlots = { ...slots, [side]: id };
  if (id && next[other] === id) next[other] = null;
  return next;
}

/** Drops ids that are no longer in the roster (e.g. deleted). */
export function pruneSlots(slots: ArenaSlots, rosterIds: ReadonlySet<string>): ArenaSlots {
  const keep = (id: string | null) => (id && rosterIds.has(id) ? id : null);
  const left = keep(slots.left);
  const right = keep(slots.right);
  return left === slots.left && right === slots.right ? slots : { left, right };
}

/**
 * Keeps the current fighters when they are designed, in the roster and different; otherwise picks replacements
 * from the roster (fighter 1 first). `undefined` means "no suitable monster, leave as is".
 */
export function pickArenaFighters<T extends RosterMonster>(
  roster: readonly T[],
  f1Id: string,
  f2Id: string,
): { f1?: T; f2?: T } {
  const designed = roster.filter(isDesignedMonster);
  const f1 = designed.find((m) => m.id === f1Id) ?? designed[0];
  const f2 = designed.find((m) => m.id === f2Id && m.id !== f1?.id) ?? designed.find((m) => m.id !== f1?.id);
  return { f1, f2 };
}
/**
 * True when a monster has its own generated entrance video (blob:, data: or http URL). Designed monsters without one
 * carry a static /videos/ placeholder clip, which must not be shown as that monster.
 */
export function hasOwnEntranceVideo(videoSrc: string | null | undefined): boolean {
  return !!videoSrc && !videoSrc.startsWith("/videos/");
}