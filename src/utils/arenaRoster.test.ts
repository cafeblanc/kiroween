/**
 * Unit: battles are only between designed monsters; the 6 sample monsters never fight.
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { canStartDesignedBattle, isDesignedMonster, opponentsFor, pickArenaFighters } from "./arenaRoster";

const A = { id: "custom_a" };
const B = { id: "custom_b" };
const C = { id: "custom_c" };
const DRAGON = { id: "myth_dragon" };

describe("arena roster", () => {
  it("only designed monsters count", () => {
    expect(isDesignedMonster(A)).toBe(true);
    expect(isDesignedMonster(DRAGON)).toBe(false);
    expect(isDesignedMonster(null)).toBe(false);
  });

  it("needs two different designed monsters", () => {
    expect(canStartDesignedBattle(A, B)).toBe(true);
    expect(canStartDesignedBattle(A, A)).toBe(false);
    expect(canStartDesignedBattle(A, DRAGON)).toBe(false);
    expect(canStartDesignedBattle(DRAGON, { id: "alien_xeno" })).toBe(false);
  });

  it("lists every other designed monster as an opponent", () => {
    expect(opponentsFor([A, B, DRAGON, C], "custom_a")).toEqual([B, C]);
    expect(opponentsFor([A], "custom_a")).toEqual([]);
  });

  it("replaces sample or duplicate fighters from the roster and keeps valid ones", () => {
    expect(pickArenaFighters([A, B], "myth_dragon", "alien_xeno")).toEqual({ f1: A, f2: B });
    expect(pickArenaFighters([A, B, C], "custom_c", "custom_a")).toEqual({ f1: C, f2: A });
    expect(pickArenaFighters([A, B], "custom_a", "custom_a")).toEqual({ f1: A, f2: B });
    expect(pickArenaFighters([A], "myth_dragon", "alien_xeno")).toEqual({ f1: A, f2: undefined });
    expect(pickArenaFighters([], "myth_dragon", "alien_xeno")).toEqual({ f1: undefined, f2: undefined });
  });

  it("never picks a sample monster or the same monster twice", () => {
    const id = fc.oneof(fc.constantFrom("myth_dragon", "alien_xeno", "myth_cerberus"), fc.string().map((s) => `custom_${s}`));
    fc.assert(
      fc.property(fc.uniqueArray(id, { maxLength: 8 }), id, id, (ids, f1, f2) => {
        const { f1: p1, f2: p2 } = pickArenaFighters(ids.map((x) => ({ id: x })), f1, f2);
        if (p1) expect(isDesignedMonster(p1)).toBe(true);
        if (p2) expect(isDesignedMonster(p2)).toBe(true);
        if (p1 && p2) expect(p1.id).not.toBe(p2.id);
      }),
    );
  });
});
