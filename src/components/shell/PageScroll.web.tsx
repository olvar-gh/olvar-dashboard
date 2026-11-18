import { StyleSheet, View } from 'react-native';

import { colors, useBreakpoint } from '@/theme';

import { BOTTOM_BAR_CLEARANCE } from './navigation';
import type { PageScrollProps } from './PageScroll';

export type { PageScrollProps } from './PageScroll';

/**
 * Screen container. On web the page is part of the document, which the browser scrolls: it never
 * takes the viewport height, so content keeps its designed size and the page grows (PLAN §5.4).
 * Padding and the content cap come from the width tier.
 */
export function PageScroll({ style, contentContainerStyle, children, testID }: PageScrollProps) {
  const bp = useBreakpoint();
  return (
    <View
      testID={testID}
      style={[
        styles.page,
        {
          paddingHorizontal: bp.shell.paddingX,
          paddingTop: bp.shell.paddingTop,
          paddingBottom: bp.tier === 'compact' ? BOTTOM_BAR_CLEARANCE : 40,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.content,
          { gap: bp.screens.page.headerToContent },
          bp.shell.contentMaxWidth !== null && { maxWidth: bp.shell.contentMaxWidth },
          contentContainerStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: colors.bg.canvas },
  content: { width: '100%' },
});
