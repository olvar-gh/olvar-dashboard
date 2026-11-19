// Pure chart maths: series cleanup, value domains, ticks in the plant time zone.
// Charts never judge values; bands and thresholds are numbers handed in by the screen.

import { formatLocalDate, formatTime } from '@/domain/format';
import { addDays, localDate, startOfLocalDay, tzOffsetMs, type LocalDate } from '@/domain/time';

export type SeriesPoint = { t: Date | string | number; v: number | null };
export type Point = { t: number; v: number | null };
export type DefinedPoint = { t: number; v: number };
export type TimeDomain = readonly [number, number];
export type Band = { min: number; max: number };
export type Tick = { t: number; label: string };

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const QUARTER_MS = 15 * MINUTE_MS;

export function toMs(t: Date | string | number): number {
  return typeof t === 'number' ? t : new Date(t).getTime();
}

/**
 * Sorted points with numeric times. Non-finite values become null, and points
 * outside `domain` are dropped.
 */
export function normalizeSeries(data: readonly SeriesPoint[], domain?: TimeDomain): Point[] {
  const out: Point[] = [];
  for (const p of data) {
    const t = toMs(p.t);
    if (!Number.isFinite(t)) continue;
    if (domain && (t < domain[0] || t > domain[1])) continue;
    out.push({ t, v: p.v != null && Number.isFinite(p.v) ? p.v : null });
  }
  return out.sort((a, b) => a.t - b.t);
}

/**
 * Runs of consecutive non-null points. A null value (read failed) always breaks
 * the line; `maxGapMs` also breaks it where two readings are further apart.
 */
export function splitSegments(points: readonly Point[], maxGapMs?: number): DefinedPoint[][] {
  const segments: DefinedPoint[][] = [];
  let current: DefinedPoint[] = [];
  for (const p of points) {
    const prev = current[current.length - 1];
    if (p.v == null || (prev && maxGapMs !== undefined && p.t - prev.t > maxGapMs)) {
      if (current.length) segments.push(current);
      current = p.v == null ? [] : [{ t: p.t, v: p.v }];
      continue;
    }
    current.push({ t: p.t, v: p.v });
  }
  if (current.length) segments.push(current);
  return segments;
}

/** The newest point, if it holds a value. A failed latest read gets no marker. */
export function latestDefined(points: readonly Point[]): DefinedPoint | null {
  const last = points[points.length - 1];
  return last && last.v != null ? { t: last.t, v: last.v } : null;
}

export function definedValues(points: readonly Point[]): number[] {
  const out: number[] = [];
  for (const p of points) if (p.v != null) out.push(p.v);
  return out;
}

const NICE_STEPS = [1, 2, 2.5, 4, 5, 10];

function niceStepAtLeast(raw: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  for (const s of NICE_STEPS) if (s * magnitude >= raw - 1e-9) return s * magnitude;
  return 10 * magnitude;
}

export type ValueDomainOptions = {
  /** Number of evenly spaced gridlines, ends included. */
  ticks?: number;
  /** Extra values that must be visible (band edges, thresholds). */
  include?: readonly (number | null | undefined)[];
  /** Lowest allowed value, for example 0 for lux or soil %. */
  floor?: number;
  /** Highest allowed value, for example 100 for %. */
  ceil?: number;
  /** Domain used when there is nothing to show. */
  fallback?: readonly [number, number];
};

export type ValueDomain = { domain: [number, number]; ticks: number[] };

/** A domain split into `ticks − 1` equal, round steps that covers every value and stays within floor/ceil. */
export function valueDomain(values: readonly number[], opts: ValueDomainOptions = {}): ValueDomain {
  const count = Math.max(2, opts.ticks ?? 5);
  const all = [...values, ...(opts.include ?? [])].filter(
    (v): v is number => typeof v === 'number' && Number.isFinite(v),
  );
  let [lo, hi] = all.length ? [Math.min(...all), Math.max(...all)] : opts.fallback ?? [0, 100];
  if (hi - lo < 1e-9) {
    const pad = Math.max(1, Math.abs(lo) * 0.1);
    lo -= pad;
    hi += pad;
  }
  if (opts.floor !== undefined) lo = Math.max(lo, opts.floor);
  if (opts.ceil !== undefined) hi = Math.min(hi, opts.ceil);

  let step = niceStepAtLeast((hi - lo) / (count - 1));
  let start = Math.floor(lo / step + 1e-9) * step;
  if (opts.floor !== undefined && start < opts.floor) start = opts.floor;
  while (start + step * (count - 1) < hi - 1e-9) {
    step = niceStepAtLeast(step * 1.0001);
    start = Math.floor(lo / step + 1e-9) * step;
    if (opts.floor !== undefined && start < opts.floor) start = opts.floor;
  }
  if (opts.ceil !== undefined && start + step * (count - 1) > opts.ceil) {
    start = opts.ceil - step * (count - 1);
    if (opts.floor !== undefined && start < opts.floor) {
      start = opts.floor;
      step = (opts.ceil - opts.floor) / (count - 1);
    }
  }
  const ticks = Array.from({ length: count }, (_, i) => round(start + step * i));
  return { domain: [ticks[0], ticks[count - 1]], ticks };
}

function round(v: number): number {
  return Math.round(v * 1e6) / 1e6;
}

/** Axis label: 1600 → "1.6k", 12.5 → "12.5", 20 → "20". */
export function formatTick(v: number): string {
  if (Math.abs(v) >= 1000) return `${trim(v / 1000)}k`;
  return trim(v);
}

function trim(v: number): string {
  return String(Math.round(v * 10) / 10);
}

/** Local wall-clock milliseconds since the epoch (UTC fields read as local time). */
function wallMs(timeZone: string, t: number): number {
  return t + tzOffsetMs(timeZone, t);
}

/**
 * Start of the plant-local clock hour holding `t`. Unlike flooring to UTC hours this
 * matches the local clock in :30/:45 zones, and the repeated hour of a fall-back
 * day stays two separate hours. When the offset changes inside the hour (for example
 * Lord Howe's 30-minute DST shift) the hour after the change starts at the change.
 */
export function localHourStart(t: number, timeZone: string): number {
  const offset = tzOffsetMs(timeZone, t);
  const naive = t - ((((t + offset) % HOUR_MS) + HOUR_MS) % HOUR_MS);
  if (tzOffsetMs(timeZone, naive) === offset) return naive;
  return offsetChange(naive, t, timeZone);
}

/** Start of the plant-local clock hour after the one starting at `start` (see `localHourStart`). */
export function nextLocalHourStart(start: number, timeZone: string): number {
  const offset = tzOffsetMs(timeZone, start);
  const naive = start + HOUR_MS - ((((start + offset) % HOUR_MS) + HOUR_MS) % HOUR_MS);
  if (tzOffsetMs(timeZone, naive) === offset) return naive;
  return offsetChange(start, naive, timeZone);
}

/** First quarter-hour instant in `(from, to]` whose offset is the one at `to` (offsets change on quarter hours). */
function offsetChange(from: number, to: number, timeZone: string): number {
  const offset = tzOffsetMs(timeZone, to);
  let t = Math.floor(to / QUARTER_MS) * QUARTER_MS;
  while (t - QUARTER_MS > from && tzOffsetMs(timeZone, t - QUARTER_MS) === offset) t -= QUARTER_MS;
  return t;
}

/**
 * Instants inside `domain` where the plant-local clock shows a whole hour that
 * is a multiple of `everyHours`. Works for :30/:45 offsets and DST days; a
 * repeated hour on the fall-back day is labelled once.
 */
export function hourTicks(domain: TimeDomain, timeZone: string, everyHours: number): Tick[] {
  const quarter = 15 * MINUTE_MS;
  const out: Tick[] = [];
  const seen = new Set<string>();
  for (let t = Math.ceil(domain[0] / quarter) * quarter; t <= domain[1]; t += quarter) {
    const wall = wallMs(timeZone, t);
    if (wall % HOUR_MS !== 0) continue;
    const hour = new Date(wall).getUTCHours();
    if (hour % everyHours !== 0) continue;
    const label = formatTime(new Date(t), timeZone);
    const key = `${localDate(timeZone, t)} ${label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ t, label });
  }
  return out;
}

/**
 * Local midnights inside `domain`, every `everyDays` days from the first one,
 * labelled "Nov 5".
 */
export function dayTicks(domain: TimeDomain, timeZone: string, everyDays = 1): Tick[] {
  const out: Tick[] = [];
  const last = localDate(timeZone, domain[1]);
  let i = 0;
  for (let d: LocalDate = localDate(timeZone, domain[0]); d <= last; d = addDays(d, 1)) {
    const t = startOfLocalDay(timeZone, d).getTime();
    if (t < domain[0]) continue;
    if (i++ % everyDays === 0) out.push({ t, label: formatLocalDate(d) });
  }
  return out;
}

const HOUR_STEPS = [1, 2, 3, 6, 12];
const DAY_STEPS = [1, 2, 7, 14];
// "Nov 12" is about 34 px wide, so date labels need far less room than the hour default.
const DAY_MIN_SPACING = 72;

/**
 * Time-axis ticks for a plot `width` pixels wide: hours for spans up to 36 h,
 * otherwise days, spaced at least `minSpacing` pixels apart.
 */
export function timeTicks(domain: TimeDomain, timeZone: string, width: number, minSpacing = 120): Tick[] {
  const span = domain[1] - domain[0];
  if (span <= 0 || width <= 0) return [];
  const pxPerMs = width / span;
  if (span <= 36 * HOUR_MS) {
    const every = HOUR_STEPS.find((h) => h * HOUR_MS * pxPerMs >= minSpacing) ?? 24;
    return every === 24 ? dayTicks(domain, timeZone) : hourTicks(domain, timeZone, every);
  }
  const spacing = Math.min(minSpacing, DAY_MIN_SPACING);
  const every = DAY_STEPS.find((d) => d * 24 * HOUR_MS * pxPerMs >= spacing) ?? 28;
  return dayTicks(domain, timeZone, every);
}

export type WeekDay = { date: LocalDate; start: number; end: number; label: string };

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** The 7 local days from `weekStart`, with their real (23–25 h) bounds and "Sun 1" labels. */
export function weekDays(weekStart: LocalDate, timeZone: string): WeekDay[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const [y, m, d] = date.split('-').map(Number);
    const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
    return {
      date,
      start: startOfLocalDay(timeZone, date).getTime(),
      end: startOfLocalDay(timeZone, addDays(date, 1)).getTime(),
      label: `${weekday} ${d}`,
    };
  });
}

/** Linear map from `domain` onto `range`; a zero-width domain maps to the range start. */
export function linear(domain: readonly [number, number], range: readonly [number, number]) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  return (v: number) => r0 + (v - d0) * k;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Averages dense series into at most `maxPoints` time bins so the line follows
 * the pixel grid. A bin holding a failed read keeps a null point, so gaps
 * survive, and the newest point is kept exactly as read.
 */
export function downsample(points: readonly Point[], maxPoints: number): Point[] {
  if (points.length <= maxPoints || points.length < 3 || maxPoints < 2) return [...points];
  const last = points[points.length - 1];
  const body = points.slice(0, -1);
  const t0 = body[0].t;
  const span = Math.max(1, last.t - t0);
  const bins = maxPoints - 1;
  const sums = Array.from({ length: bins }, () => ({ t: 0, v: 0, n: 0, nullT: Number.NaN }));
  for (const p of body) {
    const bin = sums[Math.min(bins - 1, Math.floor(((p.t - t0) / span) * bins))];
    if (p.v == null) {
      if (Number.isNaN(bin.nullT)) bin.nullT = p.t;
    } else {
      bin.t += p.t;
      bin.v += p.v;
      bin.n += 1;
    }
  }
  const out: Point[] = [];
  for (const b of sums) {
    if (b.n) out.push({ t: b.t / b.n, v: b.v / b.n });
    if (!Number.isNaN(b.nullT)) out.push({ t: b.nullT, v: null });
  }
  out.sort((a, b) => a.t - b.t);
  out.push(last);
  return out;
}

/**
 * Thins a run drawn as a step line without moving its jumps: each time bin keeps
 * its first reading, both readings either side of the biggest change (a
 * watering) and its last reading, all exactly as read. Averaging would turn a
 * jump into a ramp and move it to the bin's mean time.
 */
export function downsampleStep(points: readonly DefinedPoint[], maxPoints: number): DefinedPoint[] {
  if (points.length <= maxPoints || points.length < 3) return [...points];
  const bins = Math.max(1, Math.floor((maxPoints - 1) / 4));
  const last = points[points.length - 1];
  const t0 = points[0].t;
  const span = Math.max(1, last.t - t0);
  const out: DefinedPoint[] = [];
  let start = 0;
  for (let b = 0; b < bins && start < points.length - 1; b++) {
    const binEnd = t0 + (span * (b + 1)) / bins;
    let end = start;
    while (end + 1 < points.length - 1 && (b === bins - 1 || points[end + 1].t < binEnd)) end++;
    let jump = start;
    let biggest = -1;
    for (let i = Math.max(1, start); i <= end; i++) {
      const delta = Math.abs(points[i].v - points[i - 1].v);
      if (delta > biggest) {
        biggest = delta;
        jump = i;
      }
    }
    for (const i of new Set([start, Math.max(start, jump - 1), jump, end])) out.push(points[i]);
    start = end + 1;
  }
  out.push(last);
  return out;
}

/**
 * Splits on real gaps first, then thins each run to its share of `maxPoints`
 * by time span, so resizing never invents or hides an outage. Step runs keep
 * their jumps (downsampleStep).
 */
export function drawableSegments(
  points: readonly Point[],
  maxPoints: number,
  maxGapMs?: number,
  step = false,
): DefinedPoint[][] {
  const segments = splitSegments(points, maxGapMs);
  const first = segments[0]?.[0]?.t;
  const lastSeg = segments[segments.length - 1];
  const total = first === undefined ? 0 : lastSeg[lastSeg.length - 1].t - first;
  return segments.map((seg) => {
    const span = seg[seg.length - 1].t - seg[0].t;
    const budget = total > 0 ? Math.max(2, Math.ceil((maxPoints * span) / total)) : maxPoints;
    return step ? downsampleStep(seg, budget) : (downsample(seg, budget) as DefinedPoint[]);
  });
}
