import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router, usePreventRemove } from 'expo-router';
import { Alert, Pressable, Text } from 'react-native';

import { useDismissGuard } from '../useDismissGuard';

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  router: { canGoBack: jest.fn(() => true), back: jest.fn(), replace: jest.fn() },
  usePreventRemove: jest.fn(),
}));

const prevent = usePreventRemove as jest.Mock;
const lastCall = () => prevent.mock.calls[prevent.mock.calls.length - 1] as [boolean, (e: { repeat: () => void }) => void];

function Probe(props: { dirty: boolean; saving: boolean }) {
  const guard = useDismissGuard(props);
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={guard.close}>
        <Text>Close</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Saved" onPress={guard.leave}>
        <Text>Saved</Text>
      </Pressable>
    </>
  );
}

const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));

function answerAlert(button: 'Cancel' | 'Discard') {
  jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => buttons?.find((b) => b.text === button)?.onPress?.());
}

beforeEach(() => jest.clearAllMocks());

describe('useDismissGuard', () => {
  it('lets the sheet go when nothing was captured', async () => {
    await render(<Probe dirty={false} saving={false} />);
    expect(lastCall()[0]).toBe(false);
  });

  it('blocks a swipe-down while values are captured and asks first', async () => {
    answerAlert('Cancel');
    await render(<Probe dirty saving={false} />);
    expect(lastCall()[0]).toBe(true);
    const repeat = jest.fn();
    await act(async () => lastCall()[1]({ repeat }));
    expect(Alert.alert).toHaveBeenCalledWith('Discard calibration?', expect.any(String), expect.any(Array), expect.any(Object));
    expect(repeat).not.toHaveBeenCalled();
  });

  it('continues the blocked dismissal after Discard, once prevention is lifted', async () => {
    answerAlert('Discard');
    await render(<Probe dirty saving={false} />);
    const repeat = jest.fn();
    await act(async () => lastCall()[1]({ repeat }));
    expect(lastCall()[0]).toBe(false);
    expect(repeat).toHaveBeenCalledTimes(1);
    expect(router.back).not.toHaveBeenCalled();
  });

  it('blocks dismissal without asking while a save is in flight', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    await render(<Probe dirty saving />);
    expect(lastCall()[0]).toBe(true);
    await act(async () => lastCall()[1]({ repeat: jest.fn() }));
    expect(alert).not.toHaveBeenCalled();
    await press('Close');
    expect(router.back).not.toHaveBeenCalled();
  });

  it('closes without asking after a save', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    await render(<Probe dirty saving={false} />);
    await press('Saved');
    expect(lastCall()[0]).toBe(false);
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(alert).not.toHaveBeenCalled();
  });
});
