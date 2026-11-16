// Turns server rows into the Timeline / Home activity list for one local day.
// Offline periods come only from `device_offline_periods()` and extrema from
// `readings_daily_v` or raw lookups: no gap detection, no threshold logic.

import { formatDuration, formatMetric, formatSoilRaw, formatTime, truncate } from './format';
import type { DayBounds } from './time';

/** A row of `device_offline_periods(p_device_id, p_from, p_to)`, already clipped to the day. */
export type OfflinePeriodRow = {
  started_at: string;
  ended_at: string | null;
  duration_s: number;
  cause: 'device_restart' | 'no_data';
  ongoing: boolean;
};

export type ExtremumKind = 'temperature_max' | 'light_max' | 'humidity_min' | 'soil_driest';

export type Extremum = {
  kind: ExtremumKind;
  /** The extreme value: °C, lux, %, or raw soil ADC for `soil_driest` (higher raw = drier). */
  value: number | null;
  /** When it happened, or null when no raw match was found (value shown without a time). */
  at: string | null;
  /** For `soil_driest`: `soil_pct` at that point, null when uncalibrated. */
  soilPct?: number | null;
};

export type TimelineEventKind = 'offline' | 'restart' | 'offline_ongoing' | ExtremumKind | 'calibration' | 'chat';

export type TimelineEvent = {
  kind: TimelineEventKind;
  /** Sort key and display time; null for an extremum without a time. */
  at: Date | null;
  text: string;
};

const CHAT_PREVIEW_CHARS = 60;

/** End time of a clipped period; the next day's midnight reads as "24:00". */
function endTime(endedAt: string, timeZone: string, day?: DayBounds): string {
  const end = new Date(endedAt);
  if (day && end.getTime() >= day.end.getTime()) return '24:00';
  return formatTime(end, timeZone);
}

/**
 * One offline-period row → event:
 * "Offline since 14:02" (ongoing), "Device restarted, offline 2 min", or
 * "Offline 03:10–03:52 (42 min)".
 */
export function offlinePeriodEvent(row: OfflinePeriodRow, timeZone: string, day?: DayBounds): TimelineEvent {
  const at = new Date(row.started_at);
  const start = formatTime(at, timeZone);
  if (row.ongoing || row.ended_at == null) {
    return { kind: 'offline_ongoing', at, text: `Offline since ${start}` };
  }
  if (row.cause === 'device_restart') {
    return { kind: 'restart', at, text: `Device restarted, offline ${formatDuration(row.duration_s)}` };
  }
  return {
    kind: 'offline',
    at,
    text: `Offline ${start}–${endTime(row.ended_at, timeZone, day)} (${formatDuration(row.duration_s)})`,
  };
}

function extremumValue(e: Extremum & { value: number }): string {
  switch (e.kind) {
    case 'temperature_max':
      return `Temperature peaked at ${formatMetric('temperature', e.value)}`;
    case 'light_max':
      return `Light peaked at ${formatMetric('light', e.value)}`;
    case 'humidity_min':
      return `Humidity dropped to ${formatMetric('humidity', e.value)}`;
    case 'soil_driest':
      return e.soilPct == null
        ? `Soil was driest at ${formatSoilRaw(e.value)}`
        : `Soil was driest at ${formatMetric('soil', e.soilPct)}`;
  }
}

/** A daily extremum → "Temperature peaked at 24.6 °C · 14:20"; null when there is no value. */
export function extremumEvent(e: Extremum, timeZone: string): TimelineEvent | null {
  if (e.value == null) return null;
  const text = extremumValue({ ...e, value: e.value });
  if (e.at == null) return { kind: e.kind, at: null, text };
  const at = new Date(e.at);
  return { kind: e.kind, at, text: `${text} · ${formatTime(at, timeZone)}` };
}

function inDay(t: Date, day: DayBounds): boolean {
  return t.getTime() >= day.start.getTime() && t.getTime() < day.end.getTime();
}

/** "Soil sensor calibrated" when `soil_calibrated_at` falls on this day. */
export function calibrationEvent(calibratedAt: string | null | undefined, day: DayBounds): TimelineEvent | null {
  if (!calibratedAt) return null;
  const at = new Date(calibratedAt);
  return inDay(at, day) ? { kind: 'calibration', at, text: 'Soil sensor calibrated' } : null;
}

export type ChatMessageRef = { content: string; created_at: string };

/** "You asked Sparks: …" from the day's first user message. */
export function chatEvent(message: ChatMessageRef | null | undefined, plantName: string): TimelineEvent | null {
  if (!message) return null;
  return {
    kind: 'chat',
    at: new Date(message.created_at),
    text: `You asked ${plantName}: ${truncate(message.content, CHAT_PREVIEW_CHARS)}`,
  };
}

export type DayEventsInput = {
  timeZone: string;
  day: DayBounds;
  offlinePeriods?: readonly OfflinePeriodRow[];
  extrema?: readonly Extremum[];
  calibratedAt?: string | null;
  firstUserMessage?: ChatMessageRef | null;
  plantName: string;
};

/** All events for one local day, newest first; events without a time go last. */
export function buildDayEvents(input: DayEventsInput): TimelineEvent[] {
  const { timeZone, day } = input;
  const events: (TimelineEvent | null)[] = [
    ...(input.offlinePeriods ?? []).map((row) => offlinePeriodEvent(row, timeZone, day)),
    ...(input.extrema ?? []).map((e) => extremumEvent(e, timeZone)),
    calibrationEvent(input.calibratedAt, day),
    chatEvent(input.firstUserMessage, input.plantName),
  ];
  return events
    .filter((e): e is TimelineEvent => e != null)
    .map((e, i) => ({ e, i }))
    .sort((a, b) => {
      const ta = a.e.at?.getTime() ?? -Infinity;
      const tb = b.e.at?.getTime() ?? -Infinity;
      return tb - ta || a.i - b.i;
    })
    .map(({ e }) => e);
}
