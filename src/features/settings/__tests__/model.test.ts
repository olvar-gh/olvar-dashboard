import { DataError, type Reading } from '@/data';
import { SPATHIPHYLLUM_THRESHOLDS } from '@/data/fixtures/generate';

import {
  buildOverrides,
  checkDraft,
  deviceRows,
  draftFrom,
  filterZones,
  formatNow,
  formatRange,
  locationError,
  METRICS,
  nicknameError,
  okRange,
  scaleFor,
  passwordError,
  saveErrorMessage,
  speciesName,
  timeZoneLabel,
  timeZones,
  usesPreset,
  type DeviceInputs,
} from '../model';

const soil = METRICS.find((m) => m.metric === 'soil_pct')!;
const light = METRICS.find((m) => m.metric === 'lux')!;
const temp = METRICS.find((m) => m.metric === 'temperature_c')!;

describe('field rules', () => {
  it('needs a nickname of 1–40 characters', () => {
    expect(nicknameError('')).toMatch(/name/);
    expect(nicknameError('   ')).toMatch(/name/);
    expect(nicknameError('a'.repeat(40))).toBeNull();
    expect(nicknameError('a'.repeat(41))).toMatch(/40/);
  });

  it('allows a location of up to 60 characters, empty included', () => {
    expect(locationError('')).toBeNull();
    expect(locationError('x'.repeat(60))).toBeNull();
    expect(locationError('x'.repeat(61))).toMatch(/60/);
  });

  it('needs the current password and a new one of at least 8 characters', () => {
    expect(passwordError({ current: '', next: 'longenough' })).toMatch(/current/);
    expect(passwordError({ current: 'old', next: 'short7!' })).toMatch(/8/);
    expect(passwordError({ current: 'old', next: '12345678' })).toBeNull();
    expect(passwordError({ current: 'old', next: '12345678', confirm: '1234567x' })).toMatch(/match/);
  });
});

describe('care targets', () => {
  it('formats ranges like the desktop and iPhone frames', () => {
    expect(formatRange(soil, { low: 35, high: 60 })).toBe('35 – 60 %');
    expect(formatRange(light, { low: 500, high: 1500 })).toBe('500 – 1,500 lux');
    expect(formatRange(temp, { low: 18, high: 27 })).toBe('18 – 27 °C');
    expect(formatRange(soil, { low: 35, high: 60 }, true)).toBe('35–60%');
    expect(formatRange(light, { low: 500, high: 1500 }, true)).toBe('500–1,500 lux');
    expect(formatRange(temp, null)).toBe('—');
  });

  it('says when a reading failed instead of showing a number', () => {
    const r = { soil_pct: null, soil_raw: 2100, lux: null, temperature_c: 23.4 } as unknown as Reading;
    expect(formatNow(temp, r)).toBe('Now 23.4 °C');
    expect(formatNow(light, r)).toBe('Read failed');
    expect(formatNow(soil, r)).toBe('Not calibrated');
    expect(formatNow(soil, null)).toBe('No reading yet');
  });

  it('treats only empty overrides as "Use preset"', () => {
    expect(usesPreset({})).toBe(true);
    expect(usesPreset(null)).toBe(true);
    expect(usesPreset({ soil_pct: { ok_low: 30 } })).toBe(false);
  });

  it('rejects a range whose low end is not below its high end', () => {
    const draft = draftFrom(SPATHIPHYLLUM_THRESHOLDS);
    draft.soil_pct = { low: '60', high: '40' };
    draft.lux = { low: '', high: '900' };
    draft.humidity_pct = { low: '-5', high: '70' };
    const { errors, ranges } = checkDraft(draft);
    expect(errors.soil_pct).toBe('The low end must be below the high end.');
    expect(errors.lux).toMatch(/both ends/);
    expect(errors.humidity_pct).toMatch(/between 0 and 100/);
    expect(ranges.temperature_c).toEqual({ low: 18, high: 29 });
  });

  it('saves only the ends that differ from the profile and keeps other override keys', () => {
    const overrides = buildOverrides(SPATHIPHYLLUM_THRESHOLDS, { lux: { high: 9000 } }, {
      soil_pct: { low: 30, high: 85 },
      lux: { low: 800, high: 5400 },
      temperature_c: { low: 18, high: 29 },
      humidity_pct: { low: 40, high: 70 },
    });
    expect(overrides).toEqual({ soil_pct: { ok_low: 30 }, lux: { high: 9000 } });
  });

  it('collapses to {} when every range matches the preset', () => {
    const ranges = checkDraft(draftFrom(SPATHIPHYLLUM_THRESHOLDS)).ranges;
    expect(buildOverrides(SPATHIPHYLLUM_THRESHOLDS, {}, ranges)).toEqual({});
  });

  it('widens the slider scale when a range runs past it', () => {
    expect(scaleFor(light, { low: 500, high: 1500 })).toEqual({ min: 0, max: 2000 });
    expect(scaleFor(light, { low: 800, high: 5400 })).toEqual({ min: 0, max: 6800 });
    expect(scaleFor(temp, { low: 2, high: 27 })).toEqual({ min: 2, max: 40 });
  });

  it('reads the ok range from the effective thresholds', () => {
    expect(okRange(SPATHIPHYLLUM_THRESHOLDS, 'soil_pct')).toEqual({ low: 35, high: 85 });
    expect(okRange({}, 'soil_pct')).toBeNull();
  });
});

describe('save errors', () => {
  it('shows the server check-constraint message for ranges', () => {
    const msg = saveErrorMessage(new DataError('plants_threshold_overrides_check', '23514'), 'ranges');
    expect(msg).toContain('plants_threshold_overrides_check');
    expect(msg).toMatch(/low to high/);
  });

  it('words 22023 as "Unknown timezone"', () => {
    expect(saveErrorMessage(new DataError('invalid time zone', '22023'), 'timezone')).toBe('Unknown timezone');
  });

  it('falls back to a connection hint', () => {
    expect(saveErrorMessage(new Error('fetch failed'))).toMatch(/connection/);
  });
});

describe('time zones', () => {
  it('labels a zone with its GMT offset', () => {
    expect(timeZoneLabel('Asia/Seoul')).toBe('Asia/Seoul (GMT+9)');
    expect(timeZoneLabel('Asia/Kolkata')).toBe('Asia/Kolkata (GMT+5:30)');
    expect(timeZoneLabel('America/St_Johns', new Date('2026-01-15T12:00:00Z'))).toBe('America/St_Johns (GMT-3:30)');
    expect(timeZoneLabel('UTC')).toBe('UTC (GMT)');
  });

  it('keeps the current zone in the list and filters by name', () => {
    const zones = timeZones('Mars/Olympus_Mons');
    expect(zones[0]).toBe('Mars/Olympus_Mons');
    expect(zones).toContain('Asia/Seoul');
    expect(filterZones(zones, 'new york')).toEqual(['America/New_York']);
  });
});

describe('device rows', () => {
  const base: DeviceInputs = {
    gateway: { version: '0.1.0', last_seen_at: '2026-11-06T05:00:00Z' },
    gatewayAgeS: 12,
    gatewayStale: false,
    device: { id: 'olvar-a1b2c3', fw: '0.1.0', soil_dry_raw: 2910, soil_wet_raw: 1350, soil_calibrated_at: '2026-11-05T01:00:00Z' },
    nodeOffline: false,
    nodeOfflineSince: null,
    latest: { recorded_at: '2026-11-06T05:00:00Z', temperature_c: 23.4, humidity_pct: 58, lux: 1240 } as Reading,
    timeZone: 'Asia/Seoul',
  };

  it('describes the real hardware with live status', () => {
    const rows = deviceRows(base);
    expect(rows.map((r) => r.key)).toEqual(['gateway', 'node', 'soil', 'climate']);
    expect(rows[0]).toMatchObject({ subtitle: 'Raspberry Pi 3B · Wi-Fi · MQTT · v0.1.0', status: { label: 'Online', live: true } });
    expect(rows[1].subtitle).toContain('every 60 s');
    expect(rows[1].status).toEqual({ label: 'Connected', live: true });
    expect(rows[2]).toMatchObject({ subtitle: 'Capacitive · GPIO34 · dry 2,910 · wet 1,350', status: { label: 'Calibrated Nov 5' }, recalibrate: true });
    expect(rows[3].status).toEqual({ label: 'Read OK', live: true });
    expect(rows[2].short).toEqual({ title: 'Soil Moisture Sensor', subtitle: 'Capacitive · GPIO34', value: 'Nov 5' });
  });

  it('shows offline nodes, a stale gateway, an uncalibrated probe and failed reads', () => {
    const rows = deviceRows({
      ...base,
      gatewayStale: true,
      gatewayAgeS: 900,
      nodeOffline: true,
      nodeOfflineSince: new Date('2026-11-06T05:02:00Z'),
      device: { ...base.device!, soil_dry_raw: null, soil_wet_raw: null, soil_calibrated_at: null },
      latest: { ...base.latest!, lux: null } as Reading,
    });
    expect(rows[0].status).toEqual({ label: 'Offline · 15 min ago', live: false });
    expect(rows[1].status).toEqual({ label: 'Offline since 14:02', live: false });
    expect(rows[2].status).toEqual({ label: 'Not calibrated', live: false });
    expect(rows[3].status).toEqual({ label: 'Read failed 14:00', live: false });
  });
});

it('shows the genus as the species', () => {
  expect(speciesName({ scientific_name: 'Spathiphyllum spp.', common_name: 'Peace lily' })).toBe('Spathiphyllum');
  expect(speciesName({ scientific_name: null, common_name: 'Peace lily' })).toBe('Peace lily');
});
