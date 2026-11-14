import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LazyVideo, getPreloadedCount, preloadVideo } from './videoLoading';

describe('videoLoading', () => {
  it('renders only the current stage video (never the next one)', () => {
    const html = renderToStaticMarkup(<LazyVideo src="/a.mp4" nextSrc="/b.mp4" />);
    expect(html.match(/<video/g)).toHaveLength(1);
    expect(html).toContain('src="/a.mp4"');
    expect(html).not.toContain('/b.mp4');
  });

  it('preload is a safe no-op without a DOM or url', () => {
    expect(() => preloadVideo(undefined)()).not.toThrow();
    expect(() => preloadVideo('/x.mp4')()).not.toThrow();
    expect(getPreloadedCount()).toBe(0);
  });
});
