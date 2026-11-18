import { useEffect, useRef } from 'react';

export const NEAR_BOTTOM_PX = 240;

/** The scrolling document, injectable so the follow rules can be tested without a browser. */
export type FollowPage = {
  /** Distance in px from the bottom of the visible area to the end of the chat. */
  distanceToEnd(): number;
  scrollToEnd(behavior: 'auto' | 'smooth'): void;
  /** Calls `onScroll` on scroll and `onUserInput` on wheel, touch or key input; returns an unsubscribe. */
  subscribe(onScroll: () => void, onUserInput: () => void): () => void;
  nextFrame(fn: () => void): void;
};

/**
 * The document scrolls, but the end of the chat is an anchor inside it: in one column, Past
 * conversations follow the chat card. `bottomInset` is the part of the viewport the compact
 * bottom bar covers.
 */
export function anchorPage(anchorId: string, bottomInset: number): FollowPage {
  if (typeof document === 'undefined') return noPage;
  const distanceToEnd = () => {
    const anchor = document.getElementById(anchorId);
    return anchor ? anchor.getBoundingClientRect().bottom - (window.innerHeight - bottomInset) : 0;
  };
  return {
    distanceToEnd,
    scrollToEnd: (behavior) => window.scrollTo({ top: window.scrollY + distanceToEnd(), behavior }),
    subscribe: browserEvents,
    nextFrame: (fn) => requestAnimationFrame(fn),
  };
}

const noPage: FollowPage = { distanceToEnd: () => 0, scrollToEnd: () => {}, subscribe: () => () => {}, nextFrame: () => {} };

function browserEvents(onScroll: () => void, onUserInput: () => void) {
  const input = ['wheel', 'touchstart', 'keydown'] as const;
  window.addEventListener('scroll', onScroll, { passive: true });
  input.forEach((t) => window.addEventListener(t, onUserInput, { passive: true }));
  return () => {
    window.removeEventListener('scroll', onScroll);
    input.forEach((t) => window.removeEventListener(t, onUserInput));
  };
}

/**
 * Keeps the newest message in view: on first load, and when content arrives while the reader is
 * at the end. Whether the reader is at the end is recorded from scroll events before the content
 * changes, because measuring after a long reply has rendered would put them "far" from the end.
 */
export function useFollowLatest(lastKey: string | null, page: FollowPage) {
  const seen = useRef<string | null>(null);
  const atEnd = useRef(true);
  // A smooth scroll passes through positions far from the end; it still counts as being at the end.
  const following = useRef(false);

  useEffect(() => {
    return page.subscribe(
      () => {
        const near = page.distanceToEnd() <= NEAR_BOTTOM_PX;
        if (following.current && page.distanceToEnd() <= 1) following.current = false;
        atEnd.current = following.current || near;
      },
      () => {
        following.current = false;
      },
    );
  }, [page]);

  useEffect(() => {
    if (lastKey == null) return;
    const first = seen.current == null;
    seen.current = lastKey;
    if (!first && !atEnd.current) return;
    following.current = true;
    atEnd.current = true;
    page.nextFrame(() => page.scrollToEnd(first ? 'auto' : 'smooth'));
  }, [lastKey, page]);
}
