import type { StyleProp, ViewStyle } from 'react-native';

import type { IconName } from '@/components/icons';

export type GlassButtonProps = {
  icon: IconName;
  accessibilityLabel: string;
  onPress?: () => void;
  size?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export const GLASS_SIZE = 50;
export const GLASS_ICON_SIZE = 22;

/** Figma iPhone/Glass button "Fill + Shadow" layer. */
export const glassFallbackShadow =
  '1.25px 0px 0px -0.75px #d0d0d0, -1.25px 0px 0px -0.75px #d0d0d0, 0px 0px 0px 0.5px #e8e8e8, 0px 8px 15px 0px rgba(0, 0, 0, 0.02)';
