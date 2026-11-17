import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { BattleMatrix } from './BattleMatrix';
import { COMIC_MONSTERS } from '../../../data/comicMonsters';
import type { MonsterDefinition } from '../../../types/kiroween';

/**
 * Property 8: Arena Battle Matrix Completeness
 * **Validates: Requirements 8.1**
 */
describe('Property 8: Arena Battle Matrix Completeness', () => {
  const monsters = COMIC_MONSTERS.map((m) => ({ id: m.id })) as unknown as MonsterDefinition[];
  const ids = monsters.map((m) => m.id);
  const matrix = new BattleMatrix(monsters);

  const isValidUrl = (u: unknown) =>
    u === null || (typeof u === 'string' && /^\/videos\/battles\/.+\.mp4$/.test(u));

  const distinctPair = fc
    .tuple(fc.integer({ min: 0, max: ids.length - 1 }), fc.integer({ min: 1, max: ids.length - 1 }))
    .map(([a, off]) => [ids[a], ids[(a + off) % ids.length]] as const);

  it('any two distinct monsters yield a pre-made battle URL or null without throwing', () => {
    fc.assert(
      fc.property(distinctPair, ([a, b]) => {
        const url = matrix.getBattleVideo(a, b);
        expect(isValidUrl(url)).toBe(true);
        expect(matrix.getMapping(a, b)?.videoUrl).toBe(url);
      }),
      { numRuns: 200 },
    );
  });

  it('covers all 240 distinct pairs exhaustively', () => {
    expect(ids).toHaveLength(16);
    let count = 0;
    for (const a of ids) {
      for (const b of ids) {
        if (a === b) continue;
        count++;
        expect(isValidUrl(matrix.getBattleVideo(a, b))).toBe(true);
      }
    }
    expect(count).toBe(240);
  });
});
