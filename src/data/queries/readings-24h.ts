import { useQuery } from '@tanstack/react-query';

import { localDayBounds, type LocalDate } from '@/domain/time';
import { useDataSource } from '../context';
import { keys } from '../keys';
import { useDevice } from './device';
import { usePlant } from './plant';

const WINDOW_MS = 24 * 3_600_000;

/** Every raw reading of the last 24 h (≈1,440 rows, paginated), oldest first. */
export function useReadings24h() {
  const source = useDataSource();
  const deviceId = useDevice().data?.id;
  return useQuery({
    queryKey: keys.readings24h(deviceId ?? ''),
    enabled: !!deviceId,
    queryFn: async () => {
      const to = new Date();
      const rows = await source.getReadings(deviceId!, new Date(to.getTime() - WINDOW_MS), to);
      return { from: new Date(to.getTime() - WINDOW_MS), to, rows };
    },
  });
}

/**
 * Every raw reading of one local day in the plant time zone, up to now (23–25 h on DST days, so
 * the last 24 h can miss its first hour), oldest first.
 */
export function useDayReadings(date: LocalDate) {
  const source = useDataSource();
  const deviceId = useDevice().data?.id;
  const timeZone = usePlant().data?.timezone;
  return useQuery({
    queryKey: keys.readingsDay(deviceId ?? '', date, timeZone ?? ''),
    enabled: !!deviceId && !!timeZone,
    queryFn: async () => {
      const { start, end } = localDayBounds(timeZone!, date);
      const to = new Date(Math.min(Date.now(), end.getTime()));
      return { from: start, to, rows: await source.getReadings(deviceId!, start, to) };
    },
  });
}
