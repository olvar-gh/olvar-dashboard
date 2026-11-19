import { formatLocalDate, formatNumber, formatTime } from '@/domain/format';
import type { TimelineEvent, TimelineEventKind } from '@/domain/timeline-events';
import { addDays, daysBetween, localDayBounds, oldestSelectableDate, type LocalDate } from '@/domain/time';
import type { DailyRow, HourlyRow } from '@/data';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parts(date: LocalDate) {
  const [y, m, d] = date.split('-').map(Number);
  return { y, m, d, weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

/** Weeks run Sunday to Saturday, as in the Figma frames (Sun 1 – Sat 7). */
export function weekStartOf(date: LocalDate): LocalDate {
  return addDays(date, -parts(date).weekday);
}

export function weekDates(weekStart: LocalDate): LocalDate[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/** "Nov 1 – Nov 7, 2026" (desktop) or "Nov 1 – 7, 2026" (iPhone large-title subtitle). */
export function weekLabel(weekStart: LocalDate, compact = false): string {
  const end = addDays(weekStart, 6);
  const a = parts(weekStart);
  const b = parts(end);
  const tail = compact && a.m === b.m ? `${b.d}` : formatLocalDate(end);
  const head = a.y === b.y ? formatLocalDate(weekStart) : formatLocalDate(weekStart, true);
  return `${head} – ${tail}, ${b.y}`;
}

export type WeekNav = {
  weekStart: LocalDate;
  /** Days of the week that can be shown: not in the future and inside the 90-day raw retention. */
  days: LocalDate[];
  isCurrent: boolean;
  canPrev: boolean;
  canNext: boolean;
};

export function weekNav(weekStart: LocalDate, today: LocalDate, timeZone: string, now: Date): WeekNav {
  const oldest = oldestSelectableDate(timeZone, now);
  const currentStart = weekStartOf(today);
  return {
    weekStart,
    days: weekDates(weekStart).filter((d) => d <= today && d >= oldest),
    isCurrent: weekStart === currentStart,
    canPrev: addDays(weekStart, -1) >= oldest,
    canNext: weekStart < currentStart,
  };
}

/** Clamps a requested week to the selectable range (a week that holds at least one selectable day). */
export function clampWeek(weekStart: LocalDate, today: LocalDate, timeZone: string, now: Date): LocalDate {
  const currentStart = weekStartOf(today);
  if (weekStart > currentStart) return currentStart;
  const oldestStart = weekStartOf(oldestSelectableDate(timeZone, now));
  return weekStart < oldestStart ? oldestStart : weekStart;
}

/** Desktop day header: "TODAY · SAT, NOV 7", "YESTERDAY · FRI, NOV 6", "THU, NOV 5". */
export function dayHeading(date: LocalDate, today: LocalDate): string {
  const { weekday } = parts(date);
  const base = `${WEEKDAYS[weekday].slice(0, 3)}, ${formatLocalDate(date)}`.toUpperCase();
  const ago = daysBetween(date, today);
  if (ago === 0) return `TODAY · ${base}`;
  if (ago === 1) return `YESTERDAY · ${base}`;
  return base;
}

/** iPhone section title: "Today", "Yesterday", "Thursday, Nov 5". */
export function daySectionTitle(date: LocalDate, today: LocalDate): string {
  const ago = daysBetween(date, today);
  if (ago === 0) return 'Today';
  if (ago === 1) return 'Yesterday';
  return `${WEEKDAYS[parts(date).weekday]}, ${formatLocalDate(date)}`;
}

/** Week strip letter and day of month: { letter: 'S', day: 1 }. */
export function stripDay(date: LocalDate): { letter: string; day: number } {
  const { d, weekday } = parts(date);
  return { letter: WEEKDAYS[weekday][0], day: d };
}

export function monthTitle(year: number, month: number): string {
  return `${MONTHS[month - 1]} ${year}`;
}

export type EventCategory = 'sensor' | 'device' | 'care' | 'sparks';

export function eventCategory(kind: TimelineEventKind): EventCategory {
  switch (kind) {
    case 'offline':
    case 'restart':
    case 'offline_ongoing':
      return 'device';
    case 'calibration':
      return 'care';
    case 'chat':
      return 'sparks';
    default:
      return 'sensor';
  }
}

const DETAILS: Record<TimelineEventKind, string> = {
  offline: 'No readings reached the Raspberry Pi 3B over Wi-Fi/MQTT',
  restart: 'The ESP32 rebooted and reconnected to the gateway',
  offline_ongoing: 'No reading for over 3 min (updates every 60 s)',
  temperature_max: 'Warmest reading of the day',
  light_max: 'Brightest reading of the day',
  humidity_min: 'Driest air of the day',
  soil_driest: 'Driest soil reading of the day',
  calibration: 'Dry and wet points saved for the soil probe',
  chat: 'First message of the day in Chat',
};

export type EventRow = {
  key: string;
  kind: TimelineEventKind;
  category: EventCategory;
  /** HH:mm in the plant time zone, or null for an extremum without a raw match. */
  time: string | null;
  title: string;
  detail: string;
};

/**
 * Splits the domain text into the Figma row parts: the time sits in its own column on desktop
 * and in the subtitle on iPhone, so the trailing "· HH:mm" of extremum text is dropped.
 */
export function eventRow(event: TimelineEvent, timeZone: string, index: number): EventRow {
  const time = event.at ? formatTime(event.at, timeZone) : null;
  const suffix = time ? ` · ${time}` : null;
  const title = suffix && event.text.endsWith(suffix) ? event.text.slice(0, -suffix.length) : event.text;
  return {
    key: `${event.kind}-${event.at?.getTime() ?? 'na'}-${index}`,
    kind: event.kind,
    category: eventCategory(event.kind),
    time,
    title,
    detail: DETAILS[event.kind],
  };
}

export type ChartSeries = { soil: { t: string; v: number | null }[]; temperature: { t: string; v: number | null }[] };

/** Hourly buckets → the "This week" series, plotted at the middle of each hour. */
export function weekSeries(rows: readonly HourlyRow[]): ChartSeries {
  const mid = (bucket: string) => new Date(Date.parse(bucket) + 30 * 60_000).toISOString();
  return {
    soil: rows.map((r) => ({ t: mid(r.bucket), v: r.soil_pct_avg })),
    temperature: rows.map((r) => ({ t: mid(r.bucket), v: r.temperature_c_avg })),
  };
}

export type SummaryMetric = 'soil' | 'temperature' | 'humidity' | 'light';

export type SummaryStat = {
  metric: SummaryMetric;
  label: string;
  /** Formatted average, or "-" when the week has no readings for it. */
  value: string;
  /** Change against the previous week, e.g. "−4%", "+0.6 °C"; null when either week has no data. */
  delta: string | null;
  average: number | null;
};

type AvgCol = 'soil_pct_avg' | 'temperature_c_avg' | 'humidity_pct_avg' | 'lux_avg';
type CountCol = 'soil_raw_n' | 'temperature_c_n' | 'humidity_pct_n' | 'lux_n';

const METRICS: { metric: SummaryMetric; label: string; avg: AvgCol; n: CountCol; decimals: number; unit: string }[] = [
  { metric: 'soil', label: 'Avg. soil moisture', avg: 'soil_pct_avg', n: 'soil_raw_n', decimals: 0, unit: '%' },
  { metric: 'temperature', label: 'Avg. temperature', avg: 'temperature_c_avg', n: 'temperature_c_n', decimals: 1, unit: ' °C' },
  { metric: 'humidity', label: 'Avg. humidity', avg: 'humidity_pct_avg', n: 'humidity_pct_n', decimals: 0, unit: '%' },
  { metric: 'light', label: 'Avg. light', avg: 'lux_avg', n: 'lux_n', decimals: 0, unit: ' lux' },
];

/** `sum(avg · n) / sum(n)` over the days (PLAN §5.5); days without the metric are skipped. */
export function weightedAverage(rows: readonly DailyRow[], avg: AvgCol, n: CountCol): number | null {
  let sum = 0;
  let count = 0;
  for (const r of rows) {
    const v = r[avg];
    const k = r[n];
    if (v == null || !k) continue;
    sum += v * k;
    count += k;
  }
  return count ? sum / count : null;
}

function signed(v: number, decimals: number, unit: string): string {
  const rounded = Number(v.toFixed(decimals));
  const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : '±';
  return `${sign}${formatNumber(Math.abs(rounded), decimals)}${unit}`;
}

/** Week summary from `readings_daily_v` rows of this week and the previous week. */
export function weekSummary(rows: readonly DailyRow[], weekStart: LocalDate): SummaryStat[] {
  const prevStart = addDays(weekStart, -7);
  const current = rows.filter((r) => r.bucket >= weekStart && r.bucket < addDays(weekStart, 7));
  const previous = rows.filter((r) => r.bucket >= prevStart && r.bucket < weekStart);
  return METRICS.map((m) => {
    const now = weightedAverage(current, m.avg, m.n);
    const before = weightedAverage(previous, m.avg, m.n);
    return {
      metric: m.metric,
      label: m.label,
      average: now,
      value: now == null ? '-' : `${formatNumber(now, m.decimals)}${m.unit}`,
      delta: now == null || before == null ? null : signed(now - before, m.decimals, m.unit),
    };
  });
}

/** Instant bounds of a week: local midnight of its Sunday to the next Sunday. */
export function weekBounds(weekStart: LocalDate, timeZone: string): { from: Date; to: Date } {
  return { from: localDayBounds(timeZone, weekStart).start, to: localDayBounds(timeZone, addDays(weekStart, 6)).end };
}

const HOUR_MS = 3_600_000;

/**
 * The `readings_hourly_v` window for a week. Buckets are UTC hours, so in a :30/:45 time zone
 * the week starts inside a bucket; the window starts at that bucket so its first hour is kept.
 */
export function hourlyWindow(weekStart: LocalDate, timeZone: string): { from: Date; to: Date } {
  const { from, to } = weekBounds(weekStart, timeZone);
  return { from: new Date(Math.floor(from.getTime() / HOUR_MS) * HOUR_MS), to };
}
