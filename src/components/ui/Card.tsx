import { StyleSheet, Text, View } from 'react-native';

import { colors, iosColors, typography } from '@/theme';

import type { CardProps } from './Card.types';
import { IOS_GROUP_RADIUS } from './color';

export type { CardProps } from './Card.types';

/** iPhone inset card: white, 26 px radius, no border (Figma iPhone/Range card surface). */
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
    backgroundColor: iosColors.groupedBackgroundSecondary,
    borderRadius: IOS_GROUP_RADIUS,
    borderCurve: 'continuous',
    padding: 16,
    gap: 12,
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titles: { flex: 1, minWidth: 0, gap: 2 },
  title: { ...typography.iosBody, fontFamily: typography.iosSubheadlineEmphasized.fontFamily, color: colors.text.primary },
  subtitle: { ...typography.iosFootnote, color: iosColors.labelSecondary },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
