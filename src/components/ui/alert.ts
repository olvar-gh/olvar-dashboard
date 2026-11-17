import { ActionSheetIOS, Alert, Platform } from 'react-native';

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
};

/** Native iOS alert (Figma iPhone/Alert): Cancel plus one action. Resolves true when the action is chosen. */
export function confirmAlert({ title, message, confirmLabel, cancelLabel = 'Cancel', destructive = false }: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

export type ActionSheetOptions = {
  title?: string;
  message?: string;
  options: readonly string[];
  destructiveIndex?: number;
  cancelLabel?: string;
};

/** Native iOS action sheet. Resolves the chosen option index, or null on cancel. */
export function showActionSheet({ title, message, options, destructiveIndex, cancelLabel = 'Cancel' }: ActionSheetOptions): Promise<number | null> {
  return new Promise((resolve) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title,
          message,
          options: [...options, cancelLabel],
          cancelButtonIndex: options.length,
          destructiveButtonIndex: destructiveIndex,
        },
        (i) => resolve(i === options.length ? null : i),
      );
      return;
    }
    Alert.alert(title ?? '', message, [
      ...options.map((text, i) => ({ text, style: i === destructiveIndex ? ('destructive' as const) : ('default' as const), onPress: () => resolve(i) })),
      { text: cancelLabel, style: 'cancel' as const, onPress: () => resolve(null) },
    ]);
  });
}
