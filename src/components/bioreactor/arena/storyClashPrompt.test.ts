import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { composeStoryClashPrompt, plainStoryText, shouldWrapClashPlayback, CLASH_MAX_SECONDS } from './clashPrompt';

describe('composeStoryClashPrompt', () => {
  const story = { act2_clash: '⚡ First strike: A hits B.\n💥 Head-on clash.', act3_finish: '💀 A lands the finishing blow — K.O.!' };

  it('follows the required template with the fighters and story acts', () => {
    const p = composeStoryClashPrompt('Pyroclastic Dragon', 'Kraken', story);
    expect(p).toContain('1080p Full HD 16:9, LTX-2.5 fast mode, AAA mobile game 3D cinematic battle cutscene');
    expect(p).toContain('Pyroclastic Dragon and Kraken');
    expect(p).toContain('1080p 60fps Unreal Engine 5 game trailer, photorealistic 3D, no text');
    expect(p).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });

  it('keeps prefix and suffix intact and bounds the length for any story', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 3000 }), fc.string({ maxLength: 3000 }), (a, b) => {
        const p = composeStoryClashPrompt('X', 'Y', { act2_clash: a, act3_finish: b });
        expect(p.startsWith('1080p Full HD 16:9, LTX-2.5 fast mode')).toBe(true);
        expect(p.endsWith('photorealistic 3D, no text')).toBe(true);
        expect(p.length).toBeLessThan(1300);
        expect(p).not.toContain('\n');
      }),
      { numRuns: 100 },
    );
  });

  it('plainStoryText strips emoji and collapses whitespace', () => {
    expect(plainStoryText('🌋  magma\n\nstrike ⚡')).toBe('magma strike');
  });

  it('caps clip playback at the 3-5 s window', () => {
    expect(shouldWrapClashPlayback(CLASH_MAX_SECONDS - 0.1)).toBe(false);
    expect(shouldWrapClashPlayback(CLASH_MAX_SECONDS)).toBe(true);
    expect(shouldWrapClashPlayback(Number.NaN)).toBe(false);
  });
});
