import { useQuery } from '@tanstack/react-query';

import { useDataSource } from '../context';
import { keys } from '../keys';
import { useDevice } from './device';

const HOUR_MS = 3_600_000;
// Rollups run hourly at :05, so these change at most once an hour.
const ROLLUP_STALE_MS = 5 * 60_000;

/** Hourly rollups of the last `days` days (7 d / 30 d charts), oldest first. */
export function useHourly(days: 7 | 30) {
  const source = useDataSource();
  const deviceId = useDevice().data?.id;
  return useQuery({
    queryKey: keys.hourly(deviceId ?? '', `${days}d`),
    enabled: !!deviceId,
    staleTime: ROLLUP_STALE_MS,
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
    queryFn: () => source.getHourly(deviceId!, from, to),
  });
}

/** Daily rollups (local dates in the plant time zone) for `fromDate..toDate`, oldest first. */
export function useDaily(fromDate: string, toDate: string) {
  const source = useDataSource();
  const deviceId = useDevice().data?.id;
  return useQuery({
    queryKey: keys.daily(deviceId ?? '', fromDate, toDate),
    enabled: !!deviceId,
    staleTime: ROLLUP_STALE_MS,
    queryFn: () => source.getDaily(deviceId!, fromDate, toDate),
  });
}
