import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  actForEvent,
  actForPhase,
  cleanStoryName,
  composeBattleStory,
  toStoryFighter,
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
