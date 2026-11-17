import {
  ageLabel,
  calibrationSummary,
  deriveLive,
  initialWizard,
  pairCheck,
  saveErrorMessage,
  SAVE_FAILED,
  stabilityLabel,
  wizardReducer,
  wizardStep,
  type RawReading,
  type WizardState,
} from '../wizard';

const NOW = new Date('2026-11-17T03:00:00Z');
const TZ = 'Asia/Seoul';

/** Newest first, one per minute ending `endAgoS` before NOW. */
function readings(raws: (number | null)[], { firstId = 100, endAgoS = 10 } = {}): RawReading[] {
  return raws
    .map((soil_raw, i) => ({
      id: firstId + i,
      recorded_at: new Date(NOW.getTime() - endAgoS * 1000 - (raws.length - 1 - i) * 60_000).toISOString(),
      soil_raw,
    }))
    .reverse();
}

describe('wizardReducer', () => {
  it('pins the baseline once', () => {
    const s = wizardReducer(initialWizard, { type: 'pin', latestId: 7 });
    expect(s.baselineId).toBe(7);
    expect(wizardReducer(s, { type: 'pin', latestId: 9 }).baselineId).toBe(7);
  });

  it('captures dry, then wet, each from a new baseline', () => {
    let s: WizardState = { ...initialWizard, baselineId: 1 };
    expect(wizardStep(s)).toBe('dry');
    s = wizardReducer(s, { type: 'capture', step: 'dry', value: 2900, latestId: 4 });
    expect(s).toEqual({ dry: 2900, wet: null, baselineId: 4 });
    expect(wizardStep(s)).toBe('wet');
    s = wizardReducer(s, { type: 'capture', step: 'wet', value: 1300, latestId: 7 });
    expect(wizardStep(s)).toBe('review');
  });

  it('ignores a capture for a step that is not current', () => {
    const s = { ...initialWizard, baselineId: 1 };
    expect(wizardReducer(s, { type: 'capture', step: 'wet', value: 1300, latestId: 4 })).toBe(s);
  });

  it('retake clears only that step and restarts the wait', () => {
    const s = wizardReducer({ dry: 2900, wet: 1300, baselineId: 7 }, { type: 'retake', step: 'dry', latestId: 9 });
    expect(s).toEqual({ dry: null, wet: 1300, baselineId: 9 });
    expect(wizardStep(s)).toBe('dry');
  });
});

describe('deriveLive', () => {
  it('is null without readings', () => {
    expect(deriveLive([], 0, NOW)).toBeNull();
  });

  it('waits for readings newer than the baseline', () => {
    const rows = readings([2900, 2901, 2902]);
    const live = deriveLive(rows, 101, NOW)!;
    expect(live).toMatchObject({ freshCount: 1, stability: 'waiting', capture: null, raw: 2902 });
    expect(stabilityLabel(live, TZ)).toBe('Waiting for fresh readings · 1 of 3 · about 2 min');
  });

  it('counts nothing before the baseline is pinned', () => {
    expect(deriveLive(readings([2900, 2900, 2900]), null, NOW)!.stability).toBe('waiting');
  });

  it('is stable when 3 fresh readings are within ±2 % and captures their median', () => {
    const live = deriveLive(readings([2900, 2950, 2920]), 99, NOW)!;
    expect(live).toMatchObject({ freshCount: 3, stability: 'stable', capture: 2920 });
    expect(stabilityLabel(live, TZ)).toBe('Stable · last 3 readings agree');
  });

  it('settles while fresh readings differ by more than 2 %', () => {
    const live = deriveLive(readings([2900, 2600, 2300]), 99, NOW)!;
    expect(live).toMatchObject({ stability: 'settling', capture: null });
  });

  it('reports a null soil_raw as a failed read, not as uncalibrated', () => {
    const rows = readings([2900, 2900, null]);
    const live = deriveLive(rows, 99, NOW)!;
    expect(live).toMatchObject({ raw: null, stability: 'failed', capture: null });
    expect(stabilityLabel(live, TZ)).toBe(`Read failed at 11:59`);
  });

  it('a failed read among the fresh three blocks capture', () => {
    expect(deriveLive(readings([2900, null, 2900]), 99, NOW)!.stability).toBe('settling');
  });

  it('is offline after 180 s without a reading or when the device says so', () => {
    expect(deriveLive(readings([2900, 2900, 2900], { endAgoS: 181 }), 99, NOW)!).toMatchObject({ offline: true, stability: 'offline', capture: null });
    expect(deriveLive(readings([2900, 2900, 2900], { endAgoS: 180 }), 99, NOW)!.offline).toBe(false);
    expect(deriveLive(readings([2900, 2900, 2900]), 99, NOW, true)!.stability).toBe('offline');
  });

  it('shows how old the latest reading is', () => {
    expect(ageLabel(deriveLive(readings([2900], { endAgoS: 42 }), 99, NOW)!)).toBe(
      'Updated 42 s ago · new reading every minute',
    );
  });
});

describe('calibrationSummary', () => {
  it('tells not calibrated apart from calibrated', () => {
    expect(calibrationSummary({ soil_dry_raw: null, soil_wet_raw: null, soil_calibrated_at: null }, TZ)).toBe('not calibrated yet');
    expect(calibrationSummary({ soil_dry_raw: 2900, soil_wet_raw: null, soil_calibrated_at: null }, TZ)).toBe('not calibrated yet');
    expect(
      calibrationSummary({ soil_dry_raw: 2910, soil_wet_raw: 1350, soil_calibrated_at: '2026-11-05T01:15:00Z' }, TZ),
    ).toBe('last calibrated Nov 5 · dry 2,910 · wet 1,350');
  });
});

describe('pairCheck', () => {
  it('applies the server rule dry > wet + 100', () => {
    expect(pairCheck({ dry: 2900, wet: null })).toBeNull();
    expect(pairCheck({ dry: 2900, wet: 1300 })).toEqual({ ok: true });
    expect(pairCheck({ dry: 1400, wet: 1300 })).toMatchObject({ ok: false, error: 'too_close' });
    expect(pairCheck({ dry: 1300, wet: 2900 })).toMatchObject({ ok: false, error: 'too_close' });
  });
});

describe('saveErrorMessage', () => {
  it('maps the check violation and falls back to a connection message', () => {
    expect(saveErrorMessage({ code: '23514' })).toMatch(/more than 100 above wet/);
    expect(saveErrorMessage(new Error('fetch failed'))).toBe(SAVE_FAILED);
  });
});
