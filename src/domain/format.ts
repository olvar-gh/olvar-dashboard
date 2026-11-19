// Display formatting. Pure, locale fixed to en-US to match the designs.

import { localDate, type LocalDate } from './time';

export const EMPTY_VALUE = '-';

export type Metric = 'temperature' | 'humidity' | 'light' | 'soil';

const timeFormatters = new Map<string, Intl.DateTimeFormat>();

/** `HH:mm` (24 h) in the plant time zone. */
export function formatTime(t: Date | string, timeZone: string): string {
  let f = timeFormatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', hour: '2-digit', minute: '2-digit' });
    timeFormatters.set(timeZone, f);
  }
  return f.format(new Date(t));
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Nov 5", or "Nov 5, 2025" when `withYear` is set. */
export function formatLocalDate(date: LocalDate, withYear = false): string {
  const [y, m, d] = date.split('-').map(Number);
  const base = `${MONTHS[m - 1]} ${d}`;
  return withYear ? `${base}, ${y}` : base;
}

/** "Nov 5" for an instant, as a date in the plant time zone. */
export function formatShortDate(t: Date | string, timeZone: string): string {
  return formatLocalDate(localDate(timeZone, t));
}

/** Thousands separators and a fixed number of decimals: 1560 → "1,560". */
export function formatNumber(v: number, decimals = 0): string {
  return v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** Sensor value with its unit; null (read failed / no data) → "-". */
export function formatMetric(metric: Metric, v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return EMPTY_VALUE;
  switch (metric) {
    case 'temperature':
      return `${formatNumber(v, 1)} °C`;
    case 'light':
      return `${formatNumber(v)} lux`;
    case 'humidity':
    case 'soil':
      return `${formatNumber(v)} %`;
  }
}

/** Raw soil ADC value: 2410 → "raw 2,410". */
export function formatSoilRaw(v: number | null | undefined): string {
  return v == null ? EMPTY_VALUE : `raw ${formatNumber(v)}`;
}

/** Duration in whole minutes, at least 1: "42 min", "1 h 5 min", "2 h". */
export function formatDuration(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** Elapsed time for "Updated N s ago" / footer ages: "12 s ago", "3 min ago", "2 h ago", "3 d ago". */
export function formatAge(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  if (s < 60) return `${s} s ago`;
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86_400)} d ago`;
}

/** Seconds from `from` to `now` (negative when `from` is in the future). */
export function secondsSince(from: Date | string, now: Date): number {
  return (now.getTime() - new Date(from).getTime()) / 1000;
}

/** Shorten text to `max` characters with an ellipsis. */
export function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}
