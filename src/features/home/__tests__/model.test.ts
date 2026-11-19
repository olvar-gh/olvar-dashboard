import type { Reading } from '@/data';
import { localDayBounds } from '@/domain/time';

import {
  dayTrack,
  eventRows,
  formatHeaderDate,
  greeting,
  hourlyMeans,
  latestPlantMessage,
  rangeText,
  sensorCard,
  todayStats,
  type SensorInput,
} from '../model';

const TZ = 'Asia/Seoul';
const reading = (recorded_at: string, patch: Partial<Reading> = {}): Reading => ({
  id: 1,
  device_id: 'olvar-a1b2c3',
  boot_id: 'b',
  seq: 0,
  uptime_ms: 0,
  clock_source: 'ntp',
  received_at: recorded_at,
  recorded_at,
  temperature_c: 23.4,
  humidity_pct: 58,
  lux: 1240,
  soil_raw: 2100,
  soil_pct: 42,
  rssi_dbm: -58,
  ...patch,
});

const thresholds = {
  soil_pct: { ok_low: 35, ok_high: 60 },
  temperature_c: { ok_low: 18, ok_high: 27 },
  humidity_pct: { ok_low: 40, ok_high: 70 },
};

const input = (patch: Partial<SensorInput> = {}): SensorInput => ({
  latest: reading('2026-11-06T05:32:00Z'),
  status: { soil_label: 'Just right', soil_status: 'ok', light_label: 'Bright, indirect', light_status: 'ok' },
  calibrated: true,
  thresholds,
  today: { temperature: { min: 19.8, max: 24.6 }, humidity: { min: 52, max: 63 }, light: { min: 0, max: 1560 } },
  timeZone: TZ,
  offline: false,
  ...patch,
});

describe('header text', () => {
  it('greets by local hour with the first name', () => {
    expect(greeting(14, 'Dongmin Lee')).toBe('Good afternoon, Dongmin');
    expect(greeting(8, null)).toBe('Good morning');
    expect(greeting(21, '')).toBe('Good evening');
    expect(greeting(3, 'D')).toBe('Good evening, D');
  });

  it('formats the date in the plant time zone', () => {
    expect(formatHeaderDate(new Date('2026-11-05T20:00:00Z'), TZ)).toBe('Fri, Nov 6, 2026');
  });
});

describe('sensor cards', () => {
  it('shows the value, the server label, the band and a plain fact', () => {
    expect(sensorCard('soil', input())).toMatchObject({ value: '42', unit: '%', statusLabel: 'Just right', range: '35–60%', meta: 'Last 7 days' });
    expect(sensorCard('light', input())).toMatchObject({ value: '1,240', unit: 'lux', statusLabel: 'Bright, indirect', meta: 'Peak 1,560 lux today' });
    expect(sensorCard('temperature', input())).toMatchObject({ value: '23.4', range: '18–27 °C', meta: 'Low 19.8 · High 24.6' });
    expect(sensorCard('humidity', input())).toMatchObject({ value: '58', meta: 'Low 52% · High 63%' });
  });

  it('covers the soil matrix: calibrated/uncalibrated × value/failed read', () => {
    const failed = reading('2026-11-06T05:32:00Z', { soil_raw: null, soil_pct: null });
    expect(sensorCard('soil', input({ calibrated: false }))).toMatchObject({ value: '2,100', unit: 'raw', notCalibrated: true, readFailed: false, range: null });
    expect(sensorCard('soil', input({ calibrated: false, latest: failed }))).toMatchObject({
      value: '—',
      notCalibrated: true,
      readFailed: true,
      meta: 'Read failed at 14:32',
    });
    expect(sensorCard('soil', input({ latest: failed }))).toMatchObject({ value: '—', notCalibrated: false, readFailed: true });
  });

  it('marks a failed read on other metrics and the last reading when offline', () => {
    const latest = reading('2026-11-06T05:32:00Z', { temperature_c: null });
    expect(sensorCard('temperature', input({ latest }))).toMatchObject({ value: '—', readFailed: true, meta: 'Read failed at 14:32' });
    expect(sensorCard('light', input({ offline: true }))).toMatchObject({ value: '1,240', meta: 'Last reading 14:32' });
  });

  it('waits for the first reading', () => {
    expect(sensorCard('humidity', input({ latest: null, status: null }))).toMatchObject({
      value: '—',
      statusLabel: 'No data yet',
      meta: 'Waiting for the first reading',
    });
  });

  it('has no band without thresholds', () => {
    expect(rangeText('light', thresholds)).toBeNull();
  });
});

describe('today', () => {
  const dayStart = new Date('2026-11-05T15:00:00Z');

  it('takes lows and highs only from today', () => {
    const rows = [
      reading('2026-11-05T14:59:00Z', { temperature_c: 5 }),
      reading('2026-11-05T16:00:00Z', { temperature_c: 20, humidity_pct: null }),
      reading('2026-11-05T17:00:00Z', { temperature_c: 22, humidity_pct: 60 }),
    ];
    expect(todayStats(rows, dayStart)).toMatchObject({ temperature: { min: 20, max: 22 }, humidity: { min: 60, max: 60 } });
  });

  it('averages lux per hour', () => {
    const rows = [
      reading('2026-11-05T16:00:00Z', { lux: 100 }),
      reading('2026-11-05T16:30:00Z', { lux: 300 }),
      reading('2026-11-05T17:10:00Z', { lux: null }),
      reading('2026-11-05T18:10:00Z', { lux: 50 }),
    ];
    expect(hourlyMeans(rows, dayStart, new Date('2026-11-06T15:00:00Z'), 'Asia/Seoul')).toEqual([
      { t: Date.parse('2026-11-05T16:00:00Z'), v: 200 },
      { t: Date.parse('2026-11-05T18:00:00Z'), v: 50 },
    ]);
  });

  it('averages lux per local hour in a half-hour time zone', () => {
    const start = new Date('2026-11-05T18:30:00Z');
    const rows = [reading('2026-11-05T18:40:00Z', { lux: 100 }), reading('2026-11-05T19:20:00Z', { lux: 300 })];
    expect(hourlyMeans(rows, start, new Date('2026-11-06T18:30:00Z'), 'Asia/Kolkata')).toEqual([
      { t: Date.parse('2026-11-05T18:30:00Z'), v: 200 },
    ]);
  });

  it('keeps the repeated hour of a fall-back day as two hours', () => {
    const start = new Date('2026-11-01T04:00:00Z');
    const rows = [reading('2026-11-01T05:30:00Z', { lux: 100 }), reading('2026-11-01T06:30:00Z', { lux: 300 })];
    expect(hourlyMeans(rows, start, new Date('2026-11-02T05:00:00Z'), 'America/New_York')).toEqual([
      { t: Date.parse('2026-11-01T05:00:00Z'), v: 100 },
      { t: Date.parse('2026-11-01T06:00:00Z'), v: 300 },
    ]);
  });

  it('picks the newest successful plant reply', () => {
    const msg = (id: number, role: string, error: string | null = null) =>
      ({ id, role, error, content: `m${id}`, created_at: '', plant_id: '', reply_to: null, based_on_reading_at: null, model: null, tokens_in: null, tokens_out: null });
    expect(latestPlantMessage([msg(1, 'plant'), msg(2, 'user'), msg(3, 'plant', 'timeout')])?.id).toBe(1);
    expect(latestPlantMessage([msg(1, 'user')])).toBeNull();
    expect(latestPlantMessage(undefined)).toBeNull();
  });

  it('splits the time off event text and places markers on the day', () => {
    const day = localDayBounds(TZ, '2026-11-06');
    const events = [
      { kind: 'temperature_max' as const, at: new Date('2026-11-06T05:20:00Z'), text: 'Temperature peaked at 24.6 °C · 14:20' },
      { kind: 'offline' as const, at: new Date('2026-11-05T18:10:00Z'), text: 'Offline 03:10–03:52 (42 min)' },
    ];
    expect(eventRows(events, TZ)).toEqual([
      expect.objectContaining({ title: 'Temperature peaked at 24.6 °C', time: '14:20', tag: 'Reading', tone: 'temp' }),
      expect.objectContaining({ title: 'Offline 03:10–03:52 (42 min)', time: '03:10', tag: 'Offline', tone: 'muted' }),
    ]);
    const track = dayTrack(events, [{ started_at: '2026-11-05T18:10:00Z', ended_at: '2026-11-05T18:52:00Z' }], day, new Date('2026-11-06T05:32:00Z'), TZ);
    expect(track.nowLabel).toBe('14:32');
    expect(track.now).toBeCloseTo((14 * 60 + 32) / 1440);
    expect(track.markers).toHaveLength(1);
    expect(track.segments[0].from).toBeCloseTo(190 / 1440);
    expect(track.segments[0].to).toBeCloseTo(232 / 1440);
  });
});
