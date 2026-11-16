import {
  calibrationMismatch,
  captureValue,
  isCalibrated,
  isStable,
  soilCardState,
  validateCalibration,
} from '../calibration';

describe('isCalibrated', () => {
  it('needs both raw values on the device', () => {
    expect(isCalibrated({ soil_dry_raw: 2900, soil_wet_raw: 1300 })).toBe(true);
    expect(isCalibrated({ soil_dry_raw: 2900, soil_wet_raw: null })).toBe(false);
    expect(isCalibrated({ soil_dry_raw: null, soil_wet_raw: 1300 })).toBe(false);
    expect(isCalibrated(null)).toBe(false);
  });

  it('flags a status row that disagrees with the device row', () => {
    const cal = { soil_dry_raw: 2900, soil_wet_raw: 1300 };
    expect(calibrationMismatch(cal, true)).toBe(false);
    expect(calibrationMismatch(cal, false)).toBe(true);
    expect(calibrationMismatch(undefined, true)).toBe(true);
    expect(calibrationMismatch(cal, null)).toBe(false);
  });
});

describe('soilCardState (§5.5 matrix)', () => {
  it.each([
    // calibrated, soil_raw, value, readFailed, notCalibrated
    [false, 2410, 'raw', false, true],
    [false, null, 'none', true, true],
    [true, 2410, 'pct', false, false],
    [true, null, 'none', true, false],
    [true, undefined, 'none', true, false],
  ] as const)('calibrated=%s raw=%s → %s', (calibrated, raw, value, readFailed, notCalibrated) => {
    expect(soilCardState(calibrated, raw)).toEqual({ value, readFailed, notCalibrated });
  });
});

describe('stability and capture', () => {
  it('is stable when the last 3 readings are within ±2 % of their median', () => {
    expect(isStable([3500, 2000, 2020, 2010])).toBe(true);
    expect(isStable([2000, 2040, 1960])).toBe(true);
    expect(isStable([2000, 2041, 2000])).toBe(false);
  });

  it('needs 3 readings without failed reads', () => {
    expect(isStable([2000, 2000])).toBe(false);
    expect(isStable([2000, null, 2000])).toBe(false);
  });

  it('captures the median', () => {
    expect(captureValue([2010, 2000, 2030])).toBe(2010);
    expect(captureValue([2000, 2500, 2000])).toBeNull();
  });
});

describe('validateCalibration', () => {
  it.each([
    [2900, 1300, true, undefined],
    [1401, 1300, true, undefined],
    [1400, 1300, false, 'too_close'],
    [1300, 2900, false, 'too_close'],
    [4096, 1300, false, 'dry_out_of_range'],
    [2900.5, 1300, false, 'dry_out_of_range'],
    [2900, -1, false, 'wet_out_of_range'],
    [4095, 0, true, undefined],
  ])('dry=%d wet=%d', (dry, wet, ok, error) => {
    const r = validateCalibration(dry, wet);
    expect(r.ok).toBe(ok);
    if (!r.ok) {
      expect(r.error).toBe(error);
      expect(r.message.length).toBeGreaterThan(0);
    }
  });
});
