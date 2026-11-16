// Plant-time-zone helpers. Every "local" date here is a calendar date in the
// plant's IANA time zone (`plants.timezone`), written as `YYYY-MM-DD`.

export type LocalDate = string;

export type DayBounds = {
  /** First instant of the local day. */
  start: Date;
  /** First instant of the next local day (exclusive). */
  end: Date;
  /** Length of the day in hours: 24, or 23 / 25 on DST days. */
  hours: number;
};

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

/** Raw history is kept for 90 days (gateway retention). */
export const RETENTION_DAYS = 90;

const formatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(timeZone, f);
  }
  return f;
}

type Wall = { year: number; month: number; day: number; hour: number; minute: number; second: number };

function wallClock(timeZone: string, t: number): Wall {
  const out: Record<string, number> = {};
  for (const p of partsFormatter(timeZone).formatToParts(new Date(t))) {
    if (p.type !== 'literal') out[p.type] = Number(p.value);
  }
  return out as Wall;
}

function pad(n: number, width = 2): string {
  return String(n).padStart(width, '0');
}

function toInstant(t: Date | string | number): number {
  return typeof t === 'number' ? t : new Date(t).getTime();
}

/** UTC offset of `timeZone` at instant `t`, in milliseconds (east of UTC is positive). */
export function tzOffsetMs(timeZone: string, t: Date | string | number): number {
  const ms = toInstant(t);
  const w = wallClock(timeZone, ms);
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  return asUtc - (ms - (((ms % 1000) + 1000) % 1000));
}

/** The local calendar date of instant `t` in `timeZone`. */
export function localDate(timeZone: string, t: Date | string | number): LocalDate {
  const w = wallClock(timeZone, toInstant(t));
  return `${pad(w.year, 4)}-${pad(w.month)}-${pad(w.day)}`;
}

function parseLocalDate(date: LocalDate): [number, number, number] {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) throw new Error(`Invalid local date: ${date}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** Calendar arithmetic on a local date (no time zone involved). */
export function addDays(date: LocalDate, days: number): LocalDate {
  const [y, m, d] = parseLocalDate(date);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${pad(t.getUTCFullYear(), 4)}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** Whole days from `a` to `b` (b − a). */
export function daysBetween(a: LocalDate, b: LocalDate): number {
  const [ay, am, ad] = parseLocalDate(a);
  const [by, bm, bd] = parseLocalDate(b);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / DAY_MS);
}

/**
 * First instant of `date` in `timeZone`. Usually local midnight; when a DST gap
 * skips midnight it is the transition instant (for example 01:00).
 */
export function startOfLocalDay(timeZone: string, date: LocalDate): Date {
  const [y, m, d] = parseLocalDate(date);
  const utcMidnight = Date.UTC(y, m - 1, d);
  // The offset at local midnight is the offset either a day before or a day
  // after; try both and keep the earliest instant that falls on `date`.
  const candidates = [
    utcMidnight - tzOffsetMs(timeZone, utcMidnight - DAY_MS),
    utcMidnight - tzOffsetMs(timeZone, utcMidnight + DAY_MS),
  ]
    .filter((t) => localDate(timeZone, t) === date)
    .sort((a, b) => a - b);
  return new Date(candidates[0]);
}

/** Local-midnight bounds of `date` in `timeZone` (23 h / 25 h on DST days). */
export function localDayBounds(timeZone: string, date: LocalDate): DayBounds {
  const start = startOfLocalDay(timeZone, date);
  const end = startOfLocalDay(timeZone, addDays(date, 1));
  return { start, end, hours: (end.getTime() - start.getTime()) / HOUR_MS };
}

/** Today's window for live queries: from local midnight up to `now`. */
export function todayWindow(timeZone: string, now: Date): { date: LocalDate; start: Date; end: Date } {
  const date = localDate(timeZone, now);
  return { date, start: startOfLocalDay(timeZone, date), end: now };
}

/** Oldest local date still inside the 90-day raw retention. */
export function oldestSelectableDate(timeZone: string, now: Date): LocalDate {
  return localDate(timeZone, now.getTime() - RETENTION_DAYS * DAY_MS);
}

/** Whether a local date can be selected in the Timeline (not in the future, not past retention). */
export function isSelectableDate(timeZone: string, date: LocalDate, now: Date): boolean {
  return date >= oldestSelectableDate(timeZone, now) && date <= localDate(timeZone, now);
}
