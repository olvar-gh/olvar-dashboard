// Jest resolves the iOS files, so the desktop variant is imported by its path.
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';

import { renderWithFixtures } from '@/components/shell/testing/render-app';
import type { FixtureSource } from '@/data';

import { CalibrationScreen as WebCalibration } from '../CalibrationScreen.web';

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  router: { canGoBack: jest.fn(() => true), back: jest.fn(), replace: jest.fn() },
}));

const WAIT = { timeout: 4000 };
jest.setTimeout(20_000);

async function addReadings(source: FixtureSource, raws: number[]) {
  await act(async () => {
    for (const soil_raw of raws) source.addReading({ soil_raw, recorded_at: new Date().toISOString() });
  });
}

function Reopenable({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel="toggle" onPress={() => setOpen((o) => !o)}>
        <Text>toggle</Text>
      </Pressable>
      {open ? children : null}
    </>
  );
}

beforeEach(() => jest.clearAllMocks());

describe('web dialog while saving', () => {
  function deferredSave(source: FixtureSource) {
    let resolve!: () => void;
    const original = source.updateCalibration.bind(source);
    source.updateCalibration = (id, dry, wet) =>
      new Promise((r) => {
        resolve = () => r(original(id, dry, wet));
      });
    return () => resolve();
  }

  async function captureBoth(source: FixtureSource) {
    const button = (name: string) => screen.getByRole('button', { name });
    await screen.findByText(/0 of 3/, {}, WAIT);
    await addReadings(source, [2900, 2900, 2900]);
    await waitFor(() => expect(button('Capture dry reading')).toBeEnabled(), WAIT);
    await fireEvent.press(button('Capture dry reading'));
    await addReadings(source, [1300, 1300, 1300]);
    await waitFor(() => expect(button('Capture wet reading')).toBeEnabled(), WAIT);
    await fireEvent.press(button('Capture wet reading'));
    // The press handler awaits the held save, so the press itself is not awaited.
    void fireEvent.press(button('Save calibration'));
    await waitFor(() => expect(button('Cancel')).toBeDisabled());
  }

  it('cannot be cancelled mid-save', async () => {
    const { source } = await renderWithFixtures(<WebCalibration />);
    const finish = deferredSave(source);
    await captureBoth(source);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(router.back).not.toHaveBeenCalled();
    await act(async () => finish());
    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
  });

  it('does not navigate when the save finishes after the dialog is gone', async () => {
    const { source } = await renderWithFixtures(
      <Reopenable>
        <WebCalibration />
      </Reopenable>,
    );
    const finish = deferredSave(source);
    await captureBoth(source);
    await fireEvent.press(screen.getByRole('button', { name: 'toggle' }));
    await act(async () => finish());
    await waitFor(() => expect(source.world.device.soil_dry_raw).toBe(2900));
    expect(router.back).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('wraps the probe instructions instead of truncating them', async () => {
    await renderWithFixtures(<WebCalibration />);
    const wet = await screen.findByText('Stand the probe in a glass of water, up to the line');
    expect(wet.props.numberOfLines).toBeUndefined();
    expect(screen.getByText('Hold the probe in open air until the value settles').props.numberOfLines).toBeUndefined();
    expect(screen.getByText('2 · Wet reading').props.numberOfLines).toBeUndefined();
  });
});
