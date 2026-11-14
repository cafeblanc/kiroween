// Feature: kiroween-rearchitecture, Property 3: Fixed-Frame Boundary
// **Validates: Requirements 3.1**
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { renderToStaticMarkup } from 'react-dom/server';
import { BioreactorContainer } from './BioreactorContainer';

function render(props: {
  stage: number;
  bpm: number;
  fluid: number;
  progress: number;
  awakening: boolean;
}): string {
  return renderToStaticMarkup(
    <BioreactorContainer
      videoUrl="/videos/test.mp4"
      stageProgress={props.progress}
      currentStage={props.stage}
      bpm={props.bpm}
      fluidLevel={props.fluid}
      isAwakening={props.awakening}
    >
      <span />
    </BioreactorContainer>,
  );
}

/** Returns the opening tag of the element carrying the given data-testid. */
function openingTag(html: string, testId: string): string {
  const m = html.match(new RegExp(`<[^>]*data-testid="${testId}"[^>]*>`));
  if (!m) throw new Error(`missing ${testId}`);
  return m[0];
}

describe('Property 3: Fixed-Frame Boundary', () => {
  it('outer frame never transforms or animates across stages, BPM, fluid levels', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 6 }),
        fc.integer({ min: 40, max: 220 }),
        fc.double({ min: 0, max: 1.5, noNaN: true }),
        fc.double({ min: -20, max: 150, noNaN: true }),
        fc.boolean(),
        (stage, bpm, fluid, progress, awakening) => {
          const html = render({ stage, bpm, fluid, progress, awakening });
          const frame = openingTag(html, 'bioreactor-container');

          expect(frame).toContain('fixed-frame-border');
          expect(frame).toMatch(/transform:\s*none/);
          expect(frame).toMatch(/animation:\s*none/);
          // No motion utility classes or inline motion on the frame.
          const cls = (frame.match(/class="([^"]*)"/) ?? [, ''])[1];
          expect(cls).not.toMatch(/(^|\s)(animate-|translate-|rotate-|scale-|skew-|shake)/);
          expect(frame).not.toMatch(/transition/);
          expect(frame).not.toMatch(/(translate|rotate|scale|skew|matrix)\(/);

          // Effects are clipped inside the frame by the inner viewport.
          const viewport = openingTag(html, 'bioreactor-viewport');
          expect(viewport).toContain('overflow-hidden');
          expect(viewport).toContain('inset-0');
        },
      ),
      { numRuns: 150 },
    );
  });
});
