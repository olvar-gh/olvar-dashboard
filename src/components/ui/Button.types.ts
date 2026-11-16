import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'plain';
/** `small` sits inline (cards, rows, dialogs); `large` is the form button (full width on iOS). */
export type ButtonSize = 'small' | 'large';

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
};
