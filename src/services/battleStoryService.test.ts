import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  actForEvent,
  actForPhase,
  cleanStoryName,
  composeBattleStory,
  instrumentalParticle,
  objectParticle,
  partPhrase,
  subjectParticle,
  toStoryFighter,
  topicParticle,
  withParticle,
  type StoryFighter,
} from './battleStoryService';
import { createSeededRng, resolveBattle, type BattleResult } from '../utils/arenaBattle';
import { COMIC_MONSTERS } from '../data/comicMonsters';

const lines = (s: string) => s.split('\n');

const statArb = fc.integer({ min: 1, max: 100 });
const nameArb = fc.stringMatching(/^[A-Za-z가-힣]{2,12}$/);
const fighterArb: fc.Arbitrary<StoryFighter> = fc.record({
  nameKo: nameArb,
  nameEn: nameArb,
  partsKo: fc.stringMatching(/^[가-힣 ]{0,30}$/),
  partsEn: fc.stringMatching(/^[A-Za-z ]{0,30}$/),
  customStats: fc.record({ atk: statArb, def: statArb, spd: statArb, regen: statArb, energy: statArb }),
});

function story(f1: StoryFighter, f2: StoryFighter, seed: number) {
  const battle = resolveBattle(f1, f2, createSeededRng(seed));
  return { battle, s: composeBattleStory(f1, f2, battle) };
}

describe('composeBattleStory (examples)', () => {
  const f1: StoryFighter = {
    nameKo: '01. 화염룡 드래곤',
    nameEn: '01. Pyroclastic Dragon',
    partsKo: '불꽃 날개와 용암 비늘',
    partsEn: 'ember wings and magma scales',
    customStats: { atk: 95, def: 60, spd: 50, regen: 40, energy: 90 },
  };
  const f2: StoryFighter = { nameKo: '크라켄', nameEn: 'Kraken', customStats: { atk: 60, def: 90, spd: 80, regen: 70, energy: 50 } };

  it('strips the catalog index from names and names the winner in act 3', () => {
    expect(cleanStoryName('01. Pyroclastic Dragon', 'x')).toBe('Pyroclastic Dragon');
    for (let seed = 1; seed <= 20; seed++) {
      const { battle, s } = story(f1, f2, seed);
      const w = battle.winner === 1 ? f1 : f2;
      expect(s.storyEn.act3_finish).toContain(cleanStoryName(w.nameEn, ''));
      expect(s.storyKo.act3_finish).toContain(cleanStoryName(w.nameKo, ''));
      expect(s.textEn).not.toContain('01.');
    }
  });

  it('uses the fighters own part descriptions in act 1', () => {
    const { s } = story(f1, f2, 3);
    expect(s.storyEn.act1).toContain('ember wings and magma scales');
    expect(s.storyKo.act1).toContain('불꽃 날개와 용암 비늘');
  });

  it('puts a special skill name from the events into act 2', () => {
    const battle: BattleResult = {
      firstAttacker: 1,
      winner: 1,
      events: [
        { round: 1, phase: 'f1_strike', atMs: 350, hp1: 100, hp2: 70, popupTarget: 2, popupText: '', logLine: '', roarOf: 1, thumpMs: 0, attacker: 1, skill: '🌋 초고온 마그마 일격', evaded: false },
        { round: 2, phase: 'f2_strike', atMs: 1500, hp1: 80, hp2: 70, popupTarget: 1, popupText: '', logLine: '', roarOf: 2, thumpMs: 0, attacker: 2, skill: null, evaded: true },
        { round: 3, phase: 'clash', atMs: 2750, hp1: 70, hp2: 50, popupTarget: 1, popupText: '', logLine: '', roarOf: null, thumpMs: 0, attacker: null, skill: '🔮 생체 에너지 폭발', evaded: false },
        { round: 4, phase: 'ko', atMs: 5400, hp1: 70, hp2: 0, popupTarget: 2, popupText: '', logLine: '', roarOf: 1, thumpMs: 0, attacker: null, skill: null, evaded: false },
      ],
    };
    const s = composeBattleStory(f1, f2, battle);
    expect(s.storyKo.act2_clash).toContain('🌋 초고온 마그마 일격');
    expect(s.storyEn.act2_clash).toContain('🌋 초고온 마그마 일격');
    expect(s.storyEn.act2_clash).toContain('🔮 생체 에너지 폭발');
    expect(s.storyEn.act2_clash).toContain('dodges');
  });

  it('uses the designed head, arms, legs, tail and torso, the mouth flame cannon and the tail attack', () => {
    const designed: StoryFighter = {
      ...f1,
      bodyParts: {
        head: '뿔 달린 용 머리',
        arms: '티타늄 발톱 팔 + 추가 촉수',
        legs: '용암 근육 다리',
        tail: '전갈 독침 꼬리',
        torso: '흑요석 비늘 흉곽',
      },
    };
    const other: StoryFighter = { ...f2, bodyParts: { head: '심해 머리', tail: '흡반 촉수 꼬리', torso: '갑각 몸통', legs: '갈고리 다리', arms: '여덟 촉수 팔' } };
    // Seeds where the attacker lands both strikes and the designed fighter wins cover every part line.
    const all = Array.from({ length: 60 }, (_, seed) => story(designed, other, seed).s);
    const ko = all.map((s) => s.textKo).join('\n');
    for (const part of ['티타늄 발톱 팔', '전갈 독침 꼬리', '용암 근육 다리', '뿔 달린 용 머리', '흑요석 비늘 흉곽', '여덟 촉수 팔', '흡반 촉수 꼬리']) {
      expect(ko).toContain(part);
    }
    expect(ko).not.toContain('추가 촉수'); // only the first "+" segment is used
    for (const s of all) {
      expect(s.storyKo.act2_clash).toContain('입에서 화염포');
      expect(s.storyEn.act2_clash).toContain('flame cannons');
      expect(s.storyKo.act2_clash).toContain('꼬리');
      expect(s.storyEn.act2_clash).toContain('tail');
      expect(s.storyKo.act3_finish).toContain('화염포');
    }
  });

  it('turns long designed parts into short phrases, never cut mid-word', () => {
    expect(partPhrase('날카로운 송곳니와 용암처럼 빛나는 황금빛 파충류 눈을 가진 용의 머리', '머리', 'head')).toBe('용의 머리');
    expect(partPhrase('초고온 케라틴 비늘 갑옷으로 덮인 거대한 흉곽과 맥동하는 용암 심장', '몸통', 'torso')).toBe('거대한 흉곽');
    expect(partPhrase('뿔 달린 용 머리', '머리', 'head')).toBe('뿔 달린 용 머리');
    expect(partPhrase('강철을 찢는 거대한 발톱과 박쥐 날개막이 연결된 앞다리', '팔', 'arms')).toBe('날개막이 연결된 앞다리');
    expect(partPhrase('지면을 부수는 두꺼운 파충류 뒷다리와 쇠사슬 같은 힘줄', '다리', 'legs')).toBe('두꺼운 파충류 뒷다리');
    expect(partPhrase('끝에 창날 모양의 화염 가시가 달린 길고 묵직한 비늘 꼬리', '꼬리', 'tail')).toBe('묵직한 비늘 꼬리');
    expect(partPhrase('맥동하는 용암 심장', '몸통', 'torso')).toBe('용암 심장 몸통');
    expect(partPhrase('', '꼬리', 'tail')).toBe('꼬리');
    expect(partPhrase('전갈 독침 꼬리 + 추가 촉수', '꼬리', 'tail')).toBe('전갈 독침 꼬리');
  });

  it('picks the Korean particle from the final syllable', () => {
    expect(objectParticle('꼬리')).toBe('를');
    expect(objectParticle('흉곽')).toBe('을');
    expect(objectParticle('Dragon')).toBe('를');
    expect(subjectParticle('드래곤')).toBe('이');
    expect(subjectParticle('레비아탄 커스텀')).toBe('이');
    expect(subjectParticle('키메라')).toBe('가');
    expect(instrumentalParticle('뒷다리')).toBe('로');
    expect(instrumentalParticle('꼬리')).toBe('로');
    expect(instrumentalParticle('발톱')).toBe('으로');
    expect(instrumentalParticle('비늘')).toBe('로');
    expect(withParticle('드래곤')).toBe('과');
    expect(topicParticle('키메라')).toBe('는');
  });

  it('writes no "(를)" / "(가)" style placeholders in the Korean story', () => {
    fc.assert(
      fc.property(fighterArb, fighterArb, fc.integer(), (a, b, seed) => {
        const { s } = story(a, b, seed);
        // A particle placeholder sits right after a word ("꼬리을(를)"); a design tag like " (가)" is content.
        expect(s.textKo).not.toMatch(/[가-힣A-Za-z0-9]\((을|를|이|가|은|는|과|와|으로|로)\)/);
        expect(s.textKo).not.toContain('…');
      }),
    );
  });

  it('falls back to generic part names when a monster has no designed parts', () => {
    const s = story(f1, f2, 3).s;
    expect(s.storyKo.act2_clash).toMatch(/꼬리|팔/);
    expect(s.storyKo.act3_finish).toContain('다리');
  });

  it('maps battle phases to the act to highlight', () => {
    expect(actForPhase('idle')).toBe(1);
    expect(actForPhase('f1_strike')).toBe(2);
    expect(actForPhase('f2_strike')).toBe(2);
    expect(actForPhase('clash')).toBe(2);
    expect(actForPhase('ko')).toBe(3);
    const { battle } = story(f1, f2, 5);
    expect(battle.events.map(actForEvent)).toEqual([2, 2, 2, 3]);
  });

  it('works for curated monsters with default stats (70)', () => {
    const a = toStoryFighter(COMIC_MONSTERS[0]);
    const b = toStoryFighter(COMIC_MONSTERS[1]);
    const { s } = story(a, b, 11);
    expect(lines(s.storyKo.act2_clash).length).toBeGreaterThanOrEqual(2);
    expect(s.textEn.length).toBeGreaterThan(0);
  });

  it('survives empty names and multi-line text', () => {
    const { s } = story({ nameKo: '', nameEn: '  ', partsEn: 'a\nb\n\nc' }, { nameKo: 'x\ny', nameEn: 'x\ny' }, 2);
    expect(lines(s.storyEn.act1).length).toBeLessThanOrEqual(2);
    expect(s.storyEn.act1).toContain('Fighter 1');
  });
});

describe('composeBattleStory (properties)', () => {
  it('always has 3 acts with bounded line counts and both languages', () => {
    fc.assert(
      fc.property(fighterArb, fighterArb, fc.integer(), (f1, f2, seed) => {
        const { s } = story(f1, f2, seed);
        for (const acts of [s.storyKo, s.storyEn]) {
          expect(Object.keys(acts)).toEqual(['act1', 'act2_clash', 'act3_finish']);
          const n1 = lines(acts.act1).length;
          const n2 = lines(acts.act2_clash).length;
          const n3 = lines(acts.act3_finish).length;
          expect(n1).toBeGreaterThanOrEqual(1);
          expect(n1).toBeLessThanOrEqual(2);
          expect(n2).toBeGreaterThanOrEqual(2);
          expect(n2).toBeLessThanOrEqual(3);
          expect(n3).toBeGreaterThanOrEqual(1);
          expect(n3).toBeLessThanOrEqual(2);
          expect(acts.act1.trim()).not.toBe('');
        }
        expect(s.textKo).toContain(s.storyKo.act3_finish);
        expect(s.textEn).toContain(s.storyEn.act1);
        expect(/[가-힣]/.test(s.textKo)).toBe(true);
        expect(/[A-Za-z]/.test(s.textEn)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('names the winner in act 3 (both languages)', () => {
    fc.assert(
      fc.property(fighterArb, fighterArb, fc.integer(), (f1, f2, seed) => {
        const { battle, s } = story(f1, f2, seed);
        const w = battle.winner === 1 ? f1 : f2;
        expect(s.storyKo.act3_finish).toContain(cleanStoryName(w.nameKo, ''));
        expect(s.storyEn.act3_finish).toContain(cleanStoryName(w.nameEn, ''));
      }),
      { numRuns: 100 },
    );
  });

  it('is deterministic for the same input', () => {
    fc.assert(
      fc.property(fighterArb, fighterArb, fc.integer(), (f1, f2, seed) => {
        expect(story(f1, f2, seed).s).toEqual(story(f1, f2, seed).s);
      }),
      { numRuns: 50 },
    );
  });

  it('shows every skill of the strike/counter/clash events in act 2', () => {
    fc.assert(
      fc.property(fighterArb, fighterArb, fc.integer(), (f1, f2, seed) => {
        const { battle, s } = story(f1, f2, seed);
        for (const ev of battle.events.slice(0, 3)) {
          if (ev.skill && !ev.evaded) {
            expect(s.storyKo.act2_clash).toContain(ev.skill);
            expect(s.storyEn.act2_clash).toContain(ev.skill);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('works for any pair of curated monsters with default stats', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: COMIC_MONSTERS.length - 1 }),
        fc.integer({ min: 0, max: COMIC_MONSTERS.length - 1 }),
        fc.integer(),
        (i, j, seed) => {
          const a = toStoryFighter(COMIC_MONSTERS[i]);
          const b = toStoryFighter(COMIC_MONSTERS[j]);
          const { s } = story(a, b, seed);
          expect(lines(s.storyEn.act1).length).toBeLessThanOrEqual(2);
          expect(lines(s.storyKo.act2_clash).length).toBeLessThanOrEqual(3);
        },
      ),
      { numRuns: 60 },
    );
  });
});
