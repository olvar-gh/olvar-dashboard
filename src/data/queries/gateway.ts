import { useQuery } from '@tanstack/react-query';

import { GATEWAY_POLL_MS, gatewayAgeS, isGatewayStale } from '@/domain/status-freshness';
import { useDataSource, useNow } from '../context';
import { keys } from '../keys';
import { useSession } from './account';

const TICK_MS = 15_000;

/** The gateway row, polled every 60 s (it has no Realtime), with its heartbeat age and the 420 s stale rule. */
export function useGateway() {
  const source = useDataSource();
  const { session } = useSession();
  const query = useQuery({
    queryKey: keys.gateway,
    enabled: !!session,
    queryFn: () => source.getGateway(),
    refetchInterval: GATEWAY_POLL_MS,
  });
  const now = useNow(TICK_MS);
  const lastSeen = query.data?.last_seen_at;
  return { ...query, ageS: gatewayAgeS(lastSeen, now), stale: query.data !== undefined && isGatewayStale(lastSeen, now) };
}
