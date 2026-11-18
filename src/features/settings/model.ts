// Pure Settings logic: field rules, care-target editing, device rows and error wording.
// Nothing here judges a sensor value; ranges are numbers the owner edits.

import type { IconName } from '@/components/icons';
import { DataError, type Json, type Reading, type ThresholdKey, type ThresholdMetric, type Thresholds } from '@/data';
import { formatAge, formatLocalDate, formatNumber, formatTime } from '@/domain/format';
import { localDate, tzOffsetMs } from '@/domain/time';
import { colors, iosColors } from '@/theme';

export const NICKNAME_MAX = 40;
export const LOCATION_MAX = 60;
export const PASSWORD_MIN = 8;

export function nicknameError(value: string): string | null {
  const v = value.trim();
  if (v.length === 0) return 'Give your plant a name.';
  if (v.length > NICKNAME_MAX) return `Use at most ${NICKNAME_MAX} characters.`;
  return null;
}

export function locationError(value: string): string | null {
  return value.trim().length > LOCATION_MAX ? `Use at most ${LOCATION_MAX} characters.` : null;
}

export function nameError(value: string): string | null {
  return value.trim().length === 0 ? 'Enter your name.' : null;
}

export type PasswordForm = { current: string; next: string; confirm?: string };

export function passwordError({ current, next, confirm }: PasswordForm): string | null {
  if (current.length === 0) return 'Enter your current password.';
  if (next.length < PASSWORD_MIN) return `The new password needs at least ${PASSWORD_MIN} characters.`;
  if (confirm !== undefined && confirm !== next) return 'The new passwords don’t match.';
  return null;
}

// ---------------------------------------------------------------------------------------------
// Care targets

export type MetricConfig = {
  metric: ThresholdMetric;
  label: string;
  icon: IconName;
  /** Desktop icon chip (Figma data tints) and range colour. */
  color: string;
  tint: string;
  /** iPhone icon tile (Figma Accents). */
  iosTint: string;
  unit: string;
  decimals: number;
  /** Scale drawn behind the range. */
  scale: { min: number; max: number };
  /** Values the owner may type. */
  limits: { min: number; max: number };
  reading: 'soil_pct' | 'lux' | 'temperature_c' | 'humidity_pct';
};

/** In the order of the Figma care-target rows. */
export const METRICS: readonly MetricConfig[] = [
  {
    metric: 'soil_pct',
    label: 'Soil moisture',
    icon: 'droplet',
    color: colors.data.water,
    tint: colors.data.waterTint,
    iosTint: iosColors.accentBlue,
    unit: '%',
    decimals: 0,
    scale: { min: 0, max: 100 },
    limits: { min: 0, max: 100 },
    reading: 'soil_pct',
  },
  {
    metric: 'lux',
    label: 'Light',
    icon: 'sun',
    color: colors.data.light,
    tint: colors.data.lightTint,
    iosTint: iosColors.accentYellow,
    unit: 'lux',
    decimals: 0,
    scale: { min: 0, max: 2000 },
    limits: { min: 0, max: 100_000 },
    reading: 'lux',
  },
  {
    metric: 'temperature_c',
    label: 'Temperature',
    icon: 'thermo',
    color: colors.data.temp,
    tint: colors.data.tempTint,
    iosTint: iosColors.accentOrange,
    unit: '°C',
    decimals: 1,
    scale: { min: 5, max: 40 },
    limits: { min: -20, max: 60 },
    reading: 'temperature_c',
  },
  {
    metric: 'humidity_pct',
    label: 'Humidity',
    icon: 'droplets',
    color: colors.data.humidity,
    tint: colors.data.humidityTint,
    iosTint: iosColors.accentTeal,
    unit: '%',
    decimals: 0,
    scale: { min: 0, max: 100 },
    limits: { min: 0, max: 100 },
    reading: 'humidity_pct',
  },
];

export type Range = { low: number; high: number };

/** Scale for the range slider: the metric's scale, widened so a range past its end still fits. */
export function scaleFor(cfg: MetricConfig, range: Range | null): { min: number; max: number } {
  const { min, max } = cfg.scale;
  if (!range) return cfg.scale;
  return { min: Math.min(min, range.low), max: range.high >= max ? Math.ceil((range.high * 1.25) / 100) * 100 : max };
}

/** The ideal range of a metric from the effective thresholds, or null when the profile has none. */
export function okRange(thresholds: Thresholds | null | undefined, metric: ThresholdMetric): Range | null {
  const t = thresholds?.[metric];
  return t?.ok_low != null && t.ok_high != null ? { low: t.ok_low, high: t.ok_high } : null;
}

function trimNumber(v: number, decimals: number): string {
  return Number.isInteger(v) ? formatNumber(v) : formatNumber(v, decimals);
}

/** "35 – 60 %", "500 – 1,500 lux", "18 – 27 °C" (desktop) or "35–60%" style when `tight`. */
export function formatRange(cfg: MetricConfig, range: Range | null, tight = false): string {
  if (!range) return '—';
  const low = trimNumber(range.low, cfg.decimals);
  const high = trimNumber(range.high, cfg.decimals);
  if (!tight) return `${low} – ${high} ${cfg.unit}`;
  return cfg.unit === '%' ? `${low}–${high}%` : `${low}–${high} ${cfg.unit}`;
}

/** "Now 64 %" under a care-target label; a failed read says so. */
export function formatNow(cfg: MetricConfig, latest: Reading | null | undefined): string {
  if (!latest) return 'No reading yet';
  const v = latest[cfg.reading];
  if (v == null) return cfg.metric === 'soil_pct' && latest.soil_raw != null ? 'Not calibrated' : 'Read failed';
  return `Now ${trimNumber(v, cfg.decimals)} ${cfg.unit}`;
}

function asObject(v: Json | undefined): Record<string, Json | undefined> {
  return v != null && typeof v === 'object' && !Array.isArray(v) ? v : {};
}

/** "Use preset" is on while the plant has no overrides at all. */
export function usesPreset(overrides: Json | null | undefined): boolean {
  return Object.keys(asObject(overrides ?? undefined)).length === 0;
}

export type RangeDraft = Record<ThresholdMetric, { low: string; high: string }>;

export function draftFrom(thresholds: Thresholds | null | undefined): RangeDraft {
  const out = {} as RangeDraft;
  for (const cfg of METRICS) {
    const r = okRange(thresholds, cfg.metric);
    out[cfg.metric] = { low: r ? String(r.low) : '', high: r ? String(r.high) : '' };
  }
  return out;
}

function localeDecimal(): string {
  try {
    return new Intl.NumberFormat().formatToParts(1.5).find((p) => p.type === 'decimal')?.value ?? '.';
  } catch {
    return '.';
  }
}

/**
 * Reads a typed number. A comma is a decimal separator ("18,5" is 18.5), except where it groups
 * thousands in a locale whose decimal is a dot ("1,500" lux).
 */
export function parseNumber(s: string, decimal = localeDecimal()): number | null {
  let t = s.trim();
  if (t === '') return null;
  if (decimal === ',') t = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  else if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) t = t.replace(/,/g, '');
  else if (/^-?\d*,\d+$/.test(t)) t = t.replace(',', '.');
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export type DraftCheck = { ranges: Partial<Record<ThresholdMetric, Range>>; errors: Partial<Record<ThresholdMetric, string>> };

const KEY_ORDER: ThresholdKey[] = ['critical_low', 'low', 'ok_low', 'ok_high', 'high', 'critical_high'];

/**
 * Checks a draft the way the server's constraint does (numbers, low below high), only to word a
 * message next to the row; the server stays authoritative.
 */
export function checkDraft(draft: RangeDraft): DraftCheck {
  const ranges: DraftCheck['ranges'] = {};
  const errors: DraftCheck['errors'] = {};
  for (const cfg of METRICS) {
    const d = draft[cfg.metric];
    const low = parseNumber(d.low);
    const high = parseNumber(d.high);
    if (low === null || high === null) {
      errors[cfg.metric] = 'Enter both ends of the range.';
    } else if (low < cfg.limits.min || high > cfg.limits.max) {
      errors[cfg.metric] = `Keep it between ${trimNumber(cfg.limits.min, 0)} and ${trimNumber(cfg.limits.max, 0)} ${cfg.unit}.`;
    } else if (low >= high) {
      errors[cfg.metric] = 'The low end must be below the high end.';
    } else {
      ranges[cfg.metric] = { low, high };
    }
  }
  return { ranges, errors };
}

/**
 * The `threshold_overrides` to save: each metric's `ok_low`/`ok_high` where it differs from the
 * profile, keeping any other override keys the plant already has. Equal to the profile → `{}`.
 */
export function buildOverrides(
  profile: Json,
  current: Json | null | undefined,
  ranges: Partial<Record<ThresholdMetric, Range>>,
): Record<string, Record<string, number>> {
  const base = asObject(profile);
  const existing = asObject(current ?? undefined);
  const out: Record<string, Record<string, number>> = {};
  for (const cfg of METRICS) {
    const prev = asObject(existing[cfg.metric]);
    const kept: Record<string, number> = {};
    for (const key of KEY_ORDER) {
      if (key !== 'ok_low' && key !== 'ok_high' && typeof prev[key] === 'number') kept[key] = prev[key];
    }
    const r = ranges[cfg.metric];
    const p = asObject(base[cfg.metric]);
    if (r && r.low !== p.ok_low) kept.ok_low = r.low;
    if (r && r.high !== p.ok_high) kept.ok_high = r.high;
    if (Object.keys(kept).length) out[cfg.metric] = kept;
  }
  return out;
}

/** Wording for a failed save. Server codes: 23514 check constraint, 22023 unknown time zone. */
export function saveErrorMessage(err: unknown, context: 'ranges' | 'plant' | 'timezone' | 'account' = 'plant'): string {
  if (err instanceof DataError) {
    if (err.code === '22023') return 'Unknown timezone';
    if (err.code === '23514') {
      return context === 'ranges'
        ? `The server rejected these ranges: ${err.message}. Each range must run from low to high.`
        : `The server rejected this change: ${err.message}`;
    }
    if (err.message) return err.message;
  }
  return 'Couldn’t save. Check your connection and try again.';
}

// ---------------------------------------------------------------------------------------------
// Time zones

const FALLBACK_ZONES = [
  'UTC',
  'Asia/Seoul',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Australia/Sydney',
  'Pacific/Auckland',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Europe/Madrid',
  'Africa/Johannesburg',
  'America/Sao_Paulo',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Pacific/Honolulu',
];

/** IANA zones the runtime knows; Hermes builds without `supportedValuesOf` get a short list. */
export function timeZones(current?: string | null): string[] {
  const intl = Intl as unknown as { supportedValuesOf?: (key: 'timeZone') => string[] };
  let zones: string[];
  try {
    zones = intl.supportedValuesOf?.('timeZone') ?? FALLBACK_ZONES;
  } catch {
    zones = FALLBACK_ZONES;
  }
  if (!zones.includes('UTC')) zones = ['UTC', ...zones];
  return current && !zones.includes(current) ? [current, ...zones] : zones;
}

/** "GMT+9", "GMT-3:30", "GMT" at `at`; empty for an unknown zone. */
export function gmtOffset(timeZone: string, at: Date = new Date()): string {
  let ms: number;
  try {
    ms = tzOffsetMs(timeZone, at);
  } catch {
    return '';
  }
  if (!Number.isFinite(ms)) return '';
  const total = Math.round(ms / 60_000);
  if (total === 0) return 'GMT';
  const h = Math.floor(Math.abs(total) / 60);
  const m = Math.abs(total) % 60;
  return `GMT${total < 0 ? '-' : '+'}${h}${m ? `:${String(m).padStart(2, '0')}` : ''}`;
}

/** "Asia/Seoul (GMT+9)". */
export function timeZoneLabel(timeZone: string, at?: Date): string {
  const off = gmtOffset(timeZone, at);
  return off ? `${timeZone} (${off})` : timeZone;
}

export function filterZones(zones: readonly string[], query: string): string[] {
  const q = query.trim().toLowerCase().replace(/\s+/g, '_');
  return q ? zones.filter((z) => z.toLowerCase().includes(q)) : [...zones];
}

// ---------------------------------------------------------------------------------------------
// Devices

export type DeviceRowModel = {
  key: 'gateway' | 'node' | 'soil' | 'climate';
  title: string;
  subtitle: string;
  icon: IconName;
  status: { label: string; live: boolean } | null;
  /** The soil probe offers Recalibrate. */
  recalibrate?: boolean;
  /** Shorter title, subtitle and value for the iPhone grouped rows (Figma 155:3506). */
  short: { title: string; subtitle: string; value: string | undefined };
};

export type DeviceInputs = {
  gateway: { version: string | null; last_seen_at: string } | null | undefined;
  gatewayAgeS: number | null;
  gatewayStale: boolean;
  device:
    | { id: string; fw: string | null; soil_dry_raw: number | null; soil_wet_raw: number | null; soil_calibrated_at: string | null }
    | null
    | undefined;
  /** Display status says the node is offline (180 s rule or LWT). */
  nodeOffline: boolean;
  /** The gateway has not yet recorded a status for the node (`devices.status = 'unknown'`). */
  nodeUnknown?: boolean;
  nodeOfflineSince: Date | null;
  latest: Reading | null | undefined;
  timeZone: string;
};

/** Gateway, sensor node, soil probe and SHT31 + GY-302 rows with their live status. */
export function deviceRows(i: DeviceInputs): DeviceRowModel[] {
  const gwVersion = i.gateway?.version ? ` · v${i.gateway.version}` : '';
  const gatewayStatus = !i.gateway
    ? { label: 'Not seen yet', live: false }
    : i.gatewayStale
      ? { label: i.gatewayAgeS == null ? 'Offline' : `Offline · ${formatAge(i.gatewayAgeS)}`, live: false }
      : { label: 'Online', live: true };

  const d = i.device;
  const nodeStatus = !d
    ? { label: 'Not paired', live: false }
    : i.nodeUnknown && !i.latest
      ? { label: 'Waiting for data', live: false }
      : i.nodeOffline
        ? { label: i.nodeOfflineSince ? `Offline since ${formatTime(i.nodeOfflineSince, i.timeZone)}` : 'Offline', live: false }
        : { label: 'Connected', live: true };

  const calibrated = d?.soil_dry_raw != null && d.soil_wet_raw != null;
  const soilSub = calibrated
    ? `Capacitive · GPIO34 · dry ${formatNumber(d!.soil_dry_raw!)} · wet ${formatNumber(d!.soil_wet_raw!)}`
    : 'Capacitive · GPIO34 · not calibrated yet';
  const soilStatus = calibrated
    ? {
        label: d!.soil_calibrated_at ? `Calibrated ${formatLocalDate(localDate(i.timeZone, d!.soil_calibrated_at))}` : 'Calibrated',
        live: !i.nodeOffline,
      }
    : { label: 'Not calibrated', live: false };

  const l = i.latest;
  const climateFailed = l != null && (l.temperature_c == null || l.humidity_pct == null || l.lux == null);
  const climateStatus = !l
    ? { label: 'No reading yet', live: false }
    : climateFailed
      ? { label: `Read failed ${formatTime(l.recorded_at, i.timeZone)}`, live: false }
      : { label: 'Read OK', live: !i.nodeOffline };

  return [
    {
      key: 'gateway',
      title: 'olvar-gateway',
      subtitle: `Raspberry Pi 3B · Wi-Fi · MQTT${gwVersion}`,
      icon: 'wifi',
      status: gatewayStatus,
      short: { title: 'olvar-gateway', subtitle: 'Raspberry Pi 3B · Wi-Fi · MQTT', value: gatewayStatus.label },
    },
    {
      key: 'node',
      title: d ? `ESP32 · ${d.id}` : 'ESP32 sensor node',
      subtitle: `Wi-Fi · MQTT · updates every 60 s${d?.fw ? ` · firmware ${d.fw}` : ''}`,
      icon: 'cpu',
      status: nodeStatus,
      short: { title: 'ESP32', subtitle: `${d?.id ?? 'not paired'} · every 60 s`, value: nodeStatus.label },
    },
    {
      key: 'soil',
      title: 'Soil moisture sensor',
      subtitle: soilSub,
      icon: 'droplet',
      status: soilStatus,
      recalibrate: !!d,
      short: { title: 'Soil Moisture Sensor', subtitle: 'Capacitive · GPIO34', value: soilStatus.label.replace(/^Calibrated /, '') },
    },
    {
      key: 'climate',
      title: 'SHT31 + GY-302',
      subtitle: 'Temperature, humidity and light · I²C 0x44, 0x23',
      icon: 'sliders',
      status: climateStatus,
      short: { title: 'SHT31 + GY-302', subtitle: 'Temp, humidity, light · I²C', value: climateStatus.label },
    },
  ];
}

/** "Oct 12, 2026" for `created_at` in the plant time zone. */
export function addedDate(createdAt: string, timeZone: string): string {
  return formatLocalDate(localDate(timeZone, createdAt), true);
}

/** "Spathiphyllum", from "Spathiphyllum spp." or the common name. */
export function speciesName(profile: { scientific_name?: string | null; common_name?: string | null }): string {
  const sci = profile.scientific_name?.replace(/\s+spp?\.?$/i, '').trim();
  return sci || profile.common_name || 'Unknown species';
}
