import { localDate } from '@/domain/time';
import { useGateway } from '../queries/gateway';
import { useDayEvents } from '../queries/offline-periods';
import { usePlantStatus } from '../queries/status';
import { advance, renderWithData, settle } from '../testing/render-with-data';

const NOW = new Date('2026-11-17T05:30:00Z');
const today = localDate('Asia/Seoul', NOW);

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
});
afterEach(() => {
  jest.useRealTimers();
});

function useHome() {
  return { status: usePlantStatus(), today: useDayEvents(today) };
}

describe('status freshness with no Realtime events', () => {
  it('turns Offline at latest_reading_at + 185 s and refetches today with an advanced dayEnd', async () => {
    const { result, source } = await renderWithData(useHome, { now: NOW });
    await settle(() => !!result.current.status.display && !!result.current.today.events);
    expect(result.current.status.display).toMatchObject({ offline: false, overallLabel: 'Feeling great' });
    expect(result.current.today.events!.some((e) => e.kind === 'offline_ongoing')).toBe(false);

    const getStatus = jest.spyOn(source, 'getStatus');
    const getPeriods = jest.spyOn(source, 'getOfflinePeriods');
    await advance(185_000);
    await settle(() => result.current.today.events?.some((e) => e.kind === 'offline_ongoing') ?? false);

    expect(getStatus).toHaveBeenCalled();
    expect(result.current.status.data?.overall).toBe('offline');
    expect(result.current.status.display).toMatchObject({ offline: true, overallLabel: 'Offline' });
    const lastTo = getPeriods.mock.calls.at(-1)![2];
    expect(lastTo.getTime()).toBeGreaterThanOrEqual(NOW.getTime() + 185_000);
    expect(result.current.today.events![0]).toMatchObject({ kind: 'offline_ongoing', text: 'Offline since 14:31' });
  });

  it('ages the cached row to Offline at 181 s even when the refetch fails', async () => {
    const { result, source } = await renderWithData(usePlantStatus, { now: NOW });
    await settle(() => !!result.current.display);
    jest.spyOn(source, 'getStatus').mockRejectedValue(new Error('network down'));
    await advance(179_000);
    expect(result.current.display?.offline).toBe(false);
    await advance(2_000);
    expect(result.current.display).toMatchObject({ offline: true, aged: true, overallLabel: 'Offline' });
    expect(result.current.data?.overall).toBe('great');
  });

  it('keeps the 60 s interval running with no events', async () => {
    const { result, source } = await renderWithData(usePlantStatus, { now: NOW, scenario: 'offline' });
    await settle(() => !!result.current.data);
    const getStatus = jest.spyOn(source, 'getStatus');
    await advance(5 * 60_000);
    expect(getStatus.mock.calls.length).toBeGreaterThanOrEqual(5);
  });

  it('refetches on a devices UPDATE', async () => {
    const { result, source } = await renderWithData(usePlantStatus, { now: NOW });
    await settle(() => !!result.current.display);
    const getStatus = jest.spyOn(source, 'getStatus');
    source.updateDevice({ status: 'offline', status_changed_at: NOW.toISOString() });
    await settle(() => result.current.data?.overall === 'offline');
    expect(getStatus).toHaveBeenCalledTimes(1);
    expect(result.current.display).toMatchObject({ offline: true, offlineSince: NOW });
  });
});

describe('gateway staleness', () => {
  it('never shows a gateway with a 300 s heartbeat offline across 30 min', async () => {
    const { result } = await renderWithData(useGateway, { now: NOW, live: true });
    await settle(() => !!result.current.data);
    for (let t = 0; t < 30 * 60; t += 15) {
      await advance(15_000);
      expect(result.current.stale).toBe(false);
      expect(result.current.ageS).toBeLessThanOrEqual(420);
    }
  });

  it('shows the gateway offline once its heartbeat is over 420 s old', async () => {
    const { result } = await renderWithData(useGateway, { now: NOW });
    await settle(() => !!result.current.data);
    expect(result.current.stale).toBe(false);
    await advance(5 * 60_000 + 15_000);
    expect(result.current.stale).toBe(true);
  });
});
