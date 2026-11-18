// Turns readings_v / readings_hourly_v rows into chart series, min/avg/max and card text.
// Nothing here judges a value: status words come from plant_status_v, bands from thresholds.

import type { IconName } from '@/components/icons';
import { localHourStart, type SeriesPoint } from '@/components/charts';
import type { HourlyRow, PlantStatus, Reading, ThresholdMetric } from '@/data';
import { formatNumber, formatShortDate, formatTime } from '@/domain/format';
import { colors, iosColors } from '@/theme';

export type Range = '24h' | '7d' | '30d';
export const RANGES: readonly Range[] = ['24h', '7d', '30d'];

export type MetricKey = 'soil' | 'light' | 'temperature' | 'humidity';

type ReadingColumn = 'soil_pct' | 'soil_raw' | 'lux' | 'temperature_c' | 'humidity_pct';
type HourlyPrefix = 'soil_pct' | 'soil_raw' | 'lux' | 'temperature_c' | 'humidity_pct';

export type MetricSpec = {
  key: MetricKey;
  title: string;
  icon: IconName;
  color: string;
  tint: string;
  iosColor: string;
  unit: string;
  decimals: number;
  threshold: ThresholdMetric;
  column: ReadingColumn;
  /** `plant_status_v` columns holding this metric's status key and label. */
  statusColumn: 'soil_status' | 'light_status' | 'temperature_status' | 'humidity_status';
  labelColumn: 'soil_label' | 'light_label' | 'temperature_label' | 'humidity_label';
  hardware: string;
};

export const METRICS: readonly MetricSpec[] = [
  {
    key: 'soil',
    title: 'Soil moisture',
    icon: 'droplet',
    color: colors.data.water,
    tint: colors.data.waterTint,
    iosColor: iosColors.accentBlue,
    unit: '%',
    decimals: 0,
    threshold: 'soil_pct',
    column: 'soil_pct',
    statusColumn: 'soil_status',
    labelColumn: 'soil_label',
    hardware: 'Capacitive v1.2 · GPIO34',
  },
  {
    key: 'light',
    title: 'Light',
    icon: 'sun',
    color: colors.data.light,
    tint: colors.data.lightTint,
    iosColor: iosColors.accentYellow,
    unit: 'lux',
    decimals: 0,
    threshold: 'lux',
    column: 'lux',
    statusColumn: 'light_status',
    labelColumn: 'light_label',
    hardware: 'GY-302 (BH1750) · I²C 0x23',
  },
  {
    key: 'temperature',
    title: 'Temperature',
    icon: 'thermo',
    color: colors.data.temp,
    tint: colors.data.tempTint,
    iosColor: iosColors.accentOrange,
    unit: '°C',
    decimals: 1,
    threshold: 'temperature_c',
    column: 'temperature_c',
    statusColumn: 'temperature_status',
    labelColumn: 'temperature_label',
    hardware: 'SHT31 · I²C 0x44',
  },
  {
    key: 'humidity',
    title: 'Humidity',
    icon: 'droplets',
    color: colors.data.humidity,
    tint: colors.data.humidityTint,
    iosColor: iosColors.accentTeal,
    unit: '%',
    decimals: 0,
    threshold: 'humidity_pct',
    column: 'humidity_pct',
    statusColumn: 'humidity_status',
    labelColumn: 'humidity_label',
    hardware: 'SHT31 · I²C 0x44',
  },
];

/** Uncalibrated soil is charted and shown as the raw ADC value (higher is drier). */
function readingColumn(spec: MetricSpec, calibrated: boolean): ReadingColumn {
  return spec.key === 'soil' && !calibrated ? 'soil_raw' : spec.column;
}

export type Stats = { min: number; avg: number; max: number };

export type MetricSeries = {
  series: SeriesPoint[];
  stats: Stats | null;
  /** Light over 24 h: hourly averages for the bar chart. */
  bars?: SeriesPoint[];
};

export type RangeData = {
  range: Range;
  from: Date;
  to: Date;
  metrics: Record<MetricKey, MetricSeries>;
};


function statsOf(values: readonly number[]): Stats | null {
  if (!values.length) return null;
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
  }
  return { min, max, avg: sum / values.length };
}

/** Mean of each plant-local clock hour of readings (null when every read in it failed). */
export function hourlyAverages(rows: readonly Reading[], column: ReadingColumn, timeZone: string): SeriesPoint[] {
  const sums = new Map<number, { sum: number; n: number }>();
  for (const r of rows) {
    const bucket = localHourStart(Date.parse(r.recorded_at), timeZone);
    const acc = sums.get(bucket) ?? { sum: 0, n: 0 };
    const v = r[column];
    if (v != null) {
      acc.sum += v;
      acc.n += 1;
    }
    sums.set(bucket, acc);
  }
  return [...sums.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([t, { sum, n }]) => ({ t, v: n ? sum / n : null }));
}

/** 24 h view from raw readings (oldest first, ≈1,440 rows). */
export function fromReadings(rows: readonly Reading[], from: Date, to: Date, calibrated: boolean, timeZone: string): RangeData {
  const metrics = {} as Record<MetricKey, MetricSeries>;
  for (const spec of METRICS) {
    const column = readingColumn(spec, calibrated);
    const series = rows.map((r) => ({ t: r.recorded_at, v: r[column] }));
    const values = series.flatMap((p) => (p.v == null ? [] : [p.v]));
    metrics[spec.key] = {
      series,
      stats: statsOf(values),
      ...(spec.key === 'light' && { bars: hourlyAverages(rows, column, timeZone) }),
    };
  }
  return { range: '24h', from, to, metrics };
}

function hourlyCount(row: HourlyRow, prefix: HourlyPrefix): number {
  return prefix === 'soil_pct' ? row.soil_raw_n : row[`${prefix}_n`];
}

/** 7 d / 30 d view from hourly rollups: line = hourly mean, stats = min of mins, max of maxes, count-weighted mean. */
export function fromHourly(rows: readonly HourlyRow[], range: '7d' | '30d', from: Date, to: Date, calibrated: boolean): RangeData {
  const metrics = {} as Record<MetricKey, MetricSeries>;
  for (const spec of METRICS) {
    const prefix = readingColumn(spec, calibrated);
    let min = Infinity;
    let max = -Infinity;
    let weighted = 0;
    let n = 0;
    const series: SeriesPoint[] = [];
    for (const row of rows) {
      const avg = row[`${prefix}_avg`];
      series.push({ t: row.bucket, v: avg });
      const lo = row[`${prefix}_min`];
      const hi = row[`${prefix}_max`];
      if (lo != null && lo < min) min = lo;
      if (hi != null && hi > max) max = hi;
      const count = hourlyCount(row, prefix);
      if (avg != null && count > 0) {
        weighted += avg * count;
        n += count;
      }
    }
    metrics[spec.key] = { series, stats: n ? { min, max, avg: weighted / n } : null };
  }
  return { range, from, to, metrics };
}

export function latestValue(latest: Reading | null | undefined, spec: MetricSpec, calibrated: boolean): number | null {
  return latest ? latest[readingColumn(spec, calibrated)] : null;
}

export function valueText(spec: MetricSpec, v: number | null | undefined, calibrated: boolean): string {
  if (v == null) return '—';
  return formatNumber(v, spec.key === 'soil' && !calibrated ? 0 : spec.decimals);
}

export function unitText(spec: MetricSpec, calibrated: boolean): string {
  return spec.key === 'soil' && !calibrated ? 'raw' : spec.unit;
}

/** "34%" / "1,560" / "19.8 °C" for the min/avg/max cells. */
export function statText(spec: MetricSpec, v: number, calibrated: boolean): string {
  const n = valueText(spec, v, calibrated);
  if (spec.key === 'soil' && !calibrated) return n;
  if (spec.unit === '%') return `${n}%`;
  if (spec.unit === 'lux') return n;
  return `${n} ${spec.unit}`;
}

export const RANGE_SHORT: Record<Range, string> = { '24h': '24 h', '7d': '7 d', '30d': '30 d' };

/** iPhone card summary: "34–66% in 24 h", "19.8–24.6 °C in 7 d". */
export function rangeSummary(spec: MetricSpec, stats: Stats | null, range: Range, calibrated: boolean): string {
  if (!stats) return `No readings in ${RANGE_SHORT[range]}`;
  if (spec.key === 'light') return `Peak ${statText(spec, stats.max, calibrated)} lux in ${RANGE_SHORT[range]}`;
  const lo = valueText(spec, stats.min, calibrated);
  const hi = statText(spec, stats.max, calibrated);
  return `${lo}–${hi} in ${RANGE_SHORT[range]}`;
}

export type MetricStatus = { key: string | null; label: string | null };

export function metricStatus(row: PlantStatus | null | undefined, spec: MetricSpec): MetricStatus {
  return { key: row?.[spec.statusColumn] ?? null, label: row?.[spec.labelColumn] ?? null };
}

export type DeviceInfo = {
  soil_dry_raw?: number | null;
  soil_wet_raw?: number | null;
  soil_calibrated_at?: string | null;
};

/** Desktop card footer: the part, its bus or pin, and how the latest read went. */
export function hardwareText(
  spec: MetricSpec,
  latest: Reading | null | undefined,
  device: DeviceInfo | null | undefined,
  calibrated: boolean,
  timeZone: string,
): string {
  const parts = [spec.hardware];
  const failedAt = latest ? `Read failed at ${formatTime(latest.recorded_at, timeZone)}` : null;
  if (spec.key === 'soil') {
    if (latest?.soil_raw == null) {
      if (failedAt) parts.push(failedAt);
    } else {
      parts.push(`raw ${formatNumber(latest.soil_raw)}`);
    }
    parts.push(
      calibrated && device?.soil_calibrated_at
        ? `calibrated ${formatShortDate(device.soil_calibrated_at, timeZone)}`
        : calibrated
          ? 'calibrated'
          : 'not calibrated',
    );
    return parts.join(' · ');
  }
  if (latest) parts.push(latest[spec.column] == null ? failedAt! : 'Read OK');
  return parts.join(' · ');
}

const weekdayFormatters = new Map<string, Intl.DateTimeFormat>();

/** "Wed, Nov 4 at 16:12" in the plant time zone. */
export function formatWhen(t: string, timeZone: string): string {
  let f = weekdayFormatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' });
    weekdayFormatters.set(timeZone, f);
  }
  return `${f.format(new Date(t))}, ${formatShortDate(t, timeZone)} at ${formatTime(t, timeZone)}`;
}

/** "25 min" / "2 days" for how long the node has been silent. */
export function silentFor(seconds: number): string {
  const s = Math.max(0, seconds);
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min`;
  if (s < 86_400) {
    const h = Math.floor(s / 3600);
    return `${h} ${h === 1 ? 'hour' : 'hours'}`;
  }
  const d = Math.floor(s / 86_400);
  return `${d} ${d === 1 ? 'day' : 'days'}`;
}

export type GatewayState = 'checking' | 'unavailable' | 'online' | 'offline';

/**
 * What the offline view may say about the gateway: nothing definite while its request is loading
 * or failed. A lookup that finds no gateway row means it never sent a heartbeat.
 */
export function gatewayState(gateway: { data?: unknown; error: Error | null; stale: boolean }): GatewayState {
  if (gateway.error) return 'unavailable';
  if (gateway.data === undefined) return 'checking';
  return gateway.data === null || gateway.stale ? 'offline' : 'online';
}
