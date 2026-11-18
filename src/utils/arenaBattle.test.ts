import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  createSeededRng,
  resolveBattle,
  resolveCombatStats,
  firstStrikeProbability,
  hitDamage,
  pickSkillName,
  DEFAULT_COMBAT_STATS,
  type CombatStats,
} from "./arenaBattle";
import { COMIC_MONSTERS } from "../data/comicMonsters";

const stat = fc.integer({ min: 1, max: 100 });
const statsArb: fc.Arbitrary<CombatStats> = fc.record({
  atk: stat,
  def: stat,
  spd: stat,
  regen: stat,
  energy: stat,
});

describe("arenaBattle", () => {
  it("higher ATK gives higher (or equal) damage and higher SPD gives higher first-strike probability", () => {
    fc.assert(
      fc.property(statsArb, statsArb, fc.double({ min: 0, max: 0.999, noNaN: true }), fc.boolean(), (a, d, roll, crit) => {
        const stronger = { ...a, atk: Math.min(100, a.atk + 10) };
        expect(hitDamage(stronger, d, roll, crit)).toBeGreaterThanOrEqual(hitDamage(a, d, roll, crit));
        const faster = { ...a, spd: Math.min(100, a.spd + 10) };
        expect(firstStrikeProbability(faster, d)).toBeGreaterThanOrEqual(firstStrikeProbability(a, d));
      }),
    );
    const lo = { ...DEFAULT_COMBAT_STATS, atk: 30 };
    const hi = { ...DEFAULT_COMBAT_STATS, atk: 95 };
    expect(hitDamage(hi, DEFAULT_COMBAT_STATS, 0.5, false)).toBeGreaterThan(hitDamage(lo, DEFAULT_COMBAT_STATS, 0.5, false));
    expect(firstStrikeProbability({ ...DEFAULT_COMBAT_STATS, spd: 95 }, DEFAULT_COMBAT_STATS)).toBeGreaterThan(0.5);
  });

  it("faster fighter strikes first more often over many seeded battles", () => {
    let fastFirst = 0;
    for (let i = 1; i <= 400; i++) {
      const r = resolveBattle({ nameKo: "A", customStats: { spd: 95 } }, { nameKo: "B", customStats: { spd: 30 } }, createSeededRng(i));
      if (r.firstAttacker === 1) fastFirst++;
    }
    expect(fastFirst).toBeGreaterThan(240);
  });

  it("is deterministic for the same seed", () => {
    const a = { nameKo: "A", customStats: { atk: 90, energy: 90 } };
    const b = { nameKo: "B" };
    expect(resolveBattle(a, b, createSeededRng(42))).toEqual(resolveBattle(a, b, createSeededRng(42)));
  });

  it("always terminates with 4 events, HP within 0..100 and a K.O. loser at 0", () => {
    fc.assert(
      fc.property(statsArb, statsArb, fc.integer(), (s1, s2, seed) => {
        const r = resolveBattle({ nameKo: "A", customStats: s1 }, { nameKo: "B", customStats: s2 }, createSeededRng(seed));
        expect(r.events).toHaveLength(4);
        for (const e of r.events) {
          expect(e.hp1).toBeGreaterThanOrEqual(0);
          expect(e.hp2).toBeGreaterThanOrEqual(0);
          expect(e.hp1).toBeLessThanOrEqual(100);
          expect(e.hp2).toBeLessThanOrEqual(100);
        }
        const ko = r.events[3];
        expect(r.winner === 1 ? ko.hp2 : ko.hp1).toBe(0);
        expect(r.winner === 1 ? ko.hp1 : ko.hp2).toBeGreaterThan(0);
      }),
    );
  });

  it("curated monsters without customStats resolve to defaults and battle fine", () => {
    expect(resolveCombatStats(undefined)).toEqual(DEFAULT_COMBAT_STATS);
    // Out-of-range input is balanced (statBalance.ts), never 100
    expect(resolveCombatStats({ atk: NaN, def: 500 })).toMatchObject({ atk: 70, def: 90 });
    const [m1, m2] = COMIC_MONSTERS;
    const r = resolveBattle(m1, m2, createSeededRng(7));
    expect(r.events.map((e) => e.round)).toEqual([1, 2, 3, 4]);
    expect(r.events.every((e) => e.logLine.length > 0)).toBe(true);
  });

  it("emits named special skills from stats", () => {
    expect(pickSkillName({ ...DEFAULT_COMBAT_STATS, atk: 90, energy: 80 }, "strike", true)).toContain("마그마");
    expect(pickSkillName({ ...DEFAULT_COMBAT_STATS, energy: 90 }, "counter", false)).toContain("스파크");
    expect(pickSkillName(DEFAULT_COMBAT_STATS, "strike", true)).toBeNull();
  });
});
