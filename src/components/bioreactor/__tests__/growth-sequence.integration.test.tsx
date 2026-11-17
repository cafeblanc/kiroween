// Feature: kiroween-rearchitecture, Task 14.1: Full growth sequence integration
// **Validates: Requirements 1.1, 2.1, 3.1, 6.1, 7.1, 12.1**
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  GROWTH_STAGES,
  STAGE_COUNT,
  STAGE_DURATION_SEC,
  TOTAL_DURATION_SEC,
  getBpmForElapsed,
  getStageByElapsed,
  getStageProgress,
  isSequenceComplete,
} from '../growthStages';
import { BioreactorContainer } from '../BioreactorContainer';
import { StageProgressHUD, getBpmZone } from '../StageProgressHUD';
import { AwakeningRoar } from '../awakening/AwakeningRoar';
import { createVideoPipeline } from '../../../services/videoPipeline';
import {
  referenceVideoSelector,
  REFERENCE_VIDEOS,
  FALLBACK_REFERENCE_VIDEO,
} from '../../../services/referenceVideoSelector';
import { COMIC_MONSTERS } from '../../../data/comicMonsters';
import { shouldResolveViaPipeline } from '../../../utils/customMonsterFlow';
import fc from 'fast-check';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  getLastConcatenationPlan,
  videoConcatenationService,
} from '../../../services/videoConcatenationService';
import type { MonsterDefinition } from '../../../types/kiroween';

const MONSTER_ID = 'myth_dragon';

const monster = {
  id: MONSTER_ID,
  name: 'Dragon',
  nameKo: 'Dragon',
  type: 'mythic',
  color: '#ef4444',
  promptEn: '',
  promptKo: '',
  growthReference: '',
  awakeningVideo: '/videos/chimera_awakening_dragon.mp4',
  roarAudio: '/sounds/monster_roar_ferocious.wav',
  stages: [...GROWTH_STAGES],
} as unknown as MonsterDefinition;

/**
 * Mirrors useGrowthTimelapse's per-frame logic: fires onStageChange once per
 * stage crossed and onComplete once at 15.0s. Frames are sampled at `frameMs`.
 */
function runSequence(frameMs: number) {
  const stageEvents: { stage: number; bpm: number; atSec: number }[] = [];
  const completeEvents: number[] = [];
  let lastStage = 0;
  let done = false;
  for (let ms = 0; !done; ms += frameMs) {
    const elapsed = Math.min(TOTAL_DURATION_SEC, ms / 1000);
    const cfg = getStageByElapsed(elapsed);
    while (lastStage < cfg.stage) {
      lastStage += 1;
      stageEvents.push({
        stage: lastStage,
        bpm: GROWTH_STAGES[lastStage - 1].targetBpm,
        atSec: elapsed,
      });
    }
    if (isSequenceComplete(elapsed)) {
      completeEvents.push(elapsed);
      done = true;
    }
  }
  return { stageEvents, completeEvents };
}

describe('Incubator never uses arena battle clips (task 3)', () => {
  const pub = (url: string) => resolve(__dirname, '../../../../public', url.replace(/^\//, ''));
  const incubatorUrls = [
    ...Object.values(REFERENCE_VIDEOS),
    FALLBACK_REFERENCE_VIDEO,
    ...COMIC_MONSTERS.map((m) => m.videoSrc),
  ];

  it('no incubator mapping references battle_*.mp4 or /videos/battles/', () => {
    for (const url of incubatorUrls) expect(url).not.toMatch(/battle/i);
  });

  it('every incubator video exists in public/videos', () => {
    for (const url of new Set(incubatorUrls)) expect(existsSync(pub(url)), url).toBe(true);
  });

  it('myth_frankenstein, alien_xenomorph and myth_cerberus use growth/awakening videos', () => {
    const ok = /^\/videos\/chimera_(growth|awakening)_[a-z0-9_]+\.mp4$/;
    for (const id of ['myth_frankenstein', 'alien_xenomorph', 'myth_cerberus']) {
      expect(REFERENCE_VIDEOS[id], id).toMatch(ok);
      expect(COMIC_MONSTERS.find((m) => m.id === id)!.videoSrc, id).toMatch(ok);
    }
  });

  it('property: for any monster id (known or random) the selector never yields a battle clip', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const known = Object.keys(REFERENCE_VIDEOS);
    fc.assert(
      fc.property(fc.oneof(fc.constantFrom(...known), fc.string()), (id) => {
        const res = referenceVideoSelector.select(id);
        return !/battle/i.test(res.videoUrl) && res.clips.every((c) => !/battle/i.test(c.videoUrl));
      }),
      { numRuns: 100 },
    );
  });

  it('BioreactorScreen keeps a custom monster own clip: pipeline skipped, reference never applied', () => {
    const src = readFileSync(resolve(__dirname, '../BioreactorScreen.tsx'), 'utf8');
    expect(shouldResolveViaPipeline({ id: 'custom_x_1', videoSrc: 'blob:http://l/abc' })).toBe(false);
    expect(src).toMatch(/useState\(monster\.videoSrc\)/);
    expect(src).toMatch(/setVideoUrl\(monster\.videoSrc\);[\s\S]*?if \(!shouldResolveViaPipeline/);
    // Only AI/cache results may replace the clip; a "reference" result never does.
    expect(src).toMatch(/res\.source === 'ai' \|\| res\.source === 'cache'/);
    // All 6 stages seek within the same <video>, 1/6 of its duration each.
    expect(src).toMatch(/v\.duration \/ STAGE_COUNT/);
    expect(src).toMatch(/\(stage - 1\) \* segment/);
  });
});

describe('Full growth sequence integration', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('user selects monster → pipeline yields a 6-stage 15s video that concatenates cleanly', async () => {
    // No AI key: the pipeline falls back to the reference video for the selected monster.
    const pipeline = createVideoPipeline({
      isAIAvailable: () => false,
      getReferenceSelector: async () => referenceVideoSelector,
    });
    const source = await pipeline.getVideoSource(MONSTER_ID);

    expect(source.videoUrl).toBe(REFERENCE_VIDEOS[MONSTER_ID]);
    expect(source.clips).toHaveLength(STAGE_COUNT);
    source.clips.forEach((c, i) => {
      expect(c.start).toBeCloseTo(i * STAGE_DURATION_SEC);
      expect(c.end - c.start).toBeCloseTo(STAGE_DURATION_SEC);
    });

    const url = videoConcatenationService.concatenateStages(source.clips);
    const plan = getLastConcatenationPlan();
    expect(url).toBe(source.videoUrl);
    expect(plan?.mode).toBe('crossfade');
    expect(plan?.totalDuration).toBe(TOTAL_DURATION_SEC);
  });

  it('AI-generated 6-stage video is concatenated the same way', async () => {
    const pipeline = createVideoPipeline({
      isAIAvailable: () => true,
      getAIGenerator: async () =>
        ({
          generateSixStageSequence: async () => ({ success: true, videoUrl: 'https://example.com/ai.mp4' }),
        }) as any,
    });
    const source = await pipeline.getVideoSource(MONSTER_ID);
    expect(source.source).toBe('ai');
    expect(videoConcatenationService.concatenateStages(source.clips)).toBe('https://example.com/ai.mp4');
    expect(getLastConcatenationPlan()?.totalDuration).toBe(15);
  });

  it('bioreactor renders with HUD at every stage, with matching label and BPM', () => {
    GROWTH_STAGES.forEach((cfg) => {
      const midSec = (cfg.start + cfg.end) / 2;
      const progress = getStageProgress(midSec);
      const html = renderToStaticMarkup(
        <BioreactorContainer
          videoUrl={REFERENCE_VIDEOS[MONSTER_ID]}
          stageProgress={progress}
          currentStage={cfg.stage}
          bpm={getBpmForElapsed(midSec)}
          fluidLevel={cfg.stage / STAGE_COUNT}
          isAwakening={false}
        >
          <StageProgressHUD stage={cfg.stage} progress={progress} bpm={cfg.targetBpm} />
        </BioreactorContainer>,
      );
      expect(html).toContain('data-testid="bioreactor-container"');
      expect(html).toContain('fixed-frame-border');
      expect(html).toContain('data-testid="stage-progress-hud"');
      expect(html).toContain(cfg.label);
      expect(html).toContain(`${cfg.targetBpm} BPM`);
      expect(html).toContain('50%');
    });
  });

  it('HUD BPM color zone escalates from green to red across the sequence', () => {
    const zones = GROWTH_STAGES.map((s) => getBpmZone(s.targetBpm));
    expect(zones).toEqual(['green', 'green', 'yellow', 'yellow', 'yellow', 'red']);
  });

  it('stage transitions occur at 2.5s boundaries with the spec BPMs', () => {
    const { stageEvents } = runSequence(16);
    expect(stageEvents.map((e) => e.stage)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(stageEvents.map((e) => e.bpm)).toEqual([58, 66, 105, 142, 192, 260]);
    stageEvents.forEach((e, i) => {
      const expected = i * STAGE_DURATION_SEC;
      expect(e.atSec).toBeGreaterThanOrEqual(expected);
      // Fires within one 16ms frame of the boundary.
      expect(e.atSec - expected).toBeLessThan(0.016 + 1e-9);
    });
  });

  it('throttled frames still fire every stage exactly once, in order', () => {
    const { stageEvents, completeEvents } = runSequence(4000);
    expect(stageEvents.map((e) => e.stage)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(completeEvents).toHaveLength(1);
  });

  it('boundary instants belong to the next stage', () => {
    for (let s = 1; s < STAGE_COUNT; s++) {
      const t = s * STAGE_DURATION_SEC;
      expect(getStageByElapsed(t - 0.001).stage).toBe(s);
      expect(getStageByElapsed(t).stage).toBe(s + 1);
    }
  });

  it('final awakening triggers only at stage 6 and completes the sequence at 15.0s', () => {
    const triggers = GROWTH_STAGES.filter((s) => s.transitionTrigger).map((s) => s.stage);
    expect(triggers).toEqual([6]);

    const { stageEvents, completeEvents } = runSequence(16);
    expect(completeEvents).toEqual([TOTAL_DURATION_SEC]);
    const awakeningAt = stageEvents.find((e) => e.stage === 6)!.atSec;
    expect(awakeningAt).toBeGreaterThanOrEqual(12.5);
    expect(awakeningAt).toBeLessThan(TOTAL_DURATION_SEC);

    // Stage 6 reached → awakening cut-in is rendered with the monster's assets.
    const html = renderToStaticMarkup(<AwakeningRoar monster={monster} />);
    expect(html).toContain('data-testid="awakening-roar"');
    expect(html).toContain('src="/videos/chimera_awakening_dragon.mp4"');
  });

  it('bioreactor switches to awakening state on stage 6 without moving the fixed frame', () => {
    const html = renderToStaticMarkup(
      <BioreactorContainer
        videoUrl={REFERENCE_VIDEOS[MONSTER_ID]}
        stageProgress={100}
        currentStage={6}
        bpm={260}
        fluidLevel={1}
        isAwakening={true}
      >
        <AwakeningRoar monster={monster} />
      </BioreactorContainer>,
    );
    const frame = html.match(/<[^>]*data-testid="bioreactor-container"[^>]*>/)![0];
    expect(frame).toMatch(/transform:\s*none/);
    expect(html).toContain('data-testid="awakening-roar"');
  });
});
