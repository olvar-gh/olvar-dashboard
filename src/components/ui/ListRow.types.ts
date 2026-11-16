import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import type { IconName } from '@/components/icons';

export type ListRowStatus = { label: string; live: boolean };

export type ListRowProps = {
  title: string;
  subtitle?: string;
  icon?: IconName;
  status?: ListRowStatus;
  /** Trailing control, usually a small secondary Button. */
  action?: ReactNode;
  /** Top hairline; on for every row after the first. */
  divider?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};
