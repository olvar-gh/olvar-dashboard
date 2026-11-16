import { metricStatusStyle, overallStatusStyle } from '../status-style';

describe('overallStatusStyle', () => {
  it.each([
    ['great', 'good', 'status/good'],
    ['okay', 'fair', 'brand/sage'],
    ['needs_attention', 'warn', 'status/warn'],
    ['in_trouble', 'critical', 'data/temp'],
    ['offline', 'muted', 'text/tertiary'],
    ['no_data', 'muted', 'text/tertiary'],
  ])('%s → %s', (key, tone, color) => {
    expect(overallStatusStyle(key)).toMatchObject({ tone, color });
  });

  it('falls back to a neutral style for unknown keys', () => {
    expect(overallStatusStyle('mystery')).toEqual({ tone: 'muted', color: 'text/tertiary', icon: 'minus' });
    expect(overallStatusStyle(null)).toEqual(overallStatusStyle('mystery'));
    expect(overallStatusStyle('toString').icon).toBe('minus');
  });

  it('never carries text', () => {
    expect(Object.keys(overallStatusStyle('great')).sort()).toEqual(['color', 'icon', 'tone']);
  });
});

describe('metricStatusStyle', () => {
  it.each([
    ['critical_low', 'critical', 'arrow-down'],
    ['low', 'warn', 'arrow-down'],
    ['ok', 'good', 'check-circle'],
    ['high', 'warn', 'arrow-up'],
    ['critical_high', 'critical', 'arrow-up'],
    ['unknown', 'muted', 'minus'],
  ])('%s → %s', (key, tone, icon) => {
    expect(metricStatusStyle(key)).toMatchObject({ tone, icon });
  });

  it('falls back for missing keys', () => {
    expect(metricStatusStyle(undefined).tone).toBe('muted');
  });
});
