import { useQuery } from '@tanstack/react-query';

import { useDataSource } from '../context';
import { keys } from '../keys';
import { usePlant } from './plant';

/** The plant's device; kept current by Realtime `devices` UPDATEs. */
export function useDevice() {
  const source = useDataSource();
  const plantId = usePlant().data?.id;
  return useQuery({
    queryKey: keys.device(plantId ?? ''),
    enabled: !!plantId,
    queryFn: () => source.getDevice(plantId!),
  });
}
