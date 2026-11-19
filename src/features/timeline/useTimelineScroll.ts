import { useCallback, useEffect, useRef, useState } from 'react';
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, ScrollViewInstance } from 'react-native';

/** Expanded header height (status bar + large-title nav bar) assumed before iOS reports it. */
const FALLBACK_INSET = 155;
/** How much the nav bar shrinks when the large title collapses (96 pt -> 44 pt). */
const LARGE_TITLE = 52;
/** Space left between the header and a day scrolled to. */
const GAP = 8;
/**
 * Days load in above the reader (today grows as readings arrive, skeletons turn into
 * rows), so iOS keeps the first visible view where it is instead of pushing it down.
 */
const KEEP_POSITION = { minIndexForVisible: 0 } as const;

/**
 * Scroll state for the iPhone Timeline. With contentInsetAdjustmentBehavior="automatic"
 * the top of the page is at a negative offset (minus the large-title header), which iOS
 * reports in the first scroll event before the reader touches the page. The Timeline
 * opens at that top (the newest day) and keeps its place while data loads. Fabric clamps
 * a negative `scrollTo` to 0 (under the header), so a new week remounts the scroll view
 * (`key`) to get back to the resting top with the large title expanded.
 */
export function useTimelineScroll(range: string) {
  const ref = useRef<ScrollViewInstance>(null);
  const top = useRef(0);
  const moved = useRef(false);
  const height = useRef(0);
  const shown = useRef(range);
  const [reach, setReach] = useState(0);

  useEffect(() => {
    if (shown.current === range) return;
    shown.current = range;
    moved.current = false;
    setReach(height.current);
  }, [range]);

  /** Scrolls so content at `y` sits just under the header, collapsed once it has scrolled past the title. */
  const scrollToContent = useCallback((y: number) => {
    moved.current = true;
    const expanded = top.current < 0 ? -top.current : FALLBACK_INSET;
    const collapsed = y - (expanded - LARGE_TITLE) - GAP;
    const resting = -expanded;
    const target = collapsed - resting >= LARGE_TITLE ? collapsed : y - expanded - GAP;
    ref.current?.scrollTo({ y: Math.max(resting, target), animated: true });
  }, []);

  const props = {
    maintainVisibleContentPosition: KEEP_POSITION,
    scrollEventThrottle: 100,
    onLayout: (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      height.current = h;
      setReach((r) => Math.max(r, h));
    },
    onScrollBeginDrag: () => {
      moved.current = true;
    },
    onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      if (!moved.current) top.current = y;
      const bottom = y + e.nativeEvent.layoutMeasurement.height;
      setReach((r) => Math.max(r, bottom));
    },
  };

  return { ref, key: range, reach, scrollToContent, props };
}
