import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { iosColors, typography } from '@/theme';

/** Grouped list section header (Figma iPhone/Section header). */
export function SectionHeader({ label }: { label: string }) {
  return (
    <View style={styles.header}>
      <Text accessibilityRole="header" style={styles.headerText}>
        {label}
      </Text>
    </View>
  );
}

/** Grouped list help text (Figma iPhone/Section footer). */
export function SectionFooter({ children }: { children: ReactNode }) {
  return (
    <View style={styles.footer}>
      <Text style={styles.footerText}>{children}</Text>
    </View>
  );
}

export type ListSectionProps = {
  header?: string;
  footer?: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Inset grouped list: header, rounded white rows, footer (Figma iPhone/List section). */
export function ListSection({ header, footer, children, style }: ListSectionProps) {
  return (
    <View style={style}>
      {header ? <SectionHeader label={header} /> : null}
      <View style={styles.group}>{children}</View>
      {footer ? <SectionFooter>{footer}</SectionFooter> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingLeft: 16, paddingTop: 14, paddingBottom: 2 },
  headerText: { ...typography.iosFootnoteEmphasized, color: iosColors.labelSecondary },
  footer: { paddingHorizontal: 16, paddingTop: 2 },
  footerText: { ...typography.iosFootnote, color: iosColors.labelSecondary },
  group: {
    marginTop: 6,
    marginBottom: 6,
    backgroundColor: iosColors.groupedBackgroundSecondary,
    borderRadius: 26,
    overflow: 'hidden',
  },
});
