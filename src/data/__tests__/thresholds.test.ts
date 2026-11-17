import { SPATHIPHYLLUM_THRESHOLDS } from '../fixtures/generate';
import { mergeThresholds, targetBand } from '../thresholds';

describe('mergeThresholds', () => {
  it('returns the profile when there are no overrides', () => {
    expect(mergeThresholds(SPATHIPHYLLUM_THRESHOLDS, {})).toEqual(SPATHIPHYLLUM_THRESHOLDS);
  });

  it('overrides per metric and key, keeping the other keys', () => {
    const merged = mergeThresholds(SPATHIPHYLLUM_THRESHOLDS, { soil_pct: { ok_low: 40, ok_high: 80 } });
    expect(merged.soil_pct).toEqual({ critical_low: 20, low: 35, ok_low: 40, ok_high: 80, high: 90 });
    expect(merged.lux).toEqual(SPATHIPHYLLUM_THRESHOLDS.lux);
  });

  it('ignores non-numeric values, unknown keys and non-object input', () => {
    const merged = mergeThresholds({ lux: { low: 1, bogus: 3 }, other: { low: 1 } }, { lux: { low: 'x' } });
    expect(merged).toEqual({ lux: { low: 1 } });
    expect(mergeThresholds(null, [])).toEqual({});
  });
});

describe('targetBand', () => {
  it('is ok_low..ok_high', () => {
    expect(targetBand(SPATHIPHYLLUM_THRESHOLDS, 'temperature_c')).toEqual({ min: 18, max: 29 });
  });

  it('is null without both bounds', () => {
    expect(targetBand({ lux: { ok_low: 1 } }, 'lux')).toBeNull();
    expect(targetBand(undefined, 'lux')).toBeNull();
  });
});
