import { addDays, localDate, localDayBounds } from '@/domain/time';
import { useOfflinePeriods } from '../queries/offline-periods';
import { SIGNAL_COALESCE_MS } from '../realtime';
import type { OfflinePeriodRow } from '../types';
import { advance, renderWithData, settle } from '../testing/render-with-data';

const TZ = 'Asia/Seoul';

afterEach(() => {
  jest.useRealTimers();
});

describe('day queries after local midnight', () => {
  it('re-reads the ended day when the first live refresh comes after midnight', async () => {
    // 23:59:30 in Seoul; no readings arrive, so the 60 s poll at 00:00:30 is the first refresh.
    const late = new Date('2026-11-17T14:59:30Z');
    jest.useFakeTimers({ now: late });
    const day = localDate(TZ, late);
    const { result, source } = await renderWithData(() => useOfflinePeriods(day), { now: late });
    await settle(() => !!result.current.data);
    const getPeriods = jest.spyOn(source, 'getOfflinePeriods');

    await advance(60_000);
    await settle(() => getPeriods.mock.calls.length > 0);
    const bounds = localDayBounds(TZ, day);
    const [, from, to] = getPeriods.mock.calls.at(-1)!;
    expect([from, to]).toEqual([bounds.start, bounds.end]);
  });
});

describe('a past day cached with an ongoing outage', () => {
  it('is re-read once a newer reading shows the device recovered', async () => {
    const now = new Date('2026-11-17T05:30:00Z');
    jest.useFakeTimers({ now });
    const yesterday = addDays(localDate(TZ, now), -1);
    const bounds = localDayBounds(TZ, yesterday);
    const { result, source, queryClient } = await renderWithData(() => useOfflinePeriods(yesterday), { now });
    await settle(() => !!result.current.data);

    let recovered = false;
    const row = (ongoing: boolean): OfflinePeriodRow => ({
      started_at: new Date(bounds.end.getTime() - 30 * 60_000).toISOString(),
      ended_at: bounds.end.toISOString(),
      duration_s: 1800,
      cause: 'no_data',
      ongoing,
    });
    jest.spyOn(source, 'getOfflinePeriods').mockImplementation(async () => [row(!recovered)]);
    await queryClient.invalidateQueries({ queryKey: ['day'] });
    await settle(() => result.current.data?.[0]?.ongoing === true);

    recovered = true;
    await advance(60_000);
    source.addReading();
    await advance(SIGNAL_COALESCE_MS);
    await settle(() => result.current.data?.[0]?.ongoing === false, 200);
  });

  it('is not re-read for a past day without an ongoing period', async () => {
    const now = new Date('2026-11-17T05:30:00Z');
    jest.useFakeTimers({ now });
    const yesterday = addDays(localDate(TZ, now), -1);
    const { result, source } = await renderWithData(() => useOfflinePeriods(yesterday), { now });
    await settle(() => !!result.current.data);
    const getPeriods = jest.spyOn(source, 'getOfflinePeriods');
    await advance(60_000);
    source.addReading();
    await advance(SIGNAL_COALESCE_MS + 1_000);
    expect(getPeriods).not.toHaveBeenCalled();
  });
});
