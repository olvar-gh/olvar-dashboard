import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { colors, iosColors, typography } from '@/theme';

import type { ButtonProps, ButtonVariant } from './Button.types';
import { IOS_GROUP_RADIUS } from './color';

export type { ButtonProps, ButtonSize, ButtonVariant } from './Button.types';

/**
 * iPhone button (Figma iPhone/Button). `large` is the full-width form button: olive capsule,
 * red grouped row, or olive text. `small` is the compact capsule used inline.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'small',
  icon,
  disabled = false,
  loading = false,
  style,
  testID,
  accessibilityLabel,
}: ButtonProps) {
  const inactive = disabled || loading;
  const look = (size === 'large' ? LARGE : SMALL)[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        size === 'large' ? styles.large : styles.small,
        look.box,
        pressed && styles.pressed,
        inactive && styles.disabled,
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={look.label.color as string} /> : icon}
      <Text style={look.label}>{label}</Text>
    </Pressable>
  );
}

type Look = { box: ViewStyle; label: TextStyle };

const bodySemibold: TextStyle = { ...typography.iosBody, fontFamily: typography.iosSubheadlineEmphasized.fontFamily };
const subheadSemibold: TextStyle = typography.iosSubheadlineEmphasized;

const LARGE: Record<ButtonVariant, Look> = {
  primary: { box: { backgroundColor: colors.brand.olive, height: 50 }, label: { ...bodySemibold, letterSpacing: 0, color: colors.surface.card } },
  secondary: { box: { backgroundColor: iosColors.groupedBackgroundSecondary, height: 50 }, label: { ...typography.iosBody, color: colors.brand.olive } },
  destructive: {
    box: { backgroundColor: iosColors.groupedBackgroundSecondary, minHeight: 46, borderRadius: IOS_GROUP_RADIUS },
    label: { ...typography.iosBody, color: colors.status.alert },
  },
  plain: { box: { height: 44 }, label: { ...typography.iosBody, color: colors.brand.olive } },
};

const SMALL: Record<ButtonVariant, Look> = {
  primary: { box: { backgroundColor: colors.brand.olive }, label: { ...subheadSemibold, color: colors.surface.card } },
  secondary: { box: { backgroundColor: iosColors.fillTertiary }, label: { ...subheadSemibold, color: colors.brand.olive } },
  destructive: { box: { backgroundColor: iosColors.fillTertiary }, label: { ...subheadSemibold, color: colors.status.alert } },
  plain: { box: {}, label: { ...typography.iosSubheadline, color: colors.brand.olive } },
};

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 1000 },
  large: { alignSelf: 'stretch', paddingHorizontal: 16 },
  small: { minHeight: 34, paddingHorizontal: 14, paddingVertical: 7 },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
});

export function ButtonRow({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, style]}>{children}</View>;
}
