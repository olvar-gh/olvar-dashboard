import { addDays, localDate } from '@/domain/time';
import { fetchDayExtrema } from '../queries/extrema';
import type { DataSource } from '../source';
import { createFixtureSource } from '../source/fixtures';
import type { DailyRow, Reading } from '../types';

const NOW = new Date('2026-11-17T05:30:00Z');

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
});
afterEach(() => {
  jest.useRealTimers();
});

function reading(at: string, patch: Partial<Reading> = {}): Reading {
  return {
    id: 1,
    device_id: 'd',
    boot_id: 'b',
    seq: 0,
    uptime_ms: 0,
    recorded_at: at,
    received_at: at,
    clock_source: 'ntp',
    temperature_c: 20,
    humidity_pct: 50,
    lux: 100,
    soil_raw: 2000,
    soil_pct: 50,
    rssi_dbm: null,
    ...patch,
  };
}

function mockSource(daily: Partial<DailyRow> | null) {
  const findReadingWithValue = jest.fn(async (_d: string, _f: Date, _t: Date, column: string, value: number) =>
    reading(`2026-11-14T05:20:00.000Z`, { [column]: value }),
  );
  const findExtremeReading = jest.fn(async (_d: string, _f: Date, _t: Date, column: string, _dir: string) =>
    reading('2026-11-17T04:00:00.000Z', { [column]: 99, soil_pct: 12 }),
  );
  const getDaily = jest.fn(async () => (daily ? [daily as DailyRow] : []));
  return {
    source: { getDaily, findReadingWithValue, findExtremeReading } as unknown as DataSource,
    getDaily,
    findReadingWithValue,
    findExtremeReading,
  };
}

describe('fetchDayExtrema', () => {
  it('takes a completed day value from readings_daily_v and its time from a raw limit-1 lookup', async () => {
    const m = mockSource({
      bucket: '2026-11-14',
      temperature_c_max: 24.6,
      lux_max: 1800,
      humidity_pct_min: 41,
      soil_raw_max: 2400,
      soil_pct_min: 31.3,
    });
    const extrema = await fetchDayExtrema(m.source, 'd', 'Asia/Seoul', '2026-11-14', false, NOW);
    expect(m.getDaily).toHaveBeenCalledWith('d', '2026-11-14', '2026-11-14');
    expect(m.findExtremeReading).not.toHaveBeenCalled();
    const [, from, to, column, value] = m.findReadingWithValue.mock.calls[0];
    expect([from.toISOString(), to.toISOString(), column, value]).toEqual([
      '2026-11-13T15:00:00.000Z',
      '2026-11-14T15:00:00.000Z',
      'temperature_c',
      24.6,
    ]);
    expect(extrema).toEqual([
      { kind: 'temperature_max', value: 24.6, at: '2026-11-14T05:20:00.000Z' },
      { kind: 'light_max', value: 1800, at: '2026-11-14T05:20:00.000Z' },
      { kind: 'humidity_min', value: 41, at: '2026-11-14T05:20:00.000Z' },
      { kind: 'soil_driest', value: 2400, at: '2026-11-14T05:20:00.000Z', soilPct: 31.3 },
    ]);
  });

  it('shows a value without a time when no raw row matches, and nothing without a daily row', async () => {
    const m = mockSource({ bucket: '2026-11-14', temperature_c_max: 24.6 });
    m.findReadingWithValue.mockResolvedValue(null as never);
    const extrema = await fetchDayExtrema(m.source, 'd', 'Asia/Seoul', '2026-11-14', false, NOW);
    expect(extrema[0]).toEqual({ kind: 'temperature_max', value: 24.6, at: null });
    expect(await fetchDayExtrema(mockSource(null).source, 'd', 'Asia/Seoul', '2026-11-14', false, NOW)).toEqual([]);
  });

  it('takes both value and time from raw for today', async () => {
    const m = mockSource(null);
    const extrema = await fetchDayExtrema(m.source, 'd', 'Asia/Seoul', '2026-11-17', true, NOW);
    expect(m.getDaily).not.toHaveBeenCalled();
    expect(m.findExtremeReading.mock.calls.map((c) => [c[3], c[4]])).toEqual([
      ['temperature_c', 'desc'],
      ['lux', 'desc'],
      ['humidity_pct', 'asc'],
      ['soil_raw', 'desc'],
    ]);
    const [, from, to] = m.findExtremeReading.mock.calls[0];
    expect(from.toISOString()).toBe('2026-11-16T15:00:00.000Z');
    expect(to.getTime()).toBe(NOW.getTime() + 1);
    expect(extrema.at(-1)).toEqual({ kind: 'soil_driest', value: 99, at: '2026-11-17T04:00:00.000Z', soilPct: 12 });
  });

  it('attributes a 23:50 maximum in Asia/Kolkata (18:20 UTC) to its local day', async () => {
    const tz = 'Asia/Kolkata';
    const source = createFixtureSource({ now: NOW, timeZone: tz, days: 5 });
    const day = addDays(localDate(tz, NOW), -2);
    const lateMax = source.world.lateMaxAt!;
    expect(lateMax.slice(11, 16)).toBe('18:20');
    expect(localDate(tz, lateMax)).toBe(day);

    const sameDay = await fetchDayExtrema(source, source.world.device.id, tz, day, false, NOW);
    expect(sameDay[0]).toEqual({ kind: 'temperature_max', value: 27.9, at: lateMax });
    const nextDay = await fetchDayExtrema(source, source.world.device.id, tz, addDays(day, 1), false, NOW);
    expect(nextDay[0].value).toBeLessThan(27.9);
  });
});
