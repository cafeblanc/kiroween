import React, { useEffect, useRef, useState } from 'react';
import { safeVideoUrl, sanitizeVideoUrl } from '../../utils/security';

/**
 * Video loading strategy (design.md, Performance Considerations):
 * - only the current stage video is mounted
 * - the next stage video is preloaded in the background
 * - off-screen videos are unmounted and their resources released
 * - every timer/observer/element is released on unmount
 */

const preloaded = new Map<string, HTMLVideoElement>();
/** Keep at most this many background preloads alive (memory management). */
const MAX_PRELOADED = 1;

/** Release a detached preload element's network/decoder resources. */
function releaseVideoElement(el: HTMLVideoElement): void {
  try {
    el.pause();
    el.removeAttribute('src');
    el.load();
  } catch {
    /* jsdom or detached element: nothing to release */
  }
}

/**
 * Start fetching `url` in the background with a detached <video preload="auto">.
 * Returns a cancel function that releases the element. Safe to call repeatedly
 * for the same url (reuses the existing preload).
 */
export function preloadVideo(url: string | undefined | null): () => void {
  if (!url || typeof document === 'undefined') return () => undefined;
  url = sanitizeVideoUrl(url);
  if (!url) return () => undefined;

  if (!preloaded.has(url)) {
    // Evict the oldest preloads beyond the cap.
    while (preloaded.size >= MAX_PRELOADED) {
      const oldest = preloaded.keys().next().value as string;
      releaseVideoElement(preloaded.get(oldest)!);
      preloaded.delete(oldest);
    }
    const el = document.createElement('video');
    el.preload = 'auto';
    el.muted = true;
    el.src = url;
    preloaded.set(url, el);
  }

  return () => cancelPreload(url);
}

export function cancelPreload(url: string): void {
  const el = preloaded.get(url);
  if (!el) return;
  releaseVideoElement(el);
  preloaded.delete(url);
}

/** Test helper / teardown: drop every background preload. */
export function clearPreloadedVideos(): void {
  preloaded.forEach(releaseVideoElement);
  preloaded.clear();
}

export function getPreloadedCount(): number {
  return preloaded.size;
}

/**
 * Preload `nextUrl` in the background while `currentUrl` plays. Once the
 * stage advances, the preload for the old url is released.
 */
export function useNextStagePreload(currentUrl: string | undefined, nextUrl: string | undefined): void {
  useEffect(() => {
    if (!nextUrl || nextUrl === currentUrl) return undefined;
    return preloadVideo(nextUrl);
  }, [currentUrl, nextUrl]);
}

/**
 * True while the referenced element is within `rootMargin` of the viewport.
 * Falls back to true when IntersectionObserver is unavailable.
 */
export function useInView<T extends Element>(
  rootMargin = '200px',
): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const last = entries[entries.length - 1];
        if (last) setInView(last.isIntersecting);
      },
      { rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin]);

  return [ref, inView];
}

export interface LazyVideoProps
  extends Omit<React.VideoHTMLAttributes<HTMLVideoElement>, 'src'> {
  src: string;
  /** Background-preload this url while the current video plays. */
  nextSrc?: string;
  rootMargin?: string;
}

/**
 * Mounts the <video> only while on-screen. When it leaves the viewport the
 * element is unmounted and its source released; it remounts on re-entry.
 */
export const LazyVideo: React.FC<LazyVideoProps> = ({ src, nextSrc, rootMargin, ...videoProps }) => {
  const [wrapperRef, inView] = useInView<HTMLDivElement>(rootMargin);
  const videoRef = useRef<HTMLVideoElement>(null);
  const safeSrc = safeVideoUrl(src);

  useNextStagePreload(src, inView ? nextSrc : undefined);

  // Release decoder/network resources before React drops the element.
  useEffect(() => {
    const el = videoRef.current;
    return () => {
      if (el) releaseVideoElement(el);
    };
  }, [src, inView]);

  return (
    <div ref={wrapperRef} className="absolute inset-0" data-testid="lazy-video" data-in-view={inView}>
      {inView && <video key={safeSrc} ref={videoRef} src={safeSrc} preload="auto" {...videoProps} />}
    </div>
  );
};

export default LazyVideo;
