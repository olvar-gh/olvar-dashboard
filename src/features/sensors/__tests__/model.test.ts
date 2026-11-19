import type { HourlyRow, Reading } from '@/data';

import {
  METRICS,
  formatWhen,
  fromHourly,
  fromReadings,
  hardwareText,
  hourlyAverages,
  latestValue,
  rangeSummary,
  silentFor,
  statText,
  valueText,
} from '../model';

const MIN = 60_000;
const t0 = Date.parse('2026-11-16T05:00:00Z');
const spec = (key: string) => METRICS.find((m) => m.key === key)!;

function reading(i: number, patch: Partial<Reading> = {}): Reading {
  return {
    id: i,
    boot_id: 'b',
    clock_source: 'ntp',
    device_id: 'olvar-a1b2c3',
    received_at: new Date(t0 + i * MIN).toISOString(),
    recorded_at: new Date(t0 + i * MIN).toISOString(),
    rssi_dbm: null,
    seq: i,
    uptime_ms: i * MIN,
    temperature_c: 20 + (i % 10) / 10,
    humidity_pct: 50,
    lux: i < 60 ? 100 : 300,
    soil_raw: 2000 + i,
    soil_pct: 40,
    ...patch,
  };
}

function hourly(i: number, patch: Partial<HourlyRow> = {}): HourlyRow {
  const base = {
    bucket: new Date(t0 + i * 60 * MIN).toISOString(),
    device_id: 'olvar-a1b2c3',
    n: 60,
    sealed: true,
    soil_raw_counts: [],
    soil_raw_values: [],
  };
  const metric = (p: string, avg: number | null, min: number | null, max: number | null, n: number) => ({
    [`${p}_avg`]: avg,
    [`${p}_min`]: min,
    [`${p}_max`]: max,
    [`${p}_n`]: n,
  });
  return {
    ...base,
    ...metric('temperature_c', 20, 19, 21, 60),
    ...metric('humidity_pct', 50, 48, 52, 60),
    ...metric('lux', 100, 0, 300, 60),
    ...metric('soil_raw', 2100, 2000, 2200, 60),
    soil_pct_avg: 40,
    soil_pct_min: 38,
    soil_pct_max: 42,
    ...patch,
  } as HourlyRow;
}

describe('fromReadings (24 h)', () => {
  const rows = Array.from({ length: 1440 }, (_, i) => reading(i));
  const from = new Date(t0);
  const to = new Date(t0 + 1440 * MIN);

  it('keeps every row past the 1,000-row page so the last point is the latest reading', () => {
    const data = fromReadings(rows, from, to, true, 'UTC');
    const series = data.metrics.temperature.series;
    expect(series).toHaveLength(1440);
    expect(series[series.length - 1]).toEqual({ t: rows[1439].recorded_at, v: rows[1439].temperature_c });
  });

  it('computes min, avg and max over the readings, skipping failed reads', () => {
    const withNull = [...rows.slice(0, 3), reading(3, { temperature_c: null })];
    const stats = fromReadings(withNull, from, to, true, 'UTC').metrics.temperature.stats!;
    expect(stats.min).toBe(20);
    expect(stats.max).toBeCloseTo(20.2);
    expect(stats.avg).toBeCloseTo(20.1);
  });

  it('charts the raw soil value while uncalibrated', () => {
    const data = fromReadings(rows.slice(0, 2), from, to, false, 'UTC');
    expect(data.metrics.soil.series.map((p) => p.v)).toEqual([2000, 2001]);
  });

  it('averages light per hour for the bars', () => {
    const bars = hourlyAverages(rows.slice(0, 120), 'lux', 'UTC');
    expect(bars).toEqual([
      { t: t0, v: 100 },
      { t: t0 + 60 * MIN, v: 300 },
    ]);
  });

  it('buckets light by the plant-local hour in a half-hour time zone', () => {
    const kolkata = [
      { recorded_at: '2026-11-05T18:40:00Z', lux: 100 },
      { recorded_at: '2026-11-05T19:20:00Z', lux: 300 },
    ].map((p) => ({ ...reading(0), ...p }));
    expect(hourlyAverages(kolkata, 'lux', 'Asia/Kolkata')).toEqual([{ t: Date.parse('2026-11-05T18:30:00Z'), v: 200 }]);
  });

  it('marks an hour whose reads all failed as null', () => {
    const failed = Array.from({ length: 3 }, (_, i) => reading(i, { lux: null }));
    expect(hourlyAverages(failed, 'lux', 'UTC')).toEqual([{ t: t0, v: null }]);
  });
});

describe('fromHourly (7 d / 30 d)', () => {
  it('uses min of mins, max of maxes and a count-weighted mean', () => {
    const rows = [hourly(0), hourly(1, { temperature_c_avg: 26, temperature_c_max: 27, temperature_c_n: 20 })];
    const stats = fromHourly(rows, '7d', new Date(t0), new Date(t0 + 7 * 1440 * MIN), true).metrics.temperature.stats!;
    expect(stats).toEqual({ min: 19, max: 27, avg: (20 * 60 + 26 * 20) / 80 });
  });

  it('weights soil % by the raw sample count', () => {
    const rows = [hourly(0), hourly(1, { soil_pct_avg: 50, soil_raw_n: 180 })];
    const stats = fromHourly(rows, '30d', new Date(t0), new Date(t0), true).metrics.soil.stats!;
    expect(stats.avg).toBeCloseTo((40 * 60 + 50 * 180) / 240);
  });

  it('has no stats when every bucket is empty', () => {
    const rows = [hourly(0, { humidity_pct_avg: null, humidity_pct_min: null, humidity_pct_max: null, humidity_pct_n: 0 })];
    expect(fromHourly(rows, '7d', new Date(t0), new Date(t0), true).metrics.humidity.stats).toBeNull();
  });
});

describe('card text', () => {
  it('formats values and stats per metric', () => {
    expect(valueText(spec('temperature'), 23.44, true)).toBe('23.4');
    expect(valueText(spec('light'), 1240, true)).toBe('1,240');
    expect(valueText(spec('soil'), null, true)).toBe('—');
    expect(statText(spec('soil'), 34, true)).toBe('34%');
    expect(statText(spec('soil'), 2214, false)).toBe('2,214');
    expect(statText(spec('temperature'), 19.8, true)).toBe('19.8 °C');
    expect(rangeSummary(spec('soil'), { min: 34, avg: 49, max: 66 }, '24h', true)).toBe('34–66% in 24 h');
    expect(rangeSummary(spec('light'), { min: 0, avg: 400, max: 1560 }, '7d', true)).toBe('Peak 1,560 lux in 7 d');
    expect(rangeSummary(spec('humidity'), null, '30d', true)).toBe('No readings in 30 d');
  });

  it('reads the latest value per metric, raw soil when uncalibrated', () => {
    const r = reading(0);
    expect(latestValue(r, spec('soil'), true)).toBe(40);
    expect(latestValue(r, spec('soil'), false)).toBe(2000);
    expect(latestValue(null, spec('light'), true)).toBeNull();
  });

  it('names the part, its bus and how the latest read went', () => {
    const tz = 'Asia/Seoul';
    const device = { soil_calibrated_at: '2026-11-05T03:00:00Z' };
    expect(hardwareText(spec('soil'), reading(0, { soil_raw: 1980 }), device, true, tz)).toBe(
      'Capacitive v1.2 · GPIO34 · raw 1,980 · calibrated Nov 5',
    );
    expect(hardwareText(spec('soil'), reading(0, { soil_raw: null }), device, true, tz)).toBe(
      'Capacitive v1.2 · GPIO34 · Read failed at 14:00 · calibrated Nov 5',
    );
    expect(hardwareText(spec('soil'), reading(0), null, false, tz)).toBe('Capacitive v1.2 · GPIO34 · raw 2,000 · not calibrated');
    expect(hardwareText(spec('temperature'), reading(0), null, true, tz)).toBe('SHT31 · I²C 0x44 · Read OK');
    expect(hardwareText(spec('light'), reading(0, { lux: null }), null, true, tz)).toBe(
      'GY-302 (BH1750) · I²C 0x23 · Read failed at 14:00',
    );
  });

  it('formats offline times in the plant time zone', () => {
    expect(formatWhen('2026-11-04T07:12:00Z', 'Asia/Seoul')).toBe('Wed, Nov 4 at 16:12');
    expect(silentFor(25 * 60)).toBe('25 min');
    expect(silentFor(3 * 3600)).toBe('3 hours');
    expect(silentFor(2 * 86_400 + 5)).toBe('2 days');
  });
});
