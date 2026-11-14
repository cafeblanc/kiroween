import { describe, it, expect } from 'vitest';
import {
  BattleMatrix,
  FALLBACK_BATTLE_VIDEO,
  PREMADE_BATTLES,
  toShortName,
} from './BattleMatrix';
import { COMIC_MONSTERS } from '../../../data/comicMonsters';
import type { MonsterDefinition } from '../../../types/kiroween';

const MONSTERS = COMIC_MONSTERS.map((m) => ({ id: m.id })) as unknown as MonsterDefinition[];
const ids = MONSTERS.map((m) => m.id);

describe('BattleMatrix generation (REQ-8)', () => {
  const matrix = new BattleMatrix(MONSTERS);

  it('uses 16 monsters', () => {
    expect(MONSTERS).toHaveLength(16);
  });

  it('generates 240 ordered pairs (16 x 15)', () => {
    expect(matrix.size).toBe(240);
    expect(matrix.getAllMappings()).toHaveLength(16 * 15);
  });

  it('has unique pair keys and no self-pairs', () => {
    const keys = matrix.getAllMappings().map((m) => `${m.f1Id}|${m.f2Id}`);
    expect(new Set(keys).size).toBe(240);
    expect(matrix.getAllMappings().every((m) => m.f1Id !== m.f2Id)).toBe(true);
  });

  it('gives each monster exactly 15 opponents', () => {
    for (const id of ids) {
      expect(matrix.getAllMappings().filter((m) => m.f1Id === id)).toHaveLength(15);
    }
  });

  it('ignores duplicate monster ids and regenerates cleanly', () => {
    const m = new BattleMatrix();
    expect(m.size).toBe(0);
    m.generateMatrix([...MONSTERS, ...MONSTERS]);
    expect(m.size).toBe(240);
    m.generateMatrix(MONSTERS.slice(0, 3));
    expect(m.size).toBe(6);
  });

  it('returns a valid video URL for every ordered pair', () => {
    for (const a of ids) {
      for (const b of ids) {
        if (a === b) continue;
        expect(matrix.getBattleVideo(a, b)).toMatch(/^\/videos\/battles\/.+\.mp4$/);
      }
    }
  });
});

describe('BattleMatrix video URL selection', () => {
  const matrix = new BattleMatrix(MONSTERS);

  it('maps short names, including the xenomorph alias', () => {
    expect(toShortName('myth_dragon')).toBe('dragon');
    expect(toShortName('alien_xenomorph')).toBe('xeno');
  });

  it('selects pre-made videos in either fighter order', () => {
    expect(matrix.getBattleVideo('myth_cerberus', 'myth_hydra')).toBe(
      '/videos/battles/battle_cerberus_vs_hydra.mp4',
    );
    expect(matrix.getBattleVideo('myth_hydra', 'myth_cerberus')).toBe(
      '/videos/battles/battle_cerberus_vs_hydra.mp4',
    );
    expect(matrix.getBattleVideo('alien_xenomorph', 'myth_frankenstein')).toBe(
      '/videos/battles/battle_xeno_vs_frankenstein.mp4',
    );
    expect(matrix.getBattleVideo('myth_kraken', 'myth_dragon')).toBe(
      '/videos/battles/battle_dragon_vs_kraken.mp4',
    );
  });

  it('flags pre-made mappings with isPreMade', () => {
    const premade = matrix.getAllMappings().filter((m) => m.isPreMade);
    expect(premade).toHaveLength(PREMADE_BATTLES.length * 2);
    expect(matrix.getMapping('myth_dragon', 'myth_kraken')?.isPreMade).toBe(true);
    expect(matrix.getMapping('myth_dragon', 'myth_phoenix')?.isPreMade).toBe(false);
  });
});

describe('BattleMatrix fallback', () => {
  const matrix = new BattleMatrix(MONSTERS);

  it('fallback is the generic dragon_vs_kraken video', () => {
    expect(FALLBACK_BATTLE_VIDEO).toBe('/videos/battles/battle_dragon_vs_kraken.mp4');
  });

  it('assigns the fallback to pairs without a pre-made video', () => {
    const m = matrix.getMapping('myth_phoenix', 'myth_griffin');
    expect(m?.videoUrl).toBe(FALLBACK_BATTLE_VIDEO);
    expect(m?.isPreMade).toBe(false);
    expect(matrix.getBattleVideo('myth_phoenix', 'myth_griffin')).toBe(FALLBACK_BATTLE_VIDEO);
  });

  it('returns the fallback for unknown ids and self-pairs without throwing', () => {
    expect(matrix.getBattleVideo('nope_a', 'nope_b')).toBe(FALLBACK_BATTLE_VIDEO);
    expect(matrix.getBattleVideo('myth_phoenix', 'myth_phoenix')).toBe(FALLBACK_BATTLE_VIDEO);
    expect(new BattleMatrix().getBattleVideo('a', 'b')).toBe(FALLBACK_BATTLE_VIDEO);
  });
});
