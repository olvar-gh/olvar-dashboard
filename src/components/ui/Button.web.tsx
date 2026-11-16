import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, space, typography } from '@/theme';

import type { ButtonProps, ButtonVariant } from './Button.types';

export type { ButtonProps, ButtonSize, ButtonVariant } from './Button.types';

/** Desktop button (Figma Desktop/Button). */
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
  const fg = foreground(variant);
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
        variantStyles(variant),
        pressed && styles.pressed,
        inactive && styles.disabled,
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={fg} /> : icon}
      <Text style={[size === 'small' ? typography.buttonSmall : typography.buttonLarge, { color: fg }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function foreground(variant: ButtonVariant): string {
  if (variant === 'primary' || variant === 'destructive') return colors.surface.card;
  if (variant === 'plain') return colors.brand.olive;
  return colors.text.primary;
}

function variantStyles(variant: ButtonVariant): ViewStyle {
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
});

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
});

export function ButtonRow({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, style]}>{children}</View>;
}
