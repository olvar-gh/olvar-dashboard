import { useMemo, useState } from 'react';

import { targetBand, useDaily, useDayEvents, useHourlyBetween, useNow, usePlant, usePlantStatus, useThresholds } from '@/data';
import { formatTime } from '@/domain/format';
import { addDays, localDate, type LocalDate } from '@/domain/time';

import { clampWeek, eventRow, weekBounds, weekNav, weekSeries, weekStartOf, weekSummary, type EventRow } from './week';

const CLOCK_MS = 60_000;

/** Selected week and its navigation, kept inside the 90-day history and never past today. */
export function useWeekSelection(timeZone: string) {
  const now = useNow(CLOCK_MS);
  const today = localDate(timeZone, now);
  const [requested, setRequested] = useState<LocalDate | null>(null);
  const weekStart = clampWeek(requested ?? weekStartOf(today), today, timeZone, now);
  const nav = weekNav(weekStart, today, timeZone, now);
  return {
    now,
    today,
    nav,
    prev: () => nav.canPrev && setRequested(addDays(weekStart, -7)),
    next: () => nav.canNext && setRequested(addDays(weekStart, 7)),
    thisWeek: () => setRequested(null),
    jumpTo: (date: LocalDate) => setRequested(weekStartOf(date)),
  };
}

/** "This week" chart data from `readings_hourly_v`, clipped to the local week. */
export function useWeekChart(weekStart: LocalDate, timeZone: string) {
  const { from, to } = useMemo(() => weekBounds(weekStart, timeZone), [weekStart, timeZone]);
  const hourly = useHourlyBetween(from, to);
  const thresholds = useThresholds();
  const series = useMemo(() => (hourly.data ? weekSeries(hourly.data) : null), [hourly.data]);
  const soilLow = targetBand(thresholds.data, 'soil_pct')?.min ?? null;
  return { query: hourly, series, soilLow };
}

/** Week summary: this week and the previous one from `readings_daily_v` in one query. */
export function useWeekSummary(weekStart: LocalDate) {
  const daily = useDaily(addDays(weekStart, -7), addDays(weekStart, 6));
  const stats = useMemo(() => (daily.data ? weekSummary(daily.data, weekStart) : null), [daily.data, weekStart]);
  return { query: daily, stats };
}

export type DayActivity = {
  rows: EventRow[] | undefined;
  isPending: boolean;
  error: Error | null;
  refetch: () => void;
};

export function useDayActivity(date: LocalDate, timeZone: string): DayActivity {
  const day = useDayEvents(date);
  const rows = useMemo(() => day.events?.map((e, i) => eventRow(e, timeZone, i)), [day.events, timeZone]);
  return { rows, isPending: day.isPending && !day.events, error: day.events ? null : day.error, refetch: day.refetch };
}

/** Offline banner text inputs: whether the device is offline now and since when (HH:mm). */
export function useOfflineState(timeZone: string | undefined) {
  const status = usePlantStatus();
  const display = status.display;
  const since = display?.offlineSince && timeZone ? formatTime(display.offlineSince, timeZone) : null;
  return {
    offline: display?.offline ?? false,
    since,
    noData: status.data?.overall === 'no_data',
  };
}

export function usePlantTimeZone() {
  const plant = usePlant();
  return { plant: plant.data ?? null, timeZone: plant.data?.timezone, query: plant };
}
