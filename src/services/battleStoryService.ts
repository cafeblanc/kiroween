/**
 * Pure, deterministic battle-story composer (Korean + English, 3 acts).
 * No React, no timers, no randomness: the same input always yields the same story.
 * Built only from the two fighters' own data and the resolveBattle() result.
 */
import {
  resolveCombatStats,
  type BattleEvent,
  type BattleResult,
  type CombatStats,
} from '../utils/arenaBattle';

export interface StoryFighter {
  nameKo: string;
  nameEn: string;
  /** Per-part design description (e.g. ComicMonster.promptKo / promptEn). */
  partsKo?: string;
  partsEn?: string;
  /** Missing stats fall back to the arena default (70). */
  customStats?: Partial<CombatStats>;
}

export interface StoryActs {
  act1: string;
  act2_clash: string;
  act3_finish: string;
}

export interface BattleStory {
  storyKo: StoryActs;
  storyEn: StoryActs;
  /** Acts joined with a blank line, ready for storage / subtitles. */
  textKo: string;
  textEn: string;
}

export type StoryAct = 1 | 2 | 3;
export type StoryPhase = BattleEvent['phase'] | 'idle';

export const ACT_KEYS: Readonly<Record<StoryAct, keyof StoryActs>> = {
  1: 'act1',
  2: 'act2_clash',
  3: 'act3_finish',
};

/**
 * Act to highlight for a battle phase: the confrontation (act 1) before the first blow,
 * the exchange (act 2) during f1_strike / f2_strike / clash, the finish (act 3) on ko.
 */
export function actForPhase(phase: StoryPhase): StoryAct {
  if (phase === 'ko') return 3;
  if (phase === 'idle') return 1;
  return 2;
}

export function actForEvent(ev: Pick<BattleEvent, 'phase'>): StoryAct {
  return actForPhase(ev.phase);
}

/** Collapses whitespace/newlines, drops a leading "01. " index and bounds the length. */
export function cleanStoryName(raw: string | undefined, fallback: string): string {
  const s = (raw ?? '').replace(/\s+/g, ' ').trim().replace(/^\d+\s*[.)]\s*/, '').trim();
  return (s || fallback).slice(0, 40);
}

function cleanParts(raw: string | undefined): string {
  return (raw ?? '').replace(/\s+/g, ' ').trim().slice(0, 60);
}

type StatKey = keyof CombatStats;
const STAT_ORDER: readonly StatKey[] = ['atk', 'def', 'spd', 'regen', 'energy'];

const EPITHET_KO: Record<StatKey, string> = {
  atk: '압도적인 파괴력을 자랑하고',
  def: '강철 같은 방어력을 두르고',
  spd: '번개 같은 속도를 뽐내고',
  regen: '끈질긴 재생력을 과시하고',
  energy: '폭주하는 생체 에너지를 내뿜고',
};
const EPITHET_EN: Record<StatKey, string> = {
  atk: 'radiates overwhelming power',
  def: 'wears steel-like armor',
  spd: 'moves with lightning speed',
  regen: 'shows relentless regeneration',
  energy: 'surges with raging bio-energy',
};

function dominantStat(s: CombatStats): StatKey {
  let best: StatKey = 'atk';
  for (const k of STAT_ORDER) if (s[k] > s[best]) best = k;
  return best;
}

interface Side {
  ko: string;
  en: string;
  partsKo: string;
  partsEn: string;
  top: StatKey;
}

function toSide(f: StoryFighter, fallbackNo: 1 | 2): Side {
  return {
    ko: cleanStoryName(f.nameKo, `괴수 ${fallbackNo}`),
    en: cleanStoryName(f.nameEn, `Fighter ${fallbackNo}`),
    partsKo: cleanParts(f.partsKo),
    partsEn: cleanParts(f.partsEn),
    top: dominantStat(resolveCombatStats(f.customStats)),
  };
}

type Lang = 'ko' | 'en';
const name = (s: Side, l: Lang) => (l === 'ko' ? s.ko : s.en);

function strikeLine(
  l: Lang,
  ev: BattleEvent | undefined,
  att: Side,
  def: Side,
  kind: 'first' | 'counter',
): string {
  const A = name(att, l);
  const D = name(def, l);
  if (l === 'ko') {
    const head = kind === 'first' ? '⚡ 선공' : '↩️ 반격';
    if (ev?.evaded) return `${head}: ${A}의 공격을 ${D}이(가) 간발의 차로 회피한다!`;
    if (ev?.skill) return `${head}: ${A}의 ${ev.skill}! ${D}이(가) 크게 휘청인다.`;
    return kind === 'first'
      ? `${head}: ${A}이(가) 속도로 선수를 쳐 ${D}의 급소를 강타한다.`
      : `${head}: ${A}이(가) 이를 악물고 ${D}에게 돌진 반격을 퍼붓는다.`;
  }
  const head = kind === 'first' ? '⚡ First strike' : '↩️ Counter';
  if (ev?.evaded) return `${head}: ${D} narrowly dodges ${A}'s attack!`;
  if (ev?.skill) return `${head}: ${A} unleashes ${ev.skill}! ${D} reels from the blow.`;
  return kind === 'first'
    ? `${head}: ${A} wins the speed race and slams ${D}'s weak point.`
    : `${head}: ${A} grits its teeth and charges back at ${D}.`;
}

function clashLine(l: Lang, ev: BattleEvent | undefined, s1: Side, s2: Side): string {
  const skill = ev?.skill ?? null;
  if (l === 'ko') {
    return `💥 정면 대충돌: ${s1.ko}와(과) ${s2.ko}의 힘이 부딪쳐 충격파가 터진다${skill ? ` — ${skill}!` : '.'}`;
  }
  return `💥 Head-on clash: ${s1.en} and ${s2.en} collide and a shockwave tears through the arena${skill ? ` — ${skill}!` : '.'}`;
}

function compose(l: Lang, s1: Side, s2: Side, battle: Pick<BattleResult, 'winner' | 'firstAttacker' | 'events'>): StoryActs {
  const sides = { 1: s1, 2: s2 } as const;
  const first = sides[battle.firstAttacker];
  const second = sides[battle.firstAttacker === 1 ? 2 : 1];
  const winner = sides[battle.winner];
  const loser = sides[battle.winner === 1 ? 2 : 1];
  const ev0 = battle.events[0];
  const ev1 = battle.events[1];
  const evClash = battle.events.find((e) => e.phase === 'clash');

  const parts = (s: Side) => {
    const p = l === 'ko' ? s.partsKo : s.partsEn;
    return p ? ` (${p})` : '';
  };
  const epi = (s: Side) => (l === 'ko' ? EPITHET_KO[s.top] : EPITHET_EN[s.top]);

  const act1 =
    l === 'ko'
      ? [
          `🔵 ${s1.ko}${parts(s1)} VS 🔴 ${s2.ko}${parts(s2)} — 두 괴수가 배양 아레나에서 서로를 노려본다.`,
          `${s1.ko}은(는) ${epi(s1)}, ${s2.ko}은(는) ${epi(s2)} 상반된 생체 에너지가 정면으로 맞부딪친다.`,
        ]
      : [
          `🔵 ${s1.en}${parts(s1)} VS 🔴 ${s2.en}${parts(s2)} — the two beasts glare at each other across the bio-arena.`,
          `${s1.en} ${epi(s1)} while ${s2.en} ${epi(s2)}; their clashing bio-energy crackles in the air.`,
        ];

  const act2 = [
    strikeLine(l, ev0, first, second, 'first'),
    strikeLine(l, ev1, second, first, 'counter'),
    clashLine(l, evClash, s1, s2),
  ];

  const act3 =
    l === 'ko'
      ? [
          `💀 ${winner.ko}의 필살 일격이 ${loser.ko}을(를) 쓰러뜨린다 — K.O.!`,
          `🏆 ${winner.ko}의 승리의 포효가 아레나를 뒤흔든다!`,
        ]
      : [
          `💀 ${winner.en} lands the finishing blow and ${loser.en} goes down — K.O.!`,
          `🏆 ${winner.en}'s victory roar shakes the entire arena!`,
        ];

  return { act1: act1.join('\n'), act2_clash: act2.join('\n'), act3_finish: act3.join('\n') };
}

export function joinActs(a: StoryActs): string {
  return [a.act1, a.act2_clash, a.act3_finish].join('\n\n');
}

/** Builds the 3-act story in both languages from the fighters and the resolveBattle() result. */
export function composeBattleStory(
  f1: StoryFighter,
  f2: StoryFighter,
  battle: Pick<BattleResult, 'winner' | 'firstAttacker' | 'events'>,
): BattleStory {
  const s1 = toSide(f1, 1);
  const s2 = toSide(f2, 2);
  const storyKo = compose('ko', s1, s2, battle);
  const storyEn = compose('en', s1, s2, battle);
  return { storyKo, storyEn, textKo: joinActs(storyKo), textEn: joinActs(storyEn) };
}

/** Structural subset of ComicMonster used to build a StoryFighter. */
export interface StoryMonsterSource {
  nameKo: string;
  nameEn: string;
  promptKo?: string;
  promptEn?: string;
  customStats?: Partial<CombatStats>;
}

export function toStoryFighter(m: StoryMonsterSource): StoryFighter {
  return {
    nameKo: m.nameKo,
    nameEn: m.nameEn,
    partsKo: m.promptKo,
    partsEn: m.promptEn,
    customStats: m.customStats,
  };
}
