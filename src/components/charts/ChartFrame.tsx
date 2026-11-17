import { useState, type ReactNode } from 'react';
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg from 'react-native-svg';

export type ChartFrameProps = {
  height: number;
  /** Fixed width; without it the chart fills its parent and redraws on resize. */
  width?: number;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  children: (width: number) => ReactNode;
};

export function ChartFrame({ height, width, accessibilityLabel, testID, style, children }: ChartFrameProps) {
  const [measured, setMeasured] = useState(0);
  const w = width ?? measured;
  const onLayout = (e: LayoutChangeEvent) => {
    const next = Math.round(e.nativeEvent.layout.width);
    if (next !== measured) setMeasured(next);
  };

  return (
    <View
      style={[{ height, width: width ?? '100%' }, style]}
      onLayout={width === undefined ? onLayout : undefined}
      accessible={!!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      {w > 0 && (
        <Svg width={w} height={height}>
          {children(w)}
        </Svg>
      )}
    </View>
  );
}
