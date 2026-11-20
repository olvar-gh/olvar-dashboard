import { QueryClient } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useState } from 'react';
import { Alert, Pressable, Text } from 'react-native';

import { renderWithFixtures } from '@/components/shell/testing/render-app';
import { DataProvider, createFixtureSource, createQueryClient, type FixtureSource } from '@/data';

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

// A query client's cache holds a gcTime timer (5 min by default) per query and mutation, which
// would keep Jest running long after the tests. Unmount first, then empty every client made here.
const clients: QueryClient[] = [];
function track(client: QueryClient): QueryClient {
  clients.push(client);
  return client;
}
afterEach(async () => {
  await cleanup();
  for (const client of clients.splice(0)) client.clear();
});

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
    const queryClient = track(new QueryClient({ defaultOptions: { queries: { retry: false } } }));
    await render(
      <DataProvider source={source} queryClient={queryClient}>
        <IosSheet />
      </DataProvider>,
    );
    expect(await screen.findByText(/Couldn’t load the soil sensor/)).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });
});

describe('retry after the first readings request failed', () => {
  it('pins the baseline from the retried fetch instead of staying on loading', async () => {
    const source = createFixtureSource({ days: 1 });
    const real = source.getLatestReadings.bind(source);
    let fail = true;
    source.getLatestReadings = jest.fn(async (...args: Parameters<typeof real>) => {
      if (fail) throw new Error('network');
      return real(...args);
    });
    const queryClient = track(new QueryClient({ defaultOptions: { queries: { retry: false } } }));
    await render(
      <DataProvider source={source} queryClient={queryClient}>
        <IosSheet />
      </DataProvider>,
    );
    expect(await screen.findByText(/Couldn’t load the soil sensor/, {}, WAIT)).toBeTruthy();
    fail = false;
    await fireEvent.press(screen.getByRole('button', { name: /Try Again|Retry/ }));
    expect(await screen.findByText(/Waiting for fresh readings · 0 of 3/, {}, WAIT)).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();
    source.stop();
  });
});

describe('reopening with the production query client', () => {
  it('fetches on open and shows the live reading although the cache is still fresh', async () => {
    const source = createFixtureSource({ days: 1 });
    await render(
      <DataProvider source={source} queryClient={track(createQueryClient())}>
        <Reopenable>
          <IosSheet />
        </Reopenable>
      </DataProvider>,
    );
    await screen.findByText(/0 of 3/, {}, WAIT);
    const fetches = jest.spyOn(source, 'getLatestReadings');
    await fireEvent.press(screen.getByRole('button', { name: 'toggle' }));
    await fireEvent.press(screen.getByRole('button', { name: 'toggle' }));
    expect(await screen.findByText(/Waiting for fresh readings · 0 of 3/, {}, WAIT)).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(fetches).toHaveBeenCalled();
  });
});

describe('retake', () => {
  it('restarts the wait from the moment Retake is confirmed', async () => {
    let confirm: (() => void) | undefined;
    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      confirm = buttons?.find((x) => x.text === 'Retake')?.onPress as () => void;
    });
    const { source } = await renderWithFixtures(<IosSheet />);
    const primary = () => screen.getByTestId('calibration-primary');
    await screen.findByText(/0 of 3/);
    await addReadings(source, [2900, 2900, 2900]);
    await waitFor(() => expect(primary()).toBeEnabled(), WAIT);
    await fireEvent.press(primary());
    // The handler awaits the alert, which stays open until `confirm` runs.
    void fireEvent.press(await screen.findByTestId('step-dry'));
    await waitFor(() => expect(confirm).toBeDefined());

    // Three stable readings arrive while the alert is still open.
    await addReadings(source, [2950, 2950, 2950]);
    await screen.findByText('2,950', {}, WAIT);
    await act(async () => confirm!());

    expect(await screen.findByText(/Waiting for fresh readings · 0 of 3/)).toBeTruthy();
    expect(screen.getByText('Capture Dry Reading')).toBeTruthy();
    expect(primary()).toBeDisabled();
  });
});
