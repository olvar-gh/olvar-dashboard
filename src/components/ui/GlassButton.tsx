import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icons';
import { colors } from '@/theme';

import { GLASS_ICON_SIZE, GLASS_SIZE, glassFallbackShadow, type GlassButtonProps } from './GlassButton.shared';

export type { GlassButtonProps } from './GlassButton.shared';

/** Circular toolbar button: Liquid Glass on iOS 26+, a frosted-look fallback elsewhere. */
export function GlassButton({ icon, accessibilityLabel, onPress, size = GLASS_SIZE, disabled = false, style, testID }: GlassButtonProps) {
  const shape = { width: size, height: size, borderRadius: size / 2 };
  const liquidGlass = isLiquidGlassAvailable();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={[shape, style]}
    >
      {/* GlassView renders blank under opacity < 1 on it or any ancestor, or when mounted on demand, so only the icon is dimmed. */}
      {liquidGlass ? (
        <GlassView testID={testID && `${testID}-glass`} isInteractive glassEffectStyle="regular" style={[StyleSheet.absoluteFill, shape]} />
      ) : (
        <View testID={testID && `${testID}-fallback`} style={[StyleSheet.absoluteFill, shape, styles.fallback]} />
      )}
      <View style={[styles.center, disabled && styles.disabled]}>
        <Icon name={icon} size={GLASS_ICON_SIZE} color={colors.text.primary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fallback: { backgroundColor: '#f7f7f7', boxShadow: glassFallbackShadow },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.5 },
});
