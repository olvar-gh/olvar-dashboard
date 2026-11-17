// Jest resolves the iOS files, so the desktop variant is imported by its path.
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { renderWithFixtures } from '@/components/shell/testing/render-app';
import { keys, type FixtureSource } from '@/data';

import { CalibrationScreen } from '../CalibrationScreen.web';

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  router: { canGoBack: jest.fn(() => false), back: jest.fn(), replace: jest.fn() },
}));

const WAIT = { timeout: 4000 };
jest.setTimeout(20_000);

// The fixture only serves readings recorded up to the current time.
async function addReadings(source: FixtureSource, raws: (number | null)[]) {
  await act(async () => {
    for (const soil_raw of raws) source.addReading({ soil_raw, recorded_at: new Date().toISOString() });
  });
}

const button = (name: string) => screen.getByRole('button', { name });

describe('desktop calibration dialog', () => {
  beforeEach(() => jest.clearAllMocks());

  it('describes a calibrated sensor and captures both steps before saving', async () => {
    const { source } = await renderWithFixtures(<CalibrationScreen />);
    expect(await screen.findByText(/Capacitive · GPIO34 · last calibrated \w+ \d+ · dry 2,900 · wet 1,300/)).toBeTruthy();
    expect(button('Capture dry reading')).toBeDisabled();
    expect(button('Save calibration')).toBeDisabled();
    expect(screen.getByText('After the dry reading')).toBeTruthy();

    await addReadings(source, [2920, 2920, 2920]);
    await waitFor(() => expect(button('Capture dry reading')).toBeEnabled(), WAIT);
    await fireEvent.press(button('Capture dry reading'));
    expect(await screen.findByText('Captured · 2,920')).toBeTruthy();

    await addReadings(source, [1340, 1340, 1340]);
    await waitFor(() => expect(button('Capture wet reading')).toBeEnabled(), WAIT);
    await fireEvent.press(button('Capture wet reading'));
    await waitFor(() => expect(button('Save calibration')).toBeEnabled());
    await fireEvent.press(button('Save calibration'));
    await waitFor(() => expect(source.world.device).toMatchObject({ soil_dry_raw: 2920, soil_wet_raw: 1340 }));
    expect(router.replace).toHaveBeenCalledWith('/settings');
  });

  it('says not calibrated when the device has no dry/wet values', async () => {
    await renderWithFixtures(<CalibrationScreen />, { scenario: 'uncalibrated' });
    expect(await screen.findByText('Capacitive · GPIO34 · not calibrated yet')).toBeTruthy();
  });

  it('shows the server rejection inline', async () => {
    const { source } = await renderWithFixtures(<CalibrationScreen />);
    source.updateCalibration = async () => {
      throw Object.assign(new Error('violates check'), { code: '23514' });
    };
    await screen.findByText(/0 of 3/);
    await addReadings(source, [2900, 2900, 2900]);
    await waitFor(() => expect(button('Capture dry reading')).toBeEnabled(), WAIT);
    await fireEvent.press(button('Capture dry reading'));
    await addReadings(source, [1300, 1300, 1300]);
    await waitFor(() => expect(button('Capture wet reading')).toBeEnabled(), WAIT);
    await fireEvent.press(button('Capture wet reading'));
    await fireEvent.press(button('Save calibration'));
    expect(await screen.findByText(/server rejected these values/)).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('shows a failed read', async () => {
    await renderWithFixtures(<CalibrationScreen />, { scenario: 'null-reads' });
    expect(await screen.findByText(/^Read failed at \d\d:\d\d$/)).toBeTruthy();
  });

  it('shows the offline banner', async () => {
    await renderWithFixtures(<CalibrationScreen />, { scenario: 'offline' });
    expect(await screen.findByTestId('calibration-offline')).toBeTruthy();
  });

  it('shows the empty state when the plant has no device', async () => {
    const { source, queryClient } = await renderWithFixtures(<CalibrationScreen />);
    await screen.findByText(/0 of 3/, {}, WAIT);
    await act(async () => queryClient.setQueryData(keys.device(source.world.plant.id), null));
    expect(await screen.findByText('No soil sensor yet', {}, WAIT)).toBeTruthy();
  });
});
