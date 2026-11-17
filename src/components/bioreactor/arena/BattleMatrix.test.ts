import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  BattleMatrix,
  getBattleVideoForPair,
  isCustomFighterId,
  PREMADE_BATTLES,
  toShortName,
} from './BattleMatrix';
import { composeClashPrompt, describeFighterForClash } from './clashPrompt';
import { COMIC_MONSTERS } from '../../../data/comicMonsters';
import type { MonsterDefinition } from '../../../types/kiroween';

const MONSTERS = COMIC_MONSTERS.map((m) => ({ id: m.id })) as unknown as MonsterDefinition[];
const ids = MONSTERS.map((m) => m.id);
const PREMADE_URL = /^\/videos\/battles\/battle_[a-z]+_vs_[a-z]+\.mp4$/;

describe('BattleMatrix generation (REQ-8)', () => {
  const matrix = new BattleMatrix(MONSTERS);

  it('uses 16 monsters and generates 240 ordered pairs without self-pairs', () => {
    expect(MONSTERS).toHaveLength(16);
    expect(matrix.size).toBe(240);
    const keys = matrix.getAllMappings().map((m) => `${m.f1Id}|${m.f2Id}`);
    expect(new Set(keys).size).toBe(240);
    expect(matrix.getAllMappings().every((m) => m.f1Id !== m.f2Id)).toBe(true);
  });

  it('ignores duplicate ids and regenerates cleanly', () => {
    const m = new BattleMatrix();
    expect(m.size).toBe(0);
    m.generateMatrix([...MONSTERS, ...MONSTERS]);
    expect(m.size).toBe(240);
    m.generateMatrix(MONSTERS.slice(0, 3));
    expect(m.size).toBe(6);
  });
});

describe('curated pairs behave predictably', () => {
  const matrix = new BattleMatrix(MONSTERS);

  it('maps short names, including the xenomorph alias', () => {
    expect(toShortName('myth_dragon')).toBe('dragon');
    expect(toShortName('alien_xenomorph')).toBe('xeno');
  });

  it('selects the three pre-made clashes in either fighter order', () => {
    const expected: Array<[string, string, string]> = [
      ['myth_dragon', 'myth_kraken', '/videos/battles/battle_dragon_vs_kraken.mp4'],
      ['myth_cerberus', 'myth_hydra', '/videos/battles/battle_cerberus_vs_hydra.mp4'],
      ['alien_xenomorph', 'myth_frankenstein', '/videos/battles/battle_xeno_vs_frankenstein.mp4'],
    ];
    for (const [a, b, url] of expected) {
      expect(matrix.getBattleVideo(a, b)).toBe(url);
      expect(matrix.getBattleVideo(b, a)).toBe(url);
      expect(getBattleVideoForPair(a, b)).toBe(url);
      expect(getBattleVideoForPair(b, a)).toBe(url);
    }
  });

  it('exactly the pre-made pairs (both orders) are flagged, all others are null', () => {
    const premade = matrix.getAllMappings().filter((m) => m.isPreMade);
    expect(premade).toHaveLength(PREMADE_BATTLES.length * 2);
    for (const m of matrix.getAllMappings()) {
      if (m.isPreMade) expect(m.videoUrl).toMatch(PREMADE_URL);
      else expect(m.videoUrl).toBeNull();
    }
  });

  it('never substitutes a generic clip: pairs without a clash video, unknown ids and self-pairs are null', () => {
    expect(matrix.getBattleVideo('myth_phoenix', 'myth_griffin')).toBeNull();
    expect(matrix.getBattleVideo('myth_dragon', 'myth_phoenix')).toBeNull();
    expect(matrix.getBattleVideo('nope_a', 'nope_b')).toBeNull();
    expect(matrix.getBattleVideo('myth_dragon', 'myth_dragon')).toBeNull();
    expect(new BattleMatrix().getBattleVideo('a', 'b')).toBeNull();
    expect(getBattleVideoForPair('nope_a', 'nope_b')).toBeNull();
  });
});

describe('custom monsters never get a prebuilt clash video', () => {
  it('detects the custom_ prefix only at the start of the id', () => {
    expect(isCustomFighterId('custom_myth_dragon_1700')).toBe(true);
    expect(isCustomFighterId('myth_dragon')).toBe(false);
    expect(isCustomFighterId('x_custom_y')).toBe(false);
  });

  it('is null against every curated monster on either side, including a custom clone of a premade fighter', () => {
    const matrix = new BattleMatrix(MONSTERS);
    for (const id of ids) {
      for (const custom of ['custom_myth_dragon_1', 'custom_myth_kraken_2', 'custom_alien_xenomorph_3']) {
        expect(getBattleVideoForPair(custom, id)).toBeNull();
        expect(getBattleVideoForPair(id, custom)).toBeNull();
        expect(matrix.getBattleVideo(custom, id)).toBeNull();
        expect(matrix.getBattleVideo(id, custom)).toBeNull();
      }
    }
  });

  it('property: any custom_ id on either side (even against another custom) yields null', () => {
    const idArb = fc.constantFrom(...ids);
    const customArb = fc.string({ maxLength: 24 }).map((s) => `custom_${s}`);
    fc.assert(
      fc.property(customArb, idArb, fc.boolean(), (custom, curated, customFirst) => {
        const [a, b] = customFirst ? [custom, curated] : [curated, custom];
        expect(getBattleVideoForPair(a, b)).toBeNull();
        expect(new BattleMatrix(MONSTERS).getBattleVideo(a, b)).toBeNull();
      }),
      { numRuns: 200 },
    );
    fc.assert(
      fc.property(customArb, customArb, (a, b) => {
        expect(getBattleVideoForPair(a, b)).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  it('property: a non-null result is only ever a pre-authored battle file for two curated fighters', () => {
    const anyId = fc.oneof(fc.constantFrom(...ids), fc.string({ maxLength: 20 }), fc.string({ maxLength: 12 }).map((s) => `custom_${s}`));
    fc.assert(
      fc.property(anyId, anyId, (a, b) => {
        const url = getBattleVideoForPair(a, b);
        if (url !== null) {
          expect(url).toMatch(PREMADE_URL);
          expect(isCustomFighterId(a) || isCustomFighterId(b)).toBe(false);
          expect(getBattleVideoForPair(b, a)).toBe(url);
        }
        expect(url === null || !url.includes('undefined')).toBe(true);
      }),
      { numRuns: 300 },
    );
  });
});

describe('composeClashPrompt (pure)', () => {
  const a = { id: 'custom_myth_dragon_1', nameEn: 'Ember Titan', promptEn: 'a  towering\nlava dragon with obsidian horns' };
  const b = { id: 'myth_kraken', nameEn: 'Abyssal Kraken', customStats: { atk: 90, def: 50, spd: 60, regen: 40, energy: 80 } };

  it('uses promptEn when present and builds from name and stats otherwise', () => {
    expect(describeFighterForClash(a)).toBe('a towering lava dragon with obsidian horns');
    const built = describeFighterForClash(b);
    expect(built).toContain('Abyssal Kraken');
    expect(built).toContain('ATK 90');
    expect(describeFighterForClash({ id: 'x', nameEn: '', nameKo: '괴수' })).toContain('괴수');
    expect(describeFighterForClash({ id: 'x_1', nameEn: '' })).toContain('x_1');
  });

  it('contains both fighters, left first, and is deterministic', () => {
    const p = composeClashPrompt(a, b);
    expect(p.indexOf('lava dragon')).toBeGreaterThan(-1);
    expect(p.indexOf('Abyssal Kraken')).toBeGreaterThan(p.indexOf('lava dragon'));
    expect(composeClashPrompt(a, b)).toBe(p);
    expect(composeClashPrompt(b, a)).not.toBe(p);
  });

  it('property: always bounded, single-line, and mentions both fighters even for huge prompts', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 3000 }), fc.string({ maxLength: 3000 }), (p1, p2) => {
        const out = composeClashPrompt(
          { id: 'custom_a', nameEn: 'AAA', promptEn: `ALPHA ${p1}` },
          { id: 'custom_b', nameEn: 'BBB', promptEn: `OMEGA ${p2}` },
        );
        expect(out.length).toBeLessThanOrEqual(1400);
        expect(out).not.toMatch(/[\r\n]/);
        expect(out).toContain('ALPHA');
        expect(out).toContain('OMEGA');
      }),
      { numRuns: 100 },
    );
  });
});
