// Home view model: pure functions from server rows to display text. Status words come only from
// the server labels (`overall_label`, `<metric>_label`, `summary`); nothing here judges a value.

import { localHourStart, type SeriesPoint } from '@/components/charts';
import type { ChatMessageRow, Reading, ThresholdMetric, Thresholds } from '@/data';
import { soilCardState } from '@/domain/calibration';
import { EMPTY_VALUE, formatNumber, formatTime } from '@/domain/format';
import type { TimelineEvent, TimelineEventKind } from '@/domain/timeline-events';
import type { DayBounds } from '@/domain/time';

export type MetricKey = 'soil' | 'light' | 'temperature' | 'humidity';

export const METRICS: readonly MetricKey[] = ['soil', 'light', 'temperature', 'humidity'];


type MetricSpec = {
  column: 'soil_pct' | 'lux' | 'temperature_c' | 'humidity_pct';
  threshold: ThresholdMetric;
  statusColumn: 'soil' | 'light' | 'temperature' | 'humidity';
  decimals: number;
  unit: string;
  rangeUnit: string;
};

const SPECS: Record<MetricKey, MetricSpec> = {
  soil: { column: 'soil_pct', threshold: 'soil_pct', statusColumn: 'soil', decimals: 0, unit: '%', rangeUnit: '%' },
  light: { column: 'lux', threshold: 'lux', statusColumn: 'light', decimals: 0, unit: 'lux', rangeUnit: ' lux' },
  temperature: { column: 'temperature_c', threshold: 'temperature_c', statusColumn: 'temperature', decimals: 1, unit: '°C', rangeUnit: ' °C' },
  humidity: { column: 'humidity_pct', threshold: 'humidity_pct', statusColumn: 'humidity', decimals: 0, unit: '%', rangeUnit: '%' },
};

/** "Good morning" before noon, "Good afternoon" until 18:00, else "Good evening" (plant time zone). */
export function greeting(hour: number, name?: string | null): string {
  const part = hour >= 5 && hour < 12 ? 'morning' : hour >= 12 && hour < 18 ? 'afternoon' : 'evening';
  const first = name?.trim().split(/\s+/)[0];
  return first ? `Good ${part}, ${first}` : `Good ${part}`;
}

const dateFormatters = new Map<string, Intl.DateTimeFormat>();

/** "Fri, Nov 6, 2026" in the plant time zone. */
export function formatHeaderDate(t: Date, timeZone: string): string {
  let f = dateFormatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    dateFormatters.set(timeZone, f);
  }
  return f.format(t);
}

/** Local hour (0–23) of `t` in `timeZone`. */
export function localHour(t: Date, timeZone: string): number {
  return Number(formatTime(t, timeZone).slice(0, 2));
}

/** The newest answer from the plant, skipping failed replies. */
export function latestPlantMessage(messages: readonly ChatMessageRow[] | undefined): ChatMessageRow | null {
  if (!messages) return null;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === 'plant' && m.error == null) return m;
  }
  return null;
}

export type DayStats = Record<'temperature' | 'humidity' | 'light', { min: number | null; max: number | null }>;

/** Today's low and high per metric from raw readings at or after `dayStart`. */
export function todayStats(rows: readonly Reading[] | undefined, dayStart: Date): DayStats {
  const stats: DayStats = {
    temperature: { min: null, max: null },
    humidity: { min: null, max: null },
    light: { min: null, max: null },
  };
  const start = dayStart.getTime();
  for (const r of rows ?? []) {
    if (new Date(r.recorded_at).getTime() < start) continue;
    for (const key of ['temperature', 'humidity', 'light'] as const) {
      const v = r[SPECS[key].column];
      if (v == null) continue;
      const s = stats[key];
      s.min = s.min == null ? v : Math.min(s.min, v);
      s.max = s.max == null ? v : Math.max(s.max, v);
    }
  }
  return stats;
}

/** Mean lux per plant-local clock hour from raw readings in `[from, to)`, for the Home light bars. */
export function hourlyMeans(rows: readonly Reading[] | undefined, from: Date, to: Date, timeZone: string): SeriesPoint[] {
  const sums = new Map<number, { sum: number; n: number }>();
  for (const r of rows ?? []) {
    const t = new Date(r.recorded_at).getTime();
    if (r.lux == null || t < from.getTime() || t >= to.getTime()) continue;
    const bucket = localHourStart(t, timeZone);
    const s = sums.get(bucket) ?? { sum: 0, n: 0 };
    s.sum += r.lux;
    s.n += 1;
    sums.set(bucket, s);
  }
  return [...sums.entries()].sort(([a], [b]) => a - b).map(([t, s]) => ({ t, v: s.sum / s.n }));
}

/** "35–60%", "18–27 °C": the target band drawn on the card, or null without thresholds. */
export function rangeText(metric: MetricKey, thresholds: Thresholds | null | undefined): string | null {
  const spec = SPECS[metric];
  const t = thresholds?.[spec.threshold];
  if (t?.ok_low == null || t.ok_high == null) return null;
  return `${formatNumber(t.ok_low)}–${formatNumber(t.ok_high)}${spec.rangeUnit}`;
}

export type StatusLabels = Partial<Record<`${MetricSpec['statusColumn']}_${'label' | 'status'}`, string | null>>;

export type SensorCardModel = {
  metric: MetricKey;
  /** Big number without its unit, or "—". */
  value: string;
  unit: string;
  /** Per-metric status key (colour only) and the server's label for it. */
  statusKey: string | null;
  statusLabel: string;
  range: string | null;
  /** Plain fact on the right of the footer, e.g. "Peak 1,560 lux today" or "Read failed at 14:32". */
  meta: string | null;
  readFailed: boolean;
  notCalibrated: boolean;
};

export type SensorInput = {
  latest: Reading | null;
  status: StatusLabels | null;
  calibrated: boolean;
  thresholds: Thresholds | null | undefined;
  today: DayStats;
  timeZone: string;
  offline: boolean;
};

function lowHigh(s: { min: number | null; max: number | null }, decimals: number, unit = ''): string | null {
  if (s.min == null || s.max == null) return null;
  return `Low ${formatNumber(s.min, decimals)}${unit} · High ${formatNumber(s.max, decimals)}${unit}`;
}

/** One sensor card: value, server label, band and a plain fact, including the §5.5 soil matrix. */
export function sensorCard(metric: MetricKey, input: SensorInput): SensorCardModel {
  const spec = SPECS[metric];
  const { latest, status, timeZone } = input;
  const at = latest ? formatTime(latest.recorded_at, timeZone) : null;
  const statusLabel = status?.[`${spec.statusColumn}_label`] ?? 'No data yet';
  const statusKey = status?.[`${spec.statusColumn}_status`] ?? null;
  const range = rangeText(metric, input.thresholds);
  const base = { metric, unit: spec.unit, statusKey, statusLabel, range };

  if (!latest) {
    return { ...base, value: EMPTY_VALUE, meta: 'Waiting for the first reading', readFailed: false, notCalibrated: false };
  }

  if (metric === 'soil') {
    const state = soilCardState(input.calibrated, latest.soil_raw);
    const value =
      state.value === 'pct' && latest.soil_pct != null
        ? formatNumber(latest.soil_pct)
        : state.value === 'raw' && latest.soil_raw != null
          ? formatNumber(latest.soil_raw)
          : EMPTY_VALUE;
    const meta = state.readFailed ? `Read failed at ${at}` : input.offline ? `Last reading ${at}` : state.notCalibrated ? null : 'Last 7 days';
    return {
      ...base,
      unit: state.value === 'raw' ? 'raw' : spec.unit,
      range: state.notCalibrated ? null : range,
      value,
      meta,
      readFailed: state.readFailed,
      notCalibrated: state.notCalibrated,
    };
  }

  const v = latest[spec.column];
  if (v == null) {
    return { ...base, value: EMPTY_VALUE, meta: `Read failed at ${at}`, readFailed: true, notCalibrated: false };
  }
  let meta: string | null;
  if (input.offline) meta = `Last reading ${at}`;
  else if (metric === 'light') meta = input.today.light.max == null ? null : `Peak ${formatNumber(input.today.light.max)} lux today`;
  else if (metric === 'temperature') meta = lowHigh(input.today.temperature, 1);
  else meta = lowHigh(input.today.humidity, 0, '%');
  return { ...base, value: formatNumber(v, spec.decimals), meta, readFailed: false, notCalibrated: false };
}

export type EventTone = 'muted' | 'water' | 'light' | 'temp' | 'humidity' | 'brand' | 'chat';

export type EventRow = {
  key: string;
  kind: TimelineEventKind;
  title: string;
  time: string | null;
  tag: string;
  tone: EventTone;
};

const EVENT_STYLE: Record<TimelineEventKind, { tag: string; tone: EventTone }> = {
  offline: { tag: 'Offline', tone: 'muted' },
  offline_ongoing: { tag: 'Offline', tone: 'muted' },
  restart: { tag: 'Restart', tone: 'muted' },
  temperature_max: { tag: 'Reading', tone: 'temp' },
  light_max: { tag: 'Reading', tone: 'light' },
  humidity_min: { tag: 'Reading', tone: 'humidity' },
  soil_driest: { tag: 'Reading', tone: 'water' },
  calibration: { tag: 'Calibrated', tone: 'brand' },
  chat: { tag: 'Chat', tone: 'chat' },
};

/** Timeline events as list rows; the time moves from the end of the text to its own line. */
export function eventRows(events: readonly TimelineEvent[], timeZone: string): EventRow[] {
  return events.map((e, i) => {
    const time = e.at ? formatTime(e.at, timeZone) : null;
    const suffix = time ? ` · ${time}` : '';
    const title = suffix && e.text.endsWith(suffix) ? e.text.slice(0, -suffix.length) : e.text;
    return { key: `${e.kind}-${e.at?.getTime() ?? 'none'}-${i}`, kind: e.kind, title, time, ...EVENT_STYLE[e.kind] };
  });
}

export type TrackMarker = { key: string; at: number; tone: EventTone };
export type TrackSegment = { key: string; from: number; to: number };

export type DayTrackModel = {
  /** Position of now in the day, 0–1. */
  now: number;
  nowLabel: string;
  markers: TrackMarker[];
  /** Offline periods. */
  segments: TrackSegment[];
};

function fraction(t: Date | string, day: DayBounds): number {
  const span = day.end.getTime() - day.start.getTime();
  return Math.min(1, Math.max(0, (new Date(t).getTime() - day.start.getTime()) / span));
}

/** Today's 24 h track: event markers, offline stretches and the now line. */
export function dayTrack(
  events: readonly TimelineEvent[],
  offline: readonly { started_at: string; ended_at: string | null }[],
  day: DayBounds,
  now: Date,
  timeZone: string,
): DayTrackModel {
  return {
    now: fraction(now, day),
    nowLabel: formatTime(now, timeZone),
    markers: events
      .filter((e) => e.at != null && !e.kind.startsWith('offline') && e.kind !== 'restart')
      .map((e, i) => ({ key: `${e.kind}-${i}`, at: fraction(e.at!, day), tone: EVENT_STYLE[e.kind].tone })),
    segments: offline.map((p, i) => ({
      key: `${p.started_at}-${i}`,
      from: fraction(p.started_at, day),
      to: fraction(p.ended_at ?? now, day),
    })),
  };
}
