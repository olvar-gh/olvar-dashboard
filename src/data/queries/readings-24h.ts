import { useQuery } from '@tanstack/react-query';

import { useDataSource } from '../context';
import { keys } from '../keys';
import { useDevice } from './device';

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
