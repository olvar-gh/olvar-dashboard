import type { DailyRow, HourlyRow } from '@/data';

import {
  clampWeek,
  dayHeading,
  daySectionTitle,
  eventCategory,
  eventRow,
  stripDay,
  weekLabel,
  weekNav,
  weekSeries,
  weekStartOf,
  weekSummary,
  weightedAverage,
} from '../week';

const TZ = 'Asia/Seoul';
// Tue Nov 17 2026, 14:30 in Seoul.
const NOW = new Date('2026-11-17T05:30:00Z');
const TODAY = '2026-11-17';

function daily(bucket: string, patch: Partial<DailyRow> = {}): DailyRow {
  return {
    bucket,
    device_id: 'olvar-a1b2c3',
    n: 1440,
    sealed: true,
    soil_pct_avg: 50,
    soil_pct_max: null,
    soil_pct_min: null,
    soil_raw_avg: null,
    soil_raw_counts: [],
    soil_raw_max: null,
    soil_raw_min: null,
    soil_raw_n: 1440,
    soil_raw_values: [],
    temperature_c_avg: 22,
    temperature_c_max: null,
    temperature_c_min: null,
    temperature_c_n: 1440,
    humidity_pct_avg: 55,
    humidity_pct_max: null,
    humidity_pct_min: null,
    humidity_pct_n: 1440,
    lux_avg: 600,
    lux_max: null,
    lux_min: null,
    lux_n: 1440,
    ...patch,
  };
}

describe('weeks', () => {
  it('start on Sunday, like the Figma frames (Sun 1 – Sat 7)', () => {
    expect(weekStartOf('2026-11-07')).toBe('2026-11-01');
    expect(weekStartOf('2026-11-01')).toBe('2026-11-01');
    expect(weekStartOf(TODAY)).toBe('2026-11-15');
  });

  it('are labelled for desktop and the iPhone subtitle', () => {
    expect(weekLabel('2026-11-01')).toBe('Nov 1 – Nov 7, 2026');
    expect(weekLabel('2026-11-01', true)).toBe('Nov 1 – 7, 2026');
    expect(weekLabel('2026-11-29', true)).toBe('Nov 29 – Dec 5, 2026');
    expect(weekLabel('2026-12-27')).toBe('Dec 27, 2026 – Jan 2, 2027');
  });

  it('show only days up to today and inside the 90-day history', () => {
    const current = weekNav('2026-11-15', TODAY, TZ, NOW);
    expect(current.days).toEqual(['2026-11-15', '2026-11-16', '2026-11-17']);
    expect(current).toMatchObject({ isCurrent: true, canNext: false, canPrev: true });

    // Oldest selectable date is Aug 19 (today − 90 days), a Wednesday.
    const oldest = weekNav('2026-08-16', TODAY, TZ, NOW);
    expect(oldest.days[0]).toBe('2026-08-19');
    expect(oldest.days).toHaveLength(4);
    expect(oldest).toMatchObject({ canPrev: false, canNext: true, isCurrent: false });
  });

  it('clamp requests outside the history or in the future', () => {
    expect(clampWeek('2026-11-22', TODAY, TZ, NOW)).toBe('2026-11-15');
    expect(clampWeek('2026-07-05', TODAY, TZ, NOW)).toBe('2026-08-16');
    expect(clampWeek('2026-10-04', TODAY, TZ, NOW)).toBe('2026-10-04');
  });
});

describe('day headings', () => {
  it('read Today / Yesterday / weekday on desktop and iPhone', () => {
    expect(dayHeading(TODAY, TODAY)).toBe('TODAY · TUE, NOV 17');
    expect(dayHeading('2026-11-16', TODAY)).toBe('YESTERDAY · MON, NOV 16');
    expect(dayHeading('2026-11-05', TODAY)).toBe('THU, NOV 5');
    expect(daySectionTitle(TODAY, TODAY)).toBe('Today');
    expect(daySectionTitle('2026-11-16', TODAY)).toBe('Yesterday');
    expect(daySectionTitle('2026-11-05', TODAY)).toBe('Thursday, Nov 5');
    expect(stripDay('2026-11-07')).toEqual({ letter: 'S', day: 7 });
  });
});

describe('event rows', () => {
  it('move the extremum time into its own column', () => {
    const row = eventRow({ kind: 'temperature_max', at: new Date('2026-11-17T05:20:00Z'), text: 'Temperature peaked at 24.6 °C · 14:20' }, TZ, 0);
    expect(row).toMatchObject({ time: '14:20', title: 'Temperature peaked at 24.6 °C', category: 'sensor' });
  });

  it('keep text that has no time suffix, and allow events without a time', () => {
    const offline = eventRow({ kind: 'offline', at: new Date('2026-11-16T18:10:00Z'), text: 'Offline 03:10–03:52 (42 min)' }, TZ, 1);
    expect(offline).toMatchObject({ time: '03:10', title: 'Offline 03:10–03:52 (42 min)', category: 'device' });
    expect(offline.detail).toContain('Raspberry Pi 3B');
    const noTime = eventRow({ kind: 'light_max', at: null, text: 'Light peaked at 1,520 lux' }, TZ, 2);
    expect(noTime).toMatchObject({ time: null, title: 'Light peaked at 1,520 lux' });
  });

  it('categorise every kind', () => {
    expect(eventCategory('calibration')).toBe('care');
    expect(eventCategory('chat')).toBe('sparks');
    expect(eventCategory('restart')).toBe('device');
    expect(eventCategory('offline_ongoing')).toBe('device');
    expect(eventCategory('soil_driest')).toBe('sensor');
  });
});

describe('week summary', () => {
  it('weights daily averages by their sample counts', () => {
    const rows = [daily('2026-11-15', { soil_pct_avg: 40, soil_raw_n: 100 }), daily('2026-11-16', { soil_pct_avg: 60, soil_raw_n: 300 })];
    expect(weightedAverage(rows, 'soil_pct_avg', 'soil_raw_n')).toBe(55);
    expect(weightedAverage([daily('2026-11-15', { soil_pct_avg: null })], 'soil_pct_avg', 'soil_raw_n')).toBeNull();
  });

  it('compares this week with the previous one', () => {
    const rows = [
      daily('2026-11-08', { soil_pct_avg: 55, temperature_c_avg: 21.5 }),
      daily('2026-11-14', { soil_pct_avg: 55, temperature_c_avg: 21.5 }),
      daily('2026-11-15', { soil_pct_avg: 51, temperature_c_avg: 22.1 }),
      daily('2026-11-16', { soil_pct_avg: 51, temperature_c_avg: 22.1 }),
    ];
    const stats = weekSummary(rows, '2026-11-15');
    expect(stats.map((s) => [s.label, s.value, s.delta])).toEqual([
      ['Avg. soil moisture', '51%', '−4%'],
      ['Avg. temperature', '22.1 °C', '+0.6 °C'],
      ['Avg. humidity', '55%', '±0%'],
      ['Avg. light', '600 lux', '±0 lux'],
    ]);
  });

  it('shows a dash and no change when a week has no data for a metric', () => {
    const stats = weekSummary([daily('2026-11-15', { soil_pct_avg: null })], '2026-11-15');
    expect(stats[0]).toMatchObject({ value: '—', delta: null, average: null });
    expect(stats[1].delta).toBeNull();
  });
});

describe('week chart series', () => {
  it('plots hourly averages at mid-hour and keeps null reads as gaps', () => {
    const rows = [
      { bucket: '2026-11-15T00:00:00.000Z', soil_pct_avg: 50, temperature_c_avg: 21 },
      { bucket: '2026-11-15T01:00:00.000Z', soil_pct_avg: null, temperature_c_avg: 21.4 },
    ] as HourlyRow[];
    expect(weekSeries(rows)).toEqual({
      soil: [
        { t: '2026-11-15T00:30:00.000Z', v: 50 },
        { t: '2026-11-15T01:30:00.000Z', v: null },
      ],
      temperature: [
        { t: '2026-11-15T00:30:00.000Z', v: 21 },
        { t: '2026-11-15T01:30:00.000Z', v: 21.4 },
      ],
    });
  });
});
