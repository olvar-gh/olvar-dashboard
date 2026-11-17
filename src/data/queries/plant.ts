import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useDataSource } from '../context';
import { keys } from '../keys';
import type { PlantPatch } from '../types';
import { useSession } from './account';

/** The owner's plant; `data` is null when the gateway setup has not created one. */
export function usePlant() {
  const source = useDataSource();
  const { session } = useSession();
  return useQuery({ queryKey: keys.plant, queryFn: () => source.getPlant(), enabled: !!session });
}

export function useUpdatePlant() {
  const source = useDataSource();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ plantId, patch }: { plantId: string; patch: PlantPatch }) => source.updatePlant(plantId, patch),
    onSuccess: (plant, { patch }) => {
      qc.setQueryData(keys.plant, plant);
      void qc.invalidateQueries({ queryKey: keys.thresholds(plant.id) });
      void qc.invalidateQueries({ queryKey: keys.status(plant.id) });
      if (patch.timezone !== undefined) {
        // Local days and daily rollups move with the time zone.
        void qc.invalidateQueries({ queryKey: ['day'] });
        void qc.invalidateQueries({ queryKey: ['daily'] });
      }
    },
  });
}
