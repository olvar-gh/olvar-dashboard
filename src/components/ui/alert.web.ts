import type { ActionSheetOptions, ConfirmOptions } from './alert';

export type { ActionSheetOptions, ConfirmOptions } from './alert';

// react-native-web's Alert.alert is a no-op, so the web uses the browser dialogs.
export function confirmAlert({ title, message }: ConfirmOptions): Promise<boolean> {
  return Promise.resolve(window.confirm(message ? `${title}\n\n${message}` : title));
}

export function showActionSheet({ title, options }: ActionSheetOptions): Promise<number | null> {
  const list = options.map((o, i) => `${i + 1}. ${o}`).join('\n');
  const answer = window.prompt(`${title ?? 'Choose'}\n\n${list}`);
  const i = answer == null ? NaN : Number.parseInt(answer, 10) - 1;
  return Promise.resolve(Number.isInteger(i) && i >= 0 && i < options.length ? i : null);
}
