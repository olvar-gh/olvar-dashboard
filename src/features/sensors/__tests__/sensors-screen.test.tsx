// Jest resolves the iOS files, so the desktop variant is imported by its path.
import { QueryClient } from '@tanstack/react-query';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { Stack } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import type { ReactNode } from 'react';

import { renderApp } from '@/components/shell/testing/render-app';
import { DataError, DataProvider } from '@/data';
import type { FixtureScenario } from '@/data/fixtures/generate';
import { createFixtureSource } from '@/data/source/fixtures';

import { SensorsScreen as DesktopSensorsScreen } from '../SensorsScreen.web';
import { formatWhen } from '../model';

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
  return Object.assign(app, { source, queryClient });
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
    const sensors = within(await screen.findByTestId('sensors-screen'));
    await sensors.findByTestId('sensor-card-soil');
    const rawCalls = raw.mock.calls.length;
    const spans = () => rollup.mock.calls.map(([, from, to]) => (to.getTime() - from.getTime()) / 86_400_000);
    // Home already holds the 7-day rollup in the shared cache, so 7D may not fetch again.
    await fireEvent.press(sensors.getByRole('tab', { name: '7D' }));
    expect((await sensors.findAllByText(/in 7 d$/)).length).toBe(4);
    await fireEvent.press(sensors.getByRole('tab', { name: '30D' }));
    await waitFor(() => expect(spans().some((d) => d > 29.9)).toBe(true));
    expect(raw).toHaveBeenCalledTimes(rawCalls);
    expect((await sensors.findAllByText(/in 30 d$/)).length).toBe(4);
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
    const sensors = within(await screen.findByTestId('sensors-screen'));
    await sensors.findByTestId('sensor-card-soil');
    expect(screen.getByTestId('sensor-value-soil').props.children).toBe('—');
    expect(sensors.getAllByText(/^Read failed at \d\d:\d\d$/)).toHaveLength(2);
    expect(screen.queryByTestId('soil-not-calibrated')).toBeNull();
  });

  it('shows Retry when the device fails to load', async () => {
    const app = await renderApp('/', {});
    app.source.getDevice = async () => {
      throw new Error('network');
    };
    await app.queryClient.resetQueries();
    await app.queryClient.invalidateQueries();
    expect((await screen.findAllByRole('button', { name: 'Retry' })).length).toBeGreaterThan(0);
  });

  it('shows the waiting state, not skeletons, when the plant has no device', async () => {
    const app = await renderApp('/sensors');
    app.source.getDevice = async () => null;
    await app.queryClient.resetQueries();
    const sensors = within(await screen.findByTestId('sensors-screen'));
    expect(await sensors.findByTestId('sensors-empty')).toBeTruthy();
    expect(sensors.queryByTestId('sensor-skeleton')).toBeNull();
  });

  it('uncalibrated soil shows the raw value and Calibrate', async () => {
    await renderApp('/sensors', { scenario: 'uncalibrated' });
    await screen.findByTestId('soil-not-calibrated');
    expect(within(screen.getByTestId('sensor-card-soil')).getByText('raw')).toBeTruthy();
    expect(within(screen.getByTestId('sensors-screen')).getByRole('button', { name: 'Calibrate' })).toBeTruthy();
  });

  it('keeps Calibrate a VoiceOver element of its own, next to the Timeline action', async () => {
    const app = await renderApp('/sensors', { scenario: 'uncalibrated' });
    await screen.findByTestId('soil-not-calibrated');
    const calibrate = within(screen.getByTestId('sensor-card-soil')).getByRole('button', { name: 'Calibrate' });
    for (let n = calibrate.parent; n; n = n.parent) expect(n.props.accessible).not.toBe(true);
    const summary = screen.getByTestId('sensor-summary-soil');
    expect(summary.props.accessible).toBe(true);
    expect(summary.props.accessibilityHint).toBe('Opens Timeline');
    await fireEvent(summary, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
    await waitFor(() => expect(app.getPathname()).toBe('/timeline'));
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

  it.each(['getPlant', 'getDevice'] as const)('shows Retry, not skeletons, when %s fails', async (method) => {
    const source = createFixtureSource({ days: 2 });
    source[method] = async () => {
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
    expect(screen.queryByTestId('sensor-skeleton')).toBeNull();
  });

  it('shows the waiting state, not skeletons, when the plant has no device', async () => {
    const source = createFixtureSource({ days: 2 });
    source.getDevice = async () => null;
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
    expect(screen.queryByTestId('sensor-skeleton')).toBeNull();
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

describe('Sensors with cached data and the offline view', () => {
  it('keeps the cached offline guidance with an inline error when a refresh fails', async () => {
    const app = await renderApp('/sensors', { scenario: 'offline' });
    await screen.findByTestId('sensors-offline');
    app.source.getStatus = async () => {
      throw new DataError('fetch failed');
    };
    await act(async () => {
      await app.queryClient.refetchQueries({ queryKey: ['status'] });
    });
    expect(await screen.findByTestId('sensors-refresh-error')).toBeTruthy();
    expect(screen.getByTestId('sensors-offline')).toBeTruthy();
  });

  it('keeps the cached cards when the readings refresh fails on desktop', async () => {
    const app = await renderDesktop();
    await screen.findByTestId('sensor-card-humidity');
    app.source.getLatestReadings = async () => {
      throw new DataError('fetch failed');
    };
    await act(async () => {
      await app.queryClient.refetchQueries({ queryKey: ['latest'] });
    });
    expect(await screen.findByTestId('sensors-refresh-error')).toBeTruthy();
    expect(screen.getByTestId('sensor-card-humidity')).toBeTruthy();
  });

  it('says the gateway is being checked while its status loads', async () => {
    const app = await renderApp('/sensors', { scenario: 'offline' });
    await screen.findByTestId('sensors-offline');
    app.source.getGateway = () => new Promise(() => {});
    await act(async () => {
      void app.queryClient.resetQueries({ queryKey: ['gateway'] });
    });
    await waitFor(() => expect(within(screen.getByTestId('gateway-row')).getByText('Checking the Gateway…')).toBeTruthy());
    expect(screen.queryByText('Gateway Is Offline')).toBeNull();
  });

  it('says the gateway status is unavailable when its request fails', async () => {
    const app = await renderApp('/sensors', { scenario: 'offline' });
    await screen.findByTestId('sensors-offline');
    app.source.getGateway = async () => {
      throw new DataError('fetch failed');
    };
    await act(async () => {
      await app.queryClient.resetQueries({ queryKey: ['gateway'] });
    });
    await waitFor(() => expect(within(screen.getByTestId('gateway-row')).getByText('Gateway Status Unavailable')).toBeTruthy());
  });

  describe('on a pinned clock', () => {
    const NOW = new Date('2026-11-17T05:30:00Z');
    beforeEach(() => {
      jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate'] });
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it('says how long since the last reading, not since the device went offline', async () => {
      await renderApp('/sensors', { scenario: 'offline', now: NOW });
      await screen.findByTestId('sensors-offline');
      // The fixture's last reading is 25 min old; the LWT fired 90 s after it.
      expect(screen.getByText(/hasn’t reported for 25 min$/)).toBeTruthy();
    });

    it('dates "hasn’t reported since" from the last reading on desktop', async () => {
      const app = await renderDesktop('offline');
      await screen.findByTestId('sensors-offline');
      const latest = (await app.source.getLatestReadings(app.source.world.device.id, 1))[0];
      const at = formatWhen(latest.recorded_at, app.source.world.plant.timezone);
      expect(screen.getByText(new RegExp(`hasn’t reported since ${at} \\(25 min ago\\)`))).toBeTruthy();
    });
  });
});
