import { DataError, type Reading } from '@/data';
import { SPATHIPHYLLUM_THRESHOLDS } from '@/data/fixtures/generate';

import {
  buildOverrides,
  checkDraft,
  deviceRows,
  draftFrom,
  editedMetrics,
  filterZones,
  formatNow,
  formatRange,
  locationError,
  METRICS,
  nicknameError,
  okRange,
  parseNumber,
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
    expect(formatRange(temp, null)).toBe('-');
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

  it('reads a decimal comma as a decimal point, never as a dropped separator', () => {
    expect(parseNumber('18,5', 'de-DE')).toBe(18.5);
    expect(parseNumber('2,1', 'de-DE')).toBe(2.1);
    expect(parseNumber('1.500,5', 'de-DE')).toBe(1500.5);
    expect(parseNumber('2,1', 'en-US')).toBe(2.1);
    expect(parseNumber('18,5', 'en-US')).toBe(18.5);
    expect(parseNumber('1,500', 'en-US')).toBe(1500);
    expect(parseNumber('18.5', 'de-DE')).toBe(18.5);
    expect(parseNumber('1,2,3', 'en-US')).toBeNull();
  });

  it('reads grouped thousands by the locale instead of as a decimal', () => {
    expect(parseNumber('1.500', 'de-DE')).toBe(1500);
    expect(parseNumber('12.000', 'de-DE')).toBe(12000);
    expect(parseNumber('1.500', 'en-US')).toBe(1.5);
    expect(parseNumber('1\u202f500', 'fr-FR')).toBe(1500);
    expect(parseNumber('1 500,5', 'fr-FR')).toBe(1500.5);
  });

  it('fills and reads Latin digits in every locale, and accepts typed native digits', () => {
    const draft = draftFrom(SPATHIPHYLLUM_THRESHOLDS, 'ar-EG');
    expect(draft.temperature_c).toEqual({ low: '18', high: '29' });
    draft.temperature_c = { low: '18.5', high: draft.temperature_c.high };
    expect(checkDraft(draft, ['temperature_c'], SPATHIPHYLLUM_THRESHOLDS, 'ar-EG').ranges.temperature_c).toEqual({ low: 18.5, high: 29 });
    expect(parseNumber('٢٩٫٥', 'ar-EG')).toBe(29.5);
    expect(parseNumber('२९', 'hi-IN')).toBe(29);
  });

  it('rejects malformed space grouping instead of reading it as a decimal', () => {
    expect(parseNumber('18 50', 'fr-FR')).toBeNull();
    expect(parseNumber('1 50', 'fr-FR')).toBeNull();
    expect(parseNumber('1 500', 'fr-FR')).toBe(1500);
  });

  it('rejects ambiguous or mixed separators', () => {
    expect(parseNumber('1.500', 'fr-FR')).toBeNull();
    expect(parseNumber('1.500,5', 'en-US')).toBeNull();
    expect(parseNumber('1,5.5', 'de-DE')).toBeNull();
    expect(parseNumber('12a', 'en-US')).toBeNull();
    const draft = draftFrom(SPATHIPHYLLUM_THRESHOLDS, 'fr-FR');
    draft.lux = { low: '1.500', high: '5400' };
    expect(checkDraft(draft, ['lux'], SPATHIPHYLLUM_THRESHOLDS, 'fr-FR').errors.lux).toMatch(/plain numbers, like 18,5/);
  });

  it('fills the editor in the locale’s format, so untouched ends parse back', () => {
    const draft = draftFrom(SPATHIPHYLLUM_THRESHOLDS, 'de-DE');
    expect(draft.lux).toEqual({ low: '800', high: '5400' });
    draft.temperature_c = { low: '18,5', high: draft.temperature_c.high };
    expect(checkDraft(draft, ['temperature_c'], SPATHIPHYLLUM_THRESHOLDS, 'de-DE').ranges.temperature_c).toEqual({ low: 18.5, high: 29 });
  });

  it('saves a comma-decimal temperature as typed', () => {
    const draft = draftFrom(SPATHIPHYLLUM_THRESHOLDS, 'de-DE');
    draft.temperature_c = { low: '2,1', high: '18,5' };
    const { errors, ranges } = checkDraft(draft, ['temperature_c'], {}, 'de-DE');
    expect(errors.temperature_c).toBeUndefined();
    expect(ranges.temperature_c).toEqual({ low: 2.1, high: 18.5 });
  });

  it('rejects a range whose low end is above its high end', () => {
    const draft = draftFrom(SPATHIPHYLLUM_THRESHOLDS, 'en-US');
    draft.soil_pct = { low: '60', high: '40' };
    draft.lux = { low: '', high: '900' };
    draft.humidity_pct = { low: '-5', high: '70' };
    const { errors } = checkDraft(draft, ['soil_pct', 'lux', 'humidity_pct'], {}, 'en-US');
    expect(errors.soil_pct).toBe('The low end can’t be above the high end.');
    expect(errors.lux).toMatch(/both ends/);
    expect(errors.humidity_pct).toMatch(/between 0 and 100/);
  });

  it('accepts equal range endpoints', () => {
    const draft = draftFrom(SPATHIPHYLLUM_THRESHOLDS, 'en-US');
    draft.soil_pct = { low: '50', high: '50' };
    expect(checkDraft(draft, ['soil_pct'], SPATHIPHYLLUM_THRESHOLDS, 'en-US')).toEqual({ ranges: { soil_pct: { low: 50, high: 50 } }, errors: {} });
  });

  it('checks only edited metrics, so an untouched metric without a range does not block the save', () => {
    const thresholds = { ...SPATHIPHYLLUM_THRESHOLDS, lux: {} };
    const draft = draftFrom(thresholds, 'en-US');
    expect(draft.lux).toEqual({ low: '', high: '' });
    draft.soil_pct = { low: '40', high: '80' };
    const base = draftFrom(thresholds, 'en-US');
    expect(editedMetrics(draft, base)).toEqual(['soil_pct']);
    expect(checkDraft(draft, editedMetrics(draft, base), thresholds, 'en-US')).toEqual({ ranges: { soil_pct: { low: 40, high: 80 } }, errors: {} });
  });

  it('keeps an edited range inside the effective warning bounds', () => {
    const draft = draftFrom(SPATHIPHYLLUM_THRESHOLDS, 'en-US');
    draft.temperature_c = { low: '15', high: '29' };
    draft.lux = { low: '800', high: '12000' };
    const { errors } = checkDraft(draft, ['temperature_c', 'lux'], SPATHIPHYLLUM_THRESHOLDS, 'en-US');
    expect(errors.temperature_c).toBe('Keep it within the warning bounds, 16 and 30 °C.');
    expect(errors.lux).toBe('Keep it within the warning bounds, 800 and 10,800 lux.');
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

  it('keeps the saved ranges of metrics that were not edited', () => {
    const overrides = buildOverrides(SPATHIPHYLLUM_THRESHOLDS, { lux: { ok_low: 1000 }, soil_pct: { ok_low: 30 } }, { soil_pct: { low: 40, high: 85 } });
    expect(overrides).toEqual({ lux: { ok_low: 1000 }, soil_pct: { ok_low: 40 } });
  });

  it('collapses to {} when every range matches the preset', () => {
    const draft = draftFrom(SPATHIPHYLLUM_THRESHOLDS, 'en-US');
    const ranges = checkDraft(draft, ['soil_pct', 'lux', 'temperature_c', 'humidity_pct'], SPATHIPHYLLUM_THRESHOLDS, 'en-US').ranges;
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

  it('offers only zones this device can format', () => {
    const Real = Intl.DateTimeFormat;
    const spy = jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(((locale?: string, options?: Intl.DateTimeFormatOptions) => {
      if (options?.timeZone === 'America/Coyhaique') throw new RangeError('Invalid time zone');
      return new Real(locale, options);
    }) as typeof Intl.DateTimeFormat);
    const intl = Intl as unknown as { supportedValuesOf?: unknown };
    const original = intl.supportedValuesOf;
    intl.supportedValuesOf = () => ['Asia/Seoul', 'America/Coyhaique', 'Europe/Berlin'];
    try {
      expect(timeZones('Asia/Seoul')).toEqual(['UTC', 'Asia/Seoul', 'Europe/Berlin']);
    } finally {
      intl.supportedValuesOf = original;
      spy.mockRestore();
    }
  });

  it('offers the full IANA list where Intl.supportedValuesOf is missing (Hermes)', () => {
    const intl = Intl as unknown as { supportedValuesOf?: unknown };
    const original = intl.supportedValuesOf;
    delete intl.supportedValuesOf;
    try {
      const zones = timeZones('Asia/Seoul');
      expect(zones.length).toBeGreaterThan(400);
      expect(zones).toEqual(expect.arrayContaining(['UTC', 'America/Argentina/Buenos_Aires', 'Asia/Kathmandu', 'Europe/Kyiv', 'Pacific/Chatham']));
      expect(new Set(zones).size).toBe(zones.length);
    } finally {
      intl.supportedValuesOf = original;
    }
  });
});

describe('device rows', () => {
  const base: DeviceInputs = {
    gateway: { version: '0.1.0', last_seen_at: '2026-11-06T05:00:00Z' },
    gatewayAgeS: 12,
    gatewayStale: false,
    device: {
      id: 'olvar-a1b2c3',
      fw: '0.1.0',
      soil_dry_raw: 2910,
      soil_wet_raw: 1350,
      soil_calibrated_at: '2026-11-05T01:00:00Z',
      climate_sensor: 'sht31',
    },
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
    expect(rows[3]).toMatchObject({ title: 'SHT31 + GY-302', subtitle: 'Temperature, humidity and light · I²C 0x44, 0x23' });
    expect(rows[3].short).toEqual({ title: 'SHT31 + GY-302', subtitle: 'Temp, humidity, light · I²C', value: 'Read OK' });
  });

  it('names the climate sensor the firmware reports', () => {
    const climate = (climate_sensor: string | null | undefined, device = base.device) =>
      deviceRows({ ...base, device: device && { ...device, climate_sensor } }).find((r) => r.key === 'climate')!;
    expect(climate('dht11')).toMatchObject({
      title: 'DHT11 + GY-302',
      subtitle: 'Temperature, humidity and light · GPIO4, I²C 0x23',
      short: { title: 'DHT11 + GY-302', subtitle: 'Temp, humidity, light · GPIO4, I²C' },
    });
    for (const unknown of [null, undefined, 'bme280']) {
      expect(climate(unknown)).toMatchObject({
        title: 'Climate sensor + GY-302',
        subtitle: 'Temperature, humidity and light',
        short: { title: 'Climate sensor + GY-302', subtitle: 'Temp, humidity, light' },
      });
    }
    expect(deviceRows({ ...base, device: null }).find((r) => r.key === 'climate')!.title).toBe('Climate sensor + GY-302');
  });

  it('shows a node the gateway has not reported on yet as waiting, not connected', () => {
    const rows = deviceRows({ ...base, nodeUnknown: true, latest: null });
    expect(rows[1].status).toEqual({ label: 'Waiting for data', live: false });
    expect(deviceRows({ ...base, nodeUnknown: true }).find((r) => r.key === 'node')!.status).toEqual({ label: 'Connected', live: true });
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
