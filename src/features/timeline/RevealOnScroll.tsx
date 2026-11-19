import { useEffect, useRef, type ComponentRef, type ReactNode } from 'react';
import { View } from 'react-native';

/** Start loading a day this far before it scrolls into view. */
const MARGIN = '400px 0px';

/**
 * Calls `onReveal` once its content nears the viewport (web: the document scrolls). Where
 * IntersectionObserver is unavailable it reveals at once, so the content still loads.
 */
export function RevealOnScroll({ onReveal, children }: { onReveal: () => void; children: ReactNode }) {
  const ref = useRef<ComponentRef<typeof View>>(null);
  const onRevealRef = useRef(onReveal);
  useEffect(() => {
    onRevealRef.current = onReveal;
  }, [onReveal]);

  useEffect(() => {
    const node = ref.current as unknown;
    if (typeof IntersectionObserver === 'undefined' || typeof Element === 'undefined' || !(node instanceof Element)) {
      onRevealRef.current();
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) onRevealRef.current();
      },
      { rootMargin: MARGIN },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return <View ref={ref}>{children}</View>;
}
