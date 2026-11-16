import { fireEvent, render, screen } from '@testing-library/react-native';
import { isLiquidGlassAvailable } from 'expo-glass-effect';

import { GlassButton } from '../GlassButton';

jest.mock('expo-glass-effect', () => {
  const { View } = jest.requireActual('react-native');
  return { GlassView: View, isLiquidGlassAvailable: jest.fn() };
});

const available = jest.mocked(isLiquidGlassAvailable);

describe('GlassButton', () => {
  it('uses GlassView when Liquid Glass is available', async () => {
    available.mockReturnValue(true);
    const onPress = jest.fn();
    await render(<GlassButton icon="chevLeft" accessibilityLabel="Back" onPress={onPress} testID="g" />);
    expect(screen.getByTestId('g-glass')).toBeTruthy();
    expect(screen.queryByTestId('g-fallback')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(onPress).toHaveBeenCalled();
  });

  it('falls back to a plain view below iOS 26', async () => {
    available.mockReturnValue(false);
    await render(<GlassButton icon="gear" accessibilityLabel="Settings" testID="g" />);
    expect(screen.getByTestId('g-fallback')).toBeTruthy();
    expect(screen.queryByTestId('g-glass')).toBeNull();
  });
});
