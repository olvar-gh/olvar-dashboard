import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { OlvarMark } from '@/components/shell';
import { colors } from '@/theme';

/** The plant in the conversation: the Olvar mark on a sage-tint circle (no face artwork in v1). */
export function PlantAvatar({ size = 30, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  const mark = size * 0.52;
  return (
    <View
      aria-hidden
      style={[styles.root, { width: size, height: size, borderRadius: size / 2 }, style]}
    >
      <OlvarMark width={mark * 0.79} height={mark} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.brand.sageTint, alignItems: 'center', justifyContent: 'center' },
});
