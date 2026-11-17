// Jest resolves the iOS files, so the desktop variant is imported by its path.
import { QueryClient } from '@tanstack/react-query';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { Stack } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import type { ReactNode } from 'react';

import { renderApp } from '@/components/shell/testing/render-app';
import { DataProvider } from '@/data';
import type { FixtureScenario } from '@/data/fixtures/generate';
import { createFixtureSource } from '@/data/source/fixtures';

import { SensorsScreen as DesktopSensorsScreen } from '../SensorsScreen.web';

type Node = { props?: Record<string, unknown>; children?: (Node | string)[] | null };

/** Every text on screen with dates, ages and digits masked, so the snapshot follows structure, not the clock. */
function textOf(json: unknown): string[] {
  const out: string[] = [];
  const walk = (n: unknown) => {
    if (n == null) return;
    if (typeof n === 'string') {
      return void out.push(
        n
          .replace(/\d+ (s|min|h|d) ago/g, 'N ago')
          .replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/g, 'Mon')
          .replace(/\b(Sun|Mon|Tue|Wed|Thu|Fri|Sat),/g, 'Day,')
          .replace(/\d/g, '#'),
      );
    }
    if (Array.isArray(n)) return n.forEach(walk);
    const node = n as Node & { type?: string };
    if (node.type === 'RNSVGTSpan' || node.type === 'RNSVGText') return;
    node.children?.forEach(walk);
  };
  walk(json);
  return out;
}

async function renderDesktop(scenario?: FixtureScenario, url = '/sensors') {
  const source = createFixtureSource({ days: 2, scenario });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <DataProvider source={source} queryClient={queryClient}>
      {children}
    </DataProvider>
  );
  const app = await renderRouter(
    { _layout: () => <Stack />, sensors: DesktopSensorsScreen, timeline: () => null, calibrate: () => null },
    { initialUrl: url, wrapper },
  );
  return Object.assign(app, { source });
}

describe('iPhone Sensors tab', () => {
  it('shows four cards with server labels and the live subtitle', async () => {
    await renderApp('/sensors');
    for (const key of ['soil', 'light', 'temperature', 'humidity']) {
      expect(await screen.findByTestId(`sensor-card-${key}`)).toBeTruthy();
    }
    expect(screen.getByTestId('sensor-value-temperature').props.children).toBe('23.4');
    expect(screen.getAllByText(/^Live · updated/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/in 24 h$/)).toHaveLength(4);
  });

  it('reads raw readings for 24 h and hourly rollups for 7 d and 30 d', async () => {
    const app = await renderApp('/sensors');
    const raw = jest.spyOn(app.source, 'getReadings');
    const rollup = jest.spyOn(app.source, 'getHourly');
    await screen.findByTestId('sensor-card-soil');
    const rawCalls = raw.mock.calls.length;
    await fireEvent.press(screen.getByRole('tab', { name: '7D' }));
    await waitFor(() => expect(rollup).toHaveBeenCalledTimes(1));
    const [, from7, to7] = rollup.mock.calls[0];
    expect((to7.getTime() - from7.getTime()) / 86_400_000).toBeGreaterThan(6.9);
    await fireEvent.press(screen.getByRole('tab', { name: '30D' }));
    await waitFor(() => expect(rollup).toHaveBeenCalledTimes(2));
    const [, from30, to30] = rollup.mock.calls[1];
    expect((to30.getTime() - from30.getTime()) / 86_400_000).toBeGreaterThan(29.9);
    expect(raw).toHaveBeenCalledTimes(rawCalls);
    expect((await screen.findAllByText(/in 30 d$/)).length).toBe(4);
  });

  it('updates the value when a new reading arrives', async () => {
    const app = await renderApp('/sensors');
    await screen.findByTestId('sensor-card-temperature');
    const last = app.source.world.readings[app.source.world.readings.length - 1];
    app.source.addReading({ temperature_c: 25.1, recorded_at: last.recorded_at });
    // The Realtime signal path is covered in src/data; here the screen only has to follow the query.
    await act(async () => {
      await app.queryClient.invalidateQueries({ queryKey: ['latest'] });
    });
    await waitFor(() => expect(screen.getByTestId('sensor-value-temperature').props.children).toBe('25.1'));
  });

  it('offline: native grouped lists with what to try and the last known readings', async () => {
    await renderApp('/sensors', { scenario: 'offline' });
    const offline = await screen.findByTestId('sensors-offline');
    expect(within(offline).getByText('Sensor Offline')).toBeTruthy();
    expect(within(offline).getByText('Restart Sensor Node')).toBeTruthy();
    expect(within(screen.getByTestId('last-known')).getByText('23.4 °C')).toBeTruthy();
    expect(screen.queryByTestId('sensor-card-soil')).toBeNull();
  });

  it('a failed read shows a dash and the time, without a calibration prompt', async () => {
    await renderApp('/sensors', { scenario: 'null-reads' });
    await screen.findByTestId('sensor-card-soil');
    expect(screen.getByTestId('sensor-value-soil').props.children).toBe('—');
    expect(screen.getAllByText(/^Read failed at \d\d:\d\d$/)).toHaveLength(2);
    expect(screen.queryByTestId('soil-not-calibrated')).toBeNull();
  });

  it('uncalibrated soil shows the raw value and Calibrate', async () => {
    await renderApp('/sensors', { scenario: 'uncalibrated' });
    await screen.findByTestId('soil-not-calibrated');
    expect(within(screen.getByTestId('sensor-card-soil')).getByText('raw')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Calibrate' })).toBeTruthy();
  });
});

describe('desktop Sensors page', () => {
  it.each(['normal', 'offline', 'null-reads', 'uncalibrated'] as const)('%s state', async (scenario) => {
    const app = await renderDesktop(scenario);
    await screen.findByTestId(scenario === 'offline' ? 'sensors-offline' : 'sensor-card-humidity');
    expect(textOf(app.toJSON())).toMatchSnapshot();
  });

  it('shows the hardware footers', async () => {
    await renderDesktop();
    expect((await screen.findByTestId('sensor-hardware-temperature')).props.children).toBe('SHT31 · I²C 0x44 · Read OK');
    expect(screen.getByTestId('sensor-hardware-light').props.children).toBe('GY-302 (BH1750) · I²C 0x23 · Read OK');
    expect(screen.getByTestId('sensor-hardware-soil').props.children).toMatch(
      /^Capacitive v1\.2 · GPIO34 · raw [\d,]+ · calibrated [A-Z][a-z]{2} \d+$/,
    );
  });

  it('keeps the range in the URL', async () => {
    const app = await renderDesktop(undefined, '/sensors?range=30d');
    await screen.findByTestId('sensor-card-soil');
    expect(screen.getByRole('tab', { name: '30 days' }).props.accessibilityState.selected).toBe(true);
    await fireEvent.press(screen.getByRole('tab', { name: '7 days' }));
    await waitFor(() => expect(app.getSearchParams().range).toBe('7d'));
  });

  it('shows Retry when the readings fail to load', async () => {
    const source = createFixtureSource({ days: 2 });
    source.getLatestReadings = async () => {
      throw new Error('network');
    };
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await renderRouter(
      { _layout: () => <Stack />, sensors: DesktopSensorsScreen },
      {
        initialUrl: '/sensors',
        wrapper: ({ children }: { children: ReactNode }) => (
          <DataProvider source={source} queryClient={queryClient}>
            {children}
          </DataProvider>
        ),
      },
    );
    expect(await screen.findByRole('button', { name: 'Retry' })).toBeTruthy();
  });

  it('shows the waiting state before the first reading', async () => {
    const source = createFixtureSource({ days: 2 });
    source.getLatestReadings = async () => [];
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await renderRouter(
      { _layout: () => <Stack />, sensors: DesktopSensorsScreen },
      {
        initialUrl: '/sensors',
        wrapper: ({ children }: { children: ReactNode }) => (
          <DataProvider source={source} queryClient={queryClient}>
            {children}
          </DataProvider>
        ),
      },
    );
    expect(await screen.findByText('Waiting for the first reading')).toBeTruthy();
  });
});
