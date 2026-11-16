import type { SvgProps } from 'react-native-svg';

import { colors } from '@/theme/tokens';

import { icons, type IconName } from './registry';

export type IconProps = Omit<SvgProps, 'width' | 'height' | 'color'> & {
  name: IconName;
  /** Square size in px; defaults to the icon's Figma size. */
  size?: number;
  /** Stroke colour (the Figma icons use text/secondary). */
  color?: string;
};

export function Icon({ name, size, color = colors.text.secondary, ...rest }: IconProps) {
  const Glyph = icons[name];
  const sizeProps = size === undefined ? {} : { width: size, height: size };
  return <Glyph color={color} accessible={false} {...sizeProps} {...rest} />;
}
