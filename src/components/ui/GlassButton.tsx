import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/icons';
import { colors } from '@/theme';

import { GlassSurface } from './GlassSurface';

export type GlassButtonProps = {
  icon: IconName;
  accessibilityLabel: string;
  onPress?: () => void;
  size?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Circular 50 px toolbar button (Figma iPhone/Glass button) for places outside the native header. */
export function GlassButton({ icon, accessibilityLabel, onPress, size = 50, disabled = false, style, testID }: GlassButtonProps) {
  const shape = { width: size, height: size, borderRadius: size / 2 };
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
      <GlassSurface interactive testID={testID} style={[StyleSheet.absoluteFill, shape]} />
      <View style={[styles.center, disabled && styles.disabled]}>
        <Icon name={icon} size={22} color={colors.text.primary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.4 },
});
