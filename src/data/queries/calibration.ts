import { useMutation, useQueryClient } from '@tanstack/react-query';

import { STABLE_COUNT } from '@/domain/calibration';
import { useDataSource } from '../context';
import { keys } from '../keys';
import { useLatestReadings } from './latest';
import { usePlant } from './plant';

/** The last readings for the stability check, newest first; refreshed on every `readings` signal. */
export function useCalibrationReadings() {
  return useLatestReadings(STABLE_COUNT);
}

/** Writes dry/wet raw (server rule `dry > wet + 100`, error 23514) and re-reads everything soil % touches. */
export function useSaveCalibration() {
  const source = useDataSource();
  const qc = useQueryClient();
  const plantId = usePlant().data?.id;
  return useMutation({
    mutationFn: ({ deviceId, dryRaw, wetRaw }: { deviceId: string; dryRaw: number; wetRaw: number }) =>
      source.updateCalibration(deviceId, dryRaw, wetRaw),
    onSuccess: (device) => {
      if (plantId) qc.setQueryData(keys.device(plantId), device);
      for (const root of ['latest', 'readings', 'hourly', 'daily', 'status', 'day']) {
        void qc.invalidateQueries({ queryKey: [root] });
      }
    },
  });
}
