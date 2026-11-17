import { QueryClient } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';

import { renderWithFixtures } from '@/components/shell/testing/render-app';
import { DataProvider, createFixtureSource, type FixtureSource } from '@/data';

import { CalibrationSheet } from '../CalibrationScreen';
import { useCalibrationWizard } from '../useCalibrationWizard';

const WAIT = { timeout: 4000 };
jest.setTimeout(20_000);

async function addReadings(source: FixtureSource, raws: number[]) {
  await act(async () => {
    for (const soil_raw of raws) source.addReading({ soil_raw, recorded_at: new Date().toISOString() });
  });
}

function IosSheet() {
  return <CalibrationSheet w={useCalibrationWizard()} onSaved={() => {}} />;
}

/** Opens and closes the screen inside one data provider, like reopening it in the app. */
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

describe('reopening', () => {
  it('does not count readings that arrived while the sheet was closed', async () => {
    const { source } = await renderWithFixtures(
      <Reopenable>
        <IosSheet />
      </Reopenable>,
    );
    await screen.findByText(/0 of 3/);
    await fireEvent.press(screen.getByRole('button', { name: 'toggle' }));
    await addReadings(source, [2900, 2900, 2900]);
    await fireEvent.press(screen.getByRole('button', { name: 'toggle' }));
    expect(await screen.findByText('2,900', {}, WAIT)).toBeTruthy();
    expect(screen.getByText(/Waiting for fresh readings · 0 of 3/)).toBeTruthy();
    expect(screen.getByTestId('calibration-primary')).toBeDisabled();
    expect(screen.queryByText(/^Stable/)).toBeNull();
  });
});

describe('initial load errors', () => {
  it('shows the error state, not endless skeletons, when the plant request fails', async () => {
    const source = createFixtureSource({ days: 1 });
    source.getPlant = async () => {
      throw new Error('network');
    };
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await render(
      <DataProvider source={source} queryClient={queryClient}>
        <IosSheet />
      </DataProvider>,
    );
    expect(await screen.findByText(/Couldn’t load the soil sensor/)).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });
});
