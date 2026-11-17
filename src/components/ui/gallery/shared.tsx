import type { ReactNode } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { colors, iosColors, typography } from '@/theme';

export const OVERALL: [string, string][] = [
  ['great', 'Thriving'],
  ['okay', 'Doing okay'],
  ['needs_attention', 'Needs attention'],
  ['in_trouble', 'In trouble'],
  ['offline', 'Offline'],
  ['no_data', 'No data yet'],
];

export const METRIC: [string, string][] = [
  ['critical_low', 'Too dry'],
  ['low', 'Getting dry'],
  ['ok', 'Just right'],
  ['high', 'A bit warm'],
  ['critical_high', 'Too hot'],
  ['unknown', 'No data'],
];

export function GallerySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={Platform.OS === 'web' ? styles.titleWeb : styles.titleIos}>
        {title}
      </Text>
      {children}
    </View>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  titleWeb: { ...typography.cardTitle, color: colors.text.primary },
  titleIos: { ...typography.iosTitle1, fontSize: 22, lineHeight: 28, color: iosColors.labelPrimary, paddingHorizontal: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
});
