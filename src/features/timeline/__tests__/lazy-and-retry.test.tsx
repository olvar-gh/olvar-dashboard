import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { renderApp, renderWithFixtures } from '@/components/shell/testing/render-app';
import { renderWithData, settle } from '@/data/testing/render-with-data';
import { localDate } from '@/domain/time';

import { TimelineScreen as DesktopTimeline } from '../TimelineScreen.web';
import { useWeekChart } from '../useTimeline';

jest.mock('@/components/ui', () => ({
  ...jest.requireActual('@/components/ui'),
  Button: jest.requireActual('@/components/ui/Button.web').Button,
  Card: jest.requireActual('@/components/ui/Card.web').Card,
  PageHeader: jest.requireActual('@/components/ui/PageHeader.web').PageHeader,
}));
jest.mock('@/components/shell', () => ({
  ...jest.requireActual('@/components/shell'),
  useAccountButton: () => ({ avatar: 'D', onAvatarPress: () => {} }),
}));

// Sat Nov 21 2026, 14:30 in Seoul: the whole week is selectable.
const NOW = new Date('2026-11-21T05:30:00Z');
const TZ = 'Asia/Seoul';

jest.setTimeout(30_000);

beforeEach(() => {
  jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate'] });
});
afterEach(() => {
  jest.useRealTimers();
});

describe('Timeline plant load', () => {
  it('offers Retry on iPhone when the plant fails to load, and recovers', async () => {
    const app = await renderApp('/timeline', { now: NOW });
    const getPlant = app.source.getPlant;
    app.source.getPlant = async () => {
      throw new Error('network');
    };
    await app.queryClient.resetQueries({ queryKey: ['plant'] });
    const timeline = within(await screen.findByTestId('timeline'));
    const retry = await timeline.findByRole('button', { name: 'Retry' });
    app.source.getPlant = getPlant;
    await fireEvent.press(retry);
    expect(await screen.findByText('Nov 15 – 21, 2026')).toBeTruthy();
  });

  it('offers Retry on desktop when the plant fails to load', async () => {
    const app = await renderWithFixtures(<DesktopTimeline />, { now: NOW });
    app.source.getPlant = async () => {
      throw new Error('network');
    };
    await app.queryClient.resetQueries({ queryKey: ['plant'] });
    expect(await screen.findByRole('button', { name: 'Retry' })).toBeTruthy();
  });
});

describe('Timeline day loading', () => {
  it('loads today and yesterday first and a further day only once it is wanted', async () => {
    const app = await renderApp('/timeline', { now: NOW });
    const requested = new Set<string>();
    const getPeriods = app.source.getOfflinePeriods;
    app.source.getOfflinePeriods = (deviceId, from, to) => {
      requested.add(localDate(TZ, from));
      return getPeriods(deviceId, from, to);
    };
    await app.queryClient.resetQueries({ queryKey: ['day'] });
    await screen.findByText('Nov 15 – 21, 2026');
    await waitFor(() => expect(requested.has('2026-11-20')).toBe(true));
    expect([...requested].sort()).toEqual(['2026-11-20', '2026-11-21']);

    await fireEvent.press(screen.getByTestId('strip-2026-11-15'));
    await waitFor(() => expect(requested.has('2026-11-15')).toBe(true));
    expect(requested.has('2026-11-16')).toBe(false);
  });
});

describe('Timeline hourly chart', () => {
  it('keeps the first hour of the week in a half-hour time zone', async () => {
    const tz = 'Asia/Kolkata';
    const { result } = await renderWithData(() => useWeekChart('2026-11-15', tz), { now: NOW, days: 7, timeZone: tz });
    await settle(() => result.current.series != null, 200);
    // The week starts at local midnight, 18:30 UTC, half way through the 18:00 UTC bucket.
    expect(result.current.series!.soil[0].t).toBe('2026-11-14T18:30:00.000Z');
  });
});
