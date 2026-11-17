import { useQuery } from '@tanstack/react-query';

import { buildDayEvents, type TimelineEvent } from '@/domain/timeline-events';
import { localDate, localDayBounds } from '@/domain/time';
import { useDataSource } from '../context';
import { keys, type DayPart } from '../keys';
import { useDevice } from './device';
import { fetchDayExtrema } from './extrema';
import { usePlant } from './plant';

/** The daily row for a day exists only after the next hourly rollup run (:05), so read raw until then. */
const DAILY_ROLLUP_LAG_MS = 2 * 3_600_000;

/**
 * Shared shape of the per-(device, local date) queries. The window ends at the fetch time while
 * the day is still running (refetched by the freshness triggers, and once more after midnight by
 * `useLiveUpdates`); a completed day is immutable.
 */
function useDayQuery<T>(date: string, part: DayPart, fetch: (ctx: DayContext) => Promise<T>) {
  const source = useDataSource();
  const plant = usePlant().data;
  const device = useDevice().data;
  const timeZone = plant?.timezone;
  const isToday = timeZone != null && date === localDate(timeZone, new Date());
  return useQuery({
    queryKey: keys.day(device?.id ?? '', date, part, timeZone ?? ''),
    enabled: !!device && !!plant,
    staleTime: isToday ? 0 : Infinity,
    queryFn: () => {
      const now = new Date();
      const bounds = localDayBounds(timeZone!, date);
      const end = new Date(Math.min(now.getTime(), bounds.end.getTime()));
      const fromRaw = now.getTime() < bounds.end.getTime() + DAILY_ROLLUP_LAG_MS;
      return fetch({ source, deviceId: device!.id, plantId: plant!.id, timeZone: timeZone!, start: bounds.start, end, fromRaw, now });
    },
  });
}

type DayContext = {
  source: ReturnType<typeof useDataSource>;
  deviceId: string;
  plantId: string;
  timeZone: string;
  start: Date;
  /** Day end, or the fetch time while the day is running (the advancing `dayEnd`). */
  end: Date;
  /** The daily rollup row may not cover the day yet. */
  fromRaw: boolean;
  now: Date;
};

/** `device_offline_periods()` for one local day: one call per day keeps far under the 7-day cap. */
export function useOfflinePeriods(date: string) {
  return useDayQuery(date, 'offline', (c) => c.source.getOfflinePeriods(c.deviceId, c.start, c.end));
}

export function useDayExtrema(date: string) {
  return useDayQuery(date, 'extrema', (c) => fetchDayExtrema(c.source, c.deviceId, c.timeZone, date, c.fromRaw, c.now));
}

/** The day's first user message, for "You asked Sparks: …". */
export function useFirstUserMessage(date: string) {
  return useDayQuery(date, 'chat', (c) => c.source.getFirstUserMessage(c.plantId, c.start, c.end));
}

/** Activity events for one local day (Timeline groups, Home "Today's timeline"), newest first. */
export function useDayEvents(date: string): {
  events: TimelineEvent[] | undefined;
  isPending: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const plant = usePlant().data;
  const device = useDevice().data;
  const offline = useOfflinePeriods(date);
  const extrema = useDayExtrema(date);
  const chat = useFirstUserMessage(date);
  const parts = [offline, extrema, chat];
  const ready = plant && offline.data && extrema.data && chat.data !== undefined;
  return {
    events: ready
      ? buildDayEvents({
          timeZone: plant.timezone,
          day: localDayBounds(plant.timezone, date),
          offlinePeriods: offline.data,
          extrema: extrema.data,
          calibratedAt: device?.soil_calibrated_at,
          firstUserMessage: chat.data,
          plantName: plant.nickname,
        })
      : undefined,
    isPending: parts.some((p) => p.isPending),
    error: parts.find((p) => p.error)?.error ?? null,
    refetch: () => parts.forEach((p) => void p.refetch()),
  };
}
