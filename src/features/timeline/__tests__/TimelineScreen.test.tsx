import { screen, within } from '@testing-library/react-native';

import { renderApp } from '@/components/shell/testing/render-app';

const NOW = new Date('2026-11-17T05:30:00Z');

jest.setTimeout(30_000);

beforeEach(() => {
  jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate'] });
});
afterEach(() => {
  jest.useRealTimers();
});

describe('Timeline (iPhone)', () => {
  it('shows the week, the strip and grouped day sections with events', async () => {
    await renderApp('/timeline', { now: NOW });
    expect(await screen.findByText('Nov 15 – 21, 2026')).toBeTruthy();
    expect(await screen.findByTestId('day-2026-11-17')).toBeTruthy();
    // Native tabs keep Home and Sensors mounted too, so text is looked up inside Timeline.
    const timeline = within(screen.getByTestId('timeline'));
    expect(timeline.getByText('Today')).toBeTruthy();
    expect(timeline.getByText('Yesterday')).toBeTruthy();
    expect(await screen.findByText('Device restarted, offline 4 min')).toBeTruthy();
    expect(screen.getByText('14:00 · The ESP32 rebooted and reconnected to the gateway')).toBeTruthy();
    expect(screen.getByTestId('strip-2026-11-18').props.accessibilityState).toMatchObject({ disabled: true });
    expect(await screen.findByTestId('upcoming-care')).toBeTruthy();
    expect(await screen.findByTestId('summary-soil')).toBeTruthy();
  });

  it('shows the offline banner and the ongoing outage', async () => {
    await renderApp('/timeline', { now: NOW, scenario: 'offline' });
    expect(await screen.findByTestId('timeline-offline')).toBeTruthy();
    expect(await within(screen.getByTestId('timeline')).findByText('Offline since 14:06')).toBeTruthy();
  });

  it('shows Retry for a day that failed to load', async () => {
    const app = await renderApp('/timeline', { now: NOW });
    await screen.findByTestId('day-2026-11-17');
    const getPeriods = jest.spyOn(app.source, 'getOfflinePeriods').mockRejectedValue(new Error('network down'));
    await app.queryClient.resetQueries({ queryKey: ['day'] });
    expect((await screen.findAllByText('Couldn’t load this day.')).length).toBeGreaterThan(0);
    getPeriods.mockRestore();
  });
});
