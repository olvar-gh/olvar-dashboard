import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

export type GlassSurfaceProps = {
  children?: ReactNode;
  interactive?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Figma "Fill + Shadow" layer of the kit glass, used where Liquid Glass is unavailable. */
export const glassFallbackShadow =
  '1.25px 0px 0px -0.75px #d0d0d0, -1.25px 0px 0px -0.75px #d0d0d0, 0px 0px 0px 0.5px #e8e8e8, 0px 8px 15px 0px rgba(0, 0, 0, 0.02)';

/**
 * Liquid Glass (expo-glass-effect) on iOS 26+, a frosted fill below. GlassView renders blank
 * when it or an ancestor has opacity < 1 or when mounted on demand, so callers keep it opaque.
 */
export function GlassSurface({ children, interactive = false, style, testID }: GlassSurfaceProps) {
  if (isLiquidGlassAvailable()) {
    return (
      <GlassView testID={testID && `${testID}-glass`} isInteractive={interactive} glassEffectStyle="regular" style={style}>
        {children}
      </GlassView>
    );
  }
  return (
    <View testID={testID && `${testID}-fallback`} style={[styles.fallback, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { backgroundColor: '#f7f7f7', boxShadow: glassFallbackShadow },
});
