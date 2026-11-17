import { screen } from '@testing-library/react-native';

import { renderApp } from '@/components/shell/testing/render-app';

it('opens the calibration sheet at /calibrate', async () => {
  await renderApp('/calibrate');
  expect(await screen.findByTestId('calibration')).toBeTruthy();
  expect(await screen.findByText('Live reading')).toBeTruthy();
  expect(screen.getByText(/new reading every minute/)).toBeTruthy();
});
