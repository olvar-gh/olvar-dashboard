import { act, renderHook } from '@testing-library/react-native';
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, ScrollViewInstance } from 'react-native';

import { useTimelineScroll } from '../useTimelineScroll';

const scrollEvent = (y: number) =>
  ({ nativeEvent: { contentOffset: { x: 0, y }, layoutMeasurement: { width: 390, height: 800 } } }) as NativeSyntheticEvent<NativeScrollEvent>;
const layoutEvent = (height: number) => ({ nativeEvent: { layout: { x: 0, y: 0, width: 390, height } } }) as LayoutChangeEvent;

async function setup() {
  const scrollTo = jest.fn();
  const hook = await renderHook<ReturnType<typeof useTimelineScroll>, { range: string }>(({ range }) => useTimelineScroll(range), { initialProps: { range: '2026-11-15' } });
  (hook.result.current.ref as { current: unknown }).current = { scrollTo } as unknown as ScrollViewInstance;
  return { ...hook, scrollTo };
}

describe('Timeline scroll (iPhone)', () => {
  it('keeps the visible content in place while days load above it', async () => {
    const { result } = await setup();
    expect(result.current.props.maintainVisibleContentPosition).toEqual({ minIndexForVisible: 0 });
  });

  it('returns to the top under the large title when the week changes', async () => {
    const { result, rerender, scrollTo } = await setup();
    await act(async () => {
      result.current.props.onLayout(layoutEvent(800));
      // iOS reports the inset-adjusted top before the reader touches the page.
      result.current.props.onScroll(scrollEvent(-155));
      result.current.props.onScrollBeginDrag();
      result.current.props.onScroll(scrollEvent(2400));
    });
    expect(result.current.reach).toBe(3200);

    await rerender({ range: '2026-11-08' });
    expect(scrollTo).toHaveBeenCalledWith({ y: -155, animated: false });
    expect(result.current.reach).toBe(800);
  });

  it('does not move on the first render or when the week stays the same', async () => {
    const { rerender, scrollTo } = await setup();
    await rerender({ range: '2026-11-15' });
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('puts a picked day just under the header', async () => {
    const { result, scrollTo } = await setup();
    await act(async () => result.current.props.onScroll(scrollEvent(-155)));
    act(() => result.current.scrollToContent(900));
    expect(scrollTo).toHaveBeenLastCalledWith({ y: 900 - 155 - 8, animated: true });
    act(() => result.current.scrollToContent(0));
    expect(scrollTo).toHaveBeenLastCalledWith({ y: -155, animated: true });
  });
});
