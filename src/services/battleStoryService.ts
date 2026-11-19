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
import { signatureFor, type SignatureMoves } from '../data/monsterSignatures';

export interface StoryFighter {
  nameKo: string;
  nameEn: string;
  /** Per-part design description (e.g. ComicMonster.promptKo / promptEn). */
  partsKo?: string;
  partsEn?: string;
  /** Missing stats fall back to the arena default (70). */
  customStats?: Partial<CombatStats>;
  /** Studio body-part text (Korean, as typed). Each part gets a role in the fight. */
  bodyParts?: Partial<Record<StoryPartKey, string>>;
  /** Preset id for the finisher and defence (ComicMonster.signatureId); names are matched when missing. */
  signatureId?: string;
}

export type StoryPartKey = 'head' | 'hornsOrCrown' | 'torso' | 'arms' | 'legs' | 'tail' | 'auraAndSkin';

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

/** Max length of the short design tag in act 1 (cut at a word boundary, never mid-word). */
const PARTS_TAG_MAX_CHARS = 40;

/**
 * Short design tag for act 1: drops "[베이스 종족: …]" / "[Combat Stats …]" tags, bullets, "머리:" style labels and the
 * English studio boilerplate, then keeps whole words up to PARTS_TAG_MAX_CHARS.
 */
function cleanParts(raw: string | undefined): string {
  const text = (raw ?? '')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/^\s*photorealistic bio-engineered .*? monster inside a dark sci-fi laboratory bioreactor chamber,?\s*/i, '')
    .replace(/,?\s*(cinematic studio lighting|ultra detailed creature anatomy|no text)\b.*$/is, '')
    .replace(/[•·]/g, ' ')
    .replace(/(^|\s)[^\s:]{1,12}:\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= PARTS_TAG_MAX_CHARS) return text;
  const cut = text.slice(0, PARTS_TAG_MAX_CHARS);
  const space = cut.lastIndexOf(' ');
  return (space > 10 ? cut.slice(0, space) : cut).replace(/[\s,;:]+$/, '');
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
  /** True when the studio body parts are known (then act 1 shows the short head/tail phrases). */
  hasParts: boolean;
  /** Short Korean noun phrase per part ("용암 비늘 꼬리"), or the generic noun when the part was not designed. */
  part: Record<'head' | 'arms' | 'legs' | 'tail' | 'torso', string>;
  /** Finisher and defence (from the preset the monster was designed from). */
  sig: SignatureMoves;
}

const GENERIC_PART_KO = { head: '머리', arms: '팔', legs: '다리', tail: '꼬리', torso: '몸통' } as const;

/** Words that already name the body part (so "꼬리" is not appended twice). */
const PART_NOUNS_KO: Record<keyof typeof GENERIC_PART_KO, RegExp> = {
  head: /(머리|대가리|두개골|얼굴|주둥이|턱)$/,
  arms: /(팔|앞다리|발톱|촉수|날개|집게|손)$/,
  legs: /(다리|뒷다리|하체|발)$/,
  tail: /(꼬리|독침|채찍)$/,
  torso: /(몸통|흉곽|가슴|등껍질|갑옷|껍질|몸)$/,
};

/** Words kept in front of the part noun: short, punchy phrases ("두꺼운 파충류 뒷다리"). */
export const PART_PHRASE_MODIFIERS = 2;

const TRAILING_PARTICLE = /(으로|과|와|을|를|이|가|은|는|의|로|에|도)$/;

function stripParticle(word: string): string {
  const w = word.replace(/[,.;:!?…]+$/, '');
  const s = w.replace(TRAILING_PARTICLE, '');
  return s.length >= 1 ? s : w;
}

/** Adnominal verb form ("가진", "달린", "연결된", "부수는"): dangling when its object was cut off. */
function isAdnominal(word: string): boolean {
  if (/는$/.test(word)) return true;
  const code = word.slice(-1).charCodeAt(0);
  return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 === 4; // final ㄴ
}

/**
 * Short noun phrase for a designed part, never cut mid-word: the last word that names the part (particle removed)
 * plus up to PART_PHRASE_MODIFIERS words in front of it; a leading verb whose object was cut off is dropped.
 * "날카로운 송곳니와 … 눈을 가진 용의 머리" -> "용의 머리"; "끝에 창날 모양의 … 길고 묵직한 비늘 꼬리" -> "묵직한 비늘 꼬리".
 * When no word names the part, the last two words plus the generic noun are used ("맥동하는 용암 심장" -> "용암 심장 몸통").
 */
export function partPhrase(raw: string | undefined, generic: string, key?: keyof typeof GENERIC_PART_KO): string {
  const first = (raw ?? '').split('+')[0].replace(/[[\]•():]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!first) return generic;
  const words = first.split(' ').filter(Boolean);
  const nounRe = key ? PART_NOUNS_KO[key] : null;
  let at = -1;
  if (nounRe) for (let i = words.length - 1; i >= 0; i--) if (nounRe.test(stripParticle(words[i]))) { at = i; break; }
  if (at < 0) {
    const lastTwo = words.slice(-2).map((w, i, a) => (i === a.length - 1 ? stripParticle(w) : w));
    return `${lastTwo.join(' ')} ${generic}`.trim();
  }
  let start = Math.max(0, at - PART_PHRASE_MODIFIERS);
  let kept = words.slice(start, at);
  if (kept.length > 0 && start > 0 && isAdnominal(kept[0])) {
    const before = words[start - 1];
    if (/(으로|로|을|를|이|가|에|과|와|의)$/.test(before)) {
      // "눈을 | 가진 용의 머리", "갑옷으로 | 덮인 거대한 흉곽": the verb's object was cut off, so drop the verb.
      kept = kept.slice(1);
    } else if (before.length <= 2 && !/(고|게|며|서|히|럼)$/.test(before)) {
      // "뿔 | 달린 용 머리": a bare one-word noun belongs to the verb, so keep it.
      start -= 1;
      kept = words.slice(start, at);
    }
  }
  return [...kept, stripParticle(words[at])].join(' ');
}

/** Korean object particle that matches the final syllable: 을 after a final consonant, 를 otherwise. */
export function objectParticle(word: string): '을' | '를' {
  const ch = word.trim().slice(-1);
  const code = ch.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return '를';
  return (code - 0xac00) % 28 === 0 ? '를' : '을';
}

/** Subject particle: 이 after a final consonant, 가 otherwise. */
export function subjectParticle(word: string): '이' | '가' {
  return objectParticle(word) === '을' ? '이' : '가';
}

/** Instrumental particle: 로 after a vowel or ㄹ, 으로 after other final consonants. */
export function instrumentalParticle(word: string): '로' | '으로' {
  const ch = word.trim().slice(-1);
  const code = ch.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return '로';
  const jong = (code - 0xac00) % 28;
  return jong === 0 || jong === 8 ? '로' : '으로';
}

/** Topic particle: 은 after a final consonant, 는 otherwise. */
export function topicParticle(word: string): '은' | '는' {
  return objectParticle(word) === '을' ? '은' : '는';
}

/** Conjunctive particle: 과 after a final consonant, 와 otherwise. */
export function withParticle(word: string): '과' | '와' {
  return objectParticle(word) === '을' ? '과' : '와';
}

const eul = (w: string) => `${w}${objectParticle(w)}`;
const iga = (w: string) => `${w}${subjectParticle(w)}`;
const ro = (w: string) => `${w}${instrumentalParticle(w)}`;
const eun = (w: string) => `${w}${topicParticle(w)}`;
const gwa = (w: string) => `${w}${withParticle(w)}`;

function toSide(f: StoryFighter, fallbackNo: 1 | 2): Side {
  const bp = f.bodyParts ?? {};
  return {
    sig: signatureFor({ signatureId: f.signatureId, nameKo: f.nameKo, nameEn: f.nameEn }),
    ko: cleanStoryName(f.nameKo, `괴수 ${fallbackNo}`),
    en: cleanStoryName(f.nameEn, `Fighter ${fallbackNo}`),
    partsKo: cleanParts(f.partsKo),
    partsEn: cleanParts(f.partsEn),
    top: dominantStat(resolveCombatStats(f.customStats)),
    hasParts: Boolean(bp.head || bp.tail),
    part: {
      head: partPhrase(bp.head, GENERIC_PART_KO.head, 'head'),
      arms: partPhrase(bp.arms, GENERIC_PART_KO.arms, 'arms'),
      legs: partPhrase(bp.legs, GENERIC_PART_KO.legs, 'legs'),
      tail: partPhrase(bp.tail, GENERIC_PART_KO.tail, 'tail'),
      torso: partPhrase(bp.torso, GENERIC_PART_KO.torso, 'torso'),
    },
  };
}

type Lang = 'ko' | 'en';
const name = (s: Side, l: Lang) => (l === 'ko' ? s.ko : s.en);

/**
 * First strike = claws/arms, counter = tail. Every line names the body part that attacks and the one that is hit,
 * so the story (and the video prompt built from it) is a full-body fight.
 */
function strikeLine(
  l: Lang,
  ev: BattleEvent | undefined,
  att: Side,
  def: Side,
  kind: 'first' | 'counter',
): string {
  const A = name(att, l);
  const D = name(def, l);
  const skill = ev?.skill ? ` — ${ev.skill}!` : '!';
  if (l === 'ko') {
    const head = kind === 'first' ? '⚡ 선공' : '↩️ 반격';
    if (kind === 'first') {
      if (ev?.evaded) return `${head}: ${iga(A)} ${eul(att.part.arms)} 휘두르지만 ${iga(D)} ${ro(def.part.legs)} 박차 올라 피한다!`;
      return `${head}: ${iga(A)} ${eul(att.part.arms)} 휘둘러 ${D}의 ${eul(def.part.torso)} 찢는다${skill}`;
    }
    if (ev?.evaded) return `${head}: ${iga(A)} ${eul(att.part.tail)} 휘두르지만 ${iga(D)} 몸을 비틀어 피한다!`;
    return `${head}: ${iga(A)} ${eul(att.part.tail)} 채찍처럼 휘둘러 ${D}의 ${eul(def.part.head)} 내리친다${skill}`;
  }
  const head = kind === 'first' ? '⚡ First strike' : '↩️ Counter';
  if (kind === 'first') {
    if (ev?.evaded) return `${head}: ${A} swings its claws, but ${D} leaps away on its legs and narrowly dodges!`;
    return `${head}: ${A} slashes its claws across ${D}'s torso${skill}`;
  }
  if (ev?.evaded) return `${head}: ${A} whips its spiked tail, but ${D} twists aside and dodges!`;
  return `${head}: ${A} whips its spiked tail and smashes it into ${D}'s head${skill}`;
}

/** Both monsters fire the mouth flame cannon at once; laser beams cross and a shockwave erupts. */
function clashLine(l: Lang, ev: BattleEvent | undefined, s1: Side, s2: Side): string {
  const skill = ev?.skill ? ` — ${ev.skill}!` : '!';
  if (l === 'ko') {
    return `💥 정면 충돌: ${gwa(s1.ko)} ${iga(s2.ko)} 동시에 입에서 화염포를 쏘고, 레이저가 엇갈리며 충격파가 터진다${skill}`;
  }
  return `💥 Head-on clash: ${s1.en} and ${s2.en} open their jaws and fire flame cannons at each other as laser beams cross and a shockwave erupts${skill}`;
}

/** The loser's signature defence holds against one of the winner's attacks. */
function defenseLine(l: Lang, winner: Side, loser: Side): string {
  if (l === 'ko') {
    return `🛡️ 방어 특기 「${loser.sig.defenseKo}」! ${iga(loser.ko)} ${winner.ko}의 맹공을 한 번 버텨 낸다!`;
  }
  return `🛡️ Defence — ${loser.sig.defenseEn}! ${loser.en} survives ${winner.en}'s onslaught, ${loser.sig.defenseActionEn}!`;
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

  // Short feature tag: the designed head and tail when known, otherwise a few words of the design text.
  const parts = (s: Side) => {
    const p = l === 'ko' ? (s.hasParts ? `${s.part.head} · ${s.part.tail}` : s.partsKo) : s.partsEn;
    return p ? ` (${p})` : '';
  };
  const epi = (s: Side) => (l === 'ko' ? EPITHET_KO[s.top] : EPITHET_EN[s.top]);

  const act1 =
    l === 'ko'
      ? [
          `🔵 ${s1.ko}${parts(s1)} VS 🔴 ${s2.ko}${parts(s2)} — 두 괴수가 서로를 노려본다.`,
          `${eun(s1.ko)} ${epi(s1)}, ${eun(s2.ko)} ${epi(s2)} 생체 에너지가 맞부딪친다.`,
        ]
      : [
          `🔵 ${s1.en}${parts(s1)} VS 🔴 ${s2.en}${parts(s2)} — the two beasts glare at each other across the bio-arena.`,
          `${s1.en} ${epi(s1)} while ${s2.en} ${epi(s2)}; their clashing bio-energy crackles in the air.`,
        ];

  // The loser's defence holds once (the fight stays close); the winner's finisher decides it.
  const act2 = [
    strikeLine(l, ev0, first, second, 'first'),
    strikeLine(l, ev1, second, first, 'counter'),
    clashLine(l, evClash, s1, s2),
    defenseLine(l, winner, loser),
  ];

  const act3 =
    l === 'ko'
      ? [
          `💀 필살기 「${winner.sig.finisherKo}」! ${iga(winner.ko)} ${ro(winner.part.legs)} 땅을 박차고 남은 힘을 모두 모아 ${eul(loser.ko)} 쓰러뜨린다 — K.O.!`,
          `🏆 ${iga(winner.ko)} ${eul(winner.part.head)} 치켜들고 승리의 포효를 터뜨린다!`,
        ]
      : [
          `💀 Finisher — ${winner.sig.finisherEn}! ${winner.en} springs off its legs and ends it, ${winner.sig.finisherActionEn}, and ${loser.en} goes down — K.O.!`,
          `🏆 ${winner.en} raises its head with a victory roar!`,
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
  bodyParts?: Partial<Record<StoryPartKey, string>>;
  signatureId?: string;
  id?: string;
}

export function toStoryFighter(m: StoryMonsterSource): StoryFighter {
  return {
    nameKo: m.nameKo,
    nameEn: m.nameEn,
    partsKo: m.promptKo,
    partsEn: m.promptEn,
    customStats: m.customStats,
    bodyParts: m.bodyParts,
    // A preset monster's own id is its signature id
    signatureId: m.signatureId ?? m.id,
  };
}
