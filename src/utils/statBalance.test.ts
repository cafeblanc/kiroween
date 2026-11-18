import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  PROB_MAX,
  PROB_MIN,
  STAT_DEFAULT,
  STAT_KEYS,
  STAT_MAX,
  STAT_MIN,
  STAT_TOTAL_BUDGET,
  WIN_PROB_FLOOR,
  balanceStats,
  boundedProb,
  budgetApplied,
  enforceStatLimits,
  softStat,
  statTotal,
} from "./statBalance";
import {
  createSeededRng,
  critProbability,
  evasionProbability,
  finalWinProbability,
  firstStrikeProbability,
  resolveBattle,
  resolveCombatStats,
} from "./arenaBattle";
import { computeMonsterBioStats, MONSTER_STUDIO_PRESETS, composeDescriptionFromParts } from "../services/customMonsterMediaService";

const anyNum = fc.oneof(fc.double({ noNaN: false }), fc.integer({ min: -1000, max: 1000 }), fc.constant(Infinity));
const rawStats = fc.record({ atk: anyNum, def: anyNum, spd: anyNum, regen: anyNum, energy: anyNum });

describe("balanceStats: never 0, never 100, never all at maximum", () => {
  it("keeps every stat in 30..90, integers, and the total within the budget, for any input", () => {
    fc.assert(
      fc.property(rawStats, (raw) => {
        const s = balanceStats(raw);
        for (const k of STAT_KEYS) {
          expect(Number.isInteger(s[k])).toBe(true);
          expect(s[k]).toBeGreaterThanOrEqual(STAT_MIN);
          expect(s[k]).toBeLessThanOrEqual(STAT_MAX);
        }
        expect(statTotal(s)).toBeLessThanOrEqual(STAT_TOTAL_BUDGET);
      }),
      { numRuns: 400 },
    );
  });

  it("compresses extremes softly instead of cutting them", () => {
    expect(softStat(100)).toBe(90);
    expect(softStat(99)).toBeCloseTo(89.5);
    expect(softStat(80)).toBe(80);
    expect(softStat(40)).toBe(40);
    expect(softStat(20)).toBe(30);
    expect(softStat(0)).toBe(30);
    expect(softStat(Number.NaN)).toBe(STAT_DEFAULT);
    expect(softStat("99")).toBe(STAT_DEFAULT);
  });

  it("maxing everything gives a strong but ordinary monster (all 80), not a god", () => {
    expect(balanceStats({ atk: 99, def: 99, spd: 99, regen: 99, energy: 99 })).toEqual({ atk: 80, def: 80, spd: 80, regen: 80, energy: 80 });
    expect(budgetApplied({ atk: 99, def: 99, spd: 99, regen: 99, energy: 99 })).toBe(true);
  });

  it("one specialised stat can stay high when the others leave room", () => {
    const s = balanceStats({ atk: 99, def: 40, spd: 40, regen: 40, energy: 40 });
    expect(s.atk).toBe(89);
    expect(budgetApplied({ atk: 99, def: 40, spd: 40, regen: 40, energy: 40 })).toBe(false);
  });

  it("raising one stat over the budget lowers the others (trade-off) and keeps the order", () => {
    const a = balanceStats({ atk: 90, def: 90, spd: 90, regen: 90, energy: 60 });
    const b = balanceStats({ atk: 99, def: 90, spd: 90, regen: 90, energy: 60 });
    expect(b.atk).toBeGreaterThanOrEqual(a.atk);
    expect(b.def).toBeLessThanOrEqual(a.def);
    expect(b.atk).toBeGreaterThan(b.def);
    expect(b.def).toBeGreaterThan(b.energy);
  });

  it("missing stats use the default", () => {
    expect(balanceStats(undefined)).toEqual({ atk: 70, def: 70, spd: 70, regen: 70, energy: 70 });
  });

  it("checking balanced stats again never changes them (saved monsters and fighters do not drift)", () => {
    fc.assert(
      fc.property(rawStats, (raw) => {
        const once = balanceStats(raw);
        expect(enforceStatLimits(once)).toEqual(once);
        expect(resolveCombatStats(once)).toEqual(once);
        expect(enforceStatLimits(enforceStatLimits(raw))).toEqual(enforceStatLimits(raw));
      }),
      { numRuns: 300 },
    );
  });

  it("old records with extreme stats are brought inside the limits on load", () => {
    const s = enforceStatLimits({ atk: 99, def: 99, spd: 99, regen: 99, energy: 99 });
    for (const k of STAT_KEYS) expect(s[k]).toBe(80);
    expect(enforceStatLimits({ atk: 0, def: 1, spd: 100 })).toMatchObject({ atk: 30, def: 30, spd: 90 });
  });
});

describe("battle probabilities are never 0% or 100%", () => {
  const statArb = fc.record({
    atk: fc.integer({ min: 0, max: 100 }),
    def: fc.integer({ min: 0, max: 100 }),
    spd: fc.integer({ min: 0, max: 100 }),
    regen: fc.integer({ min: 0, max: 100 }),
    energy: fc.integer({ min: 0, max: 100 }),
  });

  it("first strike, dodge, critical and the final verdict stay inside 5%..95%", () => {
    fc.assert(
      fc.property(statArb, statArb, fc.integer({ min: 0, max: 100 }), fc.integer({ min: 0, max: 100 }), (r1, r2, hp1, hp2) => {
        const a = resolveCombatStats(r1);
        const b = resolveCombatStats(r2);
        for (const p of [firstStrikeProbability(a, b), evasionProbability(a, b), critProbability(a), critProbability(a, 0.1)]) {
          expect(p).toBeGreaterThanOrEqual(PROB_MIN);
          expect(p).toBeLessThanOrEqual(PROB_MAX);
        }
        const w = finalWinProbability(hp1, hp2, a, b);
        expect(w).toBeGreaterThanOrEqual(WIN_PROB_FLOOR);
        expect(w).toBeLessThanOrEqual(1 - WIN_PROB_FLOOR);
      }),
      { numRuns: 400 },
    );
  });

  it("the weakest possible monster still beats the strongest sometimes, and loses more often", () => {
    const weak = { nameKo: "약", customStats: { atk: 0, def: 0, spd: 0, regen: 0, energy: 0 } };
    const strong = { nameKo: "강", customStats: { atk: 99, def: 40, spd: 99, regen: 40, energy: 99 } };
    let weakWins = 0;
    const N = 600;
    for (let i = 1; i <= N; i++) if (resolveBattle(weak, strong, createSeededRng(i)).winner === 1) weakWins++;
    expect(weakWins).toBeGreaterThan(N * 0.05);
    expect(weakWins).toBeLessThan(N * 0.5);
  });

  it("boundedProb never returns 0 or 1", () => {
    expect(boundedProb(0)).toBe(PROB_MIN);
    expect(boundedProb(1)).toBe(PROB_MAX);
    expect(boundedProb(Number.NaN)).toBe(PROB_MIN);
    expect(boundedProb(0.5, 0.1, 0.9)).toBe(0.5);
  });
});

describe("the Design Room's automatic stats use the same balance", () => {
  it("the six samples' default descriptions give stats inside the limits", () => {
    for (const p of MONSTER_STUDIO_PRESETS) {
      const s = computeMonsterBioStats(composeDescriptionFromParts(p, p.defaultParts));
      for (const k of STAT_KEYS) {
        expect(s[k]).toBeGreaterThanOrEqual(STAT_MIN);
        expect(s[k]).toBeLessThanOrEqual(STAT_MAX);
      }
      expect(s.atk + s.def + s.spd + s.regen + s.energy).toBeLessThanOrEqual(STAT_TOTAL_BUDGET);
    }
  });
});
