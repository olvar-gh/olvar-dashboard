import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export type CardProps = {
  title?: string;
  subtitle?: string;
  /** Header buttons (Figma Actions slot). */
  actions?: ReactNode;
  children?: ReactNode;
  minHeight?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};
