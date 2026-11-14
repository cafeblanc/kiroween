import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import fs from 'node:fs';
import path from 'node:path';
import { GROWTH_STAGES, getStageByElapsed } from '../growthStages';
import { AwakeningRoar } from './AwakeningRoar';
import type { MonsterDefinition } from '../../../types/kiroween';

/**
 * Property 7: Final Stage Awakening
 * Stage 6 triggers the awakening cut-in with video from public/videos/
 * (chimera_awakening_*.mp4) and audio from public/sounds/ (monster_roar_*.wav).
 *
 * **Validates: Requirements 7.1**
 */
const PUBLIC = path.resolve(__dirname, '../../../../public');
const awakeningVideos = fs
  .readdirSync(path.join(PUBLIC, 'videos'))
  .filter((f) => /^chimera_awakening_.+\.mp4$/.test(f))
  .map((f) => `/videos/${f}`);
const roarSounds = fs
  .readdirSync(path.join(PUBLIC, 'sounds'))
  .filter((f) => /^monster_roar_.+\.wav$/.test(f))
  .map((f) => `/sounds/${f}`);

const monsterArb: fc.Arbitrary<MonsterDefinition> = fc
  .record({
    id: fc.stringMatching(/^[a-z]{3,10}$/),
    name: fc.stringMatching(/^[A-Z][a-z]{2,9}$/),
    color: fc.integer({ min: 0, max: 0xffffff }).map((n) => `#${n.toString(16).padStart(6, '0')}`),
    awakeningVideo: fc.constantFrom(...awakeningVideos),
    roarAudio: fc.constantFrom(...roarSounds),
  })
  .map(
    (r) =>
      ({
        ...r,
        nameKo: r.name,
        type: 'mythic',
        promptEn: '',
        promptKo: '',
        growthReference: '',
        stages: [...GROWTH_STAGES],
      }) as unknown as MonsterDefinition,
  );

describe('Property 7: Final Stage Awakening', () => {
  it('asset pools for awakening video and roar audio are non-empty and exist on disk', () => {
    expect(awakeningVideos.length).toBeGreaterThan(0);
    expect(roarSounds.length).toBeGreaterThan(0);
    [...awakeningVideos, ...roarSounds].forEach((p) =>
      expect(fs.existsSync(path.join(PUBLIC, p))).toBe(true),
    );
  });

  it('only Stage 6 carries the awakening trigger, and every time in 12.5-15s resolves to it', () => {
    expect(GROWTH_STAGES.filter((s) => s.transitionTrigger).map((s) => s.stage)).toEqual([6]);
    fc.assert(
      fc.property(fc.double({ min: 12.5, max: 14.999, noNaN: true }), (t) => {
        const s = getStageByElapsed(t);
        expect(s.stage).toBe(6);
        expect(s.transitionTrigger).toBe(true);
        expect(s.visualEffect).toBe('awakening-roar');
      }),
      { numRuns: 100 },
    );
  });

  it('earlier stages (0-12.5s) never trigger the awakening', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 12.499, noNaN: true }), (t) => {
        expect(getStageByElapsed(t).transitionTrigger).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('awakening cut-in renders the monster video from public/videos and references a roar from public/sounds', () => {
    fc.assert(
      fc.property(monsterArb, (monster) => {
        const html = renderToStaticMarkup(<AwakeningRoar monster={monster} />);
        expect(html).toContain('data-testid="awakening-roar"');
        expect(html).toContain(`src="${monster.awakeningVideo}"`);
        expect(monster.awakeningVideo).toMatch(/^\/videos\/chimera_awakening_.+\.mp4$/);
        expect(monster.roarAudio).toMatch(/^\/sounds\/monster_roar_.+\.wav$/);
        expect(fs.existsSync(path.join(PUBLIC, monster.awakeningVideo))).toBe(true);
        expect(fs.existsSync(path.join(PUBLIC, monster.roarAudio))).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});
