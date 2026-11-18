/**
 * Pure, stat-driven arena battle resolver (Task 2).
 * No React, no timers, no globals: all randomness comes from an injected RNG.
 */
import { PROB_MIN, WIN_PROB_FLOOR, boundedProb, enforceStatLimits } from "./statBalance";

export interface CombatStats {
  atk: number;
  def: number;
  spd: number;
  regen: number;
  energy: number;
}

/** Used by the 6 curated monsters (and any monster without customStats). */
export const DEFAULT_COMBAT_STATS: CombatStats = Object.freeze({
  atk: 70,
  def: 70,
  spd: 70,
  regen: 70,
  energy: 70,
});

export type Rng = () => number;

export interface BattleEvent {
  round: 1 | 2 | 3 | 4;
  phase: "f1_strike" | "f2_strike" | "clash" | "ko";
  /** Delay (ms) from battle start at which the UI should apply this event. */
  atMs: number;
  hp1: number;
  hp2: number;
  popupTarget: 1 | 2;
  popupText: string;
  logLine: string;
  /** Which fighter's roar to play, if any. */
  roarOf: 1 | 2 | null;
  thumpMs: number;
  /** Fighter performing the strike (null for the head-on clash and the K.O. verdict). */
  attacker: 1 | 2 | null;
  /** Stat-driven special skill name used in this event, if any. */
  skill: string | null;
  /** True when the defender dodged (no damage). */
  evaded: boolean;
}

export interface BattleResult {
  firstAttacker: 1 | 2;
  winner: 1 | 2;
  events: BattleEvent[];
}

export interface FighterInfo {
  nameKo: string;
  customStats?: Partial<CombatStats>;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Deterministic seeded RNG (mulberry32) returning [0, 1). */
export function createSeededRng(seed: number): Rng {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fills missing/invalid stats with defaults and balances them (statBalance.ts): each stat 30..90 with soft
 * compression of extremes, and a shared total budget, so no monster is ever all-powerful or helpless.
 */
export function resolveCombatStats(partial?: Partial<CombatStats> | null): CombatStats {
  // Limits only: fighters' stats were already balanced in the Design Room, so they are not compressed twice.
  return enforceStatLimits(partial);
}

/** Probability that fighter A strikes first. Equal SPD gives 0.5. */
export function firstStrikeProbability(a: CombatStats, b: CombatStats): number {
  return boundedProb(0.5 + (a.spd - b.spd) / 200, 0.15, 0.85);
}

/** Probability that the defender dodges the attacker's hit (never 0: even a slow body can twist away). */
export function evasionProbability(att: CombatStats, def: CombatStats): number {
  return boundedProb(0.08 + (def.spd - att.spd) / 250, PROB_MIN, 0.3);
}

/** Critical-hit probability; ENERGY raises it. */
export function critProbability(att: CombatStats, bonus = 0): number {
  return boundedProb(0.14 + att.energy * 0.003 + bonus, PROB_MIN, 0.6);
}

/**
 * Probability that fighter 1 wins the final verdict from the end-of-round-3 state: remaining HP plus a REGEN/ENERGY
 * comeback bonus. Bounded to WIN_PROB_FLOOR..1-WIN_PROB_FLOOR, so the weaker side always keeps a real chance.
 */
export function finalWinProbability(hp1: number, hp2: number, s1: CombatStats, s2: CombatStats): number {
  const score = (hp: number, s: CombatStats) => hp + s.regen * 0.15 + s.energy * 0.1;
  const p = 0.5 + (score(hp1, s1) - score(hp2, s2)) / 120;
  return boundedProb(p, WIN_PROB_FLOOR, 1 - WIN_PROB_FLOOR);
}

/** Damage of a non-critical hit with base roll in [0, 1). ATK raises, DEF lowers. */
export function hitDamage(att: CombatStats, def: CombatStats, baseRoll: number, crit: boolean): number {
  const base = 18 + Math.floor(clamp(baseRoll, 0, 0.999999) * 17);
  const ratio = 0.5 + att.atk / (att.atk + def.def);
  return Math.min(70, Math.round(base * ratio * (crit ? 2 : 1)));
}

/** HP healed per round from REGEN (0..5). */
export function regenHeal(s: CombatStats): number {
  return Math.round((s.regen / 100) * 5);
}

type AttackKind = "strike" | "counter" | "clash";

export function pickSkillName(att: CombatStats, kind: AttackKind, crit: boolean): string | null {
  if (kind === "counter" && att.energy >= 85) return "⚡ 고전압 스파크 반격";
  if (!crit) return null;
  if (att.atk >= 85 && att.energy >= 70) return "🌋 초고온 마그마 일격";
  if (att.atk >= 85) return "🦷 강철 송곳니 파쇄";
  if (att.spd >= 85) return "🌪️ 음속 연타 질주";
  if (att.def >= 85) return "🛡️ 강철 장갑 돌진";
  if (att.energy >= 85) return "🔮 생체 에너지 폭발";
  return null;
}

interface AttackOutcome {
  evaded: boolean;
  crit: boolean;
  dmg: number;
  skill: string | null;
}

function attack(att: CombatStats, def: CombatStats, rng: Rng, kind: AttackKind, critBonus = 0): AttackOutcome {
  const evaded = rng() < evasionProbability(att, def);
  const crit = rng() < critProbability(att, critBonus);
  const baseRoll = rng();
  if (evaded) return { evaded: true, crit: false, dmg: 0, skill: null };
  const skill = pickSkillName(att, kind, crit);
  let dmg = hitDamage(att, def, baseRoll, crit);
  if (skill) dmg = Math.min(70, Math.round(dmg * 1.15));
  return { evaded: false, crit, dmg, skill };
}

/**
 * Resolves a full 4-round battle. Always terminates (fixed round count),
 * HP stays within 0..100, and the result is deterministic for a given RNG.
 */
export function resolveBattle(f1: FighterInfo, f2: FighterInfo, rng: Rng): BattleResult {
  const s1 = resolveCombatStats(f1.customStats);
  const s2 = resolveCombatStats(f2.customStats);
  const stats = { 1: s1, 2: s2 } as const;
  const names = { 1: f1.nameKo, 2: f2.nameKo } as const;
  let hp1 = 100;
  let hp2 = 100;
  const events: BattleEvent[] = [];

  const apply = (target: 1 | 2, dmg: number, floor: number) => {
    if (target === 1) hp1 = Math.max(floor, hp1 - dmg);
    else hp2 = Math.max(floor, hp2 - dmg);
  };
  const heal = () => {
    hp1 = Math.min(100, hp1 + regenHeal(s1));
    hp2 = Math.min(100, hp2 + regenHeal(s2));
  };
  const dmgText = (o: AttackOutcome) => `-${o.dmg * 10}`;

  const firstAttacker: 1 | 2 = rng() < firstStrikeProbability(s1, s2) ? 1 : 2;
  const secondAttacker: 1 | 2 = firstAttacker === 1 ? 2 : 1;

  // R1: first strike
  const r1 = attack(stats[firstAttacker], stats[secondAttacker], rng, "strike");
  apply(secondAttacker, r1.dmg, 15);
  events.push({
    round: 1,
    phase: firstAttacker === 1 ? "f1_strike" : "f2_strike",
    atMs: 350,
    hp1,
    hp2,
    popupTarget: secondAttacker,
    popupText: r1.evaded
      ? "💨 회피!"
      : r1.skill
        ? `${r1.skill}! ${dmgText(r1)}`
        : r1.crit
          ? `💥 ${dmgText(r1)}! 치명타 선공!`
          : `${dmgText(r1)}! 선제 타격`,
    logLine: r1.evaded
      ? `[R1] ${names[secondAttacker]}이(가) ${names[firstAttacker]}의 선공을 회피!`
      : `[R1] ${names[firstAttacker]}의 ${r1.skill ?? (r1.crit ? "치명타 선공!" : "기습 타격")} (${dmgText(r1)} DMG)`,
    roarOf: firstAttacker,
    thumpMs: 180,
    attacker: firstAttacker,
    skill: r1.skill,
    evaded: r1.evaded,
  });

  // R2: counterattack by the second fighter
  const r2 = attack(stats[secondAttacker], stats[firstAttacker], rng, "counter", 0.1);
  apply(firstAttacker, r2.dmg, 12);
  heal();
  events.push({
    round: 2,
    phase: secondAttacker === 1 ? "f1_strike" : "f2_strike",
    atMs: 1500,
    hp1,
    hp2,
    popupTarget: firstAttacker,
    popupText: r2.evaded
      ? "💨 회피!"
      : r2.skill
        ? `${r2.skill}! ${dmgText(r2)}`
        : r2.crit
          ? `⚡ ${dmgText(r2)}! 극대 반격!`
          : `${dmgText(r2)}! 반격`,
    logLine: r2.evaded
      ? `[R2] ${names[firstAttacker]}이(가) ${names[secondAttacker]}의 반격을 회피!`
      : `[R2] ${names[secondAttacker]}의 ${r2.skill ?? (r2.crit ? "극대 반격!" : "돌진 반격")} (${dmgText(r2)} DMG)`,
    roarOf: secondAttacker,
    thumpMs: 200,
    attacker: secondAttacker,
    skill: r2.skill,
    evaded: r2.evaded,
  });

  // R3: head-on clash (both strike)
  const r3a = attack(s1, s2, rng, "clash");
  const r3b = attack(s2, s1, rng, "clash");
  apply(2, r3a.dmg, 8);
  apply(1, r3b.dmg, 8);
  heal();
  const maxDmg = Math.max(r3a.dmg, r3b.dmg);
  const clashEdge: 1 | 2 = r3b.dmg >= r3a.dmg ? 2 : 1;
  const clashSkill = (clashEdge === 1 ? r3a : r3b).skill;
  events.push({
    round: 3,
    phase: "clash",
    atMs: 2750,
    hp1,
    hp2,
    popupTarget: clashEdge,
    popupText: `💥 정면 대충돌! (-${maxDmg * 10})`,
    logLine: `[R3] 양측 정면 대충돌! 충격파 발생 (-${maxDmg * 10} DMG)${clashSkill ? ` · ${clashSkill}` : ""}`,
    roarOf: null,
    thumpMs: 240,
    attacker: null,
    skill: clashSkill,
    evaded: false,
  });

  // R4: final verdict; REGEN/ENERGY give comeback potential, and neither side is ever certain to win or lose
  const winner: 1 | 2 = rng() < finalWinProbability(hp1, hp2, s1, s2) ? 1 : 2;
  const loser: 1 | 2 = winner === 1 ? 2 : 1;
  const comeback = (winner === 1 ? hp1 < hp2 : hp2 < hp1);
  if (loser === 1) hp1 = 0;
  else hp2 = 0;
  events.push({
    round: 4,
    phase: "ko",
    atMs: 5400,
    hp1,
    hp2,
    popupTarget: loser,
    popupText: "💀 K.O. 필살 일격!",
    logLine: `🏆 [K.O.] ${names[winner]} 최종 승리!${comeback ? " (극적인 역전승!)" : ""}`,
    roarOf: winner,
    thumpMs: 0,
    attacker: null,
    skill: null,
    evaded: false,
  });

  return { firstAttacker, winner, events };
}

// ---------------------------------------------------------------------------
// Element-based special skills (presentation only; resolveBattle() is untouched)
// ---------------------------------------------------------------------------

export type ArenaElement = "fire" | "electric" | "poison" | "acid";

export interface ElementSource {
  id?: string;
  nameEn?: string;
  nameKo?: string;
  promptEn?: string;
  promptKo?: string;
  colorHex?: string;
  customStats?: Partial<CombatStats>;
}

export interface ElementInfo {
  skill: string;
  /** Short English phrase used in the video prompt. */
  promptEn: string;
  /** Hit flash tint used by the arena UI. */
  fx: string;
}

export const ELEMENT_INFO: Readonly<Record<ArenaElement, ElementInfo>> = {
  fire: { skill: "🌋 초고온 마그마 일격", promptEn: "molten magma fire", fx: "rgba(249,115,22,0.6)" },
  electric: { skill: "⚡ 고전압 스파크 반격", promptEn: "high-voltage electric lightning", fx: "rgba(56,189,248,0.6)" },
  poison: { skill: "☠️ 맹독 안개 침투", promptEn: "toxic venom poison mist", fx: "rgba(168,85,247,0.55)" },
  acid: { skill: "🧪 초강산 부식 분사", promptEn: "corrosive acid spray", fx: "rgba(132,204,22,0.55)" },
};

const ELEMENT_KEYWORDS: ReadonlyArray<readonly [ArenaElement, RegExp]> = [
  ["fire", /(화염|용암|마그마|불꽃|fire|flame|lava|magma|ember|inferno|volcan)/i],
  ["electric", /(전기|번개|스파크|볼트|전격|electric|lightning|volt|spark|thunder|storm)/i],
  ["poison", /(맹독|독침|독액|독성|독사|venom|poison|toxic|spore|serpent|viper)/i],
  ["acid", /(산성|부식|키틴|제노|acid|corros|chitin|xeno|slime)/i],
];

/** Hue (0..360) of a #rrggbb color, or null when it is not a valid hex color. */
export function hueOfHex(hex: string | undefined): number | null {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex ?? "").trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d === 0) return null;
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

/**
 * Deterministic element of a fighter, derived from its parts/design text first, then its
 * colorHex hue, then its dominant stat. Never random, never null.
 */
export function detectArenaElement(f: ElementSource): ArenaElement {
  const text = [f.nameEn, f.nameKo, f.promptEn, f.promptKo].filter(Boolean).join(" ");
  for (const [el, re] of ELEMENT_KEYWORDS) if (re.test(text)) return el;
  const hue = hueOfHex(f.colorHex);
  if (hue !== null) {
    if (hue < 45 || hue >= 330) return "fire";
    if (hue < 70) return "electric";
    if (hue < 170) return "acid";
    if (hue < 270) return "electric";
    return "poison";
  }
  const s = resolveCombatStats(f.customStats);
  if (s.energy >= s.atk && s.energy >= s.def) return "electric";
  if (s.atk >= s.def) return "fire";
  if (s.regen >= s.def) return "poison";
  return "acid";
}

export function elementSkillName(el: ArenaElement): string {
  return ELEMENT_INFO[el].skill;
}

/**
 * Skill label to pop up for a battle event. A dodged strike shows none; a head-on clash keeps the
 * resolver's own skill; any landed strike uses the attacker's element skill.
 */
export function resolveEventSkill(
  el: ArenaElement,
  ev: { attacker: 1 | 2 | null; evaded: boolean; skill: string | null },
): string | null {
  if (ev.evaded) return null;
  if (ev.attacker === null) return ev.skill;
  return elementSkillName(el);
}
