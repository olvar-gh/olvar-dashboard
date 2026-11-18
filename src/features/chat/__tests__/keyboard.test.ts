import { Keyboard, type EmitterSubscription } from 'react-native';

import { hideKeyboard } from '../ios/keyboard';

describe('hideKeyboard before an action sheet', () => {
  afterEach(() => jest.restoreAllMocks());

  function keyboard(visible: boolean) {
    const hides: (() => void)[] = [];
    jest.spyOn(Keyboard, 'isVisible').mockReturnValue(visible);
    jest.spyOn(Keyboard, 'addListener').mockImplementation((event, fn) => {
      if (event === 'keyboardDidHide') hides.push(fn as () => void);
      return { remove: () => hides.splice(hides.indexOf(fn as () => void), 1) } as unknown as EmitterSubscription;
    });
    const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
    return { hides, dismiss };
  }

  it('dismisses an open keyboard and waits until it has hidden', async () => {
    const { hides, dismiss } = keyboard(true);
    let done = false;
    const hidden = hideKeyboard().then(() => (done = true));
    expect(dismiss).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    expect(done).toBe(false);
    hides.forEach((fn) => fn());
    await hidden;
    expect(hides).toHaveLength(0);
  });

  it('goes on after a while if the hide event never comes', async () => {
    jest.useFakeTimers();
    keyboard(true);
    const hidden = hideKeyboard();
    jest.advanceTimersByTime(600);
    await expect(hidden).resolves.toBeUndefined();
    jest.useRealTimers();
  });

  it('does nothing when the keyboard is closed', async () => {
    const { dismiss } = keyboard(false);
    await hideKeyboard();
    expect(dismiss).not.toHaveBeenCalled();
  });
});
