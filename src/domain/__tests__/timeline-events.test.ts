import { localDayBounds } from '../time';
import {
  buildDayEvents,
  calibrationEvent,
  chatEvent,
  extremumEvent,
  offlinePeriodEvent,
  type OfflinePeriodRow,
} from '../timeline-events';

const TZ = 'Asia/Seoul';
const day15 = localDayBounds(TZ, '2026-11-15');
const day16 = localDayBounds(TZ, '2026-11-16');

// Seoul is UTC+9: local HH:mm = UTC + 9 h.
const period = (over: Partial<OfflinePeriodRow>): OfflinePeriodRow => ({
  started_at: '2026-11-15T18:10:00Z', // 03:10 on the 16th
  ended_at: '2026-11-15T18:52:00Z',
  duration_s: 42 * 60,
  cause: 'no_data',
  ongoing: false,
  ...over,
});

describe('offlinePeriodEvent', () => {
  it('maps a no_data gap', () => {
    expect(offlinePeriodEvent(period({}), TZ, day16)).toEqual({
      kind: 'offline',
      at: new Date('2026-11-15T18:10:00Z'),
      text: 'Offline 03:10–03:52 (42 min)',
    });
  });

  it('maps a 4-min outage', () => {
    const r = period({ ended_at: '2026-11-15T18:14:00Z', duration_s: 240 });
    expect(offlinePeriodEvent(r, TZ).text).toBe('Offline 03:10–03:14 (4 min)');
  });

  it('maps a device_restart gap', () => {
    const r = period({ cause: 'device_restart', ended_at: '2026-11-15T18:12:00Z', duration_s: 125 });
    expect(offlinePeriodEvent(r, TZ, day16)).toMatchObject({ kind: 'restart', text: 'Device restarted, offline 2 min' });
  });

  it('maps an ongoing period', () => {
    const r = period({ started_at: '2026-11-16T05:02:00Z', ended_at: '2026-11-16T05:30:00Z', ongoing: true });
    expect(offlinePeriodEvent(r, TZ, day16)).toMatchObject({ kind: 'offline_ongoing', text: 'Offline since 14:02' });
  });

  it('treats a period without an end as ongoing', () => {
    expect(offlinePeriodEvent(period({ ended_at: null }), TZ).kind).toBe('offline_ongoing');
  });

  it('shows a midnight-crossing period on both days, clipped by the server', () => {
    // The server returns one clipped row per daily call: 23:40–24:00 and 00:00–00:25.
    const before = period({ started_at: '2026-11-15T14:40:00Z', ended_at: '2026-11-15T15:00:00Z', duration_s: 1200 });
    const after = period({ started_at: '2026-11-15T15:00:00Z', ended_at: '2026-11-15T15:25:00Z', duration_s: 1500 });
    const e15 = buildDayEvents({ timeZone: TZ, day: day15, offlinePeriods: [before], plantName: 'Sparks' });
    const e16 = buildDayEvents({ timeZone: TZ, day: day16, offlinePeriods: [after], plantName: 'Sparks' });
    expect(e15.map((e) => e.text)).toEqual(['Offline 23:40–24:00 (20 min)']);
    expect(e16.map((e) => e.text)).toEqual(['Offline 00:00–00:25 (25 min)']);
  });
});

describe('extremumEvent', () => {
  it.each([
    [{ kind: 'temperature_max', value: 24.6, at: '2026-11-16T05:20:00Z' }, 'Temperature peaked at 24.6 °C · 14:20'],
    [{ kind: 'light_max', value: 1560, at: '2026-11-16T04:05:00Z' }, 'Light peaked at 1,560 lux · 13:05'],
    [{ kind: 'humidity_min', value: 41, at: '2026-11-16T06:30:00Z' }, 'Humidity dropped to 41 % · 15:30'],
    [{ kind: 'soil_driest', value: 2410, soilPct: 31, at: '2026-11-16T09:00:00Z' }, 'Soil was driest at 31 % · 18:00'],
    [{ kind: 'soil_driest', value: 2410, soilPct: null, at: '2026-11-16T09:00:00Z' }, 'Soil was driest at raw 2,410 · 18:00'],
  ] as const)('%o', (e, text) => {
    expect(extremumEvent(e, TZ)?.text).toBe(text);
  });

  it('shows the value without a time when no raw match exists', () => {
    expect(extremumEvent({ kind: 'light_max', value: 900, at: null }, TZ)).toEqual({
      kind: 'light_max',
      at: null,
      text: 'Light peaked at 900 lux',
    });
  });

  it('skips a missing value', () => {
    expect(extremumEvent({ kind: 'temperature_max', value: null, at: null }, TZ)).toBeNull();
  });

  it('attributes a 23:50 Kolkata maximum to its local day', () => {
    const e = extremumEvent({ kind: 'temperature_max', value: 30, at: '2026-11-15T18:20:00Z' }, 'Asia/Kolkata');
    expect(e?.text).toBe('Temperature peaked at 30.0 °C · 23:50');
    const day = localDayBounds('Asia/Kolkata', '2026-11-15');
    expect(e!.at!.getTime()).toBeLessThan(day.end.getTime());
    expect(e!.at!.getTime()).toBeGreaterThanOrEqual(day.start.getTime());
  });
});

describe('calibrationEvent', () => {
  it('appears only on the day it happened', () => {
    expect(calibrationEvent('2026-11-16T01:00:00Z', day16)).toMatchObject({ text: 'Soil sensor calibrated' });
    expect(calibrationEvent('2026-11-16T01:00:00Z', day15)).toBeNull();
    expect(calibrationEvent('2026-11-15T15:00:00Z', day15)).toBeNull(); // the end bound is exclusive
    expect(calibrationEvent(null, day16)).toBeNull();
  });
});

describe('chatEvent', () => {
  it('quotes the first user message', () => {
    const e = chatEvent(
      { content: 'Do you need water today? The leaves look a bit droopy since this morning, honestly', created_at: '2026-11-16T00:00:00Z' },
      'Sparks',
    );
    expect(e?.text).toBe('You asked Sparks: Do you need water today? The leaves look a bit droopy since…');
    expect(chatEvent(null, 'Sparks')).toBeNull();
  });
});

describe('buildDayEvents', () => {
  it('lists events newest first, untimed events last', () => {
    const events = buildDayEvents({
      timeZone: TZ,
      day: day16,
      offlinePeriods: [period({})],
      extrema: [
        { kind: 'temperature_max', value: 24.6, at: '2026-11-16T05:20:00Z' },
        { kind: 'light_max', value: 1560, at: null },
        { kind: 'humidity_min', value: null, at: null },
      ],
      calibratedAt: '2026-11-16T01:00:00Z',
      firstUserMessage: { content: 'Hi', created_at: '2026-11-16T03:00:00Z' },
      plantName: 'Sparks',
    });
    expect(events.map((e) => e.kind)).toEqual(['temperature_max', 'chat', 'calibration', 'offline', 'light_max']);
  });

  it('keeps input order for equal times and handles an empty day', () => {
    const a = { kind: 'light_max', value: 1, at: null } as const;
    const b = { kind: 'humidity_min', value: 2, at: null } as const;
    expect(buildDayEvents({ timeZone: TZ, day: day16, extrema: [a, b], plantName: 'Sparks' }).map((e) => e.kind)).toEqual([
      'light_max',
      'humidity_min',
    ]);
    expect(buildDayEvents({ timeZone: TZ, day: day16, plantName: 'Sparks' })).toEqual([]);
  });
});
