import { renderHook } from '@testing-library/react-native';

import { NEAR_BOTTOM_PX, useFollowLatest, type FollowPage } from '../desktop/useFollowLatest';

function fakePage() {
  const page = {
    distance: 0,
    scrolled: [] as string[],
    onScroll: () => {},
    onInput: () => {},
    distanceToEnd: () => page.distance,
    scrollToEnd: (b: string) => page.scrolled.push(b),
    subscribe(onScroll: () => void, onInput: () => void) {
      page.onScroll = onScroll;
      page.onInput = onInput;
      return () => {};
    },
    nextFrame: (fn: () => void) => fn(),
  };
  return page;
}

function render(page: FollowPage) {
  return renderHook(({ k }: { k: string | null }) => useFollowLatest(k, page), { initialProps: { k: 'a' as string | null } });
}

describe('desktop follow-latest', () => {
  it('follows a long reply when the reader was at the end before it arrived', async () => {
    const page = fakePage();
    const { rerender } = await render(page);
    expect(page.scrolled).toEqual(['auto']);
    page.distance = 0;
    page.onScroll();
    page.distance = NEAR_BOTTOM_PX + 600;
    await rerender({ k: 'b' });
    expect(page.scrolled).toEqual(['auto', 'smooth']);
  });

  it('leaves a reader who scrolled up where they are', async () => {
    const page = fakePage();
    const { rerender } = await render(page);
    page.onInput();
    page.distance = NEAR_BOTTOM_PX + 1;
    page.onScroll();
    await rerender({ k: 'b' });
    expect(page.scrolled).toEqual(['auto']);
  });

  it('counts a smooth scroll still on its way to the end as at the end', async () => {
    const page = fakePage();
    const { rerender } = await render(page);
    page.distance = 900;
    page.onScroll();
    await rerender({ k: 'b' });
    expect(page.scrolled).toEqual(['auto', 'smooth']);
  });
});
