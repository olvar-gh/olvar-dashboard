import { useId } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '@/theme';

/**
 * Card wash from the desktop frames: `tint` fading to white. `diagonal` is the sensor cards'
 * 157° gradient (white from 50 %); otherwise it runs top to bottom (white from `to`).
 */
export function Gradient({ tint, diagonal = false, to = 0.5 }: { tint: string; diagonal?: boolean; to?: number }) {
  const id = `g${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none" preserveAspectRatio="none" width="100%" height="100%">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2={diagonal ? '0.39' : '0'} y2="1">
          <Stop offset="0" stopColor={tint} />
          <Stop offset={String(to)} stopColor={colors.surface.card} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}
