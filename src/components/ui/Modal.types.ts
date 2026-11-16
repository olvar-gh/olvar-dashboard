import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export const MODAL_WIDTH = 560;

export type ModalAction = { label: string; onPress: () => void; disabled?: boolean; loading?: boolean };

export type ModalCardProps = {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  cancel?: ModalAction;
  confirm?: ModalAction & { destructive?: boolean };
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export type ModalProps = ModalCardProps & {
  visible: boolean;
  /** Back button, Escape, swipe-down and scrim tap. */
  onDismiss: () => void;
};
