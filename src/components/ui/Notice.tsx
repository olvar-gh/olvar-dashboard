import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/icons';
import { colors, typography } from '@/theme';

export type NoticeTone = 'info' | 'warn';

export type NoticeProps = {
  children: ReactNode;
  tone?: NoticeTone;
  icon?: IconName;
  /** Trailing control, e.g. a small Button. */
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const TONES: Record<NoticeTone, { bg: string; fg: string; icon: IconName }> = {
  info: { bg: colors.brand.sageTint, fg: colors.brand.olive, icon: 'leaf' },
  warn: { bg: colors.data.lightTint, fg: colors.text.primary, icon: 'alert' },
};

/** Inline sage notice (Figma Desktop/Notice); `warn` is the error/attention variant. */
export function Notice({ children, tone = 'info', icon, action, style, testID }: NoticeProps) {
  const t = TONES[tone];
  return (
    <View testID={testID} style={[styles.root, { backgroundColor: t.bg }, style]}>
      <Icon name={icon ?? t.icon} size={14} color={tone === 'warn' ? colors.status.warn : t.fg} />
      <Text accessibilityRole={tone === 'warn' ? 'alert' : undefined} style={[styles.text, { color: t.fg }]}>
        {children}
      </Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 12,
    paddingRight: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  text: { ...typography.label, flex: 1, minWidth: 0 },
});
