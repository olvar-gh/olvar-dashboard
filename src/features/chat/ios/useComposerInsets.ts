import { useEffect, useRef, useState } from 'react';
import { Keyboard, LayoutAnimation, type LayoutChangeEvent } from 'react-native';

/**
 * Where the pinned composer sits: above the native tab bar, and above the keyboard while it is
 * open. `tabInset` is measured from the safe-area padding around the composer (footer height
 * minus composer height, with the keyboard closed), because the tab bar height belongs to the system.
 */
export function useComposerInsets() {
  const [tabInset, setTabInset] = useState(0);
  const [keyboard, setKeyboard] = useState(0);
  const [dockHeight, setDockHeight] = useState(0);
  const sizes = useRef({ outer: 0, inner: 0 });

  const measure = () => {
    const { outer, inner } = sizes.current;
    if (keyboard === 0 && outer > 0 && inner > 0) setTabInset(Math.max(0, outer - inner));
  };

  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', (e) => {
      LayoutAnimation.configureNext({ duration: e.duration || 250, update: { type: 'keyboard' } });
      setKeyboard(e.endCoordinates.height);
    });
    const hide = Keyboard.addListener('keyboardWillHide', (e) => {
      LayoutAnimation.configureNext({ duration: e.duration || 250, update: { type: 'keyboard' } });
      setKeyboard(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return {
    tabInset,
    /** Height of the docked composer including the tab bar inset, to pad the end of the scroll content. */
    dockHeight,
    lift: Math.max(0, keyboard - tabInset),
    onOuterLayout: (e: LayoutChangeEvent) => {
      sizes.current.outer = e.nativeEvent.layout.height;
      setDockHeight(e.nativeEvent.layout.height);
      measure();
    },
    onInnerLayout: (e: LayoutChangeEvent) => {
      sizes.current.inner = e.nativeEvent.layout.height;
      measure();
    },
  };
}
