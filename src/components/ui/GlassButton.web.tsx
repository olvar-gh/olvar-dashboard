import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Icon } from '@/components/icons';
import { colors } from '@/theme';

import { GLASS_ICON_SIZE, GLASS_SIZE, glassFallbackShadow, type GlassButtonProps } from './GlassButton.shared';

export type { GlassButtonProps } from './GlassButton.shared';

/** Web version of the glass button: CSS backdrop blur with the Figma fill and edge shadows. */
export function GlassButton({ icon, accessibilityLabel, onPress, size = GLASS_SIZE, disabled = false, style, testID }: GlassButtonProps) {
  const shape = { width: size, height: size, borderRadius: size / 2 };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [shape, styles.glass, pressed && styles.pressed, disabled && styles.disabled, style]}
    >
      <View style={styles.center}>
        <Icon name={icon} size={GLASS_ICON_SIZE} color={colors.text.primary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  glass: {
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    // react-native-web passes backdropFilter through to CSS, but React Native's types do not declare it.
    ...({ backdropFilter: 'blur(12px) saturate(180%)' } as ViewStyle),
    boxShadow: glassFallbackShadow,
  },
  pressed: { backgroundColor: 'rgba(255, 255, 255, 0.75)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.5 },
});
