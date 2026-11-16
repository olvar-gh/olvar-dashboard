import type { StyleProp, TextInputProps, ViewStyle } from 'react-native';

type Common = {
  label: string;
  /** Help or validation text under the input. */
  hint?: string;
  error?: boolean;
  /** iOS grouped row: hairline above every row after the first. */
  separator?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export type FieldProps = Common & Omit<TextInputProps, 'style'>;

export type SelectFieldProps = Common & {
  value?: string;
  placeholder?: string;
  onPress?: () => void;
};
