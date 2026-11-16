import {
  EMPTY_VALUE,
  formatAge,
  formatDuration,
  formatLocalDate,
  formatMetric,
  formatNumber,
  formatShortDate,
  formatSoilRaw,
  formatTime,
  secondsSince,
  truncate,
} from '../format';

describe('formatTime', () => {
  it('formats 24 h time in the plant zone', () => {
    expect(formatTime('2026-11-16T05:20:00Z', 'Asia/Seoul')).toBe('14:20');
    expect(formatTime(new Date('2026-11-15T15:00:00Z'), 'Asia/Seoul')).toBe('00:00');
    expect(formatTime('2026-11-15T18:20:00Z', 'Asia/Kolkata')).toBe('23:50');
  });
});

describe('dates', () => {
  it('formats local dates', () => {
    expect(formatLocalDate('2026-11-05')).toBe('Nov 5');
    expect(formatLocalDate('2025-01-14', true)).toBe('Jan 14, 2025');
  });

  it('formats an instant as a local date', () => {
    expect(formatShortDate('2026-11-15T16:00:00Z', 'Asia/Seoul')).toBe('Nov 16');
  });
});

describe('numbers and metrics', () => {
  it('groups thousands', () => {
    expect(formatNumber(1560)).toBe('1,560');
    expect(formatNumber(23.44, 1)).toBe('23.4');
  });

  it('formats each metric with its unit', () => {
    expect(formatMetric('temperature', 24.6)).toBe('24.6 °C');
    expect(formatMetric('light', 1240)).toBe('1,240 lux');
    expect(formatMetric('humidity', 58.2)).toBe('58 %');
    expect(formatMetric('soil', 42)).toBe('42 %');
  });

  it('shows a dash for failed reads', () => {
    expect(formatMetric('soil', null)).toBe(EMPTY_VALUE);
    expect(formatMetric('light', undefined)).toBe(EMPTY_VALUE);
    expect(formatMetric('temperature', NaN)).toBe(EMPTY_VALUE);
    expect(formatSoilRaw(null)).toBe(EMPTY_VALUE);
    expect(formatSoilRaw(1980)).toBe('raw 1,980');
  });
});

describe('formatDuration', () => {
  it.each([
    [30, '1 min'],
    [120, '2 min'],
    [2520, '42 min'],
    [3600, '1 h'],
    [3900, '1 h 5 min'],
  ])('%i s → %s', (s, text) => {
    expect(formatDuration(s)).toBe(text);
  });
});

describe('formatAge', () => {
  it.each([
    [-3, '0 s ago'],
    [12.7, '12 s ago'],
    [180, '3 min ago'],
    [7200, '2 h ago'],
    [3 * 86_400, '3 d ago'],
  ])('%d s → %s', (s, text) => {
    expect(formatAge(s)).toBe(text);
  });

  it('measures seconds since an instant', () => {
    expect(secondsSince('2026-11-16T00:00:00Z', new Date('2026-11-16T00:01:30Z'))).toBe(90);
  });
});

describe('truncate', () => {
  it('collapses whitespace and shortens long text', () => {
    expect(truncate('  short\n text ', 20)).toBe('short text');
    expect(truncate('Should I water you today or wait', 15)).toBe('Should I water…');
  });
});
