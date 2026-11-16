import type { TextStyle } from 'react-native';

import { frauncesFamily, interFamily } from './fonts';
import { textStyles, type TextStyleName, type TextStyleToken } from './tokens';

// Fraunces' optical-size axis spans 9–144; Figma sets it to the font size.
const clampOpsz = (size: number) => Math.min(144, Math.max(9, size));

export function toTextStyle(token: TextStyleToken): TextStyle {
  const metrics = {
    fontSize: token.size,
    ...(token.lineHeight !== undefined && { lineHeight: token.lineHeight }),
    ...(token.letterSpacing !== undefined && { letterSpacing: token.letterSpacing }),
  };

  if (token.family === 'Fraunces') {
    const axes = token.axes ?? { SOFT: 0, WONK: 1 };
    return {
      ...metrics,
      fontFamily: frauncesFamily,
      fontWeight: String(token.weight) as TextStyle['fontWeight'],
      fontVariationSettings:
        `'wght' ${token.weight}, 'opsz' ${clampOpsz(token.size)}, ` +
        `'SOFT' ${axes.SOFT}, 'WONK' ${axes.WONK}`,
    };
  }
  return { ...metrics, fontFamily: interFamily[token.weight] };
}

export const typography = Object.fromEntries(
  Object.entries(textStyles).map(([name, token]) => [name, toTextStyle(token)]),
) as Record<TextStyleName, TextStyle>;
