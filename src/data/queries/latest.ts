import { useQuery } from '@tanstack/react-query';

import { useDataSource } from '../context';
import { keys } from '../keys';
import { useDevice } from './device';

/** The newest `limit` readings (newest first), re-read on every `readings` signal. */
export function useLatestReadings(limit: number) {
  const source = useDataSource();
  const deviceId = useDevice().data?.id;
  return useQuery({
    queryKey: keys.latest(deviceId ?? '', limit),
    enabled: !!deviceId,
    queryFn: () => source.getLatestReadings(deviceId!, limit),
  });
}

/** The latest `readings_v` row, or null before the first reading. */
export function useLatest() {
  const query = useLatestReadings(1);
  return { ...query, data: query.data === undefined ? undefined : (query.data[0] ?? null) };
}
