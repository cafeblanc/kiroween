import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { COMIC_MONSTERS, HUMAN_PROMETHEUS_MONSTER } from './comicMonsters';
import { REAL_STEM_CELL_PHOTOS } from './stemCellPhotos';
import { REFERENCE_VIDEOS } from '../services/referenceVideoSelector';

const pub = (url: string) => resolve(__dirname, '../../public', url.replace(/^\//, ''));

describe('6 curated sample monsters use the growth/awakening incubator path', () => {
  const curated = REAL_STEM_CELL_PHOTOS.map(
    (p) => COMIC_MONSTERS.find((m) => m.id === p.targetMonsterId) ?? (p.targetMonsterId === HUMAN_PROMETHEUS_MONSTER.id ? HUMAN_PROMETHEUS_MONSTER : undefined),
  );

  it('all 6 resolve to a monster', () => {
    expect(curated).toHaveLength(6);
    curated.forEach((m, i) => expect(m, REAL_STEM_CELL_PHOTOS[i].targetMonsterId).toBeDefined());
  });

  it('each has an existing growth/awakening clip (never battle) and roar audio', () => {
    const ok = /^\/videos\/chimera_(growth|awakening)_[a-z0-9_]+\.mp4$/;
    for (const m of curated) {
      expect(m!.videoSrc, m!.id).toMatch(ok);
      expect(existsSync(pub(m!.videoSrc)), m!.videoSrc).toBe(true);
      expect(existsSync(pub(m!.roarAudio)), m!.roarAudio).toBe(true);
      if (REFERENCE_VIDEOS[m!.id]) expect(REFERENCE_VIDEOS[m!.id], m!.id).toMatch(ok);
    }
  });
});
