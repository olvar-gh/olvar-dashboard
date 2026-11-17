import { addDays, localDate, localDayBounds } from '@/domain/time';
import { msUntilNextRollup, useDaily, useHourly } from '../queries/hourly';
import { useLatest } from '../queries/latest';
import { useDayExtrema, useOfflinePeriods } from '../queries/offline-periods';
import { useUpdatePlant } from '../queries/plant';
import { useThresholds } from '../queries/thresholds';
import { advance, renderWithData, settle } from '../testing/render-with-data';

const NOW = new Date('2026-11-17T05:30:00Z');
const TZ = 'Asia/Seoul';

afterEach(() => {
  jest.useRealTimers();
});

describe('rollup queries', () => {
  it('schedule their next read a minute after the :05 rollup run', () => {
    expect(msUntilNextRollup(new Date('2026-11-17T05:30:00Z'))).toBe(36 * 60_000);
    expect(msUntilNextRollup(new Date('2026-11-17T05:05:59Z'))).toBe(1_000);
    expect(msUntilNextRollup(new Date('2026-11-17T05:06:00Z'))).toBe(60 * 60_000);
  });

  it('refresh while mounted across hourly rollups', async () => {
    jest.useFakeTimers({ now: NOW });
    const today = localDate(TZ, NOW);
    const { result, source } = await renderWithData(
      () => ({ hourly: useHourly(7), daily: useDaily(addDays(today, -6), today) }),
      { now: NOW },
    );
    await settle(() => !!result.current.hourly.data && !!result.current.daily.data);
    const getHourly = jest.spyOn(source, 'getHourly');
    const getDaily = jest.spyOn(source, 'getDaily');
    await advance(2 * 3_600_000);
    expect(getHourly).toHaveBeenCalledTimes(2);
    expect(getDaily).toHaveBeenCalledTimes(2);
  });
});

describe('plant edits', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW });
  });

  it('re-read fallback thresholds with the saved overrides', async () => {
    const { result, source } = await renderWithData(() => ({ t: useThresholds(), update: useUpdatePlant() }), {
      now: NOW,
    });
    jest.spyOn(source, 'getEffectiveThresholds').mockResolvedValue(null);
    await settle(() => !!result.current.t.data);
    result.current.update.mutate({
      plantId: source.world.plant.id,
      patch: { threshold_overrides: { soil_pct: { ok_low: 45 } } },
    });
    await settle(() => result.current.t.data?.soil_pct?.ok_low === 45);
    expect(result.current.t.data?.soil_pct?.ok_high).toBe(85);
  });

  it('re-read a day with the new time zone bounds', async () => {
    const day = addDays(localDate(TZ, NOW), -2);
    const { result, source } = await renderWithData(() => ({ p: useOfflinePeriods(day), update: useUpdatePlant() }), {
      now: NOW,
    });
    await settle(() => !!result.current.p.data);
    const getPeriods = jest.spyOn(source, 'getOfflinePeriods');
    result.current.update.mutate({ plantId: source.world.plant.id, patch: { timezone: 'Asia/Kolkata' } });
    const kolkata = localDayBounds('Asia/Kolkata', day);
    await settle(() => getPeriods.mock.calls.some((c) => c[1].getTime() === kolkata.start.getTime()));
    await settle(() => !result.current.p.isFetching);
    const last = getPeriods.mock.calls.at(-1)!;
    expect([last[1], last[2]]).toEqual([kolkata.start, kolkata.end]);
  });
});

describe('calibration changed elsewhere', () => {
  it('re-reads soil % when a devices UPDATE changes dry/wet raw', async () => {
    jest.useFakeTimers({ now: NOW });
    const { result, source } = await renderWithData(useLatest, { now: NOW });
    await settle(() => !!result.current.data);
    expect(result.current.data?.soil_pct).toBe(42);
    source.updateDevice({ soil_dry_raw: 3000, soil_wet_raw: 1200 });
    await settle(() => result.current.data?.soil_pct !== 42);
    expect(result.current.data?.soil_pct).toBe(42.9);
  });

  it('does not re-read soil history for a status-only UPDATE', async () => {
    jest.useFakeTimers({ now: NOW });
    const { result, source } = await renderWithData(useLatest, { now: NOW });
    await settle(() => !!result.current.data);
    const getLatest = jest.spyOn(source, 'getLatestReadings');
    source.updateDevice({ status: 'online', last_seen_at: NOW.toISOString() });
    await advance(1_000);
    expect(getLatest).not.toHaveBeenCalled();
  });
});

describe('local midnight', () => {
  it('re-reads the ended day over its full window, from raw, after midnight', async () => {
    // 23:58 in Seoul.
    const late = new Date('2026-11-17T14:58:00Z');
    jest.useFakeTimers({ now: late });
    const day = localDate(TZ, late);
    const { result, source } = await renderWithData(() => useDayExtrema(day), { now: late, live: true });
    await settle(() => !!result.current.data);
    const findExtreme = jest.spyOn(source, 'findExtremeReading');
    const getDaily = jest.spyOn(source, 'getDaily');

    await advance(5 * 60_000);
    const bounds = localDayBounds(TZ, day);
    const ends = findExtreme.mock.calls.map((c) => c[2].getTime());
    expect(Math.max(...ends)).toBe(bounds.end.getTime());
    expect(getDaily).not.toHaveBeenCalled();
    const lastMinute = source.world.readings.filter((r) => r.recorded_at < bounds.end.toISOString()).at(-1)!;
    expect(lastMinute.recorded_at).toBe('2026-11-17T14:59:00.000Z');
    expect(result.current.data?.find((e) => e.kind === 'soil_driest')).toBeDefined();
  });
});
