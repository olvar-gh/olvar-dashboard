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

  it('remounts the scroll view on a week change and re-reads its resting top', async () => {
    const { result, rerender, scrollTo } = await setup();
    await act(async () => {
      result.current.props.onLayout(layoutEvent(800));
      // iOS reports the inset-adjusted top before the reader touches the page.
      result.current.props.onScroll(scrollEvent(-155));
      result.current.props.onScrollBeginDrag();
      result.current.props.onScroll(scrollEvent(2400));
    });
    expect(result.current.reach).toBe(3200);
    const before = result.current.key;

    await rerender({ range: '2026-11-08' });
    // Fabric clamps a negative scrollTo to 0, so the week change relies on a fresh scroll view.
    expect(result.current.key).not.toBe(before);
    expect(scrollTo).not.toHaveBeenCalled();
    expect(result.current.reach).toBe(800);

    await act(async () => result.current.props.onScroll(scrollEvent(-150)));
    await act(async () => result.current.scrollToContent(900));
    expect(scrollTo).toHaveBeenLastCalledWith({ y: 900 - (150 - 52) - 8, animated: true });
  });

  it('does not move on the first render or when the week stays the same', async () => {
    const { rerender, scrollTo } = await setup();
    await rerender({ range: '2026-11-15' });
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('puts a picked day just under the collapsed header', async () => {
    const { result, scrollTo } = await setup();
    await act(async () => result.current.props.onScroll(scrollEvent(-155)));
    await act(async () => result.current.scrollToContent(900));
    // The large title collapses on the way (155 -> 103 pt), so the target uses the collapsed height.
    expect(scrollTo).toHaveBeenLastCalledWith({ y: 900 - 103 - 8, animated: true });
    await act(async () => result.current.scrollToContent(0));
    expect(scrollTo).toHaveBeenLastCalledWith({ y: -155, animated: true });
  });
});
