import { useQuery } from '@tanstack/react-query';

import { displayStatus, readingExpiresAt, type DisplayStatus } from '@/domain/status-freshness';
import { useDataSource, useNow } from '../context';
import { keys } from '../keys';
import type { PlantStatus } from '../types';
import { useDevice } from './device';
import { usePlant } from './plant';

const TICK_MS = 15_000;

/**
 * `plant_status_v` for the plant, plus the status to show now. Refetching (signal, device
 * UPDATE, expiry deadline, 60 s interval, focus, reconnect) is driven by `<LiveUpdates>`;
 * between fetches `display` ages the cached row and turns Offline at the 180 s expiry.
 */
export function usePlantStatus(): ReturnType<typeof useStatusQuery> & { display: DisplayStatus | null } {
  const query = useStatusQuery();
  const device = useDevice().data;
  const row = query.data;
  const now = useNow(TICK_MS, readingExpiresAt(row?.latest_reading_at));
  const display = row?.overall != null ? displayStatus(statusForDisplay(row), now, device) : null;
  return { ...query, display };
}

function statusForDisplay(row: PlantStatus) {
  return {
    overall: row.overall ?? 'no_data',
    overall_label: row.overall_label ?? '',
    summary: row.summary,
    latest_reading_at: row.latest_reading_at,
    device_status: row.device_status,
  };
}

function useStatusQuery() {
  const source = useDataSource();
  const plantId = usePlant().data?.id;
  return useQuery({
    queryKey: keys.status(plantId ?? ''),
    enabled: !!plantId,
    queryFn: () => source.getStatus(plantId!),
    staleTime: 0,
  });
}
