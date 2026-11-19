import type { Ref } from 'react';
import { ScrollView, StyleSheet, type ScrollViewInstance, type ScrollViewProps } from 'react-native';

import { iosGroupedBackground } from '@/components/ui/color';

export type PageScrollProps = Omit<ScrollViewProps, 'contentInsetAdjustmentBehavior'> & { ref?: Ref<ScrollViewInstance> };

/**
 * Screen container. On iOS: the scroll view under the native large-title header and tab bar, on
 * the grouped background with the 16 pt margins of the iPhone frames.
 */
export function PageScroll({ style, contentContainerStyle, children, ...rest }: PageScrollProps) {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={[styles.page, style]}
      contentContainerStyle={[styles.content, contentContainerStyle]}
      {...rest}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: iosGroupedBackground },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 20 },
});
