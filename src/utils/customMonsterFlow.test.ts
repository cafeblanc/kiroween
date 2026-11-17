/**
 * Task 3 (ltx-custom-studio-arena): custom monster blob: video through incubator -> awakening -> arena.
 * No jsdom in this project, so UI behavior is covered by pure-logic tests plus structural assertions
 * on the component sources. A real browser run is still required for playback/audio.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { adultSegmentStart, shouldResolveViaPipeline, isCustomMonsterId } from './customMonsterFlow';
import { getBattleVideoForPair } from '../components/bioreactor/arena';
import { safeVideoUrl } from './security';
import { toMonsterDefinition } from '../components/bioreactor/BioreactorScreen';

const ROOT = resolve(__dirname, '..', '..');
const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf8');
const BLOB = 'blob:http://localhost:5173/3f2a9c1e-0000-4000-8000-123456789abc';
const CURATED_IDS = [
  'myth_dragon',
  'myth_kraken',
  'alien_xenomorph',
  'alien_void_slug',
  'myth_frankenstein',
  'human_prometheus',
];

describe('adultSegmentStart', () => {
  it('seeks curated clips to 68% of a finite duration', () => {
    expect(adultSegmentStart(10, 'myth_dragon')).toBeCloseTo(6.8);
  });
  it('never seeks custom monsters, Infinity (MediaRecorder webm), NaN or 0 durations', () => {
    expect(adultSegmentStart(10, 'custom_myth_dragon_1')).toBeNull();
    expect(adultSegmentStart(Infinity, 'myth_dragon')).toBeNull();
    expect(adultSegmentStart(NaN, 'myth_dragon')).toBeNull();
    expect(adultSegmentStart(0, 'myth_dragon')).toBeNull();
  });
});

describe('shouldResolveViaPipeline', () => {
  it('skips the AI/reference pipeline for custom monsters and blob: clips', () => {
    expect(isCustomMonsterId('custom_x_1')).toBe(true);
    expect(shouldResolveViaPipeline({ id: 'custom_x_1', videoSrc: '/videos/a.mp4' })).toBe(false);
    expect(shouldResolveViaPipeline({ id: 'x', videoSrc: BLOB })).toBe(false);
    expect(shouldResolveViaPipeline({ id: 'myth_dragon', videoSrc: '/videos/a.mp4' })).toBe(true);
  });
});

describe('blob: video through the incubator/awakening definitions', () => {
  it('safeVideoUrl keeps blob: urls (no fallback swap)', () => {
    expect(safeVideoUrl(BLOB)).toBe(BLOB);
  });
  it('toMonsterDefinition passes the blob url as growthReference used by AwakeningRoar', () => {
    const def = toMonsterDefinition({
      id: 'custom_myth_dragon_1', nameEn: 'X', nameKo: 'X', icon: 'x', colorHex: '#ef4444',
      roarAudio: '/sounds/monster_roar_ferocious.wav', promptEn: 'p', promptKo: 'p', videoSrc: BLOB,
    });
    expect(def.growthReference).toBe(BLOB);
    expect(safeVideoUrl(def.growthReference || def.awakeningVideo)).toBe(BLOB);
  });
});

describe('BattleMatrix: custom monster vs the 6 curated monsters', () => {
  it('never gets a pre-made clash video (null), in both fighter orders', () => {
    const custom = 'custom_myth_dragon_1700000000000';
    for (const id of CURATED_IDS) {
      expect(getBattleVideoForPair(custom, id)).toBeNull();
      expect(getBattleVideoForPair(id, custom)).toBeNull();
    }
  });
});

describe('structural: cleanup and stale-state guards', () => {
  const awakening = read('src/components/bioreactor/awakening/AwakeningRoar.tsx');
  const screen = read('src/components/bioreactor/BioreactorScreen.tsx');
  const lab = read('src/components/BioStitchLabView.tsx');

  it('AwakeningRoar invalidates async audio setup and stops audio on cleanup', () => {
    expect(awakening).toMatch(/runRef\.current\+\+/);
    expect(awakening).toMatch(/runRef\.current !== runId/);
    expect(awakening).toMatch(/htmlAudioRef\.current\?\.pause\(\)/);
    expect(awakening).toMatch(/ctxRef\.current\?\.close\(\)/);
    expect(awakening).toMatch(/cancelAnimationFrame\(rafRef\.current\)/);
  });

  it('BioreactorScreen stops the heartbeat on awakening/unmount and keeps custom clips out of the pipeline', () => {
    expect(screen).toMatch(/if \(isAwakening\) return undefined;[\s\S]*?window\.setInterval\(beat[\s\S]*?window\.clearInterval\(id\)/);
    expect(screen).toMatch(/shouldResolveViaPipeline/);
  });

  it('lab view stops the incubator heartbeat once awakened; arena generation is aborted on fighter change / unmount; the roar and incubation timers are cleared', () => {
    expect(lab).toMatch(/morphStage === "awakened"/);
    expect(lab).toMatch(/chimeraCardiacIntervalRef\.current\);/);
    // old real-time duel engine is gone
    expect(lab).not.toMatch(/cancelArenaBattle|arenaTimersRef|handleStartArenaBattle/);
    // the battle-video generation is aborted when the pair changes (and on unmount)
    expect(lab.match(/aiClashAbortRef\.current\?\.abort\(\)/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    // the arena entrance roar interval and the incubation phase tick are cleared by their effect cleanups
    expect(lab).toMatch(/return \(\) => window\.clearInterval\(t\);/);
    // Incubation has no tick timer any more (the clip's timeupdate drives it); its bubbling sound is stopped on cleanup.
    expect(lab).toMatch(/const stop = startBubbleSound\(\);\s*return stop;/);
    expect(lab).toMatch(/activeModalTab === "monster_arena"\) return;/);
  });

  it('lab view no longer assigns an unguarded duration*0.68 to currentTime', () => {
    expect(lab).not.toMatch(/currentTime = [\w.]*duration \* 0\.68/);
  });
});
