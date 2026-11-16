import { Platform, StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, space } from '@/theme';

import { IOS_GROUP_RADIUS } from './color';

export type SkeletonProps = {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

/** Static placeholder block; not animated, so visual snapshots stay stable. */
export function Skeleton({ width = '100%', height = 14, radius: r = 6, style }: SkeletonProps) {
  return <View aria-hidden style={[styles.block, { width, height, borderRadius: r }, style]} />;
}

export type SkeletonCardProps = {
  minHeight?: number;
  lines?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Card-shaped loading state with a title bar and body lines. */
export function SkeletonCard({ minHeight, lines = 3, style, testID }: SkeletonCardProps) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      accessibilityState={{ busy: true }}
      testID={testID}
      style={[styles.card, minHeight !== undefined && { minHeight }, style]}
    >
      <View style={styles.header}>
        <Skeleton width={32} height={32} radius={16} />
        <Skeleton width="40%" height={16} />
      </View>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? '60%' : '100%'} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.bg.sidebar },
  card: {
    backgroundColor: colors.surface.card,
    gap: 12,
    ...(Platform.OS === 'web'
      ? {
          borderWidth: 1,
          borderColor: colors.border.subtle,
          borderRadius: radius.card,
          paddingHorizontal: space.cardPaddingX,
          paddingVertical: space.cardPaddingY,
        }
      : { borderRadius: IOS_GROUP_RADIUS, padding: 16 }),
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
});
