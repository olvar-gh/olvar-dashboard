import {
  dayTicks,
  downsample,
  drawableSegments,
  definedValues,
  formatTick,
  hourTicks,
  latestDefined,
  linear,
  normalizeSeries,
  splitSegments,
  timeTicks,
  valueDomain,
  weekDays,
} from '../scales';

const HOUR = 3_600_000;
const MIN = 60_000;
const t0 = Date.parse('2026-11-06T00:00:00Z');

describe('normalizeSeries', () => {
  it('parses times, sorts, maps non-finite values to null and clips to the domain', () => {
    const out = normalizeSeries(
      [
        { t: new Date(t0 + 2 * MIN), v: 3 },
        { t: '2026-11-06T00:01:00Z', v: Number.NaN },
        { t: t0, v: 1 },
        { t: t0 + 99 * HOUR, v: 9 },
        { t: 'not a date', v: 1 },
      ],
      [t0, t0 + HOUR],
    );
    expect(out).toEqual([
      { t: t0, v: 1 },
      { t: t0 + MIN, v: null },
      { t: t0 + 2 * MIN, v: 3 },
    ]);
  });

  it('keeps everything without a domain', () => {
    expect(normalizeSeries([{ t: t0 + 99 * HOUR, v: 1 }])).toHaveLength(1);
  });
});

describe('splitSegments (gaps)', () => {
  const pts = (vs: (number | null)[]) => vs.map((v, i) => ({ t: t0 + i * MIN, v }));

  it('breaks the line at every null', () => {
    expect(splitSegments(pts([1, 2, null, 4, 5, null, null, 8]))).toEqual([
      [
        { t: t0, v: 1 },
        { t: t0 + MIN, v: 2 },
      ],
      [
        { t: t0 + 3 * MIN, v: 4 },
        { t: t0 + 4 * MIN, v: 5 },
      ],
      [{ t: t0 + 7 * MIN, v: 8 }],
    ]);
  });

  it('breaks where readings are further apart than maxGapMs', () => {
    const points = [
      { t: t0, v: 1 },
      { t: t0 + MIN, v: 2 },
      { t: t0 + 41 * MIN, v: 3 },
    ];
    expect(splitSegments(points, 5 * MIN).map((s) => s.length)).toEqual([2, 1]);
    expect(splitSegments(points).map((s) => s.length)).toEqual([3]);
  });

  it('returns nothing for an empty or all-null series', () => {
    expect(splitSegments([])).toEqual([]);
    expect(splitSegments(pts([null, null, null]))).toEqual([]);
  });
});

describe('latestDefined', () => {
  it('is the last point only when it holds a value', () => {
    expect(
      latestDefined([
        { t: 1, v: 2 },
        { t: 2, v: 5 },
      ]),
    ).toEqual({ t: 2, v: 5 });
    expect(
      latestDefined([
        { t: 1, v: 2 },
        { t: 2, v: null },
      ]),
    ).toBeNull();
    expect(latestDefined([])).toBeNull();
  });
});

describe('valueDomain', () => {
  it('splits into equal round steps that cover values and band', () => {
    const d = valueDomain([34, 66], { include: [35, 60] });
    expect(d.ticks).toHaveLength(5);
    expect(d.domain[0]).toBeLessThanOrEqual(34);
    expect(d.domain[1]).toBeGreaterThanOrEqual(66);
    const steps = d.ticks.slice(1).map((v, i) => v - d.ticks[i]);
    expect(new Set(steps).size).toBe(1);
  });

  it('matches the Figma light axis 0–1.6k', () => {
    expect(valueDomain([0, 1560], { floor: 0 }).ticks).toEqual([0, 400, 800, 1200, 1600]);
  });

  it('respects floor and ceil', () => {
    const d = valueDomain([2, 98], { floor: 0, ceil: 100 });
    expect(d.domain[0]).toBeGreaterThanOrEqual(0);
    expect(valueDomain([-5, 3], { floor: 0 }).domain[0]).toBe(0);
  });

  it('uses the fallback for an empty or all-null series', () => {
    expect(valueDomain([]).domain).toEqual([0, 100]);
    expect(valueDomain(definedValues([{ t: 1, v: null }]), { fallback: [10, 30] }).domain[0]).toBe(10);
  });

  it('widens a flat series', () => {
    const d = valueDomain([23.4, 23.4]);
    expect(d.domain[0]).toBeLessThan(23.4);
    expect(d.domain[1]).toBeGreaterThan(23.4);
  });

  it('ignores non-finite include values', () => {
    expect(valueDomain([10, 20], { include: [null, undefined, Number.NaN] }).domain[1]).toBeLessThan(100);
  });
});

describe('formatTick', () => {
  it.each([
    [1600, '1.6k'],
    [1200, '1.2k'],
    [800, '800'],
    [12.5, '12.5'],
    [20, '20'],
    [0, '0'],
  ])('%p → %s', (v, s) => expect(formatTick(v)).toBe(s));
});

describe('linear', () => {
  it('maps and handles a zero-width domain', () => {
    expect(linear([0, 10], [0, 100])(5)).toBe(50);
    expect(linear([5, 5], [7, 100])(5)).toBe(7);
  });
});

describe('hourTicks in the plant time zone', () => {
  it('puts 6-hour ticks on local hours for Europe/Berlin', () => {
    const ticks = hourTicks(
      [Date.parse('2026-11-05T14:00:00Z'), Date.parse('2026-11-06T14:00:00Z')],
      'Europe/Berlin',
      6,
    );
    expect(ticks.map((t) => t.label)).toEqual(['18:00', '00:00', '06:00', '12:00']);
    expect(new Date(ticks[0].t).toISOString()).toBe('2026-11-05T17:00:00.000Z');
  });

  it('handles the +05:30 offset of Asia/Kolkata', () => {
    const ticks = hourTicks(
      [Date.parse('2026-11-05T12:00:00Z'), Date.parse('2026-11-06T12:00:00Z')],
      'Asia/Kolkata',
      6,
    );
    expect(ticks.map((t) => t.label)).toEqual(['18:00', '00:00', '06:00', '12:00']);
    expect(new Date(ticks[1].t).toISOString()).toBe('2026-11-05T18:30:00.000Z');
  });

  it('handles the +05:45 offset of Asia/Kathmandu', () => {
    const ticks = hourTicks(
      [Date.parse('2026-11-05T18:00:00Z'), Date.parse('2026-11-05T19:00:00Z')],
      'Asia/Kathmandu',
      1,
    );
    expect(ticks).toEqual([{ t: Date.parse('2026-11-05T18:15:00Z'), label: '00:00' }]);
  });

  it('labels the repeated hour once on a 25 h DST day', () => {
    const start = Date.parse('2026-11-01T04:00:00Z');
    const ticks = hourTicks([start, start + 25 * HOUR - 1], 'America/New_York', 1);
    expect(ticks).toHaveLength(24);
    expect(ticks.filter((t) => t.label === '01:00')).toHaveLength(1);
  });

  it('skips the missing hour on a 23 h DST day', () => {
    const start = Date.parse('2026-03-08T05:00:00Z');
    const ticks = hourTicks([start, start + 23 * HOUR - 1], 'America/New_York', 1);
    expect(ticks).toHaveLength(23);
    expect(ticks.map((t) => t.label)).not.toContain('02:00');
  });
});

describe('dayTicks and timeTicks', () => {
  it('puts day ticks on local midnights', () => {
    const ticks = dayTicks([Date.parse('2026-11-01T00:00:00Z'), Date.parse('2026-11-04T00:00:00Z')], 'Asia/Kolkata');
    expect(ticks.map((t) => t.label)).toEqual(['Nov 2', 'Nov 3', 'Nov 4']);
    expect(new Date(ticks[0].t).toISOString()).toBe('2026-11-01T18:30:00.000Z');
  });

  it('chooses hours for 24 h and days for 30 d', () => {
    const end = Date.parse('2026-11-06T14:00:00Z');
    expect(timeTicks([end - 24 * HOUR, end], 'UTC', 673).map((t) => t.label)).toEqual([
      '18:00',
      '00:00',
      '06:00',
      '12:00',
    ]);
    const month = timeTicks([end - 30 * 24 * HOUR, end], 'UTC', 673);
    expect(month.every((t) => /^[A-Z][a-z]{2} \d+$/.test(t.label))).toBe(true);
    expect(month.length).toBeLessThanOrEqual(6);
  });

  it('returns nothing for an empty window', () => {
    expect(timeTicks([5, 5], 'UTC', 500)).toEqual([]);
    expect(timeTicks([0, HOUR], 'UTC', 0)).toEqual([]);
  });

  it('falls back to day ticks when hours would crowd a narrow plot', () => {
    const end = Date.parse('2026-11-06T14:00:00Z');
    expect(timeTicks([end - 24 * HOUR, end], 'UTC', 100).map((t) => t.label)).toEqual(['Nov 6']);
  });
});

describe('weekDays', () => {
  it('labels the week and keeps a 25 h DST day', () => {
    const days = weekDays('2026-11-01', 'America/New_York');
    expect(days.map((d) => d.label)).toEqual(['Sun 1', 'Mon 2', 'Tue 3', 'Wed 4', 'Thu 5', 'Fri 6', 'Sat 7']);
    expect((days[0].end - days[0].start) / HOUR).toBe(25);
    expect((days[1].end - days[1].start) / HOUR).toBe(24);
    days.slice(1).forEach((d, i) => expect(d.start).toBe(days[i].end));
  });
});

describe('downsample', () => {
  const series = (n: number, nullAt: number[] = []) =>
    Array.from({ length: n }, (_, i) => ({ t: t0 + i * MIN, v: nullAt.includes(i) ? null : i }));

  it('leaves short series alone', () => {
    expect(downsample(series(10), 50)).toEqual(series(10));
  });

  it('caps the point count and keeps the latest reading exact', () => {
    const out = downsample(series(1440), 300);
    expect(out.length).toBeLessThanOrEqual(300);
    expect(out[out.length - 1]).toEqual({ t: t0 + 1439 * MIN, v: 1439 });
  });

  it('keeps failed reads as gaps', () => {
    const out = downsample(series(1440, [700]), 300);
    expect(splitSegments(out)).toHaveLength(2);
  });

  it('keeps an all-null series empty of values', () => {
    const out = downsample(
      series(
        1440,
        Array.from({ length: 1440 }, (_, i) => i),
      ),
      300,
    );
    expect(definedValues(out)).toEqual([]);
  });
});

describe('valueDomain ceiling', () => {
  it('keeps the rounded ticks at or below ceil', () => {
    const d = valueDomain([95, 100], { floor: 0, ceil: 100 });
    expect(d.domain[1]).toBe(100);
    expect(d.domain[0]).toBeLessThanOrEqual(95);
  });

  it('divides floor–ceil evenly when round steps cannot fit', () => {
    const d = valueDomain([20, 99], { ticks: 4, floor: 0, ceil: 100 });
    expect(d.domain).toEqual([0, 100]);
    expect(d.ticks).toHaveLength(4);
  });
});

describe('drawableSegments', () => {
  const minuteSeries = (from: number, n: number) =>
    Array.from({ length: n }, (_, i) => ({ t: from + i * MIN, v: i % 7 }));

  it('does not turn downsampling into gaps', () => {
    const segs = drawableSegments(minuteSeries(t0, 1440), 175, 3 * MIN);
    expect(segs).toHaveLength(1);
    expect(segs[0].length).toBeLessThanOrEqual(175);
  });

  it('keeps real gaps regardless of width', () => {
    const points = [...minuteSeries(t0, 600), ...minuteSeries(t0 + 640 * MIN, 800)];
    for (const width of [40, 175, 2000]) {
      expect(drawableSegments(points, width, 3 * MIN)).toHaveLength(2);
    }
  });

  it('returns nothing for an empty series', () => {
    expect(drawableSegments([], 100)).toEqual([]);
  });
});
