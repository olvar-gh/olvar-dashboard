import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, iosColors, radius, space, typography } from '@/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'plain';
/** `small` / `large` are the desktop sizes; `ios` is the full-width iPhone button. */
export type ButtonSize = 'small' | 'large' | 'ios';

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
};

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
  const fg = foreground(variant, size);
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
        sizeStyles[size],
        variantStyles(variant, size),
        pressed && styles.pressed,
        inactive && styles.disabled,
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={fg} /> : icon}
      <Text style={[labelStyle(variant, size), { color: fg }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function foreground(variant: ButtonVariant, size: ButtonSize): string {
  if (variant === 'primary') return colors.surface.card;
  if (variant === 'plain') return colors.brand.olive;
  if (variant === 'destructive') return size === 'ios' ? colors.status.alert : colors.surface.card;
  return colors.text.primary;
}

function labelStyle(variant: ButtonVariant, size: ButtonSize) {
  if (size === 'small') return typography.buttonSmall;
  if (size === 'large') return typography.buttonLarge;
  return variant === 'primary' ? styles.iosPrimaryLabel : typography.iosBody;
}

function variantStyles(variant: ButtonVariant, size: ButtonSize): ViewStyle {
  if (size === 'ios') {
    if (variant === 'primary') return { backgroundColor: colors.brand.olive, borderRadius: radius.pill, height: 50 };
    if (variant === 'destructive') {
      return { backgroundColor: iosColors.groupedBackgroundSecondary, borderRadius: 26, paddingVertical: 12 };
    }
    return { height: 44 };
  }
  switch (variant) {
    case 'primary':
      return { backgroundColor: colors.brand.olive };
    case 'destructive':
      return { backgroundColor: colors.status.alert };
    case 'secondary':
      return { backgroundColor: colors.surface.card, borderWidth: 1, borderColor: colors.border.subtle };
    case 'plain':
      return {};
  }
}

const sizeStyles = StyleSheet.create({
  small: {
    paddingHorizontal: space.buttonPaddingX,
    paddingVertical: space.buttonSmallPaddingY,
    borderRadius: radius.buttonSmall,
  },
  large: {
    paddingHorizontal: space.buttonPaddingX,
    paddingVertical: space.buttonLargePaddingY,
    borderRadius: radius.buttonLarge,
  },
  ios: { alignSelf: 'stretch', paddingHorizontal: 16 },
});

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  iosPrimaryLabel: { ...typography.iosBody, fontFamily: typography.buttonLarge.fontFamily, letterSpacing: 0 },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
});

export function ButtonRow({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, style]}>{children}</View>;
}
