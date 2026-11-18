import { Keyboard } from 'react-native';

const KEYBOARD_HIDE_MS = 600;

/**
 * iOS gives focus back to the field that had it when an action sheet closes, which would reopen
 * the keyboard over the day just chosen; the field is blurred before the sheet opens instead.
 */
export function hideKeyboard() {
  if (!Keyboard.isVisible()) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const done = () => {
      sub.remove();
      clearTimeout(timer);
      resolve();
    };
    const sub = Keyboard.addListener('keyboardDidHide', done);
    const timer = setTimeout(done, KEYBOARD_HIDE_MS);
    Keyboard.dismiss();
  });
}
