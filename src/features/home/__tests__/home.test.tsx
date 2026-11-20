import { QueryClient } from '@tanstack/react-query';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { Stack } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import type { ReactNode } from 'react';

import { renderApp } from '@/components/shell/testing/render-app';
import { createFixtureSource, DataError, DataProvider } from '@/data';

// Jest resolves the iOS files, so the desktop variant is imported by its path.
import { HomeScreen as DesktopHome } from '../HomeScreen.web';

const value = async (metric: string) => (await screen.findByTestId(`sensor-${metric}-value`)).props.children;

describe('iPhone Home', () => {
  it('shows the plant, the server status and the four sensors', async () => {
    await renderApp('/');
    await screen.findByTestId('home-screen');
    expect(await value('soil')).toBe('42');
    expect(await value('light')).toBe('1,240');
    expect(await value('temperature')).toBe('23.4');
    expect(await value('humidity')).toBe('58');
    expect(within(screen.getByTestId('plant-mood')).getByText('Feeling great')).toBeTruthy();
    expect(screen.getByTestId('plant-summary').props.children).toBe("All good, I'm feeling great");
    expect(screen.getByText('Insights are coming soon')).toBeTruthy();
    expect(screen.queryByText('Log care')).toBeNull();
  });

  it('shows the latest plant reply', async () => {
    const { source } = await renderApp('/');
    const home = within(await screen.findByTestId('home-screen'));
    const reply = (await source.getChatPage(source.world.plant.id, 50)).find((m) => m.role === 'plant' && !m.error)!;
    expect(await home.findByText(reply.content)).toBeTruthy();
  });

  it('updates the cards when a new reading arrives, without a reload', async () => {
    // The fixture shows readings up to the real clock, so start two minutes back to leave room for one more.
    const { source } = await renderApp('/', { now: new Date(Date.now() - 120_000) });
    expect(await value('temperature')).toBe('23.4');
    await act(async () => {
      source.addReading({ temperature_c: 25.1 });
    });
    await waitFor(() => expect(screen.getByTestId('sensor-temperature-value').props.children).toBe('25.1'), { timeout: 3000 });
  });

  it('asks to calibrate an uncalibrated probe and shows the raw value', async () => {
    await renderApp('/', { scenario: 'uncalibrated' });
    const home = within(await screen.findByTestId('home-screen'));
    expect(home.getByRole('button', { name: 'Calibrate' })).toBeTruthy();
    expect(within(screen.getByTestId('sensor-soil')).getByText('raw')).toBeTruthy();
  });

  it('shows failed reads without a recalibration prompt', async () => {
    await renderApp('/', { scenario: 'null-reads' });
    const home = within(await screen.findByTestId('home-screen'));
    expect(await value('soil')).toBe('-');
    expect(await value('temperature')).toBe('-');
    expect(home.getAllByText(/^Read failed at \d\d:\d\d$/)).toHaveLength(2);
    expect(home.queryByRole('button', { name: 'Calibrate' })).toBeNull();
  });

  it('shows the offline banner when the sensor is offline', async () => {
    await renderApp('/', { scenario: 'offline' });
    expect(await screen.findByTestId('home-offline')).toBeTruthy();
    expect(screen.getByText(/^olvar-node offline since \d\d:\d\d$/)).toBeTruthy();
    expect(within(screen.getByTestId('plant-mood')).getByText('Offline')).toBeTruthy();
  });
});

function renderDesktop(source = createFixtureSource({ days: 2 })) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <DataProvider source={source} queryClient={queryClient}>
      {children}
    </DataProvider>
  );
  // Shared primitives resolve to their iOS files under Jest, and the iOS header needs a stack around the screen.
  return renderRouter({ _layout: () => <Stack />, index: DesktopHome }, { initialUrl: '/', wrapper });
}

describe('desktop Home', () => {
  it('shows the date and keeps Recent insights as a coming-soon card', async () => {
    await renderDesktop();
    await screen.findByTestId('home-screen');
    expect(screen.getByText(/^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}, \d{4}$/)).toBeTruthy();
    const insights = screen.getByTestId('insights-card');
    expect(within(insights).getByText('Recent insights')).toBeTruthy();
    expect(within(insights).getByText('Coming soon')).toBeTruthy();
    expect(screen.getByText("Today's timeline")).toBeTruthy();
    expect(screen.queryByText('Log care')).toBeNull();
    expect(screen.queryByText(/Health score/)).toBeNull();
    expect(await value('soil')).toBe('42');
  });

  it('lists today’s events', async () => {
    await renderDesktop();
    expect((await screen.findAllByTestId('today-event')).length).toBeGreaterThan(0);
    expect(screen.getByTestId('day-track')).toBeTruthy();
  });

  it('shows an error card and recovers on Retry when the status fails to load', async () => {
    const source = createFixtureSource({ days: 2 });
    const getStatus = source.getStatus.bind(source);
    let fail = true;
    source.getStatus = async (plantId) => {
      if (fail) throw new DataError('fetch failed');
      return getStatus(plantId);
    };
    await renderDesktop(source);
    expect(await screen.findByTestId('home-error')).toBeTruthy();
    fail = false;
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByTestId('home-screen')).toBeTruthy();
  });
});

describe('Home data states', () => {
  it('keeps the cached Home with an inline error when a background refresh fails', async () => {
    const app = await renderApp('/');
    expect(await value('temperature')).toBe('23.4');
    app.source.getLatestReadings = async () => {
      throw new DataError('fetch failed');
    };
    await act(async () => {
      await app.queryClient.refetchQueries({ queryKey: ['latest'] });
    });
    expect(await screen.findByTestId('home-refresh-error')).toBeTruthy();
    expect(screen.queryByTestId('home-error')).toBeNull();
    expect(await value('temperature')).toBe('23.4');
  });

  it('keeps the offline banner when a refresh fails while offline', async () => {
    const app = await renderApp('/', { scenario: 'offline' });
    await screen.findByTestId('home-offline');
    app.source.getStatus = async () => {
      throw new DataError('fetch failed');
    };
    await act(async () => {
      await app.queryClient.refetchQueries({ queryKey: ['status'] });
    });
    expect(await screen.findByTestId('home-refresh-error')).toBeTruthy();
    expect(screen.getByTestId('home-offline')).toBeTruthy();
  });

  it('shows the waiting state, not skeletons, when the plant has no device', async () => {
    const app = await renderApp('/');
    app.source.getDevice = async () => null;
    await app.queryClient.resetQueries();
    await waitFor(() => expect(screen.getByTestId('sensor-soil-value').props.children).toBe('-'));
    expect(within(screen.getByTestId('home-screen')).getByText(/^Nothing to report yet today/)).toBeTruthy();
    expect(screen.queryByTestId('home-loading')).toBeNull();
  });

  it('keeps the waiting state after pull-to-refresh when the plant has no device', async () => {
    const app = await renderApp('/');
    app.source.getDevice = async () => null;
    await app.queryClient.resetQueries();
    await waitFor(() => expect(screen.getByTestId('sensor-soil-value').props.children).toBe('-'));
    const readings = jest.spyOn(app.source, 'getReadings');
    const periods = jest.spyOn(app.source, 'getOfflinePeriods');
    await act(async () => {
      await screen.getByTestId('home-screen').props.refreshControl.props.onRefresh();
    });
    expect(readings).not.toHaveBeenCalled();
    expect(periods).not.toHaveBeenCalled();
    expect(screen.queryByTestId('today-error')).toBeNull();
    expect(screen.queryByTestId('home-error')).toBeNull();
    expect(within(screen.getByTestId('home-screen')).getByText(/^Nothing to report yet today/)).toBeTruthy();
  });
});

describe('Home on a 25-hour day', () => {
  // 23:20 on Sun Nov 1 2026 in New York, the day clocks fall back: the day began 25 h 20 min ago.
  const NOW = new Date('2026-11-02T04:20:00Z');

  beforeEach(() => {
    jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate'] });
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('includes the first hour of the day in today’s low and high', async () => {
    const source = createFixtureSource({ days: 2, now: NOW, timeZone: 'America/New_York' });
    const first = source.world.readings.find((r) => r.recorded_at >= '2026-11-01T04:00:00Z')!;
    expect(first.recorded_at < '2026-11-01T04:20:00Z').toBe(true);
    first.temperature_c = 3;
    await renderDesktop(source);
    const card = within(await screen.findByTestId('sensor-temperature'));
    expect(await card.findByText(/^Low 3\.0/)).toBeTruthy();
  });
});
