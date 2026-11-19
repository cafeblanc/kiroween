/**
 * Combat stat balance (pure, shared by the Design Room, the vault and the arena).
 *
 * A bio-engineered body has limits: no stat is ever 0 or 100, extreme inputs are compressed instead of cut off,
 * and maxing everything at once is impossible because the stats share one budget (armour costs speed, and so on).
 *   1. Soft knees: the part of a value above STAT_SOFT_HIGH or below STAT_SOFT_LOW counts half.
 *      Input 0..100 therefore maps to STAT_MIN..STAT_MAX (30..90).
 *   2. Total budget: when the five stats add up to more than STAT_TOTAL_BUDGET, every stat's share above STAT_MIN
 *      is scaled down by the same factor (all at maximum -> all 89).
 */

export interface BalancedStats {
  atk: number;
  def: number;
  spd: number;
  regen: number;
  energy: number;
}

export const STAT_KEYS = ["atk", "def", "spd", "regen", "energy"] as const;

/** Lowest and highest value a stat can ever have after balancing. */
export const STAT_MIN = 30;
export const STAT_MAX = 90;
/** Above / below these the input counts half (soft compression instead of a hard cut). */
export const STAT_SOFT_HIGH = 80;
export const STAT_SOFT_LOW = 40;
/**
 * The five stats share this total (user decision: 450, average 90). With STAT_MAX 90 this equals 5 x STAT_MAX, so
 * the budget only guards against out-of-range input; the per-stat limits and the soft knees do the balancing.
 */
export const STAT_TOTAL_BUDGET = 450;
/** Used when a stat is missing or not a finite number. */
export const STAT_DEFAULT = 70;

/** Slider range shown in the Design Room (inputs beyond the effective range are still compressed). */
export const STAT_INPUT_MIN = 20;
export const STAT_INPUT_MAX = 99;

/** Any probability used in a battle stays inside this range: nothing is ever certain or impossible. */
export const PROB_MIN = 0.05;
export const PROB_MAX = 0.95;
/** The final verdict: the weaker fighter keeps at least this chance, the stronger at most 1 - this. */
export const WIN_PROB_FLOOR = 0.1;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** One stat through the soft knees (no budget). Non-finite -> STAT_DEFAULT. Result is in STAT_MIN..STAT_MAX. */
export function softStat(v: unknown): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return STAT_DEFAULT;
  const x = clamp(v, 0, 100);
  let y = x;
  if (x > STAT_SOFT_HIGH) y = STAT_SOFT_HIGH + (x - STAT_SOFT_HIGH) * 0.5;
  else if (x < STAT_SOFT_LOW) y = STAT_SOFT_LOW - (STAT_SOFT_LOW - x) * 0.5;
  return clamp(y, STAT_MIN, STAT_MAX);
}

/**
 * All five stats balanced: soft knees, then the shared budget. Integers, each in STAT_MIN..STAT_MAX,
 * sum <= STAT_TOTAL_BUDGET. Missing or invalid stats become STAT_DEFAULT before balancing.
 */
export function balanceStats(raw?: Partial<Record<(typeof STAT_KEYS)[number], unknown>> | null): BalancedStats {
  const src = raw ?? {};
  return withinBudget(STAT_KEYS.map((k) => softStat(src[k])));
}

/**
 * Limits only (no soft compression): each stat clamped to STAT_MIN..STAT_MAX, then the shared budget.
 * Idempotent, so already balanced stats (saved monsters, arena fighters) never drift when checked again.
 * Use balanceStats() once, where user input becomes stats; use this everywhere stats are read back.
 */
export function enforceStatLimits(raw?: Partial<Record<(typeof STAT_KEYS)[number], unknown>> | null): BalancedStats {
  const src = raw ?? {};
  const vals = STAT_KEYS.map((k) => {
    const v = src[k];
    return typeof v === "number" && Number.isFinite(v) ? clamp(v, STAT_MIN, STAT_MAX) : STAT_DEFAULT;
  });
  return withinBudget(vals);
}

function withinBudget(vals: number[]): BalancedStats {
  let out = vals;
  const total = vals.reduce((a, b) => a + b, 0);
  if (total > STAT_TOTAL_BUDGET) {
    const above = vals.map((v) => v - STAT_MIN);
    const factor = (STAT_TOTAL_BUDGET - STAT_MIN * STAT_KEYS.length) / above.reduce((a, b) => a + b, 0);
    out = above.map((a) => STAT_MIN + a * factor);
  }
  // Round down so rounding can never push the sum over the budget; integers in range are left unchanged.
  const r = out.map((v) => clamp(Math.floor(v + 1e-9), STAT_MIN, STAT_MAX));
  return { atk: r[0], def: r[1], spd: r[2], regen: r[3], energy: r[4] };
}

/** Sum of the five stats. */
export function statTotal(s: BalancedStats): number {
  return STAT_KEYS.reduce((a, k) => a + s[k], 0);
}

/** True when the budget made the stats lower than their soft values (the UI explains the trade-off). */
export function budgetApplied(raw?: Partial<Record<(typeof STAT_KEYS)[number], unknown>> | null): boolean {
  const src = raw ?? {};
  return STAT_KEYS.reduce((a, k) => a + softStat(src[k]), 0) > STAT_TOTAL_BUDGET;
}

/** A probability kept inside PROB_MIN..PROB_MAX (or a narrower lo..hi). Non-finite -> lo. */
export function boundedProb(p: number, lo = PROB_MIN, hi = PROB_MAX): number {
  const l = Math.max(PROB_MIN, lo);
  const h = Math.min(PROB_MAX, hi);
  return Number.isFinite(p) ? clamp(p, l, h) : l;
}
