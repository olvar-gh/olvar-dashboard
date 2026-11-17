import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

export type GlassSurfaceProps = {
  children?: ReactNode;
  interactive?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export const glassFallbackShadow =
  '1.25px 0px 0px -0.75px #d0d0d0, -1.25px 0px 0px -0.75px #d0d0d0, 0px 0px 0px 0.5px #e8e8e8, 0px 8px 15px 0px rgba(0, 0, 0, 0.02)';

/** CSS backdrop blur with the Figma glass fill and edge shadows. */
export function GlassSurface({ children, style, testID }: GlassSurfaceProps) {
  return (
    <View testID={testID} style={[styles.glass, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  glass: {
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    // react-native-web passes backdropFilter through to CSS, but React Native's types do not declare it.
    ...({ backdropFilter: 'blur(12px) saturate(180%)' } as ViewStyle),
    boxShadow: glassFallbackShadow,
  },
});
