import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, space, typography } from '@/theme';

export type CardProps = {
  title?: string;
  subtitle?: string;
  /** Header buttons (Figma Actions slot). */
  actions?: ReactNode;
  children?: ReactNode;
  minHeight?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** White surface, 20 px radius, subtle border (Figma Desktop/Card). */
export function Card({ title, subtitle, actions, children, minHeight, style, testID }: CardProps) {
  const hasHeader = Boolean(title || subtitle || actions);
  return (
    <View testID={testID} style={[styles.root, minHeight !== undefined && { minHeight }, style]}>
      {hasHeader ? (
        <View style={styles.header}>
          <View style={styles.titles}>
            {title ? (
              <Text accessibilityRole="header" style={styles.title}>
                {title}
              </Text>
            ) : null}
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {actions ? <View style={styles.actions}>{actions}</View> : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radius.card,
    paddingHorizontal: space.cardPaddingX,
    paddingVertical: space.cardPaddingY,
    gap: space.cardHeaderGap,
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titles: { flex: 1, minWidth: 0, gap: space.cardTitleGap },
  title: { ...typography.cardTitle, color: colors.text.primary },
  subtitle: { ...typography.cardSubtitle, color: colors.text.tertiary },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
