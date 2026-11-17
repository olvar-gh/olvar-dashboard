import { useQuery } from '@tanstack/react-query';

import { useDataSource } from '../context';
import { keys } from '../keys';
import { useDevice } from './device';
import { usePlant } from './plant';

const HOUR_MS = 3_600_000;
// Rollups run hourly at :05, so these change at most once an hour.
const ROLLUP_STALE_MS = 5 * 60_000;
/** Re-read a minute after the :05 rollup run, giving it time to finish. */
const ROLLUP_MINUTE = 6;

/** Delay until the next refresh after an hourly rollup run (UTC :06). */
export function msUntilNextRollup(now: Date): number {
  const next = new Date(now);
  next.setUTCMinutes(ROLLUP_MINUTE, 0, 0);
  if (next.getTime() <= now.getTime()) next.setTime(next.getTime() + HOUR_MS);
  return next.getTime() - now.getTime();
}

const rollupRefetch = () => msUntilNextRollup(new Date());

/** Hourly rollups of the last `days` days (7 d / 30 d charts), oldest first. */
export function useHourly(days: 7 | 30) {
  const source = useDataSource();
  const deviceId = useDevice().data?.id;
  return useQuery({
    queryKey: keys.hourly(deviceId ?? '', `${days}d`),
    enabled: !!deviceId,
    staleTime: ROLLUP_STALE_MS,
    refetchInterval: rollupRefetch,
    queryFn: async () => {
      const to = new Date();
      const from = new Date(Math.floor((to.getTime() - days * 24 * HOUR_MS) / HOUR_MS) * HOUR_MS);
      return { from, to, rows: await source.getHourly(deviceId!, from, to) };
    },
  });
}

/** Hourly rollups between two instants, e.g. a Timeline week. */
export function useHourlyBetween(from: Date, to: Date) {
  const source = useDataSource();
  const deviceId = useDevice().data?.id;
  return useQuery({
    queryKey: keys.hourly(deviceId ?? '', `${from.toISOString()}/${to.toISOString()}`),
    enabled: !!deviceId,
    staleTime: ROLLUP_STALE_MS,
    refetchInterval: rollupRefetch,
    queryFn: () => source.getHourly(deviceId!, from, to),
  });
}

/** Daily rollups (local dates in the plant time zone) for `fromDate..toDate`, oldest first. */
export function useDaily(fromDate: string, toDate: string) {
  const source = useDataSource();
  const deviceId = useDevice().data?.id;
  const timeZone = usePlant().data?.timezone;
  return useQuery({
    queryKey: keys.daily(deviceId ?? '', fromDate, toDate, timeZone ?? ''),
    enabled: !!deviceId && !!timeZone,
    staleTime: ROLLUP_STALE_MS,
    refetchInterval: rollupRefetch,
    queryFn: () => source.getDaily(deviceId!, fromDate, toDate),
  });
}
