import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { createVideoPipeline, AI_FALLBACK_MESSAGE } from './videoPipeline';
import type {
  AIVideoGenerator,
  ReferenceVideoSelector,
  VideoGenerationResponse,
  VideoSourceResult,
} from '../types/kiroween';

/**
 * Feature: kiroween-rearchitecture, Property 4: Video Source Fallback
 * **Validates: Requirements 4.1**
 */

const monsterIdArb = fc.string({ minLength: 1, maxLength: 24 });

type AIFailure =
  | { kind: 'unavailable' }
  | { kind: 'throws'; message: string }
  | { kind: 'unsuccessful'; error: string }
  | { kind: 'noUrl' };

const failureArb: fc.Arbitrary<AIFailure> = fc.oneof(
  fc.constant<AIFailure>({ kind: 'unavailable' }),
  fc.string().map((message): AIFailure => ({ kind: 'throws', message })),
  fc.string().map((error): AIFailure => ({ kind: 'unsuccessful', error })),
  fc.constant<AIFailure>({ kind: 'noUrl' }),
);

function makeReferenceSelector(): ReferenceVideoSelector {
  return {
    select: (monsterId: string): VideoSourceResult => ({
      source: 'reference',
      videoUrl: `/videos/battles/ref_${monsterId}.mp4`,
      clips: [],
    }),
  } as ReferenceVideoSelector;
}

function makeGenerator(failure: AIFailure): AIVideoGenerator {
  return {
    generateSixStageSequence: async (): Promise<VideoGenerationResponse> => {
      switch (failure.kind) {
        case 'throws':
          throw new Error(failure.message);
        case 'unsuccessful':
          return { success: false, error: failure.error } as VideoGenerationResponse;
        case 'noUrl':
          return { success: true } as VideoGenerationResponse;
        default:
          throw new Error('should not be called');
      }
    },
  } as unknown as AIVideoGenerator;
}

describe('Property 4: Video Source Fallback', () => {
  it('falls back to a reference video for any AI failure or unavailability, without throwing', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await fc.assert(
      fc.asyncProperty(monsterIdArb, failureArb, async (monsterId, failure) => {
        const messages: string[] = [];
        const generator = makeGenerator(failure);
        const generateSpy = vi.spyOn(generator, 'generateSixStageSequence');

        const pipeline = createVideoPipeline({
          isAIAvailable: () => failure.kind !== 'unavailable',
          getAIGenerator: async () => generator,
          getReferenceSelector: async () => makeReferenceSelector(),
          onUserMessage: (m) => messages.push(m),
        });

        const result = await pipeline.getVideoSource(monsterId);

        expect(result.source).toBe('reference');
        expect(result.videoUrl).toBe(`/videos/battles/ref_${monsterId}.mp4`);
        expect(messages).toEqual([AI_FALLBACK_MESSAGE]);
        if (failure.kind === 'unavailable') {
          expect(generateSpy).not.toHaveBeenCalled();
        }
      }),
      { numRuns: 100 },
    );
  });

  it('falls back when the AI generator cannot even be loaded', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await fc.assert(
      fc.asyncProperty(monsterIdArb, async (monsterId) => {
        const pipeline = createVideoPipeline({
          isAIAvailable: () => true,
          getAIGenerator: async () => {
            throw new Error('module load failed');
          },
          getReferenceSelector: async () => makeReferenceSelector(),
        });
        const result = await pipeline.getVideoSource(monsterId);
        expect(result.source).toBe('reference');
      }),
      { numRuns: 100 },
    );
  });

  it('uses the AI video when generation succeeds (no fallback)', async () => {
    await fc.assert(
      fc.asyncProperty(monsterIdArb, fc.webUrl(), async (monsterId, url) => {
        const pipeline = createVideoPipeline({
          isAIAvailable: () => true,
          getAIGenerator: async () =>
            ({
              generateSixStageSequence: async () => ({ success: true, videoUrl: url }),
            }) as unknown as AIVideoGenerator,
          getReferenceSelector: async () => makeReferenceSelector(),
        });
        const result = await pipeline.getVideoSource(monsterId);
        expect(result.source).toBe('ai');
        expect(result.videoUrl).toBe(url);
      }),
      { numRuns: 100 },
    );
  });
});
