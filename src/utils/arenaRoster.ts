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
